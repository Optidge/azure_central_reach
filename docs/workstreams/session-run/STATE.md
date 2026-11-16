# Session run

Task. Keep this Optidge azure_central_reach chat on one session system of record. Recover local env. Write the PR and branch workstream so the next coding work starts on the right branch, not on `main` by accident.

Done when.

- Root `.env` exists and is gitignored.
- `local.settings.json` exists for the Functions host and is gitignored.
- `docs/workstreams/session-run/PR-AND-BRANCH.md` names which PRs stay open, which branch to create for sync code, and what `main` is for.
- This file stays current after each meaningful step.

Current status. Env restore worked. `.env` and `local.settings.json` are local, gitignored, and pointed at sandbox portal id `52311591`. The three `AzureWebJobs.*.Disabled` flags are `true`. The notes merge is on `main` at `028d087`. PR 2 and PR 3 stay open. No deploy. The git session playbook now asks which worktree or branch to use before checkout.

Last step. 2026-11-16 updated `docs/workstreams/session-run/GIT-SESSION-PLAYBOOK.md` on local `sandbox-integration`. Session start confirms the worktree or branch, then fast-forwards that branch and continues from its latest commit. Sandbox portal id is `52311591`. Hard stops hold: never merge PR #2/#3, no secrets, no deploy unless asked.

Next action. Ask Zeke which worktree or branch to use. Do not assume `sandbox-integration`. After he names one, fast-forward it and continue from that branch's latest commit and its `STATE.md`. Agent git commands: `docs/workstreams/session-run/GIT-SESSION-PLAYBOOK.md`. Before every commit, run the playbook pre-commit block. Do not push `.env` or `local.settings.json`. Do not merge PR 2 or PR 3. Do not recreate `recovery/reviewed-field-alignment`. Do not use portal `246184070` for sandbox work.

## Handoff

Read this file before the next edit. The env files already work for local `func start`. Merging them would publish the tokens. `main` plus this notes branch is the test baseline. The sandbox check that is still open is the 24-hour report above. Webhook secret and URI are still empty, so webhook tests are not ready.

## Key facts

- Fresh repo. `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`
- Backup, reference only. `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach_backup_2026-10-30`
- Tracker. `docs/workstreams/pr-transfer-tracker.md`
- Sandbox portal id. `52311591` with HubSpot CLI account `UnitedCare_Test_Integration`
- Do not use portal. `246184070`
- PR 2 cannot be merged for this work. Hard stop.
- Azure Functions reads `local.settings.json`. Root `.env` alone does not feed `func start`.

## Open

- Sandbox integration continues on branch `sandbox-integration`. Record is `docs/workstreams/sandbox-integration/STATE.md`.
- Sandbox portal id for new work is `52311591`. The 24-hour report was never created on the previous portal `50850427`. Do not create it on `246184070`.
