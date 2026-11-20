import { MAPPING_VERSION } from "./mappedState.mjs";

// The link record: one Cosmos item per HubSpot record. It holds the CentralReach ID, the last
// fully synced field hashes and the CR ID they belong to, the External System ID used, a pending
// create, whether the last run finished cleanly, and the label fields below. It never expires.
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

// The hashes of the last clean run, of whatever mapping version, for the CR ID they were synced
// to. They are the basis for a clear and for an omitted field's kept hash: they show what the
// integration wrote, also under an older mapping.
export function savedHashesForContact(linkData, contactId) {
  const id = String(contactId ?? "").trim();
  if (!id || String(linkData?.hashesContactId ?? "").trim() !== id) {
    return null;
  }
  return linkData.fieldHashes || null;
}

// For "did anything change": the saved hashes count only when they were made with the current
// mapping version (row 3.7). Otherwise every field is treated as changed and sent once.
export function hashesForContact(linkData, contactId) {
  if (linkData?.mappingVersion !== MAPPING_VERSION) {
    return null;
  }
  return savedHashesForContact(linkData, contactId);
}

// A run saves its field hashes as `inProgressFieldHashes` when it marks the record not clean,
// before its first CentralReach write, with the CR ID it writes to (`inProgressContactId`; null
// while a create has no ID yet). If the run fails halfway, CentralReach may hold what it sent
// although the last clean copy does not say so. The next runs count those fields as written
// (rule 5.8). The clean save drops both fields.
export const NO_IN_PROGRESS = Object.freeze({
  inProgressFieldHashes: null,
  inProgressContactId: null
});

// The hashes of runs that did not finish clean, for this CR ID. null after a clean run.
export function inProgressHashesFor(linkData, contactId) {
  if (!linkData || linkData.clean === true || !linkData.inProgressFieldHashes) {
    return null;
  }
  const savedFor = String(linkData.inProgressContactId ?? "").trim();
  return savedFor === String(contactId ?? "").trim() ? linkData.inProgressFieldHashes : null;
}

// writtenSoFar is writtenFieldHashes(earlier in-progress hashes, this run's hashes): a value an
// earlier failed run sent stays counted until a run finishes clean.
export function inProgressFields(writtenSoFar, contactId) {
  return {
    inProgressFieldHashes: writtenSoFar,
    inProgressContactId: contactId ? String(contactId) : null
  };
}

// Row 3.15: a create that was sent is remembered by its External System ID and the time it was
// sent. Until the CR ID is saved, the next run looks that ID up before it may create again. A
// lookup that answers "not found" inside this window is not trusted yet: CentralReach may not
// show the first create.
export const CREATE_PENDING_WINDOW_MS = 15 * 60 * 1000;
export const NO_PENDING_CREATE = Object.freeze({
  pendingCreateExternalId: null,
  pendingCreateSentAt: null
});

export function pendingCreateFields(externalSystemId, nowMs) {
  return {
    pendingCreateExternalId: String(externalSystemId),
    pendingCreateSentAt: new Date(nowMs).toISOString()
  };
}

// A marker with no readable time is recent too: the worker stamps it with the current time
// (pendingCreateStamp) and the 15 minutes run from there. It is never cleared at once.
export function pendingCreateHasTime(linkData) {
  return Number.isFinite(Date.parse(linkData?.pendingCreateSentAt ?? ""));
}

export function pendingCreateStamp(nowMs) {
  return { pendingCreateSentAt: new Date(nowMs).toISOString() };
}

export function pendingCreateIsRecent(linkData, nowMs) {
  if (!pendingCreateHasTime(linkData)) {
    return true;
  }
  return nowMs - Date.parse(linkData.pendingCreateSentAt) < CREATE_PENDING_WINDOW_MS;
}

// Rule 5.5, row 3.16: a CR ID that HubSpot holds must be digits only.
export function isDigitsOnly(value) {
  return /^\d+$/.test(String(value ?? ""));
}

// The label fields of the link record (contract P.5 (e) in src/lib/centralReachClient.mjs):
//   labelsPending           true from the moment the integration creates the contact, or links
//                           the record to its own earlier create, until a label read confirms
//                           the labels. While it is true an empty label read means "no labels".
//   labelsPendingContactId  the CR ID that flag was set for. The flag counts for that contact
//                           only, as lastLabelPost does.
//   lastLabelPost           { contactId, labelIds, postedAt }: the last label POST and the CR ID
//                           it was made for.

export function labelsPendingFor(linkData, contactId) {
  const id = String(contactId ?? "").trim();
  return (
    Boolean(id) &&
    linkData?.labelsPending === true &&
    String(linkData.labelsPendingContactId ?? "").trim() === id
  );
}

export function labelsPendingFields(contactId) {
  return { labelsPending: true, labelsPendingContactId: String(contactId) };
}

// The saved label POST, or null when it was made for another CR ID.
export function lastLabelPostFor(linkData, contactId) {
  const saved = linkData?.lastLabelPost;
  const id = String(contactId ?? "").trim();
  if (!saved || !id || String(saved.contactId ?? "").trim() !== id) {
    return null;
  }
  return saved;
}

// A label POST that failed with a timeout or a 5xx may still have been applied. The sender
// attaches it to the error as `labelPost`; the worker saves it before it rethrows the error.
// An empty object: the error carries no post.
export function labelPostFromError(error) {
  const post = error?.labelPost;
  if (!post || !Array.isArray(post.labelIds)) {
    return {};
  }
  return {
    lastLabelPost: {
      contactId: String(post.contactId),
      labelIds: post.labelIds,
      postedAt: post.postedAt ?? null
    }
  };
}

// What the worker saves after the label sender answered: the POST it made, if it made one, and
// the end of labelsPending once a read confirmed the labels. An empty object: nothing to save.
export function labelFieldsAfterSend({ labelResult, contactId, labelsPending }) {
  const changes = {};
  if (Array.isArray(labelResult?.postedLabelIds)) {
    changes.lastLabelPost = {
      contactId: String(contactId),
      labelIds: labelResult.postedLabelIds,
      postedAt: labelResult.postedAt ?? null
    };
  }
  if (labelsPending && labelResult?.confirmed === true) {
    changes.labelsPending = false;
  }
  return changes;
}
