// Stage 6, row 6.2 (K1, K4, BR7): a Contact change reaches every Case linked to it, through the
// normal client worker. BCBAs are not queued: field 138069 reads the BCBA's own personal_email (decisions 42 and 50). A Contact is a data source only: this workflow never calls
// CentralReach, never writes HubSpot, and gives the Contact no status and no label.
//
//   contactChange message (row 6.1)
//     -> read the Contact's test_record; true -> skip (unless INCLUDE_TEST_RECORDS is true)
//     -> read the Contact's associated Cases
//     -> queue one ordinary clientSync message per Case (client queue)
//
// The record gate, the test_record flag and every other rule of the linked Cases are checked by
// the client worker, per target. A failed read queues nothing and is thrown, so the queue worker
// retries the message on the normal schedule.
import { getConfig, hubspotPortalSettings } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { createHubSpotClient, getObjectById, listAssociations } from "../lib/hubspotClient.mjs";
import { HubSpotReadError } from "../lib/mappedState.mjs";
import { createSyncRunSummary, reasonCodeOfError } from "../lib/syncRunSummary.mjs";
import { ensureServiceBusClient, sendClientSyncMessage } from "../lib/serviceBusClient.mjs";
import { isTestRecord } from "../lib/syncEligibility.mjs";
import { TEST_RECORD_PROPERTY } from "../constants/hubspot.mjs";

const CONTACT_OBJECT_TYPE_ID = "0-1";
const CASE_OBJECT_TYPE_ID = "0-3";

// The `source` of every sync message this workflow queues. The client queue accepts it
// (src/functions/processClientQueue.mjs).
export const CONTACT_FAN_OUT_SOURCE = "contactFanOut";

function ensureContactId(contactId) {
  const normalized = String(contactId ?? "").trim();
  if (!normalized) {
    throw new Error("contactId is required");
  }
  return normalized;
}

// One ID per linked record, in a stable order. The association type is not checked: every
// linked Case is queued, and the client worker decides whether anything changed.
function linkedRecordIds(rows) {
  const ids = (Array.isArray(rows) ? rows : [])
    .map((row) => String(row?.toObjectId ?? "").trim())
    .filter(Boolean);
  return [...new Set(ids)].sort();
}

export async function runContactFanOutWorkflow(
  { contactId, source, context, attempt = null },
  dependencies = {}
) {
  const getRuntimeConfig = dependencies.getConfig || getConfig;
  const initHubSpot = dependencies.createHubSpotClient || createHubSpotClient;
  const readContact =
    dependencies.getContactById ||
    ((id, properties) => getObjectById(CONTACT_OBJECT_TYPE_ID, id, properties));
  const readAssociations = dependencies.listAssociations || listAssociations;
  const prepareQueue = dependencies.ensureServiceBusClient || ensureServiceBusClient;
  const sendClient = dependencies.sendClientSyncMessage || sendClientSyncMessage;
  const logger = dependencies.safeLog || safeLog;

  const normalizedContactId = ensureContactId(contactId);

  // Row 3.20: one `Sync run summary.` line per run, also when configuration or the HubSpot client
  // fails (the portal is set once it is known). The record is the Contact; the fan-out makes no
  // CentralReach call, so operation is `none` and crCalls stays empty. queuedMessages holds the
  // messages queued per object type (Cases only), also when the run failed partway.
  const summary = createSyncRunSummary({
    workflow: "contactFanOut",
    recordId: normalizedContactId,
    portalId: null,
    source: source || null,
    invocationId: context?.invocationId || null,
    attempt
  });
  const queued = { case: 0 };

  try {
    const config = getRuntimeConfig();
    // Any portal that is not in the table is invalid configuration: nothing is read or queued.
    const { portalId } = hubspotPortalSettings(config.hubspot?.hubspotPortalId);
    summary.setPortalId(portalId);
    initHubSpot(config);

    // K4, BR7: a Contact flagged as a test record is skipped in normal processing. A Contact
    // answer without the test_record key cannot show that it is not a test record, so it is a
    // failed read.
    const contact = await readContact(normalizedContactId, [TEST_RECORD_PROPERTY]);
    const contactProperties = contact?.properties;
    if (
      !contactProperties ||
      typeof contactProperties !== "object" ||
      !Object.hasOwn(contactProperties, TEST_RECORD_PROPERTY)
    ) {
      throw new HubSpotReadError("contact");
    }
    const includeTestRecords = Boolean(config.sync?.includeTestRecords);
    if (!includeTestRecords && isTestRecord(contactProperties[TEST_RECORD_PROPERTY])) {
      summary.setOutcome("skipped", "test_record");
      return {
        ok: true,
        contactId: normalizedContactId,
        status: "skipped",
        reason: "test_record",
        queued: { ...queued }
      };
    }

    // The read finishes before the first message is sent, so a failed read queues nothing.
    const caseIds = linkedRecordIds(
      await readAssociations({
        fromObjectType: CONTACT_OBJECT_TYPE_ID,
        fromId: normalizedContactId,
        toObjectType: CASE_OBJECT_TYPE_ID
      })
    );

    if (caseIds.length > 0) {
      prepareQueue();
    }
    // A send that fails is thrown and the whole message is retried. The messages already sent
    // are sent again then; a worker that finds nothing changed writes nothing.
    const enqueuedAt = new Date().toISOString();
    for (const dealId of caseIds) {
      await sendClient({
        dealId,
        portalId,
        source: CONTACT_FAN_OUT_SOURCE,
        workflow: "clientSync",
        enqueuedAt
      });
      queued.case += 1;
    }

    summary.setOutcome("success");
    return { ok: true, contactId: normalizedContactId, status: "queued", queued: { ...queued } };
  } catch (error) {
    summary.setOutcome("error", reasonCodeOfError(error));
    throw error;
  } finally {
    summary.setQueued(queued);
    summary.log(logger);
  }
}
