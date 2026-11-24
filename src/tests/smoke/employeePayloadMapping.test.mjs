import test from "node:test";
import assert from "node:assert/strict";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { validateEmployeePayload } from "../../mappings/employees/validateEmployeePayload.mjs";
import { CENTRAL_REACH_EMPLOYEE_LABELS } from "../../constants/centralReach.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { employeeWorkflowDeps } from "./stage2Fakes.mjs";
import { linkedBt, setup } from "./stage3WorkerFakes.mjs";

const config = {
  hubspot: {
    hubspotPortalId: "12345",
    btRbtObjectTypeId: "2-aaa",
    bcbaObjectTypeId: "2-bbb"
  }
};

// Changed in Stage 5 (row 5.9): the mailing state is state_home; `location` is the Work State.
test("[T4][5.9] BT/RBT mapping builds expected safe payload", () => {
  const mapped = buildEmployeePayload({
    employeeType: "bt_rbt",
    config,
    record: {
      id: "r1",
      properties: {
        hs_object_id: "r1",
        workday_id: "1000001",
        first_name: "Alex",
        last_name: "Rivera",
        date_of_birth: "2000-01-02",
        gender: "male",
        email: "Alex@example.com",
        street_home: "1 Main",
        home_apt: "Apt 2",
        location_city: "Denver",
        state_home: "Colorado",
        location: "Colorado",
        postal_code_home: "80014",
        employee_phone: "(555) 111-2222",
        bt_rbt_type: "BT"
      }
    }
  });

  assert.equal(mapped.employeePayload.externalSystemId, "1000001");
  assert.equal(mapped.employeePayload.firstName, "Alex");
  assert.equal(mapped.employeePayload.lastName, "Rivera");
  assert.equal(mapped.employeePayload.primaryEmail, "alex@example.com");
  assert.equal(mapped.employeeFamily, "bt_rbt");
  assert.equal(Boolean(mapped.metadataValues["138703"]), true);
  assert.equal(mapped.warnings.length, 0);
  assert.equal(validateEmployeePayload(mapped.employeePayload).isValid, true);
});

// Changed in Stage 5 (row 5.2): the city and state are city_home and state_home.
test("[B7][5.2] BCBA mapping builds expected payload and metadata", () => {
  const mapped = buildEmployeePayload({
    employeeType: "bcba",
    config,
    record: {
      id: "r2",
      properties: {
        hs_object_id: "r2",
        workday_id: "1000002",
        first_name: "Pat",
        last_name: "Morgan",
        date_of_birth: "10/20/1990",
        email: "pat@work.test",
        address: "22 Oak",
        city_home: "Aurora",
        state_home: "CO",
        location: "Colorado",
        employee_phone: "5552223333",
        medicaid_id__ny: "ny1"
      }
    }
  });

  assert.equal(mapped.employeePayload.externalSystemId, "1000002");
  assert.equal(mapped.employeePayload.primaryEmail, "pat@work.test");
  assert.equal(mapped.employeeFamily, "bcba");
  assert.equal(Object.keys(mapped.metadataValues).length > 0, true);
  assert.equal(Boolean(mapped.metadataValues["138703"]), true);
  assert.equal(mapped.warnings.length, 0);
  assert.equal(validateEmployeePayload(mapped.employeePayload).isValid, true);
});

// Changed in Stage 5 (rows 5.4 and 5.11): the state label comes from the Work State(s) `location`,
// with the stored state names. It no longer comes from location_home or home_state.
test("[TL1][5.11] BT in CO includes CO employee label", () => {
  const mapped = buildEmployeePayload({
    employeeType: "bt_rbt",
    config,
    record: {
      id: "co-bt",
      properties: {
        hs_object_id: "co-bt",
        location: "Colorado",
        bt_rbt_type: "BT"
      }
    }
  });

  assert.equal(
    mapped.requiredLabelIds.includes(CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE),
    true
  );
});

test("[TL1][5.11] RBT in CO includes CO employee label", () => {
  const mapped = buildEmployeePayload({
    employeeType: "bt_rbt",
    config,
    record: {
      id: "co-rbt",
      properties: {
        hs_object_id: "co-rbt",
        location: "Colorado",
        bt_rbt_type: "RBT"
      }
    }
  });

  assert.equal(
    mapped.requiredLabelIds.includes(CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE),
    true
  );
});

test("[TL1][5.11] BT/RBT in NY include NY employee label", () => {
  const btMapped = buildEmployeePayload({
    employeeType: "bt_rbt",
    config,
    record: {
      id: "ny-bt",
      properties: {
        hs_object_id: "ny-bt",
        location: "New York",
        bt_rbt_type: "BT"
      }
    }
  });

  const rbtMapped = buildEmployeePayload({
    employeeType: "bt_rbt",
    config,
    record: {
      id: "ny-rbt",
      properties: {
        hs_object_id: "ny-rbt",
        location: "New York",
        bt_rbt_type: "RBT"
      }
    }
  });

  assert.equal(
    btMapped.requiredLabelIds.includes(CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE),
    true
  );
  assert.equal(
    rbtMapped.requiredLabelIds.includes(CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE),
    true
  );
});

test("[BL2][5.4] BCBA in NY/CO include the correct state employee labels", () => {
  const nyMapped = buildEmployeePayload({
    employeeType: "bcba",
    config,
    record: {
      id: "ny-bcba",
      properties: {
        hs_object_id: "ny-bcba",
        location: "New York"
      }
    }
  });

  const coMapped = buildEmployeePayload({
    employeeType: "bcba",
    config,
    record: {
      id: "co-bcba",
      properties: {
        hs_object_id: "co-bcba",
        location: "Colorado"
      }
    }
  });

  assert.equal(
    nyMapped.requiredLabelIds.includes(CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE),
    true
  );
  assert.equal(
    coMapped.requiredLabelIds.includes(CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE),
    true
  );
});

test("mapping returns warning when HUBSPOT_PORTAL_ID is missing", () => {
  const mapped = buildEmployeePayload({
    employeeType: "bcba",
    config: {
      hubspot: {
        hubspotPortalId: "",
        bcbaObjectTypeId: "2-bbb"
      }
    },
    record: {
      id: "r3",
      properties: {
        hs_object_id: "r3"
      }
    }
  });

  assert.equal(mapped.warnings.length, 1);
  assert.equal(mapped.warnings[0].code, "missing_hubspot_portal_id");
});

test("employee payload validation fails for missing identifiers", () => {
  const result = validateEmployeePayload({ firstName: "", lastName: "", externalSystemId: "" });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.length > 0, true);
});

// Item 16 (T2, rule 5.7): the BT/RBT date_of_birth is text in production (a property sync from the
// Contact's text date_of_birth, EMP §1), so it is read like the BCBA one: typed forms become
// YYYY-MM-DD. Blank stays blank; the placeholder is added on a create only (centralReachClient.mjs).
function btDateOfBirth(dateOfBirth) {
  return buildEmployeePayload({
    employeeType: "bt_rbt",
    config,
    record: { id: "r1", properties: { hs_object_id: "r1", date_of_birth: dateOfBirth } }
  });
}

test("[T2][1.4] BT/RBT date_of_birth is read as text: 2/20/1992 and 1992-02-20 both send 1992-02-20", () => {
  for (const text of ["2/20/1992", "1992-02-20"]) {
    const mapped = btDateOfBirth(text);
    assert.equal(mapped.dateOfBirthStatus, "date", text);
    assert.equal(mapped.employeePayload.dateOfBirth, "1992-02-20", text);
  }
});

test("[T2][1.4] BT/RBT date_of_birth: unreadable text is unreadable, blank stays blank (no placeholder in the mapper)", () => {
  for (const text of ["2/30/1992", "2/20/92", "not-a-date"]) {
    const mapped = btDateOfBirth(text);
    assert.equal(mapped.dateOfBirthStatus, "unreadable", text);
    assert.equal(mapped.employeePayload.dateOfBirth, null, text);
  }
  const blank = btDateOfBirth("  ");
  assert.equal(blank.dateOfBirthStatus, "blank");
  assert.equal(blank.employeePayload.dateOfBirth, null);
});

test("[T2][1.4] a linked BT/RBT with date_of_birth 2/20/1992 updates CentralReach with 1992-02-20, not error", async () => {
  const { cr } = setup();
  const record = linkedBt(cr, { date_of_birth: "2/20/1992" });
  const result = await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    employeeWorkflowDeps({ record })
  );
  assert.equal(result.status, "success");
  const put = cr.calls.filter((call) => call.name === "PUT /contacts/employee/{id}").at(-1);
  assert.equal(String(put.body.dateOfBirth).slice(0, 10), "1992-02-20");
});
