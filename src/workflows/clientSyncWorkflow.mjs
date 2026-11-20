import { getConfig, hubspotPortalSettings } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import {
  createHubSpotClient,
  getDealById,
  listAssociations,
  readObjectsBatch,
  updateDealProperties
} from "../lib/hubspotClient.mjs";
import {
  createCentralReachClient,
  createOrUpdateClient,
  findClientByExternalSystemId,
  lookupWithoutContactId,
  updateClientMetadata
} from "../lib/centralReachClient.mjs";
import { acquireLease, createStateClient, getState, putState, releaseLease } from "../lib/cosmosState.mjs";
import {
  CHANGE_NOT_FROM_WEBHOOK,
  HubSpotReadError,
  MAPPING_VERSION,
  buildComparableState,
  changedMetadata,
  changedNamesFromHashes,
  fieldHashes,
  hashMappedState,
  isBackupPathSource,
  isStateClientUnavailable,
  keepOmittedFieldHashes,
  metadataClearFieldIds,
  writtenFieldHashes
} from "../lib/mappedState.mjs";
import {
  NO_IN_PROGRESS,
  NO_PENDING_CREATE,
  hashesForContact,
  inProgressFields,
  inProgressHashesFor,
  isDigitsOnly,
  labelFieldsAfterSend,
  labelPostFromError,
  labelsPendingFields,
  labelsPendingFor,
  lastLabelPostFor,
  pendingCreateFields,
  pendingCreateHasTime,
  pendingCreateIsRecent,
  pendingCreateStamp,
  saveLinkRecord,
  savedHashesForContact
} from "../lib/linkRecord.mjs";
import {
  FAILURE_KINDS,
  classifyFailure,
  createStillPendingError,
  labelPostUnconfirmedError,
  metadataWriteFailedError,
  permanentFailureReason
} from "../lib/retry.mjs";
import { filterWritebackProperties } from "../lib/writebackAllowlist.mjs";
import { associationsForComparison } from "../constants/staffingAssociations.mjs";
import { caseRequestProperties } from "../mappings/client/clientProperties.mjs";
import { buildClientPayload } from "../mappings/client/buildClientPayload.mjs";
import { buildClientMetadata } from "../mappings/client/buildClientMetadata.mjs";
import { validateClientPayload } from "../mappings/client/validateClientPayload.mjs";
import { STATE_TYPES } from "../constants/state.mjs";
import {
  CASE_CLIENT_ID_MISMATCH,
  RETRIES_USED_UP,
  crIdNotDigits,
  missingPropertiesReason,
  unreadableDate
} from "../constants/syncReasons.mjs";
import { caseSyncEligibility } from "../lib/syncEligibility.mjs";
import {
  createSyncRunSummary,
  reasonCodeOfError
} from "../lib/syncRunSummary.mjs";
import {
  PROPERTY_MISSING_CODE,
  DECISION_PROPERTIES,
  missingMappedProperties,
  missingProperties,
  omitFieldIdsFor,
  readStaffNames,
  staffRecordIdsByRole
} from "./clientSyncInputs.mjs";

// The link record never expires. Attempt details (last error, invocation) are a second record
// that may expire. Both ids start with the portal ID.
const CLIENT_LINK_PK = "sync:client";
const CLIENT_ATTEMPT_PK = "sync-attempt:client";
const FALLBACK_CR_CONTACT_ID_PROPERTY = "client_id_number";

// Reason codes of the run summary line (row 3.20) for the errors this worker decides on purpose.
const DECIDED_CODES = Object.freeze({
  CR_ID_NOT_DIGITS: "CR_ID_NOT_DIGITS",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNREADABLE_DATE: "UNREADABLE_DATE",
  CASE_CLIENT_ID_MISMATCH: "CASE_CLIENT_ID_MISMATCH"
});

// A run that is held on purpose and retried: another run holds the record, or a create was sent
// a short time ago and CentralReach does not show it yet. The summary line says `waiting`.
const WAITING_CODES = new Set(["SYNC_IN_PROGRESS", "CR_CREATE_PENDING"]);

function hashPayload(payload) {
  return hashMappedState(payload);
}

async function claimRecordLock(claim, input) {
  try {
    return await claim(input);
  } catch (error) {
    if (isStateClientUnavailable(error)) {
      return true;
    }
    throw error;
  }
}

async function readPriorSyncState(readState, pk, id) {
  try {
    return await readState({ pk, id });
  } catch (error) {
    if (isStateClientUnavailable(error)) {
      return null;
    }
    throw error;
  }
}

function asReadFailure(error, scope) {
  if (error?.code === "HUBSPOT_READ_FAILED") {
    return error;
  }
  const status = error?.response?.status;
  if (status === 401 || status === 403) {
    return new HubSpotReadError(scope, status);
  }
  return null;
}

function ensureDealId(dealId) {
  const normalized = String(dealId || "").trim();
  if (!normalized) {
    throw new Error("dealId is required");
  }
  return normalized;
}

function buildCentralReachContactUrl(contactId) {
  const id = String(contactId || "").trim();
  if (!id) {
    return null;
  }
  return `https://members.centralreach.com/#contacts/details/?id=${id}`;
}

// dateOfBirthStatus is a note for the validator. It is not a CentralReach field, so it is kept out
// of the request and out of the hash on every read of the Case.
function centralReachPayload(mapped) {
  const payload = { ...(mapped || {}) };
  delete payload.dateOfBirthStatus;
  return payload;
}

// Contract P.5 (a) in src/mappings/client/buildClientMetadata.mjs: the mapper returns
// requiredLabelIds and managedLabelIds. labelIds is the old name of the required list.
function requiredLabels(metadata) {
  return metadata?.requiredLabelIds ?? metadata?.labelIds;
}

function linkProperties(crContactIdProperty, contactId) {
  if (!contactId) {
    return {};
  }
  return {
    [crContactIdProperty]: String(contactId),
    central_reach_link_to_client: buildCentralReachContactUrl(contactId)
  };
}

// Rule 5.2: every status writeback also sets last_sync_at, integration_last_write and
// updated_by_integration.
function statusProperties(status, reason) {
  const now = new Date().toISOString();
  return {
    last_sync_status: status,
    last_sync_error: reason || "",
    last_sync_at: now,
    integration_last_write: now,
    updated_by_integration: true
  };
}

// Row 3.7: does HubSpot already show the status and the reason this run would write?
function statusIsShown(properties, status, reason) {
  return (
    String(properties?.last_sync_status ?? "").trim() === status &&
    String(properties?.last_sync_error ?? "").trim() === String(reason || "").trim()
  );
}

// lastAttempt is set by the queue worker when this message has used its five retries. attempt is
// the number of retries the message has already used; it is only logged (row 3.20).
export async function runClientSyncWorkflow(
  { dealId, hsLastModifiedDate, source, context, lastAttempt = false, attempt = null },
  dependencies = {}
) {
  const getRuntimeConfig = dependencies.getConfig || getConfig;
  const initHubSpot = dependencies.createHubSpotClient || createHubSpotClient;
  const initCentralReach = dependencies.createCentralReachClient || createCentralReachClient;
  const initState = dependencies.createStateClient || createStateClient;
  const fetchDeal = dependencies.getDealById || getDealById;
  const pushWriteback = dependencies.updateDealProperties || updateDealProperties;
  const upsertClient = dependencies.createOrUpdateClient || createOrUpdateClient;
  const findClient = dependencies.findClientByExternalSystemId || findClientByExternalSystemId;
  const pushMetadata = dependencies.updateClientMetadata || updateClientMetadata;
  const saveState = dependencies.putState || putState;
  const readState = dependencies.getState || getState;
  const claimLock = dependencies.acquireLease || acquireLease;
  const unlock = dependencies.releaseLease || releaseLease;
  const loadAssociations = dependencies.listAssociations || listAssociations;
  const readBatch = dependencies.readObjectsBatch || readObjectsBatch;
  const mapPayload = dependencies.buildClientPayload || buildClientPayload;
  const mapMetadata = dependencies.buildClientMetadata || buildClientMetadata;
  const validatePayload = dependencies.validateClientPayload || validateClientPayload;
  const digestPayload = dependencies.hashPayload || hashPayload;
  const logger = dependencies.safeLog || safeLog;
  const buildError = dependencies.buildErrorLog || buildErrorLog;
  // The clock, in milliseconds. Row 3.15 measures the age of a pending create with it.
  const now = dependencies.now || Date.now;
  // Row L.3: the wait between the label read-backs. Only a test sets it; otherwise the sender's
  // own default applies.
  const labelReadBackOptions =
    dependencies.labelReadBackDelayMs === undefined
      ? {}
      : { labelReadBackDelayMs: dependencies.labelReadBackDelayMs };

  const normalizedDealId = ensureDealId(dealId);
  // Row 3.20: what this run did, logged once at the end (see the finally block). It exists before
  // the configuration is read, so a run that cannot start still logs one line. The portal ID is
  // set as soon as it is known.
  const summary = createSyncRunSummary({
    workflow: "clientSync",
    recordId: normalizedDealId,
    portalId: null,
    source: source || null,
    invocationId: context?.invocationId || null,
    attempt
  });
  // Set at the start of the try block below. Nothing that uses them runs before that.
  let config = null;
  let portal = null;
  let crContactIdProperty = FALLBACK_CR_CONTACT_ID_PROPERTY;
  let stateId = null;
  const readLink = () => readPriorSyncState(readState, CLIENT_LINK_PK, stateId);
  // Every link record write merges into what is stored (src/lib/linkRecord.mjs).
  const saveLinkFields = (changes) =>
    saveLinkRecord({ readState: readLink, saveState, pk: CLIENT_LINK_PK, id: stateId, changes });
  const saveAttempt = (type, data) =>
    saveState({
      pk: CLIENT_ATTEMPT_PK,
      id: stateId,
      type,
      ttlSeconds:
        type === STATE_TYPES.SUCCESS ? config.ttl.successTtlSeconds : config.ttl.failTtlSeconds,
      data: {
        workflow: "clientSync",
        ...data,
        hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null,
        invocationId: context?.invocationId || null,
        updatedAt: new Date().toISOString()
      }
    });

  // The record lease. Its etag is the owner token: only this run can release it.
  let lease = null;
  // Known CR id. A failure must keep it (Requirement 9: retries never duplicate a create).
  let knownContactId = null;
  let hubspotHasContactId = false;
  // Rule 5.1: a record the gate would skip gets no HubSpot writeback. Until the gate has been
  // checked and passed, a failure writes nothing to HubSpot; the dead-letter alert reports it.
  let gatePassed = false;
  // Row 3.7: the status and reason HubSpot shows, from the read of this run and then from this
  // run's own writes. A status HubSpot already shows is not written again: every write moves
  // hs_lastmodifieddate, and the hourly poller would queue the record again without end.
  let shown = null;
  // Contract P.5 (e): true once this run created the client or linked the Case to its own
  // earlier create. The catch block then saves labelsPending with the CR id.
  let ownCreate = false;
  try {
    config = getRuntimeConfig();
    // Any portal that is not in the table is invalid configuration: nothing is read or written.
    portal = hubspotPortalSettings(config.hubspot?.hubspotPortalId);
    summary.setPortalId(portal.portalId);
    crContactIdProperty = config.hubspot.crContactIdProperty || FALLBACK_CR_CONTACT_ID_PROPERTY;
    initHubSpot(config);
    initCentralReach(config);
    initState(config);
    stateId = `${portal.portalId}:${normalizedDealId}`;

    lease = await claimRecordLock(claimLock, {
      pk: "sync-lock:client",
      id: stateId,
      ttlSeconds: config.ttl.leaseTtlSeconds
    });
    if (!lease) {
      const busy = new Error("SyncInProgress");
      busy.code = "SYNC_IN_PROGRESS";
      throw busy;
    }

    const recordGateProperty = config.sync?.recordGateProperty || null;
    const propertyList = [...caseRequestProperties(), crContactIdProperty];
    if (recordGateProperty && !propertyList.includes(recordGateProperty)) {
      propertyList.push(recordGateProperty);
    }
    let deal;
    try {
      deal = await fetchDeal(normalizedDealId, propertyList);
    } catch (error) {
      const readError = asReadFailure(error, "deal");
      if (readError) {
        throw readError;
      }
      throw error;
    }

    shown = {
      last_sync_status: deal?.properties?.last_sync_status,
      last_sync_error: deal?.properties?.last_sync_error
    };
    const prior = (await readLink())?.data || {};
    const hubspotContactId = String(deal?.properties?.[crContactIdProperty] || "").trim();
    const existingContactId = hubspotContactId || String(prior.crContactId || "").trim() || null;
    knownContactId = existingContactId;
    hubspotHasContactId = Boolean(hubspotContactId);

    // Rule 5.8, row 4.18: a key the gate reads that is not in the HubSpot answer was not read. A
    // missing `dealstage` or `test_record` would let an excluded-stage or test Case through, and a
    // missing status key would write the status again on every run. Nothing is decided and nothing
    // is written to HubSpot (rule 5.1: the gate has not passed); the run is retried.
    const missingGateKeys = missingProperties(deal?.properties, [
      ...DECISION_PROPERTIES,
      ...(recordGateProperty ? [recordGateProperty] : [])
    ]);
    if (missingGateKeys.length > 0) {
      throw new HubSpotReadError(`deal:${missingGateKeys.join(",")}`);
    }

    const eligibility = caseSyncEligibility({
      properties: deal?.properties,
      linked: Boolean(existingContactId),
      includeTestRecords: Boolean(config.sync?.includeTestRecords),
      recordGateProperty
    });
    if (!eligibility.eligible) {
      // No Central Reach call and no HubSpot writeback for a skipped Case.
      logger("info", "Client sync skipped by eligibility gate.", {
        workflow: "clientSync",
        recordId: normalizedDealId,
        source: source || null,
        reason: eligibility.reason,
        linked: Boolean(existingContactId),
        invocationId: context?.invocationId || null
      });
      summary.setOutcome("skipped", eligibility.reason);
      return {
        ok: true,
        dealId: normalizedDealId,
        status: "skipped",
        reason: eligibility.reason
      };
    }
    gatePassed = true;

    const writeback = async (properties) => {
      await pushWriteback(
        normalizedDealId,
        filterWritebackProperties(properties, { kind: "client", idProperty: crContactIdProperty })
      );
      summary.noteWriteback(properties.last_sync_status);
      if (properties.last_sync_status !== undefined) {
        shown = {
          last_sync_status: properties.last_sync_status,
          last_sync_error: properties.last_sync_error
        };
      }
    };
    // An error decided on purpose: write the status and finish. The link record is not touched,
    // so the CR id and the last good field hashes stay as they are. The status is written only
    // when HubSpot does not show it yet; the CR id and the link when HubSpot lacks them.
    // Callers write `return await decidedError(...)`: without the await the `finally` block would
    // release the lease and log the run summary before the status write has finished.
    const decidedError = async (reason, code) => {
      const patch = {
        ...(statusIsShown(shown, "error", reason) ? {} : statusProperties("error", reason)),
        ...(knownContactId && !hubspotContactId
          ? linkProperties(crContactIdProperty, knownContactId)
          : {})
      };
      if (Object.keys(patch).length > 0) {
        await writeback(patch);
      }
      await saveAttempt(STATE_TYPES.FAIL, { status: "error", errorMessage: reason });
      summary.setOutcome("error", code);
      return {
        ok: true,
        dealId: normalizedDealId,
        status: "error",
        crContactId: knownContactId
      };
    };

    // Row 4.18 (D-R1): the CR ID property decides "linked" or "not linked", and so a create. A
    // missing key is not "not linked" (a null key is). Checked before anything uses the CR ID.
    if (missingProperties(deal?.properties, [crContactIdProperty]).length > 0) {
      knownContactId = null;
      return await decidedError(
        missingPropertiesReason([crContactIdProperty]),
        PROPERTY_MISSING_CODE
      );
    }

    // Rule 5.5, row 3.16: a CR ID from HubSpot must be digits only. The value is not used, not
    // saved and not logged.
    if (hubspotContactId && !isDigitsOnly(hubspotContactId)) {
      knownContactId = null;
      return await decidedError(crIdNotDigits(crContactIdProperty), DECIDED_CODES.CR_ID_NOT_DIGITS);
    }

    // Row 4.18 (rule 5.8): a mapped property that is not a key of the HubSpot answer was not
    // read. HubSpot answers a blank property as a null key, so this is never "blank". The run
    // stops here: nothing is sent to CentralReach.
    const missingMapped = missingMappedProperties(deal?.properties);
    if (missingMapped.length > 0) {
      return await decidedError(missingPropertiesReason(missingMapped), PROPERTY_MISSING_CODE);
    }

    // Rows 2.2 and 3.7: the saved hashes count only for the CR id they were synced to and for
    // the current mapping version. Otherwise every field is treated as changed.
    const savedFieldHashes = hashesForContact(prior, existingContactId);
    // Rule 5.8: what the integration is known to have written to this client. The last clean
    // copy counts under any mapping version, and so do the hashes of runs that did not finish
    // clean. This is the basis for a clear and for an omitted field's kept hash, not for
    // "did anything change".
    const savedAnyVersion = savedHashesForContact(prior, existingContactId);
    const writtenBefore = writtenFieldHashes(
      savedAnyVersion,
      inProgressHashesFor(prior, existingContactId)
    );

    const mappedPayload = mapPayload({ deal, config });
    const validation = validatePayload(mappedPayload, { linked: Boolean(existingContactId) });
    if (!validation.isValid) {
      return await decidedError(
        validation.errors?.[0] || "Client sync failed",
        DECIDED_CODES.VALIDATION_FAILED
      );
    }
    const payload = centralReachPayload(mappedPayload);

    // Row 4.14: the staff on the Case are read here and passed to the mapper. A failed association
    // or name read stops the run; it never becomes a blank (rule 5.8). The association rows also
    // give the relationships of the compared state (BR17).
    let includeRelationships = false;
    let relationships = [];
    let staffNames;
    const bcbaType = config.hubspot.bcbaObjectTypeId;
    const btType = config.hubspot.btRbtObjectTypeId;
    let staffAssociations = null;
    if (bcbaType && btType) {
      try {
        const [bcbaAssociations, btAssociations] = await Promise.all([
          loadAssociations({
            fromObjectType: "deals",
            fromId: normalizedDealId,
            toObjectType: bcbaType
          }),
          loadAssociations({
            fromObjectType: "deals",
            fromId: normalizedDealId,
            toObjectType: btType
          })
        ]);
        relationships = associationsForComparison(
          [...(bcbaAssociations || []), ...(btAssociations || [])],
          portal.excludedStaffingAssociationTypeIds
        );
        includeRelationships = true;
        staffAssociations = { bcbaAssociations, btRbtAssociations: btAssociations };
      } catch (error) {
        if (!String(error?.message || "").includes("not initialized")) {
          const readError = asReadFailure(error, "associations");
          if (readError) {
            throw readError;
          }
          throw error;
        }
      }
    }
    if (staffAssociations) {
      try {
        staffNames = await readStaffNames({
          idsByRole: staffRecordIdsByRole({
            ...staffAssociations,
            roleTypeIds: portal.staffingRoleAssociationTypeIds
          }),
          bcbaObjectTypeId: bcbaType,
          btRbtObjectTypeId: btType,
          readBatch
        });
      } catch (error) {
        throw asReadFailure(error, "staffNames") || error;
      }
    }

    // Contract P.5 (c) in src/mappings/client/buildClientMetadata.mjs: the CentralReach metadata
    // fields whose input was not read in this run. `dependencies.omitFieldIds` is a seam for
    // tests; the worker adds the staff fields when the staff were not read. Both mappings of the
    // run (SP-R7) get exactly the same inputs: if they differed, the two hashes would differ and
    // the run would end as "changed during the run" after the CentralReach writes.
    const omitFieldIds = omitFieldIdsFor({ base: dependencies.omitFieldIds, staffNames });
    const metadataInputs = { portalId: portal.portalId, staffNames, omitFieldIds };
    const metadata = mapMetadata({ deal, ...metadataInputs });
    // Row 4.14 (C-R6): a staff record with no name. Role and code only, never a name.
    for (const warning of metadata.warnings || []) {
      logger("warn", "Client metadata mapper warning.", {
        workflow: "clientSync",
        recordId: normalizedDealId,
        source: source || null,
        code: warning.code,
        role: warning.role,
        invocationId: context?.invocationId || null
      });
    }
    // Rule 5.7 (C-R1): a filled date that is not a real date. The field is left out by the
    // mapper; the run ends as `error` and nothing is sent to CentralReach.
    if ((metadata.unreadableDateProperties || []).length > 0) {
      return await decidedError(
        unreadableDate(metadata.unreadableDateProperties.join(", ")),
        DECIDED_CODES.UNREADABLE_DATE
      );
    }

    const comparable = buildComparableState({
      core: payload,
      metadata: metadata.metadataValues,
      labels: requiredLabels(metadata),
      relationships,
      includeRelationships
    });
    const payloadHash = digestPayload(comparable);
    // Row 3.18: an omitted field keeps its saved hash and is not a changed field.
    const nextFieldHashes = keepOmittedFieldHashes(
      fieldHashes(comparable),
      savedAnyVersion,
      omitFieldIds
    );
    const changedFields = changedNamesFromHashes(savedFieldHashes, nextFieldHashes);
    summary.setChangedFieldNames(changedFields);

    // Rows 2.4 and 3.7: "nothing changed" needs a clean last run and matching hashes in Cosmos,
    // made with the current mapping version. HubSpot's last_sync_hash is not asked.
    const lastRunClean = prior.clean === true;
    const unchanged = lastRunClean && Boolean(savedFieldHashes) && changedFields.length === 0;

    if (unchanged) {
      // Row 3.7: no CentralReach call, no confirm read and no Cosmos write. HubSpot is written
      // only when it does not show what this run would write: the status, or the CR id.
      const patch = {
        ...(statusIsShown(shown, "success", "") ? {} : statusProperties("success", "")),
        ...(hubspotContactId ? {} : linkProperties(crContactIdProperty, existingContactId))
      };
      if (Object.keys(patch).length > 0) {
        await writeback(patch);
      }
      logger("info", "Client sync compared mapped state.", {
        workflow: "clientSync",
        recordId: normalizedDealId,
        source: source || null,
        mappingVersion: MAPPING_VERSION,
        outcome: "noop",
        changedFieldNames: changedFields,
        invocationId: context?.invocationId || null
      });
      // `noop` is a log value only; HubSpot was written `success` above when it needed it.
      summary.setOutcome("noop");
      return {
        ok: true,
        dealId: normalizedDealId,
        status: "noop",
        operation: "noop",
        crContactId: String(existingContactId),
        changedFieldNames: changedFields,
        metadataUpdatedCount: 0,
        metadataFailedCount: 0
      };
    }

    if (isBackupPathSource(source) && changedFields.length > 0) {
      // Row 3.9: field names only, never values.
      logger("warn", CHANGE_NOT_FROM_WEBHOOK, {
        workflow: "clientSync",
        recordId: normalizedDealId,
        source,
        changedFieldNames: changedFields,
        invocationId: context?.invocationId || null
      });
    }

    // Row 3.20: the CentralReach client reports each HTTP request it sends to this observer.
    const onCall = summary.onCall;
    const lookUpClient = (externalSystemId) => findClient(externalSystemId, { onCall });

    // The CR id the write goes to. null: a create.
    let targetContactId = existingContactId;
    // Contract P.5 (f), row 3.14: true only when a lookup of this run found the client under the
    // CR id the update goes to, so CentralReach is known to hold this Case's External System ID.
    // The update then sends that ID back; an update that left it out could wipe it.
    let externalSystemIdHeld = false;
    if (existingContactId) {
      const lookup = await lookUpClient(normalizedDealId);
      const lookedUpId = lookup?.found ? String(lookup.crContactId || "").trim() : "";
      if (lookup?.found && !lookedUpId) {
        throw lookupWithoutContactId("client", { status: null, data: null });
      }
      if (lookup?.found && lookedUpId !== String(existingContactId)) {
        return await decidedError(CASE_CLIENT_ID_MISMATCH, DECIDED_CODES.CASE_CLIENT_ID_MISMATCH);
      }
      externalSystemIdHeld = Boolean(lookup?.found);
    } else if (String(prior.pendingCreateExternalId || "").trim()) {
      // Row 3.15: an earlier run sent a create and never saved a CR id. Look that ID up first.
      // Found: this Case's own client. Not found less than 15 minutes after the create was
      // sent: CentralReach may not show it yet, so no create; the run is retried. Not found
      // later: nothing was created, and the create below saves a new marker.
      const pendingId = String(prior.pendingCreateExternalId).trim();
      const pending = await lookUpClient(pendingId);
      const pendingContactId = pending?.found ? String(pending.crContactId || "").trim() : "";
      if (pending?.found && !pendingContactId) {
        throw lookupWithoutContactId("client", { status: null, data: null });
      }
      if (pendingContactId) {
        targetContactId = pendingContactId;
        externalSystemIdHeld = pendingId === normalizedDealId;
      } else if (pendingCreateIsRecent(prior, now())) {
        // A marker with no readable time is stamped now; the 15 minutes run from here.
        if (!pendingCreateHasTime(prior)) {
          await saveLinkFields(pendingCreateStamp(now()));
        }
        throw createStillPendingError();
      }
    }

    // Rows 2.4 and 3.15: in progress before the first CentralReach write of this run, and the
    // ID a create is about to use is saved with the time. If this save fails, nothing is sent.
    // The run's field hashes are saved too: if it fails halfway, the next run still knows what
    // may have reached CentralReach (rule 5.8).
    const creating = !targetContactId;
    await saveLinkFields({
      workflow: "clientSync",
      portalId: portal.portalId,
      clean: false,
      ...inProgressFields(
        writtenFieldHashes(inProgressHashesFor(prior, targetContactId), nextFieldHashes),
        targetContactId
      ),
      ...(creating ? pendingCreateFields(normalizedDealId, now()) : {})
    });
    let syncResult;
    try {
      syncResult = await upsertClient({
        payload,
        existingContactId: targetContactId,
        ...(externalSystemIdHeld ? { externalSystemIdHeld: true } : {}),
        onCall
      });
    } catch (error) {
      // Nothing is pending when no create can have reached CentralReach: it said no (a permanent
      // failure), or the lookup inside createOrUpdateClient failed before any create was sent
      // (CR_LOOKUP_UNKNOWN, CR_LOOKUP_UNREADABLE). An unknown create outcome and an error with
      // no code keep the marker.
      const createNotSent =
        classifyFailure(error) === FAILURE_KINDS.PERMANENT ||
        error?.code === "CR_LOOKUP_UNKNOWN" ||
        error?.code === "CR_LOOKUP_UNREADABLE";
      if (creating && createNotSent) {
        await saveLinkFields(NO_PENDING_CREATE);
      }
      throw error;
    }

    summary.setOperation(syncResult?.operation === "create" ? "create" : "update");

    // Row L.3: a label POST that failed with a timeout or a 5xx may still have been applied. The
    // sender attaches it to the error; it is saved, and the caller rethrows the same error. If
    // the save fails, that is logged and the label error still stands.
    const saveLabelPostOf = async (error) => {
      const changes = labelPostFromError(error);
      if (Object.keys(changes).length === 0) {
        return;
      }
      try {
        await saveLinkFields(changes);
      } catch (stateError) {
        logger(
          "error",
          "Client label POST could not be saved after a failed label step.",
          buildError({
            workflow: "clientSync",
            stage: "saveLabelPostAfterFailure",
            error: stateError,
            recordId: normalizedDealId
          })
        );
      }
    };

    // Contract P.5 (e): a contact the integration created, or its own earlier create that this
    // run linked to, may show an empty label read until a label read confirms its labels.
    let labelsPending = labelsPendingFor(prior, existingContactId);
    // A CR id that HubSpot does not hold yet (a create, or a match by external id) is saved
    // before any later step can fail: first in Cosmos, then on the HubSpot record.
    if ((syncResult?.operation === "create" || !hubspotContactId) && syncResult?.crContactId) {
      knownContactId = String(syncResult.crContactId);
      if (!existingContactId) {
        labelsPending = true;
        // Set first: if the save below fails, the catch block still saves labelsPending.
        ownCreate = true;
      }
      await saveLinkFields({
        crContactId: knownContactId,
        inProgressContactId: knownContactId,
        ...NO_PENDING_CREATE,
        ...(existingContactId ? {} : labelsPendingFields(knownContactId))
      });
      if (!hubspotContactId) {
        try {
          await writeback(linkProperties(crContactIdProperty, knownContactId));
        } catch (linkError) {
          // Not fatal: Cosmos holds the id and the final writeback sends it again.
          logger(
            "error",
            "Client CR id writeback failed after the CentralReach write.",
            buildError({
              workflow: "clientSync",
              stage: "writeLinkAfterUpsert",
              error: linkError,
              recordId: normalizedDealId
            })
          );
        }
      }
    }

    let metadataSyncSummary = null;
    if (syncResult.crContactId) {
      const clearFieldIds = metadataClearFieldIds(writtenBefore, metadata.metadataValues);
      // Row 3.8: only the changed fields are sent; all of them when there is no saved copy or
      // the last run was not clean. Contract P.5 (e) in src/lib/centralReachClient.mjs.
      try {
        metadataSyncSummary = await pushMetadata(
          syncResult.crContactId,
          changedMetadata(
            metadata.metadataValues,
            lastRunClean ? savedFieldHashes : null,
            nextFieldHashes
          ),
          {
            labelIds: requiredLabels(metadata),
            managedLabelIds: metadata.managedLabelIds ?? [],
            lastLabelPost: lastLabelPostFor(prior, syncResult.crContactId),
            contactCreatedThisRun: labelsPending,
            clearFieldIds,
            onCall,
            ...labelReadBackOptions
          }
        );
      } catch (error) {
        summary.setLabelsFromError(error);
        await saveLabelPostOf(error);
        throw error;
      }
      summary.setLabels(metadataSyncSummary?.labelResult);
      // Row L.3: a label POST is saved before anything else can end the run, also before the
      // throw for a failed metadata field.
      const labelChanges = labelFieldsAfterSend({
        labelResult: metadataSyncSummary?.labelResult,
        contactId: syncResult.crContactId,
        labelsPending
      });
      if (Object.keys(labelChanges).length > 0) {
        await saveLinkFields(labelChanges);
      }
      if ((metadataSyncSummary?.failedCount || 0) > 0) {
        throw metadataWriteFailedError(metadataSyncSummary);
      }
      if (metadataSyncSummary?.labelResult?.confirmed === false) {
        throw labelPostUnconfirmedError();
      }
    }

    let confirmedDeal = deal;
    try {
      confirmedDeal = (await fetchDeal(normalizedDealId, propertyList)) || deal;
    } catch (error) {
      const readError = asReadFailure(error, "deal-confirm");
      if (readError) {
        throw readError;
      }
      throw error;
    }
    const confirmedPayload = centralReachPayload(mapPayload({ deal: confirmedDeal, config }));
    const confirmedMetadata = mapMetadata({ deal: confirmedDeal, ...metadataInputs });
    const confirmedHash = digestPayload(
      buildComparableState({
        core: confirmedPayload,
        metadata: confirmedMetadata.metadataValues,
        labels: requiredLabels(confirmedMetadata),
        relationships,
        includeRelationships
      })
    );
    if (confirmedHash !== payloadHash) {
      const stale = new Error("SyncStale");
      stale.code = "SYNC_STALE";
      throw stale;
    }

    const status = "success";
    logger("info", "Client sync compared mapped state.", {
      workflow: "clientSync",
      recordId: normalizedDealId,
      source: source || null,
      mappingVersion: MAPPING_VERSION,
      outcome: status,
      changedFieldNames: changedFields,
      invocationId: context?.invocationId || null
    });

    await writeback({
      ...statusProperties(status, ""),
      last_sync_hash: payloadHash,
      ...linkProperties(crContactIdProperty, syncResult.crContactId)
    });

    // Every CentralReach write of this run succeeded, so the run is clean and its hashes are
    // saved.
    await saveLinkFields({
      workflow: "clientSync",
      portalId: portal.portalId,
      crContactId: syncResult.crContactId || null,
      externalSystemId: normalizedDealId,
      payloadHash,
      fieldHashes: nextFieldHashes,
      hashesContactId: syncResult.crContactId || null,
      mappingVersion: MAPPING_VERSION,
      ...NO_PENDING_CREATE,
      ...NO_IN_PROGRESS,
      clean: true
    });
    await saveAttempt(STATE_TYPES.SUCCESS, {
      status,
      operation: syncResult.operation,
      changedFieldNames: changedFields,
      metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? null,
      metadataFailedCount: metadataSyncSummary?.failedCount ?? null
    });
    summary.setOutcome("success");

    return {
      ok: true,
      dealId: normalizedDealId,
      status,
      operation: syncResult.operation,
      crContactId: syncResult.crContactId || null,
      changedFieldNames: changedFields,
      metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? 0,
      metadataFailedCount: metadataSyncSummary?.failedCount ?? 0
    };
  } catch (error) {
    // Row 2.7: one classifier sorts the failure. Permanent: `error` on the record, no retry, the
    // message completes. Temporary or unknown create: thrown, so the queue worker schedules the
    // retry. HubSpot keeps its last status until the last attempt (decision 1).
    const failureKind = classifyFailure(error);
    const permanent = failureKind === FAILURE_KINDS.PERMANENT;
    summary.setOutcome(WAITING_CODES.has(error?.code) ? "waiting" : "error", reasonCodeOfError(error));
    logger(
      permanent || lastAttempt ? "error" : "warn",
      "Client sync workflow failed.",
      buildError({
        workflow: "clientSync",
        stage: "runClientSyncWorkflow",
        error,
        recordId: normalizedDealId,
        extra: {
          failureKind,
          lastAttempt: Boolean(lastAttempt),
          invocationId: context?.invocationId || null,
          hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null
        }
      })
    );
    if (error?.answerShape) {
      // Decision 4: field names and types only, never a value.
      logger("error", "CentralReach answer could not be read.", error.answerShape);
    }

    // The CR id goes to HubSpot when HubSpot does not hold it yet, with or without a status.
    // Row 3.7: a status and reason HubSpot already shows are not written again.
    const errorReason = permanent ? permanentFailureReason(error) : RETRIES_USED_UP;
    const errorPatch = {
      ...((permanent || lastAttempt) && !statusIsShown(shown, "error", errorReason)
        ? statusProperties("error", errorReason)
        : {}),
      ...(knownContactId && !hubspotHasContactId
        ? linkProperties(crContactIdProperty, knownContactId)
        : {})
    };
    let writebackError = null;
    if (gatePassed && Object.keys(errorPatch).length > 0) {
      try {
        await pushWriteback(
          normalizedDealId,
          filterWritebackProperties(errorPatch, { kind: "client", idProperty: crContactIdProperty })
        );
        summary.noteWriteback(errorPatch.last_sync_status);
      } catch (failed) {
        writebackError = failed;
        logger(
          "error",
          "Client sync error writeback failed.",
          buildError({
            workflow: "clientSync",
            stage: "writeErrorWriteback",
            error: failed,
            recordId: normalizedDealId
          })
        );
      }
    }

    // A run that does not hold the record lease writes no state. Otherwise the merge keeps the
    // CR id and the last good hashes; only the attempt record says what failed.
    if (lease) {
      try {
        if (knownContactId) {
          // A client this run created keeps its labelsPending fields and loses its pending
          // marker, also when the save right after the create was the step that failed.
          await saveLinkFields({
            crContactId: knownContactId,
            ...(ownCreate
              ? {
                  ...labelsPendingFields(knownContactId),
                  inProgressContactId: knownContactId,
                  ...NO_PENDING_CREATE
                }
              : {})
          });
        }
        await saveAttempt(STATE_TYPES.FAIL, {
          status: "error",
          failureKind,
          errorCode: String(error?.code ?? ""),
          errorMessage: String(error?.message || "Client sync failed").slice(0, 500),
          failedFieldIds: error?.failedFieldIds || []
        });
      } catch (stateError) {
        logger(
          "error",
          "Client sync fail-state write failed.",
          buildError({
            workflow: "clientSync",
            stage: "putFailState",
            error: stateError,
            recordId: normalizedDealId
          })
        );
      }
    }

    if (!permanent) {
      throw error;
    }
    // The status could not be written and HubSpot may take it later: retry the message.
    if (writebackError && classifyFailure(writebackError) !== FAILURE_KINDS.PERMANENT) {
      throw writebackError;
    }
    return {
      ok: true,
      dealId: normalizedDealId,
      status: "error",
      crContactId: knownContactId
    };
  } finally {
    // Row 3.20: one summary line per run, on every outcome, once the run has ended.
    summary.log(logger);
    if (lease) {
      try {
        await unlock({ pk: "sync-lock:client", id: stateId, etag: lease.etag });
      } catch (releaseError) {
        if (!isStateClientUnavailable(releaseError)) {
          logger(
            "error",
            "Client sync lock release failed.",
            buildError({
              workflow: "clientSync",
              stage: "releaseLock",
              error: releaseError,
              recordId: normalizedDealId
            })
          );
        }
      }
    }
  }
}
