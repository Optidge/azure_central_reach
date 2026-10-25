# Open items — prod hook-up (local → GitHub → Azure)

Working tracker for UnitedCare production integration. **Do not commit** (see `.gitignore`).

**Prod target (canonical):**

| Item | Value |
|------|--------|
| Subscription | UnitedCareABA — `63ef719f-0711-449d-82e8-f083dca08418` |
| Resource group | `centralreachintegration` |
| Function app | `centralreachserverless` |
| GitHub | https://github.com/Optidge/azure_central_reach |

---

## 0. Env var callouts (avoid copy-paste mistakes)

### CentralReach — no account ID

This Function App does **not** use a CentralReach account ID setting. Auth is Partners Enterprise API only:

- `CR_CLIENT_ID`, `CR_CLIENT_SECRET`, `CR_API_KEY`
- `CR_BASE_URL`, `CR_TOKEN_URL`

Do not add a CR account/tenant ID to prod app settings for this repo.

### HubSpot keys not used here

These may exist in a developer’s local `local.settings.json` from other work but are **not** referenced in `src/lib/config.mjs` or the rest of `src/` — **do not** treat them as required for Azure prod:

- `HUBSPOT_FIELD_ADMIN_TOKEN`
- `HUBSPOT_SETTINGS_CLIENT_SECRET`
- `HUBSPOT_FIELD_ADMIN_USER_IDS`
- `HUBSPOT_PUBLIC_BASE_URL`
- `FIELD_MAPPING_DEMO_MODE`
- `ALLOW_UNVERIFIED_TYPED_METADATA_WRITES`

See `README.md` → Configuration Notes for optional keys this repo **does** read (e.g. `HUBSPOT_PORTAL_ID`, `PUT_ONLY_MODE`).

---

## 1. App settings — secrets & HubSpot IDs (Portal / Key Vault)

**Flex note:** Do **not** set `FUNCTIONS_WORKER_RUNTIME` on this app — Azure rejects it (`Site.SiteConfig.AppSettings.FUNCTIONS_WORKER_RUNTIME` invalid on Flex). Runtime is **Node 22** via the Flex plan config (already set).

Non-secret names, Cosmos resource IDs, queue name for client sync, TTLs, and **all disable flags** were applied via CLI. **Still missing in Azure** (values must be added manually — do not paste secrets into chat):

- `CR_CLIENT_ID`, `CR_CLIENT_SECRET`, `CR_API_KEY`
- `CR_BASE_URL`, `CR_TOKEN_URL`
- `HUBSPOT_PRIVATE_APP_TOKEN`
- `HS_DEAL_PIPELINE_ID`, `HS_STAGE_ALLOWLIST_JSON`
- `HUBSPOT_CR_CONTACT_ID_PROPERTY`
- `HS_BT_RBT_OBJECT_TYPE_ID`, `HS_BT_RBT_PIPELINE_ID`, `HS_BT_RBT_STAGE_ALLOWLIST_JSON`
- `HS_BCBA_OBJECT_TYPE_ID`, `HS_BCBA_PIPELINE_ID`, `HS_BCBA_STAGE_ALLOWLIST_JSON`
- `COSMOS_KEY`
- `SERVICE_BUS_CONNECTION_STRING`

**Verify names only:**

```bash
az account set --subscription "63ef719f-0711-449d-82e8-f083dca08418"
node -e 'const ex=require("./local.settings.example.json"); const extra=["AzureWebJobs.clientSyncHttpTest.Disabled","AzureWebJobs.intakePollerHttpTest.Disabled","AzureWebJobs.connectivityTest.Disabled","HS_BT_RBT_STAGE_ALLOWLIST_JSON","HS_BCBA_OBJECT_TYPE_ID"]; const skip=new Set(["FUNCTIONS_WORKER_RUNTIME","AzureWebJobsStorage"]); const keys=[...new Set([...Object.keys(ex.Values),...extra])].filter(k=>!skip.has(k)).sort(); console.log(keys.join("\n"));' > /tmp/required.txt
az functionapp config appsettings list --name centralreachserverless -g centralreachintegration --query "[].name" -o tsv | sort > /tmp/azure.txt
comm -23 /tmp/required.txt /tmp/azure.txt
```

Pipeline/stage values: confirm against UnitedCare docs and `docs/sandbox_vs_production_mvp.md` / `central_reach_test_integration/allow_lists.md`.

---

## 2. Employee queue architecture

**Azure Service Bus (prod):** `client-sync-queue`, `rtbt-sync-queue`, `bcba-sync-queue`

**Code today:** one `EMPLOYEE_SYNC_QUEUE_NAME` + single `processEmployeeQueue` trigger.

**Decision needed:**

- Route both employee types through one queue, **or**
- Add a second trigger / split send logic for `rtbt-sync-queue` vs `bcba-sync-queue`

Until decided, do not enable `processEmployeeQueue` in prod.

---

## 3. `local.settings.example.json` gaps

`src/lib/config.mjs` requires these but they are **not** in the example file yet:

- `HS_BT_RBT_STAGE_ALLOWLIST_JSON`
- `HS_BCBA_OBJECT_TYPE_ID`

Add to example when sandbox/prod values are finalized.

---

## 4. Documentation drift

Update when ready to commit:

- `README.md` — deploy target `centralreachserverless` (not `centralreachfunction`)
- `prompts/push_to_prod.md` — UnitedCare subscription / RG / app name

---

## 5. Code deploy (not done)

Pre-flight:

```bash
npm test
az account show --query "{tenant:tenantDisplayName,id:id}" -o table
az functionapp function list --name centralreachserverless -g centralreachintegration -o table
```

Deploy (after app settings complete + queue decision):

```bash
func azure functionapp publish centralreachserverless
az functionapp restart --name centralreachserverless -g centralreachintegration
az functionapp function list --name centralreachserverless -g centralreachintegration -o table
```

Docs: [Flex Consumption deploy](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-how-to), [package deployment](https://learn.microsoft.com/en-us/azure/azure-functions/functions-deployment-technologies).

---

## 6. Enable production functions (after deploy + manual tests)

Only after intake/queue paths are verified:

| Setting | Target |
|---------|--------|
| `AzureWebJobs.intakePoller.Disabled` | `false` |
| `AzureWebJobs.processClientQueue.Disabled` | `false` |
| `AzureWebJobs.processEmployeeQueue.Disabled` | `false` |
| HTTP test functions | stay `true` (disabled) |

Follow README deployment gate before turning on the timer.

---

## 7. GitHub → Azure CI (optional)

Flex Consumption uses **package deployment** only. Add a Flex-aware GitHub Actions workflow when you want push-to-deploy.

- [Continuous deployment (Flex)](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-how-to)
- CLI: `az functionapp deployment github-actions add --help`

Secrets stay in Azure app settings, not in the repo.

---

## 8. Sandbox environment (future)

Separate stack recommended: own RG, Function App, Cosmos, Service Bus, HubSpot sandbox/test portal — same code, different app settings. See `docs/sandbox_vs_production_mvp.md`.

---

## 9. Local git

- Uncommitted: `.gitignore`, `README.md` (as of last sync check)
- `main` matched `origin/main` at `fca4911` aside from local edits

---

## CLI vs MCP

Azure **CLI** is sufficient for subscription, app settings names, function list, and resource inventory on this project. Azure MCP/skills are optional for broader infra design or IaC — not required for day-to-day hook-up checks.
