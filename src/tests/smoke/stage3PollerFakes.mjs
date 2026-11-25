// Fakes for the Stage 3 poller tests (lane A). Nothing here calls a live service.
// - fakeHubSpotSearch: HubSpot's CRM search at the HTTP level, so hubspotClient.mjs runs for real
//   and a test sees the exact search body the poller sent. It evaluates the filters, sorts and
//   pages the way HubSpot's search does, and rejects what HubSpot rejects (an operator it does
//   not know, more than 200 a page, paging past 10,000 results, too many filters).
// - fakeQueues: the two Service Bus senders, so serviceBusClient.mjs builds the real messages.
// - The Cosmos container is the shared in-memory one, so cosmosState.mjs runs for real.
import { createHubSpotClient } from "../../lib/hubspotClient.mjs";
import { answeringPortalCheck, portalCheckedHubSpotConfig } from "./hubspotPortalCheckFake.mjs";
import { useStateContainer } from "../../lib/cosmosState.mjs";
import { useServiceBusSenders } from "../../lib/serviceBusClient.mjs";
import { runIntakePollerWorkflow } from "../../workflows/intakePollerWorkflow.mjs";
import { SANDBOX_PORTAL, httpError, memoryContainer } from "./stage2Fakes.mjs";

export const CASE_TYPE = "deals";
export const SANDBOX_BT_TYPE = "2-72890325";
export const SANDBOX_BCBA_TYPE = "2-72890322";
export const GATE = "sandbox_test_field";
// The four Case stages that never sync (guide [GBR] Requirement 2).
export const EXCLUDED_STAGES = ["1383894301", "1383894303", "1383894302", "1332962645"];

const HUBSPOT_MAX_PAGE = 200;
const HUBSPOT_MAX_RESULTS = 10000;
// HubSpot's CRM search limits: at most five filter groups, six filters in a group and 18 filters
// in all; more is a VALIDATION_ERROR (developers.hubspot.com, CRM Search API, "Limits").
const HUBSPOT_MAX_GROUPS = 5;
const HUBSPOT_MAX_FILTERS_PER_GROUP = 6;
const HUBSPOT_MAX_FILTERS = 18;

function tooManyFilters(groups) {
  const counts = groups.map((group) => (group.filters || []).length);
  return (
    groups.length > HUBSPOT_MAX_GROUPS ||
    counts.some((count) => count > HUBSPOT_MAX_FILTERS_PER_GROUP) ||
    counts.reduce((sum, count) => sum + count, 0) > HUBSPOT_MAX_FILTERS
  );
}

const timeOf = (value) => (/^\d+$/.test(String(value)) ? Number(value) : Date.parse(value));
// A record ID is compared as a number, a date property as a time.
const comparable = (propertyName, value) =>
  propertyName === "hs_object_id" ? Number(value) : timeOf(value);

function matches(properties, filter) {
  const value = properties[filter.propertyName];
  const filled = value !== undefined && value !== null && String(value) !== "";
  switch (filter.operator) {
    case "HAS_PROPERTY":
      return filled;
    case "EQ":
      return filled && String(value) === String(filter.value);
    case "CONTAINS_TOKEN":
      return filled && String(value).split(";").includes(String(filter.value));
    case "NOT_IN":
      return !filter.values.map(String).includes(String(value ?? ""));
    case "GTE":
      return filled && comparable(filter.propertyName, value) >= comparable(filter.propertyName, filter.value);
    case "LTE":
      return filled && comparable(filter.propertyName, value) <= comparable(filter.propertyName, filter.value);
    case "GT":
      return filled && comparable(filter.propertyName, value) > comparable(filter.propertyName, filter.value);
    default:
      throw httpError(400, { data: { message: `Unknown operator ${filter.operator}` } });
  }
}

function compare(sort) {
  const read = (record) => comparable(sort.propertyName, record.properties[sort.propertyName]);
  const direction = sort.direction === "DESCENDING" ? -1 : 1;
  return (left, right) => (read(left) - read(right)) * direction;
}

export function fakeHubSpotSearch() {
  const records = new Map();
  const requests = [];
  const failures = [];
  const answers = [];
  const hubspot = {
    // Every search request, in order: { objectTypeId, body }.
    requests,
    // Set by a test to change records between two searches: (objectTypeId, requestNumber) => void.
    beforeSearch: null,
    add(objectTypeId, id, properties = {}) {
      const list = records.get(objectTypeId) || [];
      list.push({ id: String(id), properties: { hs_object_id: String(id), ...properties } });
      records.set(objectTypeId, list);
    },
    set(objectTypeId, id, properties) {
      const record = (records.get(objectTypeId) || []).find((item) => item.id === String(id));
      Object.assign(record.properties, properties);
    },
    fail(objectTypeId, error, times = Infinity) {
      failures.push({ objectTypeId, error, times });
    },
    // The answer body HubSpot gives to the Nth search of one object type, instead of a real page.
    answerAt(objectTypeId, requestNumber, data) {
      answers.push({ objectTypeId, requestNumber, data });
    },
    requestsFor: (objectTypeId) => requests.filter((item) => item.objectTypeId === objectTypeId)
  };

  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  client.defaults.adapter = answeringPortalCheck(async (requestConfig) => {
    const match = /^\/crm\/v3\/objects\/([^/]+)\/search$/.exec(String(requestConfig.url || ""));
    if (String(requestConfig.method).toLowerCase() !== "post" || !match) {
      throw new Error(`A poller test made an unexpected HubSpot call: ${requestConfig.url}`);
    }
    const objectTypeId = match[1];
    const body = JSON.parse(requestConfig.data);
    requests.push({ objectTypeId, body });
    hubspot.beforeSearch?.(objectTypeId, hubspot.requestsFor(objectTypeId).length);

    const failure = failures.find((item) => item.objectTypeId === objectTypeId && item.times > 0);
    if (failure) {
      failure.times -= 1;
      throw failure.error;
    }

    const canned = answers.find(
      (item) =>
        item.objectTypeId === objectTypeId &&
        item.requestNumber === hubspot.requestsFor(objectTypeId).length
    );
    if (canned) {
      return { status: 200, headers: {}, config: requestConfig, data: canned.data };
    }

    const limit = Number(body.limit);
    const offset = Number(body.after || 0);
    if (!(limit >= 1 && limit <= HUBSPOT_MAX_PAGE) || offset + limit > HUBSPOT_MAX_RESULTS) {
      throw httpError(400, { data: { message: "Search paging is outside HubSpot's limits" } });
    }
    const groups = body.filterGroups || [];
    if (tooManyFilters(groups)) {
      throw httpError(400, { data: { category: "VALIDATION_ERROR", message: "Too many filters" } });
    }
    const found = (records.get(objectTypeId) || []).filter(
      (record) =>
        groups.length === 0 ||
        groups.some((group) => group.filters.every((filter) => matches(record.properties, filter)))
    );
    if (body.sorts?.[0]) {
      found.sort(compare(body.sorts[0]));
    }
    const results = found.slice(offset, offset + limit).map((record) => ({
      id: record.id,
      properties: Object.fromEntries(
        (body.properties || []).map((name) => [name, record.properties[name] ?? null])
      )
    }));
    const more = offset + limit < found.length;
    return {
      status: 200,
      headers: {},
      config: requestConfig,
      data: {
        total: found.length,
        results,
        ...(more ? { paging: { next: { after: String(offset + limit) } } } : {})
      }
    };
  });
  return hubspot;
}

export function fakeQueues() {
  const queues = {
    client: [],
    employee: [],
    // Set by a test to make a send fail: (queueName, message) => throw.
    beforeSend: null,
    all: () => [...queues.client, ...queues.employee],
    clear: () => {
      queues.client.length = 0;
      queues.employee.length = 0;
    }
  };
  const sender = (name) => ({
    sendMessages: async (message) => {
      queues.beforeSend?.(name, message);
      queues[name].push(message);
    }
  });
  useServiceBusSenders({
    clientSyncSender: sender("client"),
    employeeSyncSender: sender("employee")
  });
  return queues;
}

// The shape getIntakePollerConfig returns, for the sandbox unless a test says otherwise.
export function pollerConfig({
  portalId = SANDBOX_PORTAL,
  btRbtObjectTypeId = SANDBOX_BT_TYPE,
  bcbaObjectTypeId = SANDBOX_BCBA_TYPE,
  recordGateProperty = GATE
} = {}) {
  return {
    hubspot: {
      baseUrl: "https://hubspot.invalid",
      privateAppToken: "test",
      hubspotPortalId: portalId,
      btRbtObjectTypeId,
      bcbaObjectTypeId,
      crContactIdProperty: "client_id_number",
      employeeIdProperty: "employee_id"
    },
    sync: { recordGateProperty },
    ttl: { leaseTtlSeconds: 660 }
  };
}

// Only the clock, the configuration and the three client factories are passed in. HubSpot is
// faked at the HTTP level, Cosmos by the in-memory container and Service Bus at the sender, so
// everything between the search answer and the queue message is the real code.
export function setupPoller({ config = pollerConfig(), now = "2026-11-20T10:00:00.000Z" } = {}) {
  const container = memoryContainer();
  useStateContainer(container);
  const hubspot = fakeHubSpotSearch();
  const queues = fakeQueues();
  const logs = [];
  const clock = { ms: Date.parse(now) };
  const dependencies = {
    getConfig: () => config,
    createHubSpotClient: () => {},
    createStateClient: () => {},
    createServiceBusClient: () => {},
    now: () => clock.ms,
    safeLog: (level, message, meta) => {
      logs.push({ level, message, meta });
    }
  };
  return {
    container,
    hubspot,
    queues,
    logs,
    dependencies,
    setNow: (iso) => {
      clock.ms = Date.parse(iso);
    },
    minutesAgo: (minutes) => new Date(clock.ms - minutes * 60000).toISOString(),
    run: () => runIntakePollerWorkflow({}, dependencies),
    checkpoint: (entity, portalId = config.hubspot.hubspotPortalId) =>
      container.get("poller:checkpoint", `${portalId}:${entity}`)
  };
}

export const bodies = (messages) => messages.map((message) => message.body);
export const dealIds = (messages) => messages.map((message) => message.body.dealId);
export const recordIds = (messages) => messages.map((message) => message.body.recordId);

export function filtersOf(request, propertyName) {
  return request.body.filterGroups.map((group) =>
    group.filters.find((filter) => filter.propertyName === propertyName)
  );
}
