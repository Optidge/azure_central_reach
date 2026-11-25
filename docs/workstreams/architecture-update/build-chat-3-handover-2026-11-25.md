# Build chat 3 hand-over (2026-11-25)

Stage 8 follow-up build. Branch `architecture-update`, on top of `fcb300e` (local = origin). Everything below is **uncommitted** in the shared checkout. Nothing deployed; no Azure, HubSpot or CentralReach call was made by this chat or its agents. The poller was not touched (off as last recorded).

## 1. State

- **Commit `f213e02` (2026-11-25 14:14 -0600, not made by this chat):** "Stage 8 follow-up build: combined record gate, Care Coordinator on both fields, BCBA credential labels, fresh label read, sweep retry cap." 49 files; local is 1 ahead of origin (not pushed by this chat). It was made while the gate review was still running. Where this note says "uncommitted", read it as committed in `f213e02`, except the five files below.
- **Uncommitted after `f213e02` (review follow-ups, no source-code change):** `README.md` (gate wording), `docs/workstreams/architecture-update/BUILD-PLAN.md` (decision 76), this handover, `src/tests/smoke/stage7TwoGates.test.mjs` and `src/tests/smoke/stage7RecordGateEveryPath.test.mjs` (`yes` / `Yes` added to the closed gate values). The deployable code in `src/` (outside tests) is identical to `f213e02`.

- `npm test`: **1527 pass, 0 fail** (1413 before this build). `npm run check:requirements` passes. `npm run check:triggers` exits 0.
- `MAPPING_VERSION` is unchanged (`stage7-2026-11-23`). The deployed code (`655b385`) predates it, so every field is sent once after the deploy anyway; run sheet step SU-1 still holds.
- Each item had one Opus 5.5 (high) builder and one independent Opus 5.5 (high) reviewer working from snapshots. No must-fix is open.
- Snapshots (scratchpad, a reboot can clear them): `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/c459ab4c-ab86-48a9-a80f-53936bc654ac/scratchpad/snap/` with `p0` (start, = `fcb300e` source), `pBL6`, `pA`, `pCC`, `pR6`.

## 2. Items

### Item 1a. Item 20 (P-1b), the sweep retry cap

- **What changed:** a queue message with `source` `dailySweep` gets 1 queue retry; every other source keeps 5. The last run still writes "Retries used up". The daily sweep still picks up records in error (Zeke: "13 No").
- **Files:** `src/lib/retry.mjs` (`DAILY_SWEEP_MAX_RETRIES`, `maxRetriesFor`, `isLastAttempt`, `planRetry` takes `source`), `src/lib/queueRetry.mjs`, `src/workflows/clientSyncWorkflow.mjs`, `src/workflows/employeeSyncWorkflow.mjs` (`retriesUsedUp`), `src/lib/mappedState.mjs` (comment at lines 3-6 only).
- **Tests:** new `src/tests/smoke/item20SweepRetryCap.test.mjs` (the package's "b2" tests plus the review-fix tests).
- **Review:** safe to ship, no must-fix. One should-fix applied: a sweep message in a waiting chain that Service Bus redelivers (lock lost, retry failed to schedule) was dead-lettered without a run, against the guide rule that a waiting record never goes to the dead-letter queue. Now: attempt 5 is thrown on any redelivery as before; a sweep message past its one retry runs once more on its first redelivery and is thrown from the third delivery on. Other sources unchanged.
- **Difference from the brief (for Zeke):** the brief named two exemptions that keep the full schedule on a sweep message (`SYNC_IN_PROGRESS`, `CR_CREATE_PENDING`). The builder added a third, `CR_LABEL_POST_UNCONFIRMED`, from master question 20 (`requirements-review-2026-11-24/00-MASTER.md:682`, CLB-160), closed "as recommended". That closure rests on Zeke's general "apply your recommendation", not his own words on this point. Cost until item 21 (label-only retry) is built: a sweep run whose label never confirms can make up to 6 full runs a day, about 35 CentralReach calls per run on a Case (about 210 a day), about 10 per run on an employee.
- **Assumptions:** Service Bus `maxDeliveryCount` is 10 (`ARCHITECTURE-REVIEW.md`); the calls-per-run figures are the package's, not a new measurement.
- **Not done:** optional test for surviving mutation M13 (harmless case).

### Item 1b. SG-1, SG-2 (and optional SG-4)

- **What changed (SG-1):** in `createOrUpdateClient` any error from the lookup, the client read, the skip check or the SSN guard (all before the first write) carries `crWriteNotSent = true`. The client workflow restores the in-progress state on that flag; the code list `CLIENT_FAILED_BEFORE_WRITE` is gone. Errors from the create POST and the core PUT never carry the flag. A failed read is never a clear.
- **Files:** `src/lib/centralReachClient.mjs` (`createOrUpdateClient`), `src/workflows/clientSyncWorkflow.mjs`.
- **Tests:** `src/tests/smoke/br16UnmappedFieldsKept.test.mjs` (SG-1 503 read then blanked field sends no DELETE; SG-1 boundary; SG-2 a and b; SG-4 trailing-newline SSN case and the direct `createOrUpdateEmployee` guard test), `src/tests/smoke/laneLClientCreatePath.test.mjs` (which errors carry the flag).
- **Review:** safe to ship. No duplicate create possible; the SSN guard is unchanged in order and behaviour. 14 mutations killed, 1 harmless survivor (M13).
- **Skipped:** SG-3 (reason sentence), SG-5 (all-zero SSN; waits on CentralReach's answer).

### Item 1c. README

- `README.md:57` now reads `func azure functionapp publish centralreachserverless --javascript`.

### Item 2. Care Coordinator on both fields (O-17, B11, C10)

- **Spec built:** section A4 (A4.1 to A4.9) of `batch3-verification-2026-11-25.md`. No difference found between A4 and Zeke's words.
- **What changed:** one shared function writes first name, last name, email (each trimmed, a blank part skipped, joined by a line feed, no empty line) to Client field 138851 (Case) and Employee field 140495 (BCBA), only when `coordinator_export_status` is `ready`. Not ready, unknown or blank status: the field is left out (not sent, not cleared, saved hash kept) with warning `care_coordinator_not_ready`. `no_owner`: cleared (see CC-2). A missing property or failed HubSpot read: error, no CentralReach call.
- **Files:** new `src/mappings/shared/careCoordinator.mjs`; `src/mappings/client/buildClientMetadata.mjs`, `src/mappings/client/clientProperties.mjs`, `src/constants/centralReach.mjs`, `src/mappings/employees/employeeProperties.mjs`, `src/mappings/employees/buildEmployeePayload.mjs`, `src/workflows/employeeSyncWorkflow.mjs` (omit list per mapping; `keepOmittedFieldHashes` now gets the unfinished hashes).
- **Tests:** new `careCoordinatorMapping.test.mjs`, `stage8BcbaCareCoordinator.test.mjs`; updates in `laneDCaseReads`, `br21NoValuesInLogs`, `laneDRunSummary`, `clientMetadataMapping`, `stage4CaseMappings`, `stage4and5PropertyLists`, `stageP1PropertyLists`, `employeePayloadMapping`, `stage5EmployeeMappings`. All 17 A4.7 cases are present.
- **Review:** one must-fix, applied with 3 tests: the BCBA worker did not pass the unfinished hashes to `keepOmittedFieldHashes`, so after an interrupted run followed by a not-ready run, a later `ready` run could be a no-op and leave a stale coordinator in CentralReach. This also closes the older gap "the employee worker's omitted-hash behaviour" (decision 66 was client only). 15 mutations killed, none survive.
- **Test scripts updated, not run** (asked for by the testing chat; `node --check` passes): `scripts/sandbox/check-cr-record.mjs` (138851 expects the three lines, byte-for-byte with the email line compared by hash; new 140495 check for the BCBA), `scripts/sandbox/create-test-records.mjs` (read-back saves a hash of the coordinator email for the Case and the BCBA).
- **Existing Case values:** a Case holding the old "First Last" value is sent once in the new format, then is a no-op (tested).
- **Open, not decided here:**
  - **CC-1:** whether CentralReach keeps line breaks in these `input` fields (live read at retest).
  - **CC-2: settled.** Zeke, 2026-11-25: "2. Clear (built)". The `no_owner` clear stays as built. The guide still marks it "Proposed" (guide note owed).
  - **CC-3:** the test coordinator's current names and email. The check script expects Zeke / Swanson.
  - **Round-file email: settled and built.** Zeke: "3. Hash: a small script change, and no address in the repo." The round file holds a hash only (section 4).
- **Owed by others:** guide notes for both fields; the HubSpot triggers (`care_coordinator_email` on the Case, all four on the BCBA); the four properties in production (a production BCBA run ends `HUBSPOT_PROPERTY_MISSING` until they exist; production is paused by Zeke).

### Item 3. BCBA credential labels (BL6, B38)

- **What changed:** BCBA labels come from `ny_insurance_labels`, `co_insurance_labels`, `nj_insurance_labels`. Aetna-NY, Aetna-CO, NJ `Aetna` -> 1107649; Cigna-NY, Cigna-CO, NJ `Cigna` -> 1107650; Carelon-NY, Carelon-CO -> 1132654; MCD FFS-NY -> 1107647; MCD-CO -> 1107651; MCD-NJ, Horizon-NJ -> no label. A label is sent once even when two states map to it. `credentialed_insurances__ny` is not used. BT/RBT unaffected (tested). Case funding-source labels still not sent.
- **Files:** `src/constants/centralReach.mjs`, `src/mappings/employees/buildEmployeePayload.mjs` (`BCBA_CREDENTIAL_LABELS_BY_PROPERTY`), `src/mappings/employees/employeeProperties.mjs`.
- **Tests:** `[BL6][5.6]` tests in `stage5EmployeeMappings.test.mjs`; updates in `stage4and5PropertyLists`, `stageP3SendableLabels`, `stageP5Contracts`, `laneLLabelSender`, `br21NoValuesInLogs`.
- **Review:** safe to ship, no must-fix. Should-fix applied: an option value not in the table now raises warning `unmapped_credential_option` (property name only, sync not stopped), because a renamed HubSpot option would otherwise remove labels silently. Two surviving mutations closed.
- **For Zeke before cutover:** the four new label IDs are now managed. A BCBA who holds Aetna, Cigna, Carelon or CO Medicaid in CentralReach (added by hand) without the matching HubSpot option loses that label on their next label sync. Compare CentralReach holders of the four labels with the HubSpot ticks first, as was done for 1107647.
- **For the testing chat:** `scripts/sandbox/create-test-records.mjs:397` sets `co_insurance_labels` and `nj_insurance_labels` as decoys "never sent". They are sent now (the first CO option is likely MCD-CO -> 1107651), so that script line and the retest expectations need updating. NJ `Aetna` / `Cigna` exist in production only and are proven offline only.
- **HubSpot set-up owed:** the BCBA webhook workflow must trigger on `co_insurance_labels` and `nj_insurance_labels` (the guide notes `co_insurance_labels` missing from W3); otherwise a change is picked up only by the poller or the sweep.
- **Assumptions:** label IDs are those of the 2026-11-20 catalog (no live read); HubSpot returns an empty requested property as null.

### Item 4. Fresh label read (R-6)

- **What changed:** every read of a contact's labels (`GET /contacts/{id}/labels`) now carries `Cache-Control: no-cache`, `Pragma: no-cache` and a throwaway `?_t=<ms>` value. The one label POST path (`updateContactLabels`) builds its body only from the read made in the same step; only the catalog read sits between. The saved last POST is never used to build a body. A failed, unreadable or empty read sends no POST. **Calls added per label write: 0** (the fresh read replaces the plain read).
- **Files:** `src/lib/centralReachClient.mjs` (`crSend` takes optional `headers` / `params`; `readContactLabelIds`), `src/tests/smoke/stage2Fakes.mjs`.
- **Tests:** new `src/tests/smoke/r6FreshLabelRead.test.mjs` (7 tests).
- **Review:** safe to ship, no must-fix. Two test gaps closed (a fixed `_t` and a plain in-window read now fail tests). Authorization headers cannot be overridden; other CentralReach calls unchanged.
- **Unproven, must stay flagged:**
  - The screen-edit case (a label changed by hand on the CentralReach screen) is untested; label testing is paused on Zeke's word. If a later test shows CentralReach ignores both forms, R-6 returns to him with Option 2 or 3.
  - The live test sent the headers and `_t` on separate reads (each answered 200). The code sends both on one request; that exact form has not been tried live. Low risk; one GET on test employee 5338681 confirms it when label testing resumes.
  - A staff edit in the moment between the read and the POST can still be lost; only CentralReach's replace-all POST design could change that.

### Item 5. Left as is

`getEmployeeContactForm`, `home_apt` as address line 2, field 138702: not touched.

### Item 6. Combined gate: record gate AND path checkbox (decision 76)

- **Requirement (Zeke, 2026-11-25, quoted in decision 76):** "The sandbox test field, yes, must be enforced. Otherwise, actual records in the HubSpot portal will be updated in CentralReach."
- **What changed:** when `SYNC_RECORD_GATE_PROPERTY` is set next to the two path settings, the create path needs the record gate AND the creates checkbox; the update path needs the record gate AND the updates checkbox. Enforced in both workers before any CentralReach call (webhook, poller, sweep, Contact fan-out, retries) and in every filter group of the poller and sweep searches, so a non-test record is not even queued. Only the checkbox value `true` passes; blank, `false`, `no`, `yes` are skipped (`record_gate`); a gate value missing from the HubSpot answer is a failed read with no write.
- **Unchanged:** record gate alone; two path settings alone. Production guard unchanged.
- **Files:** `src/lib/syncEligibility.mjs`, `src/workflows/intakePollerWorkflow.mjs`, `src/lib/config.mjs` (comments), `README.md`, `local.settings.example.json`; tests `stage7TwoGates.test.mjs`, `stage7RecordGateEveryPath.test.mjs`, `stage3WebhookAndSettings.test.mjs`, `stage3PollerFakes.mjs` (the fake now enforces HubSpot's search limits).
- **Review:** safe to deploy to the sandbox. No must-fix. No path bypasses the gate; search bodies checked for all 8 setting combinations; 21 of 22 mutations killed, the survivor (`yes` accepted) closed with a test value. README wording corrected.
- **Side effect to know:** one Case search (paging a block of records that share a timestamp) leaves out the stage exclusion when both gates are set, to stay within HubSpot's 6 filters per group. The worker still skips those stages before any CentralReach call; the cost is a few extra queue messages.
- **Review F1 closed by decision 77** (below).

### Item 7. Sandbox guard for a missing record gate (decision 77)

- **Zeke, 2026-11-25:** "Build the guard".
- **What changed:** on any portal that is not production, when either path gate setting is set, the app refuses to run unless `SYNC_RECORD_GATE_PROPERTY` names a property of its own. Refused: blank, spaces, not set (reported missing); `none` (invalid); the same name as a path setting or a production path property (invalid). The error names the setting, never a value.
- **Where it stops:** the queue workers, Contact fan-out, the poller and the HTTP test functions validate before any HubSpot or CentralReach call. The webhook still queues the record ID; the worker refuses the message with no call and no write; the message retries and then dead-letters.
- **Unchanged:** production in every combination; the sandbox with the record gate alone.
- **Files:** `src/lib/config.mjs`, `README.md`, `src/tests/smoke/stage3WebhookAndSettings.test.mjs` (20 tests added).
- **Review:** safe to deploy to the sandbox, no must-fix. A 504-cell before/after table: no production cell changed, nothing looser. Two should-fixes applied (the same-name bypass; README wording) and one test gap closed.
- **Committed state:** `f213e02` and `fc61eb8` (made by the testing chat on Zeke's word) hold everything up to decision 76. **Uncommitted now:** `src/lib/config.mjs`, `src/tests/smoke/stage3WebhookAndSettings.test.mjs`, `README.md`, `BUILD-PLAN.md` (decision 77, one line of 76), this handover. The deploy must include `src/lib/config.mjs`.

#### Sandbox Function App settings for this build (names only)

| Setting | New or changed versus deployed `655b385` | What it must name |
|---|---|---|
| `SYNC_RECORD_GATE_PROPERTY` | Exists already; **meaning changed**: now enforced together with the two path settings | The sandbox test checkbox, `sandbox_test_field` |
| `SYNC_CREATE_GATE_PROPERTY` | **New** (not read by `655b385`) | The creates checkbox, `centralreach_creates_only` |
| `SYNC_UPDATE_GATE_PROPERTY` | **New** (not read by `655b385`) | The updates checkbox, `centralreach_updates_only` |
| `HUBSPOT_PORTAL_ID` | Unchanged | The sandbox portal |
| `INCLUDE_TEST_RECORDS` | Unchanged | Left as it is today (false or unset) |

No other setting name was added or removed in `src/lib/config.mjs` since `655b385`. The three checkbox properties must exist on the Case, BCBA and BT/RBT objects in the sandbox; if one is missing, runs fail closed as read errors. Setting app settings is an Azure write and needs Zeke's word.

#### Must NOT be deployed or done yet

- **Production:** nothing. Production's additional gate property is confirmed by Zeke after the sandbox end-to-end test (final production deploy item). If production keeps `SYNC_RECORD_GATE_PROPERTY` naming `sandbox_test_field`, every record without that box is blocked there.
- **Poller:** stays off through the deploy until the three settings are confirmed on the app.
- **Sandbox deploy:** deploy the tree that includes the decision 77 guard (`src/lib/config.mjs`, uncommitted at the time of writing). With the guard, a sandbox app missing `SYNC_RECORD_GATE_PROPERTY` refuses to run.
- Still unproven and to be settled at the retest, not blockers for the sandbox deploy: CC-1 (line breaks), the R-6 screen-edit case and the combined fresh-read form.

## 3. Docs

`BUILD-PLAN.md`: status rows at lines 301 and 704 (BL6 built), 634 (C10 three lines), 691 (B11 built), 913 (row 5.6 serves BL5 and BL6); `checkRequirements.test.mjs` BL6 assertion to match. **Decisions 70 to 77 are written** (section 4 table, after decision 69), with Zeke's words quoted from the "Eighth set" sections of the build package: 70 item 20 and its three exemptions; 71 SG-1 / SG-2 and the README command; 72 Care Coordinator (format, two fields, not-ready omit, `no_owner` clear); 73 BL6 mapping and the unknown-option warning; 74 the fresh label read (unproven for a screen edit until the retest); 75 the hashed test coordinator email; 76 the combined gate. Nothing in the testing chat's files was edited apart from the two scripts above.

## 4. Open questions for Zeke

Questions 1 to 3 were answered by Zeke on 2026-11-25 (relayed by the testing chat; his words verbatim):

1. Third sweep exemption (`CR_LABEL_POST_UNCONFIRMED`): **"1. Recommendation: keep."** Kept as built. The call cost above stands until item 21 is built.
2. CC-2, the `no_owner` clear: **"2. Clear (built)"**. Stays as built.
3. Coordinator email in the round file: **"3. Hash: a small script change, and no address in the repo."** Done: `create-test-records.mjs` saves `emailHash` (SHA-256 of the trimmed email) and never saves or prints the address; `check-cr-record.mjs` compares with kind `coordinator`, which hashes any line holding "@" on the CentralReach side before the compare and before printing. `node --check` passes on both; neither was run. A round file written before this change has no `emailHash` and gives SKIP ("re-run the read-back"). No existing round file holds an address.

Still open:

4. Before cutover: review CentralReach holders of labels 1107649, 1107650, 1132654, 1107651 against HubSpot.
5. CC-1 and the combined fresh-read form: settled by live reads at retest (his run).

## 5. Files new or changed since `fcb300e` (build side, for the follow-up commit)

Name these paths; never `git add -A` (the testing chat's files are in the same checkout).

Changed:
- `README.md`
- `docs/workstreams/architecture-update/BUILD-PLAN.md`
- `src/constants/centralReach.mjs`
- `src/lib/centralReachClient.mjs`
- `src/lib/mappedState.mjs`
- `src/lib/queueRetry.mjs`
- `src/lib/config.mjs`
- `src/lib/syncEligibility.mjs`
- `src/workflows/intakePollerWorkflow.mjs`
- `local.settings.example.json`
- `src/tests/smoke/stage7TwoGates.test.mjs`
- `src/tests/smoke/stage7RecordGateEveryPath.test.mjs`
- `src/tests/smoke/stage3WebhookAndSettings.test.mjs`
- `src/tests/smoke/stage3PollerFakes.mjs`
- `src/lib/retry.mjs`
- `src/mappings/client/buildClientMetadata.mjs`
- `src/mappings/client/clientProperties.mjs`
- `src/mappings/employees/buildEmployeePayload.mjs`
- `src/mappings/employees/employeeProperties.mjs`
- `src/workflows/clientSyncWorkflow.mjs`
- `src/workflows/employeeSyncWorkflow.mjs`
- `src/tests/smoke/br16UnmappedFieldsKept.test.mjs`
- `src/tests/smoke/br21NoValuesInLogs.test.mjs`
- `src/tests/smoke/checkRequirements.test.mjs`
- `src/tests/smoke/clientMetadataMapping.test.mjs`
- `src/tests/smoke/employeePayloadMapping.test.mjs`
- `src/tests/smoke/laneDCaseReads.test.mjs`
- `src/tests/smoke/laneDRunSummary.test.mjs`
- `src/tests/smoke/laneLClientCreatePath.test.mjs`
- `src/tests/smoke/laneLLabelSender.test.mjs`
- `src/tests/smoke/stage2Fakes.mjs`
- `src/tests/smoke/stage4CaseMappings.test.mjs`
- `src/tests/smoke/stage4and5PropertyLists.test.mjs`
- `src/tests/smoke/stage5EmployeeMappings.test.mjs`
- `src/tests/smoke/stageP1PropertyLists.test.mjs`
- `src/tests/smoke/stageP3SendableLabels.test.mjs`
- `src/tests/smoke/stageP5Contracts.test.mjs`

New:
- `src/mappings/shared/careCoordinator.mjs`
- `src/tests/smoke/careCoordinatorMapping.test.mjs`
- `src/tests/smoke/item20SweepRetryCap.test.mjs`
- `src/tests/smoke/r6FreshLabelRead.test.mjs`
- `src/tests/smoke/stage8BcbaCareCoordinator.test.mjs`
- `docs/workstreams/architecture-update/build-chat-3-handover-2026-11-25.md`

Testing-side scripts edited by this chat at the testing chat's request (commit with the testing chat's files or here, its call):
- `scripts/sandbox/check-cr-record.mjs`
- `scripts/sandbox/create-test-records.mjs`

## 6. Next

Zeke's word for the commit, then the one deploy (poller off), each on his word. Not built and still open from the earlier hand-over: items 13, 19, 21, 22 of the build package; item 11 (New Mexico, Virginia); T9 BT/RBT personal email; SG-3, SG-5.
