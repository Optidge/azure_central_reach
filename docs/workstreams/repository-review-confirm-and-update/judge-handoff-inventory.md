# Judge: handoff do-not list

Prepared October 30, 2026. This file judges each caution in the handoff do-not lists and the deferred redesign. It does not authorize any run, deploy, or write.

## How to read this file

Each subsection is one caution. The verdict means:

- Needed: the caution prevents a real risk and should stay.
- Not needed: the caution froze the sandbox test without protecting anything, or Zeke already overrode it.
- Unknown: the files read do not show whether the caution matters.

Paths starting with `docs/` or `src/` are in the fresh repository. Paths starting with `archive/` are under `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach_backup_2026-10-30`. The feedback file is `archive/docs/V2 sandbox end-to-end test: Zeke's feedback.md`.

The main fact behind most verdicts: sandbox HubSpot portal 50850427 writes into the production CentralReach account. There is no CentralReach sandbox. A caution that stops a real CentralReach write for a non-test record is protecting production. A caution that stops a test record from reaching CentralReach is only freezing the test, because Zeke said those records will be deleted.

## Rules that protect production CentralReach

### Do not assume sandbox HubSpot isolates CentralReach writes

Verdict: needed.

Why: Every sandbox sync lands in the production CentralReach account. See `docs/Azure_repo_recovery_handoff.md` lines 79 to 81 and `archive/docs/HANDOFF.md` line 9.

Feedback:

### Do not write or poll production HubSpot portal 50317927

Verdict: needed.

Why: A poller or workflow pointed at portal 50317927 would push real client and employee records into production CentralReach. See `archive/docs/HANDOFF.md` lines 32 and 36.

Feedback:

### Leave the 74 backfill cases untouched

Verdict: needed.

Why: Those cases are real production records that already have CentralReach ids, and Zeke said not to touch them. See the feedback file line 33 and `archive/docs/HANDOFF.md` lines 33 and 91.

Feedback:

### Keep production rollout, backfill, and bulk creation as separate tasks

Verdict: needed.

Why: Each of those writes real production CentralReach data and needs its own scope and approval. See `docs/Azure_repo_recovery_handoff.md` line 470.

Feedback:

### Do not create a CentralReach record for an unlinked record without the exact Yes token

Verdict: needed.

Why: Main has no checkbox guard, so any discovered unlinked deal could be created in production CentralReach, and "Yes - Generic" must not count as Yes. See `docs/Azure_repo_recovery_handoff.md` lines 192 to 203.

Feedback:

### Stop before writing when a required HubSpot read is missing or unauthorized

Verdict: needed.

Why: Without it, a missing property looks like a blank and can clear a real value in CentralReach. See `docs/Azure_repo_recovery_handoff.md` lines 214 to 222.

Feedback:

### Do not change employee matching identity without resolving the Workday ID notes

Verdict: needed.

Why: The payload matches on the HubSpot record id, and changing that can turn an update into a duplicate create in production CentralReach. See `docs/Azure_repo_recovery_handoff.md` lines 280 to 284.

Feedback:

### Verify the CentralReach label catalog before label-writing tests

Verdict: needed.

Why: Three label constants changed numbers between checkouts and neither checkout proves which is correct, so a wrong id puts the wrong label on a production CentralReach contact. See `docs/Azure_repo_recovery_handoff.md` lines 257 to 268.

Feedback:

### Consider the mapping version bump before live testing

Verdict: needed.

Why: A new mapping version changes every comparison hash and causes writes on the next linked sync, which matters most once production linked records are in scope. See `docs/Azure_repo_recovery_handoff.md` lines 230 to 232.

Feedback:

### Do not publish to the Function App without explicit approval

Verdict: needed.

Why: Publishing replaces the code that writes production CentralReach, and the current deployed artifact is still unverified. See `archive/docs/HANDOFF.md` line 110 and `docs/Azure_repo_recovery_handoff.md` lines 77 to 78.

Feedback:

### Do not treat the local verification harness as read-only

Verdict: needed.

Why: Disabling triggers does not stop manual HTTP actions, and intake-poller-test can enqueue messages with real configuration that reach production CentralReach. See `docs/Azure_repo_recovery_handoff.md` lines 411 to 416.

Feedback:

### Do not run the employee probe script

Verdict: needed.

Why: It is untracked and unreviewed, and the recorded fix is a diagnostics change in extractCreateErrorReason, not a live probe. See `docs/Azure_repo_recovery_handoff.md` lines 303 and 370.

Feedback:

### Adapt the E2E record script before running it

Verdict: needed.

Why: The script creates records and sets Yes triggers, and each trigger becomes a production CentralReach write, so its values must match the accepted mapping first. See `docs/Azure_repo_recovery_handoff.md` lines 364 to 366.

Feedback:

## Rules that only froze the sandbox test

### Wait for Zeke before ticking a box on a sandbox deal

Verdict: not needed.

Why: Proof 1 stalled because ticking fires the live webhook, but Zeke's plan is to set the Yes trigger on every new test record. See `archive/docs/HANDOFF.md` line 59 and line 29.

Feedback:

### Require a dry run before the first live tick

Verdict: not needed.

Why: Zeke said no local proofs and the test records will be deleted, so a dry-run gate only delayed the real path. See the feedback file line 17 and `archive/docs/HANDOFF.md` lines 55 and 59.

Feedback:

### Keep the deployed poller timer off until Zeke asks

Verdict: not needed.

Why: Zeke asked for it on, and the deployed poller reads sandbox portal 50850427, so it only picks up test records. See the feedback file lines 21 to 23 and `archive/docs/HANDOFF.md` lines 70, 83, and 112.

Feedback:

### Pause workflows and queue workers during the test

Verdict: not needed.

Why: Zeke said nothing is paused, and the disabled triggers in `local.settings.example.json` lines 39 to 41 are local defaults, not a live rule. See the feedback file line 17 and `archive/docs/HANDOFF.md` line 31.

Feedback:

### Pause on rows that wait for production

Verdict: not needed.

Why: Zeke said to drop the block and finish the test. See the feedback file line 31 and `archive/docs/HANDOFF.md` lines 22 and 34.

Feedback:

### Replay dead-letter messages only after a worker code read

Verdict: not needed.

Why: Zeke approved running them, and the worker refetches the sandbox record from HubSpot rather than trusting the message body. See the feedback file line 19, `archive/docs/HANDOFF.md` line 35, and `src/functions/processClientQueue.mjs`.

Feedback:

### Do not remove the BT/RBT postal_code fetch

Verdict: not needed.

Why: The property does not exist on BT/RBT and the recovery handoff calls this instruction outdated. See `docs/Azure_repo_recovery_handoff.md` lines 184 to 186, which reverses `archive/docs/HANDOFF.md` line 34.

Feedback:

### Do not run the sandbox property script

Verdict: not needed.

Why: The script checks for portal 50850427, only creates missing sandbox definitions, and never touches CentralReach. Confirm the bcba_information versus bcbas_information group before running it. See `docs/Azure_repo_recovery_handoff.md` lines 356 to 360.

Feedback:

### Do not run offline tests until authorized

Verdict: not needed.

Why: `npm test` touches no external system. Zeke's "no smoke test" refers to the old live smoke run recorded in `archive/docs/HANDOFF.md` line 51, not offline unit tests. See `docs/Azure_repo_recovery_handoff.md` lines 456 and 479.

Feedback:

### Start with only one Case, one BT/RBT, and one BCBA

Verdict: not needed.

Why: Zeke already chose 10 Case, 20 BT/RBT, and 15 BCBA with paced writes. Running one of each first is still a cheap check but not a gate. See `archive/docs/HANDOFF.md` line 28 and `docs/Azure_repo_recovery_handoff.md` line 466.

Feedback:

### Get explicit authorization before end-to-end runs from the fresh repository

Verdict: unknown.

Why: Zeke authorized the archive build run, but the fresh repository is not deployed and the files do not say whether that approval carries over. See `docs/Azure_repo_recovery_handoff.md` lines 12 and 466 and the feedback file line 17.

Feedback:

### Do not follow the old smoke-test stop files

Verdict: needed.

Why: This rule removes old freezes, so keeping it helps the test move. See `archive/docs/HANDOFF.md` line 24.

Feedback:

## Rules about mapping decisions

### Do not change the comorbid or maladaptive mapper

Verdict: needed.

Why: The comorbid source still conflicts with the guide, so a change would be a guess, but this does not block running the test. See `docs/Azure_repo_recovery_handoff.md` lines 293 to 297 and `archive/docs/HANDOFF.md` line 34.

Feedback:

### Decide blank semantics before restoring legacy fallbacks

Verdict: needed.

Why: A restored fallback can overwrite a deliberate clear, and the guide favors the plain fields. See `docs/Azure_repo_recovery_handoff.md` lines 310 to 314.

Feedback:

### Do not add speculative property names and make them mandatory

Verdict: needed.

Why: Combined with missing-read protection, a guessed name would stop every sync and freeze the test. See `docs/Azure_repo_recovery_handoff.md` line 224.

Feedback:

### Do not invent the Grad Permit BCBA internal name

Verdict: needed.

Why: This is the same risk as a speculative property name. See `archive/docs/HANDOFF.md` line 115.

Feedback:

### Do not copy production select options onto BT/RBT gender or location_home

Verdict: unknown.

Why: The files read do not show what breaks if sandbox options match production. See `archive/docs/HANDOFF.md` line 34.

Feedback:

### Do not split CentralReach field 138703

Verdict: unknown.

Why: The reason is not recorded in any file read. See `archive/docs/HANDOFF.md` line 34.

Feedback:

### Keep staffing-signal behavior out of this stream

Verdict: needed.

Why: staffing_status is fetched but unmapped and no Staffed label exists, so it is a separate build, not a test blocker. See `docs/Azure_repo_recovery_handoff.md` lines 274 to 275 and `archive/docs/HANDOFF.md` line 92.

Feedback:

## Rules about repository and secrets

### Do not print credentials, record data, or artifact bodies

Verdict: needed.

Why: Tokens were already printed once and had to be rotated. See `archive/docs/HANDOFF.md` line 60 and `docs/Azure_repo_recovery_handoff.md` line 83.

Feedback:

### Do not merge or push

Verdict: needed.

Why: The archive branch carries the unreviewed redesign, so pushing it skips the selective transfer. See `archive/docs/HANDOFF.md` line 36 and `docs/Azure_repo_recovery_handoff.md` line 12.

Feedback:

### Leave .audit, docs/state.md, and .test-evidence uncommitted

Verdict: needed.

Why: These hold raw run evidence that may include record data. See `archive/docs/HANDOFF.md` line 36 and `docs/Azure_repo_recovery_handoff.md` line 397.

Feedback:

### Keep the archive unchanged

Verdict: needed.

Why: It is the only copy of the uncommitted date parser and untracked scripts. See `docs/Azure_repo_recovery_handoff.md` lines 120 to 129 and 442.

Feedback:

### Do not rebuild the existing foundations

Verdict: needed.

Why: The webhook, HTTP helpers, and CentralReach client are byte-identical between the two checkouts. See `docs/Azure_repo_recovery_handoff.md` lines 87 to 107.

Feedback:

### Do not copy whole archived workflows or hubspotClient.mjs

Verdict: needed.

Why: The workflows carry the redesign, and the archived hubspotClient.mjs drops baseline search helpers. See `docs/Azure_repo_recovery_handoff.md` lines 155 and 175.

Feedback:

### Do not use SANDBOX-DONE or the done-bar checker as the pass

Verdict: needed.

Why: The pass is the full path working in sandbox, and the checker depends on old document conventions, not integration correctness. See `docs/Azure_repo_recovery_handoff.md` lines 371 to 374 and 420, and `archive/docs/HANDOFF.md` line 11.

Feedback:

### Do not copy dated claims or historical checkpoints forward

Verdict: needed.

Why: Those notes describe old deploy and timer states that no longer hold. See `docs/Azure_repo_recovery_handoff.md` lines 388 and 397.

Feedback:

## Deferred redesign

### Do not import commits 16d98ee, ea02cbe, da22900, and 0b8e785 wholesale

Verdict: needed.

Why: They span both workflows, queue consumers, config, search, Service Bus, and retry helpers, so they would bury the small fixes in one large change. See `docs/Azure_repo_recovery_handoff.md` lines 317 to 336.

Feedback:

### Bring the gate and missing-read protection without planAttempt

Verdict: needed.

Why: Both rules arrived inside the redesign commits, but the handoff lists them as separable small units. See `docs/Azure_repo_recovery_handoff.md` lines 203 and 338.

Feedback:

### Keep CREATE_SWEEP_ENABLED off by default

Verdict: needed.

Why: A never-processed create sweep creates CentralReach records in bulk, and every create lands in production CentralReach. See `docs/Azure_repo_recovery_handoff.md` line 340.

Feedback:

### Fix the sweep queue-send 429 path before using it

Verdict: needed.

Why: The sweep records the error and continues, and poller dedupe is written after send, so a throttled record may never be retried. See `docs/Azure_repo_recovery_handoff.md` lines 342 to 344.

Feedback:

### Verify deliveryCount before treating a failure as final

Verdict: unknown.

Why: Main reads deliveryCount from the message or trigger metadata, but the live trigger metadata was not checked. See `src/functions/processClientQueue.mjs` line 50 and `docs/Azure_repo_recovery_handoff.md` line 345.

Feedback:

### Settle the timer interval at five or thirty minutes

Verdict: unknown.

Why: Source schedules every five minutes and the reference target is thirty, and no file records which one Zeke wants. See `docs/Azure_repo_recovery_handoff.md` line 341.

Feedback:

### Do not enable baseline linked polling until it is proven

Verdict: not needed.

Why: For the sandbox test, Zeke wants the poller on to prove it picks up changes, so running it is the proof. See `docs/Azure_repo_recovery_handoff.md` line 347 and the feedback file line 23.

Feedback:
