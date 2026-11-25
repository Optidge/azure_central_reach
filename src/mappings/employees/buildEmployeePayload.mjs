import {
  CENTRAL_REACH_EMPLOYEE_LABELS,
  CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS
} from "../../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { readTextDate } from "../../lib/dates.mjs";
import {
  createValueReader,
  readEmail,
  readGender,
  readPhone,
  readStateCode
} from "../../lib/fieldFormats.mjs";
import { careCoordinatorValue } from "../shared/careCoordinator.mjs";

// The employee side accepts m / f as well as male / female (kept from before F-1).
const GENDER_OPTIONS = Object.freeze({ allowInitials: true });

function trimOrNull(value) {
  const stringValue = String(value ?? "").trim();
  return stringValue || null;
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

// The HubSpot property each employee type reads its date of birth from. Both are `date_of_birth`
// and both are text in production (EMP §1, 2026-11-23): the BT/RBT one is a property sync from the
// Contact's text `date_of_birth` (item 16), the BCBA one plain text (item 1, O-10; Zeke 2026-11-23
// "use date_of_birth", replacing `dob` of decision 48). `readTextDate` converts the typed forms to
// YYYY-MM-DD, the format sent to CentralReach `dateOfBirth`. Blank on a create sends the
// placeholder (centralReachClient.mjs, create only).
export const BT_RBT_DATE_OF_BIRTH_PROPERTY = "date_of_birth";
export const BCBA_DATE_OF_BIRTH_PROPERTY = "date_of_birth";

// B4 (decision 49, 2026-11-21): the BCBA CentralReach primaryEmail is the BCBA record's own
// `email`, not `ucaba_email_address`.
export const BCBA_PRIMARY_EMAIL_PROPERTY = "email";

// B9 and T9 (decision 50, 2026-11-23): CentralReach Meta 138069 Personal Email reads
// `personal_email` (label "Personal Email (backup only, never emailed)") on the BCBA and on the
// BT/RBT. The primary email stays on `email`.
export const EMPLOYEE_PERSONAL_EMAIL_PROPERTY = "personal_email";

function employeeDateFields(properties, property) {
  if (!Object.prototype.hasOwnProperty.call(properties || {}, property)) {
    return { dateOfBirth: null, dateOfBirthStatus: "missing" };
  }
  const read = readTextDate(properties[property]);
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
// New Mexico and Virginia are `location` options too, but their mapping is deferred until the
// client starts work in these states (package item 11), so they are not here (BL3, TL2; O-6).
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
// A type that is blank, or any other value (such as "BT to RBT": a sandbox option, and a hidden
// option in production too; the production read of 2026-11-24 found 1 record holding it),
// manages no role label, so a role label the person already holds in CentralReach is left alone.
// The state labels are always managed.
function managedBtRbtLabels(btRbtType) {
  const stateLabelIds = Object.values(STATE_LABELS);
  return Object.hasOwn(ROLE_LABELS, btRbtType ?? "")
    ? [...stateLabelIds, ...ALL_ROLE_LABEL_IDS]
    : stateLabelIds;
}

// BL5, BL6, row 5.6 (Zeke 2026-11-25, "BCBA label group settled"): the BCBA credential labels, read
// from the three per-state multi-checkboxes, keyed by the option's stored value. The CentralReach
// labels are stateless, so the same payor in two states sends its label once.
// `null`: a known option with no CentralReach label (MCD-NJ, Horizon-NJ); it sends nothing and raises
// no warning. An option not listed here (a renamed option, say) also sends nothing, so its label is
// removed, and raises `unmapped_credential_option`. `credentialed_insurances__ny` is never read.
// The NJ options `Aetna` and `Cigna` exist in production only (2026-11-25 option read).
export const BCBA_CREDENTIAL_LABELS_BY_PROPERTY = Object.freeze({
  ny_insurance_labels: Object.freeze({
    "MCD FFS-NY": CENTRAL_REACH_EMPLOYEE_LABELS.NY_MEDICAID,
    "Aetna-NY": CENTRAL_REACH_EMPLOYEE_LABELS.AETNA,
    "Cigna-NY": CENTRAL_REACH_EMPLOYEE_LABELS.CIGNA,
    "Carelon-NY": CENTRAL_REACH_EMPLOYEE_LABELS.CARELON
  }),
  co_insurance_labels: Object.freeze({
    "MCD-CO": CENTRAL_REACH_EMPLOYEE_LABELS.CO_MEDICAID,
    "Aetna-CO": CENTRAL_REACH_EMPLOYEE_LABELS.AETNA,
    "Cigna-CO": CENTRAL_REACH_EMPLOYEE_LABELS.CIGNA,
    "Carelon-CO": CENTRAL_REACH_EMPLOYEE_LABELS.CARELON
  }),
  nj_insurance_labels: Object.freeze({
    Aetna: CENTRAL_REACH_EMPLOYEE_LABELS.AETNA,
    Cigna: CENTRAL_REACH_EMPLOYEE_LABELS.CIGNA,
    "MCD-NJ": null,
    "Horizon-NJ": null
  })
});

const CREDENTIAL_LABEL_IDS = [
  ...new Set(
    Object.values(BCBA_CREDENTIAL_LABELS_BY_PROPERTY)
      .flatMap((options) => Object.values(options))
      .filter(Boolean)
  )
];

// The credential labels the ticked options require, with no duplicates.
function requiredCredentialLabels(properties) {
  const labelIds = Object.entries(BCBA_CREDENTIAL_LABELS_BY_PROPERTY).flatMap(([property, options]) =>
    multiCheckboxValues(properties[property])
      .filter((option) => Object.hasOwn(options, option))
      .map((option) => options[option])
  );
  return [...new Set(labelIds.filter(Boolean))];
}

// Review F1: one warning per credential property holding an option the table does not list, by
// property name only (BR21). It changes no label and does not stop the sync.
function unmappedCredentialOptionWarnings(properties) {
  return Object.entries(BCBA_CREDENTIAL_LABELS_BY_PROPERTY)
    .filter(([property, options]) =>
      multiCheckboxValues(properties[property]).some((option) => !Object.hasOwn(options, option))
    )
    .map(([property]) => ({
      code: "unmapped_credential_option",
      message: `${property} holds an option with no CentralReach mapping; no credential label is sent for it.`
    }));
}

const BCBA_MANAGED_LABEL_IDS = Object.freeze([
  ...Object.values(STATE_LABELS),
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_COLORADO,
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NJ,
  CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NY,
  CENTRAL_REACH_EMPLOYEE_LABELS.GRAD_STUDENT_LBA_NY,
  ...CREDENTIAL_LABEL_IDS,
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
    // BL5, BL6, row 5.6: NY Medicaid, CO Medicaid, Aetna, Cigna and Carelon.
    ...requiredCredentialLabels(properties),
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
  const dateFields = employeeDateFields(properties, BT_RBT_DATE_OF_BIRTH_PROPERTY);
  // F-1: a filled phone, email, state or gender that cannot be converted is named in
  // unreadableValueProperties and sent as nothing; the worker ends the run as `error`.
  const { valueOf, unreadableValueProperties } = createValueReader(properties);
  // T4, row 5.9: the mailing state is state_home. The Work States (`location`) drive the labels.
  const stateCode = valueOf(readStateCode, "state_home");
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
    gender: valueOf(readGender, "gender", GENDER_OPTIONS),
    dateOfBirth: dateFields.dateOfBirth,
    primaryEmail: valueOf(readEmail, "email"),
    addressLine1: trimOrNull(properties.street_home),
    // T5: home_apt stays as line 2 until O-20 is decided.
    addressLine2: trimOrNull(properties.home_apt),
    city: trimOrNull(properties.location_city),
    stateProvince: stateCode,
    zipPostalCode: trimOrNull(properties.postal_code_home),
    phoneCell: valueOf(readPhone, "employee_phone")
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

  // T9 held (2026-11-23): BT/RBT personal email is not sent until the field is confirmed with Danny and the client (O-51).
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
    dateOfBirthField: BT_RBT_DATE_OF_BIRTH_PROPERTY,
    dateOfBirthStatus: dateFields.dateOfBirthStatus,
    unreadableValueProperties
  };
}

function buildBcbaPayload({ record, config }) {
  const properties = record?.properties || {};
  const recordId = properties.hs_object_id || record?.id;
  const dateFields = employeeDateFields(properties, BCBA_DATE_OF_BIRTH_PROPERTY);
  // B7, row 5.2: the mailing address reads the Contact mirrors. The Work States (`location`) drive
  // the labels.
  const { valueOf, unreadableValueProperties } = createValueReader(properties);
  const stateCode = valueOf(readStateCode, "state_home");
  const { workStates, warnings } = readWorkStates(properties);
  warnings.push(...unmappedCredentialOptionWarnings(properties));

  const employeePayload = {
    externalSystemId: externalSystemIdForCreate(properties, recordId),
    firstName: trimOrNull(properties.first_name),
    lastName: trimOrNull(properties.last_name),
    // B6, row 5.1: gender_new, never the archived gender.
    gender: valueOf(readGender, "gender_new", GENDER_OPTIONS),
    dateOfBirth: dateFields.dateOfBirth,
    primaryEmail: valueOf(readEmail, BCBA_PRIMARY_EMAIL_PROPERTY),
    addressLine1: trimOrNull(properties.address),
    addressLine2: trimOrNull(properties.apartment__home),
    city: trimOrNull(properties.city_home),
    stateProvince: stateCode,
    zipPostalCode: trimOrNull(properties.postal_code_home),
    phoneCell: valueOf(readPhone, "employee_phone")
  };

  const hubspotRecordUrl = buildHubspotRecordUrl({
    portalId: config?.hubspot?.hubspotPortalId,
    objectTypeId: config?.hubspot?.bcbaObjectTypeId,
    recordId: properties.hs_object_id || record?.id
  });

  const metadataValues = {
    // B9, row 6.4 (decision 50): the personal email is the BCBA record's own `personal_email`,
    // not `email` (which feeds primaryEmail only). Blank sends a blank, like the other BCBA
    // metadata fields. A filled email that fails the format check is unreadable (F-1).
    [CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.PERSONAL_EMAIL]: valueOf(
      readEmail,
      EMPLOYEE_PERSONAL_EMAIL_PROPERTY
    ),
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

  // B11 (O-17): Care Coordinator 140495, the same rule as the Case 138851. Not ready: the key is
  // left out and the worker's omit list names 140495, so it is not sent and not cleared.
  const coordinator = careCoordinatorValue(properties);
  if (coordinator.warning) {
    warnings.push(coordinator.warning);
  }
  if (!coordinator.omit) {
    metadataValues[CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CARE_COORDINATOR] = coordinator.value;
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
    emailField: BCBA_PRIMARY_EMAIL_PROPERTY,
    dateOfBirthField: BCBA_DATE_OF_BIRTH_PROPERTY,
    dateOfBirthStatus: dateFields.dateOfBirthStatus,
    unreadableValueProperties
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
export function buildEmployeePayload({ record, employeeType, config }) {
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BT_RBT) {
    return buildBtRbtPayload({ record, config });
  }
  if (employeeType === HUBSPOT_EMPLOYEE_TYPES.BCBA) {
    return buildBcbaPayload({ record, config });
  }
  throw new Error("Unsupported employeeType");
}
