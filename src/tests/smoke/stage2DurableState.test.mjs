// Stage 2, rows 2.1 to 2.5 and their additions (BUILD-PLAN.md section 8).
// Every workflow test here runs the real mapper, validator, hash, catch block, cosmosState.mjs
// (through one in-memory container) and centralReachClient.mjs (through a fake HTTP adapter).
// Only HubSpot is faked. No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acquireLease,
  getState,
  putState,
  releaseLease,
  useStateContainer
} from "../../lib/cosmosState.mjs";
import { LINK_TTL_NEVER, saveLinkRecord } from "../../lib/linkRecord.mjs";
import { createOrUpdateClient, createOrUpdateEmployee } from "../../lib/centralReachClient.mjs";
import { validateConfig } from "../../lib/config.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import {
  ANOTHER_HUBSPOT_RECORD_LINKED,
  EMPLOYEE_CREATE_TURNED_OFF,
  WORKDAY_ID_MISMATCH
} from "../../constants/syncReasons.mjs";
import {
  SANDBOX_PORTAL,
  btRecord,
  caseRecord,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  fakeCentralReach,
  httpError,
  memoryContainer,
  timeoutError,
  workflowConfig
} from "./stage2Fakes.mjs";

const EMPLOYEE_LINK_PK = "sync:employee";
const EMPLOYEE_ATTEMPT_PK = "sync-attempt:employee";
const CLIENT_LINK_PK = "sync:client";
const CLIENT_ATTEMPT_PK = "sync-attempt:client";
const BT_LINK_ID = `${SANDBOX_PORTAL}:bt_rbt:HS1`;
const CASE_LINK_ID = `${SANDBOX_PORTAL}:deal-1`;

const EMPLOYEE_PUT = "PUT /contacts/employee/{id}";
const EMPLOYEE_POST = "POST /contacts/employee";
const EMPLOYEE_LOOKUP = "GET /contacts/employee/byExternalSystemId";
const CLIENT_PUT = "PUT /contacts/client/{id}";
const METADATA_PUT = "PUT /contacts/{id}/metadata/{fieldId}";
const LABELS_GET = "GET /contacts/{id}/labels";

function setup() {
  const container = memoryContainer();
  useStateContainer(container);
  const cr = fakeCentralReach();
  return { container, cr };
}

function linkedEmployee(cr, contactId = "7001", externalSystemId = "WD1") {
  cr.employees.set(contactId, {
    contactId,
    externalSystemId,
    primaryEmail: "stored@example.com"
  });
}

function linkedClient(cr, contactId = "2001", externalSystemId = "deal-1") {
  cr.clients.set(contactId, { contactId, externalSystemId, primaryEmail: null });
}

function runBt(record, options = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt", lastAttempt: Boolean(options.lastAttempt) },
    employeeWorkflowDeps({ record, ...options })
  );
}

function runCase(record, options = {}) {
  return runClientSyncWorkflow(
    { dealId: "deal-1", lastAttempt: Boolean(options.lastAttempt) },
    clientWorkflowDeps({ record, ...options })
  );
}

function linkWrites(container, pk) {
  return container.log.filter((entry) => entry.doc?.pk === pk);
}

// ---------------------------------------------------------------------------------------------
// Row 2.1: the link record never expires
// ---------------------------------------------------------------------------------------------

test("[2.1] a successful employee run writes the link record with no expiry", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "7001" });

  const result = await runBt(record);

  assert.equal(result.status, "success");
  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID);
  assert.equal(link.ttl, LINK_TTL_NEVER);
  assert.equal(LINK_TTL_NEVER, -1);
  assert.equal(link.data.crContactId, "7001");
  assert.equal(link.data.externalSystemId, "WD1");
  assert.equal(link.data.clean, true);
  assert.equal(Object.keys(link.data.fieldHashes).length > 0, true);
  for (const entry of linkWrites(container, EMPLOYEE_LINK_PK)) {
    assert.equal(entry.doc.ttl, -1);
  }
});

test("[2.1] a successful Case run writes the link record with no expiry", async () => {
  const { container, cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });

  const result = await runCase(record);

  assert.equal(result.status, "success");
  const link = container.get(CLIENT_LINK_PK, CASE_LINK_ID);
  assert.equal(link.ttl, -1);
  assert.equal(link.data.crContactId, "2001");
  assert.equal(link.data.clean, true);
  for (const entry of linkWrites(container, CLIENT_LINK_PK)) {
    assert.equal(entry.doc.ttl, -1);
  }
});

test("[2.1] a failed employee run keeps the CR ID and the last good hashes, with no expiry", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "7001" });
  await runBt(record);
  const goodHashes = { ...container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.fieldHashes };

  record.properties.first_name = "Alexa";
  cr.fail(EMPLOYEE_PUT, timeoutError());
  await assert.rejects(runBt(record));

  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID);
  assert.equal(link.ttl, -1);
  assert.equal(link.data.crContactId, "7001");
  assert.deepEqual(link.data.fieldHashes, goodHashes);
  assert.equal(link.data.hashesContactId, "7001");
  for (const entry of linkWrites(container, EMPLOYEE_LINK_PK)) {
    assert.equal(entry.doc.ttl, -1);
  }
});

test("[2.1] a failed Case run keeps the CR ID and the last good hashes, with no expiry", async () => {
  const { container, cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  await runCase(record);
  const goodHashes = { ...container.get(CLIENT_LINK_PK, CASE_LINK_ID).data.fieldHashes };

  record.properties.allergies = "Shellfish";
  cr.fail(CLIENT_PUT, timeoutError());
  await assert.rejects(runCase(record));

  const link = container.get(CLIENT_LINK_PK, CASE_LINK_ID);
  assert.equal(link.ttl, -1);
  assert.equal(link.data.crContactId, "2001");
  assert.deepEqual(link.data.fieldHashes, goodHashes);
  assert.equal(link.data.hashesContactId, "2001");
});

test("[2.1] attempt details go to a second record that may expire, not to the link record", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "7001" });
  cr.fail(EMPLOYEE_PUT, timeoutError());
  await assert.rejects(
    runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType: "bt_rbt", context: { invocationId: "inv-77" } },
      employeeWorkflowDeps({ record })
    )
  );

  const attempt = container.get(EMPLOYEE_ATTEMPT_PK, BT_LINK_ID);
  assert.equal(attempt.type, "fail");
  assert.equal(attempt.ttl, 3600);
  assert.equal(attempt.data.invocationId, "inv-77");
  assert.equal(attempt.data.errorCode, "ECONNABORTED");

  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID);
  assert.equal("invocationId" in link.data, false);
  assert.equal("errorMessage" in link.data, false);
  assert.equal("errorCode" in link.data, false);
});

test("[2.1] a Case attempt record is separate from the link record and may expire", async () => {
  const { container, cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  await runCase(record);

  const attempt = container.get(CLIENT_ATTEMPT_PK, CASE_LINK_ID);
  assert.equal(attempt.type, "success");
  assert.equal(attempt.ttl, 86400);
  const link = container.get(CLIENT_LINK_PK, CASE_LINK_ID);
  assert.equal("invocationId" in link.data, false);
});

test("[2.1] saveLinkRecord reads the record first and keeps the fields the caller does not own", async () => {
  const container = memoryContainer();
  useStateContainer(container);
  await putState({
    pk: "sync:employee",
    id: "k",
    type: "link",
    ttlSeconds: -1,
    data: {
      crContactId: "7001",
      fieldHashes: { "employee.firstName": "abc" },
      hashesContactId: "7001",
      pendingCreateExternalId: "WD1",
      clean: true
    }
  });

  await saveLinkRecord({
    readState: getState,
    saveState: putState,
    pk: "sync:employee",
    id: "k",
    changes: { clean: false }
  });

  const link = container.get("sync:employee", "k");
  assert.equal(link.ttl, -1);
  assert.equal(link.data.clean, false);
  assert.equal(link.data.crContactId, "7001");
  assert.deepEqual(link.data.fieldHashes, { "employee.firstName": "abc" });
  assert.equal(link.data.hashesContactId, "7001");
  assert.equal(link.data.pendingCreateExternalId, "WD1");
});

test("[2.1] a run that ends waiting but whose CentralReach writes all succeeded is clean and saves its hashes", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "" });

  const result = await runBt(record);

  assert.equal(result.status, "waiting");
  const created = Array.from(cr.employees.values())[0];
  assert.equal(created.externalSystemId, "HS1");
  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID);
  assert.equal(link.data.clean, true);
  assert.equal(link.data.crContactId, created.contactId);
  assert.equal(link.data.hashesContactId, created.contactId);
  assert.equal(Object.keys(link.data.fieldHashes).length > 0, true);
});

test("[2.1] a decided error on a linked employee does not remove the CR ID or the last good hashes", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "7001" });
  await runBt(record);
  const goodHashes = { ...container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.fieldHashes };

  record.properties.last_name = "";
  const result = await runBt(record);

  assert.equal(result.status, "error");
  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID);
  assert.equal(link.data.crContactId, "7001");
  assert.deepEqual(link.data.fieldHashes, goodHashes);
  assert.equal(container.get(EMPLOYEE_ATTEMPT_PK, BT_LINK_ID).type, "fail");
});

// ---------------------------------------------------------------------------------------------
// Row 2.2: the saved values belong to one CR ID
// ---------------------------------------------------------------------------------------------

test("[2.2] changing an employee's CR ID drops the saved hashes and forces a full write", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr, "7001");
  linkedEmployee(cr, "7002");
  const record = btRecord({ employee_id: "7001" });
  await runBt(record);
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.hashesContactId, "7001");

  // Same mapped values and the same last_sync_hash in HubSpot. Only the CR ID changed.
  record.properties.employee_id = "7002";
  const result = await runBt(record);

  assert.notEqual(result.status, "noop");
  assert.equal(cr.calls.some((call) => call.method === "PUT" && call.url === "/contacts/employee/7002"), true);
  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID);
  assert.equal(link.data.crContactId, "7002");
  assert.equal(link.data.hashesContactId, "7002");
});

test("[2.2] changing a Case's CR ID drops the saved hashes and forces a full write", async () => {
  const { container, cr } = setup();
  linkedClient(cr, "2001");
  const record = caseRecord({ client_id_number: "2001" });
  await runCase(record);

  cr.clients.delete("2001");
  linkedClient(cr, "2002");
  record.properties.client_id_number = "2002";
  const result = await runCase(record);

  assert.notEqual(result.status, "noop");
  assert.equal(cr.calls.some((call) => call.method === "PUT" && call.url === "/contacts/client/2002"), true);
  assert.equal(container.get(CLIENT_LINK_PK, CASE_LINK_ID).data.hashesContactId, "2002");
});

test("[2.2] hashesContactId is written only when hashes are saved, so old hashes never sit under a new CR ID", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr, "7001");
  linkedEmployee(cr, "7002");
  const record = btRecord({ employee_id: "7001" });
  await runBt(record);
  const goodHashes = { ...container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.fieldHashes };

  record.properties.employee_id = "7002";
  cr.fail(EMPLOYEE_PUT, timeoutError());
  await assert.rejects(runBt(record));

  const afterFailure = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data;
  assert.equal(afterFailure.crContactId, "7002");
  assert.equal(afterFailure.hashesContactId, "7001");
  assert.deepEqual(afterFailure.fieldHashes, goodHashes);

  const putsBefore = cr.count(EMPLOYEE_PUT);
  const result = await runBt(record);
  assert.equal(result.status, "success");
  assert.equal(cr.count(EMPLOYEE_PUT), putsBefore + 1);
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.hashesContactId, "7002");
});

// ---------------------------------------------------------------------------------------------
// Row 2.3: a create with an unknown result is never repeated blindly
// ---------------------------------------------------------------------------------------------

test("[2.3] a create that timed out, then workday_id edited: the retry finds the first employee and does not create", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "WD1" });
  // CentralReach creates the employee, but the answer never arrives.
  cr.fail(EMPLOYEE_POST, timeoutError(), { afterHandling: true });

  await assert.rejects(runBt(record), (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN");

  assert.equal(cr.count(EMPLOYEE_POST), 1);
  const pending = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID);
  assert.equal(pending.data.pendingCreateExternalId, "WD1");
  assert.equal(pending.ttl, -1);
  assert.equal(record.properties.employee_id, "");

  record.properties.workday_id = "WD2";
  const callsBeforeRetry = cr.calls.length;
  const result = await runBt(record);

  const retryCalls = cr.calls.slice(callsBeforeRetry);
  assert.equal(retryCalls[0].name, EMPLOYEE_LOOKUP);
  assert.equal(retryCalls[0].url.endsWith("ExternalSystemId=WD1"), true);
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  assert.equal(cr.employees.size, 1);
  const created = Array.from(cr.employees.values())[0];
  // Addition (b): linked as its own create; rule 5.4 then reports the edited workday_id.
  assert.equal(result.status, "error");
  assert.equal(record.properties.last_sync_error, WORKDAY_ID_MISMATCH);
  assert.equal(record.properties.employee_id, created.contactId);
  assert.equal(retryCalls.some((call) => call.method !== "GET"), false);
  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data;
  assert.equal(link.crContactId, created.contactId);
  assert.equal(link.pendingCreateExternalId, null);
});

test("[2.3] the pending External System ID is saved before the create is sent", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "WD1" });
  let pendingAtCreate;
  cr.onRequest = (name) => {
    if (name === EMPLOYEE_POST) {
      pendingAtCreate = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID)?.data?.pendingCreateExternalId;
    }
  };

  await runBt(record);

  assert.equal(pendingAtCreate, "WD1");
});

test("[2.3a] if saving the pending ID fails, no create is sent", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "WD1" });
  container.beforeWrite = (operation, doc) => {
    if (doc?.data?.pendingCreateExternalId) {
      throw Object.assign(new Error("Cosmos answered 503"), { code: 503 });
    }
  };

  await assert.rejects(runBt(record));

  assert.equal(cr.count(EMPLOYEE_POST), 0);
  assert.equal(cr.employees.size, 0);
});

test("[2.3b] an employee found by the pending ID is linked and updated, not created again", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "WD1" });
  cr.fail(EMPLOYEE_POST, timeoutError(), { afterHandling: true });
  await assert.rejects(runBt(record));

  const result = await runBt(record);

  const created = Array.from(cr.employees.values())[0];
  assert.equal(result.status, "success");
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  assert.equal(cr.count(EMPLOYEE_PUT), 1);
  assert.equal(record.properties.employee_id, created.contactId);
  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data;
  assert.equal(link.crContactId, created.contactId);
  assert.equal(link.pendingCreateExternalId, null);
  assert.equal(link.clean, true);
});

test("[2.3b] a pending Workday ID whose CentralReach employee another HubSpot record holds is an error, not a link", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr, "7007", "WD1");
  await putState({
    pk: EMPLOYEE_LINK_PK,
    id: BT_LINK_ID,
    type: "link",
    ttlSeconds: -1,
    data: { pendingCreateExternalId: "WD1" }
  });
  const record = btRecord({ workday_id: "WD1" });

  const result = await runBt(record, { holders: [{ id: "OTHER", objectTypeId: "2-72890322" }] });

  assert.equal(result.status, "error");
  assert.equal(record.properties.last_sync_error, ANOTHER_HUBSPOT_RECORD_LINKED);
  assert.equal(record.properties.employee_id, "");
  assert.equal(cr.writes().length, 0);
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.crContactId ?? null, null);
});

test("[2.3c] the pending ID is cleared when the CR ID is saved", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "WD1" });

  const result = await runBt(record);

  assert.equal(result.status, "success");
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data;
  assert.equal(link.pendingCreateExternalId, null);
  assert.equal(typeof link.crContactId, "string");
  assert.equal(link.externalSystemId, "WD1");
});

for (const status of [400, 409]) {
  test(`[2.3c] the pending ID is cleared when CentralReach rejects the create (${status})`, async () => {
    const { container, cr } = setup();
    const record = btRecord({ workday_id: "WD1" });
    cr.fail(EMPLOYEE_POST, httpError(status));

    const result = await runBt(record);

    assert.equal(result.status, "error");
    const link = container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data;
    assert.equal(link.pendingCreateExternalId, null);
    assert.equal(link.crContactId ?? null, null);
  });
}

test("[2.3c] the pending ID is cleared when its lookup answers 404, 15 minutes or more after the create was sent", async () => {
  // Row 3.15: a 404 inside the 15 minutes is no longer trusted (stage3PendingCreate.test.mjs).
  const { container, cr } = setup();
  await putState({
    pk: EMPLOYEE_LINK_PK,
    id: BT_LINK_ID,
    type: "link",
    ttlSeconds: -1,
    data: {
      pendingCreateExternalId: "WD-OLD",
      pendingCreateSentAt: new Date(Date.now() - 16 * 60 * 1000).toISOString()
    }
  });
  const record = btRecord({ workday_id: "WD1" });

  // Create is turned off, so this run saves no new pending ID.
  const result = await runBt(record, {
    config: workflowConfig({ features: { allowEmployeeCreate: false, putOnlyMode: true } })
  });

  assert.equal(result.status, "waiting");
  assert.equal(record.properties.last_sync_error, EMPLOYEE_CREATE_TURNED_OFF);
  assert.equal(cr.calls[0].url.endsWith("ExternalSystemId=WD-OLD"), true);
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.pendingCreateExternalId, null);
  assert.equal(cr.count(EMPLOYEE_POST), 0);
});

test("[2.3c] a temporary failure keeps the pending ID, and the next run still does not create", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "WD1" });
  cr.fail(EMPLOYEE_POST, timeoutError(), { afterHandling: true });
  await assert.rejects(runBt(record));

  // The retry cannot reach CentralReach for the lookup: nothing is cleared, nothing is created.
  cr.fail(EMPLOYEE_LOOKUP, timeoutError());
  await assert.rejects(runBt(record));
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.pendingCreateExternalId, "WD1");
  assert.equal(cr.count(EMPLOYEE_POST), 1);

  record.properties.workday_id = "WD2";
  await runBt(record);
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  assert.equal(cr.employees.size, 1);
});

test("[2.3d] an employee create that returns no contact ID is an unknown create", async () => {
  const cr = fakeCentralReach();
  cr.answer(EMPLOYEE_POST, {});
  await assert.rejects(
    createOrUpdateEmployee({
      payload: { externalSystemId: "WD1", firstName: "Alex", lastName: "Rivera" },
      employeeType: "bt_rbt",
      allowEmployeeCreate: true,
      putOnlyMode: false
    }),
    (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN"
  );
});

test("[2.3d] a client create that returns no contact ID is an unknown create", async () => {
  const cr = fakeCentralReach();
  cr.answer("POST /contacts/client", {});
  await assert.rejects(
    createOrUpdateClient({ payload: { ExternalSystemId: "deal-1", FirstName: "A", LastName: "B" } }),
    (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN"
  );
});

// ---------------------------------------------------------------------------------------------
// Row 2.4: "nothing changed" is only trusted after a clean run
// ---------------------------------------------------------------------------------------------

test("[2.4] an employee run that failed halfway, then the value changed back: the next run writes again", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "7001" });
  await runBt(record);
  const cleanHash = record.properties.last_sync_hash;
  assert.equal(typeof cleanHash, "string");

  record.properties.first_name = "Alexa";
  // Row 3.8: a name change sends no metadata field any more, so the run is failed at the label
  // read, which still comes after the employee update.
  cr.fail(LABELS_GET, timeoutError());
  await assert.rejects(runBt(record));
  assert.equal(cr.calls.filter((call) => call.name === EMPLOYEE_PUT).at(-1).body.firstName, "Alexa");
  // CentralReach now holds the new name. HubSpot still shows the old hash.
  assert.equal(record.properties.last_sync_hash, cleanHash);
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.clean, false);

  record.properties.first_name = "Alex";
  const putsBefore = cr.count(EMPLOYEE_PUT);
  const result = await runBt(record);

  assert.notEqual(result.status, "noop");
  assert.equal(cr.count(EMPLOYEE_PUT), putsBefore + 1);
  assert.equal(cr.calls.filter((call) => call.name === EMPLOYEE_PUT).at(-1).body.firstName, "Alex");
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.clean, true);
});

test("[2.4] a Case run that failed halfway, then the value changed back: the next run writes again", async () => {
  const { container, cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  await runCase(record);
  const cleanHash = record.properties.last_sync_hash;

  record.properties.phi_last_name = "Rivers";
  // Row 3.8: a name change sends no metadata field any more, so the run is failed at the label
  // read, which still comes after the client update.
  cr.fail(LABELS_GET, timeoutError());
  await assert.rejects(runCase(record));
  assert.equal(cr.calls.filter((call) => call.name === CLIENT_PUT).at(-1).body.LastName, "Rivers");
  assert.equal(record.properties.last_sync_hash, cleanHash);
  assert.equal(container.get(CLIENT_LINK_PK, CASE_LINK_ID).data.clean, false);

  record.properties.phi_last_name = "Rivera";
  const putsBefore = cr.count(CLIENT_PUT);
  const result = await runCase(record);

  assert.notEqual(result.status, "noop");
  assert.equal(cr.count(CLIENT_PUT), putsBefore + 1);
  assert.equal(container.get(CLIENT_LINK_PK, CASE_LINK_ID).data.clean, true);
});

test("[2.4] the link record is in progress before the first CentralReach write and clean after the last", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "7001" });
  const cleanAtWrites = [];
  cr.onRequest = (name, request) => {
    if (request.method !== "GET") {
      cleanAtWrites.push(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID)?.data?.clean);
    }
  };

  await runBt(record);

  assert.equal(cleanAtWrites.length > 0, true);
  assert.equal(cleanAtWrites.every((value) => value === false), true);
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.clean, true);
});

test("[2.4] a Case link record is in progress before the first CentralReach write", async () => {
  const { container, cr } = setup();
  const record = caseRecord();
  const cleanAtWrites = [];
  cr.onRequest = (name, request) => {
    if (request.method !== "GET") {
      cleanAtWrites.push(container.get(CLIENT_LINK_PK, CASE_LINK_ID)?.data?.clean);
    }
  };

  const result = await runCase(record);

  assert.equal(result.status, "success");
  assert.equal(cleanAtWrites.length > 0, true);
  assert.equal(cleanAtWrites.every((value) => value === false), true);
  assert.equal(container.get(CLIENT_LINK_PK, CASE_LINK_ID).data.clean, true);
});

test("[2.4] a matching last_sync_hash in HubSpot is not enough when Cosmos holds no clean record", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "7001" });
  await runBt(record);
  assert.equal(typeof record.properties.last_sync_hash, "string");

  // The Cosmos record is lost. HubSpot still carries the hash of the last run.
  useStateContainer(memoryContainer());
  const putsBefore = cr.count(EMPLOYEE_PUT);
  const result = await runBt(record);

  assert.notEqual(result.status, "noop");
  assert.equal(cr.count(EMPLOYEE_PUT), putsBefore + 1);
});

test("[2.4] a Case with a matching last_sync_hash and no clean Cosmos record is written again", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  await runCase(record);

  useStateContainer(memoryContainer());
  const putsBefore = cr.count(CLIENT_PUT);
  const result = await runCase(record);

  assert.notEqual(result.status, "noop");
  assert.equal(cr.count(CLIENT_PUT), putsBefore + 1);
});

test("[2.4] a clean record whose hashes match is a no-op with no CentralReach write", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  linkedClient(cr);
  const employee = btRecord({ employee_id: "7001" });
  const deal = caseRecord({ client_id_number: "2001" });
  await runBt(employee);
  await runCase(deal);
  const writesBefore = cr.writes().length;

  const employeeResult = await runBt(employee);
  const caseResult = await runCase(deal);

  assert.equal(employeeResult.status, "noop");
  assert.equal(caseResult.status, "noop");
  assert.equal(cr.writes().length, writesBefore);
});

// ---------------------------------------------------------------------------------------------
// Row 2.5: a lock is released only by the run that took it
// ---------------------------------------------------------------------------------------------

test("[2.5] a lease stores its own expiry time and the run keeps the etag from the create", async () => {
  const container = memoryContainer();
  useStateContainer(container);
  const before = Date.now();

  const lease = await acquireLease({ pk: "sync-lock:employee", id: "a", ttlSeconds: 660 });

  const doc = container.get("sync-lock:employee", "a");
  assert.equal(doc.type, "lease");
  // Review S2-R1: the Cosmos item outlives the lease, so an expired lease can still be read.
  assert.equal(doc.ttl, 1320);
  assert.equal(Date.parse(doc.expiresAt) >= before + 660 * 1000, true);
  assert.equal(Date.parse(doc.expiresAt) - Date.parse(doc.createdAt), 660 * 1000);
  assert.equal(lease.etag, doc._etag);
});

test("[2.5] a lease that is still held is busy", async () => {
  const container = memoryContainer();
  useStateContainer(container);
  const first = await acquireLease({ pk: "sync-lock:client", id: "a", ttlSeconds: 660 });

  const second = await acquireLease({ pk: "sync-lock:client", id: "a", ttlSeconds: 660 });

  assert.equal(Boolean(first), true);
  assert.equal(second, false);
  assert.equal(container.get("sync-lock:client", "a")._etag, first.etag);
});

test("[2.5] a lease needs a real length: there is no fallback", async () => {
  useStateContainer(memoryContainer());
  await assert.rejects(acquireLease({ pk: "sync-lock:client", id: "a" }), /ttlSeconds/);
});

test("[2.5] an expired lease is taken over with an etag-checked replace", async () => {
  const container = memoryContainer();
  useStateContainer(container);
  const first = await acquireLease({ pk: "create-lock:employee", id: "a", ttlSeconds: 660 });
  container.get("create-lock:employee", "a").expiresAt = new Date(Date.now() - 1000).toISOString();

  const second = await acquireLease({ pk: "create-lock:employee", id: "a", ttlSeconds: 660 });

  assert.equal(Boolean(second), true);
  assert.notEqual(second.etag, first.etag);
  const replace = container.log.find((entry) => entry.operation === "replace");
  assert.deepEqual(replace.options.accessCondition, { type: "IfMatch", condition: first.etag });
  assert.equal(Date.parse(container.get("create-lock:employee", "a").expiresAt) > Date.now(), true);
});

test("[2.5] a slow run whose lease expired does not delete the next run's lease", async () => {
  const container = memoryContainer();
  useStateContainer(container);
  const slowRun = await acquireLease({ pk: "sync-lock:employee", id: "a", ttlSeconds: 660 });
  container.get("sync-lock:employee", "a").expiresAt = new Date(Date.now() - 1000).toISOString();
  const nextRun = await acquireLease({ pk: "sync-lock:employee", id: "a", ttlSeconds: 660 });

  const released = await releaseLease({ pk: "sync-lock:employee", id: "a", etag: slowRun.etag });

  assert.equal(released, false);
  assert.equal(container.get("sync-lock:employee", "a")._etag, nextRun.etag);
  assert.equal(await releaseLease({ pk: "sync-lock:employee", id: "a", etag: nextRun.etag }), true);
  assert.equal(container.get("sync-lock:employee", "a"), null);
});

test("[2.5] release deletes with IfMatch, and a release with no etag deletes nothing", async () => {
  const container = memoryContainer();
  useStateContainer(container);
  const lease = await acquireLease({ pk: "sync-lock:client", id: "a", ttlSeconds: 660 });

  assert.equal(await releaseLease({ pk: "sync-lock:client", id: "a" }), false);
  assert.notEqual(container.get("sync-lock:client", "a"), null);

  await releaseLease({ pk: "sync-lock:client", id: "a", etag: lease.etag });
  const deleted = container.log.find((entry) => entry.operation === "delete");
  assert.deepEqual(deleted.options.accessCondition, { type: "IfMatch", condition: lease.etag });
});

test("[2.5] both employee leases use the configured length and are released with their own etag", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "WD1" });

  await runBt(record);

  assert.equal(cr.count(EMPLOYEE_POST), 1);
  for (const pk of ["sync-lock:employee", "create-lock:employee"]) {
    const created = container.log.find((entry) => entry.operation === "create" && entry.doc.pk === pk);
    // The lease lasts the configured 660 seconds; its Cosmos item lasts twice as long (S2-R1).
    assert.equal(Date.parse(created.doc.expiresAt) - Date.parse(created.doc.createdAt), 660000);
    assert.equal(created.doc.ttl, 1320);
    const deleted = container.log.find((entry) => entry.operation === "delete" && entry.pk === pk);
    assert.equal(deleted.options.accessCondition.type, "IfMatch");
    assert.equal(typeof deleted.options.accessCondition.condition, "string");
    assert.equal(container.all(pk).length, 0);
  }
});

test("[2.5] the Case lease uses the configured length and is released with its own etag", async () => {
  const { container } = setup();
  const record = caseRecord();

  await runCase(record);

  const created = container.log.find(
    (entry) => entry.operation === "create" && entry.doc.pk === "sync-lock:client"
  );
  // The lease lasts the configured 660 seconds; its Cosmos item lasts twice as long (S2-R1).
  assert.equal(Date.parse(created.doc.expiresAt) - Date.parse(created.doc.createdAt), 660000);
  assert.equal(created.doc.ttl, 1320);
  const deleted = container.log.find(
    (entry) => entry.operation === "delete" && entry.pk === "sync-lock:client"
  );
  assert.equal(deleted.options.accessCondition.type, "IfMatch");
  assert.equal(container.all("sync-lock:client").length, 0);
});

test("[2.5] a workflow with no lease length does not fall back to 120 seconds and makes no CentralReach call", async () => {
  const { cr } = setup();
  const config = workflowConfig();
  delete config.ttl.leaseTtlSeconds;

  await assert.rejects(runBt(btRecord({ employee_id: "7001" }), { config }));
  await assert.rejects(runCase(caseRecord({ client_id_number: "2001" }), { config }));

  assert.equal(cr.calls.length, 0);
});

test("[2.5] the lease is longer than the function timeout (decision 9)", () => {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const host = JSON.parse(readFileSync(path.join(root, "host.json"), "utf8"));
  const example = JSON.parse(readFileSync(path.join(root, "local.settings.example.json"), "utf8"));
  assert.equal(host.functionTimeout, "00:10:00");
  assert.equal(example.Values.LEASE_TTL_SECONDS, "660");

  const previous = process.env.LEASE_TTL_SECONDS;
  try {
    process.env.LEASE_TTL_SECONDS = "600";
    assert.equal(validateConfig().invalid.includes("LEASE_TTL_SECONDS"), true);
    process.env.LEASE_TTL_SECONDS = "660";
    assert.equal(validateConfig().invalid.includes("LEASE_TTL_SECONDS"), false);
  } finally {
    if (previous === undefined) {
      delete process.env.LEASE_TTL_SECONDS;
    } else {
      process.env.LEASE_TTL_SECONDS = previous;
    }
  }
});
