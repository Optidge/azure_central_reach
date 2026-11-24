// Row 4.18 for the two employee objects (lane E, wave 2), BR16 and rule 5.8 (BUILD-PLAN.md
// sections 5 and 12). Guide: Architecture tab, "Minimum changes and tests before production":
// "Distinguish an intentional blank from a failed or unauthorized read."
// HubSpot answers a blank property with a null key (P.7 (b), 2026-11-20). So a requested mapped
// property whose key is missing from the answer was not read: `error`, no CentralReach write.
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { BCBA_PROPERTIES, BT_RBT_PROPERTIES } from "../../mappings/employees/employeeProperties.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { employeeWorkflowDeps, hubspotAnswer, workflowConfig } from "./stage2Fakes.mjs";
import {
  BCBA_LINK,
  BT_LINK,
  counters,
  linkedBcba,
  linkedBt,
  setup,
  stage3Bcba,
  stage3Bt
} from "./stage3WorkerFakes.mjs";

// A reader that answers like HubSpot, except that the named keys are missing from the answer.
function readerWithout(record, missingKeys, { onCall } = {}) {
  let calls = 0;
  return async (id, type, names) => {
    calls += 1;
    const answer = hubspotAnswer(record.read(), names);
    const drop = typeof missingKeys === "function" ? missingKeys(calls) : missingKeys;
    for (const key of drop) {
      delete answer.properties[key];
    }
    onCall?.(names);
    return answer;
  };
}

function run(record, employeeType, { missing = [], logs = [], extra = {} } = {}) {
  const reader = readerWithout(record, missing);
  return runEmployeeSyncWorkflow(
    { recordId: record.properties.hs_object_id, employeeType },
    {
      ...employeeWorkflowDeps({ record, logs }),
      getBtRbtRecordById: reader,
      getBcbaRecordById: reader,
      ...extra
    }
  );
}

test("[BR16][4.18] a BT/RBT answer without the street_home key is error, with no CentralReach call", async () => {
  const { container, cr } = setup();
  // An unlinked BT/RBT with Entered in CentralReach = Yes: it would be created.
  const record = stage3Bt({ street_home: "12 Main Street" });
  const count = counters({ container, cr, record });
  const logs = [];
  const start = count.mark();

  const result = await run(record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT, { missing: ["street_home"], logs });
  const done = count.since(start);

  assert.equal(result.status, "error");
  assert.equal(done.crCalls.length, 0);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, "Missing from the HubSpot answer: street_home");
  const warning = logs.find((entry) => entry.message.includes("missing requested properties"));
  assert.deepEqual(warning.meta.missingProperties, ["street_home"]);
  // Field names only, never a value.
  assert.equal(JSON.stringify(logs).includes("12 Main Street"), false);
});

test("[BR16][4.18] a BCBA answer without date_of_birth (the BCBA date of birth source, item 1; O-10) is error, with no CentralReach call", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, { date_of_birth: "3/2/1985" });
  const count = counters({ container, cr, record });
  const start = count.mark();

  const result = await run(record, HUBSPOT_EMPLOYEE_TYPES.BCBA, { missing: ["date_of_birth"] });
  const done = count.since(start);

  assert.equal(result.status, "error");
  assert.equal(done.crCalls.length, 0);
  assert.equal(record.properties.last_sync_error, "Missing from the HubSpot answer: date_of_birth");
  // Nothing about the CentralReach employee is saved: no link record write, no hashes.
  assert.equal(container.get(BCBA_LINK.pk, BCBA_LINK.id), null);
});

for (const [employeeType, lists, makeRecord] of [
  [HUBSPOT_EMPLOYEE_TYPES.BT_RBT, BT_RBT_PROPERTIES, (cr) => linkedBt(cr)],
  [HUBSPOT_EMPLOYEE_TYPES.BCBA, BCBA_PROPERTIES, (cr) => linkedBcba(cr)]
]) {
  test(`[BR16][4.18] every ${employeeType} mapped property is checked: a missing key is error and sends nothing to CentralReach`, async () => {
    for (const property of lists.mapped) {
      const { cr } = setup();
      const record = makeRecord(cr);
      const result = await run(record, employeeType, { missing: [property] });
      assert.equal(result.status, "error", property);
      assert.deepEqual(cr.calls, [], property);
      assert.equal(record.properties.last_sync_error, `Missing from the HubSpot answer: ${property}`);
    }
  });
}

test("[BR16][4.18] a linked BT/RBT whose saved copy holds values keeps it when a key is missing: no clear is sent", async () => {
  const { container, cr } = setup();
  const record = linkedBt(cr, { street_address__work_: "1 Work Plaza", active_cases_count: "3" });
  const first = await run(record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT);
  assert.equal(first.status, "success");
  const savedBefore = structuredClone(container.get(BT_LINK.pk, BT_LINK.id).data.fieldHashes);

  const count = counters({ container, cr, record });
  const start = count.mark();
  const result = await run(record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT, {
    missing: ["street_address__work_", "active_cases_count"]
  });

  assert.equal(result.status, "error");
  assert.equal(count.since(start).crCalls.length, 0);
  assert.deepEqual(container.get(BT_LINK.pk, BT_LINK.id).data.fieldHashes, savedBefore);
});

test("[BR16][4.18] a blank property answered as a null key is not a failed read: the run goes on", async () => {
  const { cr } = setup();
  const record = linkedBt(cr);
  const requested = [];
  const reader = readerWithout(record, [], { onCall: (names) => requested.push(names) });
  const result = await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: HUBSPOT_EMPLOYEE_TYPES.BT_RBT },
    { ...employeeWorkflowDeps({ record }), getBtRbtRecordById: reader }
  );

  assert.equal(result.status, "success");
  assert.equal(cr.count("PUT /contacts/employee/{id}"), 1);
  // The fake answered every requested key; street_home, home_apt and the rest were null.
  assert.equal(requested[0].includes("street_home"), true);
  assert.equal(record.read().properties.street_home, undefined);
});

test("[BR16][4.18] a key missing from the confirm read is a temporary failed read, after the writes", async () => {
  const { cr } = setup();
  const record = linkedBt(cr);
  // The first read is whole; the confirm read after the CentralReach writes misses `location`.
  const reader = readerWithout(record, (call) => (call === 1 ? [] : ["location"]));
  await assert.rejects(
    runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType: HUBSPOT_EMPLOYEE_TYPES.BT_RBT },
      { ...employeeWorkflowDeps({ record }), getBtRbtRecordById: reader }
    ),
    (error) => error.code === "HUBSPOT_READ_FAILED"
  );
  assert.equal(cr.count("PUT /contacts/employee/{id}"), 1);
  // HubSpot keeps its last status until the retries are used up (decision 1).
  assert.notEqual(record.properties.last_sync_status, "success");
});

test("[BR7][4.18] a test record is skipped by the gate before the answer is checked: no writeback", async () => {
  const { cr } = setup();
  const record = stage3Bcba({ test_record: "true" });
  const result = await run(record, HUBSPOT_EMPLOYEE_TYPES.BCBA, { missing: ["date_of_birth"] });

  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "test_record");
  assert.deepEqual(record.writes, []);
  assert.deepEqual(cr.calls, []);
});

// --- The keys the worker decides from (review of lane D, D-R1, applied to the employees) ---

const GATE_PROPERTY = "sandbox_test_field";

function runWith(record, employeeType, missing, { sync = {} } = {}) {
  const reader = readerWithout(record, missing);
  return runEmployeeSyncWorkflow(
    { recordId: record.properties.hs_object_id, employeeType },
    {
      ...employeeWorkflowDeps({ record, config: workflowConfig({ sync }) }),
      getBtRbtRecordById: reader,
      getBcbaRecordById: reader
    }
  );
}

test("[BR16][4.18] an answer without the employee_id key is error, with no CentralReach call and no create", async () => {
  const { container, cr } = setup();
  // Entered in CentralReach = Yes and no link in Cosmos: read as "not linked", this would create.
  const record = stage3Bt({ employee_id: "" });
  const result = await run(record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT, { missing: ["employee_id"] });

  assert.equal(result.status, "error");
  assert.deepEqual(cr.calls, []);
  assert.equal(cr.count("POST /contacts/employee"), 0);
  assert.equal(record.properties.last_sync_error, "Missing from the HubSpot answer: employee_id");
  assert.equal(container.get(BT_LINK.pk, BT_LINK.id), null);
});

test("[BR16][4.18] a linked BCBA whose answer lacks the employee_id key keeps its link record untouched", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr);
  assert.equal((await run(record, HUBSPOT_EMPLOYEE_TYPES.BCBA)).status, "success");
  const linkBefore = structuredClone(container.get(BCBA_LINK.pk, BCBA_LINK.id));
  const callsBefore = cr.calls.length;

  const result = await run(record, HUBSPOT_EMPLOYEE_TYPES.BCBA, { missing: ["employee_id"] });

  assert.equal(result.status, "error");
  assert.equal(cr.calls.length, callsBefore);
  assert.deepEqual(container.get(BCBA_LINK.pk, BCBA_LINK.id), linkBefore);
  const lastWrite = record.writes.at(-1);
  assert.equal(lastWrite.last_sync_status, "error");
  assert.equal(Object.hasOwn(lastWrite, "employee_id"), false);
});

test("[BR16][4.18] a null employee_id key still means not linked: the employee is created", async () => {
  const { cr } = setup();
  const record = stage3Bt({ employee_id: null });
  const result = await run(record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT);

  assert.equal(result.operation, "create");
  assert.equal(cr.count("POST /contacts/employee"), 1);
});

for (const [employeeType, makeRecord] of [
  [HUBSPOT_EMPLOYEE_TYPES.BT_RBT, (cr) => linkedBt(cr, { [GATE_PROPERTY]: "true" })],
  [HUBSPOT_EMPLOYEE_TYPES.BCBA, (cr) => linkedBcba(cr, { [GATE_PROPERTY]: "true" })]
]) {
  for (const key of [
    "entered_in_centralreach",
    "test_record",
    "last_sync_status",
    "last_sync_error",
    GATE_PROPERTY
  ]) {
    test(`[BR16][4.18] a ${employeeType} answer without the ${key} key is a failed read: no HubSpot or CentralReach write`, async () => {
      const { container, cr } = setup();
      const record = makeRecord(cr);
      const writesBefore = container.log.length;

      await assert.rejects(
        runWith(record, employeeType, [key], { sync: { recordGateProperty: GATE_PROPERTY } }),
        (error) => error.code === "HUBSPOT_READ_FAILED"
      );
      assert.deepEqual(record.writes, []);
      assert.deepEqual(cr.calls, []);
      // Only the attempt record is written; the link record is not touched.
      const stateWrites = container.log
        .slice(writesBefore)
        .filter((entry) => String(entry.doc?.pk ?? entry.pk).startsWith("sync:"));
      assert.deepEqual(stateWrites, []);
    });
  }
}

for (const [employeeType, checklist, makeRecord] of [
  [HUBSPOT_EMPLOYEE_TYPES.BT_RBT, "btrbt_in_cr_checklist", (cr) => linkedBt(cr)],
  [HUBSPOT_EMPLOYEE_TYPES.BCBA, "bcba_in_cr_checklist", (cr) => linkedBcba(cr)]
]) {
  test(`[BR16][4.18] a ${employeeType} answer without the ${checklist} key (read by the identity check) is error, with no CentralReach call`, async () => {
    const { cr } = setup();
    const record = makeRecord(cr);
    const result = await run(record, employeeType, { missing: [checklist] });

    assert.equal(result.status, "error");
    assert.deepEqual(cr.calls, []);
    assert.equal(record.properties.last_sync_error, `Missing from the HubSpot answer: ${checklist}`);
  });
}

test("[BR16][4.18] the reason names at most ten missing properties", async () => {
  const { cr } = setup();
  const record = linkedBt(cr);
  const missing = BT_RBT_PROPERTIES.mapped.slice(0, 12);
  await run(record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT, { missing });

  assert.equal(
    record.properties.last_sync_error,
    `Missing from the HubSpot answer: ${missing.slice(0, 10).join(", ")} and 2 more`
  );
});
