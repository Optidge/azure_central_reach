# Feedback review: CR API access, Referral Source (C36), sensitive scopes (2026-11-23)

Review of Zeke's feedback on `DECISIONS-EVIDENCE-CASES-2026-11-23.md` and `DECISIONS-EVIDENCE-EMPLOYEES-2026-11-23.md`. Read ~19:35 UTC. Nothing was written to HubSpot, CentralReach, Azure or `src/`.

**What was read.**

- CentralReach production: GET only (the one POST is the token request). HubSpot production `50317927`: GET and CRM search only, portal checked first.
- Scripts (session scratchpad, read-only, reusable):
  - `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/feedback-referral-access-read.mjs` (visibility baseline + Referral Source)
  - `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/feedback-referral-access-read-2.mjs` and `-3.mjs` (token claims, "Other" follow-up)
- CentralReach public API page: https://centralreach.com/resources/api/ (Getting Started, Glossary, Response Codes).
- Client values are reported as counts and option names. Free text that is not a HubSpot option is reported as a shape or a word count only.

## Summary

1. **CR access.** The API credentials act as one CR user (an "API user"). CR's own error table says a 404 on a contact means the API user is not **connected** to it. Module permissions are not the cause: those give 403. Danny needs to connect the API user to every client and employee, and keep new contacts connected.
2. **Referral Source.** The main difference is not "Bassy-Americare". It is HubSpot **"Other"** against CR "Americare" (30 of the 32 differences). On 23 of those, the Contact's free-text "Referral - Other" says "Americare". The code should send that text when the option is Other.
3. **Sensitive scopes.** The Function and the review script read two different settings. Names cannot prove they are the same app, and three results suggest the review token is not the app Danny described. Step 9.6 should check the token's app and scopes first, then read one Case.

---

## Item 1: CR API visibility

### (a) Is the API key tied to a CR user? Which one?

**Yes: the token denotes one user in one organization. Which CR contact that is cannot be read through the API.**

| Evidence | Source | Status |
|---|---|---|
| The token request is OAuth `client_credentials` with `CR_CLIENT_ID` + `CR_CLIENT_SECRET`, scope `cr-api`, to `CR_TOKEN_URL`. Every call sends `Authorization: Bearer <token>` plus `x-api-key` (`CR_API_KEY`). | `src/lib/centralReachClient.mjs:85-90`, `:311-320` | Confirmed |
| The access token's claim names are `iss, nbf, iat, exp, scope, client_id, sub, userid, orgid, jti`. `sub` equals `userid`. | Token read 2026-11-23 (claim names only) | Confirmed |
| "In CentralReach, an access token denotes a specific user and organization combination through claims." `sub` is "a unique user identifier"; `orgid` is the organization. | CR API page, Glossary | Confirmed (CR docs) |
| "API users undergo authentication via our Single Sign-On (SSO) platform." | CR API page, Security | Confirmed (CR docs) |
| The API key is "issued per Organization"; the client ID and secret are a credential pair issued by the CR Implementations Team. | CR API page, Glossary | Confirmed (CR docs) |
| `userid` is a GUID (`2cc3e636-ea57-4694-aeea-65cfd8193106`), an SSO identity, not a CR contact ID. It is an identifier, not a credential. | Token read | Confirmed |
| The API user is a separate service user, not Danny's own login. | — | **Inferred.** The permission page Zeke pasted is for the user "Danny Gavin"; it does not show whether the API credentials belong to that user. |

So the permissions that matter are the **API user's**, not necessarily Danny's. Danny (or CR support, given the `userid` GUID or the client ID) can name the user. The likely place is Integration Center → Public API Dashboard (**inferred** from the permission name; not seen).

### (b) Does visibility depend on connections, not module permissions?

**Yes, on the evidence.**

| Evidence | Status |
|---|---|
| CR's Response Codes table: **404** "Not Found, Unable to find contact to update" → action "**Make sure the API User is connected to the requested contactID**, check contact ID". | Confirmed (CR docs) |
| Same table: **403** "Insufficient permissions to view or update contact" → "Review the permissions of the API User for that particular endpoint". | Confirmed (CR docs) |
| We get **404**, never 403: `GET /contacts/employee/4871945` 404, `GET /contacts/4871945/labels` 404, `GET /contacts/client/4717582` 404. The control `GET /contacts/employee/5237928` answers 200. | Confirmed (re-read 2026-11-23) |
| The lists return only what the user can see: 199 clients (164 active), 910 employees (255 active). | Confirmed |
| Danny's permission wording, "View other **in-network** employees" and "exports all available user info **in network**", matches a connection model. | Supports; the term is not defined in the public docs |
| A contact the integration creates is visible to it (the 36 "Azure Test" clients are in the list). | Confirmed. That this is because the creator is connected automatically is **inferred**. |

Module permissions (170 of 181) decide *what the user may do*. Connections decide *which contacts it may do it to*. Granting more modules would not change the 404s.

### (c) What Danny should change

1. **Identify the API user** behind the integration's client ID (Integration Center → Public API Dashboard, or ask CR support). *Inferred location.*
2. **Connect that user to every client**, active and inactive: Utilities → **Connect Employees & Clients**. *Danny holds this permission; the exact screen steps are inferred.*
3. **Connect that user to every employee**, active and inactive: Utilities → **Bulk-Connect Employees & Employees**. *Same.*
4. **Keep it connected.** A client or employee that staff create after the bulk connect would be invisible again, and the integration would then create a duplicate. Ask CR whether the API user can have organization-wide access, or an automatic connection for new contacts. *Whether CR has such a setting is unknown; it is the one question for CR support.*
5. If the API user turns out to be a limited user, confirm it also holds Contacts → View Employees ("View other in-network employees") and View Client Profile. *Only relevant if a 403 appears after the connect.*

Not recommended as the fix: adding Case Manager, Human Resources or Billing modules. Nothing the integration calls has answered 403.

### (d) Read-only test after the change

Run (GET only):

```
NODE_USE_ENV_PROXY=1 node /private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/feedback-referral-access-read.mjs
```

| Check | Today (baseline) | Pass after the change |
|---|---|---|
| `GET /contacts/employee/4871945` (BCBA) | 404 | 200 |
| `GET /contacts/4871945/labels` | 404 | 200 |
| `GET /contacts/client/4717582` (CO sample Case's Client ID) | 404 | 200 |
| `GET /contacts/employee/5237928` (control) | 200 | 200 |
| `GET /contacts/clients?take=5000` | 199 (164 active) | Equals the client count on Danny's CR Contacts screen |
| `GET /contacts/employees?take=10000` | 910 (255 active) | Equals the employee count on Danny's CR Contacts screen |

Then re-run `employee-recount.mjs`: "not visible" should fall from 102 BCBAs and 9 BT/RBTs to about 0. And re-test the 9.5 sample: "81 of 100 Client IDs do not resolve" (R-17) should mostly resolve; any that still 404 are wrong IDs.

Note the take limits: if a list comes back at exactly 5,000 or 10,000, page it (`Offset` is a 1-based page number).

### Draft message to Danny

> Hi Danny, thanks for the permission page. The module permissions look fine; the gap is somewhere else.
>
> The integration's API user can only see 199 clients and 910 employees. For example, employee 4871945 and client 4717582 return "404 not found" through the API, though both exist in CentralReach. CentralReach's API documentation says a 404 means "make sure the API User is connected to the requested contact ID" (a permission problem would be a 403, and we never get one). So the API user needs a connection to each contact, not more module permissions.
>
> Could you:
> 1. Confirm which CentralReach user the API credentials belong to (Integration Center → Public API Dashboard should show it). Is it your user or a separate API user?
> 2. Connect that user to all clients and all employees, active and inactive (Utilities → Connect Employees & Clients, and Bulk-Connect Employees & Employees).
> 3. Tell us how new contacts get connected. If staff add a client or employee later and the API user is not connected to it, the integration cannot see it and could create a duplicate. Is there an organization-wide access setting for the API user, or should we ask CentralReach support?
> 4. Send the total client and employee counts from your Contacts screen, so we can check our lists match.
>
> Once it is done I will run a read-only check (no changes in CentralReach) and confirm.

---

## Item 2: Referral Source (C36, Meta 126222)

### What CR shows

163 API-visible clients read (36 "Azure Test" clients skipped). The field is named "Referral Source" and is free text.

| CR value | Clients |
|---|---|
| blank | 49 |
| "Americare" | 97 |
| "Google" | 10 |
| other free text (5 distinct shapes, 1 to 2 words) | 7 |

CR holds **no** "Bassy-Americare", and none of the other 11 HubSpot options.

### What HubSpot holds on the same clients

73 of the 163 clients have exactly one Case holding their ID in `client_id_number`.

| HubSpot `referral_source` | Cases |
|---|---|
| blank | 33 |
| Other | 31 |
| Americare | 7 |
| Bassy-Americare | 1 |
| Family/friend | 1 |

Cross-tab (HubSpot / CR):

| Count | HubSpot | CR |
|---|---|---|
| 31 | blank | Americare |
| **30** | **Other** | **Americare** |
| 6 | Americare | Americare |
| 1 | Americare | blank |
| 1 | Bassy-Americare | Americare |
| 1 | Family/friend | Americare |
| 1 | Other | free text |
| 2 | blank | free text |

Outcome with today's code: equal 6; **differ 32** (overwritten); HubSpot blank 33 (CR kept); CR blank 1 (filled).

**The earlier note was wrong on the cause.** "Bassy-Americare" explains 1 difference. "Other" explains 30.

### Why HubSpot says "Other"

- The Case value is a property sync from the Contact's `how_did_you_hear_about_us_` (label "Referral Source"); it matched on 40 of 40 Cases checked.
- The Contact also has **`other___hear_about_us_`** (label "Referral - Other", free text). It is not on the Case and not in the guide.
- On the 31 "Other" Cases above, the Contact value was typed in the CRM UI (24 in 2025-10, 7 in 2026-03), one version each, and "Referral - Other" is filled on all 31:
  - **23: "Referral - Other" = "Americare", the same text as CR**;
  - 7: another one-word text, while CR says "Americare";
  - 1: two-word text; CR holds a different free text.
- All 186 Contacts with Referral Source = Other: "Referral - Other" is "Americare" on 48, other free text on 128, blank on 9, "JemCare" 1.

So staff picked "Other" and typed the real source. CR holds the typed source.

### Scale in production

| Population | Americare | Bassy-Americare | Other | blank | rest |
|---|---|---|---|---|---|
| Entry = Yes (413 Cases) | 230 | 99 | 22 | 16 | 46 |
| Client ID filled (491) | 262 | 101 | 51 | 52 | 25 |
| Yes and no Client ID, the future creates (44) | 3 | 4 | 6 | 4 | 27 |

### What the guide says

- Line 373: "Read referral_source from HubSpot."
- Line 382 and 470: `referral_source` is read-only (synced); read it, never write back.
- Line 530: "Referral Source | HS to CR | Case | referral_source (read-only in HubSpot, fine to read). | enumeration".
- The guide gives **no value mapping** and does not mention "Referral - Other" or "Bassy-Americare".

### Proposed mapping

| HubSpot `referral_source` | Send to CR 126222 | Why |
|---|---|---|
| Other, and "Referral - Other" is filled | **the "Referral - Other" text** | It is what CR holds on 23 of 31; "Other" alone loses the source |
| Other, and "Referral - Other" is blank | "Other" | Nothing better |
| Bassy-Americare | **"Bassy-Americare"** (as is) — pending United Care | CR is free text and HubSpot is the source of truth. Collapsing to "Americare" loses a distinction 99 entry = Yes Cases carry. The only evidence for collapsing is 1 linked client and the fact that CR shows no "Bassy-Americare" among 114 values |
| Every other option (Americare, Google, Family/friend, …) | the stored value, as built | The value equals the label on all 14 options |
| blank | nothing (CR keeps its value) | Existing blank rule |

Effect on the 73 linked clients: differences fall from 32 to 9 (7 one-word texts, 1 Family/friend, 1 Bassy-Americare).

**Implementation (when decided; not built).** Keep it native:

1. In HubSpot, add a Case property that syncs the Contact's `other___hear_about_us_` (the same kind of property sync that fills `referral_source`). Sandbox first; production at 9.6.
2. Add it to the Case's mapped properties and to the workflow trigger list (Zeke maintains the triggers, decision 51).
3. In `src/mappings/client/buildClientMetadata.mjs:413`: when `referral_source` is "Other" and the new property is filled, send the text.

This avoids a Contact read in the code. Assumption: a property sync of a text property behaves like the existing enumeration sync.

**Risks.**

- "Referral - Other" is free text. 128 of 186 values are not "Americare"; some may name a person (a doctor, a relative). It goes to a CR client field that staff already fill by hand, so this is the same kind of data CR holds today.
- Until Item 1 is fixed, this comparison covers 73 clients only.

---

## Item 3: sensitive scopes (note only)

**Setting names (no values read).**

| Who | Setting name | Where | Reference |
|---|---|---|---|
| The Function (all HubSpot calls) | `HUBSPOT_PRIVATE_APP_TOKEN` | Azure app settings; `local.settings.json` locally | `src/lib/config.mjs:21`, `:41`, `:283`, `:326`; `local.settings.example.json:9` |
| The read-only review scripts | `HUBSPOT_PRIVATE_APP_TOKEN_PROD` | `.env` | BUILD-PLAN line 54, decision 33 |

- `HUBSPOT_PRIVATE_APP_TOKEN_PROD` is not read anywhere in `src/`.
- **The names cannot show whether the two are the same app.** The deployed Function still points at the sandbox; its production token is set at step 9.7.
- Three results suggest the review token is **not** the app Danny described on 11/14 (guide lines 760 and 1451: "read and write on deals, contacts and custom objects, including sensitive and highly sensitive"):
  - sensitive Case property definitions answer 404;
  - lists and workflows answer 403;
  - owners answers 403 (Danny said he would add `crm.objects.owners.read`).
- *Inferred:* that a 404 on a sensitive property definition means a missing sensitive scope. It fits the guide (line 466: without the scope the values are "silently missing"), but it was not tested against a token known to hold the scope.

**Recommendation for step 9.6 (and 9.7).** Three checks, in this order, on the exact token value that goes into the Function's `HUBSPOT_PRIVATE_APP_TOKEN`:

1. **Which app, which scopes.** `POST /oauth/v2/private-apps/get/access-token-info` with the token returns the portal, the app ID and the scope list. Pass: portal `50317927`, the app is "Central Reach Integration", and the list holds the deals sensitive and highly-sensitive read scopes. It changes no data, but it is a POST outside the GET-and-search guard, so it needs Zeke's go-ahead as a named exception. Run it for `HUBSPOT_PRIVATE_APP_TOKEN_PROD` too: equal app IDs settle the "same app" question. *The exact scope names should be read from the app's scope page, not assumed.*
2. **Definitions.** `GET /crm/v3/properties/deals/phi_diagnosis` (and `phi_first_name__cloned_`, `insurance_id_1`). Pass: 200 with a `dataSensitivity` value.
3. **Values (R-23).** One `GET /crm/v3/objects/deals/{id}?properties=phi_first_name__cloned_,phi_last_name,phi_gender,phi_date_of_birth,phi_diagnosis,insurance_id_1,insurance_id_2,phi__policy_holder_dob` on a Case that Zeke confirms shows all eight in the HubSpot UI. Print only "returned and filled: yes/no" per property, never a value. Pass: eight times yes.

If check 3 fails with the Function's token, every Case create would lack name, date of birth, gender and diagnosis: stop before 9.8 step (2).

---

## Questions for Zeke

1. **CR API user:** is the pasted permission page the API user's, or Danny's own login? Send Danny the draft above?
2. **Referral "Other":** agree to send the Contact's "Referral - Other" text when the option is Other (needs one new synced Case property)?
3. **Bassy-Americare:** send as is (recommended), or as "Americare"? This is United Care's call (Sara).
4. **Token check:** may step 9.6 use the one token-info POST, and is `HUBSPOT_PRIVATE_APP_TOKEN_PROD` the same value that will go into the Function at 9.7?

## Sources

- [CentralReach APIs (Getting Started, Glossary, Response Codes)](https://centralreach.com/resources/api/)
- [CentralReach API permissions article](https://community.centralreach.com/s/article/knowledge-api-permissions) (linked from the page above; it could not be read without a login)
