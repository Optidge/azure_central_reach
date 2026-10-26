import { createHash, timingSafeEqual } from "node:crypto";

const DEAL_OBJECT_TYPES = new Set(["0-3", "deal", "deals"]);
const PLACEHOLDER_VALUES = new Set(["", "CHANGE_ME"]);

export function computeHubSpotV2Signature({ clientSecret, method, uri, rawBody }) {
  const source = `${clientSecret}${String(method || "").toUpperCase()}${uri}${rawBody ?? ""}`;
  return createHash("sha256").update(source, "utf8").digest("hex");
}

export function hubSpotV2SignaturesMatch(expectedHex, receivedHeader) {
  const expected = String(expectedHex || "").trim().toLowerCase();
  const received = String(receivedHeader || "").trim().toLowerCase();
  if (!expected || !received || expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function isConfigured(value) {
  return !PLACEHOLDER_VALUES.has(value) && !value.includes("CHANGE_ME");
}

export function readWebhookSettings(env = process.env) {
  const clientSecret = readFrom(env, "HUBSPOT_WEBHOOK_CLIENT_SECRET");
  const webhookUri = readFrom(env, "HUBSPOT_WEBHOOK_URI");
  const btRbtObjectTypeId = readFrom(env, "HS_BT_RBT_OBJECT_TYPE_ID");
  const bcbaObjectTypeId = readFrom(env, "HS_BCBA_OBJECT_TYPE_ID");
  const serviceBusConnectionString = readFrom(env, "SERVICE_BUS_CONNECTION_STRING");
  const parsedCoalesce = Number(readFrom(env, "HUBSPOT_WEBHOOK_COALESCE_SECONDS") || "30");
  const coalesceSeconds = Number.isFinite(parsedCoalesce) && parsedCoalesce > 0
    ? parsedCoalesce
    : 0;

  return {
    clientSecret,
    webhookUri,
    btRbtObjectTypeId,
    bcbaObjectTypeId,
    coalesceSeconds,
    secretReady: isConfigured(clientSecret),
    serviceBusReady: isConfigured(serviceBusConnectionString),
    cosmosReady: ["COSMOS_ENDPOINT", "COSMOS_KEY", "COSMOS_DATABASE_ID", "COSMOS_CONTAINER_ID"].every(
      (name) => isConfigured(readFrom(env, name))
    )
  };
}

function readFrom(env, name) {
  const value = env[name];
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

export function parseWebhookBody(rawBody) {
  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, message: "Webhook body must be JSON" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, message: "Webhook body must be a JSON object" };
  }

  return {
    ok: true,
    objectTypeId: parsed.objectTypeId,
    recordId: parsed.recordId ?? parsed.hs_object_id
  };
}

export function resolveWebhookTarget({
  objectTypeId,
  recordId,
  btRbtObjectTypeId,
  bcbaObjectTypeId
}) {
  const type = String(objectTypeId || "").trim();
  const id = String(recordId || "").trim();
  if (!type || !id) {
    return { ok: false, message: "objectTypeId and recordId are required" };
  }

  if (DEAL_OBJECT_TYPES.has(type)) {
    return { ok: true, target: "client", dealId: id, objectTypeId: "0-3" };
  }

  if (isConfigured(bcbaObjectTypeId) && (type === bcbaObjectTypeId || type === "bcba")) {
    return {
      ok: true,
      target: "employee",
      employeeType: "bcba",
      recordId: id,
      objectTypeId: bcbaObjectTypeId
    };
  }

  if (
    isConfigured(btRbtObjectTypeId) &&
    (type === btRbtObjectTypeId || type === "bt_rbt" || type === "btrbt")
  ) {
    return {
      ok: true,
      target: "employee",
      employeeType: "bt_rbt",
      recordId: id,
      objectTypeId: btRbtObjectTypeId
    };
  }

  return { ok: false, message: "objectTypeId is not a configured sync object" };
}
