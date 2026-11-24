# Employee decisions: read-only evidence (2026-11-23)

This note covers the open employee-side items in REMAINING-GAPS-2026-11-23.md section D, using read-only reads of HubSpot production `50317927` and of CentralReach (also production).

## How the evidence was read

- **Scripts:** six scripts in the session scratchpad, `employee-decisions-read.mjs` and `-2` to `-6`.
  - The correction used three more: `employee-shadow-read.mjs`, `employee-probe-anne.mjs` / `employee-probe-meta.mjs`, and `employee-recount.mjs`.
  - They follow the same rules: GET only, and the portal is checked first.
  - HubSpot: GET, plus POST to `/crm/v3/objects/{type}/search`. Every script checks the portal is `50317927` before its first CRM read.
  - CentralReach: GET only. The one exception is the token POST to `CR_TOKEN_URL`.
- **What was printed:** definitions, option values, counts, format masks (`9` = digit, `a` = letter), yes/no answers, CR contact IDs and label IDs. No dates of birth, emails, phones or Workday ID values.
- **Nothing was written** to HubSpot, CentralReach or Azure.
- **Scale:** 6,183 BT/RBT and 375 BCBA records in HubSpot. `GET /contacts/employees` returned 908 CR employees: 862 of type `employee`, 46 `generic`, 253 active.
  - The list holds 909 employees in a later read the same day.
  - It is complete only for **what the credentials can see** (see "Correction").
- **The CR employee list agrees with the direct lookup.** For every one of 150 BCBA Workday IDs and 130 BT/RBT ones, a direct `byExternalSystemId` lookup agreed with the list, with one exception: one BT/RBT ID is in the list, but the direct lookup did not find it.
- **Metadata correction (2026-11-23):** `GET /contacts/{id}/metadata` returns `isFilledIn` per field~~, but no value~~. The first script read the nested object `metadataDefinitionAndValue` as the value, so every metadata field showed as "filled". The claims below that rested on it are corrected in place.
  - **Review correction 2026-11-23:** the endpoint does return values. `DECISIONS-EVIDENCE-CASES-2026-11-23.md` reads client metadata values from the same `GET /contacts/{id}/metadata` (for example "None" in Allergies 126214). The Meta `138069` blank finding in section 5 still holds, because it rests on `isFilledIn` = false, not on a missing value.

## Correction (2026-11-23): the BCBAs are in CR, but the integration's credentials cannot see them

**What was wrong.** This section first said "most production BCBAs cannot be found in CR". Zeke corrected it (2026-11-23): "That's incorrect, these are in central reach." He gave two examples:
- Marcus Jackson (BT/RBT) is CR `5237928`;
- Anne Fetherston (BCBA) is CR `4871945`.

The original claims, struck through:
- ~~CR could not find 101 of the 111 BCBAs with Entered in CentralReach = Yes, not by Workday ID and not by name~~
- ~~None of the three sample BCBAs was found (Anne Fetherston, Maria Olson, Samantha Scheets)~~
- ~~Two possible reasons: these BCBAs are not in CR, or the API key cannot see them~~
- ~~The BT/RBT table that counted 26 BT/RBTs as "Not in CR"~~

**Why the earlier lookup missed them.** The lookup method was not the problem. The integration's CR credentials cannot see these records. Evidence from `employee-shadow-read.mjs`, `employee-probe-anne.mjs` and `employee-recount.mjs` in the session scratchpad:
- **Every GET by Anne's own CR ID answers 404 "Requested record not found".** That covers `GET /contacts/employee/4871945`, `/contacts/client/4871945`, `/contacts/4871945/labels`, `/contacts/4871945/metadata` and `/contacts/employee/byExternalSystemId?ExternalSystemId=4871945`. The same calls work for Marcus. So no lookup, whether by External System ID, name or email, can reach her.
- **The employee list is not cut short by paging.** `Offset` is a 1-based page number: `Offset=0` returns nothing, and `Offset=1` and `Offset=2` return consecutive pages. Paging page by page returns every contact the credentials can see, now 909: 862 `employee`, 46 `generic`, 655 inactive. Anne is not among them.
- **External System ID versus `workday_id`:** this cannot be checked for Anne, because her record cannot be read.
- **Contact type:** she is not a client either (`/contacts/client/4871945` answers 404).
- **Likely cause:** the CR API user does not have access to these contacts, for example through contact permissions by label or office. This is an assumption: only CR (Danny) can confirm it.

**Marcus was never missed.** He is found by Workday ID (`5237928`), and his CR External System ID equals `workday_id`.

**Corrected counts, Entered in CentralReach = Yes.** Matching order: Workday ID = CR External System ID; then the CR primary email (one GET per visible employee, 909 read); then first and last name.

| How the record is found in CR | BT/RBT | BCBA |
|---|---|---|
| By Workday ID (the integration's own lookup finds these) | 204 | 8 |
| By email only, CR External System ID blank | 131 | 0 |
| By email only, CR holds a 7-digit ID and HubSpot `workday_id` is blank | 42 | 1 |
| By email only, CR's 7-digit ID differs from `workday_id` | 1 | 0 |
| By email, more than one CR match | 8 | 0 |
| By name only | 5 | 0 |
| Not visible to the credentials (no Workday ID, email or name match) | 9 | 102 |
| **Total** | **400** | **111** |

- The 102 BCBAs: per Zeke they are in CR, and Anne shows that the credentials cannot see at least one of them.
- The 9 BT/RBTs may be in the same situation.

**What this means for go-live (cutover note).** The integration looks an unlinked employee up by External System ID only: first the record ID, then `workday_id` (`src/workflows/employeeSyncWorkflow.mjs:840-849`, `src/lib/centralReachClient.mjs:173-198`).
- **The 212 found by Workday ID** (204 BT/RBT + 8 BCBA): the run ends `waiting` "A CentralReach employee already holds this Workday ID." (`employeeSyncWorkflow.mjs:858-873`). No duplicate, but no update either until `employee_id` is written (Q33 cutover).
- **The 187 BT/RBTs and 1 BCBA found only by email or name:** both lookups answer 404, so the integration would **create a duplicate** (`employeeSyncWorkflow.mjs:882-911`, when `allowEmployeeCreate` is on).
- **The 102 BCBAs and 9 BT/RBTs the credentials cannot see:** these would also be **created as duplicates**. Even an exact External System ID match would not be found, because CR answers 404 for a record the API user cannot see.
- **Before go-live:**
  1. CR (Danny) gives the API user access to all employees.
  2. The existing employees are linked by writing `employee_id` (Q33).
  3. Creates stay off until both are done.

**The CR-link properties are blank on every production employee** (unchanged). No BCBA has `employee_id`. Only 8 BT/RBTs have it. `central_reach_record_link` and `central_reach_link_to_rt_rbt` are blank on all of them.

## 1. O-10 Date of birth

**Answer:** production BCBA now has `date_of_birth`, but it is plain text, not a property sync, and it is blank on all 375 BCBAs. BT/RBT `date_of_birth` is a sync, and it is blank on all 6,183. CR's date of birth cannot be read through the API.

**Evidence:**

| Property | Type | Sync | Filled |
|---|---|---|---|
| BCBA `date_of_birth` (created 2026-11-21) | string/text | no (`calculated` false, `readOnlyValue` false) | 0 of 375 |
| BCBA `dob` | string/text | — | 215 of 375 |
| BT/RBT `date_of_birth` | string/text | yes (`calculated` true, `readOnlyValue` true) | 0 of 6,183 |

- **`dob` formats:** `99/99/9999` (193), `9/99/9999` (16), `9/9/9999` (3), `99/9/9999` (2), `99-99-9999` (1). None is 2000-01-01.
- **The sync source is empty.** The Contact `date_of_birth` is HubSpot's default text property, and it is blank on all 5 sample Contacts.
- **CR answer:** `GET /contacts/employee/{id}` has **no date-of-birth key**. Its keys are contactId, isActive, type, externalSystemId, hireDate, names, primaryEmail, address, phones, gender, credentials, ssn, npiNumber, jobTitle, payTypes, payCodes, primaryOfficeLocation. So the API cannot show whether CR holds 2000-01-01.

**What follows for an update:** row 3.13 leaves a key the CR read does not hold out of the update. So a blank `date_of_birth` on an update leaves the date in CR unchanged, and the placeholder is never sent on an update (`centralReachClient.mjs:557-561`, create only).

**Code change (from Zeke's answer):**
- `src/mappings/employees/buildEmployeePayload.mjs:40`: `BCBA_DATE_OF_BIRTH_PROPERTY = "date_of_birth"`. Keep `readTextDate` at `:290`.
- Update the comments at `:33-38`, `employeeProperties.mjs:79` and `constants/centralReach.mjs:7`.
- Update `scripts/sandbox/check-cr-record.mjs` ~~`:208-210`~~ `:224-225`, `create-test-records.mjs` ~~`:155-158`~~ `:160-163` and ~~`:306`~~ `:310-311` (review correction 2026-11-23: the sandbox scripts have moved since; line numbers rechecked), and `src/tests/smoke/bcbaTextDateOfBirth.test.mjs` (it uses `dob`).

**BT/RBT:** it already reads `date_of_birth` (`:39`), but with the strict `readDate` (`:201`). The comment at `:34` says "date picker", but production is text. Switch `:201` to `readTextDate`. Otherwise an M/D/YYYY value would end as `error`.

**Question for Zeke:** with this change, every create sends 2000-01-01, and the 215 real dates in `dob` are never used. Is that intended, or will `date_of_birth` be backfilled from `dob`?

## 2. O-27 Salaried

**Answer:** CR contact `5384589` holds `1132653` "Salaried". This is the ID the code sends, so it matches.

**Evidence:**
- **Where the code sends it:** `constants/centralReach.mjs` ~~`:31`~~ `:33` (review correction 2026-11-23) defines `SALARIED: 1132653`. `buildEmployeePayload.mjs:191` sends it when `work_status === "Salaried"`; it is managed at `:142`.
- **Its place in the catalog:** "Salaried" sits under "Active Employee" (`1052621`), which sits under "Employment Status" (`1052541`). That is an employee group, not under All Clients.
- **CR did not stop an employee label going on a client record**, so the test client now holds it.
- **HubSpot `work_status` ("Hourly or Salary?"):** Hourly 241, Salaried 16, blank 118.
- **The 13 BCBAs found in CR agree:** 1 is Salaried in both systems and 12 are in neither. There is no mismatch.
- **Sample:** Anne Fetherston is Salaried in HubSpot, so the code would send `1132653`.
  - ~~her CR record was not found~~ Corrected: her CR record is `4871945`, but the integration's credentials get 404 on every read of it. So her CR labels cannot be checked.
- **Marcus:** not applicable. `work_status` is a BCBA property.
- **Side note:** BT/RBT Marcus Jackson holds the parent label "Active Employee" `1052621`. The integration does not manage that label, so it stays.

**Code change:** none.

**Question for Zeke:** remove Salaried from test client `5384589` by hand?

## 3. A-13 NY Medicaid

**Answer:** "No payor tags" does not cover the BCBA label NY Medicaid.

**Evidence:**
- **The guide limits the rule to client labels.** Line 217 says "Do not send the client funding-source labels in [G07C]. BCBA credential labels in section 8 were not named in this note."
- **The two Medicaid labels are in different groups:**
  - The client payor label "Medicaid NY" `1052532` is under "Funding Source" `1052531`.
  - The BCBA label "NY Medicaid" `1107647` is under "Billing Hold Medicaid affiliation" < "New Employee On-boarding".
- **Production:** 75 BCBAs have `ny_insurance_labels` with "MCD FFS-NY".
- **The 13 BCBAs found in CR mostly agree with HubSpot:** 3 hold it in both, 8 in neither, 1 has it in HubSpot only, and 1 has it in CR only.
- **Sample:** Anne Fetherston's HubSpot value is `MCD FFS-NY;Aetna-NY;Carelon-NY`.
  - The code would send NY Medicaid `1107647`.
  - Aetna-NY and Carelon-NY have no label (BL6).
  - ~~Her CR record was not found.~~ Corrected: CR `4871945` answers 404 to the integration's credentials, so whether she holds `1107647` in CR cannot be read through the API. Check it on the CR screen.

**Recommendation:** send it (keep BL5 as built, `buildEmployeePayload.mjs:188-189`).

**Question for Zeke:** the BCBA that holds the label in CR only would lose it, because the label is managed. Is that acceptable?

## 4. O-8 Workday ID format

**Answer:** a real Workday ID is 7 digits with no prefix, and in practice it starts with `10` or `20`.

**Evidence:**
- **HubSpot distinct values:** 645 are exactly 7 digits.
- **The 5 that are not:**
  - BT/RBT: 1 is in the `999-99-9999` shape, 1 has 5 digits, 1 is text plus 7 digits, and 1 is a 32-character sentence (this one is new since OPEN-ITEMS row 15).
  - BCBA: 1 is text plus 7 digits.
- **Leading zeros:** HubSpot has none. CR has 1.
- **The 7-digit HubSpot values start with** `20` (597) or `10` (51).
- **The 908 CR External System IDs:**

  | Format | Count |
  |---|---|
  | 7 digits | 486 |
  | blank | 310 |
  | 11 digits | 111 |
  | 12 digits | 1 |

  - None of the 11-digit values is a current BT/RBT or BCBA record ID.
  - Three CR values start with `53` and one with `48`. These look like CR contact IDs.
- **The two BT/RBT samples:** in each, the HubSpot value is 7 digits and equals the CR External System ID.

**Recommendation:**
- Check `^\d{7}$`. Anything else ends as an error with no CR write.
- Do not use the AZTEST prefix for the Workday round, because it would fail this check. Use a 7-digit value starting with `9` (for example `99000NN`). No real ID uses that range.

**Question for Zeke:** confirm the `9` range with Sara.

## 5. O-51 BT/RBT personal email

**Answer:** production BT/RBT has no `personal_email` property and no other personal-email property. The email-like properties are `email`, `email_contact` ("Email.") and `employee_emails`.

**Evidence:**
- ~~CR Meta `138069` on both BT/RBT samples is filled. It differs from HubSpot `email`, the Contact email, `email_contact` and `employee_emails`.~~
  - **Corrected:** the script misread the metadata answer. `isFilledIn` is **false** for `138069` on Marcus (`5237928`) and on Kate Lopez (`5018605`), and on 57 of the first 57 active CR employees read.
  - So CR's personal email is blank in practice. Holding T9 loses no data today.
  - Anne (`4871945`) cannot be read: 404.
- **CR `primaryEmail` equals HubSpot `email`.**
- **A blank does not clear CR's value.** A blank metadata value is cleared only when the integration wrote that field before (`src/lib/mappedState.mjs:193-208`).

**Code change:** none; keep T9 held.

**Question for Zeke:** ~~where does CR's personal email come from?~~ It is blank on every CR employee checked, so this question falls away.

## 6. O-23 / A-20 / A-22 Duplicate External System IDs

**Answer:** CR holds no duplicate External System ID among its 598 non-blank values. That is not proof that CR enforces uniqueness. ~~The list answer has no email, so there is no evidence either way on duplicate emails.~~

**Review correction 2026-11-23:**
- The 598 values come from the ~908 employees the integration's credentials can see. Records hidden from the API user (Anne Fetherston, and likely the other 102 BCBAs and 9 BT/RBTs in "Correction") were not checked, so a duplicate External System ID could still exist among them.
- There is evidence on duplicate emails. The recount in "Correction" (one primary-email GET per visible employee) found **8 BT/RBTs whose email matches more than one CR employee**. So CR does hold duplicate primary emails, and an email lookup alone cannot pick the record for those 8.

**Evidence:**
- **The two Workday IDs from guide line 734:**
  - `2002628`: ~~not in CR, not by ID and not by name.~~ Not found by ID or by name. Both HubSpot records are Yes.
    - **Review correction 2026-11-23:** a 404 does not mean absence. The API user gets 404 for records it cannot see (Anne, CR `4871945`). So `2002628` is either absent from CR or invisible to the credentials; only the CR screen (Danny) can tell.
  - `1034820`: CR `4499766`, active. It holds BT NY, RBT NY and GRAD Student-LBA NY, and no BCBA label. It is one CR employee: the existing CR record was kept, not a second one added.
- **HubSpot:** these two remain the only shared Workday IDs.

**Code change:** none.

**Question for Zeke:** for `2002628`, which HubSpot record is current? The first one processed creates the CR employee, and the second then links to the same contact.

## 7. O-6 New Mexico and Virginia

**Answer:** both labels exist in the live catalog (102 labels): `1157030` "NM Employee" and `1157031` "VA Employee", both under All Employees.

**Evidence:**
- **BT/RBTs:** 0 use either state.
- **BCBAs:** 8 use New Mexico and 2 use Virginia. 1 of the 10 is Yes, and none is linked.

**Code change:** add `"New Mexico": "NM"` and `Virginia: "VA"` to `buildEmployeePayload.mjs:89-93`, and the two labels to `:96-100`.
- There are no role labels for these states, so the filter at ~~`:170`~~ `:171` drops them (review correction 2026-11-23: `:170` maps the role labels, `:171` is the `.filter(Boolean)`).
- The contact form is not affected.

**Question for Zeke:** none (guide line 225).

## 8. O-20 and O-48

**O-20 `home_apt`:** BT/RBT `home_apt` exists (text). It is filled on 24 of 6,183; both samples are blank.

**O-48 bad emails and phones (all records):**

| | Bad emails | Short phones (<10 digits) | Other unreadable phones |
|---|---|---|---|
| BT/RBT | 23 | 1 | 20 |
| BCBA | 3 (`personal_email` and `ucaba_email_address`: 0) | 2 | 0 |

## 9. Create signal (guide lines 742 and 744)

**Production values:**

| Object | Yes | No- Made Inactive | Yes - Generic | Blank |
|---|---|---|---|---|
| BT/RBT (3 options) | 400 | 221 | 13 | 5,549 |
| BCBA (1 option) | 111 | — | — | 264 |

**Question for Zeke:** see "Correction" at the top of this note. Before go-live, do we link the existing CR employees by CR ID, writing `employee_id` per the Q33 cutover? We also need CR to give the API user access to every employee. Otherwise, these could be created a second time:
- ~~about 160 BT/RBTs and up to 101 BCBAs~~
- 196 BT/RBTs: 187 found only by email or name, plus 9 not visible;
- 103 BCBAs: 1 found only by email, plus 102 not visible.

## 10. Admin label `1052549`

**Answer:** ~~it could not be checked on the sample BCBAs, because they were not found in CR.~~ It still cannot be checked on Anne. Her CR ID is `4871945` (Zeke), but every read of it answers 404 to the integration's credentials. Check it on the CR screen.

**Evidence:**
- Admin is under All Employees.
- Of the 13 BCBAs found in CR, 2 hold Admin and 11 do not. 9 hold the BCBA label.

**Code change:** none. The integration does not manage Admin.

**Question for Zeke:** ~~what are the CR contact IDs of the three sample BCBAs?~~ Anne's is answered (`4871945`). Why can the API user not read it? Maria Olson's and Samantha Scheets's CR IDs are still unknown.
