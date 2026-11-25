// Item 18 (build package 2026-11-23, D18): the record gate holds on every path. Tests only; the
// gate is already read on every path, and these pin it so a later change cannot open one.
// Requirement BR4. The sandbox configuration (one record gate, SYNC_RECORD_GATE_PROPERTY) and the
// production one (two gates, item 24) are both run here through the real queue functions.
// HubSpot, Service Bus, CentralReach HTTP (the fake HTTP adapter) and Cosmos (the in-memory
// container) are faked. The queue functions, the workflows, the mapper and
// centralReachClient.mjs are real. No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import { MAX_RETRIES } from "../../lib/retry.mjs";
import { useServiceBusSenders, sendClientSyncMessage } from "../../lib/serviceBusClient.mjs";
import { processClientQueue } from "../../functions/processClientQueue.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  CONTACT_FAN_OUT_SOURCE,
  runContactFanOutWorkflow
} from "../../workflows/contactFanOutWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  hubspotAnswer,
  timeoutError,
  workflowConfig
} from "./stage2Fakes.mjs";
import {
  linkedBcba,
  linkedBt,
  linkedCase,
  setup,
  stage3Bcba,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";
import { GATE } from "./stage3PollerFakes.mjs";

// The sandbox settings: one record gate for both paths, no path setting.
const ONE_GATE = Object.freeze({ recordGateProperty: GATE });
const CREATES = "centralreach_creates_only";
const UPDATES = "centralreach_updates_only";
const TWO_GATES = Object.freeze({
  recordGateProperty: null,
  createGateProperty: CREATES,
  updateGateProperty: UPDATES
});
// Zeke 2026-11-25: the record gate next to the two path settings. A record needs the record gate
// AND its own path's box.
const COMBINED = Object.freeze({ ...TWO_GATES, recordGateProperty: GATE });

// processClientQueue.mjs ALLOWED_SOURCES that a sender uses today, and the employee senders'
// sources (the webhook, the employee poller and the daily sweep).
const CLIENT_SOURCES = ["hubspotWorkflow", "intakePoller", "dailySweep", CONTACT_FAN_OUT_SOURCE, "linkedRecheck"];
const EMPLOYEE_SOURCES = ["hubspotWorkflow", "employeePoller", "dailySweep"];
const ATTEMPTS = [0, 1, MAX_RETRIES];
const GATE_VALUES = ["false", null];
// A record gate that is not true: false, "no", blank or not set.
const RECORD_GATE_CLOSED = ["false", "no", "", null];

const queueContext = () => ({
  functionName: "item18",
  invocationId: "inv-18",
  triggerMetadata: { messageId: "msg-18", deliveryCount: 1 }
});

// One queue worker kind: how to make its records (with the given gate boxes), its message and its
// workflow run.
const WORKERS = [
  {
    kind: "Case",
    sources: CLIENT_SOURCES,
    linked: (cr, boxes) => linkedCase(cr, boxes),
    unlinked: (boxes) => stage3Case(boxes),
    message: { dealId: "deal-1", workflow: "clientSync" },
    processQueue: processClientQueue,
    run: (input, record, sync) =>
      runClientSyncWorkflow(input, clientWorkflowDeps({ record, config: workflowConfig({ sync }) }))
  },
  {
    kind: "bt_rbt",
    sources: EMPLOYEE_SOURCES,
    linked: (cr, boxes) => linkedBt(cr, boxes),
    unlinked: (boxes) => stage3Bt(boxes),
    message: { recordId: "HS1", employeeType: "bt_rbt", workflow: "employeeSync" },
    processQueue: processEmployeeQueue,
    run: (input, record, sync) =>
      runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record, config: workflowConfig({ sync }) }))
  },
  {
    kind: "bcba",
    sources: EMPLOYEE_SOURCES,
    linked: (cr, boxes) => linkedBcba(cr, boxes),
    unlinked: (boxes) => stage3Bcba({ employee_id: "", ...boxes }),
    message: { recordId: "HS2", employeeType: "bcba", workflow: "employeeSync" },
    processQueue: processEmployeeQueue,
    run: (input, record, sync) =>
      runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record, config: workflowConfig({ sync }) }))
  }
];

// Runs one message through the worker's real queue function. Returns what the workflow returned,
// the input it was given and the retries the queue scheduled.
async function throughQueue(worker, record, { sync = ONE_GATE, body }) {
  const runs = [];
  const scheduled = [];
  await worker.processQueue(body, queueContext(), {
    portalId: SANDBOX_PORTAL,
    runWorkflow: async (input) => {
      const result = await worker.run(input, record, sync);
      runs.push({ input, result });
      return result;
    },
    scheduleRetry: async (message) => {
      scheduled.push(message);
    }
  });
  return { runs, scheduled };
}

// Every source and attempt, for a linked and an unlinked record whose boxes put it in no segment.
async function assertSkippedEverywhere(worker, sync, closed, gateValues = GATE_VALUES) {
  for (const source of worker.sources) {
    for (const attempt of ATTEMPTS) {
      for (const gate of gateValues) {
        for (const linked of [true, false]) {
          const label = JSON.stringify({ source, attempt, gate, linked });
          const { cr } = setup();
          const record = linked ? worker.linked(cr, closed(gate)) : worker.unlinked(closed(gate));
          const body = { ...worker.message, portalId: SANDBOX_PORTAL, source, attempt };

          const { runs, scheduled } = await throughQueue(worker, record, { sync, body });

          assert.equal(runs.length, 1, label);
          assert.equal(runs[0].input.lastAttempt, attempt === MAX_RETRIES, label);
          assert.equal(runs[0].result.status, "skipped", label);
          assert.equal(runs[0].result.reason, "record_gate", label);
          assert.deepEqual(cr.calls, [], label);
          assert.deepEqual(record.writes, [], label);
          assert.deepEqual(scheduled, [], label);
        }
      }
    }
  }
}

for (const worker of WORKERS) {
  test(`[BR4] ${worker.kind} worker, sandbox record gate false or blank: every source and attempt skips a linked and an unlinked record, with no CentralReach call, no HubSpot write and no retry`, async () => {
    await assertSkippedEverywhere(worker, ONE_GATE, (gate) => ({ [GATE]: gate }));
  });

  // Both boxes false or blank: a linked record is not in the updates segment and an unlinked one
  // is not in the creates segment. The old record gate is ticked, to show it is not read.
  test(`[BR4][3.12] ${worker.kind} worker, two gates with both boxes false or blank (in neither segment): every source and attempt skips a linked and an unlinked record, with no CentralReach call, no HubSpot write and no retry`, async () => {
    await assertSkippedEverywhere(worker, TWO_GATES, (gate) => ({
      [CREATES]: gate,
      [UPDATES]: gate,
      [GATE]: "true"
    }));
  });

  // Both boxes ticked, so a linked record is in the updates segment and an unlinked one in the
  // creates segment; only the record gate is not true.
  test(`[BR4][3.12] ${worker.kind} worker, record gate with two path settings, both boxes ticked and the record gate false, "no", blank or not set: every source and attempt skips a linked and an unlinked record, with no CentralReach call, no HubSpot write and no retry`, async () => {
    await assertSkippedEverywhere(
      worker,
      COMBINED,
      (gate) => ({ [CREATES]: "true", [UPDATES]: "true", [GATE]: gate }),
      RECORD_GATE_CLOSED
    );
  });

  // The record gate true: only the box of the record's own path lets it on.
  test(`[BR4][3.12] ${worker.kind} worker, record gate with two path settings and the record gate true: a linked record goes on only with the updates box and an unlinked one only with the creates box; the other path's box alone or no box is a record_gate skip with no CentralReach call`, async () => {
    for (const linked of [true, false]) {
      const ownBox = linked ? UPDATES : CREATES;
      const otherBox = linked ? CREATES : UPDATES;
      for (const [boxes, eligible] of [
        [{ [ownBox]: "true" }, true],
        [{ [ownBox]: "true", [otherBox]: "true" }, true],
        [{ [otherBox]: "true" }, false],
        [{ [ownBox]: "false", [otherBox]: "true" }, false],
        [{}, false]
      ]) {
        const label = JSON.stringify({ linked, boxes });
        const { cr } = setup();
        const props = { [CREATES]: null, [UPDATES]: null, ...boxes, [GATE]: "true" };
        const record = linked ? worker.linked(cr, props) : worker.unlinked(props);
        const body = { ...worker.message, portalId: SANDBOX_PORTAL, source: "hubspotWorkflow", attempt: 0 };

        const { runs } = await throughQueue(worker, record, { sync: COMBINED, body });

        assert.equal(runs.length, 1, label);
        if (eligible) {
          // Past the gate. (The unlinked BCBA fixture then ends as a mapping error before any
          // CentralReach call, so only the outcome is checked here.)
          assert.notEqual(runs[0].result.status, "skipped", label);
        } else {
          assert.equal(runs[0].result.status, "skipped", label);
          assert.equal(runs[0].result.reason, "record_gate", label);
          assert.deepEqual(cr.calls, [], label);
          assert.deepEqual(record.writes, [], label);
        }
      }
    }
  });
}

// The fan-out queues every linked Case and leaves the gate to the Case worker
// (contactFanOutWorkflow.mjs, by design).
for (const [name, sync, closedGate] of [
  ["the sandbox record gate", ONE_GATE, { [GATE]: "false" }],
  ["two gates", TWO_GATES, { [CREATES]: "false", [UPDATES]: "false" }],
  [
    "the record gate and two path settings (both boxes ticked)",
    COMBINED,
    { [CREATES]: "true", [UPDATES]: "true", [GATE]: "false" }
  ]
]) {
  test(`[BR4] with ${name}, the Contact fan-out queues a Case whose gate is false and the Case worker then skips it with no CentralReach call`, async () => {
    const { cr } = setup();
    const record = linkedCase(cr, closedGate);
    const sent = [];
    useServiceBusSenders({
      clientSyncSender: { sendMessages: async (message) => sent.push(message) },
      employeeSyncSender: { sendMessages: async () => assert.fail("no employee message") }
    });
    const fanOutDeps = {
      getConfig: () => workflowConfig({ sync }),
      createHubSpotClient: () => {},
      ensureServiceBusClient: () => {},
      getContactById: async (contactId, names) =>
        hubspotAnswer({ id: contactId, properties: { test_record: null } }, names),
      listAssociations: async () => [{ toObjectId: "deal-1", types: [{ typeId: 4 }] }],
      sendClientSyncMessage,
      safeLog: () => {}
    };

    // The Contact notice runs the fan-out through the client queue.
    const contactChange = { workflow: "contactChange", contactId: "701", portalId: SANDBOX_PORTAL, source: "hubspotWorkflow" };
    await processClientQueue(contactChange, queueContext(), {
      portalId: SANDBOX_PORTAL,
      runContactFanOut: (input) => runContactFanOutWorkflow(input, fanOutDeps),
      scheduleRetry: async () => assert.fail("the fan-out is not retried")
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].body.dealId, "deal-1");
    assert.equal(sent[0].body.source, CONTACT_FAN_OUT_SOURCE);

    // The queued Case message reaches the Case worker, which skips it on the gate.
    const { runs, scheduled } = await throughQueue(WORKERS[0], record, { sync, body: sent[0].body });
    assert.equal(runs[0].result.status, "skipped");
    assert.equal(runs[0].result.reason, "record_gate");
    assert.deepEqual(cr.calls, []);
    assert.deepEqual(record.writes, []);
    assert.deepEqual(scheduled, []);
  });
}

// A temporary failure schedules a retry; the gate turns false before the retry runs. With two
// gates a linked record is on the update gate, so the updates box is the one that turns false.
async function assertRetrySkipped(worker, failRoute, { sync, open, close }) {
  const { cr } = setup();
  const record = worker.linked(cr, open);
  cr.fail(failRoute, timeoutError());
  const body = { ...worker.message, portalId: SANDBOX_PORTAL, source: "hubspotWorkflow" };

  const first = await throughQueue(worker, record, { sync, body });
  assert.equal(first.runs.length, 0, "the first run threw a temporary failure");
  assert.equal(first.scheduled.length, 1);
  assert.equal(cr.count(failRoute), 1, "the failed run reached the update");

  record.write(close);
  const callsBefore = cr.calls.length;
  const writesBefore = record.writes.length;
  const retry = await throughQueue(worker, record, { sync, body: first.scheduled[0].body });

  assert.equal(retry.runs[0].input.attempt, 1);
  assert.equal(retry.runs[0].result.status, "skipped");
  assert.equal(retry.runs[0].result.reason, "record_gate");
  assert.equal(cr.calls.length, callsBefore);
  assert.equal(record.writes.length, writesBefore);
  assert.deepEqual(retry.scheduled, []);
}

for (const [worker, failRoute] of [
  [WORKERS[0], "PUT /contacts/client/{id}"],
  [WORKERS[1], "PUT /contacts/employee/{id}"],
  [WORKERS[2], "PUT /contacts/employee/{id}"]
]) {
  test(`[BR4] ${worker.kind}: a sandbox record gate that turns false between a failed run and its scheduled retry: the retry is skipped, with no CentralReach call and no HubSpot write`, async () => {
    await assertRetrySkipped(worker, failRoute, {
      sync: ONE_GATE,
      open: { [GATE]: "true" },
      close: { [GATE]: "false" }
    });
  });

  test(`[BR4][3.12] ${worker.kind}: with two gates, an updates box that turns false between a failed run and its scheduled retry: the retry is skipped, with no CentralReach call and no HubSpot write`, async () => {
    await assertRetrySkipped(worker, failRoute, {
      sync: TWO_GATES,
      open: { [CREATES]: null, [UPDATES]: "true", [GATE]: "true" },
      close: { [UPDATES]: "false" }
    });
  });

  test(`[BR4][3.12] ${worker.kind}: with the record gate and two path settings, a record gate that turns false between a failed run and its scheduled retry (updates box still ticked): the retry is skipped, with no CentralReach call and no HubSpot write`, async () => {
    await assertRetrySkipped(worker, failRoute, {
      sync: COMBINED,
      open: { [CREATES]: null, [UPDATES]: "true", [GATE]: "true" },
      close: { [GATE]: "false" }
    });
  });
}
