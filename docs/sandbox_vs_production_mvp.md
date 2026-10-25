## MVP: Sandbox vs Production separation (HubSpot → CentralReach)

Moving this from Pipedream to Azure. Today, sandbox vs production is **not** switched by Azure env yet — it is hardcoded constants: **sandbox IDs are active defaults; production IDs are kept as commented references** next to them for later swap.

**Important:** Production pipeline and stage IDs need to be **rechecked against the most recent UnitedCare documentation** before using them in Azure. Treat current prod values as provisional references only.

### How separation works

- Each flow filters HubSpot by **pipeline ID** + **stage allowlist** (`IN` those stages).
- **Cases** (HubSpot deals object) already have both sandbox and production stage lists live; which list is used depends on the pipeline ID passed in (`stageAllowlistByPipeline`).
- **BT/RBT** and **BCBA** run on **sandbox object type + pipeline + stages** only. Production object type/pipeline (and BT/RBT prod stages) are commented for later; **BCBA prod stages are not captured yet**.

### Consolidated reference (all flows)

`/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### Case (Client) — HubSpot Case → CentralReach

| | Sandbox | Production *(recheck vs UnitedCare docs)* |
|---|---|---|
| Pipeline | `851341465` | `default` |
| Stages | Full sandbox allowlist (Intake Complete → Disqualified) | Full prod allowlist (Intake Complete → Discharged; includes Service Ready variants, First Three Days, Ongoing) |

**Source files (full pipeline + stage IDs):**

- `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/client_intake_poller.js`
- Also in combined poller: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js`
- Summary map: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### BT/RBT — custom object

| | Sandbox (active) | Production (commented; *recheck vs UnitedCare docs*) |
|---|---|---|
| Object type | `2-55656309` | `2-48354559` |
| Pipeline | `851341475` | `822050166` |
| Stages | `1268817294`–`1268817298` | Cleared to Be Assigned (trigger) → Terminated |

**Source files (full pipeline + stage IDs):**

- `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/rt_rbt_intake_poller.js`
- Task notes: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/rt/rbt_task.md`
- Also in: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js`
- Summary map: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### BCBA — custom object

| | Sandbox (active) | Production (commented; *recheck vs UnitedCare docs*) |
|---|---|---|
| Object type | `2-55656302` | `2-48354212` |
| Pipeline | `876724575` | `855656544` |
| Stages | Cleared to be Assigned (trigger) → Disqualified | **Not defined yet** — confirm from UnitedCare docs |

**Source files (full pipeline + stage IDs):**

- `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/bcba_intake_poller.js`
- Task notes: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/bcba_task.md`
- Also in: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js`
- Summary map: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### Azure implication

Wire env vars (or app settings) for object type, pipeline, and stage allowlist per environment, then flip sandbox → production without code changes — **only after production IDs are verified against the latest UnitedCare documentation**.
