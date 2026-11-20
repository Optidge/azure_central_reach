import test from "node:test";
import assert from "node:assert/strict";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import { createOrUpdateEmployee, getEmployeeContactForm } from "../../lib/centralReachClient.mjs";
import { fakeCentralReach } from "./stage2Fakes.mjs";

const { BT_RBT, BCBA } = HUBSPOT_EMPLOYEE_TYPES;

test("AWS contact forms are matched exactly by employee type", () => {
  assert.equal(getEmployeeContactForm(HUBSPOT_EMPLOYEE_TYPES.BT_RBT), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(HUBSPOT_EMPLOYEE_TYPES.BCBA), "Admin");
});

test("unsupported employee type has no contact form", () => {
  assert.equal(getEmployeeContactForm("unknown"), null);
});

// Row 5.13 (BUILD-PLAN rule 5.9, decision 17). Guide [GER-REQ], "Employee · ContactForm": set by
// the integration, BCBA: Admin, BT/RBT: Behavior Technician NY, sent on every employee create.
// Decision 17 adds the Colorado form. workStates are the mapper's codes (contract P.5 (d)).

test("[T1][5.13] a BT/RBT whose work states hold Colorado and not New York gets the form RBT CO", () => {
  assert.equal(getEmployeeContactForm(BT_RBT, ["CO"]), "RBT CO");
  assert.equal(getEmployeeContactForm(BT_RBT, ["CO", "NJ"]), "RBT CO");
  assert.equal(getEmployeeContactForm(BT_RBT, ["NJ", "CO"]), "RBT CO");
});

test("[T1][5.13] a BT/RBT whose work states hold New York gets Behavior Technician NY, also with Colorado", () => {
  assert.equal(getEmployeeContactForm(BT_RBT, ["NY"]), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT, ["CO", "NY"]), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT, ["NY", "CO"]), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT, ["CO", "NJ", "NY"]), "Behavior Technician NY");
});

test("[T1][5.13] New Jersey has no form of its own: a New Jersey BT/RBT gets Behavior Technician NY", () => {
  assert.equal(getEmployeeContactForm(BT_RBT, ["NJ"]), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT, ["NJ", "NY"]), "Behavior Technician NY");
});

test("[T1][5.13] a BT/RBT with blank work states gets Behavior Technician NY", () => {
  assert.equal(getEmployeeContactForm(BT_RBT, []), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT), "Behavior Technician NY");
  assert.equal(getEmployeeContactForm(BT_RBT, null), "Behavior Technician NY");
});

test("[B1][5.13] every BCBA gets the form Admin, for every state", () => {
  for (const workStates of [[], ["NY"], ["NJ"], ["CO"], ["CO", "NJ"], ["CO", "NY"]]) {
    assert.equal(getEmployeeContactForm(BCBA, workStates), "Admin");
  }
});

function createEmployee(employeeType, workStates) {
  return createOrUpdateEmployee({
    payload: {
      externalSystemId: "HS1",
      firstName: "Alex",
      lastName: "Rivera",
      primaryEmail: "alex@example.com",
      dateOfBirth: "1990-10-20"
    },
    employeeType,
    workStates,
    existingContactId: null,
    allowEmployeeCreate: true,
    putOnlyMode: false
  });
}

test("[T1][5.13] a Colorado BT is created with the form RBT CO", async () => {
  const cr = fakeCentralReach();
  const result = await createEmployee(BT_RBT, ["CO"]);
  assert.equal(result.operation, "create");
  const post = cr.calls.find((call) => call.name === "POST /contacts/employee");
  assert.equal(post.body.ContactForm, "RBT CO");
  assert.equal(Object.prototype.hasOwnProperty.call(post.body, "workStates"), false);
});

test("[T1][5.13] a New York, a New Jersey and a New York plus Colorado BT/RBT are created with Behavior Technician NY", async () => {
  for (const workStates of [["NY"], ["NJ"], ["CO", "NY"], []]) {
    const cr = fakeCentralReach();
    await createEmployee(BT_RBT, workStates);
    const post = cr.calls.find((call) => call.name === "POST /contacts/employee");
    assert.equal(post.body.ContactForm, "Behavior Technician NY");
  }
});

test("[B1][5.13] a Colorado BCBA is created with the form Admin", async () => {
  const cr = fakeCentralReach();
  await createEmployee(BCBA, ["CO"]);
  const post = cr.calls.find((call) => call.name === "POST /contacts/employee");
  assert.equal(post.body.ContactForm, "Admin");
});
