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
// External System ID = the HubSpot record ID finds it, or its last name holds "Azure Test".
//
// External System ID of an employee (B2, T2; guide [G17], src/mappings/employees/
// buildEmployeePayload.mjs:23-31): the HubSpot `workday_id` when it is filled, otherwise the
// HubSpot record ID (the temporary ID). The script does not read HubSpot, so the Workday ID comes
// from the round file, `"workdayIds": { "bt1": "...", "bcba": "..." }` (both optional), or from
// --workday-id. With one, the lookup and B2 / T2 use it, and the record must also hold
// "Azure Test" in its last name: a lookup by a Workday ID alone could find a real employee.
// Without one, the old behaviour: External System ID = the HubSpot record ID.
//
// Usage (from the repo root, after each push):
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record bt1
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record bcba
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record case --keys
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 4 --record bcba --workday-id 7167221
// Options: --cr-id <id> uses that CR contact ID instead of the lookup. --workday-id <value> (bt1 or
// bcba only) is the Workday ID CR should hold; it wins over the round file. --keys prints the key names
// (no values) of each response; it is printed anyway when a field or the metadata shape is not
// found. --step create (default) checks the create values (any round: 1-4 and the create sets
// 5 = R2b, 6 = R3b, 7 = R1b, 10 = R1c follow the same pattern rule); --step u1 (rounds 1, 2 and 3)
// checks the records after the retest run sheet webhook update push (S4), using the U1 values of
// the matrix and the run sheet (review C C5). A field changed again in a later step is SKIP in u1.
// The first run of every linked record after the deploy is a full re-send (MAPPING_VERSION bump,
// review C B1): it is judged on the values, never on `changedFieldNames`.
//
//   --unmapped save | compare   (rows UW-1, UW-2; risk N1). Reads the CR record only and handles the
//       keys of `contact` that the integration does NOT map. `save` writes a baseline of their shape
//       and a short SHA-256 of each value to a mode-600 file in the OS temp folder (no value is ever
//       printed or saved in clear); `compare` reads again and prints, per key, equal / BLANKED /
//       CHANGED / ABSENT, then UNMAPPED_KEPT = yes | no (exit 1 on no). Run `save` after Zeke sets
//       the markers on the CR screen and before the push; `compare` after the run. Both print the
//       "SSN shape" line (row UW-3): absent / blank / sendable / NOT SENDABLE, never the value.
//
//   --fresh-label-read [--run]   (row R6-1; build chat 3 item 4, R-6). One label GET on test employee
//       5338681 (no HubSpot record, so no integration run touches it) in the integration's combined
//       form: Cache-Control: no-cache, Pragma: no-cache AND ?_t=<ms> on the same request
//       (src/lib/centralReachClient.mjs readContactLabelIds). Dry run unless --run (2 CR calls: the
//       token and the GET). Prints PASS when the answer is HTTP 200 with a readable label list. Run
//       only when label testing resumes (paused on Zeke's word, 2026-11-25). --round / --record are
//       not needed.
// Exit code 1 when any row FAILs or the run stops.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { unsendableSsnKey } from "../../src/lib/mappedState.mjs";

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
const FRESH_LABEL_READ = args.includes("--fresh-label-read");
if (!FRESH_LABEL_READ && (!Number.isInteger(round) || round < 1 || round > 99 || !["bt1", "bcba", "case"].includes(recordName))) {
  console.error("Give --round N (1 to 99) and --record bt1|bcba|case.");
  process.exit(1);
}
if (!FRESH_LABEL_READ && (!["create", "u1"].includes(step) || (step === "u1" && ![1, 2, 3].includes(round)))) {
  console.error("--step is create, or u1 with --round 1, 2 or 3.");
  process.exit(1);
}
const UNMAPPED = argValue("--unmapped");
if (args.includes("--unmapped") && !["save", "compare"].includes(UNMAPPED)) {
  console.error("--unmapped is save or compare.");
  process.exit(1);
}
if (crIdOverride !== undefined && !/^\d+$/.test(crIdOverride)) {
  console.error("--cr-id must be digits.");
  process.exit(1);
}
const workdayIdOverride = argValue("--workday-id");
// A Workday ID is exactly 7 digits (build package item 15); anything else ends `error` before CR.
if (args.includes("--workday-id") && (recordName === "case" || !/^\d{7}$/.test(workdayIdOverride ?? ""))) {
  console.error("--workday-id needs a 7-digit value and --record bt1 or bcba.");
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

// C24 (item 5): CentralReach's two-line form, "<street> <apt>" + line break + "<City> <ST> <ZIP>".
// normalize() turns the line break into a space on both sides.
function caseServiceAddress() {
  return pick(`${N}01 Azure Test St Apt ${N}A\n${S.city} ${S.code} ${S.zip}1`,
    `200 Service Rd Suite ${N}\n${S.city} ${S.code} ${S.zip}2`,
    `${N}01 Azure Test St Apt ${N}A\n${S.city}`); // R3: state and ZIP blank at create (U2-6)
}

// C10 (build package item 6; O-17 11.a, 11.b): 138851 = first name, last name and email, one per line
// ("\n", a blank part skipped), when coordinator_export_status is `ready`
// (src/mappings/shared/careCoordinator.mjs careCoordinatorValue); any other status leaves 138851 out (a
// create then holds nothing). The round file's read-back (create-test-records.mjs) keeps the status,
// whether the names are the test names, and a SHA-256 hash of the test coordinator's email (no address
// in the repo, Zeke 2026-11-25). Compared byte for byte ("coordinator"): the line breaks must survive
// in CentralReach (open point CC-1); a line holding "@" is hashed on both sides before the compare and
// before printing, so the address is never printed.
// B11 (spec A4.9): the same rule for the BCBA, Employee Meta 140495, from the BCBA read-back.
function careCoordinatorRow(roundFile, record = "deal", fieldId = 138851) {
  const c = roundFile?.report?.[record]?.coordinator;
  if (!c) return skip("the round file has no coordinator read-back: re-run create-test-records.mjs (plan) and compare by hand");
  if (c.status === "ready" && c.testNames && !c.emailHash) return skip("status ready but the read-back has no coordinator email hash (older round file): re-run the read-back or compare by hand");
  if (c.status === "ready" && c.testNames) return [meta(fieldId, `Zeke\nSwanson\nsha256:${c.emailHash}`, "coordinator")];
  if (c.status === "ready") return skip("status ready but the names are not Zeke / Swanson in the read-back; compare by hand");
  return [meta(fieldId, "")]; // not ready at the read-back: the create sends nothing (run sheet stops before the push)
}

// BL6 (build chat 3 item 3; guide G08 L691-692; handover item 3): the credential options a BCBA holds
// → stateless CR labels. Written out here from the guide and the handover, not imported from src, so
// the check does not prove the code against itself. MCD FFS-NY is BL5's (1107647, its own row).
const EXPECTED_CREDENTIAL_LABELS = {
  ny_insurance_labels: { "MCD FFS-NY": null, "Aetna-NY": 1107649, "Cigna-NY": 1107650, "Carelon-NY": 1132654 },
  co_insurance_labels: { "MCD-CO": 1107651, "Aetna-CO": 1107649, "Cigna-CO": 1107650, "Carelon-CO": 1132654 },
  nj_insurance_labels: { Aetna: 1107649, Cigna: 1107650, "MCD-NJ": null, "Horizon-NJ": null }
};
const CREDENTIAL_GROUP = [1107649, 1107650, 1132654, 1107651];

// The options come from the round file (`credentialOptions`, written by create-test-records.mjs with
// the options it actually set after its sandbox option check). `removed` = [property, option] taken
// off by hand in S4 (BL6-U1, BL6-U2): a managed label must then be gone.
function credentialRow(roundFile, removed = null) {
  const held = roundFile?.credentialOptions;
  if (!held) return skip("the round file has no credentialOptions (made before build chat 3): re-run create-test-records.mjs (--refresh at S1) or compare by hand");
  const differs = (roundFile?.report?.bcba?.differs || []).filter((p) => Object.hasOwn(EXPECTED_CREDENTIAL_LABELS, p));
  if (differs.length) return skip(`${differs.join(", ")} differs from the script value in the round read-back (a workflow changed it); compare by hand`);
  const options = Object.entries(held).flatMap(([property, list]) => (list || [])
    .filter((option) => !(removed && removed[0] === property && removed[1] === option))
    .map((option) => [property, option]));
  const unknown = options.filter(([property, option]) => !Object.hasOwn(EXPECTED_CREDENTIAL_LABELS[property] ?? {}, option));
  if (unknown.length) return skip(`option(s) with no expected label here: ${unknown.map(([p, o]) => `${p} "${o}"`).join(", ")}; compare by hand`);
  const want = [...new Set(options.map(([property, option]) => EXPECTED_CREDENTIAL_LABELS[property][option]).filter(Boolean))];
  return [labels(want, CREDENTIAL_GROUP)];
}

// CL5 funding labels are never sent (G19 L226). On client 5384589 (round 1) Zeke hand-adds Aetna NY
// 1082497 in S0, and BR19 keeps a hand-added label (CLB-104), so round 1 expects it held.
const FUNDING_LABELS = [1052532, 1052534, 1052620, 1082497, 1082498, 1107648, 1124247, 1124248, 1124249];
function fundingRows() {
  if (round !== 1) return { CL5: [labels([], FUNDING_LABELS)] };
  return {
    CL5: [labels([], FUNDING_LABELS.filter((id) => id !== 1082497))],
    "CLB-104 (hand-added Aetna NY kept)": [labels([1082497], [1082497])],
    "BR19 (hand-added School kept)": [labels([1052688], [1052688])]
  };
}
// CL4 group: the three staffing labels, the three retired ones and the parent 1156741 (CLB-154).
const STAFFING_GROUP = [1156741, 1156743, 1156746, 1156747, 1156742, 1156744, 1156745];

function caseCreate(ids, roundFile) {
  const differs = roundFile?.report?.deal?.differs || [];
  const blankMirrors = roundFile?.report?.deal?.blankMirrors || [];
  return {
    C1: skip("contact form on create: Log crCalls and the CR screen"),
    C2: [core("FirstName", "Zeke"), core("LastName", `Swanson Azure Test R${N}`)],
    C3: [core("DateOfBirth", pick("2016-01-15", "2017-02-16", "2018-03-17"), "date")],
    "C3 (blank DOB)": skip("extra R2 Case with no DOB: HS and Log check"),
    // R3: phi_gender blank on purpose (U2-6), so CR holds no gender.
    C4: [core("Gender", pick("Male", "Female", ""), "gender")],
    C5: [{ type: "lookup" }],
    // R3: the Guardian Contact has no email, phone or state at create (U2-6); R3-20 fills them in S4.
    C6: [core("PrimaryEmail", pick(`zeke+swanson_azure_test_${N}@optidge.com`, `zeke+swanson_azure_test_${N}@optidge.com`, ""), "ci")],
    C7: [core("GuardianFirstName", `Don Azure Test R${N}`), core("GuardianLastName", "Swanson")],
    // R3: stateregion blank, so StateProvince comes from `location` (item 5); ZIP blank (U2-6).
    C8: [core("AddressLine1", `${N}01 Azure Test St`), core("AddressLine2", `Apt ${N}A`), core("City", S.city),
      core("StateProvince", pick(S.code, S.code, ""), "state"), core("ZipPostalCode", pick(`${S.zip}1`, `${S.zip}1`, "")),
      core("PhoneCell", pick(phoneDigits("01"), phoneDigits("01"), ""), "digits")],
    C9: skip("not built (decision 36): Log check that PhoneHome is not in the payload"),
    C10: careCoordinatorRow(roundFile),
    C11: [meta(131314, `Zeke Swanson BCBA Azure Test R${N}`), meta(144602, `Zara Swanson BCBA2 Azure Test R${N}`)],
    // Items 9 and 10: the 247 BCBA + " BCBA LBA". R2's 247 BCBA is a Grad Permit holder with no 227
    // link at create: 131308 is not sent (warning grad_permit_supervisor_missing), so CR holds nothing,
    // and 136052 names the holder.
    C12: [meta(131308, pick(`Zeke Swanson BCBA Azure Test R${N} BCBA LBA`, "", `Zeke Swanson BCBA Azure Test R${N} BCBA LBA`))],
    C13: [meta(136052, pick("", `Zeke Swanson BCBA Azure Test R${N} Grad Permit Holder`, ""))],
    C14: [meta(131313, `Jane Swanson Azure Test R${N}`), meta(138092, `Jill Swanson Azure Test R${N}`)],
    C15: skip("item 10 roles: R1-U1 rows U-07 to U-13 (checked by hand per sub-push)"),
    C16: [meta(131314, `Zeke Swanson BCBA Azure Test R${N}`), meta(131313, `Jane Swanson Azure Test R${N}`)],
    C17: [meta(132304, `AzT ${N} Sched 1 Mon-Fri 9-12`), meta(138093, `AzT ${N} Sched 2 Sat 10-1`)],
    C18: skip("open (O-14): no CR field"),
    C19: [meta(126209, `AzT ${N} weekdays after 3pm`)], // item 7: the text alone
    // O-39 option a (Zeke 2026-11-21): the code sums the two hours, a blank counting as 0.
    C20: [meta(134331, pick("16", "11", "14"), "hours")],
    C21: skip("open (O-18)"),
    C22: [meta(132431, pick("8", "6", ""))],
    C23: [meta(134672, pick("11/01/2026 - 04/30/2027", "12/01/2026 - 05/31/2027", "01/01/2027 - 06/30/2027"))],
    C24: [meta(137697, caseServiceAddress())],
    C25: [meta(138091, pick("", "", `300 Second Site Ave, ${S.city} ${S.code} ${S.zip}6`))],
    C26: [meta(126214, pick(`AzT ${N} peanuts`, "None", ""))], // item 3 (built, uncommitted on 2026-11-24)
    C27: [meta(126207, pick("Aggression", "Elopement", "Mouthing Non Food Itemsth")), meta(132303, `AzT ${N} comorbid`)],
    C28: [meta(133826, pick("2", "1", "3")), meta(138378, `AzT ${N} parent note`)], // item 8: the digit
    C29: [meta(126210, pick("Medicaid FFS", `AzT ${N} other carrier`, "Aetna")), meta(131316, `AZT-${N}-INS1`)],
    C30: [meta(144600, pick("Cigna", `AzT ${N} other carrier 2`, "")), meta(144601, pick(`AZT-${N}-INS2`, `AZT-${N}-INS2`, ""))],
    C31: [meta(131151, `Dr AzT ${N} Medicaid 10000000${NN}`)], // item 4: one space, no comma
    C32: [meta(141233, `AZTMCD00${N}`)],
    C33: [meta(144793, pick(`Yes-F84.0, AzT ${N} dx note`, `Other, AzT ${N} dx note`, `Yes- Down's Syndrome, AzT ${N} dx note`))],
    C34: [meta(131195, pick("03/10/2025", "04/10/2025", "05/10/2025")), meta(138701, pick("04/11/2025", "05/11/2025", "06/11/2025"))],
    C35: [meta(138090, "Don Swanson"), meta(137667, "06/20/1985")],
    // referral_source is read-only in HubSpot; the round's read-back says whether the Case held it.
    // R2 pattern (Zeke 2026-11-23: "If Other send the Referral - Other to central reach"): the
    // Case holds Other (from the Guardian Contact) and `referral_other`, so Meta 126222 = that text.
    // Package item 2 is built (uncommitted on 2026-11-24); "Other" in CR means the deployed code is
    // not the pending build. Other rounds: the value as is ("Bassy-Americare" stays "Bassy-Americare").
    C36: blankMirrors.includes("referral_source")
      ? [meta(126222, "")]
      : slot === 1 && !blankMirrors.includes("referral_other") && !differs.includes("referral_other")
        ? [meta(126222, `AzT ${N} referral other`)]
        : slot === 2
          ? [meta(126222, "Other")] // R3-18: Other with no text (package item 2)
        : skip(slot === 1
          ? "referral_other is blank or differs in the round read-back (Other + blank is open); compare by hand"
          : "expected = the Case's referral_source as is, which this script does not read; compare by hand"),
    C37: [meta(138702, recordLink(TYPES.deal, ids.deal))],
    C38: skip("open (O-19)"),
    // R3: no state at create (U2-6), so no state label; NJ Client comes with R3-20 in S4.
    CL1: [labels(pick([1082499], [1132648], []), [1082499, 1132648, 1132647])],
    CL2: [labels(pick([1052656], [], [1052656]), [1052656])],
    CL3: differs.includes("case_status")
      ? skip("case_status differs from the script value in the round read-back; check by hand")
      : [labels([pick(1125427, 1121488, 1125427)], [1125427, 1121488])],
    CL4: differs.includes("staffing_status")
      ? skip("staffing_status differs from the script value in the round read-back; check by hand")
      : [labels([pick(1156746, 1156743, 1156747)], STAFFING_GROUP)],
    ...fundingRows(),
    CL6: [labels([1052619], [1052619])]
  };
}

// externalId: the External System ID CR should hold (the Workday ID, or the HubSpot record ID).
function bcbaCreate(ids, roundFile, externalId) {
  return {
    B1: skip("contact form Admin: read on the CR screen"),
    B2: [core("externalSystemId", externalId)],
    B3: [core("firstName", "Zeke"), core("lastName", `Swanson BCBA Azure Test R${N}`)],
    // Source: the BCBA `email` (decision 49), set on the BCBA's Contact and mirrored to the BCBA
    // (Zeke 2026-11-23: "set it on the BCBA's contact"). Expected: the BCBA Contact email.
    B4: [core("primaryEmail", `zeke+bcba_azure_test_${N}@optidge.com`, "ci")],
    // Source: `date_of_birth` as text, converted by the code (build package item 1, replacing
    // decision 48's `dob`): R1 "1/15/1990", R2 "Feb 16, 1991", R3 blank (the placeholder on the
    // create). Never 1975-03-09 (the `dob` decoy: the code read `dob`) and never 1980-07-04 (the
    // old decoy still in `date_of_birth`: the round was not re-run with --write after item 1).
    B5: [core("dateOfBirth", pick("1990-01-15", "1991-02-16", "2000-01-01"), "date")],
    B6: [core("gender", pick("Male", "Female", "Male"), "gender")],
    B7: [core("addressLine1", `${N}04 Azure BCBA St`), core("addressLine2", `Apt ${N}B`), core("city", S.city),
      core("stateProvince", S.code, "state"), core("zipPostalCode", `${S.zip}3`),
      core("phoneCell", phoneDigits("04"), "digits")],
    B8: [meta(126216, `AZTNY00${N}`), meta(138112, `AZTNJ00${N}`), meta(138113, `AZTCO00${N}`)],
    // Source: the BCBA's own `personal_email` (decision 50), never `email` (B4's value).
    B9: [meta(138069, `zeke+bcba_personal_${N}@optidge.com`, "ci")],
    B10: [labels(pick([1132653], [], [1132653]), [1132653])],
    B11: careCoordinatorRow(roundFile, "bcba", 140495),
    B12: [meta(138703, recordLink(TYPES.bcba, ids.bcba))],
    B13: [meta(134444, "")],
    BL1: [labels([1130668], [1130668])],
    BL2: [labels(pick([1132655], [1107687, 1132655], [1107686]), [1132655, 1107687, 1107686])],
    BL3: skip("deferred (Zeke 2026-11-23): no New Mexico label"),
    BL4: [labels(pick([1124245, 1052629], [1124246, 1092164], [1124246, 1124245]), [1124246, 1124245, 1052629, 1092164])],
    BL5: [labels(pick([1107647], [], []), [1107647])],
    // Build chat 3 item 3: the credential labels are sent (was: none, decision 25).
    BL6: credentialRow(roundFile),
    BL7: [labels(pick([1103437], [], []), [1103437])],
    BL8: [labels([1052618, 1052643], [1052618, 1052643])],
    // CLB-155, LBL-013: a staffing label is a client label; no employee ever holds one.
    "BL8 (no staffing label)": [labels([], [1156743, 1156746, 1156747])]
  };
}

// T7 (question 13): `active_cases_count` blank in HubSpot sends nothing (buildEmployeePayload.mjs
// activeCaseCount), so the check is SKIP when the round read-back lists it as a blank mirror.
function activeCasesRow(roundFile, want) {
  if ((roundFile?.report?.bt1?.blankMirrors || []).includes("active_cases_count")) {
    return skip("active_cases_count blank in HubSpot at the read-back: nothing is sent (question 13; set it or fix the workflow)");
  }
  if (!roundFile?.report?.bt1) return skip("no bt1 read-back in the round file");
  return [meta(147882, want)];
}

function btCreate(ids, roundFile, externalId) {
  // T2 date of birth: the BT/RBT `date_of_birth`, synced from its Contact, read as text (item 16):
  // R1 "2/20/1992", R2 "1993-03-21", R3 blank (the placeholder on the create).
  return {
    T1: skip("contact form (Behavior Technician NY in R1 / R3, RBT CO in R2): read on the CR screen"),
    T2: [core("externalSystemId", externalId), core("firstName", "Jane"), core("lastName", `Swanson Azure Test R${N}`),
      core("primaryEmail", `zeke+bt_azure_test_${N}@optidge.com`, "ci"),
      core("dateOfBirth", pick("1992-02-20", "1993-03-21", "2000-01-01"), "date")],
    T3: [core("gender", pick("Female", "Male", "Female"), "gender")],
    T4: [core("addressLine1", `${N}03 Azure BT St`), core("city", S.city), core("stateProvince", S.code, "state"),
      core("zipPostalCode", `${S.zip}4`), core("phoneCell", phoneDigits("03"), "digits")],
    T5: [core("addressLine2", `Apt ${N}C`)],
    T6: [meta(133819, `${N}05 Work Plaza, Suite ${N}, ${S.city}, ${S.code} ${S.zip}5`)],
    T7: activeCasesRow(roundFile, pick("1", "0", "1")), // automated count: read it again if the Case changed later
    T8: [meta(138703, recordLink(TYPES.bt, ids.bt1))],
    T9: skip("held (Zeke 2026-11-23): confirm the BT/RBT personal email field with Danny and the client (O-51)"),
    // B11-5 (spec A4.8): a BT/RBT never gets the BCBA Care Coordinator field.
    "B11-5 (no 140495 on a BT/RBT)": [meta(140495, "")],
    // R3 (2026-11-24): New Jersey only at create; R3-U1 adds New York by hand (R3-7).
    TL1: [labels(pick([1132655], [1107687], [1107686]), [1132655, 1107687, 1107686])],
    TL2: skip("deferred (Zeke 2026-11-23): no Virginia label"),
    // R3: a BT in New Jersey only -> BT NJ 1132652; the NY labels the form set are removed.
    TL3: [labels(pick([1052630], [1132650], [1132652]), [1052630, 1132652, 1132650, 1052631, 1132651, 1107692])],
    TL4: [labels([1052618, 1052643], [1052618, 1052643])],
    "TL4 (no staffing label)": [labels([], [1156743, 1156746, 1156747])]
  };
}

// ---- --step u1: round 1 after the retest run sheet step S4 (the webhook update push) ----
// Values: the matrix U1 column and run sheet S4 (2026-11-24). A field that a later step (S5 to S8)
// changes again, or whose stored option text is not known here, is SKIP: check it by hand at that
// step and paste the line in the round log.
const later = (what) => skip(`changed again in a later step (${what}); check by hand there`);

function caseU1(ids, roundFile) {
  return {
    C2: [core("FirstName", "Zeke"), core("LastName", "Swanson Azure Test R1 U1")],
    C3: [core("DateOfBirth", "2016-01-16", "date")],
    C4: [core("Gender", "Female", "gender")],
    C6: [core("PrimaryEmail", "zeke+swanson_azure_test_1_u1@optidge.com", "ci")],
    C7: [core("GuardianFirstName", "Ron Azure Test R1"), core("GuardianLastName", "Swanson U1")],
    // X07b-1 (review B): `location_city` -> "New York U1", `postal_code` -> "10011" in S4.
    C8: [core("AddressLine1", "101 Azure Test St U1"), core("City", "New York U1"), core("StateProvince", "NY", "state"),
      core("ZipPostalCode", "10011"), core("PhoneCell", "2125550121", "digits")],
    // U-49: owner -> 167266469 with no Team Member: missing_match, 138851 not sent, CR keeps the S1
    // value, which is the three-line value of the round read-back (build chat 3 item 2; was "Zeke Swanson").
    C10: careCoordinatorRow(roundFile),
    C11: later("S5e: RE removed; BR17 relabel"),
    C12: later("S5a-S5d and S6: item 10 roles, typed supplier"),
    C14: later("S5a-S5f: Outgoing BT roles, swap"),
    C17: [meta(132304, "AzT 1 Sched 1 Mon-Fri 9-12 U1"), meta(138093, "AzT 1 Sched 2 Sat 10-1 U1")],
    C19: [meta(126209, "AzT 1 weekdays after 3pm U1")],
    C20: [meta(134331, "17", "hours")],
    C22: [meta(132431, "6")],
    C23: [meta(134672, "04/30/2027")],
    C24: [meta(137697, "200 Service Rd Suite 1\nNew York NY 10002")],
    C26: [meta(126214, "None")],
    C27: [meta(126207, "Other"), meta(132303, "AzT 1 comorbid")],
    C28: later("S7: severity Level 3 with Entered blank (old line 76)"),
    C29: skip("U1 UHC: the stored option text is not known here; compare by hand"),
    C30: skip("U1 Beacon-Carelon: the stored option text is not known here; compare by hand"),
    C31: [meta(131151, "Dr AzT 1 Commercial 2000000001")],
    C32: [meta(141233, "AZTMCD001U1")],
    C33: [meta(144793, "Unsure, AzT 1 dx note")],
    C34: [meta(131195, "03/11/2025"), meta(138701, "04/12/2025")],
    C35: [meta(138090, "Don Swanson"), meta(137667, "06/21/1985")],
    C37: [meta(138702, recordLink(TYPES.deal, ids.deal))],
    // CL1: the Guardian location -> New Jersey (old lines 70-71). CL2: Other Location -> no Home.
    // CL3: Cold -> In-Active. CL4: Hot Lead -> no staffing label; hand-added Pending 1156742 gone.
    CL1: [labels([1132647], [1082499, 1132648, 1132647])],
    CL2: [labels([], [1052656])],
    CL3: [labels([1121488], [1125427, 1121488])],
    CL4: [labels([], STAFFING_GROUP)],
    ...fundingRows(),
    CL6: [labels([1052619], [1052619])]
  };
}

function bcbaU1(ids, roundFile, externalId) {
  return {
    B2: [core("externalSystemId", externalId)],
    B3: [core("firstName", "Zeke"), core("lastName", "Swanson BCBA Azure Test R1 U1")],
    B4: [core("primaryEmail", "zeke+bcba_azure_test_1_u1@optidge.com", "ci")], // O-11: first changed email
    B5: [core("dateOfBirth", "1990-01-15", "date")],
    B6: [core("gender", "Female", "gender")],
    // X07b-2 (review B): BCBA Contact `phone` -> "(212) 555-0144" in S4.
    B7: [core("addressLine1", "104 Azure BCBA St U1"), core("phoneCell", "2125550144", "digits")],
    B8: [meta(126216, ""), meta(138112, "AZTNJ001"), meta(138113, "AZTCO001A")], // S2 edit,
    B9: later("S5a: personal_email U1 (old line 16); S8a U2-7a clears it (Meta 138069 \"\")"),
    B10: [labels([], [1132653])],
    // B11-4 (S4): owner -> 167266469 (no Team Member) -> missing_match: 140495 not sent, CR keeps the
    // S1 three-line value of the round read-back.
    B11: careCoordinatorRow(roundFile, "bcba", 140495),
    B12: [meta(138703, recordLink(TYPES.bcba, ids.bcba))],
    BL1: [labels([1130668], [1130668])],
    BL2: [labels([1107686], [1132655, 1107687, 1107686])],
    // In Process licence and assign_states -> Assign NY (U-22): no LBA NY, no BCBA LBA NJ.
    BL4: [labels([], [1124246, 1124245, 1052629, 1092164])],
    BL5: later("U-46: the payor-status workflow sets ny_insurance_labels; check by hand"),
    BL6: later("U-46 / old line 28 change ny_insurance_labels (Cigna-NY, Carelon-NY are managed too); check by hand"),
    BL7: [labels([], [1103437])],
    BL8: [labels([1052618, 1052643], [1052618, 1052643])]
  };
}

function btU1(ids, roundFile, externalId) {
  return {
    // U-36 S4 list (review B 2.2): first_name "Jane" -> "Janet".
    T2: [core("externalSystemId", externalId), core("firstName", "Janet"), core("lastName", "Swanson Azure Test R1 U1"),
      core("primaryEmail", "zeke+bt_azure_test_1_u1@optidge.com", "ci")],
    // U-33: the BT/RBT 1 Contact values of run sheet S4.
    "T2 (U-33 date of birth)": [core("dateOfBirth", "1992-03-21", "date")],
    T3: [core("gender", "Male", "gender")],
    T4: [core("addressLine1", "103 Azure BT St U1"), core("stateProvince", "NJ", "state"),
      core("zipPostalCode", "10006"), core("phoneCell", "2125550123", "digits")],
    T5: [core("addressLine2", "")],
    // U-36 S4 list: work street, apartment, city, state, ZIP; buildEmployeePayload.mjs T6 form
    // "street, apartment, city, state zip". S5a blanks apartment__work later (old line 4).
    T6: [meta(133819, "105 Work Plaza U1, Suite 1 U1, New York U1, NJ 10015")],
    T8: [meta(138703, recordLink(TYPES.bt, ids.bt1))],
    // U-21b (review B A, B): old lines 10 + 12 in S4: RBT in Colorado only -> CO Employee 1107687,
    // RBT CO 1107692; NY Employee 1132655, BT NY 1052630, RBT NY 1052631 absent.
    TL1: [labels([1107687], [1132655, 1107687, 1107686])],
    TL3: [labels([1107692], [1052630, 1132652, 1132650, 1052631, 1132651, 1107692])],
    TL4: [labels([1052618, 1052643], [1052618, 1052643])]
  };
}

// ---- --step u1, rounds 2 and 3: after S4 (review C C5). The create values with the S4 changes laid
// over them (run sheet S4 CO / NJ lists, matrix rows R2-10, R2-11, R2-14a, R2-23c, R2-23g, R2-29,
// MIR-1, R3-13a, R3-13c, R3-13e, R3-17, R3-20, R2-27 (moved to NJ: C25 junk Address 2)).
// Association-driven names on R2 (X07b-1b: RE, IA -> Supervising, Primary BT 2) are SKIP: they
// follow the C11 / C12 / C14 rules and are compared by hand.
function caseU1Later(ids, roundFile) {
  const base = caseCreate(ids, roundFile);
  if (round === 2) {
    return {
      ...base,
      // R2-23g: Guardian Contact `phone` -> "303-555-0221" (Case sync `phone`) -> 10 digits.
      C8: [core("AddressLine1", "201 Azure Test St"), core("AddressLine2", "Apt 2A"), core("City", "Denver"),
        core("StateProvince", "CO", "state"), core("ZipPostalCode", "80201"), core("PhoneCell", "3035550221", "digits")],
      C11: skip("X07b-1b association edits: compare 131314 / 144602 by hand per C11"),
      C12: skip("X07b-1b association edits: compare 131308 by hand per C12 (rule 7 if two 247 BCBAs)"),
      C13: skip("X07b-1b association edits: compare 136052 by hand per C12 / C13"),
      C14: skip("X07b-1b association edits: compare 131313 / 138092 by hand per C14"),
      C16: skip("X07b-1b association edits: see C11 / C14"),
      // R2-29 split: `service__street_address` "200 Service Rd, Denver, CO 80202".
      C24: [meta(137697, "200 Service Rd Suite 2\nDenver CO 80202")],
      CL3: [labels([1125427], [1125427, 1121488])], // R2-11 Cold -> Warm
      CL4: [labels([1156746], STAFFING_GROUP)] // R2-10 97151 Services -> Staffed 97153
    };
  }
  return {
    ...base,
    // R3-20: Guardian Contact email (R3 pattern), phone "973-555-0301 x12", location / state New Jersey.
    C6: [core("PrimaryEmail", "zeke+swanson_azure_test_3@optidge.com", "ci")],
    C8: [core("AddressLine1", "301 Azure Test St"), core("AddressLine2", "Apt 3A"), core("City", "Newark"),
      core("StateProvince", "NJ", "state"), core("ZipPostalCode", ""), core("PhoneCell", "9735550301", "digits")],
    C24: [meta(137697, "301 Azure Test St Apt 3A\nNewark NJ")],
    // R2-27 moved to NJ (recency audit 2.6): `service_address__other` -> ",  , New Jersey " -> null -> cleared.
    C25: [meta(138091, "")],
    C26: [meta(126214, "Yes")], // R3-17: Confirmed + "NA"
    C28: [meta(133826, "3"), meta(138378, "AzT 3 parent note U1")], // R3-13a
    CL1: [labels([1132647], [1082499, 1132648, 1132647])]
  };
}

function bcbaU1Later(ids, roundFile, externalId) {
  const base = bcbaCreate(ids, roundFile, externalId);
  return round === 2
    ? { ...base, // R2-23c medicaid_id__co; MIR-1 BCBA Contact address
      B7: [core("addressLine1", "204 Azure BCBA St U1"), core("addressLine2", "Apt 2B"), core("city", "Denver"),
        core("stateProvince", "CO", "state"), core("zipPostalCode", "80203"), core("phoneCell", phoneDigits("04"), "digits")],
      B8: [meta(126216, "AZTNY002"), meta(138112, "AZTNJ002"), meta(138113, "AZTCO002A")],
      // BL6-U1 (S4): Carelon-CO removed from co_insurance_labels -> Carelon 1132654 gone (managed).
      BL6: credentialRow(roundFile, ["co_insurance_labels", "Carelon-CO"]) }
    : { ...base, B8: [meta(126216, "AZTNY003"), meta(138112, "AZTNJ003A"), meta(138113, "AZTCO003")], // R3-13c
      // BL6-U2 (S4): NJ `Aetna` removed from nj_insurance_labels -> Aetna 1107649 gone (managed). If the
      // round file shows Aetna was not set (fallback), S4 adds Horizon-NJ instead: no label either way.
      BL6: credentialRow(roundFile, ["nj_insurance_labels", "Aetna"]) };
}

function btU1Later(ids, roundFile, externalId) {
  const base = btCreate(ids, roundFile, externalId);
  return round === 2
    ? { ...base, T5: [core("addressLine2", "Apt 2C U1")] } // R2-14a; ESID still the HubSpot ID (R2-14 `waiting`)
    : { ...base, T5: [core("addressLine2", "Apt 3C U1")], // R3-13e
      T4: [core("addressLine1", "303 Azure BT St"), core("city", "Newark"), core("stateProvince", "NJ", "state"),
        // MIR-1 (corrected 2026-11-24): the create already holds 07104, so S4 sets the Contact zip to 07108.
        core("zipPostalCode", "07108"), core("phoneCell", phoneDigits("03"), "digits")] };
}

// ---- --unmapped (UW-1, UW-2; risk N1) ----
// The keys of `contact` the integration maps (read spelling, camelCase). Everything else is "unmapped".
const MAPPED_READ_KEYS = {
  employee: ["contactId", "externalSystemId", "firstName", "lastName", "gender", "dateOfBirth", "primaryEmail",
    "addressLine1", "addressLine2", "city", "stateProvince", "zipPostalCode", "phoneCell"],
  client: ["contactId", "externalSystemId", "firstName", "lastName", "gender", "dateOfBirth", "primaryEmail",
    "phoneCell", "addressLine1", "addressLine2", "city", "stateProvince", "zipPostalCode", "guardianFirstName",
    "guardianLastName"]
};
function shapeOf(value) {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `list(${value.length})`;
  if (typeof value === "object") return `object(${Object.keys(value).length})`;
  if (typeof value === "string") return `text(${value.length})`;
  return typeof value;
}
const isEmpty = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length);

// Row UW-3 (the SSN guard, apply-recheck 2026-11-24): the same rule as the build's guard
// (unsendableSsnKey, src/lib/mappedState.mjs). Prints the result only, never the value: absent,
// blank, sendable (9 digits or 3-2-4), or NOT SENDABLE (every core update of this record would end
// `error` CR_EMPLOYEE_READ_FAILED / CR_CLIENT_READ_FAILED naming contact.ssn: stop, tell Zeke).
function ssnShapeLine(kind, c) {
  const keys = Object.keys(c).filter((k) => k.toLowerCase() === "ssn");
  if (!keys.length) return "SSN shape: absent (sendable)";
  if (keys.every((k) => c[k] === null || c[k] === undefined || c[k] === "")) return "SSN shape: blank (sendable)";
  const bad = unsendableSsnKey(c);
  return bad
    ? `SSN shape: NOT SENDABLE (contact.${bad}, ${shapeOf(c[bad])}): a core update would end error ` +
      `${kind === "client" ? "CR_CLIENT_READ_FAILED" : "CR_EMPLOYEE_READ_FAILED"}. STOP (run sheet S0, UW-3)`
    : "SSN shape: filled, 9 digits or 3-2-4 (sendable)";
}
const digest = (v) => createHash("sha256").update(JSON.stringify(v ?? null)).digest("hex").slice(0, 16);

function unmappedCheck(kind, crId, contactAnswer) {
  const c = contactAnswer?.contact && typeof contactAnswer.contact === "object" ? contactAnswer.contact : contactAnswer || {};
  const mapped = new Set(MAPPED_READ_KEYS[kind].map((k) => k.toLowerCase()));
  const now = Object.fromEntries(Object.entries(c).filter(([k]) => !mapped.has(k.toLowerCase()))
    .map(([k, v]) => [k, { shape: shapeOf(v), hash: digest(v), empty: isEmpty(v) }]));
  const file = join(tmpdir(), `cr-unmapped-baseline-${kind}-${crId}.json`);
  console.log(ssnShapeLine(kind, c));
  if (UNMAPPED === "save") {
    writeFileSync(file, JSON.stringify(now, null, 2), { mode: 0o600 });
    const filled = Object.entries(now).filter(([, x]) => !x.empty).map(([k, x]) => `${k}:${x.shape}`);
    console.log(`Baseline of ${Object.keys(now).length} unmapped keys saved (shapes and short hashes only): ${file}`);
    console.log(`Filled now: ${filled.join(", ") || "none"}`);
    if (!filled.length) {
      console.log("No unmapped key holds a value: set the markers on the CR screen first (UW-1 / UW-2), then save again.");
      process.exitCode = 1;
    }
    return;
  }
  if (!existsSync(file)) throw new Error(`No baseline for ${kind} ${crId}: run --unmapped save before the push.`);
  const before = JSON.parse(readFileSync(file, "utf8"));
  let lost = 0;
  console.log("key | result | shape before -> after");
  for (const key of [...new Set([...Object.keys(before), ...Object.keys(now)])].sort()) {
    const b = before[key];
    const a = now[key];
    let result = "equal";
    if (!a) result = b.empty ? "equal (absent, was empty)" : "ABSENT";
    else if (!b) result = "new key";
    else if (b.hash !== a.hash) result = !b.empty && a.empty ? "BLANKED" : "CHANGED";
    if (["ABSENT", "BLANKED", "CHANGED"].includes(result)) lost += 1;
    console.log(`  ${key} | ${result} | ${b?.shape ?? "-"} -> ${a?.shape ?? "-"}`);
  }
  console.log(`\nUNMAPPED_KEPT = ${lost ? "no" : "yes"}${lost ? ` (${lost} key(s) blanked, changed or absent: STOP, run sheet stop rule N1)` : ""}`);
  if (lost) process.exitCode = 1;
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
// C10 / B11: a line holding "@" (the coordinator email) becomes "sha256:<hash of that exact line>".
const hashEmailLines = (value) => String(value ?? "").split("\n")
  .map((line) => (line.includes("@") ? `sha256:${createHash("sha256").update(line).digest("hex")}` : line)).join("\n");
function normalize(value, kind) {
  if (kind === "exact" || kind === "coordinator") return String(value ?? ""); // line breaks and spaces kept
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (kind === "ci") return text.toLowerCase();
  // The code sends exactly the 10 digits (decision 46), so a leading 1 in CR is a FAIL.
  if (kind === "digits") return text.replace(/\D+/g, "");
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
  const raw = found === null || found === undefined ? "" : String(found);
  const got = row.kind === "coordinator" ? hashEmailLines(raw) : raw; // never print the address
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

// ---- --fresh-label-read (row R6-1) ----
// The integration's fresh label read (src/lib/centralReachClient.mjs FRESH_LABEL_READ_HEADERS and
// readContactLabelIds: both headers and a throwaway `_t` on ONE request). Copied, not imported: that
// module is not exported this constant. Only test employee 5338681.
const FRESH_READ_CONTACT = "5338681";
const FRESH_LABEL_READ_HEADERS = { "Cache-Control": "no-cache", Pragma: "no-cache" };
async function freshLabelRead() {
  if (!args.includes("--run")) {
    console.log(`DRY RUN (R6-1): would request a token, then ONE GET /contacts/${FRESH_READ_CONTACT}/labels?_t=<ms> ` +
      "with Cache-Control: no-cache and Pragma: no-cache (2 CentralReach calls, read-only). Nothing was sent. " +
      "Add --run only when label testing resumes (Zeke's word).");
    return;
  }
  SETTINGS = loadSettings();
  token = await getToken();
  const url = `${SETTINGS.CR_BASE_URL.replace(/\/+$/, "")}/contacts/${FRESH_READ_CONTACT}/labels?_t=${Date.now()}`;
  const res = await guardedFetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, "x-api-key": SETTINGS.CR_API_KEY, Accept: "application/json",
      ...FRESH_LABEL_READ_HEADERS }
  });
  const body = res.ok ? await res.json().catch(() => null) : null;
  const held = readLabelIds(body);
  const pass = res.status === 200 && held !== null;
  report(pass ? "PASS" : "FAIL", "R6-1", `combined fresh label read (headers + _t) on test employee ${FRESH_READ_CONTACT}: ` +
    `HTTP ${res.status}, ${held ? `labels [${held.join(", ")}]` : "answer is not a readable label list"}`);
  console.log("The screen-edit case of R-6 stays unproven (label testing paused on Zeke's word).");
  if (!pass) process.exitCode = 1;
}

// ---- Main ----
async function main() {
  if (FRESH_LABEL_READ) {
    await freshLabelRead();
    return;
  }
  const roundPath = resolve(`docs/workstreams/architecture-update/sandbox-rounds/round-${N}.json`);
  const roundFile = JSON.parse(readFileSync(roundPath, "utf8"));
  const ids = roundFile.ids || {};
  const hsId = { case: ids.deal, bcba: ids.bcba, bt1: ids.bt1 }[recordName];
  if (!hsId) throw new Error(`round-${N}.json has no HubSpot ID for ${recordName}.`);
  const kind = recordName === "case" ? "client" : "employee";
  // An employee's Workday ID, when its HubSpot record has one: --workday-id, else the round file.
  // Blank (and always for the Case): the External System ID is the HubSpot record ID.
  const workdayId = kind === "employee"
    ? String(workdayIdOverride ?? roundFile.workdayIds?.[recordName] ?? "").trim()
    : "";
  const externalId = workdayId || hsId;
  const idSource = workdayId ? "the Workday ID" : "the HubSpot record ID";

  SETTINGS = loadSettings();
  token = await getToken();
  console.log(`Round ${N} (${S.name}), ${recordName} (HubSpot ${hsId}), step ${step}. Read-only GETs.`);
  console.log(`External System ID expected: ${externalId} (${idSource}).\n`);

  // The integration's own lookup: by the External System ID the record was created with or holds.
  const lookup = await crGet(
    `/contacts/${kind}/byExternalSystemId?ExternalSystemId=${encodeURIComponent(externalId)}`,
    `/contacts/${kind}/byExternalSystemId`
  );
  const lookedUpId = /^\d+$/.test(String(lookup?.contact?.contactId ?? "")) ? String(lookup.contact.contactId) : null;
  const crId = crIdOverride || lookedUpId;
  if (!crId) {
    throw new Error(`No CR ${kind} holds External System ID ${externalId} (${idSource}). ` +
      (workdayId ? "If CR still holds the temporary ID, the round file or --workday-id is ahead of CR. " : "") +
      "Give --cr-id if you know it.");
  }
  if (crIdOverride && lookedUpId !== crIdOverride) {
    console.log(`Note: the lookup by External System ID ${externalId} found ${lookedUpId ?? "nothing"}, not --cr-id ${crIdOverride}.`);
  }
  console.log(`CR contact ${crId}.\n`);

  const contact = await crGet(`/contacts/${kind}/${crId}`, `/contacts/${kind}/{id}`);
  if (!contact) throw new Error(`GET /contacts/${kind}/{id} answered 404.`);
  if (UNMAPPED) {
    const rootEarly = contact?.contact && typeof contact.contact === "object" ? contact : { contact };
    const last = findField(rootEarly, kind === "client" ? "LastName" : "lastName");
    if (!String(last?.value ?? "").includes(TEST_MARKER) && !(!workdayId && lookedUpId === crId)) {
      throw new Error(`CR ${crId} is not confirmed as a test record. Nothing compared.`);
    }
    unmappedCheck(kind, crId, contact);
    return;
  }
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
  // A HubSpot record ID is the test record's own, so that lookup confirms it. A Workday ID could
  // also be a real employee's, so that lookup does not: the last name must hold the marker.
  const hasMarker = String(lastName?.value ?? "").includes(TEST_MARKER);
  const isTestRecord = hasMarker || (!workdayId && lookedUpId === crId);

  const sets = step !== "u1" ? { case: caseCreate, bcba: bcbaCreate, bt1: btCreate }
    : round === 1 ? { case: caseU1, bcba: bcbaU1, bt1: btU1 } : { case: caseU1Later, bcba: bcbaU1Later, bt1: btU1Later };
  const rows = sets[recordName](ids, roundFile, externalId);
  let showKeys = SHOW_KEYS || !metadata || !held;
  if (!isTestRecord) {
    console.log(`Stopped: CR ${crId} is not confirmed as a test record (no "${TEST_MARKER}" in the last name` +
      `${workdayId ? "" : " and the lookup differs"}). No value is printed; key names follow.`);
    showKeys = true;
    counts.FAIL += 1;
  } else {
    for (const [id, list] of Object.entries(rows)) {
      for (const row of Array.isArray(list) ? list : [list]) {
        if (row.type === "skip") report("SKIP", id, row.reason);
        else if (row.type === "lookup") {
          report(lookedUpId === crId ? "PASS" : "FAIL", id,
            `lookup by External System ID ${externalId} expected "${crId}" got "${lookedUpId ?? ""}"`);
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
