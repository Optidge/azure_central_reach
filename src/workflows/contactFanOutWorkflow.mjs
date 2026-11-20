// Stage 6, row 6.2 (K1, K3, K4, BR7): a Contact change reaches every Case and BCBA linked to it,
// through the normal workers. A Contact is a data source only: this workflow never calls
// CentralReach, never writes HubSpot, and gives the Contact no status and no label.
//
//   contactChange message (row 6.1)
//     -> read the Contact's test_record; true -> skip (unless INCLUDE_TEST_RECORDS is true)
//     -> read the Contact's associated Cases and BCBAs (both reads before any send)
//     -> queue one ordinary sync message per Case (client queue) and per BCBA (employee queue)
//
// The record gate, the test_record flag and every other rule of the linked records are checked by
// the workers, per target. A failed read queues nothing and is thrown, so the queue worker
// retries the message on the normal schedule.
import { getConfig, hubspotPortalSettings } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { createHubSpotClient, getObjectById, listAssociations } from "../lib/hubspotClient.mjs";
import { HubSpotReadError } from "../lib/mappedState.mjs";
import { createSyncRunSummary, reasonCodeOfError } from "../lib/syncRunSummary.mjs";
import {
  ensureServiceBusClient,
  sendClientSyncMessage,
  sendEmployeeSyncMessage
} from "../lib/serviceBusClient.mjs";
import { isTestRecord } from "../lib/syncEligibility.mjs";
import { HUBSPOT_EMPLOYEE_TYPES, TEST_RECORD_PROPERTY } from "../constants/hubspot.mjs";

const CONTACT_OBJECT_TYPE_ID = "0-1";
const CASE_OBJECT_TYPE_ID = "0-3";

// The `source` of every sync message this workflow queues. The client queue accepts it
// (src/functions/processClientQueue.mjs); the employee queue has no source list.
export const CONTACT_FAN_OUT_SOURCE = "contactFanOut";

function ensureContactId(contactId) {
  const normalized = String(contactId ?? "").trim();
  if (!normalized) {
    throw new Error("contactId is required");
  }
  return normalized;
}

// One ID per linked record, in a stable order. The association type is not checked: every
// linked Case and BCBA is queued, and its worker decides whether anything changed.
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
  const sendEmployee = dependencies.sendEmployeeSyncMessage || sendEmployeeSyncMessage;
  const logger = dependencies.safeLog || safeLog;

  const normalizedContactId = ensureContactId(contactId);

  // Row 3.20: one `Sync run summary.` line per run, also when configuration or the HubSpot client
  // fails (the portal is set once it is known). The record is the Contact; the fan-out makes no
  // CentralReach call, so operation is `none` and crCalls stays empty. queuedMessages holds the
  // messages queued per object type, also when the run failed partway.
  const summary = createSyncRunSummary({
    workflow: "contactFanOut",
    recordId: normalizedContactId,
    portalId: null,
    source: source || null,
    invocationId: context?.invocationId || null,
    attempt
  });
  const queued = { case: 0, bcba: 0 };

  try {
    const config = getRuntimeConfig();
    // Any portal that is not in the table is invalid configuration: nothing is read or queued.
    const { portalId, bcbaObjectTypeId } = hubspotPortalSettings(config.hubspot?.hubspotPortalId);
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

    // Both reads finish before the first message is sent, so a failed read queues nothing.
    const caseIds = linkedRecordIds(
      await readAssociations({
        fromObjectType: CONTACT_OBJECT_TYPE_ID,
        fromId: normalizedContactId,
        toObjectType: CASE_OBJECT_TYPE_ID
      })
    );
    const bcbaIds = linkedRecordIds(
      await readAssociations({
        fromObjectType: CONTACT_OBJECT_TYPE_ID,
        fromId: normalizedContactId,
        toObjectType: bcbaObjectTypeId
      })
    );

    if (caseIds.length > 0 || bcbaIds.length > 0) {
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
    for (const recordId of bcbaIds) {
      await sendEmployee({
        recordId,
        employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA,
        portalId,
        source: CONTACT_FAN_OUT_SOURCE,
        workflow: "employeeSync",
        enqueuedAt
      });
      queued.bcba += 1;
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
