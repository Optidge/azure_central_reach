# doc-bar loop log

## Pass 1. 2026-10-28 evening

**Goal.** Repo docs on `align-sandbox-hubspot-field-sync` describe WS.1, then WS.2, then a separate production pass. No doc tells a reader to run the old Phases 0–5 from `.test-evidence/TEST-RUN-SUMMARY.md` as the next test plan.

**Files I may write.** `.cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md`, `docs/CHECKPOINT.md`, `docs/HANDOFF.md`, `docs/PSTACK-REVIEW-CONTEXT.md`, `docs/Change Detection Completion Phase.md`, `docs/plans/phase-1a-client-intake-trigger.md`, `docs/plans/phase-1a-sandbox-handoff.md`, `scripts/check-sandbox-done-bar.mjs` (new), this file (untracked).

### Facts checked before editing

```
$ git branch --show-current && git rev-parse --short HEAD
align-sandbox-hubspot-field-sync
69fe219
$ git branch -r --contains HEAD
  origin/align-sandbox-hubspot-field-sync
$ git merge-base --is-ancestor HEAD origin/main && echo onmain || echo notonmain
notonmain
$ git grep -n -i "sensitive" HEAD -- src/workflows/clientSyncWorkflow.mjs | head -1
HEAD:src/workflows/clientSyncWorkflow.mjs:55:// Production sensitive-data tier (portal 50317927, Integration V2 API rule #2).
$ git grep -n -i "sensitive" origin/main -- src/workflows/clientSyncWorkflow.mjs
(no output)
```

Remote facts come from local remote-tracking refs. No fetch was run.

### Checker fails on the unedited docs

First draft also matched single build phases and treated the `.test-evidence` path as a history label:

```
$ node scripts/check-sandbox-done-bar.mjs; echo "exit=$?"
Old Phases 0–5 test referenced without a history label:
README.md:108: 1. Intake poller / intake queue (phase 1)
README.md:109: 2. Client sync (phase 2)
README.md:110: 3. Employee sync (phase 3)
docs/CHECKPOINT.md:194: | P2 | Phase 4–5 | Duplicate replay, eligibility scenarios, contact-source / staffing association fixtures — **pending** |
docs/plans/phase-1a-employee-intake-queues.md:100: - [ ] Document Azure settings names for Phase 3 (no deploy in this task unless user asks).
prompts/intake_poller.md:4: Build Phase 1 of the Azure integration: the Intake Poller / Intake Queue logic.
prompts/process_que.md:33: Phase 1 intake poller is working.
exit=1
```

Fixed: match only phase ranges ("Phases 0–5", "Phase 4–5") or `TEST-RUN-SUMMARY`, and strip `.test-evidence` before looking for a history word. Rerun on the still-unedited docs:

```
$ node scripts/check-sandbox-done-bar.mjs; echo "exit=$?"
Old Phases 0–5 test referenced without a history label:
docs/CHECKPOINT.md:185: From `.test-evidence/TEST-RUN-SUMMARY.md` **Still open**:
docs/CHECKPOINT.md:194: | P2 | Phase 4–5 | Duplicate replay, eligibility scenarios, contact-source / staffing association fixtures — **pending** |
docs/PSTACK-REVIEW-CONTEXT.md:50: | 7 | [`.test-evidence/TEST-RUN-SUMMARY.md`](../.test-evidence/TEST-RUN-SUMMARY.md) | Latest sandbox test status (local only, gitignored) |
exit=1
```

Those three lines are the real offenders. The SANDBOX-DONE "Still open from that summary" line and the phone or city next-test sentences do not name a phase or the summary file, so they were fixed by hand.

### Edits

- SANDBOX-DONE.md. Merge needs WS.1 diff and WS.2 proof. "Still open from that summary" list replaced with a prior-evidence line that feeds the WS.2 matrix.
- CHECKPOINT.md. Branch at `69fe219`, pushed, not on `main`. Merge gate needs WS.1 and WS.2 proof (at-a-glance row and the WS.2 section). Node script paragraph replaced with `hs` for the production definition read, `az` for every Azure read and change, CentralReach on the discovery doc. Publish line now publishes to sandbox with `az` and merges only after WS.2 proof. Old "Still open" table relabeled as WS.2 rows carried from prior evidence. Phase 4–5 pending row removed.
- HANDOFF.md. Checkout `69fe219`. Handoff commit on the branch, pushed, not on `main`. Tool line added.
- PSTACK-REVIEW-CONTEXT.md. Summary file row relabeled as previous test evidence.
- Change Detection Completion Phase.md. "Not on GitHub" split into two facts: branch pushed, `main` lacks the branch commits.
- phase-1a plans. Phone or city next-test sentences marked history. Current run points at WS.2.

### Done checks

```
$ node scripts/check-sandbox-done-bar.mjs; echo "exit=$?"
sandbox done bar ok
exit=0

$ npm test 2>&1 | tail
# pass 78
# fail 0
exit=0

$ rg -o 'at `[0-9a-f]{7}`' docs/HANDOFF.md; git rev-parse --short HEAD
at `69fe219`
at `f215d9d`      (main baseline row, not the checkout)
at `69fe219`
69fe219

$ git status --porcelain
 M .cursor/skills/verify-azure-central-reach/SANDBOX-DONE.md
 M docs/CHECKPOINT.md
 M "docs/Change Detection Completion Phase.md"
 M docs/HANDOFF.md
 M docs/PSTACK-REVIEW-CONTEXT.md
 M docs/plans/phase-1a-client-intake-trigger.md
 M docs/plans/phase-1a-sandbox-handoff.md
?? docs/state.md
?? scripts/check-sandbox-done-bar.mjs
(docs/workstreams/ appears once this log exists)

$ git diff | rg '^\+.*HUBSPOT_PRIVATE_APP_TOKEN(_PROD)?\s*='; echo "rg exit=$?"
rg exit=1
```

Nothing committed. No poller, Function App, HubSpot, or CentralReach call. This proves doc alignment only. It does not verify the integration.

**Status.** verified
