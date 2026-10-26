# Connectivity test

Connectivity test lets an operator hit a local HTTP route and see whether required env is valid, which values look like placeholders, and whether HubSpot, CentralReach, Cosmos, and Service Bus clients can be constructed — without enabling the intake timer.

## Sub-features

- `conn-http-shape` returns JSON with `ok`, `env`, and `clients` on GET or POST.
- `conn-placeholder-safe` stays HTTP 200 and skips live client probes when config is missing or placeholder-filled.
- `conn-doctor` is the doctor probe that proves the verification host is the one we launched.

## How to get to it (user POV)

- From a running local Functions host, request `GET` or `POST` `/api/connectivity-test` (README section A).
- From this skill’s helper after `launch`, run doctor or curl against `connectivity-test`.

## Driving it with verify-acr

Preconditions:

- `verify-acr.sh launch` completed for this run.
- `verify-acr.sh doctor` reports `doctor ok`.
- Timer/queue triggers remain disabled.

- **GET connectivity.** Run `VERIFY_ACR_PORT=17071 .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh curl GET connectivity-test`. Status file shows `HTTP 200`. Body JSON includes keys `ok`, `env`, and `clients`.
- **POST connectivity.** Run the same helper with `POST connectivity-test`. Status is `HTTP 200` with the same top-level keys.
- **Placeholder-safe mode.** With placeholder `local.settings.json` values, body has `env.placeholderCount` ≥ 1 or `env.isValid` false, and `clients.*` remain `false` (no requirement that external networks were reached).
- **Proof.** Keep `curl-connectivity-test.status`, `.headers`, and `.body` under the run’s artifact directory. Body must not contain tokens, passwords, or PHI — only counts, booleans, and property/env names.

## Gotchas

- A process on port `7071` that the user started is not this instance. Doctor must fail or you must use the launch port (`17071` by default).
- `ok: true` with real credentials only means clients constructed; it is not proof that HubSpot search or CentralReach sync succeeded.
- `authLevel` is `function`; local Core Tools usually accept unauthenticated calls — if you get 401, check host keys, do not disable auth in production settings for convenience.
