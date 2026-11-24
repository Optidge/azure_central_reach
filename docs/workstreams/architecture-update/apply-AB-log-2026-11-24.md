# Apply log: coverage reviews A and B (2026-11-24)

**What.** Every finding of `sandbox-coverage-review-A-2026-11-24.md` (A, slices 01-04) and `sandbox-coverage-review-B-2026-11-24.md` (B, slices 05-07) applied to `sandbox-coverage-ledger-2026-11-24.md` (ledger) and `sandbox-test-matrix.md` (matrix). Run-sheet, script, test-plan and master 4.10 changes are queued as AB-1 to AB-22 in `run-sheet-changes-from-AB-2026-11-24.md` for another worker.

**How.** Offline only: no HubSpot, CentralReach, Azure or Google Doc call; nothing run with `--write`; no git write; `.env` / `local.settings.json` not opened. Files edited: the ledger and the matrix. Files created: the change list and this log. Ledger lines were changed by a script from a per-ID spec (193 lines by finding, 366 path cells by the S-1 rule below); every row ID cited in a ledger state or path cell was then checked to exist in the matrix (0 missing). Counts are recomputed from the lines.

**Zeke, 2026-11-24 (settles S-1):** "If it makes sense to actually use test records in the sandbox and then in central reach do so. Live calls from test records are ok. If this will cut the testing time for you to test with acutal test records taht we craete for each entity and the states then do so."

## 1. Final counts (ledger, 1,275 lines)

| Class | Before | After |
|---|---|---|
| COVERED | 896 | **877** (96 of them rest on a pending run-sheet change "AB-n") |
| OFFLINE-ONLY | 147 | 142 |
| PRODUCTION-ONLY | 34 | 34 (8 now name a 4.10 check queued in AB-20) |
| PHASE-TWO | 23 | 20 |
| DEFERRED | 15 | 23: NM / VA 14; optional (master section 8) 7; dated item 21 2 (Zeke's call 4) |
| RETIRED | 99 | 100 |
| ACCEPTED-UNTESTED | — | 1 (TRG-273; Zeke's call 5) |
| BLOCKED | 61 | **74** |
| GAP (ledger) / GAP-OPEN | 0 claimed (78 real per A + B) | **4** |

**BLOCKED by cause (74).**

| Cause | Who unblocks | Count |
|---|---|---|
| United Care / Sara / Danny answers | Danny, United Care | 24 |
| O-21 sandbox Contact webhook workflow (fan-out) | Zeke (HubSpot sandbox, S0) | 16 |
| N6 failures reports and waiting views | Zeke (HubSpot sandbox) | 6 |
| S8-3 forced-failure method + email receiver (S9) | Zeke | 6 |
| Guide write (question 7, O-34) | Zeke | 6 |
| Question 13 "BT - Active Cases Sync" enrolment | Zeke | 4 |
| O-17 / package D8 Care Coordinator target | Zeke with United Care | 3 |
| Open decisions (RG D15, H-Q6, O-HS-JOURNAL) | Zeke | 3 |
| Item 20 not built | build chat, Zeke's commit | 2 |
| BR4-P sandbox workflows (TRG-084, TRG-085) | Zeke (call 6) | 2 |
| U-46 payor-status workflow present? (LBL-082) | Zeke | 1 |
| O-51 / T9 (BT-146) | Danny, United Care | 1 |

Per-slice totals and the full BLOCKED / exception ID lists are at the top of the ledger.

**GAP-OPEN (4):** CLB-039, TRG-161, TRG-202, TRG-274. All four are the 1 PM Eastern scheduled flip (B finding J). Row X07b-3b is drafted, but it needs three things I could not derive: the BT 1 start-date property name, whether the sandbox runs the 1 PM scheduled workflow, and whether a day-3 wait is acceptable (Zeke's call 3).

Why the totals differ from the reviews' own tables: A left the 7 Contact fan-out lines COVERED (S-4) while B made its 9 fan-out lines BLOCKED. I made all 16 BLOCKED on O-21 so both are treated the same way. Several lines that A or B marked as gaps now count as COVERED, because the new rows and run-sheet changes cover them.

## 2. Finding → change

### Review A

| Finding | Change (file: row / line IDs) |
|---|---|
| S-1 creates on one path per state | **Firm (Zeke 2026-11-24).** Matrix: new create sets R1b-1 to R1b-3 (NY poller, round 7), R2b-1 to R2b-3 (CO poller, round 5), R3b-1 to R3b-3 (NJ webhook, round 6); G-1c updated. Ledger: legend rewritten (no "path-independent" stand-in; Zeke quoted); 366 path cells of COVERED lines gained the new create rows (rule in section 5). Run sheet: AB-3, AB-4, AB-5. The re-run of the NY webhook creates on the pending build is R1c (Zeke's call 1, AB-22) |
| S-2 employee poller = `employeePoller` | Matrix: Path paragraph; X07a-1, X07a-3, X04-1, WD-3, U-38 expect `employeePoller`. Ledger: legend; TRG-015, -064, -069 notes. Run sheet: AB-1 |
| S-3 S5 workflow state | Matrix: X01-1 → S6a; X01-2 247 leg → S7, other legs in S5e / S5f with the Case workflow ON; X07b-2 stage moves → S6a. Ledger: STF-001, -002, -003, -005, -025, -052, -081; OBJ-021, -022, -027 to -032; TRG-233. Run sheet: AB-8, AB-9, AB-10, AB-12 |
| S-4 fan-out rests on O-21 | Ledger: OBJ-033, OBJ-035, STF-076, STF-077, CASE-175, CASE-182, CASE-184 → BLOCKED (O-21), so they match B's treatment (assumption 3) |
| S-5 no BT/RBT temporary-ID poller create | Covered by S-1 instead of A's R3-6b (no extra record): R1b-3, R2b-3 (poller), R3b-3 (webhook). Ledger: BT-006, BT-008, BT-015 |
| OBJ-008 to -015, CASE-164 | Matrix X01-4 (S3a). Ledger: 9 lines cite X01-4. AB-4 |
| CASE-165 | Matrix U-29b. Ledger CASE-165. AB-10 |
| BT-132 | Matrix U-29 now includes BT/RBT 1. AB-10 |
| STF-001 | Matrix X01-2 247 leg in S7. AB-12 |
| STF-002 etc. (S5e / S5f) | AB-8, with notes on the 6 lines |
| OBJ-021 etc. | Matrix X01-1 → S6a. AB-10 |
| BT-025 | Matrix U-32 (webhook leg) and X07a-1 (poller leg) split. AB-10 |
| BT-055 | Matrix X04-2b (S4 webhook). AB-7 |
| BT-006, BT-008 | Via S-1 (R1b-3, R2b-3, R3b-3) |
| BT-011, BT-017, BT-022 | Matrix R2-14a; poller cells now cite R2-23f / R2-20. AB-7 |
| BT-015 | Citation fix: R2-23f, R1b-3, R2b-3 |
| BCBA-118, BCBA-147 | Matrix U2-7a (S8a), U2-7b (S8b). AB-13 |
| CASE-124 | Matrix C24-F (S4). AB-7 |
| CASE-205, BCBA-005 | Matrix X07a-9 (S1). AB-3 |
| BCBA-009 | Matrix U-45 includes R2 BCBA 2 → COVERED. AB-6 |
| BT-077 | Matrix U2-3b → COVERED, falls back to OFFLINE-ONLY if a sync refills the email. AB-13 |
| API-012, CASE-047 | PRODUCTION-ONLY with the scope check named; AB-20 |
| BT-104, -105, -151 | BLOCKED (question 13) |
| API-033, CASE-198, BT-138 | BLOCKED (S8-3 method, receiver) |
| BT-153 | BLOCKED (N6) |
| BCBA-152, BT-139 | OFFLINE-ONLY (`stage3LabelWorkerSide.test.mjs:262`) |
| BT-109 | COVERED: webhook R2-3 / R2-26, poller R2b-3 |
| CASE-119 | COVERED as API-032 |
| STF-078 | COVERED by X02-5 |
| BT-149 | RETIRED (O-34; master F23) |
| OBJ-036, -037, STF-054, -056, -072, -073, -079 | DEFERRED (optional, master section 8). Zeke's call 4 |
| RD-002 to -004, BT-145 | Stay BLOCKED (guide write); note "no sandbox row needed" |
| CASE-006, -048, -061 | NJ re-cited to R3-20 |
| CASE-199 | Poller cell: "path n/a: one-time deploy event" |
| BCBA-106 | Poller cell: R2b-2, R1b-2. This is a real poller create, which A said was optional |
| BT-141 | Webhook cell: R2-14, R2-2 |
| BCBA-090, -092, BT-108 | Re-cited as "not state-dependent" Screen checks (R2-25 B1; R3-6 T1) |
| X01-3 defect (WF-010) | BCBA leg dropped (matrix X01-3; AB-13). WF-010 rests on the C23 clear |
| Section 4: optional items reclassed / dropped master rows | Covered by the items above and S-1 |
| Cosmetic: 43 slice-03 status qualifiers dropped | Not changed (A calls it cosmetic) |

### Review B

| Finding | Change |
|---|---|
| 2.1 A (LBL-057, RBT CO) and 2.1 B (BT/RBT label sources by webhook) | Merged. Matrix U-21b: old lines 10 + 12 move to S4 as one push; line 13 → S5c, line 14 → S5d. B finding B supersedes A's S5b-only split for line 12. Ledger: LBL-057, -049, -077, -046, -055, -060, -062, -063, -048, TRG-232, -235. AB-7, AB-9, AB-17 (TL1 / TL3) |
| 2.1 C (U-16 / U-17 / R2-13) | Matrix R2-13, U-16, U-17 expected values rewritten. Ledger CLB-030, -151, -037, -014, -060, -064 |
| 2.1 D (WD-3) | Matrix WD-3 Yes → No, `employeePoller` (B wrote `intakePoller`; S-2 applied). Ledger LBL-075 and notes on LBL-025, -038, -078, TRG-047, -247. AB-9 |
| 2.1 E (U-38) | Matrix U-38 → S5c, "Apt 1C U1". Ledger notes TRG-109, -157, -130, -158, LBL-081. AB-9 |
| 2.1 F (line 59) | Line 59 → S5d (AB-9). CLB-026 note |
| 2.1 G (checklist webhook) | Matrix R2-14, X04-1, X04-4, X07a-3 → S7. Ledger TRG-036, -037, -049, -055, -056. AB-12 |
| 2.1 H (association rollups) | Matrix X07b-1b (S4, CO). X07b-1 no longer claims the association steps. Ledger TRG-184, -185, -186, -188. AB-7 |
| 2.1 I (sweep-only label) | CLB-132, LBL-079 → OFFLINE-ONLY. Matrix S8-2 redefined. Zeke's call 2. AB-14 |
| 2.1 J (1 PM flip) | GAP-OPEN: CLB-039, TRG-161, -202, -274. Matrix X07b-3b drafted; X07b-3 superseded. Zeke's call 3. AB-14 |
| 2.1 K (Cleanup create half) | Same row as A's X01-4. Ledger TRG-102, -112, CLB-038 |
| 2.2 TRG-211, -214, -239 | X07b-1 / X07b-2 S4 edits. AB-7 |
| 2.2 TRG-227a, -231a to e | U-36 S4 list. AB-7 |
| 2.2 CLB-033 to -035 | Matrix X05-1, placed in S6a / S6b / S7 (assumption 7). AB-10 to AB-12 |
| 2.2 CLB-104 | R1F-5 now expects the hand-added Aetna NY 1082497 to be kept. AB-2, AB-17 |
| 2.2 LBL-024 | Matrix X06-1. AB-12 |
| 2.2 LBL-064 | Matrix X06-2. AB-12 |
| 2.2 TRG-070, TRG-305 | Matrix X07a-10, which reuses the U-32 hand-made record. Both lines now COVERED (TRG-305 was PHASE-TWO). AB-12 |
| 2.2 TRG-085, TRG-084 | Matrix BR4-P. Ledger: BLOCKED (Zeke's call 6), with a PRODUCTION-ONLY fallback (AB-20 item 5) |
| 2.2 TRG-137 | 4.10 check named. AB-20 |
| 2.2 LBL-008 | R2-22, R3-12 made required P1 → COVERED. Zeke's call 8. AB-9 |
| 2.2 LBL-077 | See 2.1 B |
| 2.3 fan-out lines (9) | BLOCKED (O-21) |
| 2.3 TRG-140 | BLOCKED (question 13) |
| 2.3 LBL-082 / LBL-026 | LBL-082 BLOCKED (U-46). Matrix U-46 fallback. LBL-026 note. AB-2, AB-7 |
| 2.3 TRG-171, -295, -296 | BLOCKED (S8-3) |
| 2.4 CLB-153, TRG-164 | COVERED (questions 19 and 12 closed) |
| 2.4 TRG-273 | ACCEPTED-UNTESTED. Zeke's call 5 |
| 2.4 TRG-284 | PRODUCTION-ONLY. 4.10 check in AB-20 |
| 2.4 TRG-282 | OFFLINE-ONLY (no History Log code) |
| 2.4 CLB-118, LBL-084 | DEFERRED (dated, item 21). Zeke's call 4 |
| 2.4 CLB-066 | COVERED: R3-1 (poller), R3b-1 (webhook) |
| 2.4 TRG-132, -135, -210, -224, -236 | 4.10 check named. AB-20 |
| 2.5 citation fixes | CLB-062, -065, TRG-009, CLB-100 (NJ → R3-20); CLB-060, -064; LBL-048 and the U-21b webhook cells; LBL-075; TRG-208; CLB-154, -155, LBL-013, CLB-099 (AB-17 script groups); CLB-021 needs no change |
| 3.1 entity × state × path | S-1 sets fill the 9 empty create cells. NY webhook creates on the pending build: R1c (call 1). Employee Contact mirrors in CO and NJ: MIR-1 (S4 webhook); the poller cells use a stand-in (call 7) |
| 3.2 Azure rows | No change: each Azure write already waits for Zeke's go-ahead at its step |
| Section 1 BLOCKED table | Used as the cause list. TRG-243 kept under United Care, as B placed it |

## 3. Entity × state × path × create / update (after the changes)

| Entity | State | Create, webhook | Create, poller | Update, webhook | Update, poller |
|---|---|---|---|---|---|
| Case | NY | R1-1 (old build `655b385`); R1c-1 pending Zeke's call 1 | R1b-1 (S3c) | U-01 (S4) | U-05 (S5a) |
| Case | CO | R2-1 (S3a) | R2b-1 (S3c) | R2-23a (S4) | R2-23b (S3d) |
| Case | NJ | R3b-1 (S3a) | R3-1 (S3c) | R3-13a (S4) | R3-13b (S3d) |
| BCBA | NY | R1-2, R4-2 (old build); R1c-2 pending | R1b-2 (S3c) | U-03 (S4) | U-23 (S5a) |
| BCBA | CO | R2-2 (S3a) | R2b-2 (S3c) | R2-23c (S4) | R2-23d (S3d) |
| BCBA | NJ | R3b-2 (S3a) | R3-3 (S3c) | R3-13c (S4) | R3-13d (S3d) |
| BT/RBT | NY | R1-3, R4-1 (old build); R1c-3 pending | R1b-3 (S3c) | U-02, U-21b (S4) | U-36 R3 / old line 4 (S5a), U-38 (S5c) |
| BT/RBT | CO | R2-3 (S3a) | R2b-3 (S3c) | R2-23e, R2-14a (S4) | R2-23f (S3d) |
| BT/RBT | NJ | R3b-3 (S3a) | R3-6 (S3c) | R3-13e (S4) | R3-13f (S3d) |
| Contact → Case fan-out | NY | n/a (no CR Contact) | n/a | U-04 / K1: BLOCKED O-21 | n/a (the poller never searches Contacts); Case-sync route U-48 |
| Contact → Case fan-out | CO | n/a | n/a | R2-23g: BLOCKED O-21 | **empty: no Case-sync route row named for CO** |
| Contact → Case fan-out | NJ | n/a | n/a | R3-13g: BLOCKED O-21 | Case-sync route R3-20 |
| Employee Contact mirrors | NY | n/a | n/a | U-27, U-33 (S4) | U2-5 (S2) |
| Employee Contact mirrors | CO | n/a | n/a | MIR-1 (R2 BCBA Contact address, S4) | **empty: stand-in R2-23d (call 7)** |
| Employee Contact mirrors | NJ | n/a | n/a | MIR-1 (R3 BT/RBT 1 Contact ZIP, S4) | **empty: stand-in R3-13f (call 7)** |

Named empty cells:
- NY creates by webhook on the pending build: these ran on the old build only, unless call 1 adds R1c.
- CO Case-sync route for a Guardian Contact change: no row names one.
- CO and NJ employee Contact-mirror updates by the poller.

## 4. Before / after: CR records, CR calls, time

| Measure | Before (run sheet) | After (AB-1 to AB-21) | With R1c (call 1) |
|---|---|---|---|
| New CentralReach test records | 6 | **15** (+9: R1b, R2b, R3b) | 18 |
| Existing CR records reused | 5 | 5 | 5 |
| Hand-made sandbox records (no CR call) | 7 | 8 (+X01-4; X07a-10 reuses the U-32 record) | 8 |
| CR calls, whole retest | about 900 (700-1,200) | **about 1,250** (1,000-1,600), 0.8 % of the 150,000 monthly Core tier | about 1,325 |
| Hands-on time | about 6.5 h over 2 days | **about 7.75 h over 2 days** (+15 min S1, +10 S3a, +15 S3c, +10 S4, +20 S6 / S7, +5 S8) | +5 min |
| Calendar | 2 days | 2 days; +1 day only if call 3 keeps the NJ webhook half of the 1 PM flip on day 3 | same |
| CR records to inactivate in S11 | 11 | 20 | 23 |

These are the fewest additions that close the findings:
- Nine create records, to meet Zeke's per-entity, per-state, per-path rule.
- Every other new row rides an existing push.
- Where a review gave the option, I used an existing record or a citation fix (S-5 through S-1 instead of R3-6b; X07a-10 on the U-32 record; BCBA-106 on R2b-2).
- Every new row is tagged P1. No new row concerns existing records only.

## 5. Assumptions

1. Rounds 5, 6 and 7 follow the script's existing rule `slot = (round - 1) % 3`: round 5 uses the CO values, round 6 the NJ values and round 7 the NY values.
   - `WORKDAY_ROUNDS` has no entry for these rounds, so every new BCBA and BT/RBT is a temporary-ID create, and no second record holds an R-round Workday ID.
   - Names carry the round number.
   - Expected values are the R2, R3 and R1 matrix columns. Round 6 keeps the R3 blanks, so it posts no NJ state label at create.
2. The R1b Case uses Entered = plain `Yes`. "Yes" is a token of the Case multi-select, as in R3-1's "Yes; Insurance Card(s)".
3. S-4: all 16 lines whose webhook leg is the Contact fan-out only are BLOCKED on O-21. This follows review B's rule; review A left its 7 such lines COVERED.
4. Zeke's 11/24 closing sentence closes master questions 10-38 "as recommended" (handoff L62). Both reviews rely on this.
5. C24-F: the R1 Case `stateregion` is still New York at S4. U-48 changes only `location`, and the fallback reads `stateregion` first (`buildClientMetadata.mjs:226`).
6. X01-4 runs in S3a with the creates box ticked, as review A placed it. Review B put it in S7. S3a is the stronger test: the Case is excluded even though it may be created.
7. X05-1 (Warm Lead, Cold Lead, Processing Leads) runs in S6a, S6b and S7, not S5d as review B said. B's finding F moves line 59, an edit to the same field, into S5d.
8. U-21b: review B's finding B (lines 10 + 12 to S4) replaces finding A's split for line 12. Lines 13 and 14 stay in S5 (S5c, S5d).
9. X07b-1b: the expected Meta values are "follow the new associations per C11, C12 and C14". Review B gives no exact strings.
10. The S-1 path-cell rule was applied mechanically to COVERED lines whose cells I had not set by hand.
    - Webhook cells: R1-1 / R2-1 add R3b-1; R1-2 adds R3b-2; R1-3 / R2-3 add R3b-3.
    - Poller cells: R3-1 adds R1b-1 and R2b-1; R3-3 adds R1b-2 and R2b-2; R3-6 adds R1b-3 and R2b-3, unless the line cites X07a-2.
    - R2-2 (the Workday-ID BCBA create) was not mapped.
11. CR call estimates use build package H1 rates. Time estimates assume the new creates share the S3a and S3c poll cycles.
12. "DEFERRED" is used beyond NM / VA (7 optional items, 2 dated item-21 lines), and ACCEPTED-UNTESTED is a new class. Both wait on Zeke's calls 4 and 5. If he declines, those 10 lines become GAP-OPEN.

## 6. Zeke's calls (numbered, with recommendation)

1. **R1c: re-run the NY webhook creates on the pending build** (+3 CR records, about 75 calls, +5 min, rides S3a). R1-1 to R1-3 ran on `655b385`, before items 15 and 24 changed the create path. **Recommend yes.** It is the only state × path create cell not proven on the build going to production.
2. **CLB-132 and LBL-079 as OFFLINE-ONLY, with S8-2 redefined** as "the sweep run reads labels and ends `noop`". A change caught by the sweep alone cannot happen live, because the 5-minute poll sees it first. **Recommend accept.**
3. **The 1 PM flip (4 GAP-OPEN lines).** Zeke needs to:
   - name the BT 1 start-date property;
   - confirm the sandbox runs the 1 PM scheduled workflow.

   **Recommend:** run the CO poller half from day 1 evening to day 2 (inside the existing 2-day window). Accept the NJ webhook half as proven by the `staffing_status` webhook rows (R2-10, U-17), which avoids a day 3. Otherwise, add day 3.
4. **DEFERRED beyond NM / VA**: the 7 optional master-section-8 items (no code reads them) and CLB-118 / LBL-084 (item 21, not built, dated "before the existing-records phase"). **Recommend accept**, and confirm that item 21 may wait until after the phase one cutover.
5. **TRG-273 accepted untested** (question 25 closed as recommended). **Recommend confirm.**
6. **BR4-P: build the creates and promote-after-create workflows in the sandbox before S3** (TRG-084, TRG-085). **Recommend yes.** They are deployed to production anyway, and testing them in the sandbox removes two cutover-only risks. Otherwise both lines become PRODUCTION-ONLY with the AB-20 checks.
7. **Employee Contact-mirror poller cells in CO and NJ**: use R2-23d and R3-13f as stand-ins (the mirror is a HubSpot property sync, then an ordinary employee update). **Recommend accept.** The alternative is two more S5a edits, whose test values he would need to choose.
8. **R2-22 and R3-12 as required P1** (the NM / VA unmapped-state behaviour, live for 10 production BCBAs). 0 CR records; rides S5a. **Recommend yes.**
9. **O-21 Contact workflow in S0**. It unblocks 16 lines. **Recommend building it before S0.**
10. **U-37 in the phase one run** (X07a-10 needs it). **Recommend keep.** The run sheet already recommends keeping all P2 options.
11. **Aetna NY 1082497 hand-added on CR client 5384589 in S0** (a CR write by hand, for CLB-104). **Recommend yes.**
