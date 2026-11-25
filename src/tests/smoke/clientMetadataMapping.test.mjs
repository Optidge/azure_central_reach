import test from "node:test";
import assert from "node:assert/strict";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import {
  CENTRAL_REACH_CLIENT_LABELS,
  CENTRAL_REACH_CLIENT_METADATA_FIELDS
} from "../../constants/centralReach.mjs";

// Changed in Stage 4: the inputs are the properties and stored values the mapper reads now
// (rows 4.8, 4.9, 4.19 and 4.23). Each row has its own tests in stage4CaseMappings.test.mjs and
// stage4CaseLabels.test.mjs.
test("[C29][C26][C31][C23][CL1][CL6] buildClientMetadata maps the primary insurance and its ID, allergies, the physician pair, the auth period and the state and All Clients labels", () => {
  const mapped = buildClientMetadata({
    deal: {
      properties: {
        hs_object_id: "777",
        location: "New York",
        allergies: "Confirmed",
        allergies__yes__explain: "Peanuts",
        physician_name: "Dr Smith",
        npi_number: "1112223334",
        n1_what_type_of_insurance: "Medicaid FFS",
        ongoing_auth_period_start_date: "2026-01-01",
        ongoing_autrh_period_end_date: "2026-03-31",
        insurance_primary: "Other",
        insurance_1__other__summary: "Regional Plan",
        insurance_id_1: "ABC-123"
      }
    }
  });

  assert.deepEqual(mapped.labelIds, [
    CENTRAL_REACH_CLIENT_LABELS.ALL_CLIENTS,
    CENTRAL_REACH_CLIENT_LABELS.NY_CLIENT
  ]);

  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.ALLERGIES],
    "Peanuts"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.PHYSICIAN_CREDENTIALS],
    "Dr Smith 1112223334"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.AUTH_PERIOD],
    "01/01/2026 - 03/31/2026"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.CURRENT_INSURANCE],
    "Regional Plan"
  );
  assert.equal(mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.INSURANCE_ID], "ABC-123");
});

const metadataOf = (properties) =>
  buildClientMetadata({ deal: { properties: { hs_object_id: "777", ...properties } } }).metadataValues;
const allergiesOf = (properties) => metadataOf(properties)[CENTRAL_REACH_CLIENT_METADATA_FIELDS.ALLERGIES];
const severityOf = (properties) => metadataOf(properties)[CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL];

// Package item 3 (CF §10.3, §11.1): CentralReach holds the allergen text alone, "None" for no allergy.
test("[C26][4.9] Known Allergies sends a Confirmed explanation alone, with whitespace and line breaks collapsed", () => {
  assert.equal(allergiesOf({ allergies: "Confirmed", allergies__yes__explain: "Peanuts" }), "Peanuts");
  assert.equal(
    allergiesOf({ allergies: "Confirmed", allergies__yes__explain: "  Peanuts,\n tree nuts " }),
    "Peanuts, tree nuts"
  );
});

test("[C26][4.9] Known Allergies sends \"Yes\" for Confirmed with a blank or none-like explanation", () => {
  for (const explain of [undefined, "", "   ", "NA", "n/a", "N/A", "None.", "no", "-"]) {
    assert.equal(allergiesOf({ allergies: "Confirmed", allergies__yes__explain: explain }), "Yes", String(explain));
  }
});

test("[C26][4.9] Known Allergies sends \"None\" for Denial, and nothing for blank or any other value", () => {
  assert.equal(allergiesOf({ allergies: "Denial" }), "None");
  assert.equal(allergiesOf({ allergies: "Denial", allergies__yes__explain: "NA" }), "None");
  assert.equal(allergiesOf({}), null);
  assert.equal(allergiesOf({ allergies: "Unsure" }), null);
});

// Package item 8 (CF §10.2, §10.3): CentralReach holds the severity digit alone.
test("[C28] Severity Level sends the digit of severity_level_clinical, nothing when blank, and a value with no digit as stored", () => {
  assert.equal(severityOf({ severity_level_clinical: "Level 1" }), "1");
  assert.equal(severityOf({ severity_level_clinical: "Level 2" }), "2");
  assert.equal(severityOf({ severity_level_clinical: "Level 3" }), "3");
  assert.equal(severityOf({}), null);
  assert.equal(severityOf({ severity_level_clinical: "  " }), null);
  assert.equal(severityOf({ severity_level_clinical: "Mild" }), "Mild");
  assert.equal(severityOf({ severity_level_clinical: "level 3" }), "3");
  assert.equal(severityOf({ severity_level_clinical: "Level2" }), "2");
  assert.equal(
    severityOf({ severity_level_clinical: "Level 2 - Requiring substantial support" }),
    "Level 2 - Requiring substantial support"
  );
});

// Package item 6 (CF §1.2), O-17 (11.a, 11.b): Care Coordinator 138851 from the fields Zeke's
// coordinator workflow keeps on the Case. care_coordinator_name is no longer read. The full rule
// table, shared with the BCBA 140495, is in careCoordinatorMapping.test.mjs.
const COORDINATOR = CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR;
const coordinatorOf = (properties) =>
  buildClientMetadata({ deal: { properties: { hs_object_id: "777", ...properties } } });
const hasCoordinator = (mapped) => Object.hasOwn(mapped.metadataValues, COORDINATOR);

test("[C10] Care Coordinator: status ready sends first name, last name and email, one per line, each trimmed; a blank part is skipped", () => {
  const ready = (first, last, email) =>
    coordinatorOf({
      coordinator_export_status: "ready",
      care_coordinator_first_name: first,
      care_coordinator_last_name: last,
      care_coordinator_email: email
    });
  const email = "ann.lee@example.com";
  assert.equal(ready("Ann", "Lee", email).metadataValues[COORDINATOR], `Ann\nLee\n${email}`);
  assert.equal(ready("  Ann ", " Lee  ", ` ${email} `).metadataValues[COORDINATOR], `Ann\nLee\n${email}`);
  assert.equal(ready("Mary  Ann", "  van   Lee", null).metadataValues[COORDINATOR], "Mary Ann\nvan Lee");
  assert.equal(ready("Ann", null, null).metadataValues[COORDINATOR], "Ann");
  assert.equal(ready("", "Lee", email).metadataValues[COORDINATOR], `Lee\n${email}`);
  assert.deepEqual(ready("Ann", "Lee", email).warnings, []);
});

test("[C10] Care Coordinator: status no_owner sends a blank, with its key present, whatever the name fields hold", () => {
  const mapped = coordinatorOf({
    coordinator_export_status: "no_owner",
    care_coordinator_name: "Ann Lee",
    care_coordinator_first_name: "Ann",
    care_coordinator_last_name: "Lee"
  });
  assert.equal(hasCoordinator(mapped), true);
  assert.equal(mapped.metadataValues[COORDINATOR], null);
  assert.deepEqual(mapped.warnings, []);
});

test("[C10][3.18] Care Coordinator: ready with both names blank, any other status, or a blank status leaves the field out with the warning care_coordinator_not_ready, which names the status and never a name", () => {
  const cases = [
    [{ coordinator_export_status: "ready", care_coordinator_last_name: null }, "ready"],
    [{ coordinator_export_status: "ready", care_coordinator_first_name: " ", care_coordinator_last_name: "" }, "ready"],
    [{ coordinator_export_status: "missing_match", care_coordinator_first_name: "Ann" }, "missing_match"],
    [{ coordinator_export_status: "refreshing", care_coordinator_first_name: "Ann" }, "refreshing"],
    [{ coordinator_export_status: "duplicate_match" }, "duplicate_match"],
    [{ coordinator_export_status: "inactive" }, "inactive"],
    [{ coordinator_export_status: "incomplete" }, "incomplete"],
    [{ coordinator_export_status: "error" }, "error"],
    [{ coordinator_export_status: null, care_coordinator_first_name: "Ann" }, "blank"],
    [{ coordinator_export_status: "  " }, "blank"],
    [{ coordinator_export_status: "Ann Lee" }, "unknown"]
  ];
  for (const [properties, status] of cases) {
    const mapped = coordinatorOf({ care_coordinator_last_name: "Lee", ...properties });
    assert.equal(hasCoordinator(mapped), false, JSON.stringify(properties));
    assert.deepEqual(
      mapped.warnings.map(({ code, property, status: named }) => [code, property, named]),
      [["care_coordinator_not_ready", "coordinator_export_status", status]],
      JSON.stringify(properties)
    );
    const text = JSON.stringify(mapped.warnings);
    assert.equal(text.includes("Ann") || text.includes("Lee"), false, JSON.stringify(properties));
  }
});

test("[C10] Care Coordinator: care_coordinator_name filled with a blank status is left out (the old property is no longer read)", () => {
  const mapped = coordinatorOf({ care_coordinator_name: "Casey Jordan" });
  assert.equal(hasCoordinator(mapped), false);
  assert.equal(JSON.stringify(mapped.metadataValues).includes("Casey"), false);
});

// Package item 2 (REF item 2): Referral Source as stored; Other sends the "Referral - Other" text.
const referralOf = (properties) =>
  metadataOf(properties)[CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRAL_SOURCE];

test("[C36] Referral Source Other sends the \"Referral - Other\" text, trimmed; Other with a blank or spaces-only text sends \"Other\"", () => {
  assert.equal(referralOf({ referral_source: "Other", referral_other: "  Americare " }), "Americare");
  assert.equal(referralOf({ referral_source: "Other", referral_other: null }), "Other");
  assert.equal(referralOf({ referral_source: "Other", referral_other: "" }), "Other");
  assert.equal(referralOf({ referral_source: "Other", referral_other: "   " }), "Other");
});

test("[C36] Referral Source sends every other value as stored, ignores \"Referral - Other\" unless the value is Other, and sends a blank as blank", () => {
  assert.equal(referralOf({ referral_source: "Bassy-Americare" }), "Bassy-Americare");
  assert.equal(referralOf({ referral_source: "Google" }), "Google");
  assert.equal(referralOf({ referral_source: "Google", referral_other: "JemCare" }), "Google");
  assert.equal(referralOf({ referral_source: null, referral_other: "JemCare" }), null);
  assert.equal(referralOf({}), null);
});
