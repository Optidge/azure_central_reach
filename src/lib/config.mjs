/**
 * CentralReach: no account/tenant ID env var — OAuth/API uses CR_CLIENT_ID,
 * CR_CLIENT_SECRET, CR_API_KEY with CR_BASE_URL / CR_TOKEN_URL only.
 *
 * Not loaded by this repo (omit from Azure for this app): HUBSPOT_FIELD_ADMIN_TOKEN,
 * HUBSPOT_SETTINGS_CLIENT_SECRET, HUBSPOT_FIELD_ADMIN_USER_IDS, HUBSPOT_PUBLIC_BASE_URL,
 * FIELD_MAPPING_DEMO_MODE, ALLOW_UNVERIFIED_TYPED_METADATA_WRITES.
 *
 * Retired in Stage 3 (rows 3.2 and 3.11), no longer read: MAX_DEALS_PER_RUN, MAX_BT_RBT_PER_RUN,
 * MAX_BCBA_PER_RUN, MAX_SEARCH_REQUESTS_PER_SECTION, LOOKBACK_MINUTES, LINKED_RECHECK_ENABLED,
 * DEDUPE_TTL_SECONDS, HUBSPOT_WEBHOOK_COALESCE_SECONDS, STATE_PROVIDER, STATE_TTL_ATTR.
 *
 * Optional, read outside this file: INTAKE_POLLER_SCHEDULE (src/functions/intakePoller.mjs), the
 * poller's six-field NCRONTAB schedule. Hourly when it is not set.
 * Optional, read here: SYNC_CREATE_GATE_PROPERTY and SYNC_UPDATE_GATE_PROPERTY (item 24), the gate
 * of the create path and of the update path. Required in production (exact names); with both set,
 * SYNC_RECORD_GATE_PROPERTY is not required.
 * See README.md → Configuration Notes for optional keys that are read elsewhere in src/.
 */
const REQUIRED_ENV_NAMES = [
  "CR_CLIENT_ID",
  "CR_CLIENT_SECRET",
  "CR_API_KEY",
  "HUBSPOT_PRIVATE_APP_TOKEN",
  "CR_BASE_URL",
  "CR_TOKEN_URL",
  "HUBSPOT_BASE_URL",
  "HUBSPOT_CR_CONTACT_ID_PROPERTY",
  "LEASE_TTL_SECONDS",
  "SUCCESS_TTL_SECONDS",
  "FAIL_TTL_SECONDS",
  "COSMOS_ENDPOINT",
  "COSMOS_KEY",
  "COSMOS_DATABASE_ID",
  "COSMOS_CONTAINER_ID",
  "SERVICE_BUS_CONNECTION_STRING",
  "CLIENT_SYNC_QUEUE_NAME",
  "EMPLOYEE_SYNC_QUEUE_NAME",
  "SYNC_RECORD_GATE_PROPERTY",
  "HUBSPOT_PORTAL_ID"
];

const REQUIRED_INTAKE_ENV_NAMES = [
  "HUBSPOT_PRIVATE_APP_TOKEN",
  "HUBSPOT_BASE_URL",
  "LEASE_TTL_SECONDS",
  "COSMOS_ENDPOINT",
  "COSMOS_KEY",
  "COSMOS_DATABASE_ID",
  "COSMOS_CONTAINER_ID",
  "SERVICE_BUS_CONNECTION_STRING",
  "CLIENT_SYNC_QUEUE_NAME",
  "EMPLOYEE_SYNC_QUEUE_NAME",
  "SYNC_RECORD_GATE_PROPERTY",
  "HUBSPOT_PORTAL_ID"
];

// host.json functionTimeout is 00:10:00. A lease must outlive the longest run, so
// LEASE_TTL_SECONDS has to be larger than this (BUILD-PLAN Stage 2, decision 9: 660).
export const FUNCTION_TIMEOUT_SECONDS = 600;

export function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function getOptionalEnv(name, defaultValue = "") {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return defaultValue;
  }
  return value.trim();
}

/**
 * HubSpot portal values, keyed by portal ID. HUBSPOT_PORTAL_ID picks the row and must be one of
 * these two; any other value is invalid configuration (retired 50850427, never 246184070).
 * The table is read when a function runs, never when a module loads.
 *
 * Source: integration guide [SCURRENT] crosswalk and BUILD-PLAN section 3 "IDs".
 * No pipeline id or stage allowlist is needed. The guide syncs every pipeline and stage and
 * only skips CASE_EXCLUDED_STAGE_IDS (src/constants/hubspot.mjs), which match in both portals.
 *
 * excludedStaffingAssociationTypeIds: Case -> BCBA / BT/RBT association types that must not
 * sync (unlabeled BCBA, unlabeled BT/RBT, Potential IA, Potential Supervising, Potential BT 1,
 * Potential BT 2, Previous IA).
 *
 * staffingRoleAssociationTypeIds: the Case -> BCBA / BT/RBT role labels the Case worker reads
 * (items 9 and 10, GP §8.3 and §8.4). onLeaveBcba is named only and never read: the label itself
 * says "inactive" (GP §4.3). 236 is On Leave BCBA in production and Outgoing BT 2 in the sandbox.
 *
 * gradPermitSupervisorAssociationTypeId: the BCBA -> BCBA label "Grad Permit Supervisor
 * (supervises this BCBA)", read from the Grad Permit holder's side (item 9 rule 3, GP §8.1).
 */
export const HUBSPOT_PORTALS = Object.freeze({
  // Sandbox
  "52311591": Object.freeze({
    bcbaObjectTypeId: "2-72890322",
    btRbtObjectTypeId: "2-72890325",
    excludedStaffingAssociationTypeIds: Object.freeze([164, 187, 251, 249, 242, 218, 235]),
    staffingRoleAssociationTypeIds: Object.freeze({
      supervisingBcba: 247,
      initialAssessmentBcba: 223,
      reEvaluationBcba: 229,
      primaryBt1: 238,
      primaryBt2: 240,
      subBcba: 217,
      outgoingSubBcba: 221,
      outgoingSupervisingBcba: 253,
      onLeaveBcba: 233,
      outgoingBt1: 244,
      outgoingBt2: 236
    }),
    gradPermitSupervisorAssociationTypeId: 227
  }),
  // Production
  "50317927": Object.freeze({
    bcbaObjectTypeId: "2-48354212",
    btRbtObjectTypeId: "2-48354559",
    excludedStaffingAssociationTypeIds: Object.freeze([20, 64, 153, 80, 74, 164, 286]),
    staffingRoleAssociationTypeIds: Object.freeze({
      supervisingBcba: 82,
      initialAssessmentBcba: 86,
      reEvaluationBcba: 145,
      primaryBt1: 76,
      primaryBt2: 143,
      subBcba: 234,
      outgoingSubBcba: 288,
      outgoingSupervisingBcba: 135,
      onLeaveBcba: 236,
      outgoingBt1: 131,
      outgoingBt2: 166
    }),
    gradPermitSupervisorAssociationTypeId: 151
  })
});

// The object type settings no longer override the table. They may be left out; a value that
// differs from the table is invalid configuration.
const PORTAL_OBJECT_TYPE_ENV_NAMES = Object.freeze({
  HS_BCBA_OBJECT_TYPE_ID: "bcbaObjectTypeId",
  HS_BT_RBT_OBJECT_TYPE_ID: "btRbtObjectTypeId"
});

// Production portal only (items 14 and 24, D18): each path's gate setting must name exactly this
// property, so a missing, swapped or misspelt name refuses to run. The sandbox may name any
// property, or neither (then both paths fall back to SYNC_RECORD_GATE_PROPERTY).
const PRODUCTION_PORTAL_ID = "50317927";
export const PRODUCTION_GATE_PROPERTIES = Object.freeze({
  SYNC_CREATE_GATE_PROPERTY: "centralreach_creates_only",
  SYNC_UPDATE_GATE_PROPERTY: "centralreach_updates_only"
});
const PATH_GATE_ENV_NAMES = Object.freeze(Object.keys(PRODUCTION_GATE_PROPERTIES));

function invalidConfiguration(name) {
  return new Error(`Invalid configuration: ${name}`);
}

// The table row for one portal ID. Throws for any portal that is not in the table.
export function hubspotPortalSettings(portalId) {
  const id = String(portalId ?? "").trim();
  if (!Object.hasOwn(HUBSPOT_PORTALS, id)) {
    throw invalidConfiguration("HUBSPOT_PORTAL_ID");
  }
  return { portalId: id, ...HUBSPOT_PORTALS[id] };
}

function invalidPortalEnvNames(env) {
  const portalId = String(env.HUBSPOT_PORTAL_ID ?? "").trim();
  if (!portalId) {
    return [];
  }
  if (!Object.hasOwn(HUBSPOT_PORTALS, portalId)) {
    return ["HUBSPOT_PORTAL_ID"];
  }
  return Object.entries(PORTAL_OBJECT_TYPE_ENV_NAMES)
    .filter(([name, key]) => {
      const value = String(env[name] ?? "").trim();
      return value !== "" && value !== HUBSPOT_PORTALS[portalId][key];
    })
    .map(([name]) => name);
}

// The configured portal and its table row, read from the app settings at call time.
export function resolveHubSpotPortal(env = process.env) {
  const portal = hubspotPortalSettings(env.HUBSPOT_PORTAL_ID);
  const invalid = invalidPortalEnvNames(env);
  if (invalid.length > 0) {
    throw invalidConfiguration(invalid.join(", "));
  }
  return portal;
}

export function hubspotPortalId() {
  return resolveHubSpotPortal().portalId;
}

// Guide: skip test_record = true in normal processing. Set INCLUDE_TEST_RECORDS=true only for a
// deliberate end-to-end test run.
function isTrueSetting(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

export function includeTestRecords() {
  return isTrueSetting(process.env.INCLUDE_TEST_RECORDS);
}

function settingValue(value) {
  return String(value ?? "").trim();
}

function isNoneSetting(value) {
  return settingValue(value).toLowerCase() === "none";
}

// Both path settings are set: SYNC_RECORD_GATE_PROPERTY is then not read and may be left out.
function pathGatesSet(env) {
  return PATH_GATE_ENV_NAMES.every((name) => settingValue(env[name]) !== "");
}

// Required app setting, unless both path settings are set. "none" turns the gate off on purpose.
// Anything else is the HubSpot checkbox property a record must have set to true.
export function syncRecordGateProperty(
  value = process.env.SYNC_RECORD_GATE_PROPERTY,
  { optional = false } = {}
) {
  const raw = settingValue(value);
  if (!raw) {
    if (optional) {
      return null;
    }
    throw new Error("Missing required environment variable: SYNC_RECORD_GATE_PROPERTY");
  }
  if (isNoneSetting(raw)) {
    return null;
  }
  return raw;
}

// SYNC_CREATE_GATE_PROPERTY or SYNC_UPDATE_GATE_PROPERTY (item 24). Not set → null: that path
// falls back to SYNC_RECORD_GATE_PROPERTY (syncEligibility.gateProperties). "none" is invalid on
// every portal: the only off switch is SYNC_RECORD_GATE_PROPERTY = none, sandbox only.
export function syncPathGateProperty(name, value = process.env[name]) {
  const raw = settingValue(value);
  if (!raw) {
    return null;
  }
  if (isNoneSetting(raw)) {
    throw invalidConfiguration(name);
  }
  return raw;
}

// The raw gate settings. The fallback of a path to the record gate is not done here.
function gateSettings(env = process.env) {
  return {
    recordGateProperty: syncRecordGateProperty(env.SYNC_RECORD_GATE_PROPERTY, {
      optional: pathGatesSet(env)
    }),
    createGateProperty: syncPathGateProperty(
      "SYNC_CREATE_GATE_PROPERTY",
      env.SYNC_CREATE_GATE_PROPERTY
    ),
    updateGateProperty: syncPathGateProperty(
      "SYNC_UPDATE_GATE_PROPERTY",
      env.SYNC_UPDATE_GATE_PROPERTY
    )
  };
}

// Items 14 and 24 (R-28, row 3.12): settings that would open a gate. A path setting of "none" is
// invalid everywhere. In production, each path setting must be exactly its production name, and
// SYNC_RECORD_GATE_PROPERTY = none and INCLUDE_TEST_RECORDS = true are invalid. The sandbox keeps
// both options.
function invalidGateEnvNames(env) {
  const invalid = PATH_GATE_ENV_NAMES.filter((name) => isNoneSetting(env[name]));
  if (settingValue(env.HUBSPOT_PORTAL_ID) !== PRODUCTION_PORTAL_ID) {
    return invalid;
  }
  for (const [name, exactName] of Object.entries(PRODUCTION_GATE_PROPERTIES)) {
    if (settingValue(env[name]) !== exactName && !invalid.includes(name)) {
      invalid.push(name);
    }
  }
  if (isNoneSetting(env.SYNC_RECORD_GATE_PROPERTY)) {
    invalid.push("SYNC_RECORD_GATE_PROPERTY");
  }
  if (isTrueSetting(env.INCLUDE_TEST_RECORDS)) {
    invalid.push("INCLUDE_TEST_RECORDS");
  }
  return invalid;
}

// Central Reach has no sandbox, so an employee create is always a production write. It needs both
// settings stated on purpose: ALLOW_EMPLOYEE_CREATE=true and PUT_ONLY_MODE=false. A missing
// setting blocks the create on every portal.
export function employeeCreateFeatures({ allowEmployeeCreate = "", putOnlyMode = "" } = {}) {
  const allowRaw = String(allowEmployeeCreate ?? "").trim();
  const putRaw = String(putOnlyMode ?? "").trim();
  return {
    allowEmployeeCreate: allowRaw.toLowerCase() === "true",
    putOnlyMode: putRaw.toLowerCase() !== "false"
  };
}

function isPlaceholderValue(value) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return false;
  }

  return (
    trimmed === "CHANGE_ME" ||
    trimmed.includes("CHANGE_ME") ||
    trimmed === "change_me_property_name" ||
    trimmed === "[\"CHANGE_ME\"]"
  );
}

function invalidLeaseEnvNames(env) {
  const raw = String(env.LEASE_TTL_SECONDS ?? "").trim();
  if (!raw) {
    return [];
  }
  const seconds = Number(raw);
  const outlivesTheRun = Number.isFinite(seconds) && seconds > FUNCTION_TIMEOUT_SECONDS;
  return outlivesTheRun ? [] : ["LEASE_TTL_SECONDS"];
}

// SYNC_RECORD_GATE_PROPERTY is required only while one of the two path settings is not set.
function requiredEnvNames(names, env) {
  return pathGatesSet(env) ? names.filter((name) => name !== "SYNC_RECORD_GATE_PROPERTY") : names;
}

function validateEnvNames(requiredNames) {
  const missing = [];
  const placeholders = [];

  requiredEnvNames(requiredNames, process.env).forEach((name) => {
    const value = process.env[name];
    if (!value || value.trim() === "") {
      missing.push(name);
      return;
    }

    if (isPlaceholderValue(value)) {
      placeholders.push(name);
    }
  });

  // Set, but with a value the integration must not run with.
  const invalid = [
    ...invalidPortalEnvNames(process.env),
    ...invalidLeaseEnvNames(process.env),
    ...invalidGateEnvNames(process.env)
  ];

  return {
    isValid: missing.length === 0 && placeholders.length === 0 && invalid.length === 0,
    missing,
    placeholders,
    invalid
  };
}

function assertValidConfiguration(validation) {
  if (validation.isValid) {
    return;
  }
  const details = [
    validation.missing.length > 0 ? `Missing variables: ${validation.missing.join(", ")}` : "",
    validation.placeholders.length > 0
      ? `Placeholder variables: ${validation.placeholders.join(", ")}`
      : "",
    validation.invalid.length > 0 ? `Invalid variables: ${validation.invalid.join(", ")}` : ""
  ]
    .filter(Boolean)
    .join(". ");
  throw new Error(`Configuration validation failed. ${details}`);
}

export function validateConfig() {
  return validateEnvNames(REQUIRED_ENV_NAMES);
}

export function validateIntakePollerConfig() {
  return validateEnvNames(REQUIRED_INTAKE_ENV_NAMES);
}

export function getIntakePollerConfig() {
  assertValidConfiguration(validateIntakePollerConfig());
  const portal = resolveHubSpotPortal();

  return {
    hubspot: {
      privateAppToken: getRequiredEnv("HUBSPOT_PRIVATE_APP_TOKEN"),
      baseUrl: getRequiredEnv("HUBSPOT_BASE_URL"),
      hubspotPortalId: portal.portalId,
      btRbtObjectTypeId: portal.btRbtObjectTypeId,
      bcbaObjectTypeId: portal.bcbaObjectTypeId,
      // The properties that hold the CR ID. A record is linked when its property is filled.
      crContactIdProperty: getOptionalEnv("HUBSPOT_CR_CONTACT_ID_PROPERTY", "client_id_number"),
      employeeIdProperty: getOptionalEnv("HUBSPOT_EMPLOYEE_ID_PROPERTY", "employee_id")
    },
    // The poller and the daily sweep search inside the record gate (BUILD-PLAN row 3.4), one
    // gate per path (item 24).
    sync: gateSettings(),
    ttl: {
      leaseTtlSeconds: Number(getRequiredEnv("LEASE_TTL_SECONDS"))
    },
    state: {
      cosmosEndpoint: getRequiredEnv("COSMOS_ENDPOINT"),
      cosmosKey: getRequiredEnv("COSMOS_KEY"),
      cosmosDatabaseId: getRequiredEnv("COSMOS_DATABASE_ID"),
      cosmosContainerId: getRequiredEnv("COSMOS_CONTAINER_ID")
    },
    serviceBus: {
      connectionString: getRequiredEnv("SERVICE_BUS_CONNECTION_STRING"),
      clientSyncQueueName: getRequiredEnv("CLIENT_SYNC_QUEUE_NAME"),
      employeeSyncQueueName: getRequiredEnv("EMPLOYEE_SYNC_QUEUE_NAME")
    }
  };
}

export function getConfig() {
  assertValidConfiguration(validateConfig());
  const portal = resolveHubSpotPortal();

  return {
    centralReach: {
      clientId: getRequiredEnv("CR_CLIENT_ID"),
      clientSecret: getRequiredEnv("CR_CLIENT_SECRET"),
      apiKey: getRequiredEnv("CR_API_KEY"),
      baseUrl: getRequiredEnv("CR_BASE_URL"),
      tokenUrl: getRequiredEnv("CR_TOKEN_URL")
    },
    hubspot: {
      privateAppToken: getRequiredEnv("HUBSPOT_PRIVATE_APP_TOKEN"),
      baseUrl: getRequiredEnv("HUBSPOT_BASE_URL"),
      crContactIdProperty: getRequiredEnv("HUBSPOT_CR_CONTACT_ID_PROPERTY"),
      btRbtObjectTypeId: portal.btRbtObjectTypeId,
      bcbaObjectTypeId: portal.bcbaObjectTypeId,
      hubspotPortalId: portal.portalId,
      employeeIdProperty: getOptionalEnv("HUBSPOT_EMPLOYEE_ID_PROPERTY", "employee_id")
    },
    sync: {
      includeTestRecords: includeTestRecords(),
      ...gateSettings()
    },
    ttl: {
      leaseTtlSeconds: Number(getRequiredEnv("LEASE_TTL_SECONDS")),
      successTtlSeconds: Number(getRequiredEnv("SUCCESS_TTL_SECONDS")),
      failTtlSeconds: Number(getRequiredEnv("FAIL_TTL_SECONDS"))
    },
    state: {
      cosmosEndpoint: getRequiredEnv("COSMOS_ENDPOINT"),
      cosmosKey: getRequiredEnv("COSMOS_KEY"),
      cosmosDatabaseId: getRequiredEnv("COSMOS_DATABASE_ID"),
      cosmosContainerId: getRequiredEnv("COSMOS_CONTAINER_ID")
    },
    serviceBus: {
      connectionString: getRequiredEnv("SERVICE_BUS_CONNECTION_STRING"),
      clientSyncQueueName: getRequiredEnv("CLIENT_SYNC_QUEUE_NAME"),
      employeeSyncQueueName: getRequiredEnv("EMPLOYEE_SYNC_QUEUE_NAME")
    },
    features: employeeCreateFeatures({
      allowEmployeeCreate: process.env.ALLOW_EMPLOYEE_CREATE,
      putOnlyMode: process.env.PUT_ONLY_MODE
    })
  };
}
