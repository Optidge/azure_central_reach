// The link record: one Cosmos item per HubSpot record. It holds the CentralReach ID, the last
// fully synced field hashes and the CR ID they belong to, the External System ID used, a pending
// create, and whether the last run finished cleanly. It never expires.
export const LINK_RECORD_TYPE = "link";
export const LINK_TTL_NEVER = -1;

// Every write to the link record goes through here. It reads the record first and keeps every
// field the caller does not change, so a failure never drops the CR ID, the last good hashes or
// a pending create.
export async function saveLinkRecord({ readState, saveState, pk, id, changes }) {
  const current = (await readState({ pk, id }))?.data || {};
  const data = { ...current, ...changes, updatedAt: new Date().toISOString() };
  await saveState({ pk, id, type: LINK_RECORD_TYPE, ttlSeconds: LINK_TTL_NEVER, data });
  return data;
}

// Saved hashes are trusted only for the CR ID they were synced to.
export function hashesForContact(linkData, contactId) {
  const id = String(contactId ?? "").trim();
  if (!id || String(linkData?.hashesContactId ?? "").trim() !== id) {
    return null;
  }
  return linkData.fieldHashes || null;
}
