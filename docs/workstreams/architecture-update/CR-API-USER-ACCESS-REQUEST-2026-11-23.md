# CentralReach API user: permissions and access request (2026-11-23)

For Zeke to send to Danny Gavin (United Care's CR admin). Written from the code and CR's public API page only. No call was made to CentralReach or HubSpot, and nothing was changed.

## Summary

- **The 404s are a connection gap, not a permission gap.** CR's API page: 404 means "Make sure the API User is connected to the requested contactID"; a missing permission gives 403. We get 404 and have never had a 403.
- **So the main ask is: connect the API user to every client and every employee**, active and inactive, and keep new contacts connected.
- **Permissions:** the integration only uses the Contacts module. It needs 11 of the 35 Contacts permissions, plus 2 that are unsure. No other module is needed.
- **The pasted permission page is Danny's own login.** We do not yet know which CR user the API credentials act as, or what that user holds. That is the first question for Danny.
- **CR does not publish which permission each API endpoint needs.** The page points to an "API permissions" article that needs a CR community login. Every permission mapping below is therefore **inferred** from the permission names, unless marked otherwise.

Legend: **Confirmed** = read in the code or on CR's public API page. **Inferred** = reasoned from names or behaviour, not documented.

---

## 1. Every CR API call the integration makes

Source: `src/lib/centralReachClient.mjs`. Base path `/enterprise/v1` on `partners-api.centralreach.com`. Every call sends `Authorization: Bearer <token>` and `x-api-key`.

| # | Method + endpoint | Purpose | Code line | CR permission needed (all inferred) |
|---|---|---|---|---|
| 1 | `POST {token URL}` (`client_credentials`, scope `cr-api`) | Get the access token | `:85-96` | None in the Contacts module. Needs the client ID, secret and API key CR issued. (Confirmed, CR docs) |
| 2 | `GET /contacts/client/byExternalSystemId?ExternalSystemId=` | Find a client by the HubSpot Case ID before a create | `:183` | Access; View Client Profile; **connection to the client** |
| 3 | `GET /contacts/employee/byExternalSystemId?ExternalSystemId=` | Find an employee by the HubSpot ID before a create | `:183` | Access; View Employees; **connection to the employee** |
| 4 | `POST /contacts/client` (with `ContactForm`) | Create a client | `:408` | Access; Add New → Clients; Add New → Clients Using Custom Forms |
| 5 | `PUT /contacts/client/{id}` | Update a client | `:394` | Access; Manage Client Profile; **connection** |
| 6 | `GET /contacts/employee/{id}` | Read an employee before an update | `:451` | Access; View Employees; **connection** |
| 7 | `POST /contacts/employee` (with `ContactForm`: "Admin", "Behavior Technician NY", "RBT CO") | Create an employee | `:565` | Access; Add New → Employees; Add New → Employees Using Custom Forms |
| 8 | `PUT /contacts/employee/{id}` | Update an employee | `:535` | Access; Manage Employee and Generic Profiles; **connection** |
| 9 | `GET /contacts/{id}/labels` | Read a contact's labels (before and after a label post) | `:720` | Access; Use Organization Labels; view of the contact; **connection** |
| 10 | `GET /contacts/labels` | Read the organization's label list | `:742` | Access; Use Organization Labels (Manage Organization Labels: unsure) |
| 11 | `POST /contacts/{id}/labels` | Set a contact's labels | `:770` | Access; Use Organization Labels; manage of the contact; **connection** |
| 12 | `PUT /contacts/{id}/metadata/{fieldId}` | Write one custom field value | `:932` | Access; Contacts → Manage Meta-Data; manage of the contact; **connection** |
| 13 | `PUT /contacts/client/{id}/metadata/{fieldId}` | Same write, second route after a 404 | `:949` | Same as 12 |
| 14 | `DELETE /contacts/{id}/metadata/{fieldId}` | Clear one custom field value | `:893` | Same as 12 |

Read-only review scripts (not the deployed Function) also call:

| Method + endpoint | Purpose | CR permission needed (inferred) |
|---|---|---|
| `GET /contacts/client/{id}` | Read one client | Access; View Client Profile; connection |
| `GET /contacts/{id}/metadata` | Read a contact's custom fields | Access; view of the contact; connection |
| `GET /contacts/clients?take=` | List visible clients | Access; View Client Profile |
| `GET /contacts/employees?take=` | List visible employees | Access; View Employees |

**One fact that matters:** these calls already work for the contacts the API user can see. The 36 "Azure Test" clients it created are in the CR list, the label and custom field steps have run on test contacts, and no CR call has answered 403. So the API user's present permissions look sufficient already. **Nothing should be removed from it today.** *Not re-tested today; taken from the earlier evidence files and test notes.*

---

## 2. Permission list for the API user

### 2a. Minimum set

**Needed (11), all in Contacts:**

1. Access
2. Add New → Clients
3. Add New → Clients Using Custom Forms
4. Add New → Employees
5. Add New → Employees Using Custom Forms
6. Contacts → Manage Client Profile
7. Contacts → Manage Employee and Generic Profiles
8. Contacts → Manage Meta-Data
9. Contacts → Use Organization Labels
10. Contacts → View Client Profile
11. Contacts → View Employees

**Unsure (2): keep them if the API user has them; grant them only if a 403 appears:**

12. Contacts → Manage Organization Labels (may gate `GET /contacts/labels`)
13. Utilities → Manage Meta-Data (may gate custom field writes; more likely it only gates field definitions)

For launch day the safe rule is: **the API user keeps what it has, and must hold at least 1 to 11.** Trimming to least privilege can follow once Danny sends the API user's permission page.

### 2b. Zeke's full Contacts list (35 of 35 on Danny's login)

| # | Permission | Needed by the integration? | Reason |
|---|---|---|---|
| 1 | Access | **Yes (minimum)** | Entry to the Contacts module; every call is a contacts call |
| 2 | Account → View Invoices/Charges & Payments | No | No billing call |
| 3 | Add New → Clients | **Yes (minimum)** | `POST /contacts/client` |
| 4 | Add New → Clients Using Custom Forms | **Yes (minimum)** | The client create sends a `ContactForm` ("Public Client Intake Form" by default). Inferred |
| 5 | Add New → Employees | **Yes (minimum)** | `POST /contacts/employee` |
| 6 | Add New → Employees Using Custom Forms | **Yes (minimum)** | The employee create sends a `ContactForm` ("Admin", "Behavior Technician NY", "RBT CO"). Inferred |
| 7 | Add New → Generics | No | No generic contact is created |
| 8 | Add New → Generics Using Custom Forms | No | Same |
| 9 | Add New → Providers | No | No provider is created. The provider name is written as a free-text custom field |
| 10 | Contacts → Add New Activity/Call Log | No | No activity call |
| 11 | Contacts → Client Payment Account | No | No payment call |
| 12 | Contacts → Export Contacts | No | The API lists are not the screen export. Inferred |
| 13 | Contacts → Manage activity & call log settings | No | No activity call |
| 14 | Contacts → Manage Activity/Call Log | No | No activity call |
| 15 | Contacts → Manage Client Payors | No | Insurance values go to custom fields, not to payor records |
| 16 | Contacts → Manage Client Profile | **Yes (minimum)** | `PUT /contacts/client/{id}`; labels and custom fields on a client |
| 17 | Contacts → Manage Employee and Generic Profiles | **Yes (minimum)** | `PUT /contacts/employee/{id}`; labels on an employee |
| 18 | Contacts → Manage Meta-Data | **Yes (minimum)** | `PUT` and `DELETE /contacts/{id}/metadata/{fieldId}`. Inferred |
| 19 | Contacts → Manage Organization Labels | **Unsure** | The integration never creates or edits a label. It may still gate `GET /contacts/labels`. Keep if held |
| 20 | Contacts → Manage Own Basic Info | No | The API user does not edit itself |
| 21 | Contacts → Organization Settings | No | No settings call |
| 22 | Contacts → Reports | No | No report call |
| 23 | Contacts → Use Organization Labels | **Yes (minimum)** | `GET` and `POST /contacts/{id}/labels`, `GET /contacts/labels` |
| 24 | Contacts → View Client Profile | **Yes (minimum)** | Client lookup by External System ID; client reads |
| 25 | Contacts → View Employees | **Yes (minimum)** | `GET /contacts/employee/{id}`; employee lookup |
| 26 | Contacts → View History | No | No history call |
| 27 | Insurance → Manage Verification Details | No | No verification call |
| 28 | Insurance → Request Verifications | No | No verification call |
| 29 | Manage Connections → Audit Log | No (API user). **Useful to Danny** | Lets Danny check the connections he makes |
| 30 | Utilities → Bulk-Connect Employees & Employees | No (API user). **Danny needs it** | Danny uses it to connect the API user to all employees |
| 31 | Utilities → Connect Employees & Clients | No (API user). **Danny needs it** | Danny uses it to connect the API user to all clients |
| 32 | Utilities → Manage Address Management | No | Addresses go in the contact body |
| 33 | Utilities → Manage Meta-Data | **Unsure** | Probably gates field definitions, which the integration never changes. Keep if held |
| 34 | Utilities → Manage Organization Forms | No | Forms are named, never edited |
| 35 | Utilities → View Address Management | No | No call |

### 2c. The other modules on Danny's page

| Module (Danny's login) | Needed by the API user? | Reason |
|---|---|---|
| Billing 35/36 | No | No billing call |
| Case Manager 0/2 (Access; AI-Assisted Session Narratives) | No | No call. Not granted to Danny either; not needed |
| Claims 5/5 | No | No call |
| Clinical 23/23 | No | No call |
| CR Mobile 1/2 | No | No call |
| Files 16/16 | No | No call |
| Human Resources 4/11 | No | Employees are written through Contacts, not HR. Inferred; no 403 seen |
| Insights 2/2 | No | No call |
| Integration Center 2/2 (Access; Public API Dashboard) | No (API user). **Danny needs it** | Where Danny should see the API credentials and their user. Inferred from the name |
| Messaging 4/4 | No | No call |
| Notes & Forms 7/7 | No | No call |
| Permissions 2/2 (Access; Groups → Manage) | No (API user). **Danny needs it** | To read and set the API user's permission group |
| Scheduling 28/28 | No | No call |
| Tasks 6/6 | No | No call |
| "Hide Employee from Client Portal" (not granted) | No | No call |

---

## 3. The connection requirement (the cause of the 404s)

### What we see

| Fact | Status |
|---|---|
| The API user sees 199 clients and about 909 employees (910 on one read) | Confirmed |
| Every GET on BCBA Anne Fetherston (`4871945`) answers 404: employee, labels, metadata, byExternalSystemId | Confirmed |
| Clients `4717582` and `5265763`, and the CO and NJ sample clients, answer 404 | Confirmed |
| 102 of 111 production BCBAs and 9 of 400 BT/RBTs with Entered = Yes are not visible | Confirmed |
| CR's Response Codes table: 404 → "Make sure the API User is connected to the requested contactID"; 403 → "Review the permissions of the API User for that particular endpoint" | Confirmed (CR docs) |
| We have never had a 403 from CR | Confirmed |
| We have not seen the CR provider list | Confirmed. The integration does not need it: the provider is written as text |

### What the API user must be connected to

- **Every client**, active and inactive.
- **Every employee**, active and inactive (BCBAs, BT/RBTs and office staff).
- The connection must allow **viewing and editing the profile, labels and custom fields**. If the connect screen offers sharing options or a "client admin" level, choose the level that allows profile edits. *Inferred: a public guide from another clinic shows the Connect Clients screen asking for sharing options per connection. United Care's screen may differ.*

### Which utilities do it

| Utility (Danny holds both) | Use |
|---|---|
| Contacts → Utilities → **Connect Employees & Clients** | Connect the API user (an employee-type user) to all clients. Tick "include inactive" if offered |
| Contacts → Utilities → **Bulk-Connect Employees & Employees** | Connect the API user to all employees |
| Manage Connections → **Audit Log** | Check the result |

*The exact screen steps are inferred from the permission names and that outside guide. The guide notes a connection job can take a few minutes and shows a pending count that falls to 0.*

### How new contacts stay connected

| Case | What we know | Status |
|---|---|---|
| A contact the **integration** creates | It is visible to the API user afterwards: the 36 "Azure Test" clients are in the list, and created contacts are updated and labelled in the same run | Confirmed that it is visible. **Inferred** that the creator is connected automatically. CR's public docs do not say |
| A contact **staff** create in CR | Not connected to the API user. This is the likeliest reason 102 BCBAs are invisible | **Inferred** |

Why it matters: if staff add a client or employee after the bulk connect, the API user cannot see it. The lookup answers 404 and the integration **creates a duplicate**.

Options, simplest first. Danny or CR support must say which CR supports:

1. **Organization-wide access for the API user**, so it sees every contact without a connection each. *Unknown whether CR has this for an API user. This is the one question for CR support.*
2. **Automatic connection on the contact forms staff use.** A 2017 CR conference deck lists "Automate connections" as a contact form feature. *Seen only as a search result title, not read. Unverified.*
3. **A scheduled bulk connect** (weekly, say) by Danny. Works, but leaves a gap between runs, so duplicates stay possible.

**Risk until this is settled:** keep employee creates off (`allowEmployeeCreate`) for any population the API user cannot fully see, or duplicates will be created.

---

## 4. Read-only verification after Danny's change

GET only. No write to CR or HubSpot. The existing script covers most of it (session scratchpad; it may be cleared on a reboot):

```
NODE_USE_ENV_PROXY=1 node /private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/feedback-referral-access-read.mjs
```

| # | Check | Today | Pass |
|---|---|---|---|
| 1 | `GET /contacts/employee/4871945` | 404 | 200 |
| 2 | `GET /contacts/4871945/labels` | 404 | 200 |
| 3 | `GET /contacts/4871945/metadata` | 404 | 200 |
| 4 | `GET /contacts/employee/byExternalSystemId?ExternalSystemId=4871945` | 404 | 200, or 404 only if she has no External System ID (check 1 must be 200) |
| 5 | `GET /contacts/client/4717582` | 404 | 200 |
| 6 | `GET /contacts/client/5265763` (not yet in the script; add it) | 404 | 200 |
| 7 | `GET /contacts/employee/5237928` (control) | 200 | 200 |
| 8 | `GET /contacts/clients?take=5000` | 199 (164 active) | Equals Danny's client total, active + inactive |
| 9 | `GET /contacts/employees?take=10000` | about 909 | Equals Danny's employee total, active + inactive |
| 10 | Any 403 on checks 1 to 9 | none | none. A 403 now means a permission from section 2a is missing |

Then:

- Re-run `employee-recount.mjs`: "not visible" should fall from 102 BCBAs and 9 BT/RBTs to about 0.
- Re-test the Client ID sample: "81 of 100 Client IDs do not resolve" should mostly resolve. Any ID that still answers 404 is a wrong ID.
- If a list returns exactly 5,000 or 10,000, page it (`Offset` is a 1-based page number).
- **Ongoing check:** ask Danny to create one test employee by hand in CR after the change. If the API user can read it, new staff-created contacts stay connected. If it answers 404, option 1 or 2 in section 3 is still needed.

Write permissions (section 2a, items 2 to 9) are not tested by this plan. The same credentials have created and updated test contacts with no 403, so they are expected to hold; a 403 on the first production write would name the missing permission.

---

## 5. Message to Danny

> Hi Danny,
>
> Thanks for the permission page. The integration can only see 199 clients and about 909 employees in CentralReach. For example, employee 4871945 and clients 4717582 and 5265763 come back "404 not found" through the API, though they exist. CentralReach's API documentation says a 404 means "make sure the API User is connected to the requested contact ID". A missing permission would be a 403, and we have never had one. So this is about connections, not more permissions.
>
> Could you do these five things today?
>
> 1. **Confirm which CentralReach user the API credentials belong to.** Integration Center → Public API Dashboard should show it. Is it your own login or a separate API user? If it is separate, please send its permission page.
> 2. **Check that user has these Contacts permissions** (leave anything else it already has as it is):
>    - Access
>    - Add New → Clients
>    - Add New → Clients Using Custom Forms
>    - Add New → Employees
>    - Add New → Employees Using Custom Forms
>    - Contacts → Manage Client Profile
>    - Contacts → Manage Employee and Generic Profiles
>    - Contacts → Manage Meta-Data
>    - Contacts → Use Organization Labels
>    - Contacts → View Client Profile
>    - Contacts → View Employees
> 3. **Connect that user to all clients and all employees, active and inactive**, with access that allows editing profiles, labels and custom fields. The tools are Contacts → Utilities → Connect Employees & Clients, and Bulk-Connect Employees & Employees.
> 4. **Tell us how new contacts stay connected.** If staff add a client or employee later and the API user is not connected to it, the integration cannot see it and could create a duplicate. Can the API user have organization-wide access, or can the contact forms connect it automatically? If you are not sure, could you ask CentralReach support?
> 5. **Send the total client and employee counts** from your Contacts screen (active and inactive), so we can check our lists match.
>
> Once it is done I will run a read-only check (it changes nothing in CentralReach) and confirm.
>
> Thanks,
> Zeke

---

## Risks and assumptions

- **Every permission-to-endpoint mapping is inferred.** CR's per-endpoint permission article needs a community login. The evidence that the mapping is safe: the calls already work with the API user's present permissions.
- **The API user is unknown.** If it is Danny's own login, it already holds all 35 Contacts permissions and only the connections are missing.
- **Whether a creator is connected automatically is inferred**, as is whether CR offers organization-wide access for an API user.
- **Bulk connect is a one-time fix.** Without an answer to question 4, the gap reopens with the next contact staff create.
- **Connecting changes what the integration can update.** After the connect, lookups that answered 404 will find records, so updates will reach contacts they never reached before. Run the read-only checks before the first production run.

## Sources

- [CentralReach APIs (Getting Started, Glossary, Response Codes)](https://centralreach.com/resources/api/)
- [CentralReach API permissions article](https://community.centralreach.com/s/article/knowledge-api-permissions) (login needed; not read)
- [CentralReach OAuth scopes, apis.io](https://apis.io/scopes/centralreach/centralreach-scopes/) (says per-endpoint permissions are set in the CR organization, not by scope)
- [Connecting employees and clients, BAE Therapy help page](https://baetherapy.freshdesk.com/support/solutions/articles/44001766900-connecting-employees-and-clients-for-an-fba) (another clinic's guide, not CR's)
- `src/lib/centralReachClient.mjs`; `FEEDBACK-REVIEW-CR-ACCESS-REFERRAL-2026-11-23.md`; `DECISIONS-EVIDENCE-EMPLOYEES-2026-11-23.md`; `DECISIONS-EVIDENCE-CASES-2026-11-23.md`

## Status (2026-11-23, from Zeke)

- **API user identified:** the Public API runs as Gavriella Bohan, CR ID 4147071. Her Contacts permissions are 35 of 35, so all 11 the integration needs are held. No permission change is needed.
- **Connections done:** Zeke: "She's connected". 4147071 is now connected to clients and employees. Still to run: the read-only check (4871945, 4717582 and 5265763 return 200; API counts match the Contacts screen).
- **Open, cutover task:** set up auto-connect from 4147071's profile to all clients going forward, so contacts staff add later stay visible to the API (Zeke: "please mark setting up auto connect from her profile to all clients moving fowrad"). Until this is done, new staff-created contacts can be invisible and would be created again.
- **Open, owner Danny:** set up a dedicated API user to replace Gavriella's login (Zeke: "we need a dediecate api users moving fowrd - set to Danny"). It needs the same 11 Contacts permissions, connections to all clients and employees, and auto-connect. Then the integration's CR credentials move to that user.

## Verification after connect (2026-11-23, 20:46 UTC)

Read-only run after Zeke's "She's connected". CR: GET only, plus the token POST. HubSpot production `50317927`: GET and search only, portal checked first. Nothing was written. Script and output (session scratchpad; may be cleared on a reboot): `verify-after-connect.mjs`, `verify-after-connect.out`. CR calls: 2,092 answered 200, 274 answered 404 (expected lookups), **no 403**.

**Result: the connection worked. The duplicate risk for existing employees did not change, because it comes from External System IDs, not from visibility.**

### 1. The three IDs

| Call | Before | Now |
|---|---|---|
| `GET /contacts/employee/4871945` | 404 | **200** (External System ID is 7 digits) |
| `GET /contacts/4871945/labels` and `/metadata` | 404 | **200** |
| `GET /contacts/client/4717582`, its labels and metadata | 404 | **200** |
| `GET /contacts/client/5265763`, its labels and metadata | 404 | **200** |
| `GET /contacts/employee/byExternalSystemId?ExternalSystemId=4871945` | 404 | 404 (expected: her External System ID is not her CR ID) |
| Control `GET /contacts/employee/5237928` | 200 | 200 |

### 2. Totals visible to the API (paged fully, `Take=200`, `Offset` = 1-based page)

| List | Before | Now |
|---|---|---|
| Clients | 199 (164 active) | **713** (621 active); 36 are "Azure Test" |
| Employees | 909 / 910 | **1,581** (781 active); type `employee` 1,096, `generic` 485 |

A single call with `take=5000` / `take=10000` returns the same 713 and 1,581. **Not yet compared with the CR Contacts screen totals** (message item 5): that comparison is what proves "every" contact.

### 3. Recount, Entered in CentralReach = Yes (production HubSpot)

Same matching order as before: Workday ID = CR External System ID, then CR primary email (1,581 employee GETs, all read), then first and last name.

| Found in CR by | BT/RBT before | BT/RBT now | BCBA before | BCBA now |
|---|---|---|---|---|
| Workday ID (the integration's lookup finds these) | 204 | **210** | 8 | **99** |
| Email only | 182 | 182 | 1 | 11 |
| Name only | 5 | 5 | 0 | 0 |
| Not visible (no match) | 9 | **3** | 102 | **1** |
| Total | 400 | 400 | 111 | 111 |

Still no match: BT/RBT `50034086737`, `61133759494`, `65978059153`; BCBA `52756499348` (HubSpot record IDs).

### 4. Duplicates the integration would create at go-live

The lookup before a create is by External System ID only: the HubSpot record ID, then `workday_id` (`employeeSyncWorkflow.mjs:840-849`). A record with `employee_id` filled is linked and is never created.

| | BT/RBT | BCBA |
|---|---|---|
| Linked (`employee_id` filled; update path) | 6 | 0 |
| Unlinked, found by Workday ID (ends `waiting`, no create) | 210 | 99 |
| **Unlinked, in CR only by email or name: would be created again** | **181** | **11** |
| of these, HubSpot `workday_id` blank | 110 | 3 |
| of these, CR External System ID blank | 129 | 8 |
| of these, CR External System ID differs from `workday_id` | 0 | 1 |
| of these, email matches several CR employees | 10 | 0 |
| Unlinked, no match at all (a create; a duplicate only if the person is in CR under another email and name) | 3 | 1 |

Confirmed with the integration's own call: `byExternalSystemId` by record ID and by `workday_id` answered 404 for all 181 and all 11. So **192 duplicate employees** (up to 196 with the no-match records) if employee creates are on for existing staff. The fix is unchanged: write `employee_id` on the existing employees (or enter the Workday ID as the CR External System ID) before creates are turned on for them.

### 5. Cases with a CR Client ID

| | Before (2026-11-18) | Now |
|---|---|---|
| Cases with `client_id_number` | 475 (100 sampled) | 491; 489 all digits, 489 distinct |
| `GET /contacts/client/{id}` = 200 | 19 of 100 | **487 of 489** |
| 404 | 81 of 100 | **2**: Case `52824206873` → `4788659`; Case `58025345977` → `48610048` (8 digits, likely a typing error) |

Not all digits (not tested): Cases `48473783836`, `57177749556`. No Client ID is held by two Cases. Both 404 Cases have Entered in CR = Yes.

### Assumptions

- The 713 and 1,581 are every contact in CR. Not proven until compared with the Contacts screen totals.
- An email or name match is the same person. 10 BT/RBT emails match several CR employees, so those need a person to pick the record.
- The 4 no-match employees and the 2 no-resolve Client IDs are wrong or missing data, not a remaining connection gap. Not proven.
- Connections cover edit access. Only reads were tested; no write was made.
- Staff-created contacts made after this connect are not covered until auto-connect is set up (Status, above). Not tested.
