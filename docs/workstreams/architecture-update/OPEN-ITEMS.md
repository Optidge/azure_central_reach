# Open items — HubSpot → Azure → Central Reach

Dated 2026-11-18. This is the short list. The detail, evidence and history for each id are in [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md) (the tracker). Ids (`Q…`, `S…`, `V…`, item numbers) match the tracker. `V…` ids are findings from the final review round, in the tracker's "Final review, round 2".

State of the work: slice 1a (`5c4ee8f`) and the employee changes of 2026-11-16 (`e1db83a`) are committed and pushed on `architecture-update`; `npm test` passes (120). The final review by Grok and GPT Pro and Danny's 2026-11-17 Workday ID message are verified and recorded. Nothing is deployed. Nothing has been written to Central Reach (CR), HubSpot or Azure from this work. Code is paused until decisions 1–4 below. **The plan from here to production is [BUILD-PLAN.md](BUILD-PLAN.md), final as of 2026-11-18.** It is self-contained for the builder: full build first (six code stages), then the final sandbox test plan and a deploy while the app is Stopped, then sandbox testing with test records only (`sandbox_test_field` = true), then production readiness. The builder is Grok 4.6 on high, run by Zeke in Cursor; Claude reviews each stage. United Care's answers block production only. Zeke answered the open questions from the guide review ([guide-review-2026-11-18.md](guide-review-2026-11-18.md)) on 2026-11-18; they are in section 1, row 13. The matching guide notes (24) were added to the guide on 2026-11-18 with his approval; the record is [guide-inserts-2026-11-18.md](guide-inserts-2026-11-18.md), and [guide-extract-2026-11-18.md](guide-extract-2026-11-18.md) is the builder's read-only copy of the updated guide. **Stage 1 (2026-11-18):** built by Grok, reviewed by Claude, and the six review findings are fixed (section 6). `npm test` 237 pass. Committed on Zeke's word on 2026-11-18, in the commit after `c083d70`. Follow-ups for later stages are in section 1, row 20. Where the sections below say "Code is paused" or name slices S1b-1 to S4, read BUILD-PLAN Stages 1 to 6.

## 1. Decisions waiting on Zeke

| # | Decision | Recommendation | Id |
|---|---|---|---|
| 1 | **Sync status values.** A create CR rejects is saved as `blocked`, so it is not in the failures report (`error` only). Danny wants a blank Workday ID held, not failed. | Three values: `success`, `error` (the failures report), `waiting` (held on purpose; reason in `last_sync_error`; no retry, no dead letter). Retire `blocked`. `last_sync_status` is free text, so HubSpot needs no change. **Decided 2026-11-17 (Zeke): yes, for now.** | Q31, V2, V3 |
| 2 | **A linked record whose HubSpot id and CR id disagree.** Employee: `workday_id` against CR's External System ID. Client: the Case record id against CR's `ExternalSystemId`. Today the employee update runs with a logged warning; the client update has no check. | When both ids are filled and differ: no CR write, mark `error`, no retry. **Decided 2026-11-17 (Zeke): yes, for now.** One linked production record shows this mismatch today: BT/RBT `50160788279` (HubSpot `workday_id` is not a Workday ID; CR holds a 7-digit External System ID). Under this rule it stops with `error` until corrected (section 3, question 15). Danny's two mismatched BT records are not linked, so this rule does not touch them (section 3, question 2). | Q30, V4 |
| 3 | **Which records may sync on the first start.** The sandbox holds 1,553 Cases, and every CR write is production. This reopens the 2026-11-16 "no test gate in sandbox" decision. | **Decided 2026-11-17, and set up (Zeke):** lists `1463` Sandbox Test - Deals, `1464` Sandbox Test - BCBAs, `1465` Sandbox Test - BT/RBTs in `52311591`. No allowlist in code. A segment per sandbox object holds Zeke's test records, and every workflow that sends a webhook filters on it, the ongoing-update workflows included (confirmed by Zeke). The segment does not limit the poller, so the poller stays disabled in the sandbox until its limit is decided. | Q26, V7 |
| 4 | **Go-ahead to build slice S1b-1** (section 4). It is the set of checks both reviewers want before any start. | **Paused by Zeke 2026-11-17** until the open items here and in section 3 are clarified. Decisions 1 to 3 are now in. What remains is with Danny (section 3) and does not change what S1b-1 builds. **Closed 2026-11-18: go-ahead given; it is BUILD-PLAN Stage 1 (row 13).** | S1b-1 |
| 5 | **Guide edits.** The guide's three External System ID rows (`[GER-REQ]`, `[GER-BCBA]`, `[GER-BT]`) now describe Danny's hold. | The three Workday ID rows were updated on 2026-11-17 with Zeke's go-ahead, with a dated entry in the guide's Change Log tab. On Zeke's request the same day, the guide also received the 11/17 block `[G17]` (mapping, hold, status values, ID mismatch, existing CR employees, sandbox segment), Danny's message `[C17]`, the open questions in section 10 and the approved design in the architecture tab. Still not in the guide: the label replace-and-remove wording (waits for CR test b). | Q22, Q23, Q30, Q31 |
| 6 | **A throwaway CR employee, and a go-ahead for the CR behavior tests** (section 5). Each test except (d) is a production CR write. | One test employee covers (a), (b), (c), (e) and (f). | Q25, Q6 |
| 7 | Keep the labels the code adds that the guide does not list (All Clients `1052619`, All Employees `1052618`, Clinical `1052643`)? | Keep. Evidence 2026-11-17: a real BT in CR (Zeke's screenshot) carries All Employees and Clinical next to Behavior Technician NY and NY Employee. | Q14 |
| 8 | Guide conflict: "No production rollout is authorized" against Danny's 11/14 "clear to finish". Which governs? | — | Q19 |
| 10 | **BT/RBT are created in CR before the Workday ID exists (United Care, 2026-11-17).** CR rejects a create with an empty External System ID, and the API cannot change it later; a person can change it on the CR profile (all tested). | **Decided 2026-11-17 (Zeke), for now:** the integration creates the employee with the HubSpot record id as a temporary External System ID; staff replace it with the Workday ID on the CR profile and tick the checklist option; the integration then checks the two match. This replaces Danny's hold. Reply sent to Sara and Danny; their agreement is pending. | Q35 |
| 9 | Repo docs fixes (`SOURCE-OF-TRUTH.md`, three `README.md` lines). | Fix with the next docs commit. | Q12 |
| 11 | **Production: checklist ticks on existing employees (noted 2026-11-18, to be decided for production).** If Danny's Workday ID alerts cover BTs already in Workday, staff will tick External System ID (Workday) on up to 264 existing records. Those employees are not to be touched (Q33). | Decide at production readiness (BUILD-PLAN step 9.2): the production gate keeps existing employees out until United Care confirms them. | Q33, Q36 |
| 12 | **Staffing labels and add-only (new 2026-11-18).** The six ids are supplied (Q5). A Case holds one staffing label at a time, so add-only would leave old staffing labels on the client. | **Decided 2026-11-18 (Zeke):** build the staffing label row after CR label test (b). The six ids are in `src/constants/centralReach.mjs` as constants only. Still open: if CR cannot replace labels, send add-only or hold the row. | Q5, Q22 |
| 13 | **Zeke's answers of 2026-11-18 (all decided, as recommended).** | (a) Temporary-ID rules for BT/RBT and BCBA: `waiting` right after the create; updates continue while `waiting`; checklist ticked while CR holds the temporary ID is `error`; a second record with the same Workday ID is `error`. (b) A Workday ID that finds an employee already in CR: no link, no CR write, `waiting`; a match on the record's own HubSpot ID still links. (c) Record gate in code: app setting `SYNC_RECORD_GATE_PROPERTY` (`sandbox_test_field` in the sandbox); workers and poller skip every other record. (d) Sandbox test records leave `test_record` blank. (e) The create signal stays Entered in CentralReach = Yes, in one place in code. (f) Go-ahead to build Stage 1 onward (this closes decision 4). | Q35, Q32, Q26, Q36, review F01, F02, F16 |
| 14 | **Guide inserts.** 24 dated, insert-only notes (review findings F01 to F11, F15, F16, and the Active / Inactive hold); the record is [guide-inserts-2026-11-18.md](guide-inserts-2026-11-18.md). | **Done 2026-11-18 (Zeke approved all 24):** applied in one revision-guarded batch and verified by a re-read. Left for a later pass: review findings F12 to F14 and F17 to F24. | Review F01–F16 |
| 15 | **Active / Inactive label and add-only.** Add-only leaves both labels on a client after a status change, the same problem as the staffing row (decision 12). | **Decided 2026-11-18 (Zeke): hold it until the CR label test.** Nothing is sent to CR for `case_status` until then; it is built with the staffing row after the test (BUILD-PLAN Stage 8). | Q22 |
| 16 | **81 of 100 sampled HubSpot Client IDs do not resolve in CR** (`GET /contacts/client/{id}` returned 404; read-only check 2026-11-18). Cause unknown. | Compare a few in the CR screen before linked Case updates are turned on in production (BUILD-PLAN step 9.3). Not a build blocker. | Q33 |
| 17 | **Two optional go-aheads that help Stages 4 and 5:** the CR label test on a test employee Zeke names (a production CR write), and a read-only read of the CR label and metadata catalog. | **Zeke, 2026-11-18: both are done in Cursor.** Most label and field IDs in the plan come from repo notes of 2026-10-27 and are marked unconfirmed until the catalog read. The label test runs only on Zeke's word and on the record he names. | Q6 (b), Q17 |
| 18 | **Stage 1 fixes (new 2026-11-18).** The review found S1-R1 (high), S1-R2 and S1-R3 (medium), S1-R4 to S1-R6 (low); see section 6. | **Done 2026-11-18 (Zeke: "fix all"):** all six fixed by Claude with tests, `npm test` 237 pass. Committed on Zeke's word the same day. | S1-R1 to S1-R6 |
| 19 | **Sandbox record convention, four points. Confirmed by Zeke 2026-11-18 and written into [SANDBOX-TEST-PLAN.md](SANDBOX-TEST-PLAN.md) and the test log.** The recommendation as accepted: | (a) The Case and the BT/RBT share one email in a round. What a CR 409 matches on is not tested (section 5, c), so give the BT/RBT its own address, for example `zeke+bt_azure_test_N@optidge.com`. (b) `workday_id` has no rule. Blank tests the temporary-ID path only. For the Workday ID tests use a made-up value that cannot be a real Workday ID or a HubSpot record ID, for example `AZTEST-N-BT` and `AZTEST-N-BCBA`, new each round, because CR keeps it for good. (c) No state is set, so only the base labels are tested. Add `location_home` (BT/RBT), `home_state` (BCBA) and `location` (Case) = New York, and `bt_rbt_type`. (d) Each round leaves three contacts in production CR; the integration never deactivates. Add a step to make them inactive in CR after the round and a column for it in the log. Also untested: whether CR accepts `#` in a name. | Stage 7, Stage 8 |
| 20 | **Follow-ups from the Stage 1 review that belong to later stages (new 2026-11-18).** None blocks the Stage 1 commit. | Each is written into BUILD-PLAN: (a) Stage 3, step 3.7: a `waiting` record rewrites its status each run, and an `error` record whose updates continue re-sends the CR update each run. (b) Step 7.1: re-check the convention's property names after Stage 5. (c) Step 7.4: one read-only GET of a contact's labels before round 1, to confirm the field is `labelId`. (d) Stage 8: confirm the employee read and client lookup answer shapes, the same-Workday-ID timing, `#` and `+` in names and emails, and the cleanup. (e) Step 9.8: the Workday ID format check before production; it also closes the temporary-ID collision risk. | BUILD-PLAN 3.7, 7.1, 7.4, Stage 8, 9.8; Q34 |

Closed 2026-11-18: review F15 (no sampled CR client holds its Case record ID, so the Case mismatch rule does not stop hand-created clients); the Q26 poller limit (record gate); the stop for a second record with one Workday ID (Q32, decided).

Closed since the last version: Q26 (decision 3, segment gate), Q32 (each employee record has its own Workday ID; two production pairs moved to section 3), Q20 (Case `updated_by_integration` accepts `true`; property read 2026-11-17). The contact form (Q29) moved to section 3: the earlier "by home state" recommendation is withdrawn until United Care names the deciding property.

## 2. HubSpot and Azure setup

**HubSpot (owner: Zeke unless named)**

| Step | Portal | Done when | Id |
|---|---|---|---|
| The ongoing-update employee workflows send a webhook when `workday_id` or the checklist property (`btrbt_in_cr_checklist`, `bcba_in_cr_checklist`) changes, so the id check re-runs. Changed 2026-11-17 with the temporary-id rule (Q35): there is no held record to release any more. The documented trigger lists do not include these properties. | Sandbox now; production at rollout | Filling the Workday ID, and ticking the checklist, each update the record's sync status (BUILD-PLAN tests T7 to T9) | Q35, gate 12 |
| Test-record segment for Case, BCBA and BT/RBT, used as a filter in every workflow that sends a webhook to Azure | Sandbox | Three segments exist and each webhook workflow filters on its segment | Q26, gate 9 |
| Failures report, one per object: `last_sync_status` = `error`, showing `last_sync_error` | Sandbox now; production at rollout | The report exists for Case, BCBA and BT/RBT | Gate 7 |
| Waiting view, BCBA and BT/RBT: `last_sync_status` = `waiting` | Sandbox now; production at rollout | The view exists (after decision 1) | Q31 |
| Sandbox test records: the seven listed in BUILD-PLAN.md Stage 0 (blank and filled `workday_id`, a missing email, a shared Workday ID, one Case, one record outside the segment). The three lists filter on `sandbox_test_field` = true and were empty on 2026-11-17 (read-only check). | Sandbox | Records exist and are in the test segment (decision 3) | — |
| `date_of_birth` on production BCBA `2-48354212`, as a property sync from the associated Contact. It has only `dob` today. | Production | The property exists and fills from the Contact | Q28 |
| Confirm the BCBA personal-email sync property. The guide says "planned, creation unconfirmed". | Both | Confirmed or created, before S4 | V20 |
| Sandbox Contact workflow | Sandbox | The workflow exists. Blocks live testing of S4. | — |
| `52311591` token in `local.settings.json` | Local | `func start` reads the sandbox portal | Q24 |
| `crm.objects.owners.read` on the sandbox and production apps (owner: Danny) | Both | Scope added | Q8 |

**Azure (owner: Zeke or an agent with Azure access).** `centralreachserverless` stays Stopped until every step is done. Values are Grok's read-only reading on 2026-11-17.

Before deploying:

1. App settings for sandbox `52311591` (portal id, both object type ids, token, webhook secret). Today: retired portal `50850427` and the old object types.
2. Remove the six unused pipeline and stage-allowlist settings. Today: all six present.
3. `AzureWebJobs.intakePoller.Disabled` = `true`. Today: `false`, so a start would run the poller.
4. Purge both dead-letter queues (406 and 628 old-sandbox messages). Never replay them.
5. Deploy a build and record the package or commit. (Q21)
6. One email alert: dead-letter count above zero on either queue. Today: no alert rule, and the action group has no email receiver.
7. The HubSpot reports above.

Before starting (added 2026-11-17):

8. The deployed build contains slice S1b-1.
9. The test-record segment filters every webhook workflow (decision 3). The poller stays disabled (step 3) and the HTTP test functions are not called.
10. Any worker not under test is disabled, and `ALLOW_EMPLOYEE_CREATE` and `PUT_ONLY_MODE` are set on purpose. Today they are `true` and `false`, which allows creates.
11. Both queues show 0 active messages; the Cosmos container holds no items left from `50850427`.
12. The Workday ID and checklist workflow trigger above.

## 3. Questions for Danny, Sara and United Care

Zeke, 2026-11-17: the Workday ID items (questions 1 to 4 and 15) are pending follow-up. Nothing is built for them, and the `workday_id`, `external_system_id` and `employee_id` values on existing production records are left as they are, until the client answers. This includes the six production BT/RBT records with a hand-typed `employee_id`: they are not updated until United Care confirms each one.

| # | Question | Owner | Id |
|---|---|---|---|
| 1 | Does the Workday ID exist before the CR step, or is it created later? Danny emailed Sara 11/17. If earlier, Danny adds a HubSpot check so the CR status cannot be set without it. | Sara | Q23 |
| 2 | The two BT records whose External System ID does not match the Workday ID. Checked in production 2026-11-17 (HubSpot BT/RBT records `53650602843` and `56690993076`): both have a Workday ID and Entered in CR = Yes, and `employee_id` is blank, so HubSpot is not linked to their CR employee. **Update 2026-11-17:** HubSpot `external_system_id` is typed by hand (all 79 values, one HubSpot user), not synced from CR, and the integration does not read it. So these two are typing errors in HubSpot, not CR data. United Care corrects or clears the two HubSpot values; whether CR holds their Workday ID is part of the go-live check (question 4). Zeke, 2026-11-17: existing CR employees are not created, linked or updated for now. | Danny / United Care | Q33 |
| 3 | Zeke's rule (2026-11-17): each HubSpot employee record has its own Workday ID. Production has 2 Workday IDs that are on both a BCBA and a BT/RBT record. Pair 1 (BT/RBT `45909102183`, BCBA `63969342976`): the BT/RBT is "No- Made Inactive", the BCBA is Yes (safe). Pair 2 (BT/RBT `60175644722`, BCBA `60455522203`): both are Yes. For pair 2, which record is the right one, and what happens to the other? And for both: when a BT becomes a BCBA, does United Care change the existing CR employee or add a second one and make the first inactive? If a second one, does the old one keep the Workday ID as its External System ID? The integration finds the CR employee by Workday ID, so two CR employees with one id could send the BCBA's data to the old BT employee. Zeke, 2026-11-17: either confirm that CR can hold two employees with the same Workday ID, or decide a solution. The question is in the guide's section 10; not yet sent to Danny directly. CR check 2026-11-17: CR holds no employee under either Workday ID today, so nothing collides yet; a read-only name search of all 895 CR employees found neither person. Proposed, not decided: the first eligible record creates one CR employee, and the other record of pair 2 stops with `error` until United Care picks the record. | Danny / United Care | Q32 |
| 4 | Production link backfill: before employee create is turned on in production, every employee already in CR needs its CR id in HubSpot `employee_id` or its Workday ID in CR. 108 of 200 sampled CR employees have no External System ID. In production HubSpot, 515 employee records with Entered in CR = Yes have a blank `employee_id` (405 BT/RBT, 110 BCBA); 5 are linked. Agree the method: a one-time match of a CR export against HubSpot, reviewed by United Care. Evidence 2026-11-17: of the six production employees whose CR id is already in HubSpot, four have no External System ID in CR. **Zeke, 2026-11-17: handled at go-live. Before production creates are turned on, check which employees are already in CR and decide per discrepancy.** | Zeke / Danny | Q33, V6 |
| 5 | Employee date of birth: keep the `01/01/2000` placeholder for a blank value, or require a real date before a create? | Danny | Q28 |
| 6 | Contact forms: the full table of employee type and state → form, and which property decides the state (Work State `location` can hold several). Cases to cover: BCBA in NY or CO; RBT in CO; a CO BT who is not an RBT; a NY RBT (`RBT NY` or `Behavior Technician NY`); NJ staff; several Work States; none. | United Care via Danny | Q29 |
| 7 | Outgoing Supervising BCBA with no removal date; which property holds the removal date; SUB and On Leave handling; the Grad Permit marker. | United Care | Q3 |
| 8 | Funding labels for Aetna or Cigna in NJ, Aetna in CO, and Other; how commercial insurer options map to the stateless labels; targets for MCD-NJ and Horizon-NJ. | United Care | Q4 |
| 9 | ~~Should the six staffing labels sit under a new Staffing Status group in CR?~~ **Answered 2026-11-18 (Zeke):** created under the parent label Staffing Status (`1156741`). | Done | Q5 |
| 10 | Supervising BCBA metadata `131308`: how the HubSpot text is matched to a CR provider. | Zeke / Sara | Q9 |
| 11 | Which property picks the Medicaid or commercial physician and NPI pair. | Zeke / Sara | Q13 |
| 12 | `service_address__other`: combined Other Location address, or Address 2? What decides "BT works at Location #2"? | Sara | Q15 |
| 13 | `insurance_id_3` Client mapping. | Zeke / Sara | Q16 |
| 14 | Is a staff-facing Case History Log or a destination audit required? Optional today. | United Care | Q7 |
| 16 | Danny's follow-up to United Care, 2026-11-17, awaiting answers: how often the Workday ID checks repeat after the third escalation, and whether business hours only; whether the alerts cover only BTs entered in Workday from now on or also those already missing a Workday ID; date of birth: entered in HubSpot at onboarding or another source (no Workday connection exists); which value is right on BT/RBT `53650602843` and `56690993076`. | Danny / United Care | Q35, Q28 |
| 17 | Zeke's reply to Sara and Danny, 2026-11-17: does anything read CR's External System ID before the Workday ID is entered (payroll export, report)? Do BCBAs follow the same order as BTs? | Sara / Danny | Q35 |
| 18 | Create signal (new 2026-11-18, Danny to Sara): now that staff no longer create employees in CR by hand, is Entered in CentralReach = Yes still the right signal for the integration to create the employee, or is there an earlier point, for example a stage? Until answered, the signal stays Entered in CentralReach = Yes. Danny's 2026-11-18 message to Sara also re-asks rows 16 and 17; none is answered yet. His Workday ID alerts are built in production HubSpot (workflow `1929214033`) and switched off until Sara answers. | Sara, then Zeke | Q36 |
| 15 | Workday ID format. 640 of 644 production values are 7 digits. 4 are not: BT/RBT `50160788279` (linked, Yes; the value is in the pattern ###-##-#### and may be a Social Security number), BT/RBT `56690814034` (5 digits), BT/RBT `56693572653` and BCBA `45942219038` (text followed by 7 digits). Please correct these 4, the first one soonest, and confirm the format so the integration can reject anything else before it reaches CR. The check is pending until the format is confirmed (Zeke, 2026-11-17). For `50160788279`, CR already holds a 7-digit External System ID on the linked employee; that is likely the right Workday ID for HubSpot. | Danny / United Care | Q34 |

**Lookups, not business questions** (a read-only CR catalog read, or the export `all_labels_v4.json`; owner: the integration, with Zeke's go-ahead for the read):

- ~~CR ids for the six staffing labels.~~ Supplied by Zeke 2026-11-18: Pending 97151 Services `1156742`, 97151 Services `1156743`, Pending 97153 Services `1156744`, Starting 97153 Services `1156745`, Staffed 97153 `1156746`, X 97153 `1156747`. (Q5)
- CR label ids missing from the guide: NJ Client, NJ Employee, Behavior Technician CO / NY / NJ, RBT NJ, BCBA Colorado, BCBA LBA NJ, the funding labels, Carelon, Billing Hold Medicaid. (Q17)
- The metadata ids for the two ASD date fields. (Q13)

## 4. Code still to build, in order

Owner: the integration session. Building a slice is not permission to run it: a sandbox start needs S1a, S1b-1 and the test segment on every webhook workflow, with the poller off; a production start needs every slice and the "required before production" row.

| Order | Slice | What it covers | Waiting on |
|---|---|---|---|
| 1 | **S1b-1 Create and identity checks** (new) | Labels: read the current set, then post the union (V1). A rejected create is an `error` (V2). A blank Workday ID no longer holds the record: the create sends the HubSpot record id as a temporary External System ID, the lookup before a create checks both ids, and a linked employee whose CR id is still the temporary one is `waiting` (Q35; this replaces V3's hold). A linked update stops when the HubSpot and CR ids differ, employees and clients (V4). A read-only lookup before a create; no link to a CR employee another HubSpot record already holds; create lock on the Workday ID (V5). A blank date of birth is left out of updates; an unparseable or missing one is an error (V9, V10). The stored email is read from every response shape (V11). The six employee and four client create fields are read from the guide's sources and checked before a create (V17). No record allowlist: the sandbox is gated by the test segment (decision 3). | Zeke's go-ahead (decision 4); decisions 1 to 3 are in |
| 2 | S1b-2 Durable state and retries | No expiry on the link and baseline; baseline tied to the CR id (V14); the external id of a pending create saved before the POST (V13); lease owner check; retries at 1 min, 5 min, 15 min, 1 h, 4 h, then dead-letter, with the attempt number in the message (V16, V18) | — |
| 3 | S5 + S6 Poller and call reduction | Hourly checkpointed safety poller that also releases `waiting` records; daily sweep of linked records; a no-op writes nothing, and only when HubSpot holds the CR id (V15); one-call metadata update once tested | — |
| 4 | S2 Case mappings | Every `[GER-CASE]` row and the Case labels with known ids | Q8, Q9, Q13, Q15, Q16 for their rows |
| 5 | S3 Employee mappings | BCBA gender, address and Salaried; BT home state and work address; BT role and state labels; contact form; remove the BCBA field the guide excludes | Q5, Q29 |
| 6 | S4 Contact routing | Guardian and BCBA Contact changes reach the linked record | The sandbox Contact workflow; V20 |
| — | Required before production | Remaining label rows (add-only), Care Coordinator, the reports and alert in production, the production link backfill (Q33), the Workday ID trigger on the production workflows | Sections 1 and 3 |
| — | API version migration | Separate workstream. Needs an owner and an endpoint list; target before March 2027. | Zeke to name an owner |
| — | Optional | Destination audit, Case History Log, managed identity | Deferred |

## 5. Central Reach behavior not yet tested

Owner: Zeke decides; the integration session runs them only with his go-ahead. Every test is a **production CR write**, except (d).

- (a) How a metadata value is cleared, and whether an empty value works.
- (b) Whether the labels POST replaces the whole set or only adds. S1b-1 is safe under both; the answer decides whether a label can ever be removed. Zeke, 2026-11-17: this test is the final say on the label rules. Until it is run, labels are add-only. If CR lets the integration replace a record's label set, the guide's replace-and-remove rules apply as written; if not, the previous label stays until staff remove it in CR.
- (c) What a 409 on create matches on: external id, email or name.
- (d) **Answered 2026-11-17 (read-only):** `GET /contacts/employee/byExternalSystemId?ExternalSystemId={id}` returns 200 with the employee, active or inactive, and 404 `NotFound` when nobody holds the id.
- (e) Whether an update accepts a changed `PrimaryEmail`.
- (f) Whether the API accepts each contact form name exactly as the add-employee screen shows it.
- (g) Whether an update may set an External System ID on an employee that has none. Needs a real employee with no id in CR and a known Workday ID.
- (h) Whether a client update accepts a changed `ExternalSystemId`. Needs a throwaway client.
- (i) Whether CR accepts a second employee with an External System ID another employee already holds (Q32). A production create; needs a throwaway employee. Separately, a read-only by-external-id GET for the two shared Workday IDs would show how CR holds those two people today; it needs only Zeke's go-ahead.

Already tested (2026-11-17, with Zeke's go-ahead): an employee create with the External System ID omitted, empty, null or blank returns 400, "The ExternalSystemId cannot be empty." Nothing was created.

Already tested (Zeke, 2026-11-16, employee `5324521`): an update with a different External System ID returns 400 and the stored id does not change; the by-external-id PUT with an id nobody holds returns 404.

## 6. Known gaps in what is built today

Each is fixed by the slice named. Until then the app stays Stopped.

- A blank Workday ID fails the record and dead-letters the message. Decided 2026-11-17: create with the HubSpot record id as a temporary External System ID instead (Q35, S1b-1).
- Sandbox BCBA has no `work_email` property, which is where the code reads the BCBA email; a sandbox BCBA create cannot pass until the email comes from `ucaba_email_address` (read-only check 2026-11-17; V17, S1b-1).
- A `workday_id` that is not a Workday ID is sent to CR as the External System ID as typed. Four production records hold one; one is in the pattern ###-##-####. (Q34)
- A create CR rejects (blank email, one-word name, a 409) is saved as `blocked`, not `error`, so it is missing from the failures report. (V2, S1b-1)
- Labels are posted without reading the current set. If the POST replaces the set, staff-added labels are removed. (V1, S1b-1)
- A wrong CR id typed into HubSpot is used as the update target. Employees get a logged warning only; clients get no check. (V4, S1b-1)
- Two HubSpot employee records with the same Workday ID update one CR employee. (V5, S1b-1)
- A blank date of birth is sent as `null` on employee updates; CR may clear the stored date. An unparseable date is treated as blank. (V9, V10, S1b-1)
- Names come from `bcba_name` / `bt_name`, and BCBA email from `work_email`; the guide says `first_name`, `last_name` and `ucaba_email_address`. Email, last name and client date of birth are not checked before a create. (V17, S1b-1)
- An employee email changed in HubSpot does not reach CR and shows no error, because updates send the email CR holds. (V12, test e)
- Labels are only added, never removed (Zeke's decision, Q22). The guide's replace-and-remove rules are not met until test (b) shows whether removal is possible.
- Production CR holds employees with no External System ID, and earlier test employees with old HubSpot record ids. A lookup by `workday_id` does not match them, so an unlinked record would get a second employee. (V6, Q33)
- Sync state in Cosmos expires (24 h), retries are immediate, and the poller looks back only 15 minutes. (S1b-2, S5)

### Stage 1 review findings (2026-11-18, uncommitted build)

The gaps above marked S1b-1 are closed in the uncommitted Stage 1 build. **All six findings below were fixed on 2026-11-18, each with a test; none is open.** They stay here as the record of the review. File references and the fixes are in the tracker's two "Stage 1 review" Log entries.

- **S1-R1, high.** Every Case that passes the gate throws `SYNC_STALE` after its CR write, because a date-of-birth status field is in one hash and not the other. No status reaches HubSpot and each retry updates production CR again. Fix before any Case test.
- **S1-R2, medium.** A linked employee with no External System ID in CR and a blank `workday_id` is sent the HubSpot record ID as its External System ID. Rule 5.4 says send nothing. An unreadable CR employee answer is treated the same way.
- **S1-R3, medium.** An `error` the code decides on purpose overwrites the Cosmos record without the CR ID and the saved field hashes. A Cosmos-only link is dropped, and a value blanked in HubSpot may never be cleared in CR.
- **S1-R4, low.** The create lease ends before the CR ID is saved, so a second record with the same Workday ID can show `waiting` in place of `error`. No duplicate.
- **S1-R5, low.** The label read accepts `id` as a label ID before the answer shape is confirmed.
- **S1-R6, low.** The date reader accepts loose values such as `5` as a date.
