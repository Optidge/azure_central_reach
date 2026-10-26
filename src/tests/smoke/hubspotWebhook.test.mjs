import test from "node:test";
import assert from "node:assert/strict";
import {
  computeHubSpotV2Signature,
  hubSpotV2SignaturesMatch,
  resolveWebhookTarget
} from "../../lib/hubspotWebhook.mjs";
import { hubspotWebhook } from "../../functions/hubspotWebhook.mjs";
import { processClientQueue } from "../../functions/processClientQueue.mjs";

const CLIENT_SECRET = "yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy";
const URI = "https://www.example.com/webhook_uri";
const RAW_BODY = '{"example_field":"example_value"}';
const DOCUMENTED_HASH = "9569219f8ba981ffa6f6f16aa0f48637d35d728c7e4d93d0d52efaa512af7900";

const settings = {
  clientSecret: CLIENT_SECRET,
  webhookUri: URI,
  btRbtObjectTypeId: "2-55656309",
  bcbaObjectTypeId: "2-55656302",
  coalesceSeconds: 30,
  secretReady: true,
  serviceBusReady: true,
  cosmosReady: true
};

function signedRequest(rawBody, { signature, version = "v2" } = {}) {
  const expected = computeHubSpotV2Signature({
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
          return signature === undefined ? expected : signature;
        }
        if (key === "x-hubspot-signature-version") {
          return version;
        }
        return "";
      }
    }
  };
}

test("v2 signature matches HubSpot's documented POST example", () => {
  const hash = computeHubSpotV2Signature({
    clientSecret: CLIENT_SECRET,
    method: "POST",
    uri: URI,
    rawBody: RAW_BODY
  });
  assert.equal(hash, DOCUMENTED_HASH);
  assert.equal(hubSpotV2SignaturesMatch(hash, DOCUMENTED_HASH.toUpperCase()), true);
  assert.equal(hubSpotV2SignaturesMatch(hash, "abc"), false);
});

test("deal webhook enqueues the existing client sync path", async () => {
  const rawBody = JSON.stringify({
    objectTypeId: "0-3",
    recordId: "12345",
    source: "hubspotWorkflow"
  });
  const sent = [];
  const response = await hubspotWebhook(signedRequest(rawBody), {}, {
    settings,
    rawBody,
    claimCoalesce: async () => true,
    sendClientSyncMessage: async (message) => {
      sent.push(message);
    }
  });

  assert.equal(response.status, 202);
  assert.equal(response.jsonBody.coalesced, false);
  assert.equal(response.jsonBody.target, "client");
  assert.equal(response.jsonBody.recordId, "12345");
  assert.deepEqual(sent, [{
    dealId: "12345",
    source: "hubspotWorkflow",
    workflow: "clientSync",
    enqueuedAt: sent[0].enqueuedAt
  }]);
  assert.equal(rawBody.includes("phi_"), false);
});

test("bcba and bt object ids route to the employee queue", () => {
  assert.equal(
    resolveWebhookTarget({
      objectTypeId: "2-55656302",
      recordId: "9",
      bcbaObjectTypeId: "2-55656302",
      btRbtObjectTypeId: "2-55656309"
    }).employeeType,
    "bcba"
  );
  assert.equal(
    resolveWebhookTarget({
      objectTypeId: "2-55656309",
      recordId: "8",
      bcbaObjectTypeId: "2-55656302",
      btRbtObjectTypeId: "2-55656309"
    }).employeeType,
    "bt_rbt"
  );
});

test("repeat notice for the same record is coalesced", async () => {
  const rawBody = JSON.stringify({ objectTypeId: "0-3", recordId: "12345" });
  let sends = 0;
  const response = await hubspotWebhook(signedRequest(rawBody), {}, {
    settings,
    rawBody,
    claimCoalesce: async () => false,
    sendClientSyncMessage: async () => {
      sends += 1;
    }
  });

  assert.equal(response.status, 202);
  assert.equal(response.jsonBody.coalesced, true);
  assert.equal(sends, 0);
});

test("bad signature is rejected and does not enqueue", async () => {
  const rawBody = JSON.stringify({ objectTypeId: "0-3", recordId: "12345" });
  let sends = 0;
  const response = await hubspotWebhook(
    signedRequest(rawBody, { signature: "deadbeef" }),
    {},
    {
      settings,
      rawBody,
      sendClientSyncMessage: async () => {
        sends += 1;
      }
    }
  );

  assert.equal(response.status, 401);
  assert.equal(response.jsonBody.error.code, "INVALID_SIGNATURE");
  assert.equal(sends, 0);
});

test("missing client secret fails closed", async () => {
  const response = await hubspotWebhook(
    { method: "POST", headers: { get() { return ""; } } },
    {},
    { settings: { ...settings, secretReady: false }, rawBody: "{}" }
  );
  assert.equal(response.status, 503);
  assert.equal(response.jsonBody.error.code, "MISSING_WEBHOOK_SECRET");
});

test("client queue accepts hubspotWorkflow as a source", async () => {
  let called = false;
  await processClientQueue(
    {
      dealId: "12345",
      workflow: "clientSync",
      source: "hubspotWorkflow"
    },
    {
      functionName: "processClientQueue",
      invocationId: "inv-webhook",
      triggerMetadata: {}
    },
    {
      runWorkflow: async () => {
        called = true;
      }
    }
  );
  assert.equal(called, true);
});
