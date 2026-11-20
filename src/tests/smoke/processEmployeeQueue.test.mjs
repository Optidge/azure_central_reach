import test from "node:test";
import assert from "node:assert/strict";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";

// Stage 2 (row 2.6): a message carries its portal ID and the worker runs only its own portal's.
const PORTAL_ID = "52311591";

const baseContext = {
  functionName: "processEmployeeQueue",
  invocationId: "inv-1",
  triggerMetadata: {
    messageId: "msg-1",
    deliveryCount: 1,
    enqueuedTimeUtc: "2026-05-06T00:00:00.000Z"
  }
};

test("valid employee message invokes employee workflow", async () => {
  let calledWith = null;
  const runWorkflow = async (input) => {
    calledWith = input;
  };

  await processEmployeeQueue(
    {
      workflow: "employeeSync",
      source: "employeePoller",
      employeeType: "bt_rbt",
      recordId: "1001",
      hsLastModifiedDate: "1700000000000",
      portalId: PORTAL_ID,
      enqueuedAt: "2026-05-06T00:00:00.000Z"
    },
    baseContext,
    { runWorkflow, portalId: PORTAL_ID }
  );

  assert.deepEqual(calledWith, {
    recordId: "1001",
    employeeType: "bt_rbt",
    hsLastModifiedDate: "1700000000000",
    source: "employeePoller",
    context: baseContext,
    lastAttempt: false
  });
});

test("missing recordId throws", async () => {
  await assert.rejects(
    processEmployeeQueue(
      {
        workflow: "employeeSync",
        employeeType: "bt_rbt"
      },
      baseContext,
      { runWorkflow: async () => {} }
    ),
    /recordId is required/
  );
});

test("invalid employeeType throws", async () => {
  await assert.rejects(
    processEmployeeQueue(
      {
        workflow: "employeeSync",
        employeeType: "invalid",
        recordId: "1001"
      },
      baseContext,
      { runWorkflow: async () => {} }
    ),
    /employeeType must be bt_rbt or bcba/
  );
});

test("invalid workflow throws", async () => {
  await assert.rejects(
    processEmployeeQueue(
      {
        workflow: "clientSync",
        employeeType: "bcba",
        recordId: "1001"
      },
      baseContext,
      { runWorkflow: async () => {} }
    ),
    /workflow must be employeeSync/
  );
});

// Stage 2 (row 2.8): a failed run is no longer rethrown at once. The worker schedules the retry
// and completes the message; it throws only when the retry cannot be scheduled or the retries
// are used up.
test("workflow failures schedule a retry, and are rethrown when the retry cannot be scheduled", async () => {
  const message = {
    workflow: "employeeSync",
    employeeType: "bcba",
    recordId: "1001",
    portalId: PORTAL_ID
  };
  const runWorkflow = async () => {
    throw new Error("workflow failed");
  };
  const scheduled = [];

  await processEmployeeQueue(message, baseContext, {
    portalId: PORTAL_ID,
    runWorkflow,
    scheduleRetry: async (retry) => {
      scheduled.push(retry);
    }
  });
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].body.attempt, 1);

  await assert.rejects(
    processEmployeeQueue(message, baseContext, {
      portalId: PORTAL_ID,
      runWorkflow,
      scheduleRetry: async () => {
        throw new Error("schedule failed");
      }
    }),
    /schedule failed/
  );

  await assert.rejects(
    processEmployeeQueue({ ...message, attempt: 5 }, baseContext, {
      portalId: PORTAL_ID,
      runWorkflow,
      scheduleRetry: async (retry) => {
        scheduled.push(retry);
      }
    }),
    /workflow failed/
  );
  assert.equal(scheduled.length, 1);
});
