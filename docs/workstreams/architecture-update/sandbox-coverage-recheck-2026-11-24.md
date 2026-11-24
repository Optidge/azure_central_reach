# Sandbox coverage re-check (2026-11-24, independent, read-only)

An independent re-check of the sandbox end-to-end test plan against the client's gate: "our end to end test must test EVERY requirement, for all entities, in each state, the the webhook and the poller on in azure". No live calls were made, nothing was written to git, and no existing file was edited. This file is the only file written. The re-check did not trust what the plan says about itself: every requirement line was checked by script, and ranges were then read for judgement.

## Verdict: GATE NOT MET as written. True gap count: 20 (the ledger says 0)

The ledger's ID set and arithmetic are correct. Every requirement row of slices 01-07 appears exactly once, and every total recomputes. The gaps are in tracing a requirement to a run step: on 20 lines, the trace to a pending-build step on the claimed path either fails or cannot produce the stated behaviour. The causes:

- **Promote workflows.** The run sheet does not manage the newly built promote workflows, so the "linked, creates ticked, updates blank" legs cannot happen as written. 6 lines.
- **Old build only.** Two employee identity cases are proven only on `655b385`, the old build. 8 lines.
- **Wrong expected outcome.** One row (X07a-10) expects an outcome the code cannot give. 2 lines.
- **Offline tests that do not exist.** Two OFFLINE-ONLY lines cite a test "to add". 2 lines.
- **N1 core leg.** S1 probably sends no core PUT, so the unmapped-field core leg would pass trivially. 2 lines.

Every gap has a cheap fix, listed below. None needs a new CentralReach record. After the fixes, the plan meets the gate with the same 18 new CR records and about the same cost.

| Class | Ledger says | True (this re-check) | Change |
|---|---|---|---|
| COVERED | 890 | 872 | −18 (see check 2) |
| OFFLINE-ONLY | 152 | 150 | −2 (CASE-162, BT-113: no test exists) |
| PRODUCTION-ONLY | 32 | 32 | none (a new N1-SSN cutover line is recommended, check 8) |
| PHASE-TWO | 20 | 20 | none |
| DEFERRED | 32 | 32 | none |
| RETIRED | 107 | 107 | none |
| BLOCKED | 46 | 46 | 2 causes re-labelled (TRG-084, TRG-085, check 5) |
| GAP-OPEN | 0 | **20** | BT-009, BT-023, BCBA-027, BCBA-033, BCBA-034, BCBA-082, TRG-018, TRG-033, TRG-070, TRG-305, CASE-184, BCBA-011, BT-034, TRG-076, TRG-145, LBL-085, N1-EMP, N1-CLI, CASE-162, BT-113 |
| **All** | 1,279 | 1,279 | |

Findings in total: 41. They break down as 20 gap lines (5 causes), 10 expected-value mismatches, 9 run-sheet order and safety defects, 4 invalid or stale exceptions, 12 citation or format fixes, and 1 scope finding (slice 08).

---

## Check 1. ID integrity and totals

- **Slice IDs.** Parsed every table row of the 01-07 slices that has a Status column: 1,277 requirement IDs (01: 181, 02: 209, 03: 177, 04: 156, 05: 118, 06: 85, 07: 351 = 07a 175 + 07b 176). There are no duplicates.
- **Ledger lines.** 1,279 lines: the 1,277 slice IDs plus N1-EMP and N1-CLI. No duplicates and no missing IDs. The only IDs not in a slice are N1-EMP and N1-CLI, and both are declared as added.
- **Status.** After removing the PROVEN-LIVE qualifiers, ledger Status equals slice Status on all 1,277 lines. 43 lines drop a qualifier, for example BCBA-004 "PROVEN-LIVE (NY only)" becomes "PROVEN-LIVE". The 43 lines are BCBA-004, -005, -021, -022, -025 to -028, -031 to -034, -041, -054, -055, -061, -070, -073, -074, -081, -082, -094, -095, -097, -100, -116, -122 to -124, -128, -129, -132, -136, -138 to -140, -177, -181, and BCBA-L01, -L02, -L04, -L05, -L06. The ledger declares this ("qualifiers ignored"). It is not wrong, but it hides that these lines were proven in New York only.
- **Master.** All 298 non-GC rows in master appendices A and B carry the same status as their slice.
- **Totals.** Every per-slice row of the Totals table recomputes exactly. The "Named exceptions by class" lists match the class column (152/32/20/32/107, no extra or missing IDs). The BLOCKED-by-cause table lists 46 distinct IDs, equal to the 46 BLOCKED lines, and each cause's count equals its list.
- **Status vs class conflict (format, 2 lines).** N1-EMP and N1-CLI are classed COVERED, while their Note says "BLOCKED until the build chat's N1 fix is committed and deployed". Fix: keep them COVERED with "build pending (SU-1)" like the other build-pending lines, and delete the word BLOCKED.
- **Scope finding: slice 08 is excluded without a crosswalk.** Ledger line 3 says slice 08 (125 GC rows; 00-MASTER lists them as requirement rows) "restates" slices 01-07. No GC row cites a 01-07 ID. A per-row check of the 111 non-RETIRED GC rows found:
  - 86 SAME, 16 PARTIAL, 9 NONE.
  - Two carry testable behaviour with no matrix row: GC-059 (one JSON line per log call; it is exercised implicitly by every KQL query) and GC-102 (decision 51; tested offline only by `checkTriggers.test.mjs`).
  - The rest are production or process tasks.
  - About 20 GC statuses are stale against the ledger, for example GC-123 BLOCKED vs CASE-125 OFFLINE-ONLY, GC-027/GC-037 NOT-BUILT vs COVERED, and GC-039 PROVEN-LIVE vs CASE-068 RETIRED.
  - **Fix (ledger header):** replace the claim with "86 of 111 GC rows are restated in 01-07; GC-059 is covered implicitly by the KQL steps (S0 SU-5, every push); GC-102 is OFFLINE-ONLY (`checkTriggers.test.mjs`); the other 23 PARTIAL/NONE rows are production or process tasks (master 4.10 / 6.3)". Add two ledger lines (GC-059, GC-102) or cite them under TRG-281 and TRG-124.

## Check 2. COVERED lines: requirement → matrix row → run-sheet step → build, path, state

**Mechanical results (all 890 COVERED lines):**

- **Cited rows exist.** Every row ID cited in a state or path cell exists in `sandbox-test-matrix.md`. Range rows such as "R1c-1 to R1c-3" were expanded. Zero invented row IDs.
- **Path cells.** No COVERED line has an empty Webhook or Poller cell. 23 lines carry "path n/a" on both paths. They are process or test-data conventions proven by set-up steps: CASE-200, BCBA-166 to -169, -171, -172, -173, -175, BT-148, TRG-006, -007, -012, -016, -025, -089, -091, -093, -116, -286, -325, -326, -327. These are acceptable, but they are not end-to-end tests; better to tag them as "process" lines.
- **State cells.** There are 317 state-dependent COVERED lines. Every one fills NY, CO and NJ, or gives a per-state "n/a" naming the sibling line. 82 such cells were checked, all valid (for example BCBA-090/091/092 split by state). Three lines have a misplaced cell:
  - CLB-032 and CLB-152 put "not state-dependent" in the CO column.
  - CLB-063 (a state-label swap) has NJ "—"; NY→NJ is proven by U-48, and slice 05 records "no change from or to CO" as a GAP.
  - Fix: move "not state-dependent: …" into the NY cell for CLB-032 and CLB-152. For CLB-063, mark it not state-dependent (the managed-group rule is state-agnostic and proven by NY→NJ, U-48).
- **Rows not run by the run sheet.** The matrix field rows (C/B/T/CL/BL/TL) are run by `check-cr-record.mjs` at every create and in the S4 U1 checks, so they are accepted. The BR rows are run indirectly through round-1-log line numbers (for example BR12 = Push 1 line 1, and line 3 in S5a); traced and accepted. Rows that ran only on the old build `655b385` on 2026-11-23 are not accepted: R1-1, R1-2, R1-3, R4-1, R4-2, R-WD, R1-WD.

**Gap lines (18 of the 20; CASE-162 and BT-113 are under check 4):**

| # | Lines | Problem | Exact fix |
|---|---|---|---|
| G1 | BT-009, BT-023 | Webhook cell = R4-1 only (the 2026-11-23 create on `655b385`). No BT/RBT is created **by webhook with a Workday ID** on the pending build: R2, R3b and R1c BT/RBT 1 are all temporary-ID; the only Workday-filled BT/RBT create is R3-6, by poller. | `create-test-records.mjs` `WORKDAY_ROUNDS[10] = { bt1: "<new 7-digit>" }` so the R1c BT/RBT 1 (S3a, webhook) is created with a Workday ID. Add it to SU-9. Temporary-ID BT/RBT webhook creates stay on R2 (CO) and R3b (NJ). Cite R1c-3 in both lines. 0 extra CR calls. |
| G2 | BCBA-027 (PO), BCBA-033 (WH, PO), BCBA-034 (PO), BCBA-082 (PO), TRG-018 (WH), TRG-033 (WH) | The temporary-ID → Workday ID transition for a **BCBA** is proven only by BR10 / R-WD (old build, 2026-11-23). The pending-build transition is proven for the BT/RBT only (R2-14). | In S4 (NY), set `workday_id` on the R1c BCBA (temporary ID) to a new 7-digit value checked in SU-9. Expect `waiting`, "Replace the temporary…", ESID unchanged. In S5 (poller leg), one more field edit expects the same. In S7, tick the checklist and expect `CHECKLIST_STILL_TEMPORARY`. Add a matrix row (for example R1c-WD) and cite it in the 6 lines. About 15 CR calls, no extra push. |
| G3 | TRG-070, TRG-305 | Matrix X07a-10 (L652) expects `waiting` with "no HubSpot holder". The holder search is by `employee_id` (`src/lib/hubspotClient.mjs:355-395`). R1 BT/RBT 1 still holds `employee_id` 5384530 after U-37, because U-37 clears only `workday_id`. So the run ends `error ANOTHER_HUBSPOT_RECORD_LINKED` (`src/workflows/employeeSyncWorkflow.mjs:897-904`), which is the same as U-32. | Either (a) point X07a-10 at a CR employee that no HubSpot record holds: test employee 5338681 has no HubSpot record. Read its External System ID read-only and use it as the hand-made record's `workday_id` if it is 7 digits; expect `waiting`, `WORKDAY_ALREADY_IN_CENTRALREACH`, no CR write. Or (b) make TRG-070/TRG-305 OFFLINE-ONLY with `stage1CreateIdentity.test.mjs` "[G17] a Workday ID found only in CentralReach…" (the BCBA-045 test). |
| G4 | CASE-184, BCBA-011, BT-034, TRG-076, TRG-145 (G-2 is the only proof in a path cell) and LBL-085 (G-9 only) | The run sheet cannot produce "linked, creates ticked, updates blank" as written. Two causes. (1) The promote workflows (now built, OFF, enrolling from an active list: ID known AND creates = Yes AND link known) promote **every** record that is linked with the creates box ticked. The matrix BR4-P row (L659) has them ON in S3a/S3c, so all 18 new records would be promoted before the S3d skip edits. (2) If they are OFF, BR4-P cannot measure "CR ID write → tick". | Re-order S3 (check 6, finding O1). The skip legs run on the S3a set with the promote workflows OFF. Promote is turned ON before S3c, so BR4-P is measured on the S3c creates. |
| G5 | N1-EMP, N1-CLI | UW-1/UW-2 expect `update 200` in S1. The pending build sends a core PUT only when a mapped core value differs from CR's read (`src/lib/centralReachClient.mjs:424-426`, `:650-652`). The version bump re-sends metadata but does not force a PUT, and `--refresh` writes the values CR already holds (R1-U1 never ran). S1 will most likely show no PUT, and `--unmapped compare` then passes trivially. | Prove the body send-back in a PUT, as in check 8: add a core edit per record and run `--unmapped compare` after it. |

**Citation-only fixes (the evidence exists; the cell cites old-build rows):**

- BCBA-022, BCBA-030, BCBA-032, TRG-041, TRG-046, TRG-302: add R1c-2 and R3b-2 (temporary-ID BCBA webhook creates on the pending build).
- LBL-076: cite G-1 / S3a (two webhooks per create, the second `SYNC_IN_PROGRESS`; seen on 2026-11-23 and recurring on every create).
- LBL-083: cite R1F-5 / G-2 ("no label POST when CR shows the labels").
- TRG-125, TRG-127: BR7 is never run; cite U-29 and U-29b (S6a, `test_record`).
- BT-140, TRG-093: "poller off until S2" is stale. The poller comes on at S3c-0.

**Weak but accepted (not counted as gaps):**

- **Webhook update cells for CO and NJ rely on arrival only.** S4 runs with the 5-minute poller on, and the webhook arrives about 9 minutes after the edit. The CR write is therefore usually made by the poll, and the webhook run is a `noop`. This affects all three entities in CO and NJ (R2-23a, R2-23c, R2-23e, R3-13a, R3-13c, R3-13e). The plan's path rule (review C O2) accepts arrival. Fix (also an efficiency gain, check 7): take the run sheet's own option and set `INTAKE_POLLER_SCHEDULE` to hourly for S4, so the webhook runs do the writes. This also proves S8-4, so the separate S8-4 push goes.
- **GS-1 is the only path proof for 15 lines.** They are OBJ-034, STF-076, CASE-177 to -180, CASE-188, TRG-143, TRG-195, TRG-217, TRG-218, TRG-218a, TRG-218b, TRG-269, TRG-289. GS-1 is an inferred mechanism, with stop rule 12 and "[pending Zeke: Contact workflow confirmation]". If GS-1 fails, all 15 fall to BLOCKED. The plan already handles this.

### Entity × state × path × create/update (pending build; the run-sheet step in brackets)

| Entity | State | Create, webhook | Create, poller | Update, webhook | Update, poller |
|---|---|---|---|---|---|
| Case | NY | R1c-1 (S3a) | R1b-1 (S3c) | R1F-1 (S1, poller off), U-01 (S4) | U-05 (S5a) |
| Case | CO | R2-1 (S3a) | R2b-1 (S3c) | R2-23a / R2-10 (S4) **arrival only** | R2-23b (S3d), R2-5 (S5a) |
| Case | NJ | R3b-1 (S3a) | R3-1 (S3c) | R3-13a (S4) **arrival only** | R3-13b (S3d), R3-16 (S5a), R3-8 (S5c) |
| BCBA | NY | R1c-2 (S3a) | R1b-2 (S3c) | R1F-1 (S1), U2-4 (S2) | U-23 (S5a) |
| BCBA | CO | R2-2 (S3a; Workday 3581246) | R2b-2 (S3c) | R2-23c (S4) **arrival only** | R2-23d (S3d), R2-21 (S5b), R2-22 (S5a) |
| BCBA | NJ | R3b-2 (S3a) | R3-3 (S3c) | R3-13c (S4) **arrival only** | R3-13d (S3d) only, **see note** |
| BT/RBT | NY | R1c-3 (S3a) | R1b-3 (S3c) | R1F-1 (S1), U2-5 (S2) | U-38 (S5c) |
| BT/RBT | CO | R2-3 (S3a) | R2b-3 (S3c) | R2-23e / R2-14a (S4) **arrival only** | R2-23f (S3d), R2-20 (S5a) |
| BT/RBT | NJ | R3b-3 (S3a) | R3-6 (S3c; Workday 8146275) | R3-13e (S4) **arrival only** | R3-13f (S3d), R3-7, R3-12 (S5a) |

Workday-filled creates: BCBA webhook R2-2, BT/RBT poller R3-6. **Empty: BT/RBT Workday-filled create by webhook** (gap G1).

No cell is empty for create/update × path × state × entity.

- **Weak cells.** The six "arrival only" cells.
- **At risk.** The NJ BCBA poller update rests only on R3-13d in S3d. Under the promote fix, the R3 records are promoted at create, so their S3d edit must be made **with the Case, BCBA and BT/RBT webhook workflows off** to stay a poller proof. If not, the NJ BCBA poller-update cell becomes empty.

## Check 3. Expected values against the pending `src/`

147 matrix rows were checked against the working-tree `src/` (MAPPING_VERSION `stage7-2026-11-23`, `src/lib/mappedState.mjs:7`). Every row named in the brief was included:

- R1b, R2b, R3b, R1c, UW-1 to UW-5, BR4-P, G-1 to G-9, R2-1, R3-1, the S3d expectations;
- C10, C13, C19, C24, C25, C31, B5, T2, BR19;
- every Guardian row (G-5, K1, K2, K5, U-04, U-48, GS-1, X02-5, R2-23g, R3-13g, R3-20);
- MIR-1, R2-27, X07b-3b.

Every format rule matches the code: phone, address split, physician/NPI, allergies, the severity digit, the " BCBA LBA" suffix, grad permit, referral Other, the state fallback, text dates, label replace/remove, temporary ID with `waiting`, 7-digit Workday ID, `test_record`, gate create/update, excluded stage, unreadable values.

Also confirmed against the code:

- **(a) The retry after a create.** It is `skipped`, `record_gate`, `gate: update`, with 0 CR calls, and HubSpot `last_sync_status` stays blank. References: `src/lib/syncEligibility.mjs:59-63`, `src/workflows/clientSyncWorkflow.mjs:369-398`, `src/workflows/employeeSyncWorkflow.mjs:518-549`, `src/lib/retry.mjs:72`, `:169-174`, `src/workflows/clientSyncWorkflow.mjs:806-808`, `:986`.
- **(b) First runs after the deploy.** They are `update` with every field changed (`src/lib/linkRecord.mjs:32-36`, `src/lib/mappedState.mjs:183-187`, `:272-275`), but the core PUT is still skipped when CR already matches.

**Mismatches (10):**

| # | Row | Where | As written | What `src/` does | Fix |
|---|---|---|---|---|---|
| E1 | UW-1, S1u employee | matrix:678; run sheet:117 | crCalls `lookup, metadata 200, labelRead` | Labels are read before metadata is written (`src/lib/centralReachClient.mjs:1165-1187`), and the summary keeps call order (`src/lib/syncRunSummary.mjs:147`) | `lookup 200, labelRead 200, metadata 200`, no `update`. Also correct `build-chat-2-field-wipe-fix-2026-11-24.md` L86 (side-session notes) |
| E2 | UW-1, UW-2 core leg (S1) | matrix:678-679; run sheet:111 | `update 200` | PUT only when a mapped core value differs (`src/lib/centralReachClient.mjs:424-426`, `:650-652`) | Write "`update` only if a core value differs", and add the core-edit leg (check 8) |
| E3 | U2-4 | matrix:562; run sheet:121 | The PUT carries CR's own date | The only other edit (`medicaid_id__ny`) is metadata. The rebuilt date equals CR's (`src/lib/mappedState.mjs:327-328`, `:496-497`), so no PUT is sent | Pair the date clear with a core edit (R1 BCBA Contact `city` → "New York B2"), as U2-5 already does |
| E4 | R1b-2, R1c-2 ("as R1b") | matrix:628, :636 | Both lookups 404 | With `workday_id` blank there is one lookup (`src/workflows/employeeSyncWorkflow.mjs:878-880`) | "lookup 404, create 200" |
| E5 | G-2 / S3d status | matrix:426; run sheet:148 | `success`; only R3 / R3b employees stay `waiting` | Every temporary-ID employee stays `waiting` (`src/lib/syncDecisions.mjs:40-46`; verified) | "`success` for the 6 Cases, R2 BCBA (3581246) and R3 BT/RBT 1 (8146275); `waiting` for the other 10 employees" (with fix G1, R1c BT/RBT 1 joins the `success` list) |
| E6 | G-2 / S3d "full re-send" | matrix:426; run sheet:148 | Full re-send for all | Only when the create run did not end clean. Clean creates save hashes (`src/workflows/clientSyncWorkflow.mjs:930-933`, `src/workflows/employeeSyncWorkflow.mjs:1339-1352`) | "Full re-send only for G-9 records (label POST unconfirmed); otherwise only the edited field" |
| E7 | X07a-10 | matrix:652 | `waiting`, no holder | `error ANOTHER_HUBSPOT_RECORD_LINKED` | Gap G3 fix |
| E8 | X07b-3b, BR18 | matrix:654, :162 | Warning naming `staffing_status` | `changedFieldNames` uses compared-state keys (`src/lib/mappedState.mjs:112-150`); `staffing_status` only drives labels | Expect `changedFieldNames` `["labels"]` |
| E9 | GS-1 (b) | matrix:688 | `phone` in `changedFieldNames` | The key is `core.PhoneCell` | Name it `core.PhoneCell` |
| E10 | UW-3 | matrix:680; run sheet:47 | "Leave `ssn` out" (open decision 9) | Superseded by today's ruling; the guard is now in `src/lib/centralReachClient.mjs:652-671` | Rewrite (check 8) |

Not determinable from the code:

- the BR4-P delay (a HubSpot workflow);
- the Guardian arrival paths (HubSpot triggers and syncs);
- the live CR handling of UW-3 to UW-5;
- X06-2 role labels ("per decision 35" is ambiguous; the code removes all role labels for RBT);
- the X07b-4 "cleared" value (depends on the R1 Case location at S8).

## Check 4. Exceptions (non-COVERED, non-BLOCKED: 343 lines)

| Class | Count | Valid | Invalid or weak |
|---|---|---|---|
| OFFLINE-ONLY | 152 | 147 | **Invalid (no test exists):** CASE-162 ("H4 property-list test (to add)"), BT-113 ("employee-PUT test to add"). Both become GAP-OPEN until the test is written: one `[K14]` property-list test, one employee-PUT payload test. **Weak:** TRG-020, TRG-038, TRG-282 cite a code search, not a test; acceptable as "absence" lines, but name the file and the search. LBL-044 cites "S5 managed-list tests" with no title; name `[TL3][5.12]` / `[BL…]`. |
| PRODUCTION-ONLY | 32 | 32 | All name a cutover check (master 4.10 / 6.3 or the first-week check). |
| PHASE-TWO | 20 | 20 | All concern existing, hand-linked or already-in-CR records. |
| DEFERRED | 32 | 32 | NM/VA (13), optional (7), credential labels not built by decision d25 (9), and item 21 dated "before the existing-records phase" (CLB-118, LBL-084, an explicit client date). |
| RETIRED | 107 | 107 | Each cites a guide line or a decision. |

How the 152 OFFLINE-ONLY lines were checked:

- 89 name a `*.test.mjs` file. Every file exists, and every cited tag is in the file.
- 63 use slice abbreviations (S1, S45PL, T-LS …). They were resolved through each slice's abbreviation line, and all files exist.
- **Line-number drift.** These citations land on non-test lines in the working tree: STF-020 (`T-LD:347`); CLB-028 (`T-LS:150`), CLB-112 (`:164`), CLB-113 (`:86`), CLB-120 (`:337`), CLB-123 (`:138`), CLB-150 (`:714`), CLB-159 (`:218`). Fix: cite the test title instead of the line.
- **New offline evidence to cite.** The SSN guard tests now exist in `src/tests/smoke/br16UnmappedFieldsKept.test.mjs` (L537, L556, L600, L629, L646, L689, L710).

## Check 5. BLOCKED lines (46) by cause

| Cause | Count | Who unblocks | Re-check |
|---|---|---|---|
| United Care / Sara / Danny answers | 10 | Danny, United Care | Genuine (no answer in the package or the recency audit) |
| O-17 / D8 Care Coordinator target in CR | 4 | Zeke with United Care | Genuine (matches GC-041) |
| N6 failures reports and waiting views | 6 | Zeke (sandbox, P-12) | A set-up dependency, not a decision. Genuine until P-12 is done |
| S8-3 method and email receiver | 6 | Zeke (P-11; receiver at S0-D) | Genuine |
| Guide write, no behaviour (RD-002 to RD-004, BT-145, LBL-009, TRG-001) | 6 | Zeke (guide) | No behaviour to test. These do not belong in an end-to-end gap count; reclass them as a "documentation" class |
| Item 20 not built (CLB-160, TRG-297) | 2 | Build chat, on Zeke's commit word | **Really a phase-one build gap.** The package says item 20 is due "Before cutover" (`BUILD-PACKAGE-DRAFT-2026-11-23.md:16`, `:1208`), but P-1 commits without it, so the cutover build would differ from the tested build. Fix: add item 20 to the P-1 commit, and prove it with the offline b2 test plus the S10 sweep read |
| BR4-P creates / promote workflows (TRG-084, TRG-085) | 2 | Zeke | **Re-label.** TRG-085: the promote workflows are now built (OFF), so it becomes COVERED once fix O1 is in the run sheet. TRG-084: no creates workflow is reported built, so take the recency audit's ruling (2.5, "PRODUCTION-ONLY": master 4.10 creates-workflow enrolment check), unless Zeke builds it |
| 1 PM flip (P-10) | 4 | Zeke | Genuine |
| BT-151 (P-7) | 1 | Zeke | Genuine |
| Open decisions (TRG-285, TRG-322, TRG-323) | 3 | Zeke | Genuine (GC-106 CONFLICT and GC-073 BLOCKED agree) |
| U-46 payor workflow (LBL-082) | 1 | Zeke (S0) | Genuine |
| O-51 / T9 BT/RBT personal email (BT-146) | 1 | Danny, United Care | Genuine (T9 held at `655b385`) |

None of the BLOCKED lines is really decided already. Two are mislabelled (TRG-084, TRG-085), and two hide a phase-one build gap (item 20).

## Check 6. Run-sheet safety and order

**Scripts:**

- `node --check` passes on every `scripts/sandbox/*.mjs` and on `scripts/check-triggers.mjs`.
- `create-test-records.mjs` writes HubSpot only after confirming portal 52311591 is a SANDBOX (L524-528). Plan and census modes refuse every non-GET except a CRM search (L86-89).
- `check-cr-record.mjs` is GET-only apart from the token POST (L105-115).
- `check-cr-sendback-risks.mjs` and `check-cr-unmapped-fields.mjs` PUT only to the two allow-listed test contacts 5338681 and 5384589 (L61/L65, L210-220), and only with `--write`. The run sheet uses neither.
- `prod-review-reads.mjs` refuses anything but allow-listed production GETs and count searches (L43-44).
- No script can write outside the sandbox or to a CR record that is not on an allow-list.
- **Script data vs the matrix.** Spot-checked for every new set:
  - `CREATES_BOX` = true on rounds 2, 3 and 5-10; blank on rounds 1 and 4 (L218).
  - `WORKDAY_ROUNDS`: R2 BCBA 3581246, R3 BT/RBT 1 8146275, R4 values (L102-106).
  - Rounds 5, 6, 7 and 10 have no Workday ID.
  - Hand-made legs match the run sheet S1 item 4.
  - These match the matrix, apart from fix G1 (round 10 BT/RBT 1).

**Order and safety findings:**

| # | Finding | Fix |
|---|---|---|
| O1 | **Promote workflows (new fact).** They enrol from an active list (ID known AND creates = Yes AND link known), so any linked record with the creates box ticked is promoted when they are ON. The run sheet never says ON or OFF. The matrix BR4-P (L659) has them firing in S3a/S3c, and that contradicts S3d's "edit each of the 18 new records (updates blank)" and the G-1/G-9 "retry `skipped gate: update`". It also makes BR4-P's delay unmeasurable if they are turned on after the creates. | **New prerequisite P-5b:** promote workflows OFF from S0 to the end of S3c-1. **S3a (promote OFF):** R2, R3b and R1c webhook creates; G-1/G-9 retry `skipped gate: update` observed here. **Move the S3d skip legs for these 9 records into S3a's follow-on:** edit one mapped field each and expect `skipped gate: update` on both paths, then tick updates by hand; the next poll is R2-23b/d/f with `update`. **S3c-0b (Zeke at step, sandbox):** census (1) must show no record that is linked with creates ticked and updates blank, then promote ON, choosing not to enrol existing records. **S3c:** R3, R2b and R1b poller creates with promote ON. BR4-P delay = T2 − T1 on these 9 records, from property history. **S3d for the S3c set:** the first edits run with the Case, BCBA and BT/RBT webhook workflows **off** (R3-13b/d/f stay poller proofs). **Promote OFF at S3e** (or leave ON; no later step needs "linked, creates ticked, updates blank"). Drop the "untick creates on R3" instruction in S3c: no creates workflow is reported built, so the R3 creates would stall on `gate: create`. Drop the R3b leg of BR4-P. |
| O2 | **BR4-P timing with list enrolment.** List joins are usually slower than an event trigger, and the delay may exceed 160 s or even one 5-minute poll. | G-1 and stop rule 6 should read: "the retry is `skipped gate: update` (HubSpot blank) if updates is not yet ticked at 150 s; if the promote tick landed first, the retry runs the update and confirms labels, `success`. Both expected." BR4-P pass mark: "any delay up to two poll cycles; record the number". Change the stop to "no tick within 15 minutes", not "one poll cycle". |
| O3 | **Sandbox writes before the deploy.** S0 is "before the deploy" and the sheet says no sandbox record write before S0-D. Yet P-3 (make `referral_other` a property sync) and P-7 (fix the "BT - Active Cases Sync" enrolment) change property values on linked R1/R4 records in HubSpot. That can fire refresh webhooks that push through `655b385`. | Mark P-3 and P-7 "after S0-D" (they block only S1 and S3a). Or do them with the Case and BT/RBT refresh workflows off, and confirm no run with `record-timeline.kql`. |
| O4 | **SU-9 R3 lookup order.** It is told to run "at S1 before the R3 create", but `check-cr-record.mjs` needs `round-3.json` (L707-711), which exists only after `--round 3 --write`. | Run it after `--round 3 --write` (Entered is blank, so no CR call) and before S3c sets Entered. |
| O5 | **P-1 scope.** It says "including the N1 fix". The client has ruled the SSN guard in, and item 20 is due before cutover (check 5). | "P-1: commit = pending build + N1 fix + SSN guard (+ item 20)". Also SU-1 should hash the files that hold the guard (`src/lib/centralReachClient.mjs` is already hashed). |
| O6 | **P-13 / open decision 9 (UW-3)** are settled by today's ruling. | Delete P-13; rewrite UW-3 (check 8). |
| O7 | **Stop rule 4** (first runs are full re-sends) is correct for fields changed. Add: "a full re-send may still send **no core PUT** when CR already matches; not a fail". | Edit stop rule 4. |
| O8 | **Azure writes.** Every Azure write is marked "Zeke at step": S0-D deploy and receiver, S3-0 / S3e settings, S3c-0 poller, S10 S8-4, S13 schedule, the hourly option. The promote ON/OFF switch is a HubSpot sandbox write by Zeke and must be added as "Zeke at step". | Add to S3c-0b. |
| O9 | **One failure cause per record per push.** Checked across S6a and S6b, it holds: U-39 is restored before S6b; R1 Case U-14b and X05-1 are one failure and one non-failure; U-32 and X07a-1 repeat the same cause. No unplanned CR create is possible: every Entered = Yes sits on a planned create set, on a hand-made record that errors before CR, or on an X04 "Yes - Generic" record that is not a create trigger. | none |

## Check 7. Efficiency

**Totals re-added from the run sheet:**

- Pushes: 2+1+1+6+4+6+2+3+2+1+2+1+1 = **32**.
- CR calls: 25+170+25+30+800+305+150+50+75+80+60+90+10 = **1,870**.
- Hours: 1.5+0.5+1.5+2.5+1.5+2+2+0.5 = **12**.
- New CR records: S3a 9 + S3c 9 = **18**.

All four match. "2 days" is the minimum because the daily sweep runs once at 08:00 UTC: the day-1 set-ups (U-15, WD-5, U-45, S8-2) need the next day's sweep.

**Nothing on the P1 path can be dropped without losing a gate cell.** Each of the six create sets (R2, R2b, R3, R3b, R1b, R1c) is the only create for its entity × state × path. R1-R3 on 2026-11-23 ran on the old build.

**Cheap changes:**

1. **Merge S8-4 into S4.** Set `INTAKE_POLLER_SCHEDULE` to hourly for S4 (2 Azure writes, Zeke at step). This drops the separate S8-4 push (−1 push), and makes the six CO/NJ "arrival only" webhook-update cells real webhook writes.
2. **Drop the BR4-P R3b leg** (fix O1). One record per object is enough for the delay.
3. **Add item 20 to the P-1 commit.** This avoids a second deploy and regression before cutover.
4. **Move the UW core proof into S2.** Add a BCBA Contact `city` edit and an R1 Case core edit to S2, then run `--unmapped compare` there. This fixes E2, E3 and G5 with no extra push.
5. **Fix G1 and G2 inside existing pushes.** Round 10 BT/RBT 1 Workday ID; R1c BCBA `workday_id` in S4. About +15 CR calls.

Net effect: 32 pushes (−1 for S8-4, +1 for the extra poll cycle S3c-0b needs), 18 new CR records, about 1,890 CR calls, 2 days, about 12 hours.

## Check 8. The unmapped-field fix (N1) under the committed design

**Committed design (client ruling 2026-11-24):** keep the send-back of every unmapped key, plus an SSN guard. The SSN is sent back only when it is blank or a full 9 digits; anything else means no PUT, and the record fails naming the field.

The guard is now in the working tree. In `src/lib/centralReachClient.mjs:652-671`:

- The guard runs only when a core PUT is about to be sent.
- On failure it throws `CR_EMPLOYEE_READ_FAILED` / `CR_CLIENT_READ_FAILED`: permanent, HubSpot `error`, reason field `contact.ssn`, the value never logged.
- A metadata-only or label-only change still succeeds.
- The client update checks it too (L431).

Tests: `src/tests/smoke/br16UnmappedFieldsKept.test.mjs` L537-726.

What the UW rows must say:

| Row | Change |
|---|---|
| UW-1 / UW-2 | Header: "BLOCKED until committed" becomes "build pending (SU-1): N1 fix + SSN guard". In S0, add a `--keys` read of the `ssn` key on 5384530, 5384531 and 5384589. If it holds anything other than blank, absent or 9 digits, **stop**: every core update of that record would end `error … contact.ssn`. The core leg moves to a push with a real core edit (S2: BT/RBT Contact `city`, BCBA Contact `city`, R1 Case core field). Expect `update 200` and `--unmapped compare` = UNMAPPED_KEPT yes (the `ssn` key equal and blank). S1 should read "`update` only if a core value differs". S1u employee crCalls: `lookup 200, labelRead 200, metadata 200`, no `update` (E1). S1u client stays `lookup, lookup, labelRead, metadata 200`. |
| UW-3 | Rewrite as "SSN guard". Live leg: the test records' `ssn` is blank, so the core PUT sends it back blank and the compare shows it equal (proven inside UW-1/UW-2; no SSN-like value is ever typed). Refusal leg (masked, partial, non-text): **OFFLINE-ONLY**, `br16UnmappedFieldsKept.test.mjs` "[BR16][3.13][B3][B8][T2] the SSN guard: … sends no PUT on a core change (error naming ssn, no metadata or label write …)" and the Case twin (L646). Remove open decision 9 and P-13. |
| New ledger line N1-SSN | PRODUCTION-ONLY cutover check, read-only: on a sample of production CR employees and clients, is the GET `ssn` blank or 9 digits, or masked? If CR masks it on GET, every core update of a record with an SSN on file would fail permanently. New phase-one records are created without an SSN, but HR may add one in CR later. Zeke decides before cutover. |
| UW-4 | Unchanged. |
| UW-5 | The employee leg (Languages on 5384530) proves nothing, because the employee PUT ignores `languages`; keep it as an observation only. The proof is the **client** list leg. Test employee 5338681 now holds "English" as its accepted resting state. It is not a pipeline record (no HubSpot record), so the run is unaffected. Any re-run of `check-cr-unmapped-fields.mjs` or `check-cr-sendback-risks.mjs` must treat "English" as baseline. |

## Earlier reviews (A, B, C)

- **Review C, B1-B6:** confirmed fixed in the files:
  - B1: stop rule 4 and R1F-1;
  - B2: stop rule 6 and G-1/G-9, matching `src/` (check 3a);
  - B3: stop rule 7;
  - B4: stop rule 8 and `--handmade`;
  - B5: SU-1 hashes in S0-D;
  - B6: the `--refresh` guard in `create-test-records.mjs` L561-570.
- **Recency audit 2.5:** spot-checked 20 ledger fixes; 19 are applied. TRG-084 deliberately differs (see check 5).
- Reviews A and B were not re-verified finding by finding.

## Assumptions

1. The working-tree `src/` on 2026-11-24, including the SSN guard just added, is the build P-1 will commit.
2. The promote workflows behave as the builder's report in `PROMOTE-WORKFLOW-PROMPT-2026-11-24.md` (L180-193) says. Nobody has opened them; the list filters are unverified.
3. No creates workflow exists in the sandbox, because none is reported built.
4. The arrival rule (review C O2) is the agreed webhook proof. The six "arrival only" cells are weak, not gaps.
5. Matrix field rows (C/B/T/CL/BL/TL) count as run when `check-cr-record.mjs` checks them at a create or U1 step. BR rows count as run when their round-1-log line is in a run-sheet push.
6. Slice 08 is outside the ledger's scope by the plan's own definition. It is reported, not counted in the 20 gaps.
7. The expected values in check 3 rest on a code trace of 147 rows. Live CR behaviour for masked, date and list keys (UW-3 to UW-5) cannot be known offline.
