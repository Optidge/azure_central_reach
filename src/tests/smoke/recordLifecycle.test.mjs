import test from "node:test";
import assert from "node:assert/strict";
import {
  RECORD_KINDS,
  caseBinding,
  checkboxIsYes,
  deriveRecordState,
  employeeBinding,
  parseSnapshot,
  sweepDecision,
  workerGate
} from "../../lib/recordLifecycle.mjs";
import { endTickOnRateLimit } from "../../lib/retry.mjs";

const OLD_MODIFIED = "2026-10-29T10:00:00.000Z";
const NOW = Date.parse("2026-10-29T12:00:00.000Z");
const SWEEP_ON = { now: NOW, createSweepEnabled: true, graceMinutes: 10 };

const FIXTURES = {
  untickedUnlinked: {
    binding: caseBinding(),
    properties: { enter_in_central_reach: "Yes - Generic", client_id_number: null, last_sync_at: null }
  },
  tickedNeverProcessed: {
    binding: caseBinding(),
    properties: {
      enter_in_central_reach: "Yes",
      client_id_number: "",
      last_sync_at: null,
      hs_lastmodifieddate: OLD_MODIFIED
    }
  },
  linkedQuiet: {
    binding: caseBinding(),
    properties: { enter_in_central_reach: null, client_id_number: "5324526", last_sync_status: "success" }
  },
  errorUnlinked: {
    binding: caseBinding(),
    properties: {
      enter_in_central_reach: "Yes",
      client_id_number: null,
      last_sync_status: "error",
      last_sync_at: OLD_MODIFIED
    }
  },
  errorLinked: {
    binding: employeeBinding(),
    properties: { entered_in_centralreach: "Yes", employee_id: "77", last_sync_status: "error" }
  },
  closedWithoutId: {
    binding: caseBinding(),
    properties: {
      enter_in_central_reach: "Yes",
      client_id_number: null,
      last_sync_status: "success",
      last_sync_at: OLD_MODIFIED
    }
  },
  blocked: {
    binding: employeeBinding(),
    properties: {
      entered_in_centralreach: "Yes",
      employee_id: null,
      last_sync_status: "blocked",
      last_sync_at: OLD_MODIFIED
    }
  }
};

function stateOf(kind) {
  const { binding, properties } = FIXTURES[kind];
  return deriveRecordState(parseSnapshot(properties, binding, "1"));
}

test("every RECORD_KIND has a fixture that derives to it", () => {
  assert.deepEqual(Object.keys(FIXTURES).sort(), [...RECORD_KINDS].sort());
  for (const kind of RECORD_KINDS) {
    assert.equal(stateOf(kind).kind, kind, `fixture for ${kind}`);
  }
});

test("only tickedNeverProcessed can be sweep-enqueued", () => {
  for (const kind of RECORD_KINDS) {
    const state = { ...stateOf(kind), modifiedAtMs: Date.parse(OLD_MODIFIED) };
    assert.equal(sweepDecision(state, SWEEP_ON).enqueue, kind === "tickedNeverProcessed", kind);
  }
});

test("sweep holds inside the grace, with no modified date, and when disabled", () => {
  const state = stateOf("tickedNeverProcessed");
  assert.equal(sweepDecision({ ...state, modifiedAtMs: NOW - 9 * 60 * 1000 }, SWEEP_ON).enqueue, false);
  assert.equal(sweepDecision({ ...state, modifiedAtMs: null }, SWEEP_ON).enqueue, false);
  assert.equal(sweepDecision(state, { ...SWEEP_ON, createSweepEnabled: false }).enqueue, false);
});

test("blocked and errorUnlinked require last_sync_at", () => {
  const blockedNoStamp = { ...FIXTURES.blocked.properties, last_sync_at: null };
  assert.equal(
    deriveRecordState(parseSnapshot(blockedNoStamp, employeeBinding(), "1")).kind,
    "tickedNeverProcessed"
  );
  const errorNoStamp = { ...FIXTURES.errorUnlinked.properties, last_sync_at: "" };
  assert.equal(
    deriveRecordState(parseSnapshot(errorNoStamp, caseBinding(), "1")).kind,
    "tickedNeverProcessed"
  );
});

test("a case never derives blocked", () => {
  const props = { ...FIXTURES.blocked.properties, enter_in_central_reach: "Yes" };
  assert.equal(deriveRecordState(parseSnapshot(props, caseBinding(), "1")).kind, "closedWithoutId");
});

test("checkbox Yes is the exact token after a split on semicolon", () => {
  assert.equal(checkboxIsYes("Yes"), true);
  assert.equal(checkboxIsYes("No- Made Inactive;Yes"), true);
  assert.equal(checkboxIsYes("Yes - Active"), false);
  assert.equal(checkboxIsYes(null), false);
});

test("worker gate syncs a linked record with the box unticked and skips unticked unlinked", () => {
  assert.deepEqual(workerGate(stateOf("linkedQuiet")), { action: "sync" });
  assert.deepEqual(workerGate(stateOf("tickedNeverProcessed")), { action: "sync" });
  assert.equal(workerGate(stateOf("untickedUnlinked")).action, "skip");
});

test("an exhausted 429 ends the tick and other errors do not", () => {
  assert.equal(endTickOnRateLimit({ response: { status: 429 } }).endTick, true);
  assert.equal(endTickOnRateLimit({ response: { status: 500 } }).endTick, false);
  assert.equal(endTickOnRateLimit(new Error("boom")).endTick, false);
});
