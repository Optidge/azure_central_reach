import { getConfig, hubspotPortalSettings } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import { createHubSpotClient, getDealById, listAssociations, updateDealProperties } from "../lib/hubspotClient.mjs";
import {
  createCentralReachClient,
  createOrUpdateClient,
  findClientByExternalSystemId,
  lookupWithoutContactId,
  updateClientMetadata
} from "../lib/centralReachClient.mjs";
import { acquireLease, createStateClient, getState, putState, releaseLease } from "../lib/cosmosState.mjs";
import {
  HubSpotReadError,
  MAPPING_VERSION,
  buildComparableState,
  changedNamesFromHashes,
  fieldHashes,
  hashMappedState,
  isStateClientUnavailable,
  metadataClearFieldIds
} from "../lib/mappedState.mjs";
import { hashesForContact, saveLinkRecord } from "../lib/linkRecord.mjs";
import {
  FAILURE_KINDS,
  classifyFailure,
  metadataWriteFailedError,
  permanentFailureReason
} from "../lib/retry.mjs";
import { filterWritebackProperties } from "../lib/writebackAllowlist.mjs";
import { associationsForComparison } from "../constants/staffingAssociations.mjs";
import { buildClientPayload } from "../mappings/client/buildClientPayload.mjs";
import { buildClientMetadata } from "../mappings/client/buildClientMetadata.mjs";
import { validateClientPayload } from "../mappings/client/validateClientPayload.mjs";
import { STATE_TYPES } from "../constants/state.mjs";
import {
  CASE_CLIENT_ID_MISMATCH,
  RETRIES_USED_UP,
  unreadableDate
} from "../constants/syncReasons.mjs";
import { caseSyncEligibility } from "../lib/syncEligibility.mjs";

// The link record never expires. Attempt details (last error, invocation) are a second record
// that may expire. Both ids start with the portal ID.
const CLIENT_LINK_PK = "sync:client";
const CLIENT_ATTEMPT_PK = "sync-attempt:client";
const FALLBACK_CR_CONTACT_ID_PROPERTY = "client_id_number";

const REQUIRED_DEAL_PROPERTIES = [
  "hs_object_id",
  "hs_lastmodifieddate",
  "dealstage",
  "enter_in_central_reach",
  "test_record",
  "integration_last_write",
  "updated_by_integration",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "phi_first_name__cloned_",
  "phi_last_name",
  "phi_date_of_birth",
  "phi_gender",
  "email",
  "phone",
  "phone_number__second_",
  "if_services_will_be_in_more_than_one_location__list_the_other_addres",
  "street_address",
  "home_apt",
  "location_city",
  "location_central_reach",
  "location",
  "postal_code",
  "guardian_first_name",
  "guardian_last_name",
  "allergies",
  "maladaptive_behaviors__clinical",
  "comorbid_diagnosis__clinical",
  "current_primary_bt",
  "current_primary_bt_2",
  "bt_work_schedule_confirmed",
  "bt_work_schedule_2_confirmed",
  "client_availability_completed",
  "assigned_hours",
  "authorized_hours",
  "auth_start_date",
  "auth_end_date",
  "physician_name",
  "npi_number",
  "physician_name__commercial",
  "npi_number__commercial",
  "most_recent_asd_diagnosis_date_medicaid",
  "most_recent_asd_diagnosis_date_1",
  "most_recent_asd_diagnosis_date_2",
  "supervising_bcba",
  "initial_assessment_bcba",
  "policy_holder_name",
  "phi__policy_holder_dob",
  "severity_level_clinical",
  "n1_what_type_of_insurance",
  "n2_what_type_of_insurance",
  "insurance_primary",
  "insurance_1__other__summary",
  "insurance_id_1",
  "insurance_id_2",
  "insurance_id_3",
  "insurance_id_4",
  "central_reach_link_to_client"
];

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

function linkProperties(crContactIdProperty, contactId) {
  if (!contactId) {
    return {};
  }
  return {
    [crContactIdProperty]: String(contactId),
    central_reach_link_to_client: buildCentralReachContactUrl(contactId)
  };
}

// lastAttempt is set by the queue worker when this message has used its five retries.
export async function runClientSyncWorkflow(
  { dealId, hsLastModifiedDate, source, context, lastAttempt = false },
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
  const mapPayload = dependencies.buildClientPayload || buildClientPayload;
  const mapMetadata = dependencies.buildClientMetadata || buildClientMetadata;
  const validatePayload = dependencies.validateClientPayload || validateClientPayload;
  const digestPayload = dependencies.hashPayload || hashPayload;
  const logger = dependencies.safeLog || safeLog;
  const buildError = dependencies.buildErrorLog || buildErrorLog;

  const normalizedDealId = ensureDealId(dealId);
  const config = getRuntimeConfig();
  // Any portal that is not in the table is invalid configuration: nothing is read or written.
  const portal = hubspotPortalSettings(config.hubspot?.hubspotPortalId);
  const crContactIdProperty =
    config.hubspot.crContactIdProperty || FALLBACK_CR_CONTACT_ID_PROPERTY;

  initHubSpot(config);
  initCentralReach(config);
  initState(config);

  const stateId = `${portal.portalId}:${normalizedDealId}`;
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
  try {
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
    const propertyList = [...REQUIRED_DEAL_PROPERTIES, crContactIdProperty];
    if (recordGateProperty && !propertyList.includes(recordGateProperty)) {
      propertyList.push(recordGateProperty);
    }
    let deal;
    try {
      deal = await fetchDeal(normalizedDealId, propertyList);
      const confirmed = await fetchDeal(normalizedDealId, propertyList);
      if (confirmed) {
        deal = confirmed;
      }
    } catch (error) {
      const readError = asReadFailure(error, "deal");
      if (readError) {
        throw readError;
      }
      throw error;
    }

    const prior = (await readLink())?.data || {};
    const hubspotContactId = String(deal?.properties?.[crContactIdProperty] || "").trim();
    const existingContactId = hubspotContactId || String(prior.crContactId || "").trim() || null;
    knownContactId = existingContactId;
    hubspotHasContactId = Boolean(hubspotContactId);

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
      return {
        ok: true,
        dealId: normalizedDealId,
        status: "skipped",
        reason: eligibility.reason
      };
    }
    gatePassed = true;

    // Row 2.2: the saved hashes count only for the CR id they were synced to. For any other CR
    // id every field is treated as changed.
    const savedFieldHashes = hashesForContact(prior, existingContactId);
    // An error decided on purpose: write the status and finish. The link record is not touched,
    // so the CR id and the last good field hashes stay as they are.
    const decidedError = async (reason) => {
      await pushWriteback(
        normalizedDealId,
        filterWritebackProperties(
          {
            last_sync_status: "error",
            last_sync_at: new Date().toISOString(),
            last_sync_error: reason,
            integration_last_write: new Date().toISOString(),
            updated_by_integration: true
          },
          { kind: "client", idProperty: crContactIdProperty }
        )
      );
      await saveAttempt(STATE_TYPES.FAIL, { status: "error", errorMessage: reason });
      return {
        ok: true,
        dealId: normalizedDealId,
        status: "error",
        crContactId: existingContactId
      };
    };

    const mappedPayload = mapPayload({ deal, config });
    const validation = validatePayload(mappedPayload, { linked: Boolean(existingContactId) });
    if (!validation.isValid) {
      return decidedError(validation.errors?.[0] || "Client sync failed");
    }
    const payload = centralReachPayload(mappedPayload);

    const metadata = mapMetadata({ deal, portalId: portal.portalId });
    let includeRelationships = false;
    let relationships = [];
    const bcbaType = config.hubspot.bcbaObjectTypeId;
    const btType = config.hubspot.btRbtObjectTypeId;
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

    const comparable = buildComparableState({
      core: payload,
      metadata: metadata.metadataValues,
      labels: metadata.labelIds,
      relationships,
      includeRelationships
    });
    const payloadHash = digestPayload(comparable);
    const nextFieldHashes = fieldHashes(comparable);
    const previousFieldHashes = savedFieldHashes;
    const changedFields = changedNamesFromHashes(previousFieldHashes, nextFieldHashes);
    const existingHash = deal?.properties?.last_sync_hash || null;

    // Row 2.4: "nothing changed" needs a clean last run and matching hashes in Cosmos. A matching
    // last_sync_hash in HubSpot alone is not enough: a run that failed halfway leaves it behind.
    const cosmosSaysUnchanged =
      prior.clean === true && Boolean(previousFieldHashes) && changedFields.length === 0;

    let syncResult;
    if (existingHash && existingHash === payloadHash && existingContactId && cosmosSaysUnchanged) {
      syncResult = {
        operation: "noop",
        crContactId: String(existingContactId)
      };
    } else {
      if (existingContactId) {
        const lookup = await findClient(normalizedDealId);
        const lookedUpId = lookup?.found ? String(lookup.crContactId || "").trim() : "";
        if (lookup?.found && !lookedUpId) {
          throw lookupWithoutContactId("client", { status: null, data: null });
        }
        if (lookup?.found && lookedUpId !== String(existingContactId)) {
          return decidedError(CASE_CLIENT_ID_MISMATCH);
        }
      }
      // Row 2.4: in progress before the first CentralReach write of this run.
      await saveLinkFields({ workflow: "clientSync", portalId: portal.portalId, clean: false });
      syncResult = await upsertClient({
        payload,
        existingContactId
      });
      // A CR id that HubSpot does not hold yet (a create, or a match by external id) is saved
      // before any later step can fail: first in Cosmos, then on the HubSpot record.
      if (
        (syncResult?.operation === "create" || !hubspotContactId) &&
        syncResult?.crContactId
      ) {
        knownContactId = String(syncResult.crContactId);
        await saveLinkFields({ crContactId: knownContactId });
        if (!hubspotContactId) {
          try {
            await pushWriteback(
              normalizedDealId,
              filterWritebackProperties(
                linkProperties(crContactIdProperty, knownContactId),
                { kind: "client", idProperty: crContactIdProperty }
              )
            );
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
    }

    let metadataSyncSummary = null;
    if (syncResult.operation !== "noop" && syncResult.crContactId) {
      const clearFieldIds = metadataClearFieldIds(previousFieldHashes, metadata.metadataValues);
      metadataSyncSummary = await pushMetadata(
        syncResult.crContactId,
        metadata.metadataValues,
        { labelIds: metadata.labelIds, clearFieldIds }
      );
      if ((metadataSyncSummary?.failedCount || 0) > 0) {
        throw metadataWriteFailedError(metadataSyncSummary);
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
    const confirmedMetadata = mapMetadata({ deal: confirmedDeal, portalId: portal.portalId });
    const confirmedHash = digestPayload(
      buildComparableState({
        core: confirmedPayload,
        metadata: confirmedMetadata.metadataValues,
        labels: confirmedMetadata.labelIds,
        relationships,
        includeRelationships
      })
    );
    if (confirmedHash !== payloadHash) {
      const stale = new Error("SyncStale");
      stale.code = "SYNC_STALE";
      throw stale;
    }

    const status = syncResult.operation === "noop" ? "noop" : "success";
    logger("info", "Client sync compared mapped state.", {
      workflow: "clientSync",
      recordId: normalizedDealId,
      source: source || null,
      mappingVersion: MAPPING_VERSION,
      outcome: status,
      changedFieldNames: changedFields,
      invocationId: context?.invocationId || null
    });

    await pushWriteback(
      normalizedDealId,
      filterWritebackProperties(
        {
          updated_by_integration: true,
          integration_last_write: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          last_sync_status: status,
          last_sync_error: "",
          last_sync_hash: payloadHash,
          ...linkProperties(crContactIdProperty, syncResult.crContactId)
        },
        { kind: "client", idProperty: crContactIdProperty }
      )
    );

    // Every CentralReach write of this run succeeded, so the run is clean and its hashes are
    // saved. A no-op changed nothing, so the link record is left as it is.
    if (syncResult.operation !== "noop") {
      await saveLinkFields({
        workflow: "clientSync",
        portalId: portal.portalId,
        crContactId: syncResult.crContactId || null,
        externalSystemId: normalizedDealId,
        payloadHash,
        fieldHashes: nextFieldHashes,
        hashesContactId: syncResult.crContactId || null,
        mappingVersion: MAPPING_VERSION,
        clean: true
      });
    }
    await saveAttempt(STATE_TYPES.SUCCESS, {
      status,
      operation: syncResult.operation,
      changedFieldNames: changedFields,
      metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? null,
      metadataFailedCount: metadataSyncSummary?.failedCount ?? null
    });

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
    const errorPatch = {
      ...(permanent || lastAttempt
        ? {
            last_sync_at: new Date().toISOString(),
            last_sync_status: "error",
            last_sync_error: permanent ? permanentFailureReason(error) : RETRIES_USED_UP,
            integration_last_write: new Date().toISOString(),
            updated_by_integration: true
          }
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
          await saveLinkFields({ crContactId: knownContactId });
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
