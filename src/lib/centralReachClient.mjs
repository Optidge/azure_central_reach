import axios from "axios";
import { retryAfterSeconds, withRetry } from "./retry.mjs";
import { unreadableAnswerError } from "./unreadableAnswer.mjs";
import {
  CENTRAL_REACH_METADATA_FIELD_TYPES,
  EMPLOYEE_CREATE_DEFAULT_DATE_OF_BIRTH
} from "../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../constants/hubspot.mjs";
import { EMPLOYEE_CREATE_TURNED_OFF } from "../constants/syncReasons.mjs";
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

// A token request that fails is a credentials or sign-in problem, not a problem with the
// record. Whatever the status, it is retried and ends in the dead-letter alert (decision 6).
function asAuthFailure(error) {
  error.code = "CR_AUTH_FAILED";
  return error;
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

  let response;
  try {
    response = await withRetry(
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
  } catch (error) {
    throw asAuthFailure(error);
  }

  const accessToken = response?.data?.access_token;
  if (!accessToken) {
    throw asAuthFailure(new Error("CentralReach token request failed: access_token missing"));
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

function readLookupContactId(data) {
  const id = data?.contact?.contactId;
  if (id === null || id === undefined || String(id).trim() === "") {
    return null;
  }
  return String(id);
}

async function findByExternalSystemId(kind, id) {
  const normalized = String(id ?? "").trim();
  if (!normalized) {
    const missing = new Error(`CentralReach ${kind} lookup needs an External System ID`);
    missing.code = "CR_EXTERNAL_ID_REQUIRED";
    throw missing;
  }
  let response;
  try {
    response = await crSend(
      `/contacts/${kind}/byExternalSystemId?ExternalSystemId=${encodeURIComponent(normalized)}`,
      { method: "GET" }
    );
  } catch (error) {
    if (error?.response?.status === 404) {
      return { found: false, crContactId: null };
    }
    // Not 200 and not 404: the answer is unclear. Retry later, whatever the status was.
    error.code = "CR_LOOKUP_UNKNOWN";
    throw error;
  }
  const crContactId = readLookupContactId(response?.data);
  if (!crContactId) {
    throw lookupWithoutContactId(kind, response);
  }
  return { found: true, crContactId };
}

// A 200 with no contact ID cannot be read as found or as not found. It is a permanent error,
// never a create (BUILD-PLAN Stage 2, decision 4).
export function lookupWithoutContactId(kind, response) {
  return unreadableAnswerError({
    code: "CR_LOOKUP_UNREADABLE",
    call: `GET /contacts/${kind}/byExternalSystemId`,
    status: response?.status,
    expected: `the ${kind} under contact, with contactId`,
    expectedFields: ["contact", "contact.contactId"],
    reasonField: "contact.contactId",
    answer: response?.data
  });
}

export function findEmployeeByExternalSystemId(id) {
  return findByExternalSystemId("employee", id);
}

export function findClientByExternalSystemId(id) {
  return findByExternalSystemId("client", id);
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

// CentralReach accepted the create but the answer names no contact ID. The record may exist, so
// this is an unknown outcome too, not a plain error.
function createWithoutContactId(entity) {
  const error = new Error(`CentralReach ${entity} create succeeded but returned no contactId`);
  error.code = "CR_CREATE_OUTCOME_UNKNOWN";
  return error;
}

async function crRequest(path, options) {
  const response = await crSend(path, options);
  return response?.data || null;
}

// The full response, for readers that need the HTTP status as well as the body.
async function crSend(path, { method = "GET", body, suppressRetry = false } = {}) {
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

  return suppressRetry ? request() : withRetry(request, {
    maxAttempts: 3,
    baseDelayMs: 400,
    maxDelayMs: 5000
  });
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
    throw createWithoutContactId("client");
  }

  return {
    operation: "create",
    crContactId
  };
}

function readEmployeeContactId(data) {
  const candidates = [
    data?.contact?.contactId,
    data?.contactId,
    data?.employee?.contactId,
    data?.result?.contactId
  ];
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim() !== "") {
      return String(candidate).trim();
    }
  }
  return null;
}

export async function getEmployeeByContactId(contactId) {
  const normalizedId = String(contactId || "").trim();
  if (!normalizedId) {
    throw new Error("CentralReach employee contactId is required");
  }

  const response = await crSend(`/contacts/employee/${normalizedId}`, { method: "GET" });
  const employee = response?.data || null;
  // Rule 5.8: an answer that does not show this employee is a failed read. It is never read as
  // "CentralReach holds no External System ID and no email".
  const answeredId = readEmployeeContactId(employee);
  const unreadable = !answeredId && !readCrPrimaryEmail(employee);
  if (unreadable || (answeredId && answeredId !== normalizedId)) {
    throw unreadableAnswerError({
      code: "CR_EMPLOYEE_READ_FAILED",
      call: "GET /contacts/employee/{id}",
      status: response?.status,
      expected: "the requested employee under contact, with its contactId or primaryEmail",
      expectedFields: ["contact", "contact.contactId", "contact.primaryEmail"],
      reasonField: "contact.contactId",
      answer: employee
    });
  }
  return employee;
}

function readCrPrimaryEmail(data) {
  const candidates = [
    data?.primaryEmail,
    data?.PrimaryEmail,
    data?.contact?.primaryEmail,
    data?.contact?.PrimaryEmail,
    data?.employee?.primaryEmail,
    data?.employee?.PrimaryEmail,
    data?.result?.primaryEmail,
    data?.result?.PrimaryEmail
  ];
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined && String(candidate).trim() !== "") {
      return String(candidate).trim();
    }
  }
  return null;
}

export function buildEmployeePayloadForContactId(payload, existingEmployee = {}) {
  const nextPayload = payload && typeof payload === "object" ? { ...payload } : {};
  const existingExternalSystemId = readCrExternalSystemId(existingEmployee);
  const existingPrimaryEmail = readCrPrimaryEmail(existingEmployee);

  // Central Reach rejects an update whose External System ID differs from the stored one (400,
  // tested 2026-11-16). The stored id is always sent; HubSpot's Workday ID is used only when CR
  // holds none.
  const ownExternalSystemId = String(nextPayload.externalSystemId ?? "").trim();
  const keepExistingExternalSystemId = Boolean(existingExternalSystemId);
  const externalSystemIdMismatch =
    keepExistingExternalSystemId &&
    ownExternalSystemId !== "" &&
    ownExternalSystemId !== String(existingExternalSystemId).trim();
  if (keepExistingExternalSystemId) {
    nextPayload.externalSystemId = existingExternalSystemId;
  }
  if (existingPrimaryEmail) {
    nextPayload.primaryEmail = existingPrimaryEmail;
  }

  return {
    payload: nextPayload,
    preservedExternalSystemId: keepExistingExternalSystemId,
    externalSystemIdMismatch,
    preservedPrimaryEmail: Boolean(existingPrimaryEmail),
    crExternalSystemId: existingExternalSystemId
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

async function createEmployee(payload) {
  const createPayload = { ...payload };
  const contactForm = getEmployeeContactForm(payload?.employeeType);
  delete createPayload.employeeId;
  delete createPayload.contactId;
  delete createPayload.employeeType;
  if (contactForm) {
    createPayload.ContactForm = contactForm;
  }
  // Create only: an update never sends the placeholder, so it cannot replace a real date in CR.
  const usedDefaultDateOfBirth = String(createPayload.dateOfBirth ?? "").trim() === "";
  if (usedDefaultDateOfBirth) {
    createPayload.dateOfBirth = EMPLOYEE_CREATE_DEFAULT_DATE_OF_BIRTH;
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
    throw createWithoutContactId("employee");
  }

  return {
    operation: "create",
    crContactId,
    usedDefaultDateOfBirth
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

function readLabelIds(data) {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.labels)
      ? data.labels
      : Array.isArray(data?.labelIds)
        ? data.labelIds
        : Array.isArray(data?.results)
          ? data.results
          : null;
  if (!list) {
    return null;
  }
  // Only labelId, or a plain number, is read as a label ID. The answer shape is not confirmed
  // yet, and a wrong guess would post the wrong labels.
  const ids = [];
  for (const item of list) {
    const raw = item && typeof item === "object" ? item.labelId : item;
    const id = typeof raw === "number" || typeof raw === "string" ? Number(raw) : NaN;
    if (!Number.isInteger(id) || id <= 0 || String(raw).trim() === "") {
      return null;
    }
    ids.push(id);
  }
  return ids;
}

async function postContactLabels(contactId, labelIds) {
  try {
    await crRequest(`/contacts/${contactId}/labels`, {
      method: "POST",
      body: { labels: labelIds.map((labelId) => ({ labelId })) }
    });
    return { operation: "updated", bodyShape: "labels[]" };
  } catch (error) {
    if (error?.response?.status !== 400) {
      throw error;
    }
    await crRequest(`/contacts/${contactId}/labels`, {
      method: "POST",
      body: { labelIds }
    });
    return { operation: "updated", bodyShape: "labelIds[]" };
  }
}

async function updateContactLabels(contactId, labelIds) {
  const required = mergeUniqueNumericIds(labelIds);
  if (!required.length) {
    return { operation: "skip_empty" };
  }

  const response = await crSend(`/contacts/${contactId}/labels`, { method: "GET" });
  const current = readLabelIds(response?.data);
  if (!current) {
    throw unreadableAnswerError({
      code: "CR_LABEL_READ_FAILED",
      call: "GET /contacts/{id}/labels",
      status: response?.status,
      expected: "a list of labels, each with a numeric labelId",
      expectedFields: ["labels", "labelIds", "results"],
      reasonField: "labels[].labelId",
      answer: response?.data
    });
  }
  const union = mergeUniqueNumericIds([...current, ...required]);
  const missing = required.filter((id) => !current.includes(id));
  if (!missing.length) {
    return { operation: "skip_present" };
  }
  return postContactLabels(contactId, union);
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
    return failedMetadataField(normalizedFieldId, error, "Metadata clear failed");
  }
}

// A failed field keeps its HTTP status and Retry-After, so the failure can be sorted as temporary
// or permanent and the retry can wait long enough.
function failedMetadataField(fieldId, error, fallbackMessage) {
  return {
    fieldId: Number(fieldId),
    operation: "error",
    status: error?.response?.status ?? null,
    retryAfterSeconds: retryAfterSeconds(error),
    errorMessage: String(error?.message || fallbackMessage).slice(0, 300)
  };
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
      results.push(failedMetadataField(fieldId, error, "Metadata update failed"));
    }
  }

  const failed = results.filter(
    (item) => item.operation === "error" || item.operation === "clear_unsupported"
  );

  return {
    labelResult,
    totalFields: results.length,
    updatedCount: results.filter((item) => item.operation === "updated" || item.operation === "cleared").length,
    skippedEmptyCount: results.filter((item) => item.operation === "skip_empty").length,
    failedCount: failed.length,
    failedFieldIds: failed.map((item) => item.fieldId),
    failedFields: failed.map((item) => ({
      fieldId: item.fieldId,
      operation: item.operation,
      status: item.status ?? null,
      retryAfterSeconds: item.retryAfterSeconds ?? null
    })),
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

  // A lookup or create with no External System ID could match or duplicate the wrong employee.
  if (String(employeePayload.externalSystemId ?? "").trim() === "") {
    const missing = new Error("CentralReach employee lookup needs an External System ID");
    missing.code = "CR_EXTERNAL_ID_REQUIRED";
    throw missing;
  }

  if (putOnlyMode || !allowEmployeeCreate) {
    return {
      operation: "create_turned_off",
      crContactId: null,
      reason: EMPLOYEE_CREATE_TURNED_OFF
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
        operation: "create_rejected",
        crContactId: null,
        reason: extractCreateErrorReason(error)
      };
    }
    throw error;
  }
}
