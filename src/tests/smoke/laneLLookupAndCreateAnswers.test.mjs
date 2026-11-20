// Lane L review fixes L-R7, L-R8 and L-R9 (row 3.14): how the answers of the two lookups and of
// the two creates are read.
//
// Requirements: BR1 (create the client only when the record is not linked) and BR3 (a person who
// is already in CR is not created again; "An unclear answer never leads to a create").
// BUILD-PLAN rule 5.5: 404 means not found; an answer that is not 200 or 404 stops the run; a 200
// with no readable CR ID is an error, never a create.
//
// Every test runs the real centralReachClient.mjs against the fake HTTP adapter.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createOrUpdateClient,
  createOrUpdateEmployee,
  findClientByExternalSystemId,
  findEmployeeByExternalSystemId
} from "../../lib/centralReachClient.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { fakeCentralReach, httpError } from "./stage2Fakes.mjs";

const CLIENT_LOOKUP = "GET /contacts/client/byExternalSystemId";
const EMPLOYEE_LOOKUP = "GET /contacts/employee/byExternalSystemId";
const CLIENT_POST = "POST /contacts/client";
const EMPLOYEE_POST = "POST /contacts/employee";

const LOOKUPS = [
  { kind: "client", requirement: "BR1", route: CLIENT_LOOKUP, find: findClientByExternalSystemId },
  { kind: "employee", requirement: "BR3", route: EMPLOYEE_LOOKUP, find: findEmployeeByExternalSystemId }
];

// The fake answers 404 unless it holds a contact with the External System ID, so the tests that
// script a 200 answer seed one first.
function seedContact(cr, kind, externalSystemId) {
  const contacts = kind === "client" ? cr.clients : cr.employees;
  contacts.set("1", { contactId: "1", externalSystemId, primaryEmail: null });
}

function clientPayload() {
  return {
    ContactForm: "Public Client Intake Form",
    ExternalSystemId: "deal-1",
    FirstName: "Alex",
    LastName: "Rivera",
    DateOfBirth: "2017-01-14"
  };
}

function createClient() {
  return createOrUpdateClient({ payload: clientPayload(), existingContactId: null });
}

function createEmployee() {
  return createOrUpdateEmployee({
    payload: {
      externalSystemId: "HS1",
      firstName: "Alex",
      lastName: "Rivera",
      primaryEmail: "alex@example.com",
      dateOfBirth: "1990-10-20"
    },
    employeeType: "bt_rbt",
    workStates: ["NY"],
    existingContactId: null,
    allowEmployeeCreate: true,
    putOnlyMode: false
  });
}

// --- L-R7: a lookup answer's contact ID is digits only and greater than 0 ---

for (const { kind, requirement, route, find } of LOOKUPS) {
  test(`[${requirement}][3.14] ${kind} lookup: a contact ID that is not digits greater than 0 is CR_LOOKUP_UNREADABLE`, async () => {
    for (const contactId of [0, "0", "12a", " ", -5, "-5", 1.5, "", null, { id: 5 }, true]) {
      const cr = fakeCentralReach();
      seedContact(cr, kind, "X1");
      cr.answer(route, { contact: { contactId } });
      let thrown = null;
      await assert.rejects(find("X1"), (error) => {
        thrown = error;
        return error.code === "CR_LOOKUP_UNREADABLE";
      });
      assert.equal(classifyFailure(thrown), FAILURE_KINDS.PERMANENT);
      // The log describes the answer by field names and types, never by the value.
      assert.equal(JSON.stringify(thrown.answerShape).includes("12a"), false);
    }
  });

  test(`[${requirement}][3.14] ${kind} lookup: a contact ID of digits is returned as text, from a number or a text`, async () => {
    for (const contactId of [5338681, "5338681"]) {
      const cr = fakeCentralReach();
      seedContact(cr, kind, "X1");
      cr.answer(route, { contact: { contactId } });
      assert.deepEqual(await find("X1"), { found: true, crContactId: "5338681" });
    }
  });
}

test("[BR1][3.14] a client lookup that answers a contact ID of 0 or 12a writes nothing: no PUT, no create", async () => {
  for (const contactId of [0, "12a", " ", -5]) {
    const cr = fakeCentralReach();
    seedContact(cr, "client", "deal-1");
    cr.answer(CLIENT_LOOKUP, { contact: { contactId } });
    await assert.rejects(createClient(), (error) => error.code === "CR_LOOKUP_UNREADABLE");
    assert.equal(cr.writes().length, 0);
  }
});

// --- L-R8: a 404 is "not found" only with a JSON body or no body ---

for (const { kind, requirement, route, find } of LOOKUPS) {
  test(`[${requirement}][3.14] ${kind} lookup: a 404 with a JSON body, or with no body, is not found`, async () => {
    const bodies = [
      { responseStatus: { errorCode: "NotFound" } },
      {},
      null,
      "",
      '{"responseStatus":{"errorCode":"NotFound"}}'
    ];
    for (const data of bodies) {
      const cr = fakeCentralReach();
      cr.fail(route, httpError(404, { data }));
      assert.deepEqual(await find("X1"), { found: false, crContactId: null });
    }
  });

  test(`[${requirement}][3.14] ${kind} lookup: a 404 with an HTML or plain-text body is CR_LOOKUP_UNKNOWN, retried`, async () => {
    const bodies = [
      "<html><body><h1>404 Not Found</h1></body></html>",
      "Not Found",
      "upstream connect error",
      '"NotFound"'
    ];
    for (const data of bodies) {
      const cr = fakeCentralReach();
      cr.fail(route, httpError(404, { data }));
      let thrown = null;
      await assert.rejects(find("X1"), (error) => {
        thrown = error;
        return error.code === "CR_LOOKUP_UNKNOWN";
      });
      assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
    }
  });
}

test("[BR1][3.14] a client lookup 404 with an HTML body never leads to a create", async () => {
  const cr = fakeCentralReach();
  cr.fail(CLIENT_LOOKUP, httpError(404, { data: "<html><body>Not Found</body></html>" }));
  await assert.rejects(createClient(), (error) => error.code === "CR_LOOKUP_UNKNOWN");
  assert.equal(cr.writes().length, 0);
});

// --- L-R9: a create answer is read as contact.contactId, then contactId; digits only ---

const CREATES = [
  { kind: "client", requirement: "BR1", route: CLIENT_POST, create: createClient },
  { kind: "employee", requirement: "BR3", route: EMPLOYEE_POST, create: createEmployee }
];

for (const { kind, requirement, route, create } of CREATES) {
  test(`[${requirement}][3.14] ${kind} create: the CR ID is read from contact.contactId, then from contactId`, async () => {
    const answers = [
      [{ contact: { contactId: 5338681 }, result: "ok", failed: false }, "5338681"],
      [{ contact: { contactId: "5338681" } }, "5338681"],
      [{ contactId: 77 }, "77"],
      // contact.contactId wins over the top-level key.
      [{ contactId: 77, contact: { contactId: 5338681 } }, "5338681"]
    ];
    for (const [body, expected] of answers) {
      const cr = fakeCentralReach();
      cr.answer(route, body);
      const result = await create();
      assert.equal(result.operation, "create");
      assert.equal(result.crContactId, expected);
    }
  });

  test(`[${requirement}][3.14] ${kind} create: id, contact.id and result.* are not a CR ID, so the outcome is unknown and the create is sent once`, async () => {
    const answers = [
      { id: 55 },
      { contact: { id: 55 } },
      { result: { contactId: 55 } },
      { result: { id: 55 } },
      { contact: { contactId: "12a" } },
      { contact: { contactId: 0 } },
      { contactId: -5 },
      {}
    ];
    for (const body of answers) {
      const cr = fakeCentralReach();
      cr.answer(route, body);
      let thrown = null;
      await assert.rejects(create(), (error) => {
        thrown = error;
        return error.code === "CR_CREATE_OUTCOME_UNKNOWN";
      });
      assert.equal(classifyFailure(thrown), FAILURE_KINDS.UNKNOWN_CREATE);
      assert.equal(cr.count(route), 1);
    }
  });

  test(`[${requirement}][3.14] ${kind} create: a 200 answer with failed: true is an unknown outcome, never a success`, async () => {
    const cr = fakeCentralReach();
    cr.answer(route, { contact: { contactId: 5338681 }, result: "x", failed: true });
    await assert.rejects(create(), (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN");
    assert.equal(cr.count(route), 1);
  });
}
