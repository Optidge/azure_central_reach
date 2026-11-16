import { HUBSPOT_PORTAL } from "../lib/config.mjs";

// Unlabeled companion types and roles the guide says must not sync to CentralReach
// (unlabeled, Potential, Previous IA). The ids differ per portal; see HUBSPOT_PORTAL in config.mjs.
export const STAFFING_ASSOCIATION_TYPE_IDS_EXCLUDED = new Set(
  HUBSPOT_PORTAL.excludedStaffingAssociationTypeIds
);

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
