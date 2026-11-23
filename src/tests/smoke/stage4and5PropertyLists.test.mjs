// Stages 4 and 5 (BUILD-PLAN.md section 12): the HubSpot properties the workers ask for after the
// mapper rows. The lists live in src/mappings/client/clientProperties.mjs and
// src/mappings/employees/employeeProperties.mjs. Every name below is a HubSpot source named in
// BUILD-PLAN section 9 for the requirement in the test title. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { CASE_PROPERTIES, caseRequestProperties } from "../../mappings/client/clientProperties.mjs";
import {
  BCBA_PROPERTIES,
  BT_RBT_PROPERTIES,
  employeeRequestProperties,
  knownMetadataFieldIds
} from "../../mappings/employees/employeeProperties.mjs";

const sorted = (values) => [...values].sort();

// --- Case ---

const CASE_MAPPED = [
  // C2, C3, C4, C6, C7
  "phi_first_name__cloned_",
  "phi_last_name",
  "phi_date_of_birth",
  "phi_gender",
  "email",
  "guardian_first_name",
  "guardian_last_name",
  // C8 (4.1)
  "street_address",
  "home_apt",
  "location_city",
  "stateregion",
  "postal_code",
  "phone",
  // CL1 to CL4 (4.19 to 4.21)
  "location",
  "specific_home_location",
  "case_status",
  "staffing_status",
  // C12 (4.15)
  "ongoing_central_reach_provider_supplier",
  // C17 (4.4), C19 (4.5), C20 (4.6), C22 (4.7), C23 (4.8)
  "work_schedule_details",
  "btrbt_work_schedule_2_details",
  "finalized_client_service_hours_post_assessment",
  "client_service_hours_total",
  "hours_bt_work_schedule_1",
  "bt_rbt_2_work_schedule",
  "initial_auth_tracks",
  "n97153_approved_assessment_hours_auth_req",
  "ia_hours_from_the_ia",
  "ongoing_auth_period_start_date",
  "ongoing_autrh_period_end_date",
  // C24 (4.13), C25 (4.22)
  "full_home_address",
  "service__street_address",
  "service__apt",
  "service__city",
  "service__postal_code",
  "service_address__other",
  // C26 (4.9), C27 (4.2), C28 (4.3)
  "allergies",
  "allergies__yes__explain",
  "does_your_child_have_any_other_comorbid_diagnoses_",
  "maladaptive_behaviors__parentguardian",
  "severity_level_clinical",
  "important_information",
  // C29, C30 (4.10)
  "insurance_primary",
  "insurance_1__other__summary",
  "insurance_id_1",
  "insurance_2",
  "insurance_2__other__summary",
  "insurance_id_2",
  // C31 (4.23), C32, C33, C36 (4.11), C34 (4.12), C35
  "n1_what_type_of_insurance",
  "physician_name",
  "npi_number",
  "physician_name__commercial",
  "npi_number__commercial",
  "referring_provider_medicaid_id",
  "phi_diagnosis",
  "diagnosis_other",
  "most_recent_asd_diagnosis_date_1",
  "most_recent_asd_diagnosis_date_medicaid",
  "policy_holder_name",
  "phi__policy_holder_dob",
  "referral_source",
  // C10 (4.16)
  "care_coordinator_name"
];

test("[BR5][4.17] the Case mapped list holds exactly the HubSpot sources of the built Case requirements", () => {
  assert.deepEqual(sorted(CASE_PROPERTIES.mapped), sorted(CASE_MAPPED));
});

test("[C38][4.17] insurance_id_3 and insurance_id_4 are no longer requested", () => {
  const requested = caseRequestProperties();
  assert.equal(requested.includes("insurance_id_3"), false);
  assert.equal(requested.includes("insurance_id_4"), false);
});

test("[C8][4.17] the misspelled alternate-address property and location_central_reach are no longer requested", () => {
  const requested = caseRequestProperties();
  assert.equal(
    requested.includes("if_services_will_be_in_more_than_one_location__list_the_other_addres"),
    false
  );
  assert.equal(requested.includes("location_central_reach"), false);
});

test("[C8][4.17] phone_number__second_ is no longer requested (decision 36: the property does not exist in production)", () => {
  assert.equal(caseRequestProperties().includes("phone_number__second_"), false);
});

test("[BR5][4.17] every property a Stage 4 row replaced is no longer requested", () => {
  const replaced = [
    "maladaptive_behaviors__clinical",
    "comorbid_diagnosis__clinical",
    "bt_work_schedule_confirmed",
    "bt_work_schedule_2_confirmed",
    "client_availability_completed",
    "assigned_hours",
    "authorized_hours",
    "auth_start_date",
    "auth_end_date",
    "most_recent_asd_diagnosis_date_2",
    "n2_what_type_of_insurance",
    "supervising_bcba",
    "initial_assessment_bcba"
  ];
  const requested = caseRequestProperties();
  for (const property of replaced) {
    assert.equal(requested.includes(property), false, `${property} is not requested`);
  }
});

test("[C18][4.4] the Location #2 schedule variants are not requested while C18 is open", () => {
  const requested = caseRequestProperties();
  assert.equal(requested.includes("work_schedule_1_details__for_location_2_other"), false);
  assert.equal(requested.includes("work_schedule_2_details__for_location_2_other"), false);
});

test("[C20][4.6] Total Assigned Hours requests the two hours; total_hours_btrbt_12 and total_hours_bt1bt2_work_schedule are not requested", () => {
  const requested = caseRequestProperties();
  assert.equal(CASE_PROPERTIES.mapped.includes("hours_bt_work_schedule_1"), true);
  assert.equal(CASE_PROPERTIES.mapped.includes("bt_rbt_2_work_schedule"), true);
  assert.equal(requested.includes("total_hours_btrbt_12"), false);
  assert.equal(requested.includes("total_hours_bt1bt2_work_schedule"), false);
});

test("[C21][4.6] hours_bt_work_schedule_2 is not requested while C21 is open", () => {
  const requested = caseRequestProperties();
  assert.equal(requested.includes("hours_bt_work_schedule_2"), false);
});

test("[BR18][4.14] the five staffing-name signals are change signals only: current_primary_bt and current_primary_bt_2 moved out of mapped", () => {
  const signals = [
    "supervising_bcba_name",
    "ia_bcba_name",
    "reassessment_bcba_name",
    "current_primary_bt",
    "current_primary_bt_2"
  ];
  for (const property of signals) {
    assert.equal(CASE_PROPERTIES.signalOnly.includes(property), true, `${property} is a signal`);
    assert.equal(CASE_PROPERTIES.mapped.includes(property), false, `${property} is not mapped`);
  }
});

test("[C10][4.16] care_coordinator_name is a mapped property; hubspot_owner_id and care_coordinator_email are not requested (decision 39)", () => {
  const requested = caseRequestProperties();
  assert.equal(CASE_PROPERTIES.mapped.includes("care_coordinator_name"), true);
  assert.equal(requested.includes("hubspot_owner_id"), false);
  assert.equal(requested.includes("care_coordinator_email"), false);
});

test("[BR13][4.17] the Case mustTrigger and system lists are unchanged, and no property sits in two lists", () => {
  assert.deepEqual([...CASE_PROPERTIES.mustTrigger], ["enter_in_central_reach"]);
  assert.deepEqual(
    sorted(CASE_PROPERTIES.system),
    sorted([
      "hs_object_id",
      "hs_lastmodifieddate",
      "test_record",
      "integration_last_write",
      "updated_by_integration",
      "last_sync_hash",
      "last_sync_at",
      "last_sync_status",
      "last_sync_error",
      "central_reach_link_to_client"
    ])
  );
  const all = caseRequestProperties();
  assert.equal(new Set(all).size, all.length);
});

// --- BT/RBT ---

const BT_RBT_MAPPED = [
  // T2
  "workday_id",
  "first_name",
  "last_name",
  "date_of_birth",
  "email",
  // T3
  "gender",
  // T4, T5 (5.9)
  "street_home",
  "home_apt",
  "location_city",
  "state_home",
  "postal_code_home",
  "employee_phone",
  // TL1, TL3, T1 (5.11 to 5.13)
  "location",
  "bt_rbt_type",
  // T6 (5.10), T7
  "street_address__work_",
  "apartment__work",
  "city__work_",
  "state__work_",
  "postal_code__work_",
  "active_cases_count"
];

test("[T4][5.9] the BT/RBT mapped list holds exactly the HubSpot sources of the built BT/RBT requirements", () => {
  assert.deepEqual(sorted(BT_RBT_PROPERTIES.mapped), sorted(BT_RBT_MAPPED));
});

test("[T4][5.9] location_home and postal_code are no longer requested for a BT/RBT", () => {
  const requested = employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BT_RBT);
  assert.equal(requested.includes("location_home"), false);
  assert.equal(requested.includes("postal_code"), false);
});

test("[T2][5.3] bt_name is no longer requested: the name comes from first_name and last_name", () => {
  assert.equal(employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BT_RBT).includes("bt_name"), false);
});

test("[TL3][5.12] bt_to_rbt_path is not requested: it has no effect on labels", () => {
  assert.equal(employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BT_RBT).includes("bt_to_rbt_path"), false);
});

// --- BCBA ---

const BCBA_MAPPED = [
  // B2 to B5
  "workday_id",
  "first_name",
  "last_name",
  // B5 (decision 48): dob, pending United Care's confirmation (O-10)
  "dob",
  // B6 (5.1)
  "gender_new",
  // B7 (5.2)
  "address",
  "apartment__home",
  "city_home",
  "state_home",
  "postal_code_home",
  "employee_phone",
  // B8
  "medicaid_id__ny",
  "medicaid_id__nj",
  "medicaid_id__co",
  // B4 (decision 49) primaryEmail
  "email",
  // B9 (row 6.4, decision 50) Meta 138069
  "personal_email",
  // BL2 (5.4), BL4 (5.5), BL5 (5.6), B10 (5.7), BL7 (5.8)
  "location",
  "assign_states",
  "lba_licensure__ny",
  "ny_insurance_labels",
  "work_status",
  "cr_billing_hold_label"
];

test("[B7][5.2] the BCBA mapped list holds exactly the HubSpot sources of the built BCBA requirements", () => {
  assert.deepEqual(sorted(BCBA_PROPERTIES.mapped), sorted(BCBA_MAPPED));
});

test("[B7][5.2] home_apt, city_work and home_state are no longer requested for a BCBA", () => {
  const requested = employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA);
  for (const property of ["home_apt", "city_work", "home_state"]) {
    assert.equal(requested.includes(property), false, `${property} is not requested`);
  }
});

test("[B13][5.3] credentialed_insurances__ny, work_email and bcba_name are no longer requested for a BCBA", () => {
  const requested = employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA);
  for (const property of ["credentialed_insurances__ny", "work_email", "bcba_name"]) {
    assert.equal(requested.includes(property), false, `${property} is not requested`);
  }
});

test("[B4][1.3] ucaba_email_address and date_of_birth are no longer requested for a BCBA (decisions 49 and 48)", () => {
  const requested = employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA);
  for (const property of ["ucaba_email_address", "date_of_birth"]) {
    assert.equal(requested.includes(property), false, `${property} is not requested`);
  }
  assert.equal(requested.includes("dob"), true);
  assert.equal(requested.includes("email"), true);
});

test("[B13][5.3] field 134444 is not a known BCBA metadata field, so no clear is sent for it", () => {
  assert.deepEqual(
    knownMetadataFieldIds(HUBSPOT_EMPLOYEE_TYPES.BCBA),
    [138069, 126216, 138112, 138113, 138703]
  );
  assert.deepEqual(knownMetadataFieldIds(HUBSPOT_EMPLOYEE_TYPES.BT_RBT), [133819, 147882, 138703]);
});

test("[B6][5.1] the archived BCBA gender property is not requested; gender_new is", () => {
  const requested = employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA);
  assert.equal(requested.includes("gender"), false);
  assert.equal(requested.includes("gender_new"), true);
});

test("[BL6][5.6] co_insurance_labels and nj_insurance_labels are not requested: those credential labels are not built", () => {
  const requested = employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA);
  assert.equal(requested.includes("co_insurance_labels"), false);
  assert.equal(requested.includes("nj_insurance_labels"), false);
});

test("[B11][5.7] hubspot_owner_id is not requested for a BCBA while the Care Coordinator target is open", () => {
  assert.equal(employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA).includes("hubspot_owner_id"), false);
});

// --- Both employee objects ---

test("[BR10][5.3] the employee mustTrigger, signalOnly and system lists are unchanged, and no property sits in two lists", () => {
  assert.deepEqual(sorted(BT_RBT_PROPERTIES.mustTrigger), ["btrbt_in_cr_checklist", "entered_in_centralreach"]);
  assert.deepEqual(sorted(BCBA_PROPERTIES.mustTrigger), ["bcba_in_cr_checklist", "entered_in_centralreach"]);
  assert.deepEqual([...BT_RBT_PROPERTIES.signalOnly], []);
  assert.deepEqual([...BCBA_PROPERTIES.signalOnly], []);
  const shared = [
    "hs_object_id",
    "employee_id",
    "hs_lastmodifieddate",
    "updated_by_integration",
    "integration_last_write",
    "last_sync_hash",
    "last_sync_at",
    "last_sync_status",
    "last_sync_error",
    "test_record"
  ];
  assert.deepEqual(sorted(BT_RBT_PROPERTIES.system), sorted([...shared, "central_reach_link_to_rt_rbt"]));
  assert.deepEqual(sorted(BCBA_PROPERTIES.system), sorted([...shared, "central_reach_record_link"]));
  for (const employeeType of [HUBSPOT_EMPLOYEE_TYPES.BT_RBT, HUBSPOT_EMPLOYEE_TYPES.BCBA]) {
    const all = employeeRequestProperties(employeeType);
    assert.equal(new Set(all).size, all.length, employeeType);
  }
});

test("[B2][5.3] the ID properties the guide says never to read (external_system_id and the Workday entry properties) are in no employee request", () => {
  const never = [
    "external_system_id",
    "entered_in_workday",
    "entered_in_ucaba_payroll_system",
    "entered_in_workday_by"
  ];
  for (const employeeType of [HUBSPOT_EMPLOYEE_TYPES.BT_RBT, HUBSPOT_EMPLOYEE_TYPES.BCBA]) {
    const requested = employeeRequestProperties(employeeType);
    for (const property of never) {
      assert.equal(requested.includes(property), false, `${employeeType} ${property}`);
    }
  }
});
