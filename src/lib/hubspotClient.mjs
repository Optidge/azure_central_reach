import axios from "axios";
import { withRetry } from "./retry.mjs";
import { HubSpotReadError } from "./mappedState.mjs";

let hubSpotHttpClient = null;

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
  if (!hubSpotHttpClient) {
    throw new Error("HubSpot client is not initialized");
  }

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
  if (!hubSpotHttpClient) {
    throw new Error("HubSpot client is not initialized");
  }

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
  if (!hubSpotHttpClient) {
    throw new Error("HubSpot client is not initialized");
  }

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
  if (!hubSpotHttpClient) {
    throw new Error("HubSpot client is not initialized");
  }

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
  if (!hubSpotHttpClient) {
    throw new Error("HubSpot client is not initialized");
  }

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

function assertHubSpotReady() {
  if (!hubSpotHttpClient) {
    throw new Error("HubSpot client is not initialized");
  }
}

export async function findHubSpotRecordsByEmployeeId({
  bcbaObjectTypeId,
  btRbtObjectTypeId,
  employeeId,
  excludeRecordId,
  employeeIdProperty = "employee_id"
}) {
  assertHubSpotReady();
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
  assertHubSpotReady();
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
