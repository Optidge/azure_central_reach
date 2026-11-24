// Stage 7, items 9 and 10 (build package 2026-11-23, GP §8): Grad Permit Holder 136052, Supervising
// BCBA 131308, the Outgoing BT roles, SUB, Outgoing SUB (288 / sandbox 221) and On Leave.
// Mapper tests call the real mapper with plain inputs. Worker tests fake only HubSpot (laneDFakes);
// the mapper, hash, cosmosState.mjs and centralReachClient.mjs (fake HTTP adapter) are real.
// No live call. Sandbox IDs: 247 Supervising, 217 SUB, 221 Outgoing SUB, 253 Outgoing
// Supervising, 233 On Leave, 244 / 236 Outgoing BT 1 / 2, 227 Grad Permit Supervisor.
import test from "node:test";
import assert from "node:assert/strict";
import { HUBSPOT_PORTALS } from "../../lib/config.mjs";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { omitFieldIdsFor, staffRecordIdsByRole } from "../../workflows/clientSyncInputs.mjs";
import {
  FIELD,
  ROLE_TYPE,
  SANDBOX_BCBA_TYPE,
  SANDBOX_BT_TYPE,
  caseDeps,
  caseStaff,
  logged,
  metadataWriteCount,
  refused,
  roleRow,
  sentValue
} from "./laneDFakes.mjs";
import { CASE_LINK, linkedCase, setup } from "./stage3WorkerFakes.mjs";

const run = (deps) => runClientSyncWorkflow({ dealId: "deal-1" }, deps);

const NO_STAFF = Object.freeze({
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

const person = (recordId, firstName, lastName) => ({ recordId, firstName, lastName });
const supervising = (recordId, firstName, lastName, gradPermitHolder = false, supervisors = []) => ({
  ...person(recordId, firstName, lastName),
  gradPermitHolder,
  supervisors
});

// coordinator_export_status no_owner: the Care Coordinator is sent blank (C10, item 6), so these
// tests see only the staff fields' warnings and omit list.
function mapped(staff, properties = {}) {
  return buildClientMetadata({
    deal: {
      id: "9001",
      properties: { hs_object_id: "9001", coordinator_export_status: "no_owner", ...properties }
    },
    portalId: "52311591",
    staffNames: { ...NO_STAFF, ...staff }
  });
}
const values = (staff, properties) => mapped(staff, properties).metadataValues;
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// --- mapper: C15 Outgoing BT ---

test("[C15] BT #1 Name joins Primary BT 1 and Outgoing BT 1, BT #2 Name joins Primary BT 2 and Outgoing BT 2, and an Outgoing BT alone still fills the field", () => {
  const both = values({
    primaryBt1: [person("30", "Pat", "Doe")],
    outgoingBt1: [person("4", "Sam", "Roe")],
    primaryBt2: [person("50", "Kim", "Vos")],
    outgoingBt2: [person("60", "Lee", "Poe")]
  });
  assert.equal(both[FIELD.bt1], "Sam Roe, Pat Doe");
  assert.equal(both[FIELD.bt2], "Kim Vos, Lee Poe");

  const outgoingOnly = values({ outgoingBt1: [person("4", "Sam", "Roe")] });
  assert.equal(outgoingOnly[FIELD.bt1], "Sam Roe");
  assert.equal(outgoingOnly[FIELD.bt2], null);
});

test("[C15] the same BT on Primary BT 1 and Outgoing BT 1 is named once in BT #1 Name", () => {
  const sent = values({
    primaryBt1: [person("30", "Pat", "Doe")],
    outgoingBt1: [person("30", "Pat", "Doe")]
  });
  assert.equal(sent[FIELD.bt1], "Pat Doe");
});

test("[C15] a nameless Outgoing BT leaves BT #1 Name out, names the role in the warning, and the worker's omit list holds the field", () => {
  const staffNames = {
    ...NO_STAFF,
    primaryBt1: [person("30", "Pat", "Doe")],
    outgoingBt1: [person("31", null, " ")]
  };
  const result = mapped(staffNames);
  assert.equal(has(result.metadataValues, FIELD.bt1), false);
  assert.deepEqual(
    result.warnings.map((warning) => [warning.code, warning.role]),
    [["staff_name_unreadable", "outgoingBt1"]]
  );
  assert.equal(omitFieldIdsFor({ staffNames }).includes(String(FIELD.bt1)), true);
});

// --- mapper: C12 Supervising BCBA order and suffix ---

test("[C12][C16] Supervising BCBA 131308 takes the first present of Supervising (82), SUB (234), Outgoing SUB (288) and Outgoing Supervising (135), each name + \" BCBA LBA\"", () => {
  const all = {
    supervisingBcba: [supervising("10", "Ann", "Super")],
    subBcba: [person("11", "Ben", "Sub")],
    outgoingSubBcba: [person("12", "Cat", "Outsub")],
    outgoingSupervisingBcba: [person("13", "Dan", "Outgoing")]
  };
  assert.equal(values(all)[FIELD.supervising], "Ann Super BCBA LBA");
  assert.equal(values({ ...all, supervisingBcba: [] })[FIELD.supervising], "Ben Sub BCBA LBA");
  assert.equal(
    values({ outgoingSubBcba: all.outgoingSubBcba, outgoingSupervisingBcba: all.outgoingSupervisingBcba })[
      FIELD.supervising
    ],
    "Cat Outsub BCBA LBA"
  );
  assert.equal(
    values({ outgoingSupervisingBcba: all.outgoingSupervisingBcba })[FIELD.supervising],
    "Dan Outgoing BCBA LBA"
  );
  // The supplier is only the fallback: a supervising BCBA wins over it.
  assert.equal(
    values({ supervisingBcba: all.supervisingBcba }, { ongoing_central_reach_provider_supplier: "Jane Doe" })[
      FIELD.supervising
    ],
    "Ann Super BCBA LBA"
  );
});

test("[C12] two Supervising BCBAs, neither a Grad Permit holder, are sent as \"A One BCBA LBA, B Two BCBA LBA\" in record-ID order, with single spaces", () => {
  const sent = values({
    supervisingBcba: [supervising("20", "B", "Two"), supervising("9", "A", "One")]
  });
  assert.equal(sent[FIELD.supervising], "A One BCBA LBA, B Two BCBA LBA");
  assert.equal(sent[FIELD.gradPermit], null);
  assert.equal(
    values({ supervisingBcba: [supervising("9", "Madeline  Sell", "")] })[FIELD.supervising],
    "Madeline Sell BCBA LBA"
  );
});

test("[C12] with no BCBA in the four supervising roles, the typed supplier gets \" BCBA LBA\" unless it already holds BCBA or LBA as a word", () => {
  const cases = [
    ["Jane Doe", "Jane Doe BCBA LBA"],
    ["  Jane Doe,  ", "Jane Doe BCBA LBA"],
    ["Jane Doe BCBA", "Jane Doe BCBA"],
    ["Jane Doe, BCBA, LBA", "Jane Doe, BCBA, LBA"],
    ["jane doe lba", "jane doe lba"],
    ["Jane BCBAson", "Jane BCBAson BCBA LBA"]
  ];
  for (const [typed, expected] of cases) {
    const sent = values({}, { ongoing_central_reach_provider_supplier: typed });
    assert.equal(sent[FIELD.supervising], expected, String(typed));
  }
});

test("[C12] with no BCBA in the four supervising roles, a blank typed supplier sends nothing: 131308 is left out of the write and in the worker's omit list, with no warning", () => {
  for (const typed of [",", "", "  ", null, undefined]) {
    const result = mapped({}, { ongoing_central_reach_provider_supplier: typed });
    assert.equal(has(result.metadataValues, FIELD.supervising), false, String(typed));
    assert.deepEqual(result.warnings, [], String(typed));
    const deal = { properties: { ongoing_central_reach_provider_supplier: typed } };
    assert.equal(omitFieldIdsFor({ staffNames: NO_STAFF, deal }).includes(String(FIELD.supervising)), true, String(typed));
  }
  // A filled supplier is not in the omit list.
  const filled = { properties: { ongoing_central_reach_provider_supplier: "Jane Doe" } };
  assert.equal(omitFieldIdsFor({ staffNames: NO_STAFF, deal: filled }).includes(String(FIELD.supervising)), false);
});

test("[C16] On Leave BCBA is never read: staffRecordIdsByRole lists the new roles (USER_DEFINED only) and no On Leave role, so an On Leave BCBA alone sends the supplier fallback", () => {
  const idsByRole = staffRecordIdsByRole({
    bcbaAssociations: [
      roleRow("41", ROLE_TYPE.sub),
      roleRow("42", ROLE_TYPE.outgoingSub),
      roleRow("43", ROLE_TYPE.outgoingSupervising),
      roleRow("44", ROLE_TYPE.onLeave),
      { toObjectId: "45", types: [{ typeId: ROLE_TYPE.supervising, category: "HUBSPOT_DEFINED" }] }
    ],
    btRbtAssociations: [roleRow("61", ROLE_TYPE.outgoingBt1), roleRow("62", ROLE_TYPE.outgoingBt2)],
    roleTypeIds: {
      supervisingBcba: ROLE_TYPE.supervising,
      subBcba: ROLE_TYPE.sub,
      outgoingSubBcba: ROLE_TYPE.outgoingSub,
      outgoingSupervisingBcba: ROLE_TYPE.outgoingSupervising,
      onLeaveBcba: ROLE_TYPE.onLeave,
      outgoingBt1: ROLE_TYPE.outgoingBt1,
      outgoingBt2: ROLE_TYPE.outgoingBt2
    }
  });
  assert.deepEqual(idsByRole, {
    ...NO_STAFF,
    subBcba: ["41"],
    outgoingSubBcba: ["42"],
    outgoingSupervisingBcba: ["43"],
    outgoingBt1: ["61"],
    outgoingBt2: ["62"]
  });
  assert.equal(has(idsByRole, "onLeaveBcba"), false);
});

// STF-032: type 236 is Outgoing BT 2 (Case -> BT/RBT) in the sandbox and On Leave BCBA (Case ->
// BCBA) in production. A role is read only from the rows of its own target object.
test("[C16] a role ID is read only from its own target's rows: a BCBA row typed 236 is not Outgoing BT 2 in the sandbox, and a BT/RBT row typed 236 is no role in production", () => {
  const sandbox = HUBSPOT_PORTALS["52311591"].staffingRoleAssociationTypeIds;
  const production = HUBSPOT_PORTALS["50317927"].staffingRoleAssociationTypeIds;
  assert.equal(sandbox.outgoingBt2, 236);
  assert.equal(production.onLeaveBcba, 236);
  const rolesOf = (roleTypeIds, { bcbaRows = [], btRows = [] }) =>
    staffRecordIdsByRole({ bcbaAssociations: bcbaRows, btRbtAssociations: btRows, roleTypeIds });

  assert.deepEqual(rolesOf(sandbox, { bcbaRows: [roleRow("41", 236)] }), NO_STAFF);
  assert.deepEqual(rolesOf(sandbox, { btRows: [roleRow("61", 236)] }), { ...NO_STAFF, outgoingBt2: ["61"] });
  assert.deepEqual(rolesOf(production, { btRows: [roleRow("61", 236)] }), NO_STAFF);
  assert.deepEqual(rolesOf(production, { bcbaRows: [roleRow("41", 236)] }), NO_STAFF);
});

test("[C12][C16] a Case whose only BCBA is On Leave sends the supplier fallback \"Jane Doe BCBA LBA\" to 131308, and the On Leave BCBA's name is in no field", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { ongoing_central_reach_provider_supplier: "Jane Doe" });
  const staff = caseStaff({
    bcbaRows: [roleRow("44", ROLE_TYPE.onLeave)],
    names: { 44: { first_name: "Olive", last_name: "Onleave", lba_licensure__ny: "Grad Permit" } }
  });
  const result = await run(caseDeps({ record, staff }));

  assert.equal(result.status, "success");
  assert.equal(sentValue(cr, FIELD.supervising), "Jane Doe BCBA LBA");
  // Never read, so never sent: no batch read asks for 44, and no request carries the name.
  assert.equal(staff.calls.batch.some((call) => call.ids.includes("44")), false);
  assert.deepEqual(staff.calls.bcbaLinks, []);
  const requests = JSON.stringify(cr.calls.map((call) => call.body ?? null));
  assert.equal(requests.includes("Olive"), false);
  assert.equal(requests.includes("Onleave"), false);
});

// --- mapper: C13 Grad Permit ---

test("[C13] a Grad Permit holder on Supervising BCBA: 136052 is \"First Last Grad Permit Holder\" and 131308 is the Grad Permit Supervisor + \" BCBA LBA\", never the holder's own name", () => {
  const sent = values(
    {
      supervisingBcba: [
        supervising("10", "Dana", "Holder", true, [person("70", "Amy", "Supervisor")])
      ]
    },
    { ongoing_central_reach_provider_supplier: "Dana Holder" }
  );
  assert.equal(sent[FIELD.gradPermit], "Dana Holder Grad Permit Holder");
  assert.equal(sent[FIELD.supervising], "Amy Supervisor BCBA LBA");
  assert.equal(sent[FIELD.supervising].includes("Holder"), false);
});

test("[C13] a Supervising BCBA that is not a holder sends a blank 136052 with its key present, and its own name to 131308", () => {
  const sent = values({ supervisingBcba: [supervising("10", "Dana", "Plain")] });
  assert.equal(has(sent, FIELD.gradPermit), true);
  assert.equal(sent[FIELD.gradPermit], null);
  assert.equal(sent[FIELD.supervising], "Dana Plain BCBA LBA");
  // No Supervising BCBA at all: 136052 is blank too.
  assert.equal(values({})[FIELD.gradPermit], null);
});

test("[C13] a holder with no Grad Permit Supervisor link: 131308 is left out with the warning grad_permit_supervisor_missing (no name), 136052 is still sent, and the omit list holds 131308", () => {
  const staffNames = {
    ...NO_STAFF,
    supervisingBcba: [supervising("10", "Dana", "Holder", true, [])]
  };
  const result = mapped(staffNames, { ongoing_central_reach_provider_supplier: "Jane Doe" });
  assert.equal(has(result.metadataValues, FIELD.supervising), false);
  assert.equal(result.metadataValues[FIELD.gradPermit], "Dana Holder Grad Permit Holder");
  assert.deepEqual(
    result.warnings.map((warning) => [warning.code, warning.role]),
    [["grad_permit_supervisor_missing", "supervisingBcba"]]
  );
  assert.equal(JSON.stringify(result.warnings).includes("Dana"), false);
  const omit = omitFieldIdsFor({ staffNames });
  assert.equal(omit.includes(String(FIELD.supervising)), true);
  assert.equal(omit.includes(String(FIELD.gradPermit)), false);
});

test("[C13] a holder's name is single-spaced in 136052 as in 131308 (\"Dana  Mae\" -> \"Dana Mae\")", () => {
  const sent = values({
    supervisingBcba: [supervising("10", "Dana  Mae", "Holder", true, [person("70", "Amy", "Super  Visor")])]
  });
  assert.equal(sent[FIELD.gradPermit], "Dana Mae Holder Grad Permit Holder");
  assert.equal(sent[FIELD.supervising], "Amy Super Visor BCBA LBA");
});

test("[C13] two Supervising BCBAs, both holders: 136052 names both in record-ID order and 131308 is the union of their supervisors, deduped by record ID", () => {
  const shared = person("70", "Amy", "Supervisor");
  const sent = values({
    supervisingBcba: [
      supervising("20", "B", "Two", true, [shared, person("80", "Zed", "Second")]),
      supervising("9", "A", "One", true, [shared])
    ]
  });
  assert.equal(sent[FIELD.gradPermit], "A One Grad Permit Holder, B Two Grad Permit Holder");
  assert.equal(sent[FIELD.supervising], "Amy Supervisor BCBA LBA, Zed Second BCBA LBA");
});

test("[C12][C13] rule 7: two Supervising BCBAs, one a holder and one not: 131308 and 136052 are both left out and in the omit list, with one warning grad_permit_mixed_supervising_bcba that names no one", () => {
  const staffNames = {
    ...NO_STAFF,
    supervisingBcba: [
      supervising("9", "A", "One", true, [person("70", "Amy", "Supervisor")]),
      supervising("20", "B", "Two")
    ]
  };
  const properties = { ongoing_central_reach_provider_supplier: " Jane Doe " };
  const result = mapped(staffNames, properties);
  assert.equal(has(result.metadataValues, FIELD.supervising), false);
  assert.equal(has(result.metadataValues, FIELD.gradPermit), false);
  assert.deepEqual(
    result.warnings.map((warning) => [warning.code, warning.role]),
    [["grad_permit_mixed_supervising_bcba", "supervisingBcba"]]
  );
  for (const name of ["One", "Two", "Amy", "Jane"]) {
    assert.equal(JSON.stringify(result.warnings).includes(name), false, name);
  }
  const omit = omitFieldIdsFor({ staffNames, deal: { properties } });
  assert.equal(omit.includes(String(FIELD.gradPermit)), true);
  assert.equal(omit.includes(String(FIELD.supervising)), true);
});

// --- worker: the reads ---

// A Case with Supervising BCBA 301; 301 is a holder when `licence` is "Grad Permit".
function gradPermitCase({ licence = "Grad Permit", links = [roleRow("701", ROLE_TYPE.gradPermitSupervisor)], ...rest } = {}) {
  return caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.supervising)],
    btRows: [roleRow("501", ROLE_TYPE.bt1)],
    names: {
      301: { first_name: "Dana", last_name: "Holder", lba_licensure__ny: licence },
      501: { first_name: "Sam", last_name: "Rivera" },
      701: { first_name: "Amy", last_name: "Supervisor" }
    },
    bcbaLinks: { 301: links },
    ...rest
  });
}

test("[C13] the BCBA batch read asks first_name, last_name and lba_licensure__ny only; the BT/RBT read first_name and last_name; the Grad Permit Supervisor read is listAssociations BCBA to BCBA for the holder, keeping only USER_DEFINED 227", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = gradPermitCase({
    links: [
      roleRow("701", ROLE_TYPE.gradPermitSupervisor),
      // The supervisee side (226), a HUBSPOT_DEFINED 227 and an unlabeled link are not supervisors.
      roleRow("702", 226),
      { toObjectId: "703", types: [{ typeId: ROLE_TYPE.gradPermitSupervisor, category: "HUBSPOT_DEFINED" }] },
      roleRow("704")
    ]
  });
  const result = await run(caseDeps({ record, staff }));

  assert.equal(result.status, "success");
  const bcbaReads = staff.calls.batch.filter((call) => call.objectTypeId === SANDBOX_BCBA_TYPE);
  const btReads = staff.calls.batch.filter((call) => call.objectTypeId === SANDBOX_BT_TYPE);
  assert.deepEqual(bcbaReads[0].properties, ["first_name", "last_name", "lba_licensure__ny"]);
  for (const name of ["lba_licensure__nj", "lba_licensure__co", "ny_bcba_a_grad_permit_holder", "grad_permit_status"]) {
    assert.equal(staff.calls.batch.some((call) => call.properties.includes(name)), false, name);
  }
  assert.deepEqual(btReads.map((call) => call.properties), [["first_name", "last_name"]]);
  assert.deepEqual(staff.calls.bcbaLinks, [{ fromId: "301", toObjectType: SANDBOX_BCBA_TYPE }]);
  // The supervisors' names: one batch read of the kept link only.
  assert.deepEqual(bcbaReads[1], { objectTypeId: SANDBOX_BCBA_TYPE, ids: ["701"], properties: ["first_name", "last_name"] });
  assert.equal(sentValue(cr, FIELD.gradPermit), "Dana Holder Grad Permit Holder");
  assert.equal(sentValue(cr, FIELD.supervising), "Amy Supervisor BCBA LBA");
});

test("[C13] lba_licensure__ny is the only holder test: Yes, In Process, No or blank is not a holder, and no BCBA to BCBA read is made", async () => {
  for (const licence of ["Yes", "In Process", "No", null]) {
    const { cr } = setup();
    const record = linkedCase(cr);
    const staff = gradPermitCase({ licence });
    const result = await run(caseDeps({ record, staff }));
    assert.equal(result.status, "success", String(licence));
    assert.deepEqual(staff.calls.bcbaLinks, [], String(licence));
    assert.equal(sentValue(cr, FIELD.supervising), "Dana Holder BCBA LBA", String(licence));
    assert.equal(metadataWriteCount(cr, FIELD.gradPermit, "PUT"), 0, String(licence));
  }
});

test("[C13] a \"Grad Permit\" licence on a BCBA outside Supervising BCBA (SUB) is not a holder: no BCBA to BCBA read, its own name to 131308 and no 136052", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = caseStaff({
    bcbaRows: [roleRow("341", ROLE_TYPE.sub)],
    names: { 341: { first_name: "Sid", last_name: "Sub", lba_licensure__ny: "Grad Permit" } },
    bcbaLinks: { 341: [roleRow("701", ROLE_TYPE.gradPermitSupervisor)] }
  });
  const result = await run(caseDeps({ record, staff }));

  assert.equal(result.status, "success");
  assert.deepEqual(staff.calls.bcbaLinks, []);
  assert.equal(sentValue(cr, FIELD.supervising), "Sid Sub BCBA LBA");
  assert.equal(metadataWriteCount(cr, FIELD.gradPermit, "PUT"), 0);
});

test("[C12][C13] rule 7, mixed Case through the worker: no Grad Permit Supervisor read is made, 131308 and 136052 are neither sent nor cleared, their saved hashes are kept, and the warning is logged", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr, { ongoing_central_reach_provider_supplier: " Jane Doe " });
  const savedHash = (fieldId) =>
    container.get(CASE_LINK.pk, CASE_LINK.id).data.fieldHashes[`metadata.${fieldId}`];

  // 1. One holder with a supervisor: both fields are sent and their hashes saved.
  await run(caseDeps({ record, staff: gradPermitCase() }));
  assert.equal(sentValue(cr, FIELD.supervising), "Amy Supervisor BCBA LBA");
  assert.equal(sentValue(cr, FIELD.gradPermit), "Dana Holder Grad Permit Holder");
  const hashes = [savedHash(FIELD.supervising), savedHash(FIELD.gradPermit)];
  assert.equal(hashes.every((hash) => typeof hash === "string"), true);
  const writesBefore = cr.writes().length;

  // 2. A second Supervising BCBA that is not a holder: the mixed Case.
  const logs = [];
  const staff = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.supervising), roleRow("302", ROLE_TYPE.supervising)],
    names: {
      301: { first_name: "Dana", last_name: "Holder", lba_licensure__ny: "Grad Permit" },
      302: { first_name: "Lee", last_name: "Plain", lba_licensure__ny: "Yes" }
    },
    bcbaLinks: { 301: [roleRow("701", ROLE_TYPE.gradPermitSupervisor)] }
  });
  const deps = caseDeps({ record, logs, staff });
  const listAssociations = deps.listAssociations;
  deps.listAssociations = async (request) => {
    if (request.fromObjectType === SANDBOX_BCBA_TYPE) {
      staff.calls.bcbaLinks.push({ fromId: request.fromId, toObjectType: request.toObjectType });
      throw refused(403);
    }
    return listAssociations(request);
  };
  const result = await run(deps);

  assert.equal(result.status, "success");
  assert.deepEqual(staff.calls.bcbaLinks, []);
  // Only the staff read: no second BCBA batch read for supervisors.
  assert.equal(staff.calls.batch.filter((call) => call.objectTypeId === SANDBOX_BCBA_TYPE).length, 1);
  for (const fieldId of [FIELD.supervising, FIELD.gradPermit]) {
    assert.equal(metadataWriteCount(cr, fieldId, "DELETE"), 0, String(fieldId));
  }
  const newWrites = JSON.stringify(cr.writes().slice(writesBefore));
  for (const name of ["Jane", "Dana", "Lee", "Amy"]) {
    assert.equal(newWrites.includes(name), false, name);
  }
  assert.deepEqual([savedHash(FIELD.supervising), savedHash(FIELD.gradPermit)], hashes);
  const warnings = logged(logs, "Client metadata mapper warning.");
  assert.deepEqual(warnings.map((entry) => entry.meta.code), ["grad_permit_mixed_supervising_bcba"]);
  assert.equal(JSON.stringify(warnings).includes("Dana"), false);
});

test("[C13] a BCBA answer without the lba_licensure__ny key is a failed read: the run stops with no CentralReach write", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = caseStaff({
    bcbaRows: [roleRow("301", ROLE_TYPE.supervising)],
    names: { 301: { first_name: "Dana", last_name: "Holder" } },
    licenceKey: false
  });
  await assert.rejects(run(caseDeps({ record, staff })), (error) => error.code === "HUBSPOT_READ_FAILED");
  assert.deepEqual(cr.writes(), []);
});

test("[C13] a refused Grad Permit Supervisor read (403) stops the run with no CentralReach write", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  const staff = gradPermitCase();
  const deps = caseDeps({ record, staff });
  const listAssociations = deps.listAssociations;
  deps.listAssociations = async (request) => {
    if (request.fromObjectType === SANDBOX_BCBA_TYPE) {
      throw refused(403);
    }
    return listAssociations(request);
  };
  await assert.rejects(run(deps), (error) => error.code === "HUBSPOT_READ_FAILED");
  assert.deepEqual(cr.writes(), []);
});

test("[C12][C13] a holder with no Grad Permit Supervisor link leaves 131308 untouched and keeps its saved hash; a later Case with no BCBA and a blank supplier still sends no clear", async () => {
  const { container, cr } = setup();
  const record = linkedCase(cr);
  const logs = [];
  const hashOf = () => container.get(CASE_LINK.pk, CASE_LINK.id).data.fieldHashes[`metadata.${FIELD.supervising}`];

  // 1. Not a holder: the 82 BCBA's own name is sent and its hash saved.
  await run(caseDeps({ record, staff: gradPermitCase({ licence: "Yes" }) }));
  assert.equal(sentValue(cr, FIELD.supervising), "Dana Holder BCBA LBA");
  const savedHash = hashOf();
  assert.equal(typeof savedHash, "string");

  // 2. A holder with no 151 / 227 link: 131308 is not sent, not cleared; the hash stays.
  const writesBefore = metadataWriteCount(cr, FIELD.supervising, "PUT");
  const result = await run(caseDeps({ record, logs, staff: gradPermitCase({ links: [] }) }));
  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.supervising, "PUT"), writesBefore);
  assert.equal(metadataWriteCount(cr, FIELD.supervising, "DELETE"), 0);
  assert.equal(hashOf(), savedHash);
  assert.equal(sentValue(cr, FIELD.gradPermit), "Dana Holder Grad Permit Holder");
  const warnings = logged(logs, "Client metadata mapper warning.");
  assert.deepEqual(warnings.map((entry) => entry.meta.code), ["grad_permit_supervisor_missing"]);
  assert.equal(JSON.stringify(warnings).includes("Dana"), false);

  // 3. The BCBA is removed and the supplier is blank: a blank supplier sends nothing (insert E),
  // so CentralReach keeps the value the integration wrote and the saved hash stays.
  const removed = await run(caseDeps({ record, staff: caseStaff() }));
  assert.equal(removed.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.supervising, "DELETE"), 0);
  assert.equal(metadataWriteCount(cr, FIELD.supervising, "PUT"), writesBefore);
  assert.equal(hashOf(), savedHash);
});

test("[C13] when the Supervising BCBA's licence leaves Grad Permit, the next Case sync clears 136052 and sends the BCBA's own name to 131308", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  await run(caseDeps({ record, staff: gradPermitCase() }));
  assert.equal(sentValue(cr, FIELD.gradPermit), "Dana Holder Grad Permit Holder");
  assert.equal(sentValue(cr, FIELD.supervising), "Amy Supervisor BCBA LBA");

  const result = await run(caseDeps({ record, staff: gradPermitCase({ licence: "Yes" }) }));
  assert.equal(result.status, "success");
  assert.equal(metadataWriteCount(cr, FIELD.gradPermit, "DELETE"), 1);
  assert.equal(sentValue(cr, FIELD.supervising), "Dana Holder BCBA LBA");
});

test("[BR17][C16] removing the Outgoing SUB BCBA label (221, production 288) changes the compared state and Supervising BCBA in one run", async () => {
  const { cr } = setup();
  const record = linkedCase(cr, { ongoing_central_reach_provider_supplier: "Jane Doe" });
  const withOutgoingSub = caseStaff({
    bcbaRows: [roleRow("320", ROLE_TYPE.outgoingSub)],
    names: { 320: { first_name: "Cat", last_name: "Outsub" } }
  });
  await run(caseDeps({ record, staff: withOutgoingSub }));
  assert.equal(sentValue(cr, FIELD.supervising), "Cat Outsub BCBA LBA");

  const removed = await run(caseDeps({ record, staff: caseStaff() }));
  assert.equal(removed.status, "success");
  assert.equal(removed.changedFieldNames.some((name) => name.startsWith("relationships")), true);
  assert.equal(sentValue(cr, FIELD.supervising), "Jane Doe BCBA LBA");
});

// STF-085: a label that feeds no field still changes the compared state (BR17), so it costs one
// Case update with no value change. This pins that cost.
test("[BR17] an On Leave BCBA added alone (233) changes only the relationships: four CentralReach calls, one of them a write (the client PUT), no metadata or label write, then a no-op", async () => {
  const { cr } = setup();
  const record = linkedCase(cr);
  await run(caseDeps({ record }));
  assert.equal((await run(caseDeps({ record }))).operation, "noop");

  const onLeave = () => caseStaff({ bcbaRows: [roleRow("44", ROLE_TYPE.onLeave)] });
  const start = cr.calls.length;
  const changed = await run(caseDeps({ record, staff: onLeave() }));
  assert.equal(changed.status, "success");
  assert.equal(changed.operation, "update");
  assert.deepEqual(changed.changedFieldNames, ["relationships"]);
  assert.deepEqual(
    cr.calls.slice(start).map((call) => call.name),
    [
      "GET /contacts/client/byExternalSystemId",
      "GET /contacts/client/{id}",
      "PUT /contacts/client/{id}",
      "GET /contacts/{id}/labels"
    ]
  );

  const again = cr.calls.length;
  assert.equal((await run(caseDeps({ record, staff: onLeave() }))).operation, "noop");
  assert.equal(cr.calls.length, again);
});
