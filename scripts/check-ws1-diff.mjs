import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_PATH = fileURLToPath(new URL("../docs/ws1-schema-diff.md", import.meta.url));

const RULES = [
  ["token assignment", /\b[A-Z0-9_]*(TOKEN|SECRET|API_KEY|CLIENT_ID)[A-Z0-9_]*\s*[=:]\s*\S/],
  ["token assignment", /\bpat-[a-z0-9]{2,4}-[0-9a-f-]{20,}/i],
  ["CRM record export", /"(properties|propertiesWithHistory)"\s*:\s*\{/],
  ["CRM record export", /"hs_object_id"\s*:\s*"?\d/],
  ["CRM record export", /hs api\s+\S*\/crm\/v[34]\/objects\//]
];

const path = process.argv[2] || DEFAULT_PATH;
const lines = readFileSync(path, "utf8").split("\n");

const hits = [];
lines.forEach((line, i) => {
  const rule = RULES.find(([, pattern]) => pattern.test(line));
  if (rule) hits.push(`${path}:${i + 1}: ${rule[0]}: ${line.trim().slice(0, 160)}`);
});

if (hits.length) {
  console.error(`check-ws1-diff: ${hits.length} forbidden line(s)`);
  for (const hit of hits) console.error(hit);
  process.exit(1);
}

console.log(`check-ws1-diff: ok, ${lines.length} lines in ${path} with no token assignment or CRM record export`);
