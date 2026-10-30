import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { employeeCreateFeatures, SANDBOX_HUBSPOT_PORTAL_ID } from "../../lib/config.mjs";

describe("employeeCreateFeatures", () => {
  it("allows a create on the sandbox portal when both flags are unset", () => {
    assert.deepEqual(employeeCreateFeatures({ portalId: SANDBOX_HUBSPOT_PORTAL_ID }), {
      allowEmployeeCreate: true,
      putOnlyMode: false
    });
  });

  it("blocks a create when the portal is not the sandbox and both flags are unset", () => {
    assert.deepEqual(employeeCreateFeatures({ portalId: "50317927" }), {
      allowEmployeeCreate: false,
      putOnlyMode: true
    });
  });

  it("keeps an explicit block on the sandbox portal", () => {
    assert.deepEqual(
      employeeCreateFeatures({
        portalId: SANDBOX_HUBSPOT_PORTAL_ID,
        allowEmployeeCreate: "false",
        putOnlyMode: "true"
      }),
      { allowEmployeeCreate: false, putOnlyMode: true }
    );
  });

  it("keeps an explicit allow on any other portal", () => {
    assert.deepEqual(
      employeeCreateFeatures({
        portalId: "50317927",
        allowEmployeeCreate: "true",
        putOnlyMode: "false"
      }),
      { allowEmployeeCreate: true, putOnlyMode: false }
    );
  });
});
