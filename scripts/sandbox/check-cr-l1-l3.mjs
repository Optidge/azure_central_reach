// Live CentralReach checks L1 to L3 before the phase one production launch (review
// build-chat-2-field-wipe-fix-REVIEW-2026-11-24.md, "Live CR checks before production").
// Zeke 2026-11-24: "Do L1 - L3 please." (L2 and L3 read-only reads of production records, shapes
// only; L1 writes only to the two test records.)
//
//   L3 key survey (read-only): GET about 10 production employees and 10 production clients; print
//      the union of keys with type and length range, keys outside the test records' key sets,
//      date-like keys by length and time-of-day form, list and object key names.
//   L2 ssn read form (read-only): per production employee read, the ssn key's type, length, digit
//      count and character classes, and what the build's SSN guard (unsendableSsnKey) would do.
//   L1 filled lists on the test records: the read run GETs both test records and shows which lists
//      are filled. With --write, for each test record with a filled list: the build's full-echo PUT
//      body (mapped keys equal to the read), GET now and after 20 s, compare by shape and by value;
//      then one subset PUT with the list/object keys left out; GET; restore to the baseline; verify.
//
// SAFETY
// - PUT only to employee 5338681 and client 5384589, only with --write (hard-coded allow-list, no
//   override). Every other request is a GET of a contact by ID, one page of the employee and client
//   lists (IDs only are kept), or the test client's payor list. No labels, metadata, HubSpot, Azure.
// - Output: key names, JS types, lengths, digit counts, character classes, list lengths and the key
//   names inside list elements and objects. Never a value of a production record, never an ssn value
//   of any record, no names or emails, no contact IDs except the ones this script requests. Raw
//   production responses are never written to disk. A restore file (mode 600, OS temp folder) holds
//   only the test record's own baseline and is deleted once the restore is verified.
// - At most MAX_CALLS CentralReach calls per run (token included).
//
// Usage (repo root; local.settings.json Values must hold the five CR_ settings):
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-l1-l3.mjs                    (read run: L1 GETs, L2, L3)
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-l1-l3.mjs --write [--entity employee|client|both]
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-l1-l3.mjs --write --restore <file>
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildEmployeePayloadForContactId } from "../../src/lib/centralReachClient.mjs";
import {
  CLIENT_CORE_FIELDS,
  EMPLOYEE_CORE_FIELDS,
  clientCoreReadKey,
  clientPutKey,
  keepHeldClientCoreFields,
  keepUnwrittenCoreFields,
  normalizeBlank,
  unsendableSsnKey,
  unusableHeldClientCoreField,
  unusableHeldEmployeeDateOfBirth,
  updateBodyFromRead
} from "../../src/lib/mappedState.mjs";

// ---- Records ----
const TEST_CONTACTS = Object.freeze({ employee: "5338681", client: "5384589" });
// Production IDs already read and recorded in docs/workstreams/architecture-update (2026-11-23/24).
const RECORD_IDS = Object.freeze({
  employee: ["5237928", "5018605", "4499766", "4979579"],
  client: ["4438604", "4717582", "5265763", "4463962"]
});
// Never surveyed: the test records, the integration's own sandbox-round records, the API user,
// and an ID already recorded as answering 404 on every call.
const SKIP_IDS = new Set(["5338681", "5384589", "5384530", "5384531", "5385357", "5385360", "5324521", "4147071", "4871945"]);
const SURVEY = Object.freeze({
  employee: { target: 10, max: 15, ssnTarget: 5 },
  client: { target: 10, max: 12 }
});
// --survey-only (resume after run 1, 2026-11-24): the recorded IDs were already read, so the run
// starts from the list page and skips them; the test records' key sets come from run 1's reads.
const SURVEY_RESUME = Object.freeze({
  employee: { target: 6, max: 11, ssnTarget: 5 },
  client: { target: 6, max: 8 }
});
const TEST_KEYS_RUN1 = Object.freeze({
  employee: "addressLine1 addressLine2 chosenName city company contactId credentials dateOfBirth employeeType externalSystemId firstName gender isActive jobTitle languages lastName middleInitial npiNumber payCodes payTypes phoneCell primaryEmail primaryOfficeLocation ssn stateProvince title type zipPostalCode".split(" "),
  client: "additionalContacts addressLine1 addressLine2 chosenName city clientDiagnosisCodes contactId dateOfBirth externalSystemId firstName gender guarantorFirstName guarantorLastName guardianFirstName guardianLastName isActive lastName middleInitial phoneCell primaryEmail primaryPayors secondaryPayors stateProvince title type zipPostalCode".split(" ")
});
const LIST_TAKE = 100;
const MAX_CALLS = 40;
const LAG_WAIT_MS = 20000;
const LAG_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 15000;
const SENSITIVE_KEY = /ssn|social|taxid/i;
const VOLATILE_KEY = /modified|updated|cached|timestamp|lastsync/i;
const MIDNIGHT_7 = "T00:00:00.0000000Z";

class StopError extends Error {}
const stop = (message) => {
  throw new StopError(message);
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const putKeyOf = (entity, readKey) => (entity === "client" ? clientPutKey(readKey) : readKey);

// ---- Arguments ----
function parseArgs(argv) {
  const options = { entity: "both", write: false, restoreFile: null, surveyOnly: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--entity") options.entity = argv[(i += 1)];
    else if (arg === "--restore") options.restoreFile = argv[(i += 1)];
    else if (arg === "--write") options.write = true;
    else if (arg === "--survey-only") options.surveyOnly = true;
    else return { error: `Unknown argument: ${arg}` };
  }
  if (!["employee", "client", "both"].includes(options.entity)) return { error: "--entity is employee, client or both." };
  if (options.restoreFile !== null && (!options.restoreFile || !options.write)) return { error: "--restore needs a file and --write." };
  return { options };
}
const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  console.error(parsed.error);
  process.exit(1);
}
const OPTIONS = parsed.options;

// ---- Settings (names only are ever printed) ----
const SETTING_NAMES = ["CR_CLIENT_ID", "CR_CLIENT_SECRET", "CR_API_KEY", "CR_BASE_URL", "CR_TOKEN_URL"];
function loadSettings() {
  let values;
  try {
    values = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"))?.Values || {};
  } catch {
    throw new StopError("local.settings.json could not be read as JSON (run from the repo root).");
  }
  const missing = SETTING_NAMES.filter((name) => !String(values[name] ?? "").trim());
  if (missing.length) throw new StopError(`Missing in local.settings.json Values: ${missing.join(", ")}`);
  return Object.fromEntries(SETTING_NAMES.map((name) => [name, String(values[name]).trim()]));
}

// ---- HTTP: one door, allow-listed, every call counted ----
let SETTINGS = null;
let token = null;
let callCount = 0;
const contactPath = (entity, id) => `/contacts/${entity}/${id}`;
const WRITABLE_PATHS = new Set(Object.entries(TEST_CONTACTS).map(([entity, id]) => contactPath(entity, id)));
const LIST_PATHS = new Set([`/contacts/employees?Offset=1&Take=${LIST_TAKE}`, `/contacts/clients?Offset=1&Take=${LIST_TAKE}`]);
const TEST_PAYORS_PATH = `/contacts/clients/${TEST_CONTACTS.client}/payors`;

function isAllowed(method, path) {
  if (method === "GET") {
    return /^\/contacts\/(employee|client)\/\d{5,9}$/.test(path) || LIST_PATHS.has(path) || path === TEST_PAYORS_PATH;
  }
  return method === "PUT" && OPTIONS.write && WRITABLE_PATHS.has(path);
}

async function send(url, init, label) {
  if (callCount >= MAX_CALLS) stop(`Call cap of ${MAX_CALLS} reached; nothing more is sent.`);
  callCount += 1;
  const n = callCount;
  let res;
  let text = "";
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    text = await res.text();
  } catch {
    console.log(`  [call ${n}] ${label} -> no answer (network, proxy or timeout; is NODE_USE_ENV_PROXY=1 set?)`);
    return { status: res?.status ?? null, ok: false, data: null };
  }
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  console.log(`  [call ${n}] ${label} -> HTTP ${res.status}`);
  return { status: res.status, ok: res.ok, data };
}

async function getToken() {
  if (token) return token;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: SETTINGS.CR_CLIENT_ID,
    client_secret: SETTINGS.CR_CLIENT_SECRET,
    scope: "cr-api"
  });
  const res = await send(
    SETTINGS.CR_TOKEN_URL,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: body.toString() },
    "POST token"
  );
  if (!res.data?.access_token) stop(`Token request failed (HTTP ${res.status ?? "no answer"}).`);
  token = res.data.access_token;
  return token;
}

// A refusal names CentralReach's field names and error codes only, never its message text.
function printRefusal(data) {
  const list = (value) => (Array.isArray(value) ? value : []);
  const items = [...list(data?.responseStatus?.errors), ...list(data?.errors)];
  const safe = (value) => (typeof value === "string" && /^[A-Za-z0-9_.\- ]{1,60}$/.test(value.trim()) ? value.trim() : null);
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const fields = unique(items.map((item) => safe(item?.fieldName)));
  const codes = unique([safe(data?.responseStatus?.errorCode), ...items.map((item) => safe(item?.errorCode))]);
  if (fields.length || codes.length) console.log(`    refused: fields [${fields.join(", ")}] codes [${codes.join(", ")}]`);
}

async function crFetch(method, path, body, { quietLabel } = {}) {
  if (!isAllowed(method, path)) throw new Error(`Refused ${method} ${path}: not on the allow-list.`);
  const accessToken = await getToken();
  const url = `${SETTINGS.CR_BASE_URL.replace(/\/+$/, "")}${path}`;
  const res = await send(
    url,
    {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, "x-api-key": SETTINGS.CR_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    },
    quietLabel ?? `${method} ${path}`
  );
  if (!res.ok && res.status !== null) printRefusal(res.data);
  return res;
}

// ---- Shapes (never values) ----
function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}
const typeOf = (value) => (value === null ? "null" : Array.isArray(value) ? "list" : typeof value);

// Key names and types only, recursively (lists show their element shapes).
function shapeOf(value) {
  if (Array.isArray(value)) return `[${[...new Set(value.map(shapeOf))].join("|")}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).sort().map((key) => `${key}:${shapeOf(value[key])}`).join(",")}}`;
  return typeOf(value);
}

function describe(value, key = "") {
  if (value === undefined) return "absent";
  if (SENSITIVE_KEY.test(key)) return isBlank(value) ? "blank" : "FILLED (not shown)";
  if (value === null) return "null";
  if (typeof value === "string") {
    if (/date/i.test(key) && value) return `text(${value.length}) mask ${value.replace(/\d/g, "9")}`;
    return `text(${value.length})`;
  }
  if (Array.isArray(value)) return `list(${value.length}${value.length ? `: ${[...new Set(value.map(shapeOf))].join(" | ")}` : ""})`;
  if (typeof value === "object") return `object${shapeOf(value)}`;
  return typeof value;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

// Character classes of a text value: counts only, plus a class pattern (digit 9, mask characters
// kept, other letters A, anything else ?). Used for ssn and npiNumber; never the characters.
function charClasses(value) {
  if (typeof value !== "string") return { type: typeOf(value) };
  const count = (re) => (value.match(re) || []).length;
  return {
    type: "string",
    length: value.length,
    digits: count(/\d/g),
    dashes: count(/-/g),
    spaces: count(/\s/g),
    stars: count(/\*/g),
    xs: count(/[Xx]/g),
    hashes: count(/#/g),
    bullets: count(/•/g),
    otherLetters: count(/[A-WYZa-wyz]/g),
    other: count(/[^0-9\-\s*Xx#•A-Za-z]/g),
    pattern: value.replace(/\d/g, "9").replace(/[A-WYZa-wyz]/g, "A").replace(/[^9A*Xx#•\-\s]/g, "?").replace(/\s/g, "_")
  };
}

function ssnForm(cls) {
  if (cls.type !== "string") return cls.type === "undefined" ? "absent" : `not text (${cls.type})`;
  if (cls.length === 0) return "blank (empty text)";
  if (cls.pattern === "999999999") return "full, 9 digits";
  if (cls.pattern === "999-99-9999") return "full, 3-2-4 dashes";
  if (cls.stars || cls.xs || cls.hashes || cls.bullets) return `masked (${cls.pattern})`;
  if (cls.digits === cls.length - cls.spaces && cls.digits !== 9) return `digits only, ${cls.digits} digits`;
  return `other (${cls.pattern})`;
}

// ---- L3 survey aggregation ----
function newAgg() {
  return { reads: 0, keys: new Map(), dates: new Map(), roles: { bcba: 0, btRbt: 0, other: 0 }, active: { true: 0, false: 0, other: 0 } };
}

function addToAgg(agg, contact) {
  agg.reads += 1;
  for (const [key, value] of Object.entries(contact)) {
    if (!agg.keys.has(key)) agg.keys.set(key, { present: 0, filled: 0, types: new Set(), minLen: Infinity, maxLen: -1, listMin: Infinity, listMax: -1, listFilled: 0, shapes: new Set() });
    const k = agg.keys.get(key);
    k.present += 1;
    if (!isBlank(value)) k.filled += 1;
    k.types.add(typeOf(value));
    if (typeof value === "string") {
      k.minLen = Math.min(k.minLen, value.length);
      k.maxLen = Math.max(k.maxLen, value.length);
    }
    if (Array.isArray(value)) {
      k.listMin = Math.min(k.listMin, value.length);
      k.listMax = Math.max(k.listMax, value.length);
      if (value.length) {
        k.listFilled += 1;
        value.forEach((element) => k.shapes.add(shapeOf(element)));
      }
    } else if (isPlainObject(value)) {
      k.shapes.add(shapeOf(value));
    }
    collectNestedDates(agg, key, value);
    if (/date/i.test(key) && typeof value === "string" && value !== "") {
      const tail = value.slice(10);
      const form = `len ${value.length}, head ${value.slice(0, 10).replace(/\d/g, "9")}, tail ${tail.replace(/\d/g, "9") || "(none)"}, ${tail === MIDNIGHT_7 ? "midnight 7-digit Z form" : /^T00:00:00(\.0+)?Z?$/.test(tail) ? "midnight, other form" : tail ? "NOT midnight" : "date only"}`;
      const map = agg.dates.get(key) ?? new Map();
      map.set(form, (map.get(form) ?? 0) + 1);
      agg.dates.set(key, map);
    }
  }
  const roleText = `${contact.credentials ?? ""} ${contact.jobTitle ?? ""} ${contact.employeeType ?? ""}`;
  if (/bcba/i.test(roleText)) agg.roles.bcba += 1;
  else if (/\b(r?bt|behavior(al)? tech)/i.test(roleText)) agg.roles.btRbt += 1;
  else agg.roles.other += 1;
  const active = contact.isActive;
  agg.active[active === true ? "true" : active === false ? "false" : "other"] += 1;
}

// Date-like keys inside list elements and objects (for example primaryPayors[].coverageStartDate).
function dateForm(value) {
  const tail = value.slice(10);
  return `len ${value.length}, head ${value.slice(0, 10).replace(/\d/g, "9")}, tail ${tail.replace(/\d/g, "9") || "(none)"}, ${tail === MIDNIGHT_7 ? "midnight 7-digit Z form" : /^T00:00:00(\.0+)?Z?$/.test(tail) ? "midnight, other form" : tail ? "NOT midnight" : "date only"}`;
}
function collectNestedDates(agg, path, value) {
  const visit = (p, v) => {
    if (Array.isArray(v)) v.forEach((el) => visit(`${p}[]`, el));
    else if (isPlainObject(v)) {
      for (const [k, inner] of Object.entries(v)) {
        const childPath = `${p}.${k}`;
        if (/date/i.test(k) && typeof inner === "string") {
          const form = inner === "" ? "empty text" : dateForm(inner);
          const map = agg.dates.get(childPath) ?? new Map();
          map.set(form, (map.get(form) ?? 0) + 1);
          agg.dates.set(childPath, map);
        } else visit(childPath, inner);
      }
    }
  };
  if (Array.isArray(value) || isPlainObject(value)) visit(path, value);
}

function printAgg(entity, agg, testKeys) {
  console.log(`\n  L3 ${entity}: union of keys over ${agg.reads} production reads (present / filled / types / text length / list / element or object key names / in test record):`);
  for (const key of [...agg.keys.keys()].sort()) {
    const k = agg.keys.get(key);
    const len = k.maxLen >= 0 ? `${k.minLen}-${k.maxLen}` : "-";
    const list = k.listMax >= 0 ? `len ${k.listMin}-${k.listMax}, non-empty in ${k.listFilled}` : "-";
    const shapes = k.shapes.size ? [...k.shapes].join(" || ") : "-";
    const inTest = testKeys ? (testKeys.has(key) ? "yes" : "NO (new)") : "?";
    console.log(`    ${key} | ${k.present}/${agg.reads} | ${k.filled} | ${[...k.types].sort().join(",")} | ${len} | ${list} | ${shapes} | ${inTest}`);
  }
  if (testKeys) {
    const missing = [...testKeys].filter((key) => !agg.keys.has(key));
    console.log(`  Test-record keys never seen in production reads: ${missing.join(", ") || "none"}`);
  }
  console.log("  Date-like keys (filled values; digits shown as 9):");
  for (const [key, map] of [...agg.dates.entries()].sort()) {
    for (const [form, count] of map) console.log(`    ${key}: ${count} x ${form}`);
  }
  for (const key of ["dateOfBirth", "hireDate", "terminationDate"]) {
    const k = agg.keys.get(key);
    console.log(`  ${key}: key present in ${k?.present ?? 0} of ${agg.reads}, filled in ${k?.filled ?? 0}`);
  }
  if (entity === "employee") console.log(`  Role mix (credentials/job title/employee type contain): BCBA ${agg.roles.bcba}, BT/RBT ${agg.roles.btRbt}, neither ${agg.roles.other}`);
  console.log(`  isActive: true ${agg.active.true}, false ${agg.active.false}, other ${agg.active.other}`);
}

// ---- Choosing production IDs: recorded ones first, then one list page, spread over the IDs ----
async function listPool(entity) {
  const plural = entity === "employee" ? "employees" : "clients";
  const res = await crFetch("GET", `/contacts/${plural}?Offset=1&Take=${LIST_TAKE}`); // Offset=0 answered 400 (run 1)
  const rows = Array.isArray(res.data?.[plural]) ? res.data[plural] : [];
  const usable = rows.filter((row) => /^\d+$/.test(String(row?.contactId ?? "")) && !SKIP_IDS.has(String(row.contactId)));
  const active = usable.filter((row) => row.isActive === true);
  console.log(`  ${plural} list page: ${rows.length} rows, ${usable.length} usable, ${active.length} active (IDs only kept)`);
  // Spread over the sorted active IDs (older first), and for employees round-robin over the list's
  // `type` groups so the sample mixes kinds of staff (group values are never printed).
  const sorted = (active.length ? active : usable).sort((a, b) => Number(a.contactId) - Number(b.contactId));
  let ordered = sorted;
  if (entity === "employee") {
    const groups = new Map();
    for (const row of sorted) {
      const g = String(row.type ?? "");
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(row);
    }
    console.log(`  employee list: ${groups.size} type group(s) (sizes ${[...groups.values()].map((g) => g.length).join(", ")})`);
    const lists = [...groups.values()].map((g) => spread(g, 15));
    ordered = [];
    for (let i = 0; lists.some((l) => i < l.length); i += 1) for (const l of lists) if (i < l.length) ordered.push(l[i]);
  } else {
    ordered = spread(sorted, 15);
  }
  return ordered.map((row) => String(row.contactId));
}

function spread(rows, n) {
  if (rows.length <= n) return rows;
  return Array.from({ length: n }, (_, i) => rows[Math.floor((i * rows.length) / n)]);
}

async function survey(entity, testKeys) {
  const cfg = OPTIONS.surveyOnly ? SURVEY_RESUME[entity] : SURVEY[entity];
  const agg = newAgg();
  const ssnRows = [];
  const result = { requested: [], status: {}, notFound: 0 };
  const queue = OPTIONS.surveyOnly ? [] : [...RECORD_IDS[entity]];
  let pooled = false;
  const ssnFilled = () => ssnRows.filter((row) => row.form !== "absent" && !row.form.startsWith("blank")).length;
  const enough = () => agg.reads >= cfg.target && (entity !== "employee" || ssnFilled() >= cfg.ssnTarget);
  console.log(`\n==== L3${entity === "employee" ? "/L2" : ""} survey: production ${entity}s (GET only) ====`);
  while (result.requested.length < cfg.max && !enough()) {
    if (!queue.length) {
      if (pooled) break;
      pooled = true;
      const pool = await listPool(entity);
      queue.push(...pool.filter((id) => !RECORD_IDS[entity].includes(id)));
      continue;
    }
    const id = queue.shift();
    result.requested.push(id);
    const res = await crFetch("GET", contactPath(entity, id));
    result.status[id] = res.status;
    if (res.status === 404) {
      result.notFound += 1;
      continue;
    }
    const contact = res.data?.contact;
    if (!res.ok || !isPlainObject(contact)) continue;
    if (String(contact.contactId ?? "") !== id) {
      console.log(`    read for ${id} does not carry that contact ID: not counted`);
      continue;
    }
    addToAgg(agg, contact);
    if (entity === "employee") {
      const label = `E${agg.reads}`;
      const ssn = charClasses(contact.ssn);
      const npi = charClasses(contact.npiNumber);
      const guardKey = unsendableSsnKey(contact);
      const otherSsnKeys = Object.keys(contact).filter((key) => SENSITIVE_KEY.test(key) && key !== "ssn");
      ssnRows.push({ label, id, present: hasOwn(contact, "ssn"), ssn, form: hasOwn(contact, "ssn") ? ssnForm(ssn) : "absent", guard: guardKey ? `NO PUT, record fails (${guardKey})` : "sent back as read", npi, otherSsnKeys });
    }
  }
  console.log(`\n  Requested ${result.requested.length}: ${result.requested.map((id) => `${id}=${result.status[id] ?? "none"}`).join(", ")}`);
  console.log(`  200 with a contact: ${agg.reads}; 404: ${result.notFound}`);
  printAgg(entity, agg, testKeys);
  if (entity === "employee") printSsn(ssnRows);
  return { agg, result, ssnRows };
}

function printSsn(rows) {
  console.log("\n  L2 ssn read form per production employee (no values):");
  console.log("    row | contact | ssn key | type | length | digits | dashes | spaces | * | X/x | # | bullet | other letters | other | class pattern | form | build guard | npi: type/len/digits | other ssn-like keys");
  for (const r of rows) {
    const s = r.ssn;
    const filled = r.present && s.type === "string" && s.length > 0;
    const cell = (v) => (s.type === "string" ? v : "-");
    console.log(
      `    ${r.label} | ${r.id} | ${r.present ? "present" : "ABSENT"} | ${s.type} | ${cell(s.length)} | ${cell(s.digits)} | ${cell(s.dashes)} | ${cell(s.spaces)} | ${cell(s.stars)} | ${cell(s.xs)} | ${cell(s.hashes)} | ${cell(s.bullets)} | ${cell(s.otherLetters)} | ${cell(s.other)} | ${filled ? s.pattern : "-"} | ${r.form} | ${r.guard} | ${r.npi.type}/${r.npi.length ?? "-"}/${r.npi.digits ?? "-"} | ${r.otherSsnKeys.join(",") || "none"}`
    );
  }
  const tally = new Map();
  rows.forEach((r) => tally.set(r.form, (tally.get(r.form) ?? 0) + 1));
  console.log(`  ssn forms: ${[...tally].map(([form, n]) => `${form} x${n}`).join("; ")}`);
  console.log(`  build guard: ${rows.filter((r) => r.guard.startsWith("NO PUT")).length} of ${rows.length} would fail (no PUT)`);
}

// ---- Test records ----
function checkKind(entity, contact) {
  const id = TEST_CONTACTS[entity];
  if (String(contact.contactId ?? "") !== id) stop(`The ${entity} read does not show test contact ${id}.`);
  const other = entity === "employee" ? /client/i : /employee/i;
  const own = entity === "employee" ? /employee/i : /client/i;
  if (typeof contact.type === "string" && (!own.test(contact.type) || other.test(contact.type))) stop(`contact.type does not name a ${entity}.`);
}

async function readTest(entity, ctx) {
  const res = await crFetch("GET", contactPath(entity, TEST_CONTACTS[entity]));
  if (!res.ok) stop(`GET of test ${entity} answered ${res.status ?? "nothing"}.`);
  const contact = res.data?.contact;
  if (!isPlainObject(contact)) stop("The read has no contact object.");
  checkKind(entity, contact);
  if (ctx) ctx.lastRead = contact;
  return contact;
}

const containerKeys = (contact) => Object.keys(contact).filter((key) => Array.isArray(contact[key]) || isPlainObject(contact[key]));
const filledContainers = (contact) => containerKeys(contact).filter((key) => !isBlank(contact[key]));

function printTestRecord(entity, contact) {
  const keys = Object.keys(contact).sort();
  console.log(`\n  Test ${entity} ${TEST_CONTACTS[entity]}: ${keys.length} keys`);
  for (const key of keys) console.log(`    ${key} | ${describe(contact[key], key)}`);
  console.log(`  List/object keys: ${containerKeys(contact).join(", ") || "none"}; filled: ${filledContainers(contact).join(", ") || "none"}`);
}

// ---- Comparison ----
function compareContacts(before, after) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.map((key) => {
    const was = before[key];
    const now = after[key];
    let value;
    if (!hasOwn(after, key)) value = "ABSENT";
    else if (!hasOwn(before, key)) value = "NEW";
    else if (stableJson(was) === stableJson(now)) value = "equal";
    else if (!isBlank(was) && isBlank(now)) value = "BLANKED";
    else value = "CHANGED";
    const shape = shapeOf(was) === shapeOf(now) && hasOwn(before, key) === hasOwn(after, key) ? "equal" : "CHANGED";
    return { key, value, shape, detail: `${describe(was, key)} -> ${describe(now, key)}`, volatile: VOLATILE_KEY.test(key) };
  });
}
const differing = (rows) => rows.filter((row) => row.value !== "equal" && !row.volatile);

function printRows(title, rows, { onlyDiffs = false } = {}) {
  const shown = onlyDiffs ? rows.filter((row) => row.value !== "equal") : rows;
  console.log(`\n  ${title}`);
  if (!shown.length) {
    console.log("    (every key equal by shape and by value)");
    return;
  }
  for (const row of shown) console.log(`    ${row.key} | shape ${row.shape} | value ${row.value} | ${row.detail}`);
}

// ---- Bodies ----
// The fixed build's mapped body with the HubSpot values equal to the read (as in
// check-cr-sendback-risks.mjs), then updateBodyFromRead: the build's own full-echo body.
function buildEchoBody(entity, contact) {
  if (entity === "employee") {
    const mapped = Object.fromEntries(EMPLOYEE_CORE_FIELDS.map((field) => [field, field === "dateOfBirth" ? null : contact[field] ?? null]));
    if (unusableHeldEmployeeDateOfBirth(mapped, contact)) stop("The held dateOfBirth is not usable.");
    const preserved = buildEmployeePayloadForContactId(mapped, { contact });
    const body = keepUnwrittenCoreFields(preserved.payload, {}, contact);
    if (!preserved.crExternalSystemId) delete body.externalSystemId;
    return updateBodyFromRead(body, contact, (key) => key);
  }
  const missing = CLIENT_CORE_FIELDS.find((field) => !hasOwn(contact, clientCoreReadKey(field)));
  if (missing) stop(`contact.${clientCoreReadKey(missing)} is absent.`);
  const payload = {
    ExternalSystemId: String(contact.externalSystemId ?? ""),
    FirstName: normalizeBlank(contact.firstName),
    LastName: normalizeBlank(contact.lastName),
    ...Object.fromEntries(CLIENT_CORE_FIELDS.map((field) => [field, null]))
  };
  if (payload.ExternalSystemId.trim() === "") delete payload.ExternalSystemId;
  const unusable = unusableHeldClientCoreField(payload, contact);
  if (unusable) stop(`contact.${unusable} is not usable.`);
  return updateBodyFromRead(keepHeldClientCoreFields(payload, contact), contact, clientPutKey);
}

// Restore: every key as read; dateOfBirth in the form proven on a PUT.
function fullBody(entity, contact) {
  const body = {};
  for (const [key, value] of Object.entries(contact)) {
    const putKey = putKeyOf(entity, key);
    if (key !== "dateOfBirth") body[putKey] = value;
    else if (normalizeBlank(value) === null) {
      if (entity === "employee") body[putKey] = value;
    } else {
      const day = String(value).slice(0, 10);
      body[putKey] = entity === "employee" ? day : `${day}T00:00:00.000Z`;
    }
  }
  return body;
}

const keyList = (body) => Object.keys(body).map((key) => `${key}:${describe(body[key], key)}`).join(", ");

// ---- L1 write sequence on one test record ----
function writeRestoreFile(ctx) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(tmpdir(), `cr-l1-restore-${ctx.entity}-${ctx.id}-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ script: "check-cr-l1-l3", entity: ctx.entity, contactId: ctx.id, savedAt: new Date().toISOString(), contact: ctx.baseline }), { mode: 0o600, flag: "wx" });
  ctx.restoreFile = file;
  console.log(`  Restore file (mode 600, the test record's baseline): ${file}`);
}

function dropRestoreFile(ctx) {
  if (!ctx.restoreFile) return;
  try {
    unlinkSync(ctx.restoreFile);
    console.log(`  Restore file deleted: ${ctx.restoreFile}`);
  } catch {
    console.log(`  Could not delete the restore file; delete it by hand: ${ctx.restoreFile}`);
  }
}

async function putTest(ctx, body, label) {
  if (Object.keys(body).some((key) => SENSITIVE_KEY.test(key) && !isBlank(body[key]))) stop("A filled ssn-like key would be sent: no PUT.");
  console.log(`  PUT body (${label}), ${Object.keys(body).length} keys: ${keyList(body)}`);
  ctx.putSent = true;
  ctx.lastRead = null;
  return crFetch("PUT", contactPath(ctx.entity, ctx.id), body);
}

async function readTwice(ctx, title, reference) {
  const first = await readTest(ctx.entity, ctx);
  console.log(`  waiting ${LAG_WAIT_MS / 1000} s`);
  await sleep(LAG_WAIT_MS);
  const second = await readTest(ctx.entity, ctx);
  const lag = differing(compareContacts(first, second));
  if (lag.length) console.log(`  The two reads differ in: ${lag.map((row) => row.key).join(", ")} (read lag); the second read is used.`);
  const rows = compareContacts(reference, second);
  printRows(title, rows);
  return { second, rows };
}

async function l1Entity(entity) {
  const ctx = { entity, id: TEST_CONTACTS[entity], baseline: null, lastRead: null, putSent: false, restoreFile: null, restoreOk: null, restoreNotEqual: [], verdict: {}, stopped: null };
  console.log(`\n==== L1 write: test ${entity} ${ctx.id} ====`);
  try {
    ctx.baseline = await readTest(entity, ctx);
    const filled = filledContainers(ctx.baseline);
    console.log(`  Baseline: ${Object.keys(ctx.baseline).length} keys; filled list/object keys: ${filled.join(", ") || "none"}`);
    if (unsendableSsnKey(ctx.baseline) || Object.keys(ctx.baseline).some((key) => SENSITIVE_KEY.test(key) && !isBlank(ctx.baseline[key]))) {
      stop("ssn is filled on the test record: no PUT.");
    }
    if (!filled.length) {
      ctx.verdict.full = ctx.verdict.subset = "not testable (no list filled; needs Zeke's hand set-up)";
      return ctx;
    }
    writeRestoreFile(ctx);

    console.log("\n  1. Full-echo PUT: the build's update body with every mapped key equal to the read.");
    const echo = buildEchoBody(entity, ctx.baseline);
    for (const key of filled) {
      const putKey = putKeyOf(entity, key);
      console.log(`    ${key}: body carries ${putKey} = ${describe(echo[putKey], key)}; equal to the read: ${stableJson(echo[putKey]) === stableJson(ctx.baseline[key]) ? "yes" : "no"}`);
    }
    const echoRes = await putTest(ctx, echo, "full echo");
    const full = await readTwice(ctx, `Full-echo PUT (HTTP ${echoRes.status ?? "none"}) vs baseline, read twice ${LAG_WAIT_MS / 1000} s apart`, ctx.baseline);
    const fullDiff = differing(full.rows);
    ctx.verdict.full = !echoRes.ok
      ? `FAIL (PUT answered ${echoRes.status ?? "nothing"})`
      : fullDiff.length
        ? `FAIL (${fullDiff.map((row) => `${row.key} ${row.value}`).join(", ")})`
        : `PASS (every key equal by shape and value, filled lists: ${filled.join(", ")})`;

    console.log("\n  2. Subset PUT: the same body with every list/object key left out.");
    const subset = { ...buildEchoBody(entity, full.second) };
    const dropped = containerKeys(full.second).map((key) => putKeyOf(entity, key));
    dropped.forEach((key) => delete subset[key]);
    console.log(`    left out: ${dropped.join(", ")}`);
    const subRes = await putTest(ctx, subset, "lists left out");
    const sub = await readTwice(ctx, `Subset PUT (HTTP ${subRes.status ?? "none"}) vs baseline, read twice ${LAG_WAIT_MS / 1000} s apart`, ctx.baseline);
    const subDiff = differing(sub.rows);
    ctx.verdict.subset = !subRes.ok
      ? `PUT answered ${subRes.status ?? "nothing"}`
      : subDiff.length
        ? `lists NOT all kept (${subDiff.map((row) => `${row.key} ${row.value}`).join(", ")})`
        : `omitted lists survived (${filled.join(", ")} equal)`;
  } catch (error) {
    ctx.stopped = error instanceof StopError ? error.message : `unexpected error (${error?.name ?? "Error"}): ${String(error?.message ?? "").slice(0, 200)}`;
    console.log(`\n  STOPPED: ${ctx.stopped}`);
  } finally {
    if (ctx.putSent) await restoreEntity(ctx);
    else dropRestoreFile(ctx);
  }
  return ctx;
}

async function restoreEntity(ctx) {
  console.log(`\n  3. Restore test ${ctx.entity} ${ctx.id} to the baseline.`);
  try {
    const current = ctx.lastRead ?? (await readTest(ctx.entity, ctx));
    if (!differing(compareContacts(ctx.baseline, current)).length) {
      console.log("  Every key already equals the baseline (shape and value): no restore PUT needed.");
    } else {
      await putTest(ctx, fullBody(ctx.entity, ctx.baseline), "full body of the baseline");
      const restored = (contact) => !differing(compareContacts(ctx.baseline, contact)).length;
      let contact = await readTest(ctx.entity, ctx);
      for (let i = 1; i <= LAG_RETRIES && !restored(contact); i += 1) {
        console.log(`  Not restored yet; GET again in ${LAG_WAIT_MS / 1000} s (${i} of ${LAG_RETRIES}).`);
        await sleep(LAG_WAIT_MS);
        contact = await readTest(ctx.entity, ctx);
      }
    }
    const rows = compareContacts(ctx.baseline, ctx.lastRead);
    printRows("Final state vs baseline (every key)", rows);
    ctx.restoreNotEqual = differing(rows).map((row) => `${row.key} ${row.value}`);
    ctx.restoreOk = ctx.restoreNotEqual.length === 0;
  } catch (error) {
    ctx.restoreOk = false;
    ctx.restoreNotEqual = [`restore did not finish: ${error instanceof StopError ? error.message : error?.name ?? "error"}`];
  }
  if (ctx.restoreOk) dropRestoreFile(ctx);
  else {
    console.log("\n  !!!!! RESTORE NOT VERIFIED !!!!!");
    if (ctx.restoreFile) console.log(`  Rerun: NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-l1-l3.mjs --write --restore ${ctx.restoreFile}`);
  }
}

async function restoreFromFile(file) {
  let saved;
  try {
    saved = JSON.parse(readFileSync(resolve(file), "utf8"));
  } catch {
    throw new StopError("The restore file could not be read as JSON.");
  }
  const entity = saved?.entity;
  if (!hasOwn(TEST_CONTACTS, entity) || String(saved.contactId) !== TEST_CONTACTS[entity] || String(saved.contact?.contactId ?? "") !== TEST_CONTACTS[entity]) {
    throw new StopError("The restore file is not for one of the two test contacts.");
  }
  const ctx = { entity, id: TEST_CONTACTS[entity], baseline: saved.contact, lastRead: null, putSent: true, restoreFile: resolve(file), restoreOk: null, restoreNotEqual: [] };
  await restoreEntity(ctx);
  return ctx;
}

// ---- Main ----
async function readRun() {
  console.log("\n==== L1 read: the two test records (GET) ====");
  const tests = {};
  for (const entity of ["employee", "client"]) {
    tests[entity] = await readTest(entity);
    printTestRecord(entity, tests[entity]);
  }
  const payors = await crFetch("GET", TEST_PAYORS_PATH);
  const list = Array.isArray(payors.data?.payors) ? payors.data.payors : null;
  console.log(`  Test client payor sub-resource: ${list ? `${list.length} payor(s)${list.length ? `, element keys ${[...new Set(list.map(shapeOf))].join(" | ")}` : ""}` : "no payors list in the answer"}`);

  const employees = await survey("employee", new Set(Object.keys(tests.employee)));
  const clients = await survey("client", new Set(Object.keys(tests.client)));
  return { employees, clients };
}

async function main() {
  SETTINGS = loadSettings();
  const mode = OPTIONS.restoreFile ? "restore only" : OPTIONS.write ? "L1 WRITE (test records only)" : "read run (GETs only)";
  console.log(`CR live checks L1-L3. Mode: ${mode}. Call cap ${MAX_CALLS}.`);
  let exitCode = 0;
  if (OPTIONS.restoreFile) {
    const ctx = await restoreFromFile(OPTIONS.restoreFile);
    exitCode = ctx.restoreOk ? 0 : 2;
  } else if (!OPTIONS.write && OPTIONS.surveyOnly) {
    await survey("employee", new Set(TEST_KEYS_RUN1.employee));
    await survey("client", new Set(TEST_KEYS_RUN1.client));
  } else if (!OPTIONS.write) {
    await readRun();
  } else {
    const entities = OPTIONS.entity === "both" ? ["employee", "client"] : [OPTIONS.entity];
    for (const entity of entities) {
      const ctx = await l1Entity(entity);
      console.log(`\n  L1 verdict, ${entity} ${ctx.id}:`);
      if (ctx.stopped) console.log(`    STOPPED = ${ctx.stopped}`);
      console.log(`    FULL_ECHO = ${ctx.verdict.full ?? "not reached"}`);
      console.log(`    SUBSET_LISTS_LEFT_OUT = ${ctx.verdict.subset ?? "not reached"}`);
      console.log(`    RESTORE_OK = ${!ctx.putSent ? "not needed (no PUT)" : ctx.restoreOk ? "yes" : `NO (${ctx.restoreNotEqual.join(", ")})`}`);
      if (ctx.putSent && !ctx.restoreOk) {
        exitCode = 2;
        console.log("\n  Stopped: a restore was not verified, so no further record is touched.");
        break;
      }
      if (ctx.stopped) exitCode = Math.max(exitCode, 1);
    }
  }
  console.log(`\nTotal CentralReach calls this run: ${callCount} (token included).`);
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(`Stopped: ${error instanceof StopError ? error.message : error?.name ?? "error"}`);
  console.error(`CentralReach calls made: ${callCount}.`);
  process.exit(1);
});
