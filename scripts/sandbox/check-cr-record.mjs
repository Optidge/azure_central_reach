// Checks one CentralReach record against the sandbox test matrix after a test push (Stage 8).
// docs/workstreams/architecture-update/sandbox-test-matrix.md: "Case → CR client" (C, CL rows),
// "BCBA" (B, BL rows), "BT/RBT" (T, TL rows). The expected values are rebuilt from the same
// pick(R1, R2, R3) logic as scripts/sandbox/create-test-records.mjs.
//
// READ-ONLY, AND IT READS PRODUCTION. CentralReach has no sandbox: every call here is production.
// Every request goes through guardedFetch, which refuses any method but GET. The one exception is
// the token request: a POST, and only to CR_TOKEN_URL. No HubSpot or Azure call is made.
//
// It prints field names, requirement IDs, PASS / FAIL / SKIP, and the expected and actual values
// of the test record's own fields. It never prints a token, a header, a settings value or a raw
// response. Before any value is printed it confirms the CR record is a test record: the lookup by
// External System ID (= the HubSpot record ID) finds it, or its last name holds "Azure Test".
//
// Usage (from the repo root, after each push):
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record bt1
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record bcba
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record case --keys
// Options: --cr-id <id> uses that CR contact ID instead of the lookup. --keys prints the key names
// (no values) of each response; it is printed anyway when a field or the metadata shape is not
// found. --step create is the only step built (U1 / U2 can be added as another expectation set).
// Exit code 1 when any row FAILs or the run stops.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SANDBOX_PORTAL = "52311591";
const TYPES = { deal: "0-3", bcba: "2-72890322", bt: "2-72890325" };
const TEST_MARKER = "Azure Test";

// ---- Arguments ----
const args = process.argv.slice(2);
const argValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const round = Number(argValue("--round"));
const recordName = argValue("--record");
const crIdOverride = argValue("--cr-id");
const step = argValue("--step") || "create";
const SHOW_KEYS = args.includes("--keys");
if (!Number.isInteger(round) || round < 1 || round > 99 || !["bt1", "bcba", "case"].includes(recordName)) {
  console.error("Give --round N (1 to 99) and --record bt1|bcba|case.");
  process.exit(1);
}
if (step !== "create") {
  console.error(`--step ${step} is not built yet; only create.`);
  process.exit(1);
}
if (crIdOverride !== undefined && !/^\d+$/.test(crIdOverride)) {
  console.error("--cr-id must be digits.");
  process.exit(1);
}

// ---- Settings (names only are ever printed) ----
const SETTING_NAMES = ["CR_CLIENT_ID", "CR_CLIENT_SECRET", "CR_API_KEY", "CR_BASE_URL", "CR_TOKEN_URL"];
function loadSettings() {
  let values;
  try {
    values = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"))?.Values || {};
  } catch {
    // The parser's own message can quote the file, so it is not passed on.
    throw new Error("local.settings.json could not be read as JSON (run from the repo root).");
  }
  const missing = SETTING_NAMES.filter((name) => !String(values[name] ?? "").trim());
  if (missing.length) throw new Error(`Missing in local.settings.json Values: ${missing.join(", ")}`);
  return Object.fromEntries(SETTING_NAMES.map((name) => [name, String(values[name]).trim()]));
}

// ---- Read-only HTTP ----
let SETTINGS;
let token;

// The only door to the network. GET anywhere; POST only to the token URL; nothing else.
function guardedFetch(url, init = {}) {
  const method = String(init.method || "GET").toUpperCase();
  const isTokenRequest = method === "POST" && url === SETTINGS.CR_TOKEN_URL;
  if (method !== "GET" && !isTokenRequest) {
    throw new Error(`Refused a ${method}: this script is read-only (CentralReach is production).`);
  }
  // A fetch error can quote the URL (a settings value), so only a plain message goes on.
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

// pathTemplate is what an error names (no IDs from settings, no body). 404 gives null.
async function crGet(path, pathTemplate) {
  const url = `${SETTINGS.CR_BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  const res = await guardedFetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, "x-api-key": SETTINGS.CR_API_KEY, Accept: "application/json" }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${pathTemplate} -> HTTP ${res.status}`);
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`GET ${pathTemplate} answered with a body that is not JSON.`);
  }
}

// ---- Values (sandbox-test-matrix.md R1 / R2 / R3; same logic as create-test-records.mjs) ----
const N = String(round);
const NN = N.padStart(2, "0");
const STATES = [
  { name: "New York", code: "NY", city: "New York", area: "212", zip: "1000" },
  { name: "Colorado", code: "CO", city: "Denver", area: "303", zip: "8020" },
  { name: "New Jersey", code: "NJ", city: "Newark", area: "973", zip: "0710" }
];
const slot = (round - 1) % 3;
const S = STATES[slot];
const pick = (r1, r2, r3) => [r1, r2, r3][slot];
const phoneDigits = (suffix) => `${S.area}555${NN}${suffix}`;
const recordLink = (typeId, id) => `https://app.hubspot.com/contacts/${SANDBOX_PORTAL}/record/${typeId}/${id}`;

// ---- Expectation rows: an object keyed by requirement ID (a later --step u1 adds another set) ----
const core = (field, want, kind = "text") => ({ type: "core", field, want, kind });
const meta = (fieldId, want, kind = "text") => ({ type: "meta", fieldId, want, kind });
const labels = (want, group) => ({ type: "labels", want, group });
const skip = (reason) => ({ type: "skip", reason });

function caseCreate(ids, roundFile) {
  const fullHome = `${N}01 Azure Test St, Apt ${N}A, ${S.city}, ${S.code} ${S.zip}1`;
  const differs = roundFile?.report?.deal?.differs || [];
  const blankMirrors = roundFile?.report?.deal?.blankMirrors || [];
  return {
    C1: skip("contact form on create: Log crCalls and the CR screen"),
    C2: [core("FirstName", "Zeke"), core("LastName", `Swanson Azure Test R${N}`)],
    C3: [core("DateOfBirth", pick("2016-01-15", "2017-02-16", "2018-03-17"), "date")],
    "C3 (blank DOB)": skip("extra R2 Case with no DOB: HS and Log check"),
    C4: [core("Gender", pick("Male", "Female", "Male"), "gender")],
    C5: [{ type: "lookup" }],
    C6: [core("PrimaryEmail", `zeke+swanson_azure_test_${N}@optidge.com`, "ci")],
    C7: [core("GuardianFirstName", `Don Azure Test R${N}`), core("GuardianLastName", "Swanson")],
    C8: [core("AddressLine1", `${N}01 Azure Test St`), core("AddressLine2", `Apt ${N}A`), core("City", S.city),
      core("StateProvince", S.code, "state"), core("ZipPostalCode", `${S.zip}1`),
      core("PhoneCell", phoneDigits("01"), "digits")],
    C9: skip("not built (decision 36): Log check that PhoneHome is not in the payload"),
    C10: [meta(138851, "Zeke Swanson")],
    C11: [meta(131314, `Zeke Swanson BCBA Azure Test R${N}`), meta(144602, `Zara Swanson BCBA2 Azure Test R${N}`)],
    C12: [meta(131308, `Azure Test Supervising ${N}`)],
    C13: [meta(136052, "")], // open (O-15): nothing is sent, so a new client holds nothing
    C14: [meta(131313, `Jane Swanson Azure Test R${N}`), meta(138092, `Jill Swanson Azure Test R${N}`)],
    C15: skip("open (O-15)"),
    C16: [meta(131314, `Zeke Swanson BCBA Azure Test R${N}`), meta(131313, `Jane Swanson Azure Test R${N}`)],
    C17: [meta(132304, `AzT ${N} Sched 1 Mon-Fri 9-12`), meta(138093, `AzT ${N} Sched 2 Sat 10-1`)],
    C18: skip("open (O-14): no CR field"),
    C19: [meta(126209, `AzT ${N} weekdays after 3pm, ${pick("20", "15", "25")}`)],
    // O-39 option a (Zeke 2026-11-21): the code sums the two hours, a blank counting as 0.
    C20: [meta(134331, pick("16", "11", "14"), "hours")],
    C21: skip("open (O-18)"),
    C22: [meta(132431, pick("8", "6", ""))],
    C23: [meta(134672, pick("11/01/2026 - 04/30/2027", "12/01/2026 - 05/31/2027", "01/01/2027 - 06/30/2027"))],
    C24: [meta(137697, pick(fullHome, `200 Service Rd, Suite ${N}, ${S.city}, ${S.zip}2`, fullHome))],
    C25: [meta(138091, pick("", "", `300 Second Site Ave, ${S.city} ${S.code} ${S.zip}6`))],
    C26: [meta(126214, pick(`Yes, AzT ${N} peanuts`, "No", ""))],
    C27: [meta(126207, pick("Aggression", "Elopement", "Mouthing Non Food Itemsth")), meta(132303, `AzT ${N} comorbid`)],
    C28: [meta(133826, pick("Level 2", "Level 1", "Level 3")), meta(138378, `AzT ${N} parent note`)],
    C29: [meta(126210, pick("Medicaid FFS", `AzT ${N} other carrier`, "Aetna")), meta(131316, `AZT-${N}-INS1`)],
    C30: [meta(144600, pick("Cigna", `AzT ${N} other carrier 2`, "")), meta(144601, pick(`AZT-${N}-INS2`, `AZT-${N}-INS2`, ""))],
    C31: [meta(131151, `Dr AzT ${N} Medicaid, 10000000${NN}`)],
    C32: [meta(141233, `AZTMCD00${N}`)],
    C33: [meta(144793, pick(`Yes-F84.0, AzT ${N} dx note`, `Other, AzT ${N} dx note`, `Yes- Down's Syndrome, AzT ${N} dx note`))],
    C34: [meta(131195, pick("03/10/2025", "04/10/2025", "05/10/2025")), meta(138701, pick("04/11/2025", "05/11/2025", "06/11/2025"))],
    C35: [meta(138090, "Don Swanson"), meta(137667, "06/20/1985")],
    // referral_source is read-only in HubSpot; the round's read-back says whether the Case held it.
    C36: blankMirrors.includes("referral_source")
      ? [meta(126222, "")]
      : skip("expected = the Case's referral_source, which this script does not read; compare by hand"),
    C37: [meta(138702, recordLink(TYPES.deal, ids.deal))],
    C38: skip("open (O-19)"),
    CL1: [labels([pick(1082499, 1132648, 1132647)], [1082499, 1132648, 1132647])],
    CL2: [labels(pick([1052656], [], [1052656]), [1052656])],
    CL3: differs.includes("case_status")
      ? skip("case_status differs from the script value in the round read-back; check by hand")
      : [labels([pick(1125427, 1121488, 1125427)], [1125427, 1121488])],
    CL4: differs.includes("staffing_status")
      ? skip("staffing_status differs from the script value in the round read-back; check by hand")
      : [labels([pick(1156746, 1156743, 1156747)], [1156743, 1156746, 1156747, 1156742, 1156744, 1156745])],
    CL5: [labels([], [1052532, 1052534, 1052620, 1082497, 1082498, 1107648, 1124247, 1124248, 1124249])],
    CL6: [labels([1052619], [1052619])]
  };
}

function bcbaCreate(ids) {
  return {
    B1: skip("contact form Admin: read on the CR screen"),
    B2: [core("externalSystemId", ids.bcba)],
    B3: [core("firstName", "Zeke"), core("lastName", `Swanson BCBA Azure Test R${N}`)],
    B4: [core("primaryEmail", `zeke_work_email+azure_test_${N}@optidge.com`, "ci")],
    B5: [core("dateOfBirth", pick("1990-01-15", "1991-02-16", "2000-01-01"), "date")],
    B6: [core("gender", pick("Male", "Female", "Male"), "gender")],
    B7: [core("addressLine1", `${N}04 Azure BCBA St`), core("addressLine2", `Apt ${N}B`), core("city", S.city),
      core("stateProvince", S.code, "state"), core("zipPostalCode", `${S.zip}3`),
      core("phoneCell", phoneDigits("04"), "digits")],
    B8: [meta(126216, `AZTNY00${N}`), meta(138112, `AZTNJ00${N}`), meta(138113, `AZTCO00${N}`)],
    // Source: the BCBA's own `email` (O-40/O-42, Zeke 2026-11-21), not the Contact.
    B9: [meta(138069, `zeke+bcba_azure_test_${N}@optidge.com`, "ci")],
    B10: [labels(pick([1132653], [], [1132653]), [1132653])],
    B11: skip("open (O-17)"),
    B12: [meta(138703, recordLink(TYPES.bcba, ids.bcba))],
    B13: [meta(134444, "")],
    BL1: [labels([1130668], [1130668])],
    BL2: [labels(pick([1132655], [1107687, 1132655], [1107686]), [1132655, 1107687, 1107686])],
    BL3: skip("held (O-6): no New Mexico label"),
    BL4: [labels(pick([1124245, 1052629], [1124246, 1092164], [1124246, 1124245]), [1124246, 1124245, 1052629, 1092164])],
    BL5: [labels(pick([1107647], [], []), [1107647])],
    BL6: [labels([], [1107649, 1107650, 1132654, 1107651])],
    BL7: [labels(pick([1103437], [], []), [1103437])],
    BL8: [labels([1052618, 1052643], [1052618, 1052643])]
  };
}

function btCreate(ids) {
  return {
    T1: skip("contact form (Behavior Technician NY / RBT CO): read on the CR screen"),
    T2: [core("externalSystemId", ids.bt1), core("firstName", "Jane"), core("lastName", `Swanson Azure Test R${N}`),
      core("primaryEmail", `zeke+bt_azure_test_${N}@optidge.com`, "ci"),
      core("dateOfBirth", pick("1992-02-20", "1993-03-21", "2000-01-01"), "date")],
    T3: [core("gender", pick("Female", "Male", "Female"), "gender")],
    T4: [core("addressLine1", `${N}03 Azure BT St`), core("city", S.city), core("stateProvince", S.code, "state"),
      core("zipPostalCode", `${S.zip}4`), core("phoneCell", phoneDigits("03"), "digits")],
    T5: [core("addressLine2", `Apt ${N}C`)],
    T6: [meta(133819, `${N}05 Work Plaza, Suite ${N}, ${S.city}, ${S.code} ${S.zip}5`)],
    T7: [meta(147882, pick("1", "0", "1"))], // automated count: read it again if the Case changed later
    T8: [meta(138703, recordLink(TYPES.bt, ids.bt1))],
    TL1: [labels(pick([1132655], [1107687], [1107686, 1132655]), [1132655, 1107687, 1107686])],
    TL2: skip("held (O-6): no Virginia label"),
    TL3: [labels(pick([1052630], [1132650], [1132651, 1052631]), [1052630, 1132652, 1132650, 1052631, 1132651, 1107692])],
    TL4: [labels([1052618, 1052643], [1052618, 1052643])]
  };
}

// ---- Reading the answers ----
// Other spellings tried for a core field. The employee GET is known to use camelCase under
// `contact` (contact.externalSystemId, contact.primaryEmail). The client read is not known (O-35).
const ALIASES = {
  phonecell: ["cellphone", "mobilephone"],
  zippostalcode: ["zipcode", "postalcode", "zip"],
  stateprovince: ["state"],
  addressline1: ["address1"],
  addressline2: ["address2"],
  dateofbirth: ["dob", "birthdate"],
  primaryemail: ["email"]
};

// Every primitive in the answer as { path, key, value }.
function flatten(node, path = "", out = []) {
  if (Array.isArray(node)) node.forEach((item, i) => flatten(item, `${path}[${i}]`, out));
  else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const next = path ? `${path}.${key}` : key;
      if (value !== null && typeof value === "object") flatten(value, next, out);
      else out.push({ path: next, key, value });
    }
  }
  return out;
}

// Key names only, arrays collapsed to [], no values.
function keyPaths(node, path = "", out = new Set()) {
  if (Array.isArray(node)) {
    out.add(`${path}[]`);
    node.forEach((item) => keyPaths(item, `${path}[]`, out));
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const next = path ? `${path}.${key}` : key;
      out.add(next);
      keyPaths(value, next, out);
    }
  }
  return out;
}

// The field with this name (any case, or an alias), on the shortest path. null when absent.
function findField(answer, field) {
  const names = [field.toLowerCase(), ...(ALIASES[field.toLowerCase()] || [])];
  const leaves = flatten(answer).filter((leaf) => !leaf.path.includes("["));
  for (const name of names) {
    const hits = leaves.filter((leaf) => leaf.key.toLowerCase() === name);
    if (hits.length) return hits.sort((a, b) => a.path.length - b.path.length)[0];
  }
  return null;
}

// GET /contacts/{id}/labels. Same reading as readLabelIds in src/lib/centralReachClient.mjs.
function readLabelIds(data) {
  const list = Array.isArray(data) ? data : data?.labels ?? data?.labelIds ?? data?.results;
  if (!Array.isArray(list)) return null;
  const ids = list.map((item) => Number(item && typeof item === "object" ? item.labelId : item));
  return ids.every((id) => Number.isInteger(id) && id > 0) ? ids : null;
}

// The metadata answer's shape is not confirmed. Any object with a fieldId (or a direct child that
// has one) and a key holding "value" is read as one field. Returns a Map, or null when none found.
function readMetadata(data) {
  const fields = new Map();
  const idOf = (node) => {
    const own = Object.keys(node).find((k) => /^(fieldid|metadatafieldid)$/i.test(k));
    if (own) return node[own];
    const child = Object.values(node).find((v) => v && typeof v === "object" && !Array.isArray(v) &&
      Object.keys(v).some((k) => /^(fieldid|metadatafieldid)$/i.test(k)));
    return child ? idOf(child) : undefined;
  };
  const valueOf = (node) => {
    let seen;
    for (const [key, value] of Object.entries(node)) {
      if (!/value$/i.test(key) || /default/i.test(key)) continue;
      const text = value && typeof value === "object" ? valueOf(value) : value == null ? "" : String(value);
      if (text !== undefined) seen = seen && seen.trim() ? seen : text;
    }
    return seen;
  };
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const id = idOf(node);
    const value = valueOf(node);
    // The outer object is read first and wins over a nested definition of the same field.
    if (/^\d+$/.test(String(id ?? "")) && value !== undefined && !fields.has(Number(id))) {
      fields.set(Number(id), value);
    }
    Object.values(node).forEach(walk);
  };
  walk(data);
  return fields.size ? fields : null;
}

// ---- Comparing ----
const STATE_CODES = { "new york": "ny", colorado: "co", "new jersey": "nj" };
function normalize(value, kind) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (kind === "ci") return text.toLowerCase();
  if (kind === "digits") return text.replace(/\D+/g, "").replace(/^1(\d{10})$/, "$1");
  if (kind === "state") return STATE_CODES[text.toLowerCase()] || text.toLowerCase();
  if (kind === "gender") return ({ m: "male", f: "female" })[text.toLowerCase()] || text.toLowerCase();
  if (kind === "date") {
    const ms = text.match(/\/Date\((-?\d+)/); // ServiceStack date form
    if (ms) return new Date(Number(ms[1])).toISOString().slice(0, 10);
    const us = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (us) return `${us[3]}-${us[1]}-${us[2]}`;
    return text.slice(0, 10);
  }
  return text;
}

const EXCLUDED_TOTALS = ["18", "12", "24", "2"]; // C20: never an excluded total
const counts = { PASS: 0, FAIL: 0, SKIP: 0 };
const report = (status, id, text) => {
  counts[status] += 1;
  console.log(`${status} ${id} ${text}`);
};

function checkValue(id, label, row, found) {
  const got = found === null || found === undefined ? "" : String(found);
  const pass = normalize(got, row.kind) === normalize(row.want, row.kind);
  const note = row.kind === "hours" && EXCLUDED_TOTALS.includes(got.trim()) ? " (an excluded total)" : "";
  report(pass ? "PASS" : "FAIL", id, `${label} expected "${row.want}" got "${got}"${note}`);
}

function checkLabels(id, held, row) {
  const heldSet = new Set(held);
  const missing = row.want.filter((x) => !heldSet.has(x));
  const unexpected = row.group.filter((x) => !row.want.includes(x) && heldSet.has(x));
  const text = `labels want [${row.want.join(", ")}]` +
    (missing.length ? ` missing [${missing.join(", ")}]` : "") +
    (unexpected.length ? ` must not hold [${unexpected.join(", ")}]` : "");
  report(missing.length || unexpected.length ? "FAIL" : "PASS", id, text);
}

// ---- Main ----
async function main() {
  const roundPath = resolve(`docs/workstreams/architecture-update/sandbox-rounds/round-${N}.json`);
  const roundFile = JSON.parse(readFileSync(roundPath, "utf8"));
  const ids = roundFile.ids || {};
  const hsId = { case: ids.deal, bcba: ids.bcba, bt1: ids.bt1 }[recordName];
  if (!hsId) throw new Error(`round-${N}.json has no HubSpot ID for ${recordName}.`);
  const kind = recordName === "case" ? "client" : "employee";

  SETTINGS = loadSettings();
  token = await getToken();
  console.log(`Round ${N} (${S.name}), ${recordName} (HubSpot ${hsId}), step ${step}. Read-only GETs.\n`);

  // The integration's own lookup: External System ID = the HubSpot record ID.
  const lookup = await crGet(
    `/contacts/${kind}/byExternalSystemId?ExternalSystemId=${encodeURIComponent(hsId)}`,
    `/contacts/${kind}/byExternalSystemId`
  );
  const lookedUpId = /^\d+$/.test(String(lookup?.contact?.contactId ?? "")) ? String(lookup.contact.contactId) : null;
  const crId = crIdOverride || lookedUpId;
  if (!crId) throw new Error(`No CR ${kind} holds External System ID ${hsId}. Give --cr-id if you know it.`);
  if (crIdOverride && lookedUpId !== crIdOverride) {
    console.log(`Note: the lookup by External System ID ${hsId} found ${lookedUpId ?? "nothing"}, not --cr-id ${crIdOverride}.`);
  }
  console.log(`CR contact ${crId}.\n`);

  const contact = await crGet(`/contacts/${kind}/${crId}`, `/contacts/${kind}/{id}`);
  if (!contact) throw new Error(`GET /contacts/${kind}/{id} answered 404.`);
  const labelAnswer = await crGet(`/contacts/${crId}/labels`, "/contacts/{id}/labels");
  // TODO(read path): no metadata read is in the code. GET contacts/{ContactId}/metadata comes from
  // CR's public API list (central_reach_docs/CentralReach_Enhanced_APIs_Fast_&_Secure.md). The
  // client route is tried second, as updateMetadataField does for its PUT.
  let metaAnswer = await crGet(`/contacts/${crId}/metadata`, "/contacts/{id}/metadata");
  if (metaAnswer === null && kind === "client") {
    metaAnswer = await crGet(`/contacts/client/${crId}/metadata`, "/contacts/client/{id}/metadata");
  }

  const root = contact?.contact && typeof contact.contact === "object" ? contact : { contact };
  const held = readLabelIds(labelAnswer);
  const metadata = readMetadata(metaAnswer);
  const lastName = findField(root, kind === "client" ? "LastName" : "lastName");
  const isTestRecord = lookedUpId === crId || String(lastName?.value ?? "").includes(TEST_MARKER);

  const rows = { case: caseCreate, bcba: bcbaCreate, bt1: btCreate }[recordName](ids, roundFile);
  let showKeys = SHOW_KEYS || !metadata || !held;
  if (!isTestRecord) {
    console.log(`Stopped: CR ${crId} is not confirmed as a test record (lookup differs and no "${TEST_MARKER}" ` +
      "in the last name). No value is printed; key names follow.");
    showKeys = true;
    counts.FAIL += 1;
  } else {
    for (const [id, list] of Object.entries(rows)) {
      for (const row of Array.isArray(list) ? list : [list]) {
        if (row.type === "skip") report("SKIP", id, row.reason);
        else if (row.type === "lookup") {
          report(lookedUpId === crId ? "PASS" : "FAIL", id,
            `lookup by External System ID ${hsId} expected "${crId}" got "${lookedUpId ?? ""}"`);
        } else if (row.type === "core") {
          const hit = findField(root, row.field);
          if (!hit) {
            showKeys = true;
            report("SKIP", id, `${row.field}: no such key in the ${kind} answer (see the key names)`);
          } else checkValue(id, `${row.field} (${hit.path})`, row, hit.value);
        } else if (row.type === "meta") {
          if (!metadata) report("SKIP", id, `Meta ${row.fieldId}: metadata answer not read (see the key names)`);
          else checkValue(id, `Meta ${row.fieldId}`, row, metadata.get(row.fieldId));
        } else if (row.type === "labels") {
          if (!held) report("SKIP", id, "labels answer not read (see the key names)");
          else checkLabels(id, held, row);
        }
      }
    }
    if (held) {
      const all = Object.values(rows).flat().filter((r) => r.type === "labels");
      const expected = new Set(all.flatMap((r) => r.want));
      const checked = new Set(all.flatMap((r) => r.group));
      const extra = held.filter((x) => !expected.has(x));
      console.log(`\nLabels held: [${held.join(", ")}]`);
      console.log(`Missing: [${[...expected].filter((x) => !held.includes(x)).join(", ")}]`);
      console.log(`Extra, in a checked group: [${extra.filter((x) => checked.has(x)).join(", ")}]; ` +
        `extra, not checked (hand-added or set by the contact form): [${extra.filter((x) => !checked.has(x)).join(", ")}]`);
    }
  }

  if (showKeys) {
    for (const [name, answer] of [[`GET /contacts/${kind}/{id}`, contact], ["GET /contacts/{id}/labels", labelAnswer],
      ["GET /contacts/{id}/metadata", metaAnswer]]) {
      console.log(`\nKey names of ${name} (no values):`);
      console.log(answer === null ? "  (404 or empty)" : [...keyPaths(answer)].map((p) => `  ${p}`).join("\n"));
    }
  }

  console.log(`\nPASS ${counts.PASS}  FAIL ${counts.FAIL}  SKIP ${counts.SKIP}`);
  if (counts.FAIL) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`Stopped: ${e.message}`);
  process.exit(1);
});
