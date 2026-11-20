import { sha256 } from "./hash.mjs";

// Saved hashes count only for the mapping version they were made with (row 3.7). Change this
// value whenever the compared state changes shape or a mapper changes what it sends: every field
// is then sent once. Stage 3 changed the employee state (built from HubSpot data only).
export const MAPPING_VERSION = "stage3-2026-11-20";

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
export function keepOmittedFieldHashes(nextFieldHashes, savedFieldHashes, omitFieldIds) {
  const kept = { ...nextFieldHashes };
  for (const fieldId of omitFieldIds || []) {
    const name = `metadata.${fieldId}`;
    if (savedFieldHashes && savedFieldHashes[name] !== undefined) {
      kept[name] = savedFieldHashes[name];
    }
  }
  return kept;
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
// 5.7), never a blank and never the placeholder.
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
    } else if (Object.prototype.hasOwnProperty.call(held, field)) {
      next[field] = held[field];
    } else {
      delete next[field];
    }
  }
  return next;
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
