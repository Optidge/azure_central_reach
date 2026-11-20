// Stage P, row P.5 (BUILD-PLAN.md section 10): the contracts the lanes of Stages 3 to 6 share.
// The contracts are written as comments marked "CONTRACT P.5 (a)" to "(g)" in the source files.
// These tests prove two things: the contract's names exist, and behaviour has not changed (with
// an empty managed list the label sender is today's add-only sender).
// Unless a test says it fakes the mapper, the mapper, validator, hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_CLIENT_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import {
  createOrUpdateClient,
  createOrUpdateEmployee,
  getEmployeeContactForm,
  updateClientMetadata
} from "../../lib/centralReachClient.mjs";
import { useStateContainer } from "../../lib/cosmosState.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  btRecord,
  caseRecord,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  fakeCentralReach,
  memoryContainer,
  workflowConfig
} from "./stage2Fakes.mjs";

const LABELS_POST = "POST /contacts/{id}/labels";
const MAPPER_CONFIG = {
  hubspot: {
    hubspotPortalId: SANDBOX_PORTAL,
    btRbtObjectTypeId: "2-72890325",
    bcbaObjectTypeId: "2-72890322"
  }
};

function setup() {
  const container = memoryContainer();
  useStateContainer(container);
  const cr = fakeCentralReach();
  return { container, cr };
}

function mapEmployee(employeeType, properties) {
  return buildEmployeePayload({
    record: { id: "HS1", properties: { hs_object_id: "HS1", ...properties } },
    employeeType,
    config: MAPPER_CONFIG
  });
}

const CASE_DEAL = {
  id: "deal-1",
  properties: {
    hs_object_id: "deal-1",
    location: "New York",
    allergies: "Peanuts",
    current_primary_bt: "Pat Doe",
    initial_assessment_bcba: "Lee Roe"
  }
};

// --- (a) every mapper returns requiredLabelIds and managedLabelIds ---

test("[P.5a] the employee mapper returns requiredLabelIds and an empty managedLabelIds", () => {
  const bt = mapEmployee(HUBSPOT_EMPLOYEE_TYPES.BT_RBT, { location_home: "New York", bt_rbt_type: "BT" });
  const bcba = mapEmployee(HUBSPOT_EMPLOYEE_TYPES.BCBA, { home_state: "New York" });
  for (const mapped of [bt, bcba]) {
    assert.equal(Array.isArray(mapped.requiredLabelIds), true);
    assert.equal(mapped.requiredLabelIds.length > 0, true);
    assert.deepEqual(mapped.managedLabelIds, []);
  }
});

test("[P.5a] the Case metadata mapper returns requiredLabelIds and an empty managedLabelIds; labelIds stays the same list", () => {
  const mapped = buildClientMetadata({ deal: CASE_DEAL, portalId: SANDBOX_PORTAL });
  assert.deepEqual(mapped.requiredLabelIds, [1052619, 1082499]);
  assert.deepEqual(mapped.labelIds, mapped.requiredLabelIds);
  assert.deepEqual(mapped.managedLabelIds, []);
});

// --- (b) and (c) inputs of the Case metadata mapper ---

test("[P.5b] the Case metadata mapper accepts staffNames and ownerName; until rows 4.14 and 4.16 use them it maps as before", () => {
  // Lane C replaces this test when it builds rows 4.14 and 4.16.
  const before = buildClientMetadata({ deal: CASE_DEAL, portalId: SANDBOX_PORTAL });
  const withInputs = buildClientMetadata({
    deal: CASE_DEAL,
    portalId: SANDBOX_PORTAL,
    staffNames: {
      initialAssessmentBcba: [{ recordId: "11", firstName: "Lee", lastName: "Roe" }],
      reEvaluationBcba: [],
      primaryBt1: [{ recordId: "21", firstName: "Pat", lastName: "Doe" }],
      primaryBt2: []
    },
    ownerName: "Care Coordinator",
    omitFieldIds: []
  });
  assert.deepEqual(withInputs, before);
});

test("[P.5c][BR16] a Case metadata field named in omitFieldIds is left out of the mapper's answer", () => {
  const { ALLERGIES, BT_2_NAME, BT_1_NAME } = CENTRAL_REACH_CLIENT_METADATA_FIELDS;
  const all = buildClientMetadata({ deal: CASE_DEAL, portalId: SANDBOX_PORTAL }).metadataValues;
  const omitted = buildClientMetadata({
    deal: CASE_DEAL,
    portalId: SANDBOX_PORTAL,
    omitFieldIds: [BT_1_NAME, String(BT_2_NAME)]
  }).metadataValues;

  // A filled field and a blank field: both keys are gone, so neither is compared, sent or cleared.
  assert.equal(Object.prototype.hasOwnProperty.call(all, BT_1_NAME), true);
  assert.equal(Object.prototype.hasOwnProperty.call(all, BT_2_NAME), true);
  assert.equal(Object.prototype.hasOwnProperty.call(omitted, BT_1_NAME), false);
  assert.equal(Object.prototype.hasOwnProperty.call(omitted, BT_2_NAME), false);
  // Every other key is as before; a blank that was read stays a blank.
  assert.equal(omitted[ALLERGIES], "Peanuts");
  assert.equal(Object.keys(omitted).length, Object.keys(all).length - 2);
});

test("[P.5c][BR16] employee: a field in the worker's omit list is not sent, although it is a known field", async () => {
  // The mapper is faked here to raise the one warning that fills the omit list today.
  setup();
  const sent = [];
  const record = btRecord({ employee_id: "CR1" });
  await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    {
      ...employeeWorkflowDeps({ record }),
      buildEmployeePayload: () => ({
        employeePayload: { externalSystemId: "WD1", firstName: "Alex", lastName: "Rivera" },
        metadataValues: {},
        requiredLabelIds: [],
        warnings: [{ code: "missing_hubspot_portal_id" }]
      }),
      getEmployeeByContactId: async () => ({ contact: { contactId: "CR1", externalSystemId: "WD1" } }),
      createOrUpdateEmployee: async () => ({ operation: "update", crContactId: "CR1" }),
      updateClientMetadata: async (contactId, values, options) => {
        sent.push({ values, options });
        return { updatedCount: 0, failedCount: 0, failedFieldIds: [] };
      }
    }
  );
  assert.equal(sent.length, 1);
  // Work Address (133819) is a known field the mapper left out: it is sent as blank.
  assert.equal(Object.prototype.hasOwnProperty.call(sent[0].values, "133819"), true);
  // The record link (138703) is in the omit list: its key is not sent at all.
  assert.equal(Object.prototype.hasOwnProperty.call(sent[0].values, "138703"), false);
  assert.deepEqual(sent[0].options.clearFieldIds, []);
});

// --- (d) workStates and the contact form ---

test("[P.5d] the employee mapper returns workStates as a list", () => {
  const bt = mapEmployee(HUBSPOT_EMPLOYEE_TYPES.BT_RBT, { location_home: "New York", bt_rbt_type: "BT" });
  const bcba = mapEmployee(HUBSPOT_EMPLOYEE_TYPES.BCBA, { home_state: "New York" });
  assert.equal(Array.isArray(bt.workStates), true);
  assert.equal(Array.isArray(bcba.workStates), true);
});

test("[P.5d] getEmployeeContactForm takes the employee type and the work states", () => {
  const { BT_RBT, BCBA } = HUBSPOT_EMPLOYEE_TYPES;
  // These answers are the same before and after row 5.13.
  assert.equal(getEmployeeContactForm(BT_RBT, []), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT, ["NY"]), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT, ["CO", "NY"]), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT, ["NJ"]), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BCBA, ["CO"]), "Admin");
  assert.equal(getEmployeeContactForm(BCBA), "Admin");
});

test("[P.5d] createOrUpdateEmployee takes workStates for the contact form and never sends it to CentralReach", async () => {
  const cr = fakeCentralReach();
  const result = await createOrUpdateEmployee({
    payload: { externalSystemId: "WD9", firstName: "Alex", lastName: "Rivera", dateOfBirth: "1990-10-20" },
    employeeType: HUBSPOT_EMPLOYEE_TYPES.BT_RBT,
    workStates: ["NY"],
    existingContactId: null,
    allowEmployeeCreate: true,
    putOnlyMode: false
  });
  assert.equal(result.operation, "create");
  const post = cr.calls.find((call) => call.name === "POST /contacts/employee");
  assert.equal(post.body.ContactForm, "Behavior Technician NY");
  assert.equal(Object.prototype.hasOwnProperty.call(post.body, "workStates"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(post.body, "employeeType"), false);
});

test("[P.5d] the employee worker passes the mapper's workStates to the create call", async () => {
  // The mapper is faked here so that workStates holds a value before row 5.13 fills it.
  setup();
  const creates = [];
  const record = btRecord();
  await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    {
      ...employeeWorkflowDeps({ record }),
      buildEmployeePayload: () => ({
        employeePayload: {
          externalSystemId: "WD1",
          firstName: "Alex",
          lastName: "Rivera",
          primaryEmail: "alex@example.com",
          dateOfBirth: "1990-10-20"
        },
        metadataValues: {},
        requiredLabelIds: [],
        managedLabelIds: [],
        workStates: ["CO"],
        warnings: [],
        dateOfBirthStatus: "date"
      }),
      findEmployeeByExternalSystemId: async () => ({ found: false, crContactId: null }),
      createOrUpdateEmployee: async (input) => {
        creates.push(input);
        return { operation: "create", crContactId: "9001" };
      },
      updateClientMetadata: async () => ({ updatedCount: 0, failedCount: 0, failedFieldIds: [] })
    }
  );
  assert.equal(creates.length, 1);
  assert.equal(creates[0].existingContactId, null);
  assert.deepEqual(creates[0].workStates, ["CO"]);
});

// --- (e) the label sender ---

test("[P.5e][BR19] with an empty managed list the label sender adds what is missing and keeps every label CentralReach holds", async () => {
  const cr = fakeCentralReach();
  cr.labels.set("2001", [777, 1052619]);
  const summary = await updateClientMetadata(
    "2001",
    {},
    {
      labelIds: [1052619, 1082499],
      managedLabelIds: [],
      lastLabelPost: null,
      contactCreatedThisRun: false
    }
  );
  assert.equal(summary.labelResult.operation, "updated");
  assert.equal(cr.count(LABELS_POST), 1);
  assert.deepEqual([...cr.labels.get("2001")].sort(), [1052619, 1082499, 777].sort());
});

test("[P.5e][BR19] with an empty managed list and nothing missing, the label sender posts nothing", async () => {
  const cr = fakeCentralReach();
  cr.labels.set("2001", [777, 1052619, 1082499]);
  const summary = await updateClientMetadata(
    "2001",
    {},
    { labelIds: [1052619, 1082499], managedLabelIds: [], lastLabelPost: null }
  );
  assert.equal(summary.labelResult.operation, "skip_present");
  assert.equal(cr.count(LABELS_POST), 0);
});

test("[P.5a][P.5e] the Case worker passes the mapper's required and managed lists, the last label POST and the create flag to the label sender", async () => {
  // The mapper and the sender are faked here: the test is about what is passed between them.
  const { container } = setup();
  const lastLabelPost = { labelIds: [1052619], postedAt: "2026-11-20T10:00:00.000Z" };
  container.items.upsert({
    id: `${SANDBOX_PORTAL}:deal-1`,
    pk: "sync:client",
    type: "link",
    ttl: -1,
    data: { crContactId: "2001", lastLabelPost }
  });
  const sent = [];
  const record = caseRecord({ client_id_number: "2001" });
  await runClientSyncWorkflow(
    { dealId: "deal-1" },
    {
      ...clientWorkflowDeps({ record }),
      buildClientMetadata: () => ({
        requiredLabelIds: [1052619, 1082499],
        managedLabelIds: [1082499, 1132648],
        metadataValues: { 126214: "Peanuts" }
      }),
      updateClientMetadata: async (contactId, values, options) => {
        sent.push(options);
        return { updatedCount: 1, failedCount: 0, failedFieldIds: [] };
      }
    }
  );
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].labelIds, [1052619, 1082499]);
  assert.deepEqual(sent[0].managedLabelIds, [1082499, 1132648]);
  assert.deepEqual(sent[0].lastLabelPost, lastLabelPost);
  assert.equal(sent[0].contactCreatedThisRun, false);
});

test("[P.5a][P.5e] the employee worker passes the mapper's required and managed lists, the last label POST and the create flag to the label sender", async () => {
  // The sender is faked here: the test is about what the worker passes to it.
  setup();
  const sent = [];
  const record = btRecord({ location_home: "New York", bt_rbt_type: "BT" });
  const result = await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    {
      ...employeeWorkflowDeps({ record }),
      updateClientMetadata: async (contactId, values, options) => {
        sent.push(options);
        return { updatedCount: 1, failedCount: 0, failedFieldIds: [] };
      }
    }
  );
  assert.equal(result.operation, "create");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].labelIds, [1052618, 1052630, 1052643, 1132655]);
  assert.deepEqual(sent[0].managedLabelIds, []);
  assert.equal(sent[0].lastLabelPost, null);
  assert.equal(sent[0].contactCreatedThisRun, true);
});

test("[P.5e][BR19] real path, Case: a label staff added by hand is kept and the required labels are added", async () => {
  const { cr } = setup();
  cr.clients.set("2001", { contactId: "2001", externalSystemId: "deal-1", primaryEmail: null });
  cr.labels.set("2001", [777]);
  const record = caseRecord({ client_id_number: "2001", location: "New York" });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, clientWorkflowDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(cr.count(LABELS_POST), 1);
  assert.deepEqual([...cr.labels.get("2001")].sort(), [1052619, 1082499, 777].sort());
});

test("[P.5e][BR19] real path, BT/RBT: a label staff added by hand is kept and the required labels are added", async () => {
  const { cr } = setup();
  cr.employees.set("CR1", { contactId: "CR1", externalSystemId: "WD1", primaryEmail: "stored@example.com" });
  cr.labels.set("CR1", [777]);
  const record = btRecord({ employee_id: "CR1", location_home: "New York", bt_rbt_type: "BT" });
  const result = await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    employeeWorkflowDeps({ record })
  );

  assert.equal(result.status, "success");
  assert.equal(cr.count(LABELS_POST), 1);
  assert.deepEqual(
    [...cr.labels.get("CR1")].sort(),
    [1052618, 1052630, 1052643, 1132655, 777].sort()
  );
});

// --- (f) createOrUpdateClient keeps its signature ---

test("[P.5f] createOrUpdateClient takes { payload, existingContactId } and answers { operation, crContactId }", async () => {
  const payload = { ExternalSystemId: "deal-1", FirstName: "Alex", LastName: "Rivera" };

  const cr = fakeCentralReach();
  const updated = await createOrUpdateClient({ payload, existingContactId: "2001" });
  assert.deepEqual(updated, { operation: "update", crContactId: "2001" });
  assert.equal(cr.count("PUT /contacts/client/{id}"), 1);
  assert.equal(cr.count("POST /contacts/client"), 0);

  const crForCreate = fakeCentralReach();
  const created = await createOrUpdateClient({ payload, existingContactId: null });
  assert.equal(created.operation, "create");
  assert.equal(typeof created.crContactId, "string");
  assert.equal(crForCreate.count("POST /contacts/client"), 1);
});

// --- (g) error codes of the label sender ---

test("[P.5g] retry.mjs sorts the label sender's error codes", () => {
  const kindOf = (code) => {
    const error = new Error(code);
    error.code = code;
    return classifyFailure(error);
  };
  // Temporary: retried on the normal schedule, then "Retries used up".
  assert.equal(kindOf("CR_LABEL_NOT_IN_CATALOG"), FAILURE_KINDS.TEMPORARY);
  assert.equal(kindOf("CR_LABEL_READ_EMPTY"), FAILURE_KINDS.TEMPORARY);
  assert.equal(kindOf("CR_LABEL_POST_UNCONFIRMED"), FAILURE_KINDS.TEMPORARY);
  // Permanent: `error` on the record, no retry.
  assert.equal(kindOf("CR_LABEL_NOT_SENDABLE"), FAILURE_KINDS.PERMANENT);
  assert.equal(kindOf("CR_LABEL_CATALOG_UNREADABLE"), FAILURE_KINDS.PERMANENT);
  // Unchanged.
  assert.equal(kindOf("CR_LABEL_READ_FAILED"), FAILURE_KINDS.PERMANENT);
  assert.equal(kindOf("CR_LOOKUP_UNKNOWN"), FAILURE_KINDS.TEMPORARY);
  assert.equal(kindOf("CR_LOOKUP_UNREADABLE"), FAILURE_KINDS.PERMANENT);
});
