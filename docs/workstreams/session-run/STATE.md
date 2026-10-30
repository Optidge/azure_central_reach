# Session run

Task. Keep this Optidge azure_central_reach chat on one session system of record. Recover local env. Write the PR and branch workstream so the next coding work starts on the right branch, not on `main` by accident.

Done when.

- Root `.env` exists and is gitignored.
- `local.settings.json` exists for the Functions host and is gitignored.
- `docs/workstreams/session-run/PR-AND-BRANCH.md` names which PRs stay open, which branch to create for sync code, and what `main` is for.
- This file stays current after each meaningful step.

Current status. Session notes are stored on remote branch `docs/session-run-notes`. Checkout should be `main` at `d8df45b`. `recovery/reviewed-field-alignment` is not the working branch. Zeke will create the next code branch himself, under a different name. PR 2 is a hard stop. No deploy. No sync code was copied in this pass.

Last step. Parked `docs/workstreams/session-run/` on `docs/session-run-notes` and pushed it. Removed the local recovery branch.

Next action. Wait. Zeke creates the new branch. Do not recreate `recovery/reviewed-field-alignment`.

## Key facts

- Fresh repo. `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`
- Backup, reference only. `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach_backup_2026-10-30`
- Tracker. `docs/workstreams/pr-transfer-tracker.md`
- Sandbox portal. `50850427` with HubSpot CLI account `UnitedCare_Test_Integration`
- Do not use portal. `246184070`
- PR 2 cannot be merged for this work. Hard stop.
- Azure Functions reads `local.settings.json`. Root `.env` alone does not feed `func start`.

## Open

- Wait for Zeke on which branch to create next, if any.
- Sandbox 24-hour report on portal `50850427` still not created (separate from branch work).
