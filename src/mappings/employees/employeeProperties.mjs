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

export const BT_RBT_PROPERTIES = Object.freeze({
  mapped: Object.freeze([
    "workday_id",
    "first_name",
    "last_name",
    "date_of_birth",
    "gender",
    "email",
    "street_home",
    "home_apt",
    "location_city",
    "location_home",
    "postal_code",
    "postal_code_home",
    "employee_phone",
    "bt_rbt_type",
    "active_cases_count",
    "street_address__work_",
    "city__work_",
    "state__work_",
    "postal_code__work_",
    // Requested today, but the mapper does not read it. It stays so that P.1 changes no request.
    "bt_name"
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
    "date_of_birth",
    "email",
    "ucaba_email_address",
    "address",
    "home_apt",
    "city_work",
    "home_state",
    "employee_phone",
    "medicaid_id__ny",
    "medicaid_id__nj",
    "medicaid_id__co",
    "credentialed_insurances__ny",
    // Requested today, but the mapper reads neither. They stay so that P.1 changes no request.
    // Row 5.3 stops requesting work_email.
    "bcba_name",
    "work_email"
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

// Every property the worker asks HubSpot for on one employee object, before the configured CR ID
// and gate properties are added.
export function employeeRequestProperties(employeeType) {
  const lists = listsFor(employeeType);
  return [...lists.mapped, ...lists.signalOnly, ...lists.mustTrigger, ...lists.system];
}

// The CentralReach metadata fields the integration maps for each employee type. The worker
// compares and sends every field in this list: a field the mapper leaves out is sent as blank.
export function knownMetadataFieldIds(employeeType) {
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT) {
    return [
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.WORK_ADDRESS,
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.ACTIVE_CASE_COUNT,
      CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD
    ];
  }
  return [
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_EMAIL,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NJ,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_CO,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_NY,
    CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BCBA_RECORD
  ];
}
