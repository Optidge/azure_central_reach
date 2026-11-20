// Stage 3, the worker side of the label sender (BUILD-PLAN.md section 11, rows L.1 to L.3; rule
// 5.6; contract P.5 (e) in src/lib/centralReachClient.mjs; review findings SP-R3, SP-R4, SP-R5).
// Guide: [G19] and sections 7 to 9 (replace-and-remove label rules, BR19).
//
// THE SENDER IS FAKED in every test here that needs postedLabelIds, postedAt or confirmed in the
// sender's answer. Lane L builds the sender that returns those fields (row L.3); the sender in
// this lane's worktree does not return them yet. The fake (fakeLabelSender) answers with the
// labelResult of the contract. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and, where the sender is not faked, centralReachClient.mjs are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { LABEL_NOT_SENDABLE, RETRIES_USED_UP } from "../../constants/syncReasons.mjs";
import { FAILURE_KINDS, classifyFailure, permanentFailureReason } from "../../lib/retry.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { clientWorkflowDeps, employeeWorkflowDeps, timeoutError } from "./stage2Fakes.mjs";
import {
  BT_LINK,
  CASE_LINK,
  NOTHING_POSTED_CONFIRMED,
  NOTHING_POSTED_UNCONFIRMED,
  POSTED_CONFIRMED,
  POSTED_UNCONFIRMED,
  fakeLabelSender,
  linkedBt,
  linkedCase,
  seedClient,
  seedEmployee,
  setup,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";

function linkData(container, link) {
  return container.get(link.pk, link.id)?.data || null;
}

function runBt(record, sender, input = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt", ...input },
    {
      ...employeeWorkflowDeps({ record }),
      ...(sender ? { updateClientMetadata: sender.updateClientMetadata } : {})
    }
  );
}

function runCase(record, sender, input = {}) {
  return runClientSyncWorkflow(
    { dealId: "deal-1", ...input },
    {
      ...clientWorkflowDeps({ record }),
      ...(sender ? { updateClientMetadata: sender.updateClientMetadata } : {})
    }
  );
}

function unconfirmed(error) {
  return error.code === "CR_LABEL_POST_UNCONFIRMED";
}

// --- labelsPending (row L.2, SP-R4) ---

test("[BR19][L.2] BT/RBT: a create sets labelsPending, and contactCreatedThisRun stays true on later runs until a label POST is confirmed (sender faked)", async () => {
  const { container } = setup();
  const record = stage3Bt();
  const sender = fakeLabelSender([POSTED_UNCONFIRMED, NOTHING_POSTED_CONFIRMED, NOTHING_POSTED_CONFIRMED]);

  // Run 1: the create. The POST is not confirmed yet, so the run ends as a temporary failure.
  await assert.rejects(runBt(record, sender), unconfirmed);
  assert.equal(sender.calls[0].options.contactCreatedThisRun, true);
  const contactId = sender.calls[0].contactId;
  assert.equal(linkData(container, BT_LINK).labelsPending, true);

  // Run 2, the retry: this run did not create the contact, but the label POST is still pending.
  const second = await runBt(record, sender);
  assert.equal(second.status, "success");
  assert.equal(sender.calls[1].contactId, contactId);
  assert.equal(sender.calls[1].options.contactCreatedThisRun, true);
  assert.equal(linkData(container, BT_LINK).labelsPending, false);

  // Run 3, after a change: an empty read is no longer taken as "no labels".
  record.properties.last_name = "Okonkwo";
  await runBt(record, sender);
  assert.equal(sender.calls[2].options.contactCreatedThisRun, false);
});

test("[BR19][L.2] BT/RBT: a create that timed out, then a run that links to it, passes contactCreatedThisRun: true (sender faked)", async () => {
  const { container, cr } = setup();
  const record = stage3Bt();
  const sender = fakeLabelSender([POSTED_CONFIRMED]);

  // CentralReach creates the employee, but the answer never arrives.
  cr.fail("POST /contacts/employee", timeoutError(), { afterHandling: true });
  await assert.rejects(runBt(record, sender), (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN");
  assert.equal(sender.calls.length, 0);

  // The retry finds its own create by the pending External System ID and links to it.
  const result = await runBt(record, sender);
  assert.equal(result.status, "success");
  assert.equal(cr.employees.size, 1);
  assert.equal(cr.count("POST /contacts/employee"), 1);
  assert.equal(sender.calls.length, 1);
  assert.equal(sender.calls[0].options.contactCreatedThisRun, true);
  // That POST was confirmed in the same run, so nothing is pending any more.
  assert.equal(linkData(container, BT_LINK).labelsPending, false);
});

test("[BR19][L.2] BT/RBT: a record that already holds a CR ID never passes contactCreatedThisRun: true (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedBt(cr);
  const sender = fakeLabelSender([NOTHING_POSTED_CONFIRMED]);

  await runBt(record, sender);
  assert.equal(sender.calls[0].options.contactCreatedThisRun, false);
  assert.notEqual(linkData(container, BT_LINK).labelsPending, true);
});

test("[BR19][L.2] BT/RBT: labelsPending set for one CR contact does not count for another (sender faked)", async () => {
  const { container, cr } = setup();
  const record = stage3Bt();
  const sender = fakeLabelSender([POSTED_UNCONFIRMED, NOTHING_POSTED_CONFIRMED]);
  await assert.rejects(runBt(record, sender), unconfirmed);
  assert.equal(linkData(container, BT_LINK).labelsPending, true);

  // Staff point the HubSpot record at another CentralReach employee, one the integration did
  // not create. Its empty label read must not be taken as "no labels".
  seedEmployee(cr, "7777", "WD1");
  record.properties.employee_id = "7777";
  await runBt(record, sender);
  assert.equal(sender.calls[1].contactId, "7777");
  assert.equal(sender.calls[1].options.contactCreatedThisRun, false);
  assert.equal(sender.calls[1].options.lastLabelPost, null);
});

test("[BR19][L.2] Case: a create sets labelsPending, and contactCreatedThisRun stays true until a label POST is confirmed (sender faked)", async () => {
  const { container } = setup();
  const record = stage3Case();
  const sender = fakeLabelSender([POSTED_UNCONFIRMED, NOTHING_POSTED_CONFIRMED, NOTHING_POSTED_CONFIRMED]);

  await assert.rejects(runCase(record, sender), unconfirmed);
  assert.equal(sender.calls[0].options.contactCreatedThisRun, true);
  assert.equal(linkData(container, CASE_LINK).labelsPending, true);

  const second = await runCase(record, sender);
  assert.equal(second.status, "success");
  assert.equal(sender.calls[1].options.contactCreatedThisRun, true);
  assert.equal(linkData(container, CASE_LINK).labelsPending, false);

  record.properties.guardian_last_name = "Okonkwo";
  await runCase(record, sender);
  assert.equal(sender.calls[2].options.contactCreatedThisRun, false);
});

test("[BR19][L.2] Case: a create that timed out, then a run that links to it, passes contactCreatedThisRun: true (sender faked)", async () => {
  const { container, cr } = setup();
  const record = stage3Case();
  const sender = fakeLabelSender([POSTED_CONFIRMED]);

  cr.fail("POST /contacts/client", timeoutError(), { afterHandling: true });
  await assert.rejects(runCase(record, sender), (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN");
  assert.equal(sender.calls.length, 0);

  const result = await runCase(record, sender);
  assert.equal(result.status, "success");
  assert.equal(cr.clients.size, 1);
  assert.equal(cr.count("POST /contacts/client"), 1);
  assert.equal(sender.calls[0].options.contactCreatedThisRun, true);
  assert.equal(linkData(container, CASE_LINK).labelsPending, false);
});

test("[BR19][L.2] Case: a Case that already holds a CR ID never passes contactCreatedThisRun: true (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const sender = fakeLabelSender([NOTHING_POSTED_CONFIRMED]);

  await runCase(record, sender);
  assert.equal(sender.calls[0].options.contactCreatedThisRun, false);
  assert.notEqual(linkData(container, CASE_LINK).labelsPending, true);
});

// --- lastLabelPost (row L.3, SP-R5) ---

test("[BR19][L.3] BT/RBT: a label POST is saved as { contactId, labelIds, postedAt } and passed to the sender on the next run (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedBt(cr);
  const sender = fakeLabelSender([POSTED_CONFIRMED, NOTHING_POSTED_CONFIRMED]);

  const first = await runBt(record, sender);
  assert.equal(first.status, "success");
  assert.equal(sender.calls[0].options.lastLabelPost, null);
  const saved = {
    contactId: "5001",
    labelIds: POSTED_CONFIRMED.postedLabelIds,
    postedAt: POSTED_CONFIRMED.postedAt
  };
  assert.deepEqual(linkData(container, BT_LINK).lastLabelPost, saved);

  // A run that posts nothing keeps the saved post.
  record.properties.last_name = "Okonkwo";
  await runBt(record, sender);
  assert.deepEqual(sender.calls[1].options.lastLabelPost, saved);
  assert.deepEqual(linkData(container, BT_LINK).lastLabelPost, saved);
});

test("[BR19][L.3] Case: a label POST is saved as { contactId, labelIds, postedAt } and passed to the sender on the next run (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const sender = fakeLabelSender([POSTED_CONFIRMED, NOTHING_POSTED_CONFIRMED]);

  await runCase(record, sender);
  const saved = {
    contactId: "2001",
    labelIds: POSTED_CONFIRMED.postedLabelIds,
    postedAt: POSTED_CONFIRMED.postedAt
  };
  assert.deepEqual(linkData(container, CASE_LINK).lastLabelPost, saved);

  record.properties.guardian_last_name = "Okonkwo";
  await runCase(record, sender);
  assert.deepEqual(sender.calls[1].options.lastLabelPost, saved);
});

test("[BR19][L.3] a saved label POST for another CR ID is passed to the sender as null, for a Case and for a BT/RBT (sender faked)", async () => {
  const { container, cr } = setup();
  const otherPost = { contactId: "1111", labelIds: [1052618], postedAt: "2026-11-20T14:59:00.000Z" };
  seedClient(cr, "2001");
  seedEmployee(cr, "5001", "WD1");
  for (const link of [CASE_LINK, BT_LINK]) {
    await container.items.upsert({
      id: link.id,
      pk: link.pk,
      type: "link",
      ttl: -1,
      data: { lastLabelPost: otherPost }
    });
  }

  const caseSender = fakeLabelSender([NOTHING_POSTED_CONFIRMED]);
  await runCase(stage3Case({ client_id_number: "2001" }), caseSender);
  assert.equal(caseSender.calls[0].options.lastLabelPost, null);

  const btSender = fakeLabelSender([NOTHING_POSTED_CONFIRMED]);
  await runBt(stage3Bt({ employee_id: "5001" }), btSender);
  assert.equal(btSender.calls[0].options.lastLabelPost, null);
});

// --- confirmed === false (row L.3, SP-R3) ---

test("[BR19][L.3] BT/RBT: when the read does not confirm the POST, the post is saved first and the run ends as the temporary failure CR_LABEL_POST_UNCONFIRMED (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedBt(cr, { last_sync_status: "success" });
  const sender = fakeLabelSender([POSTED_UNCONFIRMED]);

  let thrown = null;
  await assert.rejects(runBt(record, sender), (error) => {
    thrown = error;
    return unconfirmed(error);
  });
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  const link = linkData(container, BT_LINK);
  assert.deepEqual(link.lastLabelPost, {
    contactId: "5001",
    labelIds: POSTED_UNCONFIRMED.postedLabelIds,
    postedAt: POSTED_UNCONFIRMED.postedAt
  });
  // The run is not clean and saved no hashes, so the retry goes through the label step again.
  assert.equal(link.clean, false);
  assert.equal(link.fieldHashes, undefined);
  // HubSpot keeps its last status while the retries run (Stage 2 decision 1).
  assert.equal(record.writes.some((write) => write.last_sync_status !== undefined), false);
  assert.equal(record.properties.last_sync_status, "success");
});

test("[BR19][L.3] Case: when the read does not confirm the POST, the post is saved first and the run ends as the temporary failure CR_LABEL_POST_UNCONFIRMED (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { last_sync_status: "success" });
  const sender = fakeLabelSender([POSTED_UNCONFIRMED]);

  await assert.rejects(runCase(record, sender), unconfirmed);
  const link = linkData(container, CASE_LINK);
  assert.deepEqual(link.lastLabelPost, {
    contactId: "2001",
    labelIds: POSTED_UNCONFIRMED.postedLabelIds,
    postedAt: POSTED_UNCONFIRMED.postedAt
  });
  assert.equal(link.clean, false);
  assert.equal(record.writes.some((write) => write.last_sync_status !== undefined), false);
});

test("[BR19][L.3] a run inside the window that posts nothing and is not confirmed is retried and never ends as success; the saved post is kept (sender faked)", async () => {
  const { container, cr } = setup();
  const record = linkedBt(cr);
  const sender = fakeLabelSender([POSTED_UNCONFIRMED, NOTHING_POSTED_UNCONFIRMED, NOTHING_POSTED_CONFIRMED]);

  await assert.rejects(runBt(record, sender), unconfirmed);
  const saved = linkData(container, BT_LINK).lastLabelPost;

  await assert.rejects(runBt(record, sender), unconfirmed);
  assert.deepEqual(sender.calls[1].options.lastLabelPost, saved);
  assert.deepEqual(linkData(container, BT_LINK).lastLabelPost, saved);
  assert.notEqual(record.properties.last_sync_status, "success");

  const third = await runBt(record, sender);
  assert.equal(third.status, "success");
  assert.equal(linkData(container, BT_LINK).clean, true);
});

test("[BR19][L.3] a label POST that is never confirmed ends as error \"Retries used up\" on the last attempt, for a Case and for a BT/RBT (sender faked)", async () => {
  const { cr } = setup();
  seedClient(cr, "2001");
  seedEmployee(cr, "5001", "WD1");

  const caseRecord = stage3Case({ client_id_number: "2001" });
  await assert.rejects(
    runCase(caseRecord, fakeLabelSender([POSTED_UNCONFIRMED]), { lastAttempt: true }),
    unconfirmed
  );
  assert.equal(caseRecord.properties.last_sync_status, "error");
  assert.equal(caseRecord.properties.last_sync_error, RETRIES_USED_UP);

  const bt = stage3Bt({ employee_id: "5001" });
  await assert.rejects(
    runBt(bt, fakeLabelSender([POSTED_UNCONFIRMED]), { lastAttempt: true }),
    unconfirmed
  );
  assert.equal(bt.properties.last_sync_status, "error");
  assert.equal(bt.properties.last_sync_error, RETRIES_USED_UP);
});

test("[BR19][L.3] with the sender as it is before row L.3 (no postedLabelIds, no confirmed), nothing is saved as a label POST and the run is not failed", async () => {
  // Real sender, real CentralReach client over the fake HTTP adapter.
  const { container, cr } = setup();
  seedClient(cr, "2001");
  seedEmployee(cr, "5001", "WD1");

  const caseResult = await runCase(stage3Case({ client_id_number: "2001" }), null);
  const btResult = await runBt(stage3Bt({ employee_id: "5001" }), null);

  assert.equal(caseResult.status, "success");
  assert.equal(btResult.status, "success");
  // Holds before and after lane L's sender: a label POST is saved with the contact it was made
  // for, or not at all.
  for (const [link, contactId] of [
    [CASE_LINK, "2001"],
    [BT_LINK, "5001"]
  ]) {
    const saved = linkData(container, link).lastLabelPost;
    assert.equal(saved == null || saved.contactId === contactId, true);
  }
});

// --- CR_LABEL_NOT_SENDABLE (row L.1) ---

test("[BR19][L.1] CR_LABEL_NOT_SENDABLE is permanent and has its own fixed sentence, which names no label and no value", () => {
  const error = Object.assign(new Error("label 999999999 is not sendable"), {
    code: "CR_LABEL_NOT_SENDABLE"
  });
  assert.equal(classifyFailure(error), FAILURE_KINDS.PERMANENT);
  assert.equal(permanentFailureReason(error), LABEL_NOT_SENDABLE);
  assert.equal(/\d/.test(LABEL_NOT_SENDABLE), false);
});

test("[BR19][L.1] a label outside the sendable list ends the run as error with the fixed sentence and no retry, for a Case and for a BT/RBT (sender faked)", async () => {
  const { cr } = setup();
  seedClient(cr, "2001");
  seedEmployee(cr, "5001", "WD1");
  const notSendable = () =>
    fakeLabelSender([Object.assign(new Error("not sendable"), { code: "CR_LABEL_NOT_SENDABLE" })]);

  const caseRecord = stage3Case({ client_id_number: "2001" });
  const caseResult = await runCase(caseRecord, notSendable());
  assert.equal(caseResult.status, "error");
  assert.equal(caseRecord.properties.last_sync_error, LABEL_NOT_SENDABLE);

  const bt = stage3Bt({ employee_id: "5001" });
  const btResult = await runBt(bt, notSendable());
  assert.equal(btResult.status, "error");
  assert.equal(bt.properties.last_sync_error, LABEL_NOT_SENDABLE);
});
