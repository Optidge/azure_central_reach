# Sandbox coverage ledger: independent review B, slices 05, 06, 07a, 07b (2026-11-24)

**Scope.** Every ledger line of `sandbox-coverage-ledger-2026-11-24.md` slices 05 (L780-901), 06 (L903-991), 07a (L993-1171) and 07b (L1173-1350), checked against the slice files, `00-MASTER.md` (sections 3, 4, 6, 8, 9 and both completeness checks), `sandbox-test-matrix.md`, `sandbox-rounds/retest-run-sheet-2026-11-24.md`, `scripts/sandbox/create-test-records.mjs`, `scripts/sandbox/check-cr-record.mjs`, `round-1-log.md` (R1-U1 old lines), `round-4.json`, the package (D18 g, seventh set), the handoff State section, and the label code in the working tree (`src/mappings/client/buildClientMetadata.mjs`, `src/mappings/employees/buildEmployeePayload.mjs`). Read-only. No HubSpot, CentralReach, Azure or Google Doc call. No git state change. This file is the only file written.

**Verdict.** The ledger's "GAPS: 0" does not hold for slices 05-07. **42 real gaps** (30 marked COVERED, 12 given an invalid exception) and **41 BLOCKED lines** (14 more than the ledger shows, because 14 COVERED lines wait on O-21, question 13, the U-46 workflow or the S8-3 method). Gate not met.

---

## 1. Counts

| Check | 05 | 06 | 07a | 07b | All |
|---|---|---|---|---|---|
| Ledger lines checked | 118 | 85 | 175 | 174 | **552** |
| Slice requirement rows (unique IDs) | 118 | 85 | 349 (07a + 07b) | | 552 |
| Missing IDs (in slice, not in ledger) | 0 | 0 | 0 | 0 | **0** |
| Invented IDs (in ledger, not in slice) | 0 | 0 | 0 | 0 | **0** |
| Ledger status ≠ slice status | 0 | 0 | 0 | 0 | 0 |
| Ledger class counts reproduce the Totals table | yes | yes | yes | yes | yes |
| Cited matrix rows that do not exist | 0 | 0 | 0 | 0 | 0 |
| Ledger COVERED | 51 | 62 | 133 | 137 | 383 |
| COVERED confirmed (as cited, or with a citation fix only) | 45 | 56 | 122 | 116 | **339** |
| COVERED wrongly: real gap (needs a row, an expected value or a step change) | 5 | 4 | 4 | 17 | **30** |
| COVERED wrongly: actually BLOCKED | 1 | 2 | 7 | 4 | **14** |
| Citation-only fixes (rule still proven by another row) | 10 | 11 | 4 | 4 | 29 |
| Invalid exceptions (class wrong; 12 of them become gaps) | 7 | 4 | 5 | 4 | **20** |
| BLOCKED (true, after this review) | | | | | **41** |

Slice files list some IDs twice (the correction tables); unique IDs are counted. Duplicates are not a defect.

**BLOCKED by cause (41).**

| Cause | Who can unblock | Count | Lines |
|---|---|---|---|
| United Care / Sara / Danny answers | Danny, United Care | 15 | CLB-050; LBL-027 to LBL-033; TRG-019, 021, 022, 065, 095, 243, 245 |
| Sandbox Contact webhook workflow (O-21) | Zeke (HubSpot sandbox) | 9 | CLB-133, LBL-080, TRG-128, 142, 143, 145, 146, 159, 263 |
| Not built: N6 reports and views | Zeke (HubSpot) | 5 | TRG-168, 169a, 169b, 169c, 170 |
| Not built: item 20 (sweep retry cap), "before cutover" | build chat, Zeke's commit | 2 | CLB-160, TRG-297 |
| S8-3 forced-failure method (run sheet open question 3) and the email receiver (S9, Azure write) | Zeke | 3 | TRG-171, 295, 296 |
| Question 13: sandbox `active_cases_count` workflow enrolment | Zeke | 1 | TRG-140 |
| U-46: does the payor-status workflow exist in sandbox 52311591 | Zeke | 1 | LBL-082 |
| Open decisions not closed on 11/24 (RG D15, H-Q6, O-HS-JOURNAL) | Zeke | 3 | TRG-285, 323, 322 |
| Guide write (O-34) | Zeke | 2 | TRG-001, LBL-009 |

Five ledger BLOCKED lines are stale (closed by Zeke's 11/24 closing sentence, handoff L62: "package question 24 ... and requirements-review master questions 10–38 (each as recommended)"): CLB-153 (question 19), TRG-084 (package question 24 / master question 2), TRG-164 (question 12), TRG-273 (question 25), TRG-284 (question 24). TRG-282 is not blocked (nothing to build; the code never touches the History Log). Their new classes are in the table below.

---

## 2. Findings

"Ledger" = what the ledger line says. Evidence uses `file:line`; L = ledger line; M = `sandbox-test-matrix.md`; RS = `retest-run-sheet-2026-11-24.md`; CTR = `scripts/sandbox/create-test-records.mjs`; CCR = `scripts/sandbox/check-cr-record.mjs`; R1L = `sandbox-rounds/round-1-log.md`.

### 2.1 Run-sheet defects that break several lines (fix these first)

| # | Requirement IDs | Ledger says | What is actually true | Evidence | Exact fix |
|---|---|---|---|---|---|
| A | LBL-057 (and the RBT CO half of LBL-049) | COVERED: CO cell "TL3 (U1b), U-21"; webhook U-02, poller U-36 | RS S5b runs old line 12 (BT/RBT 1 `location` → Colorado) **and** old line 13 (`bt_rbt_type` → blank) in one sub-push. With the type blank the role labels are unmanaged (decision 35), so RBT CO `1107692` is never added and RBT NY stays. The only row for RBT × CO cannot pass. | RS:87, RS:92 ("S5b: 12, 13, 56, 58"); R1L:293, R1L:303; `buildEmployeePayload.mjs:130-134, 166-172` | Split the sub-pushes: S5b old line 12 only; S5c old line 13; S5d old line 14. Expected after S5b on R1 BT/RBT 1 (NY, poller): `labels` = All Employees 1052618, Clinical 1052643, CO Employee 1107687, RBT CO 1107692; NY Employee 1132655 and RBT NY 1052631 absent. |
| B | LBL-077 (BT/RBT half), TRG-232, TRG-235 (also LBL-046/-049/-055/-060 webhook citations) | COVERED: webhook "U-21" / "U-02" | No BT/RBT label source (`location`, `bt_rbt_type`) is edited while the BT/RBT refresh workflow is on. Every BT/RBT label edit is in S5 (workflows off): old lines 10, 12, 13, 14 (R1), R2-20, R3-7. U-21 in S4 covers only BCBA and Case label sources. | RS:78 (S4 NY list), RS:84-88, RS:92; M:459, M:480, M:526 | Move old lines 10 and 12 to S4 (NY, webhook, workflows on) as one push: R1 BT/RBT 1 `bt_rbt_type` BT → RBT and `location` New York → Colorado. Expected: first run `source` `hubspotWorkflow`; labels 1052618, 1052643, 1107687, 1107692; 1132655, 1052630, 1052631 absent. Lines 13, 14 stay in S5 (poller); poller label proof for BT/RBT stays R2-20 (CO) and R3-7 (NJ). Set `check-cr-record.mjs` `btU1` TL1 = [1107687], TL3 = [1107692]. |
| C | CLB-030, CLB-151 (blank removal), CLB-037; citations in CLB-014, CLB-060, CLB-064 | COVERED via U-16 (NY): "staffing label off, In-Active on, NY Client kept" | By S5c the R1 Case already holds no staffing label (Hot Lead since S4 old line 55), is already Cold (U-17, S4) and is in **New Jersey** (old lines 70-71, S4). U-16 changes no label: nothing is removed, and "NY Client kept" would FAIL. The same S4 push moves the state, so U-17's "keeps NY Client" also fails. R2-13 (CO) can prove the blank removal (R2 Case holds Staffed 97153 from R2-10) but its expected value does not say so. | M:521, M:522, M:452; RS:78 (lines 55, 64, 67-71), RS:88; CCR:340-345 (u1 CL1 = NJ 1132647); guide L629 (Paused → blank `staffing_status`) | (1) Matrix R2-13 expected: "R2 Case → Paused (S5c, poller): `staffing_status` blank → Staffed 97153 1156746 removed; In-Active 1121488 added, Active 1125427 removed; CO Client 1132648 kept; All Clients kept". (2) U-16 expected: "no label change (no staffing label held since S4); In-Active still held after a run with blank `staffing_status` (CLB-014)". (3) U-17 expected: "Active removed, In-Active added; state label = NJ Client 1132647 (U-48 in the same push)". (4) Ledger: CLB-030 / CLB-151 / CLB-037 NY cells → "not state-dependent: R2-13"; CLB-060 poller → R2-23b; CLB-064 NY → "not state-dependent: R2-11, R2-13". CLB-030, CLB-037 and CLB-151 count as gaps until (1) is in the matrix: today no row's expected value states the blank removal. |
| D | LBL-075; poller citations in LBL-025, LBL-038, LBL-078, TRG-047, TRG-247 | COVERED: "WD-3 adds Billing Hold on the R4 BCBA while `waiting`" | Round 4 uses the R1 pattern (`slot` 0), so the R4 BCBA was created with `cr_billing_hold_label` = Yes and CR already holds 1103437 (R-WD BL7 PASS). Setting Yes again is no change: no label POST. LBL-075's CO / NJ cells (R2-14, R3-13c) change no label source. | CTR:79-81, CTR:221; R1L:475 (PASS 26); M:568 | Matrix WD-3: "R4 BCBA (NY, `waiting` after WD-1), S5a, poller: `cr_billing_hold_label` Yes → No. Expected: first run `source` `intakePoller`; HS stays `waiting`; labels: 1103437 absent, 1052618, 1052643, 1130668, 1132655, 1124245, 1052629, 1107647, 1132653 kept". |
| E | U-38 vs old line 3: TRG-109, TRG-157 (poller cell U-38), TRG-130, TRG-158, LBL-081 (BT/RBT half) | COVERED | S5a sets R1 BT/RBT 1 `entered_in_centralreach` twice in one sub-push: old line 3 (→ `No- Made Inactive`, BR12) and U-38 (→ cleared). Only one value can hold per poll run. | RS:86, RS:92 ("S5a: 3, 4, ..."); M:543; R1L (line 3 row) | Keep old line 3 in S5a. Move U-38 to S5c: R1 BT/RBT 1 Entered cleared + `home_apt` → "Apt 1C U1". Expected: `source` `intakePoller`, update sent, CR address line 2 "Apt 1C U1". |
| F | CLB-026 (Starting 97153 never sent) vs U-16 | RETIRED, "never sent" proof RS 59 | Old line 59 (`staffing_status` → Starting 97153) and U-16 (stage → Paused, which blanks `staffing_status`) are in the same S5c sub-push on the R1 Case: the run sees only the final value. | RS:88, RS:92 ("S5c: ... 57, 59") | Move old line 59 to S5d (with U-14's Case edit). Expected: no staffing label; `noop` or metadata-only update. |
| G | X07a-3 / X04-1: TRG-036 (BT/RBT checklist trigger), and the webhook cells of TRG-037, TRG-049, TRG-055, TRG-056 | COVERED: webhook X07a-3 "BT/RBT workflow on" | X07a-3 rides the R2-14 tick in S5a, but RS S5 turns the BT/RBT refresh workflow off for S5a-S5d. The webhook half cannot run as scheduled. BCBA half (WD-1, S4) is fine. | M:608, M:602; RS:84, RS:86 | Move X04-4, the tick (R2-14 tick, X04-1, X07a-3) and the untick to S7 (workflows on) on R2 BT/RBT 1: push 1 checklist "Medicaid ID Claim Settings" only → `waiting`; push 2 add "External System ID" → first `source` `hubspotWorkflow`, HS `error` CHECKLIST_STILL_TEMPORARY, update sent; push 3 untick → `waiting`. |
| H | TRG-184, TRG-185, TRG-186, TRG-188 (and X01-2's STF rollup half) | COVERED: webhook X07b-1 "C11 / C14 association steps already on the run sheet" | Those association steps (U-10, C11 RE removal, C14 swap, BR17 relabel) are all in S5a-S5f with the Case workflow off. Only U-06 (`current_primary_bt`, TRG-187) runs in S4. | M:614; RS:86-91 | Add to S4 (CO, R2 Case, Case workflow on), one Case edit each so the run is not association-only: (1) add R2 BCBA 2 as RE BCBA (229) → `reassessment_bcba_name`; (2) relabel R2 BCBA IA (223) → Supervising (247) on BCBA 2 → `supervising_bcba_name`, `ia_bcba_name`; (3) add R2 BT/RBT 2 as Primary BT 2 (240) → `current_primary_bt_2`. Expected: first run `source` `hubspotWorkflow` each; Meta 144602, 131308, 131314, 138092 follow; restore in S7. |
| I | CLB-132, LBL-079 | COVERED by S8-2 "label change caught by the sweep alone" | Impossible as written: a label-source edit moves `hs_lastmodifieddate`, and with the 5-minute poller on the next poll queues it within ~10 minutes. The sweep runs inside the poller function, so it cannot run without the poll. | RS:114; M:572; `src/workflows/intakePollerWorkflow.mjs:4-8` | Reclass both to OFFLINE-ONLY: `src/tests/smoke/stage3DailySweep.test.mjs` (sweep queues every linked record) plus S8-1 (live: the sweep re-runs linked records). Drop S8-2's "label change" claim, or redefine S8-2 as "the 08:00 sweep run of the R1 Case reads labels and ends `noop`". Needs Zeke's approval as an exception. |
| J | TRG-161, TRG-202, TRG-274, CLB-039 | COVERED by BR18 (status flip), R2-24, X07b-3 | No row sets a Case up so that a scheduled run changes it: the 1 PM run flips only "Service Ready w/Start Date" and "Restaffing SR w/Start Date" Cases to Staffed 97153 the day after the BT 1 start date. No test Case is in those stages. Also BR18 needs the Case workflow off and X07b-3 needs it on at the same flip. | guide L230, L633, L943; M:162, M:469, M:616; RS:114 | Day 1 evening: R2 Case (CO) → stage "Service Ready w/Start Date", BT 1 start date (the property the 1 PM workflow reads; Zeke names it) = day 1; Case workflow **off**; expect at day 2 13:00 Eastern `staffing_status` → Staffed 97153, a run with `source` `intakePoller` and the "Change found by the poller" warning, labels 1156746 on. Day 2: R3 Case (NJ) the same with the Case workflow **on**; expect at day 3 13:00 Eastern `source` `hubspotWorkflow`, 1156746 on (1156747 off). If Zeke will not wait a third day, accept the NJ webhook half as an exception. |
| K | TRG-102, TRG-112 (create half of the Cleanup exclusion), CLB-038 create half | COVERED by R2-12 | Matrix BR6 includes "a new Case (by hand) created in `1383894301` with Entered = Yes", but RS S7 only moves the linked R2 Case through the four stages; the by-hand Case is not among the run sheet's 7 hand-made records. | M:141, M:451; RS:36, RS:101 | Add to S7: by-hand Case (CO values, `sandbox_test_field` true, Entered = Yes, unlinked) created directly in stage `1383894301`. Expected: webhook run `skipped` `excluded_stage`; no poller line; CR `byExternalSystemId` = its HubSpot ID → 404; then clear Entered. |

### 2.2 Other wrongly COVERED lines (gaps)

| Requirement ID | Ledger says | What is actually true | Evidence | Exact fix |
|---|---|---|---|---|
| TRG-211 | COVERED, webhook X07b-1 | No step edits the R1 Case `location_city`. | M:614; RS:78; R1L old lines 31-55 | S4 NY: R1 Case `location_city` → "New York U1". Expected first run `source` `hubspotWorkflow`; CR City "New York U1". |
| TRG-214 | COVERED, webhook X07b-1 | No step edits `postal_code` with the Case workflow on (X02-6 is on R3 in S8b, "both"). | M:600, M:614 | S4 NY: R1 Case `postal_code` → "10011". Expected `source` `hubspotWorkflow`; CR `ZipPostalCode` 10011. |
| TRG-239 | COVERED, webhook X07b-2 "U-21 / U-27 ... `employee_phone`" | No step edits the BCBA Contact phone. | M:615; R1L old lines 15-29 | S4 NY: R1 BCBA Contact `phone` → "(212) 555-0144". Expected `source` `hubspotWorkflow`; CR phone 2125550144. |
| TRG-227a, TRG-231a, TRG-231b, TRG-231c, TRG-231d, TRG-231e | COVERED, webhook U-36 | U-36 ("every BT/RBT mapped field not yet in an update line") names no fields or values for S4; old line 4 (`apartment__work`) is in S5a (poller). No step edits BT/RBT `first_name` or the work address fields with the workflow on. | M:541; RS:78, RS:86 | Write U-36's S4 list: R1 BT/RBT 1 `first_name` "Jane" → "Janet"; `street_address__work_` "105 Work Plaza U1"; `city__work_` "New York U1"; `state__work_` NJ; `postal_code__work_` "10015"; `apartment__work` "Suite 1 U1". Expected one run, `source` `hubspotWorkflow`; CR first name and Meta 133819 follow. |
| CLB-033, CLB-034, CLB-035 | OFFLINE-ONLY (T-CL:127) | Invalid exception: the sandbox can set Warm Lead, Cold Lead and Processing Leads on a linked Case. Hot Lead is the only lead value with a row. | L811-813; slice 05 L63-65 | S5d / S6b (poller), R1 Case `staffing_status` → Warm Lead, then Cold Lead, then Processing Leads (one per sub-push, each with one Case edit). Expected each time: no staffing label (CL4 group absent), no label POST. |
| CLB-104 | OFFLINE-ONLY | Invalid: a funding label can be hand-added in S0 like School. | L870; RS:16 | S0: Zeke hand-adds Aetna NY 1082497 to client 5384589. R1F-5 expected: 1082497 kept. Add to `caseU1` a row "CLB-104 funding kept" want [1082497]. |
| LBL-024 | OFFLINE-ONLY | Invalid: Yes → Grad Permit is stageable (R2 BCBA is Yes after R2-21). | L930 | S7 (webhook): R2 BCBA `lba_licensure__ny` Yes → Grad Permit. Expected: LBA NY 1052629 removed, GRAD 1092164 added, one POST. Then restore Yes. |
| LBL-064 | OFFLINE-ONLY | Invalid: a blank Work State is stageable, and it removes every state label (risk for form-set labels). | L970 | S7: R3 BT/RBT 1 `location` → blank, one field edit. Expected: no state or role label added; 1107686, 1132655 removed; role labels per decision 35; restore. |
| TRG-070, TRG-305 | OFFLINE-ONLY / PHASE-TWO | Invalid: a new HubSpot record whose Workday ID a CR employee holds with no HubSpot holder is a **phase one** create-path case (CR already holds staff entered by hand) and can be staged with no CR write. | L1066, L1322; M:542 (U-37) | After U-37 (S7: R1 BT/RBT 1 `workday_id` cleared): hand-made BT/RBT, `workday_id` 4837593, Entered = Yes, gate true. Expected: lookups find CR 5384530, no HubSpot holder → HS `waiting`, no CR write, no `employee_id`; then clear Entered and restore U-37. |
| TRG-085 | PRODUCTION-ONLY | Invalid: Zeke ruled that workflows are built in the sandbox and deployed to production (handoff L49), and package D18 g already defines BR4-P for this. | L1081; BUILD-PACKAGE L872 | Add BR4-P: build the promote-after-create workflow in the sandbox before S3; in S3c let it run on the R3 records (expected: `centralreach_updates_only` turns true after `client_id_number` / link write, one property-history timestamp; no hand tick). Keep the hand tick for R2 (G-2). |
| TRG-084 | BLOCKED (package Q24) | Stale: Q24 closed 11/24 "as recommended". Also sandbox-buildable (as TRG-085). | L1080; handoff L62 | Build the creates workflow in the sandbox; S3a: confirm it ticks `centralreach_creates_only` on R2 records (the script stops setting it). Else PRODUCTION-ONLY with a 4.10 check "creates workflow enrolment: created after cutover, Entered = Yes, CR ID unknown". |
| TRG-137 | PRODUCTION-ONLY ("master 4.10") | Invalid: master 4.10 has no BT/RBT workflow check. | L1138; MASTER:455 | Add to 4.10: "production BT/RBT entry (W5) and refresh (W2) trigger lists equal the sandbox lists proven by U-36 / X07b-2, incl. `gender`, `state_home`, `active_cases_count`". |
| LBL-008 | DEFERRED | Invalid: this is the live behaviour shipped now (no NM / VA label, warning, other states labelled, no error) and 10 production BCBAs take it; R2-22 / R3-12 exist but are "optional". | L914; M:461, M:485 | Make R2-22 and R3-12 required P1 rows (S5a, poller). Expected R2-22: R2 BCBA `location` + New Mexico → warning `unmapped_work_state`, CO 1107687 and NY 1132655 kept, no 1157030, run not `error`. |
| LBL-077 (whole line) | COVERED | BCBA half covered by S4 lines 25-29 and U-22; BT/RBT half is the gap in 2.1 B. | see B | see B |

### 2.3 Lines that are BLOCKED, not COVERED

| Requirement ID | Ledger says | What is actually true | Evidence | Exact fix |
|---|---|---|---|---|
| CLB-133, LBL-080, TRG-128, TRG-142, TRG-143, TRG-145, TRG-146, TRG-159, TRG-263 | COVERED (fan-out rows U-04, G-5, K1, K4, R2-23g, R3-13g) | Each needs a Contact webhook. O-21 is open (master D8, Appendix B: "No Contact webhook has ever reached this app"). Run-sheet open question 1. | M:429, M:468, M:492, M:507; RS:134; MASTER:137 | BLOCKED on O-21 (Zeke builds the sandbox Contact workflow before S0). Once built, the rows stand as written. The Case-side values (U-48, R3-20) do not depend on O-21: they change Case property-sync fields that the Case paths see. |
| TRG-140 | COVERED (R2-15, R3-8) | R2-15 / R3-8 say BLOCKED on question 13 if the sandbox workflow leaves `active_cases_count` blank (T7 failed twice). | M:454, M:481; RS:135 | BLOCKED on question 13 (Zeke checks the "BT - Active Cases Sync" enrolment). |
| LBL-082 (and LBL-026's NY removal) | COVERED (U-46) | U-46 turns OFFLINE-ONLY if the payor-status workflow is absent, but no offline test can cover a HubSpot workflow. S4 also replaces the hand edit of old line 28 with U-46, so LBL-026 has no row if U-46 cannot run. | M:550; CCR:367 | BLOCKED until Zeke says whether the workflow exists. If absent: LBL-082 → PRODUCTION-ONLY (first-week check, package H) and S4 keeps old line 28 (`ny_insurance_labels` → blank by hand; expect 1107647 removed). |
| TRG-171, TRG-295, TRG-296 | COVERED (S8-3) | S8-3's method is undecided (RS open question 3: "the offline retry tests stand until then"); the alert also needs the email receiver (S9, Azure write). | M:573; RS:113, RS:136 | BLOCKED on the S8-3 method and Zeke's go-ahead for S9. Fallback: OFFLINE-ONLY (`stage2PortalAndRetries.test.mjs`, `stage3LabelWorkerSide.test.mjs:321`) with Zeke's approval. |

### 2.4 Invalid or stale exception classes (no new test needed)

| Requirement ID | Ledger says | Correct class | Evidence |
|---|---|---|---|
| CLB-153 | BLOCKED (question 19) | COVERED: U-48 (state removal), CL2 U1 line 43 (Home removal), R2-11 (status replacement). Q19 closed 11/24. | L893; handoff L62 |
| TRG-164 | BLOCKED (question 12) | COVERED: question 12 closed "accept for go-live, measure once"; U-15 (sweep, S10) is the measurement. | L1165; MASTER:665 (Q12) |
| TRG-273 | BLOCKED (question 25) | Accepted untested (question 25 closed "accept without a test"). List it by name in the exceptions sent to Zeke; there is no class for it in the ledger's scheme. | L1290; MASTER (Q25) |
| TRG-284 | BLOCKED (question 24) | PRODUCTION-ONLY: add to 4.10 "each production sync workflow triggers on property changes with re-enrolment on; the segment is an AND filter only". | L1301; MASTER (Q24) |
| TRG-282 | BLOCKED (optional) | OFFLINE-ONLY: the integration never reads or writes the History Log (same code search as TRG-333). | L1299, L1350 |
| CLB-118, LBL-084 | PHASE-TWO | DEFERRED (dated: "before the existing-records phase", package item 21). Item 21 applies to new records too, so PHASE-TWO is wrong. | L879, L990 |
| CLB-066 | OFFLINE-ONLY | COVERED live: the R3 Case is created with `location` blank (U2-6), so R3-1 posts no state label; CCR CL1 R3 wants [] in the 3-label group. | L836; CTR:144, CTR:283; CCR:228-229 |
| TRG-132, TRG-135, TRG-210, TRG-224, TRG-236 | PRODUCTION-ONLY | Valid only once 4.10 names the check. 4.10 checks the Case workflow for staffing and coordinator fields only, and the BCBA workflow for the checklist only. | L1133, L1136, L1218, L1232, L1251; MASTER:455 | Add to 4.10: "each production refresh workflow's trigger list equals its sandbox list (X07b-1, X07b-2, U-21, U-36); W1/W2 'CR ID known' branch present; manual and automatic enrolment on". |

### 2.5 Citation-only fixes (the rule stays proven by another row)

| Requirement ID | Wrong citation | Correct proof | Evidence |
|---|---|---|---|
| CLB-062, CLB-065 (NJ), TRG-009 NJ, CLB-100 note | "CL1 (R3), R3-1"; poller R3-1 | The R3 Case is created with `location` blank; NJ Client 1132647 arrives only at R3-20 (S4, "both"). No NJ state label is proven by the poller create. | CTR:134-145, CTR:283; CCR:228-229; M:565 |
| CLB-060 poller, CLB-064 NY | U-16 / U-17 "NY Client kept" | R1 Case is in NJ after S4. Use R2-11 / R2-13 (CO) for CLB-064; R2-23b / R3-13b for the poller cells. | see 2.1 C |
| LBL-048 webhook | "R2-14 S5b runs after R2-20" | S5b is poller (workflows off). Webhook: none for BT/RBT labels until 2.1 B is applied. | RS:84, RS:87 |
| LBL-046, -049, -055, -060, -062, -063 webhook | U-21 / U-02 | U1a-U1d run in S5 (poller). After 2.1 B: U1a/U1b move to S4 (webhook). | RS:92 |
| LBL-075 CO / NJ | R2-14, R3-13c | Neither edits a label source. CO: R2-20 (labels sent while R2 BT/RBT 1 holds the temporary ID). | M:453, M:459, M:489 |
| TRG-208 BCBA | "U-03 then U-22" | Same S4 push (one webhook). Use U-03 (S4) then U-24 (S6a). Case: G-6 (S3d) then U-01 (S4). | RS:73, RS:78, RS:96 |
| CLB-154, CLB-155, LBL-013 | "exact-set check, no extras" | CCR only FAILs on IDs inside a row's group. 1156741 is in no group, and the staffing IDs are not in BL8 / TL4, so a held one prints as "extra, not checked" and still PASSes. | CCR:519-527, CCR:617-626 | Add 1156741 to the CL4 group; add [1156743, 1156746, 1156747] with want [] to BL8 and TL4. |
| CLB-099 | "never sent rides CL5 U1 (UHC)" | `caseU1` has no CL5 row, so the U1 UHC check is by hand. | CCR:340-347 | Add CL5 (want [], the 9-ID group) to `caseU1`. |
| CLB-021 poller | R2-23b "runs while it holds it" | A G-2 tick update with labels unchanged posts no label; generic path cell only (ledger caveat L19). | M:463 | None needed; label rules have no path branch. |

---

## 3. True coverage for slices 05-07

| Class | Ledger | After this review |
|---|---|---|
| COVERED | 383 | **342** |
| OFFLINE-ONLY | 41 | 34 |
| PRODUCTION-ONLY | 15 | 14 (5 of them valid only once 4.10 names the check) |
| PHASE-TWO | 9 | 6 |
| DEFERRED | 10 | 11 |
| RETIRED | 61 | 61 |
| Accepted untested (question 25) | 0 | 1 (TRG-273) |
| BLOCKED (not covered) | 33 | **41** |
| **GAP** | **0** | **42** |
| Total | 552 | 552 |

The 42 gaps: TRG-211, 214, 239, 227a, 231a-e (6), LBL-057, LBL-077, TRG-232, 235, TRG-184, 185, 186, 188, CLB-030, CLB-037, CLB-151, LBL-075, TRG-036, CLB-132, LBL-079, TRG-161, 202, 274, CLB-039, TRG-102, TRG-112, CLB-033, 034, 035, CLB-104, LBL-024, LBL-064, TRG-070, TRG-305, TRG-085, TRG-084, TRG-137, LBL-008. Every one has an exact fix above; 2.1 A-H are cheap run-sheet edits, and 2.1 I and J need Zeke's approval of an exception or a 2-3 day wait.

State coverage: every state-dependent label rule in these slices (client CL1 state labels; employee state labels; BT / RBT role labels per state; the multi-state rule) has a real row in NY, CO and NJ **except** RBT × CO (LBL-057, finding A) and, through the poller, the NJ client state label (R3-20 only, path "both"). Checked in code: CL2, CL3, CL4, CL6 and every BCBA licence, assignment, credential, billing and pay label read no state (`buildClientMetadata.mjs:536-546`; `buildEmployeePayload.mjs:176-196`), so one state is enough for them (also master question 22, closed "accept one state"). Funding labels: none built, so CL5 "absent" in each create is the "never sent" proof.

### 3.1 Entity × state × path (create / update × webhook / poller)

"old build" = proven 2026-11-23 on `655b385`, not re-run on the pending build (only R1F-1 re-proves the fields, by update). With the poller on during S3a and S4, a webhook row passes only if the first run's `source` is `hubspotWorkflow` (the R1 Deal webhook came 9 minutes late, R1L 151): if a first run is `intakePoller`, that cell stays a GAP.

| Entity | State | Create, webhook | Create, poller | Update, webhook | Update, poller |
|---|---|---|---|---|---|
| Case | NY | R1-1 (old build) | **GAP** | U-01 (S4) | U-05 (S5a) |
| Case | CO | R2-1 (S3a) | **GAP** | R2-23a (S4) | R2-23b (S3d tick) |
| Case | NJ | **GAP** | R3-1 (S3c) | R3-13a (S4) | R3-13b (S3d tick) |
| BCBA | NY | R1-2, R4-2 (old build) | **GAP** | U-03 (S4) | U-23 (S5a) |
| BCBA | CO | R2-2 (S3a) | **GAP** | R2-23c (S4) | R2-23d (S3d tick) |
| BCBA | NJ | **GAP** | R3-3 (S3c) | R3-13c (S4) | R3-13d (S3d tick) |
| BT/RBT | NY | R1-3, R4-1 (old build) | **GAP** | U-02 (S4) | old line 4 / U-36 (S5a) |
| BT/RBT | CO | R2-3 (S3a) | **GAP** | R2-23e (S4) | R2-23f (S3d tick) |
| BT/RBT | NJ | **GAP** | R3-6 (S3c) | R3-13e (S4) | R3-13f (S3d tick) |
| Contact → Case (fan-out) | NY | n/a (no CR Contact) | n/a | U-04 / K1: **BLOCKED O-21** | n/a (poller never searches Contacts); Case-sync route U-48 |
| Contact → Case (fan-out) | CO | n/a | n/a | R2-23g: **BLOCKED O-21** | n/a; Case-sync route: none named (R2-23g's phone also reaches the Case by its own paths) |
| Contact → Case (fan-out) | NJ | n/a | n/a | R3-13g: **BLOCKED O-21** | n/a; Case-sync route R3-20 |
| Employee Contact mirrors | NY | n/a | n/a | U-27, U-33 (S4) | U2-5 (S2) |
| Employee Contact mirrors | CO, NJ | n/a | n/a | **GAP** | **GAP** |

Missing per entity and state: create by poller in NY and CO, and create by webhook in NJ, for Case, BCBA and BT/RBT (9 cells); NY creates not re-run on the pending build (3 cells); Contact fan-out in all three states (O-21); employee Contact-mirror updates in CO and NJ. Fix, either: (a) Zeke approves "create path proven once per path (CO webhook, NJ poller); the state is data, proven by the field rows in all three states" as a named exception; or (b) 9 extra CR records: S3c (poller, entry workflows off) R2 BCBA 2, R2 BT/RBT 2 and a by-hand CO Case, plus R4 BT/RBT 2, a new NY BCBA and a new NY Case; S3a (webhook) R3 BT/RBT 2, a second NJ BCBA and a second NJ Case, each with the creates box ticked, Entered = Yes, and the round's state values. For the employee mirrors: S4 CO R2 BCBA Contact `address` → "204 Azure BCBA St U1", NJ R3 BT/RBT 1 Contact `zip` → "07104" (expect CR address line 1 / ZIP; `source` recorded).

### 3.2 Azure rows (each needs Zeke's go-ahead for the Azure write)

| Requirement | Run sheet step or cutover check | Azure write |
|---|---|---|
| TRG-093, TRG-325-327 deploy while stopped | SU-1 (S0) | yes (deploy) |
| TRG-328 poller on; every poller cell | SU-2 (S2) | yes |
| TRG-075, 076, 078, 083 two gate settings | S3 set, S3e remove | yes (twice) |
| TRG-171 dead-letter alert email | S9 receiver + S8-3 (method open) | yes; BLOCKED on method |
| TRG-295, 296, 330 retries, dead-letter | S8-3 | method may need one; BLOCKED |
| TRG-050, 292, 329 hourly schedule | S8-4 (remove `INTAKE_POLLER_SCHEDULE`) | yes |
| TRG-298 call-count KQL and alert | master 6.3 item 7 (cutover) | yes |
| TRG-079, 080, 089 production gate settings | master 6.3 item 3 read-back | yes (at cutover) |

---

## 4. Assumptions and limits

- "Covered" for a label rule needs a row whose data produces the label and a read-back; a path cell naming a generic update row is accepted for label rules (the worker has no path branch), not for trigger rules.
- Zeke's 11/24 closing sentence is taken as closing master questions 10-38 as recommended (handoff L62, the orchestrator's record, not a verbatim quote of each answer).
- Not verified live: whether ticking `centralreach_updates_only` fires a sandbox webhook (if it does, the S3d "poller" update cells become webhook runs); whether the Case `location` recalculation alone fires the Case workflow (U-48 / R3-20 also change property-sync fields, so the Case still runs).
- Offline tests named by exceptions exist (checked by file and title); their pass state was not re-run.
