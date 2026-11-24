// READ-ONLY reads of HubSpot PRODUCTION (portal 50317927) that the 2026-11-24 requirements review
// could not make (docs/workstreams/architecture-update/requirements-review-2026-11-24/, slices 01-07).
// Only GET (account details, property definitions, association labels, pipelines) and the CRM search
// POST (counts only, limit 1) can be sent; anything else is refused before sending.
// Loads ONE key (HUBSPOT_PRIVATE_APP_TOKEN_PROD) from the given .env file and never prints it.
// Prints definitions, option lists, IDs and counts. It never prints a record or a record's values.
// Run from the repo root:
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/prod-review-reads.mjs .env
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/prod-review-reads.mjs .env --workday-ids 3581246,8146275,5729364
// --workday-ids (retest run sheet S0, pre-flight P-4): only the counts of production BCBAs and
// BT/RBTs whose `workday_id` equals each listed 7-digit test value. Expected 0 for every value.
// Nothing else is read in that mode.
import { readFileSync } from "node:fs";

const PRODUCTION = "50317927";
const DEAL = "0-3", BCBA = "2-48354212", BT = "2-48354559", CONTACT = "0-1";
const KEY = "HUBSPOT_PRIVATE_APP_TOKEN_PROD";
const BASE = "https://api.hubapi.com";
const [envPath] = process.argv.slice(2);
if (!envPath) { console.error("Usage: node scripts/sandbox/prod-review-reads.mjs <path-to-.env>"); process.exit(1); }

function loadToken() {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && m[1] === KEY) return m[2].replace(/^["']|["']$/g, "").trim();
  }
  return "";
}
const token = loadToken();
if (!token) { console.error(`${KEY} not loaded. Nothing was called.`); process.exit(1); }

const SEARCH = /^\/crm\/v3\/objects\/[A-Za-z0-9_-]+\/search$/;
const GETS = [
  /^\/account-info\/v3\/details$/,
  /^\/crm\/v3\/properties\/[A-Za-z0-9_-]+\/[A-Za-z0-9_]+$/,
  /^\/crm\/v4\/associations\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/labels$/,
  /^\/crm\/v3\/pipelines\/[A-Za-z0-9_-]+$/
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let calls = 0;
async function send(method, path, body) {
  const pathname = path.split("?")[0];
  const allowed = (method === "GET" && GETS.some((re) => re.test(pathname))) || (method === "POST" && SEARCH.test(pathname));
  if (!allowed) throw new Error(`REFUSED before sending: ${method} ${pathname}`);
  for (let attempt = 0; attempt < 6; attempt++) {
    calls++;
    const res = await fetch(BASE + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    let json = null; try { json = await res.json(); } catch { /* no body */ }
    if (res.status === 429 || res.status >= 500) { await sleep(1000 * 2 ** attempt); continue; }
    await sleep(150);
    return { status: res.status, json };
  }
  throw new Error(`gave up: ${method} ${pathname}`);
}

const account = await send("GET", "/account-info/v3/details");
if (account.status !== 200 || String(account.json?.portalId) !== PRODUCTION) {
  console.error(`STOPPED: portal ${account.json?.portalId ?? "unknown"} (HTTP ${account.status}).`); process.exit(1);
}
console.log(`Portal check ok: ${account.json.portalId}`);

// --- Retest pre-flight: production holders of the planned Workday test IDs (counts only) --------
const workdayArg = process.argv.indexOf("--workday-ids");
if (workdayArg !== -1) {
  const values = String(process.argv[workdayArg + 1] ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  if (!values.length || values.some((v) => !/^\d{7}$/.test(v))) {
    console.error("--workday-ids needs a comma list of 7-digit values."); process.exit(1);
  }
  let held = 0;
  for (const value of values) {
    for (const [label, obj] of [["BCBA", BCBA], ["BT/RBT", BT]]) {
      const r = await send("POST", `/crm/v3/objects/${obj}/search`,
        { filterGroups: [{ filters: [{ propertyName: "workday_id", operator: "EQ", value }] }], limit: 1, properties: ["hs_object_id"] });
      const total = r.status === 200 ? r.json?.total : `HTTP ${r.status}`;
      if (total !== 0) held += 1;
      console.log(`  workday_id ${value} on production ${label}: ${total}`);
    }
  }
  console.log(held ? "\nCOLLISION or read failure above: do not use that value; stop and tell Zeke." : "\nNo production holder for any value.");
  console.log(`HubSpot production calls: ${calls} (GET and count-only search). Nothing was written.`);
  process.exit(held ? 1 : 0);
}

// --- Slice 01: association labels and pipelines -------------------------------------------------
console.log("\n## 01 Association labels");
for (const [from, to] of [[DEAL, BCBA], [DEAL, BT], [BCBA, BCBA], [BCBA, CONTACT], [BT, CONTACT]]) {
  const r = await send("GET", `/crm/v4/associations/${from}/${to}/labels`);
  console.log(`${from} -> ${to}: HTTP ${r.status}`);
  for (const l of r.json?.results ?? []) console.log(`  typeId=${l.typeId} category=${l.category} label=${JSON.stringify(l.label)}`);
}
console.log("\n## 01 Pipelines and stages");
for (const obj of ["deals", BCBA, BT]) {
  const r = await send("GET", `/crm/v3/pipelines/${obj}`);
  console.log(`${obj}: HTTP ${r.status}, pipelines=${r.json?.results?.length ?? "?"}`);
  for (const p of r.json?.results ?? []) {
    console.log(`  pipeline id=${p.id} label=${JSON.stringify(p.label)}`);
    for (const s of p.stages ?? []) console.log(`    stage id=${s.id} label=${JSON.stringify(s.label)}`);
  }
}

// --- Slices 01-06: property definitions ---------------------------------------------------------
const DEFS = {
  [DEAL]: ["location", "staffing_status", "case_status", "specific_home_location", "insurance_primary", "referral_other",
    "care_coordinator_first_name", "care_coordinator_last_name", "care_coordinator_email", "coordinator_export_status",
    "service__stateregion_2", "centralreach_creates_only", "centralreach_updates_only", "last_sync_at", "integration_last_write"],
  [BCBA]: ["entered_in_centralreach", "bcba_in_cr_checklist", "date_of_birth", "dob", "personal_email", "email", "location",
    "assign_states", "lba_licensure__ny", "ny_insurance_labels", "co_insurance_labels", "nj_insurance_labels",
    "cr_billing_hold_label", "work_status", "centralreach_creates_only", "centralreach_updates_only", "last_sync_at",
    "integration_last_write"],
  [BT]: ["active_cases_count", "date_of_birth", "bt_rbt_type", "bt_to_rbt_path", "location", "btrbt_in_cr_checklist",
    "entered_in_centralreach", "centralreach_creates_only", "centralreach_updates_only", "last_sync_at", "integration_last_write"]
};
const options = {};
console.log("\n## 01-06 Property definitions (name: HTTP, type/fieldType, calculated, options)");
for (const [obj, names] of Object.entries(DEFS)) {
  console.log(`# object ${obj}`);
  for (const name of names) {
    const r = await send("GET", `/crm/v3/properties/${obj}/${name}`);
    if (r.status !== 200) { console.log(`  ${name}: HTTP ${r.status} (missing or not readable)`); continue; }
    const p = r.json;
    const opts = (p.options ?? []).filter((o) => !o.hidden).map((o) => o.value);
    options[`${obj}/${name}`] = opts;
    console.log(`  ${name}: 200 ${p.type}/${p.fieldType} calculated=${p.calculated ?? false} readOnly=${p.modificationMetadata?.readOnlyValue ?? "?"}` +
      (opts.length ? ` options(${opts.length})=${JSON.stringify(opts)}` : ""));
  }
}

// --- Slices 04-06: counts (totals only, no record is read) ---------------------------------------
async function count(obj, filters) {
  const r = await send("POST", `/crm/v3/objects/${obj}/search`, { filterGroups: [{ filters }], limit: 1, properties: ["hs_object_id"] });
  return r.status === 200 ? r.json?.total : `HTTP ${r.status}`;
}
async function countsByOption(obj, name) {
  console.log(`# ${obj} by ${name}`);
  for (const value of options[`${obj}/${name}`] ?? []) {
    console.log(`  ${JSON.stringify(value)}: ${await count(obj, [{ propertyName: name, operator: "EQ", value }])}`);
  }
  console.log(`  (blank): ${await count(obj, [{ propertyName: name, operator: "NOT_HAS_PROPERTY" }])}`);
}
console.log("\n## 05 Case counts");
await countsByOption(DEAL, "staffing_status");
await countsByOption(DEAL, "specific_home_location");
console.log("\n## 06 State counts (New Mexico / Virginia are deferred)");
for (const obj of [DEAL, BCBA, BT]) {
  for (const value of (options[`${obj}/location`] ?? []).filter((v) => /mexico|virginia/i.test(v))) {
    console.log(`  ${obj} location=${JSON.stringify(value)}: ${await count(obj, [{ propertyName: "location", operator: "EQ", value }])}`);
  }
}
console.log("\n## 04/06 BT/RBT counts");
await countsByOption(BT, "bt_rbt_type");
console.log(`  Entered in CR = Yes and active_cases_count > 0: ${await count(BT, [
  { propertyName: "entered_in_centralreach", operator: "EQ", value: "Yes" },
  { propertyName: "active_cases_count", operator: "GT", value: "0" }])}`);
console.log("\n## 06 BCBA counts");
await countsByOption(BCBA, "co_insurance_labels");

console.log(`\nHubSpot production calls: ${calls} (GET and count-only search). Nothing was written.`);
