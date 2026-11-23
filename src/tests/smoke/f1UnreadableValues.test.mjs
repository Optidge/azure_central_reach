// Final review finding F-1 (owner's decision 2026-11-21): a phone, email, state or gender that is
// filled in HubSpot but cannot be converted to the format CentralReach stores is never sent as a
// blank and never sent malformed. The run ends as `error` ("Unreadable value: <property>", code
// UNREADABLE_VALUE) before any CentralReach write, on a create and on an update, like an
// unreadable date (rule 5.7). Blank keeps today's behaviour. CentralReach formats (production
// read of 2026-11-21, formats only): phoneCell 10 digits, stateProvince 2 upper-case letters,
// gender "Male" / "Female", primaryEmail an email; Meta 138069 is free text.
// Only HubSpot is faked. The mappers, the workers, cosmosState.mjs (in-memory container) and
// centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { readEmail, readGender, readPhone, readStateCode } from "../../lib/fieldFormats.mjs";
import { buildClientPayload } from "../../mappings/client/buildClientPayload.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { caseDeps } from "./laneDFakes.mjs";
import { employeeWorkflowDeps, workflowConfig } from "./stage2Fakes.mjs";
import {
  BCBA_LINK,
  BT_LINK,
  CASE_LINK,
  linkedBcba,
  linkedBt,
  linkedCase,
  setup,
  stage3Bcba,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";

const PERSONAL_EMAIL = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.PERSONAL_EMAIL;
const SUMMARY = "Sync run summary.";

const mapCase = (properties) => buildClientPayload({ deal: { id: "deal-1", properties } });
const mapEmployee = (employeeType, properties) =>
  buildEmployeePayload({
    record: { id: "HS9", properties: { hs_object_id: "HS9", ...properties } },
    employeeType,
    config: workflowConfig()
  });
const bt = (properties) => mapEmployee("bt_rbt", properties);
const bcba = (properties) => mapEmployee("bcba", properties);

// Distinctive filled values that no reader accepts. None may appear in a status or a log (BR21).
const BAD = Object.freeze({
  phone: "555-01",
  email: "guardian-at-example",
  state: "Xanadu",
  gender: "Unknown-Zq"
});

const runCase = (record, logs = []) =>
  runClientSyncWorkflow({ dealId: "deal-1", source: "hubspotWorkflow" }, caseDeps({ record, logs }));
const runBt = (record, logs = []) =>
  runEmployeeSyncWorkflow({ recordId: "HS1", employeeType: "bt_rbt" }, employeeWorkflowDeps({ record, logs }));
const runBcba = (record, logs = []) =>
  runEmployeeSyncWorkflow({ recordId: "HS2", employeeType: "bcba" }, employeeWorkflowDeps({ record, logs }));

function linkRecord(container, link) {
  return JSON.stringify(container.get(link.pk, link.id) ?? null);
}

// One run with a bad value: error, no CentralReach write, the property named, the value never
// shown, the summary code UNREADABLE_VALUE, and the link record exactly as it was.
async function assertUnreadableRun({ container, cr, record, run, link, property, value }) {
  const before = linkRecord(container, link);
  const writesBefore = cr.writes().length;
  const logs = [];
  const result = await run(record, logs);

  assert.equal(result.status, "error", property);
  assert.equal(cr.writes().length, writesBefore, `${property}: no CentralReach write`);
  assert.equal(record.properties.last_sync_status, "error", property);
  assert.equal(record.properties.last_sync_error, `Unreadable value: ${property}`, property);
  assert.equal(
    JSON.stringify([record.writes, logs]).includes(value),
    false,
    `${property}: the value is not in the status or the logs`
  );
  const summary = logs.find((entry) => entry.message === SUMMARY);
  assert.equal(summary?.meta?.reasonCode, "UNREADABLE_VALUE", property);
  assert.equal(linkRecord(container, link), before, `${property}: link record untouched`);
}

// --- the shared readers ---

test("[C8][4.1] F-1 phone reader: 10 digits, or 11 starting with 1, after the non-digits are stripped; anything else filled is unreadable", () => {
  assert.deepEqual(readPhone("(212) 555-0101"), { status: "value", value: "2125550101" });
  assert.deepEqual(readPhone("+1 212.555.0101"), { status: "value", value: "2125550101" });
  assert.deepEqual(readPhone("2125550101"), { status: "value", value: "2125550101" });
  for (const bad of ["555-0101", "212555010", "212555010199", "22125550101", "n/a"]) {
    assert.deepEqual(readPhone(bad), { status: "unreadable" }, bad);
  }
  for (const blank of ["", "   ", null, undefined]) {
    assert.deepEqual(readPhone(blank), { status: "blank" });
  }
});

// Owner (2026-11-21): numbers are always US-based; CentralReach stores the 10-digit number.
const PHONE_DIGITS = "2125550101";
const ACCEPTED_PHONES = [
  "2125550101",
  "212-555-0101",
  "212.555.0101",
  "(212) 555-0101",
  "212 555 0101",
  "  212/555_0101  ",
  "+1 212 555 0101",
  "+1 (212) 555-0101",
  "1-212-555-0101",
  "12125550101",
  "001 212 555 0101",
  "+001-212-555-0101",
  "212-555-0101 x123",
  "212-555-0101x123",
  "(212) 555-0101 ext 123",
  "212.555.0101 ext. 4",
  "212 555 0101 Ext.123",
  "212-555-0101 extension 55",
  "+1 212 555 0101 #123",
  "212-555-0101#9"
];
// Fewer than 10 digits, extra digits that are not a US prefix or a marked extension, and letters
// that are not an extension marker.
const UNREADABLE_PHONES = [
  "555-0101",
  "212-555-010",
  "555-0101 x123",
  "212-555-01011",
  "22125550101",
  "44 20 7946 0958",
  "+44 212 555 0101",
  "0212 555 0101",
  "212-555-0101 123",
  "212-555-0101 x",
  "212-555-0101 call after 5",
  "212-CALL-NOW",
  "tel 2125550101",
  "n/a"
];

test("[C8][4.1] US phone reader: every accepted form gives the same 10 digits; an extension is dropped; a value with no 10-digit US number is unreadable", () => {
  for (const input of ACCEPTED_PHONES) {
    assert.deepEqual(readPhone(input), { status: "value", value: PHONE_DIGITS }, input);
  }
  for (const input of UNREADABLE_PHONES) {
    assert.deepEqual(readPhone(input), { status: "unreadable" }, input);
  }
});

test("[C8][4.1] US phone: each accepted form gives the same 10 digits on the Case PhoneCell and on the BT/RBT and BCBA phoneCell", () => {
  for (const input of ACCEPTED_PHONES) {
    assert.equal(mapCase({ phone: input }).PhoneCell, PHONE_DIGITS, `Case ${input}`);
    assert.equal(bt({ employee_phone: input }).employeePayload.phoneCell, PHONE_DIGITS, `BT ${input}`);
    assert.equal(bcba({ employee_phone: input }).employeePayload.phoneCell, PHONE_DIGITS, `BCBA ${input}`);
  }
});

test("[T4][5.9] US phone: a phone with no 10-digit US number ends the Case, BT/RBT and BCBA update as error with no CentralReach write", async () => {
  for (const value of UNREADABLE_PHONES) {
    const caseSide = setup();
    const caseRecord = linkedCase(caseSide.cr, { phone: value });
    await assertUnreadableRun({ ...caseSide, record: caseRecord, run: runCase, link: CASE_LINK, property: "phone", value });

    const btSide = setup();
    const btRecord = linkedBt(btSide.cr, { employee_phone: value });
    await assertUnreadableRun({ ...btSide, record: btRecord, run: runBt, link: BT_LINK, property: "employee_phone", value });

    const bcbaSide = setup();
    const bcbaRecord = linkedBcba(bcbaSide.cr, { employee_phone: value });
    await assertUnreadableRun({ ...bcbaSide, record: bcbaRecord, run: runBcba, link: BCBA_LINK, property: "employee_phone", value });
  }
});

test("[C6][old] F-1 email reader: trimmed and lower case when it passes the shape check; filled and failing is unreadable", () => {
  assert.deepEqual(readEmail("  Pat@Example.COM "), { status: "value", value: "pat@example.com" });
  for (const bad of ["not-an-email", "a@b", "two words@example.com", "@example.com"]) {
    assert.deepEqual(readEmail(bad), { status: "unreadable" }, bad);
  }
  for (const blank of ["", "  ", null, undefined]) {
    assert.deepEqual(readEmail(blank), { status: "blank" });
  }
});

test("[C8][4.1] F-1 state reader: a real state code or name, dots and extra spaces dropped, sent as the 2-letter code; XX is unreadable", () => {
  const cases = [
    ["NY", "NY"],
    ["ny", "NY"],
    ["N.Y.", "NY"],
    [" New   York ", "NY"],
    ["new jersey", "NJ"],
    ["D.C.", "DC"],
    ["District of Columbia", "DC"]
  ];
  for (const [input, code] of cases) {
    assert.deepEqual(readStateCode(input), { status: "value", value: code }, input);
  }
  for (const bad of ["XX", "Xanadu", "N Y", "New Yorkk", "1"]) {
    assert.deepEqual(readStateCode(bad), { status: "unreadable" }, bad);
  }
  assert.deepEqual(readStateCode(""), { status: "blank" });
});

test("[C4][old] F-1 gender reader: male and female; m and f only where the side accepted them before", () => {
  assert.deepEqual(readGender(" Male "), { status: "value", value: "Male" });
  assert.deepEqual(readGender("FEMALE"), { status: "value", value: "Female" });
  assert.deepEqual(readGender("m"), { status: "unreadable" });
  assert.deepEqual(readGender("m", { allowInitials: true }), { status: "value", value: "Male" });
  assert.deepEqual(readGender("F", { allowInitials: true }), { status: "value", value: "Female" });
  assert.deepEqual(readGender("nonbinary", { allowInitials: true }), { status: "unreadable" });
  assert.deepEqual(readGender(""), { status: "blank" });
});

// --- the mappers ---

test("[C8][4.1] F-1 Case phone and stateregion: accepted formats convert, a filled bad value is named and sent as nothing, blank is null", () => {
  const good = mapCase({ phone: "1 (212) 555-0101", stateregion: "N.Y." });
  assert.equal(good.PhoneCell, "2125550101");
  assert.equal(good.StateProvince, "NY");
  assert.deepEqual(good.unreadableValueProperties, []);

  const bad = mapCase({ phone: BAD.phone, stateregion: "XX" });
  assert.equal(bad.PhoneCell, null);
  assert.equal(bad.StateProvince, null);
  assert.deepEqual(bad.unreadableValueProperties, ["phone", "stateregion"]);

  const blank = mapCase({ phone: "", stateregion: null });
  assert.equal(blank.PhoneCell, null);
  assert.equal(blank.StateProvince, null);
  assert.deepEqual(blank.unreadableValueProperties, []);
});

test("[C4][old] F-1 Case phi_gender: m and f were never accepted on the Case and are unreadable", () => {
  assert.deepEqual(mapCase({ phi_gender: "m" }).unreadableValueProperties, ["phi_gender"]);
});

test("[T4][5.9] F-1 BT/RBT employee_phone and state_home: accepted formats convert; any other digit count is unreadable (it used to be sent as it was)", () => {
  const good = bt({ employee_phone: "+1 (212) 555-0103", state_home: "colorado" });
  assert.equal(good.employeePayload.phoneCell, "2125550103");
  assert.equal(good.employeePayload.stateProvince, "CO");
  assert.equal(good.stateCode, "CO");
  assert.deepEqual(good.unreadableValueProperties, []);

  const bad = bt({ employee_phone: "212555", state_home: "XX" });
  assert.equal(bad.employeePayload.phoneCell, null);
  assert.equal(bad.employeePayload.stateProvince, null);
  assert.deepEqual(bad.unreadableValueProperties, ["state_home", "employee_phone"]);

  const blank = bt({ employee_phone: "", state_home: "" });
  assert.equal(blank.employeePayload.phoneCell, null);
  assert.equal(blank.employeePayload.stateProvince, null);
  assert.deepEqual(blank.unreadableValueProperties, []);
});

test("[B7][5.2] F-1 BCBA employee_phone and state_home: accepted formats convert, a filled bad value is unreadable, blank is null", () => {
  const good = bcba({ employee_phone: "212.555.0104", state_home: "N.J." });
  assert.equal(good.employeePayload.phoneCell, "2125550104");
  assert.equal(good.employeePayload.stateProvince, "NJ");
  assert.deepEqual(good.unreadableValueProperties, []);

  const bad = bcba({ employee_phone: "22345678901", state_home: "Xanadu" });
  assert.deepEqual(bad.unreadableValueProperties, ["state_home", "employee_phone"]);
  assert.deepEqual(bcba({ employee_phone: "", state_home: "" }).unreadableValueProperties, []);
});

test("[T3][5.9] F-1 BT/RBT gender: male, female, m and f convert; any other filled value is unreadable", () => {
  assert.equal(bt({ gender: "male" }).employeePayload.gender, "Male");
  assert.equal(bt({ gender: "F" }).employeePayload.gender, "Female");
  assert.deepEqual(bt({ gender: "other" }).unreadableValueProperties, ["gender"]);
  assert.equal(bt({ gender: "other" }).employeePayload.gender, null);
  assert.deepEqual(bt({ gender: "" }).unreadableValueProperties, []);
});

test("[B6][5.1] F-1 BCBA gender_new: Male and Female convert; any other filled value is unreadable; the archived gender is still not read", () => {
  assert.equal(bcba({ gender_new: "Female" }).employeePayload.gender, "Female");
  assert.equal(bcba({ gender_new: "m" }).employeePayload.gender, "Male");
  assert.deepEqual(bcba({ gender_new: "Prefer not to say" }).unreadableValueProperties, ["gender_new"]);
  assert.deepEqual(bcba({ gender: "nonsense" }).unreadableValueProperties, []);
});

test("[T2][1.3] F-1 BT/RBT email: trimmed and lower case; a filled email that fails the check is unreadable", () => {
  assert.equal(bt({ email: " Alex@Example.com " }).employeePayload.primaryEmail, "alex@example.com");
  const bad = bt({ email: BAD.email });
  assert.equal(bad.employeePayload.primaryEmail, null);
  assert.deepEqual(bad.unreadableValueProperties, ["email"]);
  assert.deepEqual(bt({ email: "" }).unreadableValueProperties, []);
});

test("[B4][1.3] F-1 BCBA email (primaryEmail, decision 49): trimmed and lower case; a filled email that fails the check is unreadable", () => {
  assert.equal(bcba({ email: "Pat@UCA.example" }).employeePayload.primaryEmail, "pat@uca.example");
  const bad = bcba({ email: BAD.email });
  assert.equal(bad.employeePayload.primaryEmail, null);
  // `email` feeds primaryEmail only; Meta 138069 reads `personal_email` (decision 50).
  assert.deepEqual(bad.unreadableValueProperties, ["email"]);
  assert.equal(Object.hasOwn(bad.metadataValues, PERSONAL_EMAIL), true);
  // ucaba_email_address is no longer read.
  assert.deepEqual(bcba({ ucaba_email_address: BAD.email }).unreadableValueProperties, []);
  assert.equal(bcba({ ucaba_email_address: "pat@uca.example" }).employeePayload.primaryEmail, null);
});

test("[B9][6.4] F-1 BCBA personal email (Meta 138069, decision 50): `personal_email` is read, never `email`; a filled one that fails the check is unreadable and not sent; blank still sends a blank", () => {
  const read = bcba({ email: "pat@uca.example", personal_email: "Pat@Home.example" });
  assert.equal(read.metadataValues[PERSONAL_EMAIL], "pat@home.example");
  assert.equal(read.employeePayload.primaryEmail, "pat@uca.example");
  const bad = bcba({ email: "pat@uca.example", personal_email: BAD.email });
  assert.equal(bad.metadataValues[PERSONAL_EMAIL], null);
  assert.equal(bad.employeePayload.primaryEmail, "pat@uca.example");
  assert.deepEqual(bad.unreadableValueProperties, ["personal_email"]);
  const blank = bcba({ email: "pat@uca.example", personal_email: "" });
  assert.equal(Object.hasOwn(blank.metadataValues, PERSONAL_EMAIL), true);
  assert.equal(blank.metadataValues[PERSONAL_EMAIL], null);
  assert.deepEqual(blank.unreadableValueProperties, []);
});

test("[T9][6.4] F-1 BT/RBT personal email is held (2026-11-23): `personal_email` is not read and no Meta 138069 is built", () => {
  const held = bt({ email: "alex@uca.example", personal_email: "Alex@Home.example" });
  assert.equal(Object.hasOwn(held.metadataValues, PERSONAL_EMAIL), false);
  assert.equal(held.employeePayload.primaryEmail, "alex@uca.example");
  const bad = bt({ personal_email: BAD.email });
  assert.equal(Object.hasOwn(bad.metadataValues, PERSONAL_EMAIL), false);
  assert.deepEqual(bad.unreadableValueProperties, []);
});

// --- the Case worker ---

const CASE_BAD = [
  ["C8", "phone", BAD.phone],
  ["C6", "email", BAD.email],
  ["C8", "stateregion", BAD.state],
  ["C4", "phi_gender", BAD.gender]
];

test("[C8][4.1] F-1 Case create: a filled phone, email, state or gender that cannot be converted ends as error with no CentralReach write", async () => {
  for (const [, property, value] of CASE_BAD) {
    const { container, cr } = setup();
    const record = stage3Case({ [property]: value });
    await assertUnreadableRun({ container, cr, record, run: runCase, link: CASE_LINK, property, value });
    assert.equal(cr.count("POST /contacts/client"), 0, property);
  }
});

test("[C8][4.1] F-1 Case update: a filled phone, email, state or gender that cannot be converted ends as error, sends no blank, and leaves the link record as it was", async () => {
  for (const [, property, value] of CASE_BAD) {
    const { container, cr } = setup();
    const record = linkedCase(cr, { phone: "2125550101", email: "g@example.com", stateregion: "NY" });
    assert.equal((await runCase(record)).status, "success", `${property}: first run syncs`);
    record.properties[property] = value;
    await assertUnreadableRun({ container, cr, record, run: runCase, link: CASE_LINK, property, value });
  }
});

test("[C8][4.1] F-1 Case: blank phone, email, state and gender still sync as before", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { phone: "", email: "", stateregion: "", phi_gender: "" });
  assert.equal((await runCase(record)).status, "success");
  const [put] = cr.calls.filter((call) => call.name === "PUT /contacts/client/{id}");
  assert.equal(put.body.PhoneCell, null);
  assert.equal(put.body.StateProvince, null);
  assert.equal(Object.hasOwn(put.body, "unreadableValueProperties"), false);
});

test("[C20][4.6] F-1 a filled hours input that is not a number ends the Case run as an unreadable value, not an unreadable date", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { hours_bt_work_schedule_1: "nine-ish", bt_rbt_2_work_schedule: "7" });
  await assertUnreadableRun({
    container,
    cr,
    record,
    run: runCase,
    link: CASE_LINK,
    property: "hours_bt_work_schedule_1",
    value: "nine-ish"
  });
});

// --- the employee workers ---

const BT_BAD = [
  ["employee_phone", BAD.phone],
  ["email", BAD.email],
  ["state_home", BAD.state],
  ["gender", BAD.gender]
];

const BCBA_BAD = [
  ["employee_phone", BAD.phone],
  // primaryEmail reads `email` (decision 49); Meta 138069 reads `personal_email` (decision 50).
  ["email", BAD.email],
  ["personal_email", BAD.email],
  ["state_home", BAD.state],
  ["gender_new", BAD.gender]
];

test("[T4][5.9] F-1 BT/RBT create: a filled phone, email, state or gender that cannot be converted ends as error with no CentralReach write", async () => {
  for (const [property, value] of BT_BAD) {
    const { container, cr } = setup();
    const record = stage3Bt({ [property]: value });
    await assertUnreadableRun({ container, cr, record, run: runBt, link: BT_LINK, property, value });
  }
});

test("[T4][5.9] F-1 BT/RBT update: a filled phone, email, state or gender that cannot be converted ends as error and leaves the link record as it was", async () => {
  for (const [property, value] of BT_BAD) {
    const { container, cr } = setup();
    const record = linkedBt(cr, { employee_phone: "2125550103", state_home: "CO", gender: "female" });
    assert.equal((await runBt(record)).status, "success", `${property}: first run syncs`);
    record.properties[property] = value;
    await assertUnreadableRun({ container, cr, record, run: runBt, link: BT_LINK, property, value });
  }
});

test("[B7][5.2] F-1 BCBA create: a filled phone, email, personal email, state or gender that cannot be converted ends as error with no CentralReach write", async () => {
  for (const [property, value] of BCBA_BAD) {
    const { container, cr } = setup();
    const record = stage3Bcba({ employee_id: "", email: "pat@uca.example", [property]: value });
    await assertUnreadableRun({ container, cr, record, run: runBcba, link: BCBA_LINK, property, value });
  }
});

test("[B7][5.2] F-1 BCBA update: a filled phone, email, personal email, state or gender that cannot be converted ends as error and leaves the link record as it was", async () => {
  for (const [property, value] of BCBA_BAD) {
    const { container, cr } = setup();
    const record = linkedBcba(cr, { employee_phone: "2125550104", state_home: "NY", gender_new: "Male" });
    assert.equal((await runBcba(record)).status, "success", `${property}: first run syncs`);
    record.properties[property] = value;
    await assertUnreadableRun({ container, cr, record, run: runBcba, link: BCBA_LINK, property, value });
  }
});

test("[T2][1.3] F-1 employee create: a blank primary email is still a missing required field, and blank phone, state and gender still sync", async () => {
  const { cr } = setup();
  const missing = stage3Bt({ email: "" });
  assert.equal((await runBt(missing)).status, "error");
  assert.equal(missing.properties.last_sync_error, "Missing required field: email");
  assert.deepEqual(cr.writes(), []);

  const blank = stage3Bt({ employee_phone: "", state_home: "", gender: "" });
  assert.equal((await runBt(blank)).status, "success");
});
