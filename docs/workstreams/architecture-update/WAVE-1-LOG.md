# Wave 1 log — lanes A, B, L, C

Written 2026-11-20 by the orchestrator so the review record does not live only in a chat. It holds what each lane built, every review finding with its verdict, what must be done at the merge, and what waits on Zeke. [BUILD-PLAN.md](BUILD-PLAN.md) is still the plan; where the two differ, BUILD-PLAN wins. This file is updated until wave 1 is merged, then kept as the record.

## 1. State

**Merged, 2026-11-20, on Zeke's go-ahead.** Lane commits on their branches: L `e5bd0b1`, C `bb074ba`, B `9cf6803`, A `cd02789`. Merged into `architecture-update` in the order L, C, B, A as `f2fad40`, `4fd3996`, `e2b37ee`, `125b4f6`, with no conflicts. Not pushed. After the merge fixes (section 6): `npm test` 952 of 952 pass; `npm run check:requirements -- --merged=1,2,P,3,4,5` fails only on K2 (its proof test is row 6.3, wave 2). **Uncommitted:** the merge fixes (tests, `requirement-tests.json`, the dead export) and this docs update; they follow in one commit on Zeke's go-ahead. The lines below are the state before the merge, kept as the record.

- Stage P is committed as `231a0d9` on `architecture-update` (not pushed). `npm test` 463 pass there.
- Four worktrees under `.claude/worktrees/`, each on its own branch cut from `231a0d9`: `lane-a` (`architecture-update-lane-a`), `lane-b`, `lane-l`, `lane-c`. Each links the main `node_modules`. No lane work is committed.
- The main copy of `BUILD-PLAN.md` has uncommitted edits (the planning chat's and the orchestrator's). Builders and reviewers read the main copy.
- Agents: builders Claude Fable 5.2, high effort; reviewers Opus 5.5, high effort, from the diff, the plan rows and the cited guide rows; the orchestrator confirms each finding by running code.
- Test rule since 2026-11-20: every new test title starts with its section 9 requirement ID, then the plan row.

| Lane | Rows | Built | Reviewed | Fixes | Orchestrator re-check | Tests in its worktree |
|---|---|---|---|---|---|---|
| A Poller | 3.1 to 3.5, 3.11 | yes | yes, 11 findings | done | done, A-R1 and A-R3 re-run and closed | 521 pass, 0 fail |
| B Workers | 3.7 to 3.9, 3.13, 3.15, 3.16, 3.18, worker side of L.2 and L.3 | yes | yes, 8 findings | done | done, B-R1 to B-R5 re-run and closed | 582 tests, 579 pass, 3 fail |
| L CentralReach client | L.1 to L.4, 3.14, form function of 5.13 | yes | yes, 11 findings | done | done, all closed | 549 tests, 518 pass, 31 fail |
| C Mappers | Stage 4 mapper rows, 4.14 and 4.16 mapper side, Stage 5, 3.10, 3.19 | yes | yes, 8 findings | done | done, all closed | 660 tests, 653 pass, 7 fail |

Every failure listed is an old test in a file another lane owns that asserts a rule a lane changed on purpose. They are reconciled at the merge (section 6). None is a defect in a lane's own code, by the reviewers' sorting.

## 2. Lane L — CentralReach client

One source file, `src/lib/centralReachClient.mjs`. New tests: `laneLLabelSender` (64), `laneLClientCreatePath` (14), `laneLLookupAndCreateAnswers` (16), plus 8 in `centralReachEmployeeContactForm`. `stage2Fakes.mjs` not edited.

| ID | Sev | Finding | Verdict | Outcome |
|---|---|---|---|---|
| L-R1 | medium | An `existingContactId` of only spaces ran the lookup, found the client, then created a second client. | Confirmed by running | Fixed: the ID is trimmed once. Re-run: one update, no create. |
| L-R2 | medium | Leaving `ExternalSystemId` out of every client update may wipe it, since the employee PUT clears a left-out field (client PUT untested, O-35). | Confirmed by reading; design change by the orchestrator (decision 28) | Fixed: an update carries `ExternalSystemId` only when CentralReach is known to hold the same value (found by the lookup in the call, or `externalSystemIdHeld: true` from the worker). Never `ContactForm`. **BUILD-PLAN rule 5.5 and BR22 still say "create only": reword at the merge.** |
| L-R3 | medium | A non-numeric required label ID was dropped silently, a managed label was removed and the result said confirmed. | Confirmed by running | Fixed: any entry of either list that is not a positive whole number is `CR_LABEL_NOT_SENDABLE` before any call. |
| L-R4 | low-medium | A label POST that failed with a timeout or 5xx was retried in-process (3 POSTs) and left nothing for the 150-second window. | Confirmed by running | Fixed: one POST per run; the error carries `labelPost`, which the worker saves. |
| L-R5 | medium | Contract (e) and (f) wording a worker builder could get wrong (when to clear `labelsPending`; save the post before any throw; option name; `CR_EXTERNAL_ID_REQUIRED`). | Confirmed by reading | Fixed in the contract text; the sender reads `requiredLabelIds` or `labelIds`. |
| L-R6 | low | Removing two exports breaks the import of `duplicateSafety.test.mjs`. | Confirmed (merge item) | Section 6. |
| L-R7 | low | A lookup answer of `0` or `12a` was used as a CR ID in a PUT. | Confirmed by running | Fixed: digits greater than 0, else `CR_LOOKUP_UNREADABLE`. |
| L-R8 | low | A 404 with an HTML body counted as "not found" and led to a create. | Confirmed by running | Fixed: a 404 with a plain-text or HTML body is `CR_LOOKUP_UNKNOWN`. |
| L-R9 | low | Create answers were read loosely (`id`, `result.id`). | Confirmed by reading | Fixed: `contact.contactId`, then `contactId`; `failed: true` or no readable ID is an unknown create. |
| L-R10 | low | A label read that lags more than 150 seconds, with the required set flipped back, could report confirmed while CentralReach holds the posted set. | Accepted, not built | Risk; the lag is timed in the Stage 8 label test. If it exceeds 150 seconds, widen the window. |
| L-R11 | low | Coverage and guide notes: the guide's `[GER-REQ]` still says BT/RBT form is always `Behavior Technician NY`; `RBT CO` rests on decision 17. | Noted | Guide note is O-34 (Zeke's request). |

Final interface (the authority is the contract comment blocks in the lane L file): `labelResult` = `{ operation: skip_empty | skip_present | skip_window | updated, postedLabelIds, postedAt, confirmed: true | false | null }`. Options: `requiredLabelIds` (or `labelIds`), `managedLabelIds`, `lastLabelPost { contactId, labelIds, postedAt }`, `contactCreatedThisRun`, `labelReadBackDelayMs` (default 5000). `createOrUpdateClient({ payload, existingContactId, externalSystemIdHeld })`.

Builder's open questions, answered: employee lookup and create tests are filed under BR3 with row 3.14 (accepted). A 429 on the label POST attaches no set (accepted).

## 3. Lane C — mappers

Files: `src/mappings/**`, `src/constants/centralReach.mjs`, `package.json`, `scripts/check-triggers.mjs`, `scripts/check-requirements.mjs`, `webhook-triggers.json`, `requirement-tests.json`. New test files: `stage4CaseMappings`, `stage4CaseLabels`, `stage4and5PropertyLists`, `stage5EmployeeMappings`, `checkTriggers`, `checkRequirements`. `stage2Fakes.mjs` not edited. The reviewer ran the real mappers over the guide's stored values for every row of section 9.2 to 9.4: every built row meets the guide; nothing open or held is built.

| ID | Sev | Finding | Verdict | Outcome |
|---|---|---|---|---|
| C-R1 | medium | The five Case metadata dates used a loose reader (`2026-02-30` sent as 03/02/2026; an unreadable date became a blank). Rule 5.7. | Confirmed by running | Fixed: read with `readDate`; an unreadable date leaves the field out and is named in `unreadableDateProperties`. **Lane D turns a non-empty list into `error`.** |
| C-R2 | medium | State matching is exact-name only, so a code like `NY` would remove a managed label. | **Rejected** on a production read | Production stores only full state names (`location` on all three objects; `state_home`). |
| C-R3 | low | Both check scripts exit 0 silently when run through a symlinked path. | Confirmed by running | Fixed. |
| C-R4 | low | Check-script test titles counted toward BR1, BR5, BR18. | Confirmed by reading | Fixed: titles tagged `[3.10]` or `[3.19]` count toward no requirement. |
| C-R5 | low | Some titles named a requirement they do not prove. | Confirmed by reading | Fixed (renamed). |
| C-R6 | low | `omitFieldIds: null` threw; an `ownerName` object was sent as `[object Object]`; a nameless staff record became a blank. | Confirmed by running | Fixed: the field is left out; a `warnings` list names the role. |
| C-R7 | low | `hubspot_owner_id` is in `signalOnly`, so row 4.18's missing-key check will not cover it. | Noted | **Lane D: a missing `hubspot_owner_id` key means "not read" (leave `ownerName` undefined).** |
| C-R8 | low | Auth Period with one date sends that date alone. | Not changed | Part of O-28. |

Builder's choices, ruled on:
- Assumed-format fields join with ", " (Client Availability, Known Allergies, Diagnosis, service address): kept until O-28.
- An `allergies` value other than `Confirmed` / `Denial` sends blank: kept (the appendix gives only those two).
- `hubspot_owner_id` added to Case `signalOnly`: kept.
- `check:requirements -- --merged=1,2,P,3,4,5` to say which stages are merged: kept.
- The strict date reader accepts `YYYY-MM-DD` and ISO date-times only. The live format is being checked in the sandbox (section 7).

Property lists after lane C: Case `mapped` gains 31 and drops 17 (`current_primary_bt` and `current_primary_bt_2` move to `signalOnly`); BT/RBT swaps 3; BCBA gains 11 and drops 6; field `134444` is gone. All requested names exist in production except Case `phone_number__second_` and BCBA `date_of_birth` (the first is dropped, decision 36) (BUILD-PLAN section 4).

**Addendum, 2026-11-20 (decision 35, O-36):** A BT/RBT whose `bt_rbt_type` is blank, or any value other than `BT` or `RBT` (such as `BT to RBT`), now has no role label managed: none is added and none is removed, and State labels are managed as before. A non-blank other value adds the mapper warning `unmapped_bt_rbt_type`, which names the property and never the value; a blank type adds no warning. It is built as `managedBtRbtLabels(btRbtType)` in `buildEmployeePayload.mjs`, with tests titled `[TL3][5.12] …`. The orchestrator ran the mapper on `BT`, `RBT`, `BT to RBT`, blank and null, and ran `npm test` in the lane C worktree: 658 tests, 651 pass, 7 expected failures (old tests in other lanes' files).

**Addendum, 2026-11-20 (decision 36, C9):** The Case property `phone_number__second_` is dropped from the mapping because it does not exist in HubSpot production (decision 36, which replaces decision 31). The integration no longer requests, reads or sends it, and C9 is not built. The CentralReach field it filled, `PhoneHome`, is left out of the client payload on a create and on an update (not sent as a blank). Built in `buildClientPayload.mjs` and `clientProperties.mjs`; Case `mapped` is now 59 properties; the orchestrator re-ran the mapper and `npm test` in the lane C worktree: 660 tests, 653 pass, 7 expected failures. Open risk, part of O-35: whether a client update clears a core field that is left out is untested. The sandbox property stays and is unused.

## 4. Lane A — poller, sweep, webhook

Files: the poller workflow and function, `hubspotClient.mjs` (search functions), `config.mjs`, `serviceBusClient.mjs`, `processClientQueue.mjs`, the webhook, the example settings. New tests: `stage3Poller` (25), `stage3DailySweep` (14), `stage3WebhookAndSettings` (6). Two old poller test files deleted (they proved the retired timestamp shortcut and dedupe ID).

| ID | Sev | Finding | Verdict | Outcome |
|---|---|---|---|---|
| A-R1 | high | Inside a block of more than 100 records with one modified time the poller pages by offset; a record written mid-run makes the offset skip another record and the checkpoint moves past it. | Confirmed by running (record 101 of 250 never queued) | Fixed: a block is paged by record ID (`GTE` T and `LTE` T with `hs_object_id GT`), then the search goes on at T plus 1 ms. Re-run: nothing missing. |
| A-R2 | high (loop) | An unlinked `waiting` or `error` record has its status rewritten every run; each write moves the modified time, so the hourly poller queues it again without end. | Confirmed by reading; lane B's builder found the same (its F-2) | **Lane B fix: write nothing when HubSpot already shows the same status and reason.** This changes the 11/18 "rewrites its status on each run, for now" decision; Zeke told 2026-11-20. |
| A-R3 | medium | The newest record of each object is queued again every hour until something newer changes. | Confirmed by running | Fixed: after a search with no more pages the checkpoint moves to now minus five minutes. Re-run: queued once in seven hourly runs. |
| A-R4 | low | More than 10,000 records with one timestamp fails every hour. | Removed by the A-R1 fix | — |
| A-R5 | low | An unreadable last timestamp gives NaN. | Confirmed by reading | Fixed: failed read. |
| A-R6 | low | Sweep: an empty page with a next cursor would loop until the timeout. | Confirmed by reading | Fixed: failed read. |
| A-R7 | low | A failed search is only logged. | Confirmed by reading | Fixed: the timer function throws after all objects ran. |
| A-R8 | low | `findHubSpotRecordsByEmployeeId` reads an answer with no `results` as "nobody holds this CR ID". | Confirmed by reading | Fixed: it throws `HUBSPOT_READ_FAILED` (temporary). |
| A-R9 | low | No test names BR10 for the hourly half. | Confirmed | Fixed: one test. |
| A-R10 | low | `isLinkedForOngoingRefresh` kept as dead code; `intakePollerHttpTest` runs the real sweep. | Noted | Remove the export at the merge (section 6). Note the HTTP test in the sandbox test plan (7.1). |
| A-R11 | info | Ticking the gate on an unlinked record that is then not edited is not found by the poller; the first run looks back one hour only. | Noted | Step 9.8: creates at go-live depend on the webhook or a fresh edit. |

Added by the builder in the fix round, accepted: a page that is not oldest-first or holds a record older than asked for, and an ID page that does not move past its start ID, are failed reads. No search carries `after` any more. Up to 100 records of a block are queued twice in the run that finds the block.

Where the build differs from the rows, all accepted: a new search from the last timestamp instead of HubSpot's `after` cursor (safer); the first run saves its start before searching; the timestamp shortcuts (`shouldSync…`) removed; the sweep pages by record ID and saves its place per page; numbers: poll page 100, cap 10 pages; sweep page 100, 60 a minute, cap 3,000 a run, first run at or after 08:00 UTC.

Retired settings: `MAX_DEALS_PER_RUN`, `MAX_BT_RBT_PER_RUN`, `MAX_BCBA_PER_RUN`, `DEDUPE_TTL_SECONDS`, `LOOKBACK_MINUTES`, `MAX_SEARCH_REQUESTS_PER_SECTION`, `LINKED_RECHECK_ENABLED`, `HUBSPOT_WEBHOOK_COALESCE_SECONDS`, `STATE_PROVIDER`, `STATE_TTL_ATTR`. Step 7.3 removes them from Azure.

Sources: `intakePoller`, `employeePoller`, `dailySweep`; webhook `hubspotWorkflow`. Cosmos: `poller:checkpoint` / `<portal>:client|bt_rbt|bcba`; `poller:sweep` / `<portal>:daily`; lease `workflow:intake-poller` / `<portal>:active-lease`.

HubSpot facts the poller relies on that no offline test proves (to check in the sandbox, each on Zeke's go-ahead): `hs_lastmodifieddate GTE` with an ISO string on deals and both custom objects; `GTE` T and `LTE` T in one group returning exactly the records stamped T; six filters in one group and twelve in one search; ascending sort by `hs_lastmodifieddate` and by `hs_object_id`; `HAS_PROPERTY` on `client_id_number` and `employee_id`; `EQ "true"` on the gate checkbox; `NOT_IN` on `dealstage`; `GT` on `hs_object_id`; `EQ "waiting"` on `last_sync_status`; `EQ "Yes"` on `entered_in_centralreach`; two filter groups in one search; `CONTAINS_TOKEN "Yes"` on a Case with two options ticked (A-14); whether a change to `case_status`, `staffing_status`, a name rollup or an association moves `hs_lastmodifieddate` (A-16, BR18).

**Addendum, 2026-11-20 (decision 37, row 3.1):** The poller schedule is the app setting `INTAKE_POLLER_SCHEDULE`, a six-field NCRONTAB string. Not set or blank means `0 0 * * * *` (hourly), so production needs nothing; a value that is not six fields is not used (hourly, one warning that names the setting, never a throw). It is built in `intakePollerSchedule()` in `src/functions/intakePoller.mjs`, with 7 new tests in `stage3PollerSchedule.test.mjs`; the orchestrator re-ran the function on sample values and `npm test` in the lane A worktree: 521 pass, 0 fail. The sandbox rounds may run every 5 minutes (`0 */5 * * * *`). At that interval: every change is queued twice (the checkpoint sits five minutes back; the second run writes nothing); after a crashed run the next two runs skip (the poller lease lasts 660 seconds); and a sweep above its 3,000-message cap would overlap itself (it does not arise with the gated sandbox test records). Call counts from 5-minute rounds are not production numbers.

## 5. Lane B — workers

Built (the builder's report; the review is running): rows 3.7, 3.8, 3.9, 3.13, 3.15, 3.16, 3.18; `labelsPending` with `labelsPendingContactId`; `lastLabelPost { contactId, labelIds, postedAt }` saved before any throw; an error carrying `labelPost` is saved then rethrown; `externalSystemIdHeld: true` when the linked-Case lookup found the same CR ID (and on the 3.15 pending-lookup link); `MAPPING_VERSION` `stage3-2026-11-20`; new temporary code `CR_CREATE_PENDING`; fixed sentence for `CR_LABEL_NOT_SENDABLE`; the lease test's clock frozen (40 runs, 0 failures). New test files `stage3NoOp`, `stage3ChangedFields`, `stage3CrIdDigits`, `stage3OmittedFields`, `stage3LabelWorkerSide`, `stage3BlankCoreFields`, `stage3PendingCreate`, `stage3LabelReviewAdditions`, fakes in `stage3WorkerFakes.mjs`.

Review (Opus 5.5, 2026-11-20): 560 tests, 557 pass, 3 fail (all in `stageP5Contracts.test.mjs`, merge list item 5). Correct by the review: gate order, the identity check before every update, duplicate protection (rows 2.3 and 3.15), retry sorting, the label contract against lane L's text, no value in logs or stored fields. Findings:

| ID | Sev | Finding | Verdict | Outcome |
|---|---|---|---|---|
| B-R1 | high | A clear is lost after a run that failed halfway (metadata fields and core fields, both workers): "written before" is judged only from the last clean run's hashes. | Confirmed by running (the reviewer's script, re-run by the orchestrator) | With the builder: `inProgressFieldHashes` saved before the first CentralReach write and counted while the last run is not clean. Rule 5.8 needs one line at the merge. |
| B-R2 | high | An employee read with no `contact` object makes the update leave out, and so clear, every blank core field. | Confirmed by running | With the builder: no update, `CR_EMPLOYEE_READ_FAILED`. |
| B-R3 | medium | A mapping version change drops the saved hashes, so clears are lost. | Confirmed by running | With the builder: old-version hashes stay the basis for clear decisions only. Row 3.7's "dropped" wording to fix at the merge. |
| B-R4 | medium | Decided outcomes and permanent failures write HubSpot on every run; with the hourly poller that is an endless loop (same as A-R2). | Confirmed by running (three runs, three writes) | With the builder: the status is written only when HubSpot does not already show it. Replaces the 11/18 "for now" decision on unlinked `waiting` records. |
| B-R5 | low | `labelsPending` is lost when the link save right after a create fails. | Confirmed by running | With the builder. |
| B-R6 | low | A pending-create marker with no time counts as old. | Confirmed by reading | With the builder: treated as recent and stamped. |
| B-R7 | low | A Case create can be held 15 minutes by a lookup failure although no create was sent. | Confirmed by reading | With the builder: the marker is cleared on `CR_LOOKUP_UNKNOWN` and `CR_LOOKUP_UNREADABLE`. |
| B-R8 | low | Two harmless differences from lane L's contract (a saved post with no `contactId` is ignored; the option name `labelIds`). | Accepted | Merge list item 5. |

**Fix round, 2026-11-20:** all seven fixes (B-R1 to B-R7) are built, with 22 new tests in `stage3ReviewFixes.test.mjs` (lane B's file of that name; lane A has one too, and both must survive the merge, see section 6). The orchestrator re-ran the reviewer's reproductions: the clear is sent after a half-failed run; a core value a failed run wrote is sent blank, not sent back; the clear survives a mapping version change; a repeated decided outcome writes HubSpot once; a read with no `contact` sends no PUT; `labelsPending` survives a failed link save. New link-record fields: `inProgressFieldHashes`, `inProgressContactId`. The builder's own choices, accepted: in-progress hashes accumulate across failed runs; a value sent by a create whose run then failed is sent blank on the retry if HubSpot is blank by then; Case `decidedError` also writes the CR ID and link when HubSpot lacks them. The three remaining failures are the `stageP5Contracts.test.mjs` tests of merge list items 4 and 5.

Paths that will still repeat a CentralReach call when such a record is queued again (once a day by the sweep after B-R4): the create CentralReach rejects, the rule 5.4 mismatch read, the Case mismatch lookup, a permanent 400 on an update. Accepted for now.

The builder's own findings and questions, ruled on: F-1 is B-R1; F-2 is B-R4; F-3 is B-R2; Q-1 is B-R3; Q-2, I-1, I-2, I-4 to I-7 and I-9 are accepted as built; I-8 is replaced by B-R6. Original list:
- **F-1 (it ran it):** a clear is lost after a half-failed run. A blank metadata field gets a value; the run writes it and then fails on a later field; HubSpot is blanked again; the next run sends no clear, because clears are decided from the saved copy, which a failed run does not update. Not fixed.
- **F-2:** the same as A-R2. To fix (above).
- **F-3:** row 3.13 takes sent-back values from `contact`; the employee reader also accepts an answer with the ID at the top level. Suggested: require `contact` in lane L's reader.
- **Q-1:** at a mapping version change the saved hashes are dropped, so no clear is sent for a field the old mapping filled and the new one leaves blank.
- **Q-2:** row 3.15 retries inside the window count toward the five attempts; after a create that failed clearly but left the marker, the next create comes at about 21 minutes.
- **I-1:** both workers read an optional `dependencies.omitFieldIds`, a seam for tests until lanes D and E fill the omit list.
- **I-7:** a blank date of birth on an update always sends back CentralReach's date, also when the integration wrote it (rule 5.7 over the general rule of row 3.13).
- Old tests changed: `noop` tests now assert zero writes; the date-of-birth update test split in two; `[2.3c]` marker 16 minutes old; non-digit CR IDs (`CR1` and so on) replaced by digits in four files because of row 3.16.

## 6. Merge list (the orchestrator, when Zeke says to merge)

**Done 2026-11-20.** Every item below is applied; the outcome is in bold after each. After the merge 37 tests failed: 36 were old tests of items 1 to 7 and 9, and one was a lane B row 3.15 assertion (item 9). `npm test` then 952 of 952.

Order: commit each lane on its branch, merge L, C, B, A into `architecture-update`, then apply the items below, then `npm test`, `npm run check:requirements`, and update BUILD-PLAN, OPEN-ITEMS and the tracker. Lanes L and C merge together (BUILD-PLAN section 17).

**File name clash:** lanes A and B each added `src/tests/smoke/stage3ReviewFixes.test.mjs`. Git will report a conflict (both added). Rename lane A's to `stage3PollerReviewFixes.test.mjs` and lane B's to `stage3WorkerReviewFixes.test.mjs` before or during the merge; no content changes. **Done: the merge reported no conflict.**

Old tests to change, each caused by a rule a lane changed:
1. **Linked contacts with no labels** (`CR_LABEL_READ_EMPTY` under row L.2): in `stage2DurableState.test.mjs` and `stage2PortalAndRetries.test.mjs`, the helpers `linkedEmployee` and `linkedClient` seed a base label (`cr.labels.set(contactId, [1052618])` and `[1052619]`). In `stageP2Associations.test.mjs`, `[P.2][BR17] the Case worker compares staffing…`: seed `[1052619]` on client 2001. Check lane B's new tests too (they seed a staff label 777). **Done: base labels seeded.**
2. **Made-up label IDs** (`CR_LABEL_NOT_SENDABLE` under row L.1): `stage1CreateIdentity.test.mjs`, the `[GBR]` label tests use `22` and `11`: use `1082499`, add a catalog handler, make the label GET return what the POST set, expect two label GETs. `stage2PortalAndRetries.test.mjs` `[2.7 decision 4] the three readers…`: `labelIds: [22]` becomes `[1052618]`. Lane L's patch has the exact text (scratchpad file `lane-l-other-lane-test-changes.patch`; if it is gone, the lane L builder's report lists each change). **Done: real label IDs and the catalog handler.**
3. **`duplicateSafety.test.mjs`:** drop the imports `externalIdLookupMissed` and `readExternalIdLookup` and the test `external-id lookup classification`; in four tests replace the handler key `PUT /contacts/client/byExternalSystemId` by the GET lookup; in `an external-id match updates and never creates` add a handler for `PUT /contacts/client/55`. **Done: the tests use the GET lookup and the dropped imports are gone.**
4. **Non-digit CR IDs:** `stage2DurableState.test.mjs` `[2.3b] a pending Workday ID whose CentralReach employee another HubSpot record holds…`: `CR7` becomes `7007` (lane B may already have done it). `stageP5Contracts.test.mjs`: every `"CR1"` becomes `"7001"`. **Done: digits in both files.**
5. **`stageP5Contracts.test.mjs`** (no lane owns it): the seeded `lastLabelPost` gains `contactId: "2001"`; `CASE_DEAL` uses `allergies: "Denial"`; the `[P.5a]` tests expect the filled managed lists (Case: `[1082499, 1132647, 1132648, 1052656, 1125427, 1121488, 1156743, 1156746, 1156747, 1156742, 1156744, 1156745]`; BT/RBT sorted: `[1052630, 1052631, 1107686, 1107687, 1107692, 1132650, 1132651, 1132652, 1132655]`) with inputs `location: "New York"`, `bt_rbt_type: "BT"`; `[P.5b]` asserts the staff and owner fields are built from the inputs; `[P.5c]` passes `staffNames` and expects allergies "No". **Done: the contract tests assert the filled lists and the built staff, owner and allergies fields.**
6. **`stage2DurableState.test.mjs`** `[2.1] a failed Case run keeps the CR ID…`: change `phi_first_name__cloned_` instead of `allergies` (a made-up allergies value now maps to blank). **Done: the test changes `phi_first_name__cloned_`.**
7. **Lane A leftovers:** delete `[2.6] the poller sends only through the portal-stamping senders` (source-text test, replaced by real runs); delete `linked recheck does not require stage or a newer timestamp` and the import of `isLinkedForOngoingRefresh` in `hybridChangeDetection.test.mjs`, then the export itself. **Done: the two tests are deleted and the export `isLinkedForOngoingRefresh` is removed.**
8. **`requirement-tests.json`:** map every Stage 1, 2 and P test title to its section 9 requirement IDs (row 3.19), then `npm run check:requirements -- --merged=1,2,P,3,4,5` must pass for the built requirements. **Done: it maps 41 old test titles; the new file `requirementProofs.test.mjs` adds 16 tests for old requirements that had none (BR7, BR12, C1, C2, C4, C5, C6, C7, B12, T8). The check fails only on K2 (row 6.3, wave 2). The BR11 proof tests read "one Workday ID per HubSpot employee record" as one Workday ID maps to one record, so a second record holding it is an error; that reading is assumption A-22 for Zeke.**
9. **Two tests that wait on the merge itself:** `[2.3b] an employee found by the pending ID is linked and updated, not created again` and `[2.7] Case worker, unknown create…` must pass once lanes L and B are together (`labelsPending`). **Done: both pass. One more lane B test, `[BR1][3.15] Case: lookup found inside the window…`, was written before lane L's label sender existed and expected `labelsPending` to stay true; with the lanes together the sender posts, confirms on the read-back and the worker clears the flag, as contract P.5 (e) step 2 says. The orchestrator corrected that assertion. No defect between lanes.**

Plan wording to fix in the same docs update: rule 5.5 and BR22 (External System ID on an update, L-R2); rule 5.6 and rows L.1 to L.4 (one POST per run; `labelPost` on a failed POST; `skip_window`); row 3.2 (paging by timestamp, by record ID inside a block; the checkpoint after the last page); the 11/18 Stage 3 decision on unlinked `waiting` records (A-R2); section 17 lane D rows (below); README settings. **Done 2026-11-20:** BUILD-PLAN rules 5.2, 5.5, 5.6, 5.7, 5.8, BR22, C1, C5, rows 3.2, 3.7, L.1 to L.4, the 11/18 Stage 3 decision, section 9 statuses, section 17 lanes D and E, the agents (sections 2, 17, 18) and A-22; README settings.

## 7. For wave 2 (lanes D and E)

- Lane D, Case worker: pass the same `staffNames`, `ownerName` and `omitFieldIds` to both `mapMetadata` calls (SP-R7); end the run as `error` with no CentralReach write when `unreadableDateProperties` is not empty (C-R1); log the mapper's `warnings` by code and role (C-R6); a missing `hubspot_owner_id` key is "not read" (C-R7); a staff record whose name keys are missing from the batch answer is a failed read; the `dependencies.omitFieldIds` seam is where the omit list goes (lane B I-1).
- Row 4.18 for production needs BCBA `date_of_birth` created (O-10). `phone_number__second_` is dropped (decision 36).
- Sandbox date format, checked 2026-11-20 on Zeke's go-ahead (format class only, no value): the two auth period dates and both ASD dates come back as `YYYY-MM-DD` (222, 157, 20 and 310 Cases hold a value). The strict reader of C-R1 fits. Not seen: `phi_date_of_birth` and `phi__policy_holder_dob` (the search found no Case with a value, probably because a sensitive property cannot be searched) and the employee `date_of_birth` (no sandbox record holds one; in production the BT/RBT property is a text mirror of the Contact). Those three are checked on the first sandbox round's test records.

## 8. Decisions and reads of 2026-11-20 (all in BUILD-PLAN section 4)

- Zeke: decisions 30 (test employees get a Contact), 31 (`phone_number__second_` kept; created in the sandbox), 32 (every Medicaid insurance type uses the Medicaid physician pair; row 4.23), 33 (production may be read, read-only, for a field question the sandbox cannot answer or a review of live Case and Contact use; token `HUBSPOT_PRIVATE_APP_TOKEN_PROD` through the orchestrator's guarded script), 34 (row 3.15 is built). Hard stop 3: HubSpot production is read-only; every HubSpot write and test runs in the sandbox.
- Zeke: do not build the New Mexico and Virginia labels (O-6 stays held).
- Orchestrator, under decision 28: row 3.13 rewritten after the blank-field test (an employee update sends back what CentralReach holds for a blank core field the integration did not write); the client half is held (O-35); L-R2.
- Reads: CentralReach catalog snapshot; four sandbox reads (P.7); the blank-field test on CR employee `5338681` (4 writes, restored); production property definitions and counts.

## 9. Waiting on Zeke

1. Decided and built 2026-11-20 (decision 36): `phone_number__second_` is dropped from the mapping.
2. Decided and built 2026-11-20 (decision 35): a blank or other `bt_rbt_type` manages no role label.
3. A-R2: confirm that an unlinked `waiting` or `error` record is no longer rewritten on every run.
4. Lane commits and the wave 1 merge: done 2026-11-20 on Zeke's go-ahead. Open: the commit of the merge fixes and docs, and any push.
5. Decided and built 2026-11-20 (decision 37): `INTAKE_POLLER_SCHEDULE`, hourly when not set.
6. The model split relayed by the planning chat on 2026-11-20 (cheaper models for lanes C and D, Fable for the final review): replaced by Zeke's word of 2026-11-20. Every review stays on Opus 5.5 high, the lane reviews and the final whole-diff review from `8fe5c54`; wave 2 builders are lane D Sonnet 5.5 high and lane E Opus 5.5 high (BUILD-PLAN section 17).
7. Held on Zeke's word (relayed by the planning chat 2026-11-20): the "Order after the build" text for section 13 and the "Azure runs for all of Stage 8" wording. Apply after the build is finished and committed and Zeke has reviewed the plan. Applied to BUILD-PLAN on 2026-11-20 on Zeke's word.
8. Assumption A-22 (BUILD-PLAN section 16): confirm the BR11 reading used by the proof tests.
   Confirmed by Zeke on 2026-11-20 (decision 38); the BT-to-BCBA case stays open for United Care.

## 10. Scripts the orchestrator wrote (session scratchpad; they can be cleared by a reboot)

The scratchpad folder is `/private/tmp/claude-501/-Users-zeke--claude-spares-spare-90X5V0/84a49a26-fd7e-44da-9ca2-9363fabfd3d5/scratchpad/`; `session-state.md` there holds the agent IDs. None is in the repo. Each loads its settings at run time and prints no value: `p6-cr-catalog-snapshot.mjs` (CentralReach catalog, read-only), `p7-hubspot-sandbox-reads.mjs` and `check-hubspot-portal.mjs` (sandbox, portal guard `52311591`), `create-sandbox-phone-second.mjs` (the one sandbox write, run by Zeke), `r313-blank-field-test.mjs` (the row 3.13 test), `prod-read.mjs` (production: GET and CRM search POST only, portal guard `50317927`, ops `properties`, `count`, `pipelines`, `associationLabels`), `sandbox-date-format.mjs`. If one is needed again and is gone, it is rewritten from this description.
