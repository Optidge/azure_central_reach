// R-6 diagnostic: how long a CentralReach label read lags a label change, and whether a cache-bypass
// read sees the change sooner. Plan: docs/workstreams/architecture-update/r6-label-read-lag-options-
// 2026-11-25.md section 5 (steps B, C and D in the two parts Zeke agreed to on 2026-11-25). Fixes from
// r6-label-test-script-review-2026-11-25.md (M1-M5, S1-S9) are applied.
//
//   Part 1 (scripted, step D): read the labels (the original list, and a "prime" read), POST the
//          original list plus School 1052688, then read on a timer three ways: plain (as the
//          integration reads), with no-cache headers (Cache-Control and Pragma), and with a throwaway
//          query value ?_t=<ms>. Then POST the original list back and confirm it by read.
//   Part 2 (two hand edits, steps B and C): a prime read, then Zeke adds Clinic 1052655 on the
//          CentralReach screen and presses Enter; the script reads the same three ways until the label
//          shows or the rounds end. Then Zeke removes it on the screen and presses Enter; the script
//          POSTs the original list anyway (idempotent) and confirms it by read.
//   Two different labels, so a stale answer left from Part 1 can never look like a Part 2 result.
//   The parts are two separate runs at least MIN_GAP_S apart (enforced from the state file).
//
// PRODUCTION. CentralReach has no sandbox: every call here is a production call.
// SAFETY
// - Target: only a contact in ALLOWED_CONTACTS (test employee 5338681), and only after a read shows
//   its contactId and "Azure Test" in its last name.
// - Restore target: the first label read of a part must equal the expected resting list (BUILD-PLAN
//   section 4, 2026-11-20, or --expect-labels) and hold neither test label; otherwise the run stops
//   before any write. A run also refuses to start within MIN_GAP_S of the last label call on the
//   contact (state file), so the first read cannot be a stale answer from an earlier part.
// - Non-GET calls: the token POST, and the label POST on the target contact only, with a body equal
//   to the original list or the original list plus the Part 1 label. Never an empty list. Every
//   other call is refused in the one fetch door. GETs: the target's record, its labels, the catalog.
// - The original list goes to a mode-600 file in the OS temp folder before the first write. On an
//   error, Ctrl-C, the call cap or the time cap, the script POSTs that list back and says whether a
//   read confirmed it. `--restore --run` only restores from that file.
// - Dry run is the default: it prints the planned calls and loads no settings and makes no call.
// - Never printed: a token, a header sent, a settings value, a raw response, any record field but
//   the labels and the yes/no marker check. The record GET returns the whole record, including an
//   `ssn` key (blank on 11/24); the script never inspects, keeps or prints it. Of the answers'
//   headers, only the names of standard cache headers (age, x-cache, cf-cache-status, x-cache-hits,
//   via) and a HIT yes/no.
// - At most MAX_CALLS CentralReach calls (token included; RESTORE_RESERVE of them kept for a restore)
//   and MAX_RUN_MS of run time (a restore may then use RESTORE_GRACE_MS more).
//
// Usage (repo root; local.settings.json Values must hold the five CR_ settings):
//   node scripts/sandbox/test-cr-label-read-lag.mjs --part 1                     (dry run)
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/test-cr-label-read-lag.mjs --part 1 --run
//   (wait at least 5 minutes, no label reads)
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/test-cr-label-read-lag.mjs --part 2 --run
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/test-cr-label-read-lag.mjs --restore --run
// Options: --part 1|2 (default 1), --contact <id> (default 5338681; allow-list only),
//   --expect-labels <id,id,...> (the resting list, only if the CR screen shows a different one).
// Exit code: 0 done, 1 stopped before or without a write to undo, 2 a restore was not confirmed
// (including a restore abandoned with a second Ctrl-C).
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// ---- Test record, labels, limits ----
// Only test employee 5338681 (Zeke, 2026-11-20). It has no HubSpot record, so no integration run
// touches its labels during the test. The plan does not need a client, so 5384589 is not listed.
const ALLOWED_CONTACTS = Object.freeze({ "5338681": "employee" });
const DEFAULT_CONTACT = "5338681";
const TEST_MARKER = "Azure Test";
// The resting labels of 5338681: All Employees, Behavior Technician NY, Clinical, NY Employee. The
// record started and ended the 2026-11-20 label test with exactly these (BUILD-PLAN.md section 4,
// "Checked on 2026-11-20"). --expect-labels replaces them only after a check on the CR screen.
const RESTING_LABELS = Object.freeze({ "5338681": Object.freeze([1052618, 1052630, 1052643, 1132655]) });
// Both exist in CR's catalog, are not mapped, not managed and not sendable by the integration
// (guide L386 / L666: "School (1052688) and Clinic (1052655) exist in CR", no HubSpot option), so a
// stray one changes no integration behaviour. Both sit under "Client Service Location" 1052616 and
// the test record is an employee: Zeke checks on the CR screen first that its label editor offers
// both (run note, step 0). If not, pick an employee-category label in neither the sendable nor the
// managed lists.
const PART1_LABEL = Object.freeze({ id: 1052688, name: "School" });
const PART2_LABEL = Object.freeze({ id: 1052655, name: "Clinic" });
const TEST_LABEL_IDS = Object.freeze([PART1_LABEL.id, PART2_LABEL.id]);
const SNAPSHOT_PATH = "docs/workstreams/architecture-update/cr-catalog-snapshot.json";

const MAX_CALLS = 30;
const RESTORE_RESERVE = 5; // a restore POST and up to 4 check reads
const MAX_RUN_MS = 30 * 60 * 1000;
const RESTORE_GRACE_MS = 8 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;
// Reads after the change: Part 1 after the POST, Part 2 after Enter. The last gap (200 s) is longer
// than the suspected cache lifetime (~120 s), so a cache kept alive by the polling still expires.
const ROUND_OFFSETS_S = [3, 45, 120, 320];
const FIRST_ROUND_LIMIT_S = ROUND_OFFSETS_S[0] + 5; // "shown at once" = shown in the first round
const RESTORE_CHECK_OFFSETS_S = [3, 60, 150]; // with a read kind that already showed the change
const SETTLE_S = 240; // no read kind showed the change: a plain read this long after (lags seen: 122-193 s)
const MIN_GAP_S = 300; // no run starts within this long of the last label call on the contact
const PRIME_MAX_AGE_S = 90; // Part 2: an older prime read may have expired before the hand edit
const ENTER_WAIT_MS = 5 * 60 * 1000;
const ENTER_IGNORE_MS = 1000; // input typed before a prompt (buffered) is ignored for this long

const VARIANTS = Object.freeze(["plain", "header", "query"]);
const VARIANT_TEXT = Object.freeze({
  plain: "plain",
  header: "Cache-Control+Pragma: no-cache",
  query: "query ?_t=<ms>"
});
const CACHE_HEADER_NAMES = ["age", "x-cache", "cf-cache-status", "x-cache-hits", "via"];
const RESTORE_FILE = (contactId) => join(tmpdir(), `cr-label-lag-restore-${contactId}.json`);
const STATE_FILE = (contactId) => join(tmpdir(), `cr-label-lag-state-${contactId}.json`);

class StopError extends Error {}
const stop = (message) => {
  throw new StopError(message);
};

// ---- Arguments ----
function parseIdList(text) {
  const ids = String(text ?? "").split(",").map((part) => Number(part.trim()));
  return ids.length && ids.every((id) => Number.isInteger(id) && id > 0) ? [...new Set(ids)] : null;
}
function parseArgs(argv) {
  const options = { part: "1", run: false, restore: false, contact: DEFAULT_CONTACT, expect: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--part") options.part = String(argv[(i += 1)] ?? "");
    else if (arg === "--run") options.run = true;
    else if (arg === "--dry-run") options.run = false;
    else if (arg === "--restore") options.restore = true;
    else if (arg === "--contact") options.contact = String(argv[(i += 1)] ?? "");
    else if (arg === "--expect-labels") {
      options.expect = parseIdList(argv[(i += 1)]);
      if (!options.expect) return { error: "--expect-labels takes positive label IDs separated by commas." };
    } else return { error: `Unknown argument: ${arg}` };
  }
  if (options.part === "both") return { error: "--part both is retired: run Part 1 and Part 2 as two commands at least 5 minutes apart." };
  if (!["1", "2"].includes(options.part)) return { error: "--part is 1 or 2." };
  if (!Object.hasOwn(ALLOWED_CONTACTS, options.contact)) {
    return { error: `Contact ${options.contact} is not on the test-record allow-list (${Object.keys(ALLOWED_CONTACTS).join(", ")}). Refused.` };
  }
  if (options.expect?.some((id) => TEST_LABEL_IDS.includes(id))) return { error: "--expect-labels may not hold School 1052688 or Clinic 1052655." };
  return { options };
}
const parsed = parseArgs(process.argv.slice(2));
if (parsed.error) {
  console.error(parsed.error);
  process.exit(1);
}
const OPTIONS = parsed.options;
const CONTACT_ID = OPTIONS.contact;
const CONTACT_KIND = ALLOWED_CONTACTS[CONTACT_ID];
const EXPECTED_LABELS = OPTIONS.expect ?? RESTING_LABELS[CONTACT_ID];
const CONTACT_PATH = `/contacts/${CONTACT_KIND}/${CONTACT_ID}`;
const LABELS_PATH = `/contacts/${CONTACT_ID}/labels`;
const CATALOG_PATH = "/contacts/labels";
const QUERY_PATH = new RegExp(`^${LABELS_PATH.replace(/\//g, "\\/")}\\?_t=\\d+$`);

// ---- Label names (offline, from the saved catalog; the live catalog overrides in Part 1) ----
const NAMES = new Map();
try {
  for (const label of JSON.parse(readFileSync(resolve(SNAPSHOT_PATH), "utf8")).labels || []) {
    NAMES.set(Number(label.labelId), String(label.name ?? "").trim());
  }
} catch {
  // Names are a convenience; IDs are printed anyway.
}
const nameOf = (id) => NAMES.get(id) || "?";
const listText = (ids) => (ids && ids.length ? ids.map((id) => `${id} ${nameOf(id)}`).join(", ") : "none");
const sameSet = (a, b) => {
  const right = new Set(b);
  return new Set(a).size === right.size && a.every((id) => right.has(id));
};

// ---- Settings (names only are ever printed) ----
const SETTING_NAMES = ["CR_CLIENT_ID", "CR_CLIENT_SECRET", "CR_API_KEY", "CR_BASE_URL", "CR_TOKEN_URL"];
function loadSettings() {
  let values;
  try {
    values = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"))?.Values || {};
  } catch {
    // The parser's own message can quote the file, so it is not passed on.
    stop("local.settings.json could not be read as JSON (run from the repo root).");
  }
  const missing = SETTING_NAMES.filter((name) => !String(values[name] ?? "").trim());
  if (missing.length) stop(`Missing in local.settings.json Values: ${missing.join(", ")}`);
  return Object.fromEntries(SETTING_NAMES.map((name) => [name, String(values[name]).trim()]));
}

// ---- Run state ----
const T0 = Date.now();
let SETTINGS = null;
let BASE = "";
let token = null;
let callCount = 0;
let networkOn = false; // stays false in a dry run: the fetch door refuses everything
let restoring = false;
let restoreInterruptWarned = false;
let allowedPostSets = []; // the label sets a POST may carry (set once the original list is known)
const runAbort = new AbortController();
const secondsSince = (ms) => ((Date.now() - ms) / 1000).toFixed(1);
const elapsed = () => `t+${secondsSince(T0)}s`;

function sleep(ms, signal) {
  return new Promise((done, fail) => {
    if (signal?.aborted) return fail(signal.reason);
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      done();
    }, Math.max(0, ms));
    const onAbort = () => {
      clearTimeout(timer);
      fail(signal.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
const sleepUntil = (atMs, signal) => sleep(atMs - Date.now(), signal);
const normalLeft = () => MAX_CALLS - RESTORE_RESERVE - callCount;

// ---- State file: when the last label call was made (the gap rule) and Part 1's result ----
// Holds a timestamp and label-lag seconds only. Mode 600. Kept between runs on purpose.
let runState = { lastLabelCallAt: null, p1: null };
function loadState() {
  try {
    const saved = JSON.parse(readFileSync(STATE_FILE(CONTACT_ID), "utf8"));
    if (String(saved?.contactId) !== CONTACT_ID) return false;
    runState = {
      lastLabelCallAt: Number.isFinite(saved.lastLabelCallAt) ? saved.lastLabelCallAt : null,
      p1: saved.p1 && typeof saved.p1 === "object" ? saved.p1 : null
    };
    return true;
  } catch {
    return false;
  }
}
function saveState() {
  try {
    const at = runState.lastLabelCallAt;
    writeFileSync(STATE_FILE(CONTACT_ID), JSON.stringify({ script: "test-cr-label-read-lag", contactId: CONTACT_ID, lastLabelCallAt: at, lastLabelCall: at ? new Date(at).toISOString() : null, p1: runState.p1 }), { mode: 0o600 });
  } catch {
    console.log(`  Could not write the state file ${STATE_FILE(CONTACT_ID)}: the next run cannot check the ${MIN_GAP_S / 60}-minute gap; wait it out by hand.`);
  }
}
function checkGap() {
  const found = loadState();
  if (runState.lastLabelCallAt === null) {
    console.log(`NOTE no state file with a last label call (${STATE_FILE(CONTACT_ID)}): the gap cannot be checked; the first-read check against the resting list still applies. Make sure no label read or edit on ${CONTACT_ID} happened in the last ${MIN_GAP_S / 60} minutes.`);
    return found;
  }
  const agoS = (Date.now() - runState.lastLabelCallAt) / 1000;
  if (agoS < MIN_GAP_S) {
    stop(`The last label call on ${CONTACT_ID} was ${agoS.toFixed(0)} s ago (state file ${STATE_FILE(CONTACT_ID)}); a read within ${MIN_GAP_S} s of it can be stale. Wait ${Math.ceil(MIN_GAP_S - agoS)} s more with no label reads or edits, then rerun. Nothing was sent.`);
  }
  console.log(`PASS gap since the last label call on ${CONTACT_ID}: ${agoS.toFixed(0)} s (at least ${MIN_GAP_S} s)`);
  return found;
}

// ---- The one fetch door ----
function pathOf(url) {
  if (!url.startsWith(BASE)) return null;
  return url.slice(BASE.length);
}

function checkAllowed(method, url, body) {
  if (!networkOn) stop("Refused: dry run (no network).");
  if (method === "POST" && url === SETTINGS.CR_TOKEN_URL) return;
  const path = pathOf(url);
  if (method === "GET" && (path === CONTACT_PATH || path === LABELS_PATH || path === CATALOG_PATH || QUERY_PATH.test(path ?? ""))) return;
  if (method === "POST" && path === LABELS_PATH && Object.hasOwn(ALLOWED_CONTACTS, CONTACT_ID)) {
    const ids = Array.isArray(body?.labels) ? body.labels.map((item) => item?.labelId) : [];
    if (!ids.length) stop("Refused: an empty label POST would clear every label.");
    if (!allowedPostSets.some((set) => sameSet(ids, set))) stop("Refused: the label POST body is neither the original list nor the original list plus the test label.");
    return;
  }
  stop(`Refused ${method} ${path ?? "(another host)"}: not on the allow-list.`);
}

function cacheHint(res) {
  const names = CACHE_HEADER_NAMES.filter((name) => res.headers.has(name));
  if (!names.length) return "none";
  const hit = ["x-cache", "cf-cache-status"].some((name) => /hit/i.test(res.headers.get(name) ?? ""));
  return `${names.join(",")} (HIT ${hit ? "yes" : "no"})`;
}

// Every CentralReach call goes through here: allow-list, call cap, timeout, no value printed.
async function send(method, url, { headers = {}, body, form, label, isRestore = false } = {}) {
  checkAllowed(method, url, body);
  const cap = isRestore ? MAX_CALLS : MAX_CALLS - RESTORE_RESERVE;
  if (callCount >= cap) stop(`Call cap reached (${callCount} of ${MAX_CALLS}${isRestore ? "" : `, ${RESTORE_RESERVE} kept for a restore`}).`);
  callCount += 1;
  const n = callCount;
  const path = pathOf(url);
  if (path === LABELS_PATH || QUERY_PATH.test(path ?? "")) {
    runState.lastLabelCallAt = Date.now();
    saveState();
  }
  const signals = [AbortSignal.timeout(REQUEST_TIMEOUT_MS)];
  if (!isRestore) signals.push(runAbort.signal);
  let res;
  let text = "";
  try {
    res = await fetch(url, {
      method,
      headers,
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal: AbortSignal.any(signals)
    });
    text = await res.text();
  } catch {
    if (runAbort.signal.aborted && !isRestore) throw runAbort.signal.reason;
    console.log(`  [call ${n}] ${elapsed()} ${label} -> no answer (network, proxy or timeout; is NODE_USE_ENV_PROXY=1 set?)`);
    return { status: null, ok: false, data: null, cache: "n/a" };
  }
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  console.log(`  [call ${n}] ${elapsed()} ${label} -> HTTP ${res.status}`);
  return { status: res.status, ok: res.ok, data, cache: cacheHint(res) };
}

async function getToken() {
  if (token) return token;
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: SETTINGS.CR_CLIENT_ID,
    client_secret: SETTINGS.CR_CLIENT_SECRET,
    scope: "cr-api"
  }).toString();
  const res = await send("POST", SETTINGS.CR_TOKEN_URL, {
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    form,
    label: "POST token",
    isRestore: restoring
  });
  if (!res.data?.access_token) stop(`Token request failed (HTTP ${res.status ?? "no answer"}).`);
  token = res.data.access_token;
  return token;
}

async function crCall(method, path, { body, extraHeaders = {}, label, isRestore = restoring } = {}) {
  const accessToken = await getToken();
  return send(method, `${BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, "x-api-key": SETTINGS.CR_API_KEY, Accept: "application/json", "Content-Type": "application/json", ...extraHeaders },
    body,
    label: label ?? `${method} ${path}`,
    isRestore
  });
}

// ---- Reads ----
// Same reading as readLabelIds in src/lib/centralReachClient.mjs (IDs only).
function readLabelIds(data) {
  const list = Array.isArray(data) ? data : data?.labels ?? data?.labelIds ?? data?.results;
  if (!Array.isArray(list)) return null;
  const ids = list.map((item) => Number(item && typeof item === "object" ? item.labelId : item));
  return ids.every((id) => Number.isInteger(id) && id > 0) ? [...new Set(ids)] : null;
}

// The test-record check: contactId and the marker in the last name. The GET returns the whole
// record (an `ssn` key included); only contactId, lastName and type are looked at, and only yes/no
// is printed.
async function checkTestRecord() {
  const res = await crCall("GET", CONTACT_PATH, { label: `GET ${CONTACT_PATH} (test-record check)` });
  const contact = res.ok && res.data?.contact && typeof res.data.contact === "object" ? res.data.contact : null;
  const idOk = String(contact?.contactId ?? "") === CONTACT_ID;
  const markerOk = typeof contact?.lastName === "string" && contact.lastName.includes(TEST_MARKER);
  const kindOk = typeof contact?.type !== "string" || new RegExp(CONTACT_KIND, "i").test(contact.type);
  const pass = idOk && markerOk && kindOk;
  console.log(`${pass ? "PASS" : "FAIL"} test record ${CONTACT_ID}: contactId matches ${idOk ? "yes" : "NO"}; "${TEST_MARKER}" in the last name ${markerOk ? "yes" : "NO"}; type is ${CONTACT_KIND} ${kindOk ? "yes" : "NO"}`);
  if (!pass) stop(`Contact ${CONTACT_ID} is not confirmed as a test record. Nothing is written.`);
}

async function readCatalog(requiredIds) {
  const res = await crCall("GET", CATALOG_PATH, { label: `GET ${CATALOG_PATH} (live catalog)` });
  const list = Array.isArray(res.data) ? res.data : res.data?.labels ?? res.data?.results;
  const ids = readLabelIds(res.data);
  if (!res.ok || !ids) stop("The label catalog could not be read. Nothing is written.");
  if (Array.isArray(list)) {
    for (const item of list) {
      const id = Number(item?.labelId);
      if (Number.isInteger(id) && typeof item?.name === "string" && item.name.trim()) NAMES.set(id, item.name.trim());
    }
  }
  for (const id of requiredIds) {
    const held = ids.includes(id);
    console.log(`${held ? "PASS" : "FAIL"} label ${id} ${nameOf(id)} is in CentralReach's live catalog (no label is ever created)`);
    if (!held) stop(`Label ${id} is not in the live catalog. Nothing is written.`);
  }
}

// One labels read of the given kind. hasLabel: does it show `labelId`.
async function readLabels(variant, { labelId = null, since = null, isRestore = restoring } = {}) {
  const path = variant === "query" ? `${LABELS_PATH}?_t=${Date.now()}` : LABELS_PATH;
  const extraHeaders = variant === "header" ? { "Cache-Control": "no-cache", Pragma: "no-cache" } : {};
  const res = await crCall("GET", path, { extraHeaders, label: `GET labels (${VARIANT_TEXT[variant]})`, isRestore });
  const ids = res.ok ? readLabelIds(res.data) : null;
  const read = { variant, status: res.status, ok: Boolean(ids), ids, at: Date.now(), cache: res.cache };
  read.hasLabel = labelId !== null && Boolean(ids?.includes(labelId));
  const when = since === null ? "" : `+${secondsSince(since).padStart(6)} s | `;
  const shows = labelId === null || !ids ? "" : `${nameOf(labelId)} ${read.hasLabel ? "SHOWN" : "not shown"} | `;
  console.log(`      ${when}${VARIANT_TEXT[variant].padEnd(30)} | ${ids ? shows : `unreadable (HTTP ${res.status ?? "none"}) | `}labels [${ids ? listText(ids) : "-"}] | cache headers: ${res.cache}`);
  return read;
}

// M1: the restore target is the first read only if it is the known resting list and holds no test
// label. A stale answer from an earlier part (School or Clinic still showing) stops the run here,
// before the restore file, the POST or the prompt.
function checkFirstRead(ids) {
  const held = [PART1_LABEL, PART2_LABEL].filter((label) => ids.includes(label.id));
  if (held.length) {
    stop(`The first read shows ${held.map((label) => `${label.name} ${label.id}`).join(" and ")}: a lagging read from an earlier part, or the label is really set. Nothing is written. Wait ${MIN_GAP_S / 60} minutes with no label reads and rerun; if it still shows, check the CentralReach screen.`);
  }
  const same = sameSet(ids, EXPECTED_LABELS);
  console.log(`${same ? "PASS" : "FAIL"} first read equals the expected resting list [${listText(EXPECTED_LABELS)}]${OPTIONS.expect ? " (--expect-labels)" : " (BUILD-PLAN section 4)"}: ${same ? "yes" : "NO"}`);
  if (!same) {
    stop(`The first read [${listText(ids)}] differs from the expected resting list. Nothing is written. Check the labels on the CentralReach screen: if the screen shows the expected list, a read is lagging (wait ${MIN_GAP_S / 60} minutes and rerun); if the screen shows another list on purpose, rerun with --expect-labels <the IDs on the screen>.`);
  }
}

// ---- Restore file ----
function restoreFileExists() {
  return existsSync(RESTORE_FILE(CONTACT_ID));
}
function writeRestoreFile(ctx) {
  const file = RESTORE_FILE(CONTACT_ID);
  writeFileSync(file, JSON.stringify({ script: "test-cr-label-read-lag", contactId: CONTACT_ID, savedAt: new Date().toISOString(), labelIds: ctx.original }), { mode: 0o600, flag: "wx" });
  ctx.restoreFile = file;
  console.log(`  Restore file (mode 600, the original label IDs only): ${file}`);
}
function readRestoreFile() {
  const file = RESTORE_FILE(CONTACT_ID);
  let saved;
  try {
    saved = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    stop(`No readable restore file at ${file}.`);
  }
  const ids = Array.isArray(saved?.labelIds) ? saved.labelIds.map(Number) : [];
  if (String(saved?.contactId) !== CONTACT_ID || !ids.length || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    stop(`The restore file ${file} is not a label list for contact ${CONTACT_ID}. Nothing is written.`);
  }
  if (ids.some((id) => TEST_LABEL_IDS.includes(id))) stop(`The restore file ${file} holds a test label (School or Clinic). Nothing is written; set the labels on the CentralReach screen.`);
  return { file, ids, savedAt: saved.savedAt };
}
function dropRestoreFile() {
  const file = RESTORE_FILE(CONTACT_ID);
  try {
    unlinkSync(file);
    console.log(`  Restore file deleted: ${file}`);
  } catch {
    console.log(`  Could not delete the restore file; delete it by hand: ${file}`);
  }
}

// ---- Polling after a change ----
// Rounds at ROUND_OFFSETS_S after `changeAt`. Each round reads plain first (so a bypass read in the
// same round cannot refresh what the plain read sees), then every bypass kind that has not shown
// the label yet. Stops once the plain read shows it. `result` is filled as the rounds run, so a stop
// part-way leaves a record that says so (cutShort, lastOffset).
function newPollResult(label, firstSeen) {
  return { label, firstSeen, refused: [], lastOffset: null, cutShort: true, plainFailed: false };
}
async function pollForLabel(result, changeAt) {
  const { firstSeen } = result;
  const labelId = result.label.id;
  for (const offset of ROUND_OFFSETS_S) {
    const kinds = VARIANTS.filter((v) => firstSeen[v] === null && !result.refused.includes(v));
    if (!kinds.includes("plain")) break;
    if (normalLeft() < kinds.length) {
      console.log(`    Read budget used up before the +${offset} s round; polling stops here (the verdict will be INCONCLUSIVE).`);
      return result;
    }
    await sleepUntil(changeAt + offset * 1000, runAbort.signal);
    console.log(`    Round +${offset} s:`);
    for (const kind of kinds) {
      const read = await readLabels(kind, { labelId, since: changeAt });
      if (!read.ok && kind === "plain") result.plainFailed = true;
      if (!read.ok && kind !== "plain" && read.status >= 400 && read.status < 500) result.refused.push(kind);
      if (read.hasLabel) firstSeen[kind] = Number(((read.at - changeAt) / 1000).toFixed(1));
    }
    result.lastOffset = offset;
  }
  result.cutShort = false;
  return result;
}

// A read confirms the original list when it shows it AND either its kind showed the change earlier
// (so it is past the pre-change state) or it is SETTLE_S after the restore. A read that never
// tracked the change could be showing the old answer from before it.
async function confirmOriginal(ctx, changeAt, trustedKinds, { isRestore }) {
  const order = ["header", "query", "plain"].filter((v) => trustedKinds.includes(v));
  if (order.length) {
    const kind = order[0];
    console.log(`    Check reads with "${VARIANT_TEXT[kind]}" (it showed the change, so it is past the old answer):`);
    for (const offset of RESTORE_CHECK_OFFSETS_S) {
      if (!isRestore && normalLeft() < 1) break;
      await sleepUntil(changeAt + offset * 1000, isRestore ? undefined : runAbort.signal);
      const read = await readLabels(kind, { since: changeAt, isRestore });
      if (read.ids && sameSet(read.ids, ctx.original)) return { confirmed: true, how: `${VARIANT_TEXT[kind]} read at +${secondsSince(changeAt)} s` };
    }
    return { confirmed: false, how: `${VARIANT_TEXT[kind]} reads up to +${RESTORE_CHECK_OFFSETS_S.at(-1)} s did not show the original list` };
  }
  console.log(`    No read kind showed the change, so the check is a plain read ${SETTLE_S} s after it (longer than every lag seen so far).`);
  if (!isRestore && normalLeft() < 1) return { confirmed: false, how: "no read budget left" };
  await sleepUntil(changeAt + SETTLE_S * 1000, isRestore ? undefined : runAbort.signal);
  const read = await readLabels("plain", { since: changeAt, isRestore });
  if (read.ids && sameSet(read.ids, ctx.original)) return { confirmed: true, how: `plain read at +${secondsSince(changeAt)} s (settle rule)` };
  return { confirmed: false, how: `plain read at +${SETTLE_S} s did not show the original list` };
}

// POST the original list back and confirm it. Uses the restore reserve. Tried once per change: a
// failed restore is reported, not repeated (the restore file stays for --restore).
async function restoreByApi(ctx, reason, trustedKinds = []) {
  restoring = true;
  ctx.restoreTried = true;
  console.log(`\n  RESTORE (${reason}): POST the original list [${listText(ctx.original)}]`);
  try {
    const res = await crCall("POST", LABELS_PATH, { body: { labels: ctx.original.map((labelId) => ({ labelId })) }, label: `POST ${LABELS_PATH} (restore)`, isRestore: true });
    const postAt = Date.now();
    if (!res.ok) {
      ctx.restore = { confirmed: false, how: `restore POST answered ${res.status ?? "nothing"}` };
    } else {
      // After the restore POST, a kind that showed the test label tracks writes; prefer it.
      ctx.restore = await confirmOriginal(ctx, postAt, trustedKinds, { isRestore: true });
    }
  } catch (error) {
    ctx.restore = { confirmed: false, how: `restore did not finish: ${error instanceof StopError ? error.message : error?.name ?? "error"}` };
  }
  console.log(`${ctx.restore.confirmed ? "PASS" : "FAIL"} restore confirmed: ${ctx.restore.confirmed ? "yes" : "NO"} (${ctx.restore.how})`);
  if (ctx.restore.confirmed) ctx.dirty = false;
  restoring = false;
  return ctx.restore.confirmed;
}

// ---- Enter key ----
let stdinUsed = false;
function waitForEnter(ms, signal) {
  stdinUsed = true;
  const openedAt = Date.now();
  return new Promise((done, fail) => {
    const onData = (chunk) => {
      // Input typed before this prompt arrives at once on resume; it must not answer this prompt.
      if (Date.now() - openedAt < ENTER_IGNORE_MS) return;
      if (String(chunk).includes("\n")) finish(() => done(true));
    };
    const timer = setTimeout(() => finish(() => done(false)), ms);
    const onAbort = () => finish(() => fail(signal.reason));
    function finish(next) {
      clearTimeout(timer);
      process.stdin.off("data", onData);
      process.stdin.pause();
      signal.removeEventListener("abort", onAbort);
      next();
    }
    process.stdin.on("data", onData);
    process.stdin.resume();
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

// ---- Part 1 ----
async function part1(ctx) {
  console.log(`\n==== PART 1: API write of ${PART1_LABEL.name} ${PART1_LABEL.id}, then timed reads ====`);
  const prime = await readLabels("plain");
  if (!prime.ids) stop("The label read failed. Nothing is written.");
  checkFirstRead(prime.ids);
  ctx.original = prime.ids;
  console.log(`  Original list: [${listText(ctx.original)}]`);
  if (normalLeft() < 1 + ROUND_OFFSETS_S.length * VARIANTS.length) stop("Not enough calls left for the POST and every read round. Nothing is written.");
  allowedPostSets = [ctx.original, [...ctx.original, PART1_LABEL.id]];
  writeRestoreFile(ctx);

  const primeAge = () => secondsSince(prime.at);
  const live = { plain: null, header: null, query: null };
  ctx.p1 = newPollResult(PART1_LABEL, live);
  Object.assign(ctx, { writeSent: true, dirty: true, restoreTried: false, live });
  const res = await crCall("POST", LABELS_PATH, { body: { labels: [...ctx.original, PART1_LABEL.id].map((labelId) => ({ labelId })) }, label: `POST ${LABELS_PATH} (original + ${PART1_LABEL.name})` });
  const postAt = Date.now();
  console.log(`${res.ok ? "PASS" : "FAIL"} label POST accepted (HTTP ${res.status ?? "none"}); the prime read was ${primeAge()} s before it`);
  if (!res.ok) stop("The label POST was not accepted.");

  await pollForLabel(ctx.p1, postAt);
  printPartResult("P1", ctx.p1);
  runState.p1 = { firstSeen: { ...live }, refused: [...ctx.p1.refused], lastOffset: ctx.p1.lastOffset, cutShort: ctx.p1.cutShort, plainFailed: ctx.p1.plainFailed, at: new Date().toISOString() };
  saveState();

  const trusted = VARIANTS.filter((v) => live[v] !== null);
  const ok = await restoreByApi(ctx, "end of Part 1", trusted);
  ctx.p1.restoreOk = ok;
  if (!ok) stop("Part 1 restore not confirmed.");
}

// ---- Part 2 ----
async function part2(ctx) {
  console.log(`\n==== PART 2: hand-add ${PART2_LABEL.name} ${PART2_LABEL.id} on the CentralReach screen, then timed reads ====`);
  const prime = await readLabels("plain", { labelId: PART2_LABEL.id });
  if (!prime.ids) stop("The label read failed. Nothing to do by hand.");
  checkFirstRead(prime.ids);
  if (ctx.original && !sameSet(prime.ids, ctx.original)) stop(`This read differs from the original list [${listText(ctx.original)}]. Nothing to do by hand.`);
  ctx.original = prime.ids;
  console.log(`  Original list: [${listText(ctx.original)}]`);
  // Check the budget before the prompt: a hand edit must never be asked for without every read round.
  if (normalLeft() < ROUND_OFFSETS_S.length * VARIANTS.length) stop("Not enough calls left for every read round. Nothing to do by hand.");
  allowedPostSets = [ctx.original];
  writeRestoreFile(ctx);

  const live = { plain: null, header: null, query: null };
  Object.assign(ctx, { writeSent: true, dirty: true, restoreTried: false, live }); // a hand edit may exist from here: any stop restores by API
  console.log("\n  >>> ZEKE, NOW (CentralReach screen):");
  console.log(`  >>> Reload test employee ${CONTACT_ID}, add the label "${PART2_LABEL.name}" (${PART2_LABEL.id}), save,`);
  console.log(`  >>> and press Enter here the moment the save completes. Within 60 s of this line (over ${PRIME_MAX_AGE_S} s: no verdict).`);
  console.log(`  >>> (No Enter within ${ENTER_WAIT_MS / 60000} min: the script restores the original list by API and stops.)`);
  const pressed = await waitForEnter(ENTER_WAIT_MS, runAbort.signal);
  if (!pressed) stop("No Enter within the wait.");
  const changeAt = Date.now();
  console.log(`  Enter at ${elapsed()}; the prime read was ${secondsSince(prime.at)} s before it.`);

  ctx.p2 = { ...newPollResult(PART2_LABEL, live), primeAgeS: Number(((changeAt - prime.at) / 1000).toFixed(1)) };
  await pollForLabel(ctx.p2, changeAt);
  printPartResult("P2", ctx.p2);

  console.log("\n  >>> ZEKE, NOW (CentralReach screen):");
  console.log(`  >>> Reload employee ${CONTACT_ID}, remove the label "${PART2_LABEL.name}", save, and press Enter here.`);
  const removed = await waitForEnter(ENTER_WAIT_MS, runAbort.signal);
  if (!removed) stop("No Enter within the wait after the removal prompt.");
  // S1: always POST the original list after the hand removal, so the end state rests on the POST's
  // answer and not on the hand save or a possibly stale read.
  const trusted = VARIANTS.filter((v) => live[v] !== null);
  const ok = await restoreByApi(ctx, "after the hand removal (always sent)", trusted);
  if (!ok) stop("Part 2 restore not confirmed.");
}

// ---- Result reading ----
const plainLagged = (p) => p.firstSeen.plain === null || p.firstSeen.plain > FIRST_ROUND_LIMIT_S;
// M4: a bypass works only if it showed the change in the first round while plain did not. A bypass
// first seen in a later round cannot be told apart from a cache expiring between two reads.
const freshBypassOf = (p) => (plainLagged(p) ? ["header", "query"].find((v) => p.firstSeen[v] !== null && p.firstSeen[v] <= FIRST_ROUND_LIMIT_S) ?? null : null);
const lateBypassOf = (p) => ["header", "query"].find((v) => p.firstSeen[v] !== null && p.firstSeen[v] > FIRST_ROUND_LIMIT_S && (p.firstSeen.plain === null || p.firstSeen[v] < p.firstSeen.plain)) ?? null;
const shownText = (p, v) => (p.firstSeen[v] === null ? (p.refused.includes(v) ? "REFUSED by CentralReach" : p.lastOffset === null ? "not read" : `not shown by +${p.lastOffset} s`) : `first shown at +${p.firstSeen[v]} s`);

// M3, M5: the data cannot support a verdict.
function inconclusiveReason(p) {
  if (p.lastOffset === null) return "no read round was made after the change (polling cut short)";
  if (p.cutShort && p.firstSeen.plain === null) return `polling stopped after the +${p.lastOffset} s round, before the plain read showed the change`;
  if (p.plainFailed) return "a plain read failed, so the plain lag is not known";
  if (Number.isFinite(p.primeAgeS) && p.primeAgeS > PRIME_MAX_AGE_S) return `the prime read was ${p.primeAgeS} s before the edit (limit ${PRIME_MAX_AGE_S} s), so a cache may have expired first; repeat Part 2 with the edit saved within 60 s of the prompt`;
  return null;
}

function printPartResult(tag, p) {
  console.log(`\n  ${tag} result for ${p.label.name} ${p.label.id}:`);
  for (const v of VARIANTS) console.log(`    ${VARIANT_TEXT[v].padEnd(30)}: ${shownText(p, v)}`);
  const lag = plainLagged(p);
  console.log(`${lag ? "FAIL" : "PASS"} ${tag} plain read shows the change in the first round (+${ROUND_OFFSETS_S[0]} s): ${lag ? "NO (read lag)" : "yes"}`);
  for (const v of ["header", "query"]) {
    if (p.refused.includes(v)) {
      console.log(`FAIL ${tag} ${VARIANT_TEXT[v]} accepted by CentralReach: NO (not usable)`);
      continue;
    }
    const fresh = lag && p.firstSeen[v] !== null && p.firstSeen[v] <= FIRST_ROUND_LIMIT_S;
    const late = p.firstSeen[v] !== null && p.firstSeen[v] > FIRST_ROUND_LIMIT_S && (p.firstSeen.plain === null || p.firstSeen[v] < p.firstSeen.plain);
    console.log(`${fresh ? "PASS" : "FAIL"} ${tag} ${VARIANT_TEXT[v]} shows the change in the first round while plain does not: ${fresh ? "yes" : late ? `no (shown at +${p.firstSeen[v]} s, before plain but not at once: not a fresh read)` : "no"}`);
  }
}

function verdict(ctx) {
  const p = ctx.p2 ?? ctx.p1;
  if (!p) return "INCONCLUSIVE - the test did not reach its reads";
  const which = ctx.p2 ? "the hand edit" : "the API write";
  const caveat = ctx.p2 ? "" : " [Part 1 only, an API write: run Part 2 for the R-6 case (a hand edit)]";
  const why = inconclusiveReason(p);
  if (why) return `INCONCLUSIVE - ${why}${caveat}`;
  if (!plainLagged(p)) {
    return `no fix proven needed - the plain read showed ${which} in the first round after a prime read made ${ctx.p2 ? `${p.primeAgeS} s` : "about 1 s"} before it, so the lag was not reproduced${caveat}`;
  }
  const fresh = freshBypassOf(p);
  if (fresh) {
    const sent = fresh === "header" ? "the headers Cache-Control: no-cache and Pragma: no-cache (send both)" : "a throwaway query value ?_t=<ms>";
    return `Option 1 - force a fresh read with ${sent}: it saw ${which} at +${p.firstSeen[fresh]} s, the plain read ${p.firstSeen.plain === null ? `not by +${p.lastOffset} s` : `at +${p.firstSeen.plain} s`}${caveat}`;
  }
  const late = lateBypassOf(p);
  if (late) {
    return `INCONCLUSIVE - "${VARIANT_TEXT[late]}" first showed ${which} at +${p.firstSeen[late]} s, before the plain read but not in the first round: a cache expiring between two reads looks the same, so this is not Option 1. Repeat the part${caveat}`;
  }
  if (p.firstSeen.plain !== null) {
    return `Option 2 - no bypass worked; every read kind lagged ${which} and the plain read caught up at +${p.firstSeen.plain} s. Option 2 holds only if a hand edit with no label read in the 5 minutes before it shows at once (plan step A, not run here); if not, Option 3a${caveat}`;
  }
  return `Option 3a - ask CentralReach: no read kind showed ${which} within ${p.lastOffset} s, or CentralReach ignored the label on this employee: check the screen${caveat}`;
}

// ---- Dry run ----
function dryRun() {
  const part = OPTIONS.part;
  console.log(`DRY RUN: no settings loaded, no network call, no file written. Contact ${CONTACT_ID} (${CONTACT_KIND}, allow-listed).`);
  console.log(`Call cap ${MAX_CALLS} (${RESTORE_RESERVE} kept for a restore); run-time cap ${MAX_RUN_MS / 60000} min (+${RESTORE_GRACE_MS / 60000} min for a restore).`);
  console.log(`Restore file: ${RESTORE_FILE(CONTACT_ID)} (${restoreFileExists() ? "EXISTS: a real run refuses until --restore --run clears it" : "absent"})`);
  const found = loadState();
  const gapText = runState.lastLabelCallAt === null ? "no last label call recorded" : `last label call ${((Date.now() - runState.lastLabelCallAt) / 1000).toFixed(0)} s ago; a real run refuses under ${MIN_GAP_S} s`;
  console.log(`State file: ${STATE_FILE(CONTACT_ID)} (${found ? gapText : "absent"})`);
  console.log(`Expected resting list: [${listText(EXPECTED_LABELS)}]${OPTIONS.expect ? " (--expect-labels)" : " (BUILD-PLAN section 4, 2026-11-20)"}`);
  const rounds = ROUND_OFFSETS_S.map((s) => `+${s}`).join(", ");
  const kinds = VARIANTS.map((v) => `"${VARIANT_TEXT[v]}"`).join(", then ");
  const line = (calls, text) => console.log(`  ${calls.padEnd(6)} ${text}`);
  console.log("\nPlanned calls (each one a production call):");
  line("-", `refuse unless the last label call on ${CONTACT_ID} (state file) was at least ${MIN_GAP_S} s ago`);
  line("1", "POST token (CR_TOKEN_URL)");
  line("1", `GET ${CONTACT_PATH}: test-record check (contactId, "${TEST_MARKER}" in the last name; nothing else inspected or printed). Refuses on a mismatch.`);
  if (part === "1") {
    console.log(`  -- Part 1: API write of ${PART1_LABEL.name} ${PART1_LABEL.id}`);
    line("1", `GET ${CATALOG_PATH}: ${PART1_LABEL.name} must be in the live catalog (no label is created)`);
    line("1", `GET ${LABELS_PATH} (plain): the original list, also the prime read. Refuses unless it equals the expected resting list (so never with School or Clinic).`);
    line("-", "write the restore file (mode 600)");
    line("1", `POST ${LABELS_PATH}: the original list + ${PART1_LABEL.id}`);
    line("3-12", `reads at ${rounds} s after the POST: ${kinds}; a kind stops once it shows the label, the rounds stop once the plain read shows it`);
    line("1", `POST ${LABELS_PATH}: the original list (restore)`);
    line("1-3", `check reads: a kind that showed the label, at +${RESTORE_CHECK_OFFSETS_S.join(", +")} s until it shows the original list; if none did, one plain read at +${SETTLE_S} s`);
    console.log("  Part 1: 10 to 21 calls; about 1 to 10 min, no clicks.");
  } else {
    console.log(`  -- Part 2: hand-add ${PART2_LABEL.name} ${PART2_LABEL.id} on the CentralReach screen`);
    line("1", `GET ${LABELS_PATH} (plain): the original list and the prime read. Refuses unless it equals the expected resting list.`);
    line("-", "write the restore file (mode 600)");
    line("-", `PROMPT 1: Zeke adds "${PART2_LABEL.name}" on employee ${CONTACT_ID}, saves, presses Enter within 60 s (waits up to ${ENTER_WAIT_MS / 60000} min)`);
    line("3-12", `reads at ${rounds} s after Enter, as in Part 1`);
    line("-", `PROMPT 2: Zeke removes "${PART2_LABEL.name}" on the screen, saves, presses Enter`);
    line("1", `POST ${LABELS_PATH}: the original list (always sent after the hand removal)`);
    line("1-3", "check reads as in Part 1");
    console.log("  Part 2: 8 to 19 calls; about 2 to 12 min plus the two clicks.");
  }
  console.log("\nOn any error, Ctrl-C (once), the call cap or the time cap after the first write: POST the original list from the restore file and confirm it by read. Ctrl-C during that restore asks for a second Ctrl-C to abandon it (exit code 2).");
  console.log("Nothing was sent. Add --run to run it.");
}

// ---- Main ----
const ctx = { original: null, restoreFile: null, writeSent: false, dirty: false, restoreTried: false, restore: null, p1: null, p2: null, live: null, stopped: null };

async function realRun() {
  SETTINGS = loadSettings();
  BASE = SETTINGS.CR_BASE_URL.replace(/\/+$/, "");
  loadState(); // so a label call's timestamp update keeps a saved Part 1 result
  if (OPTIONS.restore) {
    const saved = readRestoreFile();
    networkOn = true;
    ctx.original = saved.ids;
    ctx.restoreFile = saved.file;
    allowedPostSets = [ctx.original];
    console.log(`RESTORE ONLY: contact ${CONTACT_ID}, list saved ${saved.savedAt}: [${listText(ctx.original)}]`);
    await checkTestRecord();
    Object.assign(ctx, { writeSent: true, dirty: true, restoreTried: false });
    if (await restoreByApi(ctx, "--restore")) dropRestoreFile();
    return;
  }
  if (restoreFileExists()) stop(`A restore file from an earlier run exists (${RESTORE_FILE(CONTACT_ID)}): its restore was not confirmed. Run --restore --run first.`);
  checkGap();
  networkOn = true;
  console.log(`R-6 label read-lag test on contact ${CONTACT_ID}. Part ${OPTIONS.part}. Call cap ${MAX_CALLS}, time cap ${MAX_RUN_MS / 60000} min.`);
  await checkTestRecord();
  if (OPTIONS.part === "1") {
    await readCatalog([PART1_LABEL.id]);
    await part1(ctx);
  } else await part2(ctx);
  if (ctx.writeSent && !ctx.dirty) dropRestoreFile();
}

async function main() {
  if (!OPTIONS.run) {
    if (OPTIONS.restore) {
      console.log(`DRY RUN of --restore: would read ${RESTORE_FILE(CONTACT_ID)} (${restoreFileExists() ? "exists" : "ABSENT"}), check the test record, POST that list to ${LABELS_PATH} and confirm it by read (about 4-5 calls, ${SETTLE_S} s). Nothing was sent. Add --run.`);
    } else dryRun();
    return;
  }
  process.on("SIGINT", () => {
    if (restoring) {
      if (!restoreInterruptWarned) {
        restoreInterruptWarned = true;
        console.log("\nCtrl-C: a restore is in progress and continues. Press Ctrl-C again to abandon it (exit code 2).");
        return;
      }
      console.log(`\nRestore abandoned: not confirmed. Restore file: ${RESTORE_FILE(CONTACT_ID)}. Run --restore --run, or check the labels on the CentralReach screen. CentralReach calls made: ${callCount}.`);
      process.exit(2);
    }
    if (runAbort.signal.aborted) {
      console.log(`\nSecond Ctrl-C: exiting${ctx.dirty ? ` without a confirmed restore. Restore file: ${RESTORE_FILE(CONTACT_ID)}. Run --restore --run` : " (nothing to undo)"}. CentralReach calls made: ${callCount}.`);
      process.exit(ctx.dirty ? 2 : 1);
    }
    console.log("\nCtrl-C: stopping; the original list is restored if anything was written (Ctrl-C again to quit at once).");
    runAbort.abort(new StopError("Ctrl-C"));
  });
  setTimeout(() => runAbort.abort(new StopError(`time cap of ${MAX_RUN_MS / 60000} min`)), MAX_RUN_MS).unref();
  setTimeout(() => {
    console.log(`\nHard time limit reached during the restore. Restore file: ${RESTORE_FILE(CONTACT_ID)}. Run --restore --run.`);
    process.exit(2);
  }, MAX_RUN_MS + RESTORE_GRACE_MS).unref();

  try {
    await realRun();
  } catch (error) {
    ctx.stopped = error instanceof StopError ? error.message : `unexpected error (${error?.name ?? "Error"})`;
    console.log(`\nSTOPPED: ${ctx.stopped}`);
    if (ctx.dirty && !ctx.restoreTried && ctx.original?.length) {
      // Kinds that showed the change being undone track writes; a stale kind could show the old list.
      const trusted = VARIANTS.filter((v) => ctx.live?.[v] != null);
      if (await restoreByApi(ctx, ctx.stopped, trusted)) dropRestoreFile();
    }
  }
  if (stdinUsed) process.stdin.destroy();

  console.log("\n==== SUMMARY ====");
  if (ctx.stopped) console.log(`STOPPED = ${ctx.stopped}`);
  console.log(`Original list = [${ctx.original ? listText(ctx.original) : "not read"}]`);
  const firstSeenLine = (p) => `plain ${p.firstSeen.plain ?? "-"}, no-cache headers ${p.firstSeen.header ?? "-"}, query ${p.firstSeen.query ?? "-"}${p.refused.length ? `; refused: ${p.refused.join(", ")}` : ""}${p.cutShort ? `; polling cut short after ${p.lastOffset === null ? "no round" : `+${p.lastOffset} s`}` : ""}`;
  if (ctx.p1) console.log(`P1 first shown (s after the POST) = ${firstSeenLine(ctx.p1)}`);
  if (ctx.p2) console.log(`P2 first shown (s after Enter; prime read ${ctx.p2.primeAgeS} s before) = ${firstSeenLine(ctx.p2)}`);
  if (ctx.p2) {
    const saved = runState.p1;
    const p1Plain = saved ? (saved.firstSeen?.plain ?? (saved.lastOffset === null ? "not read" : `not by +${saved.lastOffset}`)) : null;
    console.log(saved ? `API write vs hand edit, plain read first shown: Part 1 (run of ${saved.at}) ${p1Plain} s after the POST; Part 2 ${ctx.p2.firstSeen.plain ?? `not by +${ctx.p2.lastOffset ?? "-"}`} s after Enter` : "API write vs hand edit: no saved Part 1 result in the state file to compare with");
  }
  const restoreLine = !ctx.writeSent ? "not needed (nothing written)" : !ctx.dirty ? `yes (${ctx.restore?.how ?? "confirmed"})` : `NO (${ctx.restore?.how ?? "not attempted"}); restore file kept: ${RESTORE_FILE(CONTACT_ID)}; run --restore --run`;
  console.log(`${ctx.dirty ? "FAIL" : "PASS"} final list equals the original: ${restoreLine}`);
  console.log(`CentralReach calls this run: ${callCount} (token included; cap ${MAX_CALLS}). Run time ${secondsSince(T0)} s.`);
  if (!OPTIONS.restore) console.log(`VERDICT: ${verdict(ctx)}`);
  process.exitCode = ctx.dirty ? 2 : ctx.stopped ? 1 : 0;
}

main().catch((error) => {
  console.error(`Stopped: ${error instanceof StopError ? error.message : error?.name ?? "error"}`);
  console.error(`CentralReach calls made: ${callCount}.`);
  process.exit(ctx.dirty ? 2 : 1);
});
