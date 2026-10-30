# How to manage PRs and branches on this repo

How-to for this checkout. Pair with `docs/workstreams/pr-transfer-tracker.md` for the review that produced these rules.

## Goal

Keep `main` as the merged notes and safe baseline. Put sync code on one new branch from current `main`. Leave the open PRs alone until you choose them for a different purpose.

## Branch roles

| Branch or PR | Role | What you do |
| --- | --- | --- |
| `main` | Baseline. Merged docs and the employee-create default from PR 4. | Checkout for reading, docs, session notes. Do not pile sync fixes here as direct commits unless you mean to ship them on `main` immediately. |
| `review_and_update_code` | Notes and sandbox pause trail. System of record for those notes is `docs/workstreams/integration-state-chart/STATE.md`. | Read it. Do not treat it as the sync code line. |
| Next code branch | Zeke names it. It is not `recovery/reviewed-field-alignment`. | He creates it from current `main` when sync code starts. |
| PR 2 `align-sandbox-hubspot-field-sync` | Archive-shaped sync attempt. Would replace baseline HubSpot search helpers. | Hard stop. Do not merge. It is not a vehicle for this work. Copy named behaviors only, per the tracker. |
| PR 3 `cursor/remove-verify-azure-central-reach-skill` | Skill deletion only. | Leave open. Do not merge as part of sync work. Conflicts with PR 2 on the skill path. |
| PR 4 `review_and_update_code` | Merged. Notes plus sandbox employee-create default. | Already on `main`. Stop treating it as an open vehicle. |

## How this operator works

These habits come from the prior session trail. Keep them so chat switches do not lose the line of work.

- Keep one tracker with the PR number and the exact files still to bring over. That file is `docs/workstreams/pr-transfer-tracker.md`.
- Do not merge until Zeke asks for the GitHub step. When he asks, use a merge commit on `main`, same style as pull request 1.
- Zeke runs `hs api` himself on CLI account `UnitedCare_Test_Integration` and pastes the output. Do not treat Cursor's HubSpot connection (portal `246184070`) as the sandbox.
- After a merge, put loose notes under `docs`, commit them, and leave deploy off unless he asks.
- Sync runtime fixes go on a later branch from `main` as copied named behavior. Do not merge whole workflow files from pull request 2.

## Daily rule

1. Run `git status -sb` and `git branch --show-current` before you edit.
2. If the work is docs or session state only, stay on `main` or a short-lived `docs/...` branch.
3. If the work is sync runtime code, use the branch Zeke created. Do not create `recovery/reviewed-field-alignment`.
4. Open one PR from that branch when the unit is reviewable. Do not reopen PR 2 or 4 as the carrier.
5. Do not deploy `centralreachserverless` from a session that only restored env or wrote docs.

## Create the code branch when you need it

Zeke creates this branch. Do not name it `recovery/reviewed-field-alignment`.

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b <name-zeke-chooses>
```

Then bring the named behaviors from the tracker and the backup tree, in tracker order, one verifiable unit at a time. Do not merge PR 2.

Session notes for this chat live on remote branch `docs/session-run-notes`.

## Skill and playbook for this work

Use poteto-mode **Feature** (`playbooks/feature.md`). That owns design, transfer, verify, small commits, then Opening a PR.

Do not use Babysit or Shipping to land PR 2 or PR 3. Those pulls are not the vehicle.

Operator how-to for which branch. This file.

Exact files and order. `docs/workstreams/pr-transfer-tracker.md`.

## What not to do

- Do not merge PR 2 to get date parsing, Yes gate, missing-field stop, or webhook routing. Those pieces are not a clean PR 2 merge.
- Do not merge PR 3 to unblock sync. It only deletes a local skill and fights PR 2 on that path.
- Do not keep coding on `review_and_update_code` and expect `main` or the live Function App to move with you.
- Do not create the report or run HubSpot property work against portal `246184070`. Sandbox is `50850427`.

## Related systems of record

- Session for this chat. `docs/workstreams/session-run/STATE.md`
- Sandbox report resume. `docs/workstreams/sandbox-resume/STATE.md`
- Integration decisions. `docs/workstreams/integration-state-chart/STATE.md`
- PR review detail. `docs/workstreams/pr-transfer-tracker.md`
- Backup reference tree. `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach_backup_2026-10-30`
