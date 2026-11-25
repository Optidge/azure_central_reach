// Shared fakes for the Stage 2 tests. Nothing here calls a live service.
// - memoryContainer: an in-memory Cosmos container, passed to cosmosState.mjs with
//   useStateContainer, so getState, putState and the leases run for real.
// - hubspotRecord: one HubSpot record that remembers what the integration wrote back.
// - fakeCentralReach: CentralReach at the HTTP level, so centralReachClient.mjs runs for real.
import axios from "axios";
import { CENTRAL_REACH_SENDABLE_LABEL_IDS } from "../../constants/centralReach.mjs";
import { createCentralReachClient } from "../../lib/centralReachClient.mjs";

export const SANDBOX_PORTAL = "52311591";
export const PRODUCTION_PORTAL = "50317927";

export function httpError(status, { data = {}, headers = {} } = {}) {
  const error = new Error(`Request failed with status code ${status}`);
  error.response = { status, data, headers };
  return error;
}

export function timeoutError() {
  const error = new Error("timeout of 15000ms exceeded");
  error.code = "ECONNABORTED";
  return error;
}

function cosmosError(code) {
  const error = new Error(`Cosmos answered ${code}`);
  error.code = code;
  return error;
}

export function memoryContainer() {
  const docs = new Map();
  const log = [];
  let version = 0;
  const key = (id, pk) => `${pk}|${id}`;
  const store = (doc) => {
    version += 1;
    const saved = { ...doc, _etag: `etag-${version}` };
    docs.set(key(doc.id, doc.pk), saved);
    return { resource: saved, etag: saved._etag };
  };
  const requireMatch = (current, options) => {
    const condition = options?.accessCondition;
    if (condition?.type === "IfMatch" && condition.condition !== current._etag) {
      throw cosmosError(412);
    }
  };
  const container = {
    docs,
    log,
    // Set by a test to make a write fail: (operation, doc) => throw.
    beforeWrite: null,
    get: (pk, id) => docs.get(key(id, pk)) || null,
    all: (pk) => Array.from(docs.values()).filter((doc) => doc.pk === pk),
    items: {
      create: async (doc) => {
        container.beforeWrite?.("create", doc);
        if (docs.has(key(doc.id, doc.pk))) {
          throw cosmosError(409);
        }
        log.push({ operation: "create", doc });
        return store(doc);
      },
      upsert: async (doc) => {
        container.beforeWrite?.("upsert", doc);
        log.push({ operation: "upsert", doc });
        return store(doc);
      }
    },
    item: (id, pk) => ({
      read: async () => ({ resource: docs.get(key(id, pk)) }),
      delete: async (options) => {
        const current = docs.get(key(id, pk));
        log.push({ operation: "delete", id, pk, options });
        if (!current) {
          throw cosmosError(404);
        }
        requireMatch(current, options);
        docs.delete(key(id, pk));
        return {};
      },
      replace: async (doc, options) => {
        const current = docs.get(key(id, pk));
        log.push({ operation: "replace", doc, options });
        if (!current) {
          throw cosmosError(404);
        }
        requireMatch(current, options);
        return store(doc);
      }
    })
  };
  return container;
}

// Row 4.18: what HubSpot answers for a record read that asks for `propertyNames`: every requested
// property is a key, a blank one with a null value (checked on 2026-11-20, P.7 (b)). An answer
// that leaves a requested key out is a failed read, so a fake that stands for HubSpot fills each
// requested property the fake record does not hold with null. `answer` is { id, properties };
// anything that is not an object is returned as it is.
export function hubspotAnswer(answer, propertyNames = []) {
  if (!answer || typeof answer !== "object") {
    return answer;
  }
  const properties = { ...(answer.properties || {}) };
  for (const name of propertyNames || []) {
    if (!Object.hasOwn(properties, name)) {
      properties[name] = null;
    }
  }
  return { ...answer, properties };
}

// The same for a test's own employee reader, (recordId, objectTypeId, names): wraps it so its
// answer holds every requested property. A Case reader is (dealId, names); clientWorkflowDeps
// answers like HubSpot already.
export function answersLikeHubSpot(read) {
  return async (id, type, names) => hubspotAnswer(await read(id, type, names), names);
}

export function hubspotRecord(properties) {
  const state = { ...properties };
  const writes = [];
  return {
    properties: state,
    writes,
    read: () => ({ id: state.hs_object_id, properties: { ...state } }),
    write: (patch) => {
      writes.push({ ...patch });
      Object.assign(state, patch);
    }
  };
}

const CLIENT_READ_KEYS = [
  "gender",
  "dateOfBirth",
  "primaryEmail",
  "phoneCell",
  "addressLine1",
  "addressLine2",
  "city",
  "stateProvince",
  "zipPostalCode",
  "guardianFirstName",
  "guardianLastName"
];

// Text keys the live PUT kept when they were left out (2026-11-24), plus the fake's own ID.
const PUT_KEEPS_WHEN_LEFT_OUT = ["contactId", "type", "primaryOfficeLocation"];

const CR_ROUTES = [
  {
    method: "GET",
    pattern: /^\/contacts\/(employee|client)\/byExternalSystemId\?ExternalSystemId=(.+)$/,
    name: (match) => `GET /contacts/${match[1]}/byExternalSystemId`,
    handle: ({ match, contactsOf }) => {
      const wanted = decodeURIComponent(match[2]);
      const found = Array.from(contactsOf(match[1]).values()).find(
        (contact) => contact.externalSystemId === wanted
      );
      if (!found) {
        throw httpError(404);
      }
      return { contact: { ...found } };
    }
  },
  {
    method: "PUT",
    pattern: /^\/contacts\/client\/byExternalSystemId$/,
    name: () => "PUT /contacts/client/byExternalSystemId",
    handle: ({ body, contactsOf }) => {
      const found = Array.from(contactsOf("client").values()).find(
        (contact) => contact.externalSystemId === String(body?.ExternalSystemId ?? "")
      );
      if (!found) {
        throw httpError(404);
      }
      return { contactId: found.contactId };
    }
  },
  {
    method: "POST",
    pattern: /^\/contacts\/(employee|client)$/,
    name: (match) => `POST /contacts/${match[1]}`,
    handle: ({ match, body, contactsOf, nextId }) => {
      const contact = {
        contactId: nextId(),
        externalSystemId: String(body?.externalSystemId ?? body?.ExternalSystemId ?? ""),
        primaryEmail: body?.primaryEmail ?? body?.PrimaryEmail ?? null,
        // An employee create stores its date of birth, and the employee read returns it (item 1).
        ...(body?.dateOfBirth ? { dateOfBirth: body.dateOfBirth } : {})
      };
      contactsOf(match[1]).set(contact.contactId, contact);
      return { contact: { contactId: contact.contactId } };
    }
  },
  {
    method: "GET",
    pattern: /^\/contacts\/employee\/(\w+)$/,
    name: () => "GET /contacts/employee/{id}",
    handle: ({ match, contactsOf }) => {
      const found = contactsOf("employee").get(match[1]);
      if (!found) {
        throw httpError(404);
      }
      return { contact: { ...found } };
    }
  },
  {
    // Item B21: the client read before an update, in the shape recorded on 2026-11-24 (two
    // production clients): under `contact`, a numeric contactId, all 11 core keys camelCase, a
    // blank one as "" (never null), externalSystemId only when held. A test seeds stored values
    // with cr.clients.set(id, { ... }); a client not seeded holds every core field blank.
    method: "GET",
    pattern: /^\/contacts\/client\/(\d+)$/,
    name: () => "GET /contacts/client/{id}",
    // BR16 (live read 2026-11-24): the read also returns the keys the integration does not map
    // (firstName, chosenName, isActive, type, lists ...): any other key a test stores is returned
    // as stored.
    handle: ({ match, contactsOf }) => {
      const stored = contactsOf("client").get(match[1]) || {};
      const contact = { contactId: Number(match[1]) };
      for (const [key, value] of Object.entries(stored)) {
        if (!["contactId", "externalSystemId", ...CLIENT_READ_KEYS].includes(key)) {
          contact[key] = value;
        }
      }
      for (const key of CLIENT_READ_KEYS) {
        contact[key] = stored[key] ?? "";
      }
      if (String(stored.externalSystemId ?? "") !== "") {
        contact.externalSystemId = stored.externalSystemId;
      }
      return { contact };
    }
  },
  {
    // BR16 (live check 2026-11-24, test employee 5338681 and test client 5384589): the PUT
    // replaces the whole record. A text key the body leaves out is blanked (employee jobTitle
    // and chosenName, client chosenName); `type`, `primaryOfficeLocation` and keys that are not
    // text (isActive, lists) were kept. A client body key is PascalCase. The values sent are not
    // stored, so a test can still tell a value sent back from the read apart from one the worker
    // made.
    method: "PUT",
    pattern: /^\/contacts\/(employee|client)\/(\w+)$/,
    name: (match) => `PUT /contacts/${match[1]}/{id}`,
    handle: ({ match, body, contactsOf }) => {
      const stored = contactsOf(match[1]).get(match[2]);
      const sent = new Set(
        Object.keys(body || {}).map((key) => key.charAt(0).toLowerCase() + key.slice(1))
      );
      for (const [key, value] of Object.entries(stored || {})) {
        if (typeof value === "string" && !sent.has(key) && !PUT_KEEPS_WHEN_LEFT_OUT.includes(key)) {
          stored[key] = "";
        }
      }
      return {};
    }
  },
  {
    // The live label catalog (row L.1). `cr.catalog` is a list of label IDs. When a test does not
    // set it, the catalog holds every sendable label and every label a fake contact holds.
    method: "GET",
    pattern: /^\/contacts\/labels$/,
    name: () => "GET /contacts/labels",
    handle: ({ labels, catalog }) => {
      const ids = catalog ?? [
        ...new Set([...CENTRAL_REACH_SENDABLE_LABEL_IDS, ...Array.from(labels.values()).flat()])
      ];
      return { labels: ids.map((labelId) => ({ labelId, name: `Label ${labelId}`, parentLabelId: null })) };
    }
  },
  {
    method: "GET",
    pattern: /^\/contacts\/(\w+)\/labels$/,
    name: () => "GET /contacts/{id}/labels",
    handle: ({ match, labels }) => ({
      labels: (labels.get(match[1]) || []).map((labelId) => ({ labelId }))
    })
  },
  {
    method: "POST",
    pattern: /^\/contacts\/(\w+)\/labels$/,
    name: () => "POST /contacts/{id}/labels",
    handle: ({ match, body, labels }) => {
      labels.set(match[1], (body?.labels || []).map((item) => item.labelId));
      return {};
    }
  },
  {
    method: "PUT",
    pattern: /^\/contacts\/(\w+)\/metadata\/(\d+)$/,
    name: () => "PUT /contacts/{id}/metadata/{fieldId}",
    handle: () => ({})
  },
  {
    method: "DELETE",
    pattern: /^\/contacts\/(\w+)\/metadata\/(\d+)$/,
    name: () => "DELETE /contacts/{id}/metadata/{fieldId}",
    handle: () => ({})
  }
];

function parseBody(data) {
  if (typeof data !== "string") {
    return data;
  }
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

export function fakeCentralReach() {
  const calls = [];
  const contacts = { employee: new Map(), client: new Map() };
  const labels = new Map();
  const failures = [];
  const answers = [];
  const holds = [];
  let counter = 9000;
  const cr = {
    calls,
    employees: contacts.employee,
    clients: contacts.client,
    labels,
    // The label catalog as a list of IDs, or null for the default (see the catalog route).
    catalog: null,
    // Called with the route name before each request is handled.
    onRequest: null,
    // The next `times` calls to this route fail. With `afterHandling` the request is applied
    // first, as when CentralReach did the work but the answer never arrived.
    fail: (name, error, { times = 1, afterHandling = false } = {}) => {
      failures.push({ name, error, times, afterHandling });
    },
    // The next call to this route answers 200 with this body instead of the usual one.
    answer: (name, body) => {
      answers.push({ name, body });
    },
    // The next call to this route waits for the promise before it is handled.
    holdNext: (name, promise) => {
      holds.push({ name, promise });
    },
    count: (name) => calls.filter((call) => call.name === name).length,
    writes: () => calls.filter((call) => call.method !== "GET")
  };

  const adapter = async (requestConfig) => {
    const method = String(requestConfig.method || "get").toUpperCase();
    const url = String(requestConfig.url || "");
    const respond = (data) => ({ data, status: 200, headers: {}, config: requestConfig });
    if (url.includes("token.test")) {
      return respond({ access_token: "t", expires_in: 3600 });
    }
    const route = CR_ROUTES.find((item) => item.method === method && item.pattern.test(url));
    if (!route) {
      throw httpError(599);
    }
    const match = url.match(route.pattern);
    const name = route.name(match);
    const body = parseBody(requestConfig.data);
    calls.push({ method, url, name, body });
    cr.onRequest?.(name, {
      method,
      url,
      body,
      headers: requestConfig.headers,
      params: requestConfig.params
    });
    const holdIndex = holds.findIndex((item) => item.name === name);
    if (holdIndex >= 0) {
      await holds.splice(holdIndex, 1)[0].promise;
    }

    const failure = failures.find((item) => item.name === name && item.times > 0);
    if (failure && !failure.afterHandling) {
      failure.times -= 1;
      throw failure.error;
    }
    const data = route.handle({
      match,
      body,
      labels,
      catalog: cr.catalog,
      contactsOf: (kind) => contacts[kind],
      nextId: () => {
        counter += 1;
        return String(counter);
      }
    });
    if (failure) {
      failure.times -= 1;
      throw failure.error;
    }
    const answerIndex = answers.findIndex((item) => item.name === name);
    if (answerIndex >= 0) {
      return respond(answers.splice(answerIndex, 1)[0].body);
    }
    return respond(data);
  };

  axios.defaults.adapter = adapter;
  const client = createCentralReachClient({
    centralReach: {
      baseUrl: "https://cr.test",
      apiKey: "k",
      clientId: "c",
      clientSecret: "s",
      tokenUrl: "https://token.test/connect/token"
    }
  });
  client.defaults.adapter = adapter;
  return cr;
}

export function workflowConfig({ portalId = SANDBOX_PORTAL, features, sync = {} } = {}) {
  const sandbox = portalId === SANDBOX_PORTAL;
  return {
    hubspot: {
      hubspotPortalId: portalId,
      btRbtObjectTypeId: sandbox ? "2-72890325" : "2-48354559",
      bcbaObjectTypeId: sandbox ? "2-72890322" : "2-48354212",
      employeeIdProperty: "employee_id",
      crContactIdProperty: "client_id_number"
    },
    features: features || { allowEmployeeCreate: true, putOnlyMode: false },
    ttl: { successTtlSeconds: 86400, failTtlSeconds: 3600, leaseTtlSeconds: 660 },
    sync,
    centralReach: {}
  };
}

// Only HubSpot is faked. The mapper, the validator, the hash, cosmosState.mjs (through the
// in-memory container) and centralReachClient.mjs (through the fake HTTP adapter) are real.
export function employeeWorkflowDeps({ record, logs = [], config = workflowConfig(), holders = [] }) {
  return {
    getConfig: () => config,
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    getBtRbtRecordById: async (id, type, names) => hubspotAnswer(record.read(), names),
    getBcbaRecordById: async (id, type, names) => hubspotAnswer(record.read(), names),
    // Row 6.4 (lane E): the BCBA's Contact. By default no Contact is linked.
    listAssociations: async () => [],
    findHubSpotRecordsByEmployeeId: async () => holders,
    writeEmployeeWriteback: async ({ properties }) => {
      record.write(properties);
      return { fallbackUsed: false, removedProperties: [] };
    },
    safeLog: (level, message, meta) => {
      logs.push({ level, message, meta });
    },
    buildErrorLog: ({ stage, error }) => ({ stage, code: error?.code })
  };
}

export function clientWorkflowDeps({
  record,
  logs = [],
  config = workflowConfig(),
  associations = async () => []
}) {
  return {
    getConfig: () => config,
    createHubSpotClient: () => {},
    createCentralReachClient: () => {},
    createStateClient: () => {},
    getDealById: async (dealId, requested) => hubspotAnswer(record.read(), requested),
    listAssociations: associations,
    updateDealProperties: async (dealId, properties) => {
      record.write(properties);
    },
    safeLog: (level, message, meta) => {
      logs.push({ level, message, meta });
    },
    buildErrorLog: ({ stage, error }) => ({ stage, code: error?.code })
  };
}

export function btRecord(properties = {}) {
  return hubspotRecord({
    hs_object_id: "HS1",
    entered_in_centralreach: "Yes",
    employee_id: "",
    first_name: "Alex",
    last_name: "Rivera",
    email: "alex@example.com",
    date_of_birth: "1990-10-20",
    workday_id: "1000001",
    street_address__work_: "1 Main St",
    ...properties
  });
}

export function caseRecord(properties = {}) {
  return hubspotRecord({
    hs_object_id: "deal-1",
    enter_in_central_reach: "Yes",
    client_id_number: "",
    phi_first_name__cloned_: "Alex",
    phi_last_name: "Rivera",
    phi_date_of_birth: "2017-01-14",
    dealstage: "1",
    allergies: "Peanuts",
    ...properties
  });
}

export function queueContext({ messageId = "msg-1", deliveryCount = 1 } = {}) {
  return {
    functionName: "queue",
    invocationId: "inv-1",
    triggerMetadata: { messageId, deliveryCount }
  };
}
