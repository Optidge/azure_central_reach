# Sandbox end-to-end resume

How-to for a fresh orchestrator. Read this file and stop. Do not read prior chats.

## Goal

Finish sandbox testing of Case, BT/RBT, and BCBA fields, stages, and labels. A row is done only when it is pass, fail, leave-for-production, or blocked on Zeke. A pass names a sandbox record, the HubSpot value, `last_sync_status`, and a CentralReach read-back. Portal `50317927` is not written. The live timer stays disabled.

## First fan-out

Spawn two agents. Do not do their work in the orchestrator.

1. Implementer. Add an in-process webhook route check for one Case, one BT/RBT, and one BCBA. Inject both send functions. Sign each body with `computeHubSpotV2Signature`. Settings use `secretReady: true`, `serviceBusReady: true`, and `cosmosReady: false`. Assert HTTP 202 and the correct target. The existing smoke test covers the full handler for a deal only. BT/RBT and BCBA stop at the resolver in `src/tests/smoke/hubspotWebhook.test.mjs`.
2. Reviewer. Read-only review of that implementer's diff. A different model family from the implementer. Verdict is ship as-is, ship with fixes, or block.

Use `grok-4.7-high` for the implementer. Use `claude-opus-5-5-high` for the reviewer. `claude-opus-5-5-medium` is not available in this environment.

## Do not do yet

No functions host. No deploys. No publishes. No HubSpot writes. No CentralReach writes. No queue sends. Do not bind `client-sync-queue` or `employee-sync-queue`. Do not change `AzureWebJobs.intakePoller.Disabled`. Do not touch `.env`. Do not print tokens, keys, or connection strings. Leave the two dead-letter messages on each live queue.

Live webhook posts, the poller, and the hundreds-record stress wait on Zeke. The questions are listed in `docs/CHECKPOINT.md` lines 89 to 97 and in `docs/ws2-coverage-matrix.md` wherever the result says `blocked`.

## Order after the first fan-out

1. In-process webhook route check. This is the fan-out above.
2. One live webhook on deal `66712883229`, BT/RBT `64796590207`, and BCBA `64797567870`, after Zeke confirms CentralReach client `5324526` and which workflows to pause.
3. Property variations on that same triple. One writer.
4. Association labels on a separate triple, or after step 3 if no separate triple exists.
5. One poller proof, alone. The timer comes on only for that window, then goes off. `intake-poller-test` bypasses the timer flag.
6. Hundreds-record sandbox stress, alone. Zeke asked for this in sandbox. `docs/Change Detection Completion Phase.md` line 139 says the backfill is a production pass. Zeke's later message wins, and it still runs last.

## Code and safety already measured

Branch `align-sandbox-hubspot-field-sync`. Local and origin were both `c52058a` on 10/29. Tag `poller-state-2026-10-29` peels to `0b8e785`. Tag `pre-poller-state-2026-10-29` peels to `746ce10`. `npm test` was 101 pass and 0 fail. Untracked names were `.audit/ws2-sandbox.tsv` and `docs/state.md`. Do not commit those.

`centralreachserverless` in `centralreachintegration`. `AzureWebJobs.intakePoller.Disabled` was `true`. `HUBSPOT_PORTAL_ID` was `50850427`. `SYNC_DRY_RUN` and `CREATE_SWEEP_ENABLED` were absent. Namespace `ucr-hs-cr-sb-prod`. Both sync queues were 0 active and 2 dead-letter.

`src/functions/hubspotWebhook.mjs` has no dry-run gate. Every accepted call is sent to a queue. A local host with unset queue names binds the live queues.

## Poller fixes, not this fan-out

These gate a later local poller run. They are not part of the webhook test.

- `getBooleanEnv` in `src/lib/config.mjs` is true only for the trimmed word `true`. Any other set value leaves `SYNC_DRY_RUN` off.
- Linked recheck defaults on and sends to both queues. Worker listeners fall back to the live queue names.
- `buildClientMetadata.mjs` reads four `service__` address fields that are not on `REQUIRED_DEAL_PROPERTIES`.
