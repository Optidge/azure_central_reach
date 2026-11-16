import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { employeeCreateFeatures } from "../../lib/config.mjs";

// Guide Requirement 1 and the tracker's slice 1a: Central Reach has no sandbox, so an employee
// create is a production write on every HubSpot portal. It needs both settings stated on purpose.
describe("employeeCreateFeatures", () => {
  it("blocks a create when both flags are unset, on any portal", () => {
    assert.deepEqual(employeeCreateFeatures(), {
      allowEmployeeCreate: false,
      putOnlyMode: true
    });
    assert.deepEqual(employeeCreateFeatures({ allowEmployeeCreate: undefined, putOnlyMode: undefined }), {
      allowEmployeeCreate: false,
      putOnlyMode: true
    });
  });

  it("blocks a create when only one flag is set", () => {
    assert.deepEqual(employeeCreateFeatures({ allowEmployeeCreate: "true" }), {
      allowEmployeeCreate: true,
      putOnlyMode: true
    });
    assert.deepEqual(employeeCreateFeatures({ putOnlyMode: "false" }), {
      allowEmployeeCreate: false,
      putOnlyMode: false
    });
  });

  it("allows a create only when both flags say so", () => {
    assert.deepEqual(employeeCreateFeatures({ allowEmployeeCreate: "true", putOnlyMode: "false" }), {
      allowEmployeeCreate: true,
      putOnlyMode: false
    });
  });

  it("keeps an explicit block", () => {
    assert.deepEqual(employeeCreateFeatures({ allowEmployeeCreate: "false", putOnlyMode: "true" }), {
      allowEmployeeCreate: false,
      putOnlyMode: true
    });
  });
});
