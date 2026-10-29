# Confirmed — Phase 1A MVP — Workflow webhook plus poller backup (HubSpot → Azure → CentralReach)

**Status:** **Sandbox receiver is live. Oct 25, 2026.** Portal `50850427` only. The workflow webhook is the primary path. `HUBSPOT_WEBHOOK_CLIENT_SECRET` is set. The create test passed the same night. The existing poller is the backup and uses the same queues. The timer is **disabled on the app today**. Sandbox end-to-end (Oct 28) turns it on after the webhook path is healthy and proves a poller-only sync. Leaving it off does not finish the architecture. Production portal `50317927` is not enabled. Latch, discovery, reconciliation, and contact fan-out are a later add-on, not this build.

**Purpose:** Record the sandbox MVP that is running, and keep the later add-on separate. Business rules stay in the Google Doc. When that Doc and this file disagree on a business rule, follow the Doc.

**Repo:** `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`  
**References:**

- Business rules. Google Drive integration spec V2, section 3 (triggers) and section 11 (change signals). Open the spec from [`docs/SOURCE-OF-TRUTH.md`](../SOURCE-OF-TRUTH.md).
- HubSpot engineering proposal: *For Grok review: proposed hybrid change detection* (Oct 2026) — **event-driven refresh + scheduled reconciliation**, not webhook-only
- Current runtime (legacy): `docs/hubspot-centralreach-field-mappings-current-state.md` — timer poller + `dealstage` allowlist

---

## Confirmed MVP (simple)

### Decision summary

| Layer | Role |
| --- | --- |
| **HubSpot workflow webhook (primary)** | ID-only notification: object type + record id. Azure GETs the mapped values. Both sandbox `50850427` and production `50317927` can send this action. |
| **Existing Azure timer (backup)** | Keep the current poller. Slow it down only after webhook testing shows what it still catches (relationship and calculated-value changes). Do not redesign it in this MVP. |
| **Existing sync logic** | One shared retrieve → map → CentralReach path for both initiators. |

The webhook body is a notification, not the mapped field values. Webhook-triggered reads still count as API calls. Coalesce repeat notifications for the same record (30 seconds in sandbox), then measure usage before lengthening the poller interval.

Auth is the **legacy private app** already used in each portal. Sandbox app: **CentralReach integration**, app ID `30920156`. The workflow sends that app ID. Azure checks `X-HubSpot-Signature` v2 with `HUBSPOT_WEBHOOK_CLIENT_SECRET`. API reads use `HUBSPOT_PRIVATE_APP_TOKEN`. The private-app Webhooks subscription tab stays empty. That tab is CRM event subscriptions (signature v1) and is not this MVP. See [`docs/sandbox_vs_production_mvp.md`](../sandbox_vs_production_mvp.md) for which IDs belong to which portal.

### Sandbox runtime (verified Oct 25, 2026)

| Item | Value |
| --- | --- |
| Function app | `centralreachserverless` in `centralreachintegration` |
| Webhook | `POST /api/hubspot-webhook` |
| Portal | `50850427` |
| Case | `0-3`, pipeline `851341465` |
| BT/RBT | `2-55656309`, pipeline `851341475` |
| BCBA | `2-55656302`, pipeline `876724575` |
| Queues in use | `client-sync-queue`, `employee-sync-queue` |
| Unused queues | `rtbt-sync-queue`, `bcba-sync-queue` |
| Queue workers | enabled |
| `intakePoller` | disabled on the app as of Oct 25. Sandbox end-to-end enables it and proves a poller-only sync. |
| `ALLOW_EMPLOYEE_CREATE` | `true` |
| `PUT_ONLY_MODE` | `false` |

Create test passed. Eight employees were created in CentralReach. Four Case deals completed the client queue without an error. The client log does not include the CentralReach contact id. The next test, not started, is an in-place phone or city edit on one BCBA and one BT/RBT. Do not use email for that edit. After it passes, the poller-together test is the following step. Production stays off.

### Why this architecture

Written for a HubSpot admin.

Staff can turn a workflow on in the sandbox portal and in the production portal. Both portals can already send the webhook action. That is the fast path. Confirmed October 25, 2026.

The webhook carries only the object type and the record id. Mapped field values stay in HubSpot. Azure reads them after the signal, so those values are not sitting in the webhook, the queue, or the info logs.

A workflow does not see every change. Clears, some calculated properties, and some association changes can be missed. The existing poller is the backup and must function in sandbox end-to-end. It is off on the app until the webhook path for that build is healthy. Then turn it on in sandbox and prove a poller-only change still syncs through the same queues. Do not redesign it before that. Do not close the phase with the timer still off.

The webhook and the poller both use the same retrieve, map, and CentralReach update. A second sync process is unnecessary.

A latch property, a discovery job, a reconciliation job, and contact fan-out would add objects, properties, and jobs before this simple path has been accepted. Build those only if the poller test shows a gap.

**Later add-on, only if testing shows a gap:** repurpose the timer into a discovery pass plus a reconciliation pass, add a HubSpot latch property, and fan Contact edits out to linked Cases. That design is sketched under Later add-on architecture below. It is not this build.

---

## Business rules (unchanged)

- **Initial gate:** No pipeline/stage restriction for eligibility. Case: `enter_in_central_reach` **includes** internal `Yes` (multi-checkbox — test membership). BCBA/BT: `entered_in_centralreach` = `Yes` (BT label “Yes - Active”).
- **One-way latch:** After first successful enrollment, keep syncing even if the gate is cleared or the record becomes Paused/Discharged/Inactive. **Do not** stop sync because `case_status` is Cold or stage moved.
- **Ongoing sync:** Every mapped change must reach CentralReach, including **clears**, inactivation, and relationship changes.
- **Dependencies:** Contact (guardian, BCBA personal email), association role labels, derived labels — not only direct edits on the parent object.
- **PHI:** Never in webhook body, queue body, or info logs. Azure GETs the allowlisted properties. On production portal `50317927`, the Case fields in Integration V2 API rule #2 need `crm.objects.deals.sensitive.read` or HubSpot omits them. The list is commented on `REQUIRED_DEAL_PROPERTIES`. Portal `50850427` cannot store sensitive properties.

---

## Later add-on architecture (not the MVP build)

```text
HubSpot (4 objects: Case, BCBA, BT/RBT, Contact)
  ├─ Workflows → POST /api/hubspot-webhook (signed, ID-only) → 202 → Service Bus
  └─ (Optional later) App subscription events → same internal refresh envelope

Azure timer (repurposed intakePoller schedule or split timers)
  ├─ Discovery pass: gate Yes AND NOT latched → enqueue refresh + set latch on success
  └─ Reconciliation pass: latched records → enqueue refresh (fingerprint skips CR write if unchanged)

Service Bus → processClientQueue / processEmployeeQueue → sync workflows → CentralReach
Cosmos: eligibility/latch, dirty generation, last-success fingerprint (no TTL on latch/fingerprint)
```

### HubSpot-side latch (source of truth for “keep syncing”)

Use a durable HubSpot flag (proposed name `integration_cr_sync`, boolean/checkbox — confirm stored values with Optidge before workflows filter on it):

- Set **Yes/true** after first successful sync (workflow or Azure writeback — pick one writer; Azure writeback is simplest).
- Workflows for **ongoing** mapped changes enroll/filter on **latched** records, not on gate still = Yes.
- Discovery job still finds **gate Yes + not latched** for first-time enrollment.

### Internal refresh message contract (all initiators)

Minimal payload (no mapped values):

- `objectTypeId` (or logical type: deal / bcba / btrbt / contact)
- `recordId`
- `operation`: `refresh` | `refresh_linked_entities` (Contact changes fan out to linked eligible Cases/BCBAs)
- `source`: `hubspotWorkflow` | `discovery` | `reconciliation`
- `requestedAt` (ISO)

Queue idempotency: **dirty generation** per record in Cosmos, not `{id}:{hsLastModifiedDate}` alone.

---

## What changes vs today’s code

The sandbox MVP that is running is the webhook receiver plus the existing retrieve → map → CentralReach path. Rows below that mention discovery, reconciliation, a latch, or a fingerprint are the later add-on. They are not built.

| Today | Phase 1A target |
| --- | --- |
| `searchIntakeCompleteDeals`: pipeline + `dealstage IN allowlist` | Remove stage/pipeline as **eligibility**; optional keep for unrelated reporting only |
| `shouldSyncDeal`: `hs_lastmodifieddate` vs `integration_last_write` | Reconciliation uses **full snapshot fingerprint**; integration_last_write is monitoring only, not completeness |
| Webhook receiver is live in sandbox | Keep signature v2 and the ID-only body. CRM webhook subscriptions stay unused. |
| `processClientQueue` accepts `hubspotWorkflow` | Discovery and reconciliation sources are the later add-on |
| Cosmos dedupe TTL on all keys | Infinite TTL for latch + fingerprint keys; separate coalescing/generation |
| Client create without CR lookup by HubSpot ID | Match employee pattern: lookup before create to avoid duplicates on retry |

Employee intake in the same poller should follow the same hybrid pattern (`entered_in_centralreach`), aligned with `phase-1a-employee-intake-queues.md`.

---

## HubSpot deliverables (Optidge / Breeze)

1. **Sandbox webhook URL and client secret are set.** A workflow "Send a webhook" action signs with v2 (`X-HubSpot-Signature` and `X-HubSpot-Signature-Version: v2`). The hash is SHA-256 of `client secret + http method + request URI + body`. v3 (`X-HubSpot-Signature-v3`) is a different header and is not what this action sends. Source: HubSpot legacy doc [Validating Requests](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests), fetched Oct 25, 2026. API reads keep using the private-app access token (`Authorization: Bearer`), per [Legacy private apps](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview). Production uses a different private app and is not configured on this Function App.
2. **Sandbox workflows sent the create-test webhooks** for Case, BCBA, and BT/RBT, with an ID-only body. Contact fan-out is the later add-on. Known gaps remain: clears, some calculated properties, and some association changes.
3. **Latch property** (`integration_cr_sync` was only a proposal) is the later add-on. It is not a sandbox deliverable.
4. **Create test passed** on Oct 25, 2026. The in-place update test has not been run.

---

## Azure checklist

### MVP, sandbox, Oct 25, 2026

- [x] `src/functions/hubspotWebhook.mjs` — validate signature v2, coalesce 30 seconds, enqueue, return 202. Invalid signature is 401, and HubSpot does not retry that.
- [x] `processClientQueue.mjs` accepts source `hubspotWorkflow` (the employee queue already stores source and does not allowlist it)
- [x] Webhook secret env: `HUBSPOT_WEBHOOK_CLIENT_SECRET`, `HUBSPOT_WEBHOOK_URI`, `HUBSPOT_WEBHOOK_COALESCE_SECONDS`
- [x] Queues in use are `client-sync-queue` and `employee-sync-queue`. `processClientQueue` and `processEmployeeQueue` are enabled. `intakePoller` is disabled.
- [x] Create test passed. Eight employees were created. Four Case deals completed the client queue.
- [x] `docs/hubspot-centralreach-field-mappings-current-state.md` trigger section matches this runtime
- [ ] In-place update test: edit phone or city on BCBA `64796547330` and BT/RBT `64797297759`, then confirm Azure logs `operation: update` with the same CentralReach contact id. Do not use email. Wait 30 seconds between edits of the same record.
- [ ] Turn `intakePoller` on in sandbox only after that update test passes, then run the webhook and the poller together

### Later add-on, not this build

- [ ] Shared enqueue helper: refresh message + dirty generation bump
- [ ] Refactor `intakePollerWorkflow.mjs` into discovery + reconciliation
- [ ] HubSpot search for gate-not-latched discovery, and latched-record pagination for reconciliation
- [ ] Cosmos state for latch, generation, and fingerprint
- [ ] `clientSyncWorkflow.mjs` fingerprint, including metadata, labels, and association IDs
- [ ] Client upsert: resolve an existing CentralReach client by HubSpot external ID before create
- [ ] Contact fan-out
- [ ] Stop using `HS_STAGE_ALLOWLIST_JSON` as the client eligibility gate
- [ ] Constants for a latch property name, after Optidge confirms the stored values

---

## Out of scope (Phase 1A)

- Phase 1B field mapping expansions (`phase-1b-field-mappings-v2.md`)
- Production workflows, production app settings, or production object ids
- Building the later add-on before the sandbox poller test shows a gap

---

## Open confirmations (business / portal)

Settled by the sandbox build or by the Oct 25 decision. Not waiting on Sara:

- [x] Workflow “Send a webhook” works in sandbox portal `50850427` and production portal `50317927`. Confirmed by Optidge on Oct 25, 2026.
- [x] The MVP does not use a latch property. `integration_cr_sync` is only a proposed name for the later add-on. Stored values are not chosen, and they do not block this path.
- [x] A reconciliation interval is not part of this build. Choose it only after the poller backup is tested in sandbox.
- [x] Contact fan-out is not part of this build. The rule for one Contact linked to many Cases is not chosen.

Still open. Waiting on Sara, from the Google Doc section 11 and section 10:

- [ ] Bootstrap: existing CentralReach clients whose gate was never checked. The Doc asks whether to backfill the box or to treat a stored CentralReach client id as passing the gate.
- [ ] BT/RBT `entered_in_centralreach`. The label “Yes - Active” stores `Yes`. “Yes - Generic” and “No - Made Inactive” are still with Sara.

Other United Care questions in the Doc (which guardian when a Case has two, funding-source labels, uncovered stages, comorbid diagnosis, New Mexico and Virginia labels) are unchanged.

---

## Agent instructions

1. The sandbox receiver on portal `50850427` is deployed. Do not enable production. Do not turn `intakePoller` on. Do not build the later add-on unless the poller test shows a gap.
2. Use this file for the confirmed MVP (webhook primary, existing poller as backup). Business rules stay in the spec named by [`docs/SOURCE-OF-TRUTH.md`](../SOURCE-OF-TRUTH.md). Portal IDs stay in [`docs/sandbox_vs_production_mvp.md`](../sandbox_vs_production_mvp.md).
3. The ID-only webhook receiver is already the sandbox path. Leave the poller in place and disabled until the in-place update test passes.
4. When a sentence depends on HubSpot or Azure product behavior, look it up with the HubSpot CLI docs tools or the Azure CLI before writing it. Do not copy those facts from memory.  
  






## Docs checked (Oct 25, 2026)

HubSpot CLI `fetch-doc` on the legacy guide [Validating Requests](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests) and [Legacy private apps](https://developers.hubspot.com/docs/apps/legacy-apps/private-apps/overview). Workflow webhook actions use signature v2 and the private app client secret. Private-app CRM webhook subscriptions are a separate feature (signature v1) and are not this MVP. v3 uses `X-HubSpot-Signature-v3` plus a timestamp.

HubSpot knowledge base, [Trigger webhooks in HubSpot contact-based workflows](https://knowledge.hubspot.com/workflows/how-do-i-use-webhooks-with-hubspot-workflows), updated October 20, 2026. The Send a webhook action requires Data Hub Professional or Enterprise. The URL must be HTTPS. Customize the request body to send only the object type and the record id. Include all properties would put mapped values in the webhook body, which this plan forbids. HubSpot retries failures for up to three days. It does not retry 4xx responses, except 429.

The developer page [API usage guidelines and limits](https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines) still says Marketing Enterprise and contact records, and says workflow webhook calls do not count toward the API rate limit. That page and the knowledge base do not match. Confirm the subscription and the object types in the portal before build.

Azure CLI 2.85.0, `az functionapp --help`. That command group manages the Function App. It does not describe HTTP triggers or timer triggers. `az find` did not return examples. Name resolution failed for `app.aladdin.microsoft.com`.

  
