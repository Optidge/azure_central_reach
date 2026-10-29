# Handoff — fresh agent

**As of:** 2026-10-28, about 7:18 PM America/Chicago  
**Repo:** `azure_central_reach` (Optidge / United Care ABA)  
**Checkout:** `align-sandbox-hubspot-field-sync`. Handoff commit `69fe219`.  
**Status:** Commit `69fe219` is pushed and is not on `main`. The WS.1 definition diff is [`ws1-schema-diff.md`](ws1-schema-diff.md). Open questions are in [`CHECKPOINT.md`](CHECKPOINT.md) under **Open after the 10/28 schema pass**. Do not start the sandbox poller until those questions are decided. The branch merges only after the WS.2 proof exists.

This file is the entry point for a new chat. The checkpoint is the living status.

---

## Read first

1. [`CHECKPOINT.md`](CHECKPOINT.md) — current status. The **Danny — 10/28** timing table wins over older “waiting on Sara” lists.
2. [`PSTACK-REVIEW-CONTEXT.md`](PSTACK-REVIEW-CONTEXT.md) — read order and what to review.
3. [`.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md`](../.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md) — what sandbox done means.
4. [`Change Detection Completion Phase.md`](Change%20Detection%20Completion%20Phase.md) — row-level outcome and how to verify.
5. [`SOURCE-OF-TRUTH.md`](SOURCE-OF-TRUTH.md) — Drive vs repo.

Business rules: [Google Drive Optidge V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit). Danny’s 10/28 note is tab `t.0`. Do not copy the one-time credential link from that note into git or chat.

Do not print tokens. `HUBSPOT_PRIVATE_APP_TOKEN` and `HUBSPOT_PRIVATE_APP_TOKEN_PROD` live in gitignored `.env`.

---

## Where we are

| Item | State |
| --- | --- |
| Phase | Sandbox change-detection completion. Portal `50850427`. Function App `centralreachserverless`. |
| Deployed baseline | `main` at `f215d9d` (hybrid webhook + linked-recheck). PR #1 merged. |
| Working branch | `align-sandbox-hubspot-field-sync`. Handoff commit `69fe219`. Broader fetch lists and sandbox property scripts. **Not merged. Not confirmed published.** |
| Tonight’s doc edits | Handoff commit `69fe219` is pushed and is not on `main`. The sandbox done-bar wording is a later commit on this branch, also not on `main`. |
| Next gate | Review the open questions in [`CHECKPOINT.md`](CHECKPOINT.md). The WS.1 diff exists. Do not start the sandbox poller. |

Architecture:

```text
HubSpot sandbox 50850427
  webhook (fast) ─────────────┐
  intakePoller (backup) ──────┼─► client-sync-queue / employee-sync-queue
                              │     processClientQueue / processEmployeeQueue
                              └─► same fetch → hash → CentralReach → HubSpot writeback
```

The timer is **off on the app today**. That is the current setting. Sandbox is not done until the end-to-end run turns it on and a poller-only change syncs through those same queues. The production poller stays off.

---

## What changed this evening (10/28)

- Production HubSpot read access is available. Schema confirmation is no longer blocked. Record writes in production are still out.
- Danny’s note closed guardian selection, New Mexico / Virginia, cleanup stages, a fourth Contact workflow, and BCBA `workday_id` as CentralReach External System ID. Comorbid and maladaptive still need a live-property confirmation before any mapper change.
- Backfill of the ~74 cases that already have a CentralReach id is decided and **waits for full production tomorrow**. Do not code or run it in sandbox. Sandbox still requires the Yes token.
- Staffing-signal behavior is a **separate workstream**. Creating missing sandbox properties, including the production trigger names, is still this stream.
- Workstream order is now the plan:
  - **WS.1.** Production property definitions, association labels, then a CentralReach metadata and org-label re-pull. Read definitions, not record values.
  - **WS.2.** Fix sandbox gaps the production read can close, finish sandbox end-to-end with the known sensitive limitation, and turn the sandbox poller on for one linked-record test. Production poller stays off. Queue workers must be processing. The poller uses the same queues.
- Phases 0–5 in `.test-evidence/TEST-RUN-SUMMARY.md` are the **previous** test. Use them as evidence. Do not treat them as the script for WS.2.
- Original records stay the address baseline: Case deal `66712883229` / client `5324526`, BT/RBT `64796590207` / employee `5324528`, BCBA `64797567870` / employee `5324527`. Restore streets `102` / `202` / `302`.
- Do not add a second verification skill. `.cursor/skills/verify-azure-central-reach/` is the local HTTP harness. It keeps timer and queues **disabled** on port `17071`. That harness does not prove sandbox done. A webhook **202** is not a CentralReach update.
- Production verification is a separate pass tomorrow: portal `50317927`, **ZZ TEST records only**, sensitive-field GET, then copy sandbox workflows from the Drive **sandbox assets** list. Do not enroll real clients. Do not create real CentralReach clients.

---

## Start here

The WS.1 diff is written. Start with the open questions in [`CHECKPOINT.md`](CHECKPOINT.md).

- The diff is [`ws1-schema-diff.md`](ws1-schema-diff.md). It compares production property definitions, association labels, and CentralReach metadata and org labels with `src/constants/centralReach.mjs`.
- The production definition read uses the HubSpot CLI (`hs`). Reads and changes on the live Function App use the Azure CLI (`az`). That covers app settings, the poller switch, and the queues. Publishing the app is `func azure functionapp publish centralreachserverless`, and only when explicitly approved. CentralReach metadata uses the discovery commands in [`centralreach-metadata-and-labels-discovery.md`](centralreach-metadata-and-labels-discovery.md).
- Do not export record values. Do not print secrets.
- Do not merge, publish, write sandbox or production records, or enable the poller during WS.1.
- Do not implement backfill or staffing-signal behavior.
- Do not change the comorbid / maladaptive mapper.
- Do not invent the Grad Permit BCBA internal name.

WS.2 starts only after the open questions are decided. WS.2 is the new end-to-end, including the queues and one sandbox poller test. Production poller stays off.
