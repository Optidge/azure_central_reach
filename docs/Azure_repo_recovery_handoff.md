```markdown
# Azure CentralReach recovery handoff

Prepared October 30, 2026, America/Chicago.

## Purpose

Review the archived work and selectively bring the needed changes into the fresh repository. Preserve useful field mappings and fixes without importing the entire old branch.

The webhook and poller functionality need verification. Their presence in source, historical test reports, and previous handoffs do not establish a completed integration pass.

This handoff is a review and proposed transfer plan. It does not authorize implementation, deployment, external writes, or GitHub changes.

## Repository locations

Fresh working repository:

/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach

Last verified branch: main
Last verified commit: 546518ef92c92948aaf3cab31be6dfa03f98c660

Local reference archive:

/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach_backup_2026-10-30

Archive branch: align-sandbox-hubspot-field-sync
Archive commit: a8e3be7bb7f140f6618bd388cd59be461ec29c75

The archive preserves:

- All 29 commits beyond the fresh baseline.
- The uncommitted date-parser changes and their tests.
- The modified historical handoff.
- Untracked run notes and scripts.
- Existing local configuration and dependencies.

Push destinations in the archive were disabled locally. Its three nested Git worktrees were repaired after the folder was moved.

The archive is for reference. Continue future work in the fresh repository.

The fresh clone had no node_modules, .env, or local.settings.json at inspection. Dependencies and configuration were not transferred.

Recheck Git status before beginning another task. No implementation branch has been created.

## Authority and historical context

1. Primary business authority: Drive field guide, Tab 1

   https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0

   Use Tab 1 for intended field mappings, label rules, association requirements, stored option values, and documented open decisions.

2. Implementation evidence: repository source

   The fresh repository and local archive establish what is implemented in each checkout. Source code does not establish that deployment or end-to-end verification succeeded.

3. Historical context: Azure Final in Notion

   https://app.notion.com/p/Azure-Final-409bf2449e8380a8b2b0cccb0c4dfb19

   Use this for prior reviews, decisions, and recovery context. Its older plans do not override the current request or authorize execution.

Repository history:

https://github.com/Optidge/azure_central_reach

Conflicting guide notes and unresolved decisions must be reconciled before changing the affected behavior.

Historical checkpoints, matrices, skills, and run notes are not proof of current deployment.

## Environment boundaries

- HubSpot sandbox: 50850427.
- HubSpot production: 50317927.
- Recorded Function App: centralreachserverless.
- Recorded published build: 037ea72.
- Current deployed artifact and Azure settings remain unverified.
- The documented sandbox integration writes to production CentralReach. There is no separate CentralReach sandbox in that recorded setup.

Do not assume selecting sandbox HubSpot isolates CentralReach writes.

Do not print credentials, raw record data, or verification artifact bodies.

## What already exists in the fresh repository

Do not rebuild these foundations unnecessarily:

- Webhook receiver, signature checking, routing, and queue enqueue behavior.
- Client and employee queue consumers.
- Client and employee sync workflows.
- Poller discovery and linked-record rechecks.
- Mapping hashes and comparison helpers.
- The three HTTP helper functions.

These files are byte-identical between the fresh repository and archive:

- package.json
- package-lock.json
- host.json
- src/functions/hubspotWebhook.mjs
- src/lib/hubspotWebhook.mjs
- src/lib/centralReachClient.mjs
- src/functions/clientSyncHttpTest.mjs
- src/functions/connectivityTest.mjs
- src/functions/intakePollerHttpTest.mjs

No dependency or host-file transfer is needed for the archived branch changes.

The baseline poller already rechecks linked Cases, BT/RBTs, and BCBAs without stage filters on that path. Its separate discovery sweep still uses pipeline and stage rules.

The archive's later routing commit adds a regression test; it does not introduce a new webhook receiver.

## Recommended transfers

These are proposed units for later implementation. Do not copy the complete branch or whole workflows indiscriminately.

### 1. Date parsing and regression tests

Source: uncommitted archive changes in:

- src/mappings/client/buildClientPayload.mjs
- src/mappings/employees/buildEmployeePayload.mjs
- src/tests/smoke/clientPayloadMapping.test.mjs
- src/tests/smoke/employeePayloadMapping.test.mjs

The change converts an all-digit epoch-millisecond string to a number before constructing a Date.

These changes are not in the archive commit or GitHub.

Bring the parser changes and their tests together. Review blank, normal date, numeric, invalid, and pre-1970 inputs. The two added cases cover a positive digit-string date only.

This fix does not require the worker or poller redesign.

### 2. Reviewed field mappings and required fetch lists

Review the changes in:

- src/mappings/client/buildClientPayload.mjs
- src/mappings/client/buildClientMetadata.mjs
- src/mappings/employees/buildEmployeePayload.mjs
- src/constants/centralReach.mjs
- The corresponding three mapping test files.
- Property-list portions of both sync workflows.

Principal source commit: 77f4224, with later mapping refinements.

Useful changes include updated field sources for addresses, names, email, schedules, hours, insurance, metadata, and labels.

Correct the truncated address property ending in other_addres to the actual name ending in other_address.

Bring each approved mapper change together with the property names its workflow must fetch. A field referenced only in a mapper is incomplete.

Do not copy entire archived workflows; they also contain the worker redesign.

### 3. Guardian retrieval

Source: c0e3390 and the resulting archive source.

Relevant files:

- Client payload builder.
- Contact reader in src/lib/hubspotClient.mjs.
- Association and Contact loading in the client workflow.
- Matching tests.

Implemented behavior:

- Exactly one qualifying type-3 Contact with contact_category Parent/Guardian supplies guardian name and email.
- Zero or multiple qualifying Contacts use the Case fields.

This fallback does not resolve the guide's question about identifying the parent-communication Contact.

Preserve explicit read-failure handling.

Copy only the needed Contact reader from hubspotClient.mjs. Copying the entire archived file would also remove baseline search helpers.

### 4. BT/RBT mailing state and postal sources

Source commits: ecf4e27 and 17451af.

- Prefer state_home for mailing state.
- Use postal_code_home.
- Remove the nonexistent BT/RBT postal_code request and fallback when adding missing-property protection.

The old handoff's instruction to retain the postal_code fetch is outdated.

Current portal definitions were not rechecked in this review.

### 5. Linked-record gate

Source rule: workerGate in src/lib/recordLifecycle.mjs.

Required behavior:

- Sync when a CentralReach ID exists.
- Otherwise sync when the checkbox contains the exact token Yes.
- Skip only when both conditions fail.

The Case checkbox is semicolon-separated. Yes - Generic is not the token Yes.

Baseline has no checkbox guard. The original alignment commit introduced an overly restrictive Yes-only guard.

Transplant the rule without automatically bringing the full state machine or planAttempt.

Tests should cover:

- Unlinked and unticked: skip before a CentralReach call.
- Unlinked and Yes: eligible for first creation.
- Linked and unticked: continue updates.

### 6. Missing-property protection

Source: src/lib/fieldRead.mjs and targeted checks in both workflows.

Distinguish:

- A requested key absent from the HubSpot response.
- An intentional blank value.
- A populated value.

Stop before destination writes when a required read is missing or unauthorized.

Confirm requested property definitions and permissions. Do not add speculative property names and then make them mandatory.

### 7. Mapping version

Source: the single version change in src/lib/mappedState.mjs.

Update the mapping version with the approved mapping changes.

A version change changes comparison hashes and can cause writes on subsequent linked-record syncs. Consider that scope before live testing.

### 8. Staffing comparison and routing test

Review the sandbox Potential exclusions 100 and 130 in:

src/constants/staffingAssociations.mjs

The named sandbox association map, including IA BCBA 163, currently has no consumers. Copying it alone changes no behavior.

Bring the routing regression from 472331d:

src/tests/smoke/hubspotWebhook.test.mjs

It verifies Case, BT/RBT, and BCBA use the matching sender and does not depend on the redesign.

## Mapping and runtime gaps

### Confirmed gaps

1. Label updates only add labels.

   src/lib/centralReachClient.mjs has no label-removal path. The guide explicitly requires billing-hold removal when the value returns to No.

   State, funding, status, and credential transitions need an agreed integration-owned removal scope and tests.

2. Three existing label constants changed numbers.

   Archive values:

   - BCBA: 1130668
   - NY_EMPLOYEE: 1132655
   - CO_CLIENT: 1132648

   Old BCBA 1052629 is now BCBA_LBA_NY.

   Verify the target CentralReach catalog before label-writing tests. Neither checkout proves its numbers are correct. The guide supplies label names, not these numeric IDs.

3. Fetch and mapping gaps remain.

   - Case service-address component fallbacks are referenced but not requested.
   - BT/RBT work apartment is not requested or assembled.
   - BCBA gender_new and owner/care-coordinator fields are not requested.
   - staffing_status is fetched but not mapped to Staffed.
   - No Staffed label constant exists.

   Separate missing implementation from business rows still awaiting a source or destination definition.

4. Employee identity needs reconciliation.

   The payload uses the HubSpot record ID as externalSystemId. Later guide notes discuss Workday ID.

   Do not change matching identity without resolving those notes and verifying existing record matching. Identity changes can affect update-versus-create behavior.

5. Contact-derived data needs verification.

   BCBA personal email reads the BCBA email mirror. The guide discusses Contact sources and planned property-sync fields.

   Verify the actual source properties and event coverage rather than assuming mirrors exist and stay current.

6. Clinical source and clear behavior remain incomplete.

   Comorbid reads comorbid_diagnosis__clinical despite later guide notes about main fields.

   Blank parent maladaptive behavior omits the metadata key. The client clear calculation therefore has no explicit null for that field.

   Resolve source ownership and deliberate-clear behavior before calling those rows complete.

7. Employee-create diagnostics lose field detail.

   extractCreateErrorReason ignores nested responseStatus errors. The recorded employee failure therefore produced a generic 400 reason instead of naming DateOfBirth.

   This is a focused diagnostics issue, not permission to execute the employee probe script.

### Behavior requiring a decision

These source behaviors were confirmed, but they are not automatically defects:

- A partial ongoing-auth date pair suppresses the legacy date pair.
- A selected home service address can return null when full_home_address is blank.

The guide prioritizes the plain auth fields and selected address source. Decide intentional blank and fallback semantics before restoring legacy fallbacks that could defeat a deliberate clear.

## Defer the larger worker and poller redesign

Do not initially import these commits wholesale:

- 16d98ee
- ea02cbe
- da22900
- 0b8e785

They introduce:

- Record lifecycle classification.
- planAttempt and runPlan.
- Never-processed discovery.
- CREATE_SWEEP_ENABLED.
- Dry-run handling.
- Final-delivery HubSpot errors.
- Scheduled linked replays.

Their dependencies span both workflows, queue consumers, config, HubSpot search helpers, Service Bus helpers, queue constants, retry helpers, and tests.

The smaller gate and missing-property rules can be reviewed independently.

Known redesign concerns:

- CREATE_SWEEP_ENABLED defaults off.
- Timer source still schedules every five minutes despite a reference target of thirty minutes.
- A sweep queue-send 429 records the error and continues.
- Search and linked-recheck 429 paths return.
- The existing poller 429 test exercises search failure, not queue-send failure.
- Missing deliveryCount defaults to the hardcoded maximum, potentially classifying a failure as final. Verify actual trigger metadata before accepting that behavior.

Baseline linked polling still needs verification. Keeping it does not mean it is proven or should be enabled now.

## Scripts

Retain for a later reviewed import:

- scripts/create-sandbox-hubspot-properties.mjs
- scripts/sandbox-hubspot-properties.json

Do not run them during review.

The property script validates sandbox portal 50850427, creates missing definitions and one association label, and skips existing properties. It does not reconcile existing definitions or options.

Both bcba_information and bcbas_information occur in the JSON. Their presence does not establish whether either group is invalid; confirm live groups before execution.

The later Notion note also asks to retain the E2E record-creation utility:

scripts/create-sandbox-e2e-records.mjs

Adapt it to the accepted source and test scope before importing or running it. It duplicates mapped values, creates records, and sets Yes triggers.

Leave these archived:

- scripts/probe-employee-create-error.mjs
- scripts/check-sandbox-done-bar.mjs
- scripts/check-ws1-diff.mjs

The done-bar checker depends on historical document conventions, including a Checkout SHA line removed from the modified archive handoff. It does not prove integration correctness.

## Documentation to retain and consolidate

Already present in the fresh repository:

- docs/centralreach-metadata-and-labels-discovery.md
- docs/Change Detection Completion Phase.md
- docs/hubspot-centralreach-field-mappings-current-state.md
- docs/sandbox_vs_production_mvp.md
- docs/Sandbox props & labels_summary.md
- docs/SOURCE-OF-TRUTH.md
- README.md

Update these against the eventual approved source and verified configuration. Do not copy dated claims forward as current facts.

Archive-only design references:

- docs/poller-state-decision.md
- docs/poller-backup-contract.md

Consolidate their useful decisions if that redesign is revisited. Their timer-state and not-coded statements are historical.

Leave historical checkpoints, handoffs, transcript exports, coverage matrices, .audit, raw .test-evidence, old prompts, and agent worktrees in the reference archive.

## Skills review

The parent Optidge/AGENTS.md was reviewed. It calls for small changes, source-authority checks, preservation of user edits, and evidence-based validation.

The fresh clone already contains:

.cursor/skills/verify-azure-central-reach/SKILL.md

The skill, feature index, client-scaffold recipe, and relevant launcher code were reviewed.

Important limits:

- It launches a dedicated local Functions host.
- Its launcher disables timer and queue triggers.
- client-sync-test is actually a 501 scaffold, not the queue-driven sync.
- Disabling triggers does not make manual HTTP actions read-only.
- intake-poller-test directly runs the workflow and can enqueue messages with real configuration.
- Local harness results do not establish a completed sandbox pass.

Do not launch the harness during review. No verification artifact bodies were opened.

Do not import archived SANDBOX-DONE instructions as a new authoritative acceptance contract.

No new executable verification skill is needed for this handoff. If the harness is retained later, update its recipes to distinguish offline tests, local HTTP behavior, and separately authorized end-to-end verification.

## Historical evidence

These are reported results, not newly executed checks:

- Worker-redesign snapshot: 101 passing tests.
- Date-parser change: 22 passing mapping tests.
- October 30 run notes: 10 successful Case creations and 35 employees blocked on DateOfBirth.
- Mapped-field, association, and stage suites were not run in that later batch.
- Earlier poller evidence records a marker reaching CentralReach without a successful restore.

Actual deployed code, Azure settings, current test-record state, and catalog definitions were not checked.

## Next implementation sequence

1. Recheck both folders and create a dedicated local implementation branch in the fresh repository.

   Suggested name: recovery/reviewed-field-alignment

   Keep the archive unchanged. Do not reuse a chat that automatically checks out the old branch.

2. Reconcile the mapping slice with Drive.

   Resolve Contact sources, identity, missing properties, label definitions, and deliberate-clear semantics.

3. Restore reviewed units in small changes.

   Bring the date fix, approved mappings and fetch lists, guardian lookup, gate, missing-read protection, and associated regression tests.

   Keep the larger worker and poller redesign outside that initial change.

4. When authorized, prepare dependencies and local configuration and run offline regression tests.

   Cover mapping, routing, workflow behavior, linked/unticked records, absent versus blank reads, multiple guardians, label transitions, and partial failures.

   Historical test counts do not validate the new combination.

5. Separately inspect deployed code and configuration read-only.

   Confirm deployment identity, HubSpot portal, queue and timer settings, CentralReach catalog, and existing test-record state.

6. Only after explicit sandbox deployment and test authorization, verify one Case, BT/RBT, and BCBA through the full path.

   Require workflow signal, queue processing, HubSpot writeback, and CentralReach read-back.

   Then scope a poller-only test with restoration and isolation from unrelated records.

Production rollout, backfill, bulk creation, and remote Git changes remain separate tasks.

## Review boundaries

This review read Notion, the linked Drive guide, local Git history and diffs, selected source and tests, repository guidance, and historical notes.

It did not:

- Import application changes.
- Run tests or start the application.
- Launch the verification harness.
- Install dependencies.
- Consume queues.
- Read credential files.
- Change Azure, HubSpot, CentralReach, or GitHub.
```