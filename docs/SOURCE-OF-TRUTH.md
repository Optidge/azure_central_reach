# Source of truth — client integration spec

The **United Care ABA V1 in-state** field map, triggers, association rules, CR label logic, and open gaps live in **Google Drive**, not as a full copy in this repo.

| Document | Role |
| --- | --- |
| **[CentralReach to HubSpot Integration (Optidge V2, Oct 2026)](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.8r9bl7mxhs2f)** | **Business / mapping source of truth** — property internal names, enumeration values, associations, Sara/Optidge decisions. Portal 50317927. Keep this Drive doc current. Second tab **Current Phase of build** tracks which phase is active and points at the matching repo plan. |
| [`hubspot-centralreach-field-mappings-current-state.md`](hubspot-centralreach-field-mappings-current-state.md) | **Code as-built** — what the Azure repo implements today (may lag the Google doc). |
| [`plans/phase-1a-client-intake-trigger.md`](plans/phase-1a-client-intake-trigger.md) | **Current Phase 1A build reference** — confirmed MVP: workflow webhook primary, existing poller as backup. Sandbox portal `50850427`: the receiver is deployed on `centralreachserverless`, the create test passed on Oct 25, 2026, and `intakePoller` stays disabled until the in-place update test. Production portal `50317927` is not enabled. |

When the Google doc and this repo disagree, **follow Google Drive for business rules** and update code/docs to match after confirmation. For “what are we building right now,” use the Drive tab **Current Phase of build**, then the linked plan file in this repo.

Do not re-add a mirrored `client-v1-in-state-integration-guide-v2.md` unless the team explicitly decides to version specs in git again.
