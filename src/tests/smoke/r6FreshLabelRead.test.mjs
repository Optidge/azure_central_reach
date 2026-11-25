// R-6: a fresh read of the contact's labels before every label POST (requirement BR19).
//
// Zeke, 2026-11-25: "12 no, please resolve this so our labels are added correctly." and then
// "Do a fresh read of the labels, then, please." (BUILD-PACKAGE-DRAFT-2026-11-23.md, "Eighth set,
// label read-lag fix chosen (R-6)"). The fix is Option 1 of r6-label-read-lag-options-2026-11-25.md:
// every read of the contact's labels asks CentralReach for a fresh answer (headers
// Cache-Control: no-cache and Pragma: no-cache, and a throwaway query value _t=<ms>).
//
// The fake CentralReach below has the read cache the options note suspects: a plain label read
// answers what the last plain read of that contact answered; only a fresh read sees the labels
// CentralReach holds now. With the old plain read, the staff-edit tests here fail.
//
// Not proven by these tests: that CentralReach itself honours the fresh read for a label edited
// on the CentralReach screen. That live test is paused on Zeke's word.
import test from "node:test";
import assert from "node:assert/strict";
import { updateClientMetadata } from "../../lib/centralReachClient.mjs";
import { LABEL_POST_WINDOW_SECONDS } from "../../lib/retry.mjs";
import { fakeCentralReach, httpError, timeoutError } from "./stage2Fakes.mjs";

const LABELS_GET = "GET /contacts/{id}/labels";
const LABELS_POST = "POST /contacts/{id}/labels";
const CATALOG_GET = "GET /contacts/labels";

// Section 9.2 client labels. School is a CentralReach label staff set by hand ([G07B]); the
// integration neither maps nor manages it.
const ALL_CLIENTS = 1052619;
const NY_CLIENT = 1082499;
const ACTIVE_CLIENT = 1125427;
const IN_ACTIVE_CLIENT = 1121488;
const SERVICES_97151 = 1156743;
const STAFFED_97153 = 1156746;
const SCHOOL = 1052688;
const CLINIC = 1052655;
const CLIENT_MANAGED = [NY_CLIENT, ACTIVE_CLIENT, IN_ACTIVE_CLIENT, SERVICES_97151, STAFFED_97153];

const CLIENT = "2001";

const sorted = (ids) => [...ids].sort((a, b) => a - b);
const secondsAgo = (seconds) => new Date(Date.now() - seconds * 1000).toISOString();
const labelsAnswer = (ids) => ({ labels: ids.map((labelId) => ({ labelId })) });

function sendLabels(options) {
  return updateClientMetadata(CLIENT, {}, { labelReadBackDelayMs: 0, ...options });
}

function header(headers, name) {
  if (!headers) {
    return undefined;
  }
  return typeof headers.get === "function" ? headers.get(name) : headers[name];
}

function isFreshRead(request) {
  return (
    header(request.headers, "Cache-Control") === "no-cache" &&
    header(request.headers, "Pragma") === "no-cache" &&
    Number.isInteger(request.params?._t)
  );
}

// The suspected cache: a plain read is answered from the last plain read of the contact. Returns
// the log of every request, in order, as { name, fresh, body }.
function withReadCache(cr) {
  const log = [];
  let cached = null;
  cr.onRequest = (name, request) => {
    log.push({ name, fresh: isFreshRead(request), body: request.body, t: request.params?._t });
    if (name !== LABELS_GET || isFreshRead(request)) {
      return;
    }
    if (cached) {
      cr.answer(LABELS_GET, labelsAnswer(cached));
    } else {
      cached = [...(cr.labels.get(CLIENT) || [])];
    }
  };
  return log;
}

function postBodies(cr) {
  return cr.calls
    .filter((call) => call.name === LABELS_POST)
    .map((call) => call.body.labels.map((item) => item.labelId));
}

// An earlier read of the contact's labels, as a run that changes no label makes (skip_present).
async function earlierRead(held) {
  const { labelResult } = await sendLabels({ labelIds: held, managedLabelIds: CLIENT_MANAGED });
  assert.equal(labelResult.operation, "skip_present");
}

test("[BR19][L.2] R-6: a label staff add after an earlier read is kept in the POST body", async () => {
  const cr = fakeCentralReach();
  withReadCache(cr);
  const held = [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, SERVICES_97151];
  cr.labels.set(CLIENT, held);
  await earlierRead(held);

  // Staff add School on the CentralReach screen; then staffing_status changes in HubSpot.
  cr.labels.set(CLIENT, [...held, SCHOOL]);
  const required = [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, STAFFED_97153];
  const { labelResult } = await sendLabels({ labelIds: required, managedLabelIds: CLIENT_MANAGED });

  assert.equal(labelResult.operation, "updated");
  assert.deepEqual(postBodies(cr).map(sorted), [sorted([...required, SCHOOL])]);
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted([...required, SCHOOL]));
});

test("[BR19][L.2] R-6: a label staff remove after an earlier read is not put back by the POST", async () => {
  const cr = fakeCentralReach();
  withReadCache(cr);
  const held = [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, SCHOOL];
  cr.labels.set(CLIENT, held);
  await earlierRead([ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT]);

  // Staff remove School; then the Case goes Warm to Cold in HubSpot.
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT]);
  const required = [ALL_CLIENTS, NY_CLIENT, IN_ACTIVE_CLIENT];
  await sendLabels({ labelIds: required, managedLabelIds: CLIENT_MANAGED });

  assert.deepEqual(postBodies(cr).map(sorted), [sorted(required)]);
  assert.equal(cr.labels.get(CLIENT).includes(SCHOOL), false);
});

test("[BR19][L.3] R-6: every read of the contact's labels is the fresh read, and one is made just before each POST", async () => {
  const cr = fakeCentralReach();
  const log = withReadCache(cr);
  const startedAt = Date.now();
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, SERVICES_97151]);
  // A first POST that times out unapplied, then the retry after the window posts again.
  cr.fail(LABELS_POST, timeoutError());
  const options = { labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153], managedLabelIds: CLIENT_MANAGED };
  const thrown = await sendLabels(options).catch((error) => error);
  assert.ok(thrown.labelPost);
  await sendLabels({
    ...options,
    lastLabelPost: { ...thrown.labelPost, postedAt: secondsAgo(LABEL_POST_WINDOW_SECONDS + 1) }
  });

  const posts = log.flatMap((entry, index) => (entry.name === LABELS_POST ? [index] : []));
  assert.equal(posts.length, 2);
  for (const postIndex of posts) {
    const reads = log.slice(0, postIndex).filter((entry) => entry.name === LABELS_GET);
    assert.equal(reads.at(-1).fresh, true);
    // Only the catalog read may sit between the fresh read and the POST.
    const lastRead = log.slice(0, postIndex).map((entry) => entry.name).lastIndexOf(LABELS_GET);
    assert.deepEqual(
      log.slice(lastRead + 1, postIndex).map((entry) => entry.name),
      [CATALOG_GET]
    );
  }
  const contactReads = log.filter((entry) => entry.name === LABELS_GET);
  assert.equal(contactReads.length > 2, true);
  assert.equal(contactReads.every((entry) => entry.fresh), true);
  // _t is the time of the call (ms), so it is not a constant a cache could key on.
  const finishedAt = Date.now();
  for (const entry of contactReads) {
    assert.equal(entry.t >= startedAt && entry.t <= finishedAt, true, `_t ${entry.t} is within the test window`);
  }
  // The catalog is not the contact's labels: a plain read.
  assert.equal(log.filter((entry) => entry.name === CATALOG_GET).every((entry) => !entry.fresh), true);
});

test("[BR19][L.3] R-6: the retry after a POST reads again before it posts, keeping a label staff added in between", async () => {
  const cr = fakeCentralReach();
  const log = withReadCache(cr);
  const held = [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, SERVICES_97151];
  cr.labels.set(CLIENT, held);
  const required = [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, STAFFED_97153];
  const options = { labelIds: required, managedLabelIds: CLIENT_MANAGED };
  cr.fail(LABELS_POST, timeoutError());
  const thrown = await sendLabels(options).catch((error) => error);
  // The worker saves thrown.labelPost as lastLabelPost; it holds the set the first run worked out.
  assert.deepEqual(sorted(thrown.labelPost.labelIds), sorted(required));

  // Staff add Clinic and School before the retry comes in.
  cr.labels.set(CLIENT, [...held, SCHOOL, CLINIC]);

  // Inside the window: no POST, and the saved set is never posted.
  const logLengthBefore = log.length;
  const inside = await sendLabels({ ...options, lastLabelPost: thrown.labelPost });
  assert.equal(inside.labelResult.operation, "skip_window");
  // The read made inside the window (no POST follows it) is the fresh read too.
  const insideReads = log.slice(logLengthBefore).filter((entry) => entry.name === LABELS_GET);
  assert.equal(insideReads.length > 0, true);
  assert.equal(insideReads.every((entry) => entry.fresh), true);
  assert.equal(postBodies(cr).length, 1);

  // After the window: read again, then post.
  const readsBefore = cr.count(LABELS_GET);
  const after = await sendLabels({
    ...options,
    lastLabelPost: { ...thrown.labelPost, postedAt: secondsAgo(LABEL_POST_WINDOW_SECONDS + 1) }
  });
  assert.equal(after.labelResult.operation, "updated");
  assert.equal(cr.count(LABELS_GET) > readsBefore, true);
  assert.deepEqual(postBodies(cr).map(sorted), [
    sorted(required),
    sorted([...required, SCHOOL, CLINIC])
  ]);
});

test("[BR19][BR16][L.2] R-6: a fresh read that fails, cannot be read or comes back empty sends no POST", async () => {
  const held = [ALL_CLIENTS, NY_CLIENT, SERVICES_97151];
  const options = { labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153], managedLabelIds: CLIENT_MANAGED };
  const cases = [
    ["timeout", (cr) => cr.fail(LABELS_GET, timeoutError()), (error) => error.code === "ECONNABORTED"],
    ["404", (cr) => cr.fail(LABELS_GET, httpError(404)), (error) => error.response?.status === 404],
    ["unreadable", (cr) => cr.answer(LABELS_GET, { items: "x" }), (error) => error.code === "CR_LABEL_READ_FAILED"],
    ["empty", (cr) => cr.answer(LABELS_GET, labelsAnswer([])), (error) => error.code === "CR_LABEL_READ_EMPTY"]
  ];
  for (const [name, breakRead, expectedError] of cases) {
    const cr = fakeCentralReach();
    withReadCache(cr);
    cr.labels.set(CLIENT, held);
    // An earlier good read exists; it must never stand in for the failed fresh read.
    await earlierRead(held);
    breakRead(cr);
    await assert.rejects(sendLabels(options), expectedError, name);
    assert.equal(cr.count(LABELS_POST), 0, name);
    assert.equal(cr.count(CATALOG_GET), 0, name);
    assert.deepEqual(cr.labels.get(CLIENT), held, name);
  }
});

test("[BR19][L.2] R-6: when the fresh read shows nothing to change, no POST is sent", async () => {
  const cr = fakeCentralReach();
  withReadCache(cr);
  const required = [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, STAFFED_97153];
  // The earlier read shows the old staffing label, so a stale read would post.
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, SERVICES_97151]);
  await earlierRead([ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, SERVICES_97151]);
  cr.labels.set(CLIENT, [...required, SCHOOL]);

  const { labelResult } = await sendLabels({ labelIds: required, managedLabelIds: CLIENT_MANAGED });
  assert.equal(labelResult.operation, "skip_present");
  assert.equal(labelResult.confirmed, true);
  assert.equal(cr.count(LABELS_POST), 0);
  assert.equal(cr.count(CATALOG_GET), 0);
});

test("[BR19][L.3] R-6: the fresh read adds no CentralReach call to a label write", async () => {
  // One fresh read, the catalog, the POST and one read-back: the same four calls as before R-6.
  const cr = fakeCentralReach();
  withReadCache(cr);
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, SERVICES_97151]);
  await sendLabels({
    labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.deepEqual(
    cr.calls.map((call) => call.name),
    [LABELS_GET, CATALOG_GET, LABELS_POST, LABELS_GET]
  );
});
