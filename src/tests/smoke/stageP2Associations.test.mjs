// Stage P, row P.2 (BUILD-PLAN.md section 10; BR16, BR17, C11, C14).
// listAssociations returns, per row, toObjectId and types: [{ typeId, category }]. An answer with
// no results list is thrown as a failed read, never read as "no staff". associationsForComparison
// reads the new shape.
// hubspotClient.mjs runs for real behind a fake HTTP adapter. The workflow tests also run the
// real mapper, validator, hash, cosmosState.mjs (in-memory container) and centralReachClient.mjs
// (fake HTTP adapter). No live call.
import test from "node:test";
import assert from "node:assert/strict";
import { hubspotPortalSettings } from "../../lib/config.mjs";
import { useStateContainer } from "../../lib/cosmosState.mjs";
import { createHubSpotClient, listAssociations } from "../../lib/hubspotClient.mjs";
import { answeringPortalCheck, portalCheckedHubSpotConfig } from "./hubspotPortalCheckFake.mjs";
import { FAILURE_KINDS, classifyFailure } from "../../lib/retry.mjs";
import { associationsForComparison } from "../../constants/staffingAssociations.mjs";
import { runClientSyncWorkflow } from "../../workflows/clientSyncWorkflow.mjs";
import {
  SANDBOX_PORTAL,
  caseRecord,
  clientWorkflowDeps,
  fakeCentralReach,
  httpError,
  memoryContainer
} from "./stage2Fakes.mjs";

const CLIENT_LINK_PK = "sync:client";
const BT_RBT_TYPE = "2-72890325";
// Sandbox IDs (BUILD-PLAN section 3): Primary BT 1 is 238, the unlabeled BT/RBT type is 187.
const PRIMARY_BT_1 = 238;
const UNLABELED_BT = 187;

// HubSpot at the HTTP level. `answer` gets the request path and the `after` cursor and returns
// the response body.
function fakeHubSpotAssociations(answer) {
  const calls = [];
  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  client.defaults.adapter = answeringPortalCheck(async (requestConfig) => {
    const url = String(requestConfig.url || "");
    const after = requestConfig.params?.after ?? null;
    const body = typeof requestConfig.data === "string" ? JSON.parse(requestConfig.data) : null;
    calls.push({ url, after });
    return { data: answer({ url, after, body }), status: 200, headers: {}, config: requestConfig };
  });
  return calls;
}

function read(toObjectType = BT_RBT_TYPE) {
  return listAssociations({ fromObjectType: "deals", fromId: "deal-1", toObjectType });
}

function assertFailedRead(error) {
  assert.equal(error.code, "HUBSPOT_READ_FAILED");
  assert.equal(classifyFailure(error), FAILURE_KINDS.TEMPORARY);
  return true;
}

test("[P.2] listAssociations throws when results is missing", async () => {
  for (const body of [{}, { results: null }, { status: "error" }, null, { results: "none" }]) {
    fakeHubSpotAssociations(() => body);
    await assert.rejects(read(), assertFailedRead);
  }
});

test("[P.2] listAssociations throws when a later page has no results list", async () => {
  fakeHubSpotAssociations(({ after }) =>
    after
      ? {}
      : {
          results: [
            { toObjectId: 1, associationTypes: [{ category: "USER_DEFINED", typeId: PRIMARY_BT_1 }] }
          ],
          paging: { next: { after: "p2" } }
        }
  );
  await assert.rejects(read(), assertFailedRead);
});

test("[P.2] listAssociations returns toObjectId and types with typeId and category", async () => {
  fakeHubSpotAssociations(() => ({
    results: [
      {
        toObjectId: 55,
        associationTypes: [
          { category: "USER_DEFINED", typeId: PRIMARY_BT_1, label: "Primary BT 1" },
          { category: "HUBSPOT_DEFINED", typeId: UNLABELED_BT, label: null }
        ]
      }
    ]
  }));
  assert.deepEqual(await read(), [
    {
      toObjectId: "55",
      types: [
        { typeId: PRIMARY_BT_1, category: "USER_DEFINED" },
        { typeId: UNLABELED_BT, category: "HUBSPOT_DEFINED" }
      ]
    }
  ]);
});

test("[P.2] listAssociations keeps the category when two categories share one type ID", async () => {
  fakeHubSpotAssociations(() => ({
    results: [
      {
        toObjectId: "9",
        associationTypes: [
          { category: "HUBSPOT_DEFINED", typeId: 3 },
          { category: "USER_DEFINED", typeId: 3 }
        ]
      }
    ]
  }));
  const [row] = await read();
  assert.deepEqual(row.types, [
    { typeId: 3, category: "HUBSPOT_DEFINED" },
    { typeId: 3, category: "USER_DEFINED" }
  ]);
});

test("[P.2] listAssociations reads an empty results list as no associations, and reads every page", async () => {
  fakeHubSpotAssociations(() => ({ results: [] }));
  assert.deepEqual(await read(), []);

  const calls = fakeHubSpotAssociations(({ after }) =>
    after
      ? { results: [{ toObjectId: "2", associationTypes: [{ category: "USER_DEFINED", typeId: 240 }] }] }
      : {
          results: [
            { toObjectId: "1", associationTypes: [{ category: "USER_DEFINED", typeId: PRIMARY_BT_1 }] }
          ],
          paging: { next: { after: "p2" } }
        }
  );
  assert.deepEqual(
    (await read()).map((row) => row.toObjectId),
    ["1", "2"]
  );
  assert.deepEqual(
    calls.map((call) => call.after),
    [null, "p2"]
  );
});

test("[P.2] a refused association read (403) is still a failed read", async () => {
  const client = createHubSpotClient(portalCheckedHubSpotConfig());
  client.defaults.adapter = answeringPortalCheck(async () => {
    throw httpError(403);
  });
  await assert.rejects(read(), assertFailedRead);
});

test("[P.2] associationsForComparison reads the new shape and drops the portal's excluded types", () => {
  const excluded = hubspotPortalSettings(SANDBOX_PORTAL).excludedStaffingAssociationTypeIds;
  const rows = [
    {
      toObjectId: "20",
      types: [
        { typeId: PRIMARY_BT_1, category: "USER_DEFINED" },
        { typeId: UNLABELED_BT, category: "HUBSPOT_DEFINED" }
      ]
    },
    { toObjectId: "30", types: [{ typeId: UNLABELED_BT, category: "HUBSPOT_DEFINED" }] }
  ];
  // The compared shape is unchanged: record ID and role type IDs (BR17).
  assert.deepEqual(associationsForComparison(rows, excluded), [
    { toObjectId: "20", typeIds: [PRIMARY_BT_1] }
  ]);
});

function setup() {
  const container = memoryContainer();
  useStateContainer(container);
  const cr = fakeCentralReach();
  return { container, cr };
}

// The worker with the real listAssociations: only the HubSpot HTTP answer is faked.
function runCaseWithRealAssociations(record) {
  return runClientSyncWorkflow(
    { dealId: "deal-1" },
    { ...clientWorkflowDeps({ record }), listAssociations }
  );
}

test("[P.2][BR16] the Case worker stops and retries when the association answer has no results list", async () => {
  const { container, cr } = setup();
  cr.clients.set("2001", { contactId: "2001", externalSystemId: "deal-1", primaryEmail: null });
  const record = caseRecord({ client_id_number: "2001" });
  fakeHubSpotAssociations(() => ({}));

  await assert.rejects(runCaseWithRealAssociations(record), assertFailedRead);

  // No CentralReach write, no status written while the failure is retried, no hashes saved.
  assert.deepEqual(cr.writes(), []);
  assert.equal(record.properties.last_sync_status, undefined);
  assert.equal(container.get(CLIENT_LINK_PK, `${SANDBOX_PORTAL}:deal-1`)?.data?.fieldHashes, undefined);
});

test("[P.2][BR17] the Case worker compares staffing by record ID and role from the new shape", async () => {
  const relationshipsHash = async (btRows) => {
    const { container, cr } = setup();
    cr.clients.set("2001", { contactId: "2001", externalSystemId: "deal-1", primaryEmail: null });
    cr.labels.set("2001", [1052619]);
    const record = caseRecord({ client_id_number: "2001" });
    // Row 4.14: the worker also reads the names of the staff it finds, in one batch call.
    fakeHubSpotAssociations(({ url, body }) =>
      url.endsWith("/batch/read")
        ? {
            results: body.inputs.map(({ id }) => ({
              id,
              properties: { first_name: "Sam", last_name: "Staff" }
            }))
          }
        : { results: url.endsWith(`/associations/${BT_RBT_TYPE}`) ? btRows : [] }
    );
    const result = await runCaseWithRealAssociations(record);
    assert.equal(result.status, "success");
    return container.get(CLIENT_LINK_PK, `${SANDBOX_PORTAL}:deal-1`).data.fieldHashes.relationships;
  };
  const row = (toObjectId, typeId, category) => ({
    toObjectId,
    associationTypes: [{ category, typeId }]
  });

  const none = await relationshipsHash([]);
  const primaryBt = await relationshipsHash([row("501", PRIMARY_BT_1, "USER_DEFINED")]);
  const otherRecord = await relationshipsHash([row("502", PRIMARY_BT_1, "USER_DEFINED")]);
  const otherRole = await relationshipsHash([row("501", 240, "USER_DEFINED")]);
  const unlabeledOnly = await relationshipsHash([row("501", UNLABELED_BT, "HUBSPOT_DEFINED")]);

  for (const hash of [none, primaryBt, otherRecord, otherRole, unlabeledOnly]) {
    assert.equal(typeof hash, "string");
  }
  assert.notEqual(primaryBt, none);
  assert.notEqual(primaryBt, otherRecord);
  assert.notEqual(primaryBt, otherRole);
  // An excluded type alone is the same as no staff.
  assert.equal(unlabeledOnly, none);
});
