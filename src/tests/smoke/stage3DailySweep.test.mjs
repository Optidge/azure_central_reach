// Stage 3, lane A: the daily sweep (BUILD-PLAN row 3.5).
// Guide: Change detection Architecture tab, 11/17 approved design ("a daily sweep of linked
// records"); [G17] 11/18 (3) (a waiting record is checked again by the hourly poller and by the
// daily sweep); section 11 ("Some mapped values change without anyone editing the field").
// Same fakes as the poller tests. No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import { sha256 } from "../../lib/hash.mjs";
import { sendClientSyncMessage, sendEmployeeSyncMessage } from "../../lib/serviceBusClient.mjs";
import { processClientQueue } from "../../functions/processClientQueue.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import {
  SWEEP_MAX_MESSAGES_PER_RUN,
  SWEEP_MESSAGES_PER_MINUTE
} from "../../workflows/intakePollerWorkflow.mjs";
import { SANDBOX_PORTAL, queueContext } from "./stage2Fakes.mjs";
import {
  CASE_TYPE,
  EXCLUDED_STAGES,
  GATE,
  SANDBOX_BCBA_TYPE,
  SANDBOX_BT_TYPE,
  dealIds,
  fakeQueues,
  filtersOf,
  pollerConfig,
  recordIds,
  setupPoller
} from "./stage3PollerFakes.mjs";

const EIGHT = "2026-11-20T08:00:00.000Z";
// Nobody edited these records for ten days, so the hourly search does not find them.
const OLD = "2026-11-10T12:00:00.000Z";

const gated = (properties) => ({ [GATE]: "true", hs_lastmodifieddate: OLD, ...properties });
const swept = (messages) => messages.filter((message) => message.body.source === "dailySweep");
const sweepRequests = (poller) =>
  poller.hubspot.requests.filter((request) => request.body.sorts[0].propertyName === "hs_object_id");
const marker = (poller) => poller.container.get("poller:sweep", `${SANDBOX_PORTAL}:daily`);

function addOneLinkedOfEach(poller) {
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001" }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", gated({ employee_id: "7001" }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ employee_id: "7002" }));
}

async function runAt(poller, now) {
  poller.setNow(now);
  poller.queues.clear();
  const summary = await poller.run();
  return {
    summary,
    cases: dealIds(swept(poller.queues.client)),
    employees: recordIds(swept(poller.queues.employee))
  };
}

test("[BR14][3.5] once a day, in the first run at or after 08:00 UTC, every linked record is queued with the source dailySweep", async () => {
  const poller = setupPoller({ now: "2026-11-20T07:00:00.000Z" });
  addOneLinkedOfEach(poller);

  const early = await runAt(poller, "2026-11-20T07:00:00.000Z");
  assert.deepEqual(early.summary.sweep, { ran: false, done: false, queued: 0 });
  assert.equal(poller.queues.all().length, 0);

  const sweep = await runAt(poller, EIGHT);
  assert.equal(sweep.summary.errorsCount, 0);
  assert.deepEqual(sweep.summary.sweep, { ran: true, done: true, queued: 3 });
  assert.equal(sweep.summary.messagesEnqueued, 3);
  assert.deepEqual(poller.queues.client, [
    {
      body: {
        workflow: "clientSync",
        source: "dailySweep",
        portalId: SANDBOX_PORTAL,
        dealId: "1",
        enqueuedAt: EIGHT
      },
      messageId: sha256(`1:${EIGHT}`)
    }
  ]);
  assert.deepEqual(poller.queues.employee, [
    {
      body: {
        recordId: "11",
        employeeType: "bt_rbt",
        workflow: "employeeSync",
        source: "dailySweep",
        portalId: SANDBOX_PORTAL,
        enqueuedAt: EIGHT
      },
      messageId: sha256(`bt_rbt:11:${EIGHT}`)
    },
    {
      body: {
        recordId: "21",
        employeeType: "bcba",
        workflow: "employeeSync",
        source: "dailySweep",
        portalId: SANDBOX_PORTAL,
        enqueuedAt: EIGHT
      },
      messageId: sha256(`bcba:21:${EIGHT}`)
    }
  ]);

  // Not again the same day.
  for (const now of ["2026-11-20T09:00:00.000Z", "2026-11-20T23:00:00.000Z"]) {
    const later = await runAt(poller, now);
    assert.deepEqual(later.summary.sweep, { ran: false, done: true, queued: 0 });
    assert.equal(poller.queues.all().length, 0);
  }
});

test("[BR14][3.5] the sweep runs once a day even when the 08:00 run is missed", async () => {
  const poller = setupPoller({ now: EIGHT });
  addOneLinkedOfEach(poller);
  assert.deepEqual((await runAt(poller, EIGHT)).cases, ["1"]);

  // The next day: nothing before 08:00, and the 08:00, 09:00 and 10:00 runs did not happen.
  assert.deepEqual((await runAt(poller, "2026-11-21T07:00:00.000Z")).cases, []);
  const late = await runAt(poller, "2026-11-21T11:00:00.000Z");
  assert.deepEqual(late.cases, ["1"]);
  assert.deepEqual(late.employees, ["11", "21"]);
  assert.equal(marker(poller).data.day, "2026-11-21");

  const after = await runAt(poller, "2026-11-21T12:00:00.000Z");
  assert.deepEqual([...after.cases, ...after.employees], []);
});

test("[BR14][3.5] a partial failure runs again the next hour, from the last finished page", async () => {
  const poller = setupPoller({ now: EIGHT });
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001" }));
  for (let id = 1; id <= 150; id += 1) {
    poller.hubspot.add(SANDBOX_BT_TYPE, id, gated({ employee_id: String(7000 + id) }));
  }
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "900", gated({ employee_id: "8001" }));
  let employeeSends = 0;
  poller.queues.beforeSend = (queueName) => {
    if (queueName === "employee") {
      employeeSends += 1;
      if (employeeSends === 120) {
        throw new Error("Service Bus send failed");
      }
    }
  };

  const failed = await runAt(poller, EIGHT);

  assert.equal(failed.summary.errorsCount, 1);
  assert.equal(failed.summary.sweep.ran, true);
  assert.equal(failed.summary.sweep.done, false);
  assert.deepEqual(failed.cases, ["1"]);
  // 119 BT/RBT records went out, then the send failed. The BCBA sweep still ran.
  assert.equal(failed.employees.length, 120);
  assert.equal(failed.employees.at(-1), "900");
  assert.equal(marker(poller).data.done, false);

  poller.queues.beforeSend = null;
  const again = await runAt(poller, "2026-11-20T09:00:00.000Z");

  assert.equal(again.summary.errorsCount, 0);
  assert.deepEqual(again.summary.sweep, { ran: true, done: true, queued: 50 });
  // Page one (records 1 to 100) was finished, so the sweep goes on at record 101.
  assert.deepEqual(again.cases, []);
  assert.deepEqual(again.employees, Array.from({ length: 50 }, (_, index) => String(101 + index)));
  assert.equal(marker(poller).data.done, true);

  const after = await runAt(poller, "2026-11-20T10:00:00.000Z");
  assert.equal(after.summary.sweep.ran, false);
  assert.deepEqual([...after.cases, ...after.employees], []);
});

test("[BR14][3.5] a failed sweep search for one entity still sweeps the others, and the sweep runs again the next hour", async () => {
  const poller = setupPoller({ now: EIGHT });
  addOneLinkedOfEach(poller);
  // Both Case searches of this hour fail: the hourly one and the sweep one.
  poller.hubspot.fail(CASE_TYPE, new Error("socket hang up"), 2);

  const failed = await runAt(poller, EIGHT);

  assert.equal(failed.summary.errorsCount, 2);
  assert.deepEqual(failed.cases, []);
  assert.deepEqual(failed.employees, ["11", "21"]);
  assert.equal(failed.summary.sweep.done, false);

  const again = await runAt(poller, "2026-11-20T09:00:00.000Z");
  assert.deepEqual(again.cases, ["1"]);
  assert.deepEqual(again.employees, []);
  assert.equal(again.summary.sweep.done, true);
});

test("[BR10][3.5] the sweep also queues an unlinked record whose status is waiting, and no other unlinked record", async () => {
  const poller = setupPoller({ now: EIGHT });
  poller.hubspot.add(CASE_TYPE, "1", gated({ enter_in_central_reach: "Yes", last_sync_status: "waiting" }));
  poller.hubspot.add(CASE_TYPE, "2", gated({ enter_in_central_reach: "Yes", last_sync_status: "error" }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", gated({ entered_in_centralreach: "Yes", last_sync_status: "waiting" }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", gated({ entered_in_centralreach: "Yes", last_sync_status: "error" }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "13", gated({ entered_in_centralreach: "Yes", last_sync_status: "success" }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "14", gated({ entered_in_centralreach: "Yes" }));
  // Linked and waiting (the temporary External System ID): queued once, not twice.
  poller.hubspot.add(SANDBOX_BT_TYPE, "15", gated({ employee_id: "7001", last_sync_status: "waiting" }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ entered_in_centralreach: "Yes", last_sync_status: "waiting" }));

  const sweep = await runAt(poller, EIGHT);

  assert.deepEqual(sweep.cases, ["1"]);
  assert.deepEqual(sweep.employees, ["11", "15", "21"]);
});

test("[BR18][3.5] a linked record whose value changed with no edit is not found by the hourly search but is queued by the sweep", async () => {
  const poller = setupPoller({ now: "2026-11-20T07:00:00.000Z" });
  // case_status and staffing_status can change with hs_lastmodifieddate left where it was.
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", case_status: "Cold", staffing_status: "X 97153" }));

  await poller.run();
  assert.equal(poller.queues.client.length, 0);

  const sweep = await runAt(poller, EIGHT);
  assert.deepEqual(sweep.cases, ["1"]);
  assert.equal(poller.queues.client.length, 1);
});

test("[BR4][3.5] with the record gate set, both sweep branches carry the gate filter and a record outside the gate is not queued", async () => {
  const poller = setupPoller({ now: EIGHT });
  addOneLinkedOfEach(poller);
  poller.hubspot.add(CASE_TYPE, "2", { client_id_number: "5002", hs_lastmodifieddate: OLD });
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", { [GATE]: "false", employee_id: "7003", hs_lastmodifieddate: OLD });
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "22", { last_sync_status: "waiting", hs_lastmodifieddate: OLD });

  const sweep = await runAt(poller, EIGHT);

  assert.deepEqual(sweep.cases, ["1"]);
  assert.deepEqual(sweep.employees, ["11", "21"]);
  const requests = sweepRequests(poller);
  assert.equal(requests.length, 3);
  for (const request of requests) {
    // Linked, or waiting.
    assert.equal(request.body.filterGroups.length, 2);
    assert.deepEqual(
      filtersOf(request, GATE),
      [0, 1].map(() => ({ propertyName: GATE, operator: "EQ", value: "true" }))
    );
    assert.deepEqual(filtersOf(request, "last_sync_status").filter(Boolean), [
      { propertyName: "last_sync_status", operator: "EQ", value: "waiting" }
    ]);
  }
});

test("[BR4][3.5] with the gate set to none, the sweep queues linked records only", async () => {
  const poller = setupPoller({ now: EIGHT, config: pollerConfig({ recordGateProperty: null }) });
  poller.hubspot.add(CASE_TYPE, "1", { client_id_number: "5001", hs_lastmodifieddate: OLD });
  poller.hubspot.add(CASE_TYPE, "2", { enter_in_central_reach: "Yes", last_sync_status: "waiting", hs_lastmodifieddate: OLD });
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", { employee_id: "7001", hs_lastmodifieddate: OLD });
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", { entered_in_centralreach: "Yes", last_sync_status: "waiting", hs_lastmodifieddate: OLD });

  const sweep = await runAt(poller, EIGHT);

  assert.deepEqual(sweep.cases, ["1"]);
  assert.deepEqual(sweep.employees, ["11"]);
  for (const request of sweepRequests(poller)) {
    assert.equal(request.body.filterGroups.length, 1);
    const names = request.body.filterGroups[0].filters.map((filter) => filter.propertyName);
    assert.equal(names.includes("last_sync_status"), false);
    assert.equal(names.includes(GATE), false);
  }
});

test("[BR6][3.5] the sweep leaves out a Case in one of the four excluded stages, linked or waiting", async () => {
  const poller = setupPoller({ now: EIGHT });
  EXCLUDED_STAGES.forEach((stage, index) => {
    poller.hubspot.add(CASE_TYPE, `10${index}`, gated({ client_id_number: String(5000 + index), dealstage: stage }));
    poller.hubspot.add(CASE_TYPE, `20${index}`, gated({ last_sync_status: "waiting", dealstage: stage }));
  });
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "6001", dealstage: "1" }));

  const sweep = await runAt(poller, EIGHT);

  assert.deepEqual(sweep.cases, ["1"]);
  const [caseRequest] = sweepRequests(poller);
  assert.deepEqual(
    filtersOf(caseRequest, "dealstage"),
    caseRequest.body.filterGroups.map(() => ({
      propertyName: "dealstage",
      operator: "NOT_IN",
      values: EXCLUDED_STAGES
    }))
  );
});

test("[BR14][3.5] sweep messages are spread with scheduled delivery, 60 a minute, counted across the three objects", async () => {
  const poller = setupPoller({ now: EIGHT });
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001" }));
  for (let id = 1; id <= 130; id += 1) {
    poller.hubspot.add(SANDBOX_BT_TYPE, id, gated({ employee_id: String(7000 + id) }));
  }
  const order = [];
  poller.queues.beforeSend = (queueName, message) => {
    order.push(message);
  };

  await poller.run();

  assert.equal(SWEEP_MESSAGES_PER_MINUTE, 60);
  assert.equal(order.length, 131);
  const nowMs = Date.parse(EIGHT);
  order.forEach((message, index) => {
    const minute = Math.floor(index / 60);
    if (minute === 0) {
      assert.equal("scheduledEnqueueTimeUtc" in message, false);
    } else {
      assert.equal(message.scheduledEnqueueTimeUtc instanceof Date, true);
      assert.equal(message.scheduledEnqueueTimeUtc.getTime(), nowMs + minute * 60000);
    }
    // The scheduled time is a Service Bus property. It is not part of the message body.
    assert.equal("scheduledEnqueueTimeUtc" in message.body, false);
  });
  assert.equal(order[60].scheduledEnqueueTimeUtc.toISOString(), "2026-11-20T08:01:00.000Z");
  assert.equal(order[130].scheduledEnqueueTimeUtc.toISOString(), "2026-11-20T08:02:00.000Z");
});

test("[BR14][3.5] the sweep stops at its cap per run and goes on from there the next hour", async () => {
  const poller = setupPoller({ now: EIGHT });
  const total = SWEEP_MAX_MESSAGES_PER_RUN + 150;
  for (let id = 1; id <= total; id += 1) {
    poller.hubspot.add(SANDBOX_BT_TYPE, id, gated({ employee_id: String(100000 + id) }));
  }
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "900001", gated({ employee_id: "8001" }));

  const first = await runAt(poller, EIGHT);

  assert.equal(first.summary.errorsCount, 0);
  assert.deepEqual(first.summary.sweep, { ran: true, done: false, queued: SWEEP_MAX_MESSAGES_PER_RUN });
  assert.equal(first.employees.length, SWEEP_MAX_MESSAGES_PER_RUN);
  // At 60 a minute, everything one run schedules is delivered before the next hourly run.
  const lastScheduled = swept(poller.queues.employee).at(-1).scheduledEnqueueTimeUtc;
  assert.equal(lastScheduled.getTime() < Date.parse("2026-11-20T09:00:00.000Z"), true);

  const second = await runAt(poller, "2026-11-20T09:00:00.000Z");

  assert.deepEqual(second.summary.sweep, { ran: true, done: true, queued: 151 });
  const all = new Set([...first.employees, ...second.employees]);
  assert.equal(all.size, total + 1);
  assert.equal(first.employees.length + second.employees.length, total + 1);
  assert.equal(second.employees.at(-1), "900001");
});

test("[BR14][3.5] the sweep marker is stored with no expiry under a key that starts with the portal ID", async () => {
  const poller = setupPoller({ now: EIGHT });
  addOneLinkedOfEach(poller);

  await poller.run();

  const saved = marker(poller);
  assert.equal(saved.id.startsWith(`${SANDBOX_PORTAL}:`), true);
  assert.equal(saved.ttl, -1);
  assert.equal(saved.data.day, "2026-11-20");
  assert.equal(saved.data.done, true);
  // Record IDs and flags only: no HubSpot value is stored.
  assert.deepEqual(saved.data.entities, {
    client: { afterId: "1", finished: true },
    bt_rbt: { afterId: "11", finished: true },
    bcba: { afterId: "21", finished: true }
  });
});

test("[BR14][3.5] sendClientSyncMessage and sendEmployeeSyncMessage take an optional scheduled time", async () => {
  const queues = fakeQueues();
  const at = new Date("2026-11-20T08:05:00.000Z");

  await sendClientSyncMessage({ dealId: "1", portalId: SANDBOX_PORTAL, source: "dailySweep", scheduledEnqueueTimeUtc: at });
  await sendClientSyncMessage({ dealId: "2", portalId: SANDBOX_PORTAL, source: "dailySweep" });
  await sendEmployeeSyncMessage({ recordId: "3", employeeType: "bcba", portalId: SANDBOX_PORTAL, source: "dailySweep", scheduledEnqueueTimeUtc: at });
  await sendEmployeeSyncMessage({ recordId: "4", employeeType: "bt_rbt", portalId: SANDBOX_PORTAL, source: "dailySweep" });

  assert.equal(queues.client[0].scheduledEnqueueTimeUtc, at);
  assert.equal("scheduledEnqueueTimeUtc" in queues.client[1], false);
  assert.equal(queues.employee[0].scheduledEnqueueTimeUtc, at);
  assert.equal("scheduledEnqueueTimeUtc" in queues.employee[1], false);
  for (const message of queues.all()) {
    assert.equal("scheduledEnqueueTimeUtc" in message.body, false);
    assert.equal(message.body.source, "dailySweep");
    assert.equal(message.body.portalId, SANDBOX_PORTAL);
  }
});

test("[BR14][3.5] both queues run a dailySweep message, pass its source to the worker and keep it on a retry", async () => {
  const cases = [
    {
      handler: processClientQueue,
      message: { dealId: "1", workflow: "clientSync", source: "dailySweep", portalId: SANDBOX_PORTAL }
    },
    {
      handler: processEmployeeQueue,
      message: { recordId: "2", employeeType: "bt_rbt", workflow: "employeeSync", source: "dailySweep", portalId: SANDBOX_PORTAL }
    }
  ];
  for (const { handler, message } of cases) {
    const inputs = [];
    await handler(message, queueContext(), {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async (input) => {
        inputs.push(input);
      }
    });
    assert.equal(inputs[0].source, "dailySweep");

    // A temporary failure: the retry message keeps the source, and the queue accepts it.
    const scheduled = [];
    await handler(message, queueContext(), {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async () => {
        throw new Error("timeout");
      },
      scheduleRetry: async (retry) => {
        scheduled.push(retry);
      }
    });
    assert.equal(scheduled[0].body.source, "dailySweep");
    await handler(scheduled[0].body, queueContext(), {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async (input) => {
        inputs.push(input);
      }
    });
    assert.equal(inputs[1].source, "dailySweep");
  }
});
