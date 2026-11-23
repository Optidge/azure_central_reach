// Row 6.4 (B9, T9, BR16): the employee personal email, CentralReach Meta 138069 (type `input`).
// Decision 50 (2026-11-23): on the BCBA and on the BT/RBT it is the record's own HubSpot
// `personal_email` ("Personal Email (backup only, never emailed)"); `email` stays the primary
// email only (decision 49). The linked Contact is not read for it (decision 42), and the portal
// table holds no BCBA -> Contact type. A blank `personal_email` follows the blank rule of the other
// employee metadata fields; a filled one that fails the format check is `error` (decision 43); a
// missing `personal_email` key is a failed read (row 4.18,
// src/tests/smoke/stage4EmployeeMissingKeys.test.mjs covers every mapped key).
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { hubspotPortalSettings } from "../../lib/config.mjs";
import {
  employeeMappedProperties,
  employeeRequestProperties
} from "../../mappings/employees/employeeProperties.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { expectedTriggerProperties } from "../../../scripts/check-triggers.mjs";
import {
  PRODUCTION_PORTAL,
  SANDBOX_PORTAL,
  employeeWorkflowDeps,
  hubspotAnswer
} from "./stage2Fakes.mjs";
import {
  METADATA_DELETE,
  METADATA_PUT,
  counters,
  linkedBcba,
  linkedBt,
  setup,
  stage3Bcba
} from "./stage3WorkerFakes.mjs";

const PERSONAL_EMAIL = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.PERSONAL_EMAIL;
const SUMMARY = "Sync run summary.";

// Any association or Contact read the worker would make. Row 6.4 makes none.
function contactReadSpy() {
  const reads = [];
  return {
    reads,
    deps: {
      listAssociations: async (input) => {
        reads.push({ kind: "associations", input });
        return [];
      },
      getContactById: async (contactId, properties) => {
        reads.push({ kind: "contact", contactId });
        return hubspotAnswer({ id: contactId, properties: { email: "contact@example.com" } }, properties);
      }
    }
  };
}

function runBcba(record, { logs = [], extra = {} } = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: record.properties.hs_object_id, employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA },
    { ...employeeWorkflowDeps({ record, logs }), ...extra }
  );
}

function runBt(record, { logs = [], extra = {} } = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: record.properties.hs_object_id, employeeType: HUBSPOT_EMPLOYEE_TYPES.BT_RBT },
    { ...employeeWorkflowDeps({ record, logs }), ...extra }
  );
}

function changedFieldNames(logs) {
  return [...(logs.find((entry) => entry.message === SUMMARY)?.meta?.changedFieldNames || [])];
}

function personalEmailCalls(crCalls, name) {
  return crCalls.filter(
    (call) => call.name === name && Number(call.url.split("/").at(-1)) === PERSONAL_EMAIL
  );
}

// The two employee types send 138069 the same way (B9 for the BCBA, T9 for the BT/RBT).
const SIDES = [
  { id: "B9", label: "BCBA", linked: linkedBcba, run: runBcba, readerName: "getBcbaRecordById" },
  { id: "T9", label: "BT/RBT", linked: linkedBt, run: runBt, readerName: "getBtRbtRecordById" }
];

for (const side of SIDES) {
  test(`[${side.id}][6.4] ${side.label}: Meta 138069 is the record's own personal_email, never its email, and no Contact is read`, async () => {
    const { container, cr } = setup();
    const record = side.linked(cr, {
      email: "work@example.com",
      personal_email: "pat.personal@example.com"
    });
    const spy = contactReadSpy();
    const count = counters({ container, cr, record });
    const start = count.mark();

    const result = await side.run(record, { extra: spy.deps });
    const done = count.since(start);

    assert.equal(result.status, "success");
    const puts = personalEmailCalls(done.crCalls, METADATA_PUT);
    assert.equal(puts.length, 1);
    assert.equal(JSON.stringify(puts[0].body).includes("pat.personal@example.com"), true);
    assert.equal(JSON.stringify(puts[0].body).includes("work@example.com"), false);
    assert.equal(JSON.stringify(done.crCalls).includes("contact@example.com"), false);
    assert.deepEqual(spy.reads, []);
  });

  test(`[${side.id}][6.4] ${side.label}: a change to personal_email alone updates field 138069 only and is one changed field`, async () => {
    const { container, cr } = setup();
    const record = side.linked(cr, { personal_email: "pat.personal@example.com" });
    await side.run(record);

    record.properties.personal_email = "pat.new@example.com";
    const logs = [];
    const count = counters({ container, cr, record });
    const start = count.mark();
    const result = await side.run(record, { logs });
    const done = count.since(start);

    assert.equal(result.status, "success");
    const metadataCalls = done.crCalls.filter(
      (call) => call.name === METADATA_PUT || call.name === METADATA_DELETE
    );
    assert.equal(metadataCalls.length, 1);
    assert.equal(Number(metadataCalls[0].url.split("/").at(-1)), PERSONAL_EMAIL);
    assert.equal(JSON.stringify(metadataCalls[0].body).includes("pat.new@example.com"), true);
    assert.deepEqual(changedFieldNames(logs), [`metadata.${PERSONAL_EMAIL}`]);
  });

  test(`[${side.id}][6.4] ${side.label}: a change to email alone does not touch field 138069`, async () => {
    const { container, cr } = setup();
    const record = side.linked(cr, {
      email: "work@example.com",
      personal_email: "pat.personal@example.com"
    });
    await side.run(record);

    record.properties.email = "work.new@example.com";
    const count = counters({ container, cr, record });
    const start = count.mark();
    assert.equal((await side.run(record)).status, "success");
    const done = count.since(start);

    assert.equal(personalEmailCalls(done.crCalls, METADATA_PUT).length, 0);
    assert.equal(personalEmailCalls(done.crCalls, METADATA_DELETE).length, 0);
  });

  test(`[${side.id}][6.4] ${side.label}: a blank personal_email clears the value the integration wrote before, like the other employee metadata fields`, async () => {
    const { container, cr } = setup();
    const record = side.linked(cr, { personal_email: "pat.personal@example.com" });
    await side.run(record);

    record.properties.personal_email = "";
    const count = counters({ container, cr, record });
    const start = count.mark();
    const result = await side.run(record);
    const done = count.since(start);

    assert.equal(result.status, "success");
    assert.equal(personalEmailCalls(done.crCalls, METADATA_DELETE).length, 1);
    assert.equal(personalEmailCalls(done.crCalls, METADATA_PUT).length, 0);
  });

  test(`[${side.id}][6.4] ${side.label}: a blank personal_email with no saved copy sends no value and no clear for 138069`, async () => {
    const { container, cr } = setup();
    const record = side.linked(cr, { email: "work@example.com", personal_email: null });
    const count = counters({ container, cr, record });
    const start = count.mark();

    const result = await side.run(record);
    const done = count.since(start);

    assert.equal(result.status, "success");
    assert.equal(personalEmailCalls(done.crCalls, METADATA_PUT).length, 0);
    assert.equal(personalEmailCalls(done.crCalls, METADATA_DELETE).length, 0);
  });

  test(`[${side.id}][6.4] ${side.label}: a badly formed personal_email ends as error with no CentralReach call`, async () => {
    const { container, cr } = setup();
    const record = side.linked(cr, { personal_email: "pat.personal@example.com" });
    await side.run(record);

    record.properties.personal_email = "pat-at-home";
    const count = counters({ container, cr, record });
    const start = count.mark();
    const result = await side.run(record);
    const done = count.since(start);

    assert.equal(result.status, "error");
    assert.deepEqual(done.crCalls, []);
    assert.equal(record.properties.last_sync_error, "Unreadable value: personal_email");
  });

  test(`[${side.id}][6.4] ${side.label}: an answer without the personal_email key is a failed read: error, no CentralReach call, no clear`, async () => {
    const { container, cr } = setup();
    const record = side.linked(cr, { personal_email: "pat.personal@example.com" });
    await side.run(record);

    const reader = async (id, type, names) => {
      const answer = hubspotAnswer(record.read(), names);
      delete answer.properties.personal_email;
      return answer;
    };
    const count = counters({ container, cr, record });
    const start = count.mark();
    const result = await side.run(record, { extra: { [side.readerName]: reader } });
    const done = count.since(start);

    assert.equal(result.status, "error");
    assert.deepEqual(done.crCalls, []);
    assert.equal(record.properties.last_sync_error, "Missing from the HubSpot answer: personal_email");
  });
}

test("[B9][6.4] the BCBA worker requests and maps personal_email and email once each; the BT/RBT does too (T9, T2)", () => {
  for (const type of [HUBSPOT_EMPLOYEE_TYPES.BCBA, HUBSPOT_EMPLOYEE_TYPES.BT_RBT]) {
    for (const name of ["email", "personal_email"]) {
      assert.equal(employeeMappedProperties(type).includes(name), true, `${type} maps ${name}`);
      assert.equal(
        employeeRequestProperties(type).filter((requested) => requested === name).length,
        1,
        `${type} requests ${name} once`
      );
    }
  }
});

test("[T9][6.4] the expected workflow triggers (check-triggers --expected, row 7.2) list personal_email for the BCBA and the BT/RBT", () => {
  const expected = expectedTriggerProperties();
  assert.equal(expected.bcba.includes("personal_email"), true, "BCBA");
  assert.equal(expected.btRbt.includes("personal_email"), true, "BT/RBT");
});

test("[B9][6.4] the portal table holds no BCBA → Contact association type any more", () => {
  for (const portalId of [SANDBOX_PORTAL, PRODUCTION_PORTAL]) {
    assert.equal(Object.hasOwn(hubspotPortalSettings(portalId), "bcbaContactAssociationTypeId"), false);
  }
});

test("[B9][6.4] a new BCBA is created with personal_email in 138069 and email as primaryEmail (decisions 49 and 50)", async () => {
  const { container, cr } = setup();
  const record = stage3Bcba({
    employee_id: "",
    email: "pat.work@example.com",
    personal_email: "pat.personal@example.com"
  });
  const count = counters({ container, cr, record });
  const start = count.mark();

  const result = await runBcba(record);
  const done = count.since(start);

  assert.equal(result.operation, "create");
  const puts = personalEmailCalls(done.crCalls, METADATA_PUT);
  assert.equal(puts.length, 1);
  assert.equal(JSON.stringify(puts[0].body).includes("pat.personal@example.com"), true);
  const post = done.crCalls.find((call) => call.name === "POST /contacts/employee");
  assert.equal(post.body.primaryEmail, "pat.work@example.com");
});
