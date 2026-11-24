# Retest run sheet (2026-11-24): pending build, NY + CO + NJ, webhook and poller on

Rewritten 2026-11-24 by the apply worker, offline (no HubSpot, CentralReach or Azure call; nothing run with `--write`). It applies every finding of `../sandbox-coverage-review-C-2026-11-24.md` (B1-B6, S1-S6, O1-O11, C1-C8), the 22 changes AB-1 to AB-22 of `../run-sheet-changes-from-AB-2026-11-24.md` (AB-22, R1c, approved), the recency audit fixes for this sheet (`../requirements-recency-audit-2026-11-24.md` 2.6 and section C), the B2 follow-up of build chat 2 (the retry after a create is `skipped gate: update` and HubSpot stays **blank**), and the N1 field-wipe rows (UW-1 to UW-5). The per-finding record is `../apply-C-and-audit-log-2026-11-24.md`. Rows are in `../sandbox-test-matrix.md`; per-requirement coverage in `../sandbox-coverage-ledger-2026-11-24.md`.

**Re-check applied (2026-11-24, apply-recheck worker, offline).** Every finding of `../sandbox-coverage-recheck-2026-11-24.md` (G1-G5, E1-E10, O1-O9, the exception and citation fixes, the slice 08 scope finding, the S8-4 merge) is applied; the per-finding record is `../apply-recheck-log-2026-11-24.md`. Main changes: explicit promote-workflow OFF / ON / OFF switches (S0, S3c-0b, S3e); the "linked, creates ticked, updates blank" legs moved to the S3a set (S3a-2); BR4-P measured on the S3c poller creates; the N1 core-PUT proof moved to S2 with real core edits; the SSN guard (client ruling 2026-11-24) in P-1, S0 and UW-3; R1c BT/RBT 1 created with a Workday ID and the R1c BCBA temporary → Workday transition (R1c-WD) on the pending build; X07a-10 not run (TRG-070 / TRG-305 OFFLINE-ONLY); item 20 in the P-1 commit; S8-4 merged into S4 on the hourly schedule.

**Zeke's asks this sheet answers (2026-11-24).** "our end to end test must test EVERY requirement, for all entities, in each state, the the webhook and the poller on in azure"; "please ensure the test is written that it is the most efficient and quickest path to cut to phase 1 of production please."; "If it makes sense to actually use test records in the sandbox and then in central reach do so. Live calls from test records are ok."

**Approval column.** "Test-record approval" = a sandbox edit on a test record or a CentralReach call caused by one, covered by Zeke's 11/24 approval: no separate go-ahead. "Zeke at step" = an Azure write (setting, poller on/off, deploy, receiver, Cosmos item), a workflow switched on or off in the HubSpot sandbox (the promote workflows included), the commit, a guide write, or anything on a non-test record: ask at that step. HubSpot production is read-only always (reads need no ask, BUILD-PLAN hard stop 2). **No sandbox record write before the pending build is deployed and proven (S0-D):** the webhooks are live and would push through `655b385`. This includes P-3 and P-7 (re-check O3): they run after S0-D, at S1 item 0.

## 1. Critical path to phase-one sign-off

Phase one = new records created through the creates gate, and later updates of records the integration created (Zeke 2026-11-24). Every step S0-S11 is **P1** and can be signed off on its own; **S12 holds the only P2 rows** (existing or hand-linked records) and can run after the cutover.

| # | Step | P | Day | Waits on |
|---|---|---|---|---|
| 1 | Build chat builds item 20 (P-1b), then commits the pending build with the N1 fix, the SSN guard and item 20 (Zeke's commit word, P-1) | P1 | 0 | build chat, Zeke |
| 2 | S0 pre-flight: Zeke's sandbox setup (promote workflows OFF), CR hand-adds and UW markers on test records, read-only checks (SSN shape included) | P1 | 0 / 1 | 1 for SU-1 only; the rest in parallel |
| 3 | S0-D deploy (app stopped, poller off), add the email receiver, prove the deployed code (SU-1) | P1 | 1 | 1, Zeke at step |
| 4 | S1 P-3 / P-7 (refresh workflows off), refresh R1 / R2 / R4, create rounds 3, 5, 6, 7, 10 and the hand-made records in HubSpot | P1 | 1 | 3 |
| 5 | S1u UW metadata-only leg (no core PUT) | P1 | 1 | 4 |
| 6 | S2 employee date send-back (U2-4, U2-5) and the UW core-PUT leg (UW-1 to UW-5) | P1 | 1 | 5 |
| 7 | S3 gate window: webhook creates and skip legs (promote OFF, poller off), negatives, poller on, hand tick, promote ON, poller creates, first updates, close (promote OFF) | P1 | 1 | 6, Zeke at step (settings, poller, workflow switches) |
| 8 | S4 webhook update push, all three states, poller hourly (S8-4) | P1 | 1 | 7, Zeke at step (schedule) |
| 9 | S5 poller pushes (start the S8-3 chain after S5c) | P1 | 1 | 8 |
| 10 | S6 error pushes (one cause per record), S7 restores, S8 blank round | P1 | 1 / 2 | 9 |
| 11 | S9 day-1 end set-ups; S10 day 2: sweep proofs after 08:00 UTC, 13:00 ET flip | P1 | 2 | 10 |
| 12 | S11 sign-off read-out (P1) | P1 | 2 | 11 |
| 13 | S12 P2 rows; S13 clean-up | P2 / — | 2 | 12 |

**Shortest route to phase-one sign-off:** steps 1-12 in two calendar days, the day-2 work being the sweep check after 08:00 UTC (any time in the US morning) and the 13:00 ET flip. P2 (S12) and clean-up (S13) are off the critical path and can run alongside the read-only production cutover checks.

## 2. Prerequisites

| # | Who | What | Blocks |
|---|---|---|---|
| P-1 | Zeke → build chat | Commit word for the pending build **including the N1 fix, the SSN guard (`build-chat-2-ssn-guard-2026-11-24.md`) and item 20** (P-1b), so the tested build is the cutover build (re-check O5); the retest runs exactly that commit (`MAPPING_VERSION` `stage7-2026-11-23`) | S0-D and everything after |
| P-1b | build chat (on Zeke's word) | **Build item 20** (sweep retry cap, package "before cutover", `BUILD-PACKAGE-DRAFT-2026-11-23.md:16`, `:1208`) with its offline test b2, before the P-1 commit. Name the item 20 file(s) for SU-1 | P-1; CLB-160, TRG-297 stay BLOCKED until then |
| P-2 | Zeke (HubSpot sandbox) | Team Member record for owner 161391908 (item 6). The owner re-saves on the R1 / R2 / R4 Cases happen **after** the deploy, in S1 | S1 (C10) |
| P-3 | Zeke (HubSpot sandbox), **after S0-D** (S1 item 0) | `referral_other` as a property sync; trigger lists (SU-6): Case list holds `service__stateregion_2`, `coordinator_export_status`, `care_coordinator_first_name`, `care_coordinator_last_name`, `guardian_first_name`, `guardian_last_name`, `email`, `phone`, `location`, `referral_source`; refresh workflows trigger on every mapped property. Made with the Case and BT/RBT refresh workflows off (re-check O3) | S1, S4 |
| P-4 | Zeke | One-line confirmation that no Contact workflow is needed (O-21 superseded for the Guardian fields; recency audit section C). Does not block the run; 43 ledger lines and 9 matrix rows carry "[pending Zeke: Contact workflow confirmation]" | ledger sign-off |
| P-5 | done 2026-11-24 (builder) | The three promote-after-create workflows are built in sandbox 52311591, **OFF**, enrolling from an active list (ID known AND creates = Yes AND link known; `../PROMOTE-WORKFLOW-PROMPT-2026-11-24.md` "Built"). **No creates workflow is built**: the script ticks the creates box; TRG-084 is PRODUCTION-ONLY unless Zeke builds one (open decision 2) | — |
| P-5b | Zeke (HubSpot sandbox), Zeke at step | Promote workflows **OFF** from S0 to S3c-0b (re-check O1); confirm at S0 and S3-0. ON only at S3c-0b; OFF again at S3e | S3a-2, S3c-0b |
| P-6 | Zeke (CR screen, test records; test-record approval) | On client 5384589: hand-add School 1052688, Pending 97151 Services 1156742, Aetna NY 1082497; set Chosen Name `AzT Chosen`, Middle Initial `Z`; **fill the client lists** per `../cr-live-checks-L1-L3-2026-11-24.md` section 4 (1 diagnosis code, 1 primary payor, 1 additional contact; every production client holds a payor and a diagnosis code, so UW-5's client leg is required before launch; open decision 7). On employees 5384530 and 5384531: Job Title `Azure Test Job Title`, Chosen Name `AzT Chosen`; Hire Date if the read holds `hireDate` (UW-4). Languages on 5384530 is an observation only (the PUT ignores it) | S0 baselines, S1 |
| P-7 | Zeke (HubSpot sandbox), **after S0-D** (S1 item 0) | Fix the "BT - Active Cases Sync" enrolment (question 13), or approve the hand-set fallback (BT-151 stays BLOCKED). Made with the BT/RBT refresh workflows off (re-check O3) | S3a T7 / R2-15 |
| P-8 | Zeke | Is the payor-status workflow in the sandbox (U-46)? If not, S4 keeps old line 28 by hand and LBL-082 becomes PRODUCTION-ONLY | S4 |
| P-9 | Zeke (CR screen) | SU-10: clients / employees 5384589, 5384531, 5384530, 5385360, 5385357 are active | S1 |
| P-10 | Zeke | Name the BT 1 start-date property the 1 PM workflow reads, and confirm sandbox 52311591 runs that workflow (X07b-3b) | S9 / S10 flip (else 4 lines stay BLOCKED) |
| P-11 | Zeke | Pick the S8-3 method (recommended: record-isolated label removal on 5385357); confirm the CR screen allows removing its labels | S8-3 |
| P-12 | Zeke (HubSpot sandbox) | Build the N6 failures reports and waiting views | U-40 (S7); 6 lines BLOCKED until then |
| P-14 | testing chat | Read-only S0 checks (SU-3, SU-4, SU-5, SU-8, SU-9, SU-11), the UW baselines and the SSN shape lines | S1 |

P-13 (UW-3 decision) is removed: the client ruled the SSN guard in on 2026-11-24 (re-check O6).

## 3. Stop rules

1. **Wrong or extra CR write.** Any CR value outside the expected set, a create where none is expected, a second CR record, or a second create POST for one record: stop.
2. **Entered = Yes on an unlinked record.** Never leave Entered = Yes on an unlinked record when its block (gate, `entry_not_yes`, `error`) is removed. `create-test-records.mjs --census` section (2) must be empty at S0, before S3e, at the end of S3 and at the end of every session (SU-11).
3. **Re-runs (review C B6).** `create-test-records.mjs --write` on a round that has a round file stops unless `--refresh` is given; `--refresh` only in S1, after SU-1. Never on `655b385`, whatever the poller state. Never after the round's update steps have started.
4. **First runs are full re-sends (review C B1).** The first run of every linked record after the deploy is `update` with every field in `changedFieldNames`: expected. Judge it on the CR values. A full re-send may still send **no core PUT** when CR already holds every mapped core value: not a fail (re-check O7). Fail: 1975-03-09 or 1980-07-04 in CR, a run ending `error`, or rule 5. `noop` is expected only after the first clean run.
5. **N1.** Any unmapped key BLANKED, CHANGED or ABSENT in `check-cr-record.mjs --unmapped compare`: stop the whole run and tell the build chat.
6. **A create's retry (B2 follow-up; re-check O2).** After a create, the 150 s label retry is `skipped`, `record_gate`, `gate: update`, 0 CR calls, HubSpot status **blank** if updates is not yet ticked at 150 s (always in S3a: promote OFF); if the promote tick landed first (S3c), the retry runs the update and confirms the labels, `success`. Both expected, not a stop. Stop if the record does not reach `success` / `waiting` within two poll cycles after its updates tick.
7. **One failure cause per record per push (review C B3).** Never stack two failing edits on one record in one push.
8. **Hand-made records (review C B4).** Made by `--handmade`, each missing exactly one field from creation; Entered = Yes is set **last** and cleared after the run.
9. **R3 go / no-go (review C O5).** After the R3 create: `check-cr-record.mjs --round 3 --record case --keys`. A missing core key: stop, report a phase-one blocker to the build chat, fill the R3 core fields by hand before S3d.
10. **Coordinator (review C O6).** A Case push waits until the round's read-back shows `coordinator.status` = `ready` and the test names.
11. **Email refused (O-11).** If CR refuses a changed email, stop before the next push.
12. **Guardian path (GS-1).** If a Guardian edit produces no Case run within two poll cycles, stop the Guardian rows and tell Zeke (trigger list or K6). The same for a BCBA Contact edit in S3d that produces no BCBA run.
13. **S8-3.** Restore the forced cause as soon as "Retries used up" shows, before the next poll.
14. **SSN shape (UW-3).** `--unmapped save` prints `SSN shape: NOT SENDABLE` for a record: stop before S1; every core update of that record would end `error` `CR_EMPLOYEE_READ_FAILED` / `CR_CLIENT_READ_FAILED` naming `contact.ssn`. Tell Zeke.
15. **Promote (BR4-P).** No `centralreach_updates_only` tick within 15 minutes of a S3c create's CR ID write: stop the S3d edits for that record, tell Zeke (list filters). A promote of a record with a hand-typed CR ID, or any promote before S3c-0b: stop.

## 4. Path rules (review C O1-O3)

- **Webhook path = arrival.** `record-timeline.kql` with `editTime` set: a `pathProof` = WEBHOOK ARRIVAL row within 15 minutes of the edit. The first run's `source` does not prove the webhook path (the sandbox webhook came about 9 minutes after the edit on 2026-11-23; the poll runs every 5 minutes).
- **Poller path = `source`, with the webhooks off.** `intakePoller` (Case) or `employeePoller` (BCBA, BT/RBT). During a poller push **every** webhook workflow of the objects touched (entry and refresh, Case / BCBA / BT/RBT) is off from the edit until the run is seen; `pipe-check.kql` shows no webhook for those records.
- **The poller is turned on only after the webhook-window steps (S3a, S3a-2, S3b).** Before that, every run is a webhook run.
- **S4 runs on the hourly schedule (adopted, re-check check 7):** Zeke removes `INTAKE_POLLER_SCHEDULE` before S4 and puts `0 */5 * * * *` back after it (2 Azure writes, Zeke at step), so the S4 webhook runs are the writers in all three states, and S8-4 is proven there.

## 5. Steps

**Who acts, unless a step names someone else:** the testing chat makes the sandbox edits on test records and runs every script and query; Zeke switches workflows on / off, makes every Azure write and every CR-screen write. Every step is P1 except S12 (P2).

Every push: make the edits just after a poll tick (:00, :05, ...), check HubSpot shows them, wait for the arrival / poll and the 150 s label retry, then `run-summary.kql` (with the `gate` column), `record-timeline.kql` (arrival) and `check-cr-record.mjs --round N --record case|bcba|bt1 [--step u1]`, and paste each PASS / FAIL / SKIP line into the round log. CR call figures are estimates (build package H1 rates plus the `check-cr-record` reads, about 5 calls each).

### S0. Pre-flight (P1; before the deploy unless marked; no integration run)
- **Purpose:** everything S1 needs, proven read-only; no sandbox record write.
- **Who:** Zeke (P-2, P-5b, P-6, P-9, P-11, P-12); testing chat (reads). P-3 and P-7 wait for S1 item 0.
- **Actions and exact commands:**
  1. SU-3, SU-4, SU-5 (read-only; `az functionapp config appsettings list ... --query "[].name"`, sandbox GETs, `record-timeline.kql` for Case 68589573817). SU-5 also proves GC-059 (every log call parses as one JSON line).
  2. SU-6: Zeke confirms each trigger list (P-3 is made at S1 item 0). Zeke confirms the three promote workflows are **OFF** (P-5b).
  3. SU-8 / SU-11 census: `node scripts/sandbox/create-test-records.mjs --census` → sections (1) and (2) hold only "planned" IDs (before S1: none in (2)); section (1) "linked, creates ticked, updates blank" = 0; exit 0.
  4. SU-9 Workday collisions: `NODE_USE_ENV_PROXY=1 node scripts/sandbox/prod-review-reads.mjs .env --workday-ids 3581246,8146275,5729364,6029417,7741953` → 0 each; `NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 2 --record bcba --workday-id 3581246` → "Stopped: No CR employee holds External System ID …". The round 3 and round 10 lookups run in S1 after their round files exist (re-check O4). Census section (3) shows only planned holders.
  5. SU-10: Zeke confirms the 5 CR records are active (P-9).
  6. P-6 hand writes by Zeke on the CR screen (test records). Then the UW baselines (read-only): `NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record bt1 --unmapped save`, `--record bcba --unmapped save`, `--record case --unmapped save`. Each prints "Filled now:" with the markers and an **"SSN shape:"** line: absent or blank expected (stop rule 14 on NOT SENDABLE). UW-4: `--round 1 --record bt1 --keys` and `--record bcba --keys`: is `hireDate` in the read?
  7. Round-1 read-back status of the coordinator: comes in S1 (after the owner re-save).
- **Rows:** SU-3 to SU-11, UW-1 / UW-2 set-up, UW-3 (SSN shape), UW-4 / UW-5 set-up, R1F-5 hand-adds, GC-059.
- **Expected:** every check as its row; any NOT PLANNED, collision, inactive record or NOT SENDABLE SSN: stop.
- **CR calls:** about 25 (lookups and baseline reads; the SSN shape rides the baseline reads). **New CR records:** 0.
- **Approval:** test-record approval (CR screen hand writes are Zeke's own); HubSpot production counts are read-only; the promote check is a read.

### S0-D. Deploy and prove it (P1)
- **Who:** Zeke at step (Azure writes); testing chat reads.
- **Action:** app stopped, poller off (`AzureWebJobs.intakePoller.Disabled` = true); deploy the P-1 commit (`git archive <commit>` → `npm ci --omit=dev` → `func azure functionapp publish centralreachserverless --javascript`); add Danny or a shared inbox to `uca-sync-deadletter-owners` (S9 email receiver, moved here so the S8-3 chain can run on day 1); app Running. Then SU-1 (b): `az rest --method get --url https://centralreachserverless.scm.azurewebsites.net/api/vfs/site/wwwroot/src/lib/mappedState.mjs`, `.../src/lib/centralReachClient.mjs`, `.../src/workflows/employeeSyncWorkflow.mjs`, `.../src/workflows/clientSyncWorkflow.mjs` and the item 20 file(s) the build chat names (P-1b); SHA-256 of each equals `git show <commit>:<file> | shasum -a 256`; `MAPPING_VERSION = "stage7-2026-11-23"`. If the SCM endpoint is not served on the Flex plan: stop and ask Zeke (no assumption).
- **Rows:** SU-1. **Expected:** every hash equal; app Running; poller disabled. **CR calls:** 0. **Approval:** Zeke at step (deploy, receiver).

### S1. Refresh, new HubSpot sets (P1; poller off, all webhook workflows on after item 0)
- **Purpose:** first runs on the pending build (R1F) and every HubSpot record the run needs, made in one sitting. The UW core-PUT proof is S2, not here (re-check G5).
- **Who:** testing chat runs the script; Zeke makes P-3 / P-7 and re-saves the owners.
- **Actions:**
  0. **P-3 and P-7 (Zeke, HubSpot sandbox, re-check O3):** Zeke turns the Case and BT/RBT refresh workflows off, makes P-3 and P-7, then `record-timeline.kql` for the R1 / R2 / R4 records shows no run since the deploy; refresh workflows back on.
  1. Zeke re-saves the Case owner on R1, R2, R4 (coordinator workflow → `coordinator_export_status` = `ready`).
  2. `node scripts/sandbox/create-test-records.mjs --round 1` (plan), then `--round 1 --write --refresh`; same for rounds 2 and 4. Read-backs: BCBA `differs` [], `emailVsContact` "matches the Contact", no NOT FOUND / BAD OPTION, `coordinator.status` `ready` (stop rule 10), `active_cases_count` not blank (else P-7 fallback).
  3. `--round 3 --write`, then SU-9 `NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 3 --record bt1 --workday-id 8146275` (Entered is blank, so no integration call; before S3c sets Entered); `--round 5 --write`, `--round 6 --write`, `--round 7 --write`, `--round 10 --write`, then SU-9 `--round 10 --record bt1 --workday-id 6029417` and `--round 10 --record bcba --workday-id 7741953` → "No CR employee holds …" (new rounds; Entered blank; creates box ticked on rounds 3, 5, 6, 7, 10 by the script; round 10 BT/RBT 1 holds `workday_id` 6029417).
  4. `--round 1 --handmade --write`, `--round 2 --handmade --write`, `--round 3 --handmade --write` (U-26, U-32, U-44; R2-30, X02-1, X02-3, X01-4, X04-3a, X04-3b; R3-5, X03-1a, X03-1b; Entered blank).
  5. X07a-9: `record-timeline.kql` for the R3 Case, BCBA and BT/RBT 1: each webhook run `skipped` `entry_not_yes`, `crCalls` empty (if no creation webhook arrives: set the R3 Case Entered = `CDE`, then clear).
  6. After the R1 / R4 runs: `check-cr-record.mjs --round 1 --record case|bcba|bt1` and `--round 4 --record bcba|bt1 --workday-id …` as in round-1-log; UW: `--round 1 --record bt1|bcba|case --unmapped compare`.
- **Rows:** R1F-1 to R1F-5, U-47 (observed), X07a-9, UW-1 / UW-2 (first-run leg), SU-7 (R1, R4 log rows), SU-9 (R3, R10 lookups).
- **Expected:** R1 / R4 first runs `update`, full field list, `success` (stop rule 4); B5 1990-01-15, T2 1992-02-20; R1F-5 labels (1156742 gone, 1052688 and 1082497 kept); UW crCalls hold `update 200` **only if a mapped core value differs** from CR's read (re-check E2); UNMAPPED_KEPT = yes (stop rule 5). C10 may PASS only after the owner re-save run; it is read again in S1u.
- **CR calls:** about 175. **New CR records:** 0 (the new rounds are Entered blank). **Approval:** test-record approval; P-3 / P-7 and the workflow switches are Zeke's.

### S1u. UW no-core-change leg (P1)
- **Action:** one metadata-only edit each: R1 BT/RBT 1 `apartment__work` → "Suite 1 UW"; R1 BCBA `medicaid_id__co` → "AZTCO001A"; R1 Case `severity_level_clinical` Level 2 → Level 1.
- **Rows:** UW-1, UW-2 (metadata-only leg), C10 R1 (re-read).
- **Expected:** crCalls with **no `update`**: employee `lookup 200, labelRead 200, metadata 200` (re-check E1: labels are read before metadata is written); client `lookup, lookup, labelRead, metadata 200`; Meta 133826 "1"; `--unmapped compare` = yes on all three. The markers stay until S2.
- **CR calls:** about 25. **New CR records:** 0. **Approval:** test-record approval.

### S2. Employee date send-back and the UW core-PUT leg (P1; by webhook, poller still off)
- **Action:** R1 BCBA `date_of_birth` cleared + BCBA Contact `city` → "New York B2" (a core edit; re-check E3); R1 BT/RBT 1 Contact `date_of_birth` cleared + Contact `city` → "New York A" (check the BT/RBT `date_of_birth` mirror shows blank first); R1 Case `location_city` → "New York S2" (core City; re-check G5). Then `check-cr-record.mjs --round 1 --record bt1|bcba|case --unmapped compare`.
- **Rows:** U2-4, U2-5 (phase one rests on these: every phase-one employee update takes this path), **UW-1 / UW-2 core leg**, UW-3 (live leg: `ssn` sent back blank), UW-4 (`hireDate`, if held), UW-5 (client list, if filled).
- **Expected:** one update each, `success`, crCalls hold **`update 200`** on all three; `check-cr-record.mjs --round 1 --record bcba` B5 1990-01-15, `--record bt1` T2 1992-02-20; UNMAPPED_KEPT = yes on all three (markers held, `ssn` equal and blank, `hireDate` and the list equal if set). Stop if either date changed, the run ends `error`, or rule 5. After this, Zeke may clear the markers (or leave them; they stay test markers).
- **CR calls:** about 45. **New CR records:** 0. **Approval:** test-record approval.

### S3. Gate window (P1)
**S3-0.** Census (`--census`: (1) planned only, "linked, creates ticked, updates blank" = 0; (2) empty). Zeke at step: set `SYNC_CREATE_GATE_PROPERTY=centralreach_creates_only`, `SYNC_UPDATE_GATE_PROPERTY=centralreach_updates_only`; read back the names. Poller stays **off**. Zeke confirms the promote workflows are **OFF** (P-5b).

**S3a. Webhook creates, CO + NJ + NY (entry workflows on, poller off, promote OFF).** Set Entered: R2 Case `CDE;Yes`, R2 BCBA and BT/RBT 1 `Yes` (CO); round 6 Case `Yes; Insurance Card(s)`, BCBA and BT/RBT 1 `Yes` (R3b, NJ); round 10 Case, BCBA, BT/RBT 1 `Yes` (R1c, NY). Hand-made in the same cycle, Entered = Yes set **last** on each: R2-30, X02-1, X04-3a, X04-3b; X01-4 (`CDE;Yes`, stage `1383894301`).
- **Rows:** G-1, G-1c, G-9, R2-1, R2-2, R2-3, R2-6, R2-8, R2-15, R2-16, R2-17, R2-18, R2-19, R2-25, R2-26, R3b-1 to R3b-3, R1c-1 to R1c-3, R2-30, X02-1, X04-3 (create legs), X01-4, X07a-7.
- **Expected:** each create proven by WEBHOOK ARRIVAL; one create per record; CR ID + link written back; R2 BCBA ESID 3581246 and R1c BT/RBT 1 ESID 6029417 (`success`); the other temporary-ID employees `waiting`, ESID = HubSpot ID; label POST unconfirmed → retry `skipped gate: update`, HubSpot status **blank** (stop rule 6); no promote tick on any record (promote OFF); `check-cr-record.mjs --round 2 | 6 | 10` for all three each; hand-made: HS `error`, no CR call (X01-4: `skipped` `excluded_stage`, CR lookup by its HubSpot ID 404).
- **CR calls:** about 230. **New CR records:** 9 (R2, R3b, R1c). **Approval:** test-record approval.

**S3a-2. Skip legs on the S3a set (promote OFF, poller off; re-check G4 / O1).** After the 150 s retries of S3a: edit one mapped field on each of the 9 S3a records (updates blank): Case `important_information` → "AzT <NN> S3a-2"; BCBA `medicaid_id__<state>` → "AZT<ST><NN>S"; BT/RBT 1 `home_apt` → "Apt <NN> S3a-2" (`<NN>` = round 02, 06, 10).
- **Rows:** G-2 (skip leg), G-9 (wait), BR4-CU legs of CASE-184, BCBA-011, BT-034, TRG-076, TRG-145, LBL-085.
- **Expected:** each edit's WEBHOOK ARRIVAL; run `skipped`, `record_gate`, `gate: update`, `crCalls` empty; HubSpot status unchanged (blank).
- **CR calls:** 0. **Approval:** test-record approval.

**S3b. Gate negatives (same window, poller off).** R2 BT/RBT 2 (G-3) and R2 BCBA 2 (G-8): updates ticked, creates blank, Entered = Yes. X02-3 (hand-made): Entered = Yes last. G-4: R1 Case both boxes blank, edit `important_information`; R4 BT/RBT 2 Entered = Yes, both blank. G-5: R1 Guardian Contact `firstname` → "Don Azure Test R1 G5".
- **Rows:** G-3, G-4, G-5, G-8, X02-3 (first half).
- **Expected:** webhook runs `skipped` `record_gate` (`gate: create` for G-3, G-8, X02-3; `gate: update` for G-4 R1 Case and G-5), `crCalls` empty. The poller half is read at S3c-0's first poll (not queued); then clear Entered on every one (stop rule 2). The G-4 / G-5 edits reach CR only at the R1 Case's next update (review C S4: `caseU1` expects S4's own values).
- **CR calls:** 0. **Approval:** test-record approval.

**S3c-0. Poller on (Zeke at step).** `AzureWebJobs.intakePoller.Disabled` = false, `INTAKE_POLLER_SCHEDULE` = `0 */5 * * * *` (SU-2). The first poll after 08:00 UTC runs the day's sweep too: record S8-1 (`source` `dailySweep`). Check the S3b records and the 9 S3a-2 records are **not queued** (G-2 poller half), then clear the S3b Entered values.

**S3c-0b. Hand tick, census, promote ON (re-check O1, O8).**
1. Zeke at step (HubSpot sandbox): every Case, BCBA and BT/RBT webhook workflow (entry and refresh) **off**; they stay off through S3d's first edits.
2. Testing chat ticks `centralreach_updates_only` by hand on the 9 S3a records → next poll: one `update` each by `intakePoller` / `employeePoller` (R2-23b, R2-23d, R2-23f for CO), **no create POST**, only the S3a-2 field sent unless the create ended unclean (G-9: a full re-send), no label POST when CR shows the labels. Status: `success` for the R2, R3b, R1c Cases, R2 BCBA and R1c BT/RBT 1; `waiting` for R2 BT/RBT 1, R3b BCBA, R3b BT/RBT 1, R1c BCBA.
3. Census: section (1) "linked, creates ticked, updates blank" = 0 on all three objects.
4. Zeke at step (HubSpot sandbox): turn the three promote workflows **ON**, choosing **not** to enrol existing list members; read back. Note the time.
- **Rows:** G-2 (tick leg), G-9 (heal, S3a set), R2-23b, R2-23d, R2-23f, BR4-P (switch).
- **CR calls:** about 165. **Approval:** test-record approval (the tick); Zeke at step (the workflow switches).

**S3c. Poller creates, NJ + CO + NY (every Case / BCBA / BT/RBT webhook workflow off; promote ON).** Set Entered: R3 Case `Yes; Insurance Card(s)`, BCBA and BT/RBT 1 (`workday_id` 8146275) `Yes`; round 5 Case `CDE;Yes`, BCBA and BT/RBT 1 `Yes` (R2b); round 7 Case, BCBA, BT/RBT 1 `Yes` (R1b). Hand-made R3-5, X03-1a, X03-1b (Entered last). X04-2: R3 BT/RBT 2 `Yes - Generic` and R2 BT/RBT 2 `No- Made Inactive` (creates ticked for this step). The creates box stays ticked as the script set it (no creates workflow; the old "untick creates on R3" step is dropped). After the poll: R3 go / no-go (stop rule 9). BR4-P: for each of the 9 records read T1 (CR ID + link written), T2 (list join, if the history shows it) and T3 (`centralreach_updates_only` = true) from HubSpot property history.
- **Rows:** G-1 (poller), G-1c, R3-1, R3-3, R3-5, R3-6, R3-8 (first half), R3-10, R3-14, R3-18, R2b-1 to R2b-3, R1b-1 to R1b-3, X03-1, X04-2, X07a-2, X07a-5, X07a-6, BR4-P (delay).
- **Expected:** `intakePoller` / `employeePoller` runs, one create each (R2b / R1b BCBA and R1b-2: lookup 404, create 200; employees with no Workday ID: `waiting`, External System ID = HubSpot ID; R3 BT/RBT 1: ESID 8146275, `success`); the retry is `skipped gate: update` (blank) or, if the promote tick landed first, the update with labels confirmed (stop rule 6); BR4-P tick within 15 minutes (stop rule 15), delay recorded, 160 s informational; hand-made: `error`, no CR call; X04-2: nothing queued; `check-cr-record.mjs --round 3 | 5 | 7` for all three each.
- **CR calls:** about 240. **New CR records:** 9 (R3, R2b, R1b). **Approval:** test-record approval.

**S3d. First updates of the S3c set (webhook workflows still off), then the R1 Case gate legs.** Once each S3c record shows updates ticked: one edit each, **core** on R3 (R3 Case `location_city` → "Newark S3d" (U2-6); R3 BCBA Contact `city` → "Newark S3d" (R3-19); R3 BT/RBT 1 `home_apt` → "Apt 3C S3d" (R3-9)); any mapped field on R2b and R1b (Case `important_information` → "AzT <NN> S3d"; BCBA `medicaid_id__<state>` → "AZT<ST><NN>D"; BT/RBT 1 `home_apt` → "Apt <NN> S3d"). Next poll, then Zeke turns the webhook workflows back on. R1 Case (webhook): tick updates, edit `important_information` → update (G-6); untick, edit again → `skipped` (G-7).
- **Rows:** G-6, G-7, G-9 (heal, S3c set), BR4-P (read), R3-13b, R3-13d, R3-13f, R3-9, R3-19, U2-6.
- **Expected:** one update each by `intakePoller` / `employeePoller`, **no create POST**; only the edited field unless the create ended unclean (G-9: full re-send; re-check E6); no label POST when CR shows the labels. Status (re-check E5): `success` for the R3, R2b, R1b Cases and R3 BT/RBT 1 (8146275); `waiting` for R3 BCBA, R2b BCBA, R2b BT/RBT 1, R1b BCBA, R1b BT/RBT 1. R3-9 / R3-19: `update 200`, 2000-01-01 unchanged; U2-6: `success`, no `CR_CLIENT_READ_FAILED`, the five blanks stay blank.
- **CR calls:** about 165. **New CR records:** 0. **Approval:** test-record approval; Zeke at step (workflows back on).

**S3e. Close the window.** Census (`--census`: (2) empty). Zeke at step: remove the two settings; read back; turn the three promote workflows **OFF** (HubSpot sandbox). U-45 / X02-3 second half: R4 BT/RBT 2, R2 BCBA 2 and X02-3: untick `sandbox_test_field`, read it back, **then** Entered = Yes → no webhook run, not queued by the poll; clear Entered. The sweep half is read on day 2 (S10). Census again.
- **Rows:** U-45, X02-3 (second half), SU-8, SU-11. **CR calls:** 0. **Approval:** Zeke at step (settings, promote OFF).

### S4. Webhook update push, NY + CO + NJ (P1; all webhook workflows on; poller **hourly**; proof by arrival)
- **Before (Zeke at step, Azure):** remove `INTAKE_POLLER_SCHEDULE` (hourly default; re-check check 7 item 1); read back. **After S4:** set it back to `0 */5 * * * *` before S5.
- **NY (R1):** the R1-U1 lines of Push 1 (`round-1-log.md`, old 1-2, 5-8, 10, 12, 15, 19-29, 31-55) with these changes: line 10 + 12 as one edit (U-21b: `bt_rbt_type` BT → RBT, `location` New York → Colorado); line 19 BCBA Entered → **blank**; line 28 by hand only if P-8 says the payor workflow is absent (U-46 fallback); line 35 owner → 167266469 (U-49); line 39 `finalized_client_service_hours_post_assessment` + " U1"; line 43 → Other Location **and** `service__stateregion_2` cleared (C24-F); line 44 expects Meta 126214 **"None"**; line 48 expects **"Dr AzT 1 Commercial 2000000001"** (one space, no comma). Guardian K1 edits (lines 64, 67-71), one every 3 minutes, each proven by the R1 Case's WEBHOOK ARRIVAL (line 64 expects a Case run, not a fan-out); U-48 Guardian `state_dropdown` → New Jersey. U-36 list (R1 BT/RBT 1 `first_name` "Janet", work street "105 Work Plaza U1", city "New York U1", state NJ, ZIP "10015", apartment "Suite 1 U1"); U-33 BT/RBT 1 Contact `phone` `(212) 555-0123`, `zip` 10006, `state_dropdown` New Jersey, `date_of_birth` `3/21/1992`; X07b-1 (Case `location_city` "New York U1", `postal_code` "10011"); X07b-2 (BCBA Contact `phone` "(212) 555-0144"); U-27 (BCBA Contact `address`); U-22, U-06, U-17, U-19, U-21; X01-3 (C23 start-date clear); R4 BCBA checklist untick (WD-1); U-43 race (one R1 Case edit 1-2 min before the hh:00 poll). **R1c BCBA `workday_id` → 7741953**, checklist unticked (R1c-WD, re-check G2).
- **CO (R2):** Case `staffing_status` 97151 Services → Staffed 97153 (R2-10); Cold → Warm (R2-11); `service__street_address` → "200 Service Rd, Denver, CO 80202" (R2-29 split); Guardian Contact `phone` → `303-555-0221` (R2-23g, Case path); BCBA `medicaid_id__co` → "AZTCO002A" (R2-23c); BCBA Contact `address` → "204 Azure BCBA St U1" (MIR-1); BT/RBT 1 `home_apt` → "Apt 2C U1" (R2-14a = R2-23e), then a separate push `workday_id` → 5729364 (R2-14, `waiting`); X07b-1b association edits (three, a few minutes apart, each with one Case edit).
- **NJ (R3):** Guardian Contact email `zeke+swanson_azure_test_3@optidge.com`, `phone` `973-555-0301 x12`, `location` / `state_dropdown` New Jersey (R3-20 = R3-13g); Case `allergies` Confirmed + explain "NA" (R3-17); Case `important_information` → "AzT 3 parent note U1" (R3-13a); Case `service_address__other` → `",  , New Jersey "` (R2-27 moved here: C25 junk → cleared); BCBA `medicaid_id__nj` → "AZTNJ003A" (R3-13c); BT/RBT 1 `home_apt` → "Apt 3C U1" (R3-13e); BT/RBT 1 Contact `zip` → "07108" (MIR-1; the create already holds 07104); R3 BT/RBT 2 Entered `Yes - Generic`, then `No- Made Inactive` a minute later, then blank (X04-2b); X02-5 second Guardian on the R3 Case, its `phone` changed.
- **Rows:** U-01 to U-04, U-06, U-17, U-19, U-21, U-21b, U-22, U-27, U-33, U-36 (R1), U-41, U-43, U-46, U-48, U-49, WD-1, K1, K2, K5, X01-3, X07b-1, X07b-1b, X07b-2, C24-F, R2-10, R2-11, R2-14 (first half), R2-14a, R2-23a, R2-23c, R2-23e, R2-23g, R2-27, R2-29 (split), MIR-1, R3-13a, R3-13c, R3-13e, R3-13g, R3-17, R3-20, X02-5, X04-2b, GS-1 (a), **R1c-WD (webhook leg)**, **S8-4**; every C / B / T row U1 column; B4 / T2 email (O-11).
- **Expected:** each edit's WEBHOOK ARRIVAL and its webhook run making the CR write (no poll in between, so the CO and NJ webhook-update cells are real writes); values per `check-cr-record.mjs --round 1 | 2 | 3 --step u1` for case, bcba, bt1 (9 checks); R2-14 `waiting`, ESID still the HubSpot ID; R1c-WD: `waiting` "Replace the temporary…", `check-cr-record.mjs --round 10 --record bcba` lookup PASS (ESID still the HubSpot ID); S8-4: `run-summary.kql` shows poller runs only at hh:00 in the S4 window.
- **CR calls:** about 310. **New CR records:** 0. **Approval:** test-record approval (CR writes on test records); Zeke at step (the schedule, twice).

### S5. Poller pushes, NY + CO + NJ (P1)
Case, BCBA and BT/RBT webhook workflows (entry and refresh) **off** for S5a-S5d; BCBA and BT/RBT back on after S5d; **S5e and S5f run with the Case refresh workflow ON** (AB-8: BR17 relabel, BT 2 removal and C11 RE removal are webhook legs). Each sub-push holds one Case property edit (a role change alone has no change signal, C18). The poller is back on `0 */5 * * * *`.
- **S5a:** R1 Case: remove 247, add 253 (U-10); BT/RBT 1 on 244 only (U-07); two BTs on 236 (U-08, U-13); `important_information` (U-05); Insurance Card other options (U-20); BCBA Entered blank + `gender_new` (U-23); old lines 3, 4, 9, 16. R4 BCBA `medicaid_id__ny` (WD-2), `cr_billing_hold_label` **Yes → No** (WD-3). R2: 227 link (`create-test-records.mjs --round 2 --grad-permit-link --write`) + Case edit (R2-5); BT/RBT 1 `location` Colorado;New York (R2-20); service street "200 Service Rd, Unit 80202" (R2-29 no split); R2 BCBA `location` + New Mexico (R2-22, required). R2 Guardian Contact `phone` → `303-555-0231` (GS-1 b). R3: BT/RBT 1 → RBT, New Jersey;New York (R3-7); owner removed (R3-16); U-36 NJ fields; BT/RBT 1 `location` + Virginia (R3-12, required). **R1c BCBA `medicaid_id__ny` → "AZTNY010P"** (R1c-WD poller leg).
- **S5b:** R1 Case: remove 253, add 221 (U-11), same BT on 238 and 244 (U-09), Case edit; old lines 56, 58. R2: BCBA licence → Yes (R2-7, R2-21) + Case edit (R2-4).
- **S5c:** R1 Case: remove 221 (U-11 end), add 217 + 233 (U-12), then 221 and 253 with 217 (X02-4), stage → Paused (U-16); old lines 11, 13, 30, 57; R1 BT/RBT 1 Entered cleared + `home_apt` → "Apt 1C U1" (U-38). R4 BCBA → Terminated + field (U-28); R4 BT/RBT 1 → Terminated + field (U-35). R2 Case → Paused / Discharged (R2-13); `stateregion` → "Brooklyn" (R2-31). R3 Case Warm → Cold (R3-8 end). **Start the S8-3 chain here** (P-11), on R4 BT/RBT 1 after U-35.
- **S5d:** R1 Case: remove 217 / 233 → typed supplier (U-14); old lines 14, 59; BT associations back to the R1 baseline.
- **S5e (Case refresh ON):** old lines 60-61 (swap Primary BT 1 and 2), 63 (RE removed), one Case edit; BR17 relabel 223 → 229.
- **S5f (Case refresh ON):** old line 62 (BT 2 removed); relabel back 229 → 223; all workflows back on.
- **Rows:** U-05, U-07 to U-14, U-16, U-20, U-23, U-28, U-35, U-36 (R3), U-38, WD-2, WD-3, R2-4, R2-5, R2-7, R2-13, R2-20, R2-21, R2-22, R2-29 (no split), R2-31, R3-7, R3-8, R3-12, R3-16, X02-4, X01-2 (S5e / S5f legs), GS-1 (b), R1c-WD (poller leg); C12, C13, C15 rows.
- **Expected:** S5a-S5d first runs `intakePoller` / `employeePoller`, no WEBHOOK ARRIVAL; S5e / S5f arrivals; GS-1 (b) `core.PhoneCell` in `changedFieldNames` (re-check E9); R1c-WD `employeePoller` update, still `waiting`, reason not written again; values per the rows (GET by hand for roles).
- **CR calls:** about 155. **New CR records:** 0. **Approval:** test-record approval; the S8-3 forcing is Zeke's own CR screen write on a test record (P-11).

### S6. Error pushes, one failure cause per record (P1; all workflows on)
- **S6a:** R1 BCBA `workday_id` → 7354186 (U-24, K2); R1 BT/RBT 1 `workday_id` → 6512374 (U-30, WD-4); R1 Case supplier → "Azure Test Supervising 1 BCBA" (U-14b) with `staffing_status` → Warm Lead (X05-1, not a failure); R3 Guardian Contact `phone` → `555-01` (C8 unreadable, R3 Case); R3 BCBA `personal_email` → `azure-test-not-an-email` (B9 unreadable); R3 BT/RBT 1 Contact `phone` → `12345` (U-39); R2b BCBA and R2b BT/RBT 1 (+ `home_apt`) `test_record` = true (U-29); R2b Case `test_record` = true + `important_information` (U-29b); hand-made U-26 Entered = Yes; U-32 Entered = Yes (BT/RBT entry workflow on), then X07a-1 (clear Entered, entry workflow off, Entered = Yes, back on); R4 BCBA `medicaid_id__co` and R4 BT/RBT 1 `home_apt` while Terminated, then both → Resigned + one field (X01-1, X07b-2 stage moves). Restore U-39's phone before S6b.
- **S6b:** R2 BCBA checklist ticked with `workday_id` blank (U-25); R3 BT/RBT 1 `workday_id` blank + checklist (U-31); R2 BT/RBT 1 `workday_id` `651237`, then restore `5729364` (U-34); R1 Case supplier blank (U-14c) with `staffing_status` → Cold Lead (X05-1); R3b BT/RBT 1 `first_name` blank (X04-3 update leg).
- **Rows:** U-14b, U-14c, U-24 to U-26, U-29, U-29b, U-30 to U-32, U-34, U-39, X01-1, X04-3 (update leg), X05-1, X07a-1, X07b-2 (stage moves), B9 / C8 unreadable rows, BR7 (employees: U-29; Case: U-29b), BR8, BR11.
- **Expected:** per row: `error` with no CR write (lookups only for U-26 / U-32), `skipped` `test_record` (U-29, U-29b), updates sent for U-25, U-31 and X01-1; one cause per record.
- **CR calls:** about 50. **New CR records:** 0. **Approval:** test-record approval.

### S7. Restores and remaining linked checks (P1; workflows on)
- Restore every S6 value (Workday IDs, supplier, phones, the unreadable values (old lines 18, 66 now on R3), `test_record` on R2b records (U-29, U-29b), checklists, hand-made Entered cleared). R1 BCBA re-added as Supervising 247 (X01-2 247 leg). R2-12: one Cleanup stage each on R2, R2b, R3b, R1b Cases in one webhook cycle, then back. R2 BT/RBT 1 checklist pushes 1-3 (X04-4; R2-14 tick with X04-1, X07a-3; R2-14 untick). **R1c BCBA checklist (`bcba_in_cr_checklist` "External System ID") ticked → `error` `CHECKLIST_STILL_TEMPORARY`, then unticked → `waiting` (R1c-WD).** X06-1 (R2 BCBA `lba_licensure__ny` Yes → Grad Permit, restore); X06-2 (R3 BT/RBT 1 `location` blank, restore). R1 BT/RBT 1 `workday_id` cleared + checklist unticked (U-37), then restore U-37 (X07a-10 is **not run**: TRG-070 / TRG-305 OFFLINE-ONLY, re-check G3). R1 Case Entered blank + `specific_home_location` change (U-18) with `staffing_status` → Processing Leads (X05-1); old lines 75-76 (Meta 133826 expects **"3"**). X07b-1b associations back to the R2 baseline. Property history read (U-42); views (U-40, if P-12 done). Old lines 72-74 (K4, Contact `test_record`) are **not run**: optional fan-out code, OFFLINE-ONLY.
- **Rows:** R2-12, R2-14, X04-1, X04-4, X07a-3, X06-1, X06-2, U-37, R1c-WD (checklist leg), U-18, X05-1, X01-2, U-40, U-42.
- **CR calls:** about 75. **New CR records:** 0. **Approval:** test-record approval.

### S8. Blank round R1-U2 (P1; poller)
- **S8a:** R1 Case `home_apt` and `service__postal_code` cleared with the Case workflow on (X07b-4), then Known Allergies cleared (U2-1 first half, U2-2); R1 BCBA `personal_email` cleared, BCBA refresh workflow off (U2-7a: Meta 138069 cleared, only 138069 changed).
- **S8b:** remaining R1 Case core and metadata blanks (U2-1, U2-2); R1 BCBA `email` blank (U2-3); R1 BCBA Contact `apartment` cleared (U2-7b); R1 BT/RBT 1 record `email` blank, Contact untouched (U2-3b; stop if a sync refills it); R3 Case `phi_first_name__cloned_` blank and restored (X02-2); then `stateregion` New Jersey and `postal_code` 07102 (X02-6).
- **CR calls:** about 80. **New CR records:** 0. **Approval:** test-record approval.

### S9. Day-1 end set-ups (P1)
- U-15: one association-only change on the R1 Case (no property edit). X07b-3b (if P-10 answered): R2 Case → stage `1342613895` (Service Ready w/Start Date), BT 1 start-date property = today. S8-3: confirm "Retries used up", restore the labels on 5385357 before the next poll (stop rule 13), dead-letter count +1, alert email received. Census (SU-11).
- **Rows:** S8-3, U-15 (set-up), X07b-3b (set-up). **CR calls:** S8-3 about 60. **Approval:** test-record approval (S8-3 forcing and restore are Zeke's own CR screen writes).

### S10. Day 2 (P1)
- **After 08:00 UTC (any US-morning time), `since = 30h`:** the sweep run: S8-1 (if not proven on day 1), S8-2 (R1 Case sweep run reads labels and ends `noop`), U-15 (`source` `dailySweep`, record the delay), WD-5 (R3 BCBA, linked `waiting`), U-45 sweep half (R4 BT/RBT 2, R2 BCBA 2, X02-3 not queued); item 20 sweep read (CLB-160, TRG-297, once P-1b is built: the sweep's retry cap per the build chat's b2 test).
- **12:55 ET:** Zeke turns every Case webhook workflow off; **13:00-13:05 ET:** X07b-3b (`intakePoller` run, the "Change found by the poller" warning with `changedFieldNames` `["labels"]` (re-check E8), 1156746 on); workflows back on.
- S8-4 is no longer here: it is proven in S4 (hourly schedule).
- **Rows:** S8-1, S8-2, U-15, U-45, WD-5, X07b-3b, R2-24, U-43 (BR18), CLB-160 / TRG-297 (sweep read).
- **CR calls:** about 80. **Approval:** test-record approval.

### S11. Phase-one sign-off read-out (P1)
- `run-summary.kql` for the whole window (`since = 30h`), `errors-retries-deadletters.kql`, census. Every P1 row PASS, or its ledger line in a named class with Zeke's acceptance. Report to Zeke and the build chat; the phase-one cutover (production gate settings, `HUBSPOT_PORTAL_ID`, master 4.10 checks including the creates-workflow enrolment (TRG-084) and N1-SSN (the production `ssn` read format), link-property history, promote then creates workflow on) can start.

### S12. P2 rows (separable; after S11 or after the cutover)
- R2 Case `client_id_number` → 5384589 (R2-9, webhook), then Case workflow off and one mapped edit (X07a-4, `intakePoller`); restore. U-44: type `employee_id` `5384530x` on the hand-made U-44 record, Entered = Yes → `error`, no CR call; clear. U-47 was observed in S1.
- **Rows:** R2-9, X07a-4, U-44, U-47. **CR calls:** about 10. **Approval:** test-record approval.

### S13. Clean-up
- Zeke inactivates the **23** CR test records (5 existing + 18 new) on the CR screen; `sandbox-test-log.md` rows for rounds 1-7 and 10 (SU-7, X07a-8); untick `sandbox_test_field` on the linked test records; Zeke at step: poller back to hourly (remove `INTAKE_POLLER_SCHEDULE`) or off until cutover; promote workflows stay OFF. Purge dead letters only on Zeke's word.

## 6. Totals

| Measure | Value |
|---|---|
| Pushes (one set of edits, one arrival / poll cycle, the GETs) | **32**: S1 2 (refresh, new sets), S1u 1, S2 1, S3 7 (S3a, S3a-2, S3b, S3c-0 check, S3c-0b tick, S3c, S3d edit), S4 4 (main, K1 spacing, R2-14 `workday_id`, X07b-1b; S8-4 rides the main push), S5 6, S6 2, S7 3, S8 2, S9 1, S10 2 (sweep, flip), S12 1 |
| New CentralReach test records | **18** (R2, R3, R2b, R3b, R1b, R1c × Case, BCBA, BT/RBT 1); hand-made records 12, none reaches CR by design |
| Existing CR test records reused | 5 (5384589, 5384531, 5384530, 5385360, 5385357) |
| CR calls, whole retest | **about 1,890** (range 1,500 to 2,200; the label retries and any G-9 full re-sends are the swing), about 1.3 % of the 150,000 monthly Core tier. Per step: S0 25, S1 175, S1u 25, S2 45, S3 800 (S3a 230, S3c-0b 165, S3c 240, S3d 165), S4 310, S5 155, S6 50, S7 75, S8 80, S9 60, S10 80, S12 10 |
| Hands-on hours | **about 12** (S0 1.5 excluding Zeke's set-up, S0-D 0.5, S1-S2 1.5, S3 2.75, S4 1.5, S5 2, S6-S8 2, S9-S11 0.25 plus waits) |
| Calendar days | **2** (day 1 S0-S9; day 2 the sweep check in the morning and the 13:00 ET flip). Add 1 day only if the deploy, P-1b or P-1 slips |

## 7. Open decisions (numbered as in `../apply-recheck-log-2026-11-24.md`)

1. Contact workflow not needed (O-21 superseded) — confirm (P-4).
2. Creates workflow not built in the sandbox: accept TRG-084 as PRODUCTION-ONLY (master 4.10 creates-workflow enrolment check), or build it before S3 (then S3c proves it).
3. 1 PM flip: the BT 1 start-date property name and the sandbox 1 PM workflow (P-10).
4. Active Cases Sync enrolment or the hand-set fallback (P-7).
5. S8-3 method (P-11).
6. U-46 payor workflow present (P-8).
7. UW-5 client lists: Zeke's hand set-up on 5384589 (diagnosis code, primary payor, additional contact) and on 5338681 (pay type, pay code), then the L1 `--entity client` / `--entity employee` runs; without it the payor / diagnosis echo is unproven on every production client.
8. Production promote list: add a filter (created after the cutover date, or updates not already true) so a mis-ticked existing record is not promoted.
9. N1-SSN: the L2 survey found no production employee with an SSN (15 read: 12 blank, 3 absent), so the filled read form is still unknown: ask CentralReach support, or name one employee with an SSN on file for a shape-only read.
10. Optional: a live X07a-10 leg on CR employee 5338681 (no HubSpot record), if its External System ID is 7 digits.
11. Optional: a named CASE-162 test for the 34 archived "Prior" fields (the exact-list test already covers it).
12. `latitude` / `longitude` (on 10 of 10 production clients, read as numbers, typed as strings in the PUT spec, never echoed): one test-record round trip before launch (build chat, Zeke's go-ahead; L1-L3 section 5 item 5).
13. Employee date of birth missing from 14 of 15 production employee reads: an update of an existing employee with no date of birth in either system stops (`CR_EMPLOYEE_READ_FAILED`). Phase-one creates carry a date (the 2000-01-01 placeholder), so this is a phase-two impact; a production count first (L1-L3 section 5 item 2).
