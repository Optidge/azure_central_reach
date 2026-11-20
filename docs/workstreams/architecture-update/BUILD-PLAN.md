# Build plan — HubSpot → Azure → CentralReach

Plan of 2026-11-20. It replaces the plan of 2026-11-18. Branch `architecture-update`, code at `8fe5c54`, `npm test` 402 pass. Stages 1 and 2 are built, committed and pushed. Stages P and 3 to 9 remain.

This file is written so a builder with no history of the project can build from it. Every rule is stated here in plain words, with the guide section it comes from, the files it touches and the test that proves it.

- **Authority.** The integration guide (Google Doc `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`) is the business-rule authority. If the guide and this file disagree, stop and tell Zeke. A read-only text copy of the guide is saved next to this file as `guide-extract-2026-11-20.md` (Stage P, step P.4); the live guide wins over the copy. The older copy, `guide-extract-2026-11-18.md`, predates the guide notes `[G19]` and `[G20]`. Do not build from it.
- **Permission.** Zeke asked for the full build on 2026-11-18 and for this rebuilt plan on 2026-11-20. This file is permission to change code and tests in this repo only. It is not permission to commit, push, deploy, start the app, or write to Azure, HubSpot or CentralReach. Each of those needs Zeke's go-ahead at the time.
- **History.** Decisions, evidence and the reasons behind each rule are in [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md) (the tracker) and [OPEN-ITEMS.md](OPEN-ITEMS.md). A builder does not need to read them. Section 20 maps each step to its tracker ID for the people who keep the tracker.
- **How this plan was made (2026-11-20).** The guide was read in full, every tab. The requirements in section 9 were taken from it row by row. Two independent reviewers (Opus 5.5, high effort, fresh context) checked the plan and the registers, and the orchestrator confirmed each point against the guide or the code. Zeke then answered the open points; his answers are decisions 13 to 28 in section 4.

## 1. Summary

- **Order.** Stage P (prep), then the code stages 3 to 6, then the final sandbox test plan and a deploy while the app is Stopped, then sandbox testing, then production readiness.
- **Design.** Unchanged and approved: HubSpot workflows send a signed, ID-only webhook; Azure queues the record; a worker reads HubSpot, checks the record may sync, compares it with the last synced copy, writes to CentralReach only what changed, and writes the result back to HubSpot. An hourly poller and a daily sweep are safety checks. Cosmos holds the link and the last synced values. Failures show in a HubSpot report and one Azure email alert. No new Azure resource is needed.
- **Builder.** Claude, from Stage 2 on (Zeke, 2026-11-18). Claude Fable 5.2 is the orchestrator. It starts builder agents and independent reviewer agents, checks every finding by running code, and keeps this plan, the tracker and the guide current. Stage 1 was built by Grok 4.6 and reviewed by Claude.
- **What blocks what.** Nothing blocks the build of Stages P and 3 to 6. Section 15 lists what is still open and who owns it. Section 17 says what cannot yet safely reach production and why.

| Stage | What | Who | Ends with |
|---|---|---|---|
| 0 | Prep: decisions recorded, guide aligned, guide copy saved, baseline test run | Claude, Zeke | Done |
| 1 | Create and identity checks | Grok built, Claude reviewed and fixed (done, `ef83b6b`) | Done |
| 2 | Durable state and retries | Claude builder, Claude reviewer, orchestrator verifies (done, `8fe5c54`) | Done |
| P | Prep for parallel work: seams between files, shared contracts, the label list, evidence, a new guide copy | One builder agent; Zeke for the go-aheads | Reviewed diff, `npm test` green |
| 3 | Poller, fewer calls, label sender, safeguards | Builder agents in lanes A, B, L (section 17) | same |
| 4 | Case mappings | Builder agents in lanes C and D | same |
| 5 | Employee mappings | Builder agent in lane C | same |
| 6 | Contact routing | Builder agent in lane E | same |
| 7 | Final sandbox test plan; HubSpot setup; deploy while the app is Stopped | Claude writes, Zeke agrees; deploy through the Azure CLI on Zeke's go-ahead | Plan agreed; build deployed; app still Stopped |
| 8 | Sandbox rounds with test records only | Zeke, Claude | Every test recorded |
| 9 | Production readiness and go-live | Zeke, Danny, Claude | Production running |

## 2. Who does what

| Who | Does | Does not |
|---|---|---|
| **Zeke** | Every decision and go-ahead. HubSpot setup (workflows, lists, views, test records). CentralReach screen actions. Secrets in Azure and local settings. Says when to commit and push. | — |
| **Claude, orchestrator** (Fable 5.2) | This plan, the tracker, OPEN-ITEMS, the guide (on Zeke's request, text shown first). Starts the builder agents and the reviewer agents, re-runs `npm test`, and confirms each finding by running code before it is reported. Fixes findings, or sends them back to the builder. Read-only HubSpot and CentralReach checks with Zeke's go-ahead. Azure steps in Stages 7 to 9 through the Azure CLI: read-only commands first, each write on Zeke's go-ahead for that command, setting names only and never values. | No CentralReach or HubSpot writes without Zeke's go-ahead and a record he names. No Azure write, deploy or start without Zeke's go-ahead for that step. |
| **Builder agent** (Claude Fable 5.2, high effort, a fresh context per lane) | Tests first, then code, only the rows and files of its lane (section 17). Runs `npm test`. Returns a stage report (section 18). | No commit, push, deploy or live API call. No git command that changes anything. |
| **Reviewer agent** (Opus 5.5, high effort, every lane) | An independent read of the lane's diff against this plan. It gets the diff and the plan sections, never the builder's report. | No code edits. |
| **Grok** | Built Stage 1 (2026-11-18). Not used from Stage 2 on unless Zeke says so. | — |
| **Danny / United Care** | The answers named in section 15. | — |

### Hard stops for everyone

1. **CentralReach has no sandbox.** Every CentralReach write is a production write. None is made without Zeke's go-ahead and a test record he names. The record he named for label and API behaviour tests is CR employee `5338681` (2026-11-20); every later write to it still needs his go-ahead in that session.
2. **No live calls during the build.** Code stages are proven by offline tests only. Do not run `func start`, do not start or deploy `centralreachserverless`, do not run any script that calls HubSpot, CentralReach, Service Bus or Cosmos. The read-only checks in step P.7 and the API tests this plan names are run by the orchestrator, on Zeke's go-ahead, never by a builder.
3. **Portals.** Sandbox `52311591`. Production `50317927`. Retired `50850427`. Never use `246184070`.
4. **Secrets and personal data.** Never print, log, commit or paste secrets, tokens, `.env`, `local.settings.json`, `.claude/`, patient or staff data, or the body of a provider error. Do not open `.env` or `local.settings.json`. Log field names, never values. A CentralReach employee response contains sensitive fields; never log a response body.
5. **Existing CentralReach employees** are not created, linked or updated for now. This includes the six production BT/RBT records whose `employee_id` was typed by hand.
6. **Git.** Commit and push only when Zeke says. Stage files by path. No force-push. No checkout, fetch, pull, stash, reset or branch switch. Never act on PR #2 or PR #3. Run the pre-commit block in `docs/workstreams/session-run/GIT-SESSION-PLAYBOOK.md` before every commit. Exception (Zeke, 2026-11-20, decision 29): Stage P is committed first, and each parallel lane then works in its own worktree and branch (section 17). Each wave's merge into `architecture-update`, and any push, is still asked for at the time.
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

In this plan "workflow" in a file path (`src/workflows/…`) means a code file. "HubSpot workflow" means an automation in HubSpot.

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
| Saved copy | The link record in Cosmos: the CR ID and the hashes of the values last synced to it. |
| Required labels | The CR labels a record must hold now, worked out from HubSpot. |
| Managed labels | Every CR label the integration maps for that kind of record. A managed label that is not required is removed. A label the integration does not map is never touched. |
| Base labels | All Clients, All Employees, Clinical and the BCBA header. Always required, never removed. |

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
| Association types still undecided: Outgoing Supervising / SUB / On Leave BCBA | 253 / 217 / 233 | 135 / 234 / 236 |
| Outgoing BT 1 / Outgoing BT 2 (no CR target yet) | 244 / 236 | 131 / 166 |

The same number can mean different roles in the two portals (236 is On Leave BCBA in production and Outgoing BT 2 in the sandbox). A role is always matched by target object and type ID together.

The four Case stages that never sync, in both portals: `1383894301`, `1383894303`, `1383894302`, `1332962645`. The full crosswalk is guide section `[SCURRENT]`.

### How the code is tested

- `npm test` runs `node --test`. Tests are `src/tests/smoke/*.test.mjs`. 402 pass at `8fe5c54`.
- Workflows take a `dependencies` argument, so tests pass in fakes for HubSpot, CentralReach, Cosmos and Service Bus. No test calls a live service.
- Every new test title starts with the guide code or the requirement ID it proves, for example `[G19] staffing_status Staffed 97153 requires label 1156746`.
- The existing tests are a safety net. When a rule in this plan changes what an old test asserts, change the old test and say so in the stage report.

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
| 9 | Replaced on 11/20 by decisions 13 and 14. (It said: labels are add-only until the CentralReach label test; the staffing and Active / Inactive labels are built after that test.) | 11/17, 11/18 |
| 10 | Sandbox testing uses only records with `sandbox_test_field` = true. The employees and clients they create in production CR are those same test records. | 11/18 |
| 11 | Existing CR employees are not created, linked or updated for now. | 11/17 |
| 12 | The final sandbox test plan is written and agreed after the build. | 11/18 |
| 13 | **The label hold is lifted.** The label test was run first-hand (below). The guide's replace-and-remove rules apply as written: Active / Inactive, staffing and Billing Hold removal are built. | 11/20 |
| 14 | **Every label the integration maps is a managed label.** It is on the contact only while its HubSpot source says so. Labels the integration does not map are kept. The base labels All Clients, All Employees and Clinical are kept and always sent. (The first sentence is the orchestrator's reading of Zeke's answer; he has seen it and did not change it.) | 11/20 |
| 15 | **Staffing labels:** only 97151 Services, Staffed 97153 and X 97153 (guide `[G19]`). **No client funding labels.** New Mexico and Virginia employee labels exist but are not sent until a HubSpot value exists. | 11/19, 11/20 |
| 16 | **BT/RBT role labels:** a BT gets Behavior Technician and an RBT gets RBT, by state, Colorado included. One label per Work State. | 11/20 |
| 17 | **Contact forms:** every BCBA is created with `Admin`. A BT/RBT is created with `Behavior Technician NY`, except Colorado, where a BT or an RBT is created with `RBT CO`. New Jersey has no form of its own and uses the New York form. (The Colorado row was proposed by the orchestrator and not objected to.) | 11/20 |
| 18 | **Client creates are gated by the record gate.** There is no separate client-create switch. | 11/20 |
| 19 | **A CR ID typed by hand into HubSpot is trusted.** The only check on it is that it is digits only. | 11/20 |
| 20 | **Production is gated with a segment Zeke picks at the move to production.** The segment has one checkbox property behind it, and that property is the production value of `SYNC_RECORD_GATE_PROPERTY`, because a segment filters webhooks only and the poller, the sweep and the workers use the setting. | 11/20 |
| 21 | **Sandbox test records are created with their associations**, as records are in production: the Case to its BCBA, its BT/RBT and a Parent/Guardian Contact; each employee to its own Contact. | 11/20 |
| 22 | **Workday ID: a note only for now.** The temporary ID is the HubSpot record ID, nothing reads it in CR, and sandbox rounds test that path with `workday_id` blank. No Workday ID format check is built until Sara answers. | 11/20, for now |
| 23 | **Employee date of birth:** the `2000-01-01` placeholder stays for now. The `date_of_birth` property must be added to production BCBA before BCBA creates run there. | 11/20, for now |
| 24 | **The Case sync properties hold the first Parent/Guardian Contact.** The integration reads them and does not choose a Contact. | 11/20 |
| 25 | **BCBA credential labels the guide does not document are not built.** NY Medicaid is documented and is built. | 11/20 |
| 26 | **Location and Address 2:** Service Location Address 2 is mapped (row 4.22) and checked on the CR screen. The Location #2 work schedules have no CR field; decided when Stage 4 is built. | 11/20 |
| 27 | **A CR field that is missing is created by script, on Zeke's go-ahead, while building.** Only Optidge adds fields in CentralReach. | 11/20 |
| 28 | **In the code, the orchestrator picks the best route** for: the client External System ID and contact form (sent on a create only); the client lookup before a create (read-only); blank core fields (decided after one API test, row 3.13); the mapping version (compared, row 3.7). Everything else still open is decided as it comes up in the stages. | 11/20 |
| 29 | **The build runs in parallel.** Stage P is committed first, then one worktree and branch per lane. Each wave's merge and any push is asked for at the time. | 11/20 |

### Checked on 2026-11-18 (read-only, with Zeke's go-ahead)

A sample of 100 of the 475 production Cases that hold a CR Client ID was read from CentralReach. GET requests only; counts only.

| Finding | Effect on this plan |
|---|---|
| `GET /contacts/client/{id}` does not return an External System ID field at all. | The linked-Case identity check cannot read the client's ID. It uses the lookup by External System ID instead (step 1.11). |
| No sampled client holds its Case record ID as External System ID (the lookup returned 404 `NotFound` for 100 of 100). | The Case mismatch rule will not stop clients that were created by hand. |
| `GET /contacts/client/{id}` returned 404 `NotFound` for 81 of 100 and 200 for 19 (13 active, 6 inactive). | Not a build item. Before production, find out why most HubSpot Client IDs do not resolve through this call (step 9.5). |
| `GET /contacts/employee/{id}` returns the employee under `contact`, including `contact.externalSystemId` and `contact.primaryEmail`. | The stored-email copy read the wrong place (fixed in step 1.10). |

Confirmed earlier and still relied on: an employee create with an empty External System ID is rejected (400); the API cannot change an External System ID after the create (400), but a person can on the CR profile; `GET /contacts/employee/byExternalSystemId?ExternalSystemId={id}` returns 200 with the employee, active or inactive, and 404 `NotFound` when nobody holds the ID.

### Checked on 2026-11-20 (first-hand, with Zeke's go-ahead)

**Label test on CR employee `5338681`.** Run by the orchestrator on the record Zeke named. The record started and ended with the same four labels: All Employees `1052618`, Behavior Technician NY `1052630`, Clinical `1052643`, NY Employee `1132655`. The body was always `{ "labels": [ { "labelId": N } ] }`.

| Step | Call | Result |
|---|---|---|
| 1 | POST the four labels plus RBT NY `1052631` | 200. The read showed five labels at once. |
| 2 | POST the four labels without RBT NY | 200. **The label was removed.** The read kept showing five labels and showed four after 122 seconds. |
| 3 | POST an empty list | 200. The read showed four labels straight after, and zero labels a minute or two later. **An empty list clears every label.** Seen once. |
| 4 | POST the four labels (restore) | 200. The read showed zero labels and showed four after 122 seconds. |
| 5 | POST the four labels plus one ID that does not exist (`999999999`) | 200. The read showed the same four labels for 186 seconds. **The unknown ID was ignored and nothing was cleared.** |

What this settles: the POST replaces the whole set, so a label is removed by leaving it out; a read can be about two minutes behind a write; an empty list is the dangerous body. An earlier report said an empty list changes nothing and that one invalid ID clears every label. Neither was reproduced. A label ID that was deleted from CR's catalog was not tested.

Other facts from the same day:

| Finding | Effect on this plan |
|---|---|
| `GET /contacts/{id}/labels` answers `labels`, each item with `labelId`. | The label reader in the code matches. Old step 7.4 is done. |
| `GET /contacts/labels` (the live catalog) returned 102 labels. | The label sender checks every ID against it (row L.1). |
| `GET /contacts/employee/5338681` answers 200 and `GET /contacts/client/5338681` answers 400. | A contact's kind can be told by a read. |
| The saved catalog files of 2026-11-18 (`../central_reach_test_integration/output_files/org_labels_2026-11-18.json` and `metadata_configuration_org.json`) hold every label ID and metadata field ID this plan uses, except three: NM Employee `1157030` and VA Employee `1157031` (reported on 2026-11-20, not in the files), and Active Case Count `147882` (created 11/13; the guide records it on 11/16 and the code already sends it). Field `137697` is a textarea; `138091` is Service Location Address 2. | The IDs in sections 9 to 12 are confirmed against those files. Step P.6 takes a fresh snapshot that covers the three. |
| The code calls only HubSpot `/crm/v3` and `/crm/v4`. | No old-version call is left in `src/`. |

Not confirmed: what the client lookup by External System ID returns when it finds a client (it is read strictly, and an unreadable answer stops the run with no write); whether a CR update that sends a blank core field clears the stored value (row 3.13); how long after a create the lookup finds the new record (row 3.15); what labels or permissions a contact form sets by itself (Stage 8).

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

`SYNC_RECORD_GATE_PROPERTY` is required. Its value is a HubSpot property name, or the word `none` to turn the gate off on purpose. If the setting is missing, configuration is invalid and nothing syncs. The gate is also the only control on client creates (decision 18).

The create signal is read in one place only: `caseEntryIsYes` and `employeeEntryIsYes` in `src/lib/syncEligibility.mjs`.

### 5.2 Status values

| Value | Meaning | Retried? | Where staff see it |
|---|---|---|---|
| `success` | CentralReach matches HubSpot. | — | — |
| `error` | A person must fix something, or the retries are used up. | No | Failures report |
| `waiting` | Nothing is broken. The record waits on a person or a setting. | No, and never dead-lettered | Waiting view |

- The reason goes in `last_sync_error` as a fixed sentence. It names fields, never values. All reason sentences live in `src/constants/syncReasons.mjs`.
- Every status writeback also sets `last_sync_at`, `integration_last_write` and `updated_by_integration = true`.
- `blocked` is no longer written. `noop` is written until row 3.7 is built, then never.
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
create once, under a lock on the External System ID, with the contact form from 5.9
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

- **Create.** Look the client up by the Case record ID with the read-only call (`GET /contacts/client/byExternalSystemId`). Not found (404): create, sending the Case record ID as the External System ID and the contact form. Found: this Case's own client; save the link and update it by its CR ID. An answer that is not 200 or 404: stop and retry later, never create. A 200 with no readable CR ID is an `error`, never a create. (Today the code uses a full-payload PUT as the lookup; row 3.14 replaces it.)
- **External System ID and contact form are sent on a create only.** An update never sends them: the client read does not show what CR holds, so an update could not see what it overwrites. (Today every update sends both; row 3.14.)
- **Linked Case.** Before an update that would write to CentralReach, look up the client by this Case's record ID. Found under a different CR ID than HubSpot holds: no CR write, `error`. Found under the same CR ID, or not found: update. An unclear answer: stop and retry later.
- **A CR ID from HubSpot must be digits only** (Case `client_id_number`; employee `employee_id`). Anything else is an `error` with no CR call (row 3.16). A CR ID typed by hand is otherwise trusted (decision 19).
- **Required fields.** First name, last name and date of birth are checked before a create; first and last name before an update. There is no date-of-birth placeholder for clients.

### 5.6 Labels

Built in rows P.3 and L.1 to L.4. These rules rest on the label test of 2026-11-20 (section 4).

- **The mapper returns two lists.** `requiredLabelIds`: the labels the record must hold now. `managedLabelIds`: every label the integration maps for that kind of record, whether required now or not.
- **The set to post** is the labels CR holds now, minus the managed labels, plus the required labels. So a managed label that is no longer required is removed, and a label staff added by hand is kept.
- **Never an empty list.** An empty list clears every label on the contact. The base labels are always required, so the set is never empty; the sender also refuses to post an empty set.
- **No POST when nothing would change.** If the set to post equals what CR holds, post nothing.
- **Only known IDs are sent.** Every ID the integration adds must be in the fixed list of sendable labels (row P.3). Every ID in the set to post, the integration's and the ones CR's read returned, must be in CR's live label catalog. If one is not, nothing is posted.
- **A failed label read makes no POST.** A read that fails is a temporary failure. A read that answers in a shape the code cannot read is permanent: `error`, no retry (Stage 2 decision 4). An empty read for a contact this run did not create is treated as a failed read, not as "no labels".
- **A POST is confirmed by reading it back, and a read can lag by about two minutes.** After a POST the posted set and the time are saved in the link record. For 150 seconds after a POST the integration makes no new label POST for that contact; a run in that window only reads and compares. A set that the read does not show is retried on the normal schedule and never posted again just because the read still shows the old set.
- **One body shape:** `{ "labels": [ { "labelId": N } ] }`. A 400 is a permanent failure.

Which labels are managed and which are base labels is listed per entity in section 9.

### 5.7 Dates

- A filled date that cannot be read as a date is an `error`. It is never treated as blank.
- Employee date of birth: blank on a create sends the placeholder `2000-01-01` and logs a warning (decision 23); blank on an update leaves the field out of the request; a `date_of_birth` property that is missing from the HubSpot answer (the property does not exist in the portal) is an `error`.
- Client date of birth: blank on a create is an `error`; blank on an update leaves the field out.
- A date sent to a CR metadata text field is written as `MM/DD/YYYY`, as the code does today.

### 5.8 A failed read is never a clear

- A read that fails or is refused (401, 403), or a HubSpot answer that is missing a property the worker asked for (row 4.18), never becomes a blank sent to CentralReach. The run stops with no CR write.
- **Metadata.** A HubSpot value that is blank sends a clear only for a field whose saved copy holds a value, that is, a value the integration wrote before. A record with no saved copy gets no clears (Zeke, 2026-11-20, OPEN-ITEMS row 23 e).
- **An input that could not be read** (the Case owner, staff names, the BCBA's Contact) must not turn into a clear. For a Case the mapper leaves the field's key out. For an employee that is not enough, because the known-fields list puts the key back as blank: the field ID must be named in `omitFieldIds`.
- **Core fields** (name, gender, phones, address, guardian). Today a blank one is sent as null on every update. Whether CR clears the stored value is not known; row 3.13 decides what the code does after one API test.

### 5.9 Contact forms (employee create)

The forms that exist in CentralReach: Default employee form, Admin, BCBA CO, BCBA NY, Behavior Technician NY, Biller, Graduate Permit NY, RBT CO, RBT NY, Scheduler. New Jersey has no form.

| HubSpot record | Work State(s) `location` | `ContactForm` |
|---|---|---|
| BCBA | any | `Admin` |
| BT/RBT, type BT or RBT | contains Colorado and does not contain New York | `RBT CO` |
| BT/RBT, type BT or RBT | anything else (New York, New Jersey, several states with New York, blank) | `Behavior Technician NY` |

The form decides the create template only. The labels still follow section 9: a Colorado BT is created with the form `RBT CO` and gets the label Behavior Technician CO. Built in row 5.13.

## 6. Stage 0 — Prep (no code)

| # | Step | Who | Done when |
|---|---|---|---|
| 0.1 | Record Zeke's 2026-11-18 answers in the tracker and OPEN-ITEMS. | Claude | Done 2026-11-18 |
| 0.2 | Add the same rules to the guide as dated, insert-only notes. The text is drafted in `guide-inserts-2026-11-18.md`. | Claude, on Zeke's approval | Done 2026-11-18: 24 notes added in one revision-guarded batch and verified by a re-read (insert-only; headings unchanged). |
| 0.3 | Save a read-only text copy of the guide sections the build uses as `guide-extract-2026-11-18.md`: Business rules, `[GER-REQ]`, `[GER-CASE]`, `[GER-BCBA]`, `[GER-BT]`, `[GER-CONTACT]`, `[G17]`, `[G18]`, sections 7 to 9, the appendix, `[SCURRENT]` and the Change detection Architecture tab. | Claude | Done 2026-11-18, taken after 0.2, so it includes the 11/18 notes |
| 0.4 | Baseline: `npm test` shows 120 pass on a clean tree. | Claude | Done 2026-11-18: 120 pass at `be841e3` |
| 0.5 | Not blocking: run the CentralReach label test on a test employee Zeke names (read the labels, add one label, read again, restore). It decides the label rules for Stages 4 and 5 and unblocks the staffing and Active / Inactive rows. It is a production CR write, so it runs only on Zeke's word and on the record he names. | Zeke, in Cursor (2026-11-18) | Result in the tracker |
| 0.6 | Not blocking: a read-only read of the CR label catalog and metadata field list, to confirm the IDs the 2026-11-18 plan marked † (checked against the saved catalog on 2026-11-20; see section 4). | Zeke, in Cursor (2026-11-18) | IDs confirmed or corrected |

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

**Stage 1 status, 2026-11-18.** Built by Grok, reviewed by Claude, six review findings (S1-R1 to S1-R6) fixed; `npm test` 237 pass. The review left follow-ups for later stages. Each is written into its stage below and marked "from the Stage 1 review": Stage 3 (row 3.7), steps 7.1 and 7.4, the Stage 8 table, step 9.1 (the Workday ID format, a note for now) and section 16.

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


## 9. Requirements

Taken from the guide as read on 2026-11-20. Every row of Stages P and 3 to 9 names the requirement it serves. Codes in square brackets are the guide's section codes. The latest dated note in the guide wins over an older sentence.

Status words:

- **built 1** / **built 2**: built in Stage 1 or Stage 2 and in the code today.
- **built (old)**: in the code from before Stage 1, and it matches the guide.
- **to build**: a row below builds it.
- **held**: the guide gives the rule, but a named item in section 15 must be closed first.
- **open**: the guide does not give enough to build it. It waits on a person (section 15).
- **excluded**: the guide says not to send it.

### 9.1 Business rules

| ID | Rule | Guide source | Status | Waits on |
|---|---|---|---|---|
| BR1 | HubSpot workflows send a webhook for Case, BCBA and BT/RBT; Azure is the middleware. Create the CR client or employee when Entered in CentralReach is Yes and the record is not linked. For a Case the multi-checkbox `enter_in_central_reach` must contain `Yes`. For BCBA and BT/RBT `entered_in_centralreach` must equal `Yes`. | [GBR] Requirement 1; [G11] | built 1 (`src/lib/syncEligibility.mjs`) | Production HubSpot workflows (step 9.6) |
| BR2 | An employee whose `workday_id` is blank is created with the HubSpot record ID as a temporary External System ID. Staff later replace it on the CR profile and tick the checklist. | [GBR] R1 11/17; [G17] | built 1 | — (Zeke, 11/20: nothing reads the temporary ID) |
| BR3 | A person who is already in CR is not created again. Before a create the integration looks CR up by the HubSpot record ID and, when filled, by `workday_id`. Found by record ID → link. Found by Workday ID only and another HubSpot record holds that CR employee → `error`. Found by Workday ID only and no HubSpot record holds it → `waiting`, no link, no write. An unclear answer never leads to a create. | [G17] 11/18 | built 1 | — |
| BR4 | Existing CR employees are not created, linked or updated for now. A record gate (one app setting naming a HubSpot checkbox) lets a record sync only when the checkbox is true. In production the checkbox is the one behind the segment Zeke picks. | [G17] 11/17, 11/18; decision 20 | gate built 1; poller and sweep side to build (3.4) | The production segment and its checkbox (O-9) |
| BR5 | Push changes to the linked CR record whenever a listed field or label changes, for Case, BCBA and BT/RBT. Entered in CentralReach may be Yes, No or blank. All pipelines and stages, except the Case exclusions. | [GBR] Requirement 2 | worker built 1 and 2; detection to build (Stage 3); mappings to build (Stages 4 to 6) | — |
| BR6 | Case exclusions: skip a Case in stage `1383894301`, `1383894303`, `1383894302` or `1332962645`, for create and update, whatever its status or CR ID. | [GBR] R2; [C14B] | built 1 | — |
| BR7 | Skip `test_record` = true in normal processing, on Case, BCBA, BT/RBT and Contact. | [G11] 11/06; entity tables | built 1 for the three synced objects; Contact to build (6.2) | — |
| BR8 | ID mismatch. Employee: CR's External System ID and `workday_id` both filled and different → no update, `error`. A blank on either side is not a mismatch. Case: look the client up by the Case record ID; found under a different CR ID than HubSpot holds → `error`, no update. | [GBR] R2 11/17; [G17] | built 1 | — |
| BR9 | Status is `success`, `error` or `waiting`. `waiting` is never retried and never dead-lettered. `blocked` is retired. | [G17] | built 1 and 2; `noop` is still written until 3.7 | — |
| BR10 | Temporary-ID rules: `waiting` right after a temporary-ID create; updates continue while `waiting`; an update always sends the External System ID CR holds; the record is checked again when `workday_id` or the checklist changes, by the hourly poller and by the daily sweep; the five outcomes of the check (rule 5.4). | [G17] 11/18 | check built 1; poller and sweep to build (3.2, 3.5) | HubSpot trigger on `workday_id` and the checklist (step 7.2) |
| BR11 | One Workday ID per HubSpot employee record. | [G17] | built 1 | — |
| BR12 | The integration never deactivates anyone in CR. Linked BT/RBT in `Yes - Generic` and `No- Made Inactive` keep getting field updates. | [C14B]; [GER-BT] | built 1 (no deactivation code exists) | — |
| BR13 | Write back to HubSpot: the CR ID, the CR link, and `updated_by_integration`, `integration_last_write`, `last_sync_at`, `last_sync_status`, `last_sync_error`, `last_sync_hash`. Nothing else. Keep the written properties out of HubSpot workflow triggers. | entity tables; [G10C] item 3; [C28] | built 1; trigger check to build (3.10) | — |
| BR14 | Design: webhook first; an hourly checkpointed poller as a safety check; a daily sweep of linked records; durable state; retries at 1 min, 5 min, 15 min, 1 h, 4 h, then dead-letter; a record with no change writes nothing. | Architecture tab 11/17 | state and retries built 2; poller, sweep and no-op to build (Stage 3) | — |
| BR15 | Failures and monitoring: one HubSpot report per object on `last_sync_status` = `error`; a view of `waiting` records; one Azure email alert when a dead-letter queue is not empty; a HubSpot report of records the integration wrote in the last 24 hours, from `integration_last_write`. | Architecture tab 11/17; [G11] Monitoring | setup (7.2, 7.3, 9.6) | Zeke; Danny offered the 24-hour report |
| BR16 | A failed or refused read never becomes a blank sent to CR (rule 5.8). | Architecture tab, "Minimum changes" | built 1 and 2 for record reads; every new read in Stages 4 and 6 must follow it | — |
| BR17 | Compare the complete mapped state, with blanks, metadata, labels and relationships. Save the synced state only after the writes succeed. Staffing is compared by record ID and role, not by name. | Architecture tab | built 2; staffing by role to build (4.14) | — |
| BR18 | Values that change with no edit must still be caught: `case_status`, `staffing_status`, the staff name rollups and association changes. | [G11]; [G04] | to build (3.2, 3.5, 3.10) and HubSpot triggers (7.2) | — |
| BR19 | Labels. [G19] wins over the older label lists. The guide's replace-and-remove rules apply as written, because the label POST replaces the whole set (test of 11/20). Every label the integration maps is managed; the base labels are always sent; labels the integration does not map are kept (rule 5.6). | [G19]; [G07]; [G08]; decisions 13, 14 | add-only built 1; managed sender to build (P.3, L.1 to L.4) | — |
| BR20 | Sandbox first, with test records only (`sandbox_test_field` = true, `test_record` blank), one new Case, BT/RBT and BCBA per round, created with their associations. | [G20]; [G17]; decision 21 | Stages 7 and 8 | Zeke |
| BR21 | Logs and status reasons name fields, never values. No child's full name in any message. | [G02] | built 1 and 2 | — |
| BR22 | A client's External System ID and contact form are sent on a create only. | [GER-REQ] intro; decision 28 | to build (3.14). Today every client update sends both. | — |

### 9.2 Case → CR client

Fields. "Meta" = CR client metadata field ID.

| ID | Requirement | Guide source | HubSpot source | CR target | Status | Waits on |
|---|---|---|---|---|---|---|
| C1 | Contact form | [GER-REQ] | App setting `CR_CLIENT_CONTACT_FORM`, else "Public Client Intake Form" | `ContactForm`, create only (BR22) | built (old) | — |
| C2 | Legal name | [GER-REQ]; [GER-CASE] | `phi_first_name__cloned_`, `phi_last_name` (never `dealname`) | `FirstName`, `LastName` | built 1 | — |
| C3 | Date of birth. Blank on a create is an `error`; no placeholder. | [GER-REQ] | `phi_date_of_birth` | `DateOfBirth` | built 1 | — |
| C4 | Gender | [GER-CASE] | `phi_gender` (`male`, `female`) | `Gender` | built (old) | — |
| C5 | External System ID | [GER-REQ] | Case record ID | `ExternalSystemId`, create only (BR22) | built (old); create-only to build (3.14) | — |
| C6 | Primary email, when valid | [GER-CASE] | `email` (Case sync property from the Guardian Contact) | `PrimaryEmail` | built (old) | — |
| C7 | Guardian name | [GER-CASE]; [G19] | `guardian_first_name`, `guardian_last_name` (Case sync properties; they hold the first Parent/Guardian Contact, decision 24) | `GuardianFirstName`, `GuardianLastName` | built (old) | — |
| C8 | Mailing address and phone | [GER-CASE] | `street_address`, `home_apt`, `location_city`, `stateregion`, `postal_code`, `phone` | Address line 1 and 2, city, state, zip, cell phone | to build (4.1). Today line 1 prefers a misspelled alternate-address property and the state comes from `location_central_reach` / `location`. | — |
| C9 | Second phone | not a [GER-CASE] row; [G20] sets it on test records | `phone_number__second_` | `PhoneHome` | built (old) | Zeke: keep or drop (O-20). Kept until he decides. |
| C10 | Care Coordinator name and email | [GER-CASE] | `hubspot_owner_id` → `GET /crm/v3/owners/{id}` | Meta `138851` (one field) | to build (4.16), name only | `crm.objects.owners.read` (Danny); a target for the email (O-17) |
| C11 | IA BCBA and Reassessment BCBA | [GER-CASE]; [G04] | Case → BCBA associations IA (prod 86, sandbox 223) and RE (145 / 229), then the staff record's `first_name` + `last_name` | Meta `131314` (IA), `144602` (RE) | to build (4.14). Today it sends the text property `initial_assessment_bcba`. | — |
| C12 | Supervising BCBA | [GER-CASE] | `ongoing_central_reach_provider_supplier` | Meta `131308` | to build (4.15) as the typed text. Today it reads `supervising_bcba`. | How "match to the CR provider by name" is done (O-16) |
| C13 | Grad Permit Holder | [GER-CASE]; [G10A] | Supervising association (82 / 247) with `lba_licensure__ny` = Grad Permit | Meta `136052` | open | United Care: how the marker is carried (O-15) |
| C14 | Primary BT 1 and 2 names | [GER-CASE]; [G04] | Case → BT/RBT associations Primary BT 1 (76 / 238) and 2 (143 / 240), then `first_name` + `last_name` | Meta `131313`, `138092` | to build (4.14). Today it sends the rollups `current_primary_bt`, `current_primary_bt_2`. | — |
| C15 | Outgoing BT 1 and 2 stay active until the removal date passes | [GER-CASE]; [G04] | Associations 131 / 166 (sandbox 244 / 236) | none recorded | open | United Care: the CR target and the removal-date property (O-15) |
| C16 | Association read rules. Never sync: unlabeled, Potential and Previous IA (production 20, 64, 153, 80, 74, 164, 286; sandbox 164, 187, 251, 249, 242, 218, 235). Undecided: Outgoing Supervising, SUB, On Leave (production 135, 234, 236; sandbox 253, 217, 233). A role is matched by target object and type ID together. | [GER-CASE]; [G04]; [SCURRENT] | v4 associations | — | exclusions built 2 (portal table in `src/lib/config.mjs`); the undecided three are open | United Care (O-15) |
| C17 | Work Schedule #1 and #2 | [GER-CASE] | `work_schedule_details`, `btrbt_work_schedule_2_details` | Meta `132304`, `138093` | to build (4.4). Today it reads `bt_work_schedule_confirmed` and `bt_work_schedule_2_confirmed`. | — |
| C18 | Work schedule Location #2 variants | [GER-CASE] | `work_schedule_1_details__for_location_2_other`, `work_schedule_2_details__for_location_2_other` | **no CR field exists** (the catalog has only Work Schedule #1 and #2) | open | Decided when Stage 4 is built (O-14); a missing field is created by script on Zeke's go-ahead (decision 27) |
| C19 | Client Availability: the text and the weekly hours | [GER-CASE] | `finalized_client_service_hours_post_assessment`, `client_service_hours_total` | Meta `126209` | to build (4.5). Today it reads `client_availability_completed`. | Text format assumed (O-28) |
| C20 | Total Assigned Hours (97153) | [GER-CASE] | `total_hours_bt1bt2_work_schedule` (never the two older totals) | Meta `134331` | to build (4.6). Today it reads `assigned_hours`. | — |
| C21 | Per-BT hours | [GER-CASE] "as applicable" | `hours_bt_work_schedule_1`, `hours_bt_work_schedule_2` | none recorded | open | Zeke / Sara: is a CR field wanted (O-18) |
| C22 | Approved Auth Hours | [GER-CASE] | `initial_auth_tracks`: Prior Authorization Required → `n97153_approved_assessment_hours_auth_req`; No Prior Authorization Required → `ia_hours_from_the_ia` | Meta `132431` | to build (4.7). Today it reads `authorized_hours`. | — |
| C23 | Auth Period | [GER-CASE] | `ongoing_auth_period_start_date`, `ongoing_autrh_period_end_date` (the spelling is real); never the `_f` copies | Meta `134672` | to build (4.8). Today it reads `auth_start_date`, `auth_end_date`. | Text format assumed (O-28) |
| C24 | Service Location Address | [GER-CASE] | `specific_home_location`: Child's House or More Than One Location → `full_home_address`; Other Location → `service__street_address`, `service__apt`, `service__city`, `service__postal_code` | Meta `137697` (a textarea field) | to build (4.13) | — |
| C25 | Service Location Address 2 | [GER-CASE]; section 3; decision 26 | `service_address__other`, when `specific_home_location` is More Than One Location | Meta `138091` | to build (4.22) | How it shows on the CR screen is checked in Stage 8 |
| C26 | Known Allergies | [GER-CASE]; [GAPP] | `allergies` (stores `Confirmed` / `Denial`), `allergies__yes__explain` | Meta `126214` | to build (4.9). Today it sends the stored word alone. | Text format assumed (O-28) |
| C27 | Comorbid and Maladaptive, main fields only | [GER-CASE]; [C14B] | `does_your_child_have_any_other_comorbid_diagnoses_`, `maladaptive_behaviors__parentguardian` (stored option values) | Meta `132303`, `126207` | to build (4.2). **Today it reads the two `__clinical` properties, which [C14B] says not to map.** | — |
| C28 | Severity; Important information - Parent | [GER-CASE] | `severity_level_clinical`; `important_information` | Meta `133826`; `138378` | severity built (old); parent notes to build (4.3) | — |
| C29 | Primary insurance and ID | [GER-CASE] | `insurance_primary`, or `insurance_1__other__summary` when Other; `insurance_id_1` | Meta `126210`; `131316` | built (old) | — |
| C30 | Secondary insurance and ID | [GER-CASE] | `insurance_2`, or `insurance_2__other__summary` when Other; `insurance_id_2`. Never `n2_what_type_of_insurance`. | Meta `144600`; `144601` | to build (4.10) | — |
| C31 | Referring physician and NPI, the Medicaid or the commercial pair | [GER-CASE] "by insurance type" | `physician_name` + `npi_number`, or `physician_name__commercial` + `npi_number__commercial` | Meta `131151` | built (old), chosen by `n1_what_type_of_insurance` | Zeke / Sara: which property decides (O-19); its stored values are read in P.7 |
| C32 | Referring Physician Medicaid ID | [GER-CASE] | `referring_provider_medicaid_id` | Meta `141233` | to build (4.11) | — |
| C33 | Diagnosis | [GER-CASE]; [GAPP] | `phi_diagnosis` (stores `Yes` for the option shown as "Yes-F84.0") + `diagnosis_other` | Meta `144793` | to build (4.11) | Text format assumed (O-28) |
| C34 | ASD dates, both, each to its own field | [GER-CASE] | `most_recent_asd_diagnosis_date_1`; `most_recent_asd_diagnosis_date_medicaid` | Meta `131195`; `138701` | to build (4.12). Today it picks one by insurance type and reads `most_recent_asd_diagnosis_date_2`. | — |
| C35 | Policyholder name and DOB | [GER-CASE] | `policy_holder_name`; `phi__policy_holder_dob` | Meta `138090`; `137667` | built (old) | — |
| C36 | Referral Source | [GER-CASE] | `referral_source` | Meta `126222` | to build (4.11) | — |
| C37 | HubSpot link to the Case record | mirrors the employee rule in [GER-BCBA] and [GER-BT] | Case record ID | Meta `138702` | built (old) | — |
| C38 | `insurance_id_3`, `insurance_id_4` | [GER-CASE] exclusions | — | none | open. Both are still requested from HubSpot today; 4.17 stops that. | Zeke / Sara (O-19) |

Client labels. Every ID is in the saved catalog of 2026-11-18.

| ID | Label rule | Guide source | HubSpot source | CR label | Group | Status |
|---|---|---|---|---|---|---|
| CL1 | State | [GER-CASE]; [G07B] | `location` | Colorado → CO Client `1132648`; New Jersey → NJ Client `1132647`; New York → NY Client `1082499`. Kept when the Case goes Active ↔ Inactive. | managed | NY and CO built (old); NJ and the managed group to build (4.19) |
| CL2 | Service location | [GER-CASE]; [G07B] | `specific_home_location` is Child's House or More Than One Location | Home `1052656` | managed | to build (4.20). School and Clinic are deferred by the guide. |
| CL3 | Active / Inactive | [GER-CASE]; [G07] | `case_status`: `Warm` → Active Client `1125427`; `Cold` → In-Active Client `1121488` | one of the two | managed | to build (4.21) |
| CL4 | Staffing | [G19] wins over [GER-CASE] and [G07] | `staffing_status` | Only three: 97151 Services `1156743`, Staffed 97153 `1156746`, X 97153 `1156747`. Any other value, or blank: no staffing label. Hot, Warm, Cold and Processing Leads stay in HubSpot. | managed. The managed list also holds the three retired IDs (Pending 97151 `1156742`, Pending 97153 `1156744`, Starting 97153 `1156745`), so they are removed if present. They are never sent. | to build (4.21). The constants file still lists six; P.3 trims it. |
| CL5 | Funding source (payor tags) | [G19] | — | — | — | **excluded**: "Do not send the client funding-source labels" |
| CL6 | All Clients `1052619` | not in the guide; kept by Zeke 11/20 | every client | All Clients | base | built (old) |

Associations and exclusions: BR6, BR7, C16. The integration writes no HubSpot property outside BR13. The 34 archived "Prior" fields are not mapped. Sensitive Case properties are read with the sensitive scope.

### 9.3 BCBA → CR employee

| ID | Requirement | Guide source | HubSpot source | CR target | Status | Waits on |
|---|---|---|---|---|---|---|
| B1 | Contact form | [GER-REQ]; decision 17 | set by the integration | `Admin`, for every state | built (old) | — |
| B2 | External System ID | [GER-BCBA]; [G17] | `workday_id`, else the record ID | `ExternalSystemId` (create only; an update sends what CR holds) | built 1 | Workday ID format, a note only (O-8) |
| B3 | Legal name | [GER-REQ] | `first_name`, `last_name` | first and last name | built 1 | — |
| B4 | Primary email | [GER-REQ]; [GER-BCBA] | `ucaba_email_address` | `PrimaryEmail` on create; an update sends the email CR holds | built 1 | Whether CR accepts a changed email (O-11) |
| B5 | Date of birth; blank on a create sends the placeholder 2000-01-01; an update never sends it; a missing property is an `error` | [GER-REQ]; decision 23 | `date_of_birth` | date of birth | built 1 | Production BCBA has no `date_of_birth` property yet (O-10) |
| B6 | Gender | [GER-BCBA] | `gender_new` (Male / Female); never the archived `gender` | gender | to build (5.1). Today no gender is sent for a BCBA. | — |
| B7 | Mailing address and phone | [GER-BCBA] | `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home`, `employee_phone` (read-only Contact mirrors) | address line 1 and 2, city, state, zip, cell phone | to build (5.2). Today it reads `home_apt`, `city_work`, `home_state` and no zip. | — |
| B8 | Medicaid ID NY / NJ / CO | [GER-BCBA] | `medicaid_id__ny`, `medicaid_id__nj`, `medicaid_id__co` | Meta `126216`, `138112`, `138113` | built (old) | — |
| B9 | Personal email | [GER-BCBA]; [GER-CONTACT] | The `email` of the Contact linked by BCBA → Contact (prod 17, sandbox 191) | Meta `138069` | to build (6.4). Today it reads `email` on the BCBA record. | — |
| B10 | Salaried | [GER-BCBA]; [G05] | `work_status` = `Salaried` | label Salaried `1132653` | to build (5.7) | Label or profile field? (O-27), answered before 9.8 step (1) |
| B11 | Care Coordinator | [GER-BCBA] | `hubspot_owner_id` | none recorded | open | Zeke: the CR employee field (O-17) |
| B12 | HubSpot record link | [GER-BCBA] 11/16 | record ID | Meta `138703` | built (old) | — |
| B13 | Excluded field | [GER-BCBA] exclusions | `credentialed_insurances__ny` | Meta `134444` | to build (5.3): stop reading it and stop sending the field. **Today it is read and sent.** | — |

BCBA labels.

| ID | Label rule | Guide source | HubSpot source | CR label | Group | Status |
|---|---|---|---|---|---|---|
| BL1 | BCBA header | [GER-BCBA]; [G08] | every BCBA | BCBA `1130668` | base | built (old) |
| BL2 | State, one per Work State | [GER-BCBA]; [G19] | `location` (multi-checkbox) | CO Employee `1107687`, NJ Employee `1107686`, NY Employee `1132655` | managed | to build (5.4). Today one label from `home_state`, and no NJ. |
| BL3 | New Mexico, Virginia | [G19] | no HubSpot value yet; "Do not invent a property or a stored value" | NM Employee `1157030`, VA Employee `1157031` | not managed until mapped | constants to build (5.4); the mapping is **held** (O-6) |
| BL4 | Assignment and licensure | [GER-BCBA]; [G08] | `assign_states` contains `Assign CO` / `Assign NJ`; `lba_licensure__ny` = `Yes` / `Grad Permit` (`No` = "Will Apply": no label) | BCBA Colorado `1124246`; BCBA LBA NJ `1124245`; BCBA LBA NY `1052629`; GRAD Student- LBA NY `1092164` | managed | to build (5.5) |
| BL5 | NY Medicaid credential | [GER-BCBA]; [G08] | `ny_insurance_labels` contains `MCD FFS-NY` | NY Medicaid `1107647` | managed | to build (5.6) |
| BL6 | Aetna, Cigna, Carelon, CO Medicaid, NJ credentials | [GER-BCBA]; [G08] | `ny_insurance_labels`, `co_insurance_labels`, `nj_insurance_labels` | The guide records the labels Aetna `1107649`, Cigna `1107650`, Carelon `1132654`, CO Medicaid `1107651`, and none for NJ. It does not document which HubSpot option maps to which label. | not managed | **not documented in the guide; not built** (decision 25) |
| BL7 | Billing Hold | [GER-BCBA]; [G08] | `cr_billing_hold_label` = `Yes`; removed when it goes back to `No` | Billing Hold Medicaid Affiliation `1103437` | managed | to build (5.8) |
| BL8 | All Employees `1052618`, Clinical `1052643` | not in the guide; kept by Zeke 11/20 | every BCBA | — | base | built (old) |

Associations: Grad Permit Supervisor / Supervisee (prod 151 / 150, sandbox 227 / 226) are recorded for C13 only; nothing reads them until O-15 is answered.

### 9.4 BT/RBT → CR employee

| ID | Requirement | Guide source | HubSpot source | CR target | Status | Waits on |
|---|---|---|---|---|---|---|
| T1 | Contact form | [GER-REQ]; decision 17; rule 5.9 | set by the integration from Work State(s) `location` | `Behavior Technician NY`; `RBT CO` for Colorado | New York form built (old); Colorado to build (5.13) | — |
| T2 | External System ID, name, primary email, date of birth | [GER-REQ]; [GER-BT] | `workday_id` or the record ID; `first_name`, `last_name`; `email`; `date_of_birth` | as B2 to B5 | built 1 | O-8, O-11 |
| T3 | Gender | [GER-BT] | `gender` (Contact mirror) | gender | built (old) | — |
| T4 | Mailing address and phone | [GER-BT] | `street_home`, `location_city`, `state_home`, `postal_code_home`, `employee_phone` | address line 1, city, state, zip, cell phone | to build (5.9). Today the state comes from `location_home` and the zip falls back to `postal_code`. | — |
| T5 | Home apartment | [GER-BT] lists none; [G20] sets `home_apt` on every test BT/RBT | `home_apt` | address line 2 | built (old) | Zeke: keep sending it or stop (O-20). Kept until he decides. |
| T6 | Work address | [GER-BT] | `street_address__work_`, `apartment__work`, `city__work_`, `state__work_`, `postal_code__work_` | Meta `133819` | built (old) without the apartment; apartment to build (5.10) | — |
| T7 | Active Case Load (display only) | [GER-BT] 11/16 | `active_cases_count` | Meta `147882` | built (old) | — |
| T8 | HubSpot record link | [GER-BT] 11/16 | record ID | Meta `138703` | built (old) | — |

BT/RBT labels.

| ID | Label rule | Guide source | HubSpot source | CR label | Group | Status |
|---|---|---|---|---|---|---|
| TL1 | State, one per Work State | [GER-BT]; [G19] | `location` (multi-checkbox) | CO / NJ / NY Employee (IDs as BL2) | managed | to build (5.11). Today one label from `location_home`, and no NJ. |
| TL2 | New Mexico, Virginia | [G19] | no HubSpot value yet | NM Employee, VA Employee | not managed until mapped | constants with 5.4; mapping **held** (O-6) |
| TL3 | Role by state: a BT gets Behavior Technician, an RBT gets RBT, one per Work State, Colorado included | [GER-BT]; [G09]; decision 16 | `bt_rbt_type` × each Work State; `bt_to_rbt_path` has no effect | BT: Behavior Technician NY `1052630`, NJ `1132652`, CO `1132650`. RBT: RBT NY `1052631`, NJ `1132651`, CO `1107692`. | managed (all six) | to build (5.12). **Today a Colorado BT gets RBT CO, and a New York RBT gets both Behavior Technician NY and RBT NY.** |
| TL4 | All Employees `1052618`, Clinical `1052643` | not in the guide; kept by Zeke 11/20 | every BT/RBT | — | base | built (old) |

Exclusions for BCBA and BT/RBT: BR7; BR12; the archived BCBA `gender`; `credentialed_insurances__ny`; `work_email` (no longer a source; 5.3 stops requesting it); Apploi-created records never have Entered in CentralReach = Yes, so the gate skips them. The integration never reads `external_system_id`, `entered_in_workday`, `entered_in_ucaba_payroll_system` or `entered_in_workday_by` ([G17], [G18]); the code does not read them today and no row may add them.

### 9.5 Contact (a data source, never its own CR record)

| ID | Requirement | Guide source | HubSpot source | Target | Status | Waits on |
|---|---|---|---|---|---|---|
| K1 | A change to a Parent/Guardian Contact's first name, last name, email or phone reaches the linked Case | [GER-CONTACT]; [G11] | Contact `firstname`, `lastname`, `email`, `phone`; Case → Contact type 3 | The Case is synced by the normal worker | to build (6.1, 6.2) | Sandbox and production Contact workflows (O-21) |
| K2 | The Case reads the Guardian values from its own sync properties | [GER-CONTACT] | `guardian_first_name`, `guardian_last_name`, `email`, `phone` on the Case | C6, C7, C8 | built (old); proof test to build (6.3) | — |
| K3 | A change to a BCBA's Contact email reaches the linked BCBA | [GER-CONTACT] | Contact `email`; BCBA → Contact 17 / 191 | B9 | to build (6.2, 6.4) | — |
| K4 | Skip a Contact with `test_record` = true. Route only to eligible linked records. No standalone CR contact and no label for a Contact. | [GER-CONTACT] scope | Contact `test_record` | — | to build (6.2) | — |
| K5 | Changes to Contact-mirrored staff fields (BT/RBT and BCBA address, phone, BT gender) reach the linked employee | [GER-CONTACT] workflow row; [GER-BT] workflow row | mirror properties on BT/RBT and BCBA | T3, T4, B7 | open: the guide says "verify propagation" and records no Contact → BT/RBT association ID | The Stage 8 Contact test (O-26); the daily sweep (3.5) is the fallback |

## 10. Stage P — Prep for parallel work

**Goal.** Later stages touch separate files, share written contracts, and rest on evidence that is in the repo.

**Why it is needed.** Today the lists of HubSpot properties to request, and the employee list of "known metadata fields", are hard-coded inside the two code files `src/workflows/clientSyncWorkflow.mjs` and `src/workflows/employeeSyncWorkflow.mjs`. Stage 3 changes those two files and Stages 4 and 5 change those lists. Moving the lists into the mapping folder lets the stages be built at the same time. Behaviour does not change, except in P.2 and P.3.

**Depends on.** Nothing. **Files.** `src/workflows/clientSyncWorkflow.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/lib/hubspotClient.mjs`, `src/constants/staffingAssociations.mjs`, `src/constants/centralReach.mjs`, new `src/mappings/client/clientProperties.mjs`, new `src/mappings/employees/employeeProperties.mjs`, new `docs/workstreams/architecture-update/guide-extract-2026-11-20.md`, new `docs/workstreams/architecture-update/cr-catalog-snapshot.json`, tests.

| # | Serves | Change | Tests / done when | Who |
|---|---|---|---|---|
| P.1 | BR5, BR13 | Move `REQUIRED_DEAL_PROPERTIES`, `BT_RBT_PROPERTIES`, `BCBA_PROPERTIES` and `knownMetadataFieldIds` out of the two workflow code files into the two new mapping files. Each file exports four lists per object: `mapped` (read by the mappers), `signalOnly` (change signals the mappers do not read: the five staffing name properties, `dealstage`), `mustTrigger` (properties a HubSpot workflow must trigger on although no mapper reads them: both checklist properties and the entry properties), and `system` (gate, status, link and ID properties). The workflows import them. | `npm test` stays at 402 with no assertion changed. | builder |
| P.2 | BR16, BR17, C11, C14 | `listAssociations` returns, per row, `toObjectId` and `types: [{ typeId, category }]`. An answer with no `results` list is thrown as a failed read. `associationsForComparison` reads the new shape. | Missing `results` → thrown, not "no staff". Category is kept. | builder |
| P.3 | BR19 | `src/constants/centralReach.mjs` exports one explicit list: the label IDs a mapper may send. It holds the base and managed labels of section 9 and the two New Mexico and Virginia constants. It leaves out the parent label Staffing Status `1156741`. `CENTRAL_REACH_CLIENT_STAFFING_LABELS` is trimmed to the three labels of CL4; the three retired IDs move to a separate "remove only" list. Field `137697` is registered as a TextArea in `CENTRAL_REACH_METADATA_FIELD_TYPES`. | The list holds every sendable label and none of the retired or parent IDs. | builder |
| P.4 | safeguard (a record for builders) | Save today's guide read as `guide-extract-2026-11-20.md`. It replaces the 11/18 copy for builders. | The file holds every tab, with [G19] and [G20]. | orchestrator |
| P.5 | safeguard (so no lane edits another lane's files) | Write down the contracts the lanes share, as comments and empty or pass-through code: (a) every mapper returns `requiredLabelIds` and `managedLabelIds` (empty until Stages 4 and 5 fill it); (b) the Case metadata mapper takes staff names and the owner as inputs; (c) an input that could not be read is named in an omit list (rule 5.8); (d) the employee mapper returns `workStates`, and `getEmployeeContactForm` takes the employee type and the work states; (e) the label sender takes the required and managed lists and the last saved label POST, and returns what it posted and whether the read confirmed it; (f) `createOrUpdateClient` keeps its signature; (g) the error codes lane L may throw and how `src/lib/retry.mjs` sorts them. | `npm test` stays green. | builder |
| P.6 | BR19 | (a) Record the label test of 2026-11-20 (section 4) in the tracker. (b) Take a fresh read-only snapshot of CR's label catalog and metadata field list and commit it as `cr-catalog-snapshot.json` (names and IDs only). (c) Add a test that fails when a label or metadata constant in `src/constants/centralReach.mjs` is not in the snapshot. | The test passes; NM Employee, VA Employee and Active Case Count are in the snapshot or the constant is corrected. | orchestrator on Zeke's go-ahead for the read; builder for the test |
| P.7 | BR14, BR16, C31, BR20 | Four read-only sandbox HubSpot reads, on Zeke's go-ahead: (a) the search operator for "the multi-checkbox contains Yes"; (b) a GET that asks for a blank property and for a property that does not exist, to see whether a blank comes back as a null key; (c) the stored option values of `n1_what_type_of_insurance`; (d) which sandbox BCBA and BT/RBT properties are Contact mirrors that cannot be set on the record. | Results recorded in the tracker; rows 3.5, 4.18 and step 7.1 use them. | orchestrator on Zeke's go-ahead |

## 11. Stage 3 — Poller, fewer calls, label sender, safeguards

**Goal.** The poller is an hourly safety check that never loses its place and never touches a record outside the gate. A record with no change writes nothing. Labels are sent the way rule 5.6 says. The client create path is safe.

**Guide sections.** Change detection Architecture tab (backup path; the 11/17 approved design; "Minimum changes"); Business rules `[GBR]`; `[G17]`; `[G19]`; section 11 "Some mapped values change without anyone editing the field".

**Depends on.** Stage 2 (built) and Stage P. Row 3.5 also needs the result of P.7 (a).

**Files by lane** (section 17):

- **Lane A (poller):** `src/workflows/intakePollerWorkflow.mjs`, `src/functions/intakePoller.mjs`, `src/functions/intakePollerHttpTest.mjs`, `src/lib/hubspotClient.mjs` (search functions only), `src/lib/config.mjs`, `src/lib/serviceBusClient.mjs`, `src/functions/processClientQueue.mjs`, `src/functions/hubspotWebhook.mjs`, `src/lib/hubspotWebhook.mjs`, `local.settings.example.json`.
- **Lane B (workers):** both workflow code files, `src/lib/mappedState.mjs`, `src/lib/linkRecord.mjs`, `src/lib/retry.mjs`, `src/constants/syncReasons.mjs`.
- **Lane L (CentralReach client):** `src/lib/centralReachClient.mjs`.
- **Lane C (with the mappers):** row 3.10 only: `package.json`, new `scripts/check-triggers.mjs`, new `docs/workstreams/architecture-update/webhook-triggers.json`.

| # | Lane | Serves | Rule | Change | Tests |
|---|---|---|---|---|---|
| 3.1 | A | BR14 | The poller runs at the top of each hour. | `intakePoller.mjs`: schedule `0 0 * * * *` (today `0 */5 * * * *`). | The schedule string. |
| 3.2 | A | BR14, BR10 | One saved checkpoint per entity. It moves forward only after the page was queued. | The poller takes a `dependencies` argument. Per entity (Case, BCBA, BT/RBT): search records that are linked, or unlinked with Entered in CentralReach = Yes, with `hs_lastmodifieddate` at or after the checkpoint, oldest first, paged with HubSpot's `after` cursor, up to a fixed page cap. After each page is queued, save the checkpoint as the earlier of that page's last timestamp and five minutes ago. If the cap falls inside a block of equal timestamps, keep paging until the timestamp changes, and stay under HubSpot's 10,000-result limit. First run starts one hour back. The checkpoint is stored with no expiry, with a key that starts with the portal ID. A failed send stops the page. Remove the 15-minute lookback, the dedupe entries, the one-page limit, and the linked recheck with its setting `LINKED_RECHECK_ENABLED` (on by default today, with no gate filter). | An outage of any length is caught up over later runs. A send failure leaves the checkpoint at the last finished page. Two records with one timestamp: neither is skipped. An unlinked record without Yes is not queued. No recheck runs. |
| 3.3 | A | BR14 | One entity's failure does not stop the others. A rejected search fails loudly. | Each entity in its own try block. Remove the fallback that re-runs a search without its date filter (`isLookbackFilterError`). | A failed Case search still runs both employee searches. A rejected filter is an error. |
| 3.4 | A | BR4 | The record gate applies to the poller and the sweep. | When `SYNC_RECORD_GATE_PROPERTY` names a property, every search adds "that property is true". The Case search keeps the four-stage exclusion. The worker gate still runs. | Gate set → the filter is in every search body. `none` → it is not. |
| 3.5 | A | BR14, BR10, BR18 | Once a day every linked record is queued, and every unlinked record whose status is `waiting`. | In the first hourly run at or after 08:00 UTC, once per day, guarded by a marker written after every entity was queued. The unlinked branch does not run when the gate is `none`. Own source name `dailySweep`, added to the Case queue's allowed sources (`processClientQueue.mjs`); the employee queue has no allowed-source list. Messages are spread with scheduled delivery, 60 a minute: `sendClientSyncMessage` and `sendEmployeeSyncMessage` gain an optional scheduled time. A cap per run. | Runs once a day even when a run is missed. A partial failure runs again the next hour. Gate filter present. Gate `none` → linked records only. |
| 3.7 | B | BR14, BR9 | A record with no change writes nothing. | A run is a no-op when the link record is clean, the field hashes match, the saved mapping version equals the current one, HubSpot holds the CR ID, and the status HubSpot shows is the status this run would write. Then no CR call, no HubSpot write, no Cosmos write except the record lease. If only the status differs, write only the status. Employees: the compared state is built from HubSpot data only (the mapped payload before the CR read, plus `workday_id` and the checklist); the CR read for the ID check is skipped only when the last status is `success` and nothing changed. Remove the duplicate first HubSpot read in both workflows; a no-op skips the confirm read. `noop` is never written. Saved hashes with another mapping version are dropped, so every field is sent once after a mapping change; change `MAPPING_VERSION` in this stage. | No-op Case: HubSpot reads and one Cosmos read, zero writes. No-op `success` employee: zero CR calls. A `waiting` employee still gets its ID check but does not rewrite an unchanged status. An `error` employee whose updates continue does not re-send an unchanged update. HubSpot missing the CR ID → the ID is written. Another mapping version → a full send. |
| 3.8 | B | BR14 | Only changed metadata fields are sent. | Send the metadata fields whose hash differs from the saved copy; all of them when there is no saved copy. | One changed field → one metadata call. |
| 3.9 | B | BR18 | A change that no webhook delivered is logged by field name. | When a run whose source is the poller or the sweep finds changed fields, log the names with a fixed message. A retried message keeps its `source`. | Names only, never values. |
| 3.10 | C | BR5, BR13, BR18, BR10 | A check lists what the HubSpot triggers miss. | `npm run check:triggers` reads the `mapped`, `signalOnly` and `mustTrigger` lists (P.1), a fixed list for the Contact workflow (`firstname`, `lastname`, `email`, `phone`), and `webhook-triggers.json` (Zeke exports each HubSpot workflow's trigger properties into it). It fails when a listed property has no trigger, and when a property the integration writes (BR13) is a trigger. Not part of `npm test`. It must pass after step 7.2 and before step 7.3, and again on the production export in step 9.6. | Fails on a missing property; fails on a written property used as a trigger; passes when covered. |
| 3.11 | A | safeguard (portal isolation, Stage 2 row 2.6) | The webhook does no Cosmos work. | Remove the log-only "coalesce" step and its Cosmos write (its key carries no portal ID). Remove settings the code no longer reads from the required lists and the example file; list them in the stage report. | A repeat notice is still queued; no Cosmos call. |
| 3.12 | — | BR4 | **Not built now. Decided at the move to production** (decision 20, step 9.2). Proposed: for portal `50317927`, `SYNC_RECORD_GATE_PROPERTY` = `none` and `INCLUDE_TEST_RECORDS` = `true` are invalid configuration. | — | — |
| 3.13 | B | BR16 | **Decided after one API test.** The orchestrator, on Zeke's go-ahead, sends one update to CR employee `5338681` with a blank core field and reads it back. If the blank clears the stored value: on an update, a core field that is blank in HubSpot is left out of the request, unless the saved copy shows the integration wrote a value there before. If the blank is ignored: nothing is built. | If built: `src/workflows/*`, with the mappers' output unchanged. | If built: a blank field never written by the integration is not in the request; one the integration wrote is sent blank. |
| 3.14 | L | BR22, BR1 | The client create path is read-only before it writes (rule 5.5). | `createOrUpdateClient`: when there is no CR ID, call `findClientByExternalSystemId` (the read-only GET). 404 → create. Found → update by CR ID. Remove `updateClientByExternalSystemId` and its loose readers (`responseLooksNotFound` for this path, `id` and `result.id` as a CR ID). On an update, leave `ExternalSystemId` and `ContactForm` out of the request. No client-create switch (decision 18). | 404 → one POST, with External System ID and form. Found → one PUT by CR ID, without them. A 400 from the lookup never leads to a create. A linked update carries neither field. |
| 3.15 | B | BR3, BR1 | **Recommended; Zeke decides when Stage 3 is built.** After a create with an unknown result, the next run must not create again too soon. | The pending External System ID is kept with the time the create was sent; clients get the same marker. If its lookup answers 404 less than 15 minutes after the create was sent, the run is retried later and no create is sent. After 15 minutes a 404 clears the marker. | Timeout on a create, lookup 404 one minute later → no second create. After 15 minutes → the marker is cleared. |
| 3.16 | B | safeguard (decision 19) | A CR ID from HubSpot must be digits only. | Before any CR call, a `client_id_number` or `employee_id` that is not digits only is an `error` with a fixed reason and no CR call. | `12a4`, `12/4` and a value with a space → `error`, zero CR calls. Digits → proceeds. |
| 3.17 | — | BR2 | **Not built** (decision 22). A Workday ID format check waits on Sara (O-8). | — | — |

**Label sender (lane L; rule 5.6).** `updateContactLabels` and `postContactLabels` in `src/lib/centralReachClient.mjs`. The workflow (lane B) saves the last label POST in the link record and passes it in, per the P.5 contract.

| # | Serves | Rule | Change | Tests |
|---|---|---|---|---|
| L.1 | BR19 | Only known IDs are sent, and never an empty list. | Before a POST: every ID the integration adds must be in the sendable list (P.3); an ID outside it is a code defect: no POST, `error`. Every ID in the set to post, the integration's and CR's own, must be in CR's live catalog (`GET /contacts/labels`, read once per run that posts labels); an ID that is not there: no POST, and the run is retried. An empty set is never posted. | An ID outside the sendable list → no POST. An ID the catalog does not hold → no POST. An empty set → no POST. |
| L.2 | BR19, CL1 to CL4, BL2 to BL7, TL1, TL3 | The set to post is: the labels CR holds now, minus the managed labels, plus the required labels. | Take `requiredLabelIds` and `managedLabelIds` from the mapper. No POST when the result equals what CR holds. A failed read makes no POST (built today). An empty read for a contact this run did not create is a temporary failure. With an empty managed list this is today's add-only behaviour. | A managed label that is not required is left out of the post. A staff label is kept. Nothing to change → no POST. Empty read on an existing contact → no POST, retried. |
| L.3 | BR19, BR16 | A label POST is confirmed by reading it back; a read can lag by about two minutes. | After a POST, return the posted set and the time; the workflow saves both in the link record. Read the labels again (three tries, 5 seconds apart). Shown → confirmed. Not shown → the run ends as a temporary failure and the normal retry schedule runs it again. For 150 seconds after a saved POST, a run makes no new label POST for that contact: it only reads and compares with the saved set. After 150 seconds, rule L.2 applies again from a fresh read. `postContactLabels` no longer returns "updated" on a 200 alone. | Read shows the set → success. Read lags, retry inside 150 seconds → no second POST. Read shows the set on a retry → success. Never shown → `error` after the retries. |
| L.4 | BR19 | One body shape. | Remove the second POST with `{ labelIds }` that follows a 400. The body is `{ labels: [{ labelId }] }`. A 400 is a permanent failure. | A 400 makes one call only. |

**From the Stage 1 and Stage 2 reviews, for this stage.**

- Two cases write on every run today, and row 3.7 must end both: a linked `waiting` employee with no field change rewrites the same status each run; a linked employee whose status is `error` but whose updates continue re-sends the same update each run (S2-R6).
- The poller's lease, dedupe entries and recheck cursor, and the webhook's coalesce key, carry no portal ID. Rows 3.2, 3.5 and 3.11 rebuild or remove all of them; the new keys carry the portal ID.
- `README.md` still describes the retired `HUBSPOT_PORTAL_ID_TEST` setting, the old object type override, the wrong Function App in the deploy example and the coalesce step. Fixed with the next docs commit, before the Stage 7 deploy; it is not a build row.
- The poller's portal stamping is proven by one direct test of the senders and one test that reads the source text. Replace the source-text test with a real run once the poller takes `dependencies` (row 3.2).

**Decisions already made for this stage (Zeke, 2026-11-18).** With changed-only metadata, a value staff edit on the CR screen stays until its HubSpot field changes. An unlinked `waiting` record rewrites its status and repeats its two lookups on each run, for now.

**HubSpot facts, from HubSpot's CRM Search page (read 2026-11-18).** Search is limited to 5 requests a second per account, 200 records a page and 10,000 results a query, with one sort. "It may take a few moments" for a new or changed record to appear in search, which is why row 3.2 keeps the checkpoint five minutes back. A filter on an option property is case-sensitive.

## 12. Stages 4 to 6 — Mappings and Contact routing

A row that waits on an open item is not built and is listed in section 15. It is never guessed. Every CR ID below is in `src/constants/centralReach.mjs` already or is added there by the row; each is in the saved catalog of 2026-11-18 unless section 4 says otherwise.

### Stage 4 — Case mappings

**Guide sections.** `[GER-CASE]`, section 3 field map, section 4 (associations), section 7 (client labels), `[G19]`, the appendix (stored values).

**Depends on.** Stage P. The mapper rows (4.1 to 4.13, 4.15, 4.17, 4.19 to 4.22) need nothing else. The wiring rows (4.14, 4.16, 4.18) change `src/workflows/clientSyncWorkflow.mjs` and `src/lib/hubspotClient.mjs`, so they come after lanes A and B of Stage 3.

**Files, mapper rows (lane C):** `src/mappings/client/*`, `src/constants/centralReach.mjs`. **Files, wiring rows (lane D):** `src/workflows/clientSyncWorkflow.mjs`, `src/lib/hubspotClient.mjs`. `src/lib/config.mjs` is not changed: the role association IDs for both portals are already in its portal table.

One test per row; the title names the requirement ID.

| # | Serves | HubSpot source | CR target | Rule |
|---|---|---|---|---|
| 4.1 | C8 | `street_address`, `home_apt`, `location_city`, `stateregion`, `postal_code`, `phone` | address line 1 and 2, city, state, zip, cell phone | Line 1 is `street_address` only. State from `stateregion`. Stop reading `location_central_reach` for the address. |
| 4.2 | C27 | `does_your_child_have_any_other_comorbid_diagnoses_`, `maladaptive_behaviors__parentguardian` | Meta `132303`, `126207` | Stored option values. Stop reading the `__clinical` properties. |
| 4.3 | C28 | `important_information` | Meta `138378` | New. Severity stays. |
| 4.4 | C17 | `work_schedule_details`, `btrbt_work_schedule_2_details` | Meta `132304`, `138093` | Main schedules only (C18 is open). |
| 4.5 | C19 | `finalized_client_service_hours_post_assessment`, `client_service_hours_total` | Meta `126209` | The text, then the weekly hours when filled. Assumed format (O-28). |
| 4.6 | C20 | `total_hours_bt1bt2_work_schedule` | Meta `134331` | Never the two older totals. |
| 4.7 | C22 | `initial_auth_tracks` chooses the source | Meta `132431` | Blank when the track is blank. |
| 4.8 | C23 | `ongoing_auth_period_start_date`, `ongoing_autrh_period_end_date` | Meta `134672` | "start - end", each date as MM/DD/YYYY (rule 5.7). Assumed format (O-28). |
| 4.9 | C26 | `allergies`, `allergies__yes__explain` | Meta `126214` | `Confirmed` → "Yes" plus the explanation; `Denial` → "No". Assumed format (O-28). |
| 4.10 | C30 | `insurance_2` or its Other summary; `insurance_id_2` | Meta `144600`, `144601` | Never `n2_what_type_of_insurance`. |
| 4.11 | C32, C33, C36 | `referring_provider_medicaid_id`; `phi_diagnosis` + `diagnosis_other`; `referral_source` | Meta `141233`, `144793`, `126222` | Diagnosis: when `phi_diagnosis` stores `Yes`, write the option's display text "Yes-F84.0", then `diagnosis_other` when filled. Assumed format (O-28). |
| 4.12 | C34 | `most_recent_asd_diagnosis_date_1`; `most_recent_asd_diagnosis_date_medicaid` | Meta `131195`; `138701` | Both, each to its own field. Remove the pick-one logic and `most_recent_asd_diagnosis_date_2`. |
| 4.13 | C24 | `specific_home_location` chooses `full_home_address` (Child's House, More Than One Location) or the `service__*` parts (Other Location) | Meta `137697` | A TextArea field (registered in P.3). |
| 4.14 | C11, C14, BR17 | Case → BCBA and Case → BT/RBT associations by role and `USER_DEFINED` category; then the staff records' `first_name` + `last_name`, read in one batch call per object type | Meta `131314`, `144602`, `131313`, `138092` | The mapper takes the names as inputs (P.5). Several staff in one role: names joined by ", " in record-ID order (assumed format, O-28). No staff in a role: the field is blank. A failed association or name read stops the run; it never becomes a blank (rule 5.8). |
| 4.15 | C12 | `ongoing_central_reach_provider_supplier` | Meta `131308` | The typed text as it is. |
| 4.16 | C10 | `hubspot_owner_id` → owners API, cached in memory | Meta `138851` | The owner's name. If the owner call is refused (403), leave the key out, log a warning, and do not fail the run (rule 5.8). |
| 4.17 | C38, C8 | — | — | Stop requesting `insurance_id_3`, `insurance_id_4`, the misspelled `…_other_addres` property, `location_central_reach` and every property replaced above. |
| 4.18 | BR16 | every property in the `mapped` lists, on Case, BCBA and BT/RBT | — | A requested key that is missing from the HubSpot answer is a failed read: `error`, no CR write. Built only after P.7 (b) confirms HubSpot returns a blank property as a null key. Lane D builds it for the Case, lane E for the two employee objects. |
| 4.19 | CL1 | `location` | CO Client, NJ Client, NY Client | Add NJ. The three are one managed group: the one for the Case's state is required. |
| 4.20 | CL2 | `specific_home_location` | Home `1052656` | Managed. Required for Child's House and More Than One Location. |
| 4.21 | CL3, CL4 | `case_status`; `staffing_status` | Active Client `1125427` / In-Active Client `1121488`; 97151 Services `1156743`, Staffed 97153 `1156746`, X 97153 `1156747` | Two managed groups. `Warm` requires Active Client; `Cold` requires In-Active Client. A `staffing_status` equal to one of the three names requires that label; any other value or blank requires none. The staffing managed list also holds the three retired IDs. All Clients stays required on every client. |
| 4.22 | C25 | `service_address__other`, when `specific_home_location` is More Than One Location | Meta `138091` | Blank for any other location value. Checked on the CR screen in Stage 8. |

### Stage 5 — Employee mappings

**Guide sections.** `[GER-BCBA]`, `[GER-BT]`, sections 5, 6, 8 and 9, `[G19]`, the appendix.

**Depends on.** Stage P. After P.1 every row except 5.13 is in the mapping files, so nothing else in this stage touches a workflow code file.

**Files (lane C).** `src/mappings/employees/*`, `src/constants/centralReach.mjs`. Row 5.13 also has a part in lane L (`src/lib/centralReachClient.mjs`) and one pass-through line in lane B.

| # | Serves | HubSpot source | CR target | Rule |
|---|---|---|---|---|
| 5.1 | B6 | `gender_new` | gender | Male / Female. |
| 5.2 | B7 | `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home`, `employee_phone` | address, city, state, zip, cell phone | Replaces `home_apt`, `city_work`, `home_state`. |
| 5.3 | B13 | — | — | Remove `credentialed_insurances__ny` and `work_email` from the BCBA property list. Remove Meta `134444` from the mapper **and** from the known-fields list, so no clear is sent for it. |
| 5.4 | BL1, BL2, BL3 | `location` | BCBA header `1130668`; CO / NJ / NY Employee | The header, All Employees and Clinical are base labels. One state label per Work State; the three state labels are managed. Add constants for NM Employee `1157030` and VA Employee `1157031`; no mapping reads them and they are not managed. |
| 5.5 | BL4 | `assign_states`, `lba_licensure__ny` | BCBA Colorado `1124246`, BCBA LBA NJ `1124245`, BCBA LBA NY `1052629`, GRAD Student- LBA NY `1092164` | Managed. `No` gets no label. |
| 5.6 | BL5 | `ny_insurance_labels` contains `MCD FFS-NY` | NY Medicaid `1107647` | Managed. Nothing for the other options (BL6). |
| 5.7 | B10 | `work_status` = `Salaried` | Salaried `1132653` | Managed. O-27 is answered before production. |
| 5.8 | BL7 | `cr_billing_hold_label` = `Yes` | Billing Hold Medicaid Affiliation `1103437` | Managed: required on `Yes`, removed when it is not `Yes`. |
| 5.9 | T4, T5 | `street_home`, `location_city`, `state_home`, `postal_code_home`, `employee_phone`; `home_apt` | address line 1 and 2, city, state, zip, cell phone | State from `state_home`. Zip from `postal_code_home` only. `home_apt` stays as line 2 until O-20 is decided. |
| 5.10 | T6 | adds `apartment__work` | Meta `133819` | — |
| 5.11 | TL1 | `location` | CO / NJ / NY Employee | One per Work State; managed. All Employees and Clinical are base labels. |
| 5.12 | TL3 | `bt_rbt_type` × each Work State | the six role labels | A BT gets Behavior Technician for each Work State; an RBT gets RBT for each Work State; never both. All six are managed, so a BT who becomes an RBT loses the BT label. `bt_to_rbt_path` has no effect. |
| 5.13 | T1 | `location` (Work States) | `ContactForm` on a create | Rule 5.9. Lane C: the BT/RBT mapper returns `workStates`. Lane B: the workflow passes it to the create call. Lane L: `getEmployeeContactForm` returns `RBT CO` for a BT/RBT whose work states hold Colorado and not New York, else `Behavior Technician NY`; `Admin` for a BCBA. |

Unchanged on purpose: updates send the email CentralReach holds (O-11); the date-of-birth placeholder (decision 23).

### Stage 6 — Contact routing

**Guide sections.** `[GER-CONTACT]`; section 11 "It's actually 4 objects".

**Depends on.** Stage 3 lanes A and B (same webhook, queue, Service Bus and employee workflow files) and Stage 5 (same employee mapper).

**Files (lane E).** `src/lib/hubspotWebhook.mjs`, `src/functions/hubspotWebhook.mjs`, `src/functions/processClientQueue.mjs`, `src/lib/serviceBusClient.mjs`, `src/lib/config.mjs` (the BCBA → Contact type: production 17, sandbox 191), new `src/workflows/contactFanOutWorkflow.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/mappings/employees/buildEmployeePayload.mjs`.

| # | Serves | Rule | Change | Tests |
|---|---|---|---|---|
| 6.1 | K1, K3 | A Contact notice is accepted and queued. | The webhook accepts object type `0-1` and queues one `contactChange` message (Contact ID and portal ID) on the client queue. | 202 and one message. |
| 6.2 | K1, K3, K4, BR7 | A Contact change reaches every Case and BCBA linked to it, through the normal workers. | The fan-out reads the Contact (`test_record`) and skips it when true, unless `INCLUDE_TEST_RECORDS` is `true`. It then reads the Contact's associated Cases and BCBAs and queues an ordinary sync message for each. It never calls CR. The record gate is checked by the workers, per target. A failed read queues nothing and is retried. | One Contact with two Cases and one BCBA → three messages. `test_record` = true → none. A failed association read → none, retried. |
| 6.3 | K2 | Guardian name, email and phone are in the Case's compared state. | A test only. | A Guardian value change on the Case produces a client update. |
| 6.4 | B9, K3, BR16 | BCBA personal email comes from the BCBA's Contact. | The workflow reads the Contact linked by BCBA → Contact and passes its `email` to the mapper for Meta `138069`, replacing `email` on the BCBA record. No Contact: the field is blank. More than one Contact, or a failed read: field `138069` goes in `omitFieldIds`, so nothing is cleared, and a warning is logged. | Contact email change → the field updates. No Contact → blank. Failed read → no clear sent. Two Contacts → no clear sent. |

Live testing of Stage 6 waits for the sandbox Contact workflow (O-21). The code and its offline tests are built now.

## 13. Stages 7 to 9 — After the build

### Stage 7 — Final sandbox test plan, HubSpot setup, deploy while Stopped

**Depends on.** Stages P and 3 to 6 committed, and the final whole-diff review done. Steps run in order: 7.1, 7.2, the trigger check, 7.3.

| # | Serves | Step | Who | Done when |
|---|---|---|---|---|
| 7.1 | BR20 | Finish `SANDBOX-TEST-PLAN.md` from the Stage 8 list below. Keep the record convention and update it: (a) every property name is checked against the finished mappers. Known changes: BCBA state and apartment are read from `state_home` and `apartment__home`; BT/RBT state from `state_home` and `location`. (b) Several of these are Contact mirrors, so each test employee gets an associated Contact that fills them (result of P.7 d). (c) Each round's records are created with their associations (decision 21): the Case to the round's BCBA as Supervising (247), IA (223) and RE (229); to the round's BT/RBT as Primary BT 1 (238), and to a second BT/RBT as Primary BT 2 (240) when that test runs; to a Parent/Guardian Contact (type 3); the BCBA to its own Contact (191). (d) Rounds run the temporary-ID path with `workday_id` blank (decision 22). (e) The wrong-Client-ID test is run only on a Case created in the same round, using an earlier round's inactive test client. | Claude writes | Zeke agrees |
| 7.2 | BR1, BR10, BR13, BR15, BR18, K1 | Sandbox HubSpot: one webhook workflow set per object, each filtered on its test list (`1463` Deals, `1464` BCBAs, `1465` BT/RBTs). The employee workflows trigger on `workday_id` and the checklist. The Case workflow triggers on the five staffing name properties. The Contact workflow. Failures and waiting views per object; the 24-hour report. Trigger lists exported into `webhook-triggers.json`. The round's test records and their associations (7.1 c). | Zeke | `npm run check:triggers` passes |
| 7.3 | BR4, BR14, BR15 | Azure, app Stopped, each write on Zeke's go-ahead. First confirm the app is Stopped and `AzureWebJobs.intakePoller.Disabled`, `AzureWebJobs.processClientQueue.Disabled` and `AzureWebJobs.processEmployeeQueue.Disabled` are `true`. Then: settings for `52311591` (`HUBSPOT_PORTAL_ID` must be `52311591`; the two object type settings must equal the portal table or be removed; `HUBSPOT_PORTAL_ID_TEST` removed); the sandbox token and webhook secret entered by Zeke in the portal; `SYNC_RECORD_GATE_PROPERTY` = `sandbox_test_field`; `LEASE_TTL_SECONDS` = `660`; remove the six unused pipeline and allowlist settings and the settings Stage 3 retired; `ALLOW_EMPLOYEE_CREATE` = `false`, `PUT_ONLY_MODE` = `true`; purge both dead-letter queues (never replay); confirm both queues are empty and Cosmos holds nothing from `50850427`; one email alert on dead-letter count above zero; deploy the reviewed commit and record its hash and the function timeout. Check whether duplicate detection can be turned on for `employee-sync-queue` without recreating it (S2-R5). Cosmos records written before Stage 2 are never read again, so the first run of each linked record after the deploy is one full write. | Zeke, or Claude through the Azure CLI on Zeke's go-ahead for each write | Every value read back (setting names, never values); app still Stopped |
| 7.4 | BR19 | Confirm the answer shape of `GET /contacts/{id}/labels`. | — | **Done 2026-11-20**: the answer is `labels`, each item with `labelId` (section 4). The reader in the code matches. |

### Stage 8 — Sandbox rounds

Run only from the agreed plan. Every CentralReach write is a production write on a test record Zeke names, on his go-ahead at that step. One round per state (New York, Colorado, New Jersey), in order. Stop at the first unexpected result. After each round Zeke makes the round's client and two employees inactive on the CR screen, and `sandbox-test-log.md` is filled in.

| Area | Serves | Tests |
|---|---|---|
| Gate | BR4, BR7 | A record without `sandbox_test_field` sends no webhook and is never queued by the poller or the sweep. |
| Labels, first | BR19 | On the round's test employee, with the integration's own sender: a managed label that is no longer required is removed; a label added by hand on the CR screen survives; an empty set is never posted; the read-back confirms; the read lag is timed; no second POST is made inside 150 seconds. Also: a label that is on the test contact and is then deleted from CR's catalog (A-18). This must pass before any other label test. |
| Contact form | T1, B1 | The labels and profile are read straight after each create, to see what the form set by itself: `Behavior Technician NY` (rounds 1 and 3), `RBT CO` (round 2), `Admin` (BCBA). |
| Employee create, temporary-ID path | BR1 to BR3 | Missing email → `error`, no CR call. Create off → `waiting`. Blank `workday_id` → created with the HubSpot record ID, `waiting`. Two quick edits → one employee. BCBA create. The time from the create to a found lookup is measured (A-21). |
| Updates while waiting | BR10 | An address change while `waiting` reaches CR. Checklist ticked while CR holds the temporary ID → `error`, and the update is still sent. |
| Workday ID path | BR8, BR10, BR11 | **Waits on Sara's answer (O-8, decision 22).** Create with a Workday ID → `success`. Workday ID filled → `waiting` "replace". ID replaced on the CR profile and checklist ticked → `success`. Workday ID changed to another value → `error`, no CR write. Two records with one Workday ID: the second is `error`. A Workday ID that a CR employee holds: `error` when another HubSpot record holds that CR employee, `waiting` when none does. Test values are the `AZTEST-…` IDs of `[G20]`, never a real Workday ID. |
| Case | BR1, BR6, BR8, BR22 | Create; no duplicate on a second run; an update carries no External System ID and no contact form; a wrong Client ID → `error` (method in 7.1 e); a Case in an excluded stage → nothing. |
| Mappings | section 9 | Each "to build" field and label shows the expected value on the CR screen, per state. Service Location Address 2 (4.22) and how it shows. The assumed text formats (O-28) are looked at on screen. |
| Staffing | BR17, C11, C14 | A staffing association is removed, replaced and relabeled, each as its own test; the names in CR follow. |
| Blank handling | BR16 | A cleared metadata field is cleared in CR. A blank core field on an update (if 3.13 was not settled before). |
| Retries and alert | BR14, BR15 | A forced temporary failure walks the delay steps; one malformed test message dead-letters and the email arrives. The delivery count of a first scheduled delivery is logged (A-15). |
| Poller and sweep | BR14, BR18 | A change with its HubSpot workflow off reaches CR within the hour and the log names the field. A no-op run writes nothing. A webhook and the poller on one record at the same time: one write. An association-only change: does the poller see it (A-16)? |
| Contact | K1 to K5 | Guardian and BCBA Contact changes arrive. A change to a Contact-mirrored BT/RBT field: does the BT/RBT workflow fire (O-26)? A Case with two Contacts (HubSpot only): the sync properties show the first Guardian. |
| CR behaviour | O-11 | Whether an update accepts a changed email; `#` in a name and `+` in an email; an update of a client created by hand. |

### Stage 9 — Production readiness and go-live

**Depends on.** Stage 8 passed; the open items of section 15 that name a 9.x step.

| # | Serves | Step | Who |
|---|---|---|---|
| 9.1 | BR2, BR8 | Workday ID format. A note only for now (decision 22). When Sara answers (O-8), Zeke decides whether a format check is built; risk R-8 is closed or accepted before 9.8 step (1). | Sara; Zeke |
| 9.2 | BR4 | Decide row 3.12: should production refuse `SYNC_RECORD_GATE_PROPERTY` = `none` and `INCLUDE_TEST_RECORDS` = `true`? | Zeke |
| 9.3 | BR4 | Pick the production segment and the one checkbox property behind it (decision 20). That property becomes `SYNC_RECORD_GATE_PROPERTY`. Until United Care confirms a record, its checkbox stays off; it is never set on a person who already has an employee record in CR. | Zeke, Danny |
| 9.4 | BR3, BR4 | Existing employees: match a CR export against HubSpot, United Care reviews, then set `employee_id` on confirmed records. 515 records have Entered in CentralReach = Yes and no `employee_id`. Also: count the CR External System IDs with 10 or more digits (A-5); one read-only HubSpot search for two records holding the same `client_id_number` or `employee_id`. | Zeke, Danny, United Care |
| 9.5 | BR8 | Existing clients: find out why 81 of 100 sampled Client IDs did not resolve in CR; list the Cases with Yes and no Client ID and confirm which clients already exist in CR. | Zeke |
| 9.6 | BR1, BR15, B5 | Production HubSpot: webhook workflows with full trigger lists, filtered on the segment; `date_of_birth` on BCBA as a property sync (decision 23); `crm.objects.owners.read`; failures and waiting views; the 24-hour report. `npm run check:triggers` passes on the production export. One read-only production GET of a Case with the sensitive properties, on Zeke's go-ahead. | Zeke, Danny |
| 9.7 | BR14, BR15 | Production Azure: settings for `50317927`, production secrets, the alert with Danny or a shared inbox added, deploy with the commit recorded. | Zeke, with Claude through the Azure CLI on his go-ahead |
| 9.8 | BR1, BR4, BR5 | Go-live in three steps. (1) Creates and updates for new employees only: the records the gate marks. (2) Creates and updates for new Cases only. (3) Updates of records that existed in CR before go-live, one confirmed batch at a time, after 9.4 and 9.5 and the blank-handling result. Recommended before step (3), decided then: a list per batch of the field names that would change, for United Care to review. Watch the failures view, the waiting view and the alert daily for the first week. | Zeke, Claude |
| 9.9 | safeguard (a record) | Record the final state in the guide. | Claude, on Zeke's request |

Separate from these stages: the HubSpot API version item (O-25). Optional: destination audit, Case History Log, managed identity.

## 14. Dropped rows

| Row or proposal | Why it is dropped |
|---|---|
| Old 3.6: the poller skips a record modified within 120 seconds of an integration write | A real edit in that window would be skipped and the checkpoint would pass it. With 3.7 the integration's own write costs one no-op run. |
| Old 3.8, second half: the one-call metadata `PATCH` | No API spec for it; it serves no requirement. |
| Old 3.11, the `README.md` and `SOURCE-OF-TRUTH.md` fixes | Docs only. Done with the next docs commit, before the Stage 7 deploy. |
| Old 4.21: nine client funding labels | [G19]: no payor tags. |
| Old 5.4 and 5.11: "Skip New Mexico and Virginia" | [G19]: the labels exist; the constants are added and the mapping is held (O-6). |
| Old rule 5.6: read the labels, post the union, add-only | Replaced by rule 5.6 of this plan (rows L.1 to L.4). |
| Old Stage 8 note: "after the label test, build the two held label rows" | The test is done; the rows are built in 4.21 and 5.8. |
| Old 9.6 order: "updates before creates" | Replaced by 9.8: new records first, records that existed in CR last. |
| Old 9.8 and proposed 3.17: a Workday ID format check | Not built for now (decision 22). |
| Proposed 2026-11-20: a client-create switch `ALLOW_CLIENT_CREATE` | Client creates are gated by the record gate (decision 18). |
| Proposed 2026-11-20: before the first write to a CR ID, check the name and date of birth and that no other HubSpot record holds it | A hand-typed CR ID is trusted (decision 19). The digits-only check is kept (3.16). |
| Proposed 2026-11-20: "HubSpot and Cosmos hold different CR IDs → error" | A changed CR ID is an allowed case (Stage 2 row 2.2; OPEN-ITEMS row 23 e). |
| Proposed 2026-11-20: build the label POST from a Cosmos copy of the labels, not from CR's read | Not needed: managed labels are worked out from HubSpot on every run, and the read supplies only the other labels. Only the last POST's set and time are saved, for the 150-second window (L.3). |
| Proposed 2026-11-20: contact forms `BCBA CO`, `BCBA NY` and `RBT NY` | Zeke kept `Admin` for BCBAs and `Behavior Technician NY` for New York and New Jersey RBTs (decision 17). |
| Proposed 2026-11-20: an employee read with no External System ID is a failed read | Four hand-linked production employees hold none, so a missing value is a real case. |

## 15. Outstanding items

One list of everything held or open. "O-" numbers are stable; numbers closed on 2026-11-20 are in the second table.

| ID | Item | Blocks | Owner | What unblocks it |
|---|---|---|---|---|
| O-6 | New Mexico and Virginia: the HubSpot option values. | BL3, TL2 | Zeke / Danny | The state comes into use |
| O-8 | Workday ID format, and the four production records that hold something else (one in the pattern ###-##-####). A note only for now (decision 22). | 9.1; risk R-8 | Sara, via Danny | Her answer |
| O-9 | The production segment and the checkbox property behind it. The up to 264 existing BTs whose checklist may be ticked later. Row 3.12. | Production start | Zeke, Danny | Zeke's decision at the move to production (9.2, 9.3) |
| O-10 | Production BCBA has no `date_of_birth` property. | Production BCBA creates | Zeke | The property sync is created (9.6) |
| O-11 | A changed employee email does not reach CR, and the status still shows success. | B4 on update | Zeke | The CR test in Stage 8 |
| O-14 | The Location #2 work schedules have no CR field. Options: two new CR fields made by script (decision 27), or the text added to the Work Schedule #1 and #2 fields. | C18 | Zeke | His decision when Stage 4 is built |
| O-15 | Grad Permit Holder; Outgoing Supervising BCBA; SUB and On Leave; Outgoing BT 1 and 2. | C13, C15, C16 | United Care, via Danny | Their answer |
| O-16 | Supervising BCBA: how the typed text is matched to a CR provider. | C12 beyond plain text | Zeke / Sara | Their answer |
| O-17 | Care Coordinator: a target for the email (Case); the CR employee field (BCBA); the owners scope. | C10 email, B11 | Zeke; Danny for the scope | Field chosen; scope added |
| O-18 | Per-BT hours: is a CR field wanted? | C21 | Zeke / Sara | Their answer |
| O-19 | Which property picks the physician pair; the `insurance_id_3` and `insurance_id_4` mappings. | C31, C38 | Zeke / Sara | Their answer |
| O-20 | `phone_number__second_` on the client and `home_apt` on the BT/RBT: sent today, not in the entity tables, but set by [G20]. Keep or stop? Kept until decided. | C9, T5 | Zeke | His decision (recommended: keep both) |
| O-21 | Sandbox and production Contact workflows. | Stage 6 live test | Zeke | Workflows built (7.2, 9.6) |
| O-22 | Go-ahead for the four read-only sandbox reads of P.7. | 3.5, 4.18, 7.1 | Zeke | His go-ahead |
| O-23 | Two Workday IDs that sit on both a BT/RBT and a BCBA record. Does CR stop a second contact with the same External System ID or email? | Those four records; risk R-1 | Danny / United Care | Their answer |
| O-24 | Alternate service-address copy workflow in HubSpot (not a mapping). | — | Zeke / Danny | Source property named |
| O-25 | HubSpot API versions. The code calls only `/crm/v3` and `/crm/v4`. What remains: confirm the app overview stops showing old-version calls after the new build runs. | — | Zeke | After Stage 7 |
| O-26 | Do Contact-mirror changes fire the BT/RBT, BCBA and Case workflows? | K5 | Zeke | The Stage 8 Contact test |
| O-27 | Salaried: a CR label or a profile field? | B10 in production | United Care, via Danny | Their answer, before 9.8 step (1) |
| O-28 | The text CR staff expect for Client Availability, Known Allergies, Diagnosis, Auth Period and several names in one field. Built with the assumed formats of rows 4.5, 4.8, 4.9, 4.11, 4.14. | — | Sara, via Danny | Her answer, or a screen check in Stage 8 |
| O-29 | Do staff edit mapped fields in CR? Any later HubSpot change overwrites them. | 9.8 step (3) | United Care, via Danny | A stated staff rule |
| O-30 | CR's API rate limit. | — | Danny | His answer |
| O-31 | Parallel lanes. Answered 2026-11-20 (decision 29): Stage P is committed first and each lane uses its own worktree and branch. Still asked for at the time: each wave's merge into `architecture-update`, and any push. | Each wave's merge | Zeke | His word at each merge |
| O-32 | Go-ahead for two CR calls: the fresh catalog read of P.6 (read-only) and the blank-field test of 3.13 on employee `5338681` (one production write). | P.6, 3.13 | Zeke | His go-ahead |
| O-33 | Row 3.15 (wait before a second create): build it or not. | 3.15 | Zeke | His decision when Stage 3 is built |
| O-34 | Guide notes that these decisions call for: [G20] (associated test records; BCBA property names), the label test result and the lifted hold, the Colorado contact form, the managed-label rule. | — | Zeke asks; Claude drafts the exact text first | Zeke's request |

Closed on 2026-11-20:

| ID | Item | Closed by |
|---|---|---|
| O-1 | United Care's agreement to the temporary External System ID; whether anything reads it | Zeke: the temporary ID is the HubSpot record ID and nothing reads it (decision 22) |
| O-2 | BCBA credential labels | Zeke: what the guide does not document is not built (decision 25) |
| O-3 | Lift the label hold | Zeke, after the first-hand label test (decision 13) |
| O-4 | Label removal rules | Zeke: every mapped label is managed (decision 14) |
| O-5 | Keep All Clients, All Employees and Clinical | Zeke: keep (decision 14) |
| O-7 | Employee date-of-birth placeholder | Zeke: it stays for now (decision 23) |
| O-12 | Which Contact the Case sync properties pick | Zeke: the first Guardian (decision 24) |
| O-13 | Contact form by type and state | Zeke (decision 17) |

**Waiting on United Care, Sara or Danny:** O-8, O-15, O-23, O-27, O-28, O-29, O-30; part of O-9, O-16, O-17, O-18, O-19. **Waiting on Zeke:** O-6, O-9, O-10, O-11, O-14, O-20, O-21, O-22, O-24, O-25, O-26, O-31, O-32, O-33, O-34.

## 16. Risks and assumptions

Two registers. An assumption is something the plan treats as true that nobody has confirmed. A risk is something that may happen and would cause harm. Confirmed facts are in neither; they are in section 4.

The sorting, action, owner and close-by columns come from the risk reviewer (Opus 5.5, high effort, fresh context, 2026-11-20). The orchestrator checked each against the guide or the code. Entries that could cause a wrong write or a duplicate in production CR come first. "Zeke's decision" is filled where he decided on 2026-11-20; a blank cell means it is checked at its close-by point (decision 28).

Closed on 2026-11-20, and no longer in the registers:

| ID | Was | Closed by |
|---|---|---|
| A-1 | The label POST replaces the set; an invalid ID clears every label; an empty list changes nothing; reads lag | The first-hand test (section 4). True: it replaces the set, and reads lag by about two minutes. False: an empty list clears every label, and an unknown ID is ignored. What is left is A-18. |
| A-3 | Nothing reads the temporary External System ID in CR | Zeke (decision 22) |
| A-6, R-12 | The Case sync properties hold the first Guardian; the wrong Guardian is sent | Zeke (decision 24) |

### Assumptions

| ID | Statement | Sorting | Recommended action | Owner | Close by | Zeke's decision |
|---|---|---|---|---|---|---|
| A-2 | Every CR label and metadata field ID in the plan exists with the meaning given. | Open assumption, narrowed on 11/20: every ID but NM Employee `1157030`, VA Employee `1157031` and Active Case Count `147882` is in the saved catalog of 11/18. | P.6: a fresh snapshot and a test | Zeke; builder | Before the Stage 7 deploy | |
| A-4 | A CR update that sends a blank core field does no harm. The mappers send null for a blank gender, phone, address part or guardian name, for an invalid email and for a state they do not recognise. | Open assumption | Row 3.13: one API test, then build or not; the Stage 8 blank test | builder; Zeke | 3.13 before the Stage 7 deploy; before 9.8 step (3) | Test first, then the orchestrator picks the route (decision 28) |
| A-17 | HubSpot returns a requested property that is blank as a null key, and leaves out only a property that does not exist or cannot be read. | Open assumption | One read-only sandbox GET (P.7 b), then row 4.18 | Zeke; builder | Before the wiring rows | |
| A-18 | Every label ID that a contact's label read returns can be posted back, also one that was deleted from CR's catalog. | Open assumption. Seen on 11/20: an ID that never existed was ignored. A deleted ID was not tested. | L.1 checks the whole set against the live catalog; the Stage 8 deleted-label test | builder; Zeke | Stage 8 label test | |
| A-5 | A HubSpot record ID never equals another CR employee's External System ID. | Open assumption, low | 9.4: count CR External System IDs with 10 or more digits | Zeke | Before 9.8 step (1) | |
| A-13 | "No payor tags" in [G19] does not cover the BCBA label NY Medicaid. | Open assumption | Ask; keep 5.6 out of production until answered | United Care, via Danny | Before 9.8 step (1) | |
| A-12 | Salaried is a CR label (`1132653`), not a profile field. The label exists in the catalog. | Open assumption | Ask (O-27); keep 5.7 out of production until answered | United Care, via Danny | Before 9.8 step (1) | |
| A-19 | Staff do not edit mapped fields in CR. Any later HubSpot change sends the whole core payload and overwrites them. | Open assumption | Ask (O-29); record it as a staff rule | United Care, via Danny | Before 9.8 step (1) | |
| A-20 | CR does not stop a second contact with the same External System ID or email. If so, every gap in the lookups becomes a real duplicate. | Open assumption | Ask (O-23) | Danny | Before 9.8 step (1) | |
| A-21 | CR's lookup by External System ID finds a record straight after it is created. | Open assumption | Row 3.15; time it in Stage 8 | builder; Zeke | Stage 8 round 1 | Decided when Stage 3 is built (O-33) |
| A-8 | A sandbox test employee can be given values in the Contact-mirror properties. [G20] sets them on the record; [G02] calls them read-only mirrors. | Open assumption | P.7 (d); fix 7.1 and [G20] | Zeke | 7.1 | Test employees get an associated Contact (decision 21) |
| A-9 | The text CR staff expect in Client Availability, Known Allergies, Diagnosis, Auth Period and a field with several names. | Open assumption | Ask Sara (O-28) | Sara, via Danny | Before 9.8 step (2) | |
| A-10 | `n1_what_type_of_insurance` chooses the physician pair, with stored values `Medicaid FFS`, `Commercial Enrolled`, `Commercial OON`. | Open assumption | One read-only property read (P.7 c); O-19 for the choice | Zeke | Before the Stage 4 commit | |
| A-11 | A found client lookup carries the CR ID at `contact.contactId`. If not, every linked Case stops with a visible error and no write. | Open assumption | Test in the sandbox | builder | Stage 8 round 1 | |
| A-7 | A change to a Contact-mirrored property fires the HubSpot workflow on the record that mirrors it. | Open assumption | Stage 8 Contact test (O-26); the daily sweep is the fallback | Zeke | Stage 8 | |
| A-16 | An association change moves the Case's `hs_lastmodifieddate`. | Open assumption | A HubSpot-only sandbox test | Zeke | Before 3.2 is signed off; repeated in Stage 8 | |
| A-14 | The search operator for "the multi-checkbox contains Yes". Combining filters is settled. | Open assumption | One read-only search (P.7 a) | Zeke | Before 3.5 | |
| A-15 | A first scheduled delivery has delivery count 1; the host stops a run at the function timeout. | Open assumption | Stage 8 retries test | builder | Stage 8 | |

### Risks

| ID | Statement | Sorting | Recommended action | Owner | Close by | Zeke's decision |
|---|---|---|---|---|---|---|
| R-1 | Duplicate employee. A person already in CR with no External System ID there, or a rehire or a BT who becomes a BCBA on a new HubSpot record with a blank `workday_id`, is created again. Ticking the checklist on up to 264 existing BTs sends them to the integration. | Risk | Block employee creates in production until 9.4 is done and the gate is set only on confirmed new hires (9.3) | Zeke, Danny, United Care | Before 9.8 step (1) | Production is gated by the segment he picks (decision 20) |
| R-2 | Duplicate client. A Case with Yes and no Client ID, whose client staff already made in CR, gets a second client. No setting turns client creates off. | Risk | Row 3.14 (the create path); the 9.5 list | builder; Zeke | 3.14 before the Stage 7 deploy; 9.5 before 9.8 step (2) | **Accepted for the sandbox:** client creates are gated by the record gate, with no extra switch (decision 18). Production: the segment (decision 20) |
| R-24 | Duplicate after a create with an unknown result. The retry runs 60 seconds later; a lookup that does not yet show the first create leads to a second. Clients have no pending marker at all. | Risk | Row 3.15 | builder | Before Stage 8 round 1 | Decided when Stage 3 is built (O-33) |
| R-25 | The client lookup before a create is a full-payload PUT. A 400 that says "not found" leads to a create, and an answer with a loose `id` becomes the link. | Risk | Row 3.14 | builder | Before the Stage 7 deploy | Route chosen by the orchestrator (decision 28): the read-only lookup |
| R-3 | Update of the wrong CR contact. A hand-typed `client_id_number` or `employee_id` is trusted. An employee update then writes `workday_id` as that contact's External System ID, which the API cannot undo. | Risk | Row 3.16; then 9.4 and 9.5 | builder; Zeke | 3.16 before the Stage 7 deploy; data before 9.8 step (3) | **Accepted:** a hand-typed CR ID is trusted (decision 19). Row 3.16 is the digits-only check; the name and date-of-birth check is dropped |
| R-27 | Two HubSpot records hold one CR ID, so two people's data alternate on one CR record. Nothing checks this on a linked update. | Risk | A read-only HubSpot search for duplicates (9.4) | builder; Zeke | The search before 9.8 step (3) | **Accepted** (decision 19): no check in code; the search stays in 9.4 |
| R-26 | Every client update sends the Case record ID as External System ID, and the contact form. A hand-linked client is permanently claimed by that Case. | Risk | Row 3.14 (create only) | builder | Before the Stage 7 deploy | Route chosen (decision 28): create only |
| R-29 | A CR ID from HubSpot goes into the request path unchecked. | Risk | Row 3.16 (digits only) | builder | Before the Stage 7 deploy | Digits-only kept (decision 19) |
| R-4 | CR values are overwritten on records that existed before go-live. Any run that is not a no-op sends the whole core payload. | Risk | Row 3.13; a per-batch list of fields that would change before 9.8 step (3) | builder; Zeke | Before 9.8 step (3) | The list is decided at Stage 9 |
| R-5 | A label POST wipes a contact's labels: an empty list, or a deleted label a read still returns. CR's catalog has lost labels before (108 → 95). | Risk, **lowered on 11/20**: an ID that never existed was ignored. Not closed: an empty list does clear everything, and a deleted ID was not tested. | P.3 and L.1 | builder | Before the Stage 7 deploy | |
| R-6 | A staff label edit made shortly before the integration posts is undone, because the read lags (122 seconds, measured twice on 11/20). | Risk | Post only when the integration's own labels changed (L.2); the 150-second window (L.3); accept what remains | Zeke; builder | Stage 8 label test | |
| R-28 | One setting opens everything: gate `none` or `INCLUDE_TEST_RECORDS` in production; the linked recheck is on by default with no gate filter. | Risk | Rows 3.12, 3.2, 3.5 | builder | 3.2 and 3.5 before the Stage 7 deploy; 3.12 at step 9.2 | 3.12 is decided at the move to production (decision 20) |
| R-8 | A `workday_id` that is not a Workday ID is stored in CR for good. Four production records hold one; one looks like ###-##-####. | Risk | A format check as a setting, not a fixed 7 digits (the sandbox test IDs are `AZTEST-…`) | builder; Sara and Danny for the format | Before 9.8 step (1) | **Noted, not built for now** (decision 22); open for production (9.1) |
| R-9 | An employee with a blank date of birth is created with 2000-01-01. | Risk, certain for each blank date | Ask (O-7); block | Danny | Before 9.8 step (1) | **Accepted for now:** the placeholder stays (decision 23) |
| R-10 | Wrong contact form. Until row 5.13 every BT/RBT gets the New York form. After it, New Jersey staff still do (no New Jersey form exists), a Colorado BT gets `RBT CO`, and every BCBA gets `Admin`. What a form sets by itself is not known. | Risk | Ask (O-13); block creates of non-New York staff | United Care, via Danny | Before 9.8 step (1) | **Decided** (decision 17). What a form sets is read after each create in Stage 8 |
| R-11 | A metadata value is deleted by mistake: a field dropped from the mapper but left in the known list, or an unread input turned into a blank. For employees, leaving the key out is not enough. | Risk | Rows 5.3, 4.14, 4.16, 6.4 use the omit list, each with a test | builder | Each row's commit | |
| R-33 | The Stage 8 "wrong Client ID" test writes to a real client if it is run on a fresh Case. | Risk | The method in 7.1 (e) | Zeke | 7.1 | |
| R-7 | Today's mappers send the clinical fields, the wrong schedule, hours and auth properties, field `134444` and wrong BT/RBT role labels. | Fact about the code; a risk only if the app is started early | 7.3 confirms the app is Stopped and the three functions are disabled | Zeke | Before the Stage 7 deploy | |
| R-13 | Stale labels: a BT who becomes an RBT keeps the BT label; a state change keeps the old state label. | Risk, certain under add-only | Record the label test (O-3); ask O-4 | Zeke; Danny | Before 9.8 step (2) | **Addressed:** the hold is lifted and every mapped label is managed (decisions 13, 14); built in L.2, 4.19 to 4.21, 5.4 to 5.12 |
| R-15 | A changed employee email never reaches CR and the status still shows success. | Certain by design | Stage 8 test (O-11) | Zeke | Before 9.8 step (1) | |
| R-17 | 81 of 100 sampled Client IDs do not resolve in CR. Mostly a visible error; a wrong write if an ID belongs to another contact. | Risk | Block 9.8 step (3) until 9.5 explains it | Zeke | Before 9.8 step (3) | |
| R-35 | A field dropped from a mapper keeps its old value in CR. | Risk, low | Row 3.7 compares the mapping version | builder | Stage 3 | Compared (decision 28) |
| R-16 | A change with no HubSpot workflow trigger arrives up to a day late. | Risk, delay | Accept; 3.10 must pass | Zeke | Before the Stage 7 deploy | |
| R-19 | A good label POST ends as an error because the read-back never matches. | Risk, visible error | The 150-second window (L.3); time the lag in Stage 8 | builder; Zeke | Stage 8 label test | |
| R-23 | The sensitive-field check cannot be proven in the sandbox. A visible error, not a wrong write. | Risk, low | One read-only production GET (9.6) | Zeke | Before 9.8 step (2) | |
| R-18 | The temporary ID stays in CR because staff do not replace it. | Risk, delay | Accept (waiting view; Danny's alerts) | Danny | Before 9.8 step (1) | |
| R-22 | An answer from United Care changes a built rule. | Schedule risk | Accept | Danny | Before 9.8 step (1) | |
| R-34 | The sweep and the 5 AM and 1 PM refreshes hit rate limits. | Risk, delay | Accept the 60-a-minute spread; ask for CR's limit (O-30) | builder; Danny | Before 9.8 step (3) | |
| R-20 | Each sandbox round leaves three test contacts in production CR. | Accepted | Accept | Zeke | Stage 8 | |
| R-21 | Builder agents working at once collide. | Build risk | One worktree per lane; merge and `npm test` per wave | orchestrator | Before Stage 3 starts | Agreed 2026-11-20: Stage P committed first, one worktree per lane (decision 29) |

Cost accepted (from the 2026-11-18 plan): an employee run that is not a clean no-op makes one CR read for the ID check; a Case run reads the Case and two association lists. Known safe limit: a record created with its Workday ID whose Cosmos state is lost shows `waiting` instead of re-linking; no duplicate results.

## 17. Build schedule for Stages 3 to 6, and what may reach production

### Waves and lanes

| Wave | Lane | Rows | Files the lane owns |
|---|---|---|---|
| 0, one builder, in order | Prep | P.1, P.2, P.3, P.5 (builder); P.4, P.6, P.7 (orchestrator, with Zeke's go-aheads) | Both workflow code files, `src/lib/hubspotClient.mjs`, `src/constants/staffingAssociations.mjs`, `src/constants/centralReach.mjs`, the two new property files |
| 1, in parallel | A Poller | 3.1 to 3.5, 3.11 | `src/workflows/intakePollerWorkflow.mjs`, `src/functions/intakePoller.mjs`, `src/functions/intakePollerHttpTest.mjs`, `src/lib/hubspotClient.mjs` (search functions), `src/lib/config.mjs`, `src/lib/serviceBusClient.mjs`, `src/functions/processClientQueue.mjs`, `src/functions/hubspotWebhook.mjs`, `src/lib/hubspotWebhook.mjs`, `local.settings.example.json` |
| 1, in parallel | B Workers | 3.7 to 3.9, 3.16; 3.13 and 3.15 if decided; the workflow side of L.3 and 5.13 | `src/workflows/clientSyncWorkflow.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/lib/mappedState.mjs`, `src/lib/linkRecord.mjs`, `src/lib/retry.mjs`, `src/constants/syncReasons.mjs` |
| 1, in parallel | L CentralReach client | L.1 to L.4, 3.14, the form function of 5.13 | `src/lib/centralReachClient.mjs` |
| 1, in parallel | C Mappers | 4.1 to 4.13, 4.15, 4.17, 4.19 to 4.22; 5.1 to 5.13 (mapper side); 3.10 | `src/mappings/**`, `src/constants/centralReach.mjs`, `package.json`, `scripts/check-triggers.mjs`, `webhook-triggers.json` |
| 2, in parallel | D Case wiring | 4.14, 4.16, 4.18 for the Case | `src/workflows/clientSyncWorkflow.mjs`, `src/lib/hubspotClient.mjs` |
| 2, in parallel | E Employee wiring and Contact | 4.18 for BCBA and BT/RBT; 6.1 to 6.4 | `src/workflows/employeeSyncWorkflow.mjs`, `src/mappings/employees/buildEmployeePayload.mjs`, `src/lib/hubspotWebhook.mjs`, `src/functions/hubspotWebhook.mjs`, `src/functions/processClientQueue.mjs`, `src/lib/serviceBusClient.mjs`, `src/lib/config.mjs`, new `src/workflows/contactFanOutWorkflow.mjs` |

- **What merges.** The Stage 4 mapper rows and all of Stage 5 are one lane (C). Stage 6 is built with the employee wiring (E). Stage 3 is split in three (A, B, L).
- **Tests.** Each lane writes its new tests in new files. Old test files have one owner: lane A owns the poller, webhook, queue, Service Bus and config tests; lane B owns the workflow, stage 1, stage 2 and duplicate-safety tests; lane L owns the CentralReach client tests; lane C owns the mapping tests. A lane that needs an assertion changed in a file it does not own writes the change in its stage report, and the orchestrator applies it at the merge. Several old stage 1 and stage 2 tests run the real mappers, so lane B's new tests vary only fields lane C does not remap.
- **How lanes are kept apart.** One git worktree and branch per lane, cut from the Stage P commit; after each wave the orchestrator merges the lanes into `architecture-update` and runs `npm test`. Zeke agreed on 2026-11-20 to committing Stage P first and to the worktrees and branches (decision 29). Each wave's merge, and any push, is asked for at the time. A worktree has no `node_modules`; link the main copy's folder, do not install.
- **Fallback without worktrees.** The lanes run one after another in the main working copy, in this order: A, L, B, C, then D, E. Same rows, same files, same reviews.
- **Agents.** Each builder is Claude Fable 5.2 at high effort with a fresh context. Each lane is reviewed by Opus 5.5 at high effort from the lane's diff and its plan rows only. After wave 2, one Opus 5.5 high review reads the whole diff from `8fe5c54`. The orchestrator confirms every finding by running code before it reaches Zeke.
- **Strictly in order after wave 2.** The final review, the commit on Zeke's word, Stage 7 (7.1, 7.2, the trigger check, 7.3), the sandbox rounds, production readiness.

### What cannot safely reach production yet, and why

| Scope | Why not yet | Closed by |
|---|---|---|
| Employees already in CR (515 with Entered in CentralReach = Yes and no `employee_id`) | 108 of 200 sampled CR employees have no External System ID, so the lookup cannot find them and a create would duplicate them (R-1). | 9.3, 9.4 |
| Linked Cases (475 with a Client ID) | 81 of 100 sampled Client IDs did not resolve; the IDs were typed by hand (accepted, decision 19); any run sends the whole core payload (R-4, R-17). | 9.5; 3.13; the list before 9.8 step (3) |
| Case creates for clients staff already made in CR | The lookup by Case record ID cannot find a hand-made client (R-2). | 9.5; the production gate |
| Labels on contacts that existed before go-live | A read can lag two minutes and a staff edit in that window can be undone (R-6). The integration's own sender is not yet proven. | The Stage 8 label test |
| BCBA creates | Production BCBA has no `date_of_birth` property (O-10). | 9.6 |
| Records with a bad `workday_id` | It would be stored in CR for good (R-8). | 9.1 |
| Salaried and NY Medicaid labels | O-27 and A-13 are not answered. | Before 9.8 step (1) |
| Anything, before Stages 4 and 5 are in the deployed build | Today's mappers send wrong fields and labels (R-7). | Stages 4 and 5; 7.3 |

### Smallest production-ready scope

New BT/RBT and BCBA hires only (9.8 step 1). The gate checkbox is set only on records United Care confirms are not in CR, and never on a person who already has an employee record. The integration creates them with the temporary ID, updates them, and manages labels only on the contacts it made. New Cases come second (step 2). Records that existed in CR before go-live come last (step 3), one confirmed batch at a time.

## 18. Hand-off brief for the builder agent

The builder is a Claude agent (Fable 5.2, high effort) that the orchestrator starts with a fresh context, one lane per agent. The orchestrator gives it this brief, its lane from section 17, and where it works (the lane's worktree, or the main working copy on `architecture-update`).

**Brief.**

1. You are building one lane of an integration that writes to a production system. Read these first, in full: this file's sections 2 to 5, section 9 for the requirement IDs your rows cite, the stage sections for your rows, your lane in section 17, and `guide-extract-2026-11-20.md` for the guide rows your requirements cite. Read the source files your lane owns before changing them.
2. Obey the hard stops in section 2. In particular: no live API calls, no `func start`, no deploy, no git commands that change anything (no add, commit, push, checkout, stash, reset), and do not open `.env` or `local.settings.json`.
3. Change only the files your lane owns. If a row cannot be built without a change to another lane's file, do not make it: say so in the report.
4. Work in this order: write the tests for every row of your lane from the rule text; run them and see them fail; write the code; run `npm test` until everything passes. For each workflow code file your lane changes, at least one test runs the real path with nothing faked between the mapper and the hash (no fake `hashPayload`, no fake mapper). The Stage 1 review found a defect that every test missed because the hash was faked.
5. Build only your rows. If a rule is unclear, or the code makes a rule impossible as written, do not guess: leave that row unbuilt and say so in the report. Never invent a CR ID, a HubSpot property name or a stored value; use the ones in this file.
6. Keep the change small and readable. Follow the existing style: ES modules, functions passed in through `dependencies` for tests, `safeLog` for logs, field names in logs and reasons, never values. No new packages.
7. Do not weaken or delete a test to make it pass. Change an old test only where this plan changed its rule and your lane owns the file; list each one.
8. Finish with a **stage report**: files changed; each new test title; the `npm test` totals; each old test changed and why; each change you need in a file you do not own; any row not built and why; any app setting added, renamed or retired; questions; and one line confirming that no live call, deploy or git change was made.

## 19. Review brief (the reviewer agent, every lane)

Give the reviewer the lane's diff, this file's sections 2 to 5, section 9 and the stage rows of the lane. Do not give it the builder's stage report or any conclusion. The orchestrator then confirms each finding by running code before it reaches Zeke.

1. Re-run `npm test`. Read every changed file in full, not only the diff lines.
2. For each row of the lane: is the rule built as written, and does a test prove it? Name any row with no test, and any rule that is proven only through a faked hash or mapper.
3. Look for any path that can: create a duplicate; write to the wrong CentralReach record; write for a record the gate should skip; lose a change; turn a failed read into a blank; post an empty label list or an ID outside the sendable list; remove a label the integration does not manage; retry something permanent or drop something temporary; log or store a value instead of a field name.
4. Check that the create signal is read only in `src/lib/syncEligibility.mjs`, that `blocked` is not written, that the lane changed only its own files, and that no test or script calls a live service.
5. Report findings with `file:line`, a severity (high: duplicate, wrong record, gate bypass, lost change, production write risk; medium; low) and the smallest fix. Change nothing.

Per lane: the builder agent builds → the reviewer agent reviews → the orchestrator verifies each finding → the orchestrator or the builder fixes → `npm test`. Per wave: merge, `npm test`, tracker and OPEN-ITEMS updated. Zeke says whether to commit and push. No two agents write the same file.

## 20. Cross-reference to the tracker

For tracker upkeep only. A builder can ignore this table. Rows that are new on 2026-11-20 (Stage P, 3.12 to 3.17, L.1 to L.4, 4.22, 5.13) have no tracker ID yet.

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
| 1.12, L.1 to L.4 | V1, Q22 |
| 2.1 to 2.4 | 8F, 8H, N1, V13, V14, B3 |
| 2.5, 2.6 | 8D, 8I, B4 |
| 2.7 to 2.11 | Item 12, V16, V18, B8 |
| 3.1 to 3.5 | Item 11, V19, N2, N3 |
| 3.7, 3.8 | Item 9, V15, Q10 |
| 3.10, 3.11 | Item 10, Q12 |
| Stage 4 | Items 3, 6, 7; B5, N4 |
| Stage 5 | Items 4, 5 |
| 5.13 | Q29 |
| Stage 6 | Item 10, V20 |
| 9.1 | Q34 |
| 9.4, 9.5 | Q33, V6; 2026-11-18 client read |
