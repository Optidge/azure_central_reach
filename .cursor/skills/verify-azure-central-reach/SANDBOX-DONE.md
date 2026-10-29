# Sandbox verification — what to prove, and what “done” means

**As of:** 2026-10-28 evening  
**Audience:** pstack and any agent asked to verify this repo  
**Do not create a second verification skill.** This file is the context pointer for the existing skill `verify-azure-central-reach`.

Production verification is a **separate pass tomorrow**. Do not run it, and do not mark a sandbox result as a production result.

---

## Two proofs, two surfaces

| Proof | Surface | What a pass means |
| --- | --- | --- |
| **Local harness** | `verify-acr.sh` on port `17071`, timer and queue triggers **forced off** | The HTTP route answered with the status and body the feature file names. |
| **Sandbox end-to-end** | Published Function App `centralreachserverless`, HubSpot portal `50850427`, queues **and** the timer poller enabled, CentralReach read-back | Webhook and poller both enqueue, workers process, and a mapped row syncs. This is the sandbox “done” bar. |

The local harness does **not** prove sandbox done. `POST /api/hubspot-webhook` returning **202** only means an id was accepted. A row is done only when HubSpot, Azure `last_sync_status` plus correlation, and a CentralReach API read-back agree.

`npm test` is the offline gate. It does not replace either proof.

Status and business timing live in [`docs/CHECKPOINT.md`](../../../docs/CHECKPOINT.md). Row-level criteria live in [`docs/Change Detection Completion Phase.md`](../../../docs/Change%20Detection%20Completion%20Phase.md) sections **Outcome** and **How to verify**. When those disagree with an older waiting list, the checkpoint’s **Danny — 10/28** timing table wins.

---

## Sandbox done

Sandbox change detection is done when every item below is true. A blocked decision counts as done for that row only when the matrix names the owner and the code was not changed to guess.

1. **WS.1 diff exists** before merge and before intake testing is called final. Production portal `50317927` property definitions, options, formulas, and association **label names** are compared to sandbox portal `50850427` and to `src/constants/centralReach.mjs`. Object type IDs and association type IDs stay portal-specific. Read definitions. Do not export record values. Credentials stay in gitignored `.env`.
2. **Every production property missing in sandbox is created** before the end-to-end run. WS.1 names the full gap, not only the staffing triggers. Those names, once confirmed, are included: `supervising_bcba_name`, `ia_bcba_name`, `reassessment_bcba_name`, `current_primary_bt`, `current_primary_bt_2`. A missing property cannot be skipped and called blocked. Creating the property is in this stream. Building staffing-signal behavior is not.
3. **Coverage matrix is published.** One row per guide item in Drive sections 3–9 and the section 11 gates: HubSpot property, CentralReach destination, fetched, compared, written, fast trigger, poller coverage, and either a test result or a named blocked decision. A workflow property with no mapping is “signal only,” not passed. Mapped fields from the CentralReach **58-field metadata catalog** are in this matrix.
4. **Each implemented row** was set, changed, cleared, and set again during WS.2. Multi-selects also get add, remove, replace, and full clear. Evidence is HubSpot value, Azure correlation and `last_sync_status`, and CentralReach read-back. No patient values in the write-up. Phases 0–5 in `.test-evidence/TEST-RUN-SUMMARY.md` are the **previous** test. They are evidence, not the plan for this run. The new end-to-end is WS.2. Drive it with the HubSpot CLI and the Azure CLI. Breeze can assist. Claude Code can create extra sandbox records.
5. **Clears work** for integration-owned destinations. Known open gap: Case `guardian_first_name`, `guardian_last_name`, and `insurance_primary` can return Azure `success` while CentralReach keeps the old value. That gap keeps the phase open until fixed and retested.
6. **Addresses are restored.** The original Case, BT/RBT, and BCBA records return to streets `102` / `202` / `302` and their other pre-loop values. Address populate, clear, repopulate, and restore **already passed** on 2026-10-27. Do not re-test that suite as if it failed. Extra records from later rounds are restored to the values they started with.
7. **Queues and one sandbox poller test** are part of WS.2, not a later option. `processClientQueue` and `processEmployeeQueue` consume `client-sync-queue` and `employee-sync-queue`. After the webhook path is healthy, turn `intakePoller` **on in sandbox** and run one poller-only edit on an already linked record, with the fast signal not involved. The poller enqueues the same queues. Production poller stays off. If that proof fails, sandbox is not done. The known limit stays: sandbox cannot prove the sensitive tier.
8. **Open decisions stay uncoded.** Comorbid and maladaptive until the live properties are confirmed. BT `Yes - Generic` and `No- Made Inactive` (Sara). Active and Staffed labels (Pessy). Payors and NJ / CO labels with no CentralReach label. SUB BCBA (234), Closed Lost, Restaffing-BCBA AND BT Needed. Grad Permit BCBA until its internal name is sent.

### Records and evidence

| Entity | HubSpot record | CentralReach id |
| --- | --- | --- |
| Case | deal `66712883229` | client `5324526` |
| BT/RBT | `64796590207` | employee `5324528` |
| BCBA | `64797567870` | employee `5324527` |

These three are the address restore baseline from the previous test. One writer per record. Do not share an App Insights window across runners. Evidence folder: `.test-evidence/` (gitignored). Do not edit it while a live run owns it. Latest status: `.test-evidence/TEST-RUN-SUMMARY.md` (Phases 0–5, previous run).

Still open from that summary: BT/RBT Loop 2 clear-set-restore with CentralReach read; BCBA Medicaid isolated suite; the Case clear gap above; blocked-code rows after the fetch list matches workflow triggers; then the poller proof with the queues actually processing.

### Explicitly not required for sandbox done

- Backfill of the ~74 cases that already have a CentralReach client id. The rule is decided. Implement and run it in **full production tomorrow**. Sandbox code still requires the Yes token.
- Staffing-signal behavior (association versus name). Separate workstream.
- A live sensitive-property GET. Sandbox portal `50850427` cannot store that tier. The worker already requests those Case fields on `GET /crm/v3/objects/deals/{id}`. Only production can prove the values come back.
- Production workflow enrollment, production record writes, or copying sandbox workflows into production. Workflow copy is **after** sandbox testing, ZZ TEST only.

---

## How to verify sandbox

1. Read [`docs/CHECKPOINT.md`](../../../docs/CHECKPOINT.md) and this file. Confirm the Function App is still portal `50850427` before any live sync proof.
2. Run `npm test` on the branch you intend to publish. A green suite is necessary and not sufficient.
3. Use this skill’s local host only for route-shape proofs in `features/`. Launch with `verify-acr.sh`. Doctor must say `doctor ok`. Leave timer and queue triggers disabled. Do not claim a feature verified by a different entry point.
4. Live end-to-end proofs go through the **published sandbox app**, not through the verification host. For that run the queue workers are on, and the timer poller is on for the backup proof. Create every missing sandbox property first. Drive rounds with the HubSpot CLI and the Azure CLI. Breeze can assist in the portal. Claude Code creates the extra test records. Confirm Azure processing and CentralReach read-back. Restore the original three records, and restore any extra records, before calling the phase done.
5. Record the matrix row, whether the signal was webhook or poller, and the three-way result. HTTP 202 or workflow fire is a signal, not a pass. A poller enqueue that no worker processed is not a pass.

---

## Production verification — tomorrow, separate pass

Do not fold this into the sandbox run.

| Rule | Detail |
| --- | --- |
| When | After sandbox done, during the full production move. |
| Portal | `50317927`. Function App settings are not on production until that cutover. |
| Records | **ZZ TEST only** until Thursday. Do not create real CentralReach clients. |
| Sensitive tier | Confirm `crm.objects.deals.sensitive.read` on the production private app. Prove one sensitive Case value is present on the deal GET. Sandbox cannot stand in for this. |
| Workflows | Copy the sandbox workflows listed under Drive **sandbox assets** into production for ZZ TEST only. Workflows are the main assets to transfer. Do not enroll real clients. |
| Backfill | The ~74 cases sync without `enter_in_central_reach` only in this production pass. |
| Out of both passes tonight | Staffing-signal implementation. Production poller. Real-client writes. |

A later update should add `PRODUCTION-DONE.md` beside this file when that pass starts. Until then, this paragraph is the whole production verification contract.
