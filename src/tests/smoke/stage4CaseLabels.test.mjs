// Stage 4, rows 4.19 to 4.21 (BUILD-PLAN.md section 12; rule 5.6; contract P.5 a): Case labels.
// The label IDs below are copied from BUILD-PLAN section 9 (CL1 to CL6). The stored values are the
// guide's ([GER-CASE], [G07], [G07B], [G19] and the appendix: case_status stores Warm / Cold).
// The real mapper is called with plain records. Nothing is faked and nothing is sent.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS,
  CENTRAL_REACH_SENDABLE_LABEL_IDS
} from "../../constants/centralReach.mjs";
import { buildClientMetadata } from "../../mappings/client/buildClientMetadata.mjs";

const ALL_CLIENTS = 1052619;
const NY_CLIENT = 1082499;
const NJ_CLIENT = 1132647;
const CO_CLIENT = 1132648;
const HOME = 1052656;
const ACTIVE_CLIENT = 1125427;
const IN_ACTIVE_CLIENT = 1121488;
const SERVICES_97151 = 1156743;
const STAFFED_97153 = 1156746;
const X_97153 = 1156747;
const RETIRED_STAFFING = [1156742, 1156744, 1156745];
const STAFFING_PARENT = 1156741;

const byNumber = (values) => [...values].sort((left, right) => left - right);

function mapCase(properties) {
  return buildClientMetadata({
    deal: { id: "9001", properties: { hs_object_id: "9001", ...properties } },
    portalId: "52311591"
  });
}
const required = (properties) => mapCase(properties).requiredLabelIds;

// --- 4.19, CL1: state ---

test("[CL1][4.19] location New York requires NY Client 1082499", () => {
  assert.deepEqual(required({ location: "New York" }), [ALL_CLIENTS, NY_CLIENT]);
});

test("[CL1][4.19] location New Jersey requires NJ Client 1132647", () => {
  assert.deepEqual(required({ location: "New Jersey" }), [ALL_CLIENTS, NJ_CLIENT]);
});

test("[CL1][4.19] location Colorado requires CO Client 1132648", () => {
  assert.deepEqual(required({ location: "Colorado" }), [ALL_CLIENTS, CO_CLIENT]);
});

test("[CL1][4.19] the three state labels are one managed group, so a state change removes the old state label", () => {
  const mapped = mapCase({ location: "New Jersey" });
  for (const id of [NY_CLIENT, NJ_CLIENT, CO_CLIENT]) {
    assert.equal(mapped.managedLabelIds.includes(id), true, `${id} is managed`);
  }
  assert.equal(mapped.requiredLabelIds.includes(NY_CLIENT), false);
  assert.equal(mapped.requiredLabelIds.includes(CO_CLIENT), false);
});

test("[CL1][4.19] a blank location requires no state label, and location_central_reach is not read", () => {
  assert.deepEqual(required({}), [ALL_CLIENTS]);
  assert.deepEqual(required({ location_central_reach: "New York" }), [ALL_CLIENTS]);
});

test("[CL1][4.19] the state label is kept when the Case goes from Active to Inactive", () => {
  const active = required({ location: "Colorado", case_status: "Warm" });
  const inactive = required({ location: "Colorado", case_status: "Cold" });
  assert.equal(active.includes(CO_CLIENT), true);
  assert.equal(inactive.includes(CO_CLIENT), true);
});

// --- 4.20, CL2: service location ---

test("[CL2][4.20] specific_home_location Child's House requires Home 1052656", () => {
  assert.equal(required({ specific_home_location: "Child's House" }).includes(HOME), true);
});

test("[CL2][4.20] specific_home_location More Than One Location requires Home 1052656", () => {
  assert.equal(required({ specific_home_location: "More Than One Location" }).includes(HOME), true);
});

test("[CL2][4.20] Other Location or a blank requires no Home label, and Home is managed", () => {
  assert.equal(required({ specific_home_location: "Other Location" }).includes(HOME), false);
  assert.equal(required({}).includes(HOME), false);
  assert.equal(mapCase({}).managedLabelIds.includes(HOME), true);
});

// --- 4.21, CL3: Active / Inactive ---

test("[CL3][4.21] case_status Warm requires Active Client 1125427 and not In-Active Client", () => {
  const labels = required({ case_status: "Warm" });
  assert.equal(labels.includes(ACTIVE_CLIENT), true);
  assert.equal(labels.includes(IN_ACTIVE_CLIENT), false);
});

test("[CL3][4.21] case_status Cold requires In-Active Client 1121488 and not Active Client", () => {
  const labels = required({ case_status: "Cold" });
  assert.equal(labels.includes(IN_ACTIVE_CLIENT), true);
  assert.equal(labels.includes(ACTIVE_CLIENT), false);
});

test("[CL3][4.21] a blank case_status requires neither label, and both are managed", () => {
  const mapped = mapCase({});
  assert.equal(mapped.requiredLabelIds.includes(ACTIVE_CLIENT), false);
  assert.equal(mapped.requiredLabelIds.includes(IN_ACTIVE_CLIENT), false);
  assert.equal(mapped.managedLabelIds.includes(ACTIVE_CLIENT), true);
  assert.equal(mapped.managedLabelIds.includes(IN_ACTIVE_CLIENT), true);
});

test("[CL3][4.21] a blank staffing_status does not take away the Active / Inactive label", () => {
  assert.equal(required({ case_status: "Cold", staffing_status: "" }).includes(IN_ACTIVE_CLIENT), true);
});

// --- 4.21, CL4: staffing ---

test("[CL4][4.21] staffing_status 97151 Services requires label 1156743", () => {
  assert.equal(required({ staffing_status: "97151 Services" }).includes(SERVICES_97151), true);
});

test("[CL4][4.21] staffing_status Staffed 97153 requires label 1156746", () => {
  assert.equal(required({ staffing_status: "Staffed 97153" }).includes(STAFFED_97153), true);
});

test("[CL4][4.21] staffing_status X 97153 requires label 1156747", () => {
  assert.equal(required({ staffing_status: "X 97153" }).includes(X_97153), true);
});

test("[CL4][4.21] a retired, lead or blank staffing_status requires no staffing label", () => {
  const notSent = [
    "",
    "Pending 97151 Services",
    "Pending 97153 Services",
    "Starting 97153 Services",
    "Hot Lead",
    "Warm Lead",
    "Cold Lead",
    "Processing Leads"
  ];
  for (const staffingStatus of notSent) {
    assert.deepEqual(
      required({ staffing_status: staffingStatus }),
      [ALL_CLIENTS],
      `staffing_status "${staffingStatus}"`
    );
  }
});

test("[CL4][4.21] only one staffing label is required at a time, and all three are managed", () => {
  const mapped = mapCase({ staffing_status: "Staffed 97153" });
  assert.deepEqual(
    mapped.requiredLabelIds.filter((id) => [SERVICES_97151, STAFFED_97153, X_97153].includes(id)),
    [STAFFED_97153]
  );
  for (const id of [SERVICES_97151, STAFFED_97153, X_97153]) {
    assert.equal(mapped.managedLabelIds.includes(id), true, `${id} is managed`);
  }
});

test("[CL4][4.21] the three retired staffing IDs are managed, so they are removed, and are never required", () => {
  for (const staffingStatus of ["", "Staffed 97153", "Pending 97153 Services"]) {
    const mapped = mapCase({ staffing_status: staffingStatus });
    for (const id of RETIRED_STAFFING) {
      assert.equal(mapped.managedLabelIds.includes(id), true, `${id} is managed`);
      assert.equal(mapped.requiredLabelIds.includes(id), false, `${id} is never required`);
    }
  }
  assert.deepEqual(byNumber(CENTRAL_REACH_REMOVE_ONLY_LABEL_IDS), RETIRED_STAFFING);
});

// CLB-040: the labels come from case_status and staffing_status, never from the pipeline stage.
// Client Pipeline stage IDs from the production read of 2026-11-24.
test("[CL3][CL4][4.21] a dealstage change with case_status and staffing_status unchanged requires and manages the same labels", () => {
  const base = {
    location: "New York",
    specific_home_location: "Child's House",
    case_status: "Warm",
    staffing_status: "Staffed 97153"
  };
  const ongoing = mapCase({ ...base, dealstage: "1310034488" });
  assert.deepEqual(
    byNumber(ongoing.requiredLabelIds),
    byNumber([ALL_CLIENTS, HOME, NY_CLIENT, ACTIVE_CLIENT, STAFFED_97153])
  );
  // Paused, Discharged, Disqualified, Closed Lost, Contact Client.
  for (const dealstage of ["1344955718", "1315313037", "1136629070", "closedlost", "1136629064"]) {
    const moved = mapCase({ ...base, dealstage });
    assert.deepEqual(moved.requiredLabelIds, ongoing.requiredLabelIds, dealstage);
    assert.deepEqual(moved.managedLabelIds, ongoing.managedLabelIds, dealstage);
  }
});

// --- CL5, CL6 and the contract (P.5 a) ---

test("[CL6][4.21] All Clients 1052619 is required on every client and is never managed", () => {
  const cases = [
    {},
    { location: "New York", case_status: "Cold", staffing_status: "X 97153" },
    { location: "Colorado", specific_home_location: "Child's House", case_status: "Warm" }
  ];
  for (const properties of cases) {
    const mapped = mapCase(properties);
    assert.equal(mapped.requiredLabelIds[0], ALL_CLIENTS);
    assert.equal(mapped.managedLabelIds.includes(ALL_CLIENTS), false);
  }
});

test("[CL5][4.21] no funding-source label is ever required or managed", () => {
  const mapped = mapCase({
    location: "New York",
    insurance_primary: "Aetna",
    n1_what_type_of_insurance: "Medicaid FFS",
    case_status: "Warm",
    staffing_status: "Staffed 97153",
    specific_home_location: "Child's House"
  });
  assert.deepEqual(mapped.requiredLabelIds, [ALL_CLIENTS, NY_CLIENT, HOME, ACTIVE_CLIENT, STAFFED_97153]);
  assert.deepEqual(
    byNumber(mapped.managedLabelIds),
    byNumber([
      NY_CLIENT,
      NJ_CLIENT,
      CO_CLIENT,
      HOME,
      ACTIVE_CLIENT,
      IN_ACTIVE_CLIENT,
      SERVICES_97151,
      STAFFED_97153,
      X_97153,
      ...RETIRED_STAFFING
    ])
  );
});

test("[BR19][4.21] every label a Case can require is sendable, the parent label is never used, and labelIds stays the required list", () => {
  const locations = ["", "New York", "New Jersey", "Colorado"];
  const homes = ["", "Child's House", "More Than One Location", "Other Location"];
  const statuses = ["", "Warm", "Cold"];
  const staffing = ["", "97151 Services", "Staffed 97153", "X 97153", "Pending 97151 Services"];
  for (const location of locations) {
    for (const specific_home_location of homes) {
      for (const case_status of statuses) {
        for (const staffing_status of staffing) {
          const mapped = mapCase({ location, specific_home_location, case_status, staffing_status });
          assert.equal(mapped.requiredLabelIds.length > 0, true);
          assert.equal(new Set(mapped.requiredLabelIds).size, mapped.requiredLabelIds.length);
          for (const id of mapped.requiredLabelIds) {
            assert.equal(CENTRAL_REACH_SENDABLE_LABEL_IDS.includes(id), true, `${id} is sendable`);
          }
          assert.equal(mapped.requiredLabelIds.includes(STAFFING_PARENT), false);
          assert.equal(mapped.managedLabelIds.includes(STAFFING_PARENT), false);
          assert.deepEqual(mapped.labelIds, mapped.requiredLabelIds);
        }
      }
    }
  }
});
