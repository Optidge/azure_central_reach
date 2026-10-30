# Judge: intake path cautions

This file judges the cautions from the intake path review. Each caution is marked needed, not needed, or unknown for the sandbox end-to-end test on portal 50850427. Clean repo paths start at `src/`. Archive paths start at `azure_central_reach_backup_2026-10-30/`. Live Azure settings were not read for this judgment.

## Disabled by default

### Poller timer is off in the example settings

Verdict: not needed.
Why: `local.settings.example.json` sets `AzureWebJobs.intakePoller.Disabled` to true, and earlier agents kept the live timer off until Zeke asked. Zeke asked in `azure_central_reach_backup_2026-10-30/docs/V2 sandbox end-to-end test: Zeke's feedback.md`, so the timer for the portal 50850427 poller should be on for this test.
Feedback:

### Both queue workers are off in the example settings

Verdict: not needed.
Why: `local.settings.example.json` disables `processClientQueue` and `processEmployeeQueue`, which only matters for the local harness on port 17071. Zeke's feedback rules out local proofs, and `azure_central_reach_backup_2026-10-30/docs/HANDOFF.md` says the live workers stay on.
Feedback:

### Employee create is off unless two settings are flipped

Verdict: needed.
Why: `src/lib/config.mjs` defaults `PUT_ONLY_MODE` to true and `ALLOW_EMPLOYEE_CREATE` to false, and either one makes `src/lib/centralReachClient.mjs` return blocked instead of creating. The run log says the live values were already flipped, so this is a quick read of the live settings before each employee run, not a stop.
Feedback:

### There is no dry run and no Yes gate in the code

Verdict: not needed.
Why: `src` has no `SYNC_DRY_RUN`, `CREATE_SWEEP_ENABLED`, or `entered_in_centralreach` check, so the Yes rule lives only in the HubSpot workflow enrollment. That stopped an earlier agent in `azure_central_reach_backup_2026-10-30/docs/HANDOFF.md`, but this sandbox portal holds only test records and Zeke said to leave the block out.
Feedback:

## Non-obvious behavior

### A webhook 202 only means the record id was queued

Verdict: needed.
Why: `src/functions/hubspotWebhook.mjs` checks the signature and enqueues an id without reading HubSpot or calling CentralReach. A pass has to be read from `last_sync_status`, the CentralReach id on the record, and the CentralReach contact.
Feedback:

### Webhook coalesce does not drop a repeat notice

Verdict: not needed.
Why: `src/functions/hubspotWebhook.mjs` logs the overlap and enqueues again, so the README claim is wrong but harmless. The worker hash compare in `src/workflows/clientSyncWorkflow.mjs` turns a repeat into a no-change run.
Feedback:

### A CentralReach 400 on employee create looks like a block, not a failure

Verdict: needed.
Why: `src/lib/centralReachClient.mjs` returns blocked on a 400, and `src/workflows/employeeSyncWorkflow.mjs` then completes the message and stamps `integration_last_write`, so nothing is retried or dead-lettered. That is how all 35 employees ended as blocked in `azure_central_reach_backup_2026-10-30/docs/sandbox-e2e-run-status.md`.
Feedback:

### A blocked or failed record waits for a new HubSpot edit

Verdict: needed.
Why: `src/workflows/intakePollerWorkflow.mjs` writes the dedupe key after the send and skips a record when `hs_lastmodifieddate` is not newer than `integration_last_write`. A retry needs a fresh edit or a Yes reset, which is what the re-trigger step in the run log did.
Feedback:

### A mapped field edit does not enqueue a sync on its own

Verdict: needed.
Why: The webhook only enqueues what a HubSpot workflow sends, and the run log in `azure_central_reach_backup_2026-10-30/docs/sandbox-e2e-run-status.md` shows a `date_of_birth` write did not start the worker. Field change steps need the poller on or a workflow that enrolls on those fields.
Feedback:

### Linked recheck rescans every linked record each tick

Verdict: not needed.
Why: `src/lib/config.mjs` defaults `LINKED_RECHECK_ENABLED` to true, and `src/workflows/intakePollerWorkflow.mjs` enqueues every record with a CentralReach id. The run log treated scanning baseline records as a reason to keep the poller off, but those are sandbox test records and an unchanged hash skips the write.
Feedback:

### The poller reads one page per object inside a 15 minute window

Verdict: needed.
Why: `src/lib/config.mjs` defaults `MAX_SEARCH_REQUESTS_PER_SECTION` to 1 and `LOOKBACK_MINUTES` to 15, and `src/lib/hubspotClient.mjs` sorts newest first, so already processed records still fill the page. For 10 Cases, 20 BT/RBT, and 15 BCBA, the `MAX_*_PER_RUN` values must be at least those counts or the writes must be paced.
Feedback:

### An edit during a run causes a silent retry

Verdict: needed.
Why: `src/workflows/clientSyncWorkflow.mjs` and `src/workflows/employeeSyncWorkflow.mjs` throw `SYNC_STALE` when the record changed mid-run and write no HubSpot error. A record-creation script that keeps editing while workers run can push messages to dead letter, so finish each record's edits before setting Yes.
Feedback:

### A failed deal search skips the rest of that poller tick

Verdict: not needed.
Why: `src/workflows/intakePollerWorkflow.mjs` returns early when the deal search throws, so employees and linked recheck wait five minutes. That is a logging and resilience gap to fix later, not a reason to hold the test.
Feedback:

### Replaying dead-letter messages

Verdict: not needed.
Why: `src/functions/processClientQueue.mjs` and `src/functions/processEmployeeQueue.mjs` only take an id and refetch HubSpot, so a replay behaves like a fresh enqueue. `azure_central_reach_backup_2026-10-30/docs/HANDOFF.md` held replay until that read, and the read is now done.
Feedback:

## Open questions

### Live Function App settings

Verdict: unknown.
Why: Whether the timer, both workers, the create flags, and the `MAX_*_PER_RUN` values are set as the run log says has not been read from `centralreachserverless`. Read key names and values for those non-secret flags only, as `src/lib/config.mjs` lists them.
Feedback:

### Which portal the live poller reads

Verdict: needed.
Why: `src/lib/config.mjs` has no sandbox or production switch, so the poller reads whatever portal `HUBSPOT_PRIVATE_APP_TOKEN` resolves to. `azure_central_reach_backup_2026-10-30/docs/HANDOFF.md` recorded that it resolves to 50850427, and any poller aimed at 50317927 must stay off.
Feedback:

### Published code is behind the local date fix

Verdict: needed.
Why: `azure_central_reach_backup_2026-10-30/docs/sandbox-e2e-run-status.md` says the employee create 400 is on `DateOfBirth`, and the digit string parse fix is only in the archive working tree, not in `src/lib/dates.mjs` on main or on the live app. Employee create stays blocked until a reviewed fix is published.
Feedback:
