// B5, row 1.4 (rule 5.7): the BCBA date of birth is read from the text property `date_of_birth`
// (item 1, O-10; Zeke 2026-11-23: "use date_of_birth, fill with the place holder birthday"; it
// replaces the `dob` of decision 48, which is no longer requested or read). Production holds it as
// plain text (EMP §1). The code converts the typed text to the date CentralReach gets in
// `dateOfBirth` (YYYY-MM-DD). Owner: "Make the code transform the format into a date format
// that's correct for central reach." US people: a date with the year last is month/day/year.
// Unreadable text ends the run as `error` with no CentralReach call; blank stays blank, and a
// create sends the placeholder 2000-01-01. The BT/RBT `date_of_birth` is text too and uses the same
// reader (item 16, T2). The Case dates are HubSpot date pickers and stay on the strict `readDate`.
// Only HubSpot is faked; the mapper, the worker and centralReachClient.mjs (fake HTTP adapter) are
// real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { readDate, readTextDate } from "../../lib/dates.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import {
  BCBA_DATE_OF_BIRTH_PROPERTY,
  buildEmployeePayload
} from "../../mappings/employees/buildEmployeePayload.mjs";
import { employeeRequestProperties } from "../../mappings/employees/employeeProperties.mjs";
import { buildClientPayload } from "../../mappings/client/buildClientPayload.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { employeeWorkflowDeps, workflowConfig } from "./stage2Fakes.mjs";
import {
  linkedBcba,
  seedStoredEmployee,
  setup,
  stage3Bcba,
  stage3Bt
} from "./stage3WorkerFakes.mjs";

const EMPLOYEE_PUT = "PUT /contacts/employee/{id}";
const EMPLOYEE_POST = "POST /contacts/employee";

// Every form below is 5 January 1990.
const ACCEPTED = [
  "1990-01-05",
  "  1990-01-05  ",
  "1990-1-5",
  "1990/01/05",
  "1990-01-05T00:00:00Z",
  "1990-01-05T00:00:00.000Z",
  "1990-01-05T23:30:00-05:00",
  "1990-01-05 10:30",
  "631497600000",
  "1/5/1990",
  "01/05/1990",
  "01-05-1990",
  "1-5-1990",
  "01.05.1990",
  "Jan 5, 1990",
  "Jan. 5, 1990",
  "January 5 1990",
  "january 5th, 1990",
  "JAN 5 1990",
  "5 Jan 1990",
  "5 January, 1990"
];

const REJECTED = [
  ["an impossible day", "02/30/1990"],
  ["month 13", "13/05/1990"],
  ["an impossible ISO date", "1990-02-30"],
  ["a two-digit year", "01/05/90"],
  ["a two-digit year with dashes", "1-5-90"],
  ["a year before 1900", "01/05/1899"],
  ["a date in the future", "01/05/2999"],
  ["tomorrow", "2026-11-22"],
  ["epoch milliseconds not at midnight UTC", "631497600001"],
  ["a short number", "5"],
  ["eight digits", "19900105"],
  ["zero", "0"],
  ["a month name that is not a month", "Foo 5, 1990"],
  ["mixed separators", "01/05-1990"],
  ["words", "not-a-date"]
];

const NOW = new Date("2026-11-21T12:00:00.000Z");

function bcbaPayload(dateOfBirth) {
  return buildEmployeePayload({
    employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA,
    config: workflowConfig(),
    record: {
      id: "HS2",
      properties: { hs_object_id: "HS2", first_name: "Pat", last_name: "Morgan", date_of_birth: dateOfBirth }
    }
  });
}

function runBcba(record) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS2", employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA },
    employeeWorkflowDeps({ record })
  );
}

test("[B5][1.4] the text date reader converts every accepted form to the same date", () => {
  for (const text of ACCEPTED) {
    assert.equal(readTextDate(text, { now: NOW }), "1990-01-05", text);
  }
  assert.equal(readTextDate("1965-01-01", { now: NOW }), "1965-01-01");
  assert.equal(readTextDate("-157766400000", { now: NOW }), "1965-01-01");
  assert.equal(readTextDate("12/31/1900", { now: NOW }), "1900-12-31");
  assert.equal(readTextDate("2026-11-21", { now: NOW }), "2026-11-21");
});

test("[B5][1.4] the text date reader: blank stays blank, every rejected class is unreadable", () => {
  for (const blank of ["", "   ", null, undefined]) {
    assert.equal(readTextDate(blank, { now: NOW }), "blank", String(blank));
  }
  for (const [name, text] of REJECTED) {
    assert.equal(readTextDate(text, { now: NOW }), "unreadable", name);
  }
});

test("[B5][1.4] the BCBA mapper sends every accepted form to CentralReach as dateOfBirth 1990-01-05", () => {
  for (const text of ACCEPTED) {
    const mapped = bcbaPayload(text);
    assert.equal(mapped.dateOfBirthStatus, "date", text);
    assert.equal(mapped.employeePayload.dateOfBirth, "1990-01-05", text);
  }
});

for (const text of ["01/05/1990", "Jan 5, 1990", "631497600000"]) {
  test(`[B5][1.4] a linked BCBA with date_of_birth "${text}" updates CentralReach with 1990-01-05`, async () => {
    const { cr } = setup();
    const record = linkedBcba(cr, { date_of_birth: text });
    const result = await runBcba(record);
    assert.equal(result.status, "success");
    const put = cr.calls.filter((call) => call.name === EMPLOYEE_PUT).at(-1);
    assert.equal(String(put.body.dateOfBirth).slice(0, 10), "1990-01-05");
  });
}

for (const [name, text] of REJECTED.filter(([name]) => !name.includes("future") && name !== "tomorrow")) {
  test(`[B5][1.4] a linked BCBA with ${name} as date_of_birth is error, with no CentralReach call`, async () => {
    const { cr } = setup();
    const record = linkedBcba(cr, { date_of_birth: text });
    const result = await runBcba(record);
    assert.equal(result.status, "error");
    assert.equal(record.properties.last_sync_error.includes("date_of_birth"), true);
    assert.equal(record.properties.last_sync_error.includes(text), false);
    assert.deepEqual(cr.calls, []);
  });
}

test("[B5][1.4] a linked BCBA with a date of birth in the future is error, with no CentralReach call", async () => {
  const { cr } = setup();
  const record = linkedBcba(cr, { date_of_birth: "01/05/2999" });
  const result = await runBcba(record);
  assert.equal(result.status, "error");
  assert.deepEqual(cr.calls, []);
});

test("[B5][1.4] a blank BCBA date of birth is still blank", () => {
  const mapped = bcbaPayload("   ");
  assert.equal(mapped.dateOfBirthStatus, "blank");
  assert.equal(mapped.employeePayload.dateOfBirth ?? null, null);
});

test("[B5][1.4] the BCBA date of birth property is date_of_birth, one constant; dob is not requested for a BCBA", () => {
  assert.equal(BCBA_DATE_OF_BIRTH_PROPERTY, "date_of_birth");
  const bcba = employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA);
  assert.equal(bcba.includes("date_of_birth"), true);
  assert.equal(bcba.includes("dob"), false);
  // BT/RBT is unchanged.
  const bt = employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BT_RBT);
  assert.equal(bt.includes("date_of_birth"), true);
  assert.equal(bt.includes("dob"), false);
});

test("[B5][1.4] a BCBA dob value is not read: only date_of_birth supplies the date of birth", () => {
  const mapped = buildEmployeePayload({
    employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA,
    config: workflowConfig(),
    record: stage3Bcba({ date_of_birth: "", dob: "1990-01-05" }).read()
  });
  assert.equal(mapped.dateOfBirthStatus, "blank");
  assert.equal(mapped.employeePayload.dateOfBirth ?? null, null);
});

test("[B5][1.4] date_of_birth typed as M/D/YYYY converts to YYYY-MM-DD", () => {
  for (const [text, date] of [
    ["3/2/1985", "1985-03-02"],
    ["12/31/1979", "1979-12-31"],
    ["7/23/1984", "1984-07-23"]
  ]) {
    const mapped = bcbaPayload(text);
    assert.equal(mapped.dateOfBirthStatus, "date", text);
    assert.equal(mapped.employeePayload.dateOfBirth, date, text);
  }
});

test("[B5][1.4] a new BCBA with a blank date_of_birth is created with the placeholder date of birth 2000-01-01 (decision 23)", async () => {
  const { cr } = setup();
  const record = stage3Bcba({ employee_id: "", email: "pat@uca.example", date_of_birth: "" });
  const result = await runBcba(record);
  assert.equal(result.status, "success");
  const post = cr.calls.filter((call) => call.name === EMPLOYEE_POST).at(-1);
  assert.ok(post, "the create was sent");
  assert.equal(post.body.dateOfBirth, "2000-01-01");
});

test("[B5][1.4] a new BCBA with dob filled and date_of_birth blank is created with the placeholder 2000-01-01: dob is never read", async () => {
  const { cr } = setup();
  const record = stage3Bcba({
    employee_id: "",
    email: "pat@uca.example",
    date_of_birth: "",
    dob: "7/23/1984"
  });
  const requested = [];
  const deps = employeeWorkflowDeps({ record });
  const result = await runEmployeeSyncWorkflow(
    { recordId: "HS2", employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA },
    {
      ...deps,
      getBcbaRecordById: async (id, type, names) => {
        requested.push(...names);
        return deps.getBcbaRecordById(id, type, names);
      }
    }
  );
  assert.equal(result.status, "success");
  assert.equal(requested.includes("dob"), false);
  assert.equal(requested.includes("date_of_birth"), true);
  const post = cr.calls.filter((call) => call.name === EMPLOYEE_POST).at(-1);
  assert.ok(post, "the create was sent");
  assert.equal(post.body.dateOfBirth, "2000-01-01");
});

test("[B5][1.4] a linked BCBA with a blank date_of_birth sends back the date CentralReach holds, never the placeholder", async () => {
  const { cr } = setup();
  seedStoredEmployee(cr, "5002", "1000002");
  const record = stage3Bcba({ date_of_birth: "" });
  const result = await runBcba(record);
  assert.equal(result.status, "success");
  const put = cr.calls.filter((call) => call.name === EMPLOYEE_PUT).at(-1);
  // Item 1, option (a): rebuilt as YYYY-MM-DDT00:00:00.000Z from the first 10 characters.
  assert.equal(put.body.dateOfBirth, "1988-04-09T00:00:00.000Z");
  assert.equal(JSON.stringify(put.body).includes("2000-01-01"), false);
});

test("[B5][T2][1.4] the Case date pickers keep the strict reader; the BT/RBT date_of_birth is read as text (item 16)", () => {
  for (const text of ["01/05/1990", "Jan 5, 1990", "631497600000"]) {
    assert.equal(readDate(text), "unreadable", text);
    const bt = buildEmployeePayload({
      employeeType: HUBSPOT_EMPLOYEE_TYPES.BT_RBT,
      config: workflowConfig(),
      record: stage3Bt({ date_of_birth: text }).read()
    });
    assert.equal(bt.dateOfBirthStatus, "date", text);
    assert.equal(bt.employeePayload.dateOfBirth, "1990-01-05", text);
    const client = buildClientPayload({ deal: { id: "deal-1", properties: { phi_date_of_birth: text } } });
    assert.equal(client.dateOfBirthStatus, "unreadable", text);
  }
  assert.equal(readDate("1990-01-05"), "1990-01-05");
  assert.equal(readDate("2999-01-05"), "2999-01-05");
  assert.equal(
    buildClientPayload({ deal: { id: "deal-1", properties: { phi_date_of_birth: "2017-01-14" } } }).DateOfBirth,
    "2017-01-14T00:00:00.000Z"
  );
});
