// Stage 6, rows 6.1, 6.2 and 6.3 (lane E, wave 2): Contact routing (K1 to K4, BR7; BUILD-PLAN.md
// section 12).
// Guide [GER-CONTACT]: "Production object | 0-1 · Contact / contact_category | A linked data source
// for Case and BCBA updates." "Guardian fields | firstname, lastname, email, phone | Use the
// production Case sync fields guardian_first_name, guardian_last_name, email and phone for CR
// Client updates. Ensure changes to the associated Guardian Contact reach the eligible linked
// Case, including phone." "Scope and exclusions | test_record / linked Case or BCBA | Skip
// test_record = true in normal live processing. [...] Standalone CentralReach Contact creation
// and dashboard label mappings are outside the Contact requirements."
// Guide [G11]: "It's actually 4 objects, not 3. [...] watch Contact changes for contacts linked to
// a gated record."
// No test calls a live service: HubSpot and the Service Bus senders are faked; the message
// builders, the queue worker and (row 6.3) the Case worker, mapper and hash are real.
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeHubSpotV2Signature,
  resolveWebhookTarget
} from "../../lib/hubspotWebhook.mjs";
import {
  sendClientSyncMessage,
  sendContactChangeMessage,
  sendEmployeeSyncMessage,
  useServiceBusSenders
} from "../../lib/serviceBusClient.mjs";
import { hubspotWebhook } from "../../functions/hubspotWebhook.mjs";
import { processClientQueue } from "../../functions/processClientQueue.mjs";
import { processEmployeeQueue } from "../../functions/processEmployeeQueue.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { runContactFanOutWorkflow } from "../../workflows/contactFanOutWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  clientWorkflowDeps,
  httpError,
  hubspotAnswer,
  workflowConfig
} from "./stage2Fakes.mjs";
import { counters, linkedCase, setup } from "./stage3WorkerFakes.mjs";

const SANDBOX_BCBA_TYPE = "2-72890322";
const CLIENT_SECRET = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy";
const URI = "https://www.example.com/webhook_uri";

const context = {
  functionName: "processClientQueue",
  invocationId: "inv-6",
  triggerMetadata: { messageId: "msg-6", deliveryCount: 1 }
};

// Service Bus senders that keep what the real message builders made.
function fakeSenders() {
  const sent = { client: [], employee: [] };
  useServiceBusSenders({
    clientSyncSender: { sendMessages: async (message) => sent.client.push(message) },
    employeeSyncSender: { sendMessages: async (message) => sent.employee.push(message) }
  });
  return sent;
}

function signedRequest(rawBody) {
  const signature = computeHubSpotV2Signature({
    clientSecret: CLIENT_SECRET,
    method: "POST",
    uri: URI,
    rawBody
  });
  return {
    method: "POST",
    url: URI,
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        if (key === "x-hubspot-signature") {
          return signature;
        }
        return key === "x-hubspot-signature-version" ? "v2" : "";
      }
    }
  };
}

const webhookSettings = {
  clientSecret: CLIENT_SECRET,
  webhookUri: URI,
  portalId: SANDBOX_PORTAL,
  portalReady: true,
  btRbtObjectTypeId: "2-72890325",
  bcbaObjectTypeId: SANDBOX_BCBA_TYPE,
  secretReady: true,
  serviceBusReady: true
};

// One HubSpot Contact with its linked Cases and BCBAs.
function hubspotContact({ testRecord = null, cases = [], bcbas = [] } = {}) {
  const state = { reads: [], associationReads: [], associationError: null, contactError: null };
  const rows = (ids, typeId) =>
    ids.map((id) => ({ toObjectId: id, types: [{ typeId, category: "HUBSPOT_DEFINED" }] }));
  return {
    state,
    deps: {
      getContactById: async (contactId, properties) => {
        state.reads.push({ contactId, properties });
        if (state.contactError) {
          throw state.contactError;
        }
        return hubspotAnswer({ id: contactId, properties: { test_record: testRecord } }, properties);
      },
      listAssociations: async (input) => {
        state.associationReads.push(input);
        if (state.associationError) {
          throw state.associationError;
        }
        return input.toObjectType === "0-3" ? rows(cases, 4) : rows(bcbas, 192);
      }
    }
  };
}

function fanOutDeps(contact, { sync = {}, logs = [] } = {}) {
  return {
    getConfig: () => workflowConfig({ sync }),
    createHubSpotClient: () => {},
    ensureServiceBusClient: () => {},
    safeLog: (level, message, meta) => logs.push({ level, message, meta }),
    ...contact.deps
  };
}

// --- Row 6.1 ---

test("[K1][6.1] a Contact notice (object type 0-1) is accepted with 202 and queues one contactChange message on the client queue", async () => {
  const sent = fakeSenders();
  const rawBody = JSON.stringify({ objectTypeId: "0-1", recordId: "701" });

  const response = await hubspotWebhook(signedRequest(rawBody), {}, {
    settings: webhookSettings,
    rawBody,
    enqueuedAt: "2026-11-20T15:00:00.000Z",
    // The real sender and message builder, with a fake Service Bus sender under them.
    sendContactChangeMessage
  });

  assert.equal(response.status, 202);
  assert.equal(response.jsonBody.target, "contact");
  assert.equal(response.jsonBody.objectTypeId, "0-1");
  assert.equal(response.jsonBody.recordId, "701");
  assert.equal(sent.client.length, 1);
  assert.equal(sent.employee.length, 0);
  assert.deepEqual(sent.client[0].body, {
    workflow: "contactChange",
    source: "hubspotWorkflow",
    portalId: SANDBOX_PORTAL,
    contactId: "701",
    enqueuedAt: "2026-11-20T15:00:00.000Z"
  });
  assert.equal(typeof sent.client[0].messageId, "string");
});

test("[K3][6.1] a Contact is never its own sync target: it routes to the contactChange message only", () => {
  const target = resolveWebhookTarget({
    objectTypeId: "0-1",
    recordId: "701",
    bcbaObjectTypeId: SANDBOX_BCBA_TYPE,
    btRbtObjectTypeId: "2-72890325"
  });
  assert.deepEqual(target, { ok: true, target: "contact", contactId: "701", objectTypeId: "0-1" });
});

test("[K1][6.1] the client queue runs a contactChange message through the Contact fan-out, not the Case worker", async () => {
  const fanOuts = [];
  let caseRuns = 0;
  await processClientQueue(
    {
      workflow: "contactChange",
      source: "hubspotWorkflow",
      portalId: SANDBOX_PORTAL,
      contactId: "701",
      enqueuedAt: "2026-11-20T15:00:00.000Z"
    },
    context,
    {
      portalId: SANDBOX_PORTAL,
      runWorkflow: async () => {
        caseRuns += 1;
      },
      runContactFanOut: async (input) => {
        fanOuts.push(input);
      }
    }
  );

  assert.equal(caseRuns, 0);
  assert.deepEqual(fanOuts, [{ contactId: "701", source: "hubspotWorkflow", context, attempt: 0 }]);
});

test("[K1][6.1] a contactChange message without a Contact ID is invalid and reaches the dead-letter queue", async () => {
  await assert.rejects(
    processClientQueue(
      { workflow: "contactChange", source: "hubspotWorkflow", portalId: SANDBOX_PORTAL },
      context,
      { portalId: SANDBOX_PORTAL, runContactFanOut: async () => {} }
    ),
    /contactId is required/
  );
});

// --- Row 6.2 ---

test("[K1, K3][6.2] one Contact with two Cases and one BCBA queues three ordinary sync messages", async () => {
  const sent = fakeSenders();
  const contact = hubspotContact({ cases: ["9001", "9002"], bcbas: ["HS2"] });
  const logs = [];

  const result = await runContactFanOutWorkflow(
    { contactId: "701", source: "hubspotWorkflow" },
    {
      ...fanOutDeps(contact, { logs }),
      sendClientSyncMessage,
      sendEmployeeSyncMessage
    }
  );

  assert.equal(result.status, "queued");
  assert.deepEqual(result.queued, { case: 2, bcba: 1 });
  assert.deepEqual(
    sent.client.map((message) => [message.body.workflow, message.body.dealId, message.body.portalId]),
    [
      ["clientSync", "9001", SANDBOX_PORTAL],
      ["clientSync", "9002", SANDBOX_PORTAL]
    ]
  );
  assert.deepEqual(
    sent.employee.map((message) => [
      message.body.workflow,
      message.body.employeeType,
      message.body.recordId,
      message.body.portalId
    ]),
    [["employeeSync", "bcba", "HS2", SANDBOX_PORTAL]]
  );
  for (const message of [...sent.client, ...sent.employee]) {
    assert.equal(message.body.source, "contactFanOut");
  }
  // The Contact is read for test_record only; its Cases and BCBAs are read from the Contact.
  assert.deepEqual(contact.state.reads, [{ contactId: "701", properties: ["test_record"] }]);
  assert.deepEqual(contact.state.associationReads, [
    { fromObjectType: "0-1", fromId: "701", toObjectType: "0-3" },
    { fromObjectType: "0-1", fromId: "701", toObjectType: SANDBOX_BCBA_TYPE }
  ]);
  const summary = logs.find((entry) => entry.message === "Sync run summary.");
  assert.deepEqual(summary.meta.queuedMessages, { case: 2, bcba: 1 });
});

test("[K1, K3][6.2] the messages the fan-out queues are accepted by the client and employee queue workers", async () => {
  const sent = fakeSenders();
  const contact = hubspotContact({ cases: ["9001"], bcbas: ["HS2"] });
  await runContactFanOutWorkflow(
    { contactId: "701" },
    { ...fanOutDeps(contact), sendClientSyncMessage, sendEmployeeSyncMessage }
  );

  const caseRuns = [];
  await processClientQueue(sent.client[0].body, context, {
    portalId: SANDBOX_PORTAL,
    runWorkflow: async (input) => caseRuns.push(input)
  });
  const bcbaRuns = [];
  await processEmployeeQueue(sent.employee[0].body, context, {
    portalId: SANDBOX_PORTAL,
    runWorkflow: async (input) => bcbaRuns.push(input)
  });

  assert.deepEqual(
    caseRuns.map((run) => [run.dealId, run.source]),
    [["9001", "contactFanOut"]]
  );
  assert.deepEqual(
    bcbaRuns.map((run) => [run.recordId, run.employeeType, run.source]),
    [["HS2", "bcba", "contactFanOut"]]
  );
});

for (const testRecord of [true, "true"]) {
  test(`[K4][6.2] a Contact with test_record = ${JSON.stringify(testRecord)} queues nothing`, async () => {
    const contact = hubspotContact({ testRecord, cases: ["9001", "9002"], bcbas: ["HS2"] });
    const sends = [];
    const result = await runContactFanOutWorkflow(
      { contactId: "701" },
      {
        ...fanOutDeps(contact),
        sendClientSyncMessage: async (message) => sends.push(message),
        sendEmployeeSyncMessage: async (message) => sends.push(message)
      }
    );

    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "test_record");
    assert.deepEqual(sends, []);
    assert.deepEqual(contact.state.associationReads, []);
  });
}

test("[BR7][6.2] INCLUDE_TEST_RECORDS = true routes a test Contact in a deliberate end-to-end run", async () => {
  const contact = hubspotContact({ testRecord: "true", cases: ["9001"], bcbas: [] });
  const sends = [];
  const result = await runContactFanOutWorkflow(
    { contactId: "701" },
    {
      ...fanOutDeps(contact, { sync: { includeTestRecords: true } }),
      sendClientSyncMessage: async (message) => sends.push(message),
      sendEmployeeSyncMessage: async (message) => sends.push(message)
    }
  );

  assert.equal(result.status, "queued");
  assert.deepEqual(sends.map((message) => message.dealId), ["9001"]);
});

for (const [name, breakRead] of [
  ["a failed Case association read", (contact) => (contact.state.associationError = httpError(503))],
  ["a refused Contact read (403)", (contact) => (contact.state.contactError = httpError(403))],
  [
    "a Contact answer without the test_record key",
    (contact) => {
      contact.deps.getContactById = async (contactId) => ({ id: contactId, properties: {} });
    }
  ]
]) {
  test(`[K1][6.2] ${name} queues nothing, and the message is retried`, async () => {
    const contact = hubspotContact({ cases: ["9001", "9002"], bcbas: ["HS2"] });
    breakRead(contact);
    const sends = [];
    const retries = [];
    const deps = {
      ...fanOutDeps(contact),
      sendClientSyncMessage: async (message) => sends.push(message),
      sendEmployeeSyncMessage: async (message) => sends.push(message)
    };
    const message = {
      workflow: "contactChange",
      source: "hubspotWorkflow",
      portalId: SANDBOX_PORTAL,
      contactId: "701",
      enqueuedAt: "2026-11-20T15:00:00.000Z"
    };

    await processClientQueue(message, context, {
      portalId: SANDBOX_PORTAL,
      runContactFanOut: (input) => runContactFanOutWorkflow(input, deps),
      scheduleRetry: async (retry) => retries.push(retry)
    });

    assert.deepEqual(sends, []);
    assert.equal(retries.length, 1);
    assert.equal(retries[0].body.workflow, "contactChange");
    assert.equal(retries[0].body.contactId, "701");
    assert.equal(retries[0].body.attempt, 1);
  });
}

test("[K1][6.2] a failed BCBA association read after a good Case read still queues nothing", async () => {
  const contact = hubspotContact({ cases: ["9001"], bcbas: ["HS2"] });
  const read = contact.deps.listAssociations;
  contact.deps.listAssociations = async (input) => {
    if (input.toObjectType === SANDBOX_BCBA_TYPE) {
      throw httpError(500);
    }
    return read(input);
  };
  const sends = [];
  await assert.rejects(
    runContactFanOutWorkflow(
      { contactId: "701" },
      {
        ...fanOutDeps(contact),
        sendClientSyncMessage: async (message) => sends.push(message),
        sendEmployeeSyncMessage: async (message) => sends.push(message)
      }
    )
  );
  assert.deepEqual(sends, []);
});

test("[K4][6.2] the fan-out never calls CentralReach: no standalone CentralReach contact for a Contact", async () => {
  const { cr } = setup();
  fakeSenders();
  const contact = hubspotContact({ cases: ["9001"], bcbas: ["HS2"] });
  const result = await runContactFanOutWorkflow(
    { contactId: "701" },
    { ...fanOutDeps(contact), sendClientSyncMessage, sendEmployeeSyncMessage }
  );

  assert.equal(result.status, "queued");
  assert.deepEqual(cr.calls, []);
});

test("[K4][6.2] a Contact with no linked Case or BCBA queues nothing and still finishes", async () => {
  const contact = hubspotContact();
  const sends = [];
  const result = await runContactFanOutWorkflow(
    { contactId: "701" },
    {
      ...fanOutDeps(contact),
      sendClientSyncMessage: async (message) => sends.push(message),
      sendEmployeeSyncMessage: async (message) => sends.push(message)
    }
  );
  assert.equal(result.status, "queued");
  assert.deepEqual(result.queued, { case: 0, bcba: 0 });
  assert.deepEqual(sends, []);
});

// --- Row 6.3 ---

// The Case worker, with HubSpot answering every requested property (a blank one as null): the
// shared clientWorkflowDeps reader does that for a Case read, (dealId, names).
function runCase(record) {
  return runClientSyncWorkflow({ dealId: "deal-1", source: "contactFanOut" }, clientWorkflowDeps({ record }));
}

for (const [property, before, after, crField, sentValue] of [
  ["guardian_first_name", "Jordan", "Morgan", "GuardianFirstName", "Morgan"],
  ["guardian_last_name", "Rivera", "Reyes", "GuardianLastName", "Reyes"],
  ["email", "jordan.rivera@example.com", "jordan.reyes@example.com", "PrimaryEmail", "jordan.reyes@example.com"],
  ["phone", "(518) 555-0142", "518-555-0199", "PhoneCell", "5185550199"]
]) {
  test(`[K2][6.3] a Guardian ${property} change on the Case produces a client update`, async () => {
    const { container, cr } = setup();
    const record = linkedCase(cr, {
      guardian_first_name: "Jordan",
      guardian_last_name: "Rivera",
      email: "jordan.rivera@example.com",
      phone: "(518) 555-0142",
      [property]: before
    });
    const first = await runCase(record);
    assert.equal(first.status, "success");

    record.properties[property] = after;
    const count = counters({ container, cr, record });
    const start = count.mark();
    const result = await runCase(record);
    const done = count.since(start);

    assert.equal(result.status, "success");
    const updates = done.crCalls.filter((call) => call.name === "PUT /contacts/client/{id}");
    assert.equal(updates.length, 1);
    assert.equal(updates[0].url.endsWith("/contacts/client/2001"), true);
    assert.equal(updates[0].body[crField], sentValue);
  });
}
