# Final requirements review: master (2026-11-24)

**For:** Zeke. **Built from:** the eight slice files in this folder (`01-objects-associations.md` to `08-guide-currency.md`), each written by one agent, corrected by an independent reviewer, then updated with the live reads of 2026-11-24 ([P] HubSpot production, [S] sandbox, [A] App Insights) and checked again ([R2]). [C] Not every slice got every pass: slice 08 has no live-read update and no [R2] check (its rows were not re-read against `prod-reads-output-2026-11-24.md` or App Insights); slice 07 got [A] but no [P] pass; slices 03, 04 and 06 got no [S] edit. See section 12. Every number below is counted from each file's **Status column as it stands now**.

**Requirements source:** `guide-extract-2026-11-24.md` (the Google Doc snapshot, cited "guide L<n>"). Order applied: the original requirements (G01–G11), then the entity requirements (GER) and the dated blocks G17–G20 (latest note wins), then the repo decisions of 11/20–11/24 (the guide has no text dated after 11/20).

**Code:** "deployed" = commit `655b385` (live today). "Pending build" = the other team's uncommitted working tree (WT), which was changing while the slices were read; nothing in it is deployed. Where a statement is about one or the other, it says so.

**Calls made for this master file:** HubSpot 0 (production 0, sandbox 0: the slices and `prod-reads-output-2026-11-24.md` answered every question), CentralReach 0, Google Doc 0, Azure 0. Nothing was written anywhere except this file.

**How to read the slice references.** "02-a4" = slice file 02, section "Gaps", item a4 (a = sandbox row, b = offline test, c = not built, d = conflict, e = blocked, f = added by the review). Where a slice did not number an item, the number counts its bullets in order. "CASE-090" etc. are the requirement IDs in the slice's coverage table.

---

## 1. Result in one paragraph

The eight slices hold **1,402 requirement rows**: **354 proven live**, **419 planned**, **264 offline only**, **46 missing a test**, **44 not built** (not in deployed `655b385`), **12 blocked** on a decision, **3 in conflict**, **107 pending** (cutover or doc tasks waiting on a person), **120 retired** and **33 deferred** (New Mexico / Virginia and two optional items). Some requirements appear in more than one slice (slice 08 restates the 11/23–11/24 decisions that slices 01–07 also cover), so 1,402 is a count of rows, not of distinct requirements. **Does the planned end-to-end test cover every requirement, for every entity, in each state, on both the webhook and the poller path? No.** Of the 1,249 active rows (1,402 less 153 retired or deferred), **476 have no live test proven or planned** (offline only 264, missing 46, not built 44, blocked 12, conflict 3, pending 107); of the 773 that are proven or planned, a scan of the webhook / poller columns finds **about 352 without a step on at least one path** (225 no poller step, 112 no webhook step, 15 neither; some of these are paths that do not apply, so treat 352 as an upper bound). On states: **nothing has been pushed to CentralReach for Colorado or New Jersey** (round 2, Colorado, was never pushed and needs a `--write` refresh; round 3, New Jersey, has no records), and the slices' state tables still show **23 New York, 50 New Jersey and 42 Colorado gaps** with no row at all. The poller and daily sweep are **off** today, so no update has yet been proven through the poller for a Case. [C] Three more reasons the answer stays No, found by the completeness check (section 3 K): (1) re-scanning the webhook / poller columns with the same tokens gives **365** rows without a step on at least one path (120 no webhook step, 224 no poller step, 21 neither), so read "about 352" as "about 350 to 365"; (2) some PROVEN-LIVE rows rest on a matrix Result cell plus a run total, with no saved per-row output of `check-cr-record.mjs` (02, 03, 06 reviewers), and some PLANNED rows cannot be proven by the planned run because App Insights logs no request bodies (K4); (3) the 252 OFFLINE-ONLY rows were counted but not listed; they are now in Appendix C, so each can be accepted offline or given a live row. [C] Second completeness pass: the answer stays **No**. Two rulings Zeke gave after this file was written (handoff "State at 2026-11-24" L9–L10, verbatim: "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production" and "Production will push in two phases: 1. Create records only. 2. Review of existing records ...") move the existing-records rows (A1, K9, C22, question 17 and others) to phase 2 and make sandbox-to-production deployment the route for properties, workflows, lists and reports. Neither ruling adds a live test. Both add work to check: the deployed workflows must be re-pointed from sandbox identifiers, and nothing that is missing from the sandbox gets carried over (K16, K17). One planned row would also lose the only live proof of the Colorado contact form (K15). [Recency 11/24] Totals recounted from the slices after the recency fixes (blocked 48 -> 12, conflict 10 -> 3; 2 trigger rows added). The webhook / poller scan figures and the state-table gap counts (23 / 50 / 42) were not re-run.

---

## 2. Coverage by entity and state

Rows are the entities asked for. Slice 01 (object IDs, pipelines, staffing associations; mostly Case staffing) and slice 08 (11/23–11/24 decisions against the guide) do not belong to one entity, so they have their own rows. Slice 06 is split by row: LBL-001–044 BCBA labels, LBL-045–069 BT labels, LBL-070–085 rules shared by both (label sender, triggers, gate hand-off).

"Gaps n" = cells in that slice's state table marked GAP / NOT-BUILT / BLOCKED (no row at all). Cells marked "planned" are not counted as gaps, but every Colorado and New Jersey "planned" cell depends on rounds that have not run.

| Entity (slice) | Total | Proven live | Planned | Offline only | Missing test | Not built | Blocked | Conflict | Pending | Retired / deferred | NY covered | NJ covered | CO covered |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Case / Client (02) | 209 | 63 | 60 | 56 | 4 | 0 | 0 | 1 | 10 | 15 / 0 | R1 proven (webhook only); gaps 5 | R3 not created; gaps 5 | R2 not pushed; gaps 5 |
| Objects, IDs, staffing associations (01) | 181 | 48 | 22 | 46 | 16 | 27 | 0 | 0 | 6 | 9 / 7 | gaps 6 | gaps 8 | gaps 7 |
| BCBA (03) | 177 | 59 | 42 | 46 | 0 | 1 | 2 | 0 | 11 | 13 / 3 | R1, R4 proven; gaps 4 | gaps 7 | gaps 7 |
| BT/RBT (04) | 156 | 39 | 55 | 37 | 7 | 1 | 1 | 0 | 9 | 4 / 3 | R1, R4 proven; gaps 0 (T7 failed twice on test data) | gaps 2 | gaps 0 (all planned in R2) |
| Client labels (05) | 118 | 17 | 25 | 20 | 4 | 3 | 0 | 0 | 2 | 43 / 4 | gaps 3 | gaps 8 | gaps 5 |
| BCBA labels (06, LBL-001–044) | 44 | 13 | 14 | 6 | 0 | 0 | 0 | 1 | 0 | 1 / 9 | gaps 1 (commercial credentials blocked) | gaps 1 | gaps 3 |
| BT labels (06, LBL-045–069) | 25 | 4 | 14 | 5 | 0 | 0 | 0 | 0 | 0 | 0 / 2 | gaps 0 | gaps 3 (BT NJ, NJ-only form) | gaps 1 (BT two states) |
| Staff labels, both types (06, LBL-070–085) | 16 | 4 | 2 | 4 | 5 | 1 | 0 | 0 | 0 | 0 / 0 | state-independent | state-independent | state-independent |
| Triggers and gate (07) | 351 | 95 | 153 | 30 | 9 | 7 | 4 | 0 | 29 | 21 / 3 | gaps 3 | gaps 14 | gaps 13 (one CO proof: no create before Entered = Yes) |
| Decisions vs guide (08) | 125 | 12 | 32 | 14 | 1 | 4 | 5 | 1 | 40 | 14 / 2 | gaps 1 | gaps 2 | gaps 1 |
| **Total** | **1,402** | **354** | **419** | **264** | **46** | **44** | **12** | **3** | **107** | **120 / 33** | **gaps 23** | **gaps 50** | **gaps 42** |

What the table hides, in plain words:
- **Proven live means New York, mostly by webhook, mostly on the create.** No Case field is proven through the poller, or the daily sweep (02 totals note). Every BT/RBT field row proves the create only; the update half is one planned row (BT-150).
- **Proven on the old code.** Rows whose rule the pending build changes (Supervising BCBA, physician format, availability, service address, date of birth) were moved to PLANNED: they must be re-proven after the deploy.
- **New Mexico and Virginia** are DEFERRED in every slice (Zeke, 2026-11-23: "These are pending the client beginning work in these states."); they are listed in section 8, not omitted.

Rounds and states (guide L202; matrix "Rounds"):

| Round | State | Status today |
|---|---|---|
| R1 | New York | Created 2026-11-20, pushed and checked 2026-11-23 (Case 55 pass / 0 fail / 7 skip; BCBA 26/0/3; BT/RBT 17/1/3). R1-WD run. |
| R1-U1 | New York | Update round: run sheet written, **not run**. |
| R1-U2 | New York | Blank round: **not run** (BCBA blank date of birth waits on question 27). |
| R2 | Colorado | Records made 2026-11-23, **never pushed**. Associations correct ([S] read 2026-11-24); needs a `--write` refresh for current values (old `date_of_birth` decoy). |
| R3 | New Jersey | **Not created.** |
| R4 (R-WD) | New York | Workday round, employees only; run 2026-11-23. R4 BCBA left at `error` CHECKLIST_STILL_TEMPORARY (step 5 untick not run). |
| D18 g gate set | any (suggested with R2) | Decided ("Yes, all 7"), **not written into the matrix**. |
| NM / VA | — | DEFERRED, no round. |

---

## 3. Every gap

One row per gap, most serious first. Group A could write wrong data to CentralReach, clear data there, or create a duplicate; group B could stop runs at deploy or cutover; group C is code or a decision still missing; groups D–F are missing live tests (trigger paths, states, field and label rules); group G is test-plan and tooling defects; group H is offline tests; group I is documentation; group J is closed items kept for the record. [C] Group K holds what the completeness check found missing (K1 ranks with group A). Every numbered gap of every slice appears in the "Slice refs" column; the full list of MISSING-TEST, NOT-BUILT, BLOCKED, CONFLICT and PENDING rows is in Appendix B.

### A. Could write wrong data, clear data, or create a duplicate

| # | Gap | Requirement (guide line) | Entity | State | What is missing | Exact fix | Slice refs |
|---|---|---|---|---|---|---|---|
| A1 | Existing staff and clients could be created a second time at cutover | One CR record per person; existing records are a separate phase (L751, L280, L353; pkg D18, D19) | BCBA, BT/RBT, Case | all (production) | Cutover rule: 181 BT/RBT and 11 BCBA are in CR only by email or name (11/23 recount), so a create would duplicate them unless `employee_id` / `client_id_number` is written first | At cutover: the "creates" workflow ticks only records created after the cutover date (decided, D18 c; question 24 already asked); the existing-records phase writes the CR ID before any tick. Add the counts to the guide (X-04) | 02 CASE-208; 08 GC-015, GC-017, GC-083 [Recency 11/24] E24 closed (P24). |
| A2 | Mixed Grad Permit holders: the pending code and the package disagree | Grad Permit marker (L364, L513) | Case | all | Decision and code: the WT sends the typed supplier as typed (no " BCBA LBA") and omits 136052; package rule 7 says leave both 131308 and 136052 out with warning `grad_permit_mixed_supervising_bcba`, "built that way unless you say otherwise" | Zeke answers question 26 (already asked); the build chat then makes the code match (or the package says "held as deployed"); reconcile `stage7GradPermitRoles` tests :273 / :365. No sandbox row possible (one 247 BCBA per Case) | 01-d6, 01-e1 (STF-018); 02-d1, 02-b4, 02-e (E26) (CASE-090); 08-e1 (GC-050) [Recency 11/24] CLOSED: question 26 answered; rule 7 as written, built (P17). |
| A3 | A blank typed supplier clears Supervising BCBA 131308 | L363, L512 (approved insert E: "a blank supplier sends nothing") | Case | all | Decision: the WT sends blank, which clears a value the integration wrote; insert E says nothing is sent | Zeke answers O-58 (already with him in the WT BUILD-PLAN) **before** the guide batch is written; then align code or insert | 08-d2 (GC-124), 08 review question 1 [Recency 11/24] CLOSED: O-58 decided: a blank typed supplier sends nothing; built (P20). |
| A4 | Care Coordinator 138851 would overwrite CR values | L361, L510 | Case | all | Decision: deployed code sends `care_coordinator_name` (2,530 production Cases), so the first sync overwrites 69 hand-entered CR values and a blank clears one | Zeke answers question 25 (already asked; answered 11/24: item 6 is built, 138851 is not omitted); then rewrite matrix C10 and add a sandbox Team Member record (02-a17) | 02-e (E25), 02-c (item 6), 02-a17 (CASE-069); 08-c2 (GC-037), 08-e1 (GC-038); 01-e4 (API-029) [Recency 11/24] CLOSED: question 25 answered (item 6 built, 138851 not omitted; P16). |
| A5 | Employee update with a blank date of birth sends CR's raw date back | L342 ("an update never sends the placeholder") | BCBA, BT/RBT | all | Decision: production `date_of_birth` is blank on all 375 BCBAs and 6,183 BT/RBTs; the shared code sends back CR's 28-character date | Zeke answers question 27 (already asked) **for both employee types** (04 question 1); option (a) rebuilds `YYYY-MM-DDT00:00:00.000Z`. Then offline test (03-b3, 04-b3), R1-U2 BCBA blank row, R3 BT/RBT update row (04-a8) | 03-e1, 03-b3 (BCBA-109); 04-e1, 04-a8, 04-b3 (BT-083); 07-e5 (TRG-270, -314); 08-e1 (GC-023); 02-e (E27) (CASE-019) [Recency 11/24] CLOSED: question 27 decided (option (a), both types, P18). |
| A6 | B21 (a blank core client field never clears CR) is built but never run live; the matrix still expects "cleared" | L346, L1746 | Case | NY | Sandbox row: R1-U2 expects "cleared" for the 11 core fields (matrix L27, L328) | Rewrite R1-U2: expect "kept" and an unchanged round-trip of `dateOfBirth`, `gender`, `stateProvince`; separately, metadata blank clears only values the integration wrote (CASE-207). Poller. Must pass before production (pkg step 6) | 02-a10, 02-a23, 02-c (B21), 02-b1, 02-b10; 08-a7 (GC-055, GC-057) |
| A7 | Junk Address 2 sends a state name into CR | L373 | Case | NY (5 of 25 More Than One Location Cases) | Decision (package question 7, already asked) | Answer question 7 (recommendation: send `null` when the value, commas removed, is empty or one state) | 02-e (E7), 02-c (E7) (CASE-128); 08-e1 (GC-036) [Recency 11/24] CLOSED: question 7 decided: `null` (P15). |
| A8 | Whole-address-in-street rule is loose | L373, L521 | Case | all | Decision O-59 (already with Zeke in the WT BUILD-PLAN): any street with a comma ending in five digits is taken as a whole address | Answer O-59 (tighten or accept); then add an offline case | 08-e2 (GC-123) [Recency 11/24] CLOSED: O-59 tightened: split only when a state precedes the ZIP (P22). |
| A9 | ID mismatch stop never proven live (prevents a write to the wrong CR record) | L276 (G17 "ID mismatch"), BR8 | Case, BCBA, BT/RBT | CO (Case), NY (employees) | Sandbox rows: R2 wrong-Client-ID Case; R1-U1 `workday_id` changed to another 7-digit value → `error` WORKDAY_ID_MISMATCH, no update | Add GC-121 to R2 (webhook) and the employee mismatch to R1-U1 (both paths) | 08-a11 (GC-121); 07-a6 (TRG-044, -057, -069, -015); 03-a4 (BCBA-038); 04-a5 bullet 1 (BT-020) |
| A10 | Duplicate Workday ID (BR11) never proven live | L278 | BCBA, BT/RBT | NY | Sandbox row; matrix BR11 still "held" although both reasons are closed (O-8 answered by item 15; A-22 = decision 38) | Lift the hold; add: a second BCBA with 0498374 and a second BT/RBT with 4837593, Entered = Yes → `error`, no CR call (webhook) | 03-a5, 03 question 3; 04-a5 bullet 3, 04-e2 (BT-025); 07-a6 [Recency 11/24] BR11 hold lifted (d38). |
| A11 | The production gate (two checkboxes) is not proven live | L280, L282 (inserts A, B), L1231 | Case, BT/RBT, BCBA, Contact | any | Sandbox rows: the D18 g set (BR4-C, BR4-CU, BR4-UC, BR4-X 1–2, BR4-U+L, BR4) is decided but not in the matrix; items 14 and 24 are in the WT only; no BCBA gate row; the gate-blank record (BR4) not run | Write the D18 g rows into the matrix; run after the deploy with the two temporary settings (Azure write, Zeke's word); add the second BR4-U+L edit after unticking (GC-113); add the gate hand-off with pending labels (LBL-085); BCBA row is question 11 | 07-a2, 07-a3, 07-c1 (TRG-073, -075 to -083, -088, -090); 08-a1, 08-a12 (GC-003 to -005, -009, -010, -113); 03-a18 (BCBA-009 to -011); 02-a16 (CASE-168, -184); 06-a13 (LBL-085) [Recency 11/24] CLOSED/decided 11/24: Question decided (P25): add the second BR4-U+L edit. |
| A12 | New Supervising BCBA rule (item 9) not deployed and not tested; the " BCBA LBA" suffix changes 2 Colorado production Cases and Colorado never takes the normal path in the sandbox | L363, L512, L552 (insert E) | Case | NY, NJ, CO | Code not deployed; matrix C12 and `check-cr-record.mjs:170-175` describe the old rule; R2's 247 BCBA is a Grad Permit holder | Rewrite C12 for every round (R1 "Zeke Swanson BCBA Azure Test R1 BCBA LBA"; R3 as R1); add one R2 Case whose 247 BCBA is not a holder ("First Last BCBA LBA") | 01-a6, 01-a13, 01-c1, 01-d1 (STF-012); 02-a1 (CASE-078); 08-a6 (GC-049) |
| A13 | Typed-supplier fallback not tested | L512, L363 | Case | NJ or NY | Sandbox row | R3 Case without a 247 link (or R1-U1 after removing 247): supplier "Azure Test Supervising N" → "… BCBA LBA"; supplier already holding "BCBA" → as typed. Webhook (create) and poller (supplier edit) | 01-a2 (STF-013); 02-a2 (CASE-079) |
| A14 | Grad Permit holder rules not tested; record-level direction of link 227 unverified | L364, L513, L415, L1004 | Case + 2 BCBAs | CO | Sandbox rows: no round creates a 227 link | R2-U1: link the R2 holder BCBA to BCBA 2 with 227 from the holder's side (if the holder-side read lists nothing, the sandbox ID is 226) → 136052 "… Grad Permit Holder", 131308 = supervisor + " BCBA LBA"; holder without a link → 131308 left out with warning; licence leaves Grad Permit → 136052 cleared (needs a Case edit). Poller | 01-a3 (STF-014 to -017, -019, -070, -071); 02-a3 (CASE-084 to -088); 08-a6 (GC-045 to -047) |
| A15 | Item 10 roles (SUB, Outgoing SUB, Outgoing Supervising, On Leave, Outgoing BT 1/2) not deployed, not tested, and their decision basis is thin | L365, L366, L552–L561 | Case | NY, CO | Code not deployed; sandbox rows; Zeke's words cover label 288 and the order "Yes" only | Sandbox: Outgoing BT 1 only (244) → 131313 holds it; Outgoing BT 2 (236) → 138092; same BT on 238 and 244 named once; Outgoing Supervising only (253); Outgoing SUB only (221) then removed; SUB (217) + On Leave (233). R1-U1 and R2, poller. Decision: question 10 [C] (was "question 1": the slice's numbering) | 01-a1, 01-a4, 01-c1, 01-d5, 01-d7, 01-e5 (STF-026 to -063, -086); 02-a4, 02-a5 (CASE-080 to -083, -096); 08-a6 (GC-048, -051 to -053) [Recency 11/24] CLOSED/decided 11/24: Question decided (P23, P25): item 10 rules confirmed ("these rules are rig"). |
| A16 | Production Grad Permit data wrong before go-live | L513 | BCBA (production data) | NY | Data fixes D15 (Dominique Plummer, Katie Vangraefschepe `lba_licensure__ny`), D16 (10 holders with no 151 link → 131308 left out), D17 (4 stale 135 labels) | Zeke / United Care fix before go-live (pkg "Before deploy" 3) | 01-e3 |
| A17 | Several staff in one role and the record-ID join order | L366; item 10 | Case | NY or CO | Sandbox row (only labels without a sandbox limit can hold two) | Two BTs on Outgoing BT 2 (236), or Primary BT 1 + another BT on Outgoing BT 1 (244) → "A, B" in record-ID order. Poller | 01-a12 (STF-053) |

### B. Could stop runs at deploy or cutover

| # | Gap | Requirement (guide line) | Entity | State | What is missing | Exact fix | Slice refs |
|---|---|---|---|---|---|---|---|
| B1 | Production gate properties do not exist yet | L280, L282; pkg "Before deploy" 2 | Case, BCBA, BT/RBT | production | `centralreach_creates_only` / `centralreach_updates_only` are 404 in production; the WT guard refuses a production start unless both settings name them | Cutover order: create the six properties, then set the two settings, then deploy item 24 to production | 02 CASE-167, -168; 03 BCBA-010 to -012; 04 BT-033, -034 |
| B2 | Sandbox object types still set in Azure | L428, L465 (object types per portal) | BCBA, BT/RBT | production | `HS_BCBA_OBJECT_TYPE_ID` / `HS_BT_RBT_OBJECT_TYPE_ID` hold the sandbox types; with portal 50317927 every run is invalid configuration | At cutover remove both or set `2-48354212` / `2-48354559` (section 6) | 07 §2.2 |
| B3 | Referral "Other" text and the coordinator fields cannot ship yet | L382, L539; L361, L510 | Case | all | `referral_other`, `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status` are 404 in production; a requested missing property fails every run. The WT requests all four (a production deploy before they exist fails every Case run) | Keep items 2 ("Other" part) and 6 held until the properties exist and the pre-deploy check passes; then C36 R2 test (02-a12) and the Other + blank → "Other" test (08-a9, 08-b1) | 02-a12, 02-c (item 2) (CASE-160); 08-c1, 08-a9, 08-b1 (GC-027, GC-028) [Recency 11/24] Risk restated: the WT requests all four properties; a production deploy before they exist fails every Case run (P16). |
| B4 | BT/RBT date of birth: deployed reader errors on typed text | L342 | BT/RBT | all | Production `date_of_birth` is calculated text; deployed `readDate` would end a typed `M/D/YYYY` run as `error`; item 16 (WT) is required before production; B5 / T2 proven only under the old rules | Deploy item 16; re-prove B5 and T2 on the R1 refresh (poller) and R2 / R3 creates (webhook) | 04 BT-079, BT-080; 08-a5 (GC-021, GC-025) |
| B5 | Workday 7-digit check (item 15) not tested live | L745 | BT/RBT, BCBA | any | Sandbox row (named in the package, not in the matrix); known effect: 5 production records end `error` until fixed (Zeke's task D20) | After the deploy: a 6-digit `workday_id` on a test BT/RBT → `error` "workday_id must be exactly 7 digits.", no CR call (poller); the BCBA run is optional (shared line) | 04-a7, 04-c1 (BT-141, -038); 07-a7 (TRG-096); 08-a3 (GC-060); 03-a9 (BCBA-052) |
| B6 | Production IDs never relied on end to end | L975 ("production IDs must be verified before they are relied on"); L428, L465 | all | production | Definitions match (production read 2026-11-24) but no run used them; association limits and the reverse types 75, 144, 289 not read | Cutover check: the first production run per object type routes correctly (BT-156); read production association limits (SBX-004) | 01 SBX-002, SBX-004; 04 BT-156; 01-a9 (definitions done) |

### C. Code or decision still missing

| # | Gap | Requirement (guide line) | Entity | State | What is missing | Exact fix | Slice refs |
|---|---|---|---|---|---|---|---|
| C1 | The whole pending build is undeployed | every row marked NOT-BUILT or "WT only" | all | all | Deploy: items 14, 24, 1, 16, 4, 7, 9, 10, 5, B21, 15, 12 are in the WT (not committed) | Zeke's word to commit and deploy (pkg "Ship today"); the E2E runs after it | 01-c1; 02-c (item 5, B21); 03-c3; 04-c1; 07-c1 |
| C2 | Allergies (item 3) and Severity (item 8) held | L374, L523; L377, L526 | Case | all | Decision: un-hold (already asked) | On Zeke's word: build, rewrite matrix C26 ("Peanuts" alone, "None") and C28 (digit), offline tests (02-b8) | 02-a11, 02-b8, 02-c (items 3/8), 02-e (items 3/8) (CASE-130, -131, -137); 08-e1 (GC-030, GC-044) [Recency 11/24] CLOSED: items 3 and 8 un-held and built (P19). |
| C3 | CR API budget safeguards not built | L1730 (pkg H4 items 19–21; Zeke: "Yes to all please") | all | all | Item 19 (daily call count + alert), item 20 (sweep runs get 1 retry), item 21 (label-only retry) | Build 19 and 20 before cutover, 21 before the existing-records phase; when building 20, keep `CR_LABEL_POST_UNCONFIRMED` on the full schedule (question 20); tests come with the build | 07-c2, 07-c3, 07-c6, 07-b2 (TRG-297, -298); 05-c2, 05-c3 (CLB-118, -160); 06-c1 (LBL-084); 08-c3, 08-c4, 08-b3 (GC-066 to -068) [Recency 11/24] CLOSED/decided 11/24: Q20 decided: `CR_LABEL_POST_UNCONFIRMED` keeps the full retry schedule on sweep runs (P25). |
| C4 | Item 12 (150 s first label retry) not deployed or tested live | L1736 | all | CO (R2 creates) | Deploy; sandbox log check | After the deploy, on the first unconfirmed label POST of R2: retry scheduled ≥150 s later (webhook, then queue retry) | 05-c1, 05-G5 (CLB-117); 06-a6 (LBL-074); 07-a14 (TRG-295); 08-a8 (GC-058) |
| C5 | Item 13 (one JSON line per log call) | pkg item 13 | all | — | Decision (package question 17, already asked); the App Insights stitch loses keys when two runs interleave | Answer question 17 | 07-b3, 07-c6; 08-e1 (GC-059) |
| C6 | BCBA Care Coordinator has no CR field | L412, L582, L773 | BCBA | all | A CR employee field (Danny / United Care; pkg D8) | Wait for the field; no owners scope needed until then | 03-c1, 03-e2 (BCBA-137, -184); 07-e10 (TRG-243); 08-e1 (GC-041) |
| C7 | BCBA credential labels other than NY Medicaid (BL6) | L416, L417, L578, L691–L692 | BCBA | NY, CO, NJ | Mapping confirmation from United Care (OPEN-ITEMS row 8; decision 25) | Send the proposed mapping (question 21); build only after it is confirmed; not blocking go-live | 03-c2 (BCBA-140b); 06-e1, 06-b1 (LBL-027 to -033); 07-e10 (TRG-245) |
| C8 | BT/RBT personal email (T9) held | L580 analogue; O-51 | BT/RBT | all | Field confirmation with Danny and the client | No action until O-51 is answered | 04-c3, 04-e7 (BT-146) |
| C9 | New Mexico / Virginia: no label, warning only; production already has 8 NM and 2 VA BCBAs | L234 (G19) vs L413, L439, L441, L686, L700, L741, L874 | BCBA, BT/RBT, Case | NM, VA | Deferred by Zeke 2026-11-23; the guide still says "not used yet"; code comments say "no HubSpot value yet" (stale) | Keep deferred; add the guide note (X-26); fix the comments when item 11 is picked up; add the BL3 / TL2 warning steps to the run sheet (06-a11) | 04-c2; 06-d1, 06-c2, 06-a11 (LBL-008, -009); 05-e3 (CLB-067, -068); 03-b5 (BCBA-196) |
| C10 | A Case answer without the CR ID key | L1746 | Case | all | Decision O-57 (already with Zeke): decided `error` with a HubSpot write (code) vs failed read with no write (pkg D18 f) | Answer O-57 | 08-e2 (GC-120) [Recency 11/24] CLOSED: O-57 decided: keep the behaviour (visible `error` `HUBSPOT_PROPERTY_MISSING`; P21). |
| C11 | Production rollout authority | L1718 vs L294 | — | — | Decision (RG D15, already waiting) | Answer RG D15 | 08-d1 (GC-106); 07-e6 (TRG-285) [Recency 11/24] Likely settled by Ruling B (P14): production in two phases (phase 1 creates only; phase 2 existing records). Needs Zeke's confirmation; ask him. |
| C12 | Create signal and BCBA Workday order still open with Sara | L248, L250, L286, L571, L757 q3 | BCBA, BT/RBT | all | United Care answer; the build keeps Entered = Yes (decision 8) | Ask through Danny; no build change | 03-e4 (BCBA-194); 04-e4 (BT-053); 07-e7 (TRG-021, -022, -095) |
| C13 | One Workday ID on two records / two CR employees | L278, L747 | BCBA, BT/RBT | — | United Care answer (RG D10, O-23) | Keep as is; guide note X-40 | 04-e3 (BT-143); 07-e8 (TRG-065) |
| C14 | Other United Care items | L757 q1–q3, existing-records method (D3), diagnosis formats (O-28) | BCBA, Case | — | United Care answers: BCBA-051, -053, -058 to -060, -063, -112, BCBA-L08; CASE-025, -076, -154 | No build change; track in OPEN-ITEMS | 03-e3; 02-e (O-28, D3) |
| C15 | New post-cutover records need no further hold? | pkg D18 c | all | production | Question 24 (already asked) | Answer question 24 | 04-e5 (BT-036); 07-e4 (TRG-084); 08-e1 (E24 behind GC-012) [Recency 11/24] CLOSED: question 24 closed as recommended (Entered = Yes plus created after the cutover date; P24). |
| C16 | Should the sweep leave out `error` records? | pkg H-Q6 | all | — | Question H-Q6 (already asked) | Answer H-Q6 | 07-e9 (TRG-323); 08-e1 (GC-073) |
| C17 | `home_apt` | O-20 | BT/RBT | — | Decision (already waiting) | Answer O-20 | 04-e6 (BT-098) |
| C18 | Item 10 roles have no change signal | L545, L367 | Case | all | A role change (SUB, Outgoing, On Leave, a 227 link, a licence) changes none of the five name properties the workflows watch, so it waits for the next Case change or the daily sweep (up to ~24 h) | Question 12 [C] (was "Question 2", the slice's numbering) (accept the sweep for go-live; measure once with 01-a4) | 01-c2 (STF-083) [Recency 11/24] CLOSED/decided 11/24: Question 12 decided as recommended (P25). |
| C19 | Auth Period dates | L372, L489 | Case | all | The guide says "written at midnight UTC"; CR's field is text and the code sends `MM/DD/YYYY - MM/DD/YYYY` (matches CR on 84 of 92) | Question 34 [C] (was "Question 6", the slice's numbering) (keep the code, add a guide note) | 02-d2 (CASE-119) [Recency 11/24] CLOSED/decided 11/24: Decided: keep the code (Q34, P25). |
| C20 | BT/RBT "RBT CO" contact form has no Zeke words | L337 | BT/RBT | CO | Decision: decision 17 was "proposed by the orchestrator and not objected to" | Question 15 | 04-d5 (BT-109) [Recency 11/24] CLOSED/decided 11/24: Decided: `RBT CO` confirmed (Q15, P25). |
| C21 | Production sync workflows: segment as trigger or as filter | L1714 vs pkg D18 c | all | production | Confirmation | Question 24 of this list | 07-d1 (TRG-284) [Recency 11/24] CLOSED/decided 11/24: Decided: triggers plus re-enrolment; the segment is an AND filter (Q24, P25). |
| C22 | Existing-records review must check BCBA label 1107647 | L416–L417, L578 | BCBA | NY | Package question 8 recommendation (already asked) | Add to the D19 review list | 08-e1 (GC-016) |
| C23 | Lead-age timing and "Reassessment uses staffing_status" | L637, L639 | Case labels | — | United Care confirmation; no integration effect | Track only | 05-e1 (CLB-050), 05-e2 (CLB-051) |

### D. Missing live test: trigger paths (webhook, poller, sweep, fan-out, retries)

| # | Gap | Requirement (guide line) | Entity | State | What is missing | Exact fix | Slice refs |
|---|---|---|---|---|---|---|---|
| D1 | The poller and the daily sweep are off | L1730, L1738; Zeke 11/24 "we will turn the Poller on when our changes are implemented" | all | all | Azure setting (`AzureWebJobs.intakePoller.Disabled=true`); every "poller" cell is a plan | Turn it on after the deploy (Zeke's word); read the setting back as step 1 of the re-test | 01-a14 |
| D2 | A mapped-field edit sending a refresh webhook is unproven for the Case and the BT/RBT (BCBA proven only on `workday_id`); the trigger lists are not in the repo | L392, L420, L442, L798–L804, L1020–L1026, L1708 | Case, BT/RBT, BCBA, Contact | NY, then CO, NJ | Sandbox rows recording which path delivered each edit. Zeke confirmed 2026-11-24 "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)" | With **both** the webhook and the poller on, record the `source` of the first run of every R1-U1 edit (`hubspotWorkflow` = webhook; `intakePoller` = no trigger fired); a field with no webhook run is a trigger gap for Zeke to fix in HubSpot. One label edit per label source (06-a8), one Case edit per label source (05-G6), the staffing rollup change (01-a11) | 07-a1, 07-e1 (TRG-134, -136, -138, -208, -226); 08-a4 (GC-103); 04-a1 bullet 1 (BT-065); 05-G6, 05-e4 (CLB-130); 06-a8, 06-e2 (LBL-077); 02-a15 (CASE-171); 01-a11, 01-e2 (STF-001 to -005, WF-003 to -010); 03-d2 |
| D3 | Checklist and BT/RBT `workday_id` edits sent no webhook | L272, L276 (3) | BCBA, BT/RBT | NY | Trigger proof; the BCBA checklist tick (R-WD step 4) and the BT/RBT `workday_id` edit (R1-WD) arrived only by the poll | Zeke adds the checklist (both types) and BT/RBT `workday_id` to the workflow triggers if missing (question 16 [C], was "question 9"); then R-WD step 5 / R1-U1 records the `source` | 03-a15, 03 question 2 (BCBA-027, -163); 07-a4, 07-a22 (TRG-035, -036); 04 BT-012 [Recency 11/24] CLOSED/decided 11/24: Decided (Q16, P25): prove triggers by `source`. |
| D4 | No create has ever arrived through the poller | L321; poller Entered = Yes branch | Case, BCBA, BT/RBT | CO, NJ | Sandbox rows | For each entity, set Entered = Yes with the entry workflow off and wait for the poll (R2 BT/RBT, R3 BCBA, R2 or R3 Case); the Case create's labels as for a webhook create (CLB-161); the other source's run ends `noop` or `SYNC_IN_PROGRESS` | 07-a11 (TRG-098 to -100); 03-a22 (BCBA-004); 04-a1 bullet 3; 05-G10 (CLB-161); 02-a14 part 2 (CASE-196) |
| D5 | No Case mapped-field update has run through the poller (every Case poll so far ended `noop`) | L322 (Requirement 2) | Case | NY, then CO, NJ | Sandbox row | R1-U1 Push 1 with the Case workflow not firing for that field; record `source` | 07-a19 (TRG-106); 02-a14 part 1 (CASE-195) |
| D6 | Association-only change by the sweep | L545, L367 | Case | NY | Sandbox row; time to arrive | Change only an association (e.g. remove 221); record whether the poll or the sweep carried it and how long it took | 02-a14 part 3 (CASE-197); 01-a4 |
| D7 | Daily sweep: an unlinked `waiting` record, a linked BCBA with `source: dailySweep`, a label change caught by the sweep alone | L824, L276 (3) | BT/RBT, BCBA, Case, labels | NY | Sandbox rows (the 15:16 sweep on 11/24 proved only the linked `noop` branch) | Stage 8 "Poller and sweep": first 08:00 UTC run with the poller on | 07-a8 (TRG-051); 03-a12 (BCBA-029); 05-G7 (CLB-132); 06-a7 (LBL-079) |
| D8 | Contact fan-out and the Contact webhook never seen (no `0-1` webhook in 30 days) | L454, L455, L830, L860 | Contact → Case | NY | No Contact workflow is needed for the Guardian fields; O-21 is superseded (pending Zeke's confirmation) | K1 and BR4-X step 2 on the Case path | 07-e2 (TRG-128, -142, -143, -263); 02-e (O-21) (CASE-175, -186); 02-a16 [Recency 11/24] Restated as the Case-path Guardian test: edit the Guardian Contact, the Case sync property changes, the Case workflow sends the webhook (or the poll queues the Case), record `source`. No Contact workflow is required for the Guardian fields (R02, CASE-186, TRG-141): pending Zeke's confirmation, recommended. |
| D9 | Contact-held values reaching the employee (HubSpot property sync then workflow or poll) | L442, L455, L893 | BT/RBT, BCBA | NY | Sandbox rows; O-26 (already waiting) | R1-U1: change the BT/RBT 1 Contact `phone`, `zip`, `state_dropdown`, `date_of_birth` (one push) and the BCBA Contact `address`; record the path | 04-a6, 04-c4, 04-b4 (BT-068, -069); 03-a16 (BCBA-131); 07-e3 (TRG-197) |
| D10 | Retries beyond 300 s, dead-letter and the alert email never run | L1730, L1732 | any | any | Sandbox row; an email receiver | Add Danny or a shared inbox to the action group (question 27); then a forced temporary failure walks 60 s → 300 s → 15 min → 1 h → 4 h → `error` "Retries used up" → dead-letter → email | 07-a13, 07-c5 (TRG-171, -295, -296) [Recency 11/24] CLOSED/decided 11/24: Decided (Q28, P25): add the receiver now. |
| D11 | One round at the hourly schedule | L1710, L1730 | any | any | Sandbox round | Last sandbox round with `INTAKE_POLLER_SCHEDULE` removed | 07-a12 (TRG-292) |
| D12 | R1-U1 rows missing from the run sheet | GBR L322; BR7, BR13, BR14, BR15, BR17, BR18, BR21, BR4 | all | NY | Run-sheet lines | Add: BR7 (employees and Case), BR17 relabel, BR14 webhook and poller at once, BR18 status flip, BR15 24-hour report, BR4, BR13 property history (only write-list properties changed), BR21 exact-value log scan | 07-a16, 07-a23 (TRG-106, -108, -109, -125 to -127, -130, -331); 03-a21 (BCBA-013); 04-a11 (BT-044, -046 to -048) |
| D13 | Cleanup-stage exclusion per path | L322, L657 (BR6) | Case | CO | Matrix BR6 expects "`skipped` each time"; via the poll an excluded Case is never queued, so no line is written | Rewrite BR6: poll → not queued; webhook → `skipped` `excluded_stage`; record which path per stage | 07-a15, 07-d3 (TRG-112 to -115); 01-a10 (OBJ-012 to -015) |
| D14 | Linked records in a non-excluded inactive stage still update | L322, L401, L428, L810 | Case, BCBA, BT/RBT | NY, CO | Sandbox rows | Case to Paused / Discharged (label follows), BT/RBT to Resigned / Terminated, BCBA to Terminated; change one mapped field each → update sent, nothing deactivated. Poller (webhook if the workflow watches the stage) | 07-a9 (TRG-110, -151, -156); 01-a7 (OBJ-021, -027 to -032); 04-a9 (BT-059); 03-a17 (BCBA-003); 02-a22 (CASE-206) |
| D15 | The R4 Case and BT/RBT 2 sent no webhook on creation (R2's records did) | L1040–L1067 | Case, BT/RBT | NY | Explanation (HubSpot workflow question) | Check the R4 records' enrolment history in the sandbox workflow; re-test at R3 create | 07 "App Insights re-run", still open |
| D16 | HubSpot retry of a workflow webhook after an Azure 5xx | L1238 | all | — | Not verified | Question 25 (accept without a test; the poller is the backstop) | 07 TRG-273 [Recency 11/24] CLOSED/decided 11/24: Decided: accept untested (Q25, P25). |
| D17 | A count change made by HubSpot automation (`active_cases_count`) | L824, L1746, L442 | BT/RBT | CO, NJ | The sandbox "BT - Active Cases Sync" workflow left the test BT/RBTs blank (T7 failed twice) | Question 13 (Zeke checks the workflow's enrolment); then R2 → "0", R3 → "1", then R3 Case Warm → Cold → "0" by the poller | 04-a3, 04-f2 (BT-104, -105, -151) [Recency 11/24] CLOSED/decided 11/24: Decided (Q13, P25): Zeke checks "BT - Active Cases Sync". |
| D18 | Label change while `waiting`, and label changes whatever the entry value holds | G17 L276 (2); GBR L322, L429 | BCBA, BT/RBT | NY | Sandbox rows (R4 BCBA is at `error`, not `waiting`) | R-WD step 5 (untick → `waiting`), then change `cr_billing_hold_label` and `medicaid_id__ny` → update sent, `waiting` kept; state the entry value in R1-U1 Push 1 and 3 expected results | 06-a5, 06-a12, 06-b3 (LBL-075, -081); 03-a19 (BCBA-026) |

### E. Missing live test: state coverage

| # | Gap | Requirement (guide line) | Entity | State | What is missing | Exact fix | Slice refs |
|---|---|---|---|---|---|---|---|
| E1 | Nothing pushed for Colorado or New Jersey | every state-varying row; L202 | all | CO, NJ | R2 `--write` refresh (values only; associations confirmed); R3 not created | Before the re-test: R2 `--write`, association read, R3 create (records only, then push) | 02-a19; 01-a8; 05-G9; 03-a3 (BCBA-021, -022, -090 to -092, -097, -100, -105 to -107, -116, -122 to -129, -132 to -134, -138) |
| E2 | No update round in Colorado or New Jersey | "each state … webhook and poller on" | all | CO, NJ | One update push per entity per state through each path | Add an R2-U and R3-U push per entity, once by webhook (record `source`) and once by poller only | 07-a17, 07 question 1 |
| E3 | Behavior Technician NJ 1132652, a New-Jersey-only BT/RBT and a BT with two states are in no round | L700, L337, L439 | BT/RBT | NJ, CO | Sandbox rows; matrix TL3 "all six role labels are covered" is wrong | Either change R3 BT/RBT 1 to BT, New Jersey only (form sets NY labels; expect NJ Employee + BT NJ and the NY labels removed), with an R3-U1 step to RBT New Jersey;New York, and R2 BT/RBT 1 to Colorado;New York (06), or add a second pushed NJ BT (04). Question 14 | 04-a2, 04-d2 (BT-110, -117, -124); 06-a1, 06-a2, 06-a9 (LBL-053, -058, -066) [Recency 11/24] CLOSED/decided 11/24: Decided (Q14, P25): slice-06 route. |
| E4 | Client label transitions in each state | L605–L609, G19 L220–L222 | Case | NY, CO | Sandbox rows | G1: R1 to Paused (blank staffing) → staffing label off, In-Active on, NY Client kept; G2: R2 97151 Services → Staffed 97153 (one POST); G3: R2 Cold → Warm; G4: add "NY Client still held" to R1-U1 line 54 and check CO Client + In-Active on the R2 create | 05-G1, 05-G2, 05-G3, 05-G4 (CLB-012, -014, -029, -030, -037, -064) |
| E5 | State-specific field forms in CO and NJ | GER-REQ, G05, G06 | Case, BCBA, BT/RBT | CO, NJ | R2 / R3 runs: phone forms, ZIP 07103, mailing state code, Medicaid IDs NY/NJ/CO, DOB forms, physician pair by Medicaid type | Run R2 and R3 with today's values; rewrite C31 to "`<name> <npi>`" per state | 03-a3; 02-a7 (CASE-149, -150) |
| E6 | 1 PM Eastern flip on a non-NY Case | L230, L955 | Case | CO | Optional row | R2 Case: observe the flip (poller) | 07-a18 (TRG-161, -274) |
| E7 | "Yes; Insurance Card(s)" create (CONTAINS_TOKEN) | L321, L354 | Case | NJ | Sandbox row | R3 Case with "Yes; Insurance Card(s)": created by webhook, and once by poll with the workflow off | 07-a10 (TRG-122, -250) |

### F. Missing live test: field and label rules

| # | Gap | Requirement (guide line) | Entity | State | What is missing | Exact fix | Slice refs |
|---|---|---|---|---|---|---|---|
| F1 | Availability text only (item 7) and physician "`<name> <npi>`" (item 4) | L369, L517; L380, L530 | Case | all | Matrix C19 / C31 and `check-cr-record.mjs` expect the old values | Rewrite C19, C31 and the R1-U1 lines 39 and 48 | 02-a6, 02-a7 (CASE-108, -149, -150); 08-a6 (GC-031, GC-042) |
| F2 | Service address two lines and the state fallback (item 5) | L360, L373, L509, L521 | Case | NY, CO, NJ | C24 expects the old `full_home_address`; script always sets `stateregion` and never `service__stateregion_2` | Rewrite C24; add an Other Location Case with `service__stateregion_2`, a `stateregion`-blank variant (→ `location`), an unreadable `stateregion` ("Brooklyn") → `location` + warning, run not `error`; Screen check of the line break | 02-a8, 02-a9, 02-c (item 5) (CASE-058, -059, -122 to -125); 08-a2 (GC-032, GC-034) |
| F3 | Insurance Card checkbox: create with `CDE;Yes`; linked update with other options only | L394 | Case | CO, NY | Sandbox rows | R2 create; R1-U1 Push 8 variant | 02-a13 (CASE-022, -024) |
| F4 | BCBA created with a 7-digit `workday_id` filled | L573, L717 | BCBA | CO | Sandbox row (only the BT/RBT took this path, R-WD) | Give the R2 BCBA a random 7-digit `workday_id` before its push: both lookups 404, External System ID = Workday ID, `success` (webhook); R3 keeps the temporary-ID path | 03-a2 (BCBA-020, -023, -042); 07-a20 (TRG-189) |
| F5 | BCBA email rules | L341, L408, L576 | BCBA | NJ, NY | Sandbox rows | R3: BCBA create with blank `email` → `error` "Missing required field: email", no CR call (webhook); R1-U2: linked update with blank `email` → CR keeps its email (poller) | 03-a10, 03-a11 (BCBA-101, -104) |
| F6 | BCBA Workday and checklist branches | L270–L278 | BCBA | NY | Sandbox rows | Checklist ticked with `workday_id` blank → `error` CHECKLIST_BLANK_WORKDAY, update still sent; R-WD step 5 untick → `waiting`; mapped change while `waiting` → update sent | 03-a7, 03-a8, 03-a19 (BCBA-035, -037, -026); 07-a5, 07-e11 (TRG-056, -058); 04-a5 bullet 2 |
| F7 | BCBA update while Entered is blank (BR5) | L322 | BCBA | NY | R1-U1 line 19 sets `No`, an option the BCBA property does not have | Change line 19 to clear the value (expect update sent; arrives by poller) | 03-a1, 03-d3 (BCBA-007) |
| F8 | BT/RBT Workday rows proven only on the BCBA | L270–L278 | BT/RBT | CO | Sandbox rows | R2 BT/RBT (temporary ID): set a 7-digit `workday_id` → `waiting` "Replace…"; change an address field while `waiting`; tick → CHECKLIST_STILL_TEMPORARY; untick → `waiting` | 04-a4 (BT-010, -011, -018, -019) |
| F9 | BT/RBT update half of every field and other BT/RBT branches | GBR L322; L429; L1746 | BT/RBT | NY | Sandbox rows | R1-U1: one edit per field not yet covered (BT-150); clear `workday_id` with the checklist unticked → `success` (BT-022); clear Entered, change a field → update sent (BT-058); a by-hand BT/RBT with `employee_id` `5384530x` → `error` (BT-031); Contact `phone` `12345` → `error` "Unreadable value: employee_phone" (BT-075 etc.); the failure report and waiting view list the record (BT-153) | 04-f1, 04-f3, 04-f4, 04-f5, 04-f6, 04-f7 |
| F10 | BT/RBT run-sheet lines missing | L1231 (test_record), BR4, L591 | BT/RBT | NY | Run-sheet lines | Add BT-132 (`test_record`), BT-032 (gate blank), BT-056 / BT-057 (`Yes - Generic`, `No- Made Inactive`) | 04-a10 |
| F11 | Staffing rows never-synced and per-state repeat | L366, L555, L561 | Case | CO, NJ | R2 / R3 runs | R2: Previous IA (235) and Potential BT 2 (218) on BCBA 2 / BT/RBT 2 → no field change; repeat C11, C14, C16 in R2 and R3 | 01-a5, 01-a8 (STF-022, -025, -042, -044, -049, -052, -065, -069) |
| F12 | Employee label transitions | L686–L692, L700 | BCBA, BT/RBT | NY, CO | Sandbox rows | R1-U1: `assign_states` Assign NY;Assign NJ → Assign NY (BCBA LBA NJ removed); R2-U1 (optional): licence Grad Permit → Yes | 06-a3, 06-a4 (LBL-019, -024) |
| F13 | Client label change whatever Entered holds | L394, L322 | Case | NY | Sandbox row | Make the BR5 Case update change `specific_home_location` and check the label | 05-G12 (CLB-152) |
| F14 | Link properties read back | L355, L403, L430 (pkg D18 c depends on them) | Case, BCBA | NY | HubSpot sandbox GET | Read `central_reach_link_to_client` on Case 68493177375 and `central_reach_record_link` on BCBAs 67036479540 / 67208227438 (read-only, now) | 07-a21 (TRG-123a, -123b) |
| F15 | BCBA create read-back and Screen check | L571–L582 | BCBA | CO, NY | Sandbox rows | R2: record `central_reach_record_link`, `last_sync_at`, `updated_by_integration`, `last_sync_hash`; B1 Screen check (Admin form) | 03-a13, 03-a14 (BCBA-072, -075, -077, -078, -090) |
| F16 | Round clean-up and log | L212 | Case, BCBA, BT/RBT | NY, then CO, NJ | `sandbox-test-log.md` empty | After each round: inactivate the client and employees in CR, record HubSpot ID, CR ID and the inactive date | 02-a20 (CASE-200); 04 BT-148 |
| F17 | Case with Entered not Yes is skipped | L354, L321 | Case | CO | Slices 02 and 05 say no Case evidence; App Insights (slice 07) shows R2 Case 68589573817 webhook 16:45:12 → `skipped` `entry_not_yes`, 0 CR calls | Confirm with `record-timeline.kql` for 68589573817 (read-only) and promote CASE-205 and the negative half of CLB-052 to proven (CO, webhook) | 02-a21 (CASE-205); 05 CLB-052; see section 10 |
| F18 | Linked Case moved to Cold by a stage move still updates | GBR L322, G11 L810 | Case | NY | Sandbox row | R1-U1 CL3 U1: record the stage and that the mapped-field update still reaches CR | 02-a22 (CASE-206) |
| F19 | Label removals in R1-U1 must actually run | L605–L609, L693 | Case, BCBA | NY | R1-U1 not run | Run R1-U1 (Active ↔ Inactive, staffing change, Billing Hold off) | 08-a10 (GC-090) |
| F20 | Matrix BR3 Result cell blank although proven | BR3 | Case, BT/RBT | NY | Result cell | Fill from R1 log L114-115 and L458 | 08-a13 (GC-119) |
| F21 | BCBA found by Workday ID with no HubSpot holder | L278 | BCBA | — | Live setup needs a real CR employee | Accept offline only unless Zeke names a CR employee to use | 03-a6 (BCBA-045) |
| F22 | Only the first Parent/Guardian is sent | L232, L508 | Case | — | No test (HubSpot decides which Contact a property sync uses) | Add a two-Guardian sandbox Case if wanted; otherwise accept | 01 STF-078; 02 CASE-053 |
| F23 | Does CR accept "#" in a name | L214 | all | — | Test (RN names replaced it) | Accept as retired (names use "RN") unless Zeke wants the check | 04 BT-149 |
| F24 | A webhook for BT/RBT `ContactForm` on update | L337 | BT/RBT | — | Cannot be seen in logs (no bodies) | Offline test (04-b2) | 04-a12 (BT-113) |
| F25 | A staff label deleted from CR's catalog while a client holds it | BUILD-PLAN Stage 8 "Labels, first" (A-18) | Case or test employee | NY | Live test needs a CR catalog write; not in the matrix | Question 18: accept offline (the POST is held back and retried) plus a runbook note for `CR_LABEL_NOT_IN_CATALOG`; run live only if wanted | 05-G8 (CLB-123) [Recency 11/24] CLOSED/decided 11/24: Decided: accept offline (Q18, P25). |
| F26 | Care Coordinator email has no CR target | L361, L510 | Case | — | Decision O-17 (already waiting) | No build; answer O-17 with item 6 | 02-e (O-17) (CASE-070) |
| F27 | Accepted as offline only (a live test needs a CR failure, a race or a second CR record) | various | BT/RBT; decisions | — | — | No live row; listed so none is lost: BT-013, -017, -026 to -030, -041, -049, -052, -077, -082, -084, -085, -106, -112, -133, -137, -154, -155; GC-006 to -008 (accepted by Zeke "Yes, all 7"), GC-033, -034 (see F2), -056, -098, -107, -122 | 04-f (accepted list); 08-f |

### G. Test plan and tooling defects

| # | Gap | Requirement (guide line) | Entity | State | What is missing | Exact fix | Slice refs |
|---|---|---|---|---|---|---|---|
| G1 | First run after the deploy is a full update by design, but the run sheet and matrix B5 call it a fail | pkg L94, L1746 (MAPPING_VERSION) | Case, BCBA, BT/RBT | NY | Expectation | Rewrite R1-U1 "Before the first edit" and B5: the first run of each linked record sends every field once with the values CR holds (pass = CR GET shows 1990-01-15 / 1992-02-20, never 1980-07-04 / 1975-03-09), the second run is `noop` | 03-a20, 03-d1 (BCBA-105, -195); 04-d1 (BT-140); 02-a18 (CASE-199) |
| G2 | `check-cr-record.mjs` checks the create step only | all update rows | all | NY | Tooling | Add a `--step u1` expectation set (one per requirement ID), or a hand GET of `/contacts/{id}/labels` per push | 05-G11; 06-a10 |
| G3 | Matrix and BUILD-PLAN rows stale against items 9 and 10 | L363–L366 | Case | all | C12, C13, C15, C16 and section 9 / section 3 "IDs" still describe the deployed rules | Rewrite them with the C12 / C13 rewrite (A12, A14) | 01-d1, 01-d2 |
| G4 | `create-test-records.mjs` asks for `sandbox_test_field` on Contacts | L1231 | Contact | all | Tooling (harmless NOT FOUND line) | Drop it from the three Contact maps (:117, :131, :150) | 01 "Sandbox association read" |
| G5 | Matrix TL3 claims all six role labels are covered | L700 | BT/RBT | NJ | Matrix text | Fix with E3 | 04-d2; 06-a9 |
| G6 | `requirement-tests.json` maps few rows | — | all | — | Traceability only (tagged test titles are read by `check-requirements.mjs`) | Add the existing test names for C11–C15, BR6, BR16, BR17, BR18, the CL/BL/TL tags; mark K5 "live only" | 01-b3; 05-O2; 04-b4 |
| G7 | BR21 log scan was a pattern scan only | L1746, BR21 | all | — | Exact-value scan against the round JSONs (`AzT`, `AZT` markers, ZIPs, cities, Workday IDs) | Run the exact-value scan after R1-U1 | 07 TRG-281 ([R2]) |
| G8 | NM / VA steps have no script value or run-sheet line | L234 | BCBA, BT/RBT | NM, VA (deferred) | Run-sheet lines | Add BL3 (R2 BCBA: add New Mexico) and TL2 (R3 BT/RBT: add Virginia), expect warning `unmapped_work_state` and other labels unchanged | 06-a11 (LBL-008) |
| G9 | Where the new staffing tests go | — | Case | — | Test-plan choice | Question 37 [C] (was "Question 3", the slice's numbering) (R2 and R1-U1 for item 9/10 roles; R3 as the plain baseline) | 01 question 3 [Recency 11/24] CLOSED/decided 11/24: Decided as recommended (Q37, P25). |

### H. Offline tests to add

| # | Test | Requirement | Slice refs |
|---|---|---|---|
| H1 | A linked BCBA / BT/RBT in Resigned or Terminated keeps sending mapped changes and is never deactivated; each pipeline stage eligible, linked and unlinked; a linked Case in Paused still syncs | L401, L428, L322 | 01-b2; 04-b1; 03-b1; 02-b9 |
| H2 | Cross-target collision: a sandbox BCBA row typed 236 is not Outgoing BT 2; a production BT/RBT row typed 236 is not On Leave | L555, L998 | 01-b4 |
| H3 | A relationships-only change and its CR call count | L545 | 01-b5 |
| H4 | Item 5 tests; fix the negative tests that check the misspelt `…_addres`; a tagged `[C35]` test for `policy_holder_name` → 138090; archived "Prior" fields never requested | L373, L382, L391 | 02-b2, 02-b5, 02-b6, 02-b7 (02-b10: items 1 and 2 of that list are already done in the WT) |
| H5 | Item 2 and item 6 tests once decided | L382, L361 | 02-b3 [Recency 11/24] DONE: tests exist (P16). |
| H6 | BCBA pending-create window | row 3.15 | 03-b2 |
| H7 | Item 15 loops over both employee types | L745 | 03-b4 (checked: `stage7WorkdayIdFormat.test.mjs` `TYPES` holds BCBA; nothing to add) |
| H8 | Checklist values that are not ticks: BCBA `NPI`, `Billing Hold NY Medicaid Label`; BT/RBT "Medicaid ID Claim Settings" alone | L272, L840 | 03-b6; 04-b5 |
| H9 | An employee PUT never carries `ContactForm` | L337 | 04-b2 |
| H10 | Employee half of the `MAPPING_VERSION` rule | L1746 | 04-b6 |
| H11 | A `dealstage` change with unchanged `staffing_status` / `case_status` gives the same labels; no employee mapper outputs a staffing label | L633, L220 | 05-O3, 05-O4; 06-b2 |
| H12 | `MCD-CO` in the BL6 input (documentation-grade); a `waiting` record's label change still posts; RBT → BT and Yes → Grad Permit swaps through the sender | L691, L276 (2) | 06-b1, 06-b3, 06-b4 |
| H13 | Employee property lists never contain `entered_in_workday`, `entered_in_ucaba_payroll_system`, `entered_in_workday_by` | L272, L840 | 07-b1 |
| H14 | Referral Other + blank text → "Other" | L382 | 08-b1 [Recency 11/24] DONE: the test exists (`clientMetadataMapping.test.mjs:172-174`). |
| H15 | None possible or none needed (listed so nothing is lost): mapped label rules all tagged (05-O1); HubSpot-side triggers (07-b4, 08-b2); found by HubSpot record ID (07-b5) | — | 05-O1; 07-b4; 07-b5; 08-b2 |

### I. Documentation and guide-text gaps (no behaviour change)

| # | Gap | Guide line | Fix | Slice refs |
|---|---|---|---|---|
| I1 | Typed supplier vs insert E; Outgoing Supervising active or not; Outgoing BT "until a removal date passes" | L512 / L363; L552 vs L556; L561 / L365 | Write inserts E / E2 and X-20 (section 7) | 01-d3, 01-d4, 01-d5 |
| I2 | Record ID "not sent to any other CR field" vs the temporary External System ID | L433 vs L266, L270 | Guide note N-13 (section 7) | 04-d3 |
| I3 | `bt_rbt_type` "only BT or RBT" | L701 | Note: true for the visible production options; a hidden "BT to RBT" and its 1 record (BUILD-PLAN L291) are not ruled out; blank types get no role label | 04-d4 |
| I4 | Contradictions inside the guide (K1–K18) | 08 §5.3 | Pointers in section 7 | 08-d3 |
| I5 | Handoff "~22:30 UTC poller off" vs App Insights (ran to 04:40 UTC) | — | Documentation only (likely local time) | 07-d2 |
| I6 | Decision 51 vs observed sandbox behaviour (checklist tick sent no webhook) | L272, L420 | Covered by D3 | 03-d2 |

### J. Closed on 2026-11-24 (kept so nothing looks dropped)

| # | Item | How it closed | Slice refs |
|---|---|---|---|
| J1 | Production association labels and pipelines | Zeke's production read: all IDs match code and guide | 01-a9, 01-b1 (dropped: one Deal pipeline) |
| J2 | Unlabeled companions 164 / 187 on the R1 Case | Sandbox read: present; STF-046, STF-069 proven | 01-a15 |
| J3 | Round 2 associations | Sandbox read: correct (the 16:46 re-run used the fixed script); only a values refresh is needed | 01-d8 |
| J4 | Client label sender on linked runs | App Insights: CLB-114, CLB-116 proven (client, webhook, NY) | 05-G13 |

### K. [C] Added by the completeness check (gaps the master or the slices dropped)

Ranked as in groups A–I. K1 belongs with group A (wrong data in CentralReach); the rest are missing tests, test-plan defects or unverified facts. Every item names the slice text it comes from.

| # | Gap | Requirement (guide line) | Entity | State | What is missing | Exact fix | Slice refs |
|---|---|---|---|---|---|---|---|
| K1 | Section 4.1 dropped the R1 and R4 `--write` refresh and the poller-off order. The R1 BCBA `67036479540` (CR `5384531`) and R4 BCBA `67208227438` (CR `5385360`) still hold the old decoy `date_of_birth` = `1980-07-04`; once item 1 is deployed the code reads `date_of_birth`, so their first post-deploy run would send 1980-07-04 to CentralReach | L342; handoff "State at 2026-11-24" L49; round-1-log L178 | BCBA (and BT/RBT 1 Contact date) | NY | Setup steps | Deploy with the poller still **off** → plan run → `--write` for rounds 1, 2 and 4 → read-backs clean → poller on (Zeke's word). Never re-run a round while `655b385` is deployed and the poller is on. Fixed in 4.1 | handoff L49; RL L178 (not in any slice gap list) |
| K2 | Employee ID mismatch or malformed Workday ID must stop the label POST too; no row checks it | L276 (4)–(5) ("no update is sent"), L745 (item 15) | BCBA, BT/RBT | NY | Expected result on U-24, U-30, U-34: `crCalls` shows no `labelPost` and the CR label set is unchanged. Case half: R2-9 (GC-121) expects "label set unchanged" (CLB-156) | Add to those three rows and R2-9 | 06 "Completeness walk" (left to the identity slices, which did not take it); 05 CLB-156 |
| K3 | A credential label changed by HubSpot's own payor-status workflow (no hand edit) is not tested; the master dropped LBL-082 | L691, L416, L578, L824 | BCBA | NY | Live row; whether that workflow exists in sandbox 52311591 is unverified | R1-U1: change the payor-status source on the R1 BCBA and check NY Medicaid `1107647` follows (record `source`); if the workflow does not exist in the sandbox, accept offline and say so | 06 LBL-082 (MISSING-TEST), 06 "Could not verify" |
| K4 | Rows that the planned run cannot prove, because App Insights logs call kinds, not request bodies: CASE-003 (no `ContactForm` on a client update) and CASE-005 (`ExternalSystemId` on update only when found under the same CR ID) | L334 (BR22) | Case | NY | A proof method | Accept both as offline-only (tests exist: RP:165, `laneLClientCreatePath` :91, :157) and change their status, or log the PUT's key names (not values) in the run summary (a code change). Recommendation: accept offline | 02 "Could not verify" ([A] bullet), CASE-003, CASE-005 |
| K5 | Rows demoted from PROVEN-LIVE that no section-4 row re-proves: BT-016 (linked, CR holds `workday_id` → `success`: no run-summary line was kept) and BT-108 (`ContactForm` "Behavior Technician NY" on create: T1 Screen check skipped, matrix result blank) | L276 (4); L337 | BT/RBT | NY, then CO / NJ | Evidence | U-row: keep the R1-U1 Push 1 run-summary line for BT/RBT 1 (`success`, CR holds 4837593); R2-3 / R3-6: do the T1 Screen check (or record the label set the form produced) | 04 corrections (BT-016, BT-108) |
| K6 | A Contact state change reaching the client state label: the Case `location` is calculated, so whether its recalculation moves `hs_lastmodifieddate` (poller path) is unverified, and whether a Case trigger or the sweep carries it is the P1 check (the Contact webhook path is not needed) | L385, L664, L391 (CLB-069) | Case (via Guardian Contact) | NY → NJ | Path proof | R1-U1 Push 5 (RS 70-71): record the first run's `source` and the delay; no run within one poll cycle means the path is a Case trigger-list gap for Zeke (not O-21) | 05 CLB-069, 05 R-A3, 05 "Could not verify" |
| K7 | The deploy order "deploy while the app is stopped" is not in section 6.2 | L284 (TRG-093) | all | — | Azure step | Fixed in 6.2 step 1 | 07 TRG-093 |
| K8 | While question 25 is open (decision 39 stands), the sandbox Case refresh trigger list must include the three item-6 properties, or the C10 change arrives only by poll | L392; pkg D14 | Case | NY | Trigger check | Add `care_coordinator_name` to the D2 `source` check list | 07 TRG-222 [Recency 11/24] Triggers must include the three item-6 properties (`care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`), not `care_coordinator_name` (P16). |
| K9 | Production blank role type: 4,654 BT/RBTs have a blank `bt_rbt_type` (state labels only, no role label, no warning); how many are linked or Entered = Yes was not read; whether a hidden "BT to RBT" option still holds 1 record is not shown (the read prints visible options only) | L701, L440 | BT/RBT | production | One read-only production count before cutover | Count blank-type BT/RBTs with Entered = Yes or `employee_id` known; add them to the D19 existing-records review. [C] Second pass: the count **was** read, in production on 2026-11-20: "no type 4,630, of which 17 have Entered in CentralReach = Yes and none is linked" (BUILD-PLAN L291). The behaviour is decided: decision 35 (BUILD-PLAN L174; O-36, "Zeke 2026-11-20") manages no role label for a blank type, and leaves any role label the person already holds. Production showed 4,654 blank on 11/24, 24 more than on 11/20; the Entered = Yes count was not re-read. Under Zeke's two-phase ruling (handoff L10) these existing records are phase 2 (that reading is the orchestrator's, not his words). A new BT/RBT with a blank type created in phase 1 gets state labels only, by decision 35. A fresh count is optional, and no question is needed | 04 and 06 "Still unverified" / "Could not verify" |
| K10 | Unlabeled association types (sandbox 164 / 187) are proven only beside a role label; a link by the unlabeled type alone was never run | L549, L1001 | Case | NY | Optional live check | Link a staff record to a test Case by 164 or 187 only → expect `noop` | 01 "Independent review of the live-read edits" |
| K11 | Merged rows hide a second requirement: API-004 to API-011 ("requested", proven) also carry "a missing key is a failed read" (offline only) | L473–L479 | all | — | Visibility | Treat the failed-read half as offline-only (accept it with the Appendix C rows); a live row would need a property removed | 01 "Completeness walk" |
| K12 | Whether the R1 / R4 CentralReach test records are still active is unknown (no CR call); F16's clean-up and `sandbox-test-log.md` depend on it | L212 (TRG-016) | Case, BCBA, BT/RBT | NY | Fact | Zeke checks on the CR screen when he fills `sandbox-test-log.md` (02-a20) | 07 TRG-016, 07 "Not verified" |
| K13 | No per-row output of `check-cr-record.mjs` is saved, so a "pass" rests on the matrix cell and the run total | all CR-check rows | all | all | Evidence keeping | Save each check run's per-row PASS / FAIL / SKIP lines in the round log (with G2's `--step u1`) | 02, 03, 08 "Could not verify" |
| K14 | Five MISSING-TEST rows had no explicit gap reference in sections 3–11 | — | — | — | References | OBJ-022 → D14 (stage IDs used by the stage-move rows); CASE-162 → H4; CLB-040 → H11; CLB-151 → E4 (G1 blank removal); TRG-124 → H15. LBL-082 → K3 | slices 01, 02, 05, 07 |
| K15 [C] | The Colorado contact form `RBT CO` would never run live if question 14 takes slice 06's route as the master words it. R2 BT/RBT 1 is the only planned Colorado-only BT/RBT (LBL-067, BT-109, R2-26). Deployed `getEmployeeContactForm` (`655b385` `src/lib/centralReachClient.mjs:38-49`) picks `RBT CO` only when the Work States hold CO and not NY. If R2 BT/RBT 1 is created as `Colorado;New York` (R2-20), it gets `Behavior Technician NY`. The form is create-only (O-47), so a later edit does not bring `RBT CO` back | L337; BP decision 17 | BT/RBT | CO | A row that keeps the CO-only create | Create R2 BT/RBT 1 as **Colorado only** (proves `RBT CO`, the labels it sets, and TL3 BT CO). Prove the two-state BT rule (LBL-058) as an **R2-U1 step** to `Colorado;New York`, which is the alternative slice 06 row 2 already offers. Fixed in R2-20 and question 14 | 04 BT-109; 06 LBL-067, 06-a2; second-pass code read |
| K16 [C] | Zeke's ruling "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production" (handoff L9) has no cutover check. (1) Sandbox workflows and lists carry sandbox identifiers: the test lists 1463–1465, the `sandbox_test_field` gate, object types `2-72890322` / `2-72890325`, the SCURRENT association IDs and the sandbox webhook secret. Guide L1237 says "sandbox identifiers must not be assumed portable". (2) What does not exist in the sandbox is not carried over: the Contact change workflow (not needed for the Guardian fields, R02: the Case trigger list carries them), the failures reports, the waiting view and the 24-hour report (N6: not created in the sandbox either), and the production gate segments (D18 c), which are not the sandbox test lists. (3) The production-only gaps B1 (gate properties; they exist in the sandbox, handoff L69) and B3 (`referral_other`, the coordinator fields; whether they exist in the sandbox was not read) now close by that deployment | L392, L420, L442, L455, L1237; pkg D18 c | all | production | A cutover check list | Add to 4.10: after the deployment, compare each deployed workflow's enrolment, re-enrolment triggers, filters and webhook target against the production IDs. No sandbox list, `sandbox_test_field` or sandbox object type may remain. Check the Case triggers above and build the reports **in the sandbox first** so the rule carries them. Then read the production property definitions (names, types, options) against the sandbox. Group B | handoff L9; 07 TRG-284; 02 CASE-167, -168; 08 GC-125 [Recency 11/24] Check that the Case triggers include the four Guardian properties (`guardian_first_name`, `guardian_last_name`, `email`, `phone`) and `location`; no Contact workflow is needed for them (R02). |
| K17 [C] | Zeke's two-phase ruling (handoff L10, verbatim: "Production will push in two phases: 1. Create records only. 2. Review of existing records in HubSpot against the existing records in CentralReach. ... Any production discrepancies found between HubSpot and CentralReach are a phase two production build.") is not applied to the gap list | L252, L276, L280, L502; pkg D18, D19 | all | production | Phase tags | **Phase 2:** A1 (existing-record duplicates), K9 (existing blank-type BT/RBTs), C22 (BCBA label 1107647), question 17 (Case Stage sublabels), GC-072 (2 bad Client IDs), L276's Client-ID check (now 487 of 489), L280's six hand-linked BT/RBTs, L252's up to 264 checklist ticks, and L502's 122 linked Cases without the box (they get no update until phase 2 ticks them). **Still phase 1:** A16 (Grad Permit data on existing BCBAs), because a **new** Case linked to one of those BCBAs reads that BCBA's licence and 151 / 135 links for 131308 / 136052. The phase-1 E2E does not test the existing-records phase; those rows stay PENDING | handoff L9–L10; 01-e3; 04 BT-036; 07 TRG-023, -063, -072 |
| K18 [C] | Guide L739 (G10, outside the three ranges walked): "2 cases and 9 cases have data only in the clinical field". The integration reads only the main Comorbid / Maladaptive fields (CASE-135, L375, L524–L525), so those clients reach CentralReach without that data until United Care finishes the merge | L739; L375 | Case | production | Data fix (United Care) | Add to the United Care list (C14): finish the merge for the 11 Cases. No build change and no sandbox row | 02 CASE-135; guide L739 |

---

## 4. Sandbox test rows to add

Grouped by round. Each row proves one requirement and names the path. "Both" means run with the webhook and the poller on and record the `source` of the first run (`hubspotWorkflow` or `intakePoller`); a row marked "poller" needs the poller on and no webhook for that field; "webhook" needs the entry or refresh workflow to fire. Matrix and run-sheet fixes come first, because several existing rows would fail on correct behaviour.

### 4.0 Matrix and run-sheet fixes before any round

| Fix | Requirement it protects | Slice refs |
|---|---|---|
| Write the D18 g gate rows (BR4-C, BR4-CU, BR4-UC, BR4-X 1–2, BR4-U+L) into the matrix | L280, L282 | 07-a2; 08-a1 |
| Rewrite C10 , C12, C13, C15, C16, C19, C24, C26 / C28 , C31 to the new expected values; update `check-cr-record.mjs` C12, C19, C31 | L363–L380, L509–L530 | 01-a6, 01-d1; 02-a1, 02-a6, 02-a7, 02-a8, 02-a11; 08-a6 [Recency 11/24] Add the C10 `ready` and not-ready rows now (provable, P16, P31); the "after item 6" / "after un-hold" conditions are dropped (P19). |
| R1-U1 "Before the first edit" and B5: full update once after the deploy, then `noop` | pkg L94 | 03-a20; 04-d1; 02-a18 |
| R1-U1 line 19: BCBA Entered `Yes` → blank (not `No`) | L322 | 03-a1 |
| R1-U2: core client fields "kept", not "cleared"; metadata clears only integration-written values | L346 | 02-a10, 02-a23; 08-a7 |
| BR6: per path (poll → not queued; webhook → `skipped`) | L322 | 07-a15 |
| BR11: lift the "held" note | L278 | 03 question 3; 04-a5 |
| TL3: remove "all six role labels are covered" | L700 | 06-a9; 04-d2 |
| BR3 Result cell: fill from R1 log L114-115, L458 | BR3 | 08-a13 |
| Add a "first-run source" column to every R1-U1 label and field line | L392, L420, L442 | 06-a8; 02-a15 |
| Add the missing R1-U1 lines (BR7, BR13, BR14, BR15, BR17, BR18, BR21, BR4; BT-132, BT-032, BT-056, BT-057) | GBR L322 | 07-a16; 04-a10 |
| `check-cr-record.mjs --step u1`; drop `sandbox_test_field` from Contact maps | — | 05-G11; 06-a10; 01 (sandbox read) |

### 4.1 Before the re-test (setup; not requirement rows)

1. Deploy the pending build (Zeke's word) **with the poller still off** [C]. 2. [C] Plan run, then `--write` for rounds **1, 2 and 4** (not only R2: the R1 and R4 BCBAs hold the old decoy `date_of_birth` 1980-07-04, which the deployed item 1 would send to CR; handoff L49, round-1-log L178; gap K1), read-backs clean, then the association read again. Never re-run a round while `655b385` is deployed and the poller is on. 3. Create R3 records. 4. Turn the poller on (Zeke's word) and read the setting back (01-a14). [C] Before R1-U1 Push 1, the run-sheet hand-adds on client 5384589 (School 1052688, Pending 97151 Services 1156742; round-1-log L181) must be done, because a `noop` run never touches labels. 5. Fill `sandbox-test-log.md` for R1 (02-a20). 6. Read the link properties now (07-a21, read-only).

### 4.2 R1 refresh, New York (first runs after the deploy)

| Row | Proves (one requirement) | Entity | Path |
|---|---|---|---|
| R1F-1 | MAPPING_VERSION bump: one full update per linked record, then `noop` (pkg L94) | Case, BCBA, BT/RBT | poller |
| R1F-2 | Supervising BCBA 131308 = "Zeke Swanson BCBA Azure Test R1 BCBA LBA", 136052 blank (L363) | Case | poller |
| R1F-3 | BCBA `date_of_birth` `1/15/1990` → CR 1990-01-15; never 1980-07-04 / 1975-03-09 (L342) | BCBA | poller |
| R1F-4 | BT/RBT Contact `date_of_birth` `2/20/1992` → CR 1992-02-20 (L342) | BT/RBT | poller |

### 4.3 R1-U1, New York (update round; webhook and poller both on)

| Row | Proves (one requirement) | Entity | Path |
|---|---|---|---|
| U-01 | A Case mapped-field edit sends a refresh webhook (L392) | Case | webhook |
| U-02 | A BT/RBT mapped-field edit sends a refresh webhook (L442) | BT/RBT | webhook |
| U-03 | A BCBA mapped-field edit other than `workday_id` sends a webhook (L420; optional) | BCBA | webhook |
| U-04 | Edit the Guardian Contact (`firstname`, `lastname`, `email`, `phone`, one at a time): the Case sync property changes and the Case workflow sends the webhook (or the poll queues the Case); one Case run, no BCBA run; record `source` | Contact | both |
| U-04a | Edit the Guardian Contact's `email` and `phone`, then `firstname` and `lastname`, one at a time (K1/K2): each changes the Case sync property; record the run `source` (`hubspotWorkflow` or `intakePoller`) and the delay; CR shows the new value [Recency 11/24, R01] | Case | both |
| U-05 | A Case mapped-field update arrives by the poller (L322) | Case | poller |
| U-06 | A Primary BT label change moves `current_primary_bt` and sends a Deal webhook; 131313 updated (L545) | Case | webhook |
| U-07 | Outgoing BT 1 (244) only → 131313 holds that BT (item 10) | Case | poller |
| U-08 | Outgoing BT 2 (236) → 138092 (item 10) | Case | poller |
| U-09 | One BT on both 238 and 244 is named once (item 10) | Case | poller |
| U-10 | Outgoing Supervising (253) only → 131308 + suffix (item 10) | Case | poller |
| U-11 | Outgoing SUB (221) only → 131308; removing 221 changes 131308 in one run (item 10, BR17) | Case | poller |
| U-12 | SUB (217) + On Leave (233), no 247 → SUB name; On Leave never (item 10) | Case | poller |
| U-13 | Two BTs on 236 → "A, B" in record-ID order (STF-053) | Case | poller |
| U-14 | Typed-supplier fallback after removing 247 (L512) | Case | poller [Recency 11/24] Add the step: a blank typed supplier -> 131308 untouched (not cleared) (P20). |
| U-15 | Association-only change reaches CR by the sweep; record the delay (L545) | Case | poller (sweep) |
| U-16 | Case moved to Paused: staffing label off, In-Active on, NY Client kept (CLB-014, -030) | Case | both |
| U-17 | Warm → Cold keeps NY Client (CLB-064; add to line 54) | Case | poller |
| U-18 | BR5 Case update with Entered blank changes `specific_home_location`; label follows (CLB-152) | Case | poller |
| U-19 | Stage move to Cold: mapped update still reaches CR (CASE-206) | Case | both |
| U-20 | Insurance Card linked update with other options only (CASE-024) | Case | poller |
| U-21 | One edit per label source property, first-run `source` recorded (LBL-077, CLB-130) | Case, BCBA, BT/RBT | both |
| U-22 | `assign_states` Assign NY;Assign NJ → Assign NY removes BCBA LBA NJ (LBL-019) | BCBA | both |
| U-23 | BCBA Entered blank, mapped change → update sent (BR5; line 19 fixed) | BCBA | poller |
| U-24 | BCBA `workday_id` → other 7 digits → `error` WORKDAY_ID_MISMATCH, no `labelPost`, CR label set unchanged [C K2], then restore (BR8) | BCBA | both |
| U-25 | BCBA checklist ticked with `workday_id` blank → `error` CHECKLIST_BLANK_WORKDAY, update sent (L276) | BCBA | poller |
| U-26 | Second BCBA with 0498374, Entered = Yes → `error`, no CR call (BR11) | BCBA | webhook |
| U-27 | BCBA Contact `address` change reaches CR (L455) | BCBA | poller |
| U-28 | BCBA moved to Terminated, one field changed → update, no deactivation (L401) | BCBA | poller |
| U-29 | BR7 for the BCBA in a numbered push | BCBA | both |
| U-30 | BT/RBT 1 `workday_id` → other 7 digits → `error`, no `labelPost` [C K2], then restore (BR8) | BT/RBT | both |
| U-31 | BT/RBT 1 `workday_id` blank + checklist ticked → `error` CHECKLIST_BLANK_WORKDAY | BT/RBT | poller |
| U-32 | Second BT/RBT with 4837593, Entered = Yes → `error`, no CR call (BR11) | BT/RBT | webhook |
| U-33 | BT/RBT 1 Contact `phone`, `zip`, `state_dropdown`, `date_of_birth` reach CR (K5) | BT/RBT | both |
| U-34 | 6-digit `workday_id` → `error`, no CR call, labels included [C K2] (item 15) | BT/RBT | poller |
| U-35 | BT/RBT 1 to Terminated, one field changed → update, nothing deactivated (L428) | BT/RBT | poller |
| U-36 | Every BT/RBT mapped field not yet in an update line, one at a time (BT-150) | BT/RBT | poller |
| U-37 | `workday_id` cleared, checklist unticked → `success` (BT-022) | BT/RBT | poller |
| U-38 | Entered cleared, field changed → update sent (BT-058) | BT/RBT | poller |
| U-39 | Contact `phone` `12345` → `error` "Unreadable value: employee_phone" (BT-075) | BT/RBT | poller |
| U-40 | BT/RBT failures report and waiting view list the record (BT-153) | BT/RBT | n/a (HubSpot read) |
| U-41 | Entry value stated on label pushes (LBL-081) | BCBA, BT/RBT | poller |
| U-42 | BR13: property history shows only write-list properties changed (TRG-331) | all | both |
| U-43 | BR14, BR15, BR17, BR18 (5 AM / 1 PM flip), BR21 exact-value scan | all | both |
| U-44 | A by-hand BT/RBT with `employee_id` `5384530x` → `error` (BT-031) | BT/RBT | webhook |
| U-45 | Gate-blank record sends no webhook and is not queued by poll or sweep (BR4) | BT/RBT | both |
| U-46 [C] | Payor-status workflow changes `ny_insurance_labels` (no hand edit) → NY Medicaid `1107647` follows (LBL-082; K3) | BCBA | both (record `source`) |
| U-47 [C] | BT/RBT 1 linked run ends `success` with CR holding 4837593, run-summary line kept (BT-016; K5) | BT/RBT | both |
| U-48 [C] | Guardian Contact state change → Case `location` → client state label; record `source` and delay (CLB-069; K6) | Case via Contact | both |

### 4.4 R1-U2, New York (blank round)

| Row | Proves | Entity | Path |
|---|---|---|---|
| U2-1 | 11 core client fields kept; `dateOfBirth`, `gender`, `stateProvince` round-trip unchanged (B21) | Case | poller |
| U2-2 | Metadata blank clears only values the integration wrote (CASE-207) | Case | poller |
| U2-3 | BCBA blank `email` → CR keeps its primary email (BCBA-104) | BCBA | poller |
| U2-4 | BCBA blank `date_of_birth` on update (question 27 decided: option (a)) | BCBA | poller [Recency 11/24] Expected: CR keeps its held date, rebuilt `...T00:00:00.000Z`, never 2000-01-01. |

### 4.5 R-WD / round 4, New York

| Row | Proves | Entity | Path |
|---|---|---|---|
| WD-1 | Step 5: untick → `waiting` (BCBA-035) | BCBA | both (records whether the checklist triggers a webhook) |
| WD-2 | Step 6: `medicaid_id__ny` changed while `waiting` → update sent, `waiting` kept (BCBA-026) | BCBA | poller |
| WD-3 | `cr_billing_hold_label` = Yes while `waiting` → Billing Hold added (LBL-075) | BCBA | poller |
| WD-4 | BT/RBT `workday_id` edit sends a webhook (TRG-035) | BT/RBT | webhook |
| WD-5 | Daily sweep re-checks an unlinked `waiting` record (TRG-051) | BT/RBT or BCBA | sweep |

### 4.6 Gate set (D18 g), any state (suggested with the R2 records), after the deploy, with the two temporary settings

| Row | Proves | Entity | Path |
|---|---|---|---|
| G-1 | BR4-C: creates box ticked, no CR ID → created | BT/RBT | webhook |
| G-2 | BR4-CU: updates box ticked after create → next run updates | BT/RBT | poller |
| G-3 | BR4-UC: updates box only, no CR ID → `skipped` `record_gate` `gate: create` | BT/RBT | poller |
| G-4 | BR4-X step 1: a record with neither box gets nothing | Case | both |
| G-5 | BR4-X step 2: Guardian `firstname` edit changes `guardian_first_name`; the Case workflow sends the webhook; the gate stops the run (`skipped` `record_gate`, `crCalls` empty) | Case | both |
| G-6 | BR4-U+L: linked, updates box ticked → update | Case | webhook |
| G-7 | BR4-U+L second edit after unticking updates → stopped (L810 latch no longer holds) | Case | webhook |
| G-8 | BR4-UC-BCBA (question 11 decided: required): BCBA skip, `gate: create`, no CR call | BCBA | both [Recency 11/24] Required (Q11, P25). |
| G-9 | Create left with labels unconfirmed: retry `skipped` `gate: update`, then confirmed after the BR4-CU tick (LBL-085) | BT/RBT | webhook then poller |

### 4.7 R2, Colorado

| Row | Proves | Entity | Path |
|---|---|---|---|
| R2-1 | Case create in CO (entry gate; CO Client `1132648`; In-Active for Cold) | Case | webhook |
| R2-2 | BCBA create in CO with a 7-digit `workday_id` filled → External System ID = Workday ID | BCBA | webhook |
| R2-3 | BT/RBT create in CO by the poll's Entered = Yes branch (entry workflow off) | BT/RBT | poller |
| R2-4 | Case with a non-holder on 247 → "First Last BCBA LBA" (CO normal 131308 path) | Case | webhook |
| R2-5 | Grad Permit holder → 136052 "… Grad Permit Holder", 131308 from 227 | Case + BCBA | poller |
| R2-6 | Holder with no 227 link → 131308 left out, warning | Case | poller |
| R2-7 | Licence leaves Grad Permit → 136052 cleared (Case edit) | Case | poller |
| R2-8 | Previous IA (235), Potential BT 2 (218) → no change | Case | webhook |
| R2-9 | Wrong Client ID → ID mismatch stop, no write, CR label set unchanged [C K2; CLB-156] (GC-121) | Case | webhook |
| R2-10 | Staffing 97151 Services → Staffed 97153: one POST, `1156743` off, `1156746` on (CLB-029) | Case | poller |
| R2-11 | Cold → Warm: `1121488` off, `1125427` on, CO Client kept (CLB-012) | Case | poller |
| R2-12 | Cleanup stages skipped, per path (BR6) | Case | both |
| R2-13 | Linked Case to Paused / Discharged still updates, label follows | Case | both |
| R2-14 | BT/RBT temporary ID: 7-digit `workday_id` → `waiting` "Replace…"; field change while waiting; tick → CHECKLIST_STILL_TEMPORARY; untick → `waiting` | BT/RBT | webhook (workday_id), poller (checklist) |
| R2-15 | `active_cases_count` "0" for a Cold Case (question 13 decided) | BT/RBT | both |
| R2-16 | Item 12: first label retry ≥150 s | any | webhook + queue retry |
| R2-17 | Referral Other + text / blank (item 2 is built; sandbox deploy now) | Case | poller |
| R2-18 | Insurance Card `CDE;Yes` create | Case | webhook |
| R2-19 | Physician pair "Medicaid FFS - CO" in "`<name> <npi>`" form; service address Other Location with `service__stateregion_2` | Case | webhook |
| R2-20 | BT/RBT 1 `Colorado;New York` → BT CO + BT NY, CO + NY Employee (question 14 decided: the 06 route). [C] Do this as an **R2-U1 step after a Colorado-only create**, not at create: a CO + NY create gets form `Behavior Technician NY`, and then no round proves `RBT CO` (K15) | BT/RBT | poller (U1 step) |
| R2-21 | Licence Grad Permit → Yes swap (optional) | BCBA | poller |
| R2-22 | BL3: add New Mexico → no label, warning `unmapped_work_state` (deferred behaviour) | BCBA | poller |
| R2-23 | One update push per entity by webhook, one by poller only (state coverage) | all | both |
| R2-24 | 1 PM Eastern flip on a CO Case (optional) | Case | poller |
| R2-25 | Read back `central_reach_record_link`, `last_sync_at`, `updated_by_integration`, `last_sync_hash` on the BCBA | BCBA | webhook |
| R2-26 [C] | T1 Screen check: the labels the BT/RBT `ContactForm` set on create (BT-108; K5); same on R3-6 | BT/RBT | webhook |

### 4.8 R3, New Jersey

| Row | Proves | Entity | Path |
|---|---|---|---|
| R3-1 | Case create in NJ (NJ Client `1132647`, Active, X 97153, More Than One Location address) | Case | webhook [Recency 11/24] Add the R3 More Than One Location junk Address 2 step: `",  , New Jersey "` -> 138091 blank (C25, P15). |
| R3-2 | Case create by the poller (Entered = Yes with the workflow off) | Case | poller |
| R3-3 | BCBA create with the temporary ID and the placeholder date of birth (blank) | BCBA | webhook |
| R3-4 | BCBA create picked up by the poller only | BCBA | poller |
| R3-5 | BCBA create with blank `email` → `error`, no CR call | BCBA | webhook |
| R3-6 | BT NJ 1132652 + NJ-only form clean-up (question 14 decided: the 06 route) | BT/RBT | webhook then one poll |
| R3-7 | R3-U1: BT → RBT, New Jersey;New York → RBT NJ + RBT NY (question 14 decided: the 06 route) | BT/RBT | poller |
| R3-8 | `active_cases_count` "1" (Primary BT 1 on a Warm Case), then Warm → Cold → "0" by the poller (BT-151) | BT/RBT | poller |
| R3-9 | BT/RBT update with a blank date of birth (question 27 decided: option (a)) | BT/RBT | poller [Recency 11/24] Expected: the update sends back CR's held date rebuilt `...T00:00:00.000Z` (2000-01-01 for R3), never a clear. |
| R3-10 | Supervising BCBA rule as R1; typed-supplier fallback on a Case without 247 | Case | webhook |
| R3-11 | "Yes; Insurance Card(s)" create | Case | both |
| R3-12 | TL2: add Virginia → no label, warning (deferred behaviour) | BT/RBT | poller |
| R3-13 | One update push per entity by webhook, one by poller only | all | both |
| R3-14 | ZIP 07103 keeps its leading zero; phone `(973) 555-NN04`; `stateProvince` NJ | BCBA, BT/RBT | webhook |

### 4.9 Stage 8 (poller and sweep, retries and alert, hourly), any state

| Row | Proves | Entity | Path |
|---|---|---|---|
| S8-1 | First 08:00 UTC sweep re-checks linked records (`source: dailySweep`) | BCBA, BT/RBT, Case | sweep |
| S8-2 | A label change caught by the sweep alone | Case or employee | sweep |
| S8-3 | Forced temporary failure walks every retry step to dead-letter and the alert email arrives | BT/RBT | webhook start |
| S8-4 | One round at the hourly schedule | any | poller |

### 4.10 Production cutover checks (read-only; not sandbox rows)

Link-property history (only the integration fills the three link properties; pkg D18 c); production Case workflow triggers on the five staffing signals (STF-087) and the coordinator fields (pkg D14); production BCBA workflow includes the checklist (BCBA-027, -163); first production run per object type routes correctly (BT-156); production association limits (SBX-004); gate properties and segments exist (B1). [C] Sandbox-to-production deployment (Zeke, handoff L9; K16): every deployed property matches its sandbox name, type and options. Every deployed workflow, list and report uses production IDs (no list 1463–1465, no `sandbox_test_field`, no `2-72890322` / `2-72890325`, production association IDs, production webhook secret). The Case trigger lists include the four Guardian properties and `location`, and the reports exist, because they are built in the sandbox first. Tag every check phase 1 or phase 2 (K17).

---

## 5. Build items to add or change before the final build

### 5.1 New (not in the build package)

| # | Item | Guide line | Why | Slice refs |
|---|---|---|---|---|
| N1 | Make the mixed-holder code match the package (leave 131308 and 136052 out, warning `grad_permit_mixed_supervising_bcba`), or change the package to "held as deployed", (done: question 26 answered) | L364, L513 | Code and package disagree today | 01-d6; 02-d1; 08 GC-050 [Recency 11/24] CLOSED: rule 7 built (P17). |
| N2 | Blank typed supplier: leave 131308 out (insert E) or keep the clear, per O-58 | L363, L512 | Code and approved insert disagree | 08-d2 [Recency 11/24] CLOSED: a blank supplier sends nothing (P20); the code matches insert E. |
| N3 | When building item 20, keep `CR_LABEL_POST_UNCONFIRMED` on the full retry schedule | L1730, L1736 | A sweep run unconfirmed twice would dead-letter | 05 question 5 |
| N4 | A log alert on "Intake poller failed" (Azure) | L1732 | A poller that fails every run alerts nobody today | 07 question 2 |
| N5 | An email receiver on `uca-sync-deadletter-owners` (Azure) | L1732 | The alert reaches the subscription Owner role only | 07-c5, question 6 |
| N6 | HubSpot failures reports (Case, BCBA, BT/RBT), waiting view, 24-hour report (HubSpot, sandbox and production) | L274, L834, L1732 | Not created | 07-c4 (TRG-168 to -170) |
| N7 | Stale comments: `buildEmployeePayload.mjs:125` and the S5EM comment say production has "BT to RBT"; NM/VA "no HubSpot value yet" (`centralReach.mjs:22-23`, `buildEmployeePayload.mjs:87-88`) | L701, L234 | Misleading; no behaviour effect (NM/VA part already in package item 11) | 04-d4; 06-c2 |
| N8 | Test tooling: `check-cr-record.mjs --step u1` and the C12/C13/C15/C16/C19/C24/C31 expectations; drop `sandbox_test_field` from Contact maps; NM/VA script values; R2 BCBA `workday_id`; R3 BT/RBT type (question 14 decided: the 06 route) | — | Tests only for requirements | 05-G11; 06-a10, 06-a11; 01; 03-a2 |
| N9 | Offline tests H1–H14 (section 3 H) | various | Requirement coverage | section 3 H |
| N10 | `requirement-tests.json` traceability entries | — | Traceability | 01-b3; 05-O2 |

### 5.2 Already in the build package (for reference; status per the slices)

| Item | Guide line | State |
|---|---|---|
| 14 + 24 production guard and two-property gate | L280, L282 | In the WT; not deployed |
| 1 BCBA `date_of_birth`, 16 BT/RBT date of birth as text | L342 | In the WT; item 1's update-with-blank half decided (option (a)), built |
| 4 physician / NPI, 7 availability (with one `MAPPING_VERSION` bump) | L380, L369 | In the WT |
| 9 Grad Permit and Supervising BCBA, 10 Outgoing / SUB / On Leave / 288 | L363–L366, L552–L561 | In the WT; rule 7 built [Recency 11/24] Built (P17). |
| 5 service address and state fallback | L360, L373 | In the WT (reviewer read) |
| B21 blank core client field never clears CR | L346 | In the WT; R1-U2 must pass before production |
| 15 Workday 7-digit check | L745 | In the WT |
| 12 label retry 150 s; 18 gate tests | L1736 | In the WT |
| 2 Referral "Other" text; 6 Care Coordinator | L382; L361 | Built; production deploy waits for the properties; question 25 for 138851 today [Recency 11/24] Built (P16); production deploy waits for the properties. |
| 3 Allergies, 8 Severity | L374, L377 | Built (un-held) [Recency 11/24] Built, un-held (P19). |
| 13 one JSON line per log call | — | Awaiting Zeke (question 17) |
| 19, 20 before cutover; 21, 22 before phase 2 | L1730 | Not built |
| 11 NM/VA labels | L234 | Deferred |
| 17 Maladaptive ", "; 23 B21 read replaces the lookup | L376; L276 | Dropped |

---

## 6. Azure

Read-only review of 2026-11-24 (slice 07 section 2, confirmed by its independent review; no Azure call by this master).

### 6.1 Current state

| Item | State |
|---|---|
| Function App `centralreachserverless` (resource group `centralreachintegration`) | Running, Flex Consumption, Linux, Node 22, East US 2; host matches the guide's webhook URL (L1202, L1720) |
| Functions | `hubspotWebhook`, `processClientQueue`, `processEmployeeQueue` enabled; `intakePoller` **disabled** (`AzureWebJobs.intakePoller.Disabled=true`); three test functions disabled |
| Poller schedule | `INTAKE_POLLER_SCHEDULE` = `0 */5 * * * *` (every 5 minutes for testing) |
| Gate settings | `SYNC_RECORD_GATE_PROPERTY` = `sandbox_test_field`; `SYNC_CREATE_GATE_PROPERTY` / `SYNC_UPDATE_GATE_PROPERTY` absent (correct today); `INCLUDE_TEST_RECORDS` absent |
| Employee creates | `ALLOW_EMPLOYEE_CREATE` = `true` (D18 g pre-check done) |
| Portal and object types | `HUBSPOT_PORTAL_ID` sandbox; `HS_BCBA_OBJECT_TYPE_ID` / `HS_BT_RBT_OBJECT_TYPE_ID` hold the sandbox types |
| Retired settings still present | `DEDUPE_TTL_SECONDS`, `HUBSPOT_WEBHOOK_COALESCE_SECONDS`, `MAX_BCBA_PER_RUN`, `MAX_BT_RBT_PER_RUN`, `MAX_DEALS_PER_RUN`, `STATE_PROVIDER`, `STATE_TTL_ATTR` (harmless) |
| Service Bus `ucr-hs-cr-sb-prod` | `client-sync-queue` (10 deliveries, 14-day TTL, duplicate detection 10 min) and `employee-sync-queue` (no duplicate detection) in use; 0 active / 0 dead-letter; `bcba-sync-queue`, `rtbt-sync-queue` unused |
| Cosmos `ucr-hs-cr-cosmos-prod` / `hs-cr-sync` / `sync-state` | Default TTL 30 days; link records, checkpoints and the sweep marker never expire; keys start with the portal ID |
| Alerts | `uca-sync-deadletter-above-zero` enabled; action group has **0 email receivers** (Owner role only); no log alert for a failing poller or the CR call count |
| App Insights | Sampling off; BR21 pattern scan clean (0 hits), exact-value scan not run; KQL must be passed with `--analytics-query @<file>` (inline quotes are stripped; `kind`, `n`, `first`, `last` are keywords) |

### 6.2 Changes before the final sandbox end-to-end run (each needs Zeke's go-ahead)

1. Deploy the pending build after it is committed, **while the app is stopped** (guide L284; TRG-093) [C], with the poller still off until the `--write` refreshes of section 4.1 step 2 are done.
2. Turn the poller on (`AzureWebJobs.intakePoller.Disabled=false`) and keep the 5-minute schedule until the last round.
3. For the D18 g gate set only: set `SYNC_CREATE_GATE_PROPERTY=centralreach_creates_only` and `SYNC_UPDATE_GATE_PROPERTY=centralreach_updates_only`, then remove both.
4. Add an email receiver (Danny or a shared inbox) to `uca-sync-deadletter-owners` before the retry / dead-letter test.
5. Last sandbox round: remove `INTAKE_POLLER_SCHEDULE` (hourly) for one round.

### 6.3 Changes at cutover (each needs Zeke's go-ahead)

1. `HUBSPOT_PORTAL_ID` = 50317927; production token and webhook secret (Zeke enters them); `HUBSPOT_WEBHOOK_URI` = the production endpoint.
2. Remove `HS_BCBA_OBJECT_TYPE_ID` / `HS_BT_RBT_OBJECT_TYPE_ID`, or set `2-48354212` / `2-48354559` (otherwise every run is invalid configuration).
3. After the six production gate properties exist: set the two gate settings permanently; remove `SYNC_RECORD_GATE_PROPERTY` (never `none`); keep `INCLUDE_TEST_RECORDS` absent.
4. Remove `INTAKE_POLLER_SCHEDULE` (production polls hourly).
5. `ALLOW_EMPLOYEE_CREATE` / `PUT_ONLY_MODE` per the go-live step (BUILD-PLAN 9.8).
6. Remove the seven retired settings (leave the two unused queues; note them in the runbook).
7. Keep sampling off while item 19 counts calls; add the item 19 alert and the poller-failure alert.
8. Purge both dead-letter queues and confirm 0 active / 0 scheduled before the switch.
9. Open: whether production reuses these "-prod" resources (RG E6).

---

## 7. Guide updates

Insert-only texts for the 11/23 and 11/24 decisions. The full proposed wording of every X-row is in `08-guide-currency.md` section 5.1 (not repeated here); the rows below say where each goes and add the items other slices raised that slice 08 does not cover. [C] The guide batch waits on Zeke's go-ahead (package L78 and L1004; handoff "Waiting on Zeke" item 1). This is the package's process, not a quoted rule of his (was "Zeke's rule: nothing is written to the Doc without his word", which no repo file quotes).

### 7.1 Order of writing (recommended)

1. **Answer O-58 first** (blank supplier), so insert E / E2 never states a rule the code does not follow. [Recency 11/24] Precondition removed 11/24: O-58 answered (P20).
2. Re-read the Doc, then write the **seven approved GID inserts** (A, B, C, D, E, C2, E2) with the corrections below.
3. Then, in one revision-guarded batch, highest index first per tab: the callout, the X-rows that change what is sent (X-05, X-12, X-15, X-19, X-20, X-21, X-25, X-26, X-30, X-33, X-35), then the rest.

### 7.2 Index check for the approved inserts

- All seven GID inserts anchor **before** guide L564 (B 18476, A 19486, E 32779, C 35492, D 43201, E2 65795, C2 67942). The only change in the Doc since the draft is two added paragraphs at L564–L565 and L583–L584, so **no GID index needs recomputing because of them**.
- **But the batch will be refused as written:** its `requiredRevisionId` `AHj4eMQ8YIxWuqzf…` is no longer live (now `AHj4eMRPezFu…`, modified 2026-11-24 15:58 UTC). Re-read, confirm each anchor's end index, replace the revision ID.
- **Every new insert that anchors after L564** (L582, L596, L605, L686, L693, L700, L723, L745, L747, L751, L773, L788, L792, L822, L832, L898, L1006, and the architecture-tab and index anchors in other tabs) must be indexed from the fresh read.

### 7.3 Corrections to approved inserts before writing

| Insert | Change | Slice refs |
|---|---|---|
| C, C2 | Append " More Than One Location uses the home parts, as Child's House does." (approved text unchanged) | 02 question 1; 08 question 2 |
| A bullet 4 | Append " (once each property exists in production and its change is deployed)" | 08 question 3 |
| E, E2 | Blank supplier sends nothing (O-58 answered) | 08-d2 [Recency 11/24] Precondition removed 11/24: O-58 answered (P20). |

### 7.4 Deduplicated list of texts to add

| # | Topic | Anchor (guide line) | Text source | Also raised by |
|---|---|---|---|---|
| 1 | Callout: 11/23–11/24 decisions are not yet in the doc; repo files win | L24 (index) and end of L190 | 08 §5.0 | — |
| 2 | Two gate checkboxes, workflows, existing records later | L280, L282 | GID A, B (X-01, X-02) | 03; 04-5; 07 G-05 |
| 3 | Link-property history check at cutover | L355, L403, L430 | X-03 | — |
| 4 | Existing employees: duplicate counts | L751 | X-04 | — |
| 5 | BCBA `date_of_birth` text, placeholder on create | L342 | X-05 | 03 (L342); 08 K10 |
| 6 | Update with blank date (option (a), decided) | L342 | X-06 | — |
| 7 | BT/RBT `date_of_birth` text | L342 | X-07 | 03; 04-10 |
| 8 | Referral source as stored; Other text | L382, L539 | X-08 | 02 |
| 9 | Allergies  | L374, L523 | X-09 | 02 |
| 10 | Physician "`<name> <npi>`" | L380 | X-10 | 02 |
| 11 | Service address from parts | L373, L521 | GID C, C2 (X-11) | 02 |
| 12 | State = `stateregion`, else `location` | L360, L509 | X-12 | 02 |
| 13 | Copy workflow not needed | L898 (+ GID D at L393) | X-13 | 02; 07 G-08 |
| 14 | Address 2 junk (decided: `null`) | L373 | X-14 | — [Recency 11/24] Draft X-14 (decided). |
| 15 | Care Coordinator source; production set-up before item 6 | L361, L510 | X-15, X-45 | 01 U8; 02; 07 G-09 [Recency 11/24] Rewritten: `care_coordinator_first_name` + `care_coordinator_last_name` + `coordinator_export_status` (item 6), since 11/24 (P16). |
| 16 | BCBA Care Coordinator: no CR field | L412 | X-16 | 03 |
| 17 | Availability text only | L369, L517 | X-17 | 02 |
| 18 | Severity  | L377, L526 | X-18 | 02 |
| 19 | Grad Permit holder rules | L364, L723 | X-19 | 01 U7; 02 |
| 20 | Item 10: label is the signal; 131308 order; On Leave never | L366 | X-20 | 01 U2–U5; 02 |
| 21 | Outgoing SUB BCBA 288 / sandbox 221 | L555, L1006 | X-21 | 01 U1 |
| 22 | " BCBA LBA" suffix | L363, L512 | GID E, E2 (X-22) | 01 U6; 02 |
| 23 | B21 core fields never cleared | L346 | X-23 | 02 |
| 24 | Label read lag 150 s | L1736 | X-24 | 05; 06; 07 G-18 |
| 25 | Workday 7-digit check; test values | L745, L210 | X-25 | 03; 04-2, 04-16; 07 G-02 |
| 26 | NM / VA deferred (with production counts) | L234 | X-26 | 03; 04-13; 05; 06; 07 G-15 |
| 27 | CR API tier, budget items | L1730 | X-27 | 07 G-18 |
| 28 | CR API user and connection | L1740 | X-28 | — |
| 29 | Client read returns External System ID; 487 of 489 resolve | L276 | X-29 | 02; 07 G-16 |
| 30 | Label test done; managed labels; hold lifted | L1734, L605 | X-30 | 04-18; 05; 06; 07 G-10 |
| 31 | G20 consolidated note (RN names, phones, emails, Workday values) | L214 | X-31 | 02; 03; 04-1; 07 G-01, G-03 |
| 32 | Total Assigned Hours sum | L370, L518 | X-32 | 02 |
| 33 | BCBA personal email from `personal_email`; Contact changes reach Cases only through HubSpot's property sync | L409, L453 | X-33 | 01 U10; 02; 03; 07 G-07 |
| 34 | Unreadable values are an error; phone form | L489 | X-34 | — |
| 35 | BCBA primary email = `email` | L341, L408 | X-35 | 03; 04-9 |
| 36 | Triggers maintained in HubSpot | L392, L420, L442 | X-36 | 01 U12; 07 G-14 |
| 37 | Poller schedule 5 min in sandbox, hourly in production | L1738 | X-37 | 04-3; 07 G-11, G-12 |
| 38 | Read order: production first | L40 | X-38 | — |
| 39 | "Code today" notes are history | L274, L284, L338–L341 | X-39 | 02; 04-4, 04-7, 04-8; 07 G-04, G-06 |
| 40 | Workday ID on two records | L747 | X-40 | — |
| 41 | Gate pointers (one-way latch no longer holds in production) | L810, L1722 | X-41 | 08 review question 2 |
| 42 | Per-BT hours, `insurance_id_3/4`, Unsure physician not mapped | L391, L370 | X-42 | 02 |
| 43 | Salaried is a CR label | L581, L412 | X-43 | 06 |
| 44 | Location #2 schedules: no code | L368 | X-44 | 02 |
| N-1 | BT/RBT → Contact association: production 109 "Contact Record" + 107; sandbox 231; not read by the integration | L1006 (SCURRENT) | new | 01 U9 |
| N-2 | 151 / 227 read from the holder's side; 150 / 226 not read | L1004–L1005 | new | 01 U11 |
| N-3 | Sandbox pipelines: Deal `default` (production stage IDs); BT/RBT `822050166` (Resigned 1299798139, Terminated 1299798140); BCBA `855656544` (Resigned 1344955696, Terminated 1344955697), same in production | L975 | new | 01 U13 |
| N-4 | The integration reads Case → BT/RBT 238 / 240 (pair of 239 / 241) | L443 | new | 01 U15 |
| N-5 | Sandbox association limits (one per Case for Supervising, IA, RE, Primary BT 1, Primary BT 2, Outgoing BT 1; one Grad Permit Supervisor per holder) | L549, L977 | new | 01 U16 |
| N-6 | `current_primary_bt` workflow not needed (names from associations) | L367, L788, L899 | new | 02 |
| N-7 | Metadata dates are `MM/DD/YYYY` text (decided) | L372, L489 | new | 02 question 3 |
| N-8 | Fan-out queues every Case on the Contact; each Case reads its own fields | L451 | new | 02 question 4 [Recency 11/24] Rewrite N-8: the Guardian values are Case property-sync fields read from the Case; no fan-out is needed (R02). |
| N-9 | Production `nj_insurance_labels` also has `Aetna`, `Cigna` (no "-NJ") | L416, L692 | new | 03; 06 |
| N-10 | `full_name` is not sent | L574 | new | 03 |
| N-11 | BCBA trigger list: `email`, `personal_email`, `date_of_birth`, `bcba_in_cr_checklist`, `work_status` | L420 | new | 03; 06 |
| N-12 | Colorado-only BT/RBT uses form "RBT CO" (question 15 decided: `RBT CO`) | L337 | new | 04-6; 06 |
| N-13 | The record ID is also the temporary External System ID | L433 | new | 04-11 |
| N-14 | Active Case Load wired to Meta 147882 | L438, L443, L771 | new | 04-12 |
| N-15 | Blank `bt_rbt_type` gets no role label; "BT to RBT" seen only in the sandbox (visible options) | L701 | new | 04-15; 06 |
| N-16 | Nothing reads the temporary ID (Zeke 11/20; United Care not recorded) | L755, L757 q1 | new | 04-17 |
| N-17 | No fan-out branch for BT/RBT; propagation by HubSpot property sync + workflow / poll / sweep | L442, L455 | new | 04-19 |
| N-18 | Base labels always sent: All Clients 1052619; All Employees 1052618 + Clinical 1052643 (+ BCBA header 1130668) | GER label rows | new | 05; 06 |
| N-19 | Managed-label rule (question 19 decided: managed-label wording approved) | L328 | new | 05; 06 |
| N-20 | Funding rows: "not sent, see [G19]" | L387–L389, L673–L679 | new | 05; 08 K5 |
| N-21 | BCBA credential labels not built (decision 25), waiting on United Care | L417 | new | 06 |
| N-22 | "No payor tags" covers client funding labels only; BCBA NY Medicaid is sent | L226 | new | 06 |
| N-23 | NY / CO Medicaid labels are children of Billing Hold 1103437; sent independently | L692 | new (optional) | 06 |
| N-24 | Azure build deployed and tested in the sandbox | L1752 | new | 07 G-13 |
| N-25 | Dead-letter alert exists (Owner role only); reports and views not created | L1732 | new | 07 G-17 |
| N-26 | Nine index lines (GBR, GER, GER-REQ, GER-CASE, GER-BCBA, GER-BT, GER-CONTACT, SCURRENT, the [G17] gating pointer) and fixes to stale lines L32, L36, L58, L76 | L20–L178 | 08 §5.2 | — |
| N-27 | Pointers for guide contradictions: K1 (L792, L1278), K4 (L384), K5 (L387), K16 (X-41), K17 (L186, L973) | — | 08 §5.3 | 01 U12 |

No update needed: 01 U14 (exclusions unchanged); L571 create signal (still open with Sara; no change).

---

## 8. Requirements the guide retired or deferred

All **135** rows with status RETIRED (111) or DEFERRED (24) are in **Appendix A**, each with the guide line and what retired or deferred it, so none was dropped by mistake. In summary:
- **Deferred by Zeke 2026-11-23 ("These are pending the client beginning work in these states."):** New Mexico and Virginia employee labels (BCBA-L03, -L07; BT-120, -121; LBL-006, -007, -050, -051; GC-064, -065; TRG-192), client state labels (CLB-067, -068) and the NM / VA mailing state (BCBA-196).
- **Deferred as optional:** Case History Log (OBJ-036, -037, TRG-282); School / Clinic labels (CLB-073, -074); reverse association types not read (STF-054, -056, -072, -073, -079).
- **Retired by later dated notes or decisions:** the label hold and add-only rule (label test 2026-11-20); the six staffing labels → three (G19); every client funding label (G19 L226: "no payor tags"); the owners API for the Case Care Coordinator (decision 39); BCBA email and personal email from the Contact (decisions 42, 44, 49, 50); the blank-Workday hold (11/17 Zeke); `blocked` / `noop` statuses; the single gate checkbox (D18); AZTEST Workday values and "#" names; the copy workflow; Location #2 schedules; per-BT hours and `insurance_id_3/4`; Maladaptive ", " (item 17); item 23; old sandbox portal 50850427 (W1–W6).
- **Counting note:** slice 02 shows NM / VA per state in its state table and counts no DEFERRED rows; the deferred states are still visible there.

---

## 9. Open questions for Zeke

One deduplicated list. "Already asked" = already waiting on Zeke in the package, the handoff or the WT BUILD-PLAN; cited, not re-asked. Each has a recommendation.

**Already asked (waiting on you):**

1. **Package question 7, junk Address 2.** Already asked. Recommendation: send `null` when the value, commas removed, is empty or one state. [Recency 11/24] CLOSED 11/24: `null`, built (P15).
2. **Package question 24, new post-cutover records.** Already asked. Recommendation: the creates workflow triggers on Entered = Yes with "created after the cutover date" as a filter; no further hold. [C] Zeke's two-phase ruling (handoff L10, "1. Create records only") fits this recommendation but does not answer the workflow wording, so it stays asked. [Recency 11/24] CLOSED 11/24 (P24).
3. **Package question 25, omit 138851.** Already asked. Recommendation: omit until item 6 ships. [Recency 11/24] CLOSED 11/24: item 6 built; 138851 is not omitted (P16).
4. **Package question 26, two Supervising BCBAs with one holder.** Already asked. Recommendation: leave both fields out with a warning, **and** have the build chat make the code match (today it does not; gap A2). [Recency 11/24] CLOSED 11/24: rule 7 as written, code aligned (P17).
5. **Package question 27, employee update with a blank date of birth.** Already asked. Recommendation: option (a); **say it covers the BT/RBT too** (shared code; 6,183 blank production BT/RBTs) (04 question 1). [Recency 11/24] CLOSED 11/24: decided (option (a), P18).
6. **Un-hold items 3 (Allergies) and 8 (Severity).** Already asked. Recommendation: yes (CF §10 confirms both). [Recency 11/24] CLOSED 11/24: un-held (P19).
7. **The guide write (GID batch).** Already asked. Recommendation: yes, after O-58 and a fresh read (section 7). [Recency 11/24] Recency 11/24: the "Answer O-58 first" precondition is removed (P20).
8. **O-57, O-58, O-59** (WT BUILD-PLAN, raised by the build chat on 11/24). Already asked. Recommendation: answer O-58 before the guide write; O-57 as the package's D18 f (failed read, no HubSpot write) unless you prefer the visible `error`; O-59 tighten. [Recency 11/24] CLOSED 11/24: O-57 keep the behaviour (P21); O-58 sends nothing (P20); O-59 split only when a state precedes the ZIP (P22).
9. **Package question 17 (item 13), question 8 (A-13), H-Q1 to H-Q6, RG D15 (production rollout authority), O-20, O-26, O-51.** Already asked (O-21 removed). Recommendations as in those files (question 8: keep BL5, add 1107647 to the existing-records review). [Recency 11/24] Recency 11/24: O-21 removed from the waiting list (superseded for the Guardian fields; needs Zeke's word).

**Questions 10 to 38 (closed 11/24 as recommended; P25):**

10. **Item 10's rules as a whole.** Outgoing BT 1/2 join the BT names while the label is on the Case (no removal date), order 82 → 234 → 288 → 135, On Leave never sent. The repo holds your words for label 288 and the order "Yes", not for dropping the removal date. Recommendation: confirm in one line before the deploy; ask United Care to remove the label when the date passes (01 R-Q1, 02 question 6). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
11. **A BCBA row in the live gate set.** The decided D18 g set has no BCBA row, so the BCBA gates reach production proven offline only. Recommendation: add one BCBA skip row (no CR write) (03 question 5). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
12. **Item 10 roles have no change signal.** A role change reaches CentralReach at the next Case change or the daily sweep (up to ~24 h). Recommendation: accept for go-live, say so in the guide, measure once (01 question 1). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
13. **Sandbox `active_cases_count`.** "BT - Active Cases Sync" left the test BT/RBTs blank (T7 failed twice). Recommendation: you check the workflow's enrolment so R2 shows 0 and R3 shows 1 from the real automation (04 question 2). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
14. **How to prove Behavior Technician NJ.** Slice 06: change R3 BT/RBT 1 to a NJ-only BT, add an R3-U1 step to RBT New Jersey;New York, set R2 BT/RBT 1 to Colorado;New York (no extra CR record). Slice 04: add a second pushed NJ BT (one more CR employee). Recommendation: slice 06's route (section 10, conflict 1). [C] Take it with R2 BT/RBT 1 created **Colorado only** and moved to `Colorado;New York` in an R2-U1 step. That keeps the only live proof of the `RBT CO` form (question 15, K15). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
15. **"RBT CO" contact form for a Colorado-only BT/RBT.** Decision 17 has no words of yours. Recommendation: confirm (CR has no Colorado BT form), then guide note N-12 (04 question 4). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
16. **Checklist and Workday triggers.** The BCBA checklist tick and the BT/RBT `workday_id` edit sent no webhook in the sandbox. Recommendation: confirm both checklists and BT/RBT `workday_id` are on the sandbox triggers now and on the production BCBA / BT/RBT workflows at cutover (03 question 2). [C] Partly settled already: the sandbox ask was in the R1-U1 run sheet (round-1-log L180, decision 51), and Zeke's "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)" (`prod-reads-output-2026-11-24.md` L5) postdates the 11/23 evidence. Recommendation: do not re-ask for the sandbox; prove it with the first run's `source` in WD-1 and WD-4; keep only the production half as a cutover check (4.10). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
17. **CR "Case Stage" sublabels** (Ongoing, Paused, Restaffing…). Recommendation: leave unmanaged; add to the existing-records review (05 question 1). [C] The "existing-records review" half is now settled as phase 2 by Zeke's ruling (handoff L10: "Any production discrepancies found between HubSpot and CentralReach are a phase two production build"). Only "leave unmanaged" still needs his word; under decision 14 it is the default already (labels the integration does not map are kept). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
18. **Deleted-label test (A-18).** Recommendation: accept offline; runbook note for a `CR_LABEL_NOT_IN_CATALOG` dead-letter (05 question 2). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
19. **Managed-label rule in your words** (guide L328 asks for removal rules). Recommendation: approve "a mapped label is on the client only while its HubSpot source says so; labels the integration does not map are kept" in the guide batch (05 question 4). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
20. **Sweep runs and the label retry (item 20).** Recommendation: keep `CR_LABEL_POST_UNCONFIRMED` on the full schedule (05 question 5). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
21. **BCBA credential labels (Aetna, Cigna, Carelon, CO Medicaid).** Recommendation: send United Care the proposed mapping (all four production NJ options named); not blocking go-live (06 question 2). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
22. **One state for non-state label rules** (Active / Inactive replacement, Cleanup skip, 5 AM / 1 PM flip). Recommendation: accept one state; add only E4's four rows (05 question 3). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
23. **Update rounds per state.** Recommendation: yes, one push per entity per path in R2 and R3 (07 question 1). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
24. **Production sync workflows: segment as trigger or filter** (L1714). Recommendation: property-change triggers with re-enrolment on; the segment only as an AND filter (07 question 3). [C] The package already drafts this: D18 c table (package L773) "Sync workflows (the webhook senders) | Enrolment filter: member of either segment", and guide L1714 says to use triggers, not segment membership, for change signals. Only the sync-workflow row was not part of the "Yes, all 7" answer (that covered the creates and promote workflows), so this is a one-line confirmation, not a new design question. [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
25. **HubSpot webhook retries after an Azure 5xx.** Recommendation: accept without a test (07 question 4). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
26. **Retired app settings and unused queues.** Recommendation: remove the seven settings at cutover; leave the queues (07 question 5). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
27. **Dead-letter email receiver.** Recommendation: add Danny or a shared inbox now (07 question 6). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
28. **Poller-failure alert.** Recommendation: yes, at cutover with item 19's alert (07 question 2). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
29. **Guide callout for 11/23–11/24.** Recommendation: yes, in the same batch (08 question 1). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
30. **Insert C / C2 More Than One Location; insert A bullet 4 tense.** Recommendation: append both (02 question 1; 08 questions 2, 3). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
31. **Write the 45 crosswalk texts (X-01 to X-45) and the index lines** beyond the GID batch. Recommendation: yes, in two steps (08 question 5). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
32. **Gate pointers at L810 / L1722.** Recommendation: yes (08 review question 2). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
33. **G20: one consolidated note.** Recommendation: one note (08 question 7). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
34. **Auth Period dates** (L372 "midnight UTC" vs text). Recommendation: keep the code; add a guide note (02 question 3). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
35. **Contact fan-out routing** (L451). Recommendation: accept as built; one-line guide note (02 question 4). [Recency 11/24] Closed 11/24 as recommended (Q35, P25); the guide text is rewritten as N-8. [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
36. **Association-only CR updates** (one update with unchanged values on a role change). Recommendation: no change (01 question 2). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
37. **Where the new staffing tests go.** Recommendation: item 9/10 roles in R2 and R1-U1; R3 as the plain baseline (01 question 3). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).
38. **Edit-webhook proof: poller on or off?** Slice 08 suggests one push per entity with the poller off; slices 06 and 07 say keep both on and record `source`. Recommendation: keep both on and record `source`; only for a field that never shows a webhook run, one push with the poller off (section 10, conflict 2). [Recency 11/24] CLOSED 11/24 as recommended (P25; individual outcomes in PKG section E q32).

**Count:** 38 questions: 9 already asked (some grouping several package items), 29 new. [Recency 11/24] All 29 new questions (10-38) are closed as recommended (P25).

---

## 10. Conflicts between slices

| # | Requirement | Slices that disagree | What each says | Which source settles it |
|---|---|---|---|---|
| 1 | Behavior Technician NJ 1132652 and the NJ-only form | 04 question 3 vs 06 question 1 | 04: add a second pushed NJ BT (one more CR employee); 06: repurpose R3 BT/RBT 1 and add an R3-U1 step (no extra CR employee) | Not settled by any source. Zeke decides (question 14); recommendation 06 [Recency 11/24] Settled 11/24 (P23, P25): no longer waiting on Zeke. |
| 2 | How to prove the edit webhook | 08-a4 / question 6 vs 06-a8 [R] and 07-a1 | 08: one push per entity with the poller off; 06, 07: both on, record the first run's `source` | Zeke 2026-11-24 asked for the run with the webhook and poller on ([C] his words are in the review brief, not in a repo file; see section 12); 06 reviewer assumption 3 allows a single deliberate poller-off step only where nothing else proves the path. Question 38 [Recency 11/24] Settled 11/24 (P23, P25): no longer waiting on Zeke. |
| 3 | Case skipped while Entered is not Yes | 02 CASE-205 (PLANNED, "no Case evidence") and 05 CLB-052 (PLANNED) vs 07 App Insights trigger table | 07 shows R2 Case 68589573817 webhook 16:45:12 → `skipped` `entry_not_yes`, 0 CR calls | The App Insights record (07, query 3 and the trigger-path table). Confirm with `record-timeline.kql` (read-only), then promote both rows (gap F17) |
| 4 | Sandbox trigger lists | 01 (WF-003 to -010, STF-001 to -005 unchanged), 03 (BCBA-027, -163 unchanged), 07-e1 (blocked) vs 02, 04, 05, 06 ([P] "done") | Zeke's "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)" was applied only in the slices it names; 07's gap e1 was not updated | Zeke's words cover slice 7 too; the lists are not in the repo, so every slice's proof is the same: the `source` of each run (gap D2). The BCBA checklist is still an open trigger (question 16) [Recency 11/24] Settled 11/24 (P23, P25): no longer waiting on Zeke. |
| 5 | Item 12, the 150 s first label retry | 05 CLB-117 NOT-BUILT vs 06 LBL-074 OFFLINE-ONLY | Same requirement, different status | 05 reviewer rule R-A2 / R-A5: the deployed code (`655b385` `retry.mjs:13`, 60 s) is what the test runs on until the deploy, so NOT-BUILT is right today; both become "built, test after deploy" (gap C4) |
| 6 | Mixed Grad Permit holders | 01 STF-018 CONFLICT, 02 CASE-090 CONFLICT vs 08 GC-050 BLOCKED | Same requirement | Both are true: question 26 is open **and** the pending code contradicts the package text. Treat as CONFLICT until question 26 is answered and the code aligned (gap A2) [Recency 11/24] Resolved 11/24: rule 7 built (P17); STF-018 and CASE-090 are no longer CONFLICT. |
| 7 | MAPPING_VERSION first run | 04 BT-140 CONFLICT vs 03 BCBA-195 PLANNED (with a test-plan defect) and 02 CASE-199 PLANNED | Same defect, different status | Package L94 (full update by design) settles the behaviour; the run sheet is wrong (gap G1) |
| 8 | "RBT CO" form | 04 BT-109 CONFLICT vs 06 (guide update row for L337 and LBL-067 PLANNED treat decision 17 as settled) | 04: no Zeke words; 06: settled | BUILD-PLAN decision 17 records "proposed by the orchestrator and not objected to": not a Zeke decision. Question 15 [Recency 11/24] Settled 11/24 (P23, P25): no longer waiting on Zeke. |
| 9 | Item 10 decision basis | 01 STF-086 CONFLICT vs 02 reviewer R-5 and 08 X-20 ("11/23 — Zeke:") | 01: only label 288 and "3. Yes" are Zeke's words; 02 / 08 accept GP §8.3 rule 4 | Package section A calls item 10 decided; the verbatim words do not cover the removal-date change. Question 10 [Recency 11/24] Settled 11/24 (P23, P25): no longer waiting on Zeke. |
| 10 | NM / VA | 06 LBL-009 CONFLICT vs 08 question 4 (withdrawn as decided) | 06: guide text conflicts with production; 08: decided by Zeke's deferral | Both: Zeke's deferral settles the code (package item 11); the guide text still needs X-26. No question |
| 11 | Counting of deferred rows | 02 (DEFERRED 0) vs the other slices | 02 shows NM / VA only in its state table | Counting convention, not a requirement conflict |
| 12 | Round 2 creation history | 01 d8 (before [S]) vs R1 log L161 / handoff | Old script vs fixed script | Settled by the [S] sandbox read: the 16:46 re-run used the fixed script; R1 log L161 and the handoff line are out of date (all slices now agree) |

---

## 11. Assumptions made for this master file

1. Status counts use the first word of each Status cell (so "PROVEN-LIVE (NY only)" counts as PROVEN-LIVE); group-heading rows in slice 05 carry no status and are not counted. Every slice's stated totals match its Status column.
2. Slice 06 is split by row number (LBL-001–044 BCBA, 045–069 BT, 070–085 both). Slices 01 and 08 are shown as their own rows.
3. Rows are not de-duplicated across slices; 1,402 is a row count (1,400 before the 11/24 recency fixes added two trigger rows).
4. The path-gap count (about 352) is a scan of the webhook / poller columns for "no", "unknown", "depends", "needs", "maybe", "not", "blocked" and the slice 02 token "P0"; some of those are paths that do not apply, so it is an upper bound.
5. "Gaps n" per state counts only state-table cells marked GAP, NOT-BUILT or BLOCKED; "planned" Colorado and New Jersey cells are not counted although no CO / NJ round has run.
6. The working tree was not re-read for this file: statements about the pending build come from the slices' reviewers, as read on 2026-11-24; it was changing.
7. "Already asked" items are taken from the package section E, handoff "Waiting on Zeke" and the WT BUILD-PLAN O-52 to O-59 (owner "Zeke | His word").
8. Severity ranking: a gap that could write wrong data, clear data or create a duplicate ranks above one that could stop runs, which ranks above a missing decision or test.

---

## 12. Limits of this review [C]

What this whole review (eight slices, their reviewers, this master and the completeness check) did **not** check:

- **No live check by the master or the completeness check.** HubSpot 0, CentralReach 0, Google Doc 0, Azure 0 calls. Live facts come from the slices' own reads: Zeke's production run (`prod-reads-output-2026-11-24.md`, 81 GET / count calls), one sandbox association read (5 GETs), slice 07's Azure reads and the App Insights re-run (16 queries). No CentralReach record was read by any slice (budget rule), so "is the test record still active" and every CR-side value rest on the round logs.
- **Uneven live-read passes.** Slice 08 got no live-read update and no [R2] check; slice 07 got no [P] pass (its gate-property and trigger rows were not re-read against the production output; Zeke's "done" names slice 7 but 07-e1 was not updated, conflict 4); slices 03, 04 and 06 got no [S] edit.
- **Partial row checks.** The first-pass reviewers opened 52 % (03) to 79 % (06) of the author rows; slice 08's reviewer did not open 44 of 112 rows (mostly PENDING cutover rows); slice 07's reviewer about 51 %.
- **Production reads limited to visible options.** `prod-review-reads.mjs` drops hidden options, and multi-checkbox counts use `EQ` (a record with two values may count twice). Not read in production: association limits, reverse types 75 / 144 / 289, workflow trigger lists (403 on the token), link-property history, the 4,654 blank-type BT/RBTs' link state (K9), the `personal_email` 110 / 374 count (BCBA-116, not traced).
- **The workflow trigger lists** behind Zeke's "done" are not in the repo; every trigger row relies on the planned `source` check (D2).
- **The pending build was read, not run.** The working tree changed during every slice (BUILD-PLAN decisions 52–60 and O-52 to O-59 appeared on 11/24); line numbers drift; `npm test` was not run by any reviewer (the build chat reports 1,233 passing after its step 1, not verified here). This master was not re-read against the working tree after the slices (assumption 6).
- **The guide snapshot is the 16:08 UTC 11/24 text extract.** Later Doc edits and formatting were not seen; the GID revision ID is stale (section 7.2).
- **Evidence quality of PROVEN-LIVE.** Several slices accept a matrix Result cell plus a check-script run total; no per-row check output is saved (K13). The App Insights stitch loses keys when runs interleave (one BCBA summary at 19:10 unparsed), and request bodies are not logged (K4). The minutes the poller ran on 11/24 were not checked in the logs (handoff L9; GC-104).
- **Line coverage was checked at line level for L192–L322, L324–L456 and L458–L703** (every requirement-bearing line is cited by at least one row) and at clause level only for the dense G17 / GBR lines (L276 (1)–(5), L321, L322) and the lines with one or two citing rows. Other multi-clause table rows (e.g. L519, L524, L525) were not split clause by clause. L704–L1280 (G10, G11, appendix, sandbox tabs) and the architecture tab L1616–L1754 were covered by the slices' own walks, not re-walked here.
- **Zeke's 11/24 request** ("test EVERY requirement … the webhook and the poller on") is quoted from the review brief (as in slices 07 and 08); it is not in a decision file.
- [C] **Second completeness pass.** Also no live call: HubSpot 0, CentralReach 0, Google Doc 0, Azure 0. It did not run `npm test` and did not re-read the working tree; it read one file of the deployed code (`655b385` `centralReachClient.mjs`, for K15). It did these things:
  - Re-ran the line walk for L192–L322, L324–L456 and L458–L703, plus a clause check by key term on every GER row and on G01–G09.
  - Ran a scripted line walk only for L705–L965, L967–L1280 and L1616–L1754: 100 lines are uncited there. They were judged headings, history and context, except L739 (K18). They were not read clause by clause.
  - Did not re-check the 365 path-gap scan or the state-gap cells cell by cell. Their totals were re-derived by the first pass only.
- [C] **Rulings after the slices.** Zeke's two rulings of 2026-11-24 (handoff L9–L10) postdate every slice. Only K9, K15–K17, questions 2 / 14 / 17 and 4.10 were updated for them; slice rows that say "before cutover" for existing-record work were not re-tagged one by one.
- [C] **Handoff line numbers drift.** The handoff was edited again after this file was written. Earlier citations such as "handoff L49" (K1) point to text that has since moved; the text itself (the R1 / R4 decoy `date_of_birth`) is unchanged in the current "State at 2026-11-24" section.

---

## Appendix A. Every RETIRED and DEFERRED row (153)

Generated from the Status column of the eight slices. Text shortened; the full row is in the slice file.

| Slice / Req # | Guide line(s) | Requirement | Status | What retired or deferred it |
|---|---|---|---|---|
| 01 OBJ-016 | L463 ("Stage IDs are listed in section… | The other Client Pipeline stage IDs (Contact Client 1136629064 … Closed Lost `closedlost`) are reference only: labels are not derived from… | RETIRED | L605, L641 (11/06: read `staffing_status` directly; the stage table is history) — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): all 32 production… |
| 01 OBJ-036 | L467 | Production Case History Log `2-52798305`: optional audit trail of integration writes; not part of the map. | DEFERRED | Guide offers it as optional ("Not part of your map"); no decision adopts it. |
| 01 OBJ-037 | L984 | Sandbox Case History Log `2-72890328`. | DEFERRED | As OBJ-036. |
| 01 API-016 | L477, L419 | NY Medicaid - Status shows "Credentialed", stores `Credentialing`. | RETIRED | L419 ("Use the label fields instead of individual credentialing statuses") — Only relevant "if `ny_medicaid__status` is read"; it is not. |
| 01 API-029 | L483, L510, L361 | Care Coordinator = Case owner: resolve `hubspot_owner_id` with `GET /crm/v3/owners/{id}`. | RETIRED | Decision 39 (BUILD-PLAN L176, recorded as "(Zeke)" with no quote there); Zeke verbatim in the package L289: "We will read the fields for this."; package L303 ("No owners… |
| 01 STF-054 | L559, L1002 | Production BT/RBT → Case Primary BT 1 = `75` (reverse). | DEFERRED | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): not covered: only Case → BT/RBT was read, so the reverse 75 is unverified. No code uses it. Referen… |
| 01 STF-056 | L560, L1003 | Production BT/RBT → Case Primary BT 2 = `144`. | DEFERRED | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): not covered (reverse 144 not read). No code uses it. As STF-054. |
| 01 STF-072 | L547, L415, L1005 | Production BCBA → BCBA "Grad Permit Supervisee (this BCBA supervises them)" = `150`. | DEFERRED | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): 150 "Grad Permit Supervisee (this BCBA supervises them)" confirmed; not read by the code. The super… |
| 01 STF-073 | L421, L1005 | Sandbox Grad Permit Supervisee = `226`. | DEFERRED | As STF-072. |
| 01 STF-074 | L409, L453, L1006 | Production BCBA → Contact unlabeled = `17`: read the linked Contact's email for the BCBA personal email. | RETIRED | Decisions 42 and 50 (BUILD-PLAN B9): the BCBA's own `personal_email`; the fan-out does not queue BCBAs (`contactFanOutWorkflow.mjs:1–3`) — Production read 2026-11-24 (Ze… |
| 01 STF-075 | L421, L456, L1006 | Sandbox BCBA → Contact unlabeled = `191`. | RETIRED | Decisions 42 and 50 — Still needed in the sandbox to fill the mirror fields, not as an integration read. |
| 01 STF-079 | not in guide (MX "Findings (b)") | BT/RBT → Contact association: production 109 "Contact Record" and 107 unlabeled; sandbox 231 "Contact Record". | DEFERRED | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): BT/RBT → Contact 109 "Contact Record" and 107 unlabeled confirmed (guide update U9). Not used by th… |
| 01 WF-001 | L1010–1014, L1018 | W1–W6 are a historical snapshot of sandbox 50850427; current workflows are in 52311591. Portal 50850427 is retired. | RETIRED | L1310 (11/16: sandbox switched to 52311591) — |
| 01 WF-002 | L1022, L1023, L1025, L1026 | Old sandbox object types BT/RBT `2-55656309` and BCBA `2-55656302`. | RETIRED | L1310 — |
| 01 STF-006 | L367 | "`current_primary_bt` workflow or custom-code handling is under consideration." | RETIRED | No later note or package decision closes it. [Recency 11/24] Retired (BP 4.14, d51, P35): staffing names come from associations and the triggers are owner-maintained; no `current_primary_bt` workflow is under consideration. |
| 01 STF-012 | L512, L363, L552 | CR Supervising BCBA (Meta 131308) = the typed `ongoing_central_reach_provider_supplier` (Sara, Oct 22), matched to the CR provider by name. | RETIRED | [R] Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in stage7GradPermitRoles.test.mjs, which is not live. No current matrix row tests it (MX C12/C13/C15 still describe the deployed rule). The R… |
| 02 CASE-064 | L204 (G20) | Case test record sets `phone_number__second_` (second phone → PhoneHome) | RETIRED | decision 36 (2026-11-20): dropped; PhoneHome never sent — Guide L204 out of date |
| 02 CASE-067 | L361, L510, L483 | Care Coordinator via `hubspot_owner_id` and `GET /crm/v3/owners/{id}` (name and email) | RETIRED | decision 39 (2026-11-20): not the owners API — |
| 02 CASE-071 | L510, L1466 | Add `crm.objects.owners.read` to the production app for the Case | RETIRED | decision 39: not needed for the Case — Production token answered 403 (CASE §0.3); B11 may still need it |
| 02 CASE-077 | L363, L512 | Supervising BCBA 131308 = typed `ongoing_central_reach_provider_supplier`, "matched to the CR provider by name" | RETIRED | pkg item 9 (2026-11-23; insert E approved 2026-11-24): associations decide, supplier only as fallback; O-16: name match not possible by API — Old rule proven; new rule i… |
| 02 CASE-103 | L367, L788 | `current_primary_bt` workflow or custom-code handling "under consideration" | RETIRED | BUILD-PLAN C14 / row 4.14: names come from the associations, never from the rollups — No workflow needed |
| 02 CASE-107 | L368, L515, L516 | Location #2 variants `work_schedule_1_details__for_location_2_other` / `work_schedule_2_details__for_location_2_other` when the BT works at… | RETIRED | pkg C (2026-11-23): O-14 / C18 closed, "No code" (filled on 0 of 2,882 Cases) — |
| 02 CASE-109 | L369, L517 | Append `client_service_hours_total` (weekly hours) to Availability | RETIRED | pkg item 7: not appended; property leaves the mapped list — Guide note O-34 |
| 02 CASE-113 | L370, L518 | Per-BT hours `hours_bt_work_schedule_1` / `_2` "as applicable" | RETIRED | pkg C (2026-11-23): O-18 / C21 closed, no CR field — |
| 02 CASE-129 | L393, L394, L788 | Copy workflow into `if_services_will_be_in_more_than_one_location__list_the_other_address` after confirming its source | RETIRED | pkg item 5 (Zeke 2026-11-23); insert D approved 2026-11-24 (not yet written to the doc) — Negative tests check `…_addres` (pkg L275 test-only fix) |
| 02 CASE-147 | L391, L394 | `insurance_id_3`: "Client mapping is pending" (sandbox) | RETIRED | pkg C (2026-11-23): not required, no CR target; C38 closed — |
| 02 CASE-148 | L391, L394 | Omit `insurance_id_4` from sandbox requests | RETIRED | pkg C — |
| 02 CASE-181 | L453, L456, L788 | BCBA personal email read from the associated Contact (type 17 / 191) | RETIRED | decisions 42, 44, 50 (2026-11-21): B9 reads the BCBA's own `personal_email`; K3 retired — |
| 02 CASE-201 | L204, L214 | Test names carry "#N"; "Not tested yet: whether CentralReach accepts # in a name" | RETIRED | M L379 (2026-11-20): names end in "RN" because HubSpot refused "#1"; CR "#" acceptance stays untested — Added. Superseded by the RN convention; guide L204/L214 need the… |
| 02 CASE-068 | L361, L510 | Care Coordinator name → Meta 138851 ← `care_coordinator_name` (text, trimmed); blank clears only a value the integration wrote | RETIRED | Overwrites 69 hand-entered CR values on first sync (CASE §5) [Recency 11/24] RETIRED, replaced by CASE-069 (item 6, P16): 138851 is no longer read from `care_coordinator_name`. |
| 02 CASE-186 | L455, L790, L822 | Create the production Contact change workflow for Guardian name, email and phone | RETIRED | O-21 (sandbox and production Contact workflows) [Recency 11/24] RETIRED for the Guardian half (R02, TRG-141, CASE-170): the Case workflow covers it; no production Contact workflow is required. Pending Zeke's confirmation, recommended. The need moves to CASE-170 (trigger list holds the four Guardian… |
| 03 BCBA-099 | L341, L408, L576 | Primary email: guide says `ucaba_email_address` ("UCABA Email Address", Sara Oct 22) → `PrimaryEmail` | RETIRED | **BP decision 49 (2026-11-21, Zeke): "We are not using ucaba_email_address. We are using this internal field value email for the bcba."** — `ucaba_email_address` as sour… |
| 03 BCBA-113 | L342 ("as the same property sync") | Production BCBA `date_of_birth` to be created "as the same property sync" from the Contact | RETIRED | pkg D11 / E2: created 2026-11-21 as plain text, not a sync; blank on all 375 — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): the production BCBA… |
| 03 BCBA-115 | L409, L453, L580 | Personal email: guide says the BCBA's Contact `email` (BCBA → Contact type 17 / sandbox 191) → CR personal email | RETIRED | **BP decision 42 (2026-11-21) then decision 50 (2026-11-23): Meta 138069 reads the BCBA record's own `personal_email`; no Contact read** — Production read 2026-11-24 (Ze… |
| 03 BCBA-121 | L421, L456, L455, L822, L860, L790 | Contact email changes propagate to the linked BCBA (Contact workflow, fan-out to BCBA) | RETIRED | decisions 42 and 44 (fan-out BCBA branch removed; K3 retired) — Guide update needed |
| 03 BCBA-170 | L208 | BCBA test value: `ucaba_email_address` = zeke_work_email+azure_test_N@optidge.com "(the required primary email)" | RETIRED | decision 49; Zeke 2026-11-23 "drop the decoy" — Guide update needed |
| 03 BCBA-174 | L210 | Workday ID test values: blank for the temporary-ID test; `AZTEST-N-BCBA` for the Workday ID test; the same AZTEST value on two records for… | RETIRED | pkg item 15 (7 digits) and Zeke 2026-11-23 ("Make the workday id radom 7 digits."): AZTEST values would now end `error` — AZTEST format retired; guide update needed |
| 03 BCBA-176 | L214 | Whether CR accepts # in a name; if not, drop it and note | RETIRED | matrix: HubSpot refused "#1" in `bcba_name`; names use "RN" — Replaced by the "RN" naming |
| 03 BCBA-179 | L284 | (History) "Not built yet ... Code today fails a blank Workday ID with a sync error" | RETIRED | built since (BP BR2 built 1) — History line; superseded by the build |
| 03 BCBA-180 | L288 | Until UC answers, nothing is built for Workday ID timing / format / duplicates / existing employees, and existing production `workday_id`,… | RETIRED | pkg item 15 (format check built now); D18/D19 (existing records gated) — Format part superseded by item 15; "left as they are" holds through the gate |
| 03 BCBA-L03 | L413, L234, L419 | New Mexico / Virginia: NM Employee 1157030, VA Employee 1157031 when used; until then no label and warning `unmapped_work_state`; the BCBA… | DEFERRED | pkg item 11 DEFERRED (Zeke 2026-11-23: "pending the client beginning work in these states"); G19 L234 overrides "skip" — Production read 2026-11-24 (Zeke, `prod-reads-ou… |
| 03 BCBA-L07 | L419 | Exclude New Mexico / Virginia labels | DEFERRED | pkg item 11 deferred — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): production holds the options and 10 BCBAs use them; the code sends no NM / V… |
| 03 BCBA-190 | L321, L338, L405 | (Superseded) A BCBA with a blank `workday_id` is **not created**: 11/16 Zeke "a record with a blank workday_id is not created"; 11/17 Danny… | RETIRED | L321, L338, L405 "11/17 — Zeke: replaced for now … created with the HubSpot record ID as a temporary External System ID"; BP decision 22 — Added: the hold rule had no ro… |
| 03 BCBA-191 | L573, L717 | (Superseded) CR External System ID stores the HubSpot record ID and the HubSpot `external_system_id` field is unnecessary (the "earlier Hub… | RETIRED | L573 / L717 11/06 Danny: "CR External System ID = Workday ID … This supersedes the earlier HubSpot record ID note"; the record ID survives only as the temporary ID (L266… |
| 03 BCBA-192 | L274, L341 | (Superseded) Status values `blocked` and `noop` written to `last_sync_status` (L341: a blank email "saves the record as blocked") | RETIRED | L274 (11/17 Zeke): "The value blocked is retired" — Added; the live rule is BCBA-073 |
| 03 BCBA-193 | L280, L282 | (Superseded for production) One app setting names one HubSpot checkbox as the record gate; "the production checkbox is chosen at go-live" (… | RETIRED | pkg D1 / D18 (Zeke 2026-11-23, fifth set: "for creates: central reach creates only — For updates: central reach updates only"; "Option 1 (`sync_to_centralreach`, kept by… |
| 03 BCBA-196 | L577, L410; pkg item 11 | Mailing state for a BCBA who lives in New Mexico or Virginia: `state_home` New Mexico / Virginia → `stateProvince` NM / VA (decision 43 rea… | DEFERRED | pkg item 11 (Zeke 2026-11-23: "These are pending the client beginning work in these states"; that quote is about labels) — Added so the NM/VA state variant of the mailin… |
| 04 BT-005 | L210 | Workday ID test value `AZTEST-N-BT` | RETIRED | Superseded: Zeke 2026-11-23 "Make the workday id radom 7 digits." (MX R-WD; SANDBOX-TEST-PLAN L111). Item 15 would reject it — |
| 04 BT-007 | L321 (11/17 Danny), L338, L432, L1302 | Hold a blank-`workday_id` BT/RBT (no create, `waiting`) | RETIRED | Replaced by Zeke 11/17 (L321, L338, L432; Change Log L1302) — |
| 04 BT-061 | L591 | "If your sync deactivates BTs in CR, it should set No- Made Inactive" | RETIRED | Retired: Danny 11/14, the integration never deactivates (L591, L818) — |
| 04 BT-107 | L599 | Question to Zeke: what "Active Staffed" is in CR | RETIRED | Answered: Zeke 11/13 (L599, L771), metadata 147882 (11/16, L438) — |
| 04 BT-120 | L234, L439, L441, L700, L741 | New Mexico → NM Employee 1157030 | DEFERRED | Deferred: Zeke 2026-11-23 "pending the client beginning work in these states" (PKG item 11); G19 (send when used) is held — Production read 2026-11-24 (Zeke, `prod-reads… |
| 04 BT-121 | same | Virginia → VA Employee 1157031 | DEFERRED | same — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): production BT/RBT `location` has Virginia; 0 BT/RBTs hold it. |
| 04 BT-036 | L280, L751 | At go-live, find which BT/RBTs are already in CR before creates are on (181 BT/RBT are in CR by email or name only and would be created again) | DEFERRED | Q24 is in the package, not re-asked [Recency 11/24] DEFERRED (phase 2, Ruling B): existing records are reviewed against CentralReach in phase two; Q24 is closed as recommended. |
| 05 CLB-001 | L605, L637, L1324, L1560 | Hold client label go-live until Pessy confirms the six CR staffing labels exist. | RETIRED | L605 "11/14 — Danny: go-live approved … without waiting for Pessy"; L1432 (C14B); L609 11/18 labels created — Superseded on 11/14 and 11/18 inside the same lines. L637 s… |
| 05 CLB-002 | L605, L608, L609, L383, L384, L1306, L1… | 11/17: until the CR label test is run, labels are only added, never removed. | RETIRED | BUILD-PLAN decision 13 (2026-11-20): "The label hold is lifted"; decision 9 replaced — Guide text not updated (section 5). |
| 05 CLB-004 | L609, L256 | If the test shows CR cannot replace or remove a label, Zeke decides add-only or held. | RETIRED | Decision 13: CR can replace — Condition did not occur. |
| 05 CLB-005 | L609, L256, L735 | The six IDs and parent 1156741 are constants only; nothing reads them; nothing is sent for `staffing_status`. | RETIRED | Decisions 13, 15 (2026-11-20); G19 L220 — Guide cite L731 (an agent-context line) corrected to L735 (G10B, which repeats 'constants only'). The old "nothing is sent" tex… |
| 05 CLB-006 | L220 | Nothing is sent for 97151 Services / Staffed 97153 / X 97153 until the CR label-replacement test in [G18]. | RETIRED | Decision 13 (2026-11-20) — Test ran 11/20. |
| 05 CLB-007 | L384, L608, L383 | 11/18: the Active / Inactive label is held until the label test; nothing is sent for `case_status`. | RETIRED | Decision 13 (2026-11-20) — Guide text out of date. |
| 05 CLB-024 | L222, L609, L384, L1292, L1334 | Pending 97151 Services `1156742`: do not create, do not send, do not require. | RETIRED | G19 (11/19) over L609 / L384 — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`; counts are all 2,883 production Cases, not only linked ones): `Pendin… |
| 05 CLB-025 | L222, L609, L384 | Pending 97153 Services `1156744`: do not create, do not send, do not require. | RETIRED | G19 — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`; counts are all 2,883 production Cases, not only linked ones): `Pending 97153 Services` is stil… |
| 05 CLB-026 | L222, L609, L384 | Starting 97153 Services `1156745`: do not create, do not send, do not require. | RETIRED | G19 — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`; counts are all 2,883 production Cases, not only linked ones): `Starting 97153 Services` is sti… |
| 05 CLB-036 | L605, L384 | The old values `Staffed` and `X Staffed` no longer exist and get no label. | RETIRED | L605 (11/06) — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`; counts are all 2,883 production Cases, not only linked ones): the 10 production optio… |
| 05 CLB-041 | L619 | Stage context: Intake Complete → `Pending 97151 Services`. | RETIRED | L611 "reference only"; G19 L222 makes the value label-less — Not integration logic. A Case at Intake Complete now gets **no** staffing label in CR (CLB-024). |
| 05 CLB-042 | L621 | Stage context: Initial Assessment, Pending IA Auth, IA in Process, Pending Ongoing Auth → `97151 Services`. | RETIRED | L611 reference only — The integration side is CLB-021. |
| 05 CLB-043 | L623 | Stage context: IA Complete, Service Ready w/Start Date → `Starting 97153 Services`. | RETIRED | L611; G19 L222 — No CR label now (CLB-026). |
| 05 CLB-044 | L625 | Stage context: Service Ready → `Pending 97153 Services`. | RETIRED | L611; G19 L222 — No CR label now (CLB-025). |
| 05 CLB-045 | L627 | Stage context: Restaffing Service Ready → `Staffed 97153` with a Primary BT 1, else `X 97153`. | RETIRED | L611 reference only — Integration side: CLB-022, CLB-023. |
| 05 CLB-046 | L629, L735, L1496 | Restaffing-BCBA AND BT Needed = `X 97153`. | RETIRED | L611 reference only — Replaces L653 ("expect Active only"). |
| 05 CLB-047 | L655 | Paused carries `X Staffed`. | RETIRED | L629 / L1496 (Sara, 11/06): Paused has no staffing label — |
| 05 CLB-048 | L651 | Restaffing-BCBA AND BT Needed: expect Active only (no staffing label). | RETIRED | L629 (X 97153) — |
| 05 CLB-049 | L615 | Lead age buckets: Hot 0–30 days, Warm 31–90, Cold 91+. | RETIRED | G19 L228 (stay in HubSpot) — G19 cite corrected L226 -> L228. HubSpot-side only. |
| 05 CLB-067 | L234 (employees only), L218, L389 / L67… | Case `location` = New Mexico → client state label. | DEFERRED | **Deferred** (Zeke, 2026-11-23: "These are pending the client beginning work in these states."; package item 11) — Production read 2026-11-24 (Zeke, `prod-reads-output-2… |
| 05 CLB-068 | as CLB-067 | Case `location` = Virginia → client state label. | DEFERRED | Deferred, as CLB-067 — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`; counts are all 2,883 production Cases, not only linked ones): the production… |
| 05 CLB-073 | L666, L386 | School `1052688`: no HubSpot option yet; add when needed. | DEFERRED | L666 (11/09 Zeke: "No HubSpot options added for now") — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`; counts are all 2,883 production Cases, not o… |
| 05 CLB-074 | L666, L386 | Clinic `1052655`: no HubSpot option yet. | DEFERRED | L666 — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`; counts are all 2,883 production Cases, not only linked ones): no Clinic option in production. |
| 05 CLB-081 | L673, L387 | `insurance_primary` = Aetna + `location` New York → Aetna NY `1082497`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. ID from `cr-catalog-snapshot.json` (guide gives no ID). |
| 05 CLB-082 | L674, L387 | Cigna + New York → Cigna NY `1082498`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. ID from the catalog snapshot. |
| 05 CLB-083 | L674, L387 | Cigna + Colorado → Cigna Colorado `1124249`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. ID from the catalog snapshot. |
| 05 CLB-084 | L675, L387 | Medicaid FFS + New York → Medicaid NY `1052532`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. The only funding rule whose input was exercised live. |
| 05 CLB-085 | L675, L387 | Medicaid FFS + New Jersey → Medicaid NJ `1124247`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-086 | L675, L387 | Medicaid FFS + Colorado → Medicaid Colorado `1124248`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-087 | L675, L387 | Use `location`, not `n1_what_type_of_insurance` ("Medicaid FFS - NY" stores Medicaid FFS), to resolve the state of a funding label. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. `n1_what_type_of_insurance` is still read for the physician pair (C31, another slice). |
| 05 CLB-088 | L676, L388 | `insurance_primary` = Beacon-Carelon → Carelon `1107648`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. Client Carelon is `1107648` ("Carelon " under Funding Source), not the employee onboarding Carelon `1132654` (catalog snapsho… |
| 05 CLB-089 | L676, L388 | NY State Empire-Carelon → Carelon `1107648`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-090 | L676, L388 | Emblem HMO-Carelon → Carelon. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-091 | L676, L388 | Emblem non HMO-Carelon → Carelon. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-092 | L676, L388 | Unicare Commercial-Carelon → Carelon. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-093 | L676, L388 | Providence-Carelon → Carelon. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-094 | L676, L388 | Anthem NY Commercial-Carelon → Carelon. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-095 | L676, L388 | Child Health Plan-Carelon → Carelon. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-096 | L676, L388 | Independence Health Association-Carelon → Carelon. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-097 | L677, L388 | Anthem NY Commercial-Carelon stays with Carelon, not Anthem BCBS. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-098 | L677, L388, L733 | `insurance_primary` = Anthem BCBS → Anthem BCBS `1052620`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-099 | L678, L388, L733 | `insurance_primary` = UHC → UHC `1052534`. | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. The "never sent" check has a PLANNED step. |
| 05 CLB-100 | L679, L389, L733 | Aetna in New Jersey: no CR label; "What should CR show?" | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. Was pending in the guide; moot since G19. |
| 05 CLB-101 | L679, L389 | Cigna in New Jersey: no CR label (pending decision). | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-102 | L679, L389 | Aetna in Colorado: no CR label (pending decision). | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-103 | L679, L389 | `insurance_primary` = Other: no CR label (pending decision). | RETIRED | G19 L226 — G19 cite corrected L224 -> L226. |
| 05 CLB-133 | L664, L391 | Contact fan-out queues the Case when the Guardian Contact changes (state label CL1). | RETIRED | [R] Source corrected: GER-CONTACT L452 places label mappings outside the Contact requirements; the state label follows the Case `location` (L664, L391). The fan-out runs only on a Contact webhook message (contactFanOutWorkflow.mjs:1-10, 655b385); sandbox Contact workflow pending (O-21). K1 does not… |
| 06 LBL-006 | L686 ("New Mexico / Virginia — skip for… | BCBA `location` = `New Mexico` → NM Employee `1157030` (G19 L234: "send NM Employee … same rule as CO Employee"). | DEFERRED | **Zeke 2026-11-23, PKG B2 item 11 (L661-672): "These are pending the client beginning work in these states." Deferred.** G19 L234 had replaced the "skip" of L686/L413. —… |
| 06 LBL-007 | L686; L413; L234 | BCBA `location` = `Virginia` → VA Employee `1157031`. | DEFERRED | Zeke 2026-11-23, PKG B2 item 11: deferred — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): 2 BCBAs hold Virginia. No sandbox row sets Virginia on… |
| 06 LBL-041 | L693, L418 (11/17 add-only); L1734 | "Until the CentralReach label test is run, labels are only added, never removed." | RETIRED | **Decision 13 (2026-11-20, BP L150): label hold lifted after the first-hand label test (BP L215-225: the POST replaces the whole set).** — Guide text still says add-only… |
| 06 LBL-050 | L700; L439; L441 ("Do not send NM Emplo… | BT/RBT `location` = `New Mexico` → NM Employee `1157030`. | DEFERRED | Zeke 2026-11-23, PKG B2 item 11: deferred — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): 0 BT/RBTs hold New Mexico. |
| 06 LBL-051 | L700; L439; L441; L234 | BT/RBT `location` = `Virginia` → VA Employee `1157031`. | DEFERRED | Zeke 2026-11-23, PKG B2 item 11: deferred — Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): 0 BT/RBTs hold Virginia. Deferred behaviour test is LBL… |
| 06 LBL-027 | L691; L416; L417; L692 (11/09 IDs) | `ny_insurance_labels` contains `Aetna-NY` → Aetna `1107649` (stateless). | DEFERRED | Guide L417: "Confirm how the NY and CO commercial options map to the stateless labels." Waiting on United Care (OPEN-ITEMS row 8). RG gap 17; PKG F gap #17. [Recency 11/24] Not built by decision (d25, Q21, P25); not blocking go-live. Test: no label is sent for these credential options. |
| 06 LBL-028 | L691; L416; L417 | `ny_insurance_labels` contains `Cigna-NY` → Cigna `1107650`. | DEFERRED | As LBL-027. [Recency 11/24] Not built by decision (d25, Q21, P25); not blocking go-live. Test: no label is sent for these credential options. |
| 06 LBL-029 | L691; L416; L417 | `ny_insurance_labels` contains `Carelon-NY` → Carelon `1132654`. | DEFERRED | As LBL-027. [Recency 11/24] Not built by decision (d25, Q21, P25); not blocking go-live. Test: no label is sent for these credential options. |
| 06 LBL-030 | L691; L692 (original "no CR label", then 11/09 stateless la… | `co_insurance_labels` contains `Aetna-CO` → Aetna `1107649`. | DEFERRED | [P] Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): `co_insurance_labels` `Aetna-CO` on 11 BCBAs. L692 first says "(no CR label)"; its 11/09 note gives the stateless IDs; L417 asks for confirmation. [Recency 11/24] Not built by decision (d25, Q21, P25); not blocking go-live. T… |
| 06 LBL-031 | L691; L692; L417 | `co_insurance_labels` contains `Cigna-CO` → Cigna `1107650`. | DEFERRED | [P] Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): `Cigna-CO` on 3 BCBAs. [Recency 11/24] Not built by decision (d25, Q21, P25); not blocking go-live. Test: no label is sent for these credential options. |
| 06 LBL-032 | L691; L692; L417 | `co_insurance_labels` contains `Carelon-CO` → Carelon `1132654`. | DEFERRED | [P] Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): `Carelon-CO` on 2 BCBAs. [Recency 11/24] Not built by decision (d25, Q21, P25); not blocking go-live. Test: no label is sent for these credential options. |
| 06 LBL-033 | L691; L692 (CO `1107651`); L417 ("its exact HubSpot source… | `co_insurance_labels` Medicaid option → CO Medicaid `1107651`. | DEFERRED | [P] Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): the production Medicaid option is `MCD-CO`, on 48 BCBAs (324 blank). Nothing is sent while BLOCKED. Sandbox read today: the option is `MCD-CO` (options MCD-CO, Aetna-CO, Carelon-CO, Cigna-CO). Production option not read (no p… |
| 07 TRG-014 | L210 | Workday ID test uses `AZTEST-N-BT` / `AZTEST-N-BCBA`, new each round. | RETIRED | Zeke 2026-11-23, verbatim: "Make the workday id radom 7 digits." (matrix Rounds R-WD; RL L369); Pkg item 15 (7-digit check) makes AZTEST values an `error` — Override quo… |
| 07 TRG-017 | L214 | Not yet tested whether CR accepts "#" in a name; if rejected, drop "#" and note. | RETIRED | "RN" names adopted because HubSpot refused "#" (matrix) — Replaced by the "RN" convention. Guide update G-03. |
| 07 TRG-074 | L280 | In production the checkbox is set only on confirmed records; the production checkbox is chosen at go-live. | RETIRED | Pkg D18 (2026-11-23 fifth set): two properties `centralreach_creates_only` / `centralreach_updates_only`; D18 c (2026-11-24): "creates" workflow ticks only post-cutover… |
| 07 TRG-092 | L284 | (History) "Not built yet … Code today fails a blank Workday ID with a sync error." | RETIRED | built (BP 9.1 BR2 built 1) — Stale text. Guide update G-06. |
| 07 TRG-103 | L321 (11/17 Danny) | An employee create needs a filled `workday_id`; blank → held `waiting`. | RETIRED | Replaced 11/17 by Zeke (same line; L270) — |
| 07 TRG-144 | L453, L409 | BCBA personal email is read from the associated Contact (type 17 / sandbox 191). | RETIRED | Decisions 42, 44, 50: BCBA `personal_email` on the record; K3 retired — Guide update G-07. |
| 07 TRG-179 | L850 | BCBA `ny_medicaid__status` "Credentialed" stores `Credentialing`. | RETIRED | not read (L419 uses label fields) — Not read by the integration. |
| 07 TRG-183 | L840 | BT/RBT `entered_in_workday` "Yes- Active" stores `true`. | RETIRED | not read (L272) — Not read by the integration. |
| 07 TRG-192 | L874 | New Mexico / Virginia: skip for now. | DEFERRED | G19 L234 (send NM/VA Employee when used); then deferred by Zeke 2026-11-23 "until the client works in those states" (Pkg item 11) — Pkg B2 item 11. |
| 07 TRG-194 | L880 | Open with UC: Pessy on the labels; Sara on Yes - Generic / No- Made Inactive. | RETIRED | Answered 11/14 (L818) and 11/18 (L832) — |
| 07 TRG-196 | L892, L901 | BCBA personal email sync property. | RETIRED | Decision 50: `personal_email` on the record — |
| 07 TRG-198 | L898, L393 | Copy workflow from the additional service-address field into `if_services_will_be_in_more_than_one_location__list_the_other_address`. | RETIRED | Pkg item 5 + guide insert D (approved 2026-11-24, not written): no copy workflow is needed — Guide update G-08 (insert D). |
| 07 TRG-199 | L899 | `current_primary_bt` may need a workflow or custom-code action. | RETIRED | Not needed: names from associations (BP 4.14) — |
| 07 TRG-204 | L947 | BCBA `full_name` refreshes automatically; sending it causes updates. | RETIRED | GER-REQ L339: names come from `first_name` + `last_name`; `full_name` is not sent — |
| 07 TRG-206 | L953-959 | Waiting on UC: Hot/Warm/Cold from creation; the 1 PM switch for Colorado; Restaffing SR w/Start Date; which stages stay blank. | RETIRED | Answered: G19 L228-230 and GHLOG L1278 — |
| 07 TRG-207 | L961 | Build the mapping by value; hold going live with the label part until UC answers. | RETIRED | G19 (11/19); label test 11/20 — |
| 07 TRG-222 | L1060 | Case refresh triggers on `hubspot_owner_id`. | RETIRED | item 6 (P16; decision 39 superseded) (C10 reads `care_coordinator_name`); Pkg D14: production triggers on `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`… [Recency 11/24 Retired by item 6 (P16), not "Decision 39".] |
| 07 TRG-282 | L1728 | Case History Log reuse only after verifying the sandbox equivalent and categories; never a detector; no raw values. | DEFERRED | BP 13 "Optional: destination audit, Case History Log" — Optional; not in scope (BP Stage 9 note). |
| 07 TRG-299 | L1734 | Labels are add-only for now: no documented remove call; replace/remove rules wait for a CR test. | RETIRED | Label test 2026-11-20: the POST replaces the set; managed sender (BP BR19, decisions 13, 14) — Guide update G-10. |
| 07 TRG-306 | L1738 | Sandbox start needs the checks, the test-record segment on every webhook workflow and the poller disabled. | RETIRED | 11/18: the record gate makes the poller safe; order build → plan → deploy stopped → test — "Poller disabled" replaced by the record gate (same line, 11/18). |
| 07 TRG-141 | L455 | Production Contact workflow: Guardian name, email and phone (and verify Contact-synced staff fields). | RETIRED | Cutover (O-21, BP 9.6). [Recency 11/24] RETIRED for the Guardian half (R02): replaced by the Case trigger list. The production Case refresh workflow triggers on `guardian_first_name`, `guardian_last_name`, `email`, `phone` and `location` (d51; Ruling A deploys it from the sandbox; CASE-170). No pro… |
| 07 TRG-142 | L455, L860 | Sandbox Contact workflow (the "4th ongoing workflow") sends a Contact webhook. | RETIRED | [A] No Contact webhook has ever reached this app in the retained window. O-21: whether the sandbox Contact workflow exists. [Recency 11/24] Optional code (R02): the 4th (Contact) workflow is not a requirement for the Guardian fields; no Contact webhook is needed. Offline only; live only if a Contac… |
| 07 TRG-159 | L822 | It is 4 objects: watch Contact changes for Contacts linked to a gated record. | RETIRED | [Recency 11/24] RETIRED: both halves superseded (R02): the Guardian values reach the Case through HubSpot's property sync, and the integration reads no Contact value. |
| 07 TRG-245 | L1119 | BCBA refresh triggers on `nj_insurance_labels`. | DEFERRED | Decision 25 / RG B17. [Recency 11/24] Deferred (d25, Q21): credential labels not built, not blocking. |
| 08 GC-018 | none (never in guide) | Option 1 gate checkbox `sync_to_centralreach` kept by workflows. | RETIRED | Superseded PKG fifth set (11/23) — Kept for traceability; guide never named it. |
| 08 GC-019 | L280 ("one app setting names a HubSpot… | BP decision 20 (11/20): production gated by one checkbox named in `SYNC_RECORD_GATE_PROPERTY`. | RETIRED | Superseded PKG D18 (11/23) — GID insert B appends the 11/23 choice to L280. |
| 08 GC-020 | L280 ("In production the checkbox is se… | A person ticks the production checkbox on confirmed records. | RETIRED | Superseded PKG sixth set rec. 4 (workflow ticks new records; a person ticks reviewed existing ones) — GID insert A bullet 3. |
| 08 GC-024 | L342 | BP decision 48 (BCBA DOB from `dob`). | RETIRED | Superseded PKG item 1 (11/23) — |
| 08 GC-035 | L393, L898, L901 | The questionnaire copy workflow into `if_services_will_be_in_more_than_one_location__list_the_other_address` is not needed; the integration… | RETIRED | PKG item 5 (Zeke "please let me know if this is needed"; CF §12.3) — GID insert D. GH29 L901 checklist item also retired. |
| 08 GC-043 | L369, L517 | `client_service_hours_total` leaves the mapped list (weekly hours not sent). | RETIRED | PKG item 7 — Guide still says "Send … total weekly hours". |
| 08 GC-054 | L376 | Maladaptive (126207) sent as stored (", " join not built). | RETIRED | PKG item 17 dropped (Zeke "Yes to recommendation") — The ", " change is retired; guide L376 already matches the kept behaviour. |
| 08 GC-061 | L745 ("A format check in the integratio… | BP decision 22 (11/20): Workday ID note only, no format check. | RETIRED | Superseded PKG item 15 (11/23) — |
| 08 GC-064 | L234, L413, L439, L441, L686, L700, L741 | New Mexico: NM Employee 1157030 is not sent until the client works there; record gets `unmapped_work_state`. | DEFERRED | Zeke 11/23 "These are pending the client beginning work in these states." (PKG B2 item 11) — Production: 8 BCBAs hold New Mexico (EMP §7); guide L234 says "not being use… |
| 08 GC-065 | as GC-064 | Virginia: VA Employee 1157031 not sent until the client works there. | DEFERRED | Zeke 11/23 (PKG B2 item 11) — Production: 2 BCBAs hold Virginia. |
| 08 GC-070 | L276 ("the CR client read does not retu… | Item 23 (use B21's read in place of the Case lookup) is dropped. | RETIRED | PKG item 23 dropped — |
| 08 GC-091 | L204 | BP decision 36 (11/20): `phone_number__second_` dropped from the mapping (does not exist in production). | RETIRED | decision 36 — G20 L204 still sets `phone_number__second_ = 212-555-NN02`. |
| 08 GC-116 | L368, L515, L516 | Location #2 schedules (C18) are not sent. | RETIRED | PKG C "O-14, C18" (Zeke: "No code."; both properties filled on 0 of 2,882 Cases, CASE §7) — Added. Guide L368 still says "Use the corresponding Location #2 variant when… |
| 08 GC-117 | none (L370 / L518 name another total) | BP decision 40 (11/20): Total Assigned Hours reads `total_hours_btrbt_12`. | RETIRED | Superseded by BP decision 41 (11/21) — Added for traceability; BP row 40 says "Superseded by decision 41". |
| 08 GC-118 | L409, L453 | BP decision 42 (11/21): BCBA personal email reads the BCBA record's own `email` (Zeke: "Read the BCBA own email"). | RETIRED | Superseded by BP decision 50 (11/23, `personal_email`) — Added for traceability. |
| 08 GC-038 | L361, L510 | Until item 6: omit 138851, or keep decision 39 (`care_coordinator_name` → 138851). | RETIRED | PKG E25 waiting on Zeke. [Recency 11/24] Neither option: item 6 is built (P16) and 138851 is not omitted; decision 39 is superseded. |

## Appendix B. Every CONFLICT, NOT-BUILT, BLOCKED, MISSING-TEST and PENDING row (212)

Generated from the Status column of the eight slices, ordered by status then slice. Text shortened; the full row is in the slice file. These are the rows behind the gaps in section 3; PENDING rows are mostly cutover tasks and guide writes waiting on a person.

| Slice / Req # | Status | Guide line(s) | Requirement | States | Note (shortened) |
|---|---|---|---|---|---|
| 01 STF-018 | NOT-BUILT | L513 | Several 82 BCBAs, some holders and some not (mixed). | NY/NJ/CO (state-independ… | Was BLOCKED. Conflict, not only a pending answer: the package says the mixed case is "Built that way unless you say otherwise" (package L909; handoff "Waiting… [Recency 11/24: now NOT-BUILT (pending build, offline proof): question 26 answered, rule 7 built (P17).] |
| 01 STF-086 | NOT-BUILT | L555, L561, L365, L366 | Decision basis of item 10: Outgoing BT 1/2 join BT #1/#2 Name while the label is on the Case; 131308 order SUB 234 → Outgoing SUB 288 → Out… | NY/NJ/CO (state-independ… | Added. Package section A is titled "decided by Zeke", but no quoted Zeke words decide these rules, and the plan still waits on United Care for them. Question R… [Recency 11/24: now NOT-BUILT: item 10 confirmed ("these rules are rig", P23).] |
| 02 CASE-119 | CONFLICT | L372, L489 | "Dates read as YYYY-MM-DD and are **written at midnight UTC**" | All | Kept as CONFLICT, but the guide line it rests on (L489, G02 "API rules") is a HubSpot write rule; the integration writes no HubSpot date, and the client DateOf… |
| 06 LBL-009 | CONFLICT | L234 ("Do not invent a property or… | No new HubSpot property or stored value is created for NM/VA. | NM, VA | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): confirms the options exist on both objects (BCBA NM 8 / VA 2; BT/RBT 0 / 0). The conflict… |
| 07 TRG-284 | PENDING | L1714 | Use workflow triggers, not segment membership, for repeated change signals. | production | If the production workflows use segment membership as the trigger, repeated edits send no webhook. D18 c reads as a filter, not the trigger, but does not say s… [Recency 11/24: decided (Q24, P25); cutover check.] |
| 08 GC-106 | CONFLICT | L294, L1718 | Which governs production: L1718 "No production rollout is authorized" or Danny 11/14 "cleared the build to finish" (L294). | production | Already open with Zeke and Danny (RG D15); not re-asked. |
| 01 STF-013 | NOT-BUILT | L512, L363 | Typed-supplier fallback (no BCBA in 82/234/288/135): text trimmed, trailing commas removed, + " BCBA LBA" unless it already holds BCBA or L… | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-014 | NOT-BUILT | L513, L364, L552 | Grad Permit case: use association 82 to spot it; the reliable check is the 82 BCBA's `lba_licensure__ny` = `Grad Permit`. | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-015 | NOT-BUILT | L513, L364 | Grad Permit Holder marker on the Case: CR metadata 136052. "How the marker is carried ... remains pending." | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-016 | NOT-BUILT | L513, L415 | 131308 on a Grad Permit Case = the BCBA(s) on the holder's Grad Permit Supervisor link + " BCBA LBA"; the holder's own name is never sent. | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-017 | NOT-BUILT | L513 | A holder with no Grad Permit Supervisor link: 131308 left out (not sent, not cleared, saved hash kept), warning `grad_permit_supervisor_mis… | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-019 | NOT-BUILT | L513 | When the 82 BCBA's licence leaves Grad Permit or the 82 changes, the next Case sync clears 136052 and sends the BCBA's own name; a BCBA-onl… | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-026 | NOT-BUILT | L555, L988, L366 | Production Case → BCBA SUB BCBA = `234`. | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): type 234 "SUB BCBA (Supervising Status)" (same text as the sandbox label; the guide calls… |
| 01 STF-027 | NOT-BUILT | L988, L977 | Sandbox Case → BCBA SUB BCBA = `217`, labelled "SUB BCBA (Supervising Status)". | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-028 | NOT-BUILT | L555, L366 | SUB BCBA covers a Supervising BCBA on leave. Guide: "Does CR need the substitute?" (open). | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… [Recency 11/24 Restated (d55): the substitute question is answered.] |
| 01 STF-029 | NOT-BUILT | L555, L989 | Production Case → BCBA On Leave BCBA = `236`. | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): type 236 "On Leave BCBA (inactive)" confirmed (USER_DEFINED); CFG-P :133 matches. Status… |
| 01 STF-030 | NOT-BUILT | L989, L977 | Sandbox Case → BCBA On Leave BCBA = `233`, labelled "On Leave BCBA (inactive)". | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-033 | NOT-BUILT | L556, L990 | Production Case → BCBA Outgoing Supervising BCBA = `135`. | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): type 135 "Outgoing Supervising BCBA" confirmed (USER_DEFINED); CFG-P :132 matches. Status… |
| 01 STF-034 | NOT-BUILT | L990 | Sandbox Case → BCBA Outgoing Supervising BCBA = `253`. | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-035 | NOT-BUILT | L552, L556, L366 | Outgoing Supervising BCBA: "Leaving; not the active BCBA" (L556) vs "A BCBA marked Outgoing with no removal date is still active" (L552); "… | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… [Recency 11/24 Restated (d55): order 82 -> 234 -> 288 -> 135.] |
| 01 STF-036 | NOT-BUILT | not in guide (GP §8.4) | Production Case → BCBA Outgoing SUB BCBA = `288` (paired 289): a known role, not excluded; its removal signals the On Leave BCBA is back. | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): 288 "Outgoing SUB BCBA" confirmed (CFG-P :131). The paired 289 is the BCBA → Case directi… |
| 01 STF-037 | NOT-BUILT | not in guide (GP §8.4) | Sandbox Case → BCBA Outgoing SUB BCBA = `221` (paired 220). | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-038 | NOT-BUILT | not in guide | Outgoing SUB BCBA feeds 131308 only when no 82 and no 234. | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-058 | NOT-BUILT | L561, L997, L365 | Production Case → BT/RBT Outgoing BT 1 = `131`. | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): type 131 "Outgoing BT 1" confirmed (USER_DEFINED); CFG-P :134 matches. Status unchanged:… |
| 01 STF-059 | NOT-BUILT | L997 | Sandbox Case → BT/RBT Outgoing BT 1 = `244`. | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-060 | NOT-BUILT | L561, L365 | Outgoing BT 1: "Leaving. Still active until a removal date passes." | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… [Recency 11/24 Restated: Outgoing BT 1 joins BT #1 Name while labelled; the label is the signal (d55, P23).] |
| 01 STF-061 | NOT-BUILT | L561, L998 | Production Case → BT/RBT Outgoing BT 2 = `166`. | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): type 166 "Outgoing BT 2" confirmed (USER_DEFINED); CFG-P :135 matches. Status unchanged:… |
| 01 STF-062 | NOT-BUILT | L998, L979 | Sandbox Case → BT/RBT Outgoing BT 2 = `236`. | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-063 | NOT-BUILT | L561, L365 | Outgoing BT 2 joins BT #2 Name 138092 while the label is on the Case. | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 01 STF-070 | NOT-BUILT | L547, L415, L1004 | Production BCBA → BCBA "Grad Permit Supervisor (supervises this BCBA)" = `151`, read from the holder's side. | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): 151 "Grad Permit Supervisor (supervises this BCBA)" confirmed (CFG-P :137); 149 is the un… |
| 01 STF-071 | NOT-BUILT | L421, L1004 | Sandbox BCBA → BCBA Grad Permit Supervisor = `227`. | NY/NJ/CO (state-independ… | Status changed to NOT-BUILT: the rule (or ID) is not in deployed 655b385; it exists only in the uncommitted pending build (items 9/10) with offline tests in st… |
| 03 BCBA-140b | NOT-BUILT | L578, L416-417 | "Credentialed with … Aetna / CO Medicaid / Cigna" (G05 row title) and the NY/CO/NJ insurer options Aetna-NY, Cigna-NY, Carelon-NY, Aetna-CO… | all | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): `co_insurance_labels` = MCD-CO 48, Aetna-CO 11, Carelon-CO 2, Cigna-CO 3, blank 324 BCBAs… |
| 04 BT-148 | NOT-BUILT | L212 | After each round Zeke makes the round's employees inactive in CR and records HubSpot ID, CR ID and inactive date in `sandbox-test-log.md` | sandbox | A process step not done |
| 05 CLB-117 | NOT-BUILT | none (package item 12) | After `CR_LABEL_POST_UNCONFIRMED` the first queue retry waits at least 150 s (not 60 s); later steps unchanged (300, 900, 3600, 14400 s). | all | Was OFFLINE-ONLY. The deployed code (655b385) retries at 60 s: it is NOT-BUILT where the end-to-end test runs. The pending build adds it (working tree retry.mj… |
| 05 CLB-118 | NOT-BUILT | none (package item 21) | A label-only retry: when the only failure was the label confirmation, save the hashes clean without the `labels` key so the retry does not… | all | Was DEFERRED. Zeke decided it: 'Yes to all please' (package L73, L1136-1142); only its timing is later ('before the existing-records phase', the reviewer's tim… |
| 05 CLB-160 | NOT-BUILT | not in guide; package item 20 | A run queued by the daily sweep gets at most 1 queue retry; a sweep run that ends `CR_LABEL_POST_UNCONFIRMED` gets one retry, then "Retries… | all | Added. Item 20 keeps the full schedule only for `SYNC_IN_PROGRESS` and `CR_CREATE_PENDING` (package L1155), not for an unconfirmed label POST. With item 12's 1… |
| 06 LBL-084 | NOT-BUILT | PKG item 21 (L1165-1173; H4 L1142) | After `CR_LABEL_POST_UNCONFIRMED`, when every other write succeeded, the run's hashes are saved as clean **without the `labels` key**, so t… | all | Added. Changes what a label retry costs and does (item 12 changes only the wait). Needs its own offline tests and a live check (Log `changedFieldNames` = label… |
| 07 TRG-168 | NOT-BUILT | L834 | Monitoring: a HubSpot report of records the integration wrote in the last 24 hours (`integration_last_write`). | all | Gap (c): Zeke builds it (sandbox and production 9.6). |
| 07 TRG-169a | NOT-BUILT | L274, L1732 | HubSpot failures report on `last_sync_status` = `error`, showing `last_sync_error`: Case. | all | Gap (c). |
| 07 TRG-169b | NOT-BUILT | L274, L1732 | Failures report: BCBA. | all | Gap (c). |
| 07 TRG-169c | NOT-BUILT | L274, L1732 | Failures report: BT/RBT. | all | Gap (c). |
| 07 TRG-170 | NOT-BUILT | L1732 | A second view lists records with `last_sync_status` = `waiting`. | all | OPEN-ITEMS L69. Gap (c). |
| 07 TRG-297 | NOT-BUILT | Pkg H4 item 20 | `dailySweep` messages get at most 1 queue retry; webhooks and polls keep 5; `SYNC_IN_PROGRESS` and `CR_CREATE_PENDING` keep the full schedu… | all | Before cutover (Pkg H4). |
| 07 TRG-298 | NOT-BUILT | Pkg H4 item 19 | A daily CR call count (saved KQL) and an Azure alert above 3,000 calls a day. | all | Before cutover. |
| 08 GC-027 | NOT-BUILT | L382, L539 | `referral_source` = Other and Case `referral_other` ("Referral - Other", sync of Contact `other___hear_about_us_`) filled → send that text… | all | Ships after Zeke creates `referral_other` in production (PKG D9). |
| 08 GC-037 | NOT-BUILT | L361, L510 | Care Coordinator (138851) reads `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status` (ready → "First La… | all | Waits on PKG D7. GID insert A bullet 4 names the properties and the trigger. [Recency 11/24 Built (P16); production deploy waits for the properties.] |
| 08 GC-067 | NOT-BUILT | L1730 ("retries at 1 minute … 4 ho… | `dailySweep` messages get 1 queue retry; pollers and webhooks keep 5; `SYNC_IN_PROGRESS` and `CR_CREATE_PENDING` keep the full schedule. | all | Due before cutover (PKG H4). |
| 08 GC-068 | NOT-BUILT | L1730 | Label-only retry (smaller variant): save hashes clean without the `labels` key, then throw. | all | Due before the existing-records phase. |
| 03 BCBA-137 | BLOCKED | L582, L412, L773 | Care Coordinator: `hubspot_owner_id` resolved via `GET /crm/v3/owners/{id}` (needs `crm.objects.owners.read`) → CR employee field | all | Blocked on pkg D8 / O-17 (CR field). Not re-asked |
| 03 BCBA-184 | BLOCKED | L773, L412, L582 | `crm.objects.owners.read` scope on the production app (for the BCBA Care Coordinator) | production | Only needed once B11 is built (BCBA-137) |
| 04 BT-053 | PENDING | L250, L757 (q3) | Confirm with United Care that Entered in CentralReach = Yes is still the right create signal for production | prod | RG D16 (Sara via Danny) [Recency 11/24: decided (d8, P24): the United Care answer is non-blocking.] |
| 04 BT-143 | BLOCKED | L747 | One Workday ID on two records: 2002628 (BT/RBT 60175644722 and BCBA 60455522203), 1034820 (BT/RBT 45909102183 and BCBA 63969342976); what h… | prod | RG D10 (Danny / United Care); EMP §6 |
| 07 TRG-021 | PENDING | L248 | Open: does the BCBA follow the same Workday steps and alerts as BT/RBT? | all | RG D16 (Sara via Danny). [Recency 11/24: integration rule decided (d3); only the United Care process answer is outstanding.] |
| 07 TRG-022 | PENDING | L250 | Open: is Entered in CentralReach = Yes still the right create signal? Nothing changes until Sara answers and Zeke decides. | all | RG D16. The production "creates" workflow (Pkg D18 c) assumes Yes stays. [Recency 11/24: decided (d8, P24).] |
| 07 TRG-065 | BLOCKED | L278 | Open: can CR hold two employees with one Workday ID? | n-a | RG D10 (O-23, Danny / UC). |
| 07 TRG-084 | PENDING | Pkg D18 c | Production "creates" workflow per object ticks `centralreach_creates_only` only on records created after cutover with Entered = Yes and no… | production | Pkg E question 24 (no further hold for new post-cutover records?) waits on Zeke. [Recency 11/24: question 24 closed (P24); cutover task.] |
| 07 TRG-095 | PENDING | L286 | Waiting on Sara: does the Workday ID exist before the CR step (BCBA still open)? | BCBA | RG D16 / G18 L248. [Recency 11/24: integration rule decided (d3); only the United Care process answer is outstanding.] |
| 07 TRG-243 | BLOCKED | L1117 | BCBA refresh triggers on `hubspot_owner_id`. | all | Pkg D8 (Danny / UC create the CR field). |
| 07 TRG-285 | BLOCKED | L1718 | Sandbox first: three ongoing-update workflows as inactive drafts, then test; "No production rollout is authorized". | all | RG D15 / OPEN-ITEMS row 8 (Q19): which governs. [Recency 11/24 Likely settled by Ruling B (P14); needs Zeke's confirmation.] |
| 07 TRG-323 | BLOCKED | Pkg H6 H-Q6 | Should the daily sweep leave out records whose status is `error`? | all | Pkg H-Q6 waits on Zeke. |
| 08 GC-016 | BLOCKED | L416–417, L578 | Existing-records review also checks BCBA label NY Medicaid 1107647 (CR holds it, HubSpot lacks MCD FFS-NY → first update removes it). | NY | PKG E8 open with Zeke. |
| 08 GC-041 | BLOCKED | L412, L582 | BCBA Care Coordinator (B11): no CR employee coordinator field exists; needs a new CR field first. | all | Waits on Danny / United Care creating the CR field (D8). |
| 08 GC-059 | BLOCKED | none | One JSON line per log call; KQL files rewritten with it. | all | PKG E17 waiting on Zeke. |
| 08 GC-073 | BLOCKED | none | Should the daily sweep leave out records whose `last_sync_status` = `error`? | all | PKG H-Q6 open with Zeke. |
| 08 GC-123 | BLOCKED | L373, L521 (GID inserts C / C2) | Whole-address-in-street rule: any service or home street with a comma that ends in five digits is taken as a whole one-line address, so the… | all | Added. Waiting on Zeke (O-59); not re-asked. Insert C does not describe this sub-rule. [Recency 11/24 Split a whole street only when a state precedes the ZIP (P22). Status left BLOCKED: no target status in the audit.] |
| 01 OBJ-021 | MISSING-TEST | L464, L401 | BCBA pipeline "Pipeline": the rules apply in every stage, Applied through Hired, Paused, Resigned and Terminated (production). Staff are ne… | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): production BCBA pipeline `855656544` "Pipeline": Applied 1275899417, Contacted 1275899418… |
| 01 OBJ-022 | MISSING-TEST | L421, L975 | Sandbox BCBA pipeline: "use the verified sandbox pipeline and stage IDs". | NY/NJ/CO (state-independ… | No integration logic needs these IDs; a stage-move row (Gap a7) would use them. |
| 01 OBJ-027 | MISSING-TEST | L465, L428–429, L441 | BT/RBT pipeline "Hiring Process": linked records keep sending mapped changes in every stage (including Yes - Generic and No- Made Inactive)… | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): production BT/RBT pipeline `822050166` "Hiring Process" (13 stages, four of them Apploi);… |
| 01 OBJ-028 | MISSING-TEST | L465, L428 | Production BT/RBT stage Resigned `1299798139` (documented). | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): Resigned `1299798139` confirmed. Implied rule: a linked BT/RBT in Resigned still syncs; n… |
| 01 OBJ-029 | MISSING-TEST | L465, L428 | Production BT/RBT stage Terminated `1299798140`. | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): Terminated `1299798140` confirmed. As OBJ-028. |
| 01 OBJ-030 | MISSING-TEST | L443, L975 | Sandbox BT/RBT pipeline: use the verified sandbox pipeline and stage IDs. | NY/NJ/CO (state-independ… |  |
| 01 OBJ-031 | MISSING-TEST | L443, L975 | Sandbox BT/RBT stage Resigned. | NY/NJ/CO (state-independ… |  |
| 01 OBJ-032 | MISSING-TEST | L443, L975 | Sandbox BT/RBT stage Terminated. | NY/NJ/CO (state-independ… |  |
| 01 STF-001 | MISSING-TEST | L545, L367 | Change signal `supervising_bcba_name`: workflows trigger on it (associations cannot trigger); a change re-reads the associations. | NY/NJ/CO (state-independ… | Was BLOCKED. Decision 51 (BUILD-PLAN L188, Zeke: "I have the re-enrollment triggers already set up for each of the workflows. These are set up.") means nothing… |
| 01 STF-002 | MISSING-TEST | L545 | Change signal `ia_bcba_name` (as STF-001). | NY/NJ/CO (state-independ… | As STF-001 (was BLOCKED). The planned relabel row (BR17 relabel) runs by the poll only. |
| 01 STF-003 | MISSING-TEST | L545 | Change signal `reassessment_bcba_name` (as STF-001). | NY/NJ/CO (state-independ… | As STF-001 (was BLOCKED). |
| 01 STF-004 | MISSING-TEST | L545 | Change signal `current_primary_bt` (as STF-001). | NY/NJ/CO (state-independ… | As STF-001 (was BLOCKED). |
| 01 STF-005 | MISSING-TEST | L545 | Change signal `current_primary_bt_2` (as STF-001). | NY/NJ/CO (state-independ… | As STF-001 (was BLOCKED). |
| 01 STF-078 | MISSING-TEST | L232 | If more than one Contact has Parent/Guardian, only the first is sent. | NY/NJ/CO (state-independ… | Contact slice owns it; listed because it defines the type 3 read. Which Contact HubSpot's property sync picks is not documented. |
| 01 STF-083 | MISSING-TEST | L545, L367 | Watch the staffing change signals and re-read associations. The item 9/10 roles (SUB 234/217, Outgoing SUB 288/221, Outgoing Supervising 13… | NY/NJ/CO (state-independ… | Open question 1 is closed (P25). [Recency 11/24 Open question 1 closed (P25).] |
| 01 SBX-002 | MISSING-TEST | L975 | "Production was not queried live"; the crosswalk is not a complete audit. Production IDs must be verified before they are relied on. | NY/NJ/CO (state-independ… | Was moved MISSING-TEST → PROVEN-LIVE by the edit; moved back. The production read is a definition read, not a run: it verifies the IDs (all match, output "## 0… |
| 02 CASE-053 | MISSING-TEST | L508, L232 | Only the **first** Parent/Guardian Contact is sent when a Case has two | All | Which Contact a HubSpot property sync picks with two Guardians is unverified (assumption A-6) |
| 02 CASE-162 | MISSING-TEST | L391, L495 | Keep the 34 archived "Prior" fields out of the map | All | Low risk: the request list is explicit |
| 02 CASE-171 | MISSING-TEST | L392, L394 | Sandbox: verify which mapped Case properties trigger the Deal webhook | All | Zeke, 2026-11-24, verbatim: "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)". His confirmation is recorded; the repo does not say which properties are on… |
| 02 CASE-200 | MISSING-TEST | L212 | After each round Zeke makes the round's client inactive on the CR screen; the Case record ID, CR contact ID and inactive date go in `sandbo… | All | Added (G20 line with no row). |
| 04 BT-012 | MISSING-TEST | L272, L276 (3), L442 | A change to `workday_id` or `btrbt_in_cr_checklist` sends a webhook (HubSpot workflow trigger) so the ID check re-runs | sandbox + prod | Zeke, 2026-11-24, verbatim: "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)"; recorded as his confirmation (the list is not in the repo). Status unchange… |
| 04 BT-059 | MISSING-TEST | L322, L428, L465 | Updates apply in every Hiring Process stage (no BT/RBT stage exclusion; Resigned 1299798139 and Terminated 1299798140 keep syncing) | all | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): production pipeline `822050166` "Hiring Process": Resigned `1299798139`, Terminated `1299… |
| 04 BT-065 | MISSING-TEST | L442, L443, L1708 | The sandbox BT/RBT refresh workflow sends a webhook when a mapped field changes on a linked BT/RBT | sandbox | Zeke, 2026-11-24, verbatim: "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)"; recorded as his confirmation (the list is not in the repo). Status unchange… |
| 04 BT-069 | MISSING-TEST | L442, L455, L436, L595, L342 | The same for the other Contact-held values: `phone`, `city`, `state_dropdown`, `zip`, `email`, `date_of_birth` (gender: R1-U1 Push 1 line 7) | all |  |
| 04 BT-113 | MISSING-TEST | L337 (BP 5.5 / BR22 analogue) | `ContactForm` is sent on a create only; an employee PUT never carries it | all | Create-only confirmed by Zeke (O-47 closed, BP L1044). The missing test is the employee-PUT half. |
| 04 BT-149 | MISSING-TEST | L214 | Check whether CR accepts "#" in a name | — | Low priority |
| 04 BT-151 | MISSING-TEST | L824, L1746, L442 | A mapped value that changes with no user edit reaches CR: `active_cases_count` is kept by the HubSpot automation "BT - Active Cases Sync" w… | all | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): `active_cases_count` is a plain stored number (not calculated), so an automation write is… |
| 05 CLB-040 | MISSING-TEST | L633, L230 | Do not reproduce the 5 AM / 1 PM schedule or the stage rules in the integration. | all | G19 cite corrected L228 -> L230. A negative rule. Gap (b) O3: a test that a `dealstage` change alone changes no label. |
| 05 CLB-130 | MISSING-TEST | L392 (GER-CASE production workflow… | A change to `location`, `specific_home_location`, `case_status` or `staffing_status` on a linked Case reaches Azure by the HubSpot Case wor… | all | Zeke, 2026-11-24, verbatim: "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)"; recorded as his confirmation (the list is not in the repo). Status unchange… |
| 05 CLB-151 | MISSING-TEST | L832 | A sandbox pass on the label logic: validate the property-to-label mapping with each current `staffing_status` value and the blank-value rem… | all (no state branch) | Added (L832 had no row). The missing piece is the blank-value removal (gap G1). |
| 05 CLB-161 | MISSING-TEST | L321; poller (intakePollerWorkflow… | A Case create that reaches Azure by the intake poller (Entered = Yes, unlinked) posts its labels the same way as a webhook create. | all | Added. With the 5-minute poll on and a webhook that lags 9 minutes, the R2 / R3 Case may arrive by the poll first; the round must log `source` and accept eithe… |
| 06 LBL-075 | MISSING-TEST | G17 L276 ("(2) While the record is… | Label changes are sent while an employee is `waiting` (temporary External System ID). | all | Gap (a)/(b). |
| 06 LBL-077 | MISSING-TEST | L420 (W3 trigger list lacks `co_in… | Every label source change reaches Azure by **webhook**: BCBA `location`, `assign_states`, `lba_licensure__ny`, `ny_insurance_labels`, `cr_b… | all | The edit moved BLOCKED → PLANNED; set to MISSING-TEST instead. Zeke's "done" removes the block, but no sandbox step yet proves the requirement: R1-U1 checks th… |
| 06 LBL-079 | MISSING-TEST | G11 L824; G17 L276 (3) | A label change missed by webhook and poll is caught by the **daily sweep** (inside the poller). | all | Gap (a) (low priority). |
| 06 LBL-082 | MISSING-TEST | L691 ("these are kept in sync by a… | A credential label change made by HubSpot's own workflow (payor status → `ny_insurance_labels`), with no hand edit of the label field, reac… | NY | Added. Low priority. Not checked: whether the maintaining workflow exists in sandbox 52311591. If it does not, this is production-only and is checked in the fi… |
| 06 LBL-085 | MISSING-TEST | PKG D18 c "The hand-off window is… | Production only: an employee created on the creates gate whose label POST is not confirmed gets its retry `skipped` (`record_gate`, `gate:… | all (production) | Added. Cross-slice (gating). Proposed check: in BR4-C, if the create ends `CR_LABEL_POST_UNCONFIRMED`, confirm the retry is `skipped` `gate: update`, and after… |
| 07 TRG-035 | MISSING-TEST | L272 | Workflows need a trigger on `workday_id` (BCBA and BT/RBT). | all | Was PLANNED with "BT/RBT path not recorded"; the logs show the sandbox BT/RBT workflow did not re-enrol on `workday_id`. Gap a22. Already waiting on Zeke: whic… |
| 07 TRG-036 | MISSING-TEST | L272 | Workflows need a trigger on the checklist (`btrbt_in_cr_checklist`, `bcba_in_cr_checklist`). | all | The sandbox BCBA workflow does not re-enrol on the checklist; BT/RBT unknown. Gap (a). |
| 07 TRG-124 | MISSING-TEST | L356, L404, L431, L862, L1268 | Keep the CR ID writeback properties out of the workflow triggers. | all | No check of the actual sandbox or production workflow trigger lists exists (decision 51). Gap (a)/(e). |
| 07 TRG-134 | MISSING-TEST | L392, L1040-1067 | Sandbox Case refresh workflow (W1-shaped) in 52311591 covers the mapped Case fields so that a field edit sends a webhook. | sandbox | Gap (a): Zeke wants the E2E run "with the webhook and the poller on"; today a Case edit reaches Azure only by the poll. RL L180 asks Zeke which triggers exist. |
| 07 TRG-136 | MISSING-TEST | L420, L1101-1127 | Sandbox BCBA refresh workflow covers the mapped BCBA fields. | sandbox | Gap (a). |
| 07 TRG-138 | MISSING-TEST | L442, L1069-1099 | Sandbox BT/RBT refresh workflow covers the mapped BT/RBT fields. | sandbox | Gap (a). |
| 07 TRG-151 | MISSING-TEST | L800 | A signal when the Case stage changes. | all | Gap (a): a stage change to Paused or Discharged on a linked Case (the Inactive label path). |
| 07 TRG-208 | MISSING-TEST | L1020-1026 | Each webhook workflow allows re-enrolment (W1–W6 "Re-enrollment: Yes"). | sandbox, production | Evidence added. Webhook times re-read; no BT/RBT re-enrolment in any log. Without re-enrolment a second change on one record sends no webhook. Gap (a1). |
| 07 TRG-226 | MISSING-TEST | L1067 | No eligibility condition in the workflow; watching a status/stage is a signal, not a gate. | all | Was PROVEN-LIVE "by design". "Entry workflows fire on creation" is not consistent across rounds; Zeke's trigger list (RL L180) would explain it. Azure-side eli… |
| 08 GC-103 | MISSING-TEST | L798–804, L1708 | A mapped-field edit on a linked record fires the entity's ongoing-update webhook (fast path). | all | Was "NO" / "not yet run": one edit-triggered webhook is proven (BCBA `workday_id`); a checklist tick is proven NOT to trigger one, which is R-36 in practice. S… |
| 01 RD-002 | PENDING | L308 | Rows shaded amber need a decision before they are built. | n-a | The text snapshot does not keep cell shading, so amber rows cannot be identified from it. Other slices must rely on the dated notes instead. See Assumption A6. |
| 01 RD-003 | PENDING | L310 | Rows shaded red point at a HubSpot field or option that does not exist yet. | n-a | Shading lost in the snapshot. Danny's 11/14 sweep (L294) says the mapped properties exist in production. |
| 01 RD-004 | PENDING | L312 | Unshaded rows are ready to build. | n-a | As RD-002. |
| 01 API-012 | PENDING | L475, L773, L777 | The production integration app holds `crm.objects.deals.sensitive.read` (and `.write` only if it writes them); without it the PHI fields ar… | NY/NJ/CO (state-independ… | Guide line corrected: L776 ("The HubSpot sandbox does not have sensitive property functionality ... Test is needed."), not L777. Author note: Guide L777: "Test… |
| 01 SBX-004 | PENDING | L549, L977, L985–1005 | Association limits per label decide which staffing cases can exist and be tested. Sandbox, read 2026-11-24: Case → Supervising 247, IA 223,… | NY/NJ/CO (state-independ… | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): the read returned labels only, not limits: production limits still unverified. Added. Two… |
| 01 STF-087 | PENDING | L392, L545 | Production Case refresh workflow triggers on the five staffing signals (Danny: "used as production triggers"); the production Case workflow… | NY/NJ/CO (state-independ… | Added. A cutover check, not a sandbox test. Without it a production staffing change reaches CentralReach only by the poll (if a rollup moves `hs_lastmodifiedda… |
| 02 CASE-025 | PENDING | L502, L826 | The 475 production Cases with a CR Client ID (122 without the box) sync without the box on the first run | NY, NJ, CO | Existing-records phase (D19); comparison method pending (D3) |
| 02 CASE-032 | PENDING | L276 | "81 of 100 sampled Client IDs not found by the CR read; check before linked Case updates are turned on" | NY, NJ, CO | Cutover task (D5) |
| 02 CASE-047 | PENDING | L358, L475, L773 | Sensitive Case properties (phi_*, `insurance_id_1/2`, `phi__policy_holder_dob`, `phi_diagnosis`) need `crm.objects.deals.sensitive.read`; w… | All | Production step 9.6 |
| 02 CASE-070 | PENDING | L361, L510 | Care Coordinator **email** to CR | All | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): `care_coordinator_email` exists (string/text). The CR side still has no email target and… |
| 02 CASE-072 | PENDING | L392 | Production Case sync workflow triggers on `care_coordinator_first_name`, `_last_name`, `coordinator_export_status`, not `hubspot_owner_id` | All | Cutover, with item 6 |
| 02 CASE-092 | PENDING | L364 | Data fix: `lba_licensure__ny` = Grad Permit on Dominique Plummer `45994302542` and Katie Vangraefschepe `61130820723` | NY | Without it 4 Cases get no marker |
| 02 CASE-169 | PENDING | L392 | Create the production Case entry workflow (W4 structure); the create path enforces Yes | All | Cutover; pkg E24 open |
| 02 CASE-170 | PENDING | L392 | Create the production Case refresh workflow (W1 structure) covering every mapped field (incl. phi_*, Guardian email and phone, the five sta… | All | Cutover step 9.6 |
| 02 CASE-187 | PENDING | L455 | Verify Contact-synced staff fields (address, phone, BT gender) propagate | All | Employee slices own it |
| 02 CASE-208 | PENDING | L502, L826, L280 | Production: a Case whose client is already in CR with `client_id_number` blank gets its Client ID written before its creates box is ticked… | NY, NJ, CO | Added. Cutover / existing-records phase. |
| 03 BCBA-051 | PENDING | L747 | Two production records share a Workday ID (2002628 on BT/RBT 60175644722 and BCBA 60455522203; 1034820 on BT/RBT 45909102183 and BCBA 63969… | production | United Care; handled in the existing-records phase (pkg D19). Not re-asked |
| 03 BCBA-053 | PENDING | L745, pkg D20 | Final confirmation of the 7-digit rule by Sara, and the fix of the malformed production values | production | Not re-asked |
| 03 BCBA-058 | PENDING | L244 | Workday ID alerts are a HubSpot workflow (1929214033), built for BT/RBT; the integration sends no alerts | n/a | BCBA half waits on United Care (L248, L757 q2). Not integration code |
| 03 BCBA-059 | PENDING | L248, L286, L743, L755, L757 q2 | Do BCBAs follow the BT order (CR first, Workday ID later)? Does the HubSpot check "Entered in CR cannot be set without a Workday ID" apply… | n/a | Danny 11/17 (L1400): every BCBA entered since August has a Workday ID; C14C L1446: 4 of 109 BCBAs with Entered = Yes have none |
| 03 BCBA-060 | PENDING | L757 q1, L755 | Does anything read the CR External System ID before the Workday ID is entered (payroll export, report)? | n/a | United Care still to confirm; Zeke's 11/20 note is recorded in BP |
| 03 BCBA-063 | PENDING | L280 | At go-live the team checks which employees are already in CR before employee creates are turned on (`ALLOW_EMPLOYEE_CREATE`, `PUT_ONLY_MODE… | production | Cutover task; method of comparison pending (pkg D3) |
| 03 BCBA-112 | PENDING | L342 (production clause), L753, L7… | Who fills BCBA `date_of_birth` and from where (onboarding vs Workday) | production | United Care; not re-asked |
| 03 BCBA-160 | PENDING | L420 | Create the production BCBA entry and linked-record refresh workflows (W6, W3 structure) covering all mapped fields, labels and associations | production | Zeke's cutover task |
| 03 BCBA-178 | PENDING | L252 | Up to 264 BT/RBT checklist ticks may send records at go-live | production | BT/RBT count; listed because the same mechanism applies to BCBA ticks |
| 03 BCBA-L08 | PENDING | REMAINING-GAPS table item 17 | Admin contact form puts label 1052549 "Admin" on every BCBA; not managed, so it stays | all | Not re-asked |
| 03 BCBA-194 | PENDING | L250, L571, L757 q3 | Is Entered in CentralReach = Yes still the right BCBA create signal now that staff no longer create employees in CR by hand, or an earlier… | all | Added as its own row (was only a note in BCBA-004 and Gaps e). With United Care / Sara; not re-asked |
| 04 BT-035 | PENDING | L280, L751 | The 6 hand-linked production BT/RBTs and every other employee already in CR get no create and no update until reviewed (existing-records ph… | prod | D19 |
| 04 BT-064 | PENDING | L442 | Production BT/RBT entry (W5) and refresh (W2) workflows built; cover every mapped field (gender, `state_home`, `active_cases_count` named),… | prod | Cutover (PKG "Before deploy" item 2) |
| 04 BT-086 | PENDING | L753, L757 (q6) | Where the BT/RBT date of birth comes from (HubSpot onboarding or Workday) | prod | United Care, via Danny |
| 04 BT-142 | PENDING | L745 | The malformed production BT/RBT Workday IDs (50160788279, 56690814034, 56693572653, plus a 32-character value, EMP §4) are corrected; Sara… | prod |  |
| 04 BT-144 | PENDING | L749, L753, L757 (q7) | `external_system_id` clean-up on BT/RBT 53650602843 and 56690993076 (not read by the integration) | prod | United Care |
| 04 BT-145 | PENDING | L755, L757 (q1) | Does anything read the CR External System ID before the Workday ID is entered | prod | The guide still lists it unanswered [Recency 11/24 Answered (O-1, closed 11/20).] |
| 04 BT-146 | PENDING | none in the guide (decision 50, 20… | BT/RBT `personal_email` → CR Meta 138069 | all | No such property in production or the sandbox (EMP §5) |
| 04 BT-156 | PENDING | L428, L465, L983 | Production routing: a webhook with objectTypeId `2-48354559` reaches the employee queue as a BT/RBT (production portal table) | prod | Production read 2026-11-24 (Zeke, `prod-reads-output-2026-11-24.md`): the production object type `2-48354559` exists and answers; routing itself is still a cut… |
| 05 CLB-050 | PENDING | L637 | Open with United Care: lead-age timing basis and Restaffing SR w/Start Date. | all | L637: "they do not change the instruction to read staffing_status". No integration effect. |
| 05 CLB-051 | PENDING | L639 | "TO CONFIRM IN PROD TESTING": Reassessment uses `staffing_status`. | all | A production check of HubSpot data, not code. No sandbox row. |
| 07 TRG-001 | PENDING | L194 | The repo copy `SANDBOX-TEST-PLAN.md` and the guide [G20] are kept the same. | all | The two now differ by Zeke's later decisions; the guide note waits on O-34 (Pkg D11). See Guide updates G-01. |
| 07 TRG-016 | PENDING | L212 | After each round Zeke makes the round's client and two employees inactive in CR; HubSpot ID, CR ID and inactive date go in `sandbox-test-lo… | all | None of client 5384589 or employees 5384530, 5384531, 5385357, 5385360 is recorded as made inactive (`sandbox-test-log.md` has only its empty header row; RL L4… |
| 07 TRG-019 | PENDING | L244 | Workday ID alerts are a HubSpot workflow (1929214033, production, off until Sara answers); the Azure integration does not send them. | n-a | Not an integration requirement; nothing to test in Azure. |
| 07 TRG-063 | PENDING | L276 | Open for production: 81 of 100 sampled Client IDs not found; check before linked Case updates are turned on. | n-a | Existing-records phase (Pkg D19, BP 9.5). |
| 07 TRG-085 | PENDING | Pkg D18 c | Production "promote after create" workflow: CR ID changes to known AND creates box true AND link property known → set `centralreach_updates… | production | Built at cutover. BR4-P only if Zeke builds it in the sandbox. |
| 07 TRG-086 | PENDING | Pkg D18 c, rec. 6 | Cutover: read-only production check that only the integration fills `central_reach_link_to_client`, `central_reach_record_link`, `central_r… | production | Cutover task (Pkg "Before deploy" item 2). |
| 07 TRG-087 | PENDING | Pkg D19 | Existing records: compare HubSpot with CR on the required properties and identifiers, list mismatches, UC confirms, then tick `centralreach… | production | Separate existing-records phase; method (export or API) pending (Pkg D3). |
| 07 TRG-091 | PENDING | L282 | Every CR record created in sandbox testing is a production CR record and a test record. | all | Inactivation not done. |
| 07 TRG-094 | PENDING | L284 | United Care's open answers block production only. | production | Governs RG D items. |
| 07 TRG-132 | PENDING | L392 | Production Case entry (W4-shaped) and refresh (W1-shaped) workflows cover every mapped field, label, staffing and association change, incl.… | production | Built by Zeke at cutover (BP 9.6). |
| 07 TRG-135 | PENDING | L420 | Production BCBA entry (W6) and refresh (W3) workflows cover every mapped field, label and association (examples absent: `first_name`, `last… | production | Cutover (BP 9.6). |
| 07 TRG-137 | PENDING | L442 | Production BT/RBT entry (W5) and refresh (W2) workflows cover every mapped field and label (examples absent: `gender`, `state_home`, `activ… | production | Cutover. |
| 07 TRG-164 | PENDING | L824 | If change detection cannot catch them, a HubSpot workflow can call the endpoint when they change. | all | Decided only after BR18 runs. |
| 07 TRG-165 | PENDING | L826, L854 | Records already in CR but never ticked (74 / 122 Cases with a CR Client ID): CR ID passes the gate for updates. | production | Existing-records phase. |
| 07 TRG-210 | PENDING | L1032 | Manual and automatic enrolment allowed. | all | HubSpot configuration; no integration behaviour. |
| 07 TRG-224 | PENDING | L1064 | W1 branch: send the webhook only when `client_id_number` is known. | sandbox (history), produ… | Production workflow design at cutover; the branch is harmless (Azure re-checks). |
| 07 TRG-236 | PENDING | L1096 | W2 branch: webhook only when `employee_id` is known. | all | As TRG-224. |
| 07 TRG-272 | PENDING | L1237 | Production workflows were not inspected; sandbox identifiers are not portable. | production | Cutover (BP 9.6). |
| 07 TRG-307 | PENDING | L1738 | Production start needs every build step and the go-live check of employees already in CR. | production | Cutover; existing-records phase. |
| 07 TRG-322 | PENDING | Pkg H8 | O-HS-JOURNAL: research whether HubSpot's webhooks journal can replace part of the change detection. | all | Not a fix for the CR budget. |
| 07 TRG-324 | PENDING | Pkg item 22 | `MAPPING_VERSION` is bumped only when the request format or a write rule changes outside the mapped values, or CR holds wrong data. | all | This deploy's bump re-sends every field of every gated linked record once (sandbox: test records only). |
| 07 TRG-328 | PENDING | L1730 | The intake poller is OFF on purpose (`AzureWebJobs.intakePoller.Disabled` = true) until testing resumes; the sweep is off with it. | sandbox | Re-enable on Zeke's word before the E2E run (section 5 list). |
| 07 TRG-329 | PENDING | L1730 | Sandbox poll schedule `INTAKE_POLLER_SCHEDULE` = `0 */5 * * * *`; removed at cutover (hourly). | sandbox | Cutover task. |
| 07 TRG-332 | PENDING | L1708 | One ongoing-update (refresh) workflow per entity sends the record ID and object type; the three initial enrolment (entry) workflows are kep… | sandbox, production | Added: L1708 had no row (TRG-275 cited the line only for the two starts). |
| 08 GC-001 | PENDING | L24, L186–190 | The guide must say that decisions of 11/23 and 11/24 are not yet in the doc, and where they live until written. | all | No callout exists (headline). Draft in 5.0; doc write needs Zeke's word. |
| 08 GC-002 | PENDING | L280, L282 | Production gate = two single-checkbox properties `centralreach_creates_only` and `centralreach_updates_only`, same internal names on Case 0… | all | Production property creation is a cutover task (PKG "Before deploy" item 2). Sandbox copies exist since 11/23 (D18 b). GID insert A bullet 2. |
| 08 GC-011 | PENDING | L282 | Production segments per object: "CentralReach creates only" = creates box true; "CentralReach updates only" = updates box true; sync workfl… | production | HubSpot production build, cutover. GID insert A bullets 1–2. |
| 08 GC-012 | PENDING | L280 ("In production the checkbox… | A HubSpot "creates" workflow ticks `centralreach_creates_only` only on records created after the cutover date with Entered = Yes and no CR… | production | Guide line was "L271", an 11/20 extract number (11/24 L271 is blank); corrected to L280. Trade-off still open: PKG E24 (waiting on Zeke). GID insert A bullet 3. [Recency 11/24 E24 closed (P24).] |
| 08 GC-013 | PENDING | L280 | A "promote after create" workflow ticks `centralreach_updates_only` when the CR ID changes to known, creates is true and the CR link proper… | production | GID insert A bullet 3. |
| 08 GC-014 | PENDING | L355, L403, L430 ("link property i… | Cutover check (read-only, production): nothing but the integration fills `central_reach_link_to_client`, `central_reach_record_link`, `cent… | production | Case line was L356 (the "Integration writebacks" row); the "Client ID and link · CR → HS" row is L355. NEW in guide (no insert covers it). |
| 08 GC-015 | PENDING | L280, L751 | Existing records are a separate phase: both boxes blank at cutover; review HubSpot vs CR on the required properties; United Care confirms m… | production | GID insert A bullet 5. |
| 08 GC-017 | PENDING | L278, L751 | Employees and Cases in CR only by email or name (181 BT/RBT, 11 BCBA after connect) get `employee_id` / `client_id_number` written before a… | production | Guide L751 counts (515 / 405 / 110) are stale. |
| 08 GC-029 | PENDING | none | Sandbox `referral_other` recreated as a property sync; production `referral_other` created; added to the Case workflow triggers. | sandbox, production | GID insert A bullet 4 names the property. |
| 08 GC-040 | PENDING | L392; L1060 (W1 trigger list holds… | Production Case sync workflow triggers on the three coordinator properties, not `hubspot_owner_id`. | production | L392 does not name `hubspot_owner_id`; the W1 trigger row that does is L1060 (and W3 L1117 for the BCBA). GID insert A bullet 4. |
| 08 GC-063 | PENDING | L745, L747 | Fix the 5 malformed production Workday IDs; get Sara's final word on the 7-digit rule. Owner Zeke. | production | Guide L745 counts "640 of 644" now 645 of 650 distinct (EMP §4). |
| 08 GC-066 | PENDING | L1730 | Daily CR call count (KQL) and an Azure alert above 3,000 a day; paired with a weekly read of CR's usage page. | production | Before cutover; alert rule is an Azure write. |
| 08 GC-069 | PENDING | L1746 | Bump `MAPPING_VERSION` only when the request format or a write rule changes outside the mapped values, or CR is known to hold wrong data. | all | Added: WT BUILD-PLAN decision 60 records the bump to `stage7-2026-11-23` (verified at WT `src/lib/mappedState.mjs:7`; 655b385 holds `stage3-2026-11-20`). Its e… |
| 08 GC-071 | PENDING | L276 | Finding 11/24: the client read returns `contact.externalSystemId` when CR holds one (test client 5384589) and leaves it out when blank (pro… | all | Orchestrator to assess (PKG item 23 note); guide L276 needs a qualifying note. |
| 08 GC-072 | PENDING | L276 ("81 of the 100 sampled HubSp… | After the API user was connected (11/23), 487 of 489 Case Client IDs resolve; 2 are bad data (Case 52824206873 → 4788659; Case 58025345977… | production | Two bad IDs need United Care. |
| 08 GC-074 | PENDING | none (guide names only HubSpot's 1… | CentralReach API tier is Core: 150,000 calls a month, $0.003 a call over; the integration and testing stay within it. | all | NEW in guide. |
| 08 GC-075 | PENDING | none | Open item O-CR-BUDGET: measure actual monthly CR cost; change the code to stay under the cap; due before the existing-records phase. | all | NEW in guide (section 10). |
| 08 GC-076 | PENDING | none | Open item O-HS-JOURNAL: research whether HubSpot's webhooks journal can reduce calls. | all | NEW in guide (section 10). First read: saves HubSpot calls, not CR calls (PKG H8). |
| 08 GC-077 | PENDING | none | Research practice: CR research about 1,000 calls a day; a scan of every client or employee needs Zeke's go-ahead; every script counts and c… | all | Not Zeke's verbatim words; working rule only. |
| 08 GC-078 | PENDING | L276, L751 | Existing-record comparison method: CR export or API. | production |  |
| 08 GC-079 | PENDING | L280 | Shadow comparison is a step of the production push. | production |  |
| 08 GC-080 | PENDING | none (guide never names the CR API… | The CR Public API runs as Gavriella Bohan (CR 4147071); she is connected to clients and employees (713 clients, 1,581 employees visible). S… | all | NEW in guide. A 404 from CR on a contact means "not connected" (REF item 1). |
| 08 GC-081 | PENDING | none | Cutover task: auto-connect from 4147071's profile to all clients going forward. | production | NEW. Until done, staff-created contacts can be invisible and get created again. |
| 08 GC-082 | PENDING | none | A dedicated CR API user replaces Gavriella's login. Owner Danny. | production | NEW. |
| 08 GC-083 | PENDING | L751 | Before employee creates go live, link existing employees by writing `employee_id` (192 would otherwise be duplicated: 181 BT/RBT, 11 BCBA). | production | Guide L751 numbers are from 11/17. |
| 08 GC-084 | PENDING | none | Tell United Care the first sync overwrites hand-entered CR values (69 Care Coordinator, 48 Supervising BCBA, 20 Total Hours, …). | production | [Recency 11/24 Phase 2 (P14, P16).] |
| 08 GC-085 | PENDING | L364, L723 | Data fix before go-live: set `lba_licensure__ny` = Grad Permit on Dominique Plummer 45994302542 and Katie Vangraefschepe 61130820723. | production |  |
| 08 GC-086 | PENDING | L415 | 10 Grad Permit holders have no 151 link; United Care adds the "Grad Permit Supervisor" link. | production | Until then 131308 is left out on their Cases. |
| 08 GC-087 | PENDING | L366, L556 | 4 Cases keep a stale 135 label after the removal date; remove it. | production |  |
| 08 GC-088 | PENDING | L475, L773 | Step 9.6: one read-only token-info call, then the sensitive definition and value GETs on a production Case. | production |  |
| 08 GC-089 | PENDING | L747 | Workday ID 1034820 is one CR employee (4499766): the existing CR record was kept, not a second added. 2002628 is still unresolved. | production | Guide L747 says "A read-only check on 11/17 found neither person in CR." |
| 08 GC-096 | PENDING | L596 (no BT personal email in guid… | BT/RBT personal email (T9, `personal_email` → 138069) held: confirm the field with Danny and the client (O-51). | all | Production BT/RBT has no `personal_email` (EMP §5). |
| 08 GC-104 | PENDING | L1738 | End-to-end sandbox re-test runs with the poller on; the poller is turned on only on Zeke's word once the changes are deployed. | sandbox | Added: on 2026-11-24 the poller was turned on for a few minutes on Zeke's word ("Please turn the poller on as well") and off again ("Go ahead and turn the Poll… |
| 08 GC-105 | PENDING | L1730 | Cutover: remove `INTAKE_POLLER_SCHEDULE` so production polls hourly; first run one round at the hourly poll. | production |  |
| 08 GC-110 | PENDING | L38–44 | Source order for every worker: HubSpot production first (read-only), then CentralReach, then the sandbox last. | all | Proposed for the index "How to use dated evidence". |
| 08 GC-111 | PENDING | L194, L204–L214 | G20 and STP must stay the same; STP changed on 11/23–11/24 (names "RN", phone forms, `home_apt` NA/NB/NC, BCBA `email` / `personal_email` /… | sandbox | G20 out of date in 6 bullets (5.1). |
| 08 GC-112 | PENDING | L212 | After each round, the round's client and employees are made inactive in CR and logged in `sandbox-test-log.md`. | sandbox | R1 (5384589, 5384530, 5384531) and R4 records are still active. |
| 08 GC-113 | PENDING | L810, L814-L818, L1722 | Production gate semantics. The guide says "the gate is only 'Entered in CR'", "a one-way latch: if someone unticks the box later, keep sync… | production | Added. GID lists the section 11 pointer as "Optional, not drafted"; L1722 is named nowhere. Draft text X-41. |
| 08 GC-115 | PENDING | L370 (per-BT hours), L380 (no rule… | Per-BT hours (C21), `insurance_id_3` / `_4` (C38) and a physician pair for `Unsure` (C31) are not mapped: none is marked required and CR ha… | all | Added. Zeke's words are conditional; "not required" is CF §3's reading of GER-REQ (L330-346), so the guide note is "Proposed, for Zeke to confirm" (X-42). |
| 08 GC-125 | PENDING | L361, L510 | Production Care Coordinator set-up before item 6 ships: create the Case properties (and `coordinator_export_source_snapshot`), rebuild the… | production | Added. GID insert A bullet 4 names the properties only; the workflow, Team Member and enrolment steps are NEW in guide. [Recency 11/24 Built (P13, P16): workflows are deployed from the sandbox (Ruling A).] |

## Appendix C. Every OFFLINE-ONLY row (264) [C]

[C] Added by the completeness check. Section 1 counts these 252 rows as having no live test, but sections 3 and Appendix B did not list them. Each is proven by an offline test only (or accepted offline: F27). Format: row ID (guide lines cited by the slice). Zeke asked for every requirement to be tested end to end; for each row below the slice judged a live test impossible, too costly in production CR calls, or not yet offered. Decide per row whether offline is accepted (most of 04 and 08 already are: F27).

- **01 Objects, IDs, staffing associations (46):** OBJ-001 (L463, L353); OBJ-003 (L463, L353); OBJ-006 (L463, L322); OBJ-008 (L322, L390, L657); OBJ-009 (L322, L390, L657); OBJ-010 (L322, L390, L657); OBJ-011 (L322, L390, L657); OBJ-017 (L464, L401); OBJ-019 (L464, L401); OBJ-023 (L465, L428); OBJ-025 (L465, L428); OBJ-033 (L466, L450); API-002 (L473); API-003 (L473); API-013 (L475); API-020 (L479, L391); API-021 (L479); API-022 (L479); API-023 (L479); API-024 (L479, L539); API-025 (L479, L518); API-026 (L479, L410, L419); API-027 (L479, L436, L434); API-035 (L495, L391); STF-007 (L549, L366); STF-010 (L552, L985); STF-020 (L553, L511, L986, L362); STF-023 (L554, L511, L987); STF-031 (L555, L366); STF-032 (L979); STF-039 (L557, L991, L366); STF-040 (L991); STF-041 (L558, L992, L366); STF-043 (L558, L993); STF-045 (L549, L994, L366); STF-047 (L559, L514, L995, L365); STF-050 (L560, L514, L996); STF-053 (L549); STF-064 (L562, L999); STF-066 (L562, L1000); STF-067 (L1000); STF-068 (L549, L1001); STF-076 (L232, L451, L508); STF-084 (L549); STF-085 (L549); API-036 (L294, L773).
- **02 Case / Client (56):** CASE-012 (L346); CASE-013 (L346); CASE-022 (L502); CASE-024 (L394); CASE-028 (L355); CASE-029 (L355); CASE-030 (L355); CASE-040 (L356, L790, L855); CASE-045 (L505); CASE-050 (L334, L507); CASE-058 (L360, L509); CASE-059 (L360); CASE-065 (L346, L360, L1733); CASE-066 (L346); CASE-076 (L362); CASE-078 (L363, L512); CASE-079 (L363, L512); CASE-080 (L366, L552-556); CASE-081 (L366, L555); CASE-082 (L366); CASE-083 (L366, L555); CASE-084 (L364, L513); CASE-085 (L364, L513); CASE-086 (L364, L513); CASE-087 (L364); CASE-088 (L364); CASE-089 (L364); CASE-091 (L364); CASE-096 (L365, L561); CASE-101 (L366, L557); CASE-112 (L370); CASE-121 (L372); CASE-123 (L373, L521); CASE-124 (L373, L521); CASE-125 (L373); CASE-126 (L373); CASE-132 (L374); CASE-135 (L375, L524, L525); CASE-141 (L378); CASE-150 (L380, L530); CASE-152 (L380); CASE-167 (L394); CASE-176 (L451); CASE-183 (L454); CASE-185 (L454); CASE-196 (L824); CASE-197 (L824); CASE-199 (pkg intro (MAPPING_VERSION)); CASE-203 (L353, L321); CASE-204 (L353, L278); CASE-209 (L366, L562).; CASE-090 (L364); CASE-128 (L373); CASE-174 (L450); CASE-175 (L451); CASE-182 (L454)
- **03 BCBA (46):** BCBA-001 (L401, L464); BCBA-003 (L401, L464); BCBA-009 (L280, L282, L271); BCBA-010 (pkg item 24, D18); BCBA-011 (pkg item 24, D18); BCBA-012 (pkg item 14); BCBA-014 (L419); BCBA-015 (L591, L818, L294); BCBA-020 (L573, L405, L266, L717); BCBA-023 (L276 (1)); BCBA-024 (L338, L1740); BCBA-037 (L276 (4)); BCBA-038 (L276, L322, L569); BCBA-039 (L276 (5)); BCBA-040 (L276 (2)); BCBA-042 (L278); BCBA-043 (L278); BCBA-044 (L278); BCBA-045 (L278); BCBA-046 (L278); BCBA-047 (L278); BCBA-048 (L278); BCBA-049 (BP decision 34 (row 3.15)); BCBA-050 (L278); BCBA-056 (L272, L248); BCBA-057 (L246); BCBA-071 (L278, L266); BCBA-079 (L404, L862, L790); BCBA-093 (BP section 4 table, O-47); BCBA-096 (L574, L407); BCBA-098 (BP decision 43); BCBA-102 (decision 43); BCBA-104 (L341); BCBA-108 (L342); BCBA-110 (L342); BCBA-111 (row 4.18, BP 5.7); BCBA-120 (row 4.18); BCBA-130 (L410, L419, L479); BCBA-142 (L419); BCBA-143 (L419, L575); BCBA-144 (BP 9.4 exclusions); BCBA-145 (BP 5.8, row 4.18); BCBA-150 (BP 5.3); BCBA-151 (BP 5.3); BCBA-165 (L421, L1004-1006); BCBA-185 (L773, L776).
- **04 BT/RBT (37):** BT-010 (L338, L276 (2)); BT-011 (L276 (2)); BT-013 (L276 (3)); BT-017 (L276 (4)); BT-018 (L276 (4)); BT-019 (L276 (4)); BT-020 (L276 (4)); BT-021 (L276 (4), L322, L278); BT-022 (L276 (5)); BT-026 (L278); BT-027 (L278); BT-028 (L278); BT-029 (L278, L1746); BT-030 (L278); BT-031 (L278); BT-041 (L430); BT-049 (L431, L790, L862); BT-052 (L246, L272, L840); BT-058 (L322, L810); BT-075 (L341); BT-077 (L341); BT-078 (L341, L435); BT-082 (L342); BT-084 (L342); BT-085 (L342); BT-088 (L434); BT-096 (L436); BT-106 (L438); BT-110 (L337); BT-112 (L337); BT-124 (same); BT-133 (L441, L830); BT-134 (L1730); BT-137 (L1730, L1746); BT-141 (L745); BT-154 (L1736); BT-155 (L1746).
- **05 Client labels (20):** CLB-014 (L635, L383); CLB-015 ((not in guide)); CLB-028 (L222); CLB-029 (L605, L609, L384); CLB-030 (L609, L384); CLB-033 (L615, L631, L384, L228); CLB-034 (L615, L631, L384, L228); CLB-035 (L617, L631, L384); CLB-037 (L629, L384); CLB-066 ((not in guide)); CLB-104 ((derived)); CLB-112 (rule 5.6); CLB-113 (rule 5.6); CLB-120 (rule 5.6); CLB-122 (rule 5.6); CLB-123 (rule 5.6); CLB-150 (not in guide; BUILD-PLAN L.4); CLB-157 (not in guide; BUILD-PLAN L.3); CLB-158 (not in guide; BUILD-PLAN L.2,); CLB-159 (not in guide; BUILD-PLAN L.1).
- **06 Staff labels (15):** LBL-010 (L686, L700, L206, L208); LBL-019 (L328, L688); LBL-024 (L689-690); LBL-035 (L692, L417); LBL-036 (L691, L419); LBL-044 (L151, L377-378); LBL-053 (L701, L440); LBL-058 (L701, L440); LBL-064 (L440); LBL-066 (L337, L154); LBL-069 (L172); LBL-071 (L379, L221); LBL-072 (L381); LBL-074 (PKG item 12 (Zeke 2026-11-23:).; LBL-080 (GER-CONTACT L454 ("dashboard label mapp…)
- **07 Triggers and gate (30):** TRG-015 (L210); TRG-020 (L246); TRG-038 (L272); TRG-051 (L276 (3)); TRG-056 (L276); TRG-059 (L276 (5)); TRG-062 (L276); TRG-068 (L278); TRG-070 (L278); TRG-071 (L278); TRG-077 (Pkg D18 b); TRG-079 (Pkg items 14, 24); TRG-080 (Pkg item 14); TRG-081 (Pkg item 24); TRG-082 (Pkg D18 f); TRG-110 (L322, L810); TRG-122 (L814); TRG-129 (L390, L419, L441, L454, L830); TRG-250 (L1140-1145); TRG-288 (L1722); TRG-294 (L1730); TRG-301 (L1736); TRG-305 (L1736); TRG-308 (L1746); TRG-309 (L1746); TRG-312 (L1746); TRG-333 (L328).; TRG-128 (L454, L830); TRG-146 (L454); TRG-263 (— (code)); TRG-273 (L1238)
- **08 Decisions vs guide (14):** GC-006 (none); GC-007 (none); GC-008 (L280); GC-033 (L373); GC-034 (L360, L509); GC-056 (L1746); GC-098 (none (no format rule in guide)); GC-107 (L346); GC-122 (L341).; GC-028 (L382); GC-036 (L373, L522); GC-050 (L363); GC-120 (L1746 ("Distinguish an intentional blan…); GC-124 (L363, L512 (GID inserts E / E2, approve…)

Count check: 252 rows.

---

## Completeness check (2026-11-24)

Independent critic; read-only except this file. Calls: HubSpot 0, CentralReach 0, Google Doc 0, Azure 0. Every change in this file is marked "[C]".

**1. Line coverage of the guide (L192–L322, L324–L456, L458–L703).** Scripted walk: every guide line cited in the "Guide line(s)" column of any coverage row, ranges expanded, against the snapshot. **No requirement-bearing line is uncited.** 72 non-blank lines in scope have no row: section headings, `Agent context` lines and table header rows, plus seven prose lines that carry no requirement of their own (L240 and L254 pointers to G17 and section 10; L264 scope "BCBA and BT/RBT unless a line says otherwise"; L300 and L641 precedence notes "supersedes ..." / "preserve as history"; L306 introduction; L703 the sheet-header typo note). Each of these sits in a slice's "no requirement" list or range (01, 05, 06, 07). At clause level, five blind spots were found inside cited lines and added as gaps: L276 (4)–(5) with L745, the label half of the mismatch / malformed-ID stop (K2); L691 / L416 / L824, a workflow-maintained credential label (K3, LBL-082); L334 BR22, update-body rules the planned run cannot see (K4); L276 (4) and L337, demoted rows with no re-proof row (K5); L385 / L664, the Contact → calculated `location` → label path (K6). Also L284 "deploy while the app is stopped" was cited by TRG-093 but missing from section 6.2 (K7, fixed).

**2. Slice gaps against the master.** Every numbered item of every slice's Gaps section (01 a1–a15, b1–b5, c1–c2, d1–d8, e1–e5; 02 a1–a23, b1–b10, c, d, e; 03 a1–a22, b1–b6, c, d, e; 04 a1–a12, b1–b6, c1–c4, d1–d5, e1–e7, f1–f7; 05 G1–G13, O1–O4, c, d, e; 06 a1–a13, b1–b4, c, d1, e1–e2; 07 a1–a23, b1–b5, c1–c6, d1–d3, e1–e11; 08 a1–a13, b1–b3, c, d, e, f) is referenced in the master. Appendices A and B hold every RETIRED, DEFERRED, MISSING-TEST, NOT-BUILT, BLOCKED, CONFLICT and PENDING row. **Dropped: 13 items** from the slices' Independent review, live-read and "Could not verify" sections, plus one setup step from the handoff: K1 (R1 / R4 `--write` and poller-off order), K2, K3 (LBL-082, a MISSING-TEST row with no gap row), K4 (CASE-003, -005), K5 (BT-016, BT-108), K6 (CLB-069), K7 (TRG-093), K8 (TRG-222), K9 (4,654 blank-type BT/RBTs), K10 (unlabeled-only association), K11 (merged API rows), K12 (TRG-016), K13 (no saved per-row check output). K14 adds explicit references for five MISSING-TEST rows that were covered only by text. The 252 OFFLINE-ONLY rows were counted but not listed: now Appendix C.

**3. Totals.** Recounted from every slice's Status column (first status word): 01 = 181, 02 = 209, 03 = 177, 04 = 156, 05 = 118, 06 = 85 (44 / 25 / 16 by the master's split), 07 = 349, 08 = 125; **1,400** in all, and every status column total (355 / 403 / 252 / 48 / 43 / 48 / 10 / 106 / 111 / 24) and every per-slice cell in section 2 **matches**. State gap cells recount to 23 NY, 50 NJ, 42 CO: match. The path-gap scan recounts to 365 (120 / 224 / 21), not 352: within the "about, upper bound" wording; section 1 now says "about 350 to 365".

**4. The yes/no answer.** "No" is honest and stays. Section 1 now also names the evidence limits and Appendix C.

**5. Questions and attributions.** No question re-asks a settled item outright, but two were partly answered already and are annotated: question 16 (the sandbox ask was in round-1-log L180 and Zeke's "done / Workflow trigger lists" postdates the 11/23 evidence) and question 24 (package D18 c L773 already drafts "Enrolment filter: member of either segment", matching guide L1714). Five cross-references in section 3 pointed at slice question numbers instead of section 9's (A15 → 10, C18 → 12, C19 → 34, D3 → 16, G9 → 37): fixed. Attributions checked against repo text: "These are pending the client beginning work in these states" (package), "Yes to all please" (package, BUILD-PLAN), "Yes, all 7" (package, handoff, GID), "we will turn the Poller on ..." (package, handoff), "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)" (`prod-reads-output-2026-11-24.md` L5 only), "Zeke, 11/20: nothing reads the temporary ID" (BUILD-PLAN BR2). One paraphrase presented as Zeke's rule ("nothing is written to the Doc without his word") has no repo quote: reworded in section 7. No new question is added: every K item is a test row, a setup step or a read-only fact check.

**6. Limits.** New section 12.

**Assumptions of this check.** (a) A line cited by any row's Guide line(s) cell counts as covered; mentions in notes or "no requirement" lists count as judged. (b) "Dropped" means not named by ID or by substance anywhere in sections 1–11. (c) The handoff's "State at 2026-11-24" and round-1-log L178 are current for the R1 / R4 decoy dates (not re-read in HubSpot). (d) The working tree was not read; K items cite the slices' reads.

## Completeness check (2026-11-24), second pass [C]

An independent critic, separate from the first pass above. It made changes in this file only, and each one is marked "[C]". Calls: HubSpot 0 (production 0, sandbox 0), CentralReach 0, Google Doc 0, Azure 0. Git use was read-only: one `git show 655b385:src/lib/centralReachClient.mjs`.

**1. Line coverage (L192–L322, L324–L456, L458–L703).**
- **Line level.** I re-ran the walk with my own script: every "Guide line(s)" cell of every coverage row, with ranges expanded. The result matches the first pass: 72 non-blank lines have no row, and all of them are headings, `Agent context` lines, table headers or the seven prose lines the first pass named. With citations anywhere in a slice file counted, none is uncited. So **no requirement-bearing line is uncited.**
- **Clause level.** I checked each clause of every GER row (L334–L456) and every G01–G09 row by key term against the slices, about 75 terms. Examples: `dealname`, `_f` twins, `total_hours_bt_12`, `n2_what_type_of_insurance`, the three `initial_auth_tracks` branches, the archived `gender`, `ny_medicaid__status`, `credentialed_insurances__ny`, Apploi, "Standalone" Contact creation, HIPAA / `case_initials` (API-033), the 190-per-10-s limit (API-003), "Keep CR ID writebacks out of workflow triggers" (CASE-040, BCBA-079, BT-049, TRG-124), the 264 checklist ticks (TRG-023), the six hand-linked BT/RBTs (TRG-072), and the 81 of 100 Client IDs (CASE-032, TRG-063, GC-072). Every clause has a row.
- **Blind spots in the plan, not in the line coverage.** I found one, K15: the master's route for question 14 would remove the only live proof of the Colorado form `RBT CO` (L337, decision 17).
- **Outside the three ranges.** A scripted walk of L705–L1280 and L1616–L1754 leaves 100 lines uncited. All are headings, history or context, except L739: 11 production Cases hold Comorbid / Maladaptive data only in the clinical fields (K18).

**2. Slice gaps against the master.**
- **Gaps sections.** A scripted check of every item ID in each slice's Gaps section (01 35, 02 33, 03 22, 04 41, 05 12, 06 20, 07 18, 08 16, in the forms the parser could read) finds every one referenced as `NN-xN` in the master. I read the unparsed bullets (02 b–e, 03 b–e, 05 b–e, 07 b–e, 08 b–f) by hand, and each is in the master by ID or by substance.
- **Independent review and "Could not verify" sections.** These are covered by the first pass's K1–K13, with two exceptions:
  - **K9 was wrong.** It said "how many are ... Entered = Yes was not read". BUILD-PLAN L291 holds the 2026-11-20 production read: 4,630 blank-type BT/RBTs, 17 with Entered = Yes, none linked. Decision 35 (Zeke, 11/20) already sets the behaviour. Corrected.
  - **06's "which labels the RBT CO form sets" (RG A3)** depended on a Colorado-only BT/RBT that the master's question 14 route would remove. Now K15.
- **Dropped items: 1 corrected (K9), 1 newly found (K15).** Zeke's two rulings of 11/24 are also in a repo file now (handoff L9–L10) but not in the master; I added them as K16 (sandbox-to-production deployment) and K17 (the two phases). K18 is new from outside the walked ranges.

**3. Totals.** I recounted every slice's Status column with my own script: 01 181, 02 209, 03 177, 04 156, 05 118, 06 85, 07 349, 08 125, **1,400** in all. The status totals are PROVEN-LIVE 355, PLANNED 403, OFFLINE-ONLY 252, MISSING-TEST 48, NOT-BUILT 43, BLOCKED 48, CONFLICT 10, PENDING 106, RETIRED 111, DEFERRED 24. No row ID appears twice inside a slice. Each slice's last stated totals equal its column. **They match the master; nothing changed.**

**4. The yes/no answer.** "No" is honest. Section 1 now also names the two later rulings and K15–K17. None of them turns a No into a Yes. Phase 2 work (existing records) is not part of this E2E by Zeke's ruling, so those rows stay PENDING; they are not a test gap.

**5. Questions and attributions.**
- **Quotes.** I checked every quoted phrase attributed to Zeke in the master against the repo text. All are found except the review-brief request ("test EVERY requirement … the webhook and the poller on"). Section 12 already names it; conflict 2 now says so too.
- **Questions the sources already settle.**
  - Question 17's existing-records half is settled as phase 2 by handoff L10. Annotated.
  - The blank `bt_rbt_type` behaviour is decided (decision 35), so no question was added for it.
  - Question 2 is consistent with the two-phase ruling but not answered by it. Annotated, still asked.
  - Questions 19 (decision 14 is recorded as the orchestrator's reading, not Zeke's words), 27 (OPEN-ITEMS L91 names no receiver), 11, 13 and 15: still unsettled, so they stay.
- **No new question.** K15 is a change to the test plan and K16 is a cutover check list. Both follow from decisions already made.

**6. Limits.** I added the second-pass bullets to section 12.

**Assumptions of this pass.**
- (a) The handoff "State at 2026-11-24" L9–L10 quotes are Zeke's verbatim words, as the file says. The phase reading after them is the orchestrator's.
- (b) Only creates are gated by the creates box in phase 1, and records created in phase 1 are promoted to updates. This is the package D18 c "promote" workflow, approved with "Yes, all 7", so phase 1 does include updates of the records it creates.
- (c) The deployed `getEmployeeContactForm` rule (CO and not NY → `RBT CO`) is unchanged in the pending build. I did not re-read the working tree.
- (d) `referral_other` and the coordinator fields exist in the sandbox (E14 says the coordinator workflows are "turned on and functioning"). This was not read.
