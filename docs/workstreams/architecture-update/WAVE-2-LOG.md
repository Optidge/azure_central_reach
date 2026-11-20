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
- **6.2.** Fan-out. It reads the Contact's `test_record`, queues one ordinary sync message per linked Case and BCBA, and never calls CentralReach.
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

- Open items O-38 to O-42 (BUILD-PLAN section 15), and the new notes under O-34 and O-10.
- The final whole-diff review from `8fe5c54`.
- The sandbox test matrix and the record script are owned by the Q&A chat. They still name the old C10 and C20 sources and must be updated there.
