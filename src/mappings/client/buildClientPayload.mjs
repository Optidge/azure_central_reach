import { readDate } from "../../lib/dates.mjs";

function cleanEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
}

function isValidEmail(value) {
  if (!value) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return null;
}

function mapGender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "male") {
    return "Male";
  }
  if (normalized === "female") {
    return "Female";
  }
  return null;
}

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

function normalizeStateProvince(value) {
  const stateValue = String(value || "").trim();
  if (!stateValue) {
    return null;
  }

  if (/^[A-Za-z]{2}$/.test(stateValue)) {
    return stateValue.toUpperCase();
  }

  const normalizedName = stateValue.replace(/\./g, "").replace(/\s+/g, " ").toUpperCase();
  return US_STATE_NAME_TO_CODE[normalizedName] || null;
}

export function buildClientPayload({ deal, config }) {
  void config;

  const props = deal?.properties || {};
  const email = cleanEmail(props.email);
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
    Gender: mapGender(props.phi_gender),
    PrimaryEmail: isValidEmail(email) ? email : null,
    // Decision 36: no second phone. phone_number__second_ is not read and PhoneHome is not sent.
    PhoneCell: normalizePhone(props.phone),
    // C8, row 4.1: the Case mailing address. Line 1 is street_address only; the state is stateregion.
    AddressLine1: props.street_address || null,
    AddressLine2: props.home_apt || null,
    City: props.location_city || null,
    StateProvince: normalizeStateProvince(props.stateregion),
    ZipPostalCode: props.postal_code || null,
    GuardianFirstName: props.guardian_first_name || null,
    GuardianLastName: props.guardian_last_name || null
  };
}
