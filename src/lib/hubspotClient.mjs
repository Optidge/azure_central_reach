import axios from "axios";
import { withRetry } from "./retry.mjs";
import { HubSpotReadError } from "./mappedState.mjs";

let hubSpotHttpClient = null;
const SEARCH_LIMIT = 50;

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

  return hubSpotHttpClient;
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

const CONTACT_PROPERTIES = ["firstname", "lastname", "email", "contact_category"];

export async function getContactById(contactId, properties = CONTACT_PROPERTIES) {
  if (!hubSpotHttpClient) {
    throw new Error("HubSpot client is not initialized");
  }

  const id = String(contactId || "").trim();
  if (!id) {
    throw new Error("HubSpot contactId is required");
  }

  const requestedProperties = Array.isArray(properties) ? properties : [];
  const params = requestedProperties.length
    ? { properties: requestedProperties.join(",") }
    : undefined;

  const response = await withRetry(
    () => hubSpotHttpClient.get(`/crm/v3/objects/0-1/${id}`, { params }),
    {
      maxAttempts: 3,
      baseDelayMs: 400,
      maxDelayMs: 5000
    }
  );

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

export async function updateEmployeeWritebackWithFallback({
  objectTypeId,
  recordId,
  properties,
  employeeIdProperty = "employee_id"
}) {
  try {
    await updateObjectProperties(objectTypeId, recordId, properties);
    return { fallbackUsed: false, removedProperties: [] };
  } catch (error) {
    const propertyName = String(employeeIdProperty || "employee_id").trim() || "employee_id";
    if (
      Object.prototype.hasOwnProperty.call(properties || {}, propertyName) &&
      hubspotMissingProperty(error, propertyName)
    ) {
      const fallbackProperties = { ...(properties || {}) };
      delete fallbackProperties[propertyName];
      await updateObjectProperties(objectTypeId, recordId, fallbackProperties);
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

/**
 * One page of records Azure never processed: checkbox Yes, no CentralReach id,
 * no last_sync_at, and last modified before the grace cutoff. The caller still
 * runs each result through the record state machine for the exact Yes token.
 */
export async function searchNeverProcessedRecords({
  objectTypeId,
  checkboxProperty,
  idProperty,
  modifiedBeforeIso
}) {
  assertHubSpotReady();
  const payload = {
    filterGroups: [
      {
        filters: [
          { propertyName: checkboxProperty, operator: "IN", values: ["Yes"] },
          { propertyName: idProperty, operator: "NOT_HAS_PROPERTY" },
          { propertyName: "last_sync_at", operator: "NOT_HAS_PROPERTY" },
          { propertyName: "hs_lastmodifieddate", operator: "LT", value: modifiedBeforeIso }
        ]
      }
    ],
    properties: [
      "hs_object_id",
      checkboxProperty,
      idProperty,
      "last_sync_at",
      "last_sync_status",
      "hs_lastmodifieddate"
    ],
    sorts: [{ propertyName: "hs_lastmodifieddate", direction: "ASCENDING" }],
    limit: SEARCH_LIMIT
  };

  const searchResult = await runSearch(`/crm/v3/objects/${objectTypeId}/search`, payload);
  return Array.isArray(searchResult?.results) ? searchResult.results : [];
}

export async function searchRecordsByKnownProperty({
  objectTypeId,
  propertyName,
  properties = [],
  limit = 50,
  after = null
}) {
  assertHubSpotReady();
  const normalizedType = String(objectTypeId || "").trim();
  const normalizedProperty = String(propertyName || "").trim();
  if (!normalizedType || !normalizedProperty) {
    throw new Error("objectTypeId and propertyName are required");
  }

  const perRequestLimit = Math.min(Math.max(Number(limit) || 1, 1), SEARCH_LIMIT);
  const payload = {
    filterGroups: [
      {
        filters: [{ propertyName: normalizedProperty, operator: "HAS_PROPERTY" }]
      }
    ],
    properties: properties.length ? properties : [normalizedProperty, "hs_object_id"],
    sorts: [{ propertyName: "hs_object_id", direction: "ASCENDING" }],
    limit: perRequestLimit,
    ...(after ? { after } : {})
  };

  const searchResult = await runSearch(`/crm/v3/objects/${normalizedType}/search`, payload);
  return {
    results: Array.isArray(searchResult?.results) ? searchResult.results : [],
    nextAfter: searchResult?.paging?.next?.after || null
  };
}

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

    const page = Array.isArray(response?.data?.results) ? response.data.results : [];
    for (const row of page) {
      const typeIds = (Array.isArray(row?.associationTypes) ? row.associationTypes : [])
        .map((item) => Number(item?.typeId))
        .filter((value) => Number.isFinite(value));
      collected.push({
        toObjectId: String(row?.toObjectId ?? ""),
        typeIds
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
