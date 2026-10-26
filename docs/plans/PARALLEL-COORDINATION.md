# Parallel workstreams — coordination

Three agents may run **Phase 1A (client)**, **Phase 1A tail (employee + queues)**, and **Phase 1B (mappings)** at the same time.

## Shared rules

- **Do not push to `main` or Azure** unless the user explicitly asks in that thread.
- Sandbox Phase 1A is already running on portal `50850427`: workflow webhook primary, `intakePoller` disabled. Do not enable production. Do not build the later add-on (latch, discovery pass, reconciliation pass, contact fan-out).
- Run **`npm test`** before declaring done in any stream.
- Prefer **small, mergeable commits** per stream; avoid one mega-PR if possible.

## Merge order (recommended)

1. **Employee queue alignment** (or client trigger first if no queue file conflicts) — touches `serviceBusClient.mjs`, `config.mjs`, possibly new function file.
2. **Client intake trigger** — touches `hubspotClient.mjs`, `intakePollerWorkflow.mjs`; coordinate on `config.mjs` / `hubspot.mjs`.
3. **Field mappings v2** — mostly `src/mappings/**`; rebase if 1A changed property constants.

## Files likely touched by more than one stream

| File | Streams |
|------|---------|
| `src/lib/config.mjs` | All three |
| `src/constants/hubspot.mjs` | 1A client, 1B |
| `local.settings.example.json` | All three |
| `src/workflows/intakePollerWorkflow.mjs` | 1A client, 1A employee |
| `src/lib/hubspotClient.mjs` | 1A client, 1A employee |

**Convention:** Client agent owns deal search + `shouldSyncDeal` client rules. Employee agent owns BT/RBT/BCBA search + queue send + triggers. Mappings agent owns payload/metadata builders only unless a property name must be added to search `properties` arrays — then add a one-line note in PR for intake agents.

## References

- Client behavior spec (Google Drive): [CentralReach to HubSpot Integration V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit) — [`docs/SOURCE-OF-TRUTH.md`](../SOURCE-OF-TRUTH.md)
- Current mapping doc: `docs/hubspot-centralreach-field-mappings-current-state.md`
- Prod hook-up: `docs/open-items.md`
- Env vars: `README.md` → Configuration Notes, `src/lib/config.mjs`

## Sandbox runtime (Oct 25, 2026)

This Function App is the sandbox runtime, not a production cutover.

- Function app: `centralreachserverless`, resource group `centralreachintegration`
- Portal: `50850427`. Production portal `50317927` is not the build target.
- Queues in use: `client-sync-queue`, `employee-sync-queue`
- `rtbt-sync-queue` and `bcba-sync-queue` exist and are unused. Employee sync uses the single `employee-sync-queue`.
- `processClientQueue` and `processEmployeeQueue` are enabled
- `intakePoller` is disabled until the in-place update test passes
