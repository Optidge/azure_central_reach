// Row 3.20 (BR15), Case worker: one `Sync run summary.` line per run, written once at the end on
// every outcome, with only names, IDs, codes and counts in it. Also the shared helper
// src/lib/syncRunSummary.mjs that the BCBA run, the BT/RBT run and the Contact fan-out reuse.
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CR_CALL_KINDS,
  INVALID_REASON_CODE,
  RUN_GATES,
  RUN_OUTCOMES,
  SYNC_RUN_SUMMARY_MESSAGE,
  createSyncRunSummary,
  labelsSummary,
  reasonCodeOfError,
  toReasonCode
} from "../../lib/syncRunSummary.mjs";
import { CASE_EXCLUDED_STAGE_IDS } from "../../constants/hubspot.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { caseDeps, caseStaff, logged, refused, roleRow, ROLE_TYPE } from "./laneDFakes.mjs";
import { safeLog } from "../../lib/safeLog.mjs";
import { httpError, timeoutError, workflowConfig } from "./stage2Fakes.mjs";
import {
  fakeLabelSender,
  linkedCase,
  setup,
  stage3Case,
  testClock
} from "./stage3WorkerFakes.mjs";

const SUMMARY_KEYS = [
  "attempt",
  "changedFieldNames",
  "crCalls",
  "invocationId",
  "labels",
  "operation",
  "outcome",
  "portalId",
  "reasonCode",
  "recordId",
  "source",
  "workflow",
  "writeback"
];

// Values nobody could mistake for a field name, an ID or a code. None may reach the log line.
const DISTINCT = Object.freeze({
  firstName: "Zorblaxen",
  lastName: "Quenbyworth",
  email: "zorblaxen.quenby@example.com",
  phone: "5185550142",
  street: "742 Evergreen Terrace",
  guardian: "Mortimer",
  policyHolder: "Wilhelmina Fitzgibbon",
  careCoordinatorFirst: "Ottoline",
  careCoordinatorLast: "Brightwater",
  careCoordinatorEmail: "ottoline.bright@coordinator.example",
  staff: "Peregrine Thistlewood"
});

function distinctiveCase(properties = {}) {
  return {
    phi_first_name__cloned_: DISTINCT.firstName,
    phi_last_name: DISTINCT.lastName,
    email: DISTINCT.email,
    phone: DISTINCT.phone,
    street_address: DISTINCT.street,
    guardian_first_name: DISTINCT.guardian,
    policy_holder_name: DISTINCT.policyHolder,
    care_coordinator_first_name: DISTINCT.careCoordinatorFirst,
    care_coordinator_last_name: DISTINCT.careCoordinatorLast,
    care_coordinator_email: DISTINCT.careCoordinatorEmail,
    coordinator_export_status: "ready",
    severity_level_clinical: "Level 2",
    ...properties
  };
}

function staffWithDistinctNames() {
  return caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia)],
    names: { 301: { first_name: DISTINCT.staff, last_name: "Haverford" } }
  });
}

function summariesOf(logs) {
  return logged(logs, SYNC_RUN_SUMMARY_MESSAGE);
}

function onlySummary(logs) {
  const lines = summariesOf(logs);
  assert.equal(lines.length, 1, "exactly one summary line per run");
  return lines[0];
}

function input(overrides = {}) {
  return {
    dealId: "deal-1",
    source: "hubspotWorkflow",
    context: { invocationId: "inv-77" },
    attempt: 2,
    ...overrides
  };
}

function callsOf(line, kind) {
  return line.meta.crCalls.filter((call) => call.kind === kind);
}

// The fake CentralReach's request log, as the summary should list it: one entry per HTTP request,
// in order. The fake does not log token requests. `statuses` gives the status of the calls that
// did not answer 200, by position in the log.
const KIND_BY_ROUTE = {
  "GET /contacts/client/byExternalSystemId": "lookup",
  // Item B21: the client read before every update.
  "GET /contacts/client/{id}": "lookup",
  "POST /contacts/client": "create",
  "PUT /contacts/client/{id}": "update",
  "GET /contacts/{id}/labels": "labelRead",
  "GET /contacts/labels": "labelRead",
  "POST /contacts/{id}/labels": "labelPost",
  "PUT /contacts/{id}/metadata/{fieldId}": "metadata",
  "DELETE /contacts/{id}/metadata/{fieldId}": "metadata"
};

function requestLogAsCalls(cr, statuses = {}) {
  return cr.calls.map((call, index) => {
    assert.ok(KIND_BY_ROUTE[call.name], `the route ${call.name} has a kind`);
    return { kind: KIND_BY_ROUTE[call.name], status: statuses[index] ?? 200 };
  });
}

// --- the line on each outcome ---

test("[BR15][3.20] success on a create: one line with the exact keys, the lookup, the create, the label POST and one metadata entry per field written", async () => {
  const { cr } = setup();
  const record = stage3Case(distinctiveCase());
  const logs = [];
  const result = await runClientSyncWorkflow(
    input(),
    caseDeps({ record, logs, staff: staffWithDistinctNames() })
  );
  assert.equal(result.status, "success");
  assert.equal(result.operation, "create");

  const line = onlySummary(logs);
  assert.equal(line.level, "info");
  assert.deepEqual(Object.keys(line.meta).sort(), SUMMARY_KEYS);
  assert.equal(line.meta.workflow, "clientSync");
  assert.equal(line.meta.recordId, "deal-1");
  assert.equal(line.meta.portalId, "52311591");
  assert.equal(line.meta.source, "hubspotWorkflow");
  assert.equal(line.meta.invocationId, "inv-77");
  assert.equal(line.meta.attempt, 2);
  assert.equal(line.meta.outcome, "success");
  assert.equal(line.meta.reasonCode, null);
  assert.equal(line.meta.operation, "create");
  assert.equal(line.meta.changedFieldNames.length > 0, true);
  assert.equal(line.meta.changedFieldNames.every((name) => typeof name === "string"), true);

  // The list is the fake CentralReach's request log, in order: the lookup (404, not found), the
  // create, the label read, the catalog read, the label POST, its read-back, then the fields.
  assert.deepEqual(line.meta.crCalls, requestLogAsCalls(cr, { 0: 404 }));
  assert.deepEqual(
    line.meta.crCalls.slice(0, 2),
    [
      { kind: "lookup", status: 404 },
      { kind: "create", status: 200 }
    ]
  );
  assert.equal(callsOf(line, "labelPost").length, 1);
  assert.equal(callsOf(line, "labelRead").length >= 3, true);
  assert.equal(callsOf(line, "metadata").length > 0, true);
  assert.deepEqual(line.meta.writeback, { written: true, status: "success" });
  assert.equal(line.meta.labels.confirmed, true);
  assert.equal(line.meta.labels.skipWindowHeldBack, false);
  assert.deepEqual(line.meta.labels.postedLabelIds.every(Number.isInteger), true);
});

test("[BR15][3.20] the line carries only names, IDs, codes and counts: no field value, person name, email or phone from the record, the staff or the Care Coordinator", async () => {
  const { cr } = setup();
  const record = stage3Case(distinctiveCase());
  const logs = [];
  await runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() }));

  // The values did go to CentralReach and the staff and Care Coordinator names were read, so the
  // test means something: they are in the requests, and not in the line.
  const requests = JSON.stringify(cr.calls);
  for (const value of [DISTINCT.firstName, DISTINCT.email, DISTINCT.street, DISTINCT.staff, DISTINCT.careCoordinatorEmail]) {
    assert.equal(requests.includes(value), true, value);
  }
  const line = JSON.stringify(onlySummary(logs).meta);
  for (const value of Object.values(DISTINCT)) {
    assert.equal(line.includes(value), false, value);
  }
  assert.equal(line.includes("Haverford"), false);
});

test("[BR15][3.20] success on an update of a linked Case: crCalls equals the request log, lookup 200, the client read (B21), then update", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const logs = [];
  await runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() }));

  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "success");
  assert.equal(line.meta.operation, "update");
  assert.deepEqual(line.meta.crCalls, requestLogAsCalls(cr));
  assert.deepEqual(line.meta.crCalls.slice(0, 3), [
    { kind: "lookup", status: 200 },
    { kind: "lookup", status: 200 },
    { kind: "update", status: 200 }
  ]);
});

test("[BR15][3.20] a call retried inside the client is listed once per HTTP request, with each status", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  // The first metadata PUT answers 503 and the client's own retry sends it again.
  cr.fail("PUT /contacts/{id}/metadata/{fieldId}", httpError(503), { times: 1 });
  const logs = [];
  const result = await runClientSyncWorkflow(
    input(),
    caseDeps({ record, logs, staff: staffWithDistinctNames() })
  );
  assert.equal(result.status, "success");

  const line = onlySummary(logs);
  const firstPut = cr.calls.findIndex((call) => call.name === "PUT /contacts/{id}/metadata/{fieldId}");
  assert.deepEqual(line.meta.crCalls, requestLogAsCalls(cr, { [firstPut]: 503 }));
  assert.deepEqual(
    line.meta.crCalls.slice(firstPut, firstPut + 2),
    [
      { kind: "metadata", status: 503 },
      { kind: "metadata", status: 200 }
    ]
  );
});

test("[BR15][3.20] a label POST that the read-back confirms: the POST and each read-back are listed, in order, with the catalog read before the POST", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const logs = [];
  await runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() }));
  const line = onlySummary(logs);

  const kinds = line.meta.crCalls.map((call) => call.kind);
  const post = kinds.indexOf("labelPost");
  assert.equal(post > 0, true);
  // lookup, client read (B21), update, label read, catalog read, POST, read-back
  assert.deepEqual(kinds.slice(0, post + 2), [
    "lookup",
    "lookup",
    "update",
    "labelRead",
    "labelRead",
    "labelPost",
    "labelRead"
  ]);
  assert.deepEqual(line.meta.crCalls, requestLogAsCalls(cr));
  assert.deepEqual(line.meta.labels.postedLabelIds.length > 0, true);
  assert.equal(line.meta.labels.confirmed, true);
});

test("[BR15][3.20] a failed update after a found lookup is listed as update with its status, never as create", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  cr.fail("PUT /contacts/client/{id}", httpError(400));
  const logs = [];
  await runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() }));
  const line = onlySummary(logs);
  assert.deepEqual(line.meta.crCalls, requestLogAsCalls(cr, { 2: 400 }));
  assert.deepEqual(line.meta.crCalls, [
    { kind: "lookup", status: 200 },
    { kind: "lookup", status: 200 },
    { kind: "update", status: 400 }
  ]);
});

test("[BR15][3.20] a failed create after a lookup that found nothing: lookup 404 then create with its status", async () => {
  const { cr } = setup();
  const record = stage3Case(distinctiveCase());
  cr.fail("POST /contacts/client", httpError(400));
  const logs = [];
  await runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() }));
  const line = onlySummary(logs);
  assert.deepEqual(line.meta.crCalls, [
    { kind: "lookup", status: 404 },
    { kind: "create", status: 400 }
  ]);
});

test("[BR15][3.20] a create that timed out has no answer: its entry has status null", async () => {
  const { cr } = setup();
  const record = stage3Case(distinctiveCase());
  cr.fail("POST /contacts/client", timeoutError());
  const logs = [];
  await assert.rejects(
    runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() }))
  );
  assert.deepEqual(onlySummary(logs).meta.crCalls, [
    { kind: "lookup", status: 404 },
    { kind: "create", status: null }
  ]);
});

test("[BR15][3.20] the client behaves the same with no observer: the same requests and the same answer", async () => {
  const run = async (withObserver) => {
    const { cr } = setup();
    const record = linkedCase(cr, distinctiveCase());
    const logs = [];
    const deps = caseDeps({ record, logs, staff: staffWithDistinctNames() });
    if (!withObserver) {
      // Drop the observer: the worker's calls to the client go through without it.
      const wrap = (fn) => (...args) => {
        const last = args.at(-1);
        if (last && typeof last === "object" && "onCall" in last) {
          const { onCall, ...rest } = last;
          return fn(...args.slice(0, -1), rest);
        }
        return fn(...args);
      };
      const real = await import("../../lib/centralReachClient.mjs");
      deps.findClientByExternalSystemId = wrap(real.findClientByExternalSystemId);
      deps.createOrUpdateClient = wrap(real.createOrUpdateClient);
      deps.updateClientMetadata = wrap(real.updateClientMetadata);
    }
    const result = await runClientSyncWorkflow(input(), deps);
    return { result, requests: cr.calls.map((call) => `${call.name} ${JSON.stringify(call.body ?? null)}`) };
  };
  const observed = await run(true);
  const plain = await run(false);
  assert.deepEqual(plain.requests, observed.requests);
  assert.equal(plain.result.status, observed.result.status);
});

test("[BR15][3.20] a failing observer never changes what the client does", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const real = await import("../../lib/centralReachClient.mjs");
  const deps = caseDeps({
    record,
    staff: staffWithDistinctNames(),
    findClientByExternalSystemId: (id, options) =>
      real.findClientByExternalSystemId(id, { ...options, onCall: () => { throw new Error("observer broke"); } })
  });
  const result = await runClientSyncWorkflow(input(), deps);
  assert.equal(result.status, "success");
  assert.equal(cr.count("PUT /contacts/client/{id}"), 1);
});

test("[BR15][3.20] the observer gets only a kind and a status: no URL, body or header", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const real = await import("../../lib/centralReachClient.mjs");
  const seen = [];
  await real.createOrUpdateClient({
    payload: { ExternalSystemId: "deal-1", FirstName: DISTINCT.firstName },
    existingContactId: "2001",
    onCall: (call) => seen.push(call)
  });
  assert.deepEqual(seen, [
    { kind: "lookup", status: 200 },
    { kind: "update", status: 200 }
  ]);
  assert.equal(JSON.stringify(seen).includes(DISTINCT.firstName), false);
  assert.equal(record !== null, true);
});

test("[BR15][3.20] noop: the outcome is noop, the operation is none, no CentralReach call, and noop is never written to HubSpot", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const first = [];
  await runClientSyncWorkflow(input(), caseDeps({ record, logs: first, staff: staffWithDistinctNames() }));
  assert.equal(record.properties.last_sync_status, "success");

  const logs = [];
  const writesBefore = record.writes.length;
  const result = await runClientSyncWorkflow(
    input(),
    caseDeps({ record, logs, staff: staffWithDistinctNames() })
  );
  assert.equal(result.status, "noop");

  const line = onlySummary(logs);
  assert.deepEqual(Object.keys(line.meta).sort(), SUMMARY_KEYS);
  assert.equal(line.meta.outcome, "noop");
  assert.equal(line.meta.operation, "none");
  assert.deepEqual(line.meta.crCalls, []);
  assert.deepEqual(line.meta.changedFieldNames, []);
  assert.equal(line.meta.labels, null);
  assert.deepEqual(line.meta.writeback, { written: false, status: null });
  // HubSpot shows `success` already: nothing is written, and never the word noop.
  assert.equal(record.writes.length, writesBefore);
  assert.equal(record.properties.last_sync_status, "success");
  assert.equal(JSON.stringify(record.writes).includes("noop"), false);
});

test("[BR15][3.20] noop that still has to write the CR ID back reports the write", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  await runClientSyncWorkflow(input(), caseDeps({ record, staff: staffWithDistinctNames() }));
  // HubSpot lost its status: the no-op run writes `success` again, and says so.
  record.properties.last_sync_status = "";
  const logs = [];
  const result = await runClientSyncWorkflow(
    input(),
    caseDeps({ record, logs, staff: staffWithDistinctNames() })
  );
  assert.equal(result.status, "noop");
  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "noop");
  assert.deepEqual(line.meta.writeback, { written: true, status: "success" });
});

test("[BR15][3.20] skipped: the gate decides, the reason code is the skip reason, no CentralReach call and no HubSpot write", async () => {
  const { cr } = setup();
  const record = stage3Case({ enter_in_central_reach: "" });
  const logs = [];
  const result = await runClientSyncWorkflow(input(), caseDeps({ record, logs }));
  assert.equal(result.status, "skipped");

  const line = onlySummary(logs);
  assert.deepEqual(Object.keys(line.meta).sort(), SUMMARY_KEYS);
  assert.equal(line.meta.outcome, "skipped");
  assert.equal(line.meta.reasonCode, "entry_not_yes");
  assert.equal(line.meta.operation, "none");
  assert.deepEqual(line.meta.crCalls, []);
  assert.deepEqual(line.meta.writeback, { written: false, status: null });
  assert.deepEqual(cr.calls, []);
  assert.deepEqual(record.writes, []);
});

// Item 24: two gate properties, one per path (production's settings, D18 d).
const CREATES = "centralreach_creates_only";
const UPDATES = "centralreach_updates_only";
const TWO_GATES = { recordGateProperty: null, createGateProperty: CREATES, updateGateProperty: UPDATES };

test("[BR15][3.20] a record_gate skip line has exactly the keys plus gate, the path whose box was not true", async () => {
  for (const [linked, gate] of [[false, "create"], [true, "update"]]) {
    const { cr } = setup();
    const record = linked
      ? linkedCase(cr, { [CREATES]: "true", [UPDATES]: null })
      : stage3Case({ [CREATES]: null, [UPDATES]: "true" });
    const logs = [];
    const config = workflowConfig({ sync: TWO_GATES });
    const result = await runClientSyncWorkflow(input(), caseDeps({ record, logs, getConfig: () => config }));
    assert.equal(result.reason, "record_gate", gate);

    const line = onlySummary(logs);
    assert.deepEqual(Object.keys(line.meta).sort(), [...SUMMARY_KEYS, "gate"].sort(), gate);
    assert.equal(line.meta.outcome, "skipped");
    assert.equal(line.meta.reasonCode, "record_gate");
    assert.equal(line.meta.gate, gate);
    assert.deepEqual(cr.calls, []);
  }
});

test("[BR15][3.20] a test_record skip with two gates set logs exactly the keys, with no gate key", async () => {
  setup();
  const record = stage3Case({ test_record: "true", [CREATES]: "true", [UPDATES]: "true" });
  const logs = [];
  const config = workflowConfig({ sync: TWO_GATES });
  const result = await runClientSyncWorkflow(input(), caseDeps({ record, logs, getConfig: () => config }));
  assert.equal(result.reason, "test_record");

  const line = onlySummary(logs);
  assert.deepEqual(Object.keys(line.meta).sort(), SUMMARY_KEYS);
  assert.equal(line.meta.reasonCode, "test_record");
});

test("[BR15][3.20] an excluded_stage skip logs exactly the keys, with no gate key and no CentralReach call", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, {
    dealstage: CASE_EXCLUDED_STAGE_IDS[0],
    [CREATES]: "true",
    [UPDATES]: "true"
  });
  const logs = [];
  const config = workflowConfig({ sync: TWO_GATES });
  const result = await runClientSyncWorkflow(input(), caseDeps({ record, logs, getConfig: () => config }));
  assert.equal(result.reason, "excluded_stage");

  const line = onlySummary(logs);
  assert.deepEqual(Object.keys(line.meta).sort(), SUMMARY_KEYS);
  assert.equal(line.meta.outcome, "skipped");
  assert.equal(line.meta.reasonCode, "excluded_stage");
  assert.deepEqual(cr.calls, []);
});

test("[BR15][3.20] error decided by the worker (an unreadable date): outcome error, a reason code, no CentralReach call, the error status written", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase({ ongoing_auth_period_start_date: "2026-02-30" }));
  const logs = [];
  const result = await runClientSyncWorkflow(
    input(),
    caseDeps({ record, logs, staff: staffWithDistinctNames() })
  );
  assert.equal(result.status, "error");

  const line = onlySummary(logs);
  assert.deepEqual(Object.keys(line.meta).sort(), SUMMARY_KEYS);
  assert.equal(line.level, "warn");
  assert.equal(line.meta.outcome, "error");
  assert.equal(line.meta.reasonCode, "UNREADABLE_DATE");
  assert.equal(line.meta.operation, "none");
  assert.deepEqual(line.meta.crCalls, []);
  assert.deepEqual(line.meta.writeback, { written: true, status: "error" });
  assert.equal(JSON.stringify(line.meta).includes("2026-02-30"), false);
});

test("[BR15][3.20] error from a CentralReach rejection (400): the failed call is in crCalls with its HTTP status, the operation is update", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  cr.fail("PUT /contacts/client/{id}", httpError(400));
  const logs = [];
  const result = await runClientSyncWorkflow(
    input(),
    caseDeps({ record, logs, staff: staffWithDistinctNames() })
  );
  assert.equal(result.status, "error");

  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "error");
  assert.equal(line.meta.reasonCode, "CR_HTTP_400");
  assert.deepEqual(line.meta.crCalls, [
    { kind: "lookup", status: 200 },
    { kind: "lookup", status: 200 },
    { kind: "update", status: 400 }
  ]);
  assert.deepEqual(line.meta.writeback, { written: true, status: "error" });
});

test("[BR15][3.20] a temporary failure that is retried (a refused HubSpot read) logs one error line, then the error is thrown as before", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const logs = [];
  await assert.rejects(
    runClientSyncWorkflow(
      input(),
      caseDeps({
        record,
        logs,
        staff: staffWithDistinctNames(),
        listAssociations: async () => {
          throw refused(403);
        }
      })
    ),
    (error) => error.code === "HUBSPOT_READ_FAILED"
  );

  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "error");
  assert.equal(line.meta.reasonCode, "HUBSPOT_READ_FAILED");
  assert.deepEqual(line.meta.crCalls, []);
  // A retried failure writes no status: HubSpot keeps its last one until the last attempt.
  assert.deepEqual(line.meta.writeback, { written: false, status: null });
  assert.deepEqual(cr.writes(), []);
});

test("[BR15][3.20] the last attempt writes the error and its line says so", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const logs = [];
  await assert.rejects(
    runClientSyncWorkflow(
      input({ lastAttempt: true, attempt: 5 }),
      caseDeps({
        record,
        logs,
        staff: staffWithDistinctNames(),
        listAssociations: async () => {
          throw refused(403);
        }
      })
    )
  );
  const line = onlySummary(logs);
  assert.equal(line.meta.attempt, 5);
  assert.equal(line.meta.outcome, "error");
  assert.deepEqual(line.meta.writeback, { written: true, status: "error" });
  assert.equal(cr.writes().length, 0);
});

test("[BR15][3.20] waiting: a create sent a minute ago and not shown yet is held, not an error; the unknown create before it is an error line with the create in crCalls", async () => {
  const { cr } = setup();
  const clock = testClock();
  const record = stage3Case(distinctiveCase());
  const base = () => ({ ...caseDeps({ record, staff: staffWithDistinctNames() }), now: clock.now });

  // The create is sent and its answer never arrives.
  cr.fail("POST /contacts/client", timeoutError());
  const firstLogs = [];
  await assert.rejects(
    runClientSyncWorkflow(input(), { ...base(), safeLog: (level, message, meta) => firstLogs.push({ level, message, meta }) }),
    (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN"
  );
  const first = onlySummary(firstLogs);
  assert.equal(first.meta.outcome, "error");
  assert.equal(first.meta.reasonCode, "CR_CREATE_OUTCOME_UNKNOWN");
  assert.deepEqual(first.meta.crCalls, [
    { kind: "lookup", status: 404 },
    { kind: "create", status: null }
  ]);

  clock.advanceSeconds(60);
  const logs = [];
  await assert.rejects(
    runClientSyncWorkflow(input(), { ...base(), safeLog: (level, message, meta) => logs.push({ level, message, meta }) }),
    (error) => error.code === "CR_CREATE_PENDING"
  );
  const line = onlySummary(logs);
  assert.equal(line.level, "info");
  assert.equal(line.meta.outcome, "waiting");
  assert.equal(line.meta.reasonCode, "CR_CREATE_PENDING");
  assert.deepEqual(line.meta.crCalls, [{ kind: "lookup", status: 404 }]);
  assert.deepEqual(line.meta.writeback, { written: false, status: null });
});

test("[BR15][3.20] waiting: another run holds the record", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const logs = [];
  await assert.rejects(
    runClientSyncWorkflow(input(), caseDeps({ record, logs, acquireLease: async () => null })),
    (error) => error.code === "SYNC_IN_PROGRESS"
  );
  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "waiting");
  assert.equal(line.meta.reasonCode, "SYNC_IN_PROGRESS");
  assert.deepEqual(cr.calls, []);
});

test("[BR15][3.20] labels: a skip_window that held the POST back is shown, with the read-back result and no posted IDs", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const sender = fakeLabelSender([
    { operation: "skip_window", postedLabelIds: null, postedAt: null, confirmed: true }
  ]);
  const logs = [];
  await runClientSyncWorkflow(
    input(),
    caseDeps({ record, logs, staff: staffWithDistinctNames(), updateClientMetadata: sender.updateClientMetadata })
  );
  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "success");
  assert.deepEqual(line.meta.labels, {
    postedLabelIds: null,
    confirmed: true,
    skipWindowHeldBack: true
  });
  // The sender is faked here, so it reports no call; the labels key comes from its answer.
  assert.deepEqual(line.meta.crCalls.filter((call) => call.kind === "labelPost"), []);
});

test("[BR15][3.20] labels: a POST the read-back did not confirm ends the run as error and the line shows the posted IDs and confirmed false", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const sender = fakeLabelSender([
    { operation: "updated", postedLabelIds: [1052618, 1052643], postedAt: "2026-11-20T15:00:00.000Z", confirmed: false }
  ]);
  const logs = [];
  await assert.rejects(
    runClientSyncWorkflow(
      input(),
      caseDeps({ record, logs, staff: staffWithDistinctNames(), updateClientMetadata: sender.updateClientMetadata })
    ),
    (error) => error.code === "CR_LABEL_POST_UNCONFIRMED"
  );
  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "error");
  assert.equal(line.meta.reasonCode, "CR_LABEL_POST_UNCONFIRMED");
  assert.deepEqual(line.meta.labels, {
    postedLabelIds: [1052618, 1052643],
    confirmed: false,
    skipWindowHeldBack: false
  });
});

test("[BR15][3.20] a label POST that fails with a 500 is listed as labelPost with status 500, and the run ends as error with no field written", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  cr.fail("POST /contacts/{id}/labels", httpError(500));
  const logs = [];
  await assert.rejects(
    runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() }))
  );
  const line = onlySummary(logs);
  assert.equal(line.meta.reasonCode, "CR_HTTP_500");
  const post = cr.calls.findIndex((call) => call.name === "POST /contacts/{id}/labels");
  assert.deepEqual(line.meta.crCalls, requestLogAsCalls(cr, { [post]: 500 }));
  assert.deepEqual(callsOf(line, "labelPost"), [{ kind: "labelPost", status: 500 }]);
  assert.equal(callsOf(line, "metadata").length, 0);
});

test("[BR15][3.20] a run that fails after the CentralReach writes still logs one line, with the calls made so far", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  const logs = [];
  // The Case changes between the first read and the confirm read: SYNC_STALE after the writes.
  let reads = 0;
  await assert.rejects(
    runClientSyncWorkflow(
      input(),
      caseDeps({
        record,
        logs,
        staff: staffWithDistinctNames(),
        getDealById: async (_id, requested) => {
          reads += 1;
          const answer = record.read();
          if (reads === 2) {
            answer.properties.severity_level_clinical = "Level 3";
          }
          return { ...answer, properties: { ...Object.fromEntries(requested.map((name) => [name, null])), ...answer.properties } };
        }
      })
    ),
    (error) => error.code === "SYNC_STALE"
  );
  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "error");
  assert.equal(line.meta.reasonCode, "SYNC_STALE");
  assert.equal(line.meta.operation, "update");
  assert.deepEqual(line.meta.crCalls, requestLogAsCalls(cr));
  assert.equal(callsOf(line, "update").length, 1);
  assert.equal(callsOf(line, "metadata").length > 0, true);
});

test("[BR15][3.20] the line goes through the injected logger (safeLog) once per run, also when nothing else is logged", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { enter_in_central_reach: "Yes", dealstage: "1383894301" });
  const logs = [];
  const result = await runClientSyncWorkflow(input(), caseDeps({ record, logs }));
  assert.equal(result.status, "skipped");
  assert.equal(summariesOf(logs).length, 1);
  assert.equal(cr.calls.length, 0);
});

// --- the shared helper (lane E reuses it) ---

test("[BR15][3.20] helper: createSyncRunSummary logs once, with exactly the keys, and defaults to the neutral values", () => {
  const lines = [];
  const logger = (level, message, meta) => lines.push({ level, message, meta });
  const summary = createSyncRunSummary({ workflow: "bcbaSync", recordId: 42, portalId: "50317927" });
  summary.setOutcome("success");
  assert.equal(summary.log(logger), true);
  assert.equal(summary.log(logger), false);

  assert.equal(lines.length, 1);
  assert.equal(lines[0].message, "Sync run summary.");
  assert.deepEqual(lines[0].meta, {
    workflow: "bcbaSync",
    recordId: "42",
    portalId: "50317927",
    source: null,
    invocationId: null,
    attempt: null,
    outcome: "success",
    reasonCode: null,
    operation: "none",
    changedFieldNames: [],
    crCalls: [],
    labels: null,
    writeback: { written: false, status: null }
  });
});

test("[BR15][3.20] helper: the fan-out adds queuedMessages per object type, and only when it sets them", () => {
  const lines = [];
  const logger = (level, message, meta) => lines.push(meta);
  const summary = createSyncRunSummary({ workflow: "contactFanOut", recordId: "77", portalId: "52311591" });
  summary.setQueued({ bcba: 2, btRbt: 0 });
  summary.setOutcome("success");
  summary.log(logger);
  assert.deepEqual(lines[0].queuedMessages, { bcba: 2, btRbt: 0 });
});

test("[BR15][3.20] helper: an outcome, an operation or a call kind outside the lists throws; a reason that is not a code is replaced, never logged", () => {
  const summary = createSyncRunSummary({ workflow: "clientSync", recordId: "1", portalId: "1" });
  assert.throws(() => summary.setOutcome("done"), /outcome/);
  assert.throws(() => summary.setOperation("delete"), /operation/);
  assert.throws(() => summary.addCrCall("getEverything"), /call kind/);
  assert.throws(() => summary.setGate("other"), /gate/);
  assert.equal("gate" in summary.build(), false);
  assert.deepEqual([...RUN_GATES], ["create", "update"]);
  summary.setGate("update");
  assert.equal(summary.build().gate, "update");
  assert.deepEqual([...RUN_OUTCOMES], ["success", "noop", "waiting", "error", "skipped"]);
  assert.deepEqual([...CR_CALL_KINDS], ["lookup", "create", "update", "metadata", "labelRead", "labelPost"]);

  assert.equal(toReasonCode("Missing required field: Zorblaxen"), INVALID_REASON_CODE);
  assert.equal(toReasonCode("CR_LABEL_READ_EMPTY"), "CR_LABEL_READ_EMPTY");
  assert.equal(toReasonCode(""), null);
  summary.setOutcome("error", "Unreadable date: phi_date_of_birth 2026-02-30");
  assert.equal(summary.build().reasonCode, INVALID_REASON_CODE);
});

test("[BR15][3.20] helper: a run that never set an outcome is logged as an error, so a line is never missing or wrong", () => {
  const summary = createSyncRunSummary({ workflow: "clientSync", recordId: "1", portalId: "1" });
  assert.equal(summary.build().outcome, "error");
  assert.equal(summary.build().reasonCode, "OUTCOME_NOT_SET");
});

test("[BR15][3.20] helper: reasonCodeOfError uses the error's code, then the HTTP status, never the message", () => {
  assert.equal(reasonCodeOfError(Object.assign(new Error("Zorblaxen failed"), { code: "SYNC_STALE" })), "SYNC_STALE");
  assert.equal(reasonCodeOfError(Object.assign(new Error("x"), { code: 429 })), "COSMOS_429");
  assert.equal(reasonCodeOfError(httpError(503)), "CR_HTTP_503");
  assert.equal(reasonCodeOfError(Object.assign(httpError(403), { provider: "hubspot" })), "HUBSPOT_HTTP_403");
  assert.equal(reasonCodeOfError(new Error("Zorblaxen failed")), "UNCLASSIFIED");
});

test("[BR15][3.20] helper: labelsSummary keeps IDs and booleans only", () => {
  assert.equal(labelsSummary(null), null);
  assert.deepEqual(
    labelsSummary({ operation: "updated", postedLabelIds: ["1052618", 1052643, "x"], postedAt: "2026-11-20T15:00:00Z", confirmed: true }),
    { postedLabelIds: [1052618, 1052643], confirmed: true, skipWindowHeldBack: false }
  );
  assert.deepEqual(labelsSummary({ operation: "skip_empty", postedLabelIds: null, confirmed: null }), {
    postedLabelIds: null,
    confirmed: null,
    skipWindowHeldBack: false
  });
});

// --- review fixes D-R2, D-R3, D-R4 ---

test("[BR15][3.20] a long failed run logs every crCalls entry through the real safeLog (78 calls), while other values keep the 2000-character cap", () => {
  const summary = createSyncRunSummary({ workflow: "clientSync", recordId: "4821193760", portalId: "52311591" });
  for (let index = 0; index < 78; index += 1) {
    summary.addCrCall("metadata", index % 2 ? 503 : 200);
  }
  summary.setOutcome("error", "CR_HTTP_503");
  const lines = [];
  const original = console.warn;
  console.warn = (...args) => lines.push(args);
  try {
    summary.log();
    safeLog("info", "x", { note: "a".repeat(3000) });
  } finally {
    console.warn = original;
  }
  const calls = JSON.parse(lines[0][1].crCalls);
  assert.equal(calls.length, 78);
  assert.deepEqual(calls[1], { kind: "metadata", status: 503 });
  assert.equal(JSON.stringify(summary.build().crCalls).length > 2000, true);
});

test("[BR15][3.20] an unknown portal logs exactly one summary line with outcome error and no portal ID", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const config = workflowConfig();
  config.hubspot = { ...config.hubspot, hubspotPortalId: "12345" };
  const logs = [];
  await assert.rejects(
    runClientSyncWorkflow(input(), caseDeps({ record, logs, getConfig: () => config }))
  );
  const line = onlySummary(logs);
  assert.equal(line.meta.outcome, "error");
  assert.equal(line.meta.portalId, null);
  assert.equal(line.meta.recordId, "deal-1");
  assert.equal(line.meta.reasonCode, "UNCLASSIFIED");
  assert.deepEqual(cr.calls, []);
  assert.deepEqual(record.writes, []);
});

test("[BR15][3.20] a configuration that cannot be read, and a client factory that throws, each log exactly one summary line with outcome error", async () => {
  for (const which of ["getConfig", "createHubSpotClient", "createCentralReachClient", "createStateClient"]) {
    const { cr } = setup();
    const record = linkedCase(cr);
    const logs = [];
    await assert.rejects(
      runClientSyncWorkflow(
        input(),
        caseDeps({
          record,
          logs,
          [which]: () => {
            throw new Error("the private app token is missing");
          }
        })
      ),
      /token is missing/,
      which
    );
    const line = onlySummary(logs);
    assert.equal(line.meta.outcome, "error", which);
    assert.equal(line.meta.portalId, which === "getConfig" ? null : "52311591", which);
    assert.equal(JSON.stringify(line.meta).includes("token"), false, which);
    assert.deepEqual(cr.writes(), [], which);
    assert.deepEqual(record.writes, [], which);
  }
});

test("[BR15][3.20] a create that timed out shows operation create, and an update refused with 400 shows operation update", async () => {
  {
    const { cr } = setup();
    const record = stage3Case(distinctiveCase());
    cr.fail("POST /contacts/client", timeoutError());
    const logs = [];
    await assert.rejects(runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() })));
    assert.equal(onlySummary(logs).meta.operation, "create");
  }
  {
    const { cr } = setup();
    const record = linkedCase(cr, distinctiveCase());
    cr.fail("PUT /contacts/client/{id}", httpError(400));
    const logs = [];
    await runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() }));
    assert.equal(onlySummary(logs).meta.operation, "update");
  }
});

test("[BR15][3.20] a label POST that failed with a 500 and carries labelPost shows the label IDs with confirmed null", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, distinctiveCase());
  cr.fail("POST /contacts/{id}/labels", httpError(500), { afterHandling: true });
  const logs = [];
  let thrown = null;
  await assert.rejects(
    runClientSyncWorkflow(input(), caseDeps({ record, logs, staff: staffWithDistinctNames() })),
    (error) => {
      thrown = error;
      return true;
    }
  );
  assert.equal(Array.isArray(thrown.labelPost.labelIds), true);
  const line = onlySummary(logs);
  assert.deepEqual(line.meta.labels, {
    postedLabelIds: thrown.labelPost.labelIds.map(Number),
    confirmed: null,
    skipWindowHeldBack: false
  });
  assert.equal(JSON.stringify(line.meta).includes("postedAt"), false);
});

test("[BR15][3.20] helper: an explicit setOperation wins over the operation a call set; setPortalId and setLabelsFromError", () => {
  const summary = createSyncRunSummary({ workflow: "clientSync", recordId: "1", portalId: null });
  summary.onCall({ kind: "lookup", status: 404 });
  assert.equal(summary.build().operation, "none");
  summary.onCall({ kind: "create", status: null });
  assert.equal(summary.build().operation, "create");
  summary.setOperation("update");
  summary.onCall({ kind: "create", status: 200 });
  assert.equal(summary.build().operation, "update");
  summary.setPortalId(52311591);
  assert.equal(summary.build().portalId, "52311591");
  summary.setLabelsFromError(new Error("no labelPost"));
  assert.equal(summary.build().labels, null);
  summary.setLabelsFromError({ labelPost: { contactId: "2001", labelIds: [1052618], postedAt: "x" } });
  assert.deepEqual(summary.build().labels, { postedLabelIds: [1052618], confirmed: null, skipWindowHeldBack: false });
});
