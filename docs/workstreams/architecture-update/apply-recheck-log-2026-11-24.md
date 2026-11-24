# Apply log: coverage re-check (2026-11-24)

The apply-recheck worker applied every finding of `sandbox-coverage-recheck-2026-11-24.md` offline. It made no HubSpot, CentralReach, Azure or Google call, ran nothing with `--write` (`node --check` only), made no git write, and opened neither `.env` nor `local.settings.json`. It replaces the earlier "PARTIAL - paused" version of this file.

Extra inputs:
- `build-chat-2-ssn-guard-2026-11-24.md` (side-session notes): guard code, reason sentence, expected live values, the `[BR4][BR19]` hand-off tests.
- `cr-update-semantics-and-sendback-risks-2026-11-24.md`.
- `cr-live-checks-L1-L3-2026-11-24.md`: complete when this run finished. UW-3 to UW-5 are aligned with it.
- Working-tree `src/`, read-only.

**Files changed**
- `sandbox-rounds/retest-run-sheet-2026-11-24.md` (rewritten in place)
- `sandbox-test-matrix.md`
- `sandbox-coverage-ledger-2026-11-24.md`
- `SANDBOX-TEST-PLAN.md`
- `scripts/sandbox/create-test-records.mjs`
- `scripts/sandbox/check-cr-record.mjs`

No KQL file and no `round-*.json` needed a change. KQL extracts `reasonCode` generically, and the S8-4 proof uses `run-summary.kql`. Round 10's file is written by the script at S1, with Workday ID 6029417.

## 1. Finding → change

### Gap causes (5; 20 lines)

| ID | Change | Where |
|---|---|---|
| G1 (BT-009, BT-023) | Round 10 BT/RBT 1 is created by webhook with Workday ID 6029417. The census Workday list includes it automatically. Both lines now cite R1c-3. | `create-test-records.mjs` `WORKDAY_ROUNDS[10] = { bt1: "6029417", bcbaLater: "7741953" }`, header comments. Matrix R1c-1 to R1c-3 (R1c-3: lookups 404, create with ESID 6029417, `success`) and SU-9. Run sheet S0 item 4, S1 item 3, S3a expected. Ledger BT-009, BT-023. Test plan. |
| G2 (BCBA-027, -033, -034, -082, TRG-018, TRG-033) | New matrix row R1c-WD. Webhook: S4 sets R1c BCBA `workday_id` to 7741953, expect `waiting` "Replace the temporary…" with ESID unchanged. Poller: S5a `medicaid_id__ny` edit, still `waiting`, reason not rewritten. S7 checklist tick gives `error` `CHECKLIST_STILL_TEMPORARY` (`src/lib/syncDecisions.mjs:47-48`); untick gives `waiting`. Also added to SU-9 (7741953). | Matrix R1c-WD, SU-9. Run sheet S4 NY, S5a, S7. Ledger: the 6 lines. |
| G3 (TRG-070, TRG-305) | Took option (b). X07a-10 is not run, and the matrix row now records why: its run would end `error` `ANOTHER_HUBSPOT_RECORD_LINKED`. Both lines are OFFLINE-ONLY, citing `stage1CreateIdentity.test.mjs` "[G17] a Workday ID found only in CentralReach, with no HubSpot holder, is waiting and writes nothing". Option (a) on employee 5338681 is open decision 10: it needs the External System ID value of a record that is not a test record. | Matrix X07a-10. Run sheet S7. Ledger TRG-070, TRG-305. |
| G4 (CASE-184, BCBA-011, BT-034, TRG-076, TRG-145, LBL-085) | S3 re-ordered with explicit promote switches (see O1). The skip legs run on the S3a set with promote OFF: S3a-2 webhook skip, S3c-0 not queued, S3c-0b hand tick then poller update. The lines keep G-2 / G-9 and carry a note. | Matrix G-2, G-9. Run sheet S3. Ledger: the 6 lines. |
| G5 (N1-EMP, N1-CLI) | The core-PUT proof moves to S2, where every record has a real core edit: BT/RBT 1 Contact `city`, BCBA Contact `city` "New York B2", R1 Case `location_city` "New York S2". `--unmapped compare` runs after S2. S1 now reads "`update` only if a core value differs". | Matrix UW-1, UW-2, U2-4, U2-5. Run sheet S1, S2. Ledger N1-EMP, N1-CLI. |

### Expected-value mismatches (10)

| ID | Change | Where |
|---|---|---|
| E1 | S1u employee crCalls are now `lookup 200, labelRead 200, metadata 200`, with no `update`. **Not applied:** the side-session note `build-chat-2-field-wipe-fix-2026-11-24.md` L86, which is outside this worker's edit list. | Matrix UW-1; run sheet S1u |
| E2 | "`update` only if a mapped core value differs" | Matrix UW-1, UW-2; run sheet S1 |
| E3 | U2-4 is paired with a core edit, BCBA Contact `city` → "New York B2" (replaces the metadata-only `medicaid_id__ny`) | Matrix U2-4; run sheet S2 |
| E4 | R1b-2 and R1c-2: "lookup 404, create 200" (one lookup) | Matrix R1b-2, R1c |
| E5 | `success`: the 6 Cases, R2 BCBA (3581246), R1c BT/RBT 1 (6029417) and R3 BT/RBT 1 (8146275). `waiting`: the other 9 employees. | Matrix G-2, R2-23d/f, R3-13d/f; run sheet S3c-0b, S3d |
| E6 | A full re-send happens only for a G-9 record (create left unclean); otherwise only the edited field is sent | Matrix G-2; run sheet S3c-0b, S3d |
| E7 | Same as G3 | Matrix X07a-10 |
| E8 | `changedFieldNames` `["labels"]` | Matrix BR18 (status flip), X07b-3b; run sheet S10 |
| E9 | `core.PhoneCell` | Matrix GS-1; run sheet S5 expected |
| E10 | UW-3 rewritten as the SSN guard. Live leg: the S0 SSN shape line, then the blank `ssn` sent back in S2. Refusal leg is OFFLINE-ONLY, citing `br16UnmappedFieldsKept.test.mjs` "[BR16][3.13][B3][B8][T2]" and "[BR16][3.13][C2]". Expected values are taken from `src/`:<br>- code `CR_EMPLOYEE_READ_FAILED` / `CR_CLIENT_READ_FAILED`, status `error`, `operation: none`;<br>- reason "CentralReach answered GET /contacts/employee/{id} in a shape the integration cannot read. Expected field: contact.ssn.";<br>- employee crCalls: the GET only.<br>The script now prints the SSN shape (absent / blank / sendable / NOT SENDABLE, never the value), using `unsendableSsnKey` from `src/lib/mappedState.mjs`. | Matrix UW-3; `check-cr-record.mjs` `ssnShapeLine` (in `--unmapped save` / `compare`); run sheet S0 item 6, stop rule 14 |

### Run-sheet order and safety (9)

| ID | Change |
|---|---|
| O1 | **Promote switches** (Zeke at step, HubSpot sandbox):<br>- **OFF:** P-5b from S0 to S3c-0b; confirmed at S0 item 2 and at S3-0.<br>- **S3a:** webhook creates with promote OFF.<br>- **S3a-2:** new step for the skip legs (`skipped gate: update`).<br>- **S3c-0:** first poll, the S3a set not queued.<br>- **S3c-0b:** every webhook workflow off; hand tick on the 9 S3a records, then the next poll (R2-23b/d/f); census (1) "linked, creates ticked, updates blank" = 0; promote **ON**, not enrolling existing members.<br>- **S3c:** poller creates with promote ON; BR4-P records T1 (ID + link), T2 (list join) and T3 (tick).<br>- **S3d:** first edits of the S3c set with the webhooks still off (R3-13b/d/f stay poller proofs). R3 edits are core edits, so R3-9, R3-19 and U2-6 still send a PUT.<br>- **S3e:** promote **OFF**.<br>The "untick creates on R3" step is dropped (no creates workflow). The BR4-P R3b leg is dropped.<br>The census gains an `L` marker and a "promote would enrol" count (`create-test-records.mjs` section (1)). |
| O2 | G-1 and stop rule 6: both retry outcomes are expected. BR4-P: 160 s is informational; slower means the record finishes at the next poll; any delay up to two poll cycles passes. Stop rule 15: no tick within 15 minutes. |
| O3 | P-3 and P-7 move to after S0-D (S1 item 0), made with the Case and BT/RBT refresh workflows off and `record-timeline.kql` showing no run |
| O4 | The SU-9 round 3 lookup runs after `--round 3 --write` and before S3c. The round 10 lookups run after `--round 10 --write` and before S3a. Matrix SU-9; run sheet S1 item 3. |
| O5 | P-1 = pending build + N1 fix + SSN guard + item 20. New P-1b on the build chat: build item 20 with offline test b2 first. SU-1 now also hashes both sync workflows and the item 20 files. Matrix SU-1; run sheet P-1, P-1b, S0-D. |
| O6 | P-13 and old open decision 9 (UW-3) are deleted; UW-3 is rewritten (E10) |
| O7 | Stop rule 4: "a full re-send may still send no core PUT when CR already matches; not a fail" |
| O8 | Every promote switch is "Zeke at step"; the approval column now names HubSpot workflow switches |
| O9 | No change needed. One cause per record per push still holds: the R1c BCBA's S4, S5a and S7 legs are each the record's only edit in its push. |

### Invalid or stale exceptions (4)

| ID | Change |
|---|---|
| X-1 CASE-162 | The named test does not exist. Exact-list tests already pin the whole Case request list, and no archived "Prior" field is in it: `stage4and5PropertyLists.test.mjs` "[BR5][4.17] the Case mapped list holds exactly …" and "[BR13][4.17] the Case mustTrigger and system lists are unchanged …". The line therefore stays OFFLINE-ONLY with those tests cited, not BLOCKED. A named test is optional (open decision 11). |
| X-2 BT-113 | The test exists now: `centralReachEmployeeContactForm.test.mjs` "[T1][B1][5.13] an employee update never carries ContactForm: …". OFFLINE-ONLY, valid. |
| X-3 TRG-084 / TRG-085 | TRG-085 is COVERED by BR4-P on the S3c creates. TRG-084 is PRODUCTION-ONLY: no creates workflow is built, so the recency audit 2.5 ruling applies (master 4.10 enrolment check; open decision 2). |
| X-4 item 20 (CLB-160, TRG-297) | Still BLOCKED, re-labelled as a phase-one build gap. It waits on P-1b; the build chat unblocks it on Zeke's word. Proof after the build: offline test b2 plus the S10 sweep read. In the run sheet's P-1 and S10. |

### Citation and format fixes (12)

| ID | Change (all in the ledger unless stated) |
|---|---|
| C-1 | N1-EMP / N1-CLI: "BLOCKED until …" becomes "Build pending (SU-1): N1 fix + SSN guard" |
| C-2 | CLB-032, CLB-152: "not state-dependent" moved to the NY cell |
| C-3 | CLB-063: not state-dependent (U-48) |
| C-4 | BCBA-022, -030, -032, TRG-041, -046, -302: added R1c-2 and R3b-2 |
| C-5 | LBL-076: G-1 (S3a) |
| C-6 | LBL-083: R1F-5, G-2 |
| C-7 | TRG-125, TRG-127: U-29 and U-29b replace BR7 (BR7 is also named on the run sheet's S6 rows line) |
| C-8 | BT-140, TRG-093: the poller is on from S3c-0 |
| C-9 | Line-number drift fixed by citing test titles: STF-020 (T-LD), CLB-028, -112, -113, -120, -123, -150, -159 (`laneLLabelSender.test.mjs`) |
| C-10 | TRG-020, TRG-038 cite the test `stage4and5PropertyLists.test.mjs` "[B2][5.3] the ID properties the guide says never to read …" plus the code search. TRG-282 names its code search. |
| C-11 | LBL-044: the two `stage5EmployeeMappings.test.mjs` titles |
| C-12 | New SSN-guard offline evidence cited in UW-3, N1-EMP and N1-CLI |

Also applied from the re-check's "better to" notes:
- 23 "path n/a" lines are tagged "Process line".
- The 43 lines that dropped a PROVEN-LIVE qualifier are listed in the ledger header.
- The 6 guide-write lines are reclassed as DOCUMENTATION (check 5).
- The "weak" arrival-only cells are fixed by the S4 hourly schedule.

### Slice 08 scope (1)

- The ledger header now carries the crosswalk: 86 of 111 GC rows restated in slices 01-07; 23 rows are production or process tasks; the stale GC statuses are noted.
- Two lines were added:
  - **GC-102:** OFFLINE-ONLY, citing `checkTriggers.test.mjs` "[BR18][3.10] the script lists all four objects and exits 0, … compares nothing".
  - **GC-059:** **BLOCKED**, not "covered implicitly". **Deviation from the re-check:** `src/lib/safeLog.mjs` still logs `console[level](message, meta)`, and item 13 (one JSON line per log call) is "awaiting Zeke's word" (package L43; slice 08 row says not built). The matrix row GC-059 is written conditional on the build.
- Slice 08 itself was not edited.

### Efficiency

- **S8-4 merged into S4.** Zeke removes `INTAKE_POLLER_SCHEDULE` for S4 and restores it after. This holds after the other changes: the R1c-WD webhook leg sits in S4, and U-43 is timed against the hh:00 poll.
- **S8-4 proof:** `run-summary.kql` shows poller runs only at hh:00 in the S4 window.

## 2. Final ledger counts (recomputed by script from the 1,282 lines)

| Class | Count | Was | Change |
|---|---|---|---|
| COVERED | 889 | 890 | TRG-070 and TRG-305 out (−2); TRG-085 in (+1) |
| OFFLINE-ONLY | 155 | 152 | TRG-070, TRG-305, GC-102 |
| PRODUCTION-ONLY | 34 | 32 | TRG-084, N1-SSN |
| PHASE-TWO | 20 | 20 | |
| DEFERRED | 32 | 32 | |
| RETIRED | 107 | 107 | |
| DOCUMENTATION (new) | 6 | — | RD-002, RD-003, RD-004, BT-145, LBL-009, TRG-001 |
| ACCEPTED-UNTESTED | 0 | 0 | |
| BLOCKED | 39 | 46 | −6 documentation, −2 TRG-084/085, +1 GC-059 |
| **GAP-OPEN** | **0** | 0 (re-check: 20) | all 20 closed (section 1) |
| **All** | **1,282** | 1,279 | +GC-059, GC-102, N1-SSN |

Per slice, every row adds up:

| Slice | COVERED | OFFLINE-ONLY | PRODUCTION-ONLY | PHASE-TWO | DEFERRED | RETIRED | DOCUMENTATION | BLOCKED |
|---|---|---|---|---|---|---|---|---|
| 01 | 123 | 32 | 6 | 0 | 7 | 9 | 3 | 1 |
| 02 | 154 | 30 | 5 | 3 | 0 | 15 | 0 | 2 |
| 03 | 114 | 28 | 5 | 6 | 4 | 13 | 0 | 7 |
| 04 | 114 | 21 | 2 | 5 | 2 | 5 | 1 | 6 |
| 05 | 54 | 12 | 1 | 0 | 5 | 43 | 0 | 3 |
| 06 | 62 | 8 | 0 | 0 | 12 | 1 | 1 | 1 |
| 07a | 133 | 14 | 7 | 5 | 0 | 9 | 1 | 6 |
| 07b | 133 | 9 | 7 | 1 | 2 | 12 | 0 | 12 |
| N1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| added | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 1 |

Script checks:
- no duplicate ID;
- every COVERED line has both path cells filled;
- the BLOCKED-by-cause list equals the BLOCKED lines;
- every new row ID cited (R1c-WD, U-29, U-29b, R1F-5, G-1, G-2, BR4-P, U-48, R3b-2, GC-059) exists in the matrix.

**Exceptions by class:** 354 named exceptions (OFFLINE-ONLY 155, PRODUCTION-ONLY 34, PHASE-TWO 20, DEFERRED 32, RETIRED 107, DOCUMENTATION 6). The full lists are in the ledger's "Named exceptions by class".

## 3. BLOCKED by cause (39)

| Cause | Count | Who unblocks |
|---|---|---|
| United Care / Sara / Danny answers | 10 | Danny, United Care |
| O-17 / D8 Care Coordinator target in CR | 4 | Zeke with United Care |
| N6 failures reports and waiting views (P-12) | 6 | Zeke (HubSpot sandbox), before S7 |
| S8-3 method and email receiver | 6 | Zeke (P-11; receiver at S0-D) |
| Item 20 not built (P-1b) | 2 | build chat, on Zeke's word |
| Item 13 not built (GC-059) | 1 | Zeke's word, then build chat |
| 1 PM flip (P-10) | 4 | Zeke |
| BT-151 Active Cases Sync (P-7) | 1 | Zeke (HubSpot sandbox, S1 item 0) |
| Open decisions TRG-285, TRG-322, TRG-323 | 3 | Zeke |
| U-46 payor workflow (LBL-082, P-8) | 1 | Zeke (S0) |
| O-51 / T9 BT/RBT personal email (BT-146) | 1 | Danny, United Care |

## 4. Entity × state × path × create / update (pending build; step in brackets)

| Entity | State | Create, webhook | Create, poller | Update, webhook | Update, poller |
|---|---|---|---|---|---|
| Case | NY | R1c-1 (S3a) | R1b-1 (S3c) | R1F-1 (S1), UW-2 core (S2), U-01 (S4) | U-05 (S5a); R1b first edit (S3d) |
| Case | CO | R2-1 (S3a) | R2b-1 (S3c) | R2-23a / R2-10 (S4, hourly: webhook writes) | R2-23b (S3c-0b), R2-5 (S5a) |
| Case | NJ | R3b-1 (S3a) | R3-1 (S3c) | R3-13a (S4, webhook writes) | R3-13b, U2-6 (S3d, webhooks off), R3-16 (S5a), R3-8 (S5c) |
| BCBA | NY | R1c-2 (S3a) | R1b-2 (S3c) | R1F-1 (S1), U2-4 (S2), R1c-WD (S4) | U-23, R1c-WD (S5a) |
| BCBA | CO | R2-2 (S3a; Workday 3581246) | R2b-2 (S3c) | R2-23c (S4) | R2-23d (S3c-0b), R2-22 (S5a), R2-21 (S5b) |
| BCBA | NJ | R3b-2 (S3a) | R3-3 (S3c) | R3-13c (S4) | R3-13d, R3-19 (S3d, webhooks off) |
| BT/RBT | NY | **R1c-3 (S3a; Workday 6029417)** | R1b-3 (S3c) | R1F-1 (S1), U2-5 (S2) | U-38 (S5c) |
| BT/RBT | CO | R2-3 (S3a) | R2b-3 (S3c) | R2-23e / R2-14a, R2-14 (S4) | R2-23f (S3c-0b), R2-20 (S5a) |
| BT/RBT | NJ | R3b-3 (S3a) | R3-6 (S3c; Workday 8146275) | R3-13e (S4) | R3-13f, R3-9 (S3d), R3-7, R3-12 (S5a) |

- **Workday-filled creates:** BCBA webhook R2-2; BT/RBT webhook R1c-3; BT/RBT poller R3-6. A BCBA Workday-filled create by poller has no row; it is the same worker decision as R2-2.
- **Temporary ID → Workday ID:** BT/RBT R2-14 (CO, S4); BCBA R1c-WD (NY: S4 webhook, S5a poller, S7 checklist).
- **No cell is empty.** The six cells the re-check called "arrival only" are now webhook writes, because the poller is hourly during S4.

## 5. Run-sheet totals

| Measure | Value |
|---|---|
| Pushes | **32**. S3 grows from 6 to 7 (+1 for S3a-2 / S3c-0b). The separate S8-4 push goes (−1). |
| New CR test records | **18** (no change) |
| CR calls | **about 1,890**: S0 25, S1 175, S1u 25, S2 45, S3 800, S4 310, S5 155, S6 50, S7 75, S8 80, S9 60, S10 80, S12 10 |
| Hands-on hours | about 12 |
| Calendar days | 2 |

## 6. Decisions for Zeke

| # | Decision | Recommendation | Why |
|---|---|---|---|
| 1 | Contact workflow not needed (P-4) | Confirm "not needed" | Guardian fields are Case property-sync fields; GS-1 proves the path, and stop rule 12 catches a miss. |
| 2 | Creates workflow not built in the sandbox | Accept TRG-084 as PRODUCTION-ONLY (master 4.10 enrolment check) | The script ticks the creates box, so every sandbox create still runs through the gate. The enrolment that matters is production's. Building it only for the sandbox adds a step and changes no code path. |
| 3 | 1 PM flip property and workflow (P-10) | Name the property before S9 | Without it, 4 lines stay BLOCKED. |
| 4 | Active Cases Sync enrolment (P-7) | Fix the enrolment | Otherwise BT-151 stays BLOCKED. The hand-set fallback proves the values but not the automation. |
| 5 | S8-3 method (P-11) | Record-isolated label removal on 5385357 | One test record, restorable before the next poll. |
| 6 | U-46 payor workflow present (P-8) | Answer before S4 | Otherwise LBL-082 becomes PRODUCTION-ONLY. |
| 7 | UW-5 client lists | Do the L1 hand set-up before S0: 1 diagnosis code, 1 payor and 1 additional contact on 5384589; 1 pay type and 1 pay code on 5338681 | Every production client holds a payor and a diagnosis code, and the echo of them is unproven. |
| 8 | Production promote list filter | Add "updates not already true" and "created after the cutover date" | Under list enrolment, an existing linked record whose creates box is ticked by mistake would start receiving updates (a phase-two record). |
| 9 | N1-SSN | Ask CentralReach support whether the GET masks `ssn` | L2 found no SSN on 15 production employees, so a read cannot settle it without naming a real person's record. The guard is fail-safe either way. |
| 10 | Live X07a-10 leg on 5338681 | No | It needs the External System ID value of a record that is not a test record. The offline `[G17]` test proves the decision. |
| 11 | Named CASE-162 test | No (optional) | The exact-list tests already fail on any added property. |
| 12 | `latitude` / `longitude` echo | Yes, one test-record round trip before launch (build chat, with Zeke's go-ahead) | They are on every production client, read as numbers but typed as strings in the PUT spec, and have never been echoed. A rejection would fail every client update. |
| 13 | Employee date of birth missing in CR | Production count before phase two | 14 of 15 production employee reads lack `dateOfBirth`. Updates of such employees stop with `CR_EMPLOYEE_READ_FAILED`. Phase-one creates carry the placeholder date, so phase one is not hit. |
| 14 | Item 13 (one JSON line per log call; GC-059) | Decide before cutover. Approve it if the log queries are to parse every run reliably. | It is the only new BLOCKED line. |

## 7. Prerequisites before S0

| # | Owner | Prerequisite |
|---|---|---|
| 1 | build chat, on Zeke's word | P-1b: build item 20 with offline test b2, and name its files for SU-1 |
| 2 | Zeke → build chat | P-1: commit word for pending build + N1 fix + SSN guard + item 20 |
| 3 | Zeke (HubSpot sandbox) | P-5b: the three promote workflows confirmed OFF |
| 4 | Zeke (HubSpot sandbox) | P-2: Team Member record for owner 161391908 |
| 5 | Zeke (CR screen) | P-6: hand-adds and markers on 5384589, 5384530, 5384531, plus the L1 list set-up (decision 7) |
| 6 | Zeke (CR screen) | P-9: the 5 CR test records are active |
| 7 | Zeke | P-8: payor workflow answer |
| 8 | Zeke | P-11: S8-3 method |
| 9 | Zeke (HubSpot sandbox) | P-12: N6 views (needed by S7) |
| 10 | Zeke | P-10: 1 PM property (needed by S9) |
| 11 | testing chat | P-14: read-only S0 checks, UW baselines and SSN shape lines |
| 12 | Zeke | P-4: Contact workflow confirmation (sign-off only; does not block the run) |

P-3 and P-7 are no longer before S0: they run at S1 item 0, after the deploy.

## 8. Assumptions

1. The working-tree `src/` (MAPPING_VERSION `stage7-2026-11-23`, with the SSN guard) is what P-1 commits, plus item 20.
2. The promote workflows behave as the builder reported. Their list filters are unverified. HubSpot offers "do not enrol existing members" when a list-enrolled workflow is turned on; if not, the S3c-0b census of 0 promotable records makes the choice moot.
3. The poller does not queue a linked record whose updates box is blank (as G-4).
4. A BCBA Contact `city` edit reaches the BCBA on both paths (as MIR-1 / U2-5). If it does not, stop rule 12 applies.
5. `location_city` maps to core City (`src/mappings/client/buildClientPayload.mjs:55`). `home_apt` maps to the BT/RBT `addressLine2` (`buildEmployeePayload.mjs:227`).
6. 6029417 and 7741953 are new random 7-digit values found nowhere in `docs`, `scripts` or `src`. SU-9 checks them live before any write.
7. CR call figures are estimates, as before.
8. No creates workflow exists in the sandbox (none is reported built).

## 9. Not applied, or applied differently

- **E1 side note:** `build-chat-2-field-wipe-fix-2026-11-24.md` L86 is outside the edit list.
- **GC-059:** BLOCKED instead of "covered implicitly", because item 13 is not built.
- **CASE-162:** kept OFFLINE-ONLY on existing exact-list tests instead of BLOCKED, as explained in X-1.
- **G3:** option (b) taken; option (a) is decision 10.
- **Slice 08:** the stale GC statuses (about 20) are reported, not fixed; slice files are not editable.
- **BUILD-PLAN, OPEN-ITEMS, master:** not touched. Item 20 in P-1 and decisions 12 to 14 may need entries there.
