import {
  LABEL_NOT_SENDABLE,
  SYNC_FAILED,
  centralReachRejected,
  hubspotRejected,
  metadataWriteFailed,
  missingRequiredField
} from "../constants/syncReasons.mjs";

// A temporary failure is retried by a new scheduled queue message after 1 minute, 5 minutes,
// 15 minutes, 1 hour and 4 hours. After the fifth retry fails the record shows "Retries used up"
// and the message is dead-lettered. A daily sweep message gets fewer (maxRetriesFor, item 20).
export const RETRY_DELAYS_SECONDS = Object.freeze([60, 300, 900, 3600, 14400]);
export const MAX_RETRIES = RETRY_DELAYS_SECONDS.length;
// No retry is scheduled further out than this, whatever Retry-After says (HubSpot's longest
// Retry-After is 24 hours). A provider that is still busy then costs one more attempt.
export const MAX_RETRY_DELAY_SECONDS = 24 * 3600;
// Rule 5.6: a CentralReach label read can be about two minutes behind a write (label test of
// 2026-11-20). For this long after a label POST no new POST is made for the contact
// (centralReachClient.mjs), and the first retry of an unconfirmed POST waits as long (item 12).
export const LABEL_POST_WINDOW_SECONDS = 150;

export const FAILURE_KINDS = Object.freeze({
  TEMPORARY: "temporary",
  PERMANENT: "permanent",
  UNKNOWN_CREATE: "unknown_create"
});

// Error codes set by this integration.
//
// CONTRACT P.5 (g): the codes the CentralReach client (src/lib/centralReachClient.mjs, rows L.1
// to L.4 and 3.14) and the workers may set on an error, and how each is sorted. A code that is
// not listed here is sorted by its HTTP status, and with no status it is temporary. A new code
// goes in one of these two sets first.
//   Label sender, temporary (retried on the normal schedule, then "Retries used up"):
//     CR_LABEL_NOT_IN_CATALOG     an ID in the set to post is not in CentralReach's live label
//                                 catalog: nothing is posted (row L.1)
//     CR_LABEL_READ_EMPTY         the label read came back empty for a contact this run did not
//                                 create: nothing is posted (row L.2)
//     CR_LABEL_POST_UNCONFIRMED   the read does not show the posted set yet. Set by the worker,
//                                 after it saved the label POST in the link record (row L.3).
//                                 Its first retry waits LABEL_POST_WINDOW_SECONDS (item 12)
//   Label sender, permanent (`error` on the record, no retry):
//     CR_LABEL_NOT_SENDABLE       a required label is outside CENTRAL_REACH_SENDABLE_LABEL_IDS,
//                                 a code defect: nothing is posted (row L.1)
//     CR_LABEL_CATALOG_UNREADABLE the label catalog answered in a shape the code cannot read
//                                 (Stage 2 decision 4; built with unreadableAnswerError)
//     CR_LABEL_READ_FAILED        the contact's label read answered in a shape the code cannot
//                                 read (built in Stage 2)
//   Sorted by status, no code needed: a failed label read or catalog read; a 400 on the label
//   POST, which is permanent like every CentralReach 4xx except 401, 408 and 429 (row L.4).
//   Client lookup (row 3.14), both built in Stage 2: CR_LOOKUP_UNKNOWN (an answer that is not 200
//   or 404: temporary, never a create) and CR_LOOKUP_UNREADABLE (a 200 with no contact ID:
//   permanent, never a create).
const TEMPORARY_CODES = new Set([
  "SYNC_IN_PROGRESS", // another run holds the record
  "SYNC_STALE", // the record changed during the run
  "CR_LOOKUP_UNKNOWN", // a lookup answered something other than 200 or 404
  "HUBSPOT_READ_FAILED", // HubSpot refused a read with 401 or 403, or answered with no list
  // Finding F-3: the HubSpot token belongs to another portal than HUBSPOT_PORTAL_ID. Invalid
  // configuration, sorted like the other configuration failures (an error with no code is
  // temporary): retried on the schedule, then dead-lettered, so the dead-letter alert fires. No
  // HubSpot CRM call is made with that token (src/lib/hubspotClient.mjs), so nothing is written
  // to the record.
  "HUBSPOT_PORTAL_MISMATCH",
  "CR_AUTH_FAILED", // the CentralReach token request failed, with any status
  // Row 3.15: a create was sent less than 15 minutes ago and its lookup answers "not found".
  // No second create is sent; the run is retried.
  "CR_CREATE_PENDING",
  "CR_LABEL_NOT_IN_CATALOG",
  "CR_LABEL_READ_EMPTY",
  "CR_LABEL_POST_UNCONFIRMED"
]);
const PERMANENT_CODES = new Set([
  "CR_EXTERNAL_ID_REQUIRED",
  // CentralReach answered in a shape the code cannot read.
  "CR_EMPLOYEE_READ_FAILED",
  "CR_CLIENT_READ_FAILED",
  "CR_LABEL_READ_FAILED",
  "CR_LOOKUP_UNREADABLE",
  "CR_LABEL_CATALOG_UNREADABLE",
  // A code defect in a mapper: retrying cannot fix it.
  "CR_LABEL_NOT_SENDABLE"
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// HubSpot: only 400 and 404 are permanent. 401, 403, 423, 429, 477 and every 5xx are retried.
// CentralReach: every 4xx is permanent except 401, 408 and 429.
function statusIsPermanent(status, provider) {
  if (provider === "hubspot") {
    return status === 400 || status === 404;
  }
  return status >= 400 && status <= 499 && status !== 401 && status !== 408 && status !== 429;
}

function metadataFieldIsTemporary(field) {
  if (field?.operation === "clear_unsupported") {
    return false;
  }
  return !statusIsPermanent(Number(field?.status), "centralreach");
}

// The one place that sorts a failure. Anything not named permanent here is temporary: no status,
// no code, a network timeout, a Cosmos 429 or 503.
export function classifyFailure(error) {
  const code = error?.code;
  if (code === "CR_CREATE_OUTCOME_UNKNOWN") {
    return FAILURE_KINDS.UNKNOWN_CREATE;
  }
  if (TEMPORARY_CODES.has(code)) {
    return FAILURE_KINDS.TEMPORARY;
  }
  if (PERMANENT_CODES.has(code)) {
    return FAILURE_KINDS.PERMANENT;
  }
  if (code === "METADATA_WRITE_FAILED") {
    const fields = Array.isArray(error.failedFields) ? error.failedFields : [];
    const temporary = fields.length === 0 || fields.some(metadataFieldIsTemporary);
    return temporary ? FAILURE_KINDS.TEMPORARY : FAILURE_KINDS.PERMANENT;
  }
  // A numeric code is a Cosmos status. It is never read as a CentralReach or HubSpot answer.
  if (typeof code === "number") {
    return FAILURE_KINDS.TEMPORARY;
  }
  const status = Number(error?.response?.status);
  if (Number.isFinite(status) && statusIsPermanent(status, error?.provider)) {
    return FAILURE_KINDS.PERMANENT;
  }
  return FAILURE_KINDS.TEMPORARY;
}

// The fixed sentence HubSpot gets for a permanent failure. Never the provider's own message.
export function permanentFailureReason(error) {
  if (error?.syncReason) {
    return error.syncReason;
  }
  if (error?.code === "CR_EXTERNAL_ID_REQUIRED") {
    return missingRequiredField("externalSystemId");
  }
  if (error?.code === "METADATA_WRITE_FAILED") {
    return metadataWriteFailed(error.failedFieldIds);
  }
  if (error?.code === "CR_LABEL_NOT_SENDABLE") {
    return LABEL_NOT_SENDABLE;
  }
  const status = error?.response?.status;
  if (status) {
    return error.provider === "hubspot" ? hubspotRejected(status) : centralReachRejected(status);
  }
  return SYNC_FAILED;
}

// A metadata write with failed fields. The fields keep their status and Retry-After, so the
// failure can be sorted and the retry can wait long enough.
export function metadataWriteFailedError(summary) {
  const error = new Error("MetadataWriteFailed");
  error.code = "METADATA_WRITE_FAILED";
  error.failedFieldIds = summary?.failedFieldIds || [];
  error.failedFields = summary?.failedFields || [];
  return error;
}

// Row L.3: a label POST that the read does not show yet. The worker throws this after it saved
// the POST in the link record; the run is retried on the normal schedule. Item 12: the retry
// waits at least the label window, so the first one no longer lands inside CentralReach's lag.
export function labelPostUnconfirmedError() {
  const error = new Error("LabelPostUnconfirmed");
  error.code = "CR_LABEL_POST_UNCONFIRMED";
  error.retryAfterSeconds = LABEL_POST_WINDOW_SECONDS;
  return error;
}

// Row 3.15: thrown by the worker instead of sending a second create.
export function createStillPendingError() {
  const error = new Error("CreateStillPending");
  error.code = "CR_CREATE_PENDING";
  return error;
}

function readRetryAfterHeader(error) {
  const headers = error?.response?.headers;
  return (
    headers?.["retry-after"] ??
    headers?.["Retry-After"] ??
    (typeof headers?.get === "function" ? headers.get("retry-after") : undefined)
  );
}

// Retry-After as whole seconds from now: the wait this integration set on the error (item 12),
// else the longest wait of its failed fields, else the HTTP header read from seconds or from a
// date. null when the failure carries none.
export function retryAfterSeconds(error, now = Date.now()) {
  const ownWait = error?.retryAfterSeconds;
  if (Number.isFinite(ownWait) && ownWait >= 0) {
    return ownWait;
  }
  if (Array.isArray(error?.failedFields)) {
    const waits = error.failedFields
      .map((field) => field?.retryAfterSeconds)
      .filter((value) => Number.isFinite(value));
    return waits.length ? Math.max(...waits) : null;
  }
  const raw = readRetryAfterHeader(error);
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return null;
  }
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return seconds >= 0 ? seconds : null;
  }
  const dateMs = Date.parse(String(raw));
  if (!Number.isFinite(dateMs)) {
    return null;
  }
  return Math.max(0, Math.ceil((dateMs - now) / 1000));
}

// Package item 20: a message queued by the daily sweep gets one queue retry, not five. The
// sweep queues the record again the next day, so a stuck record costs at most two full runs a
// day. Every other source (webhooks, the hourly poller, the Contact fan-out) keeps five.
export const DAILY_SWEEP_SOURCE = "dailySweep";
export const DAILY_SWEEP_MAX_RETRIES = 1;
// The failures that keep the full schedule on a sweep message too: another run holds the
// record, a create is still inside its 15-minute window (a waiting record never goes to the
// dead-letter queue, guide line 267), and an unconfirmed label POST (requirements review
// question 20, decided 2026-11-24).
const FULL_SCHEDULE_CODES = new Set([
  "SYNC_IN_PROGRESS",
  "CR_CREATE_PENDING",
  "CR_LABEL_POST_UNCONFIRMED"
]);

// The number of queue retries a message from this source gets for this failure. Without an
// error, the limit for an ordinary failure.
export function maxRetriesFor({ source, error } = {}) {
  if (source === DAILY_SWEEP_SOURCE && !FULL_SCHEDULE_CODES.has(error?.code)) {
    return DAILY_SWEEP_MAX_RETRIES;
  }
  return MAX_RETRIES;
}

// True when a failure of this attempt gets no further retry: the record shows "Retries used up"
// and the message is dead-lettered.
export function isLastAttempt({ attempt, source, error } = {}) {
  return attempt >= maxRetriesFor({ source, error });
}

// attempt is the number of retries this message has already used (0 on the first delivery);
// source is the message's `source`. Returns the next attempt and its delay, or null when the
// retries are used up. A Retry-After longer than the next step sets the delay.
export function planRetry({ attempt, error, source }) {
  if (isLastAttempt({ attempt, source, error })) {
    return null;
  }
  const waitSeconds = retryAfterSeconds(error) ?? 0;
  return {
    attempt: attempt + 1,
    delaySeconds: Math.min(
      Math.max(RETRY_DELAYS_SECONDS[attempt], waitSeconds),
      MAX_RETRY_DELAY_SECONDS
    )
  };
}

export function isRetriableStatus(status) {
  if (!status) {
    return false;
  }
  return status === 429 || (status >= 500 && status <= 599);
}

export function retryDelayMs(error, fallbackMs, maxDelayMs) {
  const seconds = retryAfterSeconds(error);
  if (seconds !== null) {
    return Math.min(seconds * 1000, maxDelayMs);
  }
  return Math.min(fallbackMs, maxDelayMs);
}

// In-process retry for one HTTP call. The waits stay short (5 seconds at most).
export async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelayMs = 400,
    maxDelayMs = 5000
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (!isRetriableStatus(status) || attempt >= maxAttempts) {
        throw error;
      }
      // The provider asked for a longer wait than this process may hold a message: stop here
      // and let the scheduled retry wait.
      const waitSeconds = retryAfterSeconds(error);
      if (waitSeconds !== null && waitSeconds * 1000 > maxDelayMs) {
        throw error;
      }

      const fallbackMs = baseDelayMs * 2 ** (attempt - 1);
      await sleep(retryDelayMs(error, fallbackMs, maxDelayMs));
    }
  }

  throw lastError;
}
