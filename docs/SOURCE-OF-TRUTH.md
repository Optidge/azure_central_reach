# Source of truth — client integration spec

The **United Care ABA V1 in-state** field map, triggers, association rules, CR label logic, and open gaps live in **Google Drive**, not as a full copy in this repo.

| Document | Role |
| --- | --- |
| **[CentralReach to HubSpot Integration (Optidge V2, Oct 2026)](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.8r9bl7mxhs2f)** | **Business / mapping source of truth** — property internal names, enumeration values, associations, Sara/Optidge decisions. Portal 50317927. Keep this Drive doc current. Tab **Current Phase of build** tracks which phase is active. |
| [`hubspot-centralreach-field-mappings-current-state.md`](hubspot-centralreach-field-mappings-current-state.md) | **Code as-built** — field mappings and change detection as the Azure repo implements today (may lag the Google doc). |
| [`Sandbox props & labels_summary.md`](Sandbox%20props%20%26%20labels_summary.md) | **Sandbox property and label tracker**, plus the production sensitive-data list (Integration V2 API rule #2, portal `50317927`). Portal `50850427` is a developer test account and cannot store sensitive properties. |
| [`centralreach-metadata-and-labels-discovery.md`](centralreach-metadata-and-labels-discovery.md) | **Sandbox discovery** — `central_reach_test_integration` scripts (`api_calls.js`, `get_all_labels.js`), `output_files/` JSON artifacts, CentralReach API links, and an agent checklist for metadata field IDs and label IDs. |
| [`CHECKPOINT.md`](CHECKPOINT.md) | **Current build status** — webhook primary, poller backup, sandbox vs production gates, WS.1 / WS.2, and the 10/29 pause. Sandbox portal `50850427`. Production portal `50317927` is not enabled. Timer stays off until Zeke asks. |
| [`poller-backup-contract.md`](poller-backup-contract.md) | **Poller vs workflow contract** — which of Case Status, Staffing Status, the name rollups, and the staffing associations the timer already covers, and what a tick costs. Holds Zeke's 10/29 direction: event-first, with the poller kept as the backup at a 30-minute target and far fewer calls. Also the proposal and open questions for the poller architecture thread. Timer stays off until Zeke asks. |

When the Google doc and this repo disagree, **follow Google Drive for business rules** and update code/docs to match after confirmation. For “what are we building right now,” use the Drive tab **Current Phase of build**, then [`CHECKPOINT.md`](CHECKPOINT.md) and [`poller-backup-contract.md`](poller-backup-contract.md).

**Current gate (Oct 28, 2026):** before merging `align-sandbox-hubspot-field-sync`, read production portal `50317927` property definitions and association labels, compare them to sandbox portal `50850427`, and re-pull CentralReach metadata fields and org labels. Status and the known sandbox mismatches are in [`CHECKPOINT.md`](CHECKPOINT.md). Sandbox cannot store sensitive properties. The production sensitive read is the deal GET in `clientSyncWorkflow`, not the webhook body.

**10/28 decisions (Drive tab, Danny):** [same Google Doc, tab `t.0`](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.0). That note overrides older “still waiting on Sara” rows in this repo where they conflict. Summary and the evening timing (backfill tomorrow, staffing signal as its own workstream, comorbid still to confirm) are in [`CHECKPOINT.md`](CHECKPOINT.md) under “Danny — 10/28”. Sandbox workflows to copy into production for ZZ TEST are listed on that doc under **sandbox assets**. Workflows are the main assets to transfer. Do not copy the one-time credential link from that note into git.

Do not re-add a mirrored `client-v1-in-state-integration-guide-v2.md` unless the team explicitly decides to version specs in git again.
