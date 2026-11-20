// Unlabeled companion types and roles the guide says must not sync to CentralReach (unlabeled,
// Potential, Previous IA). The ids differ per portal, so the caller passes its own portal's list
// from hubspotPortalSettings() in src/lib/config.mjs when the function runs.
export function associationsForComparison(rawAssociations, excludedTypeIds) {
  if (!Array.isArray(excludedTypeIds)) {
    throw new Error("associationsForComparison needs the portal's excluded association type ids");
  }
  const excluded = new Set(excludedTypeIds.map(Number));
  return (Array.isArray(rawAssociations) ? rawAssociations : [])
    .map((row) => ({
      toObjectId: row?.toObjectId,
      typeIds: (Array.isArray(row?.typeIds) ? row.typeIds : []).filter(
        (typeId) => !excluded.has(Number(typeId))
      )
    }))
    .filter((row) => row.typeIds.length > 0);
}
