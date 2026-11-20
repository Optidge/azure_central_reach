// Row 6.4 (lane E, wave 2): the BCBA personal email comes from the BCBA's Contact (B9, K3,
// BR16; BUILD-PLAN.md section 12, rule 5.8).
// Guide [GER-BCBA] "Personal Email | Contact email / BCBA → Contact type 17 | Read from the linked
// Contact." [GER-CONTACT] "BCBA personal email | email / BCBA → Contact type 17 | Read the
// associated Contact's email for BCBA Employee personal email." and, for the sandbox, "Use BCBA →
// Contact 191 in [SCURRENT] to read the staff Contact."
// CentralReach target: Meta 138069. No Contact: the field is blank. More than one Contact, or a
// failed read: 138069 is in omitFieldIds, so nothing is cleared, and a warning is logged.
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { hubspotPortalSettings } from "../../lib/config.mjs";
import { employeeRequestProperties } from "../../mappings/employees/employeeProperties.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  PRODUCTION_PORTAL,
  SANDBOX_PORTAL,
  employeeWorkflowDeps,
  httpError,
  hubspotAnswer,
  workflowConfig
} from "./stage2Fakes.mjs";
import {
  BCBA_LINK,
  METADATA_DELETE,
  METADATA_PUT,
  counters,
  linkedBcba,
  linkedBt,
  setup,
  stage3Bcba
} from "./stage3WorkerFakes.mjs";

const PERSONAL_EMAIL = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_EMAIL;
const SANDBOX_BCBA_CONTACT = 191;
const PRODUCTION_BCBA_CONTACT = 17;
const SANDBOX_BCBA_TYPE = "2-72890322";

// The BCBA's Contacts, as HubSpot answers them. `links` are the BCBA → Contact associations;
// `emails` the Contacts' email values. A test changes them between runs.
function contactsFake({
  links = [{ contactId: "801", typeId: SANDBOX_BCBA_CONTACT }],
  emails = { 801: "pat.personal@example.com" }
} = {}) {
  const state = {
    links,
    emails,
    associationError: null,
    contactError: null,
    associationReads: [],
    contactReads: []
  };
  return {
    state,
    deps: {
      listAssociations: async (input) => {
        state.associationReads.push(input);
        if (state.associationError) {
          throw state.associationError;
        }
        return state.links.map(({ contactId, typeId }) => ({
          toObjectId: contactId,
          types: [{ typeId, category: "USER_DEFINED" }]
        }));
      },
      getContactById: async (contactId, properties) => {
        state.contactReads.push({ contactId, properties });
        if (state.contactError) {
          throw state.contactError;
        }
        return hubspotAnswer({ id: contactId, properties: { email: state.emails[contactId] } }, properties);
      }
    }
  };
}

function runBcba(record, contacts, { logs = [], config } = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: record.properties.hs_object_id, employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA },
    {
      ...employeeWorkflowDeps({ record, logs, ...(config ? { config } : {}) }),
      ...contacts.deps
    }
  );
}

function personalEmailCalls(crCalls, name) {
  return crCalls.filter(
    (call) => call.name === name && Number(call.url.split("/").at(-1)) === PERSONAL_EMAIL
  );
}

test("[B9][6.4] the BCBA personal email (Meta 138069) is the email of the Contact linked by BCBA → Contact 191", async () => {
  const { container, cr } = setup();
  // The BCBA record's own email property is not a source any more.
  const record = linkedBcba(cr, { email: "bcba.record@example.com" });
  const contacts = contactsFake();
  const count = counters({ container, cr, record });
  const start = count.mark();

  const result = await runBcba(record, contacts);
  const done = count.since(start);

  assert.equal(result.status, "success");
  const puts = personalEmailCalls(done.crCalls, METADATA_PUT);
  assert.equal(puts.length, 1);
  assert.equal(JSON.stringify(puts[0].body).includes("pat.personal@example.com"), true);
  assert.equal(JSON.stringify(done.crCalls).includes("bcba.record@example.com"), false);
  // The worker asked for the BCBA's Contacts and read the one Contact's email only.
  assert.deepEqual(contacts.state.associationReads, [
    { fromObjectType: SANDBOX_BCBA_TYPE, fromId: "HS2", toObjectType: "0-1" }
  ]);
  assert.deepEqual(contacts.state.contactReads, [{ contactId: "801", properties: ["email"] }]);
});

test("[K3][6.4] a change to the Contact's email updates field 138069 on the linked BCBA, and nothing else", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr);
  const contacts = contactsFake();
  await runBcba(record, contacts);

  contacts.state.emails["801"] = "pat.new@example.com";
  const count = counters({ container, cr, record });
  const start = count.mark();
  const result = await runBcba(record, contacts);
  const done = count.since(start);

  assert.equal(result.status, "success");
  const metadataCalls = done.crCalls.filter(
    (call) => call.name === METADATA_PUT || call.name === METADATA_DELETE
  );
  assert.equal(metadataCalls.length, 1);
  assert.equal(Number(metadataCalls[0].url.split("/").at(-1)), PERSONAL_EMAIL);
  assert.equal(JSON.stringify(metadataCalls[0].body).includes("pat.new@example.com"), true);
});

test("[B9][6.4] no Contact linked: 138069 is blank, so the email the integration wrote before is cleared", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr);
  const contacts = contactsFake();
  await runBcba(record, contacts);

  contacts.state.links = [];
  const count = counters({ container, cr, record });
  const start = count.mark();
  const result = await runBcba(record, contacts);
  const done = count.since(start);

  assert.equal(result.status, "success");
  assert.equal(personalEmailCalls(done.crCalls, METADATA_DELETE).length, 1);
  assert.equal(personalEmailCalls(done.crCalls, METADATA_PUT).length, 0);
  assert.deepEqual(contacts.state.contactReads.length, 1);
});

test("[B9][6.4] a BCBA with no Contact and no saved copy sends no value and no clear for 138069", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr);
  const contacts = contactsFake({ links: [] });
  const count = counters({ container, cr, record });
  const start = count.mark();

  const result = await runBcba(record, contacts);
  const done = count.since(start);

  assert.equal(result.status, "success");
  assert.equal(personalEmailCalls(done.crCalls, METADATA_PUT).length, 0);
  assert.equal(personalEmailCalls(done.crCalls, METADATA_DELETE).length, 0);
});

test("[B9][6.4] a Contact linked by another association type is not the BCBA's Contact", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr);
  const contacts = contactsFake({
    links: [
      { contactId: "802", typeId: 192 },
      { contactId: "801", typeId: SANDBOX_BCBA_CONTACT }
    ],
    emails: { 801: "pat.personal@example.com", 802: "someone.else@example.com" }
  });
  const count = counters({ container, cr, record });
  const start = count.mark();

  await runBcba(record, contacts);
  const done = count.since(start);

  const puts = personalEmailCalls(done.crCalls, METADATA_PUT);
  assert.equal(puts.length, 1);
  assert.equal(JSON.stringify(puts[0].body).includes("pat.personal@example.com"), true);
  assert.deepEqual(contacts.state.contactReads.map((read) => read.contactId), ["801"]);
});

for (const [name, breakRead, reason] of [
  [
    "a failed association read (403)",
    (contacts) => {
      contacts.state.associationError = httpError(403);
    },
    "contact_read_failed"
  ],
  [
    "a failed Contact read (500)",
    (contacts) => {
      contacts.state.contactError = httpError(500);
    },
    "contact_read_failed"
  ],
  [
    "a Contact answer without the email key",
    (contacts) => {
      contacts.deps.getContactById = async (contactId) => ({ id: contactId, properties: {} });
    },
    "contact_read_failed"
  ],
  [
    "two Contacts linked by BCBA → Contact 191",
    (contacts) => {
      contacts.state.links = [
        { contactId: "801", typeId: SANDBOX_BCBA_CONTACT },
        { contactId: "803", typeId: SANDBOX_BCBA_CONTACT }
      ];
      contacts.state.emails["803"] = "pat.other@example.com";
    },
    "several_contacts"
  ]
]) {
  test(`[BR16][6.4] ${name}: no clear is sent for 138069, a warning names the field, and a later blank still clears`, async () => {
    const { container, cr } = setup();
    const record = linkedBcba(cr);
    const contacts = contactsFake();
    await runBcba(record, contacts);
    const savedHash = container.get(BCBA_LINK.pk, BCBA_LINK.id).data.fieldHashes[
      `metadata.${PERSONAL_EMAIL}`
    ];

    // The same run also carries a real change, so it writes to CentralReach.
    breakRead(contacts);
    record.properties.medicaid_id__ny = "NY12345";
    const logs = [];
    const count = counters({ container, cr, record });
    let start = count.mark();
    const result = await runBcba(record, contacts, { logs });
    let done = count.since(start);

    // The run goes on and sends the other change; field 138069 is neither sent nor cleared.
    assert.equal(result.status, "success");
    assert.equal(
      done.crCalls.some(
        (call) =>
          call.name === METADATA_PUT &&
          Number(call.url.split("/").at(-1)) ===
            CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY
      ),
      true
    );
    assert.equal(personalEmailCalls(done.crCalls, METADATA_PUT).length, 0);
    assert.equal(personalEmailCalls(done.crCalls, METADATA_DELETE).length, 0);
    const warning = logs.find((entry) => entry.message.startsWith("BCBA personal email not sent"));
    assert.equal(warning.level, "warn");
    assert.equal(warning.meta.fieldId, PERSONAL_EMAIL);
    assert.equal(warning.meta.reason, reason);
    assert.equal(JSON.stringify(logs).includes("@example.com"), false);
    // Row 3.18: the saved hash of the omitted field is kept.
    assert.equal(
      container.get(BCBA_LINK.pk, BCBA_LINK.id).data.fieldHashes[`metadata.${PERSONAL_EMAIL}`],
      savedHash
    );

    // The Contact can be read again and its email is now blank: the clear is sent.
    const healthy = contactsFake({ emails: { 801: "" } });
    start = count.mark();
    await runBcba(record, healthy);
    done = count.since(start);
    assert.equal(personalEmailCalls(done.crCalls, METADATA_DELETE).length, 1);
  });
}

test("[BR16][6.4] a failed Contact read with no other change makes no CentralReach write", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr);
  const contacts = contactsFake();
  await runBcba(record, contacts);

  contacts.state.associationError = httpError(503);
  const count = counters({ container, cr, record });
  const start = count.mark();
  const result = await runBcba(record, contacts);
  const done = count.since(start);

  // An omitted field alone does not make a run a write (row 3.18).
  assert.equal(result.status, "noop");
  assert.deepEqual(done.crWrites, []);
});

test("[B9][6.4] two Contacts: no Contact is read, and the warning gives the count", async () => {
  const { cr } = setup();
  const record = linkedBcba(cr);
  const contacts = contactsFake({
    links: [
      { contactId: "801", typeId: SANDBOX_BCBA_CONTACT },
      { contactId: "803", typeId: SANDBOX_BCBA_CONTACT }
    ]
  });
  const logs = [];
  await runBcba(record, contacts, { logs });

  assert.deepEqual(contacts.state.contactReads, []);
  const warning = logs.find((entry) => entry.message.startsWith("BCBA personal email not sent"));
  assert.equal(warning.meta.contactCount, 2);
});

test("[B9][6.4] the BCBA → Contact type is 191 in the sandbox and 17 in production", async () => {
  assert.equal(hubspotPortalSettings(SANDBOX_PORTAL).bcbaContactAssociationTypeId, SANDBOX_BCBA_CONTACT);
  assert.equal(
    hubspotPortalSettings(PRODUCTION_PORTAL).bcbaContactAssociationTypeId,
    PRODUCTION_BCBA_CONTACT
  );

  // A production run follows type 17 and not the sandbox's 191.
  const { container, cr } = setup();
  const record = linkedBcba(cr);
  const contacts = contactsFake({
    links: [
      { contactId: "804", typeId: SANDBOX_BCBA_CONTACT },
      { contactId: "805", typeId: PRODUCTION_BCBA_CONTACT }
    ],
    emails: { 804: "not.this@example.com", 805: "pat.production@example.com" }
  });
  const count = counters({ container, cr, record });
  const start = count.mark();
  await runBcba(record, contacts, { config: workflowConfig({ portalId: PRODUCTION_PORTAL }) });
  const done = count.since(start);

  const puts = personalEmailCalls(done.crCalls, METADATA_PUT);
  assert.equal(puts.length, 1);
  assert.equal(JSON.stringify(puts[0].body).includes("pat.production@example.com"), true);
  assert.equal(contacts.state.associationReads[0].fromObjectType, "2-48354212");
});

test("[B9][6.4] the BCBA record's own email property is no longer requested", () => {
  assert.equal(employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA).includes("email"), false);
  // The BT/RBT primary email is still the BT/RBT record's email (T2).
  assert.equal(employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BT_RBT).includes("email"), true);
});

test("[B9][6.4] a new BCBA is created with its Contact's email in 138069", async () => {
  const { container, cr } = setup();
  const record = stage3Bcba({
    employee_id: "",
    ucaba_email_address: "pat.morgan@ucaba.example.com"
  });
  const contacts = contactsFake();
  const count = counters({ container, cr, record });
  const start = count.mark();

  const result = await runBcba(record, contacts);
  const done = count.since(start);

  assert.equal(result.operation, "create");
  const puts = personalEmailCalls(done.crCalls, METADATA_PUT);
  assert.equal(puts.length, 1);
  assert.equal(JSON.stringify(puts[0].body).includes("pat.personal@example.com"), true);
});

test("[K3][6.4] a BT/RBT run reads no Contact", async () => {
  const { cr } = setup();
  const record = linkedBt(cr);
  const contacts = contactsFake();
  const result = await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: HUBSPOT_EMPLOYEE_TYPES.BT_RBT },
    { ...employeeWorkflowDeps({ record }), ...contacts.deps }
  );

  assert.equal(result.status, "success");
  assert.deepEqual(contacts.state.associationReads, []);
  assert.deepEqual(contacts.state.contactReads, []);
});
