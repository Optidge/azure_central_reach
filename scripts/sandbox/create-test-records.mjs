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
//
// The token is HUBSPOT_PRIVATE_APP_TOKEN from local.settings.json, read at run time, never printed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SANDBOX_PORTAL = "52311591";
const TYPES = { deal: "0-3", contact: "0-1", bcba: "2-72890322", bt: "2-72890325" };
const OWNER_ID = "161391908";

const args = process.argv.slice(2);
const round = Number(args[args.indexOf("--round") + 1]);
const WRITE = args.includes("--write");
if (!Number.isInteger(round) || round < 1 || round > 99) {
  console.error("Give --round N (1 to 99).");
  process.exit(1);
}

function loadToken() {
  const settings = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"));
  const token = settings?.Values?.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN is not in local.settings.json");
  return token;
}
const TOKEN = loadToken();

async function hs(method, path, body) {
  if (!WRITE && method !== "GET") throw new Error(`Plan mode: refused ${method} ${path}`);
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
const phone = (suffix) => `${S.area}-555-${NN}${suffix}`;

// The sandbox validates the BCBA and BT/RBT display names (bcba_name, bt_name): "Each word in the
// text must be capitalized". "#1", "R1" and "BCBA" were refused, so these two names use letters
// only, each word Capitalized, with the round as a word. The integration never reads them.
const ROUND_WORDS = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
  "Nineteen", "Twenty"];
if (round > ROUND_WORDS.length) throw new Error("Display names support rounds 1 to 20.");
const ROUND_WORD = ROUND_WORDS[round - 1];

const guardianContact = {
  firstname: `Don Azure Test R${N}`,
  lastname: "Swanson",
  email: `zeke+swanson_azure_test_${N}@optidge.com`,
  phone: phone("01"),
  // The Case `location` (CL1) is read-only and follows the Guardian Contact (production: both
  // matched 100/100), so both are set.
  location: S.name,
  state_dropdown: S.name,
  sandbox_test_field: "true"
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
  phone: phone("04"),
  sandbox_test_field: "true"
};

const btContact = (first, email, suffix) => ({
  firstname: first,
  lastname: `Swanson Azure Test R${N}`,
  email,
  address: `${N}03 Azure BT St`,
  city: S.city,
  state_dropdown: S.name,
  zip: `${S.zip}4`,
  phone: phone(suffix),
  // R3 leaves the date of birth blank: the create must send the placeholder 2000-01-01 (T2).
  date_of_birth: pick("1992-02-20", "1993-03-21", ""),
  gender_employee: pick("female", "male", "female"),
  gender: pick("female", "male", "female"),
  sandbox_test_field: "true"
});

const bcba = {
  first_name: "Zeke",
  last_name: `Swanson BCBA Azure Test R${N}`,
  bcba_name: `Zeke Swanson Bcba Azure Test Round ${ROUND_WORD}`,
  ucaba_email_address: `zeke_work_email+azure_test_${N}@optidge.com`,
  date_of_birth: pick("1990-01-15", "1991-02-16", ""), // R3 blank: B5 placeholder test
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
  // B9 (O-40/O-42, Zeke 2026-11-21): row 6.4 reads the BCBA's own `email`, not the Contact's.
  // The sandbox does not mirror it from the Contact, so it is set here with the same value.
  email: `zeke+bcba_azure_test_${N}@optidge.com`,
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
const bt = (first, email) => ({
  first_name: first,
  last_name: `Swanson Azure Test R${N}`,
  bt_name: `${first} Swanson Azure Test Round ${ROUND_WORD}`,
  email,
  home_apt: `Apt ${N}C`,
  location: pick("New York", "Colorado", "New Jersey;New York"),
  // R2: a Colorado BT gets the form RBT CO and the label Behavior Technician CO (rule 5.9).
  // R3: an RBT in New Jersey and New York gets RBT NJ and RBT NY.
  bt_rbt_type: pick("BT", "BT", "RBT"),
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
  // C10 (decision 39): Care Coordinator is read from care_coordinator_name, which the sandbox's
  // Care Coordinator Change workflow writes on an owner change. Set here so the create holds it.
  care_coordinator_name: "Zeke Swanson",
  phi_first_name__cloned_: "Zeke",
  phi_last_name: `Swanson Azure Test R${N}`,
  phi_date_of_birth: pick("2016-01-15", "2017-02-16", "2018-03-17"),
  phi_gender: pick("male", "female", "male"),
  email: guardianContact.email,
  phone: guardianContact.phone,
  guardian_first_name: guardianContact.firstname,
  guardian_last_name: guardianContact.lastname,
  street_address: `${N}01 Azure Test St`,
  home_apt: `Apt ${N}A`,
  location_city: S.city,
  stateregion: S.code,
  postal_code: `${S.zip}1`,
  location: S.name,
  specific_home_location: pick("Child's House", "Other Location", "More Than One Location"),
  full_home_address: `${N}01 Azure Test St, Apt ${N}A, ${S.city}, ${S.code} ${S.zip}1`,
  service__street_address: "200 Service Rd",
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
  finalized_client_service_hours_post_assessment: `AzT ${N} weekdays after 3pm`,
  client_service_hours_total: pick("20", "15", "25"),
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
  // C20 (decision 40; O-39 option a, Zeke 2026-11-21): CR gets hours_bt_work_schedule_1 +
  // bt_rbt_2_work_schedule, summed by the code with a blank as 0. HubSpot's own
  // total_hours_btrbt_12 stays blank unless both are filled, so for R3 (14 + blank) CR gets 14
  // while HubSpot shows blank. bt_rbt_2_work_schedule is set lower than hours_bt_work_schedule_2
  // so the expected total (16 / 11) differs from the excluded total_hours_bt_12_work_schedule
  // (18 / 12).
  hours_bt_work_schedule_1: pick("10", "7", "14"),
  hours_bt_work_schedule_2: pick("8", "5", "10"),
  bt_rbt_2_work_schedule: pick("6", "4", ""),
  // Calculated in the sandbox (2026-11-20 plan run), so never sent; listed so the read-back
  // reports it if it stays blank.
  total_hours_btrbt_12: pick("16", "11", ""),
  referral_source: pick("Google", "School", "Other"),
  sandbox_test_field: "true"
};

// Decoys: properties the integration must never read or send (guide exclusions). Each is set
// after the create, one at a time, so a missing property or a bad option never blocks the round.
// An enumeration gets its first stored option; text gets "AzT decoy N"; a date 2030-01-01.
// The date is far in the future on purpose: a workflow moves the upcoming-auth `_f` dates into
// the live auth period once their start date arrives, which would overwrite the C23 values.
const DECOYS = {
  deal: ["n2_what_type_of_insurance", "total_hours_bt_12_work_schedule",
    "ongoing_auth_period_start_date_f", "ongoing_auth_period_end_date_f"],
  bcba: ["credentialed_insurances__ny", "co_insurance_labels", "nj_insurance_labels", "external_system_id"],
  bt: ["bt_to_rbt_path", "external_system_id"]
};

// ---- Helpers ----
const clean = (props) => Object.fromEntries(Object.entries(props).filter(([, v]) => v !== ""));

// Splits a property map into what can be set on the record and what is read-only there
// (a Contact mirror or a calculated property). Read-only ones are reported, never sent.
async function settable(typeId, props) {
  const set = {};
  const readOnly = [];
  const missing = [];
  for (const [name, value] of Object.entries(clean(props))) {
    try {
      const d = await hs("GET", `/crm/v3/properties/${typeId}/${name}`);
      if (d.calculated || d.modificationMetadata?.readOnlyValue) readOnly.push(name);
      else set[name] = value;
    } catch {
      missing.push(name);
    }
  }
  return { set, readOnly, missing };
}

async function labelId(fromType, toType, label) {
  const res = await hs("GET", `/crm/v4/associations/${fromType}/${toType}/labels`);
  const hit = (res.results || []).find((l) => (l.label || "") === label);
  if (!hit) throw new Error(`No association label "${label}" from ${fromType} to ${toType}`);
  return { associationCategory: hit.category, associationTypeId: hit.typeId };
}

async function associate(fromType, fromId, toType, toId, label) {
  if (!label) {
    return hs("PUT", `/crm/v4/objects/${fromType}/${fromId}/associations/default/${toType}/${toId}`);
  }
  const spec = await labelId(fromType, toType, label);
  return hs("PUT", `/crm/v4/objects/${fromType}/${fromId}/associations/${toType}/${toId}`, [spec]);
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

async function decoyValue(typeId, name) {
  const d = await hs("GET", `/crm/v3/properties/${typeId}/${name}`);
  if (d.calculated || d.modificationMetadata?.readOnlyValue) return null;
  if (d.type === "enumeration") return d.options?.[0]?.value ?? null;
  if (d.type === "date" || d.type === "datetime") return "2030-01-01";
  if (d.type === "number") return "99";
  if (d.type === "bool") return "true";
  return `AzT decoy ${N}`;
}

// Sets each decoy alone; reports what was set and what was skipped, by name only.
async function setDecoys(typeId, id, names) {
  const done = [];
  const skipped = [];
  for (const name of names) {
    try {
      const value = await decoyValue(typeId, name);
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
  console.log(`Sandbox ${acct.portalId} confirmed. Round ${N} (${S.name}). Mode: ${WRITE ? "WRITE" : "plan only"}.\n`);

  const pipeline = await hs("GET", "/crm/v3/pipelines/deals/default");
  const firstStage = [...pipeline.stages].sort((a, b) => a.displayOrder - b.displayOrder)[0];
  deal.dealstage = firstStage.id;
  console.log(`Case stage: the Client Pipeline's first stage, ${firstStage.label} (${firstStage.id}).`);

  const plan = {
    guardianContact: await settable(TYPES.contact, guardianContact),
    bcbaContact: await settable(TYPES.contact, bcbaContact),
    bt1Contact: await settable(TYPES.contact, btContact("Jane", `zeke+bt_azure_test_${N}@optidge.com`, "03")),
    bt2Contact: await settable(TYPES.contact, btContact("Jill", `zeke+bt2_azure_test_${N}@optidge.com`, "05")),
    bcba: await settable(TYPES.bcba, bcba),
    bcba2: await settable(TYPES.bcba, bcba2),
    bt1: await settable(TYPES.bt, bt("Jane", `zeke+bt_azure_test_${N}@optidge.com`)),
    bt2: await settable(TYPES.bt, bt("Jill", `zeke+bt2_azure_test_${N}@optidge.com`)),
    deal: await settable(TYPES.deal, deal)
  };
  for (const [name, p] of Object.entries(plan)) {
    console.log(`${name}: ${Object.keys(p.set).length} to set` +
      (p.readOnly.length ? `; read-only, not sent: ${p.readOnly.join(", ")}` : "") +
      (p.missing.length ? `; NOT FOUND: ${p.missing.join(", ")}` : ""));
  }
  if (!WRITE) {
    for (const [obj, typeId] of [["deal", TYPES.deal], ["bcba", TYPES.bcba], ["bt", TYPES.bt]]) {
      const plan = await setDecoys(typeId, "0", DECOYS[obj]);
      console.log(`decoys ${obj}: would set ${plan.done.join(", ") || "none"}` +
        (plan.skipped.length ? `; skipped: ${plan.skipped.join(", ")}` : ""));
    }
    console.log("\nPlan only. Nothing was written. Re-run with --write on Zeke's go-ahead.");
    return;
  }

  const ids = {};
  ids.guardianContact = await upsertContact(plan.guardianContact.set);
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
  await associate(TYPES.deal, ids.deal, TYPES.bcba, ids.bcba, "Supervising BCBA");
  await associate(TYPES.deal, ids.deal, TYPES.bcba, ids.bcba, "IA BCBA");
  // C11: RE is BCBA 2, so the IA and RE fields hold different names.
  await associate(TYPES.deal, ids.deal, TYPES.bcba, ids.bcba2, "RE BCBA");
  await associate(TYPES.deal, ids.deal, TYPES.bt, ids.bt1, "Primary BT 1");
  await associate(TYPES.deal, ids.deal, TYPES.bt, ids.bt2, "Primary BT 2");
  // C16: associations that are never synced. Neither may change a staff name field.
  await associate(TYPES.deal, ids.deal, TYPES.bcba, ids.bcba2, "Potential IA BCBA");
  await associate(TYPES.deal, ids.deal, TYPES.bcba, ids.bcba2, "Potential Supervising BCBA");
  await associate(TYPES.deal, ids.deal, TYPES.bt, ids.bt2, "Potential BT 1");
  await associate(TYPES.deal, ids.deal, TYPES.bt, ids.bt2); // unlabeled
  console.log("\nCreated and associated:", ids);

  const decoys = {
    deal: await setDecoys(TYPES.deal, ids.deal, DECOYS.deal),
    bcba: await setDecoys(TYPES.bcba, ids.bcba, DECOYS.bcba),
    bt1: await setDecoys(TYPES.bt, ids.bt1, DECOYS.bt)
  };
  console.log("Decoys (names only):", JSON.stringify(decoys));

  // Read back after the mirrors and automations have had time to run.
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
    return { differs: diffs, blankMirrors };
  };
  const report = {
    deal: await readBack(TYPES.deal, ids.deal, plan.deal.set, plan.deal.readOnly),
    bcba: await readBack(TYPES.bcba, ids.bcba, plan.bcba.set,
      ["address", "apartment__home", "city_home", "state_home", "postal_code_home", "employee_phone", "email"]),
    bt1: await readBack(TYPES.bt, ids.bt1, plan.bt1.set,
      ["street_home", "location_city", "state_home", "postal_code_home", "employee_phone", "email", "gender", "date_of_birth"])
  };
  console.log("Read-back (property names only):", JSON.stringify(report, null, 2));

  const outDir = resolve("docs/workstreams/architecture-update/sandbox-rounds");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, `round-${N}.json`),
    JSON.stringify({ round, state: S.name, createdAt: new Date().toISOString(), ids, decoys, report }, null, 2));
  console.log(`\nSaved IDs and read-back to sandbox-rounds/round-${N}.json. Entered in CentralReach is blank on every record.`);
}

main().catch((e) => {
  console.error(`Stopped: ${e.message}`);
  process.exit(1);
});
