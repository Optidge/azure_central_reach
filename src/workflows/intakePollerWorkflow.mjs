import { getIntakePollerConfig } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import { endTickOnRateLimit } from "../lib/retry.mjs";
import {
  createHubSpotClient,
  searchNeverProcessedRecords,
  searchRecordsByKnownProperty
} from "../lib/hubspotClient.mjs";
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
  NEVER_PROCESSED_SOURCE,
  caseBinding,
  deriveRecordState,
  employeeBinding,
  parseSnapshot,
  sweepDecision
} from "../lib/recordLifecycle.mjs";
import { HUBSPOT_EMPLOYEE_TYPES } from "../constants/hubspot.mjs";

const POLLER_LEASE_PK = "workflow:intake-poller";
const POLLER_LEASE_ID = "active-lease";

export function isLinkedForOngoingRefresh(candidate, idProperty) {
  return Boolean(String(candidate?.properties?.[idProperty] || "").trim());
}

function sweepTargets(config, send) {
  const employeeTarget = (entity, objectTypeId, employeeType) => ({
    entity,
    objectTypeId,
    binding: employeeBinding(config.limits.employeeIdProperty),
    send: (recordId, hsLastModifiedDate) =>
      send.employee({
        workflow: "employeeSync",
        source: NEVER_PROCESSED_SOURCE,
        employeeType,
        recordId,
        hsLastModifiedDate
      })
  });

  return [
    {
      entity: "client",
      objectTypeId: "deals",
      binding: caseBinding(config.limits.crContactIdProperty),
      send: (recordId, hsLastModifiedDate) =>
        send.client({
          dealId: recordId,
          hsLastModifiedDate,
          source: NEVER_PROCESSED_SOURCE,
          workflow: "clientSync"
        })
    },
    employeeTarget("bt_rbt", config.hubspot.btRbtObjectTypeId, HUBSPOT_EMPLOYEE_TYPES.BT_RBT),
    employeeTarget("bcba", config.hubspot.bcbaObjectTypeId, HUBSPOT_EMPLOYEE_TYPES.BCBA)
  ];
}

function recordIdOf(candidate) {
  return String(candidate?.id ?? candidate?.properties?.hs_object_id ?? "");
}

export async function runIntakePollerWorkflow(context, dependencies = {}) {
  void context;
  const config = (dependencies.getIntakePollerConfig || getIntakePollerConfig)();
  const claimLease = dependencies.acquireLease || acquireLease;
  const dropLease = dependencies.releaseLease || releaseLease;
  const searchNeverProcessed =
    dependencies.searchNeverProcessedRecords || searchNeverProcessedRecords;
  const searchKnown = dependencies.searchRecordsByKnownProperty || searchRecordsByKnownProperty;
  const readState = dependencies.getState || getState;
  const saveState = dependencies.putState || putState;
  const send = {
    client: dependencies.sendClientSyncMessage || sendClientSyncMessage,
    employee: dependencies.sendEmployeeSyncMessage || sendEmployeeSyncMessage
  };
  const nowMs = (dependencies.now || Date.now)();
  (dependencies.createHubSpotClient || createHubSpotClient)(config);
  (dependencies.createStateClient || createStateClient)(config);
  (dependencies.createServiceBusClient || createServiceBusClient)(config);

  const summary = {
    leaseAcquired: false,
    createSweepEnabled: config.sweep.createSweepEnabled,
    sweep: {},
    messagesEnqueued: 0,
    linkedRecheckEnabled: false,
    linkedClientEnqueued: 0,
    linkedBtRbtEnqueued: 0,
    linkedBcbaEnqueued: 0,
    endedOnRateLimit: false,
    errorsCount: 0
  };

  const leaseAcquired = await claimLease({
    pk: POLLER_LEASE_PK,
    id: POLLER_LEASE_ID,
    ttlSeconds: config.ttl.leaseTtlSeconds
  });
  summary.leaseAcquired = leaseAcquired;

  if (!leaseAcquired) {
    safeLog("info", "Intake poller skipped; active lease exists.");
    return summary;
  }

  const recordFailure = (stage, error, recordId) => {
    summary.errorsCount += 1;
    safeLog("error", "Intake poller step failed.", buildErrorLog({
      workflow: "intakePoller",
      stage,
      error,
      recordId
    }));
    if (endTickOnRateLimit(error).endTick) {
      summary.endedOnRateLimit = true;
    }
  };

  try {
    if (config.sweep.createSweepEnabled) {
      const modifiedBeforeIso = new Date(
        nowMs - config.sweep.graceMinutes * 60 * 1000
      ).toISOString();

      for (const target of sweepTargets(config, send)) {
        const counts = { fetched: 0, enqueued: 0, skipped: 0 };
        summary.sweep[target.entity] = counts;
        let candidates;
        try {
          candidates = await searchNeverProcessed({
            objectTypeId: target.objectTypeId,
            checkboxProperty: target.binding.checkboxProperty,
            idProperty: target.binding.centralReachIdProperty,
            modifiedBeforeIso
          });
        } catch (error) {
          recordFailure(`sweep:${target.entity}`, error);
          if (summary.endedOnRateLimit) {
            return summary;
          }
          continue;
        }
        counts.fetched = candidates.length;

        for (const candidate of candidates) {
          const recordId = recordIdOf(candidate);
          const state = deriveRecordState(
            parseSnapshot(candidate?.properties || {}, target.binding, recordId)
          );
          const decision = sweepDecision(state, {
            now: nowMs,
            createSweepEnabled: config.sweep.createSweepEnabled,
            graceMinutes: config.sweep.graceMinutes
          });
          if (!recordId || !decision.enqueue) {
            counts.skipped += 1;
            continue;
          }
          try {
            await target.send(recordId, String(candidate.properties.hs_lastmodifieddate));
            counts.enqueued += 1;
            summary.messagesEnqueued += 1;
          } catch (error) {
            recordFailure(`sweepSend:${target.entity}`, error, recordId);
          }
        }
      }
    }

    if (config.limits.linkedRecheckEnabled) {
      summary.linkedRecheckEnabled = true;
      const rechecks = [
        {
          entity: "client",
          objectTypeId: "deals",
          propertyName: config.limits.crContactIdProperty,
          limit: config.limits.maxDealsPerRun,
          countKey: "linkedClientEnqueued",
          send: async (recordId) =>
            send.client({
              dealId: recordId,
              source: "linkedRecheck",
              workflow: "clientSync"
            })
        },
        {
          entity: "bt_rbt",
          objectTypeId: config.hubspot.btRbtObjectTypeId,
          propertyName: config.limits.employeeIdProperty,
          limit: config.limits.maxBtRbtPerRun,
          countKey: "linkedBtRbtEnqueued",
          send: async (recordId) =>
            send.employee({
              workflow: "employeeSync",
              source: "linkedRecheck",
              employeeType: HUBSPOT_EMPLOYEE_TYPES.BT_RBT,
              recordId
            })
        },
        {
          entity: "bcba",
          objectTypeId: config.hubspot.bcbaObjectTypeId,
          propertyName: config.limits.employeeIdProperty,
          limit: config.limits.maxBcbaPerRun,
          countKey: "linkedBcbaEnqueued",
          send: async (recordId) =>
            send.employee({
              workflow: "employeeSync",
              source: "linkedRecheck",
              employeeType: HUBSPOT_EMPLOYEE_TYPES.BCBA,
              recordId
            })
        }
      ];

      for (const spec of rechecks) {
        try {
          const cursor = await readState({ pk: `recheck:${spec.entity}`, id: "cursor" });
          const page = await searchKnown({
            objectTypeId: spec.objectTypeId,
            propertyName: spec.propertyName,
            properties: ["hs_object_id", spec.propertyName, "hs_lastmodifieddate"],
            limit: spec.limit,
            after: cursor?.data?.after || null
          });
          for (const candidate of page.results) {
            const recordId = recordIdOf(candidate);
            if (!recordId || !isLinkedForOngoingRefresh(candidate, spec.propertyName)) {
              continue;
            }
            await spec.send(recordId);
            summary[spec.countKey] += 1;
            summary.messagesEnqueued += 1;
          }
          await saveState({
            pk: `recheck:${spec.entity}`,
            id: "cursor",
            type: "recheck-cursor",
            ttlSeconds: config.ttl.dedupeTtlSeconds,
            data: { after: page.nextAfter }
          });
        } catch (error) {
          recordFailure(`linkedRecheck:${spec.entity}`, error);
          if (summary.endedOnRateLimit) {
            return summary;
          }
        }
      }
    }

    return summary;
  } finally {
    try {
      await dropLease({ pk: POLLER_LEASE_PK, id: POLLER_LEASE_ID });
    } catch (error) {
      safeLog(
        "error",
        "Failed releasing intake lease.",
        buildErrorLog({ workflow: "intakePoller", stage: "releaseLease", error })
      );
      summary.errorsCount += 1;
    }
  }
}
