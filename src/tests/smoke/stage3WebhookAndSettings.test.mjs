// Stage 3, lane A: the webhook does no Cosmos work, and settings the code no longer reads are
// not required (BUILD-PLAN row 3.11). No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeHubSpotV2Signature, readWebhookSettings } from "../../lib/hubspotWebhook.mjs";
import { hubspotWebhook } from "../../functions/hubspotWebhook.mjs";
import { useStateContainer } from "../../lib/cosmosState.mjs";
import {
  getConfig,
  getIntakePollerConfig,
  validateConfig,
  validateIntakePollerConfig
} from "../../lib/config.mjs";
import { gateProperties } from "../../lib/syncEligibility.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SANDBOX_PORTAL = "52311591";
const URI = "https://www.example.com/webhook_uri";

// What the app needs after Stage 3. Every retired name is left out.
const ENV = {
  CR_CLIENT_ID: "id",
  CR_CLIENT_SECRET: "secret",
  CR_API_KEY: "key",
  CR_BASE_URL: "https://cr.invalid",
  CR_TOKEN_URL: "https://token.invalid",
  HUBSPOT_PRIVATE_APP_TOKEN: "token",
  HUBSPOT_BASE_URL: "https://hubspot.invalid",
  HUBSPOT_CR_CONTACT_ID_PROPERTY: "client_id_number",
  HUBSPOT_PORTAL_ID: SANDBOX_PORTAL,
  SYNC_RECORD_GATE_PROPERTY: "sandbox_test_field",
  LEASE_TTL_SECONDS: "660",
  SUCCESS_TTL_SECONDS: "86400",
  FAIL_TTL_SECONDS: "3600",
  COSMOS_ENDPOINT: "https://cosmos.invalid",
  COSMOS_KEY: "key",
  COSMOS_DATABASE_ID: "db",
  COSMOS_CONTAINER_ID: "container",
  SERVICE_BUS_CONNECTION_STRING: "sb",
  CLIENT_SYNC_QUEUE_NAME: "client-sync-queue",
  EMPLOYEE_SYNC_QUEUE_NAME: "employee-sync-queue",
  HUBSPOT_WEBHOOK_CLIENT_SECRET: "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
  HUBSPOT_WEBHOOK_URI: URI,
  HS_BCBA_OBJECT_TYPE_ID: undefined,
  HS_BT_RBT_OBJECT_TYPE_ID: undefined
};

// Settings no code reads after Stage 3.
const RETIRED = [
  "HUBSPOT_WEBHOOK_COALESCE_SECONDS",
  "LINKED_RECHECK_ENABLED",
  "LOOKBACK_MINUTES",
  "MAX_SEARCH_REQUESTS_PER_SECTION",
  "DEDUPE_TTL_SECONDS",
  "MAX_DEALS_PER_RUN",
  "MAX_BT_RBT_PER_RUN",
  "MAX_BCBA_PER_RUN",
  "STATE_PROVIDER",
  "STATE_TTL_ATTR"
];

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

const withoutRetired = () => Object.fromEntries(RETIRED.map((name) => [name, undefined]));

function signedRequest(rawBody, settings) {
  const signature = computeHubSpotV2Signature({
    clientSecret: settings.clientSecret,
    method: "POST",
    uri: URI,
    rawBody
  });
  return {
    method: "POST",
    url: URI,
    headers: {
      get: (name) =>
        ({ "x-hubspot-signature": signature, "x-hubspot-signature-version": "v2" })[
          String(name).toLowerCase()
        ] || ""
    }
  };
}

// A Cosmos container that counts every call made to it.
function countingContainer() {
  const calls = [];
  const record = (operation) => async () => {
    calls.push(operation);
    return { resource: null };
  };
  return {
    calls,
    items: { create: record("create"), upsert: record("upsert") },
    item: () => ({ read: record("read"), delete: record("delete"), replace: record("replace") })
  };
}

test("[BR5][3.11] a repeat notice for the same record is still queued, and the webhook makes no Cosmos call", async () => {
  // An environment that still carries the old coalesce setting and the Cosmos settings.
  const settings = readWebhookSettings({ ...ENV, HUBSPOT_WEBHOOK_COALESCE_SECONDS: "30" });
  const container = countingContainer();
  useStateContainer(container);
  const rawBody = JSON.stringify({ objectTypeId: "0-3", recordId: "12345" });
  const sent = [];
  let coalesceClaims = 0;
  const dependencies = {
    settings,
    rawBody,
    // The hook the old coalesce step called.
    claimCoalesce: async () => {
      coalesceClaims += 1;
      return false;
    },
    sendClientSyncMessage: async (message) => {
      sent.push(message);
    }
  };

  const first = await hubspotWebhook(signedRequest(rawBody, settings), {}, dependencies);
  const second = await hubspotWebhook(signedRequest(rawBody, settings), {}, dependencies);

  for (const response of [first, second]) {
    assert.equal(response.status, 202);
    assert.equal(response.jsonBody.accepted, true);
    assert.equal("coalesced" in response.jsonBody, false);
  }
  assert.deepEqual(sent.map((message) => message.dealId), ["12345", "12345"]);
  assert.deepEqual(sent.map((message) => message.portalId), [SANDBOX_PORTAL, SANDBOX_PORTAL]);
  assert.equal(coalesceClaims, 0);
  assert.deepEqual(container.calls, []);
  // The webhook function does not load the Cosmos module at all.
  const source = readFileSync(path.join(ROOT, "src/functions/hubspotWebhook.mjs"), "utf8");
  assert.equal(source.includes("cosmosState"), false);
});

test("[BR5][3.11] a repeat notice for an employee record is still queued", async () => {
  const settings = readWebhookSettings(ENV);
  const rawBody = JSON.stringify({ objectTypeId: settings.btRbtObjectTypeId, recordId: "77" });
  const sent = [];
  const dependencies = {
    settings,
    rawBody,
    sendEmployeeSyncMessage: async (message) => {
      sent.push(message);
    }
  };

  await hubspotWebhook(signedRequest(rawBody, settings), {}, dependencies);
  const response = await hubspotWebhook(signedRequest(rawBody, settings), {}, dependencies);

  assert.equal(response.status, 202);
  assert.deepEqual(
    sent.map((message) => [message.recordId, message.employeeType, message.source]),
    [
      ["77", "bt_rbt", "hubspotWorkflow"],
      ["77", "bt_rbt", "hubspotWorkflow"]
    ]
  );
});

test("[BR14][3.11] the webhook settings no longer carry a coalesce window or a Cosmos check", () => {
  const settings = readWebhookSettings({ ...ENV, HUBSPOT_WEBHOOK_COALESCE_SECONDS: "30" });
  assert.deepEqual(Object.keys(settings).sort(), [
    "bcbaObjectTypeId",
    "btRbtObjectTypeId",
    "clientSecret",
    "portalId",
    "portalReady",
    "secretReady",
    "serviceBusReady",
    "webhookUri"
  ]);
  // Cosmos settings that are missing no longer matter to the webhook.
  const noCosmos = readWebhookSettings({
    ...ENV,
    COSMOS_ENDPOINT: undefined,
    COSMOS_KEY: undefined,
    COSMOS_DATABASE_ID: undefined,
    COSMOS_CONTAINER_ID: undefined
  });
  assert.deepEqual(noCosmos, settings);
});

test("[BR14][3.11] the settings the code no longer reads are not required by the workers or the poller", () => {
  withEnv({ ...ENV, ...withoutRetired() }, () => {
    const worker = validateConfig();
    assert.deepEqual(worker.missing, []);
    assert.equal(worker.isValid, true);
    const poller = validateIntakePollerConfig();
    assert.deepEqual(poller.missing, []);
    assert.equal(poller.isValid, true);

    const workerConfig = getConfig();
    assert.equal("limits" in workerConfig, false);
    assert.deepEqual(Object.keys(workerConfig.ttl).sort(), [
      "failTtlSeconds",
      "leaseTtlSeconds",
      "successTtlSeconds"
    ]);
    assert.equal("provider" in workerConfig.state, false);

    const pollerConfig = getIntakePollerConfig();
    assert.deepEqual(Object.keys(pollerConfig).sort(), ["hubspot", "serviceBus", "state", "sync", "ttl"]);
    assert.deepEqual(pollerConfig.ttl, { leaseTtlSeconds: 660 });
    assert.equal(pollerConfig.hubspot.crContactIdProperty, "client_id_number");
    assert.equal(pollerConfig.hubspot.employeeIdProperty, "employee_id");
  });
});

test("[BR14][3.11] a setting the code still reads is still required", () => {
  for (const name of ["LEASE_TTL_SECONDS", "SUCCESS_TTL_SECONDS", "FAIL_TTL_SECONDS", "COSMOS_ENDPOINT", "SERVICE_BUS_CONNECTION_STRING"]) {
    withEnv({ ...ENV, [name]: undefined }, () => {
      assert.equal(validateConfig().missing.includes(name), true);
    });
  }
  for (const name of ["LEASE_TTL_SECONDS", "COSMOS_ENDPOINT", "SERVICE_BUS_CONNECTION_STRING", "HUBSPOT_PORTAL_ID"]) {
    withEnv({ ...ENV, [name]: undefined }, () => {
      assert.equal(validateIntakePollerConfig().missing.includes(name), true);
    });
  }
});

test("[BR14][3.11] the example settings file holds no retired setting and every setting the workers require", () => {
  const example = JSON.parse(readFileSync(path.join(ROOT, "local.settings.example.json"), "utf8"));
  for (const name of RETIRED) {
    assert.equal(name in example.Values, false, name);
  }
  // With the example's own names set, nothing is reported missing.
  const values = Object.fromEntries(
    Object.keys(example.Values).map((name) => [name, ENV[name] ?? example.Values[name]])
  );
  withEnv({ ...Object.fromEntries(Object.keys(ENV).map((name) => [name, undefined])), ...withoutRetired(), ...values }, () => {
    assert.deepEqual(validateConfig().missing, []);
    assert.deepEqual(validateIntakePollerConfig().missing, []);
  });
});

// ---------------------------------------------------------------------------------------------
// Items 14 and 24 (R-28, row 3.12): the production guard and the two path gate settings
// ---------------------------------------------------------------------------------------------

const PRODUCTION_PORTAL = "50317927";
const CREATES = "centralreach_creates_only";
const UPDATES = "centralreach_updates_only";
// Every gate setting named, so the test process's own environment cannot leak in.
const GATE_ENV = {
  ...ENV,
  SYNC_CREATE_GATE_PROPERTY: undefined,
  SYNC_UPDATE_GATE_PROPERTY: undefined,
  INCLUDE_TEST_RECORDS: undefined
};
const PRODUCTION_ENV = {
  ...GATE_ENV,
  HUBSPOT_PORTAL_ID: PRODUCTION_PORTAL,
  SYNC_RECORD_GATE_PROPERTY: undefined,
  SYNC_CREATE_GATE_PROPERTY: CREATES,
  SYNC_UPDATE_GATE_PROPERTY: UPDATES
};

// The worker and the poller both refuse the configuration and name the setting.
function assertRefused(env, name, label = JSON.stringify(env)) {
  withEnv(env, () => {
    assert.equal(validateConfig().invalid.includes(name), true, label);
    assert.equal(validateIntakePollerConfig().invalid.includes(name), true, label);
    assert.throws(() => getConfig(), new RegExp(`Invalid variables: .*${name}`), label);
    assert.throws(() => getIntakePollerConfig(), new RegExp(`Invalid variables: .*${name}`), label);
  });
}

test("[BR4][3.12] the sandbox with neither path setting reads sandbox_test_field on both paths", () => {
  withEnv(GATE_ENV, () => {
    for (const config of [getConfig(), getIntakePollerConfig()]) {
      assert.equal(config.sync.recordGateProperty, "sandbox_test_field");
      assert.equal(config.sync.createGateProperty, null);
      assert.equal(config.sync.updateGateProperty, null);
      assert.deepEqual(gateProperties(config.sync), {
        create: "sandbox_test_field",
        update: "sandbox_test_field"
      });
    }
  });
});

test("[BR4][3.12] a path gate setting of none is invalid configuration on both portals", () => {
  for (const base of [GATE_ENV, PRODUCTION_ENV]) {
    for (const name of ["SYNC_CREATE_GATE_PROPERTY", "SYNC_UPDATE_GATE_PROPERTY"]) {
      for (const none of ["none", " NONE ", " None "]) {
        assertRefused({ ...base, [name]: none }, name);
      }
    }
  }
});

test("[BR4][3.12] production refuses a missing, swapped, misspelt or other gate property name", () => {
  const cases = [
    [{ SYNC_CREATE_GATE_PROPERTY: undefined }, ["SYNC_CREATE_GATE_PROPERTY"]],
    [{ SYNC_UPDATE_GATE_PROPERTY: "" }, ["SYNC_UPDATE_GATE_PROPERTY"]],
    [
      { SYNC_CREATE_GATE_PROPERTY: UPDATES, SYNC_UPDATE_GATE_PROPERTY: CREATES },
      ["SYNC_CREATE_GATE_PROPERTY", "SYNC_UPDATE_GATE_PROPERTY"]
    ],
    [{ SYNC_CREATE_GATE_PROPERTY: "centralreach_create_only" }, ["SYNC_CREATE_GATE_PROPERTY"]],
    // Case-sensitive: the name is sent to HubSpot as written.
    [{ SYNC_CREATE_GATE_PROPERTY: "Centralreach_creates_only" }, ["SYNC_CREATE_GATE_PROPERTY"]],
    [{ SYNC_UPDATE_GATE_PROPERTY: "CentralReach_Updates_Only" }, ["SYNC_UPDATE_GATE_PROPERTY"]],
    [{ SYNC_CREATE_GATE_PROPERTY: "sandbox_test_field" }, ["SYNC_CREATE_GATE_PROPERTY"]],
    [{ SYNC_UPDATE_GATE_PROPERTY: "sync_to_centralreach" }, ["SYNC_UPDATE_GATE_PROPERTY"]]
  ];
  for (const [change, names] of cases) {
    for (const name of names) {
      assertRefused({ ...PRODUCTION_ENV, ...change }, name, JSON.stringify(change));
    }
  }
});

test("[BR4][3.12] production refuses SYNC_RECORD_GATE_PROPERTY = none and INCLUDE_TEST_RECORDS = true", () => {
  for (const none of ["none", " None "]) {
    assertRefused({ ...PRODUCTION_ENV, SYNC_RECORD_GATE_PROPERTY: none }, "SYNC_RECORD_GATE_PROPERTY");
  }
  for (const yes of ["true", " TRUE "]) {
    assertRefused({ ...PRODUCTION_ENV, INCLUDE_TEST_RECORDS: yes }, "INCLUDE_TEST_RECORDS");
  }
});

test("[BR4][3.12] production with the exact two names and no SYNC_RECORD_GATE_PROPERTY is valid", () => {
  // INCLUDE_TEST_RECORDS other than true (any case) is read as false at run time and not flagged.
  for (const extra of [
    {},
    { SYNC_CREATE_GATE_PROPERTY: ` ${CREATES} ` },
    { INCLUDE_TEST_RECORDS: "false" },
    { INCLUDE_TEST_RECORDS: "yes" },
    { INCLUDE_TEST_RECORDS: "1" }
  ]) {
    withEnv({ ...PRODUCTION_ENV, ...extra }, () => {
      for (const validation of [validateConfig(), validateIntakePollerConfig()]) {
        assert.equal(validation.isValid, true, JSON.stringify(extra));
        assert.deepEqual(validation.missing, []);
        assert.deepEqual(validation.invalid, []);
      }
      for (const config of [getConfig(), getIntakePollerConfig()]) {
        assert.deepEqual(config.sync.recordGateProperty, null);
        assert.deepEqual(gateProperties(config.sync), { create: CREATES, update: UPDATES });
      }
      assert.equal(getConfig().sync.includeTestRecords, false);
    });
  }
});

test("[BR4][3.12] the sandbox accepts any two gate names, SYNC_RECORD_GATE_PROPERTY = none and INCLUDE_TEST_RECORDS = true", () => {
  withEnv(
    { ...GATE_ENV, SYNC_CREATE_GATE_PROPERTY: "box_a", SYNC_UPDATE_GATE_PROPERTY: "box_b", SYNC_RECORD_GATE_PROPERTY: undefined },
    () => {
      assert.equal(validateConfig().isValid, true);
      assert.equal(validateIntakePollerConfig().isValid, true);
      assert.deepEqual(gateProperties(getConfig().sync), { create: "box_a", update: "box_b" });
    }
  );
  withEnv({ ...GATE_ENV, SYNC_RECORD_GATE_PROPERTY: "none", INCLUDE_TEST_RECORDS: "true" }, () => {
    assert.equal(validateConfig().isValid, true);
    const config = getConfig();
    assert.equal(config.sync.includeTestRecords, true);
    assert.deepEqual(gateProperties(config.sync), { create: null, update: null });
  });
});

test("[BR4][3.12] with one path setting not set, SYNC_RECORD_GATE_PROPERTY is still required", () => {
  for (const portal of [SANDBOX_PORTAL, PRODUCTION_PORTAL]) {
    withEnv(
      { ...GATE_ENV, HUBSPOT_PORTAL_ID: portal, SYNC_RECORD_GATE_PROPERTY: undefined, SYNC_CREATE_GATE_PROPERTY: CREATES },
      () => {
        assert.equal(validateConfig().missing.includes("SYNC_RECORD_GATE_PROPERTY"), true, portal);
        assert.equal(validateIntakePollerConfig().missing.includes("SYNC_RECORD_GATE_PROPERTY"), true, portal);
      }
    );
  }
});
