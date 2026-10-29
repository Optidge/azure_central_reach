# WS.1 schema diff: production 50317927, sandbox 50850427, CentralReach catalog

**Generated:** 2026-10-28 (America/Chicago).
**Scope:** Definitions only. Property definitions, association label definitions, CentralReach metadata field ids, and CentralReach org label ids. No CRM record values are in this file.
**Status:** Definition diff. This does not verify the HubSpot or CentralReach integration. Fixes belong to WS.2.

## Two separate portals

| Portal | Role | HubSpot CLI account | Case | BCBA | BT/RBT |
| --- | --- | --- | --- | --- | --- |
| 50317927 | Production | `united-care-aba` | `0-3` | `2-48354212` | `2-48354559` |
| 50850427 | Sandbox (developer test account) | `UnitedCare_Test_Integration` | `0-3` | `2-55656302` | `2-55656309` |

Object type ids and association type ids stay portal-specific. Do not copy a production type id into sandbox settings or into `src/`. The same label name has a different type id on each portal. The `/crm/v3/schemas` read on both portals confirmed the custom object ids above.

## Findings

1. **Staffing trigger names.** All five exist in production as calculated, read-only Case text. `supervising_bcba_name` and `ia_bcba_name` are missing in sandbox. `reassessment_bcba_name`, `current_primary_bt`, and `current_primary_bt_2` exist in sandbox as writable text. The code's `supervising_bcba` exists on both portals as plain text. `initial_assessment_bcba` exists on both and is calculated only in production.
2. **Staffing association labels.** Production has all five names. Sandbox has RE BCBA, Supervising BCBA, Primary BT 1, and Primary BT 2 with sandbox type ids. Sandbox has no IA BCBA label. Its `Initial Assessment` label (98 Case→BCBA) is a different name and is not treated as a match. Sandbox Primary BT 1 and 2 exist only in the Case→BT/RBT direction.
3. **Fetch-list names production does not have.** Case: `email`, `phone`, `phone_number__second_`, `guardian_first_name`, `guardian_last_name`, `location_central_reach`, plus the writeback fields `last_sync_*` and `central_reach_link_to_client`. BCBA: `date_of_birth`, `home_apt`, `work_email`, plus `integration_last_write`, `updated_by_integration`, `last_sync_*`, and `central_reach_record_link`. BT/RBT: `integration_last_write`, `updated_by_integration`, `last_sync_*`, and `central_reach_link_to_rt_rbt`. BT/RBT `postal_code` exists on neither portal's BT/RBT object. None of these are archived in production.
4. **Calculated in production, writable in sandbox.** Case `location`, `referral_source`, the staffing name rollups, and `total_hours_bt1bt2_work_schedule`. BCBA `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home`, `employee_phone`. BT/RBT `street_home`, `location_city`, `location_home`, `postal_code_home`, `date_of_birth`, `employee_phone`, `gender`. Production returned a `calculationFormula` only for the three `total_hours_*` properties. The formula on `total_hours_bt1bt2_work_schedule` is the literal `1 + 1`.
5. **Option lists that change stored values.** `allergies` stores `Confirmed` / `Denial` in production and `Yes (Confirmed)` / `No (Denial)` in sandbox. `case_status` in production is `Active`→`Warm`, `Inactive`→`Cold`. Sandbox has `Warm`, `In Limbo`, `Cold`. `severity_level_clinical` is a 3-option select in production and a 5-option radio in sandbox. `insurance_2` is missing 9 Carelon options in sandbox. `n1_what_type_of_insurance` and `n2_what_type_of_insurance` have 6 options in production and 3 in sandbox.
6. **Comorbid and maladaptive.** `does_your_child_have_any_other_comorbid_diagnoses_`, `comorbid_diagnosis__clinical`, and `maladaptive_behaviors__clinical` were all still active on production at this read. The mapper is unchanged.
7. **Sensitive tier.** Eight Case fetch-list properties are `sensitive` in production and `non_sensitive` in sandbox, as expected for a developer test account.
8. **CentralReach.** Every label id and metadata field id in `centralReach.mjs` is in the live catalog, on the expected contact type, with a matching metadata type. The live org label id set is identical to the 10/27 v3 export. `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS` uses id 138703 for both the BT/RBT and the BCBA record link. The CentralReach credentials are the ones in `central_reach_test_integration/.env`. This diff does not establish whether that org is the one production will write to.

## Commands

Every HubSpot read was a GET through the HubSpot CLI. None returned 403. Each object was also read with `dataSensitivity=sensitive`, `dataSensitivity=highly_sensitive`, and `archived=true`, because the default list omits sensitive and archived properties.

Portal 50317927 (account `united-care-aba`):

```bash
hs api /crm/v3/properties/0-3 -a united-care-aba --json
hs api "/crm/v3/properties/0-3?dataSensitivity=sensitive" -a united-care-aba --json
hs api "/crm/v3/properties/0-3?dataSensitivity=highly_sensitive" -a united-care-aba --json
hs api "/crm/v3/properties/0-3?archived=true" -a united-care-aba --json
hs api /crm/v3/properties/0-1 -a united-care-aba --json
hs api "/crm/v3/properties/0-1?dataSensitivity=sensitive" -a united-care-aba --json
hs api "/crm/v3/properties/0-1?dataSensitivity=highly_sensitive" -a united-care-aba --json
hs api "/crm/v3/properties/0-1?archived=true" -a united-care-aba --json
hs api /crm/v3/properties/2-48354212 -a united-care-aba --json
hs api "/crm/v3/properties/2-48354212?dataSensitivity=sensitive" -a united-care-aba --json
hs api "/crm/v3/properties/2-48354212?dataSensitivity=highly_sensitive" -a united-care-aba --json
hs api "/crm/v3/properties/2-48354212?archived=true" -a united-care-aba --json
hs api /crm/v3/properties/2-48354559 -a united-care-aba --json
hs api "/crm/v3/properties/2-48354559?dataSensitivity=sensitive" -a united-care-aba --json
hs api "/crm/v3/properties/2-48354559?dataSensitivity=highly_sensitive" -a united-care-aba --json
hs api "/crm/v3/properties/2-48354559?archived=true" -a united-care-aba --json
hs api /crm/v4/associations/0-3/2-48354212/labels -a united-care-aba --json
hs api /crm/v4/associations/2-48354212/0-3/labels -a united-care-aba --json
hs api /crm/v4/associations/0-3/2-48354559/labels -a united-care-aba --json
hs api /crm/v4/associations/2-48354559/0-3/labels -a united-care-aba --json
hs api /crm/v3/schemas -a united-care-aba --json
```

Portal 50850427 (account `UnitedCare_Test_Integration`):

```bash
hs api /crm/v3/properties/0-3 -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/0-3?dataSensitivity=sensitive" -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/0-3?dataSensitivity=highly_sensitive" -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/0-3?archived=true" -a UnitedCare_Test_Integration --json
hs api /crm/v3/properties/0-1 -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/0-1?dataSensitivity=sensitive" -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/0-1?dataSensitivity=highly_sensitive" -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/0-1?archived=true" -a UnitedCare_Test_Integration --json
hs api /crm/v3/properties/2-55656302 -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/2-55656302?dataSensitivity=sensitive" -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/2-55656302?dataSensitivity=highly_sensitive" -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/2-55656302?archived=true" -a UnitedCare_Test_Integration --json
hs api /crm/v3/properties/2-55656309 -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/2-55656309?dataSensitivity=sensitive" -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/2-55656309?dataSensitivity=highly_sensitive" -a UnitedCare_Test_Integration --json
hs api "/crm/v3/properties/2-55656309?archived=true" -a UnitedCare_Test_Integration --json
hs api /crm/v4/associations/0-3/2-55656302/labels -a UnitedCare_Test_Integration --json
hs api /crm/v4/associations/2-55656302/0-3/labels -a UnitedCare_Test_Integration --json
hs api /crm/v4/associations/0-3/2-55656309/labels -a UnitedCare_Test_Integration --json
hs api /crm/v4/associations/2-55656309/0-3/labels -a UnitedCare_Test_Integration --json
hs api /crm/v3/schemas -a UnitedCare_Test_Integration --json
```

## Staffing trigger names (Case)

Names from the 10/28 note. No other name is assumed. The Grad Permit BCBA Case field has no internal name yet and is not listed.

| Trigger name | Production Case `0-3` | Sandbox Case `0-3` | Status |
| --- | --- | --- | --- |
| `supervising_bcba_name` | string/text, calc, ro, non_sensitive | absent | confirmed in production, missing in sandbox |
| `ia_bcba_name` | string/text, calc, ro, non_sensitive | absent | confirmed in production, missing in sandbox |
| `reassessment_bcba_name` | string/text, calc, ro, non_sensitive | string/text, non_sensitive | confirmed on both |
| `current_primary_bt` | string/text, calc, ro, non_sensitive | string/text, non_sensitive | confirmed on both |
| `current_primary_bt_2` | string/text, calc, ro, non_sensitive | string/text, non_sensitive | confirmed on both |

The code still also reads `supervising_bcba` and `initial_assessment_bcba`. Their rows are in the Case table.

## Staffing association labels

Type ids are per portal. A matching label name does not mean a matching type id.

| Label | To object | Production Case→X | Production X→Case | Sandbox Case→X | Sandbox X→Case | Status |
| --- | --- | --- | --- | --- | --- | --- |
| IA BCBA | BCBA | 86 | 85 | absent | absent | confirmed in production, absent in sandbox |
| RE BCBA | BCBA | 145 | 146 | 161 | 162 | confirmed on both, type ids differ |
| Supervising BCBA | BCBA | 82 | 81 | 102 | 101 | confirmed on both, type ids differ |
| Primary BT 1 | BT/RBT | 76 | 75 | 149 | absent | confirmed on both, type ids differ |
| Primary BT 2 | BT/RBT | 143 | 144 | 147 | absent | confirmed on both, type ids differ |

All Case-side labels returned:

- Portal 50317927, Case → BCBA: 20 (unlabeled), 80 "Potential Supervising BCBA", 82 "Supervising BCBA", 86 "IA BCBA", 135 "Outgoing Supervising BCBA", 145 "RE BCBA", 153 "Potential IA BCBA", 234 "SUB BCBA (Supervising Status)", 236 "On Leave BCBA (inactive)", 286 "Previous IA BCBA", 288 "Outgoing SUB BCBA"
- Portal 50317927, Case → BT/RBT: 64 (unlabeled), 74 "Potential BT 1", 76 "Primary BT 1", 131 "Outgoing BT 1", 143 "Primary BT 2", 164 "Potential BT 2", 166 "Outgoing BT 2"
- Portal 50850427, Case → BCBA: 92 "Default", 94 (unlabeled), 96 "In Person Only", 98 "Initial Assessment", 100 "Potential", 102 "Supervising BCBA", 161 "RE BCBA"
- Portal 50850427, Case → BT/RBT: 126 "Primary BT", 128 (unlabeled), 130 "Potential", 147 "Primary BT 2", 149 "Primary BT 1"

## HubSpot property comparison

**Named by.** `D3` to `D11` are Drive map sections. `fetch` is the code fetch list (`REQUIRED_DEAL_PROPERTIES`, `BCBA_PROPERTIES`, or `BT_RBT_PROPERTIES`). `trigger` is a 10/28 staffing trigger name.
**Cells.** `type/fieldType`, then `calc` when `calculated` is true, `formula` when a `calculationFormula` came back, `ro` when the value is read-only, the `dataSensitivity`, and the option count. `absent` means not in the active, sensitive, highly sensitive, or archived lists. `archived` means only the archived list has it.
**Verdict.** `match` means type, calculated, formula, sensitivity, read-only flag, and every option (label, value, hidden, relative order) agree. Sandbox enumerations created on 10/27 number `displayOrder` from 1 and production from 0. That offset alone is not counted as a difference. `option order` means the same options in a different order. `absent in production` on a fetch-list name means production has no such property on that object.

Totals:

- Case: 29 differs, 52 match, 11 absent in production, 6 missing in sandbox.
- BCBA: 7 differs, 25 match, 10 absent in production, 2 missing in sandbox.
- BT/RBT: 3 missing in sandbox, 15 match, 9 differs, 7 absent in production, 1 absent on both.
- Contact: 1 differs, 3 match.

### Case (`0-3` on both portals)

| Internal name | Named by | Production `0-3` | Sandbox `0-3` | Verdict |
| --- | --- | --- | --- | --- |
| `allergies` | D3 fetch | enumeration/radio, non_sensitive, 2 opts | enumeration/radio, non_sensitive, 2 opts | differs: options |
| `allergies__yes__explain` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `assigned_hours` | fetch | number/number, non_sensitive | number/number, non_sensitive | match |
| `auth_end_date` | fetch | date/date, non_sensitive | date/date, non_sensitive | match |
| `auth_start_date` | fetch | date/date, non_sensitive | date/date, non_sensitive | match |
| `authorized_hours` | fetch | number/number, non_sensitive | number/number, non_sensitive | match |
| `bt_work_schedule_2_confirmed` | fetch | enumeration/radio, non_sensitive, 1 opts | enumeration/radio, non_sensitive, 1 opts | match (displayOrder starts at 0 in production, 1 in sandbox) |
| `bt_work_schedule_confirmed` | fetch | enumeration/radio, non_sensitive, 1 opts | enumeration/radio, non_sensitive, 1 opts | match (displayOrder starts at 0 in production, 1 in sandbox) |
| `btrbt_work_schedule_2_details` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `case_status` | D7 fetch | enumeration/select, non_sensitive, 2 opts | enumeration/select, non_sensitive, 3 opts | differs: options |
| `central_reach_link_to_client` | fetch | absent | string/text, non_sensitive | absent in production |
| `client_availability_completed` | fetch | enumeration/radio, non_sensitive, 1 opts | enumeration/radio, non_sensitive, 2 opts | differs: options |
| `client_id_number` | D3 | string/text, non_sensitive | string/text, non_sensitive | match |
| `client_service_hours_total` | D3 fetch | number/number, non_sensitive | number/number, non_sensitive | match |
| `comorbid_diagnosis__clinical` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `current_primary_bt` | fetch trigger | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `current_primary_bt_2` | fetch trigger | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `diagnosis_other` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `does_your_child_have_any_other_comorbid_diagnoses_` | D3 | string/text, non_sensitive | string/text, non_sensitive | match |
| `email` | fetch | absent | string/text, non_sensitive | absent in production (production has it on BCBA/BT/RBT/Contact only) |
| `enter_in_central_reach` | D3 D11 fetch | enumeration/checkbox, non_sensitive, 5 opts | enumeration/checkbox, non_sensitive, 5 opts | match |
| `finalized_client_service_hours_post_assessment` | D3 fetch | string/textarea, non_sensitive | string/text, non_sensitive | differs: type |
| `full_home_address` | D3 fetch | string/textarea, non_sensitive | string/text, non_sensitive | differs: type |
| `guardian_first_name` | fetch | absent | string/text, non_sensitive | absent in production |
| `guardian_last_name` | fetch | absent | string/text, non_sensitive | absent in production |
| `home_apt` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `hours_bt_work_schedule_1` | D3 | number/number, non_sensitive | absent | missing in sandbox |
| `hours_bt_work_schedule_2` | D3 | number/number, non_sensitive | absent | missing in sandbox |
| `hs_lastmodifieddate` | fetch | datetime/date, ro, non_sensitive | datetime/date, ro, non_sensitive | match |
| `hs_object_id` | fetch | number/number, ro, non_sensitive | number/number, ro, non_sensitive | match |
| `hubspot_owner_id` | D3 | enumeration/select, non_sensitive | enumeration/select, non_sensitive | match |
| `ia_bcba_name` | trigger | string/text, calc, ro, non_sensitive | absent | missing in sandbox |
| `ia_hours_from_the_ia` | D3 fetch | number/number, non_sensitive | number/number, non_sensitive | match |
| `if_services_will_be_in_more_than_one_location__list_the_other_address` | fetch | string/textarea, non_sensitive | string/textarea, non_sensitive | match |
| `important_information` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `initial_assessment_bcba` | fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `initial_auth_tracks` | D3 fetch | enumeration/select, non_sensitive, 2 opts | enumeration/select, non_sensitive, 2 opts | match |
| `insurance_1__other__summary` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `insurance_2` | D3 fetch | enumeration/select, non_sensitive, 13 opts | enumeration/select, non_sensitive, 4 opts | differs: options |
| `insurance_2__other__summary` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `insurance_id_1` | D3 fetch | string/text, sensitive | string/text, non_sensitive | differs: sensitivity |
| `insurance_id_2` | D3 fetch | string/text, sensitive | string/text, non_sensitive | differs: sensitivity |
| `insurance_primary` | D3 D7 fetch | enumeration/select, non_sensitive, 13 opts | enumeration/select, non_sensitive, 13 opts | differs: option order |
| `integration_last_write` | D11 fetch | datetime/date, non_sensitive | datetime/date, non_sensitive | match |
| `last_sync_at` | fetch | absent | datetime/date, non_sensitive | absent in production |
| `last_sync_error` | fetch | absent | string/textarea, non_sensitive | absent in production |
| `last_sync_hash` | fetch | absent | string/text, non_sensitive | absent in production |
| `last_sync_status` | fetch | absent | string/text, non_sensitive | absent in production |
| `location` | D7 fetch | enumeration/select, calc, ro, non_sensitive, 3 opts | enumeration/select, non_sensitive, 3 opts | differs: calculated, readOnlyValue |
| `location_central_reach` | fetch | absent | string/text, non_sensitive | absent in production |
| `location_city` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `maladaptive_behaviors__clinical` | D3 | enumeration/checkbox, non_sensitive, 13 opts | string/text, non_sensitive | differs: type, options |
| `maladaptive_behaviors__parentguardian` | D3 fetch | enumeration/checkbox, non_sensitive, 8 opts | enumeration/checkbox, non_sensitive, 8 opts | match |
| `most_recent_asd_diagnosis_date_1` | D3 fetch | date/date, non_sensitive | date/date, non_sensitive | match |
| `most_recent_asd_diagnosis_date_2` | fetch | date/date, non_sensitive | date/date, non_sensitive | match |
| `most_recent_asd_diagnosis_date_medicaid` | D3 fetch | date/date, non_sensitive | date/date, non_sensitive | match |
| `n1_what_type_of_insurance` | D7 fetch | enumeration/select, non_sensitive, 6 opts | enumeration/select, non_sensitive, 3 opts | differs: options |
| `n2_what_type_of_insurance` | D3 fetch | enumeration/select, non_sensitive, 6 opts | enumeration/select, non_sensitive, 3 opts | differs: options |
| `n97153_approved_assessment_hours_auth_req` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `npi_number` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `npi_number__commercial` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `ongoing_auth_period_start_date` | D3 fetch | date/date, non_sensitive | date/date, non_sensitive | match |
| `ongoing_autrh_period_end_date` | D3 fetch | date/date, non_sensitive | date/date, non_sensitive | match |
| `ongoing_central_reach_provider_supplier` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `phi__policy_holder_dob` | D3 fetch | date/date, sensitive | date/date, non_sensitive | differs: sensitivity |
| `phi_date_of_birth` | D3 fetch | date/date, sensitive | date/date, non_sensitive | differs: sensitivity |
| `phi_diagnosis` | D3 fetch | enumeration/radio, sensitive, 5 opts | enumeration/radio, non_sensitive, 5 opts | differs: sensitivity |
| `phi_first_name__cloned_` | D3 fetch | string/text, sensitive | string/text, non_sensitive | differs: sensitivity |
| `phi_gender` | D3 fetch | enumeration/select, sensitive, 2 opts | enumeration/select, non_sensitive, 2 opts | differs: sensitivity |
| `phi_last_name` | D3 fetch | string/text, sensitive | string/text, non_sensitive | differs: sensitivity |
| `phone` | fetch | absent | string/phonenumber, non_sensitive | absent in production (production has it on Contact only) |
| `phone_number__second_` | fetch | absent | string/text, non_sensitive | absent in production (production has it on Contact only) |
| `physician_name` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `physician_name__commercial` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `policy_holder_name` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `postal_code` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `reassessment_bcba_name` | fetch trigger | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `referral_source` | D3 fetch | enumeration/select, calc, ro, non_sensitive, 14 opts | enumeration/select, non_sensitive, 14 opts | differs: calculated, readOnlyValue |
| `referring_provider_medicaid_id` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `service__apt` | D3 | string/text, non_sensitive | string/text, non_sensitive | match |
| `service__city` | D3 | string/text, non_sensitive | string/text, non_sensitive | match |
| `service__postal_code` | D3 | string/text, non_sensitive | string/text, non_sensitive | match |
| `service__street_address` | D3 | string/text, non_sensitive | string/text, non_sensitive | match |
| `service_address__other` | D3 fetch | string/textarea, non_sensitive | string/text, non_sensitive | differs: type |
| `severity_level_clinical` | D3 fetch | enumeration/select, non_sensitive, 3 opts | enumeration/radio, non_sensitive, 5 opts | differs: type, options |
| `specific_home_location` | D3 D7 fetch | enumeration/select, non_sensitive, 3 opts | enumeration/select, non_sensitive, 4 opts | differs: options |
| `staffing_status` | D7 fetch | enumeration/select, non_sensitive, 2 opts | enumeration/select, non_sensitive, 2 opts | match |
| `stateregion` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `street_address` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `supervising_bcba` | fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `supervising_bcba_name` | trigger | string/text, calc, ro, non_sensitive | absent | missing in sandbox |
| `total_hours_bt1bt2_work_schedule` | D3 fetch | number/calculation_equation, calc, formula, ro, non_sensitive | number/number, non_sensitive | differs: type, calculated, formula, readOnlyValue |
| `total_hours_bt_12_work_schedule` | D3 | number/calculation_equation, calc, formula, ro, non_sensitive | absent | missing in sandbox |
| `total_hours_btrbt_12` | D3 | number/calculation_equation, calc, formula, ro, non_sensitive | absent | missing in sandbox |
| `updated_by_integration` | fetch | enumeration/checkbox, non_sensitive, 2 opts | bool/booleancheckbox, non_sensitive, 2 opts | differs: type |
| `work_schedule_1_details__for_location_2_other` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `work_schedule_2_details__for_location_2_other` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `work_schedule_details` | D3 fetch | string/text, non_sensitive | string/text, non_sensitive | match |

### BCBA

| Internal name | Named by | Production `2-48354212` | Sandbox `2-55656302` | Verdict |
| --- | --- | --- | --- | --- |
| `address` | D5 fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `apartment__home` | D5 fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `assign_states` | D8 fetch | enumeration/checkbox, non_sensitive, 3 opts | enumeration/checkbox, non_sensitive, 3 opts | match |
| `bcba_name` | fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `central_reach_record_link` | fetch | absent | string/text, non_sensitive | absent in production |
| `city_home` | D5 fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `city_work` | fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `co_insurance_labels` | D5 D8 fetch | enumeration/checkbox, non_sensitive, 4 opts | enumeration/checkbox, non_sensitive, 4 opts | match |
| `cr_billing_hold_label` | D8 fetch | enumeration/select, non_sensitive, 2 opts | enumeration/select, non_sensitive, 2 opts | match |
| `credentialed_insurances__ny` | D5 fetch | enumeration/checkbox, non_sensitive, 3 opts | enumeration/checkbox, non_sensitive, 3 opts | match |
| `date_of_birth` | fetch | absent | string/text, non_sensitive | absent in production (production has it on BT/RBT/Contact only) |
| `email` | fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `employee_id` | D5 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `employee_phone` | D5 fetch | string/phonenumber, calc, ro, non_sensitive | string/text, non_sensitive | differs: type, calculated, readOnlyValue |
| `entered_in_centralreach` | D5 D11 fetch | enumeration/radio, non_sensitive, 1 opts | enumeration/select, non_sensitive, 1 opts | differs: type |
| `external_system_id` | D5 | string/text, non_sensitive | string/text, non_sensitive | match |
| `first_name` | D5 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `full_name` | D5 | string/text, non_sensitive | absent | missing in sandbox |
| `gender` | D5 | enumeration/select, calc, ro, non_sensitive, 2 opts | absent | missing in sandbox |
| `gender_new` | D5 | enumeration/select, non_sensitive, 2 opts | enumeration/select, non_sensitive, 2 opts | match (displayOrder starts at 0 in production, 1 in sandbox) |
| `home_apt` | fetch | absent | string/text, non_sensitive | absent in production (production has it on Case/BT/RBT only) |
| `home_state` | fetch | enumeration/select, non_sensitive, 50 opts | enumeration/select, non_sensitive, 50 opts | match (displayOrder starts at 0 in production, 1 in sandbox) |
| `hs_lastmodifieddate` | fetch | datetime/date, ro, non_sensitive | datetime/date, ro, non_sensitive | match |
| `hs_object_id` | fetch | number/number, ro, non_sensitive | number/number, ro, non_sensitive | match |
| `hubspot_owner_id` | D5 | enumeration/select, non_sensitive | enumeration/select, non_sensitive | match |
| `integration_last_write` | fetch | absent | datetime/date, non_sensitive | absent in production (production has it on Case only) |
| `last_name` | D5 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `last_sync_at` | fetch | absent | datetime/date, non_sensitive | absent in production |
| `last_sync_error` | fetch | absent | string/textarea, non_sensitive | absent in production |
| `last_sync_hash` | fetch | absent | string/text, non_sensitive | absent in production |
| `last_sync_status` | fetch | absent | string/text, non_sensitive | absent in production |
| `lba_licensure__ny` | D8 fetch | enumeration/select, non_sensitive, 4 opts | enumeration/select, non_sensitive, 4 opts | match |
| `location` | D8 fetch | enumeration/checkbox, non_sensitive, 5 opts | enumeration/checkbox, non_sensitive, 5 opts | match |
| `medicaid_id__co` | D5 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `medicaid_id__nj` | D5 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `medicaid_id__ny` | D5 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `nj_insurance_labels` | D5 D8 fetch | enumeration/checkbox, non_sensitive, 2 opts | enumeration/checkbox, non_sensitive, 2 opts | match |
| `ny_insurance_labels` | D5 D8 fetch | enumeration/checkbox, non_sensitive, 4 opts | enumeration/checkbox, non_sensitive, 4 opts | match |
| `postal_code_home` | D5 fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `state_home` | D5 fetch | enumeration/select, calc, ro, non_sensitive, 50 opts | enumeration/select, non_sensitive, 50 opts | differs: calculated, readOnlyValue |
| `ucaba_email_address` | D5 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `updated_by_integration` | fetch | absent | bool/booleancheckbox, non_sensitive, 2 opts | absent in production (production has it on Case only) |
| `work_email` | fetch | absent | string/text, non_sensitive | absent in production (production has it on Contact only) |
| `work_status` | D5 fetch | enumeration/select, non_sensitive, 2 opts | enumeration/select, non_sensitive, 2 opts | match |

### BT/RBT

| Internal name | Named by | Production `2-48354559` | Sandbox `2-55656309` | Verdict |
| --- | --- | --- | --- | --- |
| `active_cases_count` | D6 | number/number, non_sensitive | absent | missing in sandbox |
| `apartment__work` | D6 | string/text, non_sensitive | string/text, non_sensitive | match |
| `bt_name` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `bt_rbt_type` | D9 fetch | enumeration/select, non_sensitive, 3 opts | enumeration/select, non_sensitive, 2 opts | differs: options |
| `bt_to_rbt_path` | D9 | enumeration/select, non_sensitive, 1 opts | absent | missing in sandbox |
| `central_reach_link_to_rt_rbt` | fetch | absent | string/text, non_sensitive | absent in production |
| `city__work_` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `date_of_birth` | fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `email` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `employee_id` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `employee_phone` | D6 fetch | string/phonenumber, calc, ro, non_sensitive | string/text, non_sensitive | differs: type, calculated, readOnlyValue |
| `entered_in_centralreach` | D6 D11 fetch | enumeration/radio, non_sensitive, 3 opts | enumeration/select, non_sensitive, 3 opts | differs: type |
| `external_system_id` | D6 | string/text, non_sensitive | string/text, non_sensitive | match |
| `first_name` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `gender` | D6 fetch | enumeration/select, calc, ro, non_sensitive, 2 opts | string/text, non_sensitive | differs: type, calculated, readOnlyValue, options |
| `home_apt` | fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `hs_lastmodifieddate` | fetch | datetime/date, ro, non_sensitive | datetime/date, ro, non_sensitive | match |
| `hs_object_id` | fetch | number/number, ro, non_sensitive | number/number, ro, non_sensitive | match |
| `integration_last_write` | fetch | absent | datetime/date, non_sensitive | absent in production (production has it on Case only) |
| `last_name` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `last_sync_at` | fetch | absent | datetime/date, non_sensitive | absent in production |
| `last_sync_error` | fetch | absent | string/textarea, non_sensitive | absent in production |
| `last_sync_hash` | fetch | absent | string/text, non_sensitive | absent in production |
| `last_sync_status` | fetch | absent | string/text, non_sensitive | absent in production |
| `location` | D9 fetch | enumeration/checkbox, non_sensitive, 5 opts | enumeration/checkbox, non_sensitive, 5 opts | match |
| `location_city` | D6 fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `location_home` | fetch | enumeration/select, calc, ro, non_sensitive, 3 opts | string/text, non_sensitive | differs: type, calculated, readOnlyValue, options |
| `postal_code` | fetch | absent | absent | absent on both (exists prod on Case; sandbox on Case) |
| `postal_code__work_` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `postal_code_home` | D6 fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `state__work_` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `state_home` | D6 | enumeration/select, calc, ro, non_sensitive, 50 opts | absent | missing in sandbox |
| `street_address__work_` | D6 fetch | string/text, non_sensitive | string/text, non_sensitive | match |
| `street_home` | D6 fetch | string/text, calc, ro, non_sensitive | string/text, non_sensitive | differs: calculated, readOnlyValue |
| `updated_by_integration` | fetch | absent | bool/booleancheckbox, non_sensitive, 2 opts | absent in production (production has it on Case only) |

### Contact (`0-1`), sections 3 and 5

| Internal name | Named by | Production `0-1` | Sandbox `0-1` | Verdict |
| --- | --- | --- | --- | --- |
| `contact_category` | D3 | enumeration/select, non_sensitive, 8 opts | enumeration/select, non_sensitive, 3 opts | differs: options |
| `email` | D3 D5 | string/text, non_sensitive | string/text, non_sensitive | match |
| `firstname` | D3 | string/text, non_sensitive | string/text, non_sensitive | match |
| `lastname` | D3 | string/text, non_sensitive | string/text, non_sensitive | match |

### Sensitive property counts

| Portal | Object | sensitive | highly_sensitive |
| --- | --- | --- | --- |
| 50317927 | Case `0-3` | 62 | 0 |
| 50317927 | BCBA `2-48354212` | 0 | 3 (`caqh_login`, `caqh_password`, `nygov_password`) |
| 50317927 | BT/RBT `2-48354559` | 2 | 0 |
| 50317927 | Contact `0-1` | 1 | 0 |
| 50850427 | Case `0-3` | 0 | 0 |
| 50850427 | BCBA `2-55656302` | 0 | 0 |
| 50850427 | BT/RBT `2-55656309` | 0 | 0 |
| 50850427 | Contact `0-1` | 0 | 0 |

## Option lists that differ

**Case `allergies`.** Production 2 options, sandbox 2. Format is `label=value`, listed in display order.

- Only in production: `Yes=Confirmed`, `No=Denial`
- Only in sandbox: `Yes (Confirmed)=Yes (Confirmed)`, `No (Denial)=No (Denial)`

**Case `case_status`.** Production 2 options, sandbox 3. Format is `label=value`, listed in display order.

- Only in production: `Active=Warm`, `Inactive=Cold`
- Only in sandbox: `Warm=Warm`, `In Limbo=In Limbo`, `Cold=Cold`

**Case `client_availability_completed`.** Production 1 options, sandbox 2. Format is `label=value`, listed in display order.

- Only in production: `Confirmed=Yes`
- Only in sandbox: `Yes=Yes`, `In Process=In Process`

**Case `insurance_2`.** Production 13 options, sandbox 4. Format is `label=value`, listed in display order.

- Only in production: `Beacon-Carelon=Beacon-Carelon`, `NY State Empire-Carelon=NY State Empire-Carelon`, `Emblem non HMO-Carelon=Emblem non HMO-Carelon`, `Emblem HMO-Carelon=Emblem HMO-Carelon`, `Unicare Commercial-Carelon=Unicare Commercial-Carelon`, `Providence-Carelon=Providence-Carelon`, `Anthem NY Commercial-Carelon=Anthem NY Commercial-Carelon`, `Child Health Plan-Carelon=Child Health Plan-Carelon`, `Independence Health Association-Carelon=Independence Health Association-Carelon`
- Only in sandbox: none

**Case `insurance_primary`.** Production 13 options, sandbox 13. Format is `label=value`, listed in display order.

- Same options, different order.
- Production order: `Medicaid FFS=Medicaid FFS`, `Aetna=Aetna`, `Cigna=Cigna`, `Beacon-Carelon=Beacon-Carelon`, `Other=Other`, `NY State Empire-Carelon=NY State Empire-Carelon`, `Emblem non HMO-Carelon=Emblem non HMO-Carelon`, `Emblem HMO-Carelon=Emblem HMO-Carelon`, `Unicare Commercial-Carelon=Unicare Commercial-Carelon`, `Providence-Carelon=Providence-Carelon`, `Anthem NY Commercial-Carelon=Anthem NY Commercial-Carelon`, `Child Health Plan-Carelon=Child Health Plan-Carelon`, `Independence Health Association-Carelon=Independence Health Association-Carelon`
- Sandbox order: `Medicaid FFS=Medicaid FFS`, `Aetna=Aetna`, `Cigna=Cigna`, `Other=Other`, `Beacon-Carelon=Beacon-Carelon`, `NY State Empire-Carelon=NY State Empire-Carelon`, `Emblem HMO-Carelon=Emblem HMO-Carelon`, `Emblem non HMO-Carelon=Emblem non HMO-Carelon`, `Unicare Commercial-Carelon=Unicare Commercial-Carelon`, `Providence-Carelon=Providence-Carelon`, `Anthem NY Commercial-Carelon=Anthem NY Commercial-Carelon`, `Child Health Plan-Carelon=Child Health Plan-Carelon`, `Independence Health Association-Carelon=Independence Health Association-Carelon`

**Case `maladaptive_behaviors__clinical`.** Production 13 options, sandbox 0. Format is `label=value`, listed in display order.

- Only in production: `Aggression=Aggression`, `Self-Injury=Self-Injury`, `Tantrums/Meltdowns=Tantrums/Meltdowns`, `Property Destruction=Property Destruction`, `Elopement=Elopement`, `Repetitive Behaviors=Repetitive Behaviors`, `Sensory Sensitivities=Sensory Sensitivities`, `Social Challenges=Social Challenges`, `Sleep Difficulties=Sleep Difficulties`, `Feeding Challenges=Feeding Challenges`, `Difficulty with Transitions=Difficulty with Transitions`, `Mouthing Non Food Itemsth=Mouthing Non Food Itemsth`, `Toileting Issues=Toileting Issues`
- Only in sandbox: none

**Case `n1_what_type_of_insurance`.** Production 6 options, sandbox 3. Format is `label=value`, listed in display order.

- Only in production: `Medicaid FFS - NY=Medicaid FFS`, `Medicaid FFS - NJ=Medicaid FFS - NJ`, `Medicaid - CO=Medicaid FFS - CO`, `Unsure=Unsure`
- Only in sandbox: `Medicaid FFS=Medicaid FFS`

**Case `n2_what_type_of_insurance`.** Production 6 options, sandbox 3. Format is `label=value`, listed in display order.

- Only in production: `Medicaid FFS - NY=Medicaid FFS`, `Medicaid FFS - NJ=Medicaid FFS - NJ`, `Medicaid FFS - CO=Medicaid FFS - CO`, `Unsure=Unsure`
- Only in sandbox: `Medicaid FFS=Medicaid FFS`

**Case `severity_level_clinical`.** Production 3 options, sandbox 5. Format is `label=value`, listed in display order.

- Only in production: `Level 3=Level 3`, `Level 2=Level 2`, `Level 1=Level 1`
- Only in sandbox: `5=5`, `4=4`, `3=3`, `2=2`, `1=1`

**Case `specific_home_location`.** Production 3 options, sandbox 4. Format is `label=value`, listed in display order.

- Only in production: none
- Only in sandbox: `N/A=N/A`

**BT/RBT `bt_rbt_type`.** Production 3 options, sandbox 2. Format is `label=value`, listed in display order.

- Only in production: `BT to RBT=BT to RBT(hidden)`
- Only in sandbox: none

**BT/RBT `gender`.** Production 2 options, sandbox 0. Format is `label=value`, listed in display order.

- Only in production: `male=male`, `female=female`
- Only in sandbox: none

**BT/RBT `location_home`.** Production 3 options, sandbox 0. Format is `label=value`, listed in display order.

- Only in production: `New York=New York`, `New Jersey=New Jersey`, `Colorado=Colorado`
- Only in sandbox: none

**Contact `contact_category`.** Production 8 options, sandbox 3. Format is `label=value`, listed in display order.

- Only in production: `Not a Lead=Not a Lead`, `Grad Permit=Grad Permit`, `Applicant=Applicant`, `Team Member=Team Member`, `Billing Partner=Billing Partner`
- Only in sandbox: none

## Calculation formulas returned

| Portal | Object | Internal name | calculationFormula |
| --- | --- | --- | --- |
| 50317927 | Case | `total_hours_bt1bt2_work_schedule` | `1 + 1` |
| 50317927 | Case | `total_hours_bt_12_work_schedule` | `hours_bt_work_schedule_1 + hours_bt_work_schedule_2` |
| 50317927 | Case | `total_hours_btrbt_12` | `if is_present(hours_bt_work_schedule_1) and is_present(bt_rbt_2_work_schedule) then hours_bt_work_schedule_1 + bt_rbt_2_work_schedule endif` |

## CentralReach catalog vs `src/constants/centralReach.mjs`

Ids only. Field and label names, and every contact value, stay in the discovery output files in `central_reach_test_integration/output_files/`.

Commands, run from `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration`:

```bash
node get_all_labels.js orglabels 20261028 ws1_org_labels_20261028
node api_calls.js metadata 5324526
node api_calls.js metadata 5324527
node api_calls.js metadata 5324528
```

`5324526` is the sandbox test client. `5324527` and `5324528` are the sandbox test BCBA and BT/RBT employees. The per-contact metadata read returns the field catalog for that contact type. The org label id set matches `all_labels_v3.json` from 10/27 exactly. Constants absent from the live catalog: 0.

Live catalog sizes. Org labels: 95. Client metadata fields (sandbox client contact): 39. Employee metadata fields (sandbox BCBA and BT contacts, union): 20.

| Constant | Kind | Id | In live catalog | On the expected contact type | Type (code vs live) |
| --- | --- | --- | --- | --- | --- |
| `CENTRAL_REACH_CLIENT_LABELS.ALL_CLIENTS` | label | 1052619 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.NY_CLIENT` | label | 1082499 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.NJ_CLIENT` | label | 1132647 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.CO_CLIENT` | label | 1132648 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.ACTIVE_CLIENT` | label | 1125427 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.INACTIVE_CLIENT` | label | 1121488 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.HOME` | label | 1052656 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.AETNA_NY` | label | 1082497 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.CIGNA_NY` | label | 1082498 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.CIGNA_COLORADO` | label | 1124249 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.MEDICAID_NY` | label | 1052532 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.MEDICAID_NJ` | label | 1124247 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.MEDICAID_COLORADO` | label | 1124248 | present | | |
| `CENTRAL_REACH_CLIENT_LABELS.CARELON` | label | 1107648 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.ALL_EMPLOYEES` | label | 1052618 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.BT_NY` | label | 1052630 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NY` | label | 1052631 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.BT_CO` | label | 1132650 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.BT_NJ` | label | 1132652 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.RBT_CO` | label | 1107692 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.RBT_NJ` | label | 1132651 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.BCBA` | label | 1130668 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NY` | label | 1052629 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_LBA_NJ` | label | 1124245 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.BCBA_COLORADO` | label | 1124246 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.GRAD_STUDENT_LBA_NY` | label | 1092164 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.CLINICAL` | label | 1052643 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.NY_EMPLOYEE` | label | 1132655 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.NJ_EMPLOYEE` | label | 1107686 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.CO_EMPLOYEE` | label | 1107687 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.BILLING_HOLD_MEDICAID_AFFILIATION` | label | 1103437 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.SALARIED` | label | 1132653 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_AETNA` | label | 1107649 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_CIGNA` | label | 1107650 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_NY_MEDICAID` | label | 1107647 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_CO_MEDICAID` | label | 1107651 | present | | |
| `CENTRAL_REACH_EMPLOYEE_LABELS.ONBOARDING_CARELON` | label | 1132654 | present | | |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.ALLERGIES` | metadata | 126214 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.MALADAPTIVE_BEHAVIORS` | metadata | 126207 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.COMORBID_DIAGNOSIS` | metadata | 132303 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_1_NAME` | metadata | 131313 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.BT_2_NAME` | metadata | 138092 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.WORK_SCHEDULE_1` | metadata | 132304 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.WORK_SCHEDULE_2` | metadata | 138093 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.CLIENT_AVAILABILITY` | metadata | 126209 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.TOTAL_ASSIGNED_HOURS` | metadata | 134331 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.APPROVED_AUTH_HOURS` | metadata | 132431 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.AUTH_PERIOD` | metadata | 134672 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.PHYSICIAN_CREDENTIALS` | metadata | 131151 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.ASD_DIAGNOSIS_DATE` | metadata | 131195 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.ASD_DIAGNOSIS_DATE_MEDICAID_FFS_NY` | metadata | 138701 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.SUPERVISING_BCBA` | metadata | 131308 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.INITIAL_ASSESSMENT_BCBA` | metadata | 131314 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.REASSESSMENT_BCBA` | metadata | 144602 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.GRAD_PERMIT_HOLDER` | metadata | 136052 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR` | metadata | 138851 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.SEVERITY_LEVEL` | metadata | 133826 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_NAME` | metadata | 138090 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.POLICY_HOLDER_DOB` | metadata | 137667 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.CURRENT_INSURANCE` | metadata | 126210 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.INSURANCE_ID` | metadata | 131316 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE` | metadata | 144600 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.SECONDARY_INSURANCE_ID` | metadata | 144601 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.DIAGNOSIS` | metadata | 144793 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRING_PHYSICIAN_MEDICAID_ID` | metadata | 141233 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.REFERRAL_SOURCE` | metadata | 126222 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.PRIMARY_CARE_PHYSICIAN` | metadata | 126220 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.PREVIOUS_THERAPY_HISTORY` | metadata | 126219 | present | yes | TextArea = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.IMPORTANT_INFORMATION_PARENT` | metadata | 138378 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS` | metadata | 137697 | present | yes | TextArea = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.SERVICE_LOCATION_ADDRESS_2` | metadata | 138091 | present | yes | Input = live |
| `CENTRAL_REACH_CLIENT_METADATA_FIELDS.HUBSPOT_LINK_TO_CASE_RECORD` | metadata | 138702 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.WORK_ADDRESS` | metadata | 133819 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BT_RBT_RECORD` | metadata | 138703 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_EMAIL` | metadata | 138069 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NY` | metadata | 126216 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_NJ` | metadata | 138112 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_MEDICAID_ID_CO` | metadata | 138113 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_NY` | metadata | 134444 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_AETNA` | metadata | 134445 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_CIGNA` | metadata | 134466 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.BCBA_CREDENTIALED_WITH_MEDICAID_CO` | metadata | 134446 | present | yes | Input = live |
| `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS.HUBSPOT_LINK_TO_BCBA_RECORD` | metadata | 138703 | present | yes | Input = live |

Duplicate id inside `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS`: `HUBSPOT_LINK_TO_BCBA_RECORD` reuses 138703. Both BT/RBT and BCBA record links write the same field id. Do not change the constant before a sandbox write. During the sandbox test, record which CentralReach field 138703 updates on a BT/RBT contact and on a BCBA contact. The constant stays until that write shows the two record links landing on different fields.

Live label ids not referenced in `centralReach.mjs` (58): 1052531, 1052533, 1052534, 1052541, 1052545, 1052547, 1052548, 1052549, 1052612, 1052613, 1052614, 1052615, 1052616, 1052620, 1052621, 1052622, 1052640, 1052641, 1052642, 1052646, 1052647, 1052650, 1052654, 1052655, 1052657, 1052663, 1052664, 1052688, 1056433, 1082206, 1108700, 1108702, 1108704, 1108705, 1110810, 1119435, 1119436, 1119438, 1119439, 1121490, 1121491, 1123201, 1123202, 1123203, 1123204, 1123206, 1123208, 1129264, 1131825, 1132634, 1132635, 1132637, 1132638, 1132640, 1132641, 1132951, 1138957, 1142656.

Live client metadata field ids not referenced (4): 140494, 140495, 142212, 144603.

Live employee metadata field ids not referenced (8): 126205, 126208, 126211, 126212, 126213, 126215, 126218, 126221.

## What this means for WS.2

Read the verdict column. `missing in sandbox` rows are sandbox properties to create. `differs` rows are sandbox definitions to align, except `sensitivity` on the Case sensitive tier, which portal 50850427 cannot store. `absent in production` rows are fetch-list names the production portal does not have on that object. Some are integration writeback fields (`last_sync_*`, CentralReach link fields) that production needs before cutover. The others are code reads that return nothing in production until the code or the portal changes. `absent on both` rows are names in the Drive map or the code that neither portal has. Do not create any property from this diff alone.

## Actions taken 2026-10-28

Danny's 10/28 note says the five Case name fields are the production workflow triggers, because workflows cannot enroll on an association label. `supervising_bcba_name` and `ia_bcba_name` were missing in sandbox. Both now exist there as string/text. `supervising_bcba_name` is in group `case_staffing`. `ia_bcba_name` is in group `automations`. Labels match production (`🤖Supervising BCBA Name` and `IA BCBA Name`). Production marks both calculated and read-only, and the properties API returns no `calculationFormula`. The calculation API requires a formula and field type `calculation_equation`, so the sandbox copies are writable text. A sandbox test sets the value. That is the same stand-in already used for `reassessment_bcba_name`, `current_primary_bt`, and `current_primary_bt_2`.

Sandbox association label `IA BCBA` was created with `hs api`. HubSpot assigned type id 163 on Case to BCBA and 164 on BCBA to Case. The request cannot set the production type id 86. Label 98 remains `Initial Assessment`.

Production writeback properties were created from the sandbox definitions. Case `0-3`: `last_sync_at`, `last_sync_error`, `last_sync_hash`, `last_sync_status`, `central_reach_link_to_client`, group `dealinformation`. BCBA `2-48354212`: those four `last_sync_*` fields, `central_reach_record_link`, `integration_last_write`, and `updated_by_integration`, group `bcbas_information`. BT/RBT `2-48354559`: the four `last_sync_*` fields, `central_reach_link_to_rt_rbt`, `integration_last_write`, and `updated_by_integration`, group `bts_information`. The HubSpot CLI key cannot edit deal schema (`deals-write`). Deal creates used the private app token in `.env`. Custom-object creates used the CLI account `united-care-aba`.

BT/RBT `postal_code` was not created. The guide maps Case `postal_code`, which already matches on both portals, and staff `postal_code_home` and `postal_code__work_`.

`guardianFromContact` in `src/mappings/client/buildClientPayload.mjs` reads `firstname`, `lastname`, and `email` from a contact. `buildClientPayload` still reads the Case sync fields. The 10/28 diff-review section says the sync-property setup is pending, so the contact path is not the live mapping.

## Sandbox parity creates

Created on sandbox portal 50850427, account `UnitedCare_Test_Integration`, on 2026-10-28. A GET showed each name absent on the active list and on the archived list. The create copied the production label. Enumeration creates copied the production options. A second GET confirmed each name. The creates omitted `calculationFormula`. BT/RBT `postal_code` stays absent. The comparison tables above record the portal read from before these creates.

| Internal name | Object | type | fieldType | Writable stand-in |
| --- | --- | --- | --- | --- |
| `hours_bt_work_schedule_1` | Case `0-3` | number | number | no |
| `hours_bt_work_schedule_2` | Case `0-3` | number | number | no |
| `total_hours_bt_12_work_schedule` | Case `0-3` | number | number | yes |
| `total_hours_btrbt_12` | Case `0-3` | number | number | yes |
| `full_name` | BCBA `2-55656302` | string | text | no |
| `gender` | BCBA `2-55656302` | enumeration | select | yes |
| `active_cases_count` | BT/RBT `2-55656309` | number | number | no |
| `bt_to_rbt_path` | BT/RBT `2-55656309` | enumeration | select | no |
| `state_home` | BT/RBT `2-55656309` | enumeration | select | yes |

`total_hours_bt_12_work_schedule` and `total_hours_btrbt_12` are calculated in production. Production `fieldType` is `calculation_equation`, and `modificationMetadata.readOnlyValue` is true. Sandbox stores both as writable properties with type `number` and fieldType `number`.

BCBA `gender` and BT/RBT `state_home` are calculated in production, and `modificationMetadata.readOnlyValue` is true on both. Sandbox stores them as writable enumeration selects with the production options. `gender` has 2 options and the label `Gender - ARCHIVED`. `state_home` has 50 options.

The CLI account created the BCBA and BT/RBT properties. The same account returned 403 on Case schema writes because the key lacks `deals-write`. Case creates used the sandbox private app token in `.env`. A portal check on that token returned 50850427 before the writes.

## Sandbox option adds

On 2026-10-29, sandbox portal 50850427 gained the stored values below. The account is `UnitedCare_Test_Integration`. Production portal 50317927 was read only. A portal check before each write returned 50850427. Case `0-3` writes used the sandbox private app token. The BT/RBT write used the CLI account. Each update sent the full option list already on the property, with the new values appended. The body had no other fields. Field types stayed the same. No option was removed. No stored value that already matched was relabeled. No calculation formula was copied. `case_status` was not in this update. A later read still has `Warm`, `In Limbo`, and `Cold`. A later read of production Case `allergies` still has two options, `Confirmed` and `Denial`.

A second GET after each successful update showed the new stored values and the previous ones.

**Case `allergies`.** Created `Confirmed` with label `Yes`, and `Denial` with label `No`. Neither stored value was already present. `Yes (Confirmed)` and `No (Denial)` remain. Type is still `enumeration` and field type is still `radio`.

**Case `insurance_2`.** Created nine stored values. The label matches the stored value on each. None of the nine were already present. `Medicaid FFS`, `Aetna`, `Cigna`, and `Other` remain.

- `Beacon-Carelon`
- `NY State Empire-Carelon`
- `Emblem non HMO-Carelon`
- `Emblem HMO-Carelon`
- `Unicare Commercial-Carelon`
- `Providence-Carelon`
- `Anthem NY Commercial-Carelon`
- `Child Health Plan-Carelon`
- `Independence Health Association-Carelon`

**Case `n1_what_type_of_insurance`.** Created `Medicaid FFS - NJ`, `Medicaid FFS - CO` with label `Medicaid - CO`, and `Unsure`. None of those stored values were already present. `Medicaid FFS`, `Commercial Enrolled`, and `Commercial OON` remain. The label on `Medicaid FFS` stayed `Medicaid FFS`.

**Case `n2_what_type_of_insurance`.** Created `Medicaid FFS - NJ`, `Medicaid FFS - CO`, and `Unsure`. The label matches the stored value on each. None were already present. `Medicaid FFS`, `Commercial Enrolled`, and `Commercial OON` remain. The label on `Medicaid FFS` stayed `Medicaid FFS`.

**Case `severity_level_clinical`.** Created `Level 1`, `Level 2`, and `Level 3`. None were already present. `5`, `4`, `3`, `2`, and `1` remain. Type is still `enumeration` and field type is still `radio`.

**BT/RBT `bt_rbt_type`.** Created `BT to RBT`. The option is hidden, as it is in production. `RBT` and `BT` were already present and remain.

**BT/RBT `gender`.** Hand edit. Nothing was created. The sandbox field is text, so `male` and `female` were not written.

**BT/RBT `location_home`.** Hand edit. Nothing was created. The sandbox field is text, so `New York`, `New Jersey`, and `Colorado` were not written.

**Contact `contact_category`.** The CLI account cannot edit the Contact schema on portal 50850427. The error names the missing scope `contacts-write`. A follow-up PATCH with the sandbox private app, after a portal check returned 50850427, added the five missing values. A GET now shows eight: `Parent/Guardian`, `BT/RBT`, `BCBA`, `Not a Lead`, `Grad Permit`, `Applicant`, `Team Member`, and `Billing Partner`. Production has no other value.
