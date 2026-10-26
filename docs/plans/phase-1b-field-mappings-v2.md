# Phase 1B — Field mappings v2

**Status:** STANDBY — wait for user context in this agent thread before coding.

**Repo:** `/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`

---

## Goal

Implement **United Care V1 in-state field map v2** in code: HubSpot internal property names, enumeration **internal values** (not labels), associations, and CR field targets per client handoff.

**Source of truth (business spec):** [Google Drive — CentralReach to HubSpot Integration V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit) (see [`docs/SOURCE-OF-TRUTH.md`](../SOURCE-OF-TRUTH.md))  
**Implementation tracker / current code state:** `docs/hubspot-centralreach-field-mappings-current-state.md`

---

## Current architecture (as-is)

| Direction | Entry | Mapping |
|-----------|--------|---------|
| HS → CR client body | `clientSyncWorkflow.mjs` | `buildClientPayload.mjs`, `validateClientPayload.mjs` |
| HS → CR client metadata | same workflow | `buildClientMetadata.mjs` |
| HS → CR employee | `employeeSyncWorkflow.mjs` | `buildEmployeePayload.mjs`, `validateEmployeePayload.mjs` |
| CR → HS writeback | workflows + `hubspotClient.mjs` | e.g. `HUBSPOT_CR_CONTACT_ID_PROPERTY`, portal link fields |

Constants: `src/constants/hubspot.mjs`, `src/constants/centralReach.mjs`.

---

## Out of scope (unless user expands)

- Hybrid change detection, webhooks, latch, reconciliation (Phase 1A — `phase-1a-client-intake-trigger.md`)
- Service Bus queue split (Phase 1A employee)
- Azure deploy
- HubSpot property **creation** in portal (flag red/amber rows; implement only **ready** rows user confirms)

---

## Design decisions (user must confirm)

- [ ] **Row scope:** Which sections to implement first (§3 client CR fields, §4 associations, employee objects)?
- [ ] **Amber/red rows:** Explicit list of deferred properties vs build now.
- [ ] **Sensitive tier:** Private app already has `crm.objects.deals.sensitive.read` — confirm before reading `phi_*`.
- [ ] **Writable-only:** Skip calculated/synced fields per guide §2.4.
- [ ] **Associations:** Use v4 associations API — which labels/IDs (76, 82, 86, 143, 145, etc.)?
- [ ] **Supervising BCBA / grad permit:** Sara rules in guide §3 — string match vs association logic.
- [ ] **Writeback set:** Which HubSpot properties PATCH may touch (guide §2.11 — protect list for client)?

---

## Implementation checklist (when authorized)

### Client HS → CR

- [ ] Update `buildClientPayload.mjs` for each confirmed row (types, dates UTC midnight, option values).
- [ ] Guardian / contact association reads in workflow or mapping layer.
- [ ] `buildClientMetadata.mjs` — portal URLs (`HUBSPOT_PORTAL_ID` / test vars), CR dashboard labels if in scope.
- [ ] `validateClientPayload.mjs` — required fields for create vs update.

### Employee HS → CR

- [ ] `buildEmployeePayload.mjs` — BT/RBT vs BCBA branches, CO/NY labels if in scope.
- [ ] `validateEmployeePayload.mjs`

### CR → HS

- [ ] `client_id_number` / CR ID writeback paths.
- [ ] Employee ID property (`HUBSPOT_EMPLOYEE_ID_PROPERTY`).

### Constants & tests

- [ ] Centralize internal enum values in `hubspot.mjs` / `centralReach.mjs`.
- [ ] Extend smoke tests: `clientPayloadMapping`, `clientMetadataMapping`, `employeePayloadMapping`, workflow tests with fixtures from guide appendix.

### Docs

- [ ] Update `hubspot-centralreach-field-mappings-current-state.md` status columns as rows are implemented.

---

## Acceptance criteria

- [ ] `npm test` passes; new tests cover each implemented mapping row (or grouped scenarios).
- [ ] No writes to read-only HubSpot properties in mapping code paths.
- [ ] Enumeration values sent as **internal** values (document any label/value pairs in constants).
- [ ] No PHI in logs; payloads follow existing safe logging.
- [ ] List of **new HubSpot properties read** for intake agents if search `properties` arrays must grow.

---

## Primary files

- `src/mappings/client/buildClientPayload.mjs`
- `src/mappings/client/buildClientMetadata.mjs`
- `src/mappings/client/validateClientPayload.mjs`
- `src/mappings/employees/buildEmployeePayload.mjs`
- `src/mappings/employees/validateEmployeePayload.mjs`
- `src/workflows/clientSyncWorkflow.mjs`
- `src/workflows/employeeSyncWorkflow.mjs`
- `src/lib/hubspotClient.mjs` (association fetches if added)
- `src/constants/hubspot.mjs`, `src/constants/centralReach.mjs`
- `src/tests/smoke/*Mapping*.test.mjs`, `*SyncWorkflow.test.mjs`

---

## Agent instructions

1. Read the [Google Drive integration spec V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit) and `docs/hubspot-centralreach-field-mappings-current-state.md` (see `docs/SOURCE-OF-TRUTH.md`).
2. **Stop** until user provides scope (sections, amber decisions, sample record IDs optional).
3. When authorized: implement in small commits by section, run tests, update mapping doc.
