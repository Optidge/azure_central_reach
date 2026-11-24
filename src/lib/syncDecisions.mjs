import {
  CHECKLIST_BLANK_WORKDAY,
  CHECKLIST_STILL_TEMPORARY,
  REPLACE_TEMPORARY_ID,
  WAITING_FOR_WORKDAY_ID,
  WORKDAY_ID_MISMATCH
} from "../constants/syncReasons.mjs";
import { EXTERNAL_SYSTEM_ID_CHECKLIST_VALUE } from "../constants/hubspot.mjs";

// Item 15 (R-8, row 3.17): the Workday ID format, exactly 7 digits once trimmed. Pending final
// confirmation of the Workday ID format by United Care (O-8): if the format changes, change only
// this line.
export function workdayIdIsValid(value) {
  return /^\d{7}$/.test(String(value ?? "").trim());
}

export function checklistTicked(value) {
  return String(value ?? "")
    .split(";")
    .map((item) => item.trim())
    .includes(EXTERNAL_SYSTEM_ID_CHECKLIST_VALUE);
}

// Rule 5.4. The first matching row wins. Only the mismatch row stops the update.
export function linkedEmployeeIdentity({
  crExternalSystemId,
  workdayId,
  recordId,
  checklistIsTicked
}) {
  const crId = String(crExternalSystemId ?? "").trim();
  const workday = String(workdayId ?? "").trim();
  const record = String(recordId ?? "").trim();
  const holdsTemporary = crId !== "" && crId === record;
  const holdsWorkday = workday !== "" && crId === workday;

  if (holdsWorkday) {
    return { sendUpdate: true, status: "success", reason: "" };
  }
  if (holdsTemporary && !checklistIsTicked) {
    return {
      sendUpdate: true,
      status: "waiting",
      reason: workday ? REPLACE_TEMPORARY_ID : WAITING_FOR_WORKDAY_ID
    };
  }
  if (holdsTemporary && checklistIsTicked) {
    return { sendUpdate: true, status: "error", reason: CHECKLIST_STILL_TEMPORARY };
  }
  if (!holdsTemporary && workday === "" && checklistIsTicked) {
    return { sendUpdate: true, status: "error", reason: CHECKLIST_BLANK_WORKDAY };
  }
  if (workday !== "" && crId !== "" && crId !== workday) {
    return { sendUpdate: false, status: "error", reason: WORKDAY_ID_MISMATCH };
  }
  return { sendUpdate: true, status: "success", reason: "" };
}

// Rule 5.3, after both read-only lookups have answered 200 or 404.
export function employeeCreateLookupDecision({ byRecordId, byWorkday, workdayFilled }) {
  const recordFound = Boolean(byRecordId?.found && byRecordId.crContactId);
  const workdayFound = Boolean(workdayFilled && byWorkday?.found && byWorkday.crContactId);
  if (recordFound && workdayFound && String(byRecordId.crContactId) !== String(byWorkday.crContactId)) {
    return { outcome: "conflicting_ids" };
  }
  if (recordFound) {
    return { outcome: "link_own", crContactId: String(byRecordId.crContactId) };
  }
  if (workdayFound) {
    return { outcome: "found_by_workday", crContactId: String(byWorkday.crContactId) };
  }
  return { outcome: "create" };
}
