import axios from "axios";
import { withRetry } from "./retry.mjs";
import { CENTRAL_REACH_METADATA_FIELD_TYPES } from "../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../constants/hubspot.mjs";
import { clientWritePlan } from "./mappedState.mjs";

let centralReachHttpClient = null;
let centralReachConfig = null;
let tokenCache = {
  accessToken: null,
  expiresAtMs: 0
};
const EMPLOYEE_CONTACT_FORMS = {
  [HUBSPOT_EMPLOYEE_TYPES.BT_RBT]: "Behavior Technician NY",
  [HUBSPOT_EMPLOYEE_TYPES.BCBA]: "Admin"
};

export function getEmployeeContactForm(employeeType) {
  const normalizedType = String(employeeType || "").trim();
  return EMPLOYEE_CONTACT_FORMS[normalizedType] || null;
}

export function createCentralReachClient(config) {
  centralReachConfig = config;
  centralReachHttpClient = axios.create({
    baseURL: config.centralReach.baseUrl,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.centralReach.apiKey
    },
    timeout: 15000
  });

  return centralReachHttpClient;
}

export async function getCentralReachAccessToken() {
  if (!centralReachConfig) {
    throw new Error("CentralReach client is not initialized");
  }

  if (
    tokenCache.accessToken &&
    Number.isFinite(tokenCache.expiresAtMs) &&
    tokenCache.expiresAtMs - Date.now() > 60000
  ) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: centralReachConfig.centralReach.clientId,
    client_secret: centralReachConfig.centralReach.clientSecret,
    scope: "cr-api"
  });

  const response = await withRetry(
    () =>
      axios.post(centralReachConfig.centralReach.tokenUrl, body.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json"
        },
        timeout: 15000
      }),
    {
      maxAttempts: 3,
      baseDelayMs: 400,
      maxDelayMs: 5000
    }
  );

  const accessToken = response?.data?.access_token;
  if (!accessToken) {
    throw new Error("CentralReach token request failed: access_token missing");
  }

  const expiresIn = Number(response?.data?.expires_in || 3600);
  tokenCache = {
    accessToken,
    expiresAtMs: Date.now() + expiresIn * 1000
  };

  return accessToken;
}

function extractCrContactId(data) {
  const candidates = [
    data?.contactId,
    data?.id,
    data?.contact?.contactId,
    data?.contact?.id,
    data?.result?.contactId,
    data?.result?.id
  ];

  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim() !== "") {
      return String(candidate);
    }
  }

  return null;
}

function readCrExternalSystemId(data) {
  const candidates = [
    data?.externalSystemId,
    data?.ExternalSystemId,
    data?.employee?.externalSystemId,
    data?.employee?.ExternalSystemId,
    data?.contact?.externalSystemId,
    data?.contact?.ExternalSystemId,
    data?.result?.externalSystemId,
    data?.result?.ExternalSystemId
  ];

  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim() !== "") {
      return String(candidate);
    }
  }

  return null;
}

function responseLooksNotFound(data) {
  const text = [
    data?.message,
    data?.responseStatus?.message,
    ...(Array.isArray(data?.responseStatus?.errors)
      ? data.responseStatus.errors.map((item) => `${item?.message ?? ""} ${item?.errorCode ?? ""}`)
      : [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /not\s*found|no\s*match|unable\s*to\s*find/.test(text);
}

// Requirement 9 (no duplicate creates): a create is allowed only when Central Reach clearly says
// the external id has no match. Anything else is an unknown outcome and must not lead to a create.
// - 404, or a 400 whose message says "not found": no match.
// - Any other error status (429, 5xx, ...) is rethrown, whatever its message says.
export function externalIdLookupMissed(error) {
  const status = error?.response?.status;
  if (status === 404) {
    return true;
  }
  return status === 400 && responseLooksNotFound(error?.response?.data || {});
}

// A 2xx answer: an id means found, explicit "not found" text means no match, and a body with
// neither is unknown.
export function readExternalIdLookup(response, entity) {
  const crContactId = extractCrContactId(response);
  if (responseLooksNotFound(response)) {
    return { found: false, crContactId: null };
  }
  if (crContactId) {
    return { found: true, crContactId, operation: "update" };
  }
  const unknown = new Error(`CentralReach ${entity} lookup returned no contactId`);
  unknown.code = "CR_LOOKUP_UNKNOWN";
  throw unknown;
}

// A create is sent once. A timeout or 5xx leaves the outcome unknown: Central Reach may have
// created the record. The next run finds it through the external-id lookup instead of posting again.
function markCreateOutcome(error) {
  const status = error?.response?.status;
  if (!status || status >= 500) {
    error.code = "CR_CREATE_OUTCOME_UNKNOWN";
  }
  return error;
}

async function crRequest(path, { method = "GET", body, suppressRetry = false } = {}) {
  if (!centralReachHttpClient || !centralReachConfig) {
    throw new Error("CentralReach client is not initialized");
  }

  const token = await getCentralReachAccessToken();
  const request = () =>
    centralReachHttpClient.request({
      url: path,
      method,
      data: body,
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": centralReachConfig.centralReach.apiKey
      }
    });

  const response = suppressRetry ? await request() : await withRetry(request, {
    maxAttempts: 3,
    baseDelayMs: 400,
    maxDelayMs: 5000
  });

  return response?.data || null;
}

async function updateClientByExternalSystemId(payload) {
  let response;
  try {
    response = await crRequest("/contacts/client/byExternalSystemId", {
      method: "PUT",
      body: payload
    });
  } catch (error) {
    if (externalIdLookupMissed(error)) {
      return { found: false, crContactId: null };
    }
    throw error;
  }

  return readExternalIdLookup(response, "client");
}

export async function createOrUpdateClient(payloadOrOptions) {
  const isOptionsObject =
    payloadOrOptions &&
    typeof payloadOrOptions === "object" &&
    Object.prototype.hasOwnProperty.call(payloadOrOptions, "payload");

  const payload = isOptionsObject ? payloadOrOptions.payload : payloadOrOptions;
  const existingContactId = isOptionsObject ? payloadOrOptions.existingContactId : null;

  if (!payload || typeof payload !== "object") {
    throw new Error("CentralReach client payload must be an object");
  }

  let lookedUpContactId = null;
  if (!String(existingContactId || "").trim()) {
    const lookedUp = await updateClientByExternalSystemId(payload);
    if (lookedUp.found) {
      lookedUpContactId = lookedUp.crContactId;
    }
  }

  const plan = clientWritePlan({ existingContactId, lookedUpContactId });
  if (plan.operation === "update") {
    if (!lookedUpContactId) {
      await crRequest(`/contacts/client/${plan.crContactId}`, {
        method: "PUT",
        body: payload
      });
    }
    return {
      operation: "update",
      crContactId: plan.crContactId
    };
  }

  let created;
  try {
    created = await crRequest("/contacts/client", {
      method: "POST",
      body: payload,
      suppressRetry: true
    });
  } catch (error) {
    throw markCreateOutcome(error);
  }

  const crContactId = extractCrContactId(created);
  if (!crContactId) {
    throw new Error("CentralReach create succeeded but returned no contactId");
  }

  return {
    operation: "create",
    crContactId
  };
}

export async function getEmployeeByContactId(contactId) {
  const normalizedId = String(contactId || "").trim();
  if (!normalizedId) {
    throw new Error("CentralReach employee contactId is required");
  }

  return crRequest(`/contacts/employee/${normalizedId}`, { method: "GET" });
}

export function buildEmployeePayloadForContactId(payload, existingEmployee = {}) {
  const nextPayload = payload && typeof payload === "object" ? { ...payload } : {};
  const existingExternalSystemId = readCrExternalSystemId(existingEmployee);
  const existingPrimaryEmail =
    existingEmployee?.primaryEmail || existingEmployee?.employee?.primaryEmail || null;

  if (existingExternalSystemId) {
    nextPayload.externalSystemId = existingExternalSystemId;
  }
  if (existingPrimaryEmail) {
    nextPayload.primaryEmail = existingPrimaryEmail;
  }

  return {
    payload: nextPayload,
    preservedExternalSystemId: Boolean(existingExternalSystemId),
    preservedPrimaryEmail: Boolean(existingPrimaryEmail)
  };
}

async function updateEmployeeByContactId(contactId, payload) {
  const normalizedId = String(contactId || "").trim();
  if (!normalizedId) {
    throw new Error("CentralReach employee contactId is required");
  }

  await crRequest(`/contacts/employee/${normalizedId}`, {
    method: "PUT",
    body: payload
  });

  return {
    operation: "update",
    crContactId: normalizedId
  };
}

async function updateEmployeeByExternalSystemId(payload) {
  let response;
  try {
    response = await crRequest("/contacts/employee/byExternalSystemId", {
      method: "PUT",
      body: payload
    });
  } catch (error) {
    // AWS behavior treats not-found by external id as "no match", not a hard failure.
    if (externalIdLookupMissed(error)) {
      return { found: false, crContactId: null };
    }

    throw error;
  }

  return readExternalIdLookup(response, "employee");
}

async function createEmployee(payload) {
  const createPayload = { ...payload };
  const contactForm = getEmployeeContactForm(payload?.employeeType);
  delete createPayload.employeeId;
  delete createPayload.contactId;
  delete createPayload.employeeType;
  if (contactForm) {
    createPayload.ContactForm = contactForm;
  }

  let response;
  try {
    response = await crRequest("/contacts/employee", {
      method: "POST",
      body: createPayload,
      suppressRetry: true
    });
  } catch (error) {
    throw markCreateOutcome(error);
  }
  const crContactId = extractCrContactId(response);
  if (!crContactId) {
    throw new Error("CentralReach employee create succeeded but returned no contactId");
  }

  return {
    operation: "create",
    crContactId
  };
}

// The reason is written to HubSpot last_sync_error, so it carries only the status, error codes and
// field names. Central Reach's free-text message can repeat submitted values and is left out.
export function extractCreateErrorReason(error) {
  const status = error?.response?.status;
  const data = error?.response?.data || {};
  const items = [
    ...(Array.isArray(data?.responseStatus?.errors) ? data.responseStatus.errors : []),
    ...(Array.isArray(data?.errors) ? data.errors : [])
  ];
  const safeToken = (value) =>
    typeof value === "string" && /^[A-Za-z0-9_.\- ]{1,60}$/.test(value.trim()) ? value.trim() : null;
  const unique = (values) => Array.from(new Set(values.filter(Boolean)));

  const fields = unique(items.map((item) => safeToken(item?.fieldName)));
  const codes = unique([
    safeToken(data?.responseStatus?.errorCode),
    ...items.map((item) => safeToken(item?.errorCode))
  ]);

  const parts = [`CentralReach rejected the employee create (${status || "no status"}).`];
  if (fields.length) {
    parts.push(`Fields: ${fields.join(", ")}.`);
  }
  if (codes.length) {
    parts.push(`Codes: ${codes.join(", ")}.`);
  }
  return parts.join(" ").slice(0, 500);
}

function mergeUniqueNumericIds(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
  );
}

function metadataPutBody(fieldId, value) {
  const fieldType = CENTRAL_REACH_METADATA_FIELD_TYPES[Number(fieldId)] || "Input";
  const normalizedValue = String(value).trim();
  if (fieldType === "TextArea") {
    return { textAreaValue: normalizedValue };
  }
  return { inputValue: normalizedValue };
}

async function updateContactLabels(contactId, labelIds) {
  const normalizedLabelIds = mergeUniqueNumericIds(labelIds);
  if (!normalizedLabelIds.length) {
    return { operation: "skip_empty" };
  }

  try {
    await crRequest(`/contacts/${contactId}/labels`, {
      method: "POST",
      body: { labels: normalizedLabelIds.map((labelId) => ({ labelId })) }
    });
    return { operation: "updated", bodyShape: "labels[]" };
  } catch (error) {
    if (error?.response?.status !== 400) {
      throw error;
    }

    await crRequest(`/contacts/${contactId}/labels`, {
      method: "POST",
      body: { labelIds: normalizedLabelIds }
    });

    return { operation: "updated", bodyShape: "labelIds[]" };
  }
}

async function clearMetadataField(contactId, fieldId) {
  const normalizedFieldId = Number(fieldId);
  try {
    await crRequest(`/contacts/${contactId}/metadata/${normalizedFieldId}`, {
      method: "DELETE"
    });
    return { fieldId: normalizedFieldId, operation: "cleared" };
  } catch (error) {
    const status = error?.response?.status;
    if (status === 404) {
      return { fieldId: normalizedFieldId, operation: "cleared", alreadyAbsent: true };
    }
    if (status === 400 || status === 405 || status === 501) {
      return { fieldId: normalizedFieldId, operation: "clear_unsupported" };
    }
    return {
      fieldId: normalizedFieldId,
      operation: "error",
      errorMessage: String(error?.message || "Metadata clear failed").slice(0, 300)
    };
  }
}

async function updateMetadataField(contactId, fieldId, value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { fieldId: Number(fieldId), operation: "skip_empty" };
  }

  const normalizedFieldId = Number(fieldId);
  const body = metadataPutBody(normalizedFieldId, value);

  try {
    await crRequest(`/contacts/${contactId}/metadata/${normalizedFieldId}`, {
      method: "PUT",
      body
    });

    return {
      fieldId: normalizedFieldId,
      operation: "updated",
      routeUsed: "/contacts/{ContactId}/metadata/{FieldId}"
    };
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }

    await crRequest(`/contacts/client/${contactId}/metadata/${normalizedFieldId}`, {
      method: "PUT",
      body
    });

    return {
      fieldId: normalizedFieldId,
      operation: "updated",
      routeUsed: "/contacts/client/{ContactId}/metadata/{FieldId}"
    };
  }
}

export async function updateClientMetadata(contactId, metadataValues, options = {}) {
  const normalizedContactId = String(contactId || "").trim();
  if (!normalizedContactId) {
    throw new Error("CentralReach contactId is required");
  }

  const values = metadataValues && typeof metadataValues === "object" ? metadataValues : {};
  const labelResult = await updateContactLabels(normalizedContactId, options.labelIds || []);
  const clearFieldIds = new Set((options.clearFieldIds || []).map((value) => Number(value)));
  const results = [];

  for (const [fieldId, value] of Object.entries(values)) {
    try {
      const blank = value === undefined || value === null || String(value).trim() === "";
      const result =
        blank && clearFieldIds.has(Number(fieldId))
          ? await clearMetadataField(normalizedContactId, fieldId)
          : await updateMetadataField(normalizedContactId, fieldId, value);
      results.push(result);
    } catch (error) {
      results.push({
        fieldId: Number(fieldId),
        operation: "error",
        errorMessage: String(error?.message || "Metadata update failed").slice(0, 300)
      });
    }
  }

  return {
    labelResult,
    totalFields: results.length,
    updatedCount: results.filter((item) => item.operation === "updated" || item.operation === "cleared").length,
    skippedEmptyCount: results.filter((item) => item.operation === "skip_empty").length,
    failedCount: results.filter((item) => item.operation === "error" || item.operation === "clear_unsupported").length,
    failedFieldIds: results
      .filter((item) => item.operation === "error" || item.operation === "clear_unsupported")
      .map((item) => item.fieldId),
    clearUnsupportedFieldIds: results
      .filter((item) => item.operation === "clear_unsupported")
      .map((item) => item.fieldId),
    results
  };
}

export async function createOrUpdateEmployee(payload) {
  const options =
    payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "payload")
      ? payload
      : { payload };

  const employeePayload =
    options.payload && typeof options.payload === "object" ? options.payload : null;
  const existingContactId = String(options.existingContactId || "").trim() || null;
  const allowEmployeeCreate = Boolean(options.allowEmployeeCreate);
  const putOnlyMode =
    options.putOnlyMode === undefined || options.putOnlyMode === null
      ? true
      : Boolean(options.putOnlyMode);
  const employeeType = String(options.employeeType || "").trim();

  if (!employeePayload) {
    throw new Error("CentralReach employee payload must be an object");
  }

  if (existingContactId) {
    return updateEmployeeByContactId(existingContactId, employeePayload);
  }

  const byExternalResult = await updateEmployeeByExternalSystemId(employeePayload);
  if (byExternalResult.found) {
    return {
      operation: "update",
      crContactId: byExternalResult.crContactId
    };
  }

  if (putOnlyMode) {
    return {
      operation: "blocked",
      crContactId: null,
      reason:
        "PUT_ONLY_MODE is on, so this run will not create an employee."
    };
  }

  if (!allowEmployeeCreate) {
    return {
      operation: "blocked",
      crContactId: null,
      reason:
        "ALLOW_EMPLOYEE_CREATE is false: create disabled. Enable ALLOW_EMPLOYEE_CREATE or provide an existing employee_id."
    };
  }

  try {
    return await createEmployee({
      ...employeePayload,
      ...(employeeType ? { employeeType } : {})
    });
  } catch (error) {
    const status = error?.response?.status;
    if (status === 400 || status === 409) {
      return {
        operation: "blocked",
        crContactId: null,
        reason: extractCreateErrorReason(error)
      };
    }
    throw error;
  }
}
