# Phase 1A tail — Employee intake + queue alignment

**Status:** STANDBY — wait for user context in this agent thread before coding.

**Repo:** `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`

---

## Goal

Keep **BT/RBT** and **BCBA** intake poller behavior correct for United Care, and **align Azure Service Bus** with production queue names:

| Prod queue (Azure) | Purpose |
|--------------------|---------|
| `client-sync-queue` | Client sync (unchanged here) |
| `rtbt-sync-queue` | BT/RBT employee sync |
| `bcba-sync-queue` | BCBA employee sync |

**Code today:** single `EMPLOYEE_SYNC_QUEUE_NAME` + one `processEmployeeQueue` trigger in `src/functions/processEmployeeQueue.mjs` (default `employee-sync-queue`). Intake sends all employee types to that one sender in `src/lib/serviceBusClient.mjs`.

---

## Current architecture (as-is)

```text
intakePoller
  → searchEligibleBtRbtRecords / searchEligibleBcbaRecords (pipeline + stage allowlists)
  → shouldSyncBtRbt / shouldSyncBcba
  → sendEmployeeSyncMessage (one queue)
processEmployeeQueue (one Service Bus trigger) → employeeSyncWorkflow
```

| Piece | Location |
|-------|----------|
| BT/RBT search | `src/lib/hubspotClient.mjs` |
| BCBA search | same |
| Sync gates | `shouldSyncBtRbt`, `shouldSyncBcba` in `intakePollerWorkflow.mjs` |
| Enqueue | `sendEmployeeSyncMessage` in `serviceBusClient.mjs` |
| Queue trigger | `processEmployeeQueue.mjs` — `queueName: process.env.EMPLOYEE_SYNC_QUEUE_NAME` |
| Config | `HS_BT_RBT_*`, `HS_BCBA_*` in `config.mjs` |
| Guide object IDs | BT/RBT `2-48354559`, BCBA `2-48354212` |

---

## Out of scope (unless user expands)

- Client hybrid change detection (`phase-1a-client-intake-trigger.md`) — employee intake should follow the same webhook + discovery/reconciliation pattern when client 1A lands
- CR/HubSpot field mappings (Phase 1B)
- Azure app settings / deploy / enable triggers

---

## Design decisions (user must confirm)

- [ ] **Target model (pick one):**
  - **A.** Two queue triggers: `processRtbtQueue` + `processBcbaQueue` (or one function, two registrations if model allows).
  - **B.** Keep one processor; route by `employeeType` in message (still need **two senders** from poller).
  - **C.** Single prod queue (would require Azure SB change — unlikely).
- [ ] **Env vars:** Replace `EMPLOYEE_SYNC_QUEUE_NAME` with `RTBT_SYNC_QUEUE_NAME` + `BCBA_SYNC_QUEUE_NAME`, or keep one + add second?
- [ ] **Message shape:** Keep `{ recordId, employeeType, hsLastModifiedDate, workflow, source }` unchanged?
- [ ] **Stage allowlists:** Confirm against guide §1 pipelines and `docs/sandbox_vs_production_mvp.md`.
- [ ] **Local dev:** `local.settings.json` queue names for emulator vs prod names.

---

## Implementation checklist (when authorized)

### Code — routing

- [ ] `serviceBusClient.mjs`: two senders (`rtbt-sync-queue`, `bcba-sync-queue`) or factory by `employeeType`.
- [ ] `intakePollerWorkflow.mjs`: call correct send per `HUBSPOT_EMPLOYEE_TYPES`.
- [ ] `config.mjs`: required env for queue names; update `REQUIRED_INTAKE_ENV_NAMES` / full sync list.
- [ ] `local.settings.example.json`: document prod queue names.

### Code — triggers

- [ ] Option A: duplicate trigger pattern in new file or second `app.serviceBusQueue` in same file (Node v4 model).
- [ ] Shared handler: refactor `processEmployeeQueue` to shared `handleEmployeeQueueMessage` invoked by both triggers.
- [ ] Disable flags: `AzureWebJobs.processRtbtQueue.Disabled` etc. — align with example + docs/open-items.md.

### Tests

- [ ] `intakePollerEmployeeRules.test.mjs`
- [ ] `processEmployeeQueue.test.mjs`
- [ ] `serviceBusMessage.test.mjs` / config smoke if env names change

### Docs

- [ ] `docs/open-items.md` §2 — mark decision resolved.
- [ ] README employee path diagram if queue names change.

---

## Acceptance criteria

- [ ] `npm test` passes.
- [ ] BT/RBT candidates enqueue to **`rtbt-sync-queue`** only; BCBA to **`bcba-sync-queue`** only (names configurable via env).
- [ ] Both queues processed by employee sync workflow with correct `employeeType`.
- [ ] No regression to client sync queue.
- [ ] Document Azure settings names for Phase 3 (no deploy in this task unless user asks).

---

## Primary files

- `src/lib/serviceBusClient.mjs`
- `src/workflows/intakePollerWorkflow.mjs`
- `src/functions/processEmployeeQueue.mjs` (+ possible new function file)
- `src/lib/config.mjs`
- `local.settings.example.json`
- `src/tests/smoke/processEmployeeQueue.test.mjs`
- `src/tests/smoke/intakePollerEmployeeRules.test.mjs`

---

## Agent instructions

1. Read this file and `docs/open-items.md` §2.
2. **Stop** until user confirms queue model (A/B/C) and env naming.
3. When authorized: implement, test, list Azure app settings delta.
