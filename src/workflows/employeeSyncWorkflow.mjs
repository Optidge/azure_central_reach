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
  checkHeldSsnSendable,
  heldEmployeeContact,
  updateClientMetadata
} from "../lib/centralReachClient.mjs";
import { findHubSpotRecordsByEmployeeId } from "../lib/hubspotClient.mjs";
import { CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS } from "../constants/centralReach.mjs";
import {
  CHANGE_NOT_FROM_WEBHOOK,
  HubSpotReadError,
  MAPPING_VERSION,
  canonicalizeLabels,
  changedMetadata,
  changedNamesFromHashes,
  explicitMetadata,
  fieldHashes,
  hashMappedState,
  isBackupPathSource,
  isStateClientUnavailable,
  keepOmittedFieldHashes,
  keepUnwrittenCoreFields,
  mappedKeysMatchRead,
  metadataClearFieldIds,
  unusableHeldEmployeeDateOfBirth,
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
import { unreadableAnswerError } from "../lib/unreadableAnswer.mjs";
import { createSyncRunSummary, reasonCodeOfError } from "../lib/syncRunSummary.mjs";
import {
  FAILURE_KINDS,
  classifyFailure,
  createStillPendingError,
  isLastAttempt,
  labelPostUnconfirmedError,
  metadataWriteFailedError,
  permanentFailureReason
} from "../lib/retry.mjs";
import { filterWritebackProperties } from "../lib/writebackAllowlist.mjs";
import { buildEmployeePayload } from "../mappings/employees/buildEmployeePayload.mjs";
import {
  employeeMappedProperties,
  employeeRequestProperties,
  knownMetadataFieldIds
} from "../mappings/employees/employeeProperties.mjs";
import { validateEmployeePayload } from "../mappings/employees/validateEmployeePayload.mjs";
import { STATE_TYPES } from "../constants/state.mjs";
import {
  BCBA_CHECKLIST_PROPERTY,
  BT_RBT_CHECKLIST_PROPERTY,
  EMPLOYEE_ENTRY_PROPERTY,
  HUBSPOT_EMPLOYEE_TYPES,
  TEST_RECORD_PROPERTY
} from "../constants/hubspot.mjs";
import {
  ANOTHER_HUBSPOT_RECORD_LINKED,
  CHECKLIST_BLANK_WORKDAY,
  CHECKLIST_STILL_TEMPORARY,
  CONFLICTING_EXTERNAL_IDS,
  crIdNotDigits,
  missingPropertiesReason,
  REPLACE_TEMPORARY_ID,
  RETRIES_USED_UP,
  unreadableDate,
  unreadableValue,
  WAITING_FOR_WORKDAY_ID,
  WORKDAY_ALREADY_IN_CENTRALREACH,
  WORKDAY_ID_MISMATCH,
  WORKDAY_ID_NOT_SEVEN_DIGITS
} from "../constants/syncReasons.mjs";
import {
  checklistTicked,
  employeeCreateLookupDecision,
  linkedEmployeeIdentity,
  workdayIdIsValid
} from "../lib/syncDecisions.mjs";
import {
  SKIP_REASONS,
  employeeSyncEligibility,
  gateProperties,
  gatePropertyNames
} from "../lib/syncEligibility.mjs";

// The link record never expires. Attempt details (last error, invocation) are a second record
// that may expire. Both ids start with the portal ID.
const EMPLOYEE_LINK_PK = "sync:employee";
const EMPLOYEE_ATTEMPT_PK = "sync-attempt:employee";

// Row 3.20: the reason codes of the summary line, for the outcomes this worker decides on
// purpose. A code, never the sentence written to HubSpot.
const DECIDED_CODES = Object.freeze({
  CR_ID_NOT_DIGITS: "CR_ID_NOT_DIGITS",
  HUBSPOT_PROPERTY_MISSING: "HUBSPOT_PROPERTY_MISSING",
  UNREADABLE_DATE: "UNREADABLE_DATE",
  UNREADABLE_VALUE: "UNREADABLE_VALUE",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  ANOTHER_HUBSPOT_RECORD_LINKED: "ANOTHER_HUBSPOT_RECORD_LINKED",
  CONFLICTING_EXTERNAL_IDS: "CONFLICTING_EXTERNAL_IDS",
  WORKDAY_ALREADY_IN_CENTRALREACH: "WORKDAY_ALREADY_IN_CENTRALREACH",
  EMPLOYEE_CREATE_TURNED_OFF: "EMPLOYEE_CREATE_TURNED_OFF",
  CR_CREATE_REJECTED: "CR_CREATE_REJECTED",
  WORKDAY_ID_INVALID: "WORKDAY_ID_INVALID"
});

// Rule 5.4: the code of each identity check sentence (src/lib/syncDecisions.mjs).
const IDENTITY_CODES = new Map([
  [WAITING_FOR_WORKDAY_ID, "WAITING_FOR_WORKDAY_ID"],
  [REPLACE_TEMPORARY_ID, "REPLACE_TEMPORARY_ID"],
  [CHECKLIST_STILL_TEMPORARY, "CHECKLIST_STILL_TEMPORARY"],
  [CHECKLIST_BLANK_WORKDAY, "CHECKLIST_BLANK_WORKDAY"],
  [WORKDAY_ID_MISMATCH, "WORKDAY_ID_MISMATCH"]
]);

function identityCode(reason) {
  return IDENTITY_CODES.get(reason) ?? null;
}

// A run that is held on purpose and retried: another run holds the record, or a create was sent
// a short time ago and CentralReach does not show it yet. The summary line says `waiting`, as the
// Case worker's does.
const WAITING_CODES = new Set(["SYNC_IN_PROGRESS", "CR_CREATE_PENDING"]);

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

// Row 3.7: does HubSpot already show the status and the reason this run would write?
function statusIsShown(properties, status, reason) {
  return (
    String(properties?.last_sync_status ?? "").trim() === status &&
    String(properties?.last_sync_error ?? "").trim() === String(reason || "").trim()
  );
}

// Row 4.18 (rule 5.8): HubSpot answers a blank property with a null key (P.7 (b), 2026-11-20),
// so a requested property whose key is missing from the answer was not read. Returns those names.
function missingKeys(properties, names) {
  const answer = properties && typeof properties === "object" ? properties : {};
  return names.filter((name) => !Object.hasOwn(answer, name));
}

function missingMappedProperties(employeeType, properties) {
  return missingKeys(properties, employeeMappedProperties(employeeType));
}

// The requested properties, besides the mapped ones, that the gate and the status check read
// before anything is mapped (rule 5.1, row 3.7). The configured record gate property is added by
// the worker. The CR ID property and the checklist are checked after the gate.
const EMPLOYEE_GATE_AND_STATUS_PROPERTIES = Object.freeze([
  EMPLOYEE_ENTRY_PROPERTY,
  TEST_RECORD_PROPERTY,
  "last_sync_status",
  "last_sync_error"
]);

// Row 3.20: the operation of the summary line from the answer of createOrUpdateEmployee. A create
// that CentralReach rejected was still sent; a create that is turned off was not.
function operationOf(syncResult) {
  if (syncResult?.operation === "create" || syncResult?.operation === "create_rejected") {
    return "create";
  }
  return syncResult?.operation === "update" ? "update" : "none";
}

function getWorkflowStateId(portalId, employeeType, recordId) {
  return `${portalId}:${employeeType}:${recordId}`;
}

function syncInProgress() {
  const busy = new Error("SyncInProgress");
  busy.code = "SYNC_IN_PROGRESS";
  return busy;
}

// lastAttempt is set by the queue worker when this message has used its five retries. attempt is
// the number of retries the message has used (row 3.20, the summary line); null when not passed.
// With source it also decides whether a failure is the last attempt (item 20: one retry for a
// daily sweep message, isLastAttempt in retry.mjs).
export async function runEmployeeSyncWorkflow(
  { recordId, employeeType, hsLastModifiedDate, source, context, lastAttempt = false, attempt = null },
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
  // The clock, in milliseconds. Row 3.15 measures the age of a pending create with it.
  const now = dependencies.now || Date.now;
  // Row L.3: the wait between the label read-backs. Only a test sets it; otherwise the sender's
  // own default applies.
  const labelReadBackOptions =
    dependencies.labelReadBackDelayMs === undefined
      ? {}
      : { labelReadBackDelayMs: dependencies.labelReadBackDelayMs };

  const normalizedRecordId = ensureRecordId(recordId);
  const normalizedEmployeeType = ensureEmployeeType(employeeType);

  // Row 3.20: one `Sync run summary.` line per run, logged in `finally`, also when configuration
  // or a client fails (the portal is set once it is known). Only names, IDs, codes and counts:
  // never a field value.
  const summary = createSyncRunSummary({
    workflow: `employeeSync:${normalizedEmployeeType}`,
    recordId: normalizedRecordId,
    portalId: null,
    source: source || null,
    invocationId: context?.invocationId || null,
    attempt
  });
  // Every CentralReach call of the run reports itself here (src/lib/centralReachClient.mjs).
  const onCall = summary.onCall;

  // Set at the start of the `try` below, so a configuration or client failure still ends in
  // `finally` with its summary line. Until they are set, nothing is read or written.
  let config = null;
  let portalId = null;
  let objectTypeId = null;
  let employeeIdProperty = "employee_id";
  // Item 24: the gate of each path; both are read on every run.
  let gates = gateProperties(null);
  let checklistProperty = null;
  let properties = [];
  let stateId = null;
  const prepareRun = () => {
    config = getRuntimeConfig();
    // Any portal that is not in the table is invalid configuration: nothing is read or written.
    ({ portalId } = hubspotPortalSettings(config.hubspot?.hubspotPortalId));
    summary.setPortalId(portalId);
    objectTypeId =
      normalizedEmployeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT
        ? config.hubspot.btRbtObjectTypeId
        : config.hubspot.bcbaObjectTypeId;
    employeeIdProperty = config.hubspot.employeeIdProperty || "employee_id";
    gates = gateProperties(config.sync);
    checklistProperty =
      normalizedEmployeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT
        ? BT_RBT_CHECKLIST_PROPERTY
        : BCBA_CHECKLIST_PROPERTY;
    properties = [...employeeRequestProperties(normalizedEmployeeType), employeeIdProperty];
    for (const name of gatePropertyNames(gates)) {
      if (!properties.includes(name)) {
        properties.push(name);
      }
    }

    initHubSpot(config);
    initCentralReach(config);
    initState(config);
    stateId = getWorkflowStateId(portalId, normalizedEmployeeType, normalizedRecordId);
  };

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
  // Row 3.7: the status and reason HubSpot shows, from the read of this run and then from this
  // run's own writes. A status HubSpot already shows is not written again: every write moves
  // hs_lastmodifieddate, and the hourly poller would queue the record again without end.
  let shown = null;
  const writeHubSpot = async (patch) => {
    const result = await writeEmployeeWriteback({
      objectTypeId,
      recordId: normalizedRecordId,
      employeeIdProperty,
      properties: filterWritebackProperties(patch, {
        kind: "employee",
        idProperty: employeeIdProperty
      })
    });
    summary.noteWriteback(patch.last_sync_status);
    if (patch.last_sync_status !== undefined) {
      shown = {
        last_sync_status: patch.last_sync_status,
        last_sync_error: patch.last_sync_error
      };
    }
    return result;
  };
  // Contract P.5 (e): true once this run created the employee or linked the record to its own
  // earlier create. The catch block then saves labelsPending with the CR id.
  let ownCreateThisRun = false;
  try {
    prepareRun();
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

    const hubspotRecord = await fetchRecord();
    const hubspotProps = hubspotRecord?.properties || {};
    shown = {
      last_sync_status: hubspotProps.last_sync_status,
      last_sync_error: hubspotProps.last_sync_error
    };

    // Rule 5.8, row 4.18: a key the gate or the status check reads that is not in the HubSpot
    // answer was not read. A missing test_record would let a test record through, a missing
    // entry or gate key would decide the gate from nothing, and a missing status key would write
    // the status again on every run. Nothing is decided and nothing is written to HubSpot (rule
    // 5.1: the gate has not passed); the run is retried.
    const missingGateKeys = missingKeys(hubspotProps, [
      ...EMPLOYEE_GATE_AND_STATUS_PROPERTIES,
      ...gatePropertyNames(gates)
    ]);
    if (missingGateKeys.length > 0) {
      throw new HubSpotReadError(`employee:${missingGateKeys.join(",")}`);
    }

    const prior = (await readLink())?.data || {};
    const hubspotContactId = String(hubspotProps?.[employeeIdProperty] || "").trim();
    let existingContactId = hubspotContactId || String(prior.crContactId || "").trim() || null;
    linkedContactId = existingContactId;
    hubspotHasContactId = Boolean(hubspotContactId);
    let linkSaved = false;

    const eligibility = employeeSyncEligibility({
      properties: hubspotProps,
      linked: Boolean(existingContactId),
      hubspotHasCrId: hubspotHasContactId,
      includeTestRecords: Boolean(config.sync?.includeTestRecords),
      gates
    });
    if (!eligibility.eligible) {
      // No Central Reach call and no HubSpot writeback for a skipped employee.
      // Item 24: only a record_gate skip names its path; setGate throws for anything else.
      if (eligibility.reason === SKIP_REASONS.RECORD_GATE) {
        summary.setGate(eligibility.gate);
      }
      summary.setOutcome("skipped", eligibility.reason);
      logger("info", "Employee sync skipped by eligibility gate.", {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        source: source || null,
        reason: eligibility.reason,
        gate: eligibility.gate || null,
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

    // The status is written only when HubSpot does not show it yet; the CR id and the link when
    // HubSpot lacks them.
    // Row 3.20: callers write `return await decided(...)`, so the summary line in `finally` is
    // logged after the writes.
    const decided = async ({ status, reason, code, contactId = null, fail = false }) => {
      const patch = {
        ...(statusIsShown(shown, status, reason)
          ? {}
          : buildWritebackPropertyPatch({
              employeeType: normalizedEmployeeType,
              employeeIdProperty,
              status,
              errorMessage: reason || ""
            })),
        ...(contactId && !hubspotHasContactId
          ? linkProperties({ employeeType: normalizedEmployeeType, employeeIdProperty, contactId })
          : {})
      };
      if (Object.keys(patch).length > 0) {
        await writeHubSpot(patch);
      }
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
      summary.setOutcome(status, code);
      return {
        ok: true,
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        status,
        crContactId: contactId
      };
    };

    // Row 4.18: a mapped property missing from the HubSpot answer is a failed read. It never
    // becomes a blank sent to CentralReach (rule 5.8): error, no CentralReach call. The reason
    // names the first ten missing properties; the log names all of them.
    // Row 4.18 (D-R1 on the Case side): the CR ID property decides "linked" or "not linked", and
    // so a create. A missing key is not "not linked" (a null key is). Checked before anything
    // uses the CR ID; the link record is not touched.
    if (missingKeys(hubspotProps, [employeeIdProperty]).length > 0) {
      linkedContactId = null;
      logger("warn", "Employee HubSpot answer is missing requested properties.", {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        missingProperties: [employeeIdProperty],
        invocationId: context?.invocationId || null
      });
      return await decided({
        status: "error",
        reason: missingPropertiesReason([employeeIdProperty]),
        code: DECIDED_CODES.HUBSPOT_PROPERTY_MISSING,
        fail: true
      });
    }

    // The mapped properties, and the checklist the identity check reads (rule 5.4).
    const missingProperties = [
      ...missingMappedProperties(normalizedEmployeeType, hubspotProps),
      ...missingKeys(hubspotProps, [checklistProperty])
    ];
    if (missingProperties.length > 0) {
      logger("warn", "Employee HubSpot answer is missing requested properties.", {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        missingProperties,
        invocationId: context?.invocationId || null
      });
      return await decided({
        status: "error",
        reason: missingPropertiesReason(missingProperties),
        code: DECIDED_CODES.HUBSPOT_PROPERTY_MISSING,
        fail: true
      });
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

    // Rule 5.5, row 3.16: a CR ID from HubSpot must be digits only. The value is not used, not
    // saved and not logged.
    if (hubspotContactId && !isDigitsOnly(hubspotContactId)) {
      linkedContactId = null;
      return await decided({
        status: "error",
        reason: crIdNotDigits(employeeIdProperty),
        code: DECIDED_CODES.CR_ID_NOT_DIGITS,
        fail: true
      });
    }

    if (mapped.dateOfBirthStatus === "unreadable") {
      return await decided({
        status: "error",
        reason: unreadableDate(mapped.dateOfBirthField || "date_of_birth"),
        code: DECIDED_CODES.UNREADABLE_DATE,
        fail: true
      });
    }

    // F-1 (rule 5.8): a filled phone, email, state or gender that cannot be converted to the
    // CentralReach format is never sent as a blank or as it is: error, no CentralReach write.
    // Checked before the validator, so a filled bad email on a create is "unreadable", not
    // "missing"; a blank email on a create is still "missing".
    if ((mapped.unreadableValueProperties || []).length > 0) {
      return await decided({
        status: "error",
        reason: unreadableValue(mapped.unreadableValueProperties.join(", ")),
        code: DECIDED_CODES.UNREADABLE_VALUE,
        fail: true
      });
    }

    // Item 15 (R-8, row 3.17): a filled workday_id must be exactly 7 digits. Pending final
    // confirmation of the Workday ID format by United Care (O-8); the rule lives in workdayIdIsValid.
    const workdayId = String(hubspotProps.workday_id ?? "").trim();
    if (workdayId && !workdayIdIsValid(workdayId)) {
      return await decided({
        status: "error",
        reason: WORKDAY_ID_NOT_SEVEN_DIGITS,
        code: DECIDED_CODES.WORKDAY_ID_INVALID,
        fail: true
      });
    }

    const validation = validatePayload(mapped.employeePayload, {
      linked: Boolean(existingContactId),
      emailField: mapped.emailField || "email"
    });
    if (!validation.isValid) {
      return await decided({
        status: "error",
        reason: validation.errors?.[0] || "Employee sync failed",
        code: DECIDED_CODES.VALIDATION_FAILED,
        fail: true
      });
    }

    let outboundPayload = mapped.employeePayload;
    // BR16, row 3.13: `contact` of the CentralReach read before an update. The update body is
    // built from it (createOrUpdateEmployee). Never logged or saved.
    let crContact = null;
    let identity = null;
    let syncResult = null;
    let createdThisRun = false;
    // True when this run linked the record to its own earlier create (rule 5.3).
    let linkedToOwnCreate = false;
    // Contract P.5 (e): a contact the integration created, or its own earlier create that a run
    // linked to, may show an empty label read until a label read confirms its labels.
    let labelsPending = labelsPendingFor(prior, existingContactId);

    // A CR id that HubSpot does not hold yet is saved before any later step can fail: first in
    // Cosmos, then on the HubSpot record. Saving the CR id also ends a pending create.
    // ownCreate: the integration created this contact, in this run or in an earlier one.
    const saveLink = async (contactId, externalSystemId, { ownCreate = false } = {}) => {
      // Set first: if the Cosmos save fails, the catch block still sends the id to HubSpot and
      // still saves labelsPending.
      linkedContactId = String(contactId);
      if (ownCreate) {
        labelsPending = true;
        ownCreateThisRun = true;
      }
      await saveLinkFields({
        workflow: "employeeSync",
        employeeType: normalizedEmployeeType,
        portalId,
        crContactId: String(contactId),
        ...(externalSystemId ? { externalSystemId: String(externalSystemId) } : {}),
        ...NO_PENDING_CREATE,
        // The in-progress hashes a create saved before it had a CR id belong to this contact.
        ...(ownCreate
          ? { ...labelsPendingFields(contactId), inProgressContactId: String(contactId) }
          : {})
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
        summary.noteWriteback();
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

    // Contract P.5 (c) in src/mappings/employees/buildEmployeePayload.mjs: a field whose input
    // could not be read is named here, so it is not compared, not sent and not cleared.
    // `dependencies.omitFieldIds` is a seam for tests (lane B I-1). The list also depends on the
    // record (B11: a Care Coordinator that is not ready leaves 140495 out), so the confirm
    // mapping builds its own from the confirm read: a status change between the two reads makes
    // the two hashes differ and the run ends SYNC_STALE (the Case pattern, decision 66a).
    const omitFieldIdsOf = (mappedRecord) => {
      const warningCodes = new Set((mappedRecord.warnings || []).map((item) => item?.code));
      return [
        ...(warningCodes.has("missing_hubspot_portal_id")
          ? [
              CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD,
              CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BCBA_RECORD
            ]
          : []),
        ...(warningCodes.has("care_coordinator_not_ready")
          ? [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CARE_COORDINATOR]
          : []),
        ...(dependencies.omitFieldIds || [])
      ];
    };
    const omitFieldIds = omitFieldIdsOf(mapped);
    // Row 3.7: the compared state is built from HubSpot data only: the mapped payload before
    // any CentralReach read, plus the two inputs of the identity check (rule 5.4).
    const comparedStateOf = (mappedRecord, recordProperties) => ({
      employee: mappedRecord.employeePayload,
      metadata: explicitMetadata(
        mappedRecord.metadataValues,
        knownMetadataFieldIds(normalizedEmployeeType),
        omitFieldIdsOf(mappedRecord)
      ),
      labels: canonicalizeLabels(mappedRecord.requiredLabelIds),
      identity: {
        workdayId: String(recordProperties?.workday_id ?? "").trim() || null,
        checklistTicked: checklistTicked(recordProperties?.[checklistProperty])
      }
    });
    const comparedState = comparedStateOf(mapped, hubspotProps);
    const metadataForCompare = comparedState.metadata;
    const payloadHash = digestPayload(comparedState);
    const comparedFieldHashes = fieldHashes(comparedState);

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
            lookedUp.set(id, await findByExternalId(id, { onCall }));
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

        // Rows 2.3 and 3.15: a create whose answer never arrived is looked up first, by the ID it
        // was sent with, even if workday_id was edited since. Found: it is this record's own
        // create. 404 less than 15 minutes after the create was sent: CentralReach may not show
        // it yet, so no create is sent and the run is retried. 404 later: nothing was created,
        // so the pending ID is cleared. Anything else is thrown and the pending ID stays.
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
              return await decided({
                status: "error",
                reason: ANOTHER_HUBSPOT_RECORD_LINKED,
                code: DECIDED_CODES.ANOTHER_HUBSPOT_RECORD_LINKED,
                fail: true
              });
            }
            decision = {
              outcome: "link_own",
              crContactId: String(byPending.crContactId),
              externalSystemId: pendingId
            };
          } else if (pendingCreateIsRecent(prior, now())) {
            // A marker with no readable time is stamped now; the 15 minutes run from here.
            if (!pendingCreateHasTime(prior)) {
              await saveLinkFields(pendingCreateStamp(now()));
            }
            throw createStillPendingError();
          } else {
            await saveLinkFields(NO_PENDING_CREATE);
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
          return await decided({
            status: "error",
            reason: CONFLICTING_EXTERNAL_IDS,
            code: DECIDED_CODES.CONFLICTING_EXTERNAL_IDS,
            fail: true
          });
        }
        if (decision.outcome === "found_by_workday") {
          const holders = await otherHolders(decision.crContactId);
          if (holders.length > 0) {
            return await decided({
              status: "error",
              reason: ANOTHER_HUBSPOT_RECORD_LINKED,
              code: DECIDED_CODES.ANOTHER_HUBSPOT_RECORD_LINKED,
              fail: true
            });
          }
          return await decided({
            status: "waiting",
            reason: WORKDAY_ALREADY_IN_CENTRALREACH,
            code: DECIDED_CODES.WORKDAY_ALREADY_IN_CENTRALREACH,
            fail: false
          });
        }
        if (decision.outcome === "link_own") {
          // This record's own earlier create: save the link and go on as linked (rule 5.4).
          existingContactId = decision.crContactId;
          linkedToOwnCreate = true;
          await saveLink(existingContactId, decision.externalSystemId || normalizedRecordId, {
            ownCreate: true
          });
        } else {
          const createAllowed =
            Boolean(config.features?.allowEmployeeCreate) && config.features?.putOnlyMode === false;
          if (createAllowed) {
            // Rows 2.3, 2.4 and 3.15: the ID about to be used is saved with the time, and the
            // record is marked in progress, before the create is sent. If this save fails, no
            // create is sent.
            await saveLinkFields({
              workflow: "employeeSync",
              employeeType: normalizedEmployeeType,
              portalId,
              ...pendingCreateFields(externalId, now()),
              // If the run fails after the create, the next run still knows what was sent.
              ...inProgressFields(
                writtenFieldHashes(inProgressHashesFor(prior, null), comparedFieldHashes),
                null
              ),
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
            putOnlyMode: config.features?.putOnlyMode !== false,
            onCall
          });
          summary.setOperation(operationOf(syncResult));
          createdThisRun = syncResult?.operation === "create";
          if (syncResult?.operation === "create_turned_off") {
            return await decided({
              status: "waiting",
              reason: syncResult.reason,
              code: DECIDED_CODES.EMPLOYEE_CREATE_TURNED_OFF,
              fail: false
            });
          }
          if (syncResult?.operation === "create_rejected") {
            // CentralReach said no (400 or 409): nothing was created, so nothing is pending.
            await saveLinkFields(NO_PENDING_CREATE);
            return await decided({
              status: "error",
              reason: syncResult.reason,
              code: DECIDED_CODES.CR_CREATE_REJECTED,
              fail: true
            });
          }
          // Row 1.8: the lease also covers saving the new CR id, so a second record with the
          // same Workday ID finds this record as its holder.
          if (createdThisRun && syncResult.crContactId) {
            await saveLink(syncResult.crContactId, externalId, { ownCreate: true });
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

    // Rows 2.2 and 3.7: the saved hashes count only for the CR id they were synced to and for
    // the current mapping version. Otherwise every field is treated as changed.
    const previousFieldHashes = hashesForContact(prior, existingContactId);
    // Rule 5.8: what the integration is known to have written to this employee. The last clean
    // copy counts under any mapping version, and so do the hashes of runs that did not finish
    // clean (for a record just linked to its own create: the hashes that create saved before it
    // had a CR id). This is the basis for a clear, for a core field sent blank and for an
    // omitted field's kept hash, not for "did anything change".
    const savedAnyVersion = savedHashesForContact(prior, existingContactId);
    const unfinishedFieldHashes = createdThisRun
      ? null
      : inProgressHashesFor(prior, linkedToOwnCreate ? null : existingContactId);
    const writtenBefore = writtenFieldHashes(savedAnyVersion, unfinishedFieldHashes);
    // Row 3.18: an omitted field keeps its saved hash and is not a changed field. After a run
    // that did not finish clean it may keep the unsettled hash instead (keepOmittedFieldHashes).
    const nextFieldHashes = keepOmittedFieldHashes(
      comparedFieldHashes,
      savedAnyVersion,
      omitFieldIds,
      unfinishedFieldHashes
    );
    const changedFields = changedNamesFromHashes(previousFieldHashes, nextFieldHashes);
    summary.setChangedFieldNames(changedFields);
    // Rows 2.4 and 3.7: "nothing changed" needs a clean last run and matching hashes in Cosmos.
    // HubSpot's last_sync_hash is not asked.
    const lastRunClean = prior.clean === true;
    const unchanged =
      !syncResult && lastRunClean && Boolean(previousFieldHashes) && changedFields.length === 0;

    // Row 3.7: nothing changed, so nothing is sent to CentralReach and nothing is saved. HubSpot
    // is written only when it does not show what this run would write: the status, or the CR id.
    const finishUnchanged = async ({ status, reason }) => {
      const patch = {
        ...(statusIsShown(shown, status, reason)
          ? {}
          : buildWritebackPropertyPatch({
              employeeType: normalizedEmployeeType,
              employeeIdProperty,
              status,
              errorMessage: reason
            })),
        ...(hubspotHasContactId
          ? {}
          : linkProperties({
              employeeType: normalizedEmployeeType,
              employeeIdProperty,
              contactId: existingContactId
            }))
      };
      let writebackResult = null;
      if (Object.keys(patch).length > 0) {
        writebackResult = await writeHubSpot(patch);
      }
      // `noop` is a log value only; the status written above, if any, is the real one.
      summary.setOutcome("noop", identityCode(reason));
      logger("info", "Employee sync compared mapped state.", {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        source: source || null,
        mappingVersion: MAPPING_VERSION,
        outcome: "noop",
        changedFieldNames: changedFields,
        invocationId: context?.invocationId || null
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
    };

    if (existingContactId) {
      // Row 3.7: the CentralReach read for the ID check is skipped only when the last status is
      // success and nothing changed. No update is sent then either.
      if (unchanged && String(hubspotProps.last_sync_status ?? "").trim() === "success") {
        return await finishUnchanged({ status: "success", reason: "" });
      }
      const existingCrEmployee = await fetchCrEmployeeById(existingContactId, { onCall });
      // Row 3.13: an update sends back what this read holds under `contact`. A read with no
      // `contact` object would leave every blank core field out, and a field that is left out
      // is cleared in CentralReach. So no update is sent: the answer cannot be read (Stage 2
      // decision 4: permanent, logged by field names and types).
      crContact = existingCrEmployee?.contact;
      if (!crContact || typeof crContact !== "object" || Array.isArray(crContact)) {
        throw unreadableAnswerError({
          code: "CR_EMPLOYEE_READ_FAILED",
          call: "GET /contacts/employee/{id}",
          status: null,
          expected: "the employee's core fields under contact",
          expectedFields: ["contact"],
          reasonField: "contact",
          answer: existingCrEmployee
        });
      }
      // BR16 (review finding 7): the update body is this read, so it must show this employee
      // (its contactId). Checked here, before the record is marked in progress below, so a read
      // that cannot be used leaves the saved hashes as they were.
      heldEmployeeContact(crContact, existingContactId);
      const preserved = preserveIdentifiers(mapped.employeePayload, existingCrEmployee);
      // Row 3.13: a blank core field the integration did not write carries the value this read
      // holds. A copy: the mapped payload that the stale check hashes is not changed.
      outboundPayload = keepUnwrittenCoreFields(preserved.payload, writtenBefore, crContact);
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
        return await decided({
          status: identity.status,
          reason: identity.reason,
          code: identityCode(identity.reason),
          fail: true,
          contactId: existingContactId
        });
      }
      // Row 3.7: the ID check ran; with no change only the status can differ.
      if (unchanged) {
        return await finishUnchanged({ status: identity.status, reason: identity.reason });
      }
      // Rule 5.7 (item 1, option (a)): a blank HubSpot date of birth sends back the date this
      // read holds. A read that cannot supply it is a failed read and no update is sent: a date
      // left out of the PUT is cleared, and an update never sends the placeholder.
      if (unusableHeldEmployeeDateOfBirth(mapped.employeePayload, crContact)) {
        throw unreadableAnswerError({
          code: "CR_EMPLOYEE_READ_FAILED",
          call: "GET /contacts/employee/{id}",
          status: null,
          expected: "the employee's date of birth under contact, blank or starting with YYYY-MM-DD",
          expectedFields: ["contact", "contact.dateOfBirth"],
          reasonField: "contact.dateOfBirth",
          answer: existingCrEmployee
        });
      }
      // BR16, the SSN guard: a core PUT sends the read's SSN back, so it runs only when that PUT
      // will be sent (a mapped key differs from the read), and before the in-progress save, so a
      // failure leaves the saved hashes as they were. A run that sends no core PUT goes on.
      if (!mappedKeysMatchRead(outboundPayload, crContact)) {
        checkHeldSsnSendable("employee", crContact);
      }
    }

    if (isBackupPathSource(source) && changedFields.length > 0) {
      // Row 3.9: field names only, never values.
      logger("warn", CHANGE_NOT_FROM_WEBHOOK, {
        workflow: "employeeSync",
        recordId: normalizedRecordId,
        employeeType: normalizedEmployeeType,
        source,
        changedFieldNames: changedFields,
        invocationId: context?.invocationId || null
      });
    }

    if (!syncResult) {
      // Row 2.4: in progress before the first CentralReach write of this run. The run's field
      // hashes are saved too: if it fails halfway, the next run still knows what may have
      // reached CentralReach (rule 5.8).
      await saveLinkFields({
        clean: false,
        ...inProgressFields(
          writtenFieldHashes(unfinishedFieldHashes, nextFieldHashes),
          existingContactId
        )
      });
      // BR16 (2026-11-24): the update body is this read with the mapped keys laid over it, and
      // no PUT is sent when CentralReach already holds every mapped value: the answer is still
      // an update, the summary's crCalls show no `update` call, and the run goes on to metadata
      // and labels as usual.
      syncResult = await upsertEmployee({
        payload: outboundPayload,
        heldContact: crContact,
        employeeType: normalizedEmployeeType,
        existingContactId,
        allowEmployeeCreate: Boolean(config.features?.allowEmployeeCreate),
        putOnlyMode: config.features?.putOnlyMode !== false,
        onCall
      });
      summary.setOperation(operationOf(syncResult));
      if (syncResult?.operation === "create_turned_off") {
        return await decided({
          status: "waiting",
          reason: syncResult.reason,
          code: DECIDED_CODES.EMPLOYEE_CREATE_TURNED_OFF,
          fail: false
        });
      }
      if (syncResult?.operation === "create_rejected") {
        return await decided({
          status: "error",
          reason: syncResult.reason,
          code: DECIDED_CODES.CR_CREATE_REJECTED,
          fail: true
        });
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
      const clearFieldIds = metadataClearFieldIds(writtenBefore, metadataForCompare);
      // Row 3.8: only the changed fields are sent; all of them when there is no saved copy or
      // the last run was not clean. Contract P.5 (e) in src/lib/centralReachClient.mjs.
      try {
        metadataSyncSummary = await pushMetadata(
          contactId,
          changedMetadata(
            metadataForCompare,
            lastRunClean ? previousFieldHashes : null,
            nextFieldHashes
          ),
          {
            labelIds,
            managedLabelIds: mapped.managedLabelIds ?? [],
            lastLabelPost: lastLabelPostFor(prior, contactId),
            contactCreatedThisRun: createdThisRun || labelsPending,
            clearFieldIds,
            ...labelReadBackOptions,
            onCall
          }
        );
        summary.setLabels(metadataSyncSummary?.labelResult);
      } catch (error) {
        // Row L.3: a label POST that failed with a timeout or a 5xx may still have been applied.
        // The sender attaches it to the error; it is saved, then the same error is rethrown. If
        // the save fails, that is logged and the label error still stands.
        // Row 3.20: a POST that was sent and not confirmed is still shown in the summary line.
        summary.setLabelsFromError(error);
        const failedPost = labelPostFromError(error);
        if (Object.keys(failedPost).length > 0) {
          try {
            await saveLinkFields(failedPost);
          } catch (stateError) {
            logger(
              "error",
              "Employee label POST could not be saved after a failed label step.",
              buildError({
                workflow: "employeeSync",
                stage: "saveLabelPostAfterFailure",
                error: stateError,
                recordId: normalizedRecordId
              })
            );
          }
        }
        throw error;
      }
      // Row L.3: a label POST is saved before anything else can end the run, also before the
      // throw for a failed metadata field.
      const labelChanges = labelFieldsAfterSend({
        labelResult: metadataSyncSummary?.labelResult,
        contactId,
        labelsPending: createdThisRun || labelsPending
      });
      if (Object.keys(labelChanges).length > 0) {
        await saveLinkFields(labelChanges);
      }
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
      if (metadataSyncSummary?.labelResult?.confirmed === false) {
        throw labelPostUnconfirmedError();
      }
    }

    const confirmedRecord = await fetchRecord();
    // Row 4.18: the confirm read is a HubSpot answer too. A missing key there is a failed read
    // (temporary): the writes are done, and the run is retried.
    if (missingMappedProperties(normalizedEmployeeType, confirmedRecord?.properties).length > 0) {
      throw new HubSpotReadError("employee");
    }
    const confirmedMapped = mapPayload({
      record: confirmedRecord,
      employeeType: normalizedEmployeeType,
      config
    });
    const confirmedHash = digestPayload(
      comparedStateOf(confirmedMapped, confirmedRecord?.properties || {})
    );
    if (confirmedHash !== payloadHash) {
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

    const writebackResult = await writeHubSpot(
      buildWritebackPropertyPatch({
        employeeType: normalizedEmployeeType,
        employeeIdProperty,
        payloadHash,
        status,
        contactId,
        errorMessage: syncResult.reason || ""
      })
    );

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
      ...NO_PENDING_CREATE,
      ...NO_IN_PROGRESS,
      clean: true
    });
    summary.setOutcome(status, status === "success" ? null : identityCode(syncResult.reason));
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
    // Item 20: no retry is left for this failure. The worker says so when all five are used; a
    // daily sweep message has one, except for the failures that keep the full schedule.
    const retriesUsedUp =
      Boolean(lastAttempt) ||
      (Number.isInteger(attempt) && isLastAttempt({ attempt, source, error }));
    summary.setOutcome(
      WAITING_CODES.has(error?.code) ? "waiting" : "error",
      reasonCodeOfError(error)
    );
    logger(
      permanent || retriesUsedUp ? "error" : "warn",
      "Employee sync workflow failed.",
      buildError({
        workflow: "employeeSync",
        stage: "runEmployeeSyncWorkflow",
        error,
        recordId: normalizedRecordId,
        extra: {
          employeeType: normalizedEmployeeType,
          failureKind,
          lastAttempt: retriesUsedUp,
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
      ...((permanent || retriesUsedUp) && !statusIsShown(shown, "error", errorReason)
        ? buildWritebackPropertyPatch({
            employeeType: normalizedEmployeeType,
            employeeIdProperty,
            status: "error",
            errorMessage: errorReason
          })
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
        summary.noteWriteback(errorPatch.last_sync_status);
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
          // An employee this run created or linked to its own create keeps its labelsPending
          // fields and loses its pending marker, also when the save right after the create was
          // the step that failed.
          await saveLinkFields({
            crContactId: linkedContactId,
            ...(ownCreateThisRun
              ? {
                  ...labelsPendingFields(linkedContactId),
                  inProgressContactId: linkedContactId,
                  ...NO_PENDING_CREATE
                }
              : {})
          });
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
    // Row 3.20: one summary line per run, on every outcome, once the run has ended.
    summary.log(logger);
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
