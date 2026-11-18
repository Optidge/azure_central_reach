import {
  CENTRAL_REACH_EMPLOYEE_LABELS,
  CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS
} from "../../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { readDate } from "../../lib/dates.mjs";

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

// Guide [G17]: send workday_id, or the HubSpot record ID when workday_id is blank.
// A linked update replaces this with the id Central Reach already holds.
export function externalSystemIdForCreate(properties, recordId) {
  const workdayId = trimOrNull(properties?.workday_id);
  if (workdayId) {
    return workdayId;
  }
  return String(recordId ?? "").trim();
}

function employeeDateFields(properties) {
  if (!Object.prototype.hasOwnProperty.call(properties || {}, "date_of_birth")) {
    return { dateOfBirth: null, dateOfBirthStatus: "missing" };
  }
  const read = readDate(properties.date_of_birth);
  if (read === "blank" || read === "unreadable") {
    return { dateOfBirth: null, dateOfBirthStatus: read };
  }
  return { dateOfBirth: read, dateOfBirthStatus: "date" };
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

function requiredBtRbtLabels({ btRbtType, stateCode }) {
  const labels = [CENTRAL_REACH_EMPLOYEE_LABELS.ALL_EMPLOYEES];
  if (stateCode === "NY") {
    labels.push(
      CENTRAL_REACH_EMPLOYEE_LABELS.BT_NY,
      CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL,
      CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE
    );
    if (btRbtType === "RBT") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NY);
    }
  }
  if (stateCode === "CO") {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL, CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE);
    if (btRbtType === "BT" || btRbtType === "RBT") {
      labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.RBT_CO);
    }
  }
  return labels;
}

function requiredBcbaLabels({ stateCode }) {
  const labels = [
    CENTRAL_REACH_EMPLOYEE_LABELS.ALL_EMPLOYEES,
    CENTRAL_REACH_EMPLOYEE_LABELS.BCBA,
    CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL
  ];
  if (stateCode === "NY") {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE);
  }
  if (stateCode === "CO") {
    labels.push(CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE);
  }
  return labels;
}

function buildBtRbtPayload({ record, config }) {
  const properties = record?.properties || {};
  const recordId = properties.hs_object_id || record?.id;
  const dateFields = employeeDateFields(properties);
  const stateCode = normalizeStateCode(properties.location_home);
  const btRbtType = String(properties.bt_rbt_type || "").trim().toUpperCase() || null;

  const employeePayload = {
    externalSystemId: externalSystemIdForCreate(properties, recordId),
    firstName: trimOrNull(properties.first_name),
    lastName: trimOrNull(properties.last_name),
    gender: mapGender(properties.gender),
    dateOfBirth: dateFields.dateOfBirth,
    primaryEmail: cleanEmail(properties.email),
    addressLine1: trimOrNull(properties.street_home),
    addressLine2: trimOrNull(properties.home_apt),
    city: trimOrNull(properties.location_city),
    stateProvince: stateCode,
    zipPostalCode: trimOrNull(properties.postal_code_home) || trimOrNull(properties.postal_code),
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
  // Guide [GER-BT] "Active Case Load": display-only, from active_cases_count. Zero is a valid value.
  const activeCaseCount = trimOrNull(properties.active_cases_count);
  if (activeCaseCount !== null) {
    metadataValues[CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.ACTIVE_CASE_COUNT] = activeCaseCount;
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
    requiredLabelIds: requiredBtRbtLabels({ btRbtType, stateCode }),
    stateCode,
    employeeFamily: HUBSPOT_EMPLOYEE_TYPES.BT_RBT,
    emailField: "email",
    dateOfBirthStatus: dateFields.dateOfBirthStatus
  };
}

function buildBcbaPayload({ record, config }) {
  const properties = record?.properties || {};
  const recordId = properties.hs_object_id || record?.id;
  const dateFields = employeeDateFields(properties);
  const stateCode = normalizeStateCode(properties.home_state);

  const employeePayload = {
    externalSystemId: externalSystemIdForCreate(properties, recordId),
    firstName: trimOrNull(properties.first_name),
    lastName: trimOrNull(properties.last_name),
    dateOfBirth: dateFields.dateOfBirth,
    primaryEmail: cleanEmail(properties.ucaba_email_address),
    addressLine1: trimOrNull(properties.address),
    addressLine2: trimOrNull(properties.home_apt),
    city: trimOrNull(properties.city_work),
    stateProvince: stateCode,
    phoneCell: normalizePhone(properties.employee_phone)
  };

  const hubspotRecordUrl = buildHubspotRecordUrl({
    portalId: config?.hubspot?.hubspotPortalId,
    objectTypeId: config?.hubspot?.bcbaObjectTypeId,
    recordId: properties.hs_object_id || record?.id
  });

  const metadataValues = {
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
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_NY]: trimOrNull(
      properties.credentialed_insurances__ny
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
    requiredLabelIds: requiredBcbaLabels({ stateCode }),
    stateCode,
    employeeFamily: HUBSPOT_EMPLOYEE_TYPES.BCBA,
    emailField: "ucaba_email_address",
    dateOfBirthStatus: dateFields.dateOfBirthStatus
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
