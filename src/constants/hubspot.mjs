export const HUBSPOT_OBJECTS = {
  DEAL: "deal",
  CONTACT: "contact",
  BT_RBT: "bt_rbt",
  BCBA: "bcba"
};

export const HUBSPOT_DEAL_PROPERTIES = {
  STAGE: "dealstage",
  PIPELINE: "pipeline"
};

export const HUBSPOT_EMPLOYEE_TYPES = {
  BT_RBT: "bt_rbt",
  BCBA: "bcba"
};

export const HUBSPOT_EMPLOYEE_TYPE_SET = new Set(Object.values(HUBSPOT_EMPLOYEE_TYPES));

// Guide Requirement 2: skip a Case in these Client Pipeline stages for create and update,
// regardless of Active status or CR ID. Same ids in production 50317927 and sandbox 52311591
// (sandbox read 2026-11-16).
export const CASE_EXCLUDED_STAGE_IDS = Object.freeze([
  "1383894301", // Prior Service Cleanup
  "1383894303", // Prior In Process Cleanup
  "1383894302", // Contact Only Cleanup
  "1332962645" // Lost in the Shuffle
]);

// Guide Requirement 1 entry gate. Case is a multi-checkbox that must contain Yes.
// BCBA and BT/RBT store exactly Yes (BT/RBT "Yes - Generic" and "No- Made Inactive" do not count).
export const CASE_ENTRY_PROPERTY = "enter_in_central_reach";
export const EMPLOYEE_ENTRY_PROPERTY = "entered_in_centralreach";
export const ENTRY_YES_VALUE = "Yes";
export const TEST_RECORD_PROPERTY = "test_record";
