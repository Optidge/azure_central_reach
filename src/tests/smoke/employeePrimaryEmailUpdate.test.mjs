// Row 1.10 (owner's decision 2026-11-21): "any field on the requirements matrix needs to be pushed
// from hubspot to central reach when updated". A linked employee update sends HubSpot's primary
// email (BT/RBT `email`, BCBA `email` since decision 49) like any other mapped core field, and the
// email takes part in the changed-field comparison. A blank HubSpot email never clears the email
// CentralReach holds: the stored one is sent back. A filled bad email ends as `error` (decision
// 43). A CentralReach refusal of the update (for example an email another contact holds) ends as
// `error` through the normal CentralReach failure sorting (every 4xx except 401, 408 and 429).
// Since decision 50 Meta 138069 reads `personal_email` on both employee types, so an `email`
// change counts the primary email only. Only HubSpot is faked. The mapper, the worker, cosmosState.mjs (in-memory container) and
// centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { employeeWorkflowDeps, httpError } from "./stage2Fakes.mjs";
import { seedStoredEmployee, setup, stage3Bcba, stage3Bt } from "./stage3WorkerFakes.mjs";

const EMPLOYEE_PUT = "PUT /contacts/employee/{id}";
const SUMMARY = "Sync run summary.";

const SIDES = [
  {
    id: "T2",
    label: "BT/RBT",
    emailProperty: "email",
    changedFields: ["employee.primaryEmail"],
    contactId: "5001",
    externalSystemId: "WD1",
    record: (properties) => stage3Bt({ employee_id: "5001", ...properties }),
    run: (record, logs = []) =>
      runEmployeeSyncWorkflow(
        { recordId: "HS1", employeeType: "bt_rbt" },
        employeeWorkflowDeps({ record, logs })
      )
  },
  {
    id: "B4",
    label: "BCBA",
    emailProperty: "email",
    changedFields: ["employee.primaryEmail"],
    contactId: "5002",
    externalSystemId: "WD2",
    record: (properties) => stage3Bcba({ email: "pat@uca.example", ...properties }),
    run: (record, logs = []) =>
      runEmployeeSyncWorkflow(
        { recordId: "HS2", employeeType: "bcba" },
        employeeWorkflowDeps({ record, logs })
      )
  }
];

function puts(cr) {
  return cr.calls.filter((call) => call.name === EMPLOYEE_PUT);
}

function summaryOf(logs) {
  return logs.find((entry) => entry.message === SUMMARY)?.meta;
}

function linkedSide(side) {
  const { container, cr } = setup();
  seedStoredEmployee(cr, side.contactId, side.externalSystemId);
  return { container, cr };
}

for (const side of SIDES) {
  test(`[${side.id}][1.10] ${side.label} update: a changed ${side.emailProperty} is sent to CentralReach and counted as a changed field`, async () => {
    const { cr } = linkedSide(side);
    const record = side.record({ [side.emailProperty]: "first@example.com" });
    assert.equal((await side.run(record)).status, "success");
    assert.equal(puts(cr).at(-1).body.primaryEmail, "first@example.com");

    record.properties[side.emailProperty] = " Changed@Example.com ";
    const logs = [];
    assert.equal((await side.run(record, logs)).status, "success");
    assert.equal(puts(cr).length, 2, "the changed email alone sends an update");
    assert.equal(puts(cr).at(-1).body.primaryEmail, "changed@example.com");
    assert.equal(puts(cr).at(-1).body.externalSystemId, side.externalSystemId);
    assert.deepEqual([...summaryOf(logs).changedFieldNames].sort(), side.changedFields);

    const before = cr.calls.length;
    await side.run(record);
    assert.equal(puts(cr).length, 2, "no change: no update");
    assert.equal(cr.calls.length, before, "no change: no CentralReach call");
  });

  test(`[${side.id}][1.10] ${side.label} update: a blank ${side.emailProperty} never clears CentralReach's primary email; the stored email is sent back`, async () => {
    const { cr } = linkedSide(side);
    const record = side.record({ [side.emailProperty]: "first@example.com" });
    assert.equal((await side.run(record)).status, "success");

    record.properties[side.emailProperty] = "  ";
    assert.equal((await side.run(record)).status, "success");
    assert.equal(puts(cr).at(-1).body.primaryEmail, "stored@example.com");
  });

  test(`[${side.id}][1.10] ${side.label} update: a filled ${side.emailProperty} that is not an email ends as error with no update (decision 43)`, async () => {
    const { cr } = linkedSide(side);
    const record = side.record({ [side.emailProperty]: "first@example.com" });
    assert.equal((await side.run(record)).status, "success");

    record.properties[side.emailProperty] = "not-an-email";
    assert.equal((await side.run(record)).status, "error");
    assert.equal(puts(cr).length, 1);
    assert.equal(record.properties.last_sync_error, `Unreadable value: ${side.emailProperty}`);
  });

  test(`[${side.id}][1.10] ${side.label} update: CentralReach refusing the new email (a 400 or 409, as for an email another contact holds) ends as error`, async () => {
    for (const status of [400, 409]) {
      const { cr } = linkedSide(side);
      const record = side.record({ [side.emailProperty]: "first@example.com" });
      assert.equal((await side.run(record)).status, "success");

      record.properties[side.emailProperty] = "taken@example.com";
      cr.fail(EMPLOYEE_PUT, httpError(status, { data: { message: "Email already in use" } }));
      const result = await side.run(record);
      assert.equal(result.status, "error", String(status));
      assert.equal(record.properties.last_sync_status, "error", String(status));
      assert.equal(
        record.properties.last_sync_error,
        `CentralReach rejected the request (${status}).`,
        String(status)
      );
      assert.equal(puts(cr).length, 2, `${status}: one refused update, no retry`);
    }
  });
}

test("[B4][1.10] the BCBA primaryEmail is the BCBA record's own email; ucaba_email_address is not read", async () => {
  const { cr } = setup();
  seedStoredEmployee(cr, "5002", "WD2");
  const record = stage3Bcba({ email: "own@uca.example", ucaba_email_address: "other@uca.example" });
  const run = SIDES.find((side) => side.id === "B4").run;
  assert.equal((await run(record)).status, "success");
  assert.equal(puts(cr).at(-1).body.primaryEmail, "own@uca.example");
});
