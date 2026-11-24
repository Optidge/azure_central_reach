import axios from "axios";
import { LABEL_POST_WINDOW_SECONDS, retryAfterSeconds, withRetry } from "./retry.mjs";
import { CR_CALL_KINDS } from "./syncRunSummary.mjs";
import { unreadableAnswerError } from "./unreadableAnswer.mjs";
import {
  CENTRAL_REACH_METADATA_FIELD_TYPES,
  CENTRAL_REACH_SENDABLE_LABEL_IDS,
  EMPLOYEE_CREATE_DEFAULT_DATE_OF_BIRTH
} from "../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../constants/hubspot.mjs";
import { EMPLOYEE_CREATE_TURNED_OFF } from "../constants/syncReasons.mjs";
import {
  CLIENT_CORE_FIELDS,
  clientCoreReadKey,
  clientPutKey,
  clientWritePlan,
  keepHeldClientCoreFields,
  mappedKeysMatchRead,
  unusableHeldClientCoreField,
  unsendableSsnKey,
  updateBodyFromRead
} from "./mappedState.mjs";

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
// Rule 5.9: a BT/RBT whose work states hold Colorado and not New York. New Jersey has no form.
const BT_RBT_COLORADO_CONTACT_FORM = "RBT CO";

// CONTRACT P.5 (d): the contact form of an employee create (rule 5.9, row 5.13).
//   getEmployeeContactForm(employeeType, workStates)
//   employeeType  "bt_rbt" or "bcba" (HUBSPOT_EMPLOYEE_TYPES)
//   workStates    the mapper's workStates (src/mappings/employees/buildEmployeePayload.mjs):
//                 upper-case two-letter state codes, for example ["CO", "NY"]; empty when
//                 HubSpot `location` is blank
// Returns the ContactForm name, or null for an unknown employee type.
// The worker passes workStates to createOrUpdateEmployee, which passes it here on a create. It is
// never part of the request body. Row 5.13: a BCBA gets "Admin" for every state. A BT/RBT gets
// "RBT CO" when workStates holds CO and not NY, and "Behavior Technician NY" otherwise (New York,
// New Jersey, several states with New York, or no work state).
export function getEmployeeContactForm(employeeType, workStates = []) {
  const normalizedType = String(employeeType || "").trim();
  if (normalizedType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT) {
    const states = new Set(
      (Array.isArray(workStates) ? workStates : []).map((state) => String(state).trim().toUpperCase())
    );
    if (states.has("CO") && !states.has("NY")) {
      return BT_RBT_COLORADO_CONTACT_FORM;
    }
  }
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

// A CentralReach contact ID is digits only and greater than 0. Anything else is not read as an
// ID: it would end up in a request path or in HubSpot.
function readContactIdValue(value) {
  const text = typeof value === "number" || typeof value === "string" ? String(value) : "";
  return /^\d+$/.test(text) && Number(text) > 0 ? text : null;
}

// A create answers { contact: { contactId }, result, failed }. Only contact.contactId, then a
// top-level contactId, is read as the new CR ID. An answer that says failed, or names no readable
// ID, gives null: the caller treats the create as an unknown outcome.
function readCreatedContactId(data) {
  if (data?.failed === true) {
    return null;
  }
  return readContactIdValue(data?.contact?.contactId) ?? readContactIdValue(data?.contactId);
}

function readLookupContactId(data) {
  return readContactIdValue(data?.contact?.contactId);
}

// A 404 means "nobody holds this External System ID" only when CentralReach itself answered:
// a JSON body or no body. A 404 with an HTML or plain-text body comes from something in between
// (a gateway, a wrong path) and is not proof that the record is absent.
function lookupAnsweredNotFound(error) {
  if (error?.response?.status !== 404) {
    return false;
  }
  const body = error.response.data;
  if (body === null || body === undefined || typeof body === "object") {
    return true;
  }
  if (typeof body !== "string") {
    return false;
  }
  if (body.trim() === "") {
    return true;
  }
  try {
    const parsed = JSON.parse(body);
    return parsed !== null && typeof parsed === "object";
  } catch {
    return false;
  }
}

async function findByExternalSystemId(kind, id, options = {}) {
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
      { method: "GET", kind: "lookup", onCall: options?.onCall }
    );
  } catch (error) {
    if (lookupAnsweredNotFound(error)) {
      return { found: false, crContactId: null };
    }
    // Not 200 and not a clear 404: the answer is unclear. Retry later, whatever the status was.
    error.code = "CR_LOOKUP_UNKNOWN";
    throw error;
  }
  const crContactId = readLookupContactId(response?.data);
  if (!crContactId) {
    throw lookupWithoutContactId(kind, response);
  }
  return { found: true, crContactId };
}

// A 200 with no contact ID, or with one that is not digits greater than 0, cannot be read as
// found or as not found. It is a permanent error, never a create (BUILD-PLAN Stage 2, decision 4).
export function lookupWithoutContactId(kind, response) {
  return unreadableAnswerError({
    code: "CR_LOOKUP_UNREADABLE",
    call: `GET /contacts/${kind}/byExternalSystemId`,
    status: response?.status,
    expected: `the ${kind} under contact, with a contactId of digits greater than 0`,
    expectedFields: ["contact", "contact.contactId"],
    reasonField: "contact.contactId",
    answer: response?.data
  });
}

export function findEmployeeByExternalSystemId(id, options) {
  return findByExternalSystemId("employee", id, options);
}

export function findClientByExternalSystemId(id, options) {
  return findByExternalSystemId("client", id, options);
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

// A create is sent once. A timeout or 5xx leaves the outcome unknown: Central Reach may have
// created the record. The next run finds it through the external-id lookup instead of posting again.
function markCreateOutcome(error) {
  const status = error?.response?.status;
  if (!status || status >= 500) {
    error.code = "CR_CREATE_OUTCOME_UNKNOWN";
  }
  return error;
}

// CentralReach answered the create with 200, but the answer says failed or names no readable
// contact ID. The record may exist, so this is an unknown outcome too, not a plain error and not
// a success: the next run looks the record up before it creates anything.
function createWithoutContactId(entity) {
  const error = new Error(`CentralReach ${entity} create returned no readable contactId`);
  error.code = "CR_CREATE_OUTCOME_UNKNOWN";
  return error;
}

async function crRequest(path, options) {
  const response = await crSend(path, options);
  return response?.data || null;
}

// Call observer (row 3.20). Every exported function that sends requests takes an optional
// `onCall` in its options: a function called as onCall({ kind, status }) once per HTTP request
// actually sent, in the order sent, including the in-process retries of withRetry. `status` is the
// HTTP status of the answer, success or failure, and null when there was no answer (a timeout, the
// network). It gets no URL, body or header. `kind` is one of CR_CALL_KINDS (src/lib/syncRunSummary.mjs):
//   lookup     GET by External System ID (client or employee), GET employee by contact ID, and
//              GET /contacts/client/{id} (the client read before an update, item B21)
//   create     POST /contacts/client and POST /contacts/employee
//   update     PUT /contacts/client/{id} and PUT /contacts/employee/{id}
//   metadata   PUT and DELETE of a metadata field, including the second route after a 404
//   labelRead  GET /contacts/{id}/labels (the read, the read-backs) and GET /contacts/labels
//   labelPost  POST /contacts/{id}/labels
// The token request is not listed. With no `onCall` nothing changes. An observer that throws is
// ignored: a log aid must not change what the run does.
function observedRequest(send, kind, onCall) {
  if (!CR_CALL_KINDS.includes(kind)) {
    throw new Error("CentralReach call observer: the call has no kind");
  }
  const report = (status) => {
    try {
      onCall({ kind, status: Number.isInteger(status) ? status : null });
    } catch {
      // See above.
    }
  };
  return async () => {
    try {
      const response = await send();
      report(response?.status);
      return response;
    } catch (error) {
      report(error?.response?.status);
      throw error;
    }
  };
}

// The full response, for readers that need the HTTP status as well as the body.
async function crSend(path, { method = "GET", body, suppressRetry = false, kind, onCall } = {}) {
  if (!centralReachHttpClient || !centralReachConfig) {
    throw new Error("CentralReach client is not initialized");
  }

  const token = await getCentralReachAccessToken();
  const send = () =>
    centralReachHttpClient.request({
      url: path,
      method,
      data: body,
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": centralReachConfig.centralReach.apiKey
      }
    });
  const request = typeof onCall === "function" ? observedRequest(send, kind, onCall) : send;

  return suppressRetry ? request() : withRetry(request, {
    maxAttempts: 3,
    baseDelayMs: 400,
    maxDelayMs: 5000
  });
}

// CONTRACT P.5 (f): createOrUpdateClient keeps its signature while row 3.14 changes what it does.
//   createOrUpdateClient({ payload, existingContactId, externalSystemIdHeld })
//   payload               the mapped client payload (buildClientPayload.mjs), without the
//                         dateOfBirthStatus note. It holds ExternalSystemId (the Case record ID)
//                         and ContactForm. The payload passed in is not changed.
//   existingContactId     the CR ID the worker knows, or null / blank when the Case is not
//                         linked. It is trimmed once; a value of only spaces is "not linked".
//   externalSystemIdHeld  optional. Exactly true when the worker's linked-Case lookup found this
//                         client, by this Case's record ID, under the same CR ID as
//                         existingContactId: CentralReach is then known to hold
//                         payload.ExternalSystemId. Anything else counts as not known.
// Returns { operation: "create" | "update", crContactId }. Throws when the outcome is not clear:
// CR_CREATE_OUTCOME_UNKNOWN for a create whose answer never arrived, said failed, or named no
// readable contact ID; CR_LOOKUP_UNKNOWN or CR_LOOKUP_UNREADABLE for the lookup;
// CR_EXTERNAL_ID_REQUIRED (permanent) when there is no CR ID and payload.ExternalSystemId is
// blank, so no lookup and no create can be made. It never creates after an unclear lookup.
// Row 3.14 (rule 5.5): with no CR ID it looks the client up by payload.ExternalSystemId with the
// read-only GET. 404: one POST with the whole payload. Found: one PUT by the CR ID found. With a
// CR ID: one PUT by that ID and no lookup by External System ID; the worker compares the IDs of a
// linked Case before it calls. Every PUT follows the client read of item B21 (below). There is
// no client-create switch (decision 18): the record gate is the only control.
// What an update PUT carries (BR22, review fix L-R2; BR16, 2026-11-24):
//   ContactForm       never.
//   Every read key    (updateBodyFromRead) the client PUT blanks a text key it leaves out (live
//                     check 2026-11-24), so the body is the client read below, key for key with
//                     a capital first letter, and the mapped keys laid over it. When no mapped key
//                     differs from the read (mappedKeysMatchRead) no PUT is sent at all; the
//                     answer is the same { operation: "update", crContactId }.
//   ssn               (the SSN guard, checkHeldSsnSendable) only blank or a full 9-digit SSN
//                     is sent back; anything else is CR_CLIENT_READ_FAILED (permanent,
//                     reason field contact.ssn) and no PUT is sent. Not checked when no PUT is.
//   ExternalSystemId  the payload's value only when CentralReach is known to hold that same
//                     value: the lookup inside this call found the client (its own earlier
//                     create), or externalSystemIdHeld is true. Otherwise the value the client
//                     read holds is sent back as read, and when the read holds none (the key is
//                     absent) the key is left out. A blank value is never sent.
//   Core fields       (item B21, BR16, row 3.13) all 11 of CLIENT_CORE_FIELDS: before the PUT
//                     the client is read (GET /contacts/client/{id}, kind lookup) and a core
//                     field that is blank in the payload carries the value that read holds
//                     (keepHeldClientCoreFields), so an update never clears one. A read that
//                     cannot be used is CR_CLIENT_READ_FAILED (permanent) and no PUT is sent.
//                     This covers every update: the linked Case, the pending-create Case whose
//                     lookup found its client, and the lookup inside this call. A create sends
//                     the payload as it is and makes no client read.
export async function createOrUpdateClient(payloadOrOptions) {
  const isOptionsObject =
    payloadOrOptions &&
    typeof payloadOrOptions === "object" &&
    Object.prototype.hasOwnProperty.call(payloadOrOptions, "payload");

  const payload = isOptionsObject ? payloadOrOptions.payload : payloadOrOptions;
  const onCall = isOptionsObject ? payloadOrOptions.onCall : undefined;
  // Trimmed once, and this one value decides both the lookup and the write plan.
  const existingContactId = isOptionsObject
    ? String(payloadOrOptions.existingContactId ?? "").trim() || null
    : null;

  if (!payload || typeof payload !== "object") {
    throw new Error("CentralReach client payload must be an object");
  }

  let lookedUpContactId = null;
  if (!existingContactId) {
    const lookedUp = await findClientByExternalSystemId(payload.ExternalSystemId, { onCall });
    if (lookedUp.found) {
      lookedUpContactId = lookedUp.crContactId;
    }
  }

  const plan = clientWritePlan({ existingContactId, lookedUpContactId });
  if (plan.operation === "update") {
    const externalSystemIdHeld =
      Boolean(lookedUpContactId) ||
      (isOptionsObject && payloadOrOptions.externalSystemIdHeld === true);
    const updatePayload = { ...payload };
    delete updatePayload.ContactForm;
    if (!externalSystemIdHeld || String(updatePayload.ExternalSystemId ?? "").trim() === "") {
      delete updatePayload.ExternalSystemId;
    }
    // Item B21: every update path ends here, so no client PUT is sent without this read.
    const heldClient = await getClientByContactId(plan.crContactId, {
      onCall,
      payload: updatePayload
    });
    const mappedBody = keepHeldClientCoreFields(updatePayload, heldClient);
    // BR16 (2026-11-24): no PUT when CentralReach already holds every mapped value; otherwise
    // the whole read goes back with the mapped keys laid over it (updateBodyFromRead).
    if (mappedKeysMatchRead(mappedBody, heldClient, clientCoreReadKey)) {
      return { operation: "update", crContactId: plan.crContactId };
    }
    checkHeldSsnSendable("client", heldClient);
    await crRequest(`/contacts/client/${plan.crContactId}`, {
      method: "PUT",
      body: updateBodyFromRead(mappedBody, heldClient, clientPutKey),
      kind: "update",
      onCall
    });
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
      suppressRetry: true,
      kind: "create",
      onCall
    });
  } catch (error) {
    throw markCreateOutcome(error);
  }

  const crContactId = readCreatedContactId(created);
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

// Item B21: the client read before an update. Returns `contact` of the answer. A failed read is
// no update (CR_CLIENT_READ_FAILED, permanent, logged by field names and types only): an answer
// that does not show this client (no contactId, or another one), that lacks any of the 11 core
// keys, or that holds a value the update would send back but cannot (options.payload is the
// update body: for each core field blank there, the held value must be text or null and a filled
// dateOfBirth must start with YYYY-MM-DD; with no payload every core field counts as blank).
// A missing key is never read as "CentralReach holds nothing": a field left out of the PUT may
// be cleared (O-35).
export async function getClientByContactId(contactId, options = {}) {
  const normalizedId = String(contactId || "").trim();
  if (!normalizedId) {
    throw new Error("CentralReach client contactId is required");
  }

  const response = await crSend(`/contacts/client/${normalizedId}`, {
    method: "GET",
    kind: "lookup",
    onCall: options?.onCall
  });
  const answer = response?.data ?? null;
  const failedField = unreadableClientField(answer?.contact, normalizedId, options?.payload);
  if (failedField) {
    throw unreadableAnswerError({
      code: "CR_CLIENT_READ_FAILED",
      call: "GET /contacts/client/{id}",
      status: response?.status,
      expected: "the requested client under contact, with its contactId and the 11 core fields",
      expectedFields: [
        "contact",
        "contact.contactId",
        ...CLIENT_CORE_FIELDS.map((field) => `contact.${clientCoreReadKey(field)}`)
      ],
      reasonField: failedField,
      answer
    });
  }
  return answer.contact;
}

// The first field that makes the client read unusable, or null when it can be used.
function unreadableClientField(contact, requestedId, payload) {
  if (!contact || typeof contact !== "object" || Array.isArray(contact)) {
    return "contact";
  }
  if (readContactIdValue(contact.contactId) !== requestedId) {
    return "contact.contactId";
  }
  for (const field of CLIENT_CORE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(contact, clientCoreReadKey(field))) {
      return `contact.${clientCoreReadKey(field)}`;
    }
  }
  const unusableKey = unusableHeldClientCoreField(payload, contact);
  return unusableKey ? `contact.${unusableKey}` : null;
}

export async function getEmployeeByContactId(contactId, options = {}) {
  const normalizedId = String(contactId || "").trim();
  if (!normalizedId) {
    throw new Error("CentralReach employee contactId is required");
  }

  const response = await crSend(`/contacts/employee/${normalizedId}`, {
    method: "GET",
    kind: "lookup",
    onCall: options?.onCall
  });
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
  // Row 1.10 (owner's decision 2026-11-21): a filled HubSpot primary email is sent like any other
  // mapped field. A blank one never clears CentralReach's primary email: the stored email is sent
  // back, so the "written before, now blank" clear of row 3.13 does not apply to this field.
  const keepExistingPrimaryEmail =
    Boolean(existingPrimaryEmail) && String(nextPayload.primaryEmail ?? "").trim() === "";
  if (keepExistingPrimaryEmail) {
    nextPayload.primaryEmail = existingPrimaryEmail;
  }

  return {
    payload: nextPayload,
    preservedExternalSystemId: keepExistingExternalSystemId,
    externalSystemIdMismatch,
    preservedPrimaryEmail: keepExistingPrimaryEmail,
    crExternalSystemId: existingExternalSystemId
  };
}

// BR16, row 3.13 (live check 2026-11-24): the employee PUT blanks a text key it leaves out, so
// an update is built from the read of the same run (heldContact: `contact` of
// GET /contacts/employee/{id}). That read must be a plain object whose contactId is this
// employee; anything else is CR_EMPLOYEE_READ_FAILED (permanent) and no PUT is sent. When no
// mapped key differs from the read, no PUT is sent (the same answer, no `update` call);
// otherwise the read's SSN must pass the SSN guard (checkHeldSsnSendable) and the body is the
// whole read with the mapped keys laid over it (updateBodyFromRead). The employee worker runs
// both checks itself before it marks the record in progress (review finding 7); they stay here
// so that a direct call is just as safe.
export function heldEmployeeContact(heldContact, contactId) {
  const usable =
    heldContact &&
    typeof heldContact === "object" &&
    !Array.isArray(heldContact) &&
    readContactIdValue(heldContact.contactId) === String(contactId ?? "").trim();
  if (!usable) {
    throw unreadableAnswerError({
      code: "CR_EMPLOYEE_READ_FAILED",
      call: "GET /contacts/employee/{id}",
      status: null,
      expected: "the requested employee under contact, with its contactId",
      expectedFields: ["contact", "contact.contactId"],
      reasonField: "contact.contactId",
      answer: { contact: heldContact }
    });
  }
  return heldContact;
}

// The SSN guard (BR16, row 3.13; unsendableSsnKey in mappedState.mjs), run only when a core PUT
// is about to be sent. A read SSN the PUT may not send back is a failed read of the same kind as
// the other values a read cannot supply (CR_EMPLOYEE_READ_FAILED / CR_CLIENT_READ_FAILED:
// permanent, no retry, HubSpot `error`), so the run summary and the log queries see the codes
// they already know. The reason sentence names the field (contact.ssn); the logged shape holds
// field names and types only. The value is never logged, hashed, saved or put in the error.
export function checkHeldSsnSendable(entity, heldContact) {
  const ssnKey = unsendableSsnKey(heldContact);
  if (!ssnKey) {
    return;
  }
  throw unreadableAnswerError({
    code: entity === "client" ? "CR_CLIENT_READ_FAILED" : "CR_EMPLOYEE_READ_FAILED",
    call: `GET /contacts/${entity}/{id}`,
    status: null,
    expected: `the ${entity}'s ssn under contact, blank or a full 9 digits (dashes 3-2-4 allowed)`,
    expectedFields: ["contact", `contact.${ssnKey}`],
    reasonField: `contact.${ssnKey}`,
    answer: { contact: heldContact }
  });
}

async function updateEmployeeByContactId(contactId, payload, heldContact, onCall) {
  const normalizedId = String(contactId || "").trim();
  if (!normalizedId) {
    throw new Error("CentralReach employee contactId is required");
  }
  const held = heldEmployeeContact(heldContact, normalizedId);
  if (mappedKeysMatchRead(payload, held)) {
    return { operation: "update", crContactId: normalizedId };
  }
  checkHeldSsnSendable("employee", held);

  await crRequest(`/contacts/employee/${normalizedId}`, {
    method: "PUT",
    body: updateBodyFromRead(payload, held),
    kind: "update",
    onCall
  });

  return {
    operation: "update",
    crContactId: normalizedId
  };
}

async function createEmployee(payload, workStates, onCall) {
  const createPayload = { ...payload };
  const contactForm = getEmployeeContactForm(payload?.employeeType, workStates);
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
      suppressRetry: true,
      kind: "create",
      onCall
    });
  } catch (error) {
    throw markCreateOutcome(error);
  }
  const crContactId = readCreatedContactId(response);
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

// Rule 5.6: for this long after a saved label POST no new label POST is made for the contact. A
// label read can be about two minutes behind a write (label test of 2026-11-20). The same window
// is the first wait before an unconfirmed POST is retried (retry.mjs, item 12).
const LABEL_POST_WINDOW_MS = LABEL_POST_WINDOW_SECONDS * 1000;
// After a POST the labels are read back this many times, this far apart (row L.3).
const LABEL_READ_BACK_TRIES = 3;
const LABEL_READ_BACK_DELAY_MS = 5000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sameLabelSet(left, right) {
  const rightSet = new Set(right);
  return new Set(left).size === rightSet.size && left.every((id) => rightSet.has(id));
}

// What the contact must hold: the labels it holds, minus managed, plus required (rule 5.6).
function labelSetToPost(heldLabelIds, managedLabelIds, requiredLabelIds) {
  const managed = new Set(managedLabelIds);
  return mergeUniqueNumericIds([
    ...heldLabelIds.filter((id) => !managed.has(id)),
    ...requiredLabelIds
  ]);
}

// The error carries label IDs only, never a label name.
function labelError(code, message, labelIds) {
  const error = new Error(message);
  error.code = code;
  error.labelIds = labelIds;
  return error;
}

// The mapper's list as positive whole numbers. An entry that is not one (a text, 1.5, -1, an
// object) is a code defect and stops the run before any CentralReach call: dropping it silently
// would take a label off the contact. The error names the list and the positions, never a value.
function readMapperLabelIds(list, listName) {
  const entries = Array.isArray(list) ? list : null;
  const ids = (entries || []).map((entry) => {
    const text = typeof entry === "number" || typeof entry === "string" ? String(entry).trim() : "";
    const id = text === "" ? NaN : Number(text);
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  const positions = ids.flatMap((id, position) => (id === null ? [position] : []));
  if (!entries || positions.length) {
    const error = labelError(
      "CR_LABEL_NOT_SENDABLE",
      `${listName} is not a list of CentralReach label IDs`,
      []
    );
    error.labelList = listName;
    error.positions = positions;
    throw error;
  }
  return Array.from(new Set(ids));
}

async function readContactLabelIds(contactId, onCall) {
  const response = await crSend(`/contacts/${contactId}/labels`, {
    method: "GET",
    kind: "labelRead",
    onCall
  });
  const labelIds = readLabelIds(response?.data);
  if (!labelIds) {
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
  return labelIds;
}

// CentralReach's live label catalog. Read once, by a run that is about to post (row L.1).
async function readLabelCatalogIds(onCall) {
  const response = await crSend("/contacts/labels", { method: "GET", kind: "labelRead", onCall });
  const labelIds = readLabelIds(response?.data);
  if (!labelIds) {
    throw unreadableAnswerError({
      code: "CR_LABEL_CATALOG_UNREADABLE",
      call: "GET /contacts/labels",
      status: response?.status,
      expected: "a list of labels, each with a numeric labelId",
      expectedFields: ["labels", "labelIds", "results"],
      reasonField: "labels[].labelId",
      answer: response?.data
    });
  }
  return labelIds;
}

// One body shape (row L.4). The POST replaces the contact's whole label set, and an empty list
// clears every label, so an empty set is refused here whatever the caller worked out. A 400 is
// thrown as it is: retry.mjs sorts it as permanent, and no second body shape is tried.
// The POST is sent once per run, with no in-process retry. When it fails with no HTTP status (a
// timeout, the network) or with a 5xx, CentralReach may have applied it: the error then carries
// labelPost, the set and the time, so the worker can save it and the 150-second window holds on
// the retry. A 4xx was refused, so it carries nothing. Returns the time of the POST.
async function postContactLabels(contactId, labelIds, onCall) {
  if (!labelIds.length) {
    throw new Error("CentralReach label POST refused: the label set is empty");
  }
  try {
    await crRequest(`/contacts/${contactId}/labels`, {
      method: "POST",
      body: { labels: labelIds.map((labelId) => ({ labelId })) },
      suppressRetry: true,
      kind: "labelPost",
      onCall
    });
  } catch (error) {
    const status = error?.response?.status;
    if (!status || status >= 500) {
      error.labelPost = { contactId, labelIds, postedAt: new Date().toISOString() };
    }
    throw error;
  }
  return new Date().toISOString();
}

// True when one of the read-backs shows the posted set. A read-back that fails counts as "not
// shown": the POST was sent, so the caller must still get the posted set and its time.
async function readBackShowsLabels(contactId, postedLabelIds, delayMs, onCall) {
  for (let attempt = 1; attempt <= LABEL_READ_BACK_TRIES; attempt += 1) {
    if (attempt > 1) {
      await sleep(delayMs);
    }
    try {
      if (sameLabelSet(await readContactLabelIds(contactId, onCall), postedLabelIds)) {
        return true;
      }
    } catch {
      // Not shown.
    }
  }
  return false;
}

// The saved POST, when it is for this contact and inside the 150-second window. Otherwise null.
// A saved POST that names another contactId is ignored (SP-R5). One with no contactId is used:
// the worst a wrongly used one can do is hold a POST back until the window ends.
function recentLabelPost(lastLabelPost, contactId) {
  const savedLabelIds = mergeUniqueNumericIds(lastLabelPost?.labelIds);
  const postedAtMs = Date.parse(lastLabelPost?.postedAt);
  if (!savedLabelIds.length || !Number.isFinite(postedAtMs)) {
    return null;
  }
  const savedContactId = String(lastLabelPost.contactId ?? "").trim();
  if (savedContactId && savedContactId !== contactId) {
    return null;
  }
  // Math.abs: a postedAt far in the future (a wrong clock) must not hold the labels back for good.
  return Math.abs(Date.now() - postedAtMs) < LABEL_POST_WINDOW_MS ? savedLabelIds : null;
}

function buildLabelResult(operation, { postedLabelIds = null, postedAt = null, confirmed = null } = {}) {
  return { operation, postedLabelIds, postedAt, confirmed };
}

// Contract P.5 (e), written out above updateClientMetadata.
async function updateContactLabels(
  contactId,
  { requiredLabelIds, managedLabelIds, lastLabelPost, contactCreatedThisRun, readBackDelayMs, onCall }
) {
  const required = readMapperLabelIds(requiredLabelIds, "requiredLabelIds");
  const managed = readMapperLabelIds(managedLabelIds, "managedLabelIds");
  if (!required.length) {
    return buildLabelResult("skip_empty");
  }

  // Row L.1: an ID the integration adds that is not in the sendable list is a code defect.
  const notSendable = required.filter((id) => !CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id));
  if (notSendable.length) {
    throw labelError(
      "CR_LABEL_NOT_SENDABLE",
      "A required CentralReach label is not in the sendable list",
      notSendable
    );
  }

  // Row L.3: inside the window nothing is posted. The set is worked out from the saved POST,
  // because the read may still show the labels from before it.
  const savedLabelIds = recentLabelPost(lastLabelPost, contactId);
  if (savedLabelIds) {
    if (!sameLabelSet(labelSetToPost(savedLabelIds, managed, required), savedLabelIds)) {
      // The labels changed after the saved POST. The run is retried and posts after the window.
      return buildLabelResult("skip_window", { confirmed: false });
    }
    const shown = await readContactLabelIds(contactId, onCall);
    return buildLabelResult("skip_window", { confirmed: sameLabelSet(shown, savedLabelIds) });
  }

  const current = await readContactLabelIds(contactId, onCall);
  if (!current.length && !contactCreatedThisRun) {
    throw labelError(
      "CR_LABEL_READ_EMPTY",
      "The CentralReach label read came back empty for a contact this run did not create",
      []
    );
  }

  const toPost = labelSetToPost(current, managed, required);
  if (sameLabelSet(toPost, current)) {
    return buildLabelResult("skip_present", { confirmed: true });
  }

  // Row L.1: every ID in the set to post, the integration's and CentralReach's own, must be in
  // the live catalog. The managed labels are already out, so a remove-only ID never blocks.
  const catalog = new Set(await readLabelCatalogIds(onCall));
  const notInCatalog = toPost.filter((id) => !catalog.has(id));
  if (notInCatalog.length) {
    throw labelError(
      "CR_LABEL_NOT_IN_CATALOG",
      "A label in the set to post is not in CentralReach's label catalog",
      notInCatalog
    );
  }

  const postedAt = await postContactLabels(contactId, toPost, onCall);
  const confirmed = await readBackShowsLabels(contactId, toPost, readBackDelayMs, onCall);
  return buildLabelResult("updated", { postedLabelIds: toPost, postedAt, confirmed });
}

async function clearMetadataField(contactId, fieldId, onCall) {
  const normalizedFieldId = Number(fieldId);
  try {
    await crRequest(`/contacts/${contactId}/metadata/${normalizedFieldId}`, {
      method: "DELETE",
      kind: "metadata",
      onCall
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

async function updateMetadataField(contactId, fieldId, value, onCall) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { fieldId: Number(fieldId), operation: "skip_empty" };
  }

  const normalizedFieldId = Number(fieldId);
  const body = metadataPutBody(normalizedFieldId, value);

  try {
    await crRequest(`/contacts/${contactId}/metadata/${normalizedFieldId}`, {
      method: "PUT",
      body,
      kind: "metadata",
      onCall
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
      body,
      kind: "metadata",
      onCall
    });

    return {
      fieldId: normalizedFieldId,
      operation: "updated",
      routeUsed: "/contacts/client/{ContactId}/metadata/{FieldId}"
    };
  }
}

// CONTRACT P.5 (e): the label sender (rule 5.6, rows L.1 to L.4). The workers call it through
// updateClientMetadata, for clients and for employees.
//   updateClientMetadata(contactId, metadataValues, options)
// Label options, all passed by the worker:
//   requiredLabelIds       the mapper's requiredLabelIds: the labels the contact must hold now.
//                          The old option name `labelIds` is still read when requiredLabelIds is
//                          not passed.
//   managedLabelIds        the mapper's managedLabelIds. Default []: nothing is removed.
//                          Every entry of both lists must be a positive whole number (a number,
//                          or a text of digits). Anything else, or a value that is not a list,
//                          is CR_LABEL_NOT_SENDABLE before any CentralReach call; the error
//                          carries `labelList` (the list's name) and `positions`, never a value.
//   lastLabelPost          the last label POST the worker saved in the link record under
//                          `lastLabelPost`: { contactId, labelIds: [numbers], postedAt: ISO time },
//                          or null when none is saved. The worker passes null when the saved
//                          contactId is not the contact being synced (the CR ID changed).
//                          The sender also ignores a saved post that names another contactId;
//                          one with no contactId is used. A saved post is used only when
//                          labelIds is a list with at least one ID and postedAt can be read as a
//                          time.
//   contactCreatedThisRun  true when an empty label read may be taken as "no labels" (row L.2):
//                          this run created the contact, or the link record still holds
//                          `labelsPending: true`. The worker sets labelsPending when the
//                          integration creates the contact or links the record to its own earlier
//                          create, and clears it whenever labelResult.confirmed is exactly true,
//                          whatever the operation ("updated", "skip_present" or "skip_window"),
//                          not only after a POST. Without it, a create that timed out would
//                          leave a contact whose empty read is retried until the record ends as
//                          `error`.
//   labelReadBackDelayMs   the wait between the read-backs after a POST, in milliseconds.
//                          Default 5000. A test passes 0 (or a few milliseconds) so it does not
//                          sleep; the workers leave it out.
// The answer's labelResult always has these four keys:
//   operation       "skip_empty" (no required label: no CentralReach call), "skip_present"
//                   (nothing to change: no POST), "skip_window" (inside the 150-second window:
//                   no POST) or "updated" (a POST was sent)
//   postedLabelIds  the whole set posted in this run, as numbers; null when no POST was sent
//   postedAt        the ISO time of that POST; null when no POST was sent
//   confirmed       true when a read shows the set CentralReach must hold; false when the read
//                   does not show it yet, or when the set changed inside the window; null for
//                   "skip_empty", where nothing was read
// The set to post is: what CentralReach holds, minus managed, plus required. No POST when that
// set equals what CentralReach holds. An empty set is never posted. Every required ID must be in
// CENTRAL_REACH_SENDABLE_LABEL_IDS, checked before any CentralReach call. The catalog check of
// row L.1 (GET /contacts/labels, read once, only when a POST would follow) runs on the set to
// post, after the managed labels are taken out, so a remove-only ID that CentralReach still
// holds never blocks a post.
// An empty read is "no labels" only when contactCreatedThisRun is true; otherwise it is the
// temporary failure CR_LABEL_READ_EMPTY.
// The label POST is sent once per run: it is never retried in-process. When it fails with no
// HTTP status (a timeout, the network) or with a 5xx, CentralReach may have applied it, so the
// thrown error carries `labelPost`: { contactId, labelIds, postedAt }. A 4xx carries none.
// After a POST that answered 200 the labels are read back three times, labelReadBackDelayMs
// apart, the first time at once. confirmed is true when a read-back shows exactly the posted
// set. A read-back that fails counts as not shown, so the posted set and its time are still
// returned.
// Inside the 150-second window after lastLabelPost the sender posts nothing (row L.3). It works
// out the set from the saved post instead of the read: saved labelIds, minus managed, plus
// required. If that set differs from the saved labelIds, the required labels changed after the
// post: confirmed is false, so the run is retried and posts after the window. If it equals the
// saved labelIds: confirmed is true when the read shows them and false when it does not. After
// the window the set is worked out from a fresh read again.
// What the worker does with the answer, in this order:
//   1. It saves lastLabelPost first, before any throw: { contactId, labelIds: postedLabelIds,
//      postedAt } whenever postedLabelIds is not null; or, when updateClientMetadata throws an
//      error that carries `labelPost`, that object as it is, before it rethrows. This comes
//      before the throw for failed metadata fields (failedCount) too, because the labels were
//      posted before the fields were written.
//   2. It clears labelsPending when confirmed is exactly true.
//   3. It ends the run with the temporary failure CR_LABEL_POST_UNCONFIRMED only when confirmed
//      is exactly false.
// The label step runs before the metadata fields; when it throws, no field is written. Error
// codes: contract (g) in src/lib/retry.mjs. A label error carries `labelIds` (IDs only) for the
// log.
export async function updateClientMetadata(contactId, metadataValues, options = {}) {
  const normalizedContactId = String(contactId || "").trim();
  if (!normalizedContactId) {
    throw new Error("CentralReach contactId is required");
  }

  const values = metadataValues && typeof metadataValues === "object" ? metadataValues : {};
  const labelResult = await updateContactLabels(normalizedContactId, {
    requiredLabelIds: options.requiredLabelIds ?? options.labelIds ?? [],
    managedLabelIds: options.managedLabelIds ?? [],
    lastLabelPost: options.lastLabelPost || null,
    contactCreatedThisRun: Boolean(options.contactCreatedThisRun),
    readBackDelayMs: options.labelReadBackDelayMs ?? LABEL_READ_BACK_DELAY_MS,
    onCall: options.onCall
  });
  const clearFieldIds = new Set((options.clearFieldIds || []).map((value) => Number(value)));
  const results = [];

  for (const [fieldId, value] of Object.entries(values)) {
    try {
      const blank = value === undefined || value === null || String(value).trim() === "";
      const result =
        blank && clearFieldIds.has(Number(fieldId))
          ? await clearMetadataField(normalizedContactId, fieldId, options.onCall)
          : await updateMetadataField(normalizedContactId, fieldId, value, options.onCall);
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
  // Contract P.5 (d): used for the contact form of a create only.
  const workStates = Array.isArray(options.workStates) ? options.workStates : [];

  if (!employeePayload) {
    throw new Error("CentralReach employee payload must be an object");
  }

  if (existingContactId) {
    return updateEmployeeByContactId(
      existingContactId,
      employeePayload,
      options.heldContact,
      options.onCall
    );
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
    return await createEmployee(
      {
        ...employeePayload,
        ...(employeeType ? { employeeType } : {})
      },
      workStates,
      options.onCall
    );
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
