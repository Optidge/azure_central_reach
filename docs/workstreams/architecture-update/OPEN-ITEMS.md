# Open items — HubSpot → Azure → Central Reach

Dated 2026-11-16. This is the short list. The detail, evidence and history for each id are in [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md) (the tracker). Ids (`Q…`, `S…`, item numbers) match the tracker.

State of the work: slice 1a (`5c4ee8f`) and the employee changes of 2026-11-16 are committed and pushed on `architecture-update`; `npm test` passes (120). Nothing is deployed. Nothing has been written to Central Reach (CR), HubSpot or Azure from this work.

## 1. Decisions waiting on Zeke

| # | Decision | Recommendation | Id |
|---|---|---|---|
| 1 | A linked employee whose HubSpot `workday_id` differs from the External System ID in CR. CR rejects a changed id by API. | Stop that record's update, mark it `blocked` with a plain reason so it shows in the failures report, no retries. Today the code updates anyway and logs a warning. | Q30 |
| 2 | Employee contact form by state. Today every BT/RBT is created with `Behavior Technician NY` and every BCBA with `Admin`. | Pick by type and home state: BCBA NY → `BCBA NY`, BCBA CO → `BCBA CO`, RBT CO → `RBT CO`. Keep today's form for the rest until United Care answers (section 3). | Q29 |
| 3 | A throwaway CR employee and a go-ahead for the CR behavior tests (section 5). Each test is a production CR write. | One test employee is enough. | Q25, Q6 |
| 4 | Guide edits not yet made: the failures report (sandbox and production), the dead-letter email alert, the add-only label rule, the Workday ID mismatch rule, the contact form table. | Make them in one pass after decisions 1 and 2. | Q22, Q29, Q30 |
| 5 | Keep the labels the code adds that the guide does not list (All Clients `1052619`, All Employees `1052618`, Clinical `1052643`)? | — | Q14 |
| 6 | Guide conflict: "No production rollout is authorized" against Danny's 11/14 "clear to finish". Which governs? | — | Q19 |
| 7 | Case `updated_by_integration` is a Yes/No checkbox in production; the code writes `true`. Needs a test. | — | Q20 |
| 8 | Repo docs fixes (`SOURCE-OF-TRUTH.md`, three `README.md` lines). | Fix with the next docs commit. | Q12 |
| 9 | Production test-record gate: global switch or a list of record ids. | Decide at production testing. | Q26 |

## 2. HubSpot and Azure setup (Zeke)

**HubSpot**

- Create `date_of_birth` on production BCBA `2-48354212` as a property sync from the associated Contact, the same as BT/RBT. It has only `dob` today. (Q28)
- Create sandbox test records in `52311591`: at least one BCBA and one BT/RBT, each with `workday_id`, a first and last name, an email and a date of birth. The sandbox has none.
- Build the HubSpot failures report in the sandbox: one per object, `last_sync_status` = error. (Pre-start gate 7)
- Create the sandbox Contact workflow. It blocks slice S4.
- Put the `52311591` token in `local.settings.json`. (Q24)
- `crm.objects.owners.read` on the sandbox and production apps; Danny is adding it. (Q8)

**Azure, the pre-start gate.** `centralreachserverless` stays Stopped until all seven are done:

1. App settings for sandbox `52311591` (portal id, both object type ids, token, webhook secret).
2. Remove the six unused pipeline and stage-allowlist settings.
3. Keep `AzureWebJobs.intakePoller.Disabled` = `true`.
4. Purge both dead-letter queues (406 and 628 old-sandbox messages). Never replay them.
5. Deploy a build that contains slice 1a and record the package or commit. (Q21)
6. One email alert: dead-letter count above zero on either queue.
7. The HubSpot failures report (above).

## 3. Questions for Danny, Sara and United Care

| # | Question | Id |
|---|---|---|
| 1 | Employee date of birth: keep the `01/01/2000` placeholder for a blank value, or require a real date before a create? | Q28 |
| 2 | Contact forms: (a) a Colorado BT who is not an RBT: `RBT CO` or `Behavior Technician NY`? (b) a New York RBT: `RBT NY` or `Behavior Technician NY`? (c) New Jersey staff, and BCBAs with another or no home state: which form? | Q29 |
| 3 | Outgoing Supervising BCBA with no removal date; which property holds the removal date; SUB and On Leave handling; the Grad Permit marker. | Q3 |
| 4 | Funding labels for Aetna or Cigna in NJ, Aetna in CO, and Other; how commercial insurer options map to the stateless labels; targets for MCD-NJ and Horizon-NJ. | Q4 |
| 5 | CR ids for the six staffing labels, and whether they sit under a new Staffing Status group. | Q5 |
| 6 | Supervising BCBA metadata `131308`: how the HubSpot text is matched to a CR provider. | Q9 |
| 7 | Which property picks the Medicaid or commercial physician and NPI pair; the metadata ids for the two ASD date fields. | Q13 |
| 8 | `service_address__other`: combined Other Location address, or Address 2? What decides "BT works at Location #2"? | Q15 |
| 9 | `insurance_id_3` Client mapping. | Q16 |
| 10 | CR label ids missing from the guide (NJ Client, NJ Employee, Behavior Technician CO / NY / NJ, RBT NJ, BCBA Colorado, BCBA LBA NJ, funding labels, Carelon, Billing Hold Medicaid). | Q17 |
| 11 | Is a staff-facing Case History Log or a destination audit required? Optional today. | Q7 |

## 4. Code still to build, in order

| Order | Slice | What it covers | Waiting on |
|---|---|---|---|
| 1 | S1b Durable state and retries | No expiry on the link and baseline; blocked as its own state; lease owner check; retries at 1 min, 5 min, 15 min, 1 h, 4 h, then dead-letter; a read-only lookup before a create | Go-ahead |
| 2 | S5 + S6 Poller and call reduction | Hourly checkpointed safety poller; a no-op writes nothing; one-call metadata update | — |
| 3 | S2 Case mappings | Every `[GER-CASE]` row and the Case labels with known ids | Q8, Q9, Q13, Q15, Q16 for their rows |
| 4 | S3 Employee mappings | Names from `first_name` + `last_name`; BCBA email from `ucaba_email_address`; BCBA gender, address and Salaried; BT home state and work address; email check before a create; contact form by state (Q29); Workday ID mismatch rule (Q30); remove the BCBA field the guide excludes | Q29, Q30 |
| 5 | S4 Contact routing | Guardian and BCBA Contact changes reach the linked record | The sandbox Contact workflow |
| — | Required before production | Remaining label rows (add-only), Care Coordinator, failures report and alert in production, the test-record gate | Sections 1 and 3 |
| — | Optional | Destination audit, Case History Log, managed identity, API version migration | Deferred |

## 5. Central Reach behavior not yet tested

Each is a production CR write on a throwaway employee, except (d), which is read-only.

- (a) How a metadata value is cleared, and whether an empty value works.
- (b) Whether the labels POST replaces the whole set or only adds.
- (c) What a 409 on create matches on: external id, email or name.
- (d) What the by-external-id GET and PUT return when nothing matches.
- (e) Whether an update accepts a changed `PrimaryEmail`. The External System ID test's error text names it.
- (f) Whether the API accepts each contact form name exactly as the add-employee screen shows it (`BCBA NY`, `BCBA CO`, `RBT CO`).

Already tested (Zeke, 2026-11-16, employee `5324521`): an update with a different External System ID returns 400 and the stored id does not change.

## 6. Known gaps in what is built today

- A blank employee email is not caught before the create; CR rejects it and the record shows a sync error.
- A one-word employee name sends no last name; CR rejects the create. Fixed by S3 (names from `first_name` + `last_name`).
- A blank client date of birth is not caught before the create; CR rejects it.
- BCBA primary email is read from `work_email`; the guide says `ucaba_email_address`. Fixed by S3.
- Labels are only added, never removed (Zeke's decision, Q22). The guide's replace-and-remove rules are not met until test (b) shows whether removal is possible.
- Employees created by earlier tests carry old HubSpot record ids as their External System ID in production CR. Zeke: all are test records. A lookup by `workday_id` will not match them.
