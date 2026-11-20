// Stage 3, worker side: four additions from the lane L review (contract P.5 (e) and (f) in
// src/lib/centralReachClient.mjs; rule 5.6; rows L.2, L.3 and 3.14).
//   1. labelsPending is cleared whenever confirmed is true, whatever the operation.
//   2. A label POST is saved before any throw that follows the label step.
//   3. A label step that throws an error carrying `labelPost` (a POST that timed out or got a
//      5xx may still have been applied): the post is saved, then the same error is rethrown.
//   4. A linked Case update passes externalSystemIdHeld: true only when a lookup of the run found
//      the client under the CR ID the update goes to.
// Guide: [G19] (labels, BR19); [GER-REQ] intro (the client External System ID, BR22).
// THE SENDER IS FAKED in the label tests, and createOrUpdateClient is faked in the row 3.14
// tests: lane L builds both, and neither is in this lane's worktree. The mapper, the validator,
// the hash and cosmosState.mjs (in-memory container) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  clientWorkflowDeps,
  employeeWorkflowDeps,
  httpError,
  timeoutError
} from "./stage2Fakes.mjs";
import {
  BT_LINK,
  CASE_LINK,
  NOTHING_POSTED_CONFIRMED,
  POSTED_CONFIRMED,
  fakeLabelSender,
  linkedBt,
  linkedCase,
  seedClient,
  setup,
  stage3Bt,
  stage3Case,
  testClock
} from "./stage3WorkerFakes.mjs";

function linkData(container, link) {
  return container.get(link.pk, link.id)?.data || null;
}

function runBt(record, updateClientMetadata) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    { ...employeeWorkflowDeps({ record }), updateClientMetadata }
  );
}

function runCase(record, updateClientMetadata) {
  return runClientSyncWorkflow(
    { dealId: "deal-1" },
    { ...clientWorkflowDeps({ record }), updateClientMetadata }
  );
}

const SAVED_POST_OF = (contactId) => ({
  contactId,
  labelIds: POSTED_CONFIRMED.postedLabelIds,
  postedAt: POSTED_CONFIRMED.postedAt
});

// --- 1. labelsPending and confirmed === true ---

for (const [name, answer] of [
  ["updated", POSTED_CONFIRMED],
  ["skip_present", NOTHING_POSTED_CONFIRMED],
  ["skip_window", { ...NOTHING_POSTED_CONFIRMED, operation: "skip_window" }]
]) {
  test(`[BR19][L.2] labelsPending is cleared when confirmed is true and the operation is ${name}, for a new Case and a new BT/RBT (sender faked)`, async () => {
    const { container } = setup();

    const caseSender = fakeLabelSender([answer]);
    const caseResult = await runCase(stage3Case(), caseSender.updateClientMetadata);
    assert.equal(caseResult.operation, "create");
    assert.equal(caseSender.calls[0].options.contactCreatedThisRun, true);
    assert.equal(linkData(container, CASE_LINK).labelsPending, false);

    const btSender = fakeLabelSender([answer]);
    const btResult = await runBt(stage3Bt(), btSender.updateClientMetadata);
    assert.equal(btResult.operation, "create");
    assert.equal(btSender.calls[0].options.contactCreatedThisRun, true);
    assert.equal(linkData(container, BT_LINK).labelsPending, false);
  });
}

test("[BR19][L.2] labelsPending stays true while confirmed is null or missing (sender faked)", async () => {
  const { container } = setup();
  const sender = fakeLabelSender([
    { operation: "skip_empty", postedLabelIds: null, postedAt: null, confirmed: null }
  ]);
  await runBt(stage3Bt(), sender.updateClientMetadata);
  assert.equal(linkData(container, BT_LINK).labelsPending, true);
});

// --- 2. the post is saved before the metadata failure is thrown ---

// The sender posted the labels and one metadata field then failed.
function senderWithFailedField(status) {
  return async () => ({
    labelResult: POSTED_CONFIRMED,
    updatedCount: 0,
    failedCount: 1,
    failedFieldIds: [133826],
    failedFields: [{ fieldId: 133826, operation: "error", status, retryAfterSeconds: null }]
  });
}

test("[BR19][L.3] Case: a label POST is saved before the run is failed for a metadata field (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);

  await assert.rejects(
    runCase(record, senderWithFailedField(500)),
    (error) => error.code === "METADATA_WRITE_FAILED"
  );
  assert.deepEqual(linkData(container, CASE_LINK).lastLabelPost, SAVED_POST_OF("2001"));
  assert.equal(linkData(container, CASE_LINK).clean, false);
});

test("[BR19][L.3] BT/RBT: a label POST is saved before the run is failed for a metadata field, also when that failure is permanent (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedBt(cr);

  await assert.rejects(
    runBt(record, senderWithFailedField(500)),
    (error) => error.code === "METADATA_WRITE_FAILED"
  );
  assert.deepEqual(linkData(container, BT_LINK).lastLabelPost, SAVED_POST_OF("5001"));

  // A 400 on the field is permanent: the run ends as error, and the post is still saved.
  const second = setup();
  const other = linkedBt(second.cr);
  const result = await runBt(other, senderWithFailedField(400));
  assert.equal(result.status, "error");
  assert.deepEqual(linkData(second.container, BT_LINK).lastLabelPost, SAVED_POST_OF("5001"));
});

// --- 3. an error that carries labelPost ---

function labelPostError(contactId) {
  return Object.assign(timeoutError(), {
    labelPost: {
      contactId,
      labelIds: [1052618, 1052643],
      postedAt: "2026-11-20T15:00:00.000Z"
    }
  });
}

test("[BR19][L.3] Case: a label step that throws with labelPost has the post saved, and the same error is rethrown (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const thrown = labelPostError("2001");

  await assert.rejects(
    runCase(record, async () => {
      throw thrown;
    }),
    (error) => error === thrown
  );
  assert.deepEqual(linkData(container, CASE_LINK).lastLabelPost, thrown.labelPost);
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  assert.equal(record.writes.some((write) => write.last_sync_status !== undefined), false);

  // The next run passes the saved post to the sender, so it does not post again in the window.
  const sender = fakeLabelSender([NOTHING_POSTED_CONFIRMED]);
  await runCase(record, sender.updateClientMetadata);
  assert.deepEqual(sender.calls[0].options.lastLabelPost, thrown.labelPost);
});

test("[BR19][L.3] BT/RBT: a label step that throws with labelPost has the post saved, and the same error is rethrown (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedBt(cr);
  const thrown = Object.assign(httpError(503), { labelPost: labelPostError("5001").labelPost });

  await assert.rejects(
    runBt(record, async () => {
      throw thrown;
    }),
    (error) => error === thrown
  );
  assert.deepEqual(linkData(container, BT_LINK).lastLabelPost, thrown.labelPost);
});

test("[BR19][L.3] a label step that throws without labelPost saves no post and rethrows the same error, for a Case and for a BT/RBT (sender faked)", async () => {
  const { container, cr } = setup();
  const caseError = timeoutError();
  await assert.rejects(
    runCase(linkedCase(cr), async () => {
      throw caseError;
    }),
    (error) => error === caseError
  );
  assert.equal(linkData(container, CASE_LINK).lastLabelPost, undefined);

  const btError = timeoutError();
  await assert.rejects(
    runBt(linkedBt(cr), async () => {
      throw btError;
    }),
    (error) => error === btError
  );
  assert.equal(linkData(container, BT_LINK).lastLabelPost, undefined);
});

test("[BR19][L.3] when saving the post of a failed label step fails too, the label error is still the one thrown (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedBt(cr);
  const thrown = labelPostError("5001");
  container.beforeWrite = (operation, doc) => {
    if (doc.pk === BT_LINK.pk && doc.data?.lastLabelPost) {
      throw Object.assign(new Error("Cosmos answered 503"), { code: 503 });
    }
  };

  await assert.rejects(
    runBt(record, async () => {
      throw thrown;
    }),
    (error) => error === thrown
  );
});

// --- 4. externalSystemIdHeld (contract P.5 (f), row 3.14) ---

// createOrUpdateClient is faked to record what the worker passes. findClientByExternalSystemId
// and the rest of the path are real.
function recordingUpsert(answer) {
  const calls = [];
  return {
    calls,
    createOrUpdateClient: async (input) => {
      calls.push(input);
      return typeof answer === "function" ? answer(input) : answer;
    }
  };
}

function runCaseWithUpsert(record, upsert, extra = {}) {
  return runClientSyncWorkflow(
    { dealId: "deal-1" },
    { ...clientWorkflowDeps({ record }), createOrUpdateClient: upsert.createOrUpdateClient, ...extra }
  );
}

test("[BR22][3.14] a linked Case whose lookup found the client under the same CR ID passes externalSystemIdHeld: true to the update", async () => {
  const { cr } = setup();
  const record = linkedCase(cr); // CentralReach client 2001 holds External System ID deal-1
  const upsert = recordingUpsert({ operation: "update", crContactId: "2001" });

  const result = await runCaseWithUpsert(record, upsert);

  assert.equal(result.status, "success");
  assert.equal(upsert.calls.length, 1);
  assert.equal(upsert.calls[0].existingContactId, "2001");
  assert.equal(upsert.calls[0].externalSystemIdHeld, true);
});

test("[BR22][3.14] a linked Case whose lookup answered 404 does not pass externalSystemIdHeld", async () => {
  const { cr } = setup();
  // The client was made by hand: it does not hold the Case record ID.
  seedClient(cr, "2001", "SOME-OTHER-ID");
  const record = stage3Case({ client_id_number: "2001" });
  const upsert = recordingUpsert({ operation: "update", crContactId: "2001" });

  await runCaseWithUpsert(record, upsert);

  assert.equal(upsert.calls.length, 1);
  assert.equal(upsert.calls[0].existingContactId, "2001");
  assert.equal(Object.prototype.hasOwnProperty.call(upsert.calls[0], "externalSystemIdHeld"), false);
});

test("[BR22][3.14] a Case create, where no lookup of the worker ran, does not pass externalSystemIdHeld", async () => {
  setup();
  const record = stage3Case();
  const upsert = recordingUpsert({ operation: "create", crContactId: "9100" });

  await runCaseWithUpsert(record, upsert);

  assert.equal(upsert.calls.length, 1);
  assert.equal(upsert.calls[0].existingContactId, null);
  assert.equal(Object.prototype.hasOwnProperty.call(upsert.calls[0], "externalSystemIdHeld"), false);
});

test("[BR22][3.14] a linked Case found under another CR ID gets no update at all", async () => {
  const { cr } = setup();
  seedClient(cr, "2002", "deal-1");
  const record = stage3Case({ client_id_number: "2001" });
  const upsert = recordingUpsert({ operation: "update", crContactId: "2001" });

  const result = await runCaseWithUpsert(record, upsert);

  assert.equal(result.status, "error");
  assert.equal(upsert.calls.length, 0);
});

test("[BR22][3.14] a Case linked to its own earlier create by the pending lookup (row 3.15) passes externalSystemIdHeld: true", async () => {
  const { cr } = setup();
  const clock = testClock();
  const record = stage3Case();
  // The create reached CentralReach and its answer never arrived (real client for this run).
  cr.fail("POST /contacts/client", timeoutError(), { afterHandling: true });
  await assert.rejects(
    runClientSyncWorkflow({ dealId: "deal-1" }, { ...clientWorkflowDeps({ record }), now: clock.now })
  );
  const createdId = Array.from(cr.clients.keys())[0];

  clock.advanceSeconds(60);
  const upsert = recordingUpsert({ operation: "update", crContactId: createdId });
  await runCaseWithUpsert(record, upsert, { now: clock.now });

  assert.equal(upsert.calls.length, 1);
  assert.equal(upsert.calls[0].existingContactId, createdId);
  assert.equal(upsert.calls[0].externalSystemIdHeld, true);
});
