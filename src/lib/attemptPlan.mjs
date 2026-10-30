const REPLAY_DELAYS_MS = Object.freeze([30 * 60 * 1000, 2 * 60 * 60 * 1000]);
const SYNC_ERROR_MAX_LENGTH = 500;

/**
 * @typedef {{ replayCount: number, scheduledEnqueueTimeUtc: string, messageId: string }} Replay
 * @typedef {(
 *   | { action: "dry-run-stop", error: unknown }
 *   | { action: "hash-match-stop" }
 *   | { action: "hash-match-clear", hubspotPatch: Record<string, string> }
 *   | { action: "blocked", hubspotPatch: Record<string, string> }
 *   | { action: "write", hubspotPatch: Record<string, string | boolean> }
 *   | { action: "retry", error: unknown }
 *   | { action: "final-error", hubspotPatch: Record<string, string>, replay: Replay | null, error: unknown }
 * )} AttemptPlan
 */

export function syncErrorMessage(error) {
  const message = Array.isArray(error?.failedFieldIds) && error.failedFieldIds.length
    ? `MetadataWriteFailed fields: ${error.failedFieldIds.join(",")}`
    : String(error?.message || "Sync failed");
  return message.slice(0, SYNC_ERROR_MAX_LENGTH);
}

function nextReplay({ object, recordId, replayCount, nowMs }) {
  if (replayCount >= REPLAY_DELAYS_MS.length) {
    return null;
  }
  const next = replayCount + 1;
  return {
    replayCount: next,
    scheduledEnqueueTimeUtc: new Date(nowMs + REPLAY_DELAYS_MS[replayCount]).toISOString(),
    messageId: `replay:${object}:${recordId}:${next}`
  };
}

/**
 * Pure. centralReachId is the id known to this attempt: the HubSpot id, a
 * pending link from an earlier create, or the id this attempt received.
 * Dry run is checked first so no error path can write HubSpot.
 * @returns {AttemptPlan}
 */
export function planAttempt({
  binding,
  recordId,
  lastSyncStatus,
  centralReachId,
  deliveryCount,
  maxDeliveryCount,
  replayCount = 0,
  hashMatched,
  dryRun,
  allowEmployeeCreate,
  payloadHash,
  error,
  nowMs
}) {
  const now = new Date(nowMs).toISOString();

  if (dryRun) {
    return { action: "dry-run-stop", error: error ?? null };
  }

  if (error) {
    if (deliveryCount < maxDeliveryCount) {
      return { action: "retry", error };
    }
    return {
      action: "final-error",
      hubspotPatch: {
        last_sync_status: "error",
        last_sync_at: now,
        last_sync_error: syncErrorMessage(error),
        ...(centralReachId ? { [binding.centralReachIdProperty]: centralReachId } : {})
      },
      replay: centralReachId
        ? nextReplay({ object: binding.object, recordId, replayCount, nowMs })
        : null,
      error
    };
  }

  if (hashMatched && centralReachId) {
    if (lastSyncStatus === "error") {
      return {
        action: "hash-match-clear",
        hubspotPatch: { last_sync_status: "noop", last_sync_at: now, last_sync_error: "" }
      };
    }
    return { action: "hash-match-stop" };
  }

  if (binding.allowsBlocked && !centralReachId && !allowEmployeeCreate) {
    return {
      action: "blocked",
      hubspotPatch: {
        last_sync_status: "blocked",
        last_sync_at: now,
        last_sync_error: "Employee create is disabled. Provide an existing employee_id."
      }
    };
  }

  return {
    action: "write",
    hubspotPatch: {
      updated_by_integration: true,
      integration_last_write: now,
      last_sync_at: now,
      last_sync_status: "success",
      last_sync_error: "",
      last_sync_hash: payloadHash
    }
  };
}

async function claimReplaySafely(ports, messageId) {
  try {
    return await ports.claimReplay(messageId);
  } catch {
    return false;
  }
}

/**
 * The only ordered side effects. upsert returns the link fields it learned,
 * which are merged over the plan's patch.
 * @returns {Promise<string>} the action that ran
 */
export async function runPlan(plan, ports) {
  switch (plan.action) {
    case "dry-run-stop":
    case "hash-match-stop":
      return plan.action;
    case "hash-match-clear":
    case "blocked":
      await ports.patch(plan.hubspotPatch);
      return plan.action;
    case "write": {
      const learned = await ports.upsert();
      await ports.patch({ ...plan.hubspotPatch, ...(learned || {}) });
      return plan.action;
    }
    case "retry":
      throw plan.error;
    case "final-error":
      await ports.patch(plan.hubspotPatch);
      if (plan.replay && (await claimReplaySafely(ports, plan.replay.messageId))) {
        await ports.schedule(plan.replay);
      }
      throw plan.error;
    default:
      throw new Error(`Unknown attempt action: ${plan.action}`);
  }
}
