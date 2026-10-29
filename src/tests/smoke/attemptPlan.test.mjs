import test from "node:test";
import assert from "node:assert/strict";
import { planAttempt, runPlan } from "../../lib/attemptPlan.mjs";
import { caseBinding, employeeBinding } from "../../lib/recordLifecycle.mjs";
import {
  assertNoAbsentProperties,
  readProperty,
  readRequestedProperties
} from "../../lib/fieldRead.mjs";

const NOW_MS = Date.parse("2026-10-29T12:00:00.000Z");
const BASE = {
  binding: caseBinding(),
  recordId: "66712883229",
  lastSyncStatus: null,
  centralReachId: null,
  deliveryCount: 1,
  maxDeliveryCount: 10,
  replayCount: 0,
  hashMatched: false,
  dryRun: false,
  allowEmployeeCreate: false,
  payloadHash: "hash-1",
  error: null,
  nowMs: NOW_MS
};

function recordingPorts() {
  const calls = [];
  return {
    calls,
    upsert: async () => {
      calls.push(["upsert"]);
      return { client_id_number: "900" };
    },
    patch: async (properties) => calls.push(["patch", properties]),
    claimReplay: async (messageId) => {
      calls.push(["claimReplay", messageId]);
      return true;
    },
    schedule: async (replay) => calls.push(["schedule", replay])
  };
}

test("absent, blank, and present are three different reads", () => {
  const properties = { blank_null: null, blank_space: "  ", filled: "x" };
  assert.deepEqual(readProperty(properties, "missing"), { kind: "absent", name: "missing" });
  assert.equal(readProperty(properties, "blank_null").kind, "blank");
  assert.equal(readProperty(properties, "blank_space").kind, "blank");
  assert.deepEqual(readProperty(properties, "filled"), { kind: "present", name: "filled", value: "x" });
  assert.equal(Object.keys(readRequestedProperties(properties, ["filled", "missing"])).length, 2);
});

test("an absent requested key fails closed with field names only and no upsert call", async () => {
  const properties = { phi_last_name: "Secret", email: null };
  let thrown;
  try {
    assertNoAbsentProperties(properties, ["phi_last_name", "email", "postal_code"]);
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown.code, "REQUESTED_PROPERTY_ABSENT");
  assert.equal(thrown.message, "RequestedPropertyAbsent: postal_code");
  assert.ok(!thrown.message.includes("Secret"));

  const ports = recordingPorts();
  const plan = planAttempt({ ...BASE, deliveryCount: 10, error: thrown });
  await assert.rejects(runPlan(plan, ports), thrown);
  assert.deepEqual(ports.calls, [
    [
      "patch",
      {
        last_sync_status: "error",
        last_sync_at: "2026-10-29T12:00:00.000Z",
        last_sync_error: "RequestedPropertyAbsent: postal_code"
      }
    ]
  ]);
});

test("dry run is checked before final-error and calls no port", async () => {
  const ports = recordingPorts();
  const error = new Error("boom");
  const plan = planAttempt({ ...BASE, dryRun: true, deliveryCount: 10, error });
  assert.equal(plan.action, "dry-run-stop");
  assert.equal(await runPlan(plan, ports), "dry-run-stop");
  assert.deepEqual(ports.calls, []);

  const writePlan = planAttempt({ ...BASE, dryRun: true });
  assert.equal(await runPlan(writePlan, ports), "dry-run-stop");
  assert.deepEqual(ports.calls, []);
});

test("hash match while status is error patches only the three status fields", async () => {
  const ports = recordingPorts();
  const plan = planAttempt({
    ...BASE,
    hashMatched: true,
    centralReachId: "5324526",
    lastSyncStatus: "error"
  });
  assert.equal(await runPlan(plan, ports), "hash-match-clear");
  assert.equal(ports.calls.length, 1);
  assert.deepEqual(Object.keys(ports.calls[0][1]).sort(), [
    "last_sync_at",
    "last_sync_error",
    "last_sync_status"
  ]);
});

test("hash match without an error status writes nothing", async () => {
  const ports = recordingPorts();
  const plan = planAttempt({ ...BASE, hashMatched: true, centralReachId: "5324526" });
  assert.equal(await runPlan(plan, ports), "hash-match-stop");
  assert.deepEqual(ports.calls, []);
});

test("an early delivery retries with no patch", async () => {
  const ports = recordingPorts();
  const error = Object.assign(new Error("SyncInProgress"), { code: "SYNC_IN_PROGRESS" });
  await assert.rejects(runPlan(planAttempt({ ...BASE, deliveryCount: 9, error }), ports), error);
  assert.deepEqual(ports.calls, []);
});

test("final error on a linked record schedules one replay with a stable message id", async () => {
  const ports = recordingPorts();
  const error = new Error("CentralReach 500");
  const plan = planAttempt({ ...BASE, centralReachId: "5324526", deliveryCount: 10, error });
  await assert.rejects(runPlan(plan, ports), error);
  assert.equal(ports.calls[0][1].client_id_number, "5324526");
  assert.deepEqual(ports.calls.slice(1), [
    ["claimReplay", "replay:case:66712883229:1"],
    [
      "schedule",
      {
        replayCount: 1,
        scheduledEnqueueTimeUtc: "2026-10-29T12:30:00.000Z",
        messageId: "replay:case:66712883229:1"
      }
    ]
  ]);
  const last = planAttempt({ ...BASE, centralReachId: "1", deliveryCount: 10, replayCount: 2, error });
  assert.equal(last.replay, null);
});

test("employee with no id and create disabled is blocked without an upsert", async () => {
  const ports = recordingPorts();
  const plan = planAttempt({ ...BASE, binding: employeeBinding() });
  assert.equal(await runPlan(plan, ports), "blocked");
  assert.equal(ports.calls.length, 1);
  assert.equal(ports.calls[0][1].last_sync_status, "blocked");
  assert.equal(ports.calls[0][1].integration_last_write, undefined);
});

test("write upserts, then patches with the learned link fields", async () => {
  const ports = recordingPorts();
  assert.equal(await runPlan(planAttempt(BASE), ports), "write");
  assert.deepEqual(ports.calls[0], ["upsert"]);
  assert.equal(ports.calls[1][1].client_id_number, "900");
  assert.equal(ports.calls[1][1].last_sync_hash, "hash-1");
});
