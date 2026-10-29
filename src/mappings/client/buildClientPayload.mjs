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

function toIsoMidnight(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
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

export const PARENT_GUARDIAN_ASSOCIATION_TYPE_ID = 3;
const PARENT_GUARDIAN_CATEGORY = "Parent/Guardian";

function contactProperties(contact) {
  return contact?.properties || contact || {};
}

export function guardianFromContact(contact) {
  const props = contactProperties(contact);
  const email = cleanEmail(props.email);
  return {
    GuardianFirstName: props.firstname || null,
    GuardianLastName: props.lastname || null,
    PrimaryEmail: isValidEmail(email) ? email : null
  };
}

function isQualifyingGuardian(contact) {
  const typeIds = Array.isArray(contact?.typeIds) ? contact.typeIds : [];
  const onTypeThree = typeIds.some(
    (typeId) => Number(typeId) === PARENT_GUARDIAN_ASSOCIATION_TYPE_ID
  );
  if (!onTypeThree) {
    return false;
  }
  const category = String(contactProperties(contact).contact_category || "").trim();
  return category === PARENT_GUARDIAN_CATEGORY;
}

function guardianFromCase(deal) {
  const props = deal?.properties || {};
  const email = cleanEmail(props.email);
  return {
    source: "case",
    contactId: null,
    GuardianFirstName: props.guardian_first_name || null,
    GuardianLastName: props.guardian_last_name || null,
    PrimaryEmail: isValidEmail(email) ? email : null
  };
}

// Sara's rule picks the Parent/Guardian whose email is used for parent
// communication. No HubSpot property marks that contact, so a count other
// than one uses the Case fields.
export function selectGuardianSource({ deal, contacts } = {}) {
  const qualifying = (Array.isArray(contacts) ? contacts : []).filter(isQualifyingGuardian);
  if (qualifying.length !== 1) {
    return guardianFromCase(deal);
  }

  const contact = qualifying[0];
  const contactId = String(contact?.id ?? contactProperties(contact).hs_object_id ?? "").trim();
  return {
    source: "contact",
    contactId: contactId || null,
    ...guardianFromContact(contact)
  };
}

export function buildClientPayload({ deal, config, contacts } = {}) {
  void config;

  const props = deal?.properties || {};
  const guardian = selectGuardianSource({ deal, contacts });

  return {
    ContactForm: process.env.CR_CLIENT_CONTACT_FORM || "Public Client Intake Form",
    ExternalSystemId: String(deal?.id || props.hs_object_id || ""),
    FirstName: props.phi_first_name__cloned_ || null,
    LastName: props.phi_last_name || null,
    DateOfBirth: toIsoMidnight(props.phi_date_of_birth),
    Gender: mapGender(props.phi_gender),
    PrimaryEmail: guardian.PrimaryEmail,
    PhoneCell: normalizePhone(props.phone),
    PhoneHome: normalizePhone(props.phone_number__second_),
    // Section 3 address. full_home_address and service_address__other are preferred.
    // stateregion is the guide mailing state. location_central_reach and location
    // remain the fallbacks.
    AddressLine1:
      props.full_home_address ||
      props.service_address__other ||
      props.if_services_will_be_in_more_than_one_location__list_the_other_address ||
      props.street_address ||
      null,
    AddressLine2: props.home_apt || null,
    City: props.location_city || null,
    StateProvince: normalizeStateProvince(
      props.stateregion || props.location_central_reach || props.location
    ),
    ZipPostalCode: props.postal_code || null,
    GuardianFirstName: guardian.GuardianFirstName,
    GuardianLastName: guardian.GuardianLastName
  };
}
