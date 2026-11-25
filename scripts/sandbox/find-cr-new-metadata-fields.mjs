// Lists CentralReach metadata (custom) field definitions that are new since the saved catalog
// (docs/workstreams/architecture-update/cr-catalog-snapshot.json), plus every field whose name
// holds "coordinator". Written to find the Care Coordinator field Zeke created on 2026-11-25
// (tracker item O-17).
//
// READ-ONLY, AND IT READS PRODUCTION (CentralReach has no sandbox). Two calls: one token POST to
// CR_TOKEN_URL and one GET /contacts/metadata-configuration. It reads field definitions only, no
// employee or client record. It prints field IDs, names, types and contact types; never a token,
// a header, a settings value or a raw response.
//
// Usage (from the repo root):
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/find-cr-new-metadata-fields.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SNAPSHOT_PATH = "docs/workstreams/architecture-update/cr-catalog-snapshot.json";
const SETTING_NAMES = ["CR_CLIENT_ID", "CR_CLIENT_SECRET", "CR_API_KEY", "CR_BASE_URL", "CR_TOKEN_URL"];

function loadSettings() {
  let values;
  try {
    values = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"))?.Values || {};
  } catch {
    throw new Error("local.settings.json could not be read as JSON (run from the repo root).");
  }
  const missing = SETTING_NAMES.filter((name) => !String(values[name] ?? "").trim());
  if (missing.length) throw new Error(`Missing in local.settings.json Values: ${missing.join(", ")}`);
  return Object.fromEntries(SETTING_NAMES.map((name) => [name, String(values[name]).trim()]));
}

let SETTINGS;

// The only door to the network. GET anywhere; POST only to the token URL; nothing else.
function guardedFetch(url, init = {}) {
  const method = String(init.method || "GET").toUpperCase();
  const isTokenRequest = method === "POST" && url === SETTINGS.CR_TOKEN_URL;
  if (method !== "GET" && !isTokenRequest) throw new Error(`Refused a ${method}: this script is read-only.`);
  return fetch(url, { ...init, method }).catch(() => {
    throw new Error(`A ${method} got no answer (network, proxy or URL; is NODE_USE_ENV_PROXY=1 set?).`);
  });
}

async function getToken() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: SETTINGS.CR_CLIENT_ID,
    client_secret: SETTINGS.CR_CLIENT_SECRET,
    scope: "cr-api"
  });
  const res = await guardedFetch(SETTINGS.CR_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString()
  });
  const data = res.ok ? await res.json().catch(() => null) : null;
  if (!data?.access_token) throw new Error(`Token request failed (HTTP ${res.status}).`);
  return data.access_token;
}

const keyOf = (node, pattern) => Object.keys(node).find((key) => pattern.test(key));

// The answer's shape is not assumed: every object that has both an ID key and a name key is a field.
function collectFields(node, found = []) {
  if (Array.isArray(node)) {
    node.forEach((child) => collectFields(child, found));
  } else if (node && typeof node === "object") {
    const idKey = keyOf(node, /^(fieldid|metadatafieldid|id)$/i);
    const nameKey = keyOf(node, /^(fieldname|name|label)$/i);
    if (idKey && nameKey && Number.isFinite(Number(node[idKey]))) {
      const typeKey = keyOf(node, /^(type|fieldtype)$/i);
      const contactTypeKey = keyOf(node, /^(contacttype|entity|entitytype)$/i);
      found.push({
        fieldId: Number(node[idKey]),
        fieldName: String(node[nameKey]),
        type: typeKey ? String(node[typeKey]) : "",
        contactType: contactTypeKey ? String(node[contactTypeKey]) : ""
      });
    }
    Object.values(node).forEach((child) => collectFields(child, found));
  }
  return found;
}

const line = (field) =>
  `  ${field.fieldId} | ${field.fieldName} | type: ${field.type || "?"} | contact type: ${field.contactType || "?"}`;

async function main() {
  SETTINGS = loadSettings();
  const known = new Set(JSON.parse(readFileSync(resolve(SNAPSHOT_PATH), "utf8")).metadataFields.map((f) => f.fieldId));
  const token = await getToken();
  const url = `${SETTINGS.CR_BASE_URL.replace(/\/+$/, "")}/contacts/metadata-configuration`;
  const res = await guardedFetch(url, {
    headers: { Authorization: `Bearer ${token}`, "x-api-key": SETTINGS.CR_API_KEY, Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`GET /contacts/metadata-configuration -> HTTP ${res.status}`);
  const answer = await res.json().catch(() => {
    throw new Error("GET /contacts/metadata-configuration answered with a body that is not JSON.");
  });

  const fields = [...new Map(collectFields(answer).map((field) => [field.fieldId, field])).values()];
  if (!fields.length) {
    const topKeys = Array.isArray(answer) ? Object.keys(answer[0] || {}) : Object.keys(answer || {});
    console.log(`No field definitions recognised. Top-level key names: ${topKeys.join(", ")}`);
    process.exit(1);
  }
  const added = fields.filter((field) => !known.has(field.fieldId));
  const coordinators = fields.filter((field) => /coordinator/i.test(field.fieldName));

  console.log(`CentralReach calls: 2 (1 token POST, 1 GET). Fields now: ${fields.length}; in the saved catalog: ${known.size}.`);
  console.log(`New since the catalog (${added.length}):`);
  console.log(added.length ? added.map(line).join("\n") : "  none");
  console.log(`Name holds "coordinator" (${coordinators.length}):`);
  console.log(coordinators.length ? coordinators.map(line).join("\n") : "  none");
}

main().catch((error) => {
  console.error(`STOPPED: ${error.message}`);
  process.exit(1);
});
