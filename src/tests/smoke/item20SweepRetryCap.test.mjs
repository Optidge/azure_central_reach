// Package item 20 (BUILD-PACKAGE-DRAFT-2026-11-23.md, section H4, "Fewer retries for poller and
// sweep runs", built in the reviewer's version; Zeke 2026-11-23: "Yes to all please"): a queue
// message whose source is `dailySweep` gets at most 1 queue retry. Every other source (webhooks,
// the hourly poller, the Contact fan-out) keeps 5. SYNC_IN_PROGRESS and CR_CREATE_PENDING keep the
// full schedule on a sweep message, and so does CR_LABEL_POST_UNCONFIRMED (requirements review
// question 20, decided 2026-11-24). The last run still writes "Retries used up". Offline test b2
// of the coverage ledger (CLB-160, TRG-297).
//
// The queue functions, the workflows, the mapper, the hash, cosmosState.mjs (in-memory container)
// and centralReachClient.mjs (fake HTTP adapter) are real. Only HubSpot is faked, and the label
// sender where named. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { RETRIES_USED_UP } from "../../constants/syncReasons.mjs";
import { processClientQueue } from "../../functions/processClientQueue.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import { processSyncMessage } from "../../lib/queueRetry.mjs";
import {
  DAILY_SWEEP_MAX_RETRIES,
  MAX_RETRIES,
  RETRY_DELAYS_SECONDS,
  createStillPendingError,
  isLastAttempt,
  labelPostUnconfirmedError,
  maxRetriesFor,
  planRetry
} from "../../lib/retry.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  httpError,
  queueContext,
  timeoutError
} from "./stage2Fakes.mjs";
import {
  CASE_LINK,
  POSTED_UNCONFIRMED,
  fakeLabelSender,
  linkedBt,
  linkedCase,
  setup,
  stage3Case
} from "./stage3WorkerFakes.mjs";

const CLIENT_PUT = "PUT /contacts/client/{id}";
const EMPLOYEE_PUT = "PUT /contacts/employee/{id}";
const FULL_SCHEDULE = ["SYNC_IN_PROGRESS", "CR_CREATE_PENDING", "CR_LABEL_POST_UNCONFIRMED"];
const OTHER_SOURCES = ["hubspotWorkflow", "intakePoller", "employeePoller", "contactFanOut", ""];

function coded(code) {
  return Object.assign(new Error(code), { code });
}

// Ordinary temporary failures: a timeout, a record that changed during the run, a 503.
const ORDINARY_FAILURES = [timeoutError(), coded("SYNC_STALE"), httpError(503)];

function schedule(source, error) {
  return [0, 1, 2, 3, 4, 5].map((attempt) => planRetry({ attempt, error, source }));
}

const FIVE_RETRIES = [
  ...RETRY_DELAYS_SECONDS.map((delaySeconds, index) => ({ attempt: index + 1, delaySeconds })),
  null
];

// One message kind per queue: a linked Case whose client PUT, or a linked BT/RBT whose employee
// PUT, times out on every try.
const QUEUES = [
  {
    name: "Case",
    handler: processClientQueue,
    put: CLIENT_PUT,
    body: { dealId: "deal-1", workflow: "clientSync" },
    record: (cr) => linkedCase(cr, { last_sync_status: "success" }),
    run: (record) => (input) => runClientSyncWorkflow(input, clientWorkflowDeps({ record }))
  },
  {
    name: "BT/RBT",
    handler: processEmployeeQueue,
    put: EMPLOYEE_PUT,
    body: { recordId: "HS1", employeeType: "bt_rbt", workflow: "employeeSync" },
    record: (cr) => linkedBt(cr, { last_sync_status: "success" }),
    run: (record) => (input) => runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record }))
  }
];

function message(queue, source, extra = {}) {
  return {
    ...queue.body,
    source,
    portalId: SANDBOX_PORTAL,
    enqueuedAt: "2026-11-25T08:00:00.000Z",
    ...extra
  };
}

function statusWrites(record) {
  return record.writes.filter((write) => write.last_sync_status !== undefined);
}

test("[BR14][2.8] item 20 (b2): planRetry gives a dailySweep message one retry after 1 minute, then none; webhook, poller and fan-out messages keep five", () => {
  assert.equal(DAILY_SWEEP_MAX_RETRIES, 1);
  for (const error of ORDINARY_FAILURES) {
    assert.deepEqual(schedule("dailySweep", error), [{ attempt: 1, delaySeconds: 60 }, null, null, null, null, null]);
    assert.equal(maxRetriesFor({ source: "dailySweep", error }), 1);
    assert.equal(isLastAttempt({ attempt: 0, source: "dailySweep", error }), false);
    assert.equal(isLastAttempt({ attempt: 1, source: "dailySweep", error }), true);
    for (const source of OTHER_SOURCES) {
      assert.deepEqual(schedule(source, error), FIVE_RETRIES, source);
      assert.equal(maxRetriesFor({ source, error }), MAX_RETRIES, source);
      assert.equal(isLastAttempt({ attempt: 4, source, error }), false, source);
      assert.equal(isLastAttempt({ attempt: 5, source, error }), true, source);
    }
  }
  // A call with no source (an older caller) keeps the five retries.
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((attempt) => planRetry({ attempt, error: timeoutError() })),
    FIVE_RETRIES
  );
});

test("[BR14][2.8] item 20 (b2): SYNC_IN_PROGRESS, CR_CREATE_PENDING and CR_LABEL_POST_UNCONFIRMED keep the full schedule on a dailySweep message", () => {
  for (const code of FULL_SCHEDULE) {
    assert.deepEqual(schedule("dailySweep", coded(code)), FIVE_RETRIES, code);
    assert.equal(maxRetriesFor({ source: "dailySweep", error: coded(code) }), MAX_RETRIES, code);
    assert.equal(isLastAttempt({ attempt: 1, source: "dailySweep", error: coded(code) }), false, code);
    assert.equal(isLastAttempt({ attempt: 5, source: "dailySweep", error: coded(code) }), true, code);
  }
  // The errors the workers build carry those codes; the label one keeps its 150 s first wait.
  assert.deepEqual(planRetry({ attempt: 1, error: createStillPendingError(), source: "dailySweep" }), {
    attempt: 2,
    delaySeconds: 300
  });
  assert.deepEqual(planRetry({ attempt: 0, error: labelPostUnconfirmedError(), source: "dailySweep" }), {
    attempt: 1,
    delaySeconds: 150
  });
});

test("[BR14][2.8b] item 20 (b2) through the queue: a dailySweep Case and BT/RBT with a temporary failure get one retry, then write error Retries used up once and dead-letter; the first redelivery runs once more, later ones call nothing", async () => {
  for (const queue of QUEUES) {
    const { cr } = setup();
    const record = queue.record(cr);
    cr.fail(queue.put, timeoutError(), { times: 50 });
    const scheduled = [];
    const deps = {
      portalId: SANDBOX_PORTAL,
      runWorkflow: queue.run(record),
      scheduleRetry: async (retry) => {
        scheduled.push(retry);
      }
    };

    // First delivery: one retry after 1 minute, HubSpot keeps its last status.
    await queue.handler(message(queue, "dailySweep"), queueContext({ messageId: "sweep-1" }), deps);
    assert.equal(scheduled.length, 1, queue.name);
    assert.equal(scheduled[0].body.attempt, 1, queue.name);
    assert.equal(scheduled[0].body.source, "dailySweep", queue.name);
    assert.equal(statusWrites(record).length, 0, queue.name);

    // The one retry fails too: "Retries used up" once, and the message is thrown for the
    // dead-letter queue instead of a second retry.
    await assert.rejects(
      queue.handler(scheduled[0].body, queueContext({ messageId: scheduled[0].messageId }), deps)
    );
    assert.equal(scheduled.length, 1, queue.name);
    assert.equal(statusWrites(record).length, 1, queue.name);
    assert.equal(record.properties.last_sync_status, "error", queue.name);
    assert.equal(record.properties.last_sync_error, RETRIES_USED_UP, queue.name);
    // Two full runs in all (a timeout is not retried in-process).
    assert.equal(cr.count(queue.put), 2, queue.name);

    // Service Bus redelivers it. Review F1: the first redelivery runs once more (it could be a
    // full-schedule chain whose lock was lost): same failure, no second write, no retry.
    await assert.rejects(
      queue.handler(
        scheduled[0].body,
        queueContext({ messageId: scheduled[0].messageId, deliveryCount: 2 }),
        deps
      )
    );
    assert.equal(scheduled.length, 1, queue.name);
    assert.equal(cr.count(queue.put), 3, queue.name);
    assert.equal(statusWrites(record).length, 1, queue.name);

    // Every later redelivery is thrown at once: no CentralReach call, no HubSpot write.
    const callsBefore = cr.calls.length;
    await assert.rejects(
      queue.handler(
        scheduled[0].body,
        queueContext({ messageId: scheduled[0].messageId, deliveryCount: 3 }),
        deps
      )
    );
    assert.equal(cr.calls.length, callsBefore, queue.name);
    assert.equal(statusWrites(record).length, 1, queue.name);
  }
});

test("[BR14][2.8] item 20 (b2) through the queue: webhook and poller messages with the same failure still get five retries", async () => {
  for (const queue of QUEUES) {
    const poller = queue.name === "Case" ? "intakePoller" : "employeePoller";
    for (const source of ["hubspotWorkflow", poller]) {
      const label = `${queue.name} ${source}`;
      const { cr } = setup();
      const record = queue.record(cr);
      cr.fail(queue.put, timeoutError(), { times: 50 });
      const scheduled = [];
      const deps = {
        portalId: SANDBOX_PORTAL,
        runWorkflow: queue.run(record),
        scheduleRetry: async (retry) => {
          scheduled.push(retry);
        }
      };

      await queue.handler(message(queue, source), queueContext(), deps);
      for (let index = 0; index < 4; index += 1) {
        await queue.handler(scheduled[index].body, queueContext({ messageId: scheduled[index].messageId }), deps);
      }
      assert.deepEqual(
        scheduled.map((retry) => retry.body.attempt),
        [1, 2, 3, 4, 5],
        label
      );
      assert.equal(statusWrites(record).length, 0, label);

      await assert.rejects(
        queue.handler(scheduled[4].body, queueContext({ messageId: scheduled[4].messageId }), deps)
      );
      assert.equal(scheduled.length, 5, label);
      assert.equal(record.properties.last_sync_error, RETRIES_USED_UP, label);
    }
  }
});

test("[BR14][2.8] item 20 (b2) through the queue: a dailySweep Case on its one retry that meets another run's lease is retried again, with no HubSpot write and no dead-letter", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { last_sync_status: "success" });
  const held = { type: "lease", ttl: 660, expiresAt: new Date(Date.now() + 600000).toISOString() };
  await container.items.create({ ...held, pk: "sync-lock:client", id: CASE_LINK.id });
  const scheduled = [];

  await processClientQueue(
    message(QUEUES[0], "dailySweep", { attempt: 1, originalMessageId: "sweep-1" }),
    queueContext({ messageId: "sweep-1:retry-1" }),
    {
      portalId: SANDBOX_PORTAL,
      runWorkflow: QUEUES[0].run(record),
      scheduleRetry: async (retry) => {
        scheduled.push(retry);
      }
    }
  );

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].body.attempt, 2);
  assert.equal(scheduled[0].messageId, "sweep-1:retry-2");
  assert.equal(record.writes.length, 0);
  assert.equal(cr.calls.length, 0);
});

test("[BR14][3.15] item 20 (b2) through the queue: a dailySweep Case on its one retry whose create is still inside the 15-minute window is retried again and does not write Retries used up", async () => {
  const { container } = setup();
  // An earlier run sent a create and saved no CR ID yet; the lookup does not find it.
  await container.items.upsert({
    ...CASE_LINK,
    type: "link",
    ttl: -1,
    data: { pendingCreateExternalId: "deal-1" }
  });
  const record = stage3Case({ last_sync_status: "" });
  const scheduled = [];

  await processClientQueue(
    message(QUEUES[0], "dailySweep", { attempt: 1, originalMessageId: "sweep-1" }),
    queueContext({ messageId: "sweep-1:retry-1" }),
    {
      portalId: SANDBOX_PORTAL,
      runWorkflow: QUEUES[0].run(record),
      scheduleRetry: async (retry) => {
        scheduled.push(retry);
      }
    }
  );

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].body.attempt, 2);
  assert.equal(statusWrites(record).length, 0);
  assert.notEqual(record.properties.last_sync_error, RETRIES_USED_UP);
});

test("[BR19][L.3] item 20 (b2) through the queue: a dailySweep Case and BT/RBT on their one retry whose label POST is not confirmed are retried again and do not write Retries used up (sender faked)", async () => {
  for (const queue of QUEUES) {
    const { cr } = setup();
    const record = queue.record(cr);
    const sender = fakeLabelSender([POSTED_UNCONFIRMED]);
    const scheduled = [];
    const run =
      queue.name === "Case"
        ? (input) =>
            runClientSyncWorkflow(input, {
              ...clientWorkflowDeps({ record }),
              updateClientMetadata: sender.updateClientMetadata
            })
        : (input) =>
            runEmployeeSyncWorkflow(input, {
              ...employeeWorkflowDeps({ record }),
              updateClientMetadata: sender.updateClientMetadata
            });

    await queue.handler(
      message(queue, "dailySweep", { attempt: 1, originalMessageId: "sweep-1" }),
      queueContext({ messageId: "sweep-1:retry-1" }),
      {
        portalId: SANDBOX_PORTAL,
        runWorkflow: run,
        scheduleRetry: async (retry) => {
          scheduled.push(retry);
        }
      }
    );

    assert.equal(sender.calls.length, 1, queue.name);
    assert.equal(scheduled.length, 1, queue.name);
    assert.equal(scheduled[0].body.attempt, 2, queue.name);
    assert.equal(statusWrites(record).length, 0, queue.name);
    assert.equal(record.properties.last_sync_status, "success", queue.name);
  }
});

// Review finding F1. A scheduled retry is a new message (deliveryCount 1); deliveryCount > 1 is
// Service Bus delivering the same message again after a throw or a lost lock.
test("[BR14][3.15] item 20 (b2) review F1: a dailySweep Case in a CR_CREATE_PENDING chain at attempts 2, 3 and 4 runs and is retried again, on its first delivery and on a redelivery", async () => {
  for (const attempt of [2, 3, 4]) {
    for (const deliveryCount of [1, 2]) {
      const label = `attempt ${attempt} delivery ${deliveryCount}`;
      const { container } = setup();
      await container.items.upsert({
        ...CASE_LINK,
        type: "link",
        ttl: -1,
        data: { pendingCreateExternalId: "deal-1" }
      });
      const record = stage3Case({ last_sync_status: "" });
      const scheduled = [];

      await processClientQueue(
        message(QUEUES[0], "dailySweep", { attempt, originalMessageId: "sweep-1" }),
        queueContext({ messageId: `sweep-1:retry-${attempt}`, deliveryCount }),
        {
          portalId: SANDBOX_PORTAL,
          runWorkflow: QUEUES[0].run(record),
          scheduleRetry: async (retry) => {
            scheduled.push(retry);
          }
        }
      );

      assert.equal(scheduled.length, 1, label);
      assert.equal(scheduled[0].body.attempt, attempt + 1, label);
      assert.equal(statusWrites(record).length, 0, label);
    }
  }
});

test("[BR14][2.8b] item 20 (b2) review F1: a redelivered dailySweep message past its one retry runs once more, then is thrown at once; attempt 5 is thrown at once for every source; other sources run on every redelivery below 5", async () => {
  async function deliver({ source, attempt, deliveryCount }) {
    let runs = 0;
    let thrown = false;
    try {
      await processSyncMessage({
        body: { source, portalId: SANDBOX_PORTAL },
        attempt,
        configuredPortalId: SANDBOX_PORTAL,
        queueMeta: { messageId: "m-1", deliveryCount },
        run: async () => {
          runs += 1;
        },
        scheduleRetry: async () => {}
      });
    } catch {
      thrown = true;
    }
    return { runs, thrown };
  }

  for (const attempt of [1, 2, 3, 4]) {
    // The one redelivery may be a full-schedule chain (lock lost, or its retry not scheduled).
    assert.deepEqual(await deliver({ source: "dailySweep", attempt, deliveryCount: 2 }), { runs: 1, thrown: false }, `sweep ${attempt}`);
    assert.deepEqual(await deliver({ source: "dailySweep", attempt, deliveryCount: 3 }), { runs: 0, thrown: true }, `sweep ${attempt}`);
    for (const source of OTHER_SOURCES) {
      for (const deliveryCount of [2, 3, 10]) {
        assert.deepEqual(await deliver({ source, attempt, deliveryCount }), { runs: 1, thrown: false }, `${source} ${attempt}`);
      }
    }
  }
  for (const source of ["dailySweep", ...OTHER_SOURCES]) {
    assert.deepEqual(await deliver({ source, attempt: 5, deliveryCount: 1 }), { runs: 1, thrown: false }, source);
    assert.deepEqual(await deliver({ source, attempt: 5, deliveryCount: 2 }), { runs: 0, thrown: true }, source);
  }
  // A first delivery always runs.
  assert.deepEqual(await deliver({ source: "dailySweep", attempt: 0, deliveryCount: 5 }), { runs: 1, thrown: false });
});

test("[BR14][2.8b] item 20 (b2): a dailySweep run told it is not the queue's last attempt still writes Retries used up on its one retry, but not on its first delivery", async () => {
  for (const queue of QUEUES) {
    for (const [attempt, usedUp] of [
      [0, false],
      [1, true]
    ]) {
      const { cr } = setup();
      const record = queue.record(cr);
      cr.fail(queue.put, timeoutError(), { times: 50 });
      await assert.rejects(
        queue.run(record)({
          ...queue.body,
          source: "dailySweep",
          lastAttempt: false,
          attempt
        })
      );
      assert.equal(statusWrites(record).length, usedUp ? 1 : 0, `${queue.name} ${attempt}`);
      if (usedUp) {
        assert.equal(record.properties.last_sync_error, RETRIES_USED_UP, queue.name);
      }
    }
  }
});
