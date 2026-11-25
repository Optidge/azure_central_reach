// B11 (O-17, Zeke 2026-11-25, batch 3 item 11, 11.b and A): the BCBA Care Coordinator, Employee
// Meta 140495, through the real employee worker. Spec: A4.4, A4.5 and A4.7 items 10 to 15 of
// docs/workstreams/architecture-update/batch3-verification-2026-11-25.md. The rule itself is
// shared with the Case (careCoordinatorMapping.test.mjs).
// Only HubSpot is faked. The mapper, the hash, cosmosState.mjs (in-memory container) and
// centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { CARE_COORDINATOR_PROPERTIES } from "../../mappings/shared/careCoordinator.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { employeeWorkflowDeps, hubspotAnswer } from "./stage2Fakes.mjs";
import {
  BCBA_LINK,
  METADATA_DELETE,
  METADATA_PUT,
  counters,
  linkedBcba,
  setup,
  stage3Bcba
} from "./stage3WorkerFakes.mjs";

const FIELD = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CARE_COORDINATOR;
const EMAIL = "ann.lee@example.com";
const THREE_LINES = `Ann\nLee\n${EMAIL}`;

const coordinator = (status, first = "Ann", last = "Lee", email = EMAIL) => ({
  care_coordinator_first_name: first,
  care_coordinator_last_name: last,
  care_coordinator_email: email,
  coordinator_export_status: status
});

function runBcba(record, { logs = [], extra = {} } = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: record.properties.hs_object_id, employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA },
    { ...employeeWorkflowDeps({ record, logs }), ...extra }
  );
}

function fieldCalls(crCalls, name) {
  return crCalls.filter((call) => call.name === name && Number(call.url.split("/").at(-1)) === FIELD);
}

// The CentralReach calls one run makes, and its result.
async function runCounted({ container, cr, record, logs, extra }) {
  const count = counters({ container, cr, record });
  const start = count.mark();
  const result = await runBcba(record, { logs, extra });
  const done = count.since(start);
  return { result, puts: fieldCalls(done.crCalls, METADATA_PUT), deletes: fieldCalls(done.crCalls, METADATA_DELETE), done };
}

const savedHash = (container) =>
  container.get(BCBA_LINK.pk, BCBA_LINK.id)?.data?.fieldHashes?.[`metadata.${FIELD}`];

// A BCBA reader whose second answer (the confirm read after the writes) holds `change`.
function changedOnConfirmRead(record, change) {
  let reads = 0;
  return async (_id, _type, names) => {
    reads += 1;
    const answer = record.read();
    if (reads === 2) {
      Object.assign(answer.properties, change);
    }
    return hubspotAnswer(answer, names);
  };
}

const isStale = (error) => error?.code === "SYNC_STALE";

test("[B11] a linked BCBA whose Care Coordinator is ready sends 140495 as first name, last name and email, one per line", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, coordinator("ready"));
  const { result, puts, deletes } = await runCounted({ container, cr, record });

  assert.equal(result.status, "success");
  assert.equal(puts.length, 1);
  assert.deepEqual(puts[0].body, { inputValue: THREE_LINES });
  assert.equal(deletes.length, 0);
  assert.ok(savedHash(container));
});

test("[B11] a new BCBA created with a ready Care Coordinator gets 140495 too", async () => {
  const { container, cr } = setup();
  const record = stage3Bcba({ employee_id: "", email: "pat.work@example.com", ...coordinator("ready") });
  const { result, puts } = await runCounted({ container, cr, record });

  assert.equal(result.operation, "create");
  assert.equal(puts.length, 1);
  assert.deepEqual(puts[0].body, { inputValue: THREE_LINES });
});

test("[B11][3.18] ready with all three parts blank, each other status, and a blank status: 140495 left out, warning care_coordinator_not_ready, no PUT and no DELETE, the saved hash kept", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, coordinator("ready"));
  assert.equal((await runBcba(record)).status, "success");
  const hashAfterWrite = savedHash(container);
  assert.ok(hashAfterWrite);

  const variants = [
    [coordinator("ready", " ", "", null), "ready"],
    ...["refreshing", "missing_match", "duplicate_match", "inactive", "incomplete", "error"].map((status) => [
      coordinator(status, "Riley", "Chen", "riley.chen@example.com"),
      status
    ]),
    [coordinator(null, "Riley"), "blank"],
    [coordinator("Riley Chen"), "unknown"]
  ];
  for (const [properties, status] of variants) {
    Object.assign(record.properties, properties);
    const logs = [];
    const { result, puts, deletes } = await runCounted({ container, cr, record, logs });
    const label = status;
    // Nothing else changed and 140495 is left out, so the run is a noop.
    assert.equal(result.status, "noop", label);
    assert.equal(puts.length, 0, label);
    assert.equal(deletes.length, 0, label);
    assert.equal(savedHash(container), hashAfterWrite, label);
    const warning = logs.find((entry) => entry.message === "Employee mapping warnings.");
    assert.deepEqual(warning?.meta?.warningCodes, ["care_coordinator_not_ready"], label);
    assert.equal(/Riley|Chen|example\.com/.test(JSON.stringify(logs)), false, label);
  }
});

test("[B11] a BCBA whose Care Coordinator was never written and is not ready sends nothing to 140495", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, coordinator("missing_match"));
  const { result, puts, deletes } = await runCounted({ container, cr, record });

  assert.equal(result.status, "success");
  assert.equal(puts.length, 0);
  assert.equal(deletes.length, 0);
  assert.equal(savedHash(container), undefined);
});

test("[B11] no_owner after a value was written clears 140495 (DELETE)", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, coordinator("ready"));
  assert.equal((await runBcba(record)).status, "success");

  record.properties.coordinator_export_status = "no_owner";
  const { result, puts, deletes } = await runCounted({ container, cr, record });
  assert.equal(result.status, "success");
  assert.equal(deletes.length, 1);
  assert.equal(puts.length, 0);
});

test("[B11] no_owner with no saved copy of 140495 sends no PUT and no DELETE, so a value entered in CentralReach stays", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, coordinator("missing_match"));
  assert.equal((await runBcba(record)).status, "success");

  record.properties.coordinator_export_status = "no_owner";
  const { result, puts, deletes } = await runCounted({ container, cr, record });
  assert.equal(result.status, "success");
  assert.equal(puts.length, 0);
  assert.equal(deletes.length, 0);
});

test("[B11][3.18] not ready after a value was written: no write, no clear, hash kept; a later no_owner still clears", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, coordinator("ready"));
  assert.equal((await runBcba(record)).status, "success");
  const hashAfterWrite = savedHash(container);

  Object.assign(record.properties, coordinator("refreshing", null, null, null));
  const notReady = await runCounted({ container, cr, record });
  assert.equal(notReady.result.status, "noop");
  assert.equal(notReady.puts.length + notReady.deletes.length, 0);
  assert.equal(savedHash(container), hashAfterWrite);

  record.properties.coordinator_export_status = "no_owner";
  const cleared = await runCounted({ container, cr, record });
  assert.equal(cleared.result.status, "success");
  assert.equal(cleared.deletes.length, 1);
});

test("[B11] a status that turns ready, or stops being ready, between the first read and the confirm read ends the run SYNC_STALE", async () => {
  for (const [first, confirm] of [
    ["missing_match", "ready"],
    ["ready", "refreshing"]
  ]) {
    const { cr } = setup();
    const record = linkedBcba(cr, coordinator(first));
    const reader = changedOnConfirmRead(record, { coordinator_export_status: confirm });
    await assert.rejects(runBcba(record, { extra: { getBcbaRecordById: reader } }), isStale, `${first} -> ${confirm}`);
  }
});

// Rule 5.8 with row 3.18 (the Case versions are in laneDCaseReads.test.mjs): after a run that did
// not finish clean, an omitted 140495 keeps the unsettled hash, not the last clean one.
const lastSent = (cr) => fieldCalls(cr.calls, METADATA_PUT).at(-1)?.body?.inputValue;
const putCount = (cr) => fieldCalls(cr.calls, METADATA_PUT).length;
const deleteCount = (cr) => fieldCalls(cr.calls, METADATA_DELETE).length;
const OLD_ONE = coordinator("ready", "Old", "One");
const NEW_TWO = coordinator("ready", "New", "Two");

test("[B11][3.18] clean \"Old One\"; a stale run sends \"New Two\"; a refreshing run ends clean: a later ready \"Old One\" is sent again", async () => {
  const { cr } = setup();
  const record = linkedBcba(cr, OLD_ONE);
  assert.equal((await runBcba(record)).status, "success");

  Object.assign(record.properties, NEW_TWO);
  const refreshing = changedOnConfirmRead(record, { coordinator_export_status: "refreshing" });
  await assert.rejects(runBcba(record, { extra: { getBcbaRecordById: refreshing } }), isStale);
  assert.equal(lastSent(cr), `New\nTwo\n${EMAIL}`);

  Object.assign(record.properties, OLD_ONE, { coordinator_export_status: "refreshing" });
  assert.equal((await runBcba(record)).status, "success");
  const putsBefore = putCount(cr);

  // Ready with the old value: CentralReach may still hold "New Two", so the value is sent.
  record.properties.coordinator_export_status = "ready";
  assert.equal((await runBcba(record)).status, "success");
  assert.equal(putCount(cr), putsBefore + 1);
  assert.equal(lastSent(cr), `Old\nOne\n${EMAIL}`);
});

test("[B11][3.18] a value first written by a run that then went stale is still cleared by a later no_owner, after a not-ready run in between", async () => {
  const { cr } = setup();
  const record = linkedBcba(cr, coordinator("ready", "A", "B"));
  const notReady = changedOnConfirmRead(record, { coordinator_export_status: "missing_match" });
  await assert.rejects(runBcba(record, { extra: { getBcbaRecordById: notReady } }), isStale);
  assert.equal(lastSent(cr), `A\nB\n${EMAIL}`);

  record.properties.coordinator_export_status = "missing_match";
  assert.equal((await runBcba(record)).status, "success");

  record.properties.coordinator_export_status = "no_owner";
  assert.equal((await runBcba(record)).status, "success");
  assert.equal(deleteCount(cr), 1);
});

test("[B11][3.18] clean \"Old One\"; a stale run with 140495 omitted, then a stale run that sends \"New Two\", then a refreshing run that ends clean: a later ready \"Old One\" is sent again", async () => {
  const { cr } = setup();
  const record = linkedBcba(cr, OLD_ONE);
  assert.equal((await runBcba(record)).status, "success");

  // Another field changed while the coordinator was refreshing; the confirm read turns ready.
  Object.assign(record.properties, { coordinator_export_status: "refreshing", medicaid_id__ny: "NY1" });
  const turnsReady = changedOnConfirmRead(record, { coordinator_export_status: "ready" });
  await assert.rejects(runBcba(record, { extra: { getBcbaRecordById: turnsReady } }), isStale);

  Object.assign(record.properties, NEW_TWO);
  const refreshing = changedOnConfirmRead(record, { coordinator_export_status: "refreshing" });
  await assert.rejects(runBcba(record, { extra: { getBcbaRecordById: refreshing } }), isStale);
  assert.equal(lastSent(cr), `New\nTwo\n${EMAIL}`);

  Object.assign(record.properties, OLD_ONE, { coordinator_export_status: "refreshing" });
  assert.equal((await runBcba(record)).status, "success");
  const putsBefore = putCount(cr);

  record.properties.coordinator_export_status = "ready";
  assert.equal((await runBcba(record)).status, "success");
  assert.equal(putCount(cr), putsBefore + 1);
  assert.equal(lastSent(cr), `Old\nOne\n${EMAIL}`);
});

test("[B11][4.18] an answer without any one of the four Care Coordinator keys is a failed read: error, no CentralReach call", async () => {
  for (const property of CARE_COORDINATOR_PROPERTIES) {
    const { container, cr } = setup();
    const record = linkedBcba(cr, coordinator("ready"));
    const reader = async (_id, _type, names) => {
      const answer = hubspotAnswer(record.read(), names);
      delete answer.properties[property];
      return answer;
    };
    const { result, done } = await runCounted({ container, cr, record, extra: { getBcbaRecordById: reader } });
    assert.equal(result.status, "error", property);
    assert.deepEqual(done.crCalls, [], property);
    assert.equal(record.properties.last_sync_error, `Missing from the HubSpot answer: ${property}`, property);
  }
});
