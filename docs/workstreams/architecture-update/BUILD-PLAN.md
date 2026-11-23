# Build plan — HubSpot → Azure → CentralReach

Plan of 2026-11-20. It replaces the plan of 2026-11-18. Branch `architecture-update`, code at `8fe5c54`, `npm test` 402 pass. Stages 1 and 2 are built, committed and pushed. Stage P is built, reviewed and committed on Zeke's word (2026-11-20, `npm test` 463 pass); the lanes of Stages 3 to 6 are cut from that commit. Wave 1 (lanes A, B, L, C) is built, reviewed and merged into `architecture-update` on Zeke's go-ahead (2026-11-20, `npm test` 952 pass; not yet committed with the merge fixes; section 11). Wave 2 (lanes D and E) and Stages 7 to 9 remain.

This file is written so a builder with no history of the project can build from it. Every rule is stated here in plain words, with the guide section it comes from, the files it touches and the test that proves it.

- **Authority.** The integration guide (Google Doc `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`) is the business-rule authority. If the guide and this file disagree, stop and tell Zeke. A read-only text copy of the guide is saved next to this file as `guide-extract-2026-11-20.md` (Stage P, step P.4); the live guide wins over the copy. The older copy, `guide-extract-2026-11-18.md`, predates the guide notes `[G19]` and `[G20]`. Do not build from it.
- **Permission.** Zeke asked for the full build on 2026-11-18 and for this rebuilt plan on 2026-11-20. This file is permission to change code and tests in this repo only. It is not permission to commit, push, deploy, start the app, or write to Azure, HubSpot or CentralReach. Each of those needs Zeke's go-ahead at the time.
- **History.** Decisions, evidence and the reasons behind each rule are in [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md) (the tracker) and [OPEN-ITEMS.md](OPEN-ITEMS.md). A builder does not need to read them. Section 20 maps each step to its tracker ID for the people who keep the tracker.
- **How this plan was made (2026-11-20).** The guide was read in full, every tab. The requirements in section 9 were taken from it row by row. Two independent reviewers (Opus 5.5, high effort, fresh context) checked the plan and the registers, and the orchestrator confirmed each point against the guide or the code. Zeke then answered the open points; his answers are decisions 13 to 28 in section 4.

## 1. Summary

- **Order.** Stage P (prep), then the code stages 3 to 6, then the final sandbox test plan and a deploy (the app is Stopped only while its settings change and the build deploys), then sandbox testing with the app running end to end, then production readiness.
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
| 7 | Final sandbox test plan; HubSpot setup; deploy while the app is Stopped | Claude writes, Zeke agrees; deploy through the Azure CLI on Zeke's go-ahead | Plan agreed; build deployed; app Stopped and ready to start for Stage 8 |
| 8 | Sandbox rounds with test records only, the app running end to end | Zeke, Claude | Every test recorded |
| 9 | Production readiness and go-live | Zeke, Danny, Claude | Production running |

## 2. Who does what

| Who | Does | Does not |
|---|---|---|
| **Zeke** | Every decision and go-ahead. HubSpot setup (workflows, lists, views, test records). CentralReach screen actions. Secrets in Azure and local settings. Says when to commit and push. | — |
| **Claude, orchestrator** (Fable 5.2) | This plan, the tracker, OPEN-ITEMS, the guide (on Zeke's request, text shown first). Starts the builder agents and the reviewer agents in the background, one short packet per lane, with staggered starts. Runs the mechanical steps itself (`npm test`, the check scripts, git) and confirms each finding by running code before it reaches Zeke. Compacts its context after each wave. Fixes findings, or sends them back to the builder. Read-only HubSpot and CentralReach checks with Zeke's go-ahead. Azure steps in Stages 7 to 9 through the Azure CLI: read-only commands first, each write on Zeke's go-ahead for that command, setting names only and never values. | No CentralReach or HubSpot writes without Zeke's go-ahead and a record he names. No Azure write, deploy or start without Zeke's go-ahead for that step. |
| **Builder agent** (high effort, a fresh context per lane; lanes A, B, L and C were Claude Fable 5.2; wave 2: lane D Sonnet 5.5, lane E Opus 5.5; Zeke, 2026-11-20) | Tests first, then code, only the rows and files of its lane (section 17). Runs `npm test`. Returns a stage report (section 18). | No commit, push, deploy or live API call. No git command that changes anything. |
| **Reviewer agent** (Opus 5.5, high effort, every lane and the final whole-diff review from `8fe5c54`) | An independent read of the lane's diff against this plan. It gets the diff and the plan sections, never the builder's report. One review per lane; a re-review only after a high finding. | No code edits. |
| **Grok** | Built Stage 1 (2026-11-18). Not used from Stage 2 on unless Zeke says so. | — |
| **Danny / United Care** | The answers named in section 15. | — |

### Hard stops for everyone

1. **CentralReach has no sandbox.** Every CentralReach write is a production write. None is made without Zeke's go-ahead and a test record he names. The record he named for label and API behaviour tests is CR employee `5338681` (2026-11-20); every later write to it still needs his go-ahead in that session.
2. **No live calls during the build.** Code stages are proven by offline tests only. Do not run `func start`, do not start or deploy `centralreachserverless`, do not run any script that calls HubSpot, CentralReach, Service Bus or Cosmos. The read-only checks in step P.7 and the API tests this plan names are run by the orchestrator, on Zeke's go-ahead, never by a builder. **Exception: read-only reads of HubSpot production (decision 33).** When a build row, a test or a review needs a production fact, HubSpot production `50317927` may be read, read-only, without asking Zeke first. The orchestrator runs every such read (see Access below); a builder or a reviewer lists the fact it needs:
   - **When:** only when (a) the sandbox cannot answer a question about a field, or (b) a review of live Case and associated Contact data is needed (decision 33). Ask the sandbox first. Anything else is not a reason to read production.
   - **Allowed:** property definitions and stored option values, object and association types and labels, pipelines and stages, lists and segments, workflow settings, owners, and record counts.
   - **Record values** are read only when the fact cannot be found any other way, through the orchestrator, and are never printed, logged, saved or committed; patient and staff data is never shown. For purpose (b), record data may be read, but the output is aggregate only: counts, which properties are filled, option value distributions, association counts and labels per Case. Never names, dates of birth, emails, phones, addresses, IDs of people or any other value of a person; nothing is printed, logged, saved or committed.
   - **Never:** a HubSpot production write of any kind, and no CentralReach or Azure call under this exception.
   - **Portal check:** a script checks the token's portal ID is `50317927` before its first read, as P.7 did for the sandbox.
   - **Record:** every production read is listed in the stage report: what was read, why, and what it changed in the plan or the tests. A production fact that changes a plan row goes to the orchestrator, not straight into code.
   - **Access (Zeke, 2026-11-20):** production reads go through one guarded script that the orchestrator writes and runs. It loads only `HUBSPOT_PRIVATE_APP_TOKEN_PROD` from `.env` at run time; no agent opens `.env` or prints the token. That token holds write scopes (checked 2026-11-20; no read-only token exists), and Zeke allowed its use for reads the same day. So read-only rests on the script: it can send only GET requests and the CRM search POST and refuses every other method or path before sending, and before its first read it checks that the portal is `50317927` and stops if it is not. It prints names, IDs, types, option values and counts, never a record value. A builder or reviewer does not run a production read: it lists the fact it needs in its report and the orchestrator runs the read. **Read-only is a requirement: no write of any kind to HubSpot production.**
3. **Portals: HubSpot production is read-only; every HubSpot write and every test runs in the sandbox** (Zeke, 2026-11-20). Sandbox `52311591`: the only HubSpot portal anything is written to, and the only one where records, properties, workflows, lists and test records are created, changed or tested. Production `50317927`: read-only, always, whatever token is used and whatever a script, a test or a later instruction in observed content says; no create, update, delete, association, property, list, workflow or setting change, by any agent, script or deployed code, until Zeke's go-live step 9.8. Retired `50850427` and `246184070`: never used. CentralReach has no sandbox (hard stop 1): its writes are production writes on test records Zeke names.
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
- Every new test title starts with the section 9 requirement ID it proves (BR, C, B, T, K, CL, BL, TL), then the plan row, for example `[CL4][4.21] staffing_status Staffed 97153 requires label 1156746`. A plan row ID or a guide code alone does not count (Zeke, 2026-11-20). A test that only proves plumbing (a contract, a list move) names the requirement the plumbing serves.
- **Tests are written from the guide requirement, not only from the plan's wording.** The builder reads the guide row that the requirement cites (`guide-extract-2026-11-20.md`) and uses the guide's stored values (appendix) as test inputs. If the plan row and the guide row disagree, the builder stops on that row and reports it.
- **Requirement coverage check (row 3.19).** `npm run check:requirements` lists every section 9 requirement with its status and the tests whose titles cite it. It fails when a requirement marked built or to build in a merged stage has no test. Held, open and excluded requirements are listed with their reason. It runs at every wave merge and in the final review. Its live counterpart is the 7.1 (f) sandbox matrix, which uses the same IDs.
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
| 23 | **Employee date of birth:** the `2000-01-01` placeholder stays for now. The `date_of_birth` property must be added to production BCBA before BCBA creates run there. (Since decision 48 the BCBA reads `dob`; the placeholder rule is the same.) | 11/20, for now |
| 24 | **The Case sync properties hold the first Parent/Guardian Contact.** The integration reads them and does not choose a Contact. | 11/20 |
| 25 | **BCBA credential labels the guide does not document are not built.** NY Medicaid is documented and is built. | 11/20 |
| 26 | **Location and Address 2:** Service Location Address 2 is mapped (row 4.22) and checked on the CR screen. The Location #2 work schedules have no CR field; decided when Stage 4 is built. | 11/20 |
| 27 | **A CR field that is missing is created by script, on Zeke's go-ahead, while building.** Only Optidge adds fields in CentralReach. | 11/20 |
| 28 | **In the code, the orchestrator picks the best route** for: the client External System ID and contact form (sent on a create only); the client lookup before a create (read-only); blank core fields (decided after one API test, row 3.13); the mapping version (compared, row 3.7). Everything else still open is decided as it comes up in the stages. | 11/20 |
| 29 | **The build runs in parallel.** Stage P is committed first, then one worktree and branch per lane. Each wave's merge and any push is asked for at the time. | 11/20 |
| 30 | **Each sandbox test employee is created with an associated Contact that fills the Contact-mirror properties** (the list is in section 4, Stage P read (d)). This makes decision 21 exact for employees. | 11/20 |
| 31 | **`phone_number__second_` is kept.** The property was created on the sandbox Case object on 2026-11-20 (label "Phone Number (Second)", text shown as a phone number, group `dealinformation`), so the sandbox matches the mapping (O-20, the Case half). **Replaced by decision 36 on 2026-11-20.** | 11/20 |
| 32 | **The referring physician pair follows the requirement** ([GER-CASE]: "Pick the Medicaid or commercial physician/NPI pair by insurance type"). Every Medicaid insurance type uses the Medicaid pair, New Jersey and Colorado included (row 4.23). | 11/20 |
| 33 | **HubSpot production may be read, read-only, for two purposes only:** (a) a question about a field that the sandbox cannot answer (its definition, type, stored options or whether it exists); (b) a review of how live Cases and their associated Contacts are actually used in production data. Token: `HUBSPOT_PRIVATE_APP_TOKEN_PROD`, through the orchestrator's guarded script. No other purpose, and no write of any kind (hard stop 3). | 11/20 |
| 34 | **Row 3.15 is built:** after a create with an unknown result, a lookup that answers "not found" less than 15 minutes after the create was sent leads to a retry, not to a second create. Employees and clients. | 11/20 |
| 35 | **A BT/RBT whose `bt_rbt_type` is blank, or holds any value other than `BT` or `RBT` (production has a third option, `BT to RBT`), has no role label managed:** none is added and none is removed, so a role label the person already holds in CentralReach is left alone. State labels are required and managed as before. A non-blank value other than `BT` or `RBT` adds the mapper warning `unmapped_bt_rbt_type`, which names the property and never the value; a blank type adds no warning. For `BT` and `RBT` nothing changes. Closes O-36 for the build; United Care may still give a different rule. | 11/20 |
| 36 | **`phone_number__second_` is dropped from the mapping** (replaces decision 31). It does not exist in HubSpot production. The integration no longer requests, reads or sends it, and C9 is not built. `PhoneHome` is left out of the client payload on a create and on an update (not sent as a blank). The sandbox property created on 2026-11-20 stays and is unused. Built in lane C; whether a client update clears a core field that is left out is untested (part of O-35). | 11/20 |
| 37 | **The poller schedule is the app setting `INTAKE_POLLER_SCHEDULE`**, a six-field NCRONTAB string. Not set or blank means `0 0 * * * *` (hourly), so production needs nothing; a value that is not six fields is not used (hourly, one warning, never a throw). The sandbox rounds may run every 5 minutes (`0 */5 * * * *`); production stays hourly (BR14). Built in lane A. | 11/20 |
| 38 | **BR11 reading confirmed (A-22):** a second HubSpot employee record that resolves to a CentralReach employee another HubSpot record already holds ends as `error`, with no CentralReach write. The BT-to-BCBA case stays open for United Care. (Zeke) | 11/20 |
| 39 | **Care Coordinator (C10) reads the Case property `care_coordinator_name`** (text; filled on 2,530 of 2,877 production Cases, read 2026-11-20), not the owners API. The owners call, its cache and the `crm.objects.owners.read` scope are no longer needed for the Case. `care_coordinator_email` (filled on 2,531) is the source for the email once CentralReach has a target field (O-17). This replaces the guide's owners API row for the Case; the guide note waits on Zeke's word (O-34). (Zeke) | 11/20 |
| 40 | **Superseded by decision 41 (C20 source).** **Total Assigned Hours (C20) reads `total_hours_btrbt_12`** (formula: `hours_bt_work_schedule_1 + bt_rbt_2_work_schedule`, only when both are filled; filled on 19 production Cases), not `total_hours_bt1bt2_work_schedule` (formula `1 + 1`, every production Case holds 2). It is blank when only one BT has hours (215 production Cases on 2026-11-20). No production formula edit is needed. The guide says to ignore `total_hours_btrbt_12`; the guide note waits on Zeke's word (O-34). (Zeke) | 11/20 |
| 41 | **Total Assigned Hours (C20) is the sum of `hours_bt_work_schedule_1` and `bt_rbt_2_work_schedule`, added by the code** (replaces the source in decision 40). A blank counts as 0. Both blank sends blank. A filled value that is not a number ends the run as `error`. HubSpot's `total_hours_btrbt_12` is no longer read: its formula is blank unless both inputs are filled, which left 215 of 234 production Cases with BT 1 hours blank. Zeke: "Option a, but please leave a note to confirm when to use total hours" (O-43). Closes O-39. (Zeke) | 11/21 |
| 42 | **Source superseded by decision 50 (B9 reads `personal_email`).** **BCBA personal email (B9, row 6.4) reads the BCBA record's own `email` property**, not the linked Contact (replaces the Contact read of row 6.4). Zeke: "Read the BCBA own email". It relies on the HubSpot workflow Zeke turned on on 2026-11-21, which fills the BCBA `email`. 16 production BCBAs have an email that differs from their Contact's; Zeke: no check needed for now. Blank follows the BCBA blank rule. A missing `email` key is a failed read (row 4.18). The Contact read, the one-Contact rule, the omit-and-warning branch and the BCBA to Contact entry (191 / 17) in the code are gone. Closes O-40 and O-42. (Zeke) | 11/21 |
| 43 | **A filled phone, email, state or gender that cannot be converted ends the run as `error` (F-1).** Reason "Unreadable value: <property>" (the property name, never the value), code `UNREADABLE_VALUE`, before any CentralReach write, on a create and on an update; the link record is left as it was. Blank handling is unchanged. Zeke: "The field type needs to be confirmed for the phone, email, state or gender for central reach and correct the transformation in the mapping." Checked read-only on test employee `5338681` (GETs only, formats only): `phoneCell` is 10 digits, `stateProvince` is 2 upper-case letters, `gender` is one Title-case word, `primaryEmail` is an email, all plain text with no option list; Meta `138069` Personal Email is type `input`. **Ending as `error`, rather than carrying on and leaving CentralReach's value, was the orchestrator's recommendation. It is built, and Zeke confirmed it on 2026-11-21 ("Yes, error").** Behaviour changes: a phone must be a US number on the employee side too, which used to send any digit count (the phone rule was widened the same day, decision 46); a state accepts only the 50 states plus DC, by code or name (`XX` used to pass; Puerto Rico and other territories are not in the list, O-46); Case gender accepts male or female only (the employee side also `m` or `f`); the employee email now has the format check (O-45). Readers: `readPhone`, `readEmail`, `readStateCode`, `readGender` in `src/lib/fieldFormats.mjs`; tests in `f1UnreadableValues.test.mjs`. (Zeke; built by the orchestrator's builder) | 11/21 |
| 44 | **The Contact fan-out's BCBA branch is removed.** A Contact change now queues one Case sync per linked Case and nothing else. The branch existed only for the BCBA personal email, which decision 42 moved to the BCBA's own `email`. Closes O-44. Zeke: "If this was for the bcba, yes remove it". (Zeke) | 11/21 |
| 45 | **The BCBA date of birth (B5) is read as text and converted by the code.** Production `date_of_birth` exists on the BCBA, created 2026-11-21 as a single-line text property (confirmed by a read-only production read). Zeke: "Make the code transform the format into a date format that's correct for central reach. The field in hubspot is a single line text field". The BCBA mapper uses `readTextDate` (`src/lib/dates.mjs`). It accepts year-first ISO (with `-`, `/` or `.`), month-first M/D/YYYY (with `/`, `-` or `.`), month-name forms, and epoch milliseconds at midnight UTC, and sends `YYYY-MM-DD`. Two-digit years, impossible dates, future dates and years before 1900 end as `error`. Case dates and the BT/RBT `date_of_birth` stay on the strict `readDate`. Tests `[B5][1.4]` in `bcbaTextDateOfBirth.test.mjs`. O-10 stays open for the empty property (below). (Zeke) | 11/21 |
| 46 | **Phone: the code sends the 10 digits CentralReach stores and reads any US form** (amends the phone text of decision 43). Zeke: "I need the format that allows the phone number to send from hubspot to central reach and not error." Punctuation is ignored; a `1`, `+1` or `001` prefix is dropped; a trailing extension (`x123`, `ext 123`, `#123`) is dropped and not sent. Still `error`: fewer than 10 digits, extra digits with no US prefix or extension marker, other letters. (Zeke) | 11/21 |
| 47 | **A linked employee update sends HubSpot's primary email.** Zeke: "If an email is updated on an employee in hubspot that needs to update in in central reach. any field on the requirements matrix needs to be pushed from hubspot to central reach when updated". On a linked BCBA or BT/RBT update, a filled, well formed HubSpot primary email is sent; a blank one sends back the email CentralReach holds (it never blanks it); a badly formed one ends as `error` (decision 43). This replaces the old rule of row 1.10 (always send CentralReach's stored email), which was caution only: a changed email by API was never tested against CentralReach (O-11). If CentralReach refuses it, the run ends as `error` "CentralReach rejected the request". Closes O-45. Tests in `employeePrimaryEmailUpdate.test.mjs`. (Zeke) | 11/21 |
| 48 | **The BCBA date of birth (B5) is read from `dob`, not `date_of_birth`** (changes the source in decision 45; its text reading stays). Zeke: "Use dob, populate with the placeholder date, note we are pending confirmation from the client on how we will use dob OR date_of_birth". The production survey of 2026-11-21 (WAVE-2-LOG section 9): `date_of_birth` is blank on all 374 BCBAs; `dob` (single-line text) holds 214 values as M/D/YYYY, 1 in another format, 159 blank. `date_of_birth` is no longer requested for the BCBA; the BT/RBT keeps `date_of_birth`, unchanged. The placeholder rule of decision 23 is unchanged: a blank `dob` on a create sends `2000-01-01` and logs the placeholder warning; a blank `dob` on an update sends back the date CentralReach holds, and leaves the key out when the CentralReach read holds none (row 3.13); a filled `dob` that `readTextDate` reads is sent as `YYYY-MM-DD`; a filled `dob` it cannot read ends as `error` "Unreadable date: dob" with no CentralReach call; a `dob` key missing from the HubSpot answer is a failed read (row 4.18). The property name is one constant, `BCBA_DATE_OF_BIRTH_PROPERTY` in `src/mappings/employees/buildEmployeePayload.mjs`, so switching to `date_of_birth` is a one-line change. **Pending United Care's confirmation whether the BCBA date of birth lives in `dob` or `date_of_birth` (O-10).** `dob` must exist on the sandbox BCBA (O-38). Tests `[B5][1.4]` in `bcbaTextDateOfBirth.test.mjs`. (Zeke) | 11/21 |
| 49 | **The BCBA primary email (B4) is the BCBA record's own `email`, not `ucaba_email_address`.** Zeke: "We are not using ucaba_email_address. We are using this internal field value email for the bcba." `ucaba_email_address` is no longer requested or read. The rules already built stay: the format check; a filled email that fails it is `error` "Unreadable value: email" (decision 43); a linked update sends it when filled and well formed (decision 47); a blank one on an update sends back the email CentralReach holds; a blank one on a create is "Missing required field: email". The same `email` is also the source of Meta `138069` Personal Email (B9, decision 42), which is not changed; what 138069 should hold now is O-50. The constant is `BCBA_PRIMARY_EMAIL_PROPERTY` in `src/mappings/employees/buildEmployeePayload.mjs`. Closes O-49. Tests `[B4]` in `employeePrimaryEmailUpdate.test.mjs`, `f1UnreadableValues.test.mjs` and `stage4and5PropertyLists.test.mjs`. (Zeke) | 11/21 |
| 50 | **CentralReach Meta `138069` Personal Email reads `personal_email` on the BCBA (B9) and on the BT/RBT (new T9), not `email`.** Zeke: "For the personal email for both the BCBA and BT/RBT, use this field. field label 📝Personal Email (backup only, never emailed) internal name personal_email". The BCBA primary email stays on `email` (decision 49, unchanged; Zeke: "use the field Email internal name email on the BCBA"). Before this, only the BCBA sent `138069` (from `email`); the BT/RBT did not send it. CentralReach's metadata configuration lists `138069` as an Employee field of type `input`, so it applies to both employee types. Both mappers read `personal_email` with `readEmail`: trimmed and lower case; blank sends a blank and clears a value the integration wrote before; a filled value that fails the format check is `error` "Unreadable value: personal_email" with no CentralReach call (decision 43); a missing `personal_email` key is a failed read (row 4.18). `138069` is in the changed-field comparison of both types, and `node scripts/check-triggers.mjs --expected` lists `personal_email` under BCBA and BT/RBT. The property name is one constant, `EMPLOYEE_PERSONAL_EMAIL_PROPERTY` in `src/mappings/employees/buildEmployeePayload.mjs`; the CentralReach field constant is renamed `PERSONAL_EMAIL` (was `BCBA_EMAIL`). Closes O-50. Zeke also confirmed the sandbox properties of O-38: "Confirmed. These fields are created in sandbox." (closes O-38). Whether `personal_email` exists on both objects in the sandbox and in production is O-51. Tests `[B9][6.4]` and `[T9][6.4]` in `stage6BcbaPersonalEmail.test.mjs` and `f1UnreadableValues.test.mjs`. (Zeke) | 11/23 |
| 51 | **The HubSpot workflow re-enrollment triggers are set up and maintained by Zeke in HubSpot; the code no longer checks them.** Zeke: "I have the re-enrollment triggers already set up for each of the workflows. These are set up. I do not want to maintain the file. Any change occurrences will be handled in the workflow within HubSpot." `webhook-triggers.json` is deleted and `npm run check:triggers` no longer compares anything: `node scripts/check-triggers.mjs` (with or without `--expected`) prints the trigger properties the code maps, per object, and exits 0. It is a reference for when a mapping changes, no longer a gate (row 3.10, steps 7.2 and 9.6). Requirement BR18 is now owner-maintained in HubSpot, with the printed list as reference. Risk R-36: a mapped property that is not a trigger sends no webhook when it changes, and no code detects that; the hourly poller and the daily sweep still queue the record (see R-36). Tests in `checkTriggers.test.mjs` keep only the expected-list and writeback-exclusion checks. (Zeke) | 11/23 |

Create-only or unchanged on update, each on purpose, so the statement "every matrix field is pushed on update" has these exceptions. Zeke is asked to confirm them (O-47).

| Field | Why it is not pushed on update |
|---|---|
| C1 Case Contact Form | Sent on a create only (BR22). |
| C5 Case External System ID | Sent on a create only (row 3.14). |
| B2 / T2 employee External System ID | CentralReach returned 400 for a changed one (rule 5.4); the update sends the ID CentralReach holds. |
| B1 / T1 employee Contact Form | Sent on a create only. |
| B5 date-of-birth placeholder | The placeholder `2000-01-01` is sent on a create only (decision 23); a blank on an update sends back the date CentralReach holds. The BCBA source is `dob` (decision 48). |

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

### Checked on 2026-11-20, Stage P (read-only; run by Zeke from the orchestrator's scripts)

**CentralReach catalog (step P.6 b).** `GET /contacts/labels` and `GET /contacts/metadata-configuration`, saved as `cr-catalog-snapshot.json` (names and IDs only): 102 labels and 59 metadata fields.

| Finding | Effect on this plan |
|---|---|
| NM Employee `1157030`, VA Employee `1157031` and Active Case Count `147882` are in the catalog. Every label and metadata field ID in section 9 is in it, except the two in the next row. Field `137697` is a textarea. | Assumption A-2 is closed. |
| `1156744` Pending 97153 Services and `1156745` Starting 97153 Services are no longer in the catalog. `1156742` Pending 97151 Services and the parent `1156741` still are. | The three retired IDs stay in the "remove only" list: they are never sent, only left out of a post. The snapshot test (P.6 c) does not require a remove-only ID to be in the catalog. |

**Sandbox HubSpot (step P.7).** The script checked that the token belongs to portal `52311591` (account type SANDBOX) before any read. It returned counts, key names and property definitions only.

| Read | Result | Effect on this plan |
|---|---|---|
| (a) Case search on `enter_in_central_reach` (multi-checkbox; one of its options is `Yes`) | `EQ` "Yes", `IN` ["Yes"] and `CONTAINS_TOKEN` "Yes" are all accepted, and each returns 283 Cases. `HAS_PROPERTY` returns 292. | The equal totals do not show which operator finds a Case that holds `Yes` together with another option. Row 3.5 uses `CONTAINS_TOKEN`: a search that finds too many is harmless, because the worker gate checks each record again, and a search that finds too few would lose a record. A-14 stays open until a Case with two options ticked is searched. |
| (b) One Case GET that asked for blank properties and for a property that does not exist | A blank property comes back as a key with the value null (three properties). The property that does not exist is left out of the answer. | A-17 is closed. Row 4.18 can be built as written. |
| (b), same GET | `phone_number__second_` was also left out of the answer, so the sandbox Case object does not have it, or the token cannot read it. | With row 4.18, every sandbox Case would end as `error` while the property is missing. Zeke decided to keep it; the property was created in the sandbox the same day (decision 31). |
| (c) `n1_what_type_of_insurance` | Six stored values: `Medicaid FFS` (shown as "Medicaid FFS - NY"), `Medicaid FFS - NJ`, `Medicaid FFS - CO` (shown as "Medicaid - CO"), `Commercial Enrolled`, `Commercial OON`, `Unsure`. | A-10 named only three. The code picks the Medicaid physician pair only for `Medicaid FFS`, so a New Jersey or Colorado Medicaid Case gets no referring physician today (C31). Row 4.23 fixes it (decision 32). |
| (d) Properties that cannot be set on the record (read-only and calculated) | BCBA: `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home`, `employee_phone`, `gender`. BT/RBT: `date_of_birth`, `gender`, `street_home`, `location_city`, `location_home`, `state_home`, `postal_code_home`, `employee_phone`, `email_contact`, `phone_contact`. Not mirrors: BT/RBT `email`, `home_apt`, `location`, `first_name`, `last_name`; BCBA `gender_new`, `date_of_birth`, `ucaba_email_address`. | A-8 is answered: a test employee gets these values from its associated Contact (decision 21). Step 7.1 (b) lists them. A test BT/RBT whose Contact has no date of birth is created with the placeholder. |

**Local settings.** The HubSpot token in `local.settings.json` belonged to the retired portal `50850427` while `HUBSPOT_PORTAL_ID` said `52311591`. Zeke replaced it with the sandbox token the same day. Azure's settings are separate and are checked in step 7.3.

**Blank core field test (row 3.13), CR employee `5338681`.** Run by Zeke from the orchestrator's script on 2026-11-20. Four `PUT /contacts/employee/5338681`; only `addressLine2` was changed, every other field was sent back as read, and the record ended as it started.

| Step | Request | Result |
|---|---|---|
| 1 | PUT with the `addressLine2` key left out | 200. **The stored value was cleared.** The read showed it at once. |
| 2 | PUT with the value again | 200. Shown at once. |
| 3 | PUT with `addressLine2: null` | 200. **The stored value was cleared.** Shown at once. |
| 4 | PUT with the original value (restore) | 200. Restored. |

What this settles: the employee update replaces the core record. A core field that is left out is cleared exactly like one that is sent blank, so "leave it out" protects nothing. The only way to keep a value CentralReach holds is to send that value back. The read (`GET /contacts/employee/{id}`) returns all twelve core fields under `contact` with the names the update uses. Not tested: a required field such as the date of birth, and the client update (no test client is named yet).

### Read from HubSpot production on 2026-11-20 (read-only, decision 33)

Run by the orchestrator through the guarded script (GET and CRM search only; portal `50317927` checked first). Property definitions and record counts only; no record value was read.

| Read | Result | Effect on this plan |
|---|---|---|
| Every property the lane C lists request: 79 on Case, 35 on BCBA, 33 on BT/RBT | All exist except Case `phone_number__second_` and BCBA `date_of_birth`. None is archived. | `date_of_birth` on BCBA is O-10, known (since decision 48 the BCBA requests `dob` instead, and no longer `ucaba_email_address`, decision 49). **`phone_number__second_` does not exist in production**; it was created in the sandbox the same morning (decision 31). C9 is open again (O-20). `phone_number__second_` is dropped (decision 36). |
| Stored option values the mappers match | Every value the mappers match exists with the same spelling: Case `location`, `specific_home_location`, `case_status`, `staffing_status`, `initial_auth_tracks`, `allergies`, `phi_diagnosis`, `n1_what_type_of_insurance` (the same six values as the sandbox), `enter_in_central_reach`; BCBA `assign_states`, `lba_licensure__ny`, `ny_insurance_labels`, `work_status`, `cr_billing_hold_label`, `gender_new`; BT/RBT `bt_rbt_type`. BT/RBT `gender` stores `male` / `female` in lower case; the mapper compares without case. | The assumption "production option values equal the guide's" holds for these properties. Step 9.6 no longer needs to re-check them. |
| Employee `location` options (BCBA and BT/RBT) | `New York`, `New Jersey`, `Colorado`, `New Mexico`, `Virginia`. 10 BCBA records hold New Mexico or Virginia; no BT/RBT record does. | The stored values O-6 waited for exist, and the state is in use. BL3 and TL2 can be built on Zeke's word. |
| BT/RBT `bt_rbt_type` options | `RBT`, `BT`, `BT to RBT`. Counts: BT 1,458; RBT 76; `BT to RBT` 1 (not linked); no type 4,630, of which 17 have Entered in CentralReach = Yes and none is linked. | The guide gives no rule for `BT to RBT` or for a blank type. Decision 35: for either, no role label is managed (none added, none removed). Built in lane C. |
| Other options seen | `lba_licensure__ny` also has `In Process` (no label, like `No`). `assign_states` also has `Assign NY`. `phi_diagnosis` also has `No`, `Unsure`, `Other`, `Yes- Down's Syndrome`. `ny_insurance_labels` has `Aetna-NY`, `Cigna-NY`, `Carelon-NY` (BL6, not built). | No change. |
| Linked records | 8 BT/RBT hold an `employee_id` (2 of them have no Work State); no BCBA does. | Hard stop 5 said six; the count is eight. Checked in step 9.4. |

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
- `blocked` and `noop` are no longer written (`noop` since row 3.7).
- A status HubSpot already shows, with the same reason, is not written again (2026-11-20, A-R2 and B-R4). The daily sweep still re-checks the record.
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

- **Create.** Look the client up by the Case record ID with the read-only call (`GET /contacts/client/byExternalSystemId`). Not found (404): create, sending the Case record ID as the External System ID and the contact form. Found: this Case's own client; save the link and update it by its CR ID. An answer that is not 200 or 404: stop and retry later, never create. A 200 with no readable CR ID is an `error`, never a create.
- **The contact form is sent on a create only; an update never sends `ContactForm`.** **The External System ID is sent on a create, and on an update only when CentralReach is known to hold the same value**: the lookup in the same call found the client under that ID, or the worker passes `externalSystemIdHeld: true` because its linked-Case lookup found the same CR ID. Otherwise an update leaves it out. The client read does not show what CR holds, and a left-out field may be cleared by the update (L-R2; O-35).
- **Linked Case.** Before an update that would write to CentralReach, look up the client by this Case's record ID. Found under a different CR ID than HubSpot holds: no CR write, `error`. Found under the same CR ID, or not found: update. An unclear answer: stop and retry later.
- **A CR ID from HubSpot must be digits only** (Case `client_id_number`; employee `employee_id`). Anything else is an `error` with no CR call (row 3.16). A CR ID typed by hand is otherwise trusted (decision 19).
- **Required fields.** First name, last name and date of birth are checked before a create; first and last name before an update. There is no date-of-birth placeholder for clients.

### 5.6 Labels

Built in rows P.3 and L.1 to L.4. These rules rest on the label test of 2026-11-20 (section 4).

- **The mapper returns two lists.** `requiredLabelIds`: the labels the record must hold now. `managedLabelIds`: every label the integration maps for that kind of record, whether required now or not.
- **The set to post** is the labels CR holds now, minus the managed labels, plus the required labels. So a managed label that is no longer required is removed, and a label staff added by hand is kept.
- **Never an empty list.** An empty list clears every label on the contact. The base labels are always required, so the set is never empty; the sender also refuses to post an empty set.
- **No POST when nothing would change.** If the set to post equals what CR holds, post nothing.
- **Only known IDs are sent.** Every ID the integration adds must be in the fixed list of sendable labels (row P.3). Every ID in the set to post, the integration's and the ones CR's read returned, must be in CR's live label catalog. If one is not, nothing is posted. An entry of the required or managed list that is not a positive whole number, or not in the sendable list, is `CR_LABEL_NOT_SENDABLE` before any call (L-R3).
- **One label POST per run.** A POST that fails (a timeout or a 5xx) is not retried in the same run. The error carries `labelPost`, and the worker saves it as `lastLabelPost` before the run ends, so the 150-second window applies to the retry (L-R4).
- **A failed label read makes no POST.** A read that fails is a temporary failure. A read that answers in a shape the code cannot read is permanent: `error`, no retry (Stage 2 decision 4). An empty read for a contact this run did not create is treated as a failed read, not as "no labels".
- **A POST is confirmed by reading it back, and a read can lag by about two minutes.** After a POST the posted set and the time are saved in the link record. For 150 seconds after a POST the integration makes no new label POST for that contact; a run in that window only reads and compares, and the sender reports `skip_window`. A set that the read does not show is retried on the normal schedule and never posted again just because the read still shows the old set.
- **One body shape:** `{ "labels": [ { "labelId": N } ] }`. A 400 is a permanent failure.

Which labels are managed and which are base labels is listed per entity in section 9.

### 5.7 Dates

- A filled date that cannot be read as a date is an `error`. It is never treated as blank.
- Employee date of birth: blank on a create sends the placeholder `2000-01-01` and logs a warning (decision 23); blank on an update sends back the date CentralReach holds (row 3.13); a date-of-birth property that is missing from the HubSpot answer (the property does not exist in the portal) is an `error`. The BT/RBT reads `date_of_birth`; the BCBA reads `dob` (decision 48, pending United Care, O-10).
- Client date of birth: blank on a create is an `error`; blank on an update leaves the field out.
- A date sent to a CR metadata text field is written as `MM/DD/YYYY`, as the code does today.

### 5.7a Phone, email, state and gender (decision 43)

- A filled phone, email, state or gender that cannot be converted is an `error`, like an unreadable date. It is never treated as blank and never sent as null. The reason is "Unreadable value: <property>" (the property name only), the code is `UNREADABLE_VALUE`, and the run stops before any CR write, on a create and on an update. The link record is not touched.
- Blank handling is unchanged (rule 5.8, row 3.13).
- Phone: CentralReach stores 10 digits, so the code sends 10 digits and reads any US form (decision 46): punctuation is ignored; a `1`, `+1` or `001` prefix is dropped; a trailing extension (`x123`, `ext 123`, `#123`) is dropped and not sent. Fewer than 10 digits, extra digits with no US prefix or extension marker, and other letters are `error`. Email: must pass the format check, on the employee and the Case side. State: the 50 states plus DC, by code or name; territories are not in the list (O-46). Gender: Case male or female only; employee also `m` or `f`.
- The readers are shared: `readPhone`, `readEmail`, `readStateCode`, `readGender` in `src/lib/fieldFormats.mjs`.

### 5.8 A failed read is never a clear

- A read that fails or is refused (401, 403), or a HubSpot answer that is missing a property the worker asked for (row 4.18), never becomes a blank sent to CentralReach. The run stops with no CR write.
- **Metadata.** A HubSpot value that is blank sends a clear only for a field whose saved copy holds a value, that is, a value the integration wrote before. A record with no saved copy gets no clears (Zeke, 2026-11-20, OPEN-ITEMS row 23 e).
- **A run that failed halfway.** `inProgressFieldHashes` is saved before the first CentralReach write, and counts as "written before" while the last run is not clean, so a clear is not lost (B-R1). An employee read with no `contact` object is `CR_EMPLOYEE_READ_FAILED`, with no update (B-R2).
- **An input that could not be read** (staff names, the BCBA's Contact) must not turn into a clear. For a Case the mapper leaves the field's key out. For an employee that is not enough, because the known-fields list puts the key back as blank: the field ID must be named in `omitFieldIds`.
- **Core fields** (name, gender, date of birth, phones, address, guardian). Tested on 2026-11-20 (section 4): an employee update clears a core field that is sent blank and also one that is left out. So on an employee update, a core field that is blank in HubSpot is sent blank only when the saved copy shows the integration wrote a value there before; otherwise the request carries the value CentralReach holds, taken from the read made in the same run (row 3.13). The client update is not tested and is unchanged for now (O-35).

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
| 1.3 | **Required fields are checked before CentralReach is called** (`[GER-REQ]`). Employee create: first name, last name, primary email, date of birth rule (5.7). Client create: first name, last name, date of birth. Updates: first and last name. A value of only spaces is blank. | Employee names come from `first_name` and `last_name` (remove the split of `bcba_name` / `bt_name`). BCBA primary email comes from the BCBA's own `email` (decision 49; it was `ucaba_email_address`, which replaced `work_email`); BT/RBT from `email`. Validators take a `linked` flag and return the missing field names. A blank or malformed email on a create is `error`. The workflow writes `error` "Missing required field: <name>" and makes no CR call. | One test per required field, per entity, for create. Names for update. A filled `first_name` with a blank `last_name` is an error naming the last name. The reason sentence contains the field name and no value. |
| 1.4 | **Dates** (rule 5.7). | One shared date reader in `src/lib/dates.mjs` used by both employee and client mappers: returns the date, "blank", or "unreadable". An update leaves the date of birth out when blank. The BCBA date of birth is read from `dob` (decision 48; `BCBA_DATE_OF_BIRTH_PROPERTY`, pending United Care, O-10), a single-line text property in production, so the BCBA mapper uses `readTextDate` in the same file (decision 45): year-first ISO, month-first M/D/YYYY, month-name forms and epoch milliseconds are read and `YYYY-MM-DD` is sent; two-digit years, impossible dates, future dates and years before 1900 are `error`. Case dates and the BT/RBT date of birth stay on the strict reader. A date-of-birth key (`date_of_birth` on the BT/RBT, `dob` on the BCBA) missing from the HubSpot `properties` answer is an `error`. | Blank on create sends the placeholder. Blank on update: the date CentralReach holds is sent back (row 3.13), or the request has no date key when the read holds none. Unreadable → `error`. Missing property → `error`. Client blank on create → `error`. |
| 1.5 | **Temporary External System ID** (`[G17]`, decision 3). | One function in `buildEmployeePayload.mjs` returns the ID to send on a create: `workday_id`, or the record ID when it is blank. Remove the "workday_id is blank" validation error. | Blank `workday_id` → the create sends the record ID. Filled → the create sends the Workday ID. BT/RBT and BCBA. |
| 1.6 | **Read-only lookup before an employee create** (rule 5.3). | New `findEmployeeByExternalSystemId(id)` in `centralReachClient.mjs`: `GET /contacts/employee/byExternalSystemId?ExternalSystemId={id}`. 200 → found, with the CR ID read from `contact.contactId`. 404 → not found. Anything else is thrown and never leads to a create. The update call `PUT /contacts/employee/byExternalSystemId` is no longer used as a lookup; remove it. The workflow follows the tree in 5.3. | One test per branch of the tree: unclear answer stops; found by record ID links; found by both with different IDs is `error`; found by Workday ID only is `waiting` or `error` (1.7); not found creates. No test sees a PUT used as a lookup. |
| 1.7 | **One CR employee, one HubSpot record** (decisions 4 and 5). | New search in `hubspotClient.mjs`: find BCBA and BT/RBT records whose `employee_id` equals a CR ID, leaving out the current record. Used when the lookup finds an employee by Workday ID only. A hit → `error` "Another HubSpot record is already linked…". No hit → `waiting` "A CentralReach employee already holds this Workday ID…". Neither writes `employee_id` nor calls CR again. | A BCBA and a BT/RBT with one Workday ID: the first creates, the second is `error`, and the first one's CR employee gets no write. A Workday ID that only CR knows → `waiting`, `employee_id` stays blank, no CR write. |
| 1.8 | **Two records cannot create at the same moment.** | A second Cosmos lease on the External System ID to be sent (partition `create-lock:employee`) covers lookup, create and saving the CR ID. Not acquired → the run ends as "in progress" (thrown today; rescheduled in Stage 2). | Two runs with one Workday ID started together: exactly one create. |
| 1.9 | **Linked employee ID check** (rule 5.4). | Add the two checklist properties to the properties read. Compare IDs after the CR read and before the "nothing changed" check. The mismatch row makes no CR write. Status and reason per the table, written even when no mapped field changed. | One test per table row, for BT/RBT and for BCBA. The mismatch row: zero CR writes. Ticking the checklist with no other change still updates the status. |
| 1.10 | **Stored email copy reads the right place.** **Changed by decision 47.** A linked update sends HubSpot's primary email when it is filled and well formed; a blank one sends back the email CentralReach holds, never a blank; a badly formed one is `error`. (The old rule, always send CentralReach's email, was caution only and is gone; CentralReach's update error names this field.) | `buildEmployeePayloadForContactId` reads the email from the same places as the External System ID reader: the top level, `contact`, `employee` and `result`. | Each response shape gives the stored email. |
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

- **built 1** to **built 5**: built in that stage and in the code today. Stage 3 includes the label sender rows L.1 to L.4. Stages 3 to 5 are wave 1, merged 2026-11-20.
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
| BR3 | A person who is already in CR is not created again. Before a create the integration looks CR up by the HubSpot record ID and, when filled, by `workday_id`. Found by record ID → link. Found by Workday ID only and another HubSpot record holds that CR employee → `error`. Found by Workday ID only and no HubSpot record holds it → `waiting`, no link, no write. An unclear answer never leads to a create. | [G17] 11/18 | built 1; the wait before a second create built 3 (3.15) | — |
| BR4 | Existing CR employees are not created, linked or updated for now. A record gate (one app setting naming a HubSpot checkbox) lets a record sync only when the checkbox is true. In production the checkbox is the one behind the segment Zeke picks. | [G17] 11/17, 11/18; decision 20 | gate built 1; poller and sweep side built 3 (3.4) | The production segment and its checkbox (O-9) |
| BR5 | Push changes to the linked CR record whenever a listed field or label changes, for Case, BCBA and BT/RBT. Entered in CentralReach may be Yes, No or blank. All pipelines and stages, except the Case exclusions. | [GBR] Requirement 2 | worker built 1 and 2; detection built 3; mapper rows built 4 and 5; wiring built (4.14, 4.16, 4.18, 6.4) | — |
| BR6 | Case exclusions: skip a Case in stage `1383894301`, `1383894303`, `1383894302` or `1332962645`, for create and update, whatever its status or CR ID. | [GBR] R2; [C14B] | built 1 | — |
| BR7 | Skip `test_record` = true in normal processing, on Case, BCBA, BT/RBT and Contact. | [G11] 11/06; entity tables | built 1 for the three synced objects; Contact built 6 (6.2) | — |
| BR8 | ID mismatch. Employee: CR's External System ID and `workday_id` both filled and different → no update, `error`. A blank on either side is not a mismatch. Case: look the client up by the Case record ID; found under a different CR ID than HubSpot holds → `error`, no update. | [GBR] R2 11/17; [G17] | built 1 | — |
| BR9 | Status is `success`, `error` or `waiting`. `waiting` is never retried and never dead-lettered. `blocked` is retired. | [G17] | built 1, 2 and 3; `noop` is no longer written (3.7) | — |
| BR10 | Temporary-ID rules: `waiting` right after a temporary-ID create; updates continue while `waiting`; an update always sends the External System ID CR holds; the record is checked again when `workday_id` or the checklist changes, by the hourly poller and by the daily sweep; the five outcomes of the check (rule 5.4). | [G17] 11/18 | check built 1; poller and sweep built 3 (3.2, 3.5) | HubSpot trigger on `workday_id` and the checklist (step 7.2) |
| BR11 | One Workday ID per HubSpot employee record. | [G17] | built 1 | — |
| BR12 | The integration never deactivates anyone in CR. Linked BT/RBT in `Yes - Generic` and `No- Made Inactive` keep getting field updates. | [C14B]; [GER-BT] | built 1 (no deactivation code exists) | — |
| BR13 | Write back to HubSpot: the CR ID, the CR link, and `updated_by_integration`, `integration_last_write`, `last_sync_at`, `last_sync_status`, `last_sync_error`, `last_sync_hash`. Nothing else. Keep the written properties out of HubSpot workflow triggers. | entity tables; [G10C] item 3; [C28] | built 1; trigger check built 3 (3.10) | — |
| BR14 | Design: webhook first; an hourly checkpointed poller as a safety check; a daily sweep of linked records; durable state; retries at 1 min, 5 min, 15 min, 1 h, 4 h, then dead-letter; a record with no change writes nothing. | Architecture tab 11/17 | state and retries built 2; poller, sweep and no-op built 3 | — |
| BR15 | Failures and monitoring: one HubSpot report per object on `last_sync_status` = `error`; a view of `waiting` records; one Azure email alert when a dead-letter queue is not empty; a HubSpot report of records the integration wrote in the last 24 hours, from `integration_last_write`. | Architecture tab 11/17; [G11] Monitoring | setup (7.2, 7.3, 9.6); run summary line built (3.20) for the Case, BCBA, BT/RBT and fan-out runs | Zeke; Danny offered the 24-hour report |
| BR16 | A failed or refused read never becomes a blank sent to CR (rule 5.8). | Architecture tab, "Minimum changes" | built 1 and 2 for record reads; hash rules built 3 (3.13, 3.18); built for the Case and the employees: 4.14, 4.18 (6.4 now reads only the BCBA record). (4.16 no longer has a separate read.) | — |
| BR17 | Compare the complete mapped state, with blanks, metadata, labels and relationships. Save the synced state only after the writes succeed. Staffing is compared by record ID and role, not by name. | Architecture tab | built 2; staffing by role: mapper 4, worker side built (4.14) | — |
| BR18 | Values that change with no edit must still be caught: `case_status`, `staffing_status`, the staff name rollups and association changes. | [G11]; [G04] | built 3 (3.2, 3.5, 3.9); HubSpot re-enrollment triggers are owner-maintained in HubSpot (decision 51); `node scripts/check-triggers.mjs` prints the reference list (3.10) | — |
| BR19 | Labels. [G19] wins over the older label lists. The guide's replace-and-remove rules apply as written, because the label POST replaces the whole set (test of 11/20). Every label the integration maps is managed; the base labels are always sent; labels the integration does not map are kept (rule 5.6). | [G19]; [G07]; [G08]; decisions 13, 14 | managed sender built 3 (P.3, L.1 to L.4); managed lists built 4 and 5 | — |
| BR20 | Sandbox first, with test records only (`sandbox_test_field` = true, `test_record` blank), one new Case, BT/RBT and BCBA per round, created with their associations. | [G20]; [G17]; decision 21 | Stages 7 and 8 | Zeke |
| BR21 | Logs and status reasons name fields, never values. No child's full name in any message. | [G02] | built 1 and 2 | — |
| BR22 | A client's contact form is sent on a create only. Its External System ID is sent on a create, and on an update only when CentralReach is known to hold the same value (rule 5.5; L-R2). | [GER-REQ] intro; decision 28 | built 3 (3.14) | — |

### 9.2 Case → CR client

Fields. "Meta" = CR client metadata field ID.

| ID | Requirement | Guide source | HubSpot source | CR target | Status | Waits on |
|---|---|---|---|---|---|---|
| C1 | Contact form | [GER-REQ] | App setting `CR_CLIENT_CONTACT_FORM`, else "Public Client Intake Form" | `ContactForm`, create only; never on an update (BR22) | built (old); create only built 3 (3.14) | — |
| C2 | Legal name | [GER-REQ]; [GER-CASE] | `phi_first_name__cloned_`, `phi_last_name` (never `dealname`) | `FirstName`, `LastName` | built 1 | — |
| C3 | Date of birth. Blank on a create is an `error`; no placeholder. | [GER-REQ] | `phi_date_of_birth` | `DateOfBirth` | built 1 | — |
| C4 | Gender | [GER-CASE] | `phi_gender` (`male`, `female`) | `Gender` | built (old) | Unreadable value ends as `error` (decision 43). |
| C5 | External System ID | [GER-REQ] | Case record ID | `ExternalSystemId` on a create; on an update only when CR is known to hold the same value (BR22) | built (old); update rule built 3 (3.14) | — |
| C6 | Primary email, when valid | [GER-CASE] | `email` (Case sync property from the Guardian Contact) | `PrimaryEmail` | built (old) | Unreadable value ends as `error` (decision 43). |
| C7 | Guardian name | [GER-CASE]; [G19] | `guardian_first_name`, `guardian_last_name` (Case sync properties; they hold the first Parent/Guardian Contact, decision 24) | `GuardianFirstName`, `GuardianLastName` | built (old) | — |
| C8 | Mailing address and phone | [GER-CASE] | `street_address`, `home_apt`, `location_city`, `stateregion`, `postal_code`, `phone` | Address line 1 and 2, city, state, zip, cell phone | built 4 (4.1) | Unreadable value ends as `error` (decision 43). Phone: US forms read, 10 digits sent (decision 46). |
| C9 | Second phone | not a [GER-CASE] row; [G20] sets it on test records | `phone_number__second_` | `PhoneHome` | not built, by Zeke's decision 36 | Dropped 2026-11-20 (decision 36): the property does not exist in production. `PhoneHome` is left out of the payload. |
| C10 | Care Coordinator name and email | [GER-CASE] | `care_coordinator_name` (Case property; decision 39) | Meta `138851` (one field) | built (4.16, decision 39): the worker and mapper read `care_coordinator_name`. Email: still open (O-17). | a target for the email (O-17); source `care_coordinator_email` |
| C11 | IA BCBA and Reassessment BCBA | [GER-CASE]; [G04] | Case → BCBA associations IA (prod 86, sandbox 223) and RE (145 / 229), then the staff record's `first_name` + `last_name` | Meta `131314` (IA), `144602` (RE) | built 4 (mapper) and 4.14 (worker side) | — |
| C12 | Supervising BCBA | [GER-CASE] | `ongoing_central_reach_provider_supplier` | Meta `131308` | built 4 (4.15) as the typed text | How "match to the CR provider by name" is done (O-16) |
| C13 | Grad Permit Holder | [GER-CASE]; [G10A] | Supervising association (82 / 247) with `lba_licensure__ny` = Grad Permit | Meta `136052` | open | United Care: how the marker is carried (O-15) |
| C14 | Primary BT 1 and 2 names | [GER-CASE]; [G04] | Case → BT/RBT associations Primary BT 1 (76 / 238) and 2 (143 / 240), then `first_name` + `last_name` | Meta `131313`, `138092` | built 4 (mapper) and 4.14 (worker side) | — |
| C15 | Outgoing BT 1 and 2 stay active until the removal date passes | [GER-CASE]; [G04] | Associations 131 / 166 (sandbox 244 / 236) | none recorded | open | United Care: the CR target and the removal-date property (O-15) |
| C16 | Association read rules. Never sync: unlabeled, Potential and Previous IA (production 20, 64, 153, 80, 74, 164, 286; sandbox 164, 187, 251, 249, 242, 218, 235). Undecided: Outgoing Supervising, SUB, On Leave (production 135, 234, 236; sandbox 253, 217, 233). A role is matched by target object and type ID together. | [GER-CASE]; [G04]; [SCURRENT] | v4 associations | — | exclusions built 2 (portal table in `src/lib/config.mjs`); matching a role by target object and type ID together to build (4.14); the undecided three are open | United Care (O-15) |
| C17 | Work Schedule #1 and #2 | [GER-CASE] | `work_schedule_details`, `btrbt_work_schedule_2_details` | Meta `132304`, `138093` | built 4 (4.4) | — |
| C18 | Work schedule Location #2 variants | [GER-CASE] | `work_schedule_1_details__for_location_2_other`, `work_schedule_2_details__for_location_2_other` | **no CR field exists** (the catalog has only Work Schedule #1 and #2) | open | Decided when Stage 4 is built (O-14); a missing field is created by script on Zeke's go-ahead (decision 27) |
| C19 | Client Availability: the text and the weekly hours | [GER-CASE] | `finalized_client_service_hours_post_assessment`, `client_service_hours_total` | Meta `126209` | built 4 (4.5) | Text format assumed (O-28) |
| C20 | Total Assigned Hours (97153) | [GER-CASE] | `hours_bt_work_schedule_1` + `bt_rbt_2_work_schedule`, summed by the code, a blank as 0 (decision 41, replacing decision 40; never `total_hours_btrbt_12` or `total_hours_bt1bt2_work_schedule`) | Meta `134331` | built 4 (4.6); the source changed (decisions 40, 41) | Both blank sends blank; a filled non-number is an `error` ("Unreadable value", not a date reason; decision 43). United Care to confirm when HubSpot's total hours property should be used instead (O-43). |
| C21 | Per-BT hours | [GER-CASE] "as applicable" | `hours_bt_work_schedule_1`, `hours_bt_work_schedule_2` | none recorded | open | Zeke / Sara: is a CR field wanted (O-18) |
| C22 | Approved Auth Hours | [GER-CASE] | `initial_auth_tracks`: Prior Authorization Required → `n97153_approved_assessment_hours_auth_req`; No Prior Authorization Required → `ia_hours_from_the_ia` | Meta `132431` | built 4 (4.7) | — |
| C23 | Auth Period | [GER-CASE] | `ongoing_auth_period_start_date`, `ongoing_autrh_period_end_date` (the spelling is real); never the `_f` copies | Meta `134672` | built 4 (4.8) | Text format assumed (O-28) |
| C24 | Service Location Address | [GER-CASE] | `specific_home_location`: Child's House or More Than One Location → `full_home_address`; Other Location → `service__street_address`, `service__apt`, `service__city`, `service__postal_code` | Meta `137697` (a textarea field) | built 4 (4.13) | — |
| C25 | Service Location Address 2 | [GER-CASE]; section 3; decision 26 | `service_address__other`, when `specific_home_location` is More Than One Location | Meta `138091` | built 4 (4.22) | How it shows on the CR screen is checked in Stage 8 |
| C26 | Known Allergies | [GER-CASE]; [GAPP] | `allergies` (stores `Confirmed` / `Denial`), `allergies__yes__explain` | Meta `126214` | built 4 (4.9) | Text format assumed (O-28) |
| C27 | Comorbid and Maladaptive, main fields only | [GER-CASE]; [C14B] | `does_your_child_have_any_other_comorbid_diagnoses_`, `maladaptive_behaviors__parentguardian` (stored option values) | Meta `132303`, `126207` | built 4 (4.2) | — |
| C28 | Severity; Important information - Parent | [GER-CASE] | `severity_level_clinical`; `important_information` | Meta `133826`; `138378` | severity built (old); parent notes built 4 (4.3) | — |
| C29 | Primary insurance and ID | [GER-CASE] | `insurance_primary`, or `insurance_1__other__summary` when Other; `insurance_id_1`. A blank carrier sends blank, whatever the Other summary holds (Zeke, 2026-11-20). | Meta `126210`; `131316` | built (old) | — |
| C30 | Secondary insurance and ID | [GER-CASE] | `insurance_2`, or `insurance_2__other__summary` when Other; `insurance_id_2`. Never `n2_what_type_of_insurance`. A blank carrier sends blank, whatever the Other summary holds (Zeke, 2026-11-20). | Meta `144600`; `144601` | built 4 (4.10) | — |
| C31 | Referring physician and NPI, the Medicaid or the commercial pair | [GER-CASE] "by insurance type"; decision 32 | `physician_name` + `npi_number`, or `physician_name__commercial` + `npi_number__commercial`, chosen by `n1_what_type_of_insurance` | Meta `131151` | built 4 (4.23) | `Unsure` and blank get no pair; the guide gives no rule for them (O-19) |
| C32 | Referring Physician Medicaid ID | [GER-CASE] | `referring_provider_medicaid_id` | Meta `141233` | built 4 (4.11) | — |
| C33 | Diagnosis | [GER-CASE]; [GAPP] | `phi_diagnosis` (stores `Yes` for the option shown as "Yes-F84.0") + `diagnosis_other` | Meta `144793` | built 4 (4.11) | Text format assumed (O-28) |
| C34 | ASD dates, both, each to its own field | [GER-CASE] | `most_recent_asd_diagnosis_date_1`; `most_recent_asd_diagnosis_date_medicaid` | Meta `131195`; `138701` | built 4 (4.12) | — |
| C35 | Policyholder name and DOB | [GER-CASE] | `policy_holder_name`; `phi__policy_holder_dob` | Meta `138090`; `137667` | built (old) | — |
| C36 | Referral Source | [GER-CASE] | `referral_source` | Meta `126222` | built 4 (4.11) | — |
| C37 | HubSpot link to the Case record | mirrors the employee rule in [GER-BCBA] and [GER-BT] | Case record ID | Meta `138702` | built (old) | — |
| C38 | `insurance_id_3`, `insurance_id_4` | [GER-CASE] exclusions | — | none | open. Neither is requested from HubSpot since 4.17. | Zeke / Sara (O-19) |

Client labels. Every ID is in the saved catalog of 2026-11-18.

| ID | Label rule | Guide source | HubSpot source | CR label | Group | Status |
|---|---|---|---|---|---|---|
| CL1 | State | [GER-CASE]; [G07B] | `location` | Colorado → CO Client `1132648`; New Jersey → NJ Client `1132647`; New York → NY Client `1082499`. Kept when the Case goes Active ↔ Inactive. | managed | built 4 (4.19), NJ and the managed group included |
| CL2 | Service location | [GER-CASE]; [G07B] | `specific_home_location` is Child's House or More Than One Location | Home `1052656` | managed | built 4 (4.20). School and Clinic are deferred by the guide. |
| CL3 | Active / Inactive | [GER-CASE]; [G07] | `case_status`: `Warm` → Active Client `1125427`; `Cold` → In-Active Client `1121488` | one of the two | managed | built 4 (4.21) |
| CL4 | Staffing | [G19] wins over [GER-CASE] and [G07] | `staffing_status` | Only three: 97151 Services `1156743`, Staffed 97153 `1156746`, X 97153 `1156747`. Any other value, or blank: no staffing label. Hot, Warm, Cold and Processing Leads stay in HubSpot. | managed. The managed list also holds the three retired IDs (Pending 97151 `1156742`, Pending 97153 `1156744`, Starting 97153 `1156745`), so they are removed if present. They are never sent. | built 4 (4.21) |
| CL5 | Funding source (payor tags) | [G19] | — | — | — | **excluded**: "Do not send the client funding-source labels" |
| CL6 | All Clients `1052619` | not in the guide; kept by Zeke 11/20 | every client | All Clients | base | built (old) |

Associations and exclusions: BR6, BR7, C16. The integration writes no HubSpot property outside BR13. The 34 archived "Prior" fields are not mapped. Sensitive Case properties are read with the sensitive scope.

### 9.3 BCBA → CR employee

| ID | Requirement | Guide source | HubSpot source | CR target | Status | Waits on |
|---|---|---|---|---|---|---|
| B1 | Contact form | [GER-REQ]; decision 17 | set by the integration | `Admin`, for every state | built (old) | — |
| B2 | External System ID | [GER-BCBA]; [G17] | `workday_id`, else the record ID | `ExternalSystemId` (create only; an update sends what CR holds) | built 1 | Workday ID format, a note only (O-8) |
| B3 | Legal name | [GER-REQ] | `first_name`, `last_name` | first and last name | built 1 | — |
| B4 | Primary email | [GER-REQ]; [GER-BCBA] | The BCBA record's own `email` (decision 49; was `ucaba_email_address`) | `PrimaryEmail` on create; an update sends HubSpot's email when filled and valid, CR's own when blank (decision 47) | built 1; the update rule changed (decision 47); the source changed (decision 49) | Whether CR accepts a changed email (O-11) Unreadable value ends as `error` (decision 43). B9 no longer reads `email` (decision 50). 3 production BCBA emails are badly formed (O-48). |
| B5 | Date of birth; blank on a create sends the placeholder 2000-01-01; an update never sends it; a missing property is an `error` | [GER-REQ]; decision 23 | `dob` (decision 48; was `date_of_birth`) | date of birth | built 1; the source changed (decision 48) | Text property read by `readTextDate` (decision 45); production `dob` holds 214 M/D/YYYY values, `date_of_birth` is blank on all 374 BCBAs. Pending United Care: `dob` or `date_of_birth` (O-10). |
| B6 | Gender | [GER-BCBA] | `gender_new` (Male / Female); never the archived `gender` | gender | built 5 (5.1) | Unreadable value ends as `error` (decision 43). |
| B7 | Mailing address and phone | [GER-BCBA] | `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home`, `employee_phone` (read-only Contact mirrors) | address line 1 and 2, city, state, zip, cell phone | built 5 (5.2) | Unreadable value ends as `error` (decision 43). Phone: US forms read, 10 digits sent (decision 46). |
| B8 | Medicaid ID NY / NJ / CO | [GER-BCBA] | `medicaid_id__ny`, `medicaid_id__nj`, `medicaid_id__co` | Meta `126216`, `138112`, `138113` | built (old) | — |
| B9 | Personal email | [GER-BCBA]; [GER-CONTACT] | The BCBA record's own `personal_email` (decision 50; was `email`, decision 42) | Meta `138069` | built 6 (6.4); the source changed (decision 50) | Unreadable value ends as `error` (decision 43). `personal_email` must exist on the BCBA in the sandbox and in production (O-51). |
| B10 | Salaried | [GER-BCBA]; [G05] | `work_status` = `Salaried` | label Salaried `1132653` | built 5 (5.7) | Label or profile field? (O-27), answered before 9.8 step (1) |
| B11 | Care Coordinator | [GER-BCBA] | `hubspot_owner_id` | none recorded | open | Zeke: the CR employee field (O-17) |
| B12 | HubSpot record link | [GER-BCBA] 11/16 | record ID | Meta `138703` | built (old) | — |
| B13 | Excluded field | [GER-BCBA] exclusions | `credentialed_insurances__ny` | Meta `134444` | built 5 (5.3): no longer read or sent | — |

BCBA labels.

| ID | Label rule | Guide source | HubSpot source | CR label | Group | Status |
|---|---|---|---|---|---|---|
| BL1 | BCBA header | [GER-BCBA]; [G08] | every BCBA | BCBA `1130668` | base | built (old) |
| BL2 | State, one per Work State | [GER-BCBA]; [G19] | `location` (multi-checkbox) | CO Employee `1107687`, NJ Employee `1107686`, NY Employee `1132655` | managed | built 5 (5.4) |
| BL3 | New Mexico, Virginia | [G19] | no HubSpot value yet; "Do not invent a property or a stored value" | NM Employee `1157030`, VA Employee `1157031` | not managed until mapped | constants built 5 (5.4); the mapping is **held** (O-6) |
| BL4 | Assignment and licensure | [GER-BCBA]; [G08] | `assign_states` contains `Assign CO` / `Assign NJ`; `lba_licensure__ny` = `Yes` / `Grad Permit` (`No` = "Will Apply": no label) | BCBA Colorado `1124246`; BCBA LBA NJ `1124245`; BCBA LBA NY `1052629`; GRAD Student- LBA NY `1092164` | managed | built 5 (5.5) |
| BL5 | NY Medicaid credential | [GER-BCBA]; [G08] | `ny_insurance_labels` contains `MCD FFS-NY` | NY Medicaid `1107647` | managed | built 5 (5.6) |
| BL6 | Aetna, Cigna, Carelon, CO Medicaid, NJ credentials | [GER-BCBA]; [G08] | `ny_insurance_labels`, `co_insurance_labels`, `nj_insurance_labels` | The guide records the labels Aetna `1107649`, Cigna `1107650`, Carelon `1132654`, CO Medicaid `1107651`, and none for NJ. It does not document which HubSpot option maps to which label. | not managed | **not documented in the guide; not built** (decision 25) |
| BL7 | Billing Hold | [GER-BCBA]; [G08] | `cr_billing_hold_label` = `Yes`; removed when it goes back to `No` | Billing Hold Medicaid Affiliation `1103437` | managed | built 5 (5.8) |
| BL8 | All Employees `1052618`, Clinical `1052643` | not in the guide; kept by Zeke 11/20 | every BCBA | — | base | built (old) |

Associations: Grad Permit Supervisor / Supervisee (prod 151 / 150, sandbox 227 / 226) are recorded for C13 only; nothing reads them until O-15 is answered.

### 9.4 BT/RBT → CR employee

| ID | Requirement | Guide source | HubSpot source | CR target | Status | Waits on |
|---|---|---|---|---|---|---|
| T1 | Contact form | [GER-REQ]; decision 17; rule 5.9 | set by the integration from Work State(s) `location` | `Behavior Technician NY`; `RBT CO` for Colorado | New York form built (old); Colorado built 5 (5.13) | — |
| T2 | External System ID, name, primary email, date of birth | [GER-REQ]; [GER-BT] | `workday_id` or the record ID; `first_name`, `last_name`; `email`; `date_of_birth` | as B2 to B5 | built 1; the email update rule changed (decision 47) | O-8, O-11 Unreadable value ends as `error` (decision 43). |
| T3 | Gender | [GER-BT] | `gender` (Contact mirror) | gender | built (old) | Unreadable value ends as `error` (decision 43). |
| T4 | Mailing address and phone | [GER-BT] | `street_home`, `location_city`, `state_home`, `postal_code_home`, `employee_phone` | address line 1, city, state, zip, cell phone | built 5 (5.9) | Unreadable value ends as `error` (decision 43). Phone: US forms read, 10 digits sent (decision 46). |
| T5 | Home apartment | [GER-BT] lists none; [G20] sets `home_apt` on every test BT/RBT | `home_apt` | address line 2 | built (old) | Zeke: keep sending it or stop (O-20). Kept until he decides. |
| T6 | Work address | [GER-BT] | `street_address__work_`, `apartment__work`, `city__work_`, `state__work_`, `postal_code__work_` | Meta `133819` | built (old); apartment built 5 (5.10) | — |
| T7 | Active Case Load (display only) | [GER-BT] 11/16 | `active_cases_count` | Meta `147882` | built (old) | — |
| T8 | HubSpot record link | [GER-BT] 11/16 | record ID | Meta `138703` | built (old) | — |
| T9 | Personal email | decision 50; CentralReach lists `138069` as an Employee field | The BT/RBT record's own `personal_email` (decision 50) | Meta `138069` | built 6 (6.4) | Unreadable value ends as `error` (decision 43). `personal_email` must exist on the BT/RBT in the sandbox and in production (O-51). |

BT/RBT labels.

| ID | Label rule | Guide source | HubSpot source | CR label | Group | Status |
|---|---|---|---|---|---|---|
| TL1 | State, one per Work State | [GER-BT]; [G19] | `location` (multi-checkbox) | CO / NJ / NY Employee (IDs as BL2) | managed | built 5 (5.11) |
| TL2 | New Mexico, Virginia | [G19] | no HubSpot value yet | NM Employee, VA Employee | not managed until mapped | constants with 5.4; mapping **held** (O-6) |
| TL3 | Role by state: a BT gets Behavior Technician, an RBT gets RBT, one per Work State, Colorado included. A blank type, or any type other than `BT` or `RBT`, manages no role label (decision 35). | [GER-BT]; [G09]; decision 16 | `bt_rbt_type` × each Work State; `bt_to_rbt_path` has no effect | BT: Behavior Technician NY `1052630`, NJ `1132652`, CO `1132650`. RBT: RBT NY `1052631`, NJ `1132651`, CO `1107692`. | managed (all six) | built 5 (5.12) |
| TL4 | All Employees `1052618`, Clinical `1052643` | not in the guide; kept by Zeke 11/20 | every BT/RBT | — | base | built (old) |

Exclusions for BCBA and BT/RBT: BR7; BR12; the archived BCBA `gender`; `credentialed_insurances__ny`; `work_email` (no longer a source; 5.3 stops requesting it); Apploi-created records never have Entered in CentralReach = Yes, so the gate skips them. The integration never reads `external_system_id`, `entered_in_workday`, `entered_in_ucaba_payroll_system` or `entered_in_workday_by` ([G17], [G18]); the code does not read them today and no row may add them.

### 9.5 Contact (a data source, never its own CR record)

| ID | Requirement | Guide source | HubSpot source | Target | Status | Waits on |
|---|---|---|---|---|---|---|
| K1 | A change to a Parent/Guardian Contact's first name, last name, email or phone reaches the linked Case | [GER-CONTACT]; [G11] | Contact `firstname`, `lastname`, `email`, `phone`; Case → Contact type 3 | The Case is synced by the normal worker | built 6 (6.1, 6.2) | Sandbox and production Contact workflows (O-21) |
| K2 | The Case reads the Guardian values from its own sync properties | [GER-CONTACT] | `guardian_first_name`, `guardian_last_name`, `email`, `phone` on the Case | C6, C7, C8 | built (old); proof test built 6 (6.3) | — |
| K3 | A change to a BCBA's Contact email reaches the linked BCBA. **Retired by decision 42:** B9 reads the BCBA's own `email`, so a Contact email change no longer feeds a BCBA field. The fan-out no longer queues BCBAs (decision 44). | [GER-CONTACT] | Contact `email`; BCBA → Contact 17 / 191 | B9 | not built, retired (decision 42); the fan-out's BCBA branch is removed (decision 44; O-44 closed) | — |
| K4 | Skip a Contact with `test_record` = true. Route only to eligible linked records. No standalone CR contact and no label for a Contact. | [GER-CONTACT] scope | Contact `test_record` | — | built 6 (6.2) | — |
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
| P.6 | BR19 | (a) Record the label test of 2026-11-20 (section 4) in the tracker. (b) Take a fresh read-only snapshot of CR's label catalog and metadata field list and commit it as `cr-catalog-snapshot.json` (names and IDs only). (c) Add a test that fails when a label or metadata constant in `src/constants/centralReach.mjs` is not in the snapshot. | The test passes; NM Employee, VA Employee and Active Case Count are in the snapshot or the constant is corrected. The "remove only" list is not checked against the snapshot: two of its three IDs were deleted from CR's catalog (section 4). | orchestrator on Zeke's go-ahead for the read; builder for the test |
| P.7 | BR14, BR16, C31, BR20 | Four read-only sandbox HubSpot reads, on Zeke's go-ahead: (a) the search operator for "the multi-checkbox contains Yes"; (b) a GET that asks for a blank property and for a property that does not exist, to see whether a blank comes back as a null key; (c) the stored option values of `n1_what_type_of_insurance`; (d) which sandbox BCBA and BT/RBT properties are Contact mirrors that cannot be set on the record. | Results recorded in the tracker; rows 3.5, 4.18 and step 7.1 use them. **Done 2026-11-20** (section 4, "Stage P"). | orchestrator on Zeke's go-ahead |

**Stage P status, 2026-11-20.** Built by the builder agent (Fable 5.2, high effort), reviewed by the reviewer agent (Opus 5.5, high effort) from the diff alone, and every finding confirmed by the orchestrator by running or reading the code. Rows P.1, P.2, P.3, P.5 and P.6 (c) are built; P.4, P.6 (a) and (b) and P.7 are done (section 4). `npm test` 463 pass (402 before the stage). The review found no path that creates a duplicate, writes to the wrong CentralReach record or bypasses the gate, and it confirmed by running code that the label path, the employee create and both mappers send exactly what they sent before the stage. It found ten points (SP-R1 to SP-R10), none high.

| Finding | What it is | What was done |
|---|---|---|
| SP-R1 (medium) | A metadata field named in an omit list loses its saved hash, so a later blank in HubSpot sends no clear. Reproduced with the real hash functions. It exists today on the employee path. | New row 3.18 (lane B). Contract P.5 (c) now states what the worker must do. |
| SP-R2 (medium) | `signalOnly` held only `dealstage`, not the guide's five staffing-name signals. | Fixed now: `supervising_bcba_name`, `ia_bcba_name` and `reassessment_bcba_name` are in `signalOnly`. `current_primary_bt` and `current_primary_bt_2` stay in `mapped` until row 4.14 stops reading them, then lane C moves them. |
| SP-R3 (medium) | Contract P.5 (e) did not say what "confirmed" means inside the 150-second window; a label change in the window could have been saved as done and never posted. | Contract (e) and row L.3 now say it. |
| SP-R4 (medium) | A run that links to its own earlier create (a create that timed out) would treat the new contact's empty label read as a failed read and end as `error`. | Contract (e) and row L.2: the link record field `labelsPending`. |
| SP-R5 (low) | The saved label POST was not tied to a CR ID. | Contract (e) and row L.3: `lastLabelPost` carries `contactId`. |
| SP-R6 (low) | Six properties are requested but read by no mapper: `insurance_id_2`, `insurance_id_3`, `insurance_id_4`, `bt_name`, `bcba_name`, `work_email`. | Rows 4.10, 4.17 and 5.3 settle them; row 5.3 now also drops `bt_name` and `bcba_name`. |
| SP-R7 (low) | The Case worker maps twice in a run; both mappings must get the same inputs. | Written into contract P.5 (c) for lane D. |
| SP-R8, SP-R9 (low) | Two tests checked less than their titles said. | Fixed now. |
| SP-R10 (low) | Contract P.5 (d) did not say what happens to a Work State with no code. | Contract (d): it is left out of `workStates` with a warning; not an error. |

Where the build differs from the rows above. These win over the rows:

| Row | What is built | Why |
|---|---|---|
| P.1 | The Case request gains three properties (the staffing-name signals above). Everything else in the three requests and the known-fields lists is unchanged, proven against `8fe5c54`. | SP-R2. No mapper reads them and they are not hashed, so no record shows as changed. |
| P.1 | The six unread properties of SP-R6 sit in `mapped` for now, each with a comment. | Removing them would have changed a request in a row that is a move. |
| P.3 | Seventeen label constants and the field constant `137697` are added now, so the sendable list can name them. No mapper reads them yet. Salaried `1132653` is in the sendable list (row 5.7 is a managed label); being sendable does not send it. | Lane C uses the constants instead of adding them. |
| P.5 (e) | The sender takes one more option, `contactCreatedThisRun` (row L.2 needs it). | Builder's addition; refined by SP-R4. |
| P.5 (g) | Five label error codes are sorted in `src/lib/retry.mjs` now; nothing throws them yet. `CR_LABEL_CATALOG_UNREADABLE` is permanent (Stage 2 decision 4). | Lane L throws them; lane B does not need to edit the sorter for them. |
| P.5 | The shared test fake (`src/tests/smoke/stage2Fakes.mjs`) answers `GET /contacts/labels`. | Lane L needs the catalog for row L.1 and several lanes import this file. |
| P.6 (c) | The "remove only" list is not checked against the snapshot. | Two of its IDs were deleted from CR's catalog (section 4). |

The contracts are comment blocks that start `CONTRACT P.5 (a)` to `(g)`: (a), (b) and (c) above `buildClientMetadata` in `src/mappings/client/buildClientMetadata.mjs` and above `buildEmployeePayload` in `src/mappings/employees/buildEmployeePayload.mjs`; (d) in the employee mapper and above `getEmployeeContactForm`; (e) and (f) in `src/lib/centralReachClient.mjs`; (g) in `src/lib/retry.mjs`. `grep -rn "CONTRACT P.5" src` lists them. Every lane builder reads the ones its rows touch.

## 11. Stage 3 — Poller, fewer calls, label sender, safeguards

**Wave 1 status (2026-11-20).** Built, reviewed (Opus 5.5 high, one review per lane), fixed and merged into `architecture-update` on Zeke's go-ahead. Not pushed. The merge fixes and this docs update are not committed yet.

- **Rows built per lane.** A: 3.1 to 3.5, 3.11. B: 3.7, 3.8, 3.9, 3.13, 3.15, 3.16, 3.18, and the worker side of L.2, L.3 and 5.13. L: L.1 to L.4, 3.14, the form function of 5.13. C: the Stage 4 mapper rows (4.1 to 4.13, 4.15, 4.17, 4.19 to 4.23) and the mapper side of 4.14 and 4.16; Stage 5 (5.1 to 5.13, mapper side); 3.10; 3.19. Wave 2 builds 4.14, 4.16 and 4.18 for the Case (lane D), and 4.18 for the employees and 6.1 to 6.4 (lane E).
- **Commits and merges.** Lane commits L `e5bd0b1`, C `bb074ba`, B `9cf6803`, A `cd02789`. Merged in the order L, C, B, A as `f2fad40`, `4fd3996`, `e2b37ee`, `125b4f6`, with no conflicts.
- **Tests.** After the merge, 37 old tests failed: 36 asserted rules the lanes changed on purpose, and one lane B test was written before lane L's label sender existed. All were reconciled; no defect between lanes was found. `npm test` 952 of 952 pass; the lease test `[2.5]` passed 15 of 15 runs. `npm run check:requirements -- --merged=1,2,P,3,4,5` fails only on K2, whose proof test is row 6.3 (wave 2).
- **Decisions of the wave:** 35, 36 and 37 (section 4).
- See [WAVE-1-LOG.md](WAVE-1-LOG.md) for every review finding (A 11, B 8, L 11, C 8; one rejected, C-R2) and the merge list.

**Wave 2 status (2026-11-20).** Lanes D and E are built, reviewed (Opus 5.5 high, one review per lane, no high finding), fixed, committed (`ee64ba9`, `cce4890`) and merged (`dd50c14`, `856aed4`). The reconcile pass and decisions 39 and 40 follow in the next commit. The final whole-diff review from `8fe5c54` is still to run. Details are in [WAVE-2-LOG.md](WAVE-2-LOG.md).

**Goal.** The poller is an hourly safety check that never loses its place and never touches a record outside the gate. A record with no change writes nothing. Labels are sent the way rule 5.6 says. The client create path is safe.

**Guide sections.** Change detection Architecture tab (backup path; the 11/17 approved design; "Minimum changes"); Business rules `[GBR]`; `[G17]`; `[G19]`; section 11 "Some mapped values change without anyone editing the field".

**Depends on.** Stage 2 (built) and Stage P. Row 3.5 uses the result of P.7 (a): the Case filter for "Entered in CentralReach contains Yes" is `CONTAINS_TOKEN` with the value `Yes` (section 4).

**Files by lane** (section 17):

- **Lane A (poller):** `src/workflows/intakePollerWorkflow.mjs`, `src/functions/intakePoller.mjs`, `src/functions/intakePollerHttpTest.mjs`, `src/lib/hubspotClient.mjs` (search functions only), `src/lib/config.mjs`, `src/lib/serviceBusClient.mjs`, `src/functions/processClientQueue.mjs`, `src/functions/hubspotWebhook.mjs`, `src/lib/hubspotWebhook.mjs`, `local.settings.example.json`.
- **Lane B (workers):** both workflow code files, `src/lib/mappedState.mjs`, `src/lib/linkRecord.mjs`, `src/lib/retry.mjs`, `src/constants/syncReasons.mjs`.
- **Lane L (CentralReach client):** `src/lib/centralReachClient.mjs`.
- **Lane C (with the mappers):** row 3.10 only: `package.json`, new `scripts/check-triggers.mjs`.

| # | Lane | Serves | Rule | Change | Tests |
|---|---|---|---|---|---|
| 3.1 | A | BR14 | The poller runs at the top of each hour. | `intakePoller.mjs`: schedule `0 0 * * * *` (today `0 */5 * * * *`). The schedule is read from the app setting `INTAKE_POLLER_SCHEDULE`; not set, blank or not six fields means hourly (decision 37). | The schedule string. Setting not set, blank, `0 */5 * * * *`, malformed. |
| 3.2 | A | BR14, BR10 | One saved checkpoint per entity. It moves forward only after the page was queued. | The poller takes a `dependencies` argument. Per entity (Case, BCBA, BT/RBT): search records that are linked, or unlinked with Entered in CentralReach = Yes, with `hs_lastmodifieddate` at or after the checkpoint, oldest first, up to a fixed page cap (100 a page, 10 pages). No search carries HubSpot's `after` cursor: each page is a new search from the last timestamp. Inside a block of equal timestamps the search pages by record ID (`GTE` T and `LTE` T with `hs_object_id GT` the last ID), then goes on at T plus 1 ms (A-R1). After each page is queued, save the checkpoint as the earlier of that page's last timestamp and five minutes ago; after the last page the checkpoint moves to now minus five minutes (A-R3). First run saves its start, then looks one hour back. The checkpoint is stored with no expiry, with a key that starts with the portal ID. A failed send stops the page. Remove the 15-minute lookback, the dedupe entries, the one-page limit, and the linked recheck with its setting `LINKED_RECHECK_ENABLED` (on by default today, with no gate filter). | An outage of any length is caught up over later runs. A send failure leaves the checkpoint at the last finished page. Two records with one timestamp: neither is skipped. An unlinked record without Yes is not queued. No recheck runs. |
| 3.3 | A | BR14 | One entity's failure does not stop the others. A rejected search fails loudly. | Each entity in its own try block. Remove the fallback that re-runs a search without its date filter (`isLookbackFilterError`). | A failed Case search still runs both employee searches. A rejected filter is an error. |
| 3.4 | A | BR4 | The record gate applies to the poller and the sweep. | When `SYNC_RECORD_GATE_PROPERTY` names a property, every search adds "that property is true". The Case search keeps the four-stage exclusion. The worker gate still runs. | Gate set → the filter is in every search body. `none` → it is not. |
| 3.5 | A | BR14, BR10, BR18 | Once a day every linked record is queued, and every unlinked record whose status is `waiting`. | In the first hourly run at or after 08:00 UTC, once per day, guarded by a marker written after every entity was queued. The unlinked branch does not run when the gate is `none`. Own source name `dailySweep`, added to the Case queue's allowed sources (`processClientQueue.mjs`); the employee queue has no allowed-source list. Messages are spread with scheduled delivery, 60 a minute: `sendClientSyncMessage` and `sendEmployeeSyncMessage` gain an optional scheduled time. A cap per run. | Runs once a day even when a run is missed. A partial failure runs again the next hour. Gate filter present. Gate `none` → linked records only. |
| 3.7 | B | BR14, BR9 | A record with no change writes nothing. | A run is a no-op when the link record is clean, the field hashes match, the saved mapping version equals the current one, HubSpot holds the CR ID, and the status HubSpot shows is the status this run would write. Then no CR call, no HubSpot write, no Cosmos write except the record lease. If only the status differs, write only the status. Employees: the compared state is built from HubSpot data only (the mapped payload before the CR read, plus `workday_id` and the checklist); the CR read for the ID check is skipped only when the last status is `success` and nothing changed. Remove the duplicate first HubSpot read in both workflows; a no-op skips the confirm read. `noop` is never written. After a mapping version change every field is sent once; the saved hashes of the old version are kept as the basis for clear decisions only (B-R3). Change `MAPPING_VERSION` in this stage. A status HubSpot already shows, with the same reason, is not written again, also for decided outcomes and permanent failures (B-R4). | No-op Case: HubSpot reads and one Cosmos read, zero writes. No-op `success` employee: zero CR calls. A `waiting` employee still gets its ID check but does not rewrite an unchanged status. An `error` employee whose updates continue does not re-send an unchanged update. HubSpot missing the CR ID → the ID is written. Another mapping version → a full send. |
| 3.8 | B | BR14 | Only changed metadata fields are sent. | Send the metadata fields whose hash differs from the saved copy; all of them when there is no saved copy. | One changed field → one metadata call. |
| 3.9 | B | BR18 | A change that no webhook delivered is logged by field name. | When a run whose source is the poller or the sweep finds changed fields, log the names with a fixed message. A retried message keeps its `source`. | Names only, never values. |
| 3.10 | C | BR18, BR13 | A reference list of the trigger properties the code maps. | `node scripts/check-triggers.mjs` (`npm run check:triggers`, with or without `--expected`) prints, per object, the `mapped`, `signalOnly` and `mustTrigger` properties (P.1) and a fixed list for the Contact workflow (`firstname`, `lastname`, `email`, `phone`). It reads nothing else, compares nothing and exits 0 (decision 51: Zeke sets up and maintains the HubSpot re-enrollment triggers; the earlier comparison with `webhook-triggers.json` is retired and the file deleted). Not part of `npm test`, and not a gate at step 7.2 or 9.6. | The list is built from the mapped lists; no writeback property is on it. |
| 3.11 | A | safeguard (portal isolation, Stage 2 row 2.6) | The webhook does no Cosmos work. | Remove the log-only "coalesce" step and its Cosmos write (its key carries no portal ID). Remove settings the code no longer reads from the required lists and the example file; list them in the stage report. | A repeat notice is still queued; no Cosmos call. |
| 3.12 | — | BR4 | **Not built now. Decided at the move to production** (decision 20, step 9.2). Proposed: for portal `50317927`, `SYNC_RECORD_GATE_PROPERTY` = `none` and `INCLUDE_TEST_RECORDS` = `true` are invalid configuration. | — | — |
| 3.13 | B | BR16 | **Decided 2026-11-20 after the API test (section 4; route chosen by the orchestrator under decision 28).** An employee update never clears a core field the integration did not write. | In `src/workflows/employeeSyncWorkflow.mjs`, when the update request is built: for each of the twelve core fields (`externalSystemId`, `firstName`, `lastName`, `gender`, `dateOfBirth`, `primaryEmail`, `addressLine1`, `addressLine2`, `city`, `stateProvince`, `zipPostalCode`, `phoneCell`) whose mapped value is blank: if the saved copy holds a hash for that field that is not the blank hash, send it blank (the integration wrote it, so this is a real clear); otherwise send the value the CentralReach read of this run holds under `contact`, key for key. A key the read does not hold is left out. The date of birth is no longer deleted from an update. The External System ID rule of rule 5.4 stays as it is; the primary email follows row 1.10 as changed by decision 47 (a filled email is sent; a blank one sends back CentralReach's). The compared state and the saved hashes are still built from HubSpot data only, so a value sent back from CentralReach is never counted as written by the integration. An update that has no CentralReach read of the same run is not sent. The client half is held (O-35). | A blank field the integration never wrote: the request carries CentralReach's value. A field the integration wrote and HubSpot then blanked: sent blank. A blank date of birth on an update: CentralReach's stored date is sent back, never the placeholder. A record with no saved copy: every blank field carries CentralReach's value. The saved hash of a sent-back field stays the blank hash. |
| 3.14 | L | BR22, BR1 | The client create path is read-only before it writes (rule 5.5). | `createOrUpdateClient`: when there is no CR ID, call `findClientByExternalSystemId` (the read-only GET). 404 → create. Found → update by CR ID. Remove `updateClientByExternalSystemId` and its loose readers (`responseLooksNotFound` for this path, `id` and `result.id` as a CR ID). On an update, leave `ExternalSystemId` and `ContactForm` out of the request. No client-create switch (decision 18). | 404 → one POST, with External System ID and form. Found → one PUT by CR ID, without them. A 400 from the lookup never leads to a create. A linked update carries neither field. |
| 3.15 | B | BR3, BR1 | **Built (Zeke, 2026-11-20, decision 34).** After a create with an unknown result, the next run must not create again too soon. | The pending External System ID is kept with the time the create was sent; clients get the same marker. If its lookup answers 404 less than 15 minutes after the create was sent, the run is retried later and no create is sent. After 15 minutes a 404 clears the marker. | Timeout on a create, lookup 404 one minute later → no second create. After 15 minutes → the marker is cleared. |
| 3.16 | B | safeguard (decision 19) | A CR ID from HubSpot must be digits only. | Before any CR call, a `client_id_number` or `employee_id` that is not digits only is an `error` with a fixed reason and no CR call. | `12a4`, `12/4` and a value with a space → `error`, zero CR calls. Digits → proceeds. |
| 3.17 | — | BR2 | **Not built** (decision 22). A Workday ID format check waits on Sara (O-8). | — | — |
| 3.18 | B | BR16 | An omitted field keeps its saved hash (review finding SP-R1). | In both workers: for every field ID in the run's omit list, copy the saved hash `metadata.<id>` from the link record into the hashes this run saves, and leave the field out of the changed fields. One helper in `src/lib/mappedState.mjs`. Applies to the employee omit that exists today (`missing_hubspot_portal_id`) and to the omits of rows 4.16 and 6.4. | Real hash, three runs: a value is synced; the field is omitted (no write, the saved hash stays); HubSpot is blank (the clear is sent). An omitted field alone does not make a run a write. |
| 3.19 | C | BR1 to BR22, section 9 | Every requirement is proven by a test that names it (Zeke, 2026-11-20). | New `scripts/check-requirements.mjs` and `npm run check:requirements` (not part of `npm test`). It reads the requirement IDs and statuses from section 9 of this file and the test titles in `src/tests/smoke/`. For tests written before this rule (Stages 1, 2 and P), a small file `docs/workstreams/architecture-update/requirement-tests.json` maps each existing test title to the requirement IDs it proves; the orchestrator fills it at the wave 1 merge. Output: one line per requirement with its status and test count. Exit code 1 when a built or to-build requirement of a merged stage has no test. | Fails on a to-build requirement with no test; passes when a title cites it; a held or open requirement is listed, not failed; a mapped old test counts. |
| 3.20 | D, E | BR15 | Stage 8 must show exactly what each run did. | Each worker run (Case, BCBA, BT/RBT, Contact fan-out) logs one `Sync run summary.` line through `safeLog`, once, at the end of the run, on every outcome. The line carries these keys: `workflow`, `recordId`, `portalId`, `source`, `invocationId`, `attempt`; `outcome`: `success`, `noop`, `waiting`, `error` or `skipped`; `reasonCode`, and `operation`: `create`, `update` or `none`; `changedFieldNames`; `crCalls`: each CentralReach call the run made, with its kind (`lookup`, `create`, `update`, `metadata`, `labelRead`, `labelPost`) and its HTTP status, never a body; `labels`: the label IDs posted, whether the read-back confirmed them, and whether `skip_window` held the POST back; `writeback`: whether HubSpot was written, and the status written. The fan-out logs the number of messages it queued per object type. Only names, IDs, codes and counts go in the line, never a field value, person name, email or phone. The call list comes from what the workflow already sees. If that needs a change to `src/lib/centralReachClient.mjs` (lane L's file, now merged), the builder reports it and the orchestrator decides. `noop` here is a log value only; it is never written to HubSpot. The two queue exits that never start a worker run (a message for another portal, and a redelivery after the retries are used up) log their own warn or error line, not a summary line. A filled phone, email, state or gender that cannot be converted ends the run as `error` with reason code `UNREADABLE_VALUE` and the reason sentence "Unreadable value: <property>" (decision 43), before any CentralReach write; the sentence names the property and never the value. | Tests: one per outcome; a fixture record with distinctive values whose values never appear in the logged line; one `crCalls` entry per call made. |

**Label sender (lane L; rule 5.6).** `updateContactLabels` and `postContactLabels` in `src/lib/centralReachClient.mjs`. The workflow (lane B) saves the last label POST in the link record and passes it in, per the P.5 contract.

| # | Serves | Rule | Change | Tests |
|---|---|---|---|---|
| L.1 | BR19 | Only known IDs are sent, and never an empty list. | Before a POST: every ID the integration adds must be in the sendable list (P.3); an ID outside it is a code defect: no POST, `error`. Every ID in the set to post, the integration's and CR's own, must be in CR's live catalog (`GET /contacts/labels`, read once per run that posts labels); an ID that is not there: no POST, and the run is retried. An empty set is never posted. An entry of the required or managed list that is not a positive whole number is `CR_LABEL_NOT_SENDABLE` before any call (L-R3). | An ID outside the sendable list → no POST. A non-numeric ID → `CR_LABEL_NOT_SENDABLE`, zero calls. An ID the catalog does not hold → no POST. An empty set → no POST. |
| L.2 | BR19, CL1 to CL4, BL2 to BL7, TL1, TL3 | The set to post is: the labels CR holds now, minus the managed labels, plus the required labels. | Take `requiredLabelIds` and `managedLabelIds` from the mapper. No POST when the result equals what CR holds. A failed read makes no POST (built today). An empty read for a contact this run did not create is a temporary failure. With an empty managed list this is today's add-only behaviour. **Lane B, worker side (SP-R4):** the link record holds `labelsPending: true` from the moment the integration creates a contact or links the record to its own earlier create, until a label POST is confirmed; while it is true the worker passes `contactCreatedThisRun: true`, so the first empty read is taken as "no labels". The catalog check of L.1 runs on the set after the managed labels are taken out. | A managed label that is not required is left out of the post. A staff label is kept. Nothing to change → no POST. Empty read on an existing contact → no POST, retried. A create that timed out, then a run that links to it: the empty read is accepted and the labels are posted. |
| L.3 | BR19, BR16 | A label POST is confirmed by reading it back; a read can lag by about two minutes. | After a POST, return the posted set and the time; the workflow saves both in the link record. Read the labels again (three tries, 5 seconds apart). Shown → confirmed. Not shown → the run ends as a temporary failure and the normal retry schedule runs it again. One label POST per run: a POST that fails (timeout or 5xx) is not retried in the run; its error carries `labelPost`, which the worker saves as `lastLabelPost` (L-R4). For 150 seconds after a saved POST, a run makes no new label POST for that contact: it only reads and compares with the saved set, and the result's operation is `skip_window`. After 150 seconds, rule L.2 applies again from a fresh read. `postContactLabels` no longer returns "updated" on a 200 alone. **Inside the window (SP-R3):** the set is worked out from the saved post (saved set, minus managed, plus required). If it differs from the saved set, the labels changed after the post: `confirmed` is false, the run is retried and posts after the window; it never ends as success. **The saved post carries the CR ID (SP-R5):** `lastLabelPost` is `{ contactId, labelIds, postedAt }`, and a saved post for another CR ID is ignored. | Read shows the set → success. Read lags, retry inside 150 seconds → no second POST. Read shows the set on a retry → success. Never shown → `error` after the retries. A required label that changes inside the window → not success, and posted after the window. A saved post for another CR ID → ignored. |
| L.4 | BR19 | One body shape. | Remove the second POST with `{ labelIds }` that follows a 400. The body is `{ labels: [{ labelId }] }`. A 400 is a permanent failure. No POST is repeated in the same run, whatever the failure. | A 400 makes one call only. A timeout or 5xx makes one call and returns `labelPost`. |

**From the Stage 1 and Stage 2 reviews, for this stage.**

- Two cases wrote on every run, and row 3.7 ends both (built in wave 1): a linked `waiting` employee with no field change rewrote the same status each run; a linked employee whose status is `error` but whose updates continue re-sent the same update each run (S2-R6).
- The poller's lease, dedupe entries and recheck cursor, and the webhook's coalesce key, carry no portal ID. Rows 3.2, 3.5 and 3.11 rebuild or remove all of them; the new keys carry the portal ID.
- `README.md` still describes the retired `HUBSPOT_PORTAL_ID_TEST` setting, the old object type override, the wrong Function App in the deploy example and the coalesce step. Fixed with the next docs commit, before the Stage 7 deploy; it is not a build row.
- The poller's portal stamping is proven by one direct test of the senders and one test that reads the source text. Replace the source-text test with a real run once the poller takes `dependencies` (row 3.2).

**Decisions already made for this stage (Zeke, 2026-11-18).** With changed-only metadata, a value staff edit on the CR screen stays until its HubSpot field changes. Replaced on 2026-11-20 (A-R2, B-R4): an unlinked `waiting` or `error` record has its status written only when HubSpot does not already show it, so it is no longer rewritten on every run; the daily sweep still re-checks the record. (It said: an unlinked `waiting` record rewrites its status and repeats its two lookups on each run, for now.)

**HubSpot facts, from HubSpot's CRM Search page (read 2026-11-18).** Search is limited to 5 requests a second per account, 200 records a page and 10,000 results a query, with one sort. "It may take a few moments" for a new or changed record to appear in search, which is why row 3.2 keeps the checkpoint five minutes back. A filter on an option property is case-sensitive.

## 12. Stages 4 to 6 — Mappings and Contact routing

A row that waits on an open item is not built and is listed in section 15. It is never guessed. Every CR ID below is in `src/constants/centralReach.mjs` already or is added there by the row; each is in the saved catalog of 2026-11-18 unless section 4 says otherwise.

### Stage 4 — Case mappings

**Guide sections.** `[GER-CASE]`, section 3 field map, section 4 (associations), section 7 (client labels), `[G19]`, the appendix (stored values).

**Depends on.** Stage P. The mapper rows (4.1 to 4.13, 4.15, 4.17, 4.19 to 4.23) need nothing else. The wiring rows (4.14, 4.16, 4.18) change `src/workflows/clientSyncWorkflow.mjs` and `src/lib/hubspotClient.mjs`, so they come after lanes A and B of Stage 3.

**Files, mapper rows (lane C):** `src/mappings/client/*`, `src/constants/centralReach.mjs`. **Files, wiring rows (lane D):** `src/workflows/clientSyncWorkflow.mjs`, `src/lib/hubspotClient.mjs`. `src/lib/config.mjs` is not changed: the role association IDs for both portals are already in its portal table.

One test per row; the title names the requirement ID.

| # | Serves | HubSpot source | CR target | Rule |
|---|---|---|---|---|
| 4.1 | C8 | `street_address`, `home_apt`, `location_city`, `stateregion`, `postal_code`, `phone` | address line 1 and 2, city, state, zip, cell phone | Line 1 is `street_address` only. State from `stateregion`. Stop reading `location_central_reach` for the address. |
| 4.2 | C27 | `does_your_child_have_any_other_comorbid_diagnoses_`, `maladaptive_behaviors__parentguardian` | Meta `132303`, `126207` | Stored option values. Stop reading the `__clinical` properties. |
| 4.3 | C28 | `important_information` | Meta `138378` | New. Severity stays. |
| 4.4 | C17 | `work_schedule_details`, `btrbt_work_schedule_2_details` | Meta `132304`, `138093` | Main schedules only (C18 is open). |
| 4.5 | C19 | `finalized_client_service_hours_post_assessment`, `client_service_hours_total` | Meta `126209` | The text, then the weekly hours when filled. Assumed format (O-28). |
| 4.6 | C20 | `hours_bt_work_schedule_1` + `bt_rbt_2_work_schedule`, added by the code, a blank as 0 (decision 41) | Meta `134331` | Both blank: blank. A filled non-number: `error`, "Unreadable value: <property>", not a date reason (decision 43). Never `total_hours_btrbt_12` or the two older totals. |
| 4.7 | C22 | `initial_auth_tracks` chooses the source | Meta `132431` | Blank when the track is blank. |
| 4.8 | C23 | `ongoing_auth_period_start_date`, `ongoing_autrh_period_end_date` | Meta `134672` | "start - end", each date as MM/DD/YYYY (rule 5.7). Assumed format (O-28). |
| 4.9 | C26 | `allergies`, `allergies__yes__explain` | Meta `126214` | `Confirmed` → "Yes" plus the explanation; `Denial` → "No". Assumed format (O-28). |
| 4.10 | C30 | `insurance_2` or its Other summary; `insurance_id_2` | Meta `144600`, `144601` | Never `n2_what_type_of_insurance`. A blank carrier sends blank, whatever the Other summary holds (Zeke, 2026-11-20). |
| 4.11 | C32, C33, C36 | `referring_provider_medicaid_id`; `phi_diagnosis` + `diagnosis_other`; `referral_source` | Meta `141233`, `144793`, `126222` | Diagnosis: when `phi_diagnosis` stores `Yes`, write the option's display text "Yes-F84.0", then `diagnosis_other` when filled. Assumed format (O-28). |
| 4.12 | C34 | `most_recent_asd_diagnosis_date_1`; `most_recent_asd_diagnosis_date_medicaid` | Meta `131195`; `138701` | Both, each to its own field. Remove the pick-one logic and `most_recent_asd_diagnosis_date_2`. |
| 4.13 | C24 | `specific_home_location` chooses `full_home_address` (Child's House, More Than One Location) or the `service__*` parts (Other Location) | Meta `137697` | A TextArea field (registered in P.3). |
| 4.14 | C11, C14, BR17 | Case → BCBA and Case → BT/RBT associations by role and `USER_DEFINED` category; then the staff records' `first_name` + `last_name`, read in one batch call per object type | Meta `131314`, `144602`, `131313`, `138092` | The mapper takes the names as inputs (P.5). Several staff in one role: names joined by ", " in record-ID order (assumed format, O-28). No staff in a role: the field is blank. A failed association or name read stops the run; it never becomes a blank (rule 5.8). |
| 4.15 | C12 | `ongoing_central_reach_provider_supplier` | Meta `131308` | The typed text as it is. |
| 4.16 | C10 | `care_coordinator_name` (Case property, decision 39) | Meta `138851` | The Care Coordinator's name, from the Case property. A blank property is a real blank. A missing key is a failed read (4.18). The owners API is not called. |
| 4.17 | C38, C8 | — | — | Stop requesting `insurance_id_3`, `insurance_id_4`, the misspelled `…_other_addres` property, `location_central_reach` and every property replaced above. |
| 4.18 | BR16 | every property in the `mapped` lists, on Case, BCBA and BT/RBT | — | A requested key that is missing from the HubSpot answer is a failed read: `error`, no CR write. P.7 (b) confirmed on 2026-11-20 that HubSpot returns a blank property as a null key. For the Case, `phone_number__second_` is no longer requested (dropped, decision 36). For the BCBA, `dob` is requested and `date_of_birth` and `ucaba_email_address` are not (decisions 48 and 49). `personal_email` is requested on the BCBA and the BT/RBT (decision 50); a missing one fails every run on that object, so it must exist in the sandbox and in production (O-51). Lane D builds it for the Case, lane E for the two employee objects. |
| 4.19 | CL1 | `location` | CO Client, NJ Client, NY Client | Add NJ. The three are one managed group: the one for the Case's state is required. |
| 4.20 | CL2 | `specific_home_location` | Home `1052656` | Managed. Required for Child's House and More Than One Location. |
| 4.21 | CL3, CL4 | `case_status`; `staffing_status` | Active Client `1125427` / In-Active Client `1121488`; 97151 Services `1156743`, Staffed 97153 `1156746`, X 97153 `1156747` | Two managed groups. `Warm` requires Active Client; `Cold` requires In-Active Client. A `staffing_status` equal to one of the three names requires that label; any other value or blank requires none. The staffing managed list also holds the three retired IDs. All Clients stays required on every client. |
| 4.22 | C25 | `service_address__other`, when `specific_home_location` is More Than One Location | Meta `138091` | Blank for any other location value. Checked on the CR screen in Stage 8. |
| 4.23 | C31 | `n1_what_type_of_insurance` chooses `physician_name` + `npi_number` or `physician_name__commercial` + `npi_number__commercial` | Meta `131151` | Stored values, read from the sandbox on 2026-11-20. `Medicaid FFS`, `Medicaid FFS - NJ` and `Medicaid FFS - CO` use the Medicaid pair. `Commercial Enrolled` and `Commercial OON` use the commercial pair. `Unsure`, blank or any other value: the field is blank. One test per stored value. The production option values are checked in step 9.6. |

### Stage 5 — Employee mappings

**Guide sections.** `[GER-BCBA]`, `[GER-BT]`, sections 5, 6, 8 and 9, `[G19]`, the appendix.

**Depends on.** Stage P. After P.1 every row except 5.13 is in the mapping files, so nothing else in this stage touches a workflow code file.

**Files (lane C).** `src/mappings/employees/*`, `src/constants/centralReach.mjs`. Row 5.13 also has a part in lane L (`src/lib/centralReachClient.mjs`) and one pass-through line in lane B.

| # | Serves | HubSpot source | CR target | Rule |
|---|---|---|---|---|
| 5.1 | B6 | `gender_new` | gender | Male / Female. |
| 5.2 | B7 | `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home`, `employee_phone` | address, city, state, zip, cell phone | Replaces `home_apt`, `city_work`, `home_state`. |
| 5.3 | B13 | — | — | Remove `credentialed_insurances__ny`, `work_email` and `bcba_name` from the BCBA property list, and `bt_name` from the BT/RBT list (no mapper reads the last three; SP-R6). Remove Meta `134444` from the mapper **and** from the known-fields list, so no clear is sent for it. |
| 5.4 | BL1, BL2, BL3 | `location` | BCBA header `1130668`; CO / NJ / NY Employee | The header, All Employees and Clinical are base labels. One state label per Work State; the three state labels are managed. Add constants for NM Employee `1157030` and VA Employee `1157031`; no mapping reads them and they are not managed. |
| 5.5 | BL4 | `assign_states`, `lba_licensure__ny` | BCBA Colorado `1124246`, BCBA LBA NJ `1124245`, BCBA LBA NY `1052629`, GRAD Student- LBA NY `1092164` | Managed. `No` gets no label. |
| 5.6 | BL5 | `ny_insurance_labels` contains `MCD FFS-NY` | NY Medicaid `1107647` | Managed. Nothing for the other options (BL6). |
| 5.7 | B10 | `work_status` = `Salaried` | Salaried `1132653` | Managed. O-27 is answered before production. |
| 5.8 | BL7 | `cr_billing_hold_label` = `Yes` | Billing Hold Medicaid Affiliation `1103437` | Managed: required on `Yes`, removed when it is not `Yes`. |
| 5.9 | T4, T5 | `street_home`, `location_city`, `state_home`, `postal_code_home`, `employee_phone`; `home_apt` | address line 1 and 2, city, state, zip, cell phone | State from `state_home`. Zip from `postal_code_home` only. `home_apt` stays as line 2 until O-20 is decided. |
| 5.10 | T6 | adds `apartment__work` | Meta `133819` | — |
| 5.11 | TL1 | `location` | CO / NJ / NY Employee | One per Work State; managed. All Employees and Clinical are base labels. |
| 5.12 | TL3 | `bt_rbt_type` × each Work State | the six role labels | A BT gets Behavior Technician for each Work State; an RBT gets RBT for each Work State; never both. All six are managed, so a BT who becomes an RBT loses the BT label. `bt_to_rbt_path` has no effect. A blank type, or any type other than `BT` or `RBT`, manages no role label (decision 35). |
| 5.13 | T1 | `location` (Work States) | `ContactForm` on a create | Rule 5.9. Lane C: the BT/RBT mapper returns `workStates`. Lane B: the workflow passes it to the create call. Lane L: `getEmployeeContactForm` returns `RBT CO` for a BT/RBT whose work states hold Colorado and not New York, else `Behavior Technician NY`; `Admin` for a BCBA. |

Unchanged on purpose: the date-of-birth placeholder (decision 23; the BCBA source is `dob` since decision 48). The employee primary email on an update changed in decision 47 (O-11); the BCBA source is `email` since decision 49.

### Stage 6 — Contact routing

**Guide sections.** `[GER-CONTACT]`; section 11 "It's actually 4 objects".

**Depends on.** Stage 3 lanes A and B (same webhook, queue, Service Bus and employee workflow files) and Stage 5 (same employee mapper).

**Files (lane E).** `src/lib/hubspotWebhook.mjs`, `src/functions/hubspotWebhook.mjs`, `src/functions/processClientQueue.mjs`, `src/lib/serviceBusClient.mjs`, `src/lib/config.mjs` (the BCBA → Contact type: production 17, sandbox 191), new `src/workflows/contactFanOutWorkflow.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/mappings/employees/buildEmployeePayload.mjs`.

| # | Serves | Rule | Change | Tests |
|---|---|---|---|---|
| 6.1 | K1 | A Contact notice is accepted and queued. | The webhook accepts object type `0-1` and queues one `contactChange` message (Contact ID and portal ID) on the client queue. | 202 and one message. |
| 6.2 | K1, K4, BR7 | A Contact change reaches every Case linked to it, through the normal worker. | The fan-out reads the Contact (`test_record`) and skips it when true, unless `INCLUDE_TEST_RECORDS` is `true`. It then reads the Contact's associated Cases and queues an ordinary sync message for each. It no longer reads or queues BCBAs (decision 44). It never calls CR. The record gate is checked by the workers, per target. A failed read queues nothing and is retried. | One Contact with two Cases → two messages. `test_record` = true → none. A failed association read → none, retried. |
| 6.3 | K2 | Guardian name, email and phone are in the Case's compared state. | A test only. | A Guardian value change on the Case produces a client update. |
| 6.4 | B9, T9, BR16 | The employee personal email comes from the record's own `personal_email`, on the BCBA and on the BT/RBT (decision 50; the BCBA read `email` under decision 42). | Both mappers send the record's `personal_email` for Meta `138069`, read with `readEmail`; `email` stays the primary email only. Blank follows the employee metadata blank rule. A filled value that fails the format check is `error` with no CR call (decision 43). A missing `personal_email` key in the HubSpot answer is a failed read (row 4.18). `138069` is in the changed-field comparison of both types. No Contact is read, there is no omit-and-warning branch, and the BCBA → Contact entry (191 / 17) is gone from `config.mjs`. | `personal_email` changes → `138069` updates, one changed field. An `email` change leaves `138069` alone. Blank → blank. Badly formed → `error`, no CR call. `personal_email` key missing → `error`, no CR write. |

Live testing of Stage 6 waits for the sandbox Contact workflow (O-21). The code and its offline tests are built now.

## 13. Stages 7 to 9 — After the build

### Order after the build (Zeke, 2026-11-20)

1. **Build committed.** Wave 2 (lanes D and E), the final whole-diff review, and the commit on Zeke's word.
2. **Plan review with Zeke**, including 7.1 (a) to (f) and the open items that Stage 8 depends on.
3. **Azure configured (7.3).** The app is Stopped only while the settings change and the reviewed commit deploys.
4. **Claude's script (`scripts/sandbox/create-test-records.mjs`, run by Zeke from his terminal) creates the round's sandbox test records** in `52311591`, with their associations (7.1 c) and a non-blank value in every mapped property (7.1 f). Entered in CentralReach is left blank, so nothing is pushed yet.
5. **The app is started on Zeke's go-ahead and kept RUNNING for all of Stage 8.** The two queue functions start first. The poller and the sweep start when the round reaches the Poller and sweep row. Records are pushed one at a time: Zeke sets Entered in CentralReach = Yes on one test record, on his go-ahead. A read-only CR GET then checks that record against the 7.1 (f) matrix before the next record is pushed.
6. **Then the rest of round 1 (New York), then Colorado and New Jersey, then Stage 9.**

### Stage 7 — Final sandbox test plan, HubSpot setup, deploy while Stopped

**Depends on.** Stages P and 3 to 6 committed, and the final whole-diff review done. Steps run in order: 7.1, 7.2, the trigger check, 7.3.

| # | Serves | Step | Who | Done when |
|---|---|---|---|---|
| 7.1 | BR20 | Finish `SANDBOX-TEST-PLAN.md from the Stage 8 list below. Keep the record convention and update it: (a) every property name is checked against the finished mappers. Known changes: BCBA state and apartment are read from `state_home` and `apartment__home`; BT/RBT state from `state_home` and `location`. (b) Several of these are Contact mirrors that cannot be set on the record, so each test employee is created with an associated Contact that fills them (decision 30; the list is in section 4, Stage P read (d)). For a BT/RBT the Contact also carries the date of birth. (c) Each round's records are created with their associations (decision 21): the Case to the round's BCBA as Supervising (247), IA (223) and RE (229); to the round's BT/RBT as Primary BT 1 (238), and to a second BT/RBT as Primary BT 2 (240) when that test runs; to a Parent/Guardian Contact (type 3); the BCBA to its own Contact (191). (d) Rounds run the temporary-ID path with `workday_id` blank (decision 22). (e) The wrong-Client-ID test is run only on a Case created in the same round, using an earlier round's inactive test client. (f) A test matrix with one row per requirement in section 9 (BR, C, B, T, K, CL, BL, TL), rows already built included (Zeke, 2026-11-20). Columns: requirement ID, HubSpot property, value set in the round, expected CR field or label, how it is checked (read-only CR GET, or the CR screen for display-only items), round, result. Every mapped property gets a non-blank test value. Rounds rotate option values so each stored option of a property that chooses a label or a source is tested at least once: BT and RBT, a BT changed to RBT, Warm and Cold, each staffing label and none, each `n1_what_type_of_insurance` value, each `specific_home_location` value. One update round clears each mapped field to blank. A row that is held, open or excluded is listed with its reason, not left out. The matrix is `sandbox-test-matrix.md` (committed `9ea9a8f`, reviewed against the guide and the mappers); round values and expected results live there, not in SANDBOX-TEST-PLAN.md. | Claude (the Q&A chat) writes | Zeke agrees |
| 7.2 | BR1, BR10, BR13, BR15, BR18, K1 | Sandbox HubSpot: one webhook workflow set per object, each filtered on its test list (`1463` Deals, `1464` BCBAs, `1465` BT/RBTs). The employee workflows trigger on `workday_id` and the checklist. The BCBA workflows also trigger on `email` (decision 49), and the BCBA and BT/RBT workflows on `personal_email` (decision 50). The Case workflow triggers on the five staffing name properties and on `hours_bt_work_schedule_1` and `bt_rbt_2_work_schedule` (decision 41), not on `total_hours_btrbt_12`. The Contact workflow. Failures and waiting views per object; the 24-hour report. The re-enrollment triggers are set up and maintained by Zeke in HubSpot (decision 51); no file holds them. `node scripts/check-triggers.mjs` prints the trigger properties the code maps per object, as a reference when a mapping changes (no network; Case 68, BCBA 24, BT/RBT 23, Contact 4 on 2026-11-23; re-run it for the current counts). It includes `email` under BCBA, `personal_email` under BCBA and BT/RBT, and the two hours properties and not `total_hours_btrbt_12` under Case. The round's test records and their associations (7.1 c), created by Claude's script in `52311591` only from the 7.1 (f) values, on Zeke's go-ahead; Zeke checks them on screen. | Zeke (HubSpot setup); the test records by Claude's script, run by Zeke | Zeke confirms the triggers in HubSpot; no code check |
| 7.3 | BR4, BR14, BR15 | Azure, app Stopped, each write on Zeke's go-ahead. No separate manual portal check: the run-time portal check (F-3, once per process, cached) stays in the code (Zeke chose "Keep code, drop manual step"). Note: it depends on the private app being able to call `GET /account-info/v3/details`; without that every run fails as a configuration error. First confirm the app is Stopped and `AzureWebJobs.intakePoller.Disabled`, `AzureWebJobs.processClientQueue.Disabled` and `AzureWebJobs.processEmployeeQueue.Disabled` are `true`. Then: settings for `52311591` (`HUBSPOT_PORTAL_ID` must be `52311591`; the two object type settings must equal the portal table or be removed; `HUBSPOT_PORTAL_ID_TEST` removed); the sandbox token and webhook secret entered by Zeke in the portal; `SYNC_RECORD_GATE_PROPERTY` = `sandbox_test_field`; `LEASE_TTL_SECONDS` = `660`; `AzureFunctionsJobHost__logging__applicationInsights__samplingSettings__isEnabled` = `false` for all of Stage 8, so no log line is sampled away (it is removed or reviewed at 9.7); confirm the app has an Application Insights connection (the setting name `APPLICATIONINSIGHTS_CONNECTION_STRING` is present, never its value); remove the six unused pipeline and allowlist settings and the settings Stage 3 retired; `ALLOW_EMPLOYEE_CREATE` = `false`, `PUT_ONLY_MODE` = `true`; purge both dead-letter queues (never replay); confirm both queues are empty and Cosmos holds nothing from `50850427`; one email alert on dead-letter count above zero; deploy the reviewed commit and record its hash and the function timeout. Check whether duplicate detection can be turned on for `employee-sync-queue` without recreating it (S2-R5). Cosmos records written before Stage 2 are never read again, so the first run of each linked record after the deploy is one full write. | Zeke, or Claude through the Azure CLI on Zeke's go-ahead for each write | Every value read back (setting names, never values); app still Stopped |
| 7.4 | BR19 | Confirm the answer shape of `GET /contacts/{id}/labels`. | — | **Done 2026-11-20**: the answer is `labels`, each item with `labelId` (section 4). The reader in the code matches. |

### Stage 8 — Sandbox rounds

The app runs for all of Stage 8 (Zeke, 2026-11-20), so Azure is tested end to end: the webhook, Service Bus, the workers, CentralReach, the HubSpot writeback, the poller, the sweep, the retries and the alert. It is Stopped again only for a settings change or a redeploy. Run only from the agreed plan. Every CentralReach write is a production write on a test record Zeke names, on his go-ahead at that step. One round per state (New York, Colorado, New Jersey), in order. Stop at the first unexpected result. After each round Zeke makes the round's client and two employees inactive on the CR screen, and `sandbox-test-log.md` is filled in.

| Area | Serves | Tests |
|---|---|---|
| Gate | BR4, BR7 | A record without `sandbox_test_field` sends no webhook and is never queued by the poller or the sweep. |
| Labels, first | BR19 | On the round's test employee, with the integration's own sender: a managed label that is no longer required is removed; a label added by hand on the CR screen survives; an empty set is never posted; the read-back confirms; the read lag is timed; no second POST is made inside 150 seconds. Also: a label that is on the test contact and is then deleted from CR's catalog (A-18). This must pass before any other label test. |
| Contact form | T1, B1 | The labels and profile are read straight after each create, to see what the form set by itself: `Behavior Technician NY` (rounds 1 and 3), `RBT CO` (round 2), `Admin` (BCBA). |
| Employee create, temporary-ID path | BR1 to BR3 | Missing email → `error`, no CR call. Create off → `waiting`. Blank `workday_id` → created with the HubSpot record ID, `waiting`. Two quick edits → one employee. BCBA create. The time from the create to a found lookup is measured (A-21). |
| Updates while waiting | BR10 | An address change while `waiting` reaches CR. Checklist ticked while CR holds the temporary ID → `error`, and the update is still sent. |
| Workday ID path | BR8, BR10, BR11 | **Waits on Sara's answer (O-8, decision 22).** Create with a Workday ID → `success`. Workday ID filled → `waiting` "replace". ID replaced on the CR profile and checklist ticked → `success`. Workday ID changed to another value → `error`, no CR write. Two records with one Workday ID: the second is `error`. A Workday ID that a CR employee holds: `error` when another HubSpot record holds that CR employee, `waiting` when none does. Test values are the `AZTEST-…` IDs of `[G20]`, never a real Workday ID. |
| Case | BR1, BR6, BR8, BR22 | Create; no duplicate on a second run; an update carries no External System ID and no contact form; a wrong Client ID → `error` (method in 7.1 e); a Case in an excluded stage → nothing. |
| Mappings | section 9 | Every row of the 7.1 (f) matrix has a recorded result. Stage 8 passes only when every row passes or Zeke accepts it. Values are checked by a read-only CR GET after each round, on Zeke's go-ahead; display-only items on the CR screen: Service Location Address 2 (4.22) and how it shows, and the assumed text formats (O-28). |
| Staffing | BR17, C11, C14 | A staffing association is removed, replaced and relabeled, each as its own test; the names in CR follow. |
| Blank handling | BR16 | A cleared metadata field is cleared in CR. A blank core field on an update (if 3.13 was not settled before). |
| Retries and alert | BR14, BR15 | A forced temporary failure walks the delay steps; one malformed test message dead-letters and the email arrives. The delivery count of a first scheduled delivery is logged (A-15). |
| Poller and sweep | BR14, BR18 | A change with its HubSpot workflow off reaches CR within the hour and the log names the field. A no-op run writes nothing. A webhook and the poller on one record at the same time: one write. An association-only change: does the poller see it (A-16)? |
| Contact | K1 to K5 | Guardian and BCBA Contact changes arrive. A change to a Contact-mirrored BT/RBT field: does the BT/RBT workflow fire (O-26)? A Case with two Contacts (HubSpot only): the sync properties show the first Guardian. |
| CR behaviour | O-11 | A changed employee email was never tested against CentralReach. Since decision 47 the code sends it. The first changed-email update must be proven on a CentralReach test employee in Stage 8. If CentralReach refuses it, the run ends as `error` "CentralReach rejected the request". | B4, T2 on update | Zeke | The CR test in Stage 8 |

**Poller interval in the sandbox rounds (decision 37).** The rounds may set `INTAKE_POLLER_SCHEDULE` to `0 */5 * * * *`. At that interval every change is queued twice (the checkpoint sits five minutes back; the second run writes nothing). After a crashed run the next two runs skip, because the poller lease lasts 660 seconds. A sweep above its 3,000-message cap would overlap itself (this does not arise with the gated sandbox test records). Call counts from those rounds are not production numbers; one round runs at hourly before go-live.

### Stage 9 — Production readiness and go-live

**Depends on.** Stage 8 passed; the open items of section 15 that name a 9.x step.

| # | Serves | Step | Who |
|---|---|---|---|
| 9.1 | BR2, BR8 | Workday ID format. A note only for now (decision 22). When Sara answers (O-8), Zeke decides whether a format check is built; risk R-8 is closed or accepted before 9.8 step (1). | Sara; Zeke |
| 9.2 | BR4 | Decide row 3.12: should production refuse `SYNC_RECORD_GATE_PROPERTY` = `none` and `INCLUDE_TEST_RECORDS` = `true`? | Zeke |
| 9.3 | BR4 | Pick the production segment and the one checkbox property behind it (decision 20). That property becomes `SYNC_RECORD_GATE_PROPERTY`. Until United Care confirms a record, its checkbox stays off; it is never set on a person who already has an employee record in CR. | Zeke, Danny |
| 9.4 | BR3, BR4 | Existing employees: match a CR export against HubSpot, United Care reviews, then set `employee_id` on confirmed records. 515 records have Entered in CentralReach = Yes and no `employee_id`. Also: count the CR External System IDs with 10 or more digits (A-5); one read-only HubSpot search for two records holding the same `client_id_number` or `employee_id`. | Zeke, Danny, United Care |
| 9.5 | BR8 | Existing clients: find out why 81 of 100 sampled Client IDs did not resolve in CR; list the Cases with Yes and no Client ID and confirm which clients already exist in CR. | Zeke |
| 9.6 | BR1, BR15, B5 | Production HubSpot: webhook workflows with full trigger lists, filtered on the segment; the BCBA date-of-birth property United Care confirms (`dob` or `date_of_birth`, O-10; decisions 23 and 48); failures and waiting views; the 24-hour report. The production re-enrollment triggers are set up and maintained by Zeke in HubSpot (decision 51); no code check. One read-only production GET of a Case with the sensitive properties, on Zeke's go-ahead. | Zeke, Danny |
| 9.7 | BR14, BR15 | Production Azure: settings for `50317927`, production secrets, the alert with Danny or a shared inbox added, deploy with the commit recorded. | Zeke, with Claude through the Azure CLI on his go-ahead |
| 9.8 | BR1, BR4, BR5 | Go-live in three steps. (1) Creates and updates for new employees only: the records the gate marks. (2) Creates and updates for new Cases only. (3) Updates of records that existed in CR before go-live, one confirmed batch at a time, after 9.4 and 9.5 and the blank-handling result. Recommended before step (3), decided then: a list per batch of the field names that would change, for United Care to review. Watch the failures view, the waiting view and the alert daily for the first week. | Zeke, Claude |
| 9.9 | safeguard (a record) | Record the final state in the guide. | Claude, on Zeke's request |

**Poller schedule (decision 37):** `INTAKE_POLLER_SCHEDULE` is absent in production, or holds `0 0 * * * *`; check it at step 9.2 with the other settings.

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
| O-6 | New Mexico and Virginia. Read from production on 2026-11-20: the `location` options `New Mexico` and `Virginia` exist on BCBA and BT/RBT, and 10 BCBA records hold one. **Zeke, 2026-11-20: do not build these labels now.** The mapper adds a warning for those options and sends no state label for them. | BL3, TL2 | Zeke | His word, when he wants them |
| O-8 | Workday ID format, and the four production records that hold something else (one in the pattern ###-##-####). A note only for now (decision 22). | 9.1; risk R-8 | Sara, via Danny | Her answer |
| O-9 | The production segment and the checkbox property behind it. The up to 264 existing BTs whose checklist may be ticked later. Row 3.12. | Production start | Zeke, Danny | Zeke's decision at the move to production (9.2, 9.3) |
| O-10 | **Pending United Care's confirmation whether the BCBA date of birth lives in `dob` or `date_of_birth`; the code reads `dob` for now** (decision 48). Production read of 2026-11-21: `date_of_birth` exists on the BCBA, created that day as a single-line text property, and is blank on all 374 BCBAs; `dob` holds 214 values as M/D/YYYY, 1 in another format, and 159 are blank. A blank `dob` sends the placeholder `2000-01-01` on a create and CentralReach's date on an update (decision 23). Switching to `date_of_birth` is the one constant `BCBA_DATE_OF_BIRTH_PROPERTY`. | Production BCBA creates | Zeke, United Care | United Care's answer via Zeke (then 9.6) |
| O-11 | A changed employee email does not reach CR, and the status still shows success. | B4 on update | Zeke | The CR test in Stage 8 |
| O-14 | The Location #2 work schedules have no CR field. Options: two new CR fields made by script (decision 27), or the text added to the Work Schedule #1 and #2 fields. | C18 | Zeke | His decision when Stage 4 is built |
| O-15 | Grad Permit Holder; Outgoing Supervising BCBA; SUB and On Leave; Outgoing BT 1 and 2. | C13, C15, C16 | United Care, via Danny | Their answer |
| O-16 | Supervising BCBA: how the typed text is matched to a CR provider. | C12 beyond plain text | Zeke / Sara | Their answer |
| O-17 | Care Coordinator: a target for the email (Case); the CR employee field (BCBA); the owners scope (BCBA only; no longer needed for the Case, decision 39). | C10 email, B11 | Zeke; Danny for the scope | Field chosen; scope added |
| O-18 | Per-BT hours: is a CR field wanted? | C21 | Zeke / Sara | Their answer |
| O-19 | The `insurance_id_3` and `insurance_id_4` mappings; what `Unsure` or a blank insurance type should send for the referring physician. Decided 2026-11-20 (decision 32): every Medicaid insurance type uses the Medicaid pair (row 4.23). | C38; part of C31 | Zeke / Sara | Their answer |
| O-20 | `home_apt` on the BT/RBT: sent today, not in the [GER-BT] table, but set by [G20]; kept until decided. The `phone_number__second_` half is decided: dropped (decision 36). | T5 | Zeke | His decision |
| O-21 | Sandbox and production Contact workflows. | Stage 6 live test | Zeke | Workflows built (7.2, 9.6) |
| O-23 | Two Workday IDs that sit on both a BT/RBT and a BCBA record. Does CR stop a second contact with the same External System ID or email? | Those four records; risk R-1 | Danny / United Care | Their answer |
| O-24 | Alternate service-address copy workflow in HubSpot (not a mapping). | — | Zeke / Danny | Source property named |
| O-25 | HubSpot API versions. The code calls only `/crm/v3` and `/crm/v4`. What remains: confirm the app overview stops showing old-version calls after the new build runs. | — | Zeke | After Stage 7 |
| O-26 | Do Contact-mirror changes fire the BT/RBT, BCBA and Case workflows? | K5 | Zeke | The Stage 8 Contact test |
| O-27 | Salaried: a CR label or a profile field? | B10 in production | United Care, via Danny | Their answer, before 9.8 step (1) |
| O-28 | The text CR staff expect for Client Availability, Known Allergies, Diagnosis, Auth Period and several names in one field. Built with the assumed formats of rows 4.5, 4.8, 4.9, 4.11, 4.14. | — | Sara, via Danny | Her answer, or a screen check in Stage 8 |
| O-29 | Do staff edit mapped fields in CR? Any later HubSpot change overwrites them. | 9.8 step (3) | United Care, via Danny | A stated staff rule |
| O-30 | CR's API rate limit. | — | Danny | His answer |
| O-31 | Parallel lanes. Answered 2026-11-20 (decision 29): Stage P is committed first and each lane uses its own worktree and branch. Still asked for at the time: each wave's merge into `architecture-update`, and any push. | Each wave's merge | Zeke | His word at each merge |
| O-35 | The client update and blank core fields. The employee test showed that an update replaces the record; the client update is assumed to do the same but is not tested, the worker does not read the client before an update, and the client read's field names are not known. Until this is closed a client update sends a blank for every core field that is blank in HubSpot, as today. | Updates of clients that existed in CR before go-live (9.8 step 3) | Zeke | One read and one blank-field test on a round 1 test client in Stage 8, then a row like 3.13 for the Case worker. The test uses `PhoneHome`, which the integration no longer sends (decision 36): does an update that leaves it out clear a home phone CentralReach holds? Zeke, 2026-11-20: wait for Stage 8. Script drafted: `o35-client-phonehome-test.mjs` in the orchestrator's scratchpad (read mode, then at most 5 writes on `PhoneHome` only). |
| O-34 | Guide notes that these decisions call for: [G20] (associated test records; BCBA property names), the label test result and the lifted hold, the Colorado contact form, the managed-label rule, the Case Care Coordinator source (decision 39), the Total Assigned Hours source (decision 40). | — | Zeke asks; Claude drafts the exact text first | Zeke's request |
| O-43 | Confirm with United Care when HubSpot's total hours property (`total_hours_btrbt_12`) should be used instead of the code's sum of the two BT hours fields (decision 41). | C20 | United Care, via Zeke | Before go-live |
| O-46 | US territories (Puerto Rico, Guam, the Virgin Islands and others) are not in the state list (decision 43). A client or employee with a territory address ends as `error`. Does any United Care client or employee have one? | C8, B7, T4 | United Care, via Zeke | Their answer |
| O-47 | **Closed 2026-11-23: Zeke confirmed the exceptions.** Contact form: "If a state changes, we only need to update the value in CentralReach, not recreate through a different form." External System ID: "Once a workday ID is entered in HubSpot, it will be manually updated in CentralReach, thus it will be able to match." Placeholder: "A blank date sends 2000-01-01 - this is correct". Original item: Exceptions to "every matrix field is pushed on update" (decision 47): C1 Case Contact Form, C5 Case External System ID, B2 / T2 employee External System ID, B1 / T1 employee Contact Form, and the B5 date-of-birth placeholder. Each has a recorded reason (the table under the decisions). Are these acceptable? | C1, C5, B1, B2, B5, T1, T2 | Zeke | His word |
| O-48 | The production survey (WAVE-2-LOG section 9) found 26 badly formed employee emails (23 BT/RBT, 3 BCBA `email`) and a few phones that are too short (about 22 BT/RBT, 2 BCBA). Those records end as `error` on every run (decisions 43 and 46). Since decision 49 the 3 badly formed BCBA `email` values are also the BCBA primary email, so those BCBAs cannot be created either. United Care corrects them, or accepts those runs ending as `error`. | B4, B7, T2, T4 | United Care, via Zeke | Their answer |
| O-51 | Confirm `personal_email` ("📝Personal Email (backup only, never emailed)") exists on the BCBA and the BT/RBT objects in sandbox `52311591` and in production `50317927`. Production was read on 2026-11-23 (read-only, definitions and counts): the BCBA has it, filled on 110 of 374 records; **the BT/RBT has no `personal_email` property**, so it must be created there before go-live. Zeke (2026-11-23): "For the personal_email on the bt/rbt this is a follow-up item for the client." The sandbox is not yet checked. It is now requested and mapped on both (decision 50), so with row 4.18 a missing property fails every run on that object as a failed read. | B9, T9, BR16 | Zeke | One read-only property read per portal, before Stage 8 and before production |

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
| O-22 | Go-ahead for the four read-only sandbox reads of P.7 | Zeke; the reads were run on 2026-11-20 (section 4) |
| O-32 | Go-ahead for the catalog read of P.6 and the blank-field test of row 3.13 | Zeke ran both on 2026-11-20 (section 4) |
| O-33 | Row 3.15 (wait before a second create): build it or not | Zeke: build it (decision 34) |
| O-36 | BT/RBT role labels when `bt_rbt_type` is `BT to RBT` (1 production record) or blank (17 records with Entered in CentralReach = Yes) | Zeke 2026-11-20 (decision 35): no role label is managed for either; built in lane C. A different answer from United Care would change row 5.12 |
| O-37 | C20 total hours formula is `1 + 1` | Closed by decision 40: C20 reads `total_hours_btrbt_12`; no formula edit. Source changed again by decision 41. |
| O-39 | C20 is blank when only one BT has hours | Closed by decision 41 (2026-11-21): the code sums the two hours fields, a blank as 0. The follow-up is O-43. |
| O-40 | BCBA to Contact type 17 has no label; a BCBA with two linked Contacts got no personal email | Closed by decision 42: B9 reads the BCBA's own `email`; no Contact is read. |
| O-41 | Blank name keys in the batch read | Closed 2026-11-21 (reported by the testing chat from read-only production reads): HubSpot returns a requested property that is blank as a key with null; it never omits it. |
| O-42 | A BCBA linked to a `test_record` Contact still got its email | Closed by decision 42: no Contact is read for the BCBA. |
| O-44 | The Contact fan-out's BCBA branch | Closed by decision 44 (2026-11-21): removed. Zeke: "If this was for the bcba, yes remove it". |
| O-45 | A bad HubSpot primary email on an employee update ends as `error` | Closed by decision 47 (2026-11-21): a linked update sends HubSpot's email, so a badly formed one is `error`; Zeke wants every matrix field pushed on update. |
| O-49 | BCBA primary email source (`ucaba_email_address` blank on 256 of 374 production BCBAs) | Closed by decision 49 (2026-11-21): the BCBA primary email is the BCBA's own `email`. Zeke: "We are not using ucaba_email_address. We are using this internal field value email for the bcba." |
| O-38 | Sandbox property check before Stage 8 (`care_coordinator_name`, `hours_bt_work_schedule_1`, `bt_rbt_2_work_schedule`, the BCBA `email` and `dob`, `test_record` on the four objects) | Closed 2026-11-23 on Zeke's word: "Confirmed. These fields are created in sandbox." `personal_email`, added later the same day, is O-51. |
| O-50 | What Meta `138069` holds now that the BCBA primary email also reads `email` | Closed by decision 50 (2026-11-23): `138069` reads `personal_email` on the BCBA and on the BT/RBT. |

**Waiting on United Care, Sara or Danny:** O-8, O-15, O-23, O-27, O-28, O-29, O-30; part of O-9, O-16, O-17, O-18, O-19. **Waiting on Zeke:** O-6, O-9, O-10, O-11, O-14, O-20, O-21, O-24, O-25, O-26, O-31, O-34, O-35, O-43, O-47, O-51 (O-10 and O-43 with United Care), O-46 and O-48 (United Care). O-39 to O-42, O-44, O-45 and O-49 closed 2026-11-21; O-38 and O-50 closed 2026-11-23.

## 16. Risks and assumptions

Two registers. An assumption is something the plan treats as true that nobody has confirmed. A risk is something that may happen and would cause harm. Confirmed facts are in neither; they are in section 4.

The sorting, action, owner and close-by columns come from the risk reviewer (Opus 5.5, high effort, fresh context, 2026-11-20). The orchestrator checked each against the guide or the code. Entries that could cause a wrong write or a duplicate in production CR come first. "Zeke's decision" is filled where he decided on 2026-11-20; a blank cell means it is checked at its close-by point (decision 28).

Closed on 2026-11-20, and no longer in the registers:

| ID | Was | Closed by |
|---|---|---|
| A-1 | The label POST replaces the set; an invalid ID clears every label; an empty list changes nothing; reads lag | The first-hand test (section 4). True: it replaces the set, and reads lag by about two minutes. False: an empty list clears every label, and an unknown ID is ignored. What is left is A-18. |
| A-3 | Nothing reads the temporary External System ID in CR | Zeke (decision 22) |
| A-6, R-12 | The Case sync properties hold the first Guardian; the wrong Guardian is sent | Zeke (decision 24) |
| A-2 | Every CR label and metadata field ID in the plan exists with the meaning given | The catalog snapshot of 2026-11-20 (step P.6; section 4). Two retired staffing labels are gone from the catalog; they are remove-only and never sent. |
| A-17 | HubSpot returns a blank property as a null key and leaves out a property that does not exist | The sandbox GET of 2026-11-20 (step P.7 b; section 4) |

### Assumptions

| ID | Statement | Sorting | Recommended action | Owner | Close by | Zeke's decision |
|---|---|---|---|---|---|---|
| A-4 | A CR update that sends a blank core field does no harm. | **Disproved for employees on 11/20:** a blank and a left-out core field are both cleared (section 4). Open for clients. | Row 3.13 for employees; O-35 for clients | builder; Zeke | 3.13 before the Stage 7 deploy; O-35 before 9.8 step (3) | Route chosen by the orchestrator (decision 28): send back what CentralReach holds |
| A-18 | Every label ID that a contact's label read returns can be posted back, also one that was deleted from CR's catalog. | Open assumption. Seen on 11/20: an ID that never existed was ignored. A deleted ID was not tested. | L.1 checks the whole set against the live catalog; the Stage 8 deleted-label test | builder; Zeke | Stage 8 label test | |
| A-5 | A HubSpot record ID never equals another CR employee's External System ID. | Open assumption, low | 9.4: count CR External System IDs with 10 or more digits | Zeke | Before 9.8 step (1) | |
| A-13 | "No payor tags" in [G19] does not cover the BCBA label NY Medicaid. | Open assumption | Ask; keep 5.6 out of production until answered | United Care, via Danny | Before 9.8 step (1) | |
| A-12 | Salaried is a CR label (`1132653`), not a profile field. The label exists in the catalog. | Open assumption | Ask (O-27); keep 5.7 out of production until answered | United Care, via Danny | Before 9.8 step (1) | |
| A-19 | Staff do not edit mapped fields in CR. Any later HubSpot change sends the whole core payload and overwrites them. | Open assumption | Ask (O-29); record it as a staff rule | United Care, via Danny | Before 9.8 step (1) | |
| A-20 | CR does not stop a second contact with the same External System ID or email. If so, every gap in the lookups becomes a real duplicate. | Open assumption | Ask (O-23) | Danny | Before 9.8 step (1) | |
| A-21 | CR's lookup by External System ID finds a record straight after it is created. | Open assumption | Row 3.15; time it in Stage 8 | builder; Zeke | Stage 8 round 1 | Decided when Stage 3 is built (O-33) |
| A-8 | A sandbox test employee can be given values in the Contact-mirror properties. [G20] sets them on the record; [G02] calls them read-only mirrors. | Answered on 11/20 (P.7 d): they cannot be set on the record. The list is in section 4. | Fix 7.1 and [G20] (O-34) | Zeke | 7.1 | Test employees get an associated Contact (decision 21) |
| A-9 | The text CR staff expect in Client Availability, Known Allergies, Diagnosis, Auth Period and a field with several names. | Open assumption | Ask Sara (O-28) | Sara, via Danny | Before 9.8 step (2) | |
| A-10 | `n1_what_type_of_insurance` chooses the physician pair. | Open assumption. The stored values were read on 11/20 (P.7 c): six, not three. `Medicaid FFS - NJ`, `Medicaid FFS - CO` and `Unsure` get no physician pair in today's code. | Row 4.23; the production option values are checked in step 9.6 | builder; Zeke | Before the Stage 4 commit | Every Medicaid type uses the Medicaid pair (decision 32) |
| A-11 | A found client lookup carries the CR ID at `contact.contactId`. If not, every linked Case stops with a visible error and no write. | Open assumption | Test in the sandbox | builder | Stage 8 round 1 | |
| A-7 | A change to a Contact-mirrored property fires the HubSpot workflow on the record that mirrors it. | Open assumption | Stage 8 Contact test (O-26); the daily sweep is the fallback | Zeke | Stage 8 | |
| A-16 | An association change moves the Case's `hs_lastmodifieddate`. | Open assumption | A HubSpot-only sandbox test | Zeke | Before 3.2 is signed off; repeated in Stage 8 | |
| A-14 | The search operator for "the multi-checkbox contains Yes". Combining filters is settled. | Open assumption, narrowed on 11/20 (P.7 a): `EQ`, `IN` and `CONTAINS_TOKEN` are all accepted and return the same 283 Cases. Row 3.5 uses `CONTAINS_TOKEN`. | One sandbox Case with `Yes` and a second option ticked, then one read-only search | Zeke | Stage 8 poller test | |
| A-15 | A first scheduled delivery has delivery count 1; the host stops a run at the function timeout. | Open assumption | Stage 8 retries test | builder | Stage 8 | |
| A-22 | BR11 "One Workday ID per HubSpot employee record" means one Workday ID maps to one HubSpot employee record, so a second record holding it is an `error`. The BR11 proof tests rest on this reading. Confirmed by Zeke, 2026-11-20: a second HubSpot employee record that resolves to a CentralReach employee another HubSpot record already holds ends as `error`, with no CentralReach write. The BT-to-BCBA case (guide line 734: Workday IDs 2002628 and 1034820 are each on a BT/RBT and a BCBA) stays open for United Care. The guide (line 269) still records this as proposed, not decided. | Confirmed by Zeke, 2026-11-20 | Zeke confirms the reading; if the guide means something else, the BR11 tests are changed | Zeke | Before the final whole-diff review | |

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
| R-15 | A changed employee email may be refused by CR (decision 47). The run then ends as `error`, not success. | Untested until Stage 8 | Stage 8 test (O-11) | Zeke | Before 9.8 step (1) | |
| R-17 | 81 of 100 sampled Client IDs do not resolve in CR. Mostly a visible error; a wrong write if an ID belongs to another contact. | Risk | Block 9.8 step (3) until 9.5 explains it | Zeke | Before 9.8 step (3) | |
| R-35 | A field dropped from a mapper keeps its old value in CR. | Risk, low | Row 3.7 compares the mapping version | builder | Stage 3 | Compared (decision 28) |
| R-36 | A mapped property that is not a re-enrollment trigger sends no webhook when it changes, and nothing in the code detects that (the trigger comparison was retired, decision 51). What still catches it: the hourly poller queues any gated record modified since its checkpoint, found by `hs_lastmodifieddate` and not by which property changed, whether linked or unlinked with Entered in CentralReach = Yes (row 3.2), so a normal edit reaches CR within the hour; the daily sweep queues every linked record and every unlinked `waiting` record (row 3.5). Not caught by the poller: a change that leaves `hs_lastmodifieddate` unchanged (not verified for rollup or calculated properties); the sweep covers that for linked records within a day. A poller or sweep run that finds changed fields logs their names (row 3.9), which shows which property lacks a trigger. | Risk, low | Zeke keeps the workflow triggers in step with `node scripts/check-triggers.mjs` when a mapping changes | Zeke | Standing | Accepted (decision 51) |
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
| 1, in parallel | B Workers | 3.7 to 3.9, 3.16, 3.18; 3.13 and 3.15 if decided; the workflow side of L.2 (`labelsPending`), L.3 and 5.13; a fixed sentence in `syncReasons.mjs` for `CR_LABEL_NOT_SENDABLE`; the timing fix for the Stage 2 lease test (OPEN-ITEMS section 6) | `src/workflows/clientSyncWorkflow.mjs`, `src/workflows/employeeSyncWorkflow.mjs`, `src/lib/mappedState.mjs`, `src/lib/linkRecord.mjs`, `src/lib/retry.mjs`, `src/constants/syncReasons.mjs` |
| 1, in parallel | L CentralReach client | L.1 to L.4, 3.14, the form function of 5.13 | `src/lib/centralReachClient.mjs` |
| 1, in parallel | C Mappers | 4.1 to 4.13, 4.15, 4.17, 4.19 to 4.23; the mapper side of 4.14 and 4.16 (contract P.5 b: the mapper builds the four staff name fields and the owner field from its inputs, and leaves a field out when its input is not passed); 5.1 to 5.13 (mapper side); 3.10; 3.19 | `src/mappings/**`, `src/constants/centralReach.mjs`, `package.json`, `scripts/check-triggers.mjs`, `scripts/check-requirements.mjs` |
| 2, in parallel | D Case wiring | 4.14, 4.16, 4.18 for the Case; 3.20 for the Case. With them (WAVE-1-LOG section 7): pass the same `staffNames`, `ownerName` and `omitFieldIds` to both `mapMetadata` calls (SP-R7); end the run as `error` with no CentralReach write when `unreadableDateProperties` is not empty (C-R1); log the mapper's `warnings` by code and role (C-R6); a missing `hubspot_owner_id` key means "not read", so `ownerName` stays undefined (C-R7); a staff record whose name keys are missing from the batch answer is a failed read; the omit list goes in through the `dependencies.omitFieldIds` seam (lane B I-1) | `src/workflows/clientSyncWorkflow.mjs`, `src/lib/hubspotClient.mjs` |
| 2, in parallel | E Employee wiring and Contact | 4.18 for BCBA and BT/RBT; 6.1 to 6.4; 3.20 for the BCBA, the BT/RBT and the Contact fan-out. With them (WAVE-1-LOG section 7): the omit list of 6.4 goes in through the `dependencies.omitFieldIds` seam (lane B I-1); row 4.18 for production needs BCBA `date_of_birth` created (O-10); the dates of birth not yet seen in the sandbox are checked on the first round's test records | `src/workflows/employeeSyncWorkflow.mjs`, `src/mappings/employees/buildEmployeePayload.mjs`, `src/lib/hubspotWebhook.mjs`, `src/functions/hubspotWebhook.mjs`, `src/functions/processClientQueue.mjs`, `src/lib/serviceBusClient.mjs`, `src/lib/config.mjs`, new `src/workflows/contactFanOutWorkflow.mjs` |

- **What merges.** Lanes L and C merge in the same wave: until L.2 (managed labels taken out) and 4.21 (the retired staffing IDs in the Case managed list) are both in, the sender posts back every label CentralReach holds, also a retired one. The Stage 4 mapper rows and all of Stage 5 are one lane (C). Stage 6 is built with the employee wiring (E). Stage 3 is split in three (A, B, L).
- **Tests.** Each lane writes its new tests in new files. Old test files have one owner: lane A owns the poller, webhook, queue, Service Bus and config tests; lane B owns the workflow, stage 1, stage 2 and duplicate-safety tests; lane L owns the CentralReach client tests; lane C owns the mapping tests. A lane that needs an assertion changed in a file it does not own writes the change in its stage report, and the orchestrator applies it at the merge. Several old stage 1 and stage 2 tests run the real mappers, so lane B's new tests vary only fields lane C does not remap.
- **How lanes are kept apart.** One git worktree and branch per lane, cut from the Stage P commit; after each wave the orchestrator merges the lanes into `architecture-update` and runs `npm test`. Zeke agreed on 2026-11-20 to committing Stage P first and to the worktrees and branches (decision 29). Each wave's merge, and any push, is asked for at the time. A worktree has no `node_modules`; link the main copy's folder, do not install.
- **Fallback without worktrees.** The lanes run one after another in the main working copy, in this order: A, L, B, C, then D, E. Same rows, same files, same reviews.
- **Agents (Zeke, 2026-11-20).** Each builder works at high effort with a fresh context. Wave 1: lanes A, B, L and C were built by Claude Fable 5.2. Wave 2: lane D Sonnet 5.5, lane E Opus 5.5. Every review stays on Opus 5.5 at high effort: one review per lane, from the lane's diff and its plan rows only, and a re-review only after a high finding. After wave 2, one Opus 5.5 high review reads the whole diff from `8fe5c54`. The orchestrator runs the mechanical steps itself (`npm test`, the check scripts, git), hands the other work to background agents, and confirms every finding by running code before it reaches Zeke. Token habits: one short packet per lane (its plan rows and the guide rows they cite) instead of the whole plan; staggered agent starts; a compact after each wave.
- **Strictly in order after wave 2.** The final review, the commit on Zeke's word, Stage 7 (7.1, 7.2, the trigger check, 7.3), the sandbox rounds, production readiness.

### What cannot safely reach production yet, and why

| Scope | Why not yet | Closed by |
|---|---|---|
| Employees already in CR (515 with Entered in CentralReach = Yes and no `employee_id`) | 108 of 200 sampled CR employees have no External System ID, so the lookup cannot find them and a create would duplicate them (R-1). | 9.3, 9.4 |
| Linked Cases (475 with a Client ID) | 81 of 100 sampled Client IDs did not resolve; the IDs were typed by hand (accepted, decision 19); any run sends the whole core payload (R-4, R-17). | 9.5; 3.13; the list before 9.8 step (3) |
| Case creates for clients staff already made in CR | The lookup by Case record ID cannot find a hand-made client (R-2). | 9.5; the production gate |
| Labels on contacts that existed before go-live | A read can lag two minutes and a staff edit in that window can be undone (R-6). The integration's own sender is not yet proven. | The Stage 8 label test |
| BCBA creates | United Care confirms whether the BCBA date of birth is `dob` (read by the code, decision 48) or `date_of_birth` (O-10). | 9.6 |
| Records with a bad `workday_id` | It would be stored in CR for good (R-8). | 9.1 |
| Salaried and NY Medicaid labels | O-27 and A-13 are not answered. | Before 9.8 step (1) |
| Anything, before Stages 4 and 5 are in the deployed build | Today's mappers send wrong fields and labels (R-7). | Stages 4 and 5; 7.3 |

### Smallest production-ready scope

New BT/RBT and BCBA hires only (9.8 step 1). The gate checkbox is set only on records United Care confirms are not in CR, and never on a person who already has an employee record. The integration creates them with the temporary ID, updates them, and manages labels only on the contacts it made. New Cases come second (step 2). Records that existed in CR before go-live come last (step 3), one confirmed batch at a time.

## 18. Hand-off brief for the builder agent

The builder is a Claude agent at high effort that the orchestrator starts in the background with a fresh context, one lane per agent, with staggered starts. The model per lane is in section 17 (wave 2: lane D Sonnet 5.5, lane E Opus 5.5). The orchestrator gives it one short packet: this brief, its lane from section 17, its plan rows and the guide rows they cite, and where it works (the lane's worktree, or the main working copy on `architecture-update`). Its lane is reviewed once by Opus 5.5 at high effort; a re-review follows only a high finding.

**Brief.**

1. You are building one lane of an integration that writes to a production system. Read these first, in full: this file's sections 2 to 5, section 9 for the requirement IDs your rows cite, the stage sections for your rows, your lane in section 17, and `guide-extract-2026-11-20.md` for the guide rows your requirements cite. Read the source files your lane owns before changing them.
2. Obey the hard stops in section 2. In particular: no live API calls (a production fact you need is listed in your stage report, and the orchestrator reads it under hard stop 2 and decision 33); no `func start`, no deploy, no git commands that change anything (no add, commit, push, checkout, stash, reset), and do not open `.env` or `local.settings.json`.
3. Change only the files your lane owns. If a row cannot be built without a change to another lane's file, do not make it: say so in the report.
4. Work in this order: for every row of your lane, read the guide row its requirement cites, then write the tests from the requirement and the rule text, with the guide's stored values as inputs and the requirement ID first in each title (section 3); run them and see them fail; write the code; run `npm test` until everything passes. For each workflow code file your lane changes, at least one test runs the real path with nothing faked between the mapper and the hash (no fake `hashPayload`, no fake mapper). The Stage 1 review found a defect that every test missed because the hash was faked.
5. Build only your rows. If a rule is unclear, or the code makes a rule impossible as written, do not guess: leave that row unbuilt and say so in the report. Never invent a CR ID, a HubSpot property name or a stored value; use the ones in this file.
6. Keep the change small and readable. Follow the existing style: ES modules, functions passed in through `dependencies` for tests, `safeLog` for logs, field names in logs and reasons, never values. No new packages.
7. Do not weaken or delete a test to make it pass. Change an old test only where this plan changed its rule and your lane owns the file; list each one.
8. Finish with a **stage report**: files changed; each new test title; the `npm test` totals; each old test changed and why; each change you need in a file you do not own; any row not built and why; any app setting added, renamed or retired; questions; and one line confirming that no live call, deploy or git change was made.

## 19. Review brief (the reviewer agent, every lane)

Give the reviewer the lane's diff, this file's sections 2 to 5, section 9, the stage rows of the lane, and the guide rows (`guide-extract-2026-11-20.md`) that the lane's requirements cite. Do not give it the builder's stage report or any conclusion. The orchestrator then confirms each finding by running code before it reaches Zeke.

1. Re-run `npm test`. Read every changed file in full, not only the diff lines.
2. For each requirement the lane's rows serve: does the code meet the guide row, and does a test that names the requirement prove it with the guide's stored values? Name any requirement with no test, any test that proves the plan's wording but not the guide row, any place the plan row and the guide row disagree, and any rule that is proven only through a faked hash or mapper.
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
