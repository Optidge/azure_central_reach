// Risk N1 and V36, live check on CentralReach test records (side-session note
// build-chat-2-cr-verification-2026-11-24.md, live checks 1 and 2).
//   N1   The integration's update PUT carries only some core keys (employee: the 12 of
//        EMPLOYEE_CORE_FIELDS; client: FirstName, LastName, the 11 of CLIENT_CORE_FIELDS and
//        ExternalSystemId as held, no ContactForm). An employee PUT clears a key it leaves out
//        (BUILD-PLAN section 4, 2026-11-20). Does the subset PUT blank the keys it never sends
//        (employee jobTitle, npiNumber, credentials, payTypes, other phones; client phoneHome,
//        chosenName, title, middleInitial, guarantor names ...)?
//   V36  Is an employee PUT with dateOfBirth rebuilt as the first 10 characters +
//        "T00:00:00.000Z" (src/lib/mappedState.mjs keepUnwrittenCoreFields) accepted without a
//        date shift?
//
// IT WRITES TO PRODUCTION CENTRALREACH (there is no sandbox), on two test records only:
// employee 5338681 and client 5384589. The IDs are fixed below; no option names another contact.
// Every request goes through crFetch, which allows only the token POST, a GET of those two
// contacts and, with --write, a PUT of those two contacts. No label, metadata, HubSpot or Azure
// call. Output: key names, types, lengths and HTTP statuses. Never a value, a token or a setting.
//
// The subset PUT body is built by the pending build's own functions (keepUnwrittenCoreFields,
// buildEmployeePayloadForContactId, keepHeldClientCoreFields), with the mapped values taken from
// the CentralReach read, so a mapped value does not change. The employee dateOfBirth is sent
// through the build's "blank in HubSpot" path: the held date rebuilt as YYYY-MM-DDT00:00:00.000Z.
//
// Steps, per entity (employee first, then client):
//   A  GET the contact. Keep the whole `contact` in memory and (with --write) in a restore file
//      under the OS temp folder, mode 600 (path printed; deleted after a verified restore).
//   B  (--write, not --probes-set-by-hand) One full-body PUT (every key as read) that puts a marker
//      into up to 2 blank unmapped probe keys, then GET until the markers show (up to 3 more GETs,
//      20 s apart). With --probes-set-by-hand, Zeke fills them on the CR screen first and B is
//      skipped: at least one probe key must then hold a value.
//   C  The subset PUT: exactly the pending build's update body, built from the step-B read.
//   D  GET at once and again after 20 s; compare every key of `contact` with the step-B read.
//   E  Restore (runs whenever a PUT was sent, also after an error): when a key differs from the
//      step-A read, a full-body PUT of the step-A read (on a 4xx, the core keys only), then GET
//      until every key equals it (up to 3 more GETs, 20 s apart). When nothing differs, no PUT.
//   F  Verdict lines and the CentralReach call count (token request included).
// The full-body PUT sends every `contact` key as read (client keys with a capital first letter,
// the casing the build sends), dateOfBirth in the form already proven on a PUT (employee
// YYYY-MM-DD, client YYYY-MM-DDT00:00:00.000Z). That shape is proven for the core keys only, not
// for the other keys (lists, identity keys): see --probes-set-by-hand.
//
// Usage (from the repo root; local.settings.json Values must hold the five CR_ settings):
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-unmapped-fields.mjs                (dry run, GETs only)
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-unmapped-fields.mjs --write --probes-set-by-hand
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-unmapped-fields.mjs --write
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-unmapped-fields.mjs --write --restore <file>
// Options: --entity employee|client|both (default both). --dry-run (default) makes only GETs.
// Exit code: 0 done; 1 stopped before the end; 2 a restore was not verified.
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildEmployeePayloadForContactId } from "../../src/lib/centralReachClient.mjs";
import {
  CLIENT_CORE_FIELDS,
  EMPLOYEE_CORE_FIELDS,
  clientCoreReadKey,
  keepHeldClientCoreFields,
  keepUnwrittenCoreFields,
  normalizeBlank,
  unusableHeldClientCoreField,
  unusableHeldEmployeeDateOfBirth
} from "../../src/lib/mappedState.mjs";

// ---- The only records this script touches (Zeke's go-ahead: test records only) ----
const TEST_CONTACTS = Object.freeze({ employee: "5338681", client: "5384589" });
const ENTITY_WORD = Object.freeze({ employee: /employee/i, client: /client/i });

// Probe keys: unmapped free-text keys, tried in this order; only a key the read holds and that is
// blank (or already holds the marker) is written.
const PROBE_CANDIDATES = Object.freeze({
  employee: ["jobTitle", "phoneHome", "phoneWork", "chosenName"],
  client: ["phoneHome", "chosenName"]
});
const PROBES_WANTED = 2;
const TEXT_MARKER = "AzT N1 probe";
const PHONE_MARKER = "2125550142";
const markerFor = (key) => (/phone/i.test(key) ? PHONE_MARKER : TEXT_MARKER);

const LAG_RETRIES = 3;
const LAG_WAIT_MS = 20000;
const REQUEST_TIMEOUT_MS = 15000;
// A key whose value could be masked on the read: sending it back could overwrite the real value.
const SENSITIVE_KEY = /ssn|social|taxid/i;
// A key that may change by itself (a timestamp): shown, but not counted as a change.
const VOLATILE_KEY = /modified|updated|cached|timestamp|lastsync/i;

class StopError extends Error {}
const stop = (message) => {
  throw new StopError(message);
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const pascal = (key) => key.charAt(0).toUpperCase() + key.slice(1);

// ---- Arguments ----
const USAGE = [
  "Usage (from the repo root):",
  "  NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-unmapped-fields.mjs [--entity employee|client|both] [--dry-run]",
  "  NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-unmapped-fields.mjs [--entity ...] --write [--probes-set-by-hand]",
  "  NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-unmapped-fields.mjs --write --restore <file>"
].join("\n");

function parseArgs(argv) {
  const options = { entity: "both", write: false, dryRun: false, byHand: false, restoreFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--entity") options.entity = argv[(i += 1)];
    else if (arg === "--restore") options.restoreFile = argv[(i += 1)];
    else if (arg === "--write") options.write = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--probes-set-by-hand") options.byHand = true;
    else return { error: `Unknown argument: ${arg}` };
  }
  if (!["employee", "client", "both"].includes(options.entity)) return { error: "--entity is employee, client or both." };
  if (options.write && options.dryRun) return { error: "--write and --dry-run cannot go together." };
  if (options.restoreFile !== null && (!options.restoreFile || !options.write)) {
    return { error: "--restore needs a file path and --write." };
  }
  if (options.byHand && !options.write) return { error: "--probes-set-by-hand goes with --write." };
  return { options };
}

const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  console.error(`${parsed.error}\n${USAGE}`);
  process.exit(1);
}
const OPTIONS = parsed.options;

// ---- Settings: the five CR_ values the client uses (createCentralReachClient / config.mjs) ----
// getConfig() is not used: it also requires the HubSpot, Cosmos and Service Bus settings. Names
// only are ever printed.
const SETTING_NAMES = ["CR_CLIENT_ID", "CR_CLIENT_SECRET", "CR_API_KEY", "CR_BASE_URL", "CR_TOKEN_URL"];
function loadSettings() {
  let values;
  try {
    values = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"))?.Values || {};
  } catch {
    // The parser's own message can quote the file, so it is not passed on.
    throw new StopError("local.settings.json could not be read as JSON (run from the repo root).");
  }
  const missing = SETTING_NAMES.filter((name) => !String(values[name] ?? "").trim());
  if (missing.length) throw new StopError(`Missing in local.settings.json Values: ${missing.join(", ")}`);
  return Object.fromEntries(SETTING_NAMES.map((name) => [name, String(values[name]).trim()]));
}

// ---- HTTP: one door, every call counted and its status printed ----
// Same request shape as src/lib/centralReachClient.mjs (token body with scope cr-api; Bearer
// token and x-api-key on every call; JSON body). fetch instead of the client's axios instance:
// axios does not honour NODE_USE_ENV_PROXY. One attempt per call, no hidden retry, so the count
// is exact.
let SETTINGS = null;
let token = null;
let callCount = 0;
const contactPath = (entity) => `/contacts/${entity}/${TEST_CONTACTS[entity]}`;
const ALLOWED_PATHS = new Set(Object.keys(TEST_CONTACTS).map(contactPath));

async function send(url, init, label) {
  callCount += 1;
  const n = callCount;
  let res;
  let text = "";
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    text = await res.text();
  } catch {
    // A fetch error can quote the URL (a settings value), so only a plain message goes on.
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
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString()
    },
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
  const safe = (value) =>
    typeof value === "string" && /^[A-Za-z0-9_.\- ]{1,60}$/.test(value.trim()) ? value.trim() : null;
  const unique = (values) => [...new Set(values.filter(Boolean))];
  const fields = unique(items.map((item) => safe(item?.fieldName)));
  const codes = unique([safe(data?.responseStatus?.errorCode), ...items.map((item) => safe(item?.errorCode))]);
  if (fields.length || codes.length) {
    console.log(`    refused: fields [${fields.join(", ")}] codes [${codes.join(", ")}]`);
  }
}

async function crFetch(method, path, body) {
  const allowed = ALLOWED_PATHS.has(path) && (method === "GET" || (method === "PUT" && OPTIONS.write));
  if (!allowed) {
    throw new Error(`Refused ${method} ${path}: only GET, and with --write PUT, of the two test contacts.`);
  }
  const accessToken = await getToken();
  const url = `${SETTINGS.CR_BASE_URL.replace(/\/+$/, "")}${path}`;
  const res = await send(
    url,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-api-key": SETTINGS.CR_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    },
    `${method} ${path}`
  );
  if (!res.ok && res.status !== null) printRefusal(res.data);
  return res;
}

// ---- Shapes (never values) ----
function describe(value) {
  if (value === undefined) return "absent";
  if (value === null) return "null";
  if (typeof value === "string") return `text(${value.length})`;
  if (Array.isArray(value)) return `list(${value.length})`;
  if (typeof value === "object") return `object(${Object.keys(value).length} keys)`;
  return typeof value;
}

function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

// One row per key of either read: equal, CHANGED, BLANKED (was filled, now blank), ABSENT (key
// gone), NEW (key appeared).
function compareContacts(before, after, inBody = () => null) {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return keys.map((key) => {
    const was = before[key];
    const now = after[key];
    let result;
    if (!hasOwn(after, key)) result = "ABSENT";
    else if (!hasOwn(before, key)) result = "NEW";
    else if (stableJson(was) === stableJson(now)) result = "equal";
    else if (!isBlank(was) && isBlank(now)) result = "BLANKED";
    else result = "CHANGED";
    let detail = `${describe(was)} -> ${describe(now)}`;
    if (key === "dateOfBirth") {
      const first10 = (value) => (typeof value === "string" ? value.slice(0, 10) : null);
      const same = first10(was) !== null && first10(was) === first10(now);
      detail += `, first 10 chars equal: ${same ? "yes" : "no"}`;
    }
    return { key, inBody: inBody(key), result, detail, volatile: VOLATILE_KEY.test(key) };
  });
}

const differing = (rows) => rows.filter((row) => row.result !== "equal" && !row.volatile);

function printTable(title, rows, { onlyDiffs = false } = {}) {
  const shown = onlyDiffs ? rows.filter((row) => row.result !== "equal") : rows;
  console.log(`\n  ${title}`);
  if (!shown.length) {
    console.log("    (every key equal)");
    return;
  }
  const width = Math.max(4, ...shown.map((row) => row.key.length));
  const withBody = shown.some((row) => row.inBody !== null);
  console.log(`    ${"key".padEnd(width)} | ${withBody ? "in subset PUT | " : ""}result  | shape before -> after`);
  for (const row of shown) {
    const body = withBody ? `${(row.inBody ? "yes" : "no").padEnd(13)} | ` : "";
    const note = row.volatile && row.result !== "equal" ? " (timestamp-like key: not counted)" : "";
    console.log(`    ${row.key.padEnd(width)} | ${body}${row.result.padEnd(7)} | ${row.detail}${note}`);
  }
}

// ---- Request bodies ----
// Step C, employee: the worker's update path (src/workflows/employeeSyncWorkflow.mjs:1082-1132)
// with the mapped payload equal to the read and the HubSpot date of birth blank, so the held date
// goes through the rebuild. Returns { body } or { failed } (the build's CR_EMPLOYEE_READ_FAILED).
function employeeSubsetBody(contact) {
  const mapped = Object.fromEntries(
    EMPLOYEE_CORE_FIELDS.map((field) => [field, field === "dateOfBirth" ? null : contact[field] ?? null])
  );
  if (unusableHeldEmployeeDateOfBirth(mapped, contact)) {
    return { failed: `contact.dateOfBirth is ${describe(contact.dateOfBirth)} (absent, or not YYYY-MM-DD...)` };
  }
  const preserved = buildEmployeePayloadForContactId(mapped, { contact });
  const body = keepUnwrittenCoreFields(preserved.payload, {}, contact);
  // Rule 5.4 (worker line 1088): CR holds no External System ID and workday_id is taken as blank.
  if (!preserved.crExternalSystemId) delete body.externalSystemId;
  return { body };
}

// Step C, client: createOrUpdateClient's update path (src/lib/centralReachClient.mjs:405-417),
// externalSystemIdHeld true, mapped names equal to the read, the 11 core keys blank in the payload
// so each carries the held value (date rebuilt), plus getClientByContactId's read checks.
function clientSubsetBody(contact) {
  const missing = CLIENT_CORE_FIELDS.find((field) => !hasOwn(contact, clientCoreReadKey(field)));
  if (missing) return { failed: `contact.${clientCoreReadKey(missing)} is absent` };
  const updatePayload = {
    ExternalSystemId: String(contact.externalSystemId ?? ""),
    FirstName: normalizeBlank(contact.firstName),
    LastName: normalizeBlank(contact.lastName),
    ...Object.fromEntries(CLIENT_CORE_FIELDS.map((field) => [field, null]))
  };
  if (updatePayload.ExternalSystemId.trim() === "") delete updatePayload.ExternalSystemId;
  const unusable = unusableHeldClientCoreField(updatePayload, contact);
  if (unusable) return { failed: `contact.${unusable} is ${describe(contact[unusable])}, not usable` };
  return { body: keepHeldClientCoreFields(updatePayload, contact) };
}

const subsetBody = (entity, contact) =>
  entity === "employee" ? employeeSubsetBody(contact) : clientSubsetBody(contact);

// The PUT key of a read key: employee keys are the same; client keys take a capital first letter.
const putKeyOf = (entity, readKey) => (entity === "client" ? pascal(readKey) : readKey);

// Steps B and E: every key as read. dateOfBirth in the form already proven on a PUT; a blank
// client date is left out (the build never sends a blank client date).
function fullBody(entity, contact) {
  const body = {};
  for (const [key, value] of Object.entries(contact)) {
    const putKey = putKeyOf(entity, key);
    if (key !== "dateOfBirth") {
      body[putKey] = value;
    } else if (normalizeBlank(value) === null) {
      if (entity === "employee") body[putKey] = value;
    } else {
      const day = String(value).slice(0, 10);
      body[putKey] = entity === "employee" ? day : `${day}T00:00:00.000Z`;
    }
  }
  return body;
}

// Step E fallback after a 4xx on the full body: the core keys only (a shape the build sends).
function coreBody(entity, contact) {
  const full = fullBody(entity, contact);
  const keys =
    entity === "employee"
      ? EMPLOYEE_CORE_FIELDS
      : ["ExternalSystemId", "FirstName", "LastName", ...CLIENT_CORE_FIELDS];
  return Object.fromEntries(keys.filter((key) => hasOwn(full, key)).map((key) => [key, full[key]]));
}

const keyList = (body) => Object.keys(body).map((key) => `${key}:${describe(body[key])}`).join(", ");

// ---- One contact ----
function checkKind(entity, contact) {
  const id = TEST_CONTACTS[entity];
  if (String(contact.contactId ?? "") !== id) {
    stop(`The ${entity} read does not show contact ${id} (contactId is ${describe(contact.contactId)}).`);
  }
  const other = entity === "employee" ? "client" : "employee";
  if (typeof contact.type === "string") {
    if (!ENTITY_WORD[entity].test(contact.type) || ENTITY_WORD[other].test(contact.type)) {
      stop(`contact.type (${describe(contact.type)}) does not name a ${entity}: stopped before any PUT.`);
    }
    return `contact.type names a ${entity}`;
  }
  return `contact.type is ${describe(contact.type)}; the kind rests on the endpoint (a GET of the other kind answers 400, BUILD-PLAN section 4) and the fixed ID`;
}

async function readContact(ctx) {
  const res = await crFetch("GET", contactPath(ctx.entity));
  if (!res.ok) stop(`GET ${contactPath(ctx.entity)} answered ${res.status ?? "nothing"}.`);
  const contact = res.data?.contact;
  if (!isPlainObject(contact)) {
    stop(`The read has no contact object (top-level keys: ${Object.keys(res.data ?? {}).join(", ")}).`);
  }
  ctx.kindNote = checkKind(ctx.entity, contact);
  ctx.lastRead = contact;
  return contact;
}

// GET, then up to LAG_RETRIES more GETs LAG_WAIT_MS apart while `done` is false.
async function readUntil(ctx, done, what) {
  let contact = await readContact(ctx);
  for (let attempt = 1; attempt <= LAG_RETRIES && !done(contact); attempt += 1) {
    console.log(`  ${what} not shown yet; GET again in ${LAG_WAIT_MS / 1000} s (${attempt} of ${LAG_RETRIES}).`);
    await sleep(LAG_WAIT_MS);
    contact = await readContact(ctx);
  }
  return contact;
}

async function putContact(ctx, body, label) {
  console.log(`  PUT body (${label}), ${Object.keys(body).length} keys: ${keyList(body)}`);
  ctx.putSent = true; // before the call: a PUT with no answer may still have been applied
  ctx.lastRead = null;
  return crFetch("PUT", contactPath(ctx.entity), body);
}

function chooseProbes(entity, contact) {
  const chosen = [];
  const notes = [];
  for (const key of PROBE_CANDIDATES[entity]) {
    if (chosen.length >= PROBES_WANTED) break;
    if (!hasOwn(contact, key)) {
      notes.push(`${key}: not in the read`);
      continue;
    }
    const value = contact[key];
    const marker = markerFor(key);
    if (value === marker) chosen.push({ key, marker, alreadySet: true });
    else if (value === null || (typeof value === "string" && value.trim() === "")) {
      chosen.push({ key, marker, alreadySet: false });
    } else notes.push(`${key}: holds a value (${describe(value)}), not overwritten; still compared`);
  }
  return { chosen, notes };
}

function preflight(ctx, contact) {
  const blockers = [];
  const subset = subsetBody(ctx.entity, contact);
  if (subset.failed) {
    blockers.push(`the build's failed-read case (${ctx.entity === "employee" ? "CR_EMPLOYEE_READ_FAILED" : "CR_CLIENT_READ_FAILED"}): ${subset.failed}; the build would send no PUT`);
  }
  const sensitive = Object.keys(contact).filter((key) => SENSITIVE_KEY.test(key) && !isBlank(contact[key]));
  if (sensitive.length) {
    blockers.push(`${sensitive.join(", ")} holds a value: the full-body PUT would send it back as read (possibly masked); clear it on the CR screen first`);
  }
  const date = contact.dateOfBirth;
  if (normalizeBlank(date) !== null && !(typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date))) {
    blockers.push(`contact.dateOfBirth is ${describe(date)} and does not start with YYYY-MM-DD`);
  }
  return { subset, blockers };
}

function newContext(entity) {
  return {
    entity,
    id: TEST_CONTACTS[entity],
    baseline: null,
    lastRead: null,
    putSent: false,
    restoreFile: null,
    restoreOk: null,
    restoreNotEqual: [],
    stopped: null,
    callsAtStart: callCount,
    verdict: { unmapped: "not settled (the run stopped before step D)", mappedChanged: "-", dateForm: "not tested" }
  };
}

function writeRestoreFile(ctx) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(tmpdir(), `cr-n1-restore-${ctx.entity}-${ctx.id}-${stamp}.json`);
  const content = { script: "check-cr-unmapped-fields", entity: ctx.entity, contactId: ctx.id, savedAt: new Date().toISOString(), contact: ctx.baseline };
  writeFileSync(file, JSON.stringify(content), { mode: 0o600, flag: "wx" });
  ctx.restoreFile = file;
  console.log(`  Restore file (mode 600, holds the record's values): ${file}`);
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

async function runEntity(entity) {
  const ctx = newContext(entity);
  const inSubset = (body) => (key) => hasOwn(body, putKeyOf(entity, key));
  console.log(`\n==== ${entity} ${ctx.id} ====`);
  try {
    // A. Baseline.
    console.log("\nA. Read (baseline).");
    ctx.baseline = await readContact(ctx);
    console.log(`  Kind: ${ctx.kindNote}.`);
    const { subset, blockers } = preflight(ctx, ctx.baseline);
    const planRows = compareContacts(ctx.baseline, ctx.baseline, subset.body ? inSubset(subset.body) : () => null);
    printTable(`Keys of contact (${planRows.length})`, planRows.map((row) => ({ ...row, result: "-", detail: describe(ctx.baseline[row.key]) })));
    const probes = chooseProbes(entity, ctx.baseline);
    console.log(`\n  Subset PUT (step C): ${subset.body ? `${Object.keys(subset.body).length} keys: ${keyList(subset.body)}` : "none"}`);
    console.log(`  Probe keys: ${probes.chosen.map((p) => `${p.key} (${p.alreadySet ? "holds the marker" : "blank: marker to set"})`).join(", ") || "none"}`);
    for (const note of probes.notes) console.log(`    ${note}`);
    const candidatesFilled = PROBE_CANDIDATES[entity].filter((key) => !isBlank(ctx.baseline[key]));
    console.log(`  Candidate probe keys holding a value now (what --probes-set-by-hand needs): ${candidatesFilled.join(", ") || "none"}`);
    console.log(`  Full-body PUT (steps B and E): ${Object.keys(fullBody(entity, ctx.baseline)).length} keys.`);
    for (const blocker of blockers) console.log(`  BLOCKER: ${blocker}`);

    if (!OPTIONS.write) {
      ctx.verdict.unmapped = "not tested (dry run)";
      console.log(`\n  Dry run: no PUT. ${blockers.length ? "Fix the blockers before --write." : "Ready for --write."}`);
      return ctx;
    }
    if (blockers.length) stop("Blockers found: no PUT sent.");
    writeRestoreFile(ctx);

    // B. Probes.
    let beforeSubset = ctx.baseline;
    if (OPTIONS.byHand) {
      console.log("\nB. Skipped (--probes-set-by-hand): the probe keys were filled on the CR screen.");
      const filled = PROBE_CANDIDATES[entity].filter((key) => !isBlank(ctx.baseline[key]));
      if (!filled.length) stop(`None of ${PROBE_CANDIDATES[entity].join(", ")} holds a value: fill two on the CR screen first.`);
      console.log(`  Probe keys holding a value: ${filled.join(", ")}.`);
    } else {
      console.log("\nB. Set the probe keys with a full-body PUT.");
      const toSet = probes.chosen.filter((probe) => !probe.alreadySet);
      if (!probes.chosen.length) {
        console.log("  No probe key can be set: the result counts only unmapped keys that already hold a value.");
      } else if (toSet.length) {
        const body = fullBody(entity, ctx.baseline);
        for (const probe of toSet) body[putKeyOf(entity, probe.key)] = probe.marker;
        const res = await putContact(ctx, body, "full body as read, probes set to markers");
        if (!res.ok) stop(`The set-up PUT answered ${res.status ?? "nothing"}: the full-body shape was not accepted. Rerun with --probes-set-by-hand after filling the probe keys on the CR screen.`);
        // A value, not the exact marker: CentralReach may reformat a phone.
        const holds = (contact) => probes.chosen.every((probe) => !isBlank(contact[probe.key]));
        beforeSubset = await readUntil(ctx, holds, "The probe markers");
        for (const probe of probes.chosen) {
          const value = beforeSubset[probe.key];
          console.log(`  ${probe.key} holds a value: ${isBlank(value) ? "no" : "yes"} (exactly the marker: ${value === probe.marker ? "yes" : "no"})`);
        }
        printTable("Set-up check: keys that differ from the step-A read (only the probe keys should)", compareContacts(ctx.baseline, beforeSubset), { onlyDiffs: true });
        if (!holds(beforeSubset)) stop("The probe markers did not show after the set-up PUT: the subset PUT was not sent.");
      } else {
        console.log("  Every probe key already holds the marker: no set-up PUT.");
      }
    }
    const probeHeld = PROBE_CANDIDATES[entity].filter((key) => !isBlank(beforeSubset[key]));

    // C. The subset PUT.
    console.log("\nC. The subset PUT (the pending build's update body, from the step-B read).");
    const built = subsetBody(entity, beforeSubset);
    if (built.failed) stop(`The build's failed-read case: ${built.failed}. No subset PUT.`);
    const sentDate = built.body[putKeyOf(entity, "dateOfBirth")];
    const subsetRes = await putContact(ctx, built.body, "subset, as the build sends it");

    // D. Compare.
    console.log(`\nD. Read now and again after ${LAG_WAIT_MS / 1000} s; compare every key with the step-B read.`);
    const firstRead = await readContact(ctx);
    await sleep(LAG_WAIT_MS);
    const afterSubset = await readContact(ctx);
    const lagRows = differing(compareContacts(firstRead, afterSubset));
    if (lagRows.length) console.log(`  The two reads differ in: ${lagRows.map((row) => row.key).join(", ")} (read lag); the second read is used.`);
    const rows = compareContacts(beforeSubset, afterSubset, inSubset(built.body));
    printTable(`Subset PUT result (PUT answered HTTP ${subsetRes.status ?? "nothing"})`, rows);

    const changedUnmapped = differing(rows).filter((row) => !row.inBody);
    const changedMapped = differing(rows).filter((row) => row.inBody);
    const byResult = (list, result) => list.filter((row) => row.result === result).map((row) => row.key);
    if (!subsetRes.ok) {
      ctx.verdict.unmapped = `not settled (the subset PUT answered ${subsetRes.status ?? "nothing"}${changedUnmapped.length ? `; still, changed: ${changedUnmapped.map((row) => row.key).join(", ")}` : ""})`;
    } else if (changedUnmapped.length) {
      ctx.verdict.unmapped = `no (blanked: ${byResult(changedUnmapped, "BLANKED").join(", ") || "-"}; absent: ${byResult(changedUnmapped, "ABSENT").join(", ") || "-"}; changed: ${[...byResult(changedUnmapped, "CHANGED"), ...byResult(changedUnmapped, "NEW")].join(", ") || "-"})`;
    } else if (!probeHeld.length) {
      ctx.verdict.unmapped = "not settled (no probe key held a value before the subset PUT)";
    } else {
      ctx.verdict.unmapped = `yes (probe keys held and kept: ${probeHeld.join(", ")})`;
    }
    ctx.verdict.mappedChanged = changedMapped.map((row) => `${row.key} ${row.result}`).join(", ") || "none";
    const dateRow = rows.find((row) => row.key === "dateOfBirth");
    if (normalizeBlank(sentDate) === null) {
      ctx.verdict.dateForm = "not tested (the held date is blank, so no rebuilt date was sent)";
    } else if (!subsetRes.ok) {
      ctx.verdict.dateForm = `no (the PUT answered ${subsetRes.status ?? "nothing"}; see the refused fields)`;
    } else {
      const sameDay = typeof afterSubset.dateOfBirth === "string" && afterSubset.dateOfBirth.slice(0, 10) === String(sentDate).slice(0, 10);
      ctx.verdict.dateForm = sameDay
        ? `yes (sent ${describe(sentDate)}; read back with the same first 10 chars; whole value ${dateRow?.result === "equal" ? "unchanged" : "changed"})`
        : `no (${dateRow?.detail ?? "dateOfBirth not in the read"})`;
    }
  } catch (error) {
    ctx.stopped = error instanceof StopError ? error.message : `unexpected error (${error?.name ?? "Error"}): ${String(error?.message ?? "").slice(0, 200)}`;
    console.log(`\n  STOPPED: ${ctx.stopped}`);
  } finally {
    if (ctx.putSent) await restoreEntity(ctx);
    else dropRestoreFile(ctx);
  }
  return ctx;
}

// E. Restore to the step-A read (also used by --restore <file>).
async function restoreEntity(ctx) {
  console.log(`\nE. Restore ${ctx.entity} ${ctx.id} to the step-A read.`);
  try {
    const current = ctx.lastRead ?? (await readContact(ctx));
    if (!differing(compareContacts(ctx.baseline, current)).length) {
      console.log("  Every key already equals the step-A read: no restore PUT.");
    } else {
      let res = await putContact(ctx, fullBody(ctx.entity, ctx.baseline), "full body of the step-A read");
      if (res.status >= 400 && res.status < 500) {
        res = await putContact(ctx, coreBody(ctx.entity, ctx.baseline), "fallback: core keys of the step-A read");
      }
      const restored = (contact) => !differing(compareContacts(ctx.baseline, contact)).length;
      await readUntil(ctx, restored, "The restore");
    }
    const rows = compareContacts(ctx.baseline, ctx.lastRead);
    printTable("Restore check: keys that differ from the step-A read", rows, { onlyDiffs: true });
    ctx.restoreNotEqual = differing(rows).map((row) => row.key);
    ctx.restoreOk = ctx.restoreNotEqual.length === 0;
  } catch (error) {
    ctx.restoreOk = false;
    ctx.restoreNotEqual = [`restore did not finish: ${error instanceof StopError ? error.message : error?.name ?? "error"}`];
  }
  if (ctx.restoreOk) dropRestoreFile(ctx);
  else if (ctx.restoreFile) {
    console.log(`  Restore NOT verified. Fix by hand on the CR screen, or rerun:\n    NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-unmapped-fields.mjs --write --restore ${ctx.restoreFile}`);
  }
}

function printVerdict(ctx) {
  const restore = !ctx.putSent
    ? "not needed (no PUT sent)"
    : ctx.restoreOk
      ? "yes"
      : `no (${ctx.restoreNotEqual.join(", ") || "not verified"})`;
  console.log(`\nF. Verdict, ${ctx.entity} ${ctx.id}${OPTIONS.byHand ? " (probes set by hand)" : ""}`);
  if (ctx.stopped) console.log(`  STOPPED = ${ctx.stopped}`);
  console.log(`  SUBSET_PUT_PRESERVES_UNMAPPED = ${ctx.verdict.unmapped}`);
  console.log(`  MAPPED_KEYS_CHANGED = ${ctx.verdict.mappedChanged}`);
  console.log(`  DATE_FORM_OK = ${ctx.verdict.dateForm}`);
  console.log(`  RESTORE_OK = ${restore}`);
  console.log(`  CR_CALLS = ${callCount - ctx.callsAtStart} (this entity, token request included when made here)`);
}

async function restoreFromFile(file) {
  let saved;
  try {
    saved = JSON.parse(readFileSync(resolve(file), "utf8"));
  } catch {
    throw new StopError("The restore file could not be read as JSON.");
  }
  const entity = saved?.entity;
  if (!hasOwn(TEST_CONTACTS, entity) || String(saved.contactId) !== TEST_CONTACTS[entity]) {
    throw new StopError("The restore file is not for one of the two test contacts.");
  }
  if (!isPlainObject(saved.contact) || String(saved.contact.contactId ?? "") !== TEST_CONTACTS[entity]) {
    throw new StopError("The restore file holds no contact for its test contact ID.");
  }
  const ctx = newContext(entity);
  ctx.baseline = saved.contact;
  ctx.restoreFile = resolve(file);
  ctx.putSent = true;
  ctx.verdict.unmapped = "not tested (restore only)";
  console.log(`\n==== restore only: ${entity} ${ctx.id} ====`);
  await restoreEntity(ctx);
  printVerdict(ctx);
  return ctx;
}

async function main() {
  SETTINGS = loadSettings();
  const mode = OPTIONS.restoreFile ? "restore only" : OPTIONS.write ? `WRITE${OPTIONS.byHand ? ", probes set by hand" : ""}` : "dry run (GETs only)";
  console.log(`N1 / V36 check on CentralReach test records. Mode: ${mode}.`);
  if (OPTIONS.restoreFile) {
    const ctx = await restoreFromFile(OPTIONS.restoreFile);
    console.log(`\nTotal CentralReach calls: ${callCount} (token request included).`);
    process.exitCode = ctx.restoreOk ? 0 : 2;
    return;
  }
  const entities = OPTIONS.entity === "both" ? ["employee", "client"] : [OPTIONS.entity];
  let exitCode = 0;
  for (const entity of entities) {
    const ctx = await runEntity(entity);
    printVerdict(ctx);
    if (ctx.putSent && !ctx.restoreOk) {
      exitCode = 2;
      console.log("\nStopped: a restore was not verified, so no further entity is touched.");
      break;
    }
    if (ctx.stopped) exitCode = Math.max(exitCode, 1);
  }
  console.log(`\nTotal CentralReach calls: ${callCount} (token request included).`);
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(`Stopped: ${error instanceof StopError ? error.message : error?.name ?? "error"}`);
  console.error(`CentralReach calls made: ${callCount}.`);
  process.exit(1);
});
