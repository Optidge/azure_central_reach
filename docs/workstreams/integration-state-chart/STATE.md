# Integration state chart

## Task

Produce one state chart that is also the integration flow for HubSpot to Central Reach. Include the webhook, the intake poller, and the field stages. Decide what to bring from the 2026-10-30 archive and what to leave, using the review judges and what the previous build actually did. Do not start a new test run in this task.

## Done when

- The chart is generated from a TLA+ spec in a scratch folder, with the reader's labels.
- The hand-off names each bring-over, leave-behind, and still-open item that changes a state.
- The reply says which earlier diagram this chart replaces for now.

## Current status

Last step: re-read the Google Doc on 2026-10-30, including unresolved comments. Items the guide still leaves for Zeke are under Waiting on Zeke. The first deploy is confirmed only after the remaining open list is closed.

## Key facts

- Fresh repo: this checkout, branch `review_and_update_code`.
- Previous build the user named `azure_central_reach_recovery`. That folder is not on disk under Desktop, Documents, or the Optidge project directory, and GitHub has no `Optidge/azure_central_reach_recovery` or `ezekielswanson/azure_central_reach_recovery`. A prior recovery review on 2026-10-30 also found no folder and no `recovery/clean-baseline` ref. The previous build that does exist is the archive at `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach_backup_2026-10-30` (branch `align-sandbox-hubspot-field-sync`, tip `a8e3be7`). The archive trace is already reading that checkout. Notion and Asana are not chart sources.
- Judges: `docs/workstreams/repository-review-confirm-and-update/` (five files) plus `docs/Azure_repo_recovery_handoff.md`.
- User-cited diagram: Google Doc `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`, Hybrid Change Detection MVP.
- `docs/workstreams/state chart and mapping` is missing in both trees. The earlier chart is archive `docs/poller-backup-contract.md`, title "Poller backup: one record's lifecycle". Its red breaks are an unlinked create sweep, dropping a linked record whose box is unticked, and re-queueing after our own writeback. Those three stay off the new chart. Transcript that produced it: 809092e6-01a9-4ee6-9468-153f8d12373f.
- Sandbox blockers, from the archive run notes and git. All-digit dates became null, so employee create returned HTTP 400 and the worker stored blocked with no retry. The published app skipped unless the box contained Yes, so an uncheck could not update a linked record. Requesting BT/RBT `postal_code`, which exists on neither portal, made the absent-read check fail every BT/RBT before a Central Reach call. Commit `17451af` removes that request. The date parser is still uncommitted.
- Git. `c59d580` states the webhook is primary and the poller is backup. `68c73b1` / PR #1 adds the shared hash and linked recheck. Clean HEAD does not contain archive commits `77f4224` through `0b8e785`. The handoff says do not import `16d98ee`, `ea02cbe`, `da22900`, and `0b8e785` wholesale, and says the gate and the missing-read check can move separately.
- Other local checkouts are different products. `testing_azure_central_reach` tracks `ezekielswanson/central-reach-field-mapping-backend`. `aws_central_reach` and `central_reach_app` are not this Functions app.
- Notion returned and is not a chart authority. It agrees that the webhook is for speed, the poller is the backup, create starts on Entered-in-CR Yes, and ongoing sync continues after the box is cleared. Do not let it override the Google Doc.
- Hybrid detection landed in commit `68c73b1`, merged as PR #1 (`f215d9d`).
- Chat, live infrastructure logs, error tracking, and product analytics have no connected source. Those why categories are gaps.
- Clean-tree spine, from the intake trace. Webhook, the five-minute poller, and linked recheck are three doors into one queue. They are not ordered stages of one record. After the worker maps, it writes Central Reach, skips an unchanged hash, blocks an employee create, or fails and retries. Writeback is what returns the record to "waiting for a newer HubSpot edit." Only the poller's `shouldSync*` gate uses that wait. The webhook and linked recheck do not.
- Example host flags disable `intakePoller`, `processClientQueue`, and `processEmployeeQueue`. The webhook is not in that disable list. Employee create stays off unless put-only mode is off and employee create is on. Both example keys are absent, so the code default blocks a new employee.
- Coalesce still enqueues. A blocked employee with no Central Reach id is blocked again on every later message. `SYNC_STALE` can leave Central Reach ahead of `last_sync_hash`. Client noop skips metadata. Employee noop still writebacks.
- Bring into the fresh repo, from the judge review. The date-parser hunk. The exact-`Yes` or already-linked gate (`Yes - Generic` does not count). The missing-read halt, shipped with the `postal_code` removal and the `other_address` correction. The webhook routing test only. The Yes gate is not in the clean tree today. The intake judge would run the sandbox poller without it. The other judges say a poller without the gate can create unticked records in production Central Reach. The chart draws the gate and marks that disagreement.
- Leave off the chart. The worker and poller redesign (`planAttempt`, create-sweep, never-processed search). Dry run, waiting for a person to tick Yes, and pausing workers as product states. Whole archive workflow files. Treating an absent HubSpot key as a blank delete. Label removal. Split employee queues. A 30-minute poller. Portal `50317927` and the 74 backfill cases. Changing `externalSystemId` to a Workday id.
- Employee HTTP 400 completes as blocked and stamps `integration_last_write`. It is not a failure and it does not dead-letter. That is why those employees were not retried.
- Still open, so the chart must not draw them as settled. Drive Tab 1 field rows, label ids, which date string Central Reach accepts, the mapping-version bump, live Function App settings, five minutes versus thirty, and whether the earlier test approval covers this repo.

## Google Doc tab t.0, reviewed

Settled on that tab. The create gate is Entered in CR, with no stage restriction. Case uses contains Yes. BCBA and BT/RBT use equals Yes. The 74 cases that already have a Central Reach id sync without the box. The guardian is the Parent/Guardian contact whose email is used for parent communication. Label rules include add and remove. HubSpot dates are YYYY-MM-DD and must be written as midnight UTC.

Still open on that tab. The date string Central Reach accepts, MAPPING_VERSION, the published commit, five versus thirty minutes, whether sandbox approval covers this repo, Yes - Generic, whether a blank non-label field clears Central Reach, and a blank clear of field 138703. A 2026-10-30 re-read also left these for Zeke: SUB BCBA, the five empty Case integration properties, the additional private-app scopes, the BCBA Workday id confirm, and the 10/29 production checklist. Those are under Waiting on Zeke. The tab also names portal 50317927 as the live portal and does not say the poller reads it. The six sandbox workflows, the Yes gate, the label catalog comparison, the live sandbox flags, and the employee state and gender shapes are settled below. The writeback timestamp race is a sandbox integration test check.

The tab has a one-time credential link under Prod access. It was not copied here. Remove it from the shared doc if it has already been used.

## Archive checkout, reviewed

The previous build is `azure_central_reach_backup_2026-10-30` at `a8e3be7`. The date-parser fix is only in the working tree. The committed tip still turns an all-digit date into null. The run notes say all 35 employees got HTTP 400 on DateOfBirth, and one re-trigger after the local date patch still came back blocked. Publish was not run. The archive mapping version is `guide-sandbox-2026-10-27`. The source timer is every five minutes at both the tip and `037ea72`. Thirty minutes is the written target and is not coded. `planAttempt`, the create sweep, and the never-processed search are in the archive tip and are not in `037ea72`. They stay off the chart.

Still open from the archive. Nothing there approves a fresh-repo deploy. The live app settings in the notes are from 10/29 and 10/30, and no note ties the running app to a commit on 10/30. Label numbers in the archive were found in a catalog and are not checked against the guide. `postal_code` is removed in commit `17451af` and in `poller-state-decision.md`. The newer uncommitted `HANDOFF.md` says to keep that fetch. Zeke needs to settle that conflict.

## Fresh tree, reviewed

The fresh poller enqueues from timestamps and stage filters. No source file reads `enter_in_central_reach` or `entered_in_centralreach`. A client noop still patches HubSpot, including `integration_last_write`. An employee create HTTP 400 returns `blocked` and that patch includes `integration_last_write`. An employee PUT HTTP 400 is rethrown and does not set that field. The only timer in source is `0 */5 * * * *`. `fieldRead.mjs` is absent. Whether HubSpot's modified time lands later than `integration_last_write` is inferred from `new Date()` inside the patch and was not measured.

## Git history, reviewed

`c59d580` says the webhook is the primary path and the timer poller is the backup. `17451af` drops BT/RBT `postal_code` after `6571ad5` records that all 20 sandbox BT/RBT records failed the absent-read check. That removal is on the archive tip and not on the fresh tip. `24975b5` says not to import `16d98ee`, `ea02cbe`, `da22900`, and `0b8e785` wholesale, and those four commits are absent from the fresh tip. The fresh mapping version is `hybrid-2026-10-27` from `68c73b1`. The archive version is `guide-sandbox-2026-10-27` from `77f4224`. No commit contains the date parser.

Still open in git. No commit chooses the next mapping version. Both tips still schedule the poller every five minutes, and archive `746ce10` says thirty minutes only after Zeke asks. No commit says the sandbox pass covers a fresh-repo deploy.

## Settled 2026-10-30

1. Sandbox creates require Entered in Central Reach = Yes on every initial record. Already-linked records keep syncing. The chart keeps that gate. A sandbox poller run that creates records without Yes is not approved.

7. Moved to the sandbox integration test list below. The later modified time is inferred from `new Date()` inside the HubSpot patch. It has not been measured.

8. Compared the Google Doc label names to `central_reach_test_integration/output_files/all_labels_v3.json` (95 org labels, fetched 2026-10-27 via `node get_all_labels.js orglabels`). Names still absent, so a later fetch only helps after United Care adds them:

- Staffed (section 7, `staffing_status`). No catalog name contains Staffed.
- Active Case Load. Absent from the label catalog and from the 58-field metadata config.
- New Mexico and Virginia employee labels (sections 8 and 9).
- Guide payor rows with no catalog name: Aetna or Cigna in NJ, Aetna in CO, Other, MCD-NJ, Horizon-NJ, Aetna-CO, Cigna-CO, Carelon-CO.

Section 7 Active and Inactive match catalog names Active Client `1125427` and In-Active Client `1121488`. `src/constants/centralReach.mjs` still has three old ids. CO Client is `1082500` in code and `1132648` in the catalog. NY Employee is `1107685` in code and `1132655` in the catalog. `BCBA` is `1052629` in code, which the catalog names BCBA LBA NY. The header BCBA id in the catalog is `1130668`. The discovery note says those constants were updated. This checkout still has the old numbers.

13. Zeke confirmed the six sandbox workflows are created, enabled, and on. The HubSpot workflow list call returned 403, missing the `automation` scope, so this file has no workflow ids. The receiver is `src/functions/hubspotWebhook.mjs` (`POST /api/hubspot-webhook`). The callout is `docs/Change Detection Completion Phase.md`, Section 11, the paragraph that names W1 through W6. W1 through W3 are the fast signal. W4 through W6 watch the entry property as known or unknown. Azure keeps the Yes gate.

15. Off this chart. Follow up later. The chart keeps the one employee queue this tree has.

6. The allowlisted live settings on `centralreachserverless` match `docs/sandbox_vs_production_mvp.md`. `ALLOW_EMPLOYEE_CREATE` is `true`. `PUT_ONLY_MODE` is `false`. `HUBSPOT_PORTAL_ID` is `50850427`. `intakePoller` is disabled. Both queue workers are enabled. The published commit is still unknown. The active zip deploy finished 2026-10-29 05:51 UTC with an empty message and no git SHA. `WEBSITE_NODE_DEFAULT_VERSION` is unset.

10. Employee state and gender are settled from the fetched core records. `stateProvince` is a two-letter code (`NY` on contact 4737831). A filled `gender` is the word `Male` (contact 4778843). An empty gender is stored as an empty string. Field `138703` is the employee metadata field HubSpot Link to Record, type input, in `metadata_configuration_org.json`. A blank write that clears `138703`, or a previously filled non-label core field, is not in any artifact.

Employee create on the sandbox portal. The live app already has the two flags set to allow a create. `employeeCreateFeatures` in `src/lib/config.mjs` now does the same when `HUBSPOT_PORTAL_ID` is `50850427` and both variables are unset. An explicit value still wins. Any other portal stays blocked unless the variables allow a create. That change is on `review_and_update_code` in pull request 4. It is not published to the Function App.

3. `MAPPING_VERSION` is `hybrid-2026-10-27` in `src/lib/mappedState.mjs`. `hashMappedState` hashes the mapped payload only. Changing the version string does not by itself write every linked record. It changes the value stored on the sync state and in the logs. No file picks a next string.

4. The intake poller timer is `0 */5 * * * *` in `src/functions/intakePoller.mjs`. Thirty minutes is not coded. Leave the timer at five minutes unless Zeke asks for thirty.

11. The guardian is the Parent/Guardian contact. The guide names Contact `firstname`, `lastname`, `email`, and `contact_category`. Sara's note says the contact card, the one whose email is used for parent communication. This tree reads Case `guardian_first_name`, `guardian_last_name`, and `email` (`PrimaryEmail`). The guide does not give a different Case internal name for that email. The live portal was not re-read. The connected HubSpot account is portal `246184070`.

12. Comorbid is the main field only. That is Sara's latest answer. An older "still confirming" bullet in the guide was not revised. Staff phone is `employee_phone` on the BT/RBT and BCBA payloads. The guide does not name a different destination. The alternate service address read is the truncated `if_services_will_be_in_more_than_one_location__list_the_other_addres`, then `street_address`. The guide does not name a separate source field. Client Staffed is added when `staffing_status` is Staffed and removed when that value is blank. The Staffed label is still absent from the catalog.

14. The guide says remove the Billing Hold label when `cr_billing_hold_label` goes back to No. `updateContactLabels` only POSTs `/contacts/{id}/labels`. An empty list skips the call. There is no label delete. Label removal stays off this chart.

## Sandbox integration test, confirm then

These checks are repeated in Remaining open items. That section is the current list.

- A writeback leaves `hs_lastmodifieddate` later than `integration_last_write`. Inferred, not measured.
- The label names listed under item 8 are still absent from the production catalog. Confirm with United Care before another `get_all_labels.js orglabels` run.
- The three stale ids in `src/constants/centralReach.mjs` (CO Client, NY Employee, header BCBA).
- A blank write clears employee metadata `138703` after it was filled.
- A blank write clears a previously filled non-label core field.
- Item 9 stays a sandbox write. Evidence only. Employee GETs store `dateOfBirth` as `1995-09-03T00:00:00.0000000Z`. This tree sends client dates as `YYYY-MM-DDT00:00:00.000Z` and employee dates as `YYYY-MM-DD`. The sandbox posts sent null, so Central Reach never accepted or rejected those strings from this code.
- The code already DELETEs a metadata field when the new value is blank and the prior hash was filled. A client core blank is sent as JSON null. The sandbox write is what shows whether CentralReach empties the field.

## Discover and confirm, 2026-10-30

Reviewed against `docs/workstreams/repository-review-confirm-and-update/` and the prior chat. A recommendation in a judge file is not a close. An assistant note in the transcript is not a close.

Answered, and not repeated in the remaining list.

- The poller timer in source is `0 */5 * * * *`. Thirty minutes is a written target only. Leave five minutes unless Zeke asks for thirty.
- Asana is not a source. The judge files do not use it.
- The connected HubSpot account is portal `246184070`. The sandbox portal on the app is `50850427`. They are different accounts.
- The chart keeps the exact-`Yes` gate. Already-linked records keep syncing. `Yes - Generic` does not count as that token. A sandbox poller run that creates records without Yes is not approved. The intake judge's note that the gate was not needed for the earlier sandbox test does not change the chart.
- `MAPPING_VERSION` stays `hybrid-2026-10-27`. No next string is chosen. A bump is not required before the first deploy.
- The allowlisted live flags recorded above stay settled. The judge files did not re-read Azure, and this pass does not reopen them.
- Zeke confirmed the approval rule. The first deploy of this fresh repo is confirmed when every item in Remaining open items is closed. The handoff file does not authorize a deploy by itself.

## Remaining open items

Closed earlier, and not repeated below. Items 1, 3, 4, 7, 8, 11, 13, and 15 are settled above. Comorbid, staff phone, and the alternate address read are settled above. Label removal is a known code gap and stays off this chart. The first deploy waits on this list.

### Still with Sara

2. BT/RBT "Yes - Generic" and "No- Made Inactive." No confirmation is in the guide note, the judge files, or the prior chat. The token rule above is separate from these option labels.

### Still with United Care

The Staffed label, and the payor rows in item 8. Pessy is confirming that the Active and Staffed labels exist. They are not in `all_labels_v3.json`. Active Client `1125427` and In-Active Client `1121488` already match catalog names.

The three stale ids in `src/constants/centralReach.mjs`. CO Client is `1082500` in code and `1132648` in the catalog. NY Employee is `1107685` in code and `1132655` in the catalog. `BCBA` is `1052629` in code, which the catalog names BCBA LBA NY. The header BCBA id in the catalog is `1130668`. Neither tree proves the code numbers.

### Sandbox integration test

Whether a blank write clears field `138703` after it was filled, and whether a blank write clears a previously filled non-label core field. The code path is described above. The Central Reach result is not.

The date string Central Reach accepts. Employee GETs store `dateOfBirth` as `1995-09-03T00:00:00.0000000Z`. This tree sends client dates as `YYYY-MM-DDT00:00:00.000Z` and employee dates as `YYYY-MM-DD`. The sandbox posts sent null, so that run does not show which string Central Reach accepts.

Whether a writeback leaves `hs_lastmodifieddate` later than `integration_last_write`. Inferred from `new Date()` inside the HubSpot patch. Not measured.

### Waiting on Zeke

The published commit on `centralreachserverless`. The 2026-10-29 zip deploy has no git SHA. The handoff's recorded build `037ea72` is unverified and is not that zip. The allowlisted flags are settled above.

BT Active Staffed. Section 6 asks what that row is on the Central Reach side. Section 10's next step is still open: confirm HubSpot owns `# of Active Cases` (`active_cases_count`), create an employee metadata field for that count, and test one employee update. There is no Employee Case Load API. The comment on that row is unresolved. This is separate from the missing Staffed label.

SUB BCBA. Section 4, association type 234. The guide asks whether Central Reach needs the substitute when On Leave BCBA is 236. The comment dated 10/27 says "REVIEW ZEKE" and is unresolved.

The five Case integration properties. Section 10 asks which of these are still needed: `updated_by_integration`, `integration_last_write`, `employee_id`, `supervising_bcba`, `create_record`. The guide says all five are empty.

Production private-app scopes. Section 10 says the sensitive read and write scopes are already set. It still lists additional scopes to add: custom objects, appointments, and tickets.

BCBA External System ID. The 10/29 note says confirm this in production testing. The guide says Central Reach's External System ID is the Workday ID, and that a BCBA can send `workday_id`, because 77 of 79 BT values match. The chart still leaves the Workday id unchanged until that confirm.

The 10/29 production checklist. The heading says leave it for now, and it is not closed. Replicate the sandbox property sync for guardian first name, last name, and email onto Case in production. BCBA personal email is not confirmed. Create the production staff phone sync field. Create the alternate service-address workflow. `current_primary_bt` is only a consideration, not a confirmed build.

The guide's minimum changes before production name one item that is not already on the sandbox list: rapid-notification loss. Blank metadata, the employee timestamp, and an intentional blank versus a failed read are already on the sandbox list or in the bring-over notes.

The BT/RBT `postal_code` fetch. Archive commit `17451af` removes that request. A newer uncommitted archive `HANDOFF.md` says to keep it. The clean tree still requests `postal_code`. The recovery review recommends removing it with the missing-read halt. Zeke has not chosen. The guide maps BT/RBT mail and work postal fields as `postal_code_home` and `postal_code__work_`, not `postal_code`.

## Open

The list in Remaining open items is the current list. Notion is not a chart authority. Asana is not in use. Do not deploy, and do not start an end-to-end run, while any item in that list is open. The first deploy is confirmed when that list is closed.

##my follow ups after task
Remove Asana from the requirements. We are not using Asana.
Google doc to review is here 
https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0
The previous Azure build will be referenced here -in the archive checkout 
The previous build is the archive checkout, not a repo named azure_central_reach_recovery



##List all open items for the reviewers. For any open items, please review and then determine if the open items can be answered or left as open items. If there are any left as open items, then list them as the remaining open items, please.