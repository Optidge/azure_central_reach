const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;

// Log keys that hold a record or contact ID. A value under one of these keys that is a number or a
// text of digits only is an ID and is kept as it is: a ten-digit ID looks like a phone number to
// PHONE_REGEX, and a log line without its record ID cannot be used. Any other key is unchanged,
// and so is an ID key that holds anything else (for example 555-123-4567), which is still
// redacted.
const ID_KEYS = new Set([
  "recordId",
  "dealId",
  "portalId",
  "invocationId",
  "messageId",
  "contactId",
  "crContactId",
  "existingContactId",
  "employeeId"
]);

function isIdValue(key, value) {
  if (!ID_KEYS.has(key)) {
    return false;
  }
  return (
    (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) ||
    (typeof value === "string" && /^\d+$/.test(value))
  );
}

export function safeString(value, max = 200) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  return stringValue.length > max ? `${stringValue.slice(0, max)}...` : stringValue;
}

// Values are cut at 2000 characters. The `crCalls` list of the run summary line holds only kinds
// and statuses, and a long failed run has more than 2000 characters of them: it gets a higher cap.
const DEFAULT_VALUE_CAP = 2000;
const VALUE_CAPS = Object.freeze({ crCalls: 16000 });

export function redactPotentialPhi(value, max = DEFAULT_VALUE_CAP) {
  const text = safeString(value, max);
  return text
    .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
    .replace(PHONE_REGEX, "[REDACTED_PHONE]");
}

export function safeLog(level = "info", message = "", meta = {}) {
  const logLevel = typeof console[level] === "function" ? level : "log";
  const redactedMeta = {};

  for (const [key, value] of Object.entries(meta)) {
    redactedMeta[key] = isIdValue(key, value) ? safeString(value, 2000) : redactPotentialPhi(value, VALUE_CAPS[key] ?? DEFAULT_VALUE_CAP);
  }

  console[logLevel](redactPotentialPhi(message), redactedMeta);
}
