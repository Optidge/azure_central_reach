import { getConfig, hubspotPortalSettings } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import { acquireLease, createStateClient, getState, putState, releaseLease } from "../lib/cosmosState.mjs";
import {
  createHubSpotClient,
  getBtRbtRecordById,
  getBcbaRecordById,
  updateEmployeeWritebackWithFallback
} from "../lib/hubspotClient.mjs";
import {
  createCentralReachClient,
  createOrUpdateEmployee,
  findEmployeeByExternalSystemId,
  getEmployeeByContactId,
  buildEmployeePayloadForContactId,
  updateClientMetadata
} from "../lib/centralReachClient.mjs";
import { findHubSpotRecordsByEmployeeId } from "../lib/hubspotClient.mjs";
import { CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS } from "../constants/centralReach.mjs";
import {
  HubSpotReadError,
  MAPPING_VERSION,
  canonicalizeLabels,
  changedNamesFromHashes,
  explicitMetadata,
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
import { buildEmployeePayload } from "../mappings/employees/buildEmployeePayload.mjs";
import {
  employeeRequestProperties,
  knownMetadataFieldIds
} from "../mappings/employees/employeeProperties.mjs";
import { validateEmployeePayload } from "../mappings/employees/validateEmployeePayload.mjs";
import { STATE_TYPES } from "../constants/state.mjs";
import {
  BCBA_CHECKLIST_PROPERTY,
  BT_RBT_CHECKLIST_PROPERTY,
  HUBSPOT_EMPLOYEE_TYPES
} from "../constants/hubspot.mjs";
import {
  ANOTHER_HUBSPOT_RECORD_LINKED,
  CONFLICTING_EXTERNAL_IDS,
  missingDateProperty,
  RETRIES_USED_UP,
  unreadableDate,
  WAITING_FOR_WORKDAY_ID,
  WORKDAY_ALREADY_IN_CENTRALREACH
} from "../constants/syncReasons.mjs";
import { checklistTicked, employeeCreateLookupDecision, linkedEmployeeIdentity } from "../lib/syncDecisions.mjs";
import { employeeSyncEligibility } from "../lib/syncEligibility.mjs";

// The link record never expires. Attempt details (last error, invocation) are a second record
// that may expire. Both ids start with the portal ID.
const EMPLOYEE_LINK_PK = "sync:employee";
const EMPLOYEE_ATTEMPT_PK = "sync-attempt:employee";

function ensureRecordId(recordId) {
  const normalized = String(recordId || "").trim();
  if (!normalized) {
    throw new Error("recordId is required");
  }
  return normalized;
}

function ensureEmployeeType(employeeType) {
  const normalized = String(employeeType || "").trim();
  if (
    normalized !== HUBSPOT_EMPLOYEE_TYPES.BT_RBT &&
    normalized !== HUBSPOT_EMPLOYEE_TYPES.BCBA
  ) {
    throw new Error("employeeType must be bt_rbt or bcba");
  }
  return normalized;
}

function hashPayload(payload) {
  return hashMappedState(payload);
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

function buildCentralReachContactUrl(contactId) {
  const id = String(contactId || "").trim();
  if (!id) {
    return null;
  }
  return `https://members.centralreach.com/#contacts/details/?id=${id}`;
}

function linkProperties({ employeeType, employeeIdProperty, contactId }) {
  if (!contactId) {
    return {};
  }
  const linkProperty =
    employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT
      ? "central_reach_link_to_rt_rbt"
      : "central_reach_record_link";
  return {
    [employeeIdProperty]: String(contactId),
    [linkProperty]: buildCentralReachContactUrl(contactId)
  };
}

function buildWritebackPropertyPatch({
  employeeType,
  employeeIdProperty,
  payloadHash,
  status,
  contactId,
  errorMessage
}) {
  const now = new Date().toISOString();
  const base = {
    last_sync_status: status,
    last_sync_at: now,
    last_sync_error: errorMessage || "",
    integration_last_write: now,
    updated_by_integration: true
  };

  if (payloadHash && status !== "error") {
    base.last_sync_hash = payloadHash;
  }
  return { ...base, ...linkProperties({ employeeType, employeeIdProperty, contactId }) };
}

function getWorkflowStateId(portalId, employeeType, recordId) {
  return `${portalId}:${employeeType}:${recordId}`;
}

function syncInProgress() {
  const busy = new Error("SyncInProgress");
  busy.code = "SYNC_IN_PROGRESS";
  return busy;
}

// lastAttempt is set by the queue worker when this message has used its five retries.
export async function runEmployeeSyncWorkflow(
  { recordId, employeeType, hsLastModifiedDate, source, context, lastAttempt = false },
  dependencies = {}
) {
  const getRuntimeConfig = dependencies.getConfig || getConfig;
  const initHubSpot = dependencies.createHubSpotClient || createHubSpotClient;
  const initCentralReach = dependencies.createCentralReachClient || createCentralReachClient;
  const initState = dependencies.createStateClient || createStateClient;
  const fetchBtRbt = dependencies.getBtRbtRecordById || getBtRbtRecordById;
  const fetchBcba = dependencies.getBcbaRecordById || getBcbaRecordById;
  const upsertEmployee = dependencies.createOrUpdateEmployee || createOrUpdateEmployee;
  const findByExternalId =
    dependencies.findEmployeeByExternalSystemId || findEmployeeByExternalSystemId;
  const findHolders =
    dependencies.findHubSpotRecordsByEmployeeId || findHubSpotRecordsByEmployeeId;
  const fetchCrEmployeeById = dependencies.getEmployeeByContactId || getEmployeeByContactId;
  const preserveIdentifiers =
    dependencies.buildEmployeePayloadForContactId || buildEmployeePayloadForContactId;
  const pushMetadata = dependencies.updateClientMetadata || updateClientMetadata;
  const writeEmployeeWriteback =
    dependencies.writeEmployeeWriteback ||
    (async ({ objectTypeId, recordId, properties, employeeIdProperty }) =>
      updateEmployeeWritebackWithFallback({
        objectTypeId,
        recordId,
        properties,
        employeeIdProperty
      }));
  const saveState = dependencies.putState || putState;
  const readState = dependencies.getState || getState;
  const claimLock = dependencies.acquireLease || acquireLease;
  const unlock = dependencies.releaseLease || releaseLease;
  const mapPayload = dependencies.buildEmployeePayload || buildEmployeePayload;
  const validatePayload = dependencies.validateEmployeePayload || validateEmployeePayload;
  const digestPayload = dependencies.hashPayload || hashPayload;
  const logger = dependencies.safeLog || safeLog;
  const buildError = dependencies.buildErrorLog || buildErrorLog;

  const normalizedRecordId = ensureRecordId(recordId);
  const normalizedEmployeeType = ensureEmployeeType(employeeType);
  const config = getRuntimeConfig();
  // Any portal that is not in the table is invalid configuration: nothing is read or written.
  const { portalId } = hubspotPortalSettings(config.hubspot?.hubspotPortalId);

  const objectTypeId =
    normalizedEmployeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT
      ? config.hubspot.btRbtObjectTypeId
      : config.hubspot.bcbaObjectTypeId;
  const employeeIdProperty = config.hubspot.employeeIdProperty || "employee_id";
  const recordGateProperty = config.sync?.recordGateProperty || null;
  const checklistProperty =
    normalizedEmployeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT
      ? BT_RBT_CHECKLIST_PROPERTY
      : BCBA_CHECKLIST_PROPERTY;
  const properties = [...employeeRequestProperties(normalizedEmployeeType), employeeIdProperty];
  if (recordGateProperty && !properties.includes(recordGateProperty)) {
    properties.push(recordGateProperty);
  }

  initHubSpot(config);
  initCentralReach(config);
  initState(config);

  const stateId = getWorkflowStateId(portalId, normalizedEmployeeType, normalizedRecordId);
  const readLink = () => readPriorSyncState(readState, EMPLOYEE_LINK_PK, stateId);
  // Every link record write merges into what is stored (src/lib/linkRecord.mjs).
  const saveLinkFields = (changes) =>
    saveLinkRecord({
      readState: readLink,
      saveState,
      pk: EMPLOYEE_LINK_PK,
      id: stateId,
      changes
    });
  const saveAttempt = (type, data) =>
    saveState({
      pk: EMPLOYEE_ATTEMPT_PK,
      id: stateId,
      type,
      ttlSeconds:
        type === STATE_TYPES.SUCCESS ? config.ttl.successTtlSeconds : config.ttl.failTtlSeconds,
      data: {
        workflow: "employeeSync",
        employeeType: normalizedEmployeeType,
        ...data,
        hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null,
        invocationId: context?.invocationId || null,
        updatedAt: new Date().toISOString()
      }
    });

  // The record lease. Its etag is the owner token: only this run can release it.
  let lease = null;
  // Known CR id. A failure must keep it (Requirement 9: retries never duplicate a create).
  let linkedContactId = null;
  let hubspotHasContactId = false;
  // Rule 5.1: a record the gate would skip gets no HubSpot writeback. Until the gate has been
  // checked and passed, a failure writes nothing to HubSpot; the dead-letter alert reports it.
  let gatePassed = false;
  try {
    lease = await claimRecordLock(claimLock, {
      pk: "sync-lock:employee",
      id: stateId,
      ttlSeconds: config.ttl.leaseTtlSeconds
    });
    if (!lease) {
      throw syncInProgress();
    }

    const fetchRecord = async () => {
      try {
        return normalizedEmployeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT
          ? await fetchBtRbt(normalizedRecordId, objectTypeId, properties)
          : await fetchBcba(normalizedRecordId, objectTypeId, properties);
      } catch (error) {
        const readError = asReadFailure(error, "employee");
        if (readError) {
          throw readError;
        }
        throw error;
      }
    };

    let hubspotRecord = await fetchRecord();
    hubspotRecord = (await fetchRecord()) || hubspotRecord;
    const hubspotProps = hubspotRecord?.properties || {};

    const prior = (await readLink())?.data || {};
    const hubspotContactId = String(hubspotProps?.[employeeIdProperty] || "").trim();
    let existingContactId = hubspotContactId || String(prior.crContactId || "").trim() || null;
    linkedContactId = existingContactId;
    hubspotHasContactId = Boolean(hubspotContactId);
    let linkSaved = false;

    const eligibility = employeeSyncEligibility({
      properties: hubspotProps,
      linked: Boolean(existingContactId),
      includeTestRecords: Boolean(config.sync?.includeTestRecords),
      recordGateProperty
    });
    if (!eligibility.eligible) {
      // No Central Reach call and no HubSpot writeback for a skipped employee.
      logger("info", "Employee sync skipped by eligibility gate.", {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        source: source || null,
        reason: eligibility.reason,
        linked: Boolean(existingContactId),
        invocationId: context?.invocationId || null
      });
      return {
        ok: true,
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        status: "skipped",
        reason: eligibility.reason
      };
    }
    gatePassed = true;

    const mapped = mapPayload({
      record: hubspotRecord,
      employeeType: normalizedEmployeeType,
      config
    });
    const mappingWarnings = Array.isArray(mapped.warnings) ? mapped.warnings : [];
    if (mappingWarnings.length > 0) {
      logger("warn", "Employee mapping warnings.", {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        warningCodes: mappingWarnings.map((item) => item?.code).filter(Boolean),
        invocationId: context?.invocationId || null
      });
    }
    const decided = async ({ status, reason, contactId = null, fail = false }) => {
      await writeEmployeeWriteback({
        objectTypeId,
        recordId: normalizedRecordId,
        employeeIdProperty,
        properties: filterWritebackProperties(
          buildWritebackPropertyPatch({
            employeeType: normalizedEmployeeType,
            employeeIdProperty,
            status,
            contactId,
            errorMessage: reason || ""
          }),
          { kind: "employee", idProperty: employeeIdProperty }
        )
      });
      // A CR id this run learned is kept. The merge leaves the last good hashes as they are.
      if (contactId && !linkSaved && String(prior.crContactId || "") !== String(contactId)) {
        await saveLinkFields({ crContactId: String(contactId) });
      }
      if (fail) {
        await saveAttempt(STATE_TYPES.FAIL, {
          status,
          errorMessage: String(reason || "").slice(0, 500)
        });
      }
      return {
        ok: true,
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        status,
        crContactId: contactId
      };
    };

    if (mapped.dateOfBirthStatus === "missing") {
      return decided({ status: "error", reason: missingDateProperty("date_of_birth"), fail: true });
    }
    if (mapped.dateOfBirthStatus === "unreadable") {
      return decided({ status: "error", reason: unreadableDate("date_of_birth"), fail: true });
    }

    const validation = validatePayload(mapped.employeePayload, {
      linked: Boolean(existingContactId),
      emailField: mapped.emailField || "email"
    });
    if (!validation.isValid) {
      return decided({
        status: "error",
        reason: validation.errors?.[0] || "Employee sync failed",
        fail: true
      });
    }

    let outboundPayload = mapped.employeePayload;
    let identity = null;
    let syncResult = null;
    let createdThisRun = false;

    // A CR id that HubSpot does not hold yet is saved before any later step can fail: first in
    // Cosmos, then on the HubSpot record. Saving the CR id also ends a pending create.
    const saveLink = async (contactId, externalSystemId) => {
      // Set first: if the Cosmos save fails, the catch block still sends the id to HubSpot.
      linkedContactId = String(contactId);
      await saveLinkFields({
        workflow: "employeeSync",
        employeeType: normalizedEmployeeType,
        portalId,
        crContactId: String(contactId),
        ...(externalSystemId ? { externalSystemId: String(externalSystemId) } : {}),
        pendingCreateExternalId: null
      });
      linkSaved = true;
      try {
        await writeEmployeeWriteback({
          objectTypeId,
          recordId: normalizedRecordId,
          employeeIdProperty,
          properties: filterWritebackProperties(
            linkProperties({ employeeType: normalizedEmployeeType, employeeIdProperty, contactId }),
            { kind: "employee", idProperty: employeeIdProperty }
          )
        });
      } catch (linkError) {
        // Not fatal: Cosmos holds the id and the final writeback sends it again.
        logger(
          "error",
          "Employee CR id writeback failed after the CentralReach write.",
          buildError({
            workflow: "employeeSync",
            stage: "writeLinkAfterUpsert",
            error: linkError,
            recordId: normalizedRecordId
          })
        );
      }
    };

    if (!existingContactId) {
      const externalId = String(mapped.employeePayload.externalSystemId || normalizedRecordId).trim();
      const createLockId = `${portalId}:${externalId}`;
      let createLease = null;
      try {
        createLease = await claimRecordLock(claimLock, {
          pk: "create-lock:employee",
          id: createLockId,
          ttlSeconds: config.ttl.leaseTtlSeconds
        });
        if (!createLease) {
          throw syncInProgress();
        }

        // Each External System ID is looked up once per run.
        const lookedUp = new Map();
        const lookup = async (id) => {
          if (!lookedUp.has(id)) {
            lookedUp.set(id, await findByExternalId(id));
          }
          return lookedUp.get(id);
        };
        const otherHolders = async (crContactId) => {
          const holders = await findHolders({
            bcbaObjectTypeId: config.hubspot.bcbaObjectTypeId,
            btRbtObjectTypeId: config.hubspot.btRbtObjectTypeId,
            employeeId: crContactId,
            excludeRecordId: normalizedRecordId,
            employeeIdProperty
          });
          return Array.isArray(holders) ? holders : [];
        };

        // Row 2.3: a create whose answer never arrived is looked up first, by the ID it was sent
        // with, even if workday_id was edited since. Found: it is this record's own create.
        // 404: nothing was created, so the pending ID is cleared. Anything else is thrown and
        // the pending ID stays.
        let decision = null;
        const pendingId = String(prior.pendingCreateExternalId || "").trim();
        if (pendingId) {
          const byPending = await lookup(pendingId);
          if (byPending?.found && byPending.crContactId) {
            // A pending Workday ID could since have been created and linked by another HubSpot
            // record. One CR employee, one HubSpot record: that is an error, not a link.
            const holders =
              pendingId === normalizedRecordId ? [] : await otherHolders(byPending.crContactId);
            if (holders.length > 0) {
              return decided({ status: "error", reason: ANOTHER_HUBSPOT_RECORD_LINKED, fail: true });
            }
            decision = {
              outcome: "link_own",
              crContactId: String(byPending.crContactId),
              externalSystemId: pendingId
            };
          } else {
            await saveLinkFields({ pendingCreateExternalId: null });
          }
        }
        if (!decision) {
          const byRecord = await lookup(normalizedRecordId);
          const workday = String(hubspotProps.workday_id || "").trim();
          const byWorkday = workday ? await lookup(workday) : { found: false, crContactId: null };
          decision = employeeCreateLookupDecision({
            byRecordId: byRecord,
            byWorkday,
            workdayFilled: Boolean(workday)
          });
        }
        if (decision.outcome === "conflicting_ids") {
          return decided({ status: "error", reason: CONFLICTING_EXTERNAL_IDS, fail: true });
        }
        if (decision.outcome === "found_by_workday") {
          const holders = await otherHolders(decision.crContactId);
          if (holders.length > 0) {
            return decided({ status: "error", reason: ANOTHER_HUBSPOT_RECORD_LINKED, fail: true });
          }
          return decided({
            status: "waiting",
            reason: WORKDAY_ALREADY_IN_CENTRALREACH,
            fail: false
          });
        }
        if (decision.outcome === "link_own") {
          // This record's own earlier create: save the link and go on as linked (rule 5.4).
          existingContactId = decision.crContactId;
          await saveLink(existingContactId, decision.externalSystemId || normalizedRecordId);
        } else {
          const createAllowed =
            Boolean(config.features?.allowEmployeeCreate) && config.features?.putOnlyMode === false;
          if (createAllowed) {
            // Rows 2.3 and 2.4: the ID about to be used is saved, and the record is marked in
            // progress, before the create is sent. If this save fails, no create is sent.
            await saveLinkFields({
              workflow: "employeeSync",
              employeeType: normalizedEmployeeType,
              portalId,
              pendingCreateExternalId: externalId,
              clean: false
            });
          }
          syncResult = await upsertEmployee({
            payload: outboundPayload,
            employeeType: normalizedEmployeeType,
            // Contract P.5 (d): the work states pick the contact form of the create.
            workStates: mapped.workStates,
            existingContactId: null,
            allowEmployeeCreate: Boolean(config.features?.allowEmployeeCreate),
            putOnlyMode: config.features?.putOnlyMode !== false
          });
          createdThisRun = syncResult?.operation === "create";
          if (syncResult?.operation === "create_turned_off") {
            return decided({ status: "waiting", reason: syncResult.reason, fail: false });
          }
          if (syncResult?.operation === "create_rejected") {
            // CentralReach said no (400 or 409): nothing was created, so nothing is pending.
            await saveLinkFields({ pendingCreateExternalId: null });
            return decided({ status: "error", reason: syncResult.reason, fail: true });
          }
          // Row 1.8: the lease also covers saving the new CR id, so a second record with the
          // same Workday ID finds this record as its holder.
          if (createdThisRun && syncResult.crContactId) {
            await saveLink(syncResult.crContactId, externalId);
          }
        }
      } finally {
        if (createLease) {
          try {
            await unlock({ pk: "create-lock:employee", id: createLockId, etag: createLease.etag });
          } catch (releaseError) {
            if (!isStateClientUnavailable(releaseError)) {
              throw releaseError;
            }
          }
        }
      }
    }

    if (existingContactId) {
      const existingCrEmployee = await fetchCrEmployeeById(existingContactId);
      const preserved = preserveIdentifiers(mapped.employeePayload, existingCrEmployee);
      // A copy: the edits below must not change the mapped payload that the stale check hashes.
      outboundPayload = { ...preserved.payload };
      if (mapped.dateOfBirthStatus === "blank" || outboundPayload.dateOfBirth == null) {
        delete outboundPayload.dateOfBirth;
      }
      // Rule 5.4: when CR holds no External System ID, an update sends workday_id only if it is
      // filled. The temporary ID (the HubSpot record ID) is for a create only.
      if (!preserved.crExternalSystemId && String(hubspotProps.workday_id || "").trim() === "") {
        delete outboundPayload.externalSystemId;
      }
      identity = linkedEmployeeIdentity({
        crExternalSystemId: preserved.crExternalSystemId,
        workdayId: hubspotProps.workday_id,
        recordId: normalizedRecordId,
        checklistIsTicked: checklistTicked(hubspotProps?.[checklistProperty])
      });
      if (preserved.externalSystemIdMismatch && identity.sendUpdate) {
        logger("warn", "HubSpot workday_id differs from the Central Reach External System ID.", {
          workflow: "employeeSync",
          recordId: normalizedRecordId,
          employeeType: normalizedEmployeeType,
          crContactId: existingContactId,
          invocationId: context?.invocationId || null
        });
      }
      if (!identity.sendUpdate) {
        return decided({
          status: identity.status,
          reason: identity.reason,
          fail: true,
          contactId: existingContactId
        });
      }
    }

    // Contract P.5 (c) in src/mappings/employees/buildEmployeePayload.mjs: a field whose input
    // could not be read is named here, so it is not compared, not sent and not cleared.
    const omitFieldIds = mappingWarnings.some((item) => item?.code === "missing_hubspot_portal_id")
      ? [
          CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD,
          CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BCBA_RECORD
        ]
      : [];
    const metadataForCompare = explicitMetadata(
      mapped.metadataValues,
      knownMetadataFieldIds(normalizedEmployeeType),
      omitFieldIds
    );
    const payloadHashInput = {
      employee: outboundPayload,
      metadata: metadataForCompare,
      labels: canonicalizeLabels(mapped.requiredLabelIds)
    };

    const payloadHash = digestPayload(payloadHashInput);
    const nextFieldHashes = fieldHashes(payloadHashInput);
    // Row 2.2: the saved hashes count only for the CR id they were synced to. For any other CR
    // id every field is treated as changed.
    const previousFieldHashes = hashesForContact(prior, existingContactId);
    const changedFields = changedNamesFromHashes(previousFieldHashes, nextFieldHashes);
    const previousHash = String(hubspotProps?.last_sync_hash || "");
    // Row 2.4: "nothing changed" needs a clean last run and matching hashes in Cosmos. A matching
    // last_sync_hash in HubSpot alone is not enough: a run that failed halfway leaves it behind.
    const cosmosSaysUnchanged =
      prior.clean === true && Boolean(previousFieldHashes) && changedFields.length === 0;
    const canNoopByHash = Boolean(
      previousHash &&
        previousHash === payloadHash &&
        existingContactId &&
        !syncResult &&
        cosmosSaysUnchanged
    );
    if (canNoopByHash && identity && identity.status !== "success") {
      return decided({
        status: identity.status,
        reason: identity.reason,
        fail: identity.status === "error",
        contactId: existingContactId
      });
    }
    if (canNoopByHash) {
      const writebackResult = await writeEmployeeWriteback({
        objectTypeId,
        recordId: normalizedRecordId,
        employeeIdProperty,
        properties: filterWritebackProperties(
          buildWritebackPropertyPatch({
            employeeType: normalizedEmployeeType,
            employeeIdProperty,
            payloadHash,
            status: "noop",
            contactId: existingContactId
          }),
          { kind: "employee", idProperty: employeeIdProperty }
        )
      });

      // Nothing changed, so the link record is left as it is.
      await saveAttempt(STATE_TYPES.SUCCESS, {
        status: "noop",
        operation: "noop",
        changedFieldNames: changedFields,
        writebackFallbackUsed: Boolean(writebackResult?.fallbackUsed),
        mappingWarningCodes: mappingWarnings.map((item) => item?.code).filter(Boolean)
      });

      return {
        ok: true,
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        status: "noop",
        operation: "noop",
        crContactId: existingContactId,
        writebackFallbackUsed: Boolean(writebackResult?.fallbackUsed)
      };
    }

    if (!syncResult) {
      // Row 2.4: in progress before the first CentralReach write of this run.
      await saveLinkFields({ clean: false });
      syncResult = await upsertEmployee({
        payload: outboundPayload,
        employeeType: normalizedEmployeeType,
        existingContactId,
        allowEmployeeCreate: Boolean(config.features?.allowEmployeeCreate),
        putOnlyMode: config.features?.putOnlyMode !== false
      });
      if (syncResult?.operation === "create_turned_off") {
        return decided({ status: "waiting", reason: syncResult.reason, fail: false });
      }
      if (syncResult?.operation === "create_rejected") {
        return decided({ status: "error", reason: syncResult.reason, fail: true });
      }
    }

    const workdayBlank = String(hubspotProps.workday_id || "").trim() === "";
    const status = createdThisRun && workdayBlank ? "waiting" : identity?.status || "success";
    const contactId = syncResult.crContactId || existingContactId || null;
    if (createdThisRun && workdayBlank) {
      syncResult.reason = WAITING_FOR_WORKDAY_ID;
    } else if (identity?.reason) {
      syncResult.reason = identity.reason;
    }
    if (syncResult.usedDefaultDateOfBirth) {
      logger("warn", "Employee created in Central Reach with the placeholder date of birth.", {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        crContactId: contactId,
        invocationId: context?.invocationId || null
      });
    }
    linkedContactId = contactId;
    let metadataSyncSummary = null;

    // A create or a match by external id saved its link inside the create lease. A CR id that
    // only Cosmos held is written to HubSpot here.
    if (contactId && !hubspotHasContactId && !linkSaved) {
      await saveLink(contactId);
    }

    const labelIds = canonicalizeLabels(mapped.requiredLabelIds);
    if (contactId && (Object.keys(metadataForCompare).length > 0 || labelIds.length > 0)) {
      const clearFieldIds = metadataClearFieldIds(previousFieldHashes, metadataForCompare);
      // Contract P.5 (e) in src/lib/centralReachClient.mjs. Row L.3 saves lastLabelPost.
      metadataSyncSummary = await pushMetadata(contactId, metadataForCompare, {
        labelIds,
        managedLabelIds: mapped.managedLabelIds ?? [],
        lastLabelPost: prior.lastLabelPost ?? null,
        contactCreatedThisRun: createdThisRun,
        clearFieldIds
      });
      if ((metadataSyncSummary?.failedCount || 0) > 0) {
        logger("warn", "Employee metadata write had failures.", {
          workflow: "employeeSync",
          recordId: normalizedRecordId,
          employeeType: normalizedEmployeeType,
          crContactId: contactId,
          failedCount: metadataSyncSummary.failedCount,
          failedFieldIds: metadataSyncSummary.failedFieldIds || [],
          invocationId: context?.invocationId || null
        });
        throw metadataWriteFailedError(metadataSyncSummary);
      }
    }

    const confirmedRecord = await fetchRecord();
    const confirmedMapped = mapPayload({
      record: confirmedRecord,
      employeeType: normalizedEmployeeType,
      config
    });
    const confirmedHash = digestPayload({
      employee: confirmedMapped.employeePayload,
      metadata: explicitMetadata(
        confirmedMapped.metadataValues,
        knownMetadataFieldIds(normalizedEmployeeType),
        omitFieldIds
      ),
      labels: canonicalizeLabels(confirmedMapped.requiredLabelIds)
    });
    const sourceHash = digestPayload({
      employee: mapped.employeePayload,
      metadata: metadataForCompare,
      labels: canonicalizeLabels(mapped.requiredLabelIds)
    });
    if (confirmedHash !== sourceHash) {
      const stale = new Error("SyncStale");
      stale.code = "SYNC_STALE";
      throw stale;
    }

    logger("info", "Employee sync compared mapped state.", {
      workflow: "employeeSync",
      recordId: normalizedRecordId,
      employeeType: normalizedEmployeeType,
      source: source || null,
      mappingVersion: MAPPING_VERSION,
      outcome: status,
      changedFieldNames: changedFields,
      invocationId: context?.invocationId || null
    });

    const writebackResult = await writeEmployeeWriteback({
      objectTypeId,
      recordId: normalizedRecordId,
      employeeIdProperty,
      properties: filterWritebackProperties(
        buildWritebackPropertyPatch({
          employeeType: normalizedEmployeeType,
          employeeIdProperty,
          payloadHash,
          status,
          contactId,
          errorMessage: syncResult.reason || ""
        }),
        { kind: "employee", idProperty: employeeIdProperty }
      )
    });

    // Every CentralReach write of this run succeeded, so the run is clean and its hashes are
    // saved, also when the status is waiting or error (rule 5.4).
    await saveLinkFields({
      workflow: "employeeSync",
      employeeType: normalizedEmployeeType,
      portalId,
      crContactId: contactId,
      externalSystemId: outboundPayload.externalSystemId ?? null,
      payloadHash,
      fieldHashes: nextFieldHashes,
      hashesContactId: contactId,
      mappingVersion: MAPPING_VERSION,
      pendingCreateExternalId: null,
      clean: true
    });
    await saveAttempt(STATE_TYPES.SUCCESS, {
      status,
      operation: syncResult.operation,
      changedFieldNames: changedFields,
      metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? null,
      metadataFailedCount: metadataSyncSummary?.failedCount ?? null,
      writebackFallbackUsed: Boolean(writebackResult?.fallbackUsed),
      mappingWarningCodes: mappingWarnings.map((item) => item?.code).filter(Boolean)
    });

    return {
      ok: true,
      recordId: normalizedRecordId,
      employeeType: normalizedEmployeeType,
      status,
      operation: syncResult.operation,
      crContactId: contactId,
      metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? 0,
      metadataFailedCount: metadataSyncSummary?.failedCount ?? 0,
      writebackFallbackUsed: Boolean(writebackResult?.fallbackUsed)
    };
  } catch (error) {
    // Row 2.7: one classifier sorts the failure. Permanent: `error` on the record, no retry, the
    // message completes. Temporary or unknown create: thrown, so the queue worker schedules the
    // retry. HubSpot keeps its last status until the last attempt (decision 1).
    const failureKind = classifyFailure(error);
    const permanent = failureKind === FAILURE_KINDS.PERMANENT;
    logger(
      permanent || lastAttempt ? "error" : "warn",
      "Employee sync workflow failed.",
      buildError({
        workflow: "employeeSync",
        stage: "runEmployeeSyncWorkflow",
        error,
        recordId: normalizedRecordId,
        extra: {
          employeeType: normalizedEmployeeType,
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
            last_sync_status: "error",
            last_sync_at: new Date().toISOString(),
            last_sync_error: permanent ? permanentFailureReason(error) : RETRIES_USED_UP,
            integration_last_write: new Date().toISOString(),
            updated_by_integration: true
          }
        : {}),
      ...(linkedContactId && !hubspotHasContactId
        ? linkProperties({
            employeeType: normalizedEmployeeType,
            employeeIdProperty,
            contactId: linkedContactId
          })
        : {})
    };
    let writebackError = null;
    if (gatePassed && Object.keys(errorPatch).length > 0) {
      try {
        await writeEmployeeWriteback({
          objectTypeId,
          recordId: normalizedRecordId,
          employeeIdProperty,
          properties: filterWritebackProperties(errorPatch, {
            kind: "employee",
            idProperty: employeeIdProperty
          })
        });
      } catch (failed) {
        writebackError = failed;
        logger(
          "error",
          "Employee sync error writeback failed.",
          buildError({
            workflow: "employeeSync",
            stage: "writeErrorWriteback",
            error: failed,
            recordId: normalizedRecordId
          })
        );
      }
    }

    // A run that does not hold the record lease writes no state. Otherwise the merge keeps the
    // CR id, the last good hashes and a pending create; only the attempt record says what failed.
    if (lease) {
      try {
        if (linkedContactId) {
          await saveLinkFields({ crContactId: linkedContactId });
        }
        await saveAttempt(STATE_TYPES.FAIL, {
          status: "error",
          failureKind,
          errorCode: String(error?.code ?? ""),
          errorMessage: String(error?.message || "Employee sync failed").slice(0, 500),
          failedFieldIds: error?.failedFieldIds || []
        });
      } catch (stateError) {
        logger(
          "error",
          "Employee sync fail-state write failed.",
          buildError({
            workflow: "employeeSync",
            stage: "putFailState",
            error: stateError,
            recordId: normalizedRecordId
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
      recordId: normalizedRecordId,
      employeeType: normalizedEmployeeType,
      status: "error",
      crContactId: linkedContactId
    };
  } finally {
    if (lease) {
      try {
        await unlock({ pk: "sync-lock:employee", id: stateId, etag: lease.etag });
      } catch (releaseError) {
        if (!isStateClientUnavailable(releaseError)) {
          logger(
            "error",
            "Employee sync lock release failed.",
            buildError({
              workflow: "employeeSync",
              stage: "releaseLock",
              error: releaseError,
              recordId: normalizedRecordId
            })
          );
        }
      }
    }
  }
}
