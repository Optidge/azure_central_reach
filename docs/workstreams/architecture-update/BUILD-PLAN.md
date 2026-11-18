# Build plan — HubSpot → Azure → Central Reach

> **To be rewritten (Zeke, 2026-11-18).** The stage order below is out of date. Decided: all code stages are built first (stages 1, 4, 5, 6, 7 and 8 as numbered here), then deploy and full sandbox testing with test records only (`sandbox_test_field` = true); the builder is Grok 4.6 on high; United Care's answers block production only. See the 2026-11-18 entries in the [tracker](ARCHITECTURE-REVIEW.md) log and [guide-review-2026-11-18.md](guide-review-2026-11-18.md). Do not hand this file to a builder until it is rewritten.

Dated 2026-11-17. Branch `architecture-update`, code at `e1db83a`, `npm test` 120 pass. **The build is paused. Nothing in this file is permission to change code, Azure, HubSpot or Central Reach (CR). Each stage starts only on Zeke's go-ahead.**

This is the full list of steps from today to production, each with an owner and a "done when". Decisions and evidence stay in [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md) (the tracker) and [OPEN-ITEMS.md](OPEN-ITEMS.md); ids (`Q…`, `V…`, `S…`) match them. The guide (Google Doc `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`) wins over this file and over the code.

## 1. Summary

- The approved design does not change: webhooks do the work, an hourly poller and a daily sweep are the safety checks, Cosmos keeps the link and the last synced values, failures show in a HubSpot report and one Azure email alert.
- The work is 9 stages. Stages 1 to 3 get the sandbox running safely against production CR with test records only. Stages 4 to 8 finish the design. Stage 9 is production.
- The employee create rule in this plan is the **temporary id** rule (Q35, Zeke 2026-11-17), not Danny's hold: the integration creates the employee when Entered in CentralReach = Yes and sends `workday_id` as the External System ID, or the HubSpot record id when `workday_id` is blank. Staff replace the temporary id with the Workday ID on the CR profile.
- Five decisions from Zeke are needed before code starts (section 4, D1 to D5). Each has a default, so a one-line "defaults are fine" is enough.

| Stage | What | Main owner | Ends with |
|---|---|---|---|
| 0 | Prep: decisions, HubSpot test records and workflows, Azure baseline | Zeke, Grok | Go-ahead for Stage 1 |
| 1 | Code slice S1b-1: create and identity checks | Claude | Commit on `architecture-update` |
| 2 | Deploy while the app is Stopped (gate A) | Grok | Build deployed, app still Stopped |
| 3 | First sandbox start and test script (gate B). The script here is a draft; the final sandbox testing plan is written after the build (Zeke, 2026-11-18) | Zeke, Grok, Claude | Final test plan agreed; tests passed and recorded |
| 4 | Code slice S1b-2: durable state and retries | Claude | Commit, deploy, re-test |
| 5 | Code slices S5 + S6: poller and fewer calls | Claude | Commit, deploy, poller test |
| 6 | Code slice S2: Case mappings | Claude | Commit, deploy, Case test |
| 7 | Code slice S3: employee mappings | Claude | Commit, deploy, employee test |
| 8 | Code slice S4: Contact routing | Claude | Commit, deploy, Contact test |
| 9 | Production readiness and go-live | Zeke, Danny, Grok | Production running |

## 2. Who does what

| Owner | Does | Does not |
|---|---|---|
| **Zeke** | Every decision and go-ahead. HubSpot setup (workflows, segments, reports, test records). CR screen actions. Secrets in Azure and local settings. Commit and push requests. | — |
| **Claude** (this repo session) | All code and tests in this repo, one slice at a time, one writer. Tracker and OPEN-ITEMS upkeep. Read-only HubSpot and CR checks with Zeke's go-ahead. Guide edits only when Zeke asks, exact text shown first. | No Azure changes. No deploys. No CR or HubSpot writes. |
| **Claude subagents** | Read-only work in parallel: an independent review of each slice's diff (Opus when Zeke asks), label-id lookups in the catalog export, the traceability table. | No code edits. Two writers never touch the repo at once. |
| **Grok** (Azure MCP, local repo) | Azure reads, app settings that are not secrets, queue purges, deploys, start and stop, log and queue checks during tests, the email alert. An independent read-only code review and `npm test` per slice. | No code edits. Every Azure write needs Zeke's go-ahead in that session. No Service Bus send, receive or replay except the one alert test in Stage 3. |
| **Danny / United Care** | Answers in OPEN-ITEMS section 3. HubSpot reminders and escalations for the Workday ID (native HubSpot, no integration code). | — |

Rules that apply to every step:

- CR has no sandbox. A sandbox test that creates or updates anything in CR is a **production CR write** and needs a test record Zeke names and his go-ahead.
- Never use portal `246184070`. Sandbox is `52311591`, production is `50317927`.
- No secret values, patient data or staff data in chat, logs or docs.
- Per slice: tests first from the guide rows, then the code, then `npm test`, then two reviews (subagent and Grok), then Zeke's go-ahead to commit. The pre-commit block in `docs/workstreams/session-run/GIT-SESSION-PLAYBOOK.md` runs before every commit; files are staged by path.

## 3. The rules Stage 1 builds

These restate decisions already made. Tracker ids in brackets.

**Sync status (Q31).** `last_sync_status` holds one of three values.

| Value | Meaning | Retried? | Where staff see it |
|---|---|---|---|
| `success` | CR matches HubSpot. | — | — |
| `error` | A person must fix something, or the retries are used up. Reason in `last_sync_error`. | No | Failures report |
| `waiting` | Nothing is broken. The record waits on a person or a setting (temporary id not yet replaced; employee create turned off). Reason in `last_sync_error`. | No, and never dead-lettered | Waiting view |

`blocked` is no longer written. `noop` stays until Stage 5.

**Employee not yet linked, Entered in CentralReach = Yes (Q35, V5, V17).**

```
required create fields present?  --no-->  error (names the missing field), no CR call
        | yes
External System ID to use = workday_id, or the HubSpot record id when workday_id is blank
        |
read-only CR lookup by workday_id (when filled) AND by the record id
        |-- answer unclear (not 200 / 404) ----------->  stop, retry later, never create
        |-- found by the record id -------------------->  this record's own employee: save the link, continue as linked
        |-- found by workday_id ----------------------->  another HubSpot record already holds that CR employee?
        |                                                    yes -> error, no CR write (Q32)
        |                                                    no  -> save the link, continue as linked
        |-- not found
        v
employee create turned off?  --yes-->  waiting ("Employee create is turned off")
        | no
create once (lock on the External System ID) -> save the CR id in Cosmos and HubSpot employee_id
        -> metadata -> labels (read the current set, post the union)
CR rejects the create (400 / 409)  -->  error with a safe reason, no retry
```

**Employee already linked (Q30, Q35).** Before any update the integration reads the CR employee and compares ids.

| CR External System ID | HubSpot `workday_id` | Checklist "External System ID (Workday)" | CR update | Status |
|---|---|---|---|---|
| Equals `workday_id` | Filled | Either | Yes | `success` |
| This record's temporary id | Blank | Not ticked | Yes | `waiting`: "Waiting for the Workday ID" |
| This record's temporary id | Filled | Not ticked | Yes | `waiting`: "Replace the temporary id in CentralReach with the Workday ID, then tick the checklist" |
| This record's temporary id | Either | Ticked | Yes | `error`: "Checklist is ticked but CentralReach still holds the temporary id" |
| Any other value that differs | Filled | Either | **No** | `error`: "Workday ID does not match CentralReach" |
| Blank in CR, or a value that is not the temporary id while HubSpot `workday_id` is blank | — | — | Yes | `success` (a blank on either side is not a mismatch) |

- The checklist property is `btrbt_in_cr_checklist` (BT/RBT) or `bcba_in_cr_checklist` (BCBA); "ticked" means it contains `External System ID`.
- A linked update always sends the External System ID CR holds, because the API rejects a changed one (tested 2026-11-16). Only a person can replace the temporary id, on the CR profile (tested 2026-11-17).
- This check runs before the "nothing changed" check, so ticking the checklist always updates the status.

**Case already linked (Q30, V4).** The integration reads the CR client first. When CR's External System ID is filled and differs from the Case record id: no CR write, `error`.

**Labels (Q22, V1).** Read the contact's labels, post the union of those and the labels the guide requires. Add-only until CR test (b) is run.

**Date of birth (Q28, V9, V10).** Blank on a create: placeholder `2000-01-01`. Blank on an update: the field is left out. A value that cannot be read as a date, or a `date_of_birth` property missing from the portal: `error`.

**Not built in Stage 1:** the Workday ID format check (Q34, waits for Danny), anything for employees already in CR (Q33, go-live), label removal.

## 4. Decisions needed from Zeke

| # | Decision | Default if you say "defaults are fine" | Needed by |
|---|---|---|---|
| D1 | **Format of the temporary id.** Plain HubSpot record id, or a prefix such as `HS-{record id}`. | **Plain record id**, as you described it and as Cases already work. HubSpot record ids are 11 digits and Workday IDs are 7, and the code checks "equals this record's own id", so they cannot be confused in code. It is one function, so a prefix is a one-line change, but only before the first sandbox create; after that CR would hold a mix. | Stage 1 |
| D2 | **BCBA uses the same temporary-id rule as BT/RBT.** | **Yes.** One code path. Whether BCBAs really reach CR before Workday is still open with Sara, and the rule is harmless if they do not. | Stage 1 |
| D3 | **Field updates continue while CR holds the temporary id.** | **Yes.** The temporary id proves it is the right CR employee, and the BT is in scheduling during that time. Status shows `waiting`. | Stage 1 |
| D4 | **An unlinked record whose `workday_id` finds an employee in CR is linked**, unless another HubSpot record already holds that employee. | **Yes** in code. In production, employees already in CR are kept out by the go-live gate (D6), not by code (Q33). | Stage 1 |
| D5 | **Two HubSpot records, one Workday ID (Q32): the second record stops with `error`.** Proposed, not decided. | **Build it.** It is the safe behaviour and prevents one record overwriting the other's CR employee. United Care still picks the right record for the pair `2002628`. | Stage 1 |
| D6 | **How the poller, and production, are limited to chosen records.** The sandbox segments filter webhooks only. The poller reads HubSpot directly. Read today: lists `1463`, `1464`, `1465` all filter on one checkbox, `sandbox_test_field` = true. | One optional app setting that names a HubSpot checkbox property. When set, the poller searches only records where it is true, and the worker gate skips any record where it is not. Sandbox value: `sandbox_test_field`. Production can use the same idea for go-live (a property United Care sets as each existing employee is confirmed). Not built without your OK; without it the poller stays off in the sandbox and Stage 5 is proven offline only. | Stage 5 |
| D7 | Commit and push the three changed docs and this plan. | Commit when you say so. | Anytime |
| D8 | Guide conflict: "No production rollout is authorized" against Danny's 11/14 "clear to finish" (Q19). | — | Stage 9 |

## 5. Stage 0 — Prep (no code)

| # | Step | Owner | Done when |
|---|---|---|---|
| 0.1 | Answer D1 to D5 and give the go-ahead for Stage 1. | Zeke | Recorded in the tracker |
| 0.2 | Read the Azure state again (app Stopped, settings, queue and dead-letter counts, alert rules) and report any change since the 2026-11-17 read. Read-only. | Grok | Report in chat; tracker updated |
| 0.3 | Create the sandbox test records, each named "Azure Test …", each with `sandbox_test_field` = true, Entered in CentralReach **left blank** until its test. See the table below. | Zeke | Records exist and appear in lists `1463` to `1465` (all three lists are empty today) |
| 0.4 | Confirm every sandbox workflow that sends a webhook to Azure filters on its list, entry and ongoing. | Zeke | A record outside the list sends no webhook (proved in test T1) |
| 0.5 | Add `workday_id` and the checklist property (`btrbt_in_cr_checklist`, `bcba_in_cr_checklist`) to the trigger list of the ongoing-update employee workflows, so filling the Workday ID or ticking the checklist re-runs the sync. This replaces the older "release a held record" trigger; there is no hold any more. | Zeke | Tests T7 to T9 produce a webhook |
| 0.6 | Sandbox HubSpot views, one per object: failures (`last_sync_status` = `error`, showing `last_sync_error`) and waiting (`last_sync_status` = `waiting`; BCBA and BT/RBT). | Zeke | Views exist |
| 0.7 | Pick two 7-digit Workday IDs for the test records. Claude checks read-only that CR holds no employee under either (GET by External System ID returns 404). | Zeke, Claude | Both return 404 |
| 0.8 | Re-read the guide rows Stage 1 implements (`[G17]`, Business rules, `[GER-REQ]`, `[GER-BT]`, `[GER-BCBA]`) right before coding. | Claude | Any difference from section 3 is raised before code changes |

Test records for Stage 3 (all in sandbox `52311591`):

| Name | Object | Set up as | Used in |
|---|---|---|---|
| BT-A | BT/RBT | First and last name, email, date of birth, `workday_id` **blank** | T3 to T10 |
| BT-B | BT/RBT | Complete, with test Workday ID 1 | T11 |
| BT-C | BT/RBT | Complete except **no email** | T2 |
| BCBA-A | BCBA | Complete (`ucaba_email_address` filled), `workday_id` blank | T13 |
| BCBA-B | BCBA | Complete, with the **same** Workday ID as BT-B | T12 |
| Case-A | Deal | The four client create fields filled | T14, T15 |
| Out-1 | BT/RBT | Complete, `sandbox_test_field` not set | T1 |

Checked read-only on 2026-11-17 in `52311591`: every property this plan reads exists on the sandbox objects (`workday_id`, `employee_id`, `entered_in_centralreach`, both checklist properties, `first_name`, `last_name`, `date_of_birth`, `last_sync_status`, `last_sync_error`, `test_record`). One gap: sandbox BCBA has **no `work_email` property**, which is where the code reads the BCBA email today. Step 1.2 moves it to `ucaba_email_address`, as the guide says; until then a BCBA create cannot pass.

## 6. Stage 1 — Code slice S1b-1: create and identity checks

Owner: Claude. One writer. Rough size: 2 days. Files: `src/lib/centralReachClient.mjs`, `src/lib/hubspotClient.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/workflows/clientSyncWorkflow.mjs`, both employee mapping files, `src/mappings/client/validateClientPayload.mjs`, `src/constants/centralReach.mjs`, `src/constants/hubspot.mjs`, tests.

| # | Step | Change | Proved by (offline tests) |
|---|---|---|---|
| 1.1 | **Status values** (Q31, V2) | Outcomes become `success`, `error`, `waiting`. A create CR rejects writes `error` and a fail record in Cosmos, not `blocked` with a success record. Create turned off (`PUT_ONLY_MODE` on, or `ALLOW_EMPLOYEE_CREATE` off) writes `waiting`. Neither is retried. | A 400 and a 409 on create each give `error` and no success record. Create off gives `waiting`, and the queue message completes. |
| 1.2 | **Required create fields** (V17, `[GER-REQ]`) | Employee names read from `first_name` and `last_name`; BCBA email from `ucaba_email_address`. Before a create, check each of the six employee fields and four client fields in `[GER-REQ]`; a value of only spaces counts as blank. A blank one gives `error` naming the field (never its value) and makes no CR call. | One test per required field, per entity. |
| 1.3 | **Date of birth** (V9, V10) | Rules in section 3. | Blank create sends the placeholder. Blank update leaves the field out. Unreadable date gives `error`. Property missing from the HubSpot answer gives `error`. |
| 1.4 | **Temporary External System ID** (Q35, D1, D2) | One function returns the id to send on a create: `workday_id`, or the record id when it is blank. The "Workday ID is blank" validation error is removed. | Blank `workday_id` creates with the record id. Filled creates with the Workday ID. |
| 1.5 | **Read-only lookup before a create** (V5, V11, test d) | New `GET /contacts/employee/byExternalSystemId?ExternalSystemId={id}`, run for `workday_id` (when filled) and for the record id. 200 is found, 404 `NotFound` is not found, anything else stops the run without a create. The update call is no longer used as a lookup for employees. | Each branch of the diagram in section 3, including "found by both with different CR ids" (`error`). |
| 1.6 | **One CR employee, one HubSpot record** (V5, Q32, D5) | Before linking to an employee found by `workday_id`, search both HubSpot employee objects for another record whose `employee_id` is that CR id. If one exists: `error`, no CR write. | A BCBA and a BT/RBT with one Workday ID: the first links or creates, the second stops with `error`. |
| 1.7 | **Create lock** (V5) | A second lock on the External System ID covers lookup, create and saving the CR id, so two records with one Workday ID cannot create at the same moment. | Two runs with one Workday ID started together create once. |
| 1.8 | **Linked employee id check** (Q30, Q35, D3) | The table in section 3. The two checklist properties are added to the properties read. The check runs before the "nothing changed" check. | One test per table row, for BT/RBT and BCBA. |
| 1.9 | **Linked Case id check** (V4) | Read the CR client before a linked update; a filled, different External System ID gives `error` and no write. | Match updates. Mismatch stops. Blank in CR updates. |
| 1.10 | **Labels: read, then union** (V1) | `GET /contacts/{id}/labels`, then post the union. A failed read posts nothing. | The post contains the labels CR already holds plus the required ones. A failed read makes no post. |
| 1.11 | **Stored email copy** (V11) | The copy of CR's primary email reads the same response paths as the id reader. | Each of the three response shapes. |
| 1.12 | **Regression** | Existing tests updated where the rule changed (hold, `blocked`). | `npm test` passes; new total recorded in the tracker. |
| 1.13 | **Independent reviews** | A subagent reviews the diff against section 3 and the guide rows, without being given conclusions. Grok reviews the same diff read-only and runs `npm test`. Findings are fixed or answered in the tracker. | Both reviews returned and recorded |
| 1.14 | **Docs** | Tracker and OPEN-ITEMS updated. Guide text for anything that changed is shown to Zeke and applied only if he asks. | — |
| 1.15 | **Commit and push** | On Zeke's go-ahead: playbook pre-commit block, stage by path, commit, push. | Commit hash in the tracker |

Not in this slice: retries with delays, durable Cosmos state, poller changes, new field mappings.

## 7. Stage 2 — Deploy while the app is Stopped (gate A)

Owner: Grok, with Zeke's go-ahead for each write. `centralreachserverless` stays **Stopped** for the whole stage.

| # | Step | Owner | Done when |
|---|---|---|---|
| 2.1 | App settings for sandbox `52311591`: `HUBSPOT_PORTAL_ID`, `HS_BCBA_OBJECT_TYPE_ID` = `2-72890322`, `HS_BT_RBT_OBJECT_TYPE_ID` = `2-72890325`. | Grok | Read back |
| 2.2 | The sandbox app's token and webhook secret (`HUBSPOT_PRIVATE_APP_TOKEN`, `HUBSPOT_WEBHOOK_CLIENT_SECRET`), entered in the Azure portal. Never pasted in chat. | Zeke | Set; Grok confirms the names exist, not the values |
| 2.3 | Remove the six unused pipeline and stage-allowlist settings. | Grok | Gone |
| 2.4 | Safe starting switches: `AzureWebJobs.intakePoller.Disabled` = `true`, `AzureWebJobs.processClientQueue.Disabled` = `true`, `AzureWebJobs.processEmployeeQueue.Disabled` = `true`, `ALLOW_EMPLOYEE_CREATE` = `false`, `PUT_ONLY_MODE` = `true`. `INCLUDE_TEST_RECORDS` not set. | Grok | Read back |
| 2.5 | Purge both dead-letter queues (406 and 628 old-sandbox messages). Never replay them. | Grok | Both show 0 |
| 2.6 | Check both queues show 0 active messages and the Cosmos `sync-state` container holds nothing from retired portal `50850427`. | Grok | Counts reported |
| 2.7 | One email alert: dead-letter count above 0 on either queue, to Zeke. Add an email receiver to the action group. Use the Service Bus metric, not logs. | Grok | Rule exists; tested in T16 |
| 2.8 | Deploy the Stage 1 commit. Record the commit hash and the function timeout (Q21). | Grok | Hash in the tracker; app still Stopped |
| 2.9 | Point each sandbox webhook workflow at the deployed function URL, if not already. | Zeke | URL confirmed |

## 8. Stage 3 — First sandbox start and test script (gate B)

**Draft test script (Zeke, 2026-11-18).** After the architecture build is done, a final sandbox testing requirements plan is written and agreed before sandbox testing. Tests T0 to T16 below are the draft input to that plan, not the final plan. The same note is in the guide (`[G18]` and the Change detection Architecture tab).

Before the start, all of these are true: Stage 1 is deployed (2.8); the segments filter every webhook workflow (0.4); the poller is disabled (2.4); the HTTP test functions are not called; queues are empty (2.6).

For each test: Zeke makes the HubSpot or CR change, Grok reports the queue counts and the run's log lines (field names only, no values), Claude reads the HubSpot record and, where noted, CR (read-only), and records the result in the tracker. **Tests marked CR write need Zeke's go-ahead at that step.** Stop at the first unexpected result.

| # | Test | Do | Expect | CR write |
|---|---|---|---|---|
| T0 | Start | Start the app with only the employee worker enabled; creates still off. | Functions listed; no messages; no errors | No |
| T1 | Segment gate | Set Entered in CentralReach = Yes on **Out-1**. | No webhook, no message, record untouched | No |
| T2 | Missing field | Set Yes on **BT-C** (no email). | `error` naming the email field; in the failures view; no CR call; no dead letter | No |
| T3 | Create turned off | Set Yes on **BT-A**. | One read-only lookup (by the record id); `waiting` "Employee create is turned off"; nothing created | No |
| T4 | Create with the temporary id | Turn creates on (`ALLOW_EMPLOYEE_CREATE` = `true`, `PUT_ONLY_MODE` = `false`); edit BT-A. | One CR employee whose External System ID is BT-A's record id; `employee_id` filled; link metadata set; labels are the union; status `waiting` "Waiting for the Workday ID" | **Yes** |
| T5 | No duplicate | Edit BT-A again twice, quickly. | Still one CR employee | Yes (update) |
| T6 | Update while temporary | Change BT-A's address. | CR shows the new address; status still `waiting` | Yes |
| T7 | Workday ID arrives | Fill `workday_id` on BT-A in HubSpot only. | CR unchanged; status `waiting` "Replace the temporary id…" | No |
| T8 | Staff replace the id | On the CR profile, replace the temporary id with the Workday ID; tick the checklist in HubSpot. | Status `success` | Manual |
| T9 | Ticked too early | Run after T13. On **BCBA-A**, tick the checklist while CR still holds the temporary id. | `error` "Checklist is ticked but…"; CR unchanged | No |
| T10 | Mismatch stop | Change BT-A's `workday_id` to a different value. Then restore it. | `error` "Workday ID does not match CentralReach"; no CR write; `success` after the restore | No |
| T11 | Create with a Workday ID | Set Yes on **BT-B**. | CR employee with External System ID = the Workday ID; `success` | **Yes** |
| T12 | One Workday ID, two records | Set Yes on **BCBA-B** (same Workday ID as BT-B). | `error`; no second employee; BT-B's CR employee unchanged | No |
| T13 | BCBA create | Set Yes on **BCBA-A**. | CR employee on the `Admin` form with the temporary id; `waiting` | **Yes** |
| T14 | Case | Enable the client worker. Set Yes on **Case-A**; edit it again; change a field. | One CR client; no duplicate; the change reaches CR; `success` | **Yes** |
| T15 | Case mismatch stop | Put a different test client's CR id in Case-A's `client_id_number`. Then restore it. | `error`; no CR write | No |
| T16 | Alert | Send one malformed test message to a queue (the only Service Bus send in this plan). Then purge it. | It dead-letters; the email arrives | No |

After the tests: Zeke decides whether the app stays running (webhooks only, segments on) or is stopped again. The test employees stay in CR as "Azure Test" records; the API cannot delete them, and Zeke can make them inactive on the CR screen.

CR behaviour tests that can use these test employees (each is a CR write; Zeke's go-ahead; results go in the tracker under Q6):

| Test | Question | Needed before |
|---|---|---|
| (b) | Does the labels POST replace the set or only add? Decides the label rules. | Stages 6 and 7 label rows |
| (a) | How is a metadata value cleared? | Stage 6 |
| (e) | Does an update accept a changed primary email? | Stage 7 |
| (f) | Does the API accept each contact form name as the screen shows it? | Stage 7 (Q29) |
| (i) | Does CR accept a second employee with an External System ID already in use? | Stage 9 (Q32) |
| (g) | Can an update set an External System ID on an employee that has none? Needs an employee made on the CR screen. | Stage 9 (Q33) |
| (h), (c) | Changed External System ID on a client; what a 409 matches on. | Optional |

## 9. Stage 4 — Code slice S1b-2: durable state and retries

Owner: Claude. Rough size: 2 days. Files: both workers, `cosmosState.mjs`, `mappedState.mjs`, `serviceBusClient.mjs`, both queue functions, `retry.mjs`, `host.json`, tests.

| # | Step | Change | Tracker id |
|---|---|---|---|
| 4.1 | Durable link record | One Cosmos record per HubSpot record holds the CR id and the last fully synced values, with no expiry. Attempt status is a separate record that may expire. | 8H, N1 |
| 4.2 | Baseline tied to the CR id | If the CR id changes, the saved values are dropped and every field counts as changed. | V14 |
| 4.3 | Pending create | The External System ID about to be used is saved before the create is sent. The next run looks that id up first. | V13 |
| 4.4 | Honest "nothing changed" | A run is a no-op only when the previous run finished cleanly. | 8F, B3 |
| 4.5 | Lock ownership | A lock is released only by the run that took it, and lasts long enough for a slow run. | 8D |
| 4.6 | Portal in messages and state | Queue messages and state keys carry the portal id; association exclusions follow the portal. | 8I, B4 |
| 4.7 | Failure classes | Temporary (429, 5xx, timeout on an update), permanent (bad data, CR 400), unknown create result. | 12 |
| 4.8 | Scheduled retries | A temporary failure is re-queued with delays of 1 min, 5 min, 15 min, 1 h, 4 h. The attempt number travels in the message and each attempt has its own message id. After the last: dead-letter, `error` on the record, the alert. | 12, V18 |
| 4.9 | Busy and stale runs | "Sync in progress" and "stale" are rescheduled, not failed. | 12C, V16 |
| 4.10 | Retry-After and metadata failures | CR's Retry-After is honoured in full; a metadata failure keeps its status code. | 12B, 12E, B8 |
| 4.11 | `host.json` Service Bus options | Set on purpose instead of defaults. | 12D |
| 4.12 | Tests, two reviews, docs, commit | As in Stage 1. | — |
| 4.13 | Deploy and re-test | Grok deploys and checks the Cosmos container allows records with no expiry. Re-run T4-style checks on a new test record, plus: two quick edits (the second run is rescheduled, not failed). | — |

## 10. Stage 5 — Code slices S5 + S6: poller and fewer calls

Owner: Claude. Rough size: 2 to 3 days. Files: `intakePollerWorkflow.mjs`, `intakePoller.mjs`, `hubspotClient.mjs`, `config.mjs`, both workers, `hubspotWebhook.mjs`, `README.md`, tests. **A sandbox run of the poller needs D6.**

| # | Step | Change | Tracker id |
|---|---|---|---|
| 5.1 | Hourly timer | From every 5 minutes to once an hour. | Q1 |
| 5.2 | Checkpoint per entity | Each search starts from a saved point and moves it forward only after the queue sends succeed, never past a page it did not finish. All pages are read, with a cap per run. | V19 |
| 5.3 | Independent searches | A failed Case search no longer skips the employee searches. A rejected filter fails loudly instead of running without the filter. | Poller gaps |
| 5.4 | Unlinked Yes search | Finds records with Yes and no CR id, whatever their last edit date, including earlier `waiting` and `error` records. | Poller gaps |
| 5.5 | Daily sweep | Once a day, every linked record is queued. Replaces the five-minute recheck. | Item 11 |
| 5.6 | No self-triggering | The poller no longer re-queues records the integration itself just wrote. | N2, N3 |
| 5.7 | A no-op writes nothing | One HubSpot read, one Cosmos read, no writes; only when HubSpot already holds the CR id. The duplicate first read is removed. `noop` is no longer written. | Item 9, V15, Q10 |
| 5.8 | One-call metadata update | Used once a sandbox run confirms it. | Item 9 |
| 5.9 | Missed-webhook log | When the poller finds a change no webhook delivered, it logs the changed field names (never values). | Design |
| 5.10 | Trigger coverage test | Zeke exports each webhook workflow's trigger properties into a repo file; a test fails when a mapped property has no trigger. | Design |
| 5.11 | Webhook clean-up | Remove the log-only coalesce; fix the README line. | Item 10 |
| 5.12 | Record gate (only if D6 is approved) | The optional property gate in the poller searches and the worker. | D6, Q26 |
| 5.13 | Tests, two reviews, docs, commit, deploy | As before. | — |
| 5.14 | Sandbox poller test | With D6 set to `sandbox_test_field`: enable the poller; edit a test record with its workflow turned off; within an hour the change reaches CR and the log names the field. A no-op run writes nothing to HubSpot. | — |

## 11. Stage 6 — Code slice S2: Case mappings

Owner: Claude. Rough size: 3 days. Files: `buildClientPayload.mjs`, `buildClientMetadata.mjs`, `validateClientPayload.mjs`, `clientSyncWorkflow.mjs`, `hubspotClient.mjs`, `src/constants/centralReach.mjs`, tests. One test per guide row.

| # | Step | Waits on |
|---|---|---|
| 6.1 | Mailing address from `street_address`; state from `stateregion`. | — |
| 6.2 | Comorbid and maladaptive from the parent/guardian properties. | — |
| 6.3 | Work Schedule 1 and 2, Client Availability, Total Assigned Hours, Approved Auth Hours, Auth Period from the guide's sources. | Q15 for the Location 2 variants |
| 6.4 | Secondary insurance and id; allergies explanation; Referring Physician Medicaid ID; Diagnosis; parent notes; referral source. | Q16 for `insurance_id_3` |
| 6.5 | Both ASD dates, each to its own CR field. | Q13 (field ids, physician pair) |
| 6.6 | Service location address branches. | Q15 |
| 6.7 | IA BCBA and BT names from associations, not text. Association answers are checked (source, target, category, role together) before roles are mapped. | — |
| 6.8 | Supervising BCBA from `ongoing_central_reach_provider_supplier`. | Q9 |
| 6.9 | Care Coordinator from the owner. | Q8 (scope) |
| 6.10 | Remove `insurance_id_4` and the misspelled address property from requests. | — |
| 6.11 | A filled date that cannot be read is an `error`. A Case read with missing sensitive identity fields is a failed read, never a clear. | Item 7, N4 |
| 6.12 | Case labels with known ids: Active / In-Active, state (CO, NY; NJ after lookup), Home, funding labels with known ids. Add-only. | Q4, Q5, Q17; CR test (b) for removal |
| 6.12a | Case staffing label from `staffing_status` (read the property, do not derive from stages). Ids, supplied by Zeke 2026-11-18, parent Staffing Status `1156741`: Pending 97151 Services `1156742`, 97151 Services `1156743`, Pending 97153 Services `1156744`, Starting 97153 Services `1156745`, Staffed 97153 `1156746`, X 97153 `1156747`. A blank value sends no staffing label. A Case holds one staffing label at a time, so this row needs replace-on-change: with add-only, old staffing labels would stay on the client. **Decided by Zeke 2026-11-18:** build it after CR test (b). The ids are already in `src/constants/centralReach.mjs` (`CENTRAL_REACH_CLIENT_STAFFING_LABELS`, constants only). If CR cannot replace labels, Zeke decides whether to send it add-only or hold it. | CR test (b) |
| 6.13 | Label-id lookup in the catalog export (read-only subagent task; can run during Stage 1). | Zeke's OK for the read |
| 6.14 | Tests, two reviews, docs, commit, deploy, one Case sandbox test per changed group. | — |

Rows that wait on an open question are left out and listed in OPEN-ITEMS, not guessed.

## 12. Stage 7 — Code slice S3: employee mappings

Owner: Claude. Rough size: 2 days. Files: `buildEmployeePayload.mjs`, `validateEmployeePayload.mjs`, `centralReachClient.mjs`, `employeeSyncWorkflow.mjs`, constants, tests.

| # | Step | Waits on |
|---|---|---|
| 7.1 | BCBA: gender from `gender_new`; address from `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home`; Salaried from `work_status`. | — |
| 7.2 | BCBA: remove the field the guide excludes (`credentialed_insurances__ny`). | — |
| 7.3 | BT/RBT: home state from `state_home`; work address includes `apartment__work`; zip from `postal_code_home` only. | — |
| 7.4 | Employee state labels: one per Work State in `location`. | Q17 for NJ ids |
| 7.5 | BT role labels: BT gets Behavior Technician, RBT gets RBT, by state. | Q17 |
| 7.6 | BCBA assignment, licensure, insurer and billing-hold labels with known ids. Add-only. | Q4; CR test (b) |
| 7.7 | Contact form by type and state. | Q29 and CR test (f) |
| 7.8 | Email change rule. | CR test (e) |
| 7.9 | Workday ID format check. | Q34 (Danny) |
| 7.10 | Tests, two reviews, docs, commit, deploy, sandbox employee test. | — |

## 13. Stage 8 — Code slice S4: Contact routing

Owner: Claude. Rough size: 1 to 2 days. Blocked until the sandbox Contact workflow exists and the BCBA personal-email sync property is confirmed (V20).

| # | Step |
|---|---|
| 8.1 | The webhook accepts Contact notices and queues a `contactChange` message. |
| 8.2 | A fan-out step finds the linked Cases (Guardian association) and BCBAs (BCBA to Contact association) and queues each through the normal workers, so the gate still applies. |
| 8.3 | Guardian name, email and phone reach the Case's CR client; the BCBA personal email reaches the BCBA's CR employee. A Contact never becomes its own CR record. |
| 8.4 | Tests, two reviews, docs, commit, deploy, sandbox test with a test Contact. |

## 14. Stage 9 — Production readiness and go-live

Nothing here starts until Stages 1 to 8 are done and Zeke resolves D8.

| # | Step | Owner | Tracker id |
|---|---|---|---|
| 9.1 | Answers from Danny, Sara and United Care that block production: agreement to the temporary id; anything that reads CR's External System ID early; Workday ID format and the 4 wrong values (one may be a Social Security number; correct it first); the shared Workday ID pair `2002628`; date of birth source; contact forms. | Danny / United Care | Q35, Q34, Q32, Q28, Q29 |
| 9.2 | **Existing CR employees.** List which HubSpot employees are already in CR (a CR export matched against HubSpot, reviewed by United Care) and decide each discrepancy. Until decided they stay out of the sync: the production gate (D6) or workflow filters keep them out of create and update, including the six hand-linked BT/RBT records. **Note for production (Zeke, 2026-11-18, to be decided):** if Danny's Workday ID alerts cover BTs already in Workday, staff will tick the checklist on up to 264 existing records, and each tick sends a webhook once the checklist trigger exists in production. The gate must keep those records out until United Care confirms them. | Zeke / Danny | Q33, V6 |
| 9.3 | CR tests (g) and (i). | Zeke, Claude | Q6 |
| 9.4 | Production HubSpot: `date_of_birth` on BCBA as a property sync; `crm.objects.owners.read` scope; production webhook workflows with full trigger lists (including `workday_id` and the checklists); failures and waiting views. | Zeke / Danny | Q28, Q8 |
| 9.5 | Remaining label rows, and label removal if CR test (b) allows it. | Claude | Item 5 |
| 9.6 | Repo docs fixes (`SOURCE-OF-TRUTH.md`, three `README.md` lines). | Claude | Q12 |
| 9.7 | Production Azure: settings for `50317927`, production secrets, the alert with Danny or a shared inbox added, poller on, deploy with the commit recorded. | Grok, Zeke | Gate |
| 9.8 | Go-live in steps: one worker at a time; updates before creates (`PUT_ONLY_MODE` on first); then creates for new records only. Watch the failures view, the waiting view and the alert daily for the first week. | Zeke, Grok | — |
| 9.9 | Record the final state in the guide. | Claude, on Zeke's request | — |

Separate workstream, not in these stages: the HubSpot API version migration (needs an owner; target before March 2027). Optional: destination audit, Case History Log, managed identity.

## 15. What can run at the same time

| While this runs | These can run too |
|---|---|
| Stage 1 code (Claude) | 0.2 Azure read (Grok); 0.3 to 0.6 HubSpot setup (Zeke); 6.13 label-id lookup (subagent); 2.1 to 2.7 Azure prep with the app Stopped (Grok) |
| Stage 3 tests | Stage 4 code (Claude), as long as nothing is deployed mid-test |
| Stages 4 to 8 | Danny's and United Care's answers; CR behaviour tests on the Stage 3 test employees |

Code slices run one after another on one branch. Stages 6 and 7 touch different mapping files and could be built in parallel in separate worktrees if speed matters more than simplicity; the default is one after the other.

## 16. Risks and assumptions

- **Assumption:** Danny and United Care accept the temporary id. If they do not, only steps 1.4, 1.5 and 1.8 change; the rest of Stage 1 stands.
- **Assumption:** nothing at United Care reads CR's External System ID before staff replace the temporary id. Not confirmed (OPEN-ITEMS section 3, question 17).
- **Risk:** staff forget to replace the temporary id. Covered by the `waiting` view and United Care's own HubSpot reminders; the integration cannot replace it.
- **Risk:** the response shape of the CR labels read is not confirmed until T4. The code handles the documented shapes and makes no post when the read fails.
- **Risk:** every Stage 3 create is a real CR employee that cannot be deleted by API. Kept to four test employees and one test client.
- **Risk:** a production record with a wrong `workday_id` is sent to CR as typed until the format check (Q34) exists. Production creates do not start before 9.1.
- **Not verified by Claude:** that each sandbox workflow filters on its list (0.4). T1 proves it.

## 17. Validation, in short

| Stage | Proof |
|---|---|
| 1, 4, 5, 6, 7, 8 | `npm test` passes; one test per guide row; two independent reviews; commit hash recorded |
| 2 | Grok's read-back of every setting; dead-letter counts 0; app Stopped |
| 3 | T0 to T16 each recorded with the HubSpot status, a read-only CR check and the queue counts |
| 9 | 9.1 to 9.7 closed in OPEN-ITEMS; first-week daily check of the failures view, waiting view and alert |

## Appendix — Hand-off briefs

**Grok, brief A (Stages 0.2 and 2).** Repo `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`, branch `architecture-update`. Read this file's sections 2 and 7 first. Do steps 2.1 and 2.3 to 2.8 in order, asking Zeke before each write, and read each value back. Keep `centralreachserverless` Stopped. No Service Bus send, receive or replay; purge only the two dead-letter queues. Report: each step, the value read back, the deployed commit hash, anything unexpected. No secret values in the report.

**Grok, brief B (Stage 3).** Read sections 2 and 8. Start the app only when Zeke says so. For each test Zeke runs, report: active and dead-letter counts for both queues, and the run's log lines with field names only. Change `ALLOW_EMPLOYEE_CREATE`, `PUT_ONLY_MODE` and the worker switches only at the test that names them, on Zeke's word. Stop the app at once on any unexpected CR write.

**Grok, brief C (each code slice).** Read-only review of the slice's diff against the stage table in this file and the guide rows it cites. Run `npm test`. Report findings with `file:line`, a severity, and the smallest fix. Change nothing.

**Reviewer subagent (each code slice).** Give it: the diff, section 3 of this file, the stage table, and the guide rows. Do not give it conclusions. Ask for: any path that can create a duplicate, write to the wrong CR record, lose a change, or write to CR for a record that should be skipped; any rule in the tables with no test.
