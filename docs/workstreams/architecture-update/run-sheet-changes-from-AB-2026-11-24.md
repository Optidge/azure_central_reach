# Run-sheet changes from coverage reviews A and B (2026-11-24)

**For:** the worker who edits `sandbox-rounds/retest-run-sheet-2026-11-24.md` (RS), `SANDBOX-TEST-PLAN.md` and `scripts/sandbox/`. Apply in this order. Every change comes from `sandbox-coverage-review-A-2026-11-24.md` (A) or `sandbox-coverage-review-B-2026-11-24.md` (B); the matrix rows already exist in `sandbox-test-matrix.md` (rows changed in place, or the section "Rows added by coverage reviews A and B"). Ledger lines that rest on a change here say "(run-sheet change AB-n pending)" in `sandbox-coverage-ledger-2026-11-24.md`.

Prepared offline: no HubSpot, CentralReach, Azure or Google Doc call; nothing run with `--write`; no git write. All values come from the matrix columns, the review text or the working-tree `src/`.

**Go-ahead column.** "Zeke" = needs Zeke's go-ahead at that step (a CentralReach write, an Azure write, or a decision). "Zeke's call n" = the numbered decision in `apply-AB-log-2026-11-24.md`. Every CentralReach write in the run still waits for his go-ahead at its step (RS rule).

## Summary

| AB | Where | What | Matrix rows | New CR records | Added CR calls (est.) | Go-ahead |
|---|---|---|---|---|---|---|
| AB-1 | RS rules, header; all steps | Poller `source` names (A S-2) | all poller rows | 0 | 0 | none |
| AB-2 | S0 | Zeke's prerequisites: CR hand-add Aetna NY; U-46 answer; BR4-P workflows; O-21 | R1F-5, U-46, BR4-P | 0 | 0 | Zeke (CR hand write; HubSpot sandbox) |
| AB-3 | S1 | Create rounds 5, 6, 7 in HubSpot (Entered blank); record X07a-9 | R1b, R2b, R3b (setup), X07a-9 | 0 | 0 | Zeke (HubSpot sandbox write) |
| AB-4 | S3a | R3b creates by webhook; X01-4 | R3b-1 to R3b-3, X01-4, G-1c | 3 | about 75 | Zeke (CR writes) |
| AB-5 | S3c | R2b and R1b creates by the poller | R2b-1 to R2b-3, R1b-1 to R1b-3, G-1c | 6 | about 150 | Zeke (CR writes) |
| AB-6 | S3e | U-45 adds R2 BCBA 2 | U-45 | 0 | 0 | none |
| AB-7 | S4 | New S4 edits (NY, CO, NJ) | U-21b, U-36, X07b-1, X07b-1b, X07b-2, C24-F, R2-14a, X04-2b, MIR-1, U-46 fallback | 0 | about 45 | Zeke (CR writes, part of the S4 go-ahead) |
| AB-8 | S5 header | Workflow state per sub-push (A S-3) | X01-2 legs | 0 | 0 | none |
| AB-9 | S5a-S5d | Regroup sub-pushes; WD-3 value; R2-22 / R3-12 required | U-21b, U-38, WD-3, R2-22, R3-12, X04-4, R2-14, X04-1, X07a-3, X01-1, X07b-2 | 0 | 0 (moved) | Zeke's call 8 (R2-22, R3-12) |
| AB-10 | S6a | X01-1 / X07b-2 stage moves; U-29 BT/RBT; U-29b; U-32 split; X05-1 Warm Lead | X01-1, X07b-2, U-29, U-29b, U-32, X07a-1, X05-1 | 0 | about 10 | Zeke (CR writes) |
| AB-11 | S6b | X05-1 Cold Lead | X05-1 | 0 | about 5 | Zeke |
| AB-12 | S7 | X01-2 247 leg; checklist pushes; X06-1, X06-2; X07a-10; X05-1; restores | X01-2, R2-14, X04-4, X04-1, X07a-3, X06-1, X06-2, X07a-10, X05-1, X07b-1b restore | 0 | about 35 | Zeke (CR writes) |
| AB-13 | S8 | Drop the X01-3 BCBA leg; U2-7a, U2-7b, U2-3b | X01-3, U2-7a, U2-7b, U2-3b | 0 | about 15 | Zeke (CR writes) |
| AB-14 | S10 | S8-2 redefined; X07b-3b (GAP-OPEN); BR18 association check | S8-2, X07b-3b, U-15 | 0 | about 10 (X07b-3b, if run) | Zeke's calls 2 and 3 |
| AB-15 | S11 | Inactivate 20 CR records (23 with R1c); test log rows R5-R7 | X07a-8, SU-7 | 0 | 0 | Zeke (CR screen) |
| AB-16 | RS header, efficiency table, CR total, P1 / P2 | Counts and totals | — | — | — | none |
| AB-17 | `scripts/sandbox/check-cr-record.mjs` | Expected values and label groups | U-21b, CLB-104, CLB-154 / -155, LBL-013, CLB-099, U-36, C24-F, X07b-1, X07b-2, MIR-1, U2-7a, rounds 5-7 | 0 | 0 | none (offline edit) |
| AB-18 | `scripts/sandbox/create-test-records.mjs` | Creates box for round 7 (and 10) | R1b, R1c | 0 | 0 | none (offline edit) |
| AB-19 | `SANDBOX-TEST-PLAN.md` | Create grid, source names | — | 0 | 0 | none |
| AB-20 | RS "Cutover checks the ledger adds to master 4.10" | Four checks for master 4.10 | — (PRODUCTION-ONLY lines) | 0 | 0 | orchestrator (master owner) |
| AB-21 | RS "Open questions" | New open questions | — | 0 | 0 | Zeke |
| AB-22 | S1, S3a | R1c (NY webhook creates on the pending build) | R1c-1 to R1c-3 | 3 | about 75 | **PENDING ZEKE: call 1** |
| | | **Total (AB-22 excluded)** | | **9** | **about 350** (range 290-420) | |

## Changes in order

### AB-1. Poller `source` names (A S-2)
- RS "Rules for every step", bullet **Record `source`**: replace "poller `intakePoller`" with "poller `intakePoller` (Case) or `employeePoller` (BCBA, BT/RBT; `src/workflows/intakePollerWorkflow.mjs:84`, :101)". Replace "An edit that only ever arrives by `intakePoller`" with "An edit that only ever arrives by the poller (`intakePoller` / `employeePoller`)".
- RS header line 3: replace "(1,275 requirement rows, GAPS 0)" with "(1,275 requirement rows; counts and the GAP-OPEN list in its gap statement, recomputed after reviews A and B)".
- Wherever a BCBA or BT/RBT poller run is read (S3c, S3d, S5, S6b, S8), expect `employeePoller`. The KQL files do not filter on `source` (checked), so no KQL change.

### AB-2. S0 prerequisites (Zeke)
Add to S0 (and to critical-path rows 2 and 4):
1. **Zeke (CR screen, hand write):** hand-add Aetna NY **1082497** on client 5384589, next to School 1052688 (feeds R1F-5; CLB-104).
2. **Zeke:** say whether the payor-status workflow is in sandbox 52311591 (U-46). If not: S4 keeps old line 28 by hand (AB-7) and LBL-082 becomes PRODUCTION-ONLY.
3. **Zeke's call 6 (BR4-P):** build the creates workflow and the promote-after-create workflow in the sandbox before S3, or decline (TRG-084, TRG-085 then PRODUCTION-ONLY).
4. **O-21:** the sandbox Contact workflow is already on critical-path row 2; add "16 ledger lines are BLOCKED until it exists".
5. Question 13: add "Zeke confirms the 'BT - Active Cases Sync' enrolment; S3a reads R2 BT/RBT 1 `active_cases_count` = 0 before the push" (BT-104, BT-105, BT-151, TRG-140).
- CR calls: 0 by the integration.

### AB-3. S1: create the new sets; record X07a-9
- After the existing rounds: `node scripts/sandbox/create-test-records.mjs --round 5`, `--round 6`, `--round 7` (plan), then each with `--write` (HubSpot sandbox only: Entered blank, no CR call). Round 5 = R2 (CO) pattern, round 6 = R3 (NJ) pattern, round 7 = R1 (NY) pattern (`slot = (round - 1) % 3`). No `WORKDAY_ROUNDS` entry, so every new employee is a temporary-ID create. Read-backs as for rounds 1-3; save `round-5.json`, `round-6.json`, `round-7.json`. Tick `centralreach_creates_only` by hand on the round 7 Case, BCBA and BT/RBT 1 (the R1 pattern leaves it blank), or apply AB-18 first.
- **X07a-9 (A, CASE-205 / BCBA-005):** when round 3 is created in S1 (Entered blank, `sandbox_test_field` true), run `record-timeline.kql` for the R3 Case, BCBA and BT/RBT 1: each webhook run `skipped` `entry_not_yes`, `crCalls` empty. If no creation webhook fires, in S2 set the R3 Case Entered = `CDE` and record the same.
- Add to "Proves": X07a-9. Time: +15 min.

### AB-4. S3a: R3b creates by webhook; X01-4
- **R3b (NJ, webhook; A S-1, settled by Zeke 2026-11-24):** with the entry workflows on, set Entered on the round 6 Case = `Yes; Insurance Card(s)`, BCBA = `Yes`, BT/RBT 1 = `Yes` (creates box ticked by the script for slot 2). Expect R3b-1 to R3b-3 (first run `hubspotWorkflow`; employees `waiting`, temporary ID; placeholder date 2000-01-01; Case with R3-pattern blanks, no state label). `check-cr-record.mjs --round 6` for all three.
- **X01-4 (A; B K):** hand-made Case (CO values, DOB filled, `sandbox_test_field` true, creates box ticked, unlinked) created directly in stage `1383894301`, then Entered = `CDE;Yes`. Expect webhook `skipped` `excluded_stage`, no poller line, no CR lookup or create; CR by External System ID = its HubSpot ID → 404. Clear Entered after (stop rule 2). Add it to the hand-made list (8 hand-made records).
- Add rows R3b-1, R3b-2, R3b-3, X01-4 to S3a "Rows". New CR records: 3. CR calls: +about 75. Time: +10 min.
- (If Zeke's call 1 is yes: AB-22 here.)

### AB-5. S3c: R2b and R1b creates by the poller
- With the entry workflows still off (same window as R3-1): set Entered on the round 5 Case = `CDE;Yes`, round 5 BCBA and BT/RBT 1 = `Yes`; round 7 Case = `Yes`, round 7 BCBA and BT/RBT 1 = `Yes`. Expect R2b-1 to R2b-3 and R1b-1 to R1b-3: first run `intakePoller` (Case) / `employeePoller` (employees); employees `waiting` "Waiting for the Workday ID", External System ID = the HubSpot record ID; R2b-3 form `RBT CO`. `check-cr-record.mjs --round 5` and `--round 7` for all three.
- These are the poller temporary-ID BT/RBT creates (BT-006, BT-008, BT-015) and the CO BT/RBT poller create (BT-109). Add the six rows to S3c "Rows". New CR records: 6. CR calls: +about 150. Time: +15 min (same poll cycle; more GETs).
- Stop rule 2 applies: after S3c they are linked, so Entered may stay.

### AB-6. S3e: U-45 adds R2 BCBA 2
- With U-45: R2 BCBA 2 (never pushed) `sandbox_test_field` unticked, Entered = Yes → no webhook run, not queued by poll or sweep, no CR call; then clear Entered (BCBA-009). Note: G-8 (S3b) used R2 BCBA 2 with updates ticked; untick it first. CR calls: 0.

### AB-7. S4 additions (refresh workflows on; record `source`)
**NY (R1):**
1. **U-21b (B A, B):** move old lines 10 and 12 here as one edit on R1 BT/RBT 1: `bt_rbt_type` BT → RBT and `location` New York → Colorado. Expect labels 1052618, 1052643, 1107687, 1107692; 1132655, 1052630, 1052631 absent; first run `hubspotWorkflow`.
2. **U-36 S4 list (B 2.2):** R1 BT/RBT 1 `first_name` "Jane" → "Janet"; `street_address__work_` "105 Work Plaza U1"; `city__work_` "New York U1"; `state__work_` NJ; `postal_code__work_` "10015"; `apartment__work` "Suite 1 U1".
3. **X07b-1 (B 2.2):** R1 Case `location_city` → "New York U1" (CR City); `postal_code` → "10011" (CR `ZipPostalCode`).
4. **X07b-2 (B 2.2):** R1 BCBA Contact `phone` → "(212) 555-0144" (CR phone 2125550144).
5. **C24-F (A):** with old line 43 (Other Location), also clear R1 Case `service__stateregion_2`. Expect Meta 137697 "200 Service Rd Suite 1\nNew York NY 10002".
6. **U-46 fallback (B 2.3):** if Zeke said the payor-status workflow is absent (AB-2), keep old line 28 by hand (`ny_insurance_labels` → blank; expect 1107647 removed).
**CO (R2):**
7. **R2-14a (A):** a sub-push on R2 BT/RBT 1 **before** its `workday_id` edit: `home_apt` → "Apt 2C U1"; expect `hubspotWorkflow`, update sent, HS stays `waiting`, External System ID still the record ID. Then the R2-14 `workday_id` edit as now.
8. **X07b-1b (B H):** on the R2 Case, three edits a few minutes apart, each with one Case field edit: (1) add R2 BCBA 2 as RE BCBA (229); (2) relabel R2 BCBA IA (223) → Supervising (247) on BCBA 2; (3) add R2 BT/RBT 2 as Primary BT 2 (240). Expect first run `hubspotWorkflow` each; Meta 144602, 131308, 131314, 138092 follow. Restore in S7.
9. **MIR-1 (B 3.1):** R2 BCBA Contact `address` → "204 Azure BCBA St U1" (CR address line 1).
**NJ (R3):**
10. **X04-2b (A):** R3 BT/RBT 2 (never pushed, `sandbox_test_field` true): Entered = `Yes - Generic`, then `No- Made Inactive` a minute later → each webhook run `skipped` `entry_not_yes`, no CR call; then Entered blank.
11. **MIR-1:** R3 BT/RBT 1 Contact `zip` → "07104" (CR ZIP 07104).
- Add to S4 "Rows": U-21b, R2-14a, X07b-1b, X04-2b, C24-F, MIR-1. Change U-17 / U-16 expectations to the matrix text (B C). CR calls: +about 45. Time: +10 min.

### AB-8. S5 workflow state (A S-3)
Replace the S5 header with: "Zeke turns the Case, BCBA and BT/RBT refresh workflows **off** for S5a-S5d. **S5e and S5f run with the Case refresh workflow ON** (their BR17 relabel, BT 2 removal and C11 RE removal are webhook legs: STF-002, -003, -005, -025, -052, -081). BCBA and BT/RBT refresh workflows back on after S5d." Remove from S5 any wish to have the Case workflow off for the BR17 swap (round-1-log L282): the association-only check (BR18) runs only in S10 (U-15, sweep).

### AB-9. S5 regroup (B A, B, D, E, F, G; A S-3)
1. Old R1-U1 lines placed in S5 becomes: **S5a: 3, 4, 9, 16; S5b: 56, 58; S5c: 11, 13, 30, 57; S5d: 14, 59.** Lines 10 and 12 move to S4 (AB-7 item 1). Line 59 (Starting 97153) moves to S5d so its run sees it (B F).
2. **U-38 (B E):** from S5a to S5c: R1 BT/RBT 1 Entered cleared + `home_apt` → "Apt 1C U1"; expect `employeePoller`, CR address line 2 "Apt 1C U1". Old line 3 (Entered → `No- Made Inactive`) stays in S5a alone.
3. **WD-3 (B D):** R4 BCBA `cr_billing_hold_label` **Yes → No** (not "Yes"). Expect `employeePoller`, HS stays `waiting`, 1103437 absent, other labels kept.
4. **Move out of S5a / S5b to S7 (B G):** X04-4, the R2-14 tick (with X04-1, X07a-3) and the R2-14 untick. S5a keeps R2-20 and R2-29 (no split) for R2 BT/RBT 1 / R2 Case.
5. **Move out of S5c to S6a (A S-3):** X01-1 and the X07b-2 stage moves. U-28 and U-35 (Terminated by poll) stay in S5c.
6. **R2-22, R3-12 (B 2.2; Zeke's call 8):** remove "optional deferred" in S5a: both are required P1 rows.
7. Update the S5 "Rows" list accordingly (remove X01-1, X04-1, X04-4, X07a-3, R2-14 tick / untick; add R2-22, R3-12 as required).

### AB-10. S6a additions (workflows on)
1. **X01-1 (A):** R4 BCBA `medicaid_id__co` and R4 BT/RBT 1 `home_apt` changed while still Terminated → `hubspotWorkflow`, `update`; then move both to Resigned (`1344955696`, `1299798139`) and change one more mapped field → `update`; CR employees still active. This is also X07b-2's stage move (TRG-233).
2. **U-29 (A):** add R1 BT/RBT 1 `test_record` = true + `home_apt` edit → `skipped` `test_record`.
3. **U-29b (A):** R1 Case `test_record` = true + `important_information` edit → `skipped` `test_record`.
4. **U-32 / X07a-1 split (A):** the second BT/RBT with `4837593`, creates box ticked: first Entered = Yes with the BT/RBT **entry workflow on** (U-32, webhook, `error`, no CR call); then clear Entered, turn the entry workflow off, Entered = Yes again (X07a-1, `employeePoller`, `error`, no CR call); entry workflow back on.
5. **X05-1 (B 2.2):** R1 Case `staffing_status` → Warm Lead, together with U-14b's supplier edit → no staffing label, no label POST.
- CR calls: +about 10.

### AB-11. S6b addition
- **X05-1:** R1 Case `staffing_status` → Cold Lead with U-14c's edit → no staffing label, no label POST. CR calls: +about 5.

### AB-12. S7 additions (workflows on)
1. **X01-2 247 leg (A):** re-add the R1 BCBA as Supervising 247 on the R1 Case → first run `hubspotWorkflow`; Meta 131308 "Zeke Swanson BCBA Azure Test R1 BCBA LBA".
2. **Checklist pushes (B G)** on R2 BT/RBT 1: push 1 `btrbt_in_cr_checklist` = "Medicaid ID Claim Settings" only → `waiting` (X04-4); push 2 add "External System ID" → first run `hubspotWorkflow`, HS `error` CHECKLIST_STILL_TEMPORARY, update sent (R2-14 tick, X04-1, X07a-3); push 3 untick → `waiting` (R2-14 end).
3. **X06-1 (B 2.2):** R2 BCBA `lba_licensure__ny` Yes → Grad Permit → 1052629 removed, 1092164 added, one POST; restore Yes.
4. **X06-2 (B 2.2):** R3 BT/RBT 1 `location` → blank → no state or role label added, 1107686 and 1132655 removed; restore.
5. **X07a-10 (B 2.2):** after U-37 (R1 BT/RBT 1 `workday_id` cleared, checklist unticked): the U-32 hand-made BT/RBT, `workday_id` 4837593, Entered = Yes, gate true: webhook leg (entry workflow on), then the poller leg (Entered cleared, entry workflow off, Entered = Yes). Expect lookups find CR 5384530, no HubSpot holder → HS `waiting`, no CR write, no `employee_id`. Then clear Entered and restore U-37. U-37 is therefore run in the phase one retest (it was a P2 option).
6. **X05-1:** R1 Case `staffing_status` → Processing Leads with U-18's edit.
7. **Restores:** X07b-1b associations on the R2 Case (back to the R2 baseline); clear `test_record` on the R1 BCBA, R1 BT/RBT 1 and R1 Case (U-29, U-29b).
- CR calls: +about 35. Time: +15 min.

### AB-13. S8 changes
1. **X01-3 (A):** delete "R1 BCBA `date_of_birth` blank once more with the Case workflow on (X01-3, `source`)" from S8b. X01-3 keeps only the C23 clear (S4).
2. **U2-7a (A):** S8a: R1 BCBA `personal_email` cleared → Meta 138069 cleared, `changedFieldNames` only 138069 (BCBA refresh workflow off for the sub-push; `employeePoller`).
3. **U2-7b (A):** S8b: R1 BCBA Contact `apartment` cleared → CR address line 2 blank.
4. **U2-3b (A):** S8b: R1 BT/RBT 1 record `email` blank, Contact untouched → CR `primaryEmail` unchanged. If a sandbox sync refills it, stop and note it (BT-077 falls back to OFFLINE-ONLY).
- CR calls: +about 15. Time: +5 min.

### AB-14. S10 changes
1. **S8-2 (B I; Zeke's call 2):** replace "one label-source change with its workflow off (S8-2)" with "S8-2: the 08:00 UTC sweep run of the R1 Case reads labels and ends `noop`". CLB-132 and LBL-079 are OFFLINE-ONLY (`stage3DailySweep.test.mjs`).
2. **X07b-3b (B J; GAP-OPEN, Zeke's call 3):** replace "Also observe the 5 AM / 1 PM Eastern flip (R2-24, X07b-3, BR18)" with: "Day 1 evening: R2 Case → stage `1342613895` (Service Ready w/Start Date), BT 1 start date = day 1 (property named by Zeke), Case workflow off; expect at 13:00 Eastern on day 2 `staffing_status` → Staffed 97153, `intakePoller` + the 'Change found by the poller' warning, 1156746 on. R3 Case the same with the Case workflow on (day 2 → day 3, or per Zeke's call 3)". Do not run until Zeke names the property and confirms the sandbox runs the 1 PM workflow.
3. **BR18:** the association-only check runs here only (U-15), not in S5 (AB-8).

### AB-15. S11
- Zeke inactivates **20** CR test records (5 existing + 6 + 9 new; 23 if AB-22), and fills `sandbox-test-log.md` rows for rounds 5, 6, 7 (and 10) as for R1-R4 (SU-7, X07a-8).

### AB-16. RS header, efficiency and totals
- Efficiency table "New CentralReach test records": **15** (R2 ×3, R3 ×3, R2b ×3, R3b ×3, R1b ×3), 18 with R1c. "Hand-made sandbox records": 8 (add X01-4). "Expected CR calls": **about 1,250** (range 1,000 to 1,600) = 0.8 % of the 150,000 monthly Core tier. "Wall clock": **about 7.75 hours hands-on over 2 calendar days** (+75 min), plus 1 day if X07b-3b runs its NJ half on day 3.
- "CR call total" line: S3 265 → about 490; S4 215 → about 260; S6 30 → about 45; S7 20 → about 55; S8 50 → about 65; S10 90 → about 100.
- P1 / P2 section: U-37 is now needed by X07a-10 (P1); the "five P2 rows" become four (U-44, U-47, R2-9, X07a-4).
- "How": replace "one create per entity per state proves every create-time field" with "one create per entity per state per path (CO webhook R2, poller R2b; NJ webhook R3b, poller R3; NY poller R1b, webhook R1 on the old build or R1c)".

### AB-17. `scripts/sandbox/check-cr-record.mjs` (offline edit; no run)
1. `btU1`: TL1 = want [1107687] within the state-label group `btCreate` TL1 already uses; TL3 = want [1107692] within the role-label group `btCreate` TL3 already uses (1052630, 1052631 and 1132655 must be absent) (U-21b; B A, B). Replace the `later(...)` placeholders.
2. `caseCreate` and `caseU1`: add 1156741 to the CL4 group (CLB-154).
3. `bcbaCreate`, `bcbaU1` BL8 and `btCreate`, `btU1` TL4: add a row `labels([], [1156743, 1156746, 1156747])` (CLB-155, LBL-013).
4. `caseU1`: add CL5 `labels([], [the 9-ID funding group])` (CLB-099) and "CLB-104 funding kept" `labels([1082497], [1082497])`; and in the round 1 create check used by R1F-5, the same "CLB-104" row.
5. `caseU1`: C24 U1 Meta 137697 = "200 Service Rd Suite 1\nNew York NY 10002" (C24-F); City "New York U1", `zipPostalCode` "10011" (X07b-1).
6. `bcbaU1`: phone "2125550144" (X07b-2); B9 `later` → Meta 138069 "" after S8a (U2-7a).
7. `btU1`: first name "Janet"; Meta 133819 work address from the U-36 S4 list.
8. Rounds 5, 6, 7 (and 10): confirm the create checks run for them (`--round 5..7`): with no `workdayIds` in the round file, B2 / T2 External System ID = the HubSpot record ID; slot 2 (round 6) employee dates = 2000-01-01.
9. Add a round 2 check for MIR-1 (R2 BCBA address line 1 "204 Azure BCBA St U1") and a round 3 check (R3 BT/RBT 1 ZIP "07104"), or mark them "check by hand".

### AB-18. `scripts/sandbox/create-test-records.mjs` (offline edit; no `--write`)
- `CREATES_BOX`: tick for rounds ≥ 5 as well (`round >= 5 ? "true" : pick("", "true", "true")`), so round 7 (and 10) are created with the creates box ticked. Optional: AB-3 allows a hand tick instead.
- Header comment: rounds 5, 6, 7 are the S-1 create sets (no Workday IDs).

### AB-19. `SANDBOX-TEST-PLAN.md`
- State the create grid (every entity, every state, both paths: R2 / R2b, R3b / R3, R1b / R1 or R1c) and the poller `source` names (`intakePoller` Case, `employeePoller` employees). Quote Zeke's 2026-11-24 sentence on test records.

### AB-20. Cutover checks for master 4.10 (RS section "Cutover checks the ledger adds to master 4.10")
Add, for the orchestrator to carry into `requirements-review-2026-11-24/00-MASTER.md` 4.10 (read-only production checks):
1. **API-012, CASE-047:** the production private app scopes include `crm.objects.deals.sensitive.read`; the first production Case run reads `phi_*` without `HUBSPOT_PROPERTY_MISSING`.
2. **TRG-137:** production BT/RBT entry (W5) and refresh (W2) trigger lists equal the sandbox lists proven by U-36 / X07b-2, incl. `gender`, `state_home`, `active_cases_count`.
3. **TRG-284:** each production sync workflow triggers on property changes with re-enrolment on; the segment is an AND filter only.
4. **TRG-132, TRG-135, TRG-210, TRG-224, TRG-236:** each production refresh workflow's trigger list equals its sandbox list (X07b-1, X07b-2, U-21, U-36); W1 / W2 "CR ID known" branch present; manual and automatic enrolment on.
5. If Zeke declines BR4-P (call 6): **TRG-084** creates-workflow enrolment (created after cutover, Entered = Yes, CR ID unknown) and **TRG-085** link-property promote check.

### AB-21. RS open questions
Add: (5) the BT 1 start-date property and the sandbox 1 PM workflow (X07b-3b); (6) BR4-P workflows built in the sandbox or not; (7) U-46 workflow present or not; (8) R1c yes / no. Update question 1 (O-21): "16 ledger lines BLOCKED".

### AB-22. **PENDING ZEKE: call 1.** R1c: NY creates by webhook on the pending build
- S1: `create-test-records.mjs --round 10` (R1 pattern; plan, then `--write`; creates box per AB-18 or by hand).
- S3a: Entered = `Yes` on the round 10 Case, BCBA, BT/RBT 1 with the entry workflows on. Expect as R1b-1 to R1b-3 with first run `hubspotWorkflow`.
- New CR records: 3. CR calls: about 75. Time: +5 min (rides S3a). Withdraw this item if Zeke accepts the 2026-11-23 NY webhook creates (R1-1 to R1-3, `655b385`) plus R1F-1 as enough.
