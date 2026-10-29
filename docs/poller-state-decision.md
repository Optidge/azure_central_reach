# Poller state decision

**As of:** 2026-10-29 pickup. Judge base accepted. Grafts and candidate-2 fixes applied. Sketches were not redrawn.
**Status:** Accepted base for implementation. No production portal write. No CentralReach write. Timer stays off until Zeke asks.

Cross-judge agent `34d4334d-0ecd-49a3-88aa-8798f5e83af2` scored both candidates 25 of 30 and recommended candidate 2. This record is that base plus the two grafts and the four candidate-2 fixes. Empty versus missing on HubSpot was already closed by the sandbox GET in the pickup pack. Scores were not redone.

## Verdict

Confirm build target items 1, 2, 3, 4, 5, 7, 8, 9, and 10 as settled on 10/29. Replace item 6.

Item 6 replacement. `withRetry` still makes 3 attempts on HTTP 429 and 5xx. If the error is still a 429, `endTickOnRateLimit` ends the poller tick. The tick does not read `policyName`, does not sleep and continue, and does not schedule a resume. Worker 429s still rethrow until the final Service Bus delivery. That delivery writes `last_sync_status` as `error` and sets `last_sync_at`. A 429 does not write `last_sync_at`, so a ticked first-time create stays `tickedNeverProcessed` and the next allowed tick can queue it.

HubSpot stays the durable record state. Service Bus owns `deliveryCount`, dead letter, and `scheduledEnqueueTimeUtc`. Cosmos owns the lease, the dedupe row, field hashes, and `source` on the success row. Three modules hold the rules. `writebackAllowlist.mjs` and the existing HubSpot read functions stay.

### Grafts from candidate 1

1. On a hash match while status is `error`, PATCH `last_sync_status`, `last_sync_at`, and `last_sync_error`. Do not PATCH `integration_last_write` or `last_sync_hash`. Words in use for that clear include `noop`.
2. Until a CentralReach PUT omit is measured, a record with an absent requested property gets `error`, field names only in `last_sync_error`, and no CentralReach call. Keep the blank-versus-absent type. Do not serialize an absent value as null.

### Fixes inside candidate 2

- `blocked` and `errorUnlinked` also require `last_sync_at` to be set.
- Check dry run before the final-error step in `planAttempt`.
- Sweep filter is exact token Yes, empty CentralReach id, empty `last_sync_at`, and `hs_lastmodifieddate` older than 10 minutes. Page size stays 50, one page per object per tick. First production tick with sweep and timer both on would queue 40 Cases, 100 BCBAs, and 275 BT/RBT. The other 1 BCBA and 136 BT/RBT sit inside the 10-minute grace.
- Drop the `timerEnabled` argument from `sweepDecision`. Azure `AzureWebJobs.intakePoller.Disabled` stays the live timer gate. `CREATE_SWEEP_ENABLED` defaults false.

## Data shape

One record state machine, two bindings. Case uses `enter_in_central_reach` and `client_id_number`. Employee uses `entered_in_centralreach` and `employee_id`. `deriveRecordState` walks the match table top to bottom and returns the first row. `FieldRead` is `present`, `blank`, or `absent`. Public modules are `fieldRead.mjs`, `recordLifecycle.mjs`, and `attemptPlan.mjs`.

Match order after the fixes.

| Order | Kind | Match |
| --- | --- | --- |
| 1 | `errorLinked` | id non-empty and `last_sync_status` is `error` |
| 2 | `linkedQuiet` | id non-empty |
| 3 | `blocked` | employee only, id empty, status `blocked`, `last_sync_at` set |
| 4 | `errorUnlinked` | id empty, status `error`, `last_sync_at` set |
| 5 | `tickedNeverProcessed` | box exact Yes, id empty, `last_sync_at` empty |
| 6 | `closedWithoutId` | box Yes, id empty, `last_sync_at` set, status not `error` (employee also not `blocked`) |
| 7 | `untickedUnlinked` | anything left |

The checkbox test stays the exact token Yes after a split on `;`. `Yes - Generic`, `Yes - Active`, and `No- Made Inactive` do not pass. A multi-checkbox value that includes the part Yes does pass.

`workerGate` syncs when the id is set or the box is Yes. That is the only skip. A linked record with the box unticked still syncs.

`sweepDecision` enqueues only `tickedNeverProcessed` when `createSweepEnabled` is true, `modifiedAtMs` is a number, and age is at least `graceMinutes`. It does not take `timerEnabled`.

`planAttempt` order after the dry-run fix.

1. dryRun true. Return `dry-run-stop`. No CentralReach upsert. No HubSpot writeback.
2. error set and deliveryCount below max. Retry, no patch.
3. error set and deliveryCount at max. `final-error` patch, optional linked replay, then rethrow.
4. hashMatched with id. If status was `error`, apply graft 1 clear. Otherwise `hash-match-stop` with no PATCH.
5. employee, no id, `allowEmployeeCreate` false. `blocked` patch.
6. write.

## Fields

Accepted. All already exist. None is new.

`enter_in_central_reach`, `entered_in_centralreach`, `client_id_number`, `employee_id`, `last_sync_status`, `last_sync_at`, `last_sync_error`, `last_sync_hash`, `integration_last_write`, `updated_by_integration`, the three CentralReach link properties, `hs_lastmodifieddate`. Cosmos `source` and queue source `neverProcessedSweep` are not HubSpot properties.

Rejected with the Drive rule named.

| Proposed | Rule | What does the job |
| --- | --- | --- |
| `next_retry_at` | 11 | `ScheduledEnqueueTimeUtc` |
| `retry_count` | 11 | `deliveryCount` |
| `sync_source` | 11 | Cosmos and queue `source` |
| New property or blank into a sensitive Case field to mark an omitted read | 11 / 2 | Absent `FieldRead`, fail closed, no CentralReach call |
| PATCH of calculated staffing or location names | 4 | Leave read-only. Staffing is associations, rule 5 |
| Write metadata `132304` including `POLL1` | 2 | Leave alone |

## Azure

Measured 2026-10-29 on `centralreachserverless` in `centralreachintegration`. Portal is sandbox `50850427`. `intakePoller` is disabled. Both queue workers and `hubspotWebhook` are enabled. Both queues have `maxDeliveryCount` 10 and dead-letter depth 2. Do not add a host.json retry on top of that. `ScheduledEnqueueTimeUtc` carries the 30-minute and 2-hour linked replays and replaces a next-retry CRM field.

## Counts

Closed from the grounding measurements. Recheck page size stays 50. Never-processed production totals older than 10 minutes are 40 Cases, 100 BCBAs, 275 BT/RBT. Sandbox never-processed is 0, 0, 0. Linked production Cases are 450, which is 9 pages and 4.5 hours at a 30-minute interval. The timer is still off.

## Absent is not blank

Measured on sandbox deal `66712883229`. `last_sync_error` was a present key with null. A made-up property name was omitted. Empty is present null or present empty string. Missing is absent. Graft 2 fails the record before any CentralReach call when a requested key is absent.

### Request list must match the portal

Graft 2 fails a record on any absent requested key. That makes a requested name with no property definition a permanent failure. The BT/RBT request list asked for `postal_code`. Sandbox `2-55656309` has no such property, so all 20 sandbox BT/RBT records failed graft 2, and clearing `last_sync_at` returned each one to the same error. Production `2-48354559` also returned 404 for `postal_code` (read-only property GET, 2026-10-29). Decision: remove `postal_code` from the BT/RBT request list and from the `postal_code_home || postal_code` fallback in `buildEmployeePayload.mjs`. `postal_code_home` exists on both portals. It is calculated on production, which only matters for writes (rule 4), and the integration never writes it.

## What this does not do

Does not enable `intakePoller`. Does not write production portal `50317927`. Does not write CentralReach from the dry-run path. Does not write metadata `132304`. Does not add a HubSpot or CentralReach property.

## Next implementation step

Add `src/lib/fieldRead.mjs`, `src/lib/recordLifecycle.mjs`, and `src/lib/attemptPlan.mjs` from the candidate-2 sketch, with the grafts and fixes above applied in code. Wire `SYNC_DRY_RUN` and the never-processed sweep behind defaults that keep the timer off and writes off. Prove a sandbox dry run can queue a ticked first-time create with no CentralReach id.
