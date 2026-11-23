// BR21 (BUILD-PLAN.md section 9.1): "Logs and status reasons name fields, never values. No child's
// full name in any message." The plan row names no row of its own, so every title here uses [3.9]:
// the changed-fields log line is the line a value is most likely to reach.
//
// Each test runs the real workflow on a record whose every person value is distinctive, with a
// shared sink that collects all of the text a run can put out:
//   - every log call: level, message and meta (the fake logger keeps the meta as it is passed,
//     before safeLog's own email and phone redaction, so a leak cannot hide behind it)
//   - every status sentence written to HubSpot: last_sync_status and last_sync_error
//   - every message queued on the Service Bus (bodies)
//   - the name, code and message of an error the worker threw (the queue worker logs it)
// Then it asserts that none of the distinctive values is anywhere in that text.
// Only HubSpot, CentralReach (HTTP level), the state container and the Service Bus senders are
// faked. The mappers, validator, hash, workflows and CentralReach client are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import {
  sendClientSyncMessage,
  sendEmployeeSyncMessage,
  useServiceBusSenders
} from "../../lib/serviceBusClient.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runContactFanOutWorkflow } from "../../workflows/contactFanOutWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { caseDeps, caseStaff, roleRow, ROLE_TYPE } from "./laneDFakes.mjs";
import {
  employeeWorkflowDeps,
  httpError,
  hubspotAnswer,
  workflowConfig
} from "./stage2Fakes.mjs";
import {
  linkedBcba,
  linkedBt,
  linkedCase,
  seedEmployee,
  setup,
  stage3Bcba,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";

// --- distinctive values -------------------------------------------------------------------
// Nobody could mistake one of these for a field name, an ID, a code or a number the integration
// logs on its own.

const CASE_VALUES = Object.freeze({
  phi_first_name__cloned_: "Zorblaxen",
  phi_last_name: "Quenbyworth",
  phi_date_of_birth: "2016-03-09",
  email: "zorblaxen.quenby@example.com",
  phone: "(518) 555-0142",
  street_address: "742 Evergreen Terrace",
  home_apt: "Apt 9Q",
  location_city: "Thistledown",
  postal_code: "60731",
  guardian_first_name: "Mortimer",
  guardian_last_name: "Fenwickson",
  policy_holder_name: "Wilhelmina Fitzgibbon",
  care_coordinator_name: "Ottoline Brightwater",
  insurance_id_1: "INS-7Q4X9Z",
  insurance_id_2: "INS-2R8K5W",
  referring_provider_medicaid_id: "MCD-6T3V1B",
  physician_name: "Balthazar Quillfeather",
  npi_number: "1093847562"
});

// What an update changes: new values, also distinctive. The old ones stay in the list too.
const CASE_CHANGED_VALUES = Object.freeze({
  phi_first_name__cloned_: "Xanthippe",
  phi_last_name: "Vandersloop",
  email: "xanthippe.vander@example.com",
  phone: "(212) 555-0199",
  street_address: "19 Marigold Crescent",
  postal_code: "84529",
  guardian_first_name: "Leopoldina",
  insurance_id_1: "INS-5M2N8D"
});

const STAFF = Object.freeze({
  ia: "Peregrine Thistlewood",
  bt1: "Cornelius Ashdown",
  bt2: "Philippa Greenhalgh",
  re: "Barnabas Higginbottom"
});

// A staff name leaks as a full name or as its first and last parts, so each part is a value too.
const STAFF_VALUES = Object.freeze(Object.values(STAFF).flatMap((name) => [name, ...name.split(" ")]));

const BAD_DATE = "Gloamingdale-13/45";

const BCBA_VALUES = Object.freeze({
  first_name: "Evangelina",
  last_name: "Marchbanks",
  dob: "7/23/1984",
  email: "evangelina.march@ucaba.example",
  address: "88 Larkspur Lane",
  apartment__home: "Unit 5K",
  city_home: "Wimbledown",
  postal_code_home: "48217",
  employee_phone: "(646) 555-0187",
  medicaid_id__ny: "NYM-4D7H2P",
  medicaid_id__nj: "NJM-9C5F3L",
  medicaid_id__co: "COM-1B6G8S"
});
const BCBA_CONTACT_EMAIL = "evangelina.personal@contact.example";

const BT_VALUES = Object.freeze({
  first_name: "Hortensia",
  last_name: "Blackwoodsworth",
  date_of_birth: "1991-11-04",
  email: "hortensia.black@example.com",
  street_home: "301 Dandelion Drive",
  home_apt: "Flat 12C",
  location_city: "Marlowby",
  postal_code_home: "73915",
  employee_phone: "(315) 555-0163",
  street_address__work_: "55 Quillon Quay",
  apartment__work: "Suite 8X",
  city__work_: "Ashgrovehaven",
  postal_code__work_: "29604"
});
const BT_CHANGED_VALUES = Object.freeze({
  first_name: "Ignatius",
  last_name: "Pemberthwaite",
  email: "ignatius.pember@example.com",
  employee_phone: "(716) 555-0121",
  street_home: "9 Thornberry Row",
  postal_code_home: "51873"
});

const CONTACT_VALUES = Object.freeze({
  firstname: "Octavia",
  lastname: "Winterbottomley",
  email: "octavia.winter@contact.example",
  phone: "(917) 555-0133"
});

// Every value, with the forms the integration itself makes of it: lower case, and a phone as
// digits only.
function withForms(values) {
  const forms = new Set();
  for (const value of values.filter(Boolean).map(String)) {
    forms.add(value);
    forms.add(value.toLowerCase());
    const digits = value.replace(/\D+/g, "");
    if (/^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(value) && digits.length === 10) {
      forms.add(digits);
      forms.add(`1${digits}`);
      forms.add(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`);
    }
  }
  return [...forms];
}

const caseValues = (...objects) => withForms(objects.flatMap((object) => Object.values(object)));

// --- the sink ------------------------------------------------------------------------------

function newSink() {
  return { logs: [], queued: [], thrown: [], statuses: [] };
}

function statusSentences(record) {
  return record.writes.flatMap((patch) =>
    ["last_sync_status", "last_sync_error"]
      .filter((name) => Object.hasOwn(patch, name))
      .map((name) => ({ [name]: patch[name] }))
  );
}

function collectedText(sink, record) {
  return JSON.stringify({
    logs: sink.logs,
    statuses: [...sink.statuses, ...statusSentences(record)],
    queued: sink.queued,
    thrown: sink.thrown
  });
}

// The value is named by its position in the list, never printed: a failing run must not put a
// person value in the test output either.
function assertNoValues(sink, record, values) {
  const text = collectedText(sink, record).toLowerCase();
  // The test means something: there is a summary line, and the text is not empty.
  assert.equal(
    sink.logs.some((entry) => entry.message === "Sync run summary."),
    true,
    "the run logged its summary line"
  );
  values.forEach((value, index) => {
    assert.equal(
      text.includes(String(value).toLowerCase()),
      false,
      `a person value (number ${index} of the fixture) is in a log line, status or queued message`
    );
  });
}

// The values did reach CentralReach, so a clean log is not just a run that sent nothing.
function assertValuesWereSent(cr, values) {
  const requests = JSON.stringify(cr.calls).toLowerCase();
  const sent = values.filter((value) => requests.includes(String(value).toLowerCase()));
  assert.equal(sent.length > 0, true, "the run sent person values to CentralReach");
}

// --- runners -------------------------------------------------------------------------------

function staffOnCase({ nameless = false } = {}) {
  return caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia), roleRow("302", ROLE_TYPE.re)],
    btRows: [
      roleRow("311", ROLE_TYPE.bt1),
      ...(nameless ? [roleRow("313", ROLE_TYPE.bt1)] : []),
      roleRow("312", ROLE_TYPE.bt2)
    ],
    names: {
      301: { first_name: "Peregrine", last_name: "Thistlewood" },
      302: { first_name: "Barnabas", last_name: "Higginbottom" },
      311: { first_name: "Cornelius", last_name: "Ashdown" },
      312: { first_name: "Philippa", last_name: "Greenhalgh" },
      // A staff record with no name: the mapper warns and leaves the role's field out.
      ...(nameless ? { 313: { first_name: "", last_name: "" } } : {})
    }
  });
}

async function guarded(sink, run) {
  try {
    return await run();
  } catch (error) {
    sink.thrown.push({
      name: error?.name,
      code: error?.code,
      message: error?.message,
      status: error?.response?.status
    });
    return { thrown: error };
  }
}

function runCase(sink, record, { source = "hubspotWorkflow", lastAttempt = false, staff, overrides = {} } = {}) {
  const logs = [];
  const deps = caseDeps({
    record,
    logs,
    staff: staff || staffOnCase(),
    labelReadBackDelayMs: 0,
    ...overrides
  });
  return guarded(sink, async () => {
    try {
      return await runClientSyncWorkflow(
        {
          dealId: record.properties.hs_object_id,
          source,
          context: { invocationId: "inv-br21" },
          lastAttempt,
          attempt: 0
        },
        deps
      );
    } finally {
      sink.logs.push(...logs);
    }
  });
}

function runEmployee(sink, record, employeeType, { source = "hubspotWorkflow", lastAttempt = false, overrides = {} } = {}) {
  const logs = [];
  const deps = { ...employeeWorkflowDeps({ record, logs }), labelReadBackDelayMs: 0, ...overrides };
  return guarded(sink, async () => {
    try {
      return await runEmployeeSyncWorkflow(
        {
          recordId: record.properties.hs_object_id,
          employeeType,
          source,
          context: { invocationId: "inv-br21" },
          lastAttempt,
          attempt: 0
        },
        deps
      );
    } finally {
      sink.logs.push(...logs);
    }
  });
}

// A CentralReach 4xx whose body repeats what was sent, as CentralReach's free-text message can.
function echoingBody(values) {
  return {
    responseStatus: {
      errorCode: "ValidationError",
      message: `Invalid request for ${values.join(" ")}`,
      errors: values.map((value) => ({ fieldName: "FirstName", message: `Bad value ${value}` }))
    }
  };
}

// --- Case run ------------------------------------------------------------------------------

test("[BR21][3.9] Case run, create: no person value in any log, status or message", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = stage3Case(CASE_VALUES);
  const result = await runCase(sink, record);
  assert.equal(result.status, "success");
  assert.equal(result.operation, "create");
  assertValuesWereSent(cr, withForms([CASE_VALUES.phi_first_name__cloned_, CASE_VALUES.street_address]));
  assertNoValues(sink, record, [...caseValues(CASE_VALUES), ...withForms(STAFF_VALUES)]);
});

test("[BR21][3.9] Case run, update that changes many fields (found by the poller): the changed-fields line names fields only", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = linkedCase(cr, CASE_VALUES);
  const first = await runCase(sink, record, { source: "hubspotWorkflow" });
  assert.equal(first.status, "success");

  record.write(CASE_CHANGED_VALUES);
  const second = await runCase(sink, record, { source: "intakePoller" });
  assert.equal(second.status, "success");
  assert.equal(second.operation, "update");
  assert.equal(second.changedFieldNames.length >= 5, true);
  // The changed-fields warning line (row 3.9) was written, so the check covers it.
  assert.equal(
    sink.logs.some((entry) => entry.level === "warn" && entry.meta?.changedFieldNames?.length >= 5),
    true
  );
  assertValuesWereSent(cr, withForms(Object.values(CASE_CHANGED_VALUES)));
  assertNoValues(sink, record, [
    ...caseValues(CASE_VALUES, CASE_CHANGED_VALUES),
    ...withForms(STAFF_VALUES)
  ]);
});

test("[BR21][3.9] Case run, mapper warning (a staff record with no name): the warning names the role, never a staff name", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = linkedCase(cr, CASE_VALUES);
  const result = await runCase(sink, record, { staff: staffOnCase({ nameless: true }) });
  assert.equal(result.status, "success");
  const warning = sink.logs.find((entry) => entry.message === "Client metadata mapper warning.");
  assert.ok(warning, "the mapper warning was logged");
  assert.equal(warning.meta.code, "staff_name_unreadable");
  assertNoValues(sink, record, [...caseValues(CASE_VALUES), ...withForms(STAFF_VALUES)]);
});

test("[BR21][3.9] Case run, decided error (an answer without a requested key; an unreadable date): reasons name properties only", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = linkedCase(cr, CASE_VALUES);
  const missingKey = await runCase(sink, record, {
    overrides: {
      getDealById: async (dealId, names) => {
        const answer = hubspotAnswer(record.read(), names);
        delete answer.properties.phi_last_name;
        return answer;
      }
    }
  });
  assert.equal(missingKey.status, "error");

  record.write({ ongoing_auth_period_start_date: BAD_DATE });
  const unreadable = await runCase(sink, record);
  assert.equal(unreadable.status, "error");
  assert.equal(
    statusSentences(record).some((item) => Object.hasOwn(item, "last_sync_error")),
    true,
    "a status sentence was written"
  );
  assertNoValues(sink, record, [
    ...caseValues(CASE_VALUES),
    ...withForms([BAD_DATE, "Gloamingdale"]),
    ...withForms(STAFF_VALUES)
  ]);
});

test("[BR21][3.9] Case run, CentralReach failure: a 400 that echoes values, and a thrown 500 that echoes values", async () => {
  const { cr } = setup();
  const sink = newSink();
  const echoed = [CASE_VALUES.phi_first_name__cloned_, CASE_VALUES.email, CASE_VALUES.street_address];
  const record = linkedCase(cr, CASE_VALUES);

  cr.fail("PUT /contacts/client/{id}", httpError(400, { data: echoingBody(echoed) }));
  const refused = await runCase(sink, record);
  assert.equal(refused.status, "error");

  // A temporary failure is thrown so the queue worker retries; on the last attempt the status
  // sentence is written too.
  cr.fail("PUT /contacts/client/{id}", httpError(500, { data: echoingBody(echoed) }), { times: 20 });
  const thrown = await runCase(sink, record, { lastAttempt: true });
  assert.equal(thrown.thrown?.response?.status, 500, "the 500 was thrown");

  assertNoValues(sink, record, [...caseValues(CASE_VALUES), ...withForms(STAFF_VALUES)]);
});

test("[BR21][3.9] Case run, label step: a refused label POST that echoes values, and a label missing from the catalog", async () => {
  const { cr } = setup();
  const sink = newSink();
  const echoed = [CASE_VALUES.phi_last_name, CASE_VALUES.guardian_first_name];
  const record = linkedCase(cr, CASE_VALUES);

  cr.fail("POST /contacts/{id}/labels", httpError(400, { data: echoingBody(echoed) }));
  const refused = await runCase(sink, record);
  assert.equal(refused.status, "error");

  // The live catalog lacks every label: nothing is posted and the run fails on the label step.
  cr.catalog = [1];
  const missing = await runCase(sink, record, { lastAttempt: true });
  assert.equal(missing.thrown?.code, "CR_LABEL_NOT_IN_CATALOG");

  assertNoValues(sink, record, [...caseValues(CASE_VALUES), ...withForms(STAFF_VALUES)]);
});

// --- BCBA run ------------------------------------------------------------------------------

// The BCBA's Contact, linked by BCBA -> Contact 191 (sandbox).
function bcbaContact(email = BCBA_CONTACT_EMAIL) {
  return {
    listAssociations: async () => [
      { toObjectId: "801", types: [{ typeId: 191, category: "USER_DEFINED" }] }
    ],
    getContactById: async (contactId, names) =>
      hubspotAnswer({ id: contactId, properties: { email } }, names)
  };
}

const BCBA_RECORD_VALUES = Object.freeze({
  ...BCBA_VALUES,
  gender_new: "Female",
  state_home: "NJ",
  location: "New York;New Jersey"
});

const bcbaValues = () => withForms([...Object.values(BCBA_VALUES), BCBA_CONTACT_EMAIL]);

test("[BR21][3.9] BCBA run, create and update: no person value in any log, status or message", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = stage3Bcba({ ...BCBA_RECORD_VALUES, employee_id: "" });
  const created = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    overrides: bcbaContact()
  });
  assert.equal(created.status, "success");
  assert.equal(created.operation !== undefined || created.crContactId !== undefined, true);
  assertValuesWereSent(cr, withForms([BCBA_VALUES.first_name, BCBA_CONTACT_EMAIL]));

  // An update that changes several fields, found by the poller.
  record.write({
    first_name: "Cassiopeia",
    last_name: "Longfellowship",
    address: "6 Hollyhock Hollow",
    employee_phone: "(212) 555-0177"
  });
  const updated = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    source: "employeePoller",
    overrides: bcbaContact("cassiopeia.personal@contact.example")
  });
  assert.equal(updated.status, "success");
  assertNoValues(sink, record, [
    ...bcbaValues(),
    ...withForms(["Cassiopeia", "Longfellowship", "6 Hollyhock Hollow", "(212) 555-0177"]),
    ...withForms(["cassiopeia.personal@contact.example"])
  ]);
});

test("[BR21][3.9] BCBA run, mapper warning (a Work State option with no mapping): the warning names a code, never the email", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = linkedBcba(cr, { ...BCBA_RECORD_VALUES, location: "New York;Atlantis" });
  const result = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    overrides: bcbaContact()
  });
  assert.equal(result.status, "success");
  const warning = sink.logs.find((entry) => entry.message === "Employee mapping warnings.");
  assert.ok(warning, "the mapping warning was logged");
  assert.deepEqual(warning.meta.warningCodes, ["unmapped_work_state"]);
  assertNoValues(sink, record, bcbaValues());
});

test("[BR21][3.9] BCBA run, decided error (a missing key; an unreadable date)", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = linkedBcba(cr, BCBA_RECORD_VALUES);
  const missingKey = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    overrides: {
      ...bcbaContact(),
      getBcbaRecordById: async (id, type, names) => {
        const answer = hubspotAnswer(record.read(), names);
        delete answer.properties.medicaid_id__ny;
        return answer;
      }
    }
  });
  assert.equal(missingKey.status, "error");

  record.write({ dob: BAD_DATE });
  const unreadable = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    overrides: bcbaContact()
  });
  assert.equal(unreadable.status, "error");

  assertNoValues(sink, record, [...bcbaValues(), ...withForms([BAD_DATE, "Gloamingdale"])]);
});

test("[BR21][3.9] BCBA run, CentralReach failure: a 400 and a thrown 500 that echo values", async () => {
  const { cr } = setup();
  const sink = newSink();
  const echoed = [BCBA_VALUES.first_name, BCBA_CONTACT_EMAIL, BCBA_VALUES.address];
  const record = linkedBcba(cr, BCBA_RECORD_VALUES);

  cr.fail("PUT /contacts/employee/{id}", httpError(400, { data: echoingBody(echoed) }));
  const refused = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    overrides: bcbaContact()
  });
  assert.equal(refused.status, "error");

  cr.fail("PUT /contacts/employee/{id}", httpError(500, { data: echoingBody(echoed) }), { times: 20 });
  const thrown = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    lastAttempt: true,
    overrides: bcbaContact()
  });
  assert.equal(thrown.thrown?.response?.status, 500, "the 500 was thrown");

  assertNoValues(sink, record, bcbaValues());
});

test("[BR21][3.9] BCBA run, label step: a refused label POST that echoes values, and a label missing from the catalog", async () => {
  const { cr } = setup();
  const sink = newSink();
  const echoed = [BCBA_VALUES.last_name, BCBA_CONTACT_EMAIL];
  const record = linkedBcba(cr, BCBA_RECORD_VALUES);

  cr.fail("POST /contacts/{id}/labels", httpError(400, { data: echoingBody(echoed) }));
  const refused = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    overrides: bcbaContact()
  });
  assert.equal(refused.status, "error");

  cr.catalog = [1];
  const missing = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BCBA, {
    lastAttempt: true,
    overrides: bcbaContact()
  });
  assert.equal(missing.thrown?.code, "CR_LABEL_NOT_IN_CATALOG");

  assertNoValues(sink, record, bcbaValues());
});

// --- BT/RBT run ----------------------------------------------------------------------------

const BT_RECORD_VALUES = Object.freeze({
  ...BT_VALUES,
  gender: "Male",
  state_home: "NY",
  state__work_: "NY",
  location: "New York",
  bt_rbt_type: "RBT"
});
const btValues = () => withForms(Object.values(BT_VALUES));

test("[BR21][3.9] BT/RBT run, create and update: no person value in any log, status or message", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = stage3Bt({ ...BT_RECORD_VALUES, employee_id: "" });
  const created = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT);
  assert.equal(created.status, "success");
  assertValuesWereSent(cr, withForms([BT_VALUES.first_name, BT_VALUES.email]));

  record.write(BT_CHANGED_VALUES);
  const updated = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT, {
    source: "dailySweep"
  });
  assert.equal(updated.status, "success");
  assert.equal(
    sink.logs.some((entry) => entry.level === "warn" && entry.meta?.changedFieldNames?.length >= 3),
    true,
    "the changed-fields line was written"
  );
  assertNoValues(sink, record, [...btValues(), ...withForms(Object.values(BT_CHANGED_VALUES))]);
});

test("[BR21][3.9] BT/RBT run, create with no date of birth (placeholder warning) and a mapper warning", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = stage3Bt({
    ...BT_RECORD_VALUES,
    employee_id: "",
    date_of_birth: "",
    location: "New York;Atlantis",
    bt_rbt_type: "Technician"
  });
  const result = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT);
  assert.equal(result.status, "success");
  const warning = sink.logs.find((entry) => entry.message === "Employee mapping warnings.");
  assert.ok(warning, "the mapping warning was logged");
  assert.equal(
    sink.logs.some((entry) => entry.message.startsWith("Employee created in Central Reach with the placeholder")),
    true
  );
  assertNoValues(sink, record, btValues());
});

test("[BR21][3.9] BT/RBT run, decided error (a missing key; a workday_id that differs from CentralReach)", async () => {
  const { cr } = setup();
  const sink = newSink();
  const record = stage3Bt({ ...BT_RECORD_VALUES, employee_id: "5001" });
  seedEmployee(cr, "5001", "WD-OTHER");
  const mismatch = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT);
  assert.equal(mismatch.status, "error");

  const missingKey = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT, {
    overrides: {
      getBtRbtRecordById: async (id, type, names) => {
        const answer = hubspotAnswer(record.read(), names);
        delete answer.properties.street_home;
        return answer;
      }
    }
  });
  assert.equal(missingKey.status, "error");

  assertNoValues(sink, record, btValues());
});

test("[BR21][3.9] BT/RBT run, CentralReach failure: a 400 and a thrown 500 that echo values", async () => {
  const { cr } = setup();
  const sink = newSink();
  const echoed = [BT_VALUES.first_name, BT_VALUES.email, BT_VALUES.street_home];
  const record = linkedBt(cr, BT_RECORD_VALUES);

  cr.fail("PUT /contacts/employee/{id}", httpError(400, { data: echoingBody(echoed) }));
  const refused = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT);
  assert.equal(refused.status, "error");

  cr.fail("PUT /contacts/employee/{id}", httpError(500, { data: echoingBody(echoed) }), { times: 20 });
  const thrown = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT, { lastAttempt: true });
  assert.equal(thrown.thrown?.response?.status, 500, "the 500 was thrown");

  assertNoValues(sink, record, btValues());
});

test("[BR21][3.9] BT/RBT run, label step: a refused label POST that echoes values, and a label missing from the catalog", async () => {
  const { cr } = setup();
  const sink = newSink();
  const echoed = [BT_VALUES.last_name, BT_VALUES.email];
  const record = linkedBt(cr, BT_RECORD_VALUES);

  cr.fail("POST /contacts/{id}/labels", httpError(400, { data: echoingBody(echoed) }));
  const refused = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT);
  assert.equal(refused.status, "error");

  cr.catalog = [1];
  const missing = await runEmployee(sink, record, HUBSPOT_EMPLOYEE_TYPES.BT_RBT, { lastAttempt: true });
  assert.equal(missing.thrown?.code, "CR_LABEL_NOT_IN_CATALOG");

  assertNoValues(sink, record, btValues());
});

// --- Contact fan-out -----------------------------------------------------------------------

// Service Bus senders that keep what the real message builders made.
function captureQueue(sink) {
  useServiceBusSenders({
    clientSyncSender: { sendMessages: async (message) => sink.queued.push(message) },
    employeeSyncSender: { sendMessages: async (message) => sink.queued.push(message) }
  });
}

function fanOutDeps(sink, { contactProperties = {}, associationError = null, contactError = null } = {}) {
  const rows = (ids, typeId) =>
    ids.map((id) => ({ toObjectId: id, types: [{ typeId, category: "HUBSPOT_DEFINED" }] }));
  return {
    getConfig: () => workflowConfig(),
    createHubSpotClient: () => {},
    ensureServiceBusClient: () => {},
    safeLog: (level, message, meta) => sink.logs.push({ level, message, meta }),
    sendClientSyncMessage,
    sendEmployeeSyncMessage,
    // The Contact holds person values besides test_record. The fan-out asks for test_record only;
    // a fake that answers more shows that none of it is copied into a log or a message.
    getContactById: async (contactId, names) => {
      if (contactError) {
        throw contactError;
      }
      return hubspotAnswer(
        { id: contactId, properties: { test_record: null, ...CONTACT_VALUES, ...contactProperties } },
        names
      );
    },
    listAssociations: async () => {
      if (associationError) {
        throw associationError;
      }
      return rows(["9001", "9002"], 4);
    }
  };
}

const contactValues = () => withForms(Object.values(CONTACT_VALUES));
const NO_RECORD = { writes: [] };

test("[BR21][3.9] Contact fan-out: the run, the queued messages and the summary line hold no Contact value", async () => {
  const sink = newSink();
  captureQueue(sink);
  const result = await runContactFanOutWorkflow(
    { contactId: "701", source: "hubspotWorkflow", context: { invocationId: "inv-br21" } },
    fanOutDeps(sink)
  );
  assert.equal(result.status, "queued");
  assert.equal(sink.queued.length, 2);
  assertNoValues(sink, NO_RECORD, contactValues());
});

test("[BR21][3.9] Contact fan-out: a test_record skip, a failed association read and a refused Contact read hold no Contact value", async () => {
  const sink = newSink();
  captureQueue(sink);
  const skipped = await runContactFanOutWorkflow(
    { contactId: "701", source: "hubspotWorkflow" },
    fanOutDeps(sink, { contactProperties: { test_record: "true" } })
  );
  assert.equal(skipped.status, "skipped");

  const failedAssociation = await guarded(sink, () =>
    runContactFanOutWorkflow(
      { contactId: "701", source: "hubspotWorkflow" },
      fanOutDeps(sink, { associationError: httpError(503, { data: echoingBody(Object.values(CONTACT_VALUES)) }) })
    )
  );
  assert.equal(failedAssociation.thrown?.response?.status, 503);

  const refused = await guarded(sink, () =>
    runContactFanOutWorkflow(
      { contactId: "701", source: "hubspotWorkflow" },
      fanOutDeps(sink, { contactError: httpError(403, { data: echoingBody(Object.values(CONTACT_VALUES)) }) })
    )
  );
  assert.equal(refused.thrown?.response?.status, 403);

  assertNoValues(sink, NO_RECORD, contactValues());
});
