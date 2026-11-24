// Row 3.20 (BR15): one `Sync run summary.` log line per worker run, written once at the end of
// the run on every outcome, so a sandbox round can show exactly what a run did.
// The helper is neutral to the object type: the workflow name is a parameter. The Case worker
// uses it now; the BCBA run, the BT/RBT run and the Contact fan-out use it unchanged.
//
// USE
//   const summary = createSyncRunSummary({ workflow, recordId, portalId, source, invocationId, attempt });
//   options.onCall = summary.onCall;           // pass to the CentralReach client: it reports each
//                                              // HTTP request it sends, with { kind, status }
//   summary.addCrCall("lookup", 404);          // or add a call by hand
//   summary.setOperation("create");            // "create" | "update" | "none" (default "none").
//                                              // A create or update call sets it too; an explicit
//                                              // setOperation afterwards wins.
//   summary.setPortalId(id);                   // when the portal is only known after creation
//   summary.setLabelsFromError(error);         // an error that carries `labelPost`
//   summary.setChangedFieldNames(names);       // field names only
//   summary.setLabels(labelResult);            // the label sender's labelResult (contract P.5 (e))
//   summary.noteWriteback("success");          // after a HubSpot write that succeeded
//   summary.setQueued({ bcba: 2, btRbt: 1 });  // the fan-out only: messages queued per object type
//   summary.setGate("create");                 // a record_gate skip only: "create" | "update"
//   summary.setOutcome("success", null);       // "success" | "noop" | "waiting" | "error" | "skipped"
//   summary.log(logger);                       // logger defaults to safeLog; logs the first call only
//
// THE LINE: message `Sync run summary.`, level `info` (`warn` for outcome `error`), and exactly
// these keys:
//   workflow, recordId, portalId, source, invocationId, attempt
//                    the identity of the run; null when the run does not know it
//   outcome          success | noop | waiting | error | skipped. `noop` is a log value only; it is
//                    never written to HubSpot.
//   reasonCode       a short code (letters, digits, _ . : -), never a sentence; null when none
//   operation        create | update | none
//   changedFieldNames  the field names that changed
//   crCalls          [{ kind, status }] one entry per CentralReach call the run made. kind is
//                    lookup | create | update | metadata | labelRead | labelPost; status is the
//                    HTTP status of the answer, null when there was no answer. Never a body.
//                    Fed by centralReachClient.mjs through summary.onCall, so the list is the
//                    request log: one entry per HTTP request sent, in order, retries included,
//                    the label catalog read and the read-backs too; token requests are not listed.
//   labels           null, or { postedLabelIds, confirmed, skipWindowHeldBack }: the label IDs
//                    posted (null when no POST), whether the read-back confirmed them (true,
//                    false or null), and whether the 150-second window held the POST back
//   writeback        { written, status }: whether HubSpot was written in this run, and the last
//                    last_sync_status written (null when none)
//   queuedMessages   only when setQueued was called: { objectType: count }
//   gate             only when setGate was called (a record_gate skip, item 24): create | update,
//                    the path whose gate property was not true. Never the property's value.
// Only names, IDs, codes and counts go in the line, never a field value, a person's name, an
// email or a phone number. The helper accepts nothing else: a reason code that is not a code is
// replaced, and a call or a label entry is rebuilt from known keys.
import { safeLog } from "./safeLog.mjs";

export const SYNC_RUN_SUMMARY_MESSAGE = "Sync run summary.";

export const RUN_OUTCOMES = Object.freeze(["success", "noop", "waiting", "error", "skipped"]);
export const RUN_OPERATIONS = Object.freeze(["create", "update", "none"]);
export const RUN_GATES = Object.freeze(["create", "update"]);
export const CR_CALL_KINDS = Object.freeze([
  "lookup",
  "create",
  "update",
  "metadata",
  "labelRead",
  "labelPost"
]);

const REASON_CODE_SHAPE = /^[A-Za-z0-9_.:-]{1,80}$/;
export const INVALID_REASON_CODE = "INVALID_REASON_CODE";

function oneOf(list, value, what) {
  if (!list.includes(value)) {
    throw new Error(`Sync run summary: ${what} must be one of ${list.join(", ")}`);
  }
  return value;
}

function statusOrNull(status) {
  const number = Number(status);
  return status !== null && status !== undefined && Number.isInteger(number) ? number : null;
}

function wholeNumbers(list) {
  return (Array.isArray(list) ? list : [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

// The reason code of the line: a code as it is, anything else (a sentence, a value) replaced.
export function toReasonCode(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const code = String(value);
  return REASON_CODE_SHAPE.test(code) ? code : INVALID_REASON_CODE;
}

// The labels key, from the label sender's labelResult { operation, postedLabelIds, confirmed }.
export function labelsSummary(labelResult) {
  if (!labelResult || typeof labelResult !== "object") {
    return null;
  }
  const posted = Array.isArray(labelResult.postedLabelIds)
    ? wholeNumbers(labelResult.postedLabelIds)
    : null;
  return {
    postedLabelIds: posted,
    confirmed: typeof labelResult.confirmed === "boolean" ? labelResult.confirmed : null,
    skipWindowHeldBack: labelResult.operation === "skip_window"
  };
}

// A call of kind create or update sets the run's operation to what was sent, so a create that
// timed out or an update that was refused still shows the operation. An explicit setOperation
// (the final answer) wins and is not overwritten.
const OPERATION_OF_KIND = Object.freeze({ create: "create", update: "update" });

export function createSyncRunSummary({
  workflow,
  recordId,
  portalId,
  source,
  invocationId,
  attempt
}) {
  const identity = {
    workflow: workflow ?? null,
    recordId: recordId === undefined || recordId === null ? null : String(recordId),
    portalId: portalId === undefined || portalId === null ? null : String(portalId),
    source: source ?? null,
    invocationId: invocationId ?? null,
    attempt: Number.isInteger(attempt) ? attempt : null
  };
  const run = {
    outcome: null,
    reasonCode: null,
    operation: "none",
    changedFieldNames: [],
    crCalls: [],
    labels: null,
    writeback: { written: false, status: null },
    queued: null,
    gate: null
  };
  let logged = false;
  let operationExplicit = false;
  const pushCall = (kind, status) => {
    const checked = oneOf(CR_CALL_KINDS, kind, "call kind");
    run.crCalls.push({ kind: checked, status: statusOrNull(status) });
    if (!operationExplicit && OPERATION_OF_KIND[checked]) {
      run.operation = OPERATION_OF_KIND[checked];
    }
  };

  // The line's meta. A run that never set an outcome ends as an error.
  const build = () => ({
    ...identity,
    outcome: run.outcome ?? "error",
    reasonCode: run.outcome ? run.reasonCode : "OUTCOME_NOT_SET",
    operation: run.operation,
    changedFieldNames: [...run.changedFieldNames],
    crCalls: run.crCalls.map((call) => ({ ...call })),
    labels: run.labels ? { ...run.labels } : null,
    writeback: { ...run.writeback },
    ...(run.queued ? { queuedMessages: { ...run.queued } } : {}),
    ...(run.gate ? { gate: run.gate } : {})
  });

  return {
    setOutcome(outcome, reasonCode = null) {
      run.outcome = oneOf(RUN_OUTCOMES, outcome, "outcome");
      run.reasonCode = toReasonCode(reasonCode);
    },
    // The portal ID, when it is only known after the summary was created.
    setPortalId(portalId) {
      identity.portalId = portalId === undefined || portalId === null ? null : String(portalId);
    },
    setOperation(operation) {
      run.operation = oneOf(RUN_OPERATIONS, operation, "operation");
      operationExplicit = true;
    },
    setChangedFieldNames(names) {
      run.changedFieldNames = (Array.isArray(names) ? names : []).map((name) => String(name));
    },
    addCrCall(kind, status = null) {
      pushCall(kind, status);
    },
    // The observer for centralReachClient.mjs: pass `onCall: summary.onCall` in the options of
    // findClientByExternalSystemId, createOrUpdateClient and updateClientMetadata (and of the
    // employee functions). The client calls it once per HTTP request sent, with { kind, status }.
    onCall: ({ kind, status } = {}) => {
      pushCall(kind, status);
    },
    setLabels(labelResult) {
      run.labels = labelsSummary(labelResult);
    },
    // A thrown error that carries `labelPost` ({ contactId, labelIds, postedAt }): the POST may
    // have been applied, so its IDs are shown with confirmed null. Nothing else is read from it.
    setLabelsFromError(error) {
      if (error?.labelPost) {
        run.labels = labelsSummary({
          operation: "updated",
          postedLabelIds: error.labelPost.labelIds,
          confirmed: null
        });
      }
    },
    noteWriteback(status = null) {
      run.writeback = {
        written: true,
        status: status === null || status === undefined ? run.writeback.status : String(status)
      };
    },
    setQueued(countsByObjectType) {
      const counts = {};
      for (const [objectType, count] of Object.entries(countsByObjectType || {})) {
        counts[objectType] = Number.isInteger(count) ? count : 0;
      }
      run.queued = counts;
    },
    // The path of a record_gate skip (item 24). Throws for any other value, as setOperation.
    setGate(gate) {
      run.gate = oneOf(RUN_GATES, gate, "gate");
    },
    hasOutcome() {
      return run.outcome !== null;
    },
    build,
    // Logs the line once. A second call does nothing.
    log(logger = safeLog) {
      if (logged) {
        return false;
      }
      logged = true;
      const meta = build();
      logger(meta.outcome === "error" ? "warn" : "info", SYNC_RUN_SUMMARY_MESSAGE, meta);
      return true;
    }
  };
}

// The reason code of a failure that was thrown: its own code, else the HTTP status the provider
// answered, else a fixed word. Never the error message, which can hold a value.
export function reasonCodeOfError(error) {
  const code = error?.code;
  if (typeof code === "string" && REASON_CODE_SHAPE.test(code)) {
    return code;
  }
  if (typeof code === "number") {
    return `COSMOS_${code}`;
  }
  const status = Number(error?.response?.status);
  if (Number.isInteger(status) && status > 0) {
    return `${error?.provider === "hubspot" ? "HUBSPOT" : "CR"}_HTTP_${status}`;
  }
  return "UNCLASSIFIED";
}
