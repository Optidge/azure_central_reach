import { sha256 } from "./hash.mjs";

export const MAPPING_VERSION = "guide-sandbox-2026-10-27";

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
