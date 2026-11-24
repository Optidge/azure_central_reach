import {
  CASE_ENTRY_PROPERTY,
  CASE_EXCLUDED_STAGE_IDS,
  EMPLOYEE_ENTRY_PROPERTY,
  ENTRY_YES_VALUE,
  TEST_RECORD_PROPERTY
} from "../constants/hubspot.mjs";

const EXCLUDED_STAGES = new Set(CASE_EXCLUDED_STAGE_IDS);

export const SKIP_REASONS = Object.freeze({
  RECORD_GATE: "record_gate",
  TEST_RECORD: "test_record",
  EXCLUDED_STAGE: "excluded_stage",
  ENTRY_NOT_YES: "entry_not_yes"
});

export function caseEntryIsYes(value) {
  return String(value ?? "")
    .split(";")
    .map((item) => item.trim())
    .includes(ENTRY_YES_VALUE);
}

export function employeeEntryIsYes(value) {
  return String(value ?? "").trim() === ENTRY_YES_VALUE;
}

export function isTestRecord(value) {
  return value === true || String(value ?? "").trim().toLowerCase() === "true";
}

// Item 24 (D18): the gate property of each path. A path setting that is not set falls back to
// the record gate, so with neither set (the sandbox) both paths read SYNC_RECORD_GATE_PROPERTY.
// The one place the fallback lives; both workers and the poller use it.
export function gateProperties(sync) {
  return {
    create: sync?.createGateProperty ?? sync?.recordGateProperty ?? null,
    update: sync?.updateGateProperty ?? sync?.recordGateProperty ?? null
  };
}

// The gate properties a worker must read: both paths', whichever path the record is on.
export function gatePropertyNames(gates) {
  return [...new Set([gates?.create, gates?.update].filter(Boolean))];
}

// The path follows the HubSpot CR ID, not the link record (D18 b): CR ID blank → create, filled →
// update. `linked` keeps its meaning for the entry rule.
function decide({
  properties,
  linked,
  hubspotHasCrId,
  includeTestRecords,
  excludedStage,
  entryIsYes,
  gates = null
}) {
  const path = hubspotHasCrId ? "update" : "create";
  const gateProperty = gates?.[path] || null;
  if (gateProperty && !isTestRecord(properties?.[gateProperty])) {
    return { eligible: false, reason: SKIP_REASONS.RECORD_GATE, gate: path };
  }
  if (!includeTestRecords && isTestRecord(properties?.[TEST_RECORD_PROPERTY])) {
    return { eligible: false, reason: SKIP_REASONS.TEST_RECORD };
  }
  if (excludedStage) {
    return { eligible: false, reason: SKIP_REASONS.EXCLUDED_STAGE };
  }
  if (!linked && !entryIsYes) {
    return { eligible: false, reason: SKIP_REASONS.ENTRY_NOT_YES };
  }
  return { eligible: true, reason: null };
}

// Requirement 1: create only when the entry property is Yes and no CR record is linked.
// Requirement 2: a linked Case keeps syncing whatever the entry value is.
export function caseSyncEligibility({
  properties,
  linked,
  hubspotHasCrId = false,
  includeTestRecords = false,
  gates = null
}) {
  return decide({
    properties,
    linked,
    hubspotHasCrId,
    includeTestRecords,
    gates,
    excludedStage: EXCLUDED_STAGES.has(String(properties?.dealstage ?? "").trim()),
    entryIsYes: caseEntryIsYes(properties?.[CASE_ENTRY_PROPERTY])
  });
}

// Same rules for BCBA and BT/RBT. There is no stage exclusion for employees.
export function employeeSyncEligibility({
  properties,
  linked,
  hubspotHasCrId = false,
  includeTestRecords = false,
  gates = null
}) {
  return decide({
    properties,
    linked,
    hubspotHasCrId,
    includeTestRecords,
    gates,
    excludedStage: false,
    entryIsYes: employeeEntryIsYes(properties?.[EMPLOYEE_ENTRY_PROPERTY])
  });
}
