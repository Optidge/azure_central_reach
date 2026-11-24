# Apply log: review C, AB-1 to AB-22, the recency audit, the B2 follow-up and the N1 fix (2026-11-24)

**What.** One rewrite of the sandbox end-to-end test plan from four independent reviews and three late notes:
- `sandbox-coverage-review-C-2026-11-24.md` (C: run sheet, scripts, safety, order);
- `run-sheet-changes-from-AB-2026-11-24.md` (AB-1 to AB-22, from reviews A and B; AB-22 R1c approved);
- `requirements-recency-audit-2026-11-24.md` table 2 rows for the ledger, matrix, run sheet, test plan and scripts, and section C (Contact workflow), as grouped in `apply-recency-slices-log-2026-11-24.md` section 5;
- build chat 2 notes `build-chat-2-gate-followup-B2-2026-11-24.md` (B2) and `build-chat-2-field-wipe-fix-2026-11-24.md` (N1 fix, sections 6 and 7);
- `unmapped-field-wipe-check-2026-11-24.md` and `sandbox-rounds/cr-unmapped-fields-run-2026-11-24.txt` (N1 confirmed live).

**How.** Offline only: no HubSpot, CentralReach, Azure or Google call; nothing run with `--write`; no git write; `.env` and `local.settings.json` not opened. `node --check` passes on every script in `scripts/sandbox/`. Ledger lines were edited by a script from a per-ID spec; counts and the top tables are recomputed from the lines; every row ID cited in a ledger state or path cell was checked to exist in the matrix (0 missing); each ledger Status was checked against its slice Status (53 synced, PROVEN-LIVE qualifiers ignored).

**Files edited:** `sandbox-rounds/retest-run-sheet-2026-11-24.md` (rewritten), `SANDBOX-TEST-PLAN.md`, `sandbox-test-matrix.md`, `sandbox-coverage-ledger-2026-11-24.md`, `scripts/sandbox/create-test-records.mjs`, `scripts/sandbox/check-cr-record.mjs`, `scripts/sandbox/prod-review-reads.mjs` (new `--workday-ids` mode), `scripts/sandbox/kql/*.kql`. **Created:** this file. Matrix edits carry the tag `[2026-11-24 apply-C]`.

## 1. Final counts

**Ledger (1,279 lines = 1,275 + TRG-218a, TRG-218b + N1-EMP, N1-CLI).**

| Class | Before (apply-AB) | After |
|---|---|---|
| COVERED | 877 (96 on "AB-n pending") | **890** (0 pending; N1-EMP / N1-CLI wait on the N1 deploy) |
| OFFLINE-ONLY | 142 | 152 |
| PRODUCTION-ONLY | 34 | 32 |
| PHASE-TWO | 20 | 20 |
| DEFERRED | 23 | 32 |
| RETIRED | 100 | 107 |
| ACCEPTED-UNTESTED | 1 | 0 |
| BLOCKED | 74 | **46** |
| GAP-OPEN | 4 | **0** |

BLOCKED by cause: United Care 10; O-17 Care Coordinator 4; N6 views 6; S8-3 method + receiver 6; guide write 6; item 20 2; BR4-P 2; 1 PM flip 4; question 13 automation leg 1; open decisions (RG D15 / Ruling B, H-Q6, O-HS-JOURNAL) 3; U-46 1; T9 1.

43 ledger lines and 9 matrix rows carry "[pending Zeke: Contact workflow confirmation]".

**Run sheet:** 32 pushes; 18 new CR records (23 to inactivate); about 1,870 CR calls (1,500-2,200); about 12 hands-on hours; 2 calendar days.

## 2. Finding → change

### Review C

| ID | Change (file: row / step) or why not |
|---|---|
| B1 | Matrix R1F-1, B5 tail; RS stop rule 4, S1 expected; ledger BT-140 note. First runs = full re-send, judged on values |
| B2 | Applied as corrected by the B2 follow-up: G-1, G-2, G-9, R2-1, R3-1 expected (retry `skipped gate: update`, 0 CR calls, HS status **blank**); S3d "one update, no create POST, full re-send, no label POST, `success`"; RS stop rule 6; BR4-P made P1 and measures the promote delay (matrix BR4-P; RS S3c / S3d) |
| B3 | One cause per record: U-29 → R2b BCBA / BT/RBT 1; U-29b → R2b Case; C8 unreadable → R3 Guardian; B9 unreadable → R3 BCBA; U-39 restored before U-31 (U-31, U-39 rows); X04-3 update leg → R3b BT/RBT 1; RS S6a / S6b, stop rule 7 |
| B4 | One hand-made record per leg, Entered set last: script `--handmade`; matrix R2-30, X02-1, X03-1, X04-3, X02-3, U-26, U-32, U-44, X04-2 (two records, one cycle); RS stop rule 8 |
| B5 | SU-1 rewritten (git commit + SCM VFS SHA-256 of two files + `MAPPING_VERSION`; stop if the endpoint is not served); RS S0-D |
| B6 | Script guard: `--write` on an existing round needs `--refresh`; RS stop rule 3 |
| S1 | `--census` (1); SU-8; RS S0, S3-0, S3e |
| S2 | `--census` (2); SU-11; RS stop rule 2; U-45 / X02-3 order "untick, read back, then Entered" |
| S3 | SU-9: `prod-review-reads.mjs --workday-ids` (counts), CR lookups via `check-cr-record --workday-id`, census (3). United Care number range: not added (needs United Care; listed as open item 11) |
| S4 | RS S3b note (pending G-4 edit reaches CR at the next update) |
| S5 | (a) S8-3 forcing: Zeke's own CR-screen write on a test record; (b) U-15: test-record approval; (c) restore before the next poll: stop rule 13; (d) S13 poller back to hourly or off, Zeke at step |
| S6 | Not changed (phase-two note only), as C says |
| O1 | Poller on only after S3a / S3b (S3c-0; SU-2) |
| O2 | Arrival-based webhook proof: `record-timeline.kql` `pathProof` + `editTime`; matrix path legend; RS path rules. Hourly-schedule option listed as open decision 8 |
| O3 | Every webhook workflow off during poller pushes (RS path rules, S3c, S5 header; S5e / S5f Case refresh ON per AB-8) |
| O4 | Superseded by the recency audit section C: no Contact workflow; NJ client label on R3-20 via the Case path; GS-1 proves the sync reaches the Case |
| O5 | R3 `--keys` go / no-go: R3-1 row, RS stop rule 9 |
| O6 | Script reads back the three coordinator fields and saves the status; `check-cr-record` C10 follows it; RS stop rule 10; decoy `care_coordinator_name` with another value |
| O7 | `active_cases_count` read back; T7 SKIP when blank; P-7 with hand-set fallback (R2-15 row) |
| O8 | Superseded by AB-13 (X01-3 BCBA leg dropped) |
| O9 | S8-1 recorded at poller-on; U-15 / S8-2 set day 1, read day 2 after 08:00 UTC; Cosmos re-arm not used (needs Zeke; not on the critical path) |
| O10 | R2-12 on four linked Cases in one webhook cycle (matrix R2-12; RS S7) |
| O11 | Approval column on every step |
| C1 | Verified good; no change |
| C2 | Re-run PATCHes the Guardian Contact saved in the round file |
| C3 | BAD OPTION check in plan and write mode |
| C4 | Read-back mirrors: coordinator fields, `active_cases_count`, R3 `location` |
| C5 | `--step u1` for rounds 2 and 3 (`caseU1Later`, `bcbaU1Later`, `btU1Later`) |
| C6 | As O6 |
| C7 | Kept; R3 `--keys` first (stop rule 9) |
| C8 | `since` 30h note in all four KQL files |
| Mismatch 1-7 | 1 B1; 2 B2; 3 O6; 4 O7; 5 matrix B2 R2 column; 6 U-26 / U-32 "no CR write"; 7 C24 property list |
| Prerequisites 1-12 | RS section 2 (P-1 to P-14); C's 3 (Contact workflow) replaced by P-4 (confirm not needed); C's 7 adds Aetna NY (AB-2) |
| Estimates | Recomputed (section 1) |

### AB-1 to AB-22

All applied to the run sheet, matrix or scripts: AB-1 (source names: RS path rules, test plan), AB-2 (P-6, P-8, P-5, P-7), AB-3 (S1 items 3, 5), AB-4 (S3a R3b, X01-4), AB-5 (S3c R2b, R1b), AB-6 (S3e U-45), AB-7 (S4 lists; MIR-1 NJ value corrected to 07108, see section 6), AB-8 (S5 header), AB-9 (S5 regroup; R2-22, R3-12 required), AB-10 (S6a, with C B3 re-placement of U-29 / U-29b), AB-11 (S6b X05-1), AB-12 (S7), AB-13 (S8), AB-14 (S9 / S10; X07b-3b redesigned, BLOCKED on P-10), AB-15 (S13: 23 records), AB-16 (totals, recomputed), AB-17 (`check-cr-record`: TL1 / TL3, CL4 1156741, BL8 / TL4 staffing absence, CL5 + CLB-104 + School for round 1, C24 / City / ZIP, phone 2125550144, B9 note, first name Janet, T6 work address, rounds 5-10, MIR-1 checks in the round 2 / 3 u1 sets), AB-18 (`CREATES_BOX` for rounds ≥ 5; header), AB-19 (test plan grid and source names), AB-20 (cutover checks: kept in the ledger PRODUCTION-ONLY lines; master 4.10 is the orchestrator's file, not edited), AB-21 (RS section 7), AB-22 (R1c firm: S1 round 10, S3a; matrix R1c row; ledger webhook cells gained R1c-n). Ledger: 94 "AB-n pending" marks → "applied".

### Recency audit (table 2 rows with these targets, and section C)

| Target | Applied |
|---|---|
| Ledger (2.5, 55 findings) | Every row: O-21 lines restated on the Case path or moved to OFFLINE-ONLY / RETIRED per section C and the slice statuses; STF-078, CASE-119, BT-109, BT-149, CLB-153, TRG-164 confirmed; BT-104, BT-105, TRG-140 COVERED with prerequisite P-7; BT-151 BLOCKED (automation leg); TRG-118, BT-036, TRG-009, BCBA-171 notes; TRG-273 OFFLINE-ONLY (slice). **Not applied:** TRG-084 "PRODUCTION-ONLY" (the later B2 follow-up makes BR4-P a sandbox P1 row; it stays BLOCKED on P-5 with the PRODUCTION-ONLY fallback); TRG-284 already PRODUCTION-ONLY |
| Matrix (2.6) | L77, L78, L80, BR10 L148, C6-C8 "via K1", C8 unreadable, C10 / C12 / C26 / C28 "being built", C24 (`full_home_address`, fallback via C24-F), C25 junk (R2-27 moved to NJ), C36, K1, K3, K4 (optional, not P1), K5, exclusions L299, L327, L370, every "(build pending)" → "(built, uncommitted)", path legend, SU-6 (Guardian fields, `location`, `referral_source`), G-5, R2-23g, R2-27, R3-13g, U-04, U-48, X02-5, X07a-1 `employeePoller` (already applied by AB) |
| Run sheet (2.6) | RS #2 L14 and Q1 L134 replaced (P-3, P-4); G-5 restated; old line 64 = Case run; old line 44 "None"; old line 48 one space; R2-27 moved to NJ; R2-23g / R3-13g relabelled; K4 not P1; old line 76 "3" |
| Scripts (2.6) | `care_coordinator_name` is a decoy with a different value; `check-cr-record` comments "being built" / "FAILs until" updated. **Not applied:** `scripts/check-triggers.mjs` comment (outside `scripts/sandbox/`, not in my edit scope; for the build chat) |
| Section C | Every O-21 BLOCKED line reversed; four Guardian properties, `location`, `referral_source` in SU-6; new P1 row GS-1 (the inferred point); all marked "[pending Zeke: Contact workflow confirmation]" |

### Coordinator messages

- **Slices log:** TRG-218a, TRG-218b added to the ledger (COVERED, K1 / X07b-1 / GS-1); every ledger Status now equals its slice Status (53 changed, listed in the run's script output: STF-006 to TRG-314). Class changes that follow the new statuses: STF-006, STF-012, CASE-186, CLB-133, TRG-141, TRG-142, TRG-159 → RETIRED; LBL-027 to LBL-033, TRG-245 → DEFERRED (BCBA-140b too, same basis); BT-053, TRG-021, TRG-022, TRG-095 → COVERED (decided; United Care non-blocking). Rows the slices worker could not settle: open decisions 11-14 below.
- **N1 fix note:** UW-1 / UW-2 use its section 6 expected values; UW-3 to UW-5 added for its section 7 risks. Its UW-1 names employee 5338681, but 5338681 has no HubSpot record (memory note on the CR test record; BUILD-PLAN), so the pipeline cannot update it: UW-1 runs on the linked R1 BT/RBT 1 (5384530) and R1 BCBA (5384531) instead.
- **B2 follow-up:** section 6 step 1 applied (G-1, R2-1, R3-1, S3a / S3c, S3d); BR4-P is a P1 row measuring the promote delay.

## 3. Entity × state × path × create / update

| Entity | State | Create, webhook | Create, poller | Update, webhook | Update, poller |
|---|---|---|---|---|---|
| Case | NY | R1c-1 (S3a; R1-1 on `655b385` kept as history) | R1b-1 (S3c) | U-01 (S4) | U-05 (S5a) |
| Case | CO | R2-1 (S3a) | R2b-1 (S3c) | R2-23a (S4) | R2-23b (S3d) |
| Case | NJ | R3b-1 (S3a) | R3-1 (S3c) | R3-13a (S4) | R3-13b (S3d) |
| BCBA | NY | R1c-2 (S3a) | R1b-2 (S3c) | U-03 (S4) | U-23 (S5a) |
| BCBA | CO | R2-2 (S3a) | R2b-2 (S3c) | R2-23c (S4) | R2-23d (S3d) |
| BCBA | NJ | R3b-2 (S3a) | R3-3 (S3c) | R3-13c (S4) | R3-13d (S3d) |
| BT/RBT | NY | R1c-3 (S3a) | R1b-3 (S3c) | U-02, U-21b (S4) | U-38 (S5c) |
| BT/RBT | CO | R2-3 (S3a) | R2b-3 (S3c) | R2-23e / R2-14a (S4) | R2-23f (S3d) |
| BT/RBT | NJ | R3b-3 (S3a) | R3-6 (S3c) | R3-13e (S4) | R3-13f (S3d) |
| Guardian → Case (Case sync) | NY | n/a | n/a | K1 / U-04 (S4) | U-48 (S4, both) |
| Guardian → Case (Case sync) | CO | n/a | n/a | R2-23g (S4) | **GS-1 (S5a)**: fills the empty cell of the AB log |
| Guardian → Case (Case sync) | NJ | n/a | n/a | R3-13g / R3-20 (S4) | R3-20 (both) |
| Employee Contact mirrors | NY | n/a | n/a | U-27, U-33 (S4) | U2-5 (S2, now webhook) and U-38 |
| Employee Contact mirrors | CO | n/a | n/a | MIR-1 (S4) | stand-in R2-23d (Zeke's call 7, AB log) |
| Employee Contact mirrors | NJ | n/a | n/a | MIR-1 (S4) | stand-in R3-13f (call 7) |
| Unmapped CR keys kept | NY | n/a | n/a | UW-1, UW-2 (S1, S1u) | not separate (body built in the worker whatever the source) |

## 4. Assumptions

1. MIR-1 NJ: the create already holds Contact ZIP 07104 (`${S.zip}4`), so AB-7's "07104" changes nothing; changed to 07108 (matrix MIR-1, RS S4, `check-cr-record` R3 u1).
2. Test inputs chosen here (outputs derived from `src/` rules, never invented): R2 Guardian phone `303-555-0221` (S4) and `303-555-0231` (GS-1) → 10 digits; R2 BCBA `medicaid_id__co` "AZTCO002A"; R3 BCBA `medicaid_id__nj` "AZTNJ003A"; R3 `important_information` "AzT 3 parent note U1"; R3 BT/RBT 1 `home_apt` "Apt 3C U1"; S1u edits ("Suite 1 UW", "AZTCO001A", Level 1 → "1"); S2 BCBA other edit `medicaid_id__ny` "AZTNY001A"; G-5 first name "Don Azure Test R1 G5".
3. S2 runs by webhook (poller still off); the date send-back does not depend on the path (U2-4 / U2-5 path cells updated).
4. The email receiver moves to S0-D so the S8-3 chain can finish on day 1.
5. Owner re-saves on R1 / R2 / R4 happen after the deploy (a re-save under `655b385` would be a CR write through the old code).
6. 1156741 (staffing parent label) is added to the CL4 group as a must-not-hold label, per AB-17 / CLB-154.
7. The four 1 PM flip lines are BLOCKED, not GAP-OPEN: the step is designed and waits on one fact Zeke holds.
8. Hand-made records live only in HubSpot; none can reach CR (each misses a required field, has a duplicate Workday ID, an excluded stage, or a gate box missing).
9. R2b (round 5) records carry U-29 / U-29b because they have no other S6 edit (one cause per record).
10. BR4-P creates leg: on R3 the script's creates box is unticked by hand before Entered, so the creates workflow's own tick is observed.

## 5. Open decisions for Zeke (recommendation first)

1. **Contact workflow not needed (O-21 superseded for the Guardian fields).** Recommend confirm: the Guardian values are Case sync fields (guide 11/09, d24) and the integration reads no Contact value; GS-1 proves the remaining inferred point live. 43 ledger lines wait on this word.
2. **BR4-P: build the creates and promote-after-create workflows in the sandbox before S3.** Recommend yes: they go to production anyway, and the promote delay decides whether a create heals in 150 s or at the next hourly poll.
3. **1 PM flip: name the BT 1 start-date property and confirm the sandbox runs the 1 PM workflow.** Recommend answer it; the CO poller half then runs on day 2 at no extra day. The name is in no repo source.
4. **Question 13: fix the "BT - Active Cases Sync" enrolment, or accept the hand-set fallback.** Recommend fix if quick; otherwise hand-set and leave BT-151 BLOCKED (or PRODUCTION-ONLY).
5. **S8-3 method.** Recommend record-isolated: remove all labels on 5385357 on the CR screen, one edit, restore before the next poll. No app-wide setting.
6. **U-46 payor workflow in the sandbox?** One word; otherwise LBL-082 → PRODUCTION-ONLY.
7. **R1c and the new create sets add 18 CR records (23 to inactivate).** Already approved (11/24); listed so the inactivation count is not a surprise.
8. **Optional hourly schedule during S4** (2 Azure writes) so webhook runs are the writers. Recommend no: arrival proof is enough.
9. **UW-3 `ssn`:** ask Danny / CR whether the employee GET masks `ssn` (recommended), or put a dummy value by hand on one test employee. The testing chat will not type an SSN-like value.
10. **UW-5 filled lists:** if the CR screen cannot fill a list on a test record, accept it as residual risk for phase one (recommended: accept, with the build chat's logging of the PUT's 400 reasons).
11. **A Workday number range that Workday never issues** (review C S3; O-8, D20), from United Care for future test IDs. Recommend ask.
12. **Ruling B (RG D15 "No production rollout is authorized"; C11, GC-106, TRG-285):** confirm Ruling B settles it. Recommend confirm; TRG-285 then leaves BLOCKED.
13. **CASE-119 (CONFLICT in the slice):** the ledger keeps it COVERED by C23 (question 34: keep the code). Recommend confirm the slice status change.
14. **BT-145 (O-1 answered, "nothing reads it") and GC-123 (split rule decided):** statuses left PENDING / BLOCKED by the slices worker for want of a target; the ledger keeps BT-145 BLOCKED on the guide write. Recommend: guide write closes BT-145; GC-123 OFFLINE-ONLY.

## 6. Prerequisites Zeke must do before S0 (numbered as RS section 2)

1. P-1 commit word (pending build + N1 fix).
2. P-2 Team Member record for 161391908.
3. P-3 `referral_other` sync and the trigger lists (incl. the four Guardian properties, `location`, `referral_source`).
4. P-5 BR4-P workflows (or decline).
5. P-6 CR-screen hand writes on 5384589, 5384530, 5384531 (hand-adds and UW markers).
6. P-7 Active Cases Sync enrolment (or the fallback).
7. P-8 U-46 answer.
8. P-9 the five CR records active.
9. P-11 S8-3 method; P-13 UW-3 decision.
10. Approve the Azure write list, each taken at its step: deploy, email receiver, gate settings set / remove, poller on, S8-4, S13 poller.

## 7. Not applied or unsettled

- `scripts/check-triggers.mjs` comment (audit 2.7): outside `scripts/sandbox/`.
- BUILD-PLAN, OPEN-ITEMS, package, guide draft, master 4.10 (AB-20 checks, Contact workflow removal): not my files; the stale text listed in audit 2.7 stays for their owners.
- TRG-084 kept BLOCKED (BR4-P) rather than the audit's PRODUCTION-ONLY (later B2 follow-up).
- SU-1 (b) assumes the SCM VFS endpoint answers on the Flex Consumption plan; not verified (no live call). If it does not, Zeke confirms the deployment by hand.
- UW-3 needs a decision; UW-4 / UW-5 may end as residual risk if no test record can hold a hire date or a filled list.
- The exact CentralReach response for X01-4's lookup and the R3 `--keys` result are unproven until run.
- Ledger poller cells that cited U2-4 / U2-5 (6 lines) now also cite R3-9, R3-19 (S3d, poller), since S2 runs by webhook.
