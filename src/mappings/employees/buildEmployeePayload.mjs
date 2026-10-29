import {
  CENTRAL_REACH_EMPLOYEE_LABELS,
  CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS
} from "../../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";

const US_STATE_NAME_TO_CODE = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC"
};

function trimOrNull(value) {
  const stringValue = String(value ?? "").trim();
  return stringValue || null;
}

function cleanEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(-10);
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits || null;
}

function normalizeDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeStateCode(value) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }
  if (/^[A-Za-z]{2}$/.test(raw)) {
    return raw.toUpperCase();
  }
  const normalizedName = raw.replace(/\./g, "").replace(/\s+/g, " ").toUpperCase();
  return US_STATE_NAME_TO_CODE[normalizedName] || null;
}

function splitFullName(value) {
  const full = String(value ?? "").trim();
  if (!full) {
    return { firstName: null, lastName: null };
  }
  const parts = full.split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: null, lastName: null };
  }
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null
  };
}

function mapGender(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "male" || normalized === "m") {
    return "Male";
  }
  if (normalized === "female" || normalized === "f") {
    return "Female";
  }
  return null;
}

function buildHubspotRecordUrl({ portalId, objectTypeId, recordId }) {
  const portal = String(portalId || "").trim();
  const type = String(objectTypeId || "").trim();
  const id = String(recordId || "").trim();
  if (!portal || !type || !id) {
    return null;
  }
  return `https://app.hubspot.com/contacts/${portal}/record/${type}/${id}`;
}

function buildMissingPortalWarning() {
  return {
    code: "missing_hubspot_portal_id",
    message: "HUBSPOT_PORTAL_ID is not set; skipping HubSpot record link metadata writeback."
  };
}

function checkboxTokens(value) {
  return String(value ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function workStateCodes(locationValue, fallbackValue) {
  const codes = [];
  const seen = new Set();
  const add = (code) => {
    // Waiting on United Care: New Mexico and Virginia have no CentralReach
    // BCBA or BT labels yet. Only NY, NJ, and CO are applied.
    if ((code === "NY" || code === "NJ" || code === "CO") && !seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  };
  for (const token of checkboxTokens(locationValue)) {
    add(normalizeStateCode(token));
  }
  if (!codes.length) {
    add(normalizeStateCode(fallbackValue));
  }
  return codes;
}

function checkboxIncludes(value, token) {
  return checkboxTokens(value).includes(token);
}

function requiredBtRbtLabels({ btRbtType, stateCodes }) {
  const labels = [CENTRAL_REACH_EMPLOYEE_LABELS.ALL_EMPLOYEES];
  const type = String(btRbtType || "").trim().toUpperCase();
  for (const stateCode of stateCodes) {
    if (stateCode === "NY" || stateCode === "NJ" || stateCode === "CO") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL);
    }
    if (stateCode === "NY") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE);
      if (type === "BT") {
        labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.BT_NY);
      }
      if (type === "RBT") {
        labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NY);
      }
    }
    if (stateCode === "NJ") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.NJ_EMPLOYEE);
      if (type === "BT") {
        labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.BT_NJ);
      }
      if (type === "RBT") {
        labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NJ);
      }
    }
    if (stateCode === "CO") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE);
      if (type === "BT") {
        labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.BT_CO);
      }
      if (type === "RBT") {
        labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.RBT_CO);
      }
    }
  }
  return labels;
}

function addBcbaCredentialLabels(labels, { nyInsuranceLabels, coInsuranceLabels, billingHold }) {
  if (checkboxIncludes(nyInsuranceLabels, "MCD FFS-NY")) {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_NY_MEDICAID);
  }
  if (checkboxIncludes(nyInsuranceLabels, "Aetna-NY")) {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_AETNA);
  }
  if (checkboxIncludes(nyInsuranceLabels, "Cigna-NY")) {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_CIGNA);
  }
  if (checkboxIncludes(nyInsuranceLabels, "Carelon-NY")) {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_CARELON);
  }
  if (checkboxIncludes(coInsuranceLabels, "MCD-CO")) {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_CO_MEDICAID);
  }
  // Waiting on United Care: nj_insurance_labels, Aetna-CO, Cigna-CO, and
  // Carelon-CO are credentialed in HubSpot and have no CentralReach label.
  // Billing hold Yes adds 1103437. Setting it back to No does not remove
  // that label. The CentralReach client only adds labels.
  if (String(billingHold || "").trim() === "Yes") {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.BILLING_HOLD_MEDICAID_AFFILIATION);
  }
}

function requiredBcbaLabels({
  stateCodes,
  assignStates,
  lbaLicensureNy,
  workStatus,
  nyInsuranceLabels,
  coInsuranceLabels,
  billingHold
}) {
  const labels = [
    CENTRAL_REACH_EMPLOYEE_LABELS.ALL_EMPLOYEES,
    CENTRAL_REACH_EMPLOYEE_LABELS.BCBA,
    CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL
  ];
  for (const stateCode of stateCodes) {
    if (stateCode === "NY") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE);
    }
    if (stateCode === "NJ") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.NJ_EMPLOYEE);
    }
    if (stateCode === "CO") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE);
    }
  }
  if (checkboxIncludes(assignStates, "Assign CO")) {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_COLORADO);
  }
  if (checkboxIncludes(assignStates, "Assign NJ")) {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NJ);
  }
  const licensure = String(lbaLicensureNy || "").trim();
  if (licensure === "Yes") {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NY);
  }
  if (licensure === "Grad Permit") {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.GRAD_STUDENT_LBA_NY);
  }
  if (String(workStatus || "").trim() === "Salaried") {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.SALARIED);
  }
  addBcbaCredentialLabels(labels, { nyInsuranceLabels, coInsuranceLabels, billingHold });
  return labels;
}

function legalName(properties, fullNameKey) {
  const firstName = trimOrNull(properties.first_name);
  const lastName = trimOrNull(properties.last_name);
  if (firstName || lastName) {
    return { firstName, lastName };
  }
  return splitFullName(properties[fullNameKey]);
}

function buildBtRbtPayload({ record, config }) {
  const properties = record?.properties || {};
  const { firstName, lastName } = legalName(properties, "bt_name");
  const stateCode = normalizeStateCode(properties.state_home || properties.location_home);
  const stateCodes = workStateCodes(properties.location, properties.location_home);
  const btRbtType = String(properties.bt_rbt_type || "").trim().toUpperCase() || null;

  const employeePayload = {
    externalSystemId: String(properties.hs_object_id || record?.id || ""),
    firstName,
    lastName,
    gender: mapGender(properties.gender),
    dateOfBirth: normalizeDate(properties.date_of_birth),
    primaryEmail: cleanEmail(properties.email),
    addressLine1: trimOrNull(properties.street_home),
    addressLine2: trimOrNull(properties.home_apt),
    city: trimOrNull(properties.location_city),
    stateProvince: stateCode,
    zipPostalCode: trimOrNull(properties.postal_code_home),
    // Section 6: Contact phone, read from the BT/RBT mirror `employee_phone`.
    phoneCell: normalizePhone(properties.employee_phone)
  };

  const workAddress = [
    [trimOrNull(properties.street_address__work_), trimOrNull(properties.city__work_)]
      .filter(Boolean)
      .join(", "),
    [trimOrNull(properties.state__work_), trimOrNull(properties.postal_code__work_)]
      .filter(Boolean)
      .join(" ")
  ]
    .filter(Boolean)
    .join(", ");

  const hubspotRecordUrl = buildHubspotRecordUrl({
    portalId: config?.hubspot?.hubspotPortalId,
    objectTypeId: config?.hubspot?.btRbtObjectTypeId,
    recordId: properties.hs_object_id || record?.id
  });

  const metadataValues = {};
  const warnings = [];
  if (workAddress) {
    metadataValues[CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.WORK_ADDRESS] = workAddress;
  }
  if (hubspotRecordUrl) {
    metadataValues[CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD] =
      hubspotRecordUrl;
  } else if (!String(config?.hubspot?.hubspotPortalId || "").trim()) {
    warnings.push(buildMissingPortalWarning());
  }

  return {
    employeePayload,
    metadataValues,
    warnings,
    requiredLabelIds: requiredBtRbtLabels({ btRbtType, stateCodes }),
    stateCode,
    employeeFamily: HUBSPOT_EMPLOYEE_TYPES.BT_RBT
  };
}

function credentialFromLabels(labelValue, token, fallback) {
  if (checkboxTokens(labelValue).length) {
    return checkboxIncludes(labelValue, token) ? token : null;
  }
  return trimOrNull(fallback);
}

function buildBcbaPayload({ record, config }) {
  const properties = record?.properties || {};
  const { firstName, lastName } = legalName(properties, "bcba_name");
  const stateCode = normalizeStateCode(properties.state_home || properties.home_state);
  const stateCodes = workStateCodes(properties.location, properties.home_state);

  const employeePayload = {
    externalSystemId: String(properties.hs_object_id || record?.id || ""),
    firstName,
    lastName,
    dateOfBirth: normalizeDate(properties.date_of_birth),
    // Section 5 work email is ucaba_email_address. work_email remains the fallback.
    primaryEmail: cleanEmail(properties.ucaba_email_address) || cleanEmail(properties.work_email),
    addressLine1: trimOrNull(properties.address),
    addressLine2: trimOrNull(properties.apartment__home) || trimOrNull(properties.home_apt),
    city: trimOrNull(properties.city_home) || trimOrNull(properties.city_work),
    stateProvince: stateCode,
    zipPostalCode: trimOrNull(properties.postal_code_home),
    // Section 5: Contact phone, read from the BCBA mirror `employee_phone`.
    phoneCell: normalizePhone(properties.employee_phone)
  };

  const hubspotRecordUrl = buildHubspotRecordUrl({
    portalId: config?.hubspot?.hubspotPortalId,
    objectTypeId: config?.hubspot?.bcbaObjectTypeId,
    recordId: properties.hs_object_id || record?.id
  });

  const metadataValues = {
    // Section 5 personal email is the BCBA Contact. Read the BCBA sync (`email`).
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_EMAIL]: cleanEmail(properties.email),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY]: trimOrNull(
      properties.medicaid_id__ny
    ),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NJ]: trimOrNull(
      properties.medicaid_id__nj
    ),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_CO]: trimOrNull(
      properties.medicaid_id__co
    ),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_NY]:
      credentialFromLabels(
        properties.ny_insurance_labels,
        "MCD FFS-NY",
        properties.credentialed_insurances__ny
      ),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_AETNA]: credentialFromLabels(
      properties.ny_insurance_labels,
      "Aetna-NY",
      null
    ),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_CIGNA]: credentialFromLabels(
      properties.ny_insurance_labels,
      "Cigna-NY",
      null
    ),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_CO]: credentialFromLabels(
      properties.co_insurance_labels,
      "MCD-CO",
      null
    )
  };
  const warnings = [];

  if (hubspotRecordUrl) {
    metadataValues[CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BCBA_RECORD] =
      hubspotRecordUrl;
  } else if (!String(config?.hubspot?.hubspotPortalId || "").trim()) {
    warnings.push(buildMissingPortalWarning());
  }

  return {
    employeePayload,
    metadataValues,
    warnings,
    requiredLabelIds: requiredBcbaLabels({
      stateCodes,
      assignStates: properties.assign_states,
      lbaLicensureNy: properties.lba_licensure__ny,
      workStatus: properties.work_status,
      nyInsuranceLabels: properties.ny_insurance_labels,
      coInsuranceLabels: properties.co_insurance_labels,
      billingHold: properties.cr_billing_hold_label
    }),
    stateCode,
    employeeFamily: HUBSPOT_EMPLOYEE_TYPES.BCBA
  };
}

export function buildEmployeePayload({ record, employeeType, config }) {
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT) {
    return buildBtRbtPayload({ record, config });
  }
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BCBA) {
    return buildBcbaPayload({ record, config });
  }
  throw new Error("Unsupported employeeType");
}
