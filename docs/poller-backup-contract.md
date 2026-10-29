# Poller backup contract

**As of:** 2026-10-29 afternoon. Read from code on `align-sandbox-hubspot-field-sync`. No code change in this pass.  
**Portal:** sandbox `50850427`. Do not write production `50317927`.  
**Timer:** still off on the Function App. Do not enable `intakePoller` until Zeke asks. Leave CentralReach metadata `132304` alone while it still holds the `POLL1` leftover.

The webhook is the fast path. The poller is the backup for a change a HubSpot workflow did not send. Most records now arrive by webhook, so each tick has to stay cheap.

Related matrix rows: G2, G7, and G9 in [`ws2-coverage-matrix.md`](ws2-coverage-matrix.md).

---

## Direction (Zeke, 10/29)

- **Event-first.** HubSpot workflows calling the webhook are the main path.
- **Going fully event-based is not an Azure rewrite.** The webhook receiver and queues already exist. What is missing is proof that the workflows send a signal for every mapped change. Until that proof exists, the poller stays as the backup. Phase it out later if monitoring shows it catches nothing.
- **The poller must make far fewer HubSpot calls.** Target interval is 30 minutes, with sound retry logic and the Drive section 2 API rules applied.
- **The final design is settled in a separate poller architecture thread.** The proposal below is the starting point for that thread, not a decision.

---

## Four cases

| Case | Path | Notes |
| --- | --- | --- |
| Case Status (`case_status`) | **poller** | A stored write moves `hs_lastmodifieddate`. The sweep can enqueue when the deal is on the stage allowlist and inside the lookback. Linked recheck covers a linked Case the sweep missed. After enqueue, Warm adds Active and Cold adds Inactive. In Limbo adds neither. W1 also watches this property. |
| Staffing Status (`staffing_status`) | **poller** | Same notice path as Case Status. The worker fetches the property and no mapper reads it, so CentralReach does not change. A webhook on this property hits the same gap. |
| BCBA and BT name rollups | **workflow (fast), linked recheck (slow)** | Production triggers are calculated. Danny (10/28) says production workflows already trigger on these name fields. Whether a calculated refresh moves `hs_lastmodifieddate` is unproven, so the sweep is not a proven notice. Linked recheck does not use that timestamp. It re-reads every linked Case, and the client hash includes metadata, so it catches a rollup change on its next pass over that Case. Sandbox W1 does not watch these fields yet (G9). |
| IA BCBA, RE BCBA, and BT associations | **poller** | Linked recheck re-reads Cases that already have `client_id_number`. The client worker then hashes association type ids that are outside the exclusion set, including sandbox 163, 161, 149, and 147. The sweep cannot see an association-only edit. HubSpot workflows cannot enroll on the label. The name-field triggers above are the workflow signal for most staffing changes. |

### Name rollups after enqueue

The worker reads `reassessment_bcba_name`, `current_primary_bt`, `current_primary_bt_2`, `initial_assessment_bcba`, and `supervising_bcba`. It does not read `ia_bcba_name` or `supervising_bcba_name`.

- IA name written to CentralReach comes from `initial_assessment_bcba`.
- Supervising name comes from the billing text field, then `supervising_bcba`.
- A workflow that fires on `ia_bcba_name` queues the Case and does not send that name.

### Associations after enqueue

`SANDBOX_STAFFING_ASSOCIATION_TYPE_IDS` is not imported by any file under `src/`. Comparison keeps every type id that is not in `STAFFING_ASSOCIATION_TYPE_IDS_EXCLUDED`. CentralReach display names still come from the Case rollup properties above. Association changes on a BT/RBT or BCBA employee record are not in the employee hash.

### Worker gate

Zeke (10/29) and the Drive spec agree. "Entered in CR" is not the gate after the first push, because records can show unchecked later. Danny (10/28) says a known CentralReach id is the gate for ongoing updates. The workers still skip any record whose checkbox does not contain `Yes` (`enterInCentralReachContainsYes` in `clientSyncWorkflow.mjs`, and the matching check in `employeeSyncWorkflow.mjs`). So linked recheck can enqueue a linked record that the worker then drops. This is a worker change, owned by the architecture thread.

---

## Timer (today)

| Item | Value |
| --- | --- |
| Schedule | `0 */5 * * * *` in `src/functions/intakePoller.mjs` (every five minutes) |
| Sweep | Cases, BT/RBT, and BCBA on the pipeline and stage allowlists, with `hs_lastmodifieddate` inside the lookback. Code default lookback is 15 minutes when `LOOKBACK_MINUTES` is unset. Deployed value was not re-read in this pass. |
| Linked recheck | Same tick, after the sweep. One page per object of records that already have a CentralReach id. No stage filter. No timestamp filter. Every record on the page is enqueued. Cursor is saved across ticks and wraps to the start after the last page. |
| Page size | At most 50 results per search. Default `MAX_SEARCH_REQUESTS_PER_SECTION` is 1. |

### What a tick skips

The sweep enqueues only when `hs_lastmodifieddate` is strictly newer than `integration_last_write`, and only when this poller has not already enqueued that same timestamp on `dedupe:client-sync` or `dedupe:employee-sync`.

The webhook coalesce key is a different partition, `dedupe:hubspot-webhook`. The tick does not read `last_sync_hash`. The queue worker compares that hash after enqueue. A match skips the CentralReach write and still patches HubSpot bookkeeping, including `integration_last_write`. Linked recheck does not use the timestamp skip.

### Sweep re-enqueue loop (code read, not proven at runtime)

Both workers set `integration_last_write` from the Azure clock, then send the writeback PATCH. HubSpot stamps `hs_lastmodifieddate` when it applies that PATCH, a moment later. On the next tick the sweep sees the record as modified after the last write. The dedupe key carries the new timestamp, so it does not block. The worker runs, matches the hash, and patches bookkeeping again. An allowlisted record that synced in the last 15 minutes can re-enqueue on every tick.

The 10/29 poller test logged one more `noop` client sync at 14:15 after the restore. That is consistent with this loop. It does not prove it.

---

## Cost

### Searches per tick

A successful leased tick with recheck on is **6 HubSpot searches** (3 sweep + 3 recheck). If HubSpot rejects the lookback on all three sweep searches, the fallback makes it **9**. A held lease makes no HubSpot call. A failed Case search returns before the other searches and before recheck.

### Worker calls per enqueue

Searches are the small part. Each enqueue runs a worker, and the worker reads HubSpot again even when nothing changed.

| Worker | HubSpot calls per run, read from code |
| --- | --- |
| Client | 3 deal GETs (initial, immediate re-read, confirm), 1 contact association list, 1 GET per Parent/Guardian contact, 2 staffing association lists, 1 writeback PATCH. At least 8. |
| Employee | 3 record GETs (initial, immediate re-read, confirm), 1 writeback PATCH. 4. Plus 1 CentralReach GET when the record is linked. |

Linked recheck with full pages enqueues 50 Cases, 50 BT/RBT, and 50 BCBA. That is about 3 + 400 + 400, so roughly **800 HubSpot calls per tick**.

| Interval | Ticks per day | HubSpot calls per day, full recheck pages |
| --- | --- | --- |
| 5 minutes (today) | 288 | about 231,000 |
| 30 minutes (target) | 48 | about 38,500 |

A full recheck pass over the 429 production Cases with a CentralReach id (Drive count, Oct 22) takes 9 ticks. That is 45 minutes at 5 minutes and 4.5 hours at 30 minutes. Sandbox has few linked records, so a sandbox tick costs much less. Production linked BT/RBT and BCBA counts were not read.

Unproven in this pass: whether a calculated refresh or an association edit moves `hs_lastmodifieddate`; the live deployed values of `LOOKBACK_MINUTES`, `MAX_SEARCH_REQUESTS_PER_SECTION`, and `LINKED_RECHECK_ENABLED`; the production linked record counts.

---

## HubSpot limits

Checked 10/29 with HubSpot CLI `fetch-doc` on [API usage guidelines and limits](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines), [CRM Search API](https://developers.hubspot.com/docs/api-reference/latest/crm/search-the-crm), and [Associate records](https://developers.hubspot.com/docs/api-reference/latest/crm/associations/associate-records/guide).

- **Private app burst:** 190 requests per 10 seconds per app on Professional and Enterprise.
- **Daily:** 625,000 (Professional) or 1,000,000 (Enterprise) per account. The daily pool is shared by every app in the account.
- **CRM search:** 5 requests per second per account. Up to 200 results per page. Search responses carry no rate-limit headers.
- **Associations API:** 150 requests per 10 seconds on Professional and Enterprise. Batch read accepts up to 1,000 inputs.
- **429 responses** name the limit in `policyName` (`DAILY` or `TEN_SECONDLY_ROLLING`). The daily limit resets at midnight in the account time zone.
- **Error rate:** error responses should stay under 5% of daily requests.

### Retry today

`src/lib/retry.mjs` retries 429 and 5xx up to 3 attempts. It honors `Retry-After` up to 5 seconds, otherwise 400 ms doubling. It does not read `policyName`, so a daily-limit 429 is retried like a burst 429. `host.json` sets no Service Bus concurrency, so the worker fan-out after a recheck runs at the host default.

The webhook returns HTTP 500 when the enqueue fails, so HubSpot retries that delivery. HubSpot does not retry other 4xx responses, and it stops after three days.

---

## Drive section 2 API rules that touch the poller

| Rule | What it means here |
| --- | --- |
| 1. Use your own private app token | Done. The burst limit is ours alone. The daily pool is still shared with United Care's other apps. |
| 2. Sensitive fields are silently omitted without the scope | A value missing from a read is not a blank. Never turn it into a CentralReach clear. The Drive hybrid section says the same for a 403. |
| 4. Calculated and synced fields reject writes | The writeback must never include a rollup or synced field. Today it writes integration fields only. |
| 5. Staffing is associations | Read with the v4 associations API, which has its own lower burst limit. |
| 11. A missing property breaks the whole write | One renamed writeback property fails the whole PATCH. Give Danny the writeback property list so it is protected. |

---

## Proposed target (for the architecture thread to confirm)

```text
HubSpot workflows (fast path)
  W4-W6   create signal when Entered in CR is ticked
  W1-W3   ongoing signals, plus the five staffing name fields on W1 (Danny 10/28)
  Contact ongoing workflow (decided 10/28)
        |
        |  ID-only webhook. 500 on enqueue failure, so HubSpot retries.
        v
  Service Bus  ->  workers  ->  CentralReach
        ^
        |  linked records only (CentralReach id known), any stage
  intakePoller every 30 minutes (backup)
```

1. **Drop the stage-allowlist sweep.** The Drive backup rule is "linked records, any stage, original checkbox not required." That is the linked recheck. Dropping the sweep removes the allowlist and the re-enqueue loop. It deletes code and rewrites nothing.
2. **Do not poll for missed first-time creates.** A failed enqueue returns 500 and HubSpot retries. A failed worker goes to Service Bus retry, then dead-letter. Watch the dead-letter count and webhook 400 and 401 responses instead. Add a create-only sweep later only if monitoring shows misses.
3. **Run the timer every 30 minutes** (`0 */30 * * * *`).
4. **Make a known CentralReach id the ongoing gate in the workers.** The checkbox stays a create signal only.
5. **Retry by limit type.** End the tick on a `DAILY` 429. Back off on a burst 429. Keep searches under 5 per second.
6. **Cut per-run cost.** Candidates: the immediate re-read at the start of each worker, the bookkeeping PATCH when a recheck finds no change, and a smaller recheck page.

## Open questions for the architecture thread

1. Drop the sweep, or keep a create-only sweep.
2. Recheck page size, and the full-pass time you accept (4.5 hours at 50 Cases per 30 minutes).
3. Whether a no-change recheck should still PATCH `integration_last_write`. The Drive monitoring report counts records written in the last 24 hours from that field, so skipping it changes what the report means.
4. Worker gate: CentralReach id known only, or CentralReach id or checkbox `Yes`.
5. Phase-out rule: which monitoring result lets the poller go away.
6. Dead-letter replay: manual or automatic.

---

## Gates that still hold

- Do not enable `intakePoller` until Zeke asks.
- Do not merge until the WS.2 proof exists.
- Do not write production portal `50317927`.
- Leave CentralReach metadata `132304` alone while it still has `POLL1`.
