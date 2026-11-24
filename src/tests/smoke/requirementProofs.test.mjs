// Row 3.19 (BUILD-PLAN.md section 11): proof tests for the section 9 requirements that no
// earlier test proves. Each title starts with the requirement ID, then the plan row that built it.
// Each test is written from the section 9 row and its stored values, and calls the real mapper or
// worker. Only HubSpot is faked, as in the Stage 3 worker tests. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { buildClientPayload } from "../../mappings/client/buildClientPayload.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { WAITING_FOR_WORKDAY_ID } from "../../constants/syncReasons.mjs";
import { employeeSyncEligibility } from "../../lib/syncEligibility.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  clientWorkflowDeps,
  employeeWorkflowDeps
} from "./stage2Fakes.mjs";
import {
  BT_LINK,
  METADATA_PUT,
  linkedBcba,
  linkedBt,
  linkedCase,
  seedEmployee,
  setup,
  stage3Bcba,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";

const CASE_ID = "deal-1";
const DEFAULT_CONTACT_FORM = "Public Client Intake Form";

function mapCase(properties, extra = {}) {
  return buildClientPayload({
    deal: { id: CASE_ID, properties: { hs_object_id: CASE_ID, ...properties } },
    ...extra
  });
}

function withEnvironment(name, value, run) {
  const before = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    return run();
  } finally {
    if (before === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = before;
    }
  }
}

function runCase(record, input = {}) {
  return runClientSyncWorkflow(
    { dealId: CASE_ID, source: "hubspotWorkflow", ...input },
    clientWorkflowDeps({ record })
  );
}

function runBt(record, input = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt", source: "hubspotWorkflow", ...input },
    employeeWorkflowDeps({ record })
  );
}

function runBcba(record, input = {}) {
  return runEmployeeSyncWorkflow(
    { recordId: "HS2", employeeType: "bcba", source: "hubspotWorkflow", ...input },
    employeeWorkflowDeps({ record })
  );
}

// --- BR7: test_record = true is skipped in normal processing (Case, BCBA, BT/RBT) ---

test("[BR7][1] a Case with test_record = true is skipped, linked or not, with no CentralReach call", async () => {
  for (const clientId of ["", "2001"]) {
    const { cr } = setup();
    const record = stage3Case({ client_id_number: clientId, test_record: "true" });
    const result = await runCase(record);
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "test_record");
    assert.equal(cr.calls.length, 0);
    assert.equal(record.writes.length, 0);
  }
});

test("[BR7][1] a BCBA with test_record = true is skipped, linked or not, with no CentralReach call", async () => {
  for (const employeeId of ["", "5002"]) {
    const { cr } = setup();
    const record = stage3Bcba({ employee_id: employeeId, test_record: "true" });
    const result = await runBcba(record);
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "test_record");
    assert.equal(cr.calls.length, 0);
    assert.equal(record.writes.length, 0);
  }
});

test("[BR7][1] a BT/RBT with test_record = true is skipped, linked or not, with no CentralReach call", async () => {
  for (const employeeId of ["", "5001"]) {
    const { cr } = setup();
    const record = stage3Bt({ employee_id: employeeId, test_record: "true" });
    const result = await runBt(record);
    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "test_record");
    assert.equal(cr.calls.length, 0);
    assert.equal(record.writes.length, 0);
  }
});

test("[BR7][1] a blank or false test_record does not skip the record", async () => {
  for (const testRecord of ["", "false"]) {
    const { cr } = setup();
    const result = await runBt(linkedBt(cr, { test_record: testRecord }));
    assert.equal(result.status, "success");
  }
});

// --- BR12: the integration never deactivates anyone in CentralReach ---

for (const entered of ["Yes - Generic", "No- Made Inactive"]) {
  test(`[BR12][1] a linked BT/RBT in "${entered}" keeps getting field updates, and nothing deactivates them`, async () => {
    const { cr } = setup();
    const record = linkedBt(cr, { entered_in_centralreach: entered, first_name: "Alex" });
    assert.equal((await runBt(record)).status, "success");
    record.properties.first_name = "Alexander";
    const result = await runBt(record);

    assert.equal(result.status, "success");
    assert.equal(result.operation, "update");
    const puts = cr.calls.filter((call) => call.name === "PUT /contacts/employee/{id}");
    assert.equal(puts.length, 2);
    assert.equal(puts[1].body.firstName, "Alexander");
    // The only writes are the field update, the labels and the metadata fields. There is no
    // create, no delete of a contact and no active or inactive flag in any body.
    const allowed = new Set([
      "PUT /contacts/employee/{id}",
      "POST /contacts/{id}/labels",
      METADATA_PUT,
      "DELETE /contacts/{id}/metadata/{fieldId}"
    ]);
    for (const call of cr.writes()) {
      assert.equal(allowed.has(call.name), true, call.name);
      assert.equal(/inactive|deactivat|active/i.test(JSON.stringify(call.body ?? {})), false);
    }
    assert.equal(cr.count("POST /contacts/employee"), 0);
  });
}

// --- BR5 and BR12: every pipeline stage syncs; only the four Case Cleanup stages are skipped ---
// Stage IDs from the production read of 2026-11-24 (requirements-review-2026-11-24/
// prod-reads-output-2026-11-24.md); the sandbox BCBA and BT/RBT pipelines hold the same IDs.
const BCBA_STAGE_IDS = Object.freeze({
  Applied: "1275899417",
  Contacted: "1275899418",
  "Sent Application": "1275697157",
  "Hiring In Process": "1275697158",
  Hired: "1363901493",
  Paused: "1275697162",
  Disqualified: "1275697163",
  Resigned: "1344955696",
  Terminated: "1344955697",
  "Possibility (Apploi)": "1331112264",
  "Apploi from Link": "1467178927"
});
const BT_RBT_STAGE_IDS = Object.freeze({
  Applied: "1216616245",
  Contacted: "1216616246",
  "Sent Application": "1263122061",
  "Hiring In Process": "1263122062",
  Hired: "1275661880",
  Paused: "1216507227",
  Disqualified: "1263175081",
  Resigned: "1299798139",
  Terminated: "1299798140",
  "Apploi Possibility": "1331052049",
  "Apploi Responded": "1432363113",
  "Apploi Candidate": "1445425691",
  "Apploi from Link": "1466375189"
});

test("[BR5][1] every BCBA and BT/RBT pipeline stage is eligible, linked or unlinked with the entry property Yes", () => {
  for (const stageId of [...Object.values(BCBA_STAGE_IDS), ...Object.values(BT_RBT_STAGE_IDS)]) {
    for (const linked of [true, false]) {
      const decision = employeeSyncEligibility({
        properties: { hs_pipeline_stage: stageId, entered_in_centralreach: "Yes" },
        linked,
        hubspotHasCrId: linked
      });
      assert.deepEqual(decision, { eligible: true, reason: null }, `${stageId}, linked ${linked}`);
    }
  }
});

// The only CentralReach writes an employee update may make: no create, no contact delete, and no
// active or inactive value of its own in any body. BR16 (2026-11-24): the update PUT sends the
// read back, so it carries `isActive` exactly as the read held it (heldIsActive; absent when the
// read held none), never changed. Any other active or inactive text, or an isActive that differs
// from the read, fails.
function assertUpdateWritesOnly(cr, heldIsActive) {
  const allowed = new Set([
    "PUT /contacts/employee/{id}",
    "POST /contacts/{id}/labels",
    METADATA_PUT,
    "DELETE /contacts/{id}/metadata/{fieldId}"
  ]);
  for (const call of cr.writes()) {
    assert.equal(allowed.has(call.name), true, call.name);
    const body = { ...(call.body ?? {}) };
    if (call.name === "PUT /contacts/employee/{id}") {
      assert.equal(body.isActive, heldIsActive);
      delete body.isActive;
    }
    assert.equal(/inactive|deactivat|active/i.test(JSON.stringify(body)), false);
  }
  assert.equal(cr.count("POST /contacts/employee"), 0);
}

for (const [employeeType, stageName, stageId] of [
  ["bt_rbt", "Resigned", BT_RBT_STAGE_IDS.Resigned],
  ["bt_rbt", "Terminated", BT_RBT_STAGE_IDS.Terminated],
  ["bcba", "Paused", BCBA_STAGE_IDS.Paused],
  ["bcba", "Resigned", BCBA_STAGE_IDS.Resigned],
  ["bcba", "Terminated", BCBA_STAGE_IDS.Terminated]
]) {
  test(`[BR5][BR12][1] a linked ${employeeType} in the ${stageName} stage keeps getting field updates, and nothing deactivates them`, async () => {
    // Every live employee read holds isActive: active and inactive employees both keep theirs.
    for (const heldIsActive of [true, false]) {
      const { cr } = setup();
      const run = employeeType === "bcba" ? runBcba : runBt;
      const linked = employeeType === "bcba" ? linkedBcba : linkedBt;
      const record = linked(cr, { hs_pipeline_stage: stageId });
      const contactId = employeeType === "bcba" ? "5002" : "5001";
      cr.employees.get(contactId).isActive = heldIsActive;
      assert.equal((await run(record)).status, "success");
      record.properties.last_name = "Changed";
      const result = await run(record);

      assert.equal(result.status, "success");
      assert.equal(result.operation, "update");
      const puts = cr.calls.filter((call) => call.name === "PUT /contacts/employee/{id}");
      assert.equal(puts.length, 2);
      assert.equal(puts[1].body.lastName, "Changed");
      assertUpdateWritesOnly(cr, heldIsActive);
      assert.equal(cr.employees.get(contactId).isActive, heldIsActive);
    }
  });
}

// Client Pipeline stages that are not one of the four Cleanup exclusions (BR6).
for (const [stageName, stageId] of [
  ["Paused", "1344955718"],
  ["Discharged", "1315313037"],
  ["Disqualified", "1136629070"],
  ["Closed Lost", "closedlost"]
]) {
  test(`[BR5][BR6][1] a linked Case in the ${stageName} stage is not excluded and still gets its update`, async () => {
    const { cr } = setup();
    const record = linkedCase(cr, { dealstage: stageId });
    assert.equal((await runCase(record)).status, "success");
    record.properties.phi_last_name = "Rivera-Smith";
    const result = await runCase(record);

    assert.equal(result.status, "success");
    assert.equal(result.operation, "update");
    const puts = cr.calls.filter((call) => call.name === "PUT /contacts/client/{id}");
    assert.equal(puts.length, 2);
    assert.equal(puts[1].body.LastName, "Rivera-Smith");
  });
}

// --- BR10 with TL3: a waiting record still gets its label changes (LBL-075) ---

test("[BR10][TL3][BR19] a waiting BT/RBT (CentralReach holds the temporary ID) whose type changes from BT to RBT still gets one label POST: RBT NY replaces Behavior Technician NY, and the status stays waiting", async () => {
  const BT_NY = 1052630;
  const RBT_NY = 1052631;
  const { container, cr } = setup();
  seedEmployee(cr, "5001", "HS1");
  const record = stage3Bt({
    employee_id: "5001",
    workday_id: "",
    bt_rbt_type: "BT",
    location: "New York"
  });
  const runWaiting = () =>
    runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType: "bt_rbt", source: "hubspotWorkflow" },
      { ...employeeWorkflowDeps({ record }), labelReadBackDelayMs: 0 }
    );
  const first = await runWaiting();
  assert.equal(first.status, "waiting");
  assert.equal(cr.labels.get("5001").includes(BT_NY), true);

  // The edit comes later than the 150-second hold of the first POST (decision 59).
  const link = container.get(BT_LINK.pk, BT_LINK.id).data;
  link.lastLabelPost = { ...link.lastLabelPost, postedAt: new Date(Date.now() - 600_000).toISOString() };
  record.properties.bt_rbt_type = "RBT";
  const posts = cr.count("POST /contacts/{id}/labels");
  const second = await runWaiting();

  assert.equal(second.status, "waiting");
  assert.equal(record.properties.last_sync_error, WAITING_FOR_WORKDAY_ID);
  assert.equal(cr.count("POST /contacts/{id}/labels"), posts + 1);
  assert.equal(cr.labels.get("5001").includes(RBT_NY), true);
  assert.equal(cr.labels.get("5001").includes(BT_NY), false);
  assertUpdateWritesOnly(cr);
});

// --- C1 to C7: the Case core fields ---

test("[C1][old] the contact form is Public Client Intake Form, or the CR_CLIENT_CONTACT_FORM setting when it is set", () => {
  withEnvironment("CR_CLIENT_CONTACT_FORM", undefined, () => {
    assert.equal(mapCase({}).ContactForm, DEFAULT_CONTACT_FORM);
  });
  withEnvironment("CR_CLIENT_CONTACT_FORM", "Another Intake Form", () => {
    assert.equal(mapCase({}).ContactForm, "Another Intake Form");
  });
});

test("[C1][3.14] the contact form goes to CentralReach on a client create only", async () => {
  const { cr } = setup();
  const record = stage3Case({ phi_last_name: "Rivera" });
  const created = await runCase(record);
  assert.equal(created.operation, "create");
  const [post] = cr.calls.filter((call) => call.name === "POST /contacts/client");
  assert.equal(post.body.ContactForm, DEFAULT_CONTACT_FORM);

  record.properties.phi_last_name = "Rivera-Smith";
  const updated = await runCase(record);
  assert.equal(updated.operation, "update");
  const puts = cr.calls.filter((call) => call.name === "PUT /contacts/client/{id}");
  assert.equal(puts.length, 1);
  assert.equal(puts[0].body.LastName, "Rivera-Smith");
  assert.equal(Object.prototype.hasOwnProperty.call(puts[0].body, "ContactForm"), false);
});

test("[C2][1] the legal name is phi_first_name__cloned_ and phi_last_name, never dealname", () => {
  const payload = mapCase({
    dealname: "Wrong Deal Name",
    phi_first_name__cloned_: "  Alex ",
    phi_last_name: " Rivera  "
  });
  assert.equal(payload.FirstName, "Alex");
  assert.equal(payload.LastName, "Rivera");
  assert.equal(JSON.stringify(payload).includes("Wrong Deal Name"), false);

  const blank = mapCase({ dealname: "Wrong Deal Name" });
  assert.equal(blank.FirstName, null);
  assert.equal(blank.LastName, null);
});

test("[C4][old] phi_gender male and female map to Male and Female; blank sends no gender and any other value is unreadable (F-1)", () => {
  assert.equal(mapCase({ phi_gender: "male" }).Gender, "Male");
  assert.equal(mapCase({ phi_gender: "female" }).Gender, "Female");
  for (const blank of ["", undefined]) {
    assert.equal(mapCase({ phi_gender: blank }).Gender, null);
    assert.deepEqual(mapCase({ phi_gender: blank }).unreadableValueProperties, []);
  }
  for (const other of ["unknown", "nonbinary"]) {
    assert.equal(mapCase({ phi_gender: other }).Gender, null);
    assert.deepEqual(mapCase({ phi_gender: other }).unreadableValueProperties, ["phi_gender"]);
  }
});

test("[C5][3.14] the External System ID is the Case record ID on a create, and an update never sends a different value", async () => {
  assert.equal(mapCase({}).ExternalSystemId, CASE_ID);
  assert.equal(
    buildClientPayload({ deal: { properties: { hs_object_id: "555" } } }).ExternalSystemId,
    "555"
  );

  const { cr } = setup();
  const record = stage3Case();
  assert.equal((await runCase(record)).operation, "create");
  const [post] = cr.calls.filter((call) => call.name === "POST /contacts/client");
  assert.equal(post.body.ExternalSystemId, CASE_ID);

  record.properties.phi_last_name = "Rivera-Smith";
  assert.equal((await runCase(record)).operation, "update");
  const [put] = cr.calls.filter((call) => call.name === "PUT /contacts/client/{id}");
  // BR22: the update carries the ID only as the value CentralReach already holds.
  const sent = Object.prototype.hasOwnProperty.call(put.body, "ExternalSystemId")
    ? put.body.ExternalSystemId
    : CASE_ID;
  assert.equal(sent, CASE_ID);
});

test("[C6][old] the primary email is the Case email, trimmed and lower case, and only when it is valid; a filled invalid one is unreadable (F-1)", () => {
  assert.equal(mapCase({ email: "  Guardian@Example.COM " }).PrimaryEmail, "guardian@example.com");
  for (const blank of ["", "   ", undefined]) {
    assert.equal(mapCase({ email: blank }).PrimaryEmail, null);
    assert.deepEqual(mapCase({ email: blank }).unreadableValueProperties, []);
  }
  for (const invalid of ["not-an-email", "a@b", "two words@example.com"]) {
    assert.equal(mapCase({ email: invalid }).PrimaryEmail, null);
    assert.deepEqual(mapCase({ email: invalid }).unreadableValueProperties, ["email"]);
  }
});

test("[C7][old] the guardian name is guardian_first_name and guardian_last_name, and a blank sends none", () => {
  const payload = mapCase({ guardian_first_name: "Jordan", guardian_last_name: "Rivera" });
  assert.equal(payload.GuardianFirstName, "Jordan");
  assert.equal(payload.GuardianLastName, "Rivera");

  const blank = mapCase({ guardian_first_name: "", guardian_last_name: undefined });
  assert.equal(blank.GuardianFirstName, null);
  assert.equal(blank.GuardianLastName, null);
});

test("[C7][old] the Case worker sends the guardian name to CentralReach on a client update", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { guardian_first_name: "Jordan", guardian_last_name: "Rivera" });
  assert.equal((await runCase(record)).status, "success");
  const [put] = cr.calls.filter((call) => call.name === "PUT /contacts/client/{id}");
  assert.equal(put.body.GuardianFirstName, "Jordan");
  assert.equal(put.body.GuardianLastName, "Rivera");
});

// --- B12 and T8: the HubSpot record link, metadata 138703, from the record ID ---

const EMPLOYEE_LINK_FIELD = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BCBA_RECORD;
const MAPPER_CONFIG = {
  hubspot: { hubspotPortalId: "52311591", bcbaObjectTypeId: "2-72890322", btRbtObjectTypeId: "2-72890325" }
};

function linkPutBody(cr) {
  const call = cr.calls.find(
    (item) => item.name === METADATA_PUT && item.url.endsWith(`/${EMPLOYEE_LINK_FIELD}`)
  );
  return call?.body?.inputValue ?? call?.body?.textAreaValue;
}

test("[B12][old] a BCBA gets the HubSpot record link in metadata 138703: portal, BCBA object type and the record ID", async () => {
  assert.equal(EMPLOYEE_LINK_FIELD, 138703);
  const mapped = buildEmployeePayload({
    employeeType: "bcba",
    config: MAPPER_CONFIG,
    record: { id: "42", properties: { hs_object_id: "42" } }
  });
  assert.equal(
    mapped.metadataValues[138703],
    "https://app.hubspot.com/contacts/52311591/record/2-72890322/42"
  );

  const { cr } = setup();
  assert.equal((await runBcba(linkedBcba(cr))).status, "success");
  assert.equal(linkPutBody(cr), `https://app.hubspot.com/contacts/${SANDBOX_PORTAL}/record/2-72890322/HS2`);
});

test("[T8][old] a BT/RBT gets the HubSpot record link in metadata 138703: portal, BT/RBT object type and the record ID", async () => {
  assert.equal(CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD, 138703);
  const mapped = buildEmployeePayload({
    employeeType: "bt_rbt",
    config: MAPPER_CONFIG,
    record: { id: "43", properties: { hs_object_id: "43" } }
  });
  assert.equal(
    mapped.metadataValues[138703],
    "https://app.hubspot.com/contacts/52311591/record/2-72890325/43"
  );

  const { cr } = setup();
  assert.equal((await runBt(linkedBt(cr))).status, "success");
  assert.equal(linkPutBody(cr), `https://app.hubspot.com/contacts/${SANDBOX_PORTAL}/record/2-72890325/HS1`);
});
