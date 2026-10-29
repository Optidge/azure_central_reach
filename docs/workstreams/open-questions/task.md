# Open questions after the 10/28 schema pass. Review.

**Status:** all nine items decided (pass 3, 2026-10-28 late). **Decisions, pass 3** below supersedes pass 2 where they differ. The guardian Contact read landed in `src/` after this review. Smoke tests passed 27 of 27. No HubSpot property was created in the pass that wrote these decisions. No merge, publish, or poller change. The next unit creates the missing sandbox properties.

**Start state.** Branch `align-sandbox-hubspot-field-sync`, HEAD `9789ebc`.

**Goal.** Decide what to do with each of the nine items in `docs/CHECKPOINT.md` under **Open after the 10/28 schema pass** (lines 278 to 290), so WS.2 can start.

**Evidence rule.** Every HubSpot definition fact below comes from `docs/ws1-schema-diff.md`, which records the 10/28 reads. This review did not call HubSpot or CentralReach again. Code facts come from reading `src/` at `9789ebc`.

## Sources read

- `docs/CHECKPOINT.md` lines 59 to 97 (Danny 10/28) and 278 to 295 (open list, next session).
- `docs/ws1-schema-diff.md` findings 1 to 8 (lines 18 to 25), staffing labels (lines 85 to 114), option lists (lines 343 to 413), formulas (lines 416 to 422), the 138703 note (line 527), and **Actions taken 2026-10-28** (lines 539 to 549).
- `docs/HANDOFF.md`.
- `src/mappings/client/buildClientPayload.mjs` `guardianFromContact` (lines 119 to 130) and `buildClientPayload` (lines 132 to 169).
- `src/constants/centralReach.mjs` lines 32 to 44.
- `src/mappings/client/buildClientMetadata.mjs` `requiredClientLabelIds` (lines 252 to 288), plus the insurance-type readers (lines 66 to 101) and the hours read (lines 328 to 331).
- `src/constants/staffingAssociations.mjs`, `src/workflows/clientSyncWorkflow.mjs` lines 30 to 155, `src/workflows/employeeSyncWorkflow.mjs` lines 55 to 115 and 160 to 178, `src/mappings/employees/buildEmployeePayload.mjs` lines 318 to 440.

## 1. Sandbox `supervising_bcba_name` and `ia_bcba_name` are writable text

**Already true.** Both now exist in sandbox as string/text with production labels (`ws1-schema-diff.md` line 541). Production marks them calculated and read-only and returned no `calculationFormula`. The same writable stand-in already exists for `reassessment_bcba_name`, `current_primary_bt`, and `current_primary_bt_2`. The sync code does not read either name. It reads `supervising_bcba`, `initial_assessment_bcba`, and `ongoing_central_reach_provider_supplier` (`clientSyncWorkflow.mjs` lines 143 to 145, `buildClientMetadata.mjs` lines 343 to 349). Danny's note says the five names are production workflow triggers (`CHECKPOINT.md` line 73).

**Undecided.** Whether a sandbox test may type the value directly instead of letting a rollup produce it.

**Recommendation.** Yes. Set them directly in sandbox. They exist only so the copied workflows have a trigger to enroll on, and the sync code never reads them, so a typed value tests the same path a rollup would. Record in the WS.2 log that the sandbox proves workflow enrollment, not the production rollup.

## 2. Sandbox IA BCBA label is 163/164. Label 98 is still `Initial Assessment`

**Already true.** Sandbox `IA BCBA` is 163 Case to BCBA and 164 BCBA to Case. Production IA BCBA is 86/85 (`ws1-schema-diff.md` lines 103 and 543). `src/constants/staffingAssociations.mjs` line 24 sets `SANDBOX_STAFFING_ASSOCIATION_TYPE_IDS.INITIAL_ASSESSMENT_BCBA` to 98. No code in `src/` reads that key. Change detection uses `associationsForComparison`, which keeps every type id not in the excluded set. Neither 98 nor 163 is excluded, so both already count as staffing changes. The checkpoint does not mention the constant.

**Undecided.** Whether 98 stays, and which label sandbox tests attach.

**Recommendation.** Keep 98. Deleting it gains nothing and can drop associations on existing sandbox records. Use 163 for every new sandbox IA BCBA test, because it carries the production name the copied workflows will look for. In WS.2, change the constant on line 24 from 98 to 163 so the repo names the label the tests use.

## 3. Production writeback fields created. Token split for schema writes

**Already true.** Production now has the `last_sync_*` fields and the CentralReach link fields on Case `0-3`, BCBA `2-48354212`, and BT/RBT `2-48354559` (`ws1-schema-diff.md` line 545). The Deal creates used the private app token because the HubSpot CLI key lacks `deals-write`. Custom-object creates used CLI account `united-care-aba`. These were definitions, not records. `HANDOFF.md` allows production schema reads and keeps production record writes out.

**Undecided.** Nothing about the fields themselves. What is open is whether the production Function App credential can write those properties when the integration writes back.

**Recommendation.** Close this as done. Do not add `deals-write` to the CLI key for this one need. Add one check to the production ZZ TEST pass: the integration's own credential writes `last_sync_status` on one ZZ TEST Case, BCBA, and BT/RBT. That is the first proof the new fields work for the app.

## 4. Sandbox option lists were not rewritten

**Already true.** `case_status` in production is `Active=Warm` and `Inactive=Cold`. Sandbox has `Warm`, `In Limbo`, `Cold` (`ws1-schema-diff.md` lines 350 to 353). `requiredClientLabelIds` compares stored values `Warm` and `Cold` (`buildClientMetadata.mjs` lines 275 to 281), which match production. `In Limbo` produces no Active or Inactive label. `allergies` and `severity_level_clinical` are passed through as text and are never compared (lines 179 and 353 to 355), so they change the value CentralReach receives, not the logic. `n1_what_type_of_insurance` is compared against `medicaid ffs` only (lines 66 to 101). Production also stores `Medicaid FFS - NJ` and `Medicaid FFS - CO` (`ws1-schema-diff.md` lines 375 to 383). This is inferred from code reading. A production NJ or CO Medicaid Case gets no Physician Credentials, no ASD Diagnosis Date, and no Medicaid FFS NY ASD date.

**Undecided.** Whether sandbox options should match production.

**Recommendation.** Leave the sandbox option lists alone. Rewriting them changes stored test values and proves nothing the code depends on. In WS.2, use only values that exist in production (`Warm` or `Cold`, never `In Limbo`). Take the NJ and CO Medicaid behavior to Danny as a mapping question before production. That gap is in the code, not the sandbox.

## 5. Production formula `1 + 1` on `total_hours_bt1bt2_work_schedule` was not copied

**Already true.** Production returns the literal formula `1 + 1` for `total_hours_bt1bt2_work_schedule`. Production `total_hours_bt_12_work_schedule` is `hours_bt_work_schedule_1 + hours_bt_work_schedule_2` (`ws1-schema-diff.md` lines 420 to 421). Sandbox keeps the field as a writable number. The code reads `total_hours_bt1bt2_work_schedule` first for CentralReach Total Assigned Hours (`buildClientMetadata.mjs` lines 328 to 331). This is inferred from the formula and the code, not observed on a record. Every production Case would send `2` to CentralReach.

**Undecided.** Which production field is the real total, and whether `1 + 1` is a placeholder.

**Recommendation.** Do not copy the formula, and treat this as a production blocker. Ask Danny which hours field CentralReach should get, likely `total_hours_bt_12_work_schedule`, or whether United Care will fix the formula. Until that answer lands, sandbox tests stay writable and the code is unchanged.

## 6. Both employee record links use CentralReach field 138703

**Already true.** `centralReach.mjs` lines 34 and 43 both set 138703. The live catalog has 138703 as an Input field on the expected contact type (`ws1-schema-diff.md` lines 516, 525, 527). Each contact type writes only its own key. BT/RBT writes `HUBSPOT_LINK_TO_BT_RBT_RECORD` and BCBA writes `HUBSPOT_LINK_TO_BCBA_RECORD` (`buildEmployeePayload.mjs` lines 347 to 349 and 435 to 437, `employeeSyncWorkflow.mjs` lines 161 to 178). No employee ever writes the field twice. `docs/hubspot-centralreach-field-mappings-current-state.md` line 489 already calls it one shared field.

**Undecided.** Whether CentralReach has a separate BCBA link field the code should use.

**Recommendation.** Keep the constant. One shared "HubSpot link" field for every employee is the likely design. Nothing collides, because each contact gets one write. In WS.2, read 138703 back on BT/RBT employee 5324528 and BCBA employee 5324527. If both show their own record URL, close the item with no code change.

## 7. Drive **10/28 - Diff Review Pending Leave For Now**

**Already true.** `guardianFromContact` reads `firstname`, `lastname`, and `email` from a contact and has no caller (`buildClientPayload.mjs` lines 119 to 130). `buildClientPayload` reads Case `guardian_first_name`, `guardian_last_name`, and `email` (lines 136, 145 to 146, 164 to 167). Danny decided a fourth Contact workflow copies guardian name and email and BCBA personal email onto the record (`CHECKPOINT.md` line 81). Production Case has no `email`, `phone`, `phone_number__second_`, `guardian_first_name`, or `guardian_last_name` (`ws1-schema-diff.md` line 20). BCBA reads its own `email`, and BT/RBT reads `employee_phone`, whose new production internal name is not recorded (`employeeSyncWorkflow.mjs` lines 66 to 69 and 94 to 97). `current_primary_bt` exists on both portals (`ws1-schema-diff.md` line 92).

**Undecided.** The production internal names for the Case guardian fields and the staff phone sync field, and who creates them.

**Recommendation.** Keep the Case-field read, as Danny decided, and leave the Drive section pending. That does not block sandbox WS.2, because sandbox has the fields. It does block production, because production Case has no guardian or email targets. Ask Danny for the production internal names before the ZZ TEST pass. Delete `guardianFromContact` when the Case sync is confirmed.

## 8. BT/RBT `postal_code` was not created

**Already true.** `postal_code` exists on neither portal's BT/RBT object (`ws1-schema-diff.md` lines 20 and 312). The BT/RBT fetch list still requests it (`employeeSyncWorkflow.mjs` line 63). The BT/RBT payload uses `postal_code_home` and falls back to `postal_code` (`buildEmployeePayload.mjs` line 320), so the fallback is always empty. Case `postal_code` matches on both portals.

**Undecided.** Nothing about the portal.

**Recommendation.** Do not create the property. The field map never named it, and staff postal codes live in `postal_code_home` and `postal_code__work_`. In WS.2, remove `postal_code` from the BT/RBT fetch list and drop the dead fallback on line 320.

## 9. Comorbid and maladaptive mappers were not changed

**Already true.** At the 10/28 read, `does_your_child_have_any_other_comorbid_diagnoses_`, `comorbid_diagnosis__clinical`, and `maladaptive_behaviors__clinical` were all active in production (`ws1-schema-diff.md` line 23). Comorbid metadata reads `comorbid_diagnosis__clinical`. Maladaptive reads only `maladaptive_behaviors__parentguardian` (`buildClientMetadata.mjs` lines 305 to 310 and 386 to 390). United Care said the clinical properties may be deleted before Thursday, and the checkpoint says to confirm in the portal before any mapper change (`CHECKPOINT.md` lines 65 and 93).

**Undecided.** Whether the clinical properties are gone, and which field comorbid should read afterward.

**Recommendation.** Leave the mappers alone in WS.2. Maladaptive already reads the parent field and needs no change. Comorbid will silently send nothing once `comorbid_diagnosis__clinical` is deleted. After Thursday, re-read the production definitions. If it is gone, point comorbid at `does_your_child_have_any_other_comorbid_diagnoses_` in one small change.

## Decisions (operator answers, 2026-10-28 evening)

**Drive check.** I read the integration guide (Drive file `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`) section 3 client field map, section 5 BCBA, section 7 funding source, Danny's 10/28 feedback, and **10/28 - Diff Review Pending Leave For Now**. No Drive sentence contradicts an operator decision below. The credential link in the prod-access paragraph is not copied here. HubSpot and CentralReach were not called in this pass.

### 1. Writable sandbox name fields

**Decision.** Do what is easiest. `supervising_bcba_name` and `ia_bcba_name` already exist in sandbox as writable text. Do not recreate them. A sandbox test types the value.

**Confirmed.** Drive Danny 10/28 item 1 names the five name fields as the production triggers. For this test, the fields are already created and there is nothing to add. No code path reads any other property the diff lists as missing in sandbox. Nine remain: Case `hours_bt_work_schedule_1`, `hours_bt_work_schedule_2`, `total_hours_bt_12_work_schedule`, `total_hours_btrbt_12`. BCBA `full_name`, `gender`. BT/RBT `active_cases_count`, `bt_to_rbt_path`, `state_home` (`ws1-schema-diff.md` lines 124 to 126 and 159 to 316). The staffing-name test needs none of them.

**Remains.** `SANDBOX-DONE.md` rule 2 says every production property missing in sandbox is created before the end-to-end run. Whether those nine are in scope goes with item 4's "create what's needed". The method is fixed: read the production definition, then create only that sandbox field with the sandbox private app.

### 2. IA BCBA label

**Decision.** Accepted. Keep label 98 (`Initial Assessment`). New sandbox IA BCBA tests use type 163 (Case to BCBA) and 164 (BCBA to Case). Changing `SANDBOX_STAFFING_ASSOCIATION_TYPE_IDS.INITIAL_ASSESSMENT_BCBA` from 98 to 163 in `src/constants/staffingAssociations.mjs` is a WS.2 code edit, not this pass.

**Confirmed.** Drive section 4 lists production IA BCBA as 86. Type ids stay per portal.

**Remains.** The WS.2 constant edit.

### 3. Production writeback fields

**Decision.** The fields already exist in production (`ws1-schema-diff.md` line 545). An older operator note said the `last_sync_*` and CentralReach link fields were missing and should be created in production exactly as in sandbox. That note is the requirement, and the 10/28 creates carried it out. Do not create them again. The ZZ TEST check that the integration credential can write `last_sync_status` on a Case, a BCBA, and a BT/RBT is accepted for the next workstream. This pass makes no production record or schema writes.

**Confirmed.** Drive rule 11, just above section 3, says "A missing property breaks the whole write." That is why the writeback fields had to exist before cutover.

**Remains.** The ZZ TEST write check in the production pass.

### 4. Option lists and NJ/CO Medicaid

**Decision.** "Create what's needed." Make sandbox as close to production as it can be. Add sandbox options that production has and sandbox lacks. Do not delete sandbox options in this pass. `In Limbo` stays until an explicit delete. If the API cannot change a field or option, Zeke does it by hand. This pass does not call HubSpot. The mapper does not change.

**Confirmed, side by side.**

- Drive section 7 funding source says `n1_what_type_of_insurance` "Medicaid FFS - NY" option stores Medicaid FFS, "so the state is not in the value."
- `ws1-schema-diff.md` lines 375 to 383 say production also stores `Medicaid FFS - NJ` and `Medicaid FFS - CO` on `n1_what_type_of_insurance` and `n2_what_type_of_insurance`.

These do not conflict. The Drive row describes only the NY option. The code matches `medicaid ffs` exactly (`buildClientMetadata.mjs` lines 66 to 101). Whether NJ and CO Medicaid Cases get Physician Credentials and ASD dates is a production-testing confirmation.

Options production has and sandbox lacks, from `ws1-schema-diff.md` lines 343 to 413:

- New values. `allergies` `Confirmed`, `Denial`. `insurance_2` the nine `-Carelon` values. `n1_what_type_of_insurance` and `n2_what_type_of_insurance` `Medicaid FFS - NJ`, `Medicaid FFS - CO`, `Unsure`. `severity_level_clinical` `Level 1`, `Level 2`, `Level 3`. BT/RBT `bt_rbt_type` `BT to RBT` (hidden), `gender` `male`, `female`, `location_home` `New York`, `New Jersey`, `Colorado`. Contact `contact_category` five values.
- Same value, different label. `case_status` (`Active=Warm`, `Inactive=Cold`). `client_availability_completed` (`Confirmed=Yes`). `n1` and `n2` (`Medicaid FFS - NY=Medicaid FFS`).
- Not an option change. `maladaptive_behaviors__clinical` is a checkbox in production and text in sandbox. `severity_level_clinical` is a select in production and a radio in sandbox. Those differ by field type, so adding options alone does not match production.

**Remains.** The relabel rows and the field-type rows are not covered by "add options" and need a yes or no. The production-testing check for NJ and CO Medicaid.

### 5. Total Assigned Hours

**Decision.** The `1 + 1` behavior is not in the Drive source of truth. Do not copy the formula into sandbox. Production testing confirms whether a live Case sends the real assigned hours or the formula result `2`. Recorded as a row in `SANDBOX-DONE.md` **Production verification** and as a line under item 5 in `CHECKPOINT.md`.

**Confirmed.** Drive section 3, Total Assigned Hours (97153), says "Use total_hours_bt1bt2_work_schedule (calculated, filled on 2,617 cases)" and says to ignore `total_hours_bt_12_work_schedule` and `total_hours_btrbt_12`. It does not mention a formula or a stored value of 2. The `2` is inferred from the properties API formula (`ws1-schema-diff.md` line 420) plus `buildClientMetadata.mjs` lines 328 to 331, not from a record. The earlier review's suggestion to switch to `total_hours_bt_12_work_schedule` is withdrawn, because Drive says to ignore that field.

**Remains.** The production-testing confirmation.

### 6. CentralReach field 138703

**Decision.** No operator answer. The review recommendation stands until confirmed. Keep 138703 for both record links, and read it back on BT/RBT employee 5324528 and BCBA employee 5324527 during WS.2.

**Remains.** Operator confirmation.

### 7. Guardian, BCBA personal email, staff phone, `current_primary_bt`

**Decision.** Confirmed. The Drive pending section stands, and the production sync-property setup is still to be confirmed. Sandbox WS.2 keeps reading the Case guardian fields. If production does not use those sync properties, the fallback reads Guardian first name, last name, and email from the Parent/Guardian Contact (`firstname`, `lastname`, `email`). `guardianFromContact` in `buildClientPayload.mjs` lines 119 to 130 already is that fallback and has no caller. It is kept, not wired, and not deleted. This replaces the earlier review's "delete `guardianFromContact`". No code in this pass.

**Confirmed.** Drive section 3 Guardian row says "firstname + lastname on the Contact linked to the Case (association type 3, unlabeled) whose contact_category = Parent/Guardian." The pending section says to replicate the sandbox Case guardian sync configuration in production. BCBA personal email "is a planned sync-property addition; the note does not confirm completion." The staff phone "exact destination internal name is not recorded." `current_primary_bt` "may need a workflow or custom code action", which "was a consideration, not a confirmed implementation." The pending section also lists the alternate-service-address workflow, which none of the nine items covered.

**Remains.** Production internal names for the Case guardian sync fields and the staff phone sync field. Whether production uses the sync properties or the Contact fallback.

### 8. BT/RBT `postal_code`

**Decision.** Do not create it. None of the fetch-list names are archived in production, and BT/RBT `postal_code` exists on neither portal. "Created in prod, and then create the exact replica in production if it needs to be mapped" is read as the mapped fields sandbox has and production must mirror. For the writeback fields that is already done (item 3). No property is created from that sentence.

**Confirmed.** Drive section 6 BT/RBT mailing address lists `postal_code_home` and work address `postal_code__work_`. No `postal_code`.

**Remains.** The WS.2 cleanup of the BT/RBT `postal_code` fetch and fallback is still a recommendation and was not decided. Confirmation of the reading of the ambiguous sentence.

### 9. Comorbid and maladaptive

**Decision.** Confirmed. The mappers stay unchanged. Re-read production definitions before any mapper change. This is also a production-testing check, because the clinical properties may be deleted before Thursday.

**Confirmed.** Drive Danny 10/28 item 5 says "only the main fields. We're merging the clinical versions in and deleting them before Thursday." The section 3 Maladaptive row says "don't map the clinical field". The code already reads only the parent field. The Comorbid row still says "Likely `does_your_child_have_any_other_comorbid_diagnoses_` ... Confirming with Sara."

**Remains.** The production re-read. Comorbid still reads `comorbid_diagnosis__clinical`.

## Decisions, pass 3 (2026-10-28 late)

**Drive read.** The full guide was read in ranges from line 1 through the sandbox assets list (W1 to W6, review notes, Hybrid Change Detection MVP, line 717). The credential link in the prod-access paragraph is not copied here. Drive takes precedence over the review.

### Nine sandbox properties still missing (item 1 and item 4 scope)

The operator decided that Drive wins. A sandbox property is mapped only when the Drive field map names it. Every one of the nine is still created in sandbox for parity, from its production definition.

| Object | Property | Drive | Mapping |
| --- | --- | --- | --- |
| Case | `hours_bt_work_schedule_1` | Section 3, Total Assigned Hours (97153): "Per-BT hours: hours_bt_work_schedule_1 and hours_bt_work_schedule_2." | Named, but Drive gives no separate CentralReach field. Open. |
| Case | `hours_bt_work_schedule_2` | Same sentence. | Named, no CentralReach field. Open. |
| Case | `total_hours_bt_12_work_schedule` | Section 3: "Two older totals exist (total_hours_bt_12_work_schedule 59 cases, total_hours_btrbt_12 20 cases); ignore them." | Not mapped. Decided. |
| Case | `total_hours_btrbt_12` | Same sentence. | Not mapped. Decided. |
| BCBA | `full_name` | Section 5, Legal Name: "first_name + last_name (also full_name)." | Named only as an alternate for Legal Name. Open. |
| BCBA | `gender` | Section 5, Gender: "gender_new (Male/Female, 251 filled). The old gender is archived-in-place; don't use it." | Not mapped. Decided. |
| BT/RBT | `active_cases_count` | Section 6, Active Staffed: "the HubSpot field is active_cases_count". Section 10: "Confirm HubSpot should own this count, then create the field and test one employee update." | Named, but the CentralReach field does not exist yet. Open. |
| BT/RBT | `bt_to_rbt_path` | Section 9: "BTs working toward RBT moved to a separate field (bt_to_rbt_path), which doesn't affect the label." | Drive gives it no CentralReach destination. Not mapped unless the operator says otherwise. |
| BT/RBT | `state_home` | Section 6, Mailing Address: "street_home, location_city, state_home, postal_code_home, employee_phone." | Mapped by Drive. The code reads `location_home` for state today (`buildEmployeePayload.mjs` line 305). |

**Later work, in this order, not this pass.** For each meta field Drive says to map:

1. Create the sandbox field from the production definition.
2. Call the CentralReach API for the metadata field id of the matching CentralReach field.
3. Update the code so the sync uses that id.

`state_home` feeds the CentralReach employee state, which is a core field, not metadata. Step 2 may return nothing for it.

### Field-type gaps (item 4)

Accepted, not executed. Where HubSpot cannot make a sandbox field match production, record one limitation per object per field. That list goes on the production-testing list when implementation is allowed.

### Stored values (item 4)

When the sandbox stored value already matches production, the label is not changed. That covers `case_status` (`Warm` / `Cold`), `client_availability_completed` (`Yes`), and the NY Medicaid option on `n1_what_type_of_insurance` and `n2_what_type_of_insurance`. The Drive appendix lists each of these as a label that differs from its stored value.

### CentralReach field 138703 (item 6)

Decided. 138703 stays for both record links. Sandbox end-to-end note: after a write, review the value on one BT/RBT and one BCBA, and confirm whether either needs its own CentralReach field. Recorded in `SANDBOX-DONE.md` sandbox done rule 4.

### Guardian (item 7)

This supersedes pass 2. The behavior is now live code, not a comment. A separate worker is building it in `src/`. This review did not read or edit that code.

- The workflow fetches the Case and the Contacts associated with it by association type 3.
- A Contact counts only when `contact_category` is Parent/Guardian.
- If exactly one such Contact exists, it supplies `firstname`, `lastname`, and `email`.
- If there are zero or more than one, the sync uses the Case fields `guardian_first_name`, `guardian_last_name`, and `email`.
- Production testing still confirms whether the Case sync properties remain the source.

Why two guardians fall back to the Case. Drive has a rule in words. Danny 10/28, Sara's answer 1, says "Guardian: the Parent/Guardian contact whose email is used for parent communication." Drive section 3 says "HubSpot has no primary flag on case contacts". No HubSpot property marks the contact whose email is used for parent communication, so the code cannot apply the rule. The Drive MVP section also supports a direct Contact read: "Retain direct related-record retrieval where those fields do not supply the required data."

### BT/RBT `postal_code` (item 8)

The fallback in `buildEmployeePayload.mjs` line 320 and the fetch stay in the code. Production-testing note: this is unresolved and must be verified. `postal_code` exists on neither portal's BT/RBT object, so the fallback returns nothing today. Recorded in `SANDBOX-DONE.md` **Production verification**.

### Exact-replica sentence

"Created in prod, and then create the exact replica in production if it needs to be mapped" stays closed. It covers the writeback fields, which already exist in production. Nothing is created from it.

### Gaps from the full Drive read, not decided

Each gap below is a code read against Drive. Nothing was run.

- **BCBA gender.** Drive section 5 maps Gender from `gender_new`, and sandbox W3 triggers on it. The BCBA payload sends no gender, and `gender_new` is not in `BCBA_PROPERTIES`.
- **Care Coordinator.** Drive sections 3 and 5 map Care Coordinator from `hubspot_owner_id` via the owners API. `CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR` (138851) exists but is never written, and `hubspot_owner_id` is not fetched. Sandbox W1 and W3 trigger on it.
- **Service Location Address "Other".** `buildClientMetadata.mjs` lines 186 to 192 join `service__street_address`, `service__apt`, `service__city`, and `service__postal_code`. None of the four is in `REQUIRED_DEAL_PROPERTIES`, so that join is always empty. `service_address__other` is fetched and is used first.
- **BT/RBT work apartment.** Drive section 6 Work Address lists `apartment__work`, and sandbox W2 triggers on it. It is not fetched.
- **Alternate service-address workflow.** Still listed in the Drive pending section. None of the nine items covers it.

## What WS.2 needs from this review

- WS.2 code edit: item 2 (constant 98 to 163). The guardian Contact read is in progress with another worker.
- Later meta-field work, three steps, not started: the nine properties above, mapped only where Drive names them.
- WS.2 sandbox schema: item 4 option adds (new stored values only) and the nine sandbox creates. Each create reads the production definition first.
- WS.2 test notes: item 1 (type the name fields), item 2 (attach 163), item 4 (production option values only), item 6 (138703 read-back).
- Production testing: item 3 (writeback credential), item 4 (NJ and CO Medicaid, field-type limitations), item 5 (hours), item 7 (Case sync properties vs Contact), item 8 (`postal_code` fallback), item 9 (comorbid re-read).
- Nothing in this pass created a HubSpot property.
