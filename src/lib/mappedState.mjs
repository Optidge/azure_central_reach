import { sha256 } from "./hash.mjs";

// Saved hashes count only for the mapping version they were made with (row 3.7). Change this
// value whenever the compared state changes shape or a mapper changes what it sends: every field
// is then sent once. Stage 3 changed the employee state (built from HubSpot data only). Stage 7
// is the build package of 2026-11-23: one change for the whole deploy.
export const MAPPING_VERSION = "stage7-2026-11-23";

// Row 3.9: the queue message sources that are the backup path, not a webhook. intakePoller and
// employeePoller are the hourly poller; dailySweep is the daily sweep (row 3.5).
const BACKUP_PATH_SOURCES = new Set(["intakePoller", "employeePoller", "dailySweep"]);
export const CHANGE_NOT_FROM_WEBHOOK =
  "Change found by the poller or the daily sweep, not delivered by a webhook.";

export function isBackupPathSource(source) {
  return BACKUP_PATH_SOURCES.has(String(source || ""));
}

const NULL_TOKEN = "null";

export function normalizeBlank(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  return value;
}

export function stableSortObject(value) {
  if (Array.isArray(value)) {
    return value.map(stableSortObject);
  }
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) {
        continue;
      }
      sorted[key] = stableSortObject(value[key]);
    }
    return sorted;
  }
  return value;
}

export function canonicalizeLabels(labelIds) {
  return Array.from(
    new Set(
      (Array.isArray(labelIds) ? labelIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
  ).sort((left, right) => left - right);
}

export function canonicalizeAssociations(associations) {
  const rows = (Array.isArray(associations) ? associations : [])
    .map((row) => ({
      toObjectId: String(row?.toObjectId || "").trim(),
      typeIds: Array.from(
        new Set(
          (Array.isArray(row?.typeIds) ? row.typeIds : [])
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
        )
      ).sort((left, right) => left - right)
    }))
    .filter((row) => row.toObjectId && row.typeIds.length > 0);

  rows.sort((left, right) => {
    if (left.toObjectId !== right.toObjectId) {
      return left.toObjectId < right.toObjectId ? -1 : 1;
    }
    return left.typeIds.join(",").localeCompare(right.typeIds.join(","));
  });
  return rows;
}

export function explicitMetadata(metadataValues, knownFieldIds, omitFieldIds = []) {
  const omitted = new Set((omitFieldIds || []).map((value) => String(value)));
  const source = metadataValues && typeof metadataValues === "object" ? metadataValues : {};
  const explicit = {};
  for (const fieldId of knownFieldIds || []) {
    const key = String(fieldId);
    if (omitted.has(key)) {
      continue;
    }
    explicit[key] = normalizeBlank(source[key] ?? source[fieldId]);
  }
  return explicit;
}

function normalizeMappedValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeMappedValue);
  }
  if (value && typeof value === "object") {
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) {
        continue;
      }
      normalized[key] = normalizeMappedValue(value[key]);
    }
    return normalized;
  }
  return normalizeBlank(value);
}

export function buildComparableState({
  core,
  metadata,
  labels,
  relationships,
  includeRelationships = false
}) {
  const state = {
    core: normalizeMappedValue(core || {}),
    metadata: explicitMetadata(metadata, Object.keys(metadata || {})),
    labels: canonicalizeLabels(labels)
  };
  if (includeRelationships) {
    state.relationships = canonicalizeAssociations(relationships);
  }
  return state;
}

export function hashMappedState(state) {
  return sha256(JSON.stringify(stableSortObject(state || {})));
}

function flattenLeaves(value, prefix, out) {
  if (Array.isArray(value)) {
    out[prefix] = JSON.stringify(value);
    return;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0 && prefix) {
      out[prefix] = "{}";
    }
    for (const key of keys) {
      flattenLeaves(value[key], prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out[prefix] = value === null || value === undefined ? null : String(value);
}

export function changedFieldNames(previousState, nextState) {
  const previous = {};
  const next = {};
  flattenLeaves(previousState || {}, "", previous);
  flattenLeaves(nextState || {}, "", next);
  const names = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changed = [];
  for (const name of names) {
    if (!name) {
      continue;
    }
    if (previous[name] !== next[name]) {
      changed.push(name);
    }
  }
  return changed.sort();
}

export function fieldHashes(state) {
  const flat = {};
  flattenLeaves(state || {}, "", flat);
  const hashes = {};
  for (const [name, value] of Object.entries(flat)) {
    if (!name) {
      continue;
    }
    hashes[name] = sha256(value === null ? NULL_TOKEN : String(value));
  }
  return hashes;
}

export function changedNamesFromHashes(previousFieldHashes, nextFieldHashes) {
  const next = nextFieldHashes || {};
  if (!previousFieldHashes) {
    return Object.keys(next).sort();
  }
  const names = new Set([...Object.keys(previousFieldHashes), ...Object.keys(next)]);
  return Array.from(names)
    .filter((name) => previousFieldHashes[name] !== next[name])
    .sort();
}

export function metadataClearFieldIds(previousFieldHashes, metadata) {
  if (!previousFieldHashes || typeof previousFieldHashes !== "object") {
    return [];
  }
  const nullHash = sha256(NULL_TOKEN);
  const clears = [];
  for (const [fieldId, value] of Object.entries(metadata || {})) {
    if (normalizeBlank(value) !== null) {
      continue;
    }
    const previous = previousFieldHashes[`metadata.${fieldId}`];
    if (previous && previous !== nullHash) {
      clears.push(Number(fieldId));
    }
  }
  return clears;
}

// What the integration is known to have written, as the basis for a clear (rule 5.8): a field
// counts as written when any of the given hash sets holds a hash for it that is not the blank
// hash. The sets are the saved copy of the last clean run (of any mapping version) and the
// hashes of runs that did not finish clean. Returns null when no set holds anything.
export function writtenFieldHashes(...hashSets) {
  const blankHashes = new Set([sha256(NULL_TOKEN), sha256("")]);
  const written = {};
  for (const hashes of hashSets) {
    for (const [name, hash] of Object.entries(hashes || {})) {
      if (written[name] === undefined || blankHashes.has(written[name])) {
        written[name] = hash;
      }
    }
  }
  return Object.keys(written).length > 0 ? written : null;
}

// Row 3.18 (contract P.5 (c)): a field in the run's omit list could not be read, so it is not in
// the compared state. Its saved hash is carried over as it was. The field is then not a changed
// field, and a later blank in HubSpot still finds the saved value and sends the clear.
// unfinishedFieldHashes (optional): the in-progress hashes of runs that did not finish clean
// (rule 5.8). Such a run may have sent the field a value the saved copy does not show, and its
// hashes do not say which value CentralReach holds now (writtenFieldHashes keeps the first value
// written). When the field is in an unfinished run's hashes (sent, or carried over while
// omitted) and the integration has written a value there, the field keeps UNSETTLED_FIELD_HASH.
// It is not a sha256 hex output, so it matches no value: the next run that reads the field sends
// it again, and a later blank finds it written and sends the clear.
export const UNSETTLED_FIELD_HASH = "unsettled";

export function keepOmittedFieldHashes(
  nextFieldHashes,
  savedFieldHashes,
  omitFieldIds,
  unfinishedFieldHashes = null
) {
  const kept = { ...nextFieldHashes };
  for (const fieldId of omitFieldIds || []) {
    const name = `metadata.${fieldId}`;
    if (unsettledAfterUnfinishedRun(name, savedFieldHashes, unfinishedFieldHashes)) {
      kept[name] = UNSETTLED_FIELD_HASH;
    } else if (savedFieldHashes && savedFieldHashes[name] !== undefined) {
      kept[name] = savedFieldHashes[name];
    }
  }
  return kept;
}

function unsettledAfterUnfinishedRun(name, savedFieldHashes, unfinishedFieldHashes) {
  const unfinished = unfinishedFieldHashes?.[name];
  if (unfinished === undefined) {
    return false;
  }
  const blankHashes = new Set([sha256(NULL_TOKEN), sha256("")]);
  const holdsValue = (hash) => Boolean(hash) && !blankHashes.has(hash);
  return holdsValue(savedFieldHashes?.[name]) || holdsValue(unfinished);
}

// Row 3.8: the metadata fields to send. With a saved copy, only the fields whose hash differs
// from it; with none, every field. The caller passes a saved copy only when the last run was
// clean: after a run that failed halfway CentralReach may hold anything.
export function changedMetadata(metadata, savedFieldHashes, nextFieldHashes) {
  if (!savedFieldHashes) {
    return { ...(metadata || {}) };
  }
  const changed = {};
  for (const [fieldId, value] of Object.entries(metadata || {})) {
    const name = `metadata.${fieldId}`;
    if (savedFieldHashes[name] !== nextFieldHashes?.[name]) {
      changed[fieldId] = value;
    }
  }
  return changed;
}

// Row 3.13 (rule 5.8, tested 2026-11-20): an employee update replaces the core record. A core
// field that is sent blank, or left out, is cleared in CentralReach. So a field that is blank in
// HubSpot is sent blank only when the saved copy shows the integration wrote a value there
// before. Otherwise the request carries the value CentralReach holds, taken from the read of the
// same run (`contact` in the answer of GET /contacts/employee/{id}), key for key; a key that read
// does not hold is left out. A blank date of birth always sends back CentralReach's date (rule
// 5.7; item 1, option (a), decided 2026-11-24), never a clear and never the placeholder: a filled
// held date is rebuilt as YYYY-MM-DDT00:00:00.000Z from its first 10 characters (the client rule,
// item B21); a blank held date is sent back as held, like any other blank held core field. The
// worker sends no update when the read holds no usable date (unusableHeldEmployeeDateOfBirth).
// The compared state and the saved hashes are built from HubSpot data only, so a value sent back
// here is never counted as written by the integration.
export const EMPLOYEE_CORE_FIELDS = Object.freeze([
  "externalSystemId",
  "firstName",
  "lastName",
  "gender",
  "dateOfBirth",
  "primaryEmail",
  "addressLine1",
  "addressLine2",
  "city",
  "stateProvince",
  "zipPostalCode",
  "phoneCell"
]);

export function keepUnwrittenCoreFields(payload, savedFieldHashes, crContact) {
  const blankHashes = new Set([sha256(NULL_TOKEN), sha256("")]);
  const held = crContact && typeof crContact === "object" ? crContact : {};
  const next = { ...(payload || {}) };
  for (const field of EMPLOYEE_CORE_FIELDS) {
    if (normalizeBlank(next[field]) !== null) {
      continue;
    }
    const savedHash = savedFieldHashes?.[`employee.${field}`];
    const writtenBefore = Boolean(savedHash) && !blankHashes.has(savedHash);
    if (writtenBefore && field !== "dateOfBirth") {
      next[field] = null;
    } else if (!Object.prototype.hasOwnProperty.call(held, field)) {
      delete next[field];
    } else if (field === "dateOfBirth" && normalizeBlank(held[field]) !== null) {
      next[field] = `${String(held[field]).slice(0, 10)}T00:00:00.000Z`;
    } else {
      next[field] = held[field];
    }
  }
  return next;
}

// Rule 5.7 (item 1, option (a); guide: "an update never sends the placeholder"): true when the
// HubSpot date of birth is blank and the employee read cannot supply the date to send back: the
// key is missing (a date left out of an employee PUT is cleared), or the held value is neither
// text nor null, or it is filled but does not start with YYYY-MM-DD. A filled HubSpot date never
// depends on what CentralReach holds.
export function unusableHeldEmployeeDateOfBirth(payload, crContact) {
  if (normalizeBlank(payload?.dateOfBirth) !== null) {
    return false;
  }
  const held = crContact && typeof crContact === "object" ? crContact : {};
  if (!Object.prototype.hasOwnProperty.call(held, "dateOfBirth")) {
    return true;
  }
  const heldValue = held.dateOfBirth;
  if (heldValue !== null && typeof heldValue !== "string") {
    return true;
  }
  return normalizeBlank(heldValue) !== null && !/^\d{4}-\d{2}-\d{2}/.test(heldValue);
}

// Item B21 (BR16, row 3.13 client half; Route A, decided 2026-11-23): a client update never
// clears a core field. The client PUT blanks a text key that is left out (live check 2026-11-24;
// see updateBodyFromRead), so every one of these keys is in the PUT body: the mapped value when HubSpot holds one,
// else the value the client read of the same call holds (`contact` in the answer of
// GET /contacts/client/{id}). The read keys are the PUT keys with a lower-case first letter
// (read of 2026-11-24). A blank date of birth sends back CentralReach's date, rebuilt as
// YYYY-MM-DDT00:00:00.000Z from its first 10 characters (the form the mapper sends); when
// CentralReach holds no date either, the key is left out: a date is never sent blank and there
// is no placeholder for clients. Unlike keepUnwrittenCoreFields there is no "written before"
// clear. The reader (getClientByContactId) makes sure every key is in the read and that every
// value sent back is usable (unusableHeldClientCoreField).
// The compared state and the saved hashes are built from HubSpot data only.
export const CLIENT_CORE_FIELDS = Object.freeze([
  "Gender",
  "DateOfBirth",
  "PrimaryEmail",
  "PhoneCell",
  "AddressLine1",
  "AddressLine2",
  "City",
  "StateProvince",
  "ZipPostalCode",
  "GuardianFirstName",
  "GuardianLastName"
]);

export function clientCoreReadKey(field) {
  return field.charAt(0).toLowerCase() + field.slice(1);
}

export function keepHeldClientCoreFields(payload, crClient) {
  const held = crClient && typeof crClient === "object" ? crClient : {};
  const next = { ...(payload || {}) };
  for (const field of CLIENT_CORE_FIELDS) {
    if (normalizeBlank(next[field]) !== null) {
      continue;
    }
    const heldValue = held[clientCoreReadKey(field)];
    if (field !== "DateOfBirth") {
      next[field] = heldValue;
    } else if (normalizeBlank(heldValue) === null) {
      delete next[field];
    } else {
      next[field] = `${String(heldValue).slice(0, 10)}T00:00:00.000Z`;
    }
  }
  return next;
}

// Item B21: the read key of the first held core value keepHeldClientCoreFields would send back
// but cannot, or null. Only the fields blank in the payload are checked, because only those take
// the held value: it must be text or null, and a filled date of birth must start with
// YYYY-MM-DD. A filled HubSpot field never depends on what CentralReach holds.
export function unusableHeldClientCoreField(payload, crClient) {
  for (const field of CLIENT_CORE_FIELDS) {
    if (normalizeBlank(payload?.[field]) !== null) {
      continue;
    }
    const key = clientCoreReadKey(field);
    const heldValue = crClient?.[key];
    if (heldValue !== null && typeof heldValue !== "string") {
      return key;
    }
    const badDate = field === "DateOfBirth" && !/^\d{4}-\d{2}-\d{2}/.test(heldValue);
    if (badDate && normalizeBlank(heldValue) !== null) {
      return key;
    }
  }
  return null;
}

// BR16, row 3.13 (live check of 2026-11-24 on test employee 5338681 and test client 5384589;
// Zeke 2026-11-24 "Field-wipe fix: Send yes"): the employee and the client update PUT each
// replace the whole record. A text key left out of the body is blanked (employee jobTitle and
// chosenName, client chosenName), and a full body sending back every key as read was accepted
// (200) on both. So the update body is the read of the same run (`contact`), key for key as
// CentralReach returned it, with the mapped body laid over it: a mapped key wins, a key the read
// does not hold is never invented, and a value is passed through untouched (lists and objects
// too). putKeyOf names a read key in the PUT: the same for employees, a capital first letter for
// clients (clientPutKey), so no field is sent twice. Not carried from the read:
//   - a contact form key: an update never sends one;
//   - dateOfBirth: the mapped rules decide the date (the mapped value, the held date rebuilt as
//     YYYY-MM-DDT00:00:00.000Z, or left out), never the read's own form;
//   - a blank External System ID: never sent blank (rule 5.4, review fix L-R2).
// The read's values are never logged, hashed or saved: only the PUT body carries them.
const sameKey = (key) => key;

export function clientPutKey(readKey) {
  return readKey.charAt(0).toUpperCase() + readKey.slice(1);
}

function notCarriedFromRead(readKey, value) {
  const key = readKey.toLowerCase();
  return (
    key === "contactform" ||
    key === "dateofbirth" ||
    (key === "externalsystemid" && normalizeBlank(value) === null)
  );
}

export function updateBodyFromRead(mappedBody, heldContact, putKeyOf = sameKey) {
  const body = {};
  for (const [readKey, value] of Object.entries(heldContact || {})) {
    if (!notCarriedFromRead(readKey, value)) {
      body[putKeyOf(readKey)] = value;
    }
  }
  for (const [key, value] of Object.entries(mappedBody || {})) {
    if (value !== undefined) {
      body[key] = value;
    }
  }
  return body;
}

// BR16, row 3.13, the SSN guard (Zeke 2026-11-24: "Yes, with SSN guard"). updateBodyFromRead
// sends the read's SSN back unchanged, so a masked or partial SSN in the read would overwrite the
// real one on every core PUT. A core PUT may send it back only when the read holds no SSN (the key
// absent, null or "") or a full SSN in one of two forms: exactly 9 digits ("123456789"), or 9
// digits in the 3-2-4 dash form ("123-45-6789"). Both carry all nine digits and are sent exactly
// as read (never reformatted), so the echo cannot lose or change a digit. Anything else is not
// sent back: a mask character (*, X, x, #, •, ...), spaces, fewer or more digits, another dash
// layout, or a value that is not text (a number, an object). The key is matched in any casing
// (ssn, Ssn, SSN), for employees and clients alike. Returns the read key of the SSN that cannot be
// sent back, or null. Never the value: callers name the field only.
const SENDABLE_SSN = /^(?:[0-9]{9}|[0-9]{3}-[0-9]{2}-[0-9]{4})$/;

export function unsendableSsnKey(heldContact) {
  for (const [readKey, value] of Object.entries(heldContact || {})) {
    if (readKey.toLowerCase() !== "ssn" || value === null || value === undefined || value === "") {
      continue;
    }
    if (typeof value !== "string" || !SENDABLE_SSN.test(value)) {
      return readKey;
    }
  }
  return null;
}

// Same decision, second half: the core PUT is sent only when a mapped key differs from what the
// read holds. Each mapped key (after every send-back rule) is compared with the read's key
// (readKeyOf: the same name for employees, clientCoreReadKey for clients): two blanks are equal;
// a date compares its first 10 characters (the send-back form); other values compare as text. A
// key the read does not hold counts as different, so the PUT is sent. True when nothing differs:
// CentralReach already holds every mapped value and the PUT would change nothing.
export function mappedKeysMatchRead(mappedBody, heldContact, readKeyOf = sameKey) {
  const held = heldContact && typeof heldContact === "object" ? heldContact : {};
  return Object.entries(mappedBody || {}).every(
    ([key, value]) => value === undefined || sameAsHeld(readKeyOf(key), value, held)
  );
}

function sameAsHeld(readKey, value, held) {
  if (!Object.prototype.hasOwnProperty.call(held, readKey)) {
    return false;
  }
  const sent = normalizeBlank(value);
  const kept = normalizeBlank(held[readKey]);
  if (sent === null || kept === null) {
    return sent === kept;
  }
  if (typeof sent === "object" || typeof kept === "object") {
    return JSON.stringify(stableSortObject(sent)) === JSON.stringify(stableSortObject(kept));
  }
  if (readKey === "dateOfBirth") {
    return String(sent).slice(0, 10) === String(kept).slice(0, 10);
  }
  return String(sent) === String(kept);
}

export function clientWritePlan({ existingContactId, lookedUpContactId }) {
  const id = String(existingContactId || lookedUpContactId || "").trim();
  if (id) {
    return { operation: "update", crContactId: id };
  }
  return { operation: "create", crContactId: null };
}

export class HubSpotReadError extends Error {
  constructor(scope, status) {
    super(`HubSpotReadFailed:${scope}`);
    this.name = "HubSpotReadError";
    this.code = "HUBSPOT_READ_FAILED";
    this.httpStatus = status || null;
    this.scope = scope;
  }
}

export function isStateClientUnavailable(error) {
  return String(error?.message || "").includes("not initialized");
}
