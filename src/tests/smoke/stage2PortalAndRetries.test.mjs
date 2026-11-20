// Stage 2, rows 2.6 to 2.11, their additions and decisions 1 to 6 and 9 (BUILD-PLAN.md section 8).
// Workflow tests run the real mapper, validator, hash, catch block, cosmosState.mjs (through one
// in-memory container) and centralReachClient.mjs (through a fake HTTP adapter). Only HubSpot is
// faked. No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HUBSPOT_PORTALS,
  getConfig,
  hubspotPortalSettings,
  resolveHubSpotPortal,
  validateConfig,
  validateIntakePollerConfig
} from "../../lib/config.mjs";
import { useStateContainer } from "../../lib/cosmosState.mjs";
import {
  FAILURE_KINDS,
  MAX_RETRIES,
  RETRY_DELAYS_SECONDS,
  classifyFailure,
  planRetry,
  retryAfterSeconds,
  withRetry
} from "../../lib/retry.mjs";
import {
  buildClientSyncMessage,
  buildEmployeeSyncMessage,
  buildRetryMessage
} from "../../lib/serviceBusClient.mjs";
import { describeUnreadableAnswer } from "../../lib/unreadableAnswer.mjs";
import {
  findClientByExternalSystemId,
  findEmployeeByExternalSystemId,
  getEmployeeByContactId,
  updateClientMetadata
} from "../../lib/centralReachClient.mjs";
import { computeHubSpotV2Signature, readWebhookSettings } from "../../lib/hubspotWebhook.mjs";
import { associationsForComparison } from "../../constants/staffingAssociations.mjs";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import { CENTRAL_REACH_CLIENT_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import {
  RETRIES_USED_UP,
  centralReachRejected,
  hubspotRejected,
  metadataWriteFailed,
  unreadableCentralReachAnswer
} from "../../constants/syncReasons.mjs";
import { hubspotWebhook } from "../../functions/hubspotWebhook.mjs";
import { processClientQueue } from "../../functions/processClientQueue.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import { portalSenders } from "../../workflows/intakePollerWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import {
  PRODUCTION_PORTAL,
  SANDBOX_PORTAL,
  btRecord,
  caseRecord,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  fakeCentralReach,
  httpError,
  memoryContainer,
  queueContext,
  timeoutError,
  workflowConfig
} from "./stage2Fakes.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const EMPLOYEE_LINK_PK = "sync:employee";
const CLIENT_LINK_PK = "sync:client";
const BT_LINK_ID = `${SANDBOX_PORTAL}:bt_rbt:HS1`;
const CASE_LINK_ID = `${SANDBOX_PORTAL}:deal-1`;
const EMPLOYEE_PUT = "PUT /contacts/employee/{id}";
const EMPLOYEE_POST = "POST /contacts/employee";
const EMPLOYEE_GET = "GET /contacts/employee/{id}";
const CLIENT_PUT = "PUT /contacts/client/{id}";
const CLIENT_POST = "POST /contacts/client";
const LABELS_GET = "GET /contacts/{id}/labels";
const METADATA_PUT = "PUT /contacts/{id}/metadata/{fieldId}";

const REQUIRED_ENV = {
  CR_CLIENT_ID: "id",
  CR_CLIENT_SECRET: "secret",
  CR_API_KEY: "key",
  HUBSPOT_PRIVATE_APP_TOKEN: "token",
  CR_BASE_URL: "https://cr.test",
  CR_TOKEN_URL: "https://token.test",
  HUBSPOT_BASE_URL: "https://hs.test",
  HUBSPOT_CR_CONTACT_ID_PROPERTY: "client_id_number",
  MAX_DEALS_PER_RUN: "100",
  MAX_BT_RBT_PER_RUN: "100",
  MAX_BCBA_PER_RUN: "100",
  DEDUPE_TTL_SECONDS: "86400",
  LEASE_TTL_SECONDS: "660",
  SUCCESS_TTL_SECONDS: "86400",
  FAIL_TTL_SECONDS: "3600",
  STATE_PROVIDER: "cosmos",
  COSMOS_ENDPOINT: "https://cosmos.test",
  COSMOS_KEY: "key",
  COSMOS_DATABASE_ID: "db",
  COSMOS_CONTAINER_ID: "container",
  STATE_TTL_ATTR: "ttl",
  SERVICE_BUS_CONNECTION_STRING: "sb",
  CLIENT_SYNC_QUEUE_NAME: "client-sync-queue",
  EMPLOYEE_SYNC_QUEUE_NAME: "employee-sync-queue",
  SYNC_RECORD_GATE_PROPERTY: "sandbox_test_field",
  HUBSPOT_PORTAL_ID: SANDBOX_PORTAL,
  HS_BCBA_OBJECT_TYPE_ID: undefined,
  HS_BT_RBT_OBJECT_TYPE_ID: undefined
};

function withEnv(values, run) {
  const previous = {};
  for (const [name, value] of Object.entries(values)) {
    previous[name] = process.env[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  try {
    return run();
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

function setup() {
  const container = memoryContainer();
  useStateContainer(container);
  const cr = fakeCentralReach();
  return { container, cr };
}

function linkedEmployee(cr, contactId = "CR1", externalSystemId = "WD1") {
  cr.employees.set(contactId, { contactId, externalSystemId, primaryEmail: "stored@example.com" });
}

function linkedClient(cr, contactId = "2001", externalSystemId = "deal-1") {
  cr.clients.set(contactId, { contactId, externalSystemId, primaryEmail: null });
}

function runBt(record, options = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt", lastAttempt: Boolean(options.lastAttempt) },
    employeeWorkflowDeps({ record, ...options })
  );
}

function runCase(record, options = {}) {
  return runClientSyncWorkflow(
    { dealId: "deal-1", lastAttempt: Boolean(options.lastAttempt) },
    clientWorkflowDeps({ record, ...options })
  );
}

function clientMessage(extra = {}) {
  return {
    dealId: "deal-1",
    workflow: "clientSync",
    source: "hubspotWorkflow",
    portalId: SANDBOX_PORTAL,
    enqueuedAt: "2026-11-18T00:00:00.000Z",
    ...extra
  };
}

function employeeMessage(extra = {}) {
  return {
    recordId: "HS1",
    employeeType: "bt_rbt",
    workflow: "employeeSync",
    source: "hubspotWorkflow",
    portalId: SANDBOX_PORTAL,
    enqueuedAt: "2026-11-18T00:00:00.000Z",
    ...extra
  };
}

const QUEUES = [
  { name: "client", handler: processClientQueue, message: clientMessage },
  { name: "employee", handler: processEmployeeQueue, message: employeeMessage }
];

// ---------------------------------------------------------------------------------------------
// Row 2.6: everything knows which portal it is for
// ---------------------------------------------------------------------------------------------

test("[2.6] HUBSPOT_PORTAL_ID is required for the worker and the poller", () => {
  withEnv({ ...REQUIRED_ENV, HUBSPOT_PORTAL_ID: undefined }, () => {
    assert.equal(validateConfig().missing.includes("HUBSPOT_PORTAL_ID"), true);
    assert.equal(validateIntakePollerConfig().missing.includes("HUBSPOT_PORTAL_ID"), true);
    assert.throws(() => getConfig(), /HUBSPOT_PORTAL_ID/);
  });
});

for (const portalId of ["50850427", "246184070", "1", "constructor"]) {
  test(`[2.6] portal ${portalId} is invalid configuration`, () => {
    withEnv({ ...REQUIRED_ENV, HUBSPOT_PORTAL_ID: portalId }, () => {
      const worker = validateConfig();
      assert.equal(worker.isValid, false);
      assert.equal(worker.invalid.includes("HUBSPOT_PORTAL_ID"), true);
      const poller = validateIntakePollerConfig();
      assert.equal(poller.isValid, false);
      assert.equal(poller.invalid.includes("HUBSPOT_PORTAL_ID"), true);
      assert.throws(() => getConfig(), /HUBSPOT_PORTAL_ID/);
      assert.throws(() => resolveHubSpotPortal(), /HUBSPOT_PORTAL_ID/);
      assert.throws(() => hubspotPortalSettings(portalId), /HUBSPOT_PORTAL_ID/);
    });
  });
}

for (const portalId of [SANDBOX_PORTAL, PRODUCTION_PORTAL]) {
  test(`[2.6] portal ${portalId} is valid and its object types come from the table`, () => {
    withEnv({ ...REQUIRED_ENV, HUBSPOT_PORTAL_ID: portalId }, () => {
      assert.equal(validateConfig().isValid, true);
      const config = getConfig();
      assert.equal(config.hubspot.hubspotPortalId, portalId);
      assert.equal(config.hubspot.bcbaObjectTypeId, HUBSPOT_PORTALS[portalId].bcbaObjectTypeId);
      assert.equal(config.hubspot.btRbtObjectTypeId, HUBSPOT_PORTALS[portalId].btRbtObjectTypeId);
    });
  });
}

test("[2.6] the portal table holds object types, excluded association types and staffing role IDs for both portals", () => {
  assert.deepEqual(Object.keys(HUBSPOT_PORTALS).sort(), [PRODUCTION_PORTAL, SANDBOX_PORTAL]);

  const sandbox = hubspotPortalSettings(SANDBOX_PORTAL);
  assert.equal(sandbox.portalId, SANDBOX_PORTAL);
  assert.equal(sandbox.bcbaObjectTypeId, "2-72890322");
  assert.equal(sandbox.btRbtObjectTypeId, "2-72890325");
  assert.deepEqual(sandbox.excludedStaffingAssociationTypeIds, [164, 187, 251, 249, 242, 218, 235]);
  assert.deepEqual(sandbox.staffingRoleAssociationTypeIds, {
    supervisingBcba: 247,
    initialAssessmentBcba: 223,
    reEvaluationBcba: 229,
    primaryBt1: 238,
    primaryBt2: 240
  });

  const production = hubspotPortalSettings(PRODUCTION_PORTAL);
  assert.equal(production.bcbaObjectTypeId, "2-48354212");
  assert.equal(production.btRbtObjectTypeId, "2-48354559");
  assert.deepEqual(production.excludedStaffingAssociationTypeIds, [20, 64, 153, 80, 74, 164, 286]);
  assert.deepEqual(production.staffingRoleAssociationTypeIds, {
    supervisingBcba: 82,
    initialAssessmentBcba: 86,
    reEvaluationBcba: 145,
    primaryBt1: 76,
    primaryBt2: 143
  });
});

for (const name of ["HS_BCBA_OBJECT_TYPE_ID", "HS_BT_RBT_OBJECT_TYPE_ID"]) {
  test(`[2.6] ${name} no longer overrides the table: a different value is invalid configuration`, () => {
    withEnv({ ...REQUIRED_ENV, [name]: "2-99999999" }, () => {
      const validation = validateConfig();
      assert.equal(validation.isValid, false);
      assert.equal(validation.invalid.includes(name), true);
      assert.equal(validateIntakePollerConfig().invalid.includes(name), true);
      assert.throws(() => getConfig(), new RegExp(name));
      assert.equal(readWebhookSettings(process.env).portalReady, false);
    });
  });
}

test("[2.6] an object type setting equal to the table value is accepted", () => {
  withEnv(
    { ...REQUIRED_ENV, HS_BCBA_OBJECT_TYPE_ID: "2-72890322", HS_BT_RBT_OBJECT_TYPE_ID: "2-72890325" },
    () => {
      assert.equal(validateConfig().isValid, true);
      assert.equal(getConfig().hubspot.bcbaObjectTypeId, "2-72890322");
    }
  );
});

test("[2.6] the portal table is read when a function runs, not when a module loads", () => {
  const sandbox = readWebhookSettings({ ...REQUIRED_ENV, HUBSPOT_PORTAL_ID: SANDBOX_PORTAL });
  const production = readWebhookSettings({ ...REQUIRED_ENV, HUBSPOT_PORTAL_ID: PRODUCTION_PORTAL });
  assert.equal(sandbox.portalId, SANDBOX_PORTAL);
  assert.equal(sandbox.bcbaObjectTypeId, "2-72890322");
  assert.equal(sandbox.btRbtObjectTypeId, "2-72890325");
  assert.equal(sandbox.portalReady, true);
  assert.equal(production.portalId, PRODUCTION_PORTAL);
  assert.equal(production.bcbaObjectTypeId, "2-48354212");
  assert.equal(production.btRbtObjectTypeId, "2-48354559");

  withEnv({ ...REQUIRED_ENV, HUBSPOT_PORTAL_ID: SANDBOX_PORTAL }, () => {
    assert.equal(getConfig().hubspot.btRbtObjectTypeId, "2-72890325");
  });
  withEnv({ ...REQUIRED_ENV, HUBSPOT_PORTAL_ID: PRODUCTION_PORTAL }, () => {
    assert.equal(getConfig().hubspot.btRbtObjectTypeId, "2-48354559");
  });
});

test("[2.6] excluded association IDs follow the portal", () => {
  // 187 is excluded only in the sandbox, 20 only in production.
  // Row P.2: the input rows have the shape listAssociations returns.
  const rows = [
    { toObjectId: "1", types: [{ typeId: 187, category: "HUBSPOT_DEFINED" }] },
    { toObjectId: "2", types: [{ typeId: 20, category: "HUBSPOT_DEFINED" }] }
  ];
  const sandbox = associationsForComparison(
    rows,
    hubspotPortalSettings(SANDBOX_PORTAL).excludedStaffingAssociationTypeIds
  );
  const production = associationsForComparison(
    rows,
    hubspotPortalSettings(PRODUCTION_PORTAL).excludedStaffingAssociationTypeIds
  );
  assert.deepEqual(sandbox, [{ toObjectId: "2", typeIds: [20] }]);
  assert.deepEqual(production, [{ toObjectId: "1", typeIds: [187] }]);
});

test("[2.6] the Case worker drops the excluded association types of its own portal", async () => {
  // Row P.2: the fake answers in the shape listAssociations returns.
  const associations = async () => [
    { toObjectId: "1", types: [{ typeId: 187, category: "HUBSPOT_DEFINED" }] },
    { toObjectId: "2", types: [{ typeId: 20, category: "HUBSPOT_DEFINED" }] }
  ];
  const relationshipHashes = async (portalId) => {
    const { container, cr } = setup();
    linkedClient(cr);
    const record = caseRecord({ client_id_number: "2001" });
    await runCase(record, { associations, config: workflowConfig({ portalId }) });
    return container.get(CLIENT_LINK_PK, `${portalId}:deal-1`).data.fieldHashes.relationships;
  };

  const sandbox = await relationshipHashes(SANDBOX_PORTAL);
  const production = await relationshipHashes(PRODUCTION_PORTAL);

  assert.equal(typeof sandbox, "string");
  assert.equal(typeof production, "string");
  assert.notEqual(sandbox, production);
});

test("[2.6] a worker with a portal that is not in the table makes no HubSpot or CentralReach call", async () => {
  const { cr } = setup();
  const employee = btRecord({ employee_id: "CR1" });
  const deal = caseRecord({ client_id_number: "2001" });
  const config = workflowConfig();
  config.hubspot.hubspotPortalId = "50850427";

  await assert.rejects(runBt(employee, { config }), /HUBSPOT_PORTAL_ID/);
  await assert.rejects(runCase(deal, { config }), /HUBSPOT_PORTAL_ID/);

  assert.equal(cr.calls.length, 0);
  assert.equal(employee.writes.length, 0);
  assert.equal(deal.writes.length, 0);
});

test("[2.6] queue messages carry the portal ID, and a message cannot be built without one", () => {
  const client = buildClientSyncMessage({ dealId: "9", portalId: SANDBOX_PORTAL });
  const employee = buildEmployeeSyncMessage({
    recordId: "7",
    employeeType: "bcba",
    portalId: PRODUCTION_PORTAL
  });
  assert.equal(client.body.portalId, SANDBOX_PORTAL);
  assert.equal(employee.body.portalId, PRODUCTION_PORTAL);
  assert.throws(() => buildClientSyncMessage({ dealId: "9" }), /portalId is required/);
  assert.throws(
    () => buildEmployeeSyncMessage({ recordId: "7", employeeType: "bcba" }),
    /portalId is required/
  );
});

function signedWebhookRequest(rawBody, settings) {
  const signature = computeHubSpotV2Signature({
    clientSecret: settings.clientSecret,
    method: "POST",
    uri: settings.webhookUri,
    rawBody
  });
  return {
    method: "POST",
    url: settings.webhookUri,
    headers: {
      get: (name) => {
        const key = String(name).toLowerCase();
        if (key === "x-hubspot-signature") {
          return signature;
        }
        return key === "x-hubspot-signature-version" ? "v2" : "";
      }
    }
  };
}

function webhookSettings(portalId) {
  return readWebhookSettings({
    ...REQUIRED_ENV,
    HUBSPOT_PORTAL_ID: portalId,
    HUBSPOT_WEBHOOK_CLIENT_SECRET: "secret-secret",
    HUBSPOT_WEBHOOK_URI: "https://example.test/hook",
    HUBSPOT_WEBHOOK_COALESCE_SECONDS: "0"
  });
}

test("[2.6] the webhook stamps its configured portal ID on Case and employee messages", async () => {
  const settings = webhookSettings(PRODUCTION_PORTAL);
  const sent = [];
  const send = async (message) => {
    sent.push(message);
  };
  // Decision 3: the webhook does not check a portal ID in the notice. The worker compares.
  for (const body of [
    { objectTypeId: "0-3", recordId: "11", portalId: SANDBOX_PORTAL },
    { objectTypeId: "2-48354212", recordId: "12" },
    { objectTypeId: "2-48354559", recordId: "13" }
  ]) {
    const rawBody = JSON.stringify(body);
    const response = await hubspotWebhook(signedWebhookRequest(rawBody, settings), {}, {
      settings,
      rawBody,
      sendClientSyncMessage: send,
      sendEmployeeSyncMessage: send
    });
    assert.equal(response.status, 202);
  }
  assert.equal(sent.length, 3);
  assert.equal(sent.every((message) => message.portalId === PRODUCTION_PORTAL), true);
  assert.deepEqual(sent.map((message) => message.employeeType), [undefined, "bcba", "bt_rbt"]);
});

test("[2.6] the webhook queues nothing when the portal configuration is invalid", async () => {
  const settings = webhookSettings("50850427");
  const sent = [];
  const rawBody = JSON.stringify({ objectTypeId: "0-3", recordId: "11" });
  const response = await hubspotWebhook(signedWebhookRequest(rawBody, settings), {}, {
    settings,
    rawBody,
    sendClientSyncMessage: async (message) => {
      sent.push(message);
    }
  });
  assert.equal(response.status, 503);
  assert.equal(sent.length, 0);
});

test("[2.6] the poller stamps the portal ID on every message it sends", async () => {
  const sent = [];
  const { sendClient, sendEmployee } = portalSenders(SANDBOX_PORTAL, {
    sendClient: async (message) => {
      sent.push(message);
    },
    sendEmployee: async (message) => {
      sent.push(message);
    }
  });

  await sendClient({ dealId: "1", source: "intakePoller", workflow: "clientSync" });
  await sendEmployee({ recordId: "2", employeeType: "bcba", source: "linkedRecheck" });

  assert.deepEqual(sent.map((message) => message.portalId), [SANDBOX_PORTAL, SANDBOX_PORTAL]);
  assert.equal(sent[0].dealId, "1");
  assert.equal(sent[1].source, "linkedRecheck");
});

test("[2.6] the poller sends only through the portal-stamping senders", () => {
  const source = readFileSync(path.join(ROOT, "src/workflows/intakePollerWorkflow.mjs"), "utf8");
  const body = source.slice(source.indexOf("export async function runIntakePollerWorkflow"));
  assert.equal(body.includes("portalSenders(config.hubspot.hubspotPortalId)"), true);
  assert.equal(/sendClientSyncMessage\(|sendEmployeeSyncMessage\(/.test(body), false);
});

for (const queue of QUEUES) {
  test(`[2.6] the ${queue.name} worker completes a message for the other portal without acting`, async () => {
    const { cr } = setup();
    const record = queue.name === "client" ? caseRecord({ client_id_number: "2001" }) : btRecord({ employee_id: "CR1" });
    let workflowRuns = 0;
    const scheduled = [];
    const runWorkflow = (input) => {
      workflowRuns += 1;
      return queue.name === "client"
        ? runClientSyncWorkflow(input, clientWorkflowDeps({ record }))
        : runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record }));
    };

    await queue.handler(queue.message({ portalId: PRODUCTION_PORTAL }), queueContext(), {
      runWorkflow,
      portalId: SANDBOX_PORTAL,
      scheduleRetry: async (message) => {
        scheduled.push(message);
      }
    });

    assert.equal(workflowRuns, 0);
    assert.equal(cr.calls.length, 0);
    assert.equal(record.writes.length, 0);
    assert.equal(scheduled.length, 0);
  });

  test(`[2.6] the ${queue.name} worker completes a message with no portal ID without acting (decision 2)`, async () => {
    let workflowRuns = 0;
    const message = queue.message();
    delete message.portalId;
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (text) => {
      warnings.push(String(text));
    };

    try {
      await queue.handler(message, queueContext(), {
        runWorkflow: async () => {
          workflowRuns += 1;
        },
        portalId: SANDBOX_PORTAL,
        scheduleRetry: async () => {
          throw new Error("must not schedule");
        }
      });
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(workflowRuns, 0);
    assert.equal(warnings.some((text) => text.includes("not for this portal")), true);
  });

  test(`[2.6] the ${queue.name} worker runs a message for its own portal`, async () => {
    const inputs = [];
    await queue.handler(queue.message(), queueContext(), {
      runWorkflow: async (input) => {
        inputs.push(input);
      },
      portalId: SANDBOX_PORTAL
    });
    assert.equal(inputs.length, 1);
    assert.equal(inputs[0].lastAttempt, false);
    assert.equal(inputs[0].source, "hubspotWorkflow");
  });
}

test("[2.6] Cosmos keys carry the portal ID: the link, the attempt record and both leases", async () => {
  const { container, cr } = setup();
  const employee = btRecord({ workday_id: "WD1" });
  const deal = caseRecord();

  await runBt(employee);
  await runCase(deal);

  assert.notEqual(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID), null);
  assert.notEqual(container.get("sync-attempt:employee", BT_LINK_ID), null);
  assert.notEqual(container.get(CLIENT_LINK_PK, CASE_LINK_ID), null);
  assert.notEqual(container.get("sync-attempt:client", CASE_LINK_ID), null);
  const leaseIds = container.log
    .filter((entry) => entry.operation === "create" && entry.doc.type === "lease")
    .map((entry) => `${entry.doc.pk}|${entry.doc.id}`);
  assert.deepEqual(leaseIds.sort(), [
    `create-lock:employee|${SANDBOX_PORTAL}:WD1`,
    `sync-lock:client|${SANDBOX_PORTAL}:deal-1`,
    `sync-lock:employee|${SANDBOX_PORTAL}:bt_rbt:HS1`
  ]);
  assert.equal(cr.count(EMPLOYEE_POST), 1);
});

test("[2.6] the HUBSPOT_PORTAL_ID_TEST override is gone: the Case link uses the portal it is given", () => {
  withEnv({ HUBSPOT_PORTAL_ID_TEST: "246184070" }, () => {
    const mapped = buildClientMetadata({
      deal: { properties: { hs_object_id: "777" } },
      portalId: SANDBOX_PORTAL
    });
    assert.equal(
      mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.HUBSPOT_LINK_TO_CASE_RECORD],
      `https://app.hubspot.com/contacts/${SANDBOX_PORTAL}/record/0-3/777`
    );
  });
});

test("[2.6] the Case worker gives its configured portal to the metadata mapper", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });

  process.env.HUBSPOT_PORTAL_ID_TEST = "246184070";
  try {
    await runCase(record, { config: workflowConfig({ portalId: PRODUCTION_PORTAL }) });
  } finally {
    delete process.env.HUBSPOT_PORTAL_ID_TEST;
  }

  const linkWrite = cr.calls.find(
    (call) =>
      call.name === METADATA_PUT &&
      call.url.endsWith(`/${CENTRAL_REACH_CLIENT_METADATA_FIELDS.HUBSPOT_LINK_TO_CASE_RECORD}`)
  );
  assert.equal(
    linkWrite.body.inputValue ?? linkWrite.body.textAreaValue,
    `https://app.hubspot.com/contacts/${PRODUCTION_PORTAL}/record/0-3/deal-1`
  );
});

// ---------------------------------------------------------------------------------------------
// Row 2.7: failures are sorted into three kinds
// ---------------------------------------------------------------------------------------------

function coded(code, extra = {}) {
  return Object.assign(new Error(String(code)), { code }, extra);
}

function hubspotError(status, headers = {}) {
  return Object.assign(httpError(status, { headers }), { provider: "hubspot" });
}

const TEMPORARY_FAILURES = [
  ["a CentralReach 408", httpError(408)],
  ["a CentralReach 429", httpError(429)],
  ["a CentralReach 500", httpError(500)],
  ["a CentralReach 503", httpError(503)],
  ["a CentralReach 401 (decision 6)", httpError(401)],
  ["a network timeout with no status", timeoutError()],
  ["an error with nothing recognisable", new Error("something else")],
  ["a busy lock", coded("SYNC_IN_PROGRESS")],
  ["a record that changed during the run", coded("SYNC_STALE")],
  ["a lookup answer that is not 200 or 404", coded("CR_LOOKUP_UNKNOWN")],
  ["a HubSpot read refused with 401 or 403 (decision 6)", coded("HUBSPOT_READ_FAILED")],
  ["a Cosmos 429", coded(429)],
  ["a Cosmos 503", coded(503)],
  [
    "a metadata write whose field failed with a temporary status",
    coded("METADATA_WRITE_FAILED", {
      failedFields: [
        { fieldId: 1, status: 400 },
        { fieldId: 2, status: 503 }
      ]
    })
  ],
  ...[401, 403, 423, 429, 477, 500, 502, 503, 504, 521, 522, 523, 524, 525, 526].map((status) => [
    `a HubSpot ${status} (decision 1)`,
    hubspotError(status)
  ])
];

const PERMANENT_FAILURES = [
  ["a missing External System ID", coded("CR_EXTERNAL_ID_REQUIRED")],
  ["a CentralReach 400", httpError(400)],
  ["a CentralReach 403", httpError(403)],
  ["a CentralReach 404", httpError(404)],
  ["a CentralReach 409", httpError(409)],
  ["a CentralReach 422", httpError(422)],
  ["an employee read in an unreadable shape (decision 4)", coded("CR_EMPLOYEE_READ_FAILED")],
  ["a label read in an unreadable shape (decision 4)", coded("CR_LABEL_READ_FAILED")],
  ["a lookup that answers 200 with no contact ID (decision 4)", coded("CR_LOOKUP_UNREADABLE")],
  [
    "a metadata write whose fields all failed with a permanent status",
    coded("METADATA_WRITE_FAILED", { failedFields: [{ fieldId: 1, status: 400 }] })
  ],
  ["a HubSpot 400 (decision 1)", hubspotError(400)],
  ["a HubSpot 404 (decision 1)", hubspotError(404)]
];

for (const [name, error] of TEMPORARY_FAILURES) {
  test(`[2.7] ${name} is temporary`, () => {
    assert.equal(classifyFailure(error), FAILURE_KINDS.TEMPORARY);
  });
}

for (const [name, error] of PERMANENT_FAILURES) {
  test(`[2.7] ${name} is permanent`, () => {
    assert.equal(classifyFailure(error), FAILURE_KINDS.PERMANENT);
  });
}

test("[2.7] a timeout or 5xx on the create call itself is an unknown create", () => {
  assert.equal(classifyFailure(coded("CR_CREATE_OUTCOME_UNKNOWN")), FAILURE_KINDS.UNKNOWN_CREATE);
  assert.equal(
    classifyFailure(Object.assign(httpError(503), { code: "CR_CREATE_OUTCOME_UNKNOWN" })),
    FAILURE_KINDS.UNKNOWN_CREATE
  );
});

test("[2.7] employee worker, temporary: the run is thrown for a retry and HubSpot keeps its last status", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "CR1", last_sync_status: "success", last_sync_error: "" });
  cr.fail(EMPLOYEE_PUT, timeoutError());

  await assert.rejects(runBt(record));

  assert.equal(record.writes.length, 0);
  assert.equal(record.properties.last_sync_status, "success");
});

test("[2.7] employee worker, permanent: a CentralReach 400 on an update is error with no retry", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "CR1" });
  cr.fail(EMPLOYEE_PUT, httpError(400, { data: { message: "Alex Rivera alex@example.com" } }));

  const result = await runBt(record);

  assert.equal(result.status, "error");
  assert.equal(cr.count(EMPLOYEE_PUT), 1);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, centralReachRejected(400));
  assert.equal(typeof record.properties.integration_last_write, "string");
  assert.equal(record.properties.updated_by_integration, true);
});

test("[2.7] employee worker, unknown create: thrown for a retry, HubSpot unchanged, the pending ID kept", async () => {
  const { container, cr } = setup();
  const record = btRecord({ workday_id: "WD1" });
  cr.fail(EMPLOYEE_POST, timeoutError());

  await assert.rejects(runBt(record), (error) => {
    assert.equal(classifyFailure(error), FAILURE_KINDS.UNKNOWN_CREATE);
    return true;
  });

  assert.equal(cr.count(EMPLOYEE_POST), 1);
  assert.equal(record.writes.length, 0);
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.pendingCreateExternalId, "WD1");
});

test("[2.7] Case worker, temporary: the run is thrown for a retry and HubSpot keeps its last status", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001", last_sync_status: "success" });
  cr.fail(CLIENT_PUT, timeoutError());

  await assert.rejects(runCase(record));

  assert.equal(record.writes.length, 0);
  assert.equal(record.properties.last_sync_status, "success");
});

test("[2.7] Case worker, permanent: a CentralReach 400 on an update is error with no retry", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  cr.fail(CLIENT_PUT, httpError(400, { data: { message: "Alex Rivera" } }));

  const result = await runCase(record);

  assert.equal(result.status, "error");
  assert.equal(cr.count(CLIENT_PUT), 1);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, centralReachRejected(400));
});

test("[2.7] Case worker, unknown create: a timed-out create is thrown for a retry and HubSpot is unchanged", async () => {
  const { cr } = setup();
  const record = caseRecord();
  cr.fail(CLIENT_POST, timeoutError(), { afterHandling: true });

  await assert.rejects(runCase(record), (error) => {
    assert.equal(classifyFailure(error), FAILURE_KINDS.UNKNOWN_CREATE);
    return true;
  });
  assert.equal(record.writes.length, 0);

  // The retry finds the client by the Case record ID and does not create a second one.
  const result = await runCase(record);
  assert.equal(result.status, "success");
  assert.equal(cr.count(CLIENT_POST), 1);
  assert.equal(cr.clients.size, 1);
});

test("[2.7] a metadata failure keeps its status code, so a 400 on every failed field is error with no retry", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  cr.fail(METADATA_PUT, httpError(400), { times: 50 });

  const summary = await updateClientMetadata("2001", { 126214: "x" }, { labelIds: [] });
  assert.equal(summary.failedCount, 1);
  assert.deepEqual(summary.failedFields, [
    { fieldId: 126214, operation: "error", status: 400, retryAfterSeconds: null }
  ]);

  const result = await runCase(record);
  assert.equal(result.status, "error");
  assert.equal(record.properties.last_sync_status, "error");
  assert.match(record.properties.last_sync_error, /^MetadataWriteFailed fields: [\d,]+$/);
  assert.equal(
    record.properties.last_sync_error,
    metadataWriteFailed(record.properties.last_sync_error.split(": ")[1].split(",").map(Number))
  );
});

test("[2.7] a lookup answer that is not 200 or 404 is temporary, whatever its status", async () => {
  const cr = fakeCentralReach();
  cr.fail("GET /contacts/employee/byExternalSystemId", httpError(400));
  await assert.rejects(findEmployeeByExternalSystemId("WD1"), (error) => {
    assert.equal(error.code, "CR_LOOKUP_UNKNOWN");
    assert.equal(classifyFailure(error), FAILURE_KINDS.TEMPORARY);
    return true;
  });
  cr.fail("GET /contacts/client/byExternalSystemId", httpError(403));
  await assert.rejects(findClientByExternalSystemId("deal-1"), (error) => {
    assert.equal(classifyFailure(error), FAILURE_KINDS.TEMPORARY);
    return true;
  });
});

// Decision 4: an answer in a shape the code cannot read.

test("[2.7 decision 4] the unreadable-answer log holds field names and types, never a value", () => {
  const described = describeUnreadableAnswer({
    call: "GET /contacts/{id}/labels",
    status: 200,
    expected: "a list of label IDs",
    expectedFields: ["labels", "labelIds", "results", "contact.contactId"],
    answer: {
      labels: [{ name: "Secret Label", id: 5 }, { name: "Other" }],
      note: "private text",
      count: 3,
      contact: { contactId: null }
    }
  });

  assert.deepEqual(described, {
    call: "GET /contacts/{id}/labels",
    httpStatus: 200,
    expected: "a list of label IDs",
    topLevelFields: ["labels", "note", "count", "contact"],
    expectedFieldTypes: {
      labels: "list",
      labelIds: "missing",
      results: "missing",
      "contact.contactId": "null"
    },
    listLength: 2,
    firstItemFields: ["name", "id"]
  });
  const text = JSON.stringify(described);
  assert.equal(text.includes("Secret Label"), false);
  assert.equal(text.includes("private text"), false);
});

test("[2.7 decision 4] an answer that is itself a list or a text is described by type only", () => {
  const list = describeUnreadableAnswer({
    call: "GET /contacts/{id}/labels",
    status: 200,
    expected: "a list of label IDs",
    expectedFields: ["labels"],
    answer: [{ labelName: "Secret" }]
  });
  assert.deepEqual(list.topLevelFields, []);
  assert.equal(list.listLength, 1);
  assert.deepEqual(list.firstItemFields, ["labelName"]);
  assert.deepEqual(list.expectedFieldTypes, { labels: "missing" });

  const text = describeUnreadableAnswer({
    call: "GET /contacts/employee/{id}",
    status: 200,
    expected: "the employee under contact",
    expectedFields: ["contact.contactId"],
    answer: "Alex Rivera"
  });
  assert.equal(JSON.stringify(text).includes("Alex"), false);
  assert.deepEqual(text.expectedFieldTypes, { "contact.contactId": "missing" });
});

test("[2.7 decision 4] the three readers throw a permanent error that carries the described shape", async () => {
  const cr = fakeCentralReach();
  linkedEmployee(cr);

  cr.answer(EMPLOYEE_GET, { employee: { name: "Alex Rivera" } });
  await assert.rejects(getEmployeeByContactId("CR1"), (error) => {
    assert.equal(error.code, "CR_EMPLOYEE_READ_FAILED");
    assert.equal(error.answerShape.call, "GET /contacts/employee/{id}");
    assert.equal(error.answerShape.httpStatus, 200);
    assert.deepEqual(error.answerShape.topLevelFields, ["employee"]);
    assert.equal(error.answerShape.expectedFieldTypes["contact.contactId"], "missing");
    assert.equal(
      error.syncReason,
      unreadableCentralReachAnswer("GET /contacts/employee/{id}", "contact.contactId")
    );
    assert.equal(JSON.stringify(error.answerShape).includes("Alex"), false);
    return true;
  });

  cr.answer(LABELS_GET, { labels: [{ name: "Secret Label" }] });
  await assert.rejects(updateClientMetadata("CR1", {}, { labelIds: [22] }), (error) => {
    assert.equal(error.code, "CR_LABEL_READ_FAILED");
    assert.equal(error.answerShape.call, "GET /contacts/{id}/labels");
    assert.equal(error.answerShape.expectedFieldTypes.labels, "list");
    assert.equal(error.answerShape.listLength, 1);
    assert.deepEqual(error.answerShape.firstItemFields, ["name"]);
    assert.equal(
      error.syncReason,
      unreadableCentralReachAnswer("GET /contacts/{id}/labels", "labels[].labelId")
    );
    assert.equal(JSON.stringify(error.answerShape).includes("Secret"), false);
    return true;
  });
  assert.equal(cr.count("POST /contacts/{id}/labels"), 0);

  cr.answer("GET /contacts/employee/byExternalSystemId", { contact: { name: "Alex Rivera" } });
  await assert.rejects(findEmployeeByExternalSystemId("WD1"), (error) => {
    assert.equal(error.code, "CR_LOOKUP_UNREADABLE");
    assert.equal(error.answerShape.call, "GET /contacts/employee/byExternalSystemId");
    assert.equal(error.answerShape.expectedFieldTypes["contact.contactId"], "missing");
    assert.equal(
      error.syncReason,
      unreadableCentralReachAnswer("GET /contacts/employee/byExternalSystemId", "contact.contactId")
    );
    assert.equal(classifyFailure(error), FAILURE_KINDS.PERMANENT);
    return true;
  });
});

test("[2.7 decision 4] an unreadable employee read is error on the record, no retry, no CentralReach write, and it is logged in detail", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "CR1" });
  const logs = [];
  cr.answer(EMPLOYEE_GET, { employee: { name: "Alex Rivera" } });

  const result = await runBt(record, { logs });

  assert.equal(result.status, "error");
  assert.equal(cr.writes().length, 0);
  assert.equal(
    record.properties.last_sync_error,
    unreadableCentralReachAnswer("GET /contacts/employee/{id}", "contact.contactId")
  );
  const detail = logs.find((entry) => entry.meta?.call === "GET /contacts/employee/{id}");
  assert.equal(detail.level, "error");
  assert.equal(detail.meta.httpStatus, 200);
  assert.deepEqual(detail.meta.topLevelFields, ["employee"]);
  assert.equal(detail.meta.expectedFieldTypes["contact.contactId"], "missing");
  assert.equal(JSON.stringify(logs).includes("Alex Rivera"), false);
});

test("[2.7 decision 4] an unreadable label read is error on the record, with no label post and no retry", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  const logs = [];
  cr.answer(LABELS_GET, { labels: [{ name: "Secret Label" }] });

  const result = await runCase(record, { logs });

  assert.equal(result.status, "error");
  assert.equal(cr.count("POST /contacts/{id}/labels"), 0);
  assert.equal(
    record.properties.last_sync_error,
    unreadableCentralReachAnswer("GET /contacts/{id}/labels", "labels[].labelId")
  );
  assert.equal(logs.some((entry) => entry.meta?.call === "GET /contacts/{id}/labels"), true);
  assert.equal(JSON.stringify(logs).includes("Secret Label"), false);
});

test("[2.7 decision 4] a Case lookup that answers 200 with no contact ID is error on the record, no retry, no CentralReach write", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  cr.answer("GET /contacts/client/byExternalSystemId", { contact: {} });

  const result = await runCase(record);

  assert.equal(result.status, "error");
  assert.equal(cr.writes().length, 0);
  assert.equal(
    record.properties.last_sync_error,
    unreadableCentralReachAnswer("GET /contacts/client/byExternalSystemId", "contact.contactId")
  );
});

test("[2.7 decision 4] an employee lookup that answers 200 with no contact ID never creates", async () => {
  const { cr } = setup();
  linkedEmployee(cr, "CR9", "HS1");
  const record = btRecord({ workday_id: "WD1" });
  cr.answer("GET /contacts/employee/byExternalSystemId", { contact: {} });

  const result = await runBt(record);

  assert.equal(result.status, "error");
  assert.equal(cr.count(EMPLOYEE_POST), 0);
  assert.equal(cr.writes().length, 0);
});

// ---------------------------------------------------------------------------------------------
// Row 2.8: retries at 1 minute, 5 minutes, 15 minutes, 1 hour and 4 hours
// ---------------------------------------------------------------------------------------------

test("[2.8] the retry delays are 1 minute, 5 minutes, 15 minutes, 1 hour and 4 hours", () => {
  assert.deepEqual(RETRY_DELAYS_SECONDS, [60, 300, 900, 3600, 14400]);
  assert.equal(MAX_RETRIES, 5);
  const failure = timeoutError();
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((attempt) => planRetry({ attempt, error: failure })),
    [
      { attempt: 1, delaySeconds: 60 },
      { attempt: 2, delaySeconds: 300 },
      { attempt: 3, delaySeconds: 900 },
      { attempt: 4, delaySeconds: 3600 },
      { attempt: 5, delaySeconds: 14400 }
    ]
  );
  assert.equal(planRetry({ attempt: 5, error: failure }), null);
});

test("[2.8] a retry message is scheduled for now plus the delay, with the attempt in the body", () => {
  const now = Date.parse("2026-11-18T10:00:00.000Z");
  const message = buildRetryMessage({
    body: clientMessage(),
    originalMessageId: "msg-1",
    attempt: 2,
    delaySeconds: 300,
    now
  });
  assert.equal(message.scheduledEnqueueTimeUtc.toISOString(), "2026-11-18T10:05:00.000Z");
  assert.equal(message.body.attempt, 2);
  assert.equal(message.messageId, "msg-1:retry-2");
});

for (const queue of QUEUES) {
  test(`[2.8] ${queue.name} queue: attempts and delays in order, each with its own message ID, then error once and no call on redelivery`, async () => {
    const lastAttemptFlags = [];
    const scheduled = [];
    const deps = {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async (input) => {
        lastAttemptFlags.push(input.lastAttempt);
        throw timeoutError();
      },
      scheduleRetry: async (message) => {
        scheduled.push(message);
      }
    };
    const startedAt = Date.now();

    // First delivery, then each scheduled retry as Service Bus would deliver it.
    await queue.handler(queue.message(), queueContext({ messageId: "msg-1" }), deps);
    for (let index = 0; index < 4; index += 1) {
      const next = scheduled[index];
      await queue.handler(next.body, queueContext({ messageId: next.messageId }), deps);
    }

    assert.deepEqual(scheduled.map((message) => message.body.attempt), [1, 2, 3, 4, 5]);
    assert.deepEqual(scheduled.map((message) => message.messageId), [
      "msg-1:retry-1",
      "msg-1:retry-2",
      "msg-1:retry-3",
      "msg-1:retry-4",
      "msg-1:retry-5"
    ]);
    assert.equal(new Set(scheduled.map((message) => message.messageId)).size, 5);
    const delays = scheduled.map((message) =>
      Math.round((message.scheduledEnqueueTimeUtc.getTime() - startedAt) / 60000)
    );
    assert.deepEqual(delays, [1, 5, 15, 60, 240]);
    // Addition (g): the retry body keeps source and the portal ID.
    for (const message of scheduled) {
      assert.equal(message.body.source, "hubspotWorkflow");
      assert.equal(message.body.portalId, SANDBOX_PORTAL);
      assert.equal(message.body.originalMessageId, "msg-1");
    }
    assert.deepEqual(lastAttemptFlags, [false, false, false, false, false]);

    // The fifth retry fails: the workflow is told it is the last attempt, and the message is thrown.
    const last = scheduled[4];
    await assert.rejects(
      queue.handler(last.body, queueContext({ messageId: last.messageId }), deps)
    );
    assert.deepEqual(lastAttemptFlags.at(-1), true);
    assert.equal(scheduled.length, 5);

    // Service Bus redelivers it: thrown at once, with no workflow run.
    const runsBefore = lastAttemptFlags.length;
    await assert.rejects(
      queue.handler(last.body, queueContext({ messageId: last.messageId, deliveryCount: 2 }), deps),
      /Retries used up/
    );
    assert.equal(lastAttemptFlags.length, runsBefore);
    assert.equal(scheduled.length, 5);
  });

  test(`[2.8d] ${queue.name} queue: if scheduling the retry fails the message is thrown, never completed`, async () => {
    await assert.rejects(
      queue.handler(queue.message(), queueContext(), {
        portalId: SANDBOX_PORTAL,
        runWorkflow: async () => {
          throw timeoutError();
        },
        scheduleRetry: async () => {
          throw new Error("Service Bus send failed");
        }
      }),
      /Service Bus send failed/
    );
  });

  test(`[2.8e] ${queue.name} queue: an invalid message always throws, with no workflow run and no retry`, async () => {
    let touched = 0;
    const deps = {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async () => {
        touched += 1;
      },
      scheduleRetry: async () => {
        touched += 1;
      }
    };
    const missingId = queue.message();
    delete missingId.dealId;
    delete missingId.recordId;

    await assert.rejects(queue.handler("{ bad-json", queueContext(), deps));
    await assert.rejects(queue.handler(missingId, queueContext(), deps));
    await assert.rejects(queue.handler(queue.message({ attempt: "many" }), queueContext(), deps));
    await assert.rejects(queue.handler(queue.message({ attempt: 6 }), queueContext(), deps));
    await assert.rejects(queue.handler(queue.message({ attempt: -1 }), queueContext(), deps));

    assert.equal(touched, 0);
  });

  test(`[2.8] ${queue.name} queue: a message whose workflow finishes is completed with no retry`, async () => {
    const scheduled = [];
    await queue.handler(queue.message(), queueContext(), {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async () => ({ ok: true, status: "error" }),
      scheduleRetry: async (message) => {
        scheduled.push(message);
      }
    });
    assert.equal(scheduled.length, 0);
  });
}

test("[2.8g] the Case queue still accepts every source a retried message can carry", async () => {
  for (const source of ["intakePoller", "hubspotWorkflow", "linkedRecheck", "clientSyncHttpTest"]) {
    const inputs = [];
    await processClientQueue(clientMessage({ source, attempt: 3, originalMessageId: "msg-1" }), queueContext(), {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async (input) => {
        inputs.push(input);
      }
    });
    assert.equal(inputs[0].source, source);
  }
});

test("[2.8a] while a temporary failure is being retried, HubSpot keeps its last status (decision 1)", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  linkedClient(cr);
  const employee = btRecord({ employee_id: "CR1", last_sync_status: "waiting", last_sync_error: "kept" });
  const deal = caseRecord({ client_id_number: "2001", last_sync_status: "success", last_sync_error: "" });
  cr.fail(EMPLOYEE_PUT, timeoutError());
  cr.fail(CLIENT_PUT, timeoutError());

  await assert.rejects(runBt(employee));
  await assert.rejects(runCase(deal));

  assert.equal(employee.writes.length, 0);
  assert.equal(employee.properties.last_sync_status, "waiting");
  assert.equal(employee.properties.last_sync_error, "kept");
  assert.equal(deal.writes.length, 0);
  assert.equal(deal.properties.last_sync_status, "success");
});

test("[2.8b] on the last attempt the employee worker writes error Retries used up once, then throws", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "CR1" });
  cr.fail(EMPLOYEE_PUT, timeoutError());

  await assert.rejects(runBt(record, { lastAttempt: true }));

  assert.equal(RETRIES_USED_UP, "Retries used up");
  assert.equal(record.writes.length, 1);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, RETRIES_USED_UP);
  assert.equal(typeof record.properties.integration_last_write, "string");
});

test("[2.8b] on the last attempt the Case worker writes error Retries used up once, then throws", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  cr.fail(CLIENT_PUT, timeoutError());

  await assert.rejects(runCase(record, { lastAttempt: true }));

  assert.equal(record.writes.length, 1);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error, RETRIES_USED_UP);
});

test("[2.8b] every kind of temporary failure ends as Retries used up, never as the raw message", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "CR1" });
  cr.fail(
    METADATA_PUT,
    httpError(429, { data: { message: "Alex Rivera" }, headers: { "retry-after": "600" } }),
    { times: 50 }
  );

  await assert.rejects(runBt(record, { lastAttempt: true }), (error) => error.code === "METADATA_WRITE_FAILED");

  assert.equal(record.properties.last_sync_error, RETRIES_USED_UP);
});

test("[2.8] through the queue: five retries of a real failing Case run write error once, and the redelivery calls nothing", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001", last_sync_status: "success" });
  cr.fail(CLIENT_PUT, timeoutError(), { times: 50 });
  const scheduled = [];
  const deps = {
    portalId: SANDBOX_PORTAL,
    runWorkflow: (input) => runClientSyncWorkflow(input, clientWorkflowDeps({ record })),
    scheduleRetry: async (message) => {
      scheduled.push(message);
    }
  };

  await processClientQueue(clientMessage(), queueContext({ messageId: "msg-1" }), deps);
  for (let index = 0; index < 4; index += 1) {
    await processClientQueue(scheduled[index].body, queueContext({ messageId: scheduled[index].messageId }), deps);
  }
  assert.equal(record.writes.length, 0);

  await assert.rejects(
    processClientQueue(scheduled[4].body, queueContext({ messageId: scheduled[4].messageId }), deps)
  );
  assert.equal(record.writes.length, 1);
  assert.equal(record.properties.last_sync_error, RETRIES_USED_UP);

  const crCallsBefore = cr.calls.length;
  await assert.rejects(
    processClientQueue(
      scheduled[4].body,
      queueContext({ messageId: scheduled[4].messageId, deliveryCount: 2 }),
      deps
    )
  );
  assert.equal(cr.calls.length, crCallsBefore);
  assert.equal(record.writes.length, 1);
});

test("[2.8c] a permanent error writes a fixed sentence, never the provider's message", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  linkedClient(cr);
  const employee = btRecord({ employee_id: "CR1" });
  const deal = caseRecord({ client_id_number: "2001" });
  const secret = httpError(422, { data: { message: "Alex Rivera 1990-10-20" } });
  secret.message = "Alex Rivera 1990-10-20 was rejected";
  cr.fail(EMPLOYEE_PUT, secret);
  cr.fail(CLIENT_PUT, secret);

  await runBt(employee);
  await runCase(deal);

  assert.equal(employee.properties.last_sync_error, "CentralReach rejected the request (422).");
  assert.equal(deal.properties.last_sync_error, centralReachRejected(422));
  assert.equal(hubspotRejected(404), "HubSpot rejected the request (404).");
  assert.equal(JSON.stringify(employee.writes).includes("Alex"), false);
  assert.equal(JSON.stringify(deal.writes).includes("Alex"), false);
});

// ---------------------------------------------------------------------------------------------
// Row 2.9: a busy record is rescheduled, not failed
// ---------------------------------------------------------------------------------------------

function gate() {
  let open;
  const opened = new Promise((resolve) => {
    open = resolve;
  });
  return { open, opened };
}

test("[2.9] two messages for one employee: the second is rescheduled at 1 minute and later runs as a no-op", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "CR1" });
  const scheduled = [];
  const results = [];
  const deps = {
    portalId: SANDBOX_PORTAL,
    runWorkflow: async (input) => {
      const result = await runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record }));
      results.push(result);
      return result;
    },
    scheduleRetry: async (message) => {
      scheduled.push(message);
    }
  };
  // The first run is held inside its CentralReach update while the second message arrives.
  const hold = gate();
  const reachedWrite = gate();
  cr.onRequest = (name) => {
    if (name === EMPLOYEE_PUT) {
      reachedWrite.open();
    }
  };
  cr.holdNext(EMPLOYEE_PUT, hold.opened);

  const first = processEmployeeQueue(employeeMessage(), queueContext({ messageId: "msg-1" }), deps);
  await reachedWrite.opened;
  const startedAt = Date.now();
  await processEmployeeQueue(employeeMessage(), queueContext({ messageId: "msg-2" }), deps);

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].body.attempt, 1);
  assert.equal(scheduled[0].messageId, "msg-2:retry-1");
  assert.equal(Math.round((scheduled[0].scheduledEnqueueTimeUtc.getTime() - startedAt) / 1000), 60);
  assert.equal(record.writes.length, 0);

  hold.open();
  await first;
  assert.equal(results[0].status, "success");
  const writesAfterFirst = cr.writes().length;

  await processEmployeeQueue(scheduled[0].body, queueContext({ messageId: scheduled[0].messageId }), deps);

  assert.equal(results.at(-1).status, "noop");
  assert.equal(cr.writes().length, writesAfterFirst);
  assert.equal(scheduled.length, 1);
});

test("[2.9] two messages for one Case: the second is rescheduled at 1 minute and later runs as a no-op", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  const scheduled = [];
  const results = [];
  const deps = {
    portalId: SANDBOX_PORTAL,
    runWorkflow: async (input) => {
      const result = await runClientSyncWorkflow(input, clientWorkflowDeps({ record }));
      results.push(result);
      return result;
    },
    scheduleRetry: async (message) => {
      scheduled.push(message);
    }
  };
  const hold = gate();
  const reachedWrite = gate();
  cr.onRequest = (name) => {
    if (name === CLIENT_PUT) {
      reachedWrite.open();
    }
  };
  cr.holdNext(CLIENT_PUT, hold.opened);

  const first = processClientQueue(clientMessage(), queueContext({ messageId: "msg-1" }), deps);
  await reachedWrite.opened;
  await processClientQueue(clientMessage(), queueContext({ messageId: "msg-2" }), deps);

  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].body.attempt, 1);
  assert.equal(record.writes.length, 0);

  hold.open();
  await first;
  assert.equal(results[0].status, "success");
  const writesAfterFirst = cr.writes().length;

  await processClientQueue(scheduled[0].body, queueContext({ messageId: scheduled[0].messageId }), deps);

  assert.equal(results.at(-1).status, "noop");
  assert.equal(cr.writes().length, writesAfterFirst);
});

test("[2.9] a record that changed during the run is rescheduled at 1 minute, not failed", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "CR1" });
  const scheduled = [];
  // A person edits the record while the integration is writing to CentralReach.
  cr.onRequest = (name) => {
    if (name === EMPLOYEE_PUT) {
      record.properties.first_name = "Edited";
    }
  };
  const startedAt = Date.now();

  await processEmployeeQueue(employeeMessage(), queueContext({ messageId: "msg-1" }), {
    portalId: SANDBOX_PORTAL,
    runWorkflow: (input) => runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record })),
    scheduleRetry: async (message) => {
      scheduled.push(message);
    }
  });

  assert.equal(scheduled.length, 1);
  assert.equal(Math.round((scheduled[0].scheduledEnqueueTimeUtc.getTime() - startedAt) / 1000), 60);
  assert.equal(record.writes.length, 0);
  // Not clean, so the rescheduled run writes the edited value instead of trusting a hash.
  assert.equal(container.get(EMPLOYEE_LINK_PK, BT_LINK_ID).data.clean, false);

  cr.onRequest = null;
  await processEmployeeQueue(scheduled[0].body, queueContext({ messageId: scheduled[0].messageId }), {
    portalId: SANDBOX_PORTAL,
    runWorkflow: (input) => runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record })),
    scheduleRetry: async (message) => {
      scheduled.push(message);
    }
  });
  assert.equal(scheduled.length, 1);
  assert.equal(cr.calls.filter((call) => call.name === EMPLOYEE_PUT).at(-1).body.firstName, "Edited");
  assert.equal(record.properties.last_sync_status, "success");
});

test("[2.9 decision 5] a busy record counts toward the five attempts: the last one is thrown for the dead-letter queue", async () => {
  const { container, cr } = setup();
  linkedEmployee(cr);
  linkedClient(cr);
  const employee = btRecord({ employee_id: "CR1" });
  const deal = caseRecord({ client_id_number: "2001" });
  // Another run holds both record leases.
  const held = { type: "lease", ttl: 660, expiresAt: new Date(Date.now() + 600000).toISOString() };
  await container.items.create({ ...held, pk: "sync-lock:employee", id: BT_LINK_ID });
  await container.items.create({ ...held, pk: "sync-lock:client", id: CASE_LINK_ID });

  assert.deepEqual(planRetry({ attempt: 4, error: coded("SYNC_IN_PROGRESS") }), {
    attempt: 5,
    delaySeconds: 14400
  });
  assert.equal(planRetry({ attempt: 5, error: coded("SYNC_IN_PROGRESS") }), null);
  assert.equal(planRetry({ attempt: 5, error: coded("SYNC_STALE") }), null);

  await assert.rejects(runBt(employee), (error) => error.code === "SYNC_IN_PROGRESS");
  assert.equal(employee.writes.length, 0);
  // Review S2-R3 (rule 5.1): a busy run has not read the record, so it cannot know whether the
  // gate lets it write. It writes nothing to HubSpot; the run that holds the lease writes the
  // status, and the dead-letter alert reports the message.
  await assert.rejects(runBt(employee, { lastAttempt: true }), (error) => error.code === "SYNC_IN_PROGRESS");
  assert.equal(employee.writes.length, 0);

  await assert.rejects(runCase(deal, { lastAttempt: true }), (error) => error.code === "SYNC_IN_PROGRESS");
  assert.equal(deal.writes.length, 0);
  assert.equal(cr.calls.length, 0);
  // The lease of the run that holds the record is still there.
  assert.notEqual(container.get("sync-lock:employee", BT_LINK_ID), null);
  assert.notEqual(container.get("sync-lock:client", CASE_LINK_ID), null);
});

// ---------------------------------------------------------------------------------------------
// Row 2.10: CentralReach's Retry-After is respected
// ---------------------------------------------------------------------------------------------

test("[2.10] Retry-After is read as seconds or as a date", () => {
  const now = Date.parse("2026-11-18T10:00:00.000Z");
  assert.equal(retryAfterSeconds(httpError(429, { headers: { "retry-after": "120" } }), now), 120);
  assert.equal(retryAfterSeconds(httpError(429, { headers: { "Retry-After": 7 } }), now), 7);
  assert.equal(
    retryAfterSeconds(
      httpError(429, { headers: { "retry-after": "Wed, 18 Nov 2026 10:30:00 GMT" } }),
      now
    ),
    1800
  );
  assert.equal(
    retryAfterSeconds(
      httpError(429, { headers: { "retry-after": "Wed, 18 Nov 2026 09:00:00 GMT" } }),
      now
    ),
    0
  );
  assert.equal(
    retryAfterSeconds(httpError(429, { headers: { get: (name) => (name === "retry-after" ? "30" : undefined) } }), now),
    30
  );
  assert.equal(retryAfterSeconds(httpError(429), now), null);
  assert.equal(retryAfterSeconds(httpError(429, { headers: { "retry-after": "soon" } }), now), null);
  assert.equal(retryAfterSeconds(timeoutError(), now), null);
});

test("[2.10] a 429 with a long Retry-After schedules at least that far out", () => {
  const long = httpError(429, { headers: { "retry-after": "7200" } });
  assert.deepEqual(planRetry({ attempt: 0, error: long }), { attempt: 1, delaySeconds: 7200 });
  assert.deepEqual(planRetry({ attempt: 2, error: long }), { attempt: 3, delaySeconds: 7200 });
  // The next step is already longer than Retry-After.
  assert.deepEqual(planRetry({ attempt: 4, error: long }), { attempt: 5, delaySeconds: 14400 });
  // A short Retry-After never shortens the step.
  const short = httpError(429, { headers: { "retry-after": "2" } });
  assert.deepEqual(planRetry({ attempt: 0, error: short }), { attempt: 1, delaySeconds: 60 });
  // HubSpot 477 carries Retry-After in seconds, up to 24 hours (decision 1).
  const hubspot = Object.assign(httpError(477, { headers: { "retry-after": "86400" } }), {
    provider: "hubspot"
  });
  assert.deepEqual(planRetry({ attempt: 0, error: hubspot }), { attempt: 1, delaySeconds: 86400 });
});

test("[2.10] a Retry-After longer than the in-process wait is thrown at once for the scheduler", async () => {
  let calls = 0;
  const startedAt = Date.now();
  await assert.rejects(
    withRetry(async () => {
      calls += 1;
      throw httpError(429, { headers: { "retry-after": "6" } });
    }),
    (error) => error.response.status === 429
  );
  assert.equal(calls, 1);
  assert.equal(Date.now() - startedAt < 1000, true);
});

test("[2.10] a Retry-After within the in-process wait is retried in-process", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    if (calls === 1) {
      throw httpError(429, { headers: { "retry-after": "0" } });
    }
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 2);
});

test("[2.10] through the Case queue: a CentralReach 429 with a long Retry-After schedules at least that far out", async () => {
  const { cr } = setup();
  linkedClient(cr);
  const record = caseRecord({ client_id_number: "2001" });
  cr.fail(CLIENT_PUT, httpError(429, { headers: { "retry-after": "1800" } }));
  const scheduled = [];
  const startedAt = Date.now();

  await processClientQueue(clientMessage(), queueContext(), {
    portalId: SANDBOX_PORTAL,
    runWorkflow: (input) => runClientSyncWorkflow(input, clientWorkflowDeps({ record })),
    scheduleRetry: async (message) => {
      scheduled.push(message);
    }
  });

  assert.equal(cr.count(CLIENT_PUT), 1);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].scheduledEnqueueTimeUtc.getTime() - startedAt >= 1800 * 1000, true);
  assert.equal(record.writes.length, 0);
});

test("[2.10] the per-field metadata results keep the status and Retry-After, and the retry waits that long", async () => {
  const { cr } = setup();
  linkedEmployee(cr);
  const record = btRecord({ employee_id: "CR1" });
  cr.fail(METADATA_PUT, httpError(429, { headers: { "retry-after": "900" } }), { times: 50 });

  const summary = await updateClientMetadata("CR1", { 126214: "x" }, { labelIds: [] });
  assert.deepEqual(summary.failedFields, [
    { fieldId: 126214, operation: "error", status: 429, retryAfterSeconds: 900 }
  ]);
  assert.equal(cr.count(METADATA_PUT), 1);

  const scheduled = [];
  const startedAt = Date.now();
  await processEmployeeQueue(employeeMessage(), queueContext(), {
    portalId: SANDBOX_PORTAL,
    runWorkflow: (input) => runEmployeeSyncWorkflow(input, employeeWorkflowDeps({ record })),
    scheduleRetry: async (message) => {
      scheduled.push(message);
    }
  });
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0].scheduledEnqueueTimeUtc.getTime() - startedAt >= 900 * 1000, true);
});

// ---------------------------------------------------------------------------------------------
// Row 2.11: Service Bus settings are stated on purpose
// ---------------------------------------------------------------------------------------------

test("[2.11] host.json parses and states the Service Bus settings and the function timeout", () => {
  const host = JSON.parse(readFileSync(path.join(ROOT, "host.json"), "utf8"));
  assert.equal(host.functionTimeout, "00:10:00");
  assert.equal(host.extensions.serviceBus.maxConcurrentCalls, 4);
  assert.equal(host.extensions.serviceBus.maxAutoLockRenewalDuration, "00:10:00");
  assert.equal(host.extensions.serviceBus.autoCompleteMessages, true);
  assert.equal(host.extensionBundle.id, "Microsoft.Azure.Functions.ExtensionBundle");
});
