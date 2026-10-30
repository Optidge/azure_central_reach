---
name: verify-azure-central-reach
description: "Drive the Azure Central Reach Functions app (HTTP API + local func host) to prove connectivity, intake poller, and client sync scaffold behavior. Use when verifying azure_central_reach changes, HubSpot/CR intake gates, or local Functions HTTP routes. Sandbox change-detection done criteria and the separate production pass are in SANDBOX-DONE.md. Do not add a second verification skill."
---

# Verify Azure Central Reach

This skill is for agents. The primary user surface is the **local Azure Functions HTTP API** (not a browser UI). Secondary surfaces: `npm test` unit/smoke suite, Service Bus queue processors (do not enable for default verification).

Repo root is the workspace containing `package.json` and `src/functions/`.

**Sandbox “done” and production tomorrow:** read [`SANDBOX-DONE.md`](SANDBOX-DONE.md) before claiming the integration is verified. This harness proves local HTTP shape only. A sandbox row is done only with HubSpot, Azure `last_sync_status`, and a CentralReach read-back on portal `50850427`. Production verification is a separate pass. Do not create another verification skill for the same app.

## Launch

Preconditions:

- Node.js and Azure Functions Core Tools (`func`) on `PATH`.
- `local.settings.json` exists (copy from `local.settings.example.json`). Placeholder values are fine for connectivity HTTP shape checks.
- Prefer Azurite when `AzureWebJobsStorage` is `UseDevelopmentStorage=true` (HTTP routes may still answer without it; queue listeners will not).

Start a **dedicated** host so you never share the user’s interactive `func start` on 7071:

```bash
VERIFY_ACR_PORT=17071 \
  .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh launch
```

Ready when `GET http://127.0.0.1:17071/api/connectivity-test` returns HTTP 200 with a JSON body containing `ok` and `env`. The helper waits up to ~60s and prints `pid`, `base`, `log`, and `artifacts`.

Launch **forces** these overrides regardless of `local.settings.json`:

- `AzureWebJobs.intakePoller.Disabled=true`
- `AzureWebJobs.processClientQueue.Disabled=true`
- `AzureWebJobs.processEmployeeQueue.Disabled=true`

Never enable timer/queue triggers for a default proof run. Real HubSpot/Cosmos/Service Bus calls only when the feature file’s preconditions say so and credentials are non-placeholder.

Teardown: see Cleanup.

## Doctor

Before driving, or whenever anything looks off:

```bash
VERIFY_ACR_PORT=17071 \
  .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh doctor
```

Doctor must report `process=ok`, HTTP 200 from `/api/connectivity-test`, and `doctor ok`. If it fails, refuse to drive — do not curl a foreign process on another port.

## Drive

Harness: **HTTP via `verify-acr.sh curl`** (curl under the hood). Routes live under `/api/`.

```bash
# Shape: verify-acr.sh curl METHOD path [extra curl args...]
VERIFY_ACR_PORT=17071 \
  .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh curl GET connectivity-test

VERIFY_ACR_PORT=17071 \
  .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh curl POST intake-poller-test

VERIFY_ACR_PORT=17071 \
  .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh curl POST client-sync-test \
  -H "Content-Type: application/json" \
  -d '{"dealId":"VERIFY_DEAL"}'
```

Stable handles (route names):

| Route | Methods | Role |
|-------|---------|------|
| `connectivity-test` | GET, POST | Config + client factory smoke |
| `intake-poller-test` | POST | Manual intake workflow (HubSpot search → Cosmos → Service Bus enqueue) |
| `client-sync-test` | GET, POST | Dev scaffold only; requires `dealId` |

Unit suite (no host required):

```bash
npm test
```

Read `.cursor/skills/verify-azure-central-reach/features/` before claiming a feature is verified. Drive the entry points listed there; do not substitute a unit test for an HTTP journey when the map requires HTTP.

## Evidence

Proof directory (default):

`.cursor/skills/verify-azure-central-reach/artifacts/<VERIFY_ACR_RUN_ID>/`

Each `curl` writes `curl-<path>.status`, `.headers`, and `.body`. Doctor writes `doctor-connectivity.json`. Host log: `/tmp/verify-acr/func.log` (or `$VERIFY_ACR_STATE_DIR/func.log`).

Proof standards:

- Exercise the real HTTP route a deployer would hit for manual gates (README sections A/B), not internal setters.
- Capture **request action** (method, path, body) and **resulting HTTP status + JSON body**.
- For intake with real config: also confirm side effects the feature file names (summary fields, queue enqueue counts) — never log PHI; assert summary shape only.
- Mocks belong only at production boundaries already isolated in tests; live HTTP proofs against placeholder config must assert safe missing-config behavior (`MISSING_REQUIRED_CONFIG` or `ok: false` / placeholder counts), not invent success.
- Do not treat a green `npm test` alone as proof of a mapped HTTP feature.

## Cleanup

```bash
VERIFY_ACR_PORT=17071 \
  .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh cleanup
```

Stops **only** the pid recorded by launch. Does **not** delete artifact files or the func log. Never `pkill func` / kill by process name.

## Helpers

Executable: `.cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh`

| Command | Purpose |
|---------|---------|
| `launch` | Start `func start --port $VERIFY_ACR_PORT` with triggers disabled |
| `doctor` | Process + connectivity read-only check |
| `curl METHOD path …` | Drive `/api/<path>`; write status/headers/body under artifacts |
| `cleanup` | Kill launched pid; keep evidence |

Env overrides: `VERIFY_ACR_PORT` (default `17071`), `VERIFY_ACR_BASE_URL`, `VERIFY_ACR_STATE_DIR` (default `/tmp/verify-acr`), `VERIFY_ACR_RUN_ID`, `VERIFY_ACR_ARTIFACT_DIR`.

Two agents must use different `VERIFY_ACR_PORT` and `VERIFY_ACR_STATE_DIR` values. Do not drive an instance you did not launch.

## Feature map

Index: `.cursor/skills/verify-azure-central-reach/features/README.md`
