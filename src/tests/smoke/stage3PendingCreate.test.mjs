// Stage 3, row 3.15 (BUILD-PLAN.md section 11; decision 34; risk R-24; Stage 2 row 2.3): after a
// create with an unknown result, the next run must not create again too soon. The pending
// External System ID is kept with the time the create was sent. A lookup that answers "not found"
// less than 15 minutes after that time leads to a retry, not to a second create.
// Guide: [G17] ("An unclear answer from CR never leads to a create"; "a person who is already in
// CentralReach is not created again") and [GBR] Requirement 1.
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. The clock is passed in as
// `dependencies.now`. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { RETRIES_USED_UP } from "../../constants/syncReasons.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  clientWorkflowDeps,
  employeeWorkflowDeps,
  httpError,
  timeoutError
} from "./stage2Fakes.mjs";
import {
  BT_LINK,
  CASE_LINK,
  setup,
  stage3Bt,
  stage3Case,
  testClock
} from "./stage3WorkerFakes.mjs";

const EMPLOYEE_POST = "POST /contacts/employee";
const CLIENT_POST = "POST /contacts/client";
const START = "2026-11-20T15:00:00.000Z";

function runBt(record, clock, input = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt", ...input },
    { ...employeeWorkflowDeps({ record }), now: clock.now }
  );
}

function runCase(record, clock, input = {}) {
  return runClientSyncWorkflow(
    { dealId: "deal-1", ...input },
    { ...clientWorkflowDeps({ record }), now: clock.now }
  );
}

function link(container, key) {
  return container.get(key.pk, key.id)?.data || null;
}

const unknownCreate = (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN";
const stillPending = (error) => error.code === "CR_CREATE_PENDING";

function statusWrites(record) {
  return record.writes.filter((write) => write.last_sync_status !== undefined);
}

test("[BR3][3.15] CR_CREATE_PENDING is a temporary failure", () => {
  const error = Object.assign(new Error("CreateStillPending"), { code: "CR_CREATE_PENDING" });
  assert.equal(classifyFailure(error), FAILURE_KINDS.TEMPORARY);
});

// --- Employees ---

test("[BR3][3.15] BT/RBT: a create that timed out, lookup 404 one minute later: no second create, and the run is retried", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Bt();

  // The create is sent and its answer never arrives. CentralReach does not show the employee.
  cr.fail(EMPLOYEE_POST, timeoutError());
  await assert.rejects(runBt(record, clock), unknownCreate);
  assert.equal(link(container, BT_LINK).pendingCreateExternalId, "WD1");
  assert.equal(link(container, BT_LINK).pendingCreateSentAt, START);

  clock.advanceSeconds(60);
  let thrown = null;
  await assert.rejects(runBt(record, clock), (error) => {
    thrown = error;
    return stillPending(error);
  });
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  // The marker and its time stay; HubSpot keeps its status while the retries run.
  assert.equal(link(container, BT_LINK).pendingCreateExternalId, "WD1");
  assert.equal(link(container, BT_LINK).pendingCreateSentAt, START);
  assert.equal(statusWrites(record).length, 0);

  // Still inside the window one second before the 15 minutes are over.
  clock.advanceSeconds(13 * 60 + 59);
  await assert.rejects(runBt(record, clock), stillPending);
  assert.equal(cr.count(EMPLOYEE_POST), 1);
});

test("[BR3][3.15] BT/RBT: lookup 404 at 15 minutes: the marker is cleared and one create is sent", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Bt();
  cr.fail(EMPLOYEE_POST, timeoutError());
  await assert.rejects(runBt(record, clock), unknownCreate);

  clock.advanceSeconds(15 * 60);
  const result = await runBt(record, clock);

  assert.equal(result.operation, "create");
  assert.equal(result.status, "success");
  // The first POST, which CentralReach never stored, and this one.
  assert.equal(cr.count(EMPLOYEE_POST), 2);
  assert.equal(cr.employees.size, 1);
  assert.equal(link(container, BT_LINK).pendingCreateExternalId, null);
  assert.equal(link(container, BT_LINK).pendingCreateSentAt, null);
  assert.equal(link(container, BT_LINK).crContactId, result.crContactId);
});

test("[BR3][3.15] BT/RBT: lookup found inside the window: the record is linked and no create is sent", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Bt();
  // CentralReach created the employee, but the answer never arrived.
  cr.fail(EMPLOYEE_POST, timeoutError(), { afterHandling: true });
  await assert.rejects(runBt(record, clock), unknownCreate);

  clock.advanceSeconds(60);
  const result = await runBt(record, clock);

  assert.equal(result.status, "success");
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  assert.equal(cr.employees.size, 1);
  assert.equal(record.properties.employee_id, result.crContactId);
  assert.equal(link(container, BT_LINK).pendingCreateExternalId, null);
  assert.equal(link(container, BT_LINK).pendingCreateSentAt, null);
});

test("[BR3][3.15] BT/RBT: when saving the marker fails, no create is sent", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Bt();
  container.beforeWrite = (operation, doc) => {
    if (doc.pk === BT_LINK.pk && doc.data?.pendingCreateExternalId) {
      throw Object.assign(new Error("Cosmos answered 503"), { code: 503 });
    }
  };

  await assert.rejects(runBt(record, clock));
  assert.equal(cr.count(EMPLOYEE_POST), 0);
  assert.equal(cr.employees.size, 0);
});

test("[BR3][3.15] BT/RBT: a create still pending on the last attempt ends as error \"Retries used up\", with no second create", async () => {
  const { cr } = setup();
  const clock = testClock(START);
  const record = stage3Bt();
  cr.fail(EMPLOYEE_POST, timeoutError());
  await assert.rejects(runBt(record, clock), unknownCreate);

  clock.advanceSeconds(60);
  await assert.rejects(runBt(record, clock, { lastAttempt: true }), stillPending);
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, RETRIES_USED_UP);
});

// --- Clients ---

test("[BR1][3.15] Case: the marker is saved with the time before the create is sent, and cleared when the CR ID is saved", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Case();
  let markerAtPost = null;
  cr.onRequest = (name) => {
    if (name === CLIENT_POST) {
      markerAtPost = { ...link(container, CASE_LINK) };
    }
  };

  const result = await runCase(record, clock);

  assert.equal(result.operation, "create");
  assert.equal(markerAtPost.pendingCreateExternalId, "deal-1");
  assert.equal(markerAtPost.pendingCreateSentAt, START);
  assert.equal(link(container, CASE_LINK).pendingCreateExternalId, null);
  assert.equal(link(container, CASE_LINK).pendingCreateSentAt, null);
  assert.equal(link(container, CASE_LINK).crContactId, result.crContactId);
});

test("[BR1][3.15] Case: a create that timed out, lookup 404 one minute later: no second create, and the run is retried", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Case();

  cr.fail(CLIENT_POST, timeoutError());
  await assert.rejects(runCase(record, clock), unknownCreate);
  assert.equal(link(container, CASE_LINK).pendingCreateExternalId, "deal-1");
  assert.equal(link(container, CASE_LINK).pendingCreateSentAt, START);

  clock.advanceSeconds(60);
  const callsBefore = cr.calls.length;
  let thrown = null;
  await assert.rejects(runCase(record, clock), (error) => {
    thrown = error;
    return stillPending(error);
  });
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  // The only CentralReach call of the retry is the read-only lookup.
  assert.deepEqual(
    cr.calls.slice(callsBefore).map((call) => call.name),
    ["GET /contacts/client/byExternalSystemId"]
  );
  assert.equal(cr.count(CLIENT_POST), 1);
  assert.equal(link(container, CASE_LINK).pendingCreateSentAt, START);
  assert.equal(statusWrites(record).length, 0);

  clock.advanceSeconds(13 * 60 + 59);
  await assert.rejects(runCase(record, clock), stillPending);
  assert.equal(cr.count(CLIENT_POST), 1);
});

test("[BR1][3.15] Case: lookup 404 at 15 minutes: the marker is cleared and one create is sent", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Case();
  cr.fail(CLIENT_POST, timeoutError());
  await assert.rejects(runCase(record, clock), unknownCreate);

  clock.advanceSeconds(15 * 60);
  const result = await runCase(record, clock);

  assert.equal(result.operation, "create");
  assert.equal(result.status, "success");
  assert.equal(cr.count(CLIENT_POST), 2);
  assert.equal(cr.clients.size, 1);
  assert.equal(link(container, CASE_LINK).pendingCreateExternalId, null);
  assert.equal(link(container, CASE_LINK).pendingCreateSentAt, null);
  assert.equal(record.properties.client_id_number, result.crContactId);
});

test("[BR1][3.15] Case: lookup found inside the window: the Case is linked to its own client and no create is sent", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Case();
  cr.fail(CLIENT_POST, timeoutError(), { afterHandling: true });
  await assert.rejects(runCase(record, clock), unknownCreate);
  const createdId = Array.from(cr.clients.keys())[0];

  clock.advanceSeconds(60);
  const result = await runCase(record, clock);

  assert.equal(result.status, "success");
  assert.equal(result.crContactId, createdId);
  assert.equal(cr.count(CLIENT_POST), 1);
  assert.equal(cr.clients.size, 1);
  assert.equal(record.properties.client_id_number, createdId);
  assert.equal(link(container, CASE_LINK).pendingCreateExternalId, null);
  assert.equal(link(container, CASE_LINK).pendingCreateSentAt, null);
  // Contract P.5 (e): the Case was linked to its own earlier create.
  assert.equal(link(container, CASE_LINK).labelsPending, true);
});

test("[BR1][3.15] Case: when saving the marker fails, no create is sent", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Case();
  container.beforeWrite = (operation, doc) => {
    if (doc.pk === CASE_LINK.pk && doc.data?.pendingCreateExternalId) {
      throw Object.assign(new Error("Cosmos answered 503"), { code: 503 });
    }
  };

  await assert.rejects(runCase(record, clock));
  assert.equal(cr.calls.length, 0);
  assert.equal(cr.clients.size, 0);
});

test("[BR1][3.15] Case: a create that CentralReach rejects clears the marker, so the next run is not held back", async () => {
  const { container, cr } = setup();
  const clock = testClock(START);
  const record = stage3Case();
  cr.fail(CLIENT_POST, httpError(400));

  const rejected = await runCase(record, clock);
  assert.equal(rejected.status, "error");
  assert.equal(link(container, CASE_LINK).pendingCreateExternalId, null);
  assert.equal(link(container, CASE_LINK).pendingCreateSentAt, null);

  clock.advanceSeconds(60);
  const result = await runCase(record, clock);
  assert.equal(result.operation, "create");
  assert.equal(cr.clients.size, 1);
});

test("[BR1][3.15] Case: a create still pending on the last attempt ends as error \"Retries used up\", with no second create", async () => {
  const { cr } = setup();
  const clock = testClock(START);
  const record = stage3Case();
  cr.fail(CLIENT_POST, timeoutError());
  await assert.rejects(runCase(record, clock), unknownCreate);

  clock.advanceSeconds(60);
  await assert.rejects(runCase(record, clock, { lastAttempt: true }), stillPending);
  assert.equal(cr.count(CLIENT_POST), 1);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, RETRIES_USED_UP);
});
