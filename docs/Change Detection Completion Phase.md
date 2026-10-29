# Change Detection Completion Phase

**Status:** Plan only. Do not implement, deploy, or write sandbox records until the user says to start step 1.

**10/28 update:** Danny’s note on the [Google Doc, tab `t.0`](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0) closes several rows below. Where this file still says “waiting,” the 10/28 section in [`CHECKPOINT.md`](CHECKPOINT.md) wins. The code has not been changed to match those decisions yet.

**Audience:** An agent implementing or verifying this phase.

**Baseline on GitHub:** [`f215d9d`](https://github.com/Optidge/azure_central_reach/commit/f215d9dc945ae494a5813ffb883b0abe09894352) on `main` — hybrid webhook plus linked-recheck change detection. Review that revision. Do not treat an older snapshot as current, and do not reinstate behavior that commit already removed.

**Branch `align-sandbox-hubspot-field-sync`:** Comments on the Case and staff fetch lists, and on the matching mapping lines, document the sync-property read path below. The Case fetch comments also name the production sensitive-data tier (portal `50317927`, Integration V2 API rule #2). Portal `50850427` cannot store sensitive properties. Those comments are committed on the branch, and the branch is pushed to GitHub. GitHub `main` does not contain the branch commits. This document is the instruction until the branch merges. `.test-evidence/` is gitignored. Do not edit it while a live test run owns that folder.

---

## What we are solving

Sandbox change detection is only partly proven. Address populate, clear, repopulate, and restore already passed on the three sandbox records (Case `102`, BT `202`, BCBA `302`). The rest of the HubSpot → CentralReach map is not done.

The mistake to avoid: treating the saved sandbox workflows as the list of fields that must sync. Those workflows (W1 Case, W2 BT/RBT, W3 BCBA) are the fast signal. They watch a subset of properties. The map is the Google Doc sections named below. A workflow enrollment, an HTTP 202, or a changed hash is not a completed row.

Both entry paths must land on the same Azure compare-and-update path:

1. **Fast path.** HubSpot workflows call `POST /api/hubspot-webhook` with `objectTypeId` and `recordId` only. Azure reads the mapped values.
2. **Backup path.** `intakePoller` does bounded discovery plus a linked-record recheck, then enqueues the same queues the webhook uses. The timer stays off until the webhook path on that build is healthy, then it is turned on for the sandbox end-to-end. Sandbox is not done if the poller is left off or written down as deferred. Production stays off.

---

## Goal

Finish sandbox change detection so a gated Case, BCBA, or BT/RBT pushes its full mapped set, then every later mapped change. That includes clears, inactive transitions, staffing, and values whose source of truth is a Contact or a staffing association.

Change detection is complete when every HubSpot → CentralReach row in source-of-truth sections **3, 4, 5, 6, 7, and 9** is either synced or explicitly blocked by a named open decision. Section **8** (BCBA dashboard labels) is in scope with section 5. Section **11** is the trigger and signal contract, not a field map.

Production rollout, the backfill of the ~74 cases that already have a CentralReach client id, and new destination label IDs are out of this sandbox phase. The backfill rule is decided (those cases sync without the checkbox) and waits until full production tomorrow. Staffing-signal behavior is a separate workstream. Missing sandbox properties, including the production staffing trigger names, are still in this phase and must exist before sandbox intake testing is finalized.

---

## Authority

When these disagree, use them in this order:

| Question | Authority |
| --- | --- |
| What should sync, and which object owns the value | [CentralReach to HubSpot Integration (Optidge V2)](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit). Sections 3, 4, 5, 6, 7, 8, 9, and 11. Portal `50317927` in that doc is production. |
| What the repo does today | [`docs/hubspot-centralreach-field-mappings-current-state.md`](https://github.com/Optidge/azure_central_reach/blob/main/docs/hubspot-centralreach-field-mappings-current-state.md) |
| Where to find the Drive doc from the repo | [`docs/SOURCE-OF-TRUTH.md`](https://github.com/Optidge/azure_central_reach/blob/main/docs/SOURCE-OF-TRUTH.md) |
| How a field is read in this phase | The sync-property callout in this file. The guide still says where the value lives. Azure reads the synced copy. |
| Which Case fields are sensitive in production | Integration V2 API rule #2, recorded in [`Sandbox props & labels_summary.md`](Sandbox%20props%20%26%20labels_summary.md) and on `REQUIRED_DEAL_PROPERTIES`. The webhook sends the record id only. The deal GET needs `crm.objects.deals.sensitive.read` on portal `50317927`. |

Sandbox portal is `50850427`. Function App is `centralreachserverless`. Do not change production portal `50317927` or production workflows.

---

## Callout: read the synced copy

The user is putting property sync on the Case, BCBA, and BT/RBT records in production so Azure does not query Contacts or staffing associations for these values. A change on the source (including a Contact property the setup assistant maintains) copies onto the record Azure already watches, which is what makes the edit detectable.

Keep the guide’s placement as the authority for where the value lives. Read the property named in the right-hand column. Do not add a Contact or association fetch to fill these fields.

| Value | Where the guide puts it | What Azure reads |
| --- | --- | --- |
| Guardian first name, last name, email | Section 3, Parent/Guardian Contact (`firstname`, `lastname`, `email`) | Case `guardian_first_name`, `guardian_last_name`, and `email`. The Case internal name for guardian email is not recorded yet. `email` is the Case field read today. |
| BCBA personal email | Section 5, BCBA Contact `email` (association 17) | BCBA `email`. The production sync property’s internal name is not confirmed. |
| BCBA work email | Section 5, on the BCBA, not the Contact | `ucaba_email_address`. The code reads `work_email` today. Point the builder at the guide name when implementing. |
| Staff phone | Section 5 on the BCBA and section 6 on the BT/RBT. Both are Contact mirrors. | `employee_phone` on that staff record. Production adds a sync from Contact home and phone. The new internal name is not recorded yet. |
| Alternate service address | Section 3, already on the Case. A workflow copies the additional service-address field. Not a Contact field. | `if_services_will_be_in_more_than_one_location__list_the_other_addres`, then home street. |
| Primary BT 1 and Primary BT 2 names | Section 4, Case-to-BT associations 76 and 143 | Case `current_primary_bt` and `current_primary_bt_2`. Danny (10/28): production workflows already trigger on these name fields, because workflows cannot trigger on association labels. Do not fetch association types 76 or 143 for the name. |
| Supervising BCBA and IA BCBA names | Section 4 name rollups on the Case. Section 3’s CentralReach supervising-BCBA value is the Case text field `ongoing_central_reach_provider_supplier`. IA BCBA is association 86. RE BCBA name is `reassessment_bcba_name`. | Production triggers Danny named: `supervising_bcba_name`, `ia_bcba_name`, `reassessment_bcba_name`. This file and the code still say `supervising_bcba` and `initial_assessment_bcba`. WS.1 must confirm which internal names exist. Do not invent a rename before that read. Do not load the BCBA association for these names. |
| Case status and staffing status | Section 7, on the Case. Derived rollups, not Contact copies. | Not in the fetch list yet. Add them when implementing. Do not treat them as Contact fields. |

`create_record` is not the gate.

If a production sync property’s internal name is still unknown, leave the current read in place, name the gap in the coverage matrix, and do not invent a property name.

---

## Section 11 signal contract

- **Case gate for new records:** `enter_in_central_reach` contains `Yes`. It is a multi-checkbox. Use contains, not equals.
- **Backfill (decided, not this phase):** a Case that already has a CentralReach client id will sync without that checkbox. About 74 cases. Implement and run that only in full production tomorrow. Sandbox keeps the Yes token.
- **BCBA gate:** `entered_in_centralreach` = `Yes`.
- **BT/RBT gate:** `entered_in_centralreach` = `Yes` (label “Yes - Active”). “Yes - Generic” and “No- Made Inactive” stay blocked. Sara has not answered those two values.
- **No pipeline or stage restriction after the gate.** Inactive stages still sync. That is how the Inactive label reaches CentralReach. Cleanup stages stay out of CentralReach. United Care is moving those cases to Inactive in HubSpot (10/28).
- **One-way latch.** If someone clears the gate later, keep syncing.
- **Contacts get a fourth ongoing workflow (decided 10/28).** It watches guardian name and email, and BCBA personal email. Workflows cannot watch association labels. Staffing fast-path triggers are the Case name fields production already uses: `supervising_bcba_name`, `ia_bcba_name`, `reassessment_bcba_name`, `current_primary_bt`, `current_primary_bt_2`.
- **Writeback fields stay out of triggers.** Do not enroll workflows on the CentralReach id, profile link, `employee_id`, `external_system_id`, or `last_sync_*` fields Azure writes back.
- **Derived values are in scope:** `case_status`, `staffing_status`, BCBA/BT name rollups. Reassessment does not get its own stage mapping. Staffed comes from `staffing_status` (10/28).

W1–W3 watch a subset (about 13, 16, and 12 properties) and branch on an existing CentralReach id. W4–W6 watch the entry property as known/unknown, not “equals Yes.” Azure keeps the real gate. Re-read the saved sandbox workflow definitions before changing them. Update sandbox workflows only where a mapped row can change and neither the current workflow nor a tested poller sweep will see it in time. Do not add triggers for blocked rows. Do not change production workflows.

---

## Outcome

A row is done only when HubSpot readback, Azure processing (`last_sync_status` and correlation), and a CentralReach API readback agree.

| Layer | Done when |
| --- | --- |
| Mapping | Each approved row is fetched, compared, and written. Open decisions stay listed and are not coded. |
| Fast signal | Each implemented row has a sandbox known-and-unknown trigger, or a documented reason the poller is its only signal. |
| Backup | With webhooks not involved, the sandbox poller still detects a mapped change on an already linked record and writes CentralReach. |
| Latch | Unticking the gate on an already linked record still updates CentralReach. |
| Clears | Populate, replace, clear, and repopulate work for mapped values and for integration-owned labels. Staff-owned labels stay. |
| Records | The original three sandbox records return to address baseline `102` / `202` / `302` and their other pre-loop values. Extra records from later rounds return to the values they started with. |

### What the code must cover

Current fetch lists are narrower than the guide. Use the guide’s internal names.

**Section 3 — Case.** Legal name, gender, DOB, mailing address, guardian from the Parent/Guardian Contact whose email is used for parent communication (10/28), care coordinator, supervising BCBA from `ongoing_central_reach_provider_supplier`, work schedules, client availability, assigned hours, approved auth hours, auth period, both service locations, allergies plus explanation, parent maladaptive behaviors, severity, important information, primary and secondary insurance and IDs, physician and NPI by insurance type, diagnosis, Medicaid referring-provider ID, ASD diagnosis dates, policyholder name and DOB, referral source. Danny said comorbid and maladaptive use the main fields only, and that clinical copies are deleted before Thursday. **Confirm the live property names before changing the mapper.** Do not stop reading `comorbid_diagnosis__clinical` until that confirmation. A read-only Case field “Grad Permit BCBA” is coming before Thursday. Do not invent its internal name.

**Section 4 — Staffing.** IA BCBA (86), RE BCBA (145), Supervising BCBA (82), Primary BT 1 (76), and Primary BT 2 (143). Ignore unlabeled companions and candidate roles. Confirm sandbox type IDs before treating the production IDs as universal. Name rollups are read from the Case (callout above). A relationship is done only when the CentralReach destination changes, not when it only changes the hash. Association retrieval has a page ceiling: an incomplete page must not be saved as a complete baseline.

**Section 5 — BCBA.** Legal name from `first_name` and `last_name`, `gender_new`, work email `ucaba_email_address`, mailing address and phone from the Contact mirrors (read `employee_phone`), personal email from the linked Contact (read the BCBA sync), `work_status`, owner, Medicaid IDs, and `ny_insurance_labels`, `nj_insurance_labels`, and `co_insurance_labels`. Stop using `credentialed_insurances__ny` and `bcba_name` as the mapped sources. BCBA now has `employee_id` (“Employee ID (from CR)”) and `external_system_id` (“External System ID”) on the CentralReach IDs card, same internal names as BT/RBT (10/28). CentralReach External System ID is the Workday ID. For BCBAs, send `workday_id`. On BTs, 77 of 79 already match `workday_id`. Keep both id fields out of workflow triggers.

**Section 6 — BT/RBT.** Legal name from `first_name` and `last_name`, gender, email, home address and phone (read `employee_phone`), work address including apartment, `bt_rbt_type`, and `location`. Active Staffed stays blocked until the CentralReach Active Case Load field is identified. The guide answer is “Profile → Employee Case Load,” which is not an API field in this repo.

**Section 7 — Client labels, service location, funding.** `case_status` Warm/Cold drives Active/Inactive. `staffing_status` Staffed adds Staffed, and a blank removes it. `location` drives NY/CO/NJ Client. `specific_home_location` drives Home. Funding labels follow `insurance_primary` plus location, including the Carelon group. NJ Client has no label ID in code today.

**Sections 8 and 9 — Staff labels.** BT/RBT type crossed with work state. BCBA work state, LBA NY, Grad Permit, credential labels, and billing-hold add/remove.

**Already proven. Do not re-test as if it failed.** Case, BT, and BCBA address populate, clear, repopulate, and restore.

### Leave these uncoded until someone decides

| Decision | Why it blocks a row |
| --- | --- |
| Anthem BCBS, UHC, and payors with no CentralReach label | Section 7 funding. Still open. |
| NJ insurance labels, Aetna-CO, Cigna-CO, Carelon-CO | Section 8. HubSpot has them. The sheet has no CentralReach label. Still open. |
| SUB BCBA (234) | Section 4. Not answered on 10/28. |
| BT “Yes - Generic” and “No- Made Inactive” | Section 11. Still open with Sara. |
| Active / Staffed labels in CentralReach | Section 6 and 7. Pessy is confirming the labels exist. Do not invent the Active Case Load field. |
| Closed Lost, Restaffing-BCBA AND BT Needed | Not answered on 10/28. `case_status` and `staffing_status` still sync. |

Decided on 10/28. Do not put these back in the waiting list. The code may still do the old thing until a later change:

| Decision | What to do |
| --- | --- |
| Backfill | Cases that already have a CR client id sync without `enter_in_central_reach`. About 74 cases. **Production tomorrow, not sandbox.** |
| Guardian when two exist | The Parent/Guardian contact whose email is used for parent communication. |
| Comorbid and maladaptive | Danny: main fields only, clinical copies deleted before Thursday. **Confirm in the portal before changing code.** |
| New Mexico and Virginia | Skip for now. |
| Cleanup stages | Leave them out of CentralReach. HubSpot moves those cases to Inactive. |
| Reassessment | Staffed comes from `staffing_status`, not from a stage map. |
| Grad Permit BCBA | Read-only field on the Case, internal name not sent yet. |
| Contact workflow | Fourth ongoing workflow for guardian name/email and BCBA personal email. |
| Staffing triggers | Name fields listed above, not association labels. |
| BCBA external id | Send `workday_id` as CentralReach External System ID. |

### Safety checks that still apply

- A blank HubSpot value must clear the integration-owned CentralReach value. The first baseline must not treat a pre-existing CentralReach value as already reconciled when HubSpot is blank.
- Metadata DELETE and label removal run only for fields and labels this integration owns.
- An incomplete association page must not be saved as a complete baseline.
- A required CentralReach or HubSpot failure must not advance the success hash.
- Overlapping webhook and poller work for one record must end on the latest state and must not create a second client or employee.
- Lease release must not drop a newer worker’s lock. If that cannot be proven in this phase, record it as a known limit. Do not call the phase complete on concurrency.

---

## How to verify

Phases 0–5 in `.test-evidence/TEST-RUN-SUMMARY.md` are the previous test. The next end-to-end is WS.2 in [`CHECKPOINT.md`](CHECKPOINT.md): close sandbox gaps, keep the sensitive limitation, run the queues, and turn the sandbox poller on for one linked-record test. Production poller stays off. The original three records stay the address baseline. Drive the new run with the HubSpot CLI and the Azure CLI. Evidence for each row is the HubSpot value, the Azure correlation and `last_sync_status`, and a CentralReach API readback. Do not put patient values in the write-up. Do not write `.test-evidence` while another test run owns that folder.

1. **Matrix.** One table: guide row, HubSpot property, CentralReach destination, fetched, compared, written, fast trigger, poller coverage, test result or blocked decision. A workflow property with no mapping is “signal only,” not passed.
2. **Each implemented row.** Set a value, change it, clear it, set it again. Multi-selects get add, remove, replace, and full clear. Restore the original.
3. **Section 11 paths.** Gate on, then a mapped edit in an inactive stage. Clear the gate and edit again; the latch must still sync. Change IA, RE, or Primary BT association. Edit the guardian Contact and the BCBA personal Contact and confirm the Case or BCBA sync property is what Azure reads. Change `case_status` and `staffing_status`.
4. **Poller only.** Suppress the fast signal for one approved synthetic edit and confirm CentralReach updates from the poller. Prove one linked record past the first page is still checked when its parent timestamp did not change.
5. **Failure.** Force one required metadata failure and confirm the success hash does not advance and a retry still applies the change.
6. **Restore.** Case, BT, and BCBA addresses are back to `102`, `202`, and `302`, and every other touched property is back to its pre-loop value.

---

## Implementation order

1. Add the missing guide properties to the Case, BCBA, and BT fetch lists and to the mapped-state comparison. Point builders at the guide fields named above. Keep the sync-property read path in the callout.
2. Deploy that revision to the sandbox Function App only (`centralreachserverless`, portal `50850427`).
3. Update sandbox workflows W1–W3, plus a Contact or association signal only where HubSpot can send one and the Case or staff record will not show the change. Re-read the saved definitions before testing.
4. Run the row loop with the poller still off.
5. Enable the sandbox poller and run the backup test with the queue workers processing. The poller is required for this phase. Leave it enabled in sandbox only if that test passes. Production stays off.
6. Restore the three records and publish the matrix with passed, blocked, and not tested rows.

---

## Files to review

Links are GitHub `main`. Symbol names are the stable handles. Line numbers on `main` will not match the local comment-only working tree.

### Business spec

- [Google Doc — Optidge V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit) — sections 3, 4, 5, 6, 7, 8, 9, and 11
- [`docs/SOURCE-OF-TRUTH.md`](https://github.com/Optidge/azure_central_reach/blob/main/docs/SOURCE-OF-TRUTH.md)
- [`docs/hubspot-centralreach-field-mappings-current-state.md`](https://github.com/Optidge/azure_central_reach/blob/main/docs/hubspot-centralreach-field-mappings-current-state.md) — as-built, may lag the Google Doc
- [`docs/poller-backup-contract.md`](https://github.com/Optidge/azure_central_reach/blob/main/docs/poller-backup-contract.md) — webhook primary, poller backup
- [`f215d9d`](https://github.com/Optidge/azure_central_reach/commit/f215d9dc945ae494a5813ffb883b0abe09894352) — current hybrid detection commit

### Fetch lists and orchestration

- [`src/workflows/clientSyncWorkflow.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/workflows/clientSyncWorkflow.mjs) — `REQUIRED_DEAL_PROPERTIES`
- [`src/workflows/employeeSyncWorkflow.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/workflows/employeeSyncWorkflow.mjs) — `BT_RBT_PROPERTIES`, `BCBA_PROPERTIES`
- [`src/workflows/intakePollerWorkflow.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/workflows/intakePollerWorkflow.mjs) — eligibility search and linked recheck

### Mappings

- [`src/mappings/client/buildClientPayload.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/mappings/client/buildClientPayload.mjs)
- [`src/mappings/client/buildClientMetadata.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/mappings/client/buildClientMetadata.mjs)
- [`src/mappings/client/validateClientPayload.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/mappings/client/validateClientPayload.mjs)
- [`src/mappings/employees/buildEmployeePayload.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/mappings/employees/buildEmployeePayload.mjs)
- [`src/mappings/employees/validateEmployeePayload.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/mappings/employees/validateEmployeePayload.mjs)

### Comparison, gates, and constants

- [`src/lib/mappedState.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/lib/mappedState.mjs) — hash, clears, changed field names
- [`src/lib/writebackAllowlist.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/lib/writebackAllowlist.mjs) — HubSpot writeback is CR id, profile link, and `last_sync_*` only
- [`src/constants/staffingAssociations.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/constants/staffingAssociations.mjs)
- [`src/constants/centralReach.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/constants/centralReach.mjs) — metadata field IDs and label IDs
- [`src/constants/hubspot.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/constants/hubspot.mjs)
- [`src/functions/hubspotWebhook.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/functions/hubspotWebhook.mjs)
- [`src/functions/intakePoller.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/functions/intakePoller.mjs)
- [`src/functions/processClientQueue.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/functions/processClientQueue.mjs)
- [`src/functions/processEmployeeQueue.mjs`](https://github.com/Optidge/azure_central_reach/blob/main/src/functions/processEmployeeQueue.mjs)
