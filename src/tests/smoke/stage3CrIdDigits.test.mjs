// Stage 3, row 3.16 (BUILD-PLAN.md section 11, rule 5.5, decision 19): a CR ID that HubSpot holds
// must be digits only. Anything else is an `error` with a fixed reason and no CentralReach call.
// Guide: [GBR] Requirement 2 ("Push changes to the linked CentralReach record") and [G17] (the CR
// ID is the API contactId, written to client_id_number or employee_id).
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { crIdNotDigits } from "../../constants/syncReasons.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { clientWorkflowDeps, employeeWorkflowDeps } from "./stage2Fakes.mjs";
import {
  BCBA_LINK,
  BT_LINK,
  CASE_LINK,
  linkedBcba,
  linkedBt,
  linkedCase,
  setup,
  stage3Bcba,
  stage3Bt,
  stage3Case
} from "./stage3WorkerFakes.mjs";

// The three values of the plan row: a letter, a slash, a space.
const BAD_IDS = ["12a4", "12/4", "12 4"];

test("[BR21][3.16] the reason names the HubSpot property and holds no value", () => {
  assert.equal(crIdNotDigits("client_id_number"), "client_id_number must contain digits only.");
  assert.equal(crIdNotDigits("employee_id"), "employee_id must contain digits only.");
});

for (const badId of BAD_IDS) {
  test(`[BR5][3.16] Case: client_id_number "${badId}" is an error with no CentralReach call`, async () => {
    const { container, cr } = setup();
    const record = stage3Case({ client_id_number: badId });
    const logs = [];
    const result = await runClientSyncWorkflow(
      { dealId: "deal-1" },
      clientWorkflowDeps({ record, logs })
    );

    assert.equal(result.ok, true);
    assert.equal(result.status, "error");
    assert.equal(cr.calls.length, 0);
    assert.equal(record.properties.last_sync_status, "error");
    assert.equal(record.properties.last_sync_error, crIdNotDigits("client_id_number"));
    // The value is not stored as a CR ID, not returned and not logged.
    assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id), null);
    assert.equal(result.crContactId, null);
    assert.equal(JSON.stringify(logs).includes(badId), false);
    assert.equal(record.properties.client_id_number, badId);
  });

  test(`[BR5][3.16] BT/RBT: employee_id "${badId}" is an error with no CentralReach call`, async () => {
    const { container, cr } = setup();
    const record = stage3Bt({ employee_id: badId });
    const logs = [];
    const result = await runEmployeeSyncWorkflow(
      { recordId: "HS1", employeeType: "bt_rbt" },
      employeeWorkflowDeps({ record, logs })
    );

    assert.equal(result.status, "error");
    assert.equal(cr.calls.length, 0);
    assert.equal(record.properties.last_sync_status, "error");
    assert.equal(record.properties.last_sync_error, crIdNotDigits("employee_id"));
    assert.equal(container.get(BT_LINK.pk, BT_LINK.id), null);
    assert.equal(result.crContactId, null);
    assert.equal(JSON.stringify(logs).includes(badId), false);
  });

  test(`[BR5][3.16] BCBA: employee_id "${badId}" is an error with no CentralReach call`, async () => {
    const { container, cr } = setup();
    const record = stage3Bcba({ employee_id: badId });
    const result = await runEmployeeSyncWorkflow(
      { recordId: "HS2", employeeType: "bcba" },
      employeeWorkflowDeps({ record })
    );

    assert.equal(result.status, "error");
    assert.equal(cr.calls.length, 0);
    assert.equal(record.properties.last_sync_error, crIdNotDigits("employee_id"));
    assert.equal(container.get(BCBA_LINK.pk, BCBA_LINK.id), null);
  });
}

test("[BR5][3.16] Case: a digits-only client_id_number proceeds to the update of that client", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, clientWorkflowDeps({ record }));

  assert.equal(result.status, "success");
  const put = cr.calls.find((call) => call.name === "PUT /contacts/client/{id}");
  assert.equal(put.url.endsWith("/contacts/client/2001"), true);
});

test("[BR5][3.16] BT/RBT and BCBA: a digits-only employee_id proceeds to the update of that employee", async () => {
  const { cr } = setup();
  const bt = linkedBt(cr);
  const btResult = await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    employeeWorkflowDeps({ record: bt })
  );
  const bcba = linkedBcba(cr);
  const bcbaResult = await runEmployeeSyncWorkflow(
    { recordId: "HS2", employeeType: "bcba" },
    employeeWorkflowDeps({ record: bcba })
  );

  assert.equal(btResult.status, "success");
  assert.equal(bcbaResult.status, "success");
  const puts = cr.calls
    .filter((call) => call.name === "PUT /contacts/employee/{id}")
    .map((call) => call.url.split("/").at(-1));
  assert.deepEqual(puts, ["5001", "5002"]);
});

test("[BR6][3.16] a Case in an excluded stage gets no status write, also when its CR ID is not digits only", async () => {
  const { cr } = setup();
  const record = stage3Case({ client_id_number: "12a4", dealstage: "1383894301" });
  const result = await runClientSyncWorkflow({ dealId: "deal-1" }, clientWorkflowDeps({ record }));

  assert.equal(result.status, "skipped");
  assert.equal(record.writes.length, 0);
  assert.equal(cr.calls.length, 0);
});
