# Intake poller manual test

Intake poller manual test lets an operator run the intake workflow once over HTTP (`POST /api/intake-poller-test`) to confirm HubSpot eligibility search, `shouldSync`, Cosmos lease/dedupe, and Service Bus enqueue — before enabling the timer trigger.

## Sub-features

- `intake-missing-config` returns HTTP 500 with `error.code` `MISSING_REQUIRED_CONFIG` when intake env is incomplete.
- `intake-run-summary` returns HTTP 200 with `ok: true` and a `summary` object when config is valid and the workflow completes.
- `intake-no-timer` proves the same business path without turning on `intakePoller` timer.

## How to get to it (user POV)

- Configure real intake values in `local.settings.json`, start Functions, `POST` `/api/intake-poller-test` (README section B).
- From this skill, `verify-acr.sh curl POST intake-poller-test` after launch+doctor.

## Driving it with verify-acr

Preconditions:

- Host launched by `verify-acr.sh` with doctor ok.
- For **missing-config** path: intake required env incomplete or deliberately invalid — safe default for scaffold proofs.
- For **live** path: non-placeholder HubSpot, Cosmos, and Service Bus intake settings; operator explicitly asked for a live run. Expect real enqueue side effects.

- **Missing config.** Run `VERIFY_ACR_PORT=17071 .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh curl POST intake-poller-test`. If intake config is incomplete, status is `HTTP 500` and body has `ok: false` and `error.code` equal to `MISSING_REQUIRED_CONFIG`. No requirement that HubSpot was called.
- **Live run (only when preconditions met).** Same curl. Status `HTTP 200`, body `ok: true` with `summary`. Assert summary shape from the response file (counts/flags the workflow returns). Do not print deal field payloads into chat logs.
- **Proof.** Retain `curl-intake-poller-test.status|headers|body`. For live runs, note in the proof that timer remained disabled (launch overrides).

## Gotchas

- Live intake **enqueues** Service Bus messages when queues are reachable. Keep `processClientQueue` / `processEmployeeQueue` disabled during verification unless the operator wants processors running.
- Success of unit tests under `src/tests/smoke/intakePoller*.test.mjs` does not verify this HTTP entry point.
- Phase 1A trigger property changes (`enter_in_central_reach`) must update search filters; after that change, a live proof must show eligible deals match the new gate — otherwise report failure, do not weaken the journey.
