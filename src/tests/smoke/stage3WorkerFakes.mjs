// Fakes for the Stage 3 worker tests (lane B: rows 3.7, 3.8, 3.9, 3.16, 3.18 and the worker side
// of the label sender). Nothing here calls a live service.
// The records hold only properties the Stage 4 and 5 mapping rows do not remap, so these tests
// stay true while the mappings change.
import { getState, useStateContainer } from "../../lib/cosmosState.mjs";
import {
  SANDBOX_PORTAL,
  clientWorkflowDeps,
  employeeWorkflowDeps,
  fakeCentralReach,
  hubspotRecord,
  hubspotAnswer,
  memoryContainer
} from "./stage2Fakes.mjs";

export const CASE_LINK = { pk: "sync:client", id: `${SANDBOX_PORTAL}:deal-1` };
export const BT_LINK = { pk: "sync:employee", id: `${SANDBOX_PORTAL}:bt_rbt:HS1` };
export const BCBA_LINK = { pk: "sync:employee", id: `${SANDBOX_PORTAL}:bcba:HS2` };

export const METADATA_PUT = "PUT /contacts/{id}/metadata/{fieldId}";
export const METADATA_DELETE = "DELETE /contacts/{id}/metadata/{fieldId}";
export const EMPLOYEE_GET = "GET /contacts/employee/{id}";

// One in-memory Cosmos container and one fake CentralReach (HTTP level) per test.
export function setup() {
  const container = memoryContainer();
  useStateContainer(container);
  const cr = fakeCentralReach();
  return { container, cr };
}

// Guide stored values: phi_gender is male or female; severity_level_clinical is Level 1, 2 or 3.
export function stage3Case(properties = {}) {
  return hubspotRecord({
    hs_object_id: "deal-1",
    enter_in_central_reach: "Yes",
    client_id_number: "",
    dealstage: "1",
    phi_first_name__cloned_: "Alex",
    phi_last_name: "Rivera",
    phi_date_of_birth: "2017-01-14",
    phi_gender: "male",
    severity_level_clinical: "Level 1",
    policy_holder_name: "Jordan Rivera",
    // C10 (item 6): no Care Coordinator owner, so 138851 is a blank like any blank text field.
    coordinator_export_status: "no_owner",
    last_sync_status: "",
    last_sync_error: "",
    ...properties
  });
}

// Guide stored value: entered_in_centralreach "Yes - Active" stores Yes.
export function stage3Bt(properties = {}) {
  return hubspotRecord({
    hs_object_id: "HS1",
    entered_in_centralreach: "Yes",
    employee_id: "",
    first_name: "Alex",
    last_name: "Rivera",
    email: "alex@example.com",
    date_of_birth: "1990-10-20",
    workday_id: "1000001",
    active_cases_count: "2",
    btrbt_in_cr_checklist: "",
    last_sync_status: "",
    last_sync_error: "",
    ...properties
  });
}

// A BCBA that is already linked, so a run checks the two names only.
export function stage3Bcba(properties = {}) {
  return hubspotRecord({
    hs_object_id: "HS2",
    entered_in_centralreach: "Yes",
    employee_id: "5002",
    first_name: "Pat",
    last_name: "Morgan",
    // B5 (item 1): the BCBA date of birth is `date_of_birth`, text typed as M/D/YYYY.
    date_of_birth: "3/2/1985",
    workday_id: "1000002",
    medicaid_id__ny: "",
    medicaid_id__nj: "",
    medicaid_id__co: "",
    bcba_in_cr_checklist: "",
    last_sync_status: "",
    last_sync_error: "",
    ...properties
  });
}

// A CentralReach contact that existed before the run. It holds one label staff added by hand
// (777), so its label read is not empty: from row L.2 on, an empty read for a contact the
// integration did not create is a failed read.
export const STAFF_LABEL = 777;

export function seedClient(cr, contactId, externalSystemId = "deal-1") {
  cr.clients.set(contactId, { contactId, externalSystemId, primaryEmail: null });
  cr.labels.set(contactId, [STAFF_LABEL]);
}

export function seedEmployee(cr, contactId, externalSystemId) {
  cr.employees.set(contactId, { contactId, externalSystemId, primaryEmail: null });
  cr.labels.set(contactId, [STAFF_LABEL]);
}

// Row 3.13: a CentralReach employee whose read holds all twelve core fields under `contact`, as
// the live read does (API test of 2026-11-20). The shared fake answers GET /contacts/employee/{id}
// with everything stored here, and its PUT does not store the values sent (it only blanks a text
// key the body leaves out, as the live PUT does), so a test can tell a value that was sent back
// from the read apart from a value the worker made.
export const STORED_EMPLOYEE = Object.freeze({
  firstName: "Stored",
  lastName: "Person",
  gender: "Female",
  dateOfBirth: "1988-04-09T00:00:00.0000000Z",
  addressLine1: "9 Stored Road",
  addressLine2: "Apt 4B",
  city: "Albany",
  stateProvince: "NY",
  zipPostalCode: "12207",
  phoneCell: "5185550100"
});

export function seedStoredEmployee(cr, contactId, externalSystemId, overrides = {}) {
  cr.employees.set(contactId, {
    contactId,
    externalSystemId,
    primaryEmail: "stored@example.com",
    ...STORED_EMPLOYEE,
    ...overrides
  });
  cr.labels.set(contactId, [STAFF_LABEL]);
}

// Row 3.15: a clock the test moves. Passed to the worker as `dependencies.now`.
export function testClock(startIso = "2026-11-20T15:00:00.000Z") {
  const clock = {
    ms: Date.parse(startIso),
    now: () => clock.ms,
    advanceSeconds: (seconds) => {
      clock.ms += seconds * 1000;
    }
  };
  return clock;
}

// A Case linked to CentralReach client 2001, a BT/RBT linked to employee 5001 and a BCBA linked
// to employee 5002. Each CentralReach contact holds the record's own External System ID.
export function linkedCase(cr, properties = {}) {
  seedClient(cr, "2001");
  return stage3Case({ client_id_number: "2001", ...properties });
}

export function linkedBt(cr, properties = {}) {
  seedEmployee(cr, "5001", "1000001");
  return stage3Bt({ employee_id: "5001", ...properties });
}

export function linkedBcba(cr, properties = {}) {
  seedEmployee(cr, "5002", "1000002");
  return stage3Bcba(properties);
}

// What a run did, counted from the fakes: `mark()` before the run, `since(mark)` after it.
export function counters({ container, cr, record }) {
  const mark = () => ({
    crCalls: cr.calls.length,
    hubspotWrites: record.writes.length,
    cosmos: container.log.length
  });
  const since = (start) => {
    const crCalls = cr.calls.slice(start.crCalls);
    const cosmos = container.log.slice(start.cosmos);
    return {
      crCalls,
      crWrites: crCalls.filter((call) => call.method !== "GET"),
      hubspotWrites: record.writes.slice(start.hubspotWrites),
      // Every Cosmos write that is not the record lease or the create lease.
      stateWrites: cosmos.filter((entry) => {
        const pk = entry.doc?.pk ?? entry.pk;
        return !String(pk).startsWith("sync-lock:") && !String(pk).startsWith("create-lock:");
      })
    };
  };
  return { mark, since };
}

// HubSpot reads and link record reads of one run. Only HubSpot is faked; getState is the real one.
export function countingClientDeps({ record, logs = [], associations }) {
  const counts = { caseReads: 0, associationReads: 0, stateReads: 0 };
  const base = clientWorkflowDeps({ record, logs, ...(associations ? { associations } : {}) });
  return {
    counts,
    deps: {
      ...base,
      getDealById: async (...args) => {
        counts.caseReads += 1;
        return base.getDealById(...args);
      },
      listAssociations: async (...args) => {
        counts.associationReads += 1;
        return base.listAssociations(...args);
      },
      getState: async (input) => {
        counts.stateReads += 1;
        return getState(input);
      }
    }
  };
}

export function countingEmployeeDeps({ record, logs = [] }) {
  const counts = { recordReads: 0, stateReads: 0 };
  const base = employeeWorkflowDeps({ record, logs });
  const read = async (id, type, names) => {
    counts.recordReads += 1;
    return hubspotAnswer(record.read(), names);
  };
  return {
    counts,
    deps: {
      ...base,
      getBtRbtRecordById: read,
      getBcbaRecordById: read,
      getState: async (input) => {
        counts.stateReads += 1;
        return getState(input);
      }
    }
  };
}

// The label sender's answer from row L.3 on (contract P.5 (e) in src/lib/centralReachClient.mjs):
// labelResult carries postedLabelIds, postedAt and confirmed. Lane L builds that; the sender in
// this lane's worktree does not return those fields yet. So the label tests fake the sender with
// this function and say so. `answers` is one labelResult per call, in order; the last one repeats.
export function fakeLabelSender(answers) {
  const calls = [];
  return {
    calls,
    updateClientMetadata: async (contactId, values, options) => {
      const labelResult = answers[Math.min(calls.length, answers.length - 1)];
      calls.push({ contactId: String(contactId), values, options });
      if (labelResult instanceof Error) {
        throw labelResult;
      }
      return {
        labelResult,
        updatedCount: Object.keys(values || {}).length,
        failedCount: 0,
        failedFieldIds: [],
        failedFields: []
      };
    }
  };
}

export const POSTED_UNCONFIRMED = Object.freeze({
  operation: "updated",
  postedLabelIds: [1052618, 1052643],
  postedAt: "2026-11-20T15:00:00.000Z",
  confirmed: false
});
export const POSTED_CONFIRMED = Object.freeze({ ...POSTED_UNCONFIRMED, confirmed: true });
export const NOTHING_POSTED_CONFIRMED = Object.freeze({
  operation: "skip_present",
  postedLabelIds: null,
  postedAt: null,
  confirmed: true
});
export const NOTHING_POSTED_UNCONFIRMED = Object.freeze({
  ...NOTHING_POSTED_CONFIRMED,
  confirmed: false
});
