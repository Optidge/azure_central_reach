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

Sandbox IDs below are still from the older Pipedream active constants. Production object types, pipelines, and stages below match the live HubSpot configuration (stage names preserved exactly, including emojis). Do not copy production object ids `2-48354212` or `2-48354559` into this Function App while it is still pointed at sandbox.

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
- **Production** object types, pipelines, and stages below match the live HubSpot portal `50317927` configuration. Older Pipedream comments are outdated for several stage names/IDs; prefer the production inventory in this doc.

### How separation works

The stage lists below are the poller search filters from the older Pipedream files (sandbox) plus the live HubSpot production configuration. The sandbox webhook does not use a stage allowlist as the eligibility gate. The workflow sends the record id, and the queue worker reads that record.

- Each poller flow filters HubSpot by **pipeline ID** + **stage allowlist** (`IN` those stages).
- **Cases** (HubSpot deals object, renamed “Case”, object type `0-3`) already have both sandbox and production stage lists; which list is used depends on the pipeline ID passed in (`stageAllowlistByPipeline`). Production Case pipeline ID is literally `default`.
- **BT/RBT** and **BCBA** currently run on **sandbox object type + pipeline + stages** only. Production object type, pipeline, and full stage lists are documented below for the production cutover.

### Consolidated reference (all flows)

`/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### Case (Client) — HubSpot Case → CentralReach

| | Sandbox *(confirmed)* | Production *(live HubSpot config)* |
|---|---|---|
| Object type | `0-3` (Deal / Case) | `0-3` (standard Deal object, renamed “Case”) |
| Pipeline | `851341465` | Client Pipeline — `default` |
| Stages | Full sandbox allowlist (Intake Complete → Disqualified) | Full Client Pipeline stage list (Contact Client → Contact Only Cleanup); see production inventory |

**Source files (sandbox pipeline + stage IDs):**

- `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/client_intake_poller.js`
- Also in combined poller: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js`
- Summary map: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### BT/RBT — custom object

| | Sandbox (active; *confirmed*) | Production *(live HubSpot config)* |
|---|---|---|
| Object type | `2-55656309` | `2-48354559` |
| Pipeline | `851341475` | Hiring Process — `822050166` |
| Stages | `1268817294`–`1268817298` | Applied → Apploi from Link; see production inventory |

**Source files (sandbox pipeline + stage IDs):**

- `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/rt_rbt_intake_poller.js`
- Task notes: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/rt/rbt_task.md`
- Also in: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/combined_intake_pollers.js`
- Summary map: `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/allow_lists.md`

### BCBA — custom object

| | Sandbox (active; *confirmed*) | Production *(live HubSpot config)* |
|---|---|---|
| Object type | `2-55656302` | `2-48354212` |
| Pipeline | `876724575` | Pipeline — `855656544` |
| Stages | Cleared to be Assigned (trigger) → Disqualified | Applied → Apploi from Link; see production inventory |

**Source files (sandbox pipeline + stage IDs):**

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

### Complete production ID inventory *(live HubSpot config — not the active Azure defaults)*

Production object types, pipelines, and stages as configured in portal `50317927`. Stage names are preserved exactly as configured, including emojis. Case pipeline ID is literally `default`, not a numeric ID. None of these appear in the sandbox flat list above. Do not apply them to the Function App while it is still pointed at sandbox.

#### Object and pipeline summary

| Object name | Object type | Object type ID | Pipeline | Pipeline ID |
|---|---|---|---|---|
| Case | Standard Deal object, renamed “Case” | `0-3` | Client Pipeline | `default` |
| BT/RBTs | Custom object | `2-48354559` | Hiring Process | `822050166` |
| BCBA | Custom object | `2-48354212` | Pipeline | `855656544` |

#### Shared
| Kind | ID |
|---|---|
| HubSpot portal | `50317927` |

#### Case — Client Pipeline
| Kind | ID | Label / note |
|---|---|---|
| Object type | `0-3` | Standard Deal object, renamed “Case” |
| Pipeline | `default` | Client Pipeline |
| Stage | `1136629064` | 🤖Contact Client |
| Stage | `1284038324` | 🤖Established Contact |
| Stage | `1136629065` | 🤖Sent Application |
| Stage | `1136629066` | 🤖Intake In Process |
| Stage | `1213733979` | ‼️Intake Complete |
| Stage | `1213681739` | Initial Assessment |
| Stage | `1348616086` | Pending IA Auth |
| Stage | `1216864594` | IA - in Process |
| Stage | `1348616087` | Pending Ongoing Auth |
| Stage | `1263094171` | IA Complete |
| Stage | `1136629068` | 🤖Service Ready |
| Stage | `1342613895` | 🤖Service Ready w/Start Date |
| Stage | `1278121498` | 🤖First Three Days |
| Stage | `1310034488` | 🤖Ongoing |
| Stage | `1341412767` | 🤖Ongoing-2nd BT Needed |
| Stage | `1341412154` | 🤖Restaffing- Paused-No BTBT) |
| Stage | `1341581913` | 🤖Restaffing-BT to be Replaced |
| Stage | `1350979584` | 🤖Restaffing-BCBA Needed |
| Stage | `1350979585` | 🤖Restaffing-BCBA AND BT Needed |
| Stage | `1348616088` | 🤖Reassessment |
| Stage | `1410598808` | Restaffing-Service Ready |
| Stage | `1438735105` | Restaffing- Service Ready w/Start Date |
| Stage | `1438735107` | Restaffing-New BCBA Service Ready |
| Stage | `1438735106` | Restaffing- First Three Days |
| Stage | `1344955718` | Paused |
| Stage | `1136629070` | Disqualified |
| Stage | `1315313037` | Discharged |
| Stage | `closedlost` | Closed Lost |
| Stage | `1332962645` | Lost in the Shuffle |
| Stage | `1383894301` | Prior Service Cleanup |
| Stage | `1383894303` | Prior In Process Cleanup |
| Stage | `1383894302` | Contact Only Cleanup |

#### BT/RBTs — Hiring Process
| Kind | ID | Label / note |
|---|---|---|
| Object type | `2-48354559` | BT/RBTs custom object |
| Pipeline | `822050166` | Hiring Process |
| Stage | `1216616245` | 🤖Applied |
| Stage | `1216616246` | 🤖Contacted |
| Stage | `1263122061` | 🤖Sent Application |
| Stage | `1263122062` | 🤖Hiring In Process |
| Stage | `1275661880` | 🤖Hired |
| Stage | `1216507227` | Paused |
| Stage | `1263175081` | Disqualified |
| Stage | `1299798139` | Resigned |
| Stage | `1299798140` | Terminated |
| Stage | `1331052049` | 🤖Apploi Possibility |
| Stage | `1432363113` | Apploi Responded |
| Stage | `1445425691` | Apploi Candidate |
| Stage | `1466375189` | 🤖Apploi from Link |

#### BCBA — Pipeline
| Kind | ID | Label / note |
|---|---|---|
| Object type | `2-48354212` | BCBA custom object |
| Pipeline | `855656544` | Pipeline |
| Stage | `1275899417` | Applied |
| Stage | `1275899418` | Contacted |
| Stage | `1275697157` | Sent Application |
| Stage | `1275697158` | Hiring In Process |
| Stage | `1363901493` | Hired |
| Stage | `1275697162` | Paused |
| Stage | `1275697163` | Disqualified |
| Stage | `1344955696` | Resigned |
| Stage | `1344955697` | Terminated |
| Stage | `1331112264` | Possibility (Apploi) |
| Stage | `1467178927` | 🤖Apploi from Link |

#### Flat list (production IDs)
`50317927`, `0-3`, `default`, `1136629064`, `1284038324`, `1136629065`, `1136629066`, `1213733979`, `1213681739`, `1348616086`, `1216864594`, `1348616087`, `1263094171`, `1136629068`, `1342613895`, `1278121498`, `1310034488`, `1341412767`, `1341412154`, `1341581913`, `1350979584`, `1350979585`, `1348616088`, `1410598808`, `1438735105`, `1438735107`, `1438735106`, `1344955718`, `1136629070`, `1315313037`, `closedlost`, `1332962645`, `1383894301`, `1383894303`, `1383894302`, `2-48354559`, `822050166`, `1216616245`, `1216616246`, `1263122061`, `1263122062`, `1275661880`, `1216507227`, `1263175081`, `1299798139`, `1299798140`, `1331052049`, `1432363113`, `1445425691`, `1466375189`, `2-48354212`, `855656544`, `1275899417`, `1275899418`, `1275697157`, `1275697158`, `1363901493`, `1275697162`, `1275697163`, `1344955696`, `1344955697`, `1331112264`, `1467178927`

### Azure implication

Wire env vars (or app settings) for object type, pipeline, and stage allowlist per environment. Sandbox values are confirmed and currently active on the Function App. Production IDs in this doc match the live HubSpot configuration and are ready to use when flipping sandbox → production without code changes.
