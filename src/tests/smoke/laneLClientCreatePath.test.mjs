// Lane L, row 3.14: the client create path is read-only before it writes (BUILD-PLAN rule 5.5).
//
// Guide rows these tests are written from (guide-extract-2026-11-20.md):
// - [GBR] Requirement 1 (BR1): create the CR client when Entered in CentralReach is Yes and the
//   record is not linked. A lookup that is not clear never leads to a create.
// - [GER-REQ] (BR22): "Client · ContactForm ... Sent on every client create", and "the
//   integration still sends the HubSpot Case record ID as the client ExternalSystemId". The form
//   is sent on a create only. An update sends the External System ID only when CentralReach is
//   known to hold that same value (review fix L-R2, orchestrator's route under decision 28):
//   sending back what CentralReach holds changes nothing, and leaving it out could clear it if
//   the client PUT clears a field that is left out (not tested, O-35).
//
// Every test runs the real centralReachClient.mjs against the fake HTTP adapter.
import test from "node:test";
import assert from "node:assert/strict";
import { createOrUpdateClient } from "../../lib/centralReachClient.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { fakeCentralReach, httpError, timeoutError } from "./stage2Fakes.mjs";

const LOOKUP_GET = "GET /contacts/client/byExternalSystemId";
const LOOKUP_PUT = "PUT /contacts/client/byExternalSystemId";
const CLIENT_POST = "POST /contacts/client";
const CLIENT_PUT = "PUT /contacts/client/{id}";

// The Case record ID is the client's External System ID; the form is the guide's default.
const CASE_ID = "deal-1";
function clientPayload() {
  return {
    ContactForm: "Public Client Intake Form",
    ExternalSystemId: CASE_ID,
    FirstName: "Alex",
    LastName: "Rivera",
    DateOfBirth: "2017-01-14"
  };
}

// Item B21: an update carries all 11 core keys. These fake clients hold every core field blank
// (""), so a core field the payload does not fill is sent back as "".
const HELD_BLANK_CORE = {
  Gender: "",
  PrimaryEmail: "",
  PhoneCell: "",
  AddressLine1: "",
  AddressLine2: "",
  City: "",
  StateProvince: "",
  ZipPostalCode: "",
  GuardianFirstName: "",
  GuardianLastName: ""
};

function callsNamed(cr, name) {
  return cr.calls.filter((call) => call.name === name);
}

test("[BR1][3.14] no CR ID and the read-only lookup answers 404: one POST, with ExternalSystemId and ContactForm", async () => {
  const cr = fakeCentralReach();
  const result = await createOrUpdateClient({ payload: clientPayload(), existingContactId: null });

  assert.equal(result.operation, "create");
  assert.equal(typeof result.crContactId, "string");
  assert.equal(cr.count(LOOKUP_GET), 1);
  assert.equal(cr.calls[0].url.endsWith(`ExternalSystemId=${CASE_ID}`), true);
  assert.equal(cr.count(CLIENT_POST), 1);
  assert.equal(cr.count(CLIENT_PUT), 0);
  const [post] = callsNamed(cr, CLIENT_POST);
  assert.equal(post.body.ExternalSystemId, CASE_ID);
  assert.equal(post.body.ContactForm, "Public Client Intake Form");
  assert.equal(post.body.FirstName, "Alex");
});

test("[BR1][3.14] the lookup is the read-only GET: the full-payload PUT by External System ID is never sent", async () => {
  const cr = fakeCentralReach();
  await createOrUpdateClient({ payload: clientPayload(), existingContactId: null });
  cr.clients.set("2001", { contactId: "2001", externalSystemId: "deal-2", primaryEmail: null });
  await createOrUpdateClient({
    payload: { ...clientPayload(), ExternalSystemId: "deal-2" },
    existingContactId: ""
  });

  assert.equal(cr.count(LOOKUP_PUT), 0);
  assert.equal(cr.count(LOOKUP_GET), 2);
  // Every write is a create or an update by CR ID.
  assert.deepEqual(
    cr.writes().map((call) => call.name),
    [CLIENT_POST, CLIENT_PUT]
  );
});

test("[BR22][3.14] found by the Case record ID: one PUT by CR ID, with the ExternalSystemId CentralReach holds and no ContactForm, and no create", async () => {
  const cr = fakeCentralReach();
  cr.clients.set("2001", { contactId: "2001", externalSystemId: CASE_ID, primaryEmail: null });
  const result = await createOrUpdateClient({ payload: clientPayload(), existingContactId: null });

  assert.deepEqual(result, { operation: "update", crContactId: "2001" });
  assert.equal(cr.count(CLIENT_POST), 0);
  const puts = callsNamed(cr, CLIENT_PUT);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].url, "/contacts/client/2001");
  // The lookup found this client by that very ID, so CentralReach holds it.
  assert.equal(puts[0].body.ExternalSystemId, CASE_ID);
  assert.equal(Object.prototype.hasOwnProperty.call(puts[0].body, "ContactForm"), false);
  assert.equal(puts[0].body.LastName, "Rivera");
});

test("[BR22][3.14] a linked update with externalSystemIdHeld: true carries ExternalSystemId and no ContactForm", async () => {
  const cr = fakeCentralReach();
  const payload = clientPayload();
  const result = await createOrUpdateClient({
    payload,
    existingContactId: "2001",
    externalSystemIdHeld: true
  });

  assert.deepEqual(result, { operation: "update", crContactId: "2001" });
  assert.equal(cr.count(LOOKUP_GET), 0);
  const puts = callsNamed(cr, CLIENT_PUT);
  assert.equal(puts.length, 1);
  // BR16 (2026-11-24): the body is the client read with the mapped keys laid over it, so the
  // read's contactId goes back too.
  assert.deepEqual(puts[0].body, {
    ContactId: 2001,
    ExternalSystemId: CASE_ID,
    FirstName: "Alex",
    LastName: "Rivera",
    DateOfBirth: "2017-01-14",
    ...HELD_BLANK_CORE
  });
  assert.deepEqual(payload, clientPayload());
});

test("[BR22][3.14] only externalSystemIdHeld: true sends the ID on a linked update, and a blank ID is never sent", async () => {
  for (const held of [false, undefined, null, "true", 1]) {
    const cr = fakeCentralReach();
    await createOrUpdateClient({
      payload: clientPayload(),
      existingContactId: "2001",
      externalSystemIdHeld: held
    });
    const [put] = callsNamed(cr, CLIENT_PUT);
    assert.equal(Object.prototype.hasOwnProperty.call(put.body, "ExternalSystemId"), false);
  }

  const cr = fakeCentralReach();
  await createOrUpdateClient({
    payload: { ...clientPayload(), ExternalSystemId: "  " },
    existingContactId: "2001",
    externalSystemIdHeld: true
  });
  const [put] = callsNamed(cr, CLIENT_PUT);
  assert.equal(Object.prototype.hasOwnProperty.call(put.body, "ExternalSystemId"), false);
});

test("[BR1][3.14] a CR ID of only spaces or a tab is no CR ID: a client the lookup finds is updated, never created again", async () => {
  for (const blank of ["  ", "\t", " \t \n", ""]) {
    const cr = fakeCentralReach();
    cr.clients.set("2001", { contactId: "2001", externalSystemId: CASE_ID, primaryEmail: null });
    const result = await createOrUpdateClient({ payload: clientPayload(), existingContactId: blank });

    assert.deepEqual(result, { operation: "update", crContactId: "2001" });
    assert.equal(cr.count(LOOKUP_GET), 1);
    assert.equal(cr.count(CLIENT_POST), 0);
    assert.equal(cr.clients.size, 1);
    assert.equal(callsNamed(cr, CLIENT_PUT)[0].url, "/contacts/client/2001");
  }
});

test("[BR1][3.14] a CR ID with spaces around it is used trimmed, with no lookup", async () => {
  const cr = fakeCentralReach();
  const result = await createOrUpdateClient({ payload: clientPayload(), existingContactId: " 2001\t" });
  assert.deepEqual(result, { operation: "update", crContactId: "2001" });
  assert.equal(cr.count(LOOKUP_GET), 0);
  assert.equal(callsNamed(cr, CLIENT_PUT)[0].url, "/contacts/client/2001");
});

test("[BR22][3.14] a linked update with no externalSystemIdHeld carries neither ExternalSystemId nor ContactForm", async () => {
  const cr = fakeCentralReach();
  const payload = clientPayload();
  const result = await createOrUpdateClient({ payload, existingContactId: "2001" });

  assert.deepEqual(result, { operation: "update", crContactId: "2001" });
  // A linked Case needs no lookup here: the worker has already compared the IDs (rule 5.5).
  assert.equal(cr.count(LOOKUP_GET), 0);
  assert.equal(cr.count(CLIENT_POST), 0);
  const puts = callsNamed(cr, CLIENT_PUT);
  assert.equal(puts.length, 1);
  assert.equal(puts[0].url, "/contacts/client/2001");
  assert.deepEqual(puts[0].body, {
    ContactId: 2001,
    FirstName: "Alex",
    LastName: "Rivera",
    DateOfBirth: "2017-01-14",
    ...HELD_BLANK_CORE
  });
  // The worker hashes the payload it passed in: it must not be changed.
  assert.deepEqual(payload, clientPayload());
});

test("[BR1][3.14] a 400 from the lookup never leads to a create, whatever its text says", async () => {
  const cr = fakeCentralReach();
  cr.fail(LOOKUP_GET, httpError(400, { data: { message: "Contact not found" } }));
  let thrown = null;
  await assert.rejects(
    createOrUpdateClient({ payload: clientPayload(), existingContactId: null }),
    (error) => {
      thrown = error;
      return error.code === "CR_LOOKUP_UNKNOWN";
    }
  );
  assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
  assert.equal(cr.writes().length, 0);
});

test("[BR1][3.14] a lookup that times out or answers 401 never leads to a create", async () => {
  for (const failure of [timeoutError(), httpError(401), httpError(403)]) {
    const cr = fakeCentralReach();
    cr.fail(LOOKUP_GET, failure);
    await assert.rejects(
      createOrUpdateClient({ payload: clientPayload(), existingContactId: null }),
      (error) => error.code === "CR_LOOKUP_UNKNOWN"
    );
    assert.equal(cr.writes().length, 0);
  }
});

test("[BR1][3.14] a 200 lookup with no contact.contactId is an error, never a create and never an update", async () => {
  // `id` and `result.id` are no longer read as a CR ID, and "not found" text in a 200 is not a miss.
  const unreadable = [
    { id: 55 },
    { result: { id: 55 } },
    { contactId: 55 },
    { message: "Contact not found" },
    {}
  ];
  for (const body of unreadable) {
    const cr = fakeCentralReach();
    cr.answer(LOOKUP_GET, body);
    cr.clients.set("2001", { contactId: "2001", externalSystemId: CASE_ID, primaryEmail: null });
    let thrown = null;
    await assert.rejects(
      createOrUpdateClient({ payload: clientPayload(), existingContactId: null }),
      (error) => {
        thrown = error;
        return error.code === "CR_LOOKUP_UNREADABLE";
      }
    );
    assert.equal(classifyFailure(thrown), FAILURE_KINDS.PERMANENT);
    assert.equal(cr.writes().length, 0);
  }
});

test("[BR1][3.14] no CR ID and no External System ID: no lookup and no create", async () => {
  const cr = fakeCentralReach();
  const payload = clientPayload();
  delete payload.ExternalSystemId;
  await assert.rejects(
    createOrUpdateClient({ payload, existingContactId: null }),
    (error) => error.code === "CR_EXTERNAL_ID_REQUIRED"
  );
  assert.equal(cr.calls.length, 0);
});

test("[BR1][3.14] there is no client-create switch: the employee create settings do not stop a client create", async () => {
  const cr = fakeCentralReach();
  const result = await createOrUpdateClient({
    payload: clientPayload(),
    existingContactId: null,
    allowEmployeeCreate: false,
    putOnlyMode: true
  });
  assert.equal(result.operation, "create");
  assert.equal(cr.count(CLIENT_POST), 1);
});

test("[BR1][3.14] a client create that fails with 500 is sent once and its outcome is unknown", async () => {
  const cr = fakeCentralReach();
  cr.fail(CLIENT_POST, httpError(500), { times: 3 });
  await assert.rejects(
    createOrUpdateClient({ payload: clientPayload(), existingContactId: null }),
    (error) => error.code === "CR_CREATE_OUTCOME_UNKNOWN"
  );
  assert.equal(cr.count(CLIENT_POST), 1);
});

// SG-1 (BR16, rule 5.8): an error thrown before any write was sent carries crWriteNotSent, so the
// worker can put its in-progress mark back. Once the create POST or the core PUT was attempted it
// may have reached CentralReach, so its error never carries the flag.
test("[BR16][3.14] SG-1: errors from the lookup, the client read and the SSN guard carry crWriteNotSent; errors from the create POST and the core PUT never do", async () => {
  const CLIENT_GET = "GET /contacts/client/{id}";
  const notSent = (error) => error.crWriteNotSent === true;
  const sent = (error) => error.crWriteNotSent === undefined;
  const heldClient = (cr) =>
    cr.clients.set("2001", { contactId: "2001", externalSystemId: CASE_ID, ...HELD_BLANK_CORE });

  // The lookup: a 500 (CR_LOOKUP_UNKNOWN), a timeout, a 200 with no contact ID.
  let cr = fakeCentralReach();
  cr.fail(LOOKUP_GET, httpError(500), { times: 3 });
  await assert.rejects(createOrUpdateClient({ payload: clientPayload(), existingContactId: null }), notSent);
  cr = fakeCentralReach();
  cr.fail(LOOKUP_GET, timeoutError(), { times: 3 });
  await assert.rejects(createOrUpdateClient({ payload: clientPayload(), existingContactId: null }), notSent);
  cr = fakeCentralReach();
  heldClient(cr);
  cr.answer(LOOKUP_GET, { contact: {} });
  await assert.rejects(createOrUpdateClient({ payload: clientPayload(), existingContactId: null }), notSent);

  // The client read (a 503 with no code) and the SSN guard, by CR ID and after a lookup.
  for (const existingContactId of ["2001", null]) {
    cr = fakeCentralReach();
    heldClient(cr);
    cr.fail(CLIENT_GET, httpError(503), { times: 3 });
    await assert.rejects(createOrUpdateClient({ payload: clientPayload(), existingContactId }), notSent);
    cr = fakeCentralReach();
    cr.clients.set("2001", {
      contactId: "2001",
      externalSystemId: CASE_ID,
      ...HELD_BLANK_CORE,
      ssn: "***-**-6789"
    });
    await assert.rejects(createOrUpdateClient({ payload: clientPayload(), existingContactId }), notSent);
    assert.equal(cr.writes().length, 0);
  }

  // The writes: the create POST (500, outcome unknown) and the core PUT (503, then 400).
  cr = fakeCentralReach();
  cr.fail(CLIENT_POST, httpError(500), { times: 3 });
  await assert.rejects(createOrUpdateClient({ payload: clientPayload(), existingContactId: null }), sent);
  assert.equal(cr.count(CLIENT_POST), 1);
  for (const status of [503, 400]) {
    cr = fakeCentralReach();
    heldClient(cr);
    cr.fail(CLIENT_PUT, httpError(status), { times: 3 });
    await assert.rejects(createOrUpdateClient({ payload: clientPayload(), existingContactId: "2001" }), sent);
    assert.equal(cr.count(CLIENT_PUT) > 0, true);
  }
});
