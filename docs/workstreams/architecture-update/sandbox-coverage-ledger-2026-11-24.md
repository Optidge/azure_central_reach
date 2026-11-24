# Sandbox coverage ledger (2026-11-24)

**Why.** Zeke, 2026-11-24: "our end to end test must test EVERY requirement, for all entities, in each state, the the webhook and the poller on in azure", and "This is a requirement to confirm. The plan and full end to end test must" cover every requirement for each entity in every state. This ledger is that confirmation, on paper: one line per requirement row of the final requirements review, slices 01 to 07 (`requirements-review-2026-11-24/`; slice 08 (125 GC rows, 111 not RETIRED) is crosswalked, not repeated: [apply-recheck] re-check check 1: 86 of the 111 GC rows are restated in 01-07; GC-059 and GC-102 have their own lines below ("Added lines"): GC-102 OFFLINE-ONLY (`checkTriggers.test.mjs`), GC-059 BLOCKED (item 13 is not built in the working tree, so the re-check's "covered implicitly by the KQL steps" does not hold); the other 23 PARTIAL / NONE rows are production or process tasks (master 4.10 / 6.3). About 20 GC statuses in slice 08 are stale against this ledger (for example GC-123, GC-027, GC-037, GC-039); slice 08 is not edited here). The test rows it names are in `sandbox-test-matrix.md` (the existing tables and "Retest rows (2026-11-24)", including "Rows added by the coverage ledger"); the order they run in is `sandbox-rounds/retest-run-sheet-2026-11-24.md`.

**Reviews A and B applied (2026-11-24, offline).** Every finding of `sandbox-coverage-review-A-2026-11-24.md` and `sandbox-coverage-review-B-2026-11-24.md` is applied below; the per-finding record, the entity × state × path table and Zeke's calls are in `apply-AB-log-2026-11-24.md`. Run-sheet, script and master 4.10 changes the reviews need are queued in `run-sheet-changes-from-AB-2026-11-24.md` (AB-1 to AB-22); a line whose proving step exists only there says "(run-sheet change AB-n pending)". Counts below are recomputed from the lines.

**Coverage re-check applied (2026-11-24, apply-recheck worker, offline).** Every finding of `sandbox-coverage-recheck-2026-11-24.md` is applied below, in the run sheet, the matrix and the scripts; the per-finding record is `apply-recheck-log-2026-11-24.md`. The re-check's 20 true gaps are closed: 16 lines go back to COVERED on pending-build steps (G1 R1c-3; G2 R1c-WD; G4 the promote switches and S3a-2; G5 the S2 core leg), TRG-070 / TRG-305 become OFFLINE-ONLY (G3), CASE-162 and BT-113 stay OFFLINE-ONLY with tests that exist. Lines changed carry "[apply-recheck]".

**PROVEN-LIVE qualifiers (re-check check 1).** 43 lines drop a slice qualifier such as "(NY only)": BCBA-004, -005, -021, -022, -025 to -028, -031 to -034, -041, -054, -055, -061, -070, -073, -074, -081, -082, -094, -095, -097, -100, -116, -122 to -124, -128, -129, -132, -136, -138 to -140, -177, -181, BCBA-L01, -L02, -L04, -L05, -L06. Their old live proof was New York only; their CO and NJ cells name the retest rows that prove the other states.

## BLOCKED lines by cause

| Cause | Who unblocks | Count | Lines |
|---|---|---|---|
| United Care / Sara / Danny answers | Danny, United Care (Sara) | 10 | BCBA-058, BCBA-059, BCBA-060, BCBA-112, BCBA-194, BT-086, BT-143, CLB-050, TRG-019, TRG-065 |
| O-17 / package D8: Care Coordinator target in CR | Zeke with United Care | 4 | CASE-070, BCBA-137, BCBA-184, TRG-243 |
| N6: HubSpot failures reports and waiting views not built (P-12; a set-up dependency) | Zeke (HubSpot sandbox), before S7 | 6 | BT-153, TRG-168, TRG-169a, TRG-169b, TRG-169c, TRG-170 |
| S8-3 forced-failure method (open decision 5) and the email receiver (S0-D, Azure write) | Zeke | 6 | API-033, CASE-198, BT-138, TRG-171, TRG-295, TRG-296 |
| Item 20 not built (sweep retry cap, "before cutover"): prerequisite P-1b, built with offline test b2 before the P-1 commit; then b2 + the S10 sweep read | build chat, on Zeke's word | 2 | CLB-160, TRG-297 |
| Item 13 not built (one JSON line per log call, PKG E17, open question 17) | Zeke's word, then the build chat | 1 | GC-059 |
| 1 PM flip: BT 1 start-date property name and the sandbox 1 PM workflow (X07b-3b; open decision 3) | Zeke | 4 | CLB-039, TRG-161, TRG-202, TRG-274 |
| Question 13 prerequisite P-7: "BT - Active Cases Sync" enrolment (automation leg only) | Zeke (HubSpot sandbox, S1 item 0) | 1 | BT-151 |
| Open decisions (RG D15 / Ruling B, package H-Q6, O-HS-JOURNAL) | Zeke | 3 | TRG-285, TRG-322, TRG-323 |
| U-46: is the payor-status workflow in sandbox 52311591 (P-8) | Zeke (S0) | 1 | LBL-082 |
| O-51 / T9: BT/RBT personal email field | Danny, United Care | 1 | BT-146 |
| **All** | | **39** | |

## Named exceptions by class

| Class | Count | Lines |
|---|---|---|
| OFFLINE-ONLY | 155 | OBJ-017, OBJ-019, OBJ-023, OBJ-025, OBJ-033, OBJ-035, API-003, API-035, STF-007, STF-010, STF-018, STF-020, STF-023, STF-026, STF-029, STF-032, STF-033, STF-036, STF-039, STF-041, STF-043, STF-045, STF-047, STF-050, STF-058, STF-061, STF-064, STF-066, STF-068, STF-070, STF-084, STF-085, CASE-003, CASE-005, CASE-012, CASE-013, CASE-028, CASE-029, CASE-030, CASE-040, CASE-045, CASE-050, CASE-066, CASE-089, CASE-090, CASE-091, CASE-112, CASE-121, CASE-125, CASE-126, CASE-135, CASE-141, CASE-152, CASE-162, CASE-174, CASE-175, CASE-176, CASE-182, CASE-183, CASE-185, CASE-203, CASE-204, BCBA-012, BCBA-014, BCBA-024, BCBA-039, BCBA-040, BCBA-043, BCBA-047, BCBA-048, BCBA-049, BCBA-056, BCBA-057, BCBA-071, BCBA-079, BCBA-093, BCBA-096, BCBA-098, BCBA-102, BCBA-110, BCBA-111, BCBA-120, BCBA-142, BCBA-143, BCBA-144, BCBA-145, BCBA-150, BCBA-151, BCBA-152, BCBA-185, BT-026, BT-027, BT-028, BT-029, BT-030, BT-041, BT-049, BT-052, BT-078, BT-084, BT-085, BT-088, BT-106, BT-111, BT-112, BT-113, BT-133, BT-137, BT-139, BT-154, BT-155, CLB-015, CLB-028, CLB-112, CLB-113, CLB-120, CLB-122, CLB-123, CLB-132, CLB-150, CLB-157, CLB-158, CLB-159, LBL-035, LBL-036, LBL-044, LBL-069, LBL-071, LBL-072, LBL-079, LBL-080, TRG-020, TRG-038, TRG-062, TRG-068, TRG-070, TRG-071, TRG-077, TRG-079, TRG-080, TRG-081, TRG-082, TRG-128, TRG-129, TRG-146, TRG-263, TRG-273, TRG-282, TRG-294, TRG-301, TRG-305, TRG-309, TRG-312, TRG-333, GC-102 |
| PRODUCTION-ONLY | 34 | API-002, API-012, SBX-002, API-036, SBX-004, STF-087, CASE-047, CASE-072, CASE-092, CASE-169, CASE-170, BCBA-001, BCBA-081, BCBA-160, BCBA-163, BCBA-181, BT-064, BT-156, CLB-051, TRG-084, TRG-086, TRG-094, TRG-117, TRG-132, TRG-135, TRG-137, TRG-210, TRG-224, TRG-236, TRG-272, TRG-284, TRG-298, TRG-307, N1-SSN |
| PHASE-TWO | 20 | CASE-025, CASE-032, CASE-208, BCBA-045, BCBA-046, BCBA-051, BCBA-053, BCBA-063, BCBA-178, BT-031, BT-035, BT-036, BT-142, BT-144, TRG-063, TRG-072, TRG-087, TRG-104, TRG-165, TRG-288 |
| DEFERRED | 32 | OBJ-036, OBJ-037, STF-054, STF-056, STF-072, STF-073, STF-079, BCBA-140b, BCBA-L03, BCBA-L07, BCBA-196, BT-120, BT-121, CLB-067, CLB-068, CLB-073, CLB-074, CLB-118, LBL-006, LBL-007, LBL-027, LBL-028, LBL-029, LBL-030, LBL-031, LBL-032, LBL-033, LBL-050, LBL-051, LBL-084, TRG-192, TRG-245 |
| RETIRED | 107 | OBJ-016, API-016, API-029, STF-006, STF-012, STF-074, STF-075, WF-001, WF-002, CASE-064, CASE-067, CASE-068, CASE-071, CASE-077, CASE-103, CASE-107, CASE-109, CASE-113, CASE-129, CASE-147, CASE-148, CASE-181, CASE-186, CASE-201, BCBA-099, BCBA-113, BCBA-115, BCBA-121, BCBA-170, BCBA-174, BCBA-176, BCBA-179, BCBA-180, BCBA-190, BCBA-191, BCBA-192, BCBA-193, BT-005, BT-007, BT-061, BT-107, BT-149, CLB-001, CLB-002, CLB-004, CLB-005, CLB-006, CLB-007, CLB-024, CLB-025, CLB-026, CLB-036, CLB-041, CLB-042, CLB-043, CLB-044, CLB-045, CLB-046, CLB-047, CLB-048, CLB-049, CLB-081, CLB-082, CLB-083, CLB-084, CLB-085, CLB-086, CLB-087, CLB-088, CLB-089, CLB-090, CLB-091, CLB-092, CLB-093, CLB-094, CLB-095, CLB-096, CLB-097, CLB-098, CLB-099, CLB-100, CLB-101, CLB-102, CLB-103, CLB-133, LBL-041, TRG-014, TRG-017, TRG-074, TRG-092, TRG-103, TRG-141, TRG-142, TRG-144, TRG-159, TRG-179, TRG-183, TRG-194, TRG-196, TRG-198, TRG-199, TRG-204, TRG-206, TRG-207, TRG-222, TRG-299, TRG-306 |
| DOCUMENTATION | 6 | RD-002, RD-003, RD-004, BT-145, LBL-009, TRG-001 |
| ACCEPTED-UNTESTED | 0 | none |
| GAP-OPEN | 0 | none |

**How to read a line.**
- **NY / CO / NJ:** the matrix row(s) that prove the requirement in that state (a field row such as `C8 (R2)` means its R2 column; `R2-1` and the like are the create and update steps), or `not state-dependent: <row>`.
- **Webhook / Poller:** the row that proves it: webhook by the webhook's **arrival** (`record-timeline.kql` pathProof WEBHOOK ARRIVAL within 15 minutes of the edit; review C O2, 2026-11-24), poller by a run whose `source` is / `intakePoller` (Case) or `employeePoller` (BCBA, BT/RBT) (poller; `src/workflows/intakePollerWorkflow.mjs:84`, :101), or `path n/a: <reason>`.
- **Creates per entity, state and path (no "path-independent" stand-in).** Every entity has a create on each path in each state: Colorado webhook R2-1 / R2-2 / R2-3 and poller R2b-1 to R2b-3; New Jersey webhook R3b-1 to R3b-3 and poller R3-1 / R3-3 / R3-6; New York poller R1b-1 to R1b-3 and webhook R1-1 to R1-3 (2026-11-23 build) and R1c-1 to R1c-3 on the pending build (AB-22, approved 2026-11-24). [apply-recheck] The BT/RBT Workday-filled create by webhook on the pending build is R1c-3 (6029417; re-check G1); the BCBA temporary → Workday transition on the pending build is R1c-WD (re-check G2). Basis, Zeke 2026-11-24: "If it makes sense to actually use test records in the sandbox and then in central reach do so. Live calls from test records are ok. If this will cut the testing time for you to test with acutal test records taht we craete for each entity and the states then do so." A create-rule line's path cells name these create sets.
- **Generic rows.** A path cell naming a generic update row shows that the path runs for that entity in that state; for label rules (the worker has no path branch) such a cell is marked "generic" where the rule's own edge case runs on one path only.
- **Class:** COVERED (all five cells filled), or exactly one exception class: OFFLINE-ONLY (the sandbox cannot set the case up; the offline test is named), PRODUCTION-ONLY (the cutover check is named), PHASE-TWO (existing records; Zeke 2026-11-24: "Production will push in two phases: 1. Create records only. 2. Review of existing records ..."), DEFERRED (New Mexico, Virginia; Zeke 2026-11-23: "These are pending the client beginning work in these states."; also optional items of master section 8 and the dated item 21, both Zeke's call 4), RETIRED (the guide line or decision), ACCEPTED-UNTESTED (a closed master question that accepts no test; Zeke's call 5; none left after TRG-273 moved to OFFLINE-ONLY with the slice), BLOCKED (what it waits on and who unblocks it; table above), GAP-OPEN (a fix needs a value or decision that could not be derived; listed above).
- **DOCUMENTATION** [apply-recheck] (re-check check 5): a requirement with no behaviour to test that waits only on Zeke's guide write (RD-002 to RD-004, BT-145, LBL-009, TRG-001). Not an end-to-end gap; was BLOCKED.
- **Status (slice):** the slice's status as written on 2026-11-24, before Zeke's rulings of that day. The Class is the status after them: for example a slice NOT-BUILT row that the working tree now builds is COVERED by its retest row, with "build pending" in the Note until the build chat's change is deployed.

**Checks run (offline, by script, 2026-11-24; re-run by the apply-recheck worker).** 1282 lines (1,277 slice lines + N1-EMP, N1-CLI + GC-059, GC-102, N1-SSN); no duplicate ID; every COVERED line has both path cells filled; each slice's lines are in the slice's own order with matching IDs and statuses; every row ID in a state or path cell exists in `sandbox-test-matrix.md` (rows added by reviews A and B are in its section "Rows added by coverage reviews A and B").

**Caveats for the reviewer.**
- **Contact workflow (O-21) reversed (2026-11-24, recency audit section C) [pending Zeke: Contact workflow confirmation]:** the Guardian name, email and phone are Case property-sync fields, so a Guardian edit reaches CR through the Case (Case workflow webhook, the poller, the sweep). U-04, G-5, K1, R2-23g, R3-13g are restated on the Case path; GS-1 proves the inferred point (the sync change fires the Case workflow and moves `hs_lastmodifieddate`); the fan-out-only lines are OFFLINE-ONLY (optional code), the production Contact workflow lines RETIRED.
- U-46 (payor-status workflow) waits on Zeke's word that the workflow is in the sandbox (LBL-082 BLOCKED). U-40 and the BR15 views wait on N6. R2-15, R3-8 and T7: question 13 is a prerequisite (P-7) with a hand-set fallback; only BT-151 (the automation leg) stays BLOCKED.
- "Build pending" lines (items 2, 3, 6, 8, the blank supplier, junk Address 2, the whole-address rule, the employee blank date of birth, the N1 field-wipe fix, and [apply-recheck] the SSN guard; item 20 is not built yet, prerequisite P-1b) are built but uncommitted on 2026-11-24; they cannot pass before the commit is deployed (SU-1).
- The 96 lines that said "AB-n pending" now say "AB-n applied": every AB change is in the 2026-11-24 run sheet (apply-C worker).
- **Late change (2026-11-24, after the ledger was built):** the R3 Case is created with gender, email, phone, state and ZIP blank (U2-6, B21 both sides blank, now run early in S3d), so its NJ cells for C4, C6, C8 (phone, state, ZIP) and CL1 are proven on the update path by R3-20 (S4), not at the R3 create. The same holds for R3b-1 (round 6, same pattern). The employee date send-back rows U2-4, U2-5 (real dates, S2), R3-9 and R3-19 (placeholder, S3d) moved early; their IDs are unchanged, R3-19 and R3-20 are new.
- R3 BT/RBT 1 is created with Workday ID 8146275 (X07a-2), so temporary-ID and `waiting` BT/RBT behaviour is proven on R2 BT/RBT 1 (CO) and the new R1b-3, R2b-3, R3b-3 creates (review A S-5).

## Totals

| Slice | Lines | COVERED | OFFLINE-ONLY | PRODUCTION-ONLY | PHASE-TWO | DEFERRED | RETIRED | ACCEPTED-UNTESTED | DOCUMENTATION | BLOCKED | GAP-OPEN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | 181 | 123 | 32 | 6 | 0 | 7 | 9 | 0 | 3 | 1 | 0 |
| 02 | 209 | 154 | 30 | 5 | 3 | 0 | 15 | 0 | 0 | 2 | 0 |
| 03 | 177 | 114 | 28 | 5 | 6 | 4 | 13 | 0 | 0 | 7 | 0 |
| 04 | 156 | 114 | 21 | 2 | 5 | 2 | 5 | 0 | 1 | 6 | 0 |
| 05 | 118 | 54 | 12 | 1 | 0 | 5 | 43 | 0 | 0 | 3 | 0 |
| 06 | 85 | 62 | 8 | 0 | 0 | 12 | 1 | 0 | 1 | 1 | 0 |
| 07a | 175 | 133 | 14 | 7 | 5 | 0 | 9 | 0 | 1 | 6 | 0 |
| 07b | 176 | 133 | 9 | 7 | 1 | 2 | 12 | 0 | 0 | 12 | 0 |
| added (N1) | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| added (re-check) | 3 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| **All** | **1282** | **889** | **155** | **34** | **20** | **32** | **107** | **0** | **6** | **39** | **0** |

**Gap statement (recomputed 2026-11-24 by script after the coverage re-check; apply-recheck worker).** 1282 lines (1,277 slice lines + N1-EMP, N1-CLI + GC-059, GC-102, N1-SSN). GAP-OPEN: **0** (the re-check found 20; all are closed, see the paragraph above and the log). COVERED 889, named exceptions 354 (OFFLINE-ONLY 155, PRODUCTION-ONLY 34, PHASE-TWO 20, DEFERRED 32, RETIRED 107, DOCUMENTATION 6), BLOCKED 39 (cause and who unblocks above). Changes from 1279 / 890 / 343 / 46: TRG-070 and TRG-305 COVERED → OFFLINE-ONLY; TRG-085 BLOCKED → COVERED; TRG-084 BLOCKED → PRODUCTION-ONLY; six guide-write lines BLOCKED → DOCUMENTATION; added GC-059 (BLOCKED), GC-102 (OFFLINE-ONLY), N1-SSN (PRODUCTION-ONLY). COVERED lines that rest on build-pending code (the N1 fix, the SSN guard and the earlier build-pending items) pass only after SU-1 proves the P-1 commit deployed. Each slice line's Status equals its slice Status (PROVEN-LIVE qualifiers ignored; see above).

## Slice 01: Objects, IDs, staffing associations (01-objects-associations.md)

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| RD-001 | PROVEN-LIVE | not state-dependent: R1F-1 | — | — | R1-1, R1c-1, R1-2, R1c-2, R1-3, R1c-3, R3b-1, R3b-2, R3b-3 | R3-1, R3-3, R3-6, R1b-1, R2b-1, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Every sandbox run uses the sandbox table; production table offline (T-PORTAL), cutover master 6.3 item 2. |
| RD-002 | PENDING | — | — | — | — | — | DOCUMENTATION | Guide shading lost in the snapshot (A6); waits on Zeke's guide write (master section 7, question 7). No behaviour. No sandbox row needed (no behaviour); unblocks on Zeke's guide write. [apply-recheck] Re-check check 5: no behaviour to test; reclassed from BLOCKED to DOCUMENTATION (waits on Zeke's guide write; not an end-to-end gap). |
| RD-003 | PENDING | — | — | — | — | — | DOCUMENTATION | As RD-002: reading convention, no behaviour; waits on the guide write (question 7). No sandbox row needed (no behaviour); unblocks on Zeke's guide write. [apply-recheck] Re-check check 5: no behaviour to test; reclassed from BLOCKED to DOCUMENTATION (waits on Zeke's guide write; not an end-to-end gap). |
| RD-004 | PENDING | — | — | — | — | — | DOCUMENTATION | As RD-002: reading convention, no behaviour; waits on the guide write (question 7). No sandbox row needed (no behaviour); unblocks on Zeke's guide write. [apply-recheck] Re-check check 5: no behaviour to test; reclassed from BLOCKED to DOCUMENTATION (waits on Zeke's guide write; not an end-to-end gap). |
| RD-005 | PROVEN-LIVE | not state-dependent: R1F-1 | — | — | R1-1, R1c-1, U-01, U-03, R3b-1 | R3-1, U-05, U-23, R1b-1, R2b-1 | COVERED | Every create and update sends HubSpot values to CR. |
| RD-006 | PROVEN-LIVE | SU-4, R1-1 | R2-25, G-1 | R3-1, R3-3 | R2-1, R2-2, G-1, R3b-1 | R3-1, R3-3, R3-6, R1b-1, R2b-1, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | CR ID and link written back on each create; SU-4 / R2-25 read the link properties. |
| OBJ-001 | OFFLINE-ONLY | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R2-1, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | `0-3` is HubSpot's standard Deal type in every portal, so sandbox runs prove it (C37 link uses `0-3`). |
| OBJ-002 | PROVEN-LIVE | not state-dependent: C37 (R1), R1-1 | — | — | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | C37 link holds `0-3`. |
| OBJ-003 | OFFLINE-ONLY | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | `/crm/v3/objects/deals` is the same path in every portal; offline search body `stage3Poller.test.mjs:717`. |
| OBJ-004 | PROVEN-LIVE | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Deals API on every Case read and write. |
| OBJ-005 | PLANNED | not state-dependent: R2-9 | — | — | R2-9 | G-2, U-43 | COVERED | R2-9 ID mismatch stops; G-2 poll updates with no create; U-43 (BR14) one CR write. |
| OBJ-006 | OFFLINE-ONLY | not state-dependent: R2-12, R2-13 | — | — | R2-12, U-19 | R2-12, R2-13 | COVERED | Production has one Deal pipeline (read 2026-11-24); other stages sync (R2-13, U-19), Cleanup skipped (R2-12). |
| OBJ-007 | PROVEN-LIVE | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Test Cases are created in pipeline `default`. |
| OBJ-008 | OFFLINE-ONLY | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | Sandbox stage IDs equal production (slice U13); R2-12 / BR6 move the Case into `1383894301` and create one there. Create leg: X01-4, a hand-made Case created in `1383894301` (S3a; run-sheet change AB-4 applied). |
| OBJ-009 | OFFLINE-ONLY | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | Same stage ID in sandbox; R2-12 covers `1383894303`. Create leg: X01-4, a hand-made Case created in `1383894301` (S3a; run-sheet change AB-4 applied). |
| OBJ-010 | OFFLINE-ONLY | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | Same stage ID in sandbox; R2-12 covers `1383894302`. Create leg: X01-4, a hand-made Case created in `1383894301` (S3a; run-sheet change AB-4 applied). |
| OBJ-011 | OFFLINE-ONLY | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | Same stage ID in sandbox; R2-12 covers `1332962645`. Create leg: X01-4, a hand-made Case created in `1383894301` (S3a; run-sheet change AB-4 applied). |
| OBJ-012 | PLANNED | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | Webhook `skipped` `excluded_stage`; poll does not queue (master D13). Create leg: X01-4, a hand-made Case created in `1383894301` (S3a; run-sheet change AB-4 applied). |
| OBJ-013 | PLANNED | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | As OBJ-012. Create leg: X01-4, a hand-made Case created in `1383894301` (S3a; run-sheet change AB-4 applied). |
| OBJ-014 | PLANNED | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | As OBJ-012. Create leg: X01-4, a hand-made Case created in `1383894301` (S3a; run-sheet change AB-4 applied). |
| OBJ-015 | PLANNED | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | As OBJ-012. Create leg: X01-4, a hand-made Case created in `1383894301` (S3a; run-sheet change AB-4 applied). |
| OBJ-016 | RETIRED | — | — | — | — | — | RETIRED | Guide L605, L641 (11/06): labels read `staffing_status`, the stage table is reference only. |
| OBJ-017 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID: T-PORTAL (`stage2PortalAndRetries.test.mjs:236`, :247); set at cutover, master 6.3 item 2. |
| OBJ-018 | PROVEN-LIVE | not state-dependent: R1-2 | — | — | R1-2, R1c-2, R2-2, U-03, R3b-2 | R3-3, U-23, R1b-2, R2b-2 | COVERED | Every BCBA run uses `2-72890322`. |
| OBJ-019 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only path: T-PORTAL (`stage2PortalAndRetries.test.mjs:247`); cutover 6.3 item 2. |
| OBJ-020 | PROVEN-LIVE | not state-dependent: R1-2 | — | — | R1-2, R1c-2, R2-2, U-03, R3b-2 | R3-3, U-23, R1b-2, R2b-2 | COVERED | Every BCBA run uses this path. |
| OBJ-021 | MISSING-TEST | not state-dependent: U-28 | — | — | X01-1 | U-28 | COVERED | Terminated by poll (U-28), no deactivation; webhook edit and Resigned: proposed X01-1. X01-1 moved to S6a, refresh workflows on (R4 BCBA `medicaid_id__co`, R4 BT/RBT 1 `home_apt` in Terminated; then Resigned + one more field; run-sheet change AB-10 applied). |
| OBJ-022 | MISSING-TEST | not state-dependent: U-28 | — | — | X01-1 | U-28 | COVERED | Sandbox BCBA stages Terminated `1344955697` (U-28) and Resigned `1344955696` (X01-1). X01-1 moved to S6a, refresh workflows on (R4 BCBA `medicaid_id__co`, R4 BT/RBT 1 `home_apt` in Terminated; then Resigned + one more field; run-sheet change AB-10 applied). |
| OBJ-023 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID: T-PORTAL (`stage2PortalAndRetries.test.mjs:247`); cutover 6.3 item 2. |
| OBJ-024 | PROVEN-LIVE | not state-dependent: R1-3 | — | — | R1-3, R1c-3, R2-3, U-02, R3b-3 | R3-6, U-36, R1b-3, R2b-3 | COVERED | Every BT/RBT run uses `2-72890325`. |
| OBJ-025 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only path: T-PORTAL (`stage2PortalAndRetries.test.mjs:247`); cutover 6.3 item 2. |
| OBJ-026 | PROVEN-LIVE | not state-dependent: R1-3 | — | — | R1-3, R1c-3, R2-3, U-02, R3b-3 | R3-6, U-36, R1b-3, R2b-3 | COVERED | Every BT/RBT run uses this path. |
| OBJ-027 | MISSING-TEST | not state-dependent: U-35, BR12 | — | — | BR12, X01-1 | U-35 | COVERED | Entry values Yes - Generic / No- Made Inactive (BR12); Terminated by poll (U-35); nothing deactivated. X01-1 moved to S6a, refresh workflows on (R4 BCBA `medicaid_id__co`, R4 BT/RBT 1 `home_apt` in Terminated; then Resigned + one more field; run-sheet change AB-10 applied). |
| OBJ-028 | MISSING-TEST | not state-dependent: X01-1 | — | — | X01-1 | U-35 | COVERED | Sandbox Resigned `1299798139` equals production; gate never reads the stage (poll shown in Terminated). X01-1 moved to S6a, refresh workflows on (R4 BCBA `medicaid_id__co`, R4 BT/RBT 1 `home_apt` in Terminated; then Resigned + one more field; run-sheet change AB-10 applied). |
| OBJ-029 | MISSING-TEST | not state-dependent: U-35 | — | — | X01-1 | U-35 | COVERED | Sandbox Terminated `1299798140` equals production. X01-1 moved to S6a, refresh workflows on (R4 BCBA `medicaid_id__co`, R4 BT/RBT 1 `home_apt` in Terminated; then Resigned + one more field; run-sheet change AB-10 applied). |
| OBJ-030 | MISSING-TEST | not state-dependent: U-35 | — | — | X01-1 | U-35 | COVERED | Sandbox BT/RBT pipeline `822050166` used by U-35 and X01-1. X01-1 moved to S6a, refresh workflows on (R4 BCBA `medicaid_id__co`, R4 BT/RBT 1 `home_apt` in Terminated; then Resigned + one more field; run-sheet change AB-10 applied). |
| OBJ-031 | MISSING-TEST | not state-dependent: X01-1 | — | — | X01-1 | U-35 | COVERED | Resigned move in X01-1. X01-1 moved to S6a, refresh workflows on (R4 BCBA `medicaid_id__co`, R4 BT/RBT 1 `home_apt` in Terminated; then Resigned + one more field; run-sheet change AB-10 applied). |
| OBJ-032 | MISSING-TEST | not state-dependent: U-35 | — | — | X01-1 | U-35 | COVERED | Terminated move in U-35. X01-1 moved to S6a, refresh workflows on (R4 BCBA `medicaid_id__co`, R4 BT/RBT 1 `home_apt` in Terminated; then Resigned + one more field; run-sheet change AB-10 applied). |
| OBJ-033 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Optional fan-out code: a `0-1` webhook → `contactChange` → 1 Case queued, no BCBA, no CR Contact. OFFLINE-ONLY `stage6ContactRouting.test.mjs` [K1][6.1]; live only if a Contact webhook is ever built (not needed: the Guardian values reach the Case by its sync properties, K1 / GS-1). [pending Zeke: Contact workflow confirmation] |
| OBJ-034 | PLANNED | K1, U-04 | R2-23g | R3-13g, R3-20 | U-04, R2-23g, R3-13g | GS-1 | COVERED | K1 by both paths. Guardian path (recency audit section C): edit the Guardian Contact field; the Case sync property changes; the Case workflow sends the webhook (proven by arrival, record-timeline) or the poll queues the Case (GS-1); CR shows the new value. Arrival only by `intakePoller` while the Case workflow is on = a trigger-list gap for Zeke. [pending Zeke: Contact workflow confirmation] |
| OBJ-035 | PLANNED | — | — | — | — | — | OFFLINE-ONLY | `contact_category` routing exists only in the optional fan-out: OFFLINE-ONLY `stage6ContactRouting.test.mjs`. G-5 proves the gate on the Case path. [pending Zeke: Contact workflow confirmation] |
| OBJ-036 | DEFERRED | — | — | — | — | — | DEFERRED | DEFERRED (optional, master section 8, 2026-11-24): no code and no requirement reads it; no sandbox row. Zeke's call 4 (DEFERRED used beyond NM / VA). |
| OBJ-037 | DEFERRED | — | — | — | — | — | DEFERRED | DEFERRED (optional, master section 8, 2026-11-24): no code and no requirement reads it; no sandbox row. Zeke's call 4 (DEFERRED used beyond NM / VA). |
| API-001 | PROVEN-LIVE | not state-dependent: SU-3 | — | — | R1-1, R1c-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Own sandbox token on every call; signing secret checked on every webhook run. |
| API-002 | OFFLINE-ONLY | — | — | — | — | — | PRODUCTION-ONLY | Cutover master 6.3 item 1 (production token, webhook secret); offline `f3HubSpotPortalCheck.test.mjs:125`. |
| API-003 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage2PortalAndRetries.test.mjs:1517` (429 / Retry-After); a live 429 needs >190 requests in 10 s. |
| API-004 | PROVEN-LIVE | C2 (R1), R1F-1 | C2 (R2), R2-1 | C2 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Missing-key half offline (T-LD:771; master K11). |
| API-005 | PROVEN-LIVE | C2 (R1), R1F-1 | C2 (R2), R2-1 | C2 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | As API-004. |
| API-006 | PROVEN-LIVE | C4 (R1), R1F-1 | C4 (R2), R2-1 | C4 (R3), R3-1, U2-6 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | R3 gender blank on both sides (U2-6). |
| API-007 | PROVEN-LIVE | C3 (R1), R1F-1 | C3 (R2), R2-1, R2-30 | C3 (R3), R3-1 | R1-1, R1c-1, R2-1, R2-30, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | R2-30: blank DOB on create is `error`. |
| API-008 | PROVEN-LIVE | C29 (R1), R1F-1 | C29 (R2), R2-1 | C29 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | As API-004. |
| API-009 | PROVEN-LIVE | C30 (R1), R1F-1 | C30 (R2), R2-1 | C30 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | R3 blank ID stays blank. |
| API-010 | PROVEN-LIVE | C35 (R1), R1F-1 | C35 (R2), R2-1 | C35 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | As API-004. |
| API-011 | PROVEN-LIVE | C33 (R1), R1F-1 | C33 (R2), R2-1 | C33 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | As API-004. |
| API-012 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Sandbox has no sensitive tier (L776). Cutover check (run-sheet change AB-20, for master 4.10): production private app scopes include `crm.objects.deals.sensitive.read`; the first production Case run reads `phi_*` without `HUBSPOT_PROPERTY_MISSING`. |
| API-013 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42, R1-1, R1c-1, R3b-1 | U-42, R3-1, R1b-1, R2b-1 | COVERED | U-42 property history: only write-list properties change; offline `stageP1PropertyLists.test.mjs`. |
| API-014 | PROVEN-LIVE | CL3 (R1), R1F-1 | CL3 (R2), R2-1, R2-11 | CL3 (R3), R3-1 | R2-11, U-17 | R3-1, U-16, R1b-1, R2b-1 | COVERED | Stored `Warm` / `Cold` drive Active / In-Active. |
| API-015 | PROVEN-LIVE | BR1 (R1), R1-1 | R2-18, R2-1 | R3-1 | R1-1, R1c-1, R2-1, R2-18, R3b-1 | R3-1, U-20, R1b-1, R2b-1 | COVERED | Create gate reads the stored `Yes` token; R3-1 "Yes; Insurance Card(s)" by poll. |
| API-016 | RETIRED | — | — | — | — | — | RETIRED | Guide L419: label fields replace credentialing statuses; `ny_medicaid__status` is not read. |
| API-017 | PROVEN-LIVE | BR1 (R1), R1-3 | R2-3, G-1 | R3-6 | R1-3, R1c-3, R2-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | BT/RBT create gate reads stored `Yes`. |
| API-018 | PLANNED | not state-dependent: BL4 (R3), R3-3 | — | — | R3-13c | R3-3, R1b-2, R2b-2 | COVERED | Only R3's BCBA holds `No`: no LBA NY label. |
| API-019 | PLANNED | C26 (R1), R1F-1 | C26 (R2), R2-1 | R3-17 | R2-1, R3-17, R3b-1 | U-05, R3-13b | COVERED | Item 3 un-held: build pending (C26 re-prove, R3-17). |
| API-020 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42, R1-1, R1c-1, R3b-1 | U-42, R3-1, R1b-1, R2b-1 | COVERED | A write to `location` would fail the whole writeback; every writeback succeeds and U-42 shows no change. |
| API-021 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42, R1-1, R1c-1, R3b-1 | U-42, R3-1, R1b-1, R2b-1 | COVERED | As API-020. |
| API-022 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42, R1-1, R1c-1, R3b-1 | U-42, R3-1, R1b-1, R2b-1 | COVERED | As API-020. |
| API-023 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42, R1-1, R1c-1, R3b-1 | U-42, R3-1, R1b-1, R2b-1 | COVERED | As API-020. |
| API-024 | OFFLINE-ONLY | not state-dependent: U-42, C36 | — | — | U-42, R2-17 | U-42, R3-18 | COVERED | Read for C36 (R2-17, R3-18 build pending), never written. |
| API-025 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42, R1-1, R1c-1, R3b-1 | U-42, R3-1, R1b-1, R2b-1 | COVERED | As API-020. |
| API-026 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42, R1-2, R1c-2, R3b-2 | U-42, R3-3, R1b-2, R2b-2 | COVERED | BCBA mirrors read, never in the writeback. |
| API-027 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42, R1-3, R1c-3, R3b-3 | U-42, R3-6, R1b-3, R2b-3 | COVERED | BT/RBT mirrors read, never in the writeback. |
| API-028 | PROVEN-LIVE | C11, C14 (R1), R1F-1 | C11, C14 (R2), R2-1, R2-8 | C11, C14 (R3), R3-1 | R1-1, R1c-1, R2-1, U-06, R3b-1 | R3-1, U-07, R1b-1, R2b-1 | COVERED | Staffing read from v4 associations; re-prove on items 9/10 code (R1F-1). |
| API-029 | RETIRED | — | — | — | — | — | RETIRED | Decision 39 and item 6 (package L289, L303): coordinator fields replace the owners API. |
| API-030 | PROVEN-LIVE | C23 (R1), R1F-1 | C23 (R2), R2-1 | C23 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Misspelled end-date name read. |
| API-031 | PROVEN-LIVE | C23 (R1), R1F-1 | C23 (R2), R2-1 | C23 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | `_f` decoys set (matrix Exclusions); 134672 unchanged by them. |
| API-032 | PROVEN-LIVE | C23, C34, C35 (R1), R1F-1 | C23, C34, C35 (R2), R2-1 | C23, C34, C35 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Dates read as `YYYY-MM-DD`. |
| API-033 | PLANNED | not state-dependent: S8-3 | — | — | S8-3 | U-43 | BLOCKED | BLOCKED (S8-3 forced-failure method, run-sheet open question 3; email receiver S9, Azure write; Zeke). Then S8-3: BT/RBT, S10, webhook start: retries 60 s / 150-300 s / 15 min / 1 h / 4 h, dead-letter, one email with no child name and no values. |
| API-034 | PROVEN-LIVE | not state-dependent: SU-4 | — | — | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Every writeback succeeds only if each written property exists; U-42 lists them. |
| API-035 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage4and5PropertyLists.test.mjs`: archived fields never requested; nothing to observe live. |
| STF-001 | MISSING-TEST | not state-dependent: U-10 | — | — | X01-2 (247 leg, S7) | U-10, U-15 | COVERED | X01-2's 247 leg moved to S7 (Case workflow on): R1 BCBA re-added as Supervising 247 → first run `hubspotWorkflow`, Meta 131308 "Zeke Swanson BCBA Azure Test R1 BCBA LBA" (run-sheet change AB-12 applied). Association-only by poll / sweep (U-10, U-15). |
| STF-002 | MISSING-TEST | not state-dependent: BR17 | — | — | X01-2 | U-43 | COVERED | BR17 relabel IA → RE (in U-43) changes `ia_bcba_name`. Webhook legs (BR17 relabel, BT 2 removal, C11 RE removal) run in S5e / S5f with the Case workflow ON (run-sheet change AB-8 applied). |
| STF-003 | MISSING-TEST | not state-dependent: BR17 | — | — | X01-2 | U-43 | COVERED | Same relabel changes `reassessment_bcba_name`. Webhook legs (BR17 relabel, BT 2 removal, C11 RE removal) run in S5e / S5f with the Case workflow ON (run-sheet change AB-8 applied). |
| STF-004 | MISSING-TEST | not state-dependent: U-06 | — | — | U-06 | U-07 | COVERED | U-06: Primary BT change moves `current_primary_bt`, Deal webhook. |
| STF-005 | MISSING-TEST | not state-dependent: BR17 | — | — | X01-2 | U-43 | COVERED | BR17 BT 2 removal; source recorded in X01-2. Webhook legs (BR17 relabel, BT 2 removal, C11 RE removal) run in S5e / S5f with the Case workflow ON (run-sheet change AB-8 applied). |
| STF-006 | RETIRED | — | — | — | — | — | RETIRED | Retired (slice 01; BP 4.14, d51, P35): staffing names come from the associations; no `current_primary_bt` workflow. U-06 still proves a Primary BT label change reaches 131313. |
| STF-007 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage2PortalAndRetries.test.mjs:351`; production path differs only by type ID (cutover 6.3 item 2). |
| STF-008 | PROVEN-LIVE | C11, C14 (R1), R1F-1 | C11, C14 (R2), R2-1 | C11, C14 (R3), R3-1 | R1-1, R1c-1, R2-1, U-06, R3b-1 | R3-1, U-07, R1b-1, R2b-1 | COVERED | Sandbox v4 association reads on every Case run. |
| STF-009 | PROVEN-LIVE | C16 (R1), R1F-1 | C16 (R2), R2-8 | C16 (R3), R3-1 | R1-1, R1c-1, R2-8, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Unlabeled 164 / 187 present and ignored; HUBSPOT_DEFINED twin offline (T-LD:115). |
| STF-010 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 82: T-PORTAL; `stage7GradPermitRoles.test.mjs:101`. |
| STF-011 | PLANNED | R1F-2 | R2-4 | R3-10 | R1F-2, R2-6 | R2-4, R3-10 | COVERED | Each round links its BCBA as 247. |
| STF-012 | RETIRED | — | — | — | — | — | RETIRED | Retired (slice 01): the L512 typed-text rule is replaced by item 9 (247 first, " BCBA LBA"); the new rule is proven by R1F-2, R2-4, R3-10 (STF-013 / CASE-080 lines). |
| STF-013 | NOT-BUILT | not state-dependent: U-14 | — | — | X01-2 | U-14, U-14b, U-14c | COVERED | U-14c blank supplier: build pending. Supplier-edit webhook source in X01-2. |
| STF-014 | NOT-BUILT | not state-dependent: R2-6 | — | — | R2-6 | R2-5 | COVERED | R2's 247 BCBA is the Grad Permit holder. |
| STF-015 | NOT-BUILT | C13 (R1), R1F-2 | C13 (R2), R2-5 | C13 (R3), R3-10 | R1F-2, R2-1, R3b-1 | R2-5, R2-7 | COVERED | 136052 blank R1 / R3, holder in R2, cleared by R2-7. |
| STF-016 | NOT-BUILT | not state-dependent: R2-5 | — | — | path n/a: the 227 link is BCBA-side and starts no Case webhook (package rule 6) | R2-5 | COVERED | Holder's own name never sent. |
| STF-017 | NOT-BUILT | not state-dependent: R2-6 | — | — | R2-6 | R2-23b | COVERED | R2-23b polls the CO Case before the 227 link (R2-5), so 131308 stays out. |
| STF-018 | NOT-BUILT | — | — | — | — | — | OFFLINE-ONLY | Zeke 2026-11-24 rule 7: sandbox allows one 247 per Case; `stage7GradPermitRoles.test.mjs` (rule 7 test, build pending). |
| STF-019 | NOT-BUILT | not state-dependent: R2-7 | — | — | path n/a: a BCBA-only change starts no Case sync (the rule itself) | R2-7, R2-4 | COVERED | Licence → Yes clears 136052, sends the BCBA's own name. |
| STF-020 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 86: T-PORTAL; T-LD "[C11][4.14] staffRecordIdsByRole reads the portal's role IDs for a BCBA role and a BT/RBT role, in record-ID order" and "[C11][4.14] the IA and RE BCBA names are read from the Case's BCBA associations by role and sent to fields 131314 and 144602". [apply-recheck] Re-check: test titles replace the drifted line number. |
| STF-021 | PROVEN-LIVE | C11 (R1), R1F-1 | C11 (R2), R2-1 | C11 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, U-43, R1b-1, R2b-1 | COVERED | Sandbox IA 223 on every round. |
| STF-022 | PROVEN-LIVE | C11 (R1), R1F-1 | C11 (R2), R2-1, R2-8 | C11 (R3), R3-1 | R1-1, R1c-1, R2-8, X01-2, R3b-1 | R3-1, U-43, R1b-1, R2b-1 | COVERED | 131314 from IA; BR17 relabel in U-43. |
| STF-023 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 145: T-PORTAL; T-LD:66. |
| STF-024 | PROVEN-LIVE | C11 (R1), R1F-1 | C11 (R2), R2-1 | C11 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, U-43, R1b-1, R2b-1 | COVERED | Sandbox RE 229 on every round (BCBA 2). |
| STF-025 | PLANNED | C11 (R1), R1F-1 | C11 (R2), R2-1 | C11 (R3), R3-1 | R1-1, R1c-1, X01-2, R3b-1 | R3-1, U-43, R1b-1, R2b-1 | COVERED | C11 RE removal blanks 144602; BR17 relabel back blanks it too (U-43). Webhook legs (BR17 relabel, BT 2 removal, C11 RE removal) run in S5e / S5f with the Case workflow ON (run-sheet change AB-8 applied). |
| STF-026 | NOT-BUILT | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 234: T-PORTAL; `stage7GradPermitRoles.test.mjs:101`. |
| STF-027 | NOT-BUILT | not state-dependent: U-12 | — | — | path n/a: 217 has no change signal (STF-083, question 12) | U-12 | COVERED | SUB 217 + On Leave 233, no 247 → SUB name. |
| STF-028 | NOT-BUILT | not state-dependent: U-12 | — | — | path n/a: 217 has no change signal (STF-083, question 12) | U-12 | COVERED | SUB covers the on-leave case; item 10 confirmed. |
| STF-029 | NOT-BUILT | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 236: T-PORTAL. |
| STF-030 | NOT-BUILT | not state-dependent: U-12 | — | — | path n/a: 233 has no change signal (STF-083) | U-12 | COVERED | Sandbox On Leave 233 used in U-12. |
| STF-031 | OFFLINE-ONLY | not state-dependent: U-12 | — | — | path n/a: 233 has no change signal (STF-083) | U-12 | COVERED | U-12 now proves "On Leave never" live; offline T-GP:160. |
| STF-032 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Cross-portal collision: T-PORTAL (`stage2PortalAndRetries.test.mjs:247`), gap b4; sandbox half seen in U-13. |
| STF-033 | NOT-BUILT | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 135: T-PORTAL; `stage7GradPermitRoles.test.mjs:101`. |
| STF-034 | NOT-BUILT | not state-dependent: U-10 | — | — | path n/a: 253 has no change signal (STF-083) | U-10 | COVERED | Sandbox Outgoing Supervising 253. |
| STF-035 | NOT-BUILT | not state-dependent: U-10 | — | — | path n/a: 253 has no change signal (STF-083) | U-10 | COVERED | Item 10 confirmed: 253 feeds 131308 only when no 247 / 217 / 221. |
| STF-036 | NOT-BUILT | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 288: T-PORTAL; `stage7GradPermitRoles.test.mjs:392`. |
| STF-037 | NOT-BUILT | not state-dependent: U-11 | — | — | path n/a: 221 has no change signal (STF-083) | U-11 | COVERED | Sandbox Outgoing SUB 221; removal changes 131308 in one run. |
| STF-038 | NOT-BUILT | not state-dependent: U-11 | — | — | path n/a: 221 has no change signal (STF-083) | U-11, U-12 | COVERED | 221 alone feeds 131308; 217-over-221 order also offline T-GP:101. |
| STF-039 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 286: T-PORTAL (`stage2PortalAndRetries.test.mjs:247`). |
| STF-040 | OFFLINE-ONLY | not state-dependent: R2-8 | — | — | R2-8 | R2-23b | COVERED | R2-8 now adds Previous IA 235 → no field change. |
| STF-041 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 80: T-PORTAL. |
| STF-042 | PROVEN-LIVE | C16 (R1), R1F-1 | C16 (R2), R2-8 | C16 (R3), R3-1 | R1-1, R1c-1, R2-8, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Potential Supervising 249 on BCBA 2 every round. |
| STF-043 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 153: T-PORTAL. |
| STF-044 | PROVEN-LIVE | C16 (R1), R1F-1 | C16 (R2), R2-8 | C16 (R3), R3-1 | R1-1, R1c-1, R2-8, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Potential IA 251 every round. |
| STF-045 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 20: `stage2PortalAndRetries.test.mjs:332`. |
| STF-046 | PROVEN-LIVE | C16 (R1), R1F-1 | C16 (R2), R2-8 | C16 (R3), R3-1 | R1-1, R1c-1, R2-8, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | 164 present on every labelled BCBA link (sandbox read 2026-11-24). |
| STF-047 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 76: T-PORTAL; T-LD:83. |
| STF-048 | PROVEN-LIVE | C14 (R1), R1F-1 | C14 (R2), R2-1 | C14 (R3), R3-1 | R1-1, R1c-1, R2-1, U-06, R3b-1 | R3-1, U-43, R1b-1, R2b-1 | COVERED | Sandbox Primary BT 1 238 every round. |
| STF-049 | PROVEN-LIVE | C14 (R1), R1F-1 | C14 (R2), R2-1, R2-8 | C14 (R3), R3-1 | R1-1, R1c-1, R2-1, U-06, R3b-1 | R3-1, U-43, R1b-1, R2b-1 | COVERED | 131313; BR17 swap in U-43. |
| STF-050 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 143: T-PORTAL; T-LD:83. |
| STF-051 | PROVEN-LIVE | C14 (R1), R1F-1 | C14 (R2), R2-1 | C14 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, U-43, R1b-1, R2b-1 | COVERED | Sandbox Primary BT 2 240 every round. |
| STF-052 | PLANNED | C14 (R1), R1F-1 | C14 (R2), R2-1 | C14 (R3), R3-1 | R1-1, R1c-1, R2-1, X01-2, R3b-1 | R3-1, U-43, R1b-1, R2b-1 | COVERED | BR17 BT 2 removal blanks 138092. Webhook legs (BR17 relabel, BT 2 removal, C11 RE removal) run in S5e / S5f with the Case workflow ON (run-sheet change AB-8 applied). |
| STF-053 | OFFLINE-ONLY | not state-dependent: U-13 | — | — | path n/a: 236 has no change signal (STF-083) | U-13 | COVERED | U-13 now proves the ", " record-ID join live; offline T-LD:99. |
| STF-054 | DEFERRED | — | — | — | — | — | DEFERRED | DEFERRED (optional, master section 8, 2026-11-24): no code and no requirement reads it; no sandbox row. Zeke's call 4 (DEFERRED used beyond NM / VA). |
| STF-055 | PROVEN-LIVE | C14 (R1), R1F-1 | C14 (R2), R2-1 | C14 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | 239 is created with 238; the integration reads the Case side. |
| STF-056 | DEFERRED | — | — | — | — | — | DEFERRED | DEFERRED (optional, master section 8, 2026-11-24): no code and no requirement reads it; no sandbox row. Zeke's call 4 (DEFERRED used beyond NM / VA). |
| STF-057 | PROVEN-LIVE | C14 (R1), R1F-1 | C14 (R2), R2-1 | C14 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | 241 is created with 240. |
| STF-058 | NOT-BUILT | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 131: T-PORTAL; `stage7GradPermitRoles.test.mjs:61`. |
| STF-059 | NOT-BUILT | not state-dependent: U-07 | — | — | path n/a: 244 has no change signal (STF-083) | U-07, U-09 | COVERED | Sandbox Outgoing BT 1 244. |
| STF-060 | NOT-BUILT | not state-dependent: U-07 | — | — | path n/a: 244 has no change signal (STF-083) | U-07, U-09 | COVERED | Item 10 confirmed: the label is the signal, no removal-date logic. |
| STF-061 | NOT-BUILT | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 166: T-PORTAL. |
| STF-062 | NOT-BUILT | not state-dependent: U-08 | — | — | path n/a: 236 has no change signal (STF-083) | U-08, U-13 | COVERED | Sandbox Outgoing BT 2 236. |
| STF-063 | NOT-BUILT | not state-dependent: U-08 | — | — | path n/a: 236 has no change signal (STF-083) | U-08, U-13 | COVERED | 236 joins 138092 while the label is on. |
| STF-064 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 74: T-PORTAL. |
| STF-065 | PROVEN-LIVE | C16 (R1), R1F-1 | C16 (R2), R2-8 | C16 (R3), R3-1 | R1-1, R1c-1, R2-8, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Potential BT 1 242 every round. |
| STF-066 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 164 (Potential BT 2): T-PORTAL. |
| STF-067 | OFFLINE-ONLY | not state-dependent: R2-8 | — | — | R2-8 | R2-23b | COVERED | R2-8 now adds Potential BT 2 218 → no field change. |
| STF-068 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 64: T-PORTAL. |
| STF-069 | PROVEN-LIVE | C16 (R1), R1F-1 | C16 (R2), R2-8 | C16 (R3), R3-1 | R1-1, R1c-1, R2-8, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | 187 present and ignored (sandbox read 2026-11-24). |
| STF-070 | NOT-BUILT | — | — | — | — | — | OFFLINE-ONLY | Production-only ID 151: T-PORTAL; `stage7GradPermitRoles.test.mjs:280`. |
| STF-071 | NOT-BUILT | not state-dependent: R2-5 | — | — | path n/a: BCBA-side link starts no Case webhook (package rule 6) | R2-5 | COVERED | R2-5 records whether the holder side lists 227 or 226. |
| STF-072 | DEFERRED | — | — | — | — | — | DEFERRED | DEFERRED (optional, master section 8, 2026-11-24): no code and no requirement reads it; no sandbox row. Zeke's call 4 (DEFERRED used beyond NM / VA). |
| STF-073 | DEFERRED | — | — | — | — | — | DEFERRED | DEFERRED (optional, master section 8, 2026-11-24): no code and no requirement reads it; no sandbox row. Zeke's call 4 (DEFERRED used beyond NM / VA). |
| STF-074 | RETIRED | — | — | — | — | — | RETIRED | Decisions 42 and 50 (BUILD-PLAN B9): the BCBA's own `personal_email`; no Contact read. |
| STF-075 | RETIRED | — | — | — | — | — | RETIRED | Decisions 42 and 50; 191 kept in the sandbox only to fill mirrors. |
| STF-076 | OFFLINE-ONLY | K1, U-04 | R2-23g | R3-13g, R3-20 | U-04, R2-23g, R3-13g | GS-1 | COVERED | Type 3 Deal–Contact is the HubSpot property-sync input: the Case Guardian sync properties follow the associated Guardian Contact; proven on the Case path (K1, GS-1). [pending Zeke: Contact workflow confirmation] |
| STF-077 | PLANNED | R1-1, K1 | R2-1, R2-23g | R3-1, R3-13g | U-04, R2-23g, R3-13g | GS-1, R3-1 | COVERED | Guardian path (recency audit section C): edit the Guardian Contact field; the Case sync property changes; the Case workflow sends the webhook (proven by arrival, record-timeline) or the poll queues the Case (GS-1); CR shows the new value. Arrival only by `intakePoller` while the Case workflow is on = a trigger-list gap for Zeke. [pending Zeke: Contact workflow confirmation] |
| STF-078 | MISSING-TEST | not state-dependent: X02-5 | — | — | X02-5 (Case path) | X02-5 | COVERED | Decided by d24: only the first Parent/Guardian is synced to the Case; X02-5 (NJ, path both). [pending Zeke: Contact workflow confirmation] |
| STF-079 | DEFERRED | — | — | — | — | — | DEFERRED | DEFERRED (optional, master section 8, 2026-11-24): no code and no requirement reads it; no sandbox row. Zeke's call 4 (DEFERRED used beyond NM / VA). |
| STF-080 | PLANNED | not state-dependent: BR17 | — | — | U-06, X01-2 | U-43 | COVERED | BR17 swap and removal compare record ID and role. |
| STF-081 | PLANNED | not state-dependent: BR17 | — | — | X01-2 | U-43 | COVERED | BR17 relabel 223 → 229 and back. Webhook legs (BR17 relabel, BT 2 removal, C11 RE removal) run in S5e / S5f with the Case workflow ON (run-sheet change AB-8 applied). |
| STF-082 | PLANNED | not state-dependent: U-15 | — | — | path n/a: no user edit, so no webhook (BR18 runs with the workflow off) | U-43, U-15 | COVERED | BR18 via poll (U-43), sweep U-15. |
| STF-083 | MISSING-TEST | not state-dependent: U-15 | — | — | U-06, X01-2 | U-10, U-15 | COVERED | Item 10 roles reach CR by poll / sweep; U-15 records the delay (question 12). |
| STF-084 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a refused read: T-LD:173 (`laneDCaseReads.test.mjs`); `stage7GradPermitRoles.test.mjs:334`. |
| STF-085 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage7GradPermitRoles.test.mjs:392`; seen once on D (R1LOG L134). |
| SBX-001 | PROVEN-LIVE | not state-dependent: R2-12 | — | — | R1-1, R1c-1, R2-12, R3b-1 | R2-12, U-28 | COVERED | Sandbox pipeline and stage IDs used by R2-12, U-28, U-35. |
| SBX-002 | MISSING-TEST | — | — | — | — | — | PRODUCTION-ONLY | Cutover master 4.10: first production run per object type routes correctly (BT-156); limits (SBX-004). Definitions matched 2026-11-24. |
| SBX-003 | PROVEN-LIVE | not state-dependent: U-12 | — | — | path n/a: 217 / 233 have no change signal (STF-083) | U-12 | COVERED | Code matches by ID; U-12 uses SUB 217 and On Leave 233. |
| WF-001 | RETIRED | — | — | — | — | — | RETIRED | Guide L1310 (11/16): sandbox moved to 52311591; 50850427 retired. |
| WF-002 | RETIRED | — | — | — | — | — | RETIRED | Guide L1310: old sandbox object types retired with 50850427. |
| WF-003 | PLANNED | U-01 | R2-23a | R3-13a | U-01, U-06, U-19 | path n/a: HubSpot workflow (webhook sender); the poll is its fallback (U-05) | COVERED | Mapped-field, staffing-signal and stage webhooks; first-run `source` recorded. |
| WF-004 | PLANNED | U-02 | R2-23e | R3-13e | U-02, R2-23e, R3-13e | path n/a: HubSpot workflow (webhook sender); poll fallback U-36 | COVERED | BT/RBT refresh webhook per state. |
| WF-005 | PLANNED | U-03 | R2-23c | R3-13c | U-03, R2-23c, R3-13c | path n/a: HubSpot workflow (webhook sender); poll fallback U-23 | COVERED | BCBA refresh webhook per state. |
| WF-006 | PROVEN-LIVE | not state-dependent: R1-1, R2-1 | — | — | R1-1, R1c-1, R2-1, R3b-1 | path n/a: HubSpot entry workflow; poll create is R3-1 | COVERED | Fires on Entered Client in CR. |
| WF-007 | PROVEN-LIVE | not state-dependent: R1-3, R2-3 | — | — | R1-3, R1c-3, R2-3, R3b-3 | path n/a: HubSpot entry workflow; poll create is R3-6 | COVERED | BT/RBT entry workflow. |
| WF-008 | PROVEN-LIVE | not state-dependent: R1-2, R2-2 | — | — | R1-2, R1c-2, R2-2, R3b-2 | path n/a: HubSpot entry workflow; poll create is R3-3 | COVERED | BCBA entry workflow. |
| WF-009 | PLANNED | not state-dependent: U-21 | — | — | U-01, U-21, R1F-1 | path n/a: HubSpot enrolment setting | COVERED | Repeated webhooks on one record prove re-enrolment; manual enrolment is a setting (decision 51). |
| WF-010 | PLANNED | not state-dependent: X01-3 (C23 clear) | — | — | X01-3 | path n/a: HubSpot trigger setting; blanks also arrive by poll (U2-1) | COVERED | C23 start-date clear by webhook (X01-3, S4). The X01-3 BCBA leg is dropped (wrong workflow, date already blank; run-sheet change AB-13). |
| WF-011 | PROVEN-LIVE | not state-dependent: SU-5 | — | — | U-01 | U-05 | COVERED | Every row checks the run's `source` and outcome in App Insights. |
| API-036 | OFFLINE-ONLY | — | — | — | — | — | PRODUCTION-ONLY | Cutover master 6.3 item 1 (production app); code makes no pipeline, schema or owners call, so no extra scope. |
| SBX-004 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Cutover master 4.10: production association limits; sandbox limits read 2026-11-24. |
| STF-086 | NOT-BUILT | not state-dependent: U-07 | — | — | path n/a: item 10 roles have no change signal (STF-083) | U-07, U-08, U-10, U-11, U-12, U-13 | COVERED | Zeke 2026-11-24 confirmed item 10 rules (U-07..U-13). |
| STF-087 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Cutover master 4.10: production Case workflow triggers on the five staffing signals. |

## Slice 02: Case / client (02-case-client.md)

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| CASE-001 | PLANNED | not state-dependent: R2-30 | — | — | R2-30 | R3-1, R1b-1, R2b-1 | COVERED | Pre-create check, path-independent; blank-name leg is X02-1 |
| CASE-002 | PLANNED | not state-dependent: C1 | — | — | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | C1 Log crCalls + Screen on each create |
| CASE-003 | PLANNED | — | — | — | — | — | OFFLINE-ONLY | Matrix Offline table (K4): request bodies not logged; `laneLClientCreatePath.test.mjs` :91, :157 |
| CASE-004 | PROVEN-LIVE | not state-dependent: C5 | — | — | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Create-only rule |
| CASE-005 | PLANNED | — | — | — | — | — | OFFLINE-ONLY | Matrix Offline table (K4): request bodies not logged; `laneLClientCreatePath.test.mjs` :91, :157 |
| CASE-006 | PROVEN-LIVE | C6 (R1), R1F-1 | C6 (R2), R2-1 | C6 (R3), R3-20 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Email change by Guardian is CASE-049 / CASE-179 |
| CASE-007 | PROVEN-LIVE | C2 (R1), R1F-1 | C2 (R2), R2-1 | C2 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | C2 per round |
| CASE-008 | PROVEN-LIVE | C2 (R1), R1F-1 | C2 (R2), R2-1 | C2 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | C2 per round; U1 change is CASE-043 |
| CASE-009 | PLANNED | not state-dependent: X02-1, X02-2 | — | — | X02-1 | X02-2 | COVERED | No existing row ("made by hand" has no ID): proposed X02-1 (create), X02-2 (update) |
| CASE-010 | PROVEN-LIVE | C3 (R1), R1F-1 | C3 (R2), R2-1 | C3 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | U1 change is CASE-046 |
| CASE-011 | PLANNED | not state-dependent: R2-30 | — | — | R2-30 | R3-1, R1b-1, R2b-1 | COVERED | Pre-create check path-independent; R2-30 hand Case, no DOB |
| CASE-012 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | B21 `stage3BlankCoreFieldsClient.test.mjs`; R1-U2 never blanks the Case DOB (required field, M L327) |
| CASE-013 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage1CreateIdentity.test.mjs`:734; unreadable values offline (decisions 43, 48) |
| CASE-014 | PLANNED | B1, T1 (R1), R1-2, R1-3 | B1 (R2-25), T1 (R2-26), R2-2, R2-3 | T1 (R3-6), R3-3 | R1-2, R1c-2, R1-3, R1c-3, R2-2, R2-3, R3b-2, R3b-3 | R3-3, R3-6, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Create-only; cross-slice 03/04 |
| CASE-015 | PROVEN-LIVE | B2, T2 (R1), R1-2, R1-3, R4-1 | R2-2, R2-3 | R3-3, R3-6 | R1-2, R1c-2, R4-1, R2-2, R2-3, R3b-2, R3b-3 | R3-3, R3-6, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Workday ID leg R4-1 / R2-2; temporary ID R1-2, R3-3 |
| CASE-016 | PROVEN-LIVE | B3, T2 (R1), R1-2, R1-3 | B3, T2 (R2), R2-2, R2-3 | B3, T2 (R3), R3-3, R3-6 | R1-2, R1c-2, R1-3, R1c-3, R2-2, R2-3; U-03, U-02, R3b-2, R3b-3 | R3-3, R3-6; U-23, U-36, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Cross-slice 03/04 |
| CASE-017 | PROVEN-LIVE | B3, T2 (R1), R1-2, R1-3 | B3, T2 (R2), R2-2, R2-3 | B3, T2 (R3), R3-3, R3-6 | R1-2, R1c-2, R1-3, R1c-3, R2-2, R2-3; U-03, U-02, R3b-2, R3b-3 | R3-3, R3-6; U-23, U-36, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Cross-slice 03/04 |
| CASE-018 | PLANNED | B4, T2 (R1), R1-2, R1-3 | B4, T2 (R2), R2-2, R2-3 | B4, T2 (R3), R3-3, R3-6, R3-5 | R1-2, R1c-2, R1-3, R1c-3, R2-2, R2-3; U-03, U-02, R3b-2, R3b-3 | R3-3, R3-6, R3-5; U-23, U-36, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Changed email B4/T2 U1; blank email on create R3-5; cross-slice |
| CASE-019 | PLANNED | R1F-3, U2-4, U2-5 | B5 (R2), R2-2 | R3-3, R3-6, R3-9 | R1-2, R1c-2, R2-2; U-03, R3b-2 | R3-3, R3-6; U2-4, U2-5, R3-9, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Q27 decided (a): placeholder on create only (R3-3/R3-6); blank update keeps CR's date |
| CASE-020 | PROVEN-LIVE | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Sandbox Deal object; production IDs checked at cutover (master 4.10) |
| CASE-021 | PROVEN-LIVE | BR1 (R1), R1-1 | R2-1 | R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | NY "Yes", CO `CDE;Yes`, NJ "Yes; Insurance Card(s)" |
| CASE-022 | OFFLINE-ONLY | not state-dependent: R2-18, SU-5 | — | — | R2-1, R2-18, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Token "Yes" with other options R2-18 / R3-1; not-Yes skip SU-5 |
| CASE-023 | PLANNED | not state-dependent: U-18, U-20 | — | — | U-18 | U-18, U-20 | COVERED | Linked Case syncs with Entered blank (U-18) or other options only (U-20) |
| CASE-024 | OFFLINE-ONLY | not state-dependent: U-01, U-18, U-20 | — | — | U-01, U-18 | U-18, U-20 | COVERED | Yes U-01; blank U-18; "No" leg (other options only) U-20 |
| CASE-025 | PENDING | — | — | — | — | — | PHASE-TWO | 475 existing linked Cases; Zeke two-phase ruling (D3, D19) |
| CASE-026 | PROVEN-LIVE | BR13, C5 (R1), R1-1 | BR13 (R2), R2-1 | BR13 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Written after create; link-by-lookup leg offline (CASE-203) |
| CASE-027 | PLANNED | SU-4, R1-1 | BR13 (R2), R2-1 | BR13 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | SU-4 reads `central_reach_link_to_client` back |
| CASE-028 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage3NoOp.test.mjs`:130; `stage3WorkerReviewFixes`:405 |
| CASE-029 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage3CrIdDigits.test.mjs` |
| CASE-030 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Matrix Offline table (O-57): `laneDCaseReads.test.mjs`:655 |
| CASE-031 | PLANNED | not state-dependent: R2-9, U-01 | — | — | R2-9, U-01 | U-05 | COVERED | Mismatch leg R2-9; same-ID lookup → update on every linked run; path-independent |
| CASE-032 | PENDING | — | — | — | — | — | PHASE-TWO | Existing production Client IDs (81/100 not found); linked existing Cases are phase two |
| CASE-033 | PROVEN-LIVE | not state-dependent: BR9 | — | — | R1-1, R1c-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Every run |
| CASE-034 | PLANNED | not state-dependent: BR21, U-43 | — | — | R2-30, U-43 | U-43 | COVERED | Error text names fields; U-43 BR21 exact-value scan |
| CASE-035 | PLANNED | not state-dependent: BR13, U-42 | — | — | R1-1, R1c-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Every status writeback |
| CASE-036 | PROVEN-LIVE | not state-dependent: BR13, BR15 | — | — | R1-1, R1c-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | 24-hour report reads it (BR15) |
| CASE-037 | PLANNED | not state-dependent: BR13, U-42 | — | — | R1-1, R1c-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Case Yes/No checkbox |
| CASE-038 | PLANNED | not state-dependent: BR13 | — | — | R1-1, R1c-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Written after success |
| CASE-039 | PROVEN-LIVE | not state-dependent: BR14, R1F-1 | — | — | R1F-1, U-43 | U-43 | COVERED | R1F-1 next run `noop`; U-43 webhook + poll at once |
| CASE-040 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `checkTriggers.test.mjs`:53, :69; trigger lists are Zeke's (decision 51) |
| CASE-041 | PLANNED | not state-dependent: BR13, U-42 | — | — | R1-1, R1c-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | U-42 property history shows only write-list properties |
| CASE-042 | PROVEN-LIVE | C2 (R1), R1F-1 | C2 (R2), R2-1 | C2 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | `dealname` decoy in Exclusions |
| CASE-043 | PLANNED | C2 (R1-U1), U-01 | R2-23a | R3-13a | U-01, R2-23a, R3-13a | U-05, R2-23b, R3-13b | COVERED | Update rule; C2 U1 last name + " U1" |
| CASE-044 | PROVEN-LIVE | C4 (R1), R1F-1 | C4 (R2), R2-1 | C4 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | R1 male, R2 female, R3 blank → no gender |
| CASE-045 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `f1UnreadableValues.test.mjs`:206, :235 (decisions 43, 48) |
| CASE-046 | PLANNED | C3 (R1-U1), U-01 | R2-23a | R3-13a | U-01, R2-23a, R3-13a | U-05, R2-23b, R3-13b | COVERED | C3 U1 2016-01-16 |
| CASE-047 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Sandbox has no sensitive tier (L776). Cutover check (run-sheet change AB-20, for master 4.10): production private app scopes include `crm.objects.deals.sensitive.read`; the first production Case run reads `phi_*` without `HUBSPOT_PROPERTY_MISSING`. |
| CASE-048 | PROVEN-LIVE | C6 (R1), R1F-1 | C6 (R2), R2-1 | C6 (R3), R3-20 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Case sync property `email` |
| CASE-049 | PLANNED | K1, U-04 | R2-23g | R3-13g, R3-20 | U-04, R2-23g, R3-13g | GS-1, U-48 | COVERED | K1 (email) by both paths. Guardian path (recency audit section C): edit the Guardian Contact field; the Case sync property changes; the Case workflow sends the webhook (proven by arrival, record-timeline) or the poll queues the Case (GS-1); CR shows the new value. Arrival only by `intakePoller` while the Case workflow is on = a trigger-list gap for Zeke. [pending Zeke: Contact workflow confirmation] |
| CASE-050 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `f1UnreadableValues.test.mjs`:177 (decision 43) |
| CASE-051 | PROVEN-LIVE | C7 (R1), R1F-1 | C7 (R2), R2-1 | C7 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Change via Guardian is CASE-177 |
| CASE-052 | PROVEN-LIVE | C7 (R1), R1F-1 | C7 (R2), R2-1 | C7 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Change via Guardian is CASE-178 |
| CASE-053 | MISSING-TEST | not state-dependent: X02-5 | — | — | X02-5 | X02-5 | COVERED | No row; proposed X02-5 (two Guardians; master F22, optional) |
| CASE-054 | PROVEN-LIVE | C8 (R1), R1F-1 | C8 (R2), R2-1 | C8 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | U1 street + " U1" |
| CASE-055 | PROVEN-LIVE | C8 (R1), R1F-1 | C8 (R2), R2-1, R2-27 | C8 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | `home_apt`; state-only value → null is R2-27 |
| CASE-056 | PROVEN-LIVE | C8 (R1), R1F-1 | C8 (R2), R2-1 | C8 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | C8 per round |
| CASE-057 | PROVEN-LIVE | C8 (R1), R1F-1 | C8 (R2), R2-1 | C8 (R3), R3-1, X02-6 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b; X02-6, R1b-1, R2b-1 | COVERED | R3 `stateregion` blank by design (U2-6); NJ `stateregion` leg proposed X02-6; NM/VA deferred |
| CASE-058 | OFFLINE-ONLY | not state-dependent: C8 (R3), R3-1 | — | — | R3-13a | R3-1, U2-6, R1b-1, R2b-1 | COVERED | R3 Case has `stateregion` blank, state from `location` (now live) |
| CASE-059 | OFFLINE-ONLY | not state-dependent: R2-31 | — | — | R2-23a | R2-31 | COVERED | Item 5 built; warning `state_unreadable_used_location`; path-independent |
| CASE-060 | PROVEN-LIVE | C8 (R1), R1F-1 | C8 (R2), R2-1 | C8 (R3), U2-6, X02-6 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b; X02-6, R1b-1, R2b-1 | COVERED | R3 ZIP blank by design; NJ leading-zero ZIP proposed X02-6 |
| CASE-061 | PROVEN-LIVE | C8 (R1), R1F-1 | C8 (R2), R2-1 | C8 (R3), R3-20 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Phone input form rotates per round (decision 46) |
| CASE-062 | PLANNED | not state-dependent: C8 (unreadable value, R3 Guardian) | — | — | C8 (unreadable value) | U-05 | COVERED | `555-01` on the R3 Guardian Contact (S6a; review C B3) → R3 Case run `error`, restore → `noop`; Case path. [pending Zeke: Contact workflow confirmation] |
| CASE-063 | PLANNED | K1, U-04 | R2-23g | R3-13g, R3-20 | U-04, R2-23g, R3-13g | GS-1, U-48 | COVERED | K1 (phone) by both paths. Guardian path (recency audit section C): edit the Guardian Contact field; the Case sync property changes; the Case workflow sends the webhook (proven by arrival, record-timeline) or the poll queues the Case (GS-1); CR shows the new value. Arrival only by `intakePoller` while the Case workflow is on = a trigger-list gap for Zeke. [pending Zeke: Contact workflow confirmation] |
| CASE-064 | RETIRED | — | — | — | — | — | RETIRED | Decision 36: second phone not built (C9) |
| CASE-065 | OFFLINE-ONLY | not state-dependent: U2-1, U2-6 | — | — | R2-27 | U2-1, U2-6 | COVERED | B21 deployed; R2-27 shows CR keeps "Apt 2A" by webhook |
| CASE-066 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a broken CR read; `stage3BlankCoreFieldsClient.test.mjs` (CRC:462-481) |
| CASE-067 | RETIRED | — | — | — | — | — | RETIRED | Decision 39, then item 6: owners API never called |
| CASE-068 | RETIRED | — | — | — | — | — | RETIRED | `care_coordinator_name` source replaced by item 6 (Zeke 2026-11-24; C10 struck); new rule CASE-069 |
| CASE-069 | PLANNED | C10 (R1), R1F-1, U-49 | C10 (R2), R2-1 | C10 (R3), R3-1, R3-16 | R2-1, U-49, R3b-1 | R3-1, R3-16, R1b-1, R2b-1 | COVERED | Build pending (item 6); SU-6 Team Member record; question 25 unblocked |
| CASE-070 | PENDING | — | — | — | — | — | BLOCKED | Waits on O-17 (no CR email target); C10 checks email never sent meanwhile |
| CASE-071 | RETIRED | — | — | — | — | — | RETIRED | Owners scope not needed (decision 39 / item 6) |
| CASE-072 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Master 4.10: production Case workflow triggers on coordinator fields (pkg D14) |
| CASE-073 | PROVEN-LIVE | C11 (R1), R1F-1 | C11 (R2), R2-1 | C11 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | IA BCBA 223 per round |
| CASE-074 | PROVEN-LIVE | C11 (R1), R1F-1 | C11 (R2), R2-1 | C11 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | RE BCBA 229 per round |
| CASE-075 | PLANNED | not state-dependent: C11 (R1-U1) | — | — | C11 (R1-U1), U-06 | U-11, U-15 | COVERED | Association-only removal; poll or sweep (U-15) delivers; record source |
| CASE-076 | OFFLINE-ONLY | not state-dependent: U-13 | — | — | U-01 | U-13 | COVERED | U-13 two BTs on 236 → "A, B" record-ID order; path-independent |
| CASE-077 | RETIRED | — | — | — | — | — | RETIRED | Typed-supplier-by-name rule replaced by item 9/10 association order (C12) |
| CASE-078 | OFFLINE-ONLY | C12 (R1), R1F-2 | C12 (R2), R2-4 | C12 (R3), R3-10 | R1F-2 | R2-4, R3-10, U-10, U-11, U-12 | COVERED | " BCBA LBA" suffix; full role order is X02-4 |
| CASE-079 | OFFLINE-ONLY | not state-dependent: U-14, U-14b, U-14c | — | — | U-01 | U-14, U-14b, U-14c | COVERED | Blank supplier → nothing sent (Zeke 2026-11-24, build pending); path-independent |
| CASE-080 | OFFLINE-ONLY | not state-dependent: U-10, X02-4 | — | — | U-01 | U-10, X02-4 | COVERED | U-10 proves 253 counts; "last" order needs two roles at once: X02-4 |
| CASE-081 | OFFLINE-ONLY | not state-dependent: U-12, X02-4 | — | — | U-01 | U-12, X02-4 | COVERED | U-12 SUB used; "second" order proposed X02-4 |
| CASE-082 | OFFLINE-ONLY | not state-dependent: U-11 | — | — | U-01 | U-11 | COVERED | 221 counts; removal changes 131308 in one run |
| CASE-083 | OFFLINE-ONLY | not state-dependent: U-12 | — | — | U-01 | U-12 | COVERED | On Leave 233 never sent |
| CASE-084 | OFFLINE-ONLY | C13 (R1), R1F-2 | C13 (R2), R2-5, R2-6 | C13 (R3), R3-10 | R1F-2, R2-6 | R2-5, R3-10 | COVERED | NY licence on R1 Yes / R3 No (non-holder); R2 holder |
| CASE-085 | OFFLINE-ONLY | C13 (R1), R1F-2 | C13 (R2), R2-5 | C13 (R3), R3-1 | R1F-2, R2-1, R3b-1 | R2-5, R3-1, R1b-1, R2b-1 | COVERED | 136052 holder text in CO; blank for non-holders |
| CASE-086 | OFFLINE-ONLY | not state-dependent: R2-5 | — | — | R2-23a | R2-5 | COVERED | 227 link via `--grad-permit-link`; path-independent |
| CASE-087 | OFFLINE-ONLY | not state-dependent: R2-6 | — | — | R2-6 | R2-23b | COVERED | R2 Case still has no 227 link at S3d, so R2-23b hits the same rule |
| CASE-088 | OFFLINE-ONLY | not state-dependent: R2-7, R2-4 | — | — | R2-23a | R2-7, R2-4 | COVERED | Licence → Yes clears 136052; 131308 gets the 82 name; path-independent |
| CASE-089 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Sandbox allows one 247 per Case; `stage7GradPermitRoles.test.mjs`:234 |
| CASE-090 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Rule 7 decided (Zeke 2026-11-24); one 247 per Case; `stage7GradPermitRoles.test.mjs` (rule 7 test pending) |
| CASE-091 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a property missing from the answer; `stage7GradPermitRoles.test.mjs`:322, :334 |
| CASE-092 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Production BCBA data fix before cutover (master App. B CASE-092); add to master 4.10 list |
| CASE-093 | PROVEN-LIVE | C14 (R1), R1F-1 | C14 (R2), R2-1 | C14 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Primary BT 1 (238) |
| CASE-094 | PROVEN-LIVE | C14 (R1), R1F-1 | C14 (R2), R2-1 | C14 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Primary BT 2 (240) |
| CASE-095 | PLANNED | not state-dependent: C14 (R1-U1), BR17, U-06 | — | — | U-06 | BR18, U-15 | COVERED | Swap / remove association-only; sweep fallback U-15 |
| CASE-096 | OFFLINE-ONLY | not state-dependent: U-07, U-08, U-09, U-13 | — | — | U-01 | U-07, U-08, U-09, U-13 | COVERED | Item 10 confirmed: label is the signal (no removal date); path-independent |
| CASE-097 | PROVEN-LIVE | not state-dependent: C11, C14 | — | — | R1-1, R1c-1, R2-1; U-01, R3b-1 | R3-1; U-05, R1b-1, R2b-1 | COVERED | v4 association read on every Case run |
| CASE-098 | PROVEN-LIVE | not state-dependent: C16 | — | — | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Unlabeled-only link offline (matrix Offline table, K10) |
| CASE-099 | PROVEN-LIVE | not state-dependent: C16 | — | — | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Potential IA 251 / Supervising 249 set every round |
| CASE-100 | PROVEN-LIVE | not state-dependent: C16 | — | — | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Potential BT 1 (242) |
| CASE-101 | OFFLINE-ONLY | not state-dependent: R2-8 | — | — | R2-8 | R2-23b | COVERED | Previous IA 235 now live on R2; R2 Case keeps 235 at the poller update |
| CASE-102 | PLANNED | not state-dependent: BR18, U-06 | — | — | U-06 | U-07, U-11, U-15 | COVERED | Rollup signals; poll on `hs_lastmodifieddate`; sweep fallback |
| CASE-103 | RETIRED | — | — | — | — | — | RETIRED | `current_primary_bt` workflow not needed (BUILD-PLAN 4.14) |
| CASE-104 | PLANNED | not state-dependent: BR17 (relabel) | — | — | BR17, U-06 | BR17, BR18 | COVERED | IA → RE relabel on one BCBA; record source |
| CASE-105 | PROVEN-LIVE | C17 (R1), R1F-1 | C17 (R2), R2-1 | C17 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | U1 + " U1" |
| CASE-106 | PROVEN-LIVE | C17 (R1), R1F-1 | C17 (R2), R2-1 | C17 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Work Schedule #2 |
| CASE-107 | RETIRED | — | — | — | — | — | RETIRED | Location #2 variants: no CR field (O-14, pkg C; C18) |
| CASE-108 | PLANNED | C19 (R1), R1F-1 | C19 (R2), R2-1 | C19 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Text only (item 7); C19 rewritten, re-prove |
| CASE-109 | RETIRED | — | — | — | — | — | RETIRED | Item 7: weekly hours no longer appended |
| CASE-110 | PROVEN-LIVE | C20 (R1), R1F-1 | C20 (R2), R2-1 | C20 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | 16 / 11 / 14 (R3 one blank as 0) / U1 17 |
| CASE-111 | PROVEN-LIVE | C20 (R1), R1F-1 | C20 (R2), R2-1 | C20 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Never 18/12/24/2 (Exclusions decoys) |
| CASE-112 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `f1UnreadableValues.test.mjs`:364 `[C20]` (decisions 43, 48) |
| CASE-113 | RETIRED | — | — | — | — | — | RETIRED | Per-BT hours not sent (C21, O-18, pkg C) |
| CASE-114 | PROVEN-LIVE | not state-dependent: C22 (R1), R1F-1 | — | — | R1-1, R1c-1, R1F-1, R3b-1 | U-05 | COVERED | Prior Authorization Required branch; path-independent |
| CASE-115 | PLANNED | not state-dependent: C22 (R2, R1-U1) | — | — | R2-1, R3b-1 | U-05 | COVERED | No Prior branch: R2 "6"; U1 "6" |
| CASE-116 | PLANNED | not state-dependent: C22 (R3) | — | — | R3-13a | R3-1, R1b-1, R2b-1 | COVERED | Blank track → blank |
| CASE-117 | PROVEN-LIVE | C23 (R1), R1F-1 | C23 (R2), R2-1 | C23 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | "MM/DD/YYYY - MM/DD/YYYY" |
| CASE-118 | PLANNED | not state-dependent: C23 (R1-U1) | — | — | U-01 | U-05 | COVERED | Start cleared → "04/30/2027" |
| CASE-119 | CONFLICT | C23, C34, C35 (R1), R1F-1 | C23, C34, C35 (R2), R2-1 | C23, C34, C35 (R3), R3-1 | R1-1, R1c-1, R2-1, U-01 | R3-1, U-05 | COVERED | Question 34 closed as recommended (keep the code; guide note in section 7). Behaviour as API-032. |
| CASE-120 | PROVEN-LIVE | C23 (R1), R1F-1 | C23 (R2), R2-1 | C23 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | `_f` twins hold 2030-01-01 decoys (Exclusions) |
| CASE-121 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage4CaseMappings.test.mjs`:633, :658, :678 |
| CASE-122 | PLANNED | not state-dependent: C24 (R1), R1F-1 | — | — | R1-1, R1c-1, R1F-1, R3b-1 | U-05 | COVERED | Child's House two-line (item 5); C24 re-prove; path-independent |
| CASE-123 | OFFLINE-ONLY | not state-dependent: C24 (R3), R3-1 | — | — | R3-13a | R3-1, R1b-1, R2b-1 | COVERED | More Than One Location uses home parts; R3 is MTOL |
| CASE-124 | OFFLINE-ONLY | not state-dependent: C24 (R2), R2-19, C24-F | — | — | R2-19, U-01, C24-F | R2-29 | COVERED | `service__stateregion_2` set on R2. Fallback leg C24-F: R1 Case `service__stateregion_2` cleared in S4 with old line 43 → Meta 137697 "200 Service Rd Suite 1\nNew York NY 10002" (fallback = Case `stateregion`, still New York; `buildClientMetadata.mjs:226`) (run-sheet change AB-7 applied). |
| CASE-125 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Whole-address split leg live in R2-29; street-blank / placeholder-apt legs `stage4CaseMappings.test.mjs`:373-446 |
| CASE-126 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage4CaseMappings.test.mjs`:376 |
| CASE-127 | PLANNED | C25 (R1), R1F-1 | C25 (R2), R2-1 | C25 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Not sent R1/R2; sent R3 (MTOL) |
| CASE-128 | OFFLINE-ONLY | not state-dependent: R2-27 | — | — | R2-27 | R2-23b | COVERED | Decided (Zeke 2026-11-24), build pending; commas-only leg offline; path-independent |
| CASE-129 | RETIRED | — | — | — | — | — | RETIRED | Copy workflow not needed (item 5, insert D) |
| CASE-130 | PLANNED | not state-dependent: C26 (R1), R1F-1 | — | — | R1-1, R1c-1, R1F-1, R3b-1 | U-05 | COVERED | Item 3 un-held, build pending; "AzT 1 peanuts" |
| CASE-131 | PLANNED | not state-dependent: C26 (R2, R1-U1) | — | — | R2-1, R3b-1 | U-05 | COVERED | Item 3, build pending; Denial → "None" |
| CASE-132 | OFFLINE-ONLY | not state-dependent: R3-17 | — | — | R3-17 | R3-13b | COVERED | Confirmed + "NA" (blank-like) → "Yes" (CF §11.1); build pending |
| CASE-133 | PLANNED | not state-dependent: C26 (R3) | — | — | R3-13a | R3-1, R1b-1, R2b-1 | COVERED | Blank → blank |
| CASE-134 | PROVEN-LIVE | C27 (R1), R1F-1 | C27 (R2), R2-1 | C27 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Comorbid main field |
| CASE-135 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Clinical copy names unknown (M "Not covered"); `stage4CaseMappings.test.mjs`:81, :90 |
| CASE-136 | PROVEN-LIVE | C27 (R1), R1F-1 | C27 (R2), R2-1 | C27 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Stored values incl. "Itemsth" (R3) |
| CASE-137 | PLANNED | C28 (R1), R1F-1 | C28 (R2), R2-1 | C28 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Item 8 un-held, build pending: the digit |
| CASE-138 | PROVEN-LIVE | C28 (R1), R1F-1 | C28 (R2), R2-1 | C28 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | `important_information` |
| CASE-139 | PROVEN-LIVE | C29 (R1), R1F-1 | C29 (R2), R2-1 | C29 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Sent as stored |
| CASE-140 | PLANNED | not state-dependent: C29 (R2) | — | — | R2-1, R3b-1 | R2-23b | COVERED | Other → summary; R2 Case still Other at the poller update |
| CASE-141 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage4CaseMappings.test.mjs`:623 |
| CASE-142 | PROVEN-LIVE | C29 (R1), R1F-1 | C29 (R2), R2-1 | C29 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Sensitive in production only (CASE-047) |
| CASE-143 | PROVEN-LIVE | C30 (R1), R1F-1 | C30 (R2), R2-1 | C30 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | R3 blank carrier → blank |
| CASE-144 | PLANNED | not state-dependent: C30 (R2, R3) | — | — | R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Other → summary (R2); blank → blank (R3) |
| CASE-145 | PROVEN-LIVE | C30 (R1), R1F-1 | C30 (R2), R2-1 | C30 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | `n2_what_type_of_insurance` decoy (Exclusions) |
| CASE-146 | PROVEN-LIVE | C30 (R1), R1F-1 | C30 (R2), R2-1 | C30 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | R3 ID blank |
| CASE-147 | RETIRED | — | — | — | — | — | RETIRED | `insurance_id_3` not mapped (C38, O-19, pkg C) |
| CASE-148 | RETIRED | — | — | — | — | — | RETIRED | `insurance_id_4` not requested (C38) |
| CASE-149 | PLANNED | C31 (R1), R1F-1 | C31 (R2), R2-19 | C31 (R3), R3-1 | R1F-1, R2-19 | R3-1, R1b-1, R2b-1 | COVERED | Medicaid FFS / - CO / - NJ; "`<name> <npi>`" (item 4) re-prove |
| CASE-150 | OFFLINE-ONLY | not state-dependent: C31 (R1-U1) | — | — | U-01 | U-05 | COVERED | C31 U1 now new format ("…Commercial 2000000001"); Enrolled then OON |
| CASE-151 | PLANNED | not state-dependent: C31 (R1-U1) | — | — | U-01 | U-05 | COVERED | Unsure → blank (C31 U1 last step) |
| CASE-152 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage4CaseMappings.test.mjs`:582, :598 |
| CASE-153 | PROVEN-LIVE | C32 (R1), R1F-1 | C32 (R2), R2-1 | C32 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | U1 + "U1" |
| CASE-154 | PROVEN-LIVE | C33 (R1), R1F-1 | C33 (R2), R2-1 | C33 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | O-28 format question stays with United Care |
| CASE-155 | PROVEN-LIVE | C34 (R1), R1F-1 | C34 (R2), R2-1 | C34 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | MM/DD/YYYY |
| CASE-156 | PROVEN-LIVE | C34 (R1), R1F-1 | C34 (R2), R2-1 | C34 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | Sent whatever the insurance type (all three states) |
| CASE-157 | PROVEN-LIVE | C35 (R1), R1F-1 | C35 (R2), R2-1 | C35 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | No tagged offline test (slice gap b6) |
| CASE-158 | PROVEN-LIVE | C35 (R1), R1F-1 | C35 (R2), R2-1 | C35 (R3), R3-1 | R1-1, R1c-1, R2-1; U-01, R2-23a, R3-13a, R3b-1 | R3-1; U-05, R2-23b, R3-13b, R1b-1, R2b-1 | COVERED | U1 1985-06-21 |
| CASE-159 | PLANNED | C36 (R1, R1-U1), R1F-1 | C36 (R2), R2-17 | C36 (R3), R3-18 | R1-1, R1c-1, R2-17, R3b-1; K1 (Case run) | R3-18, GS-1 | COVERED | As stored ("Care manager" U1 via the Guardian Contact → Case `referral_source` sync → Case run). [pending Zeke: Contact workflow confirmation] |
| CASE-160 | PLANNED | not state-dependent: R2-17, R3-18 | — | — | R2-17 | R3-18 | COVERED | Item 2 decided, build pending; SU-6 `referral_other` sync |
| CASE-161 | PLANNED | not state-dependent: U-42, BR13 | — | — | R1-1, R1c-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Read-only inputs never written back (property history) |
| CASE-162 | MISSING-TEST | — | — | — | — | — | OFFLINE-ONLY | No CR target to observe live. [apply-recheck] Re-check check 4: the named H4 / K14 test does not exist, but the request list is pinned by exact-list tests that fail on any added property: `stage4and5PropertyLists.test.mjs` "[BR5][4.17] the Case mapped list holds exactly the HubSpot sources of the built Case requirements" and "[BR13][4.17] the Case mustTrigger and system lists are unchanged, and no property sits in two lists"; no archived "Prior" field is in them. A named test for the 34 fields is optional (open decision 11). |
| CASE-163 | PROVEN-LIVE | C37 (R1), R1F-1 | C37 (R2), R2-1 | C37 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Record link 138702 |
| CASE-164 | PLANNED | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | Webhook `skipped` `excluded_stage`; poll not queued. Create leg: X01-4 (hand-made Case created in `1383894301`; run-sheet change AB-4 applied). |
| CASE-165 | PLANNED | not state-dependent: U-29b, SU-3 | — | — | U-29b | U-29b | COVERED | U-29b: R1 Case `test_record` = true + `important_information` edit → `skipped` `test_record`, no CR call (S6a, both; run-sheet change AB-10 applied); `INCLUDE_TEST_RECORDS` absent (SU-3). |
| CASE-166 | PLANNED | not state-dependent: SU-3, X02-3 | — | — | X02-3 | X02-3 | COVERED | No Case gate-blank row (U-45 is a BT/RBT); proposed X02-3 |
| CASE-167 | OFFLINE-ONLY | not state-dependent: G-1c, X02-3 | — | — | G-1c | G-1c, X02-3 | COVERED | Positive leg G-1c (CO webhook, NJ poller); negative leg X02-3 |
| CASE-168 | PLANNED | G-6, G-7 | G-2 (R2 Case) | G-2 (R3 Case) | G-6, G-7, G-2 | G-2, G-4 | COVERED | Updates box gate; untick stops next edit |
| CASE-169 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Master 4.10 sandbox-to-production workflows (production IDs); pkg E24 |
| CASE-170 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Master 4.10 (staffing-signal triggers, STF-087); BUILD-PLAN 9.6 |
| CASE-171 | MISSING-TEST | U-01, U-21 | R2-23a | R3-13a | U-01, U-21 | U-05 | COVERED | "both" rows record first-run `source`; poll-only edit = trigger gap (master D2) |
| CASE-172 | PLANNED | U-01, K1, U-06 | R2-23a, R2-23g, R2-10 | R3-13a, R3-13g | U-01, U-06, R2-10 | U-05, U-07 | COVERED | Mapped, Guardian (Case sync, K1), staffing, label changes on linked Cases. [pending Zeke: Contact workflow confirmation] |
| CASE-173 | PROVEN-LIVE | C1 to C37 (R1), R1-1 | R2-1 | R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Sandbox pipeline/stage and association IDs |
| CASE-174 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Fan-out (optional code) queues 1 Case, no CR contact: OFFLINE-ONLY `stage6ContactRouting.test.mjs` [K1][6.1]. The Case run makes no CR contact either (K1). [pending Zeke: Contact workflow confirmation] |
| CASE-175 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `contactChange` → fan-out is optional code: OFFLINE-ONLY `stage6ContactRouting.test.mjs`. [pending Zeke: Contact workflow confirmation] |
| CASE-176 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage6ContactRouting.test.mjs`:207 |
| CASE-177 | PLANNED | not state-dependent: K1 (firstname), U-04 | — | — | U-04 | GS-1 | COVERED | Case sync property → GuardianFirstName; K1 by both paths. [pending Zeke: Contact workflow confirmation] |
| CASE-178 | PLANNED | not state-dependent: K1 (lastname), U-04 | — | — | U-04 | GS-1 | COVERED | → GuardianLastName; K1 by both paths. [pending Zeke: Contact workflow confirmation] |
| CASE-179 | PLANNED | not state-dependent: K1 (email), U-04 | — | — | U-04 | GS-1 | COVERED | → PrimaryEmail; K1 by both paths. [pending Zeke: Contact workflow confirmation] |
| CASE-180 | PLANNED | K1 (phone), U-04 | R2-23g | R3-13g | U-04, R2-23g, R3-13g | GS-1 | COVERED | → PhoneCell; K1 by both paths. [pending Zeke: Contact workflow confirmation] |
| CASE-181 | RETIRED | — | — | — | — | — | RETIRED | K3 retired (decisions 42, 44, 50): B9 reads BCBA `personal_email` |
| CASE-182 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | K4: a `test_record` Contact queues nothing in the optional fan-out. Not P1. OFFLINE-ONLY `stage6ContactRouting.test.mjs` [K4][6.2]. [pending Zeke: Contact workflow confirmation] |
| CASE-183 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage6ContactRouting.test.mjs`:280; `INCLUDE_TEST_RECORDS` stays absent in sandbox (SU-3) |
| CASE-184 | PLANNED | not state-dependent: G-5 | — | — | G-5, G-7 | G-2 | COVERED | Case gate stops a Guardian-driven Case run (G-5); the gate per path G-2 / G-6 / G-7. [pending Zeke: Contact workflow confirmation] [apply-recheck] Re-check G4 / O1: G-2 now runs on the S3a set with the promote workflows OFF (S3a-2 skip by webhook, S3c-0 not queued, S3c-0b hand tick → poller update), so "linked, creates ticked, updates blank" exists when the edit is made. |
| CASE-185 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage6ContactRouting.test.mjs`:336 |
| CASE-186 | RETIRED | — | — | — | — | — | RETIRED | Retired for the Guardian half (recency audit section C): no production Contact workflow is needed; the production Case refresh workflow triggers on `guardian_first_name`, `guardian_last_name`, `email`, `phone`, `location` (d51; Ruling A deploys it from the sandbox; SU-6 and the 4.10 check). [pending Zeke: Contact workflow confirmation] |
| CASE-187 | PENDING | not state-dependent: U-27, U-33, U-36 | — | — | U-27, U-33 | U-27, U-33, U-36 | COVERED | Cross-slice 03/04; K5 (O-26) sweep fallback S8-1 |
| CASE-188 | PLANNED | K1, K2, U-04 | R2-23g | R3-13g, R3-20 | U-04, R2-23g, R3-13g | GS-1 | COVERED | Guardian path (recency audit section C): edit the Guardian Contact field; the Case sync property changes; the Case workflow sends the webhook (proven by arrival, record-timeline) or the poll queues the Case (GS-1); CR shows the new value. Arrival only by `intakePoller` while the Case workflow is on = a trigger-list gap for Zeke. [pending Zeke: Contact workflow confirmation] |
| CASE-189 | PROVEN-LIVE | C7 (R1), R1F-1 | C7 (R2), R2-1 | C7 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Production existence proven by read 2026-11-20 (M L109-117) |
| CASE-190 | PROVEN-LIVE | B7, T4 (R1), R1-2, R1-3 | B7, T4 (R2), R2-2, R2-3 | R3-14 | R1-2, R1c-2, R1-3, R1c-3, R2-2, R2-3, R3b-2, R3b-3 | R3-14, U-33 | COVERED | `employee_phone`; cross-slice 03/04 |
| CASE-191 | PROVEN-LIVE | CL4 (R1), R1F-5 | CL4 (R2), R2-10 | CL4 (R3), R3-1 | R2-10 | R3-1, U-16, R1b-1, R2b-1 | COVERED | Staffing labels; retired label removed R1F-5 |
| CASE-192 | PROVEN-LIVE | not state-dependent: R1-1, R2-1 | — | — | R1-1, R1c-1, R2-1, R3b-1 | path n/a: webhook delivery rule (poller create is CASE-196, R3-1) | COVERED | Deal webhook → queue → worker |
| CASE-193 | PROVEN-LIVE | U-01 | R2-23a | R3-13a | U-01, R2-23a, R3-13a | path n/a: webhook delivery rule (poller update is CASE-195) | COVERED | Deal webhook update |
| CASE-194 | PROVEN-LIVE | not state-dependent: BR3, U-43 | — | — | BR3 | U-43 | COVERED | Lease + noop: one CR write |
| CASE-195 | PLANNED | U-05, U-43 | R2-23b | R3-13b | U-43 | U-05, R2-23b, R3-13b | COVERED | Checkpoint 5 min (SU-2); webhook + poll on one change U-43 |
| CASE-196 | OFFLINE-ONLY | not state-dependent: R3-1 | — | — | path n/a: poller delivery rule (webhook create is CASE-192) | R3-1, G-1c, R1b-1, R2b-1 | COVERED | NJ Case created by the poller, entry workflow off |
| CASE-197 | OFFLINE-ONLY | not state-dependent: S8-1, U-15 | — | — | path n/a: sweep rule | S8-1, U-15 | COVERED | Sweep = first poll after 08:00 UTC |
| CASE-198 | PLANNED | not state-dependent: S8-3, BR14 | — | — | S8-3 | S8-3 | BLOCKED | BLOCKED (S8-3 forced-failure method, run-sheet open question 3; email receiver S9, Azure write; Zeke). Then S8-3: BT/RBT, S10, webhook start: retries 60 s / 150-300 s / 15 min / 1 h / 4 h, dead-letter, one email with no child name and no values. |
| CASE-199 | OFFLINE-ONLY | not state-dependent: R1F-1 | — | — | R1F-1 | path n/a: one-time deploy event (R1F-1 runs before the poller is on) | COVERED | Bump applies to linked R1/R4 records; R2/R3 created after deploy |
| CASE-200 | MISSING-TEST | not state-dependent: SU-7 | — | — | path n/a: manual log step | path n/a: manual log step | COVERED | SU-7 at S0 / S11 (HubSpot ID, CR ID, CR active state) [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| CASE-201 | RETIRED | — | — | — | — | — | RETIRED | Names use "RN", not "#N" (M L380, O-34) |
| CASE-202 | PROVEN-LIVE | C5, BR1 (R1), R1-1 | R2-1 | R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Lookup 404 → one create |
| CASE-203 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a CR client holding the ID with HubSpot unlinked; `duplicateSafety.test.mjs`:112 |
| CASE-204 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs an unknown create outcome; `stage3PendingCreate.test.mjs` |
| CASE-205 | PLANNED | not state-dependent: X07a-9, SU-5 | — | — | X07a-9 | path n/a: the poll searches only unlinked Cases whose Entered contains Yes | COVERED | `entry_not_yes`, 0 CR calls: X07a-9 records it on the pending build (S1, the R3 create with Entered blank; run-sheet change AB-3 applied); SU-5 is the 2026-11-23 history. |
| CASE-206 | PLANNED | not state-dependent: U-19, U-16, R2-13 | — | — | U-19 | R2-13, U-16 | COVERED | Cold, Paused, Discharged still update; Cleanup stages excluded (CASE-164) |
| CASE-207 | PLANNED | not state-dependent: U2-2 | — | — | R2-23a | U2-2 | COVERED | Clears only integration-written metadata; path-independent |
| CASE-208 | PENDING | — | — | — | — | — | PHASE-TWO | Client already in CR, `client_id_number` blank: existing records (Zeke two-phase) |
| CASE-209 | OFFLINE-ONLY | not state-dependent: R2-8 | — | — | R2-8 | R2-23b | COVERED | Potential BT 2 (218) set on R2 only |

## Slice 03: BCBA (03-bcba.md)

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| BCBA-001 | OFFLINE-ONLY | — | — | — | — | — | PRODUCTION-ONLY | Cutover: master 6.3 item 2 (`2-48354212`) and 4.10 "first production run per object type routes correctly"; offline `[2.6]` portal-table tests |
| BCBA-002 | PROVEN-LIVE | not state-dependent: R1-2, R3-3 | — | — | R1-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Every sandbox BCBA run reads and writes `2-72890322` |
| BCBA-003 | OFFLINE-ONLY | not state-dependent: U-28 | — | — | U-03 | U-28 | COVERED | U-28: R4 BCBA moved to Terminated still updates. Supersedes the slice's offline-only status |
| BCBA-004 | PROVEN-LIVE | BR1 (R1), R1-2 | R2-2 | R3-3 | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | R3-3 is the first BCBA create picked up by the poller (slice gap a22) |
| BCBA-005 | PROVEN-LIVE | not state-dependent: X07a-9, BR1 | — | — | X07a-9 | R3-3, R1b-2, R2b-2 | COVERED | X07a-9 (S1, R3 BCBA created with Entered blank, pending build; AB-3 applied): `skipped` `entry_not_yes`. Under R3-3 the poller makes no create until Entered = Yes. |
| BCBA-006 | PROVEN-LIVE | not state-dependent: R1-2, U-03 | — | — | R1-2, R1c-2 (entry), U-03 (refresh), R3b-2 | path n/a: webhook delivery rule; the poller path is U-23 | COVERED | Entry and refresh webhooks |
| BCBA-007 | PLANNED | not state-dependent: U-23 | — | — | U-03 | U-23 | COVERED | U-23 sets Entered to blank, not `No`; this fixes the R1-U1 line 19 defect |
| BCBA-008 | PROVEN-LIVE | not state-dependent: BR1, R1-2 | — | — | R1-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Equals `Yes` |
| BCBA-009 | OFFLINE-ONLY | not state-dependent: U-45 (R2 BCBA 2) | — | — | U-45 | U-45 | COVERED | U-45 now includes R2 BCBA 2 with `sandbox_test_field` unticked, Entered = Yes (S3e, both): no run, no CR call (run-sheet change AB-6 applied). Offline: S1 gate tests :290-352, S7TG. |
| BCBA-010 | OFFLINE-ONLY | not state-dependent: G-8, R2-2 | — | — | R2-2, G-8 | R3-3, G-8, R1b-2, R2b-2 | COVERED | G-8 is Zeke's one BCBA skip row (question 11). The BCBA creates in the gate window run with the creates box ticked |
| BCBA-011 | OFFLINE-ONLY | not state-dependent: G-2 | — | — | G-2 (edit → `gate: update`) | G-2 (tick → update), R2-23d | COVERED | G-2 covers all six new records, both BCBAs included [apply-recheck] Re-check G4 / O1: G-2 now runs on the S3a set with the promote workflows OFF (S3a-2 skip by webhook, S3c-0 not queued, S3c-0b hand tick → poller update), so "linked, creates ticked, updates blank" exists when the edit is made. |
| BCBA-012 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Offline by design (pkg item 14). Tests: `configSmoke`, `stage3WebhookAndSettings`, S7TG |
| BCBA-013 | PLANNED | not state-dependent: U-29 | — | — | U-29 | U-29 | COVERED | U-29 (both paths): BCBA with `test_record` = true → `skipped`, no CR call. Closes slice gap a21 |
| BCBA-014 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Setting only, sandbox. Test: S1 "gate skips test_record = true unless test records are included". SU-3 shows the setting is absent |
| BCBA-015 | OFFLINE-ONLY | not state-dependent: U-28 | — | — | U-03 | U-28 | COVERED | U-28: Terminated BCBA updated, still active in CR, no deactivation |
| BCBA-020 | OFFLINE-ONLY | not state-dependent: R2-2 | — | — | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | R2-2: GET `externalSystemId` = the R2 Workday ID |
| BCBA-021 | PROVEN-LIVE | not state-dependent: R1-2, R4-2, R3-3 | — | — | R1-2, R1c-2, R4-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Temporary ID = HubSpot record ID (B2) |
| BCBA-022 | PROVEN-LIVE | not state-dependent: R4-2, R3-3 | — | — | R4-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | `waiting`, "Waiting for the Workday ID" [apply-recheck] Re-check citation fix: R1c-2 and R3b-2 are the temporary-ID BCBA webhook creates on the pending build (R4-2 ran on `655b385`). |
| BCBA-023 | OFFLINE-ONLY | not state-dependent: R2-2 | — | — | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | R2-2 ends `success` |
| BCBA-024 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | An empty ESID cannot be staged. Tests: laneL "no CR ID and no External System ID", S1. Live creates send a filled ESID (B2) |
| BCBA-025 | PROVEN-LIVE | not state-dependent: BR10 | — | — | BR10 (R-WD webhook 19:03:50), U-03 | BR10 (step 4 poll), U-23 | COVERED | The update sends the ESID CR already holds |
| BCBA-026 | PROVEN-LIVE | not state-dependent: WD-2, WD-3 | — | — | R3-13c | WD-2, WD-3 | COVERED | Mapped field and label change while `waiting` (slice gap a19) |
| BCBA-027 | PROVEN-LIVE | not state-dependent: R1c-WD, BR10, WD-1 | — | — | R1c-WD (S4 `workday_id`, S7 checklist), BR10, WD-1 | R1c-WD (S5a), BR10 | COVERED | WD-1 records whether the checklist sends a webhook. Production trigger list: master 4.10 [apply-recheck] Re-check G2: BR10 / R-WD ran on `655b385`; the pending-build BCBA transition is R1c-WD. |
| BCBA-028 | PROVEN-LIVE | not state-dependent: BR10 | — | — | path n/a: poller re-check rule | BR10, S8-4 | COVERED | 5-minute schedule (BR10); hourly schedule (S8-4) |
| BCBA-029 | PLANNED | not state-dependent: WD-5, S8-1 | — | — | path n/a: sweep rule | sweep: WD-5, S8-1 | COVERED | WD-5 uses a linked `waiting` BCBA. The unlinked-`waiting` half is offline only (S3DS), per WD-5's design |
| BCBA-030 | PROVEN-LIVE | not state-dependent: R4-2, R3-3 | — | — | R4-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | `waiting` runs finish clean: no retry, no dead-letter [apply-recheck] Re-check citation fix: R1c-2 and R3b-2 are the temporary-ID BCBA webhook creates on the pending build (R4-2 ran on `655b385`). |
| BCBA-031 | PROVEN-LIVE | not state-dependent: R1-WD, R2-23c | — | — | R2-23c | R2-23d | COVERED | The R2 BCBA's CR record holds its Workday ID from the create (R2-2), so its updates end `success` |
| BCBA-032 | PROVEN-LIVE | not state-dependent: R4-2, R3-3 | — | — | R4-2, R1c-2, R3b-2 | R3-3, R3-13d, R1b-2, R2b-2 | COVERED | Rule 5.4 row 2 [apply-recheck] Re-check citation fix: R1c-2 and R3b-2 are the temporary-ID BCBA webhook creates on the pending build (R4-2 ran on `655b385`). |
| BCBA-033 | PROVEN-LIVE | not state-dependent: R1c-WD, BR10 | — | — | R1c-WD (S4), BR10 | R1c-WD (S5a), BR10 | COVERED | `waiting` "Replace the temporary…" [apply-recheck] Re-check G2: R1c-WD on the pending build. |
| BCBA-034 | PROVEN-LIVE | not state-dependent: R1c-WD, BR10 | — | — | R1c-WD (S7 checklist tick), WD-1 | BR10 (R-WD step 4) | COVERED | CHECKLIST_STILL_TEMPORARY. Whether a checklist edit sends a webhook is recorded by WD-1 [apply-recheck] Re-check G2: R1c-WD S7 tick → `error` CHECKLIST_STILL_TEMPORARY on the pending build (`src/lib/syncDecisions.mjs:47-48`). |
| BCBA-035 | PLANNED | not state-dependent: WD-1 | — | — | WD-1 | WD-1 | COVERED | R4 BCBA untick → `waiting` |
| BCBA-036 | PLANNED | not state-dependent: R1-WD, R1-U1 | — | — | U-03 | U-23 | COVERED | R1-WD: CR ID replaced by hand → `success`. R1-U1 line 21: tick while CR holds the Workday ID → `success` |
| BCBA-037 | OFFLINE-ONLY | not state-dependent: U-25 | — | — | R2-23c | U-25 | COVERED | U-25: R2 BCBA, checklist ticked with `workday_id` blank → CHECKLIST_BLANK_WORKDAY, update still sent |
| BCBA-038 | OFFLINE-ONLY | not state-dependent: U-24 | — | — | U-24 | U-24 | COVERED | WORKDAY_ID_MISMATCH: no update, no `labelPost`. BR8 employee half |
| BCBA-039 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | CR always holds an ESID after a create. Test: S1 `[G17] a linked … with no External System ID in CentralReach and a blank workday_id sends no ID` |
| BCBA-040 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | CR always holds an ESID after a create. Test: S1 `[G17] a linked … with no External System ID in CentralReach sends a filled workday_id` |
| BCBA-041 | PROVEN-LIVE | not state-dependent: R1-2, R2-2 | — | — | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Read-only GET by External System ID before every create |
| BCBA-042 | OFFLINE-ONLY | not state-dependent: R2-2 | — | — | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | R2-2: both lookups (record ID, then Workday ID) return 404 |
| BCBA-043 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a create that succeeded without the writeback (race). Test: S1 `[G17] an employee found by the HubSpot record ID is linked and not created again` |
| BCBA-044 | OFFLINE-ONLY | not state-dependent: U-26 | — | — | U-26 | R3-3, R1b-2, R2b-2 | COVERED | U-26: second BCBA with `0498374` → `error`, no CR call (BR11 hold lifted) |
| BCBA-045 | OFFLINE-ONLY | — | — | — | — | — | PHASE-TWO | Employee already in CR with no HubSpot holder: an existing-record case. Offline: S1 `[G17] a Workday ID found only in CentralReach…` (slice A8) |
| BCBA-046 | OFFLINE-ONLY | — | — | — | — | — | PHASE-TWO | Hand-linked existing CR employee. Offline: S3CID `[BR5][3.16]`; the BT/RBT twin U-44 is a P2 option |
| BCBA-047 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a second CR record (master offline table). Test: S1 `[G17] … found by the record ID and the Workday ID under two CentralReach IDs is an error` |
| BCBA-048 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a CR failure. Tests: S1 `[G17] an unclear employee lookup…`; stage2PortalAndRetries `[2.7]` |
| BCBA-049 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a CR failure. Test: S3PC `[BR3][3.15]` (BT/RBT case; the worker is shared; a BCBA case is offline gap b2) |
| BCBA-050 | OFFLINE-ONLY | not state-dependent: U-26 | — | — | U-26 | R3-3, R1b-2, R2b-2 | COVERED | One Workday ID per record (BR11). The "two runs at once" race is offline only (S1) |
| BCBA-051 | PENDING | — | — | — | — | — | PHASE-TWO | Shared Workday IDs on existing production records; also waits on a United Care answer |
| BCBA-052 | PLANNED | not state-dependent: U-34, R2-2 | — | — | R2-2 | U-34 | COVERED | The invalid case runs on a BT/RBT (U-34; shared check, S7WD TYPES includes BCBA). R2-2 is a valid 7-digit BCBA |
| BCBA-053 | PENDING | — | — | — | — | — | PHASE-TWO | Zeke confirmed the rule on 2026-11-24 (U-34). Fixing malformed production values is existing-record work |
| BCBA-054 | PROVEN-LIVE | not state-dependent: R1-2, R2-2 | — | — | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Decoy `external_system_id` set; CR ESID = record ID (B2) or Workday ID (R2-2), never the decoy |
| BCBA-055 | PROVEN-LIVE | not state-dependent: BR10, U-25 | — | — | WD-1 | BR10, U-25 | COVERED | Stored option `External System ID`. The NPI / Billing Hold options are offline gap b6 |
| BCBA-056 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Not-read property, no decoy. Test: S45PL `[B2][5.3]` |
| BCBA-057 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | The property does not exist on the BCBA. Test: S45PL `[B2][5.3]` |
| BCBA-058 | PENDING | — | — | — | — | — | BLOCKED | Waits on United Care (guide L244, L757): Workday alerts for BCBAs; the HubSpot workflow 1929214033 is not integration code |
| BCBA-059 | PENDING | — | — | — | — | — | BLOCKED | Waits on United Care, guide L757 q2 (BCBA order; "Entered without Workday ID" check) |
| BCBA-060 | PENDING | — | — | — | — | — | BLOCKED | Waits on United Care, guide L757 q1 (does anything read the temporary ESID?) |
| BCBA-061 | PROVEN-LIVE | not state-dependent: R1-2, R4-2, R3-3 | — | — | R1-2, R1c-2, R4-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | As BCBA-021 |
| BCBA-062 | PLANNED | not state-dependent: G-4, G-8 | — | — | G-4, G-8 | G-4, G-8 | COVERED | A BCBA outside the creates segment is never created (G-8); a record in neither segment gets nothing (G-4). Existing employees are phase two |
| BCBA-063 | PENDING | — | — | — | — | — | PHASE-TWO | Existing-records review before employee creates. The setting change is master 6.3 item 5 |
| BCBA-070 | PROVEN-LIVE | not state-dependent: R1-2, R2-2 | — | — | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | `employee_id` written back after the create (B2, G-1) |
| BCBA-071 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Same race as BCBA-043. Test: S1 `[G17] an employee found by the HubSpot record ID is linked…` |
| BCBA-072 | PLANNED | not state-dependent: R2-25, SU-4 | — | — | R2-25 | R3-3, R1b-2, R2b-2 | COVERED | R2-25 reads back `central_reach_record_link`; SU-4 reads it on the existing BCBAs |
| BCBA-073 | PROVEN-LIVE | not state-dependent: R2-2, R3-3, R3-5 | — | — | R2-2 | R3-3, R3-5, R1b-2, R2b-2 | COVERED | `success`, `waiting` and `error` all occur; `blocked` is never written |
| BCBA-074 | PROVEN-LIVE | not state-dependent: R3-5, U-24, BR21 | — | — | U-24 | R3-5 | COVERED | Reason names fields, never values; blank on `success` (R2-2) |
| BCBA-075 | PLANNED | not state-dependent: R2-25, U-42 | — | — | R2-25 | U-42 | COVERED | `last_sync_at` read back (slice gap a13) |
| BCBA-076 | PROVEN-LIVE | not state-dependent: U-42, U-43 | — | — | U-43 | U-43 | COVERED | `integration_last_write` feeds the 24-hour report (BR15) |
| BCBA-077 | PLANNED | not state-dependent: R2-25, U-42 | — | — | R2-25 | U-42 | COVERED | `updated_by_integration` read back |
| BCBA-078 | PLANNED | not state-dependent: R2-25, U-42 | — | — | R2-25 | U-42 | COVERED | `last_sync_hash`; U-42's property history shows it is not written on `error` (U-24) |
| BCBA-079 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | HubSpot trigger-list config. Test: checkTriggers `[BR13][3.10]`. Production triggers: master 4.10 |
| BCBA-080 | PLANNED | not state-dependent: U-42 | — | — | U-42 | U-42 | COVERED | BR13 property history: only the write list changes |
| BCBA-081 | PROVEN-LIVE | — | — | — | — | — | PRODUCTION-ONLY | Production fact (read 11/14). Cutover: master 4.10 "every deployed property matches its sandbox name, type and options" |
| BCBA-082 | PROVEN-LIVE | not state-dependent: R1c-WD, BR10, U-42 | — | — | R3-13c | R1c-WD (S5a), BR10 (19:05 poll) | COVERED | The same status and reason are not written again: R3-13c stays `waiting`; R-WD 19:05 poll [apply-recheck] Re-check G2: R1c-WD S5a `employeePoller` run stays `waiting`, reason not written again. |
| BCBA-090 | PLANNED | not state-dependent: R2-25 (B1 Screen) | n/a: NY row (CO = BCBA-091) | n/a: NY row (NJ = BCBA-092) | R2-2 | R3-3, R1b-2 | COVERED | The B1 Screen check on the R1 CR employee is still open (2026-11-23 SKIP) B1 Admin form is not state-dependent for the BCBA (`centralReachClient.mjs:44-55`). |
| BCBA-091 | PLANNED | n/a: CO row (NY = BCBA-090) | B1 (R2), R2-25 | n/a: CO row (NJ = BCBA-092) | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | R2-25 includes the B1 Admin form Screen check |
| BCBA-092 | PLANNED | n/a: NJ row (NY = BCBA-090) | n/a: NJ row (CO = BCBA-091) | not state-dependent: R2-25 (B1 Screen) | R2-2 | R3-3, R2b-2 | COVERED | Admin on the NJ create B1 Admin form is not state-dependent for the BCBA. |
| BCBA-093 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | App Insights logs no request bodies (as CASE-003/005, master offline table). Test: CRC employee update payload has no ContactForm |
| BCBA-094 | PROVEN-LIVE | B3 (R1), R1F-1 | B3 (R2), R2-2 | B3 (R3), R3-3; X03-1 | R2-2; U-03 | R3-3; X03-1, R1b-2, R2b-2 | COVERED | The blank `first_name` → `error` case had no live row; proposed X03-1 |
| BCBA-095 | PROVEN-LIVE | B3 (R1), R1F-1 | B3 (R2), R2-2 | B3 (R3), R3-3; X03-1 | R2-2; U-03 | R3-3; X03-1, R1b-2, R2b-2 | COVERED | The blank `last_name` case is covered by X03-1, step 2 |
| BCBA-096 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Informational (slice A9): `full_name` is not sent. Test: S1 `[GER-REQ] employee names come from first_name and last_name` |
| BCBA-097 | PROVEN-LIVE | B6 (R1), R1F-1 | B6 (R2), R2-2 | B6 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | `gender_new`, never the archived `gender` |
| BCBA-098 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `gender_new` is a dropdown, so an unreadable value cannot be entered live. Test: F1 `[B7][5.2]` |
| BCBA-099 | RETIRED | — | — | — | — | — | RETIRED | Decision 49: the source is the BCBA `email`, not `ucaba_email_address` (live rule is BCBA-100) |
| BCBA-100 | PROVEN-LIVE | B4 (R1), R1F-1 | B4 (R2), R2-2 | B4 (R3), R3-3 | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | BCBA's own `email` → PrimaryEmail on create |
| BCBA-101 | PLANNED | not state-dependent: R3-5 | — | — | R2-2 | R3-5 | COVERED | R3-5: blank `email` → `error` "Missing required field: email", no CR call |
| BCBA-102 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Slice judged offline. Tests: S1 malformed-email test, F1 `[B4][1.3]`. B9 (unreadable value) proves the same reader live |
| BCBA-103 | PLANNED | not state-dependent: B4 (U1), R1-U1 | — | — | U-03 | U-23 | COVERED | R1-U1 line 15: changed email sent by API (O-11) |
| BCBA-104 | OFFLINE-ONLY | not state-dependent: U2-3 | — | — | U-03 | U2-3 | COVERED | U2-3: a blank `email` on an update → CR keeps its primary email (slice gap a11) |
| BCBA-105 | PLANNED | B5 (R1), R1F-3 | B5 (R2), R2-2 | B5 (R3), R3-3 | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | R1F-3: CR shows 1990-01-15, never 1975-03-09 or 1980-07-04 |
| BCBA-106 | PLANNED | B5 (R1), R1F-3 | B5 (R2), R2-2 | n/a: R3 is blank by design (BCBA-107, R3-3) | R2-2 | R2b-2, R1b-2 | COVERED | `1/15/1990` and `Feb 16, 1991` → YYYY-MM-DD Poller creates R2b-2 ("Feb 16, 1991" → 1991-02-16) and R1b-2 ("1/15/1990" → 1990-01-15) (AB-5 applied). |
| BCBA-107 | PLANNED | not state-dependent: R3-3 | — | — | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | R3-3: placeholder 2000-01-01 plus warning, on create only |
| BCBA-108 | OFFLINE-ONLY | not state-dependent: U2-4 | — | — | U-03 | U2-4, R3-9, R3-19 | COVERED | U2-4: CR keeps 1990-01-15, never gets the placeholder. Build pending (item 1 update-with-blank) |
| BCBA-109 | PLANNED | not state-dependent: U2-4 | — | — | U-03 | U2-4, R3-9, R3-19 | COVERED | Question 27 (a), Zeke 2026-11-24: CR's date is sent back. Build pending |
| BCBA-110 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Slice judged offline. Test: BDOB `[B5][1.4] … is error`, `… in the future is error` |
| BCBA-111 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a property removed (master offline table). Test: S1 `[GER-REQ] a missing employee date_of_birth property is an error` |
| BCBA-112 | PENDING | — | — | — | — | — | BLOCKED | Waits on United Care, guide L757 q6: who fills BCBA `date_of_birth` |
| BCBA-113 | RETIRED | — | — | — | — | — | RETIRED | Pkg item 1 / E2: `date_of_birth` exists as editable text (since 2026-11-21), not a property sync |
| BCBA-114 | PLANNED | B5 (R1), R1F-3 | B5 (R2), R2-2 | B5 (R3), R3-3 | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | The `dob` decoy `3/9/1975` never reaches CR. In R3, `dob` is filled and `date_of_birth` blank → placeholder |
| BCBA-115 | RETIRED | — | — | — | — | — | RETIRED | Decisions 42 and 50: the BCBA's own `personal_email` replaces the Contact read (K3 retired) |
| BCBA-116 | PROVEN-LIVE | B9 (R1), R1F-1 | B9 (R2), R2-2 | B9 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | Meta 138069, lower case |
| BCBA-117 | PLANNED | not state-dependent: B9 (U1), R1-U1 | — | — | U-03 | U-23 | COVERED | R1-U1 Push 4 line 16: `changedFieldNames` is only 138069 |
| BCBA-118 | PLANNED | not state-dependent: U2-7a | — | — | U-03 | U2-7a | COVERED | U2-7a: R1 BCBA `personal_email` cleared → Meta 138069 cleared, `changedFieldNames` only 138069 (S8a; run-sheet change AB-13 applied). The no-saved-copy half is offline (S6PE). |
| BCBA-119 | PLANNED | not state-dependent: B9 (unreadable value), R1-U1 | — | — | U-03 | U-23 | COVERED | R1-U1 Push 6/7: `error`, no CR write; restore → previous status, `noop` |
| BCBA-120 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a property removed. Test: S6PE `… an answer without the personal_email key is a failed read` |
| BCBA-121 | RETIRED | — | — | — | — | — | RETIRED | Decisions 42 and 44: the fan-out BCBA branch is removed (U-04 checks no BCBA is queued) |
| BCBA-122 | PROVEN-LIVE | B7 (R1), R1F-1 | B7 (R2), R2-2 | B7 (R3), R3-3 | R2-2; U-27 | R3-3; U-27, R1b-2, R2b-2 | COVERED | `address` mirror → addressLine1 |
| BCBA-123 | PROVEN-LIVE | B7 (R1), R1F-1 | B7 (R2), R2-2 | B7 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | `apartment__home` → addressLine2 |
| BCBA-124 | PROVEN-LIVE | B7 (R1), R1F-1 | B7 (R2), R2-2 | B7 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | `city_home` → city |
| BCBA-125 | PROVEN-LIVE | B7 (R1), R1F-1 | n/a: NY row (CO = BCBA-126) | n/a: NY row (NJ = BCBA-127) | R1-2, R1c-2; U-03, R3b-2 | U-23 | COVERED | New York → NY |
| BCBA-126 | PLANNED | n/a: CO row (NY = BCBA-125) | B7 (R2), R2-2 | n/a: CO row (NJ = BCBA-127) | R2-2; R2-23c | R2-23d | COVERED | Colorado → CO |
| BCBA-127 | PLANNED | n/a: NJ row (NY = BCBA-125) | n/a: NJ row (CO = BCBA-126) | B7 (R3), R3-14 | R3-13c | R3-3, R1b-2, R2b-2 | COVERED | New Jersey → NJ (R3-14) |
| BCBA-128 | PROVEN-LIVE | B7 (R1), R1F-1 | B7 (R2), R2-2 | B7 (R3), R3-14 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | R3-14: 07103 keeps its leading zero |
| BCBA-129 | PROVEN-LIVE | B7 (R1), R1F-1 | B7 (R2), R2-2 | B7 (R3), R3-14 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | Three phone input forms (one per round) → 10 digits |
| BCBA-130 | OFFLINE-ONLY | not state-dependent: U-42 | — | — | U-42 | U-42 | COVERED | U-42 property history: no mirror field is ever written |
| BCBA-131 | PLANNED | not state-dependent: U-27 | — | — | U-27 | U-27 | COVERED | U-27: change to the BCBA Contact `address` reaches CR; first `source` recorded (O-26) |
| BCBA-132 | PROVEN-LIVE | B8 (R1), R1F-1 | B8 (R2), R2-2 | B8 (R3), R3-3 | R2-2; U-03 | R3-3; WD-2, R1b-2, R2b-2 | COVERED | Meta 126216 (WD-2 changes it while `waiting`) |
| BCBA-133 | PROVEN-LIVE | B8 (R1), R1F-1 | B8 (R2), R2-2 | B8 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | Meta 138112 |
| BCBA-134 | PROVEN-LIVE | B8 (R1), R1F-1 | B8 (R2), R2-2 | B8 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | Meta 138113 |
| BCBA-135 | PLANNED | not state-dependent: B8 (U1), R1-U1 | — | — | U-03 | U-23 | COVERED | R1-U1 line 24: NY → blank clears 126216. The never-written half is offline (S3 hash tests) |
| BCBA-136 | PROVEN-LIVE | B10 (R1), R1F-1 | B10 (R2), R2-2 | B10 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | Salaried 1132653 added (R1, R3), none (R2), removed (U1) |
| BCBA-137 | BLOCKED | — | — | — | — | — | BLOCKED | Waits on pkg D8 / O-17: no CR employee field for the BCBA Care Coordinator (item 6 covers the Case only) |
| BCBA-138 | PROVEN-LIVE | B12 (R1), R1-2 | B12 (R2), R2-2 | B12 (R3), R3-3 | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | Meta 138703 = the record link |
| BCBA-139 | PROVEN-LIVE | not state-dependent: R1-2, R2-2 | — | — | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | The CR `contactId` in `employee_id` is the link (B2) |
| BCBA-140 | PROVEN-LIVE | BL5 (R1), R1F-1 | BL5 (R2), R2-2 | BL5 (R3), R3-3 | R2-2; U-46 | R3-3; U-46, R1b-2, R2b-2 | COVERED | Label field `ny_insurance_labels` (U-46: change made by the payor-status workflow) |
| BCBA-140b | NOT-BUILT | — | — | — | — | — | DEFERRED | Decision 25: CR labels other than NY Medicaid not built (same basis as LBL-027 to LBL-033, which the slices made DEFERRED). Stand-in: BL6 proves no label is sent. |
| BCBA-141 | PROVEN-LIVE | B13 (R1), R1F-1 | B13 (R2), R2-2 | B13 (R3), R3-3 | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | Decoy; Meta 134444 never sent |
| BCBA-142 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Mapped-list rule. Test: S45PL `[B7][5.2] the BCBA mapped list holds exactly …` |
| BCBA-143 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | No decoy on the archived `gender`. Tests: S5EM, S45PL `[B6][5.1]` |
| BCBA-144 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Test: S45PL `[B13][5.3]`. B3 shows CR names come from first/last, not `bcba_name` |
| BCBA-145 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a property removed (master offline table). Test: BR21T `[BR21][3.9]` missing key |
| BCBA-146 | PLANNED | not state-dependent: BR16, U2-4 | — | — | U-03 | U2-4, R3-9, R3-19 | COVERED | Real blanks in R1-U2. The failed-read half is offline (S3BCF `[BR16][3.13]`) |
| BCBA-147 | PLANNED | not state-dependent: U2-7b | — | — | U-03 | U2-7b | COVERED | U2-7b: R1 BCBA Contact `apartment` cleared → CR address line 2 blank (S8b; run-sheet change AB-13 applied). The never-written half needs an existing record: offline S3BCF. |
| BCBA-148 | PROVEN-LIVE | not state-dependent: R1F-1 | — | — | R1F-1 | BR10 (19:05 poll), S8-1 | COVERED | The run after a full update is `noop`; no CR write |
| BCBA-149 | PLANNED | not state-dependent: BR21, U-43 | — | — | U-43 | U-43 | COVERED | BR21 exact-value scan on BCBA runs |
| BCBA-150 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a CR failure. Test: S1 `[G17] a 400 on employee create is error …`, `… a 409 …` |
| BCBA-151 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs `ALLOW_EMPLOYEE_CREATE` off (SU-3 keeps it true). Test: S1 `[G17] employee create turned off is waiting …` |
| BCBA-152 | PLANNED | — | — | — | — | — | OFFLINE-ONLY | Observed only if a label POST is unconfirmed (R-WD saw labels confirmed on the first read). Offline: `stage3LabelWorkerSide.test.mjs:262`. Promote to COVERED if S3a logs `delaySeconds: 150` (R2-16 / G-9). |
| BCBA-160 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Cutover: master 4.10 (production BCBA workflow incl. the checklist; production IDs in every workflow) |
| BCBA-161 | PLANNED | not state-dependent: U-21, U-03 | — | — | U-21, U-03 | path n/a: webhook trigger list (U-23 is the fallback) | COVERED | Sandbox trigger list. The production list is checked at cutover (master 4.10) |
| BCBA-162 | PROVEN-LIVE | not state-dependent: BR1, R1-2 | — | — | R1-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | The create path checks Entered = Yes itself |
| BCBA-163 | PLANNED | — | — | — | — | — | PRODUCTION-ONLY | Cutover: master 4.10 "production BCBA workflow includes the checklist (BCBA-027, -163)". Sandbox: BR10, WD-1 |
| BCBA-164 | PLANNED | R1-2, U-03, BL4 (R1) | R2-2, R2-21 | R3-3, R3-13c | R2-2; U-03 | R3-3; R2-21, R1b-2, R2b-2 | COVERED | Entry gate, linked updates, Grad Permit label swap (R2-21) |
| BCBA-165 | OFFLINE-ONLY | not state-dependent: R2-5 | — | — | R2-6 | R2-5 | COVERED | R2-5 reports the 227 / 226 holder-side type. 191 (Contact) is no longer read (S6PE) |
| BCBA-166 | PROVEN-LIVE | R1-2, R4-2 | R2-2 | R3-3 | path n/a: test-data convention | path n/a: test-data convention | COVERED | One new BCBA per round [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BCBA-167 | PROVEN-LIVE | R1-2, SU-3 | R2-2 | R3-3 | path n/a: test-data convention | path n/a: test-data convention | COVERED | `sandbox_test_field` true, `test_record` blank, "Azure Test RN" names [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BCBA-168 | PLANNED | R1-2 | R2-2 | R3-3 | path n/a: test-data convention | path n/a: test-data convention | COVERED | R1 NY, R2 CO, R3 NJ [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BCBA-169 | PROVEN-LIVE | B3 (R1) | B3 (R2) | B3 (R3) | path n/a: test-data convention | path n/a: test-data convention | COVERED | Names end in "RN", not "#N" (O-34 convention change) [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BCBA-170 | RETIRED | — | — | — | — | — | RETIRED | Decision 49; Zeke 2026-11-23 "drop the decoy": `ucaba_email_address` not set |
| BCBA-171 | PROVEN-LIVE | B4 (R1), B9 (R1) | B4 (R2), B9 (R2) | B4 (R3), B9 (R3) | path n/a: test-data convention | path n/a: test-data convention | COVERED | BCBA `email` is the BCBA's own `email` (d49); in the sandbox the script sets it to the Contact email because no mirror runs; `personal_email` is set separately (d50). [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BCBA-172 | PLANNED | B5 (R1) | B5 (R2) | B5 (R3) | path n/a: test-data convention | path n/a: test-data convention | COVERED | R3 blank on purpose (placeholder test) [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BCBA-173 | PROVEN-LIVE | B7 (R1), BL2 (R1) | B7 (R2), BL2 (R2) | B7 (R3), BL2 (R3) | path n/a: test-data convention | path n/a: test-data convention | COVERED | Convention changes (Apt NB, rotated phone forms) recorded for O-34 [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BCBA-174 | RETIRED | — | — | — | — | — | RETIRED | Pkg item 15: AZTEST values fail the 7-digit check; random 7-digit values instead (Zeke 2026-11-23) |
| BCBA-175 | PLANNED | not state-dependent: SU-7 | — | — | path n/a: after-round process | path n/a: after-round process | COVERED | SU-7 fills `sandbox-test-log.md` and records each employee's active status in CR [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BCBA-176 | RETIRED | — | — | — | — | — | RETIRED | Sandbox refused "#"; names use "RN" (matrix convention change, O-34) |
| BCBA-177 | PROVEN-LIVE | not state-dependent: BL5 (R1), R1F-1 | — | — | U-03 | U-23 | COVERED | Only NY Medicaid is managed; no payor-tag removal for the BCBA |
| BCBA-178 | PENDING | — | — | — | — | — | PHASE-TWO | Existing production BT/RBT checklist ticks at go-live (existing records) |
| BCBA-179 | RETIRED | — | — | — | — | — | RETIRED | History: superseded by the temporary-ID rule (G17 11/17; decision 22) |
| BCBA-180 | RETIRED | — | — | — | — | — | RETIRED | Superseded: Workday rules built (decisions 22, 38; pkg item 15) |
| BCBA-181 | PROVEN-LIVE | — | — | — | — | — | PRODUCTION-ONLY | Production property fact (11/06, 11/14). Cutover: master 4.10 property match |
| BCBA-182 | PLANNED | R1F-2 (non-holder) | R2-5, R2-7 | R3-10 (non-holder) | R2-6 | R2-5, R2-7 | COVERED | Production 151/150 at cutover (master 4.10). Rule 7 (two Supervising BCBAs) offline: `stage7GradPermitRoles.test.mjs`, build pending |
| BCBA-183 | PLANNED | not state-dependent: U-42 | — | — | U-42 | U-42 | COVERED | Write list: `employee_id`, `central_reach_record_link`, six status properties |
| BCBA-184 | BLOCKED | — | — | — | — | — | BLOCKED | Waits on pkg D8 / O-17 (BCBA Care Coordinator target) |
| BCBA-185 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | No sensitive BCBA property (slice A10); the sandbox has no sensitive tier. Test: S45PL mapped-list test |
| BCBA-L01 | PROVEN-LIVE | BL1 (R1), BL8 (R1), R1F-1 | BL1 (R2), R2-2 | BL1 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | 1130668 + 1052618 + 1052643 always |
| BCBA-L02 | PROVEN-LIVE | BL2 (R1), R1F-1 | BL2 (R2), R2-2 | BL2 (R3), R3-3 | R2-2; U-03 | R3-3; U-23, R1b-2, R2b-2 | COVERED | One label per Work State; U1 NY → NJ |
| BCBA-L03 | DEFERRED | — | — | — | — | — | DEFERRED | NM / VA (Zeke 2026-11-23); deferred behaviour shown by BL3, R2-22 |
| BCBA-L04 | PROVEN-LIVE | BL4 (R1), U-22 | BL4 (R2), R2-21 | BL4 (R3), R3-3 | R2-2; U-22 | R3-3; R2-21, R1b-2, R2b-2 | COVERED | Assign / licensure labels; Grad Permit → Yes swap (R2-21) |
| BCBA-L05 | PROVEN-LIVE | BL5 (R1), R1F-1 | BL5 (R2), R2-2 | BL5 (R3), R3-3 | R2-2; U-46 | R3-3; U-46, R1b-2, R2b-2 | COVERED | NY Medicaid 1107647. The other insurers are BCBA-140b |
| BCBA-L06 | PROVEN-LIVE | BL7 (R1), R1F-1 | BL7 (R2), R2-2 | BL7 (R3), R3-3 | R2-2; U-03 | R3-3; WD-3, R1b-2, R2b-2 | COVERED | Billing Hold 1103437 on Yes, removed on No |
| BCBA-L07 | DEFERRED | — | — | — | — | — | DEFERRED | NM / VA (Zeke 2026-11-23); BL3, R2-22 |
| BCBA-L08 | PENDING | B1 (R1), R1-2 | R2-25 | B1 (R3), R3-3 | R2-25 | R3-3, R1b-2, R2b-2 | COVERED | Form label 1052549 seen in the B1 / R2-25 label read; it stays through later label runs (BL rows) |
| BCBA-190 | RETIRED | — | — | — | — | — | RETIRED | Superseded by the 11/17 temporary-ID rule (guide L338; decision 22) |
| BCBA-191 | RETIRED | — | — | — | — | — | RETIRED | Superseded: the Workday ID becomes the ESID (guide L573, L717; G17) |
| BCBA-192 | RETIRED | — | — | — | — | — | RETIRED | `blocked` and `noop` statuses retired (guide L274; BR9) |
| BCBA-193 | RETIRED | — | — | — | — | — | RETIRED | Production uses the two-property gate (pkg D18, items 14, 24) |
| BCBA-194 | PENDING | — | — | — | — | — | BLOCKED | Waits on United Care (Sara), guide L757 q3. The build keeps Entered = Yes (decision 8; BCBA-004 covered) |
| BCBA-195 | PLANNED | not state-dependent: R1F-1 | — | — | R1F-1 | U-23 | COVERED | Full update once per linked BCBA (R1, R4), then `noop`. The poller is off until SU-2, so R1F-1 records the path |
| BCBA-196 | DEFERRED | — | — | — | — | — | DEFERRED | NM / VA mailing state (Zeke 2026-11-23, pkg item 11) |

## Slice 04: BT/RBT (04-bt-rbt.md)

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| BT-001 | PLANNED | R1-3 | R2-3 | R3-6 | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Process rule: each round's create row makes a new BT/RBT; R4-1 is round 4. |
| BT-002 | PROVEN-LIVE | not state-dependent: BR20 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Every create runs only with the gate true; BR20 lists the round records. |
| BT-003 | PLANNED | R1-3 | R2-3 | R3-6 | R2-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | One state per round: NY R1, CO R2, NJ R3 (matrix Rounds). |
| BT-004 | PLANNED | T2 (R1), R1-3 | T2 (R2), R2-3 | T2 (R3), R3-6 | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Values per matrix T1-T6 and the O-34 convention changes; guide L206 text update pending. |
| BT-005 | RETIRED | — | — | — | — | — | RETIRED | AZTEST value replaced by random 7 digits (Zeke 2026-11-23) and item 15's 7-digit check. |
| BT-006 | PROVEN-LIVE | not state-dependent: R1-3 | — | — | R1-3, R1c-3, R3b-3 | R1b-3, R2b-3 | COVERED | Temporary ID = HubSpot record ID. Poller temporary-ID creates R1b-3 (NY), R2b-3 (CO); webhook on the pending build R3b-3 (NJ) (run-sheet changes AB-4, AB-5 applied). R3 BT/RBT 1 is a Workday-ID create (X07a-2). |
| BT-007 | RETIRED | — | — | — | — | — | RETIRED | Guide L321 (11/17 Danny), L338: temporary-ID create replaced the hold. |
| BT-008 | PROVEN-LIVE | not state-dependent: R1-3 | — | — | R1-3, R1c-3, R3b-3 | R1b-3, R2b-3 | COVERED | BR2: temporary-ID create ends `waiting` "Waiting for the Workday ID"; poller R1b-3, R2b-3; webhook on the pending build R3b-3 (AB-4, AB-5 applied). |
| BT-009 | PROVEN-LIVE | not state-dependent: R1c-3, R4-1 | — | — | R1c-3, R4-1 | R3-6, R1b-3, R2b-3 | COVERED | Workday-filled create proven on R4-1; identity decided in the worker for any source. [apply-recheck] Re-check G1: R4-1 ran on `655b385`; on the pending build the webhook Workday-filled BT/RBT create is R1c-3 (round 10 BT/RBT 1, Workday 6029417, S3a). |
| BT-010 | OFFLINE-ONLY | not state-dependent: R2-14 | — | — | R2-14 | R2-14 | COVERED | R2-14 GET shows CR's temporary ID kept; "CR holds none" half offline (`employeeGuideMappings.test.mjs:69`). |
| BT-011 | OFFLINE-ONLY | not state-dependent: R2-14a, R2-20 | — | — | R2-14a | R2-23f, R2-20 | COVERED | Updates while `waiting` on CO BT/RBT 1 (temporary ID): webhook R2-14a (S4, before the `workday_id` edit; run-sheet change AB-7 applied); poller R2-23f (S3d), R2-20 (S5a). R3 BT/RBT 1 is no longer temporary (X07a-2). |
| BT-012 | MISSING-TEST | not state-dependent: WD-4 | — | — | WD-4, X04-1 | path n/a: webhook-trigger rule (poll fallback is BT-013, R2-14) | COVERED | `workday_id` webhook via U-30's `source` (WD-4); checklist webhook via proposed X04-1. |
| BT-013 | OFFLINE-ONLY | not state-dependent: R2-14 | — | — | path n/a: poller rule | R2-14, U-31 | COVERED | R2-14 tick/untick and U-31 reach linked `waiting` BT/RBTs by the poll. |
| BT-014 | PLANNED | not state-dependent: S8-1 | — | — | path n/a: sweep rule | S8-1, WD-5 | COVERED | Sweep runs in the poller; unlinked-`waiting` half offline (`stage3DailySweep.test.mjs:224`). |
| BT-015 | PROVEN-LIVE | not state-dependent: R1-3 | — | — | R1-3, R1c-3, R3b-3 | R2-23f, R1b-3, R2b-3 | COVERED | `waiting` creates end with no retry or dead-letter (R1b-3, R2b-3 poller; R3b-3 webhook; AB-4, AB-5 applied); S8-3 shows dead-letter for real failures. |
| BT-016 | PLANNED | not state-dependent: R1F-1 | — | — | R1F-1 | U-36 | COVERED | R4 BT/RBT 1 (CR holds 4465360 from R4-1) linked run `success`; U-47 is the P2 variant. |
| BT-017 | OFFLINE-ONLY | not state-dependent: R2-14a, R2-23f | — | — | R2-14a | R2-23f | COVERED | CO BT/RBT 1: temporary ID, `workday_id` blank, unticked; updates stay `waiting` (R2-14a webhook, AB-7 applied; R2-23f poller). |
| BT-018 | OFFLINE-ONLY | not state-dependent: R2-14 | — | — | R2-14 | R2-14 | COVERED | R2-14: 7-digit `workday_id` by webhook → `waiting` "Replace…"; untick by poll → `waiting`. |
| BT-019 | OFFLINE-ONLY | not state-dependent: R2-14 | — | — | X04-1 | R2-14 | COVERED | R2-14 tick → CHECKLIST_STILL_TEMPORARY, update still sent; webhook half via X04-1. |
| BT-020 | OFFLINE-ONLY | not state-dependent: U-31 | — | — | X04-1 | U-31 | COVERED | U-31: ticked with `workday_id` blank → CHECKLIST_BLANK_WORKDAY; webhook half via X04-1. |
| BT-021 | OFFLINE-ONLY | not state-dependent: U-30 | — | — | U-30 | U-30 | COVERED | U-30 (both): another 7-digit ID → WORKDAY_ID_MISMATCH, no update, no `labelPost`. |
| BT-022 | OFFLINE-ONLY | not state-dependent: U-37 | — | — | R2-14a | U-37, R2-23f | COVERED | U-37 blank `workday_id` → `success`; a temporary-ID BT/RBT with blank `workday_id` stays `waiting`, never mismatch (R2-14a webhook, AB-7 applied; R2-23f poller). |
| BT-023 | PROVEN-LIVE | not state-dependent: R1c-3, R4-1 | — | — | R1c-3, R4-1 | R3-6, R1b-3, R2b-3 | COVERED | R4-1: lookups by record ID and `workday_id` both 404 before the create. [apply-recheck] Re-check G1: R1c-3 (S3a, pending build): lookups by the record ID and 6029417 both 404 before the create. |
| BT-024 | PLANNED | not state-dependent: BR3 | — | — | BR3 | R3-6, R1b-3, R2b-3 | COVERED | BR3: a second run never creates again; link-by-lookup branch also offline (`stage3PendingCreate.test.mjs:117`). |
| BT-025 | PLANNED | not state-dependent: U-32 | — | — | U-32 (S6a, entry workflow on) | X07a-1 (same record, entry workflow off, `employeePoller`) | COVERED | BR11 hold lifted 2026-11-24. U-32 split: webhook leg (entry workflow on) then X07a-1 poller leg on the same record (run-sheet change AB-10 applied). |
| BT-026 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a CR employee holding the ID with no HubSpot holder; `stage1CreateIdentity.test.mjs:874`. |
| BT-027 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs two CR employees under two IDs; `stage1CreateIdentity.test.mjs` (CONFLICTING_EXTERNAL_IDS). |
| BT-028 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a CR answer other than 200/404; `stage2PortalAndRetries.test.mjs:812`. |
| BT-029 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a lost CR create answer; `stage3PendingCreate.test.mjs:67`, `:97`, `:136`, `:151`. |
| BT-030 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a forced race; test "[G17] two runs with one Workday ID started together create one employee" (BR11). |
| BT-031 | OFFLINE-ONLY | — | — | — | — | — | PHASE-TWO | Hand-linking existing CR employees is phase two; U-44 (P2 option) live; `stage3CrIdDigits.test.mjs:56`, `:99`. |
| BT-032 | PLANNED | not state-dependent: U-45 | — | — | U-45 | U-45 | COVERED | U-45: gate blank → no webhook, not queued by poll or sweep, no CR call. |
| BT-033 | PLANNED | not state-dependent: G-1 | — | — | G-1 | G-3, R3-6, R1b-3, R2b-3 | COVERED | Two-property gate: G-1 create allowed; G-3 updates box only → `gate: create`; R3-6 gated poller create. |
| BT-034 | PLANNED | not state-dependent: G-2 | — | — | G-2 | G-2 | COVERED | G-2: edit `skipped` `gate: update` by webhook, tick → update by poll; G-4 neither segment. [apply-recheck] Re-check G4 / O1: G-2 now runs on the S3a set with the promote workflows OFF (S3a-2 skip by webhook, S3c-0 not queued, S3c-0b hand tick → poller update), so "linked, creates ticked, updates blank" exists when the edit is made. |
| BT-035 | PENDING | — | — | — | — | — | PHASE-TWO | Hand-linked and existing production employees: phase two (Zeke's two-phase ruling; D19). |
| BT-036 | DEFERRED | — | — | — | — | — | PHASE-TWO | Existing CR people matched by email/name: phase two (Zeke's ruling). |
| BT-037 | PLANNED | not state-dependent: U-45 | — | — | U-45 | path n/a: webhook enrolment-list rule (poll side is BT-032) | COVERED | U-45: a record outside list 1465 (gate blank) sends no webhook. |
| BT-038 | PLANNED | not state-dependent: BR9 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | BR9 checked on every run's HubSpot status. |
| BT-039 | PROVEN-LIVE | not state-dependent: G-1 | — | — | G-1 | R3-6, R1b-3, R2b-3 | COVERED | G-1 expects `employee_id` written back; R1-3 proven (CR 5384530). |
| BT-040 | PROVEN-LIVE | not state-dependent: BR13 | — | — | R1-3, R1c-3, R3b-3 | U-42 | COVERED | Link written with `employee_id` (R1 proven); U-42 property history shows it. |
| BT-041 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs HubSpot to reject the writeback; `duplicateSafety.test.mjs` "[GER-BT] … rejected employee_id writeback". |
| BT-042 | PROVEN-LIVE | not state-dependent: BR13 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Every run writes `last_sync_status` (BR9, BR13). |
| BT-043 | PROVEN-LIVE | not state-dependent: BR21 | — | — | U-30 | U-31 | COVERED | Error sentences in U-30 / U-31; U-43 BR21 exact-value scan shows no values. |
| BT-044 | PLANNED | not state-dependent: U-42 | — | — | U-42 | U-42 | COVERED | U-42 property history (both paths) lists `last_sync_at`. |
| BT-045 | PROVEN-LIVE | not state-dependent: U-43 | — | — | U-43 | U-43 | COVERED | U-43: BR15 24-hour report on `integration_last_write`. |
| BT-046 | PLANNED | not state-dependent: U-42 | — | — | U-42 | U-42 | COVERED | U-42 property history read. |
| BT-047 | PLANNED | not state-dependent: U-42 | — | — | U-42 | U-42 | COVERED | U-42; hash on non-error runs, none on the U-30 `error`. |
| BT-048 | PLANNED | not state-dependent: U-42 | — | — | U-42 | U-42 | COVERED | U-42 (TRG-331): only write-list properties changed. |
| BT-049 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | HubSpot trigger config (decision 51); `checkTriggers.test.mjs:69`. |
| BT-050 | PROVEN-LIVE | not state-dependent: T8 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | T8 Meta 138703 (R1 pass); sent on every create. |
| BT-051 | PROVEN-LIVE | not state-dependent: T2 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | `external_system_id` decoy set (Exclusions); T2 expects the record ID. |
| BT-052 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Exact mapped-list check; `stage4and5PropertyLists.test.mjs:229`. |
| BT-053 | PENDING | R1b-3, R1c-3 | R2-3 | R3-6, R3b-3 | R2-3, R3b-3, R1c-3 | R3-6, R2b-3, R1b-3 | COVERED | Decided (d8, P24): the create signal stays Entered = Yes; RG D16 non-blocking. |
| BT-054 | PROVEN-LIVE | not state-dependent: BR1 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | BR1; R3-6 is the poll's Entered = Yes create branch. |
| BT-055 | PROVEN-LIVE | not state-dependent: X04-2 | — | — | X04-2b (S4) | X04-2 (S3c) | COVERED | Blank proven R1 (`entry_not_yes`). Yes - Generic / No- Made Inactive on unlinked R3 BT/RBT 2: poller X04-2 (S3c), webhook X04-2b (S4; run-sheet change AB-7 applied). |
| BT-056 | PLANNED | not state-dependent: BR12 | — | — | U-02 | BR12 | COVERED | BR12 R1-U1: BT/RBT 1 Entered → Yes - Generic, field change sent (both paths on). |
| BT-057 | PLANNED | not state-dependent: BR12 | — | — | U-02 | BR12 | COVERED | BR12 R1-U1: Entered → No- Made Inactive, field change sent. |
| BT-058 | OFFLINE-ONLY | not state-dependent: U-38 | — | — | U-02 | U-38 | COVERED | U-38: Entered cleared, field change → update sent. |
| BT-059 | MISSING-TEST | not state-dependent: U-35 | — | — | U-02 | U-35 | COVERED | U-35 Terminated update; Resigned same no-exclusion path (offline gap (b) 1). |
| BT-060 | PLANNED | not state-dependent: BR12 | — | — | U-02 | U-35 | COVERED | BR12 and U-35: CR still active after updates. |
| BT-061 | RETIRED | — | — | — | — | — | RETIRED | Guide L591 sentence retired: the integration never deactivates (L441, L1436). |
| BT-062 | PROVEN-LIVE | not state-dependent: R1-3 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Sandbox type 2-72890325 routes; production half is BT-156 (PRODUCTION-ONLY). |
| BT-063 | PROVEN-LIVE | not state-dependent: R1-3 | — | — | R1-3, R1c-3, U-02, R3b-3 | path n/a: webhook route (poller route is BT-134) | COVERED | ID-only webhook → employee queue, proven R1. |
| BT-064 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Master 4.10 deployed-workflow check (triggers incl. `workday_id`, checklist; production IDs); pkg "Before deploy" item 2. |
| BT-065 | MISSING-TEST | not state-dependent: U-02 | — | — | U-02, R2-23e, R3-13e | path n/a: webhook-trigger rule | COVERED | U-02 asserts first-run `source` `hubspotWorkflow` on a mapped-field edit. |
| BT-066 | PROVEN-LIVE | not state-dependent: BR3 | — | — | BR3 | U-43 | COVERED | BR3 R1 pass: second signal `SYNC_IN_PROGRESS`, retry `noop`; one CR employee. |
| BT-067 | PLANNED | not state-dependent: BR3 | — | — | U-02 | U-43 | COVERED | BR3/BR14 duplicate-signals step on linked BT/RBT 1 (R1-U1); one CR write. |
| BT-068 | PLANNED | not state-dependent: K5 | — | — | K5 | K5, U-33 | COVERED | K5 Contact `address`; records which path delivered (O-26); sweep fallback S8-1. |
| BT-069 | MISSING-TEST | not state-dependent: U-33 | — | — | U-33 | U-33 | COVERED | U-33 phone, zip, state, DOB; city in U-36; email changed on the record (Contact email is the script key). |
| BT-070 | PROVEN-LIVE | not state-dependent: T2 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Create half; update half is BT-150 (U-36 `first_name`). |
| BT-071 | PROVEN-LIVE | not state-dependent: T2 | — | — | R1-3, R1c-3, U-02, R3b-3 | R3-6, U-36, R1b-3, R2b-3 | COVERED | Create proven; R1-U1 last name + " U1" is the update. |
| BT-072 | PROVEN-LIVE | not state-dependent: T2 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | `bt_name` differs from the sent names; CR name from `first_name` / `last_name`. |
| BT-073 | PLANNED | not state-dependent: X04-3 | — | — | X04-3 | X04-3 | COVERED | Matrix "Made by hand" blank-name employee has no row ID; X04-3 (create by webhook, update by poll). |
| BT-074 | PROVEN-LIVE | not state-dependent: T2 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | `primaryEmail` from BT/RBT `email` on create (R1 proven). |
| BT-075 | OFFLINE-ONLY | not state-dependent: X04-3 | — | — | X04-3 | R3-6, R1b-3, R2b-3 | COVERED | Blank email on create via X04-3; badly formed half offline (`f1UnreadableValues.test.mjs:396`, `:432`). |
| BT-076 | PLANNED | not state-dependent: T2 | — | — | U-02 | U-36 | COVERED | T2 (email update, decision 47): R1-U1 email change → CR `primaryEmail`. |
| BT-077 | OFFLINE-ONLY | not state-dependent: U2-3b | — | — | U-02 (generic BT/RBT update; the rule has no path branch) | U2-3b | COVERED | U2-3b: R1 BT/RBT 1 record `email` blank, Contact untouched → CR `primaryEmail` unchanged (S8b, poller; run-sheet change AB-13 applied). If a sandbox sync refills it, stop and fall back to OFFLINE-ONLY (`stage3BlankCoreFields.test.mjs:167`). |
| BT-078 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Unreadable path live on phone (U-39); `f1UnreadableValues.test.mjs` wt `:288`, `:442`, `:450`. |
| BT-079 | PLANNED | not state-dependent: T2 | — | — | R2-3, R3b-3 | U-33 | COVERED | R2 ISO `1993-03-21` at create; U-33 changes the Contact date by both paths. |
| BT-080 | PLANNED | not state-dependent: R1F-4 | — | — | R1F-4 | U-33 | COVERED | R1F-4 `2/20/1992` read as text → 1992-02-20 (item 16, in the working tree). |
| BT-081 | PLANNED | not state-dependent: T2 | — | — | R2-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | T2 R3 blank DOB → placeholder 2000-01-01 and warning on the R3-6 create. |
| BT-082 | OFFLINE-ONLY | not state-dependent: U2-5 | — | — | U-02 | U2-5, R3-9, R3-19 | COVERED | U2-5 keeps 1992-02-20, so no placeholder on update (question 27 (a)); build pending. |
| BT-083 | PLANNED | not state-dependent: U2-5 | — | — | R3-13e | U2-5, R3-9 | COVERED | Question 27 (a) decided 2026-11-24 for BT/RBT; NJ proof R3-9; build pending. |
| BT-084 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Unreadable filled date; `employeePayloadMapping.test.mjs:248` and "[GER-REQ] an unreadable employee date of birth…". |
| BT-085 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs the key removed from HubSpot's answer; "[GER-REQ] a missing employee date_of_birth property is an error". |
| BT-086 | PENDING | — | — | — | — | — | BLOCKED | Waits on United Care's answer via Danny (guide L757 q6). |
| BT-087 | PROVEN-LIVE | not state-dependent: T3 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | T3 values rotate per round (female / male / female; U1 male). |
| BT-088 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a gender CR cannot take; `f1UnreadableValues.test.mjs` "[T3][5.9]"; unreadable path live on U-39. |
| BT-089 | PROVEN-LIVE | not state-dependent: T4 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Create proven R1; update half K5 (Contact address). |
| BT-090 | PROVEN-LIVE | not state-dependent: T4 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Create proven R1; update half U-36 (Contact city). |
| BT-091 | PROVEN-LIVE | T4 (R1), R1-3 | n/a: NY row (CO is BT-092) | n/a: NY row (NJ is BT-093) | R1-3, R1c-3, R3b-3 | U-36 | COVERED | New York → NY proven R1; sent on every R1 update. |
| BT-092 | PLANNED | n/a: CO row (NY is BT-091) | T4 (R2), R2-3 | n/a: CO row (NJ is BT-093) | R2-3, R3b-3 | R2-23f | COVERED | Colorado → CO on create and on each CO update. |
| BT-093 | PLANNED | n/a: NJ row (NY is BT-091) | n/a: NJ row (CO is BT-092) | T4 (R3), R3-6, R3-14 | R3-13e | R3-6, R1b-3, R2b-3 | COVERED | New Jersey → NJ (R3-14 `stateProvince` NJ). |
| BT-094 | PROVEN-LIVE | not state-dependent: T4 | — | — | R1-3, R1c-3, R3b-3 | R3-14 | COVERED | R3-14: NJ ZIP keeps its leading zero. |
| BT-095 | PROVEN-LIVE | T4 (R1 `x12`), R1-3 | T4 (R2 `(303)`), R2-3 | T4 (R3 `001`), R3-14 | R2-3, R3b-3 | R3-14 | COVERED | Input form rotates per round; 10 digits sent. |
| BT-096 | OFFLINE-ONLY | not state-dependent: U-39 | — | — | U-02 | U-39 | COVERED | U-39 phone `12345` → `error`, no CR write; state and create halves offline (`f1UnreadableValues.test.mjs`). |
| BT-097 | PLANNED | not state-dependent: BR16 | — | — | U-02 | U2-5, R3-9, R3-19 | COVERED | R1-U2 BT/RBT 1 (BR16): written fields cleared; DOB sent back (U2-5). |
| BT-098 | PROVEN-LIVE | not state-dependent: T5 | — | — | R1-3, R1c-3, R3b-3 | U-36 | COVERED | Create proven R1; U1 blank (T5); O-20 still open. |
| BT-099 | PROVEN-LIVE | not state-dependent: T6 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Meta 133819 text (R1 proven); street update in U-36. |
| BT-100 | PROVEN-LIVE | not state-dependent: T6 | — | — | R1-3, R1c-3, R3b-3 | U-36 | COVERED | Blank suite left out of the text (T6 U1). |
| BT-101 | PROVEN-LIVE | not state-dependent: T6 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | `city__work_` in Meta 133819 (R1 proven). |
| BT-102 | PLANNED | T6 (R1 NY), R1-3 | T6 (R2 CO), R2-3 | T6 (R3 NJ), R3-6 | R2-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | Work state sent as typed, per round. |
| BT-103 | PROVEN-LIVE | not state-dependent: T6 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | `postal_code__work_` in Meta 133819 (R1 proven). |
| BT-104 | PLANNED | T7 (R1), R1F-1 | R2-15 | R3-8 | R2-15 | R3-8 | COVERED | Question 13 decided: prerequisite P-7 (Zeke fixes the "BT - Active Cases Sync" enrolment); fallback: the testing chat hand-sets `active_cases_count` before S3a (mapping proof). R2-15 (CO, webhook), R3-8 (NJ, poller). |
| BT-105 | PLANNED | not state-dependent: R2-15 | — | — | R2-15 | R3-8 | COVERED | As BT-104. |
| BT-106 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Count is a stored number (0, never blank) live; `employeeGuideMappings.test.mjs:144`. |
| BT-107 | RETIRED | — | — | — | — | — | RETIRED | Question answered 11/13 and 11/16 (guide L438). |
| BT-108 | PLANNED | not state-dependent: R3-6 (T1 Screen) | n/a: NY row (CO is BT-109) | n/a: NY row (NJ-only is BT-110) | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | R3-6 reads the labels "Behavior Technician NY" sets; R1 evidence indirect. `Behavior Technician NY` is the default form branch (`centralReachClient.mjs:44-55`). |
| BT-109 | PLANNED | n/a: CO row | T1 (R2), R2-3, R2-26, R2b-3 | n/a: CO row | R2-3, R2-26 | R2b-3 | COVERED | Question 15 closed as recommended 2026-11-24 (`RBT CO`). Webhook R2-3 / R2-26 Screen check; poller R2b-3 (CO BT/RBT poller create; run-sheet change AB-5 applied). |
| BT-110 | OFFLINE-ONLY | n/a: NJ-only row | n/a: NJ-only row | T1 (R3), R3-6 | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | R3 BT/RBT 1 is NJ only (2026-11-24): form "Behavior Technician NY", NY labels removed. |
| BT-111 | PLANNED | — | — | — | — | — | OFFLINE-ONLY | Question 14 route made R3 NJ-only, so no NJ+NY create; `centralReachEmployeeContactForm.test.mjs:28`. |
| BT-112 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Blank Work States create; `centralReachEmployeeContactForm.test.mjs:40`. |
| BT-113 | MISSING-TEST | — | — | — | — | — | OFFLINE-ONLY | Logs carry no request bodies (master F24). [apply-recheck] Re-check check 4: the employee-PUT test now exists: `centralReachEmployeeContactForm.test.mjs` "[T1][B1][5.13] an employee update never carries ContactForm: a linked Colorado BT/RBT and a linked BCBA get PUTs without it". |
| BT-114 | PROVEN-LIVE | not state-dependent: TL4 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | All Employees and Clinical on every create (R1 proven). |
| BT-115 | PROVEN-LIVE | TL1 (R1), R1-3 | n/a: NY row (CO is BT-116) | n/a: NY row (NJ is BT-117) | R1-3, R1c-3, R3b-3 | R3-7 | COVERED | R3-7 adds NY Employee by poll (New Jersey;New York). |
| BT-116 | PLANNED | n/a: CO row (NY is BT-115) | TL1 (R2), R2-3 | n/a: CO row (NJ is BT-117) | R2-3, R3b-3 | R2-20 | COVERED | R2-20 keeps CO Employee by poll; TL1 U1b adds CO on R1. |
| BT-117 | PLANNED | n/a: NJ row (NY is BT-115) | n/a: NJ row (CO is BT-116) | TL1 (R3), R3-6 | R3-13e | R3-6, R1b-3, R2b-3 | COVERED | NJ Employee 1107686 on the R3 create. |
| BT-118 | PLANNED | R2-20, R3-7 (NY half) | R2-20 | R3-7 | R2-23e | R2-20, R3-7 | COVERED | Two Work States → two state labels. |
| BT-119 | PLANNED | TL1 (U1b) | TL1 (U1b) | R3-6 | U-21 | R3-6, R1b-3, R2b-3 | COVERED | U1b: R1 BT/RBT 1 → Colorado removes NY Employee; R3-6 removes the form's NY labels. |
| BT-120 | DEFERRED | — | — | — | — | — | DEFERRED | New Mexico deferred (Zeke 2026-11-23); TL2 shows the deferred behaviour. |
| BT-121 | DEFERRED | — | — | — | — | — | DEFERRED | Virginia deferred (Zeke 2026-11-23); R3-12 warning-only on Zeke's word. |
| BT-122 | PROVEN-LIVE | TL3 (R1), R1-3 | n/a: NY row (CO is BT-123) | n/a: NY row (NJ is BT-124) | R1-3, R1c-3, R3b-3 | R2-20 | COVERED | R2-20 adds BT NY by poll. |
| BT-123 | PLANNED | n/a: CO row (NY is BT-122) | TL3 (R2), R2-3 | n/a: CO row (NJ is BT-124) | R2-3, R3b-3 | R2-20 | COVERED | BT CO 1132650 on the CO create; kept through R2-20. |
| BT-124 | OFFLINE-ONLY | n/a: NJ row (NY is BT-122) | n/a: NJ row (CO is BT-123) | TL3 (R3), R3-6 | R3-13e | R3-6, R1b-3, R2b-3 | COVERED | Now live: R3 BT/RBT 1 is a BT, NJ only (question 14 route). |
| BT-125 | PLANNED | TL3 (U1a) | n/a: NY row (CO is BT-127) | R3-7 (RBT NY added) | U-21 | R3-7 | COVERED | RBT NY 1052631 from U1a (R1) and R3-7. |
| BT-126 | PLANNED | n/a: NJ row (NY is BT-125) | n/a: NJ row (CO is BT-127) | R3-7 | R3-13e | R3-7 | COVERED | RBT NJ 1132651 on R3-U1. |
| BT-127 | PLANNED | n/a: CO row (NY is BT-125) | TL3 (U1b) | n/a: CO row (NJ is BT-126) | U-21 | U-36 | COVERED | U1b: R1 BT/RBT 1 (RBT) → Colorado adds RBT CO 1107692. |
| BT-128 | PLANNED | R2-20, R3-7 (NY half) | R2-20 | R3-7 | R2-23e | R2-20, R3-7 | COVERED | One role label per Work State. |
| BT-129 | PROVEN-LIVE | not state-dependent: TL3 | — | — | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | `bt_to_rbt_path` decoy set; role labels unchanged. |
| BT-130 | PLANNED | TL3 (U1a) | n/a: NY row (type change) | R3-7 | U-21 | R3-7 | COVERED | BT → RBT: U1a (NY) and R3-7 remove BT, add RBT. |
| BT-131 | PLANNED | not state-dependent: TL3 | — | — | U-21 | U-36 | COVERED | TL3 U1c (blank) and U1d ("BT to RBT", warning `unmapped_bt_rbt_type`). |
| BT-132 | PLANNED | not state-dependent: U-29 (BT/RBT 1) | — | — | U-29 | U-29 | COVERED | U-29 now includes R1 BT/RBT 1: `test_record` = true + `home_apt` edit → `skipped` `test_record` (S6a, both; run-sheet change AB-10 applied). |
| BT-133 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Production config rule; `configSmoke.test.mjs`, `stage3WebhookAndSettings.test.mjs`; SU-3 shows it absent. |
| BT-134 | OFFLINE-ONLY | not state-dependent: R3-6 | — | — | path n/a: poller create branch | R3-6, R1b-3, R2b-3 | COVERED | R3-6: entry workflow off; the poll finds Entered = Yes and creates. |
| BT-135 | PLANNED | U-38 | R2-23f | R3-13f | path n/a: poller linked branch | U-38, R2-23f, R3-13f | COVERED | Linked BT/RBT changed since the checkpoint is updated by the poll, per state. |
| BT-136 | PROVEN-LIVE | not state-dependent: R1F-1 | — | — | R1F-1 | S8-1 | COVERED | R1F-1 next run `noop`; S8-1 sweep mostly `noop`. |
| BT-137 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Forced race; lease tests `stage2DurableState.test.mjs`; live analogue is Case-only (BR14, U-43). |
| BT-138 | PLANNED | not state-dependent: S8-3 | — | — | S8-3 | path n/a: queue retries are the same after either source | BLOCKED | BLOCKED (S8-3 forced-failure method, run-sheet open question 3; email receiver S9, Azure write; Zeke). Then S8-3: BT/RBT, S10, webhook start: retries 60 s / 150-300 s / 15 min / 1 h / 4 h, dead-letter, one email with no child name and no values. |
| BT-139 | PLANNED | — | — | — | — | — | OFFLINE-ONLY | Observed only if a label POST is unconfirmed (R-WD saw labels confirmed on the first read). Offline: `stage3LabelWorkerSide.test.mjs:262`. Promote to COVERED if S3a logs `delaySeconds: 150` (R2-16 / G-9). |
| BT-140 | PLANNED | not state-dependent: R1F-1 | — | — | R1F-1 | path n/a: one-time deploy event; the poller is on from S3c-0 | COVERED | Conflict settled (review C B1): the first run after the deploy is a full re-send (every field in `changedFieldNames`), judged on the values; later runs `noop` (R1F-1). [apply-recheck] Re-check: "poller off until S2" was stale. |
| BT-141 | OFFLINE-ONLY | not state-dependent: U-34 | — | — | R2-14, R2-2 | U-34 | COVERED | U-34 6-digit → `error`, no CR call; R4-1 7-digit accepted; update half offline. |
| BT-142 | PENDING | — | — | — | — | — | PHASE-TWO | Existing production Workday IDs (D20, Zeke "I will handle this"); item 15 errors them meanwhile. |
| BT-143 | BLOCKED | — | — | — | — | — | BLOCKED | Waits on United Care (RG D10, O-23; master C13). |
| BT-144 | PENDING | — | — | — | — | — | PHASE-TWO | Existing production records; `external_system_id` not read by the integration. |
| BT-145 | PENDING | — | — | — | — | — | DOCUMENTATION | Guide answer not written (Zeke 11/20: nothing reads it); waits on the guide write. No sandbox row needed (no behaviour); unblocks on Zeke's guide write. [apply-recheck] Re-check check 5: no behaviour to test; reclassed from BLOCKED to DOCUMENTATION (waits on Zeke's guide write; not an end-to-end gap). |
| BT-146 | PENDING | — | — | — | — | — | BLOCKED | Waits on O-51 (Danny and United Care confirm the field); T9 held. |
| BT-147 | PROVEN-LIVE | not state-dependent: C14 | — | — | U-06 | U-13 | COVERED | Case side (slice 02): C14 names; U-06 by webhook, U-13 by poll. |
| BT-148 | NOT-BUILT | not state-dependent: SU-7 | — | — | path n/a: manual process step | path n/a: manual process step | COVERED | SU-7: `sandbox-test-log.md` filled (R1, R4 at S0; later rounds at S11). [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| BT-149 | MISSING-TEST | — | — | — | — | — | RETIRED | RETIRED: O-34 naming convention (names use "RN"); the same guide line is RETIRED for CASE-201 and BCBA-176; master F23. |
| BT-150 | PLANNED | U-36 | R2-23e | R3-13e | U-02 | U-36 | COVERED | Field list per slice Gaps (f) 1; Contact fields U-33; CO / NJ one update per path. |
| BT-151 | MISSING-TEST | not state-dependent: R3-8 | — | — | path n/a: no user edit; W2 has no `active_cases_count` trigger (L442) | R3-8 | BLOCKED | BLOCKED on prerequisite P-7 (Zeke): the automation-driven count change needs the "BT - Active Cases Sync" enrolment. If it cannot be fixed in the sandbox: PRODUCTION-ONLY (production holds it as a plain number; 4.10 check). |
| BT-152 | PLANNED | not state-dependent: R2-14 | — | — | X04-1 | R2-14, X04-4 | COVERED | "External System ID" tick in R2-14; Medicaid-only is not a tick via X04-4. |
| BT-153 | PLANNED | not state-dependent: U-40 | — | — | path n/a: HubSpot report read | path n/a: HubSpot report read | BLOCKED | BLOCKED (N6: HubSpot failures report and waiting view not built; Zeke builds them in the sandbox). Then U-40. |
| BT-154 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs CR to reject a create or answer 409; `duplicateSafety.test.mjs` "R11: a rejected employee create…". |
| BT-155 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a property missing from HubSpot's answer; `stage4EmployeeMissingKeys.test.mjs` (matrix Offline table). |
| BT-156 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Master 4.10 "first production run per object type routes correctly"; 6.3 item 2. |

## Slice 05: Client labels (05-client-labels.md)

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| CLB-001 | RETIRED | — | — | — | — | — | RETIRED | L605 11/14 Danny: go-live without Pessy; L609 11/18 labels created. |
| CLB-002 | RETIRED | — | — | — | — | — | RETIRED | BUILD-PLAN decision 13 (2026-11-20): label hold lifted; managed sender removes labels. |
| CLB-003 | PROVEN-LIVE | not state-dependent: R1F-5 | — | — | R1F-5 | path n/a: one-time CR label test, done 2026-11-20 on employee 5338681 | COVERED | Test done (BUILD-PLAN section 4); R1F-5 shows removal live on a client. |
| CLB-004 | RETIRED | — | — | — | — | — | RETIRED | Decision 13: CR can replace labels; the condition never occurred. |
| CLB-005 | RETIRED | — | — | — | — | — | RETIRED | Decisions 13, 15; G19 L220: three staffing IDs are sent (see CLB-020..023). |
| CLB-006 | RETIRED | — | — | — | — | — | RETIRED | Decision 13: the G18 label test ran 2026-11-20. |
| CLB-007 | RETIRED | — | — | — | — | — | RETIRED | Decision 13: Active / Inactive label hold lifted (CLB-010, CLB-011). |
| CLB-010 | PROVEN-LIVE | CL3 (R1), R1-1 | CL3 (R2), R2-11 | CL3 (R3), R3-1 | R1-1, R1c-1, R2-11, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Warm → Active Client 1125427; CO Case goes Cold → Warm in R2-11. |
| CLB-011 | PLANNED | CL3 (U1), U-17 | CL3 (R2), R2-1 | not state-dependent: R2-1 | R2-1, U-17, R3b-1 | R2-13 | COVERED | Cold → In-Active 1121488; R2-13 moves the CO Case to Paused by poller. |
| CLB-012 | PLANNED | U-17 | R2-11, R2-13 | not state-dependent: R2-11 | U-17, R2-11 | R2-13 | COVERED | Both directions: Warm→Cold (U-17, R2-13), Cold→Warm (R2-11); never both labels. |
| CLB-013 | PLANNED | BR18 (status flip), U-16 | R2-24, R2-13 | not state-dependent: R2-24 | U-19 | BR18, R2-24, U-16 | COVERED | Stage-driven `case_status`, no edit of the property; U-19 is a stage move by webhook. |
| CLB-014 | OFFLINE-ONLY | U-16 | R2-13 | not state-dependent: U-16 | U-19 | U-16, R2-13 | COVERED | Paused gives blank staffing + In-Active: R2-13 (labels: Staffed 97153 removed, In-Active added); U-16 (In-Active still held after a run with blank `staffing_status`). |
| CLB-015 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | T-CL:101; stage-driven `case_status` holds only Warm / Cold in sandbox and production. |
| CLB-020 | PROVEN-LIVE | CL4 (R1), R1-1 | CL4 (R2), R2-1 | CL4 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Label from `staffing_status` itself; R1 Case at first stage still got 1156746. |
| CLB-021 | PLANNED | not state-dependent: R2-1 | CL4 (R2), R2-1 | — | R2-1, R3b-1 | R2-23b | COVERED | 97151 Services → 1156743; R2-23b (S3d) runs while the CO Case still holds it. |
| CLB-022 | PROVEN-LIVE | CL4 (R1), R1-1 | R2-10 | not state-dependent: R1-1 | R1-1, R1c-1, R2-10, R3b-1 | R2-5 | COVERED | Staffed 97153 → 1156746; R2-5 (S5a poller) runs on the CO Case after R2-10. |
| CLB-023 | PLANNED | not state-dependent: R3-1 | — | CL4 (R3), R3-1 | R3-13a | R3-1, R1b-1, R2b-1 | COVERED | X 97153 → 1156747 on the NJ poller create. |
| CLB-024 | RETIRED | — | — | — | — | — | RETIRED | G19 L222: Pending 97151 1156742 never sent; removal check rides R1F-5. |
| CLB-025 | RETIRED | — | — | — | — | — | RETIRED | G19 L222: Pending 97153 1156744 never sent; gone from the CR catalog. |
| CLB-026 | RETIRED | — | — | — | — | — | RETIRED | G19 L222: Starting 97153 1156745 never sent; gone from the CR catalog. Old line 59 moves to S5d so its run sees Starting 97153 (AB-9 applied). |
| CLB-027 | PLANNED | not state-dependent: R1F-5 | — | — | R1F-5 | U-16 | COVERED | R1F-5: hand-added 1156742 removed; U-16 removes the managed staffing group by poller. |
| CLB-028 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `laneLLabelSender.test.mjs` "[BR19][CL4][L.1] a remove-only ID that CentralReach holds is left out of the post and does not block it"; T-P6:100; R1 POSTs already ran with 1156744 / 1156745 missing from the catalog. [apply-recheck] Re-check: title replaces T-LS:150. |
| CLB-029 | OFFLINE-ONLY | not state-dependent: R2-10 | R2-10 | — | R2-10 | BR18, R2-24 | COVERED | Gap G2 is now R2-10: one POST, 1156743 off, 1156746 on. |
| CLB-030 | OFFLINE-ONLY | not state-dependent: R2-13 | R2-13 | not state-dependent: R2-13 | U-19 | R2-13 | COVERED | Blank `staffing_status` (Paused) removes the staffing label: R2-13's expected value now states it (R2 Case holds Staffed 97153 from R2-10). U-16 changes no label (the R1 Case holds none since S4). |
| CLB-031 | PROVEN-LIVE | CL4 (R1), R1-1 | R2-10 | CL4 (R3), R3-1 | R1-1, R1c-1, R2-10, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | One staffing label at a time; `check-cr-record.mjs` checks the managed group. |
| CLB-032 | PLANNED | CL4 (U1), U-21; not state-dependent: CL4 (U1) | — | — | U-01, U-21 | U-05 | COVERED | R1 → Hot Lead: no staffing label, 1156746 removed. [apply-recheck] Re-check: "not state-dependent" moved from the CO cell to the NY cell. |
| CLB-033 | OFFLINE-ONLY | not state-dependent: X05-1 | — | — | X05-1 | R2-23b (generic; label rules have no path branch) | COVERED | X05-1: R1 Case `staffing_status` → Warm Lead (S6a), Cold Lead (S6b), Processing Leads (S7), each with one Case edit → no staffing label, no label POST (run-sheet changes AB-10 to AB-12 applied). |
| CLB-034 | OFFLINE-ONLY | not state-dependent: X05-1 | — | — | X05-1 | R2-23b (generic; label rules have no path branch) | COVERED | X05-1: R1 Case `staffing_status` → Warm Lead (S6a), Cold Lead (S6b), Processing Leads (S7), each with one Case edit → no staffing label, no label POST (run-sheet changes AB-10 to AB-12 applied). |
| CLB-035 | OFFLINE-ONLY | not state-dependent: X05-1 | — | — | X05-1 | R2-23b (generic; label rules have no path branch) | COVERED | X05-1: R1 Case `staffing_status` → Warm Lead (S6a), Cold Lead (S6b), Processing Leads (S7), each with one Case edit → no staffing label, no label POST (run-sheet changes AB-10 to AB-12 applied). |
| CLB-036 | RETIRED | — | — | — | — | — | RETIRED | L605 (11/06): `Staffed` / `X Staffed` no longer exist in sandbox or production options. |
| CLB-037 | OFFLINE-ONLY | not state-dependent: R2-13 | R2-13 | not state-dependent: R2-13 | U-19 | R2-13, U-16 | COVERED | Paused / Discharged (R2-13) and Paused (U-16) send no staffing label; R2-13 states the removal. |
| CLB-038 | PLANNED | not state-dependent: R2-12 | R2-12 | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | Four Cleanup stages: webhook `skipped` `excluded_stage`; poll does not queue (BR6). Create half: X01-4 (AB-4 applied). |
| CLB-039 | PLANNED | not state-dependent: X07b-3b | X07b-3b | R2-10, U-17 (stand-in) | R2-10, U-17 (staffing_status webhook) | X07b-3b | BLOCKED | BLOCKED (Zeke, open decision 3): X07b-3b is designed per Zeke's preference (CO poller half from day 1 evening to day 2 13:00 ET, Case webhook workflows off for that run; NJ webhook half by the existing `staffing_status` webhook rows R2-10, U-17; no day 3). Missing fact, in no repo source (guide snapshot, slices, src, scripts searched 2026-11-24): the HubSpot internal name of the BT 1 start-date property the 1 PM workflow reads, and whether sandbox 52311591 runs the 1 PM scheduled workflow. Stand-in meanwhile: R2-13 (a stage-driven `staffing_status` change made by HubSpot, consumed by the poller, CO) and R2-10 / U-17 (`staffing_status` by webhook). |
| CLB-040 | MISSING-TEST | CL4 (R1), R1-1 | R2-24 | not state-dependent: R1-1 | R1-1, R1c-1, R3b-1 | BR18, R2-24 | COVERED | Labels follow `staffing_status`, not the stage (R1 first stage → 1156746). Offline test O3 still to add. |
| CLB-041 | RETIRED | — | — | — | — | — | RETIRED | L611: stage table is reference only (HubSpot automation). |
| CLB-042 | RETIRED | — | — | — | — | — | RETIRED | L611 reference only; integration side is CLB-021. |
| CLB-043 | RETIRED | — | — | — | — | — | RETIRED | L611; G19 L222: Starting 97153 has no CR label. |
| CLB-044 | RETIRED | — | — | — | — | — | RETIRED | L611; G19 L222: Pending 97153 has no CR label. |
| CLB-045 | RETIRED | — | — | — | — | — | RETIRED | L611 reference only; integration side CLB-022, CLB-023. |
| CLB-046 | RETIRED | — | — | — | — | — | RETIRED | L611 reference only (HubSpot automation). |
| CLB-047 | RETIRED | — | — | — | — | — | RETIRED | L629 / L1496 (Sara 11/06): Paused has no staffing label. |
| CLB-048 | RETIRED | — | — | — | — | — | RETIRED | L629 replaces L651 (X 97153). |
| CLB-049 | RETIRED | — | — | — | — | — | RETIRED | G19 L228: lead buckets stay in HubSpot. |
| CLB-050 | PENDING | — | — | — | — | — | BLOCKED | Waits on United Care (L637: lead-age timing basis); no integration effect. |
| CLB-051 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Add to master 4.10: read production Reassessment-stage Cases' `staffing_status` (L639). |
| CLB-052 | PLANNED | BR1, R1-1 | SU-5, R2-1 | R3-1 | SU-5, R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | SU-5: R2 Case webhook before Yes → `skipped` `entry_not_yes`; creates only after Yes. |
| CLB-060 | PROVEN-LIVE | CL1 (R1), R1-1 | n/a: NY label only (CO: CL1 (R2)) | n/a: NY label only (NJ: CL1 (R3)) | R1-1, R1c-1, R3b-1 | R2-23b (generic Case label update by poller) | COVERED | NY Client 1082499. The R1 Case moves to NJ in S4, so U-16 no longer checks NY Client. |
| CLB-061 | PLANNED | n/a: CO label only (NY: CL1 (R1)) | CL1 (R2), R2-1 | n/a: CO label only (NJ: CL1 (R3)) | R2-1, R3b-1 | R2-23b | COVERED | CO Client 1132648. |
| CLB-062 | PLANNED | CL1 (U1), U-48 | n/a: NJ label only (CO: CL1 (R2)) | R3-20 (CL1 on the update path) | R3-13a | R3-20, R3-13b | COVERED | NJ Client 1132647 arrives at R3-20 (the R3 Case is created with `location` blank); the NY Case moves to NJ via the Guardian Contact (U-48). |
| CLB-063 | PLANNED | not state-dependent: U-48 (the managed-group rule is state-agnostic; NY → NJ proven) | — | — | U-48 | U-48 | COVERED | NY removed, NJ added; U-48 records `source`; the Case `location` is on the Case trigger list (SU-6, K6), not O-21. [pending Zeke: Contact workflow confirmation] [apply-recheck] Re-check: marked not state-dependent; slice 05 "no change from or to CO" stays a slice note. |
| CLB-064 | PLANNED | not state-dependent: R2-11, R2-13 | R2-1, R2-11 | not state-dependent: R2-11, R2-13 | R2-11 | R2-13 | COVERED | State label kept across Active / Inactive: CO Client kept at R2-11 (webhook) and R2-13 (poller). U-17 now expects NJ Client (U-48 in the same push). |
| CLB-065 | PROVEN-LIVE | CL1 (R1), R1-1 | CL1 (R2), R2-1 | CL1 (R3), R3-20 | R1-1, R1c-1, R2-1, R3b-1 | R3-20, R3-13b | COVERED | Case `location` (from Guardian Contact) is the source in every round. |
| CLB-066 | OFFLINE-ONLY | not state-dependent: R3-1 | — | — | R3b-1 | R3-1 | COVERED | The R3-pattern Case is created with `location` blank (U2-6): no state label posted; `check-cr-record.mjs` CL1 R3 wants [] in the 3-label group. Webhook: R3b-1 (round 6, same pattern; AB-4 applied). |
| CLB-067 | DEFERRED | — | — | — | — | — | DEFERRED | NM: Zeke 2026-11-23 "pending the client beginning work in these states"; no Case option. |
| CLB-068 | DEFERRED | — | — | — | — | — | DEFERRED | VA: Zeke 2026-11-23; no Case option, no VA Client label. |
| CLB-069 | PLANNED | U-48 | not state-dependent: U-48 | CL1 (U1), U-48 | U-48 | U-48 | COVERED | Guardian Contact state → Case `location` → client label; Case path (U-48, SU-6, R3-20). [pending Zeke: Contact workflow confirmation] |
| CLB-070 | PROVEN-LIVE | CL2 (R1), R1-1 | not state-dependent: CL2 (R1) | not state-dependent: CL2 (R1) | R1-1, R1c-1, R3b-1 | U-18 | COVERED | Child's House → Home 1052656; U-18 changes `specific_home_location` (both). |
| CLB-071 | PLANNED | not state-dependent: R3-1 | — | CL2 (R3), R3-1 | R3-13a | R3-1, R1b-1, R2b-1 | COVERED | More Than One Location → Home on the NJ create. |
| CLB-072 | PLANNED | CL2 (U1), U-21 | CL2 (R2), R2-1 | not state-dependent: R2-1 | R2-1, U-21, R3b-1 | U-18 | COVERED | Other Location → no Home; R1 U1 removes Home. |
| CLB-073 | DEFERRED | — | — | — | — | — | DEFERRED | L666 (11/09 Zeke): no HubSpot School option yet. |
| CLB-074 | DEFERRED | — | — | — | — | — | DEFERRED | L666: no HubSpot Clinic option yet. |
| CLB-075 | PLANNED | not state-dependent: R1F-5 | — | — | R1F-5 | U-16 | COVERED | Hand-added School 1052688 kept; GET labels on U-16 shows it still held. |
| CLB-080 | PROVEN-LIVE | CL5 (R1), R1-1 | CL5 (R2), R2-1 | CL5 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | No funding label in any round; U1 UHC also none. |
| CLB-081 | RETIRED | — | — | — | — | — | RETIRED | G19 L226: no payor tags in CR. |
| CLB-082 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-083 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-084 | RETIRED | — | — | — | — | — | RETIRED | G19 L226; "never sent" shown by CL5 R1. |
| CLB-085 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-086 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-087 | RETIRED | — | — | — | — | — | RETIRED | G19 L226: no funding label to resolve a state for. |
| CLB-088 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-089 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-090 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-091 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-092 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-093 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-094 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-095 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-096 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-097 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-098 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-099 | RETIRED | — | — | — | — | — | RETIRED | G19 L226; "never sent" rides CL5 U1 (UHC) once `caseU1` holds a CL5 row (AB-17 applied). |
| CLB-100 | RETIRED | — | — | — | — | — | RETIRED | G19 L226; "never sent" rides CL5 (R3) at R3-1 (funding labels are never sent, whatever the state). |
| CLB-101 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-102 | RETIRED | — | — | — | — | — | RETIRED | G19 L226. |
| CLB-103 | RETIRED | — | — | — | — | — | RETIRED | G19 L226; "never sent" rides CL5 R2 (Other, CO). |
| CLB-104 | OFFLINE-ONLY | R1F-5 | not state-dependent: R1F-5 | not state-dependent: R1F-5 | R1F-5 | U-05 (generic; the managed list never touches funding labels) | COVERED | Zeke hand-adds Aetna NY 1082497 on client 5384589 in S0 (CR write by hand; AB-2); R1F-5 expects it kept; `caseU1` row "CLB-104 funding kept" (AB-17 applied). |
| CLB-110 | PROVEN-LIVE | CL6 (R1), R1-1 | CL6 (R2), R2-1 | CL6 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | All Clients 1052619 on every client. |
| CLB-111 | PLANNED | not state-dependent: R1F-5 | — | — | R1F-5 | U-16 | COVERED | Unmapped hand-added School kept (set = held − managed + required). |
| CLB-112 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `laneLLabelSender.test.mjs` "[BR19][L.1] an empty set is never posted"; cannot occur live (All Clients always required). [apply-recheck] Re-check: title replaces T-LS:164. |
| CLB-113 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `laneLLabelSender.test.mjs` "[BR19][L.1] a required label outside the sendable list is never posted: CR_LABEL_NOT_SENDABLE, permanent", "[BR19][L.1] a required label the live catalog does not hold is not posted: CR_LABEL_NOT_IN_CATALOG, retried", "[BR19][L.1] a label CentralReach's own read returned that the catalog does not hold blocks the post"; T-P3:63, 135; T-P6:73. [apply-recheck] Re-check: titles replace T-LS:86, 117, 138. |
| CLB-114 | PROVEN-LIVE | not state-dependent: BR19 | — | — | U-01 | U-05 | COVERED | R1 Case runs 16:24:40, 16:30:49: labelRead, no labelPost; U-05 shows the poller side. |
| CLB-115 | PROVEN-LIVE | not state-dependent: BR19 | — | — | R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | R1 Case POST unconfirmed then retried to success (R1L 116-121). |
| CLB-116 | PROVEN-LIVE | not state-dependent: BR19 | — | — | R1-1, R1c-1, R3b-1 | U-43 | COVERED | `skip_window` held the R1 Case retries; U-43 covers webhook + poller at once. |
| CLB-117 | NOT-BUILT | not state-dependent: R2-16 | — | — | R2-16 | path n/a: queue retry delay is set by the worker, same for any source | COVERED | Item 12 deployed in the working-tree build; Log `delaySeconds: 150`. |
| CLB-118 | NOT-BUILT | — | — | — | — | — | DEFERRED | DEFERRED (dated: package item 21, "before the existing-records phase"; item 21 applies to new records too, so not PHASE-TWO). Not built. Zeke's call 4. |
| CLB-119 | PROVEN-LIVE | R1-1 | R2-1 | R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Create run posts required labels on an empty read (`labelsPending`). |
| CLB-120 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `laneLLabelSender.test.mjs` "[BR19][BR16][L.2] an empty read for a contact this run did not create posts nothing: CR_LABEL_READ_EMPTY, retried"; cannot be staged safely live. [apply-recheck] Re-check: title replaces T-LS:337. |
| CLB-121 | PROVEN-LIVE | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | POST body accepted (R1 Case POST 200); 400 half is CLB-150. |
| CLB-122 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | T-WS:321; generic dead-letter path is S8-3. |
| CLB-123 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `laneLLabelSender.test.mjs` "[BR19][L.1] a label CentralReach's own read returned that the catalog does not hold blocks the post"; live deleted-label test only if Zeke keeps it (05 question 2). [apply-recheck] Re-check: title replaces T-LS:138. |
| CLB-130 | MISSING-TEST | not state-dependent: U-21 | — | — | U-21 | path n/a: webhook requirement (poller side is CLB-131) | COVERED | U-21: one edit per label source, first-run `source` recorded (gap G6). |
| CLB-131 | PLANNED | not state-dependent: U-16 | — | — | path n/a: poller requirement (webhook side is CLB-130) | U-16, R2-13, BR18 | COVERED | Label-source changes found by the 5-minute poll. |
| CLB-132 | PLANNED | — | — | — | — | — | OFFLINE-ONLY | OFFLINE-ONLY (Zeke's call 2): a label change cannot be caught by the sweep alone (the 5-minute poll sees `hs_lastmodifieddate` first; the sweep runs inside the poller function). Offline `stage3DailySweep.test.mjs`; live S8-1 (the sweep re-runs linked records); S8-2 redefined. |
| CLB-133 | RETIRED | — | — | — | — | — | RETIRED | Fan-out route superseded by the Case sync (recency audit section C; slice 05 RETIRED); U-48 / R3-20 prove the Case path. [pending Zeke: Contact workflow confirmation] |
| CLB-134 | PLANNED | not state-dependent: BR14 (webhook and poller at once) | — | — | U-43 | U-43 | COVERED | One label POST when webhook and poller runs overlap (lease, 150 s window). |
| CLB-150 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `laneLLabelSender.test.mjs` "[BR19][L.4] a 400 on the label POST makes one call only and is a permanent failure" and "[BR19][L.4] a 4xx on the label POST carries no posted set"; a 400 cannot be staged safely live. [apply-recheck] Re-check: titles replace T-LS:714, 884. |
| CLB-151 | MISSING-TEST | CL4 (R1), R1-1 | CL4 (R2), R2-10 | CL4 (R3), R3-1 | R1-1, R1c-1, R2-10, R3b-1 | R3-1, R2-13 | COVERED | Every sent staffing value; the blank removal is R2-13 (CO, poller). |
| CLB-152 | PLANNED | U-18; not state-dependent: U-18 | — | — | U-01, U-18 | U-05, U-18 | COVERED | U-18: Entered blank, `specific_home_location` change, label follows (gap G12). [apply-recheck] Re-check: "not state-dependent" moved from the CO cell to the NY cell. |
| CLB-153 | PLANNED | U-48, CL2 (U1) | R2-11 | not state-dependent: U-48 | R2-11 | U-48 | COVERED | Question 19 closed 2026-11-24 as recommended. State removal U-48; Home removal CL2 U1 (line 43); status replacement R2-11. |
| CLB-154 | PROVEN-LIVE | CL4 (R1), R1-1 | CL4 (R2), R2-1 | CL4 (R3), R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Parent 1156741 never sent; exact-set check, no extras. The exact-set check needs AB-17: 1156741 in the CL4 group; [1156743, 1156746, 1156747] with want [] in BL8 / TL4 (pending). |
| CLB-155 | PROVEN-LIVE | BL8 (R1), R1-3 | TL4 (R2), R2-3 | TL4 (R3), R3-6 | R1-3, R1c-3, R2-3, R3b-3 | R3-3, R3-6, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Employee exact label sets hold no staffing label. The exact-set check needs AB-17: 1156741 in the CL4 group; [1156743, 1156746, 1156747] with want [] in BL8 / TL4 (pending). |
| CLB-156 | PLANNED | not state-dependent: R2-9 | R2-9 | — | R2-9 | R2-9 | COVERED | Wrong Client ID: no update, metadata or labelPost; record which path ran first. |
| CLB-157 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | T-LS:840, 866; timeout / 5xx cannot be staged safely. |
| CLB-158 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | T-LS:369, 382. |
| CLB-159 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `laneLLabelSender.test.mjs` "[BR19][L.1] when the label step throws, no metadata field is written". [apply-recheck] Re-check: title replaces T-LS:218. |
| CLB-160 | NOT-BUILT | — | — | — | — | — | BLOCKED | Waits on package item 20 (not built, "before cutover"; master 5.2, N3). [apply-recheck] Re-check check 5 / O5: item 20 is a phase-one build gap, not a decision. Prerequisite P-1b: the build chat builds item 20 with offline test b2 before the P-1 commit (tested build = cutover build); then COVERED by b2 + the S10 sweep read. Who unblocks: build chat, on Zeke's word. |
| CLB-161 | MISSING-TEST | not state-dependent: R3-1 | — | R3-1 | path n/a: poller-create requirement (webhook creates R1-1, R1c-1, R2-1) | R3-1, G-1c, R1b-1, R2b-1 | COVERED | NJ Case created by the poller posts its labels (gap G10). |

## Slice 06: Staff labels (06-staff-labels.md)

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| LBL-001 | PROVEN-LIVE | BL2 (R1), R1-2 | BL2 (R2), R2-2 | n/a: NY label only (NJ: BL2 (R3)) | R1-2, R1c-2, R2-2, R3b-2 | R2-23d | COVERED | NY Employee 1132655; R2 BCBA `Colorado;New York` holds it too. |
| LBL-002 | PLANNED | n/a: CO label only (NY: BL2 (R1)) | BL2 (R2), R2-2 | n/a: CO label only (NJ: BL2 (R3)) | R2-2 | R2-23d | COVERED | CO Employee 1107687. |
| LBL-003 | PLANNED | BL2 (U1), U-21 | n/a: NJ label only (CO: BL2 (R2)) | BL2 (R3), R3-3 | R3-13c | R3-3, R1b-2, R2b-2 | COVERED | NJ Employee 1107686 on the NJ poller create; R1 → New Jersey in U1. |
| LBL-004 | PLANNED | BL2 (R2), R2-2 | BL2 (R2), R2-2 | not state-dependent: R2-2 | R2-2 | R2-23d | COVERED | `Colorado;New York` → CO Employee + NY Employee. |
| LBL-005 | PLANNED | BL2 (U1), U-21 | not state-dependent: BL2 (U1) | not state-dependent: BL2 (U1) | U-21, U-22 | R2-21 | COVERED | NY → NJ: NY Employee off; managed BCBA removal shown by webhook (U-22) and poller (R2-21). |
| LBL-006 | DEFERRED | — | — | — | — | — | DEFERRED | NM: Zeke 2026-11-23 "pending the client beginning work in these states" (package item 11). |
| LBL-007 | DEFERRED | — | — | — | — | — | DEFERRED | VA: Zeke 2026-11-23 (package item 11). |
| LBL-008 | PLANNED | not state-dependent: R2-22, R3-12 | — | — | U-21b (generic) | R2-22, R3-12 | COVERED | Live behaviour shipped now (10 production BCBAs take it). R2-22 / R3-12 made required P1 (S5a, poller; run-sheet change AB-9 applied; Zeke's call 8): unmapped NM / VA → warning `unmapped_work_state`, other state labels kept, run not `error`. |
| LBL-009 | CONFLICT | — | — | — | — | — | DOCUMENTATION | Guide-text conflict only (L234 vs 10 production NM / VA BCBAs); waits on Zeke's guide write (O-34). [apply-recheck] Re-check check 5: no behaviour to test; reclassed from BLOCKED to DOCUMENTATION (waits on Zeke's guide write; not an end-to-end gap). |
| LBL-010 | OFFLINE-ONLY | BL2 (U1), U-21 | R2-2 | R3-7 | R2-2, U-21 | R2-20, R3-7 | COVERED | Rounds now differ: R2 BCBA home CO gets NY Employee; R3-7 home NJ gets NY Employee. |
| LBL-011 | PROVEN-LIVE | BL1 (R1), R1-2 | BL1 (R2), R2-2 | BL1 (R3), R3-3 | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | BCBA header 1130668 on every BCBA. |
| LBL-012 | PROVEN-LIVE | BL8 (R1), R1-2 | BL8 (R2), R2-2 | BL8 (R3), R3-3 | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | All Employees 1052618 + Clinical 1052643, base labels. |
| LBL-013 | PROVEN-LIVE | BL8 (R1), R1-2 | TL4 (R2), R2-3 | BL8 (R3), R3-3 | R1-2, R1c-2, R2-3, R3b-2, R3b-3 | R3-3, R3-6, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Exact-set checks: no staffing label on any employee. The exact-set check needs AB-17: 1156741 in the CL4 group; [1156743, 1156746, 1156747] with want [] in BL8 / TL4 (pending). |
| LBL-014 | PROVEN-LIVE | B1, R1-2 | R2-25 | B1 (R3), R3-3 | R2-25 | R3-13d | COVERED | Form `Admin` adds 1052549; kept on later POSTs (not managed); R2-25 Screen check. |
| LBL-015 | PLANNED | not state-dependent: R2-2 | BL4 (R2), R2-2 | BL4 (R3), R3-3 | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | Assign CO → BCBA Colorado 1124246. |
| LBL-016 | PROVEN-LIVE | BL4 (R1), R1-2 | not state-dependent: R1-2 | BL4 (R3), R3-3 | R1-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Assign NJ → BCBA LBA NJ 1124245. |
| LBL-017 | PROVEN-LIVE | BL4 (R1), R1-2, U-22 | not state-dependent: U-22 | not state-dependent: U-22 | R1-2, R1c-2, U-22, R3b-2 | U-23 | COVERED | Assign NY has no CR label; U-22 leaves Assign NY alone, no label. |
| LBL-018 | PLANNED | not state-dependent: R3-3 | — | BL4 (R3), R3-3 | R3-13c | R3-3, R1b-2, R2b-2 | COVERED | Assign CO;Assign NJ → both assignment labels. |
| LBL-019 | OFFLINE-ONLY | U-22 | not state-dependent: U-22 | not state-dependent: U-22 | U-22 | R2-21 | COVERED | Slice gap (a) is now U-22: Assign NJ leaves, BCBA LBA NJ removed. |
| LBL-020 | PROVEN-LIVE | BL4 (R1), R1-2 | R2-21 | not state-dependent: R1-2 | R1-2, R1c-2, R3b-2 | R2-21 | COVERED | Yes → BCBA LBA NY 1052629; R2-21 Grad Permit → Yes adds it by poller. |
| LBL-021 | PLANNED | not state-dependent: R2-2 | BL4 (R2), R2-2 | — | R2-2 | R2-23d | COVERED | Grad Permit → GRAD 1092164 on the CO create. |
| LBL-022 | PLANNED | not state-dependent: R3-3 | — | BL4 (R3), R3-3 | R3-13c | R3-3, R1b-2, R2b-2 | COVERED | Licence No ("Will Apply") → no licence label. |
| LBL-023 | PLANNED | BL4 (U1), U-21 | not state-dependent: BL4 (U1) | not state-dependent: BL4 (U1) | U-21 | R2-21 | COVERED | In Process → no label; held BCBA LBA NY removed. |
| LBL-024 | OFFLINE-ONLY | not state-dependent: X06-1 | — | — | X06-1 | R2-21 (the reverse swap by poller; generic) | COVERED | X06-1: S7, R2 BCBA `lba_licensure__ny` Yes → Grad Permit → LBA NY 1052629 removed, GRAD 1092164 added, one POST; restore Yes (run-sheet change AB-12 applied). |
| LBL-025 | PROVEN-LIVE | BL5 (R1), R1-2 | n/a: NY credential field (R2 holds Aetna-NY) | n/a: NY credential field (R3 blank) | R1-2, R1c-2, R3b-2 | WD-3 | COVERED | MCD FFS-NY → NY Medicaid 1107647; R4 BCBA holds it on WD-3. WD-3 now sets Billing Hold Yes → No on the `waiting` R4 BCBA (1103437 removed, other labels kept; AB-9 applied). |
| LBL-026 | PLANNED | BL5 (U1), U-21, U-46 | n/a: NY credential field | n/a: NY credential field | U-21 | U-46 | COVERED | NY Medicaid removed when MCD FFS-NY leaves; U-46 is the workflow-driven change. If U-46 cannot run, S4 keeps old line 28 (`ny_insurance_labels` → blank by hand; 1107647 removed) (AB-7). |
| LBL-027 | DEFERRED | — | — | — | — | — | DEFERRED | Not built by decision (d25, Q21, P25), not blocking go-live (slice 06 DEFERRED). Stand-in: BL6 shows no credential label is sent for these options. |
| LBL-028 | DEFERRED | — | — | — | — | — | DEFERRED | Not built by decision (d25, Q21, P25), not blocking go-live (slice 06 DEFERRED). Stand-in: BL6 shows no credential label is sent for these options. |
| LBL-029 | DEFERRED | — | — | — | — | — | DEFERRED | Not built by decision (d25, Q21, P25), not blocking go-live (slice 06 DEFERRED). Stand-in: BL6 shows no credential label is sent for these options. |
| LBL-030 | DEFERRED | — | — | — | — | — | DEFERRED | Not built by decision (d25, Q21, P25), not blocking go-live (slice 06 DEFERRED). Stand-in: BL6 shows no credential label is sent for these options. |
| LBL-031 | DEFERRED | — | — | — | — | — | DEFERRED | Not built by decision (d25, Q21, P25), not blocking go-live (slice 06 DEFERRED). Stand-in: BL6 shows no credential label is sent for these options. |
| LBL-032 | DEFERRED | — | — | — | — | — | DEFERRED | Not built by decision (d25, Q21, P25), not blocking go-live (slice 06 DEFERRED). Stand-in: BL6 shows no credential label is sent for these options. |
| LBL-033 | DEFERRED | — | — | — | — | — | DEFERRED | Not built by decision (d25, Q21, P25), not blocking go-live (slice 06 DEFERRED). Stand-in: BL6 shows no credential label is sent for these options. |
| LBL-034 | PROVEN-LIVE | BL6 (R1), R1-2 | BL6 (R2), R2-2 | BL6 (R3), R3-3 | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | `nj_insurance_labels` MCD-NJ decoy in every round → no label. |
| LBL-035 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | S5 `[BL6][5.6]`; same no-label path as MCD-NJ (LBL-034). |
| LBL-036 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | PL `[B7][5.2]` mapped-list test (status fields never requested). |
| LBL-037 | PROVEN-LIVE | B13 (R1), R1-2 | B13 (R2), R2-2 | B13 (R3), R3-3 | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Decoy set every round; Meta 134444 never sent. |
| LBL-038 | PROVEN-LIVE | BL7 (R1), R1-2 | not state-dependent: R1-2 | not state-dependent: R1-2 | R1-2, R1c-2, R3b-2 | WD-3 | COVERED | Billing Hold Yes → 1103437; WD-3 adds it by poller while `waiting`. WD-3 now sets Billing Hold Yes → No on the `waiting` R4 BCBA (1103437 removed, other labels kept; AB-9 applied). |
| LBL-039 | PLANNED | BL7 (U1), U-21 | not state-dependent: BL7 (U1) | not state-dependent: BL7 (U1) | U-21 | U-21, R2-21 | COVERED | Yes → No removes Billing Hold; record the delivering `source`. |
| LBL-040 | PLANNED | not state-dependent: R2-2 | BL7 (R2), R2-2 | BL7 (R3), R3-3 | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | No (CO) and blank (NJ) on create → no Billing Hold. |
| LBL-041 | RETIRED | — | — | — | — | — | RETIRED | BUILD-PLAN decision 13 (2026-11-20): add-only hold lifted. |
| LBL-042 | PROVEN-LIVE | B10 (R1), R1-2 | not state-dependent: R1-2 | B10 (R3), R3-3 | R1-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Salaried → 1132653. |
| LBL-043 | PLANNED | B10 (U1), U-21 | B10 (R2), R2-2 | not state-dependent: R2-2 | R2-2, U-21 | R2-23d | COVERED | Hourly → no Salaried; R1 → Hourly removes it. |
| LBL-044 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage5EmployeeMappings.test.mjs` "[BL2][BL4][BL5][B10][BL7] the BCBA managed list is exactly the state, assignment, licensure, NY Medicaid, Salaried and Billing Hold labels" and "[BR19][5.12] every label an employee can require is sendable, base labels are never managed, and no ID is required twice"; `check-cr-record.mjs` checks the managed groups each round. [apply-recheck] Re-check: test titles named. |
| LBL-045 | PROVEN-LIVE | TL1 (R1), R1-3 | R2-20 | R3-7 | R1-3, R1c-3, R3b-3 | R2-20, R3-7 | COVERED | NY Employee on BT/RBT; added with the second state in R2-20 and R3-7. |
| LBL-046 | PLANNED | TL1 (U1b), U-21 | TL1 (R2), R2-3 | n/a: CO label only (NJ: TL1 (R3)) | R2-3, U-21b | R2-23f | COVERED | CO Employee on BT/RBT. |
| LBL-047 | PLANNED | n/a: NJ label only (NY: TL1 (R1)) | n/a: NJ label only (CO: TL1 (R2)) | TL1 (R3), R3-6 | R3-13e | R3-6, R1b-3, R2b-3 | COVERED | NJ Employee on the NJ poller create. |
| LBL-048 | PLANNED | R2-20, R3-7 | R2-20 | R3-7 | U-21b (generic; label rules have no path branch) | R2-20, R3-7 | COVERED | Two Work States → two state labels (R2-20, R3-7, poller); the webhook cell is the generic BT/RBT label push. |
| LBL-049 | PLANNED | TL1 (U1b), U-21b | not state-dependent: TL1 (U1b) | not state-dependent: TL1 (U1b) | U-21b | R3-6, R1b-3, R2b-3 | COVERED | NY → CO removes NY Employee; R3-6 removes form-set NY Employee by poller. NY → CO now in S4 by webhook (U-21b, AB-7 applied). |
| LBL-050 | DEFERRED | — | — | — | — | — | DEFERRED | NM: Zeke 2026-11-23 (package item 11). |
| LBL-051 | DEFERRED | — | — | — | — | — | DEFERRED | VA: Zeke 2026-11-23; behaviour row R3-12 run on Zeke's word only. |
| LBL-052 | PROVEN-LIVE | TL3 (R1), R1-3 | R2-20 | n/a: NY label only (NJ: R3-6) | R1-3, R1c-3, R3b-3 | R2-20 | COVERED | BT × NY → Behavior Technician NY 1052630. |
| LBL-053 | OFFLINE-ONLY | n/a: NJ label only (NY: TL3 (R1)) | n/a: NJ label only (CO: TL3 (R2)) | R3-6 | R3-13e | R3-6, R1b-3, R2b-3 | COVERED | R3 BT/RBT now BT, NJ only (question 14 route): BT NJ 1132652 live. |
| LBL-054 | PLANNED | n/a: CO label only (NY: TL3 (R1)) | TL3 (R2), R2-3 | n/a: CO label only (NJ: R3-6) | R2-3, R3b-3 | R2-23f | COVERED | BT × CO → Behavior Technician CO 1132650. |
| LBL-055 | PLANNED | TL3 (U1a), U-21b, R3-7 | n/a: NY label only | n/a: NY label only (NJ: R3-7) | U-21b | R3-7 | COVERED | RBT × NY → RBT NY 1052631. |
| LBL-056 | PLANNED | n/a: NJ label only | n/a: NJ label only | R3-7 | R3-13e | R3-7 | COVERED | RBT × NJ → RBT NJ 1132651. |
| LBL-057 | PLANNED | n/a: CO label only | TL3 (U1b), U-21b | n/a: CO label only | U-21b (S4) | R2-20 (generic BT/RBT label update by poller in CO; label rules have no path branch) | COVERED | R1 BT/RBT 1 → RBT and Colorado in one S4 push (U-21b; run-sheet changes AB-7, AB-9 applied): RBT CO 1107692 added, RBT NY 1052631 removed; old lines 13, 14 run in later sub-pushes. |
| LBL-058 | OFFLINE-ONLY | R2-20 | R2-20 | not state-dependent: R2-20 | R2-14 | R2-20 | COVERED | R2 BT/RBT 1 is a BT with `Colorado;New York`: BT CO + BT NY. |
| LBL-059 | PLANNED | R3-7 | not state-dependent: R3-7 | R3-7 | R3-13e | R3-7 | COVERED | RBT `New Jersey;New York` → RBT NJ + RBT NY. |
| LBL-060 | PLANNED | TL3 (U1a), U-21b | not state-dependent: R3-7 | R3-7 | U-21b | R3-7 | COVERED | BT → RBT: BT label removed, RBT added (NY U1a; NJ R3-7). |
| LBL-061 | PROVEN-LIVE | TL3 (R1), R1-3 | TL3 (R2), R2-3 | TL3 (R3), R3-6 | R1-3, R1c-3, R2-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | `bt_to_rbt_path` decoy in every round; role labels unchanged. |
| LBL-062 | PLANNED | TL3 (U1d), U-02 | not state-dependent: TL3 (U1d) | not state-dependent: TL3 (U1d) | U-21b (generic BT/RBT label push by webhook) | U-36 | COVERED | `BT to RBT` → role labels left as they are; warning `unmapped_bt_rbt_type`. |
| LBL-063 | PLANNED | TL3 (U1c), U-02 | not state-dependent: TL3 (U1c) | not state-dependent: TL3 (U1c) | U-21b (generic BT/RBT label push by webhook) | U-36 | COVERED | Blank type → role labels left, no warning. |
| LBL-064 | OFFLINE-ONLY | not state-dependent: X06-2 | — | — | X06-2 | R3-7 (generic) | COVERED | X06-2: S7, R3 BT/RBT 1 `location` → blank → no state or role label added; 1107686, 1132655 removed; role labels per decision 35; restore (run-sheet change AB-12 applied). |
| LBL-065 | PROVEN-LIVE | TL4 (R1), R1-3 | TL4 (R2), R2-3 | TL4 (R3), R3-6 | R1-3, R1c-3, R2-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | All Employees + Clinical on every BT/RBT; no BCBA-only label. |
| LBL-066 | OFFLINE-ONLY | n/a: NJ-only hire rule | n/a: NJ-only hire rule | R3-6 | R3-13e | R3-6, R1b-3, R2b-3 | COVERED | NJ-only BT created with NY form; NY Employee + BT NY removed on first POST. |
| LBL-067 | PLANNED | n/a: CO form rule | R2-3, R2-26 | n/a: CO form rule | R2-3, R2-26, R3b-3 | R2-23f | COVERED | Form `RBT CO`; BT ends with BT CO + CO Employee; R2-26 reads form-set labels. |
| LBL-068 | PLANNED | R3-7 | not state-dependent: R3-7 | R3-6, R3-7 | R3-13e | R3-6, R3-7, R1b-3, R2b-3 | COVERED | No RBT create now (question 14); R3-6 form-label removal + R3-7 BT→RBT swap exercise it. |
| LBL-069 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | S5 `[TL3][5.12]` managed-list tests. |
| LBL-070 | PROVEN-LIVE | B1, R1-2 | R2-25 | R3-3 | R2-25 | R3-13d | COVERED | Unmapped Admin label kept on every later POST. |
| LBL-071 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | LLS `[BR19][L.1]` empty set never posted; cannot occur live (base labels). |
| LBL-072 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | P3 `[P.3][BR19]` sendable-list tests; catalog read runs on every live POST. |
| LBL-073 | PROVEN-LIVE | not state-dependent: BR19 | — | — | R1-2, R1c-2, R4-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Read-back confirm and `skip_window`; seen on R1 / R4 creates. |
| LBL-074 | OFFLINE-ONLY | not state-dependent: R2-16 | — | — | R2-16 | path n/a: queue retry delay is set by the worker, same for any source | COVERED | Item 12 deployed in the working-tree build; R2-16 Log `delaySeconds: 150`. |
| LBL-075 | MISSING-TEST | WD-3 | not state-dependent: WD-3; R2-20 | not state-dependent: WD-3 | R3-13c | WD-3, WD-2 | COVERED | Labels sent while `waiting`: WD-3 (S5a, poller) removes Billing Hold 1103437 on the R4 BCBA (Yes → No; run-sheet change AB-9 applied); R2-20 sends labels while R2 BT/RBT 1 holds the temporary ID. Webhook cell generic (label rules have no path branch). |
| LBL-076 | PROVEN-LIVE | not state-dependent: BR3 | — | — | G-1 (S3a), R4-1 | U-43 | COVERED | Two webhooks → one create, one label set (R4-1 second webhook `SYNC_IN_PROGRESS`). [apply-recheck] Re-check: G-1 / S3a two webhooks per create, the second `SYNC_IN_PROGRESS`, on every pending-build create. |
| LBL-077 | MISSING-TEST | not state-dependent: U-21, U-21b | — | — | U-21, U-21b, WD-4 | path n/a: webhook requirement (poller side is LBL-078) | COVERED | U-21 (Case, BCBA) and U-21b (BT/RBT, S4; run-sheet change AB-7 applied) record the first run's `source` per label source; poller-only = trigger gap (master D2). |
| LBL-078 | PLANNED | not state-dependent: U-21 | — | — | path n/a: poller requirement (webhook side is LBL-077) | R2-20, R2-21, R3-7, WD-3 | COVERED | Label changes delivered by the 5-minute poll. WD-3 now sets Billing Hold Yes → No on the `waiting` R4 BCBA (1103437 removed, other labels kept; AB-9 applied). |
| LBL-079 | MISSING-TEST | — | — | — | — | — | OFFLINE-ONLY | OFFLINE-ONLY (Zeke's call 2): a label change cannot be caught by the sweep alone (the 5-minute poll sees `hs_lastmodifieddate` first; the sweep runs inside the poller function). Offline `stage3DailySweep.test.mjs`; live S8-1 (the sweep re-runs linked records); S8-2 redefined. |
| LBL-080 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Fan-out (optional code) queues 1 Case, no BCBA: OFFLINE-ONLY `stage6ContactRouting.test.mjs`. [pending Zeke: Contact workflow confirmation] |
| LBL-081 | PLANNED | U-23, U-38, BR12 | not state-dependent: U-41 | not state-dependent: U-41 | U-41 | U-23, U-38 | COVERED | Linked employees keep getting label changes whatever Entered holds. U-38 moved to S5c (Entered cleared + `home_apt` "Apt 1C U1"), apart from old line 3 (AB-9 applied). |
| LBL-082 | MISSING-TEST | U-46 | n/a: NY credential field | n/a: NY credential field | U-46 | U-46 | BLOCKED | BLOCKED until Zeke says whether the payor-status workflow is in sandbox 52311591 (U-46). If absent: PRODUCTION-ONLY (first-week check, package H) and S4 keeps old line 28 by hand (AB-7). |
| LBL-083 | PROVEN-LIVE | not state-dependent: R4-1 | — | — | R1F-5, G-2 (S3c-0b), R4-1 | R3-13d | COVERED | R4-1: labels confirmed on first read, no label POST. [apply-recheck] Re-check: R1F-5 / G-2 "no label POST when CR shows the labels" on the pending build. |
| LBL-084 | NOT-BUILT | — | — | — | — | — | DEFERRED | DEFERRED (dated: package item 21, "before the existing-records phase"; item 21 applies to new records too, so not PHASE-TWO). Not built. Zeke's call 4. |
| LBL-085 | MISSING-TEST | not state-dependent: G-9 | — | — | G-9 | G-9 | COVERED | Seen only if a create's label POST is unconfirmed; else `stage7RecordGateEveryPath.test.mjs`. [apply-recheck] Re-check G4 / O1: G-9 waits on the S3a set with promote OFF and heals at the S3c-0b hand tick (S3c set: at the promote tick). Offline: `stage7TwoGates.test.mjs` `[BR4][BR19]` hand-off tests (build chat 2). |

## Slice 07a: Triggers and Azure, TRG-001 to TRG-169b (07-triggers-azure.md)

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| TRG-001 | PENDING | — | — | — | — | — | DOCUMENTATION | Doc task, no behaviour: repo plan and guide differ by later decisions; waits on Zeke's guide write (O-34). [apply-recheck] Re-check check 5: no behaviour to test; reclassed from BLOCKED to DOCUMENTATION (waits on Zeke's guide write; not an end-to-end gap). |
| TRG-002 | PLANNED | R1-1, R1-2, R1-3 | R2-1, R2-2, R2-3 | R3-1, R3-3, R3-6 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | New Case, BCBA, BT/RBT per round; update rounds reuse R1 by design. |
| TRG-003 | PROVEN-LIVE | not state-dependent: R1-1 | — | — | R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Process rule: each create is a production CR write made on Zeke's go-ahead. |
| TRG-004 | PROVEN-LIVE | not state-dependent: SU-3 | — | — | R2-1, U-45, R3b-1 | R3-1, U-45, R1b-1, R2b-1 | COVERED | Flagged records sync; U-45: flag blank gets no webhook, no poll, no sweep. |
| TRG-005 | PROVEN-LIVE | not state-dependent: BR20 | — | — | R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | `test_record` blank on every created record; runs not skipped `test_record`. |
| TRG-006 | PROVEN-LIVE | not state-dependent: BR20 | — | — | path n/a: naming convention, no trigger | path n/a: naming convention, no trigger | COVERED | Names carry "Azure Test RN" in every round's record list. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-007 | PROVEN-LIVE | not state-dependent: BR20 | — | — | path n/a: naming convention, no trigger | path n/a: naming convention, no trigger | COVERED | Convention only. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-008 | PLANNED | R1-1 | R2-1 | R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | One state per round: R1 NY, R2 CO, R3 NJ. |
| TRG-009 | PLANNED | C2, C3, C6, C7, C8, C9, C35, CL1 (R1), R1F-1 | C2, C3, C6, C7, C8, C9, C35, CL1 (R2), R2-1 | C2, C3, C7, C9, C35 (R3), R3-1; C6, C8, CL1 via R3-20 | R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Case test values per round column. C9 (second phone) dropped by decision 36: Log check only. |
| TRG-010 | PLANNED | T1, T2, T4, T5, TL3 (R1), R1-3 | T1, T2, T4, T5, TL3 (R2), R2-3 | T1, T2, T4, T5, TL3 (R3), R3-6 | R2-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | BT/RBT test values per round column. |
| TRG-011 | PLANNED | B3, B4, B5, B7, B9, BL2 (R1), R1-2 | B3, B4, B5, B7, B9, BL2 (R2), R2-2 | B3, B4, B5, B7, B9, BL2 (R3), R3-3 | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | BCBA test values per round column. |
| TRG-012 | PROVEN-LIVE | not state-dependent: R4-1 | — | — | path n/a: test-data rule | path n/a: test-data rule | COVERED | Random 7-digit values no production record holds (R-WD; R2-2 `WORKDAY_ROUNDS[2]`). [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-013 | PROVEN-LIVE | not state-dependent: R4-2 | — | — | R1-2, R1c-2, R1-3, R1c-3, R4-2, R3b-2, R3b-3 | R3-3, R1b-2, R2b-2 | COVERED | Blank `workday_id` takes the temporary-ID path. |
| TRG-014 | RETIRED | — | — | — | — | — | RETIRED | AZTEST format replaced by random 7-digit values (Zeke 2026-11-23) and item 15's format check. |
| TRG-015 | PLANNED | not state-dependent: U-26 | — | — | U-26, U-32 | X07a-1 | COVERED | BR11 hold lifted 2026-11-24; by-hand records reuse R1 Workday IDs. Poller leg X07a-1 reads `source` `employeePoller` (S-2). |
| TRG-016 | PENDING | SU-7 | X07a-8 | X07a-8 | path n/a: manual after-round step | path n/a: manual after-round step | COVERED | SU-7 covers R1/R4 log; R2/R3 inactivation and log proposed. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-017 | RETIRED | — | — | — | — | — | RETIRED | "#" names replaced by the "RN" convention (matrix record-convention changes; guide update G-03). |
| TRG-018 | PROVEN-LIVE | not state-dependent: R1c-WD, R4-2 | — | — | R1c-WD, R4-2, BR10 | R3-3, R2-14, R1b-2, R2b-2 | COVERED | Temporary-ID create, Workday ID added, checklist steps. [apply-recheck] Re-check G2: the BCBA temporary → Workday transition on the pending build is R1c-WD (BT/RBT: R2-14). |
| TRG-019 | PENDING | — | — | — | — | — | BLOCKED | HubSpot workflow 1929214033 off until Sara answers (RG D16); Azure sends no alert. |
| TRG-020 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Absence: `stage4and5PropertyLists.test.mjs` "[B2][5.3] the ID properties the guide says never to read (external_system_id and the Workday entry properties) are in no employee request" (lists `entered_in_workday_by`); code search `grep -rln entered_in_workday src` outside `src/tests`: none (2026-11-24). [apply-recheck] Re-check: test and search named. |
| TRG-021 | PENDING | R1b-2, R4-2 | R2-2, R2b-2 | R3-3, R3b-2 | R2-2, R3b-2, R1c-2 | R3-3, R2b-2, R1b-2 | COVERED | Decided (d3): the BCBA follows the BT/RBT Workday rule (Workday-ID create R2-2; temporary-ID creates); United Care's process answer is non-blocking. |
| TRG-022 | PENDING | R1b-1, R1c-1 | R2-1 | R3-1, R3b-1 | R2-1, R3b-1, R1c-1 | R3-1, R2b-1, R1b-1 | COVERED | Decided (d8, P24): the create signal stays Entered = Yes; United Care's answer (RG D16) is non-blocking. |
| TRG-023 | PLANNED | not state-dependent: G-4 | — | — | G-4 | G-4 | COVERED | Ungated record gets nothing on any path; the 264 existing BTs themselves are phase two. |
| TRG-024 | PLANNED | CL4 (R1), R1F-5 | CL4 (R2), R2-10 | CL4 (R3), R3-1 | R2-10 | U-16 | COVERED | Staffing label constants; retired label removed (R1F-5). Labels slice owns it. |
| TRG-025 | PROVEN-LIVE | not state-dependent: SU-1 | — | — | path n/a: process step | path n/a: process step | COVERED | Retest matrix is the agreed plan; S0 starts only after it. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-026 | PROVEN-LIVE | not state-dependent: R4-1 | — | — | R4-1, R2-2 | X07a-2 | COVERED | Workday ID sent as External System ID on create. |
| TRG-027 | PROVEN-LIVE | not state-dependent: B2, T2 | — | — | R1-2, R1c-2, R1-3, R1c-3, R2-2, R3b-2, R3b-3 | R3-3, R3-6, X07a-6, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | `employee_id` written back after create. |
| TRG-028 | PROVEN-LIVE | not state-dependent: R4-1 | — | — | R4-1, R2-2 | X07a-2 | COVERED | Filled `workday_id` on create sent as ESID. |
| TRG-029 | PROVEN-LIVE | not state-dependent: BR2 | — | — | R1-2, R1c-2, R1-3, R1c-3, R4-2, R3b-2, R3b-3 | R3-3, R1b-2, R2b-2 | COVERED | Blank `workday_id` sends HubSpot record ID as temporary ESID. |
| TRG-030 | PROVEN-LIVE | not state-dependent: B12, T8 | — | — | R1-2, R1c-2, R1-3, R1c-3, R3b-2, R3b-3 | R3-3, R3-6, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Metadata 138703 holds the HubSpot record ID. |
| TRG-031 | PROVEN-LIVE | not state-dependent: B2, T2 | — | — | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | Decoy `external_system_id` never sent (Exclusions table check on CR ESID). |
| TRG-032 | PROVEN-LIVE | not state-dependent: BR2 | — | — | R1-2, R1c-2, R1-3, R1c-3, R4-2, R3b-2, R3b-3 | R3-3, R1b-2, R2b-2 | COVERED | Employee created on Entered = Yes without a Workday ID. |
| TRG-033 | PROVEN-LIVE | not state-dependent: R1c-WD, BR10 | — | — | R1c-WD, BR10 | R2-14 | COVERED | API update keeps the temporary ID; empty-ESID rejection offline (`duplicateSafety.test.mjs` R11). [apply-recheck] Re-check G2: R1c-WD (S4) keeps the temporary ID in CR on the pending build. |
| TRG-034 | PROVEN-LIVE | not state-dependent: BR10 | — | — | BR10, U-30 | R2-14, U-25 | COVERED | CR ESID compared with `workday_id` once filled or ticked. |
| TRG-035 | MISSING-TEST | not state-dependent: WD-4 | — | — | WD-4, U-24 | path n/a: requirement is the webhook trigger | COVERED | BT/RBT via U-30's source (WD-4), BCBA via U-24; production half master 4.10. |
| TRG-036 | MISSING-TEST | not state-dependent: WD-1 | — | — | WD-1, X07a-3 (S7) | U-25, U-31 | COVERED | BCBA checklist webhook WD-1 (S4); BT/RBT checklist webhook X07a-3 moved to S7 with workflows on (run-sheet change AB-12 applied). |
| TRG-037 | PROVEN-LIVE | not state-dependent: R2-14 | — | — | WD-1, X07a-3 | BR10, R2-14, U-31 | COVERED | Both checklist properties read; BT/RBT half was the gap. X04-4 / R2-14 tick / X04-1 / X07a-3 pushes run in S7, workflows on (AB-12 applied). |
| TRG-038 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Absence: `stage4and5PropertyLists.test.mjs` "[B2][5.3] the ID properties the guide says never to read (external_system_id and the Workday entry properties) are in no employee request" (lists `entered_in_workday`, `entered_in_ucaba_payroll_system`, `entered_in_workday_by`); code search outside `src/tests`: none (2026-11-24). [apply-recheck] Re-check: test and search named. |
| TRG-039 | PROVEN-LIVE | not state-dependent: R1F-1 | — | — | R1F-1 | R3-13b | COVERED | `success` when CR matches; R1F-1's next run `noop`. |
| TRG-040 | PROVEN-LIVE | not state-dependent: R2-30 | — | — | R2-30, U-24 | R3-5, U-34 | COVERED | `error` with a fixed sentence; failures report is TRG-169a/b. |
| TRG-041 | PROVEN-LIVE | not state-dependent: R4-2 | — | — | R4-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | `waiting` with reason in `last_sync_error`. [apply-recheck] Re-check citation fix: R1c-2 and R3b-2 are the temporary-ID BCBA webhook creates on the pending build (R4-2 ran on `655b385`). |
| TRG-042 | PROVEN-LIVE | not state-dependent: R4-2 | — | — | R4-2, S8-3 | R3-3, R1b-2, R2b-2 | COVERED | No retry line for `waiting` runs (`errors-retries-deadletters.kql`); S8-3 Service Bus counts. |
| TRG-043 | PROVEN-LIVE | not state-dependent: BR9 | — | — | R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Only success / error / waiting written (BR9, every run); guide text stale (G-04). |
| TRG-044 | PLANNED | not state-dependent: U-24 | — | — | U-24, U-30 | U-24, U-30 | COVERED | WORKDAY_ID_MISMATCH, no CR write; both rows run with both paths on, source recorded. |
| TRG-045 | PROVEN-LIVE | not state-dependent: BR10 | — | — | BR10, R3-13c | R2-14, R3-13d | COVERED | Temporary ID held in CR keeps the record `waiting`. |
| TRG-046 | PROVEN-LIVE | not state-dependent: R4-2 | — | — | R4-2, R4-1, R1c-2, R3b-2 | R3-3, X07a-2, R1b-2, R2b-2 | COVERED | Temp-ID create `waiting`; Workday-ID create `success`. [apply-recheck] Re-check citation fix: R1c-2 and R3b-2 are the temporary-ID BCBA webhook creates on the pending build (R4-2 ran on `655b385`). |
| TRG-047 | PROVEN-LIVE | not state-dependent: WD-2 | — | — | R3-13c | WD-2, WD-3 | COVERED | Field (WD-2) and label (WD-3) updates while `waiting`; BT/RBT in R2-14. WD-3 now sets Billing Hold Yes → No on the `waiting` R4 BCBA (1103437 removed, other labels kept; AB-9 applied). |
| TRG-048 | PROVEN-LIVE | not state-dependent: BR10 | — | — | BR10 | R2-14, WD-2 | COVERED | GET ESID unchanged after updates. |
| TRG-049 | PLANNED | not state-dependent: WD-4 | — | — | WD-4, BR10, WD-1, X07a-3 | R2-14, U-25 | COVERED | Re-check on `workday_id` and checklist change, both objects. X04-4 / R2-14 tick / X04-1 / X07a-3 pushes run in S7, workflows on (AB-12 applied). |
| TRG-050 | PROVEN-LIVE | not state-dependent: R2-14 | — | — | path n/a: poller rule | R2-14, S8-4 | COVERED | Found by the 5-minute poll; S8-4 runs one round at the hourly schedule. |
| TRG-051 | OFFLINE-ONLY | not state-dependent: WD-5 | — | — | path n/a: sweep rule | WD-5 | COVERED | WD-5 sweep re-checks a linked `waiting` record; unlinked branch offline (`stage3DailySweep.test.mjs`). |
| TRG-052 | PROVEN-LIVE | not state-dependent: R4-2 | — | — | R4-2, S8-3 | R3-3, R1b-2, R2b-2 | COVERED | As TRG-042. |
| TRG-053 | PROVEN-LIVE | not state-dependent: BR10 | — | — | BR10, R2-2 | R2-23d | COVERED | CR holds `workday_id` → `success` (R1-WD; CO BCBA created with it). |
| TRG-054 | PROVEN-LIVE | not state-dependent: BR10 | — | — | BR10, R3-13c | R3-13d, WD-1 | COVERED | Temporary ID, checklist unticked → `waiting`. |
| TRG-055 | PROVEN-LIVE | not state-dependent: R2-14 | — | — | X07a-3 | BR10, R2-14 | COVERED | CHECKLIST_STILL_TEMPORARY. X04-4 / R2-14 tick / X04-1 / X07a-3 pushes run in S7, workflows on (AB-12 applied). |
| TRG-056 | OFFLINE-ONLY | not state-dependent: U-25 | — | — | WD-1, X07a-3 | U-25, U-31 | COVERED | Now live (U-25 BCBA, U-31 BT/RBT); webhook cells prove checklist delivery, decision source-independent. X04-4 / R2-14 tick / X04-1 / X07a-3 pushes run in S7, workflows on (AB-12 applied). |
| TRG-057 | PLANNED | not state-dependent: U-24 | — | — | U-24, U-30 | U-24, U-30 | COVERED | Other value in CR → `error`, no update. |
| TRG-058 | PLANNED | not state-dependent: WD-1 | — | — | WD-1 | R2-14 | COVERED | Untick → back to `waiting` (WD-1 BCBA, R2-14 BT/RBT). |
| TRG-059 | OFFLINE-ONLY | not state-dependent: U-24 | — | — | R3-13c, U-24 | R3-13d, U-25 | COVERED | HubSpot-blank side keeps updating; CR-blank side cannot exist (CR rejects empty ESID, TRG-033). |
| TRG-060 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01, R2-23a | U-05, R3-13b | COVERED | Lookup-before-update in every linked Case run. |
| TRG-061 | PLANNED | not state-dependent: R2-9 | — | — | R2-9 | X07a-4 | COVERED | CASE_CLIENT_ID_MISMATCH, no write. |
| TRG-062 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Live 404 needs a hand-made client; `stage1CreateIdentity.test.mjs` "[G17] a linked Case lookup 404 still updates". |
| TRG-063 | PENDING | — | — | — | — | — | PHASE-TWO | Existing production Client IDs (81/100 not found); existing records. |
| TRG-064 | PLANNED | not state-dependent: U-26 | — | — | U-26, U-32 | X07a-1 | COVERED | BR11 hold lifted 2026-11-24. Poller leg X07a-1 reads `source` `employeePoller` (S-2). |
| TRG-065 | BLOCKED | — | — | — | — | — | BLOCKED | Waits on Danny / United Care (RG D10, O-23). |
| TRG-066 | PROVEN-LIVE | not state-dependent: R4-1 | — | — | R4-1, R2-2 | R3-3, X07a-2, R1b-2, R2b-2 | COVERED | Lookups by record ID and Workday ID before create. |
| TRG-067 | PROVEN-LIVE | not state-dependent: BR1 | — | — | R1-2, R1c-2, R1-3, R1c-3, R2-3, R3b-2, R3b-3 | R3-3, R3-6, R1b-2, R2b-2, R1b-3, R2b-3 | COVERED | Nothing found → one create. |
| TRG-068 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a lost link write-back; `stage1CreateIdentity.test.mjs` "[G17] an employee found by the HubSpot record ID is linked". |
| TRG-069 | PLANNED | not state-dependent: U-32 | — | — | U-26, U-32 | X07a-1 | COVERED | Holder found → `error`, no CR call. Poller leg X07a-1 reads `source` `employeePoller` (S-2). |
| TRG-070 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Phase one create-path case (CR already holds staff entered by hand). X07a-10: after U-37 (S7), the U-32 hand-made BT/RBT with `workday_id` 4837593, Entered = Yes → lookups find CR 5384530, no HubSpot holder → HS `waiting`, no CR write, no `employee_id` (run-sheet change AB-12 applied; needs U-37 run in phase one). [apply-recheck] Re-check G3 / E7: X07a-10 cannot give this outcome (holder search by `employee_id`, `src/lib/hubspotClient.mjs:355-395`; R1 BT/RBT 1 holds 5384530, so the run ends `error` ANOTHER_HUBSPOT_RECORD_LINKED, `src/workflows/employeeSyncWorkflow.mjs:897-904`); X07a-10 is not run. Offline: `stage1CreateIdentity.test.mjs` "[G17] a Workday ID found only in CentralReach, with no HubSpot holder, is waiting and writes nothing". Live leg on CR 5338681: open decision 10. |
| TRG-071 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Unclear CR answer cannot be forced; `duplicateSafety.test.mjs`, `stage1CreateIdentity.test.mjs`. |
| TRG-072 | PLANNED | — | — | — | — | — | PHASE-TWO | People already in CR and the 6 hand-linked BT/RBTs are existing records; gate itself G-4. |
| TRG-073 | PLANNED | not state-dependent: SU-3 | — | — | U-45, G-4 | U-45, G-4 | COVERED | Record gate setting and skip on every path. |
| TRG-074 | RETIRED | — | — | — | — | — | RETIRED | Single production checkbox superseded by the two-property gate (Pkg D18 b; insert B; G-05). |
| TRG-075 | PLANNED | not state-dependent: G-1 | — | — | G-1, G-1c | G-1c, G-3 | COVERED | Create path only with the creates box; BCBA skip G-8. |
| TRG-076 | PLANNED | not state-dependent: G-2 | — | — | G-2, G-6, G-7 | G-2 | COVERED | Update path only with the updates box. [apply-recheck] Re-check G4 / O1: G-2 now runs on the S3a set with the promote workflows OFF (S3a-2 skip by webhook, S3c-0 not queued, S3c-0b hand tick → poller update), so "linked, creates ticked, updates blank" exists when the edit is made. |
| TRG-077 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Decided offline (D18 g); `stage7TwoGates.test.mjs` "a Case linked only in Cosmos is on the create gate". |
| TRG-078 | PLANNED | not state-dependent: U-45 | — | — | U-45 | U-45 | COVERED | After the path settings are removed (S3e), fallback to `sandbox_test_field`. |
| TRG-079 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage3WebhookAndSettings.test.mjs` production guard; setting read-back at cutover (master 6.3 item 3). |
| TRG-080 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage3WebhookAndSettings.test.mjs` "[BR4][3.12] production refuses SYNC_RECORD_GATE_PROPERTY = none…". |
| TRG-081 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage3WebhookAndSettings.test.mjs` "[BR4][3.12] a path gate setting of none is invalid". |
| TRG-082 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Missing gate key needs an altered HubSpot answer; `stage7TwoGates.test.mjs`. |
| TRG-083 | PLANNED | not state-dependent: G-3 | — | — | G-2, G-7 | G-3, G-8 | COVERED | Skip lines carry `gate: update` (G-2, G-7) and `gate: create` (G-3, G-8). |
| TRG-084 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Creates workflow (BR4-P creates leg). [apply-recheck] Re-check check 5: no creates workflow is built in sandbox 52311591 (the promote workflows are; `PROMOTE-WORKFLOW-PROMPT-2026-11-24.md` "Built"); recency audit 2.5 ruling applied: PRODUCTION-ONLY, master 4.10 creates-workflow enrolment check at cutover. If Zeke builds it before S3 (open decision 2): COVERED by S3c. |
| TRG-085 | PENDING | not state-dependent: BR4-P | — | — | path n/a: the promote is a HubSpot workflow; the S3a webhook creates run with it OFF (G-2) | BR4-P (S3c poller creates R3, R2b, R1b; delay from property history) | COVERED | Promote-after-create. [apply-recheck] Re-check check 5 / O1: the three promote workflows are built (OFF, list enrolment); the run sheet turns them ON at S3c-0b and OFF at S3e; BR4-P measures T3 − T1 on the 9 S3c creates (160 s informational; stop at 15 minutes). |
| TRG-086 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Master 4.10: link-property history (only the integration fills the three link properties). |
| TRG-087 | PENDING | — | — | — | — | — | PHASE-TWO | Existing-records comparison and batch updates-box ticks (Pkg D19). |
| TRG-088 | PLANNED | not state-dependent: U-45 | — | — | U-45 | path n/a: rule is on the HubSpot webhook workflows (poller gate: TRG-090) | COVERED | Flag blank → no webhook. |
| TRG-089 | PROVEN-LIVE | not state-dependent: SU-3 | — | — | path n/a: app setting | path n/a: app setting | COVERED | Setting read back; behaviour in TRG-073. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-090 | PLANNED | not state-dependent: U-45 | — | — | G-4 | U-45, G-4 | COVERED | Worker skip (G-4); not queued by poll or sweep (U-45). |
| TRG-091 | PENDING | SU-7 | X07a-8 | X07a-8 | path n/a: after-round step | path n/a: after-round step | COVERED | Test CR records logged and made inactive per round. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-092 | RETIRED | — | — | — | — | — | RETIRED | History text superseded by the temporary-ID path (decision 22; guide update G-06). |
| TRG-093 | PLANNED | not state-dependent: SU-1 | — | — | path n/a: deploy order | path n/a: deploy order | COVERED | Deployed while stopped; poller disabled until S3c-0. [apply-recheck] Re-check: "until S2" was stale. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-094 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Governs go-live only; master 4.10 checks tagged phase 1 / 2 (K17). |
| TRG-095 | PENDING | R1b-2, R4-2 | R2-2, R2b-2 | R3-3, R3b-2 | R2-2, R3b-2, R1c-2 | R3-3, R2b-2, R1b-2 | COVERED | As TRG-021 (d3); RG D16 non-blocking. |
| TRG-096 | PLANNED | not state-dependent: U-34 | — | — | U-30, U-32 | U-34 | COVERED | Format (U-34), wrong values (U-30), shared IDs (U-32); existing-employee values phase two. |
| TRG-097 | PROVEN-LIVE | R1-1, R1-2, R1-3 | R2-1, R2-2, R2-3 | R3-13a, R3-13c, R3-13e | R1-1, R1c-1, R2-1, R3-13a, R3b-1 | path n/a: requirement is the webhook sender | COVERED | Case, BCBA, BT/RBT webhooks in each state. |
| TRG-098 | PROVEN-LIVE | R1-1 | R2-1 | R3-1 | R1-1, R1c-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Entered contains Yes; R3-1 "Yes; Insurance Card(s)" by poller. |
| TRG-099 | PROVEN-LIVE | R1-2 | R2-2 | R3-3 | R1-2, R1c-2, R2-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | BCBA Entered = Yes, unlinked. |
| TRG-100 | PROVEN-LIVE | R1-3 | R2-3 | R3-6 | R1-3, R1c-3, R2-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED | BT/RBT Entered stores Yes, unlinked. |
| TRG-101 | PROVEN-LIVE | not state-dependent: SU-5 | — | — | SU-5 | X07a-5 | COVERED | Webhook `skipped entry_not_yes`; poller non-queue proposed on R3 before its push. |
| TRG-102 | PLANNED | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | BR6 new Case in 1383894301 with Yes: no CR client. Create half: X01-4 (AB-4 applied). |
| TRG-103 | RETIRED | — | — | — | — | — | RETIRED | Retired by Zeke 11/17: blank `workday_id` creates with the temporary ID (decision 22). |
| TRG-104 | PLANNED | — | — | — | — | — | PHASE-TWO | People already in CR are existing records; own-create duplicates proven by BR3. |
| TRG-105 | PROVEN-LIVE | not state-dependent: BR2 | — | — | R1-2, R1c-2, R1-3, R1c-3, R4-2, R3b-2, R3b-3 | R3-3, R1b-2, R2b-2 | COVERED | As TRG-029. |
| TRG-106 | PLANNED | U-01, U-05 | R2-23a, R2-23b | R3-13a, R3-13b | U-01, R2-23a, R3-13a | U-05, R2-23b, R3-13b | COVERED | Case update both paths, three states. |
| TRG-107 | PROVEN-LIVE | U-03, U-23 | R2-23c, R2-23d | R3-13c, R3-13d | U-03, R2-23c, R3-13c | U-23, R2-23d, R3-13d | COVERED | BCBA update both paths, three states. |
| TRG-108 | PLANNED | U-02, U-36 | R2-23e, R2-23f | R3-13e, R3-13f | U-02, R2-23e, R3-13e | U-36, R2-23f, R3-13f | COVERED | BT/RBT update both paths, three states. |
| TRG-109 | PLANNED | not state-dependent: BR5 | — | — | U-18 | U-23, U-38 | COVERED | Entered blank on Case (U-18), BCBA (U-23), BT/RBT (U-38) still updates. U-38 moved to S5c (Entered cleared + `home_apt` "Apt 1C U1"), apart from old line 3 (AB-9 applied). |
| TRG-110 | OFFLINE-ONLY | not state-dependent: R2-13 | — | — | U-19 | R2-13, U-28, U-35 | COVERED | Now live: Case Paused/Discharged and Cold, BCBA/BT/RBT Terminated still update. |
| TRG-111 | PLANNED | not state-dependent: R2-9 | — | — | R2-9, U-24, U-30 | U-24, U-30, X07a-4 | COVERED | Case and employee ID mismatch → `error`, no write. |
| TRG-112 | PLANNED | not state-dependent: R2-12, X01-4 | — | — | R2-12, X01-4 | R2-12, X01-4 | COVERED | Webhook `skipped excluded_stage`; poll does not queue (D13). Create half: X01-4 (AB-4 applied). |
| TRG-113 | PLANNED | not state-dependent: R2-12 | — | — | R2-12 | R2-12 | COVERED | As TRG-112, stage 1383894303. |
| TRG-114 | PLANNED | not state-dependent: R2-12 | — | — | R2-12 | R2-12 | COVERED | As TRG-112, stage 1383894302. |
| TRG-115 | PLANNED | not state-dependent: R2-12 | — | — | R2-12 | R2-12 | COVERED | As TRG-112, stage 1332962645. |
| TRG-116 | PLANNED | not state-dependent: BR20 | — | — | path n/a: programme rule | path n/a: programme rule | COVERED | Sandbox first with production names (SU-3, SU-6); complete after R2, R3, R1-U1, R1-U2. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-117 | PLANNED | — | — | — | — | — | PRODUCTION-ONLY | Sandbox IDs proven every round (BR20); production IDs master 4.10, 6.3 items 1-2. |
| TRG-118 | PLANNED | CL4 (R1), R1F-5 | R2-10, R2-11 | R3-7 | R2-10, R2-11 | R3-7, U-16 | COVERED | Managed out, hand-added kept (BR19). |
| TRG-119 | PLANNED | not state-dependent: R2-25 | — | — | R2-25 | U-42 | COVERED | `last_sync_at` read back; property history (U-42). |
| TRG-120 | PROVEN-LIVE | not state-dependent: BR15 | — | — | U-42 | U-42 | COVERED | `integration_last_write`: 24-hour filter (BR15) and property history. |
| TRG-121a | PLANNED | not state-dependent: R2-25 | — | — | R2-25 | U-42 | COVERED | `updated_by_integration` read back. |
| TRG-121b | PROVEN-LIVE | not state-dependent: BR9 | — | — | R2-1, R3b-1 | R3-3, R1b-2, R2b-2 | COVERED | `last_sync_status` on every run. |
| TRG-121c | PROVEN-LIVE | not state-dependent: BR13 | — | — | R4-2, R2-14 | R3-5, U-34, U-39 | COVERED | Fixed sentences per outcome. |
| TRG-121d | PLANNED | not state-dependent: R2-25 | — | — | R2-25 | U-42 | COVERED | `last_sync_hash` read back. |
| TRG-122 | OFFLINE-ONLY | not state-dependent: R3-1 | — | — | R2-18 | R3-1, R1b-1, R2b-1 | COVERED | Now live: "CDE;Yes" (R2-18) and "Yes; Insurance Card(s)" (R3-1) both create. |
| TRG-123a | PLANNED | not state-dependent: SU-4 | — | — | R1-1, R1c-1, R3b-1 | X07a-6 | COVERED | SU-4 reads the R1 Case link; NJ poller read-back proposed. |
| TRG-123b | PLANNED | not state-dependent: SU-4 | — | — | R2-25 | X07a-6 | COVERED | `central_reach_record_link` read back. |
| TRG-123c | PROVEN-LIVE | not state-dependent: T2 | — | — | R1-3, R1c-3, R3b-3 | X07a-6 | COVERED | `employee_id` and `central_reach_link_to_rt_rbt`. |
| TRG-124 | MISSING-TEST | not state-dependent: X07a-7 | — | — | X07a-7 | path n/a: rule is on webhook trigger lists | COVERED | Production trigger lists checked at cutover (master 4.10). |
| TRG-125 | PLANNED | not state-dependent: U-29, U-29b | — | — | U-29, U-29b (S6a) | U-29, U-29b (S6a) | COVERED | By-hand Case with `test_record` = true; record each source's skipped line. [apply-recheck] Re-check: BR7 is never run; U-29 (employees) and U-29b (Case) are the S6a `test_record` legs. |
| TRG-126 | PLANNED | not state-dependent: U-29 | — | — | U-29 | U-29 | COVERED | BCBA `test_record` → `skipped`, no CR call. |
| TRG-127 | PLANNED | not state-dependent: U-29, U-29b | — | — | U-29, U-29b (S6a) | U-29, U-29b (S6a) | COVERED | BR7 (employees) step on BT/RBT 1. [apply-recheck] Re-check: BR7 is never run; U-29 (employees) and U-29b (Case) are the S6a `test_record` legs. |
| TRG-128 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Optional fan-out row: OFFLINE-ONLY `stage6ContactRouting.test.mjs` [K4][6.2]; live only if a Contact webhook is built. [pending Zeke: Contact workflow confirmation] |
| TRG-129 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Sandbox gates on `sandbox_test_field`; `stage6ContactRouting.test.mjs` [BR7][6.2]; `requirement-tests.json` BR7. |
| TRG-130 | PLANNED | not state-dependent: BR12 | — | — | BR12 | BR12 | COVERED | `Yes - Generic`, `No- Made Inactive` keep updates. U-38 moved to S5c (Entered cleared + `home_apt` "Apt 1C U1"), apart from old line 3 (AB-9 applied). |
| TRG-131 | PLANNED | not state-dependent: BR12 | — | — | BR12 | U-28, U-35 | COVERED | CR still active after each change. |
| TRG-132 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Master 4.10: production Case workflow triggers (staffing signals, coordinator fields). Cutover check (run-sheet change AB-20, for master 4.10): each production refresh workflow's trigger list equals its sandbox list (X07b-1, X07b-2, U-21, U-36); W1 / W2 "CR ID known" branch present; manual and automatic enrolment on. |
| TRG-133 | PROVEN-LIVE | not state-dependent: SU-5 | — | — | SU-5 | X07a-5 | COVERED | Azure, not the workflow, enforces Yes. |
| TRG-134 | MISSING-TEST | not state-dependent: U-01 | — | — | U-01, U-21, R2-23a, R3-13a | path n/a: requirement is the webhook trigger list | COVERED | An edit arriving only by poller is a trigger gap (master D2). |
| TRG-135 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Master 4.10: production BCBA workflow incl. the checklist. Cutover check (run-sheet change AB-20, for master 4.10): each production refresh workflow's trigger list equals its sandbox list (X07b-1, X07b-2, U-21, U-36); W1 / W2 "CR ID known" branch present; manual and automatic enrolment on. |
| TRG-136 | MISSING-TEST | not state-dependent: U-03 | — | — | U-03, U-21, R2-23c, R3-13c | path n/a: requirement is the webhook trigger list | COVERED | Source recorded per edit. |
| TRG-137 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Cutover check (run-sheet change AB-20, for master 4.10): production BT/RBT entry (W5) and refresh (W2) trigger lists equal the sandbox lists proven by U-36 / X07b-2, incl. `gender`, `state_home`, `active_cases_count`. |
| TRG-138 | MISSING-TEST | not state-dependent: U-02 | — | — | U-02, U-36, R2-23e, R3-13e | path n/a: requirement is the webhook trigger list | COVERED | U-36 covers every BT/RBT mapped field, source recorded. |
| TRG-139 | PROVEN-LIVE | not state-dependent: BR3 | — | — | BR3, BR12 | U-43 | COVERED | W2+W5 double signal at the BR12 Entered change; webhook + poller at once U-43. |
| TRG-140 | PLANNED | T7 (R1), R1F-1 | T7 (R2), R2-15 | T7 (R3), R3-8 | R2-15 | R3-8 | COVERED | As BT-104: R2-15, R3-8; prerequisite P-7 or hand-set fallback. |
| TRG-141 | RETIRED | — | — | — | — | — | RETIRED | As CASE-186: no production Contact workflow; the production Case refresh trigger list holds the four Guardian properties and `location`. [pending Zeke: Contact workflow confirmation] |
| TRG-142 | RETIRED | — | — | — | — | — | RETIRED | Superseded by the 11/09 Case sync (recency audit section C). [pending Zeke: Contact workflow confirmation] |
| TRG-143 | PLANNED | K1, U-04 | R2-23g | R3-13g, R3-20 | U-04, R2-23g, R3-13g | GS-1 | COVERED | K1 by both paths. [pending Zeke: Contact workflow confirmation] |
| TRG-144 | RETIRED | — | — | — | — | — | RETIRED | Decisions 42, 44, 49, 50: B9 reads the BCBA's own `personal_email`; K3 retired. |
| TRG-145 | PLANNED | not state-dependent: G-5 | — | — | G-5, G-6 | G-2 | COVERED | Case gate (G-2 / G-6); a Guardian edit on a gated-out Case: G-5. [pending Zeke: Contact workflow confirmation] [apply-recheck] Re-check G4 / O1: G-2 now runs on the S3a set with the promote workflows OFF (S3a-2 skip by webhook, S3c-0 not queued, S3c-0b hand tick → poller update), so "linked, creates ticked, updates blank" exists when the edit is made. |
| TRG-146 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Fan-out `crCalls` empty: optional code, OFFLINE-ONLY `stage6ContactRouting.test.mjs` [K1][6.1]; the Case run itself makes no CR contact (K1). [pending Zeke: Contact workflow confirmation] |
| TRG-147 | PLANNED | R1-1, U-18 | R2-1, R2-12 | R3-1, R3-13a | R1-1, R1c-1, R2-1, U-01, R3b-1 | R3-1, U-05, R1b-1, R2b-1 | COVERED | Summary of TRG-098, 106, 109, 112-115, 143. |
| TRG-148 | PLANNED | R1-2, U-03, U-22 | R2-2, R2-21 | R3-3, R3-13c | R2-2, U-03 | R3-3, U-23, R1b-2, R2b-2 | COVERED | Personal email from the Contact is retired (TRG-144; B9). |
| TRG-149 | PLANNED | R1-3, U-02, BR3 | R2-3, R2-20 | R3-6, R3-7 | R2-3, U-02, R3b-3 | R3-6, U-36, R1b-3, R2b-3 | COVERED | Entry gate, updates, role and state labels, duplicates. |
| TRG-150 | PROVEN-LIVE | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R2-1, R3b-1 | path n/a: requirement is the webhook signal | COVERED | Workflow calls the Azure endpoint on Entered = Yes. |
| TRG-151 | MISSING-TEST | not state-dependent: U-19 | — | — | U-19 | R2-13, U-16 | COVERED | Stage change to Cold (webhook), Paused/Discharged (poller). |
| TRG-152 | PLANNED | not state-dependent: U-06 | — | — | U-06 | U-11, U-15 | COVERED | Role-only changes may wait for the sweep (master question 12). |
| TRG-153 | PLANNED | not state-dependent: U-21 | — | — | U-01, U-02, U-03, U-21 | U-05, U-23, U-36 | COVERED | Any mapped field, source recorded. |
| TRG-154 | PLANNED | not state-dependent: BR5 | — | — | U-19 | R2-13 | COVERED | No stage restriction; production adds the two-property gate (G rows). |
| TRG-155 | PROVEN-LIVE | not state-dependent: R1F-1 | — | — | R1F-1, R2-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Full mapped set on create and first post-deploy update. |
| TRG-156 | PLANNED | not state-dependent: R2-13 | — | — | U-19, R2-11 | R2-13, U-16 | COVERED | Inactive label follows Paused / Discharged / Cold. |
| TRG-157 | PLANNED | not state-dependent: BR5 | — | — | U-18 | U-23, U-38 | COVERED | As TRG-109. U-38 moved to S5c (Entered cleared + `home_apt` "Apt 1C U1"), apart from old line 3 (AB-9 applied). |
| TRG-158 | PLANNED | not state-dependent: BR12 | — | — | BR12 | U-35 | COVERED | As TRG-130, TRG-131. U-38 moved to S5c (Entered cleared + `home_apt` "Apt 1C U1"), apart from old line 3 (AB-9 applied). |
| TRG-159 | RETIRED | — | — | — | — | — | RETIRED | Superseded (slice 07 RETIRED): Contact values reach CR through the Case sync (K1, GS-1) and the employee mirrors (U-27, U-33). [pending Zeke: Contact workflow confirmation] |
| TRG-160 | PLANNED | not state-dependent: BR18 | — | — | path n/a: no edit, so no workflow signal | BR18, R2-24 | COVERED | `case_status` flip with no edit. |
| TRG-161 | PLANNED | not state-dependent: X07b-3b | X07b-3b | R2-10, U-17 (stand-in) | R2-10, U-17 (staffing_status webhook) | X07b-3b | BLOCKED | BLOCKED (Zeke, open decision 3): X07b-3b is designed per Zeke's preference (CO poller half from day 1 evening to day 2 13:00 ET, Case webhook workflows off for that run; NJ webhook half by the existing `staffing_status` webhook rows R2-10, U-17; no day 3). Missing fact, in no repo source (guide snapshot, slices, src, scripts searched 2026-11-24): the HubSpot internal name of the BT 1 start-date property the 1 PM workflow reads, and whether sandbox 52311591 runs the 1 PM scheduled workflow. Stand-in meanwhile: R2-13 (a stage-driven `staffing_status` change made by HubSpot, consumed by the poller, CO) and R2-10 / U-17 (`staffing_status` by webhook). |
| TRG-162 | PLANNED | not state-dependent: BR18 | — | — | path n/a: rollup change has no edit | BR18, S8-1 | COVERED | Name rollup change found by poll or sweep. |
| TRG-163 | PLANNED | not state-dependent: BR18 | — | — | path n/a: association change has no property edit | BR18, U-15, S8-2 | COVERED | Poll or 08:00 sweep. |
| TRG-164 | PENDING | not state-dependent: U-15 | — | — | path n/a: an association-only change sends no webhook (the rule is the measured delay) | U-15 (sweep) | COVERED | Question 12 closed: accept for go-live, measure once; U-15 (S10) is the measurement. |
| TRG-165 | PENDING | — | — | — | — | — | PHASE-TWO | Records already in CR never ticked (74 / 122 Cases). |
| TRG-166 | PLANNED | not state-dependent: BR7 | — | — | BR7, U-29, K4 | BR7, U-29 | COVERED | Include path (`INCLUDE_TEST_RECORDS`) offline: TRG-129. |
| TRG-167 | PLANNED | CL4 (R1), R1F-5 | CL4 (R2), R2-10 | CL4 (R3), R3-1 | R2-10 | U-16 | COVERED | Labels slice. |
| TRG-168 | NOT-BUILT | — | — | — | — | — | BLOCKED | Report not built (N6, Zeke builds); then BR15 / U-43 check it. |
| TRG-169a | NOT-BUILT | — | — | — | — | — | BLOCKED | Case failures view not built (N6); then BR15 lists the R2-9 / R2-30 records. |
| TRG-169b | NOT-BUILT | — | — | — | — | — | BLOCKED | BCBA failures view not built (N6); then BR15 lists the U-24 / R3-5 records. |

## Slice 07b: Triggers and Azure, TRG-169c to the end (07-triggers-azure.md)

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| TRG-169c | NOT-BUILT | — | — | — | — | — | BLOCKED | Report not created (N6; slice gap c4). U-40 proves it once Zeke builds it. |
| TRG-170 | NOT-BUILT | — | — | — | — | — | BLOCKED | Waiting view not created (N6; slice gap c4). U-40 proves it once built. |
| TRG-171 | PLANNED | not state-dependent: S8-3 | — | — | S8-3 | path n/a: the alert reads the dead-letter count, whatever started the message | BLOCKED | Needs an email receiver on the action group first (gap c5; master 6.2 item 4, question 27). BLOCKED (S8-3 method, run-sheet open question 3; email receiver S9, Azure write; Zeke). Fallback with Zeke's approval: OFFLINE-ONLY (`stage2PortalAndRetries.test.mjs`, `stage3LabelWorkerSide.test.mjs:321`). |
| TRG-172 | PLANNED | CL3 (R1), U-17 | CL3 (R2), R2-11 | CL3 (R3), R3-8 | U-17 | R3-8 | COVERED | Warm / Cold read as stored; R2 created Cold (R2-1). |
| TRG-173 | PROVEN-LIVE | BR1, R1-1 | R2-1 | R3-1 | R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | R3-1 is the poller create (Entered set with the entry workflow off). |
| TRG-174 | PLANNED | C31 (R1), R1F-1 | n/a: NY-only value | n/a: NY-only value | R1-1, R1c-1, R3b-1 | U-05 | COVERED | C31 re-proved after the deploy (R1F-1). |
| TRG-175 | PLANNED | C30 (R1, `n2` decoy), R1F-1 | n/a: NY-only value | n/a: NY-only value | R1-1, R1c-1, R3b-1 | U-05 | COVERED | `n2` is an excluded decoy: Secondary insurance 144600 never takes its value. |
| TRG-176 | PROVEN-LIVE | C33 (R1), R1F-1 | C33 (R2), R2-1 | C33 (R3), R3-1 | R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED |  |
| TRG-177 | PROVEN-LIVE | C26 (R1 Confirmed), R1F-1 | C26 (R2 Denial), R2-1 | C26 (R3), R3-1, R3-17 | R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Item 3 un-held: build pending (R3-17). Re-prove under the new rule. |
| TRG-178 | PLANNED | C27 (R1), R1F-1 | C27 (R2), R2-1 | C27 (R3 "Mouthing Non Food Itemsth"), R3-1 | R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED |  |
| TRG-179 | RETIRED | — | — | — | — | — | RETIRED | L850 field not read by the integration (L419 uses the label fields; master Appendix A). |
| TRG-180 | PLANNED | not state-dependent: BL4 (R3 BCBA holds `No`: no LBA NY label) | — | — | R3-13c | R3-3, R1b-2, R2b-2 | COVERED | "Will Apply" is the label of stored value `No`; the NY licence field is read the same for every BCBA. |
| TRG-181 | PROVEN-LIVE | BR1, R1-3 | R2-3 | R3-6 | R1-3, R1c-3, R3b-3 | R3-6, R1b-3, R2b-3 | COVERED |  |
| TRG-182 | PLANNED | not state-dependent: R2-14 | — | — | R2-14 | U-31 | COVERED | R2-14 tick / untick; U-31 tick with blank `workday_id`. |
| TRG-183 | RETIRED | — | — | — | — | — | RETIRED | L840 / L272: `entered_in_workday` not read by the integration. |
| TRG-184 | PLANNED | not state-dependent: C12 | — | — | X07b-1b | U-10 | COVERED | X07b-1b: S4, CO R2 Case association change with one Case edit, Case workflow on → first run `source` `hubspotWorkflow` (run-sheet change AB-7 applied). |
| TRG-185 | PLANNED | not state-dependent: C11, BR17 (relabel) | — | — | X07b-1b | U-05 | COVERED | X07b-1b: S4, CO R2 Case association change with one Case edit, Case workflow on → first run `source` `hubspotWorkflow` (run-sheet change AB-7 applied). |
| TRG-186 | PLANNED | not state-dependent: C11 | — | — | X07b-1b | U-05 | COVERED | X07b-1b: S4, CO R2 Case association change with one Case edit, Case workflow on → first run `source` `hubspotWorkflow` (run-sheet change AB-7 applied). |
| TRG-187 | PLANNED | not state-dependent: C14 | — | — | U-06 | U-07 | COVERED | U-06: Primary BT change sends a Deal webhook. |
| TRG-188 | PLANNED | not state-dependent: C14 | — | — | X07b-1b | U-13 | COVERED | X07b-1b: S4, CO R2 Case association change with one Case edit, Case workflow on → first run `source` `hubspotWorkflow` (run-sheet change AB-7 applied). |
| TRG-189 | PLANNED | not state-dependent: R2-2 | — | — | R2-2 | R3-3, R1b-2, R2b-2 | COVERED | Gap a20 closed by R2-2; same payload builder on the poll create. Production confirmation at cutover. |
| TRG-190 | PLANNED | C7 (R1), K1 | C7 (R2), R2-1 | C7 (R3), R3-1 | R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED | Integration reads the Case sync fields (K1 Case run); the two-Guardian pick is CASE-053 (X02-5). [pending Zeke: Contact workflow confirmation] |
| TRG-191 | PLANNED | CL4 (R1), R1F-1 | CL4 (R2), R2-10 | CL4 (R3), R3-1 | R2-10 | BR18 (status flip) | COVERED |  |
| TRG-192 | DEFERRED | — | — | — | — | — | DEFERRED | Zeke 2026-11-23; BL3, TL2, R2-22, R3-12 show the deferred behaviour. |
| TRG-193 | PROVEN-LIVE | C27 (R1), R1F-1 | C27 (R2), R2-1 | C27 (R3), R3-1 | R1-1, R1c-1, R3b-1 | R3-1, R1b-1, R2b-1 | COVERED |  |
| TRG-194 | RETIRED | — | — | — | — | — | RETIRED | L880 open item answered 11/14 (L818) and 11/18 (L832). |
| TRG-195 | PLANNED | K1, U-04 | R2-23g | R3-13g | U-04 (arrival) | GS-1 | COVERED | K1 Case path. [pending Zeke: Contact workflow confirmation] |
| TRG-196 | RETIRED | — | — | — | — | — | RETIRED | Decision 50: B9 reads the BCBA's own `personal_email`. |
| TRG-197 | PLANNED | T4 (R1), U-33 | T4 (R2), R2-3 | R3-14 | U-33 | U-39 | COVERED | U-33 records which path delivers Contact phone (O-26 answered by the row). |
| TRG-198 | RETIRED | — | — | — | — | — | RETIRED | Pkg item 5 + guide insert D (G-08): no copy workflow. |
| TRG-199 | RETIRED | — | — | — | — | — | RETIRED | BP 4.14: names come from associations; no workflow needed. |
| TRG-200 | PLANNED | CL4 (R1), CL4 (retired values), R1F-5 | CL4 (R2), R2-10 | CL4 (R3), R3-1 | R2-10 | BR18 (status flip) | COVERED |  |
| TRG-201 | PLANNED | CL4 (R1), R1F-1 | CL4 (R2), R2-10 | CL4 (R3), R3-1 | R2-10 | BR18 (status flip) | COVERED |  |
| TRG-202 | PLANNED | not state-dependent: X07b-3b | X07b-3b | R2-10, U-17 (stand-in) | R2-10, U-17 (staffing_status webhook) | X07b-3b | BLOCKED | BLOCKED (Zeke, open decision 3): X07b-3b is designed per Zeke's preference (CO poller half from day 1 evening to day 2 13:00 ET, Case webhook workflows off for that run; NJ webhook half by the existing `staffing_status` webhook rows R2-10, U-17; no day 3). Missing fact, in no repo source (guide snapshot, slices, src, scripts searched 2026-11-24): the HubSpot internal name of the BT 1 start-date property the 1 PM workflow reads, and whether sandbox 52311591 runs the 1 PM scheduled workflow. Stand-in meanwhile: R2-13 (a stage-driven `staffing_status` change made by HubSpot, consumed by the poller, CO) and R2-10 / U-17 (`staffing_status` by webhook). |
| TRG-203 | PLANNED | CL3 (R1), U-17 | CL3 (R2), R2-11 | CL3 (R3), R3-8 | U-17 | R3-8 | COVERED |  |
| TRG-204 | RETIRED | — | — | — | — | — | RETIRED | GER-REQ L339: names from `first_name` + `last_name`; `full_name` not sent. |
| TRG-205 | PLANNED | not state-dependent: R2-5 | — | — | R2-6 | R2-5 | COVERED | R2-5 records which type the holder side lists (227 / 226). Production 151 / 150 at cutover. |
| TRG-206 | RETIRED | — | — | — | — | — | RETIRED | Answered: G19 L228-230 and GHLOG L1278. |
| TRG-207 | RETIRED | — | — | — | — | — | RETIRED | G19 (11/19) and label test 11/20. |
| TRG-208 | MISSING-TEST | not state-dependent: R1-U1 | — | — | G-6 then U-01 (Case); U-02 then WD-4 (BT/RBT); U-03 (S4) then U-24 (S6a) (BCBA) | path n/a: re-enrolment is a workflow setting | COVERED | Second webhook on one record proves re-enrolment. Production workflows: master 4.10. |
| TRG-209 | PLANNED | not state-dependent: R1-U2 | — | — | X07b-4 | U2-1 | COVERED | The "unknown" OR group is proven when a clear sends a webhook. |
| TRG-210 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Workflow setting, no integration behaviour; check the production workflows at cutover (master 4.10, K16). Cutover check (run-sheet change AB-20, for master 4.10): each production refresh workflow's trigger list equals its sandbox list (X07b-1, X07b-2, U-21, U-36); W1 / W2 "CR ID known" branch present; manual and automatic enrolment on. |
| TRG-211 | PLANNED | not state-dependent: C8 (R1-U1) | — | — | X07b-1 (S4: R1 Case `location_city` → "New York U1") | U-05 | COVERED | CR City "New York U1" (run-sheet change AB-7 applied). |
| TRG-212 | PLANNED | not state-dependent: C8 (R1-U1) | — | — | X07b-1 | U-05 | COVERED |  |
| TRG-213 | PLANNED | not state-dependent: C8 (R1-U1), R1-U2 | — | — | X07b-1, X07b-4 (clear) | U2-1 | COVERED |  |
| TRG-214 | PLANNED | not state-dependent: C8 (R1-U1) | — | — | X07b-1 (S4: R1 Case `postal_code` → "10011") | U-05 | COVERED | CR `ZipPostalCode` 10011 (run-sheet change AB-7 applied). |
| TRG-215 | PLANNED | not state-dependent: C24, R2-29 | — | — | R2-29 | R2-29 | COVERED | R2-29 edits it in S4 (webhook) and S5a (poller). Build pending. |
| TRG-216 | PLANNED | not state-dependent: C24 | — | — | X07b-1 | U-05 | COVERED |  |
| TRG-217 | PLANNED | not state-dependent: C7, K1 | — | — | X07b-1 | GS-1 | COVERED | Synced from the Guardian Contact; X07b-1 / K1 record the Case webhook arrival; poller leg GS-1. [pending Zeke: Contact workflow confirmation] |
| TRG-218 | PLANNED | not state-dependent: C7, K1 | — | — | X07b-1 | GS-1 | COVERED | As TRG-217. [pending Zeke: Contact workflow confirmation] |
| TRG-218a | PLANNED | not state-dependent: K1 (email), C6 | — | — | K1, X07b-1 (arrival) | GS-1 | COVERED | Added 2026-11-24 (slice 07, recency audit R01): the Case refresh workflow triggers on `email` (Guardian sync property); SU-6 checks the list; K1 records the webhook arrival. [pending Zeke: Contact workflow confirmation] |
| TRG-218b | PLANNED | not state-dependent: K1 (phone), C8 | — | — | K1, X07b-1 (arrival) | GS-1 | COVERED | Added 2026-11-24 (slice 07, recency audit R01): the Case refresh workflow triggers on `phone` (Guardian sync property); SU-6 checks the list; K1 records the webhook arrival. [pending Zeke: Contact workflow confirmation] |
| TRG-219 | PLANNED | not state-dependent: C29, CL5 | — | — | U-21 | U-05 | COVERED | `insurance_primary` is a label source property (U-21 records source). |
| TRG-220 | PLANNED | not state-dependent: CL3 | — | — | U-17 | R3-8 | COVERED |  |
| TRG-221 | PLANNED | not state-dependent: BR6, R2-12 | — | — | U-19 | U-16 | COVERED |  |
| TRG-222 | RETIRED | — | — | — | — | — | RETIRED | Decision 39 / Pkg D14: replaced by the three coordinator fields (SU-6 checks the trigger list). |
| TRG-223 | PLANNED | not state-dependent: CL4 | — | — | R2-10 | BR18 (status flip) | COVERED |  |
| TRG-224 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Production W1 design at cutover (master 4.10); the branch is harmless (Azure re-checks). Cutover check (run-sheet change AB-20, for master 4.10): each production refresh workflow's trigger list equals its sandbox list (X07b-1, X07b-2, U-21, U-36); W1 / W2 "CR ID known" branch present; manual and automatic enrolment on. |
| TRG-225 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01 | path n/a: describes the webhook action | COVERED |  |
| TRG-226 | MISSING-TEST | not state-dependent: G-4 | — | — | R2-12, G-4, SU-5 | path n/a: HubSpot workflow configuration | COVERED | Webhooks arrive for excluded / ungated / not-Yes records and Azure skips them. |
| TRG-227a | PLANNED | not state-dependent: T2 | — | — | U-36 (S4 R1 list) | U-38 | COVERED | U-36's S4 list on R1 BT/RBT 1: `first_name` "Janet", `street_address__work_` "105 Work Plaza U1", `city__work_` "New York U1", `state__work_` NJ, `postal_code__work_` "10015", `apartment__work` "Suite 1 U1" (run-sheet change AB-7 applied). |
| TRG-227b | PLANNED | not state-dependent: T2 | — | — | U-36 | U-38 | COVERED | No webhook on a last-name edit in R1; U-36 re-checks after Zeke's trigger fix. |
| TRG-228 | PLANNED | not state-dependent: T2 (email update) | — | — | U-36 | U-38 | COVERED |  |
| TRG-229 | PLANNED | not state-dependent: T4 | — | — | U-33 | U-39 | COVERED |  |
| TRG-230a | PLANNED | not state-dependent: T4, K5 | — | — | U-36 | U-38 | COVERED | Contact mirror (K5 address edit). |
| TRG-230b | PLANNED | not state-dependent: T4 | — | — | U-36 | U-38 | COVERED | Contact mirror. |
| TRG-230c | PLANNED | not state-dependent: T4 | — | — | U-33 | U-38 | COVERED | Contact `zip`. |
| TRG-231a | PLANNED | not state-dependent: T6 | — | — | U-36 (S4 R1 list) | U-38 | COVERED | U-36's S4 list on R1 BT/RBT 1: `first_name` "Janet", `street_address__work_` "105 Work Plaza U1", `city__work_` "New York U1", `state__work_` NJ, `postal_code__work_` "10015", `apartment__work` "Suite 1 U1" (run-sheet change AB-7 applied). |
| TRG-231b | PLANNED | not state-dependent: T6 (U1 suite blank) | — | — | U-36 (S4 R1 list) | U-38 | COVERED | U-36's S4 list on R1 BT/RBT 1: `first_name` "Janet", `street_address__work_` "105 Work Plaza U1", `city__work_` "New York U1", `state__work_` NJ, `postal_code__work_` "10015", `apartment__work` "Suite 1 U1" (run-sheet change AB-7 applied). |
| TRG-231c | PLANNED | not state-dependent: T6 | — | — | U-36 (S4 R1 list) | U-38 | COVERED | U-36's S4 list on R1 BT/RBT 1: `first_name` "Janet", `street_address__work_` "105 Work Plaza U1", `city__work_` "New York U1", `state__work_` NJ, `postal_code__work_` "10015", `apartment__work` "Suite 1 U1" (run-sheet change AB-7 applied). |
| TRG-231d | PLANNED | not state-dependent: T6 | — | — | U-36 (S4 R1 list) | U-38 | COVERED | U-36's S4 list on R1 BT/RBT 1: `first_name` "Janet", `street_address__work_` "105 Work Plaza U1", `city__work_` "New York U1", `state__work_` NJ, `postal_code__work_` "10015", `apartment__work` "Suite 1 U1" (run-sheet change AB-7 applied). |
| TRG-231e | PLANNED | not state-dependent: T6 | — | — | U-36 (S4 R1 list) | U-38 | COVERED | U-36's S4 list on R1 BT/RBT 1: `first_name` "Janet", `street_address__work_` "105 Work Plaza U1", `city__work_` "New York U1", `state__work_` NJ, `postal_code__work_` "10015", `apartment__work` "Suite 1 U1" (run-sheet change AB-7 applied). |
| TRG-232 | PLANNED | not state-dependent: TL3 | — | — | U-21b | R3-7 | COVERED | BT/RBT label source edit by webhook: U-21b (S4, AB-7 applied). |
| TRG-233 | PLANNED | not state-dependent: U-35 | — | — | X07b-2 (stage move = X01-1 Resigned move, S6a) | U-35 | COVERED | Harmless signal (Azure `noop` without a mapped change). X07b-2 stage moves run in S6a with the workflows on (AB-10 applied). |
| TRG-234 | PLANNED | not state-dependent: BR12 | — | — | BR14 (duplicate signals), BR12 | U-38 | COVERED |  |
| TRG-235 | PLANNED | not state-dependent: TL1 | — | — | U-21b | R2-20 | COVERED | BT/RBT label source edit by webhook: U-21b (S4, AB-7 applied). |
| TRG-236 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | As TRG-224: production W2 design at cutover (master 4.10). Cutover check (run-sheet change AB-20, for master 4.10): each production refresh workflow's trigger list equals its sandbox list (X07b-1, X07b-2, U-21, U-36); W1 / W2 "CR ID known" branch present; manual and automatic enrolment on. |
| TRG-237 | PROVEN-LIVE | not state-dependent: U-02 | — | — | U-02 | path n/a: describes the webhook body | COVERED | Production type `2-48354559` at cutover (master 6.3 item 2). |
| TRG-238 | PLANNED | not state-dependent: B7 | — | — | U-27 | U-23 | COVERED | Contact mirror; U-27 records the source. |
| TRG-239 | PLANNED | not state-dependent: B7 | — | — | X07b-2 (S4: R1 BCBA Contact `phone` → "(212) 555-0144") | U-23 | COVERED | CR phone 2125550144 (run-sheet change AB-7 applied). |
| TRG-240 | PLANNED | not state-dependent: B6 | — | — | X07b-2 | U-23 | COVERED |  |
| TRG-241a | PLANNED | B8 (R1), WD-2 | n/a: NY field | n/a: NY field | X07b-2 | WD-2 | COVERED |  |
| TRG-241b | PLANNED | n/a: NJ field | n/a: NJ field | B8 (R3), R3-13c | X07b-2 | R3-13d | COVERED |  |
| TRG-241c | PLANNED | n/a: CO field | B8 (R2), R2-23c | n/a: CO field | X07b-2 | R2-23d | COVERED |  |
| TRG-242 | PLANNED | not state-dependent: U-28 | — | — | X07b-2 | U-28 | COVERED | Harmless signal. |
| TRG-243 | BLOCKED | — | — | — | — | — | BLOCKED | Waits on the CR employee field for BCBA Care Coordinator (Pkg D8; master C6). |
| TRG-244 | PLANNED | BL5 (R1), U-46 | n/a: NY field | n/a: NY field | U-21 | U-23 | COVERED | U-46: payor-status workflow change (OFFLINE-ONLY if that workflow is not in the sandbox). |
| TRG-245 | DEFERRED | — | — | — | — | — | DEFERRED | Deferred (d25, Q21; slice 07 DEFERRED): NJ credential labels not built, not blocking. Stand-in: BL6 shows no credential label is sent. |
| TRG-246 | PLANNED | not state-dependent: BL2 | — | — | U-21 | U-23 | COVERED | NM / VA values deferred (BL3). |
| TRG-247 | PLANNED | not state-dependent: BL7 | — | — | U-21 | WD-3 | COVERED | WD-3 now sets Billing Hold Yes → No on the `waiting` R4 BCBA (1103437 removed, other labels kept; AB-9 applied). |
| TRG-248 | PROVEN-LIVE | not state-dependent: U-03 | — | — | U-03 | path n/a: describes the webhook body | COVERED | Production type `2-48354212` at cutover (master 6.3 item 2). |
| TRG-249 | PROVEN-LIVE | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R2-1, R3b-1 | path n/a: entry-workflow setting (poll create is R3-1) | COVERED |  |
| TRG-250 | OFFLINE-ONLY | BR1, R1-1 ("Yes- Completed") | R2-18 (`CDE;Yes`) | R3-1 ("Yes; Insurance Card(s)") | R2-18 | R3-1, R1b-1, R2b-1 | COVERED | Now proven live by R2-18 and R3-1 (CONTAINS `Yes`); U-20 covers other options on a linked Case. |
| TRG-251 | PROVEN-LIVE | not state-dependent: SU-5 | — | — | SU-5 | path n/a: entry-workflow trigger setting | COVERED | SU-5: webhook without Yes → `skipped` `entry_not_yes`. |
| TRG-252 | PROVEN-LIVE | not state-dependent: R1-3 | — | — | R1-3, R1c-3, R2-3, R3b-3 | path n/a: entry-workflow setting (poll create is R3-6) | COVERED |  |
| TRG-253 | PLANNED | not state-dependent: BR12 | — | — | BR12 | U-38 | COVERED | BR12 pushes `Yes - Generic` then `No- Made Inactive`; U-41 states the Entered value per push. |
| TRG-254 | PLANNED | not state-dependent: BR3 | — | — | BR14 (duplicate signals) | path n/a: overlap of two webhook workflows | COVERED | Trigger lists confirmed by Zeke 2026-11-24. |
| TRG-255 | PROVEN-LIVE | not state-dependent: R1-2 | — | — | R1-2, R1c-2, R2-2, R3b-2 | path n/a: entry-workflow setting (poll create is R3-3) | COVERED |  |
| TRG-256 | PROVEN-LIVE | not state-dependent: BR5 | — | — | BR5 | U-23 | COVERED |  |
| TRG-257 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01 | path n/a: webhook endpoint | COVERED | Production URI at cutover (master 6.3 item 1). |
| TRG-258 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01 | path n/a: webhook endpoint | COVERED |  |
| TRG-259 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01 | path n/a: webhook body | COVERED | Azure re-reads the record from HubSpot. |
| TRG-260 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01 | path n/a: webhook signature | COVERED | Production secret at cutover (master 6.3 item 1). |
| TRG-261 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01, U-02, U-03 | path n/a: webhook body | COVERED |  |
| TRG-262 | PROVEN-LIVE | not state-dependent: BR3 | — | — | BR14 (duplicate signals) | BR14 (webhook and poller at once) | COVERED |  |
| TRG-263 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Contact notices are optional fan-out code: OFFLINE-ONLY `stage6ContactRouting.test.mjs` [K1][6.1]. [pending Zeke: Contact workflow confirmation] |
| TRG-264 | PLANNED | not state-dependent: U-21 | — | — | R2-10, U-21 | BR18 (status flip), U-23 | COVERED | `nj_insurance_labels` is a BL6 decoy: webhook only, no label. |
| TRG-265 | PROVEN-LIVE | not state-dependent: R1-1 | — | — | R1-1, R1c-1, R3b-1 | path n/a: workflow setting | COVERED | Create sent with no CR ID. |
| TRG-266 | PROVEN-LIVE | not state-dependent: SU-5 | — | — | SU-5 | G-4 | COVERED | Receiver decides eligibility on every path. |
| TRG-267 | PLANNED | not state-dependent: U-45 | — | — | G-4 | U-45 | COVERED | The code gate is the protection. |
| TRG-268 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01 | path n/a: webhook body | COVERED | ID-only body; mappers read HubSpot. |
| TRG-269 | PLANNED | K1, U-04 | R2-23g | R3-13g | U-04 (K1) | GS-1 | COVERED | K1 Case run. [pending Zeke: Contact workflow confirmation] |
| TRG-270 | PLANNED | not state-dependent: R1-U2 (U2-1 to U2-6) | — | — | X07b-4 | U2-1 | COVERED | Question 27 decided 2026-11-24 (U2-4, U2-5, R3-9); block lifted. |
| TRG-271 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01 | U-05 | COVERED | Process rule: every row checks Log `source` and a CR GET. |
| TRG-272 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Production workflow inspection at cutover (master 4.10, K16; BP 9.6). |
| TRG-273 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Question 25 closed (accepted untested live): HubSpot webhook retry after an Azure 5xx; OFFLINE-ONLY `hubspotWebhook.test.mjs`, stage2 "[2.6] the webhook answers 503"; the poller is the backstop. Slice 07 OFFLINE-ONLY. |
| TRG-274 | PLANNED | not state-dependent: X07b-3b | X07b-3b | R2-10, U-17 (stand-in) | R2-10, U-17 (staffing_status webhook) | X07b-3b | BLOCKED | BLOCKED (Zeke, open decision 3): X07b-3b is designed per Zeke's preference (CO poller half from day 1 evening to day 2 13:00 ET, Case webhook workflows off for that run; NJ webhook half by the existing `staffing_status` webhook rows R2-10, U-17; no day 3). Missing fact, in no repo source (guide snapshot, slices, src, scripts searched 2026-11-24): the HubSpot internal name of the BT 1 start-date property the 1 PM workflow reads, and whether sandbox 52311591 runs the 1 PM scheduled workflow. Stand-in meanwhile: R2-13 (a stage-driven `staffing_status` change made by HubSpot, consumed by the poller, CO) and R2-10 / U-17 (`staffing_status` by webhook). |
| TRG-275 | PROVEN-LIVE | BR14, U-01, U-05 | R2-23a, R2-23b | R3-13a, R3-13b | U-01, U-02, U-03 | U-05, U-23, U-38 | COVERED |  |
| TRG-276 | PROVEN-LIVE | U-16, U-23, U-38 | R2-13 | R3-13b | path n/a: poller rule | U-23, U-38, R2-13 | COVERED | Case update by poll (a19) now U-05. |
| TRG-277 | PROVEN-LIVE | R1F-1 | R2-1 | R3-1 | R1F-1 | R3-1, R1b-1, R2b-1 | COVERED |  |
| TRG-278 | PROVEN-LIVE | not state-dependent: BR17 | — | — | U-06 | U-11 | COVERED | Full compare incl. relationships; blanks in U2-2. |
| TRG-279 | PROVEN-LIVE | not state-dependent: S8-3 | — | — | S8-3 | R1F-1 | COVERED | R1F-1: full update, then `noop` (baseline saved only after success). |
| TRG-280 | PROVEN-LIVE | not state-dependent: R1F-1 | — | — | R1F-1 | S8-1 | COVERED |  |
| TRG-281 | PLANNED | not state-dependent: U-43 | — | — | U-43 | U-43 | COVERED | BR21 exact-value scan (G7) in U-43. Case History Log optional (TRG-282). |
| TRG-282 | DEFERRED | — | — | — | — | — | OFFLINE-ONLY | The integration never reads or writes the History Log: code search `grep -rln "2-52798305\|2-72890328" src` outside `src/tests`: none (2026-11-24; the same search as TRG-333). [apply-recheck] Re-check: file and search named. |
| TRG-283 | PROVEN-LIVE | not state-dependent: R2-12 | — | — | R2-12 | U-05 | COVERED |  |
| TRG-284 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Question 24 closed. Cutover check (run-sheet change AB-20, for master 4.10): each production sync workflow triggers on property changes with re-enrolment on; the segment is an AND filter only. |
| TRG-285 | BLOCKED | — | — | — | — | — | BLOCKED | RG D15 / OPEN-ITEMS row 8 (Q19): production rollout authority (master C11). |
| TRG-286 | PROVEN-LIVE | not state-dependent: SU-3 | — | — | path n/a: process rule | path n/a: process rule | COVERED | SU-3 reads setting names and non-secret values only. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-287 | PROVEN-LIVE | U-28, U-38 | R2-13 | R3-13b | path n/a: poller eligibility | U-38 | COVERED |  |
| TRG-288 | OFFLINE-ONLY | — | — | — | — | — | PHASE-TWO | Bites only on records linked outside the integration (D19). Offline `stage3NoOp.test.mjs` [BR14][3.7]. |
| TRG-289 | PLANNED | K1, U-42 | R2-23g | R3-13g | U-04 (K1) | GS-1 | COVERED | U-42: no synced destination written; K1 Case path. [pending Zeke: Contact workflow confirmation] |
| TRG-290 | PLANNED | not state-dependent: BR17, BR17 (relabel) | — | — | U-06 | U-11 | COVERED | Removal U-11, replacement U-06, relabel BR17 (relabel). |
| TRG-291 | PROVEN-LIVE | not state-dependent: U-01 | — | — | U-01 | U-05 | COVERED |  |
| TRG-292 | PLANNED | not state-dependent: S8-4 | — | — | path n/a: poller rule | SU-2, S8-4 | COVERED | Gap a12 closed by S8-4. |
| TRG-293 | PROVEN-LIVE | not state-dependent: S8-1 | — | — | path n/a: sweep rule | S8-1 | COVERED |  |
| TRG-294 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Item TTL needs a Cosmos data-plane read; `stage2DurableState.test.mjs` [2.1]. |
| TRG-295 | PLANNED | not state-dependent: S8-3 | — | — | S8-3, R2-16 | path n/a: one queue retry schedule for every start | BLOCKED | BLOCKED (S8-3 method, run-sheet open question 3; email receiver S9, Azure write; Zeke). Fallback with Zeke's approval: OFFLINE-ONLY (`stage2PortalAndRetries.test.mjs`, `stage3LabelWorkerSide.test.mjs:321`). |
| TRG-296 | PLANNED | not state-dependent: S8-3 | — | — | S8-3 | path n/a: one queue retry schedule for every start | BLOCKED | BLOCKED (S8-3 method, run-sheet open question 3; email receiver S9, Azure write; Zeke). Fallback with Zeke's approval: OFFLINE-ONLY (`stage2PortalAndRetries.test.mjs`, `stage3LabelWorkerSide.test.mjs:321`). |
| TRG-297 | NOT-BUILT | — | — | — | — | — | BLOCKED | Waits on item 20 build (master C3; slice gap c2); offline test b2 when built. [apply-recheck] Re-check check 5 / O5: item 20 is a phase-one build gap, not a decision. Prerequisite P-1b: the build chat builds item 20 with offline test b2 before the P-1 commit (tested build = cutover build); then COVERED by b2 + the S10 sweep read. Who unblocks: build chat, on Zeke's word. |
| TRG-298 | NOT-BUILT | — | — | — | — | — | PRODUCTION-ONLY | Master 6.3 item 7: item 19 KQL and alert at cutover (C3). |
| TRG-299 | RETIRED | — | — | — | — | — | RETIRED | Label test 2026-11-20: POST replaces the set; guide update G-10. |
| TRG-300 | PROVEN-LIVE | R1F-5 | R2-10 | R3-6 | R2-10 | R3-6, R1b-3, R2b-3 | COVERED |  |
| TRG-301 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Needs a CR rejection; stage1 "[G17] a 400 / 409 on employee create is error". |
| TRG-302 | PROVEN-LIVE | not state-dependent: BR2 | — | — | R4-2, R1c-2, R3b-2 | R3-3, R1b-2, R2b-2 | COVERED | [apply-recheck] Re-check citation fix: R1c-2 and R3b-2 are the temporary-ID BCBA webhook creates on the pending build (R4-2 ran on `655b385`). |
| TRG-303 | PLANNED | not state-dependent: BR8 (U-24, U-30, R2-9) | — | — | R2-9 | U-24 | COVERED |  |
| TRG-304 | PROVEN-LIVE | not state-dependent: R2-2 | — | — | R2-2, R4-1 | R3-3, R1b-2, R2b-2 | COVERED | Found-in-CR branch: TRG-305. |
| TRG-305 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Phase one create-path case (CR already holds staff entered by hand). X07a-10: after U-37 (S7), the U-32 hand-made BT/RBT with `workday_id` 4837593, Entered = Yes → lookups find CR 5384530, no HubSpot holder → HS `waiting`, no CR write, no `employee_id` (run-sheet change AB-12 applied; needs U-37 run in phase one). [apply-recheck] Re-check G3 / E7: X07a-10 cannot give this outcome (holder search by `employee_id`, `src/lib/hubspotClient.mjs:355-395`; R1 BT/RBT 1 holds 5384530, so the run ends `error` ANOTHER_HUBSPOT_RECORD_LINKED, `src/workflows/employeeSyncWorkflow.mjs:897-904`); X07a-10 is not run. Offline: `stage1CreateIdentity.test.mjs` "[G17] a Workday ID found only in CentralReach, with no HubSpot holder, is waiting and writes nothing". Live leg on CR 5338681: open decision 10. |
| TRG-306 | RETIRED | — | — | — | — | — | RETIRED | L1738 (11/18): record gate replaced "poller disabled". |
| TRG-307 | PENDING | — | — | — | — | — | PRODUCTION-ONLY | Cutover (master 4.10, 6.3); the go-live check of employees already in CR is phase two. |
| TRG-308 | OFFLINE-ONLY | not state-dependent: R2-13 | — | — | path n/a: poller rule | R2-13, U-35 | COVERED | Now proven live: linked records in Paused / Discharged / Terminated are polled. |
| TRG-309 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | `stage3Poller.test.mjs` "[BR14][3.2] a record is queued whatever integration_last_write says". |
| TRG-310 | PLANNED | not state-dependent: U2-2 | — | — | X07b-4 | U2-2 | COVERED |  |
| TRG-311 | PROVEN-LIVE | not state-dependent: BR3 | — | — | BR14 (duplicate signals) | path n/a: webhook queueing rule | COVERED |  |
| TRG-312 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | A live 403 cannot be forced safely; `stage3PollerReviewFixes.test.mjs` [BR16], `stage4EmployeeMissingKeys.test.mjs`. |
| TRG-313 | PLANNED | not state-dependent: R1-U1 | — | — | U-01, U-17 | U-11 | COVERED | Two edits on one record per path. |
| TRG-314 | PLANNED | not state-dependent: R1-U2 (U2-1 to U2-6); NJ R3-9 | — | — | X07b-4 | U2-1 | COVERED | Question 27 decided (U2-4, U2-5, R3-9). |
| TRG-315 | PLANNED | U-17, U-16 | R2-11, R2-13 | R3-8 | U-17 | R3-8 | COVERED |  |
| TRG-316 | PLANNED | C20 (R1-U1), K1 | R2-15, R2-23g | R3-8, R3-13g | K1, C20 (Case run) | R3-8 | COVERED | `active_cases_count`: question 13 decided as prerequisite P-7 (R2-15 hand-set fallback). K1 Case run. [pending Zeke: Contact workflow confirmation] |
| TRG-317 | PLANNED | U-04, U-33, K4 | R2-23g | R3-13g | K1, U-27, U-33 | GS-1, U2-5, R3-9, R3-19 | COVERED | Guardian via the Case sync (K1); employee mirrors U-27, U-33. [pending Zeke: Contact workflow confirmation] |
| TRG-318 | PLANNED | U-06, U-11 | R2-5, R2-7, R2-8 | R3-8 | U-06 | U-11 | COVERED |  |
| TRG-319 | PLANNED | not state-dependent: BR3 | — | — | BR14 (duplicate signals) | path n/a: webhook notices | COVERED |  |
| TRG-320 | PLANNED | not state-dependent: BR14 (webhook and poller at once) | — | — | U-43 | U-43 | COVERED |  |
| TRG-321 | PROVEN-LIVE | not state-dependent: S8-3 | — | — | S8-3 | BR14 (webhook and poller at once) | COVERED | No duplicate create: BR3. |
| TRG-322 | PENDING | — | — | — | — | — | BLOCKED | Research task O-HS-JOURNAL (Pkg H8); no behaviour until Zeke decides. |
| TRG-323 | BLOCKED | — | — | — | — | — | BLOCKED | Pkg H-Q6 (master C16). |
| TRG-324 | PENDING | not state-dependent: R1F-1 | — | — | R1F-1 | S8-1 | COVERED | This deploy's bump: one full update, then `noop`. |
| TRG-325 | PROVEN-LIVE | not state-dependent: SU-1 | — | — | path n/a: setup check | path n/a: setup check | COVERED | Pending build must be committed before the deploy. [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-326 | PROVEN-LIVE | not state-dependent: SU-1, SU-2, SU-3 | — | — | path n/a: setup check | path n/a: setup check | COVERED | [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-327 | PROVEN-LIVE | not state-dependent: SU-1 | — | — | path n/a: setup check | path n/a: setup check | COVERED | Production resources open (RG E6; master 6.3 item 9). [apply-recheck] Process line (re-check check 2): proven by set-up steps, not an end-to-end run. |
| TRG-328 | PENDING | not state-dependent: SU-2 | — | — | path n/a: poller setting | SU-2 | COVERED |  |
| TRG-329 | PENDING | not state-dependent: SU-2, S8-4 | — | — | path n/a: poller setting | SU-2, S8-4 | COVERED | Removal at cutover: master 6.3 item 4. |
| TRG-330 | PROVEN-LIVE | not state-dependent: S8-3 | — | — | S8-3 | path n/a: queue mechanics | COVERED | S8-3 runs on the employee queue; client queue uses the same code. |
| TRG-331 | PLANNED | not state-dependent: U-42 | — | — | U-42 | U-42 | COVERED | BR13 property-history read. |
| TRG-332 | PENDING | not state-dependent: U-01 | — | — | U-01, U-02, U-03 (refresh); R1-1, R1c-1, R1-2, R1c-2, R1-3, R1c-3 (entry), R3b-1, R3b-2, R3b-3 | path n/a: workflow design | COVERED | Production workflows at cutover (master 4.10). |
| TRG-333 | OFFLINE-ONLY | — | — | — | — | — | OFFLINE-ONLY | Code search; writeback allowlist `checkTriggers.test.mjs` [BR13][3.10]. |

## Added requirements (2026-11-24): risk N1, unmapped CentralReach fields

Risk N1 was confirmed live on 2026-11-24 on test employee 5338681 and test client 5384589 (`unmapped-field-wipe-check-2026-11-24.md`, `sandbox-rounds/cr-unmapped-fields-run-2026-11-24.txt`): the pending build's subset core PUT blanked unmapped keys (employee `jobTitle`, `chosenName`; client `chosenName`). The client approved the fix ("send back every field from the read the update already makes, with mapped fields overriding; skip the core PUT when no mapped core field changed; client update sends back externalSystemId"); build chat 2 built it (`build-chat-2-field-wipe-fix-2026-11-24.md`, not committed).

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| N1-EMP | NEW (not in a slice) | not state-dependent: UW-1, UW-3, UW-4, UW-5 | — | — | UW-1 (S1 first run, S1u metadata-only, S2 core PUT) | UW-1 legs by `employeePoller` are not separately needed: the body is built in the worker whatever the source | COVERED | An employee update keeps every CR key the integration does not map (body = the read with mapped keys laid over) and sends no core PUT when no mapped core key differs. Build pending (SU-1): N1 fix + SSN guard. [apply-recheck] Re-check G5: the core-PUT leg is S2 (BT/RBT 1 and BCBA Contact `city`, real core edits), not S1. Re-check E10 / check 8: UW-3 is the SSN guard (live: blank `ssn` sent back in S2; refusal: OFFLINE-ONLY, `br16UnmappedFieldsKept.test.mjs` "[BR16][3.13][B3][B8][T2] the SSN guard …"); the production read format is N1-SSN. UW-4 hireDate PASS live on 5338681 (2026-11-24); UW-5 employee leg is an observation only. |
| N1-CLI | NEW (not in a slice) | not state-dependent: UW-2, UW-5 | — | — | UW-2 (S1, S1u, S2 core PUT) | as N1-EMP | COVERED | A client update keeps every unmapped CR key, sends back `externalSystemId` when the read holds one, and sends no core PUT when no mapped core key differs. Build pending (SU-1): N1 fix + SSN guard. [apply-recheck] Re-check G5: the core-PUT leg is S2 (R1 Case `location_city`). SSN guard refusal offline: `br16UnmappedFieldsKept.test.mjs` "[BR16][3.13][C2] …" (the Case twin). UW-5 client list leg: L1 (`cr-live-checks-L1-L3-2026-11-24.md`) found the test client's lists empty while every production client holds a payor and a diagnosis code; the leg needs Zeke's hand set-up (open decision 7) and is a stop-before-launch item. |

## Added lines (2026-11-24, apply-recheck): slice 08 rows with testable behaviour, and the SSN read format

Re-check check 1 (slice 08 scope) and check 8 (N1-SSN). GC rows are slice 08 rows (`requirements-review-2026-11-24/08-*.md`); slice 08 itself is not edited.

| Req # | Status (slice) | NY | CO | NJ | Webhook | Poller | Class | Note |
|---|---|---|---|---|---|---|---|---|
| GC-059 | BLOCKED | — | — | — | — | — | BLOCKED | One JSON line per log call (package item 13, E17). **Not built** in the working tree: `src/lib/safeLog.mjs` logs `console[level](message, meta)`; item 13 is "Recommended, awaiting Zeke's word" (`BUILD-PACKAGE-DRAFT-2026-11-23.md:43`, open question 17). The re-check's "covered implicitly by the KQL steps" does not hold. Waits on: Zeke's word on item 13, then the build chat. Once built: matrix row GC-059 (S0 SU-5, every push). |
| GC-102 | (slice 08) | — | — | — | — | — | OFFLINE-ONLY | Decision 51: the code no longer checks the HubSpot re-enrolment triggers; `check-triggers.mjs` prints a reference list only. `checkTriggers.test.mjs` "[BR18][3.10] the script lists all four objects and exits 0, with or without --expected, and compares nothing". |
| N1-SSN | NEW (re-check check 8) | — | — | — | — | — | PRODUCTION-ONLY | Cutover check, read-only: on a sample of production CR employees and clients, is the GET `ssn` blank or a full 9 digits (`999999999` / `999-99-9999`), or masked? If masked, every core update of a record with an SSN on file ends `error` `CR_EMPLOYEE_READ_FAILED` / `CR_CLIENT_READ_FAILED` naming `contact.ssn` (no data loss; the guard refuses the PUT). L2 shape-only survey (`cr-live-checks-L1-L3-2026-11-24.md` section 3): 15 production employees, none holds an SSN (12 empty text, 3 absent); the guard passes both. The filled-SSN read form is still unknown: CentralReach support, or a shape-only read of one employee Zeke knows has an SSN (open decision 9). Zeke decides before cutover. |
