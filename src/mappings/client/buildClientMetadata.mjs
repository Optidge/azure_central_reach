import {
  CENTRAL_REACH_CLIENT_LABELS,
  CENTRAL_REACH_CLIENT_METADATA_FIELDS
} from "../../constants/centralReach.mjs";

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

function hsDateToIsoOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    const fromEpoch = new Date(asNumber);
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch.toISOString();
  }

  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString();
}

function toMetadataDate(value) {
  const iso = hsDateToIsoOrNull(value);
  if (!iso) {
    return null;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const yyyy = String(date.getUTCFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

function getCurrentInsuranceMetaValue(dealProps) {
  const primary = toTrimmedOrNull(dealProps.insurance_primary);
  const otherSummary = toTrimmedOrNull(dealProps.insurance_1__other__summary);

  if (primary && primary.toLowerCase() === "other") {
    return otherSummary || "Other";
  }

  return primary || otherSummary || null;
}

function getInsuranceIdForMetaField(dealProps, slotIndex) {
  return toTrimmedOrNull(dealProps[`insurance_id_${slotIndex}`]);
}

function getPhysicianCredentialsByInsuranceType(dealProps) {
  const insuranceType = toTrimmedOrNull(dealProps.n1_what_type_of_insurance)?.toLowerCase();
  if (insuranceType === "medicaid ffs") {
    return joinMetadataParts([dealProps.physician_name, dealProps.npi_number]);
  }

  if (insuranceType === "commercial enrolled" || insuranceType === "commercial oon") {
    return joinMetadataParts([dealProps.physician_name__commercial, dealProps.npi_number__commercial]);
  }

  return null;
}

function getAsdDiagnosisDateByInsuranceType(dealProps) {
  const insuranceType = toTrimmedOrNull(dealProps.n1_what_type_of_insurance)?.toLowerCase();
  if (insuranceType === "medicaid ffs") {
    return toMetadataDate(dealProps.most_recent_asd_diagnosis_date_medicaid);
  }

  if (insuranceType === "commercial enrolled" || insuranceType === "commercial oon") {
    return toMetadataDate(dealProps.most_recent_asd_diagnosis_date_1);
  }

  return null;
}

function getMedicaidFfsAsdDiagnosisDate(dealProps) {
  const insuranceTypes = [
    dealProps.n1_what_type_of_insurance,
    dealProps.n2_what_type_of_insurance
  ].map((value) => toTrimmedOrNull(value)?.toLowerCase());
  if (!insuranceTypes.includes("medicaid ffs")) {
    return null;
  }
  return toMetadataDate(dealProps.most_recent_asd_diagnosis_date_medicaid);
}

function formatAuthPeriod(start, end) {
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end || null;
}

function getAuthPeriodValue(dealProps) {
  const guideStart = toMetadataDate(dealProps.ongoing_auth_period_start_date);
  const guideEnd = toMetadataDate(dealProps.ongoing_autrh_period_end_date);
  if (guideStart || guideEnd) {
    return formatAuthPeriod(guideStart, guideEnd);
  }
  return formatAuthPeriod(
    toMetadataDate(dealProps.auth_start_date),
    toMetadataDate(dealProps.auth_end_date)
  );
}

function checkboxTokens(value) {
  return String(value ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatCheckbox(value) {
  const tokens = checkboxTokens(value);
  return tokens.length ? tokens.join(", ") : null;
}

function preferText(primary, standIn) {
  return toTrimmedOrNull(primary) || toTrimmedOrNull(standIn);
}

function scheduleValue(primary, locationTwo, standIn) {
  const parts = [toTrimmedOrNull(primary), toTrimmedOrNull(locationTwo)].filter(Boolean);
  if (parts.length) {
    return parts.join("; ");
  }
  return toTrimmedOrNull(standIn);
}

function getApprovedAuthHours(dealProps) {
  const track = toTrimmedOrNull(dealProps.initial_auth_tracks);
  const priorAuth = toTrimmedOrNull(dealProps.n97153_approved_assessment_hours_auth_req);
  const noAuth = toTrimmedOrNull(dealProps.ia_hours_from_the_ia);
  const standIn = toTrimmedOrNull(dealProps.authorized_hours);
  if (track === "Prior Authorization Required") {
    return priorAuth || standIn;
  }
  if (track === "No Prior Authorization Required") {
    return noAuth || standIn;
  }
  return standIn || priorAuth || noAuth;
}

function getSecondaryInsuranceMetaValue(dealProps) {
  const secondary = toTrimmedOrNull(dealProps.insurance_2);
  const otherSummary = toTrimmedOrNull(dealProps.insurance_2__other__summary);
  if (secondary && secondary.toLowerCase() === "other") {
    return otherSummary || "Other";
  }
  return secondary || otherSummary || null;
}

function getDiagnosisValue(dealProps) {
  const diagnosis = toTrimmedOrNull(dealProps.phi_diagnosis);
  const other = toTrimmedOrNull(dealProps.diagnosis_other);
  if (diagnosis && diagnosis.toLowerCase() === "other") {
    return other || "Other";
  }
  return joinMetadataParts([diagnosis, other]);
}

function getKnownAllergies(dealProps) {
  return joinMetadataParts([dealProps.allergies, dealProps.allergies__yes__explain]);
}

function serviceLocationAddress(dealProps) {
  const where = toTrimmedOrNull(dealProps.specific_home_location);
  const home = toTrimmedOrNull(dealProps.full_home_address);
  const other =
    toTrimmedOrNull(dealProps.service_address__other) ||
    joinMetadataParts([
      dealProps.service__street_address,
      dealProps.service__apt,
      dealProps.service__city,
      dealProps.service__postal_code
    ]);
  if (where === "Other Location") {
    return other;
  }
  if (where === "Child's House" || where === "More Than One Location") {
    return home;
  }
  return home || other;
}

function serviceLocationAddress2(dealProps) {
  if (toTrimmedOrNull(dealProps.specific_home_location) === "Child's House") {
    return null;
  }
  return toTrimmedOrNull(dealProps.service_address__other);
}

function normalizeClientStateForLabel(stateValue) {
  const normalized = String(stateValue || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "ny" || normalized === "new york") {
    return "NY";
  }
  if (normalized === "nj" || normalized === "new jersey") {
    return "NJ";
  }
  if (normalized === "co" || normalized === "colorado") {
    return "CO";
  }
  return null;
}

function fundingLabelId(primary, state) {
  if (!primary) {
    return null;
  }
  // Guide section 7: the nine "-Carelon" insurance_primary options.
  // Waiting on United Care (Pessy): Anthem BCBS, UHC, and payors with no
  // CentralReach label (Aetna or Cigna in NJ, Aetna in CO, Other).
  // Do not add labels for those until the guide is updated.
  if (primary.toLowerCase().includes("carelon")) {
    return CENTRAL_REACH_CLIENT_LABELS.CARELON;
  }
  const byPrimary = {
    Aetna: { NY: CENTRAL_REACH_CLIENT_LABELS.AETNA_NY },
    Cigna: {
      NY: CENTRAL_REACH_CLIENT_LABELS.CIGNA_NY,
      CO: CENTRAL_REACH_CLIENT_LABELS.CIGNA_COLORADO
    },
    "Medicaid FFS": {
      NY: CENTRAL_REACH_CLIENT_LABELS.MEDICAID_NY,
      NJ: CENTRAL_REACH_CLIENT_LABELS.MEDICAID_NJ,
      CO: CENTRAL_REACH_CLIENT_LABELS.MEDICAID_COLORADO
    }
  };
  return byPrimary[primary]?.[state] || null;
}

function requiredClientLabelIds(dealProps) {
  const normalizedState = normalizeClientStateForLabel(
    dealProps.stateregion || dealProps.location_central_reach || dealProps.location
  );
  const labelIds = [CENTRAL_REACH_CLIENT_LABELS.ALL_CLIENTS];
  if (normalizedState === "NY") {
    labelIds.push(CENTRAL_REACH_CLIENT_LABELS.NY_CLIENT);
  }
  if (normalizedState === "NJ") {
    labelIds.push(CENTRAL_REACH_CLIENT_LABELS.NJ_CLIENT);
  }
  if (normalizedState === "CO") {
    labelIds.push(CENTRAL_REACH_CLIENT_LABELS.CO_CLIENT);
  }

  const fundingLabel = fundingLabelId(
    toTrimmedOrNull(dealProps.insurance_primary),
    normalizedState
  );
  if (fundingLabel) {
    labelIds.push(fundingLabel);
  }

  const caseStatus = toTrimmedOrNull(dealProps.case_status);
  if (caseStatus === "Warm") {
    labelIds.push(CENTRAL_REACH_CLIENT_LABELS.ACTIVE_CLIENT);
  }
  if (caseStatus === "Cold") {
    labelIds.push(CENTRAL_REACH_CLIENT_LABELS.INACTIVE_CLIENT);
  }

  const homeLocation = toTrimmedOrNull(dealProps.specific_home_location);
  if (homeLocation === "Child's House" || homeLocation === "More Than One Location") {
    labelIds.push(CENTRAL_REACH_CLIENT_LABELS.HOME);
  }
  return labelIds;
}

function buildHubspotDealUrl(hsObjectId) {
  const dealId = String(hsObjectId || "").trim();
  if (!dealId) {
    return null;
  }
  const portalId = process.env.HUBSPOT_PORTAL_ID_TEST || "50850427";
  const dealObjectTypeId = process.env.HUBSPOT_DEAL_OBJECT_TYPE_ID || "0-3";
  return `https://app.hubspot.com/contacts/${portalId}/record/${dealObjectTypeId}/${dealId}`;
}

export function buildClientMetadata({ deal }) {
  const dealProps = deal?.properties || {};

  const metadataValues = {
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.ALLERGIES]: getKnownAllergies(dealProps),
    // Waiting on Sara: whether Comorbid Diagnosis gets the same treatment as
    // Maladaptive Behaviors (parent/guardian field, clinical values merged in).
    // This still reads comorbid_diagnosis__clinical.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.COMORBID_DIAGNOSIS]: toTrimmedOrNull(
      dealProps.comorbid_diagnosis__clinical
    ),
    // Section 4 Primary BT 1 (76) and Primary BT 2 (143). Read the Case rollups.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_1_NAME]: toTrimmedOrNull(dealProps.current_primary_bt),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_2_NAME]: toTrimmedOrNull(dealProps.current_primary_bt_2),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.WORK_SCHEDULE_1]: scheduleValue(
      dealProps.work_schedule_details,
      dealProps.work_schedule_1_details__for_location_2_other,
      dealProps.bt_work_schedule_confirmed
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.WORK_SCHEDULE_2]: scheduleValue(
      dealProps.btrbt_work_schedule_2_details,
      dealProps.work_schedule_2_details__for_location_2_other,
      dealProps.bt_work_schedule_2_confirmed
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.CLIENT_AVAILABILITY]: preferText(
      dealProps.finalized_client_service_hours_post_assessment,
      dealProps.client_availability_completed
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.TOTAL_ASSIGNED_HOURS]: preferText(
      dealProps.total_hours_bt1bt2_work_schedule,
      preferText(dealProps.client_service_hours_total, dealProps.assigned_hours)
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.APPROVED_AUTH_HOURS]: getApprovedAuthHours(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.AUTH_PERIOD]: getAuthPeriodValue(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.PHYSICIAN_CREDENTIALS]:
      getPhysicianCredentialsByInsuranceType(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.ASD_DIAGNOSIS_DATE]:
      getAsdDiagnosisDateByInsuranceType(dealProps),
    // Field 138701 is Date of Most Recent ASD Diagnosis Medicaid FFS NY.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.ASD_DIAGNOSIS_DATE_MEDICAID_FFS_NY]:
      getMedicaidFfsAsdDiagnosisDate(dealProps),
    // Section 3 supervising BCBA is the billing text field. The Case rollup is the fallback.
    // reassessment_bcba_name is the Case rollup for the RE BCBA association.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SUPERVISING_BCBA]: preferText(
      dealProps.ongoing_central_reach_provider_supplier,
      dealProps.supervising_bcba
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.INITIAL_ASSESSMENT_BCBA]: toTrimmedOrNull(
      dealProps.initial_assessment_bcba
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.REASSESSMENT_BCBA]: toTrimmedOrNull(
      dealProps.reassessment_bcba_name
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL]: toTrimmedOrNull(
      dealProps.severity_level_clinical
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_NAME]: toTrimmedOrNull(
      dealProps.policy_holder_name
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_DOB]: toMetadataDate(
      dealProps.phi__policy_holder_dob
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.CURRENT_INSURANCE]:
      getCurrentInsuranceMetaValue(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.INSURANCE_ID]: getInsuranceIdForMetaField(dealProps, 1),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE]:
      getSecondaryInsuranceMetaValue(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE_ID]: toTrimmedOrNull(
      dealProps.insurance_id_2
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.DIAGNOSIS]: getDiagnosisValue(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRING_PHYSICIAN_MEDICAID_ID]: toTrimmedOrNull(
      dealProps.referring_provider_medicaid_id
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRAL_SOURCE]: toTrimmedOrNull(dealProps.referral_source),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.IMPORTANT_INFORMATION_PARENT]: toTrimmedOrNull(
      dealProps.important_information
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS]:
      serviceLocationAddress(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS_2]:
      serviceLocationAddress2(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.HUBSPOT_LINK_TO_CASE_RECORD]: buildHubspotDealUrl(
      dealProps.hs_object_id
    )
  };

  const parentMaladaptive = formatCheckbox(dealProps.maladaptive_behaviors__parentguardian);
  if (parentMaladaptive) {
    metadataValues[CENTRAL_REACH_CLIENT_METADATA_FIELDS.MALADAPTIVE_BEHAVIORS] = parentMaladaptive;
  }

  return {
    labelIds: requiredClientLabelIds(dealProps),
    metadataValues
  };
}
