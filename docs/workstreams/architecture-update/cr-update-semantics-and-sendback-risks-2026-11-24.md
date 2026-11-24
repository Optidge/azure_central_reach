# CentralReach update semantics and the send-back risks of the field-wipe fix (2026-11-24)

Scope: Zeke's two asks of 2026-11-24. Part 1: "Why was this fill white fix necessary? We confirm and check in the CentralReach API documents of how updates work?", with the follow-up: "The only fields we should be sending over that are updating in CentralReach are the fields that are listed on the Google Doc as requirements." Part 2: the three risks of sending everything back (fix report section 7), checked live on the test records (Zeke: "Live calls from test records are ok.").

Script: `scripts/sandbox/check-cr-sendback-risks.mjs` (new). Nothing else in the repo was changed. No HubSpot or Azure call was made.

> **Open item from this run: one test value is still on test employee 5338681.** The record holds the language entry "English" that this check added. Every other key matches the baseline. The API could not remove the entry: three restore PUTs returned HTTP 200, but the language stayed (section 3). **Zeke: remove the language by hand on the CentralReach screen (employee 5338681, Profile, Languages).** After that, delete the restore file `/tmp/claude-501/cr-s7-restore-employee-5338681-2026-11-24T20-03-27-706Z.json` (mode 600; it holds the test record's values). Running the script's `--restore` command again will not help. It sends the same clears that already failed.

---

## 1. Summary

**Why the fix was needed.** CentralReach has one way to change an employee's or a client's profile fields: a PUT of the profile. The API has no PATCH and no field-by-field update for those fields. On 2026-11-24 we sent a PUT that carried only the fields the integration maps. CentralReach treated it as the whole record: it blanked the fields we left out (employee Job Title and Chosen Name, client Chosen Name; `sandbox-rounds/cr-unmapped-fields-run-2026-11-24.txt:79,90,185`). So a normal sync would have erased whatever staff had typed into the profile fields the integration does not own. The fix reads the record first and sends every field back unchanged, except the ones the integration is meant to change. It also skips the PUT entirely when none of the mapped fields changed.

**What the documentation says.** The public CentralReach API spec (version of 08/26) does not say whether a PUT replaces the whole record or only the fields sent. That point is undocumented. Two things in the spec point to whole-record replacement:
- even to change one field, the PUT requires the names, date of birth and (for employees) the email and External System ID;
- the only partial-update endpoints are for metadata (custom fields), not for profile fields.

**Zeke's question: can we send only the fields listed in the guide?** For metadata fields, yes, and the build already does: one field per call, or several in one PATCH. For profile fields (name, address, phone, date of birth, gender, guardian), **no**. The API offers no partial PUT, no PATCH, no flag and no per-field endpoint for them. So the only way to change just the guide-listed profile fields is the one the fix uses: send the other fields back exactly as CentralReach holds them.

**The three checks**
- **(a) SSN: not tested by writing, by design.** No SSN was written or read. The documentation does not say whether the API returns SSN masked. The fixed build sends back whatever the read holds, so a masked read would overwrite the real SSN. This needs one decision and one check (sections 4 and 5).
- **(b) Hire date sent back as read: PASS.** We set a hire date on the test employee. The fixed build sent it back exactly as CentralReach returned it (28-character ISO form). CentralReach accepted it (HTTP 200) and the date was unchanged.
- **(c) Lists sent back as read: PASS for the employee language list, with a caveat.** The language stayed. But it stayed because CentralReach ignores the list in a PUT, not because sending it back works: no PUT could remove it either. Pay types, pay codes and every client list (diagnosis codes, additional contacts, payors) are **not tested**. Their allowed values are unknown, or writing them would create other CentralReach records. They need a hand set-up by Zeke.

---

## 2. What the documentation says

**Sources**
1. **Public OpenAPI (Swagger 2.0) spec.** `https://centralreach.com/wp-content//uploads/2024/03/cr-api-list-100826.json`, title "CentralReach API Service", host `partners-api.centralreach.com`, base path `/enterprise/v1`. This is the host and path `src/lib/centralReachClient.mjs` uses. Downloaded 2026-11-24 (anonymous GET, no login, no credentials); SHA-256 starts `34c74433b4ba93fe`. It is the spec currently linked from `https://centralreach.com/resources/api/requests/`. The older `cr-api-list-111125.json` named in the local mirror now returns 404.
2. **Public API overview.** `https://centralreach.com/resources/api/`, also mirrored at `../central_reach_test_integration/central_reach_docs/cr_api_docs.md`.
3. **Earlier notes.** `ARCHITECTURE-REVIEW.md:266-273`, `unmapped-field-wipe-check-2026-11-24.md`. The guide extract (`guide-extract-2026-11-24.md`) does not mention ssn or hire date.
4. **Web search.** Found no other CentralReach material on PUT behaviour. The overview says API access goes through "your dedicated CentralReach representative", and the community articles need a login, so they were not opened.

### Full replace or partial update

**Not documented.** The spec has no "replace", "omit", "partial", "overwrite" or "blank" wording anywhere. Each PUT has only a one-line description: "Update an existing employee matched by 'ContactId'" and "Update an existing client matched by 'ContactId'" (spec, `paths."contacts/employee/{ContactId}".put` and `paths."contacts/client/{ContactId}".put`).

Indirect support for whole-record replacement (inference):
- **Required fields.** The employee PUT marks `ExternalSystemId`, `FirstName`, `LastName`, `PrimaryEmail` and `DateOfBirth` as `required: true`. The client PUT marks `FirstName`, `LastName` and `DateOfBirth`. An API that needs the name and date of birth just to change a phone number expects the full record.
- **Endpoint naming.** The PUT response models are named "Import...", which suggests an import-style update.

### Is there a partial-update endpoint?

**Not for profile fields.** Every PATCH and per-field endpoint in the spec:

| Endpoint | What it updates |
|---|---|
| `PATCH contacts/{ContactId}/metadata` | "Update multiple metadata fields for a given Contact Id." Custom fields only |
| `PUT contacts/{ContactId}/metadata/{FieldId}` | "Update a Metadata Field for the given Contact Id and Field Id." Custom fields only |
| `POST/PUT contacts/clients/{ContactId}/payors[/{payorId}]`, `.../archive` | Client payors (insurance) as separate records |
| `PUT/POST/DELETE contacts/employees/{ContactId}/claim-settings` | Employee claim settings |
| `POST contacts/{ContactId}/labels` | Labels |

The guide's core fields (names, gender, date of birth, email, phone, address, guardian names) exist only on the profile PUT. A partial-update endpoint that would have made the fix unnecessary **does not exist**.

### Other points the brief asked about

| Topic | What the spec says | Source |
|---|---|---|
| null vs "" | Not documented. No profile field is marked nullable except `DateOfBirth` (`x-nullable: false`) | spec, PUT parameters |
| Read-only fields | Not documented. `contactId` and `type` come back on the GET but are not PUT parameters | spec, `ImportEmployeeReturn` vs PUT parameters |
| SSN | GET model: `ssn`, "string". PUT: `SSN`, "Employee's social security number", optional. **Masking is not mentioned anywhere** | spec, `ImportEmployeeReturn.ssn`; PUT `SSN` |
| Dates | "Date properties should be transmitted in ISO-8601 UTC date format". `HireDate`, `TerminationDate` and `DateOfBirth` are `date-time` | `cr_api_docs.md:311`; spec PUT parameters |
| isActive | "Boolean values must be true or false. Unrecognized values will default to false." | spec, PUT `IsActive` |
| Content type | The PUT says it consumes `application/x-www-form-urlencoded`, but JSON is accepted (every live PUT since 2026-11-16) | spec; live runs |
| Employee lists | GET `languages` (array, element type not given) but PUT `Language` (**one string**). `payTypes` / `payCodes` match on both: PayType {name, startDate required, endDate}; PayCode {name, rate required} | spec, `ImportEmployeeReturn`, `PayType`, `PayCode` |
| Client lists | GET returns plural arrays `clientDiagnosisCodes`, `additionalContacts`, `primaryPayors`, `secondaryPayors`. The PUT takes **singular** fields: `ClientDiagnosisCode` (string), `AdditionalContact` (one object), `PrimaryPayor`, `SecondaryPayor` (one object each; ImportPayor requires 11 fields, including insurance company and plan name) | spec, `ImportClientReturn` vs client PUT parameters |
| Other name mismatch | GET `providerHourlyRate` vs PUT `ProviderDriveTimeHourlyRate` | spec |
| Keys the GET leaves out | The GET model has 14 employee fields and 9 client fields that the live test-record reads did not return (for example hireDate, phoneHome, department, uciNumber) | dry run below |

### Documented, observed and inferred

- **Documented:** no profile PATCH; metadata PATCH and per-field PUT exist; the required fields above; the GET and PUT field names and the mismatches above; dates in ISO-8601; ssn is a string with no masking stated.
- **Observed live:**
  - A PUT blanks a text key it leaves out (jobTitle, chosenName): `cr-unmapped-fields-run-2026-11-24.txt:79,90,185`.
  - It keeps `primaryOfficeLocation`, `isActive` and `type` when left out (same file).
  - A PUT of every key as read is accepted unchanged (same file, calls 3 and 9).
  - The GET leaves out a key that holds nothing: hireDate was absent, appeared after it was set, and was absent again after the restore (section 3).
  - Sending hireDate null clears it.
  - `Language` null or "" and `languages: []` do not remove a stored language.
- **Inference:** the profile PUT replaces the scalar profile fields named in its model and ignores keys that are not in its model (`languages`, the client plural lists, `contactId`, `type`). By the same pattern, the client list fields are probably not cleared when left out, but this is unproven.

**Does the documentation support the chosen fix (read, overlay, PUT)?** Only indirectly. Nothing contradicts it, and with no partial-update endpoint it is the only way to change some profile fields without losing others. The documentation does not promise that a value read can be written back unchanged. The live runs show that it can for text fields, dates, booleans and the employee language list.

**What Zeke could ask CentralReach support:**
1. Does `PUT /contacts/employee/{id}` (and the client PUT) replace every profile field, so that a field left out or sent null is cleared? Which fields are exceptions?
2. Is there, or will there be, a partial update (PATCH) for profile fields?
3. Does `GET /contacts/employee/{id}` return `ssn` in full or masked? If masked, what does a PUT of the masked value do?
4. Does a PUT without `PrimaryPayor`, `AdditionalContact` or `ClientDiagnosisCode` remove existing payors, additional contacts or diagnoses? Does sending `PayTypes` / `PayCodes` replace or add?

---

## 3. Live results per risk

**Runs (2026-11-24, from the repo root):**
1. Dry run: `NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs`. GETs only; ready for `--write` on the employee. The client has nothing to test.
2. Write run, employee only: `... --write --entity employee`. It:
   - set the probes with one full-body PUT (hireDate `2020-01-06T00:00:00.000Z`; `Language` "English"; both shapes are documented);
   - read the record back;
   - sent **the fixed build's own update body** (built with `buildEmployeePayloadForContactId`, `keepUnwrittenCoreFields`, `mappedKeysMatchRead` and `updateBodyFromRead` from `src/`), with addressLine2 changed to a marker;
   - read the record now and 20 s later, then restored it.
3. Restore rerun: `... --write --restore <file>`, with a second try that sends "" for the probe keys.

The client was not written: its four lists are empty, it has no date key other than date of birth, and no documented probe is safe to write.

**Before any write (dry run, fixed build, mapped keys unchanged):** `mappedKeysMatchRead` is true for both records, so the build sends **no PUT** when nothing mapped changed. This was confirmed offline with the build's functions on the live read.

| Risk | Record | Result | Evidence (shapes only) |
|---|---|---|---|
| (a) ssn sent back | 5338681 | **Not testable by design** (no SSN written or read). ssn is blank on the test employee; the build sends `ssn` blank back, accepted | Write run, body key `ssn:blank`, row `ssn equal` |
| (b) raw hireDate sent back | 5338681 | **PASS.** After set-up, hireDate reads as 28 characters (`9999-99-99T99:99:99.9999999Z`). The build body carried it exactly as read; PUT 200; hireDate `equal` after 0 and 20 s | Write run, steps B to D |
| (b) other keys in the same PUT | 5338681 | **PASS.** Only addressLine2 changed, as intended. Every other key (28) equal, dateOfBirth included | Write run, step D table |
| (c) employee `languages` sent back | 5338681 | **PASS (kept), but not because of the send-back.** The list (1 string) stayed `equal`. The restore then showed CR ignores `languages`: sending `languages: []` with `Language` null, then with `Language` "", left the entry in place | Write run step D; restore run |
| (c) employee payTypes / payCodes | 5338681 | **Not tested.** They are real PUT fields, but the pay-type and pay-code names valid for United Care are not known, and they affect payroll | — |
| (c) client lists (diagnosis codes, additional contacts, payors) | 5384589 | **Not tested.** All four are empty. Allowed diagnosis values are unknown, an additional contact creates another CR contact, and a payor needs 11 insurance fields. None could be cleaned up through this API | Dry run |

**Restore**
- Employee 5338681: hireDate cleared (sent null), addressLine2 back, every other key equal. **languages still holds 1 entry ("English")**, so the restore is **not verified** for that one key (see the box at the top).
- Client 5384589: only read (GET), never written.

---

## 4. Recommendation per risk, and changes to ask of the build chat

**Zeke's rule ("only the guide-listed fields should update").** The fix meets that rule in effect. CentralReach changes only the mapped fields; every other field is sent back with its current value, which is the only way the API allows. No other design is available for profile fields. Metadata fields already go one by one.

**(a) ssn: ask the build chat for one guard (recommended before go-live).** Today `updateBodyFromRead` sends `ssn` back exactly as read. Two outcomes are possible:
- If the GET returns the full SSN, that is safe, but the integration then carries a full SSN in memory on every update. It is never logged or saved, per the fix report.
- If the GET returns it masked, every update that sends a PUT would write the mask over the real SSN.

Leaving `ssn` out of the body is not safe either: by the observed rule, a text field left out is blanked, although this is not proven for ssn itself.

Safest handling until the check below is done:
- read ssn blank: send it as read (no change);
- read ssn exactly 9 digits (dashes allowed): send it as read;
- anything else (a mask character, fewer digits): **send no PUT**. Fail the record with a permanent error that names the field `ssn` and never its value. This is fail-safe whichever way CentralReach behaves.

The same guard should apply to any key matching `ssn|social|taxid`. ssn is not a guide requirement, so the integration never needs to change it, only to keep it intact.

**(b) Dates: no change needed.** hireDate round-trips in CentralReach's own form. `terminationDate` has the same type in the spec, so it is expected to behave the same (inference).

**(c) Lists**
- Employee `languages`: no change needed. The PUT ignores it, so the build can neither keep nor lose it. Optional tidy-up: leave keys the PUT model does not name (`languages`, `contactId`, `type`, the client plural lists) out of the body, so the integration does not resend payor and diagnosis data it does not need. They are ignored either way, so this is optional, not a fix.
- payTypes / payCodes and the client lists: keep the build as is. Treat them as **unsettled** until the hand-set check in section 5. If that check shows duplication or loss, the build chat should leave `payTypes` / `payCodes` out of the body, provided leaving them out is shown to keep them.
- Fakes: `src/tests/smoke/stage2Fakes.mjs` could model the language list as kept when left out, matching this run. This is a test-fidelity nit.

---

## 5. Assumptions and what remains unsettled

| Item | Status | Who can settle it, and how |
|---|---|---|
| Does the employee GET return ssn masked or full? | Unknown (not in the docs or any cached read; every recorded read had ssn blank) | **Zeke**, either way: (1) ask CentralReach support (question 3, section 2); or (2) choose one real employee whose SSN he knows is filled and run a **shape-only** read (length plus counts of digits / dashes / other characters, no value). He runs it himself or names the record. This script does not do it and will not write an SSN |
| Is ssn blanked when left out of a PUT? | Unknown (the text-key rule suggests yes) | CentralReach support. Not to be tested on a record with a real SSN |
| Filled payTypes / payCodes sent back: kept, duplicated or rejected? | Not tested | **Zeke**: add one pay type and one pay code by hand to test employee 5338681 on the CR screen, then run `NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-sendback-risks.mjs --write --entity employee`. It tests any filled risky key as it stands; no new probe is written for these. He removes them by hand afterwards |
| Client lists: left out or sent under plural names, kept? | Not tested (inference: ignored and kept, like `languages`) | **Zeke**: add a diagnosis code and an additional contact by hand to test client 5384589, then run the same command with `--entity client`. A payor only if he is willing to clean it up by hand |
| A GET leaves out a key that holds nothing (so "every key of the read" misses nothing that has a value) | Observed for hireDate only | Assumed for the other 13 employee and 9 client fields the GET did not return. A by-hand fill of one (for example phoneHome) would confirm |
| `providerHourlyRate` (read) vs `ProviderDriveTimeHourlyRate` (PUT) | Name mismatch; if filled, the build cannot send it under the PUT name | Same as above, if United Care uses it |
| The PUT accepts JSON though the spec says form-encoded | Observed on every PUT | No action |

---

## 6. CentralReach calls and record state

| Run | Token | GET | PUT | Total |
|---|---|---|---|---|
| Dry run (both records) | 1 | 2 | 0 | 3 |
| Write run (employee) | 1 | 7 | 3 (set-up, build body, restore) | 11 |
| Restore rerun (employee) | 1 | 7 | 2 (null, then "") | 10 |
| **Total** | **3** | **16** | **5** | **24** (budget 30) |

**Record state at the end**
- **Employee 5338681:** equal to the baseline on every key except **`languages`: 1 entry ("English") still present. Zeke removes it by hand.**
- **Client 5384589:** unchanged (read only).
- **Restore file still on disk:** `/tmp/claude-501/cr-s7-restore-employee-5338681-2026-11-24T20-03-27-706Z.json` (mode 600). Delete it after the hand fix.
- **Run outputs** (shapes only, outside the repo): `/tmp/claude-501/s7-write-run.txt`, `/tmp/claude-501/s7-restore-run.txt`.


**Closed 2026-11-24 (Zeke):** the probe language entry "English" left on test employee 5338681 stays; Zeke: "This is uncesssary - mark completed". The record's resting state now includes that entry; the restore file was deleted.
