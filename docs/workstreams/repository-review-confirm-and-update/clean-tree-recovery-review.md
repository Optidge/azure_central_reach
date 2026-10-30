# Clean tree on main and recovery transfer review

Reviewed 2026-10-30. Clean tree `24975b5` on `main`. Archive `a8e3be7` on `align-sandbox-hubspot-field-sync`. This file is a review. It does not authorize implementation, deployment, external writes, or GitHub changes. Drive Tab 1 was not opened. Live Azure settings were not read.

## Overview

`main` at `24975b5` is a working baseline. It is an Azure Functions app that syncs HubSpot Cases and employee records (BT/RBT and BCBA) into CentralReach. Only the Service Bus queue workers write to CentralReach. The archive at `a8e3be7` is newer work from the `align-sandbox-hubspot-field-sync` branch. It contains mapping alignment, a guardian lookup, a checkbox gate, missing-property protection, a larger worker and poller redesign, and uncommitted date-parser edits.

`docs/Azure_repo_recovery_handoff.md` is a review plan. It names Drive Tab 1 as the business authority. Source shows only what a checkout implements. Notion Azure Final is history.

The recommendation is a small first recovery branch with four parts.

- The date fix, with wider tests.
- The checkbox gate, ported as a two-condition rule.
- Missing-property protection, paired with corrected fetch lists.
- The webhook routing test.

Mappings, label ids, and the guardian lookup need Drive Tab 1 and the CentralReach catalog first. The redesign stays in the archive.

## Key concepts

A Case is the HubSpot record that becomes a CentralReach client contact. The code calls it `deal`. `buildClientPayload({ deal, config })` builds a PascalCase client contact from it.

An employee record is a BT/RBT or BCBA HubSpot record. `buildEmployeePayload` builds a camelCase employee contact. Both employee types share one `employee-sync-queue`.

The CentralReach id is the link between the two systems. If it is present, updates go by id. If it is absent, the client path tries the external id and then creates.

`src/lib/mappedState.mjs` defines `MAPPING_VERSION`. The version feeds the comparison hash. If the hash matches and a CentralReach id is known, the worker skips the write. Main uses `hybrid-2026-10-27`. The archive uses `guide-sandbox-2026-10-27`.

The entry checkbox is `enter_in_central_reach` on the Case and `entered_in_centralreach` on employees. Both are semicolon-separated multi-checkbox values. The exact token `Yes` counts. `Yes - Generic` does not count. Main fetches neither property. Checked in `src/workflows` on 2026-10-30. No matches.

Employee create is off unless `PUT_ONLY_MODE` is false and `ALLOW_EMPLOYEE_CREATE` is true. The defaults in `src/lib/config.mjs` are true and false. Client create has no flag gate. `src` has no checkbox gate on either path.

Recorded environment, from docs, not rechecked. HubSpot sandbox `50850427`. HubSpot production `50317927`. Function App `centralreachserverless`. Published build `037ea72`. The documented sandbox HubSpot path writes to production CentralReach.

## How it works

A HubSpot change has two producers and one pair of queues.

The primary path, per the docs, is `POST /api/hubspot-webhook`. `src/functions/hubspotWebhook.mjs` and `src/lib/hubspotWebhook.mjs` check the HubSpot v2 signature, route by object type id, and enqueue the id only. The handler does not read HubSpot.

The backup is `intakePoller`, a 5-minute timer. It searches HubSpot, dedupes on `hs_lastmodifieddate`, and enqueues.

`processClientQueue.mjs` runs `clientSyncWorkflow.mjs`. `processEmployeeQueue.mjs` runs `employeeSyncWorkflow.mjs`. Both call `centralReachClient.mjs`, which PUTs or POSTs the contact, then writes labels and metadata. The worker writes HubSpot `integration_last_write` and Cosmos state.

The example settings disable the poller and both queue workers. The webhook is not in that disabled list. Whether Azure matches the example was not read.

The client worker takes a lock, fetches the Case twice, and builds the payload and metadata. On a hash miss, `createOrUpdateClient` tries three steps in order. PUT by CentralReach id. PUT by external id. `POST /contacts/client` if the second step returns 404.

Metadata writes go in this order. Labels, then one PUT per field, then DELETE for any field that was in the previous hash and is now blank. If the hash drifts after the write, the worker throws `SYNC_STALE` and retries without an error writeback.

The employee worker has the same shape. A blocked create still completes the queue message. It stamps `integration_last_write` and stores Cosmos status `blocked`.

## Where things live

Main runtime.

- Entry points are in `src/functions/`. `hubspotWebhook.mjs`, `intakePoller.mjs`, `processClientQueue.mjs`, `processEmployeeQueue.mjs`, and the HTTP test functions.
- Workflows are `src/workflows/clientSyncWorkflow.mjs`, `employeeSyncWorkflow.mjs`, and `intakePollerWorkflow.mjs`.
- Mappers are `src/mappings/client/buildClientPayload.mjs`, `buildClientMetadata.mjs`, and `src/mappings/employees/buildEmployeePayload.mjs`.
- Label and metadata ids are hardcoded in `src/constants/centralReach.mjs`.
- The API clients are `src/lib/centralReachClient.mjs` and `src/lib/hubspotClient.mjs`.
- Config is `src/lib/config.mjs`. Hashing is `src/lib/mappedState.mjs`.

Archive only.

- `src/lib/recordLifecycle.mjs` contains `checkboxIsYes`, `parseSnapshot`, `deriveRecordState`, `workerGate`, and `sweepDecision`.
- `src/lib/fieldRead.mjs` contains `readProperty`, `assertNoAbsentProperties`, and `RequestedPropertyAbsentError`.
- `attemptPlan.mjs` contains `planAttempt` and `runPlan`. `searchNeverProcessedRecords` is in the archive `hubspotClient.mjs`.
- The uncommitted parser edits are in both payload builders and two smoke tests.

On `origin/align-sandbox-hubspot-field-sync` at `a3ccb9a`, fetched but not on main.

- `scripts/create-sandbox-hubspot-properties.mjs` and `scripts/sandbox-hubspot-properties.json`.
- `docs/poller-state-decision.md` and `docs/poller-backup-contract.md`.

Untracked in the archive only.

- `scripts/create-sandbox-e2e-records.mjs` and `scripts/probe-employee-create-error.mjs`.

Already the same bytes on main and in the archive.

- The webhook files and `intakePoller.mjs`.
- `centralReachClient.mjs` and the three HTTP test functions.
- `package.json`, `package-lock.json`, and `host.json`.

## Gotchas

There are three date parsers. `hsDateToIsoOrNull` in `buildClientMetadata.mjs` already handles positive epoch numbers. The two payload builders pass an all-digit string to `new Date`, which returns null. Checked on main. `buildClientPayload.mjs` line 40 and `buildEmployeePayload.mjs` line 92. The archive fix tests `/^\d+$/` before calling `Number`. A negative epoch string, such as a pre-1970 birth date, still becomes null. A digit string that is not an epoch, such as `20180115`, becomes a 1970 date. The new tests cover only `Date.UTC(2018, 0, 15)`.

The Oct 30 run notes report 35 employees blocked on DateOfBirth. The parser defect is a plausible cause. This review did not prove it. `extractCreateErrorReason` ignores nested `responseStatus` errors, so the logged reason was a generic 400.

Main code and the main docs disagree on three label ids.

| Label | Main code | Main docs and archive |
| --- | --- | --- |
| BCBA | 1052629 | 1130668 |
| NY_EMPLOYEE | 1107685 | 1132655 |
| CO_CLIENT | 1082500 | 1132648 |

The archive keeps `1052629` as `BCBA_LBA_NY`. Neither tree proves its numbers against the CentralReach catalog.

Changing `MAPPING_VERSION` changes every hash. Every linked record will write on its next sync. The sandbox HubSpot path writes to production CentralReach, so this is a production write wave.

`workerGate` is not standalone. It takes the output of `deriveRecordState`, which depends on `parseSnapshot` and `readProperty` from `fieldRead.mjs`. The rule itself is short. Sync if a CentralReach id exists or `checkboxIsYes` is true. Otherwise skip.

Strict reads plus stale fetch names will halt syncs. BT/RBT still requests a bare `postal_code`. Both trees request the truncated `if_services_will_be_in_more_than_one_location__list_the_other_addres`. Confirmed on main at `src/workflows/clientSyncWorkflow.mjs` line 47 and `src/mappings/client/buildClientPayload.mjs` line 136. If missing-property protection lands before those names are fixed, those syncs stop.

Without strict reads, an absent property can delete data. The clear path sends DELETE for blank fields that were in the previous hash. An absent key read as blank could delete CentralReach metadata. This is an inference from the clear path. It was not observed.

Do not copy whole archive files. The archive `hubspotClient.mjs` drops main's search helpers. The archive workflows, queue files, and `config.mjs` carry the redesign. The archive payload builders also carry the `77f4224` mapping changes, not just the parser fix.

Labels are only ever added. `centralReachClient.mjs` has no removal path. A billing hold set back to `No` keeps its label.

Main docs have drifted from `src`. The README says webhook coalesce drops a repeat notice. The code still enqueues it. Phase 1A says client create does not look up by HubSpot id. `createOrUpdateClient` does. The sandbox-versus-production note says no portal is hardcoded. Client links fall back to `50850427`. Split `rtbt` and `bcba` queues are only a standby plan.

The poller writes dedupe after the send, so a later worker failure is not retried for the same `hs_lastmodifieddate`. A failed deal search skips employees and the linked recheck for that tick.

The verify harness can make real changes. `intake-poller-test` can enqueue with real configuration. `client-sync-test` is a 501 scaffold. The two verification skill files differ, and the diff was not read.

## What to bring over

The handoff matches the source on the points this review checked. Four of its transfers need a narrower cut than the handoff's file list.

The date-parsing item lists whole files. Those files also carry mapping hunks, so only the parser hunks should move.

The linked-record gate names `workerGate`. The rule needs to be re-expressed on main without `deriveRecordState`.

The postal sources and the missing-property protection must land together. Otherwise strict reads trip on `postal_code`.

The mapping-version note mentions the hash change and does not spell out the production write volume it causes.

### Bring in the first recovery branch

Date parser fix and tests. The uncommitted hunks are in `src/mappings/client/buildClientPayload.mjs` and `src/mappings/employees/buildEmployeePayload.mjs`, plus the two added cases in `clientPayloadMapping.test.mjs` and `employeePayloadMapping.test.mjs`. Main turns every all-digit HubSpot date into null. That affects required employee fields such as DateOfBirth. The edit exists only in the archive working tree. Port only the parser hunk. Add tests for blank, ISO, invalid, non-epoch digit, and pre-1970 inputs. One option is to reuse `hsDateToIsoOrNull` so there is one parser.

Linked-record gate rule. Take `checkboxIsYes` and the condition in `workerGate` from archive `src/lib/recordLifecycle.mjs`. The checkbox rule is documented and absent from `src`. Client create has no flag gate, so an unticked, unlinked Case that reaches the worker can be created in CentralReach. Both workflows must also start fetching `enter_in_central_reach` and `entered_in_centralreach`. Linked records with the box unticked must keep syncing. Test three cases. Unlinked and unticked skips before any CentralReach call. Unlinked and `Yes` is eligible for first creation. Linked and unticked keeps updating. Leave the rest of `recordLifecycle.mjs`.

Missing-property protection, with the fetch-name fixes. Take `src/lib/fieldRead.mjs` and the targeted checks in both workflows. Do not take the whole workflow files. Main cannot tell an absent key from an intentional blank. Ship it in the same change as two fetch-name fixes. Remove the BT/RBT `postal_code` request and fallback. Correct `other_addres` to `other_address` in `clientSyncWorkflow.mjs` line 47 and `buildClientPayload.mjs` line 136. First confirm the property definitions read-only. Make only confirmed properties mandatory.

Webhook routing regression test. The archive test from commit `472331d` in `src/tests/smoke/hubspotWebhook.test.mjs` checks that Case, BT/RBT, and BCBA webhooks enqueue only the matching sender. That phrase is absent from the main test file. The webhook source is the same bytes in both trees. Take only the added test.

### Reconcile against Drive Tab 1 before any code move

Reviewed field mappings and fetch lists, from `77f4224` and later refinements. They touch the three mappers, `centralReach.mjs`, three mapping tests, and the workflow property lists. Each mapper field must ship with its fetch entry.

Label numeric ids. Drive gives label names, not ids. Also check the CentralReach catalog.

Guardian retrieval from `c0e3390`. This adds `getContactById` to the archive `hubspotClient.mjs` and a `contacts` argument to `buildClientPayload`. It selects exactly one associated Contact with association type `3` and `contact_category` `Parent/Guardian`. It does not answer which Contact receives parent communication. The type id may be portal-specific. Confirm it in production.

`state_home` as the mailing state source.

Staffing ids `100`, `130`, and `INITIAL_ASSESSMENT_BCBA` `163` in the archive `staffingAssociations.mjs` have no consumers. Main has no sandbox or production switch.

The `MAPPING_VERSION` bump. Make it last, with the approved mappings, after scoping the resulting write volume.

Label removal, including a billing hold set back to `No`, plus state, funding, status, and credential transitions.

Employee identity. Main uses the HubSpot record id as `externalSystemId`. The guide notes mention a Workday id instead.

Rows with no source or destination yet. `gender_new`, the Staffed label, BT/RBT work apartment, the clinical comorbid source, and deliberate-clear semantics.

The `a8e3be7` feedback doc. Read it during the reconcile pass. Do not copy it in as a source of truth.

### Leave in the archive

The redesign commits `16d98ee`, `ea02cbe`, `da22900`, and `0b8e785`. They include `attemptPlan.mjs`, `planAttempt`, `runPlan`, `CREATE_SWEEP_ENABLED`, and `searchNeverProcessedRecords`.

The archive copies of the workflows, queue files, `config.mjs`, and `hubspotClient.mjs`.

`poller-state-decision.md` and `poller-backup-contract.md`. Revisit them only with the redesign.

`create-sandbox-hubspot-properties.mjs` and its JSON. A later reviewed import is possible. The script does not reconcile existing definitions. The JSON has both `bcba_information` and `bcbas_information`.

`create-sandbox-e2e-records.mjs`. Bring it later, after adapting it to the accepted scope. It creates records and sets `Yes` triggers.

`probe-employee-create-error.mjs`, `check-sandbox-done-bar.mjs`, and `check-ws1-diff.mjs`.

Run notes, checkpoints, matrices, `.audit/`, `.test-evidence/`, `RECOVERY-CHECKPOINT.md`, and the archive verify skill.

### Tradeoffs

| Item | Bring or leave | Why |
| --- | --- | --- |
| Date parser hunks and wider tests | Bring | Main nulls all-digit dates, and the fix needs no redesign |
| `checkboxIsYes` and the gate condition | Bring | Main has no gate, and client create has no flag |
| `fieldRead.mjs` with the `postal_code` and `other_address` fixes | Bring | Separates absent from blank, and is safe only with correct fetch names |
| Webhook routing test | Bring | The webhook source matches, and main's test file lacks the sender check |
| Field mappings and fetch lists | Reconcile | Drive Tab 1 is the authority, and the archive files mix in other changes |
| Label numeric ids | Reconcile | Main code and docs disagree, and neither is proven against the catalog |
| Guardian lookup | Reconcile | The selection rule is a business decision, and the type id may vary by portal |
| `state_home`, staffing exclusions, identity, clear semantics | Reconcile | Each changes behavior and depends on business rules |
| `MAPPING_VERSION` bump | Reconcile, ship last | Forces writes on every linked record in production CentralReach |
| Worker and poller redesign | Leave | Spans workflows, queues, config, and helpers |
| Whole archive `hubspotClient.mjs` or workflows | Leave | Drops main search helpers and drags in the redesign |
| Sandbox property and end-to-end scripts | Leave for now | They write to HubSpot or CentralReach and need their own review |
| Probe and checker scripts, evidence folders | Leave | They are history, and they do not prove the integration |

Once implementation is authorized, the handoff's order still applies. Branch `recovery/reviewed-field-alignment` from a fresh check of both folders. Run offline tests first. Read the deployed Azure settings as a separate step. Run one Case, one BT/RBT, and one BCBA only after an explicit sandbox authorization.
