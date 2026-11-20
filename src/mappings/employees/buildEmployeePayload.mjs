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

// A HubSpot multi-checkbox stores its ticked options joined by ";".
function multiCheckboxValues(value) {
  return String(value ?? "")
    .split(";")
    .map((option) => option.trim())
    .filter(Boolean);
}

// Contract P.5 (d). The Work State(s) options of HubSpot `location` that have a code today.
// New Mexico and Virginia have no HubSpot value yet, so they are not here (BL3, TL2; O-6).
const WORK_STATE_CODES = {
  Colorado: "CO",
  "New Jersey": "NJ",
  "New York": "NY"
};

// One state label per Work State (BL2, TL1).
const STATE_LABELS = {
  CO: CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE,
  NJ: CENTRAL_REACH_EMPLOYEE_LABELS.NJ_EMPLOYEE,
  NY: CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE
};

// TL3, row 5.12: bt_rbt_type by Work State. A BT gets Behavior Technician, an RBT gets RBT.
const ROLE_LABELS = {
  BT: {
    CO: CENTRAL_REACH_EMPLOYEE_LABELS.BT_CO,
    NJ: CENTRAL_REACH_EMPLOYEE_LABELS.BT_NJ,
    NY: CENTRAL_REACH_EMPLOYEE_LABELS.BT_NY
  },
  RBT: {
    CO: CENTRAL_REACH_EMPLOYEE_LABELS.RBT_CO,
    NJ: CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NJ,
    NY: CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NY
  }
};

// The labels the integration manages for a BT/RBT or a BCBA. A managed label that is not required
// is removed (rule 5.6). The base labels (All Employees, Clinical, the BCBA header) are never in
// these lists.
const ALL_ROLE_LABEL_IDS = Object.freeze([
  ...Object.values(ROLE_LABELS.BT),
  ...Object.values(ROLE_LABELS.RBT)
]);

// Decision 35 (row 5.12): the six role labels are managed only when bt_rbt_type is BT or RBT.
// A type that is blank, or any other value (production also has "BT to RBT"), manages no role
// label, so a role label the person already holds in CentralReach is left alone. The state
// labels are always managed.
function managedBtRbtLabels(btRbtType) {
  const stateLabelIds = Object.values(STATE_LABELS);
  return Object.hasOwn(ROLE_LABELS, btRbtType ?? "")
    ? [...stateLabelIds, ...ALL_ROLE_LABEL_IDS]
    : stateLabelIds;
}

const BCBA_MANAGED_LABEL_IDS = Object.freeze([
  ...Object.values(STATE_LABELS),
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_COLORADO,
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NJ,
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NY,
  CENTRAL_REACH_EMPLOYEE_LABELS.GRAD_STUDENT_LBA_NY,
  CENTRAL_REACH_EMPLOYEE_LABELS.NY_MEDICAID,
  CENTRAL_REACH_EMPLOYEE_LABELS.SALARIED,
  CENTRAL_REACH_EMPLOYEE_LABELS.BILLING_HOLD_MEDICAID_AFFILIATION
]);

// Reads `location` into state codes, sorted, with no duplicates. An option with no code is left
// out and reported, by property name only.
function readWorkStates(properties) {
  const options = multiCheckboxValues(properties.location);
  const codes = options
    .filter((option) => Object.hasOwn(WORK_STATE_CODES, option))
    .map((option) => WORK_STATE_CODES[option]);
  const warnings = [];
  if (codes.length < options.length) {
    warnings.push({
      code: "unmapped_work_state",
      message:
        "location holds a Work State option with no CentralReach mapping; no state label is sent for it."
    });
  }
  return { workStates: [...new Set(codes)].sort(), warnings };
}

function requiredBtRbtLabels({ btRbtType, workStates }) {
  const roleLabels = Object.hasOwn(ROLE_LABELS, btRbtType ?? "") ? ROLE_LABELS[btRbtType] : {};
  return [
    CENTRAL_REACH_EMPLOYEE_LABELS.ALL_EMPLOYEES,
    CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL,
    ...workStates.map((code) => STATE_LABELS[code]),
    ...workStates.map((code) => roleLabels[code])
  ].filter(Boolean);
}

function requiredBcbaLabels({ properties, workStates }) {
  const assignStates = multiCheckboxValues(properties.assign_states);
  const lbaLicensure = trimOrNull(properties.lba_licensure__ny);
  return [
    CENTRAL_REACH_EMPLOYEE_LABELS.ALL_EMPLOYEES,
    CENTRAL_REACH_EMPLOYEE_LABELS.BCBA,
    CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL,
    ...workStates.map((code) => STATE_LABELS[code]),
    // BL4, row 5.5. lba_licensure__ny "No" (shown as "Will Apply") gets no label.
    assignStates.includes("Assign CO") && CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_COLORADO,
    assignStates.includes("Assign NJ") && CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NJ,
    lbaLicensure === "Yes" && CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NY,
    lbaLicensure === "Grad Permit" && CENTRAL_REACH_EMPLOYEE_LABELS.GRAD_STUDENT_LBA_NY,
    // BL5, row 5.6. The other credential options have no documented label (BL6) and send nothing.
    multiCheckboxValues(properties.ny_insurance_labels).includes("MCD FFS-NY") &&
      CENTRAL_REACH_EMPLOYEE_LABELS.NY_MEDICAID,
    // B10, row 5.7.
    trimOrNull(properties.work_status) === "Salaried" && CENTRAL_REACH_EMPLOYEE_LABELS.SALARIED,
    // BL7, row 5.8.
    trimOrNull(properties.cr_billing_hold_label) === "Yes" &&
      CENTRAL_REACH_EMPLOYEE_LABELS.BILLING_HOLD_MEDICAID_AFFILIATION
  ].filter(Boolean);
}

function buildBtRbtPayload({ record, config }) {
  const properties = record?.properties || {};
  const recordId = properties.hs_object_id || record?.id;
  const dateFields = employeeDateFields(properties);
  // T4, row 5.9: the mailing state is state_home. The Work States (`location`) drive the labels.
  const stateCode = normalizeStateCode(properties.state_home);
  const { workStates, warnings } = readWorkStates(properties);
  const btRbtType = String(properties.bt_rbt_type || "").trim().toUpperCase() || null;
  if (btRbtType && !Object.hasOwn(ROLE_LABELS, btRbtType)) {
    warnings.push({
      code: "unmapped_bt_rbt_type",
      message: "bt_rbt_type holds a value that is not BT or RBT; no role label is sent or removed."
    });
  }

  const employeePayload = {
    externalSystemId: externalSystemIdForCreate(properties, recordId),
    firstName: trimOrNull(properties.first_name),
    lastName: trimOrNull(properties.last_name),
    gender: mapGender(properties.gender),
    dateOfBirth: dateFields.dateOfBirth,
    primaryEmail: cleanEmail(properties.email),
    addressLine1: trimOrNull(properties.street_home),
    // T5: home_apt stays as line 2 until O-20 is decided.
    addressLine2: trimOrNull(properties.home_apt),
    city: trimOrNull(properties.location_city),
    stateProvince: stateCode,
    zipPostalCode: trimOrNull(properties.postal_code_home),
    phoneCell: normalizePhone(properties.employee_phone)
  };

  // T6, row 5.10: "street, apartment, city, state zip".
  const workAddress = [
    [
      trimOrNull(properties.street_address__work_),
      trimOrNull(properties.apartment__work),
      trimOrNull(properties.city__work_)
    ]
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
    requiredLabelIds: requiredBtRbtLabels({ btRbtType, workStates }),
    managedLabelIds: managedBtRbtLabels(btRbtType),
    workStates,
    stateCode,
    employeeFamily: HUBSPOT_EMPLOYEE_TYPES.BT_RBT,
    emailField: "email",
    dateOfBirthStatus: dateFields.dateOfBirthStatus
  };
}

function buildBcbaPayload({ record, config, contactEmail }) {
  const properties = record?.properties || {};
  const recordId = properties.hs_object_id || record?.id;
  const dateFields = employeeDateFields(properties);
  // B7, row 5.2: the mailing address reads the Contact mirrors. The Work States (`location`) drive
  // the labels.
  const stateCode = normalizeStateCode(properties.state_home);
  const { workStates, warnings } = readWorkStates(properties);

  const employeePayload = {
    externalSystemId: externalSystemIdForCreate(properties, recordId),
    firstName: trimOrNull(properties.first_name),
    lastName: trimOrNull(properties.last_name),
    // B6, row 5.1: gender_new, never the archived gender.
    gender: mapGender(properties.gender_new),
    dateOfBirth: dateFields.dateOfBirth,
    primaryEmail: cleanEmail(properties.ucaba_email_address),
    addressLine1: trimOrNull(properties.address),
    addressLine2: trimOrNull(properties.apartment__home),
    city: trimOrNull(properties.city_home),
    stateProvince: stateCode,
    zipPostalCode: trimOrNull(properties.postal_code_home),
    phoneCell: normalizePhone(properties.employee_phone)
  };

  const hubspotRecordUrl = buildHubspotRecordUrl({
    portalId: config?.hubspot?.hubspotPortalId,
    objectTypeId: config?.hubspot?.bcbaObjectTypeId,
    recordId: properties.hs_object_id || record?.id
  });

  const metadataValues = {
    // B9, row 6.4: the personal email is the email of the BCBA's Contact, which the worker reads
    // and passes in. Not passed (the Contact could not be read): the key is left out, and the
    // worker names the field in omitFieldIds (contract P.5 (c) below).
    ...(contactEmail === undefined
      ? {}
      : { [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_EMAIL]: cleanEmail(contactEmail) }),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY]: trimOrNull(
      properties.medicaid_id__ny
    ),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NJ]: trimOrNull(
      properties.medicaid_id__nj
    ),
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_CO]: trimOrNull(
      properties.medicaid_id__co
    )
  };

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
    requiredLabelIds: requiredBcbaLabels({ properties, workStates }),
    managedLabelIds: [...BCBA_MANAGED_LABEL_IDS],
    workStates,
    stateCode,
    employeeFamily: HUBSPOT_EMPLOYEE_TYPES.BCBA,
    emailField: "ucaba_email_address",
    dateOfBirthStatus: dateFields.dateOfBirthStatus
  };
}

// CONTRACT P.5 (a): labels. Every mapper returns two lists of CentralReach label IDs (rule 5.6).
//   requiredLabelIds  the labels the record must hold now. The base labels are always in it.
//   managedLabelIds   the labels the integration manages for this record, required now or not
//                     (rows 5.4 to 5.8, 5.11, 5.12). For a BCBA the list is fixed. For a BT/RBT
//                     it always holds the three state labels, and holds the six role labels only
//                     when bt_rbt_type is BT or RBT (decision 35): with a blank or any other type
//                     no role label is required or removed, and a non-blank one adds the warning
//                     unmapped_bt_rbt_type, which names the property, never the value.
// The worker passes both to the label sender (contract (e) in src/lib/centralReachClient.mjs).
// The sender posts: what CentralReach holds, minus managed, plus required. Every ID in
// requiredLabelIds must be in CENTRAL_REACH_SENDABLE_LABEL_IDS (src/constants/centralReach.mjs).
// A remove-only ID may be in managedLabelIds and never in requiredLabelIds.
//
// CONTRACT P.5 (d): work states and the contact form (rule 5.9, row 5.13).
//   workStates  the record's Work State(s) from HubSpot `location`, as upper-case two-letter
//               state codes with no duplicates, for example ["CO", "NY"]. Empty when `location`
//               is blank. Returned for BT/RBT and for BCBA.
//               Only Colorado, New Jersey and New York have a code today. Any other `location`
//               option is left out of workStates, and the mapper adds a warning that names the
//               property, never the value. It is not an error: the record still syncs, gets no
//               state label for that option, and rule 5.9 picks the form from the codes left.
// The worker passes workStates to createOrUpdateEmployee on a create, and getEmployeeContactForm
// (src/lib/centralReachClient.mjs) picks the form from the employee type and these codes.
//
// CONTRACT P.5 (c), employee side: an input that could not be read (rule 5.8). The worker fills
// every field of knownMetadataFieldIds (employeeProperties.mjs) that the mapper leaves out with a
// blank, and a blank can become a clear. So leaving a key out is not enough here: the worker
// names the field ID in its omitFieldIds list (src/workflows/employeeSyncWorkflow.mjs), and that
// field is then not sent and not cleared. Row 3.18: the worker also keeps the field's saved hash
// in the link record and leaves the field out of the changed fields, so a later blank in HubSpot
// still sends the clear.
//   contactEmail  (BCBA only, row 6.4) the `email` of the Contact linked by BCBA -> Contact, as
//                 read by the worker: a text, or null when no Contact is linked or its email is
//                 blank (Meta 138069 is then blank). Left undefined when the Contact could not be
//                 read or more than one is linked: the mapper leaves 138069 out and the worker
//                 names it in omitFieldIds. Both mappings of one run get the same value.
export function buildEmployeePayload({ record, employeeType, config, contactEmail }) {
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT) {
    return buildBtRbtPayload({ record, config });
  }
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BCBA) {
    return buildBcbaPayload({ record, config, contactEmail });
  }
  throw new Error("Unsupported employeeType");
}
