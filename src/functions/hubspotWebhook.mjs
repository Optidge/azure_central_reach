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
import { createServiceBusClient, sendClientSyncMessage, sendEmployeeSyncMessage } from "../lib/serviceBusClient.mjs";
import { acquireLease, createStateClient } from "../lib/cosmosState.mjs";

const WEBHOOK_DEDUPE_PK = "dedupe:hubspot-webhook";
let busReady = false;
let cosmosReady = false;

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

function ensureCosmos() {
  if (cosmosReady) {
    return;
  }
  createStateClient({
    state: {
      cosmosEndpoint: process.env.COSMOS_ENDPOINT,
      cosmosKey: process.env.COSMOS_KEY,
      cosmosDatabaseId: process.env.COSMOS_DATABASE_ID,
      cosmosContainerId: process.env.COSMOS_CONTAINER_ID
    }
  });
  cosmosReady = true;
}

async function claimCoalesce({ settings, target, recordId, claim }) {
  if (!settings.coalesceSeconds) {
    return false;
  }
  const claimLease = claim || (async (input) => {
    ensureCosmos();
    return acquireLease(input);
  });
  try {
    const claimed = await claimLease({
      pk: WEBHOOK_DEDUPE_PK,
      id: `${target}:${recordId}`,
      ttlSeconds: settings.coalesceSeconds
    });
    return claimed === false;
  } catch (error) {
    safeLog(
      "warn",
      "HubSpot webhook coalesce check failed. Enqueueing anyway.",
      buildErrorLog({
        workflow: "hubspotWebhook",
        stage: "coalesce",
        error,
        recordId
      })
    );
    return false;
  }
}

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

  const recordId = resolved.dealId || resolved.recordId;
  const coalesced = settings.cosmosReady
    ? await claimCoalesce({
      settings,
      target: resolved.employeeType || resolved.target,
      recordId,
      claim: dependencies.claimCoalesce
    })
    : false;

  if (coalesced) {
    safeLog("info", "HubSpot webhook coalesced.", {
      target: resolved.target,
      objectTypeId: resolved.objectTypeId,
      recordId
    });
    return {
      status: 202,
      jsonBody: {
        ok: true,
        accepted: true,
        coalesced: true,
        target: resolved.target,
        objectTypeId: resolved.objectTypeId,
        recordId
      }
    };
  }

  const enqueuedAt = dependencies.enqueuedAt || new Date().toISOString();
  try {
    if (!dependencies.sendClientSyncMessage && !dependencies.sendEmployeeSyncMessage) {
      ensureServiceBus();
    }
    if (resolved.target === "client") {
      const send = dependencies.sendClientSyncMessage || sendClientSyncMessage;
      await send({
        dealId: resolved.dealId,
        source: "hubspotWorkflow",
        workflow: "clientSync",
        enqueuedAt
      });
    } else {
      const send = dependencies.sendEmployeeSyncMessage || sendEmployeeSyncMessage;
      await send({
        recordId: resolved.recordId,
        employeeType: resolved.employeeType,
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
      coalesced: false,
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
