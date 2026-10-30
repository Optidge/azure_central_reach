# PR tracker

## Current status

Updated October 30, 2026, after the merge.

Pull request 4 is merged. The merge commit on `main` is `f665fd5`. This checkout is `main`.

`integration_last_write` is `datetime` on deals, BT/RBT `2-55656309`, and BCBA `2-55656302` in portal `50850427`. Create the 24-hour report in that portal only. Do not create it on portal `246184070`.

Pull requests 2 and 3 are still open. Do not merge them for this sync work. Do not deploy.

The sections below are the review as written before that merge.

Recorded October 30, 2026, from the review on `main` at `24975b5`.

Fresh repo: `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`

Archive, reference only: `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach_backup_2026-10-30`

Archive branch and tip named in the recovery handoff: `align-sandbox-hubspot-field-sync` at `a8e3be7`. The GitHub head of that branch is `a3ccb9a`.

## Recommendation

Do not merge [pull request 2](https://github.com/Optidge/azure_central_reach/pull/2). It would replace the baseline HubSpot search helpers and bring in `planAttempt`, the create sweep, and the never-processed search.

Do not merge [pull request 4](https://github.com/Optidge/azure_central_reach/pull/4) as the way to get the sync fixes onto `main`. Its only runtime change flips the employee-create default for the sandbox HubSpot portal.

Do not merge [pull request 3](https://github.com/Optidge/azure_central_reach/pull/3) as part of this sync work. The recovery handoff still points at the skill it deletes.

The sync fixes go on a later branch from `main`. They are not a merge of pull request 2, 3, or 4.

## Four sessions, read together

Read on October 30, 2026, after the recommendation above. Nothing new was merged.

The branch to continue code from does not exist yet. An earlier session named it `recovery/reviewed-field-alignment` and never created it. Create that branch from `main` at `24975b5`. Do not create it from `review_and_update_code`.

`review_and_update_code` is the checkout used during the latest sandbox-test chats. Keep it as notes. Its system of record is `docs/workstreams/integration-state-chart/STATE.md` at `8a84889`. The next note in that file is a property-type read of `integration_last_write` on HubSpot portal `50850427` for deals, BT/RBT `2-55656309`, and BCBA `2-55656302`, using HubSpot CLI account `UnitedCare_Test_Integration`. Do not run that read against portal `246184070`. That was the portal connected in those sessions.

Do not treat `review_and_update_code` as the code line. Its only runtime commit is `05fbcf6`, which allows an employee create on portal `50850427` when `ALLOW_EMPLOYEE_CREATE` and `PUT_ONLY_MODE` are unset. The same branch still has no date parser, no Yes gate, and the bare BT/RBT `postal_code` request.

The live Function App `centralreachserverless` in resource group `centralreachintegration` was still the 2026-10-29 package `3abcd7d8-78ed-49a7-b095-477091840f30`. A call to that app does not run `review_and_update_code` or `main`.

What went wrong. The sandbox test stalled because the fresh tree never received the four code fixes. Later chats then opened pull request 4 for the notes and pull request 3 for a skill deletion. Those pulls look like the integration line moving. The running app did not change. One session said the date-string check can run on `review_and_update_code`, then a later note on the same branch said all-digit dates still become null.

Full turn logs, not pasted here. See `docs/session-logs/README.md`.

Session map:

- [Recovery handoff](bc601bb6-f153-4c86-908b-4e3d7da085ac) kept `main` at `24975b5`, left the align branch in the backup, and named `recovery/reviewed-field-alignment` without creating it. It pushed `e9843dd` and `a7418ed` onto `review_and_update_code` and did not merge that branch.
- [State chart](1d5f2511-1179-48ac-87a9-48198d708626) opened pull request 4 and committed `05fbcf6`. It said to bring the date parser, the Yes gate, the missing-field stop, and the webhook routing test before a sandbox run, then did not commit them.
- [Sandbox pause](829721df-efb0-46e5-af9a-162bafe7a4a7) stayed on `review_and_update_code`, pushed only the pause note `8a84889`, and did not deploy. The 24-hour report was not created because the property-type read was killed.
- [Skill deletion](c64c4110-0f53-45e1-b9cd-29028e6ac96d) never entered the sandbox sync. It pushed `cursor/remove-verify-azure-central-reach-skill` at `1c19ac0`, which became pull request 3.

## Open pull requests

GitHub reported each pull request mergeable, with no conflict against `main` at review time. None had CI checks. None had a review. A clean merge state means Git can apply the diff. It does not mean the diff is the right one to ship.

| PR | Branch | Head | Verdict |
| --- | --- | --- | --- |
| [2](https://github.com/Optidge/azure_central_reach/pull/2) | `align-sandbox-hubspot-field-sync` | `a3ccb9a` | Leave open. Do not merge. |
| [3](https://github.com/Optidge/azure_central_reach/pull/3) | `cursor/remove-verify-azure-central-reach-skill` | `1c19ac0` | Leave open. Do not merge for this sync work. |
| [4](https://github.com/Optidge/azure_central_reach/pull/4) | `review_and_update_code` | `8a84889` | Leave open. Do not merge as the sync vehicle. |

Pull request 2 is one commit behind `main`. That commit is `24975b5`, which adds `docs/Azure_repo_recovery_handoff.md`. No file changed on both sides since the merge-base `546518e`.

Pull requests 2 and 4 both edit `src/lib/config.mjs` and `src/workflows/employeeSyncWorkflow.mjs`. Each merges cleanly onto today's `main`. Merging both later would conflict.

Pull request 2 also edits files under `.cursor/skills/verify-azure-central-reach/`. Pull request 3 deletes that skill. Those two pulls conflict with each other on that skill.

## Files to bring onto a later branch from main

Take these in this order. Copy the named behavior. Do not copy a whole workflow file from pull request 2.

### 1. Date parser

Not in pull request 2, 3, or 4. Not in any commit. The only copy is the uncommitted archive working tree.

- `src/mappings/client/buildClientPayload.mjs`, function `toIsoMidnight`
- `src/mappings/employees/buildEmployeePayload.mjs`, function `normalizeDate`
- `src/tests/smoke/clientPayloadMapping.test.mjs`, test `phi_date_of_birth digit string maps to midnight ISO`
- `src/tests/smoke/employeePayloadMapping.test.mjs`, test `date_of_birth digit string maps to a calendar date`

The change tests `/^\d+$/` and passes `Number(raw)` into `new Date`. On `main` and on pull request 2, both functions still pass the raw string to `new Date`. An all-digit epoch-millisecond string then becomes null.

The two new tests cover a positive digit string only. Blank, normal date, numeric, invalid, and pre-1970 inputs still need a look when this lands.

### 2. Truncated address name

`main` still has the truncated name in both places.

- `src/mappings/client/buildClientPayload.mjs` line 136, `if_services_will_be_in_more_than_one_location__list_the_other_addres`
- `src/workflows/clientSyncWorkflow.mjs` line 47, the same truncated name in the fetch list

Replace both with `if_services_will_be_in_more_than_one_location__list_the_other_address`.

Pull request 2 already has the full name in the client mapper and in `REQUIRED_DEAL_PROPERTIES`. Take the name. Do not take the rest of that workflow file.

### 3. Approved field sources, with the fetch lists

Source commit on pull request 2: `77f4224`, plus later mapping commits `c0e3390`, `ecf4e27`, and `17451af`.

Bring the mapper changes. Bring only the property names each workflow must fetch. A field named only in a mapper is incomplete.

- `src/mappings/client/buildClientPayload.mjs`
- `src/mappings/client/buildClientMetadata.mjs`
- `src/mappings/employees/buildEmployeePayload.mjs`
- `src/constants/centralReach.mjs`
- `src/tests/smoke/clientPayloadMapping.test.mjs`
- `src/tests/smoke/clientMetadataMapping.test.mjs`
- `src/tests/smoke/employeePayloadMapping.test.mjs`
- The property arrays in `src/workflows/clientSyncWorkflow.mjs` (`REQUIRED_DEAL_PROPERTIES`)
- The property arrays in `src/workflows/employeeSyncWorkflow.mjs` (`BT_RBT_PROPERTIES`, `BCBA_PROPERTIES`)

Do not copy these workflow files whole. On the pull request 2 tip, `da22900` rewrote the client workflow and `0b8e785` rewrote the employee workflow.

Do not bring these four reads until the client workflow requests them. `serviceLocationAddress` in `buildClientMetadata.mjs` on pull request 2 reads them, and `clientSyncWorkflow.mjs` never requests them.

- `service__street_address`
- `service__apt`
- `service__city`
- `service__postal_code`

`main` does not contain those four names.

Label numbers in `src/constants/centralReach.mjs` changed on the archive branch. The guide names labels. It does not supply these numeric ids. Verify the CentralReach catalog before any label-writing test.

- BCBA `1130668`
- NY_EMPLOYEE `1132655`
- CO_CLIENT `1132648`
- Old BCBA `1052629` is now BCBA_LBA_NY on the archive

### 4. Guardian name and email

Take this from commit `c0e3390`, not from the pull request 2 tip.

At `c0e3390`, `getContactById` already exists, and these four search helpers are still exported.

- `searchIntakeCompleteDeals`
- `searchCustomObjectRecords`
- `searchEligibleBtRbtRecords`
- `searchEligibleBcbaRecords`

The tip of pull request 2 deletes those four in `src/lib/hubspotClient.mjs` and adds `searchNeverProcessedRecords`. That deletion is commit `ea02cbe`. Do not take the tip file.

Behavior to keep: exactly one type-3 contact whose `contact_category` is `Parent/Guardian` supplies guardian name and email. Zero or more than one qualifying contact uses the Case fields `guardian_first_name`, `guardian_last_name`, and `email`. Read failures stay explicit.

Files:

- `src/mappings/client/buildClientPayload.mjs` for `selectGuardianSource`, `isQualifyingGuardian`, `guardianFromContact`, and `guardianFromCase`
- `src/lib/hubspotClient.mjs` for `getContactById` only
- The association and contact load in `src/workflows/clientSyncWorkflow.mjs` (`loadTypeThreeContacts` on the archive). Transplant that load. Do not replace the workflow.
- The matching cases in `src/tests/smoke/clientPayloadMapping.test.mjs` and `src/tests/smoke/clientSyncWorkflow.test.mjs`

`PARENT_GUARDIAN_ASSOCIATION_TYPE_ID` is 3. `guardianFromContact` reads contact `firstname` and `lastname`. `getContactById` requests those. They are not deal properties.

### 5. BT/RBT mailing state and zip

Commits `ecf4e27` and `17451af`.

- `src/mappings/employees/buildEmployeePayload.mjs`, `buildBtRbtPayload` and `buildBcbaPayload`
- `BT_RBT_PROPERTIES` and `BCBA_PROPERTIES` in `src/workflows/employeeSyncWorkflow.mjs`

`buildBtRbtPayload` sends mailing state from `state_home`, with fallback `location_home`, and zip from `postal_code_home`. `buildBcbaPayload` uses `state_home`, with fallback `home_state`, and `postal_code_home`.

Remove the bare `"postal_code"` request. On `main`, `src/workflows/employeeSyncWorkflow.mjs` still requests it at line 58. Pull request 2 has already removed that bare name from the employee mapper and the employee workflow.

Keep `postal_code__work_` on the BT list. `buildBtRbtPayload` still builds the work-address line from `street_address__work_`, `city__work_`, `state__work_`, and `postal_code__work_`.

`main` also lists `"postal_code"` in `src/workflows/clientSyncWorkflow.mjs` at line 53. Confirm that client property before deleting it. The known bad request is the BT/RBT one.

### 6. Yes gate, without the state machine

The rule lives in `src/lib/recordLifecycle.mjs` on pull request 2, from commit `16d98ee`.

- `checkboxIsYes`
- `workerGate`
- Constant `CHECKBOX_YES_TOKEN`, value `Yes`

`checkboxIsYes` splits on `;` and accepts the exact token `Yes`. `Yes - Generic` does not match. `workerGate` returns sync when a CentralReach id is set or `checkboxYes` is true. Otherwise it skips with reason `no-id-and-box-not-yes`.

`main` has no read of `enter_in_central_reach` or `entered_in_centralreach`.

Bring the rule into the current client and employee workflows. Do not copy `src/lib/recordLifecycle.mjs` whole. That file also has `deriveRecordState` and `sweepDecision`.

Do not bring these, from the same redesign.

- `src/lib/attemptPlan.mjs`
- `src/tests/smoke/attemptPlan.test.mjs`
- The `planAttempt` and `runPlan` calls added in `da22900` and `0b8e785`

Tests to cover after the transplant:

- Unlinked and unticked: skip before a CentralReach call.
- Unlinked and `Yes`: eligible for first creation.
- Linked and unticked: continue updates.

`src/tests/smoke/recordLifecycle.test.mjs` covers the gate on pull request 2. Use those cases. Do not import the rest of that state machine just to keep the test file intact.

### 7. Missing-property protection

`src/lib/fieldRead.mjs` exists only on pull request 2, from commit `16d98ee`. `main` does not have this file.

Bring these functions.

- `readProperty`
- `readRequestedProperties`
- `absentNames`
- `assertNoAbsentProperties`
- `RequestedPropertyAbsentError`

A missing key is absent. A null, undefined, or blank value is blank. `assertNoAbsentProperties` throws before a CentralReach call.

On pull request 2, both workflows call this inside the same functions that call `planAttempt` and `runPlan` (`da22900`, `0b8e785`). Wire the check into the current workflows. Do not take that redesign wiring.

Add the check only for properties the workflow already requests. Do not invent property names and then make them mandatory. Remove the bare BT/RBT `postal_code` request in the same change, or the absent-read check fails every BT/RBT before a CentralReach call.

### 8. Webhook routing test

Commit `472331d` adds the test in `src/tests/smoke/hubspotWebhook.test.mjs`.

Test name: `case, bt/rbt, and bcba webhooks enqueue only the matching sender`.

That commit does not require the redesign. The four redesign commits did not edit `src/lib/hubspotWebhook.mjs` or `src/functions/hubspotWebhook.mjs`. Bring the test. `da22900` did edit `src/functions/processClientQueue.mjs`, which the older tests in this file already import. Do not take that queue-file edit with the test.

### 9. Sandbox staffing exclusions 100 and 130

File: `src/constants/staffingAssociations.mjs`

`STAFFING_ASSOCIATION_TYPE_IDS_EXCLUDED` on pull request 2 adds sandbox Potential ids `100` and `130` to the set that `main` already has (`20`, `64`, `153`, `80`, `74`, `164`, `286`). `associationsForComparison` already filters with that set, from `src/workflows/clientSyncWorkflow.mjs` and `src/tests/smoke/hybridChangeDetection.test.mjs`. This constant change takes effect through the helper that `main` already calls.

`SANDBOX_STAFFING_ASSOCIATION_TYPE_IDS`, including `INITIAL_ASSESSMENT_BCBA` `163` from commit `bd93185`, has no caller. Copying `163` alone changes no behavior. Leave it out until something reads it.

## Files that stay on pull request 2

Do not copy these onto `main`.

Redesign commits to leave behind: `16d98ee`, `ea02cbe`, `da22900`, `0b8e785`.

Runtime files:

- `src/lib/attemptPlan.mjs`
- `src/lib/recordLifecycle.mjs` as a whole file. The Yes-gate functions in section 6 are the exception.
- `src/lib/retry.mjs`
- `src/lib/serviceBusClient.mjs`
- `src/lib/config.mjs` on this branch
- `src/lib/hubspotClient.mjs` as a whole file. `getContactById` from `c0e3390` is the exception.
- `src/lib/mappedState.mjs` for now. See the hold below.
- `src/constants/queues.mjs`
- `src/functions/processClientQueue.mjs`
- `src/functions/processEmployeeQueue.mjs`
- `src/workflows/clientSyncWorkflow.mjs` as a whole file
- `src/workflows/employeeSyncWorkflow.mjs` as a whole file
- `src/workflows/intakePollerWorkflow.mjs`

Tests tied to that redesign:

- `src/tests/smoke/attemptPlan.test.mjs`
- `src/tests/smoke/recordLifecycle.test.mjs` as a whole file
- `src/tests/smoke/clientSyncWorkflow.test.mjs` except the guardian cases you choose to keep
- `src/tests/smoke/employeeSyncWorkflow.test.mjs`
- `src/tests/smoke/hybridChangeDetection.test.mjs` except any assertion you need for exclusions `100` and `130`
- `src/tests/smoke/intakePollerEmployeeRules.test.mjs` (deleted on this branch)
- `src/tests/smoke/intakePollerWorkflow.test.mjs`
- `src/tests/smoke/processClientQueue.test.mjs`
- `src/tests/smoke/processEmployeeQueue.test.mjs`

Scripts. The recovery handoff says to retain the property scripts for a later reviewed import. Do not run them in this pass.

- `scripts/create-sandbox-hubspot-properties.mjs`
- `scripts/sandbox-hubspot-properties.json`
- `scripts/check-sandbox-done-bar.mjs`
- `scripts/check-ws1-diff.mjs`

Docs and skill notes on pull request 2. Leave them on that branch. `main` already has the recovery handoff.

- `.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md`
- `.cursor/skills/verify-azure-central-reach/SKILL.md`
- `.cursor/skills/verify-azure-central-reach/features/README.md`
- `.gitignore`
- `README.md`
- `docs/CHECKPOINT.md`
- `docs/Change Detection Completion Phase.md`
- `docs/HANDOFF.md`
- `docs/PSTACK-REVIEW-CONTEXT.md`
- `docs/SOURCE-OF-TRUTH.md`
- `docs/Sandbox props & labels_summary.md`
- `docs/export/cursor-agent-transcripts-oct27-workstream.md`
- `docs/export/cursor-agent-transcripts-oct28-29-handoff.md`
- `docs/hubspot-centralreach-field-mappings-current-state.md`
- `docs/open-items.md`
- `docs/plans/PARALLEL-COORDINATION.md`
- `docs/plans/phase-1a-client-intake-trigger.md`
- `docs/plans/phase-1a-employee-intake-queues.md`
- `docs/plans/phase-1a-sandbox-handoff.md`
- `docs/plans/phase-1b-field-mappings-v2.md`
- `docs/poller-backup-contract.md`
- `docs/poller-state-decision.md`
- `docs/sanbodx-e2e-how-to-complete.md`
- `docs/sandbox-e2e-resume.md`
- `docs/snapshots/poller-state-2026-10-29.diff`
- `docs/snapshots/poller-state-2026-10-29.md`
- `docs/workstreams/doc-bar/task.md`
- `docs/workstreams/open-questions/task.md`
- `docs/workstreams/ws1-diff/task.md`
- `docs/ws1-schema-diff.md`
- `docs/ws2-coverage-matrix.md`

## Hold the mapping version

File: `src/lib/mappedState.mjs`

`main` has `MAPPING_VERSION = "hybrid-2026-10-27"`.

Pull request 2 has `MAPPING_VERSION = "guide-sandbox-2026-10-27"`, from commit `77f4224`. The diff is that one constant.

Leave `main` on `hybrid-2026-10-27` until the mapping edits above are accepted. A version change changes comparison hashes and can cause writes on the next linked sync.

## Files on pull request 4

Do not take the runtime change. Docs on this pull request are review notes. They are not the sync fixes.

Runtime, do not bring:

- `src/lib/config.mjs`, function `employeeCreateFeatures`, constant `SANDBOX_HUBSPOT_PORTAL_ID` (`50850427`)
- `src/lib/centralReachClient.mjs`, the shortened blocked-create reason string
- `src/tests/smoke/employeeCreateFeatures.test.mjs`
- `src/workflows/employeeSyncWorkflow.mjs`, removal of `BLOCKED_CREATE_MESSAGE`

`employeeCreateFeatures` allows an employee create and turns put-only mode off when `HUBSPOT_PORTAL_ID` is `50850427` and both `ALLOW_EMPLOYEE_CREATE` and `PUT_ONLY_MODE` are unset. Any other portal keeps the old block. An explicit flag still wins. The new test states those four cases. The test was read. It was not run.

The same pull request's state chart says the live Function App `centralreachserverless` uses portal `50850427` and writes production CentralReach, and it says not to deploy. Azure was not re-read in this review. That note is why this default stays off `main`.

Docs on pull request 4, not a merge source for the code:

- `docs/workstreams/integration-state-chart/STATE.md`
- `docs/workstreams/integration-state-chart/State chart and documentation sources to review.md`
- `docs/workstreams/integration-state-chart/my_response.md`
- `docs/workstreams/repository-review-confirm-and-update/clean-tree-recovery-review.md`
- `docs/workstreams/repository-review-confirm-and-update/judge-docs-on-main.md`
- `docs/workstreams/repository-review-confirm-and-update/judge-field-mappings.md`
- `docs/workstreams/repository-review-confirm-and-update/judge-handoff-inventory.md`
- `docs/workstreams/repository-review-confirm-and-update/judge-intake-path.md`

`STATE.md` on that branch also records that the date parser, the Yes gate, and the bare `postal_code` removal are absent from `review_and_update_code`. That matches this review.

## Files on pull request 3

Do not merge this deletion as part of the sync. The recovery handoff at `docs/Azure_repo_recovery_handoff.md` still names the skill.

Deleted by pull request 3:

- `.cursor/skills/verify-azure-central-reach/SKILL.md`
- `.cursor/skills/verify-azure-central-reach/artifacts/.gitkeep`
- `.cursor/skills/verify-azure-central-reach/features/README.md`
- `.cursor/skills/verify-azure-central-reach/features/client-sync-scaffold.md`
- `.cursor/skills/verify-azure-central-reach/features/connectivity-test.md`
- `.cursor/skills/verify-azure-central-reach/features/hubspot-webhook.md`
- `.cursor/skills/verify-azure-central-reach/features/intake-poller-test.md`
- `.cursor/skills/verify-azure-central-reach/features/unit-smoke-suite.md`
- `.cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh`

## Leave these behaviors for a later decision

Do not change them in the transfer branch.

- Employee `externalSystemId`. The payload uses the HubSpot record id. Later guide notes mention a Workday id. An identity change can turn an update into a create.
- Label removal. `src/lib/centralReachClient.mjs` on `main` only adds labels. The guide asks for billing-hold removal when the value returns to No.
- The worker and poller redesign. `CREATE_SWEEP_ENABLED` defaults off. The timer is still every five minutes. Thirty minutes is a written target, not the code.
- The four service-address component fallbacks listed in section 3, until the workflow requests them.
- Client `postal_code` at `src/workflows/clientSyncWorkflow.mjs` line 53, until someone confirms the property exists.

## What this review checked

Checked on the branches with scoped diffs and greps. The 26,717-line pull request 2 diff was not read line by line.

Confirmed:

- Date parser hunk exists only in the archive working tree.
- `other_address` is corrected on pull request 2. `main` still has `other_addres`.
- Guardian search helpers still exist at `c0e3390` and are gone at the pull request 2 tip.
- Bare `"postal_code"` is gone from the employee workflow on pull request 2 and still present on `main` at line 58.
- `workerGate` and `checkboxIsYes` match the Yes rule, and they live in the redesign module.
- `fieldRead.mjs` is only on pull request 2.
- Mapping version is a one-line change.
- Webhook test `case, bt/rbt, and bcba webhooks enqueue only the matching sender` is on pull request 2.
- Exclusions `100` and `130` are inside `STAFFING_ASSOCIATION_TYPE_IDS_EXCLUDED`. Id `163` has no caller.
- `service__street_address`, `service__apt`, `service__city`, and `service__postal_code` are read by the pull request 2 metadata mapper and are not in that branch's client workflow fetch list.

Not done:

- No merge, no push, no deploy.
- The new `employeeCreateFeatures` test was not executed.
- Azure app settings were not re-read.
- Every mapper field was not compared with every fetch list. The four service-address names above are the gap that was confirmed.
