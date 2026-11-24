// Stage 5 (BUILD-PLAN.md section 12): BCBA and BT/RBT -> CentralReach employee.
// Each test names the section 9 requirement it proves, then the plan row. The inputs are the
// HubSpot stored values of the guide (guide-extract-2026-11-20.md: [GER-BCBA], [GER-BT], sections
// 5, 6, 8 and 9, [G19] and the appendix). The label IDs are copied from BUILD-PLAN section 9.
// The real mapper is called with plain records. Nothing is faked and nothing is sent.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CENTRAL_REACH_EMPLOYEE_LABELS,
  CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS,
  CENTRAL_REACH_SENDABLE_LABEL_IDS
} from "../../constants/centralReach.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";

const CONFIG = {
  hubspot: {
    hubspotPortalId: "52311591",
    btRbtObjectTypeId: "2-72890325",
    bcbaObjectTypeId: "2-72890322"
  }
};

const ALL_EMPLOYEES = 1052618;
const CLINICAL = 1052643;
const BCBA_HEADER = 1130668;
const CO_EMPLOYEE = 1107687;
const NJ_EMPLOYEE = 1107686;
const NY_EMPLOYEE = 1132655;
const NM_EMPLOYEE = 1157030;
const VA_EMPLOYEE = 1157031;
const BCBA_COLORADO = 1124246;
const BCBA_LBA_NJ = 1124245;
const BCBA_LBA_NY = 1052629;
const GRAD_STUDENT_LBA_NY = 1092164;
const NY_MEDICAID = 1107647;
const SALARIED = 1132653;
const BILLING_HOLD = 1103437;
const BT_NY = 1052630;
const BT_NJ = 1132652;
const BT_CO = 1132650;
const RBT_NY = 1052631;
const RBT_NJ = 1132651;
const RBT_CO = 1107692;
const ROLE_LABELS = [BT_NY, BT_NJ, BT_CO, RBT_NY, RBT_NJ, RBT_CO];
const STATE_LABELS = [CO_EMPLOYEE, NJ_EMPLOYEE, NY_EMPLOYEE];
// BL6: recorded in the guide, not documented, not built (decision 25).
const BL6_NOT_BUILT = [1107649, 1107650, 1132654, 1107651];

const byNumber = (values) => [...values].sort((left, right) => left - right);

function map(employeeType, properties) {
  return buildEmployeePayload({
    employeeType,
    config: CONFIG,
    record: { id: "9001", properties: { hs_object_id: "9001", ...properties } }
  });
}
const bcba = (properties) => map("bcba", properties);
const bt = (properties) => map("bt_rbt", properties);

// --- 5.1, B6: BCBA gender ---

test("[B6][5.1] BCBA gender reads gender_new: Male and Female", () => {
  assert.equal(bcba({ gender_new: "Male" }).employeePayload.gender, "Male");
  assert.equal(bcba({ gender_new: "Female" }).employeePayload.gender, "Female");
});

test("[B6][5.1] the archived BCBA gender property is never read", () => {
  assert.equal(bcba({ gender: "Female" }).employeePayload.gender, null);
  assert.equal(bcba({ gender_new: "Male", gender: "Female" }).employeePayload.gender, "Male");
});

// --- 5.2, B7: BCBA mailing address and phone ---

test("[B7][5.2] BCBA address, city, state, zip and cell phone read the Contact mirrors", () => {
  const payload = bcba({
    address: "22 Oak St",
    apartment__home: "Apt 4",
    city_home: "Aurora",
    state_home: "Colorado",
    postal_code_home: "80014",
    employee_phone: "(212) 555-0104"
  }).employeePayload;
  assert.equal(payload.addressLine1, "22 Oak St");
  assert.equal(payload.addressLine2, "Apt 4");
  assert.equal(payload.city, "Aurora");
  assert.equal(payload.stateProvince, "CO");
  assert.equal(payload.zipPostalCode, "80014");
  assert.equal(payload.phoneCell, "2125550104");
});

test("[B7][5.2] the BCBA address no longer reads home_apt, city_work or home_state", () => {
  const payload = bcba({ home_apt: "9Z", city_work: "Work City", home_state: "New York" }).employeePayload;
  assert.equal(payload.addressLine2, null);
  assert.equal(payload.city, null);
  assert.equal(payload.stateProvince, null);
});

// --- 5.3, B13: the excluded field ---

test("[B13][5.3] credentialed_insurances__ny is not read and field 134444 is not in the BCBA metadata", () => {
  const mapped = bcba({ credentialed_insurances__ny: "Medicaid", medicaid_id__ny: "ny1" });
  assert.equal(Object.prototype.hasOwnProperty.call(mapped.metadataValues, 134444), false);
  assert.equal(Object.values(CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS).includes(134444), false);
});

test("[B8][5.3] the three BCBA Medicaid ID fields are still sent", () => {
  const values = bcba({ medicaid_id__ny: "ny1", medicaid_id__nj: "nj1", medicaid_id__co: "co1" }).metadataValues;
  assert.equal(values[126216], "ny1");
  assert.equal(values[138112], "nj1");
  assert.equal(values[138113], "co1");
});

// --- 5.4, BL1, BL2, BL3, BL8: BCBA header, base labels and state labels ---

test("[BL1][5.4] every BCBA requires the BCBA header 1130668, and it is a base label, never managed", () => {
  for (const properties of [{}, { location: "New York" }, { location: "Colorado;New Jersey" }]) {
    const mapped = bcba(properties);
    assert.equal(mapped.requiredLabelIds.includes(BCBA_HEADER), true);
    assert.equal(mapped.managedLabelIds.includes(BCBA_HEADER), false);
  }
});

test("[BL8][5.4] every BCBA requires All Employees 1052618 and Clinical 1052643, and neither is managed", () => {
  const mapped = bcba({});
  assert.deepEqual(byNumber(mapped.requiredLabelIds), byNumber([ALL_EMPLOYEES, BCBA_HEADER, CLINICAL]));
  assert.equal(mapped.managedLabelIds.includes(ALL_EMPLOYEES), false);
  assert.equal(mapped.managedLabelIds.includes(CLINICAL), false);
});

test("[BL2][5.4] BCBA location New York requires NY Employee 1132655", () => {
  assert.deepEqual(
    bcba({ location: "New York" }).requiredLabelIds.filter((id) => STATE_LABELS.includes(id)),
    [NY_EMPLOYEE]
  );
});

test("[BL2][5.4] BCBA location New Jersey requires NJ Employee 1107686", () => {
  assert.deepEqual(
    bcba({ location: "New Jersey" }).requiredLabelIds.filter((id) => STATE_LABELS.includes(id)),
    [NJ_EMPLOYEE]
  );
});

test("[BL2][5.4] BCBA location Colorado requires CO Employee 1107687", () => {
  assert.deepEqual(
    bcba({ location: "Colorado" }).requiredLabelIds.filter((id) => STATE_LABELS.includes(id)),
    [CO_EMPLOYEE]
  );
});

test("[BL2][5.4] a BCBA with several Work States gets one state label per state, and the three are managed", () => {
  const mapped = bcba({ location: "New York;Colorado;New Jersey" });
  assert.deepEqual(
    byNumber(mapped.requiredLabelIds.filter((id) => STATE_LABELS.includes(id))),
    byNumber(STATE_LABELS)
  );
  for (const id of STATE_LABELS) {
    assert.equal(mapped.managedLabelIds.includes(id), true, `${id} is managed`);
  }
});

test("[BL2][5.4] the BCBA state label no longer comes from home_state or state_home", () => {
  const mapped = bcba({ home_state: "New York", state_home: "Colorado" });
  assert.deepEqual(mapped.requiredLabelIds.filter((id) => STATE_LABELS.includes(id)), []);
});

test("[BL3][5.4] the NM Employee and VA Employee constants exist, and no BCBA mapping requires or manages them", () => {
  assert.equal(CENTRAL_REACH_EMPLOYEE_LABELS.NM_EMPLOYEE, NM_EMPLOYEE);
  assert.equal(CENTRAL_REACH_EMPLOYEE_LABELS.VA_EMPLOYEE, VA_EMPLOYEE);
  // "New Mexico" and "Virginia" are `location` options, but their mapping is deferred (package
  // item 11).
  const mapped = bcba({ location: "New York;New Mexico;Virginia" });
  for (const id of [NM_EMPLOYEE, VA_EMPLOYEE]) {
    assert.equal(mapped.requiredLabelIds.includes(id), false, `${id} is not required`);
    assert.equal(mapped.managedLabelIds.includes(id), false, `${id} is not managed`);
  }
  assert.deepEqual(mapped.workStates, ["NY"]);
});

// --- 5.5, BL4: assignment and licensure ---

test("[BL4][5.5] assign_states containing Assign CO requires BCBA Colorado 1124246", () => {
  assert.equal(bcba({ assign_states: "Assign CO" }).requiredLabelIds.includes(BCBA_COLORADO), true);
});

test("[BL4][5.5] assign_states containing Assign NJ requires BCBA LBA NJ 1124245", () => {
  assert.equal(bcba({ assign_states: "Assign NJ" }).requiredLabelIds.includes(BCBA_LBA_NJ), true);
});

test("[BL4][5.5] assign_states with both options requires both assignment labels", () => {
  const labels = bcba({ assign_states: "Assign CO;Assign NJ" }).requiredLabelIds;
  assert.equal(labels.includes(BCBA_COLORADO), true);
  assert.equal(labels.includes(BCBA_LBA_NJ), true);
});

test("[BL4][5.5] lba_licensure__ny Yes requires BCBA LBA NY 1052629 and not the Grad label", () => {
  const labels = bcba({ lba_licensure__ny: "Yes" }).requiredLabelIds;
  assert.equal(labels.includes(BCBA_LBA_NY), true);
  assert.equal(labels.includes(GRAD_STUDENT_LBA_NY), false);
});

test("[BL4][5.5] lba_licensure__ny Grad Permit requires GRAD Student- LBA NY 1092164 and not BCBA LBA NY", () => {
  const labels = bcba({ lba_licensure__ny: "Grad Permit" }).requiredLabelIds;
  assert.equal(labels.includes(GRAD_STUDENT_LBA_NY), true);
  assert.equal(labels.includes(BCBA_LBA_NY), false);
});

test("[BL4][5.5] lba_licensure__ny No (shown as Will Apply), or blank, requires no licensure label; the four labels are managed", () => {
  for (const value of ["No", ""]) {
    const mapped = bcba({ lba_licensure__ny: value, assign_states: "" });
    for (const id of [BCBA_COLORADO, BCBA_LBA_NJ, BCBA_LBA_NY, GRAD_STUDENT_LBA_NY]) {
      assert.equal(mapped.requiredLabelIds.includes(id), false, `${id} is not required`);
      assert.equal(mapped.managedLabelIds.includes(id), true, `${id} is managed`);
    }
  }
});

// --- 5.6, BL5 and BL6: credential labels ---

test("[BL5][5.6] ny_insurance_labels containing MCD FFS-NY requires NY Medicaid 1107647", () => {
  assert.equal(bcba({ ny_insurance_labels: "MCD FFS-NY" }).requiredLabelIds.includes(NY_MEDICAID), true);
  assert.equal(
    bcba({ ny_insurance_labels: "Aetna-NY;MCD FFS-NY;Cigna-NY" }).requiredLabelIds.includes(NY_MEDICAID),
    true
  );
});

test("[BL5][5.6] NY Medicaid is managed and is not required without MCD FFS-NY", () => {
  const mapped = bcba({ ny_insurance_labels: "Aetna-NY;Cigna-NY;Carelon-NY" });
  assert.equal(mapped.requiredLabelIds.includes(NY_MEDICAID), false);
  assert.equal(mapped.managedLabelIds.includes(NY_MEDICAID), true);
});

test("[BL6][5.6] the other credential options send nothing: Aetna, Cigna, Carelon and CO Medicaid are never required or managed", () => {
  const mapped = bcba({
    ny_insurance_labels: "MCD FFS-NY;Aetna-NY;Cigna-NY;Carelon-NY",
    co_insurance_labels: "MCD-CO;Aetna-CO;Cigna-CO;Carelon-CO",
    nj_insurance_labels: "MCD-NJ;Horizon-NJ"
  });
  for (const id of BL6_NOT_BUILT) {
    assert.equal(mapped.requiredLabelIds.includes(id), false, `${id} is not required`);
    assert.equal(mapped.managedLabelIds.includes(id), false, `${id} is not managed`);
  }
});

// --- 5.7, B10: Salaried ---

test("[B10][5.7] work_status Salaried requires the label Salaried 1132653", () => {
  assert.equal(bcba({ work_status: "Salaried" }).requiredLabelIds.includes(SALARIED), true);
});

test("[B10][5.7] any other work_status, or blank, does not require Salaried, and the label is managed", () => {
  for (const value of ["Some other value", ""]) {
    const mapped = bcba({ work_status: value });
    assert.equal(mapped.requiredLabelIds.includes(SALARIED), false, `work_status "${value}"`);
    assert.equal(mapped.managedLabelIds.includes(SALARIED), true);
  }
});

// --- 5.8, BL7: Billing Hold ---

test("[BL7][5.8] cr_billing_hold_label Yes requires Billing Hold Medicaid Affiliation 1103437", () => {
  assert.equal(bcba({ cr_billing_hold_label: "Yes" }).requiredLabelIds.includes(BILLING_HOLD), true);
});

test("[BL7][5.8] cr_billing_hold_label No or blank does not require Billing Hold, and it is managed, so it is removed", () => {
  for (const value of ["No", ""]) {
    const mapped = bcba({ cr_billing_hold_label: value });
    assert.equal(mapped.requiredLabelIds.includes(BILLING_HOLD), false, `value "${value}"`);
    assert.equal(mapped.managedLabelIds.includes(BILLING_HOLD), true);
  }
});

test("[BL2][BL4][BL5][B10][BL7] the BCBA managed list is exactly the state, assignment, licensure, NY Medicaid, Salaried and Billing Hold labels", () => {
  assert.deepEqual(
    byNumber(bcba({}).managedLabelIds),
    byNumber([
      ...STATE_LABELS,
      BCBA_COLORADO,
      BCBA_LBA_NJ,
      BCBA_LBA_NY,
      GRAD_STUDENT_LBA_NY,
      NY_MEDICAID,
      SALARIED,
      BILLING_HOLD
    ])
  );
});

// --- 5.9, T4 and T5: BT/RBT mailing address ---

test("[T4][5.9] BT/RBT state comes from state_home and zip from postal_code_home", () => {
  const payload = bt({
    street_home: "1 Main St",
    location_city: "Denver",
    state_home: "Colorado",
    postal_code_home: "80014",
    employee_phone: "212-555-0103"
  }).employeePayload;
  assert.equal(payload.addressLine1, "1 Main St");
  assert.equal(payload.city, "Denver");
  assert.equal(payload.stateProvince, "CO");
  assert.equal(payload.zipPostalCode, "80014");
  assert.equal(payload.phoneCell, "2125550103");
});

test("[T4][5.9] the BT/RBT address never reads location_home, location or postal_code", () => {
  const payload = bt({ location_home: "New York", location: "New York", postal_code: "10001" }).employeePayload;
  assert.equal(payload.stateProvince, null);
  assert.equal(payload.zipPostalCode, null);
});

test("[T5][5.9] BT/RBT home_apt stays as address line 2", () => {
  assert.equal(bt({ home_apt: "1E" }).employeePayload.addressLine2, "1E");
});

test("[T3][5.9] BT/RBT gender still reads the Contact mirror gender", () => {
  assert.equal(bt({ gender: "Female" }).employeePayload.gender, "Female");
});

// --- 5.10, T6: work address ---

test("[T6][5.10] the BT/RBT work address in field 133819 includes apartment__work", () => {
  const values = bt({
    street_address__work_: "5 Work Ave",
    apartment__work: "Suite 2",
    city__work_: "Albany",
    state__work_: "NY",
    postal_code__work_: "12207"
  }).metadataValues;
  assert.equal(values[133819], "5 Work Ave, Suite 2, Albany, NY 12207");
});

test("[T6][5.10] the BT/RBT work address without an apartment is unchanged", () => {
  const values = bt({
    street_address__work_: "5 Work Ave",
    city__work_: "Albany",
    state__work_: "NY",
    postal_code__work_: "12207"
  }).metadataValues;
  assert.equal(values[133819], "5 Work Ave, Albany, NY 12207");
});

// --- 5.11, TL1, TL2, TL4: BT/RBT state and base labels ---

test("[TL4][5.11] every BT/RBT requires All Employees 1052618 and Clinical 1052643, with any Work State or none, and neither is managed", () => {
  for (const location of ["", "New York", "New Jersey", "Colorado"]) {
    const mapped = bt({ location });
    assert.equal(mapped.requiredLabelIds.includes(ALL_EMPLOYEES), true, `location "${location}"`);
    assert.equal(mapped.requiredLabelIds.includes(CLINICAL), true, `location "${location}"`);
    assert.equal(mapped.managedLabelIds.includes(ALL_EMPLOYEES), false);
    assert.equal(mapped.managedLabelIds.includes(CLINICAL), false);
  }
  assert.deepEqual(byNumber(bt({}).requiredLabelIds), byNumber([ALL_EMPLOYEES, CLINICAL]));
});

test("[TL1][5.11] BT/RBT location New York requires NY Employee 1132655", () => {
  assert.deepEqual(
    bt({ location: "New York" }).requiredLabelIds.filter((id) => STATE_LABELS.includes(id)),
    [NY_EMPLOYEE]
  );
});

test("[TL1][5.11] BT/RBT location New Jersey requires NJ Employee 1107686", () => {
  assert.deepEqual(
    bt({ location: "New Jersey" }).requiredLabelIds.filter((id) => STATE_LABELS.includes(id)),
    [NJ_EMPLOYEE]
  );
});

test("[TL1][5.11] BT/RBT location Colorado requires CO Employee 1107687", () => {
  assert.deepEqual(
    bt({ location: "Colorado" }).requiredLabelIds.filter((id) => STATE_LABELS.includes(id)),
    [CO_EMPLOYEE]
  );
});

test("[TL1][5.11] a BT/RBT with two Work States gets two state labels; the state label no longer comes from location_home", () => {
  const mapped = bt({ location: "Colorado;New York", location_home: "New Jersey", state_home: "New Jersey" });
  assert.deepEqual(
    byNumber(mapped.requiredLabelIds.filter((id) => STATE_LABELS.includes(id))),
    byNumber([CO_EMPLOYEE, NY_EMPLOYEE])
  );
  for (const id of STATE_LABELS) {
    assert.equal(mapped.managedLabelIds.includes(id), true, `${id} is managed`);
  }
});

test("[TL2][5.11] no BT/RBT mapping requires or manages NM Employee or VA Employee", () => {
  const mapped = bt({ location: "New Mexico;Virginia", bt_rbt_type: "BT" });
  for (const id of [NM_EMPLOYEE, VA_EMPLOYEE]) {
    assert.equal(mapped.requiredLabelIds.includes(id), false, `${id} is not required`);
    assert.equal(mapped.managedLabelIds.includes(id), false, `${id} is not managed`);
  }
});

// --- 5.12, TL3: role by state ---

const ROLE_CASES = [
  ["BT", "New York", BT_NY, "Behavior Technician NY 1052630"],
  ["BT", "New Jersey", BT_NJ, "Behavior Technician NJ 1132652"],
  ["BT", "Colorado", BT_CO, "Behavior Technician CO 1132650"],
  ["RBT", "New York", RBT_NY, "RBT NY 1052631"],
  ["RBT", "New Jersey", RBT_NJ, "RBT NJ 1132651"],
  ["RBT", "Colorado", RBT_CO, "RBT CO 1107692"]
];
for (const [type, location, labelId, labelName] of ROLE_CASES) {
  test(`[TL3][5.12] bt_rbt_type ${type} with Work State ${location} requires ${labelName} and no other role label`, () => {
    const mapped = bt({ bt_rbt_type: type, location });
    assert.deepEqual(mapped.requiredLabelIds.filter((id) => ROLE_LABELS.includes(id)), [labelId]);
  });
}

test("[TL3][5.12] a BT with two Work States gets a Behavior Technician label for each, and never an RBT label", () => {
  const mapped = bt({ bt_rbt_type: "BT", location: "New York;Colorado" });
  assert.deepEqual(
    byNumber(mapped.requiredLabelIds.filter((id) => ROLE_LABELS.includes(id))),
    byNumber([BT_NY, BT_CO])
  );
});

test("[TL3][5.12] an RBT with two Work States gets an RBT label for each, and never a Behavior Technician label", () => {
  const mapped = bt({ bt_rbt_type: "RBT", location: "New York;New Jersey" });
  assert.deepEqual(
    byNumber(mapped.requiredLabelIds.filter((id) => ROLE_LABELS.includes(id))),
    byNumber([RBT_NY, RBT_NJ])
  );
});

test("[TL3][5.12] all six role labels are managed, so a BT who becomes an RBT loses the Behavior Technician label", () => {
  const before = bt({ bt_rbt_type: "BT", location: "New York" });
  const after = bt({ bt_rbt_type: "RBT", location: "New York" });
  assert.equal(before.requiredLabelIds.includes(BT_NY), true);
  assert.equal(after.requiredLabelIds.includes(BT_NY), false);
  assert.equal(after.requiredLabelIds.includes(RBT_NY), true);
  for (const id of ROLE_LABELS) {
    assert.equal(after.managedLabelIds.includes(id), true, `${id} is managed`);
  }
  assert.deepEqual(byNumber(after.managedLabelIds), byNumber([...STATE_LABELS, ...ROLE_LABELS]));
});

test("[TL3][5.12] bt_to_rbt_path has no effect on the labels", () => {
  const without = bt({ bt_rbt_type: "BT", location: "New York" });
  const withPath = bt({ bt_rbt_type: "BT", location: "New York", bt_to_rbt_path: "Yes" });
  assert.deepEqual(withPath.requiredLabelIds, without.requiredLabelIds);
});

test("[TL3][5.12] a BT or RBT with a blank Work State requires no role label, and all six role labels stay managed", () => {
  for (const type of ["BT", "RBT"]) {
    const mapped = bt({ bt_rbt_type: type, location: "" });
    assert.deepEqual(mapped.requiredLabelIds.filter((id) => ROLE_LABELS.includes(id)), [], type);
    assert.deepEqual(byNumber(mapped.managedLabelIds), byNumber([...STATE_LABELS, ...ROLE_LABELS]), type);
    assert.deepEqual(mapped.warnings, [], type);
  }
});

// Decision 35 (O-36): a type that is blank or is not BT or RBT manages no role label, so a role
// label the person already holds in CentralReach is left alone. "BT to RBT" is an option of
// bt_rbt_type in the sandbox, and a hidden option in production too (production read of
// 2026-11-24: 1 record holds it).
for (const [type, name] of [
  ["", "a blank bt_rbt_type"],
  ["BT to RBT", "bt_rbt_type BT to RBT"]
]) {
  test(`[TL3][5.12] ${name} with Work State New York requires no role label and manages none of the six`, () => {
    const mapped = bt({ bt_rbt_type: type, location: "New York" });
    for (const id of ROLE_LABELS) {
      assert.equal(mapped.requiredLabelIds.includes(id), false, `${id} is not required`);
      assert.equal(mapped.managedLabelIds.includes(id), false, `${id} is not managed`);
    }
  });

  test(`[TL3][5.12] ${name} with Work State New York still requires NY Employee and manages the three state labels`, () => {
    const mapped = bt({ bt_rbt_type: type, location: "New York" });
    assert.deepEqual(byNumber(mapped.requiredLabelIds), byNumber([ALL_EMPLOYEES, CLINICAL, NY_EMPLOYEE]));
    assert.deepEqual(byNumber(mapped.managedLabelIds), byNumber(STATE_LABELS));
  });
}

test("[TL3][5.12] bt_rbt_type BT to RBT adds one warning that names the property, never the value", () => {
  const mapped = bt({ bt_rbt_type: "BT to RBT", location: "New York" });
  assert.equal(mapped.warnings.length, 1);
  assert.equal(mapped.warnings[0].code, "unmapped_bt_rbt_type");
  assert.equal(mapped.warnings[0].message.includes("bt_rbt_type"), true);
  assert.equal(JSON.stringify(mapped.warnings).includes("BT to RBT"), false);
});

test("[TL3][5.12] a blank bt_rbt_type adds no warning", () => {
  for (const type of ["", "  ", null, undefined]) {
    assert.deepEqual(bt({ bt_rbt_type: type, location: "New York" }).warnings, []);
  }
});

test("[TL3][5.12] BT and RBT still manage all six role labels and add no warning", () => {
  for (const type of ["BT", "RBT"]) {
    const mapped = bt({ bt_rbt_type: type, location: "New York" });
    assert.deepEqual(byNumber(mapped.managedLabelIds), byNumber([...STATE_LABELS, ...ROLE_LABELS]), type);
    assert.deepEqual(mapped.warnings, [], type);
  }
});

// --- 5.13, T1 and B1, mapper side (contract P.5 d): workStates ---

test("[T1][5.13] the BT/RBT mapper returns workStates as upper-case two-letter codes from location, with no duplicates", () => {
  assert.deepEqual(bt({ location: "Colorado" }).workStates, ["CO"]);
  assert.deepEqual(bt({ location: "New York;Colorado" }).workStates, ["CO", "NY"]);
  assert.deepEqual(bt({ location: "New Jersey; New York ;New Jersey" }).workStates, ["NJ", "NY"]);
});

test("[T1][5.13] workStates is empty when location is blank, and location_home or state_home never fills it", () => {
  assert.deepEqual(bt({}).workStates, []);
  assert.deepEqual(bt({ location: "" }).workStates, []);
  assert.deepEqual(bt({ location_home: "Colorado", state_home: "Colorado" }).workStates, []);
});

test("[B1][5.13] the BCBA mapper returns workStates in the same way", () => {
  assert.deepEqual(bcba({ location: "New York;Colorado" }).workStates, ["CO", "NY"]);
  assert.deepEqual(bcba({}).workStates, []);
});

test("[T1][5.13] a location option with no code is left out of workStates with a warning that names the property, never the value", () => {
  for (const mapped of [
    bt({ location: "Colorado;Atlantis", bt_rbt_type: "BT" }),
    bcba({ location: "Colorado;Atlantis" })
  ]) {
    assert.deepEqual(mapped.workStates, ["CO"]);
    assert.equal(mapped.requiredLabelIds.includes(CO_EMPLOYEE), true);
    assert.equal(mapped.warnings.length, 1);
    assert.equal(mapped.warnings[0].code, "unmapped_work_state");
    assert.equal(mapped.warnings[0].message.includes("location"), true);
    assert.equal(JSON.stringify(mapped.warnings).includes("Atlantis"), false);
  }
});

test("[T1][5.13] a location with only mapped Work States raises no warning", () => {
  assert.deepEqual(bt({ location: "New York;New Jersey;Colorado" }).warnings, []);
  assert.deepEqual(bcba({ location: "New York" }).warnings, []);
});

// --- The contract (P.5 a) for both employee mappers ---

test("[BR19][5.12] every label an employee can require is sendable, base labels are never managed, and no ID is required twice", () => {
  const locations = ["", "New York", "New Jersey", "Colorado", "New York;New Jersey;Colorado", "Atlantis"];
  const all = [];
  for (const location of locations) {
    for (const type of ["BT", "RBT", ""]) {
      all.push(bt({ location, bt_rbt_type: type }));
    }
    for (const lba of ["Yes", "Grad Permit", "No", ""]) {
      all.push(
        bcba({
          location,
          lba_licensure__ny: lba,
          assign_states: "Assign CO;Assign NJ",
          ny_insurance_labels: "MCD FFS-NY",
          work_status: "Salaried",
          cr_billing_hold_label: "Yes"
        })
      );
    }
  }
  for (const mapped of all) {
    assert.equal(mapped.requiredLabelIds.length > 0, true);
    assert.equal(new Set(mapped.requiredLabelIds).size, mapped.requiredLabelIds.length);
    for (const id of mapped.requiredLabelIds) {
      assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), true, `${id} is sendable`);
    }
    for (const id of [ALL_EMPLOYEES, CLINICAL, BCBA_HEADER]) {
      assert.equal(mapped.managedLabelIds.includes(id), false, `${id} is a base label`);
    }
  }
});

// CLB-155, LBL-013: the three staffing labels are client labels (CL4). No employee mapping
// requires or manages them, even when a staff record holds a staffing_status of its own.
test("[CL4][BR19] no BCBA or BT/RBT mapping requires or manages a staffing label (1156743, 1156746, 1156747)", () => {
  const STAFFING_LABELS = [1156743, 1156746, 1156747];
  const shared = { location: "New York;New Jersey;Colorado", staffing_status: "Staffed 97153" };
  const mapped = [
    ...["BT", "RBT", ""].map((type) => bt({ ...shared, bt_rbt_type: type })),
    ...["Yes", "Grad Permit", ""].map((lba) =>
      bcba({
        ...shared,
        lba_licensure__ny: lba,
        assign_states: "Assign CO;Assign NJ",
        ny_insurance_labels: "MCD FFS-NY",
        work_status: "Salaried",
        cr_billing_hold_label: "Yes"
      })
    )
  ];
  for (const { requiredLabelIds, managedLabelIds } of mapped) {
    for (const id of STAFFING_LABELS) {
      assert.equal(requiredLabelIds.includes(id), false, `${id} is not required`);
      assert.equal(managedLabelIds.includes(id), false, `${id} is not managed`);
    }
  }
});
