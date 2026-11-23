# Azure CentralReach Integration (Azure Functions)

This repository is the Azure Functions version of the HubSpot to CentralReach integration.
The AWS repository remains read-only reference material and should not be modified from this repo.

## Setup

1. Ensure Node.js and Azure Functions Core Tools are installed locally.
2. Copy `local.settings.example.json` to `local.settings.json`.
3. Install dependencies:
   - `npm install`

## A. Scaffold Smoke Test

Purpose: verify local HTTP scaffold wiring only.

1. Keep local timer/queue functions disabled in `local.settings.json`:
   - `AzureWebJobs.intakePoller.Disabled=true`
   - `AzureWebJobs.processClientQueue.Disabled=true`
   - `AzureWebJobs.processEmployeeQueue.Disabled=true`
2. Run:
   - `npm test`
   - `npm run start`
   - `curl -i http://localhost:7071/api/connectivity-test`

Expected behavior:
- This can run with placeholder values.
- `/api/connectivity-test` returns a JSON response and reports missing/placeholder config safely.

## B. Intake Poller Manual Test

Purpose: run intake poller business logic manually through HTTP before enabling the timer.

1. Configure real local intake values in `local.settings.json` (HubSpot, Cosmos, and Service Bus intake dependencies).
2. Run:
   - `npm run start`
   - `curl -i -X POST http://localhost:7071/api/intake-poller-test`

Behavior notes:
- If required intake configuration is missing, endpoint returns HTTP 500 with:
  - `ok: false`
  - `error.code: "MISSING_REQUIRED_CONFIG"`
- In missing-config mode, endpoint does not perform external network calls.

## C. Deployment Gate

Do not deploy until manual intake poller test confirms:
- HubSpot eligible deals can be fetched.
- `shouldSync` logic runs.
- Cosmos lease/dedupe state works.
- Service Bus client-sync messages are enqueued.
- No PHI appears in logs, state, or Service Bus messages.

## D. Deployment Command Later

When deployment is explicitly approved:
- `func azure functionapp publish centralreachfunction`

## E. Timer Enablement

Do not enable scheduled intake polling until the deployed manual intake endpoint succeeds in Azure.

## Configuration Notes

- `local.settings.json` is local-only and must never be committed.
- Azure Function App settings configured in Azure do not automatically sync to local.
- Environment variables for deployed environments belong in Function App settings.
- **Required names** for intake and full sync are defined in `src/lib/config.mjs` (`REQUIRED_ENV_NAMES`, `REQUIRED_INTAKE_ENV_NAMES`). Use `local.settings.example.json` as the template for Azure parity (plus optional keys below).

### CentralReach auth (no account ID)

This app does **not** use a CentralReach account ID (or similar tenant/account setting). Do not add one to Azure or `local.settings.json` for this repo.

Partners Enterprise API auth is only:

- `CR_CLIENT_ID`
- `CR_CLIENT_SECRET`
- `CR_API_KEY`
- `CR_BASE_URL`
- `CR_TOKEN_URL`

### Portal and record gate settings (required)

Both are in `REQUIRED_ENV_NAMES` in `src/lib/config.mjs`. The app does not start a run without them.

- `HUBSPOT_PORTAL_ID` — required. The HubSpot portal this app serves: sandbox `52311591` or production `50317927`. Any other value is invalid configuration. It builds the HubSpot record links, and every queue message must carry the same portal ID. The HubSpot token must belong to this portal. Before any HubSpot call the app reads `GET /account-info/v3/details` once (the answer is cached) and compares the portal ID. If they differ, the run ends with the error code `HUBSPOT_PORTAL_MISMATCH`, which names both portal IDs; no CRM call is made, and the message is retried and then dead-lettered like any configuration failure. The private app needs access to the account-info endpoint.
- `SYNC_RECORD_GATE_PROPERTY` — required. The HubSpot checkbox property a record must have set to true before it syncs. The sandbox value is `sandbox_test_field`. The value `none` turns the gate off.

### Optional settings this repo reads (not in required lists)

These are used in code but are not required by `config.mjs` validation:

- `INCLUDE_TEST_RECORDS` — `true` lets records with `test_record` = true sync, for a deliberate end-to-end test run only. Anything else, or not set, skips them.
- `HS_BCBA_OBJECT_TYPE_ID`, `HS_BT_RBT_OBJECT_TYPE_ID` — may be left out. The object type IDs come from the portal table in `config.mjs`; a value that differs from the table is invalid configuration.
- `HUBSPOT_EMPLOYEE_ID_PROPERTY`, `ALLOW_EMPLOYEE_CREATE`, `PUT_ONLY_MODE` — employee sync behavior (`config.mjs` runtime flags)
- `INTAKE_POLLER_SCHEDULE`: optional six-field NCRONTAB schedule for the intake poller; hourly (`0 0 * * * *`) when not set
- `CR_CLIENT_CONTACT_FORM` — client payload ContactForm default
- `HUBSPOT_WEBHOOK_CLIENT_SECRET` — legacy private-app **client secret** (Auth → Show secret) for `POST /api/hubspot-webhook`. Not the access token. One secret per portal.
- `HUBSPOT_WEBHOOK_URI` — public URL HubSpot calls, including `https` and path. Required when the function host URL differs from that workflow URL, because v2 signature validation hashes that exact URI.

### Local-only keys (not used by this Functions repo)

If your `local.settings.json` was copied from another project or tooling, these names are **not read** by this codebase (`config.mjs` and `src/` do not reference them). Safe to omit from Azure Function App settings for this app:

- `HUBSPOT_FIELD_ADMIN_TOKEN`
- `HUBSPOT_SETTINGS_CLIENT_SECRET`
- `HUBSPOT_FIELD_ADMIN_USER_IDS`
- `HUBSPOT_PUBLIC_BASE_URL`
- `FIELD_MAPPING_DEMO_MODE`
- `ALLOW_UNVERIFIED_TYPED_METADATA_WRITES`

## Build Order

1. Intake poller / intake queue (phase 1)
2. Client sync (phase 2)
3. Employee sync (phase 3)

## HubSpot workflow webhook

`POST /api/hubspot-webhook` accepts an ID-only workflow webhook. A Case, BCBA or BT/RBT notice queues the client or employee sync. A Contact notice queues a `contactChange` message, and the worker fans it out to the Cases linked to that Contact (one ordinary Case sync each; it never queues a BCBA). The hourly checkpointed poller and the daily sweep of linked records are the backup path.

- Auth on the function is anonymous. The legacy private-app **v2** signature is the check (`X-HubSpot-Signature`, `X-HubSpot-Signature-Version: v2`).
- Body is `objectTypeId` plus `recordId`. Case is `0-3` and Contact is `0-1`. BCBA and BT/RBT must match the object type IDs of the configured portal (`HUBSPOT_PORTAL_ID`).
- Object type IDs (BUILD-PLAN section 3). Sandbox `52311591`: Case `0-3`, BCBA `2-72890322`, BT/RBT `2-72890325`, Contact `0-1`. Production `50317927`: Case `0-3`, BCBA `2-48354212`, BT/RBT `2-48354559`, Contact `0-1`. The retired sandbox portal `50850427` is not valid.
- `webhook-triggers.json` stays empty until each HubSpot workflow's trigger properties are exported into it; it is never pre-filled from the code, because `npm run check:triggers` compares it with what the code expects. `node scripts/check-triggers.mjs --expected` prints the expected trigger properties per object (no network), for setting up the workflows.
- Every queued message carries the configured portal ID. A worker completes a message for another portal without acting.
- Set `HUBSPOT_WEBHOOK_CLIENT_SECRET` before expecting HTTP 202. Until then the route returns 503 `MISSING_WEBHOOK_SECRET`.

## Client Queue Trigger

- `processClientQueue` is the production Service Bus trigger path for client sync.
- `runClientSyncWorkflow` is invoked from queue messages and should not be bypassed in production.
- Keep `client-sync-test` as a dev scaffold only; do not use it as the primary sync path.
- `processClientQueue` should never silently consume messages without syncing.
- Invalid queue messages should fail safely and rely on Service Bus retry/dead-letter behavior.

## Client Sync Testing Stages

1. Run local tests first:
   - `npm test`
2. Start the Functions host:
   - `npm run start`
3. Optional dev-only scaffold check (not production path):
   - `curl -i -X POST "http://localhost:7071/api/client-sync-test" -H "Content-Type: application/json" -d '{"dealId":"TEST_DEAL_ID"}'`

### Full Production-Level Local Client Sync Test

After unit tests pass and local settings contain real non-placeholder integration values:

- `AzureWebJobs.intakePoller.Disabled=false`
- `AzureWebJobs.processClientQueue.Disabled=false`
- `AzureWebJobs.processEmployeeQueue.Disabled=true`

Expected production path:

- `timer -> intakePoller -> Service Bus client-sync-queue -> processClientQueue -> runClientSyncWorkflow`

## Employee Sync Testing Stages

Keep `AzureWebJobs.processEmployeeQueue.Disabled=true` until employee sync implementation is complete and validated.

After implementation, full production-level local testing can use:

- `AzureWebJobs.intakePoller.Disabled=false`
- `AzureWebJobs.processClientQueue.Disabled=false`
- `AzureWebJobs.processEmployeeQueue.Disabled=false`

Expected production path:

- `timer -> intakePoller -> Service Bus employee-sync-queue -> processEmployeeQueue -> runEmployeeSyncWorkflow`

Employee poller guidance:

- Employee trigger/poller behavior should stay aligned with AWS main branch (`flows/combined_poller.mjs`).
- Azure intake poller should enqueue only lightweight, non-PHI employee queue messages:
  - `workflow`
  - `source`
  - `employeeType`
  - `recordId`
  - `hsLastModifiedDate`
  - `enqueuedAt`

Canonical AWS business logic reference:

- [https://github.com/ezekielswanson/aws_code/tree/main](https://github.com/ezekielswanson/aws_code/tree/main)

## Documentation

- **[Source of truth (client spec)](docs/SOURCE-OF-TRUTH.md)** — business field map and rules live in [Google Drive (Optidge V2, Oct 2026)](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit); the repo does not mirror that document.
- [Current field mappings (code as-built)](docs/hubspot-centralreach-field-mappings-current-state.md)
- [Sandbox vs production MVP](docs/sandbox_vs_production_mvp.md)
