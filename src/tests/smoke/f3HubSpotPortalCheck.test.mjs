// Finding F-3 (WAVE-2-LOG.md section 8): at run time the HubSpot token must belong to the
// configured portal, HUBSPOT_PORTAL_ID. The check lives in src/lib/hubspotClient.mjs: every
// HubSpot call waits for one GET /account-info/v3/details per process. A match is kept for the
// life of the process; a mismatch or a failed details call is not kept.
// Requirement: section 9 has no portal or environment safety requirement of its own; BR20
// (sandbox first) is the closest, with hard stop 3 (production is read-only). The plan has no row
// for F-3, so the titles cite the finding.
// HubSpot is faked at the HTTP level (axios adapter); the HubSpot client, the workflows and the
// failure classifier are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  HUBSPOT_PORTAL_MISMATCH,
  createHubSpotClient,
  getObjectById,
  searchObjectPage,
  updateObjectProperties
} from "../../lib/hubspotClient.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { SYNC_RUN_SUMMARY_MESSAGE } from "../../lib/syncRunSummary.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { runContactFanOutWorkflow } from "../../workflows/contactFanOutWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  PRODUCTION_PORTAL,
  SANDBOX_PORTAL,
  employeeWorkflowDeps,
  httpError,
  workflowConfig
} from "./stage2Fakes.mjs";
import { counters, linkedBcba, setup } from "./stage3WorkerFakes.mjs";
import { setupPoller } from "./stage3PollerFakes.mjs";

const DETAILS = "/account-info/v3/details";

// A fake HubSpot at the HTTP level. `details` answers the portal check: a portal ID, or a function
// that throws or returns the portal ID. Every other request is a CRM call and is recorded.
function fakeHubSpot({ details = SANDBOX_PORTAL } = {}) {
  const fake = { detailsCalls: 0, crmCalls: [], details };
  fake.adapter = async (requestConfig) => {
    const url = String(requestConfig.url || "");
    const respond = (data) => ({ status: 200, statusText: "OK", headers: {}, config: requestConfig, data });
    if (url === DETAILS) {
      fake.detailsCalls += 1;
      const portalId = typeof fake.details === "function" ? fake.details(fake.detailsCalls) : fake.details;
      return respond(portalId === "" ? {} : { portalId: Number(portalId), accountType: "SANDBOX" });
    }
    fake.crmCalls.push(`${String(requestConfig.method).toUpperCase()} ${url}`);
    if (/\/associations\//.test(url)) {
      return respond({ results: [] });
    }
    if (/\/search$/.test(url)) {
      return respond({ results: [] });
    }
    return respond({ id: "1", properties: { test_record: null } });
  };
  return fake;
}

// A HubSpot config for one test. Each test uses its own token, so the process-wide check of one
// test is not reused by another.
function hubspotConfig(token, portalId = SANDBOX_PORTAL) {
  return {
    ...workflowConfig({ portalId }),
    hubspot: {
      ...workflowConfig({ portalId }).hubspot,
      baseUrl: "https://hubspot.invalid",
      privateAppToken: token
    }
  };
}

// The real HubSpot client is created by each run, from axios' defaults: the fake adapter goes
// there for the length of one test.
async function withAdapter(adapter, body) {
  const previous = axios.defaults.adapter;
  axios.defaults.adapter = adapter;
  try {
    return await body();
  } finally {
    axios.defaults.adapter = previous;
  }
}

function fanOut(config, logs) {
  return runContactFanOutWorkflow(
    { contactId: "701", source: "hubspotWorkflow", context: { invocationId: "inv-f3" }, attempt: 0 },
    {
      getConfig: () => config,
      ensureServiceBusClient: () => {},
      sendClientSyncMessage: async () => {},
      sendEmployeeSyncMessage: async () => {},
      safeLog: (level, message, meta) => logs.push({ level, message, meta })
    }
  );
}

const summaryLines = (logs) => logs.filter((entry) => entry.message === SYNC_RUN_SUMMARY_MESSAGE);

test("[BR20][F-3] a token for the configured portal passes: one details call across several runs", async () => {
  const hubspot = fakeHubSpot();
  const config = hubspotConfig("token-match");
  const logs = [];

  await withAdapter(hubspot.adapter, async () => {
    for (let run = 0; run < 3; run += 1) {
      const result = await fanOut(config, logs);
      assert.equal(result.status, "queued");
    }
    // A new client for the same settings (the next run of another workflow) is not checked again.
    createHubSpotClient(config);
    await getObjectById("0-1", "701", ["test_record"]);
  });

  assert.equal(hubspot.detailsCalls, 1);
  // Each fan-out run read the Contact and its Cases; then one more Contact read.
  assert.equal(hubspot.crmCalls.length, 3 * 2 + 1);
  assert.deepEqual(
    summaryLines(logs).map((entry) => entry.meta.outcome),
    ["success", "success", "success"]
  );
});

test("[BR20][F-3] a token for another portal stops before any CRM call: HUBSPOT_PORTAL_MISMATCH names both portals, the run summary says error, and the mismatch is not kept", async () => {
  const hubspot = fakeHubSpot({ details: PRODUCTION_PORTAL });
  const config = hubspotConfig("token-mismatch");
  const logs = [];

  await withAdapter(hubspot.adapter, async () => {
    for (let run = 0; run < 2; run += 1) {
      await assert.rejects(fanOut(config, logs), (error) => {
        assert.equal(error.code, HUBSPOT_PORTAL_MISMATCH);
        assert.equal(error.message.includes(SANDBOX_PORTAL), true);
        assert.equal(error.message.includes(PRODUCTION_PORTAL), true);
        assert.equal(error.configuredPortalId, SANDBOX_PORTAL);
        assert.equal(error.tokenPortalId, PRODUCTION_PORTAL);
        // Sorted like the other configuration failures: retried on the schedule, then
        // dead-lettered so the alert fires. Never permanent, so no `error` writeback is tried.
        assert.equal(classifyFailure(error), FAILURE_KINDS.TEMPORARY);
        return true;
      });
    }
    // A write is refused the same way.
    await assert.rejects(updateObjectProperties("0-1", "701", { firstname: "x" }), {
      code: HUBSPOT_PORTAL_MISMATCH
    });
  });

  assert.deepEqual(hubspot.crmCalls, []);
  // Not kept: each attempt checks again.
  assert.equal(hubspot.detailsCalls, 3);
  const lines = summaryLines(logs);
  assert.equal(lines.length, 2);
  for (const { meta } of lines) {
    assert.equal(meta.outcome, "error");
    assert.equal(meta.reasonCode, HUBSPOT_PORTAL_MISMATCH);
    assert.equal(meta.portalId, SANDBOX_PORTAL);
  }
});

test("[BR20][F-3] an employee run with a token for another portal reads and writes nothing in HubSpot or CentralReach", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, { email: "pat.personal@example.com" });
  const hubspot = fakeHubSpot({ details: PRODUCTION_PORTAL });
  const logs = [];
  const count = counters({ container, cr, record });
  const start = count.mark();
  const fakes = employeeWorkflowDeps({ record, logs, config: hubspotConfig("token-employee") });

  await withAdapter(hubspot.adapter, () =>
    assert.rejects(
      runEmployeeSyncWorkflow(
        { recordId: "HS2", employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA, lastAttempt: true },
        {
          ...fakes,
          // The real HubSpot client and record read; everything else stays faked.
          createHubSpotClient,
          getBcbaRecordById: undefined
        }
      ),
      { code: HUBSPOT_PORTAL_MISMATCH }
    )
  );
  const done = count.since(start);

  assert.equal(hubspot.detailsCalls, 1);
  assert.deepEqual(hubspot.crmCalls, []);
  assert.deepEqual(done.crCalls, []);
  // Even on the last attempt nothing is written to the record: the gate was never passed.
  assert.deepEqual(done.hubspotWrites, []);
  const [line] = summaryLines(logs);
  assert.equal(line.meta.outcome, "error");
  assert.equal(line.meta.reasonCode, HUBSPOT_PORTAL_MISMATCH);
});

test("[BR20][F-3] the hourly poller and daily sweep with a token for another portal search nothing and move no checkpoint", async () => {
  const poller = setupPoller();
  poller.setNow("2026-11-20T08:05:00.000Z");
  const hubspot = fakeHubSpot({ details: PRODUCTION_PORTAL });
  // The poller test helpers keep the module's client; this one replaces it.
  const client = createHubSpotClient(hubspotConfig("token-poller"));
  client.defaults.adapter = hubspot.adapter;

  const summary = await poller.run();

  assert.deepEqual(hubspot.crmCalls, []);
  assert.deepEqual(poller.hubspot.requests, []);
  assert.deepEqual(poller.queues.all(), []);
  // A first run saves its start, one hour back (row 3.2); with no search it never moves on.
  for (const entity of ["client", "bt_rbt", "bcba"]) {
    assert.equal(poller.checkpoint(entity)?.data?.checkpoint ?? null, "2026-11-20T07:05:00.000Z");
  }
  assert.equal(summary.errorsCount > 0, true);
  const errors = poller.logs.filter((entry) => entry.level === "error");
  assert.equal(errors.length, summary.errorsCount);
  for (const entry of errors) {
    assert.equal(entry.meta.error.code, HUBSPOT_PORTAL_MISMATCH);
  }
});

for (const [name, failDetails, expectedCode] of [
  [
    "a network failure",
    () => {
      const error = new Error("socket hang up");
      error.code = "ECONNRESET";
      throw error;
    },
    "ECONNRESET"
  ],
  [
    "a 503 on every in-process attempt",
    () => {
      throw httpError(503, { headers: { "retry-after": "0" } });
    },
    "HUBSPOT_READ_FAILED"
  ],
  [
    "a 401",
    () => {
      throw httpError(401);
    },
    "HUBSPOT_READ_FAILED"
  ],
  ["an answer with no portal ID", () => "", "HUBSPOT_READ_FAILED"]
]) {
  test(`[BR20][F-3] ${name} on the details call is a temporary failed read, no CRM call is made, and the next call checks again`, async () => {
    const hubspot = fakeHubSpot();
    let failing = true;
    hubspot.details = (call) => (failing ? failDetails(call) : SANDBOX_PORTAL);
    const config = hubspotConfig(`token-details-${expectedCode}-${name}`);

    await withAdapter(hubspot.adapter, async () => {
      createHubSpotClient(config);
      await assert.rejects(
        searchObjectPage({ objectTypeId: "0-3", filterGroups: [], sorts: [], properties: [], limit: 1 }),
        (error) => {
          assert.equal(error.code, expectedCode);
          assert.equal(classifyFailure(error), FAILURE_KINDS.TEMPORARY);
          return true;
        }
      );
      assert.deepEqual(hubspot.crmCalls, []);

      // The failure was not kept: the next call checks again, passes, and searches.
      failing = false;
      const callsBefore = hubspot.detailsCalls;
      await searchObjectPage({ objectTypeId: "0-3", filterGroups: [], sorts: [], properties: [], limit: 1 });
      assert.equal(hubspot.detailsCalls, callsBefore + 1);
      assert.deepEqual(hubspot.crmCalls, ["POST /crm/v3/objects/0-3/search"]);
    });
  });
}
