# Sandbox integration

## Task

Keep this file as the context for sandbox integration. The write-up below is the record. Do not build a TLA+ state chart from it. Do not start a sandbox test run from this file alone.

## Done when

- This file holds the 2026-10-30 write-up.
- The previous build named here is the archive checkout.
- Remaining open items are only the ones a read of this tree could not close.

## Current status

Sandbox setup is underway. The user will provide the updated context of what will be tested in the sandbox. Do not invent that test list. Do not create HubSpot records. The user creates and updates test records with the HubSpot CLI. This checkout is branch `sandbox-integration`. The poller interval stays at five minutes until the user asks for a different interval.

Deployed 2026-10-30 from this checkout, commit `fc3505f`, to Function App `centralreachserverless`. Publish zip `7a16932e-3d09-4c75-8766-bb11c0e2403c`. Host reported Running. `AzureWebJobs.intakePoller.Disabled` is `false`. Both queue workers stay enabled. `HUBSPOT_PORTAL_ID` is `50850427`. The timer in the published source is `0 */5 * * * *` in `src/functions/intakePoller.mjs`. This app writes production Central Reach. The Yes gate is still absent from this tree.

Property type, confirmed 2026-10-30 with `hs api` on account `UnitedCare_Test_Integration`. `integration_last_write` is `type` `datetime` and `fieldType` `date` on deals, BT/RBT `2-55656309`, and BCBA `2-55656302`. Create the 24-hour report on sandbox portal `50850427` only. The connected MCP account is portal `246184070`. Do not create the report there.

What is already checked. There is one Function App, `centralreachserverless`, in resource group `centralreachintegration`. It is the HubSpot sandbox runtime. `HUBSPOT_PORTAL_ID` is `50850427`. It writes production Central Reach. There is no second production Function App in the docs. The published package is still the 2026-10-29 deploy `3abcd7d8-78ed-49a7-b095-477091840f30`, not this branch. A live call to that app does not run this checkout. `src/lib/writebackAllowlist.mjs` writes `integration_last_write` on Case, BT/RBT, and BCBA. Error paths stamp `last_sync_at` and skip `integration_last_write`. Employee blocked creates do stamp `integration_last_write`. `docs/CHECKPOINT.md` and `docs/HANDOFF.md` are absent.

Source readiness, recorded after the pause. Confirmed in this checkout. Blank core values go out as JSON null (`trimOrNull` in `buildEmployeePayload.mjs`, `|| null` in `buildClientPayload.mjs`). Metadata DELETE is implemented for a blank known field when the prior hash was filled. Do not use `138703` for that check. Work address `133819` or a BCBA Medicaid id can blank. Writeback clocks are implemented and neither workflow reads `hs_lastmodifieddate` after the patch. The date-string check is not ready for epoch digit strings. `normalizeDate` and `toIsoMidnight` pass an all-digit string to `new Date`, which does not parse it, so those dates still become null. A `YYYY-MM-DD` employee date and an ISO client date pass. The Yes gate is absent. No file under `src` reads `enter_in_central_reach` or `entered_in_centralreach`. BT/RBT still requests `postal_code` in `employeeSyncWorkflow.mjs`. There is no absent-read halt in this tree.

The pause read printed only headings and no property type. A later read on account `UnitedCare_Test_Integration` returned `type` `datetime` and `fieldType` `date` on deals, BT/RBT `2-55656309`, and BCBA `2-55656302`. `docs/workstreams/sandbox-resume/STATE.md` records that read. The 24-hour report is still not created. On 2026-10-30, account `UnitedCare_Test_Integration` on portal `50850427` could not save one. The create path returned HTTP 404. List and analytics calls require a reporting scope this key does not have. HubSQL is gated for this account. Create the report in that portal's UI, or add a reporting scope to that app and try again. The Drive callout quotes are still not collected. The date parser still drops all-digit HubSpot date strings. The Yes gate is still absent from this tree.

Last step: four read-only checks on 2026-10-30. Azure re-read `centralreachserverless`. The Google Doc and its comments were re-read. The fresh tree on `review_and_update_code` was traced. HubSpot in this session reads portal `246184070`, not sandbox `50850427`. Three of the four checks under Sandbox integration test can run on this branch. The date-string check still turns all-digit HubSpot dates into null. The first deploy still waits on Remaining open items.

Azure stop, 2026-10-30 afternoon. Function App `centralreachserverless` in `centralreachintegration` was Running and is now Stopped via `az functionapp stop`. No VMs in the subscription. Cosmos `ucr-hs-cr-cosmos-prod` is serverless (usage-billed). Service Bus `ucr-hs-cr-sb-prod` Standard stays Active (no stop without delete). Storage `centralreachintegrab751` stays available. Restart later with `az functionapp start -g centralreachintegration -n centralreachserverless`.

## Key facts

- Fresh repo: this checkout, branch `sandbox-integration`. The fresh-tree notes below were first taken on `review_and_update_code`.
- Previous build: the archive checkout at `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach_backup_2026-10-30` (branch `align-sandbox-hubspot-field-sync`, tip `a8e3be7`). Do not look for a repo named `azure_central_reach_recovery`. Notion is not a chart source.
- Judges: `docs/workstreams/repository-review-confirm-and-update/` (five files) plus `docs/Azure_repo_recovery_handoff.md`.
- User-cited diagram: [Hybrid Change Detection MVP](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0), tab `t.0`. Google Doc id `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`.
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
- Still open, so the chart must not draw them as settled. Drive Tab 1 field rows, label ids, and which date string Central Reach accepts. The mapping-version bump, the allowlisted live flags, five minutes versus thirty, and the earlier test approval are settled under Discover and confirm.

## Google Doc tab t.0, reviewed

Settled on that tab. The create gate is Entered in CR, with no stage restriction. Case uses contains Yes. BCBA and BT/RBT use equals Yes. The 74 cases that already have a Central Reach id sync without the box. The guardian is the Parent/Guardian contact whose email is used for parent communication. Label rules include add and remove. HubSpot dates are YYYY-MM-DD and must be written as midnight UTC.

Still open on that tab, and still open in Remaining open items. The date string Central Reach accepts, the published commit, Yes - Generic, and whether a blank non-label field clears Central Reach. The blank-clear check uses work address `133819` or a BCBA Medicaid id, not field `138703`. Mapping version, five versus thirty minutes, and whether sandbox approval covers this repo are settled under Discover and confirm. A 2026-10-30 re-read also left these for Zeke: SUB BCBA, the five empty Case integration properties, the additional private-app scopes, the BCBA Workday id confirm, and the 10/29 production checklist. Those are under Waiting on Zeke. The tab also names portal 50317927 as the live portal and does not say the poller reads it. The six sandbox workflows, the Yes gate, the label catalog comparison, the live sandbox flags, and the employee state and gender shapes are settled below. The writeback timestamp race is a sandbox integration test check.

The tab has a one-time credential link under Prod access. It was not copied here. Remove it from the shared doc if it has already been used.

## Archive checkout, reviewed

The previous build is `azure_central_reach_backup_2026-10-30` at `a8e3be7`. The date-parser fix is only in the working tree. The committed tip still turns an all-digit date into null. The run notes say all 35 employees got HTTP 400 on DateOfBirth, and one re-trigger after the local date patch still came back blocked. Publish was not run. The archive mapping version is `guide-sandbox-2026-10-27`. The source timer is every five minutes at both the tip and `037ea72`. Thirty minutes is the written target and is not coded. `planAttempt`, the create sweep, and the never-processed search are in the archive tip and are not in `037ea72`. They stay off the chart.

Still open from the archive. Nothing there approves a fresh-repo deploy. The live app settings in the notes are from 10/29 and 10/30, and no note ties the running app to a commit on 10/30. Label numbers in the archive were found in a catalog and are not checked against the guide. `postal_code` is removed in commit `17451af` and in `poller-state-decision.md`. The newer uncommitted `HANDOFF.md` says to keep that fetch. Zeke needs to settle that conflict.

## Fresh tree, reviewed

The fresh poller enqueues from timestamps and stage filters. No source file reads `enter_in_central_reach` or `entered_in_centralreach`. A client noop still patches HubSpot, including `integration_last_write`. An employee create HTTP 400 returns `blocked` and that patch includes `integration_last_write`. An employee PUT HTTP 400 is rethrown and does not set that field. The only timer in source is `0 */5 * * * *`. `fieldRead.mjs` is absent. Whether HubSpot's modified time lands later than `integration_last_write` is inferred from `new Date()` inside the patch and was not measured.

## Git history, reviewed

`c59d580` says the webhook is the primary path and the timer poller is the backup. `17451af` drops BT/RBT `postal_code` after `6571ad5` records that all 20 sandbox BT/RBT records failed the absent-read check. That removal is on the archive tip and not on the fresh tip. `24975b5` says not to import `16d98ee`, `ea02cbe`, `da22900`, and `0b8e785` wholesale, and those four commits are absent from the fresh tip. The fresh mapping version is `hybrid-2026-10-27` from `68c73b1`. The archive version is `guide-sandbox-2026-10-27` from `77f4224`. No commit contains the date parser.

The mapping version stays `hybrid-2026-10-27`. No commit chooses a next string, and a bump is not required before the first deploy. Both tips still schedule the poller every five minutes, and archive `746ce10` says thirty minutes only after Zeke asks. The approval rule is under Discover and confirm. The published commit is still unknown.

## Settled 2026-10-30

1. Sandbox creates require Entered in Central Reach = Yes on every initial record. Already-linked records keep syncing. The chart keeps that gate. A sandbox poller run that creates records without Yes is not approved.
2. Moved to the sandbox integration test list below. The later modified time is inferred from `new Date()` inside the HubSpot patch. It has not been measured.
3. Compared the Google Doc label names to `central_reach_test_integration/output_files/all_labels_v3.json` (95 org labels, fetched 2026-10-27 via `node get_all_labels.js orglabels`). Names still absent, so a later fetch only helps after United Care adds them:

- Staffed (section 7, `staffing_status`). No catalog name contains Staffed.
- Active Case Load. Absent from the label catalog and from the 58-field metadata config.
- New Mexico and Virginia employee labels (sections 8 and 9).
- Guide payor rows with no catalog name: Aetna or Cigna in NJ, Aetna in CO, Other, MCD-NJ, Horizon-NJ, Aetna-CO, Cigna-CO, Carelon-CO.

Section 7 Active and Inactive match catalog names Active Client `1125427` and In-Active Client `1121488`. `src/constants/centralReach.mjs` still has three old ids. CO Client is `1082500` in code and `1132648` in the catalog. NY Employee is `1107685` in code and `1132655` in the catalog. `BCBA` is `1052629` in code, which the catalog names BCBA LBA NY. The header BCBA id in the catalog is `1130668`. The discovery note says those constants were updated. This checkout still has the old numbers.

13. Zeke confirmed the six sandbox workflows are created, enabled, and on. The HubSpot workflow list call returned 403, missing the `automation` scope, so this file has no workflow ids. The receiver is `src/functions/hubspotWebhook.mjs` (`POST /api/hubspot-webhook`). The callout is `docs/Change Detection Completion Phase.md`, Section 11, the paragraph that names W1 through W6. W1 through W3 are the fast signal. W4 through W6 watch the entry property as known or unknown. Azure keeps the Yes gate.
14. Off this chart. Follow up later. The chart keeps the one employee queue this tree has.
15. The allowlisted live settings on `centralreachserverless` match `docs/sandbox_vs_production_mvp.md`. `ALLOW_EMPLOYEE_CREATE` is `true`. `PUT_ONLY_MODE` is `false`. `HUBSPOT_PORTAL_ID` is `50850427`. `intakePoller` is disabled. Both queue workers are enabled. The published commit is still unknown. The active zip deploy finished 2026-10-29 05:51 UTC with an empty message and no git SHA. `WEBSITE_NODE_DEFAULT_VERSION` is unset.
16. Employee state and gender are settled from the fetched core records. `stateProvince` is a two-letter code (`NY` on contact 4737831). A filled `gender` is the word `Male` (contact 4778843). An empty gender is stored as an empty string. Field `138703` is the employee metadata field HubSpot Link to Record, type input, in `metadata_configuration_org.json`. A blank write that clears `138703`, or a previously filled non-label core field, is not in any artifact.

Employee create on the sandbox portal. The live app already has the two flags set to allow a create. `employeeCreateFeatures` in `src/lib/config.mjs` now does the same when `HUBSPOT_PORTAL_ID` is `50850427` and both variables are unset. An explicit value still wins. Any other portal stays blocked unless the variables allow a create. That change is on `review_and_update_code` in pull request 4. It is not published to the Function App.

3. `MAPPING_VERSION` is `hybrid-2026-10-27` in `src/lib/mappedState.mjs`. `hashMappedState` hashes the mapped payload only. Changing the version string does not by itself write every linked record. It changes the value stored on the sync state and in the logs. No file picks a next string.
4. The intake poller timer is `0 */5 * * * *` in `src/functions/intakePoller.mjs`. Thirty minutes is not coded. Leave the timer at five minutes unless Zeke asks for thirty.
5. The guardian is the Parent/Guardian contact. The guide names Contact `firstname`, `lastname`, `email`, and `contact_category`. Sara's note says the contact card, the one whose email is used for parent communication. This tree reads Case `guardian_first_name`, `guardian_last_name`, and `email` (`PrimaryEmail`). The guide does not give a different Case internal name for that email. The live portal was not re-read. The connected HubSpot account is portal `246184070`.
6. Comorbid is the main field only. That is Sara's latest answer. An older "still confirming" bullet in the guide was not revised. Staff phone is `employee_phone` on the BT/RBT and BCBA payloads. The guide does not name a different destination. The alternate service address read is the truncated `if_services_will_be_in_more_than_one_location__list_the_other_addres`, then `street_address`. The guide does not name a separate source field. Client Staffed is added when `staffing_status` is Staffed and removed when that value is blank. The Staffed label is still absent from the catalog.
7. The guide says remove the Billing Hold label when `cr_billing_hold_label` goes back to No. `updateContactLabels` only POSTs `/contacts/{id}/labels`. An empty list skips the call. There is no label delete. Label removal stays off this chart.

## Sandbox integration test, confirm then

These checks are repeated in Remaining open items. That section is the current list. The label names and the three stale ids below are United Care items in that list. They are not part of the four checks.

- A writeback leaves `hs_lastmodifieddate` later than `integration_last_write`. Inferred, not measured.
- The label names listed under item 8 are still absent from the production catalog. Confirm with United Care before another `get_all_labels.js orglabels` run.
- The three stale ids in `src/constants/centralReach.mjs` (CO Client, NY Employee, header BCBA).
- A blank write of employee metadata `138703` is not the check. The mapper fills `138703` from the portal, the object type, and the record id. The sandbox check blanks work address `133819` or a BCBA Medicaid id.
- A blank write clears a previously filled non-label core field.
- Item 9 stays a sandbox write. Evidence only. Employee GETs store `dateOfBirth` as `1995-09-03T00:00:00.0000000Z`. This tree sends client dates as `YYYY-MM-DDT00:00:00.000Z` and employee dates as `YYYY-MM-DD`. The sandbox posts sent null, so Central Reach never accepted or rejected those strings from this code.
- The code already DELETEs a metadata field when the new value is blank and the prior hash was filled. A client core blank is sent as JSON null. The sandbox write is what shows whether CentralReach empties the field.

## Discover and confirm, 2026-10-30

Reviewed against `docs/workstreams/repository-review-confirm-and-update/` and the prior chat. A recommendation in a judge file is not a close. An assistant note in the transcript is not a close.

Answered, and not repeated in the remaining list.

- The poller timer in source is `0 */5 * * * *`. Thirty minutes is a written target only. Leave five minutes unless Zeke asks for thirty.
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

Three of these four checks can run on this branch. They do not wait on Waiting on Zeke. Run blank core, metadata DELETE, and writeback time against this checkout. The date-string check stays on this list and is not ready for all-digit HubSpot dates. The live Function App is the 2026-10-29 package, deployment `3abcd7d8-78ed-49a7-b095-477091840f30`, and that package is not commit `ee8b279`.

Date string. Employee GETs store `dateOfBirth` as `1995-09-03T00:00:00.0000000Z`. This tree sends client dates as `YYYY-MM-DDT00:00:00.000Z` (`buildClientPayload.mjs`) and employee dates as `YYYY-MM-DD` (`buildEmployeePayload.mjs`). The earlier sandbox posts sent null, so that run does not show which string Central Reach accepts.

Blank core field. Empty employee and client core values go out as JSON `null`. A sandbox write shows whether Central Reach clears the stored value.

Metadata DELETE. `metadataClearFieldIds` DELETEs a known field when the new value is blank and the prior hash was filled. A normal HubSpot edit does not blank `138703`. The mapper fills `138703` from the portal, the object type, and the record id. A missing portal omits `138703` and does not DELETE it. Use a field this mapper can blank, such as work address `133819` or a BCBA Medicaid id.

Writeback time. Employee `integration_last_write` and `last_sync_at` share one `new Date()`. The client patch calls `new Date()` once per field. Neither path reads `hs_lastmodifieddate` after the patch. The poller skips until HubSpot's modified time is later. A sandbox write is what measures that order. The webhook does not use that comparison.

Field `138708`. Needs to be confirmed. It does not appear under `src`, in the discovery notes, in the Central Reach JSON exports, or in Google Doc tab t.0. A Drive search for `138708` returned no files. A sandbox write waits until the missing workbook names the field.

Fetch Sara's Metadata Workbook, `United Care ABA - Client Metadata Flow - HubSpot to Central Reach.xlsx`, Drive id `19z3vue0JSkE0QlBO34_83EirCok4q65i`. The guide names that file and it is not in this repo or in `central_reach_test_integration`. The label and metadata JSON exports are already in that sibling tree.

### Waiting on Zeke

Reviewed 2026-10-30 against the Google Doc, Azure, this tree, and HubSpot portal `246184070`. Portal `246184070` is not sandbox `50850427`. Property and association results from `246184070` do not close a sandbox item.

Published commit. Still open. Active deployment `3abcd7d8-78ed-49a7-b095-477091840f30` finished 2026-10-29 05:51:26 UTC with an empty message, a null author, deployer `core_tools`, and no git SHA. `037ea72` is on `align-sandbox-hubspot-field-sync` and is not recorded on that deployment. Azure does not prove the package bytes differ from `037ea72`. The allowlisted flags still match. `ALLOW_EMPLOYEE_CREATE` is `true`, `PUT_ONLY_MODE` is `false`, and `HUBSPOT_PORTAL_ID` is `50850427`. `037ea72` is not an ancestor of this branch `ee8b279`.

BT Active Staffed. Still open. Section 6 asks what that row is on the Central Reach side. Section 10 still says confirm HubSpot owns the count, create a metadata field, and test one employee update. The unresolved comment from 2026-10-28 says there is no endpoint and a meta field would be needed. `active_cases_count` does not appear under `src`. There is no case-load route in `centralReachClient.mjs`. This is separate from the missing Staffed label. It does not block the four sandbox checks.

SUB BCBA. Still open. Section 4, association type 234. The unresolved comment is "10/27 - REVIEW ZEKE". No file under `src` contains `234` or `236`. Deal sync keeps association type ids outside the exclude set, and those rows change the client hash only. Nothing writes a substitute to Central Reach.

Five Case integration properties. The empty Case copies stay open. The doc asks which of `updated_by_integration`, `integration_last_write`, `employee_id`, `supervising_bcba`, and `create_record` are still needed, and it says all five are empty. This session cannot read those properties on portal `50850427`. On this tree the names are not all unused. `updated_by_integration` and `integration_last_write` are read and written on BT/RBT, BCBA, and Deal. `employee_id` is the Central Reach contact id on the staff object. `supervising_bcba` is read from the Deal and written to client metadata `131308`. `create_record` has no reader or writer in `src`.

Production private-app scopes. Answered on the doc. Danny's 10/28 note says the Central Reach Integration app already has every scope on the section 10 list. This session did not read that app. The token here is portal `246184070`. That token includes custom-object and tickets scopes. Appointments and users calls returned 403.

BCBA External System ID. Still open for the production confirm. This tree sets `externalSystemId` to the HubSpot record id on create. An update by an existing contact id keeps the `externalSystemId` already stored in Central Reach. No source file reads `workday_id`. Section 5 says the External System ID stores the HubSpot record id. Danny's 10/28 note says it is the Workday ID. The doc does not reconcile those two sentences.

The 10/29 production checklist. Still open. The heading says leave it for now. Guardian name and email on Case, BCBA personal email, the production staff phone field, the alternate service-address workflow, and `current_primary_bt` are production work. They do not block the four sandbox checks.

Rapid-notification loss. The doc names it under minimum changes before production. This tree does not record that loss. The webhook enqueues with no `shouldSync` gate. The poller syncs a Deal only when `hs_lastmodifieddate` is later than `integration_last_write`. A sandbox can show those two doors for a mapped field.

BT/RBT `postal_code`. Still open. The guide maps mail and work postal fields to `postal_code_home` and `postal_code__work_`. The fresh BT/RBT GET still requests `postal_code` as well (`employeeSyncWorkflow.mjs`), and core zip falls back from `postal_code_home` to `postal_code`. Archive commit `17451af` removes that request and that fallback. The uncommitted archive `docs/HANDOFF.md` says to keep the fetch. `docs/Azure_repo_recovery_handoff.md` calls that keep instruction outdated. This tree has no absent-property halt. The keep-or-remove choice is still Zeke's.

## Open item review

Checked 2026-10-30 in this checkout. A read of `src` does not close any remaining item. No sandbox write was run.

The tree still matches the write-up on the points that decide those items. No file under `src` reads `enter_in_central_reach` or `entered_in_centralreach`. `src/functions/intakePoller.mjs` schedules `0 */5 * * * *`. `src/workflows/employeeSyncWorkflow.mjs` still requests `postal_code`. `src/lib/centralReachClient.mjs` returns `blocked` when an employee create gets HTTP 400. `normalizeDate` and `toIsoMidnight` still return null when `new Date` cannot parse the string.

### Still open

Sara. BT/RBT option labels "Yes - Generic" and "No- Made Inactive."

United Care. The Staffed label and the payor names in item 8. The three stale ids in `src/constants/centralReach.mjs`.

Sandbox writes, not run. The date string Central Reach accepts. Whether a blank core value clears the stored field. Whether metadata DELETE clears work address `133819` or a BCBA Medicaid id. Whether writeback leaves `hs_lastmodifieddate` later than `integration_last_write`.

Zeke. The published commit. BT Active Staffed. SUB BCBA. Which of the five Case integration properties are still needed on portal `50850427`. Production private-app scopes, because Danny's note was not re-read against that app. BCBA external system id, HubSpot record id in this tree versus the Workday note. The 10/29 production checklist. Rapid-notification loss, which a sandbox can show and this read cannot. Whether the BT/RBT fetch keeps `postal_code`.

## Open

The list above is the current list. Notion is not a chart authority. Do not deploy while any item in that list is open. Three of the four checks under Sandbox integration test can run on this branch. The date-string check is not ready for all-digit HubSpot dates. The live Function App is a different package. The 24-hour report on portal `50850427` is still not created. The CLI key on that portal cannot save it. The property type is already confirmed. The first deploy is confirmed when that list is closed.
