// Stage 3, row 3.13 (BUILD-PLAN.md section 11; rules 5.7 and 5.8; the blank core field test of
// 2026-11-20 in section 4): an employee update replaces the core record, so a core field that is
// sent blank or left out is cleared in CentralReach. An update therefore never clears a core field
// the integration did not write: it sends back the value the CentralReach read of the same run
// holds. Guide: Change detection Architecture tab, "Minimum changes" ("Distinguish an intentional
// blank from a failed or unauthorized read").
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. The fake CentralReach
// employee holds stored values for the core fields (seedStoredEmployee). No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { EMPLOYEE_CORE_FIELDS, fieldHashes } from "../../lib/mappedState.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { employeeWorkflowDeps, workflowConfig } from "./stage2Fakes.mjs";
import {
  BCBA_LINK,
  BT_LINK,
  EMPLOYEE_GET,
  STORED_EMPLOYEE,
  seedStoredEmployee,
  setup,
  stage3Bcba,
  stage3Bt
} from "./stage3WorkerFakes.mjs";

const EMPLOYEE_PUT = "PUT /contacts/employee/{id}";
const BLANK_HASH = fieldHashes({ employee: { field: null } })["employee.field"];
// STORED_EMPLOYEE.dateOfBirth as the update sends it back (item 1, option (a)).
const HELD_DATE_SENT = "1988-04-09T00:00:00.000Z";

function runBt(record) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    employeeWorkflowDeps({ record })
  );
}

function runBcba(record) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS2", employeeType: "bcba" },
    employeeWorkflowDeps({ record })
  );
}

function lastPutBody(cr) {
  return cr.calls.filter((call) => call.name === EMPLOYEE_PUT).at(-1).body;
}

function savedHashes(container, link) {
  return container.get(link.pk, link.id).data.fieldHashes;
}

// The core fields the real mapper leaves blank for this record. Worked out from the mapper, so
// the test stays true when a mapping row starts or stops filling a field.
function blankMappedFields(record, employeeType) {
  const mapped = buildEmployeePayload({ record: record.read(), employeeType, config: workflowConfig() });
  return EMPLOYEE_CORE_FIELDS.filter((field) => {
    const value = mapped.employeePayload[field];
    return value === undefined || value === null || String(value).trim() === "";
  });
}

test("[BR16][3.13] a record with no saved copy: every blank core field carries CentralReach's value, for a BT/RBT and for a BCBA", async () => {
  const { cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  seedStoredEmployee(cr, "5002", "1000002");

  const bt = stage3Bt({ employee_id: "5001", home_apt: "", gender: "" });
  const btBlank = blankMappedFields(bt, "bt_rbt");
  assert.equal(btBlank.includes("addressLine2"), true);
  assert.equal(btBlank.includes("gender"), true);
  assert.equal(cr.employees.get("5001").addressLine2, STORED_EMPLOYEE.addressLine2);
  await runBt(bt);
  const btBody = lastPutBody(cr);
  for (const field of btBlank) {
    assert.equal(btBody[field], cr.employees.get("5001")[field], field);
  }
  // A field HubSpot holds is still HubSpot's value.
  assert.equal(btBody.lastName, "Rivera");

  const bcba = stage3Bcba();
  const bcbaBlank = blankMappedFields(bcba, "bcba");
  assert.equal(bcbaBlank.length > 0, true);
  await runBcba(bcba);
  const bcbaBody = lastPutBody(cr);
  for (const field of bcbaBlank) {
    assert.equal(bcbaBody[field], cr.employees.get("5002")[field], field);
    assert.notEqual(bcbaBody[field], undefined, field);
  }
});

test("[BR16][3.13] a blank core field the integration never wrote carries CentralReach's value, and its saved hash stays the blank hash", async () => {
  const { container, cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  const record = stage3Bt({ employee_id: "5001", home_apt: "", gender: "" });
  await runBt(record);
  assert.equal(savedHashes(container, BT_LINK)["employee.addressLine2"], BLANK_HASH);
  assert.equal(savedHashes(container, BT_LINK)["employee.gender"], BLANK_HASH);

  // A later update, with a saved copy that shows both fields blank.
  record.properties.last_name = "Okonkwo";
  await runBt(record);
  const body = lastPutBody(cr);
  assert.equal(body.lastName, "Okonkwo");
  assert.equal(body.addressLine2, "Apt 4B");
  assert.equal(body.gender, "Female");
  // The value sent back is not counted as written by the integration.
  assert.equal(savedHashes(container, BT_LINK)["employee.addressLine2"], BLANK_HASH);
  assert.equal(savedHashes(container, BT_LINK)["employee.gender"], BLANK_HASH);
});

test("[BR16][3.13] a core field the integration wrote and HubSpot then blanked is sent blank", async () => {
  const { container, cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  const record = stage3Bt({ employee_id: "5001", home_apt: "Unit 9", gender: "Male" });
  await runBt(record);
  assert.equal(lastPutBody(cr).addressLine2, "Unit 9");
  assert.notEqual(savedHashes(container, BT_LINK)["employee.addressLine2"], BLANK_HASH);

  record.properties.home_apt = "";
  await runBt(record);
  const body = lastPutBody(cr);
  // Blank, although the CentralReach read of this run still shows a stored value.
  assert.equal(Object.prototype.hasOwnProperty.call(body, "addressLine2"), true);
  assert.equal(body.addressLine2, null);
  // The other field the integration wrote is still sent with HubSpot's value.
  assert.equal(body.gender, "Male");
  assert.equal(savedHashes(container, BT_LINK)["employee.addressLine2"], BLANK_HASH);
});

test("[BR16][3.13] a blank date of birth on an update sends back CentralReach's stored date, never the placeholder", async () => {
  const { cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  const record = stage3Bt({ employee_id: "5001", date_of_birth: "" });
  await runBt(record);

  const body = lastPutBody(cr);
  // Item 1, option (a): rebuilt as YYYY-MM-DDT00:00:00.000Z from the first 10 characters.
  assert.equal(body.dateOfBirth, HELD_DATE_SENT);
  assert.equal(JSON.stringify(body).includes("2000-01-01"), false);
});

test("[BR16][3.13] a date of birth the integration wrote and HubSpot then blanked is not cleared: CentralReach's date is sent back (rule 5.7)", async () => {
  // Rule 5.7 says a blank date of birth on an update sends back the date CentralReach holds. The
  // row's general rule would send a blank here; the date of birth follows rule 5.7.
  const { cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  const record = stage3Bt({ employee_id: "5001", date_of_birth: "1990-10-20" });
  await runBt(record);
  assert.equal(String(lastPutBody(cr).dateOfBirth).startsWith("1990-10-20"), true);

  record.properties.date_of_birth = "";
  await runBt(record);
  assert.equal(lastPutBody(cr).dateOfBirth, HELD_DATE_SENT);
});

test("[BR16][3.13] a core field the CentralReach read does not hold is left out of the update", async () => {
  const { cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  delete cr.employees.get("5001").addressLine2;
  const record = stage3Bt({ employee_id: "5001", home_apt: "" });
  await runBt(record);

  assert.equal(Object.prototype.hasOwnProperty.call(lastPutBody(cr), "addressLine2"), false);
});

// Row 1.10 changed on 2026-11-21: a filled HubSpot primary email is sent; the External System ID
// rule (rule 5.4) is unchanged.
test("[BR16][3.13] the update sends the External System ID CentralReach holds, and a filled HubSpot primary email", async () => {
  const { cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  const record = stage3Bt({ employee_id: "5001", email: "new-in-hubspot@example.com" });
  await runBt(record);

  const body = lastPutBody(cr);
  assert.equal(body.externalSystemId, "1000001");
  assert.equal(body.primaryEmail, "new-in-hubspot@example.com");
});

test("[BR16][3.13] a primary email the integration wrote and HubSpot then blanked is not cleared: the email CentralReach holds is sent (row 1.10)", async () => {
  const { container, cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  const record = stage3Bt({ employee_id: "5001", email: "written@example.com" });
  await runBt(record);
  assert.notEqual(savedHashes(container, BT_LINK)["employee.primaryEmail"], BLANK_HASH);

  record.properties.email = "";
  await runBt(record);
  assert.equal(lastPutBody(cr).primaryEmail, "stored@example.com");
});

test("[BR16][3.13] an employee update is never sent without the CentralReach read of the same run", async () => {
  const { container, cr } = setup();
  seedStoredEmployee(cr, "5001", "1000001");
  seedStoredEmployee(cr, "5002", "1000002");
  const bt = stage3Bt({ employee_id: "5001" });
  const bcba = stage3Bcba();
  const runs = [
    () => runBt(bt),
    () => runBt(bt), // no change: no read, and no update either (row 3.7)
    () => {
      bt.properties.first_name = "Alexis";
      return runBt(bt);
    },
    () => runBcba(bcba),
    () => runBcba(bcba)
  ];
  for (const run of runs) {
    const start = cr.calls.length;
    await run();
    const names = cr.calls.slice(start).map((call) => call.name);
    if (names.includes(EMPLOYEE_PUT)) {
      assert.equal(names.includes(EMPLOYEE_GET), true);
      assert.equal(names.indexOf(EMPLOYEE_GET) < names.indexOf(EMPLOYEE_PUT), true);
    }
  }
  assert.equal(cr.count(EMPLOYEE_PUT), 3);
  assert.equal(container.get(BCBA_LINK.pk, BCBA_LINK.id).data.clean, true);
});

// Item 1, option (a) (open question 27, Zeke 2026-11-24; rule 5.7; guide: "an update never sends
// the placeholder"): an update with a blank date_of_birth sends back the date CentralReach holds,
// rebuilt as YYYY-MM-DDT00:00:00.000Z; a read that cannot supply it is a failed read, no update.
// The BCBA and the BT/RBT share the code, so each test runs both.
const EMPLOYEE_TYPES = [
  {
    name: "BCBA",
    contactId: "5002",
    workdayId: "1000002",
    run: runBcba,
    record: (p) => stage3Bcba(p)
  },
  {
    name: "BT/RBT",
    contactId: "5001",
    workdayId: "1000001",
    run: runBt,
    record: (p) => stage3Bt({ employee_id: "5001", ...p })
  }
];
const READ_DATE = "1979-12-31T00:00:00.0000000Z";

test("[B5][T2][3.13] a BCBA and a BT/RBT update with a blank date_of_birth sends back CentralReach's date as YYYY-MM-DDT00:00:00.000Z, never the placeholder", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { container, cr } = setup();
    seedStoredEmployee(cr, type.contactId, type.workdayId, { dateOfBirth: READ_DATE });
    const record = type.record({ date_of_birth: "" });
    const result = await type.run(record);
    assert.equal(result.status, "success", type.name);
    const body = lastPutBody(cr);
    assert.equal(body.dateOfBirth, "1979-12-31T00:00:00.000Z", type.name);
    assert.equal(JSON.stringify(body).includes("2000-01-01"), false, type.name);
    // HubSpot-only hashes: the date sent back is not counted as written by the integration.
    const link = type.name === "BCBA" ? BCBA_LINK : BT_LINK;
    assert.equal(savedHashes(container, link)["employee.dateOfBirth"], BLANK_HASH, type.name);
  }
});

test("[B5][T2][3.13] a BCBA and a BT/RBT created with the placeholder: a later update with a blank date_of_birth sends back the date CentralReach holds", async () => {
  const creates = [
    {
      name: "BCBA",
      run: runBcba,
      record: stage3Bcba({ employee_id: "", email: "pat@uca.example", date_of_birth: "" })
    },
    { name: "BT/RBT", run: runBt, record: stage3Bt({ employee_id: "", date_of_birth: "" }) }
  ];
  for (const { name, run, record } of creates) {
    const { cr } = setup();
    await run(record);
    const post = cr.calls.filter((call) => call.name === "POST /contacts/employee").at(-1);
    assert.equal(post.body.dateOfBirth, "2000-01-01", name);
    assert.equal(cr.count(EMPLOYEE_PUT), 0, name);

    record.properties.last_name = "Okonkwo";
    const result = await run(record);
    assert.equal(result.status, "success", name);
    assert.equal(lastPutBody(cr).dateOfBirth, "2000-01-01T00:00:00.000Z", name);
  }
});

test("[B5][T2][3.13] an employee read without dateOfBirth, with a blank date_of_birth, is a failed read: error and no update", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    seedStoredEmployee(cr, type.contactId, type.workdayId);
    delete cr.employees.get(type.contactId).dateOfBirth;
    const record = type.record({ date_of_birth: "" });
    const result = await type.run(record);
    assert.equal(result.status, "error", type.name);
    assert.match(record.properties.last_sync_error, /Expected field: contact\.dateOfBirth\./, type.name);
    assert.equal(cr.count(EMPLOYEE_GET), 1, type.name);
    assert.equal(cr.count(EMPLOYEE_PUT), 0, type.name);
  }
});

test("[B5][T2][3.13] a held dateOfBirth that is not text or does not start with YYYY-MM-DD, with a blank date_of_birth, is a failed read: no update", async () => {
  for (const held of ["12/31/1979", 315446400000, { date: "1979-12-31" }]) {
    for (const type of EMPLOYEE_TYPES) {
      const { cr } = setup();
      seedStoredEmployee(cr, type.contactId, type.workdayId, { dateOfBirth: held });
      const record = type.record({ date_of_birth: "" });
      const result = await type.run(record);
      assert.equal(result.status, "error", type.name);
      assert.match(record.properties.last_sync_error, /contact\.dateOfBirth/, type.name);
      assert.equal(record.properties.last_sync_error.includes("1979"), false, type.name);
      assert.equal(cr.count(EMPLOYEE_PUT), 0, type.name);
    }
  }
});

test("[B5][T2][3.13] a held blank dateOfBirth is sent back as CentralReach holds it, never the placeholder", async () => {
  for (const held of ["", null]) {
    for (const type of EMPLOYEE_TYPES) {
      const { cr } = setup();
      seedStoredEmployee(cr, type.contactId, type.workdayId, { dateOfBirth: held });
      const result = await type.run(type.record({ date_of_birth: "" }));
      assert.equal(result.status, "success", type.name);
      const body = lastPutBody(cr);
      assert.equal(body.dateOfBirth, held, type.name);
      assert.equal(JSON.stringify(body).includes("2000-01-01"), false, type.name);
    }
  }
});

test("[B5][T2][3.13] a filled date_of_birth is sent as mapped, whatever the employee read holds", async () => {
  for (const held of [READ_DATE, "12/31/1979", undefined]) {
    for (const type of EMPLOYEE_TYPES) {
      const { cr } = setup();
      seedStoredEmployee(cr, type.contactId, type.workdayId, { dateOfBirth: held });
      if (held === undefined) {
        delete cr.employees.get(type.contactId).dateOfBirth;
      }
      const result = await type.run(type.record({ date_of_birth: "7/23/1984" }));
      assert.equal(result.status, "success", type.name);
      assert.equal(lastPutBody(cr).dateOfBirth, "1984-07-23", type.name);
    }
  }
});

test("[B5][T2][3.13] an unchanged employee with a blank date_of_birth stays a no-op with no CentralReach call", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    seedStoredEmployee(cr, type.contactId, type.workdayId, { dateOfBirth: READ_DATE });
    const record = type.record({ date_of_birth: "" });
    assert.equal((await type.run(record)).status, "success", type.name);
    // Even a read that would now fail is not made: nothing changed.
    delete cr.employees.get(type.contactId).dateOfBirth;
    const start = cr.calls.length;
    const result = await type.run(record);
    assert.equal(result.status, "noop", type.name);
    assert.deepEqual(cr.calls.slice(start), [], type.name);
  }
});

test("[B5][T2][3.13] an unchanged employee whose last status is waiting is read for the ID check only: a read without dateOfBirth is no error, and no update is sent", async () => {
  for (const type of EMPLOYEE_TYPES) {
    const { cr } = setup();
    seedStoredEmployee(cr, type.contactId, type.workdayId, { dateOfBirth: READ_DATE });
    const record = type.record({ date_of_birth: "" });
    assert.equal((await type.run(record)).status, "success", type.name);
    // Not success, so the worker reads CentralReach for the ID check; nothing else changed.
    record.properties.last_sync_status = "waiting";
    delete cr.employees.get(type.contactId).dateOfBirth;
    const start = cr.calls.length;
    const result = await type.run(record);
    assert.equal(result.status, "noop", type.name);
    assert.deepEqual(
      cr.calls.slice(start).map((call) => call.name),
      [EMPLOYEE_GET],
      type.name
    );
    assert.equal(record.properties.last_sync_error, "", type.name);
  }
});
