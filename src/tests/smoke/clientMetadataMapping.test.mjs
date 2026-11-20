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
    "Yes, Peanuts"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.PHYSICIAN_CREDENTIALS],
    "Dr Smith, 1112223334"
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
