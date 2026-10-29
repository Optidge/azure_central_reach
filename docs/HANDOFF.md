# Handoff — fresh agent

**As of:** 2026-10-29 late morning, America/Chicago. Poller marker passed. CentralReach restore did not. Timer is off.  
**Repo:** `azure_central_reach` (Optidge / United Care ABA)  
**Checkout:** `align-sandbox-hubspot-field-sync`. Published app is `037ea72`. Ahead of origin. Not pushed. Not merged.  
**Status:** The nine schema questions are decided. Units 1 through 7 in [`CHECKPOINT.md`](CHECKPOINT.md) under **Paused 2026-10-29** are done, including the live webhook proof on row 3.8b. Do not start the poller, the 20-minute loop, a merge, or a push until Zeke asks. The branch merges only after the full WS.2 proof exists, including the poller test.

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
| Working branch | `align-sandbox-hubspot-field-sync`. Published app is `037ea72` on `centralreachserverless`. Portal `50850427`. Newest commit is the pause note. **Not pushed. Not merged.** |
| Live app | Poller disabled. Both queue workers enabled. Do not publish again unless this commit is no longer what the app is running. |
| Next gate | Clear CentralReach metadata `132304` so it matches restored HubSpot `work_schedule_details` on deal `66712883229`. The poller marker already passed. The timer is off. Do not enable it until Zeke asks. |

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

Read **Paused 2026-10-29** in [`CHECKPOINT.md`](CHECKPOINT.md) before any other step. The WS.1 diff is written and the nine questions are decided. Do not recreate the nine sandbox properties, the option adds, the guardian read, the IA BCBA constant, or row 3.8b. The Case gate on deal `66712883229` already contains `Yes`.

- The diff is [`ws1-schema-diff.md`](ws1-schema-diff.md). It compares production property definitions, association labels, and CentralReach metadata and org labels with `src/constants/centralReach.mjs`.
- The production definition read uses the HubSpot CLI (`hs`). Reads and changes on the live Function App use the Azure CLI (`az`). That covers app settings, the poller switch, and the queues. Publishing the app is `func azure functionapp publish centralreachserverless`, and only when explicitly approved. CentralReach metadata uses the discovery commands in [`centralreach-metadata-and-labels-discovery.md`](centralreach-metadata-and-labels-discovery.md).
- Do not export record values. Do not print secrets.
- Do not merge, push, or enable the poller until Zeke asks and the resume steps in the checkpoint are true.
- Do not implement backfill or staffing-signal behavior.
- Do not change the comorbid / maladaptive mapper.
- Do not invent the Grad Permit BCBA internal name.
- Do not write production portal `50317927`.

The poller marker passed and the timer is off. CentralReach metadata `132304` still has the test marker `POLL1`. The remaining work is that restore, then the other `not run` matrix rows. Production poller stays off.

The poller-or-workflow contract for Case Status, Staffing Status, the name rollups, and the staffing associations is in [`poller-backup-contract.md`](poller-backup-contract.md). Read that before changing the timer or the workflows.
