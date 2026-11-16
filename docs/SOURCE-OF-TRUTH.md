# Source of truth — client integration spec

The **United Care ABA V1 in-state** field map, triggers, association rules, CR label logic, and open gaps live in **Google Drive**, not as a full copy in this repo.

| Document | Role |
| --- | --- |
| **[CentralReach to HubSpot Integration (Optidge V2, Oct 2026)](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.8r9bl7mxhs2f)** | **Business / mapping source of truth** — property internal names, enumeration values, associations, Sara/Optidge decisions. Portal 50317927. Keep this Drive doc current. Second tab **Current Phase of build** tracks which phase is active. |
| [`hubspot-centralreach-field-mappings-current-state.md`](hubspot-centralreach-field-mappings-current-state.md) | **Code as-built** — field mappings and change detection as the Azure repo implements today (may lag the Google doc). |
| [`Sandbox props & labels_summary.md`](Sandbox%20props%20%26%20labels_summary.md) | **Sandbox property and label tracker**, plus the production sensitive-data list (Integration V2 API rule #2, portal `50317927`). Portal `50850427` is a developer test account and cannot store sensitive properties. |
| [`centralreach-metadata-and-labels-discovery.md`](centralreach-metadata-and-labels-discovery.md) | **Sandbox discovery** — `central_reach_test_integration` scripts (`api_calls.js`, `get_all_labels.js`), `output_files/` JSON artifacts, CentralReach API links, and an agent checklist for metadata field IDs and label IDs. |

When the Google doc and this repo disagree, **follow Google Drive for business rules** and update code/docs to match after confirmation. For “what are we building right now,” use the Drive tab **Current Phase of build**.

Do not re-add a mirrored `client-v1-in-state-integration-guide-v2.md` unless the team explicitly decides to version specs in git again.

## Active session and git ops (keep referencing)

These files run the live sandbox-integration chat start. They stay current. Use them every session.

New-chat opener:

> New chat: run `docs/workstreams/session-run/GIT-SESSION-PLAYBOOK.md` session-start block first. Before every commit: run its pre-commit block. `sandbox-integration` / PR #6; never merge PR #2/#3; no secrets; no deploy unless I ask; sandbox portal `52311591` (`50850427` is the retired sandbox); `gh` optional.

| Path | Role |
| --- | --- |
| [`workstreams/session-run/GIT-SESSION-PLAYBOOK.md`](workstreams/session-run/GIT-SESSION-PLAYBOOK.md) | Session-start and pre-commit command blocks. Branch, secret, portal, and deploy hard stops. |
| [`workstreams/session-run/PR-AND-BRANCH.md`](workstreams/session-run/PR-AND-BRANCH.md) | Branch and PR roles for this repo (`sandbox-integration` / PR #6). |
| [`workstreams/session-run/STATE.md`](workstreams/session-run/STATE.md) | Session-run system of record for the current chat line. |
| [`workstreams/sandbox-integration/START.md`](workstreams/sandbox-integration/START.md) | Paste block that starts the sandbox-integration coordinator thread. |
| [`workstreams/sandbox-integration/STATE.md`](workstreams/sandbox-integration/STATE.md) | Sandbox-integration system of record for that workstream. |

## Historical only — do not reference unless commanded

The paths below are **historical reference only**. Agents and operators must **not** open, cite, or treat them as current guidance unless Zeke explicitly commands it for that turn.

- `docs/plans/` (entire directory)
- `docs/session-logs/` (entire directory)
- `docs/workstreams/` **except** the Active session and git ops files listed above
- `docs/prompts/` (entire directory, if present)
- `docs/Azure_repo_recovery_handoff.md`
- `docs/Change Detection Completion Phase.md`
- `docs/open-items.md`
