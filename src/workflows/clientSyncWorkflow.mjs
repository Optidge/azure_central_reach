import { getConfig } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import { createHubSpotClient, getDealById, listAssociations, updateDealProperties } from "../lib/hubspotClient.mjs";
import {
  createCentralReachClient,
  createOrUpdateClient,
  updateClientMetadata
} from "../lib/centralReachClient.mjs";
import { acquireLease, createStateClient, getState, putState, releaseLease } from "../lib/cosmosState.mjs";
import {
  HubSpotReadError,
  MAPPING_VERSION,
  buildComparableState,
  changedNamesFromHashes,
  fieldHashes,
  hashMappedState,
  isStateClientUnavailable,
  metadataClearFieldIds
} from "../lib/mappedState.mjs";
import { filterWritebackProperties } from "../lib/writebackAllowlist.mjs";
import { associationsForComparison } from "../constants/staffingAssociations.mjs";
import { buildClientPayload } from "../mappings/client/buildClientPayload.mjs";
import { buildClientMetadata } from "../mappings/client/buildClientMetadata.mjs";
import { validateClientPayload } from "../mappings/client/validateClientPayload.mjs";
import { STATE_TYPES } from "../constants/state.mjs";

const CLIENT_STATE_PK = "sync:client";
const FALLBACK_CR_CONTACT_ID_PROPERTY = "client_id_number";

const REQUIRED_DEAL_PROPERTIES = [
  "hs_object_id",
  "hs_lastmodifieddate",
  "integration_last_write",
  "updated_by_integration",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "phi_first_name__cloned_",
  "phi_last_name",
  "phi_date_of_birth",
  "phi_gender",
  "email",
  "phone",
  "phone_number__second_",
  "if_services_will_be_in_more_than_one_location__list_the_other_addres",
  "street_address",
  "home_apt",
  "location_city",
  "location_central_reach",
  "location",
  "postal_code",
  "guardian_first_name",
  "guardian_last_name",
  "allergies",
  "maladaptive_behaviors__clinical",
  "comorbid_diagnosis__clinical",
  "current_primary_bt",
  "current_primary_bt_2",
  "bt_work_schedule_confirmed",
  "bt_work_schedule_2_confirmed",
  "client_availability_completed",
  "assigned_hours",
  "authorized_hours",
  "auth_start_date",
  "auth_end_date",
  "physician_name",
  "npi_number",
  "physician_name__commercial",
  "npi_number__commercial",
  "most_recent_asd_diagnosis_date_medicaid",
  "most_recent_asd_diagnosis_date_1",
  "most_recent_asd_diagnosis_date_2",
  "supervising_bcba",
  "initial_assessment_bcba",
  "policy_holder_name",
  "phi__policy_holder_dob",
  "severity_level_clinical",
  "n1_what_type_of_insurance",
  "n2_what_type_of_insurance",
  "insurance_primary",
  "insurance_1__other__summary",
  "insurance_id_1",
  "insurance_id_2",
  "insurance_id_3",
  "insurance_id_4",
  "central_reach_link_to_client"
];

function hashPayload(payload) {
  return hashMappedState(payload);
}

async function claimRecordLock(claim, input) {
  try {
    return await claim(input);
  } catch (error) {
    if (isStateClientUnavailable(error)) {
      return true;
    }
    throw error;
  }
}

async function readPriorSyncState(readState, pk, id) {
  try {
    return await readState({ pk, id });
  } catch (error) {
    if (isStateClientUnavailable(error)) {
      return null;
    }
    throw error;
  }
}

function asReadFailure(error, scope) {
  if (error?.code === "HUBSPOT_READ_FAILED") {
    return error;
  }
  const status = error?.response?.status;
  if (status === 401 || status === 403) {
    return new HubSpotReadError(scope, status);
  }
  return null;
}

function ensureDealId(dealId) {
  const normalized = String(dealId || "").trim();
  if (!normalized) {
    throw new Error("dealId is required");
  }
  return normalized;
}

function buildCentralReachContactUrl(contactId) {
  const id = String(contactId || "").trim();
  if (!id) {
    return null;
  }
  return `https://members.centralreach.com/#contacts/details/?id=${id}`;
}

export async function runClientSyncWorkflow(
  { dealId, hsLastModifiedDate, source, context },
  dependencies = {}
) {
  const getRuntimeConfig = dependencies.getConfig || getConfig;
  const initHubSpot = dependencies.createHubSpotClient || createHubSpotClient;
  const initCentralReach = dependencies.createCentralReachClient || createCentralReachClient;
  const initState = dependencies.createStateClient || createStateClient;
  const fetchDeal = dependencies.getDealById || getDealById;
  const pushWriteback = dependencies.updateDealProperties || updateDealProperties;
  const upsertClient = dependencies.createOrUpdateClient || createOrUpdateClient;
  const pushMetadata = dependencies.updateClientMetadata || updateClientMetadata;
  const saveState = dependencies.putState || putState;
  const readState = dependencies.getState || getState;
  const claimLock = dependencies.acquireLease || acquireLease;
  const unlock = dependencies.releaseLease || releaseLease;
  const loadAssociations = dependencies.listAssociations || listAssociations;
  const mapPayload = dependencies.buildClientPayload || buildClientPayload;
  const mapMetadata = dependencies.buildClientMetadata || buildClientMetadata;
  const validatePayload = dependencies.validateClientPayload || validateClientPayload;
  const digestPayload = dependencies.hashPayload || hashPayload;
  const logger = dependencies.safeLog || safeLog;
  const buildError = dependencies.buildErrorLog || buildErrorLog;

  const normalizedDealId = ensureDealId(dealId);
  const config = getRuntimeConfig();
  const crContactIdProperty =
    config.hubspot.crContactIdProperty || FALLBACK_CR_CONTACT_ID_PROPERTY;

  initHubSpot(config);
  initCentralReach(config);
  initState(config);

  let lockHeld = false;
  try {
    const locked = await claimRecordLock(claimLock, {
      pk: "sync-lock:client",
      id: normalizedDealId,
      ttlSeconds: config.ttl?.leaseTtlSeconds || 120
    });
    if (!locked) {
      const busy = new Error("SyncInProgress");
      busy.code = "SYNC_IN_PROGRESS";
      throw busy;
    }
    lockHeld = true;

    const propertyList = [...REQUIRED_DEAL_PROPERTIES, crContactIdProperty];
    let deal;
    try {
      deal = await fetchDeal(normalizedDealId, propertyList);
      const confirmed = await fetchDeal(normalizedDealId, propertyList);
      if (confirmed) {
        deal = confirmed;
      }
    } catch (error) {
      const readError = asReadFailure(error, "deal");
      if (readError) {
        throw readError;
      }
      throw error;
    }

    const payload = mapPayload({ deal, config });
    const validation = validatePayload(payload);
    if (!validation.isValid) {
      throw new Error(`PayloadValidationError: ${validation.errors.join(", ")}`);
    }

    const metadata = mapMetadata({ deal });
    let includeRelationships = false;
    let relationships = [];
    const bcbaType = config.hubspot.bcbaObjectTypeId;
    const btType = config.hubspot.btRbtObjectTypeId;
    if (bcbaType && btType) {
      try {
        const [bcbaAssociations, btAssociations] = await Promise.all([
          loadAssociations({
            fromObjectType: "deals",
            fromId: normalizedDealId,
            toObjectType: bcbaType
          }),
          loadAssociations({
            fromObjectType: "deals",
            fromId: normalizedDealId,
            toObjectType: btType
          })
        ]);
        relationships = associationsForComparison([
          ...(bcbaAssociations || []),
          ...(btAssociations || [])
        ]);
        includeRelationships = true;
      } catch (error) {
        if (!String(error?.message || "").includes("not initialized")) {
          const readError = asReadFailure(error, "associations");
          if (readError) {
            throw readError;
          }
          throw error;
        }
      }
    }

    const comparable = buildComparableState({
      core: payload,
      metadata: metadata.metadataValues,
      labels: metadata.labelIds,
      relationships,
      includeRelationships
    });
    const payloadHash = digestPayload(comparable);
    const nextFieldHashes = fieldHashes(comparable);
    const prior = await readPriorSyncState(readState, CLIENT_STATE_PK, normalizedDealId);
    const previousFieldHashes = prior?.data?.fieldHashes || null;
    const changedFields = changedNamesFromHashes(previousFieldHashes, nextFieldHashes);
    const hubspotContactId = String(deal?.properties?.[crContactIdProperty] || "").trim();
    const existingContactId =
      hubspotContactId || String(prior?.data?.crContactId || "").trim() || null;
    const existingHash = deal?.properties?.last_sync_hash || null;

    let syncResult;
    if (existingHash && existingHash === payloadHash && existingContactId) {
      syncResult = {
        operation: "noop",
        crContactId: String(existingContactId)
      };
    } else {
      syncResult = await upsertClient({
        payload,
        existingContactId
      });
      if (
        (syncResult?.operation === "create" || !hubspotContactId) &&
        syncResult?.crContactId
      ) {
        await saveState({
          pk: CLIENT_STATE_PK,
          id: normalizedDealId,
          type: "pending_link",
          ttlSeconds: config.ttl.successTtlSeconds,
          data: {
            workflow: "clientSync",
            crContactId: String(syncResult.crContactId),
            fieldHashes: previousFieldHashes,
            updatedAt: new Date().toISOString()
          }
        });
      }
    }

    let metadataSyncSummary = null;
    if (syncResult.operation !== "noop" && syncResult.crContactId) {
      const clearFieldIds = metadataClearFieldIds(previousFieldHashes, metadata.metadataValues);
      metadataSyncSummary = await pushMetadata(
        syncResult.crContactId,
        metadata.metadataValues,
        { labelIds: metadata.labelIds, clearFieldIds }
      );
      if ((metadataSyncSummary?.failedCount || 0) > 0) {
        const failed = new Error("MetadataWriteFailed");
        failed.code = "METADATA_WRITE_FAILED";
        failed.failedFieldIds = metadataSyncSummary.failedFieldIds || [];
        throw failed;
      }
    }

    let confirmedDeal = deal;
    try {
      confirmedDeal = (await fetchDeal(normalizedDealId, propertyList)) || deal;
    } catch (error) {
      const readError = asReadFailure(error, "deal-confirm");
      if (readError) {
        throw readError;
      }
      throw error;
    }
    const confirmedPayload = mapPayload({ deal: confirmedDeal, config });
    const confirmedMetadata = mapMetadata({ deal: confirmedDeal });
    const confirmedHash = digestPayload(
      buildComparableState({
        core: confirmedPayload,
        metadata: confirmedMetadata.metadataValues,
        labels: confirmedMetadata.labelIds,
        relationships,
        includeRelationships
      })
    );
    if (confirmedHash !== payloadHash) {
      const stale = new Error("SyncStale");
      stale.code = "SYNC_STALE";
      throw stale;
    }

    const status = syncResult.operation === "noop" ? "noop" : "success";
    logger("info", "Client sync compared mapped state.", {
      workflow: "clientSync",
      recordId: normalizedDealId,
      source: source || null,
      mappingVersion: MAPPING_VERSION,
      outcome: status,
      changedFieldNames: changedFields,
      invocationId: context?.invocationId || null
    });

    await pushWriteback(
      normalizedDealId,
      filterWritebackProperties(
        {
          updated_by_integration: true,
          integration_last_write: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          last_sync_status: status,
          last_sync_error: "",
          last_sync_hash: payloadHash,
          ...(syncResult.crContactId
            ? {
                [crContactIdProperty]: String(syncResult.crContactId),
                central_reach_link_to_client: buildCentralReachContactUrl(syncResult.crContactId)
              }
            : {})
        },
        { kind: "client", idProperty: crContactIdProperty }
      )
    );

    await saveState({
      pk: CLIENT_STATE_PK,
      id: normalizedDealId,
      type: STATE_TYPES.SUCCESS,
      ttlSeconds: config.ttl.successTtlSeconds,
      data: {
        workflow: "clientSync",
        status,
        operation: syncResult.operation,
        crContactId: syncResult.crContactId || null,
        payloadHash,
        fieldHashes: nextFieldHashes,
        mappingVersion: MAPPING_VERSION,
        changedFieldNames: changedFields,
        hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null,
        invocationId: context?.invocationId || null,
        metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? null,
        metadataFailedCount: metadataSyncSummary?.failedCount ?? null,
        updatedAt: new Date().toISOString()
      }
    });

    return {
      ok: true,
      dealId: normalizedDealId,
      status,
      operation: syncResult.operation,
      crContactId: syncResult.crContactId || null,
      changedFieldNames: changedFields,
      metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? 0,
      metadataFailedCount: metadataSyncSummary?.failedCount ?? 0
    };
  } catch (error) {
    if (error?.code === "SYNC_IN_PROGRESS" || error?.code === "SYNC_STALE") {
      throw error;
    }
    logger(
      "error",
      "Client sync workflow failed.",
      buildError({
        workflow: "clientSync",
        stage: "runClientSyncWorkflow",
        error,
        recordId: normalizedDealId,
        extra: {
          invocationId: context?.invocationId || null,
          hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null
        }
      })
    );

    try {
      await pushWriteback(
        normalizedDealId,
        filterWritebackProperties(
          {
            last_sync_at: new Date().toISOString(),
            last_sync_status: "error",
            last_sync_error: String(error?.message || "Client sync failed").slice(0, 500),
            ...(Array.isArray(error?.failedFieldIds) && error.failedFieldIds.length
              ? { last_sync_error: `MetadataWriteFailed fields: ${error.failedFieldIds.join(",")}`.slice(0, 500) }
              : {})
          },
          { kind: "client", idProperty: crContactIdProperty }
        )
      );
    } catch (writebackError) {
      logger(
        "error",
        "Client sync error writeback failed.",
        buildError({
          workflow: "clientSync",
          stage: "writeErrorWriteback",
          error: writebackError,
          recordId: normalizedDealId
        })
      );
    }

    try {
      await saveState({
        pk: CLIENT_STATE_PK,
        id: normalizedDealId,
        type: STATE_TYPES.FAIL,
        ttlSeconds: config.ttl.failTtlSeconds,
        data: {
          workflow: "clientSync",
          status: "error",
          errorMessage: String(error?.message || "Client sync failed").slice(0, 500),
          failedFieldIds: error?.failedFieldIds || [],
          crContactId: (await readPriorSyncState(readState, CLIENT_STATE_PK, normalizedDealId))?.data
            ?.crContactId || null,
          hsLastModifiedDate: hsLastModifiedDate ? String(hsLastModifiedDate) : null,
          invocationId: context?.invocationId || null,
          updatedAt: new Date().toISOString()
        }
      });
    } catch (stateError) {
      logger(
        "error",
        "Client sync fail-state write failed.",
        buildError({
          workflow: "clientSync",
          stage: "putFailState",
          error: stateError,
          recordId: normalizedDealId
        })
      );
    }

    throw error;
  } finally {
    if (lockHeld) {
      try {
        await unlock({ pk: "sync-lock:client", id: normalizedDealId });
      } catch (releaseError) {
        if (!isStateClientUnavailable(releaseError)) {
          logger(
            "error",
            "Client sync lock release failed.",
            buildError({
              workflow: "clientSync",
              stage: "releaseLock",
              error: releaseError,
              recordId: normalizedDealId
            })
          );
        }
      }
    }
  }
}
