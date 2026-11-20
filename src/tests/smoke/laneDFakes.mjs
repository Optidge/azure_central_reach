// Fakes for the lane D tests (BUILD-PLAN rows 4.14, 4.16, 4.18 and 3.20, Case worker). Only HubSpot
// is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory container) and
// centralReachClient.mjs (fake HTTP adapter) are real. Nothing here calls a live service.
import { CENTRAL_REACH_CLIENT_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { clientWorkflowDeps, httpError } from "./stage2Fakes.mjs";

// Sandbox IDs (BUILD-PLAN section 3, config.mjs): the object types and the role association types.
export const SANDBOX_BCBA_TYPE = "2-72890322";
export const SANDBOX_BT_TYPE = "2-72890325";
export const ROLE_TYPE = Object.freeze({ ia: 223, re: 229, bt1: 238, bt2: 240 });

export const FIELD = Object.freeze({
  ia: CENTRAL_REACH_CLIENT_METADATA_FIELDS.INITIAL_ASSESSMENT_BCBA,
  re: CENTRAL_REACH_CLIENT_METADATA_FIELDS.REASSESSMENT_BCBA,
  bt1: CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_1_NAME,
  bt2: CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_2_NAME,
  owner: CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR
});

// One association row, as listAssociations returns it, in the USER_DEFINED category.
export function roleRow(toObjectId, ...typeIds) {
  return {
    toObjectId: String(toObjectId),
    types: typeIds.map((typeId) => ({ typeId, category: "USER_DEFINED" }))
  };
}

// The Case's staff and owner as the HubSpot fakes answer them.
//   bcbaRows, btRows  the association rows by object type
//   names             { recordId: { first_name, last_name } }; a record that is not here is not
//                     answered by the batch read
//   owners            { ownerId: { firstName, lastName, email } | Error }
// `calls` shows what the worker asked for.
export function staffAndOwner({ bcbaRows = [], btRows = [], names = {}, owners = {} } = {}) {
  const calls = { associations: [], batch: [], owner: [] };
  return {
    calls,
    deps: {
      listAssociations: async ({ toObjectType }) => {
        calls.associations.push(toObjectType);
        return toObjectType === SANDBOX_BCBA_TYPE ? bcbaRows : btRows;
      },
      readObjectsBatch: async ({ objectTypeId, ids, properties }) => {
        calls.batch.push({ objectTypeId, ids: [...ids], properties: [...properties] });
        return ids
          .filter((id) => Object.hasOwn(names, id))
          .map((id) => ({ id, properties: names[id] }));
      },
      getOwnerById: async (ownerId) => {
        calls.owner.push(ownerId);
        const owner = owners[ownerId];
        if (owner instanceof Error) {
          throw owner;
        }
        if (!owner) {
          throw httpError(404);
        }
        return owner;
      }
    }
  };
}

export function refused(status = 403) {
  return httpError(status);
}

// The worker's dependencies: the shared client fakes (which answer a blank property as a null key,
// like HubSpot), then this lane's staff and owner fakes, then any override.
export function caseDeps({ record, logs = [], staff = staffAndOwner(), ...overrides }) {
  return { ...clientWorkflowDeps({ record, logs }), ...staff.deps, ...overrides };
}

// The text or input value of the last write to one metadata field, or undefined when none.
export function sentValue(cr, fieldId) {
  const writes = cr.calls.filter(
    (call) => call.method === "PUT" && call.url.endsWith(`/metadata/${fieldId}`)
  );
  const body = writes.at(-1)?.body;
  return body ? (body.inputValue ?? body.textAreaValue) : undefined;
}

export function metadataWriteCount(cr, fieldId, method) {
  return cr.calls.filter(
    (call) => call.method === method && call.url.endsWith(`/metadata/${fieldId}`)
  ).length;
}

export function logged(logs, message) {
  return logs.filter((entry) => entry.message === message);
}
