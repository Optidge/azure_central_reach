# Round 1 log (sandbox 52311591 → production CentralReach)

One entry per push or change, in order. Each entry is filled from the tools, never from memory. Stop at the first unexpected result and record it here before anything else.

**Records.** IDs in `round-1.json`: Case 68493177375, BCBA 67036479540, BCBA 2 67023361578, BT/RBT 1 67037268070, BT/RBT 2 67048799131.

**Tools.**
- HubSpot read-back: `NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round 1` (plan only, no write).
- Logs (read-only), from the repo root:
  - `az monitor app-insights query --app centralreachserverless -g centralreachintegration --analytics-query @scripts/sandbox/kql/pipe-check.kql -o json`
  - `run-summary.kql` (set `recordId`), `record-timeline.kql` (set `recordId`), `errors-retries-deadletters.kql`.
- CentralReach GET (read-only, production): `NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record bt1|bcba|case`. Wait at least 150 s after a label POST before reading labels.

**Order.** Pipe check (no CR write), BT/RBT 1, BCBA, Case, R1-U1, poller and retries, R1-U2. Every CR write needs Zeke's go-ahead at that step.

## Before the first push

| Check | Result |
|---|---|
| Wave 2 commit deployed (commit hash) | |
| App setting names for `52311591` present (names only) | |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` present (name only) | |
| Sampling off: `AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__isEnabled` = false | |
| App state Running | |
| Round 1 re-run with `--write` for decisions 39/40 and O-40/O-42 (`care_coordinator_name`, `bt_rbt_2_work_schedule`, BCBA `email`) | |
| Read-back: `total_hours_btrbt_12` = 16, `care_coordinator_name` = Zeke Swanson, BCBA `email` filled (B9), BT/RBT 1 `active_cases_count` filled (T7) | |

## Entry template

Copy this block for each step.

```text
### Step N: <short name>                                  Requirement IDs: <BR.., C.., T..>
Go-ahead (Zeke, verbatim, time):
HubSpot change: <record, property, old → new>               Time (UTC):
Expected (from the matrix):

Logs
  Webhook accepted / queued / runs / CR writes (pipe-check):
  Run summary (run-summary.kql):
    invocationId:            attempt:        source:
    outcome:                 reasonCode:     operation:
    changedFieldNames:
    crCalls (kind, status):
    labels (posted, confirmed, skip_window):
    writeback (written, status):
  Errors, retries, dead-letters:
  BR21 check: no test value in any line (yes/no):

CentralReach GET (check-cr-record.mjs): <PASS n, FAIL n, SKIP n>
  Fails: <requirement ID, expected, got>

HubSpot read-back: last_sync_status / CR ID / other BR13 properties:

Result: PASS | FAIL | STOPPED          Notes:
```

## Entries

_None yet._
