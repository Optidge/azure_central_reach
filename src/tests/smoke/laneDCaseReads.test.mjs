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
import { httpError, hubspotAnswer, workflowConfig } from "./stage2Fakes.mjs";
import {
  CASE_LINK,
  METADATA_DELETE,
  METADATA_PUT,
  linkedCase,
  setup,
  stage3Case
} from "./stage3WorkerFakes.mjs";

const SEVERITY = CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL;
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

test("[C11][4.14] one batch call per object type, asking only first_name and last_name, and none for a type with no staff on the Case", async () => {
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
      properties: ["first_name", "last_name"]
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
  const record = linkedCase(cr);
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

test("[BR16][4.14] when the staff cannot be read at all (no object types), the four staff fields are omitted, not sent blank", () => {
  const omit = omitFieldIdsFor({ base: [], staffNames: undefined });
  assert.deepEqual(
    omit.map(Number).sort((a, b) => a - b),
    [FIELD.ia, FIELD.re, FIELD.bt1, FIELD.bt2].sort((a, b) => a - b)
  );
  // Staff that were read add nothing; the seam's list is kept as it is.
  assert.deepEqual(omitFieldIdsFor({ base: [111], staffNames: { primaryBt1: [] } }), ["111"]);
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
  assert.deepEqual(idsByRole, {
    initialAssessmentBcba: ["3"],
    reEvaluationBcba: ["3", "12"],
    primaryBt1: [],
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

// --- 4.16: the Care Coordinator (decision 39: the Case property care_coordinator_name) ---

// HubSpot's answer to the Case read, every requested key there except `name`.
function answerWithout(record, name) {
  return async (_id, requested) => {
    const answer = hubspotAnswer(record.read(), requested);
    delete answer.properties[name];
    return answer;
  };
}

test("[C10][4.16] the Care Coordinator is the text of the Case property care_coordinator_name, trimmed and sent to field 138851", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { care_coordinator_name: "  Casey Jordan  " });
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(sentValue(cr, FIELD.careCoordinator), "Casey Jordan");
});

test("[C10][4.16] a changed care_coordinator_name sends the new value to field 138851", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { care_coordinator_name: "Casey Jordan" });
  await run(record, caseDeps({ record }));
  const putsBefore = metadataWriteCount(cr, FIELD.careCoordinator, "PUT");

  record.properties.care_coordinator_name = "Riley Chen";
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), putsBefore + 1);
  assert.equal(sentValue(cr, FIELD.careCoordinator), "Riley Chen");
});

for (const blank of [null, ""]) {
  test(`[C10][4.16] a blank care_coordinator_name (${JSON.stringify(blank)}) is a real blank: a name written before is cleared, like any mapped text field`, async () => {
    const { cr } = setup();
    const record = linkedCase(cr, { care_coordinator_name: "Casey Jordan" });
    await run(record, caseDeps({ record }));
    assert.equal(sentValue(cr, FIELD.careCoordinator), "Casey Jordan");

    record.properties.care_coordinator_name = blank;
    const result = await run(record, caseDeps({ record }));

    assert.equal(result.status, "success");
    assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 1);
  });
}

test("[C10][4.16] a blank care_coordinator_name with no saved copy sends no clear", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { care_coordinator_name: null });
  const result = await run(record, caseDeps({ record }));

  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "PUT"), 0);
  assert.equal(metadataWriteCount(cr, FIELD.careCoordinator, "DELETE"), 0);
});

test("[BR16][4.18] an answer without the care_coordinator_name key ends as error with no CentralReach call", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { care_coordinator_name: "Casey Jordan" });
  const result = await run(
    record,
    caseDeps({ record, getDealById: answerWithout(record, "care_coordinator_name") })
  );

  assert.equal(result.status, "error");
  assert.deepEqual(cr.calls, []);
  assert.equal(record.properties.last_sync_error, "Missing from the HubSpot answer: care_coordinator_name");
  assert.equal(container.get(CASE_LINK.pk, CASE_LINK.id)?.data?.fieldHashes, undefined);
});

test("[C10][4.16] the Case run never calls the owners API (/crm/v3/owners) and requests neither hubspot_owner_id nor care_coordinator_email", async () => {
  const { cr } = setup();
  // Every HubSpot request the worker makes outside the fakes reaches this adapter.
  const hubspotRequests = [];
  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  client.defaults.adapter = answeringPortalCheck(async (requestConfig) => {
    hubspotRequests.push(`${requestConfig.method} ${requestConfig.url}`);
    throw httpError(599);
  });
  const record = linkedCase(cr, { care_coordinator_name: "Casey Jordan", hubspot_owner_id: "9001" });
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
  assert.equal(requested.includes("care_coordinator_name"), true);
  assert.equal(requested.includes("hubspot_owner_id"), false);
  assert.equal(requested.includes("care_coordinator_email"), false);
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

test("[BR16][4.18] the mapped list and the request list are what row 4.18 checks: care_coordinator_name is a mapped property; hubspot_owner_id and care_coordinator_email are not requested", () => {
  assert.equal(CASE_PROPERTIES.mapped.includes("care_coordinator_name"), true);
  assert.equal(caseRequestProperties().includes("hubspot_owner_id"), false);
  assert.equal(caseRequestProperties().includes("care_coordinator_email"), false);
  assert.deepEqual(missingMappedProperties({}), [...CASE_PROPERTIES.mapped]);
  assert.deepEqual(missingMappedProperties(null), [...CASE_PROPERTIES.mapped]);
});
