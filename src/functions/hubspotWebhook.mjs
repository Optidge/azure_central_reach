import { app } from "@azure/functions";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import {
  computeHubSpotV2Signature,
  hubSpotV2SignaturesMatch,
  parseWebhookBody,
  readWebhookSettings,
  resolveWebhookTarget
} from "../lib/hubspotWebhook.mjs";
import {
  createServiceBusClient,
  sendClientSyncMessage,
  sendContactChangeMessage,
  sendEmployeeSyncMessage
} from "../lib/serviceBusClient.mjs";

let busReady = false;

function headerValue(request, name) {
  const headers = request?.headers;
  if (!headers) {
    return "";
  }
  if (typeof headers.get === "function") {
    return headers.get(name) || headers.get(name.toLowerCase()) || "";
  }
  return headers[name] || headers[name.toLowerCase()] || "";
}

function jsonError(status, code, message) {
  return {
    status,
    jsonBody: {
      ok: false,
      error: { code, message }
    }
  };
}

function ensureServiceBus() {
  if (busReady) {
    return;
  }
  createServiceBusClient({
    serviceBus: {
      connectionString: process.env.SERVICE_BUS_CONNECTION_STRING,
      clientSyncQueueName: process.env.CLIENT_SYNC_QUEUE_NAME || "client-sync-queue",
      employeeSyncQueueName: process.env.EMPLOYEE_SYNC_QUEUE_NAME || "employee-sync-queue"
    }
  });
  busReady = true;
}

// The webhook only checks the signature and queues the record ID. It keeps no state: every
// notice is queued, also a repeat for the same record, and the worker's record lock and its
// "nothing changed" check deal with the repeats.
export async function hubspotWebhook(request, context, dependencies = {}) {
  void context;
  const settings = dependencies.settings || readWebhookSettings();
  const method = String(request?.method || "").toUpperCase();

  if (method !== "POST") {
    return jsonError(405, "METHOD_NOT_ALLOWED", "POST is required");
  }

  if (!settings.secretReady) {
    return jsonError(
      503,
      "MISSING_WEBHOOK_SECRET",
      "HubSpot webhook client secret is not configured"
    );
  }

  const rawBody = dependencies.rawBody ?? (await request.text());
  const uri = settings.webhookUri || request?.url || "";
  const expected = computeHubSpotV2Signature({
    clientSecret: settings.clientSecret,
    method,
    uri,
    rawBody
  });
  const received = headerValue(request, "x-hubspot-signature");
  const version = headerValue(request, "x-hubspot-signature-version");

  if (version !== "v2" || !hubSpotV2SignaturesMatch(expected, received)) {
    return jsonError(401, "INVALID_SIGNATURE", "HubSpot signature validation failed");
  }

  const parsed = parseWebhookBody(rawBody);
  if (!parsed.ok) {
    return jsonError(400, "INVALID_WEBHOOK_BODY", parsed.message);
  }

  // Without a valid portal the object types are unknown and the message could not say which
  // portal it is for, so nothing is queued and the notice is not accepted.
  if (!settings.portalReady) {
    return jsonError(503, "INVALID_PORTAL_CONFIG", "HubSpot portal is not configured");
  }

  const resolved = resolveWebhookTarget({
    objectTypeId: parsed.objectTypeId,
    recordId: parsed.recordId,
    btRbtObjectTypeId: settings.btRbtObjectTypeId,
    bcbaObjectTypeId: settings.bcbaObjectTypeId
  });
  if (!resolved.ok) {
    return jsonError(400, "INVALID_WEBHOOK_BODY", resolved.message);
  }

  if (!settings.serviceBusReady) {
    return jsonError(
      503,
      "MISSING_SERVICE_BUS",
      "Service Bus is not configured for webhook enqueue"
    );
  }

  const recordId = resolved.dealId || resolved.contactId || resolved.recordId;
  const enqueuedAt = dependencies.enqueuedAt || new Date().toISOString();
  try {
    if (
      !dependencies.sendClientSyncMessage &&
      !dependencies.sendEmployeeSyncMessage &&
      !dependencies.sendContactChangeMessage
    ) {
      ensureServiceBus();
    }
    if (resolved.target === "contact") {
      // Row 6.1: one contactChange message on the client queue; the fan-out does the rest.
      const send = dependencies.sendContactChangeMessage || sendContactChangeMessage;
      await send({
        contactId: resolved.contactId,
        portalId: settings.portalId,
        source: "hubspotWorkflow",
        enqueuedAt
      });
    } else if (resolved.target === "client") {
      const send = dependencies.sendClientSyncMessage || sendClientSyncMessage;
      await send({
        dealId: resolved.dealId,
        portalId: settings.portalId,
        source: "hubspotWorkflow",
        workflow: "clientSync",
        enqueuedAt
      });
    } else {
      const send = dependencies.sendEmployeeSyncMessage || sendEmployeeSyncMessage;
      await send({
        recordId: resolved.recordId,
        employeeType: resolved.employeeType,
        portalId: settings.portalId,
        source: "hubspotWorkflow",
        workflow: "employeeSync",
        enqueuedAt
      });
    }
  } catch (error) {
    safeLog(
      "error",
      "HubSpot webhook enqueue failed.",
      buildErrorLog({
        workflow: "hubspotWebhook",
        stage: "enqueue",
        error,
        recordId
      })
    );
    return jsonError(500, "WEBHOOK_ENQUEUE_FAILED", "Could not enqueue sync");
  }

  safeLog("info", "HubSpot webhook accepted.", {
    target: resolved.target,
    objectTypeId: resolved.objectTypeId,
    recordId
  });

  return {
    status: 202,
    jsonBody: {
      ok: true,
      accepted: true,
      target: resolved.target,
      objectTypeId: resolved.objectTypeId,
      recordId
    }
  };
}

app.http("hubspotWebhook", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "hubspot-webhook",
  handler: hubspotWebhook
});
