# Review brief for Grok — UnitedCare HubSpot → Azure → CentralReach

Read-only review. Report findings back in chat. Do not change anything.

## Context

Azure Functions integration (Node, ESM) for United Care ABA. HubSpot workflows send signed, ID-only webhooks. The Function App puts each ID on a Service Bus queue. Queue workers read the HubSpot record, check eligibility, map fields, and write to Central Reach (CR). A timer poller and a linked-record recheck add records to the same queues. Cosmos DB holds sync state and locks.

- Repo: `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`
- HubSpot sandbox portal: `52311591` (active). Production portal: `50317927`. `50850427` is retired. Do not use `246184070`.
- Central Reach has **no sandbox**. Any CR write is a production write.
- Business rules source: Google Doc `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`. The requirement tables are Business rules, `[GER-CASE]`, `[GER-BCBA]`, `[GER-BT]`, `[GER-CONTACT]` and sections G03–G09. When the code and the guide disagree, the guide wins.

## Branch: confirm before reviewing

Review branch **`architecture-update`**.
- Its latest commit adds only `docs/workstreams/architecture-update/`.
- The code is identical to commit `55e0091` ("Add the Yes eligibility gate and drop the poller stage allowlists.").
- The main tracker is [ARCHITECTURE-REVIEW.md](ARCHITECTURE-REVIEW.md). You are role A there.

Run these before you read any code:

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git branch --show-current                     # architecture-update
git log --oneline -2                          # docs commit, then 55e0091
git diff --stat 55e0091 HEAD -- src host.json package.json   # must print nothing
git status -sb
```

If the branch is wrong, the code differs from `55e0091`, or the tree has changes you did not expect, stop and report. Do not checkout, fetch, pull, stash, commit or push.

## Hard stops

- Do not deploy, restart, stop or reconfigure Function App `centralreachserverless` or any other Azure resource.
- Do not send, receive, peek at, complete, settle or replay Service Bus messages. Report counts only.
- Do not print secret values: keys, connection strings, tokens, or values from `local.settings.json` and app settings. Setting **names** and non-secret flags are fine.
- Do not run the app, `func start`, test scripts that call live APIs, or anything that writes to HubSpot or Central Reach.
- Do not edit code, docs, config or `STATE.md`.

## Part 1 — Code checks (commit `55e0091`)

Answer these from the code first, before reading Part 3.

1. **Eligibility gate.** Can any path reach a Central Reach write without passing `src/lib/syncEligibility.mjs`? Check the webhook, the poller, the linked recheck, the HTTP test functions in `src/functions/`, and the queue handlers.
2. **Duplicate creates.** Can any path create a second CR client or employee for the same HubSpot record? Consider retries, Service Bus redelivery, a create that returns no id, a failure right after create, and a missing or expired Cosmos state.
3. **Mappings against the guide.** Do `src/mappings/client/*` and `src/mappings/employees/*`, and the property lists in both workers, match every row in `[GER-CASE]`, `[GER-BCBA]` and `[GER-BT]`? List each mismatch with file and line.
4. **Lost changes.** Can a HubSpot change be silently dropped? Consider a blank value that should clear a CR field, a failure after a partial write, a poller outage longer than the lookback, a stale-source result, and lock contention.

## Part 2 — Azure checks (read-only, through the Azure MCP)

Resources: Function App `centralreachserverless`, App Service plan `ASP-centralreachintegration-86fd`, Service Bus namespace `ucr-hs-cr-sb-prod`, Cosmos account `ucr-hs-cr-cosmos-prod`, storage `centralreachintegrab751`, Application Insights `centralreachserverless`, and the Log Analytics workspace `DefaultWorkspace-63ef719f-0711-449d-82e8-f083dca08418-EUS2`.

Report:

1. **Function App:**
   - running state;
   - the deployed package or commit, if Azure records one;
   - `AzureWebJobs.intakePoller.Disabled` and the other function-disabled flags;
   - the app setting **names**;
   - the non-secret values of `HUBSPOT_PORTAL_ID`, `ALLOW_EMPLOYEE_CREATE`, `PUT_ONLY_MODE`, `INCLUDE_TEST_RECORDS`, `LOOKBACK_MINUTES`, `LINKED_RECHECK_ENABLED` and the `MAX_*_PER_RUN` settings;
   - the function timeout;
   - managed identity: on or off.
2. **Plan:** SKU, instance count and scale-out settings.
3. **Service Bus, for each queue:**
   - name;
   - `maxDeliveryCount`;
   - `lockDuration`;
   - default message TTL;
   - duplicate detection on or off, and its window;
   - dead-lettering on expiry;
   - active and dead-letter message **counts**.
4. **Cosmos:** database and container names, partition key path, default TTL, consistency level.
5. **Monitoring:**
   - whether App Insights is linked to the Log Analytics workspace;
   - retention;
   - sampling settings;
   - any alert rules, and what they watch.
6. **Mismatches:** any place where deployed settings disagree with `local.settings.example.json` or `src/lib/config.mjs` at `55e0091`. In particular, report whether the deployed `HUBSPOT_PORTAL_ID` is still `50850427`.

## Part 3 — Claims to verify (from an earlier review)

Confirm or refute each claim, with file and line:

1. Create calls (`POST /contacts/client` and `POST /contacts/employee`) go through `withRetry`, so a 429 or 5xx can repeat a create. `suppressRetry` is never passed.
2. `buildEmployeePayloadForContactId` copies Central Reach's stored `primaryEmail` and `externalSystemId` over the HubSpot values on every linked employee update.
3. A failed run's Cosmos write (`STATE_TYPES.FAIL`) drops the stored `fieldHashes`, so a pending metadata clear is lost on the next run.
4. If Cosmos is unavailable, `claimRecordLock` returns `true` and the worker runs without a lock.
5. An employee create saves no CR id to Cosmos before the metadata write. If metadata then fails, the HubSpot error writeback omits `employee_id`.
6. Labels are only added (`POST /contacts/{id}/labels`) and never removed. A CO BT receives the `RBT_CO` label.
7. `retryDelayMs` reads `Retry-After` only as seconds (not HTTP-date) and caps the wait at 5 seconds.

## Report format

- Part 1: one short answer per question, with file and line.
- Part 2: a table per resource. Write "not visible" for anything the MCP can't read.
- Part 3: Confirmed / Refuted / Partly, with one line of evidence each.
- A list of anything else that could create duplicates, lose changes, or write production CR unexpectedly.
- A final line saying whether anything was changed. The answer should be "nothing".
