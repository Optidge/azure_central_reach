// Reads the association types a sandbox Case holds to its BCBA and BT/RBT records (requirements
// review 01, gaps a15 and d8). GET only: every other method is refused before it is sent.
//
// SANDBOX ONLY. Before any read it checks that the token belongs to portal 52311591 and that the
// account is a SANDBOX; otherwise it stops. Allowed paths: /account-info/v3/details and
// /crm/v4/objects/{deals|0-3}/{id}/associations/{2-72890322|2-72890325}. Output is association
// data only (record IDs, type IDs, categories, labels) and the call count; no record properties.
//
// Usage (from the repo root):
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/read-case-associations.mjs <caseId> [<caseId> ...]
//
// The token is HUBSPOT_PRIVATE_APP_TOKEN from local.settings.json, read at run time, never printed.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SANDBOX_PORTAL = "52311591";
const TARGETS = { bcba: "2-72890322", bt: "2-72890325" };
const ACCOUNT_PATH = "/account-info/v3/details";
const ASSOCIATION_PATH = /^\/crm\/v4\/objects\/(deals|0-3)\/\d+\/associations\/(2-72890322|2-72890325)$/;
const ALLOWED_QUERY_KEYS = new Set(["limit", "after"]);

const caseIds = process.argv.slice(2);
if (!caseIds.length || caseIds.some((id) => !/^\d+$/.test(id))) {
  console.error("Give one or more numeric Case IDs.");
  process.exit(1);
}

function loadToken() {
  const settings = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"));
  const token = settings?.Values?.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN is not in local.settings.json");
  return token;
}
const TOKEN = loadToken();

// Refuses anything but a GET to an allowed path, before the request is sent.
function assertAllowed(method, pathWithQuery) {
  if (method !== "GET") throw new Error(`Refused ${method}: this script sends GET only.`);
  const url = new URL(pathWithQuery, "https://api.hubapi.com");
  const pathAllowed = url.pathname === ACCOUNT_PATH || ASSOCIATION_PATH.test(url.pathname);
  const queryAllowed = [...url.searchParams.keys()].every((key) => ALLOWED_QUERY_KEYS.has(key));
  if (!pathAllowed || !queryAllowed) throw new Error(`Refused GET ${url.pathname}: path not allowed.`);
  return url;
}

let callCount = 0;
async function hsGet(pathWithQuery) {
  const url = assertAllowed("GET", pathWithQuery);
  await new Promise((r) => setTimeout(r, 120));
  callCount += 1;
  const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${TOKEN}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url.pathname} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// All association rows of one Case to one target type, following the paging cursor.
async function readAssociations(caseId, toType) {
  const rows = [];
  let after = null;
  do {
    const query = `?limit=500${after ? `&after=${encodeURIComponent(after)}` : ""}`;
    const page = await hsGet(`/crm/v4/objects/deals/${caseId}/associations/${toType}${query}`);
    if (!Array.isArray(page.results)) throw new Error(`No results list for Case ${caseId} -> ${toType}.`);
    rows.push(...page.results);
    after = page.paging?.next?.after ?? null;
  } while (after);
  return rows;
}

const describeType = (t) => `${t.typeId} ${t.category}${t.label ? ` "${t.label}"` : " (unlabeled)"}`;

async function main() {
  const acct = await hsGet(ACCOUNT_PATH);
  if (String(acct.portalId) !== SANDBOX_PORTAL || acct.accountType !== "SANDBOX") {
    throw new Error(`Portal ${acct.portalId} (${acct.accountType}) is not sandbox ${SANDBOX_PORTAL}. Stopped.`);
  }
  console.log(`Sandbox ${acct.portalId} confirmed. GET only.`);

  for (const caseId of caseIds) {
    console.log(`\nCase ${caseId}`);
    for (const [name, toType] of Object.entries(TARGETS)) {
      const rows = await readAssociations(caseId, toType);
      console.log(`  -> ${name} (${toType}): ${rows.length} record(s)`);
      for (const row of [...rows].sort((a, b) => String(a.toObjectId).localeCompare(String(b.toObjectId)))) {
        const types = [...(row.associationTypes || [])].sort((a, b) => a.typeId - b.typeId);
        console.log(`     ${row.toObjectId}: ${types.map(describeType).join("; ")}`);
      }
    }
  }
  console.log(`\nHubSpot calls: ${callCount} (all GET).`);
}

main().catch((e) => {
  console.error(`Stopped: ${e.message}`);
  console.error(`HubSpot calls: ${callCount} (all GET).`);
  process.exit(1);
});
