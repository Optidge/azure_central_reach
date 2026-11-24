# Round 1 log (sandbox 52311591 → production CentralReach)

One entry per push or change, in order. Each entry is filled from the tools, never from memory. Stop at the first unexpected result and record it here before anything else.

**Records.** IDs in `round-1.json`: Case 68493177375, BCBA 67036479540, BCBA 2 67023361578, BT/RBT 1 67037268070, BT/RBT 2 67048799131.

**Tools.**
- HubSpot read-back: `NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round 1` (plan only, no write).
- Logs (read-only), from the repo root:
  - `az monitor app-insights query --app df1c0c8f-12fe-41b7-a022-e3e5f1989f2e --offset 6h --analytics-query @scripts/sandbox/kql/pipe-check.kql -o json --query "tables[0].rows"`
  - Same command with `run-summary.kql` (set `recordId`), `record-timeline.kql` (set `recordId`) or `errors-retries-deadletters.kql`. One plain `az` command per call (no pipes); `--app` takes the App Insights appId, not the resource name; `--offset` must cover the query's `since` (the default is 1h); `-o table` prints nothing.
- CentralReach GET (read-only, production): `NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record bt1|bcba|case`. Wait at least 150 s after a label POST before reading labels.
- Dead letters (Zeke runs it; deletes, nothing re-sent): `scripts/sandbox/purge-dead-letters.mjs --confirm`.

**Order.** Pipe check (no CR write), BT/RBT 1, BCBA, Case, R1-U1, poller and retries, R1-U2. Every CR write needs Zeke's go-ahead at that step. The HubSpot re-enrollment triggers are Zeke's, set up in HubSpot (decision 51); no trigger file or code check is a gate.

**R1-U1 steps added on 2026-11-23** (values in the matrix): BCBA `email` changed on the BCBA record directly (B4, decisions 47 and 49, O-11: the first live test of a changed email by API; the sandbox Contact→BCBA mirror does not run). The BCBA Contact `email`, the script's lookup key, is left alone; a round 1 `--write` re-run after it would set the BCBA `email` back to the R1 value; BCBA `personal_email` changed (B9; replaces the retired K3); then BCBA `personal_email` set to a badly formed value and restored (B9, decision 43: `error` "Unreadable value: personal_email", `UNREADABLE_VALUE`, no CR write); BT/RBT 1 `email` changed on the BT/RBT record (T2, decision 47, O-11: the BT/RBT fallback; its Contact `email`, the script's lookup key, is left alone); after the K1 phone change, Guardian Contact `phone` set to `555-01` and restored (C8, decision 43: `error` "Unreadable value: phone", `UNREADABLE_VALUE`, no CR write). The other unreadable-value cases are offline only (matrix).

## Before the first push

| Check | Result |
|---|---|
| Wave 2 commit deployed (commit hash) | 2026-11-23 15:4x UTC: `655b385` (T9 hold), published with `func azure functionapp publish` from a clean `git archive` of that commit (no local.settings.json, no uncommitted files), `npm ci --omit=dev`. Function timeout `00:10:00` (host.json). Zeke: "yes, deploy and start, please" |
| App setting names for `52311591` present (names only) | 2026-11-23 (step 7.3): `HUBSPOT_PORTAL_ID` = 52311591 (was 50850427), `HS_BCBA_OBJECT_TYPE_ID` = 2-72890322, `HS_BT_RBT_OBJECT_TYPE_ID` = 2-72890325 (both equal the portal table in `src/lib/config.mjs`; the code takes the IDs from the table and only rejects a setting that differs), `SYNC_RECORD_GATE_PROPERTY` = sandbox_test_field (added), `LEASE_TTL_SECONDS` = 660 (was 300). `HUBSPOT_PRIVATE_APP_TOKEN`, `HUBSPOT_WEBHOOK_CLIENT_SECRET` present (names only). `HUBSPOT_PORTAL_ID_TEST` absent |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` present (name only) | 2026-11-23: present |
| Sampling off: `AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__isEnabled` = false | 2026-11-23: added, = false |
| App state Running | 2026-11-23 (after 7.3): **Stopped**, as planned. Started 15:43 UTC after the deploy: **Running**; hubspotWebhook, intakePoller, processClientQueue, processEmployeeQueue enabled; the three test functions disabled |
| `ALLOW_EMPLOYEE_CREATE` / `PUT_ONLY_MODE` (Zeke 2026-11-23: "We are allowing employee create.") | 2026-11-23: true / false, unchanged |
| Unused settings removed: `HS_BCBA_PIPELINE_ID`, `HS_BCBA_STAGE_ALLOWLIST_JSON`, `HS_BT_RBT_PIPELINE_ID`, `HS_BT_RBT_STAGE_ALLOWLIST_JSON`, `HS_DEAL_PIPELINE_ID`, `HS_STAGE_ALLOWLIST_JSON` (none read by `src/` or `host.json`) | 2026-11-23: removed, names gone |
| Other settings the code reads (Stage 7 plan review) | 2026-11-23: `HUBSPOT_CR_CONTACT_ID_PROPERTY` = client_id_number; `SUCCESS_TTL_SECONDS` = 86400; `FAIL_TTL_SECONDS` = 3600; `INCLUDE_TEST_RECORDS` absent; `HUBSPOT_WEBHOOK_URI` starts with `https://centralreachserverless`, ends with `/api/hubspot-webhook`, no query string; `CR_CLIENT_CONTACT_FORM`, `HUBSPOT_EMPLOYEE_ID_PROPERTY`, `INTAKE_POLLER_SCHEDULE` absent (code defaults: "Public Client Intake Form", `employee_id`, hourly) |
| Dead-letter alert: `uca-sync-deadletter-above-zero` on `ucr-hs-cr-sb-prod`, `DeadletteredMessages` Maximum > 0, `EntityName` in client-sync-queue, employee-sync-queue, 15 min window, every 5 min, severity 2; action group `uca-sync-deadletter-owners` emails the subscription Owner role (ARM role receiver, no personal address) | 2026-11-23: created. It fires straight away on the existing dead letters until they are purged |
| `AzureWebJobs.intakePoller.Disabled`, `AzureWebJobs.processClientQueue.Disabled`, `AzureWebJobs.processEmployeeQueue.Disabled` (Zeke 2026-11-23: "I need both the Polar and Q to be tested, so we should not disable these.") | 2026-11-23: left false |
| Dead letters purged (Zeke ran `scripts/sandbox/purge-dead-letters.mjs --confirm`; receive-and-delete, nothing re-sent): client-sync-queue 406, employee-sync-queue 628 | 2026-11-23: deleted 406 and 628. Read back with az: both queues active 0, dead-letter 0 |
| Cosmos checked for leftover `50850427` state (Zeke, portal) | 2026-11-23, Zeke in Data Explorer (`hs-cr-sync` / `sync-state`): ids starting `50850427` = 0; total items = 0. Container empty |
| Sandbox `HUBSPOT_PRIVATE_APP_TOKEN` is the `52311591` token (Zeke). Webhook secret set per Zeke; the token is unconfirmed. If it is still the old portal's, the F-3 check ends every run as `HUBSPOT_PORTAL_MISMATCH` | 2026-11-23, Zeke: "app token confimred". The first run's F-3 check confirms it in the logs |
| Deploy waits on the build chat's commit | Done: `655b385` deployed. First poller run 15:43 UTC (past-due catch-up): lease acquired, poll client 0 / bt_rbt 0 / bcba 0, sweep ran, queued 0, errors 0 (so the HubSpot token and the portal check work) |
| Sandbox properties (O-38): closed by Zeke, 2026-11-23: "Confirmed. These fields are created in sandbox." | closed |
| O-51 (read-only, 2026-11-23): BCBA `personal_email` exists in sandbox `52311591`. BT/RBT `personal_email` does not exist | BCBA: yes. BT/RBT: no |
| T9 **held** (Zeke 2026-11-23): confirm the BT/RBT personal email field with Danny and the client (O-51). Not a step to do here | held |
| The deployed code no longer requests `personal_email` on the BT/RBT (until then every BT/RBT run ends as a failed read, row 4.18). **The BT/RBT 1 push waits on this** (build chat) | 2026-11-23: done in `655b385` (T9 hold), deployed. The BT/RBT 1 run of 16:11:53 read cleanly (outcome waiting, no failed read) |
| Round 1 re-run with `--write` for decisions 39, 41, 46, 48, 49, 50: Case `care_coordinator_name`, `bt_rbt_2_work_schedule`; BCBA `personal_email` (B9), `dob` (B5) and the `date_of_birth` decoy on the record; B4 is the BCBA Contact `email` (not set on the BCBA record; no `ucaba_email_address` decoy, Zeke 2026-11-23); the Contact phones in the rotated forms (C8, B7, T4) | 2026-11-23, run by Zeke: all records reused (same IDs), decoys set (deal 3, BCBA 5 incl. `date_of_birth`, BT 2). Contact `sandbox_test_field` NOT FOUND is harmless: the gate is never read on a Contact |
| Read-back: `care_coordinator_name` = Zeke Swanson; `hours_bt_work_schedule_1` = 10 and `bt_rbt_2_work_schedule` = 6 (C20 expected 16); BT/RBT 1 `active_cases_count` filled (T7) | 2026-11-23: deal `differs` [] (only `referral_source` blank, C36); BT/RBT 1 `differs` [], no blank mirror |
| Read-back, BCBA: `emailVsContact` = matches the Contact (BCBA `email` = zeke+bcba_azure_test_1@optidge.com, the Contact email; B4). The sandbox mirror does not run, so the script now sets it on the BCBA record; anything other than "matches the Contact": stop and ask Zeke. `personal_email` = zeke+bcba_personal_1@optidge.com (B9) and `dob` = 1/15/1990 (B5), neither in `differs` (the "BCBA - Work Email Becomes Primary" workflow may move them; if it did, stop and ask Zeke) | 2026-11-23: **blank (mirror did not run)**. BCBA `differs` [] (`personal_email`, `dob` held). 2026-11-23: mirror did not run; set directly by the testing chat on Zeke's word ('Just go ahead and populate the BCBA email field please'): `email` = zeke+bcba_azure_test_1@optidge.com. The script now sets it in every round (no enrollment of Contact 264352124460 needed) |
| Decoy reported as set: BCBA `date_of_birth`. `ucaba_email_address` is not set (Zeke 2026-11-23: "drop the decoy") | |
| `INTAKE_POLLER_SCHEDULE` = `0 */5 * * * *` on `centralreachserverless`, for the Stage 8 R1-U1 pushes (Zeke 2026-11-23: "Yes, set 5 minutes"). **Remove before the production cutover** (puts the poll back to the hourly default) | 2026-11-23, set by the testing chat between 17:00 and 17:05 UTC (reported as ~17:30; the logs show the first 5-minute run at 17:05). Read back: set; app Running. App Insights: intakePoller runs at 17:00:00 (hourly), 17:05:00, 17:10:00 UTC, one per 5-minute bin |

## Entry template

Copy this block for each step.

```text
### Step N: <short name>                                  Requirement IDs: <BR.., C.., T..>
Go-ahead (Zeke, verbatim, time):
HubSpot change: <record, property, old → new>               Time (UTC):
Expected (from the matrix):

Logs
  Webhook accepted / queued / runs / CR writes (pipe-check):
  Run summary (run-summary.kql):
    invocationId:            attempt:        source:
    outcome:                 reasonCode:     operation:
    changedFieldNames:
    crCalls (kind, status):
    labels (posted, confirmed, skip_window):
    writeback (written, status):
  Errors, retries, dead-letters:
  BR21 check: no test value in any line (yes/no):

CentralReach GET (check-cr-record.mjs): <PASS n, FAIL n, SKIP n>
  Fails: <requirement ID, expected, got>

HubSpot read-back: last_sync_status / CR ID / other BR13 properties:

Result: PASS | FAIL | STOPPED          Notes:
```

## Entries

```text
### Step 1: Round 1 push (BT/RBT 1, BCBA, Case together)          Requirement IDs: BR1, BR13, BR15, T1-T8, B1-B10, C1-C35
Go-ahead (Zeke, verbatim, 2026-11-23 ~16:11 UTC): "Yes set that field on all 3 of the test recors."
  Zeke chose all three at once instead of the plan's one record at a time.
HubSpot change (testing chat, HubSpot connector, sandbox 52311591), 16:11:40-41 UTC:
  BT/RBT 1 67037268070 `entered_in_centralreach` blank -> Yes
  BCBA 67036479540 `entered_in_centralreach` blank -> Yes
  Case 68493177375 `enter_in_central_reach` blank -> Yes
Before this: two webhook-free pipe-check attempts (BT/RBT 1 last name at 15:48:15 and back at 16:05:39) reached nothing in Azure;
  suspected cause: the sandbox webhook workflows enroll only records with Entered in CentralReach = Yes (not confirmed).
Expected (from the matrix): one CR create per record; CR ID and last_sync_status written back to HubSpot.

Logs (pipe-check.kql, run-summary.kql, 2026-11-23 16:16 UTC)
  Pipe check without a CR write: round 2 creates fired webhooks at 16:10 (BCBA 67197219211, BT/RBT 67197081363):
    webhook 202 -> queued -> run skipped, reasonCode entry_not_yes, crCalls [] (BR1, BR4: correct).
  BT/RBT 1 67037268070: webhook 16:11:45, 1 run 16:11:53, attempt 0, outcome waiting, reasonCode WAITING_FOR_WORKDAY_ID,
    operation create; crCalls lookup 404, create 200, labelRead 200, metadata 200 x2; labels confirmed (no POST needed);
    writeback written, status waiting.
  BCBA 67036479540: webhook 16:11:58. Attempt 0: create 200, labelPost 200 (10 IDs), 3 label reads unconfirmed ->
    error CR_LABEL_POST_UNCONFIRMED, retry in 60 s. Attempt 1 16:13:27: lookup 200, update 200, skip_window held the
    POST back, labels still unconfirmed -> error, retry 2 scheduled (+300 s, ~16:18:27; 1 scheduled message at 16:16).
  Case 68493177375: NO webhook received (Entered Client in CR = Yes set 16:11:41). Deal webhook workflow did not fire.
  Errors/dead letters: none besides the two BCBA retries; dead-letter count 0.
CentralReach GET (check-cr-record.mjs, bt1, run by Zeke): PASS 17, FAIL 1, SKIP 3
  Fail: T7 Meta 147882 expected "1", got "". HubSpot BT/RBT 1 `active_cases_count` is blank in the sandbox, so the
  code correctly sent nothing: a test-data gap (the sandbox count automation did not fill it), not a code defect.
  Labels held [1052618, 1052630, 1052643, 1132655]: TL1, TL3, TL4 PASS; nothing missing or extra.
HubSpot read-back: BT/RBT 1 employee_id 5384530, CR link set, last_sync_status waiting, last_sync_error
  "Waiting for the Workday ID" (decision 22: correct). BCBA employee_id 5384531 written; status pending the retry.
CentralReach GET (check-cr-record.mjs, bcba, run by Zeke ~16:18 UTC): PASS 26, FAIL 0, SKIP 3 (B1 screen, B11 O-17, BL3 O-6)
  All 10 posted labels held, none missing. Extra 1052549 "Admin" (under All Employees, 1052618): set by the Admin contact
  form at create (B1) and kept by the label POST (the POST sends the full set). Expected.
  So the labels reached CR; the run's read-back ~15 s after the POST was too early (CR label lag, up to ~150 s).
BCBA retry 2 (16:18:27-38): lookup 200, update 200, labels confirmed (no re-POST), outcome waiting,
  WAITING_FOR_WORKDAY_ID, writeback written: HubSpot last_sync_status waiting, "Waiting for the Workday ID". PASS.
Case 68493177375: the Deal webhook arrived late, 16:20:57, and again 16:21:19 (two webhooks for one change).
  Second run: outcome waiting, SYNC_IN_PROGRESS, crCalls [] (lease held by the first run: BR3/BR14 duplicate guard, correct).
  First run 16:21:26: lookup 404, create 200, labelPost 200 [1052619,1082499,1052656,1125427,1156746], read-back
  unconfirmed -> error CR_LABEL_POST_UNCONFIRMED, retry scheduled (same label lag as the BCBA).
Finding (all three creates): the label read-back runs ~15 s after the POST, CR takes longer, so every create costs
  1-2 retries (60 s, then 300 s) before success. Works, but slow and logs an error each time: for the build chat.
Case later runs: retries at 16:22:23 and 16:22:32 still CR_LABEL_POST_UNCONFIRMED; another webhook 16:24:36;
  run 16:24:39 outcome SUCCESS (labels confirmed). HubSpot client_id_number 5384589.
CentralReach GET (check-cr-record.mjs, case, run by Zeke): PASS 53, FAIL 2, SKIP 7. All 5 labels held, none missing/extra.
  FAIL C11 Meta 144602 (RE BCBA) expected "Zara Swanson BCBA2 Azure Test R1", got "".
  FAIL C14 Meta 138092 (Primary BT 2) expected "Jill Swanson Azure Test R1", got "".
  Cause: TEST-SCRIPT defect, not integration code. create-test-records.mjs made one labeled association PUT per label;
  a later PUT on the same Case-staff pair replaced the earlier label, so BCBA 2 kept only its Potential labels and
  BT/RBT 2 only "Potential BT 1". The worker reads roles by association type ID (229, 240; both match the sandbox) and
  found nobody in those roles, so it sent nothing. Fixed in the script (all labels of a pair in one PUT), 2026-11-23.
  Round 2 records were made with the old script and have the same gap.
Case runs 16:27:23 and 16:27:32: outcome noop, no CR call (nothing changed since the 16:24:39 success).
Script fix applied: round 1 `--write` re-run with the fixed create-test-records.mjs restored the RE BCBA (BCBA 2) and
  Primary BT 2 (BT/RBT 2) associations. Read-back clean; BCBA `emailVsContact` = matches the Contact.
Case update test (this re-run is the HubSpot change): Deal webhook 16:30:47; run 16:30:49 outcome success, operation update,
  changedFieldNames exactly ["metadata.138092","metadata.144602","relationships"] (only the two staff names).
  Second webhook 16:30:56: outcome noop, no CR call.
  Proves: the update path; unchanged -> noop (BR14); the duplicate-webhook guard (BR3/BR14, with SYNC_IN_PROGRESS at 16:21:19).
C11/C14 CR re-check after 16:30:49:
  `NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 1 --record case`
  A check Zeke ran before the re-run finished still showed C11/C14 blank (expected at that time).
2026-11-23 ~16:45 UTC, Case re-check (run by Zeke; Case 68493177375, CR contact 5384589): PASS 55, FAIL 0, SKIP 7.
  C11 pass: Meta 131314 "Zeke Swanson BCBA Azure Test R1", 144602 "Zara Swanson BCBA2 Azure Test R1".
  C14 pass: Meta 131313 "Jane Swanson Azure Test R1", 138092 "Jill Swanson Azure Test R1".
  CL1-CL6 pass; labels held [1052619, 1052656, 1082499, 1125427, 1156746], none missing, no extras.
  Confirms the test-script fix (all labels of a pair in one PUT) and that the 16:30:49 update delivered both fields.
Result: BT/RBT 1 PASS (T7 data gap). BCBA PASS. Case PASS (C11/C14 pass on the re-check).
```

## Notes from round 1 (2026-11-23)

**Webhook behaviour (sandbox workflows).**
- The HubSpot webhook workflows fired on record creation and on Entered in CentralReach = Yes. They did not fire on a plain last-name edit of an existing record (attempts at 15:48 and 16:05 sent nothing). This answers the "suspected cause" in step 1.
- The Deal webhook came ~9 min after the change (16:11:41 → 16:20:57), and HubSpot sent 2 webhooks per change. The lease and the noop rule handled the duplicates.

**Findings for the build chat (not decided; with Zeke).**
1. Label confirmation reads back ~15 s after the POST. CentralReach takes longer, so every create ends `error` `CR_LABEL_POST_UNCONFIRMED` and needs 1-2 retries (60 s, 300 s) before success. It works, but it is slow and logs an error each time.
2. safeLog multi-line output is stored one row per line in App Insights. The KQL files stitch the rows back together; a single-line JSON log would be simpler.

**Test-script fixes (2026-11-23).**
- `create-test-records.mjs` sends all labels of a record pair in one association PUT (a second labeled PUT replaced the first: the C11/C14 cause).
- It sets the BCBA `email` itself (the sandbox Contact→BCBA mirror does not run, Zeke's word).
- Round 2 records (created 16:10 with the old script) have the same association gap: re-run round 2 with `--write` before using them.

**2026-11-24 note: B5 and T2 date of birth proven under the old rules.** The step 1 B5 pass (CR 1990-01-15) read the BCBA `dob` (decision 48) with `date_of_birth` as the 1980-07-04 decoy; build package item 1 now reads `date_of_birth` and makes `dob` the decoy (`3/9/1975`). The T2 date pass used `1992-02-20` and the strict reader; item 16 reads the text form, and R1 now uses `2/20/1992`. Both are re-proven after the deploy (matrix rows B5, T2); the round 1 refresh is the first bullet of "Before the first edit" in the R1-U1 run sheet.

**Tooling.**
- `scripts/sandbox/purge-dead-letters.mjs` (new): purged the old dead letters (client-sync-queue 406, employee-sync-queue 628) before the round.
- KQL files rewritten: they stitch the multi-line log rows, take the appId, and need `--offset` to cover `since` (see Tools).

## R1-U1 run sheet (prepared, not run)

**2026-11-24 note (testing chat): superseded for running by `retest-run-sheet-2026-11-24.md`.** The lines below stay as the field values and history; the retest regroups them (all 76 old lines are placed in its steps S4-S8) with New York, Colorado and New Jersey side by side and the webhook and poller both on. Changes against this sheet: line 19 sets the BCBA Entered to **blank**, not `No` (F7); line 39 edits `finalized_client_service_hours_post_assessment` (item 7); lines 35, 36, 43, 44, 48 expect the 2026-11-24 matrix values (C10 `missing_match`, C12 " BCBA LBA", C24 two lines, C26 "None", C31 one space); the first run of each linked record after the deploy is a full update by design (R1F-1, master G1), not a fail; the B5 / T2 refresh is run sheet step S1.

**2026-11-23, Workday IDs on the R1 employees.** Zeke changed the External System ID by hand on the CR screen from the temporary HubSpot ID to the Workday ID on BT/RBT 1 (HS `67037268070` → CR `5384530`, `workday_id` `4837593`) and the BCBA (HS `67036479540` → CR `5384531`, `workday_id` `0498374`), then set `workday_id` in HubSpot. Both synced to `success` (matrix R1-WD rows). The BT/RBT 1 and BCBA expected results below are re-stated for that: CR holds the record's own Workday ID, so rule 5.4's first row wins and every linked run ends `success` with a blank error, ticked checklist or not (`src/lib/syncDecisions.mjs:28-31`, checked before the checklist rows at `:33-45`). A checklist change on its own is still a changed field (`identity.checklistTicked` is in the compared state, `src/workflows/employeeSyncWorkflow.mjs:760-763`), so its run sends one update call that changes no CR value (`:1110`), not a `noop`. The `waiting` and checklist-error cases move to new records: "R-WD" below. `round-1.json` holds both Workday IDs (`workdayIds`), so `check-cr-record.mjs --round 1` expects them as the External System ID.

Prepared 2026-11-23 against deployed `655b385`, read-only. Values from the matrix U1 column and `create-test-records.mjs` (round 1: `N` = 1, `NN` = 01). Nothing here has been changed in HubSpot or CentralReach. Every CR write still needs Zeke's go-ahead at its push.

Regrouped 2026-11-23 for the 5-minute poll (`INTAKE_POLLER_SCHEDULE` = `0 */5 * * * *`, see "Before the first push"): the same 76 edits in 8 pushes instead of 34. The **Old #** and **Old push** columns are the first version's line and push numbers; other sections and the matrix may still cite them ("line 31", "P17").

**Before the first edit.**
- **2026-11-24, build package items 1 and 16 (date of birth), before anything else in this sheet.** The R1 BCBA `67036479540` still holds the old decoy `date_of_birth` = `1980-07-04` and `dob` = `1/15/1990`; once item 1 is deployed the code reads `date_of_birth`, so its first update (Push 1) would send 1980-07-04 to CR `5384531`. Order: item 1 and item 16 deployed with the poller still off → plan run `NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round 1` (it now also stops if the sandbox BCBA or Contact `date_of_birth` is not text) → on the orchestrator's word, `... --round 1 --write` (a sandbox HubSpot write: BCBA `date_of_birth` = `1/15/1990`, decoy `dob` = `3/9/1975`, BT/RBT 1 Contact `date_of_birth` = `2/20/1992`) → read-back: BCBA `differs` [] → poller on (Zeke's word). Expected first runs: BCBA and BT/RBT 1 `noop` (CR already holds 1990-01-15 and 1992-02-20); an update with `dateOfBirth` in `changedFieldNames` (1980-07-04 or 1975-03-09) or an `error` is a fail: stop. Never run it with the old code (`655b385`) deployed and the poller on: that code reads `dob` and would send 1975-03-09. This refresh comes before R1-U1 (see the next bullet).
- Read-back (plan only): `NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round 1`. BCBA `emailVsContact` = matches the Contact, `personal_email` = the R1 value. Do **not** run round 1 `--write` during or after R1-U1: it sets the U1 values back to R1.
- Zeke says which re-enrollment triggers exist in the sandbox (decision 51). Without them, every edit below arrives only through the 5-minute poll (see "How each edit reaches Azure"); lines 1, 64, 67-69 and 73 need a webhook for their BR3/BR14, fan-out and K4 parts.
- Zeke, by hand on the CR screen (production writes), on client 5384589: add School 1052688 (BR19) and Pending 97151 Services 1156742 (CL4 retired label). Push 1 changes the Case labels, so its label POST removes 1156742 and keeps School. A `noop` run never touches labels, so the hand-adds must come before Push 1.

**What a push is.**
- Make all of the push's edits, check in HubSpot that each record (or its mirror / synced property) shows them, then wait for the poll (or webhook) so the worker sees them together; then read the logs and run the CR GET.
- Start the edits just after a poll (the schedule fires at :00, :05, :10 ... UTC) and finish them before the next one. A poll that fires halfway through a push makes an extra run with only part of the edits.
- The poll looks back to 5 minutes before the previous run, so every change is queued by two polls, and each writeback bumps the record once more: expect one or two extra runs per record ending `noop` (a record whose last status is `success` skips the CR GET, `employeeSyncWorkflow.mjs:1027-1030`; one in `waiting` or `error` still does a CR GET; a read, not a write).
- Start the next push only when every record of this one has a final run (no retry scheduled) and its `noop` follow-up. Every label change may first end `error` `CR_LABEL_POST_UNCONFIRMED` and pass on the 60 s / 300 s retry (round 1 finding 1); a retry reads the record as it is then, so an early next push would mix into it. Allow about 10-15 minutes per push.
- HS writeback, unless the line says otherwise: `last_sync_status` `success`, blank `last_sync_error`, on BT/RBT 1, the BCBA (since 2026-11-23: CR holds their Workday IDs) and the Case.
- One unreadable-value test per record per push, and the push that holds them (Push 6) has no edit that writes to CR; its restores follow in Push 7. If Zeke wants B9 and C8 in pushes of their own, split Push 6 into 6a (line 17) and 6b (line 65): 9 pushes.

**Stop rules.**
- If CR refuses a changed email (line 5 in Push 2, line 15 in Push 3; O-11), stop and ask Zeke before the next push: that record would send the email again, and fail, on every later run.
- Association pushes (3 and 4): if no Case run appears at the poll after the edit, the name rollups did not change the Case, and the change waits for the daily sweep (next 2026-11-24 08:00 UTC). Stop and ask Zeke: wait for the sweep, or let the next Case property edit carry it (that proves C14 but not BR18).
- BCBA: before Push 1 and before Push 3, read-back shows `email` and `personal_email` as set (the sandbox workflow "BCBA - Work Email Becomes Primary" may move them; if it did, stop and ask Zeke).

### Summary

| Push | Records | Old # (lines) | Edits | CR write | Expected log outcome |
|---|---|---|---|---|---|
| 1 | BT/RBT 1, BCBA, Case | 1-2, 6-8; 19-29; 31-55 | 41 | yes | One update per record. BT/RBT 1 `success` (two messages from line 1: one write, second `noop` or `SYNC_IN_PROGRESS`); BCBA `success` although the checklist is ticked (CR holds its Workday ID), update sent; Case `success` with the staff U1 names |
| 2 | BT/RBT 1, BCBA, Case | 5; 30; 56, 58 | 4 | yes (BT/RBT 1 email; BCBA an update call with no value change) | BT/RBT 1 update, `changedFieldNames` only the email; BCBA update call, `changedFieldNames` only `identity.checklistTicked`, stays `success`; Case `noop` |
| 3 | BT/RBT 1, BCBA, Case (associations only) | 3-4, 9-10; 15; 60-61, 63 | 8 | yes | BT/RBT 1 update, `success` although the checklist is ticked; BCBA update (email); Case update from the association change, `source` intakePoller (or dailySweep) |
| 4 | BT/RBT 1, BCBA, Case (association only) | 12; 16; 62 | 3 | yes | BT/RBT 1 labels to CO; BCBA `changedFieldNames` only 138069; Case update 138092 blank |
| 5 | BT/RBT 1, Guardian Contact, Case | 13; 57, 64, 67-71 | 8 | yes | BT/RBT 1 update call, role labels unchanged; Case update with the Guardian values and 131151 blank; fan-out queued 1 Case |
| 6 | BCBA, Guardian Contact | 17; 65 | 2 | no | Both runs `error` `UNREADABLE_VALUE`, no `update`/`metadata`/`labelPost`; neither value in any log line |
| 7 | BT/RBT 1, BCBA, Guardian Contact, Case | 11, 14; 18; 72-73, 66, 59 | 7 | BT/RBT 1 only, an update call with no value change (line 11) | Every other run `noop`; employees and Case back to `success`; `contactFanOut` `skipped` `test_record`, queued 0 |
| 8 | Guardian Contact, Case | 74; 75-76 | 3 | yes | Case update 133826 "Level 3" although Entered is blank, `success` |

Total 76 edits.

### Push 1: BT/RBT 1, BCBA, Case; 41 edits; CR write yes; expected one update per record, all three `success`

Order: the BT/RBT 1 and BCBA edits first (lines 6 and 22 feed the Case staff names in the same Case run), then the Case. Before waiting, check the BT/RBT `gender` and `street_home` mirrors (lines 7, 8) and the BCBA `address` mirror (line 23) show the U1 values. Line 1 needs the entry and linked-refresh webhooks for its BR3/BR14 part. BCBA Entered stays No from here on (line 19); lines 15-18 later run with it (BR5: a linked record syncs whatever Entered holds).

| Old # | Old push | Record | Property | R1 now | U1 | Req | Expected |
|---|---|---|---|---|---|---|---|
| 1 | P1 | BT/RBT 1 | `entered_in_centralreach` | Yes | Yes - Generic | BR12, BR3/BR14 | No CR change by itself. If the entry and linked-refresh workflows both fire: two messages, one CR write, second run `noop` or `SYNC_IN_PROGRESS` |
| 2 | P1 | BT/RBT 1 | `home_apt` | Apt 1C | blank | T5, BR12 | CR address line 2 blank; still active in CR |
| 6 | P4 | BT/RBT 1 | `last_name` | Swanson Azure Test R1 | Swanson Azure Test R1 U1 | T2 | CR last name. Case Meta 131313 follows in this push's Case run (line 31) |
| 7 | P4 | BT/RBT 1 Contact 264372496241 | `gender_employee` and `gender` | female | male | T3 | After the BT/RBT `gender` mirror shows male: CR gender Male |
| 8 | P4 | BT/RBT 1 Contact 264372496241 | `address` | 103 Azure BT St | 103 Azure BT St U1 | T4, K5 | After `street_home` shows it: CR address line 1 |
| 19 | P14 | BCBA | `entered_in_centralreach` | Yes | No | BR5 | No CR change by itself |
| 20 | P14 | BCBA | `gender_new` | Male | Female | B6, BR5 | CR gender Female, sent although Entered = No |
| 21 | P15 | BCBA | `bcba_in_cr_checklist` | blank | External System ID | BR10 (CR holds the Workday ID) | HS `success`, blank error: CR holds `0498374` = `workday_id`, so the first row of rule 5.4 wins (`syncDecisions.mjs:28-31`). The update is sent with lines 20, 22 to 29. The checklist-error case is R-WD round 4, optional steps 4-5 on the BCBA |
| 22 | P15 | BCBA | `last_name` | Swanson BCBA Azure Test R1 | Swanson BCBA Azure Test R1 U1 | B3 | CR last name. Case Meta 131314 follows in this push's Case run (line 31) |
| 23 | P15 | BCBA Contact 264352124460 | `address` | 104 Azure BCBA St | 104 Azure BCBA St U1 | B7 | After the BCBA `address` mirror shows it: CR address line 1 (the email mirror does not run in the sandbox; if `address` does not follow, stop) |
| 24 | P15 | BCBA | `medicaid_id__ny` | AZTNY001 | blank | B8 | Meta 126216 blank |
| 25 | P15 | BCBA | `work_status` | Salaried | Hourly | B10 | Salaried 1132653 removed |
| 26 | P15 | BCBA | `location` | New York | New Jersey | BL2 | NY 1132655 removed, NJ 1107686 added |
| 27 | P15 | BCBA | `lba_licensure__ny` | Yes | In Process | BL4 | LBA NY 1052629 removed; LBA NJ 1124245 kept |
| 28 | P15 | BCBA | `ny_insurance_labels` | MCD FFS-NY | blank | BL5 | NY Medicaid 1107647 removed |
| 29 | P15 | BCBA | `cr_billing_hold_label` | Yes | No | BL7 | Billing Hold 1103437 removed |
| 31 | P17 | Case | `phi_last_name` | Swanson Azure Test R1 | Swanson Azure Test R1 U1 | C2 | `LastName`. Same run: Meta 131313 "Jane Swanson Azure Test R1 U1", 131314 "Zeke Swanson BCBA Azure Test R1 U1" (lines 6, 22); no `ExternalSystemId` sent (C5, BR22) |
| 32 | P17 | Case | `phi_date_of_birth` | 2016-01-15 | 2016-01-16 | C3 | `DateOfBirth` 2016-01-16 |
| 33 | P17 | Case | `phi_gender` | male | female | C4 | `Gender` Female |
| 34 | P17 | Case | `street_address` | 101 Azure Test St | 101 Azure Test St U1 | C8 | address line 1 |
| 35 | P17 | Case | `hubspot_owner_id` (workflow writes `care_coordinator_name`; set it by hand if it does not) | 161391908 / Zeke Swanson | 167266469 / Akiera Conner | C10 | Meta 138851 "Akiera Conner"; no owners API call |
| 36 | P17 | Case | `ongoing_central_reach_provider_supplier` | Azure Test Supervising 1 | Azure Test Supervising 1 U1 | C12 | Meta 131308 |
| 37 | P17 | Case | `work_schedule_details` | AzT 1 Sched 1 Mon-Fri 9-12 | + " U1" | C17 | Meta 132304 |
| 38 | P17 | Case | `btrbt_work_schedule_2_details` | AzT 1 Sched 2 Sat 10-1 | + " U1" | C17 | Meta 138093 |
| 39 | P17 | Case | `client_service_hours_total` | 20 | 22 | C19 | Meta 126209 "AzT 1 weekdays after 3pm, 22" |
| 40 | P17 | Case | `hours_bt_work_schedule_1` | 10 | 11 | C20 | Meta 134331 = 17 (never 18, 12, 24 or 2) |
| 41 | P17 | Case | `initial_auth_tracks` | Prior Authorization Required | No Prior Authorization Required | C22 | Meta 132431 "6" |
| 42 | P17 | Case | `ongoing_auth_period_start_date` | 2026-11-01 | blank | C23 | Meta 134672 "04/30/2027" |
| 43 | P17 | Case | `specific_home_location` | Child's House | Other Location | C24, CL2 | Meta 137697 "200 Service Rd, Suite 1, New York, 10002"; Home 1052656 removed |
| 44 | P17 | Case | `allergies` | Confirmed | Denial | C26 | Meta 126214 "No" |
| 45 | P17 | Case | `maladaptive_behaviors__parentguardian` | Aggression | Other | C27 | Meta 126207 = the stored value; 132303 unchanged |
| 46 | P17 | Case | `insurance_primary` | Medicaid FFS | UHC | C29, CL5 | Meta 126210 = the stored UHC value; no funding label (no UHC 1052534) |
| 47 | P17 | Case | `insurance_2` | Cigna | Beacon-Carelon | C30 | Meta 144600 = the stored carrier (summary not used) |
| 48 | P17 | Case | `n1_what_type_of_insurance` | Medicaid FFS | Commercial Enrolled | C31 | Meta 131151 "Dr AzT 1 Commercial, 2000000001" |
| 49 | P17 | Case | `referring_provider_medicaid_id` | AZTMCD001 | AZTMCD001U1 | C32 | Meta 141233 |
| 50 | P17 | Case | `phi_diagnosis` | Yes | Unsure | C33 | Meta 144793 = option text + ", AzT 1 dx note" (O-28) |
| 51 | P17 | Case | `most_recent_asd_diagnosis_date_1` | 2025-03-10 | 2025-03-11 | C34 | Meta 131195 "03/11/2025" |
| 52 | P17 | Case | `most_recent_asd_diagnosis_date_medicaid` | 2025-04-11 | 2025-04-12 | C34 | Meta 138701 "04/12/2025" |
| 53 | P17 | Case | `phi__policy_holder_dob` | 1985-06-20 | 1985-06-21 | C35 | Meta 137667 "06/21/1985" |
| 54 | P17 | Case | `case_status` (stage-driven; move the stage if it will not hold) | Warm | Cold | CL3 | Active Client 1125427 removed, In-Active 1121488 added |
| 55 | P17 | Case | `staffing_status` (stage-driven) | Staffed 97153 | Hot Lead | CL4, BR19 | 1156746 and the hand-added 1156742 removed; School 1052688 kept; no staffing label |

### Push 2: BT/RBT 1, BCBA, Case; 4 edits; CR write yes (BT/RBT 1 email only); expected BT/RBT 1 update, BCBA and Case `noop`

The BT/RBT 1 email goes alone on its record (`changedFieldNames` only the email). The BCBA and Case edits each expect `noop`, so nothing else goes on those records.

| Old # | Old push | Record | Property | R1 now | U1 | Req | Expected |
|---|---|---|---|---|---|---|---|
| 5 | P3 | BT/RBT 1 | `email` (record; Contact left alone) | zeke+bt_azure_test_1@optidge.com | zeke+bt_azure_test_1_u1@optidge.com | T2 (email), O-11 | CR `primaryEmail` = U1; `changedFieldNames` only the email. If CR refuses: `error` "CentralReach rejected the request" (record for O-11; stop rule). Before the run HS shows the U1 value; if a sync put the Contact email back, stop |
| 30 | P16 | BCBA | `bcba_in_cr_checklist` | External System ID | blank | BR10 (CR holds the Workday ID) | HS stays `success`, blank error. Not a `noop`: `changedFieldNames` only `identity.checklistTicked` (`employeeSyncWorkflow.mjs:760-763`), one update call to `5384531` that changes no CR value |
| 56 | P18 | Case | `n1_what_type_of_insurance` | Commercial Enrolled | Commercial OON | C31 | Same commercial pair: `noop`, no CR write |
| 58 | P20 | Case | `staffing_status` | Hot Lead | Pending 97151 Services | CL4 (retired) | No staffing label; `noop`, no CR write |

### Push 3: BT/RBT 1, BCBA, Case associations; 8 edits; CR write yes; expected BT/RBT 1 update with `success` (checklist ticked, CR holds the Workday ID), BCBA update, Case update from the association change

Lines 60, 61 and 63 are **association-only**: they reach Azure at this poll only if a name rollup changes the Case (`current_primary_bt` and `current_primary_bt_2` for 60-61, `reassessment_bcba_name` for 63, assumed to follow RE BCBA), otherwise at the daily sweep (stop rule). Make them with the Case workflow off (BR18) and with no Case or Guardian property edit in the push, or a property edit would carry them instead. The BCBA email goes alone on its record.

| Old # | Old push | Record | Property | R1 now | U1 | Req | Expected |
|---|---|---|---|---|---|---|---|
| 3 | P2 | BT/RBT 1 | `entered_in_centralreach` | Yes - Generic | No- Made Inactive | BR12 | No CR change by itself |
| 4 | P2 | BT/RBT 1 | `apartment__work` | Suite 1 | blank | T6, BR12 | Meta 133819 = "105 Work Plaza, New York, NY 10005"; still active in CR |
| 9 | P5 | BT/RBT 1 | `btrbt_in_cr_checklist` | blank | External System ID | BR10 (CR holds the Workday ID) | HS `success`, blank error: CR holds `4837593` = `workday_id` (`syncDecisions.mjs:28-31`). The update is sent with lines 4, 10. The checklist-error case is R-WD round 4, optional steps 4-5 on the BCBA |
| 10 | P5 | BT/RBT 1 | `bt_rbt_type` | BT | RBT | TL3 U1a | Label RBT NY 1052631 added, BT NY 1052630 removed |
| 15 | P10 | BCBA | `email` (record; BCBA Contact left alone) | zeke+bcba_azure_test_1@optidge.com | zeke+bcba_azure_test_1_u1@optidge.com | B4, O-11 | CR `primaryEmail` = U1 (first live changed-email test); Meta 138069 unchanged. If CR refuses: `error` "CentralReach rejected the request" (O-11; stop rule) |
| 60 | P22 | Case to BT/RBT 1 | association label | Primary BT 1 (238) | Primary BT 2 (240) | C14, BR17, BR18 | With the Case workflow off (BR18). Meta 131313 "Jill Swanson Azure Test R1", 138092 "Jane Swanson Azure Test R1 U1"; Log `source` intakePoller or dailySweep |
| 61 | P22 | Case to BT/RBT 2 | association label (keep 242 and unlabeled) | Primary BT 2 (240) | Primary BT 1 (238) | C14, BR17 | (same run as line 60) |
| 63 | P24 | Case to BCBA 2 | association label (keep 251, 249) | RE BCBA (229) | removed | C11 | Meta 144602 blank; 131314 unchanged (same run as line 60) |

### Push 4: BT/RBT 1, BCBA, Case association; 3 edits; CR write yes; expected BT/RBT 1 labels to CO, BCBA 138069 only, Case 138092 blank

Line 62 is **association-only** (rollup `current_primary_bt_2`), same rule as Push 3. BT/RBT 1 stays `success` (checklist still ticked; CR holds its Workday ID).

| Old # | Old push | Record | Property | R1 now | U1 | Req | Expected |
|---|---|---|---|---|---|---|---|
| 12 | P7 | BT/RBT 1 | `location` | New York | Colorado | TL1, TL3 U1b | CO 1107687 and RBT CO 1107692 added; NY 1132655 and RBT NY 1052631 removed; 1052618, 1052643 kept |
| 16 | P11 | BCBA | `personal_email` | zeke+bcba_personal_1@optidge.com | zeke+bcba_personal_1_u1@optidge.com | B9 | Meta 138069 = U1; `changedFieldNames` only 138069 |
| 62 | P23 | Case to BT/RBT 1 | association label | Primary BT 2 (240) | removed | C14, BR17 | Meta 138092 blank; 131313 Jill |

### Push 5: BT/RBT 1, Guardian Contact, Case; 8 edits; CR write yes; expected BT/RBT 1 update call, Case update with the Guardian values, fan-out queued 1 Case

Before waiting, check the Case shows the Guardian `phone`, `email`, names and `location`. The fan-out lines need the Contact webhook; through the poll the Case values still arrive, but no fan-out line is logged. `test_record` is still blank here (it is set in Push 7).

| Old # | Old push | Record | Property | R1 now | U1 | Req | Expected |
|---|---|---|---|---|---|---|---|
| 13 | P8 | BT/RBT 1 | `bt_rbt_type` | RBT | blank | TL3 U1c | Role labels left as they are (RBT CO 1107692 kept, none added); update call still made |
| 57 | P19 | Case | `n1_what_type_of_insurance` | Commercial OON | Unsure | C31 | Meta 131151 blank |
| 64 | P25 | Guardian Contact 264366211603 | `phone` | (212) 555-0101 | +1 (212) 555-0121 | K1, K2, C8 | After the Case `phone` follows: CR cell phone 2125550121; fan-out queued 1 Case, no BCBA (Contact webhook only) |
| 67 | P28 | Guardian Contact | `email` | zeke+swanson_azure_test_1@optidge.com | zeke+swanson_azure_test_1_u1@optidge.com | K1, K2, C6 | `PrimaryEmail` = U1 |
| 68 | P29 | Guardian Contact | `firstname` | Don Azure Test R1 | Ron Azure Test R1 | K1, K2, C7 | `GuardianFirstName` |
| 69 | P30 | Guardian Contact | `lastname` | Swanson | Swanson U1 | K1, K2, C7 | `GuardianLastName` |
| 70 | P31 | Guardian Contact | `location` | New York | New Jersey | CL1 | (same run as line 71) |
| 71 | P31 | Guardian Contact | `state_dropdown` | New York | New Jersey | CL1 | After the Case `location` follows: NY Client 1082499 removed, NJ 1132647 added |

### Push 6: BCBA, Guardian Contact; 2 edits; CR write no; expected both runs `error` `UNREADABLE_VALUE`

The two unreadable-value tests, one per record, and nothing else: no run in this push should write to CR.

| Old # | Old push | Record | Property | R1 now | U1 | Req | Expected |
|---|---|---|---|---|---|---|---|
| 17 | P12 | BCBA | `personal_email` | U1 | azure-test-not-an-email | B9 (decision 43) | error Unreadable value: personal_email, no CR write (`UNREADABLE_VALUE`; no `update`/`metadata`/`labelPost` in `crCalls`; value in no log line). GET: 138069 still U1 |
| 65 | P26 | Guardian Contact | `phone` | +1 (212) 555-0121 | 555-01 | C8 (decision 43) | error Unreadable value: phone, no CR write (`UNREADABLE_VALUE`; `555-01` in no log line). GET: cell phone still 2125550121 |

### Push 7: BT/RBT 1, BCBA, Guardian Contact, Case; 7 edits; CR write: BT/RBT 1 update call only, no value change; expected every other run `noop`, `contactFanOut` `skipped`

The restores for Push 6, with the other edits that expect `noop`. BT/RBT 1 is the exception since 2026-11-23: line 11 is a changed field, so its run sends one update call that changes no CR value. Order: line 72 first and check it shows true, then the rest. Line 73's trigger can be the line 66 phone restore if Zeke's Contact webhook triggers on `phone` (the Case still gets it through the poll and ends `noop`). If the trigger is a different property that syncs to the Case, the Case run is no longer a `noop`: move lines 72-73 to a push of their own.

| Old # | Old push | Record | Property | R1 now | U1 | Req | Expected |
|---|---|---|---|---|---|---|---|
| 11 | P6 | BT/RBT 1 | `btrbt_in_cr_checklist` | External System ID | blank | BR10 (CR holds the Workday ID) | HS stays `success`, blank error. Not a `noop`: `changedFieldNames` only `identity.checklistTicked` (`employeeSyncWorkflow.mjs:760-763`), one update call to `5384530` that changes no CR value |
| 14 | P9 | BT/RBT 1 | `bt_rbt_type` | blank | BT to RBT | TL3 U1d | Role labels unchanged; warning `unmapped_bt_rbt_type`. Same required labels as line 13, so no label change (same run as line 11) |
| 18 | P13 | BCBA | `personal_email` (restore) | azure-test-not-an-email | zeke+bcba_personal_1_u1@optidge.com | B9 | `noop`, no CR write; HS back to `success` (from the Push 6 `error`) |
| 72 | P32 | Guardian Contact | `test_record` | blank | true | K4 | Nothing by itself |
| 73 | P32 | Guardian Contact | one property Zeke's Contact webhook triggers on, ideally one not synced to the Case | as is | any | K4 | `contactFanOut` `skipped`, `test_record`, queued 0. Needs the Contact webhook. A property that syncs to the Case still reaches CR through the Case poll (that is the Case path, not K4) |
| 66 | P27 | Guardian Contact | `phone` (restore) | 555-01 | +1 (212) 555-0121 | C8 | `noop`, no CR write; HS back to `success` |
| 59 | P21 | Case | `staffing_status` | Pending 97151 Services | Starting 97153 Services | CL4 (retired) | No staffing label; `noop`, no CR write |

### Push 8: Guardian Contact, Case; 3 edits; CR write yes; expected Case update 133826 although Entered is blank, `success`

Last, so no earlier Case test runs with Entered blank.

| Old # | Old push | Record | Property | R1 now | U1 | Req | Expected |
|---|---|---|---|---|---|---|---|
| 74 | P33 | Guardian Contact | `test_record` (restore, housekeeping; not in the matrix) | true | blank | K4 | No CR change |
| 75 | P34 | Case | `enter_in_central_reach` | Yes | blank | BR5 | No CR change by itself; leave blank or set back on Zeke's word |
| 76 | P34 | Case | `severity_level_clinical` | Level 2 | Level 3 | C28, BR5 | Meta 133826 "Level 3", sent although Entered is blank |

**Not placed.** C36 `referral_source` U1 "Care manager": the guide makes it read-only and names no source, so it cannot be set (R1 read-back: blank). B5 has no U1 (U2 only).

### How each edit reaches Azure (from the code, `655b385`)

- **Poll** (`src/functions/intakePoller.mjs:28-29`, default `0 0 * * * *`; since 2026-11-23 `INTAKE_POLLER_SCHEDULE` = `0 */5 * * * *`, every 5 minutes, see "Before the first push"; `intakePoller.mjs:31-47`). Per object (Case, BT/RBT, BCBA, `src/workflows/intakePollerWorkflow.mjs:76-105`) it searches `sandbox_test_field` = true, Case stage not excluded, and (CR ID filled OR Entered = Yes) (`:110-119`), with `hs_lastmodifieddate` at or after the saved checkpoint (`:192-209`, `:254-258`). The checkpoint ends each run at now minus 5 minutes (`:48`, `:269-274`). All three R1 records are linked, so **any property change on them is picked up at the next poll**, whatever Entered holds (BR5, BR12). No skip window in the worker: it compares hashes and sends or ends `noop` (`src/workflows/clientSyncWorkflow.mjs:584-617`, `src/workflows/employeeSyncWorkflow.mjs:1024-1084`), and logs "Change found by the poller or the daily sweep, not delivered by a webhook." (`src/lib/mappedState.mjs:10-16`). Its own writeback bumps the record, so the next poll queues it again and ends `noop` (employees in `waiting` still do a CR GET each time, `employeeSyncWorkflow.mjs:1027-1030`: a read, not a write).
- **Contact edits** reach the poll only through the record they change: BT/RBT and BCBA mirror properties (`src/mappings/employees/employeeProperties.mjs:38-45`, `:87-92`) and the Case's Contact-synced `email`, `phone`, guardian names and `location` (`src/mappings/client/clientProperties.mjs:23-34`). The poller never searches Contacts. Assumption: the mirror or sync write updates the record's `hs_lastmodifieddate`; check the record shows the value before waiting.
- **Daily sweep** (`intakePollerWorkflow.mjs:7-8`, `:53`, `:312-402`): the first run at or after 08:00 UTC queues every linked record once a day. Today's ran at 15:43.
- **Needs a HubSpot trigger (webhook) instead:**
  - BR3/BR14 (line 1, Push 1): two webhooks by definition.
  - K1's "fan-out queued 1 Case" and K4 (lines 64, 67-69 in Push 5; 73 in Push 7): `hubspotWebhook.mjs:129-137` → `contactFanOutWorkflow.mjs:83-131`. Through the poll the Case values still arrive, but no fan-out line is logged.
  - Association edits (lines 60-61, 63 in Push 3; 62 in Push 4): an association change alone does not change `hs_lastmodifieddate` (assumption). The code reads associations on every Case run (`clientSyncWorkflow.mjs:478-505`; the staff names come from the associated records, not the rollups), but the Case is only queued when a name rollup (`supervising_bcba_name`, `ia_bcba_name`, `reassessment_bcba_name`, `current_primary_bt`, `current_primary_bt_2`, `clientProperties.mjs:86-97`, the `signalOnly` list) changes the Case, or by the sweep. BR18 wants exactly this path, with the Case workflow off.
  - Staff name cross-effects (lines 6, 22 → Case 131313/131314) land in the same Push 1 Case run, because the Case run reads the names from the staff records; make the staff edits before the Case edits.
- **Longest wait:**
  - A record edit waits up to about 6 minutes on the 5-minute poll (the next poll, or the one after if HubSpot search had not shown it yet). Add the 60 s / 300 s label retries.
  - An association edit with no rollup change waits until the next sweep: up to about 24 hours (2026-11-24 08:00 UTC for edits made today).
  - 8 pushes at about 10-15 minutes each: about 1.5 to 2 hours. On the hourly default it would be about 8 hours.

### Steps that write to production CentralReach

- **CR updates** (old line numbers, push in brackets): 1-2, 6-8, 19-29, 31-55 [1]; 5 [2]; 3-4, 9-10, 15, 60-61, 63 [3]; 12, 16, 62 [4]; 13 (update call, role labels unchanged), 57, 64, 67, 68, 69, 70-71 [5]; 75-76 [8].
- **By hand on the CR screen (Zeke):** School 1052688 and Pending 1156742 before Push 1.
- **Update call with no CR value change** (since 2026-11-23, checklist-only change): 30 [2]; 11 with 14 [7].
- **No CR write expected:** 56, 58 [2]; 17, 65 [6]; 18, 59, 66, 72-73 [7]; 74 [8]. Push 6 writes nothing.

## R-WD (new records, not yet created)

Planned 2026-11-23, plan only: nothing created, nothing run. Zeke: "We will do a Workday ID test on a new set of test records." Then, the same day: "One split pair" and "Make the workday id radom 7 digits." This replaces the earlier two-round plan (round 4 blank, round 5 `--workday` with AZTEST values). The script's `--workday` flag is removed; it now stops with a message if given.

**Round 4, New York (R1 values), one split pair.** The R1 employees cannot show the `waiting` path any more (CR holds their Workday IDs, see the R1-U1 note), so round 4 gets a new BT/RBT 1 + BCBA pair (matrix row R-WD):
- BT/RBT 1 is created with `workday_id` filled: the create path with a Workday ID.
- The BCBA is created with `workday_id` blank: the temporary-ID path, then a Workday ID added while CR still holds the temporary ID.

`create-test-records.mjs --round 4 --write` makes the whole round as usual (four Contacts, BCBA, BCBA 2, BT/RBT 1, BT/RBT 2, Case), with no new code path. The Contacts are needed: the employee address and phone fields mirror from them. **Only BT/RBT 1 and the BCBA are pushed.** The Case, BCBA 2 and BT/RBT 2 stay in HubSpot with Entered in CentralReach blank. An employee run reads only its own record, so the Case is not pushed in this round. Every CR write needs Zeke's go-ahead at its step.

**Workday IDs.** Fixed here and in the script (`WORKDAY_ROUNDS` in `create-test-records.mjs`). They are random 7-digit values. They do not start with `10` or `20`, because real Workday IDs do (`DECISIONS-EVIDENCE-EMPLOYEES-2026-11-23.md`, item O-8). They are 7 digits rather than the guide's AZTEST format (guide extract line 201) because of Zeke's decision; an AZTEST value would also fail the `^\d{7}$` check that O-8 recommends.

| Record | `workday_id` | Set when, by whom |
|---|---|---|
| BT/RBT 1 | `4465360` | At create, by the script |
| BCBA | `7167221` | Step 3, by Zeke in HubSpot, after the BCBA push |

Collision check, 2026-11-23, read-only:
- Production HubSpot 50317927 (portal checked first; GET and search only). BT/RBT `workday_id` equal to the value: 0 for each value. BCBA: 0 for each value.
- CR, `GET /contacts/employee/byExternalSystemId`: 404 for both values.
- Controls in the same script, so a 0 or a 404 means "none": `4837593` found CR employee `5384530`, and `2002628` found 1 BT/RBT and 1 BCBA in HubSpot.

`--write` saves `"workdayIds": { "bt1": "4465360" }` and `"bcbaWorkdayIdLater": "7167221"` in `round-4.json`. `check-cr-record.mjs` reads only `workdayIds`. So it expects `4465360` on BT/RBT 1, and the HubSpot record ID on the BCBA before and after step 3 (CR keeps the temporary ID).

**Create (do NOT run without Zeke's go-ahead).** Plan only first (no write), then create (HubSpot sandbox writes only; no CR write until Entered is set):

```
NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round 4
NODE_USE_ENV_PROXY=1 node scripts/sandbox/create-test-records.mjs --round 4 --write
```

The plan run prints `workday_id: 4465360 on BT/RBT 1; blank on the BCBA (Zeke sets 7167221 after its push).` It must not list `workday_id` on `bt1` as read-only or NOT FOUND, and the `--write` read-back must not list `workday_id` in `bt1` `differs`. If either happens, stop.

### Steps

Each step is one edit by Zeke in sandbox HubSpot. HS means `last_sync_status` / `last_sync_error` on the record.

| Step | Record | Edit | Req | Expected |
|---|---|---|---|---|
| 1 | BT/RBT 1 (R4) | `entered_in_centralreach` = Yes (the push) | T2 (Workday path) | Before the create, both lookups find nothing: the record ID, then `4465360` (`employeeSyncWorkflow.mjs:841-848`, `syncDecisions.mjs:53-66`). Create with External System ID = `4465360` (`buildEmployeePayload.mjs:25-31`). HS `success`, blank error: `waiting` only when `workday_id` is blank (`employeeSyncWorkflow.mjs:1137-1141`). No temporary ID. Check: `--round 4 --record bt1`, T2 PASS with `4465360` |
| 2 | BCBA (R4) | `entered_in_centralreach` = Yes (the push) | BR2, B2 | Create with External System ID = the BCBA's HubSpot record ID (`buildEmployeePayload.mjs:25-31`). HS `waiting`, "Waiting for the Workday ID" (`src/constants/syncReasons.mjs:32`, set at `employeeSyncWorkflow.mjs:1140-1141`). Check: `--round 4 --record bcba`, B2 PASS with the HubSpot record ID |
| 3 | BCBA (R4) | `workday_id` = `7167221`; checklist unticked. **Nobody changes CR by hand** | BR10, BR3 | Reaches Azure at the next 5-minute poll (the sandbox webhooks fire only on create and on Entered = Yes, as recorded earlier in this log). One update: Log `operation: 'update'`, one PUT to the step 2 CR employee, `changedFieldNames` includes `identity.workdayId` (`employeeSyncWorkflow.mjs:760-763`). The update sends back the temporary ID CR holds (`centralReachClient.mjs:499-510`). Warning "HubSpot workday_id differs from the Central Reach External System ID." (`employeeSyncWorkflow.mjs:1064`). HS `waiting`, "Replace the temporary External System ID in CentralReach with the Workday ID, then tick the checklist." (`src/constants/syncReasons.mjs:34-35`; rule 5.4 at `syncDecisions.mjs:33-38`). No second employee: the linked path does no lookup and no create (`employeeSyncWorkflow.mjs:770`). Checks: `--round 4 --record bcba`, same CR employee, B2 still the HubSpot record ID; `--round 4 --record bcba --workday-id 7167221` must stop with "No CR employee holds External System ID 7167221" (that stop, exit 1, is the PASS) |

Optional, Zeke's call. These steps are not in the split-pair decision. They keep BR10 (checklist) covered, on the BCBA only (BT/RBT 1 holds its Workday ID, so a tick there gives `success`):

| Step | Record | Edit | Req | Expected |
|---|---|---|---|---|
| 4 | BCBA (R4) | Tick "External System ID" in `bcba_in_cr_checklist`; CR still untouched | BR10 (checklist) | HS `error`, "Checklist is ticked but CentralReach still holds the temporary External System ID." (`syncReasons.mjs:37-38`, `syncDecisions.mjs:40-41`); the update is still sent; External System ID unchanged |
| 5 | BCBA (R4) | Untick the checklist | BR10 (checklist) | HS back to `waiting` with the step 3 sentence (`syncDecisions.mjs:33-38`) |

**Stop rules.**
- Step 1 ends `waiting`, "A CentralReach employee already holds this Workday ID." (`employeeSyncWorkflow.mjs:858-873`, `syncReasons.mjs:52-53`). Nothing is created. Stop and ask Zeke.
- Step 1 ends `waiting`, "Waiting for the Workday ID": the run read `workday_id` as blank. Stop.
- Step 3 creates a second employee or changes the External System ID in CR. Stop.

**Checks** (CR GET only), in order:

```
# after step 1
NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 4 --record bt1
# after step 2
NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 4 --record bcba
# after step 3, once the poll has run
NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 4 --record bcba
NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-record.mjs --round 4 --record bcba --workday-id 7167221
```

Logs for step 3: `record-timeline.kql` with the BCBA's HubSpot record ID (the update, `changedFieldNames` and the warning).

**After R-WD.** Zeke makes the two R4 employees inactive on the CR screen and logs the IDs (guide extract line 203). CR keeps `4465360` on BT/RBT 1 as its External System ID for good; the collision check above shows it is no real Workday ID.

**Risks.** The CR employee holding `4465360` is permanent. If Workday ever issues that ID to a real employee, the integration finds the test employee instead (the step 1 stop rule, in production). The `10` / `20` ranges make that unlikely, not impossible.

### R-WD run, 2026-11-23

Run by a background agent on Zeke's go-ahead ("I wnat you to have a background work run the steps 1-4 pleas.e Report back with findings and questions"). Deployed commit 655b385, 5-minute poller. Sandbox 52311591 confirmed before every HubSpot write. Optional steps 4-5 (checklist) were not run. All times UTC.

```
Create (plan, then --write), 18:58-19:00
  Plan only: workday_id 4465360 on BT/RBT 1, blank on the BCBA; NOT FOUND only sandbox_test_field on the
    four Contacts (known false alarm). The script never sets entered_in_centralreach.
  --write IDs: Contacts guardian 264973164573, BCBA 264970306108, BT1 264973389164, BT2 264834972464;
    BCBA 67208227438, BCBA 2 67207445040, BT/RBT 1 67208455469, BT/RBT 2 67208375838, Case (deal) 68592605796.
  Read-back: deal differs [] (blankMirrors referral_source, C36 as in R1); bcba differs [],
    emailVsContact "matches the Contact"; bt1 differs []. "Entered in CentralReach is blank on every record."
    Saved to sandbox-rounds/round-4.json.

Step 1 (plan table) - BT/RBT 1 67208455469, entered_in_centralreach = "Yes" at 19:00:33 (T2, Workday path)
  Webhooks 19:00:57 and 19:01:00 (two for one change). First run 19:01:04: operation create,
    crCalls lookup 404, lookup 404, create 200, labelRead 200, metadata 200 x2; labels confirmed: true
    (no label POST, so no CR_LABEL_POST_UNCONFIRMED); writeback success.
  Second message 19:01:00: SYNC_IN_PROGRESS (lease held), crCalls [], retry +60 s -> 19:02:00 noop.
  19:05 poll: noop, crCalls [].
  HubSpot: last_sync_status success, last_sync_error blank, employee_id 5385357.
  check-cr-record.mjs --round 4 --record bt1: PASS 17, FAIL 1, SKIP 3
    External System ID 4465360 (T2 PASS); no temporary ID.
    FAIL T7 Meta 147882 expected "1" got ""  (HubSpot active_cases_count blank in the sandbox: the same
      test-data gap as R1, line 103 above; the code correctly sent nothing)
    Labels held [1052618, 1052630, 1052643, 1132655]; nothing missing or extra.
  Result: PASS (T2). T7: test-data gap.

Step 2 - BCBA 67208227438, entered_in_centralreach = "Yes" at 19:01:58 (BR2, B2)
  Webhook 19:02:15. Run 19:02:25: operation create, reasonCode WAITING_FOR_WORKDAY_ID,
    crCalls lookup 404, create 200, labelRead 200 x2, labelPost 200 (10 IDs), labelRead 200, metadata 200 x5;
    labels confirmed: true; writeback waiting.
  HubSpot: waiting, "Waiting for the Workday ID", employee_id 5385360.
  check-cr-record.mjs --round 4 --record bcba: PASS 26, FAIL 0, SKIP 3 (B1 screen, B11 O-17, BL3 O-6)
    B2 External System ID 67208227438. Extra label 1052549 "Admin" (set by the contact form, as in R1).
  Result: PASS.

Step 3 - BCBA 67208227438, workday_id = "7167221" at 19:03:46; checklist unticked; CR not touched (BR10, BR3)
  Arrived by WEBHOOK at 19:03:50 (source hubspotWorkflow), not by the poll: the sandbox BCBA workflow
    re-enrolls on workday_id (the plan expected the poll only).
  19:03:51 warning "HubSpot workday_id differs from the Central Reach External System ID." (crContactId 5385360)
  Run 19:03:52: outcome waiting, reasonCode REPLACE_TEMPORARY_ID, operation update,
    changedFieldNames ["employee.externalSystemId","identity.workdayId"],
    crCalls lookup 200, update 200, labelRead 200 (no create, no label POST; skipWindowHeldBack true);
    writeback waiting.
  19:05 poll: outcome noop, crCalls lookup 200 only, the warning logged again, no writeback.
  HubSpot: waiting, "Replace the temporary External System ID in CentralReach with the Workday ID, then
    tick the checklist.", employee_id 5385360.
  check-cr-record.mjs --round 4 --record bcba: PASS 26, FAIL 0, SKIP 3; same CR employee 5385360,
    B2 still 67208227438.
  check-cr-record.mjs --round 4 --record bcba --workday-id 7167221: "Stopped: No CR employee holds External
    System ID 7167221 (the Workday ID)." (the PASS: no second employee, ID unchanged).
  Result: PASS.

Logs: record-timeline.kql for 67208227438 and 67208455469 (--offset 2h), no exceptions.
Not pushed (Entered blank): Case 68592605796, BCBA 2 67207445040, BT/RBT 2 67208375838.
CR writes made: create 5385357 (BT/RBT 1), create 5385360 + label POST + metadata (BCBA), one update to 5385360.
```

Notes:
- The "linked path does no lookup" wording above means no lookup by External System ID before a create. The `lookup 200` in steps 3 and the poll is the read of the linked employee by its CR ID, which every linked run does.
- `changedFieldNames` holds `employee.externalSystemId` as well as `identity.workdayId`: the mapped state now carries the Workday ID, while the update sends the ID CR holds (B2 unchanged), as the R1-WD row expects.
- After R-WD: Zeke makes CR employees `5385357` and `5385360` inactive on the CR screen.

### R-WD step 4 run (checklist, BR10), 2026-11-23

Run by a background agent on Zeke's go-ahead ("ypese please"). Deployed commit 655b385, 5-minute poller. Sandbox 52311591 confirmed (get_user_details) before the write. CR not touched by hand. All times UTC.

```
Step 4 - BCBA 67208227438, bcba_in_cr_checklist = "External System ID" at 20:00:05; CR still holds 67208227438 (BR10 checklist)
  No webhook: the sandbox BCBA workflow does not re-enroll on the checklist. Picked up by the 20:05 poll
    (enqueued 20:05:01, source employeePoller, "Change found by the poller or the daily sweep").
  20:05:12 warning "HubSpot workday_id differs from the Central Reach External System ID." (crContactId 5385360)
  Run 20:05:16: outcome error, reasonCode CHECKLIST_STILL_TEMPORARY, operation update,
    changedFieldNames ["identity.checklistTicked"],
    crCalls lookup 200, update 200, labelRead 200 (no create, no label POST); writeback error.
  HubSpot: error, "Checklist is ticked but CentralReach still holds the temporary External System ID."
    (syncReasons.mjs:37-38, syncDecisions.mjs:40-41), employee_id 5385360.
  check-cr-record.mjs --round 4 --record bcba: PASS 26, FAIL 0, SKIP 3; same CR employee 5385360,
    B2 still 67208227438.
  Result: PASS.

Step 5 (untick) not run: outside this go-ahead (tick only). The checklist is left ticked; HS stays `error`.
CR writes made: one update to 5385360 (no value change). No create, no second employee.
```

## Care Coordinator setup (sandbox), 2026-11-23

On Zeke's go-ahead ("Yes create theis please"), a background agent added one Team Member record so the sandbox Care Coordinator workflows (1932723082 BCBA, 1933886108 Case) can reach `ready` (C10, B11; `FEEDBACK-REVIEW-COORDINATOR-FORMATS-2026-11-23.md` section 1.1). Sandbox 52311591 confirmed before the write.

- **Owner.** Round 1 Case `68493177375` and round 4 Case `68592605796`: `hubspot_owner_id` `161391908` (Zeke Swanson). Round 1 BCBA `67036479540`: **no owner** (`hubspot_owner_id` blank), so its workflow can only end `no_owner`.
- **Match.** Team Members `hubspot_user` ("Automations match on this"), an owner dropdown. The workflows themselves cannot be read (no MCP workflow tool).
- **Created 20:00:19 UTC:** Team Member `67210242697`: `hubspot_user` `161391908`, `first_name` "Test", `last_name` "Coordinator", `display_name` "Test Coordinator", `email` `care-coordinator-test@example.com`, `active` Yes, `role` Care Coordinator. Test-safe names and email: the match is on `hubspot_user`, not on the name or email, and the distinct values show where a coordinator value came from (the older `care_coordinator_name` holds "Zeke Swanson").
- **Re-run.** None by 20:07: Case R1 still has no `coordinator_export_status` (never enrolled), Case R4 still `missing_match` (19:00:22), coordinator names and email blank on both. The workflows do not re-enroll on a Team Member change. Zeke's step: re-enroll the Cases in 1933886108 (and give BCBA `67036479540` an owner before enrolling it in 1932723082).
- **CR.** No Case run and no CR effect from this step. The deployed code still reads `care_coordinator_name` for Meta 138851 (decision 39); the new fields reach CR only after the C10 build change.
