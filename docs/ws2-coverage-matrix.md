# WS.2 sandbox coverage matrix

**As of:** 2026-10-29 morning, branch `align-sandbox-hubspot-field-sync` at `037ea72`.
**Done bar:** rule 3 in [`.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md`](../.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md).
**Status:** Draft. The matrix itself was built from the Drive guide and the code, not from a live run. One later webhook attempt on row 3.8b did not pass. The published worker skipped deal `66712883229` because `enter_in_central_reach` is empty, and CentralReach was redirecting to a maintenance page. That row stays `not run`. See [`CHECKPOINT.md`](CHECKPOINT.md) **Paused 2026-10-29**.

One row per item in sections 3 to 9 of the Drive guide (Integration Guide V2.0), plus the section 11 gates. A guide item that names several HubSpot fields with separate destinations or separate decisions is split into lettered sub-rows.

## How to read the columns

| Column | Source |
| --- | --- |
| HubSpot property | The property the code reads, in read order. Where the code differs from the guide, the note under the table says so. |
| CentralReach destination | Core field on the client or employee PUT, metadata field id, or label id from `src/constants/centralReach.mjs`. |
| Fetched | In `REQUIRED_DEAL_PROPERTIES` (`clientSyncWorkflow.mjs`), `BT_RBT_PROPERTIES` or `BCBA_PROPERTIES` (`employeeSyncWorkflow.mjs`), or read through an association the workflow loads. |
| Compared | Part of the hashed mapped state. Client: core payload, metadata, labels, and staffing relationships. Employee: outbound payload, metadata for the known field ids, and labels. |
| Written | Sent to CentralReach, or written back to HubSpot for CR to HS rows. |
| Fast trigger | Sandbox workflow that watches the property, from the Drive **Sandbox Assets** snapshot of 2026-10-27. W1 Case, W2 BT/RBT, W3 BCBA ongoing refresh. W4 Case, W5 BT/RBT, W6 BCBA entry property. The saved definitions were not re-read for this draft. |
| Poller coverage | What `intakePollerWorkflow.mjs` can carry. **Recheck** is the linked-record recheck: every record with a CentralReach id, no stage filter, on unless `LINKED_RECHECK_ENABLED=false`. **Sweep** is the modified sweep: pipeline and stage allowlist, `hs_lastmodifieddate` in the lookback window and newer than `integration_last_write`. **None** means the field is not fetched. No poller run has happened yet, so every poller cell is coverage by code, not a result. |
| Result | `not run`, `blocked` with a named owner, `signal only`, or `passed` with the doc that records it. |

Only one pass is recorded. SANDBOX-DONE rule 6 says the address populate, clear, repopulate, and restore suite passed on 2026-10-27 for the Case, BT/RBT, and BCBA street lines. `.test-evidence/TEST-RUN-SUMMARY.md` holds older Phase 0 to 5 evidence. SANDBOX-DONE rule 4 says that run is not the WS.2 plan, so it does not mark any other row passed.

## Section 3. Client to Case

| Row | Guide item | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1 | Trigger (Case gate) | `enter_in_central_reach` contains `Yes` | None. Azure gate | yes | no | no | W4 | Sweep | not run |
| 3.2 | Client ID (CR to HS) | `client_id_number`, plus `central_reach_link_to_client` | HubSpot writeback of the CR client id | yes | no | HubSpot writeback | none (W1 branches on it) | Recheck searches on it | not run |
| 3.3 | Legal Name | `phi_first_name__cloned_`, `phi_last_name` | `FirstName`, `LastName` | yes | yes | yes | none | Recheck + sweep | not run |
| 3.4 | Gender | `phi_gender` | `Gender` | yes | yes | yes | none | Recheck + sweep | not run |
| 3.5 | DOB | `phi_date_of_birth` | `DateOfBirth` | yes | yes | yes | none | Recheck + sweep | not run |
| 3.6 | Primary Email | Parent/Guardian Contact `email` when exactly one type 3 contact qualifies, else Case `email` | `PrimaryEmail` | yes | yes | yes | none | Recheck | not run |
| 3.7 | Guardian | Contact `firstname`, `lastname` when exactly one qualifies, else Case `guardian_first_name`, `guardian_last_name` | `GuardianFirstName`, `GuardianLastName` | yes | yes | yes | W1 (Case fields only) | Recheck | not run |
| 3.8a | Mailing Address, street | `full_home_address`, then `service_address__other`, then `if_services_will_be_in_more_than_one_location__list_the_other_address`, then `street_address` | `AddressLine1` | yes | yes | yes | W1 (`street_address`) | Recheck + sweep | passed, [SANDBOX-DONE.md](../.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md) rule 6 (2026-10-27) |
| 3.8b | Mailing Address, apt | `home_apt` | `AddressLine2` | yes | yes | yes | W1 | Recheck + sweep | not run |
| 3.8c | Mailing Address, city | `location_city` | `City` | yes | yes | yes | W1 | Recheck + sweep | not run |
| 3.8d | Mailing Address, state | `stateregion`, then `location_central_reach`, then `location` | `StateProvince` | yes | yes | yes | none | Recheck + sweep | not run |
| 3.8e | Mailing Address, postal | `postal_code` | `ZipPostalCode` | yes | yes | yes | W1 | Recheck + sweep | not run |
| 3.8f | Mailing Address, phone | Case `phone`, `phone_number__second_` | `PhoneCell`, `PhoneHome` | yes | yes | yes | none | Recheck + sweep | not run |
| 3.9 | Care coordinator | `hubspot_owner_id` | Metadata 138851 (constant only) | no | no | no | W1 | None | signal only |
| 3.10a | Initial Assessment BCBA | `initial_assessment_bcba` | Metadata 131314 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.10b | Reassessment BCBA | `reassessment_bcba_name` | Metadata 144602 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.11 | Supervising BCBA | `ongoing_central_reach_provider_supplier`, then `supervising_bcba` | Metadata 131308 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.12 | Grad Permit Holder | "Grad Permit BCBA" Case field, internal name not sent | Metadata 136052 (constant only) | no | no | no | none | None | blocked, owner Danny (send the internal name) |
| 3.13a | BT #1 Name | `current_primary_bt` | Metadata 131313 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.13b | BT #2 Name | `current_primary_bt_2` | Metadata 138092 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.14 | Work Schedule #1 | `work_schedule_details` and `work_schedule_1_details__for_location_2_other`, else `bt_work_schedule_confirmed` | Metadata 132304 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.15 | Work Schedule #2 | `btrbt_work_schedule_2_details` and `work_schedule_2_details__for_location_2_other`, else `bt_work_schedule_2_confirmed` | Metadata 138093 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.16 | Client Availability | `finalized_client_service_hours_post_assessment`, else `client_availability_completed` | Metadata 126209 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.17a | Total Assigned Hours (97153) | `total_hours_bt1bt2_work_schedule`, then `client_service_hours_total`, then `assigned_hours` | Metadata 134331 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.17b | Total Assigned Hours, older total | `total_hours_bt_12_work_schedule` | None | no | no | no | none | None | blocked, owner Danny (guide says ignore it) |
| 3.17c | Total Assigned Hours, older total | `total_hours_btrbt_12` | None | no | no | no | none | None | blocked, owner Danny (guide says ignore it) |
| 3.17d | Per-BT hours, BT 1 | `hours_bt_work_schedule_1` | None named | no | no | no | none | None | blocked, owner Danny (no CentralReach destination) |
| 3.17e | Per-BT hours, BT 2 | `hours_bt_work_schedule_2` | None named | no | no | no | none | None | blocked, owner Danny (no CentralReach destination) |
| 3.18 | Approved Auth Hours | By `initial_auth_tracks`: `n97153_approved_assessment_hours_auth_req` or `ia_hours_from_the_ia`, else `authorized_hours` | Metadata 132431 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.19 | Auth Period | `ongoing_auth_period_start_date`, `ongoing_autrh_period_end_date`, else `auth_start_date`, `auth_end_date` | Metadata 134672 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.20 | Service Location Address | `specific_home_location` picks `full_home_address` or `service_address__other` (else `service__street_address`, `service__apt`, `service__city`, `service__postal_code`) | Metadata 137697 | yes | yes | yes | W1 (`service__street_address`, `service__postal_code`) | Recheck + sweep | not run |
| 3.21 | Service Location Address 2 | `service_address__other`, blank when `specific_home_location` is Child's House | Metadata 138091 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.22 | Known Allergies | `allergies`, `allergies__yes__explain` | Metadata 126214 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.23 | Comorbid Diagnosis | `comorbid_diagnosis__clinical` | Metadata 132303 | yes | yes | yes | none | Recheck + sweep | blocked, owner Zeke (production re-read before any mapper change) |
| 3.24 | Maladaptive Behaviors | `maladaptive_behaviors__parentguardian` | Metadata 126207 | yes | yes | yes, only when non-blank | none | Recheck + sweep | blocked, owner Zeke (production re-read before any mapper change) |
| 3.25 | Severity Level | `severity_level_clinical` | Metadata 133826 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.26 | Important information, Parent | `important_information` | Metadata 138378 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.27 | Current Primary Insurance | `insurance_primary`, or `insurance_1__other__summary` when Other | Metadata 126210 | yes | yes | yes | W1 (`insurance_primary`) | Recheck + sweep | not run |
| 3.28 | Primary Insurance ID | `insurance_id_1` | Metadata 131316 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.29 | Referring Physician, Credentials and NPI | By `n1_what_type_of_insurance`: `physician_name` + `npi_number`, or `physician_name__commercial` + `npi_number__commercial` | Metadata 131151 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.30 | Diagnosis | `phi_diagnosis`, `diagnosis_other` | Metadata 144793 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.31 | Referring Physician Medicaid ID | `referring_provider_medicaid_id` | Metadata 141233 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.32 | Date of Most Recent ASD Diagnosis | By `n1_what_type_of_insurance`: `most_recent_asd_diagnosis_date_medicaid` or `most_recent_asd_diagnosis_date_1` | Metadata 131195 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.33 | ASD Diagnosis, Medicaid FFS NY | `most_recent_asd_diagnosis_date_medicaid` when `n1` or `n2` type is Medicaid FFS | Metadata 138701 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.34 | Policyholder Name | `policy_holder_name` | Metadata 138090 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.35 | Policyholder Date of Birth | `phi__policy_holder_dob` | Metadata 137667 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.36 | Secondary Insurance | `insurance_2`, or `insurance_2__other__summary` when Other | Metadata 144600 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.37 | Secondary Insurance ID | `insurance_id_2` | Metadata 144601 | yes | yes | yes | none | Recheck + sweep | not run |
| 3.38 | Referral Source | `referral_source` | Metadata 126222 | yes | yes | yes | none | Recheck + sweep | not run |

**Notes.**

- 3.3 to 3.5, 3.28, 3.30, 3.35, 3.37 are sensitive in production. Sandbox cannot store that tier. SANDBOX-DONE excludes the live sensitive GET from sandbox done.
- 3.6 and 3.7 read Contacts through association type 3. Contact edits have no sandbox workflow in the snapshot. The decided fourth Contact workflow is row G6.
- 3.7 and 3.27 carry the open clear gap in SANDBOX-DONE rule 5. Azure can report `success` while CentralReach keeps the old value.
- 3.8a passed on the street line only. Apt, city, state, postal, and phone are separate rows. The pass predates commit `77f4224`, which put `full_home_address` ahead of `street_address`.
- 3.8f reads Case `phone` and `phone_number__second_`. The guide says guardian Contact phone. WS.1 found neither Case property in production.
- 3.10a and 3.11 read `initial_assessment_bcba` and `supervising_bcba`. Danny's production triggers are `ia_bcba_name` and `supervising_bcba_name`. Both now exist in sandbox and are not fetched.
- 3.16. The guide also names `client_service_hours_total`. The code uses it as a fallback for 3.17a, not for 3.16.
- 3.17a. Production `total_hours_bt1bt2_work_schedule` returned formula `1 + 1`. The production pass confirms what a ZZ TEST Case sends.
- 3.24. The mapper sets 126207 only when the value is non-blank, so a full clear depends on the clear-field logic in `mappedState.mjs`.

## Section 4. Staffing associations

Associations are compared as relationships in the Case hash. The worker does not write association names. Names reach CentralReach through the Case rollups in section 3. Sandbox type ids are in `src/constants/staffingAssociations.mjs`.

| Row | Guide item | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4.1 | Supervising BCBA (82) | Case to BCBA association, sandbox 102 | None direct. 131308 comes from row 3.11. Guide uses this association for grad permit | yes | yes | no | none | Recheck | blocked, owner Danny (grad permit use waits on the Grad Permit BCBA field) |
| 4.2 | IA BCBA (86) | Association, sandbox 163 | Metadata 131314 through row 3.10a | yes | yes | through rollup | none | Recheck | not run |
| 4.3 | RE BCBA (145) | Association, sandbox 161 | Metadata 144602 through row 3.10b | yes | yes | through rollup | none | Recheck | not run |
| 4.4 | SUB BCBA (234) | Association, sandbox id not recorded | None | yes | yes, not excluded | no | none | Recheck | blocked, owner Danny (does CentralReach need the substitute) |
| 4.5 | Outgoing Supervising BCBA (135) | Association, sandbox id not recorded | None | yes | yes, not excluded | no | none | Recheck | not run |
| 4.6 | Previous IA BCBA (286) | Association | None. History only | yes | no, 286 excluded | no | none | Recheck | not run |
| 4.7 | Potential IA / Potential Supervising (153 / 80) | Association, sandbox Potential 100 | None. Never sync | yes | no, excluded | no | none | Recheck | not run |
| 4.8 | Primary BT 1 (76) | Association, sandbox 149 | Metadata 131313 through row 3.13a | yes | yes | through rollup | none | Recheck | not run |
| 4.9 | Primary BT 2 (143) | Association, sandbox 147 | Metadata 138092 through row 3.13b | yes | yes | through rollup | none | Recheck | not run |
| 4.10 | Outgoing BT 1 / BT 2 (131 / 166) | Association, sandbox ids not recorded | None | yes | yes, not excluded | no | none | Recheck | not run |
| 4.11 | Potential BT 1 / BT 2 (74 / 164) | Association, sandbox Potential 130 | None. Candidates only | yes | no, excluded | no | none | Recheck | not run |

**Notes.**

- Rows 4.4, 4.5, and 4.10 are compared but have no destination. A change moves the hash and rewrites CentralReach with no visible difference. The WS.2 run should confirm that is harmless.
- Rows 4.6, 4.7, and 4.11 pass when adding one leaves CentralReach unchanged.
- Recheck is the only poller path for an association-only change. Whether an association edit moves the Case `hs_lastmodifieddate` is unverified.

## Section 5. BCBA

| Row | Guide item | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5.1 | Trigger (BCBA gate) | `entered_in_centralreach` = `Yes` | None. Azure gate | yes | no | no | W6 | Sweep | not run |
| 5.2 | Employee ID (CR to HS) | `employee_id`, plus `central_reach_record_link` | HubSpot writeback of the CR employee id | yes | no | HubSpot writeback | none (W3 branches on it) | Recheck searches on it | not run |
| 5.3 | External System ID | Code sends `hs_object_id` | Employee `externalSystemId` | yes | yes | yes | none | Recheck + sweep | blocked, owner Zeke (Drive 10/29 note says confirm `workday_id` in production testing) |
| 5.4a | Legal Name | `first_name`, `last_name`, else split `bcba_name` | `firstName`, `lastName` | yes | yes | yes | none | Recheck + sweep | not run |
| 5.4b | Legal Name, also `full_name` | `full_name` | None named | no | no | no | none | None | blocked, owner Danny (no CentralReach destination) |
| 5.5 | Gender | `gender_new`. Archived `gender` is not mapped by decision | None in the employee payload | no | no | no | W3 (`gender_new`) | None | signal only |
| 5.6 | Primary Email (Work Email) | `ucaba_email_address`, else `work_email` | `primaryEmail` | yes | yes | yes | none | Recheck + sweep | not run |
| 5.7a | Mailing Address, street | `address` | `addressLine1` | yes | yes | yes | W3 | Recheck + sweep | passed, [SANDBOX-DONE.md](../.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md) rule 6 (2026-10-27) |
| 5.7b | Mailing Address, apt | `apartment__home`, else `home_apt` | `addressLine2` | yes | yes | yes | none | Recheck + sweep | not run |
| 5.7c | Mailing Address, city | `city_home`, else `city_work` | `city` | yes | yes | yes | none | Recheck + sweep | not run |
| 5.7d | Mailing Address, state | `state_home`, else `home_state` | `stateProvince` | yes | yes | yes | none | Recheck + sweep | not run |
| 5.7e | Mailing Address, postal | `postal_code_home` | `zipPostalCode` | yes | yes | yes | none | Recheck + sweep | not run |
| 5.7f | Mailing Address, phone | `employee_phone` | `phoneCell` | yes | yes | yes | W3 | Recheck + sweep | not run |
| 5.8 | Credentialed with NY Medicaid / Aetna / CO Medicaid / Cigna | `ny_insurance_labels`, `co_insurance_labels`. NY Medicaid falls back to `credentialed_insurances__ny` when the label field is blank | Metadata 134444, 134445, 134446, 134466 | yes | yes | yes | W3 (`ny_insurance_labels` only) | Recheck + sweep | not run |
| 5.9 | Medicaid ID NY / NJ / CO | `medicaid_id__ny`, `medicaid_id__nj`, `medicaid_id__co` | Metadata 126216, 138112, 138113 | yes | yes | yes | W3 | Recheck + sweep | not run |
| 5.10 | Personal Email | BCBA `email` (sync property from the Contact) | Metadata 138069 | yes | yes | yes | none | Recheck + sweep | not run |
| 5.11 | Salaried | `work_status` = Salaried | Label 1132653 | yes | yes | add only | none | Recheck + sweep | not run |
| 5.12 | Care Coordinator | `hubspot_owner_id` | None in constants | no | no | no | W3 | None | signal only |

**Notes.**

- 5.5. The guide names `gender_new`. The decision recorded for this run is not to map BCBA gender.
- 5.8. The Change Detection doc says to stop using `credentialed_insurances__ny`. The fallback is still in code.
- 5.10. The production sync property's internal name is not confirmed. A Contact edit only reaches Azure once the sync copies it onto the BCBA.

## Section 6. BT/RBT

| Row | Guide item | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6.1 | Trigger (BT/RBT gate) | `entered_in_centralreach` = `Yes` ("Yes - Active") | None. Azure gate | yes | no | no | W2, W5 | Sweep | not run |
| 6.2 | Employee ID (CR to HS) | `employee_id`, plus `central_reach_link_to_rt_rbt` | HubSpot writeback of the CR employee id | yes | no | HubSpot writeback | none (W2 branches on it) | Recheck searches on it | not run |
| 6.3 | External System ID | Code sends `hs_object_id` | Employee `externalSystemId` | yes | yes | yes | none | Recheck + sweep | not run |
| 6.4 | Legal Name | `first_name`, `last_name`, else split `bt_name` | `firstName`, `lastName` | yes | yes | yes | W2 | Recheck + sweep | not run |
| 6.5 | Gender | `gender` | `gender` | yes | yes | yes | none | Recheck + sweep | blocked, owner Zeke (sandbox field is text; production select options not copied) |
| 6.6 | Primary Email | `email` | `primaryEmail` | yes | yes | yes | W2 | Recheck + sweep | not run |
| 6.7a | Mailing Address, street | `street_home` | `addressLine1` | yes | yes | yes | W2 | Recheck + sweep | passed, [SANDBOX-DONE.md](../.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md) rule 6 (2026-10-27) |
| 6.7b | Mailing Address, city | `location_city` | `city` | yes | yes | yes | W2 | Recheck + sweep | not run |
| 6.7c | Mailing Address, state | `state_home` (mailing state since `ecf4e27`) | `stateProvince` | yes | yes | yes | none | Recheck + sweep | not run |
| 6.7d | Mailing Address, state fallback | `location_home` | `stateProvince` fallback; work-state label fallback | yes | yes | yes | none | Recheck + sweep | blocked, owner Zeke (sandbox field is text; production select options not copied) |
| 6.7e | Mailing Address, postal | `postal_code_home` | `zipPostalCode` | yes | yes | yes | W2 | Recheck + sweep | not run |
| 6.7f | Mailing Address, postal fallback | `postal_code`, not a property on either portal | `zipPostalCode` fallback | requested, returns nothing | yes | no value today | none | None | blocked, owner Zeke (fallback unresolved; verify in the production pass) |
| 6.7g | Mailing Address, phone | `employee_phone` | `phoneCell` | yes | yes | yes | W2 | Recheck + sweep | not run |
| 6.8a | Work Address | `street_address__work_`, `city__work_`, `state__work_`, `postal_code__work_` | Metadata 133819 | yes | yes | yes | W2 | Recheck + sweep | not run |
| 6.8b | Work Address, apartment | `apartment__work` | None. Not in the work-address string | no | no | no | W2 | None | signal only |
| 6.9 | Active Staffed | `active_cases_count` | None yet. Proposed "HubSpot Active Case Count" metadata field | no | no | no | none | None | blocked, owner Zeke (create the CentralReach field once HubSpot ownership is confirmed) |

**Notes.**

- 6.7a passed on the street line only. `home_apt` is also sent as `addressLine2`. The guide does not list it.
- 6.7c. The poller result for `state_home` is not run.

## Section 7. Client dashboard labels

| Row | Guide item | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 7.1 | Active / Inactive | `case_status` Warm / Cold | Labels 1125427 / 1121488 | yes | yes | add only | W1 | Recheck + sweep | not run |
| 7.2 | Staffed | `staffing_status` | None. No Staffed label constant | yes | no | no | W1 | Recheck + sweep | signal only |
| 7.3 | Stage table (reference) | `dealstage` | None. Labels come from 7.1 and 7.2 | no | no | no | W1 | None | signal only |
| 7.4 | Stage Restaffing-BCBA AND BT Needed | `staffing_status` (X Staffed) | Active only, expected | yes | through 7.1 | through 7.1 | W1 | Recheck + sweep | blocked, owner Sara |
| 7.5 | Stage Reassessment | `staffing_status` (decided 10/28) | Staffed label | yes | no | no | W1 | Recheck + sweep | signal only |
| 7.6 | Stage Closed Lost | `case_status` | Inactive, expected | yes | through 7.1 | through 7.1 | W1 | Recheck + sweep | blocked, owner Sara |
| 7.7 | Cleanup stages | `case_status`. HubSpot moves these Cases to Inactive (10/28) | Leave out of CentralReach | yes | through 7.1 | through 7.1 | W1 | Recheck + sweep | blocked, owner Danny (Optidge moves the cleanup Cases to Inactive) |
| 7.8 | CO / NJ / NY Client | `stateregion`, then `location_central_reach`, then `location` | Labels 1132648 / 1132647 / 1082499 | yes | yes | add only | none | Recheck + sweep | not run |
| 7.9 | Home | `specific_home_location` = Child's House or More Than One Location | Label 1052656 | yes | yes | add only | none | Recheck + sweep | not run |
| 7.10 | School / Clinic | No HubSpot option | None | no | no | no | none | None | blocked, owner Sara (future options) |
| 7.11 | Aetna NY | `insurance_primary` = Aetna and state NY | Label 1082497 | yes | yes | add only | W1 (`insurance_primary`) | Recheck + sweep | not run |
| 7.12 | Cigna NY / Cigna Colorado | `insurance_primary` = Cigna and state NY / CO | Labels 1082498 / 1124249 | yes | yes | add only | W1 (`insurance_primary`) | Recheck + sweep | not run |
| 7.13 | Medicaid NY / NJ / Colorado | `insurance_primary` = Medicaid FFS and state | Labels 1052532 / 1124247 / 1124248 | yes | yes | add only | W1 (`insurance_primary`) | Recheck + sweep | not run |
| 7.14 | Carelon | `insurance_primary` contains "carelon" | Label 1107648 | yes | yes | add only | W1 (`insurance_primary`) | Recheck + sweep | not run |
| 7.15 | Anthem BCBS | No matching option | None | no | no | no | none | None | blocked, owner Pessy |
| 7.16 | UHC | No UHC option | None | no | no | no | none | None | blocked, owner Pessy |
| 7.17 | Payors with no CR label | Aetna or Cigna in NJ, Aetna in CO, Other | None | yes | no label | no | W1 (`insurance_primary`) | Recheck + sweep | blocked, owner Pessy |

**Notes.**

- 7.1. Labels are add only (see the section 8 note). A Case that goes from Warm to Cold keeps the Active label.
- 7.1 and 7.2. Pessy is confirming that the Active and Staffed labels exist in CentralReach.
- 7.8. The guide names `location`. The code reads `stateregion` first. W1 does not watch any of the three.

## Section 8. BCBA dashboard labels

| Row | Guide item | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8.1 | CO / NY / NJ Employee | `location`, else `home_state`. New Mexico and Virginia skipped (decided) | Labels 1107687 / 1132655 / 1107686 | yes | yes | add only | W3 | Recheck + sweep | not run |
| 8.2 | BCBA (header) | Every BCBA record | Label 1130668, plus 1052618 and 1052643 | yes | yes | add only | none | Recheck + sweep | not run |
| 8.3 | BCBA Colorado / BCBA LBA NJ | `assign_states` contains Assign CO / Assign NJ | Labels 1124246 / 1124245 | yes | yes | add only | none | Recheck + sweep | not run |
| 8.4 | BCBA LBA NY | `lba_licensure__ny` = Yes | Label 1052629 | yes | yes | add only | none | Recheck + sweep | not run |
| 8.5 | GRAD Student-LBA NY | `lba_licensure__ny` = Grad Permit | Label 1092164 | yes | yes | add only | none | Recheck + sweep | not run |
| 8.6 | Aetna / Cigna / Carelon / NY Medicaid / CO Medicaid | `ny_insurance_labels`, `co_insurance_labels` | Labels 1107649 / 1107650 / 1132654 / 1107647 / 1107651 | yes | yes | add only | W3 (`ny_insurance_labels` only) | Recheck + sweep | not run |
| 8.7 | No CR label | `nj_insurance_labels`, Aetna-CO, Cigna-CO, Carelon-CO | None | yes | no | no | W3 (`nj_insurance_labels`) | Recheck + sweep | signal only |
| 8.8 | Billing Hold Medicaid affiliation | `cr_billing_hold_label` = Yes | Label 1103437 | yes | yes | add only | W3 | Recheck + sweep | not run |

**Notes.**

- Every label row in sections 5, 7, 8, and 9 is add only. `updateContactLabels` in `centralReachClient.mjs` only POSTs label ids. Removal on No, on a credential or type change, or on a state change is not coded. The guide asks for removal on 8.8 and for Staffed. Expect a label clear to fail until that changes.
- 8.7. The open decision is still with United Care. Danny collects the answer.

## Section 9. BT dashboard labels

| Row | Guide item | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9.1 | CO / NY / NJ Employee | `location`, else `location_home` | Labels 1107687 / 1132655 / 1107686, plus 1052643 | yes | yes | add only | W2 | Recheck + sweep | not run |
| 9.2 | Behavior Technician / RBT by state | `bt_rbt_type` x `location` | Labels 1052630, 1132652, 1132650 / 1052631, 1132651, 1107692 | yes | yes | add only | W2 | Recheck + sweep | not run |
| 9.3 | BT to RBT path | `bt_to_rbt_path` | None. Sara says it does not affect the label | no | no | no | none | None | blocked, owner Sara |

## Section 11. Gates and signals

The three object gates are rows 3.1, 5.1, and 6.1.

| Row | Guide item | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G1 | One-way latch | Gate cleared on a linked record | Keep syncing | yes | n/a | n/a | W1, W2, W3 | Recheck | not run |
| G2 | No pipeline or stage restriction after the gate | Any stage, including Inactive | Same mapped set | yes | n/a | n/a | W1, W2, W3 (no stage filter) | Recheck has no stage filter. Sweep uses the allowlist | not run |
| G3 | Backfill, CR id passes the gate | `client_id_number` known, gate blank | Same mapped set | yes | n/a | n/a | W1 branch | Recheck | blocked, owner Zeke (production pass only; sandbox keeps the Yes token) |
| G4 | BT/RBT "Yes - Generic" | `entered_in_centralreach` = `Yes - Generic` | Undecided | yes | no | no | W2, W5 | Sweep | blocked, owner Sara |
| G5 | BT/RBT "No- Made Inactive" | `entered_in_centralreach` = `No- Made Inactive` | Undecided. Guide asks the sync to set it on deactivation | yes | no | no | W2, W5 | Sweep | blocked, owner Sara |
| G6 | Contacts as a fourth object | Guardian name and email, BCBA personal email | Rows 3.6, 3.7, 5.10 | yes | yes | yes | none in the 10/27 snapshot. Fourth Contact workflow decided 10/28 | Recheck | not run |
| G7 | Values that change without an edit | `case_status`, `staffing_status`, BCBA and BT name rollups, associations | Rows 7.1, 7.2, 3.10, 3.13, section 4 | yes | yes | partly | W1 (`case_status`, `staffing_status` only) | Recheck + sweep for properties. Recheck for associations | not run |
| G8 | Stage change signal | `dealstage`, `hs_pipeline_stage` | None. Not fetched | no | no | no | W1, W2, W3 | None | signal only |
| G9 | Staffing association change signal | Production triggers `supervising_bcba_name`, `ia_bcba_name`, `reassessment_bcba_name`, `current_primary_bt`, `current_primary_bt_2` | Rows 3.10, 3.11, 3.13 | 3 of 5 (`supervising_bcba_name`, `ia_bcba_name` not fetched) | 3 of 5 | 3 of 5 | none in the 10/27 snapshot | Recheck + sweep | not run |
| G10 | Writeback fields stay out of triggers | `client_id_number`, `employee_id`, `external_system_id`, links, `last_sync_*` | None | n/a | n/a | n/a | Not watched in the 10/27 snapshot. W1 to W3 branch on the id | n/a | not run |

**Notes.**

- G1. Both workers return `skipped` when the gate does not contain `Yes`, even on a linked record. Read from `clientSyncWorkflow.mjs` and `employeeSyncWorkflow.mjs`. Expect this row to fail until the latch is coded.
- G9. The code fetches `supervising_bcba` and `initial_assessment_bcba`. Danny's trigger names `supervising_bcba_name` and `ia_bcba_name` now exist in sandbox and are not read.
- G10 needs a re-read of the saved workflow definitions, not a sync run.

## Integration-owned fields outside the guide

The CentralReach catalog has three mapped fields the guide does not list.

| Row | Field | HubSpot property | CentralReach destination | Fetched | Compared | Written | Fast trigger | Poller coverage | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X1 | HubSpot link to Case | `hs_object_id` | Metadata 138702 | yes | yes | yes | none | Recheck + sweep | not run |
| X2 | HubSpot link to BT/RBT | `hs_object_id`, portal, object type | Metadata 138703 | yes | yes | yes | none | Recheck + sweep | not run |
| X3 | HubSpot link to BCBA | `hs_object_id`, portal, object type | Metadata 138703 | yes | yes | yes | none | Recheck + sweep | not run |

X2 and X3 share field 138703. The sandbox end-to-end must read it back on one BT/RBT and one BCBA and decide whether either needs its own field (SANDBOX-DONE rule 4).

Two client metadata constants have no guide row and no mapping: 126220 Primary Care Physician and 126219 Previous Therapy History. They are not in this matrix.

## Code gaps found while building the matrix

These are facts read from `src/`. None was changed.

1. The one-way latch is not coded (G1).
2. Client and employee labels are add only. Active to Inactive, state, funding, Home, billing hold, credential, and BT/RBT type removals do not reach CentralReach (sections 5, 7, 8, 9).
3. Care coordinator is not fetched for Case or BCBA, although W1 and W3 watch `hubspot_owner_id` (3.9, 5.12).
4. `staffing_status` is fetched but not compared or written (7.2).
5. Two of the five production staffing trigger names are not fetched (G9).
6. BT/RBT `apartment__work` is watched by W2 and left out of the work-address string (6.8b).
