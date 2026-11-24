// Stage 2 review fixes (S2-R1, S2-R2, S2-R3, S2-R7, S2-R8). Each test failed before its fix.
// Only HubSpot is faked in the workflow tests; cosmosState.mjs, the hash, the catch block and
// centralReachClient.mjs run for real. No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { acquireLease, useStateContainer } from "../../lib/cosmosState.mjs";
import {
  FAILURE_KINDS,
  MAX_RETRY_DELAY_SECONDS,
  classifyFailure,
  planRetry
} from "../../lib/retry.mjs";
import { createHubSpotClient, getDealById } from "../../lib/hubspotClient.mjs";
import { answeringPortalCheck, portalCheckedHubSpotConfig } from "./hubspotPortalCheckFake.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  btRecord,
  caseRecord,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  fakeCentralReach,
  httpError,
  memoryContainer,
  queueContext,
  workflowConfig
} from "./stage2Fakes.mjs";

const BT_LINK_ID = `${SANDBOX_PORTAL}:bt_rbt:HS1`;
const CASE_LINK_ID = `${SANDBOX_PORTAL}:deal-1`;
const LEASE_SECONDS = 660;

function setup() {
  const container = memoryContainer();
  useStateContainer(container);
  const cr = fakeCentralReach();
  return { container, cr };
}

function cosmosError(code) {
  return Object.assign(new Error(`Cosmos answered ${code}`), { code });
}

// A container that models Cosmos time to live in the worst case the documentation leaves open:
// an item past its ttl is not returned by a read and cannot be replaced, but it still conflicts
// with a create until Cosmos deletes it.
function ttlContainer(clock) {
  const docs = new Map();
  let version = 0;
  const key = (id, pk) => `${pk}|${id}`;
  const visible = (doc) => Boolean(doc) && clock.now() < doc.savedAt + doc.ttl * 1000;
  const store = (doc) => {
    version += 1;
    const saved = { ...doc, _etag: `etag-${version}`, savedAt: clock.now() };
    docs.set(key(doc.id, doc.pk), saved);
    return { resource: saved, etag: saved._etag };
  };
  return {
    docs,
    items: {
      create: async (doc) => {
        if (docs.has(key(doc.id, doc.pk))) {
          throw cosmosError(409);
        }
        return store(doc);
      }
    },
    item: (id, pk) => ({
      read: async () => {
        const doc = docs.get(key(id, pk));
        return { resource: visible(doc) ? doc : undefined };
      },
      replace: async (doc, options) => {
        const current = docs.get(key(id, pk));
        if (!visible(current)) {
          throw cosmosError(404);
        }
        if (options?.accessCondition?.condition !== current._etag) {
          throw cosmosError(412);
        }
        return store(doc);
      }
    })
  };
}

// The clock stands still at the time the test started and moves only when the test sets
// offsetMs. With a running clock, the lease's own clock read and the container's (a few
// milliseconds later) could fall in different milliseconds, and the expiresAt check below failed
// now and then.
async function withClock(run) {
  const realNow = Date.now;
  const startedAt = realNow();
  const clock = { offsetMs: 0, now: () => startedAt + clock.offsetMs };
  Date.now = clock.now;
  try {
    return await run(clock);
  } finally {
    Date.now = realNow;
  }
}

// This test must stay first: it needs the CentralReach token to be requested, and a token an
// earlier test fetched would be reused from the module's cache.
test("[2.7 decision 6] a CentralReach token request that is refused is retried, never an error on the record", async () => {
  const { cr } = setup();
  cr.employees.set("7001", { contactId: "7001", externalSystemId: "1000001", primaryEmail: "s@example.com" });
  const answer = axios.defaults.adapter;
  axios.defaults.adapter = async (requestConfig) => {
    if (String(requestConfig.url).includes("token.test")) {
      throw httpError(400, { data: { error: "invalid_client" } });
    }
    return answer(requestConfig);
  };
  const record = btRecord({ employee_id: "7001", last_sync_status: "success" });
  const scheduled = [];
  try {
    await processEmployeeQueue(
      {
        recordId: "HS1",
        employeeType: "bt_rbt",
        workflow: "employeeSync",
        source: "hubspotWorkflow",
        portalId: SANDBOX_PORTAL
      },
      queueContext(),
      {
        portalId: SANDBOX_PORTAL,
        runWorkflow: (input) => runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record })),
        scheduleRetry: async (message) => scheduled.push(message)
      }
    );
  } finally {
    axios.defaults.adapter = answer;
  }

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].body.attempt, 1);
  assert.equal(record.properties.last_sync_status, "success");
  assert.equal(record.writes.length, 0);
  assert.equal(cr.writes().length, 0);
  assert.equal(
    classifyFailure(Object.assign(httpError(400), { code: "CR_AUTH_FAILED" })),
    FAILURE_KINDS.TEMPORARY
  );
});

test("[2.5] a lease left by a crashed run is taken over once it has expired, also when Cosmos hides expired items", async () => {
  await withClock(async (clock) => {
    const container = ttlContainer(clock);
    useStateContainer(container);
    const lock = { pk: "sync-lock:employee", id: BT_LINK_ID, ttlSeconds: LEASE_SECONDS };

    const first = await acquireLease(lock);
    assert.ok(first.etag);
    const saved = container.docs.get(`${lock.pk}|${lock.id}`);
    // The item outlives the lease, so an expired lease can still be read and taken over.
    assert.equal(saved.ttl, LEASE_SECONDS * 2);
    assert.equal(Date.parse(saved.expiresAt), saved.savedAt + LEASE_SECONDS * 1000);

    clock.offsetMs = (LEASE_SECONDS - 1) * 1000;
    assert.equal(await acquireLease(lock), false);

    // The first run crashed and never released. One second after the lease ran out:
    clock.offsetMs = (LEASE_SECONDS + 1) * 1000;
    const second = await acquireLease(lock);
    assert.ok(second.etag);
    assert.notEqual(second.etag, first.etag);
    assert.equal(await acquireLease(lock), false);
  });
});

test("[2.5] a lease that was released between the conflict and the read is taken with one more create", async () => {
  const container = memoryContainer();
  useStateContainer(container);
  let creates = 0;
  const create = container.items.create;
  container.items.create = async (doc) => {
    creates += 1;
    if (creates === 1) {
      throw cosmosError(409);
    }
    return create(doc);
  };

  const lease = await acquireLease({ pk: "sync-lock:client", id: CASE_LINK_ID, ttlSeconds: LEASE_SECONDS });
  assert.ok(lease.etag);
  assert.equal(creates, 2);
});

test("[2.5] a conflict with nothing to read, twice, is busy: the create is not repeated without end", async () => {
  const container = memoryContainer();
  useStateContainer(container);
  let creates = 0;
  container.items.create = async () => {
    creates += 1;
    throw cosmosError(409);
  };

  assert.equal(
    await acquireLease({ pk: "sync-lock:client", id: CASE_LINK_ID, ttlSeconds: LEASE_SECONDS }),
    false
  );
  assert.equal(creates, 2);
});

function gatedConfig() {
  return workflowConfig({ sync: { recordGateProperty: "sandbox_test_field" } });
}

async function holdLease(container, pk, id) {
  await container.items.create({
    pk,
    id,
    type: "lease",
    ttl: LEASE_SECONDS * 2,
    expiresAt: new Date(Date.now() + 600000).toISOString()
  });
}

test("[5.1] an employee that fails before the gate is checked gets no HubSpot writeback, also on the last attempt", async () => {
  const { container, cr } = setup();
  const record = btRecord({ employee_id: "7001", sandbox_test_field: "false" });
  await holdLease(container, "sync-lock:employee", BT_LINK_ID);

  await assert.rejects(
    runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType: "bt_rbt", lastAttempt: true },
      employeeWorkflowDeps({ record, config: gatedConfig() })
    ),
    (error) => error.code === "SYNC_IN_PROGRESS"
  );
  assert.deepEqual(record.writes, []);
  assert.equal(cr.calls.length, 0);
});

test("[5.1] a Case that fails before the gate is checked gets no HubSpot writeback, also on the last attempt", async () => {
  const { container, cr } = setup();
  const record = caseRecord({ client_id_number: "2001", sandbox_test_field: "false" });
  await holdLease(container, "sync-lock:client", CASE_LINK_ID);

  await assert.rejects(
    runClientSyncWorkflow(
      { dealId: "deal-1", lastAttempt: true },
      clientWorkflowDeps({ record, config: gatedConfig() })
    ),
    (error) => error.code === "SYNC_IN_PROGRESS"
  );
  assert.deepEqual(record.writes, []);
  assert.equal(cr.calls.length, 0);
});

test("[5.1] a HubSpot read that fails leaves the gate unknown: no writeback for a temporary or a permanent failure", async () => {
  for (const status of [503, 404]) {
    setup();
    const employee = btRecord({ employee_id: "7001", sandbox_test_field: "false" });
    const deal = caseRecord({ client_id_number: "2001", sandbox_test_field: "false" });
    const refuse = async () => {
      throw Object.assign(httpError(status), { provider: "hubspot" });
    };

    const employeeRun = runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType: "bt_rbt", lastAttempt: true },
      { ...employeeWorkflowDeps({ record: employee, config: gatedConfig() }), getBtRbtRecordById: refuse }
    );
    const caseRun = runClientSyncWorkflow(
      { dealId: "deal-1", lastAttempt: true },
      { ...clientWorkflowDeps({ record: deal, config: gatedConfig() }), getDealById: refuse }
    );
    if (status === 503) {
      await assert.rejects(employeeRun);
      await assert.rejects(caseRun);
    } else {
      // Permanent: the message completes. The failure is in the log only.
      assert.equal((await employeeRun).status, "error");
      assert.equal((await caseRun).status, "error");
    }
    assert.deepEqual(employee.writes, []);
    assert.deepEqual(deal.writes, []);
  }
});

test("[5.1] a record that passed the gate still gets Retries used up on the last attempt", async () => {
  const { cr } = setup();
  cr.employees.set("7001", { contactId: "7001", externalSystemId: "1000001", primaryEmail: "s@example.com" });
  cr.fail("PUT /contacts/employee/{id}", httpError(503), { times: 10 });
  const record = btRecord({ employee_id: "7001", sandbox_test_field: "true" });

  await assert.rejects(
    runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType: "bt_rbt", lastAttempt: true },
      employeeWorkflowDeps({ record, config: gatedConfig() })
    )
  );
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, "Retries used up");
});

test("[2.7 decision 1] the HubSpot client marks its own failures, so 403, 423 and 477 are temporary and 400 is permanent", async () => {
  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  for (const [status, kind] of [
    [403, FAILURE_KINDS.TEMPORARY],
    [423, FAILURE_KINDS.TEMPORARY],
    [477, FAILURE_KINDS.TEMPORARY],
    [400, FAILURE_KINDS.PERMANENT]
  ]) {
    client.defaults.adapter = answeringPortalCheck(async () => {
      throw httpError(status);
    });
    await assert.rejects(getDealById("1", ["dealname"]), (error) => {
      assert.equal(error.provider, "hubspot");
      assert.equal(classifyFailure(error), kind);
      return true;
    });
  }
});

test("[2.10] a Retry-After longer than 24 hours schedules the retry at 24 hours", () => {
  const thirtyDays = 30 * 24 * 3600;
  const error = httpError(429, { headers: { "retry-after": String(thirtyDays) } });

  assert.equal(MAX_RETRY_DELAY_SECONDS, 24 * 3600);
  assert.deepEqual(planRetry({ attempt: 0, error }), { attempt: 1, delaySeconds: 24 * 3600 });
  // A wait inside the limit is still respected in full.
  const sixHours = httpError(429, { headers: { "retry-after": String(6 * 3600) } });
  assert.deepEqual(planRetry({ attempt: 0, error: sixHours }), { attempt: 1, delaySeconds: 6 * 3600 });
});
