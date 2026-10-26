# HubSpot workflow webhook

`POST /api/hubspot-webhook` accepts an ID-only HubSpot workflow notification, checks the legacy private-app v2 signature, and enqueues the existing client or employee sync. The intake timer is not part of this route.

## Sub-features

- `webhook-missing-secret` returns HTTP 503 `MISSING_WEBHOOK_SECRET` when `HUBSPOT_WEBHOOK_CLIENT_SECRET` is unset or placeholder.
- `webhook-bad-signature` returns HTTP 401 `INVALID_SIGNATURE` when the secret is set and the v2 signature does not match.
- `webhook-accepted` returns HTTP 202 with `accepted: true` after a valid signature when Service Bus can take the message. Without Service Bus it returns HTTP 503 `MISSING_SERVICE_BUS` and does not claim success.

## How to get to it (user POV)

- HubSpot sandbox workflow sends `POST` to `/api/hubspot-webhook` with `objectTypeId` and `recordId` only.
- Local proof uses the verification host on port `17071`. The function auth level is anonymous. The signature is the gate.

## Driving it with verify-acr

Preconditions:

- `verify-acr.sh launch` completed for this run.
- `verify-acr.sh doctor` reports `doctor ok`.
- Timer and queue triggers remain disabled.

- **Missing secret.** With no `HUBSPOT_WEBHOOK_CLIENT_SECRET` in the host environment, run `VERIFY_ACR_PORT=17071 .cursor/skills/verify-azure-central-reach/scripts/verify-acr.sh curl POST hubspot-webhook -H "Content-Type: application/json" -d '{"objectTypeId":"0-3","recordId":"1"}'`. Status is `HTTP 503`. Body `error.code` is `MISSING_WEBHOOK_SECRET`.
- **Bad signature.** Launch the host with `HUBSPOT_WEBHOOK_CLIENT_SECRET` set to a non-placeholder test value and `HUBSPOT_WEBHOOK_URI` set to `http://127.0.0.1:17071/api/hubspot-webhook`. Repeat the POST above with header `X-HubSpot-Signature-Version: v2` and a wrong `X-HubSpot-Signature`. Status is `HTTP 401`. Body `error.code` is `INVALID_SIGNATURE`.
- **Valid signature, no bus.** Same host. Sign `clientSecret + POST + HUBSPOT_WEBHOOK_URI + raw body` with SHA-256 hex. Status is `HTTP 503` and `error.code` is `MISSING_SERVICE_BUS` when `SERVICE_BUS_CONNECTION_STRING` is missing. That proves the signature passed and no sync was claimed.
- **Proof.** Keep `curl-hubspot-webhook.status`, `.headers`, and `.body`. Body must not contain the client secret or mapped field values.

## Gotchas

- v2 hashes the exact public URI. If `HUBSPOT_WEBHOOK_URI` does not match the URL HubSpot calls, a real workflow gets 401 and HubSpot will not retry a 4xx.
- `authLevel` is `anonymous` on purpose. Do not add a function key to the workflow URL unless that full query string is also the URI used in the signature.
- A 202 from this route only means the id was enqueued. It does not mean CentralReach was updated. Queue processors stay disabled during this proof.
