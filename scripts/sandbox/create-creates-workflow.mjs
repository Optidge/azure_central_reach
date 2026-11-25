// Creates the phase one "creates" workflows in HubSpot SANDBOX 52311591, one per object (Case,
// BCBA, BT/RBT), each turned OFF. Package D18 c (BUILD-PACKAGE-DRAFT-2026-11-23.md:815, :820-822):
// the workflow ticks `centralreach_creates_only` only on a record created after the cutover date
// with Entered = Yes and no CR ID. Re-enrolment off. Spec and sources:
// docs/workstreams/architecture-update/creates-workflow-script-note-2026-11-25.md.
//
// SANDBOX ONLY. Before any other call it checks that the token belongs to portal 52311591 and that
// the account is a SANDBOX; otherwise it stops. HubSpot production 50317927 is never written.
// It never turns a workflow on: every payload is checked for isEnabled = false before it is sent,
// and the script sends no PUT, PATCH or DELETE. It never calls CentralReach or Azure and writes no
// record. Workflows are created through the Automation v4 flows API (beta; `automation` scope).
//
// Modes (from the repo root):
//   node scripts/sandbox/create-creates-workflow.mjs --cutover-date 2026-11-26
//       DRY RUN (default): prints the exact JSON payloads. Loads no credentials, calls no network.
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-creates-workflow.mjs --cutover-date 2026-11-26 --preflight
//       READ-ONLY: portal check, property checks, existing-name check, and the set-property action
//       and enrolment of the three promote workflows (the same action, built on the HubSpot screen),
//       so the payload shape is compared with what this portal stores. Creates nothing.
//   NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-creates-workflow.mjs --cutover-date 2026-11-26 --write
//       Runs every preflight check, stops on any failure, then creates the workflows (OFF) and reads
//       each one back: id, name, isEnabled, enrolment and action summary.
//   --only case,bcba,bt   limits the run to these objects (default: all three).
//
// --cutover-date is the FIRST day whose new records are enrolled (Zeke, 2026-11-25: "Keep cutover
// day itself as counting."). The filter is the HubSpot "is after" date filter set to the END of the
// day before it (23:59:59.999, America/New_York).
//
// The token is HUBSPOT_PRIVATE_APP_TOKEN from local.settings.json, read at run time only in
// --preflight / --write, never printed. No header or setting value is printed.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SANDBOX_PORTAL = "52311591";
const PRODUCTION_PORTAL = "50317927";
const API_BASE = "https://api.hubapi.com";
const CUTOVER_TIME_ZONE = "America/New_York";

// The creates gate property and the value the code reads as ticked (src/lib/config.mjs:153,
// src/lib/syncEligibility.mjs:29-31: true or "true").
const CREATES_GATE_PROPERTY = "centralreach_creates_only";
const UPDATES_GATE_PROPERTY = "centralreach_updates_only";
const GATE_TICKED_VALUE = "true";
// Entered = Yes (src/constants/hubspot.mjs:34-38): the Case multi-checkbox contains Yes; BCBA and
// BT/RBT store exactly Yes.
const ENTRY_YES_VALUE = "Yes";
const NAME_PREFIX = "CR creates after cutover - ";
const SET_PROPERTY_ACTION_TYPE_ID = "0-5";

// Promote workflow IDs: PROMOTE-WORKFLOW-PROMPT-2026-11-24.md:183-185 (built on the screen, OFF).
const OBJECTS = Object.freeze([
  {
    key: "case",
    label: "Case",
    objectTypeId: "0-3",
    createDateProperty: "createdate",
    entryProperty: "enter_in_central_reach",
    entryFieldTypes: ["checkbox"],
    // Multi-checkbox: "contains all of [Yes]" = contains Yes (guide: use "contains", not "equals").
    entryOperator: "CONTAINS_ALL",
    crIdProperty: "client_id_number",
    promoteFlowId: "1935391552"
  },
  {
    key: "bcba",
    label: "BCBA",
    objectTypeId: "2-72890322",
    createDateProperty: "hs_createdate",
    entryProperty: "entered_in_centralreach",
    entryFieldTypes: ["select", "radio"],
    // Single select: "is any of [Yes]" = exactly Yes.
    entryOperator: "IS_ANY_OF",
    crIdProperty: "employee_id",
    promoteFlowId: "1935383679"
  },
  {
    key: "bt",
    label: "BT/RBT",
    objectTypeId: "2-72890325",
    createDateProperty: "hs_createdate",
    entryProperty: "entered_in_centralreach",
    entryFieldTypes: ["select", "radio"],
    entryOperator: "IS_ANY_OF",
    crIdProperty: "employee_id",
    promoteFlowId: "1935391616"
  }
]);

// ---- Arguments ----
function readArgs(argv) {
  const valueOf = (flag) => {
    const index = argv.indexOf(flag);
    return index === -1 ? null : argv[index + 1] ?? "";
  };
  const write = argv.includes("--write");
  const preflight = argv.includes("--preflight");
  if (write && preflight) throw new Error("Give --preflight or --write, not both.");
  const cutoverDate = parseCutoverDate(valueOf("--cutover-date"));
  const only = valueOf("--only");
  const keys = only === null ? OBJECTS.map((o) => o.key) : only.split(",").map((k) => k.trim());
  const unknown = keys.filter((k) => !OBJECTS.some((o) => o.key === k));
  if (!keys.length || unknown.length) throw new Error(`--only takes case, bcba, bt (got: ${only}).`);
  return {
    mode: write ? "write" : preflight ? "preflight" : "dry-run",
    cutoverDate,
    objects: OBJECTS.filter((o) => keys.includes(o.key))
  };
}

function parseCutoverDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? "");
  if (!match) throw new Error("Give --cutover-date YYYY-MM-DD (required).");
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error(`--cutover-date ${text} is not a real date.`);
  }
  return { text, year, month, day };
}

// ---- Payload (Automation v4 flows API; shapes from the HubSpot workflows v4 guide, the action
// and enrolment reference, and the list filters guide) ----
// Zeke, 2026-11-25: "Keep cutover day itself as counting." Records created ON the cutover day are
// enrolled, so the "is after" point is the end of the day BEFORE the cutover date.
function dayBefore({ year, month, day }) {
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  const parts = { year: previous.getUTCFullYear(), month: previous.getUTCMonth() + 1, day: previous.getUTCDate() };
  const text = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  return { ...parts, text };
}

function createdAfterFilter(property, cutoverDate) {
  const date = dayBefore(cutoverDate);
  return {
    filterType: "PROPERTY",
    property,
    operation: {
      operator: "IS_AFTER",
      includeObjectsWithNoValueSet: false,
      timePoint: {
        timeType: "DATE",
        timezoneSource: "CUSTOM",
        zoneId: CUTOVER_TIME_ZONE,
        year: date.year,
        month: date.month,
        day: date.day,
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999
      },
      endpointBehavior: "EXCLUSIVE",
      propertyParser: "VALUE",
      type: "TIME_POINT",
      operationType: "TIME_POINT"
    }
  };
}

function entryYesFilter(object) {
  return {
    filterType: "PROPERTY",
    property: object.entryProperty,
    operation: {
      operator: object.entryOperator,
      includeObjectsWithNoValueSet: false,
      values: [ENTRY_YES_VALUE],
      operationType: "ENUMERATION"
    }
  };
}

function crIdUnknownFilter(property) {
  return {
    filterType: "PROPERTY",
    property,
    operation: { operator: "IS_UNKNOWN", includeObjectsWithNoValueSet: true, operationType: "ALL_PROPERTY" }
  };
}

function setCreatesGateAction() {
  return {
    type: "SINGLE_CONNECTION",
    actionId: "1",
    actionTypeVersion: 0,
    actionTypeId: SET_PROPERTY_ACTION_TYPE_ID,
    fields: { property_name: CREATES_GATE_PROPERTY, value: { staticValue: GATE_TICKED_VALUE, type: "STATIC_VALUE" } }
  };
}

function buildFlow(object, cutoverDate) {
  return {
    isEnabled: false,
    flowType: "WORKFLOW",
    name: `${NAME_PREFIX}${object.label}`,
    type: "PLATFORM_FLOW",
    objectTypeId: object.objectTypeId,
    startActionId: "1",
    nextAvailableActionId: "2",
    actions: [setCreatesGateAction()],
    enrollmentCriteria: {
      shouldReEnroll: false,
      type: "LIST_BASED",
      listFilterBranch: {
        filterBranches: [
          {
            filterBranches: [],
            filters: [
              createdAfterFilter(object.createDateProperty, cutoverDate),
              entryYesFilter(object),
              crIdUnknownFilter(object.crIdProperty)
            ],
            filterBranchType: "AND",
            filterBranchOperator: "AND"
          }
        ],
        filters: [],
        filterBranchType: "OR",
        filterBranchOperator: "OR"
      },
      unEnrollObjectsNotMeetingCriteria: false,
      reEnrollmentTriggersFilterBranches: []
    },
    timeWindows: [],
    blockedDates: [],
    customProperties: {},
    crmObjectCreationStatus: "COMPLETE",
    suppressionListIds: [],
    canEnrollFromSalesforce: false
  };
}

// ---- HTTP with an allow-list (checked before anything is sent) ----
const OBJECT_TYPE_IDS = OBJECTS.map((o) => o.objectTypeId).join("|");
const READ_PATHS = [
  /^\/account-info\/v3\/details$/,
  /^\/automation\/v4\/flows$/,
  /^\/automation\/v4\/flows\/\d+$/,
  new RegExp(`^/crm/v3/properties/(${OBJECT_TYPE_IDS})/[a-z0-9_]+$`),
  /^\/crm\/v3\/lists\/\d+$/
];
const READ_ONLY_POSTS = [/^\/automation\/v4\/flows\/batch\/read$/];
const CREATE_FLOW_PATH = /^\/automation\/v4\/flows$/;

function assertAllowed(method, url, body, mode) {
  const path = url.pathname;
  if (url.origin !== API_BASE) throw new Error(`Refused ${method} ${url.origin}: not ${API_BASE}.`);
  if (method === "GET" && READ_PATHS.some((p) => p.test(path))) return;
  if (method === "POST" && READ_ONLY_POSTS.some((p) => p.test(path))) return;
  if (method === "POST" && CREATE_FLOW_PATH.test(path)) {
    if (mode !== "write") throw new Error(`Refused POST ${path}: only --write creates.`);
    if (body?.isEnabled !== false) throw new Error(`Refused POST ${path}: isEnabled must be false.`);
    return;
  }
  throw new Error(`Refused ${method} ${path}: not on the allow-list.`);
}

function loadToken() {
  let settings;
  try {
    settings = JSON.parse(readFileSync(resolve("local.settings.json"), "utf8"));
  } catch {
    throw new Error("local.settings.json could not be read as JSON (contents not shown).");
  }
  const token = settings?.Values?.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error("HUBSPOT_PRIVATE_APP_TOKEN is not in local.settings.json");
  return token;
}

function hubspotClient(token, mode) {
  let calls = 0;
  async function send(method, pathWithQuery, body) {
    const url = new URL(pathWithQuery, API_BASE);
    assertAllowed(method, url, body, mode);
    await new Promise((r) => setTimeout(r, 150));
    calls += 1;
    const res = await fetch(url, {
      method,
      redirect: "error",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${url.pathname} -> HTTP ${res.status}: ${text.slice(0, 600)}`);
    return text ? JSON.parse(text) : {};
  }
  return { send, callCount: () => calls };
}

// ---- Checks ----
async function confirmSandbox(hs) {
  const account = await hs.send("GET", "/account-info/v3/details");
  const portalId = String(account.portalId ?? "");
  if (portalId === PRODUCTION_PORTAL) throw new Error(`Portal ${portalId} is PRODUCTION. Stopped; nothing sent.`);
  if (portalId !== SANDBOX_PORTAL || account.accountType !== "SANDBOX") {
    throw new Error(`Portal ${portalId} (${account.accountType}) is not sandbox ${SANDBOX_PORTAL}. Stopped.`);
  }
  console.log(`Sandbox ${portalId} confirmed (${account.accountType}). Portal time zone: ${account.timeZone ?? "not returned"}.`);
  if (account.timeZone && account.timeZone !== CUTOVER_TIME_ZONE) {
    console.log(`  NOTE: the cutover filter uses ${CUTOVER_TIME_ZONE}; the portal shows ${account.timeZone}.`);
  }
}

async function readProperty(hs, objectTypeId, name) {
  try {
    return await hs.send("GET", `/crm/v3/properties/${objectTypeId}/${name}`);
  } catch (error) {
    if (/HTTP 404/.test(error.message)) return null;
    throw error;
  }
}

// Every property the payload names must exist with the type the filter assumes.
async function checkProperties(hs, object) {
  const problems = [];
  const expect = async (name, test, what) => {
    const property = await readProperty(hs, object.objectTypeId, name);
    if (!property) return problems.push(`${name}: missing on ${object.objectTypeId}`);
    const result = test(property);
    if (result !== true) problems.push(`${name}: ${result} (${what})`);
    else console.log(`  ok  ${name} (${property.type}/${property.fieldType})`);
  };
  await expect(object.createDateProperty, (p) => p.type === "datetime" || `type ${p.type}`, "datetime expected");
  await expect(
    object.entryProperty,
    (p) => {
      if (p.type !== "enumeration") return `type ${p.type}`;
      if (!object.entryFieldTypes.includes(p.fieldType)) return `fieldType ${p.fieldType}`;
      return (p.options ?? []).some((o) => o.value === ENTRY_YES_VALUE) || `no option with value ${ENTRY_YES_VALUE}`;
    },
    `enumeration ${object.entryFieldTypes.join("/")} with option value ${ENTRY_YES_VALUE}`
  );
  await expect(object.crIdProperty, () => true, "exists");
  for (const gate of [CREATES_GATE_PROPERTY, UPDATES_GATE_PROPERTY]) {
    await expect(gate, (p) => (p.type === "bool" && p.fieldType === "booleancheckbox") || `${p.type}/${p.fieldType}`, "single checkbox");
  }
  return problems;
}

async function listAllFlows(hs) {
  const flows = [];
  let after = null;
  do {
    const page = await hs.send("GET", `/automation/v4/flows${after ? `?after=${encodeURIComponent(after)}` : ""}`);
    if (!Array.isArray(page.results)) throw new Error("GET /automation/v4/flows returned no results list.");
    flows.push(...page.results);
    after = page.paging?.next?.after ?? null;
  } while (after);
  const unnamed = flows.filter((f) => typeof f.name !== "string").map((f) => String(f.id));
  if (unnamed.length) {
    for (let i = 0; i < unnamed.length; i += 100) {
      const inputs = unnamed.slice(i, i + 100).map((flowId) => ({ flowId, type: "FLOW_ID" }));
      const batch = await hs.send("POST", "/automation/v4/flows/batch/read", { inputs });
      for (const full of batch.results ?? []) {
        const row = flows.find((f) => String(f.id) === String(full.id));
        if (row) row.name = full.name;
      }
    }
  }
  const stillUnnamed = flows.filter((f) => typeof f.name !== "string");
  if (stillUnnamed.length) throw new Error(`${stillUnnamed.length} workflow(s) returned no name; cannot prove there is no duplicate. Stopped.`);
  return flows;
}

const keySet = (value) => Object.keys(value ?? {}).sort().join(",");

// The promote workflow of the same object sets a gate checkbox to true with the same action type.
// Its stored field shape is the portal's own answer to "how does a set-property action look".
async function compareWithPromote(hs, object, ourFlow) {
  const promote = await hs.send("GET", `/automation/v4/flows/${object.promoteFlowId}`);
  console.log(`  promote workflow ${object.promoteFlowId} "${promote.name}": isEnabled ${promote.isEnabled}, objectTypeId ${promote.objectTypeId}`);
  console.log(`    enrolment: ${summarizeEnrollment(promote.enrollmentCriteria)}`);
  await printListFilters(hs, promote.enrollmentCriteria);
  const theirs = (promote.actions ?? []).find(
    (a) => a.actionTypeId === SET_PROPERTY_ACTION_TYPE_ID && a.fields?.property_name === UPDATES_GATE_PROPERTY
  );
  if (!theirs) return `promote workflow ${object.promoteFlowId} has no set-property action on ${UPDATES_GATE_PROPERTY}`;
  console.log(`    its action fields: ${JSON.stringify(theirs.fields)}`);
  const ours = ourFlow.actions[0];
  if (keySet(theirs.fields) !== keySet(ours.fields) || keySet(theirs.fields.value) !== keySet(ours.fields.value)) {
    return `action shape differs: promote fields {${keySet(theirs.fields)}} value {${keySet(theirs.fields.value)}}; ours fields {${keySet(ours.fields)}} value {${keySet(ours.fields.value)}}`;
  }
  if (String(theirs.fields?.value?.staticValue) !== GATE_TICKED_VALUE) {
    return `promote action stores value ${JSON.stringify(theirs.fields?.value)}; ours stores staticValue "${GATE_TICKED_VALUE}"`;
  }
  console.log("    action shape matches ours.");
  return null;
}

async function printListFilters(hs, criteria) {
  const listIds = collectFilters(criteria?.listFilterBranch).filter((f) => f.filterType === "IN_LIST").map((f) => f.listId);
  for (const listId of listIds) {
    const list = await hs.send("GET", `/crm/v3/lists/${listId}?includeFilters=true`);
    const row = list.list ?? list;
    console.log(`    list ${listId} "${row.name}": ${summarizeBranch(row.filterBranch)}`);
    for (const f of collectFilters(row.filterBranch).filter((x) => /KNOWN/.test(x.operation?.operator ?? ""))) {
      console.log(`      "is known" filter on ${f.property}: operationType ${f.operation.operationType}, operator ${f.operation.operator}`);
    }
  }
}

// ---- Summaries (property names, operators and values only) ----
function collectFilters(branch) {
  if (!branch) return [];
  return [...(branch.filters ?? []), ...(branch.filterBranches ?? []).flatMap(collectFilters)];
}

function summarizeFilter(f) {
  if (f.filterType === "IN_LIST") return `IN_LIST ${f.listId} (${f.operator ?? ""})`.trim();
  const op = f.operation ?? {};
  const tp = op.timePoint;
  const what = tp
    ? `${tp.year}-${String(tp.month).padStart(2, "0")}-${String(tp.day).padStart(2, "0")} ${tp.hour}:${tp.minute} ${tp.zoneId ?? ""} ${op.endpointBehavior ?? ""}`.trim()
    : op.values !== undefined
      ? JSON.stringify(op.values)
      : op.value !== undefined
        ? JSON.stringify(op.value)
        : "";
  return `${f.property} ${op.operationType ?? op.propertyType ?? ""} ${op.operator ?? ""} ${what}`.trim();
}

function summarizeBranch(branch) {
  const filters = collectFilters(branch);
  return filters.length ? filters.map(summarizeFilter).join(" AND ") : "(no filters)";
}

function summarizeEnrollment(criteria) {
  if (!criteria) return "(none)";
  const branch = criteria.listFilterBranch ?? { filterBranches: criteria.eventFilterBranches ?? [] };
  // For an event-based workflow, name the event each branch fires on (type ID and, for a
  // property-change event, the property), so the trigger is readable from the preflight.
  const events = (criteria.eventFilterBranches ?? [])
    .map((b) => `event ${b.eventTypeId ?? "?"}${b.operator ? ` ${b.operator}` : ""}`)
    .join("; ");
  return `${criteria.type}, shouldReEnroll ${criteria.shouldReEnroll}: ${events ? `[${events}] ` : ""}${summarizeBranch(branch)}`;
}

function summarizeActions(actions) {
  return (actions ?? [])
    .map((a) => `${a.actionId}: ${a.actionTypeId} ${a.fields?.property_name ?? ""} = ${JSON.stringify(a.fields?.value ?? "")}`)
    .join("; ");
}

// ---- Modes ----
function printDryRun(args, flows) {
  console.log("DRY RUN: no credentials loaded, no network call. Payloads for POST /automation/v4/flows:");
  console.log(`Cutover: created on or after ${args.cutoverDate.text} (after ${dayBefore(args.cutoverDate).text} 23:59:59.999 ${CUTOVER_TIME_ZONE}).`);
  for (const flow of flows) {
    console.log(`\n--- ${flow.name} (objectTypeId ${flow.objectTypeId}) ---`);
    console.log(`Enrolment: ${summarizeEnrollment(flow.enrollmentCriteria)}`);
    console.log(`Action: ${summarizeActions(flow.actions)}`);
    console.log(JSON.stringify(flow, null, 2));
  }
  console.log("\nNothing was sent. Run --preflight (read-only), then --write.");
}

async function runChecks(hs, args, flows) {
  await confirmSandbox(hs);
  const problems = [];
  for (const object of args.objects) {
    console.log(`\n${object.label} (${object.objectTypeId}): properties`);
    problems.push(...(await checkProperties(hs, object)).map((p) => `${object.label}: ${p}`));
  }
  const existing = await listAllFlows(hs);
  console.log(`\nWorkflows in the sandbox: ${existing.length}.`);
  for (const flow of flows) {
    const same = existing.filter((f) => f.name === flow.name);
    if (same.length) problems.push(`"${flow.name}" already exists: id ${same.map((f) => f.id).join(", ")} (isEnabled ${same.map((f) => f.isEnabled).join(", ")})`);
    else console.log(`  ok  no workflow named "${flow.name}"`);
  }
  console.log("\nPromote workflows (same set-property action, built on the screen):");
  for (const object of args.objects) {
    const flow = flows.find((f) => f.objectTypeId === object.objectTypeId);
    const problem = await compareWithPromote(hs, object, flow);
    if (problem) problems.push(`${object.label}: ${problem}`);
  }
  return problems;
}

async function createAndReadBack(hs, flows) {
  const created = [];
  let failure = null;
  for (const flow of flows) {
    try {
      if (flow.isEnabled !== false) throw new Error(`Refused: ${flow.name} is not OFF.`);
      const response = await hs.send("POST", "/automation/v4/flows", flow);
      if (!response.id) throw new Error(`POST for "${flow.name}" returned no id. Stopped.`);
      console.log(`Created "${flow.name}": id ${response.id}`);
      created.push(String(response.id));
    } catch (error) {
      failure = error;
      const notCreated = flows.slice(created.length).map((f) => f.name);
      console.log(`\nCreated so far: ${created.join(", ") || "none"}. Not created: ${notCreated.join("; ")}. Re-run with --only <keys> after fixing.`);
      break;
    }
  }
  console.log("\nRead back:");
  let enabled = 0;
  for (const id of created) {
    const flow = await hs.send("GET", `/automation/v4/flows/${id}`);
    console.log(`- id ${flow.id} | "${flow.name}" | objectTypeId ${flow.objectTypeId} | isEnabled ${flow.isEnabled} | revision ${flow.revisionId}`);
    console.log(`  enrolment: ${summarizeEnrollment(flow.enrollmentCriteria)}`);
    console.log(`  action: ${summarizeActions(flow.actions)}`);
    console.log(`  https://app.hubspot.com/workflows/${SANDBOX_PORTAL}/platform/flow/${flow.id}/edit`);
    if (flow.isEnabled !== false) enabled += 1;
  }
  if (enabled) {
    console.log(`\nWARNING: ${enabled} workflow(s) read back as ON. Turn them OFF on the HubSpot screen now and tell the testing chat.`);
    process.exitCode = 1;
  }
  if (failure) throw failure;
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const flows = args.objects.map((object) => buildFlow(object, args.cutoverDate));
  if (args.mode === "dry-run") return printDryRun(args, flows);

  const hs = hubspotClient(loadToken(), args.mode);
  console.log(`Mode: ${args.mode}. Cutover: created on or after ${args.cutoverDate.text} (after ${dayBefore(args.cutoverDate).text} 23:59:59.999 ${CUTOVER_TIME_ZONE}).`);
  const problems = await runChecks(hs, args, flows);
  if (problems.length) {
    console.log("\nSTOPPED. Nothing created. Problems:");
    for (const p of problems) console.log(`- ${p}`);
    process.exitCode = 1;
  } else if (args.mode === "preflight") {
    console.log("\nPreflight passed. Nothing created. Re-run with --write to create the workflows (OFF).");
  } else {
    console.log("\nChecks passed. Creating (OFF):");
    await createAndReadBack(hs, flows);
  }
  console.log(`\nHubSpot calls: ${hs.callCount()}.`);
}

main().catch((error) => {
  console.error(`Stopped: ${error.message}`);
  process.exitCode = 1;
});
