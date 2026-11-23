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

Decisions 48 and 49 (BUILD-PLAN section 4), same day. 48: the BCBA date of birth is read from `dob` (constant `BCBA_DATE_OF_BIRTH_PROPERTY`); `date_of_birth` is no longer requested for the BCBA; the placeholder rule is unchanged; pending United Care (O-10). 49: the BCBA primary email is the BCBA's own `email` (constant `BCBA_PRIMARY_EMAIL_PROPERTY`); `ucaba_email_address` is no longer requested (O-49 closed). Meta 138069 still reads the same `email` (O-50). `node scripts/check-triggers.mjs --expected` now lists `dob` and `email` for the BCBA and no `ucaba_email_address` or `date_of_birth`. Tests updated in `bcbaTextDateOfBirth.test.mjs`, `employeePrimaryEmailUpdate.test.mjs`, `f1UnreadableValues.test.mjs`, `stage4and5PropertyLists.test.mjs` and the BCBA fixtures.

Decision 50 (BUILD-PLAN section 4), 2026-11-23: Meta 138069 Personal Email reads `personal_email` (constant `EMPLOYEE_PERSONAL_EMAIL_PROPERTY`) on the BCBA (B9) and, new, on the BT/RBT (T9). Before, the BT/RBT did not send 138069 and the BCBA sent it from `email`; `email` now feeds the BCBA primary email only, so an `email` change no longer counts `metadata.138069`. The CentralReach field constant is renamed `PERSONAL_EMAIL` (was `BCBA_EMAIL`). `personal_email` is in both objects' `mapped` lists, so `node scripts/check-triggers.mjs --expected` lists it under BCBA (24) and BT/RBT (23). O-50 and O-38 closed; O-51 opened (does `personal_email` exist on both objects in the sandbox and in production). Tests updated or added in `stage6BcbaPersonalEmail.test.mjs` (`[B9][6.4]`, `[T9][6.4]`), `f1UnreadableValues.test.mjs`, `employeePrimaryEmailUpdate.test.mjs`, `stage4and5PropertyLists.test.mjs` and `stageP1PropertyLists.test.mjs`.
