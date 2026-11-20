// Stage 1. Rules are BUILD-PLAN.md section 7, rows 1.1 to 1.12, and section 5.
// These fixtures are not sandbox rounds. Round names are in
// docs/workstreams/architecture-update/SANDBOX-TEST-PLAN.md.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";
import * as configLib from "../../lib/config.mjs";
import * as dates from "../../lib/dates.mjs";
import * as centralReach from "../../lib/centralReachClient.mjs";
import { validateConfig, validateIntakePollerConfig } from "../../lib/config.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { validateEmployeePayload } from "../../mappings/employees/validateEmployeePayload.mjs";
import { buildClientPayload } from "../../mappings/client/buildClientPayload.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import {
  buildEmployeePayloadForContactId,
  createCentralReachClient,
  createOrUpdateEmployee,
  extractCreateErrorReason,
  updateClientMetadata
} from "../../lib/centralReachClient.mjs";

const MAP_CONFIG = {
  hubspot: { hubspotPortalId: "52311591", btRbtObjectTypeId: "2-bt", bcbaObjectTypeId: "2-bcba" }
};

const CHECKLIST_VALUE = "External System ID";

function httpError(status, data = {}) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data, headers: {} };
  return error;
}

function scriptCentralReach(handlers) {
  const calls = [];
  const adapter = async (requestConfig) => {
    const method = String(requestConfig.method || "get").toUpperCase();
    const url = String(requestConfig.url || "");
    if (url.includes("token.test")) {
      return { data: { access_token: "t", expires_in: 3600 }, status: 200, headers: {}, config: requestConfig };
    }
    calls.push({ method, url, body: requestConfig.data });
    const handler = handlers[`${method} ${url}`];
    if (!handler) {
      throw httpError(599, { message: `no handler for ${method} ${url}` });
    }
    const result = await handler();
    if (result && result.__httpError) {
      throw result.__httpError;
    }
    return { data: result, status: 200, headers: {}, config: requestConfig };
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
  return {
    calls,
    count: (key) => calls.filter((call) => `${call.method} ${call.url}` === key).length
  };
}

function employeeRecord(employeeType, properties) {
  const id = properties.hs_object_id || "HS1";
  return {
    id,
    properties: {
      hs_object_id: id,
      entered_in_centralreach: "Yes",
      employee_id: "",
      first_name: "Alex",
      last_name: "Rivera",
      email: "alex@example.com",
      ucaba_email_address: "pat@work.test",
      date_of_birth: "1990-10-20",
      workday_id: "WD1",
      ...properties
    }
  };
}

function employeeHarness({
  employeeType = "bt_rbt",
  properties = {},
  features = { allowEmployeeCreate: true, putOnlyMode: false },
  sync = {},
  crEmployee = { contact: { contactId: "7001", externalSystemId: "WD1", primaryEmail: "stored@example.com" } },
  findEmployeeByExternalSystemId = async () => ({ found: false, crContactId: null }),
  findHubSpotRecordsByEmployeeId = async () => [],
  createOrUpdateEmployee = async () => ({ operation: "create", crContactId: "7001" }),
  acquireLease = async () => true,
  hash = "hash-new",
  prior = null
} = {}) {
  const calls = {
    upserts: [],
    writebacks: [],
    stateWrites: [],
    lookups: [],
    holderSearches: [],
    leases: [],
    reads: [],
    crGets: [],
    metadata: [],
    events: []
  };
  const record = employeeRecord(employeeType, properties);
  const deps = {
    getConfig: () => ({
      hubspot: {
        btRbtObjectTypeId: "2-bt",
        bcbaObjectTypeId: "2-bcba",
        employeeIdProperty: "employee_id",
        hubspotPortalId: "52311591"
      },
      features,
      ttl: { successTtlSeconds: 120, failTtlSeconds: 60, leaseTtlSeconds: 120 },
      sync,
      centralReach: {}
    }),
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    acquireLease: async (input) => {
      calls.leases.push(input);
      return acquireLease(input);
    },
    releaseLease: async ({ pk }) => {
      calls.events.push(`release:${pk}`);
    },
    getState: async () => prior,
    getBtRbtRecordById: async (id, type, propertyNames) => {
      calls.reads.push(propertyNames);
      return record;
    },
    getBcbaRecordById: async (id, type, propertyNames) => {
      calls.reads.push(propertyNames);
      return record;
    },
    getEmployeeByContactId: async (id) => {
      calls.crGets.push(id);
      return crEmployee;
    },
    createOrUpdateEmployee: async (input) => {
      calls.upserts.push(input);
      return createOrUpdateEmployee(input);
    },
    findEmployeeByExternalSystemId: async (externalId) => {
      calls.lookups.push(externalId);
      return findEmployeeByExternalSystemId(externalId);
    },
    findHubSpotRecordsByEmployeeId: async (input) => {
      calls.holderSearches.push(input);
      return findHubSpotRecordsByEmployeeId(input);
    },
    updateClientMetadata: async (...args) => {
      calls.metadata.push(args);
      return { updatedCount: 0, failedCount: 0 };
    },
    writeEmployeeWriteback: async ({ properties: written }) => {
      calls.writebacks.push(written);
      if (written.employee_id) {
        calls.events.push("writeback:employee_id");
      }
      return { fallbackUsed: false, removedProperties: [] };
    },
    putState: async (input) => {
      calls.stateWrites.push(input);
      calls.events.push(`state:${input.type}`);
    },
    hashPayload: () => hash,
    safeLog: () => {},
    buildErrorLog: () => ({})
  };
  return { deps, calls, record };
}

function clientHarness({
  properties = {},
  sync = {},
  hash = "hash-new",
  realHash = false,
  prior = null,
  findClientByExternalSystemId = async () => ({ found: false, crContactId: null }),
  createOrUpdateClient = async () => ({ operation: "update", crContactId: "2001" })
} = {}) {
  const calls = { upserts: [], writebacks: [], stateWrites: [], lookups: [], reads: [] };
  const deal = {
    id: properties.hs_object_id || "deal-1",
    properties: {
      hs_object_id: properties.hs_object_id || "deal-1",
      enter_in_central_reach: "Yes",
      client_id_number: "",
      phi_first_name__cloned_: "Alex",
      phi_last_name: "Rivera",
      phi_date_of_birth: "2017-01-14",
      dealstage: "1",
      ...properties
    }
  };
  const deps = {
    getConfig: () => ({
      hubspot: { crContactIdProperty: "client_id_number", hubspotPortalId: "52311591" },
      ttl: { successTtlSeconds: 100, failTtlSeconds: 50, leaseTtlSeconds: 120 },
      sync,
      centralReach: {}
    }),
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    acquireLease: async () => true,
    releaseLease: async () => {},
    getState: async () => prior,
    getDealById: async (id, propertyNames) => {
      calls.reads.push(propertyNames);
      return deal;
    },
    listAssociations: async () => [],
    createOrUpdateClient: async (input) => {
      calls.upserts.push(input);
      return createOrUpdateClient(input);
    },
    findClientByExternalSystemId: async (externalId) => {
      calls.lookups.push(externalId);
      return findClientByExternalSystemId(externalId);
    },
    buildClientMetadata: () => ({ labelIds: [], metadataValues: {} }),
    updateClientMetadata: async () => ({ updatedCount: 0, failedCount: 0 }),
    updateDealProperties: async (dealId, written) => {
      calls.writebacks.push(written);
    },
    putState: async (input) => {
      calls.stateWrites.push(input);
    },
    ...(realHash ? {} : { hashPayload: () => hash }),
    safeLog: () => {},
    buildErrorLog: () => ({})
  };
  return { deps, calls, deal };
}

function lastWrite(calls) {
  return calls.writebacks.at(-1) || {};
}

// Stage 2: the link record (type "link") is separate from the attempt record.
function lastLinkWrite(calls) {
  return calls.stateWrites.filter((item) => item.type === "link").at(-1);
}

test("[G17] SYNC_RECORD_GATE_PROPERTY is required for the worker and the poller", () => {
  assert.equal(validateConfig().missing.includes("SYNC_RECORD_GATE_PROPERTY"), true);
  assert.equal(validateIntakePollerConfig().missing.includes("SYNC_RECORD_GATE_PROPERTY"), true);
});

test("[G17] the record gate helper returns the property name, or nothing when the value is none", () => {
  assert.equal(typeof configLib.syncRecordGateProperty, "function");
  assert.equal(configLib.syncRecordGateProperty("none"), null);
  assert.equal(configLib.syncRecordGateProperty(" NONE "), null);
  assert.equal(configLib.syncRecordGateProperty(" sandbox_test_field "), "sandbox_test_field");
});

test("[G17] the example settings name the sandbox record gate", () => {
  const examplePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../local.settings.example.json"
  );
  const example = JSON.parse(readFileSync(examplePath, "utf8"));
  assert.equal(example.Values.SYNC_RECORD_GATE_PROPERTY, "sandbox_test_field");
});

for (const employeeType of ["bt_rbt", "bcba"]) {
  for (const gateValue of [undefined, "", "false", false]) {
    test(`[G17] record gate skips a linked ${employeeType} when ${JSON.stringify(gateValue)} is not true`, async () => {
      const { deps, calls } = employeeHarness({
        employeeType,
        sync: { recordGateProperty: "sandbox_test_field" },
        properties: {
          employee_id: "7001",
          sandbox_test_field: gateValue
        }
      });
      const result = await runEmployeeSyncWorkflow(
        { recordId: "HS1", employeeType },
        deps
      );
      assert.equal(result.status, "skipped");
      assert.equal(result.reason, "record_gate");
      assert.equal(calls.upserts.length, 0);
      assert.equal(calls.crGets.length, 0);
      assert.equal(calls.writebacks.length, 0);
    });
  }

  test(`[G17] record gate lets a ${employeeType} proceed when the property is true`, async () => {
    const { deps, calls } = employeeHarness({
      employeeType,
      sync: { recordGateProperty: "sandbox_test_field" },
      properties: { employee_id: "7001", sandbox_test_field: "true" }
    });
    const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType }, deps);
    assert.notEqual(result.status, "skipped");
    assert.equal(calls.reads[0].includes("sandbox_test_field"), true);
    assert.equal(
      calls.reads[0].includes(employeeType === "bcba" ? "bcba_in_cr_checklist" : "btrbt_in_cr_checklist"),
      true
    );
    assert.equal(calls.reads[0].includes("first_name"), true);
    assert.equal(calls.reads[0].includes("last_name"), true);
  });
}

for (const gateValue of [undefined, "", "false"]) {
  test(`[GBR] record gate skips a linked Case when sandbox_test_field is ${JSON.stringify(gateValue)}`, async () => {
    const { deps, calls } = clientHarness({
      sync: { recordGateProperty: "sandbox_test_field" },
      properties: { client_id_number: "2001", sandbox_test_field: gateValue }
    });
    const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "record_gate");
    assert.equal(calls.upserts.length, 0);
    assert.equal(calls.writebacks.length, 0);
    assert.equal(calls.lookups.length, 0);
  });
}

test("[GBR] record gate lets a Case proceed when sandbox_test_field is true", async () => {
  const { deps, calls } = clientHarness({
    sync: { recordGateProperty: "sandbox_test_field" },
    properties: { client_id_number: "2001", sandbox_test_field: true }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.notEqual(result.status, "skipped");
  assert.equal(calls.reads[0].includes("sandbox_test_field"), true);
});

test("[G17] record gate value none is not checked", async () => {
  const employee = employeeHarness({
    sync: { recordGateProperty: null },
    properties: { employee_id: "7001" }
  });
  const employeeResult = await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    employee.deps
  );
  assert.notEqual(employeeResult.reason, "record_gate");

  const client = clientHarness({
    sync: { recordGateProperty: null },
    properties: { client_id_number: "2001" }
  });
  const clientResult = await runClientSyncWorkflow({ dealId: "deal-1" }, client.deps);
  assert.notEqual(clientResult.reason, "record_gate");
});

test("[G17] a 400 on employee create is error, with a fail record, and the run finishes", async () => {
  const reason = "CentralReach rejected the employee create (400).";
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "" },
    createOrUpdateEmployee: async () => ({ operation: "create_rejected", reason })
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "error");
  assert.equal(calls.upserts.length, 1);
  assert.equal(lastWrite(calls).last_sync_status, "error");
  assert.equal(lastWrite(calls).last_sync_error, reason);
  assert.equal(typeof lastWrite(calls).integration_last_write, "string");
  assert.equal(lastWrite(calls).updated_by_integration, true);
  assert.equal(typeof lastWrite(calls).last_sync_at, "string");
  assert.equal(calls.stateWrites.some((item) => item.type === "success"), false);
  assert.equal(calls.stateWrites.at(-1).type, "fail");
  assert.notEqual(result.status, "blocked");
});

test("[G17] a 409 on employee create is error, with a fail record, and the run finishes", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "" },
    createOrUpdateEmployee: async () => ({
      operation: "create_rejected",
      reason: "CentralReach rejected the employee create (409)."
    })
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bcba" }, deps);
  assert.equal(result.status, "error");
  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.stateWrites.at(-1).type, "fail");
  assert.equal(calls.stateWrites.some((item) => item.type === "success"), false);
});

test("[G17] CentralReach create rejection is not returned as blocked", async () => {
  const rejection = httpError(400, {
    responseStatus: { errorCode: "ValidationError", errors: [{ fieldName: "PrimaryEmail", errorCode: "NotEmpty" }] }
  });
  const cr = scriptCentralReach({
    "POST /contacts/employee": () => ({ __httpError: rejection })
  });
  const result = await createOrUpdateEmployee({
    payload: { externalSystemId: "WD1", firstName: "Alex", lastName: "Rivera" },
    employeeType: "bt_rbt",
    allowEmployeeCreate: true,
    putOnlyMode: false
  });
  assert.equal(result.operation, "create_rejected");
  assert.equal(result.reason, extractCreateErrorReason(rejection));
  assert.notEqual(result.operation, "blocked");
  assert.equal(cr.count("POST /contacts/employee"), 1);
  assert.equal(cr.calls.some((call) => call.method === "PUT"), false);
});

test("[G17] a 409 from CentralReach create is create_rejected and is not retried", async () => {
  const cr = scriptCentralReach({
    "POST /contacts/employee": () => ({ __httpError: httpError(409) })
  });
  const result = await createOrUpdateEmployee({
    payload: { externalSystemId: "WD1", firstName: "Alex", lastName: "Rivera" },
    employeeType: "bcba",
    allowEmployeeCreate: true,
    putOnlyMode: false
  });
  assert.equal(result.operation, "create_rejected");
  assert.notEqual(result.operation, "blocked");
  assert.equal(cr.count("POST /contacts/employee"), 1);
});

test("[G17] employee create turned off is waiting and the run finishes", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "" },
    features: { allowEmployeeCreate: false, putOnlyMode: true },
    createOrUpdateEmployee: async () => ({
      operation: "create_turned_off",
      reason: "Employee create is turned off"
    })
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "waiting");
  assert.equal(lastWrite(calls).last_sync_status, "waiting");
  assert.equal(lastWrite(calls).last_sync_error, "Employee create is turned off");
  assert.equal(typeof lastWrite(calls).integration_last_write, "string");
  assert.equal(lastWrite(calls).updated_by_integration, true);
  assert.equal(calls.stateWrites.some((item) => item.type === "success"), false);
  assert.notEqual(result.status, "blocked");
});

test("[G17] createOrUpdateEmployee reports create turned off and does not write blocked", async () => {
  const cr = scriptCentralReach({});
  const result = await createOrUpdateEmployee({
    payload: { externalSystemId: "WD1", firstName: "Alex", lastName: "Rivera" },
    employeeType: "bcba",
    allowEmployeeCreate: false,
    putOnlyMode: false
  });
  assert.equal(result.operation, "create_turned_off");
  assert.equal(result.reason, "Employee create is turned off");
  assert.notEqual(result.operation, "blocked");
  assert.equal(cr.calls.some((call) => call.method === "POST" || call.method === "PUT"), false);
});

const EMPLOYEE_CREATE_FIELDS = [
  ["bt_rbt", "first_name", { first_name: "" }],
  ["bt_rbt", "last_name", { last_name: "" }],
  ["bt_rbt", "email", { email: "" }],
  ["bcba", "first_name", { first_name: "" }],
  ["bcba", "last_name", { last_name: "" }],
  ["bcba", "ucaba_email_address", { ucaba_email_address: "" }]
];

for (const [employeeType, fieldName, override] of EMPLOYEE_CREATE_FIELDS) {
  test(`[GER-REQ] employee create ${employeeType} errors on a blank ${fieldName} and does not call CentralReach`, async () => {
    const { deps, calls } = employeeHarness({
      employeeType,
      properties: { employee_id: "", ...override }
    });
    const result = await runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType },
      deps
    );
    assert.equal(result.status, "error");
    assert.match(lastWrite(calls).last_sync_error, new RegExp(`Missing required field: ${fieldName}`));
    assert.equal(lastWrite(calls).last_sync_error.includes("Alex"), false);
    assert.equal(lastWrite(calls).last_sync_error.includes("Rivera"), false);
    assert.equal(calls.upserts.length, 0);
    assert.equal(calls.lookups.length, 0);
  });
}

test("[GER-REQ] a filled employee first_name with a blank last_name names last_name", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "", first_name: "Alex", last_name: "   " }
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "error");
  assert.match(lastWrite(calls).last_sync_error, /Missing required field: last_name/);
  assert.equal(lastWrite(calls).last_sync_error.includes("Alex"), false);
  assert.equal(calls.upserts.length, 0);
});

test("[GER-REQ] a malformed employee email on create is an error and the reason has no value", async () => {
  const { deps, calls } = employeeHarness({
    employeeType: "bcba",
    properties: { employee_id: "", ucaba_email_address: "not-an-email" }
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bcba" }, deps);
  assert.equal(result.status, "error");
  assert.match(lastWrite(calls).last_sync_error, /ucaba_email_address/);
  assert.equal(lastWrite(calls).last_sync_error.includes("not-an-email"), false);
  assert.equal(calls.upserts.length, 0);
});

for (const [employeeType, fieldName] of [
  ["bt_rbt", "first_name"],
  ["bt_rbt", "last_name"],
  ["bcba", "first_name"],
  ["bcba", "last_name"]
]) {
  test(`[GER-REQ] employee update ${employeeType} errors when ${fieldName} is blank and does not call CentralReach`, async () => {
    const { deps, calls } = employeeHarness({
      employeeType,
      properties: { employee_id: "7001", [fieldName]: " " }
    });
    const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType }, deps);
    assert.equal(result.status, "error");
    assert.match(lastWrite(calls).last_sync_error, new RegExp(`Missing required field: ${fieldName}`));
    assert.equal(calls.upserts.length, 0);
    assert.equal(calls.crGets.length, 0);
  });
}

for (const [fieldName, override] of [
  ["phi_first_name__cloned_", { phi_first_name__cloned_: "  " }],
  ["phi_last_name", { phi_last_name: "" }],
  ["phi_date_of_birth", { phi_date_of_birth: "" }]
]) {
  test(`[GER-REQ] client create errors on a blank ${fieldName} and does not call CentralReach`, async () => {
    const { deps, calls } = clientHarness({ properties: { client_id_number: "", ...override } });
    const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
    assert.equal(result.status, "error");
    assert.match(lastWrite(calls).last_sync_error, new RegExp(`Missing required field: ${fieldName}`));
    assert.equal(lastWrite(calls).last_sync_error.includes("Alex"), false);
    assert.equal(lastWrite(calls).last_sync_error.includes("Rivera"), false);
    assert.equal(calls.upserts.length, 0);
  });
}

test("[GER-REQ] a filled client first name with a blank last name names phi_last_name", async () => {
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "", phi_first_name__cloned_: "Alex", phi_last_name: "   " }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "error");
  assert.match(lastWrite(calls).last_sync_error, /Missing required field: phi_last_name/);
  assert.equal(lastWrite(calls).last_sync_error.includes("Alex"), false);
  assert.equal(calls.upserts.length, 0);
});

for (const fieldName of ["phi_first_name__cloned_", "phi_last_name"]) {
  test(`[GER-REQ] client update errors when ${fieldName} is blank and does not call CentralReach`, async () => {
    const { deps, calls } = clientHarness({
      properties: { client_id_number: "2001", [fieldName]: "" }
    });
    const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
    assert.equal(result.status, "error");
    assert.match(lastWrite(calls).last_sync_error, new RegExp(`Missing required field: ${fieldName}`));
    assert.equal(calls.upserts.length, 0);
    assert.equal(calls.lookups.length, 0);
  });
}

test("[GER-REQ] employee names come from first_name and last_name", () => {
  const bt = buildEmployeePayload({
    employeeType: "bt_rbt",
    config: MAP_CONFIG,
    record: {
      id: "42",
      properties: {
        hs_object_id: "42",
        first_name: "Alex",
        last_name: "Rivera",
        bt_name: "Wrong Name",
        email: "alex@example.com",
        workday_id: "WD1",
        date_of_birth: "1990-10-20"
      }
    }
  });
  assert.equal(bt.employeePayload.firstName, "Alex");
  assert.equal(bt.employeePayload.lastName, "Rivera");
  const bcba = buildEmployeePayload({
    employeeType: "bcba",
    config: MAP_CONFIG,
    record: {
      id: "43",
      properties: {
        hs_object_id: "43",
        first_name: "Pat",
        last_name: "Morgan",
        bcba_name: "Wrong Name",
        ucaba_email_address: "pat@work.test",
        work_email: "old@work.test",
        workday_id: "WD2",
        date_of_birth: "1990-10-20"
      }
    }
  });
  assert.equal(bcba.employeePayload.firstName, "Pat");
  assert.equal(bcba.employeePayload.lastName, "Morgan");
  assert.equal(bcba.employeePayload.primaryEmail, "pat@work.test");
});

test("[GER-REQ] the shared date reader returns the date, blank, or unreadable", () => {
  assert.equal(typeof dates.readDate, "function");
  assert.equal(dates.readDate("1990-10-20"), "1990-10-20");
  assert.equal(dates.readDate("  "), "blank");
  assert.equal(dates.readDate("not-a-date"), "unreadable");
});

test("[GER-REQ] a blank employee date of birth on create sends the placeholder", async () => {
  const cr = scriptCentralReach({
    "POST /contacts/employee": () => ({ contactId: 70 })
  });
  const { deps } = employeeHarness({
    properties: { employee_id: "", date_of_birth: "", workday_id: "WD1" },
    createOrUpdateEmployee
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  const post = cr.calls.find((call) => call.method === "POST" && call.url.includes("/contacts/employee"));
  const body = JSON.parse(post.body);
  assert.equal(body.dateOfBirth, "2000-01-01");
  assert.equal(result.status, "success");
  assert.equal(cr.calls.some((call) => call.method === "PUT"), false);
});

test("[GER-REQ] a blank employee date of birth on update sends back the date CentralReach holds", async () => {
  // Row 3.13 (rule 5.7, API test of 2026-11-20): a date of birth that is left out of an update
  // is cleared in CentralReach, so the stored date is sent back. It was left out before.
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "7001", date_of_birth: "" },
    crEmployee: {
      contact: {
        contactId: "7001",
        externalSystemId: "WD1",
        primaryEmail: "stored@example.com",
        dateOfBirth: "1988-04-09T00:00:00"
      }
    }
  });
  await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bcba" }, deps);
  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.upserts[0].payload.dateOfBirth, "1988-04-09T00:00:00");
});

test("[GER-REQ] a blank employee date of birth on update is left out when the CentralReach read does not hold the key", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "7001", date_of_birth: "" }
  });
  await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bcba" }, deps);
  assert.equal(calls.upserts.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(calls.upserts[0].payload, "dateOfBirth"), false);
});

test("[GER-REQ] an unreadable employee date of birth is an error and is not sent as blank", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "", date_of_birth: "not-a-date" }
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "error");
  assert.match(lastWrite(calls).last_sync_error, /date_of_birth/);
  assert.equal(lastWrite(calls).last_sync_error.includes("not-a-date"), false);
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.lookups.length, 0);
});

test("[GER-REQ] a missing employee date_of_birth property is an error", async () => {
  const properties = {
    employee_id: "",
    first_name: "Alex",
    last_name: "Rivera",
    email: "alex@example.com",
    workday_id: "WD1"
  };
  const { deps, calls } = employeeHarness({ properties });
  delete deps.getBtRbtRecordById;
  const record = employeeRecord("bt_rbt", properties);
  delete record.properties.date_of_birth;
  deps.getBtRbtRecordById = async (id, type, propertyNames) => {
    calls.reads.push(propertyNames);
    return record;
  };
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "error");
  assert.match(lastWrite(calls).last_sync_error, /date_of_birth/);
  assert.equal(calls.upserts.length, 0);
});

test("[GER-REQ] a blank client date of birth on create is an error", async () => {
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "", phi_date_of_birth: "" }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "error");
  assert.match(lastWrite(calls).last_sync_error, /phi_date_of_birth/);
  assert.equal(calls.upserts.length, 0);
});

test("[GER-REQ] a blank client date of birth on update is left out of the request", async () => {
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "2001", phi_date_of_birth: "" }
  });
  await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(calls.upserts.length, 1);
  const payload = calls.upserts[0].payload || calls.upserts[0];
  assert.equal(Object.prototype.hasOwnProperty.call(payload, "DateOfBirth"), false);
});

test("[GER-REQ] an unreadable client date of birth is an error and is not treated as blank", async () => {
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "", phi_date_of_birth: "not-a-date" }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "error");
  assert.match(lastWrite(calls).last_sync_error, /phi_date_of_birth/);
  assert.equal(lastWrite(calls).last_sync_error.includes("not-a-date"), false);
  assert.equal(calls.upserts.length, 0);
});

for (const employeeType of ["bt_rbt", "bcba"]) {
  test(`[G17] a blank workday_id on a ${employeeType} create sends the HubSpot record ID`, () => {
    const payload = buildEmployeePayload({
      employeeType,
      config: MAP_CONFIG,
      record: {
        id: "4242",
        properties: {
          hs_object_id: "4242",
          workday_id: "  ",
          first_name: "Alex",
          last_name: "Rivera",
          email: "alex@example.com",
          ucaba_email_address: "pat@work.test",
          date_of_birth: "1990-10-20"
        }
      }
    }).employeePayload;
    assert.equal(payload.externalSystemId, "4242");
    assert.equal(validateEmployeePayload(payload, { linked: false }).isValid, true);
  });

  test(`[G17] a filled workday_id on a ${employeeType} create sends the Workday ID`, () => {
    const payload = buildEmployeePayload({
      employeeType,
      config: MAP_CONFIG,
      record: {
        id: "4242",
        properties: {
          hs_object_id: "4242",
          workday_id: " 7654321 ",
          first_name: "Alex",
          last_name: "Rivera",
          email: "alex@example.com",
          ucaba_email_address: "pat@work.test",
          date_of_birth: "1990-10-20"
        }
      }
    }).employeePayload;
    assert.equal(payload.externalSystemId, "7654321");
  });
}

test("[G17] employee lookup is a GET by External System ID and a 200 reads contact.contactId", async () => {
  assert.equal(typeof centralReach.findEmployeeByExternalSystemId, "function");
  const cr = scriptCentralReach({
    "GET /contacts/employee/byExternalSystemId?ExternalSystemId=WD1": () => ({
      contact: { contactId: 91, externalSystemId: "WD1" }
    })
  });
  const found = await centralReach.findEmployeeByExternalSystemId("WD1");
  assert.equal(found.found, true);
  assert.equal(found.crContactId, "91");
  assert.equal(cr.calls.some((call) => call.method === "PUT"), false);
});

test("[G17] employee lookup 404 is not found", async () => {
  scriptCentralReach({
    "GET /contacts/employee/byExternalSystemId?ExternalSystemId=missing": () => ({
      __httpError: httpError(404)
    })
  });
  const found = await centralReach.findEmployeeByExternalSystemId("missing");
  assert.deepEqual(found, { found: false, crContactId: null });
});

test("[G17] an unclear employee lookup is thrown and does not create", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "" },
    findEmployeeByExternalSystemId: async () => {
      throw httpError(500);
    }
  });
  await assert.rejects(
    runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps)
  );
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.writebacks.some((item) => item.employee_id), false);
});

test("[G17] an employee found by the HubSpot record ID is linked and not created again", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "", workday_id: "WD1" },
    findEmployeeByExternalSystemId: async (externalId) => {
      if (externalId === "HS1") {
        return { found: true, crContactId: "7055" };
      }
      return { found: false, crContactId: null };
    },
    crEmployee: { contact: { contactId: "7055", externalSystemId: "WD1", primaryEmail: "stored@example.com" } },
    createOrUpdateEmployee: async (input) => ({
      operation: "update",
      crContactId: input.existingContactId
    })
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(calls.upserts.some((item) => !item.existingContactId), false);
  assert.equal(calls.writebacks.some((item) => item.employee_id === "7055"), true);
  assert.equal(result.crContactId, "7055");
  assert.notEqual(result.status, "error");
});

test("[G17] an employee found by the record ID and the Workday ID under two CentralReach IDs is an error", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "" },
    findEmployeeByExternalSystemId: async (externalId) => {
      if (externalId === "HS1") return { found: true, crContactId: "7001" };
      if (externalId === "WD1") return { found: true, crContactId: "7002" };
      return { found: false, crContactId: null };
    }
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bcba" }, deps);
  assert.equal(result.status, "error");
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.writebacks.some((item) => item.employee_id), false);
});

test("[G17] an employee not found by either ID is created once", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "", workday_id: "WD9" },
    findEmployeeByExternalSystemId: async () => ({ found: false, crContactId: null }),
    createOrUpdateEmployee: async () => ({ operation: "create", crContactId: "7009" })
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(calls.lookups.includes("HS1"), true);
  assert.equal(calls.lookups.includes("WD9"), true);
  assert.equal(calls.upserts.length, 1);
  assert.equal(result.crContactId, "7009");
  assert.equal(result.status, "success");
});

test("[G17] a Workday ID found only in CentralReach, with no HubSpot holder, is waiting and writes nothing", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "", workday_id: "WD9" },
    findEmployeeByExternalSystemId: async (externalId) => {
      if (externalId === "WD9") return { found: true, crContactId: "7070" };
      return { found: false, crContactId: null };
    },
    findHubSpotRecordsByEmployeeId: async () => []
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "waiting");
  assert.match(lastWrite(calls).last_sync_error, /A CentralReach employee already holds this Workday ID/);
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.crGets.length, 0);
  assert.equal(calls.writebacks.some((item) => item.employee_id), false);
  assert.equal(calls.holderSearches.length, 1);
});

test("[G17] a Workday ID whose CentralReach employee is already on another HubSpot record is an error", async () => {
  const writesToFirstEmployee = [];
  const first = employeeHarness({
    properties: { hs_object_id: "HS-A", employee_id: "", workday_id: "SHARED" },
    findEmployeeByExternalSystemId: async () => ({ found: false, crContactId: null }),
    createOrUpdateEmployee: async () => ({ operation: "create", crContactId: "7099" })
  });
  await runEmployeeSyncWorkflow({ recordId: "HS-A", employeeType: "bt_rbt" }, first.deps);

  const second = employeeHarness({
    employeeType: "bcba",
    properties: { hs_object_id: "HS-B", employee_id: "", workday_id: "SHARED" },
    findEmployeeByExternalSystemId: async (externalId) => {
      if (externalId === "SHARED") return { found: true, crContactId: "7099" };
      return { found: false, crContactId: null };
    },
    findHubSpotRecordsByEmployeeId: async () => [{ id: "HS-A", objectType: "bt_rbt" }],
    createOrUpdateEmployee: async (input) => {
      writesToFirstEmployee.push(input);
      return { operation: "update", crContactId: "7099" };
    }
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS-B", employeeType: "bcba" }, second.deps);
  assert.equal(result.status, "error");
  assert.match(lastWrite(second.calls).last_sync_error, /Another HubSpot record is already linked/);
  assert.equal(writesToFirstEmployee.length, 0);
  assert.equal(second.calls.upserts.length, 0);
  assert.equal(second.calls.writebacks.some((item) => item.employee_id), false);
});

test("[G17] two runs with one Workday ID started together create one employee", async () => {
  let creates = 0;
  const held = new Set();
  const acquireLease = async ({ pk, id }) => {
    if (pk !== "create-lock:employee") {
      return true;
    }
    const key = `${pk}:${id}`;
    if (held.has(key)) {
      return false;
    }
    held.add(key);
    return true;
  };
  const runOne = (recordId) => {
    const { deps } = employeeHarness({
      properties: {
        hs_object_id: recordId,
        employee_id: "",
        workday_id: "SHARED",
        first_name: "Alex",
        last_name: "Rivera"
      },
      acquireLease,
      findEmployeeByExternalSystemId: async () => ({ found: false, crContactId: null }),
      createOrUpdateEmployee: async () => {
        creates += 1;
        return { operation: "create", crContactId: `CR-${recordId}` };
      }
    });
    return runEmployeeSyncWorkflow({ recordId, employeeType: "bt_rbt" }, deps);
  };
  const settled = await Promise.allSettled([runOne("HS-A"), runOne("HS-B")]);
  assert.equal(creates, 1);
  assert.equal(settled.filter((item) => item.status === "rejected").length, 1);
});

const IDENTITY_ROWS = [
  {
    name: "the same Workday ID",
    crExternalSystemId: "WD1",
    workday_id: "WD1",
    checklist: "",
    status: "success",
    reason: "",
    sendsUpdate: true
  },
  {
    name: "the temporary ID while the Workday ID is blank and the checklist is not ticked",
    crExternalSystemId: "HS1",
    workday_id: "",
    checklist: "",
    status: "waiting",
    reason: "Waiting for the Workday ID",
    sendsUpdate: true
  },
  {
    name: "the temporary ID while the Workday ID is filled and the checklist is not ticked",
    crExternalSystemId: "HS1",
    workday_id: "WD9",
    checklist: "",
    status: "waiting",
    reason: "Replace the temporary External System ID in CentralReach with the Workday ID, then tick the checklist.",
    sendsUpdate: true
  },
  {
    name: "the temporary ID while the checklist is ticked",
    crExternalSystemId: "HS1",
    workday_id: "WD9",
    checklist: CHECKLIST_VALUE,
    status: "error",
    reason: "Checklist is ticked but CentralReach still holds the temporary External System ID.",
    sendsUpdate: true
  },
  {
    name: "a ticked checklist while the Workday ID is blank and CentralReach holds another ID",
    crExternalSystemId: "OTHER",
    workday_id: "",
    checklist: CHECKLIST_VALUE,
    status: "error",
    reason: "Checklist is ticked but the Workday ID is blank in HubSpot.",
    sendsUpdate: true
  },
  {
    name: "a Workday ID that differs from the External System ID CentralReach holds",
    crExternalSystemId: "OTHER",
    workday_id: "WD1",
    checklist: CHECKLIST_VALUE,
    status: "error",
    reason: "Workday ID in HubSpot does not match the External System ID in CentralReach.",
    sendsUpdate: false
  },
  {
    name: "nothing in CentralReach while the Workday ID is blank and the checklist is not ticked",
    crExternalSystemId: "",
    workday_id: "",
    checklist: "",
    status: "success",
    reason: "",
    sendsUpdate: true
  }
];

for (const employeeType of ["bt_rbt", "bcba"]) {
  const checklistProperty = employeeType === "bcba" ? "bcba_in_cr_checklist" : "btrbt_in_cr_checklist";
  for (const row of IDENTITY_ROWS) {
    test(`[G17] linked ${employeeType} when CentralReach holds ${row.name}`, async () => {
      const { deps, calls } = employeeHarness({
        employeeType,
        properties: {
          employee_id: "7001",
          workday_id: row.workday_id,
          [checklistProperty]: row.checklist
        },
        crEmployee: {
          contact: {
            contactId: "7001",
            externalSystemId: row.crExternalSystemId,
            primaryEmail: "stored@example.com"
          }
        }
      });
      const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType }, deps);
      assert.equal(result.status, row.status);
      if (row.reason) {
        assert.equal(lastWrite(calls).last_sync_error, row.reason);
      }
      assert.equal(calls.upserts.length, row.sendsUpdate ? 1 : 0);
      if (!row.sendsUpdate) {
        assert.equal(calls.metadata.length, 0);
      }
      if (row.sendsUpdate && row.crExternalSystemId) {
        assert.equal(calls.upserts[0].payload.externalSystemId, row.crExternalSystemId);
      }
    });
  }

  test(`[G17] ticking the ${employeeType} checklist with no other change still updates the status`, async () => {
    const { deps, calls } = employeeHarness({
      employeeType,
      hash: "same-hash",
      properties: {
        employee_id: "7001",
        workday_id: "WD9",
        last_sync_hash: "same-hash",
        [checklistProperty]: CHECKLIST_VALUE
      },
      crEmployee: {
        contact: {
          contactId: "7001",
          externalSystemId: "HS1",
          primaryEmail: "stored@example.com"
        }
      }
    });
    const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType }, deps);
    assert.equal(result.status, "error");
    assert.equal(
      lastWrite(calls).last_sync_error,
      "Checklist is ticked but CentralReach still holds the temporary External System ID."
    );
    assert.notEqual(lastWrite(calls).last_sync_status, "noop");
  });
}

for (const [label, shape] of [
  ["top level", { primaryEmail: "stored@example.com" }],
  ["contact", { contact: { primaryEmail: "stored@example.com" } }],
  ["employee", { employee: { primaryEmail: "stored@example.com" } }],
  ["result", { result: { primaryEmail: "stored@example.com" } }]
]) {
  test(`[G17] a linked update sends the primary email CentralReach holds on the ${label}`, () => {
    const result = buildEmployeePayloadForContactId(
      { primaryEmail: "hubspot@example.com", externalSystemId: "WD1" },
      shape
    );
    assert.equal(result.payload.primaryEmail, "stored@example.com");
  });
}

test("[G17] client lookup is a GET by the Case record ID and a 200 reads contact.contactId", async () => {
  assert.equal(typeof centralReach.findClientByExternalSystemId, "function");
  const cr = scriptCentralReach({
    "GET /contacts/client/byExternalSystemId?ExternalSystemId=deal-1": () => ({
      contact: { contactId: 2001 }
    })
  });
  const found = await centralReach.findClientByExternalSystemId("deal-1");
  assert.equal(found.found, true);
  assert.equal(found.crContactId, "2001");
  assert.equal(cr.calls.some((call) => call.method === "PUT"), false);
});

test("[G17] a linked Case found under the same CentralReach ID is updated", async () => {
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "2001" },
    findClientByExternalSystemId: async () => ({ found: true, crContactId: "2001" })
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.deepEqual(calls.lookups, ["deal-1"]);
  assert.equal(calls.upserts.length, 1);
  assert.equal(result.status, "success");
});

test("[G17] a linked Case found under a different CentralReach ID is an error and writes nothing to CentralReach", async () => {
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "2001" },
    findClientByExternalSystemId: async () => ({ found: true, crContactId: "9999" })
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "error");
  assert.equal(calls.upserts.length, 0);
  assert.match(lastWrite(calls).last_sync_error, /client_id_number/);
  assert.equal(lastWrite(calls).last_sync_error.includes("9999"), false);
  assert.equal(lastWrite(calls).last_sync_error.includes("2001"), false);
});

test("[G17] a linked Case lookup 404 still updates", async () => {
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "2001" },
    findClientByExternalSystemId: async () => ({ found: false, crContactId: null })
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(calls.lookups.length, 1);
  assert.equal(calls.upserts.length, 1);
  assert.equal(result.status, "success");
});

test("[G17] an unclear linked Case lookup writes nothing to CentralReach", async () => {
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "2001" },
    findClientByExternalSystemId: async () => ({ found: true, crContactId: null })
  });
  // Stage 2 (decision 4): a 200 with no contact ID is a permanent error on the record, not a
  // thrown retry. It still writes nothing to CentralReach.
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "error");
  assert.equal(lastWrite(calls).last_sync_status, "error");
  assert.equal(calls.upserts.length, 0);
});

test("[G17] a Case run with nothing to send does not look up the client", async () => {
  // Stage 2 (row 2.4): "nothing to send" also needs the clean link record an earlier run saved.
  const first = clientHarness({ hash: "same-hash", properties: { client_id_number: "2001" } });
  await runClientSyncWorkflow({ dealId: "deal-1" }, first.deps);
  const { deps, calls } = clientHarness({
    hash: "same-hash",
    properties: { client_id_number: "2001", last_sync_hash: "same-hash" },
    prior: { data: lastLinkWrite(first.calls).data }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "noop");
  assert.equal(calls.lookups.length, 0);
  assert.equal(calls.upserts.length, 0);
});

test("[GBR] the label post holds the labels CentralReach already has plus the required ones", async () => {
  let held = [11];
  const cr = scriptCentralReach({
    "GET /contacts/50/labels": () => ({ labels: held.map((labelId) => ({ labelId })) }),
    "GET /contacts/labels": () => ({ labels: [{ labelId: 11 }, { labelId: 1082499 }] }),
    "POST /contacts/50/labels": () => {
      held = [11, 1082499];
      return {};
    }
  });
  await updateClientMetadata("50", {}, { labelIds: [1082499] });
  // One read before the POST and one read-back after it (row L.3).
  assert.equal(cr.count("GET /contacts/50/labels"), 2);
  const post = cr.calls.find((call) => call.method === "POST");
  const sent = JSON.parse(post.body);
  const ids = sent.labels.map((item) => Number(item.labelId));
  assert.equal(ids.includes(11), true);
  assert.equal(ids.includes(1082499), true);
});

test("[GBR] a failed label read posts nothing and fails the run", async () => {
  const cr = scriptCentralReach({
    "GET /contacts/50/labels": () => ({ __httpError: httpError(500) })
  });
  await assert.rejects(updateClientMetadata("50", {}, { labelIds: [1082499] }));
  assert.equal(cr.calls.some((call) => call.method === "POST"), false);
});

test("[GBR] an unreadable label answer posts nothing and fails the run", async () => {
  const cr = scriptCentralReach({
    "GET /contacts/50/labels": () => ({ message: "ok" })
  });
  await assert.rejects(updateClientMetadata("50", {}, { labelIds: [1082499] }));
  assert.equal(cr.calls.some((call) => call.method === "POST"), false);
});

test("[GBR] when every required label is already on the contact, nothing is posted", async () => {
  const cr = scriptCentralReach({
    "GET /contacts/50/labels": () => ({ labels: [{ labelId: 1082499 }, { labelId: 11 }] })
  });
  await updateClientMetadata("50", {}, { labelIds: [1082499] });
  assert.equal(cr.count("GET /contacts/50/labels"), 1);
  assert.equal(cr.calls.some((call) => call.method === "POST"), false);
});

test("[GBR] an empty required label set skips the label read and the post", async () => {
  const cr = scriptCentralReach({});
  await updateClientMetadata("50", {}, { labelIds: [] });
  assert.equal(cr.calls.length, 0);
});

// Stage 1 review fixes (2026-11-18), S1-R1 to S1-R6.

test("[GBR] a Case create with the real hash ends as success and is not stale", async () => {
  const { deps, calls } = clientHarness({
    realHash: true,
    createOrUpdateClient: async () => ({ operation: "create", crContactId: "2001" })
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "success");
  assert.equal(calls.upserts.length, 1);
  assert.equal(lastWrite(calls).last_sync_status, "success");
  assert.equal(
    Object.prototype.hasOwnProperty.call(calls.upserts[0].payload, "dateOfBirthStatus"),
    false
  );
});

test("[GBR] a linked Case with no change and the real hash ends as noop and is not stale", async () => {
  const first = clientHarness({ realHash: true, properties: { client_id_number: "2001" } });
  await runClientSyncWorkflow({ dealId: "deal-1" }, first.deps);
  const savedHash = lastWrite(first.calls).last_sync_hash;
  // Stage 2 (row 2.4): the second run reads the clean link record the first run saved.
  const second = clientHarness({
    realHash: true,
    properties: { client_id_number: "2001", last_sync_hash: savedHash },
    prior: { data: lastLinkWrite(first.calls).data }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, second.deps);
  assert.equal(result.status, "noop");
  assert.equal(second.calls.upserts.length, 0);
});

for (const employeeType of ["bt_rbt", "bcba"]) {
  const noIdInCentralReach = {
    contact: { contactId: "7001", externalSystemId: "", primaryEmail: "stored@example.com" }
  };

  test(`[G17] a linked ${employeeType} with no External System ID in CentralReach and a blank workday_id sends no ID`, async () => {
    const { deps, calls } = employeeHarness({
      employeeType,
      properties: { employee_id: "7001", workday_id: "" },
      crEmployee: noIdInCentralReach
    });
    const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType }, deps);
    assert.equal(result.status, "success");
    assert.equal(calls.upserts.length, 1);
    assert.equal(
      Object.prototype.hasOwnProperty.call(calls.upserts[0].payload, "externalSystemId"),
      false
    );
  });

  test(`[G17] a linked ${employeeType} with no External System ID in CentralReach sends a filled workday_id`, async () => {
    const { deps, calls } = employeeHarness({
      employeeType,
      properties: { employee_id: "7001", workday_id: "WD7" },
      crEmployee: noIdInCentralReach
    });
    const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType }, deps);
    assert.equal(result.status, "success");
    assert.equal(calls.upserts[0].payload.externalSystemId, "WD7");
  });

  test(`[G17] a linked ${employeeType} whose CentralReach ID is another value, with a blank workday_id and no tick, is success`, async () => {
    const { deps, calls } = employeeHarness({
      employeeType,
      properties: { employee_id: "7001", workday_id: "" },
      crEmployee: {
        contact: { contactId: "7001", externalSystemId: "OTHER", primaryEmail: "stored@example.com" }
      }
    });
    const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType }, deps);
    assert.equal(result.status, "success");
    assert.equal(calls.upserts[0].payload.externalSystemId, "OTHER");
  });
}

test("[GBR] an employee read with no contact ID and no primary email is a failed read", async () => {
  scriptCentralReach({ "GET /contacts/employee/5": () => ({}) });
  await assert.rejects(centralReach.getEmployeeByContactId("5"), (error) => {
    assert.equal(error.code, "CR_EMPLOYEE_READ_FAILED");
    return true;
  });
});

test("[GBR] an employee read that answers with another contact ID is a failed read", async () => {
  scriptCentralReach({
    "GET /contacts/employee/5": () => ({
      contact: { contactId: 999, primaryEmail: "stored@example.com" }
    })
  });
  await assert.rejects(centralReach.getEmployeeByContactId("5"), (error) => {
    assert.equal(error.code, "CR_EMPLOYEE_READ_FAILED");
    return true;
  });
});

test("[GBR] an employee read with its own contact ID is returned", async () => {
  scriptCentralReach({
    "GET /contacts/employee/5": () => ({
      contact: { contactId: 5, externalSystemId: "WD1", primaryEmail: "stored@example.com" }
    })
  });
  const employee = await centralReach.getEmployeeByContactId("5");
  assert.equal(employee.contact.externalSystemId, "WD1");
});

test("[GBR] a failed employee read sends nothing to CentralReach", async () => {
  const { deps, calls } = employeeHarness({ properties: { employee_id: "7001" } });
  deps.getEmployeeByContactId = async () => {
    const failed = new Error("CentralReach employee read could not be read");
    failed.code = "CR_EMPLOYEE_READ_FAILED";
    throw failed;
  };
  // Stage 2 (decision 4): an unreadable employee answer is a permanent error on the record, not
  // a thrown retry. It still sends nothing to CentralReach.
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "error");
  assert.equal(lastWrite(calls).last_sync_status, "error");
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.metadata.length, 0);
});

test("[GBR] an employee error decided on purpose keeps the CentralReach ID and the saved field hashes", async () => {
  const savedHashes = { "metadata.1": "abc" };
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "", last_name: "" },
    prior: { data: { crContactId: "7001", fieldHashes: savedHashes } }
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "error");
  // Stage 2 (row 2.1): the link record is not written, so the stored CR ID and hashes stay. The
  // failure goes to the attempt record, which may expire.
  assert.equal(lastLinkWrite(calls), undefined);
  const attempt = calls.stateWrites.at(-1);
  assert.equal(attempt.type, "fail");
  assert.equal(attempt.pk, "sync-attempt:employee");
  assert.equal(attempt.ttlSeconds, 60);
  assert.equal(calls.upserts.length, 0);
});

test("[GBR] the employee ID mismatch error keeps the saved field hashes", async () => {
  const savedHashes = { "metadata.1": "abc" };
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "7001", workday_id: "WD1" },
    prior: { data: { crContactId: "7001", fieldHashes: savedHashes } },
    crEmployee: {
      contact: { contactId: "7001", externalSystemId: "OTHER", primaryEmail: "stored@example.com" }
    }
  });
  const result = await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  assert.equal(result.status, "error");
  // Stage 2 (row 2.1): the link record is not written, so the stored CR ID and hashes stay.
  assert.equal(lastLinkWrite(calls), undefined);
  assert.equal(calls.stateWrites.at(-1).pk, "sync-attempt:employee");
  assert.equal(calls.upserts.length, 0);
});

test("[GBR] a client error decided on purpose keeps the CentralReach ID and the saved field hashes", async () => {
  const savedHashes = { "core.FirstName": "abc" };
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "", phi_last_name: "" },
    prior: { data: { crContactId: "2001", fieldHashes: savedHashes } }
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "error");
  // Stage 2 (row 2.1): the link record is not written, so the stored CR ID and hashes stay. The
  // failure goes to the attempt record, which may expire.
  assert.equal(lastLinkWrite(calls), undefined);
  const attempt = calls.stateWrites.at(-1);
  assert.equal(attempt.type, "fail");
  assert.equal(attempt.pk, "sync-attempt:client");
  assert.equal(attempt.ttlSeconds, 50);
  assert.equal(calls.upserts.length, 0);
});

test("[GBR] the Case ID mismatch error keeps the saved field hashes", async () => {
  const savedHashes = { "core.FirstName": "abc" };
  const { deps, calls } = clientHarness({
    properties: { client_id_number: "2001" },
    prior: { data: { crContactId: "2001", fieldHashes: savedHashes } },
    findClientByExternalSystemId: async () => ({ found: true, crContactId: "9999" })
  });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, deps);
  assert.equal(result.status, "error");
  // Stage 2 (row 2.1): the link record is not written, so the stored CR ID and hashes stay.
  assert.equal(lastLinkWrite(calls), undefined);
  assert.equal(calls.stateWrites.at(-1).pk, "sync-attempt:client");
  assert.equal(calls.upserts.length, 0);
});

test("[G17] the CentralReach ID of a new employee is saved before the create lease is released", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "", workday_id: "WD9" },
    createOrUpdateEmployee: async () => ({ operation: "create", crContactId: "7009" })
  });
  // Stage 2 (row 2.1): the CR ID is saved in the one link record (there is no pending_link
  // record any more), so this test marks the link write that carries the CR ID.
  const putState = deps.putState;
  deps.putState = async (input) => {
    await putState(input);
    if (input.type === "link" && input.data.crContactId === "7009") {
      calls.events.push("state:link-with-cr-id");
    }
  };
  await runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps);
  const released = calls.events.indexOf("release:create-lock:employee");
  const savedInCosmos = calls.events.indexOf("state:link-with-cr-id");
  const savedInHubSpot = calls.events.indexOf("writeback:employee_id");
  assert.notEqual(released, -1);
  assert.notEqual(savedInCosmos, -1);
  assert.notEqual(savedInHubSpot, -1);
  assert.equal(savedInCosmos < released, true);
  assert.equal(savedInHubSpot < released, true);
  assert.equal(
    calls.events.slice(0, released).filter((item) => item === "state:link-with-cr-id").length,
    1
  );
});

test("[G17] when the Cosmos save fails after a create, the CentralReach ID still reaches HubSpot", async () => {
  const { deps, calls } = employeeHarness({
    properties: { employee_id: "", workday_id: "WD9" },
    createOrUpdateEmployee: async () => ({ operation: "create", crContactId: "7009" })
  });
  // Stage 2 (row 2.1): the CR ID is saved in the one link record, so the failing write is the
  // first link write that carries the CR ID.
  let failedOnce = false;
  deps.putState = async (input) => {
    if (!failedOnce && input.type === "link" && input.data.crContactId) {
      failedOnce = true;
      throw new Error("Cosmos write failed");
    }
    calls.stateWrites.push(input);
  };
  await assert.rejects(runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, deps));
  assert.equal(calls.upserts.length, 1);
  // Stage 2 (decision 1): the failure is retried, so the CR ID reaches HubSpot with no status.
  assert.equal(lastWrite(calls).last_sync_status, undefined);
  assert.equal(lastWrite(calls).employee_id, "7009");
  assert.equal(lastLinkWrite(calls).data.crContactId, "7009");
  assert.equal(lastLinkWrite(calls).ttlSeconds, -1);
});

for (const [name, answer] of [
  ["an id that is not named labelId", { labels: [{ id: 11 }] }],
  ["a blank labelId", { labels: [{ labelId: null }] }],
  ["a labelId that is not a whole number", { labels: [{ labelId: "abc" }] }]
]) {
  test(`[GBR] a label answer with ${name} is a failed read and posts nothing`, async () => {
    const cr = scriptCentralReach({ "GET /contacts/50/labels": () => answer });
    await assert.rejects(updateClientMetadata("50", {}, { labelIds: [1082499] }));
    assert.equal(cr.calls.some((call) => call.method === "POST"), false);
  });
}

test("[GER-REQ] the date reader accepts only YYYY-MM-DD and ISO date-times", () => {
  assert.equal(dates.readDate("1990-10-20T00:00:00Z"), "1990-10-20");
  assert.equal(dates.readDate("1990-10-20T00:00:00.000Z"), "1990-10-20");
  for (const loose of ["5", "12", "01/02/2020", "March 3 2020", "2020-02-30", "1483315200000"]) {
    assert.equal(dates.readDate(loose), "unreadable", loose);
  }
});
