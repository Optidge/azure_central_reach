import test from "node:test";
import assert from "node:assert/strict";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { answersLikeHubSpot } from "./stage2Fakes.mjs";

function buildDeps(overrides = {}) {
  const calls = {
    writebacks: [],
    stateWrites: [],
    warnings: []
  };

  const deps = {
    getConfig: () => ({
      hubspot: {
        btRbtObjectTypeId: "2-btrbt",
        bcbaObjectTypeId: "2-bcba",
        employeeIdProperty: "employee_id",
        hubspotPortalId: "52311591"
      },
      features: { allowEmployeeCreate: false, putOnlyMode: false },
      ttl: { successTtlSeconds: 120, failTtlSeconds: 60 },
      centralReach: {}
    }),
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    getBtRbtRecordById: async () => ({
      id: "1",
      properties: {
        hs_object_id: "1",
        hs_lastmodifieddate: "2026-05-06T10:00:00.000Z",
        integration_last_write: "2026-05-06T09:00:00.000Z",
        bt_name: "Alex Rivera",
        employee_id: "100"
      }
    }),
    getBcbaRecordById: async () => ({
      id: "2",
      properties: {
        hs_object_id: "2",
        hs_lastmodifieddate: "2026-05-06T10:00:00.000Z",
        integration_last_write: "2026-05-06T09:00:00.000Z",
        bcba_name: "Pat Morgan",
        entered_in_centralreach: "Yes"
      }
    }),
    buildEmployeePayload: () => ({
      employeePayload: { externalSystemId: "1", firstName: "Alex", lastName: "Rivera" },
      metadataValues: {},
      requiredLabelIds: []
    }),
    validateEmployeePayload: () => ({ isValid: true, errors: [] }),
    hashPayload: () => "hash-2",
    // The live read holds the employee under `contact`. A read without it sends no update
    // (lane B review fix B-R2, row 3.13).
    getEmployeeByContactId: async () => ({ contact: { primaryEmail: "a@test.com" } }),
    findEmployeeByExternalSystemId: async () => ({ found: false, crContactId: null }),
    buildEmployeePayloadForContactId: (payload) => ({ payload }),
    createOrUpdateEmployee: async () => ({ operation: "update", crContactId: "100" }),
    updateClientMetadata: async () => ({}),
    // Row 6.4 (lane E): the BCBA's Contact. No Contact is linked.
    listAssociations: async () => [],
    writeEmployeeWriteback: async ({ objectTypeId, recordId, properties }) => {
      calls.writebacks.push({ objectTypeId, recordId, properties });
      return { fallbackUsed: false, removedProperties: [] };
    },
    putState: async (input) => {
      calls.stateWrites.push(input);
    },
    safeLog: (level, message, meta) => {
      if (level === "warn") {
        calls.warnings.push({ message, meta });
      }
    },
    buildErrorLog: () => ({})
  };

  // Row 4.18 (lane E): HubSpot answers every requested property, a blank one as a null key.
  const merged = { ...deps, ...overrides };
  merged.getBtRbtRecordById = answersLikeHubSpot(merged.getBtRbtRecordById);
  merged.getBcbaRecordById = answersLikeHubSpot(merged.getBcbaRecordById);
  return { deps: merged, calls };
}

test("workflow writes success state on successful update", async () => {
  const { deps, calls } = buildDeps();

  const result = await runEmployeeSyncWorkflow(
    { recordId: "1", employeeType: "bt_rbt", context: { invocationId: "inv-1" } },
    deps
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "success");
  assert.equal(calls.writebacks.length, 1);
  assert.equal(calls.writebacks[0].properties.central_reach_link_to_rt_rbt, "https://members.centralreach.com/#contacts/details/?id=100");
  // Stage 2 (rows 2.1, 2.4): the link record is marked in progress first and saved clean with no
  // expiry; the attempt record is written last.
  assert.equal(calls.stateWrites[0].type, "link");
  assert.equal(calls.stateWrites[0].data.clean, false);
  const link = calls.stateWrites.filter((item) => item.type === "link").at(-1);
  assert.equal(link.ttlSeconds, -1);
  assert.equal(link.data.clean, true);
  assert.equal(calls.stateWrites.at(-1).type, "success");
});

test("workflow returns noop when hash is unchanged, and writes nothing", async () => {
  // Stage 2 (row 2.4): a no-op also needs a clean Cosmos record with matching hashes, so a first
  // run saves one. Stage 3 (row 3.7): a no-op writes nothing, to HubSpot or to Cosmos, when
  // HubSpot already shows success; the status noop is never written.
  const store = new Map();
  const getState = async ({ pk, id }) => store.get(`${pk}|${id}`) || null;
  const first = buildDeps({
    getState,
    putState: async (input) => {
      store.set(`${input.pk}|${input.id}`, { data: input.data });
    }
  });
  await runEmployeeSyncWorkflow({ recordId: "1", employeeType: "bt_rbt" }, first.deps);

  const { deps, calls } = buildDeps({
    getState,
    getBtRbtRecordById: async () => ({
      id: "1",
      properties: {
        hs_object_id: "1",
        hs_lastmodifieddate: "2026-05-06T10:00:00.000Z",
        integration_last_write: "2026-05-06T09:00:00.000Z",
        bt_name: "Alex Rivera",
        last_sync_hash: "hash-2",
        last_sync_status: "success",
        employee_id: "100"
      }
    }),
    createOrUpdateEmployee: async () => {
      throw new Error("should not be called");
    }
  });

  const result = await runEmployeeSyncWorkflow({ recordId: "1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "noop");
  assert.equal(result.operation, "noop");
  assert.equal(calls.writebacks.length, 0);
  assert.equal(calls.stateWrites.length, 0);
});

test("hash match does not noop when employee_id is missing", async () => {
  let upsertCalled = false;
  const { deps } = buildDeps({
    getBtRbtRecordById: async () => ({
      id: "1",
      properties: {
        hs_object_id: "1",
        hs_lastmodifieddate: "2026-05-06T10:00:00.000Z",
        integration_last_write: "2026-05-06T09:00:00.000Z",
        bt_name: "Alex Rivera",
        last_sync_hash: "hash-2",
        employee_id: "",
        entered_in_centralreach: "Yes"
      }
    }),
    createOrUpdateEmployee: async () => {
      upsertCalled = true;
      return { operation: "update", crContactId: "101" };
    }
  });

  const result = await runEmployeeSyncWorkflow({ recordId: "1", employeeType: "bt_rbt" }, deps);
  assert.equal(upsertCalled, true);
  assert.equal(result.status, "success");
  assert.equal(result.crContactId, "101");
});

test("workflow returns waiting when creation is turned off", async () => {
  const { deps, calls } = buildDeps({
    getBtRbtRecordById: async () => ({
      id: "1",
      properties: {
        hs_object_id: "1",
        hs_lastmodifieddate: "2026-05-06T10:00:00.000Z",
        bt_name: "Alex Rivera",
        entered_in_centralreach: "Yes"
      }
    }),
    createOrUpdateEmployee: async () => ({
      operation: "create_turned_off",
      reason: "Employee create is turned off"
    })
  });

  const result = await runEmployeeSyncWorkflow({ recordId: "1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "waiting");
  assert.equal(calls.writebacks.at(-1).properties.last_sync_error, "Employee create is turned off");
  assert.notEqual(result.status, "blocked");
});

test("workflow writes BCBA CentralReach link property", async () => {
  const { deps, calls } = buildDeps({
    createOrUpdateEmployee: async () => ({ operation: "update", crContactId: "200" }),
    buildEmployeePayload: () => ({
      employeePayload: { externalSystemId: "2", firstName: "Pat", lastName: "Morgan" },
      metadataValues: {},
      requiredLabelIds: [],
      warnings: []
    })
  });

  const result = await runEmployeeSyncWorkflow(
    { recordId: "2", employeeType: "bcba", context: { invocationId: "inv-2" } },
    deps
  );

  assert.equal(result.ok, true);
  assert.equal(calls.writebacks[0].properties.central_reach_record_link, "https://members.centralreach.com/#contacts/details/?id=200");
});

test("workflow keeps link writeback when employee_id fallback is used", async () => {
  const { deps, calls } = buildDeps({
    writeEmployeeWriteback: async ({ objectTypeId, recordId, properties }) => {
      calls.writebacks.push({ objectTypeId, recordId, properties });
      return { fallbackUsed: true, removedProperties: ["employee_id"] };
    },
    createOrUpdateEmployee: async () => ({ operation: "update", crContactId: "222" })
  });

  const result = await runEmployeeSyncWorkflow(
    { recordId: "1", employeeType: "bt_rbt", context: { invocationId: "inv-fallback" } },
    deps
  );

  assert.equal(result.writebackFallbackUsed, true);
  assert.equal(calls.writebacks[0].properties.central_reach_link_to_rt_rbt, "https://members.centralreach.com/#contacts/details/?id=222");
});

test("workflow logs warning and skips hubspot-link metadata when portal id missing", async () => {
  const { deps, calls } = buildDeps({
    buildEmployeePayload: () => ({
      employeePayload: { externalSystemId: "1", firstName: "Alex", lastName: "Rivera" },
      metadataValues: { 133819: "Work Address" },
      requiredLabelIds: [],
      warnings: [
        {
          code: "missing_hubspot_portal_id",
          message: "HUBSPOT_PORTAL_ID is not set; skipping HubSpot record link metadata writeback."
        }
      ]
    }),
    updateClientMetadata: async () => ({ updatedCount: 1, failedCount: 0 })
  });

  const result = await runEmployeeSyncWorkflow(
    { recordId: "1", employeeType: "bt_rbt", context: { invocationId: "inv-portal" } },
    deps
  );

  assert.equal(result.status, "success");
  assert.equal(calls.warnings.length, 1);
  assert.equal(calls.warnings[0].meta.warningCodes.includes("missing_hubspot_portal_id"), true);
});

test("BT/RBT metadata changes prevent hash-based noop", async () => {
  let upsertCalled = false;
  const { deps } = buildDeps({
    getBtRbtRecordById: async () => ({
      id: "1",
      properties: {
        hs_object_id: "1",
        hs_lastmodifieddate: "2026-05-06T10:00:00.000Z",
        integration_last_write: "2026-05-06T09:00:00.000Z",
        bt_name: "Alex Rivera",
        last_sync_hash: "hash-without-link",
        employee_id: "100"
      }
    }),
    buildEmployeePayload: () => ({
      employeePayload: { externalSystemId: "1", firstName: "Alex", lastName: "Rivera" },
      metadataValues: { 138703: "https://app.hubspot.com/contacts/50850427/record/2-btrbt/1" },
      requiredLabelIds: [],
      warnings: []
    }),
    hashPayload: (payload) =>
      payload?.metadata?.[138703] ? "hash-with-link" : "hash-without-link",
    createOrUpdateEmployee: async () => {
      upsertCalled = true;
      return { operation: "update", crContactId: "100" };
    },
    updateClientMetadata: async () => ({ updatedCount: 1, failedCount: 0, failedFieldIds: [] })
  });

  const result = await runEmployeeSyncWorkflow(
    { recordId: "1", employeeType: "bt_rbt", context: { invocationId: "inv-meta-hash" } },
    deps
  );

  assert.equal(upsertCalled, true);
  assert.equal(result.status, "success");
});

test("workflow logs warning when metadata write reports failed fields", async () => {
  const { deps, calls } = buildDeps({
    buildEmployeePayload: () => ({
      employeePayload: { externalSystemId: "1", firstName: "Alex", lastName: "Rivera" },
      metadataValues: { 138703: "https://app.hubspot.com/contacts/50850427/record/2-btrbt/1" },
      requiredLabelIds: [],
      warnings: []
    }),
    updateClientMetadata: async () => ({
      updatedCount: 0,
      failedCount: 1,
      failedFieldIds: [138703]
    })
  });

  await assert.rejects(
    runEmployeeSyncWorkflow(
      { recordId: "1", employeeType: "bt_rbt", context: { invocationId: "inv-metadata-fail" } },
      deps
    ),
    /MetadataWriteFailed/
  );

  const metadataWarning = calls.warnings.find(
    (item) => item.message === "Employee metadata write had failures."
  );
  assert.equal(Boolean(metadataWarning), true);
  assert.equal(metadataWarning.meta.failedFieldIds.includes(138703), true);
  assert.equal(calls.writebacks.some((item) => item.properties.last_sync_hash), false);
  // Stage 2 (decision 1): a failure that will be retried leaves HubSpot's status as it was.
  assert.equal(calls.writebacks.length, 0);
});

test("workflow writes fail state when validation decides an error", async () => {
  const { deps, calls } = buildDeps({
    validateEmployeePayload: () => ({ isValid: false, errors: ["externalSystemId is required"] })
  });

  const result = await runEmployeeSyncWorkflow({ recordId: "1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "error");
  assert.equal(calls.writebacks[0].properties.last_sync_error, "externalSystemId is required");
  assert.equal(calls.stateWrites[0].type, "fail");
});

function unlinkedBtRbt(extra = {}) {
  return async () => ({
    id: "1",
    properties: {
      hs_object_id: "1",
      hs_lastmodifieddate: "2026-05-06T10:00:00.000Z",
      bt_name: "Alex Rivera",
      employee_id: "",
      ...extra
    }
  });
}

for (const entry of ["", "Yes - Generic", "No- Made Inactive"]) {
  test(`gate skips an unlinked BT/RBT when entered_in_centralreach is "${entry}"`, async () => {
    let upsertCalled = false;
    const { deps, calls } = buildDeps({
      getBtRbtRecordById: unlinkedBtRbt({ entered_in_centralreach: entry }),
      createOrUpdateEmployee: async () => {
        upsertCalled = true;
        return { operation: "create", crContactId: "300" };
      }
    });
    const result = await runEmployeeSyncWorkflow({ recordId: "1", employeeType: "bt_rbt" }, deps);
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "entry_not_yes");
    assert.equal(upsertCalled, false);
    assert.equal(calls.writebacks.length, 0);
  });
}

test("gate keeps syncing a linked BT/RBT in No- Made Inactive", async () => {
  let upsertCalled = false;
  const { deps } = buildDeps({
    getBtRbtRecordById: unlinkedBtRbt({
      employee_id: "100",
      entered_in_centralreach: "No- Made Inactive"
    }),
    createOrUpdateEmployee: async () => {
      upsertCalled = true;
      return { operation: "update", crContactId: "100" };
    }
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "1", employeeType: "bt_rbt" }, deps);
  assert.equal(upsertCalled, true);
  assert.equal(result.status, "success");
});

test("gate skips test_record = true unless test records are included", async () => {
  const { deps } = buildDeps({
    getBtRbtRecordById: unlinkedBtRbt({ entered_in_centralreach: "Yes", test_record: "true" })
  });
  const skipped = await runEmployeeSyncWorkflow({ recordId: "1", employeeType: "bt_rbt" }, deps);
  assert.equal(skipped.status, "skipped");
  assert.equal(skipped.reason, "test_record");

  const baseConfig = deps.getConfig();
  const included = await runEmployeeSyncWorkflow(
    { recordId: "1", employeeType: "bt_rbt" },
    { ...deps, getConfig: () => ({ ...baseConfig, sync: { includeTestRecords: true } }) }
  );
  assert.notEqual(included.status, "skipped");
});
