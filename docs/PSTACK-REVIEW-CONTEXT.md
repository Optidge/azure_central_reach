# pstack review — context pointer

**Purpose:** Give pstack (or any multi-model review) a **single entry file** before reading the repo. Start here, then follow the read order below.

**Fresh-agent handoff:** [`HANDOFF.md`](HANDOFF.md). Workstream order is WS.1, then WS.2, in [`CHECKPOINT.md`](CHECKPOINT.md). Phases 0–5 are the previous test.

**Checkpoint (current status):** [`CHECKPOINT.md`](CHECKPOINT.md) — updated Oct 28, 2026 evening. Read the “Danny — 10/28” timing table before any older “waiting on Sara” list.

**Oct 27 agent transcripts (full handoff):** [`export/cursor-agent-transcripts-oct27-workstream.md`](export/cursor-agent-transcripts-oct27-workstream.md)

---

## What to review

1. **Are we aligned on architecture?** HubSpot workflow webhook (fast) + `intakePoller` (backup) → Service Bus → queue workers → same compare/sync path for Case, BCBA, BT/RBT.
2. **Is the completion phase plan still the right next build?** Create every production property missing in sandbox, then a full sandbox end-to-end: webhook, queue workers, and the timer poller as backup on the same queues. Backfill and staffing-signal behavior are not this build. A deferred poller does not finish sandbox.
3. **Where was Oct 27 inefficient?** Parallel test runners, workflow vs fetch-list mismatches, clear-not-syncing gaps, unpublished branch work vs deployed Azure baseline.
4. **What is the gate before merge?** WS.1, then WS.2. WS.1 is production property definitions, association labels, then a CentralReach metadata and org-label re-pull. Read definitions, not record values. WS.2 fixes the sandbox gaps that read can close, finishes sandbox end-to-end with the known sensitive limitation, and turns the sandbox poller on for one linked-record test. Production poller stays off. Phases 0–5 are the previous test, not this plan.
5. **What did Danny decide on 10/28, and what did Zeke time-box the same evening?** Read “Danny — 10/28” in `CHECKPOINT.md`, including the timing table. Guardian, NM/VA, cleanup stages, the fourth Contact workflow, and BCBA `workday_id` stand. Backfill is decided and waits for full production tomorrow. Staffing-signal behavior is a separate workstream. Missing sandbox properties, including those trigger names, still belong in this stream and must exist before sandbox intake testing is finalized. Comorbid and maladaptive need a portal confirmation before any mapper change. Copy sandbox workflows from the Drive doc’s sandbox-assets list into production for ZZ TEST only. Workflows are the main assets to transfer.

---

## Authority (when documents disagree)

| Question | Read first |
| --- | --- |
| What *should* sync (business rules) | [Google Drive — Optidge V2, tab `t.0`](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0). Sandbox workflows to copy later are under **sandbox assets**. |
| How the repo indexes Drive | [`SOURCE-OF-TRUTH.md`](SOURCE-OF-TRUTH.md) |
| What the code *does today* on `main` | [`hubspot-centralreach-field-mappings-current-state.md`](hubspot-centralreach-field-mappings-current-state.md) |
| What we are *trying to finish* in sandbox | [`Change Detection Completion Phase.md`](Change Detection Completion Phase.md) |
| Sandbox vs prod portals and app settings | [`sandbox_vs_production_mvp.md`](sandbox_vs_production_mvp.md) |
| Parallel agent rules (do not cross streams) | [`plans/PARALLEL-COORDINATION.md`](plans/PARALLEL-COORDINATION.md) |

**Rule:** Drive wins for business rules. [`CHECKPOINT.md`](CHECKPOINT.md) “Danny — 10/28” wins over older repo waiting lists until Danny folds those answers into the guide body. The repo mapping doc wins for what the code does on the commit you are reviewing.

---

## Recommended read order (architecture + state)

Read in this sequence unless pstack is scoped to one topic only.

| # | Document | Why |
| --- | --- | --- |
| 1 | [`CHECKPOINT.md`](CHECKPOINT.md) | Current branch, deploy baseline, Danny 10/28 timing table, open test rows |
| 2 | [`SOURCE-OF-TRUTH.md`](SOURCE-OF-TRUTH.md) | Links and phase pointer |
| 3 | [`plans/phase-1a-client-intake-trigger.md`](plans/phase-1a-client-intake-trigger.md) | Confirmed MVP: webhook primary, poller backup. Timer is off on the app today. Sandbox end-to-end turns it on and proves it. |
| 4 | [`hubspot-centralreach-field-mappings-current-state.md`](hubspot-centralreach-field-mappings-current-state.md) | Runtime flow, change detection, sensitive tier |
| 5 | [`Change Detection Completion Phase.md`](Change Detection Completion Phase.md) | Completion criteria, sync-property read path, open decisions table |
| 6 | [`sandbox_vs_production_mvp.md`](sandbox_vs_production_mvp.md) | Portal IDs, queues, prod inventory |
| 7 | [`.test-evidence/TEST-RUN-SUMMARY.md`](../.test-evidence/TEST-RUN-SUMMARY.md) | Previous test evidence (local only, gitignored). Not the plan for WS.2. |
| 8 | [`.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md`](../.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md) | Sandbox done is WS.2: gaps closed, sensitive limitation, queues, one poller test. Phases 0–5 are the previous test. |

**Code anchors (after docs):**

| Area | Path |
| --- | --- |
| Webhook entry | `src/functions/hubspotWebhook.mjs` |
| Poller backup | `src/functions/intakePoller.mjs`, `src/workflows/intakePollerWorkflow.mjs` |
| Case fetch + sync | `src/workflows/clientSyncWorkflow.mjs` (`REQUIRED_DEAL_PROPERTIES`) |
| Staff fetch + sync | `src/workflows/employeeSyncWorkflow.mjs` |
| Hash / clears | `src/lib/mappedState.mjs` |
| CR IDs | `src/constants/centralReach.mjs` |

**GitHub baseline for hybrid detection (deployed path):** [`f215d9d`](https://github.com/Optidge/azure_central_reach/commit/f215d9dc945ae494a5813ffb883b0abe09894352) on `main` ([PR #1](https://github.com/Optidge/azure_central_reach/pull/1)).

**In-flight branch (not necessarily on Azure):** `align-sandbox-hubspot-field-sync` — widens fetch lists and mappings; see `CHECKPOINT.md`.

---

## Oct 27 chat threads (intent summary)

Use the [Markdown export](export/cursor-agent-transcripts-oct27-workstream.md) for full text. IDs for cross-reference:

| Chat name | Transcript ID |
| --- | --- |
| Change detection, ship, and test | `0fe7488a-b3c1-440f-8ba0-5232e05c09dd` |
| Completion-phase plan | `776793c7-699b-4c0b-915e-2e5be884f62f` |
| `active_cases_count` lookup | `bb9ab75a-0acb-4690-bcb4-820582c27dd4` |
| Sandbox properties and wiring | `1a9bbb03-1dcc-4ec7-bd3a-d8d4144301b6` |
| Docs commit and PR #2 | `fb42f4a9-8a3f-43bf-ab5b-885bb3f0c98e` |

Local JSONL root:

`~/.cursor/projects/Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/agent-transcripts/`

---

## Production HubSpot access (Oct 28, 2026)

**Zeke has the production private app.** Local `.env` has `HUBSPOT_PRIVATE_APP_TOKEN_PROD` (gitignored). Use it for read-only schema checks. Do not print the token. The production workflow client secret is for a later cutover, not WS.1.

This unblocks:

- Property internal names, enumeration options, calculated formulas, and `dataSensitivity` on portal `50317927`.
- Staffing association label names and type IDs in production, then a **name** mirror in sandbox. Do not copy production type IDs into sandbox settings.
- Scope check: `crm.objects.deals.sensitive.read` (and `.write` only if a later test patches those fields).

**Sensitive architecture (already in code):** webhook and poller both enqueue a record id. `clientSyncWorkflow` then `GET /crm/v3/objects/deals/{id}?properties=<REQUIRED_DEAL_PROPERTIES>`. Sensitive Case values return only with `sensitive.read`. Sandbox portal `50850427` cannot store that tier, so sensitivity is not an end-to-end sandbox test.

**Out of this stream:** backfill of the ~74 real cases (full production tomorrow), staffing-signal behavior, and any production write that is not a ZZ TEST record.

**In this stream, after sandbox testing:** copy the sandbox workflows listed under Drive **sandbox assets** into production for ZZ TEST only. Workflows are the main assets to transfer. Do not enroll real clients.

**Do not merge** `align-sandbox-hubspot-field-sync` until WS.1 is written and WS.2 has closed the gaps that read found. WS.2 is the new end-to-end: sensitive limitation stays, queue workers process, and the sandbox poller runs once on a linked record. Production poller stays off. Phases 0–5 in `.test-evidence/TEST-RUN-SUMMARY.md` are the previous test. Comorbid and maladaptive stay unchanged until the live properties are confirmed.

---

## Suggested pstack prompts

**Architecture**

> Read `docs/PSTACK-REVIEW-CONTEXT.md` and the linked docs in order. Diagram the runtime path and list where duplicate logic or split queues could cause drift. Recommend the smallest consolidation before production.

**Workstream efficiency**

> Using `CHECKPOINT.md` and `SANDBOX-DONE.md`, confirm the workstream order is WS.1 then WS.2. Phases 0–5 are the previous test. The new end-to-end must include the queue workers and one sandbox poller test on a linked record. Do not treat a deferred poller as done.

**Merge / deploy**

> Compare `main` at `f215d9d` with `align-sandbox-hubspot-field-sync`. What must be true before merge, given WS.1 is still open? Do not recommend implementing backfill or the staffing-signal workstream in this pass. Call out comorbid and maladaptive as unconfirmed.
