// Creates sandbox properties in scripts/sandbox-hubspot-properties.json.
// Enumeration properties include the option lists copied from production portal 50317927.
// Properties that already exist are skipped. Also creates the Case → BCBA association
// label RE BCBA when it is missing.
//
// Usage, from azure_central_reach, with the portal 50850427 private app token:
//   HUBSPOT_PRIVATE_APP_TOKEN=... node scripts/create-sandbox-hubspot-properties.mjs
//   HUBSPOT_PRIVATE_APP_TOKEN=... node scripts/create-sandbox-hubspot-properties.mjs --dry-run
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios from "axios";

const EXPECTED_PORTAL_ID = 50850427;
const specPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "sandbox-hubspot-properties.json"
);

function loadSpec() {
  return JSON.parse(fs.readFileSync(specPath, "utf8"));
}

function requireToken() {
  const token = String(process.env.HUBSPOT_PRIVATE_APP_TOKEN || "").trim();
  if (!token) {
    throw new Error(
      "Set HUBSPOT_PRIVATE_APP_TOKEN for sandbox portal 50850427 before running this script."
    );
  }
  return token;
}

function hubspotClient(token) {
  return axios.create({
    baseURL: "https://api.hubapi.com",
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000
  });
}

function errorSummary(error) {
  const data = error?.response?.data;
  return {
    status: error?.response?.status || null,
    message: data?.message || error?.message || "request failed",
    category: data?.category || null
  };
}

async function assertPortal(client, expectedPortalId) {
  const response = await client.get("/account-info/v3/details");
  const portalId = Number(response.data?.portalId);
  if (portalId !== expectedPortalId) {
    throw new Error(
      `Refusing to write. Token portal is ${portalId}; this spec is for ${expectedPortalId}.`
    );
  }
  return portalId;
}

async function propertyExists(client, property) {
  try {
    await client.get(`/crm/v3/properties/${property.objectType}/${property.name}`);
    return true;
  } catch (error) {
    if (error?.response?.status === 404) {
      return false;
    }
    throw error;
  }
}

function createBody(property) {
  const body = {
    groupName: property.groupName,
    name: property.name,
    label: property.label,
    type: property.type,
    fieldType: property.fieldType,
    description: property.description
  };
  if (Array.isArray(property.options) && property.options.length > 0) {
    body.options = property.options.map((option) => ({
      label: option.label,
      value: option.value,
      displayOrder: option.displayOrder,
      hidden: Boolean(option.hidden)
    }));
  }
  if (property.dataSensitivity && property.dataSensitivity !== "non_sensitive") {
    body.dataSensitivity = property.dataSensitivity;
  }
  if (Array.isArray(property.sensitiveDataCategories) && property.sensitiveDataCategories.length > 0) {
    body.sensitiveDataCategories = property.sensitiveDataCategories;
  }
  return body;
}

function missingSensitiveScope(error) {
  const message = String(error?.response?.data?.message || "");
  return error?.response?.status === 403 && message.includes("sensitive-data-property-create");
}

async function createProperty(client, property) {
  const post = async (body) => {
    try {
      await client.post(`/crm/properties/2026-09/${property.objectType}`, body);
      return { api: "2026-09" };
    } catch (error) {
      if (error?.response?.status !== 404) {
        throw error;
      }
    }
    await client.post(`/crm/v3/properties/${property.objectType}`, body);
    return { api: "v3" };
  };

  try {
    return await post(createBody(property));
  } catch (error) {
    if (!missingSensitiveScope(error) || !property.dataSensitivity) {
      throw error;
    }
    const body = createBody(property);
    delete body.dataSensitivity;
    delete body.sensitiveDataCategories;
    const created = await post(body);
    return {
      ...created,
      dataSensitivity: "non_sensitive",
      note: "Private app lacks sensitive-data-property-create. Created with the production options and without the sensitive flag."
    };
  }
}

async function ensureProperties(client, properties) {
  const results = [];
  for (const property of properties) {
    try {
      if (await propertyExists(client, property)) {
        results.push({ name: property.name, objectType: property.objectType, status: "exists" });
        continue;
      }
      const created = await createProperty(client, property);
      results.push({
        name: property.name,
        objectType: property.objectType,
        status: "created",
        api: created.api,
        ...(created.dataSensitivity ? { dataSensitivity: created.dataSensitivity } : {}),
        ...(created.note ? { note: created.note } : {})
      });
    } catch (error) {
      results.push({
        name: property.name,
        objectType: property.objectType,
        status: "failed",
        error: errorSummary(error)
      });
    }
  }
  return results;
}

function labelRows(data) {
  const rows = Array.isArray(data?.results) ? data.results : [];
  return rows.map((row) => ({
    typeId: row.typeId,
    label: row.label || null,
    category: row.category || null,
    fromObjectTypeId: row.fromObjectTypeId || null,
    toObjectTypeId: row.toObjectTypeId || null
  }));
}

async function readLabels(client, fromObjectType, toObjectType) {
  const response = await client.get(
    `/crm/v4/associations/${fromObjectType}/${toObjectType}/labels`
  );
  return labelRows(response.data);
}

async function ensureAssociationLabel(client, definition) {
  const existing = await readLabels(client, definition.fromObjectType, definition.toObjectType);
  const match = existing.find((row) => row.label === definition.label);
  if (match) {
    return { status: "exists", typeId: match.typeId, label: match.label };
  }

  const body = { label: definition.label, name: definition.name };
  try {
    await client.post(
      `/crm/associations/2026-09/${definition.fromObjectType}/${definition.toObjectType}/labels`,
      body
    );
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }
    await client.post(
      `/crm/v4/associations/${definition.fromObjectType}/${definition.toObjectType}/labels`,
      body
    );
  }

  const after = await readLabels(client, definition.fromObjectType, definition.toObjectType);
  const created = after.find((row) => row.label === definition.label);
  if (!created) {
    throw new Error(`Created ${definition.label} but the label was not returned on re-read.`);
  }
  return { status: "created", typeId: created.typeId, label: created.label };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const spec = loadSpec();
  const client = hubspotClient(requireToken());
  const portalId = await assertPortal(client, spec.portalId || EXPECTED_PORTAL_ID);

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          portalId,
          dryRun: true,
          wouldCreate: spec.create.map((property) => ({
            objectType: property.objectType,
            name: property.name
          })),
          pending: spec.pending.map((property) => ({
            objectType: property.objectType,
            name: property.name,
            reason: property.reason
          })),
          associationLabel: spec.associationLabel
        },
        null,
        2
      )
    );
    return;
  }

  const properties = await ensureProperties(client, spec.create);
  let association;
  try {
    association = await ensureAssociationLabel(client, spec.associationLabel);
  } catch (error) {
    association = { status: "failed", error: errorSummary(error) };
  }

  console.log(
    JSON.stringify(
      {
        portalId,
        properties,
        pending: spec.pending.map((property) => ({
          objectType: property.objectType,
          objectTypeId: property.objectTypeId,
          name: property.name,
          type: property.type,
          fieldType: property.fieldType,
          reason: property.reason
        })),
        association
      },
      null,
      2
    )
  );

  const failed =
    properties.some((row) => row.status === "failed") || association.status === "failed";
  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const summary = errorSummary(error);
  console.error(summary.message);
  process.exit(1);
});
