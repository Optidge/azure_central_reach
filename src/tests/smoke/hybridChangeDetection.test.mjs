import test from "node:test";
import assert from "node:assert/strict";
import {
  associationsForComparison
} from "../../constants/staffingAssociations.mjs";
import {
  buildComparableState,
  canonicalizeAssociations,
  changedFieldNames,
  clientWritePlan,
  explicitMetadata,
  fieldHashes,
  hashMappedState,
  metadataClearFieldIds,
  normalizeBlank
} from "../../lib/mappedState.mjs";
import { retryDelayMs } from "../../lib/retry.mjs";
import { filterWritebackProperties } from "../../lib/writebackAllowlist.mjs";
import { isLinkedForOngoingRefresh } from "../../workflows/intakePollerWorkflow.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";

test("association sets ignore order and excluded role types", () => {
  const first = associationsForComparison([
    { toObjectId: "20", typeIds: [76, 64] },
    { toObjectId: "10", typeIds: [82, 20] }
  ]);
  const second = associationsForComparison([
    { toObjectId: "10", typeIds: [20, 82] },
    { toObjectId: "20", typeIds: [64, 76] }
  ]);
  const left = buildComparableState({
    core: { FirstName: "A" },
    metadata: {},
    labels: [2, 1],
    relationships: first,
    includeRelationships: true
  });
  const right = buildComparableState({
    core: { FirstName: "A" },
    metadata: {},
    labels: [1, 2],
    relationships: second,
    includeRelationships: true
  });
  assert.equal(hashMappedState(left), hashMappedState(right));
});

test("same display name with a different association id changes state", () => {
  const before = canonicalizeAssociations([{ toObjectId: "10", typeIds: [76] }]);
  const after = canonicalizeAssociations([{ toObjectId: "11", typeIds: [76] }]);
  assert.notEqual(JSON.stringify(before), JSON.stringify(after));
  assert.deepEqual(changedFieldNames(
    { relationships: before },
    { relationships: after }
  ).some((name) => name.startsWith("relationships")), true);
});

test("intentional blank is distinct from a later value and repeated blanks hash the same", () => {
  assert.equal(normalizeBlank("  "), null);
  const blank = buildComparableState({
    core: { City: null },
    metadata: { 126214: null },
    labels: []
  });
  const again = buildComparableState({
    core: { City: "" },
    metadata: { 126214: "  " },
    labels: []
  });
  const filled = buildComparableState({
    core: { City: "Albany" },
    metadata: { 126214: "peanuts" },
    labels: []
  });
  assert.equal(hashMappedState(blank), hashMappedState(again));
  assert.notEqual(hashMappedState(blank), hashMappedState(filled));
  const hashes = fieldHashes(filled);
  assert.deepEqual(metadataClearFieldIds(hashes, { 126214: null }), [126214]);
  assert.deepEqual(metadataClearFieldIds(fieldHashes(blank), { 126214: null }), []);
});

test("explicit metadata keeps mapped blanks and omits unrequested fields", () => {
  const values = explicitMetadata({ 1: "keep", 2: "" }, [1, 2, 3], [3]);
  assert.deepEqual(values, { 1: "keep", 2: null });
});

test("client id writeback failure retries as an update", () => {
  assert.deepEqual(clientWritePlan({ existingContactId: "", lookedUpContactId: "555" }), {
    operation: "update",
    crContactId: "555"
  });
  assert.equal(clientWritePlan({}).operation, "create");
});

test("writeback allowlist drops unapproved properties", () => {
  const filtered = filterWritebackProperties(
    {
      last_sync_status: "success",
      phi_first_name__cloned_: "Ada",
      client_id_number: "9"
    },
    { kind: "client", idProperty: "client_id_number" }
  );
  assert.equal(filtered.phi_first_name__cloned_, undefined);
  assert.equal(filtered.client_id_number, "9");
  assert.equal(filtered.last_sync_status, "success");
});

test("retry delay honors Retry-After", () => {
  assert.equal(retryDelayMs({ response: { headers: { "retry-after": "2" } } }, 100, 5000), 2000);
  assert.equal(retryDelayMs({ response: { headers: {} } }, 100, 5000), 100);
});

test("linked recheck does not require stage or a newer timestamp", () => {
  assert.equal(
    isLinkedForOngoingRefresh(
      {
        properties: {
          client_id_number: "42",
          hs_lastmodifieddate: "2026-01-01T00:00:00.000Z",
          integration_last_write: "2026-10-01T00:00:00.000Z",
          dealstage: "other"
        }
      },
      "client_id_number"
    ),
    true
  );
  assert.equal(isLinkedForOngoingRefresh({ properties: { dealstage: "intake" } }, "client_id_number"), false);
});

function clientDeps(overrides = {}) {
  const calls = { upserts: [], metadata: [], writebacks: [] };
  const deps = {
    getConfig: () => ({
      hubspot: {
        crContactIdProperty: "client_id_number",
        bcbaObjectTypeId: "2-bcba",
        btRbtObjectTypeId: "2-bt"
      },
      ttl: { successTtlSeconds: 10, failTtlSeconds: 10, leaseTtlSeconds: 30 }
    }),
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    acquireLease: async () => true,
    releaseLease: async () => {},
    getState: async () => overrides.prior || null,
    getDealById: async () => overrides.deal,
    buildClientPayload: () => overrides.payload || { FirstName: "Ada" },
    validateClientPayload: () => ({ isValid: true, errors: [] }),
    buildClientMetadata: () => overrides.metadata || { labelIds: [1], metadataValues: { 126214: null } },
    listAssociations: async () => overrides.associations || [],
    updateClientMetadata: async (contactId, values, options) => {
      calls.metadata.push({ contactId, values, options });
      return { updatedCount: 0, failedCount: 0, failedFieldIds: [] };
    },
    createOrUpdateClient: async (input) => {
      calls.upserts.push(input);
      return { operation: input.existingContactId ? "update" : "create", crContactId: input.existingContactId || "900" };
    },
    updateDealProperties: async (dealId, properties) => {
      calls.writebacks.push({ dealId, properties });
    },
    putState: async () => {},
    safeLog: () => {},
    buildErrorLog: () => ({})
  };
  return { deps, calls };
}

test("client metadata-only change skips nothing required and label order does not write", async () => {
  const baseDeal = {
    id: "deal-1",
    properties: { last_sync_hash: null, client_id_number: "2001" }
  };
  const first = clientDeps({
    deal: baseDeal,
    metadata: { labelIds: [2, 1], metadataValues: { 126214: "peanuts" } }
  });
  await runClientSyncWorkflow({ dealId: "deal-1", source: "hubspotWorkflow" }, first.deps);
  assert.equal(first.calls.upserts.length, 1);
  assert.equal(first.calls.metadata.length, 1);

  const savedHash = first.calls.writebacks[0].properties.last_sync_hash;
  const second = clientDeps({
    deal: { id: "deal-1", properties: { last_sync_hash: savedHash, client_id_number: "2001" } },
    metadata: { labelIds: [1, 2], metadataValues: { 126214: "peanuts" } },
    prior: { data: { fieldHashes: {} } }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1", source: "linkedRecheck" }, second.deps);
  assert.equal(result.status, "noop");
  assert.equal(second.calls.upserts.length, 0);
  assert.equal(second.calls.metadata.length, 0);
});

test("client read failure does not write a blank baseline", async () => {
  const { deps, calls } = clientDeps({
    deal: { id: "deal-1", properties: {} }
  });
  deps.getDealById = async () => {
    const error = new Error("forbidden");
    error.response = { status: 403 };
    throw error;
  };
  await assert.rejects(runClientSyncWorkflow({ dealId: "deal-1" }, deps), /HubSpotReadFailed/);
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.writebacks[0].properties.last_sync_hash, undefined);
  assert.equal(calls.writebacks[0].properties.last_sync_status, "error");
});

test("stored CentralReach id is reused when HubSpot writeback has not landed", async () => {
  const { deps, calls } = clientDeps({
    deal: { id: "deal-1", properties: { client_id_number: "" } },
    prior: { data: { crContactId: "555", fieldHashes: {} } }
  });
  await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(calls.upserts[0].existingContactId, "555");
  assert.equal(calls.upserts[0].existingContactId === undefined, false);
});

test("employee timestamp shortcut no longer skips a mapped change", async () => {
  let upserts = 0;
  const result = await runEmployeeSyncWorkflow(
    { recordId: "1", employeeType: "bt_rbt", source: "linkedRecheck" },
    {
      getConfig: () => ({
        hubspot: { btRbtObjectTypeId: "2-bt", bcbaObjectTypeId: "2-bcba", employeeIdProperty: "employee_id" },
        features: { allowEmployeeCreate: true, putOnlyMode: false },
        ttl: { successTtlSeconds: 10, failTtlSeconds: 10 }
      }),
      createHubSpotClient: () => {},
      createCentralReachClient: () => {},
      createStateClient: () => {},
      acquireLease: async () => true,
      releaseLease: async () => {},
      getState: async () => null,
      getBtRbtRecordById: async () => ({
        id: "1",
        properties: {
          hs_object_id: "1",
          hs_lastmodifieddate: "2026-01-01T00:00:00.000Z",
          integration_last_write: "2026-10-01T00:00:00.000Z",
          employee_id: "100",
          last_sync_hash: "old"
        }
      }),
      buildEmployeePayload: () => ({
        employeePayload: { externalSystemId: "1", firstName: "Ada" },
        metadataValues: { 133819: "New address" },
        requiredLabelIds: [1],
        warnings: []
      }),
      validateEmployeePayload: () => ({ isValid: true, errors: [] }),
      getEmployeeByContactId: async () => ({ externalSystemId: "1" }),
      buildEmployeePayloadForContactId: (payload) => ({ payload }),
      createOrUpdateEmployee: async () => {
        upserts += 1;
        return { operation: "update", crContactId: "100" };
      },
      updateClientMetadata: async () => ({ updatedCount: 1, failedCount: 0, failedFieldIds: [] }),
      writeEmployeeWriteback: async () => ({ fallbackUsed: false }),
      putState: async () => {},
      safeLog: () => {},
      buildErrorLog: () => ({})
    }
  );
  assert.equal(upserts, 1);
  assert.equal(result.status, "success");
});

test("overlapping lock does not let the second worker write", async () => {
  const { deps, calls } = clientDeps({
    deal: { id: "deal-1", properties: { client_id_number: "1" } }
  });
  deps.acquireLease = async () => false;
  await assert.rejects(runClientSyncWorkflow({ dealId: "deal-1" }, deps), /SyncInProgress/);
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.writebacks.length, 0);
});
