/**
 * CentralReach: no account/tenant ID env var — OAuth/API uses CR_CLIENT_ID,
 * CR_CLIENT_SECRET, CR_API_KEY with CR_BASE_URL / CR_TOKEN_URL only.
 *
 * Not loaded by this repo (omit from Azure for this app): HUBSPOT_FIELD_ADMIN_TOKEN,
 * HUBSPOT_SETTINGS_CLIENT_SECRET, HUBSPOT_FIELD_ADMIN_USER_IDS, HUBSPOT_PUBLIC_BASE_URL,
 * FIELD_MAPPING_DEMO_MODE, ALLOW_UNVERIFIED_TYPED_METADATA_WRITES.
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
  "MAX_DEALS_PER_RUN",
  "MAX_BT_RBT_PER_RUN",
  "MAX_BCBA_PER_RUN",
  "DEDUPE_TTL_SECONDS",
  "LEASE_TTL_SECONDS",
  "SUCCESS_TTL_SECONDS",
  "FAIL_TTL_SECONDS",
  "STATE_PROVIDER",
  "COSMOS_ENDPOINT",
  "COSMOS_KEY",
  "COSMOS_DATABASE_ID",
  "COSMOS_CONTAINER_ID",
  "STATE_TTL_ATTR",
  "SERVICE_BUS_CONNECTION_STRING",
  "CLIENT_SYNC_QUEUE_NAME",
  "EMPLOYEE_SYNC_QUEUE_NAME",
  "SYNC_RECORD_GATE_PROPERTY",
  "HUBSPOT_PORTAL_ID"
];

const REQUIRED_INTAKE_ENV_NAMES = [
  "HUBSPOT_PRIVATE_APP_TOKEN",
  "HUBSPOT_BASE_URL",
  "MAX_BT_RBT_PER_RUN",
  "MAX_BCBA_PER_RUN",
  "MAX_DEALS_PER_RUN",
  "DEDUPE_TTL_SECONDS",
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
      primaryBt2: 240
    })
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
      primaryBt2: 143
    })
  })
});

// The object type settings no longer override the table. They may be left out; a value that
// differs from the table is invalid configuration.
const PORTAL_OBJECT_TYPE_ENV_NAMES = Object.freeze({
  HS_BCBA_OBJECT_TYPE_ID: "bcbaObjectTypeId",
  HS_BT_RBT_OBJECT_TYPE_ID: "btRbtObjectTypeId"
});

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
export function includeTestRecords() {
  return getOptionalEnv("INCLUDE_TEST_RECORDS", "false").toLowerCase() === "true";
}

// Required app setting. "none" turns the gate off on purpose. Anything else is the
// HubSpot checkbox property a record must have set to true.
export function syncRecordGateProperty(value = process.env.SYNC_RECORD_GATE_PROPERTY) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new Error("Missing required environment variable: SYNC_RECORD_GATE_PROPERTY");
  }
  if (raw.toLowerCase() === "none") {
    return null;
  }
  return raw;
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

function validateEnvNames(requiredNames) {
  const missing = [];
  const placeholders = [];

  requiredNames.forEach((name) => {
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
  const invalid = [...invalidPortalEnvNames(process.env), ...invalidLeaseEnvNames(process.env)];

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
      bcbaObjectTypeId: portal.bcbaObjectTypeId
    },
    limits: {
      maxDealsPerRun: Number(getRequiredEnv("MAX_DEALS_PER_RUN")),
      maxBtRbtPerRun: Number(getRequiredEnv("MAX_BT_RBT_PER_RUN")),
      maxBcbaPerRun: Number(getRequiredEnv("MAX_BCBA_PER_RUN")),
      maxSearchRequestsPerRun: Number(getOptionalEnv("MAX_SEARCH_REQUESTS_PER_SECTION", "1")),
      lookbackMinutes: Number(getOptionalEnv("LOOKBACK_MINUTES", "15")),
      linkedRecheckEnabled:
        String(getOptionalEnv("LINKED_RECHECK_ENABLED", "true")).toLowerCase() !== "false",
      crContactIdProperty: getOptionalEnv("HUBSPOT_CR_CONTACT_ID_PROPERTY", "client_id_number"),
      employeeIdProperty: getOptionalEnv("HUBSPOT_EMPLOYEE_ID_PROPERTY", "employee_id")
    },
    ttl: {
      dedupeTtlSeconds: Number(getRequiredEnv("DEDUPE_TTL_SECONDS")),
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
      recordGateProperty: syncRecordGateProperty()
    },
    limits: {
      maxDealsPerRun: Number(getRequiredEnv("MAX_DEALS_PER_RUN")),
      maxBtRbtPerRun: Number(getRequiredEnv("MAX_BT_RBT_PER_RUN")),
      maxBcbaPerRun: Number(getRequiredEnv("MAX_BCBA_PER_RUN"))
    },
    ttl: {
      dedupeTtlSeconds: Number(getRequiredEnv("DEDUPE_TTL_SECONDS")),
      leaseTtlSeconds: Number(getRequiredEnv("LEASE_TTL_SECONDS")),
      successTtlSeconds: Number(getRequiredEnv("SUCCESS_TTL_SECONDS")),
      failTtlSeconds: Number(getRequiredEnv("FAIL_TTL_SECONDS")),
      stateTtlAttr: getRequiredEnv("STATE_TTL_ATTR")
    },
    state: {
      provider: getRequiredEnv("STATE_PROVIDER"),
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
