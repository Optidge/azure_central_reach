// The inputs the Case worker reads before it maps (rows 4.14 and 4.18). The mapper reads no
// association and calls no API (contract P.5 (b) in src/mappings/client/buildClientMetadata.mjs),
// so the worker reads the staff names and passes them in. Every function here
// is given the HubSpot reader it uses, so a test passes a fake. Nothing here writes anywhere.
import { CASE_ENTRY_PROPERTY, TEST_RECORD_PROPERTY } from "../constants/hubspot.mjs";
import { HubSpotReadError } from "../lib/mappedState.mjs";
import { CASE_PROPERTIES } from "../mappings/client/clientProperties.mjs";
import { STAFF_ROLE_FIELDS, staffRolesWithoutName } from "../mappings/client/buildClientMetadata.mjs";

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

// Row 4.14. The staff roles, by the role association IDs of the portal (config.mjs). A role is a
// USER_DEFINED association type: a HUBSPOT_DEFINED type can carry the same ID.
const BCBA_ROLES = Object.freeze(["initialAssessmentBcba", "reEvaluationBcba"]);
const BT_RBT_ROLES = Object.freeze(["primaryBt1", "primaryBt2"]);
const USER_DEFINED = "USER_DEFINED";

function byRecordId(left, right) {
  return left.localeCompare(right, "en", { numeric: true });
}

// associations are the rows of listAssociations: { toObjectId, types: [{ typeId, category }] }.
// Returns { role: [record IDs in record-ID order] }, an empty list for a role nobody holds.
export function staffRecordIdsByRole({ bcbaAssociations, btRbtAssociations, roleTypeIds }) {
  const idsByRole = {};
  const idsHoldingRole = (rows, typeId) =>
    (rows || [])
      .filter((row) =>
        (row?.types || []).some(
          (type) => type?.typeId === typeId && type?.category === USER_DEFINED
        )
      )
      .map((row) => String(row?.toObjectId ?? ""))
      .filter(Boolean)
      .sort(byRecordId);
  for (const role of BCBA_ROLES) {
    idsByRole[role] = idsHoldingRole(bcbaAssociations, roleTypeIds?.[role]);
  }
  for (const role of BT_RBT_ROLES) {
    idsByRole[role] = idsHoldingRole(btRbtAssociations, roleTypeIds?.[role]);
  }
  return idsByRole;
}

// Reads first_name and last_name of the staff on the Case: one batch call per object type, none
// when the Case holds nobody of that type. A staff record the answer lacks, or one whose name keys
// are not in the answer, is a failed read: the run stops and no name becomes a blank (rule 5.8).
// readBatch is readObjectsBatch from src/lib/hubspotClient.mjs.
// Returns the mapper's staffNames input: { role: [{ recordId, firstName, lastName }] }.
export async function readStaffNames({
  idsByRole,
  bcbaObjectTypeId,
  btRbtObjectTypeId,
  readBatch
}) {
  const readType = async (objectTypeId, roles) => {
    const ids = [...new Set(roles.flatMap((role) => idsByRole[role]))];
    const names = new Map();
    if (ids.length === 0) {
      return names;
    }
    const rows = await readBatch({
      objectTypeId,
      ids,
      properties: ["first_name", "last_name"]
    });
    const answered = new Map((rows || []).map((row) => [String(row?.id ?? ""), row?.properties]));
    for (const id of ids) {
      const properties = answered.get(id);
      if (
        !properties ||
        !Object.hasOwn(properties, "first_name") ||
        !Object.hasOwn(properties, "last_name")
      ) {
        throw new HubSpotReadError(`staffNames:${objectTypeId}`);
      }
      names.set(id, { firstName: properties.first_name, lastName: properties.last_name });
    }
    return names;
  };

  const [bcbaNames, btRbtNames] = await Promise.all([
    readType(bcbaObjectTypeId, BCBA_ROLES),
    readType(btRbtObjectTypeId, BT_RBT_ROLES)
  ]);
  const staffNames = {};
  for (const [roles, names] of [
    [BCBA_ROLES, bcbaNames],
    [BT_RBT_ROLES, btRbtNames]
  ]) {
    for (const role of roles) {
      staffNames[role] = idsByRole[role].map((recordId) => ({ recordId, ...names.get(recordId) }));
    }
  }
  return staffNames;
}

// The CentralReach field IDs the run leaves out because their input was not read, for the omit
// list (contract P.5 (c), row 3.18): the four staff fields when the staff were not read, and the
// field of a role that holds a staff record with no name (the mapper leaves it out too and warns).
export function omitFieldIdsFor({ base = [], staffNames }) {
  const ids = new Set((base || []).map((id) => String(id)));
  if (staffNames === undefined) {
    Object.values(STAFF_ROLE_FIELDS).forEach((fieldId) => ids.add(String(fieldId)));
  } else {
    staffRolesWithoutName(staffNames).forEach((role) => ids.add(String(STAFF_ROLE_FIELDS[role])));
  }
  return [...ids];
}
