// Every last_sync_error sentence. Each one names fields, never values.

export function missingRequiredField(fieldName) {
  return `Missing required field: ${fieldName}`;
}

export function unreadableDate(fieldName) {
  return `Unreadable date: ${fieldName}`;
}

export function missingDateProperty(fieldName) {
  return `${fieldName} is missing from the HubSpot answer`;
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
