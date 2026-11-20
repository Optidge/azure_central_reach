// npm run check:triggers (BUILD-PLAN row 3.10). Lists what the HubSpot workflow triggers miss.
//
// Offline: it reads the property lists in src/mappings and one JSON file. It calls nothing.
// Not part of `npm test`.
//
// It fails (exit code 1) when:
//   - a property the integration maps, watches as a change signal, or needs as a trigger
//     (mapped, signalOnly, mustTrigger) is not a trigger of that object's HubSpot workflows;
//   - a property the integration writes back (BR13) is a trigger. That would start a loop.
//
// docs/workstreams/architecture-update/webhook-triggers.json holds, per object, the trigger
// properties of every HubSpot workflow that calls the integration webhook. Zeke fills it from the
// HubSpot workflow exports (step 7.2; again from the production export in step 9.6).
import { readFileSync, realpathSync } from "node:fs";
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

// expected, written and triggers are maps of object key -> list of property names.
export function checkTriggers({ expected, written = {}, triggers = {} }) {
  const missing = {};
  const writtenTriggers = {};
  for (const object of Object.keys(expected)) {
    const triggerList = Array.isArray(triggers?.[object]) ? triggers[object] : [];
    missing[object] = expected[object].filter((property) => !triggerList.includes(property));
    writtenTriggers[object] = triggerList.filter((property) => (written[object] || []).includes(property));
  }
  const ok = Object.keys(expected).every(
    (object) => missing[object].length === 0 && writtenTriggers[object].length === 0
  );
  return { ok, missing, writtenTriggers };
}

function main() {
  const file = fileURLToPath(
    new URL("../docs/workstreams/architecture-update/webhook-triggers.json", import.meta.url)
  );
  const triggers = JSON.parse(readFileSync(file, "utf8"));
  const result = checkTriggers({
    expected: expectedTriggerProperties(),
    written: writtenProperties(),
    triggers
  });

  for (const object of Object.keys(result.missing)) {
    const label = LABELS[object] || object;
    for (const property of result.missing[object]) {
      console.log(`${label}: no trigger for ${property}`);
    }
    for (const property of result.writtenTriggers[object]) {
      console.log(`${label}: ${property} is written by the integration and must not be a trigger`);
    }
  }
  console.log(result.ok ? "check:triggers passed." : "check:triggers failed.");
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
