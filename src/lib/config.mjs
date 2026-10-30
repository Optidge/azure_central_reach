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
  "HS_DEAL_PIPELINE_ID",
  "HS_STAGE_ALLOWLIST_JSON",
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
  "HS_BT_RBT_OBJECT_TYPE_ID",
  "HS_BT_RBT_PIPELINE_ID",
  "HS_BT_RBT_STAGE_ALLOWLIST_JSON",
  "HS_BCBA_OBJECT_TYPE_ID",
  "HS_BCBA_PIPELINE_ID",
  "HS_BCBA_STAGE_ALLOWLIST_JSON"
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
  "HS_BT_RBT_OBJECT_TYPE_ID",
  "HS_BCBA_OBJECT_TYPE_ID"
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

export function getBooleanEnv(name, defaultValue) {
  const value = getOptionalEnv(name, "").toLowerCase();
  if (value === "") {
    return defaultValue;
  }
  return value === "true";
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

function parseRequiredJsonArray(name) {
  const rawValue = getRequiredEnv(name);
  let parsed;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error(`Configuration validation failed. ${name} must be valid JSON array`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Configuration validation failed. ${name} must be a non-empty JSON array`);
  }

  return parsed.map((value) => String(value));
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
      btRbtObjectTypeId: getRequiredEnv("HS_BT_RBT_OBJECT_TYPE_ID"),
      bcbaObjectTypeId: getRequiredEnv("HS_BCBA_OBJECT_TYPE_ID")
    },
    sweep: {
      createSweepEnabled: getBooleanEnv("CREATE_SWEEP_ENABLED", false),
      graceMinutes: Number(getOptionalEnv("CREATE_SWEEP_GRACE_MINUTES", "10"))
    },
    limits: {
      maxDealsPerRun: Number(getRequiredEnv("MAX_DEALS_PER_RUN")),
      maxBtRbtPerRun: Number(getRequiredEnv("MAX_BT_RBT_PER_RUN")),
      maxBcbaPerRun: Number(getRequiredEnv("MAX_BCBA_PER_RUN")),
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
      dealPipelineId: getRequiredEnv("HS_DEAL_PIPELINE_ID"),
      stageAllowlistJson: getRequiredEnv("HS_STAGE_ALLOWLIST_JSON"),
      crContactIdProperty: getRequiredEnv("HUBSPOT_CR_CONTACT_ID_PROPERTY"),
      btRbtObjectTypeId: getRequiredEnv("HS_BT_RBT_OBJECT_TYPE_ID"),
      btRbtPipelineId: getRequiredEnv("HS_BT_RBT_PIPELINE_ID"),
      btRbtStageAllowlist: parseRequiredJsonArray("HS_BT_RBT_STAGE_ALLOWLIST_JSON"),
      bcbaObjectTypeId: getRequiredEnv("HS_BCBA_OBJECT_TYPE_ID"),
      bcbaPipelineId: getRequiredEnv("HS_BCBA_PIPELINE_ID"),
      bcbaStageAllowlist: parseRequiredJsonArray("HS_BCBA_STAGE_ALLOWLIST_JSON"),
      hubspotPortalId: getOptionalEnv("HUBSPOT_PORTAL_ID", ""),
      employeeIdProperty: getOptionalEnv("HUBSPOT_EMPLOYEE_ID_PROPERTY", "employee_id")
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
    features: {
      allowEmployeeCreate:
        String(getOptionalEnv("ALLOW_EMPLOYEE_CREATE", "false")).toLowerCase() === "true",
      putOnlyMode: String(getOptionalEnv("PUT_ONLY_MODE", "true")).toLowerCase() !== "false",
      syncDryRun: getBooleanEnv("SYNC_DRY_RUN", false)
    }
  };
}
