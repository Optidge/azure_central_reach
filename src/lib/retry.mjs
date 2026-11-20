import {
  SYNC_FAILED,
  centralReachRejected,
  hubspotRejected,
  metadataWriteFailed,
  missingRequiredField
} from "../constants/syncReasons.mjs";

// A temporary failure is retried by a new scheduled queue message after 1 minute, 5 minutes,
// 15 minutes, 1 hour and 4 hours. After the fifth retry fails the record shows "Retries used up"
// and the message is dead-lettered.
export const RETRY_DELAYS_SECONDS = Object.freeze([60, 300, 900, 3600, 14400]);
export const MAX_RETRIES = RETRY_DELAYS_SECONDS.length;
// No retry is scheduled further out than this, whatever Retry-After says (HubSpot's longest
// Retry-After is 24 hours). A provider that is still busy then costs one more attempt.
export const MAX_RETRY_DELAY_SECONDS = 24 * 3600;

export const FAILURE_KINDS = Object.freeze({
  TEMPORARY: "temporary",
  PERMANENT: "permanent",
  UNKNOWN_CREATE: "unknown_create"
});

// Error codes set by this integration.
const TEMPORARY_CODES = new Set([
  "SYNC_IN_PROGRESS", // another run holds the record
  "SYNC_STALE", // the record changed during the run
  "CR_LOOKUP_UNKNOWN", // a lookup answered something other than 200 or 404
  "HUBSPOT_READ_FAILED", // HubSpot refused a read with 401 or 403
  "CR_AUTH_FAILED" // the CentralReach token request failed, with any status
]);
const PERMANENT_CODES = new Set([
  "CR_EXTERNAL_ID_REQUIRED",
  // CentralReach answered in a shape the code cannot read.
  "CR_EMPLOYEE_READ_FAILED",
  "CR_LABEL_READ_FAILED",
  "CR_LOOKUP_UNREADABLE"
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

function readRetryAfterHeader(error) {
  const headers = error?.response?.headers;
  return (
    headers?.["retry-after"] ??
    headers?.["Retry-After"] ??
    (typeof headers?.get === "function" ? headers.get("retry-after") : undefined)
  );
}

// Retry-After as whole seconds from now, read from seconds or from an HTTP date. null when the
// failure carries none.
export function retryAfterSeconds(error, now = Date.now()) {
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

// attempt is the number of retries this message has already used (0 on the first delivery).
// Returns the next attempt and its delay, or null when the retries are used up. A Retry-After
// longer than the next step sets the delay.
export function planRetry({ attempt, error }) {
  if (attempt >= MAX_RETRIES) {
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
