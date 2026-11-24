// Row 3.19 (BUILD-PLAN.md section 11): `npm run check:requirements` lists every section 9
// requirement with its status and the tests whose titles cite it. The script is not part of
// `npm test`; these tests call its exported functions with small fixtures. It is offline: it reads
// BUILD-PLAN.md, the test files and one JSON file.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkRequirements,
  classifyStatus,
  isEntryScript,
  readRequirements,
  readTestTitles,
  requirementIdsInTitle
} from "../../../scripts/check-requirements.mjs";

// A small copy of the shape of BUILD-PLAN section 9. The status texts are real ones.
const PLAN = `
## 8. Stage 2

| ID | Rule | Status |
|---|---|---|
| BR99 | Not in section 9 | to build (9.9) |

## 9. Requirements

### 9.1 Business rules

| ID | Rule | Guide source | Status | Waits on |
|---|---|---|---|---|
| BR1 | Create when Entered in CentralReach is Yes. | [GBR] | built 1 (\`src/lib/syncEligibility.mjs\`) | Production workflows |
| BR15 | Failures and monitoring. | Architecture tab | setup (7.2, 7.3, 9.6) | Zeke |

### 9.2 Case

| ID | Requirement | Guide source | HubSpot source | CR target | Status | Waits on |
|---|---|---|---|---|---|---|
| C8 | Mailing address | [GER-CASE] | \`street_address\` | Address | to build (4.1). Today line 1 prefers another property. | — |
| C13 | Grad Permit Holder | [GER-CASE] | association | Meta \`136052\` | open | United Care (O-15) |

| ID | Label rule | Guide source | HubSpot source | CR label | Group | Status |
|---|---|---|---|---|---|---|
| CL5 | Funding source | [G19] | — | — | — | **excluded**: "Do not send the client funding-source labels" |
| BL3 | New Mexico, Virginia | [G19] | no value yet | NM Employee | not managed | constants to build (5.4); the mapping is **held** (O-6) |
| TL2 | New Mexico, Virginia | [G19] | no value yet | NM Employee | not managed | constants with 5.4; mapping **held** (O-6) |
| BL6 | Credentials | [G08] | labels | none | not managed | **not documented in the guide; not built** (decision 25) |

### 9.5 Contact

| ID | Requirement | Guide source | HubSpot source | Target | Status | Waits on |
|---|---|---|---|---|---|---|
| K1 | A Contact change reaches the Case | [GER-CONTACT] | Contact | worker | to build (6.1, 6.2) | workflows |

## 10. Stage P

| ID | Rule | Status |
|---|---|---|
| BR98 | Not in section 9 | built 1 |
`;

const WAVE_1 = ["1", "2", "P", "3", "4", "5"];
const row = (result, id) => result.rows.find((item) => item.id === id);

test("[BR1][3.19] the check fails on a to-build requirement of a merged stage with no test", () => {
  const result = checkRequirements({
    planText: PLAN,
    testTitles: ["[BR1][1.1] create gate", "[BL3][5.4] constants exist"],
    titleMap: {},
    mergedStages: WAVE_1
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, ["C8"]);
  assert.equal(row(result, "C8").testCount, 0);
  assert.equal(row(result, "C8").needsTest, true);
});

test("[BR1][3.19] the check passes when a test title cites the requirement", () => {
  const result = checkRequirements({
    planText: PLAN,
    testTitles: [
      "[BR1][1.1] create gate",
      "[C8][4.1] address line 1 is street_address only",
      "[C8][4.1] the state comes from stateregion",
      "[BL3][5.4] constants exist"
    ],
    titleMap: {},
    mergedStages: WAVE_1
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.equal(row(result, "C8").testCount, 2);
});

test("[BR1][3.19] a held, open, excluded, not-built or setup requirement is listed with its status, not failed", () => {
  const result = checkRequirements({
    planText: PLAN,
    testTitles: ["[BR1][1.1] create gate", "[C8][4.1] address", "[BL3][5.4] constants exist"],
    titleMap: {},
    mergedStages: WAVE_1
  });
  assert.equal(result.ok, true);
  for (const id of ["C13", "CL5", "TL2", "BL6", "BR15"]) {
    assert.equal(row(result, id).needsTest, false, `${id} needs no test`);
    assert.equal(row(result, id).testCount, 0);
    assert.equal(result.lines.some((line) => line.startsWith(`${id} `)), true, `${id} is listed`);
  }
  assert.equal(row(result, "C13").status, "open");
  assert.equal(result.lines.find((line) => line.startsWith("CL5 ")).includes("excluded"), true);
});

test("[BR1][3.19] an old test mapped in requirement-tests.json counts, and only when that test exists", () => {
  const titleMap = {
    "client create sends the Case address": ["C8"],
    "a test that was deleted": ["BL3"]
  };
  const result = checkRequirements({
    planText: PLAN,
    testTitles: ["[BR1][1.1] create gate", "client create sends the Case address"],
    titleMap,
    mergedStages: WAVE_1
  });
  assert.equal(row(result, "C8").testCount, 1);
  assert.equal(row(result, "BL3").testCount, 0);
  assert.deepEqual(result.failures, ["BL3"]);
  assert.deepEqual(result.unknownMappedTitles, ["a test that was deleted"]);
});

test("[BR1][3.19] a to-build requirement of a stage that is not merged yet is listed, not failed; it fails once the stage is merged", () => {
  const titles = ["[BR1][1.1] create gate", "[C8][4.1] address", "[BL3][5.4] constants exist"];
  const wave1 = checkRequirements({ planText: PLAN, testTitles: titles, titleMap: {}, mergedStages: WAVE_1 });
  assert.equal(wave1.ok, true);
  assert.equal(row(wave1, "K1").needsTest, false);

  const wave2 = checkRequirements({
    planText: PLAN,
    testTitles: titles,
    titleMap: {},
    mergedStages: [...WAVE_1, "6"]
  });
  assert.equal(wave2.ok, false);
  assert.deepEqual(wave2.failures, ["K1"]);
});

test("[BR1][3.19] a built requirement always needs a test, whatever stages are merged", () => {
  const result = checkRequirements({ planText: PLAN, testTitles: [], titleMap: {}, mergedStages: [] });
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, ["BR1"]);
});

test("[BR1][3.19] only section 9 is read, and one line is printed per requirement with its status and test count", () => {
  const requirements = readRequirements(PLAN);
  assert.deepEqual(
    requirements.map((item) => item.id),
    ["BR1", "BR15", "C8", "C13", "CL5", "BL3", "TL2", "BL6", "K1"]
  );
  const result = checkRequirements({
    planText: PLAN,
    testTitles: ["[BR1][1.1] create gate", "[BR1][1.2] another"],
    titleMap: {},
    mergedStages: WAVE_1
  });
  assert.equal(result.lines.length, requirements.length);
  const line = result.lines.find((item) => item.startsWith("BR1 "));
  assert.equal(line.includes("built 1"), true);
  assert.equal(line.includes("2 tests"), true);
});

test("[BR1][3.19] classifyStatus reads the real status texts of section 9", () => {
  assert.deepEqual(classifyStatus("built 1"), { built: true, toBuildStages: [] });
  assert.deepEqual(classifyStatus("built (old)"), { built: true, toBuildStages: [] });
  assert.deepEqual(classifyStatus("to build (4.21). The constants file still lists six; P.3 trims it."), {
    built: false,
    toBuildStages: ["4"]
  });
  assert.deepEqual(classifyStatus("gate built 1; poller and sweep side to build (3.4)"), {
    built: true,
    toBuildStages: ["3"]
  });
  assert.deepEqual(classifyStatus("add-only built 1; managed sender to build (P.3, L.1 to L.4)"), {
    built: true,
    toBuildStages: ["P", "3"]
  });
  assert.deepEqual(
    classifyStatus("worker built 1 and 2; detection to build (Stage 3); mappings to build (Stages 4 to 6)"),
    { built: true, toBuildStages: ["3", "4", "5", "6"] }
  );
  assert.deepEqual(classifyStatus("**not documented in the guide; not built** (decision 25)"), {
    built: false,
    toBuildStages: []
  });
  assert.deepEqual(classifyStatus("open"), { built: false, toBuildStages: [] });
  assert.deepEqual(classifyStatus("Stages 7 and 8"), { built: false, toBuildStages: [] });
});

test("[BR1][3.19] a title cites the requirement IDs in its leading square brackets, and nothing after them", () => {
  assert.deepEqual(requirementIdsInTitle("[CL4][4.21] staffing_status Staffed 97153 requires label 1156746"), ["CL4"]);
  assert.deepEqual(requirementIdsInTitle("[P.5c][BR16] a field named in omitFieldIds is left out"), ["BR16"]);
  assert.deepEqual(requirementIdsInTitle("[BR16, C10][4.16] two IDs in one bracket"), ["BR16", "C10"]);
  assert.deepEqual(requirementIdsInTitle("[2.5] a lease is taken over [BR14]"), []);
  assert.deepEqual(requirementIdsInTitle("[G17] a guide code alone does not count"), []);
  assert.deepEqual(requirementIdsInTitle("no brackets C8"), []);
});

test("[BR1][3.19] test titles are read from test() and it() calls in a test file's text", () => {
  const source = [
    'test("[C8][4.1] double quotes", () => {});',
    "it('[BR2] single quotes', () => {});",
    "  test(`[TL3][5.12] bt_rbt_type ${type} template`, () => {});",
    'describe("a group", () => {});',
    'const notATest = "[C8] text";'
  ].join("\n");
  assert.deepEqual(readTestTitles(source), [
    "[C8][4.1] double quotes",
    "[BR2] single quotes",
    "[TL3][5.12] bt_rbt_type ${type} template"
  ]);
});

test("[BR1][3.19] the real BUILD-PLAN section 9 is read: every family of IDs, with the statuses the plan gives", () => {
  const planFile = new URL("../../../docs/workstreams/architecture-update/BUILD-PLAN.md", import.meta.url);
  const requirements = readRequirements(readFileSync(planFile, "utf8"));
  const ids = requirements.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  const count = (prefix) => ids.filter((id) => new RegExp(`^${prefix}\\d+$`).test(id)).length;
  assert.deepEqual(
    { BR: count("BR"), C: count("C"), CL: count("CL"), B: count("B"), BL: count("BL"), T: count("T"), TL: count("TL"), K: count("K") },
    { BR: 22, C: 38, CL: 6, B: 13, BL: 8, T: 9, TL: 4, K: 5 }
  );
  const status = (id) => requirements.find((item) => item.id === id).status;
  assert.equal(classifyStatus(status("BR1")).built, true);
  // C22 was "to build (4)" until the wave 1 merge of 2026-11-20. These lines follow the plan's
  // statuses: K1 below changes the same way when row 6.1 is merged.
  assert.equal(classifyStatus(status("C22")).built, true);
  // C13 was "open" until it was built in the package of 2026-11-24; C18 is still open.
  assert.deepEqual(classifyStatus(status("C13")), { built: true, toBuildStages: [] });
  assert.deepEqual(classifyStatus(status("C18")), { built: false, toBuildStages: [] });
  assert.deepEqual(classifyStatus(status("CL5")), { built: false, toBuildStages: [] });
  assert.deepEqual(classifyStatus(status("BL6")), { built: false, toBuildStages: [] });
  assert.deepEqual(classifyStatus(status("K1")), { built: true, toBuildStages: [] });
});

test("[BR1][3.19] requirement-tests.json is a JSON map the orchestrator fills at the wave 1 merge", () => {
  const file = new URL("../../../docs/workstreams/architecture-update/requirement-tests.json", import.meta.url);
  const titleMap = JSON.parse(readFileSync(file, "utf8"));
  assert.equal(titleMap !== null && typeof titleMap === "object" && !Array.isArray(titleMap), true);
  for (const [title, ids] of Object.entries(titleMap)) {
    assert.equal(Array.isArray(ids), true, title);
  }
});

// Review fix C-R4: the tests of the two check scripts themselves prove no requirement.
test("[BR1][3.19] a title tagged [3.10] or [3.19] is a test of a check script and counts toward no requirement", () => {
  const result = checkRequirements({
    planText: PLAN,
    testTitles: [
      "[BR1][3.19] the check fails on a to-build requirement",
      "[C8][3.10] the trigger check fails when a listed property has no trigger",
      "[BL3][5.4] constants exist"
    ],
    titleMap: { "[BR1][3.19] the check fails on a to-build requirement": ["BR1"] },
    mergedStages: WAVE_1
  });
  assert.equal(row(result, "BR1").testCount, 0);
  assert.equal(row(result, "C8").testCount, 0);
  assert.deepEqual(result.failures, ["BR1", "C8"]);

  const counted = checkRequirements({
    planText: PLAN,
    testTitles: ["[BR1][3.1] the poller schedule", "[C8][4.1] address", "[BL3][5.4] constants exist"],
    titleMap: {},
    mergedStages: WAVE_1
  });
  assert.equal(row(counted, "BR1").testCount, 1);
  assert.equal(counted.ok, true);
});

// Review fix C-R3: started through a symlinked path, the script used to print nothing and exit 0.
const REQUIREMENTS_SCRIPT = fileURLToPath(
  new URL("../../../scripts/check-requirements.mjs", import.meta.url)
);

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

test("[BR1][3.19] the script knows it is the entry script by real path, also through a symlink", () => {
  const moduleUrl = new URL("../../../scripts/check-requirements.mjs", import.meta.url).href;
  assert.equal(isEntryScript(moduleUrl, REQUIREMENTS_SCRIPT), true);
  withSymlink(REQUIREMENTS_SCRIPT, (link) => assert.equal(isEntryScript(moduleUrl, link), true));
  assert.equal(isEntryScript(moduleUrl, fileURLToPath(import.meta.url)), false);
  assert.equal(isEntryScript(moduleUrl, undefined), false);
  assert.equal(isEntryScript(moduleUrl, join(tmpdir(), "no-such-script.mjs")), false);
});

test("[BR1][3.19] started through a symlink the check still runs: it prints its result and the exit code matches", () => {
  withSymlink(REQUIREMENTS_SCRIPT, (link) => {
    const run = spawnSync(process.execPath, [link, "--merged=1,2,P"], { encoding: "utf8" });
    assert.equal(run.stdout.includes("Merged stages: 1, 2, P"), true);
    const passed = run.stdout.includes("check:requirements passed.");
    const failed = run.stdout.includes("check:requirements failed.");
    assert.equal(passed || failed, true, "the check printed its result");
    assert.equal(run.status, passed ? 0 : 1);
  });
});
