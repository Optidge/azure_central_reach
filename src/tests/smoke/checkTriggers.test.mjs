// Row 3.10 (BUILD-PLAN.md section 11): `npm run check:triggers` lists what the HubSpot workflow
// triggers miss. The script is not part of `npm test`; these tests call its exported functions
// with small fixtures. It is offline: it reads the property lists and one JSON file.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CASE_PROPERTIES } from "../../mappings/client/clientProperties.mjs";
import { BCBA_PROPERTIES, BT_RBT_PROPERTIES } from "../../mappings/employees/employeeProperties.mjs";
import {
  CONTACT_TRIGGER_PROPERTIES,
  checkTriggers,
  expectedTriggerProperties,
  isEntryScript,
  writtenProperties
} from "../../../scripts/check-triggers.mjs";

const EXPECTED = {
  case: ["phone", "case_status", "dealstage", "enter_in_central_reach"],
  contact: ["firstname", "email"]
};
const WRITTEN = { case: ["client_id_number", "last_sync_status"], contact: [] };

test("[BR5][3.10] the trigger check fails when a listed property has no trigger, and names it", () => {
  const result = checkTriggers({
    expected: EXPECTED,
    written: WRITTEN,
    triggers: { case: ["phone", "dealstage", "enter_in_central_reach"], contact: ["firstname", "email"] }
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, { case: ["case_status"], contact: [] });
  assert.deepEqual(result.writtenTriggers, { case: [], contact: [] });
});

test("[BR13][3.10] the trigger check fails when a property the integration writes is a trigger", () => {
  const result = checkTriggers({
    expected: EXPECTED,
    written: WRITTEN,
    triggers: {
      case: ["phone", "case_status", "dealstage", "enter_in_central_reach", "last_sync_status"],
      contact: ["firstname", "email"]
    }
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, { case: [], contact: [] });
  assert.deepEqual(result.writtenTriggers, { case: ["last_sync_status"], contact: [] });
});

test("[BR18][3.10] the trigger check passes when every listed property is a trigger; an extra trigger is allowed", () => {
  const result = checkTriggers({
    expected: EXPECTED,
    written: WRITTEN,
    triggers: {
      case: ["phone", "case_status", "dealstage", "enter_in_central_reach", "pipeline"],
      contact: ["firstname", "email"]
    }
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, { case: [], contact: [] });
  assert.deepEqual(result.writtenTriggers, { case: [], contact: [] });
});

test("[BR5][3.10] an object with no trigger list in the file fails, with every listed property missing", () => {
  const result = checkTriggers({ expected: EXPECTED, written: WRITTEN, triggers: { case: EXPECTED.case } });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing.contact, ["firstname", "email"]);
});

test("[BR18][3.10] the check reads mapped, signalOnly and mustTrigger of each object, and the fixed Contact list", () => {
  const expected = expectedTriggerProperties();
  assert.deepEqual(Object.keys(expected).sort(), ["bcba", "btRbt", "case", "contact"]);
  assert.deepEqual(expected.case, [
    ...CASE_PROPERTIES.mapped,
    ...CASE_PROPERTIES.signalOnly,
    ...CASE_PROPERTIES.mustTrigger
  ]);
  assert.deepEqual(expected.bcba, [
    ...BCBA_PROPERTIES.mapped,
    ...BCBA_PROPERTIES.signalOnly,
    ...BCBA_PROPERTIES.mustTrigger
  ]);
  assert.deepEqual(expected.btRbt, [
    ...BT_RBT_PROPERTIES.mapped,
    ...BT_RBT_PROPERTIES.signalOnly,
    ...BT_RBT_PROPERTIES.mustTrigger
  ]);
  assert.deepEqual(expected.contact, ["firstname", "lastname", "email", "phone"]);
  assert.deepEqual([...CONTACT_TRIGGER_PROPERTIES], ["firstname", "lastname", "email", "phone"]);
  // BR18 and BR10: the values that change with no edit, and the temporary-ID signals, are listed.
  for (const property of ["case_status", "staffing_status", "current_primary_bt", "ia_bcba_name", "dealstage"]) {
    assert.equal(expected.case.includes(property), true, `Case ${property}`);
  }
  for (const list of [expected.bcba, expected.btRbt]) {
    assert.equal(list.includes("workday_id"), true);
    assert.equal(list.includes("entered_in_centralreach"), true);
  }
  assert.equal(expected.btRbt.includes("btrbt_in_cr_checklist"), true);
  assert.equal(expected.bcba.includes("bcba_in_cr_checklist"), true);
});

test("[BR13][3.10] the written properties are the CR ID, the CR link and the six status properties, per object", () => {
  const shared = [
    "integration_last_write",
    "last_sync_at",
    "last_sync_error",
    "last_sync_hash",
    "last_sync_status",
    "updated_by_integration"
  ];
  const written = writtenProperties();
  assert.deepEqual([...written.case].sort(), ["central_reach_link_to_client", "client_id_number", ...shared].sort());
  assert.deepEqual([...written.bcba].sort(), ["central_reach_record_link", "employee_id", ...shared].sort());
  assert.deepEqual([...written.btRbt].sort(), ["central_reach_link_to_rt_rbt", "employee_id", ...shared].sort());
  assert.deepEqual(written.contact, []);
});

test("[BR13][3.10] with the real lists, no listed property is one the integration writes", () => {
  const expected = expectedTriggerProperties();
  const written = writtenProperties();
  for (const object of Object.keys(expected)) {
    for (const property of expected[object]) {
      assert.equal(written[object].includes(property), false, `${object} ${property}`);
    }
  }
});

test("[BR5][3.10] webhook-triggers.json is an empty template with one list per object, and the check fails on it until Zeke fills it", () => {
  const file = new URL("../../../docs/workstreams/architecture-update/webhook-triggers.json", import.meta.url);
  const triggers = JSON.parse(readFileSync(file, "utf8"));
  for (const object of ["case", "bcba", "btRbt", "contact"]) {
    assert.deepEqual(triggers[object], [], `${object} is an empty list`);
  }
  const result = checkTriggers({
    expected: expectedTriggerProperties(),
    written: writtenProperties(),
    triggers
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing.contact, ["firstname", "lastname", "email", "phone"]);
});

// Review fix C-R3: started through a symlinked path, the script used to print nothing and exit 0.
const TRIGGERS_SCRIPT = fileURLToPath(new URL("../../../scripts/check-triggers.mjs", import.meta.url));

function withSymlink(target, run) {
  const folder = mkdtempSync(join(tmpdir(), "check-script-"));
  const link = join(folder, "linked-check.mjs");
  try {
    symlinkSync(target, link);
    return run(link);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

test("[BR13][3.10] the script knows it is the entry script by real path, also through a symlink", () => {
  const moduleUrl = new URL("../../../scripts/check-triggers.mjs", import.meta.url).href;
  assert.equal(isEntryScript(moduleUrl, TRIGGERS_SCRIPT), true);
  withSymlink(TRIGGERS_SCRIPT, (link) => assert.equal(isEntryScript(moduleUrl, link), true));
  assert.equal(isEntryScript(moduleUrl, fileURLToPath(import.meta.url)), false);
  assert.equal(isEntryScript(moduleUrl, undefined), false);
  assert.equal(isEntryScript(moduleUrl, join(tmpdir(), "no-such-script.mjs")), false);
});

test("[BR13][3.10] started through a symlink the check still runs: it prints its result and the exit code matches", () => {
  withSymlink(TRIGGERS_SCRIPT, (link) => {
    const run = spawnSync(process.execPath, [link], { encoding: "utf8" });
    const passed = run.stdout.includes("check:triggers passed.");
    const failed = run.stdout.includes("check:triggers failed.");
    assert.equal(passed || failed, true, "the check printed its result");
    assert.equal(run.status, passed ? 0 : 1);
  });
});
