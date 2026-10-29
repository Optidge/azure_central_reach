import { readProperty } from "./fieldRead.mjs";

export const RECORD_KINDS = Object.freeze([
  "untickedUnlinked",
  "tickedNeverProcessed",
  "linkedQuiet",
  "errorUnlinked",
  "errorLinked",
  "closedWithoutId",
  "blocked"
]);

export const NEVER_PROCESSED_SOURCE = "neverProcessedSweep";

const CHECKBOX_YES_TOKEN = "Yes";

/**
 * @typedef {{
 *   object: "case" | "employee",
 *   checkboxProperty: "enter_in_central_reach" | "entered_in_centralreach",
 *   centralReachIdProperty: string,
 *   allowsBlocked: boolean
 * }} Binding
 */

/** @returns {Binding} */
export function caseBinding(centralReachIdProperty = "client_id_number") {
  return {
    object: "case",
    checkboxProperty: "enter_in_central_reach",
    centralReachIdProperty,
    allowsBlocked: false
  };
}

/** @returns {Binding} */
export function employeeBinding(centralReachIdProperty = "employee_id") {
  return {
    object: "employee",
    checkboxProperty: "entered_in_centralreach",
    centralReachIdProperty,
    allowsBlocked: true
  };
}

/** "Yes - Generic" is not Yes. A multi-checkbox value with the part Yes is Yes. */
export function checkboxIsYes(value) {
  return String(value ?? "")
    .split(";")
    .map((part) => part.trim())
    .includes(CHECKBOX_YES_TOKEN);
}

function presentValue(properties, name) {
  const field = readProperty(properties, name);
  return field.kind === "present" ? field.value.trim() : null;
}

function parseEpochMs(value) {
  if (value === null) {
    return null;
  }
  const asNumber = /^\d+$/.test(value) ? Number(value) : new Date(value).getTime();
  return Number.isFinite(asNumber) ? asNumber : null;
}

/**
 * @typedef {{
 *   object: "case" | "employee",
 *   recordId: string,
 *   checkboxYes: boolean,
 *   centralReachId: string | null,
 *   lastSyncAt: string | null,
 *   lastSyncStatus: string | null,
 *   modifiedAtMs: number | null,
 *   allowsBlocked: boolean
 * }} Snapshot
 */

/** @returns {Snapshot} */
export function parseSnapshot(properties, binding, recordId) {
  return {
    object: binding.object,
    recordId: String(recordId),
    checkboxYes: checkboxIsYes(presentValue(properties, binding.checkboxProperty)),
    centralReachId: presentValue(properties, binding.centralReachIdProperty),
    lastSyncAt: presentValue(properties, "last_sync_at"),
    lastSyncStatus: presentValue(properties, "last_sync_status"),
    modifiedAtMs: parseEpochMs(presentValue(properties, "hs_lastmodifieddate")),
    allowsBlocked: binding.allowsBlocked
  };
}

const STATE_TABLE = [
  {
    kind: "errorLinked",
    matches: (s) => Boolean(s.centralReachId) && s.lastSyncStatus === "error"
  },
  { kind: "linkedQuiet", matches: (s) => Boolean(s.centralReachId) },
  {
    kind: "blocked",
    matches: (s) => s.allowsBlocked && s.lastSyncStatus === "blocked" && Boolean(s.lastSyncAt)
  },
  {
    kind: "errorUnlinked",
    matches: (s) => s.lastSyncStatus === "error" && Boolean(s.lastSyncAt)
  },
  { kind: "tickedNeverProcessed", matches: (s) => s.checkboxYes && !s.lastSyncAt },
  { kind: "closedWithoutId", matches: (s) => s.checkboxYes && Boolean(s.lastSyncAt) },
  { kind: "untickedUnlinked", matches: () => true }
];

/**
 * First matching row wins. Rows after linkedQuiet only see an empty id.
 * closedWithoutId needs no status check because the error and blocked rows
 * with last_sync_at set already matched above it.
 */
export function deriveRecordState(snapshot) {
  const row = STATE_TABLE.find((candidate) => candidate.matches(snapshot));
  return {
    kind: row.kind,
    object: snapshot.object,
    checkboxYes: snapshot.checkboxYes,
    centralReachId: snapshot.centralReachId,
    lastSyncAt: snapshot.lastSyncAt,
    lastSyncStatus: snapshot.lastSyncStatus,
    modifiedAtMs: snapshot.modifiedAtMs
  };
}

/** The only skip. A linked record with the box unticked still syncs. */
export function workerGate(state) {
  if (state.centralReachId || state.checkboxYes) {
    return { action: "sync" };
  }
  return { action: "skip", reason: "no-id-and-box-not-yes" };
}

/** Live timer gate is AzureWebJobs.intakePoller.Disabled, not an argument here. */
export function sweepDecision(state, { now, createSweepEnabled, graceMinutes }) {
  if (!createSweepEnabled) {
    return { enqueue: false, reason: "create-sweep-disabled" };
  }
  if (state.kind !== "tickedNeverProcessed") {
    return { enqueue: false, reason: `kind-${state.kind}` };
  }
  if (typeof state.modifiedAtMs !== "number") {
    return { enqueue: false, reason: "modified-date-unknown" };
  }
  if (now - state.modifiedAtMs < graceMinutes * 60 * 1000) {
    return { enqueue: false, reason: "inside-grace" };
  }
  return { enqueue: true, reason: "ticked-never-processed" };
}
