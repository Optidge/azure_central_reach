# Sandbox testing hand-off (2026-11-20; updated 2026-11-23 for decisions 41 to 51 and round 1)

For any agent continuing the sandbox testing work. Read this first, then the files it names.

## START HERE: state at 2026-11-24 ~19:30 UTC (latest; read this first)

The testing chat was handed to a new chat at this point (Zeke: "at 65% we're going to create a hand of and pass of to new a chat to manage context. Same for the @[i.p - Architecture Build 2]"). Do not use closed threads.

**Live state.** Poller OFF (`AzureWebJobs.intakePoller.Disabled=true` on `centralreachserverless`); webhooks and queue workers run. Deployed code is still `655b385`. Nothing is committed, nothing is deployed, nothing is written to the Google Doc. CentralReach calls on 2026-11-24: 27 (30 if Zeke's B21 script ran twice). HubSpot production: read-only.

**Build chat:** "i.p - Architecture Build 2" (`local_9a7283cf-7e1c-4d6a-8ea0-cb7976923a64`). By its own reports (not verified here): steps 1–8 and last-pass A–D built and reviewed (rule 7, blank supplier sends nothing, junk Address 2 → null, tighter street split, Allergies and Severity, Care Coordinator and Referral - Other, employee blank date of birth = send back CentralReach's date, absent key = failed read); 1,350 tests passing; a final fix pass and five verification agents were running. It asks Zeke for the commit word in ITS chat after its final report. It follows the same 65% hand-off rule: if it names a successor, use that session ID.

**Zeke's standing rules added today (all in memory):**
- Source order for any field or example: HubSpot production, then CentralReach, then the sandbox last; read-only.
- Full coverage is a gate: "our end to end test must test EVERY requirement, for all entities, in each state, the the webhook and the poller on in azure"; "This is a requirement to confirm." No retest and no "the plan is ready" until an independent check shows 0 gaps; exceptions go to him as a named list.
- "please ensure the test is written that it is the most efficient and quickest path to cut to phase 1 of production please."
- Production in two phases: phase one creates new records only (plus later updates of records the integration created; he confirmed this reading: "Yes, all three"); existing records are phase two. Sandbox-only properties, workflows, lists and reports are deployed from sandbox to production.
- Latest requirement wins: he caught a stale reading (the Contact workflow; Guardian fields are Case sync properties since 11/09; BCBA personal email reads the BCBA's own `personal_email`, decision 50). Check dated notes and BUILD-PLAN decisions before stating any requirement.
- Models: most token-efficient model that is good enough for new work; best model for the most important build pieces; never stop a running worker to switch.

**Files that hold the work (read these, not chat memory):**
- `requirements-review-2026-11-24/00-MASTER.md` and slices `01`–`08`: every guide requirement (1,400 rows), gaps, test rows to add, build items, Azure, guide updates, 38 questions. Guide snapshot: `guide-extract-2026-11-24.md`.
- Test plan, rewritten today, NOT yet confirmed: `sandbox-test-matrix.md`, `sandbox-coverage-ledger-2026-11-24.md` (1,275 rows; the worker claims 0 gaps; 61 rows BLOCKED, which are not covered), `sandbox-rounds/retest-run-sheet-2026-11-24.md` (S0–S11; 22 pushes, 6 new CR records, about 900 CR calls, about 6.5 hours), `SANDBOX-TEST-PLAN.md`, `scripts/sandbox/create-test-records.mjs`, `check-cr-record.mjs`, `kql/`.
- Four independent checks were running at hand-off; each writes ONE file in this folder: `sandbox-coverage-review-A-2026-11-24.md` (ledger slices 01–04), `sandbox-coverage-review-B-2026-11-24.md` (slices 05–07, with the entity × state × path table), `sandbox-coverage-review-C-2026-11-24.md` (run sheet, scripts, safety, efficiency, prerequisites for Zeke), `requirements-recency-audit-2026-11-24.md` (every dated guide note and decision against every row; settles the Contact workflow O-21 question). If a file is missing, the check has not finished; the old testing chat relays the completion.
- Guide text for approval: `GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md` (Batch 1: 46 inserts, Batch 2: 34; independently reviewed; revision `AHj4eMRPez…` read 18:34 UTC). HOLD until the recency audit is applied to it. Then show Zeke the exact text; write only on his word; re-read the revision first; batch 2 indexes after batch 1.
- Decisions: `BUILD-PACKAGE-DRAFT-2026-11-23.md` ("seventh set" = this afternoon's answers), `REMAINING-GAPS-2026-11-23.md`.

**Next steps, in order:**
1. When the four files exist: apply their fixes to the ledger, matrix, run sheet, scripts (and the recency audit's fixes to the slices and the guide draft). Mid-tier model for listed fixes; best model for anything that sets an expected CentralReach value or a safety rule; an independent re-check that gaps = 0.
2. Report to Zeke: confirmed coverage with the count; the exceptions list for his approval; the BLOCKED rows by cause; the prerequisites he must do or approve before S0; the P1 / P2 option (the worker recommends keeping the 5 P2 rows); the Contact workflow conclusion.
3. Show Zeke the guide text; write on his word.
4. Build chat's final report → Zeke's commit word there → deploy on his go-ahead (poller off) → refresh sandbox records (`--write`, rounds 1, 2, 4; create round 3) on his word → poller on, on his word → run sheet S3–S11, each CentralReach-writing or Azure step on his word.
5. Still open in the package, not covered by "apply your recommendation": question 8 (NY Medicaid held only in CentralReach), question 17 (item 13), H-Q1 to H-Q6 (CentralReach budget).


## State at 2026-11-24 (afternoon and evening detail; superseded as the entry point by the section above)

**Update (2026-11-24, evening).**
- Zeke, verbatim, on full coverage: "This is a requirement to confirm. The plan and full end to end test must" cover every requirement for each entity in every state. Hard gate (saved in memory `e2e-test-must-cover-every-requirement`): no retest, and no "the plan is ready", until an independent check of the coverage ledger shows 0 gaps; exceptions (offline-only, production-only, phase two, deferred NM/VA, retired) go to Zeke as a named list for approval.
- Zeke, verbatim, on speed: "please ensure the test is written that it is the most efficient and quickest path to cut to phase 1 of production please." The run sheet is being redesigned for the fewest pushes, states side by side, rows tagged P1 / P2, a critical-path list at the top.
- Zeke confirmed three guide wordings: "Yes, all three" = (1) Care Coordinator field 138851 is not omitted, his decision; (2) phase one records still receive later updates, only records that already existed in CentralReach wait for phase two; (3) "these rules are rig" means "right" (item 10 outgoing roles).
- Guide text: `GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md` now holds Batch 1 and Batch 2 (about 80 insert-only texts), independently reviewed (33 texts corrected) and being finalised. NOT written to the doc; Zeke approves the exact text first; re-check the revision ID right before the write; batch 2 indexes are recomputed after batch 1.
- Build chat last pass (its reports, not verified here): passes A–D built and reviewed or in review (rule 7, blank supplier, junk Address 2 → null, tighter street split, Allergies and Severity, Care Coordinator and Referral - Other, employee blank date of birth option (a) with absent key = failed read); 1,350 tests passing; one fix pass left; then it asks Zeke for the commit word in its own chat.
- Running at the time of writing: the test plan / matrix / run sheet / ledger worker; the guide draft finalising worker. Next: independent review of the test plan and ledger, then report to Zeke with the exceptions list, the P1 / P2 option, and the guide text for approval.


**Update (2026-11-24, later): final requirements review, and two rulings from Zeke.**
- Review output: `requirements-review-2026-11-24/` (slices 01–08, each independently reviewed; live-read edits independently checked, rows `[R2]`; `00-MASTER.md` = totals, every gap, test rows to add, build items N1–N10, Azure, guide updates, 38 open questions). The completeness critic was re-run after an API error; check the end of the master for its section. Headline: 1,400 rows, 355 proven live, 403 planned, 252 offline only; nothing pushed yet for Colorado or New Jersey; no Case has run through the poller; the Contact fan-out has not run live. Guide snapshot: `guide-extract-2026-11-24.md` (the doc revision changed today, so the approved insert batch indexes must be recomputed before any write).
- Zeke, verbatim: "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production".
- Zeke, verbatim: "Production will push in two phases: 1. Create records only. 2. Review of existing records in HubSpot against the existing records in CentralReach. It is needed to make the existing records in CentralReach reflect HubSpot. Any production discrepancies found between HubSpot and CentralReach are a phase two production build." Orchestrator reading (not his words): phase 1 = new records through the creates gate (and the promote-after-create he confirmed on 11/24); existing records, including the 4,654 BT/RBTs with no type and the NM/VA BCBAs, are phase 2.
- Build chat ("i.p - Architecture Build 2") is STOPPED on Zeke's word after steps 1–8 (1,329 tests passing by its report; nothing committed or deployed). It waits for Zeke's answers, forwarded verbatim from this chat, then one last build pass, then the commit word in that chat. Its hand-over note: `/Users/zeke/Library/Application Support/Claude/side-session-notes/local_2ccd8fb8-b5cd-48eb-9100-fe083b3cfd81/` (file name starts `build-chat-2-hand`).
- **Nine build decisions: answered by Zeke (2026-11-24 afternoon).** His words are quoted verbatim in `BUILD-PACKAGE-DRAFT-2026-11-23.md` ("Two rulings and the nine build decisions", seventh set). Closing (Zeke): "On the remaining open items, apply your recommendation." Where he asked "is this recommended?", the orchestrator answered from the production reads and applied it under that sentence. Outcomes:
  1. Junk Address 2 (q7): `null` (he asked "is this recommended?"; applied).
  2. 138851 (q25): **not omitted**; items 6 (Care Coordinator) and 2 ("Referral - Other") built now for the sandbox proof; the 69 hand-entered CR values are phase two; the production deploy waits for the four Case properties (404 in production 2026-11-24).
  3. Two Supervising BCBAs, one holder (q26): rule 7 as written, code changed to match (he asked "is this recommended?"; applied); mixed case offline only.
  4. Blank date of birth on an employee update (q27): option (a), BCBA and BT/RBT; placeholder on a create only.
  5. Allergies and Severity: un-held (closing sentence), with `Confirmed` + "NA" → `Yes`.
  6. Blank typed supplier (O-58): sends nothing (closing sentence).
  7. Missing CR ID key (O-57): "7. Keep the behavior": the visible `error` stays.
  8. Whole address in the street field (O-59): split only when a state comes before the ZIP (closing sentence).
  9. Item 10 rules: confirmed ("9. these rules are rig").
  Also closed by the closing sentence: package question 24 (creates workflow, as recommended) and requirements-review master questions 10–38 (each as recommended; the ones that still need a step-level go-ahead are listed in the package, section E question 32).
- **Sent to the build chat 2026-11-24 for one last build pass** (items 2, 3, 5 rule, 6, 8, rule 7, option (a), O-58, O-59, N7, N9, N10); the commit word is Zeke's in that chat.


Refreshed 2026-11-24 (late) so a fresh agent can continue from this section alone. Older sections below are history.

**Poller OFF:** `AzureWebJobs.intakePoller.Disabled=true`, read back 2026-11-24 (the daily sweep is off with it). On 2026-11-24 it was turned on for a few minutes on Zeke's word ("Please turn the poller on as well"), then off again ("Go ahead and turn the Poller off until we start testing."); the logs for those minutes were not checked. Zeke: "Note that we will turn the Poller on when our changes are implemented and we are ready to test again." Re-enable only on his word at that point (an Azure write).

**Build chat:** "i.p - Architecture Build 2" (local_9a7283cf-7e1c-4d6a-8ea0-cb7976923a64), same checkout and branch (`architecture-update`, deployed `655b385`). Zeke: "Don't use these closed threads." Never use "Closed - Architecture Build" (local_a0491721-671a-48fd-8517-62f3fb0833b4) or "Closed - Optidge/United Care ABA integration plan" (local_7f53b811-35e1-45e6-830b-fc9c438fa9d3).
- **Its reported progress (its own reports, not verified here):** step 1 (items 14 + 24) built and reviewed, no blockers, 3 should-fixes queued; step 3 (items 4, 7) built and reviewed clean; step 8 (items 12, 18) building; steps 2, 4, 5, 7 queued; 1,233 tests passing after step 1. **Nothing committed, nothing deployed.**
- **Sent to it today:** (1) the package message (top of `BUILD-PACKAGE-DRAFT-2026-11-23.md`); (2) the 7-gap notice; (3) the package fixes; (4) the second review's corrections (item 1's update-with-blank half held; B21 format check and R1-U2 round-trip; item 24 `setGate` only on `record_gate`; item 15 Workday fixtures; the existing tests that change for B21 and items 4 and 5; item 6 keeps decision 39 unless Zeke approves the omit; item 9 quote correction, separate BCBA property list, 227 holder-side assumption; the supersessions of BUILD-PLAN decisions 48 and 22). Zeke's B21 production read (below) is not among these four; send it if the orchestrator has not.

**Zeke's decisions today (recorded verbatim in the package):**
- The 7 recommendations: "Yes, all 7" (guide blocks A–E approved; C and E repeated at guide extract lines 512 and 503; the guard pins the two gate names; the creates and promote workflows as drafted; the minimal live gate test set D18 g; the link-property history check at cutover; the package sent).
- E2 / O-10 (who fills the BCBA `date_of_birth`): "we are filling in this date with the placeholder value that we are currently using." Placeholder `2000-01-01`.
- E9 / O-8 (5 malformed Workday IDs; Sara's word on 7 digits): "I will handle this." Zeke's task, package D20.
- E10 / O-27 (Salaried on test client `5384589`): "Irrelevant. Remove from the doc". Removed.
- E14 (sandbox coordinator workflows): "turned on and functioning." Closed.
- **Source-order rule:** "From now on, moving forward, always check the production portal for any fields or live example records so you can see the actual production values. You can check read-only. Same for CentralReach, and then sandbox list last." Read as: HubSpot production first, then CentralReach, then the sandbox last, all read-only.

**Production-check findings today (read-only; findings, not Zeke's decisions):** E6, Dijana Dujmovic is not a Grad Permit holder (closed by the data); E8 / A-13, keep BL5 as built and add label `1107647` to the existing-records review; E7, Address 2 junk (`",  , New York "` on 5 of 25 More Than One Location Cases) recommended as `null`.

**B21 production read (Zeke ran it himself, 2026-11-24):** 3 CR calls (1 token, 2 GETs of production clients `4438604`, `4717582`), both HTTP 200, contact ID matching. All 11 core keys present on both; a blank core field comes back `""` with the key present (`addressLine2` on the second); no `null`; `contact.externalSystemId` absent on both (present on the test client, which holds one); filled shapes match the PUT body. Result: the missing-key = failed-read rule stands, B21 is buildable, R1-U2 must still show an unchanged round-trip before production. Recorded in the package, item B21. The `externalSystemId` finding (absent when blank, present when set) is noted against item 23 (dropped) for the orchestrator to assess; item 23 is not undropped.

**Waiting on Zeke (each with the recommendation).** Items 2 to 7 below were answered 2026-11-24 afternoon (outcomes at the top of this section); only item 1 still waits:
1. Go-ahead to write the 7-insert guide batch (`GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md`, "Final batch"). Recommendation: write it; re-check the revision ID right before writing. Still waiting: the final batch is shown to Zeke, exact text first, before any write.
2. (Answered.) Creates workflow, package question 24. Recommendation: trigger on Entered = Yes with "created after the cutover date" as a filter; no further hold for new post-cutover records.
3. Junk Address 2 (package question 7, item 5). Recommendation: send `null` when the value, commas removed and spaces collapsed, is empty or one state name or code.
4. Omit 138851, package question 25. Recommendation: omit (until he answers, decision 39 stays: `care_coordinator_name` → 138851).
5. Two Supervising BCBAs with one holder, package question 26. Recommendation: leave 136052 and 131308 out with a warning (built that way unless he says otherwise).
6. Un-hold Allergies (item 3) and Severity (item 8). Recommendation: yes; CF §10 confirms both, and CF §11.1 adds `Confirmed` + "NA" → `Yes`.
7. Item 1's update-with-blank rule, package question 27. The read is DONE (2026-11-24, 2 CR calls): `GET /contacts/employee/5338681` returns `contact.dateOfBirth` as a 28-character ISO date-time, with every other core employee key present. Waiting only on Zeke's word. Recommendation: option (a): send back the date CentralReach holds (rebuilt as `YYYY-MM-DDT00:00:00.000Z`); an absent key is a failed read, no PUT. A blank-date employee was not read.

Settled, not waiting: the typed-supplier " BCBA LBA" suffix rests on guide insert E, whose text Zeke approved ("Yes, all 7"); package item 9 rule 5.

**Calls today:** CentralReach 27 (20 production checks, 2 test-client read, 3 Zeke's B21 run, 2 test-employee read; 30 if Zeke's B21 script ran twice, not confirmed). HubSpot production: 59 GET/search (read-only).

**Next steps for this chat, in order (each live step on Zeke's word):**
1. Test tooling and matrix update (requirements-review master section 4, N8), for the answered decisions.
2. The final guide batch, shown to Zeke (exact text) before any write.
3. Azure changes at their step (master section 6.2), each on his go-ahead.
4. Then deploy (after the build chat's commit, on Zeke's word there), refresh the sandbox records (`create-test-records.mjs --write`), poller on, retest (gate test set D18 g; R1-U2 with the B21 unchanged round-trip and option (a) on both employees).

~~Earlier next steps (superseded 2026-11-24 afternoon):~~
1. ~~Zeke's answers to the list above → forward them, and the B21 production read, to the build chat.~~ Done: sent for one last build pass (above).
2. The build chat finishes; Zeke gives the word to commit there.
3. Deploy on his go-ahead.
4. Gate test set D18 g: the two sandbox Function App settings and turning the poller on are Azure writes on his word; check `ALLOW_EMPLOYEE_CREATE` first.
5. Sandbox re-test rounds (R1-U2 includes the B21 unchanged round-trip).

**2026-11-24, test tooling moved to build package items 1 and 16 (file edits only; no live call, nothing run with `--write`).**
- `create-test-records.mjs`: the BCBA test date is in `date_of_birth` (R1 `1/15/1990`, R2 `Feb 16, 1991`, R3 blank); `dob` is the decoy `3/9/1975`, set in every round. The BT/RBT 1 Contact `date_of_birth` R1 form is `2/20/1992` (item 16). New read-only check, both modes: stops if the sandbox BCBA or Contact `date_of_birth` is not text. `check-cr-record.mjs`: expected values unchanged, comments only. Matrix rows B5, T2, R1-U2, the decoy table and SANDBOX-TEST-PLAN updated.
- **Existing sandbox BCBAs hold the old decoy `date_of_birth` = `1980-07-04`** (round JSONs: BCBA decoys done incl. `date_of_birth`): round 1 `67036479540` (CR `5384531`), round 2 `67197219211` (never pushed), round 4 `67208227438` (CR `5385360`). Retest order: items 1 and 16 deployed with the poller still off → plan run, then on the orchestrator's word `NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round N --write` for N = 1, 2, 4 (sandbox HubSpot writes) → read-backs clean → poller on (Zeke's word). The poller then runs the R1 and R4 employees: CR `5384531` and `5385360` (BCBAs) and `5384530`, `5385357` (BT/RBT 1) should end `noop` or send the same dates CR holds (1990-01-15, 1992-02-20); 1980-07-04 or 1975-03-09 in CR is a fail. Never re-run a round while the old code (`655b385`, reads `dob`) is deployed and the poller is on.
- R1-U2's BCBA blank `date_of_birth` ~~is blocked on package question 27~~ is unblocked (2026-11-24 afternoon: option (a), BCBA and BT/RBT). B5 and T2 R1 passes were proven under the old rules; re-prove on the next creates (R2, R3).

Nothing committed.

## State at 2026-11-23 ~22:30 UTC

**Poller OFF overnight** (Zeke: "please update the Poller and turn it off until I start retesting tomorrow"): app setting `AzureWebJobs.intakePoller.Disabled=true` was set on centralreachserverless and read back. This also stops the daily sweep, which runs inside intakePoller; intakePoller is the only timer function. Webhooks and the queue workers still run. `INTAKE_POLLER_SCHEDULE` stays `0 */5 * * * *` for the retest. To turn the poller back on, set `AzureWebJobs.intakePoller.Disabled=false` or delete the setting (an Azure write; on Zeke's go-ahead).

**Next session:**
- Zeke answers the 7 decisions: guide blocks A–E (`GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md`); repeating C/E at lines 512/503; pinning the gate names; the creates and promote workflows; the live gate test set; the link-property history check; sending `BUILD-PACKAGE-DRAFT-2026-11-23.md` to the build chat.
- Then build, deploy and the sandbox re-test.
- Two gate checkboxes (`centralreach_creates_only` / `centralreach_updates_only`) now exist in the sandbox on Deal, BCBA and BT/RBT; none is ticked.

## State at 2026-11-23 ~21:00 UTC

Goal (Zeke): push to production today, with every guide field and label tested and confirmed. Workers are split between Fable 5.2 medium and Opus 5.5 high until go-live; never stop a running worker to switch models.

**Proven live today (independently reviewed, all confirmed against App Insights; no unapproved CR write):**
- Round 1 create: BT/RBT 17/1/3 (T7 is a test-data gap); BCBA 26/0/3; Case 55/0/7.
- R1-WD: CR already holds the Workday ID → `success`.
- Round 4 (R-WD split pair):
  - BT/RBT 67208455469 → CR 5385357, created with workday 4465360 → `success`.
  - BCBA 67208227438 → CR 5385360: `waiting` for the Workday ID; then workday 7167221 set → `waiting` "Replace the temporary External System ID…", one update, no create.
- BR10 checklist guard: tick with the temporary ID still in CR → `error` CHECKLIST_STILL_TEMPORARY (the checklist is still ticked; untick = run sheet step 5, awaiting Zeke).
- INTAKE_POLLER_SCHEDULE = every 5 minutes (remove at cutover). Host restart at 17:29:55, harmless.

**Files (the source of truth; read these, not chat memory):**
- `REMAINING-GAPS-2026-11-23.md`: the full gap list A–F.
- `BUILD-PACKAGE-DRAFT-2026-11-23.md`: Zeke's decisions verbatim plus the build items. Being revised after the independent review (7 fixes; "Ship today" order).
- `DECISIONS-EVIDENCE-EMPLOYEES-2026-11-23.md` and `DECISIONS-EVIDENCE-CASES-2026-11-23.md`: production evidence; review corrections are being added.
- `FEEDBACK-REVIEW-CR-ACCESS-REFERRAL-2026-11-23.md`, `FEEDBACK-REVIEW-GRADPERMIT-ROLES-2026-11-23.md` (§8 Final governs) and `FEEDBACK-REVIEW-COORDINATOR-FORMATS-2026-11-23.md` (pending-reads results to be appended).
- `CR-API-USER-ACCESS-REQUEST-2026-11-23.md`: being written; the permissions and the message for Danny.
- `SHADOW-COMPARE-EMPLOYEES-2026-11-23.md`: Zeke moved the shadow comparison to the production push.
- `sandbox-rounds/round-1-log.md`: R1-U1 run sheet (8 pushes, not run), R-WD run, Care Coordinator setup.

**Biggest launch risk:** the CR API user is not *connected* to most contacts. It sees about 199 clients and 909 employees; 404 = not connected (CR docs). Danny must connect it to all clients and employees. Until then, existing staff can't be found and would be created again. Cutover rule (Zeke): existing CR records stay gated; only new records are created; differences are listed before cutover; the existing-record comparison is via a CR export or the API (pending).
**Update (Zeke, 2026-11-23):** the API user is Gavriella Bohan (CR 4147071), with all needed permissions, and she is now connected. Still to do: the read-only verification; **auto-connect from her profile to all new clients (cutover task)**; and **a dedicated API user (owner: Danny)**. See `CR-API-USER-ACCESS-REQUEST-2026-11-23.md`, "Status".
**Verified after connect (read-only, 2026-11-23 20:46 UTC):** 4871945, 4717582 and 5265763 return 200; the API now sees 713 clients and 1,581 employees (no 403); 487 of 489 Case Client IDs resolve; not visible is down to 3 BT/RBT and 1 BCBA. **Still a launch risk:** 181 BT/RBTs and 11 BCBAs with Entered = Yes are in CR only by email or name, so the External System ID lookup misses them and they would be created again unless `employee_id` is written first. The CR screen totals are not yet compared. See the same file, "Verification after connect".

**Update ~21:30:** the build package is revised (`BUILD-PACKAGE-DRAFT-2026-11-23.md`, "Ship today" order: 14 → 1+16 → 4, 7, 17 (+3, 8 once answered) → 9+10 (or omit 131308) → 5; 138851 omitted). The format results (CF §9) supersede earlier format evidence. The consolidated questions with recommendations (15 items) were sent to Zeke in chat; his answers are the next step.

**Update ~22:00.**

Zeke decided:
- production Care Coordinator and Referral properties "will be created";
- the Workday check ships now, "pending final confirmation";
- NM/VA is deferred until the client works in those states;
- workers verify with the guide and production reads before asking (saved in memory).

Done since:
- Sandbox Deal property `referral_other` ("Referral - Other") created. The production name is the same; it is not yet a sync. Round 2 test wired for C36; the command is `--round 2 --write`.
- Grad Permit source found: people set `lba_licensure__ny` by hand, plus a copy workflow from `grad_permit_status` since 10-22. The real misses are Dominique Plummer and Katie Vangraefschepe (4 Cases); Dijana's status was cleared.

Open for Zeke:
- B21: Route A (read CR, send back the stored value), never clear core client fields;
- Allergies, Severity and service address go-ahead;
- recreate `referral_other` as a sync;
- Referral = Other with blank text → send "Other";
- who sets the licence on Dominique and Katie;
- is Dijana a holder.

**Update: production gating, existing records and the label fix (Zeke, 2026-11-23).** Detail: `BUILD-PACKAGE-DRAFT-2026-11-23.md`, D18, D19, items 12 and 18.

- **Gate (Zeke):** "For each workflow that will be pushed into production, we will create a two segments that will gate — for creates: central reach creates only — For updates: central reach updates only — anything not on those segments will not be created or updated until outstanding items are confirmed from united care. * this handles the The remaining risk is duplicates at cutover, not visibility."
  - A workflow segment gates only the webhook. The poller, the daily sweep, the Contact fan-out and the retries are gated by the record gate checkbox, which the code reads on every path (table in D18 a). The linked recheck no longer exists.
  - Recommended, no code change: one checkbox, `sync_to_centralreach`, set to true by a workflow for members of either segment and to false otherwise. Creates segment: Entered = Yes, no CR ID. Updates segment: CR ID known. Both exclude a hold segment taken at cutover (proposed; open question 20 in the package).
  - Cutover setting: `SYNC_RECORD_GATE_PROPERTY = sync_to_centralreach`; remove `INTAKE_POLLER_SCHEDULE`.
  - Sandbox proof still to run (Zeke builds the property, segments and workflows in the sandbox first; the gate setting change is an Azure write on his go-ahead): matrix rows BR4 (rewritten), BR4-U, BR4-X "a record outside both segments → no CR call on any path", BR4-L, BR4-R; BR7 unchanged. The rows are written out in D18 f; the matrix itself is not yet updated.
- **Existing records are a separate phase (Zeke):** "We will confirm any data discrepancies after our testing in sanbox testing is completed in full. Any already created recrods in hubspot in central reach will be handled as a separate phase where we will review then update existing hubspot central reach records."
  - Cutover syncs only records in the two segments. Records already in HubSpot and CentralReach get no create and no update until that phase.
  - Data discrepancies are confirmed after sandbox testing is complete; they do not block today's deploy.
- **Label fix (Zeke):** "Yes please implement the label fix." Build item 12 (about 150 s before the first label retry; the wait only) moved to "Ship today", step 8. Item 13 (one JSON log line) is still awaiting his word.
- New build item 18: tests only, the record gate on every path. No `src/` change.
- **CR API budget (Core tier, 150,000 calls/month; Zeke 2026-11-23):** today used about 7,700 calls (integration 203, read-only research scripts about 7,500); no new CR scan without Zeke's go-ahead, research about 1,000 a day, count and cache every script's calls. Detail and items 19 to 23: `BUILD-PACKAGE-DRAFT-2026-11-23.md`, section H.

**Update: the production gate is now two properties (Zeke, 2026-11-23, fifth set).** This replaces the `sync_to_centralreach` design above. Production: `centralreach_creates_only` and `centralreach_updates_only` on the Case, BCBA and BT/RBT; each segment is "its checkbox is true"; the code reads both on every path (create path needs the first, update path the second; `SYNC_CREATE_GATE_PROPERTY` / `SYNC_UPDATE_GATE_PROPERTY`; build item 24, not built yet). The sandbox stays on `sandbox_test_field`. The two properties were created in sandbox `52311591` on all three objects, ticked on no record; the deployed code does not read them. Existing records: HubSpot vs CR is reviewed on the required properties and the mismatches listed before any is ticked. Items 19 to 22 decided in the reviewer's versions, 23 dropped. New open item O-HS-JOURNAL. Detail: `BUILD-PACKAGE-DRAFT-2026-11-23.md` D18, D19, item 24, H4, H8; guide text in `GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md` (draft, not written to the Google Doc). Gate review (2026-11-23; recommended, awaiting Zeke's word): the production guard requires the exact two names; the promote workflow fires only on the integration's own CR ID write; the "creates" workflow ticks only records created after cutover with Entered = Yes and no CR ID (ticking creates on a person already in CR with a blank CR ID makes a duplicate). Minimal live set, D18 g: BR4-C, BR4-CU, BR4-UC, BR4-X (1-2), BR4-U+L, then BR4; the Case create gate, retries and the Cosmos-only link are offline only; the two settings on the sandbox Function App are an Azure write needing Zeke's go-ahead at that step.

**Open questions for Zeke (as of 21:00; superseded by the 15-item list in chat at 21:30):**
1. Create the production Care Coordinator properties (Case and BCBA) and the "Referral - Other" Case property today?
2. Ship the Workday `^\d{7}$` check now (5 production records would show `error`)?
3. NM/VA labels: go?
4. Accept B21 (a blank core field → `null` on a client update)?
5. Will United Care set `lba_licensure__ny` = Grad Permit on Plummer, Vangraefschepe and Dujmovic?
6. Availability: drop the weekly hours (guide line 360)?
7. Gate checkbox name: `sync_to_centralreach`?
8. Untick the round 4 checklist?
9. Re-enroll Cases 68493177375 and 68592605796 in workflow 1933886108, and give BCBA 67036479540 owner 161391908?

Nothing has gone to the build chat. Nothing is committed (the testing-side files are uncommitted).

## State at 2026-11-23 16:35 UTC

This section replaces "State" and "Order" below where they differ. Full detail: `sandbox-rounds/round-1-log.md` (step 1 and "Notes from round 1").

**Deployed.** `655b385` (T9 hold) at ~15:43 UTC; Function App `centralreachserverless` **Running** (poller and both queue workers on); Azure step 7.3 done (settings for `52311591`, sampling off, dead letters purged, Cosmos empty at start).

**Intake poller every 5 minutes for Stage 8 (INTAKE_POLLER_SCHEDULE); remove before production cutover.** Set to `0 */5 * * * *` on `centralreachserverless` on 2026-11-23 with Zeke's go-ahead ("Yes, set 5 minutes"); removing it puts the poll back to hourly. Detail in the round-1-log "Before the first push" table; the R1-U1 run sheet is regrouped into 8 pushes for it.

**Round 1 create: pushed 16:11:41 UTC** (Entered in CentralReach = Yes on BT/RBT 1, BCBA and Case; Zeke: "Yes set that field on all 3 of the test recors.").

| Record | CR ID | CR check (pass / fail / skip) | HubSpot writeback |
|---|---|---|---|
| BT/RBT 1 | 5384530 | 17 / 1 / 3. T7 fails: sandbox `active_cases_count` blank (test-data gap, not code) | `waiting` "Waiting for the Workday ID" (decision 22, correct) |
| BCBA | 5384531 | 26 / 0 / 3. Extra label 1052549 "Admin" from the Admin contact form (expected) | `waiting` "Waiting for the Workday ID" |
| Case | 5384589 | 55 / 0 / 7 (re-check ~16:45 after the 16:30:49 update; first check 53 / 2 / 7, C11 and C14 from the test-script association defect, fixed) | `client_id_number` 5384589, `success` |

Also proven: the pipe check without a CR write (round 2 creates: webhook → queue → worker → skipped `entry_not_yes`, no CR call); the update path (Case update 16:30:49, `changedFieldNames` only the two staff names); unchanged → noop; the duplicate-webhook guard (`SYNC_IN_PROGRESS` 16:21:19, noop 16:30:56). The matrix Result column is filled for the R1 create.

**Webhooks.** The sandbox workflows fire on record creation and on Entered in CentralReach = Yes, not on a plain field edit of an existing record. The Deal webhook came ~9 min late, and HubSpot sends 2 webhooks per change.

**Open next, in order.**
1. ~~C11/C14 CentralReach re-check~~ Done ~16:45 UTC (Zeke): PASS 55, FAIL 0, SKIP 7; `144602` and `138092` filled, all 5 labels held, none missing or extra.
2. Re-run round 2 with `--write` before using its records: they were made at 16:10 with the old script and have the association gap.
3. R1-U1 update steps, per the matrix U1 column and the round-1-log "R1-U1 steps added". Every CR write needs Zeke's go-ahead at that step.
4. Build-chat findings awaiting Zeke (not decided): (1) the label read-back runs ~15 s after the POST, so every create ends `error` `CR_LABEL_POST_UNCONFIRMED` and needs 1-2 retries (60 s, 300 s) before success; (2) safeLog multi-line output is stored one row per line in App Insights (a single-line JSON log would be simpler).

**How to work.** The testing chat is the main thread. It delegates log reads, CR-check analysis and doc edits to background workers and keeps only their conclusions. The log query commands (App Insights appId, `--offset`), the CR check and the HubSpot read-back are in the round-1-log "Tools" section. Test-script changes of 2026-11-23: `create-test-records.mjs` sends all labels of a record pair in one association PUT and sets the BCBA `email` itself; `purge-dead-letters.mjs` is new.

## Goal

Zeke's intent: prove **every requirement in the Google Drive integration guide** with live tests. The tests run in HubSpot sandbox `52311591`, through Azure (kept running for all of Stage 8), into CentralReach, with a log of exactly what happened.

## Who owns what

| Area | Owner | Files |
|---|---|---|
| Build (wave 2: lanes D, E; the final review; the commit) | "Architecture update in progress" chat, `local_a0491721-671a-48fd-8517-62f3fb0833b4` | `BUILD-PLAN.md`, `OPEN-ITEMS.md`, `src/`, `requirement-tests.json` |
| Testing prep and runs | the Q&A / testing chat (this hand-off) | `sandbox-test-matrix.md`, `SANDBOX-TEST-PLAN.md`, `scripts/sandbox/create-test-records.mjs`, `scripts/sandbox/check-cr-record.mjs`, `scripts/sandbox/kql/`, `sandbox-rounds/` |

Testing agents never edit BUILD-PLAN or `src/`. They send the build chat the exact text, quoting Zeke verbatim.

## State (2026-11-20 to 11-23 morning; superseded by "State at 2026-11-23 16:35 UTC" above)

| Item | Status |
|---|---|
| Wave 1 (lanes A, B, L, C) | Committed `c9d0edf`. |
| Wave 2 (D, E), row 3.20, final review, decisions 41 to 51 | Committed; branch `architecture-update` at `793e2db`. Not deployed. |
| Azure Function App `centralreachserverless` | **Stopped** (checked 2026-11-20). It runs old code. Do not start it before the step 7.3 deploy. |
| Sandbox test matrix | `sandbox-test-matrix.md`. Updated 2026-11-23 for decisions 41 to 51 (step 7.1 a: property names checked against the finished mappers). Not yet agreed by Zeke. |
| Record script | `scripts/sandbox/create-test-records.mjs`. Re-runnable: it reuses records by email or name. Updated 2026-11-23 (BCBA `personal_email`, `dob`; `date_of_birth` decoy; B4: BCBA `email` set to the BCBA Contact email; rotated phone forms; no `ucaba_email_address` decoy). Not run since the update. |
| CR check script | `scripts/sandbox/check-cr-record.mjs`, read-only GETs on production CR. Updated 2026-11-23: B4, B5, B9 sources; T9 SKIP (held); phone compared as exactly 10 digits. |
| Round 1 sandbox records | **Created 2026-11-20** (9 records, all linked, decoys set). IDs in `sandbox-rounds/round-1.json` and the matrix section "Round 1 records". Entered in CentralReach is blank everywhere. Must be re-run with `--write` before the first push (matrix, "Round 1 records"). |
| Anything written to CentralReach | Nothing. |

## Order (Zeke, 2026-11-20)

1. Wave 2 is built, the final review runs, and the commit happens on Zeke's word. That happens in the build chat.
2. Plan review with Zeke. The build chat applies the held "Order after the build" edits: Azure runs for all of Stage 8, row 3.20, and App Insights sampling is off.
3. Round 1 is created (done 2026-11-20). After the wave 2 commit, Zeke re-runs the plan-only check from his terminal: `NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round 1`. Agents cannot run it, because the auto-mode classifier blocks scripts that read `local.settings.json`. If wave 2 changed what the code reads, Zeke re-runs it with `--write`, which updates the round 1 records in place. Before each push, read the record again (T7 `active_cases_count` was still blank 60 s after the create).
4. Azure step 7.3: settings for `52311591`, sampling off, deploy the reviewed commit. Each write needs Zeke's go-ahead.
5. Start the app and keep it running. Push one record at a time by setting Entered in CentralReach = Yes on Zeke's go-ahead. The order is BT/RBT 1, then the BCBA, then the Case. After each push, run a read-only CR GET and compare it with the matrix. Read the `Sync run summary.` log.
6. R1-U1 (updates), then R1-U2 (blank round, closes O-35), then rounds R2 (CO) and R3 (NJ). Then Stage 9.

## Open items

- **C20 and C10 (decisions 41 and 39).** C20 is `hours_bt_work_schedule_1` + `bt_rbt_2_work_schedule`, summed by the code, a blank as 0; `total_hours_btrbt_12` is no longer read (O-43: when to use it instead). C10 reads `care_coordinator_name`. Expected C20: 16 / 11 / 14, U1 17.
- **B4, B5, B9 (decisions 48 to 50).** B4 = BCBA `email`; expected `zeke+bcba_azure_test_N@optidge.com` (the Contact email). The sandbox Contact→BCBA mirror does not run (round 1 `--write` read-back 2026-11-23: blank), so the script sets the BCBA `email` to the Contact email directly (Zeke 2026-11-23: "Just go ahead and populate the BCBA email field please. Make sure we include that in the plan"); in production the workflow fills it. The testing chat set round 1's BCBA 67036479540 `email` = zeke+bcba_azure_test_1@optidge.com that day. The read-back must show `emailVsContact`: "matches the Contact"; otherwise stop and ask Zeke. B5 = BCBA `dob` as text (`readTextDate`); B9 = BCBA `personal_email`, on the record. The BCBA `date_of_birth` is a decoy. No `ucaba_email_address` decoy (Zeke 2026-11-23: "drop the decoy"; it would likely fire "BCBA - Work Email Becomes Primary"). K3 is retired (decisions 42, 44).
- **T9 held (Zeke 2026-11-23):** "For personal email for BT/RBT leave this out for now - make a note to confimr the field with Danny and the client." Confirm the BT/RBT personal email field with Danny and the client (O-51). No test value is set. The sandbox BT/RBT has no `personal_email` property, but the code at `793e2db` still requests it, so every BT/RBT run would fail as a failed read (row 4.18) until the build chat stops requesting it on the BT/RBT. Done in `655b385` (deployed 2026-11-23; the BT/RBT 1 run read cleanly).
- **Sandbox workflow "BCBA - Work Email Becomes Primary"** may move the BCBA `email` / `personal_email` test values. Checked by the read-back before each BCBA push; not worked around.
- **O-11.** R1-U1 changes the BCBA `email` on the BCBA record directly (to zeke+bcba_azure_test_1_u1@optidge.com): the first live test of a changed email by API (decision 47). The BCBA Contact `email`, the script's lookup key, is left alone. A round 1 `--write` re-run after U1 would set the BCBA `email` back to the R1 value.
- **O-38 closed** (Zeke 2026-11-23: "Confirmed. These fields are created in sandbox."). **O-51** (read 2026-11-23): BCBA `personal_email` exists in the sandbox; BT/RBT does not.
- **Decision 51.** The HubSpot re-enrollment triggers are Zeke's, in HubSpot. `webhook-triggers.json` is gone; `node scripts/check-triggers.mjs` only prints a reference list and is not a gate.
- **C30 / C29 defect (guide-confirmed).** Fixed in the build chat (`cd68c50`): a blank carrier sends blank, whatever the "Other" summary holds.
- **C36.** `referral_source` is read-only on the Case and its source is unknown. The question is with Zeke.
- **A-22.** Zeke has to confirm the BR11 reading before the final review.
- **O-8.** The Workday ID format is pending Danny/Sara.
- The other open and held requirement rows are listed in the matrix with their reasons.

## Rules (all from Zeke)

- HubSpot production `50317927` is read-only, always. Reads go only through a guarded GET and search script that checks the portal first and prints counts and names only. Example: `/private/tmp/.../scratchpad/prod-mirror-sources.mjs` (scratchpad; may be gone).
- Every CentralReach write is production and needs Zeke's go-ahead at that step.
- Only create tests that prove a section 9 requirement. Each record or step names its requirement ID.
- Check the Google Drive guide (local copy `guide-extract-2026-11-20.md`) before asking Zeke any question.
- No commit, push or deploy without Zeke's word. Never open `.env` or `local.settings.json`, and never print secrets.

## Facts found this session (also recorded in the matrix)

- **Employee mirror fields** come from the linked Contact (production, counts only):
  - `address` ← `address`
  - `apartment__home` ← `apartment`
  - `city_home` / `location_city` ← `city`
  - `state_home` ← `state_dropdown`
  - `postal_code_home` ← `zip`
  - `employee_phone` ← `phone`
  - BT/RBT `gender` ← `gender_employee` / `gender`
- **Case read-only fields** follow the Guardian Contact:
  - `location` ← `location` / `state_dropdown`
  - `email`, `phone`
  - `guardian_first_name` / `guardian_last_name` ← `firstname` / `lastname`
- `total_hours_bt1bt2_work_schedule` is calculated with the formula `1 + 1`; it and `total_hours_btrbt_12` are excluded totals (C20 above). The script sets `hours_bt_work_schedule_1/2` and `bt_rbt_2_work_schedule`.
- The sandbox `bcba_name` requires every word Capitalized, and it refused "#1", "R1" and "BCBA". So the display names `bcba_name` and `bt_name` use words only ("Zeke Swanson Bcba Azure Test Round One"). The names sent to CR end in "R1".
- BCBA `email` did not mirror from the Contact in the sandbox on 2026-11-20 or 2026-11-23 (production does). Its sandbox description says "uneditable - change it on the contact record", but it can be set on the record: on Zeke's word (2026-11-23) the script now sets it to the Contact email. Since decision 49 it is the B4 primary email.
- Phone (decision 46): the Contact phones rotate their input form per round (`(212) 555-0101`, `+1 212.555.0104`, `212-555-0103 x12`, …); CR must hold the 10 digits only.
- The upcoming-auth `_f` dates get moved into the live auth dates by a workflow, so decoy dates are 2030-01-01.
- In production only 19 of 96 sampled BT/RBTs have `state_home`, so most BT/RBTs will have no mailing state in CR.
- Association IDs (sandbox): Case → BT/RBT Primary BT 1/2 = 238/240; Potential IA 251; Potential Supervising 249; Potential BT 1 242; unlabeled Case → BT/RBT 187.
