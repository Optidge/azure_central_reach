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
import { buildEmployeePayload } from "../mappings/employees/buildEmployeePayload.mjs";
import { validateEmployeePayload } from "../mappings/employees/validateEmployeePayload.mjs";
import { STATE_TYPES } from "../constants/state.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../constants/hubspot.mjs";

const EMPLOYEE_STATE_PK = "sync:employee";
const BLOCKED_CREATE_MESSAGE =
  "PUT_ONLY_MODE enabled: create disabled until sandbox. Provide an existing employee_id or disable PUT_ONLY_MODE + enable ALLOW_EMPLOYEE_CREATE.";

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
  "street_home",
  "home_apt",
  "location_city",
  "location_home",
  "postal_code",
  "postal_code_home",
  "employee_phone",
  "bt_rbt_type",
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
  "bcba_name",
  "date_of_birth",
  "email",
  "work_email",
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
    ...(status === "success" || status === "noop" || status === "blocked"
      ? { integration_last_write: now, updated_by_integration: true }
      : {})
  };

  if (payloadHash && status !== "error") {
    base.last_sync_hash = payloadHash;
  }
  if (contactId) {
    base[employeeIdProperty] = String(contactId);
    if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT) {
      base.central_reach_link_to_rt_rbt = buildCentralReachContactUrl(contactId);
    } else {
      base.central_reach_record_link = buildCentralReachContactUrl(contactId);
    }
  }
  return base;
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
    const previousHash = String(hubspotProps?.last_sync_hash || "");
    const canNoopByHash = Boolean(previousHash && previousHash === payloadHash && existingContactId);
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

    const syncResult = await upsertEmployee({
      payload: outboundPayload,
      employeeType: normalizedEmployeeType,
      existingContactId,
      allowEmployeeCreate: config.features.allowEmployeeCreate,
      putOnlyMode: config.features.putOnlyMode
    });

    const status = syncResult.operation === "blocked" ? "blocked" : "success";
    const contactId = syncResult.crContactId || existingContactId || null;
    linkedContactId = contactId;
    let metadataSyncSummary = null;

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
        await writeEmployeeWriteback({
          objectTypeId,
          recordId: normalizedRecordId,
          employeeIdProperty,
          properties: filterWritebackProperties(
            {
              last_sync_status: "error",
              last_sync_at: new Date().toISOString(),
              last_sync_error: `MetadataWriteFailed fields: ${(metadataSyncSummary.failedFieldIds || []).join(",")}`.slice(0, 500)
            },
            { kind: "employee", idProperty: employeeIdProperty }
          )
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
    if (error?.code === "SYNC_IN_PROGRESS" || error?.code === "SYNC_STALE") {
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
