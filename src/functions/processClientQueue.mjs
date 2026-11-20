import { app } from "@azure/functions";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import { hubspotPortalId } from "../lib/config.mjs";
import { processSyncMessage, readAttempt } from "../lib/queueRetry.mjs";
import { CONTACT_CHANGE_WORKFLOW, scheduleClientRetry } from "../lib/serviceBusClient.mjs";
import { QUEUE_WORKFLOWS } from "../constants/queues.mjs";
import { runClientSyncWorkflow } from "../workflows/clientSyncWorkflow.mjs";
import {
  CONTACT_FAN_OUT_SOURCE,
  runContactFanOutWorkflow
} from "../workflows/contactFanOutWorkflow.mjs";

const ALLOWED_SOURCES = new Set([
  "intakePoller",
  "dailySweep",
  "clientSyncHttpTest",
  "manualClientSyncTest",
  "hubspotWorkflow",
  // Row 6.2: a Case queued by the Contact fan-out.
  CONTACT_FAN_OUT_SOURCE,
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
  contactId,
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
    ...(contactId ? { contactId } : {}),
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

function validateSource(payload) {
  const source = asNonEmptyString(payload?.source) || "unknown";
  if (source !== "unknown" && !ALLOWED_SOURCES.has(source)) {
    throw new Error("Invalid queue message: source is not allowed");
  }
  return source;
}

// Row 6.1: a contactChange message holds the Contact ID and the portal ID. It is run by the
// Contact fan-out, which queues the linked Cases and BCBAs.
function validateContactChangeMessage(payload) {
  const contactId = asNonEmptyString(payload?.contactId);
  if (!contactId) {
    throw new Error("Invalid queue message: contactId is required");
  }
  return {
    contactId,
    workflow: CONTACT_CHANGE_WORKFLOW,
    source: validateSource(payload),
    enqueuedAt: asNonEmptyString(payload?.enqueuedAt) || undefined,
    attempt: readAttempt(payload?.attempt)
  };
}

function validateQueueMessage(payload) {
  const dealId = asNonEmptyString(payload?.dealId);
  const workflow = asNonEmptyString(payload?.workflow);
  const hsLastModifiedDate = asNonEmptyString(payload?.hsLastModifiedDate) || undefined;
  const enqueuedAt = asNonEmptyString(payload?.enqueuedAt) || undefined;

  if (workflow === CONTACT_CHANGE_WORKFLOW) {
    return validateContactChangeMessage(payload);
  }

  if (!dealId) {
    throw new Error("Invalid queue message: dealId is required");
  }

  if (workflow && workflow !== QUEUE_WORKFLOWS.CLIENT_SYNC) {
    throw new Error(
      "Invalid queue message: workflow must be clientSync or contactChange when provided"
    );
  }

  const source = validateSource(payload);

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
  const runContactFanOut = dependencies.runContactFanOut || runContactFanOutWorkflow;
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
        validated.workflow === CONTACT_CHANGE_WORKFLOW
          ? runContactFanOut({
              contactId: validated.contactId,
              source: validated.source,
              context,
              attempt: validated.attempt
            })
          : runWorkflow({
              dealId: validated.dealId,
              hsLastModifiedDate: validated.hsLastModifiedDate,
              source: validated.source,
              context,
              lastAttempt,
              // Row 3.20: the delivery attempt, for the run summary line.
              attempt: validated.attempt
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
      contactId: asNonEmptyString(parsedBody?.contactId) || undefined,
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
        recordId: validationMeta.dealId || validationMeta.contactId,
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
