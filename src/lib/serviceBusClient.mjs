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

export function buildClientSyncMessage({
  dealId,
  hsLastModifiedDate,
  source = "intakePoller",
  workflow = "clientSync",
  enqueuedAt = new Date().toISOString()
}) {
  const stamp = hsLastModifiedDate ? String(hsLastModifiedDate) : enqueuedAt;
  const body = {
    workflow,
    source,
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
    hsLastModifiedDate: message.hsLastModifiedDate
      ? String(message.hsLastModifiedDate)
      : undefined,
    source: message.source || "intakePoller",
    workflow: message.workflow || "clientSync",
    enqueuedAt: message.enqueuedAt
  });

  await clientSyncSender.sendMessages(outboundMessage);
}

export async function sendEmployeeSyncMessage(message) {
  if (!employeeSyncSender) {
    throw new Error("Service Bus client is not initialized");
  }

  const outboundMessage = buildEmployeeSyncMessage({
    recordId: message.recordId,
    employeeType: message.employeeType,
    hsLastModifiedDate: message.hsLastModifiedDate,
    workflow: message.workflow,
    source: message.source,
    enqueuedAt: message.enqueuedAt
  });

  await employeeSyncSender.sendMessages(outboundMessage);
}

export function buildEmployeeSyncMessage({
  recordId,
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
