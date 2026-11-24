# Sandbox test plan

Agreed record convention, Zeke, 2026-11-18. The same day Zeke confirmed four additions from the Stage 1 review: the BT/RBT has its own email, a rule for `workday_id`, a state on every record, and a cleanup step after each round. On 2026-11-18 Zeke added two more rules: the state varies across New York, Colorado and New Jersey, one state per round, and every record is created with Sandbox Test Field = Yes. The tests themselves (one row per section 9 requirement, with each round's values and expected CentralReach results) are in [sandbox-test-matrix.md](sandbox-test-matrix.md) (BUILD-PLAN step 7.1 (f)); the Stage 8 test areas are in [BUILD-PLAN.md](BUILD-PLAN.md) Stage 8. Do not drop the convention below. On 2026-11-23 the parts of it that the build had made stale (names, phones, the BCBA and BT/RBT sources) were updated; the changes are listed in the matrix under "Changes from the agreed record convention".

`npm test` does not create these records. It uses fake properties in `src/tests/smoke/`.

## Record convention

Every sandbox round creates a fresh Case, a fresh BT/RBT, and a fresh BCBA. Rounds start at 1 and go up by one. Do not reuse a round.

CentralReach has no sandbox. A create in a round writes a real employee or client in production CentralReach. Do that only when Zeke names the round and says to write.

On every record:

- **Sandbox Test Field = Yes on every record, set when the record is created** (`sandbox_test_field` = true; the HubSpot checkbox shows Yes). No exceptions: the Case, the BT/RBT and the BCBA in every round. That puts the record in list 1463 (Deals), 1464 (BCBAs), or 1465 (BT/RBTs). A record without it is skipped by the record gate and by the webhook workflows, so it tests nothing. Do not create the record first and tick the box later: the create webhook would fire before the record is in the list.
- `test_record` stays blank. The integration skips `test_record` = true.
- Each name contains the words Azure Test and the round number. A small variation is allowed. The standard names below are the ones to use.

`N` is the round number as digits, with no leading zero. Round 1 is `1`. `NN` is the same number in two digits. Round 1 is `01`. This phone pattern fits rounds 1 through 99.

Every property name below was checked against the finished mappers on 2026-11-23 (BUILD-PLAN step 7.1 (a), after decisions 41 to 51). The full value set per round, with the expected CentralReach values, is in [sandbox-test-matrix.md](sandbox-test-matrix.md); the tables below keep only the convention.

### State by round

The state changes each round so New York, Colorado and New Jersey are all tested, one state per round. The Case, the BT/RBT and the BCBA in one round share that round's state.

| Round | State |
| --- | --- |
| 1, 4, 7, ... | New York |
| 2, 5, 8, ... | Colorado |
| 3, 6, 9, ... | New Jersey |

"The round's state" below means this value. Pick the HubSpot option with the full state name. Round 1 stays New York, so nothing already agreed for round 1 changes. A full pass of the Stage 8 tests needs at least three rounds, one per state; each round leaves three contacts in production CentralReach.

### Names

Names end in "RN" (for example "Azure Test R1"), not "#N": the sandbox refused "#1" in `bcba_name` on 2026-11-20 ("Each word in the text must be capitalized"). The display names `bcba_name` and `bt_name` use Capitalized words only (for example "Zeke Swanson Bcba Azure Test Round One"); the integration never reads them.

### Phones

CentralReach stores 10 digits (decision 46). The code ignores punctuation, drops a `1`, `+1` or `001` prefix and a trailing extension (`x12`, `ext 7`, `#45`). The test phones keep the digits `AAA-555-NNSS` (area code of the round's state, `NN`, a two-digit suffix per record) and rotate the input form across rounds; CentralReach must hold the 10 digits only.

### Case (HubSpot Deal)

The code sends `phi_first_name__cloned_` and `phi_last_name` to CentralReach. `dealname` is the HubSpot display name.

| Property | Value |
| --- | --- |
| `dealname` | CR Azure Test RN |
| `phi_first_name__cloned_` | Zeke |
| `phi_last_name` | Swanson Azure Test RN |
| `phi_date_of_birth` | Any valid date, `YYYY-MM-DD`. A create requires it. |
| `guardian_first_name` | Don Azure Test RN (from the Guardian Contact `firstname`) |
| `guardian_last_name` | Swanson (from the Guardian Contact `lastname`) |
| `policy_holder_name` | Don Swanson |
| `email` | zeke+swanson_azure_test_N@optidge.com (from the Guardian Contact `email`) |
| `phone` | NN01, from the Guardian Contact `phone` |
| `home_apt` | Apt NA |
| `location` | The round's state, from the Guardian Contact `location` and `state_dropdown`. It decides the client's state label (New York gives NY Client). |

Production CentralReach shows this client as Zeke Swanson Azure Test RN.

`phone_number__second_` is no longer sent (decision 36).

### BT/RBT

The code sends `first_name`, `last_name` and `email` (primary email). `bt_name` is the HubSpot display name only. It must be unique.

| Property | Value |
| --- | --- |
| `first_name` | Jane |
| `last_name` | Swanson Azure Test RN |
| `email` | zeke+bt_azure_test_N@optidge.com, on the record and on its Contact. Its own address: the Case and the BT/RBT do not share one, because what a CentralReach 409 matches on is not tested yet. |
| `date_of_birth` | From the associated Contact `date_of_birth` (text; the BT/RBT property is a read-only sync of it). Read as text by the code (build package item 16), so typed forms work: R1 `2/20/1992`, R2 `1993-03-21`, R3 blank (the create sends the placeholder 2000-01-01). |
| `employee_phone` | NN03, from the associated Contact `phone` |
| `home_apt` | Apt NC |
| `workday_id` | See "Workday ID" below. |
| `bt_rbt_type` | BT (rounds rotate BT and RBT; see the matrix) |
| State | Work State(s) in `location`; the mailing state `state_home` comes from the Contact `state_dropdown`. |
| `personal_email` | Not set. T9 is held (Zeke 2026-11-23): confirm the BT/RBT personal email field with Danny and the client (O-51). |

Production CentralReach shows this employee as Jane Swanson Azure Test RN.

### BCBA

The code sends `first_name`, `last_name` and `email` (primary email, decision 49). In production the BCBA `email` is filled from the BCBA's associated Contact by a workflow. In the sandbox that mirror does not run (round 1 read-backs 2026-11-20 and 2026-11-23), so the script sets the BCBA `email` to the Contact email directly (Zeke 2026-11-23: "Just go ahead and populate the BCBA email field please. Make sure we include that in the plan"). Round 1's BCBA 67036479540 was set that way by the testing chat on 2026-11-23. `bcba_name` is the HubSpot display name only. It must be unique.

| Property | Value |
| --- | --- |
| `first_name` | Zeke |
| `last_name` | Swanson BCBA Azure Test RN |
| `email` | zeke+bcba_azure_test_N@optidge.com, the associated Contact `email`, set on the BCBA record by the script (the sandbox mirror does not run). The required primary email (B4). R1-U1 changes it on the BCBA record, not on the Contact. |
| `personal_email` | zeke+bcba_personal_N@optidge.com. Meta `138069` Personal Email (B9, decision 50). |
| `date_of_birth` | Single-line text the code converts (decision 45; build package item 1, which replaced decision 48's `dob` on 2026-11-24), for example `1/15/1990`. Blank on a create sends the placeholder 2000-01-01. A blank on an update is HELD (package question 27). |
| `employee_phone` | NN04, from the associated Contact `phone` |
| `apartment__home` | Apt NB, from the associated Contact `apartment` |
| `workday_id` | See "Workday ID" below. |
| State | Work State(s) in `location`; the mailing state `state_home` comes from the Contact `state_dropdown`. |

`ucaba_email_address` and the BCBA `dob` are not read (decision 49; build package item 1). The script sets `dob` as a decoy with another date (`3/9/1975`; until 2026-11-24 it was the other way round, `date_of_birth` = `1980-07-04`). It does not set `ucaba_email_address` (Zeke 2026-11-23: "drop the decoy"): setting it would likely fire the sandbox workflow "BCBA - Work Email Becomes Primary", which may move the `email` / `personal_email` values. The script's read-back checks, before each BCBA push, that `personal_email` holds what it set and that the BCBA `email` equals the Contact email (`emailVsContact`: "matches the Contact"; anything else: stop and ask Zeke).

Production CentralReach shows this employee as Zeke Swanson BCBA Azure Test RN.

### Workday ID

CentralReach keeps an External System ID for good: the API cannot change it and cannot delete the employee. So a test value must never be a real Workday ID.

| Test | `workday_id` on the BT/RBT and the BCBA |
| --- | --- |
| Temporary-ID path (create with no Workday ID) | Blank. The create sends the HubSpot record ID and the status is `waiting`. |
| Workday ID path (create with a Workday ID, or the "replace the temporary ID" steps) | Any 7 digits, like a real Workday ID (production example `2000868`). Zeke, 2026-11-23: "The Workday test values just need to be 7 digits. Make it them any 7 digits." This replaces the guide's AZTEST format (guide line 201). Checked read-only beforehand that no production HubSpot or CR employee holds the value. Round 4 (R-WD): BT/RBT `4465360`, BCBA `7167221`. |
| Two records with one Workday ID | Both records get the same 7-digit test value, on purpose, for that test only. |
| Retest values (2026-11-24) | Every sandbox Workday ID is exactly 7 digits (build package item 15: any other value ends `error` "workday_id must be exactly 7 digits."). Set at create: R2 BCBA `3581246` (R2-2), R3 BT/RBT 1 `8146275` (X07a-2). Set by hand later: R2 BT/RBT 1 `5729364` (R2-14). Never reach CR (error tests): `7354186` (U-24), `6512374` (U-30), `651237` (6 digits, U-34). Duplicates on purpose: `0498374` (U-26), `4837593` (U-32). The three that reach CR are checked read-only in production first (run sheet S0, SU-9). Rounds 5, 6, 7 and 10 set none. All are in `WORKDAY_ROUNDS` / `WORKDAY_TEST_VALUES` in `create-test-records.mjs`. |

### After each round

The integration never deactivates anyone in CentralReach, and the API cannot delete a contact. Each round leaves three contacts in production CentralReach.

- When the round's tests are done, Zeke makes the round's client and two employees inactive on the CentralReach screen.
- Mark the date in the "Made inactive in CR" column of [sandbox-test-log.md](sandbox-test-log.md), and note it in the round log.

Not tested: whether CentralReach accepts `#` in a name. The rounds use "RN" instead (see "Names").

### Round 1 example

Round 1 is New York. Round 2 uses the same pattern with Colorado, round 3 with New Jersey.

| Record | Name in CentralReach | Phone | Apartment |
| --- | --- | --- | --- |
| Case | Zeke Swanson Azure Test R1 | entered `(212) 555-0101`; CR holds 2125550101 | Apt 1A |
| BT/RBT | Jane Swanson Azure Test R1 | entered `212-555-0103 x12`; CR holds 2125550103 | Apt 1C |
| BCBA | Zeke Swanson BCBA Azure Test R1 | entered `+1 212.555.0104`; CR holds 2125550104 | Apt 1B |

## Retest (2026-11-24)

The retest after the pending build runs New York, Colorado and New Jersey side by side, with the webhook and the poller on, in one ordered run sheet: [sandbox-rounds/retest-run-sheet-2026-11-24.md](sandbox-rounds/retest-run-sheet-2026-11-24.md). Its rows are in the matrix section "Retest rows (2026-11-24)"; the per-requirement coverage (every requirement, every state, both paths, or one exception class) is [sandbox-coverage-ledger-2026-11-24.md](sandbox-coverage-ledger-2026-11-24.md). Changes to the convention for it:
- Round 3 (New Jersey) is created for the first time. Its BT/RBT 1 is a **BT, New Jersey only**, created with a 7-digit `workday_id` (it becomes RBT `New Jersey;New York` in R3-U1). Its Case has `phi_gender`, `stateregion` and `postal_code` blank (the state comes from `location`; U2-6), the Guardian Contact's referral is Other with no text (R3-18), and its creates arrive by the poller (entry workflows off for that step).
- Round 2's BT/RBT 1 is **Colorado only** at create (form `RBT CO`) and becomes `Colorado;New York` in R2-U1. Its BCBA is created with a 7-digit `workday_id`; its Case also links BCBA 2 as Previous IA (235) and BT/RBT 2 as Potential BT 2 (218).
- The script ticks `centralreach_creates_only` on the round 2 and 3 records (used only while the two gate settings are set, run sheet S3).
- Contacts get no `sandbox_test_field` (the property does not exist on Contacts; the gate is never read there).
- `full_home_address` and `client_service_hours_total` are no longer set (items 5, 7); `service__stateregion_2` is set (the round's state name).

**Updated 2026-11-24 (apply worker: review C, reviews A and B, the recency audit, the B2 follow-up and the N1 fix).**
- **Create grid: every entity, every state, both paths, on the pending build.** Zeke 2026-11-24: "If it makes sense to actually use test records in the sandbox and then in central reach do so. Live calls from test records are ok. If this will cut the testing time for you to test with acutal test records taht we craete for each entity and the states then do so." Rounds by pattern (`slot = (round - 1) % 3`):

  | State | Create by webhook | Create by poller |
  | --- | --- | --- |
  | New York | round 10 (R1c, S3a) | round 7 (R1b, S3c) |
  | Colorado | round 2 (R2, S3a) | round 5 (R2b, S3c) |
  | New Jersey | round 6 (R3b, S3a) | round 3 (R3, S3c) |

  Rounds 5, 6 and 7 have no Workday ID (temporary-ID creates); round 10's BT/RBT 1 is created with Workday ID 6029417 (the only BT/RBT Workday-filled create by webhook, re-check G1) and its BCBA gets 7741953 by hand in S4 (temporary ID → Workday ID on a BCBA, row R1c-WD, re-check G2). Rounds 5 to 10 are made with the creates box ticked (`round >= 5`). 18 new CentralReach records in all; S13 inactivates 23 (with the 5 existing).
- **Poller `source` names:** `intakePoller` for a Case, `employeePoller` for a BCBA or BT/RBT (`src/workflows/intakePollerWorkflow.mjs:84`, :101). The webhook path is proven by the webhook's arrival (`record-timeline.kql`, `pathProof` = WEBHOOK ARRIVAL), not by the first run's `source`; the poller path by `source` with every webhook workflow of the object off (review C O2).
- **Re-runs:** `create-test-records.mjs --write` on a round that already has `round-N.json` stops unless `--refresh` is given, and `--refresh` is used only at run sheet S1 on the proven pending build (review C B6). A re-run finds the Guardian Contact by the ID saved in the round file (C2). Plan mode reports any enumeration value that is not an option of its property (BAD OPTION) and stops before writing (C3).
- **Hand-made records:** `create-test-records.mjs --round 1|2|3 --handmade [--write]` makes them (U-26, U-32, U-44; R2-30, X02-1, X02-3, X01-4, X04-3a, X04-3b; R3-5, X03-1a, X03-1b), one record per leg, each missing exactly one required field from creation, Entered blank; the run sheet sets Entered **last** (review C B4). IDs go to `sandbox-rounds/handmade-rN.json`. U-44's `employee_id` is typed by hand at its step.
- **Census:** `create-test-records.mjs --census` (read-only) lists every record holding a gate box, every unlinked record with Entered = Yes and `sandbox_test_field` = true, and the sandbox holders of the test Workday IDs; anything not saved in a round or hand-made file is "NOT PLANNED" (review C S1-S3). Section (1) also marks linked records (`L`) and counts "linked, creates ticked, updates blank": the records the promote workflows would enrol.
- **Care Coordinator (item 6):** C10 is `care_coordinator_first_name` + `care_coordinator_last_name` when `coordinator_export_status` = `ready`, filled by the sandbox workflows from the Case owner (Team Member record for 161391908). `care_coordinator_name` is set only as a **decoy with a different value** (`Azt Decoy Coordinator N`). The read-back saves the status and whether the names are the test names; a Case push waits for `ready`.
- **Unmapped CR fields (risk N1):** Zeke puts test markers in unmapped CR fields of the R1 test records on the CR screen (Job Title, Chosen Name, Middle Initial); `check-cr-record.mjs --unmapped save|compare` proves they survive an update (rows UW-1 to UW-5). Never an SSN or NPI as a test value. The SSN guard (client ruling 2026-11-24) is proven live with the records' blank `ssn` (the `--unmapped save` / `compare` output prints an "SSN shape" line, never the value) and offline for masked or partial values (row UW-3); the production read format is cutover check N1-SSN. The core-PUT proof of the send-back is S2 (real core edits), not S1.
- **Workday IDs:** every test value is exactly 7 digits (unchanged list above); SU-9 checks 3581246, 8146275, 5729364, 6029417 and 7741953 in production first (`prod-review-reads.mjs .env --workday-ids …`, counts only, and CR lookups).
- **Guardian values:** Case property-sync fields read from the Case (guide 11/09); a Guardian Contact edit reaches CR through the Case workflow, the poller or the sweep. No Contact workflow is needed (pending Zeke's confirmation); GS-1 proves the sync change reaches the Case.

**Updated 2026-11-24 (apply-recheck worker; `sandbox-coverage-recheck-2026-11-24.md`, log `apply-recheck-log-2026-11-24.md`).**
- **Promote workflows.** The three promote-after-create workflows are built in sandbox 52311591, OFF, enrolling from an active list (ID known AND creates = Yes AND link known). A linked record is promoted as soon as its creates box is ticked while they are on. The run sheet switches them explicitly (Zeke, HubSpot sandbox): OFF from S0 to S3c-0b, so the "linked, creates ticked, updates blank" legs run on the S3a set; ON at S3c-0b (after the census shows none such record), so BR4-P measures the delay on the S3c poller creates; OFF at S3e. No creates workflow is built in the sandbox: the script ticks the creates box, and TRG-084 is a production cutover check (open decision 2).
- **Tested build = cutover build.** P-1 commits the pending build with the N1 fix, the SSN guard and item 20 (the sweep retry cap); item 20 is a prerequisite on the build chat (P-1b). SU-1 hashes the guard and item 20 files.
- **Hourly schedule in S4.** `INTAKE_POLLER_SCHEDULE` is removed for S4 (Zeke at step) so the webhook runs make the S4 writes, and the S8-4 hourly round is proven there; the 5-minute schedule is put back before S5.

## Test log

Each push and change is logged step by step in [sandbox-rounds/round-1-log.md](sandbox-rounds/round-1-log.md) (one log per round, `sandbox-rounds/round-N-log.md`), with the HubSpot record ID and the CentralReach contact ID of each create. Fill an entry only after that step has happened. [sandbox-test-log.md](sandbox-test-log.md) keeps only the one-row-per-record summary and the "Made inactive in CR" date.
