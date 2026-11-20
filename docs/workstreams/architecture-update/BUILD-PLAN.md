# Build plan — HubSpot → Azure → CentralReach

Final plan, dated 2026-11-18. It replaces the draft of 2026-11-17. Branch `architecture-update`, code at `be841e3`, `npm test` 120 pass.

This file is written so a builder with no history of the project can build from it. Every rule is stated here in plain words, with the guide section it comes from, the files it touches and the test that proves it.

- **Authority.** The integration guide (Google Doc `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`) is the business-rule authority. If the guide and this file disagree, stop and tell Zeke. A read-only text copy of the guide sections the build uses is saved next to this file as `guide-extract-2026-11-18.md` (Stage 0, step 0.3); the live guide wins over the copy.
- **Permission.** Zeke asked for the full build on 2026-11-18. This file is permission to change code and tests in this repo only. It is not permission to commit, push, deploy, start the app, or write to Azure, HubSpot or CentralReach. Each of those needs Zeke's go-ahead at the time.
- **History.** Decisions, evidence and the reasons behind each rule are in [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md) (the tracker) and [OPEN-ITEMS.md](OPEN-ITEMS.md). A builder does not need to read them. Section 16 maps each step to its tracker ID for the people who keep the tracker.

## 1. Summary

- **Order.** Prep, then all six code stages, then the final sandbox test plan and a deploy while the app is Stopped, then full sandbox testing, then production readiness.
- **Design.** Unchanged and approved: HubSpot workflows send a signed, ID-only webhook; Azure queues the record; a worker reads HubSpot, checks the record may sync, compares it with the last synced copy, writes to CentralReach only what changed, and writes the result back to HubSpot. An hourly poller and a daily sweep are safety checks. Cosmos holds the link and the last synced values. Failures show in a HubSpot report and one Azure email alert. No new Azure resource is needed.
- **Builder.** Claude, from Stage 2 on (Zeke, 2026-11-18). Claude Fable 5.2 is the orchestrator: for each stage it starts one builder agent and then one independent reviewer agent, checks every finding by running code, and keeps this plan, the tracker and the guide current. Stage 1 was built by Grok 4.6 and reviewed by Claude.
- **What blocks what.** Nothing blocks the build. Only United Care's answers block production (section 12).

| Stage | What | Who | Ends with |
|---|---|---|---|
| 0 | Prep: decisions recorded, guide aligned, guide copy saved, baseline test run | Claude, Zeke | Stage 1 starts |
| 1 | Create and identity checks | Grok built, Claude reviewed and fixed (done, `ef83b6b`) | Reviewed diff, `npm test` green |
| 2 | Durable state and retries | Claude builder agent builds, Claude reviewer agent reviews, the orchestrator verifies (built and reviewed 2026-11-18, `npm test` 402 pass, committed 2026-11-20) | same |
| 3 | Poller and fewer calls | same | same |
| 4 | Case mappings | same | same |
| 5 | Employee mappings | same | same |
| 6 | Contact routing | same | same |
| 7 | Final sandbox test plan; deploy while the app is Stopped | Claude writes, Zeke agrees; deploy through the Azure CLI on Zeke's go-ahead | Plan agreed; build deployed; app still Stopped |
| 8 | Full sandbox testing with test records only | Zeke, Claude | Every test recorded |
| 9 | Production readiness and go-live | Zeke, Danny, Claude | Production running |

## 2. Who does what

| Who | Does | Does not |
|---|---|---|
| **Zeke** | Every decision and go-ahead. HubSpot setup (workflows, lists, views, test records). CentralReach screen actions. Secrets in Azure and local settings. Says when to commit and push. | — |
| **Claude, orchestrator** (Fable 5.2; from 2026-11-18) | This plan, the tracker, OPEN-ITEMS, the guide (on Zeke's request, text shown first). Runs one stage at a time: starts the builder agent, then the reviewer agent, re-runs `npm test`, and confirms each finding by running code before it is reported. Fixes findings, or sends them back to the builder. Read-only HubSpot and CentralReach checks with Zeke's go-ahead. Azure steps in Stages 7 to 9 through the Azure CLI: read-only commands first, each write on Zeke's go-ahead for that command, setting names only and never values. | No CentralReach or HubSpot writes. No Azure write, deploy or start without Zeke's go-ahead for that step. |
| **Builder agent** (Claude, a fresh context per stage) | Tests first, then code, one stage at a time, in this working copy on `architecture-update`. Runs `npm test`. Returns a stage report (section 14). | No commit, push, deploy or live API call. No git command that changes anything. |
| **Reviewer agent** (Claude on a different model from the builder, Opus 5.5; every stage) | An independent read of the stage's diff against this plan. It gets the diff and the plan sections, never the builder's report. | No code edits. |
| **Grok** | Built Stage 1 (2026-11-18). Not used from Stage 2 on unless Zeke says so. | — |
| **Danny / United Care** | Answers in section 12. | — |

### Hard stops for everyone

1. **CentralReach has no sandbox.** Every CentralReach write is a production write. None is made without Zeke's go-ahead and a test record he names.
2. **No live calls during the build.** Code stages are proven by offline tests only. Do not run `func start`, do not start or deploy `centralreachserverless`, do not run any script that calls HubSpot, CentralReach, Service Bus or Cosmos.
3. **Portals.** Sandbox `52311591`. Production `50317927`. Retired `50850427`. Never use `246184070`.
4. **Secrets and personal data.** Never print, log, commit or paste secrets, tokens, `.env`, `local.settings.json`, `.claude/`, patient or staff data, or the body of a provider error. Do not open `.env` or `local.settings.json`. Log field names, never values. A CentralReach employee response contains sensitive fields; never log a response body.
5. **Existing CentralReach employees** are not created, linked or updated for now. This includes the six production BT/RBT records whose `employee_id` was typed by hand.
6. **Git.** Commit and push only when Zeke says. Stage files by path. No force-push. No checkout, fetch, pull, stash, reset or branch switch. Never act on PR #2 or PR #3. Run the pre-commit block in `docs/workstreams/session-run/GIT-SESSION-PLAYBOOK.md` before every commit.
7. **Guide edits** only when Zeke asks: exact text and place shown first, Docs connector only, insert-only, revision-guarded, re-read before and after.

## 3. What a builder needs to know first

### The system in short

```
HubSpot workflow (Case / BCBA / BT/RBT; Contact in Stage 6)
        | signed webhook: record ID + object type only
        v
src/functions/hubspotWebhook.mjs --> Service Bus: client-sync-queue / employee-sync-queue
                                         ^
src/workflows/intakePollerWorkflow.mjs (hourly poller, daily sweep) --+
        |
src/functions/processClientQueue.mjs   --> src/workflows/clientSyncWorkflow.mjs
src/functions/processEmployeeQueue.mjs --> src/workflows/employeeSyncWorkflow.mjs
        |
worker: lock -> read HubSpot -> MAY THIS RECORD SYNC? (src/lib/syncEligibility.mjs)
        -> map (src/mappings/...) -> compare with the saved copy (src/lib/mappedState.mjs, Cosmos)
        -> nothing changed: stop, write nothing
        -> changed: CentralReach writes (src/lib/centralReachClient.mjs)
        -> save the new copy (src/lib/cosmosState.mjs) -> HubSpot status writeback (src/lib/hubspotClient.mjs)
```

### Words used in this plan

| Word | Meaning |
|---|---|
| Case | A HubSpot Deal. One Case becomes one CentralReach **client**. |
| BCBA, BT/RBT | HubSpot custom objects. Each record becomes one CentralReach **employee**. |
| CR | CentralReach. |
| CR ID | CentralReach `contactId`. Stored in HubSpot `client_id_number` (Case) or `employee_id` (BCBA, BT/RBT). |
| Linked | HubSpot holds a CR ID for the record, or Cosmos holds one from an earlier run. |
| External System ID | A CentralReach profile field. For a client it is the HubSpot Case record ID. For an employee it is the Workday ID, or the HubSpot record ID as a temporary value until the Workday ID exists. |
| Entered in CentralReach | The HubSpot property that asks for a create: Case `enter_in_central_reach` (multi-checkbox, must contain `Yes`); BCBA and BT/RBT `entered_in_centralreach` (must equal `Yes`). |
| Checklist | `btrbt_in_cr_checklist` (BT/RBT) and `bcba_in_cr_checklist` (BCBA), multi-checkbox. The option shown as "External System ID (Workday)" is stored as `External System ID`. "Ticked" means the property contains that stored value. |
| Status | HubSpot `last_sync_status`, with the reason in `last_sync_error`. |

### IDs

| | Sandbox `52311591` | Production `50317927` |
|---|---|---|
| Case (Deal) | `0-3` | `0-3` |
| BCBA | `2-72890322` | `2-48354212` |
| BT/RBT | `2-72890325` | `2-48354559` |
| Contact | `0-1` | `0-1` |
| Case → BCBA: Supervising / IA / RE | 247 / 223 / 229 | 82 / 86 / 145 |
| Case → BT/RBT: Primary BT 1 / Primary BT 2 | 238 / 240 | 76 / 143 |
| BCBA → Contact | 191 | 17 |
| Case → Guardian Contact | 3 | 3 |
| Association types that never sync (unlabeled, Potential, Previous IA) | 164, 187, 251, 249, 242, 218, 235 | 20, 64, 153, 80, 74, 164, 286 |

The four Case stages that never sync, in both portals: `1383894301`, `1383894303`, `1383894302`, `1332962645`. The full crosswalk is guide section `[SCURRENT]`.

### How the code is tested

- `npm test` runs `node --test`. Tests are `src/tests/smoke/*.test.mjs`.
- Workflows take a `dependencies` argument, so tests pass in fakes for HubSpot, CentralReach, Cosmos and Service Bus. No test calls a live service.
- Every new test title starts with the guide code it proves, for example `[G17] a blank workday_id creates with the HubSpot record ID`.
- The 120 existing tests are a safety net only. When a rule in this plan changes what an old test asserts, change the old test and say so in the stage report.

## 4. Decisions this plan is built on

All by Zeke unless named. "For now" means it may change after United Care answers; the code keeps each rule in one place so a change is small.

| # | Decision | Date |
|---|---|---|
| 1 | Webhooks first; an hourly poller and a daily sweep as safety checks; a record with no change writes nothing. | 11/16 |
| 2 | Status is `success`, `error` or `waiting`. `blocked` is retired. | 11/17, for now |
| 3 | Employee create: when Entered in CentralReach = Yes, the integration creates the employee and sends `workday_id` as the External System ID, or the HubSpot record ID (plain, no prefix) as a temporary ID when `workday_id` is blank. Staff later replace the temporary ID with the Workday ID on the CR profile and tick the checklist. Same rule for BT/RBT and BCBA. | 11/17 and 11/18, for now |
| 4 | Right after a temporary-ID create the status is `waiting`. Field and label updates keep going while it is `waiting`. Checklist ticked while CR still holds the temporary ID is `error`. A second HubSpot record with the same Workday ID is `error`. | 11/18 |
| 5 | An unlinked record whose Workday ID finds an employee already in CR: no link, no CR write, `waiting`. A match on the record's own HubSpot ID still links, because that is its own earlier create. | 11/18 |
| 6 | A linked record whose HubSpot ID and CR ID are both filled and differ: no CR write, `error`. | 11/17, for now |
| 7 | Record gate in code: one app setting names a HubSpot checkbox; the workers and the poller skip every record where it is not true. Sandbox value: `sandbox_test_field`. Sandbox test records leave `test_record` blank. | 11/18 |
| 8 | The create signal stays Entered in CentralReach = Yes, kept in one place in code. | 11/18, for now |
| 9 | Labels are add-only until the CentralReach label test is run. The staffing label row and the Active / Inactive label are built after that test, because a record holds one of each at a time and add-only would leave the old one in place. | 11/17, 11/18 |
| 10 | Sandbox testing uses only records with `sandbox_test_field` = true. The employees and clients they create in production CR are those same test records. | 11/18 |
| 11 | Existing CR employees are not created, linked or updated for now. | 11/17 |
| 12 | The final sandbox test plan is written and agreed after the build. | 11/18 |

### Checked on 2026-11-18 (read-only, with Zeke's go-ahead)

A sample of 100 of the 475 production Cases that hold a CR Client ID was read from CentralReach. GET requests only; counts only.

| Finding | Effect on this plan |
|---|---|
| `GET /contacts/client/{id}` does not return an External System ID field at all. | The linked-Case identity check cannot read the client's ID. It uses the lookup by External System ID instead (step 1.11). |
| No sampled client holds its Case record ID as External System ID (the lookup returned 404 `NotFound` for 100 of 100). | The Case mismatch rule will not stop clients that were created by hand. That risk is closed. |
| `GET /contacts/client/{id}` returned 404 `NotFound` for 81 of 100 and 200 for 19 (13 active, 6 inactive). | Not a build item. Before production, find out why most HubSpot Client IDs do not resolve through this call (step 9.3). |
| `GET /contacts/employee/{id}` returns the employee under `contact`, including `contact.externalSystemId` and `contact.primaryEmail`. | The stored-email copy in today's code reads the wrong place and never finds the email (step 1.10). |

Confirmed earlier and still relied on: an employee create with an empty External System ID is rejected (400); the API cannot change an External System ID after the create (400), but a person can on the CR profile; `GET /contacts/employee/byExternalSystemId?ExternalSystemId={id}` returns 200 with the employee, active or inactive, and 404 `NotFound` when nobody holds the ID.

Not confirmed: what the client lookup by External System ID returns when it finds a client; the answer of `GET /contacts/{id}/labels`; whether the labels POST adds or replaces; whether a client update may set an External System ID on a client that has none. The code is written to be safe either way, and each is on the sandbox test list (Stage 8).

## 5. The rules

These apply across stages. Stage tables refer back to them.

### 5.1 May this record sync? (the gate)

Checked in this order, in the worker, before any mapping or CentralReach call. A skipped record gets no CentralReach call and no HubSpot writeback.

| # | Check | Skip when |
|---|---|---|
| 1 | Record gate | The app setting `SYNC_RECORD_GATE_PROPERTY` names a property and it is not `true` on the record. |
| 2 | Test record | `test_record` is true and `INCLUDE_TEST_RECORDS` is not `true`. |
| 3 | Case stage | The Case is in one of the four excluded stages, linked or not. |
| 4 | Create signal | The record is not linked and Entered in CentralReach is not Yes. |

A linked record keeps syncing whatever Entered in CentralReach says (Yes, No, blank, `Yes - Generic`, `No- Made Inactive`). The integration never deactivates anyone in CentralReach.

`SYNC_RECORD_GATE_PROPERTY` is required. Its value is a HubSpot property name, or the word `none` to turn the gate off on purpose. If the setting is missing, configuration is invalid and nothing syncs.

The create signal is read in one place only: `caseEntryIsYes` and `employeeEntryIsYes` in `src/lib/syncEligibility.mjs`.

### 5.2 Status values

| Value | Meaning | Retried? | Where staff see it |
|---|---|---|---|
| `success` | CentralReach matches HubSpot. | — | — |
| `error` | A person must fix something, or the retries are used up. | No | Failures report |
| `waiting` | Nothing is broken. The record waits on a person or a setting. | No, and never dead-lettered | Waiting view |

- The reason goes in `last_sync_error` as a fixed sentence. It names fields, never values. All reason sentences live in one new file, `src/constants/syncReasons.mjs`.
- Every status writeback also sets `last_sync_at`, `integration_last_write` and `updated_by_integration = true`.
- `blocked` is no longer written. `noop` is written until Stage 3, then never.
- An `error` or `waiting` that the code decides on purpose is not thrown: the worker writes the status and finishes, so the queue message completes.

### 5.3 Employee not yet linked, Entered in CentralReach = Yes

```
required create fields present?  --no-->  error "Missing required field: <name>", no CR call
        | yes
External System ID to send = workday_id, or the HubSpot record ID when workday_id is blank
        |
read-only lookups: by the HubSpot record ID (always), and by workday_id (when filled)
        |-- an answer that is not 200 or 404 ------->  stop, retry later, never create
        |-- found by the record ID ----------------->  this record's own earlier create: save the link, go on as linked (5.4)
        |-- found by both, two different CR IDs ---->  error, no CR write
        |-- found by workday_id only:
        |       another HubSpot employee record already holds that CR ID  -->  error, no CR write
        |       no HubSpot record holds it  -->  waiting "already in CentralReach", no link, no CR write
        |-- not found
        v
employee create turned off?  --yes-->  waiting "Employee create is turned off"
        | no
create once, under a lock on the External System ID
        -> save the CR ID in Cosmos, then in HubSpot employee_id
        -> metadata -> labels (5.6)
        -> status: success when workday_id was sent; waiting "Waiting for the Workday ID" when the temporary ID was sent
CR rejects the create (400 or 409)  -->  error with a safe reason, no retry
```

"Employee create turned off" means `ALLOW_EMPLOYEE_CREATE` is not `true` or `PUT_ONLY_MODE` is not `false`.

### 5.4 Employee already linked

Before any update the worker reads the CR employee and compares IDs. "CR holds" below is the External System ID CentralReach holds; "the temporary ID" means it equals this record's own HubSpot record ID.

| CR holds | HubSpot `workday_id` | Checklist | Update sent to CR? | Status and reason |
|---|---|---|---|---|
| The same value as `workday_id` | Filled | Either | Yes | `success` |
| The temporary ID | Blank | Not ticked | Yes | `waiting`: Waiting for the Workday ID. |
| The temporary ID | Filled | Not ticked | Yes | `waiting`: Replace the temporary External System ID in CentralReach with the Workday ID, then tick the checklist. |
| The temporary ID | Filled or blank | Ticked | Yes | `error`: Checklist is ticked but CentralReach still holds the temporary External System ID. |
| Anything but the temporary ID | Blank | Ticked | Yes | `error`: Checklist is ticked but the Workday ID is blank in HubSpot. |
| Another value that differs from `workday_id` | Filled | Either | **No** | `error`: Workday ID in HubSpot does not match the External System ID in CentralReach. |
| Nothing; or another value while `workday_id` is blank and the checklist is not ticked | — | — | Yes | `success` (a blank on either side is not a mismatch) |

- Only the mismatch row stops the update. In every other row the temporary ID or the matching ID shows it is the right CR employee, so field and label updates continue.
- An update always sends the External System ID CentralReach already holds, because the API rejects a changed one. When CR holds none, the update sends `workday_id` if it is filled.
- This check runs before the "nothing changed" check, so ticking the checklist or filling the Workday ID always refreshes the status.
- If the CR write itself fails, that failure is the status.

### 5.5 Case (client)

- **Create.** Unchanged: look up by the Case record ID, create when CentralReach clearly has no match, send the Case record ID as the External System ID.
- **Linked Case.** Before an update that would write to CentralReach, look up the client by this Case's record ID. Found under a different CR ID than HubSpot holds: no CR write, `error`. Found under the same CR ID, or not found: update. An unclear answer: stop and retry later.
- **Required fields.** First name, last name and date of birth are checked before a create; first and last name before an update. There is no date-of-birth placeholder for clients.

### 5.6 Labels

- Read the contact's current labels, then post the union of those and the labels the guide requires. If the read fails, post nothing and treat the run as a temporary failure. (Plan check, 2026-11-18: a read that answers in a shape the code cannot read is a different case; decided by Zeke the same day: it is permanent, `error` with no retry, and the log says in detail why the answer could not be read. See the Stage 2 decisions, row 4.)
- If every required label is already on the contact, post nothing.
- Labels are only added. Nothing is removed until the CentralReach label test shows whether removal is possible.
- The staffing label row (`staffing_status`) and the Active / Inactive label (`case_status`) are not built until after that test. Nothing is sent to CentralReach for either until then.

### 5.7 Dates

- A filled date that cannot be read as a date is an `error`. It is never treated as blank.
- Employee date of birth: blank on a create sends the placeholder `2000-01-01` and logs a warning; blank on an update leaves the field out of the request; a `date_of_birth` property that is missing from the HubSpot answer (the property does not exist in the portal) is an `error`.
- Client date of birth: blank on a create is an `error`; blank on an update leaves the field out.

### 5.8 A failed read is never a clear

A read that fails or is refused (401, 403), or a Case answer that is missing its sensitive identity fields, never becomes a blank sent to CentralReach. The run stops with no CR write.

## 6. Stage 0 — Prep (no code)

| # | Step | Who | Done when |
|---|---|---|---|
| 0.1 | Record Zeke's 2026-11-18 answers in the tracker and OPEN-ITEMS. | Claude | Done 2026-11-18 |
| 0.2 | Add the same rules to the guide as dated, insert-only notes. The text is drafted in `guide-inserts-2026-11-18.md`. | Claude, on Zeke's approval | Done 2026-11-18: 24 notes added in one revision-guarded batch and verified by a re-read (insert-only; headings unchanged). |
| 0.3 | Save a read-only text copy of the guide sections the build uses as `guide-extract-2026-11-18.md`: Business rules, `[GER-REQ]`, `[GER-CASE]`, `[GER-BCBA]`, `[GER-BT]`, `[GER-CONTACT]`, `[G17]`, `[G18]`, sections 7 to 9, the appendix, `[SCURRENT]` and the Change detection Architecture tab. | Claude | Done 2026-11-18, taken after 0.2, so it includes the 11/18 notes |
| 0.4 | Baseline: `npm test` shows 120 pass on a clean tree. | Claude | Done 2026-11-18: 120 pass at `be841e3` |
| 0.5 | Not blocking: run the CentralReach label test on a test employee Zeke names (read the labels, add one label, read again, restore). It decides the label rules for Stages 4 and 5 and unblocks the staffing and Active / Inactive rows. It is a production CR write, so it runs only on Zeke's word and on the record he names. | Zeke, in Cursor (2026-11-18) | Result in the tracker |
| 0.6 | Not blocking: a read-only read of the CR label catalog and metadata field list, to confirm the IDs marked † in section 10. | Zeke, in Cursor (2026-11-18) | IDs confirmed or corrected |

## 7. Stage 1 — Create and identity checks

**Goal.** Nothing can reach CentralReach for the wrong record, twice, or with a missing required field. This is the stage both earlier reviews asked for before any start.

**Guide sections.** Business rules `[GBR]`; required create fields `[GER-REQ]`; the External System ID rows of `[GER-BCBA]` and `[GER-BT]`; `[G17]` and `[G18]`; the Change detection Architecture tab (11/17 bullets).

**Files.** `src/lib/config.mjs`, `src/lib/syncEligibility.mjs`, `src/lib/centralReachClient.mjs`, `src/lib/hubspotClient.mjs`, `src/lib/dates.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/workflows/clientSyncWorkflow.mjs`, `src/mappings/employees/buildEmployeePayload.mjs`, `src/mappings/employees/validateEmployeePayload.mjs`, `src/mappings/client/buildClientPayload.mjs`, `src/mappings/client/validateClientPayload.mjs`, `src/constants/hubspot.mjs`, new `src/constants/syncReasons.mjs`, `local.settings.example.json`, tests.

| # | Rule (plain words) | Change | Tests that prove it |
|---|---|---|---|
| 1.1 | **Record gate** (rule 5.1, check 1). | `config.mjs`: `SYNC_RECORD_GATE_PROPERTY` is required in both config lists; a helper returns the property name, or nothing when the value is `none`. `syncEligibility.mjs`: a new first check and skip reason `record_gate`. Both workflows add the property to the list they read from HubSpot. `local.settings.example.json`: `"SYNC_RECORD_GATE_PROPERTY": "sandbox_test_field"`. | For Case, BCBA and BT/RBT: gate set and the property blank or false → skipped, no CR call, no writeback, also when the record is linked. Property true → proceeds. Value `none` → not checked. Setting missing → configuration invalid. |
| 1.2 | **Three status values** (rule 5.2). A create CentralReach rejects is an `error`. Create turned off is `waiting`. | `centralReachClient.mjs` `createOrUpdateEmployee` stops returning `blocked`; it returns a clear result for "create is turned off" and for "CR rejected the create" (keep `extractCreateErrorReason`). `employeeSyncWorkflow.mjs` writes `waiting` or `error`, saves a fail record in Cosmos for the rejection (never a success record), and finishes without throwing. Every writeback sets `integration_last_write`. New `syncReasons.mjs` holds every reason sentence. | A 400 and a 409 on create each give `error`, a fail record, no retry. Create off gives `waiting` and the function returns normally. No code path writes `blocked`. An error writeback carries `integration_last_write`. |
| 1.3 | **Required fields are checked before CentralReach is called** (`[GER-REQ]`). Employee create: first name, last name, primary email, date of birth rule (5.7). Client create: first name, last name, date of birth. Updates: first and last name. A value of only spaces is blank. | Employee names come from `first_name` and `last_name` (remove the split of `bcba_name` / `bt_name`). BCBA primary email comes from `ucaba_email_address` (remove `work_email`); BT/RBT from `email`. Validators take a `linked` flag and return the missing field names. A blank or malformed email on a create is `error`. The workflow writes `error` "Missing required field: <name>" and makes no CR call. | One test per required field, per entity, for create. Names for update. A filled `first_name` with a blank `last_name` is an error naming the last name. The reason sentence contains the field name and no value. |
| 1.4 | **Dates** (rule 5.7). | One shared date reader in `src/lib/dates.mjs` used by both employee and client mappers: returns the date, "blank", or "unreadable". An update leaves the date of birth out when blank. A `date_of_birth` key missing from the HubSpot `properties` answer is an `error`. | Blank on create sends the placeholder. Blank on update: the request has no date key. Unreadable → `error`. Missing property → `error`. Client blank on create → `error`. |
| 1.5 | **Temporary External System ID** (`[G17]`, decision 3). | One function in `buildEmployeePayload.mjs` returns the ID to send on a create: `workday_id`, or the record ID when it is blank. Remove the "workday_id is blank" validation error. | Blank `workday_id` → the create sends the record ID. Filled → the create sends the Workday ID. BT/RBT and BCBA. |
| 1.6 | **Read-only lookup before an employee create** (rule 5.3). | New `findEmployeeByExternalSystemId(id)` in `centralReachClient.mjs`: `GET /contacts/employee/byExternalSystemId?ExternalSystemId={id}`. 200 → found, with the CR ID read from `contact.contactId`. 404 → not found. Anything else is thrown and never leads to a create. The update call `PUT /contacts/employee/byExternalSystemId` is no longer used as a lookup; remove it. The workflow follows the tree in 5.3. | One test per branch of the tree: unclear answer stops; found by record ID links; found by both with different IDs is `error`; found by Workday ID only is `waiting` or `error` (1.7); not found creates. No test sees a PUT used as a lookup. |
| 1.7 | **One CR employee, one HubSpot record** (decisions 4 and 5). | New search in `hubspotClient.mjs`: find BCBA and BT/RBT records whose `employee_id` equals a CR ID, leaving out the current record. Used when the lookup finds an employee by Workday ID only. A hit → `error` "Another HubSpot record is already linked…". No hit → `waiting` "A CentralReach employee already holds this Workday ID…". Neither writes `employee_id` nor calls CR again. | A BCBA and a BT/RBT with one Workday ID: the first creates, the second is `error`, and the first one's CR employee gets no write. A Workday ID that only CR knows → `waiting`, `employee_id` stays blank, no CR write. |
| 1.8 | **Two records cannot create at the same moment.** | A second Cosmos lease on the External System ID to be sent (partition `create-lock:employee`) covers lookup, create and saving the CR ID. Not acquired → the run ends as "in progress" (thrown today; rescheduled in Stage 2). | Two runs with one Workday ID started together: exactly one create. |
| 1.9 | **Linked employee ID check** (rule 5.4). | Add the two checklist properties to the properties read. Compare IDs after the CR read and before the "nothing changed" check. The mismatch row makes no CR write. Status and reason per the table, written even when no mapped field changed. | One test per table row, for BT/RBT and for BCBA. The mismatch row: zero CR writes. Ticking the checklist with no other change still updates the status. |
| 1.10 | **Stored email copy reads the right place.** Updates send the primary email CentralReach already holds (unchanged rule; CentralReach's update error names this field). | `buildEmployeePayloadForContactId` reads the email from the same places as the External System ID reader: the top level, `contact`, `employee` and `result`. | Each response shape gives the stored email. |
| 1.11 | **Linked Case ID check** (rule 5.5). | New `findClientByExternalSystemId(caseRecordId)`: `GET /contacts/client/byExternalSystemId?ExternalSystemId={id}`, read like 1.6. Before a linked update that will write to CR: found under another CR ID → `error`, no write. A 200 with no readable CR ID is an unclear answer: stop, no write. | Same CR ID → update. Different CR ID → `error`, no write. 404 → update. Unclear → no write. A run with nothing to send makes no lookup. |
| 1.12 | **Labels: read, then add what is missing** (rule 5.6). | `centralReachClient.mjs`: `GET /contacts/{id}/labels`, then post the union. Accept the documented answer shapes; an answer that cannot be read as a list of label IDs is a failed read. Skip both calls when the required set is empty. | The post holds the labels CR already has plus the required ones. A failed read makes no post and fails the run. All present → no post. |
| 1.13 | **Regression.** | Update old tests whose rule changed (the Workday ID hold, `blocked`, name sources). | `npm test` green; the new total is in the stage report. |

**Not in Stage 1:** retries with delays, state that never expires, poller changes, new field mappings, label rows, the Workday ID format check.

**Known safe limit after Stage 1.** If Cosmos has lost a record's state and HubSpot never received its CR ID, a record that was created with its Workday ID is shown as `waiting` "already in CentralReach" instead of being linked again. No duplicate and no wrong write result; a person links it by entering the CR ID in `employee_id`. Stage 2 removes the cause by keeping the link without expiry.

**Stage 1 status, 2026-11-18.** Built by Grok, reviewed by Claude, six review findings (S1-R1 to S1-R6) fixed; `npm test` 237 pass. The review left follow-ups for later stages. Each is written into its stage below and marked "from the Stage 1 review": Stage 3, steps 7.1 and 7.4, the Stage 8 table, step 9.8 and section 13.

## 8. Stage 2 — Durable state and retries

**Goal.** The link and the last synced values never expire; a half-finished run is never mistaken for "nothing changed"; a temporary failure is retried later with growing delays instead of at once.

**Guide sections.** Change detection Architecture tab: "Save synced state only after required updates succeed", the 11/17 approved design (retry delays, dead-letter), and "Minimum changes and tests before production".

**Files.** Both workflows, `src/lib/cosmosState.mjs`, `src/lib/mappedState.mjs`, `src/lib/serviceBusClient.mjs`, `src/lib/retry.mjs`, `src/lib/config.mjs`, `src/functions/processClientQueue.mjs`, `src/functions/processEmployeeQueue.mjs`, `src/functions/hubspotWebhook.mjs`, `src/constants/staffingAssociations.mjs`, `src/mappings/client/buildClientMetadata.mjs`, `host.json`, tests.

| # | Rule (plain words) | Change | Tests that prove it |
|---|---|---|---|
| 2.1 | **The link record never expires.** One Cosmos record per HubSpot record holds the CR ID, the last fully synced field hashes, the External System ID used, and whether the last run finished cleanly. | Write it with `ttl: -1` (the container's default is 30 days, so the item must say "never"). Keep attempt details (last error, invocation) in a separate record that may expire. Stop using `SUCCESS_TTL_SECONDS` and `FAIL_TTL_SECONDS` for the link. | The link record is written with no expiry on success and on failure. A failure never removes the CR ID or the last good hashes. |
| 2.2 | **The saved values belong to one CR ID.** | The link record stores the CR ID its hashes were synced to. If the record's CR ID differs, drop the hashes and treat every field as changed. | Changing the CR ID forces a full write, not a no-op. |
| 2.3 | **A create with an unknown result is never repeated blindly.** | Before the create is sent, save the External System ID about to be used ("pending create") in the link record. The next run looks that ID up first, even if `workday_id` was edited in between. Clear it once the CR ID is saved. | Timeout on the create, then `workday_id` edited, then a retry: the retry finds the first employee and does not create. |
| 2.4 | **"Nothing changed" is only trusted after a clean run.** | Mark the link record "in progress" before the first CR write and "clean" after every write succeeded. A run is a no-op only when the record is clean and the hashes match the Cosmos copy. HubSpot `last_sync_hash` alone is not enough. | A run that failed halfway, followed by a HubSpot value changed back: the next run writes again. |
| 2.5 | **A lock is released only by the run that took it.** | The lease stores an owner token; release deletes it only when the token matches. The lease lasts at least as long as the function may run (default 600 seconds; record the real function timeout at deploy). | A slow run whose lease expired does not delete the next run's lease. |
| 2.6 | **Everything knows which portal it is for.** | `config.mjs`: replace the commented sandbox/production block with a table keyed by portal ID (object types, excluded association types, staffing role IDs from section 3). `HUBSPOT_PORTAL_ID` becomes required and must be `52311591` or `50317927`; any other value is invalid configuration. Queue messages and Cosmos keys carry the portal ID; a worker completes and logs a message for another portal without acting. Remove the `HUBSPOT_PORTAL_ID_TEST` override in `buildClientMetadata.mjs`. | Portal `50850427` or `246184070` → invalid configuration. A message for the other portal → no HubSpot or CR call. Excluded association IDs follow the portal. |
| 2.7 | **Failures are sorted into three kinds.** Temporary: 429, 5xx, a timeout on a read or an update, a busy lock, a record that changed during the run. Permanent: missing or bad data, a CR 4xx other than 429. Unknown create: a timeout or 5xx on the create call itself. | One classifier in `src/lib/retry.mjs`. Permanent → `error` on the record, no retry, message completes. Unknown create → treated as temporary for timing, with 2.3 protecting the next attempt. A metadata failure keeps its status code so it can be classified. | One test per kind, per worker. A CR 400 on an update is `error` with no retry. |
| 2.8 | **Temporary failures are retried at 1 minute, 5 minutes, 15 minutes, 1 hour and 4 hours.** After the last one: `error` "Retries used up" on the record and the message goes to the dead-letter queue, which fires the email alert. | The queue function schedules a new Service Bus message with the next delay, the attempt number in the body and a message ID that is unique per attempt, then lets the current message complete. After the fifth retry fails it writes `error` and throws. A redelivery of a message that has already used its retries throws at once without calling HubSpot or CR, so Service Bus dead-letters it. If the Azure Functions Node model offers a supported way to dead-letter directly, say so in the stage report before using it. | Attempt numbers and delays in order. Each attempt has a different message ID. After the last attempt: `error` written once, then no further calls on redelivery. |
| 2.9 | **A busy record is rescheduled, not failed.** | "Sync in progress" and "changed during the run" use the same scheduler (first delay 1 minute) instead of an immediate rethrow. | Two messages for one record: the second is rescheduled and later runs as a no-op. |
| 2.10 | **CentralReach's Retry-After is respected.** | Read it as seconds or as a date. In-process waits stay short (5 seconds); a longer Retry-After sets the scheduled delay when it is longer than the next step. | A 429 with a long Retry-After schedules at least that far out. |
| 2.11 | **Service Bus settings are stated on purpose.** | `host.json`: set the Service Bus concurrency and lock-renewal options explicitly (start with 4 concurrent calls and a 10-minute lock renewal). Confirm the option names against the extension bundle in use and name the source in the stage report. | `host.json` parses; a test asserts the keys exist. |

**Stage 2 additions from the plan check (2026-11-18).** An independent reviewer read rows 2.1 to 2.11 against the code at `ef83b6b`, and the orchestrator confirmed each point in the code. These additions are part of the rows above. Where an addition and a row differ, the addition wins. Where a row says "decision N", Zeke's answer is in the decisions table below the additions (all nine answered 2026-11-18).

More files for this stage: `src/lib/hubspotWebhook.mjs`, `src/workflows/intakePollerWorkflow.mjs` and the poller part of `src/lib/config.mjs` (all for row 2.6), and `src/constants/syncReasons.mjs`.

| Row | Addition | Why (finding) |
|---|---|---|
| 2.1 | Every write to the link record reads the record first and keeps the fields it does not own: the CR ID, the field hashes and the CR ID they belong to, the pending-create ID and the clean flag. Today nine `putState` calls each replace the whole record (employee workflow: the decided fail, `saveLink`, the no-op, the success and the catch block; client workflow: `decidedError`, the pending link, the success and the catch block). Put the merge in one helper and use it at all nine. Attempt details (last error, invocation) go to a second record that may expire. A run that ends `error` or `waiting` but whose CR writes all succeeded is a clean run and saves its hashes. | P2-1, PX-2 |
| 2.2 | The CR ID the hashes belong to is its own field (`hashesContactId`), written only when hashes are saved. The fail records and `saveLink` copy old hashes next to a new CR ID, so `crContactId` cannot serve. | P2-10 |
| 2.3 | (a) If saving the pending ID fails, no create is sent. (b) A lookup that finds the pending ID is this record's own create: save the link and go on as linked; rule 5.4 then sets the status, so an edited `workday_id` ends as the mismatch `error`, not as a second employee. (c) The pending ID is cleared only when the CR ID is saved, when CR rejects the create (400 or 409), or when its lookup answers 404. (d) "Create succeeded but returned no contact ID" (`centralReachClient.mjs`, `createEmployee` and `createOrUpdateClient`) is an unknown create, not a plain error. (e) The test uses one in-memory store chained through `getState` and `putState`, and the timeout passes through the real catch block. | P2-1 (high): a fail write that drops the pending ID, then an edited `workday_id`, gives a second CR employee |
| 2.4, 2.9 | Their tests use the real `hashPayload` and one stateful store. With a constant fake hash, "changed during the run" and "failed halfway, then changed back" can never happen in a test. | P2-7 |
| 2.5 | Keep the etag from the lease create and delete with `IfMatch`; a read, compare, then delete still has a race. Applies to both leases (`sync-lock:*` and `create-lock:employee`). Set `functionTimeout` in `host.json` and make the lease longer than it (decision 9); remove the `\|\| 120` fallback. `cosmosState.mjs` gets a way to pass in a container, so `ttl: -1`, the etag release and the busy answer are tested for real. | P2-6, P2-7 |
| 2.6 | The portal table is read when a function runs, not when a module loads: today `src/constants/staffingAssociations.mjs` and `src/lib/hubspotWebhook.mjs` import the frozen `HUBSPOT_PORTAL` at load. The poller stamps the portal ID on its messages in this stage, not in Stage 3. The `HS_BCBA_OBJECT_TYPE_ID` and `HS_BT_RBT_OBJECT_TYPE_ID` settings no longer override the table: a value that differs from the table is invalid configuration. Stage 3 checkpoint and sweep-marker keys carry the portal ID. A message with no portal ID: decision 2. What the webhook checks: decision 3. | P2-2 (high): the row cannot be built from its file list, and poller messages would carry no portal |
| 2.7 | The classifier reads `error.response.status`, the code names below and the numeric Cosmos `error.code`. Nothing recognisable (no status, no code, a network timeout) is temporary. Temporary: 408, 429, 5xx, `SYNC_IN_PROGRESS`, `SYNC_STALE`, `CR_LOOKUP_UNKNOWN`, `METADATA_WRITE_FAILED` when its fields failed with a temporary status, Cosmos 429 and 503. Permanent: `CR_EXTERNAL_ID_REQUIRED`, a CR 4xx other than 408 and 429. Unknown create: `CR_CREATE_OUTCOME_UNKNOWN`. A wrong-shape answer (`CR_EMPLOYEE_READ_FAILED`, `CR_LABEL_READ_FAILED`): decision 4. HubSpot 401 or 403 (`HUBSPOT_READ_FAILED`) and CR 401: decision 6. | P2-4 |
| 2.8 | (a) What HubSpot shows while a temporary failure is being retried: decision 1. Today both catch blocks write `error` with the raw message before the queue function sees the failure, which rule 5.2 does not allow. (b) The queue function tells the workflow when it is the last attempt; the workflow writes `error` "Retries used up", a new sentence in `syncReasons.mjs`, for every kind of temporary failure. (c) A permanent error writes a fixed sentence from `syncReasons.mjs`, never `error.message`. (d) If scheduling the retry message fails, throw, so Service Bus redelivers the original; never complete a message whose retry was not scheduled. (e) An invalid message always throws, so it dead-letters and the alert fires. (f) The retry message ID is the original message ID plus the attempt number, not a random value. (g) The retry body keeps `source` and the portal ID, and any new source name is added to `ALLOWED_SOURCES` in both queue functions. | P2-3, P2-5 |
| 2.9 | Whether busy and changed-during-the-run reschedules count toward the five attempts: decision 5. | P2-9 |
| 2.10 | When Retry-After is longer than the in-process wait, do not retry in-process: throw at once and let the scheduler wait. The per-field metadata results keep the status and Retry-After. | P2-8 |
| 2.11 | Also set `functionTimeout` (row 2.5). | P2-6 |

**Decisions for Stage 2 (Zeke, 2026-11-18).** All answered; nothing in this stage waits on Zeke.

| # | Decision |
|---|---|
| 1 | While a temporary failure is being retried, HubSpot keeps its last status. `error` "Retries used up" is written only after the last attempt. Which HubSpot answers are temporary is taken from HubSpot's error-handling page (read 2026-11-18), not guessed: 423 (wait at least 2 seconds), 429, 477 (Retry-After in seconds, up to 24 hours; row 2.10 applies), 502, 503, 504, 521, 523 and 524 are temporary. 522, 525 and 526 are retried too; if they last, the dead-letter alert reports them. A HubSpot 400 or 404 is permanent. |
| 2 | A message with no portal ID is completed and logged, with no HubSpot or CR call. After this stage every sender stamps the portal ID (the webhook, the poller, the HTTP test functions and the retry scheduler), so such a message can only come from a sender defect or a message made by hand. Live check 2026-11-18: every queue holds 0 active and 0 scheduled messages, so no old message is waiting. |
| 3 | The webhook does not check a portal ID. One app serves one portal at a time: the sandbox now, production later. The worker compares each message with its own configured portal. |
| 4 | An answer CentralReach gives in a shape the code cannot read is permanent: `error`, no retry, no CR write. This covers the label read, the employee read, and a lookup that answers 200 with no contact ID (for that one answer it replaces "stop and retry later" in rows 1.6 and 1.11; an answer that is not 200 or 404 is still temporary). **The log must say in detail why the answer could not be read:** the call (method and path template), the HTTP status, what the code expected, the field names at the top of the answer, the type of each expected field (missing, null, text, number, object or list), the list length, and the field names of the first list item. Field names and types only. Never a value and never the body (hard stop 4). HubSpot gets a fixed sentence from `syncReasons.mjs` that names the call and the field that was expected. One helper builds this log for all three readers. |
| 5 | A busy record and a record that changed during the run count toward the five attempts. |
| 6 | HubSpot 401 or 403 and CentralReach 401 are temporary; the dead-letter alert reports them. |
| 9 | `host.json`: `functionTimeout` `00:10:00` and `extensions.serviceBus.maxAutoLockRenewalDuration` `00:10:00`. Lease length 660 seconds (`LEASE_TTL_SECONDS`, both leases). This is in line with Microsoft's documentation (below). |

**Platform facts, confirmed 2026-11-18** (Microsoft Learn pages for Functions scale, host.json, the Service Bus binding and trigger, duplicate detection, message sequencing, Cosmos DB time to live and the timer trigger; live values read with the Azure CLI, read-only).

- **Timeout.** The app is on Flex Consumption (FC1, live). Its default timeout is 30 minutes with no maximum, so without `functionTimeout` a run could outlive its lease. `00:10:00` is valid.
- **Service Bus settings** under `extensions.serviceBus` for this extension bundle: `maxConcurrentCalls` (default 16, per instance), `maxAutoLockRenewalDuration` (default `00:05:00`), `autoCompleteMessages` (default `true`). The live queue locks are 5 minutes (client) and 1 minute (employee), so the lock renewal must be raised to the function timeout.
- **Settlement.** A normal return completes the message; a throw abandons it. Both queues have maxDeliveryCount 10 (live).
- **Dead-lettering from code.** The Node v4 model can complete or abandon a message through `sdkBinding: true` and an extra package; dead-lettering is not shown, and the same page says auto-complete must stay on outside C#. Decision: do not use it. A message is dead-lettered by throwing until the delivery count is used up, as row 2.8 says. No new package.
- **Scheduled messages and duplicate detection.** Scheduled messages are included in duplicate detection, and a duplicate send is accepted and then dropped. The client queue has it on with a 10-minute window; the employee queue has it off (live). A retry message ID of "original ID plus attempt number" is unique per attempt and safe on both. The delivery count of a scheduled message is not stated, so the attempt number travels in the body.
- **Cosmos.** The container's default TTL is 30 days (live), so an item with `ttl: -1` never expires. An expired item leaves query results at once, but its delete can be delayed, and the documentation does not say whether a create conflicts with an expired item that is not yet deleted. So row 2.5 does not rely on it: the lease stores its own expiry time; on a conflict the code reads the lease and, if it has expired, takes it over with an etag-checked replace.
- **Timer.** Six-field NCRONTAB; the top of every hour is `0 0 * * * *`.

**Not in Stage 2:** poller changes, the no-op that writes nothing, mappings.

**Stage 2 status, 2026-11-18.** Built by the Claude builder agent (Fable 5.2), reviewed by the reviewer agent (Opus 5.5) from the diff alone, and every finding confirmed by the orchestrator by running code. Rows 2.1 to 2.11 and every addition are built; no row was left out. `npm test` 402 pass (237 before the stage). Committed 2026-11-20 on Zeke's word. The review found no path that creates a duplicate, writes to the wrong CentralReach record or calls CentralReach for a gated record. It found eleven points (S2-R1 to S2-R11): five fixed with tests, six left as built, each recorded in OPEN-ITEMS section 6.

Where the build now differs from the rows above (the review fixes and the builder's additions). These win over the rows:

| Row | What is built | Why |
|---|---|---|
| 2.5 | The lease's Cosmos item lives twice as long as the lease (`ttl` 1320 seconds for a 660-second lease). The lease still ends at its own `expiresAt`. A conflict with nothing to read is followed by one more create, then the record is busy. | S2-R1: Cosmos stops returning an item once its ttl has passed, so an item that expired together with the lease could never be read and taken over. A crashed run would have kept its record busy until Cosmos deleted the item. |
| 2.8 (b), decision 5 | A failure **before the gate is checked** (a busy record, a failed HubSpot read, a failed Cosmos read) writes nothing to HubSpot, also on the last attempt. The message still dead-letters and the alert fires. "Retries used up" is written only for a record that passed the gate in that run. | S2-R3, rule 5.1: before the record is read the worker cannot know whether the gate lets it write. A busy run also does not overwrite the status of the run that holds the record. **Confirmed by Zeke 2026-11-20 (OPEN-ITEMS section 1, row 23).** |
| 2.7, decision 6 | A failed CentralReach token request is temporary whatever its status (`CR_AUTH_FAILED`). | S2-R2: a 400 from the token call was sorted as permanent, so a wrong or rotated secret would have marked every record `error` with no retry and no alert. **Confirmed by Zeke 2026-11-20 (OPEN-ITEMS section 1, row 23).** |
| 2.10 | No retry is scheduled more than 24 hours out, whatever Retry-After says. | S2-R8. 24 hours is HubSpot's longest Retry-After (decision 1). |
| 2.3 (b) | A pending ID that is a Workday ID, found on a CentralReach employee that another HubSpot record already holds, is `error` "Another HubSpot record is already linked", not a link. | Builder's addition. Without it two records with one Workday ID could link to one employee after a timed-out create. **Confirmed by Zeke 2026-11-20 (OPEN-ITEMS section 1, row 23).** |
| 2.6 | The webhook answers 503 and queues nothing when the portal settings are invalid. HubSpot retries a 503. | Builder's addition; the plan did not state this case. |
| 2.7, decision 1 | A HubSpot 4xx other than 400 and 404 (405, 409, 415, 422) is retried and ends in "Retries used up" and the alert. | The decision names only 400 and 404 as permanent. **Confirmed by Zeke 2026-11-20 (OPEN-ITEMS section 1, row 23).** |

Workflow contract after this stage: a workflow that returns is finished; a workflow that throws wants a retry. The queue function only schedules. Link record: partition `sync:employee` or `sync:client`, `ttl: -1`; attempt record: `sync-attempt:*`. Every key starts with the portal ID.

## 9. Stage 3 — Poller and fewer calls

**Goal.** The poller becomes an hourly safety check that never loses its place and never touches a record outside the gate. A record with no change costs reads only and writes nothing.

**Guide sections.** Change detection Architecture tab (backup path; the 11/17 approved design); Business rules `[GBR]` Requirement 2; section 11 "Some mapped values change without anyone editing the field".

**Files.** `src/workflows/intakePollerWorkflow.mjs`, `src/functions/intakePoller.mjs`, `src/functions/intakePollerHttpTest.mjs`, `src/lib/hubspotClient.mjs`, `src/lib/config.mjs`, both workflows, `src/lib/centralReachClient.mjs`, `src/functions/hubspotWebhook.mjs`, `src/lib/hubspotWebhook.mjs`, `README.md`, `docs/SOURCE-OF-TRUTH.md`, `package.json`, tests.

| # | Rule (plain words) | Change | Tests that prove it |
|---|---|---|---|
| 3.1 | **The poller runs once an hour.** | Timer from every 5 minutes to the top of each hour. | The schedule string. |
| 3.2 | **A saved checkpoint per entity; it only moves forward after the records were queued.** | For Case, BCBA and BT/RBT separately: search records with `hs_lastmodifieddate` at or after the checkpoint, oldest first, page by page up to a fixed cap of pages per run. After each page is queued, move the checkpoint to that page's last timestamp. If pages remain, the next run continues. The first run starts one hour back. The checkpoint is stored without expiry. Remove the 15-minute lookback, the per-record dedupe entries and the one-page limit. | An outage of any length is caught up over following runs. A queue failure halfway leaves the checkpoint at the last finished page. Nothing is skipped when two records share a timestamp. |
| 3.3 | **One entity's failure does not stop the others; a rejected search fails loudly.** | Each entity's search runs in its own try block. Remove the fallback that re-runs a search without its date filter. | A failed Case search still runs both employee searches. A rejected filter is an error, not an unfiltered search. |
| 3.4 | **The record gate applies to the poller.** | When `SYNC_RECORD_GATE_PROPERTY` names a property, every poller search adds "that property is true". The Case search keeps excluding the four stages. The worker gate still runs for every queued record. | With the gate set, every search request carries the filter. With `none`, it does not. |
| 3.5 | **Once a day, every linked record and every unlinked record with Entered in CentralReach = Yes is queued.** This replaces the five-minute recheck and is the re-run path for records fixed outside HubSpot. | Run it in the first hourly run at or after a fixed hour (08:00 UTC), once per day, guarded by a Cosmos marker. Spread the messages with scheduled delivery (60 a minute) so CentralReach is not flooded. The unlinked search uses the entry property constants, not its own copy of the rule. | Runs once per day even if a run is missed. Linked and unlinked-Yes records are queued; the gate filter is present. |
| 3.6 | **The poller does not re-queue what the integration just wrote.** | Skip a candidate whose `hs_lastmodifieddate` is within 120 seconds after its `integration_last_write`. (A false skip is caught by the webhook or the daily sweep; a false queue costs one no-op.) | Own write → skipped. A later human edit → queued. |
| 3.7 | **A record with no change writes nothing.** | A run is a no-op when: the link record is clean (2.4), the hashes match, HubSpot already holds the CR ID, and the status HubSpot shows is the status this run would write. Then: no CR call, no HubSpot write, no Cosmos write. If only the status differs, write only the status. For employees, `workday_id` and the checklist become part of the compared state, and the CR read for the ID check (1.9) is skipped only when the last status is `success` and nothing changed. Remove the duplicate first HubSpot read in both workflows. `noop` is never written to HubSpot. | No-op Case: HubSpot reads only (the Case and its two staffing association lists), one Cosmos read, zero writes. No-op employee with status `success`: one HubSpot read, one Cosmos read, zero CR calls. A `waiting` employee still gets its ID check. HubSpot missing the CR ID → the ID is written. |
| 3.8 | **Only changed metadata fields are sent.** | Send the metadata fields whose hash differs from the saved copy (all of them when there is no saved copy). Add the one-call `PATCH /contacts/{ContactId}/metadata` behind an app setting `CR_METADATA_BATCH` (default `false`); it is turned on only after a sandbox run confirms it. Body shape from the CentralReach API spec (`../central_reach_test_integration/central_reach_docs/`); if the spec does not settle it, leave the batch call out and say so. | One changed field → one metadata call. With the setting on → one call for many fields. |
| 3.9 | **A change no webhook delivered is logged by field name.** | When a run started by the poller or the sweep finds changed fields, log the field names (never values) with a fixed message. This shows which workflow trigger is missing. | The log has names only. |
| 3.10 | **A check lists mapped properties that no workflow trigger covers.** | Export the list of HubSpot properties each worker reads for mapping. New `npm run check:triggers` compares them with `docs/workstreams/architecture-update/webhook-triggers.json` (Zeke exports each sandbox workflow's trigger properties into it) and exits non-zero when a mapped property has no trigger. It is not part of `npm test` until the sandbox workflows are final; it must pass before Stage 7's deploy. Seed the file with an empty list per object. | The check fails on a missing property and passes when covered. |
| 3.11 | **Clean-up.** | Remove the log-only "coalesce" step and its Cosmos write from the webhook. Fix `README.md` (the deploy example names the wrong Function App; the coalesce description; the old sandbox IDs) and the dead tab link in `docs/SOURCE-OF-TRUTH.md`. Remove app settings the code no longer reads from the required lists and the example file, and list them in the stage report. | Webhook tests: a repeat notice is still queued; no Cosmos call. |

**From the Stage 1 review (2026-11-18), for step 3.7.** Two cases write on every run today. Step 3.7 must end both, and its tests must name them:

- A linked employee that is `waiting` (CR still holds the temporary ID) with no field change: each run writes the same `waiting` status to HubSpot again. No CR write.
- A linked employee whose status is `error` but whose updates continue (checklist ticked while CR holds the temporary ID): `last_sync_hash` is not saved on an `error`, so each run sends the same update to CR again. Confirmed again in the Stage 2 review (S2-R6): three runs sent three identical updates, although the Cosmos record was clean and its hashes matched.

**From the Stage 2 review (2026-11-18), for this stage.**

- The poller's lease, dedupe entries and recheck cursor, and the webhook's coalesce key, carry no portal ID. Rows 3.2, 3.5 and 3.11 rebuild or remove all of them; the new keys carry the portal ID (Stage 2 addition, row 2.6).
- The employee queue function has no list of allowed sources, so `dailySweep` (row 3.5) needs adding to the Case queue function only.
- `README.md` still describes the retired `HUBSPOT_PORTAL_ID_TEST` setting and the old object type override (row 3.11).
- The poller's portal stamping is proven by one direct test of the senders and one test that reads the source text. Replace the source-text test with a real run once the poller takes `dependencies` (row 3.2).

**Stage 3 additions from the plan check (2026-11-18).** Same rules as the Stage 2 additions: they are part of the rows above and win where they differ. Decisions 7 and 8 are answered below the table.

More files for this stage: `src/functions/processClientQueue.mjs` and `src/functions/processEmployeeQueue.mjs` (the allowed sources), `src/lib/mappedState.mjs`.

| Row | Addition | Why (finding) |
|---|---|---|
| 3.2 | `runIntakePollerWorkflow` takes a `dependencies` argument like the workers; today it imports HubSpot, Cosmos and Service Bus directly and cannot be tested. Within a run, page with HubSpot's `after` cursor from one "at or after the checkpoint" search. If the page cap is reached inside a block of records that share one timestamp, keep paging until the timestamp changes, and stay under HubSpot's 10,000-result search limit. The saved checkpoint is the earlier of the last timestamp queued and five minutes ago, so a record indexed late is not skipped. A failed send stops the page: remove the per-record catch. | P3-3, P3-4: a full page with one timestamp would stall the poller for that entity |
| 3.5 | The sweep uses its own source name (`dailySweep`), allowed by both queue functions. The marker is written after every entity is queued; a partial failure runs again the next hour. The sweep does not apply the row 3.6 skip. It has a cap per run. The search operator for "the multi-checkbox contains Yes" is confirmed against HubSpot's documentation and named in the stage report. | P3-5: a new source is rejected today and every sweep Case message would dead-letter |
| 3.6 | The rule, exactly: skip when `hs_lastmodifieddate` is at or before `integration_last_write` plus 120 seconds. The two times come from different clocks. | P3-6 |
| 3.7 | (a) The compared state is built from HubSpot data only: the mapped payload before the CR read, plus `workday_id` and the checklist. Today the employee hash is built after the CR read and includes the email and External System ID CR holds, so the CR read could never be skipped. Expect one full write per linked record after this deploys, and change `MAPPING_VERSION`. (b) "Zero writes" means zero apart from the record lease, which stays before the read. (c) A no-op skips the confirm read. (d) "The last status" is HubSpot's `last_sync_status` and `last_sync_error` as read in this run. (e) An unlinked record that is `waiting` (create turned off, or already in CentralReach) still rewrites its status and repeats both CR lookups on each run: decision 8. | P3-1, P3-2, P3-7 |
| 3.8 | The folder named in the row holds no `PATCH` metadata spec (checked 2026-11-18), so the one-call update is left out of this stage, as the row already allows. Changed-only sends mean a value staff edit on the CR screen is no longer overwritten until its HubSpot field changes: decision 7. | P3-8 |
| 3.9 | A retried message keeps its `source`. | P3-10 |
| 3.10 | "Mapped" means the properties the mappers read. It leaves out the properties the integration writes (status, hash, link), the gate property and `test_record`. Export the three lists from the workflows. | P3-9 |

**Decisions for Stage 3 (Zeke, 2026-11-18).** (7) Yes: with changed-only metadata, a value staff edit on the CR screen stays until its HubSpot field changes; the guide gets a note when Zeke asks for the next guide update. (8) Yes: an unlinked `waiting` record rewrites its status and repeats its two lookups on each run, for now.

**HubSpot facts, from HubSpot's CRM Search page (read 2026-11-18).** Search is limited to 5 requests a second per account, 200 records a page and 10,000 results a query, with one sort. "It may take a few moments" for a new or changed record to appear in search, which is why row 3.2 keeps the checkpoint five minutes back. A filter on an option property is case-sensitive. The page does not say which operator matches one option of a multi-checkbox property. Before row 3.5 is built, one read-only search in the sandbox settles it; that call needs Zeke's go-ahead.

## 10. Stages 4 to 6 — Mappings and Contact routing

Rows that wait on an open question are left out and listed in section 12. They are never guessed.

Target IDs: the metadata and label IDs shown without a mark are already in `src/constants/centralReach.mjs`. IDs marked † come from the repo's own notes of 2026-10-27 (`docs/Sandbox props & labels_summary.md`, `docs/centralreach-metadata-and-labels-discovery.md`); add them as constants, and step 0.6 confirms them before sandbox testing.

### Stage 4 — Case mappings

**Guide sections.** `[GER-CASE]`, section 3 field map, section 4 (associations), section 7 (client labels), the appendix (stored values).

**Files.** `src/mappings/client/buildClientPayload.mjs`, `src/mappings/client/buildClientMetadata.mjs`, `src/mappings/client/validateClientPayload.mjs`, `src/workflows/clientSyncWorkflow.mjs`, `src/lib/hubspotClient.mjs`, `src/constants/centralReach.mjs`, `src/lib/config.mjs`, tests. One test per row; the title names the guide row.

| # | Guide row | HubSpot source | CentralReach target | Rule |
|---|---|---|---|---|
| 4.1 | Mailing Address | `street_address`, `home_apt`, `location_city`, `stateregion`, `postal_code`, `phone` | Address line 1 and 2, city, state, zip, cell phone | State comes from `stateregion`, not `location`. Line 1 is `street_address` only. |
| 4.2 | Comorbid and Maladaptive | `does_your_child_have_any_other_comorbid_diagnoses_`, `maladaptive_behaviors__parentguardian` | Metadata `132303`, `126207` | Main fields only; stop reading the two `__clinical` properties. Send the stored option values. |
| 4.3 | Severity and parent notes | `severity_level_clinical`, `important_information` | `133826`, `138378`† | Parent notes is new. |
| 4.4 | Work Schedule #1 and #2 | `work_schedule_details`, `btrbt_work_schedule_2_details` | `132304`, `138093` | The Location #2 variants wait (section 12). |
| 4.5 | Client Availability | `finalized_client_service_hours_post_assessment`, `client_service_hours_total` | `126209` | The text, then the weekly hours when filled. |
| 4.6 | Total Assigned Hours | `total_hours_bt1bt2_work_schedule` | `134331` | Ignore the two older totals. |
| 4.7 | Approved Auth Hours | `initial_auth_tracks` chooses: Prior Authorization Required → `n97153_approved_assessment_hours_auth_req`; No Prior Authorization Required → `ia_hours_from_the_ia` | `132431` | Blank when the track is blank. |
| 4.8 | Auth Period | `ongoing_auth_period_start_date`, `ongoing_autrh_period_end_date` (the spelling is real) | `134672` | Start – end. Never the `_f` copies. |
| 4.9 | Known Allergies | `allergies` (stored `Confirmed` / `Denial`), `allergies__yes__explain` | `126214` | Yes with the explanation, or No. |
| 4.10 | Secondary Insurance and ID | `insurance_2` (or `insurance_2__other__summary` when Other), `insurance_id_2` | `144600`†, `144601`† | Not `n2_what_type_of_insurance`. |
| 4.11 | Referring Physician Medicaid ID, Diagnosis, Referral Source | `referring_provider_medicaid_id`; `phi_diagnosis` + `diagnosis_other`; `referral_source` | `141233`†, `144793`†, `126222`† | `phi_diagnosis` stores `Yes` for "Yes-F84.0". |
| 4.12 | ASD dates | `most_recent_asd_diagnosis_date_1`; `most_recent_asd_diagnosis_date_medicaid` | `131195` (general); `138701` (Medicaid FFS NY) | Send both, each to its own field. Remove the pick-one logic and `most_recent_asd_diagnosis_date_2`. |
| 4.13 | Service Location Address | `specific_home_location`: Child's House → `full_home_address`; Other Location → `service__street_address`, `service__apt`, `service__city`, `service__postal_code` | `137697`† | More Than One Location and Address 2 wait (section 12). |
| 4.14 | IA, Reassessment BCBA and Primary BT names | Case → BCBA and Case → BT/RBT associations by role (IDs in section 3), then each staff record's `first_name` + `last_name` | `131314`, `144602`†, `131313`, `138092` | Read associations, not the text rollups. An association answer with no `results` list is a failed read, not "no staff". Match the type ID and the `USER_DEFINED` category together. Several staff in one role: names joined, in record-ID order. Read staff names in one batch call per object type. |
| 4.15 | Supervising BCBA | `ongoing_central_reach_provider_supplier` | `131308` | The typed text as it is. |
| 4.16 | Care Coordinator | `hubspot_owner_id` → `GET /crm/v3/owners/{id}` | `138851`† | Cache owners in memory. If the owner call is refused (403: the scope is not on the app yet), leave the field out, log a warning, and do not fail the run. |
| 4.17 | Requests | — | — | Stop requesting `insurance_id_4`, the misspelled `…_other_addres` property and the properties replaced above. |
| 4.18 | Sensitive fields | `phi_first_name__cloned_`, `phi_last_name`, `phi_date_of_birth`, `phi_gender`, `insurance_id_1`, `insurance_id_2`, `phi__policy_holder_dob`, `phi_diagnosis` | — | If a requested sensitive key is missing from the HubSpot answer, the read failed (rule 5.8): `error`, no CR write. |
| 4.19 | Labels · State | `location` | CO Client `1132648`, NJ Client `1132647`†, NY Client `1082499` | Add-only. |
| 4.20 | Labels · Service location | `specific_home_location` is Child's House or More Than One Location | Home `1052656`† | Add-only. |
| 4.21 | Labels · Funding | `insurance_primary` with `location` | Aetna + NY `1082497`†; Cigna + NY `1082498`†; Cigna + CO `1124249`†; Medicaid FFS + NY / NJ / CO `1052532`† / `1124247`† / `1124248`†; any of the nine `-Carelon` options `1107648`†; Anthem BCBS `1052620`†; UHC `1052534`† | Add-only. Other combinations get no funding label. |

Not built in Stage 4: the staffing label row and the Active / Inactive label (both held until the label test; Zeke, 2026-11-18); Grad Permit Holder; the physician pair selector stays as it is today (`n1_what_type_of_insurance`).

### Stage 5 — Employee mappings

**Guide sections.** `[GER-BCBA]`, `[GER-BT]`, sections 5, 6, 8 and 9, the appendix.

**Files.** `src/mappings/employees/buildEmployeePayload.mjs`, `src/mappings/employees/validateEmployeePayload.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/constants/centralReach.mjs`, tests.

| # | Guide row | HubSpot source | CentralReach target | Rule |
|---|---|---|---|---|
| 5.1 | BCBA gender | `gender_new` (Male / Female) | Gender | Never the archived `gender`. |
| 5.2 | BCBA address and phone | `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home`, `employee_phone` | Address, city, state, zip, cell phone | Replaces `home_apt`, `city_work`, `home_state`. Adds the zip. |
| 5.3 | BCBA excluded field | `credentialed_insurances__ny` | — | Stop reading it and stop sending metadata `134444`. |
| 5.4 | BCBA labels · header and state | Every BCBA; one per Work State in `location` (a multi-checkbox) | BCBA `1130668`; CO / NJ / NY Employee `1107687` / `1107686`† / `1132655` | Add-only. Skip New Mexico and Virginia. |
| 5.5 | BCBA labels · assignment and licensure | `assign_states` contains `Assign CO` / `Assign NJ`; `lba_licensure__ny` = `Yes` / `Grad Permit` | BCBA Colorado `1124246`†; BCBA LBA NJ `1124245`†; BCBA LBA NY `1052629`; GRAD Student- LBA NY `1092164`† | "Will Apply" is stored as `No` and gets no label. |
| 5.6 | BCBA label · NY Medicaid | `ny_insurance_labels` contains `MCD FFS-NY` | NY Medicaid `1107647`† | The commercial insurer options wait (section 12). |
| 5.7 | BCBA label · Salaried | `work_status` = `Salaried` | Salaried `1132653`† | Add-only. |
| 5.8 | BCBA label · Billing Hold | `cr_billing_hold_label` = `Yes` | Billing Hold Medicaid Affiliation `1103437`† | Added on Yes. Not removed on No until the label test. |
| 5.9 | BT/RBT address | `street_home`, `location_city`, `state_home`, `postal_code_home`, `employee_phone` | Address line 1, city, state, zip, cell phone | State from `state_home`, not `location_home`. Zip from `postal_code_home` only. The guide lists no apartment for the home address, so `home_apt` is no longer sent. |
| 5.10 | BT/RBT work address | `street_address__work_`, `apartment__work`, `city__work_`, `state__work_`, `postal_code__work_` | Metadata `133819` | Adds the apartment. |
| 5.11 | BT/RBT labels · state | One per Work State in `location` | CO / NJ / NY Employee | Add-only. Replaces the single label from the home state. |
| 5.12 | BT/RBT labels · role | `bt_rbt_type` × each Work State | BT: Behavior Technician NY `1052630`, NJ `1132652`†, CO `1132650`†. RBT: RBT NY `1052631`, NJ `1132651`†, CO `1107692` | An RBT gets the RBT label only. A BT in Colorado gets Behavior Technician CO, not RBT CO. `bt_to_rbt_path` has no effect. |

Unchanged in Stage 5, on purpose: the contact form (BCBA `Admin`, BT/RBT `Behavior Technician NY`); updates send the email CentralReach holds; the labels All Employees `1052618` and Clinical `1052643` stay as they are today; BCBA personal email (Stage 6). Not built: the Workday ID format check; BCBA Care Coordinator.

### Stage 6 — Contact routing

**Guide sections.** `[GER-CONTACT]`; section 11 "It's actually 4 objects".

**Files.** `src/lib/hubspotWebhook.mjs`, `src/functions/hubspotWebhook.mjs`, `src/functions/processClientQueue.mjs`, new `src/workflows/contactFanOutWorkflow.mjs`, `src/lib/hubspotClient.mjs`, `src/lib/serviceBusClient.mjs`, `src/mappings/employees/buildEmployeePayload.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, tests.

| # | Rule (plain words) | Change | Tests that prove it |
|---|---|---|---|
| 6.1 | **A Contact change is accepted and queued.** | The webhook accepts object type `0-1` and sends a `contactChange` message (Contact ID only) to the client queue. | A Contact notice returns 202 and queues one message. |
| 6.2 | **A Contact change reaches every record that reads from it, through the normal workers.** A Contact never becomes its own CentralReach record. | The fan-out reads the Contact's associations to Cases (Guardian) and to BCBAs, then queues an ordinary sync message for each. The gate in the workers decides whether each may sync. The record gate and `test_record` are not checked on the Contact itself. | One Contact linked to two Cases and one BCBA → three messages. No CR call is made by the fan-out. A failed association read queues nothing and is retried. |
| 6.3 | **Guardian name, email and phone reach the client.** | Already read from the Case sync properties (`guardian_first_name`, `guardian_last_name`, `email`, `phone`); confirm they are in the compared state. | A Guardian change produces a client update. |
| 6.4 | **BCBA personal email comes from the BCBA's Contact.** | Read the associated Contact's `email` through the BCBA → Contact association and send it to metadata `138069`, replacing `email` on the BCBA record. A failed Contact read leaves the field out; it is not a clear. | Contact email changes → the metadata field updates. No Contact → the field is left out. |

Live testing of Stage 6 waits for the sandbox Contact workflow. The code and its offline tests are built now.

## 11. Stages 7 to 9 — After the build

### Stage 7 — Final sandbox test plan and deploy while Stopped

| # | Step | Who | Done when |
|---|---|---|---|
| 7.1 | Finish `SANDBOX-TEST-PLAN.md` from the draft list below and the rules in section 5. The record convention (Zeke, 2026-11-18) is already in that file. Keep it. From the Stage 1 review: check every property name in the convention against the finished mappers before round 1, because Stage 5 changes the employee state, address and apartment properties (steps 5.2, 5.4, 5.9, 5.11). | Claude | Zeke agrees |
| 7.2 | Sandbox HubSpot: one fresh Case, BT/RBT, and BCBA per round, named in `SANDBOX-TEST-PLAN.md` (`sandbox_test_field` = true, `test_record` blank, Entered in CentralReach blank until its test). Log HubSpot and CentralReach IDs in `sandbox-test-log.md`. Every webhook workflow filters on its test list (`1463` Deals, `1464` BCBAs, `1465` BT/RBTs). The employee ongoing-update workflows trigger on `workday_id` and the checklist. Failures and waiting views per object. Trigger lists exported into `webhook-triggers.json`. | Zeke | `npm run check:triggers` passes |
| 7.3 | Azure, app Stopped, each write on Zeke's go-ahead: settings for `52311591` (portal ID, both object type IDs); the sandbox token and webhook secret entered by Zeke in the portal; `SYNC_RECORD_GATE_PROPERTY` = `sandbox_test_field`; remove the six unused pipeline and allowlist settings and the settings Stage 3 retired; safe switches (poller and both workers disabled, `ALLOW_EMPLOYEE_CREATE` = `false`, `PUT_ONLY_MODE` = `true`); purge both dead-letter queues (never replay); confirm both queues are empty and Cosmos holds nothing from `50850427`; one email alert on dead-letter count above zero; deploy the reviewed commit and record its hash and the function timeout. From Stage 2: `LEASE_TTL_SECONDS` = `660` (600 or less is invalid configuration and nothing syncs); `HUBSPOT_PORTAL_ID` is required and must be `52311591`; the two object type settings must equal the portal table or be removed; `HUBSPOT_PORTAL_ID_TEST` is no longer read and is removed. Cosmos records written before Stage 2 have keys without the portal ID and are never read again, so the first run of each linked record after the deploy is one full write. Check whether duplicate detection can be turned on for `employee-sync-queue` without recreating it (S2-R5, OPEN-ITEMS section 6). | Zeke, or Claude through the Azure CLI on Zeke's go-ahead for each write | Every value read back (setting names, never values); app still Stopped |
| 7.4 | From the Stage 1 review. Before round 1, confirm the answer shape of `GET /contacts/{id}/labels` with one read-only GET on a test contact Zeke names. Record the field names only, never values. The code reads a label ID only from `labelId` or a plain number (`readLabelIds` in `src/lib/centralReachClient.mjs`). If CR names the field differently, change that reader and its test first. Until it matches, every create and update stops at the label step with `error`: the core fields are written, the labels and metadata are not. | Zeke runs the GET; Claude changes the reader | The reader matches the real answer; `npm test` passes |

### Stage 8 — Full sandbox testing

Run only from the agreed plan. Each test that writes to CentralReach needs Zeke's go-ahead at that step and a test record he names. Stop at the first unexpected result. Draft list (input to 7.1, not the final plan):

| Area | Draft tests |
|---|---|
| Gate | A record outside the test list sends no webhook; with the poller on, a record without `sandbox_test_field` is never queued. |
| Employee create | Missing email → `error`, no CR call. Create off → `waiting`. Create with a blank `workday_id` → temporary ID, `waiting`. Two quick edits → one employee. Create with a Workday ID → `success`. BCBA create. |
| Workday ID steps | Address change while `waiting` reaches CR. Workday ID filled → `waiting` "replace". ID replaced on the CR profile and checklist ticked → `success`. Checklist ticked too early → `error`. Workday ID changed to another value → `error`, no CR write. |
| Identity | Two records with one Workday ID → the second is `error`. A Workday ID that an existing test employee holds → `waiting`, no link. |
| Case | Create, no duplicate, an update, the linked-Case check with a wrong Client ID → `error`. |
| Retries and alert | A forced temporary failure walks the delay steps; one malformed test message dead-letters and the email arrives. |
| Poller | A change with its workflow off reaches CR within the hour and the log names the field; a no-op run writes nothing. |
| From the Stage 1 review | The first linked employee update ends `success` or `waiting`, which confirms the employee read carries `contact.contactId` or `contact.primaryEmail`; an `error` "CentralReach employee read could not be read" means the reader in `getEmployeeByContactId` needs the real field name. The first update of a linked Case whose client holds its Case record ID confirms the client lookup answer has `contact.contactId`; if not, the run stops with no write. A second record with the same Workday ID, saved within a few seconds of the first: expect `error`; note it if HubSpot search is slow to show the first record and the result is `waiting`. CR accepts `#` in a name and `+` in an email. After each round, the three test contacts are made inactive on the CR screen and the log is marked. |
| CentralReach behaviour | Labels POST adds or replaces; how a metadata value is cleared; whether an update accepts a changed email; contact form names; an update of a client created by hand (no External System ID); the one-call metadata update. |

After the label test, build the two held label rows as replace-on-change if CentralReach allows it:

- Staffing, from `staffing_status` (IDs are in `CENTRAL_REACH_CLIENT_STAFFING_LABELS`). A blank value sends no staffing label.
- Active / Inactive, from `case_status`: `Warm` → Active Client `1125427`†; `Cold` → In-Active Client `1121488`†.

If CentralReach cannot replace or remove a label, Zeke decides for each row whether to send it add-only or keep holding it.

### Stage 9 — Production readiness

| # | Step | Who |
|---|---|---|
| 9.1 | United Care's answers (section 12). | Danny / United Care |
| 9.2 | Existing CR employees: list which HubSpot employees are already in CR (a CR export matched against HubSpot, reviewed by United Care) and decide each. Until then the production record gate keeps them out of create and update, including the six hand-linked BT/RBT records and any of the 264 existing BTs whose checklist is ticked later. Zeke decides the production gate property. | Zeke / Danny |
| 9.3 | Existing CR clients: 81 of 100 sampled HubSpot Client IDs did not resolve through `GET /contacts/client/{id}`. Compare a few in the CR screen and decide before linked Case updates are turned on. | Zeke |
| 9.4 | Production HubSpot: `date_of_birth` on BCBA as a property sync; `crm.objects.owners.read`; webhook workflows with full trigger lists; failures and waiting views. | Zeke / Danny |
| 9.5 | Production Azure: settings for `50317927`, production secrets, the alert with Danny or a shared inbox added, deploy with the commit recorded. | Zeke, with Claude through the Azure CLI on his go-ahead |
| 9.6 | Go-live in steps: one worker at a time; updates before creates; then creates for new records only. Watch the failures view, the waiting view and the alert daily for the first week. | Zeke, Claude |
| 9.7 | Record the final state in the guide. | Claude, on Zeke's request |
| 9.8 | From the Stage 1 review. Do this before step 9.6. Build the Workday ID format check once Danny confirms the format (640 of 644 production values are 7 digits; section 12). A `workday_id` that is not in the format is `error` before any CR call. This also closes the temporary-ID risk in section 13: a HubSpot record ID is longer than a Workday ID, so it can never equal one. If Danny cannot give a fixed format, Zeke decides whether the temporary ID gets a prefix. | Danny for the format; Zeke decides; a builder agent builds |

Separate from these stages: the HubSpot API version migration (needs an owner; target before March 2027). Optional: destination audit, Case History Log, managed identity.

## 12. Not built yet, and what each waits on

| Item | Waits on | Owner |
|---|---|---|
| Staffing label row; Active / Inactive label (held: Zeke, 2026-11-18); any label removal (Billing Hold off) | The CentralReach label test (step 0.5) | Zeke |
| Workday ID format check | The format (640 of 644 production values are 7 digits) | Danny |
| Contact form by employee type and state | The table and the property that decides the state | United Care via Danny |
| Employee email change reaching CR | A CentralReach test of a changed email | Zeke |
| BCBA commercial insurer labels (Aetna, Cigna, Carelon) and CO Medicaid | How the NY and CO options map to the stateless labels | United Care |
| Funding labels for Aetna or Cigna in NJ, Aetna in CO, Other | Target labels | United Care |
| Work schedule Location #2 variants; Service Location "More Than One Location"; Address 2 | What `service_address__other` means and what decides "BT works at Location #2" | Sara |
| Physician pair selector; `insurance_id_3` | Which property decides Medicaid or commercial; the mapping | Zeke / Sara |
| Grad Permit Holder; Outgoing Supervising BCBA; SUB and On Leave BCBA | How the marker is carried; the removal-date rule | United Care |
| BCBA Care Coordinator | The CR employee field | Zeke |
| All Employees, Clinical, All Clients labels (the guide does not list them) | Keep or drop. Recommended: keep. | Zeke |
| Create signal earlier than Entered in CentralReach = Yes | Sara's answer | Sara, then Zeke |

## 13. Risks and assumptions

- **Assumed:** Danny and United Care accept the temporary ID. If not, only steps 1.5 to 1.9 change.
- **Assumed:** nothing at United Care reads the CR External System ID before staff replace the temporary ID. Not confirmed.
- **Assumed formats:** Client Availability, Known Allergies and Diagnosis text (steps 4.5, 4.9, 4.11); several staff in one role joined by commas (4.14). Each is checked in the sandbox test plan.
- **Not confirmed:** the IDs marked † (step 0.6); the answer shapes listed in section 4. The code treats an unreadable answer as a failed read, never as "empty".
- **Risk:** staff forget to replace the temporary ID. Covered by the waiting view and United Care's HubSpot alerts; the integration cannot replace it.
- **Risk:** every sandbox create is a real CR record that the API cannot delete. Keep to a handful of named test records; Zeke can make them inactive on the CR screen.
- **Risk (from the Stage 1 review):** the temporary ID is the plain HubSpot record ID. An unlinked record that finds a CR employee by its own record ID links to it as "its own earlier create" (decision 5). If a real employee's External System ID in CR ever equalled a new record's HubSpot record ID, that record would link to the wrong employee and update it. Unlikely: the production record IDs seen are 11 digits and 640 of 644 Workday IDs are 7 digits. Not a sandbox risk, because only the test records sync. Closed by step 9.8 before production.
- **Assumed (from the Stage 1 review):** a CR employee read carries `contact.contactId` or `contact.primaryEmail`, and a label read names the label ID `labelId`. If either is wrong the run stops with a visible `error` and no wrong write. Steps 7.4 and Stage 8 confirm both.
- **Risk:** a record created with its Workday ID whose state is lost shows `waiting` instead of re-linking (end of section 7). No duplicate results.
- **Cost accepted:** an employee run that is not a clean no-op makes one CR read for the ID check; a Case run reads the Case and two association lists.

## 14. Hand-off brief for the builder agent

From Stage 2 on the builder is a Claude agent that the orchestrator starts with a fresh context, one stage per agent, in this working copy on `architecture-update` (not a worktree). The orchestrator gives it this brief and the stage number. Stage 1 was built by Grok through `cursor-agent`; that command is no longer part of this plan.

**Brief.**

1. You are building one stage of an integration that writes to a production system. Read these first, in full: this file's sections 2 to 5, the section for your stage, and `guide-extract-2026-11-18.md` for the guide rows your stage cites. Read the source files your stage lists before changing them.
2. Obey the hard stops in section 2. In particular: no live API calls, no `func start`, no deploy, no git commands that change anything (no add, commit, push, checkout, stash, reset), and do not open `.env` or `local.settings.json`.
3. Work in this order: write the tests for every row of your stage table from the rule text; run them and see them fail; write the code; run `npm test` until everything passes. For each workflow your stage changes, at least one test runs the real path with nothing faked between the mapper and the hash (no fake `hashPayload`, no fake mapper). The Stage 1 review found a defect that every test missed because the hash was faked.
4. Build only your stage. If a rule is unclear, or the code makes a rule impossible as written, do not guess: leave that row unbuilt and say so in the report.
5. Keep the change small and readable. Follow the existing style: ES modules, functions passed in through `dependencies` for tests, `safeLog` for logs, field names in logs and reasons, never values. No new packages.
6. Do not weaken or delete a test to make it pass. Change an old test only where this plan changed its rule, and list each one.
7. Finish with a **stage report**: files changed; each new test title; the `npm test` totals; each old test changed and why; any row not built and why; any app setting added, renamed or retired; questions; and one line confirming that no live call, deploy or git change was made.

## 15. Review brief (the reviewer agent, every stage)

Give the reviewer the diff, this file's sections 2 to 5 and the stage section. Do not give it the builder's stage report or any conclusion. The orchestrator then confirms each finding by running code before it reaches Zeke.

1. Re-run `npm test`. Read every changed file in full, not only the diff lines.
2. For each row of the stage table: is the rule built as written, and does a test prove it? Name any row with no test, and any rule that is proven only through a faked hash or mapper.
3. Look for any path that can: create a duplicate; write to the wrong CentralReach record; write for a record the gate should skip; lose a change; turn a failed read into a blank; retry something permanent or drop something temporary; log or store a value instead of a field name.
4. Check that the create signal is read only in `src/lib/syncEligibility.mjs`, that `blocked` is not written, and that no test or script calls a live service.
5. Report findings with `file:line`, a severity (high: duplicate, wrong record, gate bypass, lost change, production write risk; medium; low) and the smallest fix. Change nothing.

Per stage: the builder agent builds → the reviewer agent reviews → the orchestrator verifies each finding → the orchestrator or the builder fixes → `npm test` → tracker and OPEN-ITEMS updated → Zeke says whether to commit and push. Stages run one at a time; no two agents write the same files.

## 16. Cross-reference to the tracker

For tracker upkeep only. A builder can ignore this table.

| Plan step | Tracker ID |
|---|---|
| 1.1, 3.4 | Q26, review F16; decision of 2026-11-18 |
| 1.2 | Q31, V2 |
| 1.3 | V17 |
| 1.4 | V9, V10, item 7 |
| 1.5 to 1.7 | Q35, Q32, V5, review F01 and F02 |
| 1.8 | V5 |
| 1.9 | Q30, Q35 |
| 1.10 | V11 |
| 1.11 | V4, Q30, review F15 |
| 1.12 | V1, Q22 |
| 2.1 to 2.4 | 8F, 8H, N1, V13, V14, B3 |
| 2.5, 2.6 | 8D, 8I, B4 |
| 2.7 to 2.11 | Item 12, V16, V18, B8 |
| 3.1 to 3.6 | Item 11, V19, N2, N3 |
| 3.7, 3.8 | Item 9, V15, Q10 |
| 3.10, 3.11 | Item 10, Q12 |
| Stage 4 | Items 3, 6, 7; B5, N4 |
| Stage 5 | Items 4, 5 |
| Stage 6 | Item 10, V20 |
| 9.2, 9.3 | Q33, V6; 2026-11-18 client read |
