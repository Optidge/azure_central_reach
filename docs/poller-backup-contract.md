# Poller backup contract

**As of:** 2026-10-29. Read from code on `align-sandbox-hubspot-field-sync`. No code change in this pass.  
**Portal:** sandbox `50850427`. Do not write production `50317927`.  
**Timer:** still off on the Function App. Do not enable `intakePoller` until Zeke asks. Leave CentralReach metadata `132304` alone while it still holds the `POLL1` leftover.

The webhook is the fast path. The poller is the backup for a change a HubSpot workflow did not send. Most records now arrive by webhook, so each five-minute tick has to stay cheap.

Related matrix rows: G2, G7, and G9 in [`ws2-coverage-matrix.md`](ws2-coverage-matrix.md).

---

## Four cases

| Case | Path | Notes |
| --- | --- | --- |
| Case Status (`case_status`) | **poller** | A stored write moves `hs_lastmodifieddate`. The sweep can enqueue when the deal is on the stage allowlist and inside the lookback. Linked recheck covers a linked Case the sweep missed. After enqueue, Warm adds Active and Cold adds Inactive. In Limbo adds neither. |
| Staffing Status (`staffing_status`) | **poller** | Same notice path as Case Status. The worker fetches the property and no mapper reads it, so CentralReach does not change. A webhook on this property hits the same gap. |
| BCBA and BT name rollups | **workflow** | Production triggers are calculated. Whether a calculated refresh moves `hs_lastmodifieddate` is unproven, so the sweep is not a proven notice. A workflow must call the webhook. |
| IA BCBA, RE BCBA, and BT associations | **poller** | Linked recheck re-reads Cases that already have `client_id_number`. The client worker then hashes association type ids that are outside the exclusion set, including sandbox 163, 161, 149, and 147. The sweep cannot see an association-only edit. HubSpot workflows cannot enroll on the label. |

### Name rollups after enqueue

The worker reads `reassessment_bcba_name`, `current_primary_bt`, `current_primary_bt_2`, `initial_assessment_bcba`, and `supervising_bcba`. It does not read `ia_bcba_name` or `supervising_bcba_name`.

- IA name written to CentralReach comes from `initial_assessment_bcba`.
- Supervising name comes from the billing text field, then `supervising_bcba`.
- A workflow that fires on `ia_bcba_name` queues the Case and does not send that name.

### Associations after enqueue

`SANDBOX_STAFFING_ASSOCIATION_TYPE_IDS` is not imported by any file under `src/`. Comparison keeps every type id that is not in `STAFFING_ASSOCIATION_TYPE_IDS_EXCLUDED`. CentralReach display names still come from the Case rollup properties above. Association changes on a BT/RBT or BCBA employee record are not in the employee hash.

---

## Timer

| Item | Value |
| --- | --- |
| Schedule | `0 */5 * * * *` in `src/functions/intakePoller.mjs` (every five minutes) |
| Sweep | Cases, BT/RBT, and BCBA on the pipeline and stage allowlists, with `hs_lastmodifieddate` inside the lookback. Code default lookback is 15 minutes when `LOOKBACK_MINUTES` is unset. Deployed value was not re-read in this pass. |
| Linked recheck | Same tick, after the sweep. One page per object of records that already have a CentralReach id. No stage filter. Cursor is saved across ticks. |
| Page size | At most 50 results per search. Default `MAX_SEARCH_REQUESTS_PER_SECTION` is 1. |

### What a tick skips

The sweep enqueues only when `hs_lastmodifieddate` is strictly newer than `integration_last_write`, and only when this poller has not already enqueued that same timestamp on `dedupe:client-sync` or `dedupe:employee-sync`.

The webhook coalesce key is a different partition, `dedupe:hubspot-webhook`. The tick does not read `last_sync_hash`. The queue worker compares that hash after enqueue. A match skips the CentralReach write and still patches HubSpot bookkeeping, including `integration_last_write`. Linked recheck does not use the timestamp skip.

### Cost upper bound

A successful leased tick with recheck on is **6 HubSpot searches** (3 sweep + 3 recheck). If HubSpot rejects the lookback on all three sweep searches, the fallback makes it **9**. A held lease makes no HubSpot call. A failed Case search returns before the other searches and before recheck. Recheck can enqueue up to 150 linked records in one tick.

Unproven in this pass: whether a calculated refresh or an association edit moves `hs_lastmodifieddate`; the live deployed values of `LOOKBACK_MINUTES`, `MAX_SEARCH_REQUESTS_PER_SECTION`, and `LINKED_RECHECK_ENABLED`; how many linked records portal `50850427` would page.

---

## Gates that still hold

- Do not enable `intakePoller` until Zeke asks.
- Do not merge until the WS.2 proof exists.
- Do not write production portal `50317927`.
- Leave CentralReach metadata `132304` alone while it still has `POLL1`.
