## MVP: Sandbox vs Production separation (HubSpot → CentralReach)

Azure Function App `centralreachserverless` in resource group `centralreachintegration` is running **sandbox** app settings. Verified Oct 25, 2026, about 10:41 PM CT. Production portal `50317927` is not configured on this app.

| Setting | Sandbox value on the Function App |
| --- | --- |
| Portal | `50850427` |
| Case | object `0-3`, pipeline `851341465` |
| BT/RBT | object `2-55656309`, pipeline `851341475` |
| BCBA | object `2-55656302`, pipeline `876724575` |
| Queues in use | `client-sync-queue`, `employee-sync-queue` |
| Unused queues | `rtbt-sync-queue`, `bcba-sync-queue` exist and are not used |
| `processClientQueue` / `processEmployeeQueue` | enabled |
| `intakePoller` | disabled |
| `ALLOW_EMPLOYEE_CREATE` | `true` |
| `PUT_ONLY_MODE` | `false` |
| Webhook | `POST /api/hubspot-webhook` on `centralreachserverless` |
| Private app | CentralReach integration, app ID `30920156` |

The code reads those values from app settings (`HUBSPOT_PORTAL_ID`, `HS_DEAL_PIPELINE_ID`, `HS_BT_RBT_OBJECT_TYPE_ID`, `HS_BCBA_OBJECT_TYPE_ID`, `CLIENT_SYNC_QUEUE_NAME`, `EMPLOYEE_SYNC_QUEUE_NAME`, and the matching pipeline settings in `src/lib/config.mjs`). It does not switch portals with hardcoded constants.

The ID tables below are still the inventory from the older Pipedream files: sandbox IDs were the active constants, and production IDs were comments. Use them as the checklist when someone later verifies production. Do not copy production object ids `2-48354212` or `2-48354559` into this Function App.

**Confirmed Oct 25, 2026 (portal split, webhooks, auth):**

| | Sandbox | Production |
|---|---|---|
| HubSpot portal | `50850427` | `50317927` |
| Where it lives in code | Active constants (`*_TEST`) | Commented constants (`*_PROD`, `*_LIVE`) |
| Workflow “Send a webhook” | Confirmed. Optidge can send workflow webhooks from this portal. | Confirmed. Same, from this portal. |
| App type | Legacy private app in this portal. One app, one access token, one client secret. | Separate legacy private app in this portal. Do not reuse the sandbox token or secret. |

Azure today follows the sandbox column. `local.settings.json` sets `HUBSPOT_PORTAL_ID` to `50850427`. API reads use `HUBSPOT_PRIVATE_APP_TOKEN` as `Authorization: Bearer <token>` on that legacy private app. A workflow webhook is a different credential: validate `X-HubSpot-Signature` / `X-HubSpot-Signature-Version: v2` with that same app’s **client secret** (Auth tab → Show secret), not the access token. Source: HubSpot legacy docs [Private apps](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview) and [Validating requests](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests), fetched Oct 25, 2026. The v2 string is `client secret + HTTP method + request URI + body`.

Do not build the MVP on legacy private-app **webhook subscriptions**. Those are CRM event subscriptions (signature v1, standard objects such as contacts and deals). The MVP signal is the workflow action, which both portals can already send.

**Important:**
- **Sandbox** pipeline, object type, and stage IDs below match the active constants in `combined_intake_pollers.js`, `client_intake_poller.js`, `bcba_step_2_workflow.js`, and `step_2_rt/rtbt.js`.
- **Production** IDs below are the commented references in those same files. They are identified and separated from sandbox. Recheck them against the latest UnitedCare documentation before Azure uses them. BCBA production **stages are not in the source code**.

### How separation works

The stage lists below are the poller search filters from the older Pipedream files. The sandbox webhook does not use a stage allowlist as the eligibility gate. The workflow sends the record id, and the queue worker reads that record.

- Each poller flow filters HubSpot by **pipeline ID** + **stage allowlist** (`IN` those stages).
- **Cases** (HubSpot deals object) already have both sandbox and production stage lists live; which list is used depends on the pipeline ID passed in (`stageAllowlistByPipeline`).
- **BT/RBT** and **BCBA** run on **sandbox object type + pipeline + stages** only. Production object type/pipeline (and BT/RBT prod stages) are commented for later; **BCBA prod stages are not captured yet**.

### Consolidated reference (all flows)

`/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### Case (Client) — HubSpot Case → CentralReach

| | Sandbox *(confirmed)* | Production *(recheck vs UnitedCare docs)* |
|---|---|---|
| Pipeline | `851341465` | `default` |
| Stages | Full sandbox allowlist (Intake Complete → Disqualified) | Full prod allowlist (Intake Complete → Discharged; includes Service Ready variants, First Three Days, Ongoing) |

**Source files (full pipeline + stage IDs):**

- `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/client_intake_poller.js`
- Also in combined poller: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js`
- Summary map: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### BT/RBT — custom object

| | Sandbox (active; *confirmed*) | Production (commented; *recheck vs UnitedCare docs*) |
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

| | Sandbox (active; *confirmed*) | Production (commented; *recheck vs UnitedCare docs*) |
|---|---|---|
| Object type | `2-55656302` | `2-48354212` |
| Pipeline | `876724575` | `855656544` |
| Stages | Cleared to be Assigned (trigger) → Disqualified | **Not defined yet** — confirm from UnitedCare docs |

**Source files (full pipeline + stage IDs):**

- `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/bcba_intake_poller.js`
- Task notes: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/bcba_task.md`
- Also in: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js`
- Summary map: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### Complete sandbox ID inventory *(confirmed)*

Every sandbox / test ID referenced in the Pipedream HubSpot → CentralReach code:

#### Shared
| Kind | ID |
|---|---|
| HubSpot portal | `50850427` |

#### Case (Client)
| Kind | ID | Label / note |
|---|---|---|
| Pipeline | `851341465` | Case sandbox pipeline |
| Stage | `1268817225` | Intake Complete *(trigger / first allowlist stage)* |
| Stage | `1268817226` | Initial Assessment |
| Stage | `1268817227` | IA - in Process |
| Stage | `1268817228` | IA - Paused Assessment Approval |
| Stage | `1268817229` | IA - Paused Auth Approval |
| Stage | `1268817230` | Initial Assessment Complete |
| Stage | `1268817231` | Assign Staff for Ongoing |
| Stage | `1268817232` | Service Ready |
| Stage | `1268817233` | Closed Won |
| Stage | `1268817234` | Closed Lost |
| Stage | `1268817235` | Disqualified |

#### BT/RBT
| Kind | ID | Label / note |
|---|---|---|
| Object type | `2-55656309` | BT/RBT custom object |
| Pipeline | `851341475` | BT/RBT sandbox pipeline |
| Stage | `1268817294` | Sandbox stage 1 *(labels not named in code)* |
| Stage | `1268817295` | Sandbox stage 2 |
| Stage | `1268817296` | Sandbox stage 3 |
| Stage | `1268817297` | Sandbox stage 4 |
| Stage | `1268817298` | Sandbox stage 5 |

#### BCBA
| Kind | ID | Label / note |
|---|---|---|
| Object type | `2-55656302` | BCBA custom object |
| Pipeline | `876724575` | BCBA sandbox pipeline |
| Stage | `1314109614` | Cleared to be Assigned *(trigger)* |
| Stage | `1314109318` | Fully Cleared |
| Stage | `1314109615` | Hiring Complete |
| Stage | `1314110003` | Hired/Credentialing In Process |
| Stage | `1314110004` | Hired/Credentialing Complete |
| Stage | `1314796081` | Paused |
| Stage | `1314109317` | Disqualified |

#### Flat list (all sandbox IDs)
`50850427`, `851341465`, `1268817225`, `1268817226`, `1268817227`, `1268817228`, `1268817229`, `1268817230`, `1268817231`, `1268817232`, `1268817233`, `1268817234`, `1268817235`, `2-55656309`, `851341475`, `1268817294`, `1268817295`, `1268817296`, `1268817297`, `1268817298`, `2-55656302`, `876724575`, `1314109614`, `1314109318`, `1314109615`, `1314110003`, `1314110004`, `1314796081`, `1314109317`

### Complete production ID inventory *(commented references — not the active defaults)*

These are the production values sitting next to the sandbox constants. None of them appear in the sandbox flat list above.

#### Shared
| Kind | ID |
|---|---|
| HubSpot portal | `50317927` |

#### Case (Client) — labels from `client_intake_poller.js`
| Kind | ID | Label / note |
|---|---|---|
| Pipeline | `default` | Case production pipeline |
| Stage | `1213733979` | Intake Complete |
| Stage | `1213681739` | Initial Assessment |
| Stage | `1216864594` | IA - in Process |
| Stage | `1266305408` | IA - Paused Assessment Approval |
| Stage | `1266305409` | IA - Paused Auth Approval |
| Stage | `1263094171` | Initial Assessment Complete |
| Stage | `1136629068` | Assign Staff for Ongoing |
| Stage | `1263175192` | Service Ready - Need Confirmed Start Date |
| Stage | `1278256273` | Service Ready - Has Confirmed Start Date |
| Stage | `1278121498` | First Three Days |
| Stage | `closedwon` | Closed Won |
| Stage | `1310034488` | Ongoing |
| Stage | `closedlost` | Closed Lost |
| Stage | `1136629070` | Disqualified |
| Stage | `1315313037` | Discharged |

#### BT/RBT
| Kind | ID | Label / note |
|---|---|---|
| Object type | `2-48354559` | BT/RBT production custom object |
| Pipeline | `822050166` | BT/RBT production pipeline |
| Stage | `1223572096` | Cleared to Be Assigned *(trigger)* |
| Stage | `1216507226` | Fully Onboarded |
| Stage | `1275661880` | Hired |
| Stage | `1313403933` | Assigned |
| Stage | `1216507227` | Paused |
| Stage | `1263175081` | Disqualified |
| Stage | `1299798139` | Resigned |
| Stage | `1299798140` | Terminated |

#### BCBA
| Kind | ID | Label / note |
|---|---|---|
| Object type | `2-48354212` | BCBA production custom object |
| Pipeline | `855656544` | BCBA production pipeline |
| Stages | — | **Not in source.** Do not invent a production stage allowlist. |

#### Flat list (production IDs present in source)
`50317927`, `default`, `1213733979`, `1213681739`, `1216864594`, `1266305408`, `1266305409`, `1263094171`, `1136629068`, `1263175192`, `1278256273`, `1278121498`, `closedwon`, `1310034488`, `closedlost`, `1136629070`, `1315313037`, `2-48354559`, `822050166`, `1223572096`, `1216507226`, `1275661880`, `1313403933`, `1216507227`, `1263175081`, `1299798139`, `1299798140`, `2-48354212`, `855656544`

### Azure implication

Wire env vars (or app settings) for object type, pipeline, and stage allowlist per environment. Sandbox values are confirmed and ready to use. Flip sandbox → production without code changes **only after production IDs are verified against the latest UnitedCare documentation**.
