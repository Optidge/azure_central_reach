// What both queue workers do with one validated message: check the portal, run the workflow,
// and schedule the retry when the workflow throws.
//
// The contract with the workflows:
// - A workflow that returns has finished. A permanent failure is written to the record as
//   `error` and returned, so the message completes.
// - A workflow that throws wants a retry. The worker schedules a new message with the next
//   delay and lets this one complete. If the retry cannot be scheduled the worker throws, so
//   Service Bus redelivers the original.
// - On the last attempt the workflow is told so. It writes `error` "Retries used up" and
//   throws; Service Bus then redelivers until the message is dead-lettered. A redelivery of a
//   message that has used its retries is thrown at once, with no HubSpot or CentralReach call.
// - Item 20: the number of retries depends on the message's `source` and the failure
//   (maxRetriesFor in retry.mjs). A daily sweep message gets one, except for the failures that
//   keep the full schedule; the workflow gets `attempt` and `source` to make the same decision.
import { sha256 } from "./hash.mjs";
import { MAX_RETRIES, isLastAttempt, planRetry } from "./retry.mjs";
import { safeLog } from "./safeLog.mjs";
import { toErrorMeta } from "./errors.mjs";
import { buildRetryMessage } from "./serviceBusClient.mjs";
import { RETRIES_USED_UP } from "../constants/syncReasons.mjs";

// The number of retries this message has already used. Absent on a first delivery.
export function readAttempt(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }
  const attempt = Number(value);
  if (!Number.isInteger(attempt) || attempt < 0 || attempt > MAX_RETRIES) {
    throw new Error("Invalid queue message: attempt is not a retry number");
  }
  return attempt;
}

// The ID of the first message of this chain. Service Bus always gives a message ID; the hash of
// the body is a fallback, so a retry is never left unscheduled for want of one.
function firstMessageId(body, queueMeta) {
  const known = String(body.originalMessageId || queueMeta.messageId || "").trim();
  return (
    known || sha256(JSON.stringify({ ...body, attempt: undefined, originalMessageId: undefined }))
  );
}

export async function processSyncMessage({
  body,
  attempt,
  configuredPortalId,
  queueMeta,
  run,
  scheduleRetry
}) {
  const messagePortalId = String(body.portalId ?? "").trim();
  if (!messagePortalId || messagePortalId !== configuredPortalId) {
    // Another portal's message, or one with no portal ID (a sender defect or a hand-made
    // message). Completed without acting.
    safeLog(
      "warn",
      "Queue message is not for this portal. Completed with no HubSpot or CentralReach call.",
      { ...queueMeta, messagePortalId: messagePortalId || "(none)", configuredPortalId }
    );
    return;
  }

  const source = String(body.source ?? "").trim();
  // A scheduled retry is a new message (deliveryCount 1). deliveryCount > 1 is Service Bus
  // delivering the same message again, after a throw or a lost lock. With all five retries used,
  // a redelivery is thrown at once. Review F1: a daily sweep message past its one ordinary retry
  // may still be in a full-schedule chain (CR_CREATE_PENDING, SYNC_IN_PROGRESS, an unconfirmed
  // label POST) that must run, and nothing on the message tells that apart from a spent one. Its
  // first redelivery runs once more; from the second one on it is thrown at once.
  const deliveryCount = Number(queueMeta.deliveryCount);
  const redeliveredSpent =
    attempt >= MAX_RETRIES
      ? deliveryCount > 1
      : isLastAttempt({ attempt, source }) && deliveryCount > 2;
  if (redeliveredSpent) {
    throw new Error(`${RETRIES_USED_UP}: redelivered for the dead-letter queue`);
  }

  try {
    // lastAttempt: the full schedule is used up. The workflow also checks the per-source limit
    // for the failure it meets (isLastAttempt with its attempt and source).
    await run({ lastAttempt: attempt >= MAX_RETRIES });
  } catch (error) {
    const retry = planRetry({ attempt, error, source });
    if (!retry) {
      throw error;
    }
    await scheduleRetry(
      buildRetryMessage({
        body,
        originalMessageId: firstMessageId(body, queueMeta),
        attempt: retry.attempt,
        delaySeconds: retry.delaySeconds
      })
    );
    safeLog("warn", "Sync failed. A retry is scheduled.", {
      ...queueMeta,
      nextAttempt: retry.attempt,
      delaySeconds: retry.delaySeconds,
      error: toErrorMeta(error)
    });
  }
}
