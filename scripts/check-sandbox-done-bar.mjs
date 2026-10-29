// Fails when a tracked Markdown doc points at the old test run (Phases 0–5 in
// .test-evidence/TEST-RUN-SUMMARY.md) without labeling it as history. The current
// plan is WS.1, then WS.2, then a separate production pass.
//
// A line is flagged when it names a phase range such as "Phases 0–5" or "Phase 4–5",
// or the summary file, and carries none of the history words below. Single build
// phases ("phase 1", "Phase 1A") are a different numbering scheme and are not matched.
// The ".test-evidence" folder name does not count as a history label.
// The Checkout SHA in docs/HANDOFF.md must be an ancestor of HEAD, including HEAD itself.
//
// Usage, from azure_central_reach:
//   node scripts/check-sandbox-done-bar.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const OLD_RUN_REFERENCE = /\bPhases?\s+[0-5]\s*[–-]\s*[0-5]\b|TEST-RUN-SUMMARY/i;
const HISTORY_LABEL = /\b(previous|prior|history|historical|evidence)\b/i;
const EVIDENCE_FOLDER = /\.test-evidence/gi;
const EXCLUDED_PREFIX = "docs/export/";

function trackedMarkdownFiles() {
  return execFileSync("git", ["ls-files", "-z", "--", "*.md"], { encoding: "utf8" })
    .split("\0")
    .filter((file) => file && !file.startsWith(EXCLUDED_PREFIX) && fs.existsSync(file));
}

function findUnlabeledReferences(file) {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .map((text, index) => ({ file, line: index + 1, text: text.trim() }))
    .filter(
      ({ text }) =>
        OLD_RUN_REFERENCE.test(text) && !HISTORY_LABEL.test(text.replace(EVIDENCE_FOLDER, ""))
    );
}

const findings = trackedMarkdownFiles().flatMap(findUnlabeledReferences);

if (findings.length) {
  console.error("Old Phases 0–5 test referenced without a history label:");
  for (const { file, line, text } of findings) {
    console.error(`${file}:${line}: ${text}`);
  }
  process.exit(1);
}

const handoff = fs.readFileSync("docs/HANDOFF.md", "utf8");
const checkout = handoff.match(/^\*\*Checkout:\*\*.*`([0-9a-f]{7,40})`/m);
if (!checkout) {
  console.error("docs/HANDOFF.md Checkout line has no commit SHA");
  process.exit(1);
}
try {
  execFileSync("git", ["merge-base", "--is-ancestor", checkout[1], "HEAD"], { stdio: "ignore" });
} catch {
  console.error(`docs/HANDOFF.md checkout ${checkout[1]} is not an ancestor of HEAD`);
  process.exit(1);
}

console.log("sandbox done bar ok");
