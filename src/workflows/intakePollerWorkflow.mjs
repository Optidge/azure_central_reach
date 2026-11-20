// The hourly poller and the daily sweep. Both are safety checks behind the webhooks: they find
// records and queue their IDs; the workers decide what, if anything, is written.
//
// - Hourly poll, per object (Case, BT/RBT, BCBA): records that are linked, or whose Entered in
//   CentralReach is Yes, changed at or after that object's saved checkpoint, oldest first. The
//   checkpoint moves forward only after a whole page was queued.
// - Daily sweep, in the first run at or after 08:00 UTC: every linked record, and every unlinked
//   record whose status is waiting. It catches values that change with no edit.
// - With a record gate set, every search is limited to records where the gate property is true.
//   The Case searches leave out the four excluded stages. The worker checks each record again.
import { getIntakePollerConfig } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import { createHubSpotClient, searchObjectPage } from "../lib/hubspotClient.mjs";
import { HubSpotReadError } from "../lib/mappedState.mjs";
import {
  createStateClient,
  acquireLease,
  releaseLease,
  putState,
  getState
} from "../lib/cosmosState.mjs";
import {
  createServiceBusClient,
  sendClientSyncMessage,
  sendEmployeeSyncMessage
} from "../lib/serviceBusClient.mjs";
import {
  CASE_ENTRY_PROPERTY,
  CASE_EXCLUDED_STAGE_IDS,
  EMPLOYEE_ENTRY_PROPERTY,
  ENTRY_YES_VALUE,
  HUBSPOT_EMPLOYEE_TYPES
} from "../constants/hubspot.mjs";

// Cosmos keys. Every item ID starts with the portal ID.
const POLLER_LEASE_PK = "workflow:intake-poller";
const CHECKPOINT_PK = "poller:checkpoint";
const SWEEP_PK = "poller:sweep";
const NEVER_EXPIRES = -1;

// Hourly poll. HubSpot's search gives at most 200 records a page.
export const POLL_PAGE_SIZE = 100;
export const POLL_MAX_PAGES = 10;
const FIRST_RUN_LOOKBACK_MS = 60 * 60 * 1000;
// A change can take a few moments to show in HubSpot's search, so the checkpoint never comes
// closer to now than this.
const CHECKPOINT_GUARD_MS = 5 * 60 * 1000;

// Daily sweep. At 60 a minute, 3,000 messages are delivered before the next run of the hourly
// schedule. On a shorter schedule (INTAKE_POLLER_SCHEDULE) a sweep larger than the cap overlaps
// its own next run.
const SWEEP_START_HOUR_UTC = 8;
const SWEEP_PAGE_SIZE = 100;
export const SWEEP_MESSAGES_PER_MINUTE = 60;
export const SWEEP_MAX_MESSAGES_PER_RUN = 3000;

const STATUS_PROPERTY = "last_sync_status";
const WAITING_STATUS = "waiting";

// Every message the poller sends says which portal it is for. The poller sends only through
// these two senders.
export function portalSenders(
  portalId,
  { sendClient = sendClientSyncMessage, sendEmployee = sendEmployeeSyncMessage } = {}
) {
  return {
    sendClient: (message) => sendClient({ ...message, portalId }),
    sendEmployee: (message) => sendEmployee({ ...message, portalId })
  };
}

// The three synced objects. `entryFilter` is only the search filter that finds records asking
// for a create; the create signal itself is decided in src/lib/syncEligibility.mjs. The Case
// property is a multi-checkbox, so its filter is "contains the token Yes" (BUILD-PLAN P.7 a).
function pollerEntities(config, { sendClient, sendEmployee }) {
  const employee = (employeeType, objectTypeId) => ({
    key: employeeType,
    objectTypeId,
    idProperty: config.hubspot.employeeIdProperty,
    stageFilters: [],
    entryFilter: { propertyName: EMPLOYEE_ENTRY_PROPERTY, operator: "EQ", value: ENTRY_YES_VALUE },
    pollSource: "employeePoller",
    send: (recordId, message) =>
      sendEmployee({ workflow: "employeeSync", employeeType, recordId, ...message })
  });
  return [
    {
      key: "client",
      objectTypeId: "deals",
      idProperty: config.hubspot.crContactIdProperty,
      stageFilters: [
        { propertyName: "dealstage", operator: "NOT_IN", values: CASE_EXCLUDED_STAGE_IDS }
      ],
      entryFilter: {
        propertyName: CASE_ENTRY_PROPERTY,
        operator: "CONTAINS_TOKEN",
        value: ENTRY_YES_VALUE
      },
      pollSource: "intakePoller",
      send: (recordId, message) => sendClient({ workflow: "clientSync", dealId: recordId, ...message })
    },
    employee(HUBSPOT_EMPLOYEE_TYPES.BT_RBT, config.hubspot.btRbtObjectTypeId),
    employee(HUBSPOT_EMPLOYEE_TYPES.BCBA, config.hubspot.bcbaObjectTypeId)
  ];
}

// HubSpot ORs the filter groups and ANDs the filters inside one. So each branch becomes a group,
// and every group carries the record gate, the Case stage exclusion and the shared filters.
function buildFilterGroups({ entity, gateProperty, branches, shared }) {
  const always = [
    ...(gateProperty ? [{ propertyName: gateProperty, operator: "EQ", value: "true" }] : []),
    ...entity.stageFilters,
    ...shared
  ];
  return branches.map((branch) => ({ filters: [...always, branch] }));
}

const linkedFilter = (entity) => ({ propertyName: entity.idProperty, operator: "HAS_PROPERTY" });

// An answer the poller cannot use is a failed read (rule 5.8): the object stops, its place is
// kept, and the next run tries again. It is never read as "nothing there".
function recordIdOf(record) {
  const id = String(record?.id ?? "").trim();
  if (!id) {
    throw new HubSpotReadError("search:record-id");
  }
  return id;
}

function modifiedMsOf(record) {
  const modifiedMs = Date.parse(record?.properties?.hs_lastmodifieddate || "");
  if (!Number.isFinite(modifiedMs)) {
    throw new HubSpotReadError("search:hs_lastmodifieddate");
  }
  return modifiedMs;
}

// HubSpot says there is more, but gave no record to go on from.
function requireRecords(page) {
  if (page.results.length === 0 && page.nextAfter) {
    throw new HubSpotReadError("search:empty-page");
  }
}

// The last record ID of a page that is paged by record ID. It must lie after the ID the page was
// asked to start after, or the next search would be the same one again.
function lastIdAfter(page, afterId) {
  const lastId = recordIdOf(page.results.at(-1));
  if (afterId && !(Number(lastId) > Number(afterId))) {
    throw new HubSpotReadError("search:record-order");
  }
  return lastId;
}

// Queues one object's changed records. A failed search or a failed send throws: the checkpoint
// then stays at the last page that was queued in full.
async function pollEntity({
  entity,
  portalId,
  gateProperty,
  nowMs,
  searchPage,
  readState,
  saveState,
  onQueued
}) {
  const key = { pk: CHECKPOINT_PK, id: `${portalId}:${entity.key}` };
  const saveCheckpoint = (checkpointMs) =>
    saveState({
      ...key,
      type: "poller-checkpoint",
      ttlSeconds: NEVER_EXPIRES,
      data: { checkpoint: new Date(checkpointMs).toISOString() }
    });

  let checkpointMs = Date.parse((await readState(key))?.data?.checkpoint ?? "");
  if (!Number.isFinite(checkpointMs)) {
    // First run: start one hour back, and save that start, so the place is kept even when
    // this run finds nothing or fails.
    checkpointMs = nowMs - FIRST_RUN_LOOKBACK_MS;
    await saveCheckpoint(checkpointMs);
  }

  const moveCheckpoint = async (toMs) => {
    if (toMs > checkpointMs) {
      checkpointMs = toMs;
      await saveCheckpoint(checkpointMs);
    }
  };

  const timestampFilter = (operator, ms) => ({
    propertyName: "hs_lastmodifieddate",
    operator,
    value: new Date(ms).toISOString()
  });
  const search = (shared, sortProperty) =>
    searchPage({
      objectTypeId: entity.objectTypeId,
      filterGroups: buildFilterGroups({
        entity,
        gateProperty,
        branches: [linkedFilter(entity), entity.entryFilter],
        shared
      }),
      sorts: [{ propertyName: sortProperty, direction: "ASCENDING" }],
      properties: ["hs_object_id", "hs_lastmodifieddate"],
      limit: POLL_PAGE_SIZE
    });
  const enqueuedAt = new Date(nowMs).toISOString();
  const queuePage = async (page) => {
    for (const record of page.results) {
      await entity.send(recordIdOf(record), {
        source: entity.pollSource,
        hsLastModifiedDate: record.properties.hs_lastmodifieddate,
        enqueuedAt
      });
      onQueued();
    }
  };

  // Every record that changed in exactly this millisecond, paged by record ID. A record that is
  // written to meanwhile leaves the block and is found later under its new timestamp; the
  // records behind it keep their place. Returns the number of pages read.
  const queueBlock = async (blockMs) => {
    let afterId = null;
    for (let blockPages = 1; ; blockPages += 1) {
      const page = await search(
        [
          timestampFilter("GTE", blockMs),
          timestampFilter("LTE", blockMs),
          ...(afterId ? [{ propertyName: "hs_object_id", operator: "GT", value: afterId }] : [])
        ],
        "hs_object_id"
      );
      requireRecords(page);
      page.results.forEach(modifiedMsOf);
      const lastId = page.results.length > 0 ? lastIdAfter(page, afterId) : afterId;
      await queuePage(page);
      if (!page.nextAfter) {
        return blockPages;
      }
      afterId = lastId;
    }
  };

  // How the next page is asked for. HubSpot's paging cursor is a position in the sorted list,
  // and the list is not frozen between two requests: a record that is written to while the
  // poller pages moves to the end, every record behind it moves one place up, and the cursor
  // would step over one of them. So the cursor is never used. The next page is a new search
  // "at or after" the last timestamp that was queued (the records that share that timestamp are
  // queued a second time, which is harmless). A page that holds one timestamp only cannot move
  // on that way, so that block is paged by record ID, and the search goes on after it.
  let sinceMs = checkpointMs;
  let pages = 0;
  let capMs = null;
  for (;;) {
    const page = await search([timestampFilter("GTE", sinceMs)], "hs_lastmodifieddate");
    pages += 1;
    requireRecords(page);
    const modified = page.results.map(modifiedMsOf);
    // Oldest first, and nothing older than the search asked for. Anything else would send the
    // next search backwards.
    if (modified.length > 0 && (modified[0] < sinceMs || modified.at(-1) < modified[0])) {
      throw new HubSpotReadError("search:record-order");
    }
    await queuePage(page);

    const guardMs = nowMs - CHECKPOINT_GUARD_MS;
    if (!page.nextAfter) {
      // The search is at its end: everything HubSpot shows was queued. The checkpoint moves to
      // five minutes ago, so the newest record is not queued again at every run.
      await moveCheckpoint(guardMs);
      break;
    }

    // The page is queued. The checkpoint moves to the earlier of its last timestamp and five
    // minutes ago, and never backwards.
    const firstMs = modified[0];
    const lastMs = modified.at(-1);
    await moveCheckpoint(Math.min(lastMs, guardMs));

    if (firstMs === lastMs) {
      pages += await queueBlock(lastMs);
      sinceMs = lastMs + 1;
      await moveCheckpoint(Math.min(sinceMs, guardMs));
    } else {
      sinceMs = lastMs;
    }

    if (pages >= POLL_MAX_PAGES) {
      // The page cap. If it fell inside a block of records with one timestamp, keep paging
      // until the timestamp changes; the rest waits for the next run.
      capMs ??= lastMs;
      if (lastMs > capMs) {
        break;
      }
    }
  }
}

// The sweep of one day: its UTC date, whether every object is finished, and per object the last
// record ID of the last page that was queued in full. One item per portal, never expiring.
async function loadSweep({ portalId, day, readState }) {
  const saved = (await readState({ pk: SWEEP_PK, id: `${portalId}:daily` }))?.data;
  return saved?.day === day ? saved : { day, done: false, entities: {} };
}

// Queues every linked record, and every unlinked record whose status is waiting, once a day.
// A run that stops early (a failure, or the cap per run) leaves the sweep unfinished, and the
// next hourly run goes on after the last page that was queued in full.
async function runDailySweep({
  entities,
  portalId,
  gateProperty,
  nowMs,
  searchPage,
  readState,
  saveState,
  onEntityError
}) {
  const result = { ran: false, done: false, queued: 0 };
  const now = new Date(nowMs);
  if (now.getUTCHours() < SWEEP_START_HOUR_UTC) {
    return result;
  }
  const sweep = await loadSweep({ portalId, day: now.toISOString().slice(0, 10), readState });
  result.done = sweep.done;
  if (sweep.done) {
    return result;
  }
  result.ran = true;

  const isFinished = (entity) => sweep.entities[entity.key]?.finished === true;
  // `done` is the marker of the day. It is true only once every object was queued to its end.
  const saveSweep = () => {
    sweep.done = entities.every(isFinished);
    return saveState({
      pk: SWEEP_PK,
      id: `${portalId}:daily`,
      type: "poller-sweep",
      ttlSeconds: NEVER_EXPIRES,
      data: sweep
    });
  };
  const enqueuedAt = now.toISOString();

  for (const entity of entities) {
    const progress = (sweep.entities[entity.key] ??= { afterId: null, finished: false });
    try {
      while (!progress.finished && result.queued < SWEEP_MAX_MESSAGES_PER_RUN) {
        // Paged by record ID, not by HubSpot's cursor, so the place survives until the next hour.
        // With the gate off, linked records only.
        const page = await searchPage({
          objectTypeId: entity.objectTypeId,
          filterGroups: buildFilterGroups({
            entity,
            gateProperty,
            branches: [
              linkedFilter(entity),
              ...(gateProperty
                ? [{ propertyName: STATUS_PROPERTY, operator: "EQ", value: WAITING_STATUS }]
                : [])
            ],
            shared: progress.afterId
              ? [{ propertyName: "hs_object_id", operator: "GT", value: progress.afterId }]
              : []
          }),
          sorts: [{ propertyName: "hs_object_id", direction: "ASCENDING" }],
          properties: ["hs_object_id"],
          limit: Math.min(SWEEP_PAGE_SIZE, SWEEP_MAX_MESSAGES_PER_RUN - result.queued)
        });

        requireRecords(page);
        const lastId =
          page.results.length > 0 ? lastIdAfter(page, progress.afterId) : progress.afterId;

        for (const record of page.results) {
          // Spread with scheduled delivery: the first 60 go out now, the next 60 a minute later.
          const delayMinutes = Math.floor(result.queued / SWEEP_MESSAGES_PER_MINUTE);
          await entity.send(recordIdOf(record), {
            source: "dailySweep",
            enqueuedAt,
            ...(delayMinutes > 0
              ? { scheduledEnqueueTimeUtc: new Date(nowMs + delayMinutes * 60 * 1000) }
              : {})
          });
          result.queued += 1;
        }

        progress.afterId = lastId;
        progress.finished = !page.nextAfter;
        await saveSweep();
      }
    } catch (error) {
      onEntityError("dailySweep", entity, error);
    }
  }

  result.done = sweep.done;
  return result;
}

export async function runIntakePollerWorkflow(context, dependencies = {}) {
  void context;
  const config = (dependencies.getConfig || getIntakePollerConfig)();
  (dependencies.createHubSpotClient || createHubSpotClient)(config);
  (dependencies.createStateClient || createStateClient)(config);
  (dependencies.createServiceBusClient || createServiceBusClient)(config);
  const searchPage = dependencies.searchObjectPage || searchObjectPage;
  const readState = dependencies.getState || getState;
  const saveState = dependencies.putState || putState;
  const claimLock = dependencies.acquireLease || acquireLease;
  const unlock = dependencies.releaseLease || releaseLease;
  const logger = dependencies.safeLog || safeLog;
  const nowMs = (dependencies.now || Date.now)();

  const portalId = config.hubspot.hubspotPortalId;
  const gateProperty = config.sync.recordGateProperty;
  const entities = pollerEntities(config, portalSenders(config.hubspot.hubspotPortalId));

  const summary = {
    leaseAcquired: false,
    poll: { client: 0, bt_rbt: 0, bcba: 0 },
    sweep: { ran: false, done: false, queued: 0 },
    messagesEnqueued: 0,
    errorsCount: 0
  };

  // One poller run at a time per portal.
  const leaseKey = { pk: POLLER_LEASE_PK, id: `${portalId}:active-lease` };
  const lease = await claimLock({ ...leaseKey, ttlSeconds: config.ttl.leaseTtlSeconds });
  summary.leaseAcquired = Boolean(lease);
  if (!lease) {
    logger("info", "Intake poller skipped; active lease exists.");
    return summary;
  }

  // One object's failure is logged and counted. It does not stop the other objects.
  const onEntityError = (stage, entity, error) => {
    summary.errorsCount += 1;
    logger(
      "error",
      "Poller failed for one object. The next run goes on from the last page that was queued in full.",
      buildErrorLog({ workflow: "intakePoller", stage: `${stage}:${entity.key}`, error })
    );
  };
  const shared = { portalId, gateProperty, nowMs, searchPage, readState, saveState };

  try {
    for (const entity of entities) {
      try {
        await pollEntity({
          entity,
          ...shared,
          onQueued: () => {
            summary.poll[entity.key] += 1;
          }
        });
      } catch (error) {
        onEntityError("poll", entity, error);
      }
    }

    try {
      summary.sweep = await runDailySweep({ entities, ...shared, onEntityError });
    } catch (error) {
      summary.errorsCount += 1;
      logger(
        "error",
        "Daily sweep failed. It runs again in the next hourly run.",
        buildErrorLog({ workflow: "intakePoller", stage: "dailySweep", error })
      );
    }

    summary.messagesEnqueued =
      summary.poll.client + summary.poll.bt_rbt + summary.poll.bcba + summary.sweep.queued;
    return summary;
  } finally {
    try {
      await unlock({ ...leaseKey, etag: lease.etag });
    } catch (error) {
      logger(
        "error",
        "Failed releasing intake lease.",
        buildErrorLog({ workflow: "intakePoller", stage: "releaseLease", error })
      );
      summary.errorsCount += 1;
    }
  }
}
