export const CENTRAL_REACH_EMPLOYEE_TYPES = {
  BT_RBT: "BT_RBT",
  BCBA: "BCBA"
};

// Central Reach requires a date of birth to create an employee. Placeholder used only on a create
// when the HubSpot date of birth (BT/RBT date_of_birth, BCBA dob) is blank (Zeke, 2026-11-16).
// Temporary: pending a decision with Danny.
export const EMPLOYEE_CREATE_DEFAULT_DATE_OF_BIRTH = "2000-01-01";

export const CENTRAL_REACH_EMPLOYEE_LABELS = {
  ALL_EMPLOYEES: 1052618,
  BT_NY: 1052630,
  RBT_NY: 1052631,
  BCBA: 1130668,
  BCBA_LBA_NY: 1052629,
  CLINICAL: 1052643,
  NY_EMPLOYEE: 1132655,
  CO_EMPLOYEE: 1107687,
  RBT_CO: 1107692,
  NJ_EMPLOYEE: 1107686,
  // New Mexico and Virginia: no HubSpot value exists yet, so no mapping reads these two and they
  // are not managed (BL3, TL2; O-6).
  NM_EMPLOYEE: 1157030,
  VA_EMPLOYEE: 1157031,
  BT_NJ: 1132652,
  BT_CO: 1132650,
  RBT_NJ: 1132651,
  BCBA_COLORADO: 1124246,
  BCBA_LBA_NJ: 1124245,
  GRAD_STUDENT_LBA_NY: 1092164,
  NY_MEDICAID: 1107647,
  SALARIED: 1132653,
  BILLING_HOLD_MEDICAID_AFFILIATION: 1103437
};

export const CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS = {
  WORK_ADDRESS: 133819,
  ACTIVE_CASE_COUNT: 147882,
  HUBSPOT_LINK_TO_BT_RBT_RECORD: 138703,
  // Personal Email, type `input`; sent for both employee types from `personal_email` (B9, T9).
  PERSONAL_EMAIL: 138069,
  BCBA_MEDICAID_ID_NY: 126216,
  BCBA_MEDICAID_ID_NJ: 138112,
  BCBA_MEDICAID_ID_CO: 138113,
  // Field 134444 (Credentialed with Medicaid NY) is excluded by the guide and is not sent (B13).
  HUBSPOT_LINK_TO_BCBA_RECORD: 138703
};

export const CENTRAL_REACH_CLIENT_LABELS = {
  ALL_CLIENTS: 1052619,
  NY_CLIENT: 1082499,
  CO_CLIENT: 1132648,
  NJ_CLIENT: 1132647,
  HOME: 1052656,
  ACTIVE_CLIENT: 1125427,
  IN_ACTIVE_CLIENT: 1121488
};

// Parent label "Staffing Status" in Central Reach. The staffing labels sit under it. It is never
// sent and is not in the sendable list.
export const CENTRAL_REACH_STAFFING_STATUS_PARENT_LABEL_ID = 1156741;

// Client staffing labels, keyed by the HubSpot Case staffing_status stored value (the stored value
// equals the Central Reach label name). Guide [G19]: only these three are sent. Any other
// staffing_status value, or a blank one, gets no staffing label (BUILD-PLAN section 9, CL4).
// Ids from a live GET /contacts/labels (Zeke, 2026-11-18).
export const CENTRAL_REACH_CLIENT_STAFFING_LABELS = {
  "97151 Services": 1156743,
  "Staffed 97153": 1156746,
  "X 97153": 1156747
};

// Remove only: the three retired staffing labels. They are never sent. They are in the Case's
// managed list (row 4.21), so the label sender takes them off a client that still holds one.
export const CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS = Object.freeze([
  1156742, // Pending 97151 Services
  1156744, // Pending 97153 Services
  1156745 // Starting 97153 Services
]);

// The label IDs a mapper may send (BUILD-PLAN row P.3, rule 5.6): the base and managed labels of
// BUILD-PLAN section 9, and the New Mexico and Virginia Employee constants. The label sender
// (row L.1) posts no ID the integration adds unless it is in this list.
// The list is written out on purpose: adding a constant above does not make it sendable.
// Not in the list: the parent label Staffing Status, the remove-only IDs, and the BCBA credential
// labels the guide does not document (BL6: Aetna, Cigna, Carelon, CO Medicaid).
export const CENTRAL_REACH_SENDABLE_LABEL_IDS = Object.freeze([
  // Client, base (CL6)
  CENTRAL_REACH_CLIENT_LABELS.ALL_CLIENTS,
  // Client, managed: state (CL1), service location (CL2), Active / Inactive (CL3), staffing (CL4)
  CENTRAL_REACH_CLIENT_LABELS.NY_CLIENT,
  CENTRAL_REACH_CLIENT_LABELS.NJ_CLIENT,
  CENTRAL_REACH_CLIENT_LABELS.CO_CLIENT,
  CENTRAL_REACH_CLIENT_LABELS.HOME,
  CENTRAL_REACH_CLIENT_LABELS.ACTIVE_CLIENT,
  CENTRAL_REACH_CLIENT_LABELS.IN_ACTIVE_CLIENT,
  CENTRAL_REACH_CLIENT_STAFFING_LABELS["97151 Services"],
  CENTRAL_REACH_CLIENT_STAFFING_LABELS["Staffed 97153"],
  CENTRAL_REACH_CLIENT_STAFFING_LABELS["X 97153"],
  // Employee, base: All Employees and Clinical (BL8, TL4), the BCBA header (BL1)
  CENTRAL_REACH_EMPLOYEE_LABELS.ALL_EMPLOYEES,
  CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL,
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA,
  // Employee, managed: state (BL2, TL1)
  CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE,
  CENTRAL_REACH_EMPLOYEE_LABELS.NJ_EMPLOYEE,
  CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE,
  // Employee, New Mexico and Virginia (BL3, TL2): sendable, but no mapping reads them yet
  CENTRAL_REACH_EMPLOYEE_LABELS.NM_EMPLOYEE,
  CENTRAL_REACH_EMPLOYEE_LABELS.VA_EMPLOYEE,
  // BCBA, managed: assignment and licensure (BL4), NY Medicaid (BL5), Salaried (B10, row 5.7),
  // Billing Hold (BL7)
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_COLORADO,
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NJ,
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NY,
  CENTRAL_REACH_EMPLOYEE_LABELS.GRAD_STUDENT_LBA_NY,
  CENTRAL_REACH_EMPLOYEE_LABELS.NY_MEDICAID,
  CENTRAL_REACH_EMPLOYEE_LABELS.SALARIED,
  CENTRAL_REACH_EMPLOYEE_LABELS.BILLING_HOLD_MEDICAID_AFFILIATION,
  // BT/RBT, managed: role by state (TL3)
  CENTRAL_REACH_EMPLOYEE_LABELS.BT_NY,
  CENTRAL_REACH_EMPLOYEE_LABELS.BT_NJ,
  CENTRAL_REACH_EMPLOYEE_LABELS.BT_CO,
  CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NY,
  CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NJ,
  CENTRAL_REACH_EMPLOYEE_LABELS.RBT_CO
]);

export const CENTRAL_REACH_CLIENT_METADATA_FIELDS = {
  ALLERGIES: 126214,
  MALADAPTIVE_BEHAVIORS: 126207,
  COMORBID_DIAGNOSIS: 132303,
  BT_1_NAME: 131313,
  BT_2_NAME: 138092,
  WORK_SCHEDULE_1: 132304,
  WORK_SCHEDULE_2: 138093,
  CLIENT_AVAILABILITY: 126209,
  TOTAL_ASSIGNED_HOURS: 134331,
  APPROVED_AUTH_HOURS: 132431,
  AUTH_PERIOD: 134672,
  PHYSICIAN_CREDENTIALS: 131151,
  ASD_DIAGNOSIS_DATE: 131195,
  // "Date of Most Recent ASD Diagnosis Medicaid FFS NY" in CentralReach.
  ASD_DIAGNOSIS_DATE_MEDICAID: 138701,
  SUPERVISING_BCBA: 131308,
  INITIAL_ASSESSMENT_BCBA: 131314,
  REASSESSMENT_BCBA: 144602,
  CARE_COORDINATOR: 138851,
  SEVERITY_LEVEL: 133826,
  IMPORTANT_INFORMATION_PARENT: 138378,
  POLICY_HOLDER_NAME: 138090,
  POLICY_HOLDER_DOB: 137667,
  CURRENT_INSURANCE: 126210,
  INSURANCE_ID: 131316,
  SECONDARY_INSURANCE: 144600,
  SECONDARY_INSURANCE_ID: 144601,
  REFERRING_PHYSICIAN_MEDICAID_ID: 141233,
  DIAGNOSIS: 144793,
  REFERRAL_SOURCE: 126222,
  HUBSPOT_LINK_TO_CASE_RECORD: 138702,
  SERVICE_LOCATION_ADDRESS: 137697,
  SERVICE_LOCATION_ADDRESS_2: 138091
};

// Fields CentralReach stores as a textarea. Every other field is an Input.
const TEXT_AREA_METADATA_FIELD_IDS = [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS];

export const CENTRAL_REACH_METADATA_FIELD_TYPES = Object.values(
  {
    ...CENTRAL_REACH_CLIENT_METADATA_FIELDS,
    ...CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS
  }
).reduce((acc, fieldId) => {
  acc[fieldId] = TEXT_AREA_METADATA_FIELD_IDS.includes(fieldId) ? "TextArea" : "Input";
  return acc;
}, {});
