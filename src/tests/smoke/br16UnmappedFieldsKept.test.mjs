// BR16, row 3.13: an update never blanks a CentralReach field the integration does not send.
// Live check of 2026-11-24 (test employee 5338681, test client 5384589;
// docs/workstreams/architecture-update/unmapped-field-wipe-check-2026-11-24.md): the employee
// update PUT with only the mapped keys blanked jobTitle and chosenName, the client one blanked
// chosenName, and a full-body PUT sending back every key as read was accepted on both. Zeke,
// 2026-11-24, "Field-wipe fix: Send yes": the update sends back every key of the read it already
// makes, with the mapped keys laid over it, and sends no core PUT when no mapped key differs from
// that read; the client update also sends back the read's externalSystemId.
// The shared fake CentralReach PUT blanks a text key the body leaves out, as the live PUT did.
// Only HubSpot is faked. The mappers, the hash, cosmosState.mjs (in-memory container) and
// centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { createOrUpdateEmployee } from "../../lib/centralReachClient.mjs";
import { putState } from "../../lib/cosmosState.mjs";
import { buildErrorLog } from "../../lib/errors.mjs";
import {
  CLIENT_CORE_FIELDS,
  EMPLOYEE_CORE_FIELDS,
  clientCoreReadKey,
  clientPutKey
} from "../../lib/mappedState.mjs";
import { SYNC_RUN_SUMMARY_MESSAGE } from "../../lib/syncRunSummary.mjs";
import { buildClientPayload } from "../../mappings/client/buildClientPayload.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  httpError,
  workflowConfig
} from "./stage2Fakes.mjs";
import {
  BCBA_LINK,
  BT_LINK,
  CASE_LINK,
  EMPLOYEE_GET,
  METADATA_DELETE,
  METADATA_PUT,
  STAFF_LABEL,
  STORED_EMPLOYEE,
  seedStoredEmployee,
  setup,
  stage3Bcba,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";

const EMPLOYEE_PUT = "PUT /contacts/employee/{id}";
const CLIENT_PUT = "PUT /contacts/client/{id}";
const CLIENT_GET = "GET /contacts/client/{id}";
const LABEL_POST = "POST /contacts/{id}/labels";

// Keys the integration never maps, as the live reads return them: text, a flag, a list and a
// nested object. The values are made-up markers, so a test can see whether any reached a log.
const UNMAPPED_EMPLOYEE = Object.freeze({
  jobTitle: "Zq Marker Job Title",
  chosenName: "Zq Marker Chosen",
  languages: ["Zq Marker Language"],
  payCodes: [{ code: "ZQ1", label: "Zq Marker Pay Code" }],
  officeDetails: { name: "Zq Marker Office", floor: 3 },
  isActive: false,
  type: "Employee"
});
const UNMAPPED_CLIENT = Object.freeze({
  firstName: "Stored",
  lastName: "Client",
  chosenName: "Zq Marker Chosen",
  middleInitial: "Q",
  guarantorFirstName: "Zq Marker Guarantor",
  clientDiagnosisCodes: ["Zq Marker Code"],
  additionalContacts: [{ name: "Zq Marker Contact", relation: "aunt" }],
  insuranceSummary: { carrier: "Zq Marker Carrier", active: true },
  isActive: false,
  type: "Client"
});
const MARKERS = [
  ...Object.values(UNMAPPED_EMPLOYEE),
  ...Object.values(UNMAPPED_CLIENT)
]
  .flatMap((value) => JSON.stringify(value).match(/Zq Marker [A-Za-z ]+/g) || [])
  .map((marker) => marker.trim());

const STORED_CLIENT = Object.freeze({
  gender: "Female",
  dateOfBirth: "2016-05-03T00:00:00.0000000Z",
  primaryEmail: "stored.client@example.com",
  phoneCell: "5185550123",
  addressLine1: "12 Stored Lane",
  addressLine2: "Unit 7",
  city: "Albany",
  stateProvince: "NY",
  zipPostalCode: "12207",
  guardianFirstName: "Jamie",
  guardianLastName: "Stored"
});

const EMPLOYEE_TYPES = [
  {
    name: "BCBA",
    employeeType: "bcba",
    recordId: "HS2",
    contactId: "5002",
    workdayId: "1000002",
    record: (properties = {}) => stage3Bcba(properties),
    // A metadata-only change: the NY Medicaid ID (B8, meta 126216).
    otherChange: (record) => {
      record.properties.medicaid_id__ny = "NY12345";
    }
  },
  {
    name: "BT/RBT",
    employeeType: "bt_rbt",
    recordId: "HS1",
    contactId: "5001",
    workdayId: "1000001",
    record: (properties = {}) => stage3Bt({ employee_id: "5001", ...properties }),
    // A label-only change: a Work State (TL1), which adds the state label.
    otherChange: (record) => {
      record.properties.location = "New York";
    }
  }
];

function runEmployee(type, record, logs = [], extra = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: type.recordId, employeeType: type.employeeType },
    { ...employeeWorkflowDeps({ record, logs }), ...extra }
  );
}

function runCase(record, logs = [], extra = {}) {
  return runClientSyncWorkflow(
    { dealId: "deal-1" },
    { ...clientWorkflowDeps({ record, logs }), ...extra }
  );
}

function namesSince(cr, start) {
  return cr.calls.slice(start).map((call) => call.name);
}

function lastBody(cr, name) {
  return cr.calls.filter((call) => call.name === name).at(-1).body;
}

function summaryOf(logs) {
  return logs.filter((entry) => entry.message === SYNC_RUN_SUMMARY_MESSAGE).at(-1).meta;
}

// An employee CentralReach already holds exactly as HubSpot maps it, plus the unmapped keys. A
// core field HubSpot leaves blank holds STORED_EMPLOYEE's value.
// It also holds the labels the record requires, so the first run posts none.
function seedEmployeeAsMapped(cr, type, record) {
  const built = buildEmployeePayload({
    record: record.read(),
    employeeType: type.employeeType,
    config: workflowConfig()
  });
  const mapped = built.employeePayload;
  const asHeld = {};
  for (const field of EMPLOYEE_CORE_FIELDS) {
    const value = mapped[field];
    if (field === "externalSystemId" || value === null || value === undefined || value === "") {
      continue;
    }
    asHeld[field] = field === "dateOfBirth" ? `${value}T00:00:00.0000000Z` : value;
  }
  seedStoredEmployee(cr, type.contactId, type.workdayId, { ...asHeld, ...UNMAPPED_EMPLOYEE });
  cr.labels.set(type.contactId, [STAFF_LABEL, ...built.requiredLabelIds]);
}

function seedClient(cr, overrides = {}) {
  cr.clients.set("2001", {
    contactId: "2001",
    externalSystemId: "deal-1",
    ...STORED_CLIENT,
    ...UNMAPPED_CLIENT,
    ...overrides
  });
  cr.labels.set("2001", [STAFF_LABEL]);
}

// A client CentralReach already holds exactly as HubSpot maps the Case.
function seedClientAsMapped(cr, record) {
  const mapped = buildClientPayload({ deal: record.read(), config: workflowConfig() });
  const asHeld = { firstName: mapped.FirstName, lastName: mapped.LastName };
  for (const field of CLIENT_CORE_FIELDS) {
    const value = mapped[field];
    if (value === null || value === undefined || value === "") {
      continue;
    }
    asHeld[clientCoreReadKey(field)] =
      field === "DateOfBirth" ? `${value.slice(0, 10)}T00:00:00.0000000Z` : value;
  }
  seedClient(cr, asHeld);
}

function assertKeysSentBack(body, held, label) {
  for (const [key, value] of Object.entries(held)) {
    assert.deepEqual(body[key], value, `${label}: ${key}`);
  }
}

function pascal(key) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

test("[BR16][3.13][B3][T2] a BCBA and a BT/RBT update sends back every unmapped key the read holds, unchanged, and the mapped keys carry the mapped values", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    seedStoredEmployee(cr, type.contactId, type.workdayId, UNMAPPED_EMPLOYEE);
    const record = type.record();
    assert.equal((await runEmployee(type, record)).status, "success", type.name);

    const body = lastBody(cr, EMPLOYEE_PUT);
    assertKeysSentBack(body, UNMAPPED_EMPLOYEE, type.name);
    // The mapped keys win over the read.
    assert.equal(body.firstName, record.properties.first_name, type.name);
    assert.equal(body.lastName, record.properties.last_name, type.name);
    assert.notEqual(body.firstName, STORED_EMPLOYEE.firstName, type.name);
    // Every key the read holds is in the body under its own name, and nothing is sent twice.
    const stored = cr.employees.get(type.contactId);
    for (const key of Object.keys(stored)) {
      assert.equal(Object.hasOwn(body, key), true, `${type.name}: ${key}`);
    }
    assert.equal(Object.hasOwn(body, "ContactForm"), false, type.name);
    // So the fake PUT, which blanks a text key left out, kept every unmapped key.
    assertKeysSentBack(stored, UNMAPPED_EMPLOYEE, type.name);
  }
});

test("[BR16][3.13][B8][T2] a BCBA metadata-only change and a BT/RBT label-only change send no core PUT, so the unmapped keys are untouched", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    const record = type.record();
    seedEmployeeAsMapped(cr, type, record);

    // First run: the hashes say every field changed, but CentralReach already holds every mapped
    // value, so no core PUT is sent.
    const logs = [];
    let start = cr.calls.length;
    assert.equal((await runEmployee(type, record, logs)).status, "success", type.name);
    assert.equal(namesSince(cr, start).includes(EMPLOYEE_PUT), false, type.name);
    assert.equal(namesSince(cr, start).includes(EMPLOYEE_GET), true, type.name);

    type.otherChange(record);
    const second = [];
    start = cr.calls.length;
    const result = await runEmployee(type, record, second);
    const names = namesSince(cr, start);
    assert.equal(result.status, "success", type.name);
    assert.equal(result.operation, "update", type.name);
    assert.equal(names.includes(EMPLOYEE_PUT), false, type.name);
    assert.equal(
      names.includes(type.employeeType === "bcba" ? METADATA_PUT : LABEL_POST),
      true,
      type.name
    );
    const summary = summaryOf(second);
    assert.equal(summary.outcome, "success", type.name);
    assert.equal(summary.operation, "update", type.name);
    assert.equal(summary.crCalls.some((call) => call.kind === "update"), false, type.name);
    assertKeysSentBack(cr.employees.get(type.contactId), UNMAPPED_EMPLOYEE, type.name);

    // Nothing changed at all: still a no-op with no CentralReach call.
    start = cr.calls.length;
    assert.equal((await runEmployee(type, record)).status, "noop", type.name);
    assert.deepEqual(namesSince(cr, start), [], type.name);
  }
});

test("[BR16][3.13][B3][T2] a mapped core change still sends the PUT, with the unmapped keys and the blank core fields sent back", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    const record = type.record();
    seedEmployeeAsMapped(cr, type, record);
    await runEmployee(type, record);
    assert.equal(cr.count(EMPLOYEE_PUT), 0, type.name);

    record.properties.last_name = "Okonkwo";
    const result = await runEmployee(type, record);
    assert.equal(result.status, "success", type.name);
    assert.equal(cr.count(EMPLOYEE_PUT), 1, type.name);
    const body = lastBody(cr, EMPLOYEE_PUT);
    assert.equal(body.lastName, "Okonkwo", type.name);
    assertKeysSentBack(body, UNMAPPED_EMPLOYEE, type.name);
    // A core field blank in HubSpot still carries the value CentralReach holds (row 3.13).
    assert.equal(body.addressLine2, STORED_EMPLOYEE.addressLine2, type.name);
    assert.equal(body.city, STORED_EMPLOYEE.city, type.name);
    assertKeysSentBack(cr.employees.get(type.contactId), UNMAPPED_EMPLOYEE, type.name);
  }
});

test("[BR16][3.13][B7][T4] a blank mapped core field sends back the held value: alone it sends no PUT (CentralReach already holds it), beside a change it goes back in the PUT", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    const record = type.record();
    seedEmployeeAsMapped(cr, type, record);
    // HubSpot leaves line 2 blank (never written); CentralReach holds a value.
    const blankField = type.employeeType === "bcba" ? "apartment__home" : "home_apt";
    assert.equal(record.properties[blankField] ?? "", "", type.name);
    assert.equal(cr.employees.get(type.contactId).addressLine2, STORED_EMPLOYEE.addressLine2);

    let start = cr.calls.length;
    assert.equal((await runEmployee(type, record)).status, "success", type.name);
    assert.equal(namesSince(cr, start).includes(EMPLOYEE_PUT), false, type.name);

    record.properties.first_name = "Robin";
    start = cr.calls.length;
    assert.equal((await runEmployee(type, record)).status, "success", type.name);
    assert.equal(namesSince(cr, start).includes(EMPLOYEE_PUT), true, type.name);
    const body = lastBody(cr, EMPLOYEE_PUT);
    assert.equal(body.firstName, "Robin", type.name);
    assert.equal(body.addressLine2, STORED_EMPLOYEE.addressLine2, type.name);
    assert.equal(cr.employees.get(type.contactId).addressLine2, STORED_EMPLOYEE.addressLine2);
  }
});

test("[BR16][3.13][B3][T2] the employee read body never reaches a log or the HubSpot reason, on success, on a refused PUT and on a read without contactId", async () => {
  for (const type of EMPLOYEE_TYPES) {
    // Success, with the real error-log builder.
    let { cr } = setup();
    seedStoredEmployee(cr, type.contactId, type.workdayId, UNMAPPED_EMPLOYEE);
    let record = type.record();
    const logs = [];
    await runEmployee(type, record, logs, { buildErrorLog });
    assert.equal(cr.count(EMPLOYEE_PUT), 1, type.name);

    // The PUT is refused (400): error, and the reason names no value.
    ({ cr } = setup());
    seedStoredEmployee(cr, type.contactId, type.workdayId, UNMAPPED_EMPLOYEE);
    cr.fail(EMPLOYEE_PUT, httpError(400, { data: { message: "bad", ...UNMAPPED_EMPLOYEE } }));
    record = type.record();
    assert.equal((await runEmployee(type, record, logs, { buildErrorLog })).status, "error", type.name);
    const refusedReason = record.properties.last_sync_error;

    // A read whose contact has no contactId: a failed read, no PUT.
    ({ cr } = setup());
    seedStoredEmployee(cr, type.contactId, type.workdayId, UNMAPPED_EMPLOYEE);
    delete cr.employees.get(type.contactId).contactId;
    record = type.record();
    assert.equal((await runEmployee(type, record, logs, { buildErrorLog })).status, "error", type.name);
    assert.equal(cr.count(EMPLOYEE_PUT), 0, type.name);
    assert.match(record.properties.last_sync_error, /contact\.contactId/, type.name);

    const text = JSON.stringify(logs) + refusedReason + record.properties.last_sync_error;
    for (const marker of MARKERS) {
      assert.equal(text.includes(marker), false, `${type.name}: ${marker}`);
    }
    assert.equal(text.includes(STORED_EMPLOYEE.addressLine1), false, type.name);
  }
});

test("[BR16][3.13][C2] a Case update sends back every unmapped key the client read holds, PascalCase, unchanged, and the mapped keys carry the mapped values", async () => {
  const { cr } = setup();
  seedClient(cr);
  const record = stage3Case({ client_id_number: "2001" });
  assert.equal((await runCase(record)).status, "success");

  const body = lastBody(cr, CLIENT_PUT);
  for (const [key, value] of Object.entries(UNMAPPED_CLIENT)) {
    if (key === "firstName" || key === "lastName") {
      continue;
    }
    assert.deepEqual(body[pascal(key)], value, key);
    assert.equal(Object.hasOwn(body, key), false, `${key} is not sent twice`);
  }
  assert.equal(body.ContactId, 2001);
  assert.equal(body.FirstName, "Alex");
  assert.equal(body.LastName, "Rivera");
  assert.equal(Object.hasOwn(body, "firstName"), false);
  assert.equal(Object.hasOwn(body, "ContactForm"), false);
  // The fake PUT, which blanks a text key left out, kept every unmapped key.
  const stored = cr.clients.get("2001");
  assert.equal(stored.chosenName, UNMAPPED_CLIENT.chosenName);
  assert.equal(stored.guarantorFirstName, UNMAPPED_CLIENT.guarantorFirstName);
  assert.equal(stored.middleInitial, UNMAPPED_CLIENT.middleInitial);
});

test("[BR16][3.13][C28] a Case metadata-only change sends no client PUT, so the unmapped keys are untouched", async () => {
  const { cr } = setup();
  const record = stage3Case({ client_id_number: "2001" });
  seedClientAsMapped(cr, record);

  let start = cr.calls.length;
  assert.equal((await runCase(record)).status, "success");
  assert.equal(namesSince(cr, start).includes(CLIENT_PUT), false);
  assert.equal(namesSince(cr, start).includes(CLIENT_GET), true);

  record.properties.severity_level_clinical = "Level 2";
  const logs = [];
  start = cr.calls.length;
  const result = await runCase(record, logs);
  const names = namesSince(cr, start);
  assert.equal(result.status, "success");
  assert.equal(result.operation, "update");
  assert.equal(names.includes(CLIENT_PUT), false);
  assert.equal(names.includes(METADATA_PUT), true);
  const summary = summaryOf(logs);
  assert.equal(summary.operation, "update");
  assert.equal(summary.crCalls.some((call) => call.kind === "update"), false);
  const stored = cr.clients.get("2001");
  assert.equal(stored.chosenName, UNMAPPED_CLIENT.chosenName);
  assert.equal(stored.guarantorFirstName, UNMAPPED_CLIENT.guarantorFirstName);

  start = cr.calls.length;
  assert.equal((await runCase(record)).status, "noop");
  assert.deepEqual(namesSince(cr, start), []);
});

test("[BR16][3.13][C2][C8] a Case core change still sends the PUT with the unmapped keys, and a blank core field sends back the held value", async () => {
  const { cr } = setup();
  const record = stage3Case({ client_id_number: "2001" });
  seedClientAsMapped(cr, record);
  // The Case's address fields are blank (never written): each carries the held value, which
  // CentralReach already holds, so the first run sends no PUT.
  assert.equal(record.properties.home_apt ?? "", "");
  await runCase(record);
  assert.equal(cr.count(CLIENT_PUT), 0);

  record.properties.phi_last_name = "Okonkwo";
  assert.equal((await runCase(record)).status, "success");
  assert.equal(cr.count(CLIENT_PUT), 1);
  const body = lastBody(cr, CLIENT_PUT);
  assert.equal(body.LastName, "Okonkwo");
  assert.equal(body.AddressLine2, STORED_CLIENT.addressLine2);
  assert.equal(body.ChosenName, UNMAPPED_CLIENT.chosenName);
  assert.deepEqual(body.AdditionalContacts, UNMAPPED_CLIENT.additionalContacts);
  assert.deepEqual(body.InsuranceSummary, UNMAPPED_CLIENT.insuranceSummary);
  assert.equal(body.IsActive, false);
  assert.equal(cr.clients.get("2001").chosenName, UNMAPPED_CLIENT.chosenName);
});

test("[BR16][3.13][C2] the client read body never reaches a log or the HubSpot reason, on success and on a refused PUT", async () => {
  const logs = [];
  let { cr } = setup();
  seedClient(cr);
  let record = stage3Case({ client_id_number: "2001" });
  await runCase(record, logs, { buildErrorLog });
  assert.equal(cr.count(CLIENT_PUT), 1);

  ({ cr } = setup());
  seedClient(cr);
  cr.fail(CLIENT_PUT, httpError(400, { data: { message: "bad", ...UNMAPPED_CLIENT } }));
  record = stage3Case({ client_id_number: "2001" });
  assert.equal((await runCase(record, logs, { buildErrorLog })).status, "error");

  const text = JSON.stringify(logs) + record.properties.last_sync_error;
  for (const marker of MARKERS) {
    assert.equal(text.includes(marker), false, marker);
  }
  assert.equal(text.includes(STORED_CLIENT.addressLine1), false);
});

test("[BR16][3.13][C5] a client update sends back the External System ID the read holds, even one changed by hand, and none when the read holds none", async () => {
  // Held: staff changed the ID on the CentralReach profile, so the lookup by the Case ID finds
  // nothing and the run does not know the ID; the read's value goes back as read.
  let { cr } = setup();
  seedClient(cr, { externalSystemId: "9988776" });
  let record = stage3Case({ client_id_number: "2001" });
  assert.equal((await runCase(record)).status, "success");
  assert.equal(lastBody(cr, CLIENT_PUT).ExternalSystemId, "9988776");
  assert.equal(cr.clients.get("2001").externalSystemId, "9988776");

  // Absent from the read (CentralReach holds none): not sent.
  ({ cr } = setup());
  seedClient(cr, { externalSystemId: null });
  record = stage3Case({ client_id_number: "2001" });
  assert.equal((await runCase(record)).status, "success");
  const body = lastBody(cr, CLIENT_PUT);
  assert.equal(Object.hasOwn(body, "ExternalSystemId"), false);
  assert.equal(Object.hasOwn(body, "externalSystemId"), false);
});

// ---------------------------------------------------------------------------------------------
// The SSN guard (Zeke 2026-11-24: "Yes, with SSN guard"). A core PUT sends the read's SSN back
// only when it is blank or a full 9 digits (also in the 3-2-4 dash form), exactly as read.
// Anything else stops the update: no PUT, HubSpot `error` naming the field, saved state intact.
// ---------------------------------------------------------------------------------------------

const SSN_SENT_BACK = [
  ["blank", ""],
  ["null", null],
  ["absent", undefined],
  ["9 digits", "123456789"],
  ["9 digits with dashes 3-2-4", "123-45-6789"]
];
const SSN_STOPPED = [
  ["masked with *", "***-**-6789"],
  ["masked with X", "XXX-XX-6789"],
  ["masked with *, no dashes", "*****6789"],
  ["8 digits", "12345678"],
  ["10 digits", "1234567890"],
  // SG-4: a full 9 digits with a trailing line break is not "a full 9 digits".
  ["9 digits with a trailing line break", "123456789\n"],
  ["a number", 123456789],
  ["an object", { last4: "Zq6789" }]
];
const SSN_REASON = (entity) =>
  `CentralReach answered GET /contacts/${entity}/{id} in a shape the integration cannot read. Expected field: contact.ssn.`;

// The text that must never leave the read: the value itself, or its marker for an object.
function ssnNeedle(value) {
  return typeof value === "object" ? value.last4 : String(value).trim();
}

function linkOf(type) {
  return type.employeeType === "bcba" ? BCBA_LINK : BT_LINK;
}

// The saved link record, without its save time.
function linkData(container, link) {
  const { updatedAt, ...data } = container.get(link.pk, link.id)?.data || {};
  return data;
}

function assertNoSsnValue(value, texts, label) {
  const needle = ssnNeedle(value);
  for (const text of texts) {
    assert.equal(String(text).includes(needle), false, label);
  }
}

// An employee CentralReach holds as HubSpot maps it, with `value` under the read key `ssnKey`
// (left out when undefined). The first run sends no core PUT, whatever the SSN holds.
async function employeeWithSsn(type, value, ssnKey = "ssn") {
  const { container, cr } = setup();
  const record = type.record();
  seedEmployeeAsMapped(cr, type, record);
  if (value !== undefined) {
    cr.employees.get(type.contactId)[ssnKey] = value;
  }
  const first = await runEmployee(type, record);
  assert.equal(first.status, "success", type.name);
  assert.equal(cr.count(EMPLOYEE_PUT), 0, type.name);
  return { container, cr, record };
}

test("[BR16][3.13][B3][T2] the SSN guard: a BCBA and a BT/RBT update sends a blank, null, absent or full 9-digit SSN back exactly as read", async () => {
  for (const type of EMPLOYEE_TYPES) {
    for (const [name, value] of SSN_SENT_BACK) {
      const label = `${type.name}, ${name}`;
      const { cr, record } = await employeeWithSsn(type, value);
      record.properties.last_name = "Okonkwo";
      assert.equal((await runEmployee(type, record)).status, "success", label);
      assert.equal(cr.count(EMPLOYEE_PUT), 1, label);
      const body = lastBody(cr, EMPLOYEE_PUT);
      assert.equal(body.lastName, "Okonkwo", label);
      if (value === undefined) {
        assert.equal(Object.hasOwn(body, "ssn"), false, label);
      } else {
        assert.equal(body.ssn, value, label);
      }
    }
  }
});

test("[BR16][3.13][B3][B8][T2] the SSN guard: a BCBA and a BT/RBT read holding a masked, partial or non-text SSN sends no PUT on a core change (error naming ssn, no metadata or label write, saved state intact, the value nowhere), while a metadata or label change alone still succeeds", async () => {
  for (const type of EMPLOYEE_TYPES) {
    for (const [name, value] of SSN_STOPPED) {
      const label = `${type.name}, ${name}`;
      const { container, cr, record } = await employeeWithSsn(type, value);
      const savedBefore = linkData(container, linkOf(type));

      // A core change and a metadata (BCBA) or label (BT/RBT) change in the same run.
      record.properties.last_name = "Okonkwo";
      type.otherChange(record);
      const logs = [];
      const start = cr.calls.length;
      const result = await runEmployee(type, record, logs, { buildErrorLog });
      assert.equal(result.status, "error", label);
      assert.deepEqual(namesSince(cr, start), [EMPLOYEE_GET], label);
      assert.equal(record.properties.last_sync_status, "error", label);
      assert.equal(record.properties.last_sync_error, SSN_REASON("employee"), label);
      const summary = summaryOf(logs);
      assert.equal(summary.outcome, "error", label);
      assert.equal(summary.reasonCode, "CR_EMPLOYEE_READ_FAILED", label);
      assert.deepEqual(summary.crCalls, [{ kind: "lookup", status: 200 }], label);
      const shape = logs.find((entry) => entry.message === "CentralReach answer could not be read.");
      assert.equal(Object.hasOwn(shape.meta.expectedFieldTypes, "contact.ssn"), true, label);
      // No in-progress mark, no hash and no pending-create change: the link record is as it was.
      assert.deepEqual(linkData(container, linkOf(type)), savedBefore, label);
      assertNoSsnValue(
        value,
        [JSON.stringify(logs), JSON.stringify(record.writes), JSON.stringify([...container.docs.values()])],
        label
      );

      // The core change is undone: a metadata or label change alone sends no core PUT, so the
      // guard does not apply and the run succeeds.
      record.properties.last_name = type.record().properties.last_name;
      const next = cr.calls.length;
      assert.equal((await runEmployee(type, record)).status, "success", label);
      const names = namesSince(cr, next);
      assert.equal(names.includes(EMPLOYEE_PUT), false, label);
      assert.equal(names.includes(type.employeeType === "bcba" ? METADATA_PUT : LABEL_POST), true, label);
      assert.equal(record.properties.last_sync_status, "success", label);
    }
  }
});

test("[BR16][3.13][B3][T2] the SSN guard matches the read key in any casing (ssn, Ssn, SSN)", async () => {
  const type = EMPLOYEE_TYPES[1];
  for (const ssnKey of ["ssn", "Ssn", "SSN"]) {
    let { cr, record } = await employeeWithSsn(type, "***-**-6789", ssnKey);
    record.properties.last_name = "Okonkwo";
    assert.equal((await runEmployee(type, record)).status, "error", ssnKey);
    assert.equal(cr.count(EMPLOYEE_PUT), 0, ssnKey);
    assert.equal(record.properties.last_sync_error.endsWith(`contact.${ssnKey}.`), true, ssnKey);

    ({ cr, record } = await employeeWithSsn(type, "123456789", ssnKey));
    record.properties.last_name = "Okonkwo";
    assert.equal((await runEmployee(type, record)).status, "success", ssnKey);
    assert.equal(lastBody(cr, EMPLOYEE_PUT)[ssnKey], "123456789", ssnKey);
  }
});

// A Case whose client CentralReach holds as HubSpot maps it, with `value` under the read key.
async function caseWithSsn(value, ssnKey = "ssn") {
  const { container, cr } = setup();
  const record = stage3Case({ client_id_number: "2001" });
  seedClientAsMapped(cr, record);
  if (value !== undefined) {
    cr.clients.get("2001")[ssnKey] = value;
  }
  assert.equal((await runCase(record)).status, "success");
  assert.equal(cr.count(CLIENT_PUT), 0);
  return { container, cr, record };
}

test("[BR16][3.13][C2] the SSN guard: a Case update sends a blank, null, absent or full 9-digit SSN back exactly as read", async () => {
  for (const [name, value] of SSN_SENT_BACK) {
    const { cr, record } = await caseWithSsn(value);
    record.properties.phi_last_name = "Okonkwo";
    assert.equal((await runCase(record)).status, "success", name);
    assert.equal(cr.count(CLIENT_PUT), 1, name);
    const body = lastBody(cr, CLIENT_PUT);
    assert.equal(body.LastName, "Okonkwo", name);
    if (value === undefined) {
      assert.equal(Object.hasOwn(body, "Ssn"), false, name);
    } else {
      assert.equal(body.Ssn, value, name);
    }
    assert.equal(Object.hasOwn(body, "ssn"), false, name);
  }
});

test("[BR16][3.13][C2][C28] the SSN guard: a Case whose client read holds a masked, partial or non-text SSN sends no PUT on a core change (error naming ssn, no metadata or label write, saved state intact, the value nowhere), while a metadata change alone still succeeds", async () => {
  for (const [name, value] of SSN_STOPPED) {
    const { container, cr, record } = await caseWithSsn(value);
    const savedBefore = linkData(container, CASE_LINK);

    record.properties.phi_last_name = "Okonkwo";
    record.properties.severity_level_clinical = "Level 2";
    const logs = [];
    const start = cr.calls.length;
    const result = await runCase(record, logs, { buildErrorLog });
    assert.equal(result.status, "error", name);
    assert.deepEqual(namesSince(cr, start), ["GET /contacts/client/byExternalSystemId", CLIENT_GET], name);
    assert.equal(record.properties.last_sync_status, "error", name);
    assert.equal(record.properties.last_sync_error, SSN_REASON("client"), name);
    const summary = summaryOf(logs);
    assert.equal(summary.outcome, "error", name);
    assert.equal(summary.reasonCode, "CR_CLIENT_READ_FAILED", name);
    assert.deepEqual(
      summary.crCalls,
      [
        { kind: "lookup", status: 200 },
        { kind: "lookup", status: 200 }
      ],
      name
    );
    // The in-progress mark made before the client call is put back: the link record is as it was.
    assert.deepEqual(linkData(container, CASE_LINK), savedBefore, name);
    assertNoSsnValue(
      value,
      [JSON.stringify(logs), JSON.stringify(record.writes), JSON.stringify([...container.docs.values()])],
      name
    );

    record.properties.phi_last_name = "Rivera";
    const next = cr.calls.length;
    assert.equal((await runCase(record)).status, "success", name);
    const names = namesSince(cr, next);
    assert.equal(names.includes(CLIENT_PUT), false, name);
    assert.equal(names.includes(METADATA_PUT), true, name);
    assert.equal(record.properties.last_sync_status, "success", name);
  }
});

test("[BR16][3.13][C2] the SSN guard on a Case that links to its own earlier create (pending-create marker): no PUT, error, and the marker and saved state intact", async () => {
  const { container, cr } = setup();
  seedClient(cr, { ssn: "XXX-XX-6789" });
  const sentAt = new Date(Date.now() - 3_600_000).toISOString();
  await putState({
    ...CASE_LINK,
    type: "link",
    ttlSeconds: -1,
    data: { pendingCreateExternalId: "deal-1", pendingCreateSentAt: sentAt, clean: false }
  });
  const savedBefore = linkData(container, CASE_LINK);
  const record = stage3Case();

  assert.equal((await runCase(record)).status, "error");
  assert.equal(cr.count(CLIENT_GET), 1);
  assert.equal(cr.count(CLIENT_PUT), 0);
  assert.equal(cr.count("POST /contacts/client"), 0);
  assert.equal(record.properties.last_sync_error, SSN_REASON("client"));
  // The marker stays; the in-progress mark made before the client call is put back.
  const saved = linkData(container, CASE_LINK);
  assert.equal(saved.pendingCreateExternalId, savedBefore.pendingCreateExternalId);
  assert.equal(saved.pendingCreateSentAt, savedBefore.pendingCreateSentAt);
  assert.equal(saved.clean, false);
  assert.equal(saved.inProgressFieldHashes ?? null, null);
  assert.equal(saved.crContactId ?? null, null);
});

test("[BR16][3.13][C2] the SSN guard matches the client read key in any casing (ssn, Ssn, SSN)", async () => {
  for (const ssnKey of ["ssn", "Ssn", "SSN"]) {
    let { cr, record } = await caseWithSsn("*****6789", ssnKey);
    record.properties.phi_last_name = "Okonkwo";
    assert.equal((await runCase(record)).status, "error", ssnKey);
    assert.equal(cr.count(CLIENT_PUT), 0, ssnKey);
    assert.equal(record.properties.last_sync_error.endsWith(`contact.${ssnKey}.`), true, ssnKey);

    ({ cr, record } = await caseWithSsn("123-45-6789", ssnKey));
    record.properties.phi_last_name = "Okonkwo";
    assert.equal((await runCase(record)).status, "success", ssnKey);
    assert.equal(lastBody(cr, CLIENT_PUT)[clientPutKey(ssnKey)], "123-45-6789", ssnKey);
  }
});

// ---------------------------------------------------------------------------------------------
// Review finding 7: a read that cannot be used leaves the saved hashes as they were.
// ---------------------------------------------------------------------------------------------

test("[BR16][3.13][B3][T2] a BCBA and a BT/RBT read whose contact has no contactId (accepted by the read through its primary email) sends no PUT and leaves the link record as it was (no in-progress hashes)", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { container, cr } = setup();
    const record = type.record();
    seedEmployeeAsMapped(cr, type, record);
    assert.equal((await runEmployee(type, record)).status, "success", type.name);
    const savedBefore = linkData(container, linkOf(type));

    delete cr.employees.get(type.contactId).contactId;
    record.properties.last_name = "Okonkwo";
    assert.equal((await runEmployee(type, record)).status, "error", type.name);
    assert.equal(cr.count(EMPLOYEE_PUT), 0, type.name);
    assert.match(record.properties.last_sync_error, /contact\.contactId/, type.name);
    assert.deepEqual(linkData(container, linkOf(type)), savedBefore, type.name);
  }
});

test("[BR16][3.13][C2] a Case whose client read lacks a core key (item B21) sends no PUT and leaves the link record as it was (no in-progress hashes)", async () => {
  const { container, cr } = setup();
  const record = stage3Case({ client_id_number: "2001" });
  seedClientAsMapped(cr, record);
  assert.equal((await runCase(record)).status, "success");
  const savedBefore = linkData(container, CASE_LINK);

  cr.answer(CLIENT_GET, { contact: { contactId: 2001, firstName: "Alex", lastName: "Rivera" } });
  record.properties.phi_last_name = "Okonkwo";
  assert.equal((await runCase(record)).status, "error");
  assert.equal(cr.count(CLIENT_PUT), 0);
  assert.deepEqual(linkData(container, CASE_LINK), savedBefore);
});

// SG-4: the library-level guard in createOrUpdateEmployee, on its own (the workflow's guard
// always fires first in the workflow tests).
test("[BR16][3.13][B3][T2] the SSN guard inside createOrUpdateEmployee: a held masked SSN sends no PUT on a core change", async () => {
  const { cr } = setup();
  await assert.rejects(
    createOrUpdateEmployee({
      payload: { firstName: "Alex", lastName: "Okonkwo", externalSystemId: "1000001" },
      existingContactId: "5001",
      heldContact: { contactId: 5001, firstName: "Alex", lastName: "Rivera", ssn: "***-**-6789" }
    }),
    (error) => error.code === "CR_EMPLOYEE_READ_FAILED" && /contact\.ssn/.test(error.syncReason)
  );
  assert.equal(cr.count(EMPLOYEE_PUT), 0);
  assert.equal(cr.calls.length, 0);
});

// ---------------------------------------------------------------------------------------------
// SG-1 and SG-2 (SSN guard review, 2026-11-24): a run that marked the Case in progress and then
// failed before any CentralReach write puts the clean flag and the in-progress fields back as it
// found them, whatever the failure (rule 5.8: a failed read is never a clear).
// ---------------------------------------------------------------------------------------------

test("[BR16][3.13][C28] SG-1: a client read that fails with 503 three times after HubSpot set a field leaves the link record as it was, so when HubSpot blanks the field again the next run sends no metadata DELETE", async () => {
  const { container, cr } = setup();
  const record = stage3Case({ client_id_number: "2001", severity_level_clinical: "" });
  seedClientAsMapped(cr, record);
  assert.equal((await runCase(record)).status, "success");
  const savedBefore = linkData(container, CASE_LINK);

  record.properties.severity_level_clinical = "Level 2";
  cr.fail(CLIENT_GET, httpError(503), { times: 3 });
  const start = cr.calls.length;
  await assert.rejects(runCase(record), (error) => error.crWriteNotSent === true);
  assert.deepEqual(namesSince(cr, start), [
    "GET /contacts/client/byExternalSystemId",
    CLIENT_GET,
    CLIENT_GET,
    CLIENT_GET
  ]);
  assert.deepEqual(linkData(container, CASE_LINK), savedBefore);

  // HubSpot is back to what was last written: nothing to send.
  record.properties.severity_level_clinical = "";
  const next = cr.calls.length;
  assert.equal((await runCase(record)).status, "noop");
  assert.equal(namesSince(cr, next).includes(METADATA_DELETE), false);
  assert.equal(namesSince(cr, next).includes(METADATA_PUT), false);
});

test("[BR16][3.13][C28] SG-1 boundary: a client PUT that fails after it was sent is not \"not sent\": its hashes stay counted as written", async () => {
  const { container, cr } = setup();
  const record = stage3Case({ client_id_number: "2001" });
  seedClientAsMapped(cr, record);
  assert.equal((await runCase(record)).status, "success");

  record.properties.phi_last_name = "Okonkwo";
  cr.fail(CLIENT_PUT, httpError(503), { times: 3 });
  await assert.rejects(runCase(record), (error) => error.crWriteNotSent === undefined);
  assert.equal(cr.count(CLIENT_PUT), 3);
  const saved = linkData(container, CASE_LINK);
  assert.equal(saved.clean, false);
  assert.equal(saved.inProgressContactId, "2001");
  assert.equal(typeof saved.inProgressFieldHashes, "object");
  assert.notEqual(saved.inProgressFieldHashes, null);
});

for (const [code, failLookup, outcome] of [
  ["CR_LOOKUP_UNKNOWN", (cr) => cr.fail("GET /contacts/client/byExternalSystemId", httpError(500), { times: 3 }), "thrown"],
  [
    "CR_LOOKUP_UNREADABLE",
    (cr) => {
      // The lookup finds a client, and its answer is replaced by a 200 with no contact ID.
      cr.clients.set("2001", { contactId: "2001", externalSystemId: "deal-1" });
      cr.answer("GET /contacts/client/byExternalSystemId", { contact: {} });
    },
    "error"
  ]
]) {
  test(`[BR16][3.15][C2] SG-2 (a): on the creating path, the lookup inside createOrUpdateClient failing with ${code} puts back the earlier run's in-progress hashes and clears the create marker`, async () => {
    const { container, cr } = setup();
    // An earlier run of this unlinked Case failed after its in-progress save.
    const prior = {
      workflow: "clientSync",
      portalId: SANDBOX_PORTAL,
      clean: false,
      inProgressFieldHashes: { "core:FirstName": "earlier-hash" },
      inProgressContactId: null
    };
    await putState({ ...CASE_LINK, type: "link", ttlSeconds: -1, data: prior });
    const record = stage3Case({ phi_last_name: "Okonkwo" });

    failLookup(cr);
    if (outcome === "thrown") {
      await assert.rejects(runCase(record), (error) => error.code === code && error.crWriteNotSent === true);
    } else {
      assert.equal((await runCase(record)).status, "error");
    }
    assert.equal(cr.count("POST /contacts/client"), 0);
    assert.deepEqual(linkData(container, CASE_LINK), {
      ...prior,
      pendingCreateExternalId: null,
      pendingCreateSentAt: null
    });
  });
}

test("[BR16][3.13][C2] SG-2 (b): a prior that already holds in-progress hashes and a contact ID from an earlier failed run comes back unchanged after a client read failure or the SSN guard", async () => {
  for (const [name, breakRead] of [
    ["client read 503", (cr) => cr.fail(CLIENT_GET, httpError(503), { times: 3 })],
    ["SSN guard", (cr) => {
      cr.clients.get("2001").ssn = "***-**-6789";
    }]
  ]) {
    const { container, cr } = setup();
    const record = stage3Case({ client_id_number: "2001" });
    seedClientAsMapped(cr, record);
    assert.equal((await runCase(record)).status, "success", name);

    // An earlier run wrote (or may have written) the severity, then failed: in progress.
    record.properties.severity_level_clinical = "Level 3";
    cr.fail(METADATA_PUT, httpError(503), { times: 3 });
    await assert.rejects(runCase(record), name);
    const savedBefore = linkData(container, CASE_LINK);
    assert.equal(savedBefore.clean, false, name);
    assert.equal(savedBefore.inProgressContactId, "2001", name);
    assert.notEqual(savedBefore.inProgressFieldHashes ?? null, null, name);

    breakRead(cr);
    record.properties.phi_last_name = "Okonkwo";
    record.properties.severity_level_clinical = "Level 1";
    try {
      await runCase(record);
    } catch {
      // The 503 is thrown for a retry; the guard ends as error on the record.
    }
    assert.equal(cr.count(CLIENT_PUT), 0, name);
    assert.deepEqual(linkData(container, CASE_LINK), savedBefore, name);
  }
});

// ---------------------------------------------------------------------------------------------
// Review finding 4: the skip rule's boundaries (mappedKeysMatchRead).
// ---------------------------------------------------------------------------------------------

test("[BR16][3.13][B7][T4] skip rule: a line 2 the integration wrote, now blank in HubSpot while CentralReach holds it, is not a match: the PUT is sent and clears it (row 3.13)", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    const lineTwo = type.employeeType === "bcba" ? "apartment__home" : "home_apt";
    const record = type.record({ [lineTwo]: "Suite 12" });
    seedEmployeeAsMapped(cr, type, record);
    assert.equal(cr.employees.get(type.contactId).addressLine2, "Suite 12", type.name);
    // Written: the clean run saved its hash (CentralReach already held it, so no PUT).
    assert.equal((await runEmployee(type, record)).status, "success", type.name);
    assert.equal(cr.count(EMPLOYEE_PUT), 0, type.name);

    record.properties[lineTwo] = "";
    assert.equal((await runEmployee(type, record)).status, "success", type.name);
    assert.equal(cr.count(EMPLOYEE_PUT), 1, type.name);
    const body = lastBody(cr, EMPLOYEE_PUT);
    assert.equal(Object.hasOwn(body, "addressLine2"), true, type.name);
    assert.equal(body.addressLine2, null, type.name);
  }
});

test("[BR16][3.13][C2][C8] skip rule: a Case line 2 blank in HubSpot while the client read holds one sends the held value back (item B21), so alone it sends no PUT", async () => {
  const { cr } = setup();
  const record = stage3Case({ client_id_number: "2001", home_apt: "Suite 12" });
  seedClientAsMapped(cr, record);
  assert.equal(cr.clients.get("2001").addressLine2, "Suite 12");
  assert.equal((await runCase(record)).status, "success");

  record.properties.home_apt = "";
  assert.equal((await runCase(record)).status, "success");
  assert.equal(cr.count(CLIENT_PUT), 0);
  assert.equal(cr.clients.get("2001").addressLine2, "Suite 12");
});

test("[BR16][3.13][B3][T2] skip rule: CentralReach holding a blank External System ID (\"\") with a Workday ID to set is not a match: the PUT is sent with the Workday ID", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    const record = type.record();
    seedEmployeeAsMapped(cr, type, record);
    cr.employees.get(type.contactId).externalSystemId = "";
    assert.equal((await runEmployee(type, record)).status, "success", type.name);
    assert.equal(cr.count(EMPLOYEE_PUT), 1, type.name);
    assert.equal(lastBody(cr, EMPLOYEE_PUT).externalSystemId, type.workdayId, type.name);
  }
});

test("[BR16][3.13][B3][T2] skip rule: a mapped name that differs from the read only by case, or by a space, is not a match: the PUT is sent with HubSpot's value", async () => {
  for (const type of EMPLOYEE_TYPES) {
    for (const held of [(name) => name.toUpperCase(), (name) => `${name} `]) {
      const { cr } = setup();
      const record = type.record();
      seedEmployeeAsMapped(cr, type, record);
      const lastName = record.properties.last_name;
      cr.employees.get(type.contactId).lastName = held(lastName);
      assert.equal((await runEmployee(type, record)).status, "success", type.name);
      assert.equal(cr.count(EMPLOYEE_PUT), 1, type.name);
      assert.equal(lastBody(cr, EMPLOYEE_PUT).lastName, lastName, type.name);
    }
  }
});

test("[BR16][3.13][C2] skip rule: a Case name that differs from the client read only by case is not a match: the PUT is sent with HubSpot's value", async () => {
  const { cr } = setup();
  const record = stage3Case({ client_id_number: "2001" });
  seedClientAsMapped(cr, record);
  cr.clients.get("2001").lastName = "RIVERA";
  assert.equal((await runCase(record)).status, "success");
  assert.equal(cr.count(CLIENT_PUT), 1);
  assert.equal(lastBody(cr, CLIENT_PUT).LastName, "Rivera");
});

// ---------------------------------------------------------------------------------------------
// Review finding 5: what updateBodyFromRead never sends back.
// ---------------------------------------------------------------------------------------------

test("[BR16][3.13][B3][T2] a BCBA and a BT/RBT read holding a blank External System ID (\"\") and a contact form: neither is sent back; the ID goes only when the Workday ID sets it", async () => {
  for (const type of EMPLOYEE_TYPES) {
    for (const workdayId of ["", type.workdayId]) {
      const label = `${type.name}, Workday ID ${workdayId ? "filled" : "blank"}`;
      const { cr } = setup();
      const record = type.record({ workday_id: workdayId });
      seedEmployeeAsMapped(cr, type, record);
      Object.assign(cr.employees.get(type.contactId), {
        externalSystemId: "",
        contactForm: "Zq Marker Form"
      });
      record.properties.last_name = "Okonkwo";
      await runEmployee(type, record);
      assert.equal(cr.count(EMPLOYEE_PUT), 1, label);
      const body = lastBody(cr, EMPLOYEE_PUT);
      assert.deepEqual(
        Object.keys(body).filter((key) => key.toLowerCase() === "contactform"),
        [],
        label
      );
      if (workdayId) {
        assert.equal(body.externalSystemId, workdayId, label);
      } else {
        assert.equal(Object.hasOwn(body, "externalSystemId"), false, label);
      }
    }
  }
});

test("[BR16][3.13][C2][C5] a client read holding a blank External System ID (\"\") and a contact form: neither is sent back", async () => {
  const { cr } = setup();
  seedClient(cr, { contactForm: "Zq Marker Form", externalSystemId: "" });
  // The fake read leaves a blank ID out; this answer holds it as "", as a client whose
  // CentralReach profile has no External System ID may read.
  cr.answer(CLIENT_GET, {
    contact: {
      contactId: 2001,
      ...UNMAPPED_CLIENT,
      ...STORED_CLIENT,
      contactForm: "Zq Marker Form",
      externalSystemId: ""
    }
  });
  const record = stage3Case({ client_id_number: "2001" });
  assert.equal((await runCase(record)).status, "success");
  const body = lastBody(cr, CLIENT_PUT);
  assert.equal(Object.hasOwn(body, "ExternalSystemId"), false);
  assert.equal(Object.hasOwn(body, "externalSystemId"), false);
  assert.deepEqual(
    Object.keys(body).filter((key) => key.toLowerCase() === "contactform"),
    []
  );
});
