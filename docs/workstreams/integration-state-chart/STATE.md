# Integration state chart

## Task

Produce one state chart that is also the integration flow for HubSpot to Central Reach. Include the webhook, the intake poller, and the field stages. Decide what to bring from the 2026-10-30 archive and what to leave, using the review judges and what the previous build actually did. Do not start a new test run in this task.

## Done when

- The chart is generated from a TLA+ spec in a scratch folder, with the reader's labels.
- The hand-off names each bring-over, leave-behind, and still-open item that changes a state.
- The reply says which earlier diagram this chart replaces for now.

## Current status

Last step: all five reviews are in. The remaining open items are listed below.

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

Still open on that tab. Central Reach label ids, the date string Central Reach accepts, MAPPING_VERSION, live Function App settings, five versus thirty minutes, whether sandbox approval covers this repo, the writeback timestamp race, whether the six sandbox workflows exist, Yes - Generic, the state_home format, whether a blank non-label field clears Central Reach, gender value mapping, and field 138703. The tab also names portal 50317927 as the live portal and does not say the poller reads it.

The tab has a one-time credential link under Prod access. It was not copied here. Remove it from the shared doc if it has already been used.

## Archive checkout, reviewed

The previous build is `azure_central_reach_backup_2026-10-30` at `a8e3be7`. The date-parser fix is only in the working tree. The committed tip still turns an all-digit date into null. The run notes say all 35 employees got HTTP 400 on DateOfBirth, and one re-trigger after the local date patch still came back blocked. Publish was not run. The archive mapping version is `guide-sandbox-2026-10-27`. The source timer is every five minutes at both the tip and `037ea72`. Thirty minutes is the written target and is not coded. `planAttempt`, the create sweep, and the never-processed search are in the archive tip and are not in `037ea72`. They stay off the chart.

Still open from the archive. Nothing there approves a fresh-repo deploy. The live app settings in the notes are from 10/29 and 10/30, and no note ties the running app to a commit on 10/30. Label numbers in the archive were found in a catalog and are not checked against the guide. `postal_code` is removed in commit `17451af` and in `poller-state-decision.md`. The newer uncommitted `HANDOFF.md` says to keep that fetch. Zeke needs to settle that conflict.

## Fresh tree, reviewed

The fresh poller enqueues from timestamps and stage filters. No source file reads `enter_in_central_reach` or `entered_in_centralreach`. A client noop still patches HubSpot, including `integration_last_write`. An employee create HTTP 400 returns `blocked` and that patch includes `integration_last_write`. An employee PUT HTTP 400 is rethrown and does not set that field. The only timer in source is `0 */5 * * * *`. `fieldRead.mjs` is absent. Whether HubSpot's modified time lands later than `integration_last_write` is inferred from `new Date()` inside the patch and was not measured.

## Git history, reviewed

`c59d580` says the webhook is the primary path and the timer poller is the backup. `17451af` drops BT/RBT `postal_code` after `6571ad5` records that all 20 sandbox BT/RBT records failed the absent-read check. That removal is on the archive tip and not on the fresh tip. `24975b5` says not to import `16d98ee`, `ea02cbe`, `da22900`, and `0b8e785` wholesale, and those four commits are absent from the fresh tip. The fresh mapping version is `hybrid-2026-10-27` from `68c73b1`. The archive version is `guide-sandbox-2026-10-27` from `77f4224`. No commit contains the date parser.

Still open in git. No commit chooses the next mapping version. Both tips still schedule the poller every five minutes, and archive `746ce10` says thirty minutes only after Zeke asks. No commit says the sandbox pass covers a fresh-repo deploy.

## Remaining open items

Closed by the five reviews, and not repeated below. Asana is out. The previous build is the archive checkout. The webhook is primary and the poller is the backup. The date parser is needed and is still uncommitted. An employee create HTTP 400 is stored as blocked. The four redesign commits stay off this branch. BT/RBT `postal_code` stays removed. The judge file says the later handoff line that says to keep that fetch is outdated. Portal `50317927` stays off. The Workday id stays unchanged. Dry run is not a product state.

1. The code Yes gate versus a sandbox poller run without it. The guide says create only on exact Yes, and already-linked records keep syncing. The intake judge says Zeke told them to leave that block out. The docs judge says a poller on this tree without the gate can create unticked records in production Central Reach. The chart keeps the gate. A poller run of the current fresh code is a separate approval.

2. BT/RBT "Yes - Generic" and "No- Made Inactive." The guide says Sara has not confirmed them.

3. The next `MAPPING_VERSION`. Fresh is `hybrid-2026-10-27`. Archive is `guide-sandbox-2026-10-27`. No source picks the next value. A bump writes every linked record on the next sync.

4. Five minutes versus thirty. Source is every five minutes. The archive target is thirty, only after Zeke asks.

5. Whether the sandbox pass approves a deploy or an end-to-end run from this fresh repo. No file says it does.

6. Live Function App settings and the published commit. The archive notes are from 10/29 and 10/30. Nobody has re-read `centralreachserverless`.

7. Whether a writeback leaves `hs_lastmodifieddate` later than `integration_last_write`. Inferred from `new Date()` inside the patch. Not measured.

8. Central Reach label ids. The archive catalog has numbers. Neither checkout proves they match the guide or the production org.

9. The date string Central Reach accepts. HubSpot dates are `YYYY-MM-DD` written as midnight UTC. No run has shown Central Reach accept a real date from this code.

10. `state_home` format, gender value mapping, whether a blank non-label field clears Central Reach, and field `138703`. The guide or the judges leave each one undecided.

11. Which HubSpot field marks the guardian contact used for parent communication. The business rule is that contact. The field is not named.

12. Rows still waiting on United Care. Comorbid, Active Staffed, the staff phone internal name, and the alternate service address source.

13. Whether the six sandbox workflows are enabled. One read of the guide says they are enabled. A later read of the first tab and the sandbox assets export found no enabled or disabled status.

14. Label removal. The guide says remove a label when it goes back to No. The sync code only adds labels.

15. One employee queue versus split queues, for production only. The chart uses the one queue this tree has.

## Open

The list in Remaining open items is the current list. Notion is not a chart authority. Asana is not in use.

##my follow ups after task
Remove Asana from the requirements. We are not using Asana.
Google doc to review is here 
https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0
The previous Azure build will be referenced here -in the archive checkout 
The previous build is the archive checkout, not a repo named azure_central_reach_recovery



##List all open items for the reviewers. For any open items, please review and then determine if the open items can be answered or left as open items. If there are any left as open items, then list them as the remaining open items, please.