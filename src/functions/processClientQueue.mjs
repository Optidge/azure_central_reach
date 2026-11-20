import { app } from "@azure/functions";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import { hubspotPortalId } from "../lib/config.mjs";
import { processSyncMessage, readAttempt } from "../lib/queueRetry.mjs";
import { scheduleClientRetry } from "../lib/serviceBusClient.mjs";
import { QUEUE_WORKFLOWS } from "../constants/queues.mjs";
import { runClientSyncWorkflow } from "../workflows/clientSyncWorkflow.mjs";

const ALLOWED_SOURCES = new Set([
  "intakePoller",
  "dailySweep",
  "clientSyncHttpTest",
  "manualClientSyncTest",
  "hubspotWorkflow",
  // No sender uses this name since Stage 3 (row 3.2). It stays so that a message queued or
  // scheduled for a retry by an older build still completes.
  "linkedRecheck"
]);

function asNonEmptyString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const parsed = String(value).trim();
  return parsed;
}

function parseMessageBody(message) {
  if (typeof message === "string") {
    try {
      return JSON.parse(message);
    } catch {
      throw new Error("Invalid queue message body: expected valid JSON string");
    }
  }

  if (message && typeof message === "object") {
    return message;
  }

  throw new Error("Invalid queue message body: expected object or JSON string");
}

function buildQueueMeta({
  context,
  message,
  dealId,
  hsLastModifiedDate,
  workflow,
  source,
  enqueuedAt,
  attempt
}) {
  return {
    functionName: context?.functionName,
    invocationId: context?.invocationId,
    dealId,
    hsLastModifiedDate,
    workflow,
    source,
    enqueuedAt,
    attempt,
    messageId: message?.messageId ?? context?.triggerMetadata?.messageId,
    deliveryCount: message?.deliveryCount ?? context?.triggerMetadata?.deliveryCount,
    enqueuedTimeUtc:
      message?.enqueuedTimeUtc ??
      context?.triggerMetadata?.enqueuedTimeUtc ??
      context?.triggerMetadata?.enqueuedTime
  };
}

function validateQueueMessage(payload) {
  const dealId = asNonEmptyString(payload?.dealId);
  const workflow = asNonEmptyString(payload?.workflow);
  const source = asNonEmptyString(payload?.source) || "unknown";
  const hsLastModifiedDate = asNonEmptyString(payload?.hsLastModifiedDate) || undefined;
  const enqueuedAt = asNonEmptyString(payload?.enqueuedAt) || undefined;

  if (!dealId) {
    throw new Error("Invalid queue message: dealId is required");
  }

  if (workflow && workflow !== QUEUE_WORKFLOWS.CLIENT_SYNC) {
    throw new Error("Invalid queue message: workflow must be clientSync when provided");
  }

  if (source !== "unknown" && !ALLOWED_SOURCES.has(source)) {
    throw new Error("Invalid queue message: source is not allowed");
  }

  return {
    dealId,
    workflow: workflow || QUEUE_WORKFLOWS.CLIENT_SYNC,
    source,
    hsLastModifiedDate,
    enqueuedAt,
    attempt: readAttempt(payload?.attempt)
  };
}

export async function processClientQueue(message, context, dependencies = {}) {
  const runWorkflow = dependencies.runWorkflow || runClientSyncWorkflow;
  const scheduleRetry = dependencies.scheduleRetry || scheduleClientRetry;

  try {
    // An invalid message always throws, so it reaches the dead-letter queue and the alert.
    const payload = parseMessageBody(message);
    const validated = validateQueueMessage(payload);
    const queueMeta = buildQueueMeta({ context, message, ...validated });

    safeLog("info", "Client queue message accepted.", queueMeta);

    await processSyncMessage({
      body: payload,
      attempt: validated.attempt,
      configuredPortalId: dependencies.portalId || hubspotPortalId(),
      queueMeta,
      scheduleRetry,
      run: ({ lastAttempt }) =>
        runWorkflow({
          dealId: validated.dealId,
          hsLastModifiedDate: validated.hsLastModifiedDate,
          source: validated.source,
          context,
          lastAttempt
        })
    });

    safeLog("info", "Client queue message processed.", queueMeta);
  } catch (error) {
    const parsedBody = (() => {
      try {
        return parseMessageBody(message);
      } catch {
        return {};
      }
    })();

    const validationMeta = {
      dealId: asNonEmptyString(parsedBody?.dealId) || undefined,
      hsLastModifiedDate: asNonEmptyString(parsedBody?.hsLastModifiedDate) || undefined,
      workflow: asNonEmptyString(parsedBody?.workflow) || undefined,
      source: asNonEmptyString(parsedBody?.source) || "unknown"
    };

    safeLog(
      "error",
      "Client queue processing failed.",
      buildErrorLog({
        workflow: QUEUE_WORKFLOWS.CLIENT_SYNC,
        stage: "processClientQueue",
        error,
        recordId: validationMeta.dealId,
        extra: buildQueueMeta({
          context,
          message,
          ...validationMeta,
          enqueuedAt: asNonEmptyString(parsedBody?.enqueuedAt) || undefined
        })
      })
    );

    throw error;
  }
}

app.serviceBusQueue("processClientQueue", {
  connection: "SERVICE_BUS_CONNECTION_STRING",
  queueName: process.env.CLIENT_SYNC_QUEUE_NAME || "client-sync-queue",
  handler: processClientQueue
});
