// The HubSpot Case (Deal) properties the client worker asks for (BUILD-PLAN row P.1).
// Moved here from src/workflows/clientSyncWorkflow.mjs so the mapper rows of Stage 4 change this
// file and not the workflow. The worker requests all four lists together.
//
//   mapped       read by the mappers (buildClientPayload.mjs, buildClientMetadata.mjs)
//   signalOnly   change signals no mapper reads
//   mustTrigger  a HubSpot workflow must trigger on these although no mapper reads them
//   system       gate, status, link and ID properties. The integration writes most of them
//                (BR13), so a HubSpot workflow must not trigger on them.
//
// `npm run check:triggers` (row 3.10) reads mapped, signalOnly and mustTrigger.
// The CR ID property (client_id_number) and the record gate property come from configuration;
// the workflow adds them to the request.
import { CASE_ENTRY_PROPERTY, TEST_RECORD_PROPERTY } from "../../constants/hubspot.mjs";

export const CASE_PROPERTIES = Object.freeze({
  mapped: Object.freeze([
    "phi_first_name__cloned_",
    "phi_last_name",
    "phi_date_of_birth",
    "phi_gender",
    "email",
    "phone",
    "phone_number__second_",
    "if_services_will_be_in_more_than_one_location__list_the_other_addres",
    "street_address",
    "home_apt",
    "location_city",
    "location_central_reach",
    "location",
    "postal_code",
    "guardian_first_name",
    "guardian_last_name",
    "allergies",
    "maladaptive_behaviors__clinical",
    "comorbid_diagnosis__clinical",
    // The four staff name properties below are read by buildClientMetadata.mjs today.
    // When row 4.14 stops reading current_primary_bt and current_primary_bt_2, those two move to
    // signalOnly: they are two of the guide's five staffing-name signals. supervising_bcba and
    // initial_assessment_bcba are not signals: rows 4.14, 4.15 and 4.17 stop requesting them.
    "current_primary_bt",
    "current_primary_bt_2",
    "supervising_bcba",
    "initial_assessment_bcba",
    "bt_work_schedule_confirmed",
    "bt_work_schedule_2_confirmed",
    "client_availability_completed",
    "assigned_hours",
    "authorized_hours",
    "auth_start_date",
    "auth_end_date",
    "physician_name",
    "npi_number",
    "physician_name__commercial",
    "npi_number__commercial",
    "most_recent_asd_diagnosis_date_medicaid",
    "most_recent_asd_diagnosis_date_1",
    "most_recent_asd_diagnosis_date_2",
    "policy_holder_name",
    "phi__policy_holder_dob",
    "severity_level_clinical",
    "n1_what_type_of_insurance",
    "n2_what_type_of_insurance",
    "insurance_primary",
    "insurance_1__other__summary",
    "insurance_id_1",
    // Requested today, but no mapper reads these three. They stay so that P.1 changes no
    // request. Row 4.10 maps insurance_id_2; row 4.17 stops requesting the other two.
    "insurance_id_2",
    "insurance_id_3",
    "insurance_id_4"
  ]),
  // dealstage, and three of the guide's five staffing-name signals: a HubSpot workflow cannot
  // trigger on an association, so it triggers on the name property that changes with it. The
  // other two (current_primary_bt, current_primary_bt_2) are in mapped until row 4.14. The three
  // names below were not requested before Stage P; no mapper reads them and they are not hashed.
  signalOnly: Object.freeze([
    "dealstage",
    "supervising_bcba_name",
    "ia_bcba_name",
    "reassessment_bcba_name"
  ]),
  mustTrigger: Object.freeze([CASE_ENTRY_PROPERTY]),
  system: Object.freeze([
    "hs_object_id",
    "hs_lastmodifieddate",
    TEST_RECORD_PROPERTY,
    "integration_last_write",
    "updated_by_integration",
    "last_sync_hash",
    "last_sync_at",
    "last_sync_status",
    "last_sync_error",
    "central_reach_link_to_client"
  ])
});

// Every Case property the worker asks HubSpot for, before the configured CR ID and gate
// properties are added.
export function caseRequestProperties() {
  return [
    ...CASE_PROPERTIES.mapped,
    ...CASE_PROPERTIES.signalOnly,
    ...CASE_PROPERTIES.mustTrigger,
    ...CASE_PROPERTIES.system
  ];
}
