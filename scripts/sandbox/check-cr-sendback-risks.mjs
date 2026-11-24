// Send-back risks of the field-wipe fix (BR16, row 3.13; fix report section 7, 2026-11-24).
// The fixed update body is the CentralReach read with the mapped keys laid over it
// (src/lib/mappedState.mjs updateBodyFromRead). Three keys could go wrong when sent back as read:
//   (a) ssn: masked on the read? NOT WRITTEN OR PRINTED HERE. A filled ssn stops the run before
//       any PUT; the script prints only "blank" or "filled" for it.
//   (b) a raw date other than dateOfBirth (hireDate) sent back exactly as read.
//   (c) a filled list or nested object (employee languages, payTypes, payCodes; client
//       clientDiagnosisCodes, additionalContacts, primaryPayors, secondaryPayors) sent back as read.
//
// IT WRITES TO PRODUCTION CENTRALREACH (there is no sandbox), on two test records only:
// employee 5338681 and client 5384589 (Zeke 2026-11-24: "Live calls from test records are ok.").
// The IDs are fixed below; no option names another contact. Every request goes through crFetch,
// which allows only the token POST, a GET of those two contacts and, with --write, a PUT of them.
// No label, metadata, HubSpot or Azure call. Output: key names, shapes, date masks (digits shown
// as 9), list element types and HTTP statuses. Never a value, a token or a setting.
//
// Probes (employee only; written only when the key is absent or blank on the baseline read, and
// the shape is documented in the public spec cr-api-list-100826.json, PUT contacts/employee/{id}):
//   hireDate  "date-time" in the spec  -> probe 2020-01-06T00:00:00.000Z
//   Language  "string" in the spec (the read returns it as the list `languages`) -> probe English
// Not written (shape or allowed values unknown, payroll impact, or a write that creates other CR
// records): payTypes, payCodes, and every client list. A list Zeke fills by hand on the CR screen
// before the run is tested the same way (it is compared after the build's PUT).
//
// Steps, per entity:
//   A  GET (baseline). Print every key with its shape, risk class and whether the public PUT spec
//      names it. Dry run (default) stops here.
//   B  (--write, employee) one full-body PUT of the baseline with the probes set; GET until shown.
//   C  The fixed build's update body (its own functions): first the "mapped keys unchanged"
//      case, checked offline (the build sends no PUT); then one mapped key changed (addressLine2
//      set to a marker), sent as the build sends it.
//   D  GET now and after 20 s; compare every key with the step-B read.
//   E  Restore (always after a PUT, also after an error): full body of the baseline, with probe
//      keys the baseline lacked sent as null; GET until every key equals the baseline.
//
// Usage (from the repo root; local.settings.json Values must hold the five CR_ settings):
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs                 (dry run)
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs --write
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs --write --restore <file>
// Options: --entity employee|client|both (default both).
// Exit code: 0 done; 1 stopped before the end; 2 a restore was not verified.
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
  mappedKeysMatchRead,
  normalizeBlank,
  unusableHeldClientCoreField,
  unusableHeldEmployeeDateOfBirth,
  updateBodyFromRead
} from "../../src/lib/mappedState.mjs";

// ---- The only records this script touches ----
const TEST_CONTACTS = Object.freeze({ employee: "5338681", client: "5384589" });
const ENTITY_WORD = Object.freeze({ employee: /employee/i, client: /client/i });

// Body parameter names of PUT contacts/employee/{ContactId} and PUT contacts/client/{ContactId}
// in the public spec (https://centralreach.com/wp-content//uploads/2024/03/cr-api-list-100826.json),
// lower-cased. A read key not in this list is not a documented PUT field.
const PUT_SPEC_KEYS = Object.freeze({
  employee: new Set(
    "isactive externalsystemid hiredate terminationdate title firstname middleinitial lastname chosenname primaryemail addressline1 addressline2 city stateprovince zippostalcode latitude longitude phonehome phonecell dateofbirth language gender credentials ssn npinumber medicaidid g2number bhpnid jobtitle payrollcompany department payrollemployeenumber company employeetype paytypes paycodes providerdrivetimehourlyrate providermileagerate primaryofficelocation".split(" ")
  ),
  client: new Set(
    "isactive externalsystemid title firstname middleinitial lastname chosenname primaryemail addressline1 addressline2 city stateprovince zippostalcode latitude longitude phonehome phonecell dateofbirth gender guardianfirstname guardianlastname guarantorfirstname guarantorlastname clientdiagnosiscode ucinumber bhpnid additionalcontact primarypayor secondarypayor".split(" ")
  )
});

const PROBES = Object.freeze({
  employee: [
    { readKey: "hireDate", putKey: "hireDate", value: "2020-01-06T00:00:00.000Z", risk: "b" },
    { readKey: "languages", putKey: "Language", value: "English", risk: "c" }
  ],
  client: []
});
const CHANGED_MAPPED_KEY = Object.freeze({ employee: "addressLine2", client: "AddressLine2" });
const CHANGED_MARKER = "AzT S7 probe";

const LAG_RETRIES = 2;
const LAG_WAIT_MS = 20000;
const REQUEST_TIMEOUT_MS = 15000;
const SENSITIVE_KEY = /ssn|social|taxid/i;
const VOLATILE_KEY = /modified|updated|cached|timestamp|lastsync/i;

class StopError extends Error {}
const stop = (message) => {
  throw new StopError(message);
};
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const putKeyOf = (entity, readKey) => (entity === "client" ? clientPutKey(readKey) : readKey);

// ---- Arguments ----
const USAGE = [
  "Usage (from the repo root):",
  "  NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs [--entity employee|client|both]",
  "  NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs [--entity ...] --write",
  "  NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs --write --restore <file>"
].join("\n");

function parseArgs(argv) {
  const options = { entity: "both", write: false, restoreFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--entity") options.entity = argv[(i += 1)];
    else if (arg === "--restore") options.restoreFile = argv[(i += 1)];
    else if (arg === "--write") options.write = true;
    else return { error: `Unknown argument: ${arg}` };
  }
  if (!["employee", "client", "both"].includes(options.entity)) return { error: "--entity is employee, client or both." };
  if (options.restoreFile !== null && (!options.restoreFile || !options.write)) {
    return { error: "--restore needs a file path and --write." };
  }
  return { options };
}

const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  console.error(`${parsed.error}\n${USAGE}`);
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

// ---- HTTP: one door, every call counted (fetch, not axios: axios ignores NODE_USE_ENV_PROXY) ----
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
  if (fields.length || codes.length) console.log(`    refused: fields [${fields.join(", ")}] codes [${codes.join(", ")}]`);
}

async function crFetch(method, path, body) {
  const allowed = ALLOWED_PATHS.has(path) && (method === "GET" || (method === "PUT" && OPTIONS.write));
  if (!allowed) throw new Error(`Refused ${method} ${path}: only GET, and with --write PUT, of the two test contacts.`);
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
function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function elementKind(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "list";
  if (typeof value === "object") return `object{${Object.keys(value).sort().join(",")}}`;
  return typeof value;
}

// Dates show as a digit mask (9 = digit); ssn shows as blank/filled only.
function describe(value, key = "") {
  if (value === undefined) return "absent";
  if (SENSITIVE_KEY.test(key)) return isBlank(value) ? "blank" : "FILLED (not shown)";
  if (value === null) return "null";
  if (typeof value === "string") {
    if (/date/i.test(key) && value) return `text(${value.length}) mask ${value.replace(/\d/g, "9")}`;
    return `text(${value.length})`;
  }
  if (Array.isArray(value)) {
    const kinds = [...new Set(value.map(elementKind))];
    return `list(${value.length}${kinds.length ? `: ${kinds.join(" | ")}` : ""})`;
  }
  if (typeof value === "object") return `object(${Object.keys(value).length} keys)`;
  return typeof value;
}

function riskOf(key, value) {
  if (SENSITIVE_KEY.test(key)) return "a ssn";
  if (/date/i.test(key) && key !== "dateOfBirth") return "b date";
  if (Array.isArray(value) || isPlainObject(value)) return "c list/object";
  return "";
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

function compareContacts(before, after) {
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
    return { key, result, detail: `${describe(was, key)} -> ${describe(now, key)}`, volatile: VOLATILE_KEY.test(key) };
  });
}

const differing = (rows) => rows.filter((row) => row.result !== "equal" && !row.volatile);

function printRows(title, rows, { onlyDiffs = false } = {}) {
  const shown = onlyDiffs ? rows.filter((row) => row.result !== "equal") : rows;
  console.log(`\n  ${title}`);
  if (!shown.length) {
    console.log("    (every key equal)");
    return;
  }
  const width = Math.max(4, ...shown.map((row) => row.key.length));
  for (const row of shown) {
    console.log(`    ${row.key.padEnd(width)} | ${row.result.padEnd(7)} | ${row.detail}`);
  }
}

const keyList = (body) => Object.keys(body).map((key) => `${key}:${describe(body[key], key)}`).join(", ");

// ---- Bodies ----
// The fixed build's mapped body from a read, with the HubSpot values equal to the read (date of
// birth blank in HubSpot, so the held date is rebuilt), as check-cr-unmapped-fields.mjs does.
// `change` sets one mapped key to the marker. Returns { mapped, putKeyOf, readKeyOf } or { failed }.
function buildMapped(entity, contact, change) {
  if (entity === "employee") {
    const mapped = Object.fromEntries(
      EMPLOYEE_CORE_FIELDS.map((field) => [field, field === "dateOfBirth" ? null : contact[field] ?? null])
    );
    if (change) mapped[CHANGED_MAPPED_KEY.employee] = CHANGED_MARKER;
    if (unusableHeldEmployeeDateOfBirth(mapped, contact)) return { failed: "the held dateOfBirth is not usable (CR_EMPLOYEE_READ_FAILED)" };
    const preserved = buildEmployeePayloadForContactId(mapped, { contact });
    const body = keepUnwrittenCoreFields(preserved.payload, {}, contact);
    if (!preserved.crExternalSystemId) delete body.externalSystemId;
    return { mapped: body };
  }
  const missing = CLIENT_CORE_FIELDS.find((field) => !hasOwn(contact, clientCoreReadKey(field)));
  if (missing) return { failed: `contact.${clientCoreReadKey(missing)} is absent (CR_CLIENT_READ_FAILED)` };
  const payload = {
    ExternalSystemId: String(contact.externalSystemId ?? ""),
    FirstName: normalizeBlank(contact.firstName),
    LastName: normalizeBlank(contact.lastName),
    ...Object.fromEntries(CLIENT_CORE_FIELDS.map((field) => [field, null]))
  };
  if (payload.ExternalSystemId.trim() === "") delete payload.ExternalSystemId;
  if (change) payload[CHANGED_MAPPED_KEY.client] = CHANGED_MARKER;
  const unusable = unusableHeldClientCoreField(payload, contact);
  if (unusable) return { failed: `contact.${unusable} is not usable (CR_CLIENT_READ_FAILED)` };
  return { mapped: keepHeldClientCoreFields(payload, contact) };
}

// What the fixed build does: no PUT when the mapped keys match the read; else the read with the
// mapped keys laid over it.
function fixedBuildUpdate(entity, contact, change) {
  const built = buildMapped(entity, contact, change);
  if (built.failed) return built;
  const readKeyOf = entity === "client" ? clientCoreReadKey : (key) => key;
  if (mappedKeysMatchRead(built.mapped, contact, readKeyOf)) return { skip: true };
  const putKey = entity === "client" ? clientPutKey : (key) => key;
  return { body: updateBodyFromRead(built.mapped, contact, putKey) };
}

// Set-up and restore: every key as read; dateOfBirth in the form proven on a PUT (employee
// YYYY-MM-DD, client YYYY-MM-DDT00:00:00.000Z).
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

// ---- One contact ----
function checkKind(entity, contact) {
  const id = TEST_CONTACTS[entity];
  if (String(contact.contactId ?? "") !== id) stop(`The ${entity} read does not show contact ${id}.`);
  const other = entity === "employee" ? "client" : "employee";
  if (typeof contact.type === "string" && (!ENTITY_WORD[entity].test(contact.type) || ENTITY_WORD[other].test(contact.type))) {
    stop(`contact.type does not name a ${entity}: stopped before any PUT.`);
  }
}

async function readContact(ctx) {
  const res = await crFetch("GET", contactPath(ctx.entity));
  if (!res.ok) stop(`GET ${contactPath(ctx.entity)} answered ${res.status ?? "nothing"}.`);
  const contact = res.data?.contact;
  if (!isPlainObject(contact)) stop("The read has no contact object.");
  checkKind(ctx.entity, contact);
  ctx.lastRead = contact;
  return contact;
}

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
  ctx.putSent = true;
  ctx.lastRead = null;
  return crFetch("PUT", contactPath(ctx.entity), body);
}

function planProbes(entity, contact) {
  return PROBES[entity].filter((probe) => isBlank(contact[probe.readKey]));
}

function filledRiskKeys(contact) {
  return Object.keys(contact).filter((key) => {
    const risk = riskOf(key, contact[key]);
    return risk && !risk.startsWith("a") && !isBlank(contact[key]);
  });
}

function newContext(entity) {
  return {
    entity,
    id: TEST_CONTACTS[entity],
    baseline: null,
    lastRead: null,
    putSent: false,
    probes: [],
    restoreFile: null,
    restoreOk: null,
    restoreNotEqual: [],
    stopped: null,
    callsAtStart: callCount,
    verdict: { b: "not tested", c: "not tested", unchangedSkip: "not checked", other: "-" }
  };
}

function writeRestoreFile(ctx) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(tmpdir(), `cr-s7-restore-${ctx.entity}-${ctx.id}-${stamp}.json`);
  const content = {
    script: "check-cr-sendback-risks",
    entity: ctx.entity,
    contactId: ctx.id,
    savedAt: new Date().toISOString(),
    probeClears: ctx.probes.map((probe) => probe.putKey),
    contact: ctx.baseline
  };
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

function printBaseline(ctx) {
  const { entity, baseline } = ctx;
  const keys = Object.keys(baseline).sort();
  const width = Math.max(4, ...keys.map((key) => key.length));
  console.log(`\n  Keys of contact (${keys.length}): shape | risk | named in the public PUT spec | fixed build sends`);
  for (const key of keys) {
    const inSpec = PUT_SPEC_KEYS[entity].has(putKeyOf(entity, key).toLowerCase()) ? "yes" : "NO";
    const lower = key.toLowerCase();
    const sends =
      lower === "dateofbirth" ? "mapped rule (rebuilt date)" : lower === "contactform" ? "never" : "as read (or mapped value)";
    console.log(`    ${key.padEnd(width)} | ${describe(baseline[key], key)} | ${riskOf(key, baseline[key]) || "-"} | ${inSpec} | ${sends}`);
  }
  const specOnly = [...PUT_SPEC_KEYS[entity]].filter(
    (name) => !keys.some((key) => putKeyOf(entity, key).toLowerCase() === name)
  );
  console.log(`  PUT spec fields the read did not return (null in CR, or not readable): ${specOnly.join(", ")}`);
}

async function runEntity(entity) {
  const ctx = newContext(entity);
  console.log(`\n==== ${entity} ${ctx.id} ====`);
  try {
    console.log("\nA. Read (baseline).");
    ctx.baseline = await readContact(ctx);
    printBaseline(ctx);

    const blockers = [];
    const sensitive = Object.keys(ctx.baseline).filter((key) => SENSITIVE_KEY.test(key) && !isBlank(ctx.baseline[key]));
    if (sensitive.length) blockers.push(`${sensitive.join(", ")} is filled: no PUT on this record (risk a is not tested by writing)`);
    const unchanged = fixedBuildUpdate(entity, ctx.baseline, false);
    const changed = fixedBuildUpdate(entity, ctx.baseline, true);
    if (unchanged.failed || changed.failed) blockers.push(`the build's failed-read case: ${unchanged.failed || changed.failed}`);
    ctx.verdict.unchangedSkip = unchanged.skip ? "yes (mapped keys equal the read: the build sends no PUT)" : `no (${unchanged.failed || "the build would send a PUT"})`;
    ctx.probes = planProbes(entity, ctx.baseline);
    const filledRisk = filledRiskKeys(ctx.baseline);
    console.log(`\n  Fixed build, mapped keys unchanged: ${ctx.verdict.unchangedSkip}.`);
    if (changed.body) console.log(`  Fixed build, ${CHANGED_MAPPED_KEY[entity]} changed: PUT of ${Object.keys(changed.body).length} keys: ${keyList(changed.body)}`);
    console.log(`  Probes to set: ${ctx.probes.map((probe) => `${probe.putKey} (risk ${probe.risk})`).join(", ") || "none"}`);
    console.log(`  Risky keys already filled on the record (tested as they are): ${filledRisk.join(", ") || "none"}`);
    for (const blocker of blockers) console.log(`  BLOCKER: ${blocker}`);
    const testable = ctx.probes.length > 0 || filledRisk.length > 0;
    if (!testable) console.log("  Nothing to test by writing: no probe can be set and no risky key is filled (set one by hand on the CR screen).");

    if (!OPTIONS.write) {
      console.log(`\n  Dry run: no PUT. ${blockers.length ? "Fix the blockers before --write." : testable ? "Ready for --write." : "--write would send nothing."}`);
      return ctx;
    }
    if (blockers.length) stop("Blockers found: no PUT sent.");
    if (!testable) {
      ctx.verdict.b = ctx.verdict.c = "not testable on this record (nothing filled, no documented probe)";
      return ctx;
    }
    writeRestoreFile(ctx);

    // B. Probes.
    let beforeBuild = ctx.baseline;
    if (ctx.probes.length) {
      console.log("\nB. Set the probes with a full-body PUT of the baseline.");
      const body = fullBody(entity, ctx.baseline);
      for (const probe of ctx.probes) body[probe.putKey] = probe.value;
      const res = await putContact(ctx, body, "full body as read, probes set");
      if (!res.ok) stop(`The set-up PUT answered ${res.status ?? "nothing"}.`);
      const shown = (contact) => ctx.probes.every((probe) => !isBlank(contact[probe.readKey]));
      beforeBuild = await readUntil(ctx, shown, "The probes");
      for (const probe of ctx.probes) {
        console.log(`  ${probe.readKey} after set-up: ${describe(beforeBuild[probe.readKey], probe.readKey)}`);
      }
      printRows("Set-up check: keys that differ from the baseline", compareContacts(ctx.baseline, beforeBuild), { onlyDiffs: true });
      const missing = ctx.probes.filter((probe) => isBlank(beforeBuild[probe.readKey])).map((probe) => probe.readKey);
      if (missing.length) {
        console.log(`  Not shown after set-up (the PUT did not store them): ${missing.join(", ")}.`);
        ctx.probes.forEach((probe) => {
          if (missing.includes(probe.readKey)) ctx.verdict[probe.risk] = `not testable (${probe.putKey} sent on a 200 PUT but not stored)`;
        });
      }
    }
    const testedKeys = filledRiskKeys(beforeBuild);
    if (!testedKeys.length) stop("No risky key is filled before the build's PUT: nothing to test.");

    // C. The fixed build's update body, one mapped key changed.
    console.log(`\nC. The fixed build's update PUT (${CHANGED_MAPPED_KEY[entity]} changed), built from the step-B read.`);
    const plan = fixedBuildUpdate(entity, beforeBuild, true);
    if (!plan.body) stop(`The build would send no PUT (${plan.failed || "skip"}).`);
    for (const key of testedKeys) {
      const putKey = putKeyOf(entity, key);
      console.log(`  ${key}: body carries ${putKey} = ${describe(plan.body[putKey], key)}; equal to the read: ${stableJson(plan.body[putKey]) === stableJson(beforeBuild[key]) ? "yes" : "no"}`);
    }
    const buildRes = await putContact(ctx, plan.body, "the fixed build's update body");

    // D. Compare.
    console.log(`\nD. Read now and again after ${LAG_WAIT_MS / 1000} s; compare every key with the step-B read.`);
    const firstRead = await readContact(ctx);
    await sleep(LAG_WAIT_MS);
    const after = await readContact(ctx);
    const lag = differing(compareContacts(firstRead, after));
    if (lag.length) console.log(`  The two reads differ in: ${lag.map((row) => row.key).join(", ")} (read lag); the second read is used.`);
    const rows = compareContacts(beforeBuild, after);
    printRows(`Fixed build PUT result (HTTP ${buildRes.status ?? "nothing"})`, rows);
    const rowOf = (key) => rows.find((row) => row.key === key);
    const verdictFor = (keys) =>
      !buildRes.ok
        ? `FAIL (the build's PUT answered ${buildRes.status ?? "nothing"})`
        : keys.length === 0
          ? null
          : keys.every((key) => rowOf(key)?.result === "equal")
            ? `PASS (${keys.map((key) => `${key} equal`).join(", ")})`
            : `FAIL (${keys.map((key) => `${key} ${rowOf(key)?.result ?? "?"}`).join(", ")})`;
    const dateKeys = testedKeys.filter((key) => riskOf(key, beforeBuild[key]).startsWith("b"));
    const listKeys = testedKeys.filter((key) => riskOf(key, beforeBuild[key]).startsWith("c"));
    ctx.verdict.b = verdictFor(dateKeys) ?? ctx.verdict.b;
    ctx.verdict.c = verdictFor(listKeys) ?? ctx.verdict.c;
    const changedRow = rowOf(clientCoreReadKey(CHANGED_MAPPED_KEY[entity]));
    const others = differing(rows).filter((row) => row !== changedRow && !testedKeys.includes(row.key));
    ctx.verdict.other = `${CHANGED_MAPPED_KEY[entity]} ${changedRow?.result ?? "?"} (expected CHANGED); other keys differing: ${others.map((row) => `${row.key} ${row.result}`).join(", ") || "none"}`;
  } catch (error) {
    ctx.stopped = error instanceof StopError ? error.message : `unexpected error (${error?.name ?? "Error"}): ${String(error?.message ?? "").slice(0, 200)}`;
    console.log(`\n  STOPPED: ${ctx.stopped}`);
  } finally {
    if (ctx.putSent) await restoreEntity(ctx);
    else dropRestoreFile(ctx);
  }
  return ctx;
}

// E. Restore to the baseline: full body, probe keys the baseline lacked sent as null.
async function restoreEntity(ctx) {
  console.log(`\nE. Restore ${ctx.entity} ${ctx.id} to the baseline.`);
  try {
    const current = ctx.lastRead ?? (await readContact(ctx));
    if (!differing(compareContacts(ctx.baseline, current)).length) {
      console.log("  Every key already equals the baseline: no restore PUT.");
    } else {
      const clears = ctx.probeClears ?? ctx.probes.map((probe) => probe.putKey);
      const restored = (contact) => !differing(compareContacts(ctx.baseline, contact)).length;
      // First try: probe keys the baseline lacked sent as null. Live run of 2026-11-24: that
      // clears hireDate but not the language (Language null and languages [] leave it), so a
      // second try sends those keys as "" when the first did not restore.
      for (const clearValue of [null, ""]) {
        const body = fullBody(ctx.entity, ctx.baseline);
        for (const putKey of clears) {
          if (!hasOwn(body, putKey)) body[putKey] = clearValue;
        }
        await putContact(ctx, body, `full body of the baseline, probes sent as ${JSON.stringify(clearValue)}`);
        if (restored(await readUntil(ctx, restored, "The restore")) || !clears.length) break;
      }
    }
    const rows = compareContacts(ctx.baseline, ctx.lastRead);
    printRows("Restore check: keys that differ from the baseline", rows, { onlyDiffs: true });
    ctx.restoreNotEqual = differing(rows).map((row) => `${row.key} ${row.result}`);
    ctx.restoreOk = ctx.restoreNotEqual.length === 0;
  } catch (error) {
    ctx.restoreOk = false;
    ctx.restoreNotEqual = [`restore did not finish: ${error instanceof StopError ? error.message : error?.name ?? "error"}`];
  }
  if (ctx.restoreOk) dropRestoreFile(ctx);
  else {
    console.log("\n  !!!!! RESTORE NOT VERIFIED !!!!!");
    if (ctx.restoreFile) {
      console.log(`  Fix by hand on the CR screen, or rerun:\n    NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs --write --restore ${ctx.restoreFile}`);
    }
  }
}

function printVerdict(ctx) {
  const restore = !ctx.putSent ? "not needed (no PUT sent)" : ctx.restoreOk ? "yes" : `NO (${ctx.restoreNotEqual.join(", ") || "not verified"})`;
  console.log(`\nF. Verdict, ${ctx.entity} ${ctx.id}`);
  if (ctx.stopped) console.log(`  STOPPED = ${ctx.stopped}`);
  console.log(`  UNCHANGED_MAPPED_SENDS_NO_PUT = ${ctx.verdict.unchangedSkip}`);
  console.log(`  RISK_B_DATE_SENT_BACK = ${ctx.verdict.b}`);
  console.log(`  RISK_C_LIST_SENT_BACK = ${ctx.verdict.c}`);
  console.log(`  OTHER_KEYS = ${ctx.verdict.other}`);
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
  ctx.probeClears = Array.isArray(saved.probeClears) ? saved.probeClears.filter((key) => typeof key === "string") : [];
  ctx.restoreFile = resolve(file);
  ctx.putSent = true;
  console.log(`\n==== restore only: ${entity} ${ctx.id} ====`);
  await restoreEntity(ctx);
  printVerdict(ctx);
  return ctx;
}

async function main() {
  SETTINGS = loadSettings();
  const mode = OPTIONS.restoreFile ? "restore only" : OPTIONS.write ? "WRITE" : "dry run (GETs only)";
  console.log(`Send-back risks check on CentralReach test records. Mode: ${mode}.`);
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
