import { missingRequiredField, unreadableDate } from "../../constants/syncReasons.mjs";

function blank(value) {
  return String(value ?? "").trim() === "";
}

// linked: an update checks names only. A create also requires a readable date of birth.
export function validateClientPayload(payload, { linked = false } = {}) {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, missing: [], errors: ["Payload must be an object"] };
  }

  const missing = [];
  if (blank(payload.FirstName)) {
    missing.push("phi_first_name__cloned_");
  }
  if (blank(payload.LastName)) {
    missing.push("phi_last_name");
  }

  const dateStatus = payload.dateOfBirthStatus || "blank";
  if (dateStatus === "unreadable") {
    return {
      isValid: false,
      missing,
      errors: [...missing.map((name) => missingRequiredField(name)), unreadableDate("phi_date_of_birth")]
    };
  }
  if (!linked && dateStatus !== "date") {
    missing.push("phi_date_of_birth");
  }

  return {
    isValid: missing.length === 0,
    missing,
    errors: missing.map((name) => missingRequiredField(name))
  };
}
