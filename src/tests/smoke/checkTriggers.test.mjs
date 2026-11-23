// Row 3.10 (BUILD-PLAN.md section 11, decision 51): `npm run check:triggers` prints the trigger
// properties the code maps, per object. It compares nothing. It is not part of `npm test`; these
// tests call its exported functions. It is offline: it reads the property lists only.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CASE_PROPERTIES } from "../../mappings/client/clientProperties.mjs";
import { BCBA_PROPERTIES, BT_RBT_PROPERTIES } from "../../mappings/employees/employeeProperties.mjs";
import {
  CONTACT_TRIGGER_PROPERTIES,
  expectedTriggerProperties,
  formatExpectedList,
  isEntryScript,
  writtenProperties
} from "../../../scripts/check-triggers.mjs";

test("[BR18][3.10] the expected list is built from mapped, signalOnly and mustTrigger of each object, and the fixed Contact list", () => {
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

test("[BR13][3.10] started through a symlink the script still runs: it prints the list and exits 0", () => {
  withSymlink(TRIGGERS_SCRIPT, (link) => {
    const run = spawnSync(process.execPath, [link], { encoding: "utf8" });
    assert.equal(run.status, 0);
    assert.equal(run.stdout.includes("Case ("), true);
  });
});

test("[BR18][3.10] the list prints each object's trigger properties sorted, one per line, with a count", () => {
  const text = formatExpectedList({ case: ["phone", "email", "phone"], contact: ["lastname"] });
  assert.equal(text, "Case (2)\nemail\nphone\n\nContact (1)\nlastname\n");
});

test("[BR18][3.10] the script lists all four objects and exits 0, with or without --expected, and compares nothing", () => {
  const plain = spawnSync(process.execPath, [TRIGGERS_SCRIPT], { encoding: "utf8" });
  const flagged = spawnSync(process.execPath, [TRIGGERS_SCRIPT, "--expected"], { encoding: "utf8" });
  for (const run of [plain, flagged]) {
    assert.equal(run.status, 0);
    for (const label of ["Case (", "BCBA (", "BT/RBT (", "Contact ("]) {
      assert.equal(run.stdout.includes(label), true, label);
    }
    assert.equal(run.stdout.includes("check:triggers"), false);
  }
  assert.equal(plain.stdout, flagged.stdout);
});
