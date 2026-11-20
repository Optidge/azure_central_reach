# Plan review carry-over — 2026-11-20

Input for the chat that rebuilds BUILD-PLAN. Code at `8fe5c54` (Stages 1 and 2 built, committed, pushed). Nothing here is approved by Zeke and nothing here has been written into BUILD-PLAN, the trackers or the guide.

**How to use this file.** Every item is a claim to confirm against the live guide or the code before it is used. The guide was edited after this review, so re-read it first. Each section says where its claims come from.

The guide's "Requirement verification" tab was removed by Zeke on 2026-11-20. It was written by an agent without project context. Do not use it and do not recreate it. Findings that rested only on that tab are left out of this file.

## 1. Where BUILD-PLAN and the guide disagree

Source: the guide's main tab as read on 2026-11-20 (`[G19]`, `[G20]`, the entity requirement rows) against BUILD-PLAN sections 9 to 12.

| # | Item | Guide | BUILD-PLAN or code |
|---|---|---|---|
| 1 | Client funding labels | `[G19]`, 11/19: no payor tags for now; do not send client funding-source labels. | Row 4.21 builds nine funding label rules. |
| 2 | Staffing labels | `[G19]`: only 97151 Services `1156743`, Staffed 97153 `1156746` and X 97153 `1156747` may be sent. The other three are being removed. | Stage 8, OPEN-ITEMS row 12 and `CENTRAL_REACH_CLIENT_STAFFING_LABELS` (`src/constants/centralReach.mjs:47`) name six. Nothing is sent today. |
| 3 | New Mexico and Virginia | `[G19]`: labels NM Employee and VA Employee exist; send one when a record uses the state. Not in use yet. | Rows 5.4 and 5.11 say "Skip New Mexico and Virginia". IDs are in section 4 below. |
| 4 | Builder's guide copy | — | `guide-extract-2026-11-18.md` predates `[G19]` and `[G20]`. The builder brief (section 14) points builders at it. |
| 5 | Employee email change | Entity rows name the email source. | Updates send the email CentralReach holds (row 1.10). Section 12 waits on a CentralReach test of a changed email. |
| 6 | Work schedule, Location #2 | Case row names the Location #2 variants. | Row 4.4 builds the main schedules only; waits on Sara. |
| 7 | More Than One Location, Address 2 | Case row: `service_address__other` as Address 2. | Row 4.13 builds Child's House and Other Location only; waits on Sara. |
| 8 | Per-BT hours | Case row names `hours_bt_work_schedule_1` and `_2` beside the total. | Row 4.6 sends only the total to `134331`. No target for per-BT hours. |
| 9 | Care Coordinator email | Case row: resolve name and email from the owner. | Row 4.16 has one target, `138851`. |
| 10 | BCBA Care Coordinator | BCBA row lists it. | Not built; section 12 waits on the CentralReach employee field. |
| 11 | Outgoing BT 1 and 2 | Case row: they stay active until the removal date passes. | Row 4.14 covers Primary BT 1 and 2 only. No CentralReach target. |
| 12 | BCBA insurer labels for NJ, CO and commercial | Section 8. | Row 5.6 reads `ny_insurance_labels` for MCD FFS-NY only; the rest waits on United Care. |
| 13 | Physician pair selector | Not stated. | Built on `n1_what_type_of_insurance` (`buildClientMetadata.mjs:66`); open with Zeke and Sara. |
| 14 | Formats | Auth Period: "written at midnight UTC". Client Availability: text plus number. | Metadata dates are sent as `MM/DD/YYYY` text (`buildClientMetadata.mjs:34`). Rows 4.5, 4.9, 4.11 assume a text format (section 13). |
| 15 | Supervising BCBA | "Match the typed supplier to the CR provider by name." | Row 4.15 sends the typed text as it is. |
| 16 | First Parent/Guardian Contact | `[G19]`: send the first one. | Row 6.3 reads the Case mirror properties; HubSpot's property sync picks the Contact, not Azure. |
| 17 | `insurance_id_3` | Not a client mapping. | Still requested in `REQUIRED_DEAL_PROPERTIES`; row 4.17 does not remove it. |
| 18 | Sandbox record convention | `[G20]` sets `home_apt` on BT/RBT and BCBA. | Row 5.9 stops sending the BT/RBT apartment; row 5.2 reads `apartment__home` for BCBA. |
| 19 | Sandbox Contact workflow | — | Does not exist (OPEN-ITEMS section 2). Blocks live testing of Stage 6. |

Code note: the client mapper drops any phone that is not 10 digits (`buildClientPayload.mjs:15`).

## 2. Dependencies and files, Stages 3 to 9

Source: BUILD-PLAN file lists and the code at `8fe5c54`.

| Stage | Depends on | Files beyond the plan's list, and code facts |
|---|---|---|
| 3 | Stage 2. One read-only sandbox search for the multi-checkbox operator before row 3.5 (needs Zeke's go-ahead). | `src/lib/serviceBusClient.mjs`: the senders have no scheduled delivery, which the sweep needs. Poller sources today are `intakePoller`, `employeePoller`, `linkedRecheck`. |
| 4 | Row 3.7: same workflow file, and rows 4.14 and 4.16 add HubSpot reads that change the no-op read counts. | Property list is in `clientSyncWorkflow.mjs:49`. `listAssociations` (`hubspotClient.mjs:524`) drops the association category and treats a missing `results` list as empty; row 4.14 needs both changed. |
| 5 | Row 3.7 (same workflow file). | Property lists at `employeeSyncWorkflow.mjs:65` and `:101`; `knownMetadataFieldIds` at `:157`. |
| 6 | Stages 3 and 5 (same files); the row 4.14 association contract. | `src/lib/config.mjs`: the portal table has no Contact association IDs. |
| 7 | Finished mappers; Zeke's HubSpot setup; Azure go-aheads. | Docs and Azure only. |
| 8 | Stage 7; Zeke's go-ahead per write. | Held label rows. |
| 9 | Stage 8; United Care's answers. | Row 9.8 format check. |

**Metadata DELETE trap (confirmed in code).** `explicitMetadata` (`mappedState.mjs:67`) turns a known field the mapper leaves out into `null`, and `metadataClearFieldIds` (`:180`) then marks it for a DELETE in CentralReach. So row 5.3 must remove field `134444` from `knownMetadataFieldIds` as well as from the mapper, and row 6.4 must put `138069` in `omitFieldIds` when the Contact read fails. The same rule applies to Case metadata: a mapper input that is absent must leave its key out, not send `null`.

## 3. Draft build schedule (to re-check after the plan is rebuilt)

Reviewed by an Opus 5.5 agent on 2026-11-20; its points are folded in. Builder Claude Fable 5.2, high; reviewer Opus 5.5, high, from the diff only.

**Needs Zeke's word first:** worktrees per lane, parallel stages, and merging lanes into the main copy. BUILD-PLAN hard stop 6 and section 2 do not allow these as written. Worktrees have no `node_modules`.

| Wave | Lane | Rows | Owns |
|---|---|---|---|
| 1 | A Poller | 3.1 to 3.6, 3.11, the `listAssociations` contract | Poller files, `hubspotClient.mjs`, `config.mjs`, webhook files, queue functions, `serviceBusClient.mjs`, docs |
| 1 | B Worker no-op | 3.7 to 3.10 | Both workflows, `mappedState.mjs`, `centralReachClient.mjs`, `package.json`, the trigger check |
| 1 | C Mappers | Stage 4 and Stage 5 mapper rows, except 5.3 | `src/mappings/**`, `src/constants/centralReach.mjs` |
| 2 | D Case wiring | 4.14, 4.16 to 4.18, 6.3, the Case property list | `clientSyncWorkflow.mjs`, `hubspotClient.mjs` |
| 2 | E Employee wiring and Contact routing | Stage 5 property lists, all of 5.3, 6.1, 6.2, 6.4 | `employeeSyncWorkflow.mjs`, `buildEmployeePayload.mjs`, webhook files, `processClientQueue.mjs`, `serviceBusClient.mjs`, `config.mjs`, new `contactFanOutWorkflow.mjs` |

- Merge and `npm test` after each wave. The Wave 1 tree is not deployable. One final review of the whole diff after Wave 2.
- Old test files two lanes must both edit: `stage2PortalAndRetries.test.mjs`, `hybridChangeDetection.test.mjs`, `stage1CreateIdentity.test.mjs` (Wave 1, A and B); the no-op tests and `stage2Fakes.mjs` (Wave 2, D and E). Lane B writes the Case and employee no-op tests in separate files.
- The stage 2 tests run the real mappers, so Lane B's tests must vary only fields Lane C does not remap.
- Strictly in order after the commit: trigger check, deploy while Stopped, sandbox rounds, production readiness.

## 4. CentralReach results reported from Cursor, 2026-11-20

Source: reported to this session from Zeke's side chat. Not seen first-hand except where marked "confirmed in code".

- **Catalog read (step 0.6).** Every label ID and metadata field ID in BUILD-PLAN exists with the expected meaning, including those marked unconfirmed. New: NM Employee `1157030`, VA Employee `1157031`. Field `137697` is a textarea; the other client fields are input.
- **Label answer shape (step 7.4).** `GET /contacts/{id}/labels` returns `labels`, each with `labelId`, `name`, `parentLabelId`. Confirmed in code: `readLabelIds` already reads `labelId`.
- **Label test (step 0.5).** `POST /contacts/{id}/labels` with `{ "labels": [ { "labelId": N } ] }` replaces the contact's whole label set. A label is removed by leaving it out. Reads can lag the write; one case took over 200 seconds, and the lag is not measured. A body with one invalid ID returned 200 and cleared every label on the contact. An empty list returned 200 and changed nothing.
- **Defect, confirmed in code.** `postContactLabels` (`src/lib/centralReachClient.mjs:585`) returns "updated" on any 200 and never reads back.
- **Follows from the code if the lag is as reported.** `updateContactLabels` reads the current set and posts the union, so a run inside the lag window can post a stale set and undo an earlier label change.

Proposed, not approved:

1. The label sender refuses any ID that is not in the confirmed constants.
2. Read back after every label POST, with a wait; fail only if the set never matches.
3. Handle the stale read, for example by building the union from the set last saved in Cosmos when it is newer than the lag window.
4. Zeke decides whether to lift the label hold. If so, staffing, Active / Inactive and Billing Hold removal can be built as swap-on-change.

Because the POST replaces the set, a wrong or extra label ID is more dangerous than the plan assumed. Add-only is not a safety net.

## 5. Production

Syncing production portal `50317927` was not safe on 2026-11-20:

- No sandbox round has run; `sandbox-test-log.md` is empty.
- 515 production employee records have Entered in CR = Yes and a blank `employee_id`; 108 of 200 sampled CentralReach employees have no External System ID (step 9.2).
- 81 of 100 sampled Client IDs did not resolve in CentralReach (step 9.3).
- Production webhook workflows do not exist; production BCBA has no `date_of_birth`; the owners scope is pending (step 9.4).
- The Workday ID format waits on Danny (step 9.8).

Reachable first: Stages 3 to 6 built and committed, then deployed while the app is Stopped (step 7.3).
