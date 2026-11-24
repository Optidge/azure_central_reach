# Feedback review: Care Coordinator, Location #2, O-18/O-19, metadata formats (2026-11-23)

Review of Zeke's 2026-11-23 feedback on `DECISIONS-EVIDENCE-CASES-2026-11-23.md` items 3, 5, 6 and 7, plus the text formats in item 3 (section 3 table). Deployed commit `655b385`. Nothing was written to HubSpot, CentralReach, Azure or `src/`.

**What was read.**

- HubSpot sandbox `52311591` (portal confirmed by `get_user_details`): property definitions, the round-4 test Case, its property history, the Team Member object. HubSpot MCP, read-only.
- The client guide on Drive (file `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`, read 2026-11-23, tab `t.0`) and `guide-extract-2026-11-20.md`.
- Earlier production evidence from this session (no new production call): `case-out-1.txt`, `case-out-scan.txt`, `case-out-crwide.txt` in the session scratchpad, from `case-evidence.mjs` (2026-11-23 ~18:40 UTC).
- `docs/workstreams/architecture-update/cr-catalog-snapshot.json` (CR metadata fields, taken 2026-11-20).

**What could not be read.** Two guarded read-only scripts were refused by the app's permission check (it blocks scripts that load `local.settings.json` / `.env`):

- the sandbox workflow read (`GET /automation/v4/flows/{id}`); the HubSpot MCP has no workflow tool;
- the new production and CR read (Case property existence and CR format details below).

Both scripts are ready for Zeke to run (section 7). Every point that depends on them is marked **pending**.

"Guide line N" means `guide-extract-2026-11-20.md` line N; "Drive t.0 line N" means the live Drive tab as extracted today.

## Summary

| Item | Spec | Created where | Code |
|---|---|---|---|
| C10 Care Coordinator (Meta 138851) | `care_coordinator_first_name` + " " + `care_coordinator_last_name`, sent only when `coordinator_export_status` = `ready` | Production Case: the new properties and the Case workflow (pending existence check) | Yes |
| C10 email | No CR client field. Not sent | CR field only if United Care wants it | No |
| B11 BCBA Care Coordinator | Same rule on the BCBA record | **CR employee field must be created**; production BCBA properties and workflow must be created | Yes, after the CR field ID exists |
| Owners API | Replaced by the Team Member directory + Zeke's workflows. The integration reads only the record's own properties | — | Remove the owners dependency |
| O-14 Location #2 | Right names, 0 filled. Do not map now | — | No |
| O-18 per-BT hours | Not marked required. Already read as the C20 inputs | — | No |
| O-19 `insurance_id_3`/`_4`, Unsure pair | Not marked required. No CR target | — | No |
| C26 Allergies | `None` / `Yes (<text>)` / `Yes` | — | Yes |
| C31 Physician / NPI | `<name> <npi>`, one space, no comma | — | Yes |
| C24 Service address | `<street> <apt>` + line break + `<city> <ST> <zip>` | — | Yes |
| Other mismatches | Maladaptive `;` → `, ` (yes); C19 hours suffix, Severity, Address 2 cleanup (questions) | — | Maladaptive yes |

---

## 1. Care Coordinator (C10, O-17, B11)

### 1.1 What Zeke built (sandbox)

The workflows themselves could not be read (see above). Their output was read from the properties they write and from record history.

**The directory.** Custom object **Team Members** (`p52311591_team_members`, `2-72890324`): "Staff directory: one record per HubSpot user". Properties: `hubspot_user` ("The HubSpot user this record belongs to. Automations match on this"), `first_name`, `last_name`, `email`, `display_name`, `active`, `role`, `office_extension`, `texting_number`.

**What the workflows write.** The same five properties exist on the Case and on the BCBA (`2-72890322`):

| Property | Type | Description (abridged) |
|---|---|---|
| `care_coordinator_first_name` | text | "derived exclusively from this record's owner through the unique active Team Member HubSpot User mapping and verified First Name" |
| `care_coordinator_last_name` | text | same, Last Name |
| `care_coordinator_email` | text | Case: "Case owner's email from their Team Member record". BCBA: "…staff Email. Never BCBA Liaison, associated Case owner, or clinician details" |
| `coordinator_export_status` | dropdown | `refreshing`, `ready`, `no_owner`, `missing_match`, `duplicate_match`, `inactive`, `incomplete`, `error`. "Blank or any value other than ready blocks export." |
| `coordinator_export_source_snapshot` | text | "owner identity, directory record identity, and a version/fingerprint of the verified source values" |

The older Case property `care_coordinator_name` (the code's source today, decision 39) also exists: "Written by the Care Coordinator Change workflow".

**What ran in the sandbox.**

- One Case has a status: round-4 Case `68592605796` ("CR Azure Test R4"). History: `refreshing` then `missing_match`, 0.4 s apart, at 19:00:46 UTC. The writer is shown as source "Integration", app `central_reach_sandbox`. Our code never writes this property, so this is most likely the Case workflow's custom code action using that app's token (inferred).
- Its first name, last name and email are blank.
- **The sandbox has 0 Team Member records**, so every Case and BCBA will end at `missing_match`. No BCBA has a status yet.
- **To test C10/B11 in the sandbox,** Zeke must add one Team Member record for the test owner (owner `161391908`, `active` = true, first/last/email filled).

### 1.2 Spec: C10 (Case → Meta 138851 "Care Coordinator")

**Source properties (Case):** `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`.

**Output.**

| `coordinator_export_status` | Meta 138851 |
|---|---|
| `ready` | `"<first> <last>"`, trimmed, one space. If one name is blank, send the other. Both blank: treat as not ready |
| `no_owner` | blank. A blank clears only a value the integration wrote (`mappedState.mjs:193-209`) |
| anything else, or blank | **field omitted** (not sent, not cleared, saved hash kept, row 3.18), plus a warning `care_coordinator_not_ready` that names the status, never a name |

- **Why "First Last".** CR holds first name only ×33, "First Last" ×25 and lowercase ×17 of 75 filled. No form is dominant, and "First Last" is the most useful.
- The first sync overwrites the 69 stale values (item 5 of the evidence doc). This is expected; tell United Care.
- **Email.** CR has no client email field for the coordinator: the 59 metadata fields were listed live, and the catalog snapshot shows none. `care_coordinator_email` is not sent.

**Code changes (when approved).**

- `src/mappings/client/clientProperties.mjs:83-84`: replace `care_coordinator_name` with the three properties above.
- `src/mappings/client/buildClientMetadata.mjs:418-421`: build 138851 from first + last.
  - Export `careCoordinatorFieldOmitted(dealProps)` next to `staffRolesWithoutName` (`:192-197`). It returns true when the status is not `ready` and not `no_owner`.
  - On `no_owner`, send `null`.
- `src/workflows/clientSyncInputs.mjs:125-133` (`omitFieldIdsFor`): add `CARE_COORDINATOR` (138851) when `careCoordinatorFieldOmitted(deal.properties)` is true. The caller is `clientSyncWorkflow.mjs:538`; pass the deal in.
- Production Case workflow (W1 trigger list): watch `care_coordinator_first_name`, `care_coordinator_last_name` and `coordinator_export_status`, **not** `hubspot_owner_id`.
  - If it watches the owner, the sync can run before the coordinator workflow has refreshed the names and send the old coordinator.

**Simplicity note.** The property descriptions say "Ready also requires comparison of the source snapshot against the current owner and directory values."

- If the integration has to do that comparison, it must read the owner and the Team Member record again. That brings back the owners read this design removes.
- **Recommendation:** keep that check inside Zeke's workflow, which sets `refreshing` whenever the owner or directory entry changes, and have the integration trust `ready`.
- The integration does not read `coordinator_export_source_snapshot`.

**Test cases (`src/tests/smoke/clientMetadataMapping.test.mjs`).**

| Input | 138851 |
|---|---|
| status `ready`, first "Ann", last "Lee" | "Ann Lee" |
| `ready`, first "Ann", last blank | "Ann" |
| `ready`, both blank | omitted + warning |
| `no_owner` | `null` |
| `missing_match` / `refreshing` / blank | omitted (key absent; `omitFieldIdsFor` returns 138851) |
| `care_coordinator_name` filled, status blank | omitted (the old property is no longer read) |

### 1.3 Spec: B11 (BCBA → CR employee "Care Coordinator")

**There is no CR target today.** The 22 employee/generic metadata fields in `cr-catalog-snapshot.json` (2026-11-20) are listed below; none is a coordinator field:

- 126205, 126208, 126211, 126212, 126213, 126215, 126216, 126217, 126218, 126221;
- 133819, 134444, 134445, 134446, 134466;
- 138069, 138112, 138113, 138703, 140495, 144603, 147882.

**Must be created in CR (Danny / United Care):** an Employee metadata field "Care Coordinator" (`input`). Add "Care Coordinator Email" only if United Care wants the email in CR.

**Source properties (BCBA):** `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`, and `care_coordinator_email` only if the email field is created. The status rule is the same as C10.

**Code changes (once the CR field ID exists).**

- `src/constants/centralReach.mjs:37-48`: add `CARE_COORDINATOR: <id>` to `CENTRAL_REACH_EMPLOYEE_METADATA_FIELDS`.
- `src/mappings/employees/employeeProperties.mjs:74-102`: add the properties to `BCBA_PROPERTIES.mapped`.
- `src/mappings/employees/employeeProperties.mjs:150-156`: add the field to the BCBA list in `knownMetadataFieldIds`.
- `src/mappings/employees/buildEmployeePayload.mjs:319-336`: add the value, "First Last" on `ready`, `null` on `no_owner`.
- `src/workflows/employeeSyncWorkflow.mjs:741-749`: add the field ID to `omitFieldIds` when the status is anything else.
  - On the employee side, a field missing from the mapper is sent as a blank, so the omit list is required here, not optional.
- Production BCBA workflow: watch the same three properties.

**Test cases (`employeePayloadMapping.test.mjs`):** the same five rows as C10, on a BCBA record.

### 1.4 What replaces the owners API

The integration no longer reads the owner, so it does not need `crm.objects.owners.read`.

- The Team Member directory and Zeke's two workflows resolve owner → name/email inside HubSpot.
- The integration reads three properties on the record it already fetches, with no extra API call.
- OPEN-ITEMS row 75 (owners scope) can close for both the Case and the BCBA once this is built. This review did not edit OPEN-ITEMS.

### 1.5 Do the properties exist in production?

| Object | Property | Production |
|---|---|---|
| Case | `care_coordinator_name`, `care_coordinator_email` | **Exist** (created 2026-10-01; filled on 2,413 / 2,414 in-scope Cases) |
| Case | `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`, `coordinator_export_source_snapshot` | **Pending.** Not in the earlier read's property list; this session's re-check was refused. Run section 7 |
| BCBA | all five coordinator properties | **Do not exist.** The 2026-11-23 18:40 read listed every BCBA property whose name or label contains "coordinator": none |
| Team Member object | — | Pending. `care_coordinator_name`'s production description says "from their Team Member record", so a directory probably exists |

**Before cutover, Zeke must:**

1. Create in production the BCBA properties and the Case properties that are missing.
2. Rebuild the two workflows (sandbox `1932723082` BCBA, `1933886108` Case) in production.
3. Make sure every Care Coordinator owner has an active Team Member record.
4. Backfill: enrol all in-scope Cases and BCBAs once, so the status is `ready` before the first sync. Otherwise C10 is omitted everywhere and the 69 stale CR values stay.

---

## 2. O-14 Location #2

**Guide names.**

- Guide line 359 / Drive t.0 line 120: `work_schedule_1_details__for_location_2_other`, `work_schedule_2_details__for_location_2_other`, "Use the corresponding Location #2 variant when the BT works there."
- Guide line 364 / 513: `service_address__other` (Location #2-Other) → Service Location Address 2.
- Guide line 384 / 885: `if_services_will_be_in_more_than_one_location__list_the_other_address` (copy destination; the source field is unnamed).

**The earlier worker used exactly these names.** Production (`case-out-1.txt:20-24`, `case-out-scan.txt:86-94`):

| Property | Exists | Filled (all / in scope / Warm / entry = Yes) |
|---|---|---|
| `work_schedule_1_details__for_location_2_other` | yes (created 2026-04-20) | 0 / 0 / 0 / 0 |
| `work_schedule_2_details__for_location_2_other` | yes (created 2026-04-20) | 0 / 0 / 0 / 0 |
| `if_services_will_be_in_more_than_one_location__list_the_other_address` | yes | 1 / 1 / 1 / 0 |
| `service_address__other` | yes | 2,555 / 2,464 / 1,519 / 409 |
| `specific_home_location` = More Than One Location | — | 25 in scope; 0 with a Location #2 schedule |

**Related properties the guide does not name.** They were found in the sandbox; their production fill is **pending** (section 7):

- `location_2_confirmed_services_hours` "Location 2 CF Services Hours" (exists in production);
- `btrbt2_service_hours_what_location` "BT/RBT2 Service Hours What Location?";
- `explain__more_than_one_location_`, `n2_bts_and_number_of_locations`, `btrbt_count__location`, `does_your_child_live_in_more_than_one_location_`.

If one of these is filled, staff may record Location #2 hours there instead.

**Target CR fields.** There is no separate Location #2 schedule field. The Location #2 variants would feed Work Schedule #1 `132304` / #2 `138093`. The address feeds Service Location Address 2 `138091` (C25, already built).

**Recommendation.** Do not map the Location #2 schedules now: 0 filled, and nothing in HubSpot says "the BT works at Location #2". Revisit if the pending fill check finds data in the related properties.

---

## 3. O-18 per-BT hours, O-19 `insurance_id_3`/`_4` and the Unsure pair

**Does the guide mark them required? No.**

- The only "required" section is "CentralReach required create fields" (guide line 321 / Drive t.0 line 87). It lists ContactForm, ExternalSystemId, FirstName, LastName, PrimaryEmail and DateOfBirth. None of these three items is there.
- **Per-BT hours.** Guide line 361: "Read the calculated total and per-BT hours as applicable." Line 509: "Per-BT hours: hours_bt_work_schedule_1 and hours_bt_work_schedule_2."
  - They are inputs of Total Assigned Hours (C20), not a CR field of their own.
  - The code already reads them as the C20 inputs (`buildClientMetadata.mjs:44-65`; `bt_rbt_2_work_schedule` replaces the stale `hours_bt_work_schedule_2`, evidence item 2).
- **`insurance_id_3`/`_4`.** Guide line 382: "The Client mapping covers insurance_id_1 and insurance_id_2. In sandbox 52311591, insurance_id_3 exists and its Client mapping is pending. The sandbox property inventory did not return insurance_id_4. Omit insurance_id_4 …"
  - That is "pending", not required, and CR has only Primary `131316` and Secondary `144601` insurance ID fields.
  - Sandbox today: `insurance_id_3` exists; `insurance_id_4` does not.
- **Unsure.** Guide line 371: "Pick the Medicaid or commercial physician/NPI pair by insurance type." Unsure is not mentioned.
  - 4 in-scope Cases, 2 with entry = Yes. A blank is skipped, so CR keeps its value.

**Recommendation.** Close O-18 ("used as the C20 inputs") and O-19 ("no CR target; not required"). Nothing to create. If United Care later wants a 3rd insurance ID in CR, it needs a new CR client field (decision 27) and one line at `buildClientMetadata.mjs:410-412`.

---

## 4. C26 Allergies (Meta 126214)

**CR formats** (163 API-visible clients; 10 are old test clients). Filled on 132:

| Shape | Count |
|---|---|
| "None" | 64 |
| "Yes (`<text>`)" | 18 |
| "none" | 10 |
| "Confirmed" | 10 |
| one free word | 6 |
| "N/A" | 4 |
| "No" | 3 |
| other shapes (not in the top 7) | 17 |

"None" in any case is 74 of 132 (56%). "Yes (…)" is the only Yes form. A bare "Yes", "Yes, …", "Yes - …" and "Yes(" without a space are not in the top shapes; their exact counts are **pending** (section 7).

**HubSpot:** `allergies` stores `Confirmed` (shown "Yes") or `Denial` (shown "No"); `allergies__yes__explain` is free text.

**Transformation.**

| `allergies` | explain | Meta 126214 |
|---|---|---|
| `Denial` | any | `None` (the explanation is ignored) |
| `Confirmed` | filled | `Yes (<explain>)`: one space before "(", explain trimmed, runs of whitespace and line breaks collapsed to one space |
| `Confirmed` | blank | `Yes` |
| blank or any other value | — | `null` (blank; clears only a value the integration wrote) |

**Code.** `src/mappings/client/buildClientMetadata.mjs:123-134` (`getKnownAllergies`; the brief cited 127-131):

```js
if (allergies === "Confirmed") {
  const explain = toTrimmedOrNull(dealProps.allergies__yes__explain)?.replace(/\s+/g, " ");
  return explain ? `Yes (${explain})` : "Yes";
}
if (allergies === "Denial") {
  return "None";
}
```

Also update the comment at lines 123-124 ("Assumed text format (O-28)" → the CR format).

**Test cases (`clientMetadataMapping.test.mjs`).**

| Input | Expected |
|---|---|
| `Confirmed`, "Peanuts" | "Yes (Peanuts)" |
| `Confirmed`, "  Peanuts,\n tree nuts " | "Yes (Peanuts, tree nuts)" |
| `Confirmed`, blank | "Yes" |
| `Denial`, blank | "None" |
| `Denial`, "Peanuts" | "None" |
| blank | `null` |
| "Unsure" | `null` |

---

## 5. C31 Physician / NPI (Meta 131151) and C24 Service address (Meta 137697)

### 5.1 C31 Physician / NPI

**CR formats.** Filled on 134:

| Shape | Count | Meaning |
|---|---|---|
| "`<name words>` 9999999999" | 93 | **no comma**, one space before the 10-digit NPI |
| "A. `<name words>`, 9999999999" | 18 | "Dr. …" with a comma |
| test clients | 10 | |
| other | 13 | name only, NPI only, "A. A 9999999999" ×1 |

The NPI is always last. Whether the 93 include credentials (MD, DO, NP) is **pending**: the earlier shape masked them.

**HubSpot:** `physician_name` (label "Dr. FIRST & LAST Name - Medicaid") + `npi_number`, or `physician_name__commercial` + `npi_number__commercial`. The pair is chosen by `n1_what_type_of_insurance` (unchanged).

**Output.** `<name> <npi>`, joined by **one space**, no comma.

- Name only: `<name>`. NPI only: `<npi>`. Both blank, Unsure or blank type: `null`.
- Trim each part, and drop a trailing `,` from the name so a typed "Dr. Ann Lee," does not give "Dr. Ann Lee, 1234567890".

**Code.** `buildClientMetadata.mjs:86-97` (`getPhysicianCredentialsByInsuranceType`).

- Replace the two `joinMetadataParts([...])` calls (`:89`, `:93`) with a small `joinWithSpace([name, npi])`.
- Leave `joinMetadataParts` (`:18-21`) as it is: C19 and C33 still use it.

**Test cases.**

| Type | Name | NPI | Expected |
|---|---|---|---|
| Medicaid FFS | "Dr. Ann Lee" | "1234567890" | "Dr. Ann Lee 1234567890" |
| Commercial OON | "Bo Kim MD" | "1098765432" | "Bo Kim MD 1098765432" (commercial pair) |
| Medicaid FFS - CO | "Dr. Ann Lee," | "1234567890" | "Dr. Ann Lee 1234567890" |
| Medicaid FFS | "Dr. Ann Lee" | blank | "Dr. Ann Lee" |
| Medicaid FFS | blank | "1234567890" | "1234567890" |
| Unsure / blank | any | any | `null` |

### 5.2 C24 Service Location Address (Meta 137697, a `textarea`)

**CR formats.** Filled on 68 (10 are test clients). The top real shapes are all **two lines**:

| Shape | Count |
|---|---|
| "9999 99a… ⏎ A… 99999" | 7 |
| "999 A… ⏎ A… 99999" | 7 |
| "9999 A… ⏎ A… 99999" | 5 |
| "99 A… ⏎ A… 99999" | 4 |
| "9999 A… 9A ⏎ A… 99999" | 3 |
| "9999 A…, A 99999" (one line, comma) | 4 |

- Line 1: house number, street, then the apartment with **no "Apt#" and no comma** (NY sample: "999 A 999a A 9A").
- Line 2: city, then the ZIP, with no comma. NY sample line 2: "A A 99999", consistent with "City NY 99999".
- **Pending** (section 7): whether CR stores `\n` or `\r\n`, and whether the state code is on line 2 on every record.

**What the code sends today:**

- Child's House: `full_home_address` as it is. In the sandbox's copied records this reads "`<street>`, ⏎Apt# `<apt>`, `<city>`, `<State name>` `<zip>`" or "`<street>`,  `<city>`, `<State name>` `<zip>`" (a workflow-built string: line break in the wrong place, "Apt#", full state name, commas).
- Other Location: the components comma-joined, with no state.

**Recommendation: build both from components.** Do not parse `full_home_address`.

In every sample, `full_home_address` is built from the Case's `street_address`, `home_apt`, `location_city`, state and `postal_code`, so the data is the same. Building from components avoids parsing a workflow-built string.

This changes the guide's source wording for Child's House (guide line 364): **Zeke to confirm.**

| `specific_home_location` | Line 1 | Line 2 |
|---|---|---|
| Child's House, More Than One Location | `street_address` + " " + `home_apt` | `location_city` + " " + `<ST>` + " " + `postal_code` |
| Other Location | `service__street_address` + " " + `service__apt` | `service__city` + " " + `<ST>` + " " + `service__postal_code` |
| anything else | `null` | |

- `<ST>` is the two-letter code from the Case `location` (New York → NY), read with `readStateCode` (`src/lib/fieldFormats.mjs:110`). There is no `service__state` property in the sandbox.
- Each part is trimmed and blanks are skipped. The apartment is sent as stored (sandbox values look like "19A", "APT 3", "Apt 4A").
- The two lines are joined by `"\n"` (switch to `"\r\n"` if the pending check shows CRLF). An empty line is dropped. Both empty: `null`.
- New properties to read: `street_address`, `home_apt`, `location_city`, `postal_code`. `location` is already read. Add them to `clientProperties.mjs:60-64` (next to the service address list).

**Code.** `buildClientMetadata.mjs:144-161` (`getServiceLocationAddress`): one helper `twoLineAddress({ street, apt, city, stateName, zip })` used by both branches.

**Test cases.**

| Input | Expected |
|---|---|
| Child's House, "101 Main St", "Apt 1A", "New York", location "New York", "10001" | "101 Main St Apt 1A\nNew York NY 10001" |
| Child's House, no apt | "101 Main St\nNew York NY 10001" |
| Other Location, "200 Service Rd", "Suite 2", "Denver", location "Colorado", "80202" | "200 Service Rd Suite 2\nDenver CO 80202" |
| Other Location, location blank | "200 Service Rd Suite 2\nDenver 80202" |
| Other Location, all service parts blank | `null` |
| `specific_home_location` blank | `null` |

---

## 6. Other multi-part strings checked against CR

| Field | CR (filled / top shapes) | Code today | Verdict |
|---|---|---|---|
| C33 Diagnosis 144793 (`:139-142`) | 10 / only the 10 test clients ("Yes, …") | "Yes-F84.0, `<other>`" | No real CR usage to match. **Keep.** 66 of 73 linked clients become newly filled |
| C19 Availability 126209 (`:354-358`) | 133 / "Yes" ×18, schedule text ("A - A 9a - 9a" …), bare hours "99" ×2. **No value has hours appended** | "`<schedule text>`, `<weekly hours>`" | **Mismatch.** The guide (line 360) says send both. **Question:** send the text only (matches CR), or keep ", `<hours>`"? |
| C14 Maladaptive 126207 (`:341-343`) | 29 / "A, a" ×18, "A" ×11: options joined by **", "** | the raw multi-checkbox value, e.g. "Aggression;Self-Injury" | **Mismatch: fix.** Split on ";" and join with ", ". Test: "Aggression;Self-Injury" → "Aggression, Self-Injury" |
| Severity 133826 (`:390-392`) | 31 / "9" ×20, "A 9" ×11 | "Level 2" | Partial. 31 linked clients are newly filled. **Question:** send "2" (CR majority) or "Level 2"? |
| C25 Address 2 138091 (`:163-167`) | 14 / free address text | `service_address__other` as is | Sandbox copies hold junk like ",  , New York " (built from empty parts). **Recommend:** send `null` when the value, without commas and spaces, is empty or only a state name. Affects 25 More Than One Location Cases |
| C23 Auth Period, C34 ASD dates | MM/DD/YYYY forms | MM/DD/YYYY | Match |
| Staff names C11/C14 | "First Last" | "First Last" | Match (C12 suffix is open in O-16) |

The "Mouthing Non Food Itemsth" stored value has a typo. Sending the label text before the dash ("Mouthing Non Food Items") is optional; a question for Zeke.

---

## 7. Pending reads (Zeke to run, read-only)

Both scripts are in the session scratchpad. Both check the portal first, allow only GET (plus CRM search, plus the CR token POST), and print definitions, counts and value shapes only.

```text
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
NODE_USE_ENV_PROXY=1 node /private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/feedback-formats-read.mjs
NODE_USE_ENV_PROXY=1 node /private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/cc-workflows-read.mjs
```

**`feedback-formats-read.mjs`** answers:

- whether the four new Case coordinator properties and the BCBA ones exist in production, and their fill;
- the fill of `location_2_confirmed_services_hours` and the other Location #2 properties;
- `insurance_id_3`/`_4` (may still 404 if the token lacks the sensitive scope);
- Case `allergies` × explain counts;
- CR: full Allergies shapes; Physician separator and credentials; address line break (LF/CRLF), line count and state presence; C19, Maladaptive and Severity shapes.

**`cc-workflows-read.mjs`** (sandbox) answers: the two workflows' triggers and actions, and which properties they set.

---

## 8. Questions for Zeke

1. **C24.** OK to build the service address from components (street, apt, city, state from `location`, ZIP) instead of `full_home_address`? The data is the same, and it avoids parsing the workflow's string.
2. **C10/B11.** OK for the integration to trust `coordinator_export_status = ready`, and leave the snapshot comparison to your workflow?
3. **B11.** Will Danny / United Care create a CR Employee "Care Coordinator" field, and an email field if wanted? A client "Care Coordinator Email" field too?
4. **C19.** Should Availability send the schedule text only (as CR holds it), or keep ", `<weekly hours>`"?
5. **Severity.** Should Severity send "2" or "Level 2"?
6. **Sandbox testing.** Add a Team Member record for your test owner so C10/B11 can reach `ready` in the sandbox.

---

## 9. Results of the pending reads (2026-11-23, ~20:00 UTC)

Read-only. HubSpot production `50317927` (portal checked first; GET + CRM search only), HubSpot sandbox `52311591` (GET only), CR production (GET only, plus the token POST). Counts and masked shapes only. Nothing was written anywhere; `src/` was not edited.

Scripts and outputs (session scratchpad): `feedback-formats-read.mjs`, `cc-workflows-read.mjs`, then `feedback-formats-read-2.mjs`, `split-test-read.mjs`, `split-test-read-2.mjs` and `address-cc-read.mjs`, each with a matching `.out`.

### 9.1 Correction: the earlier CR format evidence included our own test clients

- `feedback-formats-read.mjs` returned 0 filled for every CR field: its metadata reader looked for the value on the outer object, but CR nests it inside `metadataDefinitionAndValue`. `feedback-formats-read-2.mjs` is the same script with the reader fixed.
- CR now lists **199 clients**. **82 have "test" in the name** (36 "Azure Test", 46 other test names) and **10 more carry the old test values** (shape `A9A-A-A-9 …`). That leaves **107 real clients**.
- Several shapes in sections 4 to 6 came from those test clients, which the integration wrote itself:

| Field | On test clients | On real clients |
|---|---|---|
| Allergies 126214 | "Yes (Confirmed)" ×53 | **no "Yes" form at all** |
| Severity 133826 | "2" ×53, "1", "Level 2" | "3" ×1, "Level 3" ×1 |
| Physician 131151 | ", " separator ×64 | " " ×96 (one space) |

Sections 4, 5.1 and the Severity row of section 6 are superseded by 9.2 below.

### 9.2 CR formats on real clients (107)

**C24 Service Location Address 137697** (52 filled):

- Line break: **LF (`\n`)**. No CRLF anywhere.
- **2 lines on 51 of 52**; 1 is a single line.
- **State code on line 2 on all 51 two-line values** (NY). Line 2 is `<City> NY <ZIP>` with no comma.
- Line 1 is `<number> <street>`, then the apartment. **18 of 51 keep an apartment marker** as typed ("Apt 9A", "APT", "Apt.", "Apt#", "Unit 9", "#9"). This corrects 5.2 ("no Apt#"): the marker is kept as typed.

**C19 Client Availability 126209** (104 filled): **none ends with ", `<number>`"**. Every value is schedule text only (e.g. shape "A - A 9a - 9a"), plus "9" ×2.

**Allergies 126214** (103 filled). All shapes:

| Shape | Count |
|---|---|
| "None" / "none" | 64 / 10 |
| "No" / "no" / "NO" | 2 / 2 / 1 |
| one allergen ("A", "a", "A…") | 8 |
| "A/A" | 4 |
| "A & A", "A & A…" | 4 |
| comma lists ("A, A", "A, A…", "A, A, A & A", …) | 8 |
| one long list containing "(…)" | 1 |

- **There is no "Yes (…)", "Yes" or "Confirmed" on any real client.** When there is an allergy, CR holds the allergen text alone.

**Physician 131151** (105 filled):

- Separator before the NPI: **one space ×96**. Also double space ×1, none ×1, and no trailing NPI ×7.
- No comma form on real clients.
- **No credentials** (MD/DO/NP) on 112 of 115 values (that count includes the test clients); "Dr." prefix on 3.

**Severity 133826:** only 2 real values: "3" and "Level 3". **Real CR data does not settle the format.**

**Care Coordinator 138851** (75 real filled; label "Care Coordinator", type Input, client metadata):

- one word ×33;
- two words capitalised ×20 ("First Last");
- two words lowercase ×17;
- four or five words ×5;
- no "@" anywhere.

### 9.3 Exact strings the code must send

| Field | Exact output | Source |
|---|---|---|
| **C19** 126209 (decision L) | `finalized_client_service_hours_post_assessment`, trimmed. **Nothing appended**: drop `client_service_hours_total` from C19. Example: `Mon-Fri 3-6 Sat 10-2` | `buildClientMetadata.mjs:354-358` today joins `", "` + hours |
| **Severity** 133826 (decision M) | The digit only: `Level 2` → `2` (also `1`, `3`). Blank → `null` | Code today sends the stored value `Level 2` (`:390-392`); sandbox options are `Level 1/2/3` |
| **Allergies** 126214 | `Denial` → `None`. `Confirmed` + explain → **`<explain>`** (trimmed, whitespace collapsed), matching real CR. `Confirmed` + blank → `Yes`. Blank → `null` | Section 4's `Yes (<explain>)` was based on test data. **Zeke to choose** (question 9 below) |
| **Physician** 131151 | `<name> <npi>`: one space, no comma; trailing comma stripped from the name. Name only → `<name>`; NPI only → `<npi>` | As 5.1 (now confirmed on real data) |
| **C24** 137697 | `<street> <apt>` + `"\n"` + `<City> <ST> <ZIP>`. Example: `101 Main St Apt 1A\nNew York NY 10001`. The apt is sent as stored | LF confirmed; state code confirmed |

**Severity caveat.** The "2 is the CR majority" in section 6 was our own test writes. On real clients it is 1 "3" against 1 "Level 3". Decision M is applied as "send the digit", but Zeke should reconfirm (question 8).

### 9.4 Item I: service address

**What the current code reads** (`src/`, commit `655b385`):

| CR target | HubSpot property | File:line |
|---|---|---|
| AddressLine1 | `street_address` | `src/mappings/client/buildClientPayload.mjs:49` |
| AddressLine2 | `home_apt` | `buildClientPayload.mjs:50` |
| City | `location_city` | `buildClientPayload.mjs:51` |
| StateProvince | `stateregion` (via `readStateCode`) | `buildClientPayload.mjs:52` |
| ZipPostalCode | `postal_code` | `buildClientPayload.mjs:53` |
| C24 137697, Child's House / More Than One Location | `full_home_address` as is | `src/mappings/client/buildClientMetadata.mjs:149-150` |
| C24 137697, Other Location | `service__street_address`, `service__apt`, `service__city`, `service__postal_code`, comma-joined, no state | `buildClientMetadata.mjs:152-158` |
| C25 138091, More Than One Location | `service_address__other` | `buildClientMetadata.mjs:163-167` |
| Requested properties | the core five | `src/mappings/client/clientProperties.mjs:25-29` |
| Requested properties | the C24/C25 fields | `clientProperties.mjs:58-63` |

**The `_addres` typo.**

- No runtime code reads either spelling of `if_services_will_be_in_more_than_one_location__list_the_other_address`. **The current code has no override of AddressLine1.** The "long field overrides `street_address`" rule is only in older docs (`docs/hubspot-centralreach-field-mappings-current-state.md:171`, `:273`).
- The truncated name survives only in two negative tests:
  - `src/tests/smoke/stage4CaseMappings.test.mjs:34,39`: line 1 is never the alternate property;
  - `src/tests/smoke/stage4and5PropertyLists.test.mjs:107`: the property is not requested.
- Both pass trivially, because they name a property that does not exist. Point them at the real name. This is a test-only fix.

**Production** (all 2,883 Cases):

| Property | Exists | Filled |
|---|---|---|
| `service__street_address` "Service - Street Address" (text, group `service_address`) | yes | 40 |
| `if_services_…_list_the_other_address` (textarea, group `intake_questionnaire`) | yes | 1 |
| `…_other_addres` (typo) | **no** | — |
| `service__apt` / `service__city` / `service__postal_code` | yes | 23 / 38 / 38 |
| `service__state` | **no** | — |
| `service__stateregion_2` "Service -State" (dropdown of full state names) | yes | 1,606 |
| `service_address__service` "Service Address - Service" (textarea, workflow-built) | yes | 1,613, but 1,565 are an empty skeleton like ",⏎,⏎NY⏎⏎" |
| `stateregion` (core State) | yes | **177** |

Overlap between the two:

- `service__street_address` filled with the long field blank: **40**;
- the long field filled with the street blank: **1**;
- both filled: **0**.

By `specific_home_location` (`service__street_address` / `street_address`):

- Other Location 21 Cases: 16 / 17;
- More Than One Location 25: 19 / 23;
- Child's House 1,664: 5 / 1,644.

3 of the 40 service street values hold a whole one-line address (comma, state, ZIP).

**Recommendation: read the structured fields directly. Do not use the questionnaire field as a source.**

- **AddressLine1 to Zip (the CR mailing address):** keep the core five as they are: `street_address`, `home_apt`, `location_city`, `stateregion`, `postal_code`. All five describe the home. Do not let the long field override line 1:
  - it is filled on 1 Case and is free text;
  - line 1 would then name a different place from City/State/Zip.
- **C24, Child's House and More Than One Location:**
  - line 1: `street_address` + " " + `home_apt`;
  - line 2: `location_city` + " " + ST + " " + `postal_code`, with ST from `location`.
- **C24, Other Location:**
  - line 1: `service__street_address` + " " + `service__apt`;
  - line 2: `service__city` + " " + ST + " " + `service__postal_code`, with ST from `service__stateregion_2` (full name → code via `readStateCode`), falling back to `location`.
- Do not read `full_home_address`, `service_address__service` or the long field for C24.
- **C25:** unchanged (`service_address__other`). The long field stays unmapped (1 filled).
- Add `service__stateregion_2` to the C24 list in `clientProperties.mjs`.

**Risk.** `stateregion` is filled on only 177 Cases, so StateProvince will be blank on most clients. That is outside this item; see question 10.

### 9.5 Item K: Care Coordinator in CR

- **Employees** (910 visible, metadata read on all 910): **22 metadata fields, none for a coordinator.**
  - Labels: BCBA Certification #, CAQH #, Employee Availability, Employee Availability EXTRA, Highest Degree Obtained, License#, Medicaid ID # NY/NJ/CO, NPI, NPI Number, RBT #, Work address, Credentialed with Medicaid NY / Aetna / Medicaid CO / Cigna, Personal Email, HubSpot Link to Record, New meta data field, Test, Active Case Count.
  - The employee record's core keys (contact.*, e.g. title, jobTitle, department, company) have no coordinator, supervisor or manager key.
- **Clients:** 138851 is labelled **"Care Coordinator"** (Input). It appears only in the client metadata list, not in the employee list. It holds a person's name, mostly a first name only (33) or "First Last" (20 capitalised, 17 lowercase), and never an email.
- **B11:** there is **no CR employee field to map to**. 138851 is client-only. Confirmed: a CR Employee metadata field "Care Coordinator" must be created (question 3) before B11 can be built.

### 9.6 Production coordinator properties and the sandbox workflows

**Production:**

- Case `care_coordinator_name` (2,536) and `care_coordinator_email` (2,537) exist.
- Case `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status` and `coordinator_export_source_snapshot` **do not exist**.
- On the BCBA, **none of the five exist**. BCBA `hubspot_owner_id` is filled on 342.

**Sandbox workflows** (`cc-workflows-read.mjs`):

| | BCBA `1932723082` | Case `1933886108` "(Cloned on 11/23/2026)" |
|---|---|---|
| Object | `2-72890322` | `0-3` |
| Trigger | `hubspot_owner_id` changed (known or unknown) | same |
| Re-enrolment | **off** | **off** |
| Action | one custom code action (secret `case_owner`) | same code |
| Properties set | `care_coordinator_first_name`, `care_coordinator_last_name`, `care_coordinator_email`, `coordinator_export_status`, `coordinator_export_source_snapshot` | same five |

Both actions read the Team Member directory (`2-72890324`, by `hubspot_user`) and the owners API.

**Findings for Zeke:**

1. **The Case workflow's code still targets the BCBA object.** It has `TYPE='2-72890322'` and the comment "Confirm the BCBA exists": it is the BCBA code, cloned unchanged.
   - As written, it reads and updates a BCBA record with the Case's ID, so it should fail at `read_bcba` and write nothing to the Case.
   - The round-4 Case's `refreshing` → `missing_match` (section 1.1) probably came from another workflow (inferred; not read).
2. **Re-enrolment is off.** A record enrols once, so a later owner change does not refresh the coordinator. A Team Member edit never triggers it either.
3. The code hard-codes portal `52311591` and `accountType === 'SANDBOX'`. Both must change for production.

### 9.7 New questions for Zeke

7. **Case workflow `1933886108`:** change `TYPE` to `0-3` (deals) and turn re-enrolment on, in both workflows?
8. **Severity:** the "2" majority was our own test data; real CR has one "3" and one "Level 3". Confirm "send the digit only" (`Level 2` → `2`)?
9. **Allergies:** real CR has no "Yes (…)". Send the explanation alone (`Peanuts, tree nuts`, matching CR), or keep `Yes (Peanuts, tree nuts)` as the guide's format?
10. **Mailing state:** `stateregion` is filled on 177 of 2,883 Cases. Accept a blank StateProvince, or fall back to `location`?

---

## 10. Allergies and Severity, record-level check (2026-11-23, ~20:50 UTC)

Answers Zeke's 2026-11-23 asks: Allergies "Confirm based on the data please"; Severity "confirm with a record in hubspot and then see". Supersedes questions 8 and 9 in 9.7.

**Method (read-only).** HubSpot production `50317927` (portal checked first; GET + CRM search only) and CR production (GET only, plus the token POST). Scripts in the session scratchpad: `allergy-severity-pairs.mjs` and `allergy-severity-pairs-2.mjs`, each with a `.out`. Counts, option values, Case IDs and masked shapes only. Nothing written; `src/` not edited.

- CR now lists **713 clients** (199 before the API user was connected to all contacts). **91** have "test" / "Azure Test" / "AzT" in the name and are excluded, leaving **622**.
- **487** of the 622 pair one-to-one with a production Case through `client_id_number`. No CR ID sits on more than one Case. No paired Case has "test" in its name.
- Code reads `allergies` + `allergies__yes__explain` (`buildClientMetadata.mjs:123-134`, `:340`) and `severity_level_clinical` (`:390-392`).
- Guide: `allergies` stores Confirmed ("Yes") / Denial ("No"), "Include the explanation" (guide extract lines 365, 514, 835); `severity_level_clinical` is "Level 1, 2, 3" (lines 368, 517). The guide does not set the CR text format for either field.

### 10.1 Allergies (C26, Meta 126214)

**HubSpot class → CR shape (487 pairs).**

| HubSpot | CR "None" | CR "none" | CR "No" / "no" | CR "N/A" | CR `<allergen text>` | CR blank |
|---|---|---|---|---|---|---|
| Denial (explain always "NA" or "N/A") | 32 | 7 | 4 | 2 | 0 | 233 |
| Confirmed + text | 6 | 0 | 0 | 0 | 28 | 84 |
| Confirmed + blank | – | – | – | – | – | – (no pair; 1 Case in all production) |
| blank | 31 | 4 | 2 | 1 | 9 | 44 |

- **No "Yes", "Yes (…)" or "Confirmed" on any paired client.** All 28 CR texts on Confirmed Cases are the allergen text alone: none starts with "Yes", none is multi-line.
- **Denial:** all 45 filled CR values are a "no allergy" word. "None" (capital N) is the clear majority: 32 of 45 here and 69 of 83 none-family values across all pairs. The `allergies__yes__explain` on Denial Cases is always "NA" / "N/A" (725 Cases), so it must be ignored, as the proposal already does.
- **Confirmed + text vs CR text (34 with CR filled):**
  - 14 equal, ignoring case (9 exact);
  - 1 equal, ignoring punctuation;
  - 7 where one contains the other;
  - 6 different text;
  - 6 where CR says "None". This is a data conflict, not a format issue: the integration would overwrite these with the HubSpot text.

**Rule match on the 79 pairs where both sides are filled:**

| Rule | Exact | Ignoring case |
|---|---|---|
| **A (proposal):** Denial → `None`; Confirmed + text → `<explain>`; Confirmed + blank → `Yes` | **41 (52%)** | **53 (67%)** |
| B (guide-style): Confirmed → `Yes (<explain>)` | 32 (41%) | 39 (49%); 0 of 34 Confirmed |
| C: send the explain on Denial too ("NA") | 9 | 14 |

Every Rule A miss is a different word for "none" ("none", "No", "N/A") or a different allergen text typed in CR. **No miss is a format miss.**

**Edge case.** 3 of 314 production Confirmed Cases have explain "NA". Rule A as written would send "NA" (see 10.4).

### 10.2 Severity (C28, Meta 133826)

Production option values are `Level 1` (23 Cases), `Level 2` (152) and `Level 3` (157); labels equal the values.

**HubSpot value → CR value (487 pairs).**

| HubSpot | CR "1" | CR "2" | CR "3" | CR "4" | CR "Level N" | CR blank |
|---|---|---|---|---|---|---|
| Level 1 | 2 | 0 | 0 | 0 | 0 | 12 |
| Level 2 | 0 | 1 | 1 | 0 | 0 | 125 |
| Level 3 | 0 | 2 | 8 | 1 | 0 | 141 |
| blank | 0 | 1 | 2 | 0 | 0 | 191 |

- **Format: the digit only on 18 of 18 filled CR values on paired clients; "Level N" on 0.**
- **Level agrees on 11 of 15** pairs where both sides are filled (73%). The 4 disagreements are value differences, not format differences.

**Sample Cases (HubSpot → CR):**

| Case | HubSpot | CR | Result |
|---|---|---|---|
| 58208796517 | Level 1 | 1 | match |
| 65423578271 | Level 2 | 2 | match |
| 55976573456 | Level 3 | 3 | match |
| 65718079579 | Level 1 | 1 | match |
| 66277542246 | Level 3 | 3 | match |
| 64624240755 | Level 2 | 3 | value differs |
| 58025464600 / 64881031035 | Level 3 | 2 | value differs |
| 56289632032 | Level 3 | 4 | value differs; "4" is outside HubSpot's options |

**Unpaired CR clients:**

- 1 unpaired CR client holds "Level 3".
- 10 unpaired CR clients hold "Level 1" together with allergies "Confirmed". Those are the stored HubSpot values the old code sends, so these 10 look like earlier integration writes, not staff entries (assumption).

### 10.3 Final rules

| Field | Rule | Match rate |
|---|---|---|
| **Allergies 126214** | `Denial` → `None` (explain ignored). `Confirmed` + explain → the explain alone (trimmed, whitespace collapsed). `Confirmed` + blank → `Yes`. Blank or other → `null` | Format 100%: no "Yes" form anywhere; CR text is the allergen alone on 28 of 28. Value 53 of 79 ignoring case (67%), 41 exact (52%). Denial → "None": 39 of 45 ignoring case |
| **Severity 133826** | `Level N` → `N` (`Level 1` → `1`, `Level 2` → `2`, `Level 3` → `3`). Blank → `null` | Format 18 of 18 (100%) digit-only. Value 11 of 15 (73%) |

This confirms the section 9.3 proposals for both fields. Questions 8 and 9 in 9.7 are answered by the data.

### 10.4 Assumptions

1. HubSpot is the source of truth for both fields, as the guide's "HS to CR" direction says. The integration will overwrite these CR values:
   - 6 "None" values on Confirmed Cases;
   - 4 severity values that differ, including the "4".
2. A CR client is "real" if its name has no "test" / "Azure Test" / "AzT". The 10 unpaired "Level 1" + "Confirmed" clients are assumed to be old integration writes; they are outside every match rate.
3. The case-insensitive variants of "none" in CR ("none", "No", "no", "N/A") are staff typing differences. The integration standardises them to `None`.
4. `Confirmed` + blank explain → `Yes` stays, because no data contradicts it. Only 1 production Case has this combination and none is paired.
5. Pairing uses `client_id_number` only. Cases without that ID were not compared.

### 10.5 Open questions for Zeke

11. **Confirmed with explain "NA" (3 Cases):** send `Yes` (treat "NA" / "N/A" as blank), or send "NA" as typed?

---

## 11. Production checks: NA allergies, LBA suffix, state fallback (2026-11-23, ~21:15 UTC)

Answers Zeke's 2026-11-23 asks: Allergies "NA" ("How do these show in the production?"), the " BCBA LBA" suffix ("Make sure this is confirmed based on the actual hubspot and central data") and the state fallback ("Please review the prod hubspot and central reach to confirm how the code should behave").

**Method (read-only).**

- HubSpot production `50317927` (portal checked first; GET, CRM search and batch reads only). HubSpot sandbox `52311591` (portal checked first; GET only, property definitions). CR production (GET only, plus the token POST).
- Script: `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/na-lba-state-read.mjs`. Outputs: `na-lba-state-read.out` and `na-lba-state-read-2.out` (same folder).
- **CR calls: 978 in all** (3 in a one-client trial, 975 in the full run, 0 in the re-run). That is one client GET and one metadata GET per pair, plus tokens and a few retries; about 0.65% of the 150,000 monthly Core calls. CR values are cached (derived fields only: state code, 131308 text, C24 line count and state, allergy class) in `na-lba-state-cache.json`, so a re-run makes no CR call. Item 1 reused `allergy-severity-pairs*.out` and needed no new CR call.
- Pairs: **487** CR clients pair one-to-one with a Case by `client_id_number` (489 Cases hold an all-digit ID; 2 are 404 in CR per `verify-after-connect.out`). None is a test client or test Case.
- Nothing written anywhere; `src/` not edited.

### 11.1 Allergies: Confirmed with explain "NA"

**All production Cases with an explain (1,039):**

| `allergies` | explain | Cases |
|---|---|---|
| Denial | "NA" | 722 |
| Denial | "N/A" | 1 |
| Denial | other text | 2 |
| Confirmed | allergen text | 310 |
| **Confirmed** | **"NA"** | **3** |
| blank | text | 1 |

- No Confirmed Case has "N/A", "n/a", "none", "no" or "-". Only the 3 "NA" Cases.

**The 3 Cases and CR:**

| Case | Location | `client_id_number` | CR 126214 |
|---|---|---|---|
| 62115618953 | New York | filled (paired) | **blank** |
| 65664124821 | New York | blank | no CR client yet |
| 67621950504 | Colorado | blank | no CR client yet |

- **CR has no value for the one paired Case.** CR gives no evidence for "NA" or for "Yes".
- **Denial pairs (for comparison):** explain "NA" gives CR blank ×233, "None" ×32, "none" ×7, "No"/"no" ×3, "N/A" ×2. CR never holds the bare "NA" text, apart from the "N/A" ×2 that staff typed as a "no allergy" word.
- "NA" is what staff type in the explain on Denial (723 of 725 Denial Cases). On a Confirmed Case it reads as the same placeholder, not an allergen.

**Rule.** Treat a none-like explain (`NA`, `N/A`, `none`, `no`, `-`, any case, trailing "." ignored) as blank. So `Confirmed` + "NA" → **`Yes`**, the existing `Confirmed` + blank rule. Do not send "NA" (it is not an allergen) and do not send "None" (it contradicts the HubSpot "Yes").

| `allergies` | explain | Meta 126214 |
|---|---|---|
| `Denial` | any | `None` |
| `Confirmed` | allergen text | the text alone (trimmed, whitespace collapsed) |
| `Confirmed` | blank, or none-like (`NA`, `N/A`, `none`, `no`, `-`) | `Yes` |
| blank / other | any | `null` |

**Code.** `buildClientMetadata.mjs:123-134`: after trimming the explain, set it to `null` when it matches `/^(n\/?a|none|no|-+)\.?$/i`. Test: `Confirmed` + "NA" → "Yes"; `Confirmed` + "n/a" → "Yes"; `Confirmed` + "Peanuts" → "Peanuts".

### 11.2 The " BCBA LBA" suffix on Meta 131308

**Properties (BCBA object).** All three exist in **both** portals, with the same names, types and options:

| Property | Label | Type | Options (value) | Production `2-48354212` fill (375 BCBAs) |
|---|---|---|---|---|
| `lba_licensure__ny` | "🦄LBA Licensure - NY" | enumeration / select | `Yes`, `In Process`, `No` ("Will Apply"), `Grad Permit` | Yes 186, blank 69, No 49, In Process 43, Grad Permit 28 |
| `lba_licensure__nj` | "🦄LBA Licensure - NJ" | enumeration / select | `Yes`, `In Process`, `No` ("Will Apply") | blank 308, Yes 44, No 12, In Process 11 |
| `lba_licensure__co` | "LBA Licensure - CO" | enumeration / select | `Yes`, `In Process`, `Will Apply`, `N/A` | **N/A 200, blank 175. No BCBA has `Yes`** |

- Sandbox `2-72890322`: identical definitions for all three. Requesting them is safe in both portals.
- BCBA `location` is "Work State(s)", a **checkbox** (New York, New Jersey, Colorado, New Mexico, Virginia); `assign_states` is a checkbox (Assign NY / NJ / CO). The guide's NJ and CO labels use `assign_states` (guide lines 405, 675), not a licence property.

**CR 131308 on the 487 pairs, by the Case's state (`location`):**

| Client state | " BCBA LBA" | ", BCBA LBA" / "BCBA, LBA" (comma forms) | " BCBA" | " LBA" | name only | other | blank |
|---|---|---|---|---|---|---|---|
| NY (473) | 285 | 28 | **0** | 2 | 12 | 0 | 146 |
| CO (6) | 1 | 0 | 3 | 0 | 0 | 1 | 1 |
| NJ | **no NJ client is paired** | | | | | | |
| `location` and `stateregion` blank (8) | 5 | 2 | 0 | 0 | 0 | 0 | 1 |

**Suffix vs the named BCBA's licence.** The name in 131308 was matched to exactly one production BCBA on 309 values with a " BCBA LBA" or " BCBA" suffix:

| Rule for the suffix | Matches |
|---|---|
| **R1: " BCBA LBA" when `lba_licensure__ny`, `__nj` or `__co` = `Yes`; else " BCBA"** (GP 8.3 rule 5) | **304 of 309 (98.4%)** |
| R2: NY licence = `Yes` only | 303 (98.1%) |
| R3: the licence of the client's own state | 303 (98.1%) |
| R4: NY client → " BCBA LBA", any other → " BCBA" | 301 (97.4%) |

R1 misses (5):

- Cases `52545179983`, `53754345558`: CR "… BCBA LBA", but the BCBA's NY licence is now `Grad Permit`. Under GP 8.3 rule 3 a holder's name is never sent, so these Cases get the 151 supervisor instead.
- Cases `53261088025`, `58634217852`: CR "… BCBA, LBA", but that BCBA's three licence values are blank (a HubSpot data gap).
- Case `57574700881` (CO client): CR "… BCBA", the BCBA has NY = `Yes`.

**Answers.**

- **Is " BCBA LBA" tied to the NY licence only? No, but nearly.** 1 NY client shows " BCBA LBA" for a BCBA whose NY licence is `In Process` and NJ = `Yes`. R1 (any state) catches it; R2 (NY only) does not.
- **NJ:** no paired NJ client, so CR shows nothing for NJ.
- **CO:** 5 filled. " BCBA" ×3, " BCBA LBA" ×1 (an NY-licensed BCBA), other ×1. No CO licence is `Yes` in HubSpot, so CO clients get " BCBA" unless their BCBA holds an NY or NJ LBA. The CO evidence is split (1 for R1, 1 against).
- **NY:** CR never shows a bare " BCBA" on an NY client.

**Rule (unchanged from GP 8.3 rule 5).** " BCBA LBA" when that BCBA has `lba_licensure__ny`, `lba_licensure__nj` or `lba_licensure__co` = `Yes`; otherwise " BCBA". Single space, no comma. The 30 comma forms are staff typing; the code standardises them.

**Whole-value check, and a gap.** Rebuilding the whole 131308 with GP 8.3 (acting BCBA from 82 → 234 → 288 → 135, Grad Permit supervisor, then the typed supplier) matches CR on **171 of 339** filled values (156 exact, 15 ignoring punctuation and case; 50%).

- **139 of the 168 misses come from the typed-supplier fallback** (no BCBA in any of the four roles). The supplier never carries the suffix, so 83 of them are "same person, suffix missing".
- **If the supplier fallback also gets the suffix** (supplier name matches exactly one BCBA by first + last name; apply R1), the match rises to **249 of 339 (73%)**: 232 exact, 17 ignoring punctuation.
- The remaining misses: supplier blank in HubSpot ×44, a different person ×38 (staff changes), suffix/format ×8.

This needs one extra HubSpot BCBA search by name in the fallback path. It is not in GP 8.3; question 13 below.

### 11.3 State: core StateProvince and C24 line 2

**Properties.**

- Case `stateregion` "State/Region": free **text**, not calculated, in both portals.
- Case `location` "Location": enumeration/select, **calculated, read-only**. Options `New York`, `New Jersey`, `Colorado` in both portals.
- Contact `state` "State/Region": free text.

**Values on the 487 pairs.**

| Source | Values |
|---|---|
| Case `location` | New York 472, Colorado 6, blank 9 |
| Case `stateregion` | blank 403, whitespace only 14, "NY" 47, "New York" 11, "NEW YORK" 11, "colorado" 1 |
| CR core `stateProvince` | NY 480, CO 6, null 1 |

**Comparison with CR core `stateProvince` (code via `readStateCode`).**

| HubSpot source | Equal | Differ | HubSpot blank | CR blank |
|---|---|---|---|---|
| `stateregion` | 70 | **0** | 416 | 1 (both blank) |
| `location` | **477** | **0** | 9 | 1 |
| Contact `state` | 148 | 2 | 336 | 1 (both blank) |

- **When `stateregion` is blank (417 pairs), CR holds the state on 416.** It equals `location` on 408 (NY 403, CO 5). `location` is blank on 8 (CR NY) and CR is blank on 1 (location NY).
- **C24 137697 line 2:** the state code on line 2 equals CR core on **183 of 183** that carry one, and equals `location` on 180 of 180 where `location` is filled.
- **Mapping is clean.** `readStateCode` maps every `location` option: New York → NY, New Jersey → NJ, Colorado → CO. It also reads the messy `stateregion` forms ("New York", "NEW YORK", "colorado").

**Rule.** StateProvince = `readStateCode(stateregion)`; if blank, `readStateCode(location)`; if both blank, leave it out (B21 route A keeps CR's value on an update).

| `stateregion` | `location` | StateProvince sent | Pairs | Equal to CR |
|---|---|---|---|---|
| filled | any | its code | 70 | 70 (100%) |
| blank | New York / Colorado / New Jersey | NY / CO / NJ | 409 | 408; 1 fills a blank CR |
| blank | blank | left out | 8 | CR keeps NY |

**Overall: 478 of 478 where both sides are filled (100%).** Without the fallback, 417 of 487 pairs (86%) would send no state, and a new client (create) would reach CR with no state.

- C24 line 2 keeps `location` as its state source (section 9.4), which matches CR on 180 of 180.
- **Code.** `buildClientPayload.mjs:52`: `StateProvince: valueOf(readStateCode, "stateregion") ?? valueOf(readStateCode, "location")`. `location` is already requested. Tests: `stateregion` "NEW YORK" → NY; `stateregion` blank + `location` "Colorado" → CO; both blank → `null` (left out); `stateregion` "  " + `location` "New York" → NY.

### 11.4 Assumptions

1. A none-like explain on a Confirmed Case is a placeholder, not an allergen. CR gives no evidence either way (the one paired Case is blank in CR).
2. A name in 131308 belongs to a BCBA when it matches exactly one production BCBA's first + last name (letters only, any case). Values with no unique match (23) are left out of the suffix rates.
3. NJ is untested: no paired client has `location` = New Jersey. The NJ licence is included in R1 on the evidence of one NY client.
4. The CO rule rests on 5 values. CO licence values are only `N/A` or blank today, so R1 gives CO clients " BCBA" unless the BCBA holds an NY or NJ LBA.
5. `location` is a calculated property (read-only); it is read, never written, so this is safe.
6. The client's state is the Case `location` (not the BCBA's Work States), because 131308 and StateProvince describe the client.
7. HubSpot is the source of truth. The 5 R1 misses (2 Grad Permit holders, 2 blank licences, 1 CO client) come from HubSpot data, and the integration will change those CR values.

### 11.5 Open questions for Zeke

12. **Cynthia Storberg's BCBA record** has all three licence values blank, while CR shows her as "BCBA, LBA" on 2 Cases (`53261088025`, `58634217852`). Should United Care set `lba_licensure__ny` = `Yes`? Without it, the integration rewrites both to "… BCBA".
13. **Supplier fallback suffix.** 139 of the 168 whole-value misses come from Cases with no BCBA in the four roles, where 131308 falls back to the typed supplier with no suffix. Add the suffix when the supplier name matches exactly one BCBA (match 50% → 73%; one extra HubSpot search per sync), or send the supplier as typed?

Question 11 (Confirmed + "NA") is answered by 11.1: send `Yes`.

### 11.6 Validation

1. Production: open Case `62115618953`; "Allergies" = Yes and the explain = "NA". The dry run gives Meta 126214 = "Yes".
2. Sandbox (requirement C26): a Case with `allergies` = Confirmed and explain "NA" → 126214 "Yes".
3. Sandbox (requirement C8): a Case with `stateregion` blank and `location` = Colorado → core StateProvince "CO".
4. Sandbox (requirement C12): a BCBA with `lba_licensure__nj` = `Yes` and NY blank on 82 → 131308 "First Last BCBA LBA".

---

## 12. Final rules: C24 service address and the 131308 suffix (2026-11-23, ~22:00 UTC)

Answers Zeke's 2026-11-23 asks:

- service address: "Follow what's on the google doc as a requirement, then review what's in production, build the solution based on that please.";
- copy workflow: "For the service address please let me know if this is needed.";
- suffix: "Refer to the requirements doc and then what we found on the portal reads".

Also applies two decisions: Maladaptive stays as is ("Yes to recommendation"), and the state rule ("confirmed").

**Method.** The guide extract came first. Then the production evidence already gathered in sections 9 to 11 and the cached CR values (`na-lba-state-cache.json`, 487 pairs).

- **CR calls: 0.**
- **New production reads: none ran.** This worker's read-only script was refused by the session's permission check, because it loads the production token. The HubSpot connector here is on the sandbox (`52311591`).
- The script is ready for Zeke to run from the repo root: `NODE_USE_ENV_PROXY=1 node /private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/c24-suffix-read.mjs`.
  - It checks that the portal is `50317927`. It sends GET requests, plus POST only to the search and batch-read paths. It makes no CR call.
  - It prints counts, workflow IDs and action templates, and masked component templates. It never prints a value.
  - It confirms three things: the workflow that builds `full_home_address` and its template on all Cases, the 3 full-address streets, and the exact supplier-fallback rate in 12.6.

Nothing was written anywhere, and `src/` was not edited.

### 12.1 The guide (the requirement)

| Line | Text (guide extract 2026-11-20) |
|---|---|
| 364 | "Child's House uses full_home_address. Other Location uses the service address components. More Than One Location can use service_address__other as Address 2." |
| 512 | "specific_home_location says where (Child's House, Other Location, More Than One Location). Home: full_home_address. Other: service__street_address, service__apt, service__city, service__postal_code (combined in service_address__other)." |
| 384 | the copy workflow "is separate from the service_address__other Client mapping" |
| 385 | "Use if_services_will_be_in_more_than_one_location__list_the_other_address as the alternate-address copy destination." |
| 354 | "Match the typed supplier to the CR provider by name for billing. Use association 82 for the ongoing assignment and Grad Permit check." |
| 503 | "use ongoing_central_reach_provider_supplier … It is free text staff type (274 cases filled), not a link to the BCBA record, so match it to the CR provider by name." |
| 504 | "Reliable check on the BCBA record: lba_licensure__ny = Grad Permit." |
| 543 | "For the CR Supervising BCBA field itself, Sara wants the typed Ongoing Central Reach Provider Supplier (section 3); use this association to spot grad permit cases." |

The guide names `full_home_address` for Child's House. It names the source fields only: it sets no CR text format for 137697 and **no suffix** for 131308.

### 12.2 C24 source: the guide's fields, in CR's format

**`full_home_address` in production** (section 9 reads):

- Label "🤖Service Address - Home", a textarea, not calculated, group `logic_for_hide/show`. The "🤖" and the group mark it as workflow-maintained. The workflow itself is not identified yet (the script above lists it).
- Filled on **2,269 of 2,883** Cases: 1,650 of 1,664 Child's House, 23 of 25 More Than One Location, 19 of 21 Other Location.
- Format, from the sandbox copies of production records (5.2): "`<street>`,⏎Apt# `<apt>`, `<city>`, `<State name>` `<zip>`", or "`<street>`,  `<city>`, `<State name>` `<zip>`" with no apartment.
  - **The earlier note is confirmed:** the line break comes after the street, not after the apartment.
  - The production template on every Case is not yet confirmed record by record (the script above checks it).
- Its parts are the Case's `street_address`, `home_apt`, `location_city`, a state and `postal_code`, the same fields the core mailing address uses (C8).

**CR 137697 on real clients** (9.2): `<street> <apt>` ⏎ `<City> <ST> <ZIP>`, LF only, two lines on 51 of 52, and the state code on line 2 on all 51. The apartment marker is kept as typed on 18 of 51.

**Can `full_home_address` be turned into CR's format reliably? No.**

1. The line break has to move from after the street to after the apartment.
2. It writes "Apt#" in front of `home_apt`, and staff often type the marker in `home_apt` too ("Apt 4A" becomes "Apt# Apt 4A"). CR keeps the typed marker and no "Apt#".
3. The parts are split by ", ", and a street or apartment can contain a comma (3 service streets hold a whole one-line address). Parsing would split them in the wrong place.
4. The state is a full name; CR needs the code. The name can be read back, but only after the parts are split correctly.

**Rule:** build 137697 from the parts `full_home_address` is made of: `street_address`, `home_apt`, `location_city`, the Case state (12.7) and `postal_code`. This is the same data the guide names, taken before the workflow formats it. Other Location uses the guide's service components, as written. More Than One Location sends the home address in 137697 and `service_address__other` in 138091 (Address 2, unchanged).

### 12.3 The questionnaire copy workflow: not needed

**Answer: no, the copy workflow is not needed for the integration.**

- The guide's C24 sources (lines 364, 512) do not include `if_services_will_be_in_more_than_one_location__list_the_other_address`. Lines 384 and 385 describe a HubSpot-to-HubSpot copy, kept "separate from the service_address__other Client mapping".
- The final rule (12.4) reads `service__street_address` and the other structured fields directly. AddressLine1 stays `street_address`, with **no override** (`buildClientPayload.mjs:49`). Nothing in `src/` reads the field in either spelling, and no property list holds it.
- In production it is filled on 1 of 2,883 Cases, with usage 0 and no workflow dependencies.
- The older notes' override rule (AddressLine1 and the payor address blocks from the questionnaire field) is obsolete. `src/` has no payor address block.

**Guide note:** update line 385 to "Not an integration source; the integration reads the structured Service Address fields. No copy workflow is needed." Keep the copy only if United Care wants it for its own use (12.10).

**Code:** ignore the field and do not add it to any property list. Point the two negative tests (`stage4CaseMappings.test.mjs:34,39`, `stage4and5PropertyLists.test.mjs:107`) at the real name, so that a change that starts reading it fails.

### 12.4 C24 final rule (exact strings)

`src/mappings/client/buildClientMetadata.mjs:144-161`, with one helper `twoLineAddress({ street, apt, city, stateCode, zip })`:

| `specific_home_location` | street | apt | city | ST | zip |
|---|---|---|---|---|---|
| Child's House, More Than One Location | `street_address` | `home_apt` | `location_city` | `readCaseStateCode` (12.7) | `postal_code` |
| Other Location | `service__street_address` | `service__apt` | `service__city` | `service__stateregion_2` via `readStateCode`; blank or unreadable → `readCaseStateCode` | `service__postal_code` |
| anything else | → `null` | | | | |

1. Trim every part and collapse runs of spaces.
2. **Street blank → `null`**, the whole field. This is "send nothing": a blank never clears a staff value, because a clear is sent only for a value the integration wrote (`mappedState.mjs:193-209`). Without this rule, 5 of 21 Other Location Cases would send a bare "NY".
3. **Apartment:** sent as stored. A placeholder (`NA`, `N/A`, `none`, `no`, `-`, any case, trailing "." ignored) counts as blank.
4. **Street already holds a whole address** (it contains a comma and ends in a ZIP: `/,/` and `/\b\d{5}(-\d{4})?\s*$/`; 3 of 40 service streets):
   - line 1 = the text before the first comma, + " " + apartment;
   - line 2 = the rest, with commas removed and spaces collapsed;
   - the separate city, state and ZIP are not added.
5. Otherwise line 1 = `street` + (" " + `apt` when filled), and line 2 = the filled ones of `city`, `ST`, `zip`, joined by one space.
6. Output = line 1 + `"\n"` + line 2. When line 2 is empty, line 1 alone with no `"\n"`.

Examples:

- "101 Main St Apt 1A\nNew York NY 10001";
- "200 Service Rd\nDenver CO 80202";
- "12-34 56th Ave, Queens, NY 11356" → "12-34 56th Ave\nQueens NY 11356".

Properties: add `service__stateregion_2` and remove `full_home_address` (`clientProperties.mjs:58-63`). The home parts are already read for C8.

### 12.5 C24 tests (requirement C24; core state rows C8)

| Input | Expected |
|---|---|
| Child's House, "101 Main St", "Apt 1A", "New York", `stateregion` blank, `location` "New York", "10001" | "101 Main St Apt 1A\nNew York NY 10001" |
| Child's House, no apt | "101 Main St\nNew York NY 10001" |
| Child's House, apt "NA" | "101 Main St\nNew York NY 10001" |
| Child's House, street blank, city and ZIP filled | `null` |
| Child's House, `full_home_address` filled, parts blank | `null` (not read) |
| Child's House, `stateregion` "NJ", `location` "New York" | "… NJ …" (no fallback over a filled value) |
| Child's House, `stateregion` "Brooklyn", `location` "New York" | "… NY …" (and the payload warning, 12.7) |
| Child's House, city, state and ZIP blank | "101 Main St" (no "\n") |
| Other Location, "200 Service Rd", "Suite 2", "Denver", `service__stateregion_2` "Colorado", "80202" | "200 Service Rd Suite 2\nDenver CO 80202" |
| Other Location, `service__stateregion_2` blank, `location` "Colorado" | "… Denver CO 80202" |
| Other Location, `service__stateregion_2` and `location` blank | "200 Service Rd Suite 2\nDenver 80202" |
| Other Location, street blank (state filled) | `null` (never a bare "NY") |
| Other Location, street "12-34 56th Ave, Queens, NY 11356", city and ZIP also filled | "12-34 56th Ave\nQueens NY 11356" |
| `specific_home_location` blank | `null` |
| More Than One Location | the home address in 137697; `service_address__other` in 138091 (unchanged) |

### 12.6 131308 suffix: final rule

**Rule: always " BCBA LBA"** (one space, no comma) after each BCBA's "`<First> <Last>`". Several BCBAs are joined by ", " in record-ID order.

- **Normal Case:** the first present of 82, 234, 288, 135, + " BCBA LBA".
- **Grad Permit Case:** unchanged. The holder (82 with `lba_licensure__ny` = `Grad Permit`) is never named; the holder's 151 supervisor(s) + " BCBA LBA" are sent. With no 151 link, 131308 is left out.
- **Typed-supplier fallback** (none of the four roles on the Case): trim the supplier text and any trailing commas.
  - If it contains "BCBA" or "LBA" as a word (any case), send it as typed.
  - Otherwise, append " BCBA LBA".
  - Blank → `null`.
  - No search, and no matching to a BCBA record.

**What "adding the suffix to the fallback" means.** Staff type only the name in the supplier field ("Jane Doe"), but CR shows "Jane Doe BCBA LBA". Under the deployed code the fallback sends the bare name, and that is 83 of the 168 whole-value misses (11.2). With "always", the code appends the same text the association path adds. Because the suffix no longer depends on the person's licence, it needs no extra HubSpot search.

**Why "always" over the licence rule:**

| | Always " BCBA LBA" | Licence rule (`__ny`/`__nj`/`__co` = `Yes`) |
|---|---|---|
| Suffix on 309 named values (cache) | **307 (99.4%)** | 304 (98.4%) |
| Misses | 2 CO clients with CR " BCBA" (Case `57574700881`, NY `Yes`; and one CO BCBA with no licence) | 2 Grad Permit holders' old values, 2 Cynthia Storberg Cases (licence blank), 1 CO Case |
| Reads | `lba_licensure__ny` only (needed anyway for the holder test) | also `__nj` and `__co` |
| Data risk | none from licence gaps | 69 BCBAs with NY blank get " BCBA"; a licence change starts no Case sync |
| Source | Zeke's decision 3: "131308 from associations + ' BCBA LBA'" | GP §8.3 rule 5 (a worker's proposal) |

Neither the guide nor CR supports a licence-based suffix. The guide names no suffix at all.

**Whole-value match** (339 filled CR values, GP §8.3 order):

| Variant | Match |
|---|---|
| Licence rule, supplier as typed (11.2) | 171 (50%) |
| Licence rule, supplier matched to one BCBA + suffix (11.2) | 249 (73%) |
| **Always, supplier + " BCBA LBA" unless it has BCBA/LBA (final)** | **about 249 to 252 (about 74%), an estimate** |

How the estimate is built:

- The cache holds the CR values, but the supplier text lives in HubSpot, and the production read did not run.
- The final rule fixes the same 78 "same person, suffix missing" Cases as the matched variant. It may also fix up to 3 more that had no unique BCBA match.
- On the association path it gains the 2 Cynthia Storberg values and loses 1 CO value.
- What still misses: 44 Cases with a blank supplier, and about 38 where a different person is named (staff changes). Both are data, not format.

The script in the method note prints the exact figure.

**Code** (`docs/workstreams/architecture-update/BUILD-PACKAGE-DRAFT-2026-11-23.md` item 9, gap e):

- `supervisingBcbaText` appends `SUPERVISING_BCBA_SUFFIX = " BCBA LBA"`.
- A new `supplierWithSuffix(text)` uses `/\b(BCBA|LBA)\b/i` → as typed; otherwise text + suffix.
- The BCBA batch read (`clientSyncInputs.mjs:89`) adds only `lba_licensure__ny`.

**Tests [C12] / [C13]:**

| Case | Expected 131308 |
|---|---|
| 82 BCBA, NY `Yes` | "First Last BCBA LBA" |
| 82 BCBA, every licence blank | "First Last BCBA LBA" |
| two 82 BCBAs | "A One BCBA LBA, B Two BCBA LBA" (record-ID order) |
| SUB 234 only | "`<SUB>` BCBA LBA" |
| no BCBA role, supplier "Jane Doe" | "Jane Doe BCBA LBA" |
| supplier "Jane Doe," | "Jane Doe BCBA LBA" |
| supplier "Jane Doe BCBA" / "Jane Doe, BCBA, LBA" / "jane doe lba" | as typed |
| supplier blank | `null` |
| 82 present and supplier filled | the 82 name + suffix; the supplier is not used |
| Grad Permit holder on 82 with a 151 supervisor | "`<supervisor>` BCBA LBA"; the holder's name is absent |
| Grad Permit holder, no 151 link | 131308 omitted, saved hash kept |

### 12.7 State: unreadable `stateregion` falls back to `location`

Zeke: "confirmed". There is one helper, `readCaseStateCode(props)` in `src/lib/fieldFormats.mjs`, after `readStateCode` (`:110-121`). It calls `readStateCode` directly, not `createValueReader`'s `valueOf` (`:140-155`). `valueOf` records an unreadable value in `unreadableValueProperties` (`:142-148`), and that ends the run `error` (`clientSyncWorkflow.mjs:470-474`).

| `stateregion` | `location` | State | Warning |
|---|---|---|---|
| readable | any | its code | none |
| blank | readable | `location`'s code | none |
| unreadable | readable | `location`'s code | `state_unreadable_used_location` |
| unreadable | blank / unreadable | left out | `state_unreadable_no_fallback` |
| blank | blank / unreadable | left out | none |

- **Used by:** the core StateProvince (`buildClientPayload.mjs:52`) and line 2 of 137697.
- **Warnings:** `buildClientPayload` returns `warnings: [{ code, property: "stateregion" }]`, never the value. `centralReachPayload` drops it (`clientSyncWorkflow.mjs:166-170`), and the worker logs it as it logs the metadata warnings (`:542-551`).
- **Test to rewrite:** `f1UnreadableValues.test.mjs:218-229`. `stateregion` "XX" leaves `unreadableValueProperties` (phone stays), falls back to `location` and adds the warning.

### 12.8 Maladaptive (item 17)

Dropped from today (Zeke: "Yes to recommendation"). The current mapping stays: `buildClientMetadata.mjs:341-343` sends `maladaptive_behaviors__parentguardian` as stored, trimmed. There is no code or test change, and matrix row C27 keeps "stored value".

### 12.9 Assumptions

1. `full_home_address` is built from `street_address`, `home_apt`, `location_city`, a state and `postal_code`, in the form seen on the sandbox copies (5.2). This is not checked on every production Case; the script in the method note checks it.
2. Building from those parts meets guide line 364's intent (the home address for Child's House). The departure is in form only, and gets a guide note.
3. A blank street means no usable service address: `null`, never city/state/ZIP alone.
4. A placeholder apartment ("NA" and similar) is a blank, as with the allergy explain (11.1).
5. A street holding a whole address is split at its first comma. The 3 known cases are one-line addresses of the form "`<street>`, `<city>`, `<ST>` `<zip>`" (9.4).
6. "Always ' BCBA LBA'" also applies to CO clients and to BCBAs with no LBA in HubSpot, so the integration rewrites the 2 to 3 CO values CR shows with " BCBA". This follows Zeke's decision 3. CO rests on 5 values.
7. A typed supplier with "LBA" alone (no "BCBA") is sent as typed, so that it never becomes "… LBA BCBA LBA". The brief named only "BCBA"; "LBA" is added for this reason.
8. The supplier estimate (about 249 to 252 of 339) comes from the 11.2 breakdown, not from a new run.
9. The state warning is logged once per run, by the payload. The C24 builder reuses the code and adds no second warning.

### 12.10 Open questions for Zeke

14. **Guide line 385 / the copy workflow.** The integration does not need it (12.3). Should the guide note drop it altogether, or does United Care want the copy kept in HubSpot for its own use?

Every other point above is settled by the guide, the earlier production reads or Zeke's decisions. The script in the method note is a confirmation step, not a question.

### 12.11 Validation

1. Zeke runs the script in the method note (0 CR calls). Expected:
   - one workflow sets `full_home_address`, from `street_address`, `home_apt`, `location_city`, a state and `postal_code`;
   - the line break is after the street;
   - the exact supplier-fallback rate is about 74%.
2. Sandbox, requirement C24: R1 Child's House with apt "Apt 4A" → GET Meta 137697 = "`<street>` Apt 4A\n`<City>` NY `<ZIP>`", and the CR screen shows two lines. R2 Other Location with a blank service street → 137697 not written.
3. Sandbox, requirement C8: `stateregion` "XX", `location` New York → core StateProvince "NY", the run ends `success`, and the log has `state_unreadable_used_location`.
4. Sandbox, requirement C12: a BCBA with every licence blank on 82 → 131308 "First Last BCBA LBA". A Case with no BCBA role and supplier "Jane Doe" → "Jane Doe BCBA LBA".
