# Client sync scaffold

Client sync scaffold is the dev-only HTTP route `client-sync-test`. Operators use it to confirm the scaffold wiring and `dealId` contract — not as the production sync path (`processClientQueue` → `runClientSyncWorkflow`).

## Sub-features

- `client-sync-requires-deal` rejects missing `dealId` with HTTP 400 and `ok: false`.
- `client-sync-unimplemented` may return HTTP 501 with a message that the workflow is not implemented yet while echoing `dealId` (current scaffold behavior).
- `client-sync-not-production` remains distinct from the Service Bus queue processor path.

## How to get to it (user POV)

- `POST` or `GET` `/api/client-sync-test` with `dealId` in query or JSON body (README Client Sync Testing Stages).
- Prefer queue-triggered sync for production-level local tests; this route is scaffold only.

## Driving it with verify-acr

Preconditions:

- Host launched by `verify-acr.sh` with doctor ok.
- Do not treat this route as proof that client sync to CentralReach works.

- **Missing dealId.** Run `VERIFY_ACR_PORT=17071 .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh curl POST client-sync-test -H "Content-Type: application/json" -d '{}'`. Status `HTTP 400`, body `ok: false`, message indicates `dealId` is required.
- **With dealId.** Run `… curl POST client-sync-test -H "Content-Type: application/json" -d '{"dealId":"VERIFY_DEAL"}'`. Status is either `HTTP 501` with `dealId` echoed (current scaffold) or a future success contract once implemented — assert the actual status/body in artifacts; do not invent 200 success.
- **Proof.** Keep curl artifact files. Explicitly record that production path was not exercised.

## Gotchas

- README forbids using `client-sync-test` as the primary sync path.
- When the scaffold is later wired to `runClientSyncWorkflow`, update this feature file and `/maintain-verification-skill` before claiming sync proof here.
- Queue processor proof belongs in a future feature file, not this one.
