import axios from "axios";
import { sha256 } from "./hash.mjs";
import { withRetry } from "./retry.mjs";
import { HubSpotReadError } from "./mappedState.mjs";

let hubSpotHttpClient = null;

// Finding F-3: the token must belong to the configured portal (HUBSPOT_PORTAL_ID). Every function
// below that calls HubSpot waits for readyHubSpotClient() first, so no CRM read or write is sent
// with a token for another portal. One GET /account-info/v3/details per process: a match is kept
// for the life of the process; a mismatch or a failed call is not kept, so the next call checks
// again. The check is keyed by base URL, token hash and configured portal, so new settings are
// checked again. The token itself is not kept here.
const ACCOUNT_DETAILS_PATH = "/account-info/v3/details";
export const HUBSPOT_PORTAL_MISMATCH = "HUBSPOT_PORTAL_MISMATCH";
let portalCheck = null;

// Invalid configuration: the token answers for another portal. Portal IDs are not secrets, so the
// message names both. Sorted like the other configuration failures (src/lib/retry.mjs).
export function hubspotPortalMismatchError(configuredPortalId, tokenPortalId) {
  const error = new Error(
    `HubSpot token belongs to portal ${tokenPortalId}, but HUBSPOT_PORTAL_ID is ${configuredPortalId}. No HubSpot CRM call was made.`
  );
  error.name = "HubSpotPortalMismatchError";
  error.code = HUBSPOT_PORTAL_MISMATCH;
  error.configuredPortalId = configuredPortalId;
  error.tokenPortalId = tokenPortalId;
  return error;
}

// A failed details call is a failed HubSpot read: temporary, retried like the other reads. The
// status and Retry-After are kept for the retry schedule; the answer body is not.
function accountDetailsReadError(error, status) {
  const readError = new HubSpotReadError("account-info", status);
  if (error?.response) {
    readError.response = { status: error.response.status, headers: error.response.headers };
  }
  return readError;
}

async function verifyTokenPortal(client, configuredPortalId) {
  if (!configuredPortalId) {
    throw new Error("Invalid configuration: HUBSPOT_PORTAL_ID");
  }
  let response;
  try {
    response = await withRetry(() => client.get(ACCOUNT_DETAILS_PATH), {
      maxAttempts: 3,
      baseDelayMs: 400,
      maxDelayMs: 5000
    });
  } catch (error) {
    if (error?.response) {
      throw accountDetailsReadError(error, error.response.status);
    }
    throw error;
  }
  const tokenPortalId = String(response?.data?.portalId ?? "").trim();
  if (!tokenPortalId) {
    throw accountDetailsReadError(null, response?.status);
  }
  if (tokenPortalId !== configuredPortalId) {
    throw hubspotPortalMismatchError(configuredPortalId, tokenPortalId);
  }
}

async function readyHubSpotClient() {
  if (!hubSpotHttpClient) {
    throw new Error("HubSpot client is not initialized");
  }
  const check = portalCheck;
  if (check.verified) {
    return;
  }
  // Calls that start together share one details call.
  if (!check.pending) {
    check.pending = verifyTokenPortal(hubSpotHttpClient, check.configuredPortalId)
      .then(() => {
        check.verified = true;
      })
      .finally(() => {
        check.pending = null;
      });
  }
  await check.pending;
}

function extractHubspotErrorBlob(error) {
  const data = error?.response?.data || {};
  const messageParts = [];

  if (typeof error?.message === "string") {
    messageParts.push(error.message);
  }
  if (typeof data?.message === "string") {
    messageParts.push(data.message);
  }
  if (typeof data?.category === "string") {
    messageParts.push(data.category);
  }
  if (typeof data?.subCategory === "string") {
    messageParts.push(data.subCategory);
  }

  if (Array.isArray(data?.errors)) {
    for (const subError of data.errors) {
      if (typeof subError?.message === "string") {
        messageParts.push(subError.message);
      }
      if (typeof subError?.subCategory === "string") {
        messageParts.push(subError.subCategory);
      }
      if (typeof subError?.code === "string") {
        messageParts.push(subError.code);
      }
    }
  }

  return messageParts.join(" ").toLowerCase();
}

async function runSearch(objectPath, payload) {
  await readyHubSpotClient();

  const response = await withRetry(
    () => hubSpotHttpClient.post(objectPath, payload),
    {
      maxAttempts: 3,
      baseDelayMs: 250,
      maxDelayMs: 5000
    }
  );

  return response?.data || {};
}

export function createHubSpotClient(config) {
  const configuredPortalId = String(config?.hubspot?.hubspotPortalId ?? "").trim();
  const checkKey = sha256(
    JSON.stringify([config?.hubspot?.baseUrl, config?.hubspot?.privateAppToken, configuredPortalId])
  );
  if (portalCheck?.key !== checkKey) {
    portalCheck = { key: checkKey, configuredPortalId, verified: false, pending: null };
  }
  hubSpotHttpClient = axios.create({
    baseURL: config.hubspot.baseUrl,
    headers: {
      Authorization: `Bearer ${config.hubspot.privateAppToken}`,
      "Content-Type": "application/json"
    },
    timeout: 15000
  });
  // HubSpot and CentralReach failures are sorted by different rules (src/lib/retry.mjs), so a
  // HubSpot failure says where it came from.
  hubSpotHttpClient.interceptors.response.use(undefined, (error) => {
    if (error && typeof error === "object") {
      error.provider = "hubspot";
    }
    return Promise.reject(error);
  });

  return hubSpotHttpClient;
}

// The first page of a CRM search, for the poller and the daily sweep. The caller builds the
// filters, and asks for the next page with a new search (by timestamp or by record ID), never
// with HubSpot's position cursor. `nextAfter` only says that more records match.
// A search HubSpot rejects is thrown as it is: no second search with fewer filters is tried.
// An answer with no results list is a failed read, never "no records" (rule 5.8).
export async function searchObjectPage({ objectTypeId, filterGroups, sorts, properties, limit }) {
  const typeId = String(objectTypeId || "").trim();
  if (!typeId) {
    throw new Error("HubSpot objectTypeId is required for search");
  }

  const answer = await runSearch(`/crm/v3/objects/${typeId}/search`, {
    filterGroups,
    sorts,
    properties,
    limit
  });
  if (!Array.isArray(answer?.results)) {
    throw new HubSpotReadError(`search:${typeId}`);
  }
  return {
    results: answer.results,
    nextAfter: answer.paging?.next?.after || null
  };
}

export async function getDealById(dealId, properties = []) {
  await readyHubSpotClient();

  const id = String(dealId || "").trim();
  if (!id) {
    throw new Error("HubSpot dealId is required");
  }

  const requestedProperties = Array.isArray(properties) ? properties : [];
  const params = requestedProperties.length
    ? { properties: requestedProperties.join(",") }
    : undefined;

  const response = await withRetry(() => hubSpotHttpClient.get(`/crm/v3/objects/deals/${id}`, { params }), {
    maxAttempts: 3,
    baseDelayMs: 400,
    maxDelayMs: 5000
  });

  return response?.data || null;
}

function hubspotMissingProperty(error, propertyName) {
  const status = error?.response?.status;
  if (status !== 400 && status !== 422) {
    return false;
  }

  const blob = extractHubspotErrorBlob(error);
  const property = String(propertyName || "").trim().toLowerCase();
  if (!property || !blob.includes(property)) {
    return false;
  }

  return (
    blob.includes("doesn't exist") ||
    blob.includes("does not exist") ||
    blob.includes("unknown property") ||
    blob.includes("invalid property") ||
    blob.includes("property")
  );
}

// If HubSpot rejects the CR id property, the rest of the writeback is still saved, but the record
// is marked as an error: without the id on the record, HubSpot does not show it as linked.
export async function updateEmployeeWritebackWithFallback({
  objectTypeId,
  recordId,
  properties,
  employeeIdProperty = "employee_id",
  updateProperties = updateObjectProperties
}) {
  try {
    await updateProperties(objectTypeId, recordId, properties);
    return { fallbackUsed: false, removedProperties: [] };
  } catch (error) {
    const propertyName = String(employeeIdProperty || "employee_id").trim() || "employee_id";
    if (
      Object.prototype.hasOwnProperty.call(properties || {}, propertyName) &&
      hubspotMissingProperty(error, propertyName)
    ) {
      const fallbackProperties = {
        ...(properties || {}),
        last_sync_status: "error",
        last_sync_error: `HubSpot rejected the ${propertyName} writeback. The CentralReach id is not stored on this record.`
      };
      delete fallbackProperties[propertyName];
      await updateProperties(objectTypeId, recordId, fallbackProperties);
      return { fallbackUsed: true, removedProperties: [propertyName] };
    }
    throw error;
  }
}

export async function getObjectById(objectTypeId, objectId, properties = []) {
  await readyHubSpotClient();

  const normalizedTypeId = String(objectTypeId || "").trim();
  const id = String(objectId || "").trim();

  if (!normalizedTypeId) {
    throw new Error("HubSpot objectTypeId is required");
  }
  if (!id) {
    throw new Error("HubSpot objectId is required");
  }

  const requestedProperties = Array.isArray(properties) ? properties : [];
  const params = requestedProperties.length
    ? { properties: requestedProperties.join(",") }
    : undefined;

  const response = await withRetry(
    () => hubSpotHttpClient.get(`/crm/v3/objects/${normalizedTypeId}/${id}`, { params }),
    {
      maxAttempts: 3,
      baseDelayMs: 400,
      maxDelayMs: 5000
    }
  );

  return response?.data || null;
}

export async function updateDealProperties(dealId, properties) {
  await readyHubSpotClient();

  const id = String(dealId || "").trim();
  if (!id) {
    throw new Error("HubSpot dealId is required");
  }

  if (!properties || typeof properties !== "object") {
    throw new Error("HubSpot properties payload must be an object");
  }

  const response = await withRetry(
    () => hubSpotHttpClient.patch(`/crm/v3/objects/deals/${id}`, { properties }),
    {
      maxAttempts: 3,
      baseDelayMs: 400,
      maxDelayMs: 5000
    }
  );

  return response?.data || null;
}

export async function updateObjectProperties(objectTypeId, objectId, properties) {
  await readyHubSpotClient();

  const normalizedTypeId = String(objectTypeId || "").trim();
  const id = String(objectId || "").trim();

  if (!normalizedTypeId) {
    throw new Error("HubSpot objectTypeId is required");
  }
  if (!id) {
    throw new Error("HubSpot objectId is required");
  }
  if (!properties || typeof properties !== "object") {
    throw new Error("HubSpot properties payload must be an object");
  }

  const response = await withRetry(
    () => hubSpotHttpClient.patch(`/crm/v3/objects/${normalizedTypeId}/${id}`, { properties }),
    {
      maxAttempts: 3,
      baseDelayMs: 400,
      maxDelayMs: 5000
    }
  );

  return response?.data || null;
}

export async function getBtRbtRecordById(recordId, objectTypeId, properties = []) {
  return getObjectById(objectTypeId, recordId, properties);
}

export async function getBcbaRecordById(recordId, objectTypeId, properties = []) {
  return getObjectById(objectTypeId, recordId, properties);
}

export async function findHubSpotRecordsByEmployeeId({
  bcbaObjectTypeId,
  btRbtObjectTypeId,
  employeeId,
  excludeRecordId,
  employeeIdProperty = "employee_id"
}) {
  await readyHubSpotClient();
  const wanted = String(employeeId ?? "").trim();
  const excluded = String(excludeRecordId ?? "").trim();
  if (!wanted) {
    return [];
  }
  const found = [];
  for (const objectTypeId of [bcbaObjectTypeId, btRbtObjectTypeId]) {
    const typeId = String(objectTypeId || "").trim();
    if (!typeId) {
      continue;
    }
    const searchResult = await runSearch(`/crm/v3/objects/${typeId}/search`, {
      filterGroups: [
        {
          filters: [{ propertyName: employeeIdProperty, operator: "EQ", value: wanted }]
        }
      ],
      properties: [employeeIdProperty, "hs_object_id"],
      limit: 100
    });
    // Rule 5.8: an answer with no results list is a failed read. It is never read as "no other
    // record holds this CR ID".
    if (!Array.isArray(searchResult?.results)) {
      throw new HubSpotReadError(`search:${typeId}`);
    }
    for (const row of searchResult.results) {
      const id = String(row?.id ?? row?.properties?.hs_object_id ?? "").trim();
      if (id && id !== excluded) {
        found.push({ id, objectTypeId: typeId });
      }
    }
  }
  return found;
}

// Returns one row per associated record: { toObjectId, types: [{ typeId, category }] }.
export async function listAssociations({ fromObjectType, fromId, toObjectType, maxPages = 20 }) {
  await readyHubSpotClient();
  const fromType = String(fromObjectType || "").trim();
  const recordId = String(fromId || "").trim();
  const toType = String(toObjectType || "").trim();
  if (!fromType || !recordId || !toType) {
    throw new Error("fromObjectType, fromId, and toObjectType are required");
  }

  const collected = [];
  let after = null;
  let pages = 0;
  while (pages < maxPages) {
    pages += 1;
    let response;
    try {
      response = await withRetry(
        () =>
          hubSpotHttpClient.get(
            `/crm/v4/objects/${fromType}/${recordId}/associations/${toType}`,
            { params: { limit: 500, ...(after ? { after } : {}) } }
          ),
        { maxAttempts: 3, baseDelayMs: 400, maxDelayMs: 5000 }
      );
    } catch (error) {
      const status = error?.response?.status;
      if (status === 403 || status === 401) {
        throw new HubSpotReadError(`associations:${toType}`, status);
      }
      throw error;
    }

    // Rule 5.8: an answer with no results list is a failed read. It is never read as "no
    // associations", which would look like "no staff on this Case".
    const page = response?.data?.results;
    if (!Array.isArray(page)) {
      throw new HubSpotReadError(`associations:${toType}`, response?.status);
    }
    for (const row of page) {
      // The category is kept: a role is a USER_DEFINED type, and a HUBSPOT_DEFINED type can
      // carry the same type ID.
      const types = (Array.isArray(row?.associationTypes) ? row.associationTypes : [])
        .map((item) => ({ typeId: Number(item?.typeId), category: item?.category ?? null }))
        .filter((type) => Number.isFinite(type.typeId));
      collected.push({
        toObjectId: String(row?.toObjectId ?? ""),
        types
      });
    }

    after = response?.data?.paging?.next?.after || null;
    if (!after) {
      break;
    }
  }

  return collected;
}

// Row 4.14: the property values of several records of one object type, in one POST
// /crm/v3/objects/{type}/batch/read per 100 IDs (HubSpot's limit). A read call, not a write.
// Returns one { id, properties } per record HubSpot answered. It never fills in a record HubSpot
// did not answer: the caller checks that every ID it asked for is there (rule 5.8). A 401 or 403,
// or an answer with no results list, is a failed read.
const BATCH_READ_LIMIT = 100;

export async function readObjectsBatch({ objectTypeId, ids, properties }) {
  await readyHubSpotClient();
  const typeId = String(objectTypeId || "").trim();
  if (!typeId) {
    throw new Error("HubSpot objectTypeId is required for a batch read");
  }
  const wanted = [...new Set((ids || []).map((id) => String(id ?? "").trim()).filter(Boolean))];
  const found = [];
  for (let start = 0; start < wanted.length; start += BATCH_READ_LIMIT) {
    let response;
    try {
      response = await withRetry(
        () =>
          hubSpotHttpClient.post(`/crm/v3/objects/${typeId}/batch/read`, {
            properties,
            inputs: wanted.slice(start, start + BATCH_READ_LIMIT).map((id) => ({ id }))
          }),
        { maxAttempts: 3, baseDelayMs: 400, maxDelayMs: 5000 }
      );
    } catch (error) {
      const status = error?.response?.status;
      if (status === 403 || status === 401) {
        throw new HubSpotReadError(`batch:${typeId}`, status);
      }
      throw error;
    }
    if (!Array.isArray(response?.data?.results)) {
      throw new HubSpotReadError(`batch:${typeId}`, response?.status);
    }
    for (const row of response.data.results) {
      found.push({ id: String(row?.id ?? ""), properties: row?.properties || {} });
    }
  }
  return found;
}

export async function writeEmployeeIdToObject({
  objectTypeId,
  recordId,
  employeeIdProperty = "employee_id",
  employeeId
}) {
  const safeProperty = String(employeeIdProperty || "employee_id").trim() || "employee_id";
  return updateObjectProperties(objectTypeId, recordId, {
    [safeProperty]: employeeId ? String(employeeId) : ""
  });
}
