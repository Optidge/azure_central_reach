import {
  CASE_ENTRY_PROPERTY,
  CASE_EXCLUDED_STAGE_IDS,
  EMPLOYEE_ENTRY_PROPERTY,
  ENTRY_YES_VALUE,
  TEST_RECORD_PROPERTY
} from "../constants/hubspot.mjs";

const EXCLUDED_STAGES = new Set(CASE_EXCLUDED_STAGE_IDS);

export const SKIP_REASONS = Object.freeze({
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

function decide({ properties, linked, includeTestRecords, excludedStage, entryIsYes }) {
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
export function caseSyncEligibility({ properties, linked, includeTestRecords = false }) {
  return decide({
    properties,
    linked,
    includeTestRecords,
    excludedStage: EXCLUDED_STAGES.has(String(properties?.dealstage ?? "").trim()),
    entryIsYes: caseEntryIsYes(properties?.[CASE_ENTRY_PROPERTY])
  });
}

// Same rules for BCBA and BT/RBT. There is no stage exclusion for employees.
export function employeeSyncEligibility({ properties, linked, includeTestRecords = false }) {
  return decide({
    properties,
    linked,
    includeTestRecords,
    excludedStage: false,
    entryIsYes: employeeEntryIsYes(properties?.[EMPLOYEE_ENTRY_PROPERTY])
  });
}
