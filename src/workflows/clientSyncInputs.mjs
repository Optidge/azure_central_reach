// The inputs the Case worker reads before it maps (rows 4.14 and 4.18). The mapper reads no
// association and calls no API (contract P.5 (b) in src/mappings/client/buildClientMetadata.mjs),
// so the worker reads the staff names and passes them in. Every function here
// is given the HubSpot reader it uses, so a test passes a fake. Nothing here writes anywhere.
import { CASE_ENTRY_PROPERTY, TEST_RECORD_PROPERTY } from "../constants/hubspot.mjs";
import { HubSpotReadError } from "../lib/mappedState.mjs";
import { CASE_PROPERTIES } from "../mappings/client/clientProperties.mjs";
import { CENTRAL_REACH_CLIENT_METADATA_FIELDS } from "../constants/centralReach.mjs";
import {
  STAFF_FIELD_ROLES,
  careCoordinatorValue,
  gradPermitHolderValue,
  mixedGradPermitHolders,
  staffFieldsWithoutName,
  supervisingBcbaValue
} from "../mappings/client/buildClientMetadata.mjs";

// Row 4.18 (rule 5.8). HubSpot answers a blank property as a key with a null value (checked on
// 2026-11-20, P.7 (b)), so a property that is not a key of the answer was not read. It is not a
// blank and must never be sent as one.
export const PROPERTY_MISSING_CODE = "HUBSPOT_PROPERTY_MISSING";

export function missingProperties(properties, names) {
  const answer = properties && typeof properties === "object" ? properties : {};
  return names.filter((name) => !Object.hasOwn(answer, name));
}

export function missingMappedProperties(properties) {
  return missingProperties(properties, CASE_PROPERTIES.mapped);
}

// The requested properties, besides the mapped ones, that the worker decides from before it maps:
// the gate reads the entry property, the stage and the test-record flag, and the worker compares
// the status HubSpot shows with the one it would write. The configured CR ID property and the
// configured record gate property are added by the worker.
export const DECISION_PROPERTIES = Object.freeze([
  CASE_ENTRY_PROPERTY,
  "dealstage",
  TEST_RECORD_PROPERTY,
  "last_sync_status",
  "last_sync_error"
]);

// Row 4.14 (items 9 and 10). The staff roles, by the role association IDs of the portal
// (config.mjs). A role is a USER_DEFINED association type: a HUBSPOT_DEFINED type can carry the
// same ID. On Leave BCBA is never read (GP §4.3).
const BCBA_ROLES = Object.freeze([
  "initialAssessmentBcba",
  "reEvaluationBcba",
  "supervisingBcba",
  "subBcba",
  "outgoingSubBcba",
  "outgoingSupervisingBcba"
]);
const BT_RBT_ROLES = Object.freeze(["primaryBt1", "primaryBt2", "outgoingBt1", "outgoingBt2"]);
const USER_DEFINED = "USER_DEFINED";

// The names every staff batch read asks for. The BCBA read also asks for the Grad Permit holder
// test (item 9 rule 1); the BT/RBT read does not, and is never checked for it.
const NAME_PROPERTIES = Object.freeze(["first_name", "last_name"]);
const GRAD_PERMIT_LICENCE_PROPERTY = "lba_licensure__ny";
const GRAD_PERMIT_LICENCE_VALUE = "Grad Permit";
const BCBA_PROPERTIES = Object.freeze([...NAME_PROPERTIES, GRAD_PERMIT_LICENCE_PROPERTY]);

function byRecordId(left, right) {
  return left.localeCompare(right, "en", { numeric: true });
}

// The record IDs whose association rows carry typeId as a USER_DEFINED type, in record-ID order.
function idsHoldingType(rows, typeId) {
  return (rows || [])
    .filter((row) =>
      (row?.types || []).some((type) => type?.typeId === typeId && type?.category === USER_DEFINED)
    )
    .map((row) => String(row?.toObjectId ?? ""))
    .filter(Boolean)
    .sort(byRecordId);
}

// associations are the rows of listAssociations: { toObjectId, types: [{ typeId, category }] }.
// Returns { role: [record IDs in record-ID order] }, an empty list for a role nobody holds.
export function staffRecordIdsByRole({ bcbaAssociations, btRbtAssociations, roleTypeIds }) {
  const idsByRole = {};
  for (const role of BCBA_ROLES) {
    idsByRole[role] = idsHoldingType(bcbaAssociations, roleTypeIds?.[role]);
  }
  for (const role of BT_RBT_ROLES) {
    idsByRole[role] = idsHoldingType(btRbtAssociations, roleTypeIds?.[role]);
  }
  return idsByRole;
}

// One batch read of the given records. A record the answer lacks, or one whose answer lacks a
// requested key, is a failed read: the run stops and no value becomes a blank (rule 5.8).
// Returns Map(recordId -> properties).
async function readRecords({ readBatch, objectTypeId, ids, properties, scope }) {
  const read = new Map();
  if (ids.length === 0) {
    return read;
  }
  const rows = await readBatch({ objectTypeId, ids, properties: [...properties] });
  const answered = new Map((rows || []).map((row) => [String(row?.id ?? ""), row?.properties]));
  for (const id of ids) {
    const answer = answered.get(id);
    if (!answer || properties.some((name) => !Object.hasOwn(answer, name))) {
      throw new HubSpotReadError(`${scope}:${objectTypeId}`);
    }
    read.set(id, answer);
  }
  return read;
}

const nameOf = (properties) => ({ firstName: properties.first_name, lastName: properties.last_name });

// Reads the staff on the Case: one batch call per object type, none when the Case holds nobody of
// that type. A Case with a Grad Permit holder on 82 then makes one more BCBA batch read, for the
// holders' supervisors (readGradPermitSupervisors). The BCBA read asks for first_name, last_name
// and lba_licensure__ny (item 9: its own list); the BT/RBT read asks for first_name and last_name
// only. A missing key is a failed read
// (rule 5.8): a licence key that is not in the answer never becomes "not a holder".
// readBatch is readObjectsBatch from src/lib/hubspotClient.mjs.
// Returns the mapper's staffNames input: { role: [{ recordId, firstName, lastName }] }; each
// supervisingBcba entry also holds gradPermitHolder (rule 1: lba_licensure__ny = Grad Permit).
export async function readStaffNames({
  idsByRole,
  bcbaObjectTypeId,
  btRbtObjectTypeId,
  readBatch
}) {
  const idsOf = (role) => idsByRole[role] || [];
  const readType = (objectTypeId, roles, properties) =>
    readRecords({
      readBatch,
      objectTypeId,
      ids: [...new Set(roles.flatMap(idsOf))],
      properties,
      scope: "staffNames"
    });

  const [bcbas, btRbts] = await Promise.all([
    readType(bcbaObjectTypeId, BCBA_ROLES, BCBA_PROPERTIES),
    readType(btRbtObjectTypeId, BT_RBT_ROLES, NAME_PROPERTIES)
  ]);
  const staffNames = {};
  for (const [roles, read] of [
    [BCBA_ROLES, bcbas],
    [BT_RBT_ROLES, btRbts]
  ]) {
    for (const role of roles) {
      staffNames[role] = idsOf(role).map((recordId) => ({ recordId, ...nameOf(read.get(recordId)) }));
    }
  }
  staffNames.supervisingBcba = staffNames.supervisingBcba.map((staff) => ({
    ...staff,
    gradPermitHolder:
      bcbas.get(staff.recordId)[GRAD_PERMIT_LICENCE_PROPERTY] === GRAD_PERMIT_LICENCE_VALUE
  }));
  return staffNames;
}

// Item 9 rule 3. For each Grad Permit holder on Supervising BCBA, its Grad Permit Supervisor
// BCBAs: the holder's BCBA -> BCBA associations (the existing listAssociations, passed in as
// loadAssociations), USER_DEFINED type supervisorTypeId only (151 production, 227 sandbox), then
// one batch read of their names. No call when the Case has no holder, nor for the mixed Case
// (rule 7: the mapper leaves 131308 and 136052 out there, so staffNames is returned as it is).
// A failed read stops the run, as the staff read does. Returns staffNames with `supervisors` on
// each supervisingBcba entry: the holder's supervisors in record-ID order, or an empty list.
export async function readGradPermitSupervisors({
  staffNames,
  bcbaObjectTypeId,
  supervisorTypeId,
  loadAssociations,
  readBatch
}) {
  if (mixedGradPermitHolders(staffNames.supervisingBcba)) {
    return staffNames;
  }
  const holders = staffNames.supervisingBcba.filter((staff) => staff.gradPermitHolder);
  const supervisorIdsByHolder = new Map();
  for (const holder of holders) {
    const rows = await loadAssociations({
      fromObjectType: bcbaObjectTypeId,
      fromId: holder.recordId,
      toObjectType: bcbaObjectTypeId
    });
    supervisorIdsByHolder.set(holder.recordId, idsHoldingType(rows, supervisorTypeId));
  }
  const read = await readRecords({
    readBatch,
    objectTypeId: bcbaObjectTypeId,
    ids: [...new Set([...supervisorIdsByHolder.values()].flat())],
    properties: NAME_PROPERTIES,
    scope: "gradPermitSupervisors"
  });
  return {
    ...staffNames,
    supervisingBcba: staffNames.supervisingBcba.map((staff) => ({
      ...staff,
      supervisors: (supervisorIdsByHolder.get(staff.recordId) || []).map((recordId) => ({
        recordId,
        ...nameOf(read.get(recordId))
      }))
    }))
  };
}

// The CentralReach field IDs the run leaves out because their input was not read, for the omit
// list (contract P.5 (c), row 3.18): every staff field, 131308 and 136052 when the staff were not
// read; a staff field holding a record with no name (the mapper leaves it out too and warns);
// 131308 or 136052 when the mapper leaves it out (a Grad Permit holder with no supervisor, a
// nameless BCBA, the mixed-holder Case of item 9 rule 7, or no supervising BCBA and a blank typed
// supplier); 138851 when the Care Coordinator is not ready (C10, item 6). `deal` is the Case the
// mapper is given, for the typed supplier and the coordinator status.
export function omitFieldIdsFor({ base = [], staffNames, deal }) {
  const ids = new Set((base || []).map((id) => String(id)));
  const { SUPERVISING_BCBA, GRAD_PERMIT_HOLDER, CARE_COORDINATOR } =
    CENTRAL_REACH_CLIENT_METADATA_FIELDS;
  if (careCoordinatorValue(deal?.properties).omit) {
    ids.add(String(CARE_COORDINATOR));
  }
  if (staffNames === undefined) {
    Object.keys(STAFF_FIELD_ROLES).forEach((fieldId) => ids.add(String(fieldId)));
    ids.add(String(SUPERVISING_BCBA));
    ids.add(String(GRAD_PERMIT_HOLDER));
  } else {
    staffFieldsWithoutName(staffNames).forEach((fieldId) => ids.add(String(fieldId)));
    if (supervisingBcbaValue(staffNames, deal?.properties).omit) {
      ids.add(String(SUPERVISING_BCBA));
    }
    if (gradPermitHolderValue(staffNames).omit) {
      ids.add(String(GRAD_PERMIT_HOLDER));
    }
  }
  return [...ids];
}
