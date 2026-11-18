import { getConfig } from "../lib/config.mjs";
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
import { filterWritebackProperties } from "../lib/writebackAllowlist.mjs";
import { buildEmployeePayload } from "../mappings/employees/buildEmployeePayload.mjs";
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
  unreadableDate,
  WAITING_FOR_WORKDAY_ID,
  WORKDAY_ALREADY_IN_CENTRALREACH
} from "../constants/syncReasons.mjs";
import { checklistTicked, employeeCreateLookupDecision, linkedEmployeeIdentity } from "../lib/syncDecisions.mjs";
import { employeeSyncEligibility } from "../lib/syncEligibility.mjs";

const EMPLOYEE_STATE_PK = "sync:employee";

const BT_RBT_PROPERTIES = [
  "hs_object_id",
  "employee_id",
  "hs_lastmodifieddate",
  "updated_by_integration",
  "integration_last_write",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "entered_in_centralreach",
  "test_record",
  "workday_id",
  "first_name",
  "last_name",
  "bt_name",
  "date_of_birth",
  BT_RBT_CHECKLIST_PROPERTY,
  "gender",
  "email",
  "street_home",
  "home_apt",
  "location_city",
  "location_home",
  "postal_code",
  "postal_code_home",
  "employee_phone",
  "bt_rbt_type",
  "active_cases_count",
  "street_address__work_",
  "city__work_",
  "state__work_",
  "postal_code__work_",
  "central_reach_link_to_rt_rbt"
];

const BCBA_PROPERTIES = [
  "hs_object_id",
  "employee_id",
  "hs_lastmodifieddate",
  "updated_by_integration",
  "integration_last_write",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "entered_in_centralreach",
  "test_record",
  "workday_id",
  "first_name",
  "last_name",
  "bcba_name",
  "date_of_birth",
  "email",
  "ucaba_email_address",
  "work_email",
  BCBA_CHECKLIST_PROPERTY,
  "address",
  "home_apt",
  "city_work",
  "home_state",
  "employee_phone",
  "medicaid_id__ny",
  "medicaid_id__nj",
  "medicaid_id__co",
  "credentialed_insurances__ny",
  "central_reach_record_link"
];

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

function knownMetadataFieldIds(employeeType) {
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT) {
    return [
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.WORK_ADDRESS,
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.ACTIVE_CASE_COUNT,
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD
    ];
  }
  return [
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_EMAIL,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NJ,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_CO,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_NY,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BCBA_RECORD
  ];
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

function getWorkflowStateId(employeeType, recordId) {
  return `${employeeType}:${recordId}`;
}

export async function runEmployeeSyncWorkflow(
  { recordId, employeeType, hsLastModifiedDate, source, context },
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
  const properties =
    normalizedEmployeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT
      ? [...BT_RBT_PROPERTIES, employeeIdProperty]
      : [...BCBA_PROPERTIES, employeeIdProperty];
  if (recordGateProperty && !properties.includes(recordGateProperty)) {
    properties.push(recordGateProperty);
  }

  initHubSpot(config);
  initCentralReach(config);
  initState(config);

  const stateId = getWorkflowStateId(normalizedEmployeeType, normalizedRecordId);
  let lockHeld = false;
  // Known CR id and last good field hashes. A failure must keep both (Requirement 9; Hybrid
  // design: "save the successful comparison baseline only after the required writes succeed").
  let linkedContactId = null;
  let hubspotHasContactId = false;
  let priorFieldHashes = null;
  try {
    const locked = await claimRecordLock(claimLock, {
      pk: "sync-lock:employee",
      id: stateId,
      ttlSeconds: config.ttl?.leaseTtlSeconds || 120
    });
    if (!locked) {
      const busy = new Error("SyncInProgress");
      busy.code = "SYNC_IN_PROGRESS";
      throw busy;
    }
    lockHeld = true;

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

    const prior = await readPriorSyncState(readState, EMPLOYEE_STATE_PK, stateId);
    const hubspotContactId = String(hubspotProps?.[employeeIdProperty] || "").trim();
    let existingContactId =
      hubspotContactId || String(prior?.data?.crContactId || "").trim() || null;
    linkedContactId = existingContactId;
    hubspotHasContactId = Boolean(hubspotContactId);
    priorFieldHashes = prior?.data?.fieldHashes || null;

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
      if (fail) {
        // The fail record keeps the CR id and the last good field hashes, and then lives as long
        // as a success record. Same rule as the catch block below.
        const keptContactId = contactId || linkedContactId || null;
        await saveState({
          pk: EMPLOYEE_STATE_PK,
          id: stateId,
          type: STATE_TYPES.FAIL,
          ttlSeconds:
            keptContactId || priorFieldHashes
              ? config.ttl.successTtlSeconds
              : config.ttl.failTtlSeconds,
          data: {
            workflow: "employeeSync",
            employeeType: normalizedEmployeeType,
            status,
            errorMessage: String(reason || "").slice(0, 500),
            crContactId: keptContactId,
            fieldHashes: priorFieldHashes,
            hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null,
            invocationId: context?.invocationId || null,
            updatedAt: new Date().toISOString()
          }
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
    let linkSaved = false;

    // A CR id that HubSpot does not hold yet is saved before any later step can fail: first in
    // Cosmos, then on the HubSpot record.
    const saveLink = async (contactId) => {
      // Set first: if the Cosmos save fails, the error writeback still sends the id to HubSpot.
      linkedContactId = String(contactId);
      await saveState({
        pk: EMPLOYEE_STATE_PK,
        id: stateId,
        type: "pending_link",
        ttlSeconds: config.ttl.successTtlSeconds,
        data: {
          workflow: "employeeSync",
          employeeType: normalizedEmployeeType,
          crContactId: String(contactId),
          fieldHashes: priorFieldHashes,
          updatedAt: new Date().toISOString()
        }
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
      let createLockHeld = false;
      try {
        const locked = await claimRecordLock(claimLock, {
          pk: "create-lock:employee",
          id: externalId,
          ttlSeconds: config.ttl?.leaseTtlSeconds || 120
        });
        if (!locked) {
          const busy = new Error("SyncInProgress");
          busy.code = "SYNC_IN_PROGRESS";
          throw busy;
        }
        createLockHeld = true;
        const byRecord = await findByExternalId(normalizedRecordId);
        const workday = String(hubspotProps.workday_id || "").trim();
        const byWorkday = workday
          ? await findByExternalId(workday)
          : { found: false, crContactId: null };
        const decision = employeeCreateLookupDecision({
          byRecordId: byRecord,
          byWorkday,
          workdayFilled: Boolean(workday)
        });
        if (decision.outcome === "conflicting_ids") {
          return decided({ status: "error", reason: CONFLICTING_EXTERNAL_IDS, fail: true });
        }
        if (decision.outcome === "found_by_workday") {
          const holders = await findHolders({
            bcbaObjectTypeId: config.hubspot.bcbaObjectTypeId,
            btRbtObjectTypeId: config.hubspot.btRbtObjectTypeId,
            employeeId: decision.crContactId,
            excludeRecordId: normalizedRecordId,
            employeeIdProperty
          });
          if (Array.isArray(holders) && holders.length > 0) {
            return decided({ status: "error", reason: ANOTHER_HUBSPOT_RECORD_LINKED, fail: true });
          }
          return decided({
            status: "waiting",
            reason: WORKDAY_ALREADY_IN_CENTRALREACH,
            fail: false
          });
        }
        if (decision.outcome === "link_own") {
          existingContactId = decision.crContactId;
          linkedContactId = existingContactId;
        } else {
          syncResult = await upsertEmployee({
            payload: outboundPayload,
            employeeType: normalizedEmployeeType,
            existingContactId: null,
            allowEmployeeCreate: Boolean(config.features?.allowEmployeeCreate),
            putOnlyMode: config.features?.putOnlyMode !== false
          });
          createdThisRun = syncResult?.operation === "create";
          if (syncResult?.operation === "create_turned_off") {
            return decided({ status: "waiting", reason: syncResult.reason, fail: false });
          }
          if (syncResult?.operation === "create_rejected") {
            return decided({ status: "error", reason: syncResult.reason, fail: true });
          }
          // Row 1.8: the lease also covers saving the new CR id, so a second record with the
          // same Workday ID finds this record as its holder.
          if (createdThisRun && syncResult.crContactId) {
            await saveLink(syncResult.crContactId);
          }
        }
      } finally {
        if (createLockHeld) {
          try {
            await unlock({ pk: "create-lock:employee", id: externalId });
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
    const previousFieldHashes = priorFieldHashes;
    const changedFields = changedNamesFromHashes(previousFieldHashes, nextFieldHashes);
    const previousHash = String(hubspotProps?.last_sync_hash || "");
    const canNoopByHash = Boolean(
      previousHash && previousHash === payloadHash && existingContactId && !syncResult
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

      await saveState({
        pk: EMPLOYEE_STATE_PK,
        id: getWorkflowStateId(normalizedEmployeeType, normalizedRecordId),
        type: STATE_TYPES.SUCCESS,
        ttlSeconds: config.ttl.successTtlSeconds,
        data: {
          workflow: "employeeSync",
          employeeType: normalizedEmployeeType,
          status: "noop",
          operation: "noop",
          crContactId: existingContactId,
          payloadHash,
          fieldHashes: nextFieldHashes,
          mappingVersion: MAPPING_VERSION,
          changedFieldNames: changedFields,
          writebackFallbackUsed: Boolean(writebackResult?.fallbackUsed),
          mappingWarningCodes: mappingWarnings.map((item) => item?.code).filter(Boolean),
          hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null,
          invocationId: context?.invocationId || null,
          updatedAt: new Date().toISOString()
        }
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

    // A create saved its link inside the create lease. A match by external id saves it here.
    if (contactId && !hubspotHasContactId && !linkSaved) {
      await saveLink(contactId);
    }

    const labelIds = canonicalizeLabels(mapped.requiredLabelIds);
    if (contactId && (Object.keys(metadataForCompare).length > 0 || labelIds.length > 0)) {
      const clearFieldIds = metadataClearFieldIds(previousFieldHashes, metadataForCompare);
      metadataSyncSummary = await pushMetadata(contactId, metadataForCompare, {
        labelIds,
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
        const failed = new Error("MetadataWriteFailed");
        failed.code = "METADATA_WRITE_FAILED";
        failed.failedFieldIds = metadataSyncSummary.failedFieldIds || [];
        throw failed;
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

    await saveState({
      pk: EMPLOYEE_STATE_PK,
      id: getWorkflowStateId(normalizedEmployeeType, normalizedRecordId),
      type: STATE_TYPES.SUCCESS,
      ttlSeconds: config.ttl.successTtlSeconds,
      data: {
        workflow: "employeeSync",
        employeeType: normalizedEmployeeType,
        status,
        operation: syncResult.operation,
        crContactId: contactId,
        payloadHash,
        fieldHashes: nextFieldHashes,
        mappingVersion: MAPPING_VERSION,
        changedFieldNames: changedFields,
        metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? null,
        metadataFailedCount: metadataSyncSummary?.failedCount ?? null,
        writebackFallbackUsed: Boolean(writebackResult?.fallbackUsed),
        mappingWarningCodes: mappingWarnings.map((item) => item?.code).filter(Boolean),
        hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null,
        invocationId: context?.invocationId || null,
        updatedAt: new Date().toISOString()
      }
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
    if (
      error?.code === "SYNC_IN_PROGRESS" ||
      error?.code === "SYNC_STALE" ||
      error?.code === "CR_LOOKUP_UNKNOWN"
    ) {
      throw error;
    }
    logger(
      "error",
      "Employee sync workflow failed.",
      buildError({
        workflow: "employeeSync",
        stage: "runEmployeeSyncWorkflow",
        error,
        recordId: normalizedRecordId,
        extra: {
          employeeType: normalizedEmployeeType,
          invocationId: context?.invocationId || null,
          hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null
        }
      })
    );

    // Every failure is visible on the HubSpot record, so the failures report is complete.
    // The CR id goes with it when HubSpot does not hold it yet.
    try {
      const failedFieldIds = Array.isArray(error?.failedFieldIds) ? error.failedFieldIds : [];
      await writeEmployeeWriteback({
        objectTypeId,
        recordId: normalizedRecordId,
        employeeIdProperty,
        properties: filterWritebackProperties(
          {
            last_sync_status: "error",
            last_sync_at: new Date().toISOString(),
            last_sync_error: (failedFieldIds.length
              ? `MetadataWriteFailed fields: ${failedFieldIds.join(",")}`
              : String(error?.message || "Employee sync failed")
            ).slice(0, 500),
            integration_last_write: new Date().toISOString(),
            updated_by_integration: true,
            ...(linkedContactId && !hubspotHasContactId
              ? linkProperties({
                  employeeType: normalizedEmployeeType,
                  employeeIdProperty,
                  contactId: linkedContactId
                })
              : {})
          },
          { kind: "employee", idProperty: employeeIdProperty }
        )
      });
    } catch (writebackError) {
      logger(
        "error",
        "Employee sync error writeback failed.",
        buildError({
          workflow: "employeeSync",
          stage: "writeErrorWriteback",
          error: writebackError,
          recordId: normalizedRecordId
        })
      );
    }

    // The fail state keeps the CR id and the last good field hashes, including when this run
    // failed before it read them. A state that carries either lives as long as a success state,
    // so a failure never shortens the life of the link.
    try {
      const stored = (await readPriorSyncState(readState, EMPLOYEE_STATE_PK, stateId))?.data;
      const keptContactId = linkedContactId || stored?.crContactId || null;
      const keptFieldHashes = priorFieldHashes || stored?.fieldHashes || null;
      await saveState({
        pk: EMPLOYEE_STATE_PK,
        id: stateId,
        type: STATE_TYPES.FAIL,
        ttlSeconds:
          keptContactId || keptFieldHashes ? config.ttl.successTtlSeconds : config.ttl.failTtlSeconds,
        data: {
          workflow: "employeeSync",
          employeeType: normalizedEmployeeType,
          status: "error",
          errorMessage: String(error?.message || "Employee sync failed").slice(0, 500),
          failedFieldIds: error?.failedFieldIds || [],
          crContactId: keptContactId,
          fieldHashes: keptFieldHashes,
          hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null,
          invocationId: context?.invocationId || null,
          updatedAt: new Date().toISOString()
        }
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

    throw error;
  } finally {
    if (lockHeld) {
      try {
        await unlock({ pk: "sync-lock:employee", id: stateId });
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
