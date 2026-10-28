import test from "node:test";
import assert from "node:assert/strict";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import {
  CENTRAL_REACH_CLIENT_LABELS,
  CENTRAL_REACH_CLIENT_METADATA_FIELDS
} from "../../constants/centralReach.mjs";

test("buildClientMetadata maps metadata values and required labels", () => {
  const mapped = buildClientMetadata({
    deal: {
      properties: {
        hs_object_id: "777",
        location_central_reach: "NY",
        allergies: "Peanuts",
        physician_name: "Dr Smith",
        npi_number: "1112223334",
        n1_what_type_of_insurance: "medicaid ffs",
        auth_start_date: "2026-01-01",
        auth_end_date: "2026-03-31",
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
  assert.equal(
    Object.hasOwn(
      mapped.metadataValues,
      String(CENTRAL_REACH_CLIENT_METADATA_FIELDS.MALADAPTIVE_BEHAVIORS)
    ),
    false
  );
});

test("client metadata prefers guide fields and parent maladaptive behaviors", () => {
  const mapped = buildClientMetadata({
    deal: {
      properties: {
        hs_object_id: "778",
        location_central_reach: "New Jersey",
        case_status: "Warm",
        specific_home_location: "Child's House",
        staffing_status: "Staffed",
        maladaptive_behaviors__clinical: "clinical should not map",
        maladaptive_behaviors__parentguardian: "Aggression;Elopement",
        allergies: "Yes (Confirmed)",
        allergies__yes__explain: "Peanuts",
        work_schedule_details: "Mon 9-12",
        work_schedule_1_details__for_location_2_other: "Wed 1-3",
        bt_work_schedule_confirmed: "old schedule",
        finalized_client_service_hours_post_assessment: "After school",
        client_service_hours_total: "12",
        client_availability_completed: "old availability",
        assigned_hours: "4",
        initial_auth_tracks: "Prior Authorization Required",
        n97153_approved_assessment_hours_auth_req: "20",
        ia_hours_from_the_ia: "8",
        authorized_hours: "1",
        phi_diagnosis: "Yes",
        diagnosis_other: "note",
        insurance_2: "Other",
        insurance_2__other__summary: "Local Plan",
        insurance_id_2: "SEC-9",
        referring_provider_medicaid_id: "MD-44",
        important_information: "Ring the bell",
        referral_source: "School",
        full_home_address: "10 Home St",
        service_address__other: "20 Other St",
        ongoing_central_reach_provider_supplier: "Billing BCBA",
        supervising_bcba: "Rollup BCBA"
      }
    }
  });

  assert.deepEqual(mapped.labelIds, [
    CENTRAL_REACH_CLIENT_LABELS.ALL_CLIENTS,
    CENTRAL_REACH_CLIENT_LABELS.NJ_CLIENT,
    CENTRAL_REACH_CLIENT_LABELS.ACTIVE_CLIENT,
    CENTRAL_REACH_CLIENT_LABELS.HOME
  ]);
  assert.equal(mapped.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.CO_CLIENT), false);
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.MALADAPTIVE_BEHAVIORS],
    "Aggression, Elopement"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.ALLERGIES],
    "Yes (Confirmed), Peanuts"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.WORK_SCHEDULE_1],
    "Mon 9-12; Wed 1-3"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.CLIENT_AVAILABILITY],
    "After school"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.TOTAL_ASSIGNED_HOURS],
    "12"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.APPROVED_AUTH_HOURS],
    "20"
  );
  assert.equal(mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.DIAGNOSIS], "Yes, note");
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE],
    "Local Plan"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE_ID],
    "SEC-9"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRING_PHYSICIAN_MEDICAID_ID],
    "MD-44"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.IMPORTANT_INFORMATION_PARENT],
    "Ring the bell"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRAL_SOURCE],
    "School"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS],
    "10 Home St"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS_2],
    null
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.SUPERVISING_BCBA],
    "Billing BCBA"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.REASSESSMENT_BCBA],
    null
  );
});

test("cold case and no-auth hours use the matching label and hour field", () => {
  const mapped = buildClientMetadata({
    deal: {
      properties: {
        location_central_reach: "Colorado",
        case_status: "Cold",
        specific_home_location: "More Than One Location",
        initial_auth_tracks: "No Prior Authorization Required",
        ia_hours_from_the_ia: "6",
        n97153_approved_assessment_hours_auth_req: "30",
        full_home_address: "1 Main",
        service_address__other: "2 Clinic"
      }
    }
  });

  assert.equal(mapped.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.CO_CLIENT), true);
  assert.equal(CENTRAL_REACH_CLIENT_LABELS.CO_CLIENT, 1132648);
  assert.equal(mapped.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.INACTIVE_CLIENT), true);
  assert.equal(mapped.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.HOME), true);
  assert.equal(mapped.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.ACTIVE_CLIENT), false);
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.APPROVED_AUTH_HOURS],
    "6"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS],
    "1 Main"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS_2],
    "2 Clinic"
  );
});

test("client metadata writes reassessment BCBA and prefers guide auth and hours", () => {
  const mapped = buildClientMetadata({
    deal: {
      properties: {
        reassessment_bcba_name: "Riley Chen",
        total_hours_bt1bt2_work_schedule: "18",
        client_service_hours_total: "12",
        ongoing_auth_period_start_date: "2026-04-01",
        ongoing_autrh_period_end_date: "2026-09-30",
        auth_start_date: "2026-01-01",
        auth_end_date: "2026-03-31"
      }
    }
  });

  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.REASSESSMENT_BCBA],
    "Riley Chen"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.TOTAL_ASSIGNED_HOURS],
    "18"
  );
  assert.equal(
    mapped.metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.AUTH_PERIOD],
    "04/01/2026 - 09/30/2026"
  );
});

test("funding labels follow insurance_primary and location", () => {
  const aetnaNy = buildClientMetadata({
    deal: { properties: { location: "New York", insurance_primary: "Aetna" } }
  });
  const cignaCo = buildClientMetadata({
    deal: { properties: { location: "Colorado", insurance_primary: "Cigna" } }
  });
  const medicaidNj = buildClientMetadata({
    deal: { properties: { location: "New Jersey", insurance_primary: "Medicaid FFS" } }
  });
  const carelon = buildClientMetadata({
    deal: { properties: { location: "New York", insurance_primary: "Beacon-Carelon" } }
  });
  const aetnaNj = buildClientMetadata({
    deal: { properties: { location: "New Jersey", insurance_primary: "Aetna" } }
  });

  assert.equal(aetnaNy.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.AETNA_NY), true);
  assert.equal(cignaCo.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.CIGNA_COLORADO), true);
  assert.equal(medicaidNj.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.MEDICAID_NJ), true);
  assert.equal(carelon.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.CARELON), true);
  assert.equal(carelon.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.AETNA_NY), false);
  assert.equal(aetnaNj.labelIds.includes(CENTRAL_REACH_CLIENT_LABELS.AETNA_NY), false);
});
