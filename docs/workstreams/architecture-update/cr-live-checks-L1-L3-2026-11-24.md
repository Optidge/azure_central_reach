# CentralReach live checks L1 to L3 (2026-11-24)

Approval: Zeke, 2026-11-24, "Do L1 - L3 please." The run was paused before any call and then resumed ("Resume").

Scope: the checks in `build-chat-2-field-wipe-fix-REVIEW-2026-11-24.md`, section "Live CR checks before production".
- L1 writes went only to test employee 5338681.
- L2 and L3 were read-only GETs of production records.

Script: `scripts/sandbox/check-cr-l1-l3.mjs` (new). Nothing else in the repo changed. No HubSpot call, no Azure call, no git write.

Output: shapes only. That means key names, types, lengths, digit counts, character classes and list lengths. No production value and no ssn value was printed, saved or returned.

**Both test records are in their baseline state. Nothing needs restoring.**

---

## 1. Summary

| Check | Result | What it means before the phase one launch |
|---|---|---|
| **L1** lists, test employee | **PASS** | The build's full-echo PUT kept every one of the 28 keys equal by shape and by value, read twice 20 s apart. That includes the filled `languages` list and the 28-character date of birth. A second PUT with the lists left out also kept `languages`. **Limit:** `payTypes` and `payCodes` were empty on the test record, so this proves nothing about filled pay lists. |
| **L1** lists, test client | **Not testable** | All four client lists are empty on 5384589, and its payor sub-resource holds 0 payors. This matters, because **every one of the 10 production clients read holds 1 primary payor and 1 diagnosis code.** The client half of L1 needs Zeke's hand set-up (section 4). |
| **L2** SSN read form | **Not settled** | 15 production employees were read. **None holds an SSN:** 12 return `ssn` as empty text and 3 leave the key out. The build's SSN guard sends both forms back unchanged, so no sampled employee would fail. Whether CentralReach returns a filled SSN in full or masked is still unknown. |
| **L3** key survey | **Not passed (new keys found)** | Employees have 9 keys the test record lacks (`hireDate`, `phoneHome`, `latitude`, `longitude`, `medicaidId`, `g2Number`, `department`, `payrollCompany`, `payrollEmployeeNumber`). Clients have 3 (`phoneHome`, `latitude`, `longitude`). **Every filled date, nested ones included, has the same 28-character midnight form**, `9999-99-99T00:00:00.0000000Z`. |

**What it means for the send-back fix**
- For text fields, dates and the employee language list: proven. The echo leaves the record unchanged.
- Three things are still open before launch:
  1. **Client payors and diagnosis codes** are in every client read and untested on a write.
  2. **`latitude` and `longitude`** come back as numbers, but the PUT spec types them as strings. They are on every client, and an echo has never sent them.
  3. **Employee date of birth is missing from 14 of 15 production employee reads.** The build stops an employee update when HubSpot's date of birth is blank and CentralReach holds none (`unusableHeldEmployeeDateOfBirth`). That stop could block most employee updates (section 5, item 2).

**What it means for the SSN guard:** it is safe for every form seen (blank or absent). It has not been tested against a real filled SSN, because none was found.

---

## 2. L3 key survey (read-only, production)

Records read, all HTTP 200, no 404:
- **Employees (15):**
  - 5237928, 5018605, 4499766, 4979579, from the workstream docs;
  - 4131473, 4351877, 4181202, 4351879, 4217475, 4351880, 4217485, 4351881, 4217494, 4351884, 4366334, spread over the active IDs of page 1 of `GET /contacts/employees`.
- **Clients (10):**
  - 4438604, 4717582, 5265763, 4463962, from the docs;
  - 4278573, 4320034, 4346906, 4381305, 4397974, 4454535, spread over the active IDs of page 1 of `GET /contacts/clients`.
- `Offset=0` on the list calls answered 400 (`ValidationException` on `Offset`). `Offset=1` works. BUILD-PLAN's earlier client 404s did not repeat: every client asked for answered 200.
- Sample caveat: the employee list page is the oldest IDs, and many of those records are sparse. By credentials, job title or employee type, the 15 split as 2 BCBA, 4 BT/RBT and 9 neither. All 25 records are active.

### Employees: union of keys (15 reads; the test record has 28 keys)

"Present" counts reads that return the key at all.

| Key | Present | Filled | Type | Text length | In test record |
|---|---|---|---|---|---|
| contactId, firstName, lastName, isActive, type, languages, payTypes, payCodes, primaryEmail | 15 | first/last 15, email 10 | number / string / boolean / list | names 4-9, email 0-28, type 7-8 | yes |
| gender | 15 | 5 | string | 0-6 | yes |
| chosenName, company, middleInitial, title | 12 | 0 | string | 0 | yes |
| credentials, jobTitle | 12 | 6 each | string | 0-8 / 0-20 | yes |
| npiNumber | 12 | 6 (all 10 digits) | string | 0-10 | yes |
| ssn | 12 | 0 | string | 0 | yes |
| addressLine1, addressLine2, city, phoneCell, zipPostalCode | 10 | 5 / 1 / 5 / 5 / 6 | string | up to 21 | yes |
| stateProvince | 9 | 5 | string | 0-2 | yes |
| externalSystemId | 6 | 6 | string | 7 | yes |
| primaryOfficeLocation | 4 | 4 | string | 9-31 | yes |
| employeeType | 2 | 1 | string | 0-8 | yes |
| dateOfBirth | **1** | 1 | string | 28 | yes |
| **phoneHome** | 10 | 3 | string | 0-10 | **NO** |
| **latitude, longitude** | 5 | 5 | **number** | - | **NO** |
| **hireDate** | 3 | 3 | string | 28 | **NO** |
| **medicaidId** | 2 | 2 | string | 10 | **NO** |
| **department** | 2 | 0 | string | 0 | **NO** |
| **payrollCompany** | 2 | 1 | string | 0-3 | **NO** |
| **payrollEmployeeNumber** | 2 | 0 | string | 0 | **NO** |
| **g2Number** | 1 | 1 | string | 8 | **NO** |

**Employee lists**
- `languages`: non-empty in 0 of 15.
- `payTypes`: non-empty in 1. Up to 1 element, with element keys `{name: string, startDate: string}`.
- `payCodes`: non-empty in 1. Up to 4 elements, with element keys `{name: string, rate: number}`.
- No nested objects outside the lists.

### Clients: union of keys (10 reads; the test record has 26 keys)

| Key | Present | Filled | Type | Text length | In test record |
|---|---|---|---|---|---|
| contactId, firstName, lastName, isActive, type, gender, dateOfBirth, addressLine1, city, stateProvince, zipPostalCode, phoneCell, primaryEmail, guardianFirstName | 10 | 10 | number / string / boolean | - | yes |
| guardianLastName | 10 | 8 | string | 0-7 | yes |
| addressLine2 | 10 | 4 | string | 0-6 | yes |
| chosenName, middleInitial, title | 5 | 0 | string | 0 | yes |
| guarantorFirstName / guarantorLastName | 5 | 2 / 1 | string | 0-6 | yes |
| clientDiagnosisCodes | 10 | **10** (1 element each, string) | list | - | yes |
| primaryPayors | 10 | **10** (1 element each) | list | - | yes |
| secondaryPayors, additionalContacts | 10 | 0 | list | - | yes |
| externalSystemId | **0** | - | - | - | yes (test only) |
| **phoneHome** | 10 | 0 | string | 0 | **NO** |
| **latitude, longitude** | 10 | 10 | **number** | - | **NO** |

`primaryPayors` element keys:
- `coPayAmount` (number);
- `coPayFrequency`, `coPayType`, `coverageStartDate`, `groupName`, `groupNumber`, `insuranceCompanyName`, `insuranceContactPerson`, `insuranceContactPhone`, `planName`, `relationType`;
- `subscriberAddress`, `subscriberAddressLine2`, `subscriberBirthDate`, `subscriberCity`, `subscriberFirstName`, `subscriberGender`, `subscriberId`, `subscriberLastName`, `subscriberMiddleInitial`, `subscriberState`, `subscriberZip`.

All of these are strings except `coPayAmount`. They are the spec's `ImportPayor` fields, less `coverageEndDate` (left out when blank).

### Date-like keys (digits shown as 9; the time is shown because it is the pattern asked for)

| Key | Values | Length | Characters 11+ |
|---|---|---|---|
| employee `dateOfBirth` | 1 | 28 | `T00:00:00.0000000Z` (midnight, 7-digit fraction, Z) |
| employee `hireDate` | 3 | 28 | same |
| employee `payTypes[].startDate` | 1 | 28 | same |
| client `dateOfBirth` | 10 | 28 | same |
| client `primaryPayors[].coverageStartDate` | 6 (run 2 only) | 28 | same |
| client `primaryPayors[].subscriberBirthDate` | 6 (run 2 only) | 28 | same |

`terminationDate` was seen 0 times. No date had a time other than midnight.

**dateOfBirth and hireDate:**
- employees: `dateOfBirth` present in **1 of 15**; `hireDate` present in 3 of 15;
- clients: `dateOfBirth` present in 10 of 10; `hireDate` absent (it is not a client field).

**Keys the read leaves out:** as seen before for `hireDate`, a key that holds nothing is often left out of the read rather than returned blank. Examples:
- employee `ssn` absent on 3 records;
- employee `addressLine1` absent on 5 records;
- client `chosenName` and `title` absent on 5 records.

---

## 3. L2 SSN read form (read-only, production employees)

| Records | ssn key | Type | Length | Digits | Non-digit classes | Form | The build's guard (`unsendableSsnKey`, `mappedState.mjs:481-493`) |
|---|---|---|---|---|---|---|---|
| 12 of 15: 5237928, 5018605, 4499766, 4979579, 4131473, 4351877, 4181202, 4351879, 4351880, 4351881, 4351884, 4366334 | present | string | 0 | 0 | none | blank (empty text) | Returns null: sent back as read (""). **No failure** |
| 3 of 15: 4217475, 4217485, 4217494 | **absent** | - | - | - | - | absent | Returns null: nothing sent (absent stays absent). **No failure** |

No other ssn-like key (`social`, `taxid`) appeared. `npiNumber`, for comparison, is filled on 6 records, always 10 characters and 10 digits.

**Conclusion**
- Not one of the 15 sampled production employees holds an SSN in CentralReach, so the read form of a filled SSN (full or masked) is **still unknown**.
- For every form seen, the guard sends the value back unchanged, and no update fails.
- For forms not seen, the guard behaves as built and tested in `br16UnmappedFieldsKept.test.mjs`:
  - a full 9 digits (`999999999`) or the `999-99-9999` form is sent back;
  - a masked value (`*`, `X`, `#`, bullet) or any other digit count gets no PUT, and the record fails with `CR_EMPLOYEE_READ_FAILED`.
- So if CentralReach masks SSNs, every core update of an employee who has one would fail. With 0 of 15 holding one, that looks like a small group, but the sample cannot rule it out.
- The guard runs only when a core PUT would be sent (mapped keys changed).

---

## 4. L1 results

### Test employee 5338681

Sequence: baseline GET, then the full-echo PUT, then a GET now and another after 20 s, then the subset PUT, then a GET now and another after 20 s, then the restore check.

**Baseline:** 28 keys. The only filled list is `languages` (1 string). `payTypes` and `payCodes` are empty, and `ssn` is blank.

**Full echo**
- The body was the build's own: `buildEmployeePayloadForContactId`, `keepUnwrittenCoreFields` and `updateBodyFromRead`, with every mapped key equal to the read.
- It had 28 keys and carried `languages` exactly as read.
- `dateOfBirth` was rebuilt by the build as `9999-99-99T00:00:00.000Z` (24 characters).
- Result: **PUT 200. Both re-reads show all 28 keys equal by shape and by value.** That covers the date of birth (read back as 28 characters, equal) and `languages`. No 4xx.

**Subset PUT (lists left out)**
- The same body without `languages`, `payTypes` and `payCodes` (25 keys).
- Result: **PUT 200. All 28 keys equal in both re-reads. `languages` survived.** This matches 2026-11-24: the PUT ignores `languages` in both directions.
- Not covered: whether a filled `payTypes` or `payCodes` list survives being left out, or being sent back. Both were empty here, and these two **are** fields of the PUT model, unlike `languages`.

**Restore:** every key already equalled the baseline, so no restore PUT was needed. A final key-by-key comparison shows **28 of 28 equal**. The restore file was deleted.

### Test client 5384589

- Read only: a GET of the record and a GET of its payor sub-resource (0 payors).
- Lists: `clientDiagnosisCodes`, `additionalContacts`, `primaryPayors` and `secondaryPayors` are all empty. Per the brief, no client write was made.
- **No entries were added through the API:**
  - Only payors have a dedicated endpoint (`POST contacts/clients/{id}/payors`). It needs CentralReach insurance `companyId` and `planId` values, which cannot be obtained without copying them from a real client's payor. A payor can be archived but not deleted.
  - Diagnosis codes, additional contacts and pay types/codes have no dedicated endpoint; they exist only as fields of the profile PUT.

**Needs Zeke's hand set-up.** On the CentralReach screen, with each item clearly named as a test:
1. **Client 5384589:**
   - Profile: add 1 diagnosis code.
   - Payors (or Insurance): add 1 primary payor with an insurance company, plan, subscriber and coverage start date.
   - Contacts (or Additional Contacts): add 1 additional contact with a name and phone.
2. **Employee 5338681:** Payroll (or Pay settings): add 1 pay type with a start date, and 1 pay code with a rate.
3. Then run (about 9 calls per record):
   ```
   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-l1-l3.mjs --write --entity client
   NODE_USE_ENV_PROXY=1 node scripts/sandbox/check-cr-l1-l3.mjs --write --entity employee
   ```
   Pass: every list keeps the same length and every sub-field is equal. On the CentralReach payor screen, the payor's plan, subscriber and coverage dates are unchanged.
4. Zeke removes the test entries by hand afterwards.

---

## 5. Recommendations for the build

1. **Keep the echo for scalar keys and dates as built.**
   - Why: L1 passed on 28 of 28 keys.
   - Every filled date seen in production (10 client dates of birth, 3 hire dates, nested payor and pay-type dates) has the one 28-character midnight form the echo already round-trips.
   - The build's date-of-birth comparison uses the first 10 characters, which fits that form.
2. **Employee date of birth: settle before launch (high impact).**
   - What was seen: only 1 of 15 production employee reads holds `dateOfBirth`.
   - What the build does: `unusableHeldEmployeeDateOfBirth` stops an update (`CR_EMPLOYEE_READ_FAILED`) when HubSpot's date of birth is blank and the key is missing from the read. The employee PUT requires `DateOfBirth` (spec `required: true`).
   - So an employee with no date of birth in either system can never be updated.
   - Recommendation: a HubSpot production count of BCBA and BT/RBT records in sync scope with a blank date of birth, then a decision by Zeke. It may be acceptable (the record fails with a clear reason), but it should not be a surprise at launch.
3. **Client lists (payors and diagnosis codes): test before launch, do not change the build blind.**
   - What the build does: it echoes these lists under plural keys (`PrimaryPayors`, `ClientDiagnosisCodes`, `SecondaryPayors`, `AdditionalContacts`). The PUT model does not name those keys; it takes singular `PrimaryPayor`, `ClientDiagnosisCode` and `AdditionalContact`, which are not sent.
   - By analogy with `languages` (a plural key ignored, and kept when left out; proven again today), the payors and diagnoses are probably kept. But every production client has them, so section 4's hand test is required.
   - Optional tidy-up, only after that test: leave out the keys the PUT model does not name.
4. **Employee `payTypes` and `payCodes`: same hand test.**
   - Why: unlike `languages`, these are PUT-model fields, so sending them back could replace or duplicate them.
   - Seen on 1 of 15 production employees.
   - If the hand test cannot happen before launch, the fail-safe interim is the SSN-guard pattern: no core PUT when either list is filled, and the record fails with a named reason.
5. **`latitude` and `longitude`: prove one round trip.**
   - What was seen: they are on 10 of 10 clients and 5 of 15 employees. They are read as **numbers**, but the PUT spec types them as **strings**. The echo sends the number.
   - No echo has ever carried them, because the test records do not have them. If CentralReach rejected the number, every client update would fail.
   - Recommendation: set them on the test client and run one echo (or make L4 run on a record that has them). Leaving them out instead is unproven too.
6. **New text keys: expected safe, prove in L4.** This covers `phoneHome`, `medicaidId`, `g2Number`, `department`, `payrollCompany`, `payrollEmployeeNumber` and `hireDate`.
   - They are plain strings named in the PUT model, the same class as `jobTitle` and `chosenName`, which the echo is proven to keep.
   - `hireDate` was already round-tripped on 2026-11-24.
   - L4 should fill `phoneHome` on a test record to confirm.
7. **SSN guard: keep as built.**
   - It handles every form seen.
   - The masked-form question stays open (section 6), and the guard is fail-safe whichever way it is answered.
8. **Observation (not an L1-L3 item): `externalSystemId` is often absent.**
   - It is absent on 9 of 15 production employees and on 10 of 10 production clients.
   - For employees, `buildEmployeePayloadForContactId` sends HubSpot's Workday ID when CentralReach holds none. Whether CentralReach accepts setting an ID on update (rather than changing one) is not recorded.
   - This is relevant only to employees that sync without one.

---

## 6. What remains unsettled, and who settles it

| Item | Who | How |
|---|---|---|
| Filled client lists (payor, diagnosis, additional contact) survive the echo | **Zeke** | Hand set-up on 5384589 (section 4), then the `--entity client` run |
| Filled `payTypes` / `payCodes` survive the echo | **Zeke** | Hand set-up on 5338681, then the `--entity employee` run |
| `latitude` / `longitude` echoed as numbers are accepted | Build chat, with Zeke's go-ahead for a test-record write | Set both on a test record (documented string field), echo, deep-equal re-read; or cover it in L4 |
| Filled SSN read form: full or masked | **Zeke** | Ask CentralReach support (question 3 in `cr-update-semantics-and-sendback-risks-2026-11-24.md`), or name one employee he knows has an SSN on file for a shape-only read. 0 of 15 sampled employees hold one |
| Employees with no date of birth in either system cannot be updated | Zeke decides; build chat counts | HubSpot production count of blank date of birth among in-scope BCBA and BT/RBT records |
| New text keys round-trip (`phoneHome` and others) | Build chat | Part of L4 |

---

## 7. CentralReach calls and record state

| Run | Token | GET | PUT | Total |
|---|---|---|---|---|
| 1. Read run: test records, payor sub-resource, 4+4 recorded production IDs, two list calls (400) | 1 | 13 | 0 | 14 |
| 2. Survey resume (`--survey-only`): two list pages, 11 employees, 6 clients | 1 | 19 | 0 | 20 |
| 3. L1 write, employee only | 1 | 5 | 2 | 8 |
| **Total** | **3** | **37** | **2** | **42** (budget 60) |

Earlier paused attempt: 0 calls.

**Record state at the end**

| Record | Writes | State vs baseline |
|---|---|---|
| Employee 5338681 | 2 PUTs (full echo, subset), both 200 | **28 of 28 keys equal** (shape and value), checked key by key after 20 s. It still holds the 1 `languages` entry from earlier, which Zeke closed as staying |
| Client 5384589 | none (GET only) | Unchanged |

No restore file is left. The run outputs are shapes and requested contact IDs only, kept outside the repo:
- `/tmp/claude-501/l1l3-read-run.txt`
- `/tmp/claude-501/l1l3-survey-run2.txt`
- `/tmp/claude-501/l1l3-l1-employee.txt`

No raw response was saved.

## Addendum 2026-11-24 ~21:20 UTC: L1 on the test client, run by Zeke (8 CR calls)

Zeke added one payor by hand to test client 5384589, then ran `check-cr-l1-l3.mjs --write --entity client`. Read from his terminal.
- Baseline: 26 keys; filled list: `primaryPayors` (1 entry, 22 keys incl. `coPayAmount` as a number and coverage dates as text). `clientDiagnosisCodes`, `additionalContacts`, `secondaryPayors` were empty.
- Full-echo PUT (the build's update body, payor list sent back as read): HTTP 200; every key equal by shape and value, read twice 20 s apart. **PASS.**
- Subset PUT (all four lists left out): HTTP 200; the payor survived. **Omitted lists are not cleared.**
- Record equal to baseline at the end; restore file deleted.

Settled: a filled payor list (nested object with a number and dates) round-trips on a client, and is also safe when left out.
Still untested: a filled diagnosis code, additional contact or secondary payor; employee pay types / pay codes; `latitude` / `longitude` (not on this record); the read form of a filled SSN.
