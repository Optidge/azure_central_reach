// Stage P, row P.1 (BUILD-PLAN.md section 10): the HubSpot property lists and the employee list
// of known metadata fields live in the mapping folder, and the workers ask HubSpot for exactly
// those lists. Stages 4 and 5 changed what the lists hold; the exact contents are proven in
// stage4and5PropertyLists.test.mjs.
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
  withBlankKeys,
  workflowConfig
} from "./stage2Fakes.mjs";

const LIST_NAMES = ["mapped", "signalOnly", "mustTrigger", "system"];
const OBJECTS = [
  { name: "Case", lists: CASE_PROPERTIES, request: () => caseRequestProperties() },
  {
    name: "BT/RBT",
    lists: BT_RBT_PROPERTIES,
    request: () => employeeRequestProperties(HUBSPOT_EMPLOYEE_TYPES.BT_RBT)
  },
  {
    name: "BCBA",
    lists: BCBA_PROPERTIES,
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

for (const { name, lists, request } of OBJECTS) {
  test(`[BR5][P.1] ${name}: four lists are exported, and the request is the four lists together`, () => {
    assert.deepEqual(Object.keys(lists).sort(), [...LIST_NAMES].sort());
    for (const listName of LIST_NAMES) {
      assert.equal(Array.isArray(lists[listName]), true, `${listName} is a list`);
    }
    assert.deepEqual(sorted(request()), sorted(LIST_NAMES.flatMap((listName) => lists[listName])));
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

test("[BR18][P.1] Case: dealstage, the five staffing-name signals and the owner are change signals only, and the entry property is in mustTrigger", () => {
  assert.deepEqual(
    [...CASE_PROPERTIES.signalOnly],
    [
      "dealstage",
      "supervising_bcba_name",
      "ia_bcba_name",
      "reassessment_bcba_name",
      "current_primary_bt",
      "current_primary_bt_2",
      "hubspot_owner_id"
    ]
  );
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

test("[B13][P.1] knownMetadataFieldIds: the BT/RBT fields are unchanged, and the BCBA fields no longer hold 134444 (row 5.3)", () => {
  assert.deepEqual(knownMetadataFieldIds(HUBSPOT_EMPLOYEE_TYPES.BT_RBT), [133819, 147882, 138703]);
  assert.deepEqual(
    knownMetadataFieldIds(HUBSPOT_EMPLOYEE_TYPES.BCBA),
    [138069, 126216, 138112, 138113, 138703]
  );
});

test("[BR5][P.1] the Case worker asks HubSpot for the listed properties plus the CR ID and gate properties", async () => {
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
        return withBlankKeys(record.read(), properties);
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
      sorted([...caseRequestProperties(), "client_id_number", "sandbox_test_field"])
    );
  }
});

test("[BR5][P.1] the employee worker asks HubSpot for the listed properties plus the CR ID and gate properties", async () => {
  const cases = [
    {
      employeeType: "bt_rbt",
      record: btRecord({ sandbox_test_field: "true" }),
      reader: "getBtRbtRecordById"
    },
    {
      employeeType: "bcba",
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
  for (const { employeeType, record, reader } of cases) {
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
        sorted([...employeeRequestProperties(employeeType), "employee_id", "sandbox_test_field"]),
        employeeType
      );
    }
  }
});
