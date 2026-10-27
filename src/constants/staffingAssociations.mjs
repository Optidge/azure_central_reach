// Unlabeled companion types and roles the guide says must not sync to CentralReach.
// Any other type id is kept, including sandbox ids that differ from the Oct 21 production list.
export const STAFFING_ASSOCIATION_TYPE_IDS_EXCLUDED = new Set([
  20,
  64,
  153,
  80,
  74,
  164,
  286
]);

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
