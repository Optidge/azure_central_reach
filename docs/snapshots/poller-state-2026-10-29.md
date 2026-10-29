# Snapshot: poller state design, 2026-10-29

This is a fixed reference for the source code that changed when the poller state design was implemented and reviewed. Use it to compare against later intake poller changes.

## Where the snapshot lives

| Point | Commit | Tag | Date |
| --- | --- | --- | --- |
| Before the poller changes | `746ce10` "Record the settled poller build target before any code change." | `pre-poller-state-2026-10-29` | 10/29 14:10 |
| After the reviewed updates | `0b8e785` | `poller-state-2026-10-29` | 10/29 16:31 |

Branch: `align-sandbox-hubspot-field-sync`.

The full diff between the two tags is in [poller-state-2026-10-29.diff](poller-state-2026-10-29.diff). It is 3,599 lines. Git generated it, and it reverse-applies cleanly against the after tag. To regenerate it:

```bash
git diff pre-poller-state-2026-10-29 poller-state-2026-10-29
```

## Commits in the snapshot

| Commit | What it did |
| --- | --- |
| `6571ad5` | Recorded the accepted poller state design and the `postal_code` request-list decision. Docs only. |
| `17451af` | Dropped `postal_code` from the BT/RBT request list and the zip fallback. It exists on neither portal. |
| `16d98ee` | Added the record state machine, field reads, and attempt plan as pure modules with tests. |
| `ea02cbe` | Replaced the stage sweep with the never-processed sweep behind `CREATE_SWEEP_ENABLED`. An exhausted 429 ends the tick. |
| `da22900` | Routed the client worker through `planAttempt` and `runPlan`. |
| `0b8e785` | Routed the employee worker through `planAttempt` and `runPlan`. |

## Files changed

26 files changed, 1,694 lines added, 1,129 removed.

| Area | Files |
| --- | --- |
| New modules | `src/lib/attemptPlan.mjs`, `src/lib/fieldRead.mjs`, `src/lib/recordLifecycle.mjs` |
| Workflows | `src/workflows/clientSyncWorkflow.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/workflows/intakePollerWorkflow.mjs` |
| Queue functions | `src/functions/processClientQueue.mjs`, `src/functions/processEmployeeQueue.mjs` |
| Shared libraries | `src/lib/config.mjs`, `src/lib/hubspotClient.mjs`, `src/lib/retry.mjs`, `src/lib/serviceBusClient.mjs`, `src/constants/queues.mjs` |
| Mapping | `src/mappings/employees/buildEmployeePayload.mjs` |
| Tests | `attemptPlan`, `recordLifecycle` (new), and updates to `clientSyncWorkflow`, `employeeSyncWorkflow`, `hybridChangeDetection`, `intakePollerEmployeeRules`, `intakePollerWorkflow`, `processClientQueue`, `processEmployeeQueue` |
| Docs | `README.md`, `docs/poller-backup-contract.md`, `docs/poller-state-decision.md` |

## State at the after tag

- `npm test` passed 101 of 101.
- `SYNC_DRY_RUN` and `CREATE_SWEEP_ENABLED` both default to false.
- The design these commits implement is in [poller-state-decision.md](../poller-state-decision.md).

## What the snapshot is not

- **Not deployed.** The sandbox Function App `centralreachserverless` still runs commit `037ea72`.
- **Not pushed.** GitHub's copy of the branch stops at `5ccd31c`. The six commits and both tags exist only on Zeke's machine until they are pushed.
- **Not proven end to end.** Three of the four sandbox dry-run checks passed. The timer stayed disabled, portal `50317927` was not written, and CentralReach was not written. The fourth, queueing a ticked first-time create, is open because sandbox has no eligible record. See the resume point in [HANDOFF.md](../HANDOFF.md).
