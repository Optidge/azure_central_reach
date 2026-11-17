// Central Reach requires an External System ID to create an employee. A linked employee is updated
// by its CR contact id, so a blank Workday ID does not block that update.
export const MISSING_WORKDAY_ID_ERROR =
  "workday_id is blank. Central Reach needs it as the External System ID to create an employee";

export function validateEmployeePayload(payload, { linked = false } = {}) {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, errors: ["Payload must be an object"] };
  }

  const errors = [];
  const hasExternalSystemId = String(payload.externalSystemId ?? "").trim() !== "";
  if (!hasExternalSystemId && !linked) {
    errors.push(MISSING_WORKDAY_ID_ERROR);
  }

  const hasAnyName =
    (payload.firstName && String(payload.firstName).trim() !== "") ||
    (payload.lastName && String(payload.lastName).trim() !== "");
  if (!hasAnyName) {
    errors.push("At least one of firstName or lastName is required");
  }

  return { isValid: errors.length === 0, errors };
}
