# Wave 2 log: lanes D and E

Written 2026-11-20 so the review record does not live only in a chat. It holds who did what, what each lane built, every review finding with its verdict, the merge, the production read, and what is carried forward. [BUILD-PLAN.md](BUILD-PLAN.md) is the plan; [WAVE-1-LOG.md](WAVE-1-LOG.md) is the log of wave 1.

## 1. Agents

| Role | Agent |
|---|---|
| Orchestrator | Claude Fable 5.2 |
| Lane D builder (Case side) | Sonnet 5.5, high effort |
| Lane E builder (employees, Contact routing, Stage 6) | Opus 5.5, high effort |
| Reviewers | One Opus 5.5 high review per lane |
| Reconcile code agent | Opus 5.5, high effort |

## 2. Lane D: Case side

Commit `ee64ba9`. Tests at that commit: 1035 of 1035.

- **Row 4.14.** Staff names by batch read, `USER_DEFINED` role types, record-ID order.
- **Row 4.18 for the Case.** A missing key is a failed read. This also covers the CR ID property, the gate key and the status keys.
- **Wave 1 duties.** Unreadable dates end as `error`; mapper warnings are logged; the same inputs go to both mappings; the omit list goes in through the seam.
- **Row 3.20 for the Case run.** The run summary line. Shared helper: `src/lib/syncRunSummary.mjs`.
- **Call observer.** An optional `onCall({ kind, status })` in `src/lib/centralReachClient.mjs` (orchestrator decision under row 3.20).
- **Logging limits.** An ID key allowlist and a 16000-character cap on `crCalls` in `src/lib/safeLog.mjs`.
- **Row 4.16.** First built on the owners API, then replaced by decision 39: the Case property `care_coordinator_name`.

## 3. Lane E: employees, Contact routing, Stage 6

Commit `cce4890`. Tests at that commit: 1043 of 1043.

- **Row 4.18 for BCBA and BT/RBT.** Also the CR ID property, the checklist key, the gate and the status keys.
- **6.1.** The webhook accepts Contact notices (object type `0-1`) and sends one `contactChange` message.
- **6.2.** Fan-out. It reads the Contact's `test_record`, queues one ordinary sync message per linked Case, and never calls CentralReach. (The BCBA branch was removed on 2026-11-21, decision 44.)
- **6.3.** The K2 proof tests.
- **6.4.** BCBA personal email, field 138069, from the BCBA's Contact. Several Contacts or a failed read leave the field as it is, with a warning.
- **Row 3.20 for the BCBA, BT/RBT and fan-out runs.**

## 4. Review findings

All confirmed by the orchestrator by running the reviewer's script. No high finding in either lane.

| ID | Sev | Finding | Outcome |
|---|---|---|---|
| D-R1 | medium | An answer without the CR ID key created a duplicate client. | Fixed. |
| D-R2 | low | `crCalls` was cut at 2000 characters. | Fixed. |
| D-R3 | low | No summary line on a configuration failure. | Fixed. |
| D-R4 | low | Operation `none` after a failed create or update; labels null after a failed label POST. | Fixed. |
| D-R5 | low | The owner call continued on a 401. | Fixed, then the owners path was removed by decision 39. |
| D-R6 | low | `attempt` was not wired. | Fixed with lane E. |
| D-R7 | low | Shared test files and two null-filling helpers. | Fixed in the reconcile pass. |
| D-R8 | low | Four test titles cited review IDs. | Renamed. |
| E-R1 | medium | `processEmployeeQueue.mjs` did not pass `attempt`. | Fixed. |
| E-R2 | low | Shared test files. | Reconcile pass. |

## 5. Merge

Lane D `dd50c14`, lane E `856aed4`. One conflict: an import line in `stage1CreateIdentity.test.mjs`. After the merge there were 1124 tests and 4 failed (`[K2][6.3]`, a fixture that left out `test_record`). They are fixed in the reconcile pass. Not pushed.

## 6. Production read, 2026-11-20

Read-only, through the guarded script, definitions and counts only.

- Every mapped and decision property exists for the Case (72 names) and the BT/RBT (26).
- The BCBA lacks only `date_of_birth` (O-10).
- `test_record` exists on all four objects.
- BCBA to Contact type 17 is `USER_DEFINED`, has no label, and is the only type.
- Care Coordinator and total hours counts are in decisions 39 and 40.

## 7. Carried forward

- Open items O-38 to O-42 (BUILD-PLAN section 15; on 2026-11-21 O-39 to O-42 closed by decisions 41 and 42 and O-41's report, O-43 and O-44 opened (O-44 closed the same day by decision 44), O-38 narrowed to `hours_bt_work_schedule_1`), and the new notes under O-34 and O-10.
- The final whole-diff review from `8fe5c54`.
- The sandbox test matrix and the record script are owned by the Q&A chat. They still name the old C10 and C20 sources and must be updated there.

## 8. Final whole-diff review (2026-11-21)

Reviewer: Opus 5.5 high. Scope: the whole diff from `8fe5c54` to `41e2c06`.

Verdict: ready for the Stage 7 plan review and a sandbox deploy. The reviewer found no duplicate-create, wrong-record, gate-bypass, label-wipe, lease or production-write defect. The reviewer ran 77 mutations. The tests caught every built requirement except BR21.

Findings. The orchestrator confirmed each one by running the reviewer's script.

| ID | Severity | Finding | State |
|---|---|---|---|
| F-1 | medium | A filled phone, email, state or gender that cannot be normalised is sent to CentralReach as null on an update. | Zeke (2026-11-21): "The field type needs to be confirmed for the phone, email, state or gender for central reach and correct the transformation in the mapping." Fixed 2026-11-21, uncommitted (decision 43). Read-only CentralReach check on test employee `5338681` (GETs only, formats only): `phoneCell` is 10 digits, `stateProvince` is 2 upper-case letters, `gender` is one Title-case word, `primaryEmail` is an email, all plain text with no option list in the metadata configuration; Meta `138069` Personal Email is type `input`. Fix: shared readers in `src/lib/fieldFormats.mjs` (`readPhone`, `readEmail`, `readStateCode`, `readGender`). A filled value that cannot be converted ends the run as `error`, reason "Unreadable value: <property>", code `UNREADABLE_VALUE`, before any CentralReach write, on create and on update, link record untouched; blank handling unchanged. Ending as `error` was the orchestrator's recommendation; Zeke confirmed it on 2026-11-21 ("Yes, error"). Tests: `src/tests/smoke/f1UnreadableValues.test.mjs` (22 new; suite 1166). New open items O-45 and O-46. |
| F-2 | medium | BR21 had no real proof. Adding a person's value to three log lines left all 1122 tests passing. | Fixed with `src/tests/smoke/br21NoValuesInLogs.test.mjs`. |
| F-3 | low | Nothing checks at run time that the HubSpot token belongs to `HUBSPOT_PORTAL_ID`. | Built (2026-11-21). One cached `GET /account-info/v3/details` in `src/lib/hubspotClient.mjs` runs before any HubSpot call. A different portal ends with error code `HUBSPOT_PORTAL_MISMATCH` naming both portal IDs, no CRM call is made, and the message is retried, then dead-lettered, like a configuration failure. Tests `[BR20][F-3]` in `src/tests/smoke/f3HubSpotPortalCheck.test.mjs`. The manual check is BUILD-PLAN row 7.3. |
| F-4 | low | Two queue exits log no summary line. | Row 3.20 note added. No code change. |
| F-5 | low | README and settings example had drifted from the code. | Fixed. |
| F-6 | low | Simplicity: unused exports from before the lanes, `clientSyncHttpTest` returns 501, two call shapes on `createOrUpdateClient` and `createOrUpdateEmployee`, four answer shapes in `readLabelIds`. | Not changed. Listed for later. |

## 9. Production survey, 2026-11-21

Read-only, through the guarded script, counts only. No values were kept.

| Object | Phones | Emails | State and gender |
|---|---|---|---|
| Case | 2,493 as 11 digits starting 1; 286 as 10 digits; 8 other | 0 badly formed | 0 unreadable |
| BT/RBT | 4,888 as 11 digits starting 1; 1,168 as 10 digits; about 22 other | 23 badly formed | 0 unreadable |
| BCBA | 334 as 11 digits starting 1; 3 as 10 digits; 2 too short | `email`: 3 badly formed | 0 unreadable |

- BCBA `ucaba_email_address` is blank on 256 of 374 BCBAs; `email` is filled on 361 (O-49; closed by decision 49, the primary email reads `email`).
- BCBA `date_of_birth` (single-line text, created 2026-11-21) is blank on all 374. The older `dob` holds 214 values as M/D/YYYY, 1 in another format, and 159 blank (O-10; the code reads `dob` since decision 48).
- The 26 badly formed employee emails and the short phones end as `error` unless United Care corrects them (O-48).

## 10. Changes of 2026-11-21 after the review

Decisions 44 to 47 (BUILD-PLAN section 4): the fan-out's BCBA branch removed; the BCBA date of birth read as text (`readTextDate`, tests `bcbaTextDateOfBirth.test.mjs`); phone read in any US form and sent as 10 digits; a linked employee update sends HubSpot's primary email (tests `employeePrimaryEmailUpdate.test.mjs`). F-3 keeps its run-time check; the manual step is dropped from row 7.3. New open items O-47 to O-49; O-44 and O-45 closed.

Decisions 48 and 49 (BUILD-PLAN section 4), same day. 48: the BCBA date of birth is read from `dob` (constant `BCBA_DATE_OF_BIRTH_PROPERTY`); `date_of_birth` is no longer requested for the BCBA; the placeholder rule is unchanged; pending United Care (O-10). 49: the BCBA primary email is the BCBA's own `email` (constant `BCBA_PRIMARY_EMAIL_PROPERTY`); `ucaba_email_address` is no longer requested (O-49 closed). Meta 138069 stayed on `email` until decision 50 (O-50). `node scripts/check-triggers.mjs --expected` now lists `dob` and `email` for the BCBA and no `ucaba_email_address` or `date_of_birth`. Tests updated in `bcbaTextDateOfBirth.test.mjs`, `employeePrimaryEmailUpdate.test.mjs`, `f1UnreadableValues.test.mjs`, `stage4and5PropertyLists.test.mjs` and the BCBA fixtures.

Decision 50 (BUILD-PLAN section 4), 2026-11-23: Meta 138069 Personal Email reads `personal_email` (constant `EMPLOYEE_PERSONAL_EMAIL_PROPERTY`) on the BCBA (B9) and, new, on the BT/RBT (T9). Before, the BT/RBT did not send 138069 and the BCBA sent it from `email`; `email` now feeds the BCBA primary email only, so an `email` change no longer counts `metadata.138069`. The CentralReach field constant is renamed `PERSONAL_EMAIL` (was `BCBA_EMAIL`). `personal_email` is in the BCBA `mapped` list, so `node scripts/check-triggers.mjs --expected` lists it under BCBA (24). The BT/RBT half is held (2026-11-23, T9; relayed by the testing chat on 2026-11-23, confirmed by Zeke in the build chat on 2026-11-23 ("yes, commit and push"): "For personal email for BT/RBT leave this out for now - make a note to confimr the field with Danny and the client."): the BT/RBT does not request or send `personal_email` or Meta 138069, and the BT/RBT list is 22. O-50 and O-38 closed; O-51 opened (does `personal_email` exist on both objects in the sandbox and in production). Tests updated or added in `stage6BcbaPersonalEmail.test.mjs` (`[B9][6.4]`, `[T9][6.4]`), `f1UnreadableValues.test.mjs`, `employeePrimaryEmailUpdate.test.mjs`, `stage4and5PropertyLists.test.mjs` and `stageP1PropertyLists.test.mjs`.

Decision 51 (BUILD-PLAN section 4), 2026-11-23: the HubSpot re-enrollment triggers are set up and maintained by Zeke in HubSpot. `docs/workstreams/architecture-update/webhook-triggers.json` is deleted; `scripts/check-triggers.mjs` no longer reads a file or compares (`checkTriggers` removed); it prints the expected trigger properties per object, with or without `--expected`, and exits 0. `expectedTriggerProperties`, `writtenProperties` and `formatExpectedList` stay exported. Rows 3.10, 7.2 and 9.6 and requirement BR18 reworded; risk R-36 added. Tests in `checkTriggers.test.mjs`: the comparison and empty-file tests removed.

For reference, relayed answers from the testing chat (2026-11-23, no code change): the B4 test value is set on the BCBA's Contact and mirrored to the BCBA `email`; the `ucaba_email_address` decoy test is dropped.

## 11. Stage 7 plan review (2026-11-23)

Done 2026-11-23 by an Opus reviewer, read-only. Relayed by the testing chat, 2026-11-23; not re-run by the build chat.

- **Verdict:** ready for step 7.3 with three conditions: (i) the deployed commit includes the T9 hold; (ii) row 7.3 names all required settings; (iii) a step states when employee creates are on. All three are now written into BUILD-PLAN row 7.3.
- Row 7.1 (a) to (f) all pass. The reviewer ran the round 1 values through the real mappers and they matched every create expectation.
- No open item blocks 7.3 or the first Stage 8 push.
- Findings passed to the testing chat (their files): only one live unreadable-value row in the matrix; the O-11 changed-email test rests on the BCBA Contact mirror, which was blank in the sandbox on 2026-11-20; `check-cr-record.mjs` checks creates only; the `care_coordinator_email` decoy is listed in the matrix but not set by the script.

## 12. Stage 8 build, 2026-11-24

The build chat built the build package (`BUILD-PACKAGE-DRAFT-2026-11-23.md`, Zeke's decisions quoted there) on top of deployed `655b385`. Written from the build chat's hand-over note of 2026-11-24 and checked against the code; where the two differ, this section says what the code does. The decisions are BUILD-PLAN decisions 52 to 60.

**Superseded in part by section 13.** This section describes the state after steps 1 to 8. The parts it lists as not built or held (rule 7, the blank typed supplier, junk Address 2, items 2, 3, 6 and 8, the blank-date employee update) were built afterwards, as decisions 61 to 66.

### Agents

| Role | Agent |
|---|---|
| Orchestrator | Claude Fable 5.2, medium effort (the build chat) |
| Builders | Opus 5.5, high effort |
| Reviewers | Opus 5.5, high effort; one independent reviewer per step, given the files, not the builder's conclusions |

### What each step built

| Step | Package items | Decision | Built |
|---|---|---|---|
| 1 | 14, 24 | 52 | Two gate settings, `SYNC_CREATE_GATE_PROPERTY` and `SYNC_UPDATE_GATE_PROPERTY`, each falling back to `SYNC_RECORD_GATE_PROPERTY` when not set (the sandbox is unchanged). The path follows the HubSpot CR ID. Production guard on `50317927`: exactly `centralreach_creates_only` / `centralreach_updates_only`; refuses `none`, `SYNC_RECORD_GATE_PROPERTY` = `none` and `INCLUDE_TEST_RECORDS` = `true`. The poller and sweep filter per branch. The `gate` key on the run summary line for `record_gate` skips only (`setGate`, `RUN_GATES`). `README.md` documents the settings. Tests `stage7TwoGates.test.mjs`, `stage3WebhookAndSettings.test.mjs`. |
| 2 | 1, 16 | 53 | The BCBA reads `date_of_birth`, not `dob`; both employee types read it as text (`readTextDate`). The create placeholder is unchanged (2000-01-01). Item 1's update-with-blank half is not changed (held, question 27, O-52). Tests `bcbaTextDateOfBirth.test.mjs`, `employeePayloadMapping.test.mjs`. |
| 3 | 4, 7 | 54, 60 | Physician and NPI joined by one space, trailing commas and spaces dropped. Client Availability is the text alone; `client_service_hours_total` is no longer read. `MAPPING_VERSION` = `stage7-2026-11-23`, the one change for the deploy. |
| 4 | 9, 10 | 55 | 131308 from the roles 82, SUB, Outgoing SUB, Outgoing Supervising, each name + " BCBA LBA"; the typed-supplier fallback with the suffix (guide insert E). Grad Permit Holder 136052. Supervisor through the BCBA → BCBA association (sandbox 227, production 151). Outgoing BT 1 / 2 join BT #1 / #2 Name. On Leave is never read. The BCBA batch read has its own list (`first_name`, `last_name`, `lba_licensure__ny`). Rule 7 (mixed holders) held: that Case keeps the deployed behaviour (131308 the typed supplier, no suffix; 136052 not sent) and makes no supervisor read (O-55). Tests `stage7GradPermitRoles.test.mjs`. |
| 5 | 5 | 56 | The two-line service address (package CF §12.4); `service__stateregion_2` read; `full_home_address` no longer read. `StateProvince` falls back to the Case `location`; an unreadable `stateregion` no longer ends as `error` (a warning, no value). The junk Address 2 rule is not built (question 7, O-54). Item 6 untouched (question 25, O-53). |
| 6 | B21 | 57 | Route A: `getClientByContactId` (`GET /contacts/client/{id}`), read inside the update branch of `createOrUpdateClient`, so it covers all three update paths; `keepHeldClientCoreFields`. An unusable read is `CR_CLIENT_READ_FAILED`, permanent, no PUT. One more CR GET per client update that is not a no-op. Tests `stage3BlankCoreFieldsClient.test.mjs`. |
| 7 | 15 | 58 | `workdayIdIsValid`, code `WORKDAY_ID_INVALID`, reason "workday_id must be exactly 7 digits.", after the gate and the unreadable-value check and before every CR call. A blank `workday_id` is handled as before. Test fixtures moved to 7-digit IDs. Tests `stage7WorkdayIdFormat.test.mjs`. |
| 8 | 12, 18 | 59 | `CR_LABEL_POST_UNCONFIRMED` first retry at 150 s (a scheduled Service Bus message; steps 150, 300, 900, 3600, 14400 s). Item 18: gate tests for one gate and for two gates, all three workers, through the real queue functions (`stage7RecordGateEveryPath.test.mjs`). |

Not built: items 3 and 8 (PENDING, O-56); item 6 in any form (O-53); items 2 (O-60), 11 (O-6), 13 (O-61), 19 to 22 (O-62); items 17 and 23 (dropped); rule 7 (O-55); the junk Address 2 rule (O-54); item 1's update-with-blank half (O-52).

### Review findings

Each step had one independent review; the first fix pass had one more. No review found a blocker. A final fix pass of 2026-11-24 handled the last nits (marked "final pass").

| Step | Finding | Handled how |
|---|---|---|
| 1 (14, 24) | Should-fix: the run summary had no `gate` key | Built: `setGate`, set only on `record_gate` skips |
| 1 | Should-fix: no test of an employee linked only in Cosmos | Test added |
| 1 | Should-fix: the CR ID key is not a required key (package D18 f) | Not applied: a missing CR ID key is today a decided error (row 4.18, fix D-R1), and no CR call is made either way. O-57, for Zeke |
| 1 | Nits: redundant `requirement-tests.json` entries; no read-list test; README | Entries removed (the file equals `HEAD`); test added; README updated |
| 2 (1, 16) | Should-fix (testing side): the sandbox scripts' BCBA date decoy and `dob` | Handed to the testing chat |
| 2 | Side effect: BT/RBT dates before 1900 or in the future now end `error` | Accepted: production BT/RBT `date_of_birth` is blank on every record (testing chat read, 2026-11-24) |
| 3 (4, 7) | Nit: a name ending ", ," kept a comma | Regex fixed |
| 4 (9, 10) | Should-fix: the held mixed Case still made the supervisor read | Skipped through the shared `mixedGradPermitHolders`; test added |
| 4 | Should-fix: the On Leave test did not prove its title | End-to-end test added |
| 4 | Ambiguity: a blank typed supplier clears 131308, against "sends nothing" | O-58, for Zeke |
| 5 (5) | Should-fix (sequencing): step 5 must not deploy without B21 (an update with no usable state would PUT `StateProvince: null`) | Both are in this build |
| 5 | Nit: the whole-address detector is loose (follows CF §12.4) | O-59, for Zeke |
| 6 (B21) | Should-fix (verification): sending CentralReach's own `""` back for gender, email, phone, state and ZIP is untested against the real client PUT | Sandbox round before production (R-38); handed to the testing chat |
| 6 | Nits: an odd CentralReach date of birth blocked every update, also one that sends HubSpot's date; held values not type-checked; test gaps (404 / 403 / 5xx / timeout on the client read, the pending-create marker, `warnings` in the PUT body); a dead `CR_CLIENT_READ_FAILED` clause; comments | Final pass: the read fails only on a held value that would be sent back (`unusableHeldClientCoreField`: text or null, a filled date starting `YYYY-MM-DD`); tests added; the clause removed (the code is already permanent); comments fixed |
| 7 (15) | Should-fix: the "nothing changed" test did not prove the check | Saved identity hash seeded; mutation-verified |
| 7 | Nits: gate false with a bad ID; a whitespace-only ID | Tests added |
| 8 (12, 18) | Should-fix: the BCBA retry row and the two-gate rows were unproven | Tests added |
| 8 | Nit: a run with a failed metadata field and an unconfirmed label still retries at 60 s | Left: outside item 12's wording |
| First fix pass | No blocker, no should-fix. Nits: the Cosmos-only Case test passed without its link; the run-summary key lists had no `excluded_stage` skip or `error` line; README gate wording | Final pass: the client is seeded under another External System ID (the test fails without the link); key lists added; README reworded. The KQL `gate` column is the testing chat's |

Where the package's wording and the code differ (found in the hand-over and in the code; the code is what BUILD-PLAN now states):

- **Item 16:** the package says an unreadable BT/RBT date is named in `unreadableValueProperties`; the code reports it through `dateOfBirthStatus`, as before the build, and the run ends as `error` "Unreadable date: date_of_birth".
- **Item 5:** the package says a state that cannot be found is "null (left out)"; the mapper emits `StateProvince: null` with the key present. On an update, decision 57 then sends CentralReach's held state; on a create, `null` is sent.
- **Item B21:** the package says every one of the 11 core keys is in the PUT body. The code leaves `DateOfBirth` out when HubSpot and CentralReach both hold none (a date is never sent blank). The code also treats as a failed read a held value that would be sent back (the field is blank in HubSpot) but is not text or null, or is a filled `dateOfBirth` that does not start with `YYYY-MM-DD`; the package names neither. A filled HubSpot field never depends on the held value, so the update that corrects an odd CentralReach date goes through.

### Tests and checks

- `npm test`: 1212 before the build (deployed `655b385`), 1329 after the final pass, 0 fail.
- New test files: `stage7TwoGates.test.mjs`, `stage7RecordGateEveryPath.test.mjs`, `stage7GradPermitRoles.test.mjs`, `stage7WorkdayIdFormat.test.mjs`, `stage3BlankCoreFieldsClient.test.mjs`. Many older test files changed (the 7-digit fixtures, the client read in the update paths, the run summary keys, the date sources).
- `npm run check:requirements` passes; `requirement-tests.json` is unchanged, because every new title carries its requirement ID. C13 is "built (package) (decision 55); rule 7, mixed holders, held (O-55)" in BUILD-PLAN section 9 (final pass): `checkRequirements.test.mjs` used C13 only as an example of an open row, and now uses C18, which is still open.
- `npm run check:triggers` passes and prints Case 67, BCBA 24, BT/RBT 22, Contact 4 (Case was 68: `client_service_hours_total` and `full_home_address` out, `service__stateregion_2` in; the BCBA lists `date_of_birth` in place of `dob`).

### For the testing chat (from the hand-over; testing-side files the build chat did not touch)

1. `create-test-records.mjs` and `check-cr-record.mjs`: the BCBA date of birth is `date_of_birth`, with no decoy in it (a decoy there would be sent to CentralReach as a real date); clear any old decoy on existing sandbox BCBAs. `full_home_address` and `client_service_hours_total` are no longer read; `service__stateregion_2` must be set.
2. Sandbox Workday IDs must be 7 digits, or every employee run ends as `error`.
3. Matrix rows to rewrite: C19 (text alone), C31 (one space), C24 (two lines), C8 (state fallback, no `error` for an unreadable `stateregion`), B5 and T2 (date of birth), BR16 and R1-U2 (core fields kept), BR8 and 3.17 (Workday check), BR19 (`delaySeconds: 150`), C12, C13, C15, C16, and the live gate test set of package D18 g.
4. C13: confirm 227 is the holder-side label (if the read lists nothing, the ID is 226; A-23).
5. R1-U2: include a client whose gender is blank in HubSpot and in CentralReach; the PUT now sends `Gender: ""` where the deployed code sent `null` (R-38).
6. Step 5 (decision 56) does not deploy without step 6 (decision 57): an update with no usable state would otherwise send `StateProvince: null`.
7. Zeke: add `service__stateregion_2` to the HubSpot Case workflow triggers; the BCBA workflows trigger on `date_of_birth`.

### State

Nothing committed, nothing deployed, no live call, no Azure write. BUILD-PLAN (decisions 52 to 60, rules 5.1 to 5.8, section 9, Stages 7 to 9, sections 14 to 17), OPEN-ITEMS (row 37, O-52 to O-62) and this log are updated to match the code.

## 13. Last build pass and risk verification, 2026-11-24

Written after section 12, from the build chat's hand-over, the five verification reports, the risk register, the recency audit and the code (`git diff`, read-only). Where a summary and the code disagreed, the code is stated.

### Agents

| Role | Agent |
|---|---|
| Orchestrator | Claude Fable 5.2, medium effort (the build chat, "i.p - Architecture Build 2") |
| Builders, passes A to F | Not recorded in the sources given to this writer (steps 1 to 8: Opus 5.5, high effort) |
| Reviewers | Opus 5.5; one independent reviewer per pass; no blocker in any review |
| Verification workers | Five read-only workers, one per group of the register (model not recorded); guarded GET-only scripts against HubSpot production `50317927` (and the sandbox `52311591` for some items), and the cached CentralReach evidence |
| Documentation worker | Claude Sonnet 5.5 (this section, BUILD-PLAN, OPEN-ITEMS and the hand-over note) |

### The passes

| Pass | What was built | Decision | Review outcome and findings handled |
|---|---|---|---|
| A | Rule 7: a Case with some Grad Permit holders and some not leaves 131308 and 136052 out, warning `grad_permit_mixed_supervising_bcba`. A blank typed supplier sends nothing (131308 is never cleared by the integration). Address 2 is null when only commas or a state. A whole address in the street is split only with a state before the ZIP. | 61, 62 | No blocker. Verified in the code: `mixedGradPermitHolders`, `supplierWithSuffix`, `getServiceLocationAddress2`, `holdsWholeAddress`. |
| B | Items 3 and 8: Known Allergies per CF §10 and §11.1; Severity `Level N` sends `N`. | 63 | No blocker. Verified in `getKnownAllergies`, `getSeverityLevel`. |
| C | Items 6 and 2: Care Coordinator from `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`; `referral_other`. | 64 | No blocker. The four Case properties are 404 in production, so the production deploy must wait for them (R-45). |
| D | An employee update with a blank HubSpot date sends back CentralReach's date rebuilt `YYYY-MM-DDT00:00:00.000Z`; a read with no `dateOfBirth` key is `CR_EMPLOYEE_READ_FAILED`, no PUT; stale comments corrected (N7). | 65 | No blocker. Verified in `keepUnwrittenCoreFields`, `unusableHeldEmployeeDateOfBirth`. |
| E | Offline tests H1 to H14 and traceability entries in `requirement-tests.json` (N9, N10). The leg of H4 "34 archived Prior fields never requested" was not added: the names are recorded nowhere and the review marks it optional. | none | No blocker. Test nits left for the cleanup pass: over-broad tags on the `laneLLabelSender` swap test and on H3, hardcoded reason strings in the H8 test, an over-broad "no deactivation" regex in `requirementProofs.test.mjs`. The H labels are not in the test titles, so the tests could not be matched to H1 to H14 by title. |
| F | The client confirm re-map computes its own omit list (a supplier or coordinator status that changed during the run ends `SYNC_STALE`); `keepOmittedFieldHashes` takes the in-progress hashes and keeps the sentinel `UNSETTLED_FIELD_HASH` for a field an unfinished run may have sent; Care Coordinator names single-spaced. The employee worker keeps the old omitted-hash behaviour. | 66 | No blocker. Should-fix, not done: tests for two branches of `keepOmittedFieldHashes` (B4 and B2 mutants, and the B5 sequence). Nits, not done: comment wording, the sentinel's token. Accepted cost: one extra send of an omitted field after an unfinished run. |

Unchanged by Zeke's word: a missing CR ID key in a Case answer stays a decided `error` ("7. Keep the behavior"); the item 10 outgoing-role rules are confirmed.

### The verification of the risk register (V1 to V46)

Zeke asked that every risk and assumption raised in the build be taken back down to the record and checked. The register (`risk-register.md`, scratchpad) lists 46 items in six groups. Results: VERIFIED 30, PARTLY 13, REFUTED 1, NOT VERIFIABLE HERE 2. "Report" names the file in the build chat's notes folder: g1 `build-chat-2-verify-group1-address-2026-11-24.md`; g2 `build-chat-2-verify-group2-clinical-coordinator-2026-11-24.md`; g3 `build-chat-2-verify-group3-gradpermit-roles-2026-11-24.md`; g4 `build-chat-2-verify-group4-6-employees-code-2026-11-24.md`; g5 `build-chat-2-cr-verification-2026-11-24.md`. Production HubSpot counts are from 2026-11-24 (2,882 Cases); "linked" means the CR ID property is filled.

| ID | Item | Status | Proof (counts) | Report |
|---|---|---|---|---|
| V1 | Whole address in the street: split rule | VERIFIED | 2,882 Cases run through the real mapper. 3 of 40 service streets split, all correct (state code, comma before it), none with a CR ID; 2,241 home streets, 0 split; 0 "Suite 10001" shapes. Offline, "12 Smith Ct, 06001" splits (Ct read as CT); 0 in production. 3 whole addresses are not split (none linked). | g1 |
| V2 | Line 2 keeps the state as typed | VERIFIED | All 3 split streets hold an upper-case code, so line 2 is "city NY ZIP". None has a CR ID, so nothing to compare; cached CentralReach (2026-11-23) shows the code on line 2 of 51 of 51 two-line values. | g1 |
| V3 | Address 2 null when only a state | VERIFIED | `service_address__other` filled on 2,577 (claimed 2,578); 2,536 hold only a state (claimed 2,537); no lone state word without commas. 25 More Than One Location Cases: 5 null (none linked), 20 sent (8 linked). | g1 |
| V4 | State fallback to `location` | VERIFIED | `stateregion` blank on 2,705; none unreadable. `location` has 3 options: New York 2,274, Colorado 276, New Jersey 6, blank 326, all mapped right. Both blank on 6 of 491 linked (claimed about 9 of 487). | g1 |
| V5 | `service__stateregion_2` exists and reads | VERIFIED | Exists, select, 50 state names (no DC). Filled on 1,627 Cases (claimed 1,606); all read as NY, CO or NJ. | g1 |
| V6 | Apartment placeholders treated as blank | PARTLY | The rule drops NA 5, N/A 2, n/a 1 (home) and NA 2 (service); no real unit dropped. Missed: "?" 1. Larger class kept: "PH" 133 used Cases (57 linked) plus 4 variants. Whether CentralReach holds "PH" for the 57: not verifiable here. | g1 |
| V7 | Street and city oddities | VERIFIED | All exist: punctuation-only street 1; city already holding the state 11 Cases (3 linked); trailing commas 172 used home streets (59 linked). New: unit printed twice 201 (93 linked); comma in line 1 on 503 (170 linked); core address applies no C24 rules (8 Cases, 4 linked); no ZIP on 28; 326 Cases with no state (6 linked). | g1 |
| V8 | Allergies: Confirmed explains | PARTLY | 314 Confirmed: 308 allergen text, 3 "NA", 1 blank, 2 not allergens ("Not sure"; "unknown" with a date), sent as typed. No NKA, NKDA, "no known", "N.A.". Denial explains: 722 "NA", 1 "N/A", 2 other (ignored). Claim "310 text" was 308 plus 2. | g2 |
| V9 | CentralReach "None" overwritten | VERIFIED | Cached 2026-11-23: Confirmed + text vs CentralReach "None" 6; on Denial pairs CentralReach holds None 32, none 7, No/no 4, N/A 2 (all become "None"). | g2 |
| V10 | Severity values | VERIFIED | Stored: Level 3 158, Level 2 153, Level 1 23, blank 2,548; none outside the options. CentralReach holds digits (15 of 15 paired), one "4". | g2 |
| V11 | Physician and NPI | PARTLY | Rule works as written; premise differs. 0 names end in a comma. Medicaid names (2,044): 160 end ", credential", 17 other comma, 41 start "Dr", 19 padded, 2 double space. NPIs (534): 525 ten digits, 3 padded, 6 wrong length. Output holds a comma on 169 Cases, 128 in scope; CentralReach (107 clients, cached) shows one space, no comma. Pair-by-pair CentralReach values not cached. | g2 |
| V12 | Availability text alone | PARTLY | HubSpot 238 filled, none ends ", number"; mapper output equals trimmed text on all 238. CentralReach: none of 104 cached real values has hours. The 622 real clients visible now were not read. | g2 |
| V13 | Referral and `referral_other` | VERIFIED | `referral_source` is a synced read-only property: Other 165 (51 linked, 21 in scope), blank 293, 12 other values. `referral_other` 404 in production; sandbox `0-3/referral_other` exists as plain text (`calculated=false`), not yet a property sync. | g2 |
| V14 | Care Coordinator properties and status | PARTLY | Verified: sandbox status options exactly the 8 lowercase values the code lists; 3 properties exist in sandbox, 404 in production. REFUTED: "0 Team Member records" (sandbox has 1, owner 161391908) and "every Case missing_match" (1 missing_match, 1,278 blank of 1,557). "69" is the count of values differing from HubSpot among 73 paired clients, not across all 713. | g2 |
| V15 | Coordinator warning volume | VERIFIED | 407 in-scope production Cases (369 linked), all blank status; at least 369 warnings a day from the sweep once the properties exist. The KQL error query matches the line. Today every run stops earlier with `HUBSPOT_PROPERTY_MISSING`. | g2 |
| V16 | Retired properties not read; triggers | VERIFIED | No `src/` read of `client_service_hours_total`, `full_home_address`, `care_coordinator_name` (comments only); `create-test-records.mjs` still sets `care_coordinator_name`. Sandbox workflow 1931927833 still triggers on the two retired properties and not on `bt_rbt_2_work_schedule`, `service__stateregion_2`, `referral_other`, the 3 coordinator properties, `enter_in_central_reach`. Production workflows: 403. | g2 |
| V17 | Mapped Case properties exist | VERIFIED | 63 mapped Case properties; exactly 4 missing in production (`referral_other`, 2 coordinator names, status); the other 18 requested exist; the sandbox has all 81. | g2 |
| V18 | Association type IDs | VERIFIED | Every portal-table ID and label matches the live reads in both portals (production 82, 86, 145, 234, 288, 135, 236, 76, 143, 131, 166, 151; sandbox 247, 223, 229, 217, 221, 253, 233, 238, 240, 244, 236, 227). Staff-to-Case inverse IDs differ and are not in the table. Sandbox 227 is the holder-side label; 20 type-151 and 0 type-150 rows sit on holder records. No sandbox 227 link read. | g3 |
| V19 | `lba_licensure__ny` = `Grad Permit` | VERIFIED | Select in both portals; option values `Yes`, `In Process`, `No` (label Will Apply), `Grad Permit`. Stored on 375 BCBAs: Grad Permit 28, Yes 186, No 49, In Process 43, blank 69; no case or spacing variants. | g3 |
| V20 | No Case has two Supervising BCBAs | VERIFIED | Production, role 82: no BCBA on 2,658 Cases, one on 224, two or more on none; every other BCBA role also at most 1. Rule 7 has 0 live Cases. "The sandbox allows only one": NOT VERIFIABLE HERE (the labels endpoint does not return the limit). | g3 |
| V21 | Grad Permit holders and supervisor links | PARTLY | 28 holders; 18 with a 151 link, 10 without. 45 Cases (not 44) have a holder on 82; 1 holder Case has no link (not linked). D15 still open: `45994302542` (3 Cases) and `61130820723` (1 Case) have `lba_licensure__ny` blank, so 4 Cases (3 linked) are treated as non-holder; after the fix 49. No holder with 2 supervisors, a self-link or a backwards link. | g3 |
| V22 | Blank supplier never clears 131308 | VERIFIED | No supervising role + blank supplier: 186 with a CR ID, 2,346 without. Stages of the 186: Service Ready 47, Paused 35, IA in Process 30, Closed Lost 22, Discharged 15, Initial Assessment 14, other 23. How many hold a name in CentralReach: NOT VERIFIABLE HERE. | g3 |
| V23 | Typed-supplier suffix | VERIFIED | 318 Cases, 77 distinct values: 0 contain BCBA or LBA, BCaBA, BCBA-D, semicolon, trailing or inner comma, digits; 1 double space (dormant); 2 padded. 111 used Cases (102 linked): 107 two tokens, 2 four, 1 five, 1 one. | g3 |
| V24 | Outgoing BT 1/2 and On Leave | PARTLY | BCBA side, all Cases: SUB 4, Outgoing SUB 1, Outgoing Supervising 22, On Leave 4; On Leave never alone and never the same BCBA as 82. BT side: 136 of 2,882 Cases read (call cap): Outgoing BT 1 on 5, BT 2 on 0; no BT on both Primary and Outgoing. Not read: 2,746 Cases (stage list in the report). | g3 |
| V25 | Extra HubSpot calls and paging | VERIFIED | Largest BCBA-to-BCBA count on a holder: 2 rows (7 distinct supervisors, busiest named by 6 holders); largest BCBAs on a Case 5; far below the 500-row page and 20-page cap. | g3 |
| V26 | Supervisor who is also a holder | VERIFIED | No such record: 151 targets that are holders 0; holder on 82 who is also a supervisor of a holder on the same Case 0; holder only on 234/288/135 0. | g3 |
| V27 | `date_of_birth` blank on all employees | VERIFIED | BCBA text property blank on 375 of 375 (created 2026-11-21). BT/RBT: calculated, read-only, blank on 6,198 of 6,198 (6,183 on 11-23, 6,194 earlier on 11-24; the counts moved). Linked: 9 BT/RBT, 0 BCBA, all blank dates. | g4 |
| V28 | Workday ID 7-digit check | PARTLY | 5 fail, as claimed: BCBA 1 (not linked), BT/RBT 4 incl. one `999-99-9999` shape that is linked; 1 more has a trailing space and passes after trimming. 2 other linked BT/RBT have a blank ID. BCBA 149 valid, 225 blank; BT/RBT 499 valid, 5,694 blank. | g4 |
| V29 | Saved state survives a malformed ID | VERIFIED | Existing tests and a private-copy run: no CentralReach call, link record kept (`crContactId`, hashes, version); after the ID is fixed the next run is a no-op with 1 GET and no second create. | g4 |
| V30 | BT/RBT dates before 1900 or future end `error` | VERIFIED | Run: `1/5/1899` and `1/5/2999` end `error`, 0 CentralReach calls. No production record has a date. | g4 |
| V31 | Production stage IDs in tests | VERIFIED | 11 BCBA and 13 BT/RBT stage IDs match the live pipelines (BCBA 855656544, BT/RBT 822050166); the sandbox has the same IDs; none archived. | g4 |
| V32 | "BT to RBT" is sandbox-only | REFUTED | It is a hidden option in production and in the sandbox (cached read dropped hidden options). Production: RBT 76, BT 1,465, `BT to RBT` 1, blank 4,656. Behaviour is safe (no role label for it, decision 35); the comment at `buildEmployeePayload.mjs:126-128` is wrong. NM/VA `location` options VERIFIED. | g4 |
| V33 | Mapped employee and Contact properties exist | VERIFIED | Production GET: BCBA 24 of 24, BT/RBT 22 of 22, Contact 4 of 4; none missing, archived or hidden. | g4 |
| V34 | Gate and link properties | VERIFIED | `centralreach_creates_only` / `centralreach_updates_only`: 404 in production on Case, BCBA, BT/RBT; in the sandbox single checkboxes with those names on all three. `client_id_number`, `employee_id` and the three link properties are on the right objects in both portals. | g4 |
| V35 | Setting names agree across files | PARTLY | `INCLUDE_TEST_RECORDS` and `SYNC_RECORD_GATE_PROPERTY` agree in README, `local.settings.example.json` and `config.mjs`. The two path settings are in README and `config.mjs` but not in `local.settings.example.json`. `HUBSPOT_EMPLOYEE_ID_PROPERTY` is in `config.mjs` only. | g4 |
| V36 | Employee PUT accepts the rebuilt date | PARTLY | Before: plain `YYYY-MM-DD` proven on create and PUT (`5384531`, `5385360`); rebuilt form never sent. After, from the run file of 2026-11-24 19:31 UTC (not by the verification worker): the rebuilt form (24 characters) was accepted on `5338681` and read back with the same first 10 characters. Open: time of day of hand-entered dates; an employee with a blank date. | g5 + run file |
| V37 | Client PUT accepts held `""`; read has 11 keys | PARTLY | Rebuilt date accepted on client `5384589` (create, update, and the run file). 11 keys seen on 3 clients only; blank `addressLine2` as `""` once; `externalSystemId` absent when blank. No PUT with `""` for gender, email, phone, state or ZIP has been sent. | g5 |
| V38 | A held blank employee date is accepted | NOT VERIFIABLE HERE | No blank-date employee was read or written. The only first-hand read of one (`5237928`, 2026-11-23) had no `dateOfBirth` key, which the new code treats as a failed read (O-64). | g5 |
| V39 | Label lag and the 150 s retry | PARTLY | Seen: 122 s once (`5338681`); a Case unconfirmed at 66 s and confirmed by 193 s; a BCBA confirmed in about 10 s. Not shown: 150 s as an upper bound; a re-POST during lag. The 150 s wait has never run live. | g5 |
| V40 | Client PUT with a left-out field | NOT VERIFIABLE HERE (answered later) | The report could not answer it. The run file of 2026-11-24 shows the client PUT blanks a left-out `chosenName` (O-63). A client create with null core fields has no recorded test. | g5 + run file |
| V41 | Metadata field IDs and types | VERIFIED | All 9 IDs are in the catalog snapshot of 2026-11-20 (59 fields) with the types the code uses (only 137697 is a textarea); all 40 constants IDs are in the snapshot. Never sent live: 136052, 138091, 126222, a `\n` in 137697, any metadata DELETE. | g5 |
| V42 | Checks run where stated | VERIFIED | Mutation run on a private copy (baseline 1,378 pass): 12 of 13 mutations make tests fail. Gap: removing the client read's key-presence loop fails 0 tests (a missing core key while HubSpot fills that field is untested). | g4 |
| V43 | Omitted fields keep their hash; a failed read never clears | VERIFIED | 12 removals each make tests fail (for example the 138851 entry 4, the saved-hash branch 11, the unsettled-hash branch 2). | g4 |
| V44 | `MAPPING_VERSION` re-send cost | PARTLY | Mechanism verified in a fixture: a Case 16 calls, a BT/RBT 6, an unchanged run 0. Production: 491 Cases and 9 BT/RBT, 0 BCBA linked; about 16,800 calls once (11.2% of 150,000), 0 while the gates keep production closed. Cosmos link records not read; H3's 600 to 900 employees is not what HubSpot holds. | g4 |
| V45 | Client read per update and its monthly cost | VERIFIED | One GET before every client PUT, none on a create or a no-op. 0.03% to 3.3% of 150,000 a month across the scenarios (phase 2 with 491 linked Cases: 1,964 to 4,910 calls). The change rate is an assumption. | g4 |
| V46 | No values in logs | VERIFIED | Run with distinctive values through the sink of `br21NoValuesInLogs.test.mjs`: no value in any log line, status sentence or thrown error for the coordinator, state, client-read, employee-date and Workday cases. The Grad Permit warnings rest on the existing test. | g4 |

New findings that were not in the register (full text in the reports; the numbers are BUILD-PLAN items):

- **N1, unmapped fields blanked by a PUT (O-63, R-39).** Raised by the CentralReach report as the highest risk, then confirmed on test records by a run found in `sandbox-rounds/cr-unmapped-fields-run-2026-11-24.txt` (13 calls, 19:31 to 19:32 UTC; the file does not say who ran it).
- **N2, an employee read with no `dateOfBirth` key ends `error` (O-64, R-40).** **N3** (stale text in BUILD-PLAN and OPEN-ITEMS on the blank-date rule) and **N4** (R-17 bites one call earlier) are handled in the documents.
- Eight Case properties are `sensitive` in production only (R-23); 10 of 28 Grad Permit holders have no supervisor link and D15 is still open on 4 Cases (O-65); 186 linked Cases keep a stale 131308 (O-66); address line 1 defects (O-67); 128 in-scope physician names with a credential (O-68); two non-allergen explains (O-69); sandbox workflow triggers stale, `referral_other` not a property sync, `local.settings.example.json` lacks the two path settings (O-70); BT/RBT `date_of_birth` is read-only (O-71); 9 linked BT/RBT and 0 BCBA against the budget's 600 to 900 (R-44, O-62); the `999-99-9999` Workday ID is on a linked BT/RBT (O-8).
- Counts in the notes are snapshots: BT/RBT records 6,183, 6,194, 6,198 in two days; Cases 2,883 and 2,882.
- **Gate follow-up B2 (review finding on the two gates; `build-chat-2-gate-followup-B2-2026-11-24.md`, read-only, run on a private copy with the real queue functions and fakes).** Outcome: intended and safe; no code change recommended. After a create writes the CR ID, every later run is on the update gate; until the "promote after create" workflow ticks `centralreach_updates_only`, the 150 s retry of an unconfirmed label POST ends `skipped`, `record_gate`, `gate: update`, with no CentralReach call, no HubSpot write and no further retry. The review's claim that the record sits at `error CR_LABEL_POST_UNCONFIRMED` is wrong: a temporary failure writes no status before the last attempt, so the HubSpot status stays blank. The record heals at the next hourly poll after the tick (one update, no second create, no second label POST). The real residue is a silent wait: a record with a CR ID and a blank status is in no failures, waiting or 24-hour report, and stays so if the promote workflow never fires (O-72, R-47). Proven for a Case, a BCBA and a BT/RBT; fakes only, so HubSpot workflow timing and real label lag were not measured. One test is still to add (`[BR4][BR19]` in `stage7TwoGates.test.mjs`: the existing hand-off test finishes in-run and never exercises an unfinished create).

### The recency audit

The audit (`requirements-recency-audit-2026-11-24.md`) lists stale text in the source documents. Applied here: BUILD-PLAN decision 53, 55 and 56 texts, rules 5.7 and 5.8, rows C10, C12, C13, C24, C25, C26, C28, C31, C36, B5, T2, B10, K1, step 5.7, the Stage 6 note, section 15 (O-21 reworded, not closed, because Zeke has not said it in his own words; O-27 and O-52 to O-60 closed), section 16 and section 17; OPEN-ITEMS (the blank-date known-gap bullet). Not applied (not these files): the build package's BR4-X step 2 and its D18 a, L818, L932 and G24 lines about the Contact workflow; `scripts/check-triggers.mjs` L13-14; the slices, master, ledger, matrix and run sheet rows of table 2.

### Tests and checks

- `npm test`: 1329 after steps 1 to 8, 1378 after passes A to F (+49), 0 fail. After this section was written: 1392 (field-wipe fix and cleanup) and 1412 (SSN guard pass); see section 14.
- `npm run check:requirements` and `npm run check:triggers` pass. `requirement-tests.json` differs from `HEAD` by 10 added lines and 1 reworded title (pass E).

### State

Nothing committed, nothing deployed, no live CentralReach call by the build chat, no HubSpot write, no Azure write. The word to commit is still owed by Zeke. The poller is off. Production deploy preconditions are in BUILD-PLAN section 15, "Before the production deploy".


## 14. Field-wipe fix, SSN guard and gate hand-off test, 2026-11-24 (later)

Written from the build chat's reports (`build-chat-2-field-wipe-fix-2026-11-24.md`, `...-REVIEW-...`, `build-chat-2-ssn-guard-2026-11-24.md`), `cr-update-semantics-and-sendback-risks-2026-11-24.md` and the code (`git diff`, read-only); the test totals were run by the documentation worker.

### Agents

| Role | Agent |
|---|---|
| Orchestrator | Claude Fable 5.2 (the build chat, "i.p - Architecture Build 2") |
| Builders | Not recorded in the sources given to this writer |
| Reviewers | Opus 5.5 high; one independent reviewer per pass. Field-wipe fix: done, no logic bug. SSN guard pass: **review pending** (running, no result) |
| Documentation worker | Claude Sonnet 5.5 |

### The passes

| Pass | What was built | Decision | Review outcome |
|---|---|---|---|
| pG | **Field-wipe fix.** Update body = the read's `contact` keys with the mapped keys laid over them (`updateBodyFromRead`, `mappedKeysMatchRead`, `clientPutKey` in `src/lib/mappedState.mjs`; the client update branch and `updateEmployeeByContactId` in `src/lib/centralReachClient.mjs`; the employee worker). No core PUT when no mapped core key differs from the read. A contact form key, `dateOfBirth` and a blank External System ID are never carried from the read; a client sends `externalSystemId` back when held. Cleanup pass in the same run: three `keepOmittedFieldHashes` state-machine tests, `UNSETTLED_FIELD_HASH = "unsettled"`, test tag nits, a client "missing core key" test, "BT to RBT" comments, two blank gate settings in `local.settings.example.json`. 1378 to 1392 tests. | 67 | No logic bug. Not safe for production until live checks L1 (filled lists), L2 (SSN form), L3 (production key survey) pass (run later the same day, below). Should-fixes (applied in pH): skip-rule boundary tests, exclusion tests, `requirementProofs` regex and `isActive` seed, employee `contactId` check before the in-progress save. Declined: `coreSkipped` flag. Stale line found: BUILD-PLAN 5.8 and R-39 said a PUT clears every key it leaves out; the run showed `primaryOfficeLocation` and `type` survive (corrected) |
| pH | **SSN guard** (`unsendableSsnKey`, `checkHeldSsnSendable`): only a blank, 9-digit or `ddd-dd-dddd` SSN is sent back, otherwise no PUT and a permanent `error` (`CR_EMPLOYEE_READ_FAILED` / `CR_CLIENT_READ_FAILED`, field `contact.ssn`); runs only when a core PUT would be sent. Review should-fixes (employee `contactId` check and the guard before the in-progress save; client in-progress state restored on a failure before any write, `inProgressAsBefore` and `CLIENT_FAILED_BEFORE_WRITE`; skip-rule boundary and exclusion tests; `isActive` proof). `[BR4][BR19]` gate hand-off test in `stage7TwoGates.test.mjs` (no code change; O-72). 1392 to 1412 tests. | 68, 69 | **Pending.** Mutations run by the builder on a temp copy: each fails at least one test |

Declined, with Zeke's proposal: leaving out keys the PUT ignores (`languages`, `contactId`, `type`, the client plural lists), an allow-list, a `coreSkipped` flag; not guarded: `npiNumber`, keys other than `ssn`.

### Live evidence used

- `sandbox-rounds/cr-unmapped-fields-run-2026-11-24.txt` (13 calls on `5338681` and `5384589`): the subset PUT blanked `jobTitle`, `chosenName` (employee) and `chosenName` (client); `primaryOfficeLocation` and `type` survived; the full body was accepted.
- `check-cr-sendback-risks.mjs` (testing chat, 24 calls on `5338681`): `hireDate` in the 28-character form sent back, accepted, unchanged; the employee PUT ignores `languages`; `ssn`, pay types and codes and the client lists were not tested. The probe language entry "English" stays on `5338681` (Zeke: "This is uncesssary - mark completed"). The public spec has no partial update for profile fields.

- **Live checks L1 to L3** (`cr-live-checks-L1-L3-2026-11-24.md`, testing chat, Zeke: "Do L1 - L3 please.", 42 CentralReach calls, script `scripts/sandbox/check-cr-l1-l3.mjs`): L1 test employee `5338681` PASS (full echo, 28 of 28 keys equal twice; filled `languages` kept; lists left out also kept); L1 test client `5384589` not testable (all lists empty, 0 payors; every one of 10 production clients holds 1 payor and 1 diagnosis code); L2 no filled SSN among 15 production employees (12 blank, 3 absent); L3 keys the test records lack: employees `hireDate`, `phoneHome`, `latitude`, `longitude`, `medicaidId`, `g2Number`, `department`, `payrollCompany`, `payrollEmployeeNumber`; clients `phoneHome`, `latitude`, `longitude` (numbers on the read, strings in the update spec); every filled date is the 28-character midnight form; employee `dateOfBirth` present on 1 of 15 reads. Both test records are at baseline.

### Open from this section

O-73 (the unproven parts of L1 to L3: client lists, pay lists, `latitude` / `longitude`, other new keys, a filled SSN's form; then L4), O-74 (SSN guard review pending, `npiNumber` and other keys), O-75 (four questions for CentralReach support); risks R-48 to R-50; the employee worker's omitted-hash behaviour (decision 66) still old. The full list is `build-chat-2-open-items-2026-11-24.md`.

### Tests and checks

`npm test`: 1212 before the build, 1329 after steps 1 to 8, 1378 after passes A to F, 1392 after pG, **1412 after pH, 0 fail**. `npm run check:requirements` passes; `npm run check:triggers` exits 0.

### State

Nothing committed, nothing deployed, no live CentralReach call by the build chat, no HubSpot or Azure write; the intake poller is OFF. The word to commit is owed by Zeke.
