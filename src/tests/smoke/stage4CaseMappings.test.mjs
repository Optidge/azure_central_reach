// Stage 4, mapper rows (BUILD-PLAN.md section 12): Case -> CentralReach client fields.
// Each test names the section 9 requirement it proves, then the plan row. The inputs are the
// HubSpot stored values of the guide (guide-extract-2026-11-20.md: [GER-CASE], section 3 and the
// appendix) and of BUILD-PLAN row 4.23 (the six stored values of n1_what_type_of_insurance).
// The real mappers are called with plain records. Nothing is faked and nothing is sent.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_METADATA_FIELD_TYPES } from "../../constants/centralReach.mjs";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import { buildClientPayload } from "../../mappings/client/buildClientPayload.mjs";

const PORTAL = "52311591";

function mapCase(properties, inputs = {}) {
  return buildClientMetadata({
    deal: { id: "9001", properties: { hs_object_id: "9001", ...properties } },
    portalId: PORTAL,
    ...inputs
  });
}

const meta = (properties, inputs) => mapCase(properties, inputs).metadataValues;
const has = (values, fieldId) => Object.prototype.hasOwnProperty.call(values, fieldId);

function payload(properties) {
  return buildClientPayload({ deal: { id: "9001", properties: { hs_object_id: "9001", ...properties } } });
}

// --- 4.1, C8: mailing address and phone ---

test("[C8][4.1] address line 1 is street_address only, never the alternate-address property", () => {
  const both = payload({
    street_address: "123 Main St",
    if_services_will_be_in_more_than_one_location__list_the_other_addres: "9 Other Rd"
  });
  assert.equal(both.AddressLine1, "123 Main St");

  const alternateOnly = payload({
    if_services_will_be_in_more_than_one_location__list_the_other_addres: "9 Other Rd"
  });
  assert.equal(alternateOnly.AddressLine1, null);
});

test("[C8][4.1] the state comes from stateregion, not from location or location_central_reach", () => {
  const mapped = payload({
    stateregion: "New Jersey",
    location: "New York",
    location_central_reach: "Colorado"
  });
  assert.equal(mapped.StateProvince, "NJ");

  const blankState = payload({ location: "New York", location_central_reach: "Colorado" });
  assert.equal(blankState.StateProvince, null);
});

test("[C8][4.1] line 2, city, zip and cell phone read home_apt, location_city, postal_code and phone", () => {
  const mapped = payload({
    street_address: "123 Main St",
    home_apt: "1E",
    location_city: "Albany",
    stateregion: "New York",
    postal_code: "12207",
    phone: "212-555-0101"
  });
  assert.equal(mapped.AddressLine2, "1E");
  assert.equal(mapped.City, "Albany");
  assert.equal(mapped.StateProvince, "NY");
  assert.equal(mapped.ZipPostalCode, "12207");
  assert.equal(mapped.PhoneCell, "2125550101");
});

test("[C8][4.1] the client payload has no PhoneHome key, and phone_number__second_ is not read (decision 36)", () => {
  const mapped = payload({ phone: "212-555-0101", phone_number__second_: "212-555-0102" });
  assert.equal(Object.prototype.hasOwnProperty.call(mapped, "PhoneHome"), false);
  assert.equal(mapped.PhoneCell, "2125550101");
  assert.equal(JSON.stringify(mapped).includes("2125550102"), false);
});

// --- 4.2, C27: Comorbid and Maladaptive, main fields only ---

test("[C27][4.2] Comorbid Diagnosis reads does_your_child_have_any_other_comorbid_diagnoses_, never the clinical property", () => {
  const values = meta({
    does_your_child_have_any_other_comorbid_diagnoses_: "ADHD",
    comorbid_diagnosis__clinical: "Clinical note"
  });
  assert.equal(values[132303], "ADHD");
  assert.equal(meta({ comorbid_diagnosis__clinical: "Clinical note" })[132303], null);
});

test("[C27][4.2] Maladaptive Behaviors sends the stored options of maladaptive_behaviors__parentguardian, never the clinical property", () => {
  // Appendix stored values, as HubSpot stores a multi-checkbox: options joined by ";".
  const stored = "Aggression;Self-Injury;Mouthing Non Food Itemsth";
  const values = meta({
    maladaptive_behaviors__parentguardian: stored,
    maladaptive_behaviors__clinical: "Clinical note"
  });
  assert.equal(values[126207], stored);
  assert.equal(meta({ maladaptive_behaviors__clinical: "Clinical note" })[126207], null);
});

// --- 4.3, C28: severity and the parent notes ---

test("[C28][4.3] Important information - Parent reads important_information into field 138378, and Severity Level stays", () => {
  const values = meta({ important_information: "Dog in the home", severity_level_clinical: "Level 2" });
  assert.equal(values[138378], "Dog in the home");
  assert.equal(values[133826], "Level 2");
  assert.equal(meta({})[138378], null);
});

// --- 4.4, C17: work schedules ---

test("[C17][4.4] Work Schedule #1 and #2 read work_schedule_details and btrbt_work_schedule_2_details", () => {
  const values = meta({
    work_schedule_details: "Mon-Fri 3-6",
    btrbt_work_schedule_2_details: "Sat 9-12",
    bt_work_schedule_confirmed: "old 1",
    bt_work_schedule_2_confirmed: "old 2"
  });
  assert.equal(values[132304], "Mon-Fri 3-6");
  assert.equal(values[138093], "Sat 9-12");
});

test("[C17][4.4] the old schedule properties and the Location #2 variants (C18, open) are not sent", () => {
  const values = meta({
    bt_work_schedule_confirmed: "old 1",
    bt_work_schedule_2_confirmed: "old 2",
    work_schedule_1_details__for_location_2_other: "Location 2, schedule 1",
    work_schedule_2_details__for_location_2_other: "Location 2, schedule 2"
  });
  assert.equal(values[132304], null);
  assert.equal(values[138093], null);
});

// --- 4.5, C19: Client Availability ---

test("[C19][4.5] Client Availability is the text, then the weekly hours when filled", () => {
  assert.equal(
    meta({
      finalized_client_service_hours_post_assessment: "Weekdays after 3 PM",
      client_service_hours_total: "15"
    })[126209],
    "Weekdays after 3 PM, 15"
  );
  assert.equal(
    meta({ finalized_client_service_hours_post_assessment: "Weekdays after 3 PM" })[126209],
    "Weekdays after 3 PM"
  );
  assert.equal(meta({ client_service_hours_total: 15 })[126209], "15");
});

test("[C19][4.5] Client Availability is blank when both sources are blank, and client_availability_completed is not read", () => {
  assert.equal(meta({ client_availability_completed: "old" })[126209], null);
});

// --- 4.6, C20: Total Assigned Hours ---

const hours = (bt1, bt2) => meta({ hours_bt_work_schedule_1: bt1, bt_rbt_2_work_schedule: bt2 })[134331];

test("[C20][4.6] Total Assigned Hours is the sum of hours_bt_work_schedule_1 and bt_rbt_2_work_schedule (9 + 7 = 16)", () => {
  assert.equal(hours("9", "7"), "16");
});

test("[C20][4.6] Total Assigned Hours with only one input filled counts the blank one as 0", () => {
  assert.equal(hours("9", null), "9");
  assert.equal(hours("", "7"), "7");
});

test("[C20][4.6] Total Assigned Hours with both inputs blank is a real blank: field 134331 is there with null, not 0", () => {
  for (const blank of [null, "", undefined]) {
    const values = meta({ hours_bt_work_schedule_1: blank, bt_rbt_2_work_schedule: blank });
    assert.equal(has(values, 134331), true);
    assert.equal(values[134331], null);
  }
});

test("[C20][4.6] Total Assigned Hours sums decimals without floating point noise (7.5 + 8.1 = 15.6)", () => {
  assert.equal(hours("7.5", "8.1"), "15.6");
  assert.equal(hours("0.1", "0.2"), "0.3");
});

test("[C20][4.6] Total Assigned Hours ignores total_hours_btrbt_12 and the other totals", () => {
  const values = meta({
    total_hours_btrbt_12: "99",
    total_hours_bt1bt2_work_schedule: "1",
    total_hours_bt_12_work_schedule: "2",
    assigned_hours: "3"
  });
  assert.equal(values[134331], null);
  assert.equal(hours("9", "7"), "16");
});

test("[C20][4.6] a filled hours input that is not a number leaves field 134331 out and is reported, so the worker ends the run as an error", () => {
  const mapped = mapCase({ hours_bt_work_schedule_1: "abc", bt_rbt_2_work_schedule: "7" });
  assert.equal(has(mapped.metadataValues, 134331), false);
  // F-1: an unreadable value, not an unreadable date.
  assert.deepEqual(mapped.unreadableValueProperties, ["hours_bt_work_schedule_1"]);
  assert.deepEqual(mapped.unreadableDateProperties, []);
});

// --- 4.7, C22: Approved Auth Hours ---

const AUTH_HOURS = {
  n97153_approved_assessment_hours_auth_req: "20",
  ia_hours_from_the_ia: "12",
  authorized_hours: "99"
};

test("[C22][4.7] Prior Authorization Required reads n97153_approved_assessment_hours_auth_req", () => {
  assert.equal(meta({ ...AUTH_HOURS, initial_auth_tracks: "Prior Authorization Required" })[132431], "20");
});

test("[C22][4.7] No Prior Authorization Required reads ia_hours_from_the_ia", () => {
  assert.equal(meta({ ...AUTH_HOURS, initial_auth_tracks: "No Prior Authorization Required" })[132431], "12");
});

test("[C22][4.7] Approved Auth Hours is blank when initial_auth_tracks is blank or another value; authorized_hours is not read", () => {
  assert.equal(meta({ ...AUTH_HOURS })[132431], null);
  assert.equal(meta({ ...AUTH_HOURS, initial_auth_tracks: "" })[132431], null);
  assert.equal(meta({ ...AUTH_HOURS, initial_auth_tracks: "Something else" })[132431], null);
});

// --- 4.8, C23: Auth Period ---

test("[C23][4.8] Auth Period is \"start - end\" as MM/DD/YYYY from ongoing_auth_period_start_date and ongoing_autrh_period_end_date", () => {
  const values = meta({
    ongoing_auth_period_start_date: "2026-01-01",
    ongoing_autrh_period_end_date: "2026-03-31"
  });
  assert.equal(values[134672], "01/01/2026 - 03/31/2026");
});

test("[C23][4.8] Auth Period never reads auth_start_date, auth_end_date or the _f copies", () => {
  const values = meta({
    auth_start_date: "2026-01-01",
    auth_end_date: "2026-03-31",
    ongoing_auth_period_start_date_f: "2026-04-01",
    ongoing_autrh_period_end_date_f: "2026-06-30"
  });
  assert.equal(values[134672], null);
});

// --- 4.9, C26: Known Allergies ---

test("[C26][4.9] allergies Confirmed sends \"Yes\" plus the explanation", () => {
  assert.equal(
    meta({ allergies: "Confirmed", allergies__yes__explain: "Peanuts and tree nuts" })[126214],
    "Yes, Peanuts and tree nuts"
  );
  assert.equal(meta({ allergies: "Confirmed" })[126214], "Yes");
});

test("[C26][4.9] allergies Denial sends \"No\", without the explanation", () => {
  assert.equal(meta({ allergies: "Denial" })[126214], "No");
  assert.equal(meta({ allergies: "Denial", allergies__yes__explain: "left over" })[126214], "No");
});

test("[C26][4.9] Known Allergies is blank when allergies is blank or not a stored option", () => {
  assert.equal(meta({})[126214], null);
  assert.equal(meta({ allergies__yes__explain: "Peanuts" })[126214], null);
  assert.equal(meta({ allergies: "Peanuts" })[126214], null);
});

// --- 4.10, C30: secondary insurance ---

test("[C30][4.10] Secondary Insurance reads insurance_2 into field 144600 and insurance_id_2 into field 144601", () => {
  const values = meta({ insurance_2: "Aetna", insurance_id_2: "SEC-123" });
  assert.equal(values[144600], "Aetna");
  assert.equal(values[144601], "SEC-123");
});

test("[C30][4.10] Secondary Insurance uses insurance_2__other__summary when insurance_2 is Other", () => {
  assert.equal(
    meta({ insurance_2: "Other", insurance_2__other__summary: "Regional Plan" })[144600],
    "Regional Plan"
  );
});

test("[C30][4.10] secondary insurance blank with an Other summary filled sends a blank Secondary Insurance (144600)", () => {
  assert.equal(meta({ insurance_2: "", insurance_2__other__summary: "Regional Plan" })[144600], null);
});

test("[C30][4.10] n2_what_type_of_insurance is never the secondary carrier", () => {
  const values = meta({ n2_what_type_of_insurance: "Commercial Enrolled" });
  assert.equal(values[144600], null);
  assert.equal(values[144601], null);
});

// --- 4.11, C32, C33, C36 ---

test("[C32][4.11] Referring Physician Medicaid ID reads referring_provider_medicaid_id into field 141233", () => {
  assert.equal(meta({ referring_provider_medicaid_id: "NY 0123456" })[141233], "NY 0123456");
  assert.equal(meta({})[141233], null);
});

test("[C33][4.11] phi_diagnosis Yes is written as the display text Yes-F84.0", () => {
  assert.equal(meta({ phi_diagnosis: "Yes" })[144793], "Yes-F84.0");
});

test("[C33][4.11] Diagnosis adds diagnosis_other when filled", () => {
  assert.equal(
    meta({ phi_diagnosis: "Yes", diagnosis_other: "F90.2" })[144793],
    "Yes-F84.0, F90.2"
  );
  assert.equal(meta({ diagnosis_other: "F90.2" })[144793], "F90.2");
  assert.equal(meta({})[144793], null);
});

test("[C36][4.11] Referral Source reads referral_source into field 126222", () => {
  assert.equal(meta({ referral_source: "Pediatrician" })[126222], "Pediatrician");
  assert.equal(meta({})[126222], null);
});

// --- 4.12, C34: both ASD dates, each to its own field ---

test("[C34][4.12] both ASD dates are sent, each to its own field, whatever the insurance type", () => {
  for (const insuranceType of ["Medicaid FFS", "Commercial Enrolled", "Unsure", ""]) {
    const values = meta({
      n1_what_type_of_insurance: insuranceType,
      most_recent_asd_diagnosis_date_1: "2024-05-06",
      most_recent_asd_diagnosis_date_medicaid: "2025-07-08"
    });
    assert.equal(values[131195], "05/06/2024", `general date, type "${insuranceType}"`);
    assert.equal(values[138701], "07/08/2025", `Medicaid date, type "${insuranceType}"`);
  }
});

test("[C34][4.12] most_recent_asd_diagnosis_date_2 is not read", () => {
  const values = meta({
    n2_what_type_of_insurance: "Commercial Enrolled",
    most_recent_asd_diagnosis_date_2: "2023-01-02"
  });
  assert.equal(values[131195], null);
  assert.equal(values[138701], null);
});

// --- 4.13, C24: Service Location Address ---

const SERVICE_ADDRESS = {
  full_home_address: "123 Main St, Apt 1E, Albany, NY 12207",
  service__street_address: "50 School Rd",
  service__apt: "Room 4",
  service__city: "Troy",
  service__postal_code: "12180",
  service_address__other: "50 School Rd, Room 4, Troy 12180"
};

test("[C24][4.13] specific_home_location Child's House sends full_home_address to field 137697", () => {
  assert.equal(
    meta({ ...SERVICE_ADDRESS, specific_home_location: "Child's House" })[137697],
    "123 Main St, Apt 1E, Albany, NY 12207"
  );
});

test("[C24][4.13] specific_home_location More Than One Location sends full_home_address to field 137697", () => {
  assert.equal(
    meta({ ...SERVICE_ADDRESS, specific_home_location: "More Than One Location" })[137697],
    "123 Main St, Apt 1E, Albany, NY 12207"
  );
});

test("[C24][4.13] specific_home_location Other Location sends the service address parts to field 137697", () => {
  assert.equal(
    meta({ ...SERVICE_ADDRESS, specific_home_location: "Other Location" })[137697],
    "50 School Rd, Room 4, Troy, 12180"
  );
});

test("[C24][4.13] Service Location Address is blank when specific_home_location is blank, and the field is a TextArea", () => {
  assert.equal(meta({ ...SERVICE_ADDRESS })[137697], null);
  assert.equal(CENTRAL_REACH_METADATA_FIELD_TYPES[137697], "TextArea");
});

// --- 4.22, C25: Service Location Address 2 ---

test("[C25][4.22] More Than One Location sends service_address__other to field 138091", () => {
  assert.equal(
    meta({ ...SERVICE_ADDRESS, specific_home_location: "More Than One Location" })[138091],
    "50 School Rd, Room 4, Troy 12180"
  );
});

test("[C25][4.22] Service Location Address 2 is blank for any other specific_home_location value", () => {
  for (const location of ["Child's House", "Other Location", ""]) {
    assert.equal(
      meta({ ...SERVICE_ADDRESS, specific_home_location: location })[138091],
      null,
      `location "${location}"`
    );
  }
});

// --- 4.14, mapper side (contract P.5 b): staff names are inputs ---

const NO_STAFF = { initialAssessmentBcba: [], reEvaluationBcba: [], primaryBt1: [], primaryBt2: [] };
const TEXT_STAFF_PROPERTIES = {
  initial_assessment_bcba: "Text IA",
  supervising_bcba: "Text Supervising",
  current_primary_bt: "Text BT 1",
  current_primary_bt_2: "Text BT 2"
};

test("[C11][4.14] IA BCBA and Reassessment BCBA are built from staffNames as \"First Last\", never from the text properties", () => {
  const values = meta(TEXT_STAFF_PROPERTIES, {
    staffNames: {
      ...NO_STAFF,
      initialAssessmentBcba: [{ recordId: "11", firstName: "Lee", lastName: "Roe" }],
      reEvaluationBcba: [{ recordId: "12", firstName: "Sam", lastName: "Poe" }]
    }
  });
  assert.equal(values[131314], "Lee Roe");
  assert.equal(values[144602], "Sam Poe");
});

test("[C14][4.14] Primary BT 1 and 2 names are built from staffNames, never from current_primary_bt or current_primary_bt_2", () => {
  const values = meta(TEXT_STAFF_PROPERTIES, {
    staffNames: {
      ...NO_STAFF,
      primaryBt1: [{ recordId: "21", firstName: "Pat", lastName: "Doe" }],
      primaryBt2: [{ recordId: "22", firstName: "Kim", lastName: "Vos" }]
    }
  });
  assert.equal(values[131313], "Pat Doe");
  assert.equal(values[138092], "Kim Vos");
});

test("[C14][4.14] several staff in one role are joined by \", \" in record-ID order", () => {
  const values = meta(
    {},
    {
      staffNames: {
        ...NO_STAFF,
        primaryBt1: [
          { recordId: "200", firstName: "Zed", lastName: "Last" },
          { recordId: "30", firstName: "Amy", lastName: "First" },
          { recordId: "1000", firstName: "Bo", lastName: "Third" }
        ]
      }
    }
  );
  assert.equal(values[131313], "Amy First, Zed Last, Bo Third");
});

test("[C11][4.14] a role nobody holds sends a blank field, with its key present", () => {
  const values = meta(TEXT_STAFF_PROPERTIES, { staffNames: NO_STAFF });
  for (const fieldId of [131314, 144602, 131313, 138092]) {
    assert.equal(has(values, fieldId), true, `field ${fieldId} is in the answer`);
    assert.equal(values[fieldId], null, `field ${fieldId} is blank`);
  }
});

test("[BR16][4.14] staffNames not passed at all leaves the four staff field keys out, so nothing is cleared", () => {
  const values = meta(TEXT_STAFF_PROPERTIES);
  for (const fieldId of [131314, 144602, 131313, 138092]) {
    assert.equal(has(values, fieldId), false, `field ${fieldId} is left out`);
  }
});

test("[BR16][4.14] a role missing from staffNames leaves only that role's field key out", () => {
  const values = meta(
    {},
    { staffNames: { initialAssessmentBcba: [{ recordId: "11", firstName: "Lee", lastName: "Roe" }] } }
  );
  assert.equal(values[131314], "Lee Roe");
  for (const fieldId of [144602, 131313, 138092]) {
    assert.equal(has(values, fieldId), false, `field ${fieldId} is left out`);
  }
});

// --- 4.15, C12: Supervising BCBA ---

test("[C12][4.15] Supervising BCBA is the typed text of ongoing_central_reach_provider_supplier, never supervising_bcba", () => {
  const values = meta({
    ongoing_central_reach_provider_supplier: "  Dana Supplier, BCBA ",
    supervising_bcba: "Text Supervising"
  });
  assert.equal(values[131308], "Dana Supplier, BCBA");
  assert.equal(meta({ supervising_bcba: "Text Supervising" })[131308], null);
});

// --- 4.16, C10: Care Coordinator (decision 39: the Case property care_coordinator_name) ---

test("[C10][4.16] Care Coordinator is the trimmed text of care_coordinator_name, in field 138851; hubspot_owner_id is not read", () => {
  assert.equal(meta({ care_coordinator_name: "  Casey Jordan " })[138851], "Casey Jordan");
  assert.equal(meta({ hubspot_owner_id: "77" })[138851], null);
});

test("[C10][4.16] a blank care_coordinator_name (null or \"\") sends a blank Care Coordinator, with its key present", () => {
  for (const blank of [null, ""]) {
    const values = meta({ care_coordinator_name: blank });
    assert.equal(has(values, 138851), true);
    assert.equal(values[138851], null);
  }
});

test("[BR16][4.16] field 138851 named in omitFieldIds is left out even when care_coordinator_name is filled", () => {
  const values = meta({ care_coordinator_name: "Casey Jordan" }, { omitFieldIds: [138851] });
  assert.equal(has(values, 138851), false);
});

// --- 4.23, C31: referring physician pair by insurance type (decision 32) ---

const PHYSICIANS = {
  physician_name: "Dr Medicaid",
  npi_number: "1112223334",
  physician_name__commercial: "Dr Commercial",
  npi_number__commercial: "5556667778"
};
const physicianFor = (insuranceType) =>
  meta({ ...PHYSICIANS, n1_what_type_of_insurance: insuranceType })[131151];

test("[C31][4.23] Medicaid FFS uses the Medicaid physician and NPI", () => {
  assert.equal(physicianFor("Medicaid FFS"), "Dr Medicaid, 1112223334");
});

test("[C31][4.23] Medicaid FFS - NJ uses the Medicaid physician and NPI", () => {
  assert.equal(physicianFor("Medicaid FFS - NJ"), "Dr Medicaid, 1112223334");
});

test("[C31][4.23] Medicaid FFS - CO uses the Medicaid physician and NPI", () => {
  assert.equal(physicianFor("Medicaid FFS - CO"), "Dr Medicaid, 1112223334");
});

test("[C31][4.23] Commercial Enrolled uses the commercial physician and NPI", () => {
  assert.equal(physicianFor("Commercial Enrolled"), "Dr Commercial, 5556667778");
});

test("[C31][4.23] Commercial OON uses the commercial physician and NPI", () => {
  assert.equal(physicianFor("Commercial OON"), "Dr Commercial, 5556667778");
});

test("[C31][4.23] Unsure sends a blank referring physician", () => {
  assert.equal(physicianFor("Unsure"), null);
});

test("[C31][4.23] a blank insurance type, or a value that is not one of the six, sends a blank referring physician", () => {
  assert.equal(physicianFor(""), null);
  assert.equal(meta({ ...PHYSICIANS })[131151], null);
  assert.equal(physicianFor("Medicaid"), null);
});

// --- The primary insurance row is unchanged (C29) ---

test("[C29][4.10] primary insurance and its ID are unchanged by the secondary mapping", () => {
  const values = meta({
    insurance_primary: "Other",
    insurance_1__other__summary: "Regional Plan",
    insurance_id_1: "ABC-123",
    insurance_2: "Aetna",
    insurance_id_2: "SEC-123"
  });
  assert.equal(values[126210], "Regional Plan");
  assert.equal(values[131316], "ABC-123");
});

test("[C29][4.10] primary insurance blank with an Other summary filled sends a blank Current Insurance (126210)", () => {
  assert.equal(meta({ insurance_primary: "", insurance_1__other__summary: "Regional Plan" })[126210], null);
});

// --- Review fix C-R1: rule 5.7 on the five Case metadata dates ---
// A filled date that cannot be read is never sent, never a blank and never a clear: the field's
// key is left out and the HubSpot property is named in unreadableDateProperties.

const BAD_DATES = ["2026-02-30", "5", "March 5", "not a date"];

test("[C23][4.8] rule 5.7: an unreadable Auth Period start or end leaves field 134672 out and names the property", () => {
  for (const bad of BAD_DATES) {
    const badStart = mapCase({
      ongoing_auth_period_start_date: bad,
      ongoing_autrh_period_end_date: "2026-03-31"
    });
    assert.equal(has(badStart.metadataValues, 134672), false, `start "${bad}"`);
    assert.deepEqual(badStart.unreadableDateProperties, ["ongoing_auth_period_start_date"]);

    const badEnd = mapCase({
      ongoing_auth_period_start_date: "2026-01-01",
      ongoing_autrh_period_end_date: bad
    });
    assert.equal(has(badEnd.metadataValues, 134672), false, `end "${bad}"`);
    assert.deepEqual(badEnd.unreadableDateProperties, ["ongoing_autrh_period_end_date"]);

    const both = mapCase({ ongoing_auth_period_start_date: bad, ongoing_autrh_period_end_date: bad });
    assert.equal(has(both.metadataValues, 134672), false, `both "${bad}"`);
    assert.deepEqual(both.unreadableDateProperties, [
      "ongoing_auth_period_start_date",
      "ongoing_autrh_period_end_date"
    ]);
  }
});

test("[C34][4.12] rule 5.7: an unreadable ASD date leaves only its own field out and names the property", () => {
  for (const bad of BAD_DATES) {
    const general = mapCase({
      most_recent_asd_diagnosis_date_1: bad,
      most_recent_asd_diagnosis_date_medicaid: "2025-07-08"
    });
    assert.equal(has(general.metadataValues, 131195), false, `general "${bad}"`);
    assert.equal(general.metadataValues[138701], "07/08/2025");
    assert.deepEqual(general.unreadableDateProperties, ["most_recent_asd_diagnosis_date_1"]);

    const medicaid = mapCase({
      most_recent_asd_diagnosis_date_1: "2024-05-06",
      most_recent_asd_diagnosis_date_medicaid: bad
    });
    assert.equal(has(medicaid.metadataValues, 138701), false, `Medicaid "${bad}"`);
    assert.equal(medicaid.metadataValues[131195], "05/06/2024");
    assert.deepEqual(medicaid.unreadableDateProperties, ["most_recent_asd_diagnosis_date_medicaid"]);
  }
});

test("[C35][rule 5.7] an unreadable Policy Holder DOB leaves field 137667 out and names the property", () => {
  for (const bad of BAD_DATES) {
    const mapped = mapCase({ phi__policy_holder_dob: bad, policy_holder_name: "Don Swanson" });
    assert.equal(has(mapped.metadataValues, 137667), false, `"${bad}"`);
    assert.equal(mapped.metadataValues[138090], "Don Swanson");
    assert.deepEqual(mapped.unreadableDateProperties, ["phi__policy_holder_dob"]);
  }
});

test("[C35][rule 5.7] a readable Policy Holder DOB is sent as MM/DD/YYYY, and a date-time is read by its date", () => {
  assert.equal(meta({ phi__policy_holder_dob: "1980-02-29" })[137667], "02/29/1980");
  assert.equal(meta({ phi__policy_holder_dob: "1980-02-29T00:00:00.000Z" })[137667], "02/29/1980");
});

test("[C23][4.8] rule 5.7: a blank date stays a blank with its key present, and unreadableDateProperties is an empty list", () => {
  const mapped = mapCase({
    ongoing_auth_period_start_date: "",
    ongoing_autrh_period_end_date: null,
    most_recent_asd_diagnosis_date_1: " ",
    phi__policy_holder_dob: ""
  });
  for (const fieldId of [134672, 131195, 138701, 137667]) {
    assert.equal(has(mapped.metadataValues, fieldId), true, `field ${fieldId} is in the answer`);
    assert.equal(mapped.metadataValues[fieldId], null, `field ${fieldId} is blank`);
  }
  assert.deepEqual(mapped.unreadableDateProperties, []);
  assert.deepEqual(
    mapCase({ ongoing_auth_period_start_date: "2026-01-01", ongoing_autrh_period_end_date: "2026-03-31" })
      .unreadableDateProperties,
    []
  );
});

// --- Review fix C-R6: inputs that are not what contract P.5 (b) and (c) say ---

test("[BR16][4.16] omitFieldIds null or undefined is an empty list, not a crash", () => {
  for (const omitFieldIds of [null, undefined]) {
    const values = meta(
      { referral_source: "Pediatrician", care_coordinator_name: "Casey Jordan" },
      { omitFieldIds }
    );
    assert.equal(values[126222], "Pediatrician");
    assert.equal(values[138851], "Casey Jordan");
  }
});

test("[BR16][4.14] a staff record with no readable name leaves that role's field out, with a warning that names the role and no value", () => {
  const mapped = mapCase(
    {},
    {
      staffNames: {
        ...NO_STAFF,
        initialAssessmentBcba: [{ recordId: "11", firstName: "Lee", lastName: "Roe" }],
        primaryBt1: [
          { recordId: "21", firstName: "Pat", lastName: "Doe" },
          { recordId: "22", firstName: " ", lastName: null }
        ],
        primaryBt2: [{ recordId: "23" }]
      }
    }
  );
  assert.equal(mapped.metadataValues[131314], "Lee Roe");
  assert.equal(mapped.metadataValues[144602], null);
  assert.equal(has(mapped.metadataValues, 131313), false);
  assert.equal(has(mapped.metadataValues, 138092), false);
  assert.deepEqual(
    mapped.warnings.map((warning) => [warning.code, warning.role]),
    [
      ["staff_name_unreadable", "primaryBt1"],
      ["staff_name_unreadable", "primaryBt2"]
    ]
  );
  const text = JSON.stringify(mapped.warnings);
  assert.equal(text.includes("Pat") || text.includes("Doe") || text.includes("21"), false);
});

test("[BR16][4.14] a staff record with only a first or only a last name is readable, and warnings is an empty list", () => {
  const mapped = mapCase(
    {},
    {
      staffNames: {
        ...NO_STAFF,
        primaryBt1: [{ recordId: "21", firstName: "Pat", lastName: "" }],
        primaryBt2: [{ recordId: "22", firstName: null, lastName: "Vos" }]
      }
    }
  );
  assert.equal(mapped.metadataValues[131313], "Pat");
  assert.equal(mapped.metadataValues[138092], "Vos");
  assert.deepEqual(mapped.warnings, []);
  assert.deepEqual(mapCase({}).warnings, []);
});
