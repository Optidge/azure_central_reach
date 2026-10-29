import { getConfig } from "../lib/config.mjs";
import { safeLog } from "../lib/safeLog.mjs";
import { buildErrorLog } from "../lib/errors.mjs";
import {
  createHubSpotClient,
  getContactById,
  getDealById,
  listAssociations,
  updateDealProperties
} from "../lib/hubspotClient.mjs";
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
import { assertNoAbsentProperties } from "../lib/fieldRead.mjs";
import {
  caseBinding,
  deriveRecordState,
  parseSnapshot,
  workerGate
} from "../lib/recordLifecycle.mjs";
import { planAttempt, runPlan, syncErrorMessage } from "../lib/attemptPlan.mjs";
import { scheduleClientSyncReplay } from "../lib/serviceBusClient.mjs";
import { MAX_DELIVERY_COUNT } from "../constants/queues.mjs";
import { associationsForComparison } from "../constants/staffingAssociations.mjs";
import {
  PARENT_GUARDIAN_ASSOCIATION_TYPE_ID,
  buildClientPayload
} from "../mappings/client/buildClientPayload.mjs";
import { buildClientMetadata } from "../mappings/client/buildClientMetadata.mjs";
import { validateClientPayload } from "../mappings/client/validateClientPayload.mjs";
import { STATE_TYPES } from "../constants/state.mjs";

const CLIENT_STATE_PK = "sync:client";
const FALLBACK_CR_CONTACT_ID_PROPERTY = "client_id_number";

// Read synced Case properties below. The workflow fetches type 3 contacts.
// The Case fields are the fallback when the qualifying count is not one.
// Do not fetch the staffing association to fill names. Property sync copies
// the source onto the Case when that source changes, which is what makes
// the Case edit detectable.
//
// Source of truth placements for the sync properties:
// - guardian_first_name, guardian_last_name, and email: Case fallback for
//   section 3 when the Parent/Guardian count is not one. The contact fields
//   are firstname, lastname, and email.
// - if_services_will_be_in_more_than_one_location__list_the_other_address:
//   section 3 additional service address. Production's internal name ends in
//   address. The shorter addres name is not a property on portal 50317927 or
//   50850427. The payload prefers full_home_address, then service_address__other,
//   then this field, then street_address.
// - current_primary_bt, current_primary_bt_2: section 3 and section 4,
//   Case-to-BT associations Primary BT 1 (76) and Primary BT 2 (143).
// - supervising_bcba, initial_assessment_bcba: section 4 name rollups on the
//   Case. The CR supervising-BCBA value in section 3 is the Case text field
//   ongoing_central_reach_provider_supplier. IA BCBA is association 86.
// - case_status and staffing_status: section 7, on the Case.
// The entry gate is enter_in_central_reach contains Yes. create_record is not
// the trigger. location and stateregion are on sandbox portal 50850427 and
// are requested below.
//
// Production sensitive-data tier (portal 50317927, Integration V2 API rule #2).
// The webhook enqueues the record id only. This deal GET reads the values.
// Production needs crm.objects.deals.sensitive.read or HubSpot omits them.
// Portal 50850427 is a developer test account and cannot mark these sensitive.
// Fetched: phi_first_name__cloned_, phi_last_name, phi_gender,
// phi_date_of_birth, insurance_id_1, insurance_id_2, phi__policy_holder_dob,
// phi_diagnosis (HIPAA category in production).
// Sensitive in production and not synced, because the field map does not use
// them: insurance_id_3, insurance_id_4.
const REQUIRED_DEAL_PROPERTIES = [
  "hs_object_id",
  "hs_lastmodifieddate",
  "integration_last_write",
  "updated_by_integration",
  "last_sync_hash",
  "last_sync_at",
  "last_sync_status",
  "last_sync_error",
  "phi_first_name__cloned_", // Production sensitive
  "phi_last_name", // Production sensitive
  "phi_date_of_birth", // Production sensitive
  "phi_gender", // Production sensitive
  // Case fallback for section 3 primary email when the guardian count is not one.
  "email",
  "phone",
  "phone_number__second_",
  // Section 3 mailing address. full_home_address is preferred for the contact
  // line when it is filled. street_address remains the fallback.
  "full_home_address",
  "service_address__other",
  "if_services_will_be_in_more_than_one_location__list_the_other_address",
  "street_address",
  "home_apt",
  "location_city",
  "location",
  "stateregion",
  "location_central_reach",
  "postal_code",
  "specific_home_location",
  // Case fallback for section 3 guardian name when the guardian count is not one.
  "guardian_first_name",
  "guardian_last_name",
  "enter_in_central_reach",
  "case_status",
  // Pending follow-up in the guide: Staffed is not in the CentralReach label
  // catalog, and Active Case Load is not a metadata field. staffing_status
  // is fetched and is not turned into a label until that follow-up lands.
  "staffing_status",
  "allergies",
  "allergies__yes__explain",
  "maladaptive_behaviors__parentguardian",
  "comorbid_diagnosis__clinical",
  "phi_diagnosis", // Production sensitive (HIPAA category)
  "diagnosis_other",
  "important_information",
  "referral_source",
  // Section 4 Primary BT associations, read from the Case rollup. Do not fetch type 76 or 143 for the name.
  "current_primary_bt",
  "current_primary_bt_2",
  "work_schedule_details",
  "btrbt_work_schedule_2_details",
  "work_schedule_1_details__for_location_2_other",
  "work_schedule_2_details__for_location_2_other",
  "bt_work_schedule_confirmed",
  "bt_work_schedule_2_confirmed",
  "finalized_client_service_hours_post_assessment",
  "client_service_hours_total",
  "total_hours_bt1bt2_work_schedule",
  "client_availability_completed",
  "assigned_hours",
  "initial_auth_tracks",
  "n97153_approved_assessment_hours_auth_req",
  "ia_hours_from_the_ia",
  "authorized_hours",
  "auth_start_date",
  "auth_end_date",
  "ongoing_auth_period_start_date",
  "ongoing_autrh_period_end_date",
  "physician_name",
  "npi_number",
  "physician_name__commercial",
  "npi_number__commercial",
  "referring_provider_medicaid_id",
  "most_recent_asd_diagnosis_date_medicaid",
  "most_recent_asd_diagnosis_date_1",
  "most_recent_asd_diagnosis_date_2",
  // Section 3 supervising BCBA text, then the Case name rollup.
  // reassessment_bcba_name is the Case rollup for metadata 144602.
  "ongoing_central_reach_provider_supplier",
  "supervising_bcba",
  "initial_assessment_bcba",
  "reassessment_bcba_name",
  "policy_holder_name",
  "phi__policy_holder_dob", // Production sensitive
  "severity_level_clinical",
  "n1_what_type_of_insurance",
  "n2_what_type_of_insurance",
  "insurance_primary",
  "insurance_1__other__summary",
  "insurance_id_1", // Production sensitive
  "insurance_2",
  "insurance_2__other__summary",
  // insurance_id_2 is fetched. insurance_id_3 and insurance_id_4 are sensitive
  // on production portal 50317927 and stay off this list because the field map
  // does not sync them.
  "insurance_id_2", // Production sensitive
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

function throwHubSpotRead(error, scope) {
  if (isStateClientUnavailable(error)) {
    return;
  }
  const readError = asReadFailure(error, scope);
  if (readError) {
    throw readError;
  }
  throw error;
}

async function loadTypeThreeContacts({ loadAssociations, fetchContact, dealId }) {
  let associations;
  try {
    associations = await loadAssociations({
      fromObjectType: "0-3",
      fromId: dealId,
      toObjectType: "0-1"
    });
  } catch (error) {
    throwHubSpotRead(error, "associations");
    return [];
  }

  const rows = (Array.isArray(associations) ? associations : []).filter((row) =>
    (Array.isArray(row?.typeIds) ? row.typeIds : []).some(
      (typeId) => Number(typeId) === PARENT_GUARDIAN_ASSOCIATION_TYPE_ID
    )
  );

  const contacts = [];
  for (const row of rows) {
    const contactId = String(row?.toObjectId || "").trim();
    if (!contactId) {
      continue;
    }

    let contact;
    try {
      contact = await fetchContact(contactId);
    } catch (error) {
      throwHubSpotRead(error, "contact");
      return [];
    }

    if (!contact) {
      continue;
    }

    contacts.push({
      ...contact,
      id: String(contact.id || contactId),
      typeIds: row.typeIds
    });
  }

  return contacts;
}

export async function runClientSyncWorkflow(
  { dealId, hsLastModifiedDate, source, context, deliveryCount, replayCount = 0 },
  dependencies = {}
) {
  const getRuntimeConfig = dependencies.getConfig || getConfig;
  const initHubSpot = dependencies.createHubSpotClient || createHubSpotClient;
  const initCentralReach = dependencies.createCentralReachClient || createCentralReachClient;
  const initState = dependencies.createStateClient || createStateClient;
  const fetchDeal = dependencies.getDealById || getDealById;
  const fetchContact = dependencies.getContactById || getContactById;
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
  const scheduleReplay = dependencies.scheduleClientSyncReplay || scheduleClientSyncReplay;

  const normalizedDealId = ensureDealId(dealId);
  const config = getRuntimeConfig();
  const crContactIdProperty =
    config.hubspot.crContactIdProperty || FALLBACK_CR_CONTACT_ID_PROPERTY;
  const binding = caseBinding(crContactIdProperty);
  const dryRun = Boolean(config.features?.syncDryRun);

  initHubSpot(config);
  initCentralReach(config);
  initState(config);

  const patchDeal = (properties) =>
    pushWriteback(
      normalizedDealId,
      filterWritebackProperties(properties, { kind: "client", idProperty: crContactIdProperty })
    );
  const attempt = {
    binding,
    recordId: normalizedDealId,
    deliveryCount: deliveryCount ?? MAX_DELIVERY_COUNT,
    maxDeliveryCount: MAX_DELIVERY_COUNT,
    replayCount,
    dryRun,
    allowEmployeeCreate: false
  };
  let lastSyncStatus = null;
  let knownContactId = null;

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

    const recordState = deriveRecordState(
      parseSnapshot(deal?.properties || {}, binding, normalizedDealId)
    );
    lastSyncStatus = recordState.lastSyncStatus;
    knownContactId = recordState.centralReachId;
    const gate = workerGate(recordState);
    if (gate.action === "skip") {
      logger("info", "Client sync skipped by the worker gate.", {
        workflow: "clientSync",
        recordId: normalizedDealId,
        source: source || null,
        outcome: "skipped",
        reason: gate.reason,
        invocationId: context?.invocationId || null
      });
      return {
        ok: true,
        dealId: normalizedDealId,
        status: "skipped",
        operation: "noop",
        reason: gate.reason,
        crContactId: null,
        changedFieldNames: [],
        metadataUpdatedCount: 0,
        metadataFailedCount: 0
      };
    }
    assertNoAbsentProperties(deal?.properties, propertyList);

    const guardianContacts = await loadTypeThreeContacts({
      loadAssociations,
      fetchContact,
      dealId: normalizedDealId
    });
    const payload = mapPayload({ deal, config, contacts: guardianContacts });
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
    knownContactId = existingContactId;
    const existingHash = deal?.properties?.last_sync_hash || null;

    let syncResult = { operation: "noop", crContactId: existingContactId };
    let metadataSyncSummary = null;
    const plan = planAttempt({
      ...attempt,
      lastSyncStatus,
      centralReachId: existingContactId,
      hashMatched: Boolean(existingHash && existingHash === payloadHash),
      payloadHash,
      error: null,
      nowMs: Date.now()
    });

    const action = await runPlan(plan, {
      patch: patchDeal,
      upsert: async () => {
        syncResult = await upsertClient({ payload, existingContactId });
        if (syncResult?.crContactId) {
          knownContactId = String(syncResult.crContactId);
        }
        if ((syncResult?.operation === "create" || !hubspotContactId) && syncResult?.crContactId) {
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

        if (syncResult.crContactId) {
          const clearFieldIds = metadataClearFieldIds(previousFieldHashes, metadata.metadataValues);
          metadataSyncSummary = await pushMetadata(syncResult.crContactId, metadata.metadataValues, {
            labelIds: metadata.labelIds,
            clearFieldIds
          });
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
        const confirmedPayload = mapPayload({
          deal: confirmedDeal,
          config,
          contacts: guardianContacts
        });
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

        return syncResult.crContactId
          ? {
              [crContactIdProperty]: String(syncResult.crContactId),
              central_reach_link_to_client: buildCentralReachContactUrl(syncResult.crContactId)
            }
          : {};
      }
    });

    const status = action === "write" ? "success" : action === "dry-run-stop" ? "dry-run" : "noop";
    logger("info", "Client sync compared mapped state.", {
      workflow: "clientSync",
      recordId: normalizedDealId,
      source: source || null,
      mappingVersion: MAPPING_VERSION,
      outcome: status,
      action,
      linked: Boolean(existingContactId),
      changedFieldNames: changedFields,
      invocationId: context?.invocationId || null
    });

    if (action === "write") {
      await saveState({
        pk: CLIENT_STATE_PK,
        id: normalizedDealId,
        type: STATE_TYPES.SUCCESS,
        ttlSeconds: config.ttl.successTtlSeconds,
        data: {
          workflow: "clientSync",
          source: source || null,
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
    }

    return {
      ok: true,
      dealId: normalizedDealId,
      status,
      operation: action === "write" ? syncResult.operation : "noop",
      crContactId: syncResult.crContactId || null,
      changedFieldNames: changedFields,
      metadataUpdatedCount: metadataSyncSummary?.updatedCount ?? 0,
      metadataFailedCount: metadataSyncSummary?.failedCount ?? 0
    };
  } catch (error) {
    const transient = error?.code === "SYNC_IN_PROGRESS" || error?.code === "SYNC_STALE";
    if (!transient) {
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
    }

    const plan = planAttempt({
      ...attempt,
      lastSyncStatus,
      centralReachId: knownContactId,
      hashMatched: false,
      error,
      nowMs: Date.now()
    });
    await runPlan(plan, {
      patch: patchDeal,
      claimReplay: (messageId) =>
        claimLock({ pk: "replay:client", id: messageId, ttlSeconds: config.ttl.successTtlSeconds }),
      schedule: (replay) => scheduleReplay(normalizedDealId, replay)
    });
    logger("info", "Client sync dry run stopped on an error.", {
      workflow: "clientSync",
      recordId: normalizedDealId,
      source: source || null,
      outcome: "dry-run",
      reason: syncErrorMessage(error),
      invocationId: context?.invocationId || null
    });
    return {
      ok: true,
      dealId: normalizedDealId,
      status: "dry-run",
      operation: "noop",
      reason: syncErrorMessage(error),
      crContactId: null,
      changedFieldNames: [],
      metadataUpdatedCount: 0,
      metadataFailedCount: 0
    };
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
