# CentralReach metadata and labels — discovery scripts and artifacts

**Audience:** Coding agents and implementers working on HubSpot ↔ CentralReach sync.  
**As of:** 2026-10-27  
**Scope:** How sandbox **metadata field IDs** and **label IDs** were discovered, which scripts to run, where JSON outputs live, and how that relates to production Azure code.

**Related repos**

| Repo | Role |
| --- | --- |
| [`central_reach_test_integration`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration) | Local CLI scripts, Pipedream prototypes, and `output_files/` JSON exports used during discovery |
| [`azure_central_reach`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach) | Azure Functions sync; label/metadata IDs should align with [`src/constants/centralReach.mjs`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach/src/constants/centralReach.mjs) |

**Business mapping source of truth:** [Google Drive — Optidge V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit). See [`SOURCE-OF-TRUTH.md`](SOURCE-OF-TRUTH.md).

---

## Agent quick reference

| HubSpot object | CentralReach entity | Discovery need | Script | Typical command |
| --- | --- | --- | --- | --- |
| Deal (case / client) | Client contact | Metadata field catalog for a client | [`api_calls.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/api_calls.js) | `node api_calls.js metadata <clientContactId>` |
| Deal (case / client) | Client contact | Core (non-metadata) fields | [`api_calls.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/api_calls.js) + [`centralreach-client.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/src/clients/centralreach-client.js) | `getClientByContactId` (see script / one-off Node) |
| BT/RBT or BCBA | Employee contact | Metadata + core employee | [`api_calls.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/api_calls.js) | `node api_calls.js employee <employeeContactId>` |
| Any | Org-wide label **definitions** | Full label dictionary (clients + employees) | [`get_all_labels.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/get_all_labels.js) | `node get_all_labels.js orglabels [requestId] [outputBaseName]` |
| Client or employee | One contact | Labels **assigned** to that record | [`get_all_labels.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/get_all_labels.js) | `node get_all_labels.js <contactId> [outputBaseName]` |

**Credentials (local only):** `central_reach_test_integration/.env` — `CR_CLIENT_ID`, `CR_CLIENT_SECRET`, `CR_API_KEY`. Loaded by [`src/config.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/src/config.js).

**API base URL:** `https://partners-api.centralreach.com/enterprise/v1`  
**Token URL:** `https://login.centralreach.com/connect/token` (`grant_type=client_credentials`, `scope=cr-api`)

**Do not use for discovery:** [`logs/meta_logs`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/logs/meta_logs) — Pipedream/runtime **metadata PUT** logs during sync, not GET discovery.

---

## HubSpot → CentralReach object map

| HubSpot | CentralReach | Metadata | Labels |
| --- | --- | --- | --- |
| Deal | Client (`type: client`) | Custom fields via metadata API | Client labels (e.g. All Clients, NY/CO Client) |
| BT/RBT custom object | Employee | Employee metadata fields (e.g. RBT #, work address metadata) | Employee labels (e.g. All Employees, BT NY, RBT NY, Clinical) |
| BCBA custom object | Employee | BCBA metadata (e.g. Medicaid credentialing fields) | Employee labels (e.g. All Employees, BCBA, Clinical, NY/CO Employee) |

Metadata and labels are **separate** from core contact fields (`FirstName`, `PhoneCell`, etc.). Core client fields use `GET/PUT /contacts/client/{ContactId}`; core employee fields use `GET/PUT /contacts/employee/{ContactId}`.

---

## Metadata discovery

### Scripts and libraries

| File | Purpose |
| --- | --- |
| [`api_calls.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/api_calls.js) | CLI entry for metadata and employee fetches |
| [`src/clients/centralreach-client.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/src/clients/centralreach-client.js) | `getContactMetadata()`, `getEmployee()`, `getClientByContactId()` |
| [`src/config.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/src/config.js) | Env and API base URL |

### CentralReach API (metadata)

| Operation | Method | Path | Official request doc |
| --- | --- | --- | --- |
| List metadata on a contact | GET | `/contacts/{ContactId}/metadata` | [ContactMetadataGetRequest](https://centralreach.com/resources/api/requests/#/Metadata/ContactMetadataGetRequestcontactsContactIdmetadata_Get) |
| Update one metadata field | PUT | `/contacts/{ContactId}/metadata/{FieldId}` | [ContactMetadataPutRequest](https://centralreach.com/resources/api/requests/#/Metadata/ContactMetadataPutRequestcontactsContactIdmetadataFieldId_Create) |
| Org metadata configuration (optional) | GET | `/contacts/metadata-configuration` | [ContactMetadataConfigGetRequest](https://centralreach.com/resources/api/requests/#/Metadata/ContactMetadataConfigGetRequestcontactsmetadata-configuration_Get) |

**Local mirror:** [`central_reach_test_integration/central_reach_docs/CentralReach_Enhanced_APIs_Fast_&_Secure.md`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/central_reach_docs/CentralReach_Enhanced_APIs_Fast_%26_Secure.md) (metadata section ~lines 891–899).

**Auth headers:** `Authorization: Bearer <token>`, `x-api-key: <CR_API_KEY>`, `Accept` / `Content-Type: application/json`.

### CLI modes (`api_calls.js`)

**Client metadata only (Deal / case):**

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration
node api_calls.js metadata <centralReachClientContactId>
```

- Calls `getContactMetadata(contactId)`.
- Writes: `output_files/usemetadata_<contactId>.json`.

**Employee metadata + core employee record (BT/RBT or BCBA):**

```bash
node api_calls.js employee <centralReachEmployeeContactId>
```

- Parallel: `getEmployee(id)` and `getContactMetadata(id)`.
- Writes:
  - `output_files/employee_<id>.json` (core fields)
  - `output_files/metadata_<id>.json` (metadata catalog for that employee)

### Response shape (what to parse)

Top level: `contactId`, `metadataFields[]`.

Each element includes at minimum:

- `fieldId` — use this in PUT URLs and in code constants
- `fieldName`, `groupName`, `description`
- `isFilledIn`, `displayOnFacesheet`, `sortOrder`
- `metadataDefinitionAndValue` — `type` (`Input`, `Single`, `TextArea`, …), optional `inputValue`, `singleSelectDefinition`, etc.

### Known metadata output artifacts

| File | Contact ID | HubSpot use case | Notes |
| --- | --- | --- | --- |
| [`output_files/usemetadata_4778844.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/usemetadata_4778844.json) | 4778844 | Client / deal | Primary client metadata export used for mapping |
| [`output_files/usemetadata_4771960.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/usemetadata_4771960.json) | 4771960 | Client / deal | Additional client metadata sample |
| [`output_files/metadatatomap.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/metadatatomap.json) | 4742731 | Client / deal mapping | Same API shape; likely renamed copy for mapping work |
| [`output_files/metadata_4708516.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/metadata_4708516.json) | 4708516 | Client case sample | |
| [`output_files/metadata_4778843.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/metadata_4778843.json) | 4778843 | BCBA employee | Includes credentialing metadata (e.g. fieldId `134444` Credentialed with Medicaid NY) |
| [`output_files/employeemetafields.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/employeemetafields.json) | 4737831 | BT/RBT employee | Friendly filename; same shape as `metadata_<id>.json` |
| [`output_files/employee_4778843.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/employee_4778843.json) | 4778843 | BCBA core fields | Non-metadata employee payload |

### Where metadata discovery is logged

| Destination | Contents |
| --- | --- |
| **Terminal** | `Response written to <path>` from `writeToOutputFile()` in `api_calls.js` |
| **`output_files/`** | JSON artifacts (table above) |
| **Not discovery** | `logs/meta_logs` — sync PUT tracing in Pipedream workflows |

### Prototype sync code (field ID constants)

Pipedream sandbox workflows (IDs may match Azure constants):

| Workflow | Path |
| --- | --- |
| Client deal sync | [`pipe_dream/hubspot_centralreach_sync/hs-to-cr-sync.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/hs-to-cr-sync.js) — `CR_META_FIELDS`, `CR_CLIENT_LABELS` |
| BT/RBT | [`pipe_dream/hubspot_centralreach_sync/step_2_rt/rtbt.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/step_2_rt/rtbt.js) — `CR_EMPLOYEE_LABELS`, metadata PUT helpers |
| BCBA | [`pipe_dream/hubspot_centralreach_sync/bcba_step_2_workflow.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/bcba_step_2_workflow.js) — `BCBA_METADATA_FIELD_IDS`, `CR_EMPLOYEE_LABELS` |

**Azure production constants:** [`azure_central_reach/src/constants/centralReach.mjs`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach/src/constants/centralReach.mjs)  
**Azure mappings:** [`buildClientMetadata.mjs`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach/src/mappings/client/buildClientMetadata.mjs), [`buildEmployeePayload.mjs`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach/src/mappings/employees/buildEmployeePayload.mjs)

---

## Labels discovery

### Script

| File | Purpose |
| --- | --- |
| [`get_all_labels.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/get_all_labels.js) | Org catalog + per-contact assigned labels |

### CentralReach API (labels)

| Operation | Method | Path | Official request doc |
| --- | --- | --- | --- |
| Organization label catalog | GET | `/contacts/labels` | [OrganizationContactLabelsGetRequest](https://centralreach.com/resources/api/requests/#/Contact%20Labels/OrganizationContactLabelsGetRequestcontactslabels_Get) |
| Labels on one contact | GET | `/contacts/{ContactId}/labels` | [ContactLabelsGetRequest](https://centralreach.com/resources/api/requests/#/Contact%20Labels/ContactLabelsGetRequestcontactsContactIdlabels_Get) |
| Assign / update labels on contact | POST | `/contacts/{ContactId}/labels` | [ContactLabelsPostRequest](https://centralreach.com/resources/api/requests/#/Contact%20Labels/ContactLabelsPostRequestcontactsContactIdlabels_Post) |

**Important:** There is **one** org-wide label catalog for the organization. Employee labels (BCBA, RBT NY, All Employees, etc.) and client labels (All Clients, CO Client, payor labels, etc.) appear in the **same** `labels[]` list. There is no separate “employee labels only” API endpoint.

**Local mirror:** [`CentralReach_Enhanced_APIs_Fast_&_Secure.md`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/central_reach_docs/CentralReach_Enhanced_APIs_Fast_%26_Secure.md) (labels section ~lines 847–855).

### CLI modes (`get_all_labels.js`)

**Organization catalog (preferred for mapping `labelId` → name):**

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration
node get_all_labels.js orglabels [requestId] [outputBaseName]
```

Example that produced the fullest export in repo:

```bash
node get_all_labels.js orglabels 4467195 all_labels_v2
```

- `requestId` is optional; logged for traceability (e.g. CR UI reference). Request URL remains `GET /contacts/labels`.

**Labels assigned to a specific client or employee:**

```bash
node get_all_labels.js <contactId> [outputBaseName]
```

- Writes under `output_files/` with base name `all_labels` by default, or the custom `outputBaseName`.
- If the target filename exists, the script increments (`client_label_1.json`, etc.) — see `getUniqueOutputPath()` in the script.

### Response shape

```json
{
  "labels": [
    { "labelId": 1052618, "name": "All Employees", "parentLabelId": 0 }
  ],
  "result": "OK",
  "failed": false
}
```

Use `labelId` in sync code; use `parentLabelId` to understand hierarchy (e.g. Credentials parent for BCBA / RBT NY).

### Known label output artifacts

| File | How produced | What it contains |
| --- | --- | --- |
| [`output_files/all_labels_v2.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/all_labels_v2.json) | `orglabels 4467195 all_labels_v2` | **108** org label definitions — stale as of 2026-10-27. Use `all_labels_v3.json` |
| [`output_files/all_labels.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/all_labels.json) | Earlier org/partial run | **39** labels — subset of `all_labels_v2` (all IDs in this file exist in v2) |
| [`output_files/all_labels_control_4778844.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/all_labels_control_4778844.json) | `4778844 all_labels_control_4778844` | **Client** record labels only (e.g. All Clients, CO Client) |
| [`output_files/client_label.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/client_label.json) | `4771364 client_label` | **One contact’s** assigned labels (employee-style set on that ID) — not the full catalog |

### Employee labels — what was and was not exported

| Question | Answer |
| --- | --- |
| Full org list including employee label **definitions**? | **Yes** — in `all_labels_v2.json` (BCBA, RBT NY, BT NY, All Employees, Clinical, NY/CO Employee, etc.) |
| Dedicated file with **only** employee labels filtered? | **No** — filter from `all_labels_v2.json` by name/parent (e.g. parent Credentials `1052612`) if needed |
| Per-contact label export for BCBA `4778843` or RT/RBT `4737831`? | **Not present** in `output_files/` — run `node get_all_labels.js <id> labels_<id>` to generate |
| Label IDs in sync code match exports? | **Yes** — compare `CR_EMPLOYEE_LABELS` / `CR_CLIENT_LABELS` in Pipedream files and Azure `centralReach.mjs` to `all_labels_v2.json` |

The example IDs below are the Pipedream prototypes against `all_labels_v2.json`. Current Azure IDs are in the 2026-10-27 follow-up.

**Example employee label IDs used in BT/RBT sync** ([`rtbt.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/step_2_rt/rtbt.js)):

| Constant | labelId | Name in catalog |
| --- | --- | --- |
| ALL_EMPLOYEES | 1052618 | All Employees |
| BT_NY | 1052630 | Behavior Technician NY |
| RBT_NY | 1052631 | RBT NY |
| CLINICAL | 1052643 | Clinical |
| NY_EMPLOYEE | 1107685 | (NY Employee — verify name in v2 export) |
| CO_EMPLOYEE | 1107687 | CO Employee |
| RBT_CO | 1107692 | RBT CO |

**Example BCBA employee labels** ([`bcba_step_2_workflow.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/bcba_step_2_workflow.js)): ALL_EMPLOYEES `1052618`, BCBA `1052629`, CLINICAL `1052643`, NY_EMPLOYEE `1107685`, CO_EMPLOYEE `1107687`.

**Example client labels** ([`hs-to-cr-sync.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/pipe_dream/hubspot_centralreach_sync/hs-to-cr-sync.js)): ALL_CLIENTS `1052619`, NY_CLIENT `1082499`, CO_CLIENT `1082500`.

### Where label discovery is logged

| Destination | Contents |
| --- | --- |
| [`logs/get_all_labels.log`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/logs/get_all_labels.log) | Token org ID, request URLs, HTTP status, output path, full API errors |
| **Terminal** | `Response written to …`, success/failure messages |
| **`output_files/`** | JSON artifacts |

**Known failed per-contact runs (404):** contact IDs `4770887`, `4800592` on `GET /contacts/{id}/labels` — details in `get_all_labels.log`.

---

## Core contact fields (non-metadata)

For completeness when distinguishing metadata vs core fields:

| Entity | GET (core) | Doc |
| --- | --- | --- |
| Client | `/contacts/client/{ContactId}` | [ClientByContactIdGetRequest](https://centralreach.com/resources/api/requests/#/Client%20Management/ClientByContactIdGetRequestcontactsclientContactId_Get) |
| Employee | `/contacts/employee/{ContactId}` | [EmployeeByContactIdGetRequest](https://centralreach.com/resources/api/requests/#/Employee%20Management/EmployeeByContactIdGetRequestcontactsemployeeContactId_Get) |

Implemented in [`centralreach-client.js`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/src/clients/centralreach-client.js). Phone/cell typically appear as `phoneCell` on core contact JSON, **not** in metadata exports.

**Field location guide (UI / DW2, not API names):** [`Contact Core fields and Entity locations in Central Reach.md`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/central_reach_docs/Contact%20Core%20fields%20and%20Entity%20locations%20in%20Central%20Reach.md)

**Auth overview:** [`cr_api_docs.md`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/central_reach_docs/cr_api_docs.md)

---

## Agent validation checklist

1. **Metadata field ID** — Open the relevant `usemetadata_*.json` or `metadata_*.json`; confirm `fieldId` and `fieldName`; cross-check Azure `centralReach.mjs` or Pipedream `CR_META_FIELDS` / `BCBA_METADATA_FIELD_IDS`.
2. **Label ID** — Open `all_labels_v2.json`; search by name; cross-check `CR_CLIENT_LABELS` / `CR_EMPLOYEE_LABELS`.
3. **Re-fetch if stale** — Run the CLI commands above from `central_reach_test_integration` with a valid sandbox contact ID in the current org tied to `.env` credentials.
4. **Per-contact labels** — Do not confuse org catalog (`all_labels_v2.json`) with assigned labels (`all_labels_control_4778844.json`, `client_label.json`).
5. **Sync runtime** — Label/metadata **writes** in Pipedream may log to `logs/meta_logs`; that is not a substitute for GET discovery exports.

---

## Gaps and follow-ups (for agents)

- Generate missing per-employee label snapshots: `node get_all_labels.js 4778843 labels_4778843` and `node get_all_labels.js 4737831 labels_4737831`.
- Prefer **`all_labels_v3.json`** over `all_labels_v2.json` and `all_labels.json` for mapping. See the 2026-10-27 follow-up.
- Optional: produce a filtered `employee-label-catalog.json` derived from `all_labels_v2.json` (Credentials subtree + All Employees + state employee labels) — not generated yet.
- When implementing in Azure, update [`hubspot-centralreach-field-mappings-current-state.md`](hubspot-centralreach-field-mappings-current-state.md) if constants or mappings change.

---

## Change log

| Date | Change |
| --- | --- |
| 2026-10-27 | Initial write-up: metadata + labels discovery scripts, artifacts, API links, agent checklist |
| 2026-10-27 | Follow-up: refreshed org catalog, aligned constants, created sandbox HubSpot properties. See below |

---

## 2026-10-27 follow-up

### Files refreshed

Run from `central_reach_test_integration` with that repo’s `.env` credentials.

| File | Command / request | Result |
| --- | --- | --- |
| [`output_files/all_labels_v3.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/all_labels_v3.json) | `node get_all_labels.js orglabels 20261027 all_labels_v3` | 95 org labels. Replaces `all_labels_v2.json` (108 labels) for ID lookup |
| [`output_files/metadata_configuration_org.json`](file:///Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration/output_files/metadata_configuration_org.json) | `GET /contacts/metadata-configuration` | 58 field definitions (`metadataConfigFields`) |

`all_labels_v2.json` is kept. Do not use it for new IDs. CO Client `1082500` and NY Employee `1107685` are in v2 and absent from v3.

### Constants updated

[`src/constants/centralReach.mjs`](../src/constants/centralReach.mjs) now matches v3 and the org metadata config.

| Constant | Was | Live v3 / config |
| --- | --- | --- |
| `CO_CLIENT` | 1082500 | **1132648** CO Client |
| `NY_EMPLOYEE` | 1107685 | **1132655** NY Employee |
| `BCBA` | 1052629 | **1130668** header BCBA. `1052629` is now `BCBA_LBA_NY` |
| `ASD_DIAGNOSIS_DATE_SECONDARY` | 138701, misnamed | Renamed `ASD_DIAGNOSIS_DATE_MEDICAID_FFS_NY`. Live name is Date of Most Recent ASD Diagnosis Medicaid FFS NY. There is no secondary-diagnosis metadata field |

Verified new label constants include Active Client `1125427`, In-Active Client `1121488`, NJ Client `1132647`, NJ Employee `1107686`, BCBA Colorado `1124246`, BCBA LBA NJ `1124245`, GRAD Student- LBA NY `1092164`, Behavior Technician CO `1132650`, Behavior Technician NJ `1132652`, RBT NJ `1132651`, plus the funding and onboarding labels that are in v3. **Staffed** is not in the 95-label catalog. **Active Case Load** is not in the 58 metadata fields.

New metadata constants include Care Coordinator `138851`, Reassessment BCBA `144602`, Grad Permit Holder `136052`, Service Location Address `137697` (textarea), Service Location Address 2 `138091`, Important Information- Parent `138378`, Referral Source `126222`, Diagnosis `144793`, Referring Physician Medicaid ID `141233`, Secondary Insurance `144600`, Secondary Insurance ID `144601`.

Mappers still apply the labels they already applied (All Clients, NY/CO Client, employee state labels, header BCBA). The new label and metadata constants are available and are not wired into every guide row yet.

[`src/constants/staffingAssociations.mjs`](../src/constants/staffingAssociations.mjs) excludes sandbox Potential `100` (Case → BCBA) and `130` (Case → BT/RBT). `SANDBOX_STAFFING_ASSOCIATION_TYPE_IDS.RE_BCBA` is **161** (Case `0-3` → BCBA `2-55656302`). The paired BCBA → Case id is 162.

### HubSpot creates (sandbox portal 50850427)

Created with [`scripts/create-sandbox-hubspot-properties.mjs`](../scripts/create-sandbox-hubspot-properties.mjs) and [`scripts/sandbox-hubspot-properties.json`](../scripts/sandbox-hubspot-properties.json). Re-running the script skips properties that already exist.

**Created (string or number, no option list):**

| Object | Object type id | Internal name |
| --- | --- | --- |
| Case | `0-3` | `ongoing_central_reach_provider_supplier`, `work_schedule_details`, `btrbt_work_schedule_2_details`, `work_schedule_1_details__for_location_2_other`, `work_schedule_2_details__for_location_2_other`, `finalized_client_service_hours_post_assessment`, `client_service_hours_total`, `n97153_approved_assessment_hours_auth_req`, `ia_hours_from_the_ia`, `full_home_address`, `service_address__other`, `allergies__yes__explain`, `diagnosis_other`, `referring_provider_medicaid_id`, `insurance_id_2`, `insurance_2__other__summary` |
| BCBA | `2-55656302` | `external_system_id`, `first_name`, `last_name`, `ucaba_email_address`, `postal_code_home` |
| BT/RBT | `2-55656309` | `external_system_id` |

**Association label created:** Case → BCBA **RE BCBA**, type id **161**.

`insurance_id_2` was created as a normal single-line text property in group `insurance`. It is in the production sensitive-data tier on portal `50317927` (Integration V2 API rule #2). Portal `50850427` is a developer test account and cannot store sensitive properties, so `non_sensitive` here is expected. Do not recreate it to change sensitivity. `REQUIRED_DEAL_PROPERTIES` still requests `insurance_id_2`. It does not request `insurance_id_3` or `insurance_id_4`: those are sensitive in production and are not synced. The truncated name `if_services_will_be_in_more_than_one_location__list_the_other_addres` is not a property on either portal. The fetch uses the full `address` name.

**Enumerations created on Oct 27, 2026.** Options were copied from production portal `50317927` and confirmed on sandbox `50850427`. Option counts, labels, internal values, hidden flags, and display order match production.

| Object | Object type id | Internal name | Type | Options |
| --- | --- | --- | --- | --- |
| Case | `0-3` | `initial_auth_tracks` | enumeration / select | 2 |
| Case | `0-3` | `maladaptive_behaviors__parentguardian` | enumeration / checkbox | 8 |
| Case | `0-3` | `phi_diagnosis` | enumeration / radio | 5 |
| Case | `0-3` | `referral_source` | enumeration / select | 14 |
| BCBA | `2-55656302` | `co_insurance_labels` | enumeration / checkbox | 4 |
| BCBA | `2-55656302` | `work_status` | enumeration / select | 2 (`Salaried`, `Hourly`) |
| BCBA | `2-55656302` | `assign_states` | enumeration / checkbox | 3 |
| BCBA | `2-55656302` | `lba_licensure__ny` | enumeration / select | 4 (`Will Apply` stores `No`) |

`phi_diagnosis` is sensitive HIPAA data in production (`Yes-F84.0` stores `Yes`). Creating it as sensitive on portal `50850427` returned `403 Missing required scope for: sensitive-data-property-create`. That portal is a developer test account and cannot store sensitive properties. The sandbox property has the same options and stays `non_sensitive`. Do not recreate it to change sensitivity.

`referral_source` is calculated and read-only in production. The properties API did not return a calculation formula, so the sandbox property is a writable dropdown with the same 14 options, including the four hidden options.

### Remaining manual steps

- Leave sandbox `insurance_id_2` and `phi_diagnosis` as `non_sensitive`. Portal `50850427` cannot store sensitive properties. Production portal `50317927` keeps the Integration V2 API rule #2 Case fields sensitive. The deal GET needs `crm.objects.deals.sensitive.read`. The list is in [`Sandbox props & labels_summary.md`](Sandbox%20props%20%26%20labels_summary.md) and in the comments on `REQUIRED_DEAL_PROPERTIES`.
- Recreate sandbox `referral_source` as the production calculation once that formula is available. The option list is already in place.
- Create the multi-location Case property `if_services_will_be_in_more_than_one_location__list_the_other_addres` if that workflow copy is still required, then put it back on the deal GET list.
- CentralReach still has no Staffed label and no Active Case Load metadata field.
- Point the client and employee mappers at the new guide properties and the new label constants when those rows are in scope. This follow-up fixed stale IDs, added constants, and created the sandbox properties. It did not switch schedule, availability, or auth reads off the sandbox stand-in properties.

---

## 2026-10-27 mapper wiring

Client and employee mappers now read the sandbox guide properties that exist on portal `50850427`. Schedule, availability, auth hours, parent maladaptive behaviors, diagnosis, secondary insurance, service location, and the Active / In-Active / NJ / Home labels are wired. Old stand-ins (`assigned_hours`, `authorized_hours`, `auth_start_date`, `auth_end_date`, `bt_work_schedule_confirmed`, `street_address`, `bcba_name`, `work_email`, `credentialed_insurances__ny`) remain fallbacks.

Case sync runs only when `enter_in_central_reach` contains the token `Yes`. A blank or other checkbox value is logged and skipped. No Staffed label is applied.

### Properties that were missing, then created the same day

The first mapper pass skipped these because they were not on portal `50850427`. The property follow-up below created the Case and BCBA rows as writable stand-ins. The deal GET now requests `location` and `stateregion`.

| Object | Internal name | Current state |
| --- | --- | --- |
| Case | `location`, `stateregion`, `reassessment_bcba_name`, `total_hours_bt1bt2_work_schedule`, `ongoing_auth_period_start_date`, `ongoing_autrh_period_end_date` | Created Oct 27. Production `location`, `reassessment_bcba_name`, and `total_hours_bt1bt2_work_schedule` are calculated. The formulas were not copied. `reassessment_bcba_name` writes metadata `144602`. |
| Case | `if_services_will_be_in_more_than_one_location__list_the_other_addres` | Not a property on portal `50317927` or `50850427`. The fetch uses the full `address` name, which is already on the portal. The payload prefers `full_home_address`, then `service_address__other`, then that field, then `street_address`. |
| BT/RBT | `ucaba_email_address`, `assign_states`, `lba_licensure__ny`, `work_status`, `ny_insurance_labels`, `nj_insurance_labels`, `co_insurance_labels` | Not created. Those properties are not on production object `2-48354559`. |
| BCBA | `city_home`, `state_home`, `apartment__home` | Created Oct 27 as writable stand-ins. The production copies are calculated. |

`important_information` does exist on the Case and is written to Important Information- Parent `138378`. `nj_insurance_labels` is fetched on the BCBA and is not mapped: guide section 8 has no CentralReach label for it. NJ/CO payor checkbox values other than `MCD-CO` / the NY credential tokens are not written onto onboarding or billing-hold labels.

### Still manual

- Leave sandbox `insurance_id_2` and `phi_diagnosis` as `non_sensitive`. Portal `50850427` cannot store sensitive properties. The production list is Integration V2 API rule #2 on portal `50317927`.
- Recreate sandbox `referral_source` as the production calculation once that formula is available. The mapper reads the current dropdown and writes CentralReach metadata `126222`.
- CentralReach still has no Staffed label. `staffing_status` is fetched and not turned into a label.

2026-10-27 property follow-up: created sandbox Case `location` (writable select; production calculated, no formula), `stateregion`, `reassessment_bcba_name` (writable text; production rollup, no formula; metadata `144602`), `total_hours_bt1bt2_work_schedule` (writable number; production formula was the placeholder `1 + 1`), `ongoing_auth_period_start_date`, and `ongoing_autrh_period_end_date`, plus BCBA `city_home`, `state_home` (50 options), and `apartment__home`. Deal fetch now includes `location`, `stateregion`, and `if_services_will_be_in_more_than_one_location__list_the_other_address` (already on the portal; the truncated `addres` name is not in production). Employee sync skips unless `entered_in_centralreach` contains `Yes`. Still blocked: real calculation formulas and the Staffed label. Sensitive flags are not a sandbox task. BT/RBT `ucaba_email_address`, `assign_states`, `lba_licensure__ny`, `work_status`, and the insurance-label properties are not on production object `2-48354559`, so they were not created.
