import test from "node:test";
import assert from "node:assert/strict";
import { runIntakePollerWorkflow } from "../../workflows/intakePollerWorkflow.mjs";

const NOW = Date.parse("2026-10-29T12:00:00.000Z");
const OLD = "2026-10-29T10:00:00.000Z";

function pollerConfig(overrides = {}) {
  return {
    hubspot: { btRbtObjectTypeId: "2-1", bcbaObjectTypeId: "2-2" },
    sweep: { createSweepEnabled: true, graceMinutes: 10 },
    limits: {
      maxDealsPerRun: 50,
      maxBtRbtPerRun: 50,
      maxBcbaPerRun: 50,
      linkedRecheckEnabled: false,
      crContactIdProperty: "client_id_number",
      employeeIdProperty: "employee_id"
    },
    ttl: { leaseTtlSeconds: 60, dedupeTtlSeconds: 60 },
    ...overrides
  };
}

function harness({ config = pollerConfig(), results = {}, searchError = null } = {}) {
  const sent = [];
  const searches = [];
  const deps = {
    getIntakePollerConfig: () => config,
    createHubSpotClient: () => {},
    createStateClient: () => {},
    createServiceBusClient: () => {},
    acquireLease: async () => true,
    releaseLease: async () => true,
    now: () => NOW,
    searchNeverProcessedRecords: async (input) => {
      searches.push(input);
      if (searchError) {
        throw searchError;
      }
      return results[input.objectTypeId] || [];
    },
    sendClientSyncMessage: async (message) => sent.push(message),
    sendEmployeeSyncMessage: async (message) => sent.push(message)
  };
  return { deps, sent, searches };
}

test("sweep queues a ticked never-processed deal with source neverProcessedSweep", async () => {
  const { deps, sent, searches } = harness({
    results: {
      deals: [
        {
          id: "101",
          properties: { enter_in_central_reach: "Yes", last_sync_at: null, hs_lastmodifieddate: OLD }
        },
        {
          id: "102",
          properties: { enter_in_central_reach: "Yes - Generic", hs_lastmodifieddate: OLD }
        }
      ]
    }
  });
  const summary = await runIntakePollerWorkflow({}, deps);
  assert.deepEqual(sent, [
    { dealId: "101", hsLastModifiedDate: OLD, source: "neverProcessedSweep", workflow: "clientSync" }
  ]);
  assert.deepEqual(summary.sweep.client, { fetched: 2, enqueued: 1, skipped: 1 });
  assert.equal(searches.length, 3);
  assert.deepEqual(searches[0], {
    objectTypeId: "deals",
    checkboxProperty: "enter_in_central_reach",
    idProperty: "client_id_number",
    modifiedBeforeIso: "2026-10-29T11:50:00.000Z"
  });
  assert.equal(searches[1].checkboxProperty, "entered_in_centralreach");
});

test("sweep does not search when CREATE_SWEEP_ENABLED is off", async () => {
  const config = pollerConfig({ sweep: { createSweepEnabled: false, graceMinutes: 10 } });
  const { deps, sent, searches } = harness({ config });
  const summary = await runIntakePollerWorkflow({}, deps);
  assert.equal(searches.length, 0);
  assert.equal(sent.length, 0);
  assert.equal(summary.createSweepEnabled, false);
});

test("an exhausted 429 ends the tick", async () => {
  const rateLimited = Object.assign(new Error("429"), { response: { status: 429 } });
  const { deps, searches } = harness({ searchError: rateLimited });
  const summary = await runIntakePollerWorkflow({}, deps);
  assert.equal(summary.endedOnRateLimit, true);
  assert.equal(searches.length, 1);
});
