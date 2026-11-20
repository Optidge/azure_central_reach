// Stage 3, row 3.7 (BUILD-PLAN.md section 11): a record with no change writes nothing.
// Guide: Change detection Architecture tab, 11/17 approved design ("a record with no change
// writes nothing") and [G17] (status values; the temporary External System ID check).
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { MAPPING_VERSION } from "../../lib/mappedState.mjs";
import {
  CHECKLIST_BLANK_WORKDAY,
  CHECKLIST_STILL_TEMPORARY,
  WAITING_FOR_WORKDAY_ID
} from "../../constants/syncReasons.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  BCBA_LINK,
  BT_LINK,
  CASE_LINK,
  EMPLOYEE_GET,
  METADATA_PUT,
  counters,
  countingClientDeps,
  countingEmployeeDeps,
  linkedBcba,
  linkedCase,
  seedEmployee,
  setup,
  stage3Bcba,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";

const STATUS_ONLY_KEYS = [
  "integration_last_write",
  "last_sync_at",
  "last_sync_error",
  "last_sync_status",
  "updated_by_integration"
];

function runCase(deps, input = {}) {
  return runClientSyncWorkflow({ dealId: "deal-1", source: "hubspotWorkflow", ...input }, deps);
}

function runBt(deps, input = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt", source: "hubspotWorkflow", ...input },
    deps
  );
}

function runBcba(deps, input = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS2", employeeType: "bcba", source: "hubspotWorkflow", ...input },
    deps
  );
}

function assertNothingWritten(done) {
  assert.deepEqual(done.crCalls.map((call) => call.name), []);
  assert.equal(done.hubspotWrites.length, 0);
  assert.equal(done.stateWrites.length, 0);
}

// --- Case ---

test("[BR14][3.7] a Case with no change is read once from HubSpot and once from Cosmos, and nothing is written", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const count = counters({ container, cr, record });
  const first = countingClientDeps({ record });
  assert.equal((await runCase(first.deps)).status, "success");
  // Row 3.7 removes the duplicate first read: a run that writes reads the Case twice (the read
  // and the confirm read), no longer three times.
  assert.equal(first.counts.caseReads, 2);

  const start = count.mark();
  const second = countingClientDeps({ record });
  const result = await runCase(second.deps);

  assert.equal(result.ok, true);
  assert.equal(result.operation, "noop");
  assert.equal(result.crContactId, "2001");
  assertNothingWritten(count.since(start));
  // HubSpot reads: the Case once (no confirm read) and its two association lists.
  assert.equal(second.counts.caseReads, 1);
  assert.equal(second.counts.associationReads, 2);
  assert.equal(second.counts.stateReads, 1);
  assert.equal(record.properties.last_sync_status, "success");
});

test("[BR9][3.7] noop is never written to HubSpot as a status, for a Case or an employee", async () => {
  const { cr } = setup();
  const caseRecord = linkedCase(cr);
  const bt = stage3Bt();
  for (let run = 0; run < 3; run += 1) {
    await runCase(countingClientDeps({ record: caseRecord }).deps);
    await runBt(countingEmployeeDeps({ record: bt }).deps);
  }
  const statuses = [...caseRecord.writes, ...bt.writes]
    .map((write) => write.last_sync_status)
    .filter((status) => status !== undefined);
  assert.equal(statuses.length > 0, true);
  assert.deepEqual([...new Set(statuses)], ["success"]);
});

test("[BR14][3.7] a Case with no change whose HubSpot status differs gets the status written, and nothing else", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const count = counters({ container, cr, record });
  await runCase(countingClientDeps({ record }).deps);
  // HubSpot shows an older failure; CentralReach and the saved copy already match HubSpot.
  record.properties.last_sync_status = "error";
  record.properties.last_sync_error = "Retries used up";

  const start = count.mark();
  await runCase(countingClientDeps({ record }).deps);
  const done = count.since(start);

  assert.deepEqual(done.crCalls, []);
  assert.equal(done.stateWrites.length, 0);
  assert.equal(done.hubspotWrites.length, 1);
  assert.deepEqual(Object.keys(done.hubspotWrites[0]).sort(), STATUS_ONLY_KEYS);
  assert.equal(done.hubspotWrites[0].last_sync_status, "success");
  assert.equal(done.hubspotWrites[0].last_sync_error, "");
  assert.equal(done.hubspotWrites[0].updated_by_integration, true);
});

test("[BR13][3.7] a Case with no change whose HubSpot record does not hold the CR ID gets the ID and the link written", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const count = counters({ container, cr, record });
  await runCase(countingClientDeps({ record }).deps);
  // Cosmos still holds the CR ID; HubSpot lost it.
  record.properties.client_id_number = "";

  const start = count.mark();
  await runCase(countingClientDeps({ record }).deps);
  const done = count.since(start);

  assert.equal(done.hubspotWrites.length, 1);
  assert.equal(done.hubspotWrites[0].client_id_number, "2001");
  assert.equal(
    done.hubspotWrites[0].central_reach_link_to_client,
    "https://members.centralreach.com/#contacts/details/?id=2001"
  );
  assert.deepEqual(done.crWrites, []);
  assert.equal(record.properties.client_id_number, "2001");
});

test("[BR14][3.7] saved Case hashes from another mapping version are dropped: every field is sent once, then the Case is a no-op again", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const count = counters({ container, cr, record });
  let start = count.mark();
  await runCase(countingClientDeps({ record }).deps);
  const firstRun = count.since(start);
  const firstMetadataPuts = firstRun.crCalls.filter((call) => call.name === METADATA_PUT).length;
  assert.equal(firstMetadataPuts >= 2, true);
  assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id).data.mappingVersion, MAPPING_VERSION);
  // The version changed in this stage, so hashes saved by the Stage 2 build are dropped too.
  assert.notEqual(MAPPING_VERSION, "hybrid-2026-10-27");

  // The saved copy was written by an older mapping.
  container.get(CASE_LINK.pk, CASE_LINK.id).data.mappingVersion = "hybrid-2026-10-27";
  start = count.mark();
  const resent = await runCase(countingClientDeps({ record }).deps);
  const secondRun = count.since(start);
  assert.equal(resent.status, "success");
  assert.equal(secondRun.crCalls.filter((call) => call.name === "PUT /contacts/client/{id}").length, 1);
  assert.equal(
    secondRun.crCalls.filter((call) => call.name === METADATA_PUT).length,
    firstMetadataPuts
  );
  assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id).data.mappingVersion, MAPPING_VERSION);

  start = count.mark();
  const third = await runCase(countingClientDeps({ record }).deps);
  assert.equal(third.operation, "noop");
  assertNothingWritten(count.since(start));
});

// --- Employees ---

test("[BR14][3.7] a BT/RBT whose status is success and that has no change makes zero CentralReach calls and writes nothing", async () => {
  const { container, cr } = setup();
  const record = stage3Bt();
  const count = counters({ container, cr, record });
  const first = countingEmployeeDeps({ record });
  const created = await runBt(first.deps);
  assert.equal(created.operation, "create");
  assert.equal(record.properties.last_sync_status, "success");
  // One read and the confirm read: the duplicate first read is gone.
  assert.equal(first.counts.recordReads, 2);

  const start = count.mark();
  const second = countingEmployeeDeps({ record });
  const result = await runBt(second.deps);

  assert.equal(result.ok, true);
  assert.equal(result.operation, "noop");
  assert.equal(result.crContactId, created.crContactId);
  assertNothingWritten(count.since(start));
  assert.equal(second.counts.recordReads, 1);
  assert.equal(second.counts.stateReads, 1);
});

test("[BR14][3.7] a BCBA whose status is success and that has no change makes zero CentralReach calls and writes nothing", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr);
  const count = counters({ container, cr, record });
  assert.equal((await runBcba(countingEmployeeDeps({ record }).deps)).status, "success");

  const start = count.mark();
  const result = await runBcba(countingEmployeeDeps({ record }).deps);
  assert.equal(result.operation, "noop");
  assertNothingWritten(count.since(start));
});

test("[BR10][3.7] a waiting BT/RBT with no change still gets its ID check, and its unchanged status is not written again", async () => {
  const { container, cr } = setup();
  // No Workday ID: created with the HubSpot record ID as the temporary External System ID.
  const record = stage3Bt({ workday_id: "" });
  const count = counters({ container, cr, record });
  const created = await runBt(countingEmployeeDeps({ record }).deps);
  assert.equal(record.properties.last_sync_status, "waiting");
  assert.equal(record.properties.last_sync_error, WAITING_FOR_WORKDAY_ID);

  let start = count.mark();
  await runBt(countingEmployeeDeps({ record }).deps);
  let done = count.since(start);
  assert.deepEqual(done.crCalls.map((call) => call.name), [EMPLOYEE_GET]);
  assert.equal(done.hubspotWrites.length, 0);
  assert.equal(done.stateWrites.length, 0);

  // Staff replace the temporary ID on the CentralReach profile. Nothing changes in HubSpot, so
  // only the ID check can see it: the status is written, and nothing is sent to CentralReach.
  cr.employees.get(created.crContactId).externalSystemId = "WD-FROM-STAFF";
  start = count.mark();
  await runBt(countingEmployeeDeps({ record }).deps);
  done = count.since(start);
  assert.deepEqual(done.crCalls.map((call) => call.name), [EMPLOYEE_GET]);
  assert.equal(done.stateWrites.length, 0);
  assert.equal(done.hubspotWrites.length, 1);
  assert.deepEqual(Object.keys(done.hubspotWrites[0]).sort(), STATUS_ONLY_KEYS);
  assert.equal(done.hubspotWrites[0].last_sync_status, "success");
  assert.equal(done.hubspotWrites[0].last_sync_error, "");
});

test("[BR10][3.7] an error BT/RBT whose updates continue does not send an unchanged update again", async () => {
  const { container, cr } = setup();
  const record = stage3Bt({ workday_id: "" });
  const count = counters({ container, cr, record });
  await runBt(countingEmployeeDeps({ record }).deps);

  // Guide appendix: "External System ID (Workday)" is stored as External System ID. Ticked while
  // CentralReach still holds the temporary ID: error, and the update is still sent (rule 5.4).
  record.properties.btrbt_in_cr_checklist = "External System ID";
  let start = count.mark();
  await runBt(countingEmployeeDeps({ record }).deps);
  let done = count.since(start);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, CHECKLIST_STILL_TEMPORARY);
  assert.equal(done.crWrites.some((call) => call.name === "PUT /contacts/employee/{id}"), true);

  start = count.mark();
  const again = await runBt(countingEmployeeDeps({ record }).deps);
  done = count.since(start);
  assert.equal(again.operation, "noop");
  assert.deepEqual(done.crCalls.map((call) => call.name), [EMPLOYEE_GET]);
  assert.equal(done.hubspotWrites.length, 0);
  assert.equal(done.stateWrites.length, 0);
});

test("[BR10][3.7] ticking the checklist on a success employee is a change, so the ID check runs and the status follows", async () => {
  const { container, cr } = setup();
  // CentralReach holds an ID that is not the temporary one; HubSpot has no Workday ID.
  seedEmployee(cr, "5001", "LEGACY7");
  const record = stage3Bt({ employee_id: "5001", workday_id: "" });
  const count = counters({ container, cr, record });
  await runBt(countingEmployeeDeps({ record }).deps);
  assert.equal(record.properties.last_sync_status, "success");

  record.properties.btrbt_in_cr_checklist = "External System ID";
  const start = count.mark();
  await runBt(countingEmployeeDeps({ record }).deps);
  const done = count.since(start);

  assert.equal(done.crCalls.some((call) => call.name === EMPLOYEE_GET), true);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, CHECKLIST_BLANK_WORKDAY);
});

test("[BR13][3.7] a BT/RBT with no change whose HubSpot record does not hold the CR ID gets the ID and the link written", async () => {
  const { container, cr } = setup();
  const record = stage3Bt();
  const count = counters({ container, cr, record });
  const created = await runBt(countingEmployeeDeps({ record }).deps);
  record.properties.employee_id = "";

  const start = count.mark();
  await runBt(countingEmployeeDeps({ record }).deps);
  const done = count.since(start);

  assert.equal(done.hubspotWrites.length, 1);
  assert.equal(done.hubspotWrites[0].employee_id, created.crContactId);
  assert.equal(
    done.hubspotWrites[0].central_reach_link_to_rt_rbt,
    `https://members.centralreach.com/#contacts/details/?id=${created.crContactId}`
  );
  assert.deepEqual(done.crWrites, []);
  // No second employee: the lookup and create path is not entered for a record Cosmos has linked.
  assert.equal(cr.employees.size, 1);
});

test("[BR14][3.7] saved BCBA hashes from another mapping version are dropped: every field is sent once, then the record is a no-op again", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, { medicaid_id__ny: "NY-0001", medicaid_id__nj: "NJ-0002" });
  const count = counters({ container, cr, record });
  let start = count.mark();
  await runBcba(countingEmployeeDeps({ record }).deps);
  const firstMetadataPuts = count
    .since(start)
    .crCalls.filter((call) => call.name === METADATA_PUT).length;
  assert.equal(firstMetadataPuts >= 2, true);

  container.get(BCBA_LINK.pk, BCBA_LINK.id).data.mappingVersion = "hybrid-2026-10-27";
  start = count.mark();
  await runBcba(countingEmployeeDeps({ record }).deps);
  const resent = count.since(start);
  assert.equal(resent.crCalls.filter((call) => call.name === "PUT /contacts/employee/{id}").length, 1);
  assert.equal(resent.crCalls.filter((call) => call.name === METADATA_PUT).length, firstMetadataPuts);
  assert.equal(container.get(BCBA_LINK.pk, BCBA_LINK.id).data.mappingVersion, MAPPING_VERSION);

  start = count.mark();
  const third = await runBcba(countingEmployeeDeps({ record }).deps);
  assert.equal(third.operation, "noop");
  assertNothingWritten(count.since(start));
});

test("[BR17][3.7] the saved employee state is built from HubSpot data only: the link record's hashes do not move when only CentralReach changes", async () => {
  const { container, cr } = setup();
  const record = stage3Bt();
  const created = await runBt(countingEmployeeDeps({ record }).deps);
  const saved = { ...container.get(BT_LINK.pk, BT_LINK.id).data.fieldHashes };
  // The checklist and the Workday ID are part of the compared state (rule 5.4).
  assert.equal(Object.keys(saved).some((name) => name.startsWith("identity.")), true);

  // CentralReach now holds another email; HubSpot is unchanged, and the status is success.
  cr.employees.get(created.crContactId).primaryEmail = "changed-in-cr@example.com";
  const result = await runBt(countingEmployeeDeps({ record }).deps);
  assert.equal(result.operation, "noop");
  assert.deepEqual(container.get(BT_LINK.pk, BT_LINK.id).data.fieldHashes, saved);
});
