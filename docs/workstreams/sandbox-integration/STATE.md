# Sandbox integration

Task. Run the sandbox integration as one thread, one state file, and branch `sandbox-integration`.

Done when.

- The 24-hour report exists on portal `50850427` for deals, BT/RBT `2-55656309`, and BCBA `2-55656302`, filtered on `integration_last_write` after 1 day ago.
- Each sync-code slice on this branch has a check that was run, then a pull request merged with a merge commit.
- `.env` and `local.settings.json` stay uncommitted.

Current status. This folder is the workstream record. The branch was created from `main` at `028d087`. No sync code is on the branch yet. The report is not created. Pull requests 2 and 3 stay open.

Last step. Packaged the one-thread rule into this folder and `START.md`.

Next action. Open a new chat, paste `docs/workstreams/sandbox-integration/START.md`, and check out this branch before the first edit. That chat reviews the plan, then does the report. This chat does not start the sync edits.

## How the thread runs

One chat is the coordinator. It reviews the plan before the first edit. It spawns subagents. After each one returns, it writes the short result here. Subagents get this path and a bounded task. They do not get their own branch, and they do not paste the whole chat.

`docs/workstreams/session-run/` stays the operator record. Read `docs/workstreams/sandbox-resume/STATE.md` and `docs/workstreams/integration-state-chart/STATE.md` for the report and the field decisions. Update those files only when this workstream changes their facts.

Merge a slice when its check passes, then continue on this branch from the updated `main`.

## Key facts

- Branch. `sandbox-integration`, from `main` at `028d087`.
- Portal. `50850427`. HubSpot CLI account `UnitedCare_Test_Integration`.
- Do not use portal. `246184070`.
- Env. Root `.env` and `local.settings.json` are local and gitignored. The three `AzureWebJobs.*.Disabled` flags are `true`.
- Webhook. `HUBSPOT_WEBHOOK_CLIENT_SECRET` and `HUBSPOT_WEBHOOK_URI` are empty, so webhook tests are not ready.
- Hard stop. Do not merge pull request 2 or pull request 3. Do not recreate `recovery/reviewed-field-alignment`. Do not deploy `centralreachserverless`.

## Open

- 24-hour report on portal `50850427`.
- Webhook secret and URI still need a local fill before webhook tests.
- Rename this branch only if Zeke wants a different name. Do not add a second branch for the same workstream.
