# Integration state chart

## Task

Produce one state chart that is also the integration flow for HubSpot to Central Reach. Include the webhook, the intake poller, and the field stages. Decide what to bring from the 2026-10-30 archive and what to leave, using the review judges and what the previous build actually did. Do not start a new test run in this task.

## Done when

- The chart is generated from a TLA+ spec in a scratch folder, with the reader's labels.
- The hand-off names each bring-over, leave-behind, and still-open item that changes a state.
- The reply says which earlier diagram this chart replaces for now.

## Current status

Last step: the flow write-up returned after the chart. The client noop also writes HubSpot bookkeeping. The unchanged arrow is now "HubSpot records the skip". The writeback re-queue was not added as a red state. Linked recheck is supposed to enqueue again, and the hash skip is what keeps Central Reach quiet. A timestamp race on the stage poller is inferred and not measured.

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

## Open

- Asana is a recorded gap. `user-asana` needed auth and the user skipped it. Do not guess ticket contents. Do not retry auth unless the user connects Asana.
- Google Doc `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`, heading Hybrid Change Detection — MVP, is the business flow. Two starts join one Azure compare. Fast path is an ID-only webhook. Backup path is a scheduled poll of linked records, any stage, original checkbox not required. Changed updates Central Reach and saves state only after the write succeeds. Unchanged skips the write. The drawing names no pipeline stages, no queue, and no field-stop. No Lucid link was in the doc. The same guide's sandbox section lists six enabled workflows, which conflicts with the chart note that those workflows were not created.
- Asana stays a gap. Notion is recorded and is not authority.
- Model note: role file names `grok-4.7-high` and `claude-opus-5-5-medium` are not in this session's model list. Traces use `grok-4.7-xhigh`. The explainer and why synthesizer should use `claude-opus-5-5-high`.


##my follow ups after task
Remove Asana from the requirements. We are not using Asana.
Google doc to review is here 
https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0
The previous Azure build will be referenced here -in the archive checkout 
The previous build is the archive checkout, not a repo named azure_central_reach_recovery



##List all open items for the reviewers. For any open items, please review and then determine if the open items can be answered or left as open items. If there are any left as open items, then list them as the remaining open items, please.