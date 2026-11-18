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
  "SYNC_RECORD_GATE_PROPERTY"
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
  "SYNC_RECORD_GATE_PROPERTY"
];

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
 * HubSpot portal values. One block is active at a time.
 *
 * ACTIVE: SANDBOX 52311591 (HubSpot CLI account central-reach-integration-sandbox).
 * After sandbox testing, comment out the SANDBOX block and uncomment the PRODUCTION block.
 * An app setting with the same name (HUBSPOT_PORTAL_ID, HS_BCBA_OBJECT_TYPE_ID,
 * HS_BT_RBT_OBJECT_TYPE_ID) wins over the value here, so switch local.settings.json and the
 * Azure app settings at the same time.
 *
 * Source: integration guide [SCURRENT] crosswalk, sandbox values read 2026-11-16.
 * No pipeline id or stage allowlist is needed. The guide syncs every pipeline and stage and
 * only skips CASE_EXCLUDED_STAGE_IDS (src/constants/hubspot.mjs), which match in both portals.
 */
export const HUBSPOT_PORTAL = Object.freeze({
  // --- SANDBOX 52311591 (active) ---
  portalId: "52311591",
  bcbaObjectTypeId: "2-72890322",
  btRbtObjectTypeId: "2-72890325",
  // Case -> BCBA / BT/RBT association types that must not sync: unlabeled BCBA 164,
  // unlabeled BT/RBT 187, Potential IA 251, Potential Supervising 249, Potential BT 1 242,
  // Potential BT 2 218, Previous IA 235.
  excludedStaffingAssociationTypeIds: Object.freeze([164, 187, 251, 249, 242, 218, 235])

  // --- PRODUCTION 50317927 (swap in after sandbox testing) ---
  // portalId: "50317927",
  // bcbaObjectTypeId: "2-48354212",
  // btRbtObjectTypeId: "2-48354559",
  // // Unlabeled BCBA 20, unlabeled BT/RBT 64, Potential IA 153, Potential Supervising 80,
  // // Potential BT 1 74, Potential BT 2 164, Previous IA 286.
  // excludedStaffingAssociationTypeIds: Object.freeze([20, 64, 153, 80, 74, 164, 286])
});

export function hubspotPortalId() {
  return getOptionalEnv("HUBSPOT_PORTAL_ID", HUBSPOT_PORTAL.portalId);
}

export function hubspotBcbaObjectTypeId() {
  return getOptionalEnv("HS_BCBA_OBJECT_TYPE_ID", HUBSPOT_PORTAL.bcbaObjectTypeId);
}

export function hubspotBtRbtObjectTypeId() {
  return getOptionalEnv("HS_BT_RBT_OBJECT_TYPE_ID", HUBSPOT_PORTAL.btRbtObjectTypeId);
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

export function validateConfig() {
  const missing = [];
  const placeholders = [];

  REQUIRED_ENV_NAMES.forEach((name) => {
    const value = process.env[name];
    if (!value || value.trim() === "") {
      missing.push(name);
      return;
    }

    if (isPlaceholderValue(value)) {
      placeholders.push(name);
    }
  });

  return {
    isValid: missing.length === 0 && placeholders.length === 0,
    missing,
    placeholders
  };
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

  return {
    isValid: missing.length === 0 && placeholders.length === 0,
    missing,
    placeholders
  };
}

export function validateIntakePollerConfig() {
  return validateEnvNames(REQUIRED_INTAKE_ENV_NAMES);
}

export function getIntakePollerConfig() {
  const validation = validateIntakePollerConfig();
  if (!validation.isValid) {
    const missingMessage =
      validation.missing.length > 0
        ? `Missing variables: ${validation.missing.join(", ")}`
        : "";
    const placeholderMessage =
      validation.placeholders.length > 0
        ? `Placeholder variables: ${validation.placeholders.join(", ")}`
        : "";
    const details = [missingMessage, placeholderMessage].filter(Boolean).join(". ");
    throw new Error(`Configuration validation failed. ${details}`);
  }

  return {
    hubspot: {
      privateAppToken: getRequiredEnv("HUBSPOT_PRIVATE_APP_TOKEN"),
      baseUrl: getRequiredEnv("HUBSPOT_BASE_URL"),
      btRbtObjectTypeId: hubspotBtRbtObjectTypeId(),
      bcbaObjectTypeId: hubspotBcbaObjectTypeId()
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
  const validation = validateConfig();
  if (!validation.isValid) {
    const missingMessage =
      validation.missing.length > 0
        ? `Missing variables: ${validation.missing.join(", ")}`
        : "";
    const placeholderMessage =
      validation.placeholders.length > 0
        ? `Placeholder variables: ${validation.placeholders.join(", ")}`
        : "";
    const details = [missingMessage, placeholderMessage].filter(Boolean).join(". ");
    throw new Error(`Configuration validation failed. ${details}`);
  }

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
      btRbtObjectTypeId: hubspotBtRbtObjectTypeId(),
      bcbaObjectTypeId: hubspotBcbaObjectTypeId(),
      hubspotPortalId: hubspotPortalId(),
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
