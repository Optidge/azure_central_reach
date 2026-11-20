# Sandbox testing hand-off (2026-11-20)

For any agent continuing the sandbox testing work. Read this first, then the files it names.

## Goal

Zeke's intent: prove **every requirement in the Google Drive integration guide** with live tests. The tests run in HubSpot sandbox `52311591`, through Azure (kept running for all of Stage 8), into CentralReach, with a log of exactly what happened.

## Who owns what

| Area | Owner | Files |
|---|---|---|
| Build (wave 2: lanes D, E; the final review; the commit) | "Architecture update in progress" chat, `local_a0491721-671a-48fd-8517-62f3fb0833b4` | `BUILD-PLAN.md`, `OPEN-ITEMS.md`, `src/`, `requirement-tests.json` |
| Testing prep and runs | the Q&A / testing chat (this hand-off) | `sandbox-test-matrix.md`, `scripts/sandbox/create-test-records.mjs`, `sandbox-rounds/` |

Testing agents never edit BUILD-PLAN or `src/`. They send the build chat the exact text, quoting Zeke verbatim.

## State

| Item | Status |
|---|---|
| Wave 1 (lanes A, B, L, C) | Committed `c9d0edf`. 952 tests pass. Not pushed. |
| Wave 2 (D: Case wiring; E: employee wiring, Contact fan-out) + row 3.20 (run summary log) | **Not built yet.** Done in the build chat. |
| Azure Function App `centralreachserverless` | **Stopped** (checked 2026-11-20). It runs old code. Do not start it before the wave 2 deploy. |
| Sandbox test matrix | `docs/workstreams/architecture-update/sandbox-test-matrix.md`. Drafted, reviewed by two agents (guide and code), fixes applied. Committed on Zeke's word, 2026-11-20. |
| Record script | `scripts/sandbox/create-test-records.mjs`. Plan-only and write runs passed. It is re-runnable: it reuses records by email or name. Committed. |
| Round 1 sandbox records | **Created 2026-11-20** (9 records, all linked, decoys set). IDs and the read-back are in `sandbox-rounds/round-1.json` and in the matrix section "Round 1 records". Entered in CentralReach is blank everywhere. |
| Anything written to CentralReach | Nothing. |

## Order (Zeke, 2026-11-20)

1. Wave 2 is built, the final review runs, and the commit happens on Zeke's word. That happens in the build chat.
2. Plan review with Zeke. The build chat applies the held "Order after the build" edits: Azure runs for all of Stage 8, row 3.20, and App Insights sampling is off.
3. Round 1 is created (done 2026-11-20). After the wave 2 commit, Zeke re-runs the plan-only check from his terminal: `NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round 1`. Agents cannot run it, because the auto-mode classifier blocks scripts that read `local.settings.json`. If wave 2 changed what the code reads, Zeke re-runs it with `--write`, which updates the round 1 records in place. Before each push, read the record again (T7 `active_cases_count` was still blank 60 s after the create).
4. Azure step 7.3: settings for `52311591`, sampling off, deploy the reviewed commit. Each write needs Zeke's go-ahead.
5. Start the app and keep it running. Push one record at a time by setting Entered in CentralReach = Yes on Zeke's go-ahead. The order is BT/RBT 1, then the BCBA, then the Case. After each push, run a read-only CR GET and compare it with the matrix. Read the `Sync run summary.` log.
6. R1-U1 (updates), then R1-U2 (blank round, closes O-35), then rounds R2 (CO) and R3 (NJ). Then Stage 9.

## Open items

- **C20, total hours: the HubSpot formula is `1 + 1`.**
  - Every production Case holds 2 (2,876 of 2,876), and round 1 shows 2 for 10 + 8.
  - **Zeke, 2026-11-20:** "While testing I'll fix the hours_bt_work_schedule_1 + hours_bt_work_schedule_2 and note for an agent once it's done." He corrects the formula in the sandbox himself during testing and tells the agent when it is done.
  - Then the agent reads round 1 back (expected 18) and records C20.
  - Production gets the same fix by Zeke before go-live, after Danny or United Care confirm the formula was not on purpose. No code change.
- **C30 / C29 defect (guide-confirmed).** The mapper sends the "Other" summary when the carrier is blank (`carrier || otherSummary` in `buildClientMetadata.mjs`). The guide (lines 369, 370, 519, 528) uses the summary only when the carrier is Other. **Sent to the build chat on 2026-11-20 on Zeke's "Yes, send it"** (rule: blank carrier → blank, whatever the summary holds). The fix and its `[C29]`/`[C30]` tests are built there.
- **C36.** `referral_source` is read-only on the Case and its source is unknown. The question is with Zeke.
- **A-22.** Zeke has to confirm the BR11 reading before the final review.
- **O-8.** The Workday ID format is pending Danny/Sara.
- The other open and held requirement rows are listed in the matrix with their reasons.

## Rules (all from Zeke)

- HubSpot production `50317927` is read-only, always. Reads go only through a guarded GET and search script that checks the portal first and prints counts and names only. Example: `/private/tmp/.../scratchpad/prod-mirror-sources.mjs` (scratchpad; may be gone).
- Every CentralReach write is production and needs Zeke's go-ahead at that step.
- Only create tests that prove a section 9 requirement. Each record or step names its requirement ID.
- Check the Google Drive guide (local copy `guide-extract-2026-11-20.md`) before asking Zeke any question.
- No commit, push or deploy without Zeke's word. Never open `.env` or `local.settings.json`, and never print secrets.

## Facts found this session (also recorded in the matrix)

- **Employee mirror fields** come from the linked Contact (production, counts only):
  - `address` ← `address`
  - `apartment__home` ← `apartment`
  - `city_home` / `location_city` ← `city`
  - `state_home` ← `state_dropdown`
  - `postal_code_home` ← `zip`
  - `employee_phone` ← `phone`
  - BT/RBT `gender` ← `gender_employee` / `gender`
- **Case read-only fields** follow the Guardian Contact:
  - `location` ← `location` / `state_dropdown`
  - `email`, `phone`
  - `guardian_first_name` / `guardian_last_name` ← `firstname` / `lastname`
- `total_hours_bt1bt2_work_schedule` is calculated with the formula `1 + 1` (C20 above); the script sets `hours_bt_work_schedule_1/2`.
- The sandbox `bcba_name` requires every word Capitalized, and it refused "#1", "R1" and "BCBA". So the display names `bcba_name` and `bt_name` use words only ("Zeke Swanson Bcba Azure Test Round One"). The names sent to CR end in "R1".
- BCBA `email` does not mirror from the Contact in the sandbox (production does). Row 6.4 reads the Contact email directly.
- The upcoming-auth `_f` dates get moved into the live auth dates by a workflow, so decoy dates are 2030-01-01.
- In production only 19 of 96 sampled BT/RBTs have `state_home`, so most BT/RBTs will have no mailing state in CR.
- Association IDs (sandbox): Case → BT/RBT Primary BT 1/2 = 238/240; Potential IA 251; Potential Supervising 249; Potential BT 1 242; unlabeled Case → BT/RBT 187.
