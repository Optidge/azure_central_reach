import { readDate } from "../../lib/dates.mjs";
import {
  createValueReader,
  readEmail,
  readGender,
  readCaseStateCode,
  readPhone
} from "../../lib/fieldFormats.mjs";

function clientDateOfBirth(properties) {
  if (!Object.prototype.hasOwnProperty.call(properties || {}, "phi_date_of_birth")) {
    return { dateOfBirthStatus: "blank" };
  }
  const read = readDate(properties.phi_date_of_birth);
  if (read === "blank") {
    return { dateOfBirthStatus: "blank" };
  }
  if (read === "unreadable") {
    return { dateOfBirthStatus: "unreadable" };
  }
  return { DateOfBirth: `${read}T00:00:00.000Z`, dateOfBirthStatus: "date" };
}

export function buildClientPayload({ deal, config }) {
  void config;

  const props = deal?.properties || {};
  // F-1: a filled phone, email or gender that cannot be converted is named in
  // unreadableValueProperties (a note for the worker, like dateOfBirthStatus) and sent as nothing.
  const { valueOf, unreadableValueProperties } = createValueReader(props);
  // Item 5: the state is stateregion, else location. An unreadable stateregion is not an error:
  // it falls back and adds a warning (a note for the worker; code and property, never the value).
  const state = readCaseStateCode(props);
  const dateOfBirth = clientDateOfBirth(props);
  const trimmed = (value) => {
    const text = String(value ?? "").trim();
    return text || null;
  };

  return {
    ContactForm: process.env.CR_CLIENT_CONTACT_FORM || "Public Client Intake Form",
    ExternalSystemId: String(deal?.id || props.hs_object_id || ""),
    FirstName: trimmed(props.phi_first_name__cloned_),
    LastName: trimmed(props.phi_last_name),
    ...(dateOfBirth.DateOfBirth ? { DateOfBirth: dateOfBirth.DateOfBirth } : {}),
    dateOfBirthStatus: dateOfBirth.dateOfBirthStatus,
    Gender: valueOf(readGender, "phi_gender"),
    PrimaryEmail: valueOf(readEmail, "email"),
    // Decision 36: no second phone. phone_number__second_ is not read and PhoneHome is not sent.
    PhoneCell: valueOf(readPhone, "phone"),
    // C8, row 4.1: the Case mailing address. Line 1 is street_address only; the state is
    // stateregion, else location (item 5; departs from guide lines 351 and 500, guide note D11).
    AddressLine1: props.street_address || null,
    AddressLine2: props.home_apt || null,
    City: props.location_city || null,
    StateProvince: state.code,
    ZipPostalCode: props.postal_code || null,
    GuardianFirstName: props.guardian_first_name || null,
    GuardianLastName: props.guardian_last_name || null,
    unreadableValueProperties,
    warnings: state.warning ? [{ code: state.warning, property: "stateregion" }] : []
  };
}
