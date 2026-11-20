// Stage 3, lane B review fixes B-R1 to B-R7 (BUILD-PLAN.md section 11; rules 5.2, 5.6, 5.8).
//   B-R1  a clear is not lost after a run that failed halfway (inProgressFieldHashes)
//   B-R2  an employee read with no `contact` object sends no update
//   B-R3  a mapping version change keeps the old hashes for the clear decision
//   B-R4  a status HubSpot already shows is not written again
//   B-R5  labelsPending survives a failed link save after a create
//   B-R6  a pending-create marker with no time is stamped, not cleared
//   B-R7  a Case lookup failure inside createOrUpdateClient clears the pending marker
// Guide: Change detection Architecture tab ("Save synced state only after required updates
// succeed"; "Distinguish an intentional blank from a failed or unauthorized read"; "a record with
// no change writes nothing"); [G17]; [G19].
// Only HubSpot is faked unless a test says so. The mapper, the validator, the hash,
// cosmosState.mjs (in-memory container) and centralReachClient.mjs (fake HTTP adapter) are real.
// No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_CLIENT_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import {
  EMPLOYEE_CREATE_TURNED_OFF,
  RETRIES_USED_UP,
  WORKDAY_ALREADY_IN_CENTRALREACH,
  WORKDAY_ID_MISMATCH,
  centralReachRejected,
  crIdNotDigits,
  unreadableCentralReachAnswer
} from "../../constants/syncReasons.mjs";
import { MAPPING_VERSION, fieldHashes } from "../../lib/mappedState.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  clientWorkflowDeps,
  employeeWorkflowDeps,
  httpError,
  timeoutError,
  workflowConfig
} from "./stage2Fakes.mjs";
import {
  BT_LINK,
  CASE_LINK,
  METADATA_DELETE,
  METADATA_PUT,
  NOTHING_POSTED_CONFIRMED,
  STORED_EMPLOYEE,
  counters,
  fakeLabelSender,
  linkedBt,
  linkedCase,
  seedEmployee,
  seedStoredEmployee,
  setup,
  stage3Bt,
  stage3Case,
  testClock
} from "./stage3WorkerFakes.mjs";

const SEVERITY = CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL;
const EMPLOYEE_PUT = "PUT /contacts/employee/{id}";
const CLIENT_PUT = "PUT /contacts/client/{id}";
const OLD_VERSION = "hybrid-2026-10-27";
const BLANK_HASH = fieldHashes({ field: null }).field;
const CREATE_OFF = workflowConfig({ features: { allowEmployeeCreate: false, putOnlyMode: true } });

function link(container, key) {
  return container.get(key.pk, key.id)?.data || null;
}

function fieldIdsOf(calls, name) {
  return calls
    .filter((call) => call.name === name)
    .map((call) => Number(call.url.split("/").at(-1)));
}

function lastBody(cr, name) {
  return cr.calls.filter((call) => call.name === name).at(-1).body;
}

function runCase(record, extra = {}, input = {}) {
  return runClientSyncWorkflow(
    { dealId: "deal-1", ...input },
    { ...clientWorkflowDeps({ record }), ...extra }
  );
}

function runBt(record, extra = {}, input = {}) {
  const { config, logs, ...deps } = extra;
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt", ...input },
    { ...employeeWorkflowDeps({ record, ...(config ? { config } : {}), ...(logs ? { logs } : {}) }), ...deps }
  );
}

// The run reaches CentralReach, then the HubSpot status writeback fails.
const failingCaseWriteback = {
  updateDealProperties: async () => {
    throw httpError(502);
  }
};
const failingEmployeeWriteback = {
  writeEmployeeWriteback: async () => {
    throw httpError(502);
  }
};

function statusWrites(record, from = 0) {
  return record.writes.slice(from).filter((write) => write.last_sync_status !== undefined);
}

// --- B-R1 ---

test("[BR16][3.8] Case: a metadata value written by a run that then failed is cleared when HubSpot is blank again", async () => {
  const { container, cr } = setup();
  // Guide stored values of severity_level_clinical: Level 1, Level 2, Level 3.
  const record = linkedCase(cr, { severity_level_clinical: "" });
  const count = counters({ container, cr, record });
  await runCase(record);

  // "Level 2" reaches CentralReach, then the run fails at the HubSpot writeback.
  record.properties.severity_level_clinical = "Level 2";
  let start = count.mark();
  await assert.rejects(runCase(record, failingCaseWriteback));
  assert.deepEqual(fieldIdsOf(count.since(start).crCalls, METADATA_PUT), [SEVERITY]);
  assert.equal(link(container, CASE_LINK).clean, false);
  assert.notEqual(link(container, CASE_LINK).inProgressFieldHashes[`metadata.${SEVERITY}`], BLANK_HASH);
  // The last clean copy still says blank.
  assert.equal(link(container, CASE_LINK).fieldHashes[`metadata.${SEVERITY}`], BLANK_HASH);

  // HubSpot is blank again: the clear is sent.
  record.properties.severity_level_clinical = "";
  start = count.mark();
  const result = await runCase(record);
  assert.equal(result.status, "success");
  assert.deepEqual(fieldIdsOf(count.since(start).crCalls, METADATA_DELETE), [SEVERITY]);
  // The clean save drops the in-progress hashes.
  assert.equal(link(container, CASE_LINK).inProgressFieldHashes, null);
  assert.equal(link(container, CASE_LINK).clean, true);

  start = count.mark();
  const again = await runCase(record);
  assert.equal(again.operation, "noop");
  assert.deepEqual(count.since(start).crCalls, []);
});

test("[BR16][3.8] Case: the written value is still cleared when a second run fails before it can send the clear", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { severity_level_clinical: "" });
  const count = counters({ container, cr, record });
  await runCase(record);

  record.properties.severity_level_clinical = "Level 2";
  await assert.rejects(runCase(record, failingCaseWriteback));

  // Blank again, but this run fails at the client update, before any metadata call.
  record.properties.severity_level_clinical = "";
  cr.fail(CLIENT_PUT, httpError(429, { headers: { "retry-after": "120" } }));
  let start = count.mark();
  await assert.rejects(runCase(record));
  assert.deepEqual(fieldIdsOf(count.since(start).crCalls, METADATA_DELETE), []);

  start = count.mark();
  await runCase(record);
  assert.deepEqual(fieldIdsOf(count.since(start).crCalls, METADATA_DELETE), [SEVERITY]);
});

test("[BR16][3.13] BT/RBT: a core value written by a run that then failed is sent blank when HubSpot is blank again, not sent back from CentralReach", async () => {
  const { container, cr } = setup();
  seedStoredEmployee(cr, "5001", "WD1");
  const record = stage3Bt({ employee_id: "5001", home_apt: "" });
  await runBt(record);
  assert.equal(lastBody(cr, EMPLOYEE_PUT).addressLine2, STORED_EMPLOYEE.addressLine2);

  // "Apt 9" reaches CentralReach, then the run fails at the HubSpot writeback.
  record.properties.home_apt = "Apt 9";
  await assert.rejects(runBt(record, failingEmployeeWriteback));
  assert.equal(lastBody(cr, EMPLOYEE_PUT).addressLine2, "Apt 9");
  assert.equal(link(container, BT_LINK).clean, false);

  // CentralReach now holds "Apt 9", written by the integration.
  cr.employees.get("5001").addressLine2 = "Apt 9";
  record.properties.home_apt = "";
  const result = await runBt(record);
  assert.equal(result.status, "success");
  const body = lastBody(cr, EMPLOYEE_PUT);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "addressLine2"), true);
  assert.equal(body.addressLine2, null);
  assert.equal(link(container, BT_LINK).inProgressFieldHashes, null);
});

test("[BR16][3.13] BT/RBT: a core value sent by a create whose run then failed is sent blank when HubSpot is blank on the retry", async () => {
  const { cr } = setup();
  const record = stage3Bt({ home_apt: "Unit 9" });
  // The create succeeds; the run then fails at a metadata field.
  cr.fail(METADATA_PUT, httpError(429, { headers: { "retry-after": "120" } }));
  await assert.rejects(runBt(record), (error) => error.code === "METADATA_WRITE_FAILED");
  assert.equal(cr.employees.size, 1);

  record.properties.home_apt = "";
  await runBt(record);
  const body = lastBody(cr, EMPLOYEE_PUT);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "addressLine2"), true);
  assert.equal(body.addressLine2, null);
});

test("[BR16][3.13] BT/RBT: in-progress hashes of one CR ID do not count for another", async () => {
  const { cr } = setup();
  seedStoredEmployee(cr, "5001", "WD1");
  const record = stage3Bt({ employee_id: "5001", home_apt: "Apt 9" });
  await assert.rejects(runBt(record, failingEmployeeWriteback));

  // Staff point the record at another employee. The integration wrote nothing there.
  seedStoredEmployee(cr, "7777", "WD1", { addressLine2: "Suite 12" });
  record.properties.employee_id = "7777";
  record.properties.home_apt = "";
  await runBt(record);
  assert.equal(lastBody(cr, EMPLOYEE_PUT).addressLine2, "Suite 12");
});

// --- B-R2 ---

test("[BR16][3.13] an employee read that carries no contact object sends no update and ends as error with no retry", async () => {
  const { cr } = setup();
  seedStoredEmployee(cr, "5001", "WD1");
  const record = stage3Bt({ employee_id: "5001", home_apt: "" });
  // The fields sit at the top level only. The reader in centralReachClient.mjs accepts that.
  cr.answer("GET /contacts/employee/{id}", {
    contactId: "5001",
    externalSystemId: "WD1",
    primaryEmail: "stored@example.com",
    ...STORED_EMPLOYEE
  });
  const logs = [];

  const result = await runBt(record, { logs });

  assert.equal(result.status, "error");
  assert.equal(cr.count(EMPLOYEE_PUT), 0);
  assert.equal(cr.writes().length, 0);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(
    record.properties.last_sync_error,
    unreadableCentralReachAnswer("GET /contacts/employee/{id}", "contact")
  );
  // Decision 4: the log describes the answer by field names and types, never by a value.
  const shape = logs.find((entry) => entry.message === "CentralReach answer could not be read.");
  assert.equal(Boolean(shape), true);
  const text = JSON.stringify(logs);
  assert.equal(text.includes("stored@example.com"), false);
  assert.equal(text.includes(STORED_EMPLOYEE.addressLine1), false);
});

// --- B-R3 ---

test("[BR16][3.7] Case: after a mapping version change every field is sent once, and a field the old mapping filled that HubSpot now leaves blank is cleared", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { severity_level_clinical: "Level 2" });
  const count = counters({ container, cr, record });
  let start = count.mark();
  await runCase(record);
  const firstPuts = fieldIdsOf(count.since(start).crCalls, METADATA_PUT);

  link(container, CASE_LINK).mappingVersion = OLD_VERSION;
  record.properties.severity_level_clinical = "";
  start = count.mark();
  const result = await runCase(record);
  const done = count.since(start);

  assert.equal(result.status, "success");
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_DELETE), [SEVERITY]);
  // Every other field is sent once, as row 3.7 says.
  assert.deepEqual(
    fieldIdsOf(done.crCalls, METADATA_PUT).sort(),
    firstPuts.filter((fieldId) => fieldId !== SEVERITY).sort()
  );
  assert.equal(link(container, CASE_LINK).mappingVersion, MAPPING_VERSION);
});

test("[BR16][3.7] BT/RBT: after a mapping version change a core field the integration wrote and HubSpot now leaves blank is sent blank", async () => {
  const { container, cr } = setup();
  seedStoredEmployee(cr, "5001", "WD1");
  const record = stage3Bt({ employee_id: "5001", home_apt: "Unit 9" });
  await runBt(record);

  link(container, BT_LINK).mappingVersion = OLD_VERSION;
  record.properties.home_apt = "";
  await runBt(record);

  const body = lastBody(cr, EMPLOYEE_PUT);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "addressLine2"), true);
  assert.equal(body.addressLine2, null);
});

test("[BR16][3.7] Case: an omitted field keeps its saved hash across a mapping version change, so the later blank is still cleared", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { severity_level_clinical: "Level 2" });
  const count = counters({ container, cr, record });
  await runCase(record);
  const hashAfterSync = link(container, CASE_LINK).fieldHashes[`metadata.${SEVERITY}`];

  link(container, CASE_LINK).mappingVersion = OLD_VERSION;
  record.properties.severity_level_clinical = "";
  let start = count.mark();
  await runCase(record, { omitFieldIds: [SEVERITY] });
  assert.deepEqual(fieldIdsOf(count.since(start).crCalls, METADATA_DELETE), []);
  assert.equal(link(container, CASE_LINK).fieldHashes[`metadata.${SEVERITY}`], hashAfterSync);

  start = count.mark();
  await runCase(record);
  assert.deepEqual(fieldIdsOf(count.since(start).crCalls, METADATA_DELETE), [SEVERITY]);
});

// --- B-R4 ---

test("[BR14][3.7] an unlinked waiting BT/RBT is not written again while its status and reason stay the same; a new reason is written", async () => {
  const { cr } = setup();
  // An employee already in CentralReach holds this Workday ID, and no HubSpot record holds it.
  seedEmployee(cr, "6001", "WD1");
  const record = stage3Bt();

  await runBt(record);
  assert.equal(record.properties.last_sync_status, "waiting");
  assert.equal(record.properties.last_sync_error, WORKDAY_ALREADY_IN_CENTRALREACH);
  const writesAfterFirst = record.writes.length;

  await runBt(record);
  await runBt(record);
  assert.equal(record.writes.length, writesAfterFirst);

  // The Workday ID is removed and creates are turned off: same status, another reason.
  record.properties.workday_id = "";
  await runBt(record, { config: CREATE_OFF });
  assert.equal(record.writes.length, writesAfterFirst + 1);
  assert.equal(record.properties.last_sync_status, "waiting");
  assert.equal(record.properties.last_sync_error, EMPLOYEE_CREATE_TURNED_OFF);
});

test("[BR14][3.7] the employee ID-mismatch error is written once, not on every run", async () => {
  const { cr } = setup();
  seedEmployee(cr, "5001", "SOMEONE-ELSE");
  const record = stage3Bt({ employee_id: "5001" });

  await runBt(record);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, WORKDAY_ID_MISMATCH);
  const writesAfterFirst = record.writes.length;

  await runBt(record);
  await runBt(record);
  assert.equal(record.writes.length, writesAfterFirst);
  assert.equal(cr.count(EMPLOYEE_PUT), 0);
});

test("[BR14][3.7] the digits-only error is written once, for a Case and for a BT/RBT", async () => {
  setup();
  const caseRecord = stage3Case({ client_id_number: "12a4" });
  await runCase(caseRecord);
  assert.equal(caseRecord.properties.last_sync_error, crIdNotDigits("client_id_number"));
  await runCase(caseRecord);
  await runCase(caseRecord);
  assert.equal(caseRecord.writes.length, 1);

  const bt = stage3Bt({ employee_id: "12a4" });
  await runBt(bt);
  assert.equal(bt.properties.last_sync_error, crIdNotDigits("employee_id"));
  await runBt(bt);
  await runBt(bt);
  assert.equal(bt.writes.length, 1);
});

test("[BR14][3.7] a permanent failure is written once, for a Case and for a BT/RBT; another status code is written", async () => {
  const { cr } = setup();
  const caseRecord = linkedCase(cr);
  cr.fail(CLIENT_PUT, httpError(400), { times: 3 });
  for (let run = 0; run < 3; run += 1) {
    assert.equal((await runCase(caseRecord)).status, "error");
  }
  assert.equal(caseRecord.properties.last_sync_error, centralReachRejected(400));
  assert.equal(statusWrites(caseRecord).length, 1);
  assert.equal(caseRecord.writes.length, 1);

  // The reason changes: it is written.
  cr.fail(CLIENT_PUT, httpError(422));
  await runCase(caseRecord);
  assert.equal(caseRecord.properties.last_sync_error, centralReachRejected(422));
  assert.equal(caseRecord.writes.length, 2);

  const bt = linkedBt(cr);
  cr.fail(EMPLOYEE_PUT, httpError(400), { times: 3 });
  for (let run = 0; run < 3; run += 1) {
    assert.equal((await runBt(bt)).status, "error");
  }
  assert.equal(bt.properties.last_sync_error, centralReachRejected(400));
  assert.equal(bt.writes.length, 1);
});

test("[BR14][3.7] \"Retries used up\" is written once when a later message for the record fails the same way", async () => {
  const { cr } = setup();
  const record = linkedBt(cr);
  for (let run = 0; run < 2; run += 1) {
    cr.fail(EMPLOYEE_PUT, httpError(429, { headers: { "retry-after": "120" } }));
    await assert.rejects(runBt(record, {}, { lastAttempt: true }));
  }
  assert.equal(record.properties.last_sync_error, RETRIES_USED_UP);
  assert.equal(statusWrites(record).length, 1);
});

test("[BR13][3.7] a decided error whose status HubSpot already shows still writes the CR ID and the link when HubSpot lacks them", async () => {
  const { cr } = setup();
  seedEmployee(cr, "5001", "SOMEONE-ELSE");
  const record = stage3Bt({ employee_id: "5001" });
  await runBt(record);
  assert.equal(record.properties.last_sync_error, WORKDAY_ID_MISMATCH);

  // HubSpot lost the CR ID; Cosmos still holds it.
  record.properties.employee_id = "";
  const before = record.writes.length;
  await runBt(record);

  assert.equal(record.writes.length, before + 1);
  const write = record.writes.at(-1);
  assert.equal(write.employee_id, "5001");
  assert.equal(Object.prototype.hasOwnProperty.call(write, "last_sync_status"), false);
});

// --- B-R5 ---

test("[BR19][L.2] BT/RBT: when the link save right after a create fails, labelsPending is still saved (sender faked on the retry)", async () => {
  const { container, cr } = setup();
  const record = stage3Bt();
  let failed = false;
  container.beforeWrite = (operation, doc) => {
    if (!failed && doc.pk === BT_LINK.pk && doc.data?.crContactId) {
      failed = true;
      throw Object.assign(new Error("Cosmos answered 503"), { code: 503 });
    }
  };

  await assert.rejects(runBt(record));
  assert.equal(cr.count("POST /contacts/employee"), 1);
  const createdId = Array.from(cr.employees.keys())[0];
  const saved = link(container, BT_LINK);
  assert.equal(saved.crContactId, createdId);
  assert.equal(saved.labelsPending, true);
  assert.equal(saved.labelsPendingContactId, createdId);

  const sender = fakeLabelSender([NOTHING_POSTED_CONFIRMED]);
  await runBt(record, { updateClientMetadata: sender.updateClientMetadata });
  assert.equal(sender.calls[0].options.contactCreatedThisRun, true);
  assert.equal(cr.count("POST /contacts/employee"), 1);
});

test("[BR19][L.2] Case: when the link save right after a create fails, labelsPending is still saved (sender faked on the retry)", async () => {
  const { container, cr } = setup();
  const record = stage3Case();
  let failed = false;
  container.beforeWrite = (operation, doc) => {
    if (!failed && doc.pk === CASE_LINK.pk && doc.data?.crContactId) {
      failed = true;
      throw Object.assign(new Error("Cosmos answered 503"), { code: 503 });
    }
  };

  await assert.rejects(runCase(record));
  assert.equal(cr.count("POST /contacts/client"), 1);
  const createdId = Array.from(cr.clients.keys())[0];
  const saved = link(container, CASE_LINK);
  assert.equal(saved.crContactId, createdId);
  assert.equal(saved.labelsPending, true);
  assert.equal(saved.labelsPendingContactId, createdId);

  const sender = fakeLabelSender([NOTHING_POSTED_CONFIRMED]);
  await runCase(record, { updateClientMetadata: sender.updateClientMetadata });
  assert.equal(sender.calls[0].options.contactCreatedThisRun, true);
  assert.equal(cr.count("POST /contacts/client"), 1);
});

// --- B-R6 ---

async function seedMarkerWithoutTime(container, key, externalSystemId) {
  await container.items.upsert({
    id: key.id,
    pk: key.pk,
    type: "link",
    ttl: -1,
    data: { pendingCreateExternalId: externalSystemId }
  });
}

test("[BR3][3.15] BT/RBT: a pending marker with no readable time is stamped with the current time and held for 15 minutes from there", async () => {
  const { container, cr } = setup();
  const clock = testClock("2026-11-20T15:00:00.000Z");
  await seedMarkerWithoutTime(container, BT_LINK, "WD1");
  const record = stage3Bt();
  const run = () => runBt(record, { now: clock.now });
  const pending = (error) => error.code === "CR_CREATE_PENDING";

  await assert.rejects(run(), pending);
  assert.equal(cr.count("POST /contacts/employee"), 0);
  assert.equal(link(container, BT_LINK).pendingCreateExternalId, "WD1");
  assert.equal(link(container, BT_LINK).pendingCreateSentAt, "2026-11-20T15:00:00.000Z");

  clock.advanceSeconds(14 * 60 + 59);
  await assert.rejects(run(), pending);
  assert.equal(link(container, BT_LINK).pendingCreateSentAt, "2026-11-20T15:00:00.000Z");
  assert.equal(cr.count("POST /contacts/employee"), 0);

  clock.advanceSeconds(1);
  const result = await run();
  assert.equal(result.operation, "create");
  assert.equal(cr.count("POST /contacts/employee"), 1);
});

test("[BR1][3.15] Case: a pending marker with no readable time is stamped with the current time and held for 15 minutes from there", async () => {
  const { container, cr } = setup();
  const clock = testClock("2026-11-20T15:00:00.000Z");
  await seedMarkerWithoutTime(container, CASE_LINK, "deal-1");
  const record = stage3Case();
  const run = () => runCase(record, { now: clock.now });
  const pending = (error) => error.code === "CR_CREATE_PENDING";

  await assert.rejects(run(), pending);
  assert.equal(cr.count("POST /contacts/client"), 0);
  assert.equal(link(container, CASE_LINK).pendingCreateSentAt, "2026-11-20T15:00:00.000Z");

  clock.advanceSeconds(15 * 60);
  const result = await run();
  assert.equal(result.operation, "create");
  assert.equal(cr.count("POST /contacts/client"), 1);
});

// --- B-R7 ---

// createOrUpdateClient is faked here: the two lookup codes come from inside lane L's function.
function failingUpsert(error) {
  return {
    createOrUpdateClient: async () => {
      throw error;
    }
  };
}

for (const code of ["CR_LOOKUP_UNKNOWN", "CR_LOOKUP_UNREADABLE"]) {
  test(`[BR1][3.15] Case: when createOrUpdateClient throws ${code}, no create was sent, so the pending marker is cleared (createOrUpdateClient faked)`, async () => {
    const { container } = setup();
    const clock = testClock();
    const record = stage3Case();
    const error = Object.assign(new Error("lookup failed"), { code });

    if (code === "CR_LOOKUP_UNKNOWN") {
      await assert.rejects(runCase(record, { ...failingUpsert(error), now: clock.now }), (thrown) => thrown === error);
    } else {
      const result = await runCase(record, { ...failingUpsert(error), now: clock.now });
      assert.equal(result.status, "error");
    }
    assert.equal(link(container, CASE_LINK).pendingCreateExternalId, null);
    assert.equal(link(container, CASE_LINK).pendingCreateSentAt, null);

    // The next run, one minute later, is not held back.
    clock.advanceSeconds(60);
    const result = await runCase(record, { now: clock.now });
    assert.equal(result.operation, "create");
  });
}

test("[BR1][3.15] Case: the pending marker is kept when createOrUpdateClient throws an unknown create outcome or an error with no code (createOrUpdateClient faked)", async () => {
  for (const error of [
    Object.assign(new Error("create timed out"), { code: "CR_CREATE_OUTCOME_UNKNOWN" }),
    new Error("socket hang up")
  ]) {
    const { container } = setup();
    const record = stage3Case();
    await assert.rejects(runCase(record, failingUpsert(error)), (thrown) => thrown === error);
    assert.equal(link(container, CASE_LINK).pendingCreateExternalId, "deal-1");
    assert.equal(typeof link(container, CASE_LINK).pendingCreateSentAt, "string");
  }
});
