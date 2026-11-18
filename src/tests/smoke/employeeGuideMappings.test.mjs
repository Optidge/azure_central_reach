import assert from "node:assert/strict";
import { describe, it } from "node:test";
import axios from "axios";
import { buildEmployeePayload } from "../../mappings/employees/buildEmployeePayload.mjs";
import { validateEmployeePayload } from "../../mappings/employees/validateEmployeePayload.mjs";
import {
  buildEmployeePayloadForContactId,
  createCentralReachClient,
  createOrUpdateEmployee
} from "../../lib/centralReachClient.mjs";

// Guide [G17], [GER-BCBA] and [GER-BT]: a filled workday_id is the External System ID.
// A blank workday_id sends the HubSpot record ID as a temporary External System ID.
const config = { hubspot: { hubspotPortalId: "1", btRbtObjectTypeId: "2-a", bcbaObjectTypeId: "2-b" } };

function mapEmployee(employeeType, properties) {
  return buildEmployeePayload({
    employeeType,
    config,
    record: { id: "9001", properties: { hs_object_id: "9001", ...properties } }
  }).employeePayload;
}

describe("employee External System ID", () => {
  it("BT/RBT sends workday_id, not the HubSpot record id", () => {
    const payload = mapEmployee("bt_rbt", { workday_id: " 1234567 ", bt_name: "Alex Rivera" });
    assert.equal(payload.externalSystemId, "1234567");
  });

  it("BCBA sends workday_id, not the HubSpot record id", () => {
    const payload = mapEmployee("bcba", { workday_id: "7654321", bcba_name: "Pat Morgan" });
    assert.equal(payload.externalSystemId, "7654321");
  });

  it("[G17] a blank workday_id sends the HubSpot record ID for either type", () => {
    for (const type of ["bt_rbt", "bcba"]) {
      const payload = mapEmployee(type, {
        workday_id: "  ",
        first_name: "Alex",
        last_name: "Rivera"
      });
      assert.equal(payload.externalSystemId, "9001");
    }
  });

  it("[G17] an unlinked employee with a blank workday_id still validates for a create", () => {
    const payload = mapEmployee("bcba", {
      workday_id: "",
      first_name: "Pat",
      last_name: "Morgan",
      ucaba_email_address: "pat@work.test",
      date_of_birth: "1990-10-20"
    });
    const result = validateEmployeePayload(payload, { linked: false, emailField: "ucaba_email_address" });
    assert.equal(result.isValid, true);
    assert.equal(payload.externalSystemId, "9001");
  });

  it("a linked employee with a blank workday_id still validates for an update", () => {
    const payload = mapEmployee("bcba", {
      first_name: "Pat",
      last_name: "Morgan"
    });
    assert.equal(validateEmployeePayload(payload, { linked: true }).isValid, true);
  });

  // Central Reach returns 400 when an update sends a different External System ID (tested
  // 2026-11-16), so a linked update always sends the id CR already holds.
  it("on a linked update the id Central Reach holds is sent, even when workday_id differs", () => {
    const result = buildEmployeePayloadForContactId(
      { externalSystemId: "1234567", firstName: "Alex" },
      { externalSystemId: "9001" }
    );
    assert.equal(result.payload.externalSystemId, "9001");
    assert.equal(result.preservedExternalSystemId, true);
    assert.equal(result.externalSystemIdMismatch, true);
  });

  it("on a linked update a matching workday_id is not a mismatch", () => {
    const result = buildEmployeePayloadForContactId(
      { externalSystemId: "1234567" },
      { externalSystemId: "1234567" }
    );
    assert.equal(result.payload.externalSystemId, "1234567");
    assert.equal(result.externalSystemIdMismatch, false);
  });

  it("on a linked update the workday_id is sent when Central Reach holds no id", () => {
    const result = buildEmployeePayloadForContactId({ externalSystemId: "1234567" }, {});
    assert.equal(result.payload.externalSystemId, "1234567");
    assert.equal(result.externalSystemIdMismatch, false);
  });

  it("on a linked update a blank workday_id keeps the id Central Reach holds", () => {
    const result = buildEmployeePayloadForContactId({ firstName: "Alex" }, { externalSystemId: "1234567" });
    assert.equal(result.payload.externalSystemId, "1234567");
    assert.equal(result.preservedExternalSystemId, true);
    assert.equal(result.externalSystemIdMismatch, false);
  });

  it("an unlinked employee with no External System ID makes no Central Reach call", async () => {
    const originalAdapter = axios.defaults.adapter;
    let calls = 0;
    axios.defaults.adapter = async () => {
      calls += 1;
      throw new Error("no Central Reach call expected");
    };
    try {
      await assert.rejects(
        createOrUpdateEmployee({
          payload: { firstName: "Alex" },
          employeeType: "bt_rbt",
          allowEmployeeCreate: true,
          putOnlyMode: false
        }),
        { code: "CR_EXTERNAL_ID_REQUIRED" }
      );
      assert.equal(calls, 0);
    } finally {
      axios.defaults.adapter = originalAdapter;
    }
  });
});

// Guide [GER-BT], row "Active Case Load" (field id confirmed by Zeke, 2026-11-16): display-only CR
// metadata 147882 from active_cases_count. Zero is a valid value (requirement 10).
describe("BT/RBT Active Case Count", () => {
  const metadataFor = (properties) =>
    buildEmployeePayload({
      employeeType: "bt_rbt",
      config,
      record: { id: "9001", properties: { hs_object_id: "9001", bt_name: "Alex Rivera", ...properties } }
    }).metadataValues;

  it("sends active_cases_count to metadata field 147882", () => {
    assert.equal(metadataFor({ active_cases_count: "3" })["147882"], "3");
  });

  it("sends zero as a value, not as a blank", () => {
    assert.equal(metadataFor({ active_cases_count: 0 })["147882"], "0");
    assert.equal(metadataFor({ active_cases_count: "0" })["147882"], "0");
  });

  it("sends nothing when the count is blank", () => {
    assert.equal("147882" in metadataFor({ active_cases_count: "" }), false);
  });

  it("is not sent for a BCBA", () => {
    const metadata = buildEmployeePayload({
      employeeType: "bcba",
      config,
      record: { id: "9002", properties: { bcba_name: "Pat Morgan", active_cases_count: "3" } }
    }).metadataValues;
    assert.equal("147882" in metadata, false);
  });
});

// Central Reach requires a date of birth to create an employee. Both employee objects use the
// HubSpot property date_of_birth (Zeke, 2026-11-16).
describe("employee date of birth", () => {
  it("BCBA and BT/RBT read date_of_birth", () => {
    assert.equal(
      mapEmployee("bcba", { bcba_name: "Pat Morgan", date_of_birth: "1990-10-20" }).dateOfBirth,
      "1990-10-20"
    );
    assert.equal(
      mapEmployee("bt_rbt", { bt_name: "Alex Rivera", date_of_birth: "1990-10-20" }).dateOfBirth,
      "1990-10-20"
    );
  });

  it("BCBA does not read dob", () => {
    assert.equal(mapEmployee("bcba", { bcba_name: "Pat Morgan", dob: "1990-10-20" }).dateOfBirth, null);
  });
});

// Zeke, 2026-11-16: a blank date of birth must not block a create, so the create call sends the
// placeholder 2000-01-01. Temporary, pending a decision with Danny. An update never sends it.
describe("employee create date of birth placeholder", () => {
  async function runWithCentralReach(handler, run) {
    const originalAdapter = axios.defaults.adapter;
    const requests = [];
    axios.defaults.adapter = async (requestConfig) => {
      const request = {
        method: String(requestConfig.method || "").toUpperCase(),
        url: String(requestConfig.url || ""),
        body: requestConfig.data ? safeParse(requestConfig.data) : null
      };
      requests.push(request);
      const reply = handler(request);
      if (reply.status >= 400) {
        const error = new Error(`status ${reply.status}`);
        error.response = { status: reply.status, data: reply.data || {} };
        throw error;
      }
      return { status: reply.status, data: reply.data || {}, headers: {}, config: requestConfig };
    };
    try {
      createCentralReachClient({
        centralReach: {
          baseUrl: "https://cr.invalid",
          apiKey: "test",
          tokenUrl: "https://cr.invalid/connect/token",
          clientId: "test",
          clientSecret: "test"
        }
      });
      const result = await run();
      return { result, requests };
    } finally {
      axios.defaults.adapter = originalAdapter;
    }
  }

  function safeParse(value) {
    try {
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch {
      return null;
    }
  }

  const handler = (request) => {
    if (request.url.includes("/connect/token")) {
      return { status: 200, data: { access_token: "t", expires_in: 3600 } };
    }
    if (request.method === "PUT") {
      return { status: 404 };
    }
    return { status: 200, data: { contactId: 555 } };
  };
  const create = (payload) =>
    createOrUpdateEmployee({
      payload,
      employeeType: "bcba",
      allowEmployeeCreate: true,
      putOnlyMode: false
    });

  it("a create with a blank date of birth sends 2000-01-01 and reports it", async () => {
    const { result, requests } = await runWithCentralReach(handler, () =>
      create({ externalSystemId: "1234567", firstName: "Pat", lastName: "Morgan", dateOfBirth: null })
    );
    const post = requests.find((item) => item.method === "POST" && item.url.endsWith("/contacts/employee"));
    assert.equal(post.body.dateOfBirth, "2000-01-01");
    assert.equal(result.operation, "create");
    assert.equal(result.usedDefaultDateOfBirth, true);
  });

  it("a create with a date of birth sends that date", async () => {
    const { result, requests } = await runWithCentralReach(handler, () =>
      create({
        externalSystemId: "1234567",
        firstName: "Pat",
        lastName: "Morgan",
        dateOfBirth: "1990-10-20"
      })
    );
    const post = requests.find((item) => item.method === "POST" && item.url.endsWith("/contacts/employee"));
    assert.equal(post.body.dateOfBirth, "1990-10-20");
    assert.equal(result.usedDefaultDateOfBirth, false);
  });

  it("[G17] an employee create does not use PUT as a lookup", async () => {
    const { requests } = await runWithCentralReach(handler, () =>
      create({ externalSystemId: "1234567", firstName: "Pat", lastName: "Morgan", dateOfBirth: null })
    );
    assert.equal(requests.some((item) => item.method === "PUT"), false);
    const post = requests.find((item) => item.method === "POST" && item.url.endsWith("/contacts/employee"));
    assert.equal(post.body.dateOfBirth, "2000-01-01");
  });
});
