// O-17 (Zeke 2026-11-25, batch 3 item 11, 11.a, 11.b, A): the Care Coordinator rule shared by the
// Case (Client Meta 138851, C10) and the BCBA (Employee Meta 140495, B11). Spec: A4.3 and A4.7
// items 1 to 3, 5, 16 and 17 of docs/workstreams/architecture-update/batch3-verification-2026-11-25.md.
// Every test runs the real mappers; the PUT body test uses the fake CentralReach HTTP adapter.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CENTRAL_REACH_CLIENT_METADATA_FIELDS,
  CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS,
  CENTRAL_REACH_METADATA_FIELD_TYPES
} from "../../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
// The metadata sender is the same for clients and employees (PUT /contacts/{id}/metadata/{field}).
import { updateClientMetadata } from "../../lib/centralReachClient.mjs";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import { CASE_PROPERTIES } from "../../mappings/client/clientProperties.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import {
  BCBA_PROPERTIES,
  employeeRequestProperties,
  knownMetadataFieldIds
} from "../../mappings/employees/employeeProperties.mjs";
import {
  CARE_COORDINATOR_PROPERTIES,
  COORDINATOR_LINE_SEPARATOR,
  careCoordinatorValue
} from "../../mappings/shared/careCoordinator.mjs";
import { expectedTriggerProperties } from "../../../scripts/check-triggers.mjs";
import { fakeCentralReach } from "./stage2Fakes.mjs";

const CASE_FIELD = CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR;
const BCBA_FIELD = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CARE_COORDINATOR;
const CONFIG = { hubspot: { hubspotPortalId: "52311591", bcbaObjectTypeId: "2-72890322", btRbtObjectTypeId: "2-1" } };

// Each object maps the same HubSpot properties to its own field.
const SIDES = [
  {
    id: "C10",
    label: "Case 138851",
    fieldId: CASE_FIELD,
    map: (properties) => buildClientMetadata({ deal: { properties: { hs_object_id: "777", ...properties } } })
  },
  {
    id: "B11",
    label: "BCBA 140495",
    fieldId: BCBA_FIELD,
    map: (properties) =>
      buildEmployeePayload({
        employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA,
        config: CONFIG,
        record: { id: "9001", properties: { hs_object_id: "9001", ...properties } }
      })
  }
];

const parts = (first, last, email, status) => ({
  care_coordinator_first_name: first,
  care_coordinator_last_name: last,
  care_coordinator_email: email,
  coordinator_export_status: status
});
const EMAIL = "ann.lee@example.com";
const NOT_READY = Symbol("left out");

// The A4.3 examples table. The last column: the value sent, or NOT_READY with the warning status.
const EXAMPLES = [
  [parts("Ann", "Lee", EMAIL, "ready"), `Ann\nLee\n${EMAIL}`],
  [parts("  Ann ", " Lee  ", ` ${EMAIL} `, "ready"), `Ann\nLee\n${EMAIL}`],
  [parts("Mary  Ann", "Lee", EMAIL, "ready"), `Mary Ann\nLee\n${EMAIL}`],
  [parts("Ann\nMarie", "Lee", "", "ready"), "Ann Marie\nLee"],
  [parts("", "Lee", EMAIL, "ready"), `Lee\n${EMAIL}`],
  [parts("Ann", " ", EMAIL, "ready"), `Ann\n${EMAIL}`],
  [parts("Ann", "Lee", null, "ready"), "Ann\nLee"],
  [parts(null, "", EMAIL, "ready"), EMAIL],
  [parts("Ann", "", "", "ready"), "Ann"],
  [parts(" ", "", null, "ready"), [NOT_READY, "ready"]],
  [parts("Ann", "Lee", EMAIL, "no_owner"), null],
  [parts("Ann", "Lee", EMAIL, "missing_match"), [NOT_READY, "missing_match"]],
  [parts("Ann", "Lee", EMAIL, "refreshing"), [NOT_READY, "refreshing"]],
  [parts("Ann", "Lee", EMAIL, null), [NOT_READY, "blank"]],
  [parts("Ann", "Lee", EMAIL, "Ann Lee"), [NOT_READY, "unknown"]]
];

for (const side of SIDES) {
  test(`[${side.id}] ${side.label}: every row of the A4.3 examples table gives exactly the result shown`, () => {
    for (const [properties, expected] of EXAMPLES) {
      const label = JSON.stringify(properties);
      const mapped = side.map(properties);
      const coordinatorWarnings = mapped.warnings.filter(
        (warning) => warning.code === "care_coordinator_not_ready"
      );
      if (Array.isArray(expected) && expected[0] === NOT_READY) {
        assert.equal(Object.hasOwn(mapped.metadataValues, side.fieldId), false, label);
        assert.deepEqual(
          coordinatorWarnings.map(({ property, status }) => [property, status]),
          [["coordinator_export_status", expected[1]]],
          label
        );
        const text = JSON.stringify(coordinatorWarnings);
        assert.equal(/Ann|Lee|Marie|example\.com/.test(text), false, label);
      } else {
        assert.equal(Object.hasOwn(mapped.metadataValues, side.fieldId), true, label);
        assert.equal(mapped.metadataValues[side.fieldId], expected, label);
        assert.deepEqual(coordinatorWarnings, [], label);
      }
    }
  });

  test(`[${side.id}] ${side.label}: every blank or filled combination of the three parts: no leading, trailing or double line break, no CR, one line per filled part`, () => {
    const options = [null, "", "  ", "Ann", " Mary \t Ann\r\n"];
    for (const first of options) {
      for (const last of options) {
        for (const email of [...options, ` ${EMAIL}\n`]) {
          const filled = [first, last, email].filter((part) => part !== null && part.trim() !== "").length;
          const mapped = side.map(parts(first, last, email, "ready"));
          const label = JSON.stringify([first, last, email]);
          if (filled === 0) {
            assert.equal(Object.hasOwn(mapped.metadataValues, side.fieldId), false, label);
            continue;
          }
          const value = mapped.metadataValues[side.fieldId];
          assert.equal(value.startsWith("\n") || value.endsWith("\n"), false, label);
          assert.equal(value.includes("\n\n"), false, label);
          assert.equal(value.includes("\r"), false, label);
          assert.equal(value.split(COORDINATOR_LINE_SEPARATOR).length, filled, label);
        }
      }
    }
  });

  test(`[${side.id}] ${side.label}: no_owner with all three parts filled sends a blank, its key present`, () => {
    const mapped = side.map(parts("Ann", "Lee", EMAIL, "no_owner"));
    assert.equal(Object.hasOwn(mapped.metadataValues, side.fieldId), true);
    assert.equal(mapped.metadataValues[side.fieldId], null);
  });
}

test("[C10][B11] one shared rule: the line separator is LF only, and the four properties are first name, last name, email, status in that order", () => {
  assert.equal(COORDINATOR_LINE_SEPARATOR, "\n");
  assert.deepEqual(
    [...CARE_COORDINATOR_PROPERTIES],
    ["care_coordinator_first_name", "care_coordinator_last_name", "care_coordinator_email", "coordinator_export_status"]
  );
  assert.deepEqual(careCoordinatorValue(parts("Ann", "Lee", EMAIL, "ready")), { value: `Ann\nLee\n${EMAIL}` });
  // The email is sent as stored: not lowercased, not format-checked.
  assert.equal(careCoordinatorValue(parts("ann", "LEE", "Ann.Lee@Example.COM", "ready")).value, "ann\nLEE\nAnn.Lee@Example.COM");
  assert.equal(careCoordinatorValue(parts("Ann", "Lee", "not-an-email", "ready")).value, "Ann\nLee\nnot-an-email");
  // Statuses compare case-sensitively.
  assert.equal(careCoordinatorValue(parts("Ann", "Lee", EMAIL, "Ready")).warning.status, "unknown");
});

test("[C10][B11] 138851 and 140495 are Input fields: the three-line value is sent as { inputValue } with the inner LF kept, never as textAreaValue", async () => {
  assert.equal(CENTRAL_REACH_METADATA_FIELD_TYPES[CASE_FIELD], "Input");
  assert.equal(CENTRAL_REACH_METADATA_FIELD_TYPES[BCBA_FIELD], "Input");
  const value = `Ann\nLee\n${EMAIL}`;
  const cr = fakeCentralReach();
  assert.equal((await updateClientMetadata("2001", { [CASE_FIELD]: value }, {})).failedCount, 0);
  assert.equal((await updateClientMetadata("5002", { [BCBA_FIELD]: value }, {})).failedCount, 0);
  const bodyFor = (fieldId) =>
    cr.calls.find((call) => call.method === "PUT" && call.url.endsWith(`/metadata/${fieldId}`)).body;
  assert.deepEqual(bodyFor(CASE_FIELD), { inputValue: value });
  assert.deepEqual(bodyFor(BCBA_FIELD), { inputValue: value });
});

test("[B11] the BT/RBT never carries 140495: not in its known fields, not in its payload, and none of the four properties is requested", () => {
  const btRbt = HUBSPOT_EMPLOYEE_TYPES.BT_RBT;
  assert.equal(knownMetadataFieldIds(btRbt).includes(BCBA_FIELD), false);
  assert.equal(knownMetadataFieldIds(HUBSPOT_EMPLOYEE_TYPES.BCBA).includes(BCBA_FIELD), true);
  for (const property of CARE_COORDINATOR_PROPERTIES) {
    assert.equal(employeeRequestProperties(btRbt).includes(property), false, property);
  }
  const mapped = buildEmployeePayload({
    employeeType: btRbt,
    config: CONFIG,
    record: { id: "9002", properties: { hs_object_id: "9002", ...parts("Ann", "Lee", EMAIL, "ready") } }
  });
  assert.equal(Object.hasOwn(mapped.metadataValues, BCBA_FIELD), false);
  assert.equal(JSON.stringify(mapped).includes(EMAIL), false);
});

test("[C10][B11] the check-triggers expected lists hold care_coordinator_email for the Case and the four properties for the BCBA", () => {
  const expected = expectedTriggerProperties();
  assert.equal(expected.case.includes("care_coordinator_email"), true);
  for (const property of CARE_COORDINATOR_PROPERTIES) {
    assert.equal(CASE_PROPERTIES.mapped.includes(property), true, `Case maps ${property}`);
    assert.equal(BCBA_PROPERTIES.mapped.includes(property), true, `BCBA maps ${property}`);
    assert.equal(expected.bcba.includes(property), true, `BCBA trigger ${property}`);
    assert.equal(expected.btRbt.includes(property), false, `BT/RBT trigger ${property}`);
  }
});
