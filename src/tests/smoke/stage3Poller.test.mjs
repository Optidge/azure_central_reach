// Stage 3, lane A: the hourly poller (BUILD-PLAN rows 3.1 to 3.4).
// Guide: Change detection Architecture tab, 11/17 approved design ("an hourly, checkpointed
// poller as a safety check"); [GBR] Requirements 1 and 2; [G11] gate per object; [G17] record gate.
// HubSpot is faked at the HTTP level, Cosmos by the in-memory container and Service Bus at the
// sender (stage3PollerFakes.mjs). No test calls a live service.
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { app } from "@azure/functions";
import { acquireLease } from "../../lib/cosmosState.mjs";
import { getIntakePollerConfig } from "../../lib/config.mjs";
import { createHubSpotClient, searchObjectPage } from "../../lib/hubspotClient.mjs";
import { answeringPortalCheck, portalCheckedHubSpotConfig } from "./hubspotPortalCheckFake.mjs";
import { sha256 } from "../../lib/hash.mjs";
import { POLL_MAX_PAGES, POLL_PAGE_SIZE } from "../../workflows/intakePollerWorkflow.mjs";
import { PRODUCTION_PORTAL, SANDBOX_PORTAL, httpError } from "./stage2Fakes.mjs";
import {
  CASE_TYPE,
  EXCLUDED_STAGES,
  GATE,
  SANDBOX_BCBA_TYPE,
  SANDBOX_BT_TYPE,
  bodies,
  dealIds,
  filtersOf,
  pollerConfig,
  recordIds,
  setupPoller
} from "./stage3PollerFakes.mjs";

// Before 08:00 UTC, so the daily sweep (row 3.5) does not run in these tests.
const NOW = "2026-11-20T06:00:00.000Z";
const HOUR_MS = 3600000;

const POLLER_ENV = {
  HUBSPOT_PRIVATE_APP_TOKEN: "token",
  HUBSPOT_BASE_URL: "https://hubspot.invalid",
  HUBSPOT_PORTAL_ID: SANDBOX_PORTAL,
  SYNC_RECORD_GATE_PROPERTY: GATE,
  LEASE_TTL_SECONDS: "660",
  COSMOS_ENDPOINT: "https://cosmos.invalid",
  COSMOS_KEY: "key",
  COSMOS_DATABASE_ID: "db",
  COSMOS_CONTAINER_ID: "container",
  SERVICE_BUS_CONNECTION_STRING: "sb",
  CLIENT_SYNC_QUEUE_NAME: "client-sync-queue",
  EMPLOYEE_SYNC_QUEUE_NAME: "employee-sync-queue",
  HS_BCBA_OBJECT_TYPE_ID: undefined,
  HS_BT_RBT_OBJECT_TYPE_ID: undefined,
  HUBSPOT_CR_CONTACT_ID_PROPERTY: undefined,
  HUBSPOT_EMPLOYEE_ID_PROPERTY: undefined,
  // Still set to "on" in an old environment: it must change nothing.
  LINKED_RECHECK_ENABLED: "true"
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

const gated = (properties) => ({ [GATE]: "true", ...properties });

// `count` Cases in the gate, each linked, one second apart, the first one `startMinutesAgo` old.
function addCases(poller, count, startMinutesAgo, { firstId = 1, sameTimestamp = false } = {}) {
  const startMs = Date.parse(poller.minutesAgo(startMinutesAgo));
  const timestamps = [];
  for (let index = 0; index < count; index += 1) {
    const timestamp = new Date(startMs + (sameTimestamp ? 0 : index * 1000)).toISOString();
    timestamps.push(timestamp);
    poller.hubspot.add(
      CASE_TYPE,
      firstId + index,
      gated({ client_id_number: String(9000 + firstId + index), hs_lastmodifieddate: timestamp })
    );
  }
  return timestamps;
}

// ---------------------------------------------------------------------------------------------
// Row 3.1: the poller runs at the top of each hour
// ---------------------------------------------------------------------------------------------

test("[BR14][3.1] the poller timer is registered for the top of each hour (0 0 * * * *)", async () => {
  // With INTAKE_POLLER_SCHEDULE not set. stage3PollerSchedule.test.mjs covers the setting.
  const previous = process.env.INTAKE_POLLER_SCHEDULE;
  delete process.env.INTAKE_POLLER_SCHEDULE;
  const timer = mock.method(app, "timer", () => {});
  const module = await import("../../functions/intakePoller.mjs");
  timer.mock.restore();
  if (previous !== undefined) {
    process.env.INTAKE_POLLER_SCHEDULE = previous;
  }

  assert.equal(timer.mock.calls.length, 1);
  const [name, options] = timer.mock.calls[0].arguments;
  assert.equal(name, "intakePoller");
  assert.equal(options.schedule, "0 0 * * * *");
  assert.equal(options.handler, module.intakePoller);
});

// ---------------------------------------------------------------------------------------------
// Row 3.2: one saved checkpoint per entity; it moves forward only after the page was queued
// ---------------------------------------------------------------------------------------------

test("[BR14][3.2] the real poller path: each search result becomes one queue message, with the configured portal ID", async () => {
  // The configuration is read by the real getIntakePollerConfig from app settings.
  const config = withEnv(POLLER_ENV, () => getIntakePollerConfig());
  const poller = setupPoller({ config, now: NOW });
  const caseTime = poller.minutesAgo(30);
  const btTime = poller.minutesAgo(20);
  const bcbaTime = poller.minutesAgo(10);
  // A linked Case, an unlinked BT/RBT with Entered in CentralReach = Yes, a linked BCBA.
  poller.hubspot.add(CASE_TYPE, "101", gated({ client_id_number: "5001", hs_lastmodifieddate: caseTime }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "201", gated({ entered_in_centralreach: "Yes", hs_lastmodifieddate: btTime }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "301", gated({ employee_id: "7001", hs_lastmodifieddate: bcbaTime }));

  const summary = await poller.run();

  assert.equal(summary.leaseAcquired, true);
  assert.equal(summary.errorsCount, 0);
  assert.equal(summary.messagesEnqueued, 3);
  assert.deepEqual(summary.poll, { client: 1, bt_rbt: 1, bcba: 1 });
  assert.deepEqual(poller.queues.client, [
    {
      body: {
        workflow: "clientSync",
        source: "intakePoller",
        portalId: SANDBOX_PORTAL,
        dealId: "101",
        enqueuedAt: NOW,
        hsLastModifiedDate: caseTime
      },
      messageId: sha256(`101:${caseTime}`)
    }
  ]);
  assert.deepEqual(poller.queues.employee, [
    {
      body: {
        recordId: "201",
        employeeType: "bt_rbt",
        workflow: "employeeSync",
        source: "employeePoller",
        portalId: SANDBOX_PORTAL,
        enqueuedAt: NOW,
        hsLastModifiedDate: btTime
      },
      messageId: sha256(`bt_rbt:201:${btTime}`)
    },
    {
      body: {
        recordId: "301",
        employeeType: "bcba",
        workflow: "employeeSync",
        source: "employeePoller",
        portalId: SANDBOX_PORTAL,
        enqueuedAt: NOW,
        hsLastModifiedDate: bcbaTime
      },
      messageId: sha256(`bcba:301:${bcbaTime}`)
    }
  ]);
  // One search per object, on the object types of the configured portal.
  assert.deepEqual(
    poller.hubspot.requests.map((request) => request.objectTypeId),
    [CASE_TYPE, SANDBOX_BT_TYPE, SANDBOX_BCBA_TYPE]
  );
});

test("[BR14][3.2] a production run searches the production object types and stamps portal 50317927 on every message and key", async () => {
  const productionBt = "2-48354559";
  const productionBcba = "2-48354212";
  const poller = setupPoller({
    now: NOW,
    config: pollerConfig({
      portalId: PRODUCTION_PORTAL,
      btRbtObjectTypeId: productionBt,
      bcbaObjectTypeId: productionBcba
    })
  });
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5", hs_lastmodifieddate: poller.minutesAgo(30) }));
  poller.hubspot.add(productionBt, "2", gated({ employee_id: "6", hs_lastmodifieddate: poller.minutesAgo(30) }));
  poller.hubspot.add(productionBcba, "3", gated({ employee_id: "7", hs_lastmodifieddate: poller.minutesAgo(30) }));

  await poller.run();

  assert.deepEqual(
    bodies(poller.queues.all()).map((body) => body.portalId),
    [PRODUCTION_PORTAL, PRODUCTION_PORTAL, PRODUCTION_PORTAL]
  );
  const keys = poller.container.log.map((entry) => entry.doc?.id ?? entry.id);
  assert.equal(keys.length > 0, true);
  assert.equal(keys.every((id) => String(id).startsWith(`${PRODUCTION_PORTAL}:`)), true);
});

test("[BR14][3.2] the first run starts one hour back, oldest first", async () => {
  const poller = setupPoller({ now: NOW });
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5", hs_lastmodifieddate: poller.minutesAgo(61) }));
  poller.hubspot.add(CASE_TYPE, "2", gated({ client_id_number: "6", hs_lastmodifieddate: poller.minutesAgo(10) }));
  poller.hubspot.add(CASE_TYPE, "3", gated({ client_id_number: "7", hs_lastmodifieddate: poller.minutesAgo(59) }));

  await poller.run();

  assert.deepEqual(dealIds(poller.queues.client), ["3", "2"]);
  const [request] = poller.hubspot.requestsFor(CASE_TYPE);
  const oneHourBack = new Date(Date.parse(NOW) - HOUR_MS).toISOString();
  assert.deepEqual(
    filtersOf(request, "hs_lastmodifieddate"),
    request.body.filterGroups.map(() => ({
      propertyName: "hs_lastmodifieddate",
      operator: "GTE",
      value: oneHourBack
    }))
  );
  assert.deepEqual(request.body.sorts, [
    { propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }
  ]);
});

test("[BR14][3.2] the checkpoint is saved per entity with no expiry, as the earlier of the page's last timestamp and five minutes ago", async () => {
  const poller = setupPoller({ now: NOW });
  // Case: one full page, then a second page whose send fails. The checkpoint is the last
  // timestamp of page one.
  const caseTimes = addCases(poller, POLL_PAGE_SIZE + 5, 50);
  // BT/RBT: page one ends on a record changed two minutes ago. HubSpot's search may not show
  // every change that recent yet, so the checkpoint stops at five minutes ago.
  for (let id = 1; id < POLL_PAGE_SIZE; id += 1) {
    poller.hubspot.add(SANDBOX_BT_TYPE, id, gated({ employee_id: String(7000 + id), hs_lastmodifieddate: poller.minutesAgo(30) }));
  }
  poller.hubspot.add(SANDBOX_BT_TYPE, "500", gated({ employee_id: "7500", hs_lastmodifieddate: poller.minutesAgo(2) }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "501", gated({ employee_id: "7501", hs_lastmodifieddate: poller.minutesAgo(1) }));
  poller.queues.beforeSend = (queueName, message) => {
    if (message.body.dealId === String(POLL_PAGE_SIZE + 2) || message.body.recordId === "501") {
      throw new Error("Service Bus send failed");
    }
  };

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 2);
  const caseCheckpoint = poller.checkpoint("client");
  assert.equal(caseCheckpoint.id, `${SANDBOX_PORTAL}:client`);
  assert.equal(caseCheckpoint.ttl, -1);
  assert.equal(caseCheckpoint.data.checkpoint, caseTimes[POLL_PAGE_SIZE - 1]);
  const btCheckpoint = poller.checkpoint("bt_rbt");
  assert.equal(btCheckpoint.id, `${SANDBOX_PORTAL}:bt_rbt`);
  assert.equal(btCheckpoint.ttl, -1);
  assert.equal(btCheckpoint.data.checkpoint, poller.minutesAgo(5));
  // Nothing found for BCBA and the search ended: five minutes ago.
  const bcbaCheckpoint = poller.checkpoint("bcba");
  assert.equal(bcbaCheckpoint.id, `${SANDBOX_PORTAL}:bcba`);
  assert.equal(bcbaCheckpoint.ttl, -1);
  assert.equal(bcbaCheckpoint.data.checkpoint, poller.minutesAgo(5));

  // The next run starts at each entity's own checkpoint.
  poller.queues.beforeSend = null;
  const types = [CASE_TYPE, SANDBOX_BT_TYPE, SANDBOX_BCBA_TYPE];
  const searchesBefore = types.map((objectTypeId) => poller.hubspot.requestsFor(objectTypeId).length);
  poller.setNow("2026-11-20T07:00:00.000Z");
  await poller.run();
  const startedAt = types.map(
    (objectTypeId, index) =>
      filtersOf(poller.hubspot.requestsFor(objectTypeId)[searchesBefore[index]], "hs_lastmodifieddate")[0].value
  );
  assert.deepEqual(startedAt, [
    caseCheckpoint.data.checkpoint,
    btCheckpoint.data.checkpoint,
    bcbaCheckpoint.data.checkpoint
  ]);
});

test("[BR14][3.2] an outage of any length is caught up over later runs, and no record is lost", async () => {
  const poller = setupPoller({ now: "2026-11-17T05:00:00.000Z" });
  await poller.run();

  // Three days with no poller run. 2,500 Cases changed in that time: more than one run takes.
  poller.setNow("2026-11-20T05:00:00.000Z");
  const total = 2500;
  const timestamps = addCases(poller, total, 60 * 60);
  const seen = new Set();
  const perRun = [];
  for (const now of ["2026-11-20T05:00:00.000Z", "2026-11-20T06:00:00.000Z", "2026-11-20T07:00:00.000Z"]) {
    poller.setNow(now);
    poller.queues.clear();
    const summary = await poller.run();
    assert.equal(summary.errorsCount, 0);
    const ids = dealIds(poller.queues.client);
    // Oldest first inside a run.
    assert.deepEqual(ids, [...ids].sort((left, right) => Number(left) - Number(right)));
    ids.forEach((id) => seen.add(id));
    perRun.push(ids.length);
  }

  // A run stops at the page cap (one more page shows whether the timestamp changed).
  assert.equal(poller.hubspot.requestsFor(CASE_TYPE).length > POLL_MAX_PAGES + 1, true);
  assert.equal(perRun[0], (POLL_MAX_PAGES + 1) * POLL_PAGE_SIZE);
  assert.equal(perRun[0] < total, true);
  assert.equal(seen.size, total);
  // The last run reached the end of the search: the checkpoint is that run's five minutes ago.
  assert.equal(Date.parse(timestamps.at(-1)) < Date.parse("2026-11-20T06:55:00.000Z"), true);
  assert.equal(poller.checkpoint("client").data.checkpoint, "2026-11-20T06:55:00.000Z");
});

test("[BR14][3.2] a send failure leaves the checkpoint at the last finished page", async () => {
  const poller = setupPoller({ now: NOW });
  const timestamps = addCases(poller, 250, 50);
  let sends = 0;
  poller.queues.beforeSend = (queueName) => {
    if (queueName === "client") {
      sends += 1;
      if (sends === 150) {
        throw new Error("Service Bus send failed");
      }
    }
  };

  const failed = await poller.run();

  assert.equal(failed.errorsCount, 1);
  assert.equal(poller.queues.client.length, 149);
  // Page one (100 records) was queued in full; page two was not.
  assert.equal(poller.checkpoint("client").data.checkpoint, timestamps[POLL_PAGE_SIZE - 1]);
  assert.equal(poller.logs.some((entry) => entry.level === "error"), true);

  poller.queues.beforeSend = null;
  poller.queues.clear();
  const next = await poller.run();

  assert.equal(next.errorsCount, 0);
  // The next run starts at the last finished page: record 100 again, then 101 to 250.
  const again = dealIds(poller.queues.client);
  assert.equal(again[0], String(POLL_PAGE_SIZE));
  assert.deepEqual(
    [...new Set(again)],
    Array.from({ length: 151 }, (_, index) => String(POLL_PAGE_SIZE + index))
  );
  assert.equal(poller.checkpoint("client").data.checkpoint, poller.minutesAgo(5));
});

test("[BR14][3.2] two records with one timestamp: neither is skipped when the run stops between them", async () => {
  const poller = setupPoller({ now: NOW });
  // Record 100 is the last of page one and record 101 the first of page two. Both changed in
  // the same millisecond.
  const timestamps = addCases(poller, 99, 50);
  const shared = poller.minutesAgo(40);
  poller.hubspot.add(CASE_TYPE, "100", gated({ client_id_number: "1", hs_lastmodifieddate: shared }));
  poller.hubspot.add(CASE_TYPE, "101", gated({ client_id_number: "2", hs_lastmodifieddate: shared }));
  assert.equal(Date.parse(timestamps.at(-1)) < Date.parse(shared), true);
  poller.queues.beforeSend = (queueName, message) => {
    if (queueName === "client" && message.body.dealId === "101") {
      throw new Error("Service Bus send failed");
    }
  };

  await poller.run();
  assert.equal(dealIds(poller.queues.client).includes("101"), false);
  assert.equal(poller.checkpoint("client").data.checkpoint, shared);

  poller.queues.beforeSend = null;
  poller.queues.clear();
  await poller.run();

  // The search is "at or after" the checkpoint, so the record that shares its timestamp is found.
  assert.deepEqual(dealIds(poller.queues.client), ["100", "101"]);
});

test("[BR14][3.2] a record that changes while the poller is paging does not make the poller skip another record", async () => {
  const poller = setupPoller({ now: NOW });
  addCases(poller, 250, 50);
  // HubSpot's search has no snapshot: between the first and the second page, record 1 (already
  // queued) is written to, so it moves to the end of the "oldest first" order and every later
  // record moves one place up.
  poller.hubspot.beforeSearch = (objectTypeId, requestNumber) => {
    if (objectTypeId === CASE_TYPE && requestNumber === 2) {
      poller.hubspot.set(CASE_TYPE, "1", { hs_lastmodifieddate: poller.minutesAgo(1) });
    }
  };

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 0);
  const queued = new Set(dealIds(poller.queues.client));
  const missing = Array.from({ length: 250 }, (_, index) => String(index + 1)).filter((id) => !queued.has(id));
  assert.deepEqual(missing, []);
  // Record 1 is queued again with its new timestamp.
  assert.equal(dealIds(poller.queues.client).filter((id) => id === "1").length, 2);
});

test("[BR14][3.2] when the page cap falls inside a block of equal timestamps the poller keeps paging until the timestamp changes", async () => {
  const poller = setupPoller({ now: NOW });
  const capacity = POLL_MAX_PAGES * POLL_PAGE_SIZE;
  // 50 records short of the cap, then 300 records with one timestamp, then 500 later ones.
  addCases(poller, capacity - 50, 59);
  addCases(poller, 300, 40, { firstId: 100001, sameTimestamp: true });
  const later = addCases(poller, 500, 35, { firstId: 200001 });

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 0);
  const ids = dealIds(poller.queues.client);
  // Every record of the block was queued in this run: the run did not stop inside it.
  const block = ids.filter((id) => Number(id) > 100000 && Number(id) < 200000);
  assert.equal(new Set(block).size, 300);
  // It went past the cap, and stopped at the first page that ends on a later timestamp.
  assert.equal(poller.hubspot.requestsFor(CASE_TYPE).length, POLL_MAX_PAGES + 5);
  assert.equal(poller.checkpoint("client").data.checkpoint, later[99]);
  assert.equal(ids.some((id) => Number(id) > 200100), false);

  // The rest is picked up by the next run.
  poller.queues.clear();
  await poller.run();
  const seen = new Set([...ids, ...dealIds(poller.queues.client)]);
  assert.equal(seen.size, capacity - 50 + 300 + 500);
});

test("[BR1][3.2] an unlinked record whose Entered in CentralReach is not Yes is not queued", async () => {
  const poller = setupPoller({ now: NOW });
  const recent = poller.minutesAgo(30);
  // Case: the multi-checkbox must contain Yes.
  poller.hubspot.add(CASE_TYPE, "1", gated({ enter_in_central_reach: "Yes", hs_lastmodifieddate: recent }));
  poller.hubspot.add(CASE_TYPE, "2", gated({ enter_in_central_reach: "No", hs_lastmodifieddate: recent }));
  poller.hubspot.add(CASE_TYPE, "3", gated({ hs_lastmodifieddate: recent }));
  // BT/RBT and BCBA: the value must equal Yes.
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", gated({ entered_in_centralreach: "Yes", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", gated({ entered_in_centralreach: "Yes - Generic", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "13", gated({ entered_in_centralreach: "No- Made Inactive", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "14", gated({ hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ entered_in_centralreach: "Yes", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "22", gated({ entered_in_centralreach: "No", hs_lastmodifieddate: recent }));

  await poller.run();

  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
  assert.deepEqual(recordIds(poller.queues.employee), ["11", "21"]);
});

test("[BR5][3.2] a linked record is queued whatever Entered in CentralReach says", async () => {
  const poller = setupPoller({ now: NOW });
  const recent = poller.minutesAgo(30);
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", hs_lastmodifieddate: recent }));
  poller.hubspot.add(CASE_TYPE, "2", gated({ client_id_number: "5002", enter_in_central_reach: "No", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", gated({ employee_id: "7001", entered_in_centralreach: "No- Made Inactive", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", gated({ employee_id: "7002", entered_in_centralreach: "Yes - Generic", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ employee_id: "7003", hs_lastmodifieddate: recent }));

  await poller.run();

  assert.deepEqual(dealIds(poller.queues.client), ["1", "2"]);
  assert.deepEqual(recordIds(poller.queues.employee), ["11", "12", "21"]);
});

test("[BR1][3.2] the search filters: linked, or Entered in CentralReach contains Yes (Case, CONTAINS_TOKEN) or equals Yes (BCBA, BT/RBT)", async () => {
  const poller = setupPoller({ now: NOW });

  await poller.run();

  const branch = (objectTypeId, propertyName) =>
    filtersOf(poller.hubspot.requestsFor(objectTypeId)[0], propertyName).filter(Boolean);
  assert.deepEqual(branch(CASE_TYPE, "client_id_number"), [
    { propertyName: "client_id_number", operator: "HAS_PROPERTY" }
  ]);
  assert.deepEqual(branch(CASE_TYPE, "enter_in_central_reach"), [
    { propertyName: "enter_in_central_reach", operator: "CONTAINS_TOKEN", value: "Yes" }
  ]);
  for (const objectTypeId of [SANDBOX_BT_TYPE, SANDBOX_BCBA_TYPE]) {
    assert.deepEqual(branch(objectTypeId, "employee_id"), [
      { propertyName: "employee_id", operator: "HAS_PROPERTY" }
    ]);
    assert.deepEqual(branch(objectTypeId, "entered_in_centralreach"), [
      { propertyName: "entered_in_centralreach", operator: "EQ", value: "Yes" }
    ]);
    assert.equal(poller.hubspot.requestsFor(objectTypeId)[0].body.filterGroups.length, 2);
  }
});

test("[BR14][3.2] no linked recheck, dedupe entry or lookback is left: one search per entity and only checkpoints in Cosmos", async () => {
  const config = withEnv(POLLER_ENV, () => getIntakePollerConfig());
  const poller = setupPoller({ config, now: NOW });
  // A linked Case nobody changed for ten days. The old recheck queued it on every run.
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", hs_lastmodifieddate: poller.minutesAgo(14400) }));
  poller.hubspot.add(CASE_TYPE, "2", gated({ client_id_number: "5002", hs_lastmodifieddate: poller.minutesAgo(30) }));

  const first = await poller.run();
  const second = await poller.run();

  assert.equal(first.errorsCount + second.errorsCount, 0);
  // The first run reached the end of the search, so the second run finds nothing new.
  assert.deepEqual(dealIds(poller.queues.client), ["2"]);
  assert.equal(poller.hubspot.requests.length, 6);
  for (const request of poller.hubspot.requests) {
    assert.equal(filtersOf(request, "hs_lastmodifieddate").every(Boolean), true);
  }
  // The lease is released; what stays is one checkpoint per entity.
  const stored = Array.from(poller.container.docs.values());
  assert.deepEqual(stored.map((doc) => doc.pk), ["poller:checkpoint", "poller:checkpoint", "poller:checkpoint"]);
  assert.deepEqual(
    stored.map((doc) => doc.id).sort(),
    [`${SANDBOX_PORTAL}:bcba`, `${SANDBOX_PORTAL}:bt_rbt`, `${SANDBOX_PORTAL}:client`]
  );
});

test("[BR14][3.2] a record is queued whatever integration_last_write says: the poller has no timestamp shortcut", async () => {
  const poller = setupPoller({ now: NOW });
  const changed = poller.minutesAgo(30);
  // The integration's own write is stamped later than the change (two clocks). The old
  // shortcut skipped this record.
  poller.hubspot.add(CASE_TYPE, "1", gated({
    client_id_number: "5001",
    hs_lastmodifieddate: changed,
    integration_last_write: poller.minutesAgo(29),
    updated_by_integration: "true"
  }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "2", gated({
    employee_id: "7001",
    hs_lastmodifieddate: changed,
    integration_last_write: poller.minutesAgo(29),
    updated_by_integration: "true"
  }));

  await poller.run();

  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
  assert.deepEqual(recordIds(poller.queues.employee), ["2"]);
});

test("[BR14][3.2] one poller run at a time per portal: the lease key starts with the portal ID and is released after the run", async () => {
  const poller = setupPoller({ now: NOW });
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", hs_lastmodifieddate: poller.minutesAgo(30) }));

  // Another portal's poller holds its own lease: this run is not held up.
  await acquireLease({ pk: "workflow:intake-poller", id: `${PRODUCTION_PORTAL}:active-lease`, ttlSeconds: 660 });
  const free = await poller.run();
  assert.equal(free.leaseAcquired, true);
  assert.equal(poller.queues.client.length, 1);
  assert.equal(poller.container.get("workflow:intake-poller", `${SANDBOX_PORTAL}:active-lease`), null);

  // A run of this portal is still going: the second run does nothing.
  await acquireLease({ pk: "workflow:intake-poller", id: `${SANDBOX_PORTAL}:active-lease`, ttlSeconds: 660 });
  const searchesBefore = poller.hubspot.requests.length;
  const busy = await poller.run();
  assert.equal(busy.leaseAcquired, false);
  assert.equal(busy.messagesEnqueued, 0);
  assert.equal(poller.hubspot.requests.length, searchesBefore);
});

// ---------------------------------------------------------------------------------------------
// Row 3.3: one entity's failure does not stop the others; a rejected search fails loudly
// ---------------------------------------------------------------------------------------------

test("[BR14][3.3] a failed Case search still runs both employee searches", async () => {
  const poller = setupPoller({ now: NOW });
  const recent = poller.minutesAgo(30);
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", gated({ employee_id: "7001", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ employee_id: "7002", hs_lastmodifieddate: recent }));
  poller.hubspot.fail(CASE_TYPE, new Error("socket hang up"));

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 1);
  assert.equal(poller.queues.client.length, 0);
  assert.deepEqual(recordIds(poller.queues.employee), ["11", "21"]);
  // The Case checkpoint did not move past the failed search.
  assert.equal(poller.checkpoint("client").data.checkpoint, poller.minutesAgo(60));
  assert.equal(poller.checkpoint("bt_rbt").data.checkpoint, poller.minutesAgo(5));
});

test("[BR14][3.3] a failed BT/RBT search still runs the BCBA search", async () => {
  const poller = setupPoller({ now: NOW });
  const recent = poller.minutesAgo(30);
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ employee_id: "7002", hs_lastmodifieddate: recent }));
  poller.hubspot.fail(SANDBOX_BT_TYPE, new Error("socket hang up"));

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 1);
  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
  assert.deepEqual(recordIds(poller.queues.employee), ["21"]);
});

test("[BR14][3.3] a rejected filter is an error: the search is not run again without its date filter", async () => {
  const poller = setupPoller({ now: NOW });
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", hs_lastmodifieddate: poller.minutesAgo(30) }));
  // The answer the old fallback reacted to.
  poller.hubspot.fail(
    CASE_TYPE,
    httpError(400, { data: { message: "Invalid filter: hs_lastmodifieddate is not a valid property" } }),
    1
  );

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 1);
  assert.equal(poller.hubspot.requestsFor(CASE_TYPE).length, 1);
  assert.equal(poller.queues.client.length, 0);
  const errors = poller.logs.filter((entry) => entry.level === "error");
  assert.equal(errors.length, 1);
  assert.equal(errors[0].meta.error.status, 400);
});

test("[BR16][3.3] a search answer with no results list is a failed read, not an empty page", async () => {
  const poller = setupPoller({ now: NOW });
  poller.hubspot.fail(CASE_TYPE, httpError(400), 1);
  await assert.rejects(
    searchObjectPage({ objectTypeId: CASE_TYPE, filterGroups: [], sorts: [], properties: ["hs_object_id"], limit: 10 }),
    (error) => error.response.status === 400 && error.provider === "hubspot"
  );

  // HubSpot answers 200 with no list.
  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  client.defaults.adapter = answeringPortalCheck(async (requestConfig) => ({ status: 200, headers: {}, config: requestConfig, data: {} }));
  await assert.rejects(
    searchObjectPage({ objectTypeId: CASE_TYPE, filterGroups: [], sorts: [], properties: ["hs_object_id"], limit: 10 }),
    (error) => error.code === "HUBSPOT_READ_FAILED"
  );
});

// ---------------------------------------------------------------------------------------------
// Row 3.4: the record gate applies to the poller
// ---------------------------------------------------------------------------------------------

test("[BR4][3.4] with the record gate set, every poller search carries \"the gate property is true\" and a record outside the gate is not queued", async () => {
  const poller = setupPoller({ now: NOW });
  const recent = poller.minutesAgo(30);
  poller.hubspot.add(CASE_TYPE, "1", { [GATE]: "true", client_id_number: "5001", hs_lastmodifieddate: recent });
  poller.hubspot.add(CASE_TYPE, "2", { client_id_number: "5002", hs_lastmodifieddate: recent });
  poller.hubspot.add(CASE_TYPE, "3", { [GATE]: "false", enter_in_central_reach: "Yes", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", { [GATE]: "true", entered_in_centralreach: "Yes", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", { entered_in_centralreach: "Yes", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", { [GATE]: "true", employee_id: "7001", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "22", { [GATE]: "false", employee_id: "7002", hs_lastmodifieddate: recent });

  await poller.run();

  assert.equal(poller.hubspot.requests.length, 3);
  for (const request of poller.hubspot.requests) {
    assert.deepEqual(
      filtersOf(request, GATE),
      request.body.filterGroups.map(() => ({ propertyName: GATE, operator: "EQ", value: "true" }))
    );
  }
  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
  assert.deepEqual(recordIds(poller.queues.employee), ["11", "21"]);
});

test("[BR4][3.4] with the gate set to none, no poller search carries a gate filter", async () => {
  const config = withEnv({ ...POLLER_ENV, SYNC_RECORD_GATE_PROPERTY: "none" }, () => getIntakePollerConfig());
  assert.equal(config.sync.recordGateProperty, null);
  const poller = setupPoller({ config, now: NOW });
  const recent = poller.minutesAgo(30);
  poller.hubspot.add(CASE_TYPE, "1", { client_id_number: "5001", hs_lastmodifieddate: recent });
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", { entered_in_centralreach: "Yes", hs_lastmodifieddate: recent });

  await poller.run();

  assert.equal(poller.hubspot.requests.length, 3);
  for (const request of poller.hubspot.requests) {
    const names = request.body.filterGroups.flatMap((group) => group.filters.map((filter) => filter.propertyName));
    assert.equal(names.includes(GATE), false);
    assert.equal(names.includes("none"), false);
  }
  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
  assert.deepEqual(recordIds(poller.queues.employee), ["11"]);
});

test("[BR4][3.4] the poller reads the gate from SYNC_RECORD_GATE_PROPERTY, and a missing setting is invalid configuration", () => {
  withEnv(POLLER_ENV, () => {
    assert.equal(getIntakePollerConfig().sync.recordGateProperty, GATE);
  });
  withEnv({ ...POLLER_ENV, SYNC_RECORD_GATE_PROPERTY: undefined }, () => {
    assert.throws(() => getIntakePollerConfig(), /SYNC_RECORD_GATE_PROPERTY/);
  });
});

test("[BR6][3.4] the Case search keeps the four-stage exclusion, linked or not; the employee searches have no stage filter", async () => {
  const poller = setupPoller({ now: NOW });
  const recent = poller.minutesAgo(30);
  EXCLUDED_STAGES.forEach((stage, index) => {
    poller.hubspot.add(CASE_TYPE, `10${index}`, gated({
      client_id_number: String(5000 + index),
      dealstage: stage,
      hs_lastmodifieddate: recent
    }));
    poller.hubspot.add(CASE_TYPE, `20${index}`, gated({
      enter_in_central_reach: "Yes",
      dealstage: stage,
      hs_lastmodifieddate: recent
    }));
  });
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "6001", dealstage: "1", hs_lastmodifieddate: recent }));

  await poller.run();

  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
  const [caseRequest] = poller.hubspot.requestsFor(CASE_TYPE);
  assert.deepEqual(
    filtersOf(caseRequest, "dealstage"),
    caseRequest.body.filterGroups.map(() => ({
      propertyName: "dealstage",
      operator: "NOT_IN",
      values: EXCLUDED_STAGES
    }))
  );
  for (const objectTypeId of [SANDBOX_BT_TYPE, SANDBOX_BCBA_TYPE]) {
    const names = poller.hubspot
      .requestsFor(objectTypeId)[0]
      .body.filterGroups.flatMap((group) => group.filters.map((filter) => filter.propertyName));
    assert.equal(names.some((name) => name.includes("stage")), false);
  }
});
