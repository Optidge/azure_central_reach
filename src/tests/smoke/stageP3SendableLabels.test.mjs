// Stage P, row P.3 (BUILD-PLAN.md section 10; BR19, rule 5.6).
// src/constants/centralReach.mjs exports one explicit list of the label IDs a mapper may send.
// The expected IDs below are copied from BUILD-PLAN section 9 (CL1 to CL6, BL1 to BL8, B10,
// TL1 to TL4). No live call.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CENTRAL_REACH_CLIENT_LABELS,
  CENTRAL_REACH_CLIENT_STAFFING_LABELS,
  CENTRAL_REACH_EMPLOYEE_LABELS,
  CENTRAL_REACH_METADATA_FIELD_TYPES,
  CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS,
  CENTRAL_REACH_SENDABLE_LABEL_IDS,
  CENTRAL_REACH_STAFFING_STATUS_PARENT_LABEL_ID
} from "../../constants/centralReach.mjs";
import { updateClientMetadata } from "../../lib/centralReachClient.mjs";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { fakeCentralReach } from "./stage2Fakes.mjs";

const SECTION_9_SENDABLE = {
  // Client
  "All Clients (CL6, base)": 1052619,
  "CO Client (CL1)": 1132648,
  "NJ Client (CL1)": 1132647,
  "NY Client (CL1)": 1082499,
  "Home (CL2)": 1052656,
  "Active Client (CL3)": 1125427,
  "In-Active Client (CL3)": 1121488,
  "97151 Services (CL4)": 1156743,
  "Staffed 97153 (CL4)": 1156746,
  "X 97153 (CL4)": 1156747,
  // BCBA and BT/RBT
  "All Employees (BL8, TL4, base)": 1052618,
  "Clinical (BL8, TL4, base)": 1052643,
  "BCBA header (BL1, base)": 1130668,
  "CO Employee (BL2, TL1)": 1107687,
  "NJ Employee (BL2, TL1)": 1107686,
  "NY Employee (BL2, TL1)": 1132655,
  "NM Employee (BL3, TL2)": 1157030,
  "VA Employee (BL3, TL2)": 1157031,
  "BCBA Colorado (BL4)": 1124246,
  "BCBA LBA NJ (BL4)": 1124245,
  "BCBA LBA NY (BL4)": 1052629,
  "GRAD Student- LBA NY (BL4)": 1092164,
  "NY Medicaid (BL5)": 1107647,
  "Aetna (BL6)": 1107649,
  "Cigna (BL6)": 1107650,
  "Carelon (BL6)": 1132654,
  "CO Medicaid (BL6)": 1107651,
  "Salaried (B10, row 5.7)": 1132653,
  "Billing Hold Medicaid Affiliation (BL7)": 1103437,
  "Behavior Technician NY (TL3)": 1052630,
  "Behavior Technician NJ (TL3)": 1132652,
  "Behavior Technician CO (TL3)": 1132650,
  "RBT NY (TL3)": 1052631,
  "RBT NJ (TL3)": 1132651,
  "RBT CO (TL3)": 1107692
};
const PARENT_STAFFING_STATUS = 1156741;
const RETIRED_STAFFING = [1156742, 1156744, 1156745];
// [G07C] Case funding-source labels (group "Funding Source"): suspended, never sent (CL5).
const FUNDING_SOURCE = [1082497, 1082498, 1124249, 1107648, 1052532, 1124247, 1124248];

const byNumber = (values) => [...values].sort((left, right) => left - right);

test("[P.3][BR19] the sendable list holds every base and managed label of section 9, and nothing else", () => {
  for (const [name, id] of Object.entries(SECTION_9_SENDABLE)) {
    assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), true, `${name} ${id} is sendable`);
  }
  assert.deepEqual(
    byNumber(CENTRAL_REACH_SENDABLE_LABEL_IDS),
    byNumber(Object.values(SECTION_9_SENDABLE))
  );
});

test("[P.3] the sendable list holds plain numbers and no ID twice", () => {
  for (const id of CENTRAL_REACH_SENDABLE_LABEL_IDS) {
    assert.equal(Number.isInteger(id) && id > 0, true);
  }
  assert.equal(
    new Set(CENTRAL_REACH_SENDABLE_LABEL_IDS).size,
    CENTRAL_REACH_SENDABLE_LABEL_IDS.length
  );
});

test("[P.3] the sendable list holds the New Mexico and Virginia Employee constants", () => {
  assert.equal(CENTRAL_REACH_EMPLOYEE_LABELS.NM_EMPLOYEE, 1157030);
  assert.equal(CENTRAL_REACH_EMPLOYEE_LABELS.VA_EMPLOYEE, 1157031);
  assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(1157030), true);
  assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(1157031), true);
});

test("[P.3] the sendable list leaves out the parent label Staffing Status and the three retired staffing labels", () => {
  assert.equal(CENTRAL_REACH_STAFFING_STATUS_PARENT_LABEL_ID, PARENT_STAFFING_STATUS);
  for (const id of [PARENT_STAFFING_STATUS, ...RETIRED_STAFFING]) {
    assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), false, `${id} is never sent`);
  }
});

test("[P.3][BL6] the BCBA credential labels are the New Employee On-boarding ones; no Funding Source label is sendable", () => {
  for (const id of [1107647, 1107649, 1107650, 1132654, 1107651]) {
    assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), true, `${id} is sendable`);
  }
  for (const id of FUNDING_SOURCE) {
    assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), false, `${id} is not sendable`);
  }
});

test("[P.3][CL4] CENTRAL_REACH_CLIENT_STAFFING_LABELS holds only the three staffing labels", () => {
  assert.deepEqual(CENTRAL_REACH_CLIENT_STAFFING_LABELS, {
    "97151 Services": 1156743,
    "Staffed 97153": 1156746,
    "X 97153": 1156747
  });
});

test("[P.3][CL4] the three retired staffing IDs are in the remove-only list, and only there", () => {
  assert.deepEqual(byNumber(CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS), RETIRED_STAFFING);
  const namedConstants = [
    ...Object.values(CENTRAL_REACH_CLIENT_LABELS),
    ...Object.values(CENTRAL_REACH_EMPLOYEE_LABELS),
    ...Object.values(CENTRAL_REACH_CLIENT_STAFFING_LABELS)
  ];
  for (const id of RETIRED_STAFFING) {
    assert.equal(namedConstants.includes(id), false, `${id} is not a label a mapper can name`);
  }
});

test("[P.3] every label constant a mapper can name is in the sendable list", () => {
  const namedConstants = [
    ...Object.values(CENTRAL_REACH_CLIENT_LABELS),
    ...Object.values(CENTRAL_REACH_EMPLOYEE_LABELS),
    ...Object.values(CENTRAL_REACH_CLIENT_STAFFING_LABELS)
  ];
  for (const id of namedConstants) {
    assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), true, `${id} is sendable`);
  }
});

// Changed in Stage 5 (rows 5.4 and 5.11): the employee Work State is read from `location`.
test("[BR19][P.3] every label today's mappers return is in the sendable list", () => {
  const config = {
    hubspot: {
      hubspotPortalId: "52311591",
      btRbtObjectTypeId: "2-72890325",
      bcbaObjectTypeId: "2-72890322"
    }
  };
  const returned = [];
  for (const location of ["New York", "Colorado", "New Jersey", ""]) {
    returned.push(
      ...buildClientMetadata({ deal: { properties: { hs_object_id: "1", location } }, portalId: "52311591" })
        .requiredLabelIds
    );
    for (const btRbtType of ["BT", "RBT", ""]) {
      returned.push(
        ...buildEmployeePayload({
          record: { id: "1", properties: { hs_object_id: "1", location, bt_rbt_type: btRbtType } },
          employeeType: "bt_rbt",
          config
        }).requiredLabelIds
      );
    }
    returned.push(
      ...buildEmployeePayload({
        record: { id: "1", properties: { hs_object_id: "1", location } },
        employeeType: "bcba",
        config
      }).requiredLabelIds
    );
  }
  assert.equal(returned.length > 0, true);
  for (const id of returned) {
    assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), true, `${id} is sendable`);
  }
});

test("[P.3] field 137697 is registered as a TextArea and every other registered field stays an Input", () => {
  assert.equal(CENTRAL_REACH_METADATA_FIELD_TYPES[137697], "TextArea");
  for (const [fieldId, type] of Object.entries(CENTRAL_REACH_METADATA_FIELD_TYPES)) {
    if (Number(fieldId) !== 137697) {
      assert.equal(type, "Input", `field ${fieldId}`);
    }
  }
});

test("[P.3] a value for field 137697 is sent to CentralReach as a textarea value", async () => {
  const cr = fakeCentralReach();
  const summary = await updateClientMetadata("2001", { 137697: "1 Main St", 126214: "Peanuts" }, {});

  assert.equal(summary.failedCount, 0);
  const bodyFor = (fieldId) =>
    cr.calls.find((call) => call.method === "PUT" && call.url.endsWith(`/metadata/${fieldId}`)).body;
  assert.deepEqual(bodyFor(137697), { textAreaValue: "1 Main St" });
  assert.deepEqual(bodyFor(126214), { inputValue: "Peanuts" });
});
