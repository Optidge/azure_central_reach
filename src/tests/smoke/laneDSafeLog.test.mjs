// Row 3.20 (BR15): a record ID must survive the log. A ten-digit ID looks like a phone number to
// the phone pattern of src/lib/safeLog.mjs. A short allowlist of ID key names keeps a number or a
// digits-only text under those keys; every other value is redacted as before.
import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { safeLog } from "../../lib/safeLog.mjs";
import { createSyncRunSummary } from "../../lib/syncRunSummary.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import { caseDeps } from "./laneDFakes.mjs";
import { setup, stage3Case } from "./stage3WorkerFakes.mjs";

// Runs fn with console.info and console.warn captured; returns the [message, meta] pairs.
async function captured(fn) {
  const lines = [];
  const info = mock.method(console, "info", (...args) => lines.push(args));
  const warn = mock.method(console, "warn", (...args) => lines.push(args));
  try {
    await fn();
  } finally {
    info.mock.restore();
    warn.mock.restore();
  }
  return lines;
}

test("[BR15][3.20] a ten-digit record ID appears unredacted in the Sync run summary line, through the real safeLog", async () => {
  setup();
  const record = stage3Case({ enter_in_central_reach: "" });
  const lines = await captured(() =>
    runClientSyncWorkflow(
      { dealId: "4821193760", source: "hubspotWorkflow", context: { invocationId: "inv-77" } },
      { ...caseDeps({ record }), safeLog }
    )
  );
  const summary = lines.filter(([message]) => message === "Sync run summary.");
  assert.equal(summary.length, 1);
  assert.equal(summary[0][1].recordId, "4821193760");
  assert.equal(summary[0][1].portalId, "52311591");
  assert.equal(summary[0][1].invocationId, "inv-77");
  assert.equal(JSON.stringify(summary[0][1]).includes("REDACTED"), false);
});

test("[BR15][3.20] the helper's default logger is safeLog: a ten-digit record ID survives, and so does the same number as a number", async () => {
  for (const recordId of ["4821193760", 4821193760]) {
    const lines = await captured(() => {
      const summary = createSyncRunSummary({ workflow: "bcbaSync", recordId, portalId: "50317927" });
      summary.setOutcome("success");
      summary.log();
    });
    assert.equal(lines[0][1].recordId, "4821193760");
  }
});

test("[BR15][3.20] a ten-digit phone under a key that is not an ID key is still redacted", async () => {
  const lines = await captured(() =>
    safeLog("info", "x", {
      phone: "5185550142",
      note: "call 518-555-0142 or 5185550142",
      recordIdentifier: "5185550142",
      count: 5185550142
    })
  );
  const meta = lines[0][1];
  assert.equal(meta.phone, "[REDACTED_PHONE]");
  assert.equal(meta.note, "call [REDACTED_PHONE] or [REDACTED_PHONE]");
  assert.equal(meta.recordIdentifier, "[REDACTED_PHONE]");
  assert.equal(meta.count, "[REDACTED_PHONE]");
});

test("[BR15][3.20] an ID key that holds a formatted phone, an email or any text that is not digits only is still redacted", async () => {
  const lines = await captured(() =>
    safeLog("info", "x", {
      recordId: "555-123-4567",
      dealId: "(518) 555-0142",
      crContactId: "+1 518 555 0142",
      contactId: "518.555.0142",
      messageId: "id 5185550142",
      employeeId: "a@example.com",
      existingContactId: 5185550142.5
    })
  );
  const meta = lines[0][1];
  for (const key of ["recordId", "dealId", "crContactId", "contactId", "messageId"]) {
    assert.equal(meta[key].includes("[REDACTED_PHONE]"), true, key);
    assert.equal(/\d{3}[-. )]*\d{4}/.test(meta[key]), false, key);
  }
  assert.equal(meta.employeeId, "[REDACTED_EMAIL]");
  // Not a whole number: not an ID.
  assert.equal(meta.existingContactId.includes("5185550142"), false);
});

test("[BR15][3.20] every allowlisted ID key keeps a digits-only value", async () => {
  const keys = [
    "recordId",
    "dealId",
    "portalId",
    "invocationId",
    "messageId",
    "contactId",
    "crContactId",
    "existingContactId",
    "employeeId"
  ];
  const lines = await captured(() =>
    safeLog("info", "x", Object.fromEntries(keys.map((key) => [key, "4821193760"])))
  );
  for (const key of keys) {
    assert.equal(lines[0][1][key], "4821193760", key);
  }
});
