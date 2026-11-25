// Stage 3, lane A: the webhook does no Cosmos work, and settings the code no longer reads are
// not required (BUILD-PLAN row 3.11). No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeHubSpotV2Signature, readWebhookSettings } from "../../lib/hubspotWebhook.mjs";
import { hubspotWebhook } from "../../functions/hubspotWebhook.mjs";
import axios from "axios";
import { processClientQueue } from "../../functions/processClientQueue.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import { intakePoller } from "../../functions/intakePoller.mjs";
import { intakePollerHttpTest } from "../../functions/intakePollerHttpTest.mjs";
import { connectivityTest } from "../../functions/connectivityTest.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { runContactFanOutWorkflow } from "../../workflows/contactFanOutWorkflow.mjs";
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
        create: ["sandbox_test_field"],
        update: ["sandbox_test_field"]
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
        assert.deepEqual(gateProperties(config.sync), { create: [CREATES], update: [UPDATES] });
      }
      assert.equal(getConfig().sync.includeTestRecords, false);
    });
  }
});

// Decision 77: the two path names next to the record gate (the sandbox needs the record gate with
// any path setting); "none" only with no path setting.
test("[BR4][3.12] the sandbox accepts any two gate names with the record gate, SYNC_RECORD_GATE_PROPERTY = none without a path setting, and INCLUDE_TEST_RECORDS = true", () => {
  withEnv(
    { ...GATE_ENV, SYNC_CREATE_GATE_PROPERTY: "box_a", SYNC_UPDATE_GATE_PROPERTY: "box_b" },
    () => {
      assert.equal(validateConfig().isValid, true);
      assert.equal(validateIntakePollerConfig().isValid, true);
      assert.deepEqual(gateProperties(getConfig().sync), {
        create: ["sandbox_test_field", "box_a"],
        update: ["sandbox_test_field", "box_b"]
      });
    }
  );
  withEnv({ ...GATE_ENV, SYNC_RECORD_GATE_PROPERTY: "none", INCLUDE_TEST_RECORDS: "true" }, () => {
    assert.equal(validateConfig().isValid, true);
    const config = getConfig();
    assert.equal(config.sync.includeTestRecords, true);
    assert.deepEqual(gateProperties(config.sync), { create: [], update: [] });
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

// Zeke 2026-11-25: SYNC_RECORD_GATE_PROPERTY next to the two path settings is enforced on both
// paths together with each path's own property. Every combination of the three settings, on both
// portals: what is missing, what is invalid, and the gate properties of each path when valid.
test("[BR4][3.12] every combination of the record gate and the two path settings, on the sandbox and in production", () => {
  const RECORD = "sandbox_test_field";
  const combos = [];
  for (const record of [undefined, RECORD]) {
    for (const creates of [undefined, CREATES]) {
      for (const updates of [undefined, UPDATES]) {
        combos.push({ record, creates, updates });
      }
    }
  }
  for (const portal of [SANDBOX_PORTAL, PRODUCTION_PORTAL]) {
    for (const { record, creates, updates } of combos) {
      const label = JSON.stringify({ portal, record, creates, updates });
      const bothPaths = Boolean(creates && updates);
      // Decision 77: only production may leave the record gate out, and only with both paths.
      const recordOptional = portal === PRODUCTION_PORTAL && bothPaths;
      const expectedMissing = !record && !recordOptional ? ["SYNC_RECORD_GATE_PROPERTY"] : [];
      // Production: each path setting must be its exact name, so a missing one is invalid.
      const expectedInvalid =
        portal === PRODUCTION_PORTAL
          ? [
              ...(creates ? [] : ["SYNC_CREATE_GATE_PROPERTY"]),
              ...(updates ? [] : ["SYNC_UPDATE_GATE_PROPERTY"])
            ]
          : [];
      withEnv(
        {
          ...GATE_ENV,
          HUBSPOT_PORTAL_ID: portal,
          SYNC_RECORD_GATE_PROPERTY: record,
          SYNC_CREATE_GATE_PROPERTY: creates,
          SYNC_UPDATE_GATE_PROPERTY: updates
        },
        () => {
          for (const validation of [validateConfig(), validateIntakePollerConfig()]) {
            assert.deepEqual(validation.missing, expectedMissing, label);
            assert.deepEqual(validation.invalid, expectedInvalid, label);
          }
          if (expectedMissing.length > 0 || expectedInvalid.length > 0) {
            assert.throws(() => getConfig(), /Configuration validation failed/, label);
            assert.throws(() => getIntakePollerConfig(), /Configuration validation failed/, label);
            return;
          }
          const expected = {
            create: [record, creates].filter(Boolean),
            update: [record, updates].filter(Boolean)
          };
          for (const config of [getConfig(), getIntakePollerConfig()]) {
            assert.deepEqual(gateProperties(config.sync), expected, label);
          }
        }
      );
    }
  }
});

test("[BR4][3.12] SYNC_RECORD_GATE_PROPERTY = none with the two path settings is refused on the sandbox (decision 77) and in production", () => {
  const env = { ...GATE_ENV, SYNC_CREATE_GATE_PROPERTY: CREATES, SYNC_UPDATE_GATE_PROPERTY: UPDATES, SYNC_RECORD_GATE_PROPERTY: "none" };
  assertRefused(env, "SYNC_RECORD_GATE_PROPERTY");
  assertRefused({ ...env, HUBSPOT_PORTAL_ID: PRODUCTION_PORTAL }, "SYNC_RECORD_GATE_PROPERTY");
});

// ---------------------------------------------------------------------------------------------
// Decision 77 (Zeke 2026-11-25, "Build the guard"): on the sandbox a path gate setting never runs
// without the record gate. A missing, blank or "none" SYNC_RECORD_GATE_PROPERTY next to one or
// both path settings is refused before any HubSpot or CentralReach call. Production unchanged.
// ---------------------------------------------------------------------------------------------

// Not set, blank, spaces, "none" in two cases. The first three are reported missing, "none" invalid.
const RECORD_GATE_REFUSED = [
  [undefined, "missing"],
  ["", "missing"],
  ["   ", "missing"],
  ["none", "invalid"],
  [" NONE ", "invalid"]
];
const SANDBOX_PATH_SETTINGS = [
  ["both path settings", { SYNC_CREATE_GATE_PROPERTY: CREATES, SYNC_UPDATE_GATE_PROPERTY: UPDATES }],
  ["the create path setting only", { SYNC_CREATE_GATE_PROPERTY: CREATES }],
  ["the update path setting only", { SYNC_UPDATE_GATE_PROPERTY: UPDATES }]
];

// The worker and the poller both refuse it, name SYNC_RECORD_GATE_PROPERTY and print no value.
function assertRecordGateRefused(env, kind, label) {
  withEnv(env, () => {
    for (const validation of [validateConfig(), validateIntakePollerConfig()]) {
      assert.equal(validation.isValid, false, label);
      assert.equal(validation[kind].includes("SYNC_RECORD_GATE_PROPERTY"), true, label);
    }
    for (const load of [getConfig, getIntakePollerConfig]) {
      let message = "";
      assert.throws(() => {
        try {
          load();
        } catch (error) {
          message = error.message;
          throw error;
        }
      }, label);
      const heading = kind === "missing" ? "Missing variables" : "Invalid variables";
      assert.match(message, new RegExp(`${heading}: .*SYNC_RECORD_GATE_PROPERTY`), label);
      assert.doesNotMatch(message, /none|sandbox_test_field|centralreach_/i, label);
    }
  });
}

test("[BR4][3.12] decision 77: on the sandbox, one or both path settings with SYNC_RECORD_GATE_PROPERTY not set, blank, spaces or none is refused and names the setting without its value", () => {
  for (const [paths, pathEnv] of SANDBOX_PATH_SETTINGS) {
    for (const [record, kind] of RECORD_GATE_REFUSED) {
      assertRecordGateRefused(
        { ...GATE_ENV, ...pathEnv, SYNC_RECORD_GATE_PROPERTY: record },
        kind,
        `${paths}, record gate ${JSON.stringify(record)}`
      );
    }
  }
});

test("[BR4][3.12] decision 77: on the sandbox, one or both path settings with the record gate set are accepted and gate on the record gate too", () => {
  for (const [paths, pathEnv] of SANDBOX_PATH_SETTINGS) {
    withEnv({ ...GATE_ENV, ...pathEnv, SYNC_RECORD_GATE_PROPERTY: " sandbox_test_field " }, () => {
      for (const validation of [validateConfig(), validateIntakePollerConfig()]) {
        assert.equal(validation.isValid, true, paths);
      }
      const expected = {
        create: ["sandbox_test_field", pathEnv.SYNC_CREATE_GATE_PROPERTY].filter(Boolean),
        update: ["sandbox_test_field", pathEnv.SYNC_UPDATE_GATE_PROPERTY].filter(Boolean)
      };
      for (const config of [getConfig(), getIntakePollerConfig()]) {
        assert.deepEqual(gateProperties(config.sync), expected, paths);
      }
    });
  }
});

test("[BR4][3.12] decision 77: on the sandbox with no path setting, the record gate alone is unchanged (set: gated; none: off; not set or blank: missing)", () => {
  withEnv(GATE_ENV, () => {
    assert.deepEqual(gateProperties(getConfig().sync), {
      create: ["sandbox_test_field"],
      update: ["sandbox_test_field"]
    });
  });
  for (const none of ["none", " NONE "]) {
    withEnv({ ...GATE_ENV, SYNC_RECORD_GATE_PROPERTY: none }, () => {
      for (const validation of [validateConfig(), validateIntakePollerConfig()]) {
        assert.equal(validation.isValid, true, none);
      }
      for (const config of [getConfig(), getIntakePollerConfig()]) {
        assert.deepEqual(gateProperties(config.sync), { create: [], update: [] }, none);
      }
    });
  }
  for (const blank of [undefined, "", "   "]) {
    withEnv({ ...GATE_ENV, SYNC_RECORD_GATE_PROPERTY: blank }, () => {
      for (const validation of [validateConfig(), validateIntakePollerConfig()]) {
        assert.deepEqual(validation.missing, ["SYNC_RECORD_GATE_PROPERTY"], JSON.stringify(blank));
        assert.deepEqual(validation.invalid, [], JSON.stringify(blank));
      }
    });
  }
});

// Production, the 8 combinations of record gate (not set / set) x create path x update path,
// plus "none": the outcomes from before decision 77, written out by hand.
test("[BR4][3.12] decision 77: production behaves exactly as before in every combination of the record gate and the two path settings", () => {
  const RECORD = "sandbox_test_field";
  const C = "SYNC_CREATE_GATE_PROPERTY";
  const U = "SYNC_UPDATE_GATE_PROPERTY";
  const R = "SYNC_RECORD_GATE_PROPERTY";
  // [record, creates, updates, expected missing, expected invalid, gates when valid]
  const table = [
    [undefined, undefined, undefined, [R], [C, U]],
    [undefined, CREATES, undefined, [R], [U]],
    [undefined, undefined, UPDATES, [R], [C]],
    [undefined, CREATES, UPDATES, [], [], { create: [CREATES], update: [UPDATES] }],
    [RECORD, undefined, undefined, [], [C, U]],
    [RECORD, CREATES, undefined, [], [U]],
    [RECORD, undefined, UPDATES, [], [C]],
    [RECORD, CREATES, UPDATES, [], [], { create: [RECORD, CREATES], update: [RECORD, UPDATES] }],
    ["none", CREATES, UPDATES, [], [R]],
    ["none", undefined, undefined, [], [C, U, R]]
  ];
  for (const [record, creates, updates, missing, invalid, gates] of table) {
    const label = JSON.stringify({ record, creates, updates });
    withEnv(
      { ...PRODUCTION_ENV, SYNC_RECORD_GATE_PROPERTY: record, [C]: creates, [U]: updates },
      () => {
        for (const validation of [validateConfig(), validateIntakePollerConfig()]) {
          assert.deepEqual(validation.missing, missing, label);
          assert.deepEqual(validation.invalid, invalid, label);
        }
        if (!gates) {
          assert.throws(() => getConfig(), /Configuration validation failed/, label);
          assert.throws(() => getIntakePollerConfig(), /Configuration validation failed/, label);
          return;
        }
        for (const config of [getConfig(), getIntakePollerConfig()]) {
          assert.deepEqual(gateProperties(config.sync), gates, label);
        }
      }
    );
  }
});

// A record gate named the same as a path property would be merged into that path's property by
// gateProperties, gating the path on that checkbox alone.
test("[BR4][3.12] decision 77: on the sandbox, a record gate that names a path property (any case) is refused without its value; a different name is accepted", () => {
  const pathEnvs = [
    { SYNC_CREATE_GATE_PROPERTY: "box_a", SYNC_UPDATE_GATE_PROPERTY: "box_b" },
    { SYNC_CREATE_GATE_PROPERTY: "box_a" },
    { SYNC_UPDATE_GATE_PROPERTY: "box_b" }
  ];
  for (const pathEnv of pathEnvs) {
    const sameNames = [
      ...Object.values(pathEnv),
      ...Object.values(pathEnv).map((name) => ` ${name.toUpperCase()} `),
      CREATES,
      UPDATES,
      "CentralReach_Creates_Only"
    ];
    for (const record of sameNames) {
      assertRecordGateRefused(
        { ...GATE_ENV, ...pathEnv, SYNC_RECORD_GATE_PROPERTY: record },
        "invalid",
        `${JSON.stringify(pathEnv)}, record gate ${JSON.stringify(record)}`
      );
    }
  }
  for (const record of [CREATES, UPDATES]) {
    assertRecordGateRefused(
      { ...GATE_ENV, SYNC_CREATE_GATE_PROPERTY: CREATES, SYNC_UPDATE_GATE_PROPERTY: UPDATES, SYNC_RECORD_GATE_PROPERTY: record },
      "invalid",
      `production names, record gate ${record}`
    );
  }
  withEnv(
    { ...GATE_ENV, SYNC_CREATE_GATE_PROPERTY: CREATES, SYNC_UPDATE_GATE_PROPERTY: UPDATES, SYNC_RECORD_GATE_PROPERTY: "box_c" },
    () => {
      assert.equal(validateConfig().isValid, true);
      assert.deepEqual(gateProperties(getConfig().sync), {
        create: ["box_c", CREATES],
        update: ["box_c", UPDATES]
      });
    }
  );
});

// The portal ID is trimmed before the production check, so a padded production ID gets production
// rules: the record gate may be left out, and INCLUDE_TEST_RECORDS = true is refused.
test("[BR4][3.12] a space-padded production HUBSPOT_PORTAL_ID gets the production gate rules", () => {
  const padded = { ...PRODUCTION_ENV, HUBSPOT_PORTAL_ID: ` ${PRODUCTION_PORTAL} ` };
  withEnv(padded, () => {
    for (const validation of [validateConfig(), validateIntakePollerConfig()]) {
      assert.deepEqual(validation.missing, []);
      assert.deepEqual(validation.invalid, []);
    }
    assert.deepEqual(gateProperties(getConfig().sync), { create: [CREATES], update: [UPDATES] });
  });
  assertRefused({ ...padded, INCLUDE_TEST_RECORDS: "true" }, "INCLUDE_TEST_RECORDS");
});

// ---------------------------------------------------------------------------------------------
// Decision 77, run level: with the guard tripped (sandbox, both path settings, record gate not
// set or "none"), every entry point stops before any HubSpot or CentralReach call. The real
// getConfig / getIntakePollerConfig run; every HubSpot, CentralReach, Cosmos and Service Bus
// dependency only counts its calls, and any axios request is counted too.
// ---------------------------------------------------------------------------------------------

const GUARD_TRIPPED_ENVS = [
  ["record gate not set", { ...GATE_ENV, SYNC_CREATE_GATE_PROPERTY: CREATES, SYNC_UPDATE_GATE_PROPERTY: UPDATES, SYNC_RECORD_GATE_PROPERTY: undefined }],
  ["record gate none", { ...GATE_ENV, SYNC_CREATE_GATE_PROPERTY: CREATES, SYNC_UPDATE_GATE_PROPERTY: UPDATES, SYNC_RECORD_GATE_PROPERTY: "none" }]
];

// The outside calls of the workers, the fan-out and the poller.
const OUTSIDE_CALLS = [
  "createHubSpotClient",
  "createCentralReachClient",
  "createStateClient",
  "createServiceBusClient",
  "ensureServiceBusClient",
  "getDealById",
  "getContactById",
  "getBtRbtRecordById",
  "getBcbaRecordById",
  "listAssociations",
  "readObjectsBatch",
  "updateDealProperties",
  "writeEmployeeWriteback",
  "findHubSpotRecordsByEmployeeId",
  "searchObjectPage",
  "createOrUpdateClient",
  "findClientByExternalSystemId",
  "updateClientMetadata",
  "createOrUpdateEmployee",
  "findEmployeeByExternalSystemId",
  "getEmployeeByContactId",
  "sendClientSyncMessage",
  "acquireLease",
  "releaseLease",
  "getState",
  "putState"
];

function countingDependencies(calls) {
  const dependencies = Object.fromEntries(
    OUTSIDE_CALLS.map((name) => [
      name,
      (...args) => {
        void args;
        calls.push(name);
        return undefined;
      }
    ])
  );
  return { ...dependencies, safeLog: () => {}, buildErrorLog: ({ stage }) => ({ stage }) };
}

// Sets the settings for an async run, and counts every axios request made meanwhile.
async function withGuardTripped(env, run) {
  const previous = {};
  for (const [name, value] of Object.entries(env)) {
    previous[name] = process.env[name];
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  const previousAdapter = axios.defaults.adapter;
  const httpCalls = [];
  axios.defaults.adapter = async (requestConfig) => {
    httpCalls.push(requestConfig.url);
    throw new Error("no HTTP call is expected");
  };
  try {
    await run();
  } finally {
    axios.defaults.adapter = previousAdapter;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
  return httpCalls;
}

// A queue run that fails is either thrown (dead-letter) or retried; both are a failed run.
async function queueOutcome(run) {
  const scheduled = [];
  let thrown = null;
  try {
    await run(async (message) => {
      scheduled.push(message);
    });
  } catch (error) {
    thrown = error;
  }
  return { failed: Boolean(thrown) || scheduled.length > 0, scheduled };
}

const QUEUE_RUNS = [
  [
    "Case worker",
    (calls) => (scheduleRetry) =>
      processClientQueue(
        { dealId: "deal-1", workflow: "clientSync", source: "hubspotWorkflow", portalId: SANDBOX_PORTAL },
        {},
        { runWorkflow: (input) => runClientSyncWorkflow(input, countingDependencies(calls)), scheduleRetry }
      )
  ],
  [
    "Contact fan-out on the Case queue",
    (calls) => (scheduleRetry) =>
      processClientQueue(
        { contactId: "c-1", workflow: "contactChange", source: "hubspotWorkflow", portalId: SANDBOX_PORTAL },
        {},
        { runContactFanOut: (input) => runContactFanOutWorkflow(input, countingDependencies(calls)), scheduleRetry }
      )
  ],
  [
    "BT/RBT worker",
    (calls) => (scheduleRetry) =>
      processEmployeeQueue(
        { recordId: "HS1", employeeType: "bt_rbt", workflow: "employeeSync", source: "hubspotWorkflow", portalId: SANDBOX_PORTAL },
        {},
        { runWorkflow: (input) => runEmployeeSyncWorkflow(input, countingDependencies(calls)), scheduleRetry }
      )
  ],
  [
    "BCBA worker",
    (calls) => (scheduleRetry) =>
      processEmployeeQueue(
        { recordId: "HS2", employeeType: "bcba", workflow: "employeeSync", source: "hubspotWorkflow", portalId: SANDBOX_PORTAL },
        {},
        { runWorkflow: (input) => runEmployeeSyncWorkflow(input, countingDependencies(calls)), scheduleRetry }
      )
  ]
];

for (const [label, env] of GUARD_TRIPPED_ENVS) {
  for (const [kind, makeRun] of QUEUE_RUNS) {
    test(`[BR4][3.12] decision 77: sandbox, two path settings, ${label}: the ${kind} fails the run with no HubSpot or CentralReach call`, async () => {
      const calls = [];
      let outcome;
      const httpCalls = await withGuardTripped(env, async () => {
        outcome = await queueOutcome(makeRun(calls));
      });
      assert.equal(outcome.failed, true);
      assert.deepEqual(calls, []);
      assert.deepEqual(httpCalls, []);
    });
  }

  test(`[BR4][3.12] decision 77: sandbox, two path settings, ${label}: the hourly poller fails the run with no HubSpot search and nothing queued`, async () => {
    const calls = [];
    const httpCalls = await withGuardTripped(env, async () => {
      await assert.rejects(
        intakePoller({}, {}, countingDependencies(calls)),
        /SYNC_RECORD_GATE_PROPERTY/
      );
    });
    assert.deepEqual(calls, []);
    assert.deepEqual(httpCalls, []);
  });

  test(`[BR4][3.12] decision 77: sandbox, two path settings, ${label}: the HTTP test functions refuse with no HubSpot or CentralReach call`, async () => {
    const httpCalls = await withGuardTripped(env, async () => {
      const poller = await intakePollerHttpTest({}, {});
      assert.equal(poller.status, 500);
      assert.equal(poller.jsonBody.error.code, "MISSING_REQUIRED_CONFIG");

      const connectivity = await connectivityTest({}, {});
      assert.equal(connectivity.jsonBody.ok, false);
      const named = [...connectivity.jsonBody.env.missingNames, ...connectivity.jsonBody.env.invalidNames];
      assert.deepEqual(named, ["SYNC_RECORD_GATE_PROPERTY"]);
      assert.deepEqual(connectivity.jsonBody.clients, {
        hubspot: false,
        centralReach: false,
        cosmos: false,
        serviceBus: false
      });
    });
    assert.deepEqual(httpCalls, []);
  });

  // The webhook reads no gate and makes no HubSpot or CentralReach call: it only queues the
  // record ID, and the worker that takes the message refuses it (the tests above).
  test(`[BR4][3.12] decision 77: sandbox, two path settings, ${label}: the webhook only queues the record ID, with no HubSpot or CentralReach call`, async () => {
    const sent = [];
    const httpCalls = await withGuardTripped(env, async () => {
      const settings = readWebhookSettings(process.env);
      const rawBody = JSON.stringify({ objectTypeId: "0-3", recordId: "12345" });
      const response = await hubspotWebhook(signedRequest(rawBody, settings), {}, {
        settings,
        rawBody,
        sendClientSyncMessage: async (message) => {
          sent.push(message);
        }
      });
      assert.equal(response.status, 202);
    });
    assert.deepEqual(sent.map((message) => message.dealId), ["12345"]);
    assert.deepEqual(httpCalls, []);
  });
}
