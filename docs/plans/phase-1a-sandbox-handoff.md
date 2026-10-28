# Handoff — Phase 1A sandbox docs, Lucid, and open questions

**For a new thread.** Do not continue the webhook test in that thread. Do not enable production. Do not build the later add-on (latch, discovery pass, reconciliation pass, contact fan-out).

**Portal:** sandbox UnitedCare HubSpot `50850427` only. Production portal `50317927` is reference, not the build target.

**Prior thread:** [Sandbox webhook create test](39f3e772-91cf-4e2a-a17a-a4805fee6eb5)

## Do these four things

1. Update the docs so they match what sandbox actually does today.
2. Correct the Lucid diagram and confirm it matches the confirmed MVP, using sandbox IDs.
3. Write a short explanation of why this architecture was chosen.
4. Read the source-of-truth Google Doc and answer only the open questions that sandbox work has already settled. Leave Sara's unanswered business questions open.

## Confirmed architecture

Primary path: HubSpot workflow **Send a webhook** → `POST /api/hubspot-webhook` → signature v2 → Service Bus → existing client or employee sync.

Backup: the existing intake poller. It is still disabled. Turn it on only after an in-place update test passes, and only in sandbox.

Later add-on, only if that poller test shows a gap: discovery, reconciliation, a latch property, and contact fan-out. That design is sketched in `docs/plans/phase-1a-client-intake-trigger.md` under "Later add-on architecture." It is not what is built.

Webhook body is ID-only: `objectTypeId` and `recordId`. Azure GETs mapped values. No PHI in the webhook, the queue, or info logs.

Auth: sandbox legacy private app **CentralReach integration**, app ID `30920156`. The workflow sends the app ID. Azure checks `X-HubSpot-Signature` v2 with `HUBSPOT_WEBHOOK_CLIENT_SECRET`. API reads use `HUBSPOT_PRIVATE_APP_TOKEN`. The private-app Webhooks subscription tab stays empty. That feature is CRM event subscriptions (signature v1) and is not this MVP.

## Why this shape (source for the short write-up)

Write this in plain language for a non-developer HubSpot admin. Facts to use:

- Workflows are the fast path staff can turn on in sandbox and production. Both portals can already send the action. Confirmed Oct 25, 2026.
- The body carries only the object type and record id so mapped field values never sit in the webhook.
- Workflows do not catch every change. Clears, some calculated properties, and some association changes can be missed. The existing poller stays as the backup until a sandbox test shows what it still catches.
- One shared retrieve → map → CentralReach path serves both the webhook and the poller. A second sync implementation is unnecessary.
- Latch, discovery, reconciliation, and contact fan-out add objects, properties, and jobs before the simple path has been accepted. Build those only if the poller test shows a gap.

The chat titled "Help running the extract_associates.js script" (`02a5778e-56a7-4b40-ba62-05c83ca6a305`) is a different project. Do not use it as the architecture source. The decision lives in this handoff and in `docs/plans/phase-1a-client-intake-trigger.md`.

## Sandbox runtime (verified Oct 25, 2026, ~10:41 PM CT)

| Item | Value |
| --- | --- |
| Function app | `centralreachserverless` in resource group `centralreachintegration` |
| Webhook URL | `https://centralreachserverless-hffge8hxdxh6apd9.eastus2-01.azurewebsites.net/api/hubspot-webhook` |
| Portal | `50850427` |
| Case object | `0-3`, pipeline `851341465` |
| BT/RBT object | `2-55656309`, pipeline `851341475` |
| BCBA object | `2-55656302`, pipeline `876724575` |
| Queues in use | `client-sync-queue`, `employee-sync-queue` |
| `processClientQueue` / `processEmployeeQueue` | enabled |
| `intakePoller` | disabled |
| `ALLOW_EMPLOYEE_CREATE` | `true` |
| `PUT_ONLY_MODE` | `false` |
| Coalesce | 30 seconds per record |

`rtbt-sync-queue` and `bcba-sync-queue` exist and are unused. Employee sync uses the single `employee-sync-queue`.

Create test passed. Eight employees were created. Four Case deals completed the client queue without an error. The client log does not include the CentralReach contact id.

| Type | HubSpot record | CentralReach contact |
| --- | --- | --- |
| BCBA | 64796547330 | 5324518 |
| BCBA | 64796677955 | 5324516 |
| BCBA | 64793948015 | 5324519 |
| BCBA | 64795032860 | 5324517 |
| BT/RBT | 64797297759 | 5324520 |
| BT/RBT | 64793703949 | 5324521 |
| BT/RBT | 64795200610 | 5324523 |
| BT/RBT | 64794321966 | 5324522 |

Case deals that completed: `66718858241`, `66719211786`, `66718883435`, `66718832417`.

`client-sync-queue` still has one dead letter from an earlier fake deal id. It is not one of these records. `employee-sync-queue` was empty after the test.

Paused next test, not this thread: edit phone or city on BCBA `64796547330` and BT/RBT `64797297759`, then confirm Azure logs `operation: update` with the same CentralReach contact id. Do not use email. Employee update can keep the email already stored in CentralReach. Wait 30 seconds between edits of the same record. After that passes, the poller-together test is the following step.

## Lucid

Diagram: [HubSpot - Central Reach Integration](https://lucid.app/lucidchart/7781bde3-397a-46b4-bb12-d7a1be68d0cb/edit)

Document id: `7781bde3-397a-46b4-bb12-d7a1be68d0cb`

Read `lucid://skills/readme` before editing. Colors already in use: orange HubSpot, black Azure, blue CentralReach.

The chart was edited earlier in the prior thread to a latch-first numbered flow (`integration_cr_sync = Yes` as step 1). That is the later add-on, not the confirmed MVP. Correct it.

The diagram should show:

- Sandbox object ids above, not production ids `2-48354212` or `2-48354559`.
- Webhook body is `objectTypeId` plus `recordId` only.
- Signature check, then enqueue, then HTTP 202. Invalid signature is 401, and HubSpot does not retry that.
- Cases to `client-sync-queue`. BCBA and BT/RBT to `employee-sync-queue`.
- Queue workers GET HubSpot, map, upsert CentralReach, write back the contact id, link, and `last_sync_*` fields.
- The existing poller as a second initiator into the same queues. Label it disabled in sandbox until the update test passes.
- No "sensitive properties in the webhook?" branch. The body stays the record id. Production sensitive Case values are read on the deal GET (`crm.objects.deals.sensitive.read` on portal `50317927`). Portal `50850427` cannot store sensitive properties.
- No latch, discovery, or reconciliation boxes on the main path. A short note that those are a later add-on is enough.

## Docs that are stale

Update these to the sandbox facts above. Business rules stay in the Google Doc. When the Doc and the repo disagree, follow the Doc for business rules and say so.

| Doc | Drift |
| --- | --- |
| [Google Doc, tab Current Phase of build](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.8r9bl7mxhs2f) | Still says no implementation until authorized. Receiver is deployed in sandbox. |
| `docs/SOURCE-OF-TRUTH.md` | Still says Phase 1A is not implemented until authorized. |
| `docs/plans/phase-1a-client-intake-trigger.md` | Header still says the route stays dark until the webhook secret is set. Secret is set. Create test passed. Checklist still has the later add-on mixed in with the MVP. |
| `docs/hubspot-centralreach-field-mappings-current-state.md` | Trigger section should say the webhook is the sandbox primary path and the poller is off. |
| `docs/sandbox_vs_production_mvp.md` | Still says sandbox vs production is only hardcoded constants. Azure app settings on `centralreachserverless` are the sandbox values. |
| `docs/open-items.md` | Gitignored prod hook-up tracker. It still says secrets are missing, deploy is not done, and employee queues are off. Do not treat it as current. Update it only if the user wants that tracker touched. |
| `docs/plans/PARALLEL-COORDINATION.md` | Still lists separate `rtbt-sync-queue` and `bcba-sync-queue` as the prod queue shape, and says do not implement until context is added. |

Do not commit unless the user asks.

## Open questions to review

Source of truth: [CentralReach to HubSpot Integration V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?tab=t.8r9bl7mxhs2f). Start with section 3 (triggers), section 11 (change signals), and any open-gap notes. Answer only what the sandbox build or an existing decision already settles. Label anything still waiting on Sara.

Known open items in the phase plan. Re-check the Doc before closing any of them:

- Latch property name and stored values (`integration_cr_sync` was proposed). Not required for the MVP.
- Bootstrap of existing CentralReach clients whose gate was never checked.
- BT "Yes - Generic" versus "Yes - Active" on `entered_in_centralreach`.
- Reconciliation interval versus rate limits. Not required until the poller backup is tested.
- What happens when one Contact links to many Cases.

## Out of scope for the new thread

- The in-place update test and turning `intakePoller` on.
- Production workflows, production app settings, or production object ids.
- Phase 1B field-mapping expansions.
- New Azure resources.
