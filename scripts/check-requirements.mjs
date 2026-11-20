// npm run check:requirements (BUILD-PLAN row 3.19). Lists every requirement of BUILD-PLAN
// section 9 with its status and the number of tests that cite it.
//
// Offline: it reads BUILD-PLAN.md, the test files in src/tests/smoke and one JSON file. It calls
// nothing. Not part of `npm test`.
//
// A test cites a requirement when its title starts with the ID in square brackets, for example
// "[CL4][4.21] staffing_status Staffed 97153 requires label 1156746". For tests written before
// that rule, docs/workstreams/architecture-update/requirement-tests.json maps a test title to the
// requirement IDs it proves: { "the test title": ["BR1", "C2"] }.
//
// It fails (exit code 1) when a requirement that is built, or is to build in a merged stage, has
// no test. Held, open, excluded and setup requirements are listed and never fail.
//
// The tests of the two check scripts themselves (titles tagged [3.10] or [3.19]) prove no
// requirement and are not counted.
//
// Which stages are merged: all of them, unless the run names them, for example at the wave 1
// merge:  npm run check:requirements -- --merged=1,2,P,3,4,5
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIREMENT_ID = /^(?:BR|CL|BL|TL|C|B|T|K)\d+$/;
const ALL_STAGES = ["P", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());
}

// Reads the requirement tables of section 9: [{ id, status }], in the order of the plan.
export function readRequirements(planText) {
  const requirements = [];
  let inSection9 = false;
  let statusColumn = -1;
  for (const line of String(planText).split("\n")) {
    if (line.startsWith("## ")) {
      inSection9 = line.startsWith("## 9.");
      statusColumn = -1;
      continue;
    }
    if (!inSection9 || !line.trim().startsWith("|")) {
      continue;
    }
    const cells = tableCells(line);
    if (cells[0] === "ID") {
      statusColumn = cells.indexOf("Status");
    } else if (REQUIREMENT_ID.test(cells[0]) && statusColumn >= 0) {
      requirements.push({ id: cells[0], status: cells[statusColumn] ?? "" });
    }
  }
  return requirements;
}

// The stages named by a row list such as "4.21", "P.3, L.1 to L.4", "Stage 3" or "Stages 4 to 6".
// The L rows (the label sender) are part of Stage 3.
function stagesIn(rowList) {
  const stages = [];
  const add = (stage) => {
    if (!stages.includes(stage)) {
      stages.push(stage);
    }
  };
  const range = /Stages (\d+) to (\d+)/.exec(rowList);
  if (range) {
    for (let stage = Number(range[1]); stage <= Number(range[2]); stage += 1) {
      add(String(stage));
    }
  }
  for (const match of rowList.matchAll(/Stage (\d+|P)\b|\b(\d+|P|L)\.\d+/g)) {
    const stage = match[1] || match[2];
    add(stage === "L" ? "3" : stage);
  }
  return stages;
}

// built: the status says some part is in the code today ("built 1", "built (old)"; never
// "not built"). toBuildStages: the stages of every "to build (...)" in the status. A "to build"
// that names no row or stage gets "?", which always counts as merged.
export function classifyStatus(statusText) {
  const status = String(statusText);
  const toBuildStages = [];
  for (const match of status.matchAll(/to build(?:\s*\(([^)]*)\))?/g)) {
    const stages = stagesIn(match[1] || "");
    for (const stage of stages.length > 0 ? stages : ["?"]) {
      if (!toBuildStages.includes(stage)) {
        toBuildStages.push(stage);
      }
    }
  }
  return { built: /(?<!not )\bbuilt\b/.test(status), toBuildStages };
}

// The requirement IDs in the square brackets a title starts with.
export function requirementIdsInTitle(title) {
  const leading = /^(?:\s*\[[^\]]*\])+/.exec(String(title));
  if (!leading) {
    return [];
  }
  const ids = [];
  for (const bracket of leading[0].matchAll(/\[([^\]]*)\]/g)) {
    for (const part of bracket[1].split(/[\s,]+/)) {
      if (REQUIREMENT_ID.test(part) && !ids.includes(part)) {
        ids.push(part);
      }
    }
  }
  return ids;
}

// A test of `npm run check:triggers` or of this script: its title carries the plan row [3.10] or
// [3.19] in its leading square brackets. It proves the check, not a requirement.
function isCheckScriptTest(title) {
  const leading = /^(?:\s*\[[^\]]*\])+/.exec(String(title));
  return Boolean(leading) && /\[(?:3\.10|3\.19)\]/.test(leading[0]);
}

// The titles of the test() and it() calls in one test file's text.
export function readTestTitles(sourceText) {
  const titles = [];
  const call = /(?<![\w.])(?:test|it)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const match of String(sourceText).matchAll(call)) {
    titles.push(match[2].replace(/\\(["'`\\])/g, "$1"));
  }
  return titles;
}

function plainStatus(status) {
  return status.replace(/\*\*|`/g, "");
}

// planText: BUILD-PLAN.md. testTitles: every test title. titleMap: requirement-tests.json.
// mergedStages: the stages whose "to build" requirements must have a test now.
export function checkRequirements({ planText, testTitles, titleMap = {}, mergedStages = ALL_STAGES }) {
  const merged = new Set([...mergedStages.map(String), "?"]);
  const existingTitles = new Set(testTitles);
  const testCounts = new Map();
  const count = (id) => testCounts.set(id, (testCounts.get(id) || 0) + 1);

  for (const title of testTitles) {
    if (isCheckScriptTest(title)) {
      continue;
    }
    const cited = requirementIdsInTitle(title);
    const mapped = Array.isArray(titleMap[title]) ? titleMap[title] : [];
    for (const id of new Set([...cited, ...mapped])) {
      count(id);
    }
  }
  const unknownMappedTitles = Object.keys(titleMap).filter((title) => !existingTitles.has(title));

  const rows = readRequirements(planText).map(({ id, status }) => {
    const { built, toBuildStages } = classifyStatus(status);
    const needsTest = built || toBuildStages.some((stage) => merged.has(stage));
    return { id, status, needsTest, testCount: testCounts.get(id) || 0 };
  });
  const failures = rows.filter((row) => row.needsTest && row.testCount === 0).map((row) => row.id);
  const lines = rows.map((row) => {
    const tests = `${row.testCount} test${row.testCount === 1 ? "" : "s"}`;
    const note = row.needsTest ? (row.testCount === 0 ? " | NO TEST" : "") : " | listed, no test needed yet";
    return `${row.id} | ${plainStatus(row.status)} | ${tests}${note}`;
  });
  return { ok: failures.length === 0, rows, failures, unknownMappedTitles, lines };
}

function main() {
  const repo = fileURLToPath(new URL("..", import.meta.url));
  const docs = join(repo, "docs", "workstreams", "architecture-update");
  const testFolder = join(repo, "src", "tests", "smoke");
  const testTitles = readdirSync(testFolder)
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .flatMap((name) => readTestTitles(readFileSync(join(testFolder, name), "utf8")));
  const mergedArgument = process.argv.find((argument) => argument.startsWith("--merged="));
  const mergedStages = mergedArgument
    ? mergedArgument.slice("--merged=".length).split(",").map((stage) => stage.trim()).filter(Boolean)
    : ALL_STAGES;

  const result = checkRequirements({
    planText: readFileSync(join(docs, "BUILD-PLAN.md"), "utf8"),
    testTitles,
    titleMap: JSON.parse(readFileSync(join(docs, "requirement-tests.json"), "utf8")),
    mergedStages
  });

  console.log(`Merged stages: ${mergedStages.join(", ")}`);
  for (const line of result.lines) {
    console.log(line);
  }
  for (const title of result.unknownMappedTitles) {
    console.log(`requirement-tests.json names a test that does not exist: ${title}`);
  }
  console.log(
    result.ok
      ? "check:requirements passed."
      : `check:requirements failed. No test for: ${result.failures.join(", ")}`
  );
  process.exitCode = result.ok ? 0 : 1;
}

// True when this module is the script node was started with. Both paths are compared by real
// path, so the check also runs when it is started through a symlink.
export function isEntryScript(moduleUrl, scriptPath = process.argv[1]) {
  if (!scriptPath) {
    return false;
  }
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(scriptPath);
  } catch {
    return false;
  }
}

if (isEntryScript(import.meta.url)) {
  main();
}
