// Stage 3, lane A: fixes from the independent review of the poller (findings A-R1 to A-R9).
// Same fakes as the poller tests. No test calls a live service.
import test from "node:test";
import assert from "node:assert/strict";
import { createHubSpotClient, findHubSpotRecordsByEmployeeId } from "../../lib/hubspotClient.mjs";
import { answeringPortalCheck, portalCheckedHubSpotConfig } from "./hubspotPortalCheckFake.mjs";
import { intakePoller } from "../../functions/intakePoller.mjs";
import { SANDBOX_PORTAL } from "./stage2Fakes.mjs";
import {
  CASE_TYPE,
  GATE,
  SANDBOX_BCBA_TYPE,
  SANDBOX_BT_TYPE,
  bodies,
  dealIds,
  filtersOf,
  recordIds,
  setupPoller
} from "./stage3PollerFakes.mjs";

// Before 08:00 UTC, so the daily sweep does not run unless a test moves the clock.
const NOW = "2026-11-20T06:00:00.000Z";
const gated = (properties) => ({ [GATE]: "true", ...properties });
const everyId = (count) => Array.from({ length: count }, (_, index) => String(index + 1));

// `count` linked Cases in the gate that all changed in the same millisecond.
function addBlock(poller, count, timestamp) {
  for (let id = 1; id <= count; id += 1) {
    poller.hubspot.add(CASE_TYPE, id, gated({ client_id_number: String(9000 + id), hs_lastmodifieddate: timestamp }));
  }
}

const blockRequests = (poller) =>
  poller.hubspot
    .requestsFor(CASE_TYPE)
    .filter((request) => request.body.sorts[0].propertyName === "hs_object_id");

// ---------------------------------------------------------------------------------------------
// A-R1, A-R4: a block of records with one timestamp is paged by record ID
// ---------------------------------------------------------------------------------------------

test("[BR14][3.2] inside a block of records with one timestamp, a record that changes between pages does not make the poller skip another record", async () => {
  const poller = setupPoller({ now: NOW });
  const blockTime = poller.minutesAgo(30);
  addBlock(poller, 250, blockTime);
  // While the poller pages through the block, the worker writes its status to record 1, which
  // was queued from the first page. Record 1 leaves the block.
  poller.hubspot.beforeSearch = (objectTypeId, requestNumber) => {
    if (objectTypeId === CASE_TYPE && requestNumber === 3) {
      poller.hubspot.set(CASE_TYPE, "1", { hs_lastmodifieddate: poller.minutesAgo(1) });
    }
  };

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 0);
  const queued = new Set(dealIds(poller.queues.client));
  assert.deepEqual(everyId(250).filter((id) => !queued.has(id)), []);
  // The block is paged by record ID inside exactly that timestamp. No search uses HubSpot's
  // position cursor.
  const requests = blockRequests(poller);
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.deepEqual(filtersOf(request, "hs_lastmodifieddate"), [
      { propertyName: "hs_lastmodifieddate", operator: "GTE", value: blockTime },
      { propertyName: "hs_lastmodifieddate", operator: "GTE", value: blockTime }
    ]);
    for (const group of request.body.filterGroups) {
      assert.deepEqual(
        group.filters.filter((filter) => filter.operator === "LTE"),
        [{ propertyName: "hs_lastmodifieddate", operator: "LTE", value: blockTime }]
      );
    }
  }
  assert.deepEqual(
    requests.map((request) => filtersOf(request, "hs_object_id")[0]?.value ?? null),
    [null, "100", "200"]
  );
  assert.equal(poller.hubspot.requests.some((request) => "after" in request.body), false);
  // Record 1 is found again with its new timestamp, and the search ended: the checkpoint is
  // five minutes ago.
  assert.equal(bodies(poller.queues.client).at(-1).dealId, "1");
  assert.equal(bodies(poller.queues.client).at(-1).hsLastModifiedDate, poller.minutesAgo(1));
  assert.equal(poller.checkpoint("client").data.checkpoint, poller.minutesAgo(5));
});

test("[BR14][3.2] a send failure inside a block leaves the checkpoint at the block's timestamp, and the next run queues the whole block", async () => {
  const poller = setupPoller({ now: NOW });
  const blockTime = poller.minutesAgo(30);
  addBlock(poller, 250, blockTime);
  let sends = 0;
  poller.queues.beforeSend = (queueName) => {
    if (queueName === "client") {
      sends += 1;
      if (sends === 260) {
        throw new Error("Service Bus send failed");
      }
    }
  };

  const failed = await poller.run();

  assert.equal(failed.errorsCount, 1);
  assert.equal(poller.checkpoint("client").data.checkpoint, blockTime);

  poller.queues.beforeSend = null;
  poller.queues.clear();
  const next = await poller.run();

  assert.equal(next.errorsCount, 0);
  assert.deepEqual([...new Set(dealIds(poller.queues.client))].sort((a, b) => a - b), everyId(250));
  assert.equal(poller.checkpoint("client").data.checkpoint, poller.minutesAgo(5));
});

test("[BR14][3.2] a block of more than 10,000 records with one timestamp is paged through by record ID", async () => {
  const poller = setupPoller({ now: NOW });
  addBlock(poller, 10050, poller.minutesAgo(30));
  poller.hubspot.add(CASE_TYPE, "20001", gated({ client_id_number: "1", hs_lastmodifieddate: poller.minutesAgo(20) }));

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 0);
  const queued = new Set(dealIds(poller.queues.client));
  assert.equal(queued.size, 10051);
  assert.equal(queued.has("20001"), true);
  assert.equal(poller.hubspot.requests.some((request) => "after" in request.body), false);
  assert.equal(poller.logs.some((entry) => entry.level === "error"), false);
});

// ---------------------------------------------------------------------------------------------
// A-R3: the newest record is not queued again every hour
// ---------------------------------------------------------------------------------------------

test("[BR14][3.2] after the last page the checkpoint moves to five minutes ago, so a record is queued once and not at every hourly run", async () => {
  const poller = setupPoller({ now: NOW });
  // Unlinked, so the daily sweep does not queue them either.
  poller.hubspot.add(CASE_TYPE, "1", gated({ enter_in_central_reach: "Yes", hs_lastmodifieddate: poller.minutesAgo(30) }));
  // Changed two minutes before the first run: inside the five-minute guard.
  poller.hubspot.add(SANDBOX_BT_TYPE, "2", gated({ entered_in_centralreach: "Yes", hs_lastmodifieddate: poller.minutesAgo(2) }));

  const checkpoints = [];
  for (let hour = 6; hour <= 12; hour += 1) {
    poller.setNow(`2026-11-20T${String(hour).padStart(2, "0")}:00:00.000Z`);
    const summary = await poller.run();
    assert.equal(summary.errorsCount, 0);
    checkpoints.push(poller.checkpoint("client").data.checkpoint);
    assert.equal(poller.checkpoint("bcba").data.checkpoint, poller.minutesAgo(5));
  }

  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
  // Found once more by the second run, because the first run could not go past its guard.
  assert.deepEqual(recordIds(poller.queues.employee), ["2", "2"]);
  assert.deepEqual(
    checkpoints,
    [5, 6, 7, 8, 9, 10, 11].map((hour) => `2026-11-20T${String(hour).padStart(2, "0")}:55:00.000Z`)
  );
});

// ---------------------------------------------------------------------------------------------
// A-R5, A-R6: an answer the poller cannot use is a failed read
// ---------------------------------------------------------------------------------------------

test("[BR16][3.2] a page whose last record has no readable hs_lastmodifieddate is a failed read: the checkpoint does not move", async () => {
  for (const timestamp of [null, "", "not a date"]) {
    const poller = setupPoller({ now: NOW });
    poller.hubspot.add(SANDBOX_BT_TYPE, "11", gated({ employee_id: "7001", hs_lastmodifieddate: poller.minutesAgo(30) }));
    poller.hubspot.answerAt(CASE_TYPE, 1, {
      results: [
        { id: "1", properties: { hs_object_id: "1", hs_lastmodifieddate: poller.minutesAgo(30) } },
        { id: "2", properties: { hs_object_id: "2", hs_lastmodifieddate: timestamp } }
      ],
      paging: { next: { after: "2" } }
    });

    const summary = await poller.run();

    assert.equal(summary.errorsCount, 1);
    assert.equal(poller.hubspot.requestsFor(CASE_TYPE).length, 1);
    assert.equal(poller.checkpoint("client").data.checkpoint, poller.minutesAgo(60));
    const [error] = poller.logs.filter((entry) => entry.level === "error");
    assert.equal(error.meta.error.code, "HUBSPOT_READ_FAILED");
    // The other objects still ran.
    assert.deepEqual(recordIds(poller.queues.employee), ["11"]);
  }
});

test("[BR16][3.2] an empty page that still has a next cursor is a failed read, not the end of the search", async () => {
  const poller = setupPoller({ now: NOW });
  poller.hubspot.answerAt(CASE_TYPE, 1, { results: [], paging: { next: { after: "100" } } });

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 1);
  assert.equal(poller.hubspot.requestsFor(CASE_TYPE).length, 1);
  assert.equal(poller.checkpoint("client").data.checkpoint, poller.minutesAgo(60));
});

test("[BR16][3.5] an empty sweep page that still has a next cursor is a failed read: one search, and the object is swept again the next hour", async () => {
  const poller = setupPoller({ now: "2026-11-20T08:00:00.000Z" });
  const old = "2026-11-10T12:00:00.000Z";
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", hs_lastmodifieddate: old }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ employee_id: "7002", hs_lastmodifieddate: old }));
  // The first Case search of the run is the hourly one; the second is the sweep.
  poller.hubspot.answerAt(CASE_TYPE, 2, { results: [], paging: { next: { after: "100" } } });

  const failed = await poller.run();

  assert.equal(failed.errorsCount, 1);
  assert.equal(poller.hubspot.requestsFor(CASE_TYPE).length, 2);
  assert.equal(failed.sweep.done, false);
  assert.deepEqual(recordIds(poller.queues.employee), ["21"]);
  assert.equal(poller.logs.filter((entry) => entry.level === "error")[0].meta.error.code, "HUBSPOT_READ_FAILED");

  poller.setNow("2026-11-20T09:00:00.000Z");
  const again = await poller.run();
  assert.equal(again.errorsCount, 0);
  assert.equal(again.sweep.done, true);
  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
});

// ---------------------------------------------------------------------------------------------
// A-R7: a run with a failed object shows as failed in Azure
// ---------------------------------------------------------------------------------------------

test("[BR14][3.3] a run with a failed object makes the timer function throw, after every object has run and saved its checkpoint", async () => {
  const poller = setupPoller({ now: NOW });
  const recent = poller.minutesAgo(30);
  poller.hubspot.add(CASE_TYPE, "1", gated({ client_id_number: "5001", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", gated({ employee_id: "7001", hs_lastmodifieddate: recent }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ employee_id: "7002", hs_lastmodifieddate: recent }));
  poller.hubspot.fail(CASE_TYPE, new Error("socket hang up"), 1);

  await assert.rejects(intakePoller({}, {}, poller.dependencies), /1 error/);

  assert.deepEqual(recordIds(poller.queues.employee), ["11", "21"]);
  assert.equal(poller.checkpoint("bt_rbt").data.checkpoint, poller.minutesAgo(5));
  assert.equal(poller.checkpoint("bcba").data.checkpoint, poller.minutesAgo(5));
  assert.equal(poller.checkpoint("client").data.checkpoint, poller.minutesAgo(60));
  // The lease is released, so the next run is not held up.
  assert.equal(poller.container.get("workflow:intake-poller", `${SANDBOX_PORTAL}:active-lease`), null);

  // The next run has no error: the Case is queued and the function does not throw.
  await intakePoller({}, {}, poller.dependencies);
  assert.deepEqual(dealIds(poller.queues.client), ["1"]);
});

// ---------------------------------------------------------------------------------------------
// A-R8: the search for another record that holds the CR ID
// ---------------------------------------------------------------------------------------------

test("[BR16][3.3] findHubSpotRecordsByEmployeeId throws on an answer with no results list, instead of reading it as \"no other record\"", async () => {
  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  const search = (data) => {
    client.defaults.adapter = answeringPortalCheck(async (requestConfig) => ({ status: 200, headers: {}, config: requestConfig, data }));
    return findHubSpotRecordsByEmployeeId({
      bcbaObjectTypeId: SANDBOX_BCBA_TYPE,
      btRbtObjectTypeId: SANDBOX_BT_TYPE,
      employeeId: "7001",
      excludeRecordId: "11"
    });
  };

  for (const data of [{}, { results: null }, { total: 0 }]) {
    await assert.rejects(search(data), (error) => error.code === "HUBSPOT_READ_FAILED");
  }
  // A real answer is still read: an empty list is "no other record", and a row is a holder.
  assert.deepEqual(await search({ results: [] }), []);
  assert.deepEqual(await search({ results: [{ id: "11" }, { id: "12" }] }), [
    { id: "12", objectTypeId: SANDBOX_BCBA_TYPE },
    { id: "12", objectTypeId: SANDBOX_BT_TYPE }
  ]);
});

// ---------------------------------------------------------------------------------------------
// A-R9: the hourly half of BR10
// ---------------------------------------------------------------------------------------------

test("[BR10][3.2] a linked waiting employee whose workday_id or checklist changes is found by the hourly search", async () => {
  const poller = setupPoller({ now: NOW });
  const old = "2026-11-10T12:00:00.000Z";
  // Created with the temporary External System ID: linked, and waiting for the Workday ID.
  poller.hubspot.add(SANDBOX_BT_TYPE, "11", gated({ employee_id: "7001", last_sync_status: "waiting", hs_lastmodifieddate: old }));
  poller.hubspot.add(SANDBOX_BCBA_TYPE, "21", gated({ employee_id: "7002", last_sync_status: "waiting", hs_lastmodifieddate: old }));
  poller.hubspot.add(SANDBOX_BT_TYPE, "12", gated({ employee_id: "7003", last_sync_status: "waiting", hs_lastmodifieddate: old }));

  await poller.run();
  assert.equal(poller.queues.employee.length, 0);

  // Staff fill the Workday ID on one record and tick the checklist on the other. HubSpot moves
  // hs_lastmodifieddate on both. Record 12 is not touched.
  poller.setNow("2026-11-20T07:00:00.000Z");
  poller.hubspot.set(SANDBOX_BT_TYPE, "11", { workday_id: "1000001", hs_lastmodifieddate: poller.minutesAgo(40) });
  poller.hubspot.set(SANDBOX_BCBA_TYPE, "21", {
    bcba_in_cr_checklist: "External System ID",
    hs_lastmodifieddate: poller.minutesAgo(20)
  });
  await poller.run();

  assert.deepEqual(
    bodies(poller.queues.employee).map((body) => [body.recordId, body.employeeType, body.source]),
    [
      ["11", "bt_rbt", "employeePoller"],
      ["21", "bcba", "employeePoller"]
    ]
  );
});

// ---------------------------------------------------------------------------------------------
// The same class as A-R5 and A-R6: an answer that would make the poller go round in circles
// ---------------------------------------------------------------------------------------------

test("[BR16][3.2] a page that holds a record older than the search asked for is a failed read: nothing is queued", async () => {
  const poller = setupPoller({ now: NOW });
  poller.hubspot.answerAt(CASE_TYPE, 1, {
    results: [
      { id: "1", properties: { hs_object_id: "1", hs_lastmodifieddate: poller.minutesAgo(90) } },
      { id: "2", properties: { hs_object_id: "2", hs_lastmodifieddate: poller.minutesAgo(30) } }
    ],
    paging: { next: { after: "2" } }
  });

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 1);
  assert.equal(poller.queues.client.length, 0);
  assert.equal(poller.hubspot.requestsFor(CASE_TYPE).length, 1);
  assert.equal(poller.checkpoint("client").data.checkpoint, poller.minutesAgo(60));
  assert.equal(poller.logs.filter((entry) => entry.level === "error")[0].meta.error.code, "HUBSPOT_READ_FAILED");
});

test("[BR16][3.5] a sweep page that does not go on after the last record ID is a failed read, not an endless sweep", async () => {
  const poller = setupPoller({ now: "2026-11-20T08:00:00.000Z" });
  const samePage = { results: [{ id: "5", properties: { hs_object_id: "5" } }], paging: { next: { after: "1" } } };
  // The second and the third Case search of the run are sweep pages. HubSpot answers both with
  // the same record.
  poller.hubspot.answerAt(CASE_TYPE, 2, samePage);
  poller.hubspot.answerAt(CASE_TYPE, 3, samePage);

  const summary = await poller.run();

  assert.equal(summary.errorsCount, 1);
  assert.equal(poller.hubspot.requestsFor(CASE_TYPE).length, 3);
  assert.deepEqual(dealIds(poller.queues.client), ["5"]);
  assert.equal(summary.sweep.done, false);
});
