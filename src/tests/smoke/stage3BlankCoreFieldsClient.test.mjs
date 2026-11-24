// Item B21 (build package 2026-11-23, Route A; BR16, the client half of row 3.13): a core client
// field that is blank in HubSpot never clears CentralReach on an update. Before every client PUT
// the client is read (GET /contacts/client/{id}) and the PUT carries, for each blank core field,
// the value that read holds. Whether the client PUT clears a left-out field is not known (O-35),
// so every one of the 11 core keys is in the PUT body. A read that cannot be used is
// CR_CLIENT_READ_FAILED and no PUT is sent. Guide: Change detection Architecture tab ("Distinguish
// an intentional blank from a failed or unauthorized read", guide-extract line 1733).
// The stored client below has the shape of the read recorded on 2026-11-24 (two production
// clients, key names and shapes only): under `contact`, a numeric contactId, the 11 core keys in
// camelCase, a blank one as "", a 28-character ISO dateOfBirth. The values are made up.
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_CLIENT_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { createOrUpdateClient } from "../../lib/centralReachClient.mjs";
import { CLIENT_CORE_FIELDS, clientCoreReadKey, fieldHashes } from "../../lib/mappedState.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { clientWorkflowDeps, httpError, timeoutError } from "./stage2Fakes.mjs";
import {
  CASE_LINK,
  METADATA_DELETE,
  STAFF_LABEL,
  setup,
  stage3Case,
  testClock
} from "./stage3WorkerFakes.mjs";

const CLIENT_READ = "GET /contacts/client/{id}";
const CLIENT_PUT = "PUT /contacts/client/{id}";
const CLIENT_POST = "POST /contacts/client";
const LOOKUP = "GET /contacts/client/byExternalSystemId";
const BLANK_HASH = fieldHashes({ core: { field: null } })["core.field"];
const SEVERITY = CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL;

const STORED_CLIENT = Object.freeze({
  gender: "Female",
  dateOfBirth: "2016-05-03T00:00:00.0000000Z",
  primaryEmail: "stored.client@example.com",
  phoneCell: "5185550123",
  addressLine1: "12 Stored Lane",
  addressLine2: "",
  city: "Albany",
  stateProvince: "NY",
  zipPostalCode: "12207",
  guardianFirstName: "Jamie",
  guardianLastName: "Stored"
});
const STORED_DATE_SENT = "2016-05-03T00:00:00.000Z";

// HubSpot holds none of the core fields but the names (and the date of birth, unless blanked).
const BLANK_CORE_CASE = {
  phi_gender: "",
  email: "",
  phone: "",
  street_address: "",
  home_apt: "",
  location_city: "",
  stateregion: "",
  location: "",
  postal_code: "",
  guardian_first_name: "",
  guardian_last_name: ""
};

function seedStoredClient(cr, contactId, overrides = {}) {
  cr.clients.set(contactId, {
    contactId,
    externalSystemId: "deal-1",
    ...STORED_CLIENT,
    ...overrides
  });
  cr.labels.set(contactId, [STAFF_LABEL]);
}

// What the PUT should carry for a core field CentralReach holds.
function sentBack(field) {
  return field === "DateOfBirth" ? STORED_DATE_SENT : STORED_CLIENT[clientCoreReadKey(field)];
}

function runCase(record, extra = {}) {
  return runClientSyncWorkflow({ dealId: "deal-1" }, { ...clientWorkflowDeps({ record }), ...extra });
}

function putsOf(cr) {
  return cr.calls.filter((call) => call.name === CLIENT_PUT);
}

function link(container) {
  return container.get(CASE_LINK.pk, CASE_LINK.id)?.data || null;
}

function namesSince(cr, start) {
  return cr.calls.slice(start).map((call) => call.name);
}

test("[BR16][3.13] a linked update with every core field blank in HubSpot: each of the 11 keys carries CentralReach's value", async () => {
  const { cr } = setup();
  seedStoredClient(cr, "2001");
  const record = stage3Case({ client_id_number: "2001", ...BLANK_CORE_CASE, phi_date_of_birth: "" });

  assert.equal((await runCase(record)).status, "success");
  const [put] = putsOf(cr);
  for (const field of CLIENT_CORE_FIELDS) {
    assert.equal(Object.hasOwn(put.body, field), true, field);
    assert.equal(put.body[field], sentBack(field), field);
  }
  // CentralReach's own blank (addressLine2 "") goes back as "", never as null.
  assert.equal(put.body.AddressLine2, "");
  assert.equal(Object.values(put.body).includes(null), false);
});

test("[BR16][3.13] a filled core field is sent as mapped; only the blank ones carry CentralReach's value", async () => {
  const { cr } = setup();
  seedStoredClient(cr, "2001");
  const record = stage3Case({
    client_id_number: "2001",
    ...BLANK_CORE_CASE,
    phone: "(212) 555-0147",
    location_city: "Brooklyn"
  });

  await runCase(record);
  const [put] = putsOf(cr);
  assert.equal(put.body.PhoneCell, "2125550147");
  assert.equal(put.body.City, "Brooklyn");
  assert.equal(put.body.Gender, STORED_CLIENT.gender);
  assert.equal(put.body.GuardianLastName, STORED_CLIENT.guardianLastName);
  // The Case's own date of birth, not CentralReach's.
  assert.equal(put.body.DateOfBirth, "2017-01-14T00:00:00.000Z");
});

test("[BR16][3.13] a blank date of birth on an update sends CentralReach's date in the mapper's form, never a blank or a placeholder", async () => {
  const { cr } = setup();
  seedStoredClient(cr, "2001");
  await runCase(stage3Case({ client_id_number: "2001", phi_date_of_birth: "" }));
  assert.equal(putsOf(cr)[0].body.DateOfBirth, STORED_DATE_SENT);

  // CentralReach holds no date either: the key is left out (nothing to keep), never sent blank.
  const second = setup();
  seedStoredClient(second.cr, "2001", { dateOfBirth: "" });
  await runCase(stage3Case({ client_id_number: "2001", phi_date_of_birth: "" }));
  assert.equal(Object.hasOwn(putsOf(second.cr)[0].body, "DateOfBirth"), false);
});

test("[BR16][3.13] a core field the integration wrote and HubSpot then blanked is still not cleared", async () => {
  const { cr } = setup();
  seedStoredClient(cr, "2001");
  const record = stage3Case({ client_id_number: "2001", phone: "2125550147", guardian_first_name: "Pat" });
  await runCase(record);
  assert.equal(putsOf(cr)[0].body.PhoneCell, "2125550147");

  record.properties.phone = "";
  record.properties.guardian_first_name = "";
  assert.equal((await runCase(record)).status, "success");
  const put = putsOf(cr).at(-1);
  assert.equal(put.body.PhoneCell, STORED_CLIENT.phoneCell);
  assert.equal(put.body.GuardianFirstName, STORED_CLIENT.guardianFirstName);
});

test("[BR16][3.13] a create still sends the full mapped payload with no client read, and a blank date of birth still blocks the create", async () => {
  const { cr } = setup();
  assert.equal((await runCase(stage3Case(BLANK_CORE_CASE))).operation, "create");
  assert.equal(cr.count(CLIENT_READ), 0);
  const [post] = cr.calls.filter((call) => call.name === CLIENT_POST);
  assert.equal(post.body.PhoneCell, null);
  assert.equal(post.body.GuardianLastName, null);
  assert.equal(post.body.DateOfBirth, "2017-01-14T00:00:00.000Z");

  const blocked = setup();
  const result = await runCase(stage3Case({ phi_date_of_birth: "" }));
  assert.equal(result.status, "error");
  assert.equal(blocked.cr.count(CLIENT_POST), 0);
  assert.equal(blocked.cr.count(CLIENT_READ), 0);
});

test("[BR16][3.13] the compared state stays HubSpot-only: a blank field keeps the blank hash, and an unchanged Case makes no CentralReach call", async () => {
  const { container, cr } = setup();
  seedStoredClient(cr, "2001");
  const record = stage3Case({ client_id_number: "2001", ...BLANK_CORE_CASE });
  await runCase(record);
  assert.equal(putsOf(cr)[0].body.PhoneCell, STORED_CLIENT.phoneCell);
  const saved = link(container).fieldHashes;
  assert.equal(saved["core.PhoneCell"], BLANK_HASH);
  assert.equal(saved["core.GuardianLastName"], BLANK_HASH);

  const start = cr.calls.length;
  const second = await runCase(record);
  assert.equal(second.status, "noop");
  assert.deepEqual(namesSince(cr, start), []);
});

test("[BR16][3.13] no usable client read: no PUT, CR_CLIENT_READ_FAILED, permanent; a held null is sent back as null", async () => {
  const unusable = [
    ["no contact", { result: "ok" }],
    ["another client", { contact: { contactId: 2002, ...STORED_CLIENT } }],
    ["no contact ID", { contact: { ...STORED_CLIENT } }],
    ["a date of birth that is not a date", { contact: { contactId: 2001, ...STORED_CLIENT, dateOfBirth: "May 3" } }],
    ...CLIENT_CORE_FIELDS.map((field) => {
      const contact = { contactId: 2001, ...STORED_CLIENT };
      delete contact[clientCoreReadKey(field)];
      return [`no ${clientCoreReadKey(field)} key`, { contact }];
    })
  ];
  for (const [label, answer] of unusable) {
    const { cr } = setup();
    cr.answer(CLIENT_READ, answer);
    await assert.rejects(
      createOrUpdateClient({ payload: { FirstName: "Alex", LastName: "Rivera" }, existingContactId: "2001" }),
      (error) => {
        assert.equal(error.code, "CR_CLIENT_READ_FAILED", label);
        assert.equal(classifyFailure(error), FAILURE_KINDS.PERMANENT, label);
        // Field names and types only: no stored value reaches the log shape or the reason.
        const logged = JSON.stringify([error.answerShape, error.syncReason]);
        assert.equal(logged.includes(STORED_CLIENT.guardianLastName), false, label);
        assert.equal(logged.includes(STORED_CLIENT.phoneCell), false, label);
        return true;
      }
    );
    assert.equal(cr.count(CLIENT_PUT), 0, label);
  }

  const { cr } = setup();
  cr.answer(CLIENT_READ, { contact: { contactId: 2001, ...STORED_CLIENT, guardianLastName: null } });
  await createOrUpdateClient({ payload: { FirstName: "Alex", LastName: "Rivera" }, existingContactId: "2001" });
  const [put] = putsOf(cr);
  assert.equal(put.body.GuardianLastName, null);
  assert.equal(put.body.GuardianFirstName, STORED_CLIENT.guardianFirstName);
});

test("[BR16][3.13] a client read that lacks a core key is a failed read with no PUT, even when HubSpot fills that field", async () => {
  const filled = {
    FirstName: "Alex",
    LastName: "Rivera",
    Gender: "Male",
    DateOfBirth: "2017-01-14",
    PrimaryEmail: "filled@example.com",
    PhoneCell: "2125550147",
    AddressLine1: "1 Filled Road",
    AddressLine2: "Apt 2",
    City: "Troy",
    StateProvince: "NY",
    ZipPostalCode: "12180",
    GuardianFirstName: "Robin",
    GuardianLastName: "Rivera"
  };
  for (const field of CLIENT_CORE_FIELDS) {
    assert.notEqual(filled[field], undefined, field);
    const { cr } = setup();
    const contact = { contactId: 2001, ...STORED_CLIENT };
    delete contact[clientCoreReadKey(field)];
    cr.answer(CLIENT_READ, { contact });
    await assert.rejects(
      createOrUpdateClient({ payload: { ...filled }, existingContactId: "2001" }),
      (error) => error.code === "CR_CLIENT_READ_FAILED" && error.syncReason.includes(clientCoreReadKey(field))
    );
    assert.equal(cr.count(CLIENT_PUT), 0, field);
  }
});

test("[BR16][3.13] a linked Case with an unusable client read ends error with the read's reason and no PUT", async () => {
  const { cr } = setup();
  seedStoredClient(cr, "2001");
  cr.answer(CLIENT_READ, { contact: { contactId: 2001, gender: "" } });
  const record = stage3Case({ client_id_number: "2001", ...BLANK_CORE_CASE });

  const result = await runCase(record);
  assert.equal(result.status, "error");
  assert.equal(cr.count(CLIENT_PUT), 0);
  assert.equal(record.properties.last_sync_status, "error");
  assert.equal(record.properties.last_sync_error.includes("GET /contacts/client/{id}"), true);
});

test("[BR16][3.13] each of the three update paths reads the client before its PUT and sends back its values", async () => {
  // 1. The linked Case.
  {
    const { cr } = setup();
    seedStoredClient(cr, "2001");
    await runCase(stage3Case({ client_id_number: "2001", ...BLANK_CORE_CASE }));
    const names = cr.calls.map((call) => call.name);
    assert.deepEqual(names.slice(0, 3), [LOOKUP, CLIENT_READ, CLIENT_PUT], "linked");
    assert.equal(putsOf(cr)[0].body.AddressLine1, STORED_CLIENT.addressLine1, "linked");
  }

  // 2. The pending-create Case whose marker lookup finds its client.
  {
    const { container, cr } = setup();
    const clock = testClock();
    const record = stage3Case(BLANK_CORE_CASE);
    cr.fail(CLIENT_POST, timeoutError(), { afterHandling: true });
    await assert.rejects(runCase(record, { now: clock.now }));
    assert.equal(link(container).pendingCreateExternalId, "deal-1");
    const createdId = Array.from(cr.clients.keys())[0];
    Object.assign(cr.clients.get(createdId), STORED_CLIENT);

    clock.advanceSeconds(60);
    const start = cr.calls.length;
    assert.equal((await runCase(record, { now: clock.now })).status, "success", "pending");
    const names = namesSince(cr, start);
    assert.deepEqual(names.slice(0, 3), [LOOKUP, CLIENT_READ, CLIENT_PUT], "pending");
    assert.equal(cr.calls.at(start + 1).url, `/contacts/client/${createdId}`);
    assert.equal(putsOf(cr)[0].body.City, STORED_CLIENT.city, "pending");
    assert.equal(cr.count(CLIENT_POST), 1);
  }

  // 3. The unlinked Case whose lookup by External System ID finds the client.
  {
    const { cr } = setup();
    seedStoredClient(cr, "2001");
    await runCase(stage3Case(BLANK_CORE_CASE));
    const names = cr.calls.map((call) => call.name);
    assert.deepEqual(names.slice(0, 3), [LOOKUP, CLIENT_READ, CLIENT_PUT], "found by lookup");
    assert.equal(putsOf(cr)[0].body.ZipPostalCode, STORED_CLIENT.zipPostalCode, "found by lookup");
    assert.equal(cr.count(CLIENT_POST), 0);
  }
});

test("[BR16][3.13] an unlinked Case found by the lookup whose client read fails: no PUT, and the pending-create marker is cleared", async () => {
  const { container, cr } = setup();
  seedStoredClient(cr, "2001");
  cr.answer(CLIENT_READ, { contact: { contactId: 2001 } });

  const result = await runCase(stage3Case(BLANK_CORE_CASE));
  assert.equal(result.status, "error");
  assert.equal(cr.count(CLIENT_PUT), 0);
  assert.equal(cr.count(CLIENT_POST), 0);
  assert.equal(link(container).pendingCreateExternalId, null);
  assert.equal(link(container).pendingCreateSentAt, null);
});

test("[BR16][3.13] a blanked metadata field the integration wrote is still cleared, while a blanked core field is kept", async () => {
  const { cr } = setup();
  seedStoredClient(cr, "2001");
  const record = stage3Case({ client_id_number: "2001", phone: "2125550147" });
  await runCase(record);

  record.properties.severity_level_clinical = "";
  record.properties.phone = "";
  const start = cr.calls.length;
  assert.equal((await runCase(record)).status, "success");
  const clears = cr.calls
    .slice(start)
    .filter((call) => call.name === METADATA_DELETE)
    .map((call) => Number(call.url.split("/").at(-1)));
  assert.deepEqual(clears, [SEVERITY]);
  assert.equal(putsOf(cr).at(-1).body.PhoneCell, STORED_CLIENT.phoneCell);
});

test("[BR16][3.13] an odd CentralReach date of birth blocks only an update that would send it back", async () => {
  // HubSpot holds a date of birth: CentralReach's date is not used, so the update that corrects
  // it goes through with HubSpot's date.
  {
    const { cr } = setup();
    seedStoredClient(cr, "2001", { dateOfBirth: "05/03/2016" });
    const record = stage3Case({ client_id_number: "2001", ...BLANK_CORE_CASE });
    assert.equal((await runCase(record)).status, "success", "HubSpot filled");
    const [put] = putsOf(cr);
    assert.equal(put.body.DateOfBirth, "2017-01-14T00:00:00.000Z", "HubSpot filled");
    assert.equal(put.body.City, STORED_CLIENT.city, "HubSpot filled");
  }

  // HubSpot's date of birth is blank: the odd date would be sent back, so the read failed.
  {
    const { cr } = setup();
    seedStoredClient(cr, "2001", { dateOfBirth: "05/03/2016" });
    const record = stage3Case({ client_id_number: "2001", phi_date_of_birth: "" });
    const result = await runCase(record);
    assert.equal(result.status, "error", "HubSpot blank");
    assert.equal(cr.count(CLIENT_PUT), 0, "HubSpot blank");
    assert.equal(record.properties.last_sync_error.includes(CLIENT_READ), true, "HubSpot blank");
    assert.equal(record.properties.last_sync_error.includes("05/03/2016"), false, "HubSpot blank");

    cr.answer(CLIENT_READ, { contact: { contactId: 2001, ...STORED_CLIENT, dateOfBirth: "May 3" } });
    await assert.rejects(
      createOrUpdateClient({ payload: { FirstName: "Alex", LastName: "Rivera" }, existingContactId: "2001" }),
      (error) => error.code === "CR_CLIENT_READ_FAILED"
    );
    assert.equal(cr.count(CLIENT_PUT), 0, "HubSpot blank");
  }
});

test("[BR16][3.13] a held core value that is neither text nor null is a failed read when it would be sent back", async () => {
  const odd = [
    ["phoneCell", 5185550123],
    ["gender", true],
    ["stateProvince", { code: "NY" }],
    ["guardianLastName", ["Stored"]],
    ["dateOfBirth", 20160503]
  ];
  for (const [key, value] of odd) {
    const { cr } = setup();
    cr.answer(CLIENT_READ, { contact: { contactId: 2001, ...STORED_CLIENT, [key]: value } });
    await assert.rejects(
      createOrUpdateClient({ payload: { FirstName: "Alex", LastName: "Rivera" }, existingContactId: "2001" }),
      (error) => {
        assert.equal(error.code, "CR_CLIENT_READ_FAILED", key);
        assert.equal(error.syncReason.includes(`contact.${key}`), true, key);
        return true;
      }
    );
    assert.equal(cr.count(CLIENT_PUT), 0, key);
  }

  // The same odd phone with HubSpot's phone filled: the held value is not used, the PUT is sent.
  const { cr } = setup();
  cr.answer(CLIENT_READ, { contact: { contactId: 2001, ...STORED_CLIENT, phoneCell: 5185550123 } });
  await createOrUpdateClient({
    payload: { FirstName: "Alex", LastName: "Rivera", PhoneCell: "2125550147" },
    existingContactId: "2001"
  });
  assert.equal(putsOf(cr)[0].body.PhoneCell, "2125550147");
});

test("[BR16][3.13] a client read refused with 404 or 403 ends error with no PUT; a 5xx or a timeout is temporary and thrown", async () => {
  for (const status of [404, 403]) {
    const { cr } = setup();
    seedStoredClient(cr, "2001");
    cr.fail(CLIENT_READ, httpError(status));
    const record = stage3Case({ client_id_number: "2001", ...BLANK_CORE_CASE });
    const result = await runCase(record);
    assert.equal(result.status, "error", String(status));
    assert.equal(record.properties.last_sync_status, "error", String(status));
    assert.equal(cr.count(CLIENT_PUT), 0, String(status));
  }

  for (const [label, error, times] of [["503", httpError(503), 3], ["timeout", timeoutError(), 1]]) {
    const { cr } = setup();
    seedStoredClient(cr, "2001");
    cr.fail(CLIENT_READ, error, { times });
    const record = stage3Case({ client_id_number: "2001", ...BLANK_CORE_CASE });
    await assert.rejects(runCase(record), (thrown) => {
      assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY, label);
      return true;
    });
    assert.equal(cr.count(CLIENT_PUT), 0, label);
    assert.notEqual(record.properties.last_sync_status, "error", label);
  }
});

test("[BR16][3.13] a pending-create Case whose client read times out keeps the pending-create marker and sends no PUT", async () => {
  const { container, cr } = setup();
  const clock = testClock();
  const record = stage3Case(BLANK_CORE_CASE);
  cr.fail(CLIENT_POST, timeoutError(), { afterHandling: true });
  await assert.rejects(runCase(record, { now: clock.now }));
  const marker = link(container).pendingCreateSentAt;
  assert.equal(link(container).pendingCreateExternalId, "deal-1");

  clock.advanceSeconds(60);
  cr.fail(CLIENT_READ, timeoutError());
  await assert.rejects(runCase(record, { now: clock.now }), (thrown) => {
    assert.equal(classifyFailure(thrown), FAILURE_KINDS.TEMPORARY);
    return true;
  });
  assert.equal(cr.count(CLIENT_READ), 1);
  assert.equal(cr.count(CLIENT_PUT), 0);
  assert.equal(link(container).pendingCreateExternalId, "deal-1");
  assert.equal(link(container).pendingCreateSentAt, marker);
});

test("[BR16][3.13] the update PUT body carries neither warnings nor unreadableValueProperties", async () => {
  const { cr } = setup();
  seedStoredClient(cr, "2001");
  // An unreadable stateregion falls back to location and adds a warning to the mapped payload.
  const record = stage3Case({ client_id_number: "2001", stateregion: "Xanadu", location: "Colorado" });
  assert.equal((await runCase(record)).status, "success");
  const [put] = putsOf(cr);
  assert.equal(put.body.StateProvince, "CO");
  assert.equal(Object.hasOwn(put.body, "warnings"), false);
  assert.equal(Object.hasOwn(put.body, "unreadableValueProperties"), false);
});
