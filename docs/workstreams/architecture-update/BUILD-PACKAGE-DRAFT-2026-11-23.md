# Build package for the build chat (2026-11-23, Zeke's final decisions applied; 2026-11-24 decisions applied, afternoon answers included)

## Message to the build chat (sent 2026-11-24: delivered to the build chat; not confirmed read)

> Build from `docs/workstreams/architecture-update/BUILD-PACKAGE-DRAFT-2026-11-23.md` (branch `architecture-update`, deployed `655b385`). Each item names its files, lines, tests and sandbox proof; Zeke's decisions are quoted verbatim in the package (latest: 2026-11-24, sixth set, "Yes, all 7"). Build in this order:
>
> 1. Item 14: the production guard (`src/lib/config.mjs`), with item 24: the two-property production gate (creates / updates). In production the guard requires exactly `SYNC_CREATE_GATE_PROPERTY = centralreach_creates_only` and `SYNC_UPDATE_GATE_PROPERTY = centralreach_updates_only` (decided 2026-11-24); any other value fails and alerts. Item 24 does not change the sandbox, which stays on `sandbox_test_field`. Ship it in this deploy: the live gate test set (D18 g, decided 2026-11-24) runs after it.
> 2. Items 1 and 16: BCBA date of birth reads `date_of_birth`; the BT/RBT date of birth is read as text.
> 3. Items 4 and 7: Physician / NPI, Availability. Item 17 (Maladaptive) is dropped: the current mapping stays. Items 3 (Allergies) and 8 (Severity) are **PENDING record-level check**: do not build them until the package marks them confirmed.
> 4. Items 9 and 10: Grad Permit marker, Supervising BCBA, outgoing roles (GP §8). The holder test reads only `lba_licensure__ny`. If not ready: the fallback, omit 131308.
> 5. Item 5: the two-line service address, with the Case `location` as the state when `stateregion` is blank. Item 6 today is only "omit 138851".
> 6. Item B21, Route A: a new CentralReach client read; a blank core client field sends back CentralReach's stored value and never clears. B21 waits until the testing chat records the GET answer at the item B21 PENDING note; the build chat does not guess the field names.
> 7. Item 15: the Workday 7-digit check, with the note "pending final confirmation".
> 8. Item 12: the label read-back waits about 150 s before the first retry (the wait only; Zeke: "Yes please implement the label fix."). Item 18 (tests only, the record gate on every path) can ride along.
>
> Not in this deploy: ~~items 2 ("Other" text) and 6 (Care Coordinator) wait for their production properties;~~ [2026-11-24 afternoon: items 2 and 6 moved out of this list, built now; seventh set] items 19 and 20 before cutover; items 21 and 22 before the existing-records phase; item 13 awaits Zeke's word; item 11 is deferred; item 23 is dropped.
>
> Rules: bump `MAPPING_VERSION` once for the whole deploy. Do not add a mapped HubSpot property that production lacks (item 2's "Other" text and item 6 wait for their production properties). Do not build anything marked PENDING or Deferred (item 11). Every new test carries its requirement ID and `npm run check:requirements` must pass. No deploy until Zeke confirms the "Before deploy, Zeke confirms" list. No Azure setting write (the two sandbox gate settings for the live gate test set) without Zeke's go-ahead at that step. The build chat makes no CentralReach call and no HubSpot write; the D18 g gate test rounds and the B21 GET belong to the testing chat, on Zeke's word. Commit only on Zeke's word in this chat.
>
> Agents: Orchestrator: the build chat's own (Fable 5.2 medium). Builder: Opus 5.5 high. Reviewer: one independent reviewer per task, Opus 5.5 high, given the files, not conclusions. Never stop a running worker to switch models.

**Corrections after the message was sent (package review, 2026-11-24).** The message above is kept as sent. Where it differs, the items below win:

- **Zeke's answers of 2026-11-24 afternoon (seventh set, below) win over the message and over the bullets after this one.** In short: items 3 and 8 are un-held; item 1's update-with-blank half is option (a), BCBA and BT/RBT; item 6 is **not** "omit 138851": it is built now (Care Coordinator reads the workflow fields), with item 2's "Other" text; item 5 gains the Address 2 rule and the tightened whole-address rule (O-59); item 9 rule 7 stands and the code is changed to match; a blank typed supplier sends nothing (O-58); a Case answer without the CR ID key stays a visible `error` (O-57). The message's rule "Do not add a mapped HubSpot property that production lacks" now applies to the **production** deploy only: the sandbox deploy carries items 2 and 6, and the production deploy waits for their properties ("Before deploy, Zeke confirms" item 1).
- ~~**Item 6 "omit 138851": needs Zeke's word.** No quote of Zeke's approves it, and it supersedes decision 39 (open question 25). Until he answers, do not build the omit: the deployed C10 mapping (`care_coordinator_name` → 138851) stays.~~ **Answered 2026-11-24 afternoon (open question 25): not omitted; item 6 is built now.**
- **Item 1:** ~~the update test is corrected (rule 5.7): a blank sends back the date the CentralReach read holds, or no date key when the read holds none.~~ **Second review (2026-11-24): the update-with-blank half is HELD** (open question 27). The create half and the `date_of_birth` read stay buildable. **Un-held 2026-11-24 afternoon: option (a), BCBA and BT/RBT (seventh set).**
- **Item 5:** `service__stateregion_2` and the other structured service-address properties are on the pre-deploy check (sandbox confirmed 2026-11-24).
- **Item 9:** the BCBA entry does not gain `lba`; GP §8.3 rule 5, its `__nj` / `__co` reads and its " BCBA" test rows are superseded; a Case with two 82 BCBAs is specified (open question 26; answered 2026-11-24 afternoon: rule 7 as written, and the code is changed to match).
- **Item B21:** Route A covers all three update paths, and a core key missing from the client read is a failed read (no PUT).
- **Items 14 and 24:** the setting-matching rules and the run-summary `gate` key are stated.
- **Item 15:** one check point for both paths, with the exact reason sentence and code.
- **Second review (2026-11-24), checked against `655b385`:** item 24 calls `setGate` only on a `record_gate` skip; item 15 names the Workday ID fixtures that change; items 4, 5 and B21 name the existing tests that change; item 9's BCBA batch read gets its own property list (the BT/RBT read is unchanged), and the typed-supplier suffix rests on the approved guide insert E; B21's PENDING note is cleared by Zeke's production read (2026-11-24), and R1-U2 must show an unchanged round-trip before production.

---

Read-only review at deployed `655b385` (branch `architecture-update`). Nothing in `src/` was changed and no live call was made.

**Sources.** `REMAINING-GAPS-2026-11-23.md` section B ("gap #N"), `DECISIONS-EVIDENCE-EMPLOYEES-2026-11-23.md` ("EMP §N"), `DECISIONS-EVIDENCE-CASES-2026-11-23.md` ("CASE §N"), `FEEDBACK-REVIEW-CR-ACCESS-REFERRAL-2026-11-23.md` ("REF"), `FEEDBACK-REVIEW-GRADPERMIT-ROLES-2026-11-23.md` ("GP §N"), `FEEDBACK-REVIEW-COORDINATOR-FORMATS-2026-11-23.md` ("CF §N"), `guide-extract-2026-11-20.md` ("guide line N"), `sandbox-test-matrix.md` ("matrix row").

**How to read an item.** Status is one of:

- **Decided**: Zeke's words of 2026-11-23 (or 2026-11-24, sixth set) are quoted exactly. Build it.
- **Recommended, awaiting Zeke's word**: do not build until he says so (item 13 only; see open question 17). Item 12 is decided (2026-11-23, fourth set).
- **PENDING: …**: another worker's result or a read is still missing. Do not guess; build only the part not marked pending. ~~Items 3 and 8 are **PENDING record-level check**.~~ Items 3 and 8 are un-held (2026-11-24 afternoon, seventh set); no item is PENDING now.
- **Deferred**: not in this package (item 11).

**Final decisions (Zeke, 2026-11-23, third set).** These answer the testing chat's recommendation table (15 items, sent in chat; the table itself is not in the repo).

- **Zeke:** "For the Decisions, with my recommendation for each: Let's do your recommendations please". Applied as:
  - the production guard (item 14) and the BT/RBT date as text (item 16): yes, both ship today;
  - Grad Permit reads only `lba_licensure__ny`, per the guide (item 9);
  - the gate checkbox is `sync_to_centralreach` on the Case, BCBA and BT/RBT (D1). Cutover setting: `SYNC_RECORD_GATE_PROPERTY = sync_to_centralreach`. **Superseded by the fifth set below: two properties, `centralreach_creates_only` and `centralreach_updates_only` (D18, item 24);**
  - B21: Route A, a new CentralReach client read; a blank core client field sends back CentralReach's stored value, never clears;
  - Referral = Other with blank text → send "Other" (item 2);
  - Zeke recreates the sandbox `referral_other` as a property sync. His answer: "In progress to update";
  - the Grad Permit data fix (set `lba_licensure__ny` on Dominique Plummer and Katie Vangraefschepe) is a pre-go-live task for Zeke / United Care (D15);
  - NM/VA stays deferred (item 11) and the Workday check ships now with "pending final confirmation" (item 15); both were decided earlier.
- **Zeke, on table item 15 ("Send Danny the access message"):** "For 15. wait utn". Now superseded: the API user Gavriella Bohan (CR 4147071) is connected (D5). Table item 15 is not this package's item 15 (the Workday check).
- **Zeke, on the service address state:** "use hte fall back". When `stateregion` is blank, use the Case `location` (item 5). Item 5 ships today.
- **Zeke, on Allergies:** "Confirm based on the data please." **On Severity:** "confirm with a record in hubspot and then see". Both are being confirmed record by record by another worker; items 3 and 8 stay **PENDING record-level check**. **Un-held 2026-11-24 afternoon** (seventh set, decision 5): CF §10 confirms both.

**Production gating and the label fix (Zeke, 2026-11-23, fourth set).** Quoted exactly:

- **Zeke, on the production gate:** "For each workflow that will be pushed into production, we will create a two segments that will gate — for creates: central reach creates only — For updates: central reach updates only — anything not on those segments will not be created or updated until outstanding items are confirmed from united care. * this handles the The remaining risk is duplicates at cutover, not visibility." Mapped onto the code in D18.
- **Zeke, on existing records:** "We will confirm any data discrepancies after our testing in sanbox testing is completed in full. Any already created recrods in hubspot in central reach will be handled as a separate phase where we will review then update existing hubspot central reach records." Recorded in D19.
- **Zeke, on item 12:** "Yes please implement the label fix." Item 12 (the wait only) ships today, step 8.

**The two-property gate, the hold review, items 19 to 23 and the webhooks journal (Zeke, 2026-11-23, fifth set).** Quoted exactly:

- **Zeke, on the gate:** "For each workflow that will be pushed into production, we will create a two segments that will gate — for creates: central reach creates only — For updates: central reach updates only — anything not on those segments will not be created or updated until outstanding items are confirmed from united care." Redesigned as Option 2 in D18: two checkbox properties per object, read directly by the code. New build item 24. Option 1 (`sync_to_centralreach`, kept by workflows) is withdrawn.
- **Zeke, on the sandbox and production:** "In sandbox, everything is gated with the the testing sandbox property. In production this will be updated with the two segments based on the new prod properties I stated. please ensure this i updated in the google drive doc". The guide text is drafted in `GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md`; nothing is written to the Google Doc yet. Blocks A–E approved 2026-11-24 (sixth set, recommendation 1; Zeke: "Yes, all 7"): the doc is re-read and the final batch shown to Zeke before writing.
- **Zeke, on the sandbox properties:** "Two-property gate - create these in the sandbox please." Done, sandbox `52311591` only (D18 b). The deployed code still gates on `sandbox_test_field` until item 24 ships.
- **Zeke, on the hold snapshot:** "yes we will review the data in hubspot vs central based on the required properties, what mismatches - please note this for production." Recorded in D19.
- **Zeke, on items 19 to 23:** "Yes to all please". Applied as the reviewer's versions in section H4: 19 as is; 20 the daily sweep only; 21 the smaller variant (hashes saved without the `labels` key); 22 as a rule, no code; 23 dropped.
- **Zeke, on the webhooks journal:** "Make a note to research and confirm if we can utilize the webhooks journals beta if we can reduce calls through this, leave it as an open item to confirm". Open item O-HS-JOURNAL, section H8.

**The gate review's seven recommendations (Zeke, 2026-11-24, sixth set).** The orchestrator put these seven recommendations to Zeke. **Zeke:** "Yes, all 7"

1. Guide blocks A–E: approve the text in `GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md`. The doc is re-read first (revision ID and indexes are from an earlier read), then the final batch is shown to Zeke before writing.
2. Repeating C and E at guide extract lines 512 and 503: yes. The section 3 row at 512 still says "Home: full_home_address", which contradicts block C.
3. Pinning the two gate names in the production guard: yes. Any other setting value in production then fails and alerts instead of syncing ungated.
4. Creates and promote-after-create workflows: confirm both as drafted. Creates ticks only records created after cutover with Entered = Yes and no CR ID. Promote fires only on the integration's own CR ID write.
5. Live gate test set: approve the minimal set (BR4-C, BR4-CU, BR4-UC, BR4-X, BR4-U+L, then BR4). The two temporary Function App settings are an Azure write, asked again at that step.
6. CR link-property history check at cutover: yes. A read-only production check that nothing but the integration fills the link properties, which the promote workflow depends on.
7. Sending the build package to the build chat: send after 1–4 are settled, so it goes once with Zeke's words verbatim.

Applied in: item 14 and item 24 (3); D18 c and D1 (4); D18 g and item 24's sandbox proof (5); "Before deploy, Zeke confirms" item 2 (4, 6); D11 and items 5 and 9 (1, 2); section E questions 20 to 23 (closed); section G assumptions 38, 44, 45; the message at the top (7). Nothing is written to the Google Doc yet: the final batch is shown to Zeke first (1).

**Two rulings and the nine build decisions (Zeke, 2026-11-24 afternoon, seventh set).** The orchestrator put nine build decisions to Zeke, each with a recommendation. His words are quoted exactly (typos kept). Where he asked a question ("is this recommended?"), the orchestrator answered it from the production reads and applied the recommendation under his closing sentence. **Each "Applied" line is the orchestrator's application, not Zeke's words.**

- **Ruling A (Zeke):** "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production"
- **Ruling B (Zeke):** "Production will push in two phases: 1. Create records only. 2. Review of existing records in HubSpot against the existing records in CentralReach. It is needed to make the existing records in CentralReach reflect HubSpot. Any production discrepancies found between HubSpot and CentralReach are a phase two production build."
  - **Orchestrator's reading (a reading, not his words):** phase one = new records through the creates gate, plus later updates of records the integration itself created (the promote-after-create workflow he confirmed earlier on 2026-11-24, D18 c). Existing records are phase two: the 181 BT/RBTs and 11 BCBAs that are in CentralReach by email or name only, the 4,654 BT/RBTs with no type, the NM/VA BCBAs, the CO " BCBA" values (item 9 rule 5), the 69 hand-entered 138851 values (item 6), and label NY Medicaid `1107647` (D19). Recorded in D19.
- **Closing (Zeke):** "On the remaining open items, apply your recommendation."

**Later events, 2026-11-24 (record only; not decisions of the seventh set).**

1. **Zeke, on using test records (record):** "If it makes sense to actually use test records in the sandbox and then in central reach do so. Live calls from test records are ok. If this will cut the testing time for you to test with acutal test records taht we craete for each entity and the states then do so." And, to the plan that followed: "Approved, prroceed."
2. **N1 live check (record):** run on test employee 5338681 and test client 5384589 (13 CentralReach calls plus 3 dry-run). The pending build's subset core PUT blanked unmapped keys: employee `jobTitle` and `chosenName`; client `chosenName`. `primaryOfficeLocation` survived, and the date form was accepted. Output: `sandbox-rounds/cr-unmapped-fields-run-2026-11-24.txt`.
3. **Zeke, on the fix (record):** the proposed fix is to send back every field from the read the update already makes, with mapped fields overriding, and to skip the core PUT when no mapped field changed. Zeke: "2 Field-wipe fix: Send yes". Relayed to the build chat; not yet built at the time of writing.
4. **Review C finding B2 (record):** answered by the build chat as intended design, no code change (file `build-chat-2-gate-followup-B2-2026-11-24.md` in the shared notes folder). The promote workflow prompt is drafted in `PROMOTE-WORKFLOW-PROMPT-2026-11-24.md`.

| # | Decision (package place) | Zeke's words | Applied (orchestrator) |
|---|---|---|---|
| 1 | Address 2 that holds only a state (question 7; item 5) | "1 . Based on production reads in HubSpot and CentralReach, is this recommended?" | Yes, recommended: build the item 5 "Address 2 junk" rule, send `null`. Production evidence: 5 of the 25 More Than One Location Cases hold only `",  , New York "`; none has a CR ID. Applied under the closing sentence |
| 2 | Care Coordinator 138851 (question 25; items 6 and 2) | "2.Care Coordinator field 138851 - Please refer to the above -" (he then repeated Ruling B) "Sandbox testing: need to confirm fulfilling requirements is populated. We cut over to production. We will not be updating distance between targets in phase one." | **Not omitted.** The overwrite of the 69 hand-entered CentralReach values is an existing-records matter, phase two. Items 6 (Care Coordinator reads the workflow fields) and 2 ("Referral - Other") are built now, so their requirements (C10, C36) can be proven in the sandbox. Ruling A lifts the "production lacks the property" hold. The **production** deploy still must not happen before those properties exist in production: on 2026-11-24 a read-only production GET answered 404 for the Case `referral_other`, `care_coordinator_first_name`, `care_coordinator_last_name` and `coordinator_export_status`; `care_coordinator_email` exists. On "Before deploy, Zeke confirms" item 1. Items 2 and 6 leave "Not in this deploy" |
| 3 | Two Supervising BCBAs, one a holder (question 26; item 9 rule 7) | "3. Based on production reads in HubSpot and CentralReach, is this recommended? We're going on what's required." | Yes: rule 7 as the package states it; the code is changed to match (the working tree keeps the typed text on the mixed case, BUILD-PLAN O-55). Evidence: no production Case has two Supervising BCBAs; the guide defines no mixed-case rule; the sandbox allows one Supervising BCBA per Case, so the mixed case is proven offline only |
| 4 | Employee update with a blank date of birth (question 27; item 1) | "4. This is Phase I versus Phase II production. Phase I: we will only be creating records from HubSpot into CentralReach that are new in CentralReach. Therefore, we will always need these records to contain the placeholder value until it clarifies how they handle this." | Option (a), for the BCBA and the BT/RBT (shared code): the placeholder stays on a create; it is never sent on an update; an update sends back the date CentralReach holds (rebuilt as `YYYY-MM-DDT00:00:00.000Z`); an absent key is a failed read, no PUT |
| 5 | Allergies and Severity (items 3, 8) | No separate words; covered by the closing sentence | Un-held, with CF §11.1's rule: `Confirmed` + a none-like explain ("NA", …) → `Yes`. Applied under the closing sentence |
| 6 | Blank typed supplier with no Supervising BCBA (O-58; item 9 rule 5) | No separate words; covered by the closing sentence | Sends nothing (approved guide insert E: "a blank supplier sends nothing"): 131308 is left out, not cleared. Applied under the closing sentence |
| 7 | A HubSpot Case answer without the CR ID key (O-57; D18 f) | "7. Keep the behavior" | Today's visible `error` stays (`HUBSPOT_PROPERTY_MISSING`, decided, with a HubSpot write). The package's D18 f "failed read" wording for this case is superseded |
| 8 | Whole address typed in the street field (O-59; item 5) | No separate words; covered by the closing sentence | Split only when a state comes before the ZIP. Applied under the closing sentence |
| 9 | Item 10's rules as a whole (requirements review master question 10) | "9. these rules are rig" (read as "right") | Confirmed: Outgoing BT 1/2 join the BT names while the label is on the Case; order 82 → 234 → 288 → 135; On Leave never sent |

- **Also closed by the closing sentence:** open question 24 (the creates workflow), with the package's recommendation: it triggers on Entered = Yes, with "created after the cutover date" as a filter, and new post-cutover records need no further hold.
- **Requirements review questions 10 to 38** (`requirements-review-2026-11-24/00-MASTER.md` section 9): see section E, question 32 (which of them still need a step-level go-ahead).

Applied in: the corrections above; the message's "Not in this deploy" line; "Ship today" steps 2 to 5 and its lists; "Before deploy, Zeke confirms" item 1; items 1, 2, 3, 5, 6, 8, 9 and 10; D7, D9, D12, D18 f, D19; section E questions 7, 12, 13, 24 to 32; section G assumptions 1, 51, 61, 62 and 64 to 71.

**Updated with Zeke's answers of 2026-11-23 (second set):** the production properties (items 2 and 6), the Workday check (item 15), the NM/VA labels (item 11) and the B21 recommendation (new item B21). Assumptions are in section G.

**Revised after an independent review (2026-11-23).** Each review finding was checked against `src/` at `655b385` before it was applied. Items 9 and 10 now follow GP §8 ("Final"), which wins over GP §1 to §7. Items 3 to 8 follow CF §9 ("Results of the pending reads"), which supersedes the earlier CF format evidence: that evidence counted the integration's own test clients (82 named "test" plus 10 with old test values, of 199; CF §9.1).

Line numbers are for `655b385`. Test file names are suggestions in `src/tests/smoke/`. Every new test carries its requirement ID, and `requirement-tests.json` is updated so `npm run check:requirements` still passes.

**For every build item: bump `MAPPING_VERSION` once.** `src/lib/mappedState.mjs:3-6` says to change it "whenever … a mapper changes what it sends". Bump it once for the whole deploy (for example `"stage7-2026-11-23"`), not per item. Effect: the first run of every linked record after the deploy sends every field once (row 3.7).

**A new mapped HubSpot property must exist in production before it ships.** A mapped property that is not a key of HubSpot's answer stops the run with `HUBSPOT_PROPERTY_MISSING` and no CR call (`src/workflows/clientSyncWorkflow.mjs:442-444`; the employee worker does the same, `employeeSyncWorkflow.mjs:255`, `:596`). So adding a property that production lacks makes **every** Case run end `error`. This affects items 2 and 6. **2026-11-24 afternoon (seventh set):** items 2 and 6 are built now and deployed to the sandbox, where their properties exist; "ships" here means the **production** deploy, which waits until the properties exist in production (Ruling A: "will be deployed from sandbox to production") and the pre-deploy check passes.

- **Zeke (2026-11-23), on the Care Coordinator properties (Case and BCBA) and "Referral - Other" (Case):** "Yes these will be created. For the Referral - Other, please have a worker create this in the sandbox for me and the include it in the test so this can be tested."
- **Pre-deploy check (read-only, production `50317927`):** before the deploy that reads a new property, GET its definition and confirm it exists, by internal name, on the right object. One missing property fails every Case run. The list: the Case (`0-3`) properties `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status` (item 6); the Case "Referral - Other" property `referral_other` (item 2); the BCBA (`2-48354212`) property `lba_licensure__ny` (item 9; exists in both portals, CF §11.2); the Case properties item 5 reads: `service__stateregion_2` (new in the mapped list) and the already-mapped `service__street_address`, `service__apt`, `service__city`, `service__postal_code`, `stateregion`, `location`. A property that is missing: its item does not ship in that deploy. **Production read 2026-11-24 (read-only):** `referral_other`, `care_coordinator_first_name`, `care_coordinator_last_name` and `coordinator_export_status` answer 404 on the Case; `care_coordinator_email` exists. With items 2 and 6 in the build (seventh set), a missing one blocks the whole production deploy, not only its item.
- **Sandbox `52311591`, read 2026-11-24 (one read-only property GET on the Deal, portal confirmed first):** all eight Case properties of item 5 exist (`service__stateregion_2` is an enumeration whose stored values are the full state names, "New York", "Colorado", …; `location` has New York / New Jersey / Colorado). Without `service__stateregion_2` every Case run would end `HUBSPOT_PROPERTY_MISSING` (matrix row 4.18); it is there. The BCBA `lba_licensure__ny` (`2-72890322`) has the option `Grad Permit` (values `Yes`, `In Process`, `No`, `Grad Permit`).

---

## Ship today (in order)

Rewritten for Zeke's final decisions (2026-11-23, third set). Updated 2026-11-24 (sixth set; Zeke: "Yes, all 7").

| Step | Items | Condition |
|---|---|---|
| 1 | 14 (production guard), with 24 (two-property production gate) | 14: decided. 24: decided 2026-11-23 (fifth set). The guard requires the exact two names in production: decided 2026-11-24 (sixth set, recommendation 3). The sandbox is unchanged by 24. Ship it in this deploy: the live gate test set (D18 g, decided 2026-11-24, recommendation 5) runs after it in the sandbox re-test. If it slips, the gate test set waits for it; it must ship before the production cutover in any case |
| 2 | 1 and 16 (date of birth) | Decided. ~~Item 1's update-with-blank half is HELD (open question 27); its create half and the `date_of_birth` read ship~~ **2026-11-24 afternoon:** item 1 ships whole: the update-with-blank half is option (a), for the BCBA and the BT/RBT (open question 27) |
| 3 | 4 and 7 (Physician / NPI, Availability), with the one `MAPPING_VERSION` bump; **3 (Allergies) and 8 (Severity), un-held 2026-11-24 afternoon**. Item 17 (Maladaptive) is dropped (Zeke: "Yes to recommendation") | ~~3 (Allergies) and 8 (Severity) are **PENDING record-level check**: they join this step only if the check comes back before the build; otherwise they follow and the deployed mapping stays~~ Items 3 and 8 join this step (CF §10; item 3 with CF §11.1's none-like rule) |
| 4 | 9 and 10, per GP §8; the holder test reads only `lba_licensure__ny`. **2026-11-24 afternoon:** rule 7 as written, the code changed to match (question 26); a blank typed supplier sends nothing (O-58); item 10's rules confirmed ("9. these rules are rig") | If not ready today: the **fallback**, omit 131308 (item 9) so CR keeps its value |
| 5 | 5 (service address; state falls back to the Case `location`; **with the Address 2 rule (question 7) and the tightened whole-address rule (O-59), 2026-11-24 afternoon**), ~~and 6 as "omit 138851"~~ **and 6 (Care Coordinator reads the workflow fields) with 2 ("Referral - Other" text), built now** | ~~**Item 6, "omit 138851": needs Zeke's word** (open question 25; no quote approves it and it supersedes decision 39). Until he answers it is not built and the deployed C10 mapping stays. If approved: its properties do not exist in production (CF §9.6). Omit = add the field to every run's omit list (`omitFieldIdsFor`, `src/workflows/clientSyncInputs.mjs:125-133`); the mapper drops omitted keys (`buildClientMetadata.mjs:424`) and the saved hash is kept (`mappedState.mjs:228-240`), so CR keeps its value~~ **Answered 2026-11-24 afternoon: not omitted** (question 25). Items 2 and 6 are built now for the sandbox proof (C10, C36). Their production properties do not exist yet (404 on 2026-11-24); the production deploy waits for them ("Before deploy, Zeke confirms" item 1) |
| 6 | B21, Route A (a blank core client field never clears CR) | Buildable: the client read's field names and blank shape are recorded (item B21, test client and Zeke's production read of 2026-11-24). R1-U2 must show an unchanged round-trip before production |
| 7 | 15 (Workday 7-digit check) | Ships with the note "pending final confirmation on the Workday ID". Known effect: 5 production records fail the check and end `error` until fixed |
| 8 | 12 (label read-back: about 150 s before the first retry) | Decided. Zeke: "Yes please implement the label fix." The wait only: the hashes are **not** saved before the throw (item 12, "Not in this item"). Item 18 (tests only) can ride along |

**Ship-today list (2026-11-24 afternoon):** 14, 24, 1, 16, 4, 7, 3, 8, 9, 10, 5, 6, 2, B21, 15, 12 (item 17 dropped). ~~Item 6 ships today only as "omit 138851", and only on Zeke's word (open question 25). Items 3 and 8 are PENDING record-level check and join step 3 only when confirmed.~~ Items 2 and 6 reach the sandbox in this deploy; the production deploy waits for their production properties.

**~~Ship once the production properties exist~~ Built now; the production deploy waits for the production properties** (seventh set; Ruling A; pre-deploy check, see the note above the table):

- 2: the "Other" text, reading the Case property `referral_other`. The values already ship as is. Also needs the sandbox `referral_other` recreated as a property sync (Zeke: "In progress to update") and the C36 test.
- 6: Care Coordinator, reading the workflow fields. ~~Until then decision 39 stays (`care_coordinator_name` → 138851) unless Zeke approves the omit (question 25).~~ Decision 39 (`care_coordinator_name` → 138851) is replaced by item 6 in this deploy; no omit (question 25).

**Can follow:** 13 (with the four KQL files), still "recommended, awaiting Zeke's word" (open question 17). Item 12 moved to "Ship today", step 8. Item 18 (tests only) can ship today or follow.

**Deferred: pending the client starting work in NM/VA:** 11. Not in this package.

**Before deploy, Zeke confirms:**

1. **Production properties exist** (read-only pre-deploy check, production `50317927`):
   - today's deploy: `lba_licensure__ny` on the BCBA (the Grad Permit holder test, item 9). The " BCBA LBA" suffix is now always added, so `lba_licensure__nj` / `lba_licensure__co` are not read (CF §12.6);
   - today's deploy: the Case properties of item 5: `service__stateregion_2` (production: filled on 1,606, item 5), `service__street_address`, `service__apt`, `service__city`, `service__postal_code`, `stateregion`, `location`. All exist in the sandbox (read 2026-11-24);
   - ~~the later deploy of item 2 or item 6~~ **the production deploy (items 2 and 6 are in this build, seventh set):** `referral_other` (Case), and `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status` (Case). Zeke has said they will be created ("Yes these will be created."); they do not exist today (CF §9.6; **404 on a read-only production GET, 2026-11-24**; `care_coordinator_email` exists). Ruling A (Zeke, 2026-11-24): "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production". **The production deploy must not happen before these four exist in production:** a mapped property missing there ends every Case run `HUBSPOT_PROPERTY_MISSING`. The sandbox deploy does not wait for them.
2. **Production cutover only (not today's sandbox deploy): the two gate properties created.** `centralreach_creates_only` and `centralreach_updates_only`, single checkboxes with the same internal names on the Case, BCBA and BT/RBT in production; the two segments per object ("property is true"); item 24 deployed; and the app settings `SYNC_CREATE_GATE_PROPERTY = centralreach_creates_only` and `SYNC_UPDATE_GATE_PROPERTY = centralreach_updates_only` (D18). Item 14 refuses a production start without both, and with any other value (exact names, decided 2026-11-24). The code reads the two properties on every path (webhook, poller, sweep, Contact fan-out, retries). `sync_to_centralreach` is not created. Also at cutover (decided 2026-11-24, sixth set, recommendations 4 and 6; Zeke: "Yes, all 7"):
   - the "creates" and "promote after create" workflows built per object, as drafted in D18 c;
   - the CR link-property history check: a read-only production check that nothing but the integration fills `central_reach_link_to_client`, `central_reach_record_link` or `central_reach_link_to_rt_rbt`. The promote workflow depends on it; if something else fills them, the promote trigger needs another marker before it is turned on.
3. **Grad Permit data fixed:** `lba_licensure__ny` = `Grad Permit` on Dominique Plummer `45994302542` and Katie Vangraefschepe `61130820723` (D15; Zeke / United Care, before go-live).

Known effects Zeke has already accepted (no confirmation needed): item 15 ends 5 production records `error` until fixed; item 1 sends the placeholder date for every BCBA create; B21 keeps a value in CentralReach that staff blank in HubSpot.

No longer on this list: the NM/VA go-ahead (item 11 is deferred); the go-ahead for items 14, 16 and B21 (decided); the item 5 state question (decided); Allergies and Severity (un-held 2026-11-24 afternoon); the omit of 138851 (not omitted, question 25); the open questions 7, 24, 26 and 27 (closed 2026-11-24 afternoon).

---

## A. Build items: decided by Zeke

### 1. BCBA date of birth reads `date_of_birth`

- **Requirements:** B5, O-10 (gap #15).
- **Zeke (2026-11-23; his answer to EMP §1, which is dated 2026-11-23):** "0-10 - use date_of_birth, fill with the place holder birthday". Backfill from `dob`: "No".
- **Supersedes:** BUILD-PLAN decision 48 (the BCBA date of birth is read from `dob`).
- **Guide line 333:** `date_of_birth` for BCBA and BT/RBT; blank on a create sends the placeholder 01/01/2000; an update never sends it.
- **Change:**
  - `src/mappings/employees/buildEmployeePayload.mjs:40`: `BCBA_DATE_OF_BIRTH_PROPERTY = "date_of_birth"`. Keep `readTextDate` at `:290` (the production property is text, EMP §1).
  - Comments: `buildEmployeePayload.mjs:33-38`, `src/mappings/employees/employeeProperties.mjs:79`, `src/constants/centralReach.mjs:6-8`.
  - The placeholder code is unchanged (`src/lib/centralReachClient.mjs:557-561`, create only).
  - Sandbox scripts, for the testing chat: `scripts/sandbox/check-cr-record.mjs:208-210`, `scripts/sandbox/create-test-records.mjs:155-158` and `:306`.
- **Tests** (each tagged [B5][1.4]): rewrite `bcbaTextDateOfBirth.test.mjs` to read `date_of_birth`. In it, invert `:161` (the property is `date_of_birth`; `dob` is not requested) and `:172` (a `dob` value is not read; only `date_of_birth` supplies the date); keep `:194` and `:204` with `date_of_birth` in place of `dob` (a rename only; no behaviour change). Add: `dob` filled and `date_of_birth` blank → the create sends 2000-01-01 and `dob` is never read. Check `stage4and5PropertyLists.test.mjs` for the BCBA mapped list.
- **Decided 2026-11-24 afternoon (open question 27; seventh set, decision 4): option (a), for the BCBA and the BT/RBT.** Zeke: "4. This is Phase I versus Phase II production. Phase I: we will only be creating records from HubSpot into CentralReach that are new in CentralReach. Therefore, we will always need these records to contain the placeholder value until it clarifies how they handle this." **Applied (orchestrator):** the placeholder `2000-01-01` stays on a create when `date_of_birth` is blank; it is never sent on an update. On an update with a blank date, the PUT sends back the `contact.dateOfBirth` the employee read holds, rebuilt as `YYYY-MM-DDT00:00:00.000Z` from its first 10 characters (as B21); a read without the key is a failed read, no PUT (as B21, `CR_EMPLOYEE_READ_FAILED`). The code is shared, so the BT/RBT follows the same rule (6,183 blank production BT/RBTs, requirements review master question 5). **Tests** (each tagged [B5][1.4] or [T2]): BCBA and BT/RBT update with a blank date → `dateOfBirth` = CR's date in the 24-character form, never the placeholder; an employee read without `dateOfBirth` → no PUT, failed read; a create with a blank date → the placeholder. The HELD text below is kept for the record.
- ~~**HELD (second review, 2026-11-24): the update with a blank `date_of_birth`.** Do not add a test or change code for it until open question 27 is answered.~~ (Answered above.) The struck rule contradicts itself: ~~"when the read holds no `dateOfBirth` key the PUT has no `dateOfBirth` key"~~, while this package (item B21, "Left-out fields") and BUILD-PLAN section 4 say an employee PUT **clears** a left-out field. Checked at `655b385`: `keepUnwrittenCoreFields` (`src/lib/mappedState.mjs:283-302`) deletes `dateOfBirth` when the read lacks the key, so the PUT leaves it out. EMP §1 found the employee GET returns no date-of-birth key, and `date_of_birth` is blank on all 375 production BCBAs, so every BCBA update would take that path. It waits on (1) one recorded read-only `GET /contacts/employee/5338681` (test employee): does `contact.dateOfBirth` come back, and in what shape; then (2) Zeke's word on the rule (question 27). The create half (placeholder on a blank create) and the `date_of_birth` read are not held.
- **Zeke (2026-11-24), on who fills it:** "Item 1 (BCBA date of birth): this needs to be created by the integration (the placeholder field). We are pending an answer from United Care on how they want this populated, but for now, we are populating this with the integration." This changes nothing above: the integration sends the placeholder on a create only; an update follows rule 5.7. Production check 2026-11-24 (read-only): BCBA `date_of_birth` (text, created 2026-11-21) is blank on all 375; `dob` is filled on 215, none equal to 2000-01-01. So the placeholder is not in HubSpot; only the integration sends it, on a create.
- **Not settled by evidence, not a build change:** EMP §1 (2026-11-23) found that `GET /contacts/employee/{id}` returns no date-of-birth key, while BUILD-PLAN section 4 (2026-11-20) says the read returns all twelve core fields. If the key is absent, every employee update leaves `dateOfBirth` out, and whether CentralReach clears a left-out date of birth was not tested (section 4: "Not tested: a required field such as the date of birth"). R1-U2 below can show it only on the CentralReach screen if the GET holds no date key. Now part of the HELD update half (question 27). **Settled 2026-11-24:** the employee read returns `contact.dateOfBirth` (test employee 5338681, question 27), and option (a) sends it back.
- **Sandbox proof:** matrix row B5. The row must be rewritten first: today it sets `dob` and uses `date_of_birth` as a decoy. R3 (blank → GET `dateOfBirth` 2000-01-01). R1-U2 (blank on an update → CR keeps its date): ~~waits on question 27~~ unblocked 2026-11-24 afternoon (option (a)); prove it on the BCBA and the BT/RBT.
- **Effect to tell Zeke:** production `date_of_birth` is blank on 375 of 375 BCBAs, so every BCBA create sends 2000-01-01, and the 215 real dates in `dob` are not used (EMP §1). He has accepted this ("No" to the backfill).
- **O-10 answered (Zeke, 2026-11-24; was open question 2), on who fills `date_of_birth` and from where:** "we are filling in this date with the placeholder value that we are currently using." The placeholder in use today is `2000-01-01` (`EMPLOYEE_CREATE_DEFAULT_DATE_OF_BIRTH`, `src/constants/centralReach.mjs:9`), sent by the integration on a create when the date is blank (`src/lib/centralReachClient.mjs:557-561`); the guide writes it 01/01/2000 (guide line 333). **No change to this item** (assumption G54; confirmed by his 2026-11-24 "Item 1" quote above).

### 2. Referral Source: as is, and the "Referral - Other" text when Other

- **Requirements:** C36 (REF item 2).
- **Zeke:** "For referral_source Send the values as is from hubspot to central reach. If Other send the Referral - Other to central reach", "Send as Bassy-Americare", and A "yes".
- **Zeke (2026-11-23), on the production property:** "Yes these will be created. For the Referral - Other, please have a worker create this in the sandbox for me and the include it in the test so this can be tested."
- **Zeke (2026-11-23, final), Other with blank text:** "For the Decisions, with my recommendation for each: Let's do your recommendations please". The recommendation: `referral_source` = Other and "Referral - Other" blank → send "Other".
- **Zeke (2026-11-23, final), on recreating the sandbox `referral_other` as a property sync:** "In progress to update".
- **2026-11-24 afternoon (seventh set, decision 2): built now**, so C36 can be proven in the sandbox. Ruling A (Zeke): "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production". The **production** deploy waits for `referral_other` in production (404 on 2026-11-24; "Before deploy, Zeke confirms" item 1). The status line below is kept for the record.
- **Status of the "Other" part: ~~ship once the production property exists~~ built now; in production once the property exists** (was "Can follow"). The sandbox property `referral_other` exists (not yet a sync; Zeke is recreating it as a sync) and the C36 test is wired for round 2.
- **Ship in two parts:**
  - **Today: the values as is.** No code change: `buildClientMetadata.mjs:413` already sends `referral_source` as stored, Bassy-Americare included; blank stays blank.
  - **Once the production property exists: the "Other" text.** Zeke creates the production Case property `referral_other`; the pre-deploy check confirms it (read-only) before the deploy. If the property is added to the mapped list before it exists in production, every Case run ends `HUBSPOT_PROPERTY_MISSING` (`clientSyncWorkflow.mjs:442-444`).
- **Change (the "Other" part):**
  - `src/mappings/client/buildClientMetadata.mjs:413`: when `referral_source` is `Other` and the new Case property is filled, send that text (trimmed) to Meta `126222`. `Other` with the property blank sends "Other" (the stored option, so no special case is needed). Every other value is sent as stored.
  - `src/mappings/client/clientProperties.mjs:82`: add `referral_other` to the mapped list.
  - **The internal name is `referral_other`** (sandbox Deal property "Referral - Other", `SANDBOX-TESTING-HANDOFF.md`; was PENDING). It is to be a property sync of the Contact's `other___hear_about_us_`. Zeke recreates the sandbox one as a sync ("In progress to update"), creates it in production (9.6) with the same internal name, and adds it to the Case workflow triggers (decision 51). The code holds one name.
- **Tests** (`clientMetadataMapping.test.mjs`): Other + text → the text; Other + blank → "Other"; Other + spaces only → "Other"; "Bassy-Americare" → "Bassy-Americare"; "Google" → "Google"; blank → `null`; the new property filled while `referral_source` is not Other → the stored option.
- **Sandbox proof:** matrix row C36. R3 already sets Other: add the "Referral - Other" text on the round's Contact and GET Meta `126222`.

### 3. Allergies match CentralReach

- **Requirements:** C26, O-28 (gap #11; CASE §3; CF §9.2, §9.3).
- **Zeke:** "Please make the mapping transformation match what needs to be in central reach."
- **Zeke (2026-11-23, final):** "Confirm based on the data please."
- **Status: Decided 2026-11-24 afternoon (seventh set, decision 5): un-held, build it (step 3), with CF §11.1's none-like rule.** No separate words from Zeke; applied by the orchestrator under his closing sentence: "On the remaining open items, apply your recommendation." The record-level check is CF §10 (below). The earlier status is kept for the record.
- ~~**Status: PENDING record-level check.** Another worker is confirming the format record by record. Do not build until the result is written here. The question it settles (CF §9.7 question 9) follows.~~
- **Found in review (2026-11-24), for the orchestrator to judge; the status is not changed here:** the record-level check exists as CF §10 (2026-11-23, ~20:50 UTC, 487 paired clients). CF §10.3 confirms the CF §9.3 proposal below: no "Yes" form on any paired client; the CR text is the allergen alone on 28 of 28. CF §11.1 adds one rule the change below lacks: a none-like explain (`NA`, `N/A`, `none`, `no`, `-`, any case, trailing "." ignored; `/^(n\/?a|none|no|-+)\.?$/i`) on `Confirmed` counts as blank, so `Confirmed` + "NA" → `Yes` (3 production Cases). Whether that rule needs Zeke's word is the orchestrator's call.
- **The question.** On the 107 real CR clients there is no "Yes (…)", "Yes" or "Confirmed": an allergy is held as the allergen text alone. The earlier "Yes (…)" evidence (CF §4) came from the integration's own test clients (CF §9.1). Zeke chooses: the explanation alone (matches CR), or `Yes (<explain>)` (the guide's form).
- **Change (CF §9.3 proposal):** `src/mappings/client/buildClientMetadata.mjs:123-134` (`getKnownAllergies`):
  - `Denial` → `None` (today "No");
  - `Confirmed` with text → `<explain>`, trimmed, runs of whitespace and line breaks collapsed to one space (today "Yes, <explain>");
  - `Confirmed` with no text → `Yes`;
  - **`Confirmed` with a none-like explain → `Yes`** (CF §11.1, decided 2026-11-24 afternoon): after the trim, `/^(n\/?a|none|no|-+)\.?$/i` (`NA`, `N/A`, `none`, `no`, `-`, any case, trailing "." ignored) counts as blank;
  - anything else → `null`.
  - Update the comment at `:123-124`.
- **Tests** (`clientMetadataMapping.test.mjs`): `Confirmed` + "Peanuts" → "Peanuts"; `Confirmed` + "  Peanuts,\n tree nuts " → "Peanuts, tree nuts"; `Confirmed` + blank → "Yes"; **`Confirmed` + "NA", "n/a", "None.", "-" → "Yes"**; `Denial` → "None"; `Denial` + text → "None"; blank → `null`; "Unsure" → `null`. ~~If Zeke picks the guide's form, the two `Confirmed` + text rows become "Yes (…)".~~ (The CR form is applied, seventh set.)
- **Sandbox proof:** matrix row C26 (R1 `Confirmed` + text, R2 "None", R3 blank, U1 → "None"). The expected values in the row change.
- ~~**If the record-level check is not back before the build:** item 3 follows; the deployed mapping stays as it is.~~ (Un-held 2026-11-24 afternoon.)

### 4. Physician / NPI match CentralReach

- **Requirements:** C31, O-28 (CASE §3; CF §5.1, §9.2, §9.3).
- **Zeke:** "Match CentralReach".
- **Change:** `src/mappings/client/buildClientMetadata.mjs:86-97`: `<name> <npi>`, joined with **one space, no comma** (real CR: one space on 96 of 105; no comma form). Drop a trailing comma from the name. Name only → `<name>`; NPI only → `<npi>`. Use a small `joinWithSpace` for the two calls at `:89` and `:93`; leave `joinMetadataParts` (`:18-21`) for its other users.
- **Zeke's "Match CentralReach" is dated 2026-11-23** (his feedback on CASE §3, reviewed in CF, header line 3).
- **Tests** (`clientMetadataMapping.test.mjs`, each tagged [C31]; the six rows of CF §5.1, Meta `131151`):

  | `n1_what_type_of_insurance` | Name | NPI | Expected |
  |---|---|---|---|
  | `Medicaid FFS` | "Dr. Ann Lee" | "1234567890" | "Dr. Ann Lee 1234567890" |
  | `Commercial OON` | "Bo Kim MD" | "1098765432" | "Bo Kim MD 1098765432" (the commercial pair) |
  | `Medicaid FFS - CO` | "Dr. Ann Lee," | "1234567890" | "Dr. Ann Lee 1234567890" (trailing comma dropped) |
  | `Medicaid FFS` | "Dr. Ann Lee" | blank | "Dr. Ann Lee" |
  | `Medicaid FFS` | blank | "1234567890" | "1234567890" |
  | `Unsure` or blank | any | any | `null` |

  **Existing tests that change** (checked at `655b385`): `clientMetadataMapping.test.mjs:42-45` ("Dr Smith, 1112223334" → "Dr Smith 1112223334"); `stage4CaseMappings.test.mjs:511-529`, the five pair rows ("Dr Medicaid, 1112223334" → "Dr Medicaid 1112223334"; "Dr Commercial, 5556667778" → "Dr Commercial 5556667778"). CF §5.1 defines no rows for `Medicaid FFS - NJ` and `Commercial Enrolled`; their existing rows (`:515`, `:523`) are rewritten to the one-space form, and the pair each one selects is unchanged (`buildClientMetadata.mjs:83-84`).
- **Sandbox proof:** matrix row C31 (R1 Medicaid pair, R2 Medicaid FFS - CO, R3 commercial pair): GET Meta `131151` = "Dr AzT N Medicaid 100000000N".
- **Credentials settled (CF §9.2):** CR names carry no MD/DO/NP on 112 of 115; the name is sent as stored.

### 5. Service address match CentralReach (two lines)

- **Requirements:** C24, O-28 (CASE §3; CF §5.2, §9.2 to §9.4).
- **Zeke (2026-11-23; his feedback on CASE §3, reviewed in CF, header line 3):** "Match CentralReach".
- **Zeke (2026-11-23, final), on the state when `stateregion` is blank:** "use hte fall back". The fallback is the Case `location`.
- **Zeke (2026-11-23), on the source:** "Follow what's on the google doc as a requirement, then review what's in production, build the solution based on that please."
- **Status: Decided. Final rule in CF §12 (2026-11-23). Ships today (step 5).**
- **Guide (the requirement).** Line 364: "Child's House uses full_home_address. Other Location uses the service address components. More Than One Location can use service_address__other as Address 2." Line 512: "Home: full_home_address. Other: service__street_address, service__apt, service__city, service__postal_code (combined in service_address__other)." The guide names the source fields only; it sets no CR text format.
- **I (the source): the guide's sources, transformed to CR's format** (CF §12.2). Other Location: the guide's components, as written. Child's House and More Than One Location: the guide names `full_home_address`, a workflow-built text ("🤖Service Address - Home", textarea, not calculated, 2,269 of 2,883 Cases). It is built from `street_address`, `home_apt`, `location_city`, a state and `postal_code`, as "`<street>`,⏎Apt# `<apt>`, `<city>`, `<State name>` `<zip>`" (sandbox copies, CF §5.2). It cannot be turned into CR's format reliably: its line break comes after the street, not after the apartment; it inserts "Apt#" in front of an apartment that may already carry "Apt" (18 of 51 real CR values keep the typed marker); and its parts are split by commas that the street or apartment can also contain. **So the code builds the same address from the parts `full_home_address` is made of**, the same data the guide names in a form that can be formatted. `service_address__service` and the questionnaire field `if_services_will_be_in_more_than_one_location__list_the_other_address` are not read for C24. Departs from guide line 364 in form only: guide note (D11). **Decided 2026-11-24 (sixth set, recommendations 1 and 2; Zeke: "Yes, all 7"):** the guide note is insert C, added at line 364 and repeated at the section 3 row at line 512 ("Home: full_home_address", which contradicts it). Insert D covers line 384. Not written to the doc yet.
- **Format (CF §9.3, confirmed on real CR):** `<street> <apt>` + `"\n"` (LF; no CRLF on any real client) + `<City> <ST> <ZIP>`. No commas. The apartment is sent **as stored**, marker included ("Apt 9A", "Unit 9", "#9": 18 of 51 real values keep one). This corrects CF §5.2's "no Apt#". Each part trimmed, runs of spaces collapsed, blanks skipped.
- **Exact strings** (CF §12.4):
  - **Street blank → `null`** (no value; the field is blank, so nothing is sent and a staff value in CR is never cleared: a clear is sent only for a value the integration wrote, `mappedState.mjs:193-209`). Without this, an Other Location Case with no street sends a bare "NY" (5 of 21 Other Location Cases have no service street).
  - **Apartment:** as stored; a placeholder apartment (`NA`, `N/A`, `none`, `no`, `-`, any case, trailing "." ignored) is blank.
  - **Line 2 empty** (city, state and ZIP all blank) → line 1 alone, with no `"\n"`.
  - **A street that already holds a whole one-line address** (it contains a comma and ends in a ZIP, `/,/` and `/\b\d{5}(-\d{4})?$/`; 3 of the 40 service streets): line 1 = the text before the first comma + " " + apartment; line 2 = the rest with commas removed and spaces collapsed. The separate city, state and ZIP are not added (they would repeat).
    - **Tightened 2026-11-24 afternoon (O-59; seventh set, decision 8; applied by the orchestrator under Zeke's closing sentence, no separate words):** split only when **a state comes directly before the ZIP**: the word or words between the last comma (or the city) and the ZIP read as one state name or two-letter code (`readStateCode` answers `status: "value"`, any case). Otherwise the street is a plain street: line 1 = street + apartment, line 2 = the separate city, state and ZIP as usual.
    - **Tests** ([C24]): "12-34 56th Ave, Queens, NY 11356" → split (unchanged); "12-34 56th Ave, Queens, New York 11356" → split; "12 Main St, Suite 10001" → not split (no state before the ZIP): the street as typed on line 1 and the separate city, state and ZIP on line 2; "PO Box 5, 12207" → not split.
- **Change:** `src/mappings/client/buildClientMetadata.mjs:144-161` (`getServiceLocationAddress`), one helper `twoLineAddress({ street, apt, city, stateCode, zip })` for both branches:

  | `specific_home_location` | Line 1 | Line 2 | `<ST>` |
  |---|---|---|---|
  | Child's House, More Than One Location | `street_address` + `home_apt` | `location_city` + ST + `postal_code` | `readCaseStateCode(props)` (below): `stateregion`, else `location`, else none |
  | Other Location | `service__street_address` + `service__apt` | `service__city` + ST + `service__postal_code` | `service__stateregion_2` (full state name) via `readStateCode`; blank or unreadable → `readCaseStateCode(props)` |
  | anything else | `null` | | |

  Examples: "101 Main St Apt 1A\nNew York NY 10001"; "200 Service Rd\nDenver CO 80202".

  - The home parts are already read (`clientProperties.mjs:25-29`, for the core address C8). Add only `service__stateregion_2` to the C24 list (`clientProperties.mjs:58-63`; it exists in production, filled on 1,606). Remove `full_home_address` (`:58`): nothing else reads it.
  - **AddressLine1 to ZipPostalCode stay on the home fields, with no override** (`buildClientPayload.mjs:49-53`). Nothing in `src/` reads the questionnaire field in either spelling.
- **Guide lines 384 and 385, checked 2026-11-23: no conflict.** Line 385 names `if_services_will_be_in_more_than_one_location__list_the_other_address` as the destination of a HubSpot copy workflow (one HubSpot property copied to another). Line 384 says that workflow "is separate from the service_address__other Client mapping". The guide names no CentralReach target for the field, and its C24 sources (lines 364, 512, 513) do not include it. So building 137697 from the structured fields does not contradict line 385. The departure in item 5 is from line 364 only (`full_home_address` for Child's House). Address 2 (`service_address__other`, line 513) is not changed by item 5.
- **The questionnaire copy workflow: not needed** (Zeke, 2026-11-23: "For the service address please let me know if this is needed."; CF §12.3).
  - The guide's C24 sources (lines 364, 512) do not include the questionnaire field. Lines 384 and 385 describe a HubSpot-to-HubSpot copy, "separate from the service_address__other Client mapping".
  - The final rule reads `service__street_address` and the other structured fields directly, and AddressLine1 stays `street_address` with **no override**. Nothing in `src/` reads the field in either spelling, and it is in no property list.
  - Production: the field is filled on 1 of 2,883 Cases, with usage 0 and no workflow dependencies. A copy workflow would fill a field that nothing reads.
  - The older docs' override rule (AddressLine1 and the payor address blocks from the questionnaire field) is obsolete. `src/` has no payor address block.
  - **Guide note (D11):** update line 385 to "Not an integration source. The integration reads the structured Service Address fields; no copy workflow is needed." Drop the line-384 follow-up, unless United Care wants the copy for its own use.
  - **Code:** ignore the field. Do not add it to any property list. Keep the two negative tests, and point them at the real name (the test-only fix below), so that a later change that starts reading it fails.
- **Decided (was CF §9.7 question 10): the state when `stateregion` is blank is the Case `location`.** `stateregion` is filled on 177 of 2,883 production Cases, so without the fallback line 2 of a home address (and the core StateProvince) would carry no state on most clients.
  - **Zeke (2026-11-23), on an unreadable `stateregion`:** "confirmed" (the rule `stateregion`, else `location`, else omit, with an unreadable `stateregion` falling back to `location` plus a warning).
  - **One shared helper `readCaseStateCode(props)`** in `src/lib/fieldFormats.mjs`, after `readStateCode` (`:110-121`). It calls `readStateCode` directly, **not** through `createValueReader`'s `valueOf` (`:140-155`), because `valueOf` notes an unreadable value in `unreadableValueProperties` (`:142-148`) and that ends the run `error` (`clientSyncWorkflow.mjs:470-474`). Returns `{ code, warning }`:

    | `stateregion` | `location` | `code` | `warning` |
    |---|---|---|---|
    | readable ("NY", "New York", "NEW YORK") | any | its code | none |
    | blank | readable | `location`'s code | none |
    | **unreadable** (filled, not a state) | readable | `location`'s code | `state_unreadable_used_location` |
    | unreadable | blank or unreadable | `null` (left out) | `state_unreadable_no_fallback` |
    | blank | blank or unreadable | `null` (left out) | none |

  - **The core StateProvince uses the same helper** (`buildClientPayload.mjs:52`): `StateProvince: state.code`, and `stateregion` leaves the `valueOf` path, so an unreadable `stateregion` no longer ends the run `error`. Departs from guide lines 351 and 500 (state = `stateregion`): needs a guide note (D11).
  - **The warning.** `buildClientPayload` returns `warnings: [{ code, property: "stateregion" }]` (never the value). `centralReachPayload` drops it with the other notes (`clientSyncWorkflow.mjs:166-170`: add `delete payload.warnings`), and the worker logs each one as the metadata warnings are logged (`:542-551`), with `code` and `property`. Only the payload logs it; the C24 builder uses `code` and adds no second warning for the same Case.
  - `location` is calculated and read-only, options New York / New Jersey / Colorado, every one readable (CF §11.3); it is already in the mapped list (`clientProperties.mjs:34`).
- **Test-only fix:** the truncated name `…_list_the_other_addres` survives in `src/tests/smoke/stage4CaseMappings.test.mjs:34,39` and `src/tests/smoke/stage4and5PropertyLists.test.mjs:107`. Both pass trivially because the property does not exist. Point them at the real name `…_list_the_other_address`.
- **Tests** (CF §12.5; each carries [C24] or [C8]): the six rows of CF §5.2 with the apartment as stored, plus: Other Location with `service__stateregion_2` "Colorado" → "… CO 80202"; `service__stateregion_2` blank → the `location` state; Child's House with `stateregion` blank and `location` "New York" → "… NY 10001"; `stateregion` "NJ" and `location` "New York" → NJ (no fallback over a filled value); both blank → `<City> <ZIP>`; **street blank, city/ZIP filled → `null`** (Other Location and Child's House); apartment "NA" → line 1 is the street alone; city, state and ZIP blank → line 1 alone, no "\n"; service street "12-34 56th Ave, Queens, NY 11356" with city and ZIP also filled → "12-34 56th Ave\nQueens NY 11356"; `full_home_address` filled with the parts blank → `null` (it is no longer read). [C8] core StateProvince: `stateregion` "NEW YORK" → NY; blank + `location` "Colorado" → CO; **`stateregion` "Brooklyn" + `location` "New York" → NY, warning `state_unreadable_used_location`, run not `error`**; "Brooklyn" + `location` blank → left out, warning `state_unreadable_no_fallback`; the warning names the property, never the value (`clientPayloadMapping.test.mjs`). Rewrite the two `full_home_address` tests (`stage4CaseMappings.test.mjs:347`, `:354`), the Other Location test (`:361`, today "50 School Rd, Room 4, Troy, 12180") and the property list (`stage4and5PropertyLists.test.mjs:56`). Rewrite `src/tests/smoke/f1UnreadableValues.test.mjs:218-229`: `stateregion` "XX" is no longer in `unreadableValueProperties` (phone still is); it falls back to `location` with the warning.
- **Sandbox proof:** matrix row C24 (R1 Child's House, R2 Other Location, R3 More Than One Location): GET Meta `137697`, and a Screen check that the line break shows.
- **Fallback if item 5 is not ready today:** omit 137697 (add it to every run's omit list, `omitFieldIdsFor`). CR keeps its value and the saved hash is kept.
- **Address 2 junk (C25, Meta "Service Location Address 2"): ~~recommended, needs Zeke's word (open question 7). Do not build until he answers.~~ Decided 2026-11-24 afternoon (open question 7; seventh set, decision 1): build the recommended rule below, send `null`.** Zeke: "1 . Based on production reads in HubSpot and CentralReach, is this recommended?" The orchestrator answered yes from the production reads below and applied it under his closing sentence ("On the remaining open items, apply your recommendation."). Production check 2026-11-24 (read-only; findings, not a decision):
  - Address 2 is sent only for More Than One Location Cases (`buildClientMetadata.mjs:163-167`, `service_address__other`).
  - `service_address__other` is filled on 2,578 Cases; 2,537 of them hold only a state (`",  , <State> "`); none is punctuation only.
  - Of the 25 More Than One Location Cases, 5 are junk, all `",  , New York "` (`53263401237`, `60349801276`, `62485443368`, `64175326270`, `64175546944`; none has a CR ID); 20 hold real addresses. One near-junk: city and state with no street (`60843549455`), which the rule below still sends.
  - **Rule (recommended; decided 2026-11-24 afternoon):** in `getServiceLocationAddress2`, take the value, remove every comma, collapse runs of spaces and trim; when nothing is left, or `readStateCode` of what is left answers `status: "value"` (`src/lib/fieldFormats.mjs:110-121`: one state name or two-letter code, any case), send `null`. Otherwise send the value as today (trimmed, commas kept). `null` clears only a value the integration wrote (`mappedState.mjs:193-209`).
  - **Tests** (`stage4CaseMappings.test.mjs`, each tagged [C25]): `",  , New York "` → `null`; `", , NY"` → `null`; `" , , "` → `null`; `"12 Oak St, Albany, NY 12207"` → as stored, trimmed; `"Albany, New York"` → as stored (not only a state); Child's House with `",  , New York "` → `null` (not More Than One Location, as today); an Address 2 written before and now junk → the clear is sent; never written before → no clear.

### 6. Care Coordinator reads Zeke's workflow fields

- **Requirements:** C10, O-17 (gap #9; CASE §5; CF §1). B11 is in "Not code" below.
- **Zeke:** "for the Care Coordinators, I've set up workflows in sandbox that will populate the fields … We will read the fields for this." J "yes" (trust `coordinator_export_status` = `ready`).
- **K** ("look in central reach to confirm what the care coordinator she mapped to"), **answered by CF §9.5:** Meta `138851` "Care Coordinator" (Input) is a **client-only** field. It holds a name, never an email: first name only ×33, "First Last" ×20, lowercase ×17, longer ×5 of 75 real values. The text form "First Last" is the CF §1.2 proposal. No CR employee coordinator field exists, so B11 needs a new CR field first (D8; not code today).
- **Zeke (2026-11-23), on the production properties (Case and BCBA):** "Yes these will be created. For the Referral - Other, please have a worker create this in the sandbox for me and the include it in the test so this can be tested."
- **Decided 2026-11-24 afternoon (open question 25; seventh set, decision 2): not omitted; build item 6 now.** Zeke: "2.Care Coordinator field 138851 - Please refer to the above -" (he then repeated Ruling B: "Production will push in two phases: 1. Create records only. 2. Review of existing records in HubSpot against the existing records in CentralReach. It is needed to make the existing records in CentralReach reflect HubSpot. Any production discrepancies found between HubSpot and CentralReach are a phase two production build.") "Sandbox testing: need to confirm fulfilling requirements is populated. We cut over to production. We will not be updating distance between targets in phase one." Ruling A: "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production". **Applied (orchestrator):** the overwrite of the 69 hand-entered CentralReach values is an existing-records matter, phase two; item 6 (with item 2) is built now so C10 can be proven in the sandbox; Ruling A lifts the "production lacks the property" hold for the build; the **production** deploy waits until `care_coordinator_first_name`, `care_coordinator_last_name` and `coordinator_export_status` exist in production (404 on 2026-11-24; "Before deploy, Zeke confirms" item 1). The omit text below is kept for the record; do not build it.
- **Status: ~~ship once the production properties exist~~ built now; production once the properties exist** (was "Can follow"). The pre-deploy check confirms the three Case properties (read-only) before the production deploy. The BCBA properties are for B11, which is not a build item yet (D8).
- ~~**Not shippable today.**~~ The new properties **do not exist in production** on the Case or the BCBA (CF §9.6). They are mapped, so deploying the change **to production** before they exist would end every Case run `HUBSPOT_PROPERTY_MISSING` (`clientSyncWorkflow.mjs:442-444`). The sandbox has them.
- ~~**"Omit 138851" until then: needs Zeke's word (open question 25). Do not build until he answers.**~~ **Not omitted (answered 2026-11-24 afternoon).** No quote of Zeke's approves the omit (searched 2026-11-24: this package, the FEEDBACK-REVIEW and DECISIONS-EVIDENCE files, BUILD-PLAN, SANDBOX-TESTING-HANDOFF); it was the package's own proposal, and it supersedes decision 39 (BUILD-PLAN row 4.16: `care_coordinator_name` → 138851, built and deployed).
  - **What the omit changes:** today the code sends `care_coordinator_name` (filled on 2,530 of 2,877 production Cases, decision 39) to 138851, so the first sync of a linked Case overwrites the hand-entered CR value (69 such values, CASE §0) with it, and a blank clears a value the integration wrote. With the omit, 138851 is never sent or cleared: CR keeps whatever it holds until item 6 ships; a new client gets no Care Coordinator in CR.
  - **If approved, the change:** `src/workflows/clientSyncInputs.mjs:125-133` (`omitFieldIdsFor`) always adds `String(CENTRAL_REACH_CLIENT_METADATA_FIELDS.CARE_COORDINATOR)` (138851), whether or not the staff were read. The mapped list keeps `care_coordinator_name` (it exists in production; the mapper still builds the key and the worker's omit list drops it, `buildClientMetadata.mjs:424`). Comment it as temporary, until item 6.
  - **Tests if approved** (each tagged [C10][3.18]): `omitFieldIdsFor` returns 138851 with `staffNames` read and with `staffNames` undefined; a Case run with `care_coordinator_name` filled sends no 138851 write; a linked Case with a saved 138851 hash keeps it (`keepOmittedFieldHashes`) and a later blank `care_coordinator_name` sends no clear; a Case whose only change is `care_coordinator_name` is a noop with no CR call. **Existing tests that break and must be rewritten to the omit:** `laneDCaseReads.test.mjs:424`, `:433`, `:448` (they expect 138851 sent or cleared through the worker). `stage4CaseMappings.test.mjs:482`, `:487` and `stage4and5PropertyLists.test.mjs:172` test the mapper and the list without the worker's omit list and stand.
  - **If not approved:** no code change; decision 39 stays until item 6 ships. **(Not approved as an omit: item 6 itself is built now and replaces decision 39.)**
- **Change (~~after the production properties exist~~ built now, 2026-11-24 afternoon):**
  - `src/mappings/client/clientProperties.mjs:83-84`: replace `care_coordinator_name` with `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`.
  - `src/mappings/client/buildClientMetadata.mjs:418-421`: status `ready` → "`<first> <last>`" (one name blank: send the other; both blank: treat as not ready); `no_owner` → `null`; any other status or blank → the field is left out, with a warning `care_coordinator_not_ready` that names the status and never a name. Export `careCoordinatorFieldOmitted(dealProps)` next to `staffRolesWithoutName` (`:192-197`).
  - `src/workflows/clientSyncInputs.mjs:125-133` (`omitFieldIdsFor`): add `138851` when the field is omitted; pass the deal in from `clientSyncWorkflow.mjs:538`.
  - The integration does not read the owner, the Team Member object, `care_coordinator_email` or `coordinator_export_source_snapshot`. No owners scope is needed.
- **Tests** (`clientMetadataMapping.test.mjs`, `stage3OmittedFields.test.mjs`): the six rows of CF §1.2, and: an omitted field keeps its saved hash.
- **Sandbox proof:** matrix row C10 (rewrite it: today it expects `care_coordinator_name`). Needs one Team Member record for test owner `161391908`, or every Case ends `missing_match` (the sandbox holds 0 Team Members). Prove `ready` → name in CR; `missing_match` → Meta `138851` unchanged.
- **Before it ships to production (Zeke, D7):** create the three Case properties in production (and the BCBA ones before B11 is built). Ruling A: deployed from sandbox to production.
- **Production Case workflow trigger (CF §1.2, D14):** the Case sync workflow must trigger on `care_coordinator_first_name`, `care_coordinator_last_name` and `coordinator_export_status`, **not** `hubspot_owner_id`. On the owner, the sync can run before the coordinator workflow has refreshed the names and send the old coordinator.
- **Sandbox workflows, Zeke's to fix (CF §9.6, question 7):** the Case workflow `1933886108` is the BCBA code cloned unchanged (`TYPE='2-72890322'`), so it reads and writes a BCBA with the Case's ID and writes nothing to the Case. Re-enrolment is off in both workflows, so a later owner change does not refresh the coordinator. The code also hard-codes portal `52311591` and `accountType === 'SANDBOX'`.
  - **Done, per Zeke (2026-11-24; was open question 14):** "turned on and functioning." Not re-read here. The C10 sandbox proof no longer waits on this; it still needs the Team Member record above.

### 7. Client Availability matches CentralReach

- **Requirements:** C19, O-28 (gap #11; CF §6, §9.2, §9.3).
- **Zeke (2026-11-23; his feedback on CASE §3, reviewed in CF, header line 3):** L "yes" (C19 Availability matches CR).
- **Change:** `src/mappings/client/buildClientMetadata.mjs:354-358`: send `finalized_client_service_hours_post_assessment`, trimmed, **nothing appended**. None of the 104 real CR values ends with ", `<number>`". `client_service_hours_total` leaves the mapped list (`clientProperties.mjs:49`): nothing else in `src/` reads it.
- **Tests:** text + hours → the text only; text blank + hours filled → `null`.
- **Sandbox proof:** matrix row C19: GET Meta `126209` = the text, with no ", 20".
- **Departs from guide line 360** ("Send the availability text and total weekly hours"): needs a guide note (O-34).

### 8. Severity matches CentralReach

- **Requirements:** C28 (CF §6, §9.2, §9.3).
- **Zeke:** M "Yse" (Severity matches CR).
- **Zeke (2026-11-23, final):** "confirm with a record in hubspot and then see".
- **Status: Decided 2026-11-24 afternoon (seventh set, decision 5): un-held, build it (step 3).** No separate words from Zeke; applied by the orchestrator under his closing sentence: "On the remaining open items, apply your recommendation." CF §10.2 / §10.3 (below) is the record-level check. The earlier status is kept for the record.
- ~~**Status: PENDING record-level check.** Another worker is confirming with a HubSpot record and its CR client. Do not build until the result is written here. The question it settles (CF §9.7 question 8) follows.~~
- **Found in review (2026-11-24), for the orchestrator to judge; the status is not changed here:** CF §10.2 and §10.3 (2026-11-23, ~20:50 UTC) are that check: on 487 paired clients the CR value is the digit only on 18 of 18 filled values, "Level N" on 0; the level agrees on 11 of 15 (the 4 misses are value differences, one CR value is "4"). This confirms the CF §9.3 proposal below.
- **Zeke's M answer is dated 2026-11-23** (his feedback on CASE §3, reviewed in CF, header line 3).
- **The question.** The "bare digit on 20 of 31" evidence was the integration's own test writes (CF §9.1). Real CR holds only 2 values: "3" and "Level 3". Real data does not settle the format.
- **Change (CF §9.3 proposal):** `src/mappings/client/buildClientMetadata.mjs:390-392`: send the digit of `severity_level_clinical` ("Level 2" → "2"; also 1, 3). A stored value with no digit is sent as stored.
- **Tests:** "Level 1/2/3" → "1/2/3"; blank → `null`.
- **Sandbox proof:** matrix row C28 (R1 "2", R2 "1", R3 "3").
- ~~**If the record-level check is not back before the build:** item 8 follows; the deployed mapping ("Level 2") stays.~~ (Un-held 2026-11-24 afternoon.)

### 9. Grad Permit marker and Supervising BCBA

- **Requirements:** C13, C12, O-15, O-16 (gaps #3, #10; CASE §1, §4; GP §8).
- **Zeke (2026-11-23; his answers to GP §7 questions 2 and 3, GP §8 "Zeke answered the four questions of section 7 on 2026-11-23"; F and G: date not recorded beyond the package's "Decided" set of 2026-11-23):** "2. Confirmed - it needs to be done to match the requriments listed on the google doc for Grad Permit holder", "3. Yes", F "yes", G "YES". GP §7 question 3 asked: "Is it accepted that the association decides and the supplier is only the fallback?" His "3. Yes" answers that question only; it does not mention a suffix (corrected 2026-11-24: an earlier parenthesis here added " BCBA LBA" to his answer).
- **Zeke (2026-11-23, final):** "For the Decisions, with my recommendation for each: Let's do your recommendations please". The recommendation: Grad Permit reads only `lba_licensure__ny`, per the guide (rule 1 below). The data fix in D15 is a pre-go-live task for Zeke / United Care.
- **Rules: GP §8.3** (final; it wins over GP §1 to §7), **as amended here. This list is the spec; where GP §8.3 differs, this list wins:** GP §8.3 rule 5 (the licence suffix), its code change 3 (`lba_licensure__nj` / `__co` and "LBA flags" in the reads) and its code change 5 (`lba` on the BCBA entry) are superseded by rule 5 below (CF §12.6); its test table is corrected to match.
  1. **Holder:** the Case's Supervising BCBA (82) has `lba_licensure__ny` = `Grad Permit` (exact stored value). Only that property (guide line 504, "Reliable check"). `ny_bcba_a_grad_permit_holder` and `grad_permit_status` are **not** read; the supplier comparison is not used.
  2. **136052:** holder → "`<First> <Last>` Grad Permit Holder" (single spaces). Not a holder, or no 82 BCBA → blank.
  3. **131308 on a Grad Permit Case:** the BCBA(s) on the holder's **151** link + suffix. No 151 link → 131308 is left out (not sent, not cleared) with the warning `grad_permit_supervisor_missing`. The holder's own name is never sent.
  4. **131308 on a normal Case:** the first present of 82, 234, 288, 135 + suffix. None of the four → the typed `ongoing_central_reach_provider_supplier` **+ " BCBA LBA"** (rule 5).
  5. **Suffix (final, CF §12.6; replaces the licence rule):** **always " BCBA LBA"**, one space, no comma, after each BCBA's "`<First> <Last>`". Several BCBAs joined by ", " in record-ID order. **The typed-supplier fallback** gets the same suffix: trim the text and any trailing commas, then append " BCBA LBA" **unless the text already contains "BCBA" or "LBA" as a word** (any case), in which case it is sent as typed. ~~Blank supplier → `null`.~~ **Blank supplier → nothing is sent (O-58; decided 2026-11-24 afternoon, seventh set, decision 6; applied by the orchestrator under Zeke's closing sentence, no separate words): 131308 is left out of the write, not sent and not cleared, through `omitFieldIdsFor` as rule 3's omission (gap c), so the saved hash is kept.** This follows approved insert E ("a blank supplier sends nothing"); the working tree's clear of a value the integration wrote is changed. No extra HubSpot search: the typed text is not matched to a BCBA record.
     - Zeke (2026-11-23): "Refer to the requirements doc and then what we found on the portal reads". The guide (lines 354, 503, 543) names the source (the typed supplier, matched to the CR provider by name; association 82 for the Grad Permit check) and sets **no suffix**. ~~Zeke's own decision 3 is "131308 from associations + ' BCBA LBA'".~~ Corrected 2026-11-24: that was a paraphrase, not his words; his words were "3. Yes" to GP §7 question 3 (association decides, supplier as fallback). "Always ' BCBA LBA'" is the package's inference from the portal reads below (CF §12.6).
     - **Basis for the suffix, the typed supplier included: guide insert E, approved by Zeke 2026-11-24** ("Yes, all 7", recommendation 1: approve blocks A–E). Its approved text (`GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md`, Insert E) states: each BCBA name is sent as "`<First> <Last>` BCBA LBA", "always ' BCBA LBA', whatever licence the BCBA holds", and with no BCBA in a supervising role "the typed ongoing_central_reach_provider_supplier is sent with ' BCBA LBA' added, unless the typed text already contains BCBA or LBA as a word; a blank supplier sends nothing". So the typed-supplier rule is settled by that approval, not left open. The same "whatever licence" covers the 2 CO Cases that CR shows with " BCBA": they become " BCBA LBA" at their next update, which for existing linked Cases falls in the existing-records phase (D19, reviewed before the updates box is ticked); add them to that review.
     - Portal reads (487 paired clients): "always" matches the suffix on **307 of 309** named values (99.4%); the licence rule on 304 (98.4%). "Always" needs no `lba_licensure__nj` / `__co` read, does not downgrade the 69 BCBAs whose NY licence is blank (for example the two Cynthia Storberg Cases, CR "BCBA, LBA"), and does not depend on a licence change starting a Case sync. Its 2 misses are CO clients that CR shows with " BCBA" (Cases `57574700881` and one other CO Case); CO rests on 5 values and no CO licence is `Yes` in HubSpot.
     - **Guide note, decided 2026-11-24 (sixth set, recommendations 1 and 2; Zeke: "Yes, all 7"):** insert E of the guide insert draft, added at the C12 row (line 354) and repeated at the section 3 row (line 503). Not written to the doc yet.
     - Whole value, GP §8.3 order: 171 of 339 (50%) with the supplier as typed; about 249 to 252 of 339 (about 74%) with the supplier suffix (estimate, CF §12.6).
  6. **Clearing:** at the first Case sync after the 82 BCBA's licence leaves `Grad Permit` or the 82 changes. A BCBA-only change does not start a Case sync.
  7. **Several 82 BCBAs.** No production Case has two (CASE §1). This is the package's rule, not Zeke's decision; ~~his word is asked (open question 26)~~ **answered 2026-11-24 afternoon (open question 26; seventh set, decision 3).** Zeke: "3. Based on production reads in HubSpot and CentralReach, is this recommended? We're going on what's required." **Applied (orchestrator):** yes, rule 7 as written below; **the code is changed to match** (the working tree keeps the typed text on the mixed case, BUILD-PLAN O-55; that goes). Evidence: no production Case has two Supervising BCBAs; the guide defines no mixed-case rule; the sandbox allows one Supervising BCBA per Case, so the mixed case is proven **offline only**. It sends nothing it cannot derive from rules 1 to 5 and leaves the uncertain mixed case out:
     - none is a holder → rule 4 (all of them, ", " in record-ID order, each + " BCBA LBA");
     - all are holders → 136052 = each holder's "`<First> <Last>` Grad Permit Holder", ", " in record-ID order; 131308 = the union of their 151 supervisors, deduped by record ID, record-ID order, each + " BCBA LBA". Any holder with no 151 link → 131308 left out with `grad_permit_supervisor_missing` (as rule 3);
     - **mixed** (some holders, some not) → both 136052 and 131308 are left out of the write (not sent, not cleared, saved hashes kept through `omitFieldIdsFor`), with the warning `grad_permit_mixed_supervising_bcba` (codes only, never a name). CR keeps its values until staff fix the associations.
- **Dominique Plummer: settled** (GP §8.1). She is the Supervising BCBA (82) on Case `64880905367` **and** a Grad Permit holder (151 link to Amanda Beckerman). Her `lba_licensure__ny` is blank, so the guide's test misses her until the data fix in D15 (Dominique Plummer and Katie Vangraefschepe; Zeke / United Care, before go-live).
- **Change (GP §8.3 "Code changes" 1 to 5):**
  - `src/constants/centralReach.mjs:146`: add `GRAD_PERMIT_HOLDER: 136052`.
  - `src/lib/config.mjs:94-100` / `:107-113`: the role IDs of item 10, and `gradPermitSupervisorAssociationTypeId` 227 (sandbox) / 151 (production). Comment at `:84-86`.
  - `src/workflows/clientSyncInputs.mjs`: `:38` `BCBA_ROLES` adds `supervisingBcba`, `subBcba`, `outgoingSubBcba`, `outgoingSupervisingBcba`; the batch read at `:89` is **shared** by the BCBA and BT/RBT reads (`readType`, `:80-104`, called for both at `:106-109`, checked at `655b385`), so the BCBA batch read gets **its own property list** `first_name`, `last_name`, `lba_licensure__ny` (the holder test only; the suffix needs no licence, so `__nj` and `__co` are **not** read). The BT/RBT read keeps `first_name`, `last_name`; do not add `lba_licensure__ny`, or the missing-key rule of gap d, to the shared list; new `readGradPermitSupervisors` (only for an 82 BCBA whose licence is `Grad Permit`: its BCBA to BCBA associations, type `gradPermitSupervisorAssociationTypeId` with category `USER_DEFINED` only, then a batch read of `first_name`, `last_name`; a failed read stops the run). **No new `hubspotClient` function:** the association read is the existing `listAssociations({ fromObjectType: bcbaObjectTypeId, fromId: <holder record ID>, toObjectType: bcbaObjectTypeId })` (`src/lib/hubspotClient.mjs:399-456`; `GET /crm/v4/objects/{bcba}/{id}/associations/{bcba}`; a 401/403 or an answer with no results list is already a `HubSpotReadError`), passed in through the worker's existing `loadAssociations` seam (`clientSyncWorkflow.mjs:229`), and the names through `readObjectsBatch` (`readBatch`, `:230`). The 151 type is read from the holder's side (GP §8.1: 151 "Grad Permit Supervisor (supervises this BCBA)" from Dominique Plummer to Amanda Beckerman). `omitFieldIdsFor` (`:125-133`) adds 131308 and 136052 when the staff were not read, 131308 when `supervisingBcbaFieldOmitted` (gap c), and both on the mixed case of rule 7.
  - `src/workflows/clientSyncWorkflow.mjs:517-531`: call the new read after `readStaffNames`; both mappings of the run get the same input (`:534-540`).
  - `src/mappings/client/buildClientMetadata.mjs`: the `staffNames` contract (comment at `:290-298`) gains, on each `supervisingBcba` entry only, `gradPermitHolder` (boolean) and `supervisors` (`[{ recordId, firstName, lastName }]`, the 151 BCBAs; empty when none). **No `lba` key** (rule 5: the suffix needs no licence). New `supervisingBcbaText` and `gradPermitHolderText`; `:386-389` replace the supplier-only value and add the 136052 key.
- **Code gaps the GP list misses (checked in `src/`):**
  - **a. One role, one field.** `STAFF_ROLE_FIELDS` (`buildClientMetadata.mjs:182-187`) maps each role to one field, and `staffNameFields` (`:203-222`) writes `fields[fieldId]` once per role. Adding `outgoingBt1: BT_1_NAME` would make the second role **overwrite** `primaryBt1`'s names. Restructure to **field → roles** (BT #1 Name ← `primaryBt1` + `outgoingBt1`; BT #2 Name ← `primaryBt2` + `outgoingBt2`), collect the staff of all the field's roles, **dedupe by record ID** (one BT on both 76 and 131 is named once), then sort by record ID. `staffRolesWithoutName` (`:192-197`) and `omitFieldIdsFor` move to the same shape: a field is omitted when any of its roles holds a nameless record.
  - **b. Do not add the supervising roles to `STAFF_ROLE_FIELDS`.** 131308 is built only by `supervisingBcbaText` (order, suffix, Grad Permit switch). In the generic table the roles would write unsuffixed names to 131308.
  - **c. The "no 151 link" omission must go through `omitFieldIdsFor`.** Export `supervisingBcbaFieldOmitted(staffNames)` next to `staffRolesWithoutName`; the mapper and `omitFieldIdsFor` both use it. If the mapper only drops the key, `keepOmittedFieldHashes` (`src/lib/mappedState.mjs:228-240`) does not carry the saved hash for 131308, and a later clear is lost (`metadataClearFieldIds` needs the saved hash, `:193-209`).
  - **d. A missing `lba_licensure__ny` key is a failed read** on the BCBA read only, as a missing `first_name` / `last_name` already is (`clientSyncInputs.mjs:96-103`): the run stops, and the value never becomes a blank or "not a holder". A BT/RBT answer is never checked for it.
  - **Check before ship: none for the suffix.** With "always", `lba_licensure__nj` and `lba_licensure__co` are not read. (Both exist in both portals anyway, CF §11.2.) `lba_licensure__ny` exists in both, with the option `Grad Permit`.
  - **e. Suffix code:** `supervisingBcbaText` appends the constant `SUPERVISING_BCBA_SUFFIX = " BCBA LBA"` (next to the field IDs in `src/constants/centralReach.mjs`) to each name; a new `supplierWithSuffix(text)` does the fallback (`/\b(BCBA|LBA)\b/i` → as typed).
- **Tests:** GP §8.3 test table (corrected 2026-11-24 to " BCBA LBA" and to `lba_licensure__ny` only; it replaces the two [C13] holder rows of GP §5.3; the other GP §5.3 rows stand, except the [C12] row at GP §5.3 line 282, whose "without LBA sends 'First Last BCBA'" is replaced by the [C12] suffix rows below). Add:
  - [C15] the same BT on Primary BT 1 and Outgoing BT 1 is named once in BT #1 Name;
  - [C13] a holder with no 151 link: 131308 is in `omitFieldIdsFor`'s answer, its saved hash is kept, and a later blank still sends the clear;
  - [C13] a BCBA answer with no `lba_licensure__ny` key → read failure, no CR write;
  - [C12] suffix (replace the licence rows of the GP §8.3 table): an 82 BCBA with NY `Yes` → "First Last BCBA LBA"; with every licence blank → "First Last BCBA LBA" (no " BCBA" form any more); two 82 BCBAs → "A One BCBA LBA, B Two BCBA LBA" in record-ID order; SUB 234 only → "<SUB name> BCBA LBA";
  - [C12] supplier fallback (no BCBA in the four roles): "Jane Doe" → "Jane Doe BCBA LBA"; "Jane Doe," → "Jane Doe BCBA LBA"; "Jane Doe BCBA" → as typed; "Jane Doe, BCBA, LBA" → as typed; "jane doe lba" → as typed; ~~blank → `null`~~ blank → 131308 in `omitFieldIdsFor`'s answer, not sent, a saved 131308 hash kept and no clear sent (O-58); "Jane Doe" with 82 present → the 82 name, never the supplier;
  - [C13] Grad Permit Case: the 151 supervisor + " BCBA LBA"; the holder's name never appears; no 151 link → 131308 omitted (unchanged);
  - [C13] the BCBA batch read asks for `first_name`, `last_name`, `lba_licensure__ny` and never `lba_licensure__nj`, `lba_licensure__co`, `ny_bcba_a_grad_permit_holder` or `grad_permit_status`; the BT/RBT batch read still asks for only `first_name`, `last_name`; the 151 read uses `listAssociations` BCBA → BCBA and keeps only `USER_DEFINED` 151 (227 in the sandbox);
  - [C13] rule 7: two 82 BCBAs, both holders → 136052 "A One Grad Permit Holder, B Two Grad Permit Holder" and 131308 the deduped union of their 151 supervisors; mixed (one holder, one not) → 136052 and 131308 both in `omitFieldIdsFor`'s answer, saved hashes kept, warning `grad_permit_mixed_supervising_bcba`, no name in the warning.
- **Sandbox proof:** matrix rows C12 and C13 (both rewritten). A BCBA with `lba_licensure__ny` = `Grad Permit` and a 227 link, on a Case as 247; one holder with no 227 link. The sandbox `lba_licensure__ny` has the option `Grad Permit`: **confirmed 2026-11-24** by a read-only sandbox property GET (and earlier in CF §11.2); GP §8.5's "not verified" is closed.
  - **Assumption to verify in the sandbox:** 227 is the **holder-side** label (the twin of production 151, "Grad Permit Supervisor (supervises this BCBA)", read from the holder), and 226 the supervisor side (the twin of 150). GP §5.1's 227/226 pairing comes from guide lines 975-992 and predates GP §8.1's 151/150 finding. Before C13 is judged, read the 227 link from the test holder's side and confirm it lists the supervisor; if it lists nothing, the sandbox ID is 226.
- **Fallback if items 9 and 10 are not ready today: omit 131308.** Add it to every run's omit list (`omitFieldIdsFor`); the mapper drops it (`buildClientMetadata.mjs:424`) and the saved hash is kept, so CR keeps its value. 136052 is not sent today, so nothing changes for it. Without the fallback, the deployed code sends the typed supplier to 131308 (`:386-389`).

### 10. Outgoing roles, SUB, On Leave and label 288

- **Requirements:** C15, C16, BR17 (gaps #4, #5; GP §4.3, §8.3, §8.4).
- **Zeke (date not recorded; it is among the answers GP §8 dates 2026-11-23):** "the code needs to be udpated to handle this please." (label 288, Outgoing SUB BCBA).
- **Zeke (2026-11-24 afternoon; seventh set, decision 9), on the rules below as a whole** (requirements review master question 10: Outgoing BT 1/2 join the BT names while the label is on the Case, no removal date; order 82 → 234 → 288 → 135; On Leave never sent): "9. these rules are rig". Read as "right" (assumption G67). Confirmed; no change.
- **Rules (GP §4.3; the 131308 order is rule 4 of item 9):**
  - Outgoing BT 1 (131) joins Primary BT 1 (76) in BT #1 Name 131313; Outgoing BT 2 (166) joins Primary BT 2 (143) in BT #2 Name 138092, while the label is on the Case.
  - 131308: 82, then SUB 234, then Outgoing SUB 288, then Outgoing Supervising 135.
  - On Leave 236 is never sent. No date logic: the label is the signal.
  - 288 is a known role, **not** excluded: its removal is the signal that the On Leave BCBA is back.
- **IDs (GP §8.3 change 2, §8.4):**

  | Role key | Sandbox | Production |
  |---|---|---|
  | `subBcba` | 217 | 234 |
  | `outgoingSubBcba` | **221** (paired 220) | **288** (paired 289) |
  | `outgoingSupervisingBcba` | 253 | 135 |
  | `onLeaveBcba` (named only, never read) | 233 | 236 |
  | `outgoingBt1` | 244 | 131 |
  | `outgoingBt2` | 236 | 166 |
  | `gradPermitSupervisorAssociationTypeId` | 227 | 151 |

  The sandbox label "Outgoing SUB BCBA" already exists (221 Case → BCBA); nothing was created.
- **Files:** `src/lib/config.mjs:94-100`, `:107-113`; `src/workflows/clientSyncInputs.mjs:38-39` (`BT_RBT_ROLES` adds `outgoingBt1`, `outgoingBt2`); `src/mappings/client/buildClientMetadata.mjs:182-222` (the field → roles restructure, item 9 gap a).
- **Tests:** GP §5.3 C15, C16 and BR17 rows; the portal table holds `outgoingSubBcba` 221 / 288 (GP §8.3). ID 236 is On Leave BCBA in production and Outgoing BT 2 in the sandbox.
- **Sandbox proof:** matrix rows C15 and C16 (now "open"): a Case with only an Outgoing BT 1 (244); one with only an Outgoing Supervising BCBA (253); one with only an Outgoing SUB BCBA (221); a leave Case with SUB (217) and On Leave (233).
- **Data gap, not code:** 4 Cases keep a stale 135 label (D17).
- **Fallback:** as item 9 (omit 131308). The BT fields keep today's Primary-only names.

### 17. Maladaptive Behaviors: ", " between options

- **Requirements:** C27, Meta `126207`, O-28 (CF §6).
- **Status: DROPPED from today's build** (Zeke, 2026-11-23: "Yes to recommendation"; the recommendation was to keep Maladaptive as is). The current code stays: `buildClientMetadata.mjs:341-343` sends `maladaptive_behaviors__parentguardian` as stored, trimmed. No test change, no matrix change for C27. The text below is kept for reference only; do not build it.
- **Zeke (earlier):** no separate quote. CF §6 verdict "Mismatch: fix", under his "Match CentralReach" answers (items 4, 5). Was open question 7.
- **Change (not built):** `src/mappings/client/buildClientMetadata.mjs:341-343`: split `maladaptive_behaviors__parentguardian` on ";", trim each option, drop blanks, join with ", ". CR holds options joined by ", " (CF §6: "A, a" ×18, "A" ×11).
- **Tests** (`clientMetadataMapping.test.mjs`): "Aggression;Self-Injury" → "Aggression, Self-Injury"; one option → as stored; blank → `null`.
- **Sandbox proof:** matrix row C27 (expected value changes from "stored value"): a round with two options, GET Meta `126207` shows ", ".
- **Not included:** the "Mouthing Non Food Itemsth" typo (CF §6, optional) and the Address 2 cleanup (open question 7).

---

## B. Build items: recommended by the workers

Items B21, 12, 14, 15 and 16 are now **decided** (ship today); they stay here to keep their numbers. Item 13 is still "recommended, awaiting Zeke's word" (can follow). Item 18 is new (tests only). Item 11 moved to section B2 (deferred).

### B21. A blank core client field on an update never clears CentralReach

- **Requirements:** BR16, O-35, A-4, R-4 (gap #21). The client half of row 3.13.
- **Status: Decided. Ship today (step 6). Route A.**
- **Zeke (2026-11-23, final):** "For the Decisions, with my recommendation for each: Let's do your recommendations please". The recommendation: Route A, a new CentralReach client read; a blank core client field sends back CentralReach's stored value, never clears.
- **Recommendation (now the rule):** match the employee rule (rule 5.8, row 3.13). On an update, a core client field that is blank in HubSpot never clears CentralReach: the request carries the value CentralReach holds, or leaves the field out.
- **Why:**
  - The guide says to "Distinguish an intentional blank from a failed or unauthorized read" (guide line 1733).
  - CentralReach rejects a client create with a blank date of birth (guide line 337), so the required identity fields should never be blanked by an update.
  - A partial HubSpot read must not wipe identity data in production. Today existing clients are protected only by the gate checkbox (D1).
- **Metadata keeps its current rule:** clear only what the integration wrote (`metadataClearFieldIds`, `src/lib/mappedState.mjs:193-209`; `clientSyncWorkflow.mjs:780`). No change.
- **As built today:**
  - `src/mappings/client/buildClientPayload.mjs:44-55` returns `null` for a blank `Gender`, `PrimaryEmail`, `PhoneCell`, `AddressLine1`, `AddressLine2`, `City`, `StateProvince`, `ZipPostalCode`, `GuardianFirstName`, `GuardianLastName`. The update PUT sends those `null`s (`src/lib/centralReachClient.mjs:389-399`).
  - `FirstName` / `LastName`: a blank one already ends the run `error` with no CR write, on an update too (`validateClientPayload.mjs:13-19`). No change.
  - `DateOfBirth`: a blank one is already left out (`buildClientPayload.mjs:42`). Leaving out is safe only if the client PUT keeps a left-out field (see PENDING).
  - The Case worker makes **no CentralReach client read** before an update, and `src/` has no `GET /contacts/client/{id}` call. The employee worker has both (`employeeSyncWorkflow.mjs:1031-1051`, `keepUnwrittenCoreFields` in `mappedState.mjs:259-302`).
- **Change. The mapper stays as it is** (it does not know create from update, and the compared state and saved hashes must stay HubSpot-only, as on the employee side). **Build Route A.** Route B is kept below for the record only; do not build it.
  - **Route A (decided), send back CentralReach's value:**
    - **Three paths end in a client update PUT, not one** (checked in `src/`, 2026-11-24): (1) the linked Case (`existingContactId`, `clientSyncWorkflow.mjs:644-653`); (2) the pending-create Case whose marker lookup finds its client (`targetContactId = pendingContactId`, `:654-675`); (3) the unlinked Case whose lookup by External System ID inside `createOrUpdateClient` finds the client (`centralReachClient.mjs:377-399`). All three reach the one update branch of `createOrUpdateClient` (`:385-399`). So the read and the send-back go **there**, not in the workflow: one place covers all three.
    - `src/lib/centralReachClient.mjs`: new `getClientByContactId(contactId, { onCall })` next to `getEmployeeByContactId` (`:445`): `GET /contacts/client/{id}`, kind `lookup`. In the update branch of `createOrUpdateClient`, after the `ContactForm` / `ExternalSystemId` handling and before the PUT: `const held = await getClientByContactId(plan.crContactId, { onCall })`, then `body = keepHeldClientCoreFields(updatePayload, held)`. The payload passed in is still not changed (contract P.5 (f)); the create branch is unchanged. Update the contract comment at `:330-357`.
    - **A failed read is no PUT.** An answer that does not show this client (no contact ID, or a different one), or that **lacks any of the 11 core keys**, is a failed read: `unreadableAnswerError` with code `CR_CLIENT_READ_FAILED` (permanent, as `CR_EMPLOYEE_READ_FAILED`, `:457-470`), logged by key names and types only. A missing key is never "left out" (see below).
    - `src/lib/mappedState.mjs`: `CLIENT_CORE_FIELDS` (`Gender`, `DateOfBirth`, `PrimaryEmail`, `PhoneCell`, `AddressLine1`, `AddressLine2`, `City`, `StateProvince`, `ZipPostalCode`, `GuardianFirstName`, `GuardianLastName`) and `keepHeldClientCoreFields(payload, crClient)`: for each field whose mapped value is blank (`normalizeBlank`), send the value the read holds under that key, **including a held `null` or `""`** (sending back CentralReach's own blank changes nothing). A filled mapped value is sent as mapped. Unlike `keepUnwrittenCoreFields`, there is no "written before" branch (decided: never clears).
    - `src/workflows/clientSyncWorkflow.mjs:705-708` (`createNotSent`): add `error?.code === "CR_CLIENT_READ_FAILED"`, so path 3 clears its pending-create marker when the read fails (no create was sent). A transient GET failure (5xx, timeout) keeps the marker; that is harmless: the retry's pending lookup finds the same client and takes path 2. No other workflow change; the hashed payload is not touched.
    - Cost: one more CR GET per client update (paths 1 to 3), never on a create or a noop.
  - **Left-out fields.** Whether the client PUT clears a left-out field is **not known** (O-35; no cached CR evidence in the repo: `scripts/sandbox/check-cr-record.mjs:280` "The client read is not known (O-35)"). The employee PUT does clear one (BUILD-PLAN section 4, test of 2026-11-20). So the build never relies on leaving a core field out: every one of the 11 keys is in the PUT body, with the mapped value or the held one. The keys the update branch already leaves out (`ContactForm`; `ExternalSystemId` when not known to be held, `:391-393`) are unchanged by B21 and keep their existing risk (WAVE-1 L-R2).
  - **Route B (not chosen), leave the field out (smaller, no read):** in the update branch of `createOrUpdateClient` (`centralReachClient.mjs:389-393`), delete every `CLIENT_CORE_FIELDS` key whose value is blank before the PUT. The create is unchanged.
- **~~PENDING~~ Cleared 2026-11-24 (test-client read and Zeke's production read, below; point 5 and O-35 stay with R1-U2): the field names of the client read.** `src/` has no `GET /contacts/client/{id}` call, so the names the answer uses for the 11 core fields are not known from the code or the guide. The testing chat takes them from one read-only GET of a sandbox test client and records the answer here; the build uses that recorded answer as its test fixture. Do not guess the names from the employee read. **The recorded answer must also establish** (key names and types only, never values):
  1. where the client sits (root or under `contact`) and the key that holds its contact ID;
  2. the exact key for each of the 11 core fields, and whether its casing matches the PUT body (`AddressLine1` vs `addressLine1`); if a key differs, the mapping from read key to PUT key;
  3. whether a field CentralReach holds blank comes back as a key with `null` / `""` or is absent. If any of the 11 is absent even when filled (as EMP §1 found for the employee date of birth), the "missing key = failed read" rule would block every update: stop and return it to Zeke before building;
  4. not answerable by a GET: whether the client PUT clears a left-out field (O-35). R1-U2 still shows it; Route A does not depend on it;
  5. (second review, 2026-11-24) the value format of each key matches the PUT body, `DateOfBirth`, `Gender` and `StateProvince` especially. A read shape is not proof that CentralReach accepts it back: **matrix round R1-U2 must show an unchanged round-trip** (each sent-back core value GET-read again equal to what CR held) before production.
- **Answer recorded 2026-11-24 (testing chat; PENDING partly cleared).** One read-only `GET /contacts/client/5384589` (round 1 test client, last name holds "Azure Test", answered contact ID = the requested one), HTTP 200. **CR calls: 2** (1 token request, 1 GET). Key names and types only; no values kept. Script: `b21-client-read-shape.mjs` in that chat's scratchpad (GET only, plus the token POST).
  1. **Where:** under `contact` (as the employee read). Contact ID: `contact.contactId`, a **number** (compare as a string, as `readEmployeeContactId` does). The root also holds `result` (string), `failed` (boolean), `cachedTime` (number).
  2. **Keys:** all 11 are returned, camelCase (first letter lower), under `contact`:

     | PUT key | Read key | Shape on the test client |
     |---|---|---|
     | `Gender` | `contact.gender` | string, the word form (`Male` / `Female`, as the mapper sends) |
     | `DateOfBirth` | `contact.dateOfBirth` | string, ISO date-time, 28 characters (the PUT sends 24: `YYYY-MM-DDT00:00:00.000Z`); sending CR's own form back is assumed accepted, not tested |
     | `PrimaryEmail` | `contact.primaryEmail` | string, email |
     | `PhoneCell` | `contact.phoneCell` | string, 10 digits (as the mapper sends) |
     | `AddressLine1` | `contact.addressLine1` | string |
     | `AddressLine2` | `contact.addressLine2` | string |
     | `City` | `contact.city` | string |
     | `StateProvince` | `contact.stateProvince` | string, 2 capital letters (as the mapper sends) |
     | `ZipPostalCode` | `contact.zipPostalCode` | string, 5 digits |
     | `GuardianFirstName` | `contact.guardianFirstName` | string |
     | `GuardianLastName` | `contact.guardianLastName` | string |

     Also in the answer: `contact.firstName`, `contact.lastName`, `contact.externalSystemId` (string, the Case record ID, **present** on this client), `contact.isActive`, `contact.type`, `contact.title`, `contact.middleInitial`, `contact.chosenName`, `contact.guarantorFirstName`, `contact.guarantorLastName`, and the arrays `contact.clientDiagnosisCodes`, `contact.additionalContacts`, `contact.primaryPayors`, `contact.secondaryPayors`.
  3. **Blanks: not settled for the 11.** All 11 are filled on the only test client in CentralReach (round 1; round 4's Case was never pushed), so no core blank was seen. Seen: five other text fields held blank come back as a key with `""` (`title`, `middleInitial`, `chosenName`, `guarantorFirstName`, `guarantorLastName`); no key came back `null`. **Risk:** the 2026-11-18 production read found "no External System ID field at all" on clients without one (ARCHITECTURE-REVIEW, Q33), while this client, which holds one, returns `contact.externalSystemId`. So a field CR holds as `null` (not `""`) is most likely **left out of the answer**. If so, "a core key missing from the read = failed read" stops every update of a client with, say, no address line 2 or no guardian name in CR. ~~**Do not build the missing-key rule until Zeke decides** (suggested: with `contact.contactId` matching, an absent core key means CR holds no value; send `null` back, which changes nothing). Proof needs one read of a client with a blank core field: a read-only GET of two production clients (4438604, 4717582; 3 CR calls) was prepared on 2026-11-24, but the permission check refused to run it, so it waits for Zeke to run it himself.~~ **Settled by Zeke's production read below:** a blank core field comes back `""` with the key present; the missing-key rule stands. **Date of birth send-back (recommendation):** rebuild the held value as `YYYY-MM-DDT00:00:00.000Z` from its first 10 characters, the form the mapper already sends, so the 28-character read form never needs testing.
  4. Unchanged: whether the client PUT clears a left-out field (O-35, R1-U2).
  - Side finding, not acted on here: the client read **does** return `externalSystemId` when CR holds one, which questions the premise of item 23 ("Dropped", guide line 267).
- **Production read, run by Zeke 2026-11-24 (PENDING cleared).** Zeke ran the read script himself: **3 CR calls** (1 token, 2 GETs of production clients `4438604` and `4717582`), both HTTP 200, `contact.contactId` equal to the requested ID. Key names and shapes only, no values.
  1. **All 11 core keys are present on both clients.**
  2. **A blank core field comes back as `""` with the key present:** `contact.addressLine2` = `""` on the second client (filled on the first). Other blank string fields on the same read also come back `""` (`title`, `middleInitial`, `chosenName`, `phoneHome`, the guarantor names). No field came back `null`.
  3. **`contact.externalSystemId` is absent on both** (it is not a core key: CR leaves it out when blank; the test client, which holds one, returned it).
  4. **Shapes of filled core values on real records match the PUT body:** `gender` a 4-letter word, `phoneCell` 10 digits, `stateProvince` 2 capitals, `zipPostalCode` 5 digits, `dateOfBirth` a 28-character ISO date-time (the send-back rebuilds `YYYY-MM-DDT00:00:00.000Z` from the first 10 characters, as recommended above).
  - **Conclusion:** the rule "a core key missing from the read = failed read, no PUT" **stands as written** and does not block clients with a blank Address 2. A core key that comes back `""` means CentralReach holds nothing, so there is nothing to preserve; sending `""` back changes nothing. The risk in point 3 of the test-client answer (a `null` field left out) did not occur for a core key. **B21 is buildable.** The PENDING on field names and blank shape (points 1 to 3 of the list above) is cleared; point 5's R1-U2 unchanged round-trip is still required before production.
  - **Limits:** only `addressLine2` was seen blank among the 11 core keys. A blank `dateOfBirth`, email, phone or guardian name was not seen. If one ever comes back absent, the failed-read rule makes that run a no-write `error` (`CR_CLIENT_READ_FAILED`), which is the safe side.
- **No longer a gate: the O-35 test (R1-U2).** It was to pick the route (does the client PUT clear a left-out field?). Route A is decided and, with every core key in the PUT body, is safe whatever the PUT does, so the test is now only the sandbox proof below. On employees a left-out field **is** cleared (BUILD-PLAN section 4, test of 2026-11-20), which is why a core key the read lacks is a failed read, not a field left out (replaces the earlier "left out with a warning").
- **Tests** (new `stage3BlankCoreFieldsClient.test.mjs`, the client twin of `stage3BlankCoreFields.test.mjs`; every test carries [BR16][3.13]):
  - an update with each core field blank in HubSpot: each of the 11 keys is in the PUT body with CentralReach's value (a `null` only where the read itself holds a blank);
  - a filled field is sent as mapped;
  - a blank date of birth on an update: never sent blank, no placeholder;
  - a field the integration wrote and HubSpot then blanked is still not cleared (decided: never clears);
  - a create still sends the full payload, and a blank date of birth still blocks the create;
  - the compared state and saved hashes do not change: a blank field keeps the blank hash, and an unchanged Case is still a no-op with no CR call;
  - no usable client read → no PUT, `CR_CLIENT_READ_FAILED`, permanent; a read that lacks one of the 11 core keys → the same; a held `null` is sent back as `null`;
  - **each of the three paths** reads the client and sends back its values: the linked Case; the pending-create Case whose marker lookup finds the client; the unlinked Case whose lookup by External System ID finds it. A create (lookup 404) makes no client read;
  - path 3 with a failed read: no PUT, and the pending-create marker is cleared (`createNotSent`);
  - the crCalls of an update run show `lookup` (the GET) before `update`;
  - a cleared metadata field the integration wrote is still cleared (rule unchanged).
  - Existing files to re-check for PUT bodies that expect `null`: `clientSyncWorkflow.test.mjs`, `laneLClientCreatePath.test.mjs`, `requirementProofs.test.mjs`. `clientPayloadMapping.test.mjs` is unchanged (the mapper is unchanged).
  - **Existing tests that change** (checked at `655b385`): `laneDRunSummary.test.mjs:192-204` (the linked-Case update expects `crCalls` `[lookup, update]`; it becomes `[lookup, lookup, update]`), and its route map `KIND_BY_ROUTE` (`:107-116`) needs `"GET /contacts/client/{id}": "lookup"`; `duplicateSafety.test.mjs:112-121` ("an external-id match updates and never creates") needs a fake route for `GET /contacts/client/55`.
- **Sandbox proof:** matrix row BR16, round R1-U2 (the blank round): blank the Case phone, address and guardian; GET the client; each field keeps its value. **Required before production:** the same round shows an unchanged round-trip of every sent-back core value (PENDING point 5), `dateOfBirth`, `gender` and `stateProvince` included. The R1-U2 expected result for core client fields changes from "cleared" to "kept" (`sandbox-test-matrix.md:328`).
- **Effect to tell Zeke:** a phone, address, gender, email or guardian name that staff blank in HubSpot stays in CentralReach until someone clears it there.

### 12. Label read-back: wait about 150 s before the first retry

- **Requirements:** BR19 (gap #1). BR14 (the retry re-sends the update) stays open.
- **Status: Decided. Ship today (step 8). The wait only.**
- **Zeke (2026-11-23):** "Yes please implement the label fix."
- **Problem:** the read-back runs 3 times in about 10 s (`src/lib/centralReachClient.mjs:666-667`, `:789-803`, `:885-887`), and CR can lag about 150 s (`:662-664`). The run then throws `CR_LABEL_POST_UNCONFIRMED` before the synced state is saved (`src/workflows/employeeSyncWorkflow.mjs:1234-1236`, `src/workflows/clientSyncWorkflow.mjs:820-822`). The first retry is planned at 60 s (`RETRY_DELAYS_SECONDS[0]`, `src/lib/retry.mjs:13`), still inside CR's lag, so it re-sends the update and may hit the lag again.
- **Change (only this):**
  - `src/lib/retry.mjs:162-166`: `labelPostUnconfirmedError` sets `error.retryAfterSeconds = 150` (the value of `LABEL_POST_WINDOW_MS`, `centralReachClient.mjs:664`; export it or share one constant).
  - `retryAfterSeconds` (`retry.mjs:186-205`) must read that new field: today it reads only `failedFields` and the HTTP `Retry-After` header, so the wait would be ignored. Return `error.retryAfterSeconds` when it is a finite number ≥ 0. `planRetry` (`:211-224`) already takes the larger of the step and the wait.
  - Leave the 3 × 5 s read-back as it is.
- **Not in this item: saving the hashes before the throw.** It looks smaller but breaks the retry. With clean hashes saved, the retry finds every field `unchanged` and ends as a noop (`employeeSyncWorkflow.mjs:975-1030`; `clientSyncWorkflow.mjs:590`), so the labels are **never read** and never confirmed. A fix for the re-sent update needs a label-only retry path and is its own item.
- **Tests** (`laneLLabelSender.test.mjs`, `stage2PortalAndRetries.test.mjs`; part of test gap C1): `planRetry` for a label-unconfirmed error at attempt 0 gives a delay of at least 150 s; `retryAfterSeconds` reads the new field; a `Retry-After` header and `failedFields` behave as before.
- **Sandbox proof:** matrix row BR19: the next create round. Log shows the retry scheduled about 150 s after the unconfirmed throw. (The R-WD create of 2026-11-23 confirmed at once, so the lag does not show on every run.)

### 18. Tests only: the record gate holds on every path

- **Requirements:** BR4, BR7 (D18).
- **Status: new, recommended. No `src/` change.** The gate is already read on every path. These tests pin that, so a later change cannot open a path. Item 24 runs the same table with two gate properties.
- **Already covered:** an unlinked and a linked record with the gate false or blank (`stage1CreateIdentity.test.mjs:290-352`); no writeback before the gate, also on the last attempt (`stage2ReviewFixes.test.mjs:224-256`); the poller filter (`stage3Poller.test.mjs:639`); both sweep branches (`stage3DailySweep.test.mjs:224`).
- **Add** (`stage1CreateIdentity.test.mjs`, each test tagged [BR4]):
  - one table test per worker: for every allowed `source` (`hubspotWorkflow`, `intakePoller`, `dailySweep`, `contactFanOut`, `linkedRecheck`; `processClientQueue.mjs:14-25`) and for `attempt` 0, 1 and the last, a linked record and an unlinked Entered = Yes record with the gate `false` → outcome `skipped`, reason `record_gate`, 0 CentralReach calls, 0 HubSpot writes;
  - the Contact fan-out queues a Case whose gate is false (`contactFanOutWorkflow.mjs:122-130`, by design) and the Case worker then skips it with no CentralReach call;
  - a record whose gate turns `false` between the first run and its retry: the retry is skipped, with no CentralReach call.
- **Sandbox proof:** the rows in D18 g, "Sandbox proof": the minimal live set, decided 2026-11-24 (sixth set, recommendation 5; Zeke: "Yes, all 7"). Item 18's own status (tests only, can ride along) is unchanged.

### 24. Two-property production gate: creates and updates (Option 2)

- **Requirements:** BR4, G17 (guide lines 271, 273), row 3.4, row 3.12 (D18).
- **Status: Decided by Zeke (2026-11-23, fifth set); design recommended here. The exact two names in the production guard and the live gate test set are decided (2026-11-24, sixth set, recommendations 3 and 5; Zeke: "Yes, all 7"). Needed before the production cutover.** The sandbox behaves exactly as today. Ship it in this deploy with item 14 (both touch `src/lib/config.mjs`), so the live gate test set can run in the sandbox re-test.
- **Zeke:** "For each workflow that will be pushed into production, we will create a two segments that will gate — for creates: central reach creates only — For updates: central reach updates only — anything not on those segments will not be created or updated until outstanding items are confirmed from united care." And: "In sandbox, everything is gated with the the testing sandbox property. In production this will be updated with the two segments based on the new prod properties I stated."
- **Rule:** each path has one gate property. HubSpot CR ID blank → the create gate. HubSpot CR ID filled → the update gate. The property must be `true`, or the run is `skipped` with reason `record_gate`. A path setting that is not set falls back to `SYNC_RECORD_GATE_PROPERTY`, so with neither set (the sandbox) both paths read `sandbox_test_field`, as today.
- **Change:**
  - `src/lib/config.mjs`:
    - `:173-184`: next to `syncRecordGateProperty`, a small reader for `SYNC_CREATE_GATE_PROPERTY` and `SYNC_UPDATE_GATE_PROPERTY`: blank → `null` (not set); `none` → invalid configuration on every portal (the only off switch stays `SYNC_RECORD_GATE_PROPERTY = none`, sandbox only); otherwise the trimmed name. `syncRecordGateProperty` stops throwing on a blank value when both path settings are set.
    - `:292-295` and `:334-337`: `sync` gains `createGateProperty` and `updateGateProperty` next to `recordGateProperty` (raw values; the fallback is not done here).
    - `:17-38`, `:40-53`, `:226-251`: `SYNC_RECORD_GATE_PROPERTY` is reported missing only when one of the two path settings is not set.
    - `:243` (the `invalid` list in `validateEnvNames`, shared by the worker and the poller) and item 14: when `HUBSPOT_PORTAL_ID` is `50317927`, each of these is added to the `invalid` list, so `validateConfig` and the connectivity test report it and `getConfig` / `getIntakePollerConfig` fail before any call: `SYNC_CREATE_GATE_PROPERTY` not exactly `centralreach_creates_only`; `SYNC_UPDATE_GATE_PROPERTY` not exactly `centralreach_updates_only`; `SYNC_RECORD_GATE_PROPERTY` = `none`; `INCLUDE_TEST_RECORDS` = `true`. **Exact names: decided 2026-11-24 (sixth set, recommendation 3; Zeke: "Yes, all 7"). Build it.** A not-set, swapped or misspelt name refuses to run: swapped names would open creates for every record ticked for updates. The two names are constants next to the portal table (`:124` area), production row only; the sandbox may name any property. This replaces "set, and two different names".
    - **How a value is matched (follows `config.mjs` today):**
      | Setting | Read as | Production rule | Precedent in `config.mjs` |
      |---|---|---|---|
      | `HUBSPOT_PORTAL_ID` | trimmed | production when it equals `50317927` | `invalidPortalEnvNames` (`:137-151`) |
      | `SYNC_CREATE_GATE_PROPERTY`, `SYNC_UPDATE_GATE_PROPERTY` | trimmed; blank = not set | must equal `centralreach_creates_only` / `centralreach_updates_only` exactly, **case-sensitive** (`Centralreach_creates_only` is invalid). HubSpot internal names are lower-case and the name is sent to HubSpot as written | the object-type settings, compared exactly with the table after a trim (`:146-149`) |
      | `none` in any of the three gate settings | trimmed, **any case** (`NONE`, ` None `) | `SYNC_RECORD_GATE_PROPERTY` = `none` invalid in production; a path setting = `none` invalid on every portal | `syncRecordGateProperty` (`:175-184`, `raw.toLowerCase() === "none"`) |
      | `INCLUDE_TEST_RECORDS` | through `includeTestRecords()` itself: trimmed (`getOptionalEnv`), **any case** `true` | invalid in production exactly when `includeTestRecords()` would return true (`TRUE`, ` true `); any other value (`yes`, `1`) is read as false at run time and is not flagged | `includeTestRecords` (`:169-171`) |
      The guard and the run-time readers use the same functions, so they can never disagree.
  - `src/lib/syncEligibility.mjs`:
    - new export `gateProperties(sync)` → `{ create: sync.createGateProperty ?? sync.recordGateProperty ?? null, update: sync.updateGateProperty ?? sync.recordGateProperty ?? null }`. The one place the fallback lives; both workers and the poller use it.
    - `:33-43` (`decide`): replace `recordGateProperty` with `gates` and `hubspotHasCrId`. `const path = hubspotHasCrId ? "update" : "create"`; when `gates[path]` is set and the value is not true → `{ eligible: false, reason: SKIP_REASONS.RECORD_GATE, gate: path }`. Still checked first, before `test_record`, the stage and the entry value. `linked` keeps its meaning for the entry rule at `:50-52`.
    - `:58-72`, `:75-89`: pass the two new arguments through.
  - `src/workflows/clientSyncWorkflow.mjs`:
    - `:320-324`: add both gate properties to the read.
    - `:349-356`: both are required keys (a missing one is a failed read).
    - `:358-363`: pass `gates` and `hubspotHasCrId: Boolean(hubspotContactId)` (`:341`, `:344`).
    - `:364-381`: the skip log and the run summary carry `gate` (`create` or `update`), never a value. The summary call: `summary.setGate(eligibility.gate)` before `summary.setOutcome("skipped", …)`, **only when `eligibility.reason === SKIP_REASONS.RECORD_GATE`**. The same skip block (`:364-381`, checked at `655b385`) also handles `test_record`, `excluded_stage` and `entry_not_yes`, whose `gate` is undefined, and `setGate` throws outside `RUN_GATES`.
  - `src/workflows/employeeSyncWorkflow.mjs`: the same four changes at `:359`, `:373-381` (read list), `:486-492` (required keys), `:495-527` (decision and log; `hubspotContactId` at `:496`), with the same `summary.setGate` call, on a `record_gate` skip only (the employee skip block, `:508-527`, also handles the other three reasons).
  - `src/lib/syncRunSummary.mjs` (**added to the files; the summary has fixed keys today**, `:23-44`, `build` at `:149-159`, and two tests compare the key list exactly: `laneDRunSummary.test.mjs:141`, `:366`, `:404`; `stage3RunSummaryEmployee.test.mjs:176`):
    - export `RUN_GATES = Object.freeze(["create", "update"])` and a method `setGate(gate)` that checks the value with `oneOf(RUN_GATES, …)` (throws otherwise, as `setOperation`);
    - `build` adds `gate` **only when it was set**, as `queuedMessages` is added only after `setQueued` (`:158`): `...(run.gate ? { gate: run.gate } : {})`. So every other line keeps exactly today's keys and the existing key tests stand; only a `record_gate` skip carries `gate`;
    - update the key list in the comment at `:23-44`. The KQL files read `gate` with the other keys (testing chat).
  - `src/workflows/intakePollerWorkflow.mjs`:
    - `:110-116` (`buildFilterGroups`): the gate filter is per branch, not shared: each branch is `{ gate, filter }` and its group starts with "`gate` = true" when the gate is set.
    - `:197-208` (poll): the linked branch carries the update gate; the Entered = Yes branch carries the create gate.
    - `:353-365` (sweep): the linked branch carries the update gate; the `waiting` branch carries the create gate and is left out only when no create gate is set. The `waiting` branch has no "unlinked" filter: a linked `waiting` record with the creates box ticked (updates blank) is queued, then skipped by the worker on the update gate (an extra message, not a gate gap).
    - `:419`, `:448`, `:161`, `:315`: read `gateProperties(config.sync)` once and pass it down in place of `gateProperty`.
    - With one gate for both paths the searches are the same as today, filter for filter.
  - `README.md:87`: document the two settings and the fallback.
  - **No change:** `src/lib/queueRetry.mjs:66-80` (a retry is the same message; the worker reads the record and both boxes again), `src/workflows/contactFanOutWorkflow.mjs` (each queued Case is gated in the Case worker), `src/functions/hubspotWebhook.mjs`, the write-back allowlist (the integration never writes either box), `local.settings.example.json` (the sandbox sets neither path setting).
- **Not included:** a "CR ID is unknown" filter on the create-gated search branches. Without it a record with a CR ID, the creates box true and the updates box blank can be queued by the poller; the worker skips it with no CentralReach call.
- **Known effect (corrected, gate review):** a linked record that is edited while its updates box is blank is skipped and not retried. When the box is ticked later, the tick moves `hs_lastmodifieddate` and the next poll queues it. What that run sends depends on the record's saved hashes (`clientSyncWorkflow.mjs:447-449`, `:582-588`):
  - a record the integration synced before (its own create, or an earlier clean update): only the fields that changed since the last clean run;
  - a record never synced (no saved hashes for its CR ID, which is every hand-linked existing record): a full update of every mapped field. This is why existing records are reviewed before the tick (D19).
- **Note: the create gate can still lead to a CentralReach update, in two cases.** Both are the integration's own creates; accepted.
  - The CR ID is in Cosmos only (the HubSpot write-back failed): `existingContactId` comes from the link record (`clientSyncWorkflow.mjs:341-342`; `employeeSyncWorkflow.mjs:495-496`), so the run updates that CR record and writes the CR ID to HubSpot.
  - The lookup by the HubSpot record ID finds the record in CentralReach (`findClientByExternalSystemId`, `findEmployeeByExternalSystemId`): the run links it and updates it, with no new create.
- **Duplicate path (gate review; stated plainly).** Ticking the creates box on a person who is already in CentralReach while their HubSpot CR ID is blank makes a duplicate. The only checks before a create are lookups by External System ID: the HubSpot record ID (Case and employee) and the Workday ID (employee). **A Case has no name check at all**, and an employee has no name or email check. Mitigation: D18 c, "Who ticks".
- **Tests** (each tagged [BR4]; new file `stage7TwoGates.test.mjs` unless a file is named):
  - `decide` table, Case and employee: CR ID blank × creates {true, false, blank} × updates {true, false, blank} → allowed only when creates is true; CR ID filled → allowed only when updates is true; the skip carries `gate`.
  - Linked only in Cosmos (HubSpot CR ID blank, link record holds one): creates true and updates blank → the run goes on and writes the CR ID to HubSpot; creates blank and updates true → `skipped`, no CR call.
  - A HubSpot answer without the create key, and one without the update key → failed read, no CR call, no HubSpot write, on a linked and on an unlinked record.
  - Fallback: only `recordGateProperty` set → every existing gate test passes unchanged (`stage1CreateIdentity.test.mjs:290-352`, `stage2ReviewFixes.test.mjs:224-256`, `stage3Poller.test.mjs:639`, `stage3DailySweep.test.mjs:224`).
  - Poller (`stage3Poller.test.mjs`): with two gates, the linked group carries only the update filter and the Entered = Yes group only the create filter; a linked record with updates blank and an Entered = Yes record with creates blank are not queued; one of each with its box true is queued.
  - Sweep (`stage3DailySweep.test.mjs`): the linked branch carries the update gate; the `waiting` branch the create gate.
  - Every source and attempt (item 18's table), run with two gates: a record in neither segment → `skipped`, 0 CentralReach calls, 0 HubSpot writes; the Contact fan-out queues the Case and the Case worker skips it; a box that turns false between a run and its retry → the retry is skipped.
  - Hand-off: a retry of a create run with the CR ID already in HubSpot and updates blank → `skipped`, no second create; with updates true → the run finishes.
  - Config (`configSmoke.test.mjs`, `stage3WebhookAndSettings.test.mjs`, `stage1CreateIdentity.test.mjs:268-287`): the sandbox with neither path setting → both gates are `sandbox_test_field`; a path setting = `none` throws on both portals; production with one path setting missing, with the two names swapped, with one misspelt or any other property name, with `SYNC_RECORD_GATE_PROPERTY = none`, or with `INCLUDE_TEST_RECORDS = true` throws, for `getConfig` and `getIntakePollerConfig`; production with the exact two names and no `SYNC_RECORD_GATE_PROPERTY` is valid; the sandbox accepts any two names.
  - Run summary ([BR15][3.20], `laneDRunSummary.test.mjs`, `stage3RunSummaryEmployee.test.mjs`): a `record_gate` skip line has today's keys plus `gate` (`create` or `update`); every other line (success, noop, error, a `test_record`, `excluded_stage` or `entry_not_yes` skip) has exactly today's keys and the run does not throw; `setGate("other")` throws.
  - Config matching: production with `" centralreach_creates_only "` (spaces) is valid; `Centralreach_creates_only` throws; a path setting `NONE` or ` None ` throws on both portals; production `INCLUDE_TEST_RECORDS` = `TRUE` or ` true ` throws; `yes` does not throw and is read as false.
  - `requirement-tests.json` updated so `npm run check:requirements` passes.
- **Sandbox proof:** the minimal live set in D18 g, in order: BR4-C, BR4-CU, BR4-UC, BR4-X (1-2), BR4-U+L, then BR4. Offline only: the Case create gate, retries, the Cosmos-only link. **Decided 2026-11-24 (sixth set, recommendation 5; Zeke: "Yes, all 7").** Setting and removing the two temporary Function App settings is an Azure write, asked again at that step.

### 13. One JSON line per log call

- **Requirements:** BR15, BR21 (gap #2).
- **Zeke:** recommended, awaiting Zeke's word.
- **Change:** `src/lib/safeLog.mjs:60`: write one line, `console[logLevel](JSON.stringify({ message, ...redactedMeta }))`. Redaction and the value caps stay as they are.
- **The four KQL files must be rewritten in the same change.** All four (`scripts/sandbox/kql/run-summary.kql`, `pipe-check.kql`, `record-timeline.kql`, `errors-retries-deadletters.kql`) rebuild a call from Node's multi-line print: the `calls` step joins rows by process and time, matching `key: 'value',` lines and a closing `}`, and `kv` reads `key: 'value'` (`run-summary.kql:6-25`). A JSON line matches none of that, so every query returns nothing. The rewrite reads one row per call with `parse_json(message)`. The KQL files are testing-chat files: **the testing chat rewrites them**, and both land together.
- **Tests** (`laneDSafeLog.test.mjs`, `br21NoValuesInLogs.test.mjs`; closes test gap C2): one call makes one `console` call with one string that has no line break and parses as JSON; nested objects and the long `crCalls` list stay on the line; redaction still applies.
- **Sandbox proof:** matrix rows BR15 and BR21: after the deploy, one `Sync run summary.` is one App Insights row.

### 14. Production guard for the gate and test records

- **Requirements:** BR4, R-28, row 3.12 (gap #22).
- **Status: Decided. Ship today (step 1).**
- **Zeke (2026-11-23, final):** "For the Decisions, with my recommendation for each: Let's do your recommendations please" (was: recommended, awaiting Zeke's word, step 9.2).
- **Cutover settings (Zeke's to set):** `SYNC_CREATE_GATE_PROPERTY = centralreach_creates_only` and `SYNC_UPDATE_GATE_PROPERTY = centralreach_updates_only` in production (D18 d; replaces `sync_to_centralreach`).
- **Widened by item 24 (gate review; decided 2026-11-24, sixth set, recommendation 3; Zeke: "Yes, all 7"):** in production `SYNC_CREATE_GATE_PROPERTY` must be exactly `centralreach_creates_only` and `SYNC_UPDATE_GATE_PROPERTY` exactly `centralreach_updates_only`. Not set, swapped or any other name → invalid configuration, so every run fails and alerts before any HubSpot or CentralReach call. If item 14 ships before item 24, it ships as written below and item 24 adds the rest.
- **Change:** `src/lib/config.mjs:167-184`: when `HUBSPOT_PORTAL_ID` is `50317927`, `SYNC_RECORD_GATE_PROPERTY` = `none` and `INCLUDE_TEST_RECORDS` = `true` are invalid configuration. Add each to the `invalid` list in `validateEnvNames` (`:243`, shared by `validateConfig` and `validateIntakePollerConfig`), so `validateConfig` and the connectivity test (`src/functions/connectivityTest.mjs:13`) report it, and `getConfig` / `getIntakePollerConfig` fail through `assertValidConfiguration` with the setting's name before any HubSpot or CR call. The sandbox keeps both options.
- **Tests** (`configSmoke.test.mjs`, `stage3WebhookAndSettings.test.mjs`): production + `none` throws; production + `INCLUDE_TEST_RECORDS=true` throws; production + a property name is fine; the sandbox accepts both. Shipped with item 24 (this deploy): "a property name is fine" becomes "the exact two names are fine; a missing, swapped, misspelt or other name throws" (item 24's config tests).
- **Sandbox proof:** none live (it is a production-only rule). Offline tests, plus the settings check at 9.7. Matrix row BR4 stays the sandbox gate test.

### 15. Workday ID format check

- **Requirements:** BR2, BR8, R-8, O-8, row 3.17 (gap #23; EMP §4).
- **Status: Decided. Ship today.**
- **Zeke (2026-11-23):** "Ship now with a note we are pending final confirmation on the workday id".
- **Supersedes:** BUILD-PLAN decision 22 (a note only, no format check), row 3.17 ("Not built") and risk R-8's mitigation ("a format check as a setting, not a fixed 7 digits").
- **Note: pending final confirmation on the Workday ID.** The 7-digit rule is not yet confirmed by United Care (Sara). Keep the rule in one place (`workdayIdIsValid`) so a changed format is a one-line change. Put the same note in the code comment on the helper.
- **Known effect:** 645 of 650 distinct production values are exactly 7 digits. The other **5 production records are malformed and end `error`**, with no CR call, until their `workday_id` is fixed (EMP §4, by shape; no record IDs are listed there):
  - BT/RBT (4): one in the `999-99-9999` shape; one with 5 digits; one text plus 7 digits; one 32-character sentence.
  - BCBA (1): text plus 7 digits.
- **Owner of the 5 fixes and of Sara's final word on the 7-digit rule (O-8; was open question 9): Zeke.** Zeke (2026-11-24): "I will handle this." Task D20. No change to this item.
- **Change:** one helper in `src/lib/syncDecisions.mjs`, `workdayIdIsValid(value)` = `/^\d{7}$/` on the trimmed value. A filled `workday_id` that fails it ends the run as `error`, and no CR call:
  - **One check, for both paths** (replaces "before the lookups (`:841-843`)" and "before `linkedEmployeeIdentity`", which were after the pending-create lookup and after the CR GET). Line numbers at `655b385`, `src/workflows/employeeSyncWorkflow.mjs`: directly after the unreadable-value check (`:656-663`) and before `validatePayload` (`:665`). That is after the gate (`:502-528`) and before the create/linked split (`:770`), so it runs before every CentralReach call of either path: the create lock and the pending-create lookup (`:775`, `:811`), the lookups by record ID and Workday ID, and the linked path's `GET /contacts/employee/{id}` (`:1031`). `externalSystemIdForCreate` (`buildEmployeePayload.mjs:25-31`) never sends it.
  - **The code it writes:**
    ```js
    // Item 15 (R-8, row 3.17): a filled workday_id must be exactly 7 digits. Pending final
    // confirmation of the Workday ID format by United Care (O-8); the rule lives in workdayIdIsValid.
    const workdayId = String(hubspotProps.workday_id ?? "").trim();
    if (workdayId && !workdayIdIsValid(workdayId)) {
      return await decided({
        status: "error",
        reason: WORKDAY_ID_NOT_SEVEN_DIGITS,
        code: DECIDED_CODES.WORKDAY_ID_INVALID,
        fail: true
      });
    }
    ```
    `src/constants/syncReasons.mjs`: `export const WORKDAY_ID_NOT_SEVEN_DIGITS = "workday_id must be exactly 7 digits.";` (names the property, never the value, as `crIdNotDigits`). `DECIDED_CODES` (`employeeSyncWorkflow.mjs:108`): `WORKDAY_ID_INVALID: "WORKDAY_ID_INVALID"`.
  - **Known effect of the placement:** a linked record with a malformed Workday ID ends `error` even when nothing changed (the check is before the noop at `:1028`). That is the rule as stated ("a filled `workday_id` that fails it ends the run as `error`").
  - A blank `workday_id` is unchanged (temporary ID, `waiting`).
- **Tests** (`stage1CreateIdentity.test.mjs`, `employeeSyncWorkflow.test.mjs`, each tagged [BR8][3.17]): 7 digits (and " 1234567 " with spaces) passes; 6 or 8 digits, `999-99-9999`, text + digits and `AZTEST-1-BT` → `error`, `last_sync_error` = "workday_id must be exactly 7 digits.", reason code `WORKDAY_ID_INVALID`, `crCalls` empty (no lookup, no create, no GET, no update), on an unlinked record, on an unlinked record with a pending-create marker, and on a linked record (changed and unchanged); the sentence holds no value; blank → as today.
  - **Fixture change (checked at `655b385`):** the shared fakes give the employee a non-numeric `workday_id`, which the check would turn into `error`: `WD1` / `WD2` in `stage3WorkerFakes.mjs:61`, `:80`, `:154`, `:159` and `stage2Fakes.mjs:421`; other tests use `WD1`, `WD2`, `WD7`, `WD9` and `SHARED` (`stage1CreateIdentity.test.mjs`, `stage2DurableState.test.mjs`, `stage2PortalAndRetries.test.mjs`, `employeePrimaryEmailUpdate.test.mjs`). Every `workday_id` that runs through the employee worker moves to a 7-digit ID (for example `WD1` → `1000001`, `WD2` → `1000002`), with the matching CR fake values (`externalSystemId`, `pendingCreateExternalId`, lookup keys) changed to the same ID. `bcbaTextDateOfBirth.test.mjs:206` (`seedStoredEmployee(cr, "5002", "WD2")`) depends on it.
- **Sandbox proof:** matrix rows BR8 (employee half) and T2 (R-WD): set `workday_id` to a 6-digit value on a test BT/RBT → HS `error`, Log shows no CR call; the 7-digit R-WD values still pass.
- **Note:** BUILD-PLAN R-8 proposed "a format check as a setting, not a fixed 7 digits" because the guide's test values were `AZTEST-…` (guide line 201). Zeke's R-WD round already uses random 7 digits, so a fixed check works; the guide line needs a note.

### 16. BT/RBT date of birth is read as text

- **Requirements:** T2 (EMP §1).
- **Status: Decided. Ship today (step 2).**
- **Zeke (2026-11-23, final):** "For the Decisions, with my recommendation for each: Let's do your recommendations please" (was: recommended, awaiting Zeke's word).
- **Change:** `src/mappings/employees/buildEmployeePayload.mjs:201`: pass `readTextDate` as the third argument, as the BCBA call at `:290` does. Fix the comment at `:34` ("date picker"): production `date_of_birth` is text. Without this, an M/D/YYYY value ends the run as `error`.
- **Tests** (`employeePayloadMapping.test.mjs`): `2/20/1992` and `1992-02-20` → `1992-02-20`; an unreadable value is still named in `unreadableValueProperties`; blank → the placeholder on a create only. **Existing test that breaks:** `bcbaTextDateOfBirth.test.mjs:214` asserts that the BT/RBT keeps the strict reader (`"01/05/1990"` unreadable); rewrite its BT/RBT half to the text reader (the Case half stands).
- **Sandbox proof:** matrix row T2: set the Contact `date_of_birth` as `2/20/1992` in one round; GET `dateOfBirth` 1992-02-20. R3 keeps the blank → placeholder check.

---

## B2. Deferred: pending the client starting work in NM/VA (not in this package)

### 11. New Mexico and Virginia state labels

- **Requirements:** BL3, TL2, O-6 (gap #16; EMP §7).
- **Status: Deferred, pending the client starting work in NM/VA. Not in this package. Do not build.**
- **Zeke (2026-11-23):** "These are pending the client beginning work in these states. Once ready we will include this to the code that handles the labels."
- **Until then:** a record whose `location` is New Mexico or Virginia gets no state label and the warning `unmapped_work_state`, as today. Guide line 225 says to send NM Employee / VA Employee when a record uses the state; Zeke's answer holds that until the client starts there.
- The change below is kept for the day it is picked up.
- **Change:** `src/mappings/employees/buildEmployeePayload.mjs:89-93`: add `"New Mexico": "NM"` and `Virginia: "VA"`; `:96-100`: add `NM: NM_EMPLOYEE` (1157030) and `VA: VA_EMPLOYEE` (1157031). Both constants exist (`src/constants/centralReach.mjs:24-25`); fix the comments at `:22-23` and `buildEmployeePayload.mjs:87-88`. `STATE_LABELS` feeds the managed lists (`:136`), so both become managed. No role label and no contact form exist for these states.
- **Tests** (`stage5EmployeeMappings.test.mjs`, `stageP3SendableLabels.test.mjs`): `location` New Mexico → 1157030, Virginia → 1157031, and no `unmapped_work_state` warning; an unknown state still warns; both IDs are in the sendable and managed lists; the contact form is unchanged.
- **Sandbox proof:** matrix rows BL3 (R2 adds New Mexico on the BCBA) and TL2 (R3 adds Virginia on the BT/RBT): GET labels.

---

## C. Closed with no code change

| ID | Zeke | Why no change |
|---|---|---|
| O-43, C20 | "I think we review each field if total hours is there use that field, if there's a value for hours 1 and hours 2 add them if there's only hours for 1 or 2 then use the value that's there." | The code sum (`buildClientMetadata.mjs:44-65`) gives the same result on every production Case: the only usable total, `total_hours_btrbt_12`, is a formula of the same two inputs and equals the sum on 20 of 20 (CASE §2). Optional: update the comment at `:39-43`. Guide line 361 needs a note (its named total is the formula `1 + 1`). |
| O-27, B10 | "salaried is a label in central reach" | The code already sends label `1132653` (`constants/centralReach.mjs:33`, `buildEmployeePayload.mjs:191`). |
| O-27 (open question 10) | "Irrelevant. Remove from the doc" (2026-11-24) | Removed on Zeke's word 2026-11-24: the question of removing the Salaried label from test client `5384589` by hand. No task. |
| A-13, BL5 | "please review and try to confirm in prod" | Reviewed (EMP §3): guide line 217 limits "no payor tags" to client labels, so BCBA label NY Medicaid `1107647` is sent, as built (`buildEmployeePayload.mjs:188-189`). Not confirmed on the CR screen for the sample BCBA (the API answers 404). |
| O-14, C18 | No code. | Both Location #2 schedule properties are filled on 0 of 2,882 Cases (CASE §7). |
| O-18, O-19, C21, C31 (Unsure), C38 | "if these are marked required on the doc then they need to be created and mapped" | They are not marked required (CF §3): the guide's only required list is the create fields (guide line 321). No CR target exists. |

---

## D. Not code: Zeke / United Care / cutover

1. **Gate property (Q8).** Zeke: "we'll create this production before cutover - now during sandbox". Note for Zeke:
   - The code reads the property **named in the app setting `SYNC_RECORD_GATE_PROPERTY`** (`src/lib/config.mjs:173-184`). No name is fixed in code today; with item 24, in production the guard requires the exact two names `centralreach_creates_only` / `centralreach_updates_only` (item 14). In the sandbox the setting is `sandbox_test_field`.
   - **Superseded 2026-11-23 (fifth set): the production gate is two properties, `centralreach_creates_only` and `centralreach_updates_only`, read through `SYNC_CREATE_GATE_PROPERTY` and `SYNC_UPDATE_GATE_PROPERTY` (D18, item 24). `sync_to_centralreach` is not created. The bullets below describe the earlier single-checkbox decision; type, objects and "true only" still apply to each of the two.**
   - Earlier (Zeke, 2026-11-23, final; "Let's do your recommendations please"): the checkbox is `sync_to_centralreach`.
   - Earlier production value: `SYNC_RECORD_GATE_PROPERTY = sync_to_centralreach`. Now: the two settings in D18 d. Never `none` (item 14 refuses it).
   - **Type:** single checkbox (boolean), options `true` / `false`. A record syncs only when the value is `true`; blank or `false` is skipped with reason `record_gate` (`src/lib/syncEligibility.mjs:29-31`, `:41-43`; the poller filters on `EQ "true"`, `src/workflows/intakePollerWorkflow.mjs:112`).
   - **Where:** the **same internal name** on the Case (deal), the BCBA (`2-48354212`) and the BT/RBT (`2-48354559`). Not needed on the Contact.
   - It is checked before `test_record`, the stage and the entry value, for creates and updates alike.
   - **How the two are set in production: D18 c.** Decided 2026-11-24 (sixth set, recommendation 4; Zeke: "Yes, all 7"): the "creates" workflow ticks `centralreach_creates_only` only on records created after cutover with Entered = Yes and no CR ID; the "promote after create" workflow ticks `centralreach_updates_only` only on the integration's own CR ID write; existing records are ticked by a person after their review (D19). No workflow copies a segment into them.
2. **Step 9.6 token check (C).** Zeke: "YES", one read-only token-info call (`POST /oauth/v2/private-apps/get/access-token-info`, REF item 3), then the definition and value GETs.
3. **Existing-record comparison at cutover.** Zeke: "mark this as pending confirmation of either: exporting the existing case and employee records in CentralReach and then doing a comparison of an export between HubSpot and CentralReach or use the api". PENDING: which method.
4. **Shadow comparison.** Zeke: "Hold this as a step that we will do in pushing to production."
5. **CR API user access.** Was: Danny connects the API user to every client and employee (REF item 1; table item 15, "Send Danny the access message"). Zeke on table item 15: "For 15. wait utn". **Now superseded: the API user is Gavriella Bohan (CR 4147071) and she is connected** (`CR-API-USER-ACCESS-REQUEST-2026-11-23.md`, "Status"). No message goes to Danny for this. Still to do:
   - the read-only verification that the connections cover every client and employee (until it passes, the duplicate risk on records the API cannot see stays: 102 BCBAs, 9 BT/RBTs; EMP "Correction");
   - **cutover task: auto-connect** from 4147071's profile to all clients going forward, so contacts added later stay visible to the API;
   - **cutover task, owner Danny: a dedicated API user** to replace Gavriella's login (same Contacts permissions, connections and auto-connect).
6. **Link existing employees** by writing `employee_id` (Q33) before creates are turned on (EMP §9).
7. **Care Coordinator in production (Zeke):** create the Case properties `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status` (and `coordinator_export_source_snapshot`), which **do not exist** (CF §9.6); rebuild the two workflows with the sandbox fixes (item 6: Case `TYPE` `0-3`, re-enrolment on, portal and account checks for production); give every coordinator an active Team Member record; enrol all in-scope Cases once so the status is `ready` before the first sync (CF §1.5). Item 6 ships **to production** only after this and after the pre-deploy check (built now for the sandbox, 2026-11-24 afternoon). Ruling A (Zeke, 2026-11-24): "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production". Zeke (2026-11-23): "Yes these will be created. For the Referral - Other, please have a worker create this in the sandbox for me and the include it in the test so this can be tested."
8. **B11 BCBA Care Coordinator:** K is answered (CF §9.5): no CR employee coordinator field exists (22 employee metadata fields, none for a coordinator); 138851 is client-only. Danny / United Care create an Employee metadata field "Care Coordinator"; then B11 becomes a build item (CF §1.3). The five BCBA properties do not exist in production either.
9. **Referral "Other":** the sandbox Case property `referral_other` exists and the C36 test is wired (round 2). Zeke recreates the sandbox one as a property sync ("In progress to update"), creates `referral_other` in production, and adds it to the Case workflow triggers. The "Other" part of item 2 ships **to production** only after the production property exists and the pre-deploy check passes (built now for the sandbox, 2026-11-24 afternoon; Ruling A: deployed from sandbox to production).
10. **Sandbox set-up for items 9 and 10:** the "Outgoing SUB BCBA" label already exists (221, GP §8.4). The sandbox `lba_licensure__ny` has the option `Grad Permit`: confirmed (CF §11.2, and a read-only sandbox property GET on 2026-11-24). `lba_licensure__nj` / `lba_licensure__co` are no longer read (item 9 rule 5). `ny_bcba_a_grad_permit_holder` and `grad_permit_status` are no longer needed.
11. **Guide notes (O-34)** for every departure above: lines 333 (BCBA `date_of_birth` is text, not a sync), 351 and 500 (the state falls back to `location` when `stateregion` is blank), 352, 354, 355, 360, 361, 364, 371, 373, 504, 543.
    - **Decided 2026-11-24 (sixth set, recommendations 1 and 2; Zeke: "Yes, all 7"):** blocks A–E of `GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md` are approved, with C repeated at the section 3 row at extract line 512 and E at line 503. Before writing, the doc is re-read (the revision ID and indexes are from an earlier read) and the final batch is shown to Zeke. Nothing is written yet. The other lines in this list are not drafted in that file.
12. **Tell United Care:** the first sync overwrites hand-entered CR values (69 Care Coordinator, 48 Supervising BCBA, 20 Total Hours and more; CASE §0). **2026-11-24 afternoon (Ruling B):** these are existing records, so the first sync of them happens in phase two, after their review (D19); phase one creates new records only.
13. **Testing chat:** rewrite matrix rows B5, C10, C12, C13, C15, C16, C19, C24, C26, C27, C28, C31 and C36 for the new expected values; update the two sandbox scripts in item 1; rewrite the four KQL files with item 13.
14. **Production Case workflow trigger (Zeke, CF §1.2):** the Case sync workflow triggers on `care_coordinator_first_name`, `care_coordinator_last_name` and `coordinator_export_status`, not `hubspot_owner_id` (item 6).

**Data fixes (Zeke / United Care, before go-live; not code):**

15. **Set `lba_licensure__ny` = `Grad Permit`** on Dominique Plummer `45994302542` and Katie Vangraefschepe `61130820723` (GP §8.2, §9). **Pre-go-live task for Zeke / United Care (decided 2026-11-23, final).** Dijana Dujmovic `65705947956`, named in the earlier draft, is not on the list: her values were cleared by hand and GP §9 treats her as not a holder (open question 6, closed by the production check of 2026-11-24: not a holder). Without the fix, 4 Cases get no Grad Permit marker, and on Case `50096197801` 131308 overwrites "Amanda Beckerman BCBA LBA" with the holder's own name.
16. **10 Grad Permit holders have no 151 link** (GP §8.2). Their Cases get the marker but no Supervising BCBA from the integration (131308 is left out) until United Care adds the "Grad Permit Supervisor" link.
17. **4 Cases keep a stale 135 label** after the removal date (GP §4.3). 3 have an 82, which wins; 1 would send the stale outgoing name. Remove the label.

**Production gating (Zeke, 2026-11-23, fourth set):**

18. **The two segments per workflow, mapped onto the code.** Zeke: "For each workflow that will be pushed into production, we will create a two segments that will gate — for creates: central reach creates only — For updates: central reach updates only — anything not on those segments will not be created or updated until outstanding items are confirmed from united care. * this handles the The remaining risk is duplicates at cutover, not visibility."

    **a. Finding (read-only, `src/` at `655b385`): a segment on a workflow gates only that workflow's webhook. The record gate is what covers the other paths, and it is read on every one.** No CentralReach call is made before it: the worker takes the record lock, reads the record from HubSpot and the link record from Cosmos, then decides.

    | Path that can reach CentralReach | Gated by Zeke's workflow segment? | Record gate (`SYNC_RECORD_GATE_PROPERTY`) |
    |---|---|---|
    | Case / BCBA / BT/RBT webhook → queue → worker | Yes (enrolment) | Yes. The webhook only queues the ID (`src/functions/hubspotWebhook.mjs:119-158`). Case worker: gate property added to the read (`src/workflows/clientSyncWorkflow.mjs:320-324`), a missing key is a failed read (`:349-356`), decision and skip before any CR call (`:358-381`). Employee worker: `src/workflows/employeeSyncWorkflow.mjs:373-381`, `:486-492`, `:502-527`. Rule: `src/lib/syncEligibility.mjs:41-43`, checked first, linked or not |
    | Contact webhook → fan-out → every associated Case (corrected 2026-11-24, recency audit: the Contact workflow (O-21) is NOT closed. It is superseded for the Guardian fields (Case property-sync fields, guide note 11/09) and the BCBA personal email (decision 50); pending Zeke's confirmation that no separate Contact workflow is needed.) | **No.** The fan-out reads only the Contact's `test_record` (`src/workflows/contactFanOutWorkflow.mjs:86-105`) and queues every Case on the Contact (`:108-131`) | Yes, per Case, in the Case worker (as above). Without the checkbox, an edit to a Guardian Contact would update a linked Case that is in neither segment |
    | Poller (hourly; 5 minutes in Stage 8). Picks up linked records and Entered = Yes records by `hs_lastmodifieddate` | **No** | Yes, twice: every search carries "gate = true" (`src/workflows/intakePollerWorkflow.mjs:110-116`, `:197-208`), and the worker checks again |
    | Linked recheck | n/a | Removed in Stage 3: no sender uses it (`src/functions/processClientQueue.mjs:22-24`; test `stage3Poller.test.mjs:492`). A leftover message with that source still goes through the worker gate |
    | Daily sweep (first run at or after 08:00 UTC; every linked record and every unlinked `waiting` record) | **No** | Yes, twice: both branches carry the gate filter (`intakePollerWorkflow.mjs:353-365`); the worker checks again |
    | Retries (60 s, 300 s, …) and Service Bus redelivery | **No** | Yes. A retry is the same message scheduled again (`src/lib/queueRetry.mjs:66-80`); the worker reads the record and the gate again on every run. A record that fails before the gate is checked gets no HubSpot write (`clientSyncWorkflow.mjs:943`, `employeeSyncWorkflow.mjs:1372`) |
    | HTTP test functions | No | `intake-poller-test` runs the same poller (`src/functions/intakePollerHttpTest.mjs:25`); `client-sync-test` answers 501 and calls nothing (`src/functions/clientSyncHttpTest.mjs:30-37`) |

    **Superseded 2026-11-23 (fifth set): Option 1 (one workflow-kept checkbox, `sync_to_centralreach`) is withdrawn.** The gate review found it fragile:
    - the "gate on / gate off" workflows must re-enrol every time a record leaves and re-joins a segment (a second leave was missed);
    - between a record leaving a segment and "gate off" running, the box stays true and the poller can still pick the record up;
    - at the create-to-update hand-off the record leaves one segment before it joins the other, so the box can flap;
    - the hold list had to be taken before the gate was turned on, or existing records went straight into the segments;
    - criteria-built segments miss records that are in CentralReach but whose Entered value was never Yes.

    **b. Recommended: Option 2, two gate checkboxes per object, read directly by the code. Build item 24.**

    - Two properties on each of the Case, the BCBA and the BT/RBT, same internal names on all three:

      | Internal name | Label (Zeke's wording) | Meaning |
      |---|---|---|
      | `centralreach_creates_only` | CentralReach creates only | true → the integration may **create** this record in CentralReach |
      | `centralreach_updates_only` | CentralReach updates only | true → the integration may **update** this record's linked CentralReach record |

    - **Each property is its segment.** Segment "CentralReach creates only" = `centralreach_creates_only` is true. Segment "CentralReach updates only" = `centralreach_updates_only` is true. No other criteria. No workflow keeps a copy of either value, so nothing can lag, flap or miss a re-enrolment.
    - **The code reads the two properties itself, on every path** (webhook, Contact fan-out, poller, daily sweep, retries; table in a):
      - HubSpot CR ID blank (Case `client_id_number`; BCBA and BT/RBT `employee_id`) → the **create path** → allowed only when `centralreach_creates_only` is true;
      - HubSpot CR ID filled → the **update path** → allowed only when `centralreach_updates_only` is true;
      - otherwise `skipped`, reason `record_gate`, no CentralReach call and no HubSpot write, as today.
    - **A record in neither segment** (both blank or false) gets no create and no update on any path. That is every existing record at cutover: nothing has to be listed or excluded for the gate to hold.
    - **The path follows the HubSpot CR ID, not the link record.** A record the integration created but whose CR ID write-back to HubSpot failed is linked only in Cosmos (`clientSyncWorkflow.mjs:341-344`, `employeeSyncWorkflow.mjs:495-499`). It is still finishing its own create, so it stays on the create gate; its next run writes the CR ID to HubSpot. This also matches what a HubSpot segment and the poller search can see.
    - **Sandbox: unchanged.** The single gate stays `sandbox_test_field` (`SYNC_RECORD_GATE_PROPERTY = sandbox_test_field`, lists 1463, 1464, 1465). Zeke: "In sandbox, everything is gated with the the testing sandbox property. In production this will be updated with the two segments based on the new prod properties I stated."
    - **Sandbox properties created 2026-11-23** (Zeke: "Two-property gate - create these in the sandbox please."), portal `52311591` only: `centralreach_creates_only` ("CentralReach creates only") and `centralreach_updates_only` ("CentralReach updates only"), single checkbox, on the Deal (`0-3`, group `deal_information`), the BCBA (`2-72890322`, group `bcba_information`) and the BT/RBT (`2-72890325`, group `bt_rbt_information`). Ticked on no record. **The deployed code (`655b385`) does not read them: it still gates on `sandbox_test_field` until item 24 ships** and the two app settings are set. No segment, workflow, app setting or `sandbox_test_field` value was changed. Nothing was written to production.

    **c. What Zeke builds in HubSpot production, per object** (same shape three times):

    | | Case (`0-3`) | BCBA (`2-48354212`) | BT/RBT (`2-48354559`) |
    |---|---|---|---|
    | Properties | `centralreach_creates_only` and `centralreach_updates_only`: single checkbox, no default value, not on any form | same | same |
    | Segment "CentralReach creates only" (active) | `centralreach_creates_only` is true | same | same |
    | Segment "CentralReach updates only" (active) | `centralreach_updates_only` is true | same | same |
    | Sync workflows (the webhook senders) | Enrolment filter: member of either segment. This saves queue messages only; the code gate is what protects CentralReach | same | same |
    | Workflow "creates" (decided 2026-11-24, one per object; see below) | Ticks `centralreach_creates_only` only on a Case created after the cutover date with Entered = Yes and `client_id_number` unknown | same, with `employee_id` unknown | same, with `employee_id` unknown |
    | Workflow "promote after create" (decided 2026-11-24, one per object; see below) | Trigger: `client_id_number` **changes** to known, and `centralreach_creates_only` is true, and `central_reach_link_to_client` is known (the integration's own write-back). Action: set `centralreach_updates_only` = true. Re-enrolment off | Trigger: `employee_id` changes to known, and `centralreach_creates_only` is true, and `central_reach_record_link` is known. Same action | as BCBA, with `central_reach_link_to_rt_rbt` |

    - **No hold list, no "gate on / gate off" workflows, no `sync_to_centralreach`.** D1's checkbox is not created.
    - **Decided 2026-11-24 (sixth set, recommendation 4).** Recommendation: "Creates and promote-after-create workflows: confirm both as drafted. Creates ticks only records created after cutover with Entered = Yes and no CR ID. Promote fires only on the integration's own CR ID write." **Zeke:** "Yes, all 7"
    - **Who ticks `centralreach_creates_only`:** the "creates" workflow, on records created after the cutover date with Entered = Yes and no CR ID (decided 2026-11-24). Existing records are not ticked by it; a person ticks them only after their review (D19). Was: a person (or a bulk edit), per guide line 271 ("In production the checkbox is set only on confirmed records").
    - **Duplicate path and its mitigation (gate review; decided 2026-11-24, was open question 20).** Ticking creates on a person who is already in CentralReach while their HubSpot CR ID is blank makes a duplicate (item 24, "Duplicate path"; a Case has no name check at all). So:
      - a "creates" workflow, one per object, ticks `centralreach_creates_only` only on records **created after the cutover date** with Entered = Yes and no CR ID. No bulk tick of older records;
      - records linked to CentralReach by email or name only get their `employee_id` / Client ID (`client_id_number`) written in the existing-records phase (D19) **before any tick**. They never get the creates box.
    - **Never tick `centralreach_updates_only` on an existing record before its review** (D19).
    - The Contact needs neither property: the Contact workflow only fans out, and each Case is gated on its own. (corrected 2026-11-24, recency audit: the Contact workflow (O-21) is NOT closed. It is superseded for the Guardian fields (Case property-sync fields, guide note 11/09) and the BCBA personal email (decision 50); pending Zeke's confirmation that no separate Contact workflow is needed.)

    **Does a record the integration creates need `centralreach_updates_only` = true to get later updates? Yes.** After the create, HubSpot holds the CR ID, so every later run is on the update path.
    - **Decided 2026-11-24 (sixth set, recommendation 4; Zeke: "Yes, all 7"): the "promote after create" workflow** above sets it automatically. It is a one-way, one-time step, not a copy of a segment: it never sets a box to false and never re-enrols.
    - **Why the trigger is "the CR ID changes to known", not "the CR ID is known":** a record that already holds a CR ID does not enrol when someone later ticks its creates box by mistake.
    - **It fires only when the integration wrote the CR ID (gate review; decided 2026-11-24, was open question 21).** It must not fire when staff type a CR ID by hand, on a Case or an employee. A hand-linked record is an existing CentralReach record: it goes to the existing-records review (D19) and gets its updates box there.
    - **The marker, checked in `src/`:** the integration writes the CR ID in one HubSpot write together with the record's CentralReach link property and nothing else (`linkProperties`: `clientSyncWorkflow.mjs:179-187`, `employeeSyncWorkflow.mjs:203-215`). So the third condition is "the link property is known". Staff who type a CR ID do not fill the link. **Cutover check (decided 2026-11-24, sixth set, recommendation 6; Zeke: "Yes, all 7"):** a read-only production check of the link properties' history confirms that nothing but the integration fills them (a workflow, an import, staff). If something else does, the promote trigger needs another marker before it is turned on.
    - **The reviewer's two markers do not hold in `src/`:**
      - `integration_last_write` is known: it is written with every status, `waiting` and `error` included (`clientSyncWorkflow.mjs:189-200`, `employeeSyncWorkflow.mjs:226-231`). An employee found by Workday ID ends `waiting`, which is the record staff then link by hand. It is also still blank at the moment a first-run create writes the CR ID;
      - `last_sync_status` = `success`: it is written at the end of the run, after the CR ID. A create with a blank Workday ID ends `waiting` (`employeeSyncWorkflow.mjs:1138`). A create whose run needs a retry would be skipped on the update gate and never reach `success`.
    - **The hand-off window is safe.** The create run writes the CR ID to HubSpot straight after the create (`clientSyncWorkflow.mjs:745-760`; `employeeSyncWorkflow.mjs:691-712`) and finishes its own run (the gate was checked at the start). If a retry of that run arrives before the workflow has ticked the updates box, it is `skipped` (`record_gate`), with no CentralReach call. The workflow's tick moves `hs_lastmodifieddate`, so the next poll (hourly) queues the record and the run finishes the labels and fields. A second create cannot happen: the record holds its CR ID.
    - **By hand instead** (not chosen): every created record waits, half-finished if its labels were pending, until someone ticks the box.
    - **Hand-linked records (changed by the gate review):** an employee in the creates segment who is found already in CentralReach ends `waiting`; staff link it by typing `employee_id` (guide line 269). With the link-property condition that typing does **not** fire the promote workflow. The record gets no update until its review in the existing-records phase (D19). Replaces the earlier assumption G33.
    - **Not chosen:** letting the code treat "creates box true and created by the integration" as update-allowed. It needs no workflow, but a record named "creates only" would then receive updates with its updates box blank, which is not what the two segments say.

    **d. App settings.**

    | Setting | Sandbox (unchanged) | Production (cutover) |
    |---|---|---|
    | `SYNC_RECORD_GATE_PROPERTY` | `sandbox_test_field` | not set (not read when both settings below are set); never `none` |
    | `SYNC_CREATE_GATE_PROPERTY` (new) | not set → the create path uses `SYNC_RECORD_GATE_PROPERTY` | `centralreach_creates_only` |
    | `SYNC_UPDATE_GATE_PROPERTY` (new) | not set → the update path uses `SYNC_RECORD_GATE_PROPERTY` | `centralreach_updates_only` |

    One rule: each path has one gate property; a path setting that is not set falls back to `SYNC_RECORD_GATE_PROPERTY`. The rest of the cutover settings are unchanged: `HUBSPOT_PORTAL_ID` = `50317927`; `INCLUDE_TEST_RECORDS` absent or `false`; `INTAKE_POLLER_SCHEDULE` removed (hourly again); the two object type settings equal to the production table or removed; the production token and webhook secret entered by Zeke; `HUBSPOT_WEBHOOK_URI` = the production `/api/hubspot-webhook` URL. `ALLOW_EMPLOYEE_CREATE` = `true` and `PUT_ONLY_MODE` = `false` only when employee creates go live (`src/lib/config.mjs:187-194`). The rest as BUILD-PLAN 9.7.

    **e. Code change: item 24** (section B). Item 14 (the production guard) is widened by it. Item 18 stays tests only.

    **f. Fail closed.** Every case ends with no CentralReach call:

    | Case | What happens |
    |---|---|
    | The value is blank or `false` | `skipped`, reason `record_gate`; no HubSpot write |
    | The property does not exist in the portal (HubSpot leaves the key out of its answer) | The worker treats a missing gate key as a failed read (`clientSyncWorkflow.mjs:349-356`, `employeeSyncWorkflow.mjs:486-492`): no decision, no HubSpot write, retried, then dead-lettered with the alert. Item 24 requires **both** keys on every run, whichever path the record is on. The poller and sweep search fails on the unknown property, so nothing is queued and the checkpoint stays |
    | A production setting is missing, is `none`, or is not the exact name for its path (swapped or misspelt) | Invalid configuration (item 14 as widened; exact names decided 2026-11-24, sixth set, recommendation 3): every worker and poller run fails and alerts, before any HubSpot or CentralReach call |
    | The CR ID or the link record cannot be read | A failed read, as today; nothing is decided. **Superseded for a HubSpot Case answer that lacks the CR ID key (O-57; Zeke, 2026-11-24 afternoon: "7. Keep the behavior"):** that run stays today's decided, visible `error` (`HUBSPOT_PROPERTY_MISSING`, with a HubSpot write; wave 2 fix D-R1). Still no CentralReach call. A link record that cannot be read stays a failed read |

    **g. Sandbox proof (for the testing chat; the matrix itself is not edited here).** The two properties exist in the sandbox (b). After item 24 is deployed, the rounds below need the two app settings set in the sandbox Function App for their duration (`SYNC_CREATE_GATE_PROPERTY` = `centralreach_creates_only`, `SYNC_UPDATE_GATE_PROPERTY` = `centralreach_updates_only`): an Azure write, on Zeke's go-ahead, and removed again afterwards. While they are set, the code does not read `sandbox_test_field`; only hand-ticked test records can pass, and the sandbox webhook segments still filter on `sandbox_test_field`. Every test record keeps `sandbox_test_field` = true throughout, which also shows that the old box alone no longer opens a path. Every row checks the `Sync run summary.` line (now with `gate: create` or `gate: update` on a skip) and a read-only CR GET of the named record.

    **Decided 2026-11-24 (sixth set, recommendation 5).** Recommendation: "Live gate test set: approve the minimal set (BR4-C, BR4-CU, BR4-UC, BR4-X, BR4-U+L, then BR4). The two temporary Function App settings are an Azure write, asked again at that step." **Zeke:** "Yes, all 7"

    **Minimal live set (gate review; decided 2026-11-24), in this order:** BR4-C → BR4-CU (its tick-then-poll update also proves the poller) → BR4-UC → BR4-X steps 1 and 2 → BR4-U+L → the two settings removed → BR4. Setting and removing the two settings is an Azure write: **stop and get Zeke's go-ahead at that step**, both times. BR4-CU and BR4-X step 1 need the poller, which is off in the sandbox (`AzureWebJobs.intakePoller.Disabled` = `true`); turning it on is also an Azure write, on Zeke's word. Zeke (2026-11-24): "Note that we will turn the Poller on when our changes are implemented and we are ready to test again."

    **Pre-check before BR4-C:** confirm (read-only; the setting name only, or a non-secret value) whether `ALLOW_EMPLOYEE_CREATE` is on for the sandbox (BR4-C is an employee create).

    **Offline only (item 24 tests), no live round:** the Case create gate (a live one costs a production CR client), retries (BR4-R), the Cosmos-only link, BR4-X step 3 (the sweep).

    | Row | Requirement | Set-up | Expected |
    |---|---|---|---|
    | BR4 (unchanged; last in the live set) | Sandbox gate, `sandbox_test_field` | As today, with the two settings **not** set. Run once more after the settings are removed | `skipped` for a record without the box; no CR contact. Proves the sandbox is unchanged by item 24 |
    | BR4-C (new) | Create path needs the creates box | Test BT/RBT A: Entered = Yes, no `employee_id`, creates = true, updates blank | One create; `employee_id` written back |
    | BR4-CU (new) | The creates box does not allow an update | BT/RBT A straight after BR4-C, updates still blank (promote workflow not built, or off): edit one mapped field | `skipped`, `record_gate`, `gate: update`; no CR call; CR GET unchanged. Then tick updates and wait for the next poll (no edit, no webhook) → the poller queues it; one update, no create. This also proves the poller's update-gate branch |
    | BR4-U+L (new; one combined row) | Update path needs the updates box; leaving the segment stops it | Linked test Case B: updates = true, creates blank. Edit one mapped field. Then untick updates and edit a mapped field again | First edit: one update. Second edit: `skipped`, `gate: update`; CR GET unchanged. No wait for any workflow |
    | BR4-UC (new) | The updates box does not allow a create | Test BT/RBT C: Entered = Yes, no `employee_id`, updates = true, creates blank | `skipped`, `record_gate`, `gate: create`; no CR lookup, no create |
    | BR4-X (rewritten) | **Control: a record in neither segment → no CR call on any path** | Linked test Case D and unlinked test BT/RBT E (Entered = Yes), both boxes blank, `sandbox_test_field` = true. Then: (1) edit a mapped field on each (webhook, and the next poll); (2) edit Case D's Guardian Contact `firstname` (corrected 2026-11-24, recency audit: `guardian_first_name` changes on the Case; the Case workflow sends the webhook; no Contact webhook or fan-out is needed, G-5); (3) offline only, not in the live set: the 08:00 UTC sweep | (1) webhook runs end `skipped`, `record_gate`; the poller summary does not queue D or E. (2) the Case run ends `skipped`, `record_gate`, `crCalls` empty, no HubSpot write. (3) the sweep summary does not queue them. CR GET of D's client unchanged; no CR employee for E |
    | BR4-P (not in the minimal set; only if the promote workflow is built in the sandbox) | Promote after create, and not after a hand link | Repeat BR4-C on a new record F with the workflow on. Then type a CR ID by hand on a record G with creates = true | F: one create; updates turns true; the next run is a noop or one update. Never two creates. G: updates stays blank |
    | BR4-R (offline only) | The gate turns false between a run and its retry | Item 24 tests | The retry is skipped; no CR call |
    | Case create gate (offline only) | A Case with no `client_id_number` needs the creates box | Item 24 `decide` table | Allowed only when creates is true |
    | Cosmos-only link (offline only) | CR ID in Cosmos, blank in HubSpot → the create gate | Item 24 tests | Creates true: the run goes on and writes the CR ID. Creates blank: `skipped` |
    | BR7 (unchanged) | `test_record` = true | As today; the gate box for the record's path stays true and is checked first | `skipped`, reason `test_record` |

19. **Existing records are a separate phase.** Zeke: "We will confirm any data discrepancies after our testing in sanbox testing is completed in full. Any already created recrods in hubspot in central reach will be handled as a separate phase where we will review then update existing hubspot central reach records."
    - **Ruling B (Zeke, 2026-11-24 afternoon):** "Production will push in two phases: 1. Create records only. 2. Review of existing records in HubSpot against the existing records in CentralReach. It is needed to make the existing records in CentralReach reflect HubSpot. Any production discrepancies found between HubSpot and CentralReach are a phase two production build."
    - **Orchestrator's reading (a reading, not his words):** phase one = new records through the creates gate, plus later updates of records the integration itself created (the promote-after-create workflow, D18 c, confirmed 2026-11-24). Phase two = every existing record, and any code a discrepancy needs. Phase two holds: the 181 BT/RBTs and 11 BCBAs in CentralReach by email or name only; the 4,654 BT/RBTs with no type; the NM/VA BCBAs (item 11); the 2 CO Cases CentralReach shows with " BCBA" (item 9 rule 5); the 69 hand-entered 138851 values (item 6, D12); label NY Medicaid `1107647` (below).
    - Cutover syncs only the records in the two segments. Records already in HubSpot and CentralReach stay out of both: their two gate properties are blank, so no create and no update on any path (D18 b). No hold list is needed to enforce this.
    - **The cutover hold (Zeke, 2026-11-23): "yes we will review the data in hubspot vs central based on the required properties, what mismatches - please note this for production."** Before any existing record is ticked into either segment:
      1. compare the HubSpot record with its CentralReach record on the required properties (the create fields of guide line 321, and the identifiers: CR ID, External System ID / Workday ID);
      2. list the mismatches;
      3. United Care confirms or corrects them;
      4. only then tick `centralreach_updates_only` (a record with a CR ID), batch by batch.
    - **For a BCBA, also check label NY Medicaid `1107647`** (open question 8, recommended 2026-11-24): if CR holds it and HubSpot `ny_insurance_labels` lacks "MCD FFS-NY", the first update removes it (the label is managed). United Care confirms which side is right before the tick.
    - This review is the separate existing-records phase (phase two, Ruling B), not part of cutover. How the comparison is run (a CentralReach export or the API) is still pending (D3). Its CR call cost counts against the budget (section H).
    - An existing person with no CR ID in HubSpot (the 181 BT/RBTs and 11 BCBAs that are in CentralReach by email or name only) must be linked first by writing `employee_id` (D6). Ticking the creates box on one of them would create a duplicate. The same holds for a Case whose client is in CentralReach with `client_id_number` blank: write the Client ID first (a Case has no name check at all).
    - Data discrepancies (D3, D6, D12, D15 to D17, the 5 malformed Workday IDs of item 15, owner Zeke, D20) are confirmed after sandbox testing is complete, not before.
    - The later phase: review, then update the existing records, batch by batch (BUILD-PLAN 9.8 step 3). A record enters it by leaving the hold.
    - This answers open question 1 for the build: no hard block in code is needed; the gate checkbox is the block.

**Workday IDs (Zeke, 2026-11-24):**

20. **Fix the 5 malformed production Workday IDs and get Sara's final word on the 7-digit rule (O-8, item 15). Owner: Zeke.** Zeke: "I will handle this." Until a record is fixed, its runs end `error` with no CR call (item 15). If Sara's rule is not 7 digits, `workdayIdIsValid` is a one-line change.

---

## E. Open questions for Zeke

1. **Q7 (Case).** Zeke: "Before cut over we will list differences, assuming that we will gate existing CentralReach record updates, only newly created employees will be handled in this scenario". Does this need code? As built:
   - The gate checkbox (D1) already blocks a record: not ticked → no create and no update. If the production segment ticks **only new records**, no code change is needed.
   - The code has **no rule of its own** that blocks an update to a CR record it did not create. A ticked record that already holds `employee_id` or `client_id_number` is updated.
   - A ticked new record whose person is already in CR: found by Workday ID → `waiting`, no write; found by nothing the API user can see → a duplicate create (D5).
   - **Answered for the build (2026-11-23, fourth and fifth sets; D18, D19):** the two gate properties are the block (a record with both blank gets no create and no update), and existing records are a separate phase. No hard block in code. The quote covers "each workflow", so Cases and employees alike (assumption G24).
   - Earlier wording of the question: is "do not tick existing records" enough, or does Zeke want a hard block in code (update only a contact the integration created; the link record already stores `ownCreate`, `employeeSyncWorkflow.mjs:690-697`, `clientSyncWorkflow.mjs:751`)? And does the quote cover Cases, or employees only?
2. **O-10.** Guide line 333 says the production BCBA `date_of_birth` will be "the same property sync"; it was created as plain text and is blank on all 375. Who fills it, and from where? **Answered (Zeke, 2026-11-24):** "we are filling in this date with the placeholder value that we are currently using." The placeholder is `2000-01-01` (`src/constants/centralReach.mjs:9`). No change to item 1 (assumption G54).
3. **C36.** Answered: Other with blank text sends "Other" (item 2).
4. **C24 (I).** Answered: structured fields, and the state falls back to the Case `location` when `stateregion` is blank ("use hte fall back"; item 5).
5. **C10 (K).** Answered (CF §9.5): 138851 is client-only and holds a name; no CR employee field exists (D8).
6. **C12 / C13.** Settled by GP §8: the holder test is `lba_licensure__ny` = `Grad Permit` (guide line 504's "reliable check"), not the supplier comparison (item 9). The data fix in D15 is the remaining dependency (GP §8.6). Dijana Dujmovic: **settled by the data (production check 2026-11-24, read-only; a finding, not Zeke's decision): not a holder**, as assumption G17 and D15 already treat her. BCBA `65705947956` and BT/RBT `65210797198`, both on Contact `258967565484`. User 92992146 set `grad_permit_status` = Grad Permit on 11-04 19:27; a workflow then set `lba_licensure__ny` = Grad Permit and `ny_bcba_a_grad_permit_holder` = Yes; user 87217091 cleared `grad_permit_status` and `lba_licensure__ny` by hand on 11-16. Still set: `ny_bcba_a_grad_permit_holder` = Yes and `applicant_grad_permit_bcba` = Yes (neither is read). The BCBA record has 0 associations to Cases, BCBAs or BT/RBTs; the BT/RBT record is an RBT recruit (Potential BT 1 on Cases `55478526541` and `63925240191`). No CentralReach employee named Dijana or Dujmovic among the 1,581 visible. No build change. Optional cleanup for United Care: the two leftover flags. Closed.
7. **CF §6 extras:** Maladaptive (item 17) is dropped from today; the current mapping stays. Still open: Address 2 sent as `null` when it holds only commas or a state name (`buildClientMetadata.mjs:163-167`). Build it under "match CentralReach", or leave? **Checked in production 2026-11-24 (read-only; findings in item 5, "Address 2 junk"):** 5 of the 25 More Than One Location Cases hold `",  , New York "`, none with a CR ID. **Recommendation, awaiting Zeke's word:** send `null` when the value, with commas removed and spaces collapsed, is empty or one state name or code (item 5 has the rule and tests). Small, and it stops a state name landing in Address 2 for new clients. **Closed 2026-11-24 afternoon (seventh set, decision 1).** Zeke: "1 . Based on production reads in HubSpot and CentralReach, is this recommended?" The orchestrator answered yes from the production reads above and applied it under his closing sentence ("On the remaining open items, apply your recommendation."): build the rule (item 5).
8. **A-13.** One BCBA holds NY Medicaid in CR only and would lose it (the label is managed). Acceptable? **Checked in production 2026-11-24 (read-only; a finding, not Zeke's decision). Recommendation: keep BL5 as built, no build change, and add a check of label `1107647` to the existing-records review (D19).** Evidence: NY Medicaid `1107647` is sent when `ny_insurance_labels` includes "MCD FFS-NY" and is in `BCBA_MANAGED_LABEL_IDS` (`buildEmployeePayload.mjs`); a BCBA found by Workday ID ends `waiting` with no write (`employeeSyncWorkflow.mjs:858-873`), and production has 0 linked BCBAs, so nothing can lose the label at cutover; HubSpot lacks MCD FFS-NY on 299 of 375 BCBAs; the 15 BCBAs most likely to hold it in CR only were read and none holds `1107647`; the earlier "1 of 13" case was not identified.
9. **O-8.** Answered for the build: item 15 ships today ("Ship now with a note we are pending final confirmation on the workday id"). Still open, not blocking: who fixes the 5 malformed production records, and Sara's final word on the 7-digit rule. **Closed as a question (Zeke, 2026-11-24):** owner Zeke, "I will handle this." Kept as his task, D20.
10. **O-27.** Removed on Zeke's word 2026-11-24 ("Irrelevant. Remove from the doc"); see section C. Number kept.
11. **Deploy order.** Replaced by "Ship today (in order)" at the top.
12. **Allergies (item 3, CF question 9).** PENDING record-level check ("Confirm based on the data please."). Not a question for Zeke unless the records do not settle it. **Closed 2026-11-24 afternoon (seventh set, decision 5):** un-held under Zeke's closing sentence, with CF §11.1's `Confirmed` + "NA" → `Yes` (item 3).
13. **Severity (item 8, CF question 8).** PENDING record-level check ("confirm with a record in hubspot and then see"). Zeke sees the result before it is built. **Closed 2026-11-24 afternoon (seventh set, decision 5):** un-held under Zeke's closing sentence; CF §10 is the result (item 8).
14. **Sandbox coordinator workflows (item 6, CF question 7).** Change the Case workflow `TYPE` to `0-3` and turn re-enrolment on in both? **Answered (Zeke, 2026-11-24):** "turned on and functioning." The sandbox coordinator workflows are on and working, per Zeke (not re-read here). Closed; C10 no longer waits on it (item 6).
15. **B21.** Answered: build Route A; never clears (stricter than the employee rule, row 3.13). The O-35 round (R1-U2) is now the sandbox proof only; it is still a CR write on a test client.
16. **Item 2: the internal name.** Answered: `referral_other` (sandbox; production uses the same name).

**Still open after the final decisions (the guide and `src/` do not settle them):**

17. **Item 13** (one JSON line per log call). Item 12 is answered: "Yes please implement the label fix." (ships today, step 8). Item 13 is left as "recommended, awaiting Zeke's word" and "can follow". Build it?
18. **Item 9, the " BCBA LBA" suffix.** Answered (Zeke: "Refer to the requirements doc and then what we found on the portal reads"; CF §12.6): always " BCBA LBA", the typed-supplier fallback included; no licence property is read for the suffix. The typed-supplier rule's basis is guide insert E, whose text Zeke approved 2026-11-24 ("Yes, all 7"; item 9 rule 5).
19. **Item 5, the core StateProvince.** Answered (Zeke: "confirmed"): `stateregion`, else `location`, else omit, for the core StateProvince and line 2 of Meta 137697; an unreadable `stateregion` falls back to `location` with a warning (item 5).

**Production gating (D18; the guide, `src/` and the sandbox do not settle them):**

Questions 20 to 22 of the fourth set (the hold segment, the segment criteria, the Contact workflow) are closed by Option 2: a segment is "property is true", there is no hold list, and the Contact workflow needs no segment (each Case is gated in the Case worker, D18 a). (corrected 2026-11-24, recency audit: the Contact workflow (O-21) is NOT closed. It is superseded for the Guardian fields (Case property-sync fields, guide note 11/09) and the BCBA personal email (decision 50); pending Zeke's confirmation that no separate Contact workflow is needed.)

**Questions on Option 2: all closed 2026-11-24** (sixth set; Zeke: "Yes, all 7"). Kept with their numbers:

20. **Who ticks `centralreach_creates_only` on a record created after cutover?** **Closed, decided 2026-11-24 (recommendation 4):** the "creates" workflow, only on records created after the cutover date with Entered = Yes and no CR ID; never a bulk tick of older records (D18 c). Was: a person, per record or by bulk edit (guide line 271), or the workflow.
21. **Build the "promote after create" workflow, or tick the updates box by hand?** **Closed, decided 2026-11-24 (recommendation 4):** the workflow; it fires only on the integration's own CR ID write (the link property is known), not when staff type one; hand-linked records go to the existing-records review (D18 c). The sub-question (does anything else in production fill `central_reach_link_to_client`, `central_reach_record_link` or `central_reach_link_to_rt_rbt`?) is **no longer a question for Zeke**: it is answered by the read-only link-property history check at cutover (recommendation 6; "Before deploy, Zeke confirms" item 2). If something else fills them, the marker needs another property.
22. **Sandbox proof of the two gates.** **Closed, decided 2026-11-24 (recommendation 5):** the minimal live set in D18 g (BR4-C, BR4-CU, BR4-UC, BR4-X steps 1-2, BR4-U+L, then BR4), the rest offline. Setting and removing the two temporary Function App settings is an Azure write, asked again at that step.
23. **The production guard requires the exact two property names** (item 14 as widened; D18 f). **Closed, decided 2026-11-24 (recommendation 3):** yes; any other setting value in production fails and alerts (item 14, item 24).

**~~Open (2026-11-24)~~ Closed 2026-11-24 afternoon (seventh set); numbers kept:**

24. **New post-cutover records and United Care's outstanding items** (assumption G51). The "creates" workflow opens creates for new records created after cutover before United Care confirms its outstanding items. Recommendation: the workflow triggers on Entered = Yes, with "created after the cutover date" as a filter, so a record whose Entered becomes Yes later is still picked up; and Zeke confirms that new post-cutover records need no further hold. Does not block today's build (the workflow is built in HubSpot at cutover). **Closed by Zeke's closing sentence ("On the remaining open items, apply your recommendation."), applied by the orchestrator:** the recommendation as written; no further hold. Ruling B's phase one ("1. Create records only.") fits it (D18 c, D19).
25. **Item 6 today: omit 138851, or keep decision 39?** No quote of yours approves the omit (searched 2026-11-24). Today the code sends `care_coordinator_name` (filled on 2,530 production Cases) to 138851, so the first sync overwrites the CR value (69 hand-entered) and a blank clears a value the integration wrote. The omit sends nothing to 138851 until item 6 ships; CR keeps what it holds and new clients get no coordinator. **Recommendation: omit**, because you said the coordinator comes from the new workflow fields ("We will read the fields for this"), so sending the old property now would write a value that item 6 then replaces. Not built until you answer (item 6 has the change and tests either way). **Closed 2026-11-24 afternoon (seventh set, decision 2): not omitted.** Zeke: "2.Care Coordinator field 138851 - Please refer to the above -" (Ruling B repeated) "Sandbox testing: need to confirm fulfilling requirements is populated. We cut over to production. We will not be updating distance between targets in phase one." Applied by the orchestrator: the 69 hand-entered values are phase two; items 6 and 2 are built now for the sandbox proof; the production deploy waits for their properties ("Before deploy, Zeke confirms" item 1).
26. **A Case with two Supervising BCBAs (82), one a Grad Permit holder and one not** (item 9 rule 7). No production Case has two 82 BCBAs (CASE §1). **Recommendation:** leave 136052 and 131308 out (CR keeps its values) with a warning; all holders → their supervisors; no holder → rule 4. Built that way unless you say otherwise. **Closed 2026-11-24 afternoon (seventh set, decision 3).** Zeke: "3. Based on production reads in HubSpot and CentralReach, is this recommended? We're going on what's required." Applied by the orchestrator: yes; rule 7 as written, and the code is changed to match (item 9). The mixed case is proven offline only (the sandbox allows one Supervising BCBA per Case).
27. **Item 1: a BCBA update with a blank `date_of_birth`** (second review, 2026-11-24; HELD). Today's code (`keepUnwrittenCoreFields`) sends back the date CentralReach holds, or leaves `dateOfBirth` out when the employee read holds none; but an employee PUT clears a left-out field (BUILD-PLAN section 4), EMP §1 found the employee GET returns no date-of-birth key, and `date_of_birth` is blank on all 375 production BCBAs. **First:** one recorded read-only `GET /contacts/employee/5338681` (test employee): does `contact.dateOfBirth` come back, and in what shape. **Then your word on the rule.** Options:
    - (a) the GET returns `contact.dateOfBirth`: send it back (today's code); an absent key is a failed read, no PUT (as B21);
    - (b) the GET never returns it, leave the key out: CentralReach may clear the date on every BCBA update (R1-U2 shows it on the screen);
    - (c) the GET never returns it, send the placeholder 2000-01-01 on an update when HubSpot is blank: departs from guide line 333 ("an update never sends the placeholder") and overwrites a real CR date;
    - (d) the GET never returns it, treat it as a failed read: no BCBA update can run.
    **Recommendation:** (a) if the GET returns the key. If it does not, none of (b) to (d) is safe without R1-U2 showing what the PUT does; decide after that round. The create half and the `date_of_birth` read are not held. **Read done (testing chat, 2026-11-24, 2 CR calls: 1 token, 1 GET of test employee 5338681; key names and shapes only):** HTTP 200, `contact.contactId` equals the requested ID, and `contact.dateOfBirth` IS returned: a 28-character ISO date-time, the same shape as the client read. All other core employee keys are present too (`gender`, `primaryEmail`, `phoneCell`, `addressLine1`, `addressLine2`, `city`, `stateProvince`, `zipPostalCode`, `externalSystemId`). So EMP §1's "no date-of-birth key" does not hold for an employee whose date is filled; an employee with a blank date was not read (the create always sends a date, the placeholder at least). **Recommended, needs Zeke's word: option (a)**, with the send-back rebuilt as `YYYY-MM-DDT00:00:00.000Z` from the first 10 characters, as in B21. **Closed 2026-11-24 afternoon (seventh set, decision 4): option (a), BCBA and BT/RBT.** Zeke: "4. This is Phase I versus Phase II production. Phase I: we will only be creating records from HubSpot into CentralReach that are new in CentralReach. Therefore, we will always need these records to contain the placeholder value until it clarifies how they handle this." Applied by the orchestrator: the placeholder stays on a create; never sent on an update (item 1).

**Added and closed 2026-11-24 afternoon (seventh set; from BUILD-PLAN O-57 to O-59 and the requirements review):**

28. **O-57, a HubSpot Case answer without the CR ID key.** Code: a decided `error` with a HubSpot write; package D18 f: a failed read. **Zeke:** "7. Keep the behavior". Today's visible `error` stays; D18 f's wording for this case is superseded.
29. **O-58, a blank typed supplier with no BCBA in a supervising role.** Applied under Zeke's closing sentence: sends nothing, as approved insert E says; 131308 left out, not cleared (item 9 rule 5).
30. **O-59, the whole-address-in-street rule.** Applied under Zeke's closing sentence: split only when a state comes before the ZIP (item 5).
31. **Item 10's rules as a whole** (master question 10). **Zeke:** "9. these rules are rig" (read as "right"). Confirmed (item 10).
32. **The other open questions of the requirements review** (`requirements-review-2026-11-24/00-MASTER.md` section 9, questions 10 to 38). Covered by Zeke's closing sentence ("On the remaining open items, apply your recommendation."): each is decided as its recommendation there (question 10 is question 31 above). **Except the step itself still needs Zeke's separate go-ahead at that step**, under his standing rules, where carrying out the recommendation means:
    - a **Google Doc write** (the exact text shown to Zeke first): 12 (the guide note), 15, 19, 29, 30, 31, 32, 33, 34, 35;
    - an **Azure write**: 11 (the D18 g gate settings), 26, 27, 28, 38 (the poller on);
    - a **CentralReach write** (the sandbox rounds write test records to the live CentralReach): 12 (the one measurement), 14, 16, 22, 23, 37, 38;
    - a **commit**: 20 (N3, when item 20 is built), and every build change.
    Not a write of those four, Zeke's own step: 13 (he checks the sandbox workflow), 21 (a message to United Care), 24 (the production sync workflows, built in HubSpot production at cutover; production is read-only to us). No step: 17, 18, 25, 36.

Question 27 ~~holds only item 1's update half~~ is closed. ~~Questions 7, 8 and 17 above are open and do not block today's build (7 and 8 carry a recommendation from the 2026-11-24 production check).~~ Questions 8 and 17 above stay open and do not block the build (8 carries a recommendation from the 2026-11-24 production check). Closed 2026-11-24 afternoon: 7, 12, 13, 24, 25, 26, 27, 28 to 32. Question 6 (Dijana) is closed by the data. Question 1 is answered for the build. Answered 2026-11-24: 2 (O-10), 9 (O-8, Zeke's task D20), 14. Removed 2026-11-24: 10 (O-27).

---

## F. Known, not in this package

| Gap | One line |
|---|---|
| Gap #21, O-35 | A client update sends `null` for a blank core field (`src/mappings/client/buildClientPayload.mjs:49-55`). A risk on updates; existing records are protected only by the gate checkbox (D1). Now item **B21** (section B): decided, Route A, ships today (step 6). |
| Gap #11 | Auth Period: guide line 363 says "written at midnight UTC"; the code sends `MM/DD/YYYY` text (`buildClientMetadata.mjs:23-27`). |
| Gap #17 | BL6: the credential labels are not built (guide lines 407-408; decision 25). |
| Gap #20 | T9: held. The BT/RBT sends no `personal_email` (O-51). |
| Gap #16 | Item 11, NM/VA state labels: deferred until the client starts work in those states (section B2). |

Gap numbers are `REMAINING-GAPS-2026-11-23.md` section B. Gap #11 is not the requirement B11 (BCBA Care Coordinator, D8).

---

## G. Assumptions (2026-11-23 update)

1. "Ship once the production properties exist" means a later deploy, not today's. Item 6 still ships today only as "omit 138851", and only on Zeke's word (open question 25). **Superseded 2026-11-24 afternoon (seventh set):** items 2 and 6 are built now and reach the sandbox; "once the production properties exist" now means the production deploy; no omit.
2. Item 15 ships as its own step today (step 7, before item 12 at step 8); it touches only the employee worker and does not depend on steps 1 to 6.
3. Item 15 keeps a fixed 7-digit rule in code, not a setting. "Pending final confirmation" is a note, not a switch.
4. The pre-deploy check is a read-only GET of the property definitions in production (allowed since 2026-11-20). This package ran none.
5. Zeke's "Yes these will be created" covers the three Case coordinator properties, the BCBA coordinator properties and the Case "Referral - Other" property. Only the Case ones gate items 2 and 6; the BCBA ones gate B11, which is not a build item (D8).
6. The production "Referral - Other" property will have the same internal name as the sandbox one.
7. Item 11 deferred means no code and no sandbox proof now; rows BL3 and TL2 keep today's behaviour (no label, `unmapped_work_state` warning).
8. B21 is built as "never clear a core client field", in Zeke's decided wording ("never clears"); it is stricter than the employee rule.
9. B21: the client PUT is assumed to behave like the employee PUT (a left-out field may be cleared). Route A is decided, so this only matters for a field the read does not hold.
10. B21: the guide sentence on intentional blanks is at line 1733 of the extract (the architecture tab), not line 69.
11. Guide line 385 is read as a HubSpot-side copy workflow only; nothing in the guide sends that field to CentralReach.


**Added with the final decisions (2026-11-23, third set):**

12. The recommendation table (15 items) is not in the repo. "Let's do your recommendations please" is applied only to the recommendations named in the orchestrator's brief; items 12 and 13 are left as they were (open question 17). **Statements that rest only on that table** (Zeke can confirm them once): (a) item 14, the production guard, ships today; (b) item 16, the BT/RBT date of birth read as text, ships today; (c) item 9, the holder test reads only `lba_licensure__ny`; (d) D1, the gate checkbox `sync_to_centralreach` (since superseded by the fifth set, D18); (e) B21, Route A, a blank core client field sends back CentralReach's value and never clears; (f) item 2, Referral = Other with blank text sends "Other"; (g) D15, the Grad Permit data fix is a pre-go-live task for Zeke / United Care; (h) G15, item 5 uses the structured service-address fields (CF §9.4). Not on the table: items 3 and 8 (own quotes), item 5's fallback ("use hte fall back"), item 15 (own quote), item 17 ("Yes to recommendation").
13. "use hte fall back" covers both places the question named: line 2 of Meta 137697 and the core client StateProvince (open question 19).
14. Superseded (Zeke, "confirmed"): the fallback applies when `stateregion` is blank **or unreadable**; an unreadable one adds a warning and no longer ends the run `error`. A `location` that is blank or not one readable state gives no state and no error (item 5).
15. "Item 5 ships today" also accepts the structured-field source (I, CF §9.4), since every recommendation was accepted.
16. "Grad Permit reads only `lba_licensure__ny`" is the holder test (rule 1, already so in GP §8.3). The suffix rule 5 is now "always ' BCBA LBA'" (CF §12.6), so no other licence property is read.
17. The Grad Permit data fix now names two BCBAs (Plummer, Vangraefschepe), per the brief and GP §9; Dujmovic is treated as not a holder.
18. B21 ships today as step 6, after the Case mapping steps and before item 15. The client read's field names come from one read-only GET on a sandbox test client by the testing chat; this package made no live call.
19. Items 3 and 8 do not gate the deploy: until the record-level check confirms them, the deployed mappings stay.
20. Table item 15 ("Send Danny the access message") needs no further action, because the API user is connected. The read-only verification, auto-connect and the dedicated API user remain cutover tasks (D5).
21. The production "Referral - Other" property is `referral_other`, the same internal name as the sandbox one (`SANDBOX-TESTING-HANDOFF.md`).

**Added with the production gating (2026-11-23, fourth set).** 22 to 27 are superseded by the fifth set (Option 2):

22. Segment criteria in D18 c are proposals, not Zeke's words. He named the two segments and their purpose only. "CR ID unknown" on creates and "CR ID known" on updates are needed to match the code's own split (`syncEligibility.mjs:50-52`).
23. The hold segment is a proposal (open question 20). "Until outstanding items are confirmed from united care" is read as: a record already in HubSpot at cutover with a CR ID or Entered = Yes stays out of both segments until confirmed.
24. "Each workflow" covers the Case, BCBA and BT/RBT sync workflows. The Contact workflow is assumed to need no segment (open question 22). (corrected 2026-11-24, recency audit: the Contact workflow (O-21) is NOT closed. It is superseded for the Guardian fields (Case property-sync fields, guide note 11/09) and the BCBA personal email (decision 50); pending Zeke's confirmation that no separate Contact workflow is needed.)
25. `sync_to_centralreach` stays the gate property (D1); Zeke's segment message does not rename it.
26. HubSpot workflows on deals and custom objects can enrol on segment membership and re-enrol when it changes. Not verified here; rows BR4, BR4-L and BR4-R prove it in the sandbox.
27. No production read was made: the HubSpot connector in this session is on the sandbox (`52311591`). Whether `sync_to_centralreach` and the segments exist in production is not verified. A sandbox property search on the Case (2026-11-23) did not find `sync_to_centralreach`; sandbox list 1463 is "`sandbox_test_field` = true" (the checkbox drives the list there; in production the segments drive the checkbox).
28. "The label fix" is item 12 as written: the 150 s wait only. Saving the hashes before the throw and a label-only retry are not included.
29. Item 12 ships as step 8, last, because it touches only `src/lib/retry.mjs` and depends on no other step.
30. "After our testing in sandbox is completed in full" means the discrepancy review does not block today's deploy; it blocks only the existing-record phase.

**Added with the two-property gate (2026-11-23, fifth set):**

31. The internal names are `centralreach_creates_only` and `centralreach_updates_only`, with the labels "CentralReach creates only" and "CentralReach updates only". The names are the orchestrator's proposal; the labels are Zeke's words. Zeke's go-ahead to create them in the sandbox is read as accepting the names.
32. "The new prod properties I stated" means the two gate properties (creates / updates), not the Care Coordinator and Referral properties. The earlier guide draft read it the other way.
33. Superseded by the gate review: the promote workflow must not fire when staff type a CR ID; a hand-linked record goes to the existing-records review (D18 c, open question 21).
34. The create or update path is decided by the HubSpot CR ID property, not by the Cosmos link record. A record linked only in Cosmos is the integration's own unfinished create (`clientSyncWorkflow.mjs:745-760`).
35. The skip reason stays `record_gate` for both gates, so the KQL files and the matrix keep working; the new log field `gate` tells them apart.
36. A value of `none` is not allowed in the two path settings on any portal. The only way to turn the gate off stays `SYNC_RECORD_GATE_PROPERTY = none` with neither path setting set, in the sandbox only.
37. Superseded by the gate review: in production the two settings must be the exact names `centralreach_creates_only` and `centralreach_updates_only`, each on its own path (open question 23, decided 2026-11-24).
38. Superseded 2026-11-24 (sixth set, recommendation 4): `centralreach_creates_only` is ticked by the "creates" workflow on records created after cutover with Entered = Yes and no CR ID; existing records by a person after their review (D19). Was: ticked by a person on confirmed records (guide line 271).
39. A HubSpot workflow on a Deal or custom object can trigger on "property value changed" with a second condition. Not verified in the sandbox; row BR4-P proves it if the workflow is built there.
40. HubSpot answers a CRM search that filters on a property that does not exist with an error, not an empty list. Not tested live; the offline poller test covers a failed search. If HubSpot returned an empty list instead, the result is still no queue message and no CentralReach call.
41. No production read was needed or made for this design. The sandbox connector confirmed portal `52311591` before the six sandbox properties were created; the names did not exist there before.
42. "Yes to all please" (items 19 to 23) accepts the reviewer's version of each item, as the orchestrator's brief states. Their timing follows the review: 19 and 20 before cutover, 21 and 22 before the existing-records phase.
43. The line numbers in item 24 are for `655b385`. Items built before it in the same deploy (14, B21) move some of them.

**Added with the gate review (2026-11-23):**

44. Superseded 2026-11-24 (sixth set; Zeke: "Yes, all 7"): the three gate-review recommendations (exact names in the guard, the promote workflow only on the integration's own write, the "creates" workflow limited to post-cutover records) are decided. None is built yet: the guard is in item 14 / item 24; the two workflows are Zeke's to build in HubSpot at cutover (D18 c).
45. Nobody and nothing but the integration fills the three CentralReach link properties (guide lines 346, 394, 421: "on the integration's write list"). Not verified in production yet: the read-only link-property history check at cutover verifies it (decided 2026-11-24, recommendation 6).
46. A HubSpot workflow evaluates "CR ID changed to known" after the whole write is saved, so the link property written in the same write counts as known. Not verified; row BR4-P proves it if the workflow is built in the sandbox.
47. "Created after the cutover date" uses the HubSpot create date of the Case, BCBA or BT/RBT record. The date itself is set at cutover.
48. An employee has no name or email check before a create, only the lookups by HubSpot record ID and Workday ID (`employeeSyncWorkflow.mjs:858-872`). The reviewer's text names the Case only.

**Added with the 2026-11-24 decisions (sixth set):**

49. "Yes, all 7" answers the seven recommendations exactly as quoted in the sixth set at the top; nothing beyond their text is read into it.
50. Item 24 ships in this deploy, with item 14, because the decided live gate test set (recommendation 5) needs it deployed. The earlier "may follow in the next deploy" is read as superseded by that; if item 24 slips, only the gate test set waits.
51. Assumption, still to confirm with Zeke (open question 24): the "creates" workflow opens creates for new records created after cutover with Entered = Yes and no CR ID, before United Care confirms its outstanding items. "Yes, all 7" approved the workflow as drafted; it is not read as accepting this trade-off. **Closed 2026-11-24 afternoon:** question 24 is decided as its recommendation under Zeke's closing sentence ("On the remaining open items, apply your recommendation."); no further hold for new post-cutover records.
52. The orchestrator's inference: recommendation 7 ("send after 1–4 are settled") is met, in that the decisions on 1 to 4 are made by the same answer. The guide write itself waits on Zeke's go-ahead for the final batch (shown to him 2026-11-24: 7 inserts, C2/E2 in the notes column, bullet 3 re-dated "11/24 — Zeke: how a record enters a segment."). The guide write (recommendation 1) is a separate step: the final batch is shown to Zeke before writing, and the package can be sent before that write.
53. The link-property history check (recommendation 6) is a read-only production HubSpot read, allowed without asking since 2026-11-20. It is run at cutover, before the promote workflow is turned on. This package ran none.

**Standing rule for every worker (Zeke, 2026-11-24):** "From now on, moving forward, always check the production portal for any fields or live example records so you can see the actual production values. You can check read-only. Same for CentralReach, and then sandbox list last." Read as: HubSpot production first, then CentralReach, then the sandbox last, all read-only.

**Added with Zeke's answers of 2026-11-24 (open questions 2, 9, 10, 14):**

54. Assumption, to confirm with Zeke: "the placeholder value that we are currently using" is the integration's create placeholder `2000-01-01` (`src/constants/centralReach.mjs:9`; guide line 333 "01/01/2000"), and "filling in this date" means the integration sends it on a BCBA create while HubSpot `date_of_birth` stays blank, as item 1 already does. If instead someone writes the placeholder into HubSpot `date_of_birth` itself, item 1 reads it as a real date: a create still sends 2000-01-01, but an update of a linked BCBA would then send 2000-01-01 when the value changes and could replace a real date in CentralReach. The package does not say which; the build is unchanged either way. **Confirmed (Zeke, 2026-11-24):** "Item 1 (BCBA date of birth): this needs to be created by the integration (the placeholder field). We are pending an answer from United Care on how they want this populated, but for now, we are populating this with the integration." So HubSpot `date_of_birth` is not filled by staff; the integration sends the placeholder. How United Care wants the field populated is pending their answer (owner: Zeke / United Care). **Production check 2026-11-24 (read-only):** BCBA `date_of_birth` (text, created 2026-11-21) is blank on all 375; `dob` is filled on 215, none equal to 2000-01-01. So the placeholder is not in HubSpot; only the integration sends it, on a create.
55. "Update and say, "I will handle this."" covers both parts of question 9: Zeke fixes (or has United Care fix) the 5 malformed Workday IDs, and Zeke gets Sara's final word on the 7-digit rule (D20). **Confirmed (Zeke, 2026-11-24):** "Item 5 correct".
56. "Irrelevant. Remove from the doc" removes only question 10 (the Salaried label on test client `5384589`). The section C row "O-27, B10" ("salaried is a label in central reach") stays; the code is unchanged.
57. "turned on and functioning" is read as: both sandbox coordinator workflows now have the Case `TYPE` `0-3` and re-enrolment on, as question 14 asked. Not re-read in the sandbox by this update.


**Added with the package review (2026-11-24):**

58. Line numbers added in this review are for `655b385`. The working tree already holds uncommitted build changes to `config.mjs`, `syncEligibility.mjs` and the three workflows (seen 2026-11-24), so the build chat's current lines differ.
59. B21's read sits inside `createOrUpdateClient` because all three update paths end there; the workflow keeps building the payload and the hashes from HubSpot data only.
60. B21: a core key missing from the client read is a failed read (rule 5.8), not a field left out, because the client PUT may clear a left-out field (O-35) and Zeke's rule is "never clears".
61. Item 9 rule 7 and item 15's reason sentence and code are the package's wording, not Zeke's. (2026-11-24 afternoon: rule 7 is applied by the orchestrator after Zeke asked "is this recommended?"; the wording is still the package's.)
62. Item 1: the BUILD-PLAN rule 5.7 text and guide line 333 decide the update case; Zeke's 2026-11-24 "Item 1" quote is about the create placeholder only. (2026-11-24 afternoon: option (a) decided, see G66.)
63. The production checks of 2026-11-24 (questions 6, 7, 8 and G54; HubSpot production 59 GET/search calls, CentralReach 20 calls) were run by another worker; their results are recorded here as given, not re-run.

**Added with Zeke's answers of 2026-11-24 afternoon (seventh set):**

64. The orchestrator's scoping of "On the remaining open items, apply your recommendation.": it covers the nine build decisions where Zeke gave no other answer (1, 3, 5, 6, 8), open question 24, and the requirements review master questions 10 to 38. Package questions 8 and 17 and H-Q1 to H-Q6 are not read as covered and stay open.
65. Ruling B's phase one is read as new records through the creates gate plus later updates of records the integration itself created (promote-after-create, D18 c). The orchestrator's reading, not Zeke's words (D19).
66. Decision 4: option (a) is the orchestrator's application of "we will always need these records to contain the placeholder value". It is read as: the placeholder stays on a create; it is never sent on an update; an update sends back CentralReach's date. It covers the BT/RBT because the code is shared.
67. "9. these rules are rig" is read as "these rules are right" (item 10).
68. "We will not be updating distance between targets in phase one." is not interpreted here beyond Ruling B (phase one creates new records only). If it names a field or a rule, the orchestrator confirms it with Zeke; no build item is changed for it.
69. "Sandbox testing: need to confirm fulfilling requirements is populated." is read as: the C10 and C36 sandbox rows must show the new fields populated in CentralReach (138851 from the workflow fields; 126222 with the "Referral - Other" text). This is why items 2 and 6 are built now.
70. Ruling A covers the four missing Case properties (`referral_other`, `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`) and the coordinator workflows. Zeke deploys them to production; the production deploy of the code waits for the read-only pre-deploy check to find them.
71. The O-58 omission goes through `omitFieldIdsFor` (the saved hash is kept, as rule 3), and item 5's O-59 test "a state directly before the ZIP" uses `readStateCode`. Both are the package's design for the applied recommendation, not Zeke's words.

---

## H. CR API budget (Core tier: 150,000 calls/month, $0.003 overage)

- **Zeke (2026-11-23):** "Also - please note this api tier they are on in central reach — API Tier: Core (150,000 calls/month, $0.003/call overage) — Ensure it". The message was cut off after "Ensure it". Read as: the integration and our testing stay within the tier.
- **Sources checked.** The guide has no CentralReach call limit, tier or per-second rate (grep "rate", "limit", "calls", "throttl", "429", "quota"); its only rate limit is HubSpot's 190 requests per 10 seconds (guide line 464). `src/` at `655b385`. App Insights, read-only. No CentralReach call was made for this section.
- **One CentralReach instance.** The sandbox HubSpot portal writes to United Care's live CentralReach (test clients and employees), so sandbox testing and research scripts spend the same 150,000 as production.

### H1. Calls per run, from the code

A "call" is one HTTP request. In-process retries count: a 429 or 5xx is tried up to 3 times (`src/lib/centralReachClient.mjs:323-327`, `src/lib/retry.mjs:225-274`). Every request is listed in the run's `crCalls` summary except the token request (`centralReachClient.mjs:279`).

| Run type | CR calls | Where |
|---|---|---|
| Skipped (gate, test record, stage, eligibility) | 0 | Decided before any CR call (D18 a) |
| Duplicate webhook (`SYNC_IN_PROGRESS`) | 0, then the retry at +60 s is usually a noop | The record lease is taken before any CR call (`employeeSyncWorkflow.mjs:452-459`; the Case worker the same) |
| Case noop (nothing mapped changed, last run clean) | **0** | Returns before the lookup (`clientSyncWorkflow.mjs:588-621`; lookup at `:645`) |
| Employee noop, last status `success` | **0** | `employeeSyncWorkflow.mjs:1028-1029` |
| Employee noop, last status `waiting` or `error` | **1** (GET employee, the ID check) | `employeeSyncWorkflow.mjs:1031`. This is the lookup on the 19:10 poll (BCBA 67208227438, `waiting`, `crCalls` = one `lookup`) |
| Case update | lookup 1 + PUT 1 + label read 1 + **one PUT per changed metadata field** (0 to ~33) | `clientSyncWorkflow.mjs:645`, `centralReachClient.mjs:394`, `:859`, `:1056-1067`. **B21 adds 1** (GET client). Typical small change: 5 to 8 |
| Employee update | GET 1 + PUT 1 + label read 1 + one PUT per changed metadata field (0 to ~8) | `employeeSyncWorkflow.mjs:1031`, `:1110`; typical 3 to 5 |
| Label change (any run) | + catalog read 1 + POST 1 + read-backs 1 to 3 | `centralReachClient.mjs:875`, `:885`, `:789-803` (3 tries, 5 s apart) |
| Case create | lookup 1 + POST 1 + label read 1 + catalog 1 + POST 1 + read-backs 1 to 3 + every filled metadata field (~20 to 30) | about 26 to 38 |
| Employee create | lookup by record ID 1 + lookup by Workday ID 1 + POST 1 + labels 4 to 6 + filled metadata (~5 to 8); then the follow-up run for the Workday ID | about 12 to 18 |
| Waiting recheck, unlinked employee (create turned off, or found by Workday ID) | 1 to 2 lookups per run | `employeeSyncWorkflow.mjs:841-843`. Runs on every poll that sees an edit **and every day** (the sweep queues unlinked `waiting` records, `intakePollerWorkflow.mjs:359-364`) |
| Waiting recheck, create pending (`CR_CREATE_PENDING`) | 1 lookup per retry | `employeeSyncWorkflow.mjs:809-835`, `clientSyncWorkflow.mjs:654-674` |
| Retry after `CR_LABEL_POST_UNCONFIRMED` (+60 s, +300 s, …) | **a full update again**: the last run was not clean, so every mapped metadata field is re-sent, not only the changed ones (~30 on a Case, ~8 on an employee) | `clientSyncWorkflow.mjs:786-790`, `employeeSyncWorkflow.mjs:1171-1175`, `mappedState.mjs:245-248` |
| First run after a `MAPPING_VERSION` bump, or a record's first run | every filled field once (Case ~30, employee ~10) | `linkRecord.mjs:32-37` |
| Token request | not in `crCalls`; cached per process until 60 s before expiry (default 3,600 s), so at most about 1 per worker process per active hour | `centralReachClient.mjs:72-125` |

**Review 2026-11-23 (independent check against `655b385`):**
- Case noop = 0 and employee noop = 0 / 1 are **confirmed**: the Case worker's first CR call is the lookup at `clientSyncWorkflow.mjs:645`, after the noop return (`:588-621`); the employee GET at `employeeSyncWorkflow.mjs:1031` is skipped only at `:1028`.
- Case create 26 to 38 is **confirmed**: the lookup is inside `createOrUpdateClient` (`centralReachClient.mjs:378`), then the POST (`:408`), the label read, catalog, POST and 1 to 3 read-backs (`:859-886`) and every filled field.
- Employee create: **12 to 17 in the create run** (the Workday lookup is skipped when `workday_id` is blank, `employeeSyncWorkflow.mjs:843`), **plus 3 to 5** in the follow-up run when the Workday ID arrives (GET, PUT, label read, changed fields).
- A retry re-sends **every filled** mapped field, not every mapped field: a blank field costs no call unless a clear is due (`centralReachClient.mjs:924-926`, `:1058-1062`). It also re-sends the lookup, the B21 GET and the PUT. It follows **every** temporary failure after the in-progress save (`clientSyncWorkflow.mjs:682`, `employeeSyncWorkflow.mjs:1103`), not only `CR_LABEL_POST_UNCONFIRMED`: `SYNC_STALE`, a temporary metadata failure and `CR_LABEL_READ_EMPTY` behave the same way.
- **Missing row: a permanent error after a CR write.** The run leaves `clean: false`, and the catch block does not reset it (`clientSyncWorkflow.mjs:903-960`). The sweep queues every linked record every day, whatever its status (`intakePollerWorkflow.mjs:354-364`), so each day is one full re-send that fails again with no retry. That is about 30 calls a day per Case (about 900 a month) and about 10 per employee (about 300 a month), for as long as the error stays. Today's 3 Case `error` runs (98 calls) were this kind of full send.
- Stuck temporary record, day 1: the last attempt writes "Retries used up" (`clientSyncWorkflow.mjs:933-937`). That moves `hs_lastmodifieddate`, so the next poll starts a second chain of 6 runs. Day 1 is about 12 runs; later days are 6 a day from the sweep. The figure of 6,300 a month stands.
- Metadata second route: a 404 on the first metadata route sends a second PUT (`centralReachClient.mjs:944-954`). None happened today: all 138 metadata calls answered 200.

The poller and the sweep make **no CR call themselves**; they queue IDs. Each queued record costs what its worker run costs (rows above). The integration's own HubSpot write-back moves `hs_lastmodifieddate`, so the next hourly poll queues the record once more; that run is a noop (0 calls, or 1 for a `waiting` employee).

### H2. Usage on 2026-11-23

- **Integration (App Insights, `crCalls` of every `Sync run summary.` line since 00:00 UTC; read-only):** **203 calls** in about 40 runs. Metadata PUTs are 138 of them (114 on Cases). By kind: metadata 138, label read 25, lookup 21 (6 of them 404), update 10, create 5, label POST 3; one run's line was split by interleaved logs and was counted by hand. This is a floor: the stitched query can miss interleaved lines, and host sampling is on (`host.json:5-9`). Token requests are not counted.
  - Runs that cost the most: 3 Case runs ending `error` used 98 calls (about 33 each, full sends); 2 Case `success` runs used 36.
  - Poller noops: 4 of 6 BCBA noops and 1 of 5 BT/RBT noops made 1 GET each (the `waiting` ID check).
- **Research scripts (read-only, estimated from their `.out` files):** about **7,500** (range 6,500 to 8,500). The large ones: the verification after connect, 2,366 (counted); the employee recount, about 920; the address / coordinator read (every employee's metadata), about 1,150; the two allergy / severity reads, about 1,100; two format reads and two split-test reads, about 400 each; the Grad Permit, case-evidence and referral reads, about 1,000 together; the rest, about 200.
- **Total today: about 7,700 calls, about 5 % of the month in one day** (about $23 if it were overage). The research scripts are 97 % of it.
- **Month to date: not known.** Testing and research ran on 11-16 to 11-22 too (open question H-Q1).
- **Review 2026-11-23:**
  - **The count is not sampled.** Sampling is turned off by the app setting `AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__isEnabled` = `false` (BUILD-PLAN 7.3), which overrides `host.json`. Every trace today has `itemCount` = 1 (read-only query). The count can still be low, but only because the log-line stitching can miss lines.
  - **App Insights starts at 15:39 UTC on 2026-11-23.** The 7-day and 30-day queries return only today, with 38 summary lines. No integration count exists before this deploy, so month-to-date usage can come only from CentralReach (H-Q1).
  - **By kind and status (today):** metadata 138 (all 200), label read 25, lookup 21 (6 of them 404), update 10, create 5, label POST 3. This matches the counts above.

### H3. Production projection per month

**Not measured: how often production records change.** The read-only production count of `hs_lastmodifieddate` per day was prepared but not run: it loads the production token from the repo `.env` through a script, and this session's permission check refused that; the HubSpot connector here is on the sandbox (`52311591`). The script is `scratchpad/budget/prod-change-rates.mjs` (session scratchpad; GET and search only, counts only, portal checked first). Until it runs, change rates are assumptions (H5). An `hs_lastmodifieddate` change also overstates CR cost: a Case whose mapped fields did not change costs 0.

Phase 1 is cutover with new records only (D18, D19). Phase 2 adds the existing records (about 490 linked Cases, 600 to 900 employees) after their review.

| | Low | Expected | High |
|---|---|---|---|
| **Phase 1 (new records only)** | **~3,000** | **~16,000** | **~86,000** |
| New Cases created / month × ~30 | 20 → 600 | 40 → 1,200 | 100 → 3,000 |
| New employees created / month × ~18 | 20 → 360 | 50 → 900 | 150 → 2,700 |
| Case updates (gated linked Cases × changes × calls) | 20 × 2 × 8 → 320 | 100 × 4 × 8 → 3,200 | 300 × 10 × 10 → 30,000 |
| Employee updates | 20 × 1 × 5 → 100 | 150 × 1 × 5 → 750 | 400 × 3 × 6 → 7,200 |
| Label-unconfirmed retries (one full re-send each) | ~140 | ~2,500 | ~8,000 |
| Waiting rechecks (daily sweep + polls) | 10 records → 450 | 30 → 1,350 | 100 → 6,000 |
| `MAPPING_VERSION` bumps (full re-send of every gated linked record) | 0 | 1 → 4,500 | 2 → 26,000 |
| Token requests (if they count) | ~750 | ~1,500 | ~3,000 |
| **Phase 2 (existing records added)** | ~25,000 | **~58,000**; ~84,000 in the month the existing records are first sent (one full send each, about 26,000) | **over 150,000** (1,000 Cases changing 10 times a month alone is about 100,000) |
| **Testing and research on top** | | at today's pace, about 7,700 a day | |

**Review 2026-11-23, the projection:**
- **The arithmetic is right.** The rows sum to 2,720, 15,900 and 85,900. The method is sound: count of runs × calls per run, by run type, with the change rate as the input that drives the total. But every input is assumed (H5.6), so the totals carry no confidence until the counts in O-CR-BUDGET are measured.
- **Missing: records left not clean.** Add one row:

  | | Low | Expected | High |
  |---|---|---|---|
  | Not-clean records (a stuck temporary error: about 6,300 a month per Case until fixed; a permanent error after a CR write: about 900 a month per Case, about 300 per employee) | 0 | 3 permanent-error Cases, plus 1 stuck Case for a week → about 4,000 | 10 permanent-error Cases, plus 3 stuck Cases all month → about 28,000 |

- **Corrected phase 1 totals: about 3,000 / 20,000 / 114,000.** The high case is close to the cap.
- **Phase 2 expected: about 58,000 is consistent** with the stated inputs (590 gated linked Cases × 4 × 8, 900 employees × 1 × 5, creates, retries, waiting rechecks, one version bump of about 26,700, tokens), plus about 4,000 for not-clean records: **about 62,000**.
- **Phase 2 high:** "1,000 Cases" does not match the 490 + new Cases used elsewhere. 600 Cases × 10 changes × 10 calls is about 60,000, so phase 2 passes 150,000 only with version bumps and stuck records on top. The conclusion stands.
- **With item 22 as corrected below** (no bump for a mapper-only change), phase 2 expected drops to about 35,000.

Reading the table: phase 1 is safe on expected volume; the budget is spent by **research scans, full re-sends (version bumps, retries) and stuck records**, not by normal syncs. Phase 2 needs items 20 to 22 below and a measured change rate before it starts.

### H4. Safeguards

**Already in the code:**
- The Case noop makes no CR call, and runs before the lookup (`clientSyncWorkflow.mjs:588-621`). The employee noop makes none when the last status is `success` (`employeeSyncWorkflow.mjs:1028-1029`).
- Only changed metadata fields are sent after a clean run (`mappedState.mjs:245-257`); a blank field with nothing to clear is skipped with no call (`centralReachClient.mjs:924-926`).
- The token is cached per process (`centralReachClient.mjs:77-83`).
- The label POST, the catalog read and the read-backs happen only when the label set changes (`centralReachClient.mjs:868-871`); the 150 s window holds a second POST back (`:849-857`).
- Creates and label POSTs are never retried in-process (`suppressRetry`, `:411`, `:568`, `:773`).
- The gate, the lease and every decided error are settled before any CR call (D18 a; `employeeSyncWorkflow.mjs:452-527`).
- The sweep is spread at 60 messages a minute and capped at 3,000 a run (`intakePollerWorkflow.mjs:53-56`); the worker runs 4 messages at a time per instance (`host.json:14`).
- 429 handling: an in-process retry honours `Retry-After` up to 5 s, then a scheduled queue retry honours it up to 24 h (`retry.mjs:211-223`, `:261-266`). **No CentralReach per-second or per-minute limit is documented** in the guide or the code (open question H-Q3).
- Item 12 (decided, step 8): the first label retry waits about 150 s, so it stops landing inside CR's label lag and needing a second and third full re-send. It does **not** stop the first re-send: that retry still sends every metadata field (H1).

**Risky paths (could spend the budget):**
1. **A stuck linked record.** A linked record whose run keeps failing with a temporary error after its CR writes is re-queued by the daily sweep every day, and each run gets up to 5 queue retries, each a full re-send: about 6 × 35 = 210 calls a day per Case, **about 6,300 a month per stuck Case**. Ten stuck Cases are about 63,000.
2. **A `MAPPING_VERSION` bump.** Within 24 hours the sweep re-sends every field of every gated linked record (`linkRecord.mjs:32-37`). Phase 1: a few thousand. Phase 2: about 26,000 per deploy.
3. **Research scans.** One "every employee" or "every client" scan costs 700 to 2,400 calls. Today had about a dozen.
4. **Label lag.** Each unconfirmed label POST costs one full re-send (H1).
5. **Waiting records.** Each unlinked `waiting` employee costs 1 to 2 lookups every day for as long as it waits (sweep), and each linked `waiting` employee 1 GET a day.
6. **`INTAKE_POLLER_SCHEDULE` = every 5 minutes** (sandbox now). In production it must be removed at cutover (D18 d). The poller itself makes no CR call, but a 5-minute poll re-runs every `waiting` employee 12 times an hour while it is being edited.

**New build items. Decided: Zeke (2026-11-23, fifth set), "Yes to all please".** Each is built in the reviewer's version (the "Review 2026-11-23" bullets under it), not the first proposal:

| Item | Decided version | When |
|---|---|---|
| 19 | As is, with the review's three conditions. No `src/` change | Before cutover |
| 20 | **`dailySweep` messages only** get 1 queue retry; the pollers keep 5; `SYNC_IN_PROGRESS` and `CR_CREATE_PENDING` keep the full schedule | Before cutover |
| 21 | **The smaller variant:** save the hashes as clean without the `labels` key, then throw. No `labelsUnconfirmed` marker | Before the existing-records phase |
| 22 | **A rule, no code:** bump `MAPPING_VERSION` only when the request format or a write rule changes outside the mapped values, or when CentralReach is known to hold wrong data. Only the comment at `mappedState.mjs:3-6` changes | Before the existing-records phase |
| 23 | **Dropped.** Guide line 267: "the CR client read does not return the External System ID". So B21's read cannot replace the Case lookup. **B21 itself is unaffected:** it is still built as Route A and still costs 1 extra GET per Case update that is not a noop | n/a |

None of the four is needed for today's sandbox deploy. H-Q6 (leave `error` records out of the sweep) is still open.

#### 19. A daily CR call count and alarm (no `src/` change)
- **Change:** a saved KQL (testing chat, with the other four files; `scratchpad/budget/cr-calls-today.kql` is the starting point) that sums `crCalls` per day, plus an Azure alert when the integration passes 3,000 a day (a 90,000-a-month pace). With item 13 the query becomes a simple `parse_json` sum.
- **Why:** the only usage figure today is CentralReach's own page; a storm would show there only after the money is spent.
- **Review 2026-11-23: OK, with three conditions.** This is the smallest safeguard, and nothing in `src/` changes. It is needed before cutover, not for today's sandbox deploy.
  1. **It sees the integration only.** Research scripts (97 % of today's calls) and token requests never reach App Insights. Pair the alarm with a weekly read of CentralReach's own usage page (O-CR-BUDGET).
  2. **Keep trace sampling off in production** (REMAINING-GAPS E.4 plans to review it at 9.7), or write the query to sum `itemCount`. Otherwise a busy day undercounts exactly when it matters.
  3. **Creating the alert rule is an Azure write,** so it needs Zeke's go-ahead.

#### 20. Fewer retries for poller and sweep runs
- **Change:** in `src/lib/queueRetry.mjs:66-80` (with `planRetry`, `retry.mjs:211-223`), a message whose `source` is `intakePoller`, `employeePoller` or `dailySweep` gets at most 1 queue retry, not 5. Webhook runs keep 5. `lastAttempt` (`queueRetry.mjs:60`) must use the same per-source limit, so the last run still writes "Retries used up".
- **Why:** caps risky path 1 at 2 full runs a day per stuck record (about 2,000 a month per stuck Case, not 6,300). The sweep runs again the next day anyway.
- **Tests:** `planRetry` for a sweep message stops after 1; a webhook message still gets 5; the record still ends "Retries used up" and dead-letters.
- **Review 2026-11-23: FIX the scope.** It can follow; build it before cutover.
  - **`dailySweep` only, not the pollers.** The hourly poll is the backup for a missed webhook: it carries real edits and should retry like a webhook. It re-queues a stuck record only when `hs_lastmodifieddate` moves, which the integration's own error write does once (`clientSyncWorkflow.mjs:933-937`). The daily re-queue that spends the budget comes from the sweep alone (`intakePollerWorkflow.mjs:354-389`).
  - **Keep the full schedule for `SYNC_IN_PROGRESS` and `CR_CREATE_PENDING`.** They cost 0 and 1 CR calls. With one retry, a sweep message that meets another run's lease 60 s later would write "Retries used up" on a record that run is syncing, and dead-letter it. A create still inside its 15-minute window would dead-letter too, against guide line 267 (3): a waiting record "never goes to the dead-letter queue".
  - **It does not cover permanent errors after a CR write.** Those get no retry; the sweep alone re-sends them in full every day (H1 review). A smaller alternative would cover both risky paths: a sweep filter that leaves out records whose `last_sync_status` is `error`. The cost is that a record in error no longer heals on its own after a CentralReach outage until someone edits it. That is Zeke's call (open question H-Q6).

#### 21. Label-only retry after `CR_LABEL_POST_UNCONFIRMED`
- Already named in item 12 ("A fix for the re-sent update needs a label-only retry path and is its own item").
- **Change:** when the only failure of a run was the label confirmation (every PUT and metadata write succeeded), save the run's hashes as clean **and** a `labelsUnconfirmed` marker in the link record; the next run, seeing the marker, reads the labels only (1 call; POST again only if they differ) instead of being a noop.
- **Saves:** about 30 calls per Case and 8 per employee on every unconfirmed label POST.
- **Review 2026-11-23: FIX, with a smaller variant.** It can follow; build it before phase 2.
  - **The change:** when the run's only failure is the label confirmation (`clientSyncWorkflow.mjs:820-822` and the employee twin), save `clean: true`, `fieldHashes` = `nextFieldHashes` **without the `labels` key**, `hashesContactId`, `mappingVersion` and `NO_IN_PROGRESS`, then throw as today.
  - **What the next run does:** it sees `labels` as the only changed name, so it is not a noop. It sends the lookup, the B21 GET, the PUT and the label step, and no metadata, because `changedMetadata` compares metadata keys only (`mappedState.mjs:245-257`). That is about 4 calls on a Case and 3 on an employee, instead of about 35 and 10.
  - **Why it is safe:** no new link-record field and no change to the noop path. Item 12's objection (line 360) does not apply, because the retry is not a noop. The clear basis stays accurate, because every metadata write succeeded (`failedCount` is checked first, `:817`). The stale check and the HubSpot write-back simply move to the retry, as today. If the retries run out, the next sweep runs the label step again.
  - **Compared with the marker variant:** it costs about 3 more calls per retry, but adds no state. The marker variant would also need its own label read inside the noop branch, before the Case lookup.

#### 22. Change detection survives a `MAPPING_VERSION` bump
- **Change:** `hashesForContact` (`src/lib/linkRecord.mjs:32-37`) uses the saved field hashes of any version, as `savedHashesForContact` does. A field hash is the hash of the mapped value sent to CR, so a field whose output did not change keeps its hash and is not sent; a field whose output did change, or a new field ID, is sent.
- **Why:** removes risky path 2 (about 26,000 calls per deploy in phase 2). Needed before phase 2, not for today's deploy.
- **Risk:** a field CR holds wrongly from before would not be re-sent by a version bump alone. Today's bump is the first send for most records anyway.
- **Review 2026-11-23: FIX. Replace the code change with a rule; no code is needed.**
  - **Why no code is needed:** the field hashes already catch every mapper change. A changed output changes its hash, and a new field ID is a new key (`changedNamesFromHashes`, `mappedState.mjs:182-191`; `changedMetadata`, `:245-257`). Skipping the bump on a mapper-only deploy gives the same saving as the proposed code.
  - **Why the code change is the wrong way:** it would remove the only lever that re-sends everything. That lever is needed when the request format changes outside the mapped values, for example `metadataPutBody` (`centralReachClient.mjs:626-633`) or a clear or send-back rule. Those changes do not move any hash.
  - **The rule:** bump `MAPPING_VERSION` only when the request format or a write rule changes outside the mapped values, or when CentralReach is known to hold wrong data. A mapper-only change gets no bump. Rewrite the comment at `mappedState.mjs:3-6` to say so.
  - **Timing:** today's single bump can stay, because the sandbox holds only test records. The rule is needed before phase 2.

#### 23. B21's read replaces the Case lookup, if it can
- **Change:** if the new `GET /contacts/client/{id}` (B21) answers with the client's External System ID, use it for the Case / client ID check and drop the `byExternalSystemId` lookup on the linked path (`clientSyncWorkflow.mjs:644-653`). Depends on B21's PENDING field names.
- **Saves:** 1 call per Case update, so B21 costs nothing extra.
- **Review 2026-11-23: FIX. Drop this item.**
  - **The guide settles it.** Guide line 267 (11/18): "the CR client read does not return the External System ID", and none of the 100 sampled clients held its Case record ID. That is why the code looks the client up by the Case record ID.
  - **What the lookup does that a read by CR ID cannot:** it finds **another** CR client holding this Case's ID. That is the `CASE_CLIENT_ID_MISMATCH` stop (`clientSyncWorkflow.mjs:650-652`), and it also sets `externalSystemIdHeld` (`:653`).
  - **Cost:** B21 stays at +1 GET per Case update that is not a noop. Every Case update that is not a noop costs that GET; a typical update goes from 4 to 7 calls to 5 to 8.
  - **Note (2026-11-24), for the orchestrator to assess; item 23 stays dropped:** B21's reads found `contact.externalSystemId` present when CentralReach holds one (test client `5384589`) and absent when it holds none (production `4438604`, `4717582`). That may weaken the guide line 267 premise above; the `CASE_CLIENT_ID_MISMATCH` point (the lookup finds another client holding this Case's ID) is not affected by it.

**Optional, not recommended now:** skip the label read on an update when the required labels' hash did not change, the last run was clean and no labels are pending (saves 1 call per update run). It would stop the integration from putting back a required label staff removed by hand in CR, until the labels next change.

**Testing practice (from now):**
- Every research or check script counts its CR calls and prints the count (as `na-lba-state-read.mjs` does), and caches answers on disk (`na-lba-state-cache.json` pattern). Re-use saved `.out` files and caches; do not re-scan.
- A scan of every client or every employee (700 to 2,400 calls) needs Zeke's go-ahead and is run once per day at most; sample 20 to 50 records first.
- Research budget: about 1,000 calls a day; integration testing as needed (today it was 203).
- Every sandbox round's CR GET checks name the records they check (`check-cr-record.mjs`), not a scan.
- Keep `INTAKE_POLLER_SCHEDULE` at 5 minutes only while testing; remove it at cutover.

### H5. Assumptions

1. Zeke's cut-off "Ensure it" means: keep the integration and our testing within the tier.
2. Every HTTP request to the CR API counts, including 404s and in-process retries. Whether the token request (a separate sign-in endpoint) counts is not known; the table counts it as a possible cost.
3. The sandbox HubSpot portal and production share one CentralReach and one quota.
4. The research estimate is built from the scripts' `.out` files and their loops; only the verification after connect (2,366) and the employee recount (909 GETs) printed their counts.
5. App Insights counts are a floor (sampling on, interleaved log lines).
6. Volumes: new Cases 20 / 40 / 100 a month and new employees 20 / 50 / 150 a month (low / expected / high). Mapped-field changes per linked record a month: Cases 2 / 4 / 10, employees 1 / 1 / 3. None measured (H3).
7. About 30 % of label POSTs are not confirmed within the read-backs (observed lag up to about 150 s; the R-WD create confirmed at once).
8. Phase 2 covers about 490 linked Cases and 600 to 900 employees (Cases with `client_id_number`; employees with Entered = Yes or a backfilled `employee_id`).
9. (Review 2026-11-23) A record in error is fixed within about a week once the dead-letter alert or the failure view shows it. The not-clean row in H3 uses 1 stuck Case for a week (expected) and 3 all month (high).
10. (Review 2026-11-23) The production app keeps App Insights trace sampling off, as the sandbox does (BUILD-PLAN 7.3).
11. (Review 2026-11-23) The client read that guide line 267 describes is the `GET /contacts/client/{id}` that B21 adds.

### H6. Open questions for Zeke

- **H-Q1.** How many CR calls has United Care used this billing month, and when does the month reset? (CentralReach's usage page; our counts start today.)
- **H-Q2.** Does CentralReach count the token request, 404 answers and in-process retries as calls?
- **H-Q3.** Does the Core tier have a per-second or per-minute limit (and does CR answer 429 with `Retry-After`)? Neither the guide nor the code says.
- **H-Q4.** Can you run `scratchpad/budget/prod-change-rates.mjs` (read-only production counts of `hs_lastmodifieddate` per day and per hour on Cases, BCBAs and BT/RBTs), or allow it to run? It replaces assumption 6 with measured numbers.
- **H-Q5. Answered (Zeke, 2026-11-23): "Yes to all please".** 19, 20, 21 and 22 are built in the reviewer's versions; 23 is dropped (table in H4). Was: Build items 19 to 23? Recommended: 19 and 20 now (small, cap the worst case), 21 to 23 before phase 2.
  - **Review 2026-11-23, revised recommendation.** None of the five is needed for today's sandbox deploy.
  - **Before cutover:** 19 (with its three conditions) and 20 (`dailySweep` only, with the `SYNC_IN_PROGRESS` and `CR_CREATE_PENDING` exemptions).
  - **Before phase 2:** 21 (the smaller variant) and 22 (as a rule, no code).
  - **Drop:** 23 (guide line 267).
- **H-Q6 (Review 2026-11-23).** Should the daily sweep leave out records whose `last_sync_status` is `error`?
  - **What it fixes:** it caps both stuck-record paths: the temporary retries and the daily full re-send of a permanent error.
  - **What it costs:** a record in error after a CentralReach outage stays in error until someone edits it, or until its status is cleared.
  - **Without it:** item 20 caps the temporary path only.

### H7. Open item O-CR-BUDGET (Zeke, 2026-11-23)

Zeke (2026-11-23): "mark as a open item that we need to calculate actual cost and update the code be below this cap."

**O-CR-BUDGET:** calculate the actual CentralReach API cost per month from measured production volume, and change the code so usage stays below the Core tier cap (150,000 calls/month; $0.003/call overage). **Owner:** Zeke/Optidge. **Due:** before the existing-records phase (phase 2).

**What to measure, and when:**

| # | Measure | Source | When |
|---|---|---|---|
| 1 | Calls used this billing month, and the reset date | CentralReach usage page (H-Q1) | Now, then weekly. It is the only count that includes research scripts and token requests. |
| 2 | Production change rate: Cases, BCBAs and BT/RBTs changed per day | Read-only production count of `hs_lastmodifieddate` (`prod-change-rates.mjs`, H-Q4) | Before cutover (baseline) |
| 3 | Integration calls per day by workflow, source, kind and outcome; the noop versus update ratio | App Insights `crCalls` (item 19 query), sampling off | Daily from cutover, for the first 2 to 4 weeks of phase 1 |
| 4 | New Cases and new employees created per month | The same run summaries (`operation` = `create`) | First 4 weeks of phase 1 |
| 5 | Label POSTs and the share not confirmed | Run summaries (`labelPost`, `CR_LABEL_POST_UNCONFIRMED`) | First 4 weeks of phase 1 |
| 6 | Records each day in `error` (not clean) or `waiting` | HubSpot failure and waiting views; the sweep's queued count | Daily in phase 1 |
| 7 | Research and check-script calls | Each script prints its count | Every run |

**Then:** replace assumption H5.6 with items 2 to 6, and recompute H3 for phase 2, including the one full send of each existing record (about 26,000). Decide which code changes are needed (items 20 to 22, H-Q6) to keep the monthly total under 150,000 with margin. Build them before the existing-records phase starts. Recompute again after phase 2's first month.

### H8. Open item O-HS-JOURNAL (Zeke, 2026-11-23)

Zeke (2026-11-23): "Make a note to research and confirm if we can utilize the webhooks journals beta if we can reduce calls through this, leave it as an open item to confirm".

**O-HS-JOURNAL:** research and confirm whether HubSpot's webhooks journal API can replace part of the change detection, and whether it reduces calls. **Owner:** Zeke/Optidge. **Status:** open, to confirm. Not in this package; no code.

**What it is** (HubSpot developer docs, "Webhooks journal and management APIs (2026-09)", read 2026-11-23): an app subscribes to object, property and association changes; HubSpot stores the events in a journal; the app **pulls** them in order by offset. An update event carries the object type, the record ID and the changed properties with their new values. The journal keeps 3 days.

**Would it reduce calls? Honest first answer:**

| Calls | Effect | Why |
|---|---|---|
| **HubSpot API calls** | **Yes, some.** | It could replace the hourly poller's three CRM searches (and their paging) with a few journal reads, and perhaps the workflow webhooks. The journal's batch endpoints do not count against the standard HubSpot daily and per-second limits. It does **not** remove the per-record read: an event carries only the changed properties, and a sync needs the whole record and its staffing associations |
| **CentralReach API calls** (the 150,000 budget) | **No, not directly.** | A CentralReach call is made only when a mapped value changed; a Case with nothing to send already costs 0 (H1). The journal changes how HubSpot changes are found, not what is sent to CentralReach. At most a small indirect saving: knowing which properties changed would let the integration not queue a record whose change is unmapped, which saves the 1 GET a `waiting` or `error` employee costs per noop run. It does nothing for the three paths that spend the budget: full re-sends, stuck records and research scans (H4) |

So the journal is a HubSpot-side efficiency and reliability option, not a fix for O-CR-BUDGET. HubSpot's limit (190 requests per 10 seconds, guide line 464) is not the constraint today.

**To confirm before any decision:**

1. Is it still a beta? The pages read carry a dated version (2026-09) and no beta notice; the product-tier field shows it on free tiers. Check the changelog and whether the terms allow production use.
2. Authentication: it needs an app with an OAuth client-credentials token and the `developer.webhooks_journal.*` scopes. The integration uses a private-app token today. Does this mean a new app on the developer platform, installed in production `50317927`?
3. Do subscriptions cover the custom objects (BCBA `2-48354212`, BT/RBT `2-48354559`) and their association label changes? The docs show custom object type IDs in an association example; confirm for property changes.
4. Can it carry the two gate properties or a segment filter, so events for records outside the segments are not delivered?
5. The 3-day history cannot replace the daily sweep (every linked record, changed or not), and a gap longer than 3 days needs the poller or a snapshot to catch up.
6. Cost and effort against the saving: the poller is about 3 searches an hour.

