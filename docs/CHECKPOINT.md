# Project checkpoint — azure_central_reach

**Last updated:** 2026-10-28 (America/Chicago)  
**Audience:** Zeke, pstack reviewers, and implementing agents  
**Fresh-agent handoff:** [`HANDOFF.md`](HANDOFF.md). Workstream order below is the current plan. Start at WS.1. Do not start the end-to-end run until that diff exists.  
**Pointer for doc order and pstack prompts:** [`PSTACK-REVIEW-CONTEXT.md`](PSTACK-REVIEW-CONTEXT.md)

---

## At a glance

| Item | State |
| --- | --- |
| **Phase** | Sandbox **Change Detection Completion** (portal `50850427` on Function App `centralreachserverless`) |
| **Business spec** | [Google Drive Optidge V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit) |
| **Deployed code baseline (`main`)** | Hybrid webhook + linked-recheck change detection — [`f215d9d`](https://github.com/Optidge/azure_central_reach/commit/f215d9dc945ae494a5813ffb883b0abe09894352), [PR #1](https://github.com/Optidge/azure_central_reach/pull/1) merged |
| **Working branch** | `align-sandbox-hubspot-field-sync` @ `77f4224` — broader fetch lists, mappings, sandbox property scripts; **not merged to `main`; not confirmed published beyond prior hybrid deploy** |
| **Primary signal** | HubSpot workflow → `POST /api/hubspot-webhook` (record id only) |
| **Backup signal** | `intakePoller` — same queues as the webhook. **Timer is off on the app today.** Sandbox end-to-end turns it on and proves a poller-only sync. It is not optional. Production poller stays off. |
| **Production portal `50317927`** | Not the live Function App target tonight. Full production move is **tomorrow**. Until then, and for the first production exercise, use **ZZ TEST records only**. |
| **Gate before merge** | **WS.1:** confirm production HubSpot properties, enumerations, and association labels against the Drive map and against sandbox. Then pull CentralReach metadata fields and org labels and compare to `src/constants/centralReach.mjs`. |
| **10/28 decisions** | Guardian, NM/VA, cleanup stages, Contact workflow, and BCBA `workday_id` stand. Backfill is decided but **waits for full production tomorrow**. Staffing-signal behavior is a **separate workstream**. Comorbid and maladaptive still need a confirmation. |

---

## North star

Finish **sandbox** change detection so every mapped HubSpot → CentralReach row in Drive sections **3–9** (plus section **11** gates) either **syncs with verify evidence** or is **explicitly blocked** by a named decision. Production rollout and backfill of unticked records with existing CR ids stay **out of this phase**.

**Done when:** Every production property missing in sandbox exists; the coverage matrix is published; webhook and poller both enqueue the same queues and the workers process them; clears work for integration-owned destinations; the original three records are restored. A deferred poller does not close this phase.

Full criteria: [`Change Detection Completion Phase.md`](Change Detection Completion Phase.md).

---

## Architecture (stable)

```text
HubSpot (50850427 sandbox)
  ├─ Fast: Workflows W1–W3 → webhook → Service Bus
  └─ Backup: intakePoller (timer; off on the app today, required on for sandbox E2E) → same queues
           ↓
  client-sync-queue / employee-sync-queue
           ↓
  processClientQueue / processEmployeeQueue
           ↓
  clientSyncWorkflow / employeeSyncWorkflow
  (fetch → mappedState hash → CR write → HubSpot writeback: CR id, link, last_sync_*)
           ↓
  CentralReach Partners API
```

**Authority:** [`SOURCE-OF-TRUTH.md`](SOURCE-OF-TRUTH.md), [`hubspot-centralreach-field-mappings-current-state.md`](hubspot-centralreach-field-mappings-current-state.md), [`plans/phase-1a-client-intake-trigger.md`](plans/phase-1a-client-intake-trigger.md).

**Environment split:** [`sandbox_vs_production_mvp.md`](sandbox_vs_production_mvp.md).

---

## Danny — 10/28

Source: [Google Doc, tab `t.0`](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0). Danny will fold Sara’s answers into the guide. Until that body text is updated, this section wins over older “waiting on Sara” lists in the repo.

The one-time credential link in that note stays out of git. Danny confirmed the Central Reach Integration app already has the scopes. Until Thursday, any production test uses **ZZ TEST records only**. Do not create real CentralReach clients.

Thursday EOD works on United Care’s side. They are adding a read-only Case field **Grad Permit BCBA** before Thursday. The internal name is not sent yet. Do not invent it. Clinical comorbid and maladaptive properties may be deleted before Thursday. **Confirm that in the portal before changing the mapper.**

### Timing (Zeke, 10/28 evening)

| Item | When |
| --- | --- |
| Backfill of the ~74 cases that already have a CR client id | **Full production, tomorrow.** Do not code or run it during sandbox. The rule stands: those cases sync without the checkbox. The code still requires Yes until that production change. |
| Staffing-signal behavior | **Separate workstream.** Do not build association-versus-name trigger logic in the current sandbox stream. |
| Missing properties, including the production staffing trigger names | **Before sandbox intake testing is finalized.** Create or align any sandbox property the production workflows already watch, so testing does not skip them. Names: `supervising_bcba_name`, `ia_bcba_name`, `reassessment_bcba_name`, `current_primary_bt`, `current_primary_bt_2`. Confirm each name in WS.1. The code still also says `supervising_bcba` and `initial_assessment_bcba`. |
| Sandbox workflows → production | Copy the sandbox workflows listed under **sandbox assets** on the Drive doc into production for **ZZ TEST only**. Workflows are the main assets to transfer. Move another sandbox asset only if that same list says it has to move. Do not turn those production workflows on for real clients. |

### Decided

| Topic | Decision | Code today |
| --- | --- | --- |
| Backfill | The CR client id is enough for ongoing updates. About 74 cases sync **without** `enter_in_central_reach`. | Wait until production tomorrow. Sandbox still requires the Yes token. |
| Contacts | Add a **fourth** ongoing workflow for guardian name/email and BCBA personal email. | Not built. Not part of the staffing workstream. |
| Triggers | Keep CentralReach id writeback fields out of workflow triggers, including `employee_id` and `external_system_id`. | Check when the sandbox workflows are copied to production. |
| BCBA ids | `employee_id` is “Employee ID (from CR)”. `external_system_id` is “External System ID”, same internal names as BT, on the CentralReach IDs card. CR External System ID is the Workday ID. Send BCBA `workday_id`. On BTs, 77 of 79 match `workday_id`. | Confirm on the production property read before mapping. |
| Guardian | When two exist, use the Parent/Guardian contact whose email is used for parent communication. | Code sends Case `guardian_first_name` and `guardian_last_name`. |
| Reassessment | Staffed comes from `staffing_status`. No separate stage map. | `staffing_status` is still a blocked-code trigger until the fetch list maps it. |
| Cleanup stages | Leave them out of CentralReach. HubSpot is moving those cases to Inactive. | Do not add cleanup-stage branches. |
| New Mexico / Virginia | Skip for now. | Do not add labels. |

### Still open after 10/28

| Owner | Item |
| --- | --- |
| Zeke | Confirm comorbid and maladaptive: main fields only, and whether the clinical properties are actually gone. Do not change the mapper until that confirmation. |
| Pessy | Active and Staffed labels exist in CentralReach. |
| Sara | BT `Yes - Generic` and `No- Made Inactive`. |
| Separate workstream | Staffing signal: workflows cannot trigger on association labels. Production triggers to confirm: `supervising_bcba_name`, `ia_bcba_name`, `reassessment_bcba_name`, `current_primary_bt`, `current_primary_bt_2`. |
| Not mentioned | SUB BCBA (234). Closed Lost. Restaffing-BCBA AND BT Needed. Anthem BCBS, UHC, and payors with no CentralReach label. NJ insurance labels, Aetna-CO, Cigna-CO, Carelon-CO. |

---

## Shipped and proven (keep as baseline)

| Area | Status |
| --- | --- |
| Hybrid change detection on `main` | Merged; Azure sandbox app ran webhook → queue → sync for test records |
| Address populate / clear / restore | **Passed** for Case, BT/RBT, BCBA on sandbox ids (checkpoint streets **102 / 202 / 302**) |
| Loop 1 retest (evening 10/27) | **Passed** — city, apt, zip, phone, work street (metadata path) with CR read-back |
| Field mapping reference doc | [`hubspot-centralreach-field-mappings-current-state.md`](hubspot-centralreach-field-mappings-current-state.md) (as of 10/27 on `main`) |
| `active_cases_count` | **HubSpot-only** — not in BCBA/BT sync fetch or mapping |

---

## In flight (local / branch)

**Branch `align-sandbox-hubspot-field-sync` (ahead of `main`):**

- Expands `REQUIRED_DEAL_PROPERTIES`, `BT_RBT_PROPERTIES`, `BCBA_PROPERTIES` and mapping builders toward the completion-phase guide.
- Adds `scripts/create-sandbox-hubspot-properties.mjs` + `sandbox-hubspot-properties.json`.
- Updates tests (`clientMetadataMapping`, employee payloads, workflow smoke tests).
- **Action before next sandbox publish:** `npm test`, review diff vs completion phase, merge or PR, then `func azure functionapp publish centralreachserverless` only when explicitly approved.

**Local docs (not on `main` yet):**

- This checkpoint and [`PSTACK-REVIEW-CONTEXT.md`](PSTACK-REVIEW-CONTEXT.md)
- [`export/cursor-agent-transcripts-oct27-workstream.md`](export/cursor-agent-transcripts-oct27-workstream.md)
- [`state.md`](state.md) — BPS-style *single-task* state template (separate from this project checkpoint)

**PR #2 (docs-only branch):** Discussed in Oct 27 chat; treat as **optional / unpublished** until you explicitly open or merge it.

---

## Sandbox test records (reference)

| Entity | HubSpot record | CentralReach id |
| --- | --- | --- |
| Case | deal `66712883229` | client `5324526` |
| BT/RBT | `64796590207` | employee `5324528` |
| BCBA | `64797567870` | employee `5324527` |

**Evidence (local, gitignored):** `.test-evidence/TEST-RUN-SUMMARY.md` and per-record `results-*.md`. **Do not edit `.test-evidence/` while a live run owns the folder.**

---

## Remaining work (priority order)

**Workstream order:**

1. **WS.1.** Production property definitions, association labels, then a CentralReach metadata and org-label re-pull. Read definitions, not record values.
2. **WS.2.** Fix sandbox gaps the production read can close, finish sandbox end-to-end with the known sensitive limitation, and turn the sandbox poller on for one linked-record test. Production poller stays off.

Phases 0–5 in `.test-evidence/TEST-RUN-SUMMARY.md` are the **previous** test. They show what already passed and what stayed open. They are not the script for the next run. The next end-to-end is WS.2, and it includes the queue workers and the sandbox poller.

**Do not merge `align-sandbox-hubspot-field-sync` until WS.1 is done.** Sandbox is not a clean copy of production. Known gaps are listed under “Sandbox does not match production yet.”

### WS.1 — Production schema and CentralReach catalog (first)

Read-only. No production record writes. No production workflow changes. Credentials stay in local `.env` (`HUBSPOT_PRIVATE_APP_TOKEN` for sandbox, `HUBSPOT_PRIVATE_APP_TOKEN_PROD` for portal `50317927`). That file is gitignored. Do not paste tokens or the production webhook client secret into chat, docs, or git. The webhook secret is for a later production cutover, not this read.

1. **HubSpot production properties.** For every internal name in the Drive map (sections 3–9 and 11) and in `REQUIRED_DEAL_PROPERTIES`, `BT_RBT_PROPERTIES`, and `BCBA_PROPERTIES`, read portal `50317927`: exists, type, options (label + value + order), `calculated` / `calculationFormula`, `dataSensitivity`, and which object owns it (Case `0-3`, BCBA `2-48354212`, BT/RBT `2-48354559`).
2. **Compare to sandbox** portal `50850427` (objects `0-3`, BCBA `2-55656302`, BT/RBT `2-55656309`). Same internal name is required. Option lists must match. Object type IDs and association type IDs must **not** be copied from production into sandbox code.
3. **Association labels.** Confirm staffing labels in production (IA BCBA, RE BCBA, Supervising BCBA, Primary BT 1, Primary BT 2, and any guide IDs such as 86, 145, 82, 76, 143, 234). Confirm the sandbox mirror uses sandbox type IDs with the same label names. Today the tracker only records sandbox RE BCBA (`re_bcba`).
4. **CentralReach catalog.** Re-pull org metadata field definitions and org labels with the discovery scripts in [`centralreach-metadata-and-labels-discovery.md`](centralreach-metadata-and-labels-discovery.md). Diff field IDs and label IDs against `src/constants/centralReach.mjs`. This is separate from HubSpot. Existing JSON under `central_reach_test_integration/output_files/` is a sandbox-era snapshot, not a fresh production confirmation.
5. **Write the diff** into [`Sandbox props & labels_summary.md`](Sandbox%20props%20%26%20labels_summary.md) (or a sibling inventory file). Fix code or sandbox properties only after that diff exists.
6. **Missing properties before sandbox testing is finalized.** Include the production staffing trigger names in that diff. Creating a missing sandbox property is in this stream. Building the staffing-signal behavior is not.

A local Node script is the right tool. HubSpot Breeze can help explore the portal, but it will not produce a repeatable diff against the Drive list, sandbox, and `centralReach.mjs`. The script should call the CRM properties API and the associations labels API with `HUBSPOT_PRIVATE_APP_TOKEN_PROD`, and the existing CentralReach discovery CLIs for metadata and labels. Read property **definitions** first. Do not dump record values.

### WS.2 — Close sandbox gaps, then end-to-end with queues and the poller

After WS.1, and not before:

1. Fix the sandbox gaps that read can close: wrong options, missing properties, writable stand-ins whose production formula is now readable, and staffing labels that should be mirrored. Create every production property the sandbox is missing, including the staffing trigger names WS.1 confirms. Do not implement backfill. Do not implement the staffing-signal workstream.
2. Finish sandbox end-to-end with the known sensitive limitation. Portal `50850427` cannot store the sensitive tier. Test those Case fields here as normal properties. A live sensitive GET is a production check, not this run.
3. The end-to-end includes the queues and the poller. `processClientQueue` and `processEmployeeQueue` must be processing. After the webhook path on the published sandbox build is healthy, turn `intakePoller` **on in sandbox** and run **one** poller-only change on an already linked record. The poller uses the same queues. Production poller stays off. Writing the poller down as deferred does not finish WS.2.
4. Drive the new run with the HubSpot CLI and the Azure CLI. Breeze can assist. Claude Code can create extra sandbox records. The original three records stay the address restore baseline. Use Phases 0–5 only as the previous evidence, not as the plan for this run.

### Then — merge, publish, isolated retests

1. Fold WS.1 fixes into the branch (or a follow-up commit). Run `npm test` on `main` and on the branch.
2. Merge, then publish to `centralreachserverless` only when explicitly approved. Confirm the app is still portal `50850427`.
3. Reconcile sandbox workflows W1–W3 with the fetch list (`blocked-code` rows).

### Verification — isolated retests (one writer per record)

From `.test-evidence/TEST-RUN-SUMMARY.md` **Still open**:

| Priority | Scope | Notes |
| --- | --- | --- |
| P0 | BT/RBT Loop 2 | Full clear → set → restore **with CR read**: `email`, `city__work_`, `state__work_`, `postal_code__work_`, `bt_rbt_type` — run **alone** (no shared App Insights window) |
| P0 | BCBA Medicaid | Isolated suite for `medicaid_id__ny` / `nj` / `co`; NY clear not proven in CR; NJ/CO clears needed empty metadata PUT in CR during last run |
| P0 | Case clears | **Product gap:** `guardian_first_name`, `guardian_last_name`, `insurance_primary` — HubSpot clear + Azure `success` but **CR kept prior value**; fix mapping/metadata DELETE path, then retest |
| P1 | Blocked-code rows | After fetch list matches workflow triggers: `case_status`, `staffing_status`, insurance labels, `location`, `gender_new`, billing hold, etc. |
| Required | Poller backup | Part of sandbox end-to-end, not a later option. After webhook health on the published build, timer **on in sandbox**, queue workers processing, one poller-only edit on an already linked record. Concurrency stays a separate check. Production poller stays off. |
| P2 | Phase 4–5 | Duplicate replay, eligibility scenarios, contact-source / staffing association fixtures — **pending** |

### 3. Human decisions still open

10/28 closed backfill, guardian selection, comorbid versus clinical, New Mexico / Virginia, cleanup stages, and Reassessment-as-staffing. Do not re-open those. Still waiting:

| Decision | Blocks |
| --- | --- |
| Comorbid and maladaptive: confirm main fields, and whether clinical properties are gone | Section 3. Do not change the mapper on Danny’s note alone. |
| BT/RBT gate: `Yes - Generic`, `No- Made Inactive` | Section 11. Sara. |
| Active / Staffed labels exist in CentralReach | Sections 6 and 7. Pessy. |
| Anthem BCBS, UHC, and other payors with no CentralReach label | Section 7 |
| NJ insurance labels, Aetna-CO, Cigna-CO, Carelon-CO | Section 8 |
| SUB BCBA (234), Closed Lost, Restaffing-BCBA AND BT Needed | Not in the 10/28 note |

Tracker: [`Change Detection Completion Phase.md`](Change Detection Completion Phase.md) § “Leave these uncoded”.

### 4. Production cutover (later — not current sprint)

Separate from sandbox completion:

- Complete Azure app settings secrets and HubSpot prod IDs on `centralreachserverless` (UnitedCare subscription).
- Resolve **employee queue** design: single `employee-sync-queue` vs split `rtbt-sync-queue` / `bcba-sync-queue`.
- Deploy code to prod app settings target; enable poller/queues only after manual gates in README.
- Update README deploy target name (`centralreachserverless` vs legacy `centralreachfunction`).

Historical prod hook-up notes were in `docs/open-items.md` (removed on branch); fold any still-needed CLI checks into a future committed prod runbook when you cut over.

---

## Sandbox does not match production yet

Yes. Treat sandbox as a **partial stand-in**, not a verified clone.

| Gap | What we know |
| --- | --- |
| Calculated fields | Sandbox `location`, `referral_source`, `reassessment_bcba_name`, `total_hours_bt1bt2_work_schedule`, and BCBA `city_home`, `state_home`, `apartment__home` are **writable**. Production is calculated. Formulas were not copied. The properties API previously returned no formula. A production token can now read `calculationFormula`. An existing writable property still cannot be switched to calculated without that formula. |
| Sensitive tier | The same Case internal names exist on sandbox as **`non_sensitive`**. Production marks them sensitive. That is expected. See the sensitive-read section below. |
| Enumerations | Eight option lists were copied and matched on Oct 27. That is not a full pass of every Drive property. |
| Allergies values | Sandbox has stored `Yes (Confirmed)` / `No (Denial)`. The guide appendix says production stores `Confirmed` / `Denial`. Confirm on the production read. |
| Association labels | Sandbox tracker records RE BCBA only. IA, supervising BCBA, and Primary BT labels still need a production read and a sandbox mirror check. Type IDs differ by portal. |
| Not fetched | `insurance_id_3` and `insurance_id_4` are sensitive in production and are **not** on the fetch list, because the field map does not use them. |
| CentralReach catalog | Label and metadata IDs in code come from earlier discovery exports. They have not been re-pulled against the live catalog in this checkpoint. |
| Clears | Guardian names and `insurance_primary` can return Azure `success` while CentralReach keeps the old value. That is a sync behavior gap, separate from schema parity. |

## Sensitive properties — how the read works

Sandbox cannot prove the sensitive tier. The architecture for production is already the deal GET, on both entry paths.

```text
Workflow webhook  →  body is objectTypeId + recordId only  →  queue
intakePoller      →  search finds record ids               →  same queue
                                                              ↓
                              clientSyncWorkflow fetchDeal(id, REQUIRED_DEAL_PROPERTIES)
                              GET /crm/v3/objects/deals/{id}?properties=...
```

`getDealById` in `src/lib/hubspotClient.mjs` sends that property list. Comments on `REQUIRED_DEAL_PROPERTIES` in `src/workflows/clientSyncWorkflow.mjs` name the production sensitive fields: `phi_first_name__cloned_`, `phi_last_name`, `phi_gender`, `phi_date_of_birth`, `insurance_id_1`, `insurance_id_2`, `phi__policy_holder_dob`, `phi_diagnosis`.

Production portal `50317927` returns those values only when the private app has `crm.objects.deals.sensitive.read`. Without that scope, HubSpot **omits** them. It does not error. Writes that patch them need `crm.objects.deals.sensitive.write`. The webhook body never carries them, so the poller and the webhook are the same once the worker runs.

BT/RBT and BCBA properties, including `medicaid_id__ny`, `medicaid_id__nj`, and `medicaid_id__co`, are **not** in that Case sensitive tier (comments on `BT_RBT_PROPERTIES` and `BCBA_PROPERTIES`).

What sandbox end-to-end can prove: the property is requested and a non-sensitive value syncs. What only production can prove: a sensitive value is actually present on the GET. Before any production sync test, confirm the production app’s scopes. Do not mark sensitivity “tested” from sandbox.

## Explicit non-blockers

| Item | Note |
| --- | --- |
| Production HubSpot token in local `.env` | Key name `HUBSPOT_PRIVATE_APP_TOKEN_PROD`. Use it for WS.1 reads. Do not log the value. |
| Workflow automation API 403 on sandbox app | Reconciliation uses exported workflow snapshot; not blocking retests if snapshot is current |
| Sandbox sensitive properties | Portal `50850427` cannot store the sensitive tier. Schema names can be confirmed now. A live sensitive GET cannot. |

---

## Agent / session hygiene (lessons from Oct 27)

- **One chat owns** merge → deploy → test for a given publish.
- **One writer per HubSpot record** during automated retest loops.
- Do not use shared App Insights queries across parallel runners for pass/fail.
- Treat **HTTP 202 / workflow fire** as signal only — row is done only with HubSpot + Azure + **CR read-back**.
- Reload this file and [`PSTACK-REVIEW-CONTEXT.md`](PSTACK-REVIEW-CONTEXT.md) after context compaction.

---

## Next recommended session

1. WS.1 script: production property definitions + association labels, then sandbox diff. No record exports.
2. Re-pull CentralReach metadata configuration and org labels. Diff against `src/constants/centralReach.mjs`.
3. Update [`Sandbox props & labels_summary.md`](Sandbox%20props%20%26%20labels_summary.md) with the diff.
4. Only then WS.2: close the sandbox gaps, run end-to-end with the sensitive limitation, queues processing, and one sandbox poller test on a linked record.

---

## Quick links

| Link | Role |
| --- | --- |
| [`HANDOFF.md`](HANDOFF.md) | Fresh-agent snapshot, 10/28 evening. More updates still coming. |
| [`PSTACK-REVIEW-CONTEXT.md`](PSTACK-REVIEW-CONTEXT.md) | pstack read order, prompts, transcript IDs |
| [`.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md`](../.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md) | Local harness vs sandbox done vs production verification tomorrow |
| [`SOURCE-OF-TRUTH.md`](SOURCE-OF-TRUTH.md) | Drive + repo index |
| [`Change Detection Completion Phase.md`](Change Detection Completion Phase.md) | Build + verify plan |
| [Oct 27 transcript export](export/cursor-agent-transcripts-oct27-workstream.md) | Full chat handoff |
| [GitHub repo](https://github.com/Optidge/azure_central_reach) | `Optidge/azure_central_reach` |
