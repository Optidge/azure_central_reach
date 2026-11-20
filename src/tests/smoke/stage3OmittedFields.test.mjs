// Stage 3, row 3.18 (BUILD-PLAN.md section 11; review finding SP-R1; contract P.5 (c)): a field in
// the run's omit list keeps its saved hash, so a later blank in HubSpot still sends the clear.
// Guide: Change detection Architecture tab, "Minimum changes": "Distinguish an intentional blank
// from a failed or unauthorized read ... never convert that failure into destination clears."
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
//
// How a field gets into the omit list in these tests: no read of the Case worker can fail into
// an omit yet (rows 4.16 and 6.4 add those reads in wave 2), and the one employee omit that
// exists (the missing-portal warning) cannot happen with a valid portal setting. So the worker
// tests pass the omit list in through `dependencies.omitFieldIds`, the same list those rows fill.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CENTRAL_REACH_CLIENT_METADATA_FIELDS,
  CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS
} from "../../constants/centralReach.mjs";
import {
  changedNamesFromHashes,
  explicitMetadata,
  fieldHashes,
  keepOmittedFieldHashes,
  metadataClearFieldIds
} from "../../lib/mappedState.mjs";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runEmployeeSyncWorkflow } from "../../workflows/employeeSyncWorkflow.mjs";
import { clientWorkflowDeps, employeeWorkflowDeps } from "./stage2Fakes.mjs";
import {
  BCBA_LINK,
  BT_LINK,
  CASE_LINK,
  METADATA_DELETE,
  METADATA_PUT,
  counters,
  linkedBcba,
  linkedCase,
  setup,
  stage3Bt
} from "./stage3WorkerFakes.mjs";

const SEVERITY = CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL;
const MEDICAID_NY = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY;
const BT_RECORD_LINK = CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD;

function fieldIdsOf(calls, name) {
  return calls
    .filter((call) => call.name === name)
    .map((call) => Number(call.url.split("/").at(-1)));
}

function savedHash(container, link, fieldId) {
  return container.get(link.pk, link.id).data.fieldHashes[`metadata.${fieldId}`];
}

test("[BR16][3.18] the helper, three compares with the real hash: synced, omitted (hash kept, not changed), blank (the clear is found)", () => {
  const known = [101, 102];
  const stateOf = (values, omit = []) => ({ metadata: explicitMetadata(values, known, omit) });

  // Run 1: both values are synced and their hashes saved.
  const saved = fieldHashes(stateOf({ 101: "Level 1", 102: "kept" }));

  // Run 2: field 101 could not be read. It is not in the compared state at all.
  const omittedState = stateOf({ 102: "kept" }, [101]);
  const withoutHelper = fieldHashes(omittedState);
  assert.deepEqual(changedNamesFromHashes(saved, withoutHelper), ["metadata.101"]);
  const kept = keepOmittedFieldHashes(withoutHelper, saved, [101]);
  assert.equal(kept["metadata.101"], saved["metadata.101"]);
  assert.deepEqual(changedNamesFromHashes(saved, kept), []);

  // Run 3: the read works again and HubSpot is blank. The saved copy still shows a value the
  // integration wrote, so the clear is sent.
  const blankState = stateOf({ 101: null, 102: "kept" });
  assert.deepEqual(metadataClearFieldIds(kept, blankState.metadata), [101]);
  assert.deepEqual(changedNamesFromHashes(kept, fieldHashes(blankState)), ["metadata.101"]);
  // Without the helper the saved hash is gone after run 2 and the clear is never sent (SP-R1).
  assert.deepEqual(metadataClearFieldIds(withoutHelper, blankState.metadata), []);
});

test("[BR16][3.18] the helper adds nothing for an omitted field that has no saved hash, and takes field IDs as numbers or text", () => {
  const next = { "metadata.102": "h2" };
  assert.deepEqual(keepOmittedFieldHashes(next, null, [101]), next);
  assert.deepEqual(keepOmittedFieldHashes(next, { "metadata.102": "h2" }, [101]), next);
  assert.deepEqual(keepOmittedFieldHashes(next, { "metadata.101": "h1" }, ["101"]), {
    "metadata.101": "h1",
    "metadata.102": "h2"
  });
});

test("[BR16][3.18] Case, three runs: a value is synced; the field is omitted (no write, the saved hash stays); HubSpot is blank (the clear is sent)", async () => {
  const { container, cr } = setup();
  // Guide stored values of severity_level_clinical: Level 1, Level 2, Level 3.
  const record = linkedCase(cr, { severity_level_clinical: "Level 2" });
  const count = counters({ container, cr, record });
  const run = (extra = {}) =>
    runClientSyncWorkflow({ dealId: "deal-1" }, { ...clientWorkflowDeps({ record }), ...extra });

  // Run 1: the value is synced.
  let start = count.mark();
  await run();
  assert.equal(fieldIdsOf(count.since(start).crCalls, METADATA_PUT).includes(SEVERITY), true);
  const hashAfterSync = savedHash(container, CASE_LINK, SEVERITY);
  assert.equal(typeof hashAfterSync, "string");

  // Run 2: the field's input could not be read. What HubSpot seems to hold does not count.
  record.properties.severity_level_clinical = "";
  start = count.mark();
  const omitted = await run({ omitFieldIds: [SEVERITY] });
  let done = count.since(start);
  assert.equal(omitted.operation, "noop");
  assert.deepEqual(done.crCalls, []);
  assert.equal(done.hubspotWrites.length, 0);
  assert.equal(done.stateWrites.length, 0);
  assert.equal(savedHash(container, CASE_LINK, SEVERITY), hashAfterSync);

  // Run 3: the read works and HubSpot is blank.
  start = count.mark();
  const cleared = await run();
  done = count.since(start);
  assert.equal(cleared.status, "success");
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_DELETE), [SEVERITY]);
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_PUT), []);
});

test("[BR16][3.18] Case: when another field changes in the run that omits a field, the omitted field is not sent, not cleared, and keeps its saved hash", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { severity_level_clinical: "Level 2" });
  const count = counters({ container, cr, record });
  await runClientSyncWorkflow({ dealId: "deal-1" }, clientWorkflowDeps({ record }));
  const hashAfterSync = savedHash(container, CASE_LINK, SEVERITY);

  record.properties.severity_level_clinical = "";
  record.properties.policy_holder_name = "Sam Rivera";
  const start = count.mark();
  const result = await runClientSyncWorkflow(
    { dealId: "deal-1" },
    { ...clientWorkflowDeps({ record }), omitFieldIds: [SEVERITY] }
  );
  const done = count.since(start);

  assert.equal(result.status, "success");
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_PUT), [
    CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_NAME
  ]);
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_DELETE), []);
  assert.equal(savedHash(container, CASE_LINK, SEVERITY), hashAfterSync);
});

test("[BR16][3.18] BCBA, three runs: a value is synced; the field is omitted (no write, the saved hash stays); HubSpot is blank (the clear is sent)", async () => {
  const { container, cr } = setup();
  const record = linkedBcba(cr, { medicaid_id__ny: "NY-0001" });
  const count = counters({ container, cr, record });
  const run = (extra = {}) =>
    runEmployeeSyncWorkflow(
      { recordId: "HS2", employeeType: "bcba" },
      { ...employeeWorkflowDeps({ record }), ...extra }
    );

  let start = count.mark();
  await run();
  assert.equal(fieldIdsOf(count.since(start).crCalls, METADATA_PUT).includes(MEDICAID_NY), true);
  const hashAfterSync = savedHash(container, BCBA_LINK, MEDICAID_NY);
  assert.equal(typeof hashAfterSync, "string");

  record.properties.medicaid_id__ny = "";
  start = count.mark();
  const omitted = await run({ omitFieldIds: [MEDICAID_NY] });
  let done = count.since(start);
  assert.equal(omitted.operation, "noop");
  assert.deepEqual(done.crCalls, []);
  assert.equal(done.hubspotWrites.length, 0);
  assert.equal(done.stateWrites.length, 0);
  assert.equal(savedHash(container, BCBA_LINK, MEDICAID_NY), hashAfterSync);

  start = count.mark();
  const cleared = await run();
  done = count.since(start);
  assert.equal(cleared.status, "success");
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_DELETE), [MEDICAID_NY]);
  assert.deepEqual(fieldIdsOf(done.crCalls, METADATA_PUT), []);
});

test("[BR16][3.18] BT/RBT: the record link omitted by the missing-portal warning does not make a run a write, and its saved hash stays", async () => {
  // The real mapper is wrapped to raise the one warning that fills the omit list today, as it
  // does when the portal ID is blank. Everything else it returns is the real mapping.
  const { container, cr } = setup();
  const record = stage3Bt();
  const count = counters({ container, cr, record });
  await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    employeeWorkflowDeps({ record })
  );
  const hashAfterSync = savedHash(container, BT_LINK, BT_RECORD_LINK);
  assert.equal(typeof hashAfterSync, "string");

  const start = count.mark();
  const result = await runEmployeeSyncWorkflow(
    { recordId: "HS1", employeeType: "bt_rbt" },
    {
      ...employeeWorkflowDeps({ record }),
      buildEmployeePayload: (input) => {
        const mapped = buildEmployeePayload(input);
        delete mapped.metadataValues[BT_RECORD_LINK];
        mapped.warnings.push({ code: "missing_hubspot_portal_id" });
        return mapped;
      }
    }
  );
  const done = count.since(start);

  assert.equal(result.operation, "noop");
  assert.deepEqual(done.crCalls, []);
  assert.equal(done.hubspotWrites.length, 0);
  assert.equal(done.stateWrites.length, 0);
  assert.equal(savedHash(container, BT_LINK, BT_RECORD_LINK), hashAfterSync);
});
