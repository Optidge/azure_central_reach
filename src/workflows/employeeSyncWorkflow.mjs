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
  getEmployeeByContactId,
  buildEmployeePayloadForContactId,
  updateClientMetadata
} from "../lib/centralReachClient.mjs";
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
import { assertNoAbsentProperties } from "../lib/fieldRead.mjs";
import {
  deriveRecordState,
  employeeBinding,
  parseSnapshot,
  workerGate
} from "../lib/recordLifecycle.mjs";
import { planAttempt, runPlan, syncErrorMessage } from "../lib/attemptPlan.mjs";
import { scheduleEmployeeSyncReplay } from "../lib/serviceBusClient.mjs";
import { MAX_DELIVERY_COUNT } from "../constants/queues.mjs";
import { buildEmployeePayload } from "../mappings/employees/buildEmployeePayload.mjs";
import { validateEmployeePayload } from "../mappings/employees/validateEmployeePayload.mjs";
import { STATE_TYPES } from "../constants/state.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../constants/hubspot.mjs";

const EMPLOYEE_STATE_PK = "sync:employee";

// None of these properties are in the production sensitive-data tier
// (Integration V2 API rule #2, portal 50317927).
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
  "bt_name",
  "date_of_birth",
  "gender",
  "email",
  "first_name",
  "last_name",
  "street_home",
  "home_apt",
  "location_city",
  "location_home",
  "state_home",
  "location",
  "postal_code_home",
  "entered_in_centralreach",
  // Section 6 phone is the Contact mirror on the BT/RBT (`employee_phone`).
  // Production adds a sync from Contact home and phone. Read this property.
  // Do not fetch the Contact. The new internal name is not recorded yet.
  "employee_phone",
  "bt_rbt_type",
  "street_address__work_",
  "city__work_",
  "state__work_",
  "postal_code__work_",
  "central_reach_link_to_rt_rbt"
];

// None of these properties, including medicaid_id__ny, medicaid_id__nj, and
// medicaid_id__co, are in the production sensitive-data tier.
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
  "bcba_name",
  "first_name",
  "last_name",
  "date_of_birth",
  // Section 5 personal email is the BCBA Contact `email` (association 17).
  // Read this BCBA property. Do not fetch the Contact. The production sync
  // property's internal name is not confirmed.
  "email",
  // Section 5 work email is `ucaba_email_address` on the BCBA, not the Contact.
  "ucaba_email_address",
  "work_email",
  "entered_in_centralreach",
  "address",
  "home_apt",
  "apartment__home",
  "city_work",
  "city_home",
  "home_state",
  "state_home",
  "location",
  "postal_code_home",
  "assign_states",
  "lba_licensure__ny",
  "work_status",
  "ny_insurance_labels",
  // Fetched because it exists on the BCBA object. Guide section 8 has no CR label for it.
  "nj_insurance_labels",
  "co_insurance_labels",
  "cr_billing_hold_label",
  // Section 5 phone is the Contact mirror on the BCBA (`employee_phone`).
  // Production adds a sync from Contact home and phone. Do not fetch the Contact.
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
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD
    ];
  }
  return [
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_EMAIL,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NJ,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_CO,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_NY,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_AETNA,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_CIGNA,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_CO,
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

function employeeLinkFields({ employeeType, employeeIdProperty, contactId }) {
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

function getWorkflowStateId(employeeType, recordId) {
  return `${employeeType}:${recordId}`;
}

export async function runEmployeeSyncWorkflow(
  { recordId, employeeType, hsLastModifiedDate, source, context, deliveryCount, replayCount = 0 },
  dependencies = {}
) {
  const getRuntimeConfig = dependencies.getConfig || getConfig;
  const initHubSpot = dependencies.createHubSpotClient || createHubSpotClient;
  const initCentralReach = dependencies.createCentralReachClient || createCentralReachClient;
  const initState = dependencies.createStateClient || createStateClient;
  const fetchBtRbt = dependencies.getBtRbtRecordById || getBtRbtRecordById;
  const fetchBcba = dependencies.getBcbaRecordById || getBcbaRecordById;
  const upsertEmployee = dependencies.createOrUpdateEmployee || createOrUpdateEmployee;
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
  const properties =
    normalizedEmployeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT
      ? [...BT_RBT_PROPERTIES, employeeIdProperty]
      : [...BCBA_PROPERTIES, employeeIdProperty];

  initHubSpot(config);
  initCentralReach(config);
  initState(config);

  const binding = employeeBinding(employeeIdProperty);
  const scheduleReplay = dependencies.scheduleEmployeeSyncReplay || scheduleEmployeeSyncReplay;
  const patchRecord = (patch) =>
    writeEmployeeWriteback({
      objectTypeId,
      recordId: normalizedRecordId,
      employeeIdProperty,
      properties: filterWritebackProperties(patch, {
        kind: "employee",
        idProperty: employeeIdProperty
      })
    });
  const attempt = {
    binding,
    recordId: normalizedRecordId,
    deliveryCount: deliveryCount ?? MAX_DELIVERY_COUNT,
    maxDeliveryCount: MAX_DELIVERY_COUNT,
    replayCount,
    dryRun: Boolean(config.features?.syncDryRun),
    allowEmployeeCreate: Boolean(config.features?.allowEmployeeCreate && !config.features?.putOnlyMode)
  };
  let lastSyncStatus = null;

  const stateId = getWorkflowStateId(normalizedEmployeeType, normalizedRecordId);
  let lockHeld = false;
  let linkedContactId = null;
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

    const recordState = deriveRecordState(
      parseSnapshot(hubspotProps, binding, normalizedRecordId)
    );
    lastSyncStatus = recordState.lastSyncStatus;
    linkedContactId = recordState.centralReachId;
    const gate = workerGate(recordState);
    if (gate.action === "skip") {
      logger("info", "Employee sync skipped by the worker gate.", {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        source: source || null,
        outcome: "skipped",
        reason: gate.reason,
        invocationId: context?.invocationId || null
      });
      return {
        ok: true,
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        status: "skipped",
        operation: "noop",
        reason: gate.reason,
        crContactId: null
      };
    }
    assertNoAbsentProperties(hubspotProps, properties);

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
    const validation = validatePayload(mapped.employeePayload);
    if (!validation.isValid) {
      throw new Error(`PayloadValidationError: ${validation.errors.join(", ")}`);
    }

    const prior = await readPriorSyncState(readState, EMPLOYEE_STATE_PK, stateId);
    const hubspotContactId = String(hubspotProps?.[employeeIdProperty] || "").trim();
    const existingContactId =
      hubspotContactId || String(prior?.data?.crContactId || "").trim() || null;
    let outboundPayload = mapped.employeePayload;

    if (existingContactId) {
      const existingCrEmployee = await fetchCrEmployeeById(existingContactId);
      outboundPayload = preserveIdentifiers(mapped.employeePayload, existingCrEmployee).payload;
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
    const previousFieldHashes = prior?.data?.fieldHashes || null;
    const changedFields = changedNamesFromHashes(previousFieldHashes, nextFieldHashes);
    if (existingContactId) {
      linkedContactId = existingContactId;
    }
    const previousHash = String(hubspotProps?.last_sync_hash || "");
    let syncResult = { operation: "noop", crContactId: existingContactId };
    let metadataSyncSummary = null;
    let writebackResult = null;
    const plan = planAttempt({
      ...attempt,
      lastSyncStatus,
      centralReachId: existingContactId,
      hashMatched: Boolean(previousHash && previousHash === payloadHash),
      payloadHash,
      error: null,
      nowMs: Date.now()
    });

    const action = await runPlan(plan, {
      patch: async (patch) => {
        writebackResult = await patchRecord(patch);
      },
      upsert: async () => {
        syncResult = await upsertEmployee({
          payload: outboundPayload,
          employeeType: normalizedEmployeeType,
          existingContactId,
          allowEmployeeCreate: config.features.allowEmployeeCreate,
          putOnlyMode: config.features.putOnlyMode
        });
        const contactId = syncResult.crContactId || existingContactId || null;
        linkedContactId = contactId;

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

        return {
          ...employeeLinkFields({
            employeeType: normalizedEmployeeType,
            employeeIdProperty,
            contactId
          }),
          ...(syncResult.operation === "blocked"
            ? { last_sync_status: "blocked", last_sync_error: syncResult.reason || "" }
            : {})
        };
      }
    });

    const status =
      action === "write"
        ? syncResult.operation === "blocked"
          ? "blocked"
          : "success"
        : action === "dry-run-stop"
          ? "dry-run"
          : action === "blocked"
            ? "blocked"
            : "noop";
    logger("info", "Employee sync compared mapped state.", {
      workflow: "employeeSync",
      recordId: normalizedRecordId,
      employeeType: normalizedEmployeeType,
      source: source || null,
      mappingVersion: MAPPING_VERSION,
      outcome: status,
      action,
      linked: Boolean(existingContactId),
      changedFieldNames: changedFields,
      invocationId: context?.invocationId || null
    });

    if (action === "write") {
      await saveState({
        pk: EMPLOYEE_STATE_PK,
        id: getWorkflowStateId(normalizedEmployeeType, normalizedRecordId),
        type: STATE_TYPES.SUCCESS,
        ttlSeconds: config.ttl.successTtlSeconds,
        data: {
          workflow: "employeeSync",
          source: source || null,
          employeeType: normalizedEmployeeType,
          status,
          operation: syncResult.operation,
          crContactId: linkedContactId,
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
    }

    return {
      ok: true,
      recordId: normalizedRecordId,
      employeeType: normalizedEmployeeType,
      status,
      operation: action === "write" ? syncResult.operation : "noop",
      crContactId: action === "write" ? linkedContactId : existingContactId,
      metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? 0,
      metadataFailedCount: metadataSyncSummary?.failedCount ?? 0,
      writebackFallbackUsed: Boolean(writebackResult?.fallbackUsed)
    };
  } catch (error) {
    const transient = error?.code === "SYNC_IN_PROGRESS" || error?.code === "SYNC_STALE";
    if (!transient) {
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

      try {
        await saveState({
          pk: EMPLOYEE_STATE_PK,
          id: getWorkflowStateId(normalizedEmployeeType, normalizedRecordId),
          type: STATE_TYPES.FAIL,
          ttlSeconds: config.ttl.failTtlSeconds,
          data: {
            workflow: "employeeSync",
            employeeType: normalizedEmployeeType,
            status: "error",
            errorMessage: String(error?.message || "Employee sync failed").slice(0, 500),
            failedFieldIds: error?.failedFieldIds || [],
            crContactId: linkedContactId,
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
    }

    const plan = planAttempt({
      ...attempt,
      lastSyncStatus,
      centralReachId: linkedContactId,
      hashMatched: false,
      error,
      nowMs: Date.now()
    });
    await runPlan(plan, {
      patch: patchRecord,
      claimReplay: (messageId) =>
        claimLock({ pk: "replay:employee", id: messageId, ttlSeconds: config.ttl.successTtlSeconds }),
      schedule: (replay) => scheduleReplay(normalizedRecordId, normalizedEmployeeType, replay)
    });
    logger("info", "Employee sync dry run stopped on an error.", {
      workflow: "employeeSync",
      recordId: normalizedRecordId,
      employeeType: normalizedEmployeeType,
      source: source || null,
      outcome: "dry-run",
      reason: syncErrorMessage(error),
      invocationId: context?.invocationId || null
    });
    return {
      ok: true,
      recordId: normalizedRecordId,
      employeeType: normalizedEmployeeType,
      status: "dry-run",
      operation: "noop",
      reason: syncErrorMessage(error),
      crContactId: null
    };
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
