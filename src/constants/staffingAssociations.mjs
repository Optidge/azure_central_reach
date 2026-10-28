// Unlabeled companion types and roles the guide says must not sync to CentralReach.
// Any other type id is kept, including sandbox ids that differ from the Oct 21 production list.
// Sandbox portal 50850427 Potential is also excluded. Read 2026-10-27:
//   GET /crm/v4/associations/deals/2-55656302/labels → Potential 100
//   GET /crm/v4/associations/deals/2-55656309/labels → Potential 130
export const STAFFING_ASSOCIATION_TYPE_IDS_EXCLUDED = new Set([
  20,
  64,
  153,
  80,
  74,
  164,
  286,
  100,
  130
]);

// Sandbox portal 50850427 type ids. Case → BCBA RE BCBA is 161.
// The paired BCBA → Case id is 162; staffing reads start on the Case, so use 161.
// Confirmed with GET /crm/v4/associations/deals/2-55656302/labels
// and GET /crm/v4/associations/deals/2-55656309/labels.
export const SANDBOX_STAFFING_ASSOCIATION_TYPE_IDS = {
  SUPERVISING_BCBA: 102,
  INITIAL_ASSESSMENT_BCBA: 98,
  RE_BCBA: 161,
  PRIMARY_BT_1: 149,
  PRIMARY_BT_2: 147
};

export function associationsForComparison(rawAssociations) {
  return (Array.isArray(rawAssociations) ? rawAssociations : [])
    .map((row) => ({
      toObjectId: row?.toObjectId,
      typeIds: (Array.isArray(row?.typeIds) ? row.typeIds : []).filter(
        (typeId) => !STAFFING_ASSOCIATION_TYPE_IDS_EXCLUDED.has(Number(typeId))
      )
    }))
    .filter((row) => row.typeIds.length > 0);
}
