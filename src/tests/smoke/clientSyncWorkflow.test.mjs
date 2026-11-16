import test from "node:test";
import assert from "node:assert/strict";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";

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
    getDealById: async () => ({
      id: "deal-1",
      properties: {
        hs_object_id: "deal-1",
        last_sync_hash: "old-hash",
        client_id_number: "2001"
      }
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

test("runClientSyncWorkflow performs noop when hash unchanged", async () => {
  const { deps, calls } = buildDeps({
    hashPayload: () => "same-hash",
    getDealById: async () => ({
      id: "deal-1",
      properties: { hs_object_id: "deal-1", last_sync_hash: "same-hash", client_id_number: "333" }
    }),
    createOrUpdateClient: async () => {
      throw new Error("should not be called");
    }
  });

  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
  assert.equal(result.status, "noop");
  assert.equal(calls.writebacks.length, 1);
  assert.equal(calls.stateWrites[0].data.operation, "noop");
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

function dealWith(properties) {
  return async () => ({
    id: "deal-1",
    properties: { hs_object_id: "deal-1", last_sync_hash: "old-hash", ...properties }
  });
}

for (const stageId of ["1383894301", "1383894303", "1383894302", "1332962645"]) {
  test(`gate skips a linked Case in Cleanup stage ${stageId}`, async () => {
    let upsertCalled = false;
    const { deps, calls } = buildDeps({
      getDealById: dealWith({ client_id_number: "2001", dealstage: stageId }),
      createOrUpdateClient: async () => {
        upsertCalled = true;
        return { operation: "update", crContactId: "2001" };
      }
    });
    const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "excluded_stage");
    assert.equal(upsertCalled, false);
    assert.equal(calls.writebacks.length, 0);
  });
}

test("gate skips an unlinked Case whose entry checkbox does not contain Yes", async () => {
  let upsertCalled = false;
  const { deps, calls } = buildDeps({
    getDealById: dealWith({ client_id_number: "", enter_in_central_reach: "CDE;Payment Plan" }),
    createOrUpdateClient: async () => {
      upsertCalled = true;
      return { operation: "create", crContactId: "9" };
    }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "entry_not_yes");
  assert.equal(upsertCalled, false);
  assert.equal(calls.writebacks.length, 0);
});

test("gate creates an unlinked Case whose entry checkbox contains Yes", async () => {
  const { deps } = buildDeps({
    getDealById: dealWith({ client_id_number: "", enter_in_central_reach: "CDE;Yes" }),
    createOrUpdateClient: async () => ({ operation: "create", crContactId: "9" })
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
  assert.equal(result.status, "success");
  assert.equal(result.crContactId, "9");
});

test("gate keeps syncing a linked Case when the entry checkbox is blank", async () => {
  const { deps } = buildDeps({
    getDealById: dealWith({ client_id_number: "2001", enter_in_central_reach: "" })
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
  assert.equal(result.status, "success");
});

test("gate skips a Case with test_record = true", async () => {
  const { deps } = buildDeps({
    getDealById: dealWith({ client_id_number: "2001", test_record: "true" })
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);
  assert.equal(result.status, "skipped");
  assert.equal(result.reason, "test_record");
});
