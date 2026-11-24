// Item 24 (build package 2026-11-23, D18): two gate properties, one per path. HubSpot CR ID blank
// → the create gate; filled → the update gate. Requirement BR4. No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import { putState } from "../../lib/cosmosState.mjs";
import { MAX_RETRIES } from "../../lib/retry.mjs";
import { SYNC_RUN_SUMMARY_MESSAGE } from "../../lib/syncRunSummary.mjs";
import { processClientQueue } from "../../functions/processClientQueue.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import {
  caseSyncEligibility,
  employeeSyncEligibility,
  gateProperties
} from "../../lib/syncEligibility.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { CONTACT_FAN_OUT_SOURCE } from "../../workflows/contactFanOutWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  hubspotAnswer,
  workflowConfig
} from "./stage2Fakes.mjs";
import {
  BT_LINK,
  CASE_LINK,
  linkedCase,
  seedClient,
  seedEmployee,
  setup,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";
import {
  CASE_TYPE,
  GATE,
  SANDBOX_BCBA_TYPE,
  SANDBOX_BT_TYPE,
  dealIds,
  filtersOf,
  pollerConfig,
  recordIds,
  setupPoller
} from "./stage3PollerFakes.mjs";

const CREATES = "centralreach_creates_only";
const UPDATES = "centralreach_updates_only";
// Production's settings (D18 d): both path settings, no record gate.
const TWO_GATES = Object.freeze({
  recordGateProperty: null,
  createGateProperty: CREATES,
  updateGateProperty: UPDATES
});
const BOX_VALUES = ["true", "false", null];
const BT = "bt_rbt";
const CLIENT_POST = "POST /contacts/client";
const EMPLOYEE_POST = "POST /contacts/employee";

const caseConfig = () => workflowConfig({ sync: TWO_GATES });

function runCase(record, input = {}, overrides = {}) {
  return runClientSyncWorkflow(
    { dealId: "deal-1", ...input },
    { ...clientWorkflowDeps({ record, config: caseConfig() }), ...overrides }
  );
}

function runBt(record, input = {}, overrides = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: BT, ...input },
    { ...employeeWorkflowDeps({ record, config: caseConfig() }), ...overrides }
  );
}

// ---------------------------------------------------------------------------------------------
// The decision
// ---------------------------------------------------------------------------------------------

test("[BR4][3.12] gateProperties falls back to the record gate for a path setting that is not set", () => {
  assert.deepEqual(gateProperties({ recordGateProperty: GATE }), { create: GATE, update: GATE });
  assert.deepEqual(gateProperties({ recordGateProperty: null }), { create: null, update: null });
  assert.deepEqual(gateProperties(TWO_GATES), { create: CREATES, update: UPDATES });
  assert.deepEqual(
    gateProperties({ recordGateProperty: GATE, createGateProperty: CREATES }),
    { create: CREATES, update: GATE }
  );
});

for (const [kind, eligibility, entry] of [
  ["Case", caseSyncEligibility, { enter_in_central_reach: "Yes", dealstage: "1" }],
  ["employee", employeeSyncEligibility, { entered_in_centralreach: "Yes" }]
]) {
  test(`[BR4][3.12] ${kind}: CR ID blank is allowed only with the creates box, CR ID filled only with the updates box, and a skip names its gate`, () => {
    for (const hubspotHasCrId of [false, true]) {
      for (const creates of BOX_VALUES) {
        for (const updates of BOX_VALUES) {
          const decision = eligibility({
            properties: { ...entry, [CREATES]: creates, [UPDATES]: updates },
            linked: hubspotHasCrId,
            hubspotHasCrId,
            gates: gateProperties(TWO_GATES)
          });
          const path = hubspotHasCrId ? "update" : "create";
          const allowed = (hubspotHasCrId ? updates : creates) === "true";
          const label = JSON.stringify({ hubspotHasCrId, creates, updates });
          assert.equal(decision.eligible, allowed, label);
          if (!allowed) {
            assert.deepEqual(decision, { eligible: false, reason: "record_gate", gate: path }, label);
          }
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------------------------
// The workers
// ---------------------------------------------------------------------------------------------

test("[BR4][3.12] a Case linked only in Cosmos is on the create gate: creates true goes on and writes the CR ID to HubSpot", async () => {
  const { cr } = setup();
  // Another External System ID, so the lookup by this Case's ID finds nothing: only the Cosmos
  // link can make the run update 2001 rather than create.
  seedClient(cr, "2001", "deal-other");
  await putState({ ...CASE_LINK, type: "link", ttlSeconds: -1, data: { crContactId: "2001" } });
  const record = stage3Case({ [CREATES]: "true", [UPDATES]: null });

  const result = await runCase(record);

  assert.notEqual(result.status, "skipped");
  assert.equal(record.properties.client_id_number, "2001");
  assert.equal(cr.count(CLIENT_POST), 0);
});

test("[BR4][3.12] a Case linked only in Cosmos with only the updates box is skipped on the create gate, with no CentralReach call", async () => {
  const { cr } = setup();
  seedClient(cr, "2001");
  await putState({ ...CASE_LINK, type: "link", ttlSeconds: -1, data: { crContactId: "2001" } });
  const record = stage3Case({ [CREATES]: null, [UPDATES]: "true" });
  const logs = [];

  const result = await runCase(record, {}, { safeLog: (level, message, meta) => logs.push({ message, meta }) });

  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "record_gate");
  assert.deepEqual(cr.calls, []);
  assert.deepEqual(record.writes, []);
  const skip = logs.find((entry) => entry.message === "Client sync skipped by eligibility gate.");
  assert.equal(skip.meta.gate, "create");
});

test("[BR4][3.12] a BT/RBT linked only in Cosmos is on the create gate: creates true goes on and writes the CR ID to HubSpot", async () => {
  const { cr } = setup();
  seedEmployee(cr, "5001", "1000001");
  await putState({ ...BT_LINK, type: "link", ttlSeconds: -1, data: { crContactId: "5001" } });
  const record = stage3Bt({ [CREATES]: "true", [UPDATES]: null });

  const result = await runBt(record);

  assert.notEqual(result.status, "skipped");
  assert.equal(record.properties.employee_id, "5001");
  assert.equal(cr.count(EMPLOYEE_POST), 0);
});

test("[BR4][3.12] a BT/RBT linked only in Cosmos with only the updates box is skipped on the create gate, with no CentralReach call", async () => {
  const { cr } = setup();
  seedEmployee(cr, "5001", "1000001");
  await putState({ ...BT_LINK, type: "link", ttlSeconds: -1, data: { crContactId: "5001" } });
  const record = stage3Bt({ [CREATES]: null, [UPDATES]: "true" });
  const logs = [];

  const result = await runBt(record, {}, { safeLog: (level, message, meta) => logs.push({ message, meta }) });

  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "record_gate");
  assert.deepEqual(cr.calls, []);
  assert.deepEqual(record.writes, []);
  const skip = logs.find((entry) => entry.message === "Employee sync skipped by eligibility gate.");
  assert.equal(skip.meta.gate, "create");
});

test("[BR4][3.12] the Case and the BT/RBT workers request both gate properties from HubSpot", async () => {
  setup();
  const caseRequested = [];
  const caseRecord = stage3Case({ [CREATES]: "true", [UPDATES]: null });
  await runCase(caseRecord, {}, {
    getDealById: async (_id, names) => {
      caseRequested.push(...names);
      return hubspotAnswer(caseRecord.read(), names);
    }
  });
  const btRequested = [];
  const btRecord = stage3Bt({ [CREATES]: "true", [UPDATES]: null });
  await runBt(btRecord, {}, {
    getBtRbtRecordById: async (_id, _type, names) => {
      btRequested.push(...names);
      return hubspotAnswer(btRecord.read(), names);
    }
  });
  for (const requested of [caseRequested, btRequested]) {
    assert.equal(requested.includes(CREATES), true);
    assert.equal(requested.includes(UPDATES), true);
  }
});

for (const [kind, makeRecord, run] of [
  ["Case", (cr, props) => (props.linked ? linkedCase(cr, props.boxes) : stage3Case(props.boxes)), runCase],
  [
    BT,
    (cr, props) => stage3Bt({ ...props.boxes, ...(props.linked ? { employee_id: "5001" } : {}) }),
    runBt
  ]
]) {
  for (const missing of [CREATES, UPDATES]) {
    test(`[BR4][3.12] a ${kind} answer without the ${missing} key is a failed read on a linked and an unlinked record, with no CentralReach call and no HubSpot write`, async () => {
      for (const linked of [false, true]) {
        const { cr } = setup();
        const record = makeRecord(cr, { linked, boxes: { [CREATES]: "true", [UPDATES]: "true" } });
        const without = (answer) => {
          delete answer.properties[missing];
          return answer;
        };
        const readers =
          kind === "Case"
            ? { getDealById: async (_id, names) => without(hubspotAnswer(record.read(), names)) }
            : {
                getBtRbtRecordById: async (_id, _type, names) =>
                  without(hubspotAnswer(record.read(), names))
              };
        const callsBefore = cr.calls.length;
        await assert.rejects(run(record, {}, readers), (error) => error.code === "HUBSPOT_READ_FAILED");
        assert.deepEqual(cr.calls.slice(callsBefore), [], String(linked));
        assert.deepEqual(record.writes, [], String(linked));
      }
    });
  }
}

const SOURCES = ["hubspotWorkflow", "intakePoller", "dailySweep", CONTACT_FAN_OUT_SOURCE, "linkedRecheck"];
const ATTEMPTS = [
  { attempt: 0 },
  { attempt: 1 },
  { attempt: MAX_RETRIES, lastAttempt: true }
];

test("[BR4][3.12] with two gates, a record in neither segment is skipped on every source and attempt, with no CentralReach call and no HubSpot write", async () => {
  for (const source of SOURCES) {
    for (const attempt of ATTEMPTS) {
      const label = `${source} ${JSON.stringify(attempt)}`;
      // A linked Case (update path) and an unlinked Entered = Yes BT/RBT (create path).
      const caseSide = setup();
      const linkedRecord = linkedCase(caseSide.cr, { [CREATES]: null, [UPDATES]: null, [GATE]: "true" });
      const caseResult = await runCase(linkedRecord, { source, ...attempt });
      assert.equal(caseResult.status, "skipped", label);
      assert.equal(caseResult.reason, "record_gate", label);
      assert.deepEqual(caseSide.cr.calls, [], label);
      assert.deepEqual(linkedRecord.writes, [], label);

      const btSide = setup();
      const unlinkedRecord = stage3Bt({ [CREATES]: "false", [UPDATES]: "false", [GATE]: "true" });
      const btResult = await runBt(unlinkedRecord, { source, ...attempt });
      assert.equal(btResult.status, "skipped", label);
      assert.equal(btResult.reason, "record_gate", label);
      assert.deepEqual(btSide.cr.calls, [], label);
      assert.deepEqual(unlinkedRecord.writes, [], label);
    }
  }
});

test("[BR4][3.12] an updates box that turns false between a run and its retry: the retry is skipped, with no CentralReach call", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { [UPDATES]: "true" });
  const first = await runCase(record, { source: "hubspotWorkflow", attempt: 0 });
  assert.notEqual(first.status, "skipped");

  record.write({ [UPDATES]: "false" });
  const callsBefore = cr.calls.length;
  const writesBefore = record.writes.length;
  const retry = await runCase(record, { source: "hubspotWorkflow", attempt: 1 });

  assert.equal(retry.status, "skipped");
  assert.equal(retry.reason, "record_gate");
  assert.equal(cr.calls.length, callsBefore);
  assert.equal(record.writes.length, writesBefore);
});

test("[BR4][3.12] hand-off: after a create, a retry with the CR ID in HubSpot and the updates box blank is skipped with no second create; with the updates box ticked it finishes", async () => {
  const { cr } = setup();
  const record = stage3Bt({ [CREATES]: "true", [UPDATES]: null });
  const logs = [];
  const logTo = { safeLog: (level, message, meta) => logs.push({ message, meta }) };

  const created = await runBt(record, { source: "hubspotWorkflow", attempt: 0 }, logTo);
  assert.notEqual(created.status, "skipped");
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  const crId = record.properties.employee_id;
  assert.ok(crId);

  const callsBefore = cr.calls.length;
  const retry = await runBt(record, { source: "hubspotWorkflow", attempt: 1 }, logTo);
  assert.equal(retry.status, "skipped");
  assert.equal(retry.reason, "record_gate");
  assert.equal(cr.calls.length, callsBefore);
  const skip = logs.find((entry) => entry.message === "Employee sync skipped by eligibility gate.");
  assert.equal(skip.meta.gate, "update");

  record.write({ [UPDATES]: "true" });
  const finished = await runBt(record, { source: "intakePoller", attempt: 0 });
  assert.notEqual(finished.status, "skipped");
  assert.equal(cr.count(EMPLOYEE_POST), 1);
  assert.equal(record.properties.employee_id, crId);
});

// Gate follow-up note B2 (2026-11-24): a create whose label POST is not confirmed yet. The run
// ends CR_LABEL_POST_UNCONFIRMED (temporary), so HubSpot gets only the CR ID and the link, and
// the queue schedules the retry in 150 s. That retry finds the CR ID, is judged on the update
// gate and, with the updates box blank, is skipped: no CentralReach call, no HubSpot write, the
// status still blank. Once the updates box is ticked, the next run finishes the record with no
// second create and no second label POST. Through the real queue functions; label lag is faked:
// after the POST, CentralReach's label read still shows the old (empty) set.
const LABEL_READ = "GET /contacts/{id}/labels";
const LABEL_POST = "POST /contacts/{id}/labels";
const HAND_OFF_WORKERS = [
  {
    kind: "Case",
    record: (boxes) => stage3Case(boxes),
    crIdProperty: "client_id_number",
    createPost: CLIENT_POST,
    link: CASE_LINK,
    message: { dealId: "deal-1", workflow: "clientSync" },
    pollerSource: "intakePoller",
    processQueue: processClientQueue,
    run: (input, record, logs) =>
      runClientSyncWorkflow(input, {
        ...clientWorkflowDeps({ record, logs, config: caseConfig() }),
        labelReadBackDelayMs: 0
      })
  },
  {
    kind: "BT/RBT",
    record: (boxes) => stage3Bt(boxes),
    crIdProperty: "employee_id",
    createPost: EMPLOYEE_POST,
    link: BT_LINK,
    message: { recordId: "HS1", employeeType: BT, workflow: "employeeSync" },
    pollerSource: "employeePoller",
    processQueue: processEmployeeQueue,
    run: (input, record, logs) =>
      runEmployeeSyncWorkflow(input, {
        ...employeeWorkflowDeps({ record, logs, config: caseConfig() }),
        labelReadBackDelayMs: 0
      })
  }
];

async function throughQueue(worker, record, body) {
  const logs = [];
  const runs = [];
  const scheduled = [];
  await worker.processQueue(
    body,
    { functionName: "b2", invocationId: "inv-b2", triggerMetadata: { messageId: "msg-b2", deliveryCount: 1 } },
    {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async (input) => {
        const result = await worker.run(input, record, logs);
        runs.push({ input, result });
        return result;
      },
      scheduleRetry: async (message) => {
        scheduled.push(message);
      }
    }
  );
  const summary = logs.filter((entry) => entry.message === SYNC_RUN_SUMMARY_MESSAGE).at(-1)?.meta;
  return { runs, scheduled, summary };
}

// The create run, up to the retry it schedules. Returns the retry message.
async function unfinishedCreate(worker, cr, container, record) {
  let labelLag = false;
  cr.onRequest = (name) => {
    if (name === LABEL_POST) {
      labelLag = true;
    }
    if (labelLag && name === LABEL_READ) {
      cr.answer(LABEL_READ, { labels: [] });
    }
  };
  const sentAt = Date.now();
  const body = { ...worker.message, portalId: SANDBOX_PORTAL, source: "hubspotWorkflow" };
  const created = await throughQueue(worker, record, body);
  cr.onRequest = null;

  assert.equal(created.runs.length, 0, "the create run threw a temporary failure");
  assert.equal(created.summary.reasonCode, "CR_LABEL_POST_UNCONFIRMED");
  assert.equal(created.summary.operation, "create");
  assert.equal(created.scheduled.length, 1);
  const retry = created.scheduled[0];
  assert.equal(retry.body.attempt, 1);
  const delaySeconds = (retry.scheduledEnqueueTimeUtc.getTime() - sentAt) / 1000;
  assert.ok(delaySeconds >= 149 && delaySeconds <= 155, String(delaySeconds));
  assert.equal(cr.count(worker.createPost), 1);
  assert.equal(cr.count(LABEL_POST), 1);
  // HubSpot holds the CR ID (and the link) and no status: a temporary failure writes none.
  assert.ok(record.properties[worker.crIdProperty]);
  assert.equal(record.properties.last_sync_status, "");
  assert.equal(record.properties.last_sync_error, "");
  for (const write of record.writes) {
    assert.equal(Object.hasOwn(write, "last_sync_status"), false);
  }
  const link = container.get(worker.link.pk, worker.link.id).data;
  assert.equal(link.labelsPending, true);
  assert.equal(link.clean, false);
  return retry;
}

// The run that finishes the record: success, one create in all, no second label POST.
function assertFinished(worker, cr, container, record, finished, crId) {
  assert.equal(finished.runs.length, 1);
  assert.equal(finished.runs[0].result.status, "success");
  assert.equal(finished.summary.operation, "update");
  assert.deepEqual(finished.scheduled, []);
  assert.equal(cr.count(worker.createPost), 1);
  assert.equal(cr.count(LABEL_POST), 1);
  assert.equal(record.properties[worker.crIdProperty], crId);
  assert.equal(record.properties.last_sync_status, "success");
  const link = container.get(worker.link.pk, worker.link.id).data;
  assert.equal(link.labelsPending, false);
  assert.equal(link.clean, true);
}

for (const worker of HAND_OFF_WORKERS) {
  test(`[BR4][BR19] ${worker.kind}, two gates, creates ticked and updates blank: an unfinished create (label POST unconfirmed) is retried in 150 s, the retry is skipped on the update gate with no CentralReach call and no HubSpot write, the status stays blank; after the updates tick the next poll finishes it with one create and one label POST`, async () => {
    const { container, cr } = setup();
    const record = worker.record({ [CREATES]: "true", [UPDATES]: null });
    const retryMessage = await unfinishedCreate(worker, cr, container, record);
    const crId = record.properties[worker.crIdProperty];

    const callsBefore = cr.calls.length;
    const writesBefore = record.writes.length;
    const retry = await throughQueue(worker, record, retryMessage.body);
    assert.equal(retry.runs[0].input.attempt, 1);
    assert.equal(retry.runs[0].result.status, "skipped");
    assert.equal(retry.runs[0].result.reason, "record_gate");
    assert.equal(retry.summary.gate, "update");
    assert.equal(cr.calls.length, callsBefore);
    assert.equal(record.writes.length, writesBefore);
    assert.deepEqual(retry.scheduled, []);
    assert.equal(record.properties.last_sync_status, "");
    assert.equal(record.properties.last_sync_error, "");

    record.write({ [UPDATES]: "true" });
    const poll = await throughQueue(worker, record, {
      ...worker.message,
      portalId: SANDBOX_PORTAL,
      source: worker.pollerSource,
      attempt: 0
    });
    assertFinished(worker, cr, container, record, poll, crId);
  });

  test(`[BR4][BR19] ${worker.kind}, two gates: with the updates box ticked before the 150 s retry of an unfinished create, the retry itself finishes the record with the same CentralReach calls as the next poll would make`, async () => {
    // The poll path, for its calls.
    let { container, cr } = setup();
    let record = worker.record({ [CREATES]: "true", [UPDATES]: null });
    await throughQueue(worker, record, await unfinishedCreate(worker, cr, container, record).then((m) => m.body));
    record.write({ [UPDATES]: "true" });
    let start = cr.calls.length;
    await throughQueue(worker, record, {
      ...worker.message,
      portalId: SANDBOX_PORTAL,
      source: worker.pollerSource,
      attempt: 0
    });
    const pollCalls = cr.calls.slice(start).map((call) => call.name);

    ({ container, cr } = setup());
    record = worker.record({ [CREATES]: "true", [UPDATES]: null });
    const retryMessage = await unfinishedCreate(worker, cr, container, record);
    const crId = record.properties[worker.crIdProperty];
    record.write({ [UPDATES]: "true" });
    start = cr.calls.length;
    const retry = await throughQueue(worker, record, retryMessage.body);
    assert.equal(retry.runs[0].input.attempt, 1);
    assertFinished(worker, cr, container, record, retry, crId);
    assert.deepEqual(cr.calls.slice(start).map((call) => call.name), pollCalls);
  });
}

// ---------------------------------------------------------------------------------------------
// The poller and the daily sweep
// ---------------------------------------------------------------------------------------------

const twoGatePollerConfig = () => ({ ...pollerConfig(), sync: { ...TWO_GATES } });
const gateFilter = (name) => ({ propertyName: name, operator: "EQ", value: "true" });

test("[BR4][3.4] with two gates, the poller's linked group carries only the update gate and its Entered = Yes group only the create gate", async () => {
  const poller = setupPoller({ config: twoGatePollerConfig(), now: "2026-11-20T07:00:00.000Z" });
  const recent = poller.minutesAgo(30);
  // Linked: queued only with the updates box.
  poller.hubspot.add(CASE_TYPE, "1", { client_id_number: "5001", [UPDATES]: "true", hs_lastmodifieddate: recent });
  poller.hubspot.add(CASE_TYPE, "2", { client_id_number: "5002", [CREATES]: "true", hs_lastmodifieddate: recent });
  // Entered = Yes and unlinked: queued only with the creates box.
  poller.hubspot.add(CASE_TYPE, "3", { enter_in_central_reach: "Yes", [CREATES]: "true", hs_lastmodifieddate: recent });
  poller.hubspot.add(CASE_TYPE, "4", { enter_in_central_reach: "Yes", [UPDATES]: "true", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", { employee_id: "7001", [UPDATES]: "true", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", { entered_in_centralreach: "Yes", [UPDATES]: "true", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", { entered_in_centralreach: "Yes", [CREATES]: "true", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "22", { employee_id: "7002", [GATE]: "true", hs_lastmodifieddate: recent });

  await poller.run();

  assert.equal(poller.hubspot.requests.length, 3);
  for (const request of poller.hubspot.requests) {
    assert.deepEqual(filtersOf(request, UPDATES), [gateFilter(UPDATES), undefined]);
    assert.deepEqual(filtersOf(request, CREATES), [undefined, gateFilter(CREATES)]);
    assert.deepEqual(filtersOf(request, GATE), [undefined, undefined]);
  }
  assert.deepEqual(dealIds(poller.queues.client).sort(), ["1", "3"]);
  assert.deepEqual(recordIds(poller.queues.employee).sort(), ["11", "21"]);
});

test("[BR4][3.5] with two gates, the sweep's linked branch carries the update gate and its waiting branch the create gate", async () => {
  const eight = "2026-11-20T08:00:00.000Z";
  const old = "2026-11-10T12:00:00.000Z";
  const poller = setupPoller({ config: twoGatePollerConfig(), now: eight });
  poller.hubspot.add(CASE_TYPE, "1", { client_id_number: "5001", [UPDATES]: "true", hs_lastmodifieddate: old });
  poller.hubspot.add(CASE_TYPE, "2", { client_id_number: "5002", [CREATES]: "true", hs_lastmodifieddate: old });
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", { last_sync_status: "waiting", [CREATES]: "true", hs_lastmodifieddate: old });
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", { last_sync_status: "waiting", [UPDATES]: "true", hs_lastmodifieddate: old });

  await poller.run();

  const sweepRequests = poller.hubspot.requests.filter(
    (request) => request.body.sorts[0].propertyName === "hs_object_id"
  );
  assert.equal(sweepRequests.length, 3);
  for (const request of sweepRequests) {
    assert.deepEqual(filtersOf(request, UPDATES), [gateFilter(UPDATES), undefined]);
    assert.deepEqual(filtersOf(request, CREATES), [undefined, gateFilter(CREATES)]);
  }
  const swept = (messages) => messages.filter((message) => message.body.source === "dailySweep");
  assert.deepEqual(dealIds(swept(poller.queues.client)), ["1"]);
  assert.deepEqual(recordIds(swept(poller.queues.employee)), ["11"]);
});
