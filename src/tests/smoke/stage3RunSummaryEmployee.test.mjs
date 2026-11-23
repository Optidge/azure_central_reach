// Row 3.20 (BR15), lane E: the `Sync run summary.` line of the BCBA run, the BT/RBT run and the
// Contact fan-out (BUILD-PLAN.md section 11). Guide: Architecture tab, failures and monitoring;
// [G11] Monitoring. One line per run, at the end, on every outcome. Only names, IDs, codes and
// counts: never a field value, a person's name, an email or a phone number.
// Only HubSpot and the Service Bus senders are faked. The mapper, the validator, the hash,
// cosmosState.mjs (in-memory container), centralReachClient.mjs (fake HTTP adapter) and
// syncRunSummary.mjs are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { SYNC_RUN_SUMMARY_MESSAGE } from "../../lib/syncRunSummary.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import { runContactFanOutWorkflow } from "../../workflows/contactFanOutWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  employeeWorkflowDeps,
  httpError,
  hubspotAnswer,
  timeoutError,
  workflowConfig
} from "./stage2Fakes.mjs";
import { seedEmployee, setup, stage3Bcba, stage3Bt } from "./stage3WorkerFakes.mjs";

const SUMMARY_KEYS = [
  "workflow",
  "recordId",
  "portalId",
  "source",
  "invocationId",
  "attempt",
  "outcome",
  "reasonCode",
  "operation",
  "changedFieldNames",
  "crCalls",
  "labels",
  "writeback"
];

// Distinctive person values. None of them may appear in a summary line.
const BT_PERSON = {
  first_name: "Zebulon",
  last_name: "Quixwater",
  email: "zebulon.quixwater@example.com",
  employee_phone: "(917) 555-0187",
  street_home: "4417 Larkspur Terrace",
  home_apt: "Unit 9Q",
  location_city: "Poughkeepsie",
  postal_code_home: "12601",
  date_of_birth: "1979-06-23",
  street_address__work_: "71 Wexford Boulevard"
};
const BCBA_PERSON = {
  first_name: "Philippa",
  last_name: "Ravensworth",
  email: "p.ravensworth@ucaba.example.com",
  employee_phone: "646-555-0123",
  address: "88 Juniper Hollow",
  apartment__home: "Suite 3R",
  city_home: "Tarrytown",
  postal_code_home: "10591",
  dob: "1981-11-05",
  medicaid_id__ny: "NY77221"
};
const CONTACT_EMAIL = "philippa.personal@example.org";
const PERSON_VALUES = [
  ...Object.values(BT_PERSON),
  ...Object.values(BCBA_PERSON),
  CONTACT_EMAIL,
  "zebulon",
  "quixwater",
  "philippa",
  "ravensworth",
  "9175550187",
  "6465550123"
];

// The kind of each fake CentralReach route (contract of the call observer in
// src/lib/centralReachClient.mjs).
const CALL_KINDS = {
  "GET /contacts/employee/byExternalSystemId": "lookup",
  "GET /contacts/employee/{id}": "lookup",
  "POST /contacts/employee": "create",
  "PUT /contacts/employee/{id}": "update",
  "GET /contacts/labels": "labelRead",
  "GET /contacts/{id}/labels": "labelRead",
  "POST /contacts/{id}/labels": "labelPost",
  "PUT /contacts/{id}/metadata/{fieldId}": "metadata",
  "DELETE /contacts/{id}/metadata/{fieldId}": "metadata"
};

// The fake CentralReach's request log as summary entries. A lookup by External System ID that
// found nothing answered 404; everything else answered 200.
function requestLog(cr, start = 0, { notFoundLookups = false } = {}) {
  return cr.calls.slice(start).map((call) => ({
    kind: CALL_KINDS[call.name],
    status:
      notFoundLookups && call.name === "GET /contacts/employee/byExternalSystemId" ? 404 : 200
  }));
}

function summaryLines(logs) {
  return logs.filter((entry) => entry.message === SYNC_RUN_SUMMARY_MESSAGE);
}

// The one summary line of a run, checked for its shape and for person values.
function onlyLine(logs) {
  const lines = summaryLines(logs);
  assert.equal(lines.length, 1, "exactly one summary line per run");
  const { meta } = lines[0];
  const text = JSON.stringify(meta).toLowerCase();
  for (const value of PERSON_VALUES) {
    assert.equal(text.includes(String(value).toLowerCase()), false, `no person value in the line`);
  }
  return lines[0];
}

// The BCBA's Contact (row 6.4), with a distinctive email.
const contactDeps = {
  listAssociations: async () => [
    { toObjectId: "801", types: [{ typeId: 191, category: "USER_DEFINED" }] }
  ],
  getContactById: async (contactId, properties) =>
    hubspotAnswer({ id: contactId, properties: { email: CONTACT_EMAIL } }, properties)
};

const TYPES = [
  {
    employeeType: HUBSPOT_EMPLOYEE_TYPES.BT_RBT,
    recordId: "HS1",
    contactId: "5001",
    workdayId: "WD1",
    record: (properties) => stage3Bt({ ...BT_PERSON, ...properties })
  },
  {
    employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA,
    recordId: "HS2",
    contactId: "5002",
    workdayId: "WD2",
    record: (properties) => stage3Bcba({ ...BCBA_PERSON, ...properties })
  }
];

function run(type, record, { logs = [], extra = {}, attempt = 1 } = {}) {
  return runEmployeeSyncWorkflow(
    {
      recordId: type.recordId,
      employeeType: type.employeeType,
      source: "hubspotWorkflow",
      context: { invocationId: "inv-320" },
      attempt
    },
    { ...employeeWorkflowDeps({ record, logs }), ...contactDeps, labelReadBackDelayMs: 0, ...extra }
  );
}

function linked(type, cr, properties = {}) {
  seedEmployee(cr, type.contactId, type.workdayId);
  return type.record({ employee_id: type.contactId, ...properties });
}

for (const type of TYPES) {
  const name = type.employeeType;
  const workflow = `employeeSync:${name}`;

  test(`[BR15][3.20] ${name}: success create logs one line whose crCalls is the request log, in order`, async () => {
    const { cr } = setup();
    const record = type.record({ employee_id: "" });
    const logs = [];
    const result = await run(type, record, { logs, attempt: 2 });

    assert.equal(result.operation, "create");
    const { level, meta } = onlyLine(logs);
    assert.equal(level, "info");
    assert.deepEqual(Object.keys(meta), SUMMARY_KEYS);
    assert.deepEqual(
      {
        workflow: meta.workflow,
        recordId: meta.recordId,
        portalId: meta.portalId,
        source: meta.source,
        invocationId: meta.invocationId,
        attempt: meta.attempt,
        outcome: meta.outcome,
        reasonCode: meta.reasonCode,
        operation: meta.operation
      },
      {
        workflow,
        recordId: type.recordId,
        portalId: SANDBOX_PORTAL,
        source: "hubspotWorkflow",
        invocationId: "inv-320",
        attempt: 2,
        outcome: "success",
        reasonCode: null,
        operation: "create"
      }
    );
    assert.deepEqual(meta.crCalls, requestLog(cr, 0, { notFoundLookups: true }));
    assert.deepEqual(
      meta.crCalls.slice(0, 3).map((call) => call.kind),
      ["lookup", "lookup", "create"]
    );
    assert.equal(meta.changedFieldNames.length > 0, true);
    assert.equal(meta.labels.confirmed, true);
    assert.equal(meta.labels.skipWindowHeldBack, false);
    assert.equal(Array.isArray(meta.labels.postedLabelIds), true);
    assert.deepEqual(meta.writeback, { written: true, status: "success" });
  });

  test(`[BR15][3.20] ${name}: success update logs one line whose crCalls is the request log, in order`, async () => {
    const { cr } = setup();
    const record = linked(type, cr);
    const logs = [];
    const result = await run(type, record, { logs });

    assert.equal(result.operation, "update");
    const { meta } = onlyLine(logs);
    assert.equal(meta.outcome, "success");
    assert.equal(meta.operation, "update");
    assert.deepEqual(meta.crCalls, requestLog(cr));
    assert.deepEqual(
      meta.crCalls.slice(0, 2).map((call) => call.kind),
      ["lookup", "update"]
    );
    assert.deepEqual(meta.writeback, { written: true, status: "success" });
  });

  test(`[BR15][3.20] ${name}: a run with nothing changed logs noop, no call and no writeback`, async () => {
    const { cr } = setup();
    const record = linked(type, cr);
    await run(type, record);
    const start = cr.calls.length;

    const logs = [];
    const result = await run(type, record, { logs });

    assert.equal(result.status, "noop");
    const { meta } = onlyLine(logs);
    assert.equal(meta.outcome, "noop");
    assert.equal(meta.reasonCode, null);
    assert.equal(meta.operation, "none");
    assert.deepEqual(meta.changedFieldNames, []);
    assert.deepEqual(meta.crCalls, []);
    assert.equal(cr.calls.length, start);
    assert.equal(meta.labels, null);
    assert.deepEqual(meta.writeback, { written: false, status: null });
    // `noop` is a log value only: HubSpot still shows success.
    assert.equal(record.properties.last_sync_status, "success");
  });

  test(`[BR15][3.20] ${name}: a record the gate skips logs skipped with its reason code`, async () => {
    const { cr } = setup();
    const record = type.record({ employee_id: "", test_record: "true" });
    const logs = [];
    const result = await run(type, record, { logs });

    assert.equal(result.status, "skipped");
    const { meta } = onlyLine(logs);
    assert.equal(meta.outcome, "skipped");
    assert.equal(meta.reasonCode, "test_record");
    assert.deepEqual(meta.crCalls, []);
    assert.deepEqual(cr.calls, []);
    assert.deepEqual(meta.writeback, { written: false, status: null });
  });

  test(`[BR15][3.20] ${name}: an error decided on purpose logs its code after the status write`, async () => {
    const { cr } = setup();
    const record = type.record({ employee_id: "12a4" });
    const logs = [];
    const result = await run(type, record, { logs });

    assert.equal(result.status, "error");
    const { level, meta } = onlyLine(logs);
    assert.equal(level, "warn");
    assert.equal(meta.outcome, "error");
    assert.equal(meta.reasonCode, "CR_ID_NOT_DIGITS");
    assert.deepEqual(meta.crCalls, []);
    assert.deepEqual(cr.calls, []);
    // The line is logged after the HubSpot write of the decided status (return await).
    assert.deepEqual(meta.writeback, { written: true, status: "error" });
  });

  test(`[BR15][3.20] ${name}: a thrown failure logs error with the failure's code`, async () => {
    const { cr } = setup();
    const record = linked(type, cr);
    const refused = async () => {
      const error = httpError(403);
      error.provider = "hubspot";
      throw error;
    };
    const logs = [];
    await assert.rejects(
      run(type, record, {
        logs,
        extra: { getBtRbtRecordById: refused, getBcbaRecordById: refused }
      }),
      (error) => error.code === "HUBSPOT_READ_FAILED"
    );

    const { meta } = onlyLine(logs);
    assert.equal(meta.outcome, "error");
    assert.equal(meta.reasonCode, "HUBSPOT_READ_FAILED");
    assert.equal(meta.operation, "none");
    assert.deepEqual(meta.crCalls, []);
    assert.deepEqual(meta.writeback, { written: false, status: null });
  });

  test(`[BR15][3.20] ${name}: a create with the temporary ID logs waiting with its code`, async () => {
    const { cr } = setup();
    const record = type.record({ employee_id: "", workday_id: "" });
    const logs = [];
    const result = await run(type, record, { logs });

    assert.equal(result.status, "waiting");
    const { meta } = onlyLine(logs);
    assert.equal(meta.outcome, "waiting");
    assert.equal(meta.reasonCode, "WAITING_FOR_WORKDAY_ID");
    assert.equal(meta.operation, "create");
    assert.deepEqual(meta.crCalls, requestLog(cr, 0, { notFoundLookups: true }));
    assert.deepEqual(meta.writeback, { written: true, status: "waiting" });
  });

  test(`[BR15][3.20] ${name}: create turned off logs waiting and sends no create`, async () => {
    const { cr } = setup();
    const record = type.record({ employee_id: "" });
    const logs = [];
    const result = await runEmployeeSyncWorkflow(
      { recordId: type.recordId, employeeType: type.employeeType },
      {
        ...employeeWorkflowDeps({
          record,
          logs,
          config: workflowConfig({ features: { allowEmployeeCreate: false, putOnlyMode: true } })
        }),
        ...contactDeps
      }
    );

    assert.equal(result.status, "waiting");
    const { meta } = onlyLine(logs);
    assert.equal(meta.outcome, "waiting");
    assert.equal(meta.reasonCode, "EMPLOYEE_CREATE_TURNED_OFF");
    assert.equal(meta.operation, "none");
    assert.deepEqual(meta.crCalls, requestLog(cr, 0, { notFoundLookups: true }));
    assert.equal(cr.count("POST /contacts/employee"), 0);
  });
}

// --- The Contact fan-out ---

function fanOut({ testRecord = null, cases = [], logs, breakRead, sends = [] } = {}) {
  const deps = {
    getConfig: () => workflowConfig(),
    createHubSpotClient: () => {},
    ensureServiceBusClient: () => {},
    safeLog: (level, message, meta) => logs.push({ level, message, meta }),
    getContactById: async (contactId, properties) =>
      hubspotAnswer({ id: contactId, properties: { test_record: testRecord } }, properties),
    listAssociations: async ({ toObjectType }) =>
      cases.map((id) => ({
        toObjectId: id,
        types: [{ typeId: 4, category: "HUBSPOT_DEFINED" }]
      })),
    sendClientSyncMessage: async (message) => sends.push(message)
  };
  breakRead?.(deps);
  return runContactFanOutWorkflow(
    { contactId: "701", source: "hubspotWorkflow", context: { invocationId: "inv-fan" }, attempt: 0 },
    deps
  );
}

test("[BR15][3.20] the fan-out logs one line with the messages it queued per object type", async () => {
  const logs = [];
  await fanOut({ cases: ["9001", "9002"], logs });

  const lines = summaryLines(logs);
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0].meta, {
    workflow: "contactFanOut",
    recordId: "701",
    portalId: SANDBOX_PORTAL,
    source: "hubspotWorkflow",
    invocationId: "inv-fan",
    attempt: 0,
    outcome: "success",
    reasonCode: null,
    operation: "none",
    changedFieldNames: [],
    crCalls: [],
    labels: null,
    writeback: { written: false, status: null },
    queuedMessages: { case: 2 }
  });
});

test("[BR15][3.20] the fan-out logs skipped for a test Contact, with nothing queued", async () => {
  const logs = [];
  await fanOut({ testRecord: "true", cases: ["9001"], logs });

  const lines = summaryLines(logs);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].meta.outcome, "skipped");
  assert.equal(lines[0].meta.reasonCode, "test_record");
  assert.deepEqual(lines[0].meta.queuedMessages, { case: 0 });
  assert.deepEqual(lines[0].meta.crCalls, []);
});

test("[BR15][3.20] the fan-out logs error with the read's code when a read fails, with nothing queued", async () => {
  const logs = [];
  await assert.rejects(
    fanOut({
      cases: ["9001"],
      logs,
      breakRead: (deps) => {
        deps.listAssociations = async () => {
          const error = httpError(503);
          error.provider = "hubspot";
          throw error;
        };
      }
    })
  );

  const lines = summaryLines(logs);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].level, "warn");
  assert.equal(lines[0].meta.outcome, "error");
  assert.equal(lines[0].meta.reasonCode, "HUBSPOT_HTTP_503");
  assert.deepEqual(lines[0].meta.queuedMessages, { case: 0 });
});

test("[BR15][3.20] the fan-out counts only the messages sent before a send failed", async () => {
  const logs = [];
  const sends = [];
  await assert.rejects(
    fanOut({
      cases: ["9001", "9002"],
      logs,
      sends,
      breakRead: (deps) => {
        const send = deps.sendClientSyncMessage;
        deps.sendClientSyncMessage = async (message) => {
          if (message.dealId === "9002") {
            throw Object.assign(new Error("ServiceBusError"), { code: "ServiceTimeout" });
          }
          return send(message);
        };
      }
    })
  );

  const lines = summaryLines(logs);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].meta.outcome, "error");
  assert.equal(lines[0].meta.reasonCode, "ServiceTimeout");
  assert.deepEqual(lines[0].meta.queuedMessages, { case: 1 });
  assert.equal(sends.length, 1);
});

// --- Review fixes (E-R1; D-R3 and D-R4 applied to the employee run and the fan-out) ---

test("[BR15][3.20] the employee queue passes the message's attempt into the summary line", async () => {
  const { cr } = setup();
  const record = linked(TYPES[0], cr);
  const logs = [];
  const deps = { ...employeeWorkflowDeps({ record, logs }), labelReadBackDelayMs: 0 };

  await processEmployeeQueue(
    {
      recordId: "HS1",
      employeeType: "bt_rbt",
      workflow: "employeeSync",
      source: "hubspotWorkflow",
      portalId: SANDBOX_PORTAL,
      attempt: 3
    },
    { invocationId: "inv-r1", triggerMetadata: { messageId: "m1", deliveryCount: 1 } },
    {
      portalId: SANDBOX_PORTAL,
      runWorkflow: (input) => runEmployeeSyncWorkflow(input, deps),
      scheduleRetry: async () => {}
    }
  );

  const { meta } = onlyLine(logs);
  assert.equal(meta.attempt, 3);
  assert.equal(meta.outcome, "success");
});

for (const type of TYPES) {
  test(`[BR15][3.20] ${type.employeeType}: an unknown portal logs one error line with no portal`, async () => {
    const { cr } = setup();
    const record = type.record({ employee_id: "" });
    const logs = [];
    await assert.rejects(
      runEmployeeSyncWorkflow(
        { recordId: type.recordId, employeeType: type.employeeType },
        employeeWorkflowDeps({ record, logs, config: workflowConfig({ portalId: "99999999" }) })
      ),
      /HUBSPOT_PORTAL_ID/
    );

    const { meta } = onlyLine(logs);
    assert.equal(meta.outcome, "error");
    assert.equal(typeof meta.reasonCode, "string");
    assert.equal(meta.portalId, null);
    assert.deepEqual(meta.crCalls, []);
    assert.deepEqual(cr.calls, []);
    assert.deepEqual(record.writes, []);
  });

  test(`[BR15][3.20] ${type.employeeType}: a client factory that throws logs one error line`, async () => {
    const { cr } = setup();
    const record = type.record({ employee_id: "" });
    const logs = [];
    await assert.rejects(
      runEmployeeSyncWorkflow(
        { recordId: type.recordId, employeeType: type.employeeType },
        {
          ...employeeWorkflowDeps({ record, logs }),
          createCentralReachClient: () => {
            throw Object.assign(new Error("Missing CentralReach settings"), {
              code: "CR_CLIENT_SETUP_FAILED"
            });
          }
        }
      )
    );

    const { meta } = onlyLine(logs);
    assert.equal(meta.outcome, "error");
    assert.equal(meta.reasonCode, "CR_CLIENT_SETUP_FAILED");
    assert.equal(meta.portalId, SANDBOX_PORTAL);
    assert.deepEqual(cr.calls, []);
    assert.deepEqual(record.writes, []);
  });
}

test("[BR15][3.20] bt_rbt: a create that timed out logs operation create", async () => {
  const { cr } = setup();
  const record = TYPES[0].record({ employee_id: "" });
  cr.fail("POST /contacts/employee", timeoutError());
  const logs = [];
  await assert.rejects(run(TYPES[0], record, { logs }));

  const { meta } = onlyLine(logs);
  assert.equal(meta.outcome, "error");
  assert.equal(meta.reasonCode, "CR_CREATE_OUTCOME_UNKNOWN");
  assert.equal(meta.operation, "create");
  assert.deepEqual(meta.crCalls.at(-1), { kind: "create", status: null });
});

test("[BR15][3.20] bt_rbt: an update CentralReach refused with 400 logs operation update", async () => {
  const { cr } = setup();
  const record = linked(TYPES[0], cr);
  cr.fail("PUT /contacts/employee/{id}", httpError(400));
  const logs = [];
  const result = await run(TYPES[0], record, { logs });

  assert.equal(result.status, "error");
  const { meta } = onlyLine(logs);
  assert.equal(meta.outcome, "error");
  assert.equal(meta.reasonCode, "CR_HTTP_400");
  assert.equal(meta.operation, "update");
  assert.deepEqual(meta.crCalls.at(-1), { kind: "update", status: 400 });
  assert.deepEqual(meta.writeback, { written: true, status: "error" });
});

test("[BR15][3.20] bt_rbt: a label POST that failed with a 503 still shows the posted label IDs", async () => {
  const { cr } = setup();
  const record = linked(TYPES[0], cr);
  cr.fail("POST /contacts/{id}/labels", httpError(503));
  const logs = [];
  await assert.rejects(run(TYPES[0], record, { logs }));

  const { meta } = onlyLine(logs);
  assert.equal(meta.outcome, "error");
  assert.equal(Array.isArray(meta.labels.postedLabelIds), true);
  assert.equal(meta.labels.postedLabelIds.length > 0, true);
  assert.equal(meta.labels.confirmed, null);
  assert.deepEqual(meta.crCalls.at(-1), { kind: "labelPost", status: 503 });
});

test("[BR15][3.20] the fan-out logs one error line when the portal is unknown", async () => {
  const logs = [];
  await assert.rejects(
    runContactFanOutWorkflow(
      { contactId: "701" },
      {
        getConfig: () => workflowConfig({ portalId: "99999999" }),
        createHubSpotClient: () => {},
        safeLog: (level, message, meta) => logs.push({ level, message, meta })
      }
    ),
    /HUBSPOT_PORTAL_ID/
  );

  const lines = summaryLines(logs);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].meta.outcome, "error");
  assert.equal(lines[0].meta.portalId, null);
  assert.deepEqual(lines[0].meta.queuedMessages, { case: 0 });
});

test("[BR15][3.20] the fan-out logs one error line when the HubSpot client factory throws", async () => {
  const logs = [];
  await assert.rejects(
    runContactFanOutWorkflow(
      { contactId: "701" },
      {
        getConfig: () => workflowConfig(),
        createHubSpotClient: () => {
          throw Object.assign(new Error("Missing HubSpot settings"), {
            code: "HUBSPOT_CLIENT_SETUP_FAILED"
          });
        },
        safeLog: (level, message, meta) => logs.push({ level, message, meta })
      }
    )
  );

  const lines = summaryLines(logs);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].meta.outcome, "error");
  assert.equal(lines[0].meta.reasonCode, "HUBSPOT_CLIENT_SETUP_FAILED");
  assert.equal(lines[0].meta.portalId, SANDBOX_PORTAL);
});
