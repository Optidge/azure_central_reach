// Lane D (wave 2), Case worker: rows 4.14 (staff names), 4.16 (Care Coordinator) and 4.18 (a missing
// property is a failed read), with the wave 1 duties of WAVE-1-LOG section 7 (C-R1, C-R6, C-R7,
// SP-R7, the omit list). Guide rows: [GER-CASE] and [G04] (staffing from associations, the role
// association IDs), the Architecture tab (staffing compared by record ID and role; a failed or
// refused read is never a clear).
// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory
// container) and centralReachClient.mjs (fake HTTP adapter) are real. No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { CENTRAL_REACH_CLIENT_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import { CASE_PROPERTIES, caseRequestProperties } from "../../mappings/client/clientProperties.mjs";
import * as hubspotClient from "../../lib/hubspotClient.mjs";
import { createHubSpotClient, readObjectsBatch } from "../../lib/hubspotClient.mjs";
import { answeringPortalCheck, portalCheckedHubSpotConfig } from "./hubspotPortalCheckFake.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import {
  DECISION_PROPERTIES,
  missingMappedProperties,
  omitFieldIdsFor,
  readStaffNames,
  staffRecordIdsByRole
} from "../../workflows/clientSyncInputs.mjs";
import {
  FIELD,
  ROLE_TYPE,
  SANDBOX_BCBA_TYPE,
  SANDBOX_BT_TYPE,
  caseDeps,
  logged,
  metadataWriteCount,
  refused,
  roleRow,
  sentValue,
  caseStaff
} from "./laneDFakes.mjs";
import { httpError, hubspotAnswer, timeoutError, workflowConfig } from "./stage2Fakes.mjs";
import {
  CASE_LINK,
  METADATA_DELETE,
  METADATA_PUT,
  linkedCase,
  setup,
  stage3Case
} from "./stage3WorkerFakes.mjs";

const SEVERITY = CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL;
// Every role the worker reads, nobody in it.
const EMPTY_STAFF_NAMES = Object.freeze({
  initialAssessmentBcba: [],
  reEvaluationBcba: [],
  supervisingBcba: [],
  subBcba: [],
  outgoingSubBcba: [],
  outgoingSupervisingBcba: [],
  primaryBt1: [],
  primaryBt2: [],
  outgoingBt1: [],
  outgoingBt2: []
});
const run = (record, deps) => runClientSyncWorkflow({ dealId: "deal-1" }, deps);

// --- 4.14: staff names ---

test("[C11][4.14] the IA and RE BCBA names are read from the Case's BCBA associations by role and sent to fields 131314 and 144602", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia), roleRow("302", ROLE_TYPE.re)],
    names: {
      301: { first_name: "Pat", last_name: "Morgan" },
      302: { first_name: "Lee", last_name: "Ortiz" }
    }
  });
  const result = await run(record, caseDeps({ record, staff }));

  assert.equal(result.status, "success");
  assert.equal(sentValue(cr, FIELD.ia), "Pat Morgan");
  assert.equal(sentValue(cr, FIELD.re), "Lee Ortiz");
});

test("[C14][4.14] Primary BT 1 and 2 names are read from the BT/RBT associations and sent to fields 131313 and 138092", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = caseStaff({
    btRows: [roleRow("501", ROLE_TYPE.bt1), roleRow("502", ROLE_TYPE.bt2)],
    names: {
      501: { first_name: "Sam", last_name: "Rivera" },
      502: { first_name: "Dana", last_name: "Kim" }
    }
  });
  await run(record, caseDeps({ record, staff }));

  assert.equal(sentValue(cr, FIELD.bt1), "Sam Rivera");
  assert.equal(sentValue(cr, FIELD.bt2), "Dana Kim");
});

test("[C14][4.14] several staff in one role are joined by \", \" in record-ID order", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  // Record 10 comes after record 9 in number order, not in text order.
  const staff = caseStaff({
    btRows: [roleRow("10", ROLE_TYPE.bt1), roleRow("9", ROLE_TYPE.bt1)],
    names: {
      9: { first_name: "Nine", last_name: "Staff" },
      10: { first_name: "Ten", last_name: "Staff" }
    }
  });
  await run(record, caseDeps({ record, staff }));

  assert.equal(sentValue(cr, FIELD.bt1), "Nine Staff, Ten Staff");
});

test("[C11][4.14] only a USER_DEFINED association type is a role: a HUBSPOT_DEFINED type with the same ID is not", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = caseStaff({
    bcbaRows: [
      { toObjectId: "301", types: [{ typeId: ROLE_TYPE.ia, category: "HUBSPOT_DEFINED" }] },
      roleRow("302", ROLE_TYPE.ia)
    ],
    names: {
      301: { first_name: "Not", last_name: "ARole" },
      302: { first_name: "Pat", last_name: "Morgan" }
    }
  });
  await run(record, caseDeps({ record, staff }));

  assert.equal(sentValue(cr, FIELD.ia), "Pat Morgan");
  // Only the staff holding a role are read.
  assert.deepEqual(staff.calls.batch[0].ids, ["302"]);
});

test("[C11][4.14] with no Grad Permit holder, one staff batch call per object type, asking first_name and last_name (and the BCBA's lba_licensure__ny), and none for a type with no staff on the Case", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia), roleRow("302", ROLE_TYPE.re)],
    names: {
      301: { first_name: "Pat", last_name: "Morgan" },
      302: { first_name: "Lee", last_name: "Ortiz" }
    }
  });
  await run(record, caseDeps({ record, staff }));

  assert.deepEqual(staff.calls.batch, [
    {
      objectTypeId: SANDBOX_BCBA_TYPE,
      ids: ["301", "302"],
      // Item 9: the BCBA read has its own list with the Grad Permit holder test.
      properties: ["first_name", "last_name", "lba_licensure__ny"]
    }
  ]);
  assert.equal(staff.calls.batch.some((call) => call.objectTypeId === SANDBOX_BT_TYPE), false);
});

test("[C11][4.14] no staff in a role sends a blank field, and a name the integration wrote before is cleared", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const named = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia)],
    names: { 301: { first_name: "Pat", last_name: "Morgan" } }
  });
  await run(record, caseDeps({ record, staff: named }));
  assert.equal(sentValue(cr, FIELD.ia), "Pat Morgan");

  // The association is removed: nobody holds the role. The read worked, so this is a real blank.
  await run(record, caseDeps({ record, staff: caseStaff() }));
  assert.equal(metadataWriteCount(cr, FIELD.ia, "DELETE"), 1);
});

test("[BR16][4.14] a refused association read (403) stops the run: no CentralReach write, no clear, nothing saved as synced", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const staff = caseStaff();
  const deps = caseDeps({
    record,
    staff,
    listAssociations: async () => {
      throw refused(403);
    }
  });
  await assert.rejects(run(record, deps), (error) => {
    assert.equal(error.code, "HUBSPOT_READ_FAILED");
    assert.equal(classifyFailure(error), FAILURE_KINDS.TEMPORARY);
    return true;
  });
  assert.deepEqual(cr.writes(), []);
  assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id)?.data?.fieldHashes, undefined);
});

test("[BR16][4.14] a refused name read (403) stops the run with no CentralReach write", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = caseStaff({ bcbaRows: [roleRow("301", ROLE_TYPE.ia)] });
  const deps = caseDeps({
    record,
    staff,
    readObjectsBatch: async () => {
      throw refused(403);
    }
  });
  await assert.rejects(run(record, deps), (error) => error.code === "HUBSPOT_READ_FAILED");
  assert.deepEqual(cr.writes(), []);
});

test("[BR16][4.14] a staff record the batch answer lacks is a failed read, not a blank name", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  // Record 302 holds the role but the batch answer has no row for it.
  const staff = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia), roleRow("302", ROLE_TYPE.re)],
    names: { 301: { first_name: "Pat", last_name: "Morgan" } }
  });
  await assert.rejects(run(record, caseDeps({ record, staff })), (error) => {
    assert.equal(error.code, "HUBSPOT_READ_FAILED");
    return true;
  });
  assert.deepEqual(cr.writes(), []);
});

test("[BR16][4.14] a staff record whose name keys are missing from the batch answer is a failed read", async () => {
  for (const properties of [{}, { first_name: "Pat" }, { last_name: "Morgan" }]) {
    const { cr } = setup();
    const record = linkedCase(cr);
    const staff = caseStaff({
      btRows: [roleRow("501", ROLE_TYPE.bt1)],
      names: { 501: properties }
    });
    await assert.rejects(
      run(record, caseDeps({ record, staff })),
      (error) => error.code === "HUBSPOT_READ_FAILED"
    );
    assert.deepEqual(cr.writes(), []);
  }
});

test("[BR16][4.14] a staff name that is null in HubSpot (a blank, not a missing key) is a nameless record: the field is left out, not cleared", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const named = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia)],
    names: { 301: { first_name: "Pat", last_name: "Morgan" } }
  });
  await run(record, caseDeps({ record, staff: named }));
  const savedHash = container.get(CASE_LINK.pk, CASE_LINK.id).data.fieldHashes[`metadata.${FIELD.ia}`];
  assert.equal(typeof savedHash, "string");

  const logs = [];
  const nameless = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia)],
    names: { 301: { first_name: null, last_name: null } }
  });
  const writesBefore = cr.writes().length;
  const result = await run(record, caseDeps({ record, logs, staff: nameless }));

  // C-R6: the mapper's warning is logged by code and role, never a name. No write, no clear, and
  // the saved hash stays, so a later real blank still sends its clear.
  assert.equal(result.operation, "noop");
  assert.equal(cr.writes().length, writesBefore);
  assert.equal(
    container.get(CASE_LINK.pk, CASE_LINK.id).data.fieldHashes[`metadata.${FIELD.ia}`],
    savedHash
  );
  const warnings = logged(logs, "Client metadata mapper warning.");
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].level, "warn");
  assert.equal(warnings[0].meta.code, "staff_name_unreadable");
  assert.equal(warnings[0].meta.role, "initialAssessmentBcba");
  assert.equal(JSON.stringify(warnings[0].meta).includes("Pat"), false);
});

test("[BR17][4.14] staffing is compared by record ID and role: a new record with the same name is a change; the same record renamed sends the new name", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staffOf = (recordId, last) =>
    caseStaff({
      bcbaRows: [roleRow(recordId, ROLE_TYPE.ia)],
      names: { [recordId]: { first_name: "Pat", last_name: last } }
    });
  await run(record, caseDeps({ record, staff: staffOf("301", "Morgan") }));

  // The same name, another record: not a no-op.
  const replaced = await run(record, caseDeps({ record, staff: staffOf("302", "Morgan") }));
  assert.equal(replaced.status, "success");
  assert.equal(replaced.changedFieldNames.some((name) => name.startsWith("relationships")), true);

  // The same record with a new name: the new name is sent.
  const renamed = await run(record, caseDeps({ record, staff: staffOf("302", "Stone") }));
  assert.equal(renamed.status, "success");
  assert.equal(sentValue(cr, FIELD.ia), "Pat Stone");

  // Nothing changed: a no-op.
  const same = await run(record, caseDeps({ record, staff: staffOf("302", "Stone") }));
  assert.equal(same.operation, "noop");
});

test("[BR17][4.14] both mappings of one run get the same staffNames and omitFieldIds, so the run does not end as changed during the run", async () => {
  const { cr } = setup();
  // A typed supplier, so 131308 is sent (a blank one with no BCBA is left out, insert E).
  const record = linkedCase(cr, { ongoing_central_reach_provider_supplier: "Jane Doe" });
  const inputs = [];
  const staff = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.ia), roleRow("302", ROLE_TYPE.re)],
    names: {
      301: { first_name: "Pat", last_name: "Morgan" },
      // A nameless record: its field is omitted, so the omit list is not empty.
      302: { first_name: null, last_name: null }
    }
  });
  const result = await run(
    record,
    caseDeps({
      record,
      staff,
      omitFieldIds: [FIELD.bt2],
      buildClientMetadata: (input) => {
        inputs.push(input);
        return buildClientMetadata(input);
      }
    })
  );

  assert.equal(result.status, "success");
  assert.equal(inputs.length, 2);
  assert.deepEqual(inputs[1].staffNames, inputs[0].staffNames);
  assert.deepEqual(inputs[1].omitFieldIds, inputs[0].omitFieldIds);
  assert.equal(inputs[0].portalId, inputs[1].portalId);
  // The seam's field and the nameless role's field are both in the list.
  assert.deepEqual(
    inputs[0].omitFieldIds.map(Number).sort((a, b) => a - b),
    [FIELD.re, FIELD.bt2].sort((a, b) => a - b)
  );
});

// A Case reader whose second answer (the confirm read after the writes) holds `change`.
function changedOnConfirmRead(record, change) {
  let reads = 0;
  return async (_id, requested) => {
    reads += 1;
    const answer = record.read();
    if (reads === 2) {
      Object.assign(answer.properties, change);
    }
    return hubspotAnswer(answer, requested);
  };
}

test("[C12] a typed supplier filled in between the first read and the confirm read ends the run as changed during the run (SYNC_STALE), not success", async () => {
  const { cr } = setup();
  // No BCBA and a blank supplier: 131308 is left out on the first read (insert E).
  const record = linkedCase(cr, { ongoing_central_reach_provider_supplier: null });
  await assert.rejects(
    run(
      record,
      caseDeps({
        record,
        getDealById: changedOnConfirmRead(record, {
          ongoing_central_reach_provider_supplier: "Jane Doe"
        })
      })
    ),
    (error) => error.code === "SYNC_STALE"
  );
  assert.equal(metadataWriteCount(cr, FIELD.supervising, "PUT"), 0);
});

test("[C10] a Care Coordinator that turns ready between the first read and the confirm read ends the run as changed during the run (SYNC_STALE), not success", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Casey", "Jordan", "refreshing"));
  await assert.rejects(
    run(
      record,
      caseDeps({
        record,
        getDealById: changedOnConfirmRead(record, { coordinator_export_status: "ready" })
      })
    ),
    (error) => error.code === "SYNC_STALE"
  );
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), 0);
});

test("[BR16][4.14] when the staff cannot be read at all (no object types), the staff fields are omitted, not sent blank", () => {
  // The Care Coordinator is sent (no_owner), so only the staff fields are in the list.
  const noOwner = { properties: { coordinator_export_status: "no_owner" } };
  const omit = omitFieldIdsFor({ base: [], staffNames: undefined, deal: noOwner });
  // Item 9: Supervising BCBA 131308 and Grad Permit Holder 136052 are built from the staff too.
  assert.deepEqual(
    omit.map(Number).sort((a, b) => a - b),
    [FIELD.ia, FIELD.re, FIELD.bt1, FIELD.bt2, FIELD.supervising, FIELD.gradPermit].sort((a, b) => a - b)
  );
  // Staff that were read add nothing; the seam's list is kept as it is. (The Case has a typed
  // supplier: with none and no BCBA, 131308 is left out too, insert E.)
  const deal = {
    properties: { ongoing_central_reach_provider_supplier: "Jane Doe", coordinator_export_status: "no_owner" }
  };
  assert.deepEqual(omitFieldIdsFor({ base: [111], staffNames: EMPTY_STAFF_NAMES, deal }), ["111"]);
});

test("[C10][3.18] the omit list holds 138851 when the Care Coordinator is not ready, whether or not the staff were read, and not when it is ready or no_owner", () => {
  const caseWith = (properties) => ({ properties });
  const COORDINATOR = String(FIELD.careCoordinator);
  for (const staffNames of [undefined, EMPTY_STAFF_NAMES]) {
    for (const status of ["missing_match", "refreshing", null]) {
      const deal = caseWith({ coordinator_export_status: status, care_coordinator_first_name: "Casey" });
      assert.equal(omitFieldIdsFor({ staffNames, deal }).includes(COORDINATOR), true, String(status));
    }
    const readyNoName = caseWith({ coordinator_export_status: "ready" });
    assert.equal(omitFieldIdsFor({ staffNames, deal: readyNoName }).includes(COORDINATOR), true);
    for (const properties of [
      { coordinator_export_status: "ready", care_coordinator_last_name: "Jordan" },
      { coordinator_export_status: "no_owner" }
    ]) {
      assert.equal(
        omitFieldIdsFor({ staffNames, deal: caseWith(properties) }).includes(COORDINATOR),
        false,
        JSON.stringify(properties)
      );
    }
  }
});

test("[C11][4.14] staffRecordIdsByRole reads the portal's role IDs for a BCBA role and a BT/RBT role, in record-ID order", () => {
  const idsByRole = staffRecordIdsByRole({
    bcbaAssociations: [roleRow("12", ROLE_TYPE.re), roleRow("3", ROLE_TYPE.re, ROLE_TYPE.ia)],
    btRbtAssociations: [roleRow("501", ROLE_TYPE.bt2)],
    roleTypeIds: {
      initialAssessmentBcba: ROLE_TYPE.ia,
      reEvaluationBcba: ROLE_TYPE.re,
      primaryBt1: ROLE_TYPE.bt1,
      primaryBt2: ROLE_TYPE.bt2
    }
  });
  // Items 9 and 10: the new roles are listed too, empty here (no type ID passed for them).
  assert.deepEqual(idsByRole, {
    ...EMPTY_STAFF_NAMES,
    initialAssessmentBcba: ["3"],
    reEvaluationBcba: ["3", "12"],
    primaryBt2: ["501"]
  });
});

test("[C11][4.14] readObjectsBatch posts one batch read per 100 IDs, asks for the listed properties, and throws on a 403 or an answer with no results", async () => {
  const requests = [];
  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  let mode = "ok";
  client.defaults.adapter = answeringPortalCheck(async (requestConfig) => {
    const body = JSON.parse(requestConfig.data);
    requests.push({ url: requestConfig.url, method: requestConfig.method, body });
    if (mode === "403") {
      throw httpError(403);
    }
    return {
      data: mode === "empty" ? {} : { results: body.inputs.map(({ id }) => ({ id, properties: { first_name: "A", last_name: "B" } })) },
      status: 200,
      headers: {},
      config: requestConfig
    };
  });
  const ids = Array.from({ length: 150 }, (_, index) => String(1000 + index));
  const rows = await readObjectsBatch({
    objectTypeId: SANDBOX_BCBA_TYPE,
    ids,
    properties: ["first_name", "last_name"]
  });
  assert.equal(rows.length, 150);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body.inputs.length, 100);
  assert.deepEqual(requests[0].body.properties, ["first_name", "last_name"]);
  assert.equal(requests[0].url, `/crm/v3/objects/${SANDBOX_BCBA_TYPE}/batch/read`);

  for (const failing of ["403", "empty"]) {
    mode = failing;
    await assert.rejects(
      readObjectsBatch({ objectTypeId: SANDBOX_BCBA_TYPE, ids: ["1"], properties: ["first_name"] }),
      (error) => error.code === "HUBSPOT_READ_FAILED"
    );
  }
});

test("[C11][4.14] readStaffNames makes no call for a type with no staff and keeps record-ID order inside a role", async () => {
  const calls = [];
  const staffNames = await readStaffNames({
    idsByRole: {
      initialAssessmentBcba: [],
      reEvaluationBcba: [],
      primaryBt1: ["8", "20"],
      primaryBt2: []
    },
    bcbaObjectTypeId: SANDBOX_BCBA_TYPE,
    btRbtObjectTypeId: SANDBOX_BT_TYPE,
    readBatch: async (request) => {
      calls.push(request.objectTypeId);
      return request.ids.map((id) => ({ id, properties: { first_name: `F${id}`, last_name: `L${id}` } }));
    }
  });
  assert.deepEqual(calls, [SANDBOX_BT_TYPE]);
  assert.deepEqual(staffNames.primaryBt1, [
    { recordId: "8", firstName: "F8", lastName: "L8" },
    { recordId: "20", firstName: "F20", lastName: "L20" }
  ]);
  assert.deepEqual(staffNames.initialAssessmentBcba, []);
});

// --- 4.16: the Care Coordinator (item 6: the coordinator workflow's fields; was decision 39) ---

// HubSpot's answer to the Case read, every requested key there except `name`.
function answerWithout(record, name) {
  return async (_id, requested) => {
    const answer = hubspotAnswer(record.read(), requested);
    delete answer.properties[name];
    return answer;
  };
}

// O-17 (11.a, 11.b): 138851 holds first name, last name and email, one per line.
const COORDINATOR_EMAIL = "coordinator@example.com";
const coordinator = (first, last, status = "ready", email = COORDINATOR_EMAIL) => ({
  care_coordinator_first_name: first,
  care_coordinator_last_name: last,
  care_coordinator_email: email,
  coordinator_export_status: status
});
const lines = (first, last) => `${first}\n${last}\n${COORDINATOR_EMAIL}`;
const savedCoordinatorHash = (container) =>
  container.get(CASE_LINK.pk, CASE_LINK.id).data.fieldHashes[`metadata.${FIELD.careCoordinator}`];

test("[C10][4.16] a ready Care Coordinator sends \"<first>\\n<last>\\n<email>\", trimmed, to field 138851", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("  Casey ", " Jordan  "));
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("Casey", "Jordan"));
});

test("[C10][4.16] a changed Care Coordinator name sends the new value to field 138851", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Casey", "Jordan"));
  await run(record, caseDeps({ record }));
  const putsBefore = metadataWriteCount(cr, FIELD.careCoordinator, "PUT");

  Object.assign(record.properties, coordinator("Riley", "Chen"));
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), putsBefore + 1);
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("Riley", "Chen"));
});

test("[C10][4.16] a changed Care Coordinator email alone (names the same) sends one PUT to field 138851 with the new three-line value", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Casey", "Jordan"));
  await run(record, caseDeps({ record }));
  const putsBefore = metadataWriteCount(cr, FIELD.careCoordinator, "PUT");
  const writesBefore = cr.writes().length;

  record.properties.care_coordinator_email = "casey.new@example.com";
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), putsBefore + 1);
  // The only metadata write of the run is 138851.
  const metadataWrites = cr.writes().slice(writesBefore).filter((call) => call.url.includes("/metadata/"));
  assert.deepEqual(
    metadataWrites.map((call) => `${call.method} ${call.url.split("/").at(-1)}`),
    [`PUT ${FIELD.careCoordinator}`]
  );
  assert.equal(sentValue(cr, FIELD.careCoordinator), "Casey\nJordan\ncasey.new@example.com");
});

test("[C10][4.16] a saved hash of the old one-line value \"Ann Lee\": the next ready run sends 138851 once in the three-line form, and the run after that is a noop", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Ann", "Lee", "ready", "ann.lee@example.com"));
  // The code before O-17 sent "<first> <last>" and saved that value's hash.
  const oneLineMapper = (input) => {
    const mapped = buildClientMetadata(input);
    mapped.metadataValues[FIELD.careCoordinator] = "Ann Lee";
    return mapped;
  };
  assert.equal(
    (await run(record, caseDeps({ record, buildClientMetadata: oneLineMapper }))).status,
    "success"
  );
  assert.equal(sentValue(cr, FIELD.careCoordinator), "Ann Lee");
  const putsBefore = metadataWriteCount(cr, FIELD.careCoordinator, "PUT");

  const result = await run(record, caseDeps({ record }));
  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), putsBefore + 1);
  assert.equal(sentValue(cr, FIELD.careCoordinator), "Ann\nLee\nann.lee@example.com");

  const writesBefore = cr.writes().length;
  const next = await run(record, caseDeps({ record }));
  assert.equal(next.operation, "noop");
  assert.equal(cr.writes().length, writesBefore);
});

test("[C10][4.16] status no_owner is a real blank: a name written before is cleared", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Casey", "Jordan"));
  await run(record, caseDeps({ record }));
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("Casey", "Jordan"));

  record.properties.coordinator_export_status = "no_owner";
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 1);
});

test("[C10][3.18] a Care Coordinator that is not ready (missing_match) after a name was written: no write, no clear, the saved hash stays, the warning names the status only; a later no_owner still sends the clear", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, coordinator("Casey", "Jordan"));
  await run(record, caseDeps({ record }));
  const savedHash = savedCoordinatorHash(container);
  assert.ok(savedHash);

  // The workflow is refreshing the coordinator: the names may be stale or blank.
  Object.assign(record.properties, coordinator("Riley", null, "missing_match"));
  const logs = [];
  const writesBefore = cr.writes().length;
  const result = await run(record, caseDeps({ record, logs }));

  assert.equal(result.operation, "noop");
  assert.equal(cr.writes().length, writesBefore);
  assert.equal(savedCoordinatorHash(container), savedHash);
  const warnings = logged(logs, "Client metadata mapper warning.");
  assert.deepEqual(
    warnings.map(({ meta }) => [meta.code, meta.property, meta.status]),
    [["care_coordinator_not_ready", "coordinator_export_status", "missing_match"]]
  );
  assert.equal(/Riley|Casey|Jordan|coordinator@/.test(JSON.stringify(warnings)), false);

  record.properties.coordinator_export_status = "no_owner";
  const cleared = await run(record, caseDeps({ record }));
  assert.equal(cleared.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 1);
});

test("[C10][3.18] a Case whose Care Coordinator was never written and is not ready (blank status) sends nothing to field 138851", async () => {
  const { cr } = setup();
  // care_coordinator_name (decision 39's source) is no longer read.
  const record = linkedCase(cr, { ...coordinator("Casey", "Jordan", null), care_coordinator_name: "Casey Jordan" });
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), 0);
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 0);
});

test("[C10][3.18] a linked Case with no_owner and no saved copy of 138851 sends no PUT and no DELETE to 138851, so a value entered in CentralReach stays", async () => {
  const { container, cr } = setup();
  // A clean run while the coordinator is not ready: a saved copy with no hash for 138851.
  const record = linkedCase(cr, coordinator("Casey", "Jordan", "missing_match"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  assert.equal(savedCoordinatorHash(container), undefined);

  record.properties.coordinator_export_status = "no_owner";
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), 0);
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 0);
});

const isStale = (error) => error.code === "SYNC_STALE";

test("[C10][3.18] a name sent by a run that then went stale is sent again once the coordinator is ready, also when it is back to the last clean value", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Old", "One"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  // The run sends "New Two"; the confirm read finds the workflow refreshing the old name.
  Object.assign(record.properties, coordinator("New", "Two"));
  const refreshingOld = changedOnConfirmRead(record, coordinator("Old", "One", "refreshing"));
  await assert.rejects(run(record, caseDeps({ record, getDealById: refreshingOld })), isStale);
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("New", "Two"));

  // The retry while refreshing: 138851 is left out and the run ends clean.
  Object.assign(record.properties, coordinator("Old", "One", "refreshing"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  const putsBefore = metadataWriteCount(cr, FIELD.careCoordinator, "PUT");

  // Ready with the old name: CentralReach may still hold "New Two", so the name is sent.
  record.properties.coordinator_export_status = "ready";
  const result = await run(record, caseDeps({ record }));
  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), putsBefore + 1);
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("Old", "One"));
});

test("[C10][3.18] a name first written by a run that then went stale is still cleared by a later no_owner, after a not-ready run in between", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("A", "B"));
  const notReady = changedOnConfirmRead(record, { coordinator_export_status: "missing_match" });
  await assert.rejects(run(record, caseDeps({ record, getDealById: notReady })), isStale);
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("A", "B"));

  record.properties.coordinator_export_status = "missing_match";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  record.properties.coordinator_export_status = "no_owner";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 1);
});

test("[C10][3.18] a no_owner run that failed before its clear was sent, then a not-ready run: a later no_owner still sends the clear", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Old", "One"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  record.properties.coordinator_export_status = "no_owner";
  cr.fail("PUT /contacts/client/{id}", timeoutError());
  await assert.rejects(run(record, caseDeps({ record })));
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 0);

  record.properties.coordinator_export_status = "refreshing";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  record.properties.coordinator_export_status = "no_owner";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 1);
});

test("[C10][3.18] two stale runs in a row (\"X One\", then \"Y Two\"), then a not-ready run: a later ready \"X One\" is sent again", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Old", "One"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  const refreshing = { coordinator_export_status: "refreshing" };
  for (const [first, last] of [["X", "One"], ["Y", "Two"]]) {
    Object.assign(record.properties, coordinator(first, last));
    const getDealById = changedOnConfirmRead(record, refreshing);
    await assert.rejects(run(record, caseDeps({ record, getDealById })), isStale);
  }
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("Y", "Two"));

  Object.assign(record.properties, refreshing);
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  Object.assign(record.properties, coordinator("X", "One"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("X", "One"));
});

// keepOmittedFieldHashes (src/lib/mappedState.mjs) after an unfinished run: the unsettled hash
// is kept only when the saved copy or the unfinished run holds a written value for 138851.
test("[C10][3.18] 138851 never written: a no_owner run that goes stale, then a refreshing run that ends clean: a later no_owner sends no DELETE, so a value entered in CentralReach stays", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Casey", "Jordan", "missing_match"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  record.properties.coordinator_export_status = "no_owner";
  const backToNotReady = changedOnConfirmRead(record, { coordinator_export_status: "missing_match" });
  await assert.rejects(run(record, caseDeps({ record, getDealById: backToNotReady })), isStale);

  record.properties.coordinator_export_status = "refreshing";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  record.properties.coordinator_export_status = "no_owner";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 0);
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), 0);
});

test("[C10][3.18] clean \"Old One\"; a no_owner run sends the DELETE and goes stale; a refreshing run ends clean: a later ready \"Old One\" is sent again", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Old", "One"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  const putsAfterFirst = metadataWriteCount(cr, FIELD.careCoordinator, "PUT");

  record.properties.coordinator_export_status = "no_owner";
  const backToReady = changedOnConfirmRead(record, { coordinator_export_status: "ready" });
  await assert.rejects(run(record, caseDeps({ record, getDealById: backToReady })), isStale);
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 1);

  record.properties.coordinator_export_status = "refreshing";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  // CentralReach holds no name after the DELETE, so the ready name is sent again.
  record.properties.coordinator_export_status = "ready";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), putsAfterFirst + 1);
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("Old", "One"));
});

test("[C10][3.18] clean \"Old One\"; a stale run with 138851 omitted, then a stale run that sends \"New Two\", then a refreshing run that ends clean: a later ready \"Old One\" is sent again", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, coordinator("Old", "One"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");

  // Another field changed while the coordinator was refreshing; the confirm read turns ready.
  Object.assign(record.properties, coordinator("Old", "One", "refreshing"), {
    severity_level_clinical: "Level 2"
  });
  const turnsReady = changedOnConfirmRead(record, { coordinator_export_status: "ready" });
  await assert.rejects(run(record, caseDeps({ record, getDealById: turnsReady })), isStale);

  Object.assign(record.properties, coordinator("New", "Two"));
  const refreshing = changedOnConfirmRead(record, { coordinator_export_status: "refreshing" });
  await assert.rejects(run(record, caseDeps({ record, getDealById: refreshing })), isStale);
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("New", "Two"));

  Object.assign(record.properties, coordinator("Old", "One", "refreshing"));
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  const putsBefore = metadataWriteCount(cr, FIELD.careCoordinator, "PUT");

  record.properties.coordinator_export_status = "ready";
  assert.equal((await run(record, caseDeps({ record }))).status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), putsBefore + 1);
  assert.equal(sentValue(cr, FIELD.careCoordinator), lines("Old", "One"));
});

test("[BR16][4.18] an answer without the coordinator_export_status key ends as error with no CentralReach call", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, coordinator("Casey", "Jordan"));
  const result = await run(
    record,
    caseDeps({ record, getDealById: answerWithout(record, "coordinator_export_status") })
  );

  assert.equal(result.status, "error");
  assert.deepEqual(cr.calls, []);
  assert.equal(
    record.properties.last_sync_error,
    "Missing from the HubSpot answer: coordinator_export_status"
  );
  assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id)?.data?.fieldHashes, undefined);
});

test("[C10][4.18] an answer without the care_coordinator_email key ends as error with no CentralReach call", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, coordinator("Casey", "Jordan"));
  const result = await run(
    record,
    caseDeps({ record, getDealById: answerWithout(record, "care_coordinator_email") })
  );

  assert.equal(result.status, "error");
  assert.deepEqual(cr.calls, []);
  assert.equal(
    record.properties.last_sync_error,
    "Missing from the HubSpot answer: care_coordinator_email"
  );
  assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id)?.data?.fieldHashes, undefined);
});

test("[C10][4.16] the Case run never calls the owners API (/crm/v3/owners) and requests neither hubspot_owner_id nor care_coordinator_name; it requests care_coordinator_email (O-17 11.a)", async () => {
  const { cr } = setup();
  // Every HubSpot request the worker makes outside the fakes reaches this adapter.
  const hubspotRequests = [];
  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  client.defaults.adapter = answeringPortalCheck(async (requestConfig) => {
    hubspotRequests.push(`${requestConfig.method} ${requestConfig.url}`);
    throw httpError(599);
  });
  const record = linkedCase(cr, { ...coordinator("Casey", "Jordan"), hubspot_owner_id: "9001" });
  const requested = [];
  const result = await run(
    record,
    caseDeps({
      record,
      getDealById: async (_id, properties) => {
        requested.push(...properties);
        return hubspotAnswer(record.read(), properties);
      }
    })
  );

  assert.equal(result.status, "success");
  assert.deepEqual(hubspotRequests, []);
  assert.equal(Object.hasOwn(hubspotClient, "getOwnerById"), false);
  assert.equal(requested.includes("coordinator_export_status"), true);
  assert.equal(requested.includes("hubspot_owner_id"), false);
  assert.equal(requested.includes("care_coordinator_name"), false);
  assert.equal(requested.includes("care_coordinator_email"), true);
});

// --- 4.18: a requested key that is missing from the answer ---

test("[BR16][4.18] a mapped property that is not a key of the HubSpot answer ends the run as error with no CentralReach write", async () => {
  // Every mapped property, one at a time: the real mapper, hash and CentralReach client run.
  for (const name of CASE_PROPERTIES.mapped) {
    const { container, cr } = setup();
    const record = linkedCase(cr);
    const logs = [];
    const result = await run(
      record,
      caseDeps({
        record,
        logs,
        getDealById: async (_id, requested) => {
          const answer = hubspotAnswer(record.read(), requested);
          delete answer.properties[name];
          return answer;
        }
      })
    );
    assert.equal(result.status, "error", name);
    assert.deepEqual(cr.writes(), [], name);
    assert.equal(record.properties.last_sync_status, "error", name);
    assert.equal(record.properties.last_sync_error.includes(name), true, name);
    assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id)?.data?.fieldHashes, undefined, name);
  }
});

test("[BR16][4.18] a blank property (a null key, or an empty text) is a real blank and still syncs", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { severity_level_clinical: null, policy_holder_name: "" });
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.deepEqual(missingMappedProperties(hubspotAnswer(record.read(), caseRequestProperties()).properties), []);
});

test("[BR16][4.18] a missing key never clears a value written before: no DELETE is sent", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { severity_level_clinical: "Level 2" });
  await run(record, caseDeps({ record }));
  const savedHash = container.get(CASE_LINK.pk, CASE_LINK.id).data.fieldHashes[`metadata.${SEVERITY}`] ?? null;
  assert.equal(cr.calls.some((call) => call.name === METADATA_PUT), true);

  const writesBefore = cr.writes().length;
  const result = await run(
    record,
    caseDeps({
      record,
      getDealById: async (_id, requested) => {
        const answer = hubspotAnswer(record.read(), requested);
        delete answer.properties.severity_level_clinical;
        return answer;
      }
    })
  );
  assert.equal(result.status, "error");
  assert.equal(cr.writes().length, writesBefore);
  assert.equal(cr.calls.some((call) => call.name === METADATA_DELETE), false);
  assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id).data.fieldHashes[`metadata.${SEVERITY}`] ?? null, savedHash);
});

test("[BR16][4.18] the error reason names properties, never values", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { policy_holder_name: "Jordan Distinctive" });
  const logs = [];
  await run(
    record,
    caseDeps({
      record,
      logs,
      getDealById: async (_id, requested) => {
        const answer = hubspotAnswer(record.read(), requested);
        delete answer.properties.referral_source;
        return answer;
      }
    })
  );
  assert.equal(record.properties.last_sync_error, "Missing from the HubSpot answer: referral_source");
  assert.equal(JSON.stringify(logs).includes("Jordan Distinctive"), false);
});

test("[BR16][4.18] phone_number__second_ is no longer requested from HubSpot (decision 36)", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const requested = [];
  await run(
    record,
    caseDeps({
      record,
      getDealById: async (_id, properties) => {
        requested.push(...properties);
        return hubspotAnswer(record.read(), properties);
      }
    })
  );
  assert.equal(requested.length > 0, true);
  assert.equal(requested.includes("phone_number__second_"), false);
});

test("[BR16][4.18] a Case the gate skips is skipped, not an error, even when the answer lacks mapped keys", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { dealstage: "1383894301" });
  const result = await run(
    record,
    caseDeps({
      record,
      getDealById: async (_id, requested) => {
        // Every key the gate and the status check read is there; no mapped property is.
        const answer = hubspotAnswer({ id: "deal-1", properties: {} }, DECISION_KEYS);
        answer.properties.dealstage = "1383894301";
        answer.properties.client_id_number = "2001";
        return answer;
      }
    })
  );
  assert.equal(result.status, "skipped");
  assert.deepEqual(cr.writes(), []);
});

// D-R1: the keys the worker decides from, besides the mapped ones.
const DECISION_KEYS = [...DECISION_PROPERTIES, "client_id_number"];

test("[BR16][4.18] an answer without the CR ID key (client_id_number) ends as error: no CentralReach call, no create, link record untouched", async () => {
  const { container, cr } = setup();
  // A client linked by hand: CentralReach holds 2001 with no External System ID.
  cr.clients.set("2001", { contactId: "2001", externalSystemId: null, primaryEmail: null });
  cr.labels.set("2001", [1052619]);
  const record = stage3Case({ client_id_number: "2001" });
  const logs = [];
  const result = await run(
    record,
    caseDeps({
      record,
      logs,
      getDealById: async (_id, requested) => {
        const answer = hubspotAnswer(record.read(), requested);
        delete answer.properties.client_id_number;
        return answer;
      }
    })
  );
  assert.equal(result.status, "error");
  assert.deepEqual(cr.calls, []);
  assert.equal(cr.count("POST /contacts/client"), 0);
  assert.equal(record.properties.last_sync_error, "Missing from the HubSpot answer: client_id_number");
  assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id)?.data?.fieldHashes, undefined);
});

test("[BR16][4.18] a null CR ID key still means not linked: the Case is looked up and created as before", async () => {
  const { cr } = setup();
  const record = stage3Case({ client_id_number: null });
  const result = await run(record, caseDeps({ record }));
  assert.equal(result.status, "success");
  assert.equal(result.operation, "create");
  assert.equal(cr.count("POST /contacts/client"), 1);
});

test("[BR16][4.18] a key the gate reads that is missing (dealstage, test_record, the entry property, the record gate property) is a failed read: nothing decided, nothing written to HubSpot or CentralReach", async () => {
  for (const key of ["dealstage", "test_record", "enter_in_central_reach", "last_sync_status", "last_sync_error", "sandbox_test_field"]) {
    const { cr } = setup();
    const record = linkedCase(cr, { sandbox_test_field: "true" });
    const config = { ...workflowConfig({ sync: { recordGateProperty: "sandbox_test_field" } }) };
    await assert.rejects(
      run(
        record,
        caseDeps({
          record,
          getConfig: () => config,
          getDealById: async (_id, requested) => {
            const answer = hubspotAnswer(record.read(), requested);
            delete answer.properties[key];
            return answer;
          }
        })
      ),
      (error) => error.code === "HUBSPOT_READ_FAILED",
      key
    );
    assert.deepEqual(cr.calls, [], key);
    assert.deepEqual(record.writes, [], key);
  }
});

// --- C-R1: an unreadable date ---

test("[BR16][4.18] a filled date that is not a real date ends the run as error with no CentralReach write; the reason names the property, never the value", async () => {
  // The guide's sandbox date format is YYYY-MM-DD; 2026-02-30 is not a calendar day.
  const dateProperties = [
    "ongoing_auth_period_start_date",
    "ongoing_autrh_period_end_date",
    "most_recent_asd_diagnosis_date_1",
    "most_recent_asd_diagnosis_date_medicaid",
    "phi__policy_holder_dob"
  ];
  for (const property of dateProperties) {
    const { container, cr } = setup();
    const record = linkedCase(cr, { [property]: "2026-02-30" });
    const logs = [];
    const result = await run(record, caseDeps({ record, logs }));

    assert.equal(result.status, "error", property);
    assert.deepEqual(cr.writes(), [], property);
    assert.equal(record.properties.last_sync_status, "error", property);
    assert.equal(record.properties.last_sync_error, `Unreadable date: ${property}`, property);
    assert.equal(JSON.stringify([record.properties.last_sync_error, logs]).includes("2026-02-30"), false, property);
    // The link record is untouched: no field hash saved as synced.
    assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id)?.data?.fieldHashes, undefined, property);
  }
});

test("[BR16][4.18] two unreadable dates are both named, and a readable date still syncs", async () => {
  const { cr } = setup();
  const bad = linkedCase(cr, {
    ongoing_auth_period_start_date: "tomorrow",
    most_recent_asd_diagnosis_date_1: "2026-13-01"
  });
  const result = await run(bad, caseDeps({ record: bad }));
  assert.equal(result.status, "error");
  assert.equal(
    bad.properties.last_sync_error,
    "Unreadable date: ongoing_auth_period_start_date, most_recent_asd_diagnosis_date_1"
  );

  const good = linkedCase(cr, { ongoing_auth_period_start_date: "2026-01-15", ongoing_autrh_period_end_date: "2026-07-14" });
  const ok = await run(good, caseDeps({ record: good }));
  assert.equal(ok.status, "success");
});

// --- the omit seam still works with the new reads ---

test("[BR16][3.18] dependencies.omitFieldIds still works with the new reads: the seam's field is left out", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { severity_level_clinical: "Level 2" });
  await run(record, caseDeps({ record, omitFieldIds: [SEVERITY] }));

  assert.equal(metadataWriteCount(cr, SEVERITY, "PUT"), 0);
});

test("[BR16][4.18] the mapped list and the request list are what row 4.18 checks: coordinator_export_status and care_coordinator_email are mapped properties; hubspot_owner_id is not requested", () => {
  assert.equal(CASE_PROPERTIES.mapped.includes("coordinator_export_status"), true);
  assert.equal(CASE_PROPERTIES.mapped.includes("care_coordinator_email"), true);
  assert.equal(caseRequestProperties().includes("hubspot_owner_id"), false);
  assert.deepEqual(missingMappedProperties({}), [...CASE_PROPERTIES.mapped]);
  assert.deepEqual(missingMappedProperties(null), [...CASE_PROPERTIES.mapped]);
});
