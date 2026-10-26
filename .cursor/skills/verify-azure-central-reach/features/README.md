# Azure Central Reach verification map

This directory is the maintained source for verifying operator-facing behavior of the local Functions host. Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Repo has `local.settings.json` (from `local.settings.example.json` is fine for scaffold proofs).
- Launch via `.cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh launch` on `VERIFY_ACR_PORT` (default `17071`).
- Run `verify-acr.sh doctor` and require `doctor ok`.
- Timer and queue triggers must stay disabled for these recipes (launch enforces that).
- Never drive a `func` process that was not started by this verification run.
- Do not commit `local.settings.json`, `.env`, or artifact bodies that might contain secrets.

## Driving conventions

- Start every recipe from a doctor-ok host unless preconditions say otherwise.
- Prefer route paths (`connectivity-test`, `intake-poller-test`, `client-sync-test`) over ad-hoc URLs.
- Treat every command as literal. Keep quoted JSON and flags unchanged.
- Run HTTP actions through `verify-acr.sh curl`.
- Keep proof artifacts under `.cursor/skills/verify-azure-central-reach/artifacts/<run-id>/`.

## Proof and skip reporting

- Capture the HTTP action and the resulting status/body, not only the final status code.
- Mutation or enqueue proof includes summary fields from the response (counts, codes) — never PHI fields.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path (e.g. do not claim intake HTTP verified because `npm test` passed).

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features`
2. `How to get to it (user POV)`
3. `Driving it with verify-acr`
4. `Gotchas`

## Features

- [Connectivity test](./connectivity-test.md) — config validation and client factory smoke over HTTP.
- [Intake poller manual test](./intake-poller-test.md) — run intake workflow once via HTTP before enabling the timer.
- [Client sync scaffold](./client-sync-scaffold.md) — dev-only `client-sync-test` contract (`dealId` required; workflow may be unimplemented).
- [HubSpot workflow webhook](./hubspot-webhook.md) — `POST /api/hubspot-webhook` signature check and enqueue gate.
- [Unit smoke suite](./unit-smoke-suite.md) — `npm test` as the offline proof gate.
