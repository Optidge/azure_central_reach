// Slice 1a: stop duplicate creates and keep the CentralReach id through failures.
//
// Guide rows these tests prove:
// - Business rules, Requirement 1: create only when Entered in CR is Yes and no CR record is linked.
// - Hybrid Change Detection, "Minimum changes and tests before production": "Save the successful
//   comparison baseline only after the required writes succeed, preserving retries without
//   duplicate record creation."
// - [GER-CASE] "Client ID and link · CR → HS" and [GER-BCBA] / [GER-BT] "Employee ID and link · CR → HS".
// - [G11] Monitoring, and the tracker's failures report: every failure is visible in HubSpot
//   through last_sync_status and last_sync_error.
import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  createCentralReachClient,
  createOrUpdateClient,
  createOrUpdateEmployee,
  externalIdLookupMissed,
  extractCreateErrorReason,
  readExternalIdLookup
} from "../../lib/centralReachClient.mjs";
import { updateEmployeeWritebackWithFallback } from "../../lib/hubspotClient.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";

function httpError(status, data = {}) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data, headers: {} };
  return error;
}

// Replaces the network with a scripted Central Reach. Each handler returns a body or throws.
function fakeCentralReach(handlers) {
  const calls = [];
  const adapter = async (config) => {
    const method = String(config.method || "get").toUpperCase();
    const url = String(config.url || "");
    if (url.includes("token.test")) {
      return { data: { access_token: "t", expires_in: 3600 }, status: 200, headers: {}, config };
    }
    calls.push({ method, url });
    const handler = handlers[`${method} ${url}`];
    if (!handler) {
      throw httpError(599, { message: `no handler for ${method} ${url}` });
    }
    return { data: await handler(), status: 200, headers: {}, config };
  };
  axios.defaults.adapter = adapter;
  const client = createCentralReachClient({
    centralReach: {
      baseUrl: "https://cr.test",
      apiKey: "k",
      clientId: "c",
      clientSecret: "s",
      tokenUrl: "https://token.test/connect/token"
    }
  });
  client.defaults.adapter = adapter;
  return { calls, count: (key) => calls.filter((call) => `${call.method} ${call.url}` === key).length };
}

test("Hybrid minimum changes: a client create that fails with 500 is sent once, not retried", async () => {
  const cr = fakeCentralReach({
    "PUT /contacts/client/byExternalSystemId": () => {
      throw httpError(404);
    },
    "POST /contacts/client": () => {
      throw httpError(500);
    }
  });
  await assert.rejects(
    createOrUpdateClient({ payload: { ExternalSystemId: "deal-1" } }),
    (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN"
  );
  assert.equal(cr.count("POST /contacts/client"), 1);
});

test("Hybrid minimum changes: an employee create that fails with 500 is sent once, not retried", async () => {
  const cr = fakeCentralReach({
    "PUT /contacts/employee/byExternalSystemId": () => {
      throw httpError(404);
    },
    "POST /contacts/employee": () => {
      throw httpError(503);
    }
  });
  await assert.rejects(
    createOrUpdateEmployee({
      payload: { externalSystemId: "1" },
      employeeType: "bcba",
      allowEmployeeCreate: true,
      putOnlyMode: false
    }),
    (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN"
  );
  assert.equal(cr.count("POST /contacts/employee"), 1);
});

test("Requirement 1: a clear 404 on the external-id lookup allows one create", async () => {
  const cr = fakeCentralReach({
    "PUT /contacts/client/byExternalSystemId": () => {
      throw httpError(404);
    },
    "POST /contacts/client": () => ({ contact: { contactId: 77 } })
  });
  const result = await createOrUpdateClient({ payload: { ExternalSystemId: "deal-1" } });
  assert.deepEqual(result, { operation: "create", crContactId: "77" });
  assert.equal(cr.count("POST /contacts/client"), 1);
});

test("Requirement 1: an external-id match updates and never creates", async () => {
  const cr = fakeCentralReach({
    "PUT /contacts/client/byExternalSystemId": () => ({ contact: { contactId: 55 } })
  });
  const result = await createOrUpdateClient({ payload: { ExternalSystemId: "deal-1" } });
  assert.deepEqual(result, { operation: "update", crContactId: "55" });
  assert.equal(cr.count("POST /contacts/client"), 0);
});

test("Hybrid minimum changes: an unclear lookup answer never leads to a create", async () => {
  // A non-404 error whose text says "not found" is not proof that the record is absent.
  let cr = fakeCentralReach({
    "PUT /contacts/client/byExternalSystemId": () => {
      throw httpError(422, { message: "Unable to find contact" });
    }
  });
  await assert.rejects(createOrUpdateClient({ payload: { ExternalSystemId: "deal-1" } }));
  assert.equal(cr.count("POST /contacts/client"), 0);

  // A success answer with no id and no "not found" text is unknown.
  cr = fakeCentralReach({
    "PUT /contacts/employee/byExternalSystemId": () => ({ result: "ok" })
  });
  await assert.rejects(
    createOrUpdateEmployee({
      payload: { externalSystemId: "1" },
      employeeType: "bt_rbt",
      allowEmployeeCreate: true,
      putOnlyMode: false
    }),
    (error) => error.code === "CR_LOOKUP_UNKNOWN"
  );
  assert.equal(cr.count("POST /contacts/employee"), 0);
});

test("external-id lookup classification", () => {
  assert.equal(externalIdLookupMissed(httpError(404)), true);
  assert.equal(externalIdLookupMissed(httpError(400, { message: "Contact not found" })), true);
  assert.equal(externalIdLookupMissed(httpError(400, { message: "FirstName is required" })), false);
  assert.equal(externalIdLookupMissed(httpError(500, { message: "not found" })), false);
  assert.equal(externalIdLookupMissed(httpError(429, { message: "no match" })), false);
  assert.equal(externalIdLookupMissed(new Error("timeout")), false);

  assert.deepEqual(readExternalIdLookup({ contactId: 9 }, "client"), {
    found: true,
    crContactId: "9",
    operation: "update"
  });
  assert.deepEqual(
    readExternalIdLookup({ responseStatus: { message: "No match for external id" } }, "client"),
    { found: false, crContactId: null }
  );
  assert.throws(() => readExternalIdLookup({}, "client"), (error) => error.code === "CR_LOOKUP_UNKNOWN");
  assert.throws(() => readExternalIdLookup(null, "employee"), (error) => error.code === "CR_LOOKUP_UNKNOWN");
});

test("R11: a rejected employee create reports field names and codes, never CentralReach's text", async () => {
  const rejection = httpError(400, {
    responseStatus: {
      errorCode: "ValidationError",
      message: "Jane Example (jane@example.com) has an invalid DateOfBirth",
      errors: [
        { fieldName: "DateOfBirth", errorCode: "NotEmpty", message: "Jane Example needs a birth date" }
      ]
    }
  });
  const reason = extractCreateErrorReason(rejection);
  assert.equal(
    reason,
    "CentralReach rejected the employee create (400). Fields: DateOfBirth. Codes: ValidationError, NotEmpty."
  );
  assert.equal(reason.includes("Jane"), false);

  fakeCentralReach({
    "PUT /contacts/employee/byExternalSystemId": () => {
      throw httpError(404);
    },
    "POST /contacts/employee": () => {
      throw rejection;
    }
  });
  const blocked = await createOrUpdateEmployee({
    payload: { externalSystemId: "1" },
    employeeType: "bcba",
    allowEmployeeCreate: true,
    putOnlyMode: false
  });
  assert.equal(blocked.operation, "blocked");
  assert.equal(blocked.reason, reason);
});

test("CentralReach 409 (record already exists) blocks the employee create instead of retrying it", async () => {
  const cr = fakeCentralReach({
    "PUT /contacts/employee/byExternalSystemId": () => {
      throw httpError(404);
    },
    "POST /contacts/employee": () => {
      throw httpError(409);
    }
  });
  const result = await createOrUpdateEmployee({
    payload: { externalSystemId: "1" },
    employeeType: "bcba",
    allowEmployeeCreate: true,
    putOnlyMode: false
  });
  assert.equal(result.operation, "blocked");
  assert.equal(cr.count("POST /contacts/employee"), 1);
});

function employeeDeps(overrides = {}) {
  const calls = { writebacks: [], stateWrites: [], upserts: 0, order: [] };
  const deps = {
    getConfig: () => ({
      hubspot: { btRbtObjectTypeId: "2-bt", bcbaObjectTypeId: "2-bcba", employeeIdProperty: "employee_id" },
      features: { allowEmployeeCreate: true, putOnlyMode: false },
      ttl: { successTtlSeconds: 86400, failTtlSeconds: 3600 }
    }),
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    acquireLease: async () => true,
    releaseLease: async () => {},
    getState: async () => overrides.prior || null,
    getBcbaRecordById: async () => ({
      id: "2",
      properties: { hs_object_id: "2", entered_in_centralreach: "Yes", employee_id: "", ...overrides.properties }
    }),
    buildEmployeePayload: () => ({
      employeePayload: { externalSystemId: "2", firstName: "Pat", lastName: "Morgan" },
      metadataValues: { 138069: "pat@example.com" },
      requiredLabelIds: [1130668],
      warnings: []
    }),
    validateEmployeePayload: () => ({ isValid: true, errors: [] }),
    getEmployeeByContactId: async () => ({}),
    buildEmployeePayloadForContactId: (payload) => ({ payload }),
    createOrUpdateEmployee: async () => {
      calls.upserts += 1;
      calls.order.push("upsert");
      return { operation: "create", crContactId: "900" };
    },
    updateClientMetadata: async () => {
      calls.order.push("metadata");
      return { updatedCount: 1, failedCount: 0, failedFieldIds: [] };
    },
    writeEmployeeWriteback: async ({ properties }) => {
      calls.writebacks.push(properties);
      calls.order.push("writeback");
      return { fallbackUsed: false, removedProperties: [] };
    },
    putState: async (input) => {
      calls.stateWrites.push(input);
      calls.order.push(`state:${input.type}`);
    },
    safeLog: () => {},
    buildErrorLog: () => ({}),
    ...overrides.deps
  };
  return { deps, calls };
}

test("[GER-BCBA] Employee ID · CR → HS: a new CR id is saved in Cosmos and HubSpot before the metadata write", async () => {
  const { deps, calls } = employeeDeps();
  const result = await runEmployeeSyncWorkflow({ recordId: "2", employeeType: "bcba" }, deps);

  assert.equal(result.crContactId, "900");
  assert.deepEqual(calls.order.slice(0, 4), ["upsert", "state:pending_link", "writeback", "metadata"]);
  assert.equal(calls.stateWrites[0].data.crContactId, "900");
  assert.deepEqual(calls.writebacks[0], {
    employee_id: "900",
    central_reach_record_link: "https://members.centralreach.com/#contacts/details/?id=900"
  });
});

test("Hybrid minimum changes: a metadata failure after an employee create keeps the CR id everywhere", async () => {
  const { deps, calls } = employeeDeps({
    deps: {
      updateClientMetadata: async () => ({ updatedCount: 0, failedCount: 1, failedFieldIds: [138069] })
    }
  });
  await assert.rejects(
    runEmployeeSyncWorkflow({ recordId: "2", employeeType: "bcba" }, deps),
    /MetadataWriteFailed/
  );

  const errorWriteback = calls.writebacks.at(-1);
  assert.equal(errorWriteback.last_sync_status, "error");
  assert.equal(errorWriteback.last_sync_error, "MetadataWriteFailed fields: 138069");
  assert.equal(errorWriteback.employee_id, "900");
  assert.equal(errorWriteback.last_sync_hash, undefined);

  const failState = calls.stateWrites.at(-1);
  assert.equal(failState.type, "fail");
  assert.equal(failState.data.crContactId, "900");
  assert.equal(failState.ttlSeconds, 86400);
});

test("Hybrid minimum changes: a stale source after an employee create still leaves the CR id saved", async () => {
  let mappings = 0;
  const { deps, calls } = employeeDeps({
    deps: {
      buildEmployeePayload: () => {
        mappings += 1;
        // The second mapping is the post-write confirmation read; it sees a changed record.
        return {
          employeePayload: { externalSystemId: "2", firstName: mappings >= 2 ? "Changed" : "Pat" },
          metadataValues: {},
          requiredLabelIds: [],
          warnings: []
        };
      }
    }
  });
  await assert.rejects(
    runEmployeeSyncWorkflow({ recordId: "2", employeeType: "bcba" }, deps),
    /SyncStale/
  );
  assert.equal(calls.stateWrites[0].type, "pending_link");
  assert.equal(calls.stateWrites[0].data.crContactId, "900");
  assert.equal(calls.writebacks[0].employee_id, "900");
});

test("Hybrid minimum changes: a failure before the CR write keeps a Cosmos-recovered id and the last good hashes", async () => {
  const { deps, calls } = employeeDeps({
    prior: { data: { crContactId: "555", fieldHashes: { "metadata.138069": "abc" } } },
    deps: {
      getEmployeeByContactId: async () => {
        throw httpError(503);
      }
    }
  });
  await assert.rejects(runEmployeeSyncWorkflow({ recordId: "2", employeeType: "bcba" }, deps));

  assert.equal(calls.upserts, 0);
  const failState = calls.stateWrites.at(-1);
  assert.equal(failState.type, "fail");
  assert.equal(failState.data.crContactId, "555");
  assert.deepEqual(failState.data.fieldHashes, { "metadata.138069": "abc" });
  assert.equal(calls.writebacks.at(-1).employee_id, "555");
});

test("Hybrid minimum changes: a failed HubSpot read does not erase the stored CR id or hashes", async () => {
  const { deps, calls } = employeeDeps({
    prior: { data: { crContactId: "555", fieldHashes: { "metadata.138069": "abc" } } },
    deps: {
      getBcbaRecordById: async () => {
        throw httpError(403);
      }
    }
  });
  await assert.rejects(
    runEmployeeSyncWorkflow({ recordId: "2", employeeType: "bcba" }, deps),
    /HubSpotReadFailed/
  );
  const failState = calls.stateWrites.at(-1);
  assert.equal(failState.data.crContactId, "555");
  assert.deepEqual(failState.data.fieldHashes, { "metadata.138069": "abc" });
  assert.equal(calls.upserts, 0);
});

test("[G11] Monitoring: every employee failure is written to HubSpot as an error", async () => {
  const { deps, calls } = employeeDeps({
    deps: { validateEmployeePayload: () => ({ isValid: false, errors: ["externalSystemId is required"] }) }
  });
  await assert.rejects(
    runEmployeeSyncWorkflow({ recordId: "2", employeeType: "bcba" }, deps),
    /PayloadValidationError/
  );
  assert.equal(calls.writebacks.length, 1);
  assert.equal(calls.writebacks[0].last_sync_status, "error");
  assert.equal(
    calls.writebacks[0].last_sync_error,
    "PayloadValidationError: externalSystemId is required"
  );
  assert.equal(calls.writebacks[0].integration_last_write, undefined);
  // No CR id is known, so the fail state uses the short lifetime.
  assert.equal(calls.stateWrites.at(-1).ttlSeconds, 3600);
});

test("[GER-BT] Employee ID · CR → HS: a rejected employee_id writeback marks the record as an error", async () => {
  const patches = [];
  const result = await updateEmployeeWritebackWithFallback({
    objectTypeId: "2-bt",
    recordId: "1",
    employeeIdProperty: "employee_id",
    properties: { employee_id: "900", last_sync_status: "success", last_sync_error: "" },
    updateProperties: async (objectTypeId, recordId, properties) => {
      patches.push(properties);
      if (Object.prototype.hasOwnProperty.call(properties, "employee_id")) {
        throw httpError(400, { message: "Property employee_id does not exist" });
      }
    }
  });
  assert.equal(result.fallbackUsed, true);
  assert.equal(patches[1].employee_id, undefined);
  assert.equal(patches[1].last_sync_status, "error");
  assert.match(patches[1].last_sync_error, /employee_id writeback/);
});

function clientDeps(overrides = {}) {
  const calls = { writebacks: [], stateWrites: [], order: [] };
  let stored = overrides.prior || null;
  const deps = {
    getConfig: () => ({
      hubspot: { crContactIdProperty: "client_id_number" },
      ttl: { successTtlSeconds: 86400, failTtlSeconds: 3600 }
    }),
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    acquireLease: async () => true,
    releaseLease: async () => {},
    getState: async () => stored,
    getDealById: async () => ({
      id: "deal-1",
      properties: { hs_object_id: "deal-1", enter_in_central_reach: "Yes", client_id_number: "" }
    }),
    buildClientPayload: () => ({ FirstName: "A", LastName: "B" }),
    validateClientPayload: () => ({ isValid: true, errors: [] }),
    buildClientMetadata: () => ({ labelIds: [1], metadataValues: { 126214: "x" } }),
    createOrUpdateClient: async () => {
      calls.order.push("upsert");
      return { operation: "create", crContactId: "700" };
    },
    updateClientMetadata: async () => {
      calls.order.push("metadata");
      return { updatedCount: 1, failedCount: 0, failedFieldIds: [] };
    },
    updateDealProperties: async (dealId, properties) => {
      calls.writebacks.push(properties);
      calls.order.push("writeback");
    },
    putState: async (input) => {
      calls.stateWrites.push(input);
      calls.order.push(`state:${input.type}`);
      stored = { data: input.data };
    },
    safeLog: () => {},
    buildErrorLog: () => ({}),
    ...overrides.deps
  };
  return { deps, calls };
}

test("[GER-CASE] Client ID · CR → HS: a new CR id is saved in Cosmos and HubSpot before the metadata write", async () => {
  const { deps, calls } = clientDeps();
  const result = await runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps);

  assert.equal(result.crContactId, "700");
  assert.deepEqual(calls.order.slice(0, 4), ["upsert", "state:pending_link", "writeback", "metadata"]);
  assert.deepEqual(calls.writebacks[0], {
    client_id_number: "700",
    central_reach_link_to_client: "https://members.centralreach.com/#contacts/details/?id=700"
  });
});

test("Hybrid minimum changes: a metadata failure after a client create keeps the CR id and the last good hashes", async () => {
  const { deps, calls } = clientDeps({
    prior: { data: { fieldHashes: { "metadata.126214": "old" } } },
    deps: {
      updateClientMetadata: async () => ({ updatedCount: 0, failedCount: 1, failedFieldIds: [126214] })
    }
  });
  await assert.rejects(
    runClientSyncWorkflow({ dealId: "deal-1", context: {} }, deps),
    /MetadataWriteFailed/
  );

  const errorWriteback = calls.writebacks.at(-1);
  assert.equal(errorWriteback.last_sync_status, "error");
  assert.equal(errorWriteback.client_id_number, "700");
  assert.equal(errorWriteback.last_sync_hash, undefined);

  const failState = calls.stateWrites.at(-1);
  assert.equal(failState.type, "fail");
  assert.equal(failState.data.crContactId, "700");
  assert.deepEqual(failState.data.fieldHashes, { "metadata.126214": "old" });
  assert.equal(failState.ttlSeconds, 86400);
});
