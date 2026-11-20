import { ServiceBusClient } from "@azure/service-bus";
import { sha256 } from "./hash.mjs";

let serviceBusClient = null;
let clientSyncSender = null;
let employeeSyncSender = null;

export function createServiceBusClient(config) {
  serviceBusClient = new ServiceBusClient(config.serviceBus.connectionString);
  clientSyncSender = null;
  employeeSyncSender = null;
  if (config.serviceBus.clientSyncQueueName) {
    clientSyncSender = serviceBusClient.createSender(config.serviceBus.clientSyncQueueName);
  }
  if (config.serviceBus.employeeSyncQueueName) {
    employeeSyncSender = serviceBusClient.createSender(config.serviceBus.employeeSyncQueueName);
  }
  return serviceBusClient;
}

// Tests pass in fake senders, so the real message builders run and nothing is sent.
export function useServiceBusSenders({ clientSyncSender: client, employeeSyncSender: employee }) {
  clientSyncSender = client || null;
  employeeSyncSender = employee || null;
}

// The daily sweep spreads its messages with scheduled delivery. The scheduled time is a Service
// Bus property of the message; it is not part of the body.
function withScheduledTime(message, scheduledEnqueueTimeUtc) {
  return scheduledEnqueueTimeUtc ? { ...message, scheduledEnqueueTimeUtc } : message;
}

// Every queue message says which HubSpot portal it is for. A worker completes a message for
// another portal, or with no portal ID, without acting.
function requirePortalId(portalId) {
  const normalized = String(portalId ?? "").trim();
  if (!normalized) {
    throw new Error("Queue message: portalId is required");
  }
  return normalized;
}

export function buildClientSyncMessage({
  dealId,
  portalId,
  hsLastModifiedDate,
  source = "intakePoller",
  workflow = "clientSync",
  enqueuedAt = new Date().toISOString()
}) {
  const stamp = hsLastModifiedDate ? String(hsLastModifiedDate) : enqueuedAt;
  const body = {
    workflow,
    source,
    portalId: requirePortalId(portalId),
    dealId: String(dealId),
    enqueuedAt
  };
  if (hsLastModifiedDate) {
    body.hsLastModifiedDate = String(hsLastModifiedDate);
  }
  return {
    body,
    messageId: sha256(`${body.dealId}:${stamp}`)
  };
}

export async function sendClientSyncMessage(message) {
  if (!clientSyncSender) {
    throw new Error("Service Bus client is not initialized");
  }

  const outboundMessage = buildClientSyncMessage({
    dealId: String(message.dealId),
    portalId: message.portalId,
    hsLastModifiedDate: message.hsLastModifiedDate
      ? String(message.hsLastModifiedDate)
      : undefined,
    source: message.source || "intakePoller",
    workflow: message.workflow || "clientSync",
    enqueuedAt: message.enqueuedAt
  });

  await clientSyncSender.sendMessages(
    withScheduledTime(outboundMessage, message.scheduledEnqueueTimeUtc)
  );
}

export async function sendEmployeeSyncMessage(message) {
  if (!employeeSyncSender) {
    throw new Error("Service Bus client is not initialized");
  }

  const outboundMessage = buildEmployeeSyncMessage({
    recordId: message.recordId,
    portalId: message.portalId,
    employeeType: message.employeeType,
    hsLastModifiedDate: message.hsLastModifiedDate,
    workflow: message.workflow,
    source: message.source,
    enqueuedAt: message.enqueuedAt
  });

  await employeeSyncSender.sendMessages(
    withScheduledTime(outboundMessage, message.scheduledEnqueueTimeUtc)
  );
}

export function buildEmployeeSyncMessage({
  recordId,
  portalId,
  employeeType,
  hsLastModifiedDate,
  workflow = "employeeSync",
  source = "employeePoller",
  enqueuedAt = new Date().toISOString()
}) {
  const normalizedRecordId = String(recordId || "");
  const normalizedType = String(employeeType || "");
  const stamp = hsLastModifiedDate ? String(hsLastModifiedDate) : enqueuedAt;
  const body = {
    recordId: normalizedRecordId,
    employeeType: normalizedType,
    workflow,
    source,
    portalId: requirePortalId(portalId),
    enqueuedAt
  };
  if (hsLastModifiedDate) {
    body.hsLastModifiedDate = String(hsLastModifiedDate);
  }
  return {
    body,
    messageId: sha256(`${normalizedType}:${normalizedRecordId}:${stamp}`)
  };
}

// A retry is a new scheduled message. Its body is the failed message's body (so source and the
// portal ID are kept) plus the attempt number. Its ID is the first message's ID plus the attempt
// number: unique per attempt, and the same if the same retry is scheduled twice.
export function buildRetryMessage({ body, originalMessageId, attempt, delaySeconds, now = Date.now() }) {
  return {
    body: { ...body, attempt, originalMessageId },
    messageId: `${originalMessageId}:retry-${attempt}`,
    scheduledEnqueueTimeUtc: new Date(now + delaySeconds * 1000)
  };
}

// The queue workers send retries, so they create the Service Bus client from the app settings
// the first time one is needed.
function ensureServiceBusClient() {
  if (serviceBusClient) {
    return;
  }
  createServiceBusClient({
    serviceBus: {
      connectionString: process.env.SERVICE_BUS_CONNECTION_STRING,
      clientSyncQueueName: process.env.CLIENT_SYNC_QUEUE_NAME || "client-sync-queue",
      employeeSyncQueueName: process.env.EMPLOYEE_SYNC_QUEUE_NAME || "employee-sync-queue"
    }
  });
}

export async function scheduleClientRetry(retryMessage) {
  ensureServiceBusClient();
  await clientSyncSender.sendMessages(retryMessage);
}

export async function scheduleEmployeeRetry(retryMessage) {
  ensureServiceBusClient();
  await employeeSyncSender.sendMessages(retryMessage);
}
