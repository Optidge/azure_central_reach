// Stage P, row P.6 (c) (BUILD-PLAN.md section 10; BR19).
// Every label ID and metadata field ID in src/constants/centralReach.mjs that the integration may
// SEND must be in the saved CentralReach catalog snapshot
// (docs/workstreams/architecture-update/cr-catalog-snapshot.json, names and IDs only, taken with
// read-only calls). The snapshot is read from disk. No live call.
//
// When this test fails, do not edit the snapshot and do not change a constant to make it pass:
// report the missing ID.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as centralReachConstants from "../../constants/centralReach.mjs";

const {
  CENTRAL_REACH_CLIENT_METADATA_FIELDS,
  CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS,
  CENTRAL_REACH_METADATA_FIELD_TYPES,
  CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS,
  CENTRAL_REACH_SENDABLE_LABEL_IDS
} = centralReachConstants;

const SNAPSHOT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../docs/workstreams/architecture-update/cr-catalog-snapshot.json"
);
const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
const catalogLabelIds = new Set(snapshot.labels.map((label) => label.labelId));
const catalogFields = new Map(snapshot.metadataFields.map((field) => [field.fieldId, field]));

// The remove-only list is exempt from the "must be in the snapshot" check (orchestrator decision,
// 2026-11-20). Its IDs are never sent: the label sender only subtracts them from what
// CentralReach's own read returned. So an ID that CentralReach has since deleted from its catalog
// is expected there. On 2026-11-20 two of the three (1156744 and 1156745) were already gone.
const REMOVE_ONLY_EXPORT = "CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS";

// Every exported label constant object or list, except the remove-only list. Read from the
// module's exports, so a label object added later is checked without a change here.
function sendableLabelConstants() {
  const found = [];
  for (const [exportName, value] of Object.entries(centralReachConstants)) {
    if (!exportName.includes("LABEL") || exportName === REMOVE_ONLY_EXPORT) {
      continue;
    }
    if (typeof value === "number") {
      // A single label ID, for example the parent label Staffing Status.
      found.push({ name: exportName, id: value });
    } else if (value && typeof value === "object") {
      for (const [key, id] of Object.entries(value)) {
        found.push({ name: `${exportName}.${key}`, id });
      }
    }
  }
  return found;
}

function missingFrom(catalog, entries) {
  return entries.filter(({ id }) => !catalog.has(Number(id))).map(({ name, id }) => `${name} = ${id}`);
}

test("[P.6] the catalog snapshot can be read and holds labels and metadata fields", () => {
  assert.equal(Array.isArray(snapshot.labels) && snapshot.labels.length > 0, true);
  assert.equal(Array.isArray(snapshot.metadataFields) && snapshot.metadataFields.length > 0, true);
  for (const label of snapshot.labels) {
    assert.equal(Number.isInteger(label.labelId), true);
  }
  for (const field of snapshot.metadataFields) {
    assert.equal(Number.isInteger(field.fieldId), true);
  }
});

test("[P.6][BR19] every ID in the sendable-label list is a label in the catalog snapshot", () => {
  const entries = CENTRAL_REACH_SENDABLE_LABEL_IDS.map((id) => ({
    name: "CENTRAL_REACH_SENDABLE_LABEL_IDS",
    id
  }));
  assert.equal(entries.length > 0, true);
  assert.deepEqual(missingFrom(catalogLabelIds, entries), []);
});

test("[P.6][BR19] every label constant that may be sent is a label in the catalog snapshot", () => {
  const entries = sendableLabelConstants();
  // The three label maps (client, staffing, employee) and the sendable list are all seen.
  for (const exportName of [
    "CENTRAL_REACH_CLIENT_LABELS",
    "CENTRAL_REACH_CLIENT_STAFFING_LABELS",
    "CENTRAL_REACH_EMPLOYEE_LABELS",
    "CENTRAL_REACH_SENDABLE_LABEL_IDS"
  ]) {
    assert.equal(
      entries.some(({ name }) => name.startsWith(`${exportName}.`)),
      true,
      `${exportName} is checked`
    );
  }
  assert.deepEqual(missingFrom(catalogLabelIds, entries), []);
});

test("[P.6] no remove-only label ID is in the sendable list or in a label constant a mapper can name", () => {
  const sendable = new Set(sendableLabelConstants().map(({ id }) => Number(id)));
  assert.equal(CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS.length > 0, true);
  for (const id of CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS) {
    assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), false, `${id} is never sent`);
    assert.equal(sendable.has(id), false, `${id} is in no sendable constant`);
  }
});

test("[P.6] every metadata field ID constant is a field in the catalog snapshot", () => {
  const entries = [
    ...Object.entries(CENTRAL_REACH_CLIENT_METADATA_FIELDS).map(([key, id]) => ({
      name: `CENTRAL_REACH_CLIENT_METADATA_FIELDS.${key}`,
      id
    })),
    ...Object.entries(CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS).map(([key, id]) => ({
      name: `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.${key}`,
      id
    })),
    ...Object.keys(CENTRAL_REACH_METADATA_FIELD_TYPES).map((fieldId) => ({
      name: "CENTRAL_REACH_METADATA_FIELD_TYPES",
      id: Number(fieldId)
    }))
  ];
  assert.equal(entries.length > 0, true);
  assert.deepEqual(missingFrom(catalogFields, entries), []);
});

test("[P.6][P.3] field 137697 is a textarea in the catalog, as the constants register it", () => {
  assert.equal(CENTRAL_REACH_METADATA_FIELD_TYPES[137697], "TextArea");
  assert.equal(catalogFields.get(137697)?.type, "textarea");
});

test("[P.6] a field is registered as a TextArea exactly when the catalog says it is a textarea", () => {
  const disagree = Object.entries(CENTRAL_REACH_METADATA_FIELD_TYPES)
    .filter(([fieldId, registered]) => {
      const catalogIsTextArea = catalogFields.get(Number(fieldId))?.type === "textarea";
      return (registered === "TextArea") !== catalogIsTextArea;
    })
    .map(([fieldId, registered]) => `${fieldId} registered as ${registered}`);
  assert.deepEqual(disagree, []);
});
