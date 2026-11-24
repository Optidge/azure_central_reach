// Item 15 (R-8, O-8, row 3.17; BR2, BR8): a filled workday_id must be exactly 7 digits once
// trimmed. Pending final confirmation of the Workday ID format by United Care (O-8). A filled
// value that fails the check ends the run as error with a fixed sentence and the code
// WORKDAY_ID_INVALID, before any CentralReach call of either path: no create lock, no lookup, no
// create, no GET and no update. A blank workday_id is unchanged (temporary ID, waiting).
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container), centralReachClient.mjs (fake HTTP adapter) and syncRunSummary.mjs are real. No live
// call.
import test from "node:test";
import assert from "node:assert/strict";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { WORKDAY_ID_NOT_SEVEN_DIGITS } from "../../constants/syncReasons.mjs";
import { workdayIdIsValid } from "../../lib/syncDecisions.mjs";
import { fieldHashes } from "../../lib/mappedState.mjs";
import { SYNC_RUN_SUMMARY_MESSAGE } from "../../lib/syncRunSummary.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { employeeWorkflowDeps, workflowConfig } from "./stage2Fakes.mjs";
import { GATE } from "./stage3PollerFakes.mjs";
import {
  BCBA_LINK,
  BT_LINK,
  linkedBcba,
  linkedBt,
  setup,
  stage3Bcba,
  stage3Bt
} from "./stage3WorkerFakes.mjs";

// The shapes of the five malformed production values (EMP §4), and 6 and 8 digits.
const BAD_WORKDAY_IDS = ["123456", "12345678", "999-99-9999", "ID 7654321", "AZTEST-1-BT"];

const TYPES = [
  {
    name: HUBSPOT_EMPLOYEE_TYPES.BT_RBT,
    recordId: "HS1",
    contactId: "5001",
    workdayId: "1000001",
    key: BT_LINK,
    unlinked: (properties) => stage3Bt({ employee_id: "", ...properties }),
    linked: (cr, properties) => linkedBt(cr, properties)
  },
  {
    name: HUBSPOT_EMPLOYEE_TYPES.BCBA,
    recordId: "HS2",
    contactId: "5002",
    workdayId: "1000002",
    key: BCBA_LINK,
    unlinked: (properties) =>
      stage3Bcba({ employee_id: "", email: "pat@example.com", ...properties }),
    linked: (cr, properties) => linkedBcba(cr, properties)
  }
];

function run(type, record, { logs = [], extra = {} } = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: type.recordId, employeeType: type.name, source: "hubspotWorkflow" },
    { ...employeeWorkflowDeps({ record, logs }), labelReadBackDelayMs: 0, ...extra }
  );
}

function link(container, key) {
  return container.get(key.pk, key.id)?.data || null;
}

// The run ended on the Workday ID check: error, the fixed sentence, the code, no CentralReach call,
// and the value is in no log line and not in the sentence.
function assertStoppedByCheck({ result, record, logs, cr, badValue }) {
  assert.equal(result.status, "error");
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, WORKDAY_ID_NOT_SEVEN_DIGITS);
  assert.equal(record.properties.last_sync_error.includes(badValue.trim()), false);
  assert.deepEqual(cr.calls, [], "no CentralReach call");
  const summary = logs.filter((entry) => entry.message === SYNC_RUN_SUMMARY_MESSAGE);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].meta.outcome, "error");
  assert.equal(summary[0].meta.reasonCode, "WORKDAY_ID_INVALID");
  assert.deepEqual(summary[0].meta.crCalls, []);
  assert.equal(JSON.stringify(logs).includes(badValue.trim()), false, "the value is never logged");
}

test("[BR8][3.17] workdayIdIsValid: exactly 7 digits once trimmed", () => {
  assert.equal(workdayIdIsValid("1234567"), true);
  assert.equal(workdayIdIsValid(" 1234567 "), true);
  for (const value of [...BAD_WORKDAY_IDS, "", null, undefined]) {
    assert.equal(workdayIdIsValid(value), false, JSON.stringify(value));
  }
});

for (const type of TYPES) {
  test(`[BR8][3.17] ${type.name}: an unlinked record with a filled workday_id that is not 7 digits is error with no CentralReach call`, async () => {
    for (const badValue of BAD_WORKDAY_IDS) {
      const { container, cr } = setup();
      const record = type.unlinked({ workday_id: badValue });
      const logs = [];
      const result = await run(type, record, { logs });

      assertStoppedByCheck({ result, record, logs, cr, badValue });
      assert.equal(record.properties.employee_id, "");
      assert.equal(link(container, type.key)?.pendingCreateExternalId ?? null, null);
    }
  });

  test(`[BR8][3.17] ${type.name}: an unlinked record with a pending-create marker and a workday_id that is not 7 digits is error with no lookup and keeps the marker`, async () => {
    const { container, cr } = setup();
    await container.items.upsert({
      id: type.key.id,
      pk: type.key.pk,
      type: "link",
      ttl: -1,
      data: { pendingCreateExternalId: "1000001", pendingCreateSentAt: "2026-11-20T15:00:00.000Z" }
    });
    const record = type.unlinked({ workday_id: "123456" });
    const logs = [];
    const result = await run(type, record, { logs });

    assertStoppedByCheck({ result, record, logs, cr, badValue: "123456" });
    assert.equal(link(container, type.key).pendingCreateExternalId, "1000001");
  });

  test(`[BR8][3.17] ${type.name}: a linked record whose workday_id changes to a value that is not 7 digits is error with no GET and no update`, async () => {
    const { container, cr } = setup();
    const record = type.linked(cr, {});
    assert.equal((await run(type, record)).status, "success");
    const savedHashes = { ...link(container, type.key).fieldHashes };
    cr.calls.length = 0;

    record.write({ workday_id: "ID 7654321" });
    const logs = [];
    const result = await run(type, record, { logs });

    assertStoppedByCheck({ result, record, logs, cr, badValue: "ID 7654321" });
    assert.equal(link(container, type.key).crContactId, type.contactId);
    assert.deepEqual(link(container, type.key).fieldHashes, savedHashes);
  });

  // The 5 production records that synced before item 15: the saved hashes already hold their
  // malformed value, so nothing changed. The mapper is fed the value the hashes were built from,
  // and the saved identity hash is the malformed value's own hash (identity.workdayId is read
  // from the HubSpot property, not from the mapper). So the record is truly unchanged: without
  // the check, or with the check after the "nothing changed" return, the run is a noop.
  test(`[BR8][3.17] ${type.name}: a linked record with nothing changed and a workday_id that is not 7 digits is still error with no call`, async () => {
    const { container, cr } = setup();
    const record = type.linked(cr, {});
    assert.equal((await run(type, record)).status, "success");
    const sameMappedState = {
      buildEmployeePayload: (input) =>
        buildEmployeePayload({
          ...input,
          record: {
            ...input.record,
            properties: { ...input.record.properties, workday_id: type.workdayId }
          }
        })
    };
    cr.calls.length = 0;
    assert.equal((await run(type, record, { extra: sameMappedState })).status, "noop");
    assert.deepEqual(cr.calls, []);

    const badValue = "999-99-9999";
    const saved = structuredClone(container.get(type.key.pk, type.key.id));
    saved.data.fieldHashes["identity.workdayId"] = fieldHashes({
      identity: { workdayId: badValue, checklistTicked: false }
    })["identity.workdayId"];
    await container.items.upsert(saved);
    record.write({ workday_id: badValue });
    const logs = [];
    const result = await run(type, record, { logs, extra: sameMappedState });

    assertStoppedByCheck({ result, record, logs, cr, badValue });
  });

  // Item 15's check comes after the record gate (BR4): a record the gate holds is skipped, whatever
  // its Workday ID.
  test(`[BR8][BR4][3.17] ${type.name}: the record gate false with a workday_id that is not 7 digits is skipped (record_gate), with no HubSpot write and no CentralReach call`, async () => {
    const { cr } = setup();
    const record = type.unlinked({ workday_id: "123456", [GATE]: "false" });
    const result = await runEmployeeSyncWorkflow(
      { recordId: type.recordId, employeeType: type.name, source: "hubspotWorkflow" },
      employeeWorkflowDeps({ record, config: workflowConfig({ sync: { recordGateProperty: GATE } }) })
    );

    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "record_gate");
    assert.deepEqual(record.writes, []);
    assert.deepEqual(cr.calls, []);
  });

  test(`[BR8][3.17] ${type.name}: 7 digits, also with spaces around them, is created with the trimmed Workday ID; a blank or spaces-only workday_id still sends the record ID and waits`, async () => {
    for (const workday of ["1234567", " 1234567 "]) {
      const { cr } = setup();
      const record = type.unlinked({ workday_id: workday });
      const result = await run(type, record);
      assert.equal(result.status, "success");
      const create = cr.calls.find((call) => call.name === "POST /contacts/employee");
      assert.equal(create.body.externalSystemId, "1234567");
    }

    // Blank, or only spaces, is blank: not checked, and the create sends the record ID.
    for (const blank of ["", "   "]) {
      const { cr } = setup();
      const record = type.unlinked({ workday_id: blank });
      const result = await run(type, record);
      assert.equal(result.status, "waiting", JSON.stringify(blank));
      const create = cr.calls.find((call) => call.name === "POST /contacts/employee");
      assert.equal(create.body.externalSystemId, type.recordId, JSON.stringify(blank));
    }
  });
}
