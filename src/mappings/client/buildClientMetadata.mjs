import {
  CENTRAL_REACH_CLIENT_LABELS,
  CENTRAL_REACH_CLIENT_METADATA_FIELDS,
  CENTRAL_REACH_CLIENT_STAFFING_LABELS,
  CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS,
  SUPERVISING_BCBA_SUFFIX
} from "../../constants/centralReach.mjs";
import { HUBSPOT_CASE_OBJECT_TYPE_ID } from "../../constants/hubspot.mjs";
import { readDate } from "../../lib/dates.mjs";
import { readCaseStateCode, readStateCode } from "../../lib/fieldFormats.mjs";

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

// The stored option, or its "Other" text when the option is Other and the text is filled: the
// insurance carrier and its "Other" summary (C29 primary, C30 secondary), and Referral Source and
// "Referral - Other" (C36, item 2). Other with a blank text sends "Other". A blank option sends a
// blank field, even when the "Other" text is filled.
function optionOrOtherText(optionValue, otherTextValue) {
  const option = toTrimmedOrNull(optionValue);
  const otherText = toTrimmedOrNull(otherTextValue);

  if (option && option.toLowerCase() === "other") {
    return otherText || "Other";
  }

  return option || null;
}

// C31, row 4.23 (decision 32). The six stored values of n1_what_type_of_insurance, read from the
// sandbox on 2026-11-20. Every Medicaid type uses the Medicaid pair. "Unsure", blank or any other
// value sends a blank field.
const MEDICAID_INSURANCE_TYPES = ["medicaid ffs", "medicaid ffs - nj", "medicaid ffs - co"];
const COMMERCIAL_INSURANCE_TYPES = ["commercial enrolled", "commercial oon"];

function joinWithSpace(parts) {
  const clean = parts.map((part) => toTrimmedOrNull(part)).filter(Boolean);
  return clean.length ? clean.join(" ") : null;
}

// C31 (item 4, CF §9.3): "<name> <npi>", one space and no comma, as CentralReach holds it. A
// trailing commas and spaces typed after the name are dropped, in any mix; a name of only commas
// is blank. Name only or NPI only: that part alone.
function physicianWithNpi(name, npi) {
  return joinWithSpace([toTrimmedOrNull(name)?.replace(/[\s,]+$/, ""), npi]);
}

function getPhysicianCredentialsByInsuranceType(dealProps) {
  const insuranceType = toTrimmedOrNull(dealProps.n1_what_type_of_insurance)?.toLowerCase();
  if (MEDICAID_INSURANCE_TYPES.includes(insuranceType)) {
    return physicianWithNpi(dealProps.physician_name, dealProps.npi_number);
  }

  if (COMMERCIAL_INSURANCE_TYPES.includes(insuranceType)) {
    return physicianWithNpi(dealProps.physician_name__commercial, dealProps.npi_number__commercial);
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

// C26, row 4.9 (package item 3; CF §10.3, §11.1). allergies stores Confirmed (shown as Yes) or
// Denial (shown as No). Real CentralReach holds the allergen text alone, and "None" for no
// allergy. Confirmed + explain: the explain, whitespace collapsed. Confirmed with a blank or
// none-like explain ("NA", "N/A", "none", "no", "-"): "Yes". Denial: "None", explain ignored.
const NONE_LIKE_EXPLAIN = /^(n\/?a|none|no|-+)\.?$/i;

function getKnownAllergies(dealProps) {
  const allergies = toTrimmedOrNull(dealProps.allergies);
  if (allergies === "Confirmed") {
    const explain = toTrimmedOrNull(dealProps.allergies__yes__explain)?.replace(/\s+/g, " ");
    return explain && !NONE_LIKE_EXPLAIN.test(explain) ? explain : "Yes";
  }
  if (allergies === "Denial") {
    return "None";
  }
  return null;
}

// C28 (package item 8; CF §10.2, §10.3). severity_level_clinical stores Level 1 to Level 3; real
// CentralReach holds the digit alone. Only `Level N` (any case or spacing) is sent as N; any
// other stored value is sent as stored.
function getSeverityLevel(dealProps) {
  const severity = toTrimmedOrNull(dealProps.severity_level_clinical);
  return severity?.match(/^Level\s*(\d+)$/i)?.[1] ?? severity;
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

// An apartment that only says "none" is blank (item 5, CF §12.4 rule 3).
const PLACEHOLDER_APARTMENT = /^(n\/?a|none|no|-+)\.?$/i;
const ZIP_AT_END = /\b\d{5}(-\d{4})?$/;
// The longest state name has three words ("District of Columbia").
const STATE_WORD_COUNTS = [1, 2, 3];

function addressPart(value) {
  return toTrimmedOrNull(value)?.replace(/\s+/g, " ") ?? null;
}

// A street that already holds a whole one-line address (CF §12.4 rule 4, tightened by O-59): a
// comma, a ZIP at the end, and a state (name or code) directly before the ZIP. "100 Main St,
// Suite 10001" and "PO Box, 12345" are streets, not whole addresses.
function holdsWholeAddress(streetText) {
  const zip = streetText.match(ZIP_AT_END);
  if (!streetText.includes(",") || !zip) {
    return false;
  }
  const words = streetText.slice(0, zip.index).replace(/,/g, " ").trim().split(/\s+/);
  return STATE_WORD_COUNTS.some(
    (count) => words.length > count && readStateCode(words.slice(-count).join(" ")).status === "value"
  );
}

// C24 (item 5, CF §12.4): CentralReach's two-line form, "<street> <apt>" + "\n" +
// "<City> <ST> <ZIP>", no commas, the apartment as stored. Street blank: null (nothing is sent).
// Line 2 empty: line 1 alone. A street that already holds a whole address gives both lines
// itself, and the separate city, state and ZIP are not added (they would repeat).
function twoLineAddress({ street, apt, city, stateCode, zip }) {
  const streetText = addressPart(street);
  if (!streetText) {
    return null;
  }
  const aptText = addressPart(apt);
  const apartment = aptText && !PLACEHOLDER_APARTMENT.test(aptText) ? aptText : null;
  const comma = streetText.indexOf(",");
  const wholeAddress = holdsWholeAddress(streetText);
  const line1 = joinWithSpace([wholeAddress ? streetText.slice(0, comma) : streetText, apartment]);
  if (!line1) {
    return null;
  }
  const line2 = wholeAddress
    ? addressPart(streetText.slice(comma + 1).replace(/,/g, " "))
    : joinWithSpace([addressPart(city), stateCode, addressPart(zip)]);
  return line2 ? `${line1}\n${line2}` : line1;
}

// Other Location: Service -State holds full state names; blank or unreadable falls back to the
// Case state (stateregion, else location). The payload logs any stateregion warning, not this.
function otherLocationStateCode(dealProps) {
  const serviceState = readStateCode(dealProps.service__stateregion_2);
  return serviceState.status === "value" ? serviceState.value : readCaseStateCode(dealProps).code;
}

// C24, row 4.13 (item 5): built from the parts, not from full_home_address (guide line 364 names
// it; it cannot be put in CentralReach's form reliably; guide note D11, insert C).
function getServiceLocationAddress(dealProps) {
  const location = toTrimmedOrNull(dealProps.specific_home_location);
  if (HOME_SERVICE_LOCATIONS.includes(location)) {
    return twoLineAddress({
      street: dealProps.street_address,
      apt: dealProps.home_apt,
      city: dealProps.location_city,
      stateCode: readCaseStateCode(dealProps).code,
      zip: dealProps.postal_code
    });
  }
  if (location === "Other Location") {
    return twoLineAddress({
      street: dealProps.service__street_address,
      apt: dealProps.service__apt,
      city: dealProps.service__city,
      stateCode: otherLocationStateCode(dealProps),
      zip: dealProps.service__postal_code
    });
  }
  return null;
}

// C25, row 4.22 (item 5, question 7, decided 2026-11-24): `service_address__other` for More
// Than One Location. A value that, with its commas removed, is empty or only a state name or code
// (the workflow skeleton ",  , New York ") is null; a real address is sent as stored, trimmed.
function getServiceLocationAddress2(dealProps) {
  if (toTrimmedOrNull(dealProps.specific_home_location) !== "More Than One Location") {
    return null;
  }
  const value = toTrimmedOrNull(dealProps.service_address__other);
  const withoutCommas = addressPart(value?.replace(/,/g, ""));
  if (!withoutCommas || readStateCode(withoutCommas).status === "value") {
    return null;
  }
  return value;
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

// The roles of each generic staff name field (item 10, C15). Outgoing BT 1 / 2 join Primary BT
// 1 / 2 while the label is on the Case. The worker reads the field IDs to name the fields whose
// input was not read (contract P.5 (c)). The supervising roles are not here: 131308 is built only
// by supervisingBcbaValue (order, suffix, Grad Permit switch).
export const STAFF_FIELD_ROLES = {
  [CENTRAL_REACH_CLIENT_METADATA_FIELDS.INITIAL_ASSESSMENT_BCBA]: ["initialAssessmentBcba"],
  [CENTRAL_REACH_CLIENT_METADATA_FIELDS.REASSESSMENT_BCBA]: ["reEvaluationBcba"],
  [CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_1_NAME]: ["primaryBt1", "outgoingBt1"],
  [CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_2_NAME]: ["primaryBt2", "outgoingBt2"]
};

// The staff of all a field's roles, one entry per record ID (one BT on both 76 and 131 is named
// once). undefined when a role's list was not passed (not read).
function staffOfRoles(staffNames, roles) {
  if (!roles.every((role) => Array.isArray(staffNames?.[role]))) {
    return undefined;
  }
  const byId = new Map();
  for (const staff of roles.flatMap((role) => staffNames[role])) {
    const recordId = String(staff?.recordId ?? "");
    if (!byId.has(recordId)) {
      byId.set(recordId, staff);
    }
  }
  return [...byId.values()];
}

// The first role of a field that holds a staff record with no readable name, or null.
function namelessRole(staffNames, roles) {
  return (
    roles.find((role) => staffNamesInRole(staffNames?.[role] || []).some((name) => !name)) ?? null
  );
}

// The generic staff fields that hold a staff record with no readable name. The mapper leaves
// those fields out and warns; the worker names the same fields in its omit list (row 3.18), so
// their saved hashes are kept.
export function staffFieldsWithoutName(staffNames) {
  return Object.entries(STAFF_FIELD_ROLES)
    .filter(([, roles]) => staffOfRoles(staffNames, roles) && namelessRole(staffNames, roles))
    .map(([fieldId]) => fieldId);
}

function namelessWarning(role) {
  return {
    code: "staff_name_unreadable",
    role,
    message: `A staff record in the role ${role} has no first or last name; the field is not sent.`
  };
}

// The four staff name fields: the names of a field's roles joined by ", " in record-ID order
// (assumed format, O-28), and a blank field when nobody holds them. Rule 5.8: a role whose list
// was not passed was not read, and a staff record with no readable name is not "nobody". In both
// cases the field's key is left out; the second also gets a warning that names the role, never a
// value.
function staffNameFields(staffNames) {
  const fields = {};
  const warnings = [];
  for (const [fieldId, roles] of Object.entries(STAFF_FIELD_ROLES)) {
    const staff = staffOfRoles(staffNames, roles);
    if (!staff) {
      continue;
    }
    const role = namelessRole(staffNames, roles);
    if (role) {
      warnings.push(namelessWarning(role));
      continue;
    }
    fields[fieldId] = joinMetadataParts(staffNamesInRole(staff));
  }
  return { fields, warnings };
}

// C12 and C13 (items 9 and 10, package rules 1 to 7). A field value is { value } or { omit }:
// an omitted field is not sent and not cleared, and the worker names it in its omit list so its
// saved hash is kept (gap c). `warning` is set when staff must fix HubSpot data.
const OMIT = Object.freeze({ omit: true });

// 131308 reads these roles in this order: the first that holds a BCBA wins (rule 4).
const SUPERVISING_BCBA_ROLES = Object.freeze([
  "supervisingBcba",
  "subBcba",
  "outgoingSubBcba",
  "outgoingSupervisingBcba"
]);

// "First Last" with single spaces inside each name ("Madeline  Sell" -> "Madeline Sell").
function singleSpaced(names) {
  return names.map((name) => name.replace(/\s+/g, " "));
}

// The 82 BCBAs that are Grad Permit holders (lba_licensure__ny = Grad Permit, read by the worker).
function gradPermitHolders(supervising) {
  return supervising.filter((staff) => staff?.gradPermitHolder === true);
}

// Item 9 rule 7 (question 26, decided 2026-11-24): several 82 BCBAs, only some of them holders.
// Both 131308 and 136052 are left out (not sent, not cleared, hashes kept) with one warning, until
// staff fix the associations. The worker skips the supervisor read for this case.
export function mixedGradPermitHolders(supervising) {
  const holders = gradPermitHolders(supervising).length;
  return holders > 0 && holders < supervising.length;
}

const MIXED_HOLDERS_WARNING = Object.freeze({
  code: "grad_permit_mixed_supervising_bcba",
  role: "supervisingBcba",
  message:
    "Some Supervising BCBAs are Grad Permit holders and some are not; Supervising BCBA and Grad Permit Holder are not sent."
});

// Item 9 rule 5 and guide insert E: the typed supplier, trimmed and without trailing commas, plus
// " BCBA LBA", unless it already holds "BCBA" or "LBA" as a word (then as typed). Blank (or
// commas only): null, which the caller turns into "send nothing" (insert E).
function supplierWithSuffix(text) {
  const typed = toTrimmedOrNull(text);
  if (!typed || /\b(BCBA|LBA)\b/i.test(typed)) {
    return typed;
  }
  const name = typed.replace(/[\s,]+$/, "");
  return name ? `${name}${SUPERVISING_BCBA_SUFFIX}` : null;
}

// One "<First> <Last> BCBA LBA" per BCBA, ", " between them, in record-ID order.
function bcbaNamesWithSuffix(staff, role) {
  const names = staffNamesInRole(staff);
  if (names.some((name) => !name)) {
    return { ...OMIT, warning: namelessWarning(role) };
  }
  return { value: singleSpaced(names).map((name) => `${name}${SUPERVISING_BCBA_SUFFIX}`).join(", ") };
}

// Supervising BCBA 131308 (rules 3 to 5 and 7), from the staff and the Case's typed supplier.
export function supervisingBcbaValue(staffNames, dealProps) {
  if (!SUPERVISING_BCBA_ROLES.every((role) => Array.isArray(staffNames?.[role]))) {
    return OMIT;
  }
  const supervising = staffNames.supervisingBcba;
  if (mixedGradPermitHolders(supervising)) {
    return { ...OMIT, warning: MIXED_HOLDERS_WARNING };
  }
  const holders = gradPermitHolders(supervising);
  if (holders.length > 0) {
    // Rule 3: the holders' 151 supervisors, never a holder's own name.
    if (!holders.every((holder) => Array.isArray(holder.supervisors))) {
      return OMIT;
    }
    if (holders.some((holder) => holder.supervisors.length === 0)) {
      return {
        ...OMIT,
        warning: {
          code: "grad_permit_supervisor_missing",
          role: "supervisingBcba",
          message: "A Grad Permit holder has no Grad Permit Supervisor link; the field is not sent."
        }
      };
    }
    const supervisors = new Map(
      holders.flatMap((holder) => holder.supervisors).map((staff) => [String(staff?.recordId), staff])
    );
    return bcbaNamesWithSuffix([...supervisors.values()], "supervisingBcba");
  }
  // Rule 4: the first of 82, 234, 288, 135 that holds a BCBA; none: the typed supplier. A blank
  // supplier sends nothing (insert E): 131308 is left out, so a value written earlier stays.
  const role = SUPERVISING_BCBA_ROLES.find((name) => staffNames[name].length > 0);
  if (role) {
    return bcbaNamesWithSuffix(staffNames[role], role);
  }
  const supplier = supplierWithSuffix(dealProps?.ongoing_central_reach_provider_supplier);
  return supplier ? { value: supplier } : OMIT;
}

// Grad Permit Holder 136052 (rules 1 and 2): "<First> <Last> Grad Permit Holder" for each holder
// on 82; blank when no 82 BCBA is a holder.
export function gradPermitHolderValue(staffNames) {
  const supervising = staffNames?.supervisingBcba;
  if (!Array.isArray(supervising) || mixedGradPermitHolders(supervising)) {
    return OMIT;
  }
  const names = staffNamesInRole(gradPermitHolders(supervising));
  if (names.length === 0) {
    return { value: null };
  }
  if (names.some((name) => !name)) {
    return { ...OMIT, warning: namelessWarning("supervisingBcba") };
  }
  return { value: singleSpaced(names).map((name) => `${name} Grad Permit Holder`).join(", ") };
}

// C10 (item 6, CF §1.2): Care Coordinator 138851, from the three fields Zeke's coordinator
// workflow keeps on the Case. The integration trusts `ready` (Zeke: J "yes") and reads no owner.
//   ready      "<first> <last>", one space; one name blank: the other. Both blank: as not ready.
//   no_owner   blank (null): clears only a value the integration wrote.
//   any other status, or blank: left out (not sent, not cleared, saved hash kept, row 3.18), with
//              the warning care_coordinator_not_ready. It names the status, never a name.
const COORDINATOR_STATUS_PROPERTY = "coordinator_export_status";
// The options of coordinator_export_status (CF §1.1). Only these are named in the warning.
const COORDINATOR_STATUSES = Object.freeze([
  "refreshing",
  "ready",
  "no_owner",
  "missing_match",
  "duplicate_match",
  "inactive",
  "incomplete",
  "error"
]);

function coordinatorNotReady(status) {
  const named = status === null ? "blank" : COORDINATOR_STATUSES.includes(status) ? status : "unknown";
  return {
    ...OMIT,
    warning: {
      code: "care_coordinator_not_ready",
      property: COORDINATOR_STATUS_PROPERTY,
      status: named,
      message: `The Care Coordinator is not ready (status ${named}); the field is not sent.`
    }
  };
}

export function careCoordinatorValue(dealProps) {
  const status = toTrimmedOrNull(dealProps?.[COORDINATOR_STATUS_PROPERTY]);
  if (status === "no_owner") {
    return { value: null };
  }
  if (status !== "ready") {
    return coordinatorNotReady(status);
  }
  const parts = [dealProps.care_coordinator_first_name, dealProps.care_coordinator_last_name]
    .map((part) => toTrimmedOrNull(part))
    .filter(Boolean);
  const name = singleSpaced(parts).join(" ");
  return name ? { value: name } : coordinatorNotReady(status);
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
//                 { initialAssessmentBcba, reEvaluationBcba, primaryBt1, primaryBt2,
//                   outgoingBt1, outgoingBt2, supervisingBcba, subBcba, outgoingSubBcba,
//                   outgoingSupervisingBcba }
//               The role names are those of staffingRoleAssociationTypeIds in src/lib/config.mjs.
//               Each role holds a list of { recordId, firstName, lastName }, one per staff record
//               in that role, and an empty list when nobody holds the role. Each supervisingBcba
//               entry also holds gradPermitHolder (true when its lba_licensure__ny is
//               "Grad Permit") and supervisors ([{ recordId, firstName, lastName }], its Grad
//               Permit Supervisor BCBAs; empty when none). The mapper builds the text for fields
//               131314, 144602, 131313 and 138092 (row 4.14), 131308 (C12) and 136052 (C13). A
//               staff record with neither a first nor a last name: that field's key is left out
//               and the answer's `warnings` list names the role ({ code, role, message }), never
//               a value. A Grad Permit holder with no supervisor leaves 131308 out with the
//               warning grad_permit_supervisor_missing. A Care Coordinator that is not ready
//               (C10) leaves 138851 out with the warning care_coordinator_not_ready
//               ({ code, property, status, message }), which names the status, never a name.
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
// Both mappings get the same staffNames; each gets the omitFieldIds built from its own Case read
// (the list depends on the Case). If they differ, the two hashes differ and the run ends as
// "changed during the run" after the CentralReach writes.
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
    // C19, row 4.5 (item 7, CF §9.3): the availability text alone, as CentralReach holds it. The
    // weekly hours are not appended (departs from guide line 360; guide note O-34).
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.CLIENT_AVAILABILITY]: toTrimmedOrNull(
      dealProps.finalized_client_service_hours_post_assessment
    ),
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
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL]: getSeverityLevel(dealProps),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.IMPORTANT_INFORMATION_PARENT]: toTrimmedOrNull(
      dealProps.important_information
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_NAME]: toTrimmedOrNull(
      dealProps.policy_holder_name
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_DOB]: dateOf("phi__policy_holder_dob"),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.CURRENT_INSURANCE]: optionOrOtherText(
      dealProps.insurance_primary,
      dealProps.insurance_1__other__summary
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.INSURANCE_ID]: toTrimmedOrNull(dealProps.insurance_id_1),
    // C30, row 4.10: the carrier, never n2_what_type_of_insurance.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE]: optionOrOtherText(
      dealProps.insurance_2,
      dealProps.insurance_2__other__summary
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE_ID]: toTrimmedOrNull(
      dealProps.insurance_id_2
    ),
    // C36 (item 2): the value as stored; Other sends the "Referral - Other" text when filled.
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRAL_SOURCE]: optionOrOtherText(
      dealProps.referral_source,
      dealProps.referral_other
    ),
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.HUBSPOT_LINK_TO_CASE_RECORD]: buildHubspotDealUrl(
      dealProps.hs_object_id,
      portalId
    )
  };

  // C12 and C13 (items 9 and 10): Supervising BCBA 131308 and Grad Permit Holder 136052; C10
  // (item 6): Care Coordinator 138851. An omitted value leaves its key out; the worker's omit list
  // names the same field (gap c).
  const warnings = [...staff.warnings];
  for (const [fieldId, built] of [
    [
      CENTRAL_REACH_CLIENT_METADATA_FIELDS.SUPERVISING_BCBA,
      supervisingBcbaValue(staffNames, dealProps)
    ],
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.GRAD_PERMIT_HOLDER, gradPermitHolderValue(staffNames)],
    [CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR, careCoordinatorValue(dealProps)]
  ]) {
    if (built.warning) {
      warnings.push(built.warning);
    }
    if (!built.omit) {
      metadataValues[fieldId] = built.value;
    }
  }

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
    warnings
  };
}
