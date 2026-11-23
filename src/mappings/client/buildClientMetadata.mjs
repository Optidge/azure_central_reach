import {
  CENTRAL_REACH_CLIENT_LABELS,
  CENTRAL_REACH_CLIENT_METADATA_FIELDS,
  CENTRAL_REACH_CLIENT_STAFFING_LABELS,
  CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS
} from "../../constants/centralReach.mjs";
import { HUBSPOT_CASE_OBJECT_TYPE_ID } from "../../constants/hubspot.mjs";
import { readDate } from "../../lib/dates.mjs";

function toTrimmedOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const stringValue = String(value).trim();
  return stringValue || null;
}

function joinMetadataParts(parts) {
  const clean = parts.map((part) => toTrimmedOrNull(part)).filter(Boolean);
  return clean.length ? clean.join(", ") : null;
}

// Rule 5.7. A HubSpot date for a CentralReach metadata text field: MM/DD/YYYY, null when blank,
// UNREADABLE when it is filled and is not a real date. An unreadable date is never a blank.
const UNREADABLE = Symbol("unreadable date");

function toMetadataDate(value) {
  const read = readDate(value);
  if (read === "blank") {
    return null;
  }
  if (read === "unreadable") {
    return UNREADABLE;
  }
  const [yyyy, mm, dd] = read.split("-");
  return `${mm}/${dd}/${yyyy}`;
}

// C20, row 4.6 (owner's decision 2026-11-21): Total Assigned Hours is computed here, not read from
// the HubSpot formula total_hours_btrbt_12 (blank unless both inputs are filled). A blank input
// counts as 0; both blank sends a blank. The sum is rounded to 4 decimals (no 7.5 + 8.1 noise)
// and sent as text like the other Meta values. A filled input that is not a finite number is
// named in unreadableValueProperties (F-1): the worker ends the run as `error` and sends nothing.
function sumAssignedHours(dealProps, noteUnreadable) {
  const parts = ["hours_bt_work_schedule_1", "bt_rbt_2_work_schedule"].map((property) => {
    const text = toTrimmedOrNull(dealProps[property]);
    if (text === null) {
      return null;
    }
    const hours = Number(text);
    if (!Number.isFinite(hours)) {
      noteUnreadable(property);
      return UNREADABLE;
    }
    return hours;
  });
  if (parts.includes(UNREADABLE)) {
    return UNREADABLE;
  }
  if (parts.every((hours) => hours === null)) {
    return null;
  }
  const sum = parts.reduce((total, hours) => total + (hours ?? 0), 0);
  return String(Number(sum.toFixed(4)));
}

// The carrier, or the "Other" summary when the carrier is Other (C29 primary, C30 secondary).
// A blank carrier sends a blank field, even when the "Other" summary is filled.
function insuranceCarrier(carrierValue, otherSummaryValue) {
  const carrier = toTrimmedOrNull(carrierValue);
  const otherSummary = toTrimmedOrNull(otherSummaryValue);

  if (carrier && carrier.toLowerCase() === "other") {
    return otherSummary || "Other";
  }

  return carrier || null;
}

// C31, row 4.23 (decision 32). The six stored values of n1_what_type_of_insurance, read from the
// sandbox on 2026-11-20. Every Medicaid type uses the Medicaid pair. "Unsure", blank or any other
// value sends a blank field.
const MEDICAID_INSURANCE_TYPES = ["medicaid ffs", "medicaid ffs - nj", "medicaid ffs - co"];
const COMMERCIAL_INSURANCE_TYPES = ["commercial enrolled", "commercial oon"];

function getPhysicianCredentialsByInsuranceType(dealProps) {
  const insuranceType = toTrimmedOrNull(dealProps.n1_what_type_of_insurance)?.toLowerCase();
  if (MEDICAID_INSURANCE_TYPES.includes(insuranceType)) {
    return joinMetadataParts([dealProps.physician_name, dealProps.npi_number]);
  }

  if (COMMERCIAL_INSURANCE_TYPES.includes(insuranceType)) {
    return joinMetadataParts([dealProps.physician_name__commercial, dealProps.npi_number__commercial]);
  }

  return null;
}

// C23, row 4.8. start and end are the two dates as toMetadataDate read them. One unreadable date
// makes the whole field unreadable.
function getAuthPeriodValue(start, end) {
  if (start === UNREADABLE || end === UNREADABLE) {
    return UNREADABLE;
  }
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end || null;
}

// C22, row 4.7. initial_auth_tracks chooses the source. Blank or any other track: blank.
function getApprovedAuthHours(dealProps) {
  const track = toTrimmedOrNull(dealProps.initial_auth_tracks);
  if (track === "Prior Authorization Required") {
    return toTrimmedOrNull(dealProps.n97153_approved_assessment_hours_auth_req);
  }
  if (track === "No Prior Authorization Required") {
    return toTrimmedOrNull(dealProps.ia_hours_from_the_ia);
  }
  return null;
}

// C26, row 4.9. allergies stores Confirmed (shown as Yes) or Denial (shown as No).
// Assumed text format (O-28): "Yes", then the explanation when filled.
function getKnownAllergies(dealProps) {
  const allergies = toTrimmedOrNull(dealProps.allergies);
  if (allergies === "Confirmed") {
    return joinMetadataParts(["Yes", dealProps.allergies__yes__explain]);
  }
  if (allergies === "Denial") {
    return "No";
  }
  return null;
}

// C33, row 4.11. phi_diagnosis stores Yes for the option shown as "Yes-F84.0"; every other
// option stores what it shows (guide appendix). Assumed text format (O-28): the option's display
// text, then diagnosis_other when filled.
function getDiagnosis(dealProps) {
  const diagnosis = toTrimmedOrNull(dealProps.phi_diagnosis);
  return joinMetadataParts([diagnosis === "Yes" ? "Yes-F84.0" : diagnosis, dealProps.diagnosis_other]);
}

// C24 and C25, rows 4.13 and 4.22. specific_home_location says where services happen.
const HOME_SERVICE_LOCATIONS = ["Child's House", "More Than One Location"];

function getServiceLocationAddress(dealProps) {
  const location = toTrimmedOrNull(dealProps.specific_home_location);
  if (HOME_SERVICE_LOCATIONS.includes(location)) {
    return toTrimmedOrNull(dealProps.full_home_address);
  }
  if (location === "Other Location") {
    return joinMetadataParts([
      dealProps.service__street_address,
      dealProps.service__apt,
      dealProps.service__city,
      dealProps.service__postal_code
    ]);
  }
  return null;
}

function getServiceLocationAddress2(dealProps) {
  return toTrimmedOrNull(dealProps.specific_home_location) === "More Than One Location"
    ? toTrimmedOrNull(dealProps.service_address__other)
    : null;
}

// C11 and C14, row 4.14 (contract P.5 b). "First Last" for each staff record in the role, in
// record-ID order.
function staffNamesInRole(staffInRole) {
  const byRecordId = [...staffInRole].sort((left, right) =>
    String(left?.recordId ?? "").localeCompare(String(right?.recordId ?? ""), "en", { numeric: true })
  );
  return byRecordId.map((staff) =>
    [toTrimmedOrNull(staff?.firstName), toTrimmedOrNull(staff?.lastName)].filter(Boolean).join(" ")
  );
}

// The CentralReach field of each staff role. The worker reads the field IDs to name the fields
// whose input was not read (contract P.5 (c)).
export const STAFF_ROLE_FIELDS = {
  initialAssessmentBcba: CENTRAL_REACH_CLIENT_METADATA_FIELDS.INITIAL_ASSESSMENT_BCBA,
  reEvaluationBcba: CENTRAL_REACH_CLIENT_METADATA_FIELDS.REASSESSMENT_BCBA,
  primaryBt1: CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_1_NAME,
  primaryBt2: CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_2_NAME
};

// The roles that hold a staff record with no readable name. The mapper leaves those roles' fields
// out and warns; the worker names the same fields in its omit list (row 3.18), so their saved
// hashes are kept.
export function staffRolesWithoutName(staffNames) {
  return Object.keys(STAFF_ROLE_FIELDS).filter(
    (role) =>
      Array.isArray(staffNames?.[role]) && staffNamesInRole(staffNames[role]).some((name) => !name)
  );
}

// The four staff name fields: the names of a role joined by ", " (assumed format, O-28), and a
// blank field for an empty list. Rule 5.8: a role whose list was not passed was not read, and a
// staff record with no readable name is not "nobody". In both cases the role's key is left out;
// the second also gets a warning that names the role, never a value.
function staffNameFields(staffNames) {
  const fields = {};
  const warnings = [];
  for (const [role, fieldId] of Object.entries(STAFF_ROLE_FIELDS)) {
    if (!Array.isArray(staffNames?.[role])) {
      continue;
    }
    const names = staffNamesInRole(staffNames[role]);
    if (names.some((name) => !name)) {
      warnings.push({
        code: "staff_name_unreadable",
        role,
        message: `A staff record in the role ${role} has no first or last name; the field is not sent.`
      });
      continue;
    }
    fields[fieldId] = joinMetadataParts(names);
  }
  return { fields, warnings };
}

// CL1, row 4.19. The Case `location` stores the state name.
const STATE_LABELS = {
  "New York": CENTRAL_REACH_CLIENT_LABELS.NY_CLIENT,
  "New Jersey": CENTRAL_REACH_CLIENT_LABELS.NJ_CLIENT,
  Colorado: CENTRAL_REACH_CLIENT_LABELS.CO_CLIENT
};

// CL3, row 4.21. case_status stores Warm (shown as Active) or Cold (shown as Inactive).
const CASE_STATUS_LABELS = {
  Warm: CENTRAL_REACH_CLIENT_LABELS.ACTIVE_CLIENT,
  Cold: CENTRAL_REACH_CLIENT_LABELS.IN_ACTIVE_CLIENT
};

function ownLabel(labelsByStoredValue, storedValue) {
  const key = String(storedValue ?? "").trim();
  return Object.prototype.hasOwnProperty.call(labelsByStoredValue, key) ? labelsByStoredValue[key] : null;
}

// Rows 4.19 to 4.21. All Clients is the base label: always required, never managed (CL6).
function requiredClientLabelIds(dealProps) {
  const home = HOME_SERVICE_LOCATIONS.includes(toTrimmedOrNull(dealProps.specific_home_location))
    ? CENTRAL_REACH_CLIENT_LABELS.HOME
    : null;
  return [
    CENTRAL_REACH_CLIENT_LABELS.ALL_CLIENTS,
    ownLabel(STATE_LABELS, dealProps.location),
    home,
    ownLabel(CASE_STATUS_LABELS, dealProps.case_status),
    // CL4: a staffing_status equal to one of the three label names; any other value: no label.
    ownLabel(CENTRAL_REACH_CLIENT_STAFFING_LABELS, dealProps.staffing_status)
  ].filter(Boolean);
}

// Every label the integration maps for a Case. One that is not required is removed (rule 5.6).
// The three remove-only IDs are the retired staffing labels: managed, never required.
const CLIENT_MANAGED_LABEL_IDS = Object.freeze([
  CENTRAL_REACH_CLIENT_LABELS.NY_CLIENT,
  CENTRAL_REACH_CLIENT_LABELS.NJ_CLIENT,
  CENTRAL_REACH_CLIENT_LABELS.CO_CLIENT,
  CENTRAL_REACH_CLIENT_LABELS.HOME,
  CENTRAL_REACH_CLIENT_LABELS.ACTIVE_CLIENT,
  CENTRAL_REACH_CLIENT_LABELS.IN_ACTIVE_CLIENT,
  ...Object.values(CENTRAL_REACH_CLIENT_STAFFING_LABELS),
  ...CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS
]);

// portalId is the worker's configured portal, passed in by the workflow.
function buildHubspotDealUrl(hsObjectId, portalId) {
  const dealId = String(hsObjectId || "").trim();
  if (!dealId || !String(portalId || "").trim()) {
    return null;
  }
  return `https://app.hubspot.com/contacts/${portalId}/record/${HUBSPOT_CASE_OBJECT_TYPE_ID}/${dealId}`;
}

// CONTRACT P.5 (a): labels. Every mapper returns two lists of CentralReach label IDs (rule 5.6).
//   requiredLabelIds  the labels the Case must hold now. All Clients is always in it.
//   managedLabelIds   every label the integration maps for a Case, required now or not: the
//                     state, Home, Active / Inactive and staffing labels (rows 4.19 to 4.21), and
//                     the remove-only IDs, which are never in requiredLabelIds.
//   labelIds          the old name of requiredLabelIds, the same list. Old tests still read it.
// The worker reads requiredLabelIds and managedLabelIds and passes both to the label sender
// (contract (e) in src/lib/centralReachClient.mjs). Every ID in requiredLabelIds must be in
// CENTRAL_REACH_SENDABLE_LABEL_IDS (src/constants/centralReach.mjs).
//
// CONTRACT P.5 (b): staff names are an input. The mapper reads no association and calls no API.
// The worker (src/workflows/clientSyncWorkflow.mjs, row 4.14) reads them and passes them in.
//   staffNames  the staff on the Case by role:
//                 { initialAssessmentBcba, reEvaluationBcba, primaryBt1, primaryBt2 }
//               The role names are those of staffingRoleAssociationTypeIds in src/lib/config.mjs.
//               Each role holds a list of { recordId, firstName, lastName }, one per staff record
//               in that role, and an empty list when nobody holds the role. The mapper builds the
//               text for fields 131314, 144602, 131313 and 138092 (row 4.14). A staff record
//               with neither a first nor a last name: that role's key is left out and the
//               answer's `warnings` list names the role ({ code, role, message }), never a value.
//
// CONTRACT P.5 (c): an input that could not be read (rule 5.8) never becomes a blank.
//   omitFieldIds  CentralReach metadata field IDs whose input could not be read in this run, for
//                 example a staff field when the staff were not read. The mapper leaves those
//                 keys out of metadataValues, so the field is not sent. null or undefined: no field.
//   unreadableDateProperties (in the answer, rule 5.7)  the HubSpot date properties that are
//                 filled and are not a real date: the auth period start and end, the two ASD
//                 dates and the policy holder date of birth. An empty list when there is none.
//                 The mapper leaves that date's field out of metadataValues, so it is neither
//                 sent nor cleared; one unreadable auth date leaves the whole Auth Period out.
//                 The worker (lane D, wave 2) must end the run as `error` when the list is not
//                 empty, with a reason that names the properties, and make no CentralReach write.
//   unreadableValueProperties (in the answer, F-1)  the same for a filled input that is not a
//                 date and is not a value of its format (the C20 hours inputs). Same handling,
//                 with the reason "Unreadable value: <property>".
// What the worker must do for an omitted field (row 3.18): keep the field's saved hash in the
// link record as it was, and leave the field out of the changed fields. If the saved hash were
// dropped, a later blank in HubSpot would send no clear and CentralReach would keep the old value.
// The Case worker maps twice in one run: before the writes, and again after the confirm read.
// Both mappings get the same staffNames and omitFieldIds. If they differ, the two hashes differ
// and the run ends as "changed during the run" after the CentralReach writes.
// An input that is not passed at all (undefined) was not read either: the mapper leaves that
// input's fields out in the same way (a role missing from staffNames: that role's field). A failed
// association or staff name read is different: it stops the run in the worker and never reaches
// the mapper.
export function buildClientMetadata({ deal, portalId, staffNames, omitFieldIds }) {
  const dealProps = deal?.properties || {};
  const staff = staffNameFields(staffNames);
  // Rule 5.7: reads one date property and notes it when it is filled and unreadable.
  const unreadableDateProperties = [];
  // F-1: a filled input that is not a value of its format (C20 hours). Not a date.
  const unreadableValueProperties = [];
  const dateOf = (property) => {
    const date = toMetadataDate(dealProps[property]);
    if (date === UNREADABLE) {
      unreadableDateProperties.push(property);
    }
    return date;
  };

  const metadataValues = {
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.ALLERGIES]: getKnownAllergies(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.MALADAPTIVE_BEHAVIORS]: toTrimmedOrNull(
      dealProps.maladaptive_behaviors__parentguardian
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.COMORBID_DIAGNOSIS]: toTrimmedOrNull(
      dealProps.does_your_child_have_any_other_comorbid_diagnoses_
    ),
    ...staff.fields,
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.WORK_SCHEDULE_1]: toTrimmedOrNull(
      dealProps.work_schedule_details
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.WORK_SCHEDULE_2]: toTrimmedOrNull(
      dealProps.btrbt_work_schedule_2_details
    ),
    // C19, row 4.5. Assumed text format (O-28): the text, then the weekly hours when filled.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.CLIENT_AVAILABILITY]: joinMetadataParts([
      dealProps.finalized_client_service_hours_post_assessment,
      dealProps.client_service_hours_total
    ]),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.TOTAL_ASSIGNED_HOURS]: sumAssignedHours(
      dealProps,
      (property) => unreadableValueProperties.push(property)
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.APPROVED_AUTH_HOURS]: getApprovedAuthHours(dealProps),
    // The end-date property name is misspelled in HubSpot; the spelling is real.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.AUTH_PERIOD]: getAuthPeriodValue(
      dateOf("ongoing_auth_period_start_date"),
      dateOf("ongoing_autrh_period_end_date")
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS]:
      getServiceLocationAddress(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS_2]:
      getServiceLocationAddress2(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.PHYSICIAN_CREDENTIALS]:
      getPhysicianCredentialsByInsuranceType(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRING_PHYSICIAN_MEDICAID_ID]: toTrimmedOrNull(
      dealProps.referring_provider_medicaid_id
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.DIAGNOSIS]: getDiagnosis(dealProps),
    // C34, row 4.12: both dates, each to its own field.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.ASD_DIAGNOSIS_DATE]: dateOf(
      "most_recent_asd_diagnosis_date_1"
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.ASD_DIAGNOSIS_DATE_MEDICAID]: dateOf(
      "most_recent_asd_diagnosis_date_medicaid"
    ),
    // C12, row 4.15: the typed text as it is.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SUPERVISING_BCBA]: toTrimmedOrNull(
      dealProps.ongoing_central_reach_provider_supplier
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL]: toTrimmedOrNull(
      dealProps.severity_level_clinical
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.IMPORTANT_INFORMATION_PARENT]: toTrimmedOrNull(
      dealProps.important_information
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_NAME]: toTrimmedOrNull(
      dealProps.policy_holder_name
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_DOB]: dateOf("phi__policy_holder_dob"),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.CURRENT_INSURANCE]: insuranceCarrier(
      dealProps.insurance_primary,
      dealProps.insurance_1__other__summary
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.INSURANCE_ID]: toTrimmedOrNull(dealProps.insurance_id_1),
    // C30, row 4.10: the carrier, never n2_what_type_of_insurance.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE]: insuranceCarrier(
      dealProps.insurance_2,
      dealProps.insurance_2__other__summary
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE_ID]: toTrimmedOrNull(
      dealProps.insurance_id_2
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRAL_SOURCE]: toTrimmedOrNull(dealProps.referral_source),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.HUBSPOT_LINK_TO_CASE_RECORD]: buildHubspotDealUrl(
      dealProps.hs_object_id,
      portalId
    ),
    // C10, row 4.16 (decision 39): the Care Coordinator's name, typed on the Case.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR]: toTrimmedOrNull(
      dealProps.care_coordinator_name
    )
  };

  for (const fieldId of omitFieldIds ?? []) {
    delete metadataValues[fieldId];
  }
  // Rule 5.7: a field whose date could not be read is not sent and not cleared.
  for (const [fieldId, value] of Object.entries(metadataValues)) {
    if (value === UNREADABLE) {
      delete metadataValues[fieldId];
    }
  }

  const requiredLabelIds = requiredClientLabelIds(dealProps);
  return {
    requiredLabelIds,
    managedLabelIds: [...CLIENT_MANAGED_LABEL_IDS],
    labelIds: requiredLabelIds,
    metadataValues,
    unreadableDateProperties,
    unreadableValueProperties,
    warnings: staff.warnings
  };
}
