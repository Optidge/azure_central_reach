# Remaining gaps before launch (2026-11-23)

Read-only review at deployed `655b385`, ~17:15 UTC. Sources: `sandbox-test-matrix.md` (Result column), `SANDBOX-TEST-PLAN.md`, `SANDBOX-TESTING-HANDOFF.md`, `sandbox-rounds/round-1-log.md` (with the R1-U1 run sheet), BUILD-PLAN sections 5, 9, 13, 15 and 16, `OPEN-ITEMS.md`, `WAVE-2-LOG.md`, `plan-review-2026-11-20.md`, `guide-extract-2026-11-20.md` (cited as "guide line N"), and `src/`. Offline: `npm test` 1212 of 1212 pass; `npm run check:requirements` passes.

"Check" marks something this review could not confirm.

## A. Requirement rows not yet proven live

Every row whose Result is not a full PASS. A row marked "R1: pass" is proven for the R1 create values only; the later rounds still have to prove its other values (A3 to A6).

### A0. Proven in round 1, Result cell still blank (testing chat fills it from round-1-log)

- BR1: round 2 creates were skipped `entry_not_yes`, no CR call; the R1 creates ran after Yes (round-1-log lines 91-92, 93-96).
- BR2: B2 and T2 pass; both employees `waiting` "Waiting for the Workday ID" (lines 105-106, 111-112).
- BR3 (second run links): BCBA attempt 1 and the Case retries did `lookup 200`, no second create (lines 96-98, 119-120).
- BR9: `success` and `waiting` seen; `error` not yet written to HubSpot on purpose (check).
- BR14 (retry path only): 60 s and 300 s retries seen (lines 96-98). The dead-letter end is not proven (A7).
- C1: Case create 200 with the default form. The Screen check is still open.
- B1: the Admin form added label `1052549` "Admin" by itself (line 108). The Screen check is still open. Also see D17.
- T1 (R1 form): the `Behavior Technician NY` form set all four required labels by itself; no label POST was needed (line 93). The Screen check is still open.
- A-11 (assumption): the linked-Case lookup found `contactId` (16:24:39 and 16:30:49 runs). Can close.
- A-21 (assumption): the BCBA lookup found the new employee about 90 s after the create (line 97). Partly measured.

### A1. R1-U1 (update round; the run sheet must be revised first, see F2)

The run sheet covers these, each as one or more pushes:

- BR5: updates with Case Entered blank (Push 8) and BCBA Entered = No (Push 1).
- BR12: BT/RBT `Yes - Generic` (Push 1) and `No- Made Inactive` (Push 3).
- BR3, BR14 (duplicate signals, BT/RBT): Push 1 line 1. It needs the entry and refresh webhooks to both fire (check which triggers exist, decision 51).
- BR17, C14: swap Primary BT 1 and 2, then remove BT 2 (Push 3, Push 4).
- C11: RE removed (Push 3).
- BR18: an association change with the Case workflow off (Push 3). It rests on A-16; the fallback is the 08:00 UTC sweep.
- BR19: the hand-added School label `1052688` is kept (before Push 1).
- CL4 (retired values, retired label): Push 1, Push 2, Push 7.
- C8 (unreadable value): Push 6, then the restore in Push 7.
- B9 (unreadable value): Push 6, then the restore in Push 7.
- B4 (changed email, O-11, the first live test): Push 3.
- T2 (changed email, O-11): Push 2.
- K1, K2: Push 5. The fan-out log line needs the Contact webhook (O-21).
- K4: Push 7, lines 72-73. It needs the Contact webhook.
- K5: Push 1, line 8 (BT/RBT Contact `address`). Open as O-26.
- Every U1 value in the C2-C35, CL1-CL4, B3-B10, BL2/4/5/7, T2-T6, TL1 and TL3 (U1a-U1d) rows.

Rows on R1 records that are in the matrix but not in the run sheet yet (add them):

- BR7 (employees): `test_record` = true on the BCBA, then on BT/RBT 1; expect `skipped`, no CR call.
- BR17 (relabel): IA 223 → RE 229 on the R1 BCBA, then back.
- BR14 (webhook and poller at once) on the R1 Case.
- BR18 (status flip, no edit): the 1 PM `case_status` or `staffing_status` flip.
- BR15: the 24-hour report on `integration_last_write` after the first pushes (guide line 821).
- BR4: the gate-blank BT/RBT, made by hand (matrix line 328).
- BR7 (Case): a Case with `test_record` = true, made by hand.
- BR13: after each push, check the HubSpot property history: only the BR13 properties were written.
- BR21: scan the run's log rows for test values (none expected).
- BR22: the update sends no `ExternalSystemId` and no `ContactForm`. `crCalls` logs only kind and status, so the log cannot show the body. Offline tests only (check).

Stale after R1-WD (the R1 employees now show `success`):

- BR10 (updates while `waiting`) and BR10 (checklist ticked while CR holds the temporary ID) cannot run on R1 any more. CR holds the Workday ID, so a ticked checklist gives `success` (`syncDecisions.mjs:30-31` runs before `:40-41`). Move both rows to A6.
- Every employee "waiting" expectation in the run sheet becomes `success`:
  - "What a push is", line 183;
  - Push 1 line 21 and Push 3 line 9 (checklist → now `success`, not `error`);
  - the Push 2 and Push 7 restores.

### A2. R1-U2 (blank round)

- BR16: each clearable field is blank in CR after the GET (matrix lines 307-325).
- O-35: does a client update clear a core field? The client update sends `null` for a blank core field (`buildClientPayload.mjs:49-53`).
- B5 (U2): BCBA `dob` blank → CR keeps 1990-01-15. **2026-11-24 afternoon:** the property is now `date_of_birth` (build package item 1), and the blank-on-update rule is option (a) for the BCBA and the BT/RBT (package question 27, closed): the update sends back the date CentralReach holds; the placeholder is never sent on an update. Prove it on both employees.
- C23 (U1/U2), C26, C30 and other metadata clears.

### A3. R2 (Colorado; re-run round 2 with `--write` first: its records have the association gap)

Extra records and steps:

- BR6: the Case moved through the four excluded stages; also a new Case created in `1383894301`.
- BR8 (Case): the wrong Client ID, method 7.1 (e). It needs an earlier round's inactive client, so make R1 inactive first.
- C3 (blank DOB on create): the extra Case with no DOB → `error`, no create.

Values R2 proves for the first time:

- Case fields:
  - C4 female;
  - C20 = 11;
  - C22 "6";
  - C24 Other Location;
  - C25 not sent;
  - C26 "No";
  - C27 Elopement;
  - C28 Level 1;
  - C29 Other + summary;
  - C30 Other + summary;
  - C31 Medicaid FFS - CO;
  - C33 Other.
- Case labels: CL1 CO Client `1132648`; CL2 none; CL3 Cold → `1121488`; CL4 97151 Services `1156743`; CL5 Other (no label).
- BCBA:
  - B5 "Feb 16, 1991";
  - B6 Female;
  - B10 Hourly (no label);
  - BL2 CO + NY;
  - BL3 New Mexico (the warning, no label);
  - BL4 BCBA Colorado `1124246` + GRAD `1092164`;
  - BL6 Aetna-NY decoy (no label).
- BT/RBT:
  - T1: the `RBT CO` form. Read which labels the form sets: a form-set label outside the managed list would stay (check).
  - T7 = 0 (the Case is Cold);
  - TL1 CO;
  - TL3 BT CO `1132650`.

### A4. R3 (New Jersey)

- B5: blank `dob` → placeholder 2000-01-01. T2: blank DOB → placeholder.
- Case fields:
  - C20 = 14 (BT 2 blank);
  - C22 blank;
  - C24 More Than One Location;
  - C25 Meta `138091` (Screen check);
  - C26 blank;
  - C27 "Mouthing Non Food Itemsth";
  - C28 Level 3;
  - C29 Aetna;
  - C30 blank carrier;
  - C31 Medicaid FFS - NJ;
  - C33 "Yes- Down's Syndrome".
- Case labels: CL1 NJ Client `1132647`; CL2 Home; CL4 X 97153 `1156747`.
- BCBA: BL2 NJ; BL4 CO + NJ, no NY label.
- BT/RBT:
  - T1: NJ;NY gets the NY form;
  - T7 = 1;
  - TL1 NJ + NY;
  - TL2: Virginia (the warning);
  - TL3: RBT NJ `1132651` + RBT NY `1052631`.
- Gap (check): no round has an NJ-only BT/RBT. So the removal of the NY labels that the NY form sets on an NJ hire is never tested.

### A5. T7 re-test (any round)

- T7 failed in R1 because the sandbox `active_cases_count` was blank. Find what fills it in the sandbox, or whether Zeke can set it by hand (check). Then re-push and GET Meta `147882`.

### A6. New Workday round (new test records; Zeke 2026-11-23)

- B2 / T2, Workday path: a create with `workday_id` filled → `success`, and CR `ExternalSystemId` = that value (rule 5.3).
- BR10: a Workday ID added while CR holds the temporary ID → `waiting` "Replace the temporary External System ID…" (rule 5.4 row 3).
- BR10 (checklist): ticked while CR holds the temporary ID → `error` `CHECKLIST_STILL_TEMPORARY`, and the update is still sent. Then staff replace the ID in CR and tick → `success`.
- BR10 (updates while `waiting`): an address change reaches CR and sends the ID CR holds.
- Rule 5.4 row 5: checklist ticked, `workday_id` blank → `error` `CHECKLIST_BLANK_WORKDAY`, and the update is still sent.
- BR3, rule 5.3: a record whose Workday ID is held by a CR employee that no HubSpot record holds → `waiting` "already in CentralReach", no write. Set-up is unclear (check).
- Test values: guide line 201 ([G20]) and SANDBOX-TEST-PLAN line 111 say `AZTEST-N-BT` / `AZTEST-N-BCBA`, never digits only. The matrix R1-WD rows say 7 digits. Zeke picks one (D1).
- Tooling: `create-test-records.mjs` has no Workday option; the testing chat adds one.

Now possible on the R1 employees, with **no CR write** (because R1-WD left CR holding the Workday ID):

- BR8 (employee half): change HubSpot `workday_id` on BT/RBT 1 to another value → `error` `WORKDAY_ID_MISMATCH`, no update (`syncDecisions.mjs:46-47`). Then set it back.
- BR11: a new BT/RBT with the R1 BT/RBT's Workday ID and Entered = Yes → found by Workday ID, another HubSpot record holds `5384530` → `error`, no CR call. Check first that HubSpot allows two records with one `workday_id` value.

### A7. Stage 8 areas outside the rounds (BUILD-PLAN lines 936-948)

- BR19, A-18 ("Labels, first"): delete a label from CR's catalog while a test contact holds it; time the read lag (R-6, R-19).
- BR14, BR15, A-15: a forced failure walks all five retries and dead-letters, and the alert email arrives (alert `uca-sync-deadletter-above-zero`). Check: did it email when it fired on the old dead letters?
- BR14, BR18: one round at the hourly poll before go-live (BUILD-PLAN line 950).
- A-14: a Case with `Yes` plus a second option ticked is found by the poller's `CONTAINS_TOKEN`.
- K (Contact): a Case with two Guardian Contacts (HubSpot only): the sync properties show the first (decision 24).

### A8. Stage 9 (production only)

- BR1, BR15: production webhook workflows, failure and waiting views, and the 24-hour report (9.6).
- R-23: the sensitive-property read can only be proven by the 9.6 production GET (guide line 763).
- BR4: the production gate checkbox (9.3, O-9).
- B5: the production BCBA date-of-birth property (O-10). Answered (Zeke, 2026-11-24): "we are filling in this date with the placeholder value that we are currently using." (placeholder `2000-01-01`; build package item 1, assumption G54).
- C13: 10 production BCBAs hold Grad Permit licensure with no association (O-15).

### A9. Rows that cannot pass until decided or built (see B and D)

- C13: marked "R1: pass", but that only proves `136052` was left unchanged. Nothing is built. (Now build package item 9. Its rule 7, two Supervising BCBAs with one holder, is decided 2026-11-24 afternoon (package question 26) and is proven offline only: the sandbox allows one Supervising BCBA per Case.)
- C15, C18, C21, C38, B11 (open).
- BL3, TL2 (held, O-6). T9 (held, O-51).
- C9 (not built, decision 36): check "never sent" only.
- K3 (retired). CL5 (excluded; passes by "no label").

## B. Code gaps (all for the build chat)

Each item is either guide behaviour the code doesn't do, or behaviour it does differently.

1. **BR19, BR14: the label read-back runs too early.**
   - The code reads back 3 times, the first at once, then 5 s apart (`centralReachClient.mjs:666-667`, `:789-803`, `:885-887`). CR lags up to about 150 s (BUILD-PLAN line 384; label test 2026-11-20).
   - So every create ends `CR_LABEL_POST_UNCONFIRMED` (`employeeSyncWorkflow.mjs:1234-1235`, `clientSyncWorkflow.mjs:820-821`). The first retry at 60 s is inside the 150 s window, so success comes only at the second retry (+300 s).
   - Found here: the throw comes before the synced hash is saved, so each retry also re-sends the full update and metadata to production CR (round-1-log line 97: "update 200" on attempt 1).
2. **BR15, BR21: one log call becomes several App Insights rows.**
   - `safeLog.mjs:60` passes the message and a meta object to `console[level]`, which prints the object over several lines; each line is stored as its own row (round-1-log line 155).
   - Suggested fix: one JSON line per call.
3. **C13 Grad Permit: not built.** No code sends Meta `136052` (no match in `src/`). Guide lines 355 and 710; blocked on O-15.
4. **C15 Outgoing BT 1/2: not built.** Guide line 356; O-15.
5. **C16: the undecided roles are not handled.** Outgoing Supervising, SUB and On Leave (guide line 357) are neither synced nor excluded. They are ignored, because only the five role IDs in `config.mjs:94-113` are read. O-15.
6. **C18: the Location #2 schedules are not built** (no CR field). Guide line 359; O-14.
7. **C21: per-BT hours are not sent.** Guide line 361; O-18.
8. **C20: the source differs from the guide.** Guide line 361 names `total_hours_bt1bt2_work_schedule`; the code sums the two BT hours fields (decision 41). O-43 is open, and the guide note is pending (O-34).
9. **C10: the Care Coordinator email is not sent, and the name source differs.** Guide line 352 says the owners API, name and email; the code reads `care_coordinator_name` only (decision 39). The email waits on O-17. **2026-11-24 afternoon:** build package item 6 (the Care Coordinator reads Zeke's workflow fields) is built now, not omitted (package question 25, closed), so C10 is proven in the sandbox. The production deploy waits until the Case properties exist in production (404 on 2026-11-24); Zeke: "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production". The 69 hand-entered CentralReach values are phase two.
10. **C12: the Supervising BCBA is sent as typed text.** Guide line 354 says "match … to the CR provider by name" (`buildClientMetadata.mjs:387`). O-16. Now build package item 9 (associations decide; the typed text is the fallback with " BCBA LBA"). **2026-11-24 afternoon:** a blank typed supplier sends nothing (O-58, applied under Zeke's closing sentence "On the remaining open items, apply your recommendation."); item 10's rules confirmed (Zeke: "9. these rules are rig").
11. **C19, C23, C26, C33: assumed text formats.**
    - Guide line 363 says Auth Period "written at midnight UTC"; the code sends `MM/DD/YYYY` text (`buildClientMetadata.mjs:23-27`).
    - Screen check or Sara's answer (O-28).
    - **2026-11-24 afternoon:** C26 Allergies (package item 3) and C28 Severity (package item 8) are un-held and built in the CentralReach form (CF §10), with `Confirmed` + "NA" → `Yes` (CF §11.1).
12. **B11: the BCBA Care Coordinator is not built.** Guide line 403; O-17.
13. **B4: the source differs from the guide.** Guide line 399 says `ucaba_email_address`; the code reads the BCBA `email` (decision 49). Guide note pending (O-34).
14. **B9 and K3: the source differs from the guide.** Guide lines 400, 444 and 447 say the Contact email, propagated from the Contact; the code reads `personal_email` on the record, and the fan-out's BCBA branch is removed (decisions 42, 44, 50).
15. **B5: the source differs from the guide.** Guide line 333 says `date_of_birth`; the code reads `dob` (decision 48, O-10). Now build package item 1 (reads `date_of_birth`). O-10 answered (Zeke, 2026-11-24): "we are filling in this date with the placeholder value that we are currently using." Blank on an update (2026-11-24 afternoon, package question 27): option (a), BCBA and BT/RBT; the placeholder only on a create.
16. **BL3 and TL2: New Mexico and Virginia get no state label.**
    - Guide line 225 ([G19]) says send NM Employee / VA Employee when a record uses the state. The code warns `unmapped_work_state` and sends none (`buildEmployeePayload.mjs:156`; O-6, Zeke).
    - 10 production BCBAs hold one of those states today, so they launch with no state label.
17. **BL6: the credential labels are not built.** Guide lines 407-408; decision 25.
18. **C31: `Unsure` and a blank insurance type get no physician pair.** The guide gives no rule (line 371); O-19.
19. **C38: `insurance_id_3` and `_4` are not mapped.** Guide line 382; O-19.
20. **T9: held.** The BT/RBT sends no `personal_email` (O-51).
21. **O-35, A-4: a client update sends `null` for a blank core field** (`buildClientPayload.mjs:49-53`). Employees send back CR's value instead (rule 5.8, BUILD-PLAN line 409). R1-U2 decides whether the Case needs a row like 3.13.
22. **BR4, R-28 (row 3.12): not built.** Nothing stops production running with `SYNC_RECORD_GATE_PROPERTY` = `none` or `INCLUDE_TEST_RECORDS` = `true` (`config.mjs:169-184`). Decided at 9.2.
23. **BR2, BR8, R-8: no Workday ID format check** (decision 22). Decided at 9.1 after O-8. Now build package item 15. O-8 owner (Zeke, 2026-11-24): "I will handle this." (build package D20).
24. **Unchanged from the final review: F-6 simplicity items** (unused exports, two call shapes, four label-answer shapes). Low; listed for later.

## C. Offline test gaps

`check:requirements` finds no built requirement without a test. These are the gaps that remain:

1. BR19: no test that the read-back waits past CR's lag, or that an unconfirmed POST does not re-send the update (needed with B1's fix).
2. BR21, BR15: no test that `safeLog` writes one line per call (needed with B2's fix).
3. K5: no test. It is open, and the propagation happens on the HubSpot side (O-26).
4. C13, C15, C18, C21, B11: no code, so no test (expected).
5. BL3, TL2: only the warning is tested. There is no label test while held.
6. Live-only assumptions with mock tests only: A-11, A-14, A-15, A-16, A-18, A-21 (A0, A7).
7. BR15 (views, report, alert) and BR20: setup and process, nothing offline.
8. Thin coverage (one test each; check whether that is enough): BR2, BR9, C2, C5, C12, C28, C32, B2, B8, B12, T5, T8, K2, BL1, BL8, TL4.

## D. Blocked on a decision

| # | Question | Who answers | Blocks |
|---|---|---|---|
| 1 | Workday ID format (O-8). Also: which test value the Workday round uses, AZTEST (guide line 201) or 7 digits (matrix). **Closed as a question (Zeke, 2026-11-24): "I will handle this."** Sara's final word on the 7-digit rule and the 5 malformed production IDs are Zeke's task (build package D20) | Zeke | A6, 9.1, R-8 |
| 2 | BCBA date of birth: `dob` or `date_of_birth` (O-10). **Answered:** `date_of_birth` (build package item 1). Who fills it (Zeke, 2026-11-24): "we are filling in this date with the placeholder value that we are currently using." (placeholder `2000-01-01`; build package assumption G54) | Zeke (answered) | Production BCBA creates (B5), 9.6 |
| 3 | Grad Permit marker; Outgoing BCBA; SUB / On Leave; Outgoing BT 1/2 (O-15). **Decided for the build:** build package items 9 and 10; item 10's rules confirmed (Zeke, 2026-11-24 afternoon: "9. these rules are rig"); rule 7 (two Supervising BCBAs, one a holder) applied as the package states it (package question 26) | United Care via Danny (decided for the build) | C13, C15, C16 |
| 4 | Removed on Zeke's word 2026-11-24 ("Irrelevant. Remove from the doc"). Was O-27 (Salaried). Number kept | n/a | Nothing |
| 5 | Does "no payor tags" cover BCBA NY Medicaid (A-13)? | United Care via Danny | BL5 in production |
| 6 | When to use `total_hours_btrbt_12` instead of the code sum (O-43) | United Care via Zeke | C20 |
| 7 | BT/RBT `personal_email` field; create it in production (O-51) | Danny and the client | T9 |
| 8 | Text formats for Availability, Allergies, Diagnosis, Auth Period and multi-name fields (O-28, A-9) | Sara via Danny, or a Screen check | C19, C23, C26, C33, before 9.8 step 2 |
| 9 | Do staff edit mapped fields in CR (O-29, A-19)? Under Zeke's two-phase ruling (row 23) this is a phase two question (existing records) | United Care via Danny | 9.8 step 3 (phase two) |
| 10 | Does CR block a second contact with the same External System ID or email (O-23, A-20)? Plus the two shared Workday IDs, guide line 734 (A-22 BT-to-BCBA case) | Danny / United Care | R-1, BR11 in production |
| 11 | Supervising BCBA name match (O-16); Care Coordinator email target and BCBA field (O-17); per-BT hours (O-18); `insurance_id_3/4` and `Unsure` (O-19). **2026-11-24 afternoon:** O-16 closed (package item 9; blank typed supplier sends nothing, O-58); the Case Care Coordinator name is package item 6, built now (not omitted, package question 25); the email and the BCBA field (B11) stay open | Zeke / Sara | C12, C10, B11, C21, C31, C38 |
| 12 | Location #2 schedules (O-14); BT/RBT `home_apt` (O-20); NM/VA labels (O-6) | Zeke | C18, T5, BL3, TL2 |
| 13 | US territories (O-46); 26 bad emails and short phones (O-48) | United Care via Zeke | C8, B4, B7, T2, T4 in production |
| 14 | `referral_source`: where its value comes from (C36; matrix question 1) | Zeke | C36 beyond "blank stays blank" |
| 15 | Q19: guide line 1705 says "No production rollout is authorized"; Danny 11/14 said "clear to finish". Which governs? (OPEN-ITEMS row 8, no answer) | Zeke with Danny | Go-live (9.8) |
| 16 | Create signal: is Entered in CentralReach = Yes still right? Do BCBAs follow the BT order? (guide lines 742, 744 q2, q3) | Sara via Danny | BR1 in production |
| 17 | The Admin form puts an "Admin" label (`1052549`) on every BCBA. The integration does not manage it, so it stays. Is that wanted? (check) | Zeke, then United Care | B1, BL in production |
| 18 | Production gate (O-9, 9.3); row 3.12 (9.2). **Decided (Zeke, 2026-11-23): two checkboxes per object, `centralreach_creates_only` and `centralreach_updates_only`; each segment is "its checkbox is true"; the code reads both on every path (build package D18, item 24).** Decided 2026-11-24 (Zeke: "Yes, all 7"): who ticks the creates checkbox on new records; the workflow that ticks the updates checkbox after a create; whether the two gates get sandbox rounds (package open questions 20 to 22, now closed; see the build package, section E and D18 c / g). The sandbox stays on `sandbox_test_field`; the two properties exist in the sandbox since 2026-11-23, ticked on no record. **2026-11-24 afternoon:** package question 24 closed by Zeke's closing sentence ("On the remaining open items, apply your recommendation."): the creates workflow triggers on Entered = Yes with "created after the cutover date" as a filter; no further hold for new post-cutover records | Zeke | BR4 in production; item 24 must ship before cutover |
| 19 | O-11 is a test, not a question: does CR accept a changed `PrimaryEmail`? If not, Zeke decides the rule | Zeke after R1-U1 | B4, T2 updates |
| 20 | **O-CR-BUDGET** (Zeke, 2026-11-23). Calculate the actual CR API cost per month from measured production volume, and change the code so usage stays below the Core tier cap (150,000 calls/month; $0.003/call overage). **Measure:** CR's usage page (weekly, from now, with the reset date); the production change rate per day (before cutover); in the first 2 to 4 weeks of phase 1, from the App Insights `crCalls` with sampling off: calls per day by kind and outcome, the creates per month, the share of label POSTs not confirmed, and the records in error or waiting per day. **Then** recompute the phase 2 projection and decide on build items 20 to 22 and H-Q6. Details: build package H7 | Zeke/Optidge | The existing-records phase (9.8 step 3) |
| 21 | **O-HS-JOURNAL** (Zeke, 2026-11-23): "Make a note to research and confirm if we can utilize the webhooks journals beta if we can reduce calls through this, leave it as an open item to confirm". Research and confirm whether HubSpot's webhooks journal API can replace part of the change detection. **First read of the HubSpot docs:** it would reduce **HubSpot** API calls (the poller's CRM searches, perhaps the workflow webhooks), but **not CentralReach** calls, which are the 150,000 budget: a CR call is made only when a mapped value changed. It still needs the per-record HubSpot read, keeps 3 days of history (so the daily sweep stays), and needs an app with an OAuth client-credentials token, not today's private-app token. To confirm: beta status, custom-object and association-label coverage, the app requirement. Details: build package H8 | Zeke/Optidge | Nothing. Not a fix for O-CR-BUDGET |
| 22 | **Sandbox-only properties, workflows, lists and reports. Decided (Zeke, 2026-11-24 afternoon):** "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production". The code's production deploy still waits for the read-only pre-deploy check to find the Case `referral_other`, `care_coordinator_first_name`, `care_coordinator_last_name` and `coordinator_export_status` (404 in production on 2026-11-24) | Zeke (decided) | Production deploy of build package items 2 and 6 |
| 23 | **Production phases. Decided (Zeke, 2026-11-24 afternoon):** "Production will push in two phases: 1. Create records only. 2. Review of existing records in HubSpot against the existing records in CentralReach. It is needed to make the existing records in CentralReach reflect HubSpot. Any production discrepancies found between HubSpot and CentralReach are a phase two production build." Orchestrator's reading (not his words): phase one = new records through the creates gate plus later updates of records the integration created (promote-after-create); every existing record and its discrepancies are phase two (build package D19) | Zeke (decided) | E10, E11, E16 (phase two) |

## E. Launch and cutover tasks

1. Remove `INTAKE_POLLER_SCHEDULE` (now every 5 minutes) so the poll is hourly again (BUILD-PLAN line 968). First, run one round at the hourly poll (line 950).
2. Production Azure settings (9.7):
   - `HUBSPOT_PORTAL_ID` = 50317927, with the production token and webhook secret;
   - `HUBSPOT_WEBHOOK_URI`;
   - the object-type settings removed or equal to `2-48354212` / `2-48354559`;
   - `SYNC_CREATE_GATE_PROPERTY` = `centralreach_creates_only` and `SYNC_UPDATE_GATE_PROPERTY` = `centralreach_updates_only` (build package D18 d; needs item 24 deployed). `SYNC_RECORD_GATE_PROPERTY` not set, never `none`;
   - `INCLUDE_TEST_RECORDS` absent;
   - `ALLOW_EMPLOYEE_CREATE` / `PUT_ONLY_MODE` set per 9.8 step;
   - `LEASE_TTL_SECONDS` 660.
3. Confirm the production private app can call `GET /account-info/v3/details` (the F-3 check; without it every run fails). Check.
4. Review or remove the App Insights sampling-off setting (BUILD-PLAN 7.3).
5. Add Danny or a shared inbox to action group `uca-sync-deadletter-owners`, and prove an email arrives (BR15).
6. Before the switch:
   - check that both queues hold no test messages;
   - purge both queues' dead letters;
   - Cosmos keys carry the portal ID, so the sandbox state is not read in production (check);
   - check whether production uses the same Function App.
7. Production HubSpot (9.6). Zeke (2026-11-24 afternoon): "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production" (D row 22). Before the production code deploy: the Case `referral_other`, `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status` (build package items 2 and 6):
   - the two gate checkboxes and the two segments per object (build package D18 c);
   - webhook workflows per object, filtered on the two segments, with the 7.2 trigger list (`workday_id`, checklist, BCBA `email` and `personal_email`, the five staffing names, the two hours fields);
   - the Contact workflow (O-21);
   - failure views and waiting views;
   - the 24-hour report (guide line 821).
8. Step 9.6 sensitive GET: one read-only production GET of a Case with the sensitive properties (R-23).
9. Check that the production stored option values for `staffing_status` equal the label names. The code matches them exactly (`buildClientMetadata.mjs:251-253`). Same for `n1_what_type_of_insurance` (A-10).
10. Step 9.4, existing employees (phase two under Zeke's two-phase ruling, D row 23; the linking of D6 still comes before any tick):
    - match the 515 Yes records with no `employee_id` against a CR export;
    - the 6 hand-linked BT/RBTs;
    - the duplicate `employee_id` / `client_id_number` search (R-27);
    - count CR External System IDs of 10 or more digits (A-5);
    - BT/RBT `50160788279` (O-8);
    - the 5 malformed production Workday IDs and Sara's final word on the 7-digit rule (O-8): owner Zeke, "I will handle this." (2026-11-24; build package D20).
11. Step 9.5, existing clients: why 81 of 100 Client IDs do not resolve; list the Cases with Yes and no Client ID (R-2, R-17). Phase two (D row 23).
12. Clean up the test records in production CR:
    - make R1 client `5384589` and employees `5384530`, `5384531` inactive, and every later round's records too;
    - fill `sandbox-test-log.md`, which is still empty.
    - R1-WD left a Workday-style ID on `5384530`, `5384531`. If it is a realistic 7-digit value, change it to `AZTEST-…` on the CR profile so a future real hire cannot match it (check).
13. Guide notes for decisions 39 to 51 (O-34) and the final record (9.9), on Zeke's request.
14. O-25: after the production run, confirm the HubSpot app overview no longer shows old API versions.
15. Commit the testing chat's uncommitted script and doc changes, on Zeke's word.
16. Step 9.8: go-live in three steps (new employees, then new Cases, then existing records in batches). Under Zeke's two-phase ruling (D row 23), read by the orchestrator as: phase one = the first two steps (creates of new records); phase two = the third step (the review of existing records and any discrepancy build). Watch the failure view, the waiting view and the alert daily for the first week.

## F. Suggested order to reach launch

Shortest path first. "‖" marks work that runs in parallel with the step above it.

1. Today:
   - send B1 (label timing, with the re-sent update) and B2 (one-line logs) to the build chat;
   - ‖ Zeke sends D2 to D10, D15 and D16 to Danny in one batch. Answers take the longest.
2. Testing chat: revise the R1-U1 run sheet for R1-WD.
   - The employees are now `success`. Drop the checklist steps (they move to A6).
   - Add the A1 rows that are missing.
   - Add the no-write BR8 and BR11 tests (A6).
   - Add `--step u1` and `--cr-id` use to `check-cr-record.mjs`: the lookup by HubSpot ID no longer finds the R1 employees, and B2/T2 would FAIL.
3. Run R1-U1 (8 or more pushes, about 2 hours), with the R1 extras (BR4, BR7) and A5 (T7).
4. ‖ Build chat fixes B1 and B2, with tests (C1, C2). Deploy between rounds, not during one: Stop, deploy, Start, on Zeke's go-ahead.
5. R1-U2 (closes O-35). If client core fields are cleared, B21 becomes a build-chat row.
6. Make R1 inactive in CR (needed for the BR8 Case method). Re-run round 2 with `--write`. Run R2 (A3).
7. R3 (A4).
8. Workday round (A6). It can run between R2 and R3 on its own records, but one push at a time. It needs D1.
9. ‖ From step 3 on, Zeke and Danny run the production work: 9.3, 9.4, 9.5 data checks; 9.6 workflows, views and report; the sensitive GET.
10. A7: retries to dead-letter with the alert email; the deleted-label test; one round at the hourly poll.
11. Clean up the test records in CR (E12). Decide 9.1 and 9.2.
12. Cutover: remove `INTAKE_POLLER_SCHEDULE`; production settings (E2 to E6); deploy the reviewed commit.
13. Step 9.8, steps 1 → 2 → 3. Each step waits on its D items: step 1 on D2, D4, D5, D7, D10; step 2 on D8; step 3 on D9 and E10, E11.
