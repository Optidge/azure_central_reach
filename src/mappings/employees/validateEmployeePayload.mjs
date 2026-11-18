import { missingRequiredField } from "../../constants/syncReasons.mjs";

function blank(value) {
  return String(value ?? "").trim() === "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? "").trim());
}

// linked: an update checks names only. A create also checks the primary email.
// emailField is the HubSpot property name that supplied primaryEmail.
export function validateEmployeePayload(payload, { linked = false, emailField = "email" } = {}) {
  if (!payload || typeof payload !== "object") {
    return { isValid: false, missing: [], errors: ["Payload must be an object"] };
  }

  const missing = [];
  if (blank(payload.firstName)) {
    missing.push("first_name");
  }
  if (blank(payload.lastName)) {
    missing.push("last_name");
  }
  if (!linked) {
    const email = String(payload.primaryEmail ?? "").trim();
    if (!email || !isValidEmail(email)) {
      missing.push(emailField);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    errors: missing.map((name) => missingRequiredField(name))
  };
}
