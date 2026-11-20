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
    // Core fields (buildClientPayload.mjs): C2 to C4, C6 to C8
    "phi_first_name__cloned_",
    "phi_last_name",
    "phi_date_of_birth",
    "phi_gender",
    "email",
    "phone",
    "street_address",
    "home_apt",
    "location_city",
    "stateregion",
    "postal_code",
    "guardian_first_name",
    "guardian_last_name",
    // Labels (buildClientMetadata.mjs): CL1 to CL4. specific_home_location also chooses the
    // service address (C24, C25).
    "location",
    "specific_home_location",
    "case_status",
    "staffing_status",
    // Metadata fields (buildClientMetadata.mjs)
    "allergies",
    "allergies__yes__explain",
    "maladaptive_behaviors__parentguardian",
    "does_your_child_have_any_other_comorbid_diagnoses_",
    "severity_level_clinical",
    "important_information",
    "ongoing_central_reach_provider_supplier",
    "work_schedule_details",
    "btrbt_work_schedule_2_details",
    "finalized_client_service_hours_post_assessment",
    "client_service_hours_total",
    "total_hours_bt1bt2_work_schedule",
    "initial_auth_tracks",
    "n97153_approved_assessment_hours_auth_req",
    "ia_hours_from_the_ia",
    "ongoing_auth_period_start_date",
    "ongoing_autrh_period_end_date",
    "full_home_address",
    "service__street_address",
    "service__apt",
    "service__city",
    "service__postal_code",
    "service_address__other",
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
    "insurance_primary",
    "insurance_1__other__summary",
    "insurance_id_1",
    "insurance_2",
    "insurance_2__other__summary",
    "insurance_id_2",
    "referral_source"
  ]),
  // dealstage, and the guide's five staffing-name signals: a HubSpot workflow cannot trigger on an
  // association, so it triggers on the name property that changes with it. No mapper reads them
  // and they are not hashed: the staff names sent to CentralReach come from the associations
  // (row 4.14). hubspot_owner_id is the Case owner: the worker resolves it to a name (row 4.16)
  // and passes the name to the mapper.
  signalOnly: Object.freeze([
    "dealstage",
    "supervising_bcba_name",
    "ia_bcba_name",
    "reassessment_bcba_name",
    "current_primary_bt",
    "current_primary_bt_2",
    "hubspot_owner_id"
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
