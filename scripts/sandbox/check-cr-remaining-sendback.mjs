// Live CentralReach checks of the send-back points still untested after L1 to L3 (2026-11-24).
// Zeke 2026-11-24: "use the central reach api to update and test where necessary to test each of
// these please use 5384589" and "Live calls from test records are ok."
//
//   Point 1 (client 5384589): a filled diagnosis code, additional contact and secondary payor.
//            The client PUT documents them as singular fields (ClientDiagnosisCode string,
//            AdditionalContact ImportAdditionalContact, SecondaryPayor ImportPayor); there is no
//            other endpoint for diagnoses or additional contacts.
//   Point 2 (employee 5338681): a filled pay type and pay code (PUT fields PayTypes / PayCodes).
//            The names are taken, in memory only and never printed, from one production employee
//            that holds them (at most 5 shape-only GETs); no name is invented.
//   Point 3 (client 5384589): Latitude / Longitude, documented as PUT strings, read as numbers.
//   Point 4 (SSN) is not tested: no SSN or SSN-like value is written, read out or printed.
//
// Sequence per record (--write): baseline GET; set-up PUT (the build's full-echo body plus the test
// values); GET to confirm (up to 3 reads, 20 s apart); the build's full-echo PUT; GET twice 20 s
// apart and compare every key; the subset PUT (list/object keys left out); GET twice and compare;
// restore every non-list key to the baseline (the added list entries stay as the new resting
// state, Zeke accepts resting test data); verify.
//
// SAFETY
// - PUT only to employee 5338681 and client 5384589, only with --write (hard-coded allow-list, no
//   override). GETs: the two test records, the test client's payor list, and at most 5 production
//   employees from a fixed list (point 2 lookup). No POST other than the token. No labels,
//   metadata, HubSpot or Azure.
// - Output: key names, types, lengths, list lengths, element key names, equal / CHANGED, and yes/no
//   matches against this script's own test values. Never a production value, never an ssn value.
// - A restore file (mode 600, OS temp folder) holds only the test record's own baseline and is
//   deleted once the restore is verified.
//
// Usage (repo root; local.settings.json Values must hold the five CR_ settings):
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-remaining-sendback.mjs                     (dry run, GETs)
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-remaining-sendback.mjs --write --entity client
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-remaining-sendback.mjs --write --entity employee
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

// ---- Records and test values ----
const TEST_CONTACTS = Object.freeze({ employee: "5338681", client: "5384589" });
// Point 2 lookup: production employees of the 2026-11-24 survey run 2 (one of them held pay types
// and pay codes). Read in this order, at most PAY_LOOKUP_MAX, shapes only.
const PAY_LOOKUP_IDS = Object.freeze(["4366334", "4351884", "4351881", "4351880", "4351879"]);
const PAY_LOOKUP_MAX = 5;
const TEST_DIAGNOSIS = "F84.0";
const TEST_ADDITIONAL_CONTACT = Object.freeze({ type: "Other", firstName: "Test", lastName: "Contact", phone: "5555550100" });
const TEST_SECONDARY_SUBSCRIBER_ID = "TEST000002";
const TEST_LATITUDE = "40.123456";
const TEST_LONGITUDE = "-75.654321";
const TEST_PAY_START = "2026-01-01T00:00:00.000Z";
const TEST_PAY_RATE = 1;
const MAX_CALLS = 30;
const LAG_WAIT_MS = 20000;
const CONFIRM_READS = 3;
const REQUEST_TIMEOUT_MS = 15000;
const SENSITIVE_KEY = /ssn|social|taxid/i;
const VOLATILE_KEY = /modified|updated|cached|timestamp|lastsync/i;
const GEO_KEYS = ["latitude", "longitude"];

class StopError extends Error {}
const stop = (message) => {
  throw new StopError(message);
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const putKeyOf = (entity, readKey) => (entity === "client" ? clientPutKey(readKey) : readKey);
const yes = (flag) => (flag ? "yes" : "NO");

// ---- Arguments ----
function parseArgs(argv) {
  const options = { entity: null, write: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--entity") options.entity = argv[(i += 1)];
    else if (arg === "--write") options.write = true;
    else return { error: `Unknown argument: ${arg}` };
  }
  if (options.write && !["employee", "client"].includes(options.entity)) return { error: "--write needs --entity employee or client." };
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
let lookupReads = 0;
const contactPath = (entity, id) => `/contacts/${entity}/${id}`;
const WRITABLE_PATHS = new Set(Object.entries(TEST_CONTACTS).map(([entity, id]) => contactPath(entity, id)));
const TEST_PAYORS_PATH = `/contacts/clients/${TEST_CONTACTS.client}/payors`;
const LOOKUP_PATHS = new Set(PAY_LOOKUP_IDS.map((id) => contactPath("employee", id)));

function isAllowed(method, path) {
  if (method === "GET") return WRITABLE_PATHS.has(path) || path === TEST_PAYORS_PATH || LOOKUP_PATHS.has(path);
  return method === "PUT" && OPTIONS.write && WRITABLE_PATHS.has(path) && path === contactPath(OPTIONS.entity, TEST_CONTACTS[OPTIONS.entity]);
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
  console.log(`    refused: fields [${fields.join(", ")}] codes [${codes.join(", ")}]`);
}

async function crFetch(method, path, body) {
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
    `${method} ${path}`
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
function shapeOf(value) {
  if (Array.isArray(value)) return `[${[...new Set(value.map(shapeOf))].join("|")}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).sort().map((key) => `${key}:${shapeOf(value[key])}`).join(",")}}`;
  return typeOf(value);
}
function describe(value, key = "") {
  if (value === undefined) return "absent";
  if (SENSITIVE_KEY.test(key)) return isBlank(value) ? "blank" : "FILLED (not shown)";
  if (value === null) return "null";
  if (typeof value === "string") return /date/i.test(key) && value ? `text(${value.length}) mask ${value.replace(/\d/g, "9")}` : `text(${value.length})`;
  if (Array.isArray(value)) return `list(${value.length}${value.length ? `: ${[...new Set(value.map(shapeOf))].join(" | ")}` : ""})`;
  if (typeof value === "object") return `object${shapeOf(value)}`;
  return typeof value;
}
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isPlainObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
const keyList = (body) => Object.keys(body).map((key) => `${key}:${describe(body[key], key)}`).join(", ");
const containerKeys = (contact) => Object.keys(contact).filter((key) => Array.isArray(contact[key]) || isPlainObject(contact[key]));
const filledContainers = (contact) => containerKeys(contact).filter((key) => !isBlank(contact[key]));

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
    return { key, value, shape, detail: `${describe(was, key)} -> ${describe(now, key)}`, volatile: VOLATILE_KEY.test(key), was, now };
  });
}
const differing = (rows) => rows.filter((row) => row.value !== "equal" && !row.volatile);

// For a list that changed, which element sub-keys differ (names only).
function listDiff(was, now) {
  if (!Array.isArray(was) || !Array.isArray(now)) return "";
  const parts = [`length ${was.length} -> ${now.length}`];
  for (let i = 0; i < Math.min(was.length, now.length); i += 1) {
    if (isPlainObject(was[i]) && isPlainObject(now[i])) {
      const keys = [...new Set([...Object.keys(was[i]), ...Object.keys(now[i])])];
      const changed = keys.filter((k) => stableJson(was[i][k]) !== stableJson(now[i][k]));
      parts.push(`[${i}] ${changed.length ? `differs in ${changed.join(",")}` : "equal"}`);
    } else parts.push(`[${i}] ${stableJson(was[i]) === stableJson(now[i]) ? "equal" : "differs"}`);
  }
  return ` (${parts.join("; ")})`;
}

function printRows(title, rows) {
  console.log(`\n  ${title}`);
  for (const row of rows) {
    const extra = row.value !== "equal" ? listDiff(row.was, row.now) : "";
    console.log(`    ${row.key} | shape ${row.shape} | value ${row.value} | ${row.detail}${extra}`);
  }
  const diff = differing(rows);
  console.log(`    => ${rows.length} keys, ${rows.length - diff.length} equal, ${diff.length} not equal${diff.length ? `: ${diff.map((r) => `${r.key} ${r.value}`).join(", ")}` : ""}`);
}

// ---- Reads ----
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
  if (Object.keys(contact).some((key) => SENSITIVE_KEY.test(key) && !isBlank(contact[key])) || unsendableSsnKey(contact)) {
    stop("An ssn-like key is filled on the test record: no PUT is sent (not printed).");
  }
  if (ctx) ctx.lastRead = contact;
  return contact;
}

async function readPayors() {
  const res = await crFetch("GET", TEST_PAYORS_PATH);
  const list = Array.isArray(res.data?.payors) ? res.data.payors : null;
  if (!list) {
    console.log("    payor sub-resource: no payors list in the answer");
    return null;
  }
  const byType = new Map();
  list.forEach((p) => {
    const k = `payorType ${typeof p?.payorType === "string" && /^[A-Za-z ]{1,20}$/.test(p.payorType) ? p.payorType : typeOf(p?.payorType)}, isDeleted ${p?.isDeleted}`;
    byType.set(k, (byType.get(k) ?? 0) + 1);
  });
  console.log(`    payor sub-resource: ${list.length} payor(s): ${[...byType].map(([k, n]) => `${n} x (${k})`).join("; ") || "none"}`);
  return list.length;
}

function printRecord(entity, contact) {
  const keys = Object.keys(contact).sort();
  console.log(`\n  Test ${entity} ${TEST_CONTACTS[entity]}: ${keys.length} keys`);
  for (const key of keys) console.log(`    ${key} | ${describe(contact[key], key)}`);
  console.log(`  Filled list/object keys: ${filledContainers(contact).join(", ") || "none"}; latitude/longitude: ${GEO_KEYS.map((k) => `${k} ${describe(contact[k], k)}`).join(", ")}`);
}

// ---- Bodies (the build's own functions, as in check-cr-l1-l3.mjs) ----
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

// Secondary payor: the primary payor entry as read (same insurance company, plan and subscriber),
// with this script's test subscriber ID. Held in memory only.
function secondaryPayorFrom(primary) {
  const entry = { ...primary, subscriberId: TEST_SECONDARY_SUBSCRIBER_ID };
  for (const [key, value] of Object.entries(entry)) if (value === null) delete entry[key];
  return entry;
}

// ---- Point 2 lookup: pay type / pay code names of one production employee (in memory only) ----
async function lookupPayNames() {
  for (const id of PAY_LOOKUP_IDS) {
    if (lookupReads >= PAY_LOOKUP_MAX) break;
    lookupReads += 1;
    const res = await crFetch("GET", contactPath("employee", id));
    const contact = res.data?.contact;
    if (!res.ok || !isPlainObject(contact) || String(contact.contactId ?? "") !== id) continue;
    const types = Array.isArray(contact.payTypes) ? contact.payTypes : [];
    const codes = Array.isArray(contact.payCodes) ? contact.payCodes : [];
    console.log(`    lookup ${id}: payTypes ${describe(types)}, payCodes ${describe(codes)}`);
    const typeName = types.find((t) => typeof t?.name === "string" && t.name.trim())?.name;
    const codeName = codes.find((c) => typeof c?.name === "string" && c.name.trim())?.name;
    if (typeName && codeName) {
      console.log(`    pay names taken from ${id} (in memory only): pay type name text(${typeName.length}), pay code name text(${codeName.length})`);
      return { typeName, codeName, from: id };
    }
  }
  return null;
}

// ---- Restore file ----
function writeRestoreFile(ctx) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(tmpdir(), `cr-remaining-restore-${ctx.entity}-${ctx.id}-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ script: "check-cr-remaining-sendback", entity: ctx.entity, contactId: ctx.id, savedAt: new Date().toISOString(), contact: ctx.baseline }), { mode: 0o600, flag: "wx" });
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

// ---- Write steps ----
async function putTest(ctx, body, label) {
  if (Object.keys(body).some((key) => SENSITIVE_KEY.test(key) && !isBlank(body[key]))) stop("A filled ssn-like key would be sent: no PUT.");
  console.log(`  PUT body (${label}), ${Object.keys(body).length} keys: ${keyList(body)}`);
  ctx.putSent = true;
  ctx.lastRead = null;
  const res = await crFetch("PUT", contactPath(ctx.entity, ctx.id), body);
  ctx.puts.push(`${label}: HTTP ${res.status ?? "none"}`);
  return res;
}

// Read until `done(contact)` holds, up to CONFIRM_READS reads, LAG_WAIT_MS apart. After a refused
// PUT (putOk false) one read is enough: nothing was written.
async function readUntil(ctx, done, putOk = true) {
  let contact = await readTest(ctx.entity, ctx);
  for (let i = 2; putOk && i <= CONFIRM_READS && !done(contact); i += 1) {
    console.log(`  not there yet; GET again in ${LAG_WAIT_MS / 1000} s (read ${i} of ${CONFIRM_READS})`);
    await sleep(LAG_WAIT_MS);
    contact = await readTest(ctx.entity, ctx);
  }
  return contact;
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

function verdictOf(res, rows) {
  if (!res.ok) return `FAIL (PUT answered ${res.status ?? "nothing"})`;
  const diff = differing(rows);
  return diff.length ? `FAIL (${diff.map((r) => `${r.key} ${r.value}`).join(", ")})` : "PASS (every key equal by shape and value)";
}

// Point 1 + 3 set-up checks on the client read (yes/no against this script's own test values).
function clientSetupChecks(contact, primary) {
  const dx = Array.isArray(contact.clientDiagnosisCodes) ? contact.clientDiagnosisCodes : [];
  const ac = Array.isArray(contact.additionalContacts) ? contact.additionalContacts : [];
  const sp = Array.isArray(contact.secondaryPayors) ? contact.secondaryPayors : [];
  const acMatch = ac.find((c) => c?.firstName === "Test" && c?.lastName === "Contact");
  const spMatch = sp.find((p) => p?.subscriberId === TEST_SECONDARY_SUBSCRIBER_ID);
  const out = {
    diagnosis: dx.includes(TEST_DIAGNOSIS),
    additionalContact: Boolean(acMatch),
    secondaryPayor: Boolean(spMatch)
  };
  console.log(`    clientDiagnosisCodes ${describe(dx)}; holds the test code: ${yes(out.diagnosis)}`);
  console.log(`    additionalContacts ${describe(ac)}; holds Test Contact: ${yes(out.additionalContact)}${acMatch ? `; type ${acMatch.type === "Other" ? "Other" : describe(acMatch.type)}, phone equal to test value: ${yes(acMatch.phone === TEST_ADDITIONAL_CONTACT.phone || acMatch.cell === TEST_ADDITIONAL_CONTACT.phone)}, email ${describe(acMatch.email)}` : ""}`);
  console.log(`    secondaryPayors ${describe(sp)}; holds subscriber ID TEST000002: ${yes(out.secondaryPayor)}`);
  if (spMatch && primary) {
    const keys = [...new Set([...Object.keys(primary), ...Object.keys(spMatch)])].filter((k) => k !== "subscriberId").sort();
    const diff = keys.filter((k) => stableJson(primary[k]) !== stableJson(spMatch[k]));
    console.log(`    secondary vs primary entry, keys other than subscriberId: ${diff.length ? `differ in ${diff.join(", ")}` : "all equal"}`);
  }
  return out;
}

function geoCheck(contact, label) {
  const parts = GEO_KEYS.map((key) => {
    const v = contact[key];
    const sent = Number(key === "latitude" ? TEST_LATITUDE : TEST_LONGITUDE);
    if (v === undefined) return `${key} absent`;
    return `${key} type ${typeOf(v)}, equals the test value as a number: ${yes(Number(v) === sent)}`;
  });
  console.log(`    ${label}: ${parts.join("; ")}`);
  return GEO_KEYS.every((key) => contact[key] !== undefined && Number(contact[key]) === Number(key === "latitude" ? TEST_LATITUDE : TEST_LONGITUDE));
}

// ---- Client run (points 1 and 3) ----
async function clientRun(ctx) {
  ctx.baseline = await readTest("client", ctx);
  printRecord("client", ctx.baseline);
  await readPayors();
  const primary = Array.isArray(ctx.baseline.primaryPayors) ? ctx.baseline.primaryPayors[0] : null;
  if (GEO_KEYS.some((k) => hasOwn(ctx.baseline, k))) console.log("  NOTE: the baseline already holds latitude/longitude.");
  writeRestoreFile(ctx);

  console.log("\n  A. Set-up PUT (point 1): the build's full-echo body plus ClientDiagnosisCode, AdditionalContact and SecondaryPayor (documented singular PUT fields).");
  const setup = buildEchoBody("client", ctx.baseline);
  setup.ClientDiagnosisCode = TEST_DIAGNOSIS;
  setup.AdditionalContact = { ...TEST_ADDITIONAL_CONTACT };
  if (primary) setup.SecondaryPayor = secondaryPayorFrom(primary);
  else console.log("    No primary payor on the record: no secondary payor is sent (nothing to copy).");
  const setupRes = await putTest(ctx, setup, "set-up lists");
  let afterSetup = await readUntil(ctx, (c) => {
    const ok = clientSetupChecks(c, primary);
    return ok.diagnosis && ok.additionalContact && (ok.secondaryPayor || !primary);
  }, setupRes.ok);
  await readPayors();
  ctx.result.setupLists = `PUT HTTP ${setupRes.status ?? "none"}`;
  ctx.result.setupChecks = clientSetupChecks(afterSetup, primary);
  printRows("Set-up read vs baseline", compareContacts(ctx.baseline, afterSetup));

  console.log("\n  B. Set-up PUT (point 3): the build's full-echo body plus Latitude / Longitude as documented strings.");
  const geoBody = buildEchoBody("client", afterSetup);
  geoBody.Latitude = TEST_LATITUDE;
  geoBody.Longitude = TEST_LONGITUDE;
  const geoRes = await putTest(ctx, geoBody, "set-up latitude/longitude (strings)");
  afterSetup = await readUntil(ctx, (c) => geoCheck(c, "read"), geoRes.ok);
  ctx.result.setupGeo = `PUT HTTP ${geoRes.status ?? "none"}; on read-back: ${GEO_KEYS.map((k) => `${k} ${typeOf(afterSetup[k])}`).join(", ")}`;
  ctx.setupRead = afterSetup;
  return afterSetup;
}

// ---- Employee run (point 2) ----
async function employeeRun(ctx) {
  ctx.baseline = await readTest("employee", ctx);
  printRecord("employee", ctx.baseline);
  console.log(`\n  Point 2 lookup: pay type / pay code names from one production employee (at most ${PAY_LOOKUP_MAX} GETs, shapes only).`);
  const names = await lookupPayNames();
  if (!names) {
    ctx.result.setupPay = `not testable: no production employee of the ${lookupReads} read holds both a pay type and a pay code name (no name is invented)`;
    return null;
  }
  writeRestoreFile(ctx);
  console.log("\n  A. Set-up PUT (point 2): the build's full-echo body with payTypes / payCodes set to one test entry each (name from the lookup, start 2026-01-01, rate 1).");
  const setup = buildEchoBody("employee", ctx.baseline);
  setup.payTypes = [{ name: names.typeName, startDate: TEST_PAY_START }];
  setup.payCodes = [{ name: names.codeName, rate: TEST_PAY_RATE }];
  const setupRes = await putTest(ctx, setup, "set-up pay type and pay code");
  const holds = (c) => {
    const t = Array.isArray(c.payTypes) ? c.payTypes : [];
    const k = Array.isArray(c.payCodes) ? c.payCodes : [];
    return t.some((x) => x?.name === names.typeName) && k.some((x) => x?.name === names.codeName);
  };
  const afterSetup = await readUntil(ctx, holds, setupRes.ok);
  const t = afterSetup.payTypes ?? [];
  const k = afterSetup.payCodes ?? [];
  console.log(`    payTypes ${describe(t)}; holds the test pay type: ${yes(Array.isArray(t) && t.some((x) => x?.name === names.typeName))}; start date ${describe(t?.[0]?.startDate, "startDate")}`);
  console.log(`    payCodes ${describe(k)}; holds the test pay code: ${yes(Array.isArray(k) && k.some((x) => x?.name === names.codeName))}; rate equal to 1: ${yes(k?.[0]?.rate === TEST_PAY_RATE)}`);
  ctx.result.setupPay = `PUT HTTP ${setupRes.status ?? "none"}; held after set-up: ${yes(holds(afterSetup))}`;
  printRows("Set-up read vs baseline", compareContacts(ctx.baseline, afterSetup));
  ctx.setupRead = afterSetup;
  return holds(afterSetup) ? afterSetup : null;
}

// ---- Shared echo, subset and restore ----
async function echoAndSubset(ctx, reference) {
  console.log("\n  C. Full-echo PUT: the build's update body with every mapped key equal to the read.");
  const echo = buildEchoBody(ctx.entity, reference);
  for (const key of [...filledContainers(reference), ...GEO_KEYS.filter((k) => hasOwn(reference, k))]) {
    const putKey = putKeyOf(ctx.entity, key);
    console.log(`    ${key}: body carries ${putKey} = ${describe(echo[putKey], key)}; equal to the read: ${yes(stableJson(echo[putKey]) === stableJson(reference[key]))}`);
  }
  const echoRes = await putTest(ctx, echo, "full echo");
  const full = await readTwice(ctx, `Full-echo PUT (HTTP ${echoRes.status ?? "none"}) vs the set-up read, read twice ${LAG_WAIT_MS / 1000} s apart`, reference);
  ctx.result.fullEcho = verdictOf(echoRes, full.rows);
  if (ctx.entity === "client") geoCheck(full.second, "after full echo");

  console.log("\n  D. Subset PUT: the same body with every list/object key left out.");
  const subset = buildEchoBody(ctx.entity, full.second);
  const dropped = containerKeys(full.second).map((key) => putKeyOf(ctx.entity, key));
  dropped.forEach((key) => delete subset[key]);
  console.log(`    left out: ${dropped.join(", ")}`);
  const subRes = await putTest(ctx, subset, "lists left out");
  const sub = await readTwice(ctx, `Subset PUT (HTTP ${subRes.status ?? "none"}) vs the set-up read, read twice ${LAG_WAIT_MS / 1000} s apart`, reference);
  ctx.result.subset = verdictOf(subRes, sub.rows);
}

// Target resting state: the baseline, with the list keys as the set-up read holds them (the added
// test entries stay). latitude/longitude go back to the baseline (absent).
function restingTarget(ctx) {
  const target = { ...ctx.baseline };
  if (ctx.setupRead) for (const key of containerKeys(ctx.setupRead)) target[key] = ctx.setupRead[key];
  return target;
}

async function restore(ctx) {
  console.log(`\n  E. Restore test ${ctx.entity} ${ctx.id}: non-list keys to the baseline; added list entries stay.`);
  const target = restingTarget(ctx);
  const done = (c) => !differing(compareContacts(target, c)).length;
  try {
    let current = ctx.lastRead ?? (await readTest(ctx.entity, ctx));
    const attempts = ctx.entity === "client" ? [null, ""] : [null];
    for (const clearWith of attempts) {
      if (done(current)) break;
      const body = buildEchoBody(ctx.entity, target);
      for (const key of GEO_KEYS) if (!hasOwn(target, key) && hasOwn(current, key)) body[putKeyOf(ctx.entity, key)] = clearWith;
      const res = await putTest(ctx, body, `restore (latitude/longitude sent as ${clearWith === null ? "null" : '""'} where the baseline has none)`);
      if (!res.ok && clearWith === null) {
        current = await readTest(ctx.entity, ctx);
        continue;
      }
      current = await readUntil(ctx, done);
    }
    const rows = compareContacts(target, current);
    printRows("Final state vs the resting target (baseline + added list entries)", rows);
    printRows("Final state vs the starting baseline", compareContacts(ctx.baseline, current));
    ctx.restoreNotEqual = differing(rows).map((row) => `${row.key} ${row.value}`);
    ctx.restoreOk = ctx.restoreNotEqual.length === 0;
  } catch (error) {
    ctx.restoreOk = false;
    ctx.restoreNotEqual = [`restore did not finish: ${error instanceof StopError ? error.message : error?.name ?? "error"}`];
  }
  if (ctx.restoreOk) dropRestoreFile(ctx);
  else console.log(`\n  !!!!! RESTORE NOT VERIFIED: ${ctx.restoreNotEqual.join(", ")} !!!!!  Restore file kept: ${ctx.restoreFile}`);
}

async function writeRun(entity) {
  const ctx = { entity, id: TEST_CONTACTS[entity], baseline: null, setupRead: null, lastRead: null, putSent: false, restoreFile: null, restoreOk: null, restoreNotEqual: [], puts: [], result: {}, stopped: null };
  console.log(`\n==== WRITE: test ${entity} ${ctx.id} ====`);
  try {
    const reference = entity === "client" ? await clientRun(ctx) : await employeeRun(ctx);
    if (reference) await echoAndSubset(ctx, reference);
  } catch (error) {
    ctx.stopped = error instanceof StopError ? error.message : `unexpected error (${error?.name ?? "Error"}): ${String(error?.message ?? "").slice(0, 200)}`;
    console.log(`\n  STOPPED: ${ctx.stopped}`);
  } finally {
    if (ctx.putSent) await restore(ctx);
    else dropRestoreFile(ctx);
    if (entity === "client") {
      try {
        await readPayors();
      } catch {
        /* the call cap; reported by the count */
      }
    }
  }
  console.log(`\n  VERDICT ${entity} ${ctx.id}:`);
  if (ctx.stopped) console.log(`    STOPPED = ${ctx.stopped}`);
  for (const [k, v] of Object.entries(ctx.result)) console.log(`    ${k} = ${typeof v === "object" ? JSON.stringify(v) : v}`);
  console.log(`    PUTs = ${ctx.puts.join(" | ") || "none"}`);
  console.log(`    RESTORE_OK = ${!ctx.putSent ? "not needed (no PUT)" : ctx.restoreOk ? "yes" : `NO (${ctx.restoreNotEqual.join(", ")})`}`);
  return ctx;
}

// ---- Dry run ----
async function dryRun() {
  console.log("\n==== DRY RUN (GET only) ====");
  const client = await readTest("client");
  printRecord("client", client);
  await readPayors();
  const primary = Array.isArray(client.primaryPayors) ? client.primaryPayors[0] : null;
  console.log(`  Primary payor entry to copy for the secondary: ${primary ? `yes (${Object.keys(primary).length} keys)` : "NONE"}`);
  // The only diagnosis entry on the test client is the test code this script added: its stored
  // form as a class mask (digits 9, letters A) and whether it contains the test code.
  (Array.isArray(client.clientDiagnosisCodes) ? client.clientDiagnosisCodes : []).forEach((dx, i) => {
    const text = String(dx);
    console.log(`  clientDiagnosisCodes[${i}]: ${typeOf(dx)}, length ${text.length}, mask ${text.replace(/\d/g, "9").replace(/[A-Za-z]/g, "A")}, equals "${TEST_DIAGNOSIS}": ${yes(text === TEST_DIAGNOSIS)}, contains it: ${yes(text.includes(TEST_DIAGNOSIS))}, contains "F84": ${yes(/F84/i.test(text))}`);
  });
  const employee = await readTest("employee");
  printRecord("employee", employee);
  for (const entity of ["client", "employee"]) {
    const contact = entity === "client" ? client : employee;
    const echo = buildEchoBody(entity, contact);
    console.log(`  ${entity}: the build's full-echo body would carry ${Object.keys(echo).length} keys: ${keyList(echo)}`);
  }
}

async function main() {
  SETTINGS = loadSettings();
  console.log(`CR remaining send-back checks. Mode: ${OPTIONS.write ? `WRITE (test ${OPTIONS.entity} only)` : "dry run (GETs only)"}. Call cap ${MAX_CALLS}.`);
  let exitCode = 0;
  if (!OPTIONS.write) await dryRun();
  else {
    const ctx = await writeRun(OPTIONS.entity);
    if (ctx.putSent && !ctx.restoreOk) exitCode = 2;
    else if (ctx.stopped) exitCode = 1;
  }
  console.log(`\nProduction lookup reads this run: ${lookupReads}. Total CentralReach calls this run: ${callCount} (token included).`);
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error(`Stopped: ${error instanceof StopError ? error.message : error?.name ?? "error"}`);
  console.error(`CentralReach calls made: ${callCount}.`);
  process.exit(1);
});
