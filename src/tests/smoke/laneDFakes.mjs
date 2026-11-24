// Fakes for the lane D tests (BUILD-PLAN rows 4.14, 4.16, 4.18 and 3.20, Case worker). Only HubSpot
// is faked. The mapper, the validator, the hash, cosmosState.mjs (in-memory container) and
// centralReachClient.mjs (fake HTTP adapter) are real. Nothing here calls a live service.
import { CENTRAL_REACH_CLIENT_METADATA_FIELDS } from "../../constants/centralReach.mjs";
import { clientWorkflowDeps, httpError } from "./stage2Fakes.mjs";

// Sandbox IDs (BUILD-PLAN section 3, config.mjs): the object types and the role association types.
export const SANDBOX_BCBA_TYPE = "2-72890322";
export const SANDBOX_BT_TYPE = "2-72890325";
export const ROLE_TYPE = Object.freeze({
  ia: 223,
  re: 229,
  bt1: 238,
  bt2: 240,
  // Items 9 and 10 (sandbox IDs, package item 10 table).
  supervising: 247,
  sub: 217,
  outgoingSub: 221,
  outgoingSupervising: 253,
  onLeave: 233,
  outgoingBt1: 244,
  outgoingBt2: 236,
  gradPermitSupervisor: 227
});

export const FIELD = Object.freeze({
  ia: CENTRAL_REACH_CLIENT_METADATA_FIELDS.INITIAL_ASSESSMENT_BCBA,
  re: CENTRAL_REACH_CLIENT_METADATA_FIELDS.REASSESSMENT_BCBA,
  bt1: CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_1_NAME,
  bt2: CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_2_NAME,
  careCoordinator: CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR,
  supervising: CENTRAL_REACH_CLIENT_METADATA_FIELDS.SUPERVISING_BCBA,
  gradPermit: CENTRAL_REACH_CLIENT_METADATA_FIELDS.GRAD_PERMIT_HOLDER
});

// One association row, as listAssociations returns it, in the USER_DEFINED category.
export function roleRow(toObjectId, ...typeIds) {
  return {
    toObjectId: String(toObjectId),
    types: typeIds.map((typeId) => ({ typeId, category: "USER_DEFINED" }))
  };
}

// The Case's staff as the HubSpot fakes answer them.
//   bcbaRows, btRows  the association rows by object type
//   names             { recordId: { first_name, last_name } }; a record that is not here is not
//                     answered by the batch read
//   bcbaLinks         { holderRecordId: rows }: the BCBA -> BCBA association rows (item 9)
//   licenceKey        true: a BCBA answer without lba_licensure__ny gets it as a null key, as
//                     HubSpot answers a blank; false: the key is left out (a failed read)
// `calls` shows what the worker asked for.
export function caseStaff({
  bcbaRows = [],
  btRows = [],
  names = {},
  bcbaLinks = {},
  licenceKey = true
} = {}) {
  const calls = { associations: [], batch: [], bcbaLinks: [] };
  return {
    calls,
    deps: {
      listAssociations: async ({ fromObjectType, fromId, toObjectType }) => {
        if (fromObjectType === SANDBOX_BCBA_TYPE) {
          calls.bcbaLinks.push({ fromId, toObjectType });
          return bcbaLinks[fromId] || [];
        }
        calls.associations.push(toObjectType);
        return toObjectType === SANDBOX_BCBA_TYPE ? bcbaRows : btRows;
      },
      readObjectsBatch: async ({ objectTypeId, ids, properties }) => {
        calls.batch.push({ objectTypeId, ids: [...ids], properties: [...properties] });
        const withLicence = licenceKey && properties.includes("lba_licensure__ny");
        return ids
          .filter((id) => Object.hasOwn(names, id))
          .map((id) => ({
            id,
            properties: withLicence ? { lba_licensure__ny: null, ...names[id] } : names[id]
          }));
      }
    }
  };
}

export function refused(status = 403) {
  return httpError(status);
}

// The worker's dependencies: the shared client fakes (which answer a blank property as a null key,
// like HubSpot), then this lane's staff fakes, then any override.
export function caseDeps({ record, logs = [], staff = caseStaff(), ...overrides }) {
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
