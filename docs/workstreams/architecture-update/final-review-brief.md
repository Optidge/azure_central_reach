# Final review brief — UnitedCare HubSpot → Azure → Central Reach

For Grok and GPT Pro. Read-only review. Report in chat. Change nothing.

> **Completed 2026-11-17.** Both reviews were returned and verified. Results are in [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md), "Final review, round 2". This brief is kept as the record of what was asked.

## What you are reviewing

An Azure Functions integration (Node, ESM) for United Care ABA. HubSpot workflows send signed, ID-only webhooks. The Function App queues each ID on Service Bus. Queue workers read the HubSpot record, check eligibility, map fields and write to Central Reach (CR). An hourly poller is a safety net. Cosmos DB holds sync state and locks.

The design was reviewed once on 2026-11-16 and approved by Zeke. Since then slice 1a (duplicate-create safety) was committed and the employee identity rules changed. This is the last review before the design is finalized. The goal is to find what has been missed, not to redesign.

The documents and files are listed in the next section.

## Exactly what to review

**Repository and branch**

- GitHub: `Optidge/azure_central_reach`. Local path: `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`.
- Branch: **`architecture-update`**. Do not review `main`, `sandbox-integration` or any PR branch.
- Code under review: commit **`e1db83a`** ("Map the employee External System ID from the Workday ID and add create-field rules."). The commit before it is `5c4ee8f` (slice 1a). Any commit after `e1db83a` changes only `docs/workstreams/architecture-update/`.

Run these and paste the output in your report:

```bash
git branch --show-current                                   # architecture-update
git log --oneline -3                                        # a docs commit, e1db83a, 5c4ee8f
git diff --stat e1db83a HEAD -- src host.json package.json  # must print nothing
git status --short                                          # must print nothing
```

If the branch is wrong, the `git diff` prints anything, or the tree has changes, stop and report. If you read from GitHub, open the `architecture-update` branch and confirm `src/constants/centralReach.mjs` contains `EMPLOYEE_CREATE_DEFAULT_DATE_OF_BIRTH`. If it does not, you are on the wrong branch or commit.

**Documents, in reading order**

1. `docs/workstreams/architecture-update/final-review-brief.md`: this file.
2. `docs/workstreams/architecture-update/OPEN-ITEMS.md`: every outstanding decision, setup step, question and gap.
3. `docs/workstreams/architecture-update/ARCHITECTURE-REVIEW.md`: the tracker. Read these sections: "Status at a glance", "Requirements this design must keep", "Recommended architecture", "Review results", "Employee ids", "Pre-start gate", "Item tracker" with its gap tables, "Slices, in order", "Open questions" and "Log". Its "For reviewing agents" section is the round-one brief; ignore its branch check.
4. The integration guide: Google Doc `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`, tab "Tab 1" (`t.0`). Read "Business rules", "CentralReach required create fields" `[GER-REQ]`, `[GER-CASE]`, `[GER-BCBA]`, `[GER-BT]` and `[GER-CONTACT]`. When the code or the tracker disagrees with the guide, the guide wins. If you cannot open it, say so and use the tracker's "Requirements this design must keep".

Do not use `docs/workstreams/architecture-update/grok-review-brief.md`; it is the round-one brief and pins an older commit.

**Code files**

Changed in `e1db83a` (read these first):

- `src/constants/centralReach.mjs`
- `src/lib/centralReachClient.mjs`
- `src/mappings/employees/buildEmployeePayload.mjs`
- `src/mappings/employees/validateEmployeePayload.mjs`
- `src/workflows/employeeSyncWorkflow.mjs`
- `src/tests/smoke/employeeGuideMappings.test.mjs`
- `src/tests/smoke/employeePayloadMapping.test.mjs`

The rest of the write path:

- Entry points: `src/functions/hubspotWebhook.mjs`, `src/functions/processClientQueue.mjs`, `src/functions/processEmployeeQueue.mjs`, `src/functions/intakePoller.mjs`, and the HTTP test functions `src/functions/clientSyncHttpTest.mjs`, `src/functions/intakePollerHttpTest.mjs`, `src/functions/connectivityTest.mjs`.
- Workflows: `src/workflows/clientSyncWorkflow.mjs`, `src/workflows/intakePollerWorkflow.mjs`.
- Client mapping: `src/mappings/client/buildClientPayload.mjs`, `src/mappings/client/buildClientMetadata.mjs`, `src/mappings/client/validateClientPayload.mjs`.
- Shared: `src/lib/syncEligibility.mjs`, `src/lib/config.mjs`, `src/lib/cosmosState.mjs`, `src/lib/mappedState.mjs`, `src/lib/retry.mjs`, `src/lib/serviceBusClient.mjs`, `src/lib/hubspotClient.mjs`, `src/lib/hubspotWebhook.mjs`, `src/lib/writebackAllowlist.mjs`, `src/lib/errors.mjs`.
- Constants: `src/constants/hubspot.mjs`, `src/constants/staffingAssociations.mjs`, `src/constants/state.mjs`, `src/constants/queues.mjs`.
- Settings: `host.json`, `local.settings.example.json`, `package.json`.
- Tests that state the safety rules: `src/tests/smoke/duplicateSafety.test.mjs`, `src/tests/smoke/employeeCreateFeatures.test.mjs`.

Do not read `.env` or `local.settings.json`; they hold secrets.

## Hard stops

- No edits to code, docs or config. No git checkout, fetch, pull, stash, commit or push.
- No deploys, restarts or setting changes in Azure. Function App `centralreachserverless` stays Stopped.
- No Service Bus send, receive, peek or settle. Counts only.
- No HubSpot or Central Reach writes. Central Reach has no sandbox: every write is a production write. No `func start`, and no scripts that call live APIs. `npm test` is offline and may be run.
- No secret values, and no patient or staff data, in your report.
- Never use portal `246184070`. Sandbox is `52311591`; production is `50317927`; `50850427` is retired. Do not act on PR #2 or PR #3.

## Decisions already made (challenge only with evidence)

- Webhook-first. An hourly, checkpointed poller as a safety check. Retries at 1 min, 5 min, 15 min, 1 h and 4 h, then dead-letter. A no-op writes nothing.
- Failures are tracked by one HubSpot report (`last_sync_status` = error) and one Azure email alert on dead-letter count.
- Labels are add-only, because the CR API documents no remove call.
- Employee identity:
  - HubSpot `workday_id` → CR External System ID, for BCBA and BT/RBT. Required for a create.
  - CR `contactId` → HubSpot `employee_id`. This is the link.
  - The HubSpot record id is stored in CR only in the "HubSpot Link to Record" metadata field (`138703`).
- CR rejects a changed External System ID on an update (400, tested on a live employee). A linked update sends the id CR holds.
- Both employee objects read `date_of_birth`. A create with a blank value sends the placeholder `2000-01-01`; an update never sends it. Temporary, pending Danny.

## Recommendations to challenge

Agree, disagree or partly, with evidence, for each:

- **R1 (Q30).** When a linked employee's `workday_id` differs from the External System ID in CR, stop the update and mark the record `blocked` instead of updating with a logged warning.
- **R2 (Q29).** Choose the employee contact form from type and home state (`BCBA NY`, `BCBA CO`, `RBT CO`), and keep today's form where United Care has not answered.
- **R3.** Do not add a dedicated CR field for the HubSpot record id.
- **R4.** Apply the date-of-birth placeholder in the create call only, never in the lookup or an update.
- **R5.** Keep copying CR's stored primary email on linked updates until a changed email is tested.
- **R6.** Slice order: S1b, then S5 + S6, S2, S3, S4.

## Questions for both reviewers

1. **Duplicates.** With the External System ID now the Workday ID, can any path create a second CR employee or client for one HubSpot record? Consider: two HubSpot records with the same `workday_id`; a `workday_id` filled in after an earlier blocked run; a create that succeeds but returns no id; a retry after a timeout; test employees in CR that still carry old HubSpot record ids as their external id.
2. **Wrong-record writes.** Can any path update the wrong CR employee? Consider a HubSpot `employee_id` typed by hand, a by-external-id match on a reused or mistyped Workday ID, and a BCBA and a BT/RBT record for the same person.
3. **Required fields.** Check `[GER-REQ]` against the code. For each of the six employee and four client create fields, is a blank value caught before the CR call, and does the HubSpot record show a clear error? Name each gap.
4. **Lost changes.** Can a HubSpot change be dropped without an error? Consider a blank that should clear a CR value, a failure after a partial write, a blocked record that is later fixed, and a poller outage.
5. **Completeness.** Is anything the guide requires missing from both the item tracker and OPEN-ITEMS.md? Is any open item listed as decided, or any decided item listed as open?
6. **Simplicity.** Name anything in the approved design or the remaining slices that is more complex than the requirement needs, and the simpler option.

## Role-specific work

**Grok (Azure MCP, local repo).**

- Re-read the deployed state, read-only: Function App running state and function-disabled flags; app setting names and the non-secret values of `HUBSPOT_PORTAL_ID`, `ALLOW_EMPLOYEE_CREATE`, `PUT_ONLY_MODE`, `INCLUDE_TEST_RECORDS`; active and dead-letter counts for each queue; any alert rules.
- Report the status of each of the seven pre-start gate steps in OPEN-ITEMS.md section 2.
- Run `npm test` and report the totals.
- For each "Done" claim in the tracker's item table and "Employee ids" section, confirm or refute it with `file:line`.

**GPT Pro (architecture).**

- Challenge R1–R6 and the slice order.
- Walk the employee create path end to end (webhook → queue → eligibility → mapping → validation → lookup → create → `employee_id` writeback → metadata → labels) and name every point where a failure leaves HubSpot and CR out of step.
- Review OPEN-ITEMS.md as a document a client-side HubSpot admin must act on: is each item clear, owned and in the right section?

## Report format

1. Branch check output.
2. R1–R6: Agree / Disagree / Partly, one line of evidence each, and your change if you disagree.
3. Answers to questions 1–6, with `file:line`, guide section or Azure resource as evidence.
4. New findings, each with a severity (high: duplicates, wrong-record writes, lost changes, eligibility bypass or an unexpected production write; medium; low), the evidence and the smallest fix.
5. Items missing from OPEN-ITEMS.md.
6. A closing line stating that nothing was changed.
