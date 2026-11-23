// F-1 (owner's decision 2026-11-21): the formats CentralReach stores for phone, email, state and
// gender (checked on a production employee, formats only): phone 10 digits, state 2 upper-case
// letters, gender a Title-case word, email an email. Each reader answers one of
//   { status: "blank" }            nothing filled: the field keeps today's blank handling
//   { status: "value", value }     the value in the CentralReach format
//   { status: "unreadable" }       filled but not convertible: never sent, never sent as null
// The mappers name an unreadable property in unreadableValueProperties and the worker ends the run
// as `error` before any CentralReach write (rule 5.8, like an unreadable date).

const BLANK = Object.freeze({ status: "blank" });
const UNREADABLE = Object.freeze({ status: "unreadable" });

function filledText(value) {
  return String(value ?? "").trim();
}

const US_STATE_NAME_TO_CODE = Object.freeze({
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC"
});

const US_STATE_CODES = new Set(Object.values(US_STATE_NAME_TO_CODE));

// A trailing extension: "x123", "ext 123", "ext. 123", "extension 123" or "#123".
const PHONE_EXTENSION = /\s*(?:ext(?:ension)?\.?|x|#)\s*\d+$/i;
// The US country prefix CentralReach does not store: "1" (also written "+1") or "001".
const US_PREFIXES = Object.freeze(["1", "001"]);

// Owner (2026-11-21): numbers are always US-based, and CentralReach stores the 10-digit national
// number. A trailing extension is dropped (CentralReach's phoneCell holds no extension). Then
// every non-digit (spaces, dots, dashes, parentheses, "+") is ignored, and a US prefix in front of
// 10 digits is dropped. Any other letter, or any other digit count, is unreadable: no digit is
// ever added or guessed.
export function readPhone(value) {
  const text = filledText(value);
  if (!text) {
    return BLANK;
  }
  const number = text.replace(PHONE_EXTENSION, "");
  if (/[a-z]/i.test(number)) {
    return UNREADABLE;
  }
  const digits = number.replace(/\D+/g, "");
  if (digits.length === 10) {
    return { status: "value", value: digits };
  }
  const prefix = US_PREFIXES.find((item) => digits.length === item.length + 10 && digits.startsWith(item));
  return prefix ? { status: "value", value: digits.slice(prefix.length) } : UNREADABLE;
}

// Trimmed and lower-case, with one basic shape check: something@something.something, no spaces.
export function readEmail(value) {
  const email = filledText(value).toLowerCase();
  if (!email) {
    return BLANK;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { status: "value", value: email } : UNREADABLE;
}

// A state code or name from the list above. Dots and extra spaces are dropped first ("N.Y." is NY).
export function readStateCode(value) {
  const text = filledText(value);
  if (!text) {
    return BLANK;
  }
  const normalized = text.replace(/\./g, "").replace(/\s+/g, " ").trim().toUpperCase();
  if (US_STATE_CODES.has(normalized)) {
    return { status: "value", value: normalized };
  }
  const code = US_STATE_NAME_TO_CODE[normalized];
  return code ? { status: "value", value: code } : UNREADABLE;
}

// male / female, and m / f when allowInitials (the employee side accepted initials before F-1).
export function readGender(value, { allowInitials = false } = {}) {
  const text = filledText(value).toLowerCase();
  if (!text) {
    return BLANK;
  }
  if (text === "male" || (allowInitials && text === "m")) {
    return { status: "value", value: "Male" };
  }
  if (text === "female" || (allowInitials && text === "f")) {
    return { status: "value", value: "Female" };
  }
  return UNREADABLE;
}

// One reader per mapper run: valueOf(reader, property, options) gives the converted value or null
// (blank and unreadable alike), and notes each unreadable property once, by name only (BR21).
export function createValueReader(properties) {
  const unreadableValueProperties = [];
  const valueOf = (reader, property, options) => {
    const read = reader(properties?.[property], options);
    if (read.status === "unreadable") {
      if (!unreadableValueProperties.includes(property)) {
        unreadableValueProperties.push(property);
      }
      return null;
    }
    return read.status === "value" ? read.value : null;
  };
  return { valueOf, unreadableValueProperties };
}
