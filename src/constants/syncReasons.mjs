// Every last_sync_error sentence. Each one names fields, never values.

export function missingRequiredField(fieldName) {
  return `Missing required field: ${fieldName}`;
}

export function unreadableDate(fieldName) {
  return `Unreadable date: ${fieldName}`;
}

// Row 4.18 (rule 5.8): requested properties that are not keys of the HubSpot answer, for the Case
// and the employee workers. Property names only, never a value: the first ten, then "and N more".
const MISSING_PROPERTIES_LISTED = 10;

export function missingPropertiesReason(names) {
  const listed = names.slice(0, MISSING_PROPERTIES_LISTED).join(", ");
  const more =
    names.length > MISSING_PROPERTIES_LISTED
      ? ` and ${names.length - MISSING_PROPERTIES_LISTED} more`
      : "";
  return `Missing from the HubSpot answer: ${listed}${more}`;
}

export const EMPLOYEE_CREATE_TURNED_OFF = "Employee create is turned off";

export const WAITING_FOR_WORKDAY_ID = "Waiting for the Workday ID";

export const REPLACE_TEMPORARY_ID =
  "Replace the temporary External System ID in CentralReach with the Workday ID, then tick the checklist.";

export const CHECKLIST_STILL_TEMPORARY =
  "Checklist is ticked but CentralReach still holds the temporary External System ID.";

export const CHECKLIST_BLANK_WORKDAY =
  "Checklist is ticked but the Workday ID is blank in HubSpot.";

export const WORKDAY_ID_MISMATCH =
  "Workday ID in HubSpot does not match the External System ID in CentralReach.";

export const CONFLICTING_EXTERNAL_IDS =
  "workday_id and the HubSpot record ID match two different CentralReach employees.";

export const ANOTHER_HUBSPOT_RECORD_LINKED =
  "Another HubSpot record is already linked to this CentralReach employee.";

export const WORKDAY_ALREADY_IN_CENTRALREACH =
  "A CentralReach employee already holds this Workday ID.";

export const CASE_CLIENT_ID_MISMATCH =
  "HubSpot client_id_number does not match the CentralReach client found for this Case record.";

// propertyName is client_id_number or employee_id. The value is never part of the sentence.
export function crIdNotDigits(propertyName) {
  return `${propertyName} must contain digits only.`;
}

// Stage 2: failures the worker did not decide on purpose.

// Written once, after the last retry of a temporary failure (1 min, 5 min, 15 min, 1 h, 4 h).
export const RETRIES_USED_UP = "Retries used up";

export function centralReachRejected(status) {
  return `CentralReach rejected the request (${status}).`;
}

export function hubspotRejected(status) {
  return `HubSpot rejected the request (${status}).`;
}

// Field IDs are CentralReach metadata field numbers, not values.
export function metadataWriteFailed(fieldIds) {
  return `MetadataWriteFailed fields: ${(fieldIds || []).join(",")}`;
}

// call is the method and path template, for example "GET /contacts/{id}/labels".
export function unreadableCentralReachAnswer(call, expectedField) {
  return `CentralReach answered ${call} in a shape the integration cannot read. Expected field: ${expectedField}.`;
}

// A mapper asked for a label that is not in CENTRAL_REACH_SENDABLE_LABEL_IDS (row L.1). This is
// a defect in the integration, not something staff can fix on the record.
export const LABEL_NOT_SENDABLE =
  "A required CentralReach label is not in the integration's list of sendable labels. No label was sent.";

export const SYNC_FAILED = "Sync failed";
