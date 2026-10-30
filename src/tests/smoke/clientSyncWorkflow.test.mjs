import test from "node:test";
import assert from "node:assert/strict";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";

function dealWith(values) {
  return async (dealId, requested = []) => ({
    id: "deal-1",
    properties: { ...Object.fromEntries(requested.map((name) => [name, null])), ...values }
  });
}

function buildDeps(overrides = {}) {
  const calls = {
    writebacks: [],
    stateWrites: []
  };

  const deps = {
    getConfig: () => ({
      hubspot: { crContactIdProperty: "client_id_number" },
      ttl: { successTtlSeconds: 100, failTtlSeconds: 50 },
      centralReach: {}
    }),
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    getDealById: dealWith({
      hs_object_id: "deal-1",
      last_sync_hash: "old-hash",
      client_id_number: "2001",
      enter_in_central_reach: "Yes"
    }),
    buildClientPayload: () => ({ FirstName: "Alex", LastName: "Rivera" }),
    validateClientPayload: () => ({ isValid: true, errors: [] }),
    hashPayload: () => "new-hash",
    createOrUpdateClient: async () => ({ operation: "update", crContactId: "2001" }),
    buildClientMetadata: () => ({ labelIds: [1], metadataValues: { 123: "ok" } }),
    updateClientMetadata: async () => ({ updatedCount: 1, failedCount: 0 }),
    updateDealProperties: async (dealId, properties) => {
      calls.writebacks.push({ dealId, properties });
    },
    putState: async (input) => {
      calls.stateWrites.push(input);
    },
    safeLog: () => {},
    buildErrorLog: () => ({})
  };

  return { deps: { ...deps, ...overrides }, calls };
}

test("runClientSyncWorkflow writes success state and safe summary", async () => {
  const { deps, calls } = buildDeps();

  const result = await runClientSyncWorkflow(
    { dealId: "deal-1", hsLastModifiedDate: "1700000000000", context: { invocationId: "inv-1" } },
    deps
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "success");
  assert.equal(result.crContactId, "2001");
  assert.equal(calls.writebacks.length, 1);
  assert.equal(calls.stateWrites[0].type, "success");
});

test("runClientSyncWorkflow writes nothing when the hash is unchanged", async () => {
  const { deps, calls } = buildDeps({
    hashPayload: () => "same-hash",
    getDealById: dealWith({
      hs_object_id: "deal-1",
      last_sync_hash: "same-hash",
      client_id_number: "333",
      enter_in_central_reach: "Insurance Card(s);Yes"
    }),
    createOrUpdateClient: async () => {
      throw new Error("should not be called");
    }
  });

  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
  assert.equal(result.status, "noop");
  assert.equal(calls.writebacks.length, 0);
  assert.equal(calls.stateWrites.length, 0);
});

test("runClientSyncWorkflow writes fail state and rethrows on errors", async () => {
  const { deps, calls } = buildDeps({
    validateClientPayload: () => ({ isValid: false, errors: ["FirstName is required"] })
  });

  await assert.rejects(
    runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps),
    /PayloadValidationError/
  );

  assert.equal(calls.writebacks.length, 1);
  assert.equal(calls.writebacks[0].properties.last_sync_status, "error");
  assert.equal(calls.stateWrites[0].type, "fail");
});

test("runClientSyncWorkflow skips an unlinked deal without the Yes token", async () => {
  const { deps, calls } = buildDeps({
    getDealById: dealWith({ hs_object_id: "deal-1", enter_in_central_reach: "Insurance Card(s)" }),
    createOrUpdateClient: async () => {
      throw new Error("should not be called");
    }
  });

  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
  assert.equal(result.status, "skipped");
  assert.equal(result.operation, "noop");
  assert.equal(calls.writebacks.length, 0);
  assert.equal(calls.stateWrites.length, 0);
});

const NEVER_PROCESSED_DEAL = {
  hs_object_id: "deal-1",
  enter_in_central_reach: "Yes",
  client_id_number: null,
  last_sync_at: null
};

test("dry run stops after the hash compare with no upsert and no writeback", async () => {
  const { deps, calls } = buildDeps({
    getConfig: () => ({
      hubspot: { crContactIdProperty: "client_id_number" },
      ttl: { successTtlSeconds: 100, failTtlSeconds: 50 },
      features: { syncDryRun: true }
    }),
    getDealById: dealWith(NEVER_PROCESSED_DEAL),
    createOrUpdateClient: async () => {
      throw new Error("should not be called");
    }
  });

  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
  assert.equal(result.status, "dry-run");
  assert.equal(calls.writebacks.length, 0);
});

test("an absent requested deal property fails closed with no upsert", async () => {
  let upserts = 0;
  const { deps, calls } = buildDeps({
    getDealById: async (dealId, requested) => ({
      id: "deal-1",
      properties: {
        ...Object.fromEntries(
          requested.filter((name) => name !== "phi_gender").map((name) => [name, null])
        ),
        enter_in_central_reach: "Yes"
      }
    }),
    createOrUpdateClient: async () => {
      upserts += 1;
      return { operation: "create", crContactId: "1" };
    }
  });

  await assert.rejects(
    runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps),
    /RequestedPropertyAbsent: phi_gender/
  );
  assert.equal(upserts, 0);
  assert.equal(calls.writebacks[0].properties.last_sync_error, "RequestedPropertyAbsent: phi_gender");
});
