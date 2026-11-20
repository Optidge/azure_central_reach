import test from "node:test";
import assert from "node:assert/strict";
import { processClientQueue } from "../../functions/processClientQueue.mjs";

// Stage 2 (row 2.6): a message carries its portal ID and the worker runs only its own portal's.
const PORTAL_ID = "52311591";

const baseContext = {
  functionName: "processClientQueue",
  invocationId: "inv-1",
  triggerMetadata: {
    messageId: "msg-1",
    deliveryCount: 1,
    enqueuedTimeUtc: "2026-05-06T00:00:00.000Z"
  }
};

test("valid message calls workflow with dealId and hsLastModifiedDate", async () => {
  let calledWith;
  const runWorkflow = async (input) => {
    calledWith = input;
  };

  await processClientQueue(
    {
      dealId: "123",
      hsLastModifiedDate: "1700000000000",
      workflow: "clientSync",
      source: "intakePoller",
      portalId: PORTAL_ID,
      enqueuedAt: "2026-05-06T00:00:00.000Z"
    },
    baseContext,
    { runWorkflow, portalId: PORTAL_ID }
  );

  assert.deepEqual(calledWith, {
    dealId: "123",
    hsLastModifiedDate: "1700000000000",
    source: "intakePoller",
    context: baseContext,
    lastAttempt: false
  });
});

test("missing dealId throws", async () => {
  await assert.rejects(
    processClientQueue(
      {
        workflow: "clientSync",
        source: "intakePoller"
      },
      baseContext,
      { runWorkflow: async () => {} }
    ),
    /dealId is required/
  );
});

test("invalid JSON string body throws", async () => {
  await assert.rejects(
    processClientQueue("{ bad-json", baseContext, { runWorkflow: async () => {} }),
    /expected valid JSON string/
  );
});

test("wrong workflow throws", async () => {
  await assert.rejects(
    processClientQueue(
      {
        dealId: "123",
        workflow: "employeeSync",
        source: "intakePoller"
      },
      baseContext,
      { runWorkflow: async () => {} }
    ),
    /workflow must be clientSync/
  );
});

test("missing source is allowed and treated as unknown", async () => {
  let calledWith;
  const runWorkflow = async (input) => {
    calledWith = input;
  };

  await processClientQueue(
    {
      dealId: "123",
      workflow: "clientSync",
      portalId: PORTAL_ID
    },
    baseContext,
    { runWorkflow, portalId: PORTAL_ID }
  );

  assert.equal(calledWith.dealId, "123");
});

test("source outside allowlist throws", async () => {
  await assert.rejects(
    processClientQueue(
      {
        dealId: "123",
        workflow: "clientSync",
        source: "unexpectedSource"
      },
      baseContext,
      { runWorkflow: async () => {} }
    ),
    /source is not allowed/
  );
});

// Stage 2 (row 2.8): a failed run is no longer rethrown at once. The worker schedules the retry
// and completes the message; it throws only when the retry cannot be scheduled or the retries
// are used up.
test("workflow failure schedules a retry, and is rethrown when the retry cannot be scheduled", async () => {
  const error = new Error("workflow failed");
  const message = {
    dealId: "123",
    hsLastModifiedDate: "1700000000000",
    workflow: "clientSync",
    source: "intakePoller",
    portalId: PORTAL_ID
  };
  const scheduled = [];

  await processClientQueue(message, baseContext, {
    portalId: PORTAL_ID,
    runWorkflow: async () => {
      throw error;
    },
    scheduleRetry: async (retry) => {
      scheduled.push(retry);
    }
  });
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].body.attempt, 1);

  await assert.rejects(
    processClientQueue(message, baseContext, {
      portalId: PORTAL_ID,
      runWorkflow: async () => {
        throw error;
      },
      scheduleRetry: async () => {
        throw new Error("schedule failed");
      }
    }),
    /schedule failed/
  );

  await assert.rejects(
    processClientQueue({ ...message, attempt: 5 }, baseContext, {
      portalId: PORTAL_ID,
      runWorkflow: async () => {
        throw error;
      },
      scheduleRetry: async (retry) => {
        scheduled.push(retry);
      }
    }),
    /workflow failed/
  );
  assert.equal(scheduled.length, 1);
});
