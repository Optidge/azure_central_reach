// Lane L, rows L.1 to L.4: the label sender (BUILD-PLAN rule 5.6, requirement BR19).
//
// Guide rows these tests are written from (guide-extract-2026-11-20.md):
// - [G19]: only 97151 Services, Staffed 97153 and X 97153 stay; the three retired staffing labels
//   are never sent.
// - [G07]: "Send the matching staffing label and remove the previous one when the value changes";
//   a client holds one of Active / Inactive at a time.
// - [G08]: Billing Hold: "Remove the label when it goes back to No."
// - The label test of 2026-11-20 (BUILD-PLAN section 4): the POST replaces the whole set, an empty
//   list clears every label, and a read can be about two minutes behind a write.
//
// Every test runs the real centralReachClient.mjs against the fake HTTP adapter. Label IDs are
// the ones in BUILD-PLAN section 9.
import test from "node:test";
import assert from "node:assert/strict";
import { updateClientMetadata } from "../../lib/centralReachClient.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { fakeCentralReach, httpError, timeoutError } from "./stage2Fakes.mjs";

const LABELS_GET = "GET /contacts/{id}/labels";
const LABELS_POST = "POST /contacts/{id}/labels";
const CATALOG_GET = "GET /contacts/labels";
const METADATA_PUT = "PUT /contacts/{id}/metadata/{fieldId}";

// Client labels (section 9.2).
const ALL_CLIENTS = 1052619;
const NY_CLIENT = 1082499;
const NJ_CLIENT = 1132647;
const CO_CLIENT = 1132648;
const HOME = 1052656;
const ACTIVE_CLIENT = 1125427;
const IN_ACTIVE_CLIENT = 1121488;
const SERVICES_97151 = 1156743;
const STAFFED_97153 = 1156746;
const X_97153 = 1156747;
const STAFFING_PARENT = 1156741;
const RETIRED_PENDING_97151 = 1156742;
const RETIRED_PENDING_97153 = 1156744;
const RETIRED_STARTING_97153 = 1156745;
// CR labels held on a contact but outside the managed list a test passes ([G07B] School; Aetna).
const SCHOOL = 1052688;
const AETNA = 1107649;
// Employee labels (sections 9.3 and 9.4).
const ALL_EMPLOYEES = 1052618;
const CLINICAL = 1052643;
const BCBA_HEADER = 1130668;
const NY_EMPLOYEE = 1132655;
const BT_NY = 1052630;
const RBT_NY = 1052631;
const BILLING_HOLD = 1103437;
const BCBA_LBA_NY = 1052629;
const GRAD_STUDENT_LBA_NY = 1092164;

// The Case managed list of section 9.2: CL1 to CL4, with the three retired staffing IDs.
const CLIENT_MANAGED = [
  NY_CLIENT,
  NJ_CLIENT,
  CO_CLIENT,
  HOME,
  ACTIVE_CLIENT,
  IN_ACTIVE_CLIENT,
  SERVICES_97151,
  STAFFED_97153,
  X_97153,
  RETIRED_PENDING_97151,
  RETIRED_PENDING_97153,
  RETIRED_STARTING_97153
];

const CLIENT = "2001";
const EMPLOYEE = "5338681";

const sorted = (ids) => [...ids].sort((a, b) => a - b);
const secondsAgo = (seconds) => new Date(Date.now() - seconds * 1000).toISOString();
const labelsAnswer = (ids) => ({ labels: ids.map((labelId) => ({ labelId })) });

// No test waits five seconds: the read-back wait is set to 0 unless a test says otherwise.
function sendLabels(contactId, options) {
  return updateClientMetadata(contactId, {}, { labelReadBackDelayMs: 0, ...options });
}

function postBodies(cr) {
  return cr.calls.filter((call) => call.name === LABELS_POST).map((call) => call.body);
}

// --- L.1: only known IDs are sent, and never an empty list ---

test("[BR19][L.1] a required label outside the sendable list is never posted: CR_LABEL_NOT_SENDABLE, permanent", async () => {
  for (const notSendable of [STAFFING_PARENT, RETIRED_PENDING_97151, SCHOOL, 999999999]) {
    const cr = fakeCentralReach();
    cr.labels.set(CLIENT, [ALL_CLIENTS]);
    let thrown = null;
    await assert.rejects(
      sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, notSendable], managedLabelIds: CLIENT_MANAGED }),
      (error) => {
        thrown = error;
        return error.code === "CR_LABEL_NOT_SENDABLE";
      }
    );
    assert.equal(classifyFailure(thrown), FAILURE_KINDS.PERMANENT);
    assert.equal(cr.count(LABELS_POST), 0);
    assert.deepEqual(cr.labels.get(CLIENT), [ALL_CLIENTS]);
  }
});

test("[BR19][L.1] a required label outside the sendable list stops the run inside the 150-second window too", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS]);
  await assert.rejects(
    sendLabels(CLIENT, {
      labelIds: [ALL_CLIENTS, STAFFING_PARENT],
      lastLabelPost: { contactId: CLIENT, labelIds: [ALL_CLIENTS], postedAt: secondsAgo(30) }
    }),
    (error) => error.code === "CR_LABEL_NOT_SENDABLE"
  );
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][L.1] a required label the live catalog does not hold is not posted: CR_LABEL_NOT_IN_CATALOG, retried", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT]);
  cr.catalog = [ALL_CLIENTS, NY_CLIENT];
  let thrown = null;
  await assert.rejects(
    sendLabels(CLIENT, {
      labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153],
      managedLabelIds: CLIENT_MANAGED
    }),
    (error) => {
      thrown = error;
      return error.code === "CR_LABEL_NOT_IN_CATALOG";
    }
  );
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  assert.equal(cr.count(CATALOG_GET), 1);
  assert.equal(cr.count(LABELS_POST), 0);
  assert.deepEqual(cr.labels.get(CLIENT), [ALL_CLIENTS, NY_CLIENT]);
});

test("[BR19][L.1] a label CentralReach's own read returned that the catalog does not hold blocks the post", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, SCHOOL]);
  cr.catalog = [ALL_CLIENTS, NY_CLIENT];
  await assert.rejects(
    sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT], managedLabelIds: CLIENT_MANAGED }),
    (error) => error.code === "CR_LABEL_NOT_IN_CATALOG"
  );
  assert.equal(cr.count(LABELS_POST), 0);
  assert.deepEqual(cr.labels.get(CLIENT), [ALL_CLIENTS, SCHOOL]);
});

test("[BR19][CL4][L.1] a remove-only ID that CentralReach holds is left out of the post and does not block it", async () => {
  // BUILD-PLAN section 4, Stage P: Pending 97153 and Starting 97153 are no longer in the catalog.
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, RETIRED_PENDING_97153, RETIRED_STARTING_97153]);
  cr.catalog = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  const summary = await sendLabels(CLIENT, {
    labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.equal(summary.labelResult.operation, "updated");
  assert.equal(cr.count(LABELS_POST), 1);
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted([ALL_CLIENTS, NY_CLIENT, STAFFED_97153]));
});

test("[BR19][L.1] an empty set is never posted", async () => {
  // The label test of 2026-11-20: an empty list clears every label on the contact.
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [NY_CLIENT, STAFFED_97153]);
  const summary = await sendLabels(CLIENT, { labelIds: [], managedLabelIds: CLIENT_MANAGED });
  assert.equal(summary.labelResult.operation, "skip_empty");
  assert.equal(summary.labelResult.postedLabelIds, null);
  assert.equal(cr.count(LABELS_POST), 0);
  assert.deepEqual(cr.labels.get(CLIENT), [NY_CLIENT, STAFFED_97153]);
});

test("[BR19][L.1] the catalog is read once, and only by a run that posts", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT]);
  await sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT], managedLabelIds: CLIENT_MANAGED });
  assert.equal(cr.count(CATALOG_GET), 0);

  await sendLabels(CLIENT, {
    labelIds: [ALL_CLIENTS, NY_CLIENT, HOME],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.equal(cr.count(CATALOG_GET), 1);
  assert.equal(cr.count(LABELS_POST), 1);
});

test("[BR19][L.1] a catalog answer the code cannot read posts nothing: CR_LABEL_CATALOG_UNREADABLE, permanent", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS]);
  cr.answer(CATALOG_GET, { items: "unexpected" });
  let thrown = null;
  await assert.rejects(
    sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT] }),
    (error) => {
      thrown = error;
      return error.code === "CR_LABEL_CATALOG_UNREADABLE";
    }
  );
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.PERMANENT);
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][BR16][L.1] a catalog read that fails posts nothing and is retried", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS]);
  cr.fail(CATALOG_GET, timeoutError());
  let thrown = null;
  await assert.rejects(sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT] }), (error) => {
    thrown = error;
    return true;
  });
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][L.1] when the label step throws, no metadata field is written", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS]);
  await assert.rejects(
    updateClientMetadata(CLIENT, { 126214: "Denial" }, { labelIds: [ALL_CLIENTS, STAFFING_PARENT] }),
    (error) => error.code === "CR_LABEL_NOT_SENDABLE"
  );
  assert.equal(cr.count(METADATA_PUT), 0);
});

// --- L.2: what CentralReach holds, minus managed, plus required ---

test("[BR19][CL4][L.2] staffing_status 97151 Services to Staffed 97153: the previous staffing label is left out of the post", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, SERVICES_97151]);
  const expected = [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, STAFFED_97153];
  const summary = await sendLabels(CLIENT, { labelIds: expected, managedLabelIds: CLIENT_MANAGED });
  assert.equal(summary.labelResult.operation, "updated");
  assert.deepEqual(sorted(summary.labelResult.postedLabelIds), sorted(expected));
  assert.equal(cr.count(LABELS_POST), 1);
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted(expected));
});

test("[BR19][CL4][L.2] a blank staffing_status removes the staffing label and keeps the rest", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT, X_97153]);
  await sendLabels(CLIENT, {
    labelIds: [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted([ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT]));
});

test("[BR19][CL3][L.2] case_status Warm to Cold: Active Client is replaced by In-Active Client in one post", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, ACTIVE_CLIENT]);
  await sendLabels(CLIENT, {
    labelIds: [ALL_CLIENTS, NY_CLIENT, IN_ACTIVE_CLIENT],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.equal(cr.count(LABELS_POST), 1);
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted([ALL_CLIENTS, NY_CLIENT, IN_ACTIVE_CLIENT]));
});

test("[BR19][BL7][L.2] Billing Hold is removed when cr_billing_hold_label goes back to No", async () => {
  const cr = fakeCentralReach();
  const base = [ALL_EMPLOYEES, CLINICAL, BCBA_HEADER, NY_EMPLOYEE];
  cr.labels.set(EMPLOYEE, [...base, BILLING_HOLD]);
  await sendLabels(EMPLOYEE, { labelIds: base, managedLabelIds: [NY_EMPLOYEE, BILLING_HOLD] });
  assert.equal(cr.count(LABELS_POST), 1);
  assert.deepEqual(sorted(cr.labels.get(EMPLOYEE)), sorted(base));
});

test("[BR19][TL3][L.2] a BT who becomes an RBT in New York: Behavior Technician NY is replaced by RBT NY", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(EMPLOYEE, [ALL_EMPLOYEES, BT_NY, CLINICAL, NY_EMPLOYEE]);
  await sendLabels(EMPLOYEE, {
    labelIds: [ALL_EMPLOYEES, CLINICAL, NY_EMPLOYEE, RBT_NY],
    managedLabelIds: [NY_EMPLOYEE, BT_NY, RBT_NY]
  });
  assert.deepEqual(
    sorted(cr.labels.get(EMPLOYEE)),
    sorted([ALL_EMPLOYEES, CLINICAL, NY_EMPLOYEE, RBT_NY])
  );
});

// LBL-024 and LBL-060, the reverse direction: each swap is one POST with the old label left out.
test("[BR19][L.2] an RBT who becomes a BT in New York, and a BCBA whose licence goes from Yes to Grad Permit, each get one POST with the old label out", async () => {
  const bt = fakeCentralReach();
  bt.labels.set(EMPLOYEE, [ALL_EMPLOYEES, CLINICAL, NY_EMPLOYEE, RBT_NY]);
  const btRequired = [ALL_EMPLOYEES, CLINICAL, NY_EMPLOYEE, BT_NY];
  const btSummary = await sendLabels(EMPLOYEE, {
    labelIds: btRequired,
    managedLabelIds: [NY_EMPLOYEE, BT_NY, RBT_NY]
  });
  assert.equal(bt.count(LABELS_POST), 1);
  assert.deepEqual(sorted(btSummary.labelResult.postedLabelIds), sorted(btRequired));
  assert.deepEqual(sorted(bt.labels.get(EMPLOYEE)), sorted(btRequired));

  const bcba = fakeCentralReach();
  bcba.labels.set(EMPLOYEE, [ALL_EMPLOYEES, CLINICAL, BCBA_HEADER, NY_EMPLOYEE, BCBA_LBA_NY]);
  const bcbaRequired = [ALL_EMPLOYEES, CLINICAL, BCBA_HEADER, NY_EMPLOYEE, GRAD_STUDENT_LBA_NY];
  const bcbaSummary = await sendLabels(EMPLOYEE, {
    labelIds: bcbaRequired,
    managedLabelIds: [NY_EMPLOYEE, BCBA_LBA_NY, GRAD_STUDENT_LBA_NY]
  });
  assert.equal(bcba.count(LABELS_POST), 1);
  assert.deepEqual(sorted(bcbaSummary.labelResult.postedLabelIds), sorted(bcbaRequired));
  assert.deepEqual(sorted(bcba.labels.get(EMPLOYEE)), sorted(bcbaRequired));
});

test("[BR19][L.2] a staff label the integration does not map is kept", async () => {
  // Client: School is a CR label with no HubSpot option ([G07B]). Employee: Aetna is not in the
  // managed list this call passes.
  const client = fakeCentralReach();
  client.labels.set(CLIENT, [ALL_CLIENTS, SCHOOL, SERVICES_97151]);
  await sendLabels(CLIENT, {
    labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.deepEqual(
    sorted(client.labels.get(CLIENT)),
    sorted([ALL_CLIENTS, SCHOOL, NY_CLIENT, STAFFED_97153])
  );

  const employee = fakeCentralReach();
  employee.labels.set(EMPLOYEE, [ALL_EMPLOYEES, CLINICAL, BCBA_HEADER, AETNA, BILLING_HOLD]);
  await sendLabels(EMPLOYEE, {
    labelIds: [ALL_EMPLOYEES, CLINICAL, BCBA_HEADER, NY_EMPLOYEE],
    managedLabelIds: [NY_EMPLOYEE, BILLING_HOLD]
  });
  assert.deepEqual(
    sorted(employee.labels.get(EMPLOYEE)),
    sorted([ALL_EMPLOYEES, CLINICAL, BCBA_HEADER, AETNA, NY_EMPLOYEE])
  );
});

test("[BR19][L.2] nothing to change: no POST, no catalog read, confirmed is true", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [SCHOOL, ALL_CLIENTS, NY_CLIENT, STAFFED_97153]);
  const summary = await sendLabels(CLIENT, {
    labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.deepEqual(summary.labelResult, {
    operation: "skip_present",
    postedLabelIds: null,
    postedAt: null,
    confirmed: true
  });
  assert.equal(cr.count(LABELS_GET), 1);
  assert.equal(cr.count(CATALOG_GET), 0);
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][L.2] with an empty managed list nothing is removed", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, SERVICES_97151, SCHOOL]);
  await sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT], managedLabelIds: [] });
  assert.deepEqual(
    sorted(cr.labels.get(CLIENT)),
    sorted([ALL_CLIENTS, SERVICES_97151, SCHOOL, NY_CLIENT])
  );
});

test("[BR19][BR16][L.2] an empty read for a contact this run did not create posts nothing: CR_LABEL_READ_EMPTY, retried", async () => {
  const cr = fakeCentralReach();
  let thrown = null;
  await assert.rejects(
    sendLabels(EMPLOYEE, {
      labelIds: [ALL_EMPLOYEES, CLINICAL, BT_NY, NY_EMPLOYEE],
      contactCreatedThisRun: false
    }),
    (error) => {
      thrown = error;
      return error.code === "CR_LABEL_READ_EMPTY";
    }
  );
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  assert.equal(cr.count(CATALOG_GET), 0);
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][L.2] an empty read is taken as no labels when contactCreatedThisRun is true: the required labels are posted", async () => {
  // Covers a new contact and a run that links to its own earlier create (labelsPending, SP-R4).
  const cr = fakeCentralReach();
  const required = [ALL_EMPLOYEES, CLINICAL, BT_NY, NY_EMPLOYEE];
  const summary = await sendLabels(EMPLOYEE, {
    labelIds: required,
    managedLabelIds: [NY_EMPLOYEE, BT_NY, RBT_NY],
    contactCreatedThisRun: true
  });
  assert.equal(summary.labelResult.operation, "updated");
  assert.equal(summary.labelResult.confirmed, true);
  assert.deepEqual(sorted(cr.labels.get(EMPLOYEE)), sorted(required));
});

test("[BR19][BR16][L.2] a failed label read makes no POST", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS]);
  cr.fail(LABELS_GET, timeoutError());
  let thrown = null;
  await assert.rejects(sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT] }), (error) => {
    thrown = error;
    return true;
  });
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][BR16][L.2] a label read the code cannot read makes no POST: CR_LABEL_READ_FAILED, permanent", async () => {
  const cr = fakeCentralReach();
  cr.answer(LABELS_GET, { labels: [{ name: "no id" }] });
  let thrown = null;
  await assert.rejects(sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT] }), (error) => {
    thrown = error;
    return error.code === "CR_LABEL_READ_FAILED";
  });
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.PERMANENT);
  assert.equal(cr.count(LABELS_POST), 0);
});

// --- L.3: a POST is confirmed by reading it back; a read can lag ---

test("[BR19][L.3] the read shows the posted set: postedLabelIds, postedAt and confirmed true are returned", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, SERVICES_97151]);
  const expected = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  const before = Date.now();
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: expected,
    managedLabelIds: CLIENT_MANAGED
  });
  assert.equal(labelResult.operation, "updated");
  assert.deepEqual(sorted(labelResult.postedLabelIds), sorted(expected));
  assert.equal(labelResult.postedLabelIds.every((id) => typeof id === "number"), true);
  assert.equal(labelResult.postedAt, new Date(labelResult.postedAt).toISOString());
  assert.equal(Date.parse(labelResult.postedAt) >= before, true);
  assert.equal(Date.parse(labelResult.postedAt) <= Date.now(), true);
  assert.equal(labelResult.confirmed, true);
  // One read before the POST and one read-back.
  assert.equal(cr.count(LABELS_GET), 2);
});

test("[BR19][L.3] the read lags: three read-backs, then confirmed false with the posted set and its time", async () => {
  const cr = fakeCentralReach();
  const old = [ALL_CLIENTS, NY_CLIENT, SERVICES_97151];
  cr.labels.set(CLIENT, old);
  const expected = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  cr.onRequest = (name) => {
    if (name === LABELS_POST) {
      // The label test of 2026-11-20: the read kept showing the old set for about two minutes.
      for (let index = 0; index < 3; index += 1) {
        cr.answer(LABELS_GET, labelsAnswer(old));
      }
    }
  };
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: expected,
    managedLabelIds: CLIENT_MANAGED
  });
  assert.equal(labelResult.operation, "updated");
  assert.equal(labelResult.confirmed, false);
  assert.deepEqual(sorted(labelResult.postedLabelIds), sorted(expected));
  assert.equal(typeof labelResult.postedAt, "string");
  assert.equal(cr.count(LABELS_POST), 1);
  assert.equal(cr.count(LABELS_GET), 4);
});

test("[BR19][L.3] the read shows the set on the third read-back: confirmed true", async () => {
  const cr = fakeCentralReach();
  const old = [ALL_CLIENTS, NY_CLIENT, SERVICES_97151];
  cr.labels.set(CLIENT, old);
  cr.onRequest = (name) => {
    if (name === LABELS_POST) {
      cr.answer(LABELS_GET, labelsAnswer(old));
      cr.answer(LABELS_GET, labelsAnswer(old));
    }
  };
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.equal(labelResult.confirmed, true);
  assert.equal(cr.count(LABELS_POST), 1);
  assert.equal(cr.count(LABELS_GET), 4);
});

test("[BR19][L.3] the read-backs are labelReadBackDelayMs apart", async () => {
  const cr = fakeCentralReach();
  const old = [ALL_CLIENTS, SERVICES_97151];
  cr.labels.set(CLIENT, old);
  const readTimes = [];
  cr.onRequest = (name) => {
    if (name === LABELS_POST) {
      cr.answer(LABELS_GET, labelsAnswer(old));
      cr.answer(LABELS_GET, labelsAnswer(old));
      cr.answer(LABELS_GET, labelsAnswer(old));
    }
    if (name === LABELS_GET) {
      readTimes.push(Date.now());
    }
  };
  await sendLabels(CLIENT, {
    labelIds: [ALL_CLIENTS, STAFFED_97153],
    managedLabelIds: CLIENT_MANAGED,
    labelReadBackDelayMs: 40
  });
  // readTimes[0] is the read before the POST; the three read-backs follow.
  assert.equal(readTimes.length, 4);
  assert.equal(readTimes[2] - readTimes[1] >= 35, true);
  assert.equal(readTimes[3] - readTimes[2] >= 35, true);
});

test("[BR19][L.3] with no labelReadBackDelayMs the read-backs are 5 seconds apart", async (t) => {
  // The clock is faked, so the test does not sleep.
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const settle = async () => {
    for (let turn = 0; turn < 5; turn += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  };
  const cr = fakeCentralReach();
  const old = [ALL_CLIENTS, SERVICES_97151];
  cr.labels.set(CLIENT, old);
  cr.onRequest = (name) => {
    if (name === LABELS_POST) {
      cr.answer(LABELS_GET, labelsAnswer(old));
      cr.answer(LABELS_GET, labelsAnswer(old));
    }
  };
  const pending = updateClientMetadata(
    CLIENT,
    {},
    { labelIds: [ALL_CLIENTS, STAFFED_97153], managedLabelIds: CLIENT_MANAGED }
  );

  await settle();
  // The read before the POST, and the first read-back straight after it.
  assert.equal(cr.count(LABELS_GET), 2);
  t.mock.timers.tick(4999);
  await settle();
  assert.equal(cr.count(LABELS_GET), 2);
  t.mock.timers.tick(1);
  await settle();
  assert.equal(cr.count(LABELS_GET), 3);
  t.mock.timers.tick(5000);
  const { labelResult } = await pending;
  assert.equal(cr.count(LABELS_GET), 4);
  assert.equal(labelResult.confirmed, true);
});

test("[BR19][BR16][L.3] a read-back that fails after the POST still returns the posted set, with confirmed false", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS]);
  cr.onRequest = (name) => {
    if (name === LABELS_POST) {
      cr.fail(LABELS_GET, httpError(404), { times: 3 });
    }
  };
  const { labelResult } = await sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT] });
  assert.equal(labelResult.confirmed, false);
  assert.deepEqual(sorted(labelResult.postedLabelIds), sorted([ALL_CLIENTS, NY_CLIENT]));
  assert.equal(cr.count(LABELS_POST), 1);
});

test("[BR19][L.3] inside 150 seconds, unchanged set: a saved post is never re-posted just because the read still shows the old set", async () => {
  const cr = fakeCentralReach();
  const saved = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  // The read is still behind: it shows the set from before the saved POST.
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, SERVICES_97151]);
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: saved,
    managedLabelIds: CLIENT_MANAGED,
    lastLabelPost: { contactId: CLIENT, labelIds: saved, postedAt: secondsAgo(60) }
  });
  assert.deepEqual(labelResult, {
    operation: "skip_window",
    postedLabelIds: null,
    postedAt: null,
    confirmed: false
  });
  assert.equal(cr.count(LABELS_POST), 0);
  assert.equal(cr.count(CATALOG_GET), 0);
});

test("[BR19][L.3] inside 150 seconds, unchanged set, the read shows the saved set on a retry: confirmed true, no POST", async () => {
  const cr = fakeCentralReach();
  const saved = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  cr.labels.set(CLIENT, [STAFFED_97153, NY_CLIENT, ALL_CLIENTS]);
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: saved,
    managedLabelIds: CLIENT_MANAGED,
    lastLabelPost: { contactId: CLIENT, labelIds: saved, postedAt: secondsAgo(149) }
  });
  assert.deepEqual(labelResult, {
    operation: "skip_window",
    postedLabelIds: null,
    postedAt: null,
    confirmed: true
  });
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][L.3] inside 150 seconds, an empty read is a lagging read, not an error", async () => {
  // The label test of 2026-11-20, step 4: after the restore the read showed zero labels at first.
  const cr = fakeCentralReach();
  const saved = [ALL_EMPLOYEES, CLINICAL, BT_NY, NY_EMPLOYEE];
  const { labelResult } = await sendLabels(EMPLOYEE, {
    labelIds: saved,
    lastLabelPost: { contactId: EMPLOYEE, labelIds: saved, postedAt: secondsAgo(20) }
  });
  assert.equal(labelResult.confirmed, false);
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][L.3] inside 150 seconds, a required label that changed after the post: no POST and never confirmed", async () => {
  const cr = fakeCentralReach();
  const saved = [ALL_CLIENTS, NY_CLIENT, SERVICES_97151];
  // The read already shows the saved set, so a compare with the read alone would say "done".
  cr.labels.set(CLIENT, saved);
  const changed = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: changed,
    managedLabelIds: CLIENT_MANAGED,
    lastLabelPost: { contactId: CLIENT, labelIds: saved, postedAt: secondsAgo(60) }
  });
  assert.equal(labelResult.operation, "skip_window");
  assert.equal(labelResult.confirmed, false);
  assert.equal(labelResult.postedLabelIds, null);
  assert.equal(cr.count(LABELS_POST), 0);
  assert.deepEqual(cr.labels.get(CLIENT), saved);
});

test("[BR19][L.3] inside 150 seconds, a managed label that stopped being required after the post: no POST and never confirmed", async () => {
  const cr = fakeCentralReach();
  const saved = [ALL_EMPLOYEES, CLINICAL, BCBA_HEADER, NY_EMPLOYEE, BILLING_HOLD];
  cr.labels.set(EMPLOYEE, saved);
  const { labelResult } = await sendLabels(EMPLOYEE, {
    labelIds: [ALL_EMPLOYEES, CLINICAL, BCBA_HEADER, NY_EMPLOYEE],
    managedLabelIds: [NY_EMPLOYEE, BILLING_HOLD],
    lastLabelPost: { contactId: EMPLOYEE, labelIds: saved, postedAt: secondsAgo(100) }
  });
  assert.equal(labelResult.confirmed, false);
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][L.3] after 150 seconds the changed set is posted from a fresh read", async () => {
  const cr = fakeCentralReach();
  const saved = [ALL_CLIENTS, NY_CLIENT, SERVICES_97151];
  cr.labels.set(CLIENT, [...saved, SCHOOL]);
  const changed = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: changed,
    managedLabelIds: CLIENT_MANAGED,
    lastLabelPost: { contactId: CLIENT, labelIds: saved, postedAt: secondsAgo(151) }
  });
  assert.equal(labelResult.operation, "updated");
  assert.equal(labelResult.confirmed, true);
  assert.equal(cr.count(LABELS_POST), 1);
  // From the fresh read: the label staff added after the saved post is kept.
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted([...changed, SCHOOL]));
});

test("[BR19][L.3] after 150 seconds with nothing to change: no POST, confirmed true", async () => {
  const cr = fakeCentralReach();
  const saved = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  cr.labels.set(CLIENT, saved);
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: saved,
    managedLabelIds: CLIENT_MANAGED,
    lastLabelPost: { contactId: CLIENT, labelIds: saved, postedAt: secondsAgo(400) }
  });
  assert.equal(labelResult.operation, "skip_present");
  assert.equal(labelResult.confirmed, true);
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[BR19][L.3] a saved post for another CR ID is ignored", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, SERVICES_97151]);
  const changed = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: changed,
    managedLabelIds: CLIENT_MANAGED,
    lastLabelPost: { contactId: "9999", labelIds: changed, postedAt: secondsAgo(30) }
  });
  assert.equal(labelResult.operation, "updated");
  assert.equal(cr.count(LABELS_POST), 1);
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted(changed));
});

test("[BR19][L.3] a saved post that cannot be read (no IDs, or no readable time) is ignored", async () => {
  for (const lastLabelPost of [
    { contactId: CLIENT, labelIds: [], postedAt: secondsAgo(30) },
    { contactId: CLIENT, labelIds: [ALL_CLIENTS, NY_CLIENT], postedAt: "not a time" },
    { contactId: CLIENT, postedAt: secondsAgo(30) }
  ]) {
    const cr = fakeCentralReach();
    cr.labels.set(CLIENT, [ALL_CLIENTS]);
    const { labelResult } = await sendLabels(CLIENT, {
      labelIds: [ALL_CLIENTS, NY_CLIENT],
      lastLabelPost
    });
    assert.equal(labelResult.operation, "updated");
    assert.equal(cr.count(LABELS_POST), 1);
  }
});

test("[BR19][L.3] a saved post with no contactId still holds a new POST back inside 150 seconds", async () => {
  const cr = fakeCentralReach();
  const saved = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
  cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, SERVICES_97151]);
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: saved,
    managedLabelIds: CLIENT_MANAGED,
    lastLabelPost: { labelIds: saved, postedAt: secondsAgo(60) }
  });
  assert.equal(labelResult.operation, "skip_window");
  assert.equal(labelResult.confirmed, false);
  assert.equal(cr.count(LABELS_POST), 0);
});

// --- L.4: one body shape ---

test("[BR19][L.4] the POST body is { labels: [{ labelId }] } and nothing else", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(EMPLOYEE, [ALL_EMPLOYEES, BT_NY, CLINICAL, NY_EMPLOYEE]);
  await sendLabels(EMPLOYEE, {
    labelIds: [ALL_EMPLOYEES, CLINICAL, NY_EMPLOYEE, RBT_NY],
    managedLabelIds: [NY_EMPLOYEE, BT_NY, RBT_NY]
  });
  const bodies = postBodies(cr);
  assert.equal(bodies.length, 1);
  assert.deepEqual(Object.keys(bodies[0]), ["labels"]);
  assert.equal(bodies[0].labels.every((item) => Object.keys(item).join() === "labelId"), true);
  assert.deepEqual(
    sorted(bodies[0].labels.map((item) => item.labelId)),
    sorted([ALL_EMPLOYEES, CLINICAL, NY_EMPLOYEE, RBT_NY])
  );
});

test("[BR19][L.4] a 400 on the label POST makes one call only and is a permanent failure", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS]);
  cr.fail(LABELS_POST, httpError(400), { times: 5 });
  let thrown = null;
  await assert.rejects(sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT] }), (error) => {
    thrown = error;
    return error.response?.status === 400;
  });
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.PERMANENT);
  assert.equal(cr.count(LABELS_POST), 1);
  assert.equal(postBodies(cr).some((body) => Object.prototype.hasOwnProperty.call(body, "labelIds")), false);
  assert.deepEqual(cr.labels.get(CLIENT), [ALL_CLIENTS]);
});

// --- Review fixes L-R3, L-R4 and L-R5 ---

const NOT_A_LABEL_ID = [
  ["a text that is not a number", "abc"],
  ["a number that is not whole", 1.5],
  ["a negative number", -1],
  ["an object", { labelId: NY_CLIENT }],
  ["zero", 0],
  ["null", null],
  ["a blank text", " "]
];

for (const [name, entry] of NOT_A_LABEL_ID) {
  test(`[BR19][L.1] a required list that holds ${name} posts nothing and reads nothing: CR_LABEL_NOT_SENDABLE`, async () => {
    // Review finding L-R3: the entry used to be dropped, and NY Client was then removed.
    const cr = fakeCentralReach();
    cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT]);
    let thrown = null;
    await assert.rejects(
      sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, entry], managedLabelIds: CLIENT_MANAGED }),
      (error) => {
        thrown = error;
        return error.code === "CR_LABEL_NOT_SENDABLE";
      }
    );
    assert.equal(classifyFailure(thrown), FAILURE_KINDS.PERMANENT);
    // The error names the list and the position, never the value.
    assert.equal(thrown.labelList, "requiredLabelIds");
    assert.deepEqual(thrown.positions, [1]);
    assert.equal(thrown.message.includes("abc"), false);
    assert.equal(cr.calls.length, 0);
    assert.deepEqual(cr.labels.get(CLIENT), [ALL_CLIENTS, NY_CLIENT]);
  });

  test(`[BR19][L.1] a managed list that holds ${name} posts nothing and reads nothing: CR_LABEL_NOT_SENDABLE`, async () => {
    const cr = fakeCentralReach();
    cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT, SERVICES_97151]);
    let thrown = null;
    await assert.rejects(
      sendLabels(CLIENT, {
        labelIds: [ALL_CLIENTS, NY_CLIENT],
        managedLabelIds: [entry, SERVICES_97151, entry]
      }),
      (error) => {
        thrown = error;
        return error.code === "CR_LABEL_NOT_SENDABLE";
      }
    );
    assert.equal(classifyFailure(thrown), FAILURE_KINDS.PERMANENT);
    assert.equal(thrown.labelList, "managedLabelIds");
    assert.deepEqual(thrown.positions, [0, 2]);
    assert.equal(cr.calls.length, 0);
  });
}

test("[BR19][L.1] a required or managed list that is not a list posts nothing: CR_LABEL_NOT_SENDABLE", async () => {
  for (const options of [
    { labelIds: "1052619" },
    { labelIds: { 0: ALL_CLIENTS } },
    { labelIds: [ALL_CLIENTS], managedLabelIds: NY_CLIENT }
  ]) {
    const cr = fakeCentralReach();
    cr.labels.set(CLIENT, [ALL_CLIENTS, NY_CLIENT]);
    await assert.rejects(sendLabels(CLIENT, options), (error) => error.code === "CR_LABEL_NOT_SENDABLE");
    assert.equal(cr.calls.length, 0);
  }
});

test("[BR19][L.1] a bad managed entry stops the run even when no label is required", async () => {
  const cr = fakeCentralReach();
  await assert.rejects(
    sendLabels(CLIENT, { labelIds: [], managedLabelIds: ["abc"] }),
    (error) => error.code === "CR_LABEL_NOT_SENDABLE"
  );
  assert.equal(cr.calls.length, 0);
});

test("[BR19][L.1] label IDs written as text digits are read as numbers", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, SERVICES_97151]);
  const { labelResult } = await sendLabels(CLIENT, {
    labelIds: [String(ALL_CLIENTS), String(NY_CLIENT)],
    managedLabelIds: [String(SERVICES_97151), NY_CLIENT]
  });
  assert.deepEqual(sorted(labelResult.postedLabelIds), sorted([ALL_CLIENTS, NY_CLIENT]));
});

test("[BR19][L.2] the required list is read from requiredLabelIds, the mapper's name, as well as from labelIds", async () => {
  // Review finding L-R5 (3): a worker that used the mapper's name got a silent skip_empty.
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, SERVICES_97151]);
  const { labelResult } = await sendLabels(CLIENT, {
    requiredLabelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153],
    managedLabelIds: CLIENT_MANAGED
  });
  assert.equal(labelResult.operation, "updated");
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted([ALL_CLIENTS, NY_CLIENT, STAFFED_97153]));
});

test("[BR19][L.2] when both names are passed, requiredLabelIds is the one read", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS]);
  await sendLabels(CLIENT, { requiredLabelIds: [ALL_CLIENTS, NY_CLIENT], labelIds: [ALL_CLIENTS, CO_CLIENT] });
  assert.deepEqual(sorted(cr.labels.get(CLIENT)), sorted([ALL_CLIENTS, NY_CLIENT]));
});

for (const [name, failure] of [
  ["a 503", () => httpError(503)],
  ["a 500", () => httpError(500)],
  ["a timeout", () => timeoutError()]
]) {
  test(`[BR19][BR16][L.3] ${name} on the label POST: one POST only, and the error carries the set that may have been applied`, async () => {
    // Review finding L-R4: the POST was retried in-process (three POSTs in one run).
    const cr = fakeCentralReach();
    cr.labels.set(CLIENT, [ALL_CLIENTS, SERVICES_97151]);
    cr.fail(LABELS_POST, failure(), { times: 5, afterHandling: true });
    const expected = [ALL_CLIENTS, NY_CLIENT, STAFFED_97153];
    const before = Date.now();
    let thrown = null;
    await assert.rejects(
      sendLabels(CLIENT, { labelIds: expected, managedLabelIds: CLIENT_MANAGED }),
      (error) => {
        thrown = error;
        return true;
      }
    );
    assert.equal(cr.count(LABELS_POST), 1);
    assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
    assert.equal(thrown.labelPost.contactId, CLIENT);
    assert.deepEqual(sorted(thrown.labelPost.labelIds), sorted(expected));
    assert.equal(thrown.labelPost.postedAt, new Date(thrown.labelPost.postedAt).toISOString());
    assert.equal(Date.parse(thrown.labelPost.postedAt) >= before, true);
    // No read-back after a failed POST.
    assert.equal(cr.count(LABELS_GET), 1);
  });
}

test("[BR19][L.3] the set carried by a failed POST, saved as lastLabelPost, holds the next run back inside 150 seconds", async () => {
  const cr = fakeCentralReach();
  cr.labels.set(CLIENT, [ALL_CLIENTS, SERVICES_97151]);
  cr.fail(LABELS_POST, timeoutError(), { afterHandling: true });
  const options = { labelIds: [ALL_CLIENTS, NY_CLIENT, STAFFED_97153], managedLabelIds: CLIENT_MANAGED };
  let thrown = null;
  await assert.rejects(sendLabels(CLIENT, options), (error) => {
    thrown = error;
    return true;
  });

  // The worker saves error.labelPost as lastLabelPost and the retry passes it in.
  const { labelResult } = await sendLabels(CLIENT, { ...options, lastLabelPost: thrown.labelPost });
  assert.equal(labelResult.operation, "skip_window");
  assert.equal(labelResult.confirmed, true);
  assert.equal(cr.count(LABELS_POST), 1);
});

test("[BR19][L.4] a 4xx on the label POST carries no posted set", async () => {
  for (const status of [400, 404, 409, 429]) {
    const cr = fakeCentralReach();
    cr.labels.set(CLIENT, [ALL_CLIENTS]);
    cr.fail(LABELS_POST, httpError(status), { times: 5 });
    let thrown = null;
    await assert.rejects(sendLabels(CLIENT, { labelIds: [ALL_CLIENTS, NY_CLIENT] }), (error) => {
      thrown = error;
      return error.response?.status === status;
    });
    assert.equal(cr.count(LABELS_POST), 1);
    assert.equal(Object.prototype.hasOwnProperty.call(thrown, "labelPost"), false);
  }
});
