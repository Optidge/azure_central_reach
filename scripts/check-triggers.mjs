// npm run check:triggers (BUILD-PLAN row 3.10). Prints the trigger properties the code maps.
//
// Offline: it reads the property lists in src/mappings and prints them per object. It calls
// nothing and compares nothing. Zeke sets up and maintains the HubSpot workflow re-enrollment
// triggers in HubSpot (decision 51); this list is a reference for when a mapping changes.
// Not part of `npm test`. Exit code 0.
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { filterWritebackProperties } from "../src/lib/writebackAllowlist.mjs";
import { CASE_PROPERTIES } from "../src/mappings/client/clientProperties.mjs";
import { BCBA_PROPERTIES, BT_RBT_PROPERTIES } from "../src/mappings/employees/employeeProperties.mjs";

// The Contact workflow (Stage 6): a Guardian or BCBA Contact change reaches the linked record.
export const CONTACT_TRIGGER_PROPERTIES = Object.freeze(["firstname", "lastname", "email", "phone"]);

// The CR ID property of each object. The workers read the name from configuration; these are the
// names HubSpot uses in both portals.
const OBJECTS = [
  { key: "case", label: "Case", lists: CASE_PROPERTIES, kind: "client", idProperty: "client_id_number" },
  { key: "bcba", label: "BCBA", lists: BCBA_PROPERTIES, kind: "employee", idProperty: "employee_id" },
  { key: "btRbt", label: "BT/RBT", lists: BT_RBT_PROPERTIES, kind: "employee", idProperty: "employee_id" }
];
const LABELS = { case: "Case", bcba: "BCBA", btRbt: "BT/RBT", contact: "Contact" };

// Per object: every property a HubSpot workflow must trigger on.
export function expectedTriggerProperties() {
  const expected = {};
  for (const { key, lists } of OBJECTS) {
    expected[key] = [...lists.mapped, ...lists.signalOnly, ...lists.mustTrigger];
  }
  expected.contact = [...CONTACT_TRIGGER_PROPERTIES];
  return expected;
}

// Per object: the properties the integration writes back (BR13). It writes nothing to a Contact.
export function writtenProperties() {
  const written = {};
  for (const { key, lists, kind, idProperty } of OBJECTS) {
    const candidates = Object.fromEntries([...lists.system, idProperty].map((name) => [name, true]));
    written[key] = Object.keys(filterWritebackProperties(candidates, { kind, idProperty }));
  }
  written.contact = [];
  return written;
}

// Print, per object, the trigger properties the code maps (mapped, signalOnly, mustTrigger).
export function formatExpectedList(expected = expectedTriggerProperties()) {
  const lines = [];
  for (const object of Object.keys(expected)) {
    const names = [...new Set(expected[object])].sort();
    lines.push(`${LABELS[object] || object} (${names.length})`, ...names, "");
  }
  return lines.join("\n");
}

// `--expected` is still accepted: the script prints the same list with or without it.
function main() {
  process.stdout.write(formatExpectedList());
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
