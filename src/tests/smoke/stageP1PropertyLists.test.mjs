// Stage P, row P.1 (BUILD-PLAN.md section 10): the HubSpot property lists and the employee list
// of known metadata fields live in the mapping folder. Behaviour does not change: the workers ask
// HubSpot for exactly the properties they asked for before the move.
// The workflow tests run the real mapper, validator, hash, cosmosState.mjs (in-memory container)
// and centralReachClient.mjs (fake HTTP adapter). Only HubSpot is faked. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { useStateContainer } from "../../lib/cosmosState.mjs";
import { filterWritebackProperties } from "../../lib/writebackAllowlist.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../../constants/hubspot.mjs";
import {
  CASE_PROPERTIES,
  caseRequestProperties
} from "../../mappings/client/clientProperties.mjs";
import {
  BCBA_PROPERTIES,
  BT_RBT_PROPERTIES,
  employeeRequestProperties,
  knownMetadataFieldIds
} from "../../mappings/employees/employeeProperties.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import {
  btRecord,
  caseRecord,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  fakeCentralReach,
  hubspotRecord,
  memoryContainer,
  workflowConfig
} from "./stage2Fakes.mjs";

// The three lists as they stood in the workflow files at c1a1025, before the move.
const CASE_BEFORE = [
  "hs_object_id",
  "hs_lastmodifieddate",
  "dealstage",
  "enter_in_central_reach",
  "test_record",
  "integration_last_write",
  "updated_by_integration",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "phi_first_name__cloned_",
  "phi_last_name",
  "phi_date_of_birth",
  "phi_gender",
  "email",
  "phone",
  "phone_number__second_",
  "if_services_will_be_in_more_than_one_location__list_the_other_addres",
  "street_address",
  "home_apt",
  "location_city",
  "location_central_reach",
  "location",
  "postal_code",
  "guardian_first_name",
  "guardian_last_name",
  "allergies",
  "maladaptive_behaviors__clinical",
  "comorbid_diagnosis__clinical",
  "current_primary_bt",
  "current_primary_bt_2",
  "bt_work_schedule_confirmed",
  "bt_work_schedule_2_confirmed",
  "client_availability_completed",
  "assigned_hours",
  "authorized_hours",
  "auth_start_date",
  "auth_end_date",
  "physician_name",
  "npi_number",
  "physician_name__commercial",
  "npi_number__commercial",
  "most_recent_asd_diagnosis_date_medicaid",
  "most_recent_asd_diagnosis_date_1",
  "most_recent_asd_diagnosis_date_2",
  "supervising_bcba",
  "initial_assessment_bcba",
  "policy_holder_name",
  "phi__policy_holder_dob",
  "severity_level_clinical",
  "n1_what_type_of_insurance",
  "n2_what_type_of_insurance",
  "insurance_primary",
  "insurance_1__other__summary",
  "insurance_id_1",
  "insurance_id_2",
  "insurance_id_3",
  "insurance_id_4",
  "central_reach_link_to_client"
];

const BT_RBT_BEFORE = [
  "hs_object_id",
  "employee_id",
  "hs_lastmodifieddate",
  "updated_by_integration",
  "integration_last_write",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "entered_in_centralreach",
  "test_record",
  "workday_id",
  "first_name",
  "last_name",
  "bt_name",
  "date_of_birth",
  "btrbt_in_cr_checklist",
  "gender",
  "email",
  "street_home",
  "home_apt",
  "location_city",
  "location_home",
  "postal_code",
  "postal_code_home",
  "employee_phone",
  "bt_rbt_type",
  "active_cases_count",
  "street_address__work_",
  "city__work_",
  "state__work_",
  "postal_code__work_",
  "central_reach_link_to_rt_rbt"
];

const BCBA_BEFORE = [
  "hs_object_id",
  "employee_id",
  "hs_lastmodifieddate",
  "updated_by_integration",
  "integration_last_write",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "entered_in_centralreach",
  "test_record",
  "workday_id",
  "first_name",
  "last_name",
  "bcba_name",
  "date_of_birth",
  "email",
  "ucaba_email_address",
  "work_email",
  "bcba_in_cr_checklist",
  "address",
  "home_apt",
  "city_work",
  "home_state",
  "employee_phone",
  "medicaid_id__ny",
  "medicaid_id__nj",
  "medicaid_id__co",
  "credentialed_insurances__ny",
  "central_reach_record_link"
];

const LIST_NAMES = ["mapped", "signalOnly", "mustTrigger", "system"];
// The one addition Stage P makes to a request: three staffing-name signals on the Case (guide
// section 4). No mapper reads them. The trigger check of row 3.10 needs them in signalOnly.
const CASE_STAFFING_NAME_SIGNALS = ["supervising_bcba_name", "ia_bcba_name", "reassessment_bcba_name"];
const OBJECTS = [
  {
    name: "Case",
    lists: CASE_PROPERTIES,
    before: [...CASE_BEFORE, ...CASE_STAFFING_NAME_SIGNALS],
    request: () => caseRequestProperties()
  },
  {
    name: "BT/RBT",
    lists: BT_RBT_PROPERTIES,
    before: BT_RBT_BEFORE,
    request: () => employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BT_RBT)
  },
  {
    name: "BCBA",
    lists: BCBA_PROPERTIES,
    before: BCBA_BEFORE,
    request: () => employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BCBA)
  }
];

const sorted = (values) => [...values].sort();

function setup() {
  const container = memoryContainer();
  useStateContainer(container);
  const cr = fakeCentralReach();
  return { container, cr };
}

for (const { name, lists, before, request } of OBJECTS) {
  test(`[P.1] ${name}: four lists are exported, and together they hold exactly the properties requested before the move`, () => {
    assert.deepEqual(Object.keys(lists).sort(), [...LIST_NAMES].sort());
    for (const listName of LIST_NAMES) {
      assert.equal(Array.isArray(lists[listName]), true, `${listName} is a list`);
    }
    assert.deepEqual(sorted(request()), sorted(before));
  });

  test(`[P.1] ${name}: no property sits in two lists`, () => {
    const all = LIST_NAMES.flatMap((listName) => lists[listName]);
    assert.equal(new Set(all).size, all.length);
  });

  test(`[P.1][BR13] ${name}: no property the integration writes is in a list a HubSpot workflow must trigger on`, () => {
    const triggerNames = [...lists.mapped, ...lists.signalOnly, ...lists.mustTrigger];
    const asPatch = Object.fromEntries(triggerNames.map((property) => [property, "x"]));
    const kind = name === "Case" ? "client" : "employee";
    const idProperty = name === "Case" ? "client_id_number" : "employee_id";
    assert.deepEqual(filterWritebackProperties(asPatch, { kind, idProperty }), {});
  });
}

test("[P.1] Case: dealstage and the three staffing-name signals are change signals only, and the entry property is in mustTrigger", () => {
  assert.deepEqual([...CASE_PROPERTIES.signalOnly], ["dealstage", ...CASE_STAFFING_NAME_SIGNALS]);
  for (const property of CASE_STAFFING_NAME_SIGNALS) {
    assert.equal(CASE_BEFORE.includes(property), false, `${property} was not requested before Stage P`);
  }
  assert.deepEqual([...CASE_PROPERTIES.mustTrigger], ["enter_in_central_reach"]);
});

test("[P.1] Case: gate, status, link and ID properties are in system", () => {
  assert.deepEqual(
    sorted(CASE_PROPERTIES.system),
    sorted([
      "hs_object_id",
      "hs_lastmodifieddate",
      "test_record",
      "integration_last_write",
      "updated_by_integration",
      "last_sync_hash",
      "last_sync_at",
      "last_sync_status",
      "last_sync_error",
      "central_reach_link_to_client"
    ])
  );
});

test("[P.1] BT/RBT and BCBA: the entry property and the checklist property are in mustTrigger", () => {
  assert.deepEqual(sorted(BT_RBT_PROPERTIES.mustTrigger), ["btrbt_in_cr_checklist", "entered_in_centralreach"]);
  assert.deepEqual(sorted(BCBA_PROPERTIES.mustTrigger), ["bcba_in_cr_checklist", "entered_in_centralreach"]);
  assert.deepEqual([...BT_RBT_PROPERTIES.signalOnly], []);
  assert.deepEqual([...BCBA_PROPERTIES.signalOnly], []);
});

test("[P.1] BT/RBT and BCBA: gate, status, link and ID properties are in system", () => {
  const shared = [
    "hs_object_id",
    "employee_id",
    "hs_lastmodifieddate",
    "updated_by_integration",
    "integration_last_write",
    "last_sync_hash",
    "last_sync_at",
    "last_sync_status",
    "last_sync_error",
    "test_record"
  ];
  assert.deepEqual(sorted(BT_RBT_PROPERTIES.system), sorted([...shared, "central_reach_link_to_rt_rbt"]));
  assert.deepEqual(sorted(BCBA_PROPERTIES.system), sorted([...shared, "central_reach_record_link"]));
});

test("[P.1] workday_id is mapped on both employee objects, so the trigger check covers it (BR10)", () => {
  assert.equal(BT_RBT_PROPERTIES.mapped.includes("workday_id"), true);
  assert.equal(BCBA_PROPERTIES.mapped.includes("workday_id"), true);
});

test("[P.1] knownMetadataFieldIds keeps the same field IDs for each employee type", () => {
  assert.deepEqual(knownMetadataFieldIds(HUBSPOT_EMPLOYEE_TYPES.BT_RBT), [133819, 147882, 138703]);
  assert.deepEqual(
    knownMetadataFieldIds(HUBSPOT_EMPLOYEE_TYPES.BCBA),
    [138069, 126216, 138112, 138113, 134444, 138703]
  );
});

test("[P.1] the Case worker asks HubSpot for the listed properties plus the CR ID and gate properties", async () => {
  const { cr } = setup();
  const record = caseRecord({ sandbox_test_field: "true" });
  const requested = [];
  const result = await runClientSyncWorkflow(
    { dealId: "deal-1" },
    {
      ...clientWorkflowDeps({
        record,
        config: workflowConfig({ sync: { recordGateProperty: "sandbox_test_field" } })
      }),
      getDealById: async (dealId, properties) => {
        requested.push(properties);
        return record.read();
      }
    }
  );

  // The real path ran: a create in CentralReach and a success writeback.
  assert.equal(result.status, "success");
  assert.equal(cr.count("POST /contacts/client"), 1);
  assert.equal(requested.length > 0, true);
  for (const properties of requested) {
    assert.deepEqual(
      sorted(properties),
      sorted([...CASE_BEFORE, ...CASE_STAFFING_NAME_SIGNALS, "client_id_number", "sandbox_test_field"])
    );
  }
});

test("[P.1] the employee worker asks HubSpot for the listed properties plus the CR ID and gate properties", async () => {
  const cases = [
    {
      employeeType: "bt_rbt",
      before: BT_RBT_BEFORE,
      record: btRecord({ sandbox_test_field: "true" }),
      reader: "getBtRbtRecordById"
    },
    {
      employeeType: "bcba",
      before: BCBA_BEFORE,
      record: hubspotRecord({
        hs_object_id: "HS1",
        entered_in_centralreach: "Yes",
        employee_id: "",
        first_name: "Sam",
        last_name: "Lee",
        ucaba_email_address: "sam@example.com",
        date_of_birth: "1988-02-03",
        workday_id: "WD2",
        sandbox_test_field: "true"
      }),
      reader: "getBcbaRecordById"
    }
  ];
  for (const { employeeType, before, record, reader } of cases) {
    const { cr } = setup();
    const requested = [];
    const result = await runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType },
      {
        ...employeeWorkflowDeps({
          record,
          config: workflowConfig({ sync: { recordGateProperty: "sandbox_test_field" } })
        }),
        [reader]: async (recordId, objectTypeId, properties) => {
          requested.push(properties);
          return record.read();
        }
      }
    );

    assert.equal(result.status, "success", employeeType);
    assert.equal(cr.count("POST /contacts/employee"), 1, employeeType);
    assert.equal(requested.length > 0, true, employeeType);
    for (const properties of requested) {
      // employee_id is listed and is also the configured CR ID property, as before the move.
      assert.deepEqual(
        sorted(properties),
        sorted([...before, "employee_id", "sandbox_test_field"]),
        employeeType
      );
    }
  }
});
