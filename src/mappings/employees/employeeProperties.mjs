// The HubSpot BT/RBT and BCBA properties the employee worker asks for, and the CentralReach
// metadata fields it knows for each employee type (BUILD-PLAN row P.1).
// Moved here from src/workflows/employeeSyncWorkflow.mjs so the mapper rows of Stage 5 change this
// file and not the workflow. The worker requests all four lists of its object together.
//
//   mapped       read by the mapper (buildEmployeePayload.mjs)
//   signalOnly   change signals no mapper reads (none for employees today)
//   mustTrigger  a HubSpot workflow must trigger on these although no mapper reads them
//   system       gate, status, link and ID properties. The integration writes most of them
//                (BR13), so a HubSpot workflow must not trigger on them.
//
// `npm run check:triggers` (row 3.10) reads mapped, signalOnly and mustTrigger.
// The CR ID property (employee_id unless configured otherwise) and the record gate property come
// from configuration; the workflow adds them to the request.
import { CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import {
  BCBA_CHECKLIST_PROPERTY,
  BT_RBT_CHECKLIST_PROPERTY,
  EMPLOYEE_ENTRY_PROPERTY,
  HUBSPOT_EMPLOYEE_TYPES,
  TEST_RECORD_PROPERTY
} from "../../constants/hubspot.mjs";
import {
  BCBA_DATE_OF_BIRTH_PROPERTY,
  BCBA_PRIMARY_EMAIL_PROPERTY,
  BT_RBT_DATE_OF_BIRTH_PROPERTY,
  EMPLOYEE_PERSONAL_EMAIL_PROPERTY
} from "./buildEmployeePayload.mjs";
import { CARE_COORDINATOR_PROPERTIES } from "../shared/careCoordinator.mjs";

export const BT_RBT_PROPERTIES = Object.freeze({
  mapped: Object.freeze([
    "workday_id",
    "first_name",
    "last_name",
    BT_RBT_DATE_OF_BIRTH_PROPERTY,
    "gender",
    "email",
    // T9 held (2026-11-23): no personal_email here until the field is confirmed (O-51).
    // Mailing address and phone (T4, T5)
    "street_home",
    "home_apt",
    "location_city",
    "state_home",
    "postal_code_home",
    "employee_phone",
    // Work State(s) and type: state labels, role labels and the contact form (TL1, TL3, T1)
    "location",
    "bt_rbt_type",
    "active_cases_count",
    // Work address (T6)
    "street_address__work_",
    "apartment__work",
    "city__work_",
    "state__work_",
    "postal_code__work_"
  ]),
  signalOnly: Object.freeze([]),
  mustTrigger: Object.freeze([EMPLOYEE_ENTRY_PROPERTY, BT_RBT_CHECKLIST_PROPERTY]),
  system: Object.freeze([
    "hs_object_id",
    "employee_id",
    "hs_lastmodifieddate",
    TEST_RECORD_PROPERTY,
    "updated_by_integration",
    "integration_last_write",
    "last_sync_hash",
    "last_sync_at",
    "last_sync_status",
    "last_sync_error",
    "central_reach_link_to_rt_rbt"
  ])
});

export const BCBA_PROPERTIES = Object.freeze({
  mapped: Object.freeze([
    "workday_id",
    "first_name",
    "last_name",
    // Date of birth (B5): BCBA_DATE_OF_BIRTH_PROPERTY, `date_of_birth` (item 1, O-10). `dob` is not read.
    BCBA_DATE_OF_BIRTH_PROPERTY,
    "gender_new",
    // primaryEmail (B4, decision 49) reads `email`; personal email, Meta 138069 (B9, row 6.4,
    // decision 50) reads `personal_email`. Both are the BCBA record's own, not its Contact's.
    BCBA_PRIMARY_EMAIL_PROPERTY,
    EMPLOYEE_PERSONAL_EMAIL_PROPERTY,
    // Mailing address and phone: read-only Contact mirrors (B7)
    "address",
    "apartment__home",
    "city_home",
    "state_home",
    "postal_code_home",
    "employee_phone",
    "medicaid_id__ny",
    "medicaid_id__nj",
    "medicaid_id__co",
    // Labels: Work State(s) (BL2), assignment and licensure (BL4), credentials (BL5, BL6; the keys
    // of BCBA_CREDENTIAL_LABELS_BY_PROPERTY), Salaried (B10), Billing Hold (BL7)
    "location",
    "assign_states",
    "lba_licensure__ny",
    "ny_insurance_labels",
    "co_insurance_labels",
    "nj_insurance_labels",
    "work_status",
    "cr_billing_hold_label",
    // Care Coordinator, Meta 140495 (B11, O-17): the fields Zeke's BCBA coordinator workflow
    // keeps on the record. Sandbox only (production 404, 2026-11-25): a portal without them ends
    // every BCBA run HUBSPOT_PROPERTY_MISSING (row 4.18).
    ...CARE_COORDINATOR_PROPERTIES
  ]),
  signalOnly: Object.freeze([]),
  mustTrigger: Object.freeze([EMPLOYEE_ENTRY_PROPERTY, BCBA_CHECKLIST_PROPERTY]),
  system: Object.freeze([
    "hs_object_id",
    "employee_id",
    "hs_lastmodifieddate",
    TEST_RECORD_PROPERTY,
    "updated_by_integration",
    "integration_last_write",
    "last_sync_hash",
    "last_sync_at",
    "last_sync_status",
    "last_sync_error",
    "central_reach_record_link"
  ])
});

function listsFor(employeeType) {
  return employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT ? BT_RBT_PROPERTIES : BCBA_PROPERTIES;
}

// Row 4.18: the properties the mappers read. Every one must be a key in the HubSpot answer
// (HubSpot answers a blank property with a null key); a missing key is a failed read.
export function employeeMappedProperties(employeeType) {
  return [...listsFor(employeeType).mapped];
}

// Every property the worker asks HubSpot for on one employee object, before the configured CR ID
// and gate properties are added.
export function employeeRequestProperties(employeeType) {
  const lists = listsFor(employeeType);
  return [...lists.mapped, ...lists.signalOnly, ...lists.mustTrigger, ...lists.system];
}

// The CentralReach metadata fields the integration maps for each employee type. The worker
// compares and sends every field in this list: a field the mapper leaves out is sent as blank,
// unless the worker names it in its omit list (140495 when the Care Coordinator is not ready).
export function knownMetadataFieldIds(employeeType) {
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT) {
    return [
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.WORK_ADDRESS,
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.ACTIVE_CASE_COUNT,
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD
    ];
  }
  return [
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.PERSONAL_EMAIL,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NJ,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_CO,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BCBA_RECORD,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CARE_COORDINATOR
  ];
}
