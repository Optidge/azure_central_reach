# Judge: docs versus source on main

Scope: the cautions where the docs on `main` at `24975b5` disagree with `src`. Each one is judged on whether it should still constrain a sandbox end-to-end test. Live Azure settings, HubSpot workflows, and Drive Tab 1 were not read.

A verdict of needed means the caution is real and should shape the test. Not needed means it should not hold up the test. Unknown means the repo cannot settle it.

## Poller disabled claim

Verdict: needed, but only while `main` has no checkbox gate.

Why: On `main`, `shouldSyncDeal` in `src/workflows/intakePollerWorkflow.mjs` returns true for any stage-allowlisted record with an empty `integration_last_write`, and nothing checks the entry checkbox, so a running poller can queue unticked sandbox records for creation in production CentralReach. The archive `docs/HANDOFF.md` top section says the poller stays on, which is safe only with the archive `workerGate`, not with `main` as it is.

Feedback:

## Checkbox gate

Verdict: needed.

Why: `docs/plans/phase-1a-client-intake-trigger.md` line 69 makes the `Yes` checkbox the entry gate, but no file under `src` reads `enter_in_central_reach` or `entered_in_centralreach`, and client create has no flag gate. The related archive restriction that ticking a box is unsafe because the webhook reaches the live app was not needed, since ticking a box is the intended trigger for a test record.

Feedback:

## Label ids in docs versus code

Verdict: needed, as an expected test failure and not as a reason to stop.

Why: `src/constants/centralReach.mjs` uses BCBA `1052629`, NY employee `1107685`, and CO client `1082500`, while `docs/centralreach-metadata-and-labels-discovery.md` lines 312 to 314 name `1130668`, `1132655`, and `1132648` as current. A run on `main` will put the older labels on test records, so the label rows should be read as known failures.

Feedback:

## Coalesce

Verdict: not needed.

Why: `README.md` line 93 says coalesce drops a repeat notice, but `src/functions/hubspotWebhook.mjs` logs the overlap and enqueues anyway. The worst case is an extra queue message, and the worker's lock and hash compare absorb it, so it does not put test data at risk.

Feedback:

## Portal hardcode

Verdict: not needed for the sandbox test.

Why: `src/mappings/client/buildClientMetadata.mjs` line 145 falls back to portal `50850427` when `HUBSPOT_PORTAL_ID_TEST` is unset, and that is the sandbox portal. It matters before production, because `docs/sandbox_vs_production_mvp.md` line 20 says no portal is hardcoded.

Feedback:

## Azure enablement

Verdict: unknown.

Why: Nothing in `src` can show live app settings or the Oct 25 create test, and the archive `docs/HANDOFF.md` says the published build is `037ea72`, which is not in the history of `main`. A live run therefore tests the archive build, not `main`, until someone reads the Function App settings and confirms what is deployed.

Feedback:
