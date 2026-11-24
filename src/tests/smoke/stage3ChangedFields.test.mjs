// Stage 3, rows 3.8 and 3.9 (BUILD-PLAN.md section 11).
// 3.8: only changed metadata fields are sent; all of them when there is no saved copy.
// 3.9: a change found by the poller or the daily sweep is logged by field name.
// Guide: Change detection Architecture tab ("Compare complete mapped state with last successfully
// synced state", "Save synced state only after required updates succeed") and section 11 ("Some
// mapped values change without anyone editing the field").
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CENTRAL_REACH_CLIENT_METADATA_FIELDS,
  CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS
} from "../../constants/centralReach.mjs";
import { CHANGE_NOT_FROM_WEBHOOK } from "../../lib/mappedState.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { clientWorkflowDeps, employeeWorkflowDeps, httpError } from "./stage2Fakes.mjs";
import {
  METADATA_DELETE,
  METADATA_PUT,
  counters,
  linkedCase,
  setup,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";

const SEVERITY = CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL;
const POLICY_HOLDER = CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_NAME;
const ACTIVE_CASES = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.ACTIVE_CASE_COUNT;
const ADDRESS_2 = CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS_2;

function runCase(record, { source = "hubspotWorkflow", logs = [] } = {}) {
  return runClientSyncWorkflow({ dealId: "deal-1", source }, clientWorkflowDeps({ record, logs }));
}

function runBt(record, { source = "hubspotWorkflow", logs = [] } = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt", source },
    employeeWorkflowDeps({ record, logs })
  );
}

function fieldIdsOf(calls, name) {
  return calls
    .filter((call) => call.name === name)
    .map((call) => Number(call.url.split("/").at(-1)));
}

// --- Row 3.8 ---

test("[BR14][3.8] a Case with no saved copy gets every filled metadata field; then one changed field makes one metadata call", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const count = counters({ container, cr, record });

  let start = count.mark();
  await runCase(record);
  const firstFields = fieldIdsOf(count.since(start).crCalls, METADATA_PUT);
  assert.equal(firstFields.includes(SEVERITY), true);
  assert.equal(firstFields.includes(POLICY_HOLDER), true);

  // Guide stored values of severity_level_clinical: Level 1, Level 2, Level 3.
  record.properties.severity_level_clinical = "Level 2";
  start = count.mark();
  const result = await runCase(record);
  const done = count.since(start);

  assert.equal(result.status, "success");
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_PUT), [SEVERITY]);
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_DELETE), []);
  const put = done.crCalls.find((call) => call.name === METADATA_PUT);
  // Package item 8: Severity is sent as the digit alone.
  assert.deepEqual(put.body, { inputValue: "2" });
});

test("[BR16][3.8] a Case metadata field that is blanked in HubSpot sends one clear and no other metadata call", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const count = counters({ container, cr, record });
  await runCase(record);

  record.properties.severity_level_clinical = "";
  const start = count.mark();
  await runCase(record);
  const done = count.since(start);

  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_DELETE), [SEVERITY]);
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_PUT), []);
});

// Item 5, question 7 (decided 2026-11-24): a junk Address 2 (only commas and a state) is null.
test("[C25][4.22] a junk Service Location Address 2 clears the value the integration wrote before, and sends no clear when nothing was written", async () => {
  const junk = ",  , New York ";
  const written = setup();
  const record = linkedCase(written.cr, {
    specific_home_location: "More Than One Location",
    service_address__other: "12 Oak St, Albany, NY 12207"
  });
  const count = counters({ container: written.container, cr: written.cr, record });
  const first = count.mark();
  await runCase(record);
  assert.equal(fieldIdsOf(count.since(first).crCalls, METADATA_PUT).includes(ADDRESS_2), true);
  record.properties.service_address__other = junk;
  const start = count.mark();
  await runCase(record);
  assert.deepEqual(fieldIdsOf(count.since(start).crCalls, METADATA_DELETE), [ADDRESS_2]);

  const fresh = setup();
  const junkRecord = linkedCase(fresh.cr, {
    specific_home_location: "More Than One Location",
    service_address__other: junk
  });
  const freshCount = counters({ container: fresh.container, cr: fresh.cr, record: junkRecord });
  const freshStart = freshCount.mark();
  await runCase(junkRecord);
  const done = freshCount.since(freshStart).crCalls;
  assert.equal(fieldIdsOf(done, METADATA_DELETE).includes(ADDRESS_2), false);
  assert.equal(fieldIdsOf(done, METADATA_PUT).includes(ADDRESS_2), false);
});

test("[BR17][3.8] after a Case run that failed halfway, every metadata field is sent again, also a field that was changed back", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const count = counters({ container, cr, record });
  let start = count.mark();
  await runCase(record);
  const firstFields = fieldIdsOf(count.since(start).crCalls, METADATA_PUT).sort();

  // Level 2 reaches CentralReach, then the run fails: the saved copy still says Level 1.
  record.properties.severity_level_clinical = "Level 2";
  record.properties.policy_holder_name = "Sam Rivera";
  cr.fail(METADATA_PUT, httpError(429, { headers: { "retry-after": "120" } }), {
    times: 1,
    afterHandling: true
  });
  await assert.rejects(runCase(record), (error) => error.code === "METADATA_WRITE_FAILED");

  // HubSpot is changed back to what the saved copy holds. CentralReach may hold Level 2 or
  // "Sam Rivera" now, so the saved copy cannot be trusted and everything is sent.
  record.properties.severity_level_clinical = "Level 1";
  record.properties.policy_holder_name = "Jordan Rivera";
  start = count.mark();
  const result = await runCase(record);
  const done = count.since(start);

  assert.equal(result.status, "success");
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_PUT).sort(), firstFields);
});

test("[BR14][3.8] one changed BT/RBT metadata field makes one metadata call", async () => {
  const { container, cr } = setup();
  const record = stage3Bt();
  const count = counters({ container, cr, record });
  let start = count.mark();
  await runBt(record);
  const firstFields = fieldIdsOf(count.since(start).crCalls, METADATA_PUT);
  assert.equal(firstFields.includes(ACTIVE_CASES), true);
  assert.equal(firstFields.length >= 2, true);

  record.properties.active_cases_count = "3";
  start = count.mark();
  const result = await runBt(record);
  const done = count.since(start);

  assert.equal(result.status, "success");
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_PUT), [ACTIVE_CASES]);
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_DELETE), []);
});

test("[BR17][3.8] after a BT/RBT run that failed halfway, every metadata field is sent again", async () => {
  const { container, cr } = setup();
  const record = stage3Bt();
  const count = counters({ container, cr, record });
  let start = count.mark();
  await runBt(record);
  const firstFields = fieldIdsOf(count.since(start).crCalls, METADATA_PUT).sort();

  record.properties.active_cases_count = "3";
  cr.fail(METADATA_PUT, httpError(429, { headers: { "retry-after": "120" } }), {
    times: 1,
    afterHandling: true
  });
  await assert.rejects(runBt(record), (error) => error.code === "METADATA_WRITE_FAILED");

  record.properties.active_cases_count = "2";
  start = count.mark();
  await runBt(record);
  assert.deepEqual(fieldIdsOf(count.since(start).crCalls, METADATA_PUT).sort(), firstFields);
});

// --- Row 3.9 ---

function changeLogs(logs) {
  return logs.filter((entry) => entry.message === CHANGE_NOT_FROM_WEBHOOK);
}

for (const source of ["intakePoller", "dailySweep"]) {
  test(`[BR18][3.9] a Case change found by ${source} is logged by field name, never by value`, async () => {
    const { cr } = setup();
    const record = linkedCase(cr);
    await runCase(record);

    // Guide stored values of phi_gender: male, female.
    record.properties.phi_gender = "female";
    record.properties.severity_level_clinical = "Level 3";
    record.properties.guardian_last_name = "Okonkwo";
    const logs = [];
    await runCase(record, { source, logs });

    const found = changeLogs(logs);
    assert.equal(found.length, 1);
    assert.equal(found[0].meta.source, source);
    assert.deepEqual(found[0].meta.changedFieldNames, [
      "core.Gender",
      "core.GuardianLastName",
      `metadata.${SEVERITY}`
    ]);
    const text = JSON.stringify(found[0]);
    for (const value of ["female", "Female", "Level 3", "Okonkwo"]) {
      assert.equal(text.includes(value), false);
    }
  });
}

test("[BR18][3.9] a Case change delivered by a webhook, and a poller run that finds no change, are not logged as found by the backup path", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  await runCase(record);

  record.properties.phi_gender = "female";
  const webhookLogs = [];
  await runCase(record, { source: "hubspotWorkflow", logs: webhookLogs });
  assert.equal(changeLogs(webhookLogs).length, 0);

  const pollerLogs = [];
  const result = await runCase(record, { source: "intakePoller", logs: pollerLogs });
  assert.equal(result.operation, "noop");
  assert.equal(changeLogs(pollerLogs).length, 0);
});

for (const source of ["employeePoller", "dailySweep"]) {
  test(`[BR18][3.9] a BT/RBT change found by ${source} is logged by field name, never by value`, async () => {
    const { cr } = setup();
    const record = stage3Bt();
    await runBt(record);
    assert.equal(cr.employees.size, 1);

    record.properties.last_name = "Okonkwo";
    record.properties.active_cases_count = "7";
    const logs = [];
    await runBt(record, { source, logs });

    const found = changeLogs(logs);
    assert.equal(found.length, 1);
    assert.equal(found[0].meta.source, source);
    assert.deepEqual(found[0].meta.changedFieldNames, [
      "employee.lastName",
      `metadata.${ACTIVE_CASES}`
    ]);
    const text = JSON.stringify(found[0]);
    assert.equal(text.includes("Okonkwo"), false);
    assert.equal(text.includes('"7"'), false);
  });
}

test("[BR18][3.9] a BT/RBT change delivered by a webhook is not logged as found by the backup path", async () => {
  setup();
  const record = stage3Bt();
  await runBt(record);

  record.properties.last_name = "Okonkwo";
  const logs = [];
  await runBt(record, { source: "hubspotWorkflow", logs });
  assert.equal(changeLogs(logs).length, 0);
});
