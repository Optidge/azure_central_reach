// Creates one sandbox test round (BUILD-PLAN 7.1 and 7.2) from the values in
// docs/workstreams/architecture-update/sandbox-test-matrix.md.
//
// SANDBOX ONLY. Before any call it checks that the token belongs to portal 52311591 and that the
// account is a SANDBOX; otherwise it stops. HubSpot production is never written (hard stop 3).
// It never calls CentralReach or Azure. Every record gets sandbox_test_field = true at create;
// Entered in CentralReach is left blank, so nothing is pushed until Zeke sets it.
//
// Usage (from the repo root):
//   node scripts/sandbox/create-test-records.mjs --round 1            plan only: no write
//   node scripts/sandbox/create-test-records.mjs --round 1 --write    create, associate, read back
//   node scripts/sandbox/create-test-records.mjs --round 2 --grad-permit-link [--write]
//       R2-5 only (retest run sheet S5a): links the round's BCBA (a Grad Permit holder) to BCBA 2
//       with the BCBA -> BCBA type 227 "Grad Permit Supervisor" from the holder's side, then reads
//       which type the holder side lists (227 expected; 226 means the label direction is reversed).
//       Plan mode prints the label only. Nothing else is written.
//   node scripts/sandbox/create-test-records.mjs --round 1 --write --refresh
//       A round that already has round-N.json is a RE-RUN: it puts the round's create values back on
//       records that may already be linked to CentralReach, and with webhooks live that is a CR write.
//       --write on such a round stops unless --refresh is given (review C B6). Give --refresh only at
//       run sheet step S1, only after the pending build is confirmed deployed (S0 pre-flight P-1),
//       never after the round's update steps have started, whatever the poller state.
//   node scripts/sandbox/create-test-records.mjs --census
//       READ-ONLY (search POSTs and GETs only). Run sheet S0 / S3 / S3e checks: (1) every sandbox Case,
//       BCBA and BT/RBT holding centralreach_creates_only or centralreach_updates_only; (2) every
//       unlinked record (no CR ID) with Entered = Yes and sandbox_test_field = true; (3) sandbox holders
//       of the planned Workday test IDs. Records saved in a round or hand-made file are marked
//       "planned"; anything else is "NOT PLANNED" (stop and tell Zeke). Prints record IDs only.
//   node scripts/sandbox/create-test-records.mjs --round 2 --handmade [--write]
//       The hand-made records of the round's pattern (review C B4: one record per leg, each missing
//       exactly one required field from the moment it is created; Entered blank, so nothing is pushed
//       until the run sheet sets Entered LAST). Round 2 pattern: R2-30, X02-1, X02-3, X01-4, X04-3a,
//       X04-3b. Round 3: R3-5, X03-1a, X03-1b. Round 1: U-26, U-32 (also X07a-1, X07a-10), U-44.
//       IDs go to sandbox-rounds/handmade-rN.json.
//
// Rounds of the 2026-11-24 retest: 1, 2, 4 (re-runs with --refresh), 3 (new), and the create sets of
// review A S-1 (Zeke 2026-11-24): 5 = R2b (CO pattern), 6 = R3b (NJ pattern), 7 = R1b (NY pattern),
// 10 = R1c (NY pattern, NY webhook creates on the pending build). Rounds 5 to 7 have no Workday ID
// (temporary-ID creates); round 10 creates BT/RBT 1 with one (re-check G1: the only BT/RBT
// Workday-filled create by webhook on the pending build) and leaves its BCBA temporary (re-check G2:
// Zeke sets bcbaLater in S4). Rounds 5 to 10 are created with the creates box ticked.
//
// Workday IDs (WORKDAY_ROUNDS below; 7 digits, build package item 15): round 4 (R-WD) creates
// BT/RBT 1 with one; round 2 creates the BCBA with one (R2-2); round 3 creates BT/RBT 1 with one
// (X07a-2); round 10 creates BT/RBT 1 with one (R1c-3). Other records leave it blank (the
// temporary-ID test). The script never clears
// `workday_id` on a re-run.
//
// The token is HUBSPOT_PRIVATE_APP_TOKEN from local.settings.json, read at run time, never printed.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const SANDBOX_PORTAL = "52311591";
const TYPES = { deal: "0-3", contact: "0-1", bcba: "2-72890322", bt: "2-72890325" };
const OWNER_ID = "161391908";
const ROUNDS_DIR = "docs/workstreams/architecture-update/sandbox-rounds";

const args = process.argv.slice(2);
const CENSUS = args.includes("--census");
const round = CENSUS ? 1 : Number(args[args.indexOf("--round") + 1]);
const WRITE = args.includes("--write") && !CENSUS;
const REFRESH = args.includes("--refresh");
const HANDMADE = args.includes("--handmade");
const GRAD_PERMIT_LINK = args.includes("--grad-permit-link");
// Sandbox BCBA -> BCBA "Grad Permit Supervisor (supervises this BCBA)", read from the holder's side
// (src/lib/config.mjs gradPermitSupervisorAssociationTypeId).
const GRAD_PERMIT_SUPERVISOR_TYPE = 227;
// R2-8 (C16): never-synced Case -> staff types, sandbox: Previous IA BCBA 235, Potential BT 2 218
// (src/lib/config.mjs excludedStaffingAssociationTypeIds). Found by type ID, not by label name.
const PREVIOUS_IA_TYPE = 235;
const POTENTIAL_BT2_TYPE = 218;
if (!Number.isInteger(round) || round < 1 || round > 99) {
  console.error("Give --round N (1 to 99).");
  process.exit(1);
}
if (args.includes("--workday")) {
  console.error("--workday was removed (2026-11-23): round 4 (R-WD) sets workday_id by itself.");
  process.exit(1);
}

function loadToken() {
  const settings = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"));
  const token = settings?.Values?.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN is not in local.settings.json");
  return token;
}
const TOKEN = loadToken();

// A CRM search is a POST but reads only; plan and census modes allow it and nothing else.
const isSearch = (method, path) => method === "POST" && /^\/crm\/v3\/objects\/[A-Za-z0-9_-]+\/search$/.test(path);
async function hs(method, path, body) {
  if (!WRITE && method !== "GET" && !isSearch(method, path)) throw new Error(`Plan mode: refused ${method} ${path}`);
  await new Promise((r) => setTimeout(r, 120));
  const res = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> HTTP ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

// ---- Values (sandbox-test-matrix.md, columns R1 / R2 / R3) ----
const N = String(round);
const NN = N.padStart(2, "0");
const STATES = [
  { name: "New York", code: "NY", city: "New York", area: "212", zip: "1000", gender: ["male", "female"] },
  { name: "Colorado", code: "CO", city: "Denver", area: "303", zip: "8020", gender: ["female", "male"] },
  { name: "New Jersey", code: "NJ", city: "Newark", area: "973", zip: "0710", gender: ["male", "female"] }
];
const slot = (round - 1) % 3; // R1 pattern, R2 pattern, R3 pattern
const S = STATES[slot];
const pick = (r1, r2, r3) => [r1, r2, r3][slot];

// R-WD, one split pair (Zeke 2026-11-23: "One split pair", "Make the workday id radom 7 digits.").
// bt1: set on BT/RBT 1 at create (T2, Workday path). bcbaLater: the BCBA is created blank (BR2,
// B2) and Zeke sets this value in HubSpot after its push (BR10, BR3); the script never sets it.
// Random 7-digit values, not starting with 10 or 20 like real Workday IDs (O-8 evidence). Checked
// read-only on 2026-11-23: no production HubSpot BT/RBT or BCBA and no CR employee holds either.
// 2026-11-24 retest (run sheet S0 checks the three new values read-only in production first):
// round 2 BCBA created with 3581246 (R2-2); round 2 BT/RBT 1 gets 5729364 by hand after its push
// (R2-14, the `waiting` path); round 3 BT/RBT 1 created with 8146275 (X07a-2); round 10 below. Keys `bt1` / `bcba`
// are set at create; `...Later` keys are set by hand later and never by this script.
const WORKDAY_ROUNDS = {
  2: { bcba: "3581246", bt1Later: "5729364" },
  3: { bt1: "8146275" },
  4: { bt1: "4465360", bcbaLater: "7167221" },
  // apply-recheck 2026-11-24: R1c BT/RBT 1 created by webhook with 6029417 (re-check G1, R1c-3);
  // R1c BCBA gets 7741953 by hand in S4 (re-check G2, R1c-WD: temporary ID -> Workday ID).
  // Both checked read-only in production in S0 (SU-9) before any write.
  10: { bt1: "6029417", bcbaLater: "7741953" }
};
// By-hand values of the retest (documentation; the script never sets them). None may reach CR as a
// new External System ID: U-24 / U-30 are mismatches, U-34 is 6 digits on purpose, U-26 / U-32 are
// the R1 employees' own IDs on second records (BR11).
const WORKDAY_TEST_VALUES = {
  bcbaMismatch: "7354186", bt1Mismatch: "6512374", sixDigits: "651237",
  duplicateBcba: "0498374", duplicateBt1: "4837593"
};
const WORKDAY_ROUND = WORKDAY_ROUNDS[round] || null;

// Phone input forms (decision 46). The code ignores punctuation, drops a 1 / +1 / 001 prefix and a
// trailing extension, and sends the 10 digits; check-cr-record.mjs expects the same 10 digits
// (area + 555 + NN + suffix) whatever the form. Each pushed record rotates its form across rounds,
// so C8 (Guardian Contact), B7 (BCBA Contact) and T4 (BT/RBT 1 Contact) each see several forms.
const PHONE_FORMS = {
  plain: (area, line) => `${area}-555-${line}`,
  parens: (area, line) => `(${area}) 555-${line}`,
  plusOneDots: (area, line) => `+1 ${area}.555.${line}`,
  extensionX: (area, line) => `${area}-555-${line} x12`,
  extensionExt: (area, line) => `${area}-555-${line} ext 7`,
  prefix001: (area, line) => `001 ${area} 555 ${line}`
};
const phone = (suffix, form = "plain") => PHONE_FORMS[form](S.area, `${NN}${suffix}`);

// The sandbox validates the BCBA and BT/RBT display names (bcba_name, bt_name): "Each word in the
// text must be capitalized". "#1", "R1" and "BCBA" were refused, so these two names use letters
// only, each word Capitalized, with the round as a word. The integration never reads them.
const ROUND_WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
  "Nineteen", "Twenty"];
if (round > ROUND_WORDS.length) throw new Error("Display names support rounds 1 to 20.");
const ROUND_WORD = ROUND_WORDS[round - 1];

// R3 pattern (U2-6, B21 both sides blank): the Guardian Contact has no email, phone or state at
// create, so the R3 Case reaches CR with them blank; the run sheet fills them in S4 (R3-20). It is
// found on a re-run by its first name instead of its email (GUARDIAN_KEY).
const R3_BLANK = slot === 2;
const GUARDIAN_KEY = R3_BLANK ? "firstname" : "email";
const guardianContact = {
  firstname: `Don Azure Test R${N}`,
  lastname: "Swanson",
  email: R3_BLANK ? "" : `zeke+swanson_azure_test_${N}@optidge.com`,
  // C8: the Case `phone` follows this Contact. Expected in CR: the 10 digits.
  phone: R3_BLANK ? "" : phone("01", pick("parens", "plusOneDots", "extensionX")),
  // The Case `location` (CL1) is read-only and follows the Guardian Contact (production: both
  // matched 100/100), so both are set.
  location: R3_BLANK ? "" : S.name,
  state_dropdown: R3_BLANK ? "" : S.name,
  // C36 (Zeke 2026-11-23): the Case `referral_source` is read-only and follows this Contact's
  // `how_did_you_hear_about_us_`; the "Referral - Other" text is `other___hear_about_us_`. Only the
  // R2 pattern sets them; a blank is never sent, so the R1 and R3 patterns are unchanged.
  other___hear_about_us_: pick("", `AzT ${N} referral other`, ""),
  // R3 pattern (R3-18): Other with no text -> CR gets "Other" (package item 2).
  how_did_you_hear_about_us_: pick("", "Other", "Other")
  // No sandbox_test_field: Contacts do not have it (NOT FOUND), and the gate is never read there.
};

const bcbaContact = {
  firstname: "Zeke",
  lastname: `Swanson BCBA Azure Test R${N}`,
  email: `zeke+bcba_azure_test_${N}@optidge.com`,
  address: `${N}04 Azure BCBA St`,
  apartment: `Apt ${N}B`,
  city: S.city,
  state_dropdown: S.name,
  zip: `${S.zip}3`,
  // B7: the BCBA `employee_phone` mirrors this. Expected in CR: the 10 digits.
  phone: phone("04", pick("plusOneDots", "extensionExt", "parens"))
};

const btContact = (first, email, phoneValue) => ({
  firstname: first,
  lastname: `Swanson Azure Test R${N}`,
  email,
  address: `${N}03 Azure BT St`,
  city: S.city,
  state_dropdown: S.name,
  zip: `${S.zip}4`,
  phone: phoneValue,
  // T2 (build package item 16): the BT/RBT `date_of_birth` is a read-only property sync from this
  // Contact's text `date_of_birth`, read by readTextDate. R1 is the typed form M/D/YYYY ("2/20/1992"
  // -> CR 1992-02-20; the strict reader before item 16 refused it), R2 the ISO form. R3 leaves it
  // blank: the create must send the placeholder 2000-01-01.
  date_of_birth: pick("2/20/1992", "1993-03-21", ""),
  gender_employee: pick("female", "male", "female"),
  gender: pick("female", "male", "female")
});

// Two-property gate (D18 g, run sheet S3): the round 2 and 3 records that are pushed are created
// inside the gate window, so they carry the creates box. Read only while the two gate settings are
// set; with them unset the sandbox gate is `sandbox_test_field`. Blank (not sent) for rounds 1, 4.
// Rounds 5 and up (R2b, R3b, R1b, R1c; AB-18) are all creates inside the window, so ticked too.
const CREATES_BOX = round >= 5 ? "true" : pick("", "true", "true");

const bcba = {
  first_name: "Zeke",
  last_name: `Swanson BCBA Azure Test R${N}`,
  bcba_name: `Zeke Swanson Bcba Azure Test Round ${ROUND_WORD}`,
  // B4 (decision 49): the CR primaryEmail is the BCBA `email`. In production a workflow mirrors
  // the BCBA Contact email into it, but the sandbox Contact->BCBA mirror does not run (round 1
  // read-back, 2026-11-23). So the script sets it to the Contact email directly, per Zeke
  // (2026-11-23): "Just go ahead and populate the BCBA email field please. Make sure we include
  // that in the plan". The read-back still compares it with the Contact (`emailVsContact`).
  email: bcbaContact.email,
  // `ucaba_email_address` is not set at all (Zeke 2026-11-23: "drop the decoy"; setting it would
  // likely fire the sandbox workflow "BCBA - Work Email Becomes Primary").
  // B9 (decision 50): Meta 138069 reads `personal_email`, set on the BCBA record, a value
  // different from the primary email.
  personal_email: `zeke+bcba_personal_${N}@optidge.com`,
  // B5 (build package item 1, which replaces decision 48; guide line 333): the BCBA date of birth
  // is `date_of_birth`, single-line text in production, which readTextDate converts to YYYY-MM-DD.
  // R1 is the production form M/D/YYYY, R2 a month name; R3 blank sends the placeholder
  // 2000-01-01 on the create. `dob` is only a decoy now (DECOYS, DECOY_VALUES).
  date_of_birth: pick("1/15/1990", "Feb 16, 1991", ""),
  gender_new: pick("Male", "Female", "Male"),
  medicaid_id__ny: `AZTNY00${N}`,
  medicaid_id__nj: `AZTNJ00${N}`,
  medicaid_id__co: `AZTCO00${N}`,
  location: pick("New York", "Colorado;New York", "New Jersey"),
  // R1 also holds "Assign NY", which maps to no label.
  assign_states: pick("Assign NY;Assign NJ", "Assign CO", "Assign CO;Assign NJ"),
  lba_licensure__ny: pick("Yes", "Grad Permit", "No"),
  ny_insurance_labels: pick("MCD FFS-NY", "Aetna-NY", ""),
  work_status: pick("Salaried", "Hourly", "Salaried"),
  cr_billing_hold_label: pick("Yes", "No", ""),
  centralreach_creates_only: CREATES_BOX,
  ...(WORKDAY_ROUND?.bcba ? { workday_id: WORKDAY_ROUND.bcba } : {}),
  sandbox_test_field: "true"
};

// BCBA 2: HubSpot only, never pushed. It is the Case's RE BCBA (so the IA and RE fields hold
// different names, C11) and its Potential IA and Potential Supervising BCBA (never synced, C16).
const bcba2 = {
  first_name: "Zara",
  last_name: `Swanson BCBA2 Azure Test R${N}`,
  bcba_name: `Zara Swanson Second Bcba Azure Test Round ${ROUND_WORD}`,
  sandbox_test_field: "true"
};

// `email` is set on the record and on its Contact: production shows it follows the Contact, but
// the sandbox plan read (P.7 d) lists it as settable. The script drops it if it is read-only.
// No BT/RBT `personal_email`: T9 is held (Zeke 2026-11-23: "For personal email for BT/RBT leave
// this out for now"; confirm the field with Danny and the client, O-51). The sandbox BT/RBT has
// no such property.
const bt = (first, email) => ({
  first_name: first,
  last_name: `Swanson Azure Test R${N}`,
  bt_name: `${first} Swanson Azure Test Round ${ROUND_WORD}`,
  email,
  home_apt: `Apt ${N}C`,
  // R2: Colorado only at create, so the form is RBT CO (rule 5.9; K15); R2-U1 moves it to
  // Colorado;New York by hand (R2-20). R3 (question 14, slice 06 route): a BT in New Jersey only
  // (Behavior Technician NJ 1132652); R3-U1 makes it an RBT in New Jersey;New York by hand (R3-7).
  location: pick("New York", "Colorado", "New Jersey"),
  bt_rbt_type: "BT",
  street_address__work_: `${N}05 Work Plaza`,
  apartment__work: `Suite ${N}`,
  city__work_: S.city,
  state__work_: S.code,
  postal_code__work_: `${S.zip}5`,
  sandbox_test_field: "true"
});

const deal = {
  dealname: `CR Azure Test R${N}`,
  pipeline: "default",
  // dealstage: the pipeline's first stage, set in main() (Zeke: "let it be default").
  hubspot_owner_id: OWNER_ID,
  // C10 (build package item 6, superseding decision 39): Care Coordinator 138851 is
  // care_coordinator_first_name + care_coordinator_last_name when coordinator_export_status is
  // `ready`. The sandbox coordinator workflows fill all three from the owner (Team Member record for
  // 161391908, Zeke, run sheet prerequisite); the script does not set them. The old
  // care_coordinator_name is now a decoy with a different value (DECOY_VALUES.deal).
  phi_first_name__cloned_: "Zeke",
  phi_last_name: `Swanson Azure Test R${N}`,
  phi_date_of_birth: pick("2016-01-15", "2017-02-16", "2018-03-17"),
  phi_gender: pick("male", "female", ""),
  email: guardianContact.email,
  phone: guardianContact.phone,
  guardian_first_name: guardianContact.firstname,
  guardian_last_name: guardianContact.lastname,
  street_address: `${N}01 Azure Test St`,
  home_apt: `Apt ${N}A`,
  location_city: S.city,
  // R3 leaves stateregion and postal_code blank: StateProvince falls back to `location` (item 5)
  // and U2-6 needs a client whose ZIP is blank on both sides. phi_gender likewise (below).
  stateregion: pick(S.code, S.code, ""),
  postal_code: pick(`${S.zip}1`, `${S.zip}1`, ""),
  location: R3_BLANK ? "" : S.name, // read-only mirror of the Guardian Contact; listed for the read-back
  specific_home_location: pick("Child's House", "Other Location", "More Than One Location"),
  // full_home_address is no longer read (item 5): not set. Service -State holds the full name.
  service__street_address: "200 Service Rd",
  service__stateregion_2: S.name,
  service__apt: `Suite ${N}`,
  service__city: S.city,
  service__postal_code: `${S.zip}2`,
  service_address__other: `300 Second Site Ave, ${S.city} ${S.code} ${S.zip}6`,
  case_status: pick("Warm", "Cold", "Warm"),
  staffing_status: pick("Staffed 97153", "97151 Services", "X 97153"),
  allergies: pick("Confirmed", "Denial", ""),
  allergies__yes__explain: `AzT ${N} peanuts`,
  // R3 uses the odd stored value as it is spelled in HubSpot.
  maladaptive_behaviors__parentguardian: pick("Aggression", "Elopement", "Mouthing Non Food Itemsth"),
  does_your_child_have_any_other_comorbid_diagnoses_: `AzT ${N} comorbid`,
  severity_level_clinical: pick("Level 2", "Level 1", "Level 3"),
  important_information: `AzT ${N} parent note`,
  ongoing_central_reach_provider_supplier: `Azure Test Supervising ${N}`,
  work_schedule_details: `AzT ${N} Sched 1 Mon-Fri 9-12`,
  btrbt_work_schedule_2_details: `AzT ${N} Sched 2 Sat 10-1`,
  // C19 (item 7): the text alone; client_service_hours_total is no longer read, so not set.
  finalized_client_service_hours_post_assessment: `AzT ${N} weekdays after 3pm`,
  initial_auth_tracks: pick("Prior Authorization Required", "No Prior Authorization Required", ""),
  n97153_approved_assessment_hours_auth_req: "8",
  ia_hours_from_the_ia: "6",
  ongoing_auth_period_start_date: pick("2026-11-01", "2026-12-01", "2027-01-01"),
  ongoing_autrh_period_end_date: pick("2027-04-30", "2027-05-31", "2027-06-30"),
  n1_what_type_of_insurance: pick("Medicaid FFS", "Medicaid FFS - CO", "Medicaid FFS - NJ"),
  physician_name: `Dr AzT ${N} Medicaid`,
  npi_number: `10000000${NN}`,
  physician_name__commercial: `Dr AzT ${N} Commercial`,
  npi_number__commercial: `20000000${NN}`,
  referring_provider_medicaid_id: `AZTMCD00${N}`,
  phi_diagnosis: pick("Yes", "Other", "Yes- Down's Syndrome"),
  diagnosis_other: `AzT ${N} dx note`,
  most_recent_asd_diagnosis_date_1: pick("2025-03-10", "2025-04-10", "2025-05-10"),
  most_recent_asd_diagnosis_date_medicaid: pick("2025-04-11", "2025-05-11", "2025-06-11"),
  policy_holder_name: "Don Swanson",
  phi__policy_holder_dob: "1985-06-20",
  insurance_primary: pick("Medicaid FFS", "Other", "Aetna"),
  insurance_1__other__summary: `AzT ${N} other carrier`,
  insurance_id_1: `AZT-${N}-INS1`,
  insurance_2: pick("Cigna", "Other", ""),
  // R3 leaves the whole secondary insurance blank (C30 blank case).
  insurance_2__other__summary: pick(`AzT ${N} other carrier 2`, `AzT ${N} other carrier 2`, ""),
  insurance_id_2: pick(`AZT-${N}-INS2`, `AZT-${N}-INS2`, ""),
  // C20 (decision 41): CR gets hours_bt_work_schedule_1 + bt_rbt_2_work_schedule, summed by the
  // code with a blank as 0. HubSpot's own total_hours_btrbt_12 is no longer read; it stays blank
  // unless both are filled, so for R3 (14 + blank) CR gets 14 while HubSpot shows blank.
  // bt_rbt_2_work_schedule is set lower than hours_bt_work_schedule_2 so the expected total
  // (16 / 11) differs from the excluded total_hours_bt_12_work_schedule (18 / 12).
  hours_bt_work_schedule_1: pick("10", "7", "14"),
  hours_bt_work_schedule_2: pick("8", "5", "10"),
  bt_rbt_2_work_schedule: pick("6", "4", ""),
  // Calculated in the sandbox (2026-11-20 plan run), so never sent; listed so the read-back
  // reports it if it stays blank.
  total_hours_btrbt_12: pick("16", "11", ""),
  // C36: read-only in the sandbox (a property sync), so never sent; the R2 value comes from the
  // Guardian Contact above. Listed so the read-back reports it when it stays blank.
  referral_source: pick("Google", "Other", "Other"),
  // C36 "Other" text: Case `referral_other` ("Referral - Other", created in the sandbox
  // 2026-11-23 as plain text). Set here while it is plain text; once Zeke makes it a property sync
  // of the Contact's `other___hear_about_us_` it is read-only, not sent, and read back as a mirror.
  referral_other: pick("", `AzT ${N} referral other`, ""),
  centralreach_creates_only: CREATES_BOX,
  sandbox_test_field: "true"
};

// Decoys: properties the integration must never read or send (guide exclusions). Each is set
// after the create, one at a time, so a missing property or a bad option never blocks the round.
// An enumeration gets its first stored option; text gets "AzT decoy N"; a date 2030-01-01.
// The date is far in the future on purpose: a workflow moves the upcoming-auth `_f` dates into
// the live auth period once their start date arrives, which would overwrite the C23 values.
const DECOYS = {
  deal: ["n2_what_type_of_insurance", "total_hours_bt_12_work_schedule",
    "ongoing_auth_period_start_date_f", "ongoing_auth_period_end_date_f", "care_coordinator_name"],
  bcba: ["credentialed_insurances__ny", "co_insurance_labels", "nj_insurance_labels", "external_system_id",
    "dob"],
  bt: ["bt_to_rbt_path", "external_system_id"]
};

// Decoys that get a value of the same shape as the property the code reads instead, so a wrong
// read would show in CR as this value rather than end as an unreadable value.
// No `ucaba_email_address` decoy (Zeke 2026-11-23: "drop the decoy").
const DECOY_VALUES = {
  deal: {
    // C10 (item 6; recency audit 2.6): the code reads care_coordinator_first_name / _last_name
    // ("Zeke" / "Swanson" from the Team Member record), never care_coordinator_name. A different
    // name here shows a wrong read in CR as this value instead of "Zeke Swanson".
    care_coordinator_name: `Azt Decoy Coordinator ${N}`
  },
  bcba: {
    // B5 (item 1): CR date of birth comes from `date_of_birth` (R3: the placeholder), never
    // 1975-03-09 (this decoy). It is set in every round, R3 included, so R3 also shows that a
    // filled `dob` is not read when `date_of_birth` is blank. 1980-07-04 in CR means the old decoy
    // (decision 48 rounds) is still in `date_of_birth`: re-run the round with --write first.
    dob: "3/9/1975"
  }
};

// ---- Helpers ----
const clean = (props) => Object.fromEntries(Object.entries(props).filter(([, v]) => v !== ""));

// Splits a property map into what can be set on the record and what is read-only there
// (a Contact mirror or a calculated property). Read-only ones are reported, never sent.
// Review C C3: an enumeration value that is not one of the property's options would fail the POST
// after the Contacts and staff are made, so each value (each token of a multi-select) is compared
// with the options of the GET the check already makes. A bad option stops the run before any write.
async function settable(typeId, props) {
  const set = {};
  const readOnly = [];
  const missing = [];
  const badOptions = [];
  for (const [name, value] of Object.entries(clean(props))) {
    let d;
    try {
      d = await hs("GET", `/crm/v3/properties/${typeId}/${name}`);
    } catch {
      missing.push(name);
      continue;
    }
    if (d.calculated || d.modificationMetadata?.readOnlyValue) { readOnly.push(name); continue; }
    if (d.type === "enumeration" && Array.isArray(d.options) && d.options.length) {
      const allowed = new Set(d.options.map((o) => o.value));
      // A multi-select (fieldType checkbox) holds ";"-separated options.
      const tokens = d.fieldType === "checkbox" ? String(value).split(";") : [String(value)];
      if (tokens.some((t) => !allowed.has(t))) badOptions.push(name);
    }
    set[name] = value;
  }
  return { set, readOnly, missing, badOptions };
}

// `label` is a label name, or a number: the association type ID (for labels whose sandbox name is
// not in the matrix, such as 235, 218 and 227).
async function labelId(fromType, toType, label) {
  const res = await hs("GET", `/crm/v4/associations/${fromType}/${toType}/labels`);
  const hit = (res.results || []).find((l) =>
    typeof label === "number" ? l.typeId === label : (l.label || "") === label);
  if (!hit) throw new Error(`No association label "${label}" from ${fromType} to ${toType}`);
  return { associationCategory: hit.category, associationTypeId: hit.typeId };
}

// `labels` is one label or a list. All labels of one record pair go in ONE call: a second labeled
// PUT on the same pair replaced the first (round 1, 2026-11-23: BCBA 2 lost "RE BCBA" to its
// "Potential" labels and BT/RBT 2 lost "Primary BT 2", so C11 and C14 read blank).
async function associate(fromType, fromId, toType, toId, labels) {
  const list = [labels].flat().filter(Boolean);
  if (!list.length) {
    return hs("PUT", `/crm/v4/objects/${fromType}/${fromId}/associations/default/${toType}/${toId}`);
  }
  const specs = [];
  for (const label of list) specs.push(await labelId(fromType, toType, label));
  return hs("PUT", `/crm/v4/objects/${fromType}/${fromId}/associations/${toType}/${toId}`, specs);
}

async function create(typeId, props) {
  const res = await hs("POST", `/crm/v3/objects/${typeId}`, { properties: props });
  return res.id;
}

// A re-run of a round reuses each record it made before (found by a key that is unique to the
// round: the Contact email, or the record's name) and brings it up to date, so a run that stopped
// half-way never leaves duplicates.
async function upsert(typeId, key, props) {
  const found = await hs("POST", `/crm/v3/objects/${typeId}/search`, {
    filterGroups: [{ filters: [{ propertyName: key, operator: "EQ", value: props[key] }] }],
    properties: [key],
    limit: 2
  });
  if (found.results?.length === 1) {
    const id = found.results[0].id;
    await hs("PATCH", `/crm/v3/objects/${typeId}/${id}`, { properties: props });
    return id;
  }
  if (found.results?.length > 1) throw new Error(`More than one ${typeId} record has this ${key}; fix by hand first.`);
  return create(typeId, props);
}
const upsertContact = (props) => upsert(TYPES.contact, "email", props);

async function decoyValue(typeId, name, fixedValue) {
  const d = await hs("GET", `/crm/v3/properties/${typeId}/${name}`);
  if (d.calculated || d.modificationMetadata?.readOnlyValue) return null;
  if (fixedValue !== undefined) return fixedValue;
  if (d.type === "enumeration") return d.options?.[0]?.value ?? null;
  if (d.type === "date" || d.type === "datetime") return "2030-01-01";
  if (d.type === "number") return "99";
  if (d.type === "bool") return "true";
  return `AzT decoy ${N}`;
}

// Sets each decoy alone; reports what was set and what was skipped, by name only.
async function setDecoys(typeId, id, names, fixedValues = {}) {
  const done = [];
  const skipped = [];
  for (const name of names) {
    try {
      const value = await decoyValue(typeId, name, fixedValues[name]);
      if (value === null) { skipped.push(`${name} (read-only)`); continue; }
      if (WRITE) await hs("PATCH", `/crm/v3/objects/${typeId}/${id}`, { properties: { [name]: value } });
      done.push(name);
    } catch {
      skipped.push(`${name} (not found or refused)`);
    }
  }
  return { done, skipped };
}

// ---- Main ----
async function main() {
  const acct = await hs("GET", "/account-info/v3/details");
  if (String(acct.portalId) !== SANDBOX_PORTAL || acct.accountType !== "SANDBOX") {
    throw new Error(`Portal ${acct.portalId} (${acct.accountType}) is not sandbox ${SANDBOX_PORTAL}. Stopped.`);
  }
  if (CENSUS) {
    await census();
    return;
  }
  console.log(`Sandbox ${acct.portalId} confirmed. Round ${N} (${S.name}). Mode: ${WRITE ? "WRITE" : "plan only"}.`);
  if (HANDMADE) {
    await handmade();
    return;
  }
  console.log(WORKDAY_ROUND
    ? `workday_id at create: BT/RBT 1 ${WORKDAY_ROUND.bt1 || "blank"}, BCBA ${WORKDAY_ROUND.bcba || "blank"}` +
      (WORKDAY_ROUND.bt1Later ? `; Zeke sets ${WORKDAY_ROUND.bt1Later} on BT/RBT 1 after its push` : "") +
      (WORKDAY_ROUND.bcbaLater ? `; Zeke sets ${WORKDAY_ROUND.bcbaLater} on the BCBA after its push` : "") + ".\n"
    : "workday_id: not set (the temporary-ID test).\n");
  // A round file that holds another Workday ID for a record means the employee may already be
  // linked in CR under that ID, and a new workday_id would end in a mismatch.
  let saved = null;
  try {
    saved = JSON.parse(readFileSync(resolve(ROUNDS_DIR, `round-${N}.json`), "utf8"));
  } catch {
    saved = null; // no file yet: a new round
  }
  for (const key of ["bt1", "bcba"]) {
    const planned = WORKDAY_ROUND?.[key];
    const held = saved?.workdayIds?.[key];
    if (planned && held && held !== planned) {
      throw new Error(`round-${N}.json holds another ${key} Workday ID than ${planned}. Stopped.`);
    }
  }
  if (GRAD_PERMIT_LINK) {
    await gradPermitLink(saved);
    return;
  }
  // Review C B6: a re-run puts the round's create values back on records that CR may already hold.
  if (WRITE && saved && !REFRESH) {
    throw new Error(`round-${N}.json exists, so --write is a re-run (a CentralReach write through the webhooks). ` +
      "Add --refresh only at run sheet S1, after the pending build is confirmed deployed (pre-flight P-1), " +
      "and never after the round's update steps have started. Nothing was written.");
  }
  if (WRITE && saved && REFRESH) {
    console.log("--refresh: re-run of an existing round. Allowed only at run sheet S1 on the confirmed pending build.");
  }

  const pipeline = await hs("GET", "/crm/v3/pipelines/deals/default");
  const firstStage = [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder)[0];
  deal.dealstage = firstStage.id;
  console.log(`Case stage: the Client Pipeline's first stage, ${firstStage.label} (${firstStage.id}).`);

  const plan = {
    guardianContact: await settable(TYPES.contact, guardianContact),
    bcbaContact: await settable(TYPES.contact, bcbaContact),
    // T4: BT/RBT 1 `employee_phone` mirrors this Contact phone. BT/RBT 2 is never pushed.
    bt1Contact: await settable(TYPES.contact, btContact("Jane", `zeke+bt_azure_test_${N}@optidge.com`,
      phone("03", pick("extensionX", "parens", "prefix001")))),
    bt2Contact: await settable(TYPES.contact, btContact("Jill", `zeke+bt2_azure_test_${N}@optidge.com`, phone("05"))),
    bcba: await settable(TYPES.bcba, bcba),
    bcba2: await settable(TYPES.bcba, bcba2),
    bt1: await settable(TYPES.bt, {
      ...bt("Jane", `zeke+bt_azure_test_${N}@optidge.com`),
      centralreach_creates_only: CREATES_BOX,
      ...(WORKDAY_ROUND?.bt1 ? { workday_id: WORKDAY_ROUND.bt1 } : {})
    }),
    bt2: await settable(TYPES.bt, bt("Jill", `zeke+bt2_azure_test_${N}@optidge.com`)),
    deal: await settable(TYPES.deal, deal)
  };
  for (const [name, p] of Object.entries(plan)) {
    console.log(`${name}: ${Object.keys(p.set).length} to set` +
      (p.readOnly.length ? `; read-only, not sent: ${p.readOnly.join(", ")}` : "") +
      (p.missing.length ? `; NOT FOUND: ${p.missing.join(", ")}` : "") +
      (p.badOptions.length ? `; BAD OPTION: ${p.badOptions.join(", ")}` : ""));
  }
  if (Object.values(plan).some((p) => p.badOptions.length)) {
    throw new Error("A value above is not an option of its property (BAD OPTION). Nothing was written. Fix the value first.");
  }
  if (Object.values(plan).some((p) => p.missing.length)) {
    console.log("A NOT FOUND property that the integration requests fails every run of that object " +
      "as a failed read (row 4.18): resolve it before the push.");
  }
  // B5, T2 (items 1 and 16): the date of birth values are typed text forms ("1/15/1990"), as in
  // production, where BCBA `date_of_birth` and Contact `date_of_birth` are single-line text. A
  // sandbox date picker would refuse them or test something production does not have. Read-only.
  for (const [label, typeId] of [["BCBA", TYPES.bcba], ["Contact", TYPES.contact]]) {
    const d = await hs("GET", `/crm/v3/properties/${typeId}/date_of_birth`);
    if (d.type !== "string") {
      throw new Error(`Sandbox ${label} date_of_birth is type ${d.type}, not text as in production. Stopped: ask Zeke.`);
    }
  }
  if (!WRITE) {
    for (const [obj, typeId] of [["deal", TYPES.deal], ["bcba", TYPES.bcba], ["bt", TYPES.bt]]) {
      const plan = await setDecoys(typeId, "0", DECOYS[obj], DECOY_VALUES[obj]);
      console.log(`decoys ${obj}: would set ${plan.done.join(", ") || "none"}` +
        (plan.skipped.length ? `; skipped: ${plan.skipped.join(", ")}` : ""));
    }
    console.log("\nPlan only. Nothing was written. Re-run with --write on Zeke's go-ahead.");
    return;
  }

  const ids = {};
  // Review C C2: on a re-run the Guardian Contact is the one saved in round-N.json (S4 changes its
  // email, so a search by email would make a second Guardian and associate it with the Case).
  const savedGuardian = saved?.ids?.guardianContact;
  if (savedGuardian) {
    await hs("PATCH", `/crm/v3/objects/${TYPES.contact}/${savedGuardian}`, { properties: plan.guardianContact.set });
    ids.guardianContact = savedGuardian;
  } else {
    ids.guardianContact = await upsert(TYPES.contact, GUARDIAN_KEY, plan.guardianContact.set);
  }
  ids.bcbaContact = await upsertContact(plan.bcbaContact.set);
  ids.bt1Contact = await upsertContact(plan.bt1Contact.set);
  ids.bt2Contact = await upsertContact(plan.bt2Contact.set);
  console.log("Contacts:", ids);
  ids.bcba = await upsert(TYPES.bcba, "bcba_name", plan.bcba.set);
  ids.bcba2 = await upsert(TYPES.bcba, "bcba_name", plan.bcba2.set);
  ids.bt1 = await upsert(TYPES.bt, "bt_name", plan.bt1.set);
  ids.bt2 = await upsert(TYPES.bt, "bt_name", plan.bt2.set);
  console.log("Staff records:", ids);

  await associate(TYPES.bcba, ids.bcba, TYPES.contact, ids.bcbaContact);
  await associate(TYPES.bt, ids.bt1, TYPES.contact, ids.bt1Contact, "Contact Record");
  await associate(TYPES.bt, ids.bt2, TYPES.contact, ids.bt2Contact, "Contact Record");

  ids.deal = await upsert(TYPES.deal, "dealname", plan.deal.set);
  await associate(TYPES.deal, ids.deal, TYPES.contact, ids.guardianContact);
  await associate(TYPES.deal, ids.deal, TYPES.bcba, ids.bcba, ["Supervising BCBA", "IA BCBA"]);
  // C11: RE is BCBA 2, so the IA and RE fields hold different names. C16: BCBA 2 is also the
  // Case's Potential IA and Potential Supervising BCBA, which are never synced.
  // R2-8 (round 2 pattern only): BCBA 2 also Previous IA (235), never synced.
  await associate(TYPES.deal, ids.deal, TYPES.bcba, ids.bcba2,
    ["RE BCBA", "Potential IA BCBA", "Potential Supervising BCBA", ...(slot === 1 ? [PREVIOUS_IA_TYPE] : [])]);
  await associate(TYPES.deal, ids.deal, TYPES.bt, ids.bt1, "Primary BT 1");
  // C14: BT/RBT 2 is Primary BT 2. C16: also Potential BT 1, never synced.
  // R2-8 (round 2 pattern only): BT/RBT 2 also Potential BT 2 (218), never synced.
  await associate(TYPES.deal, ids.deal, TYPES.bt, ids.bt2,
    ["Primary BT 2", "Potential BT 1", ...(slot === 1 ? [POTENTIAL_BT2_TYPE] : [])]);
  console.log("\nCreated and associated:", ids);

  const decoys = {
    deal: await setDecoys(TYPES.deal, ids.deal, DECOYS.deal, DECOY_VALUES.deal),
    bcba: await setDecoys(TYPES.bcba, ids.bcba, DECOYS.bcba, DECOY_VALUES.bcba),
    bt1: await setDecoys(TYPES.bt, ids.bt1, DECOYS.bt)
  };
  console.log("Decoys (names only):", JSON.stringify(decoys));

  // Read back after the mirrors and automations have had time to run. `differs` on the BCBA names
  // `personal_email` or `date_of_birth` if a workflow (for example "BCBA - Work Email Becomes Primary")
  // changed them after the script set them; the script also sets `email` (B4), so it is checked
  // there too. `emailVsContact` checks B4: the BCBA `email` must equal the BCBA Contact email
  // ("matches the Contact"). Anything else: stop and ask Zeke before the BCBA push (no workaround).
  // If the property check found `email` read-only (not sent), it is read back as a mirror instead.
  console.log("\nWaiting 60 s for mirrors and automations, then reading back...");
  await new Promise((r) => setTimeout(r, 60000));
  const readBack = async (typeId, id, expected, mirrorNames) => {
    const names = [...Object.keys(expected), ...mirrorNames];
    const rec = await hs("GET", `/crm/v3/objects/${typeId}/${id}?properties=${names.join(",")}`);
    const diffs = [];
    for (const [k, v] of Object.entries(expected)) {
      if (String(rec.properties?.[k] ?? "") !== String(v)) diffs.push(k);
    }
    const blankMirrors = mirrorNames.filter((m) => !rec.properties?.[m]);
    return { differs: diffs, blankMirrors, properties: rec.properties || {} };
  };
  const bcbaRead = await readBack(TYPES.bcba, ids.bcba, plan.bcba.set,
    ["address", "apartment__home", "city_home", "state_home", "postal_code_home", "employee_phone",
      ...("email" in plan.bcba.set ? [] : ["email"])]);
  const bcbaEmail = String(bcbaRead.properties.email ?? "").trim().toLowerCase();
  const emailVsContact = !bcbaEmail ? "blank (not set and the mirror did not run)"
    : bcbaEmail === String(bcbaContact.email).toLowerCase() ? "matches the Contact" : "differs from the Contact";
  const strip = ({ properties, ...rest }) => rest; // property names only in the report, never values
  // Review C O6 / C4: the coordinator fields C10 depends on, the R3 Case `location` (must be blank for
  // U2-6) and `active_cases_count` (T7; question 13) are read back too. `coordinator` keeps only the
  // status and whether the names are the test names "Zeke" / "Swanson" (no other value is saved).
  const COORDINATOR_FIELDS = ["coordinator_export_status", "care_coordinator_first_name", "care_coordinator_last_name"];
  const dealRead = await readBack(TYPES.deal, ids.deal, plan.deal.set,
    [...plan.deal.readOnly, ...COORDINATOR_FIELDS, ...("location" in plan.deal.set ? [] : ["location"])]);
  const coordinator = {
    status: dealRead.properties.coordinator_export_status || "blank",
    testNames: dealRead.properties.care_coordinator_first_name === "Zeke" &&
      dealRead.properties.care_coordinator_last_name === "Swanson"
  };
  const report = {
    deal: { ...strip(dealRead), coordinator },
    bcba: { ...strip(bcbaRead), emailVsContact },
    bt1: strip(await readBack(TYPES.bt, ids.bt1, plan.bt1.set,
      ["street_home", "location_city", "state_home", "postal_code_home", "employee_phone", "email", "gender", "date_of_birth",
        "active_cases_count"]))
  };
  if (coordinator.status !== "ready" || !coordinator.testNames) {
    console.log(`STOP before this round's Case push: coordinator_export_status is ${coordinator.status}` +
      `${coordinator.testNames ? "" : " or the coordinator names are not Zeke / Swanson"} (C10; review C O6). ` +
      "Re-save the Case owner after the Team Member record exists, then re-read.");
  }
  console.log("Read-back (property names only):", JSON.stringify(report, null, 2));

  const outDir = resolve(ROUNDS_DIR);
  mkdirSync(outDir, { recursive: true });
  const roundPath = resolve(outDir, `round-${N}.json`);
  // `workdayIds` is what check-cr-record.mjs expects as the External System ID: the ones already in
  // the file (added by hand once CR holds a Workday ID), plus BT/RBT 1's on round 4. The BCBA's
  // later value is saved apart (`bcbaWorkdayIdLater`): CR keeps the temporary ID after it is set,
  // so the check must still expect the HubSpot record ID.
  let savedWorkdayIds;
  try {
    savedWorkdayIds = JSON.parse(readFileSync(roundPath, "utf8")).workdayIds;
  } catch {
    savedWorkdayIds = undefined; // no file yet
  }
  const atCreate = Object.fromEntries(["bt1", "bcba"].filter((k) => WORKDAY_ROUND?.[k]).map((k) => [k, WORKDAY_ROUND[k]]));
  const workdayIds = Object.keys(atCreate).length ? { ...savedWorkdayIds, ...atCreate } : savedWorkdayIds;
  writeFileSync(roundPath, JSON.stringify({
    round, state: S.name, createdAt: new Date().toISOString(), ids,
    ...(workdayIds ? { workdayIds } : {}),
    ...(WORKDAY_ROUND?.bcbaLater ? { bcbaWorkdayIdLater: WORKDAY_ROUND.bcbaLater } : {}),
    ...(WORKDAY_ROUND?.bt1Later ? { bt1WorkdayIdLater: WORKDAY_ROUND.bt1Later } : {}),
    decoys, report
  }, null, 2));
  console.log(`\nSaved IDs and read-back to sandbox-rounds/round-${N}.json. Entered in CentralReach is blank on every record.`);
}

// R2-5 (master A14; build hand-over note 5): link the round's holder BCBA to BCBA 2 with type 227
// from the holder's side, then read which BCBA -> BCBA types the holder lists. Round 2 pattern only
// (its BCBA holds lba_licensure__ny = Grad Permit). Uses the IDs saved in round-N.json.
async function gradPermitLink(saved) {
  if (slot !== 1) throw new Error("--grad-permit-link is for the round 2 pattern (the Grad Permit holder) only.");
  const holder = saved?.ids?.bcba;
  const supervisor = saved?.ids?.bcba2;
  if (!holder || !supervisor) throw new Error(`round-${N}.json has no bcba / bcba2 IDs.`);
  const spec = await labelId(TYPES.bcba, TYPES.bcba, GRAD_PERMIT_SUPERVISOR_TYPE);
  const all = await hs("GET", `/crm/v4/associations/${TYPES.bcba}/${TYPES.bcba}/labels`);
  const label = (all.results || []).find((l) => l.typeId === GRAD_PERMIT_SUPERVISOR_TYPE)?.label;
  console.log(`Type ${GRAD_PERMIT_SUPERVISOR_TYPE} label: "${label}". Holder ${holder} -> supervisor ${supervisor}.`);
  if (!WRITE) {
    console.log("Plan only. Nothing was written. Re-run with --write on the run sheet step S5a.");
    return;
  }
  await hs("PUT", `/crm/v4/objects/${TYPES.bcba}/${holder}/associations/${TYPES.bcba}/${supervisor}`, [spec]);
  const read = await hs("GET", `/crm/v4/objects/${TYPES.bcba}/${holder}/associations/${TYPES.bcba}`);
  const types = (read.results || []).filter((r) => String(r.toObjectId) === String(supervisor))
    .flatMap((r) => (r.associationTypes || []).map((t) => t.typeId));
  console.log(`Holder side lists types [${types.join(", ")}] to BCBA 2: ` +
    (types.includes(GRAD_PERMIT_SUPERVISOR_TYPE) ? "227 as expected." : "227 is NOT listed: stop and tell the build chat (226 means the direction is reversed)."));
}

// ---- Hand-made records (review C B4; run sheet S3a, S3c, S6a, S7) ----
// Each record misses exactly one required field from the moment it is created, so it can never be
// complete for a moment while legs are edited. Entered is blank: nothing is pushed until the run
// sheet sets Entered LAST. sandbox_test_field = true at create (the webhook lists need it).
// U-44's `employee_id` (5384530x) is NOT set here: it is typed by hand at S6a (a filled CR ID makes
// the record linked, so any earlier edit would run the update path).
function handmadeSet() {
  const hm = (letter) => `Hand Made ${letter}`;
  const caseRec = (id, extra) => ({ ...deal, dealname: `CR Azure Test R${N} HM ${id}`, ...extra });
  const bcbaRec = (letter, extra) => ({
    ...bcba, workday_id: "", bcba_name: `Zeke Swanson Bcba Azure Test Round ${ROUND_WORD} ${hm(letter)}`,
    last_name: `Swanson BCBA Azure Test R${N} HM ${letter}`, email: `zeke+bcba_hm_${letter.toLowerCase()}_azure_test_${N}@optidge.com`,
    centralreach_creates_only: "true", ...extra
  });
  const btRec = (letter, extra) => ({
    ...bt("Jane", `zeke+bt_hm_${letter.toLowerCase()}_azure_test_${N}@optidge.com`),
    bt_name: `Jane Swanson Azure Test Round ${ROUND_WORD} ${hm(letter)}`, last_name: `Swanson Azure Test R${N} HM ${letter}`,
    centralreach_creates_only: "true", ...extra
  });
  return pick(
    [ // round 1 pattern (NY)
      { key: "U-26", type: TYPES.bcba, name: "bcba_name", props: bcbaRec("A", { workday_id: WORKDAY_TEST_VALUES.duplicateBcba }) },
      { key: "U-32", type: TYPES.bt, name: "bt_name", props: btRec("A", { workday_id: WORKDAY_TEST_VALUES.duplicateBt1 }) },
      { key: "U-44", type: TYPES.bt, name: "bt_name", props: btRec("B", {}) }
    ],
    [ // round 2 pattern (CO)
      { key: "R2-30", type: TYPES.deal, name: "dealname", props: caseRec("R2-30", { phi_date_of_birth: "" }) },
      { key: "X02-1", type: TYPES.deal, name: "dealname", props: caseRec("X02-1", { phi_last_name: "" }) },
      { key: "X02-3", type: TYPES.deal, name: "dealname",
        props: caseRec("X02-3", { centralreach_creates_only: "", centralreach_updates_only: "true" }) },
      { key: "X01-4", type: TYPES.deal, name: "dealname", props: caseRec("X01-4", { dealstage: "1383894301" }) },
      { key: "X04-3a", type: TYPES.bt, name: "bt_name", props: btRec("A", { email: "" }) },
      { key: "X04-3b", type: TYPES.bt, name: "bt_name", props: btRec("B", { last_name: "" }) }
    ],
    [ // round 3 pattern (NJ)
      { key: "R3-5", type: TYPES.bcba, name: "bcba_name", props: bcbaRec("A", { email: "" }) },
      { key: "X03-1a", type: TYPES.bcba, name: "bcba_name", props: bcbaRec("B", { first_name: "" }) },
      { key: "X03-1b", type: TYPES.bcba, name: "bcba_name", props: bcbaRec("C", { last_name: "" }) }
    ]
  );
}

async function handmade() {
  const pipeline = await hs("GET", "/crm/v3/pipelines/deals/default");
  const firstStage = [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder)[0];
  const records = handmadeSet();
  const plans = [];
  for (const rec of records) {
    const props = rec.type === TYPES.deal ? { dealstage: firstStage.id, ...rec.props } : rec.props;
    const p = await settable(rec.type, props);
    plans.push({ ...rec, p });
    console.log(`${rec.key}: ${Object.keys(p.set).length} to set` +
      (p.missing.length ? `; NOT FOUND: ${p.missing.join(", ")}` : "") +
      (p.badOptions.length ? `; BAD OPTION: ${p.badOptions.join(", ")}` : ""));
  }
  if (plans.some(({ p }) => p.badOptions.length)) throw new Error("BAD OPTION above. Nothing was written.");
  if (!WRITE) {
    console.log("\nPlan only. Nothing was written. Entered stays blank on every hand-made record.");
    return;
  }
  const ids = {};
  for (const { key, type, name, p } of plans) ids[key] = await upsert(type, name, p.set);
  const path = resolve(ROUNDS_DIR, `handmade-r${N}.json`);
  writeFileSync(path, JSON.stringify({ round, pattern: S.name, createdAt: new Date().toISOString(), ids }, null, 2));
  console.log("Hand-made records (Entered blank):", ids, `\nSaved to sandbox-rounds/handmade-r${N}.json.`);
}

// ---- Census (read-only; review C S1, S2, S3) ----
async function census() {
  const planned = new Set();
  for (const f of readdirSync(resolve(ROUNDS_DIR))) {
    if (!/^(round-\d+|handmade-r\d+)\.json$/.test(f)) continue;
    try {
      for (const v of Object.values(JSON.parse(readFileSync(resolve(ROUNDS_DIR, f), "utf8")).ids || {})) planned.add(String(v));
    } catch {
      console.log(`(could not read ${f})`);
    }
  }
  const tag = (id) => `${id} ${planned.has(String(id)) ? "planned" : "NOT PLANNED"}`;
  const searchAll = async (typeId, filterGroups, properties) => {
    const out = [];
    let after;
    do {
      const res = await hs("POST", `/crm/v3/objects/${typeId}/search`,
        { filterGroups, properties, limit: 100, ...(after ? { after } : {}) });
      out.push(...(res.results || []));
      after = res.paging?.next?.after;
    } while (after && out.length < 2000);
    return out;
  };
  const OBJECTS = [
    { label: "Case", type: TYPES.deal, crId: "client_id_number", entry: "enter_in_central_reach" },
    { label: "BCBA", type: TYPES.bcba, crId: "employee_id", entry: "entered_in_centralreach" },
    { label: "BT/RBT", type: TYPES.bt, crId: "employee_id", entry: "entered_in_centralreach" }
  ];
  let notPlanned = 0;
  console.log("Census, read-only. Record IDs only.\n\n(1) Gate boxes held (centralreach_creates_only or centralreach_updates_only = true):");
  for (const o of OBJECTS) {
    const hits = await searchAll(o.type, [
      { filters: [{ propertyName: "centralreach_creates_only", operator: "EQ", value: "true" }] },
      { filters: [{ propertyName: "centralreach_updates_only", operator: "EQ", value: "true" }] }
    ], ["centralreach_creates_only", "centralreach_updates_only", o.crId]);
    notPlanned += hits.filter((r) => !planned.has(String(r.id))).length;
    // L = linked (CR ID held). [C L] without U is what the promote workflows enrol (ID known AND
    // creates = Yes AND link known; PROMOTE-WORKFLOW-PROMPT-2026-11-24.md "Built"): run sheet S3c-0b
    // turns promote ON only when no record shows it (apply-recheck 2026-11-24, re-check O1).
    let promotable = 0;
    console.log(`  ${o.label}: ${hits.length}` + (hits.length ? ` -> ${hits.map((r) => {
      const c = r.properties?.centralreach_creates_only === "true" ? "C" : "";
      const u = r.properties?.centralreach_updates_only === "true" ? "U" : "";
      const l = String(r.properties?.[o.crId] ?? "").trim() ? " L" : "";
      if (c && l && !u) promotable += 1;
      return `${tag(r.id)} [${c}${u}${l}]`;
    }).join("; ")}` : ""));
    console.log(`    linked, creates ticked, updates blank (the promote workflows would enrol these): ${promotable}`);
  }
  console.log("\n(2) Unlinked (no CR ID), sandbox_test_field = true, Entered holds Yes (would be CREATED once its gate passes):");
  for (const o of OBJECTS) {
    const hits = (await searchAll(o.type, [{ filters: [
      { propertyName: o.entry, operator: "HAS_PROPERTY" },
      { propertyName: "sandbox_test_field", operator: "EQ", value: "true" },
      { propertyName: o.crId, operator: "NOT_HAS_PROPERTY" }
    ] }], [o.entry])).filter((r) => String(r.properties?.[o.entry] ?? "").split(";").map((t) => t.trim()).includes("Yes"));
    notPlanned += hits.length;
    console.log(`  ${o.label}: ${hits.length}${hits.length ? ` -> ${hits.map((r) => tag(r.id)).join("; ")}` : ""}`);
  }
  const workdayValues = [...new Set([
    ...Object.values(WORKDAY_ROUNDS).flatMap((w) => Object.values(w)),
    ...Object.values(WORKDAY_TEST_VALUES).filter((v) => /^\d{7}$/.test(v))
  ])];
  console.log("\n(3) Sandbox holders of the planned Workday test IDs:");
  for (const o of OBJECTS.slice(1)) {
    const hits = await searchAll(o.type, [{ filters: [{ propertyName: "workday_id", operator: "IN", values: workdayValues }] }],
      ["workday_id"]);
    console.log(`  ${o.label}: ${hits.length ? hits.map((r) => `${r.properties?.workday_id} on ${tag(r.id)}`).join("; ") : "none"}`);
  }
  console.log(`\n${notPlanned ? `${notPlanned} entr${notPlanned === 1 ? "y" : "ies"} in (1) or (2) not planned or Entered = Yes on an unlinked record: ` +
    "STOP (run sheet stop rule 2) and tell Zeke." : "Nothing unplanned in (1) or (2)."} Nothing was written.`);
  if (notPlanned) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`Stopped: ${e.message}`);
  process.exit(1);
});
