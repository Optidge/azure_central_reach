# Employee shadow comparison (2026-11-23)

**Question:** for two real production employees, what would the integration send to CentralReach (CR), and how does that compare with what CR holds now?

**Short answer:**
- **Marcus Jackson (BT/RBT):** 14 match and 6 differ. None of the differences is a code bug. Today the integration would not send anything for him: it finds him by Workday ID and stops with `waiting`, because he is not linked yet (see "Go-live").
- **Anne Fetherston (BCBA):** no comparison was possible. Every CR GET for contact `4871945` answers 404 "Requested record not found". The integration's credentials cannot see her record. The table shows what the integration would send.
- **No new code bug was found.** One known code item still stands: BT/RBT date of birth is read with the strict `readDate` (`src/mappings/employees/buildEmployeePayload.mjs:201`). Marcus's date of birth is blank, so it did not show here.

## How it was run

- **Script:** `employee-shadow-read.mjs` in the session scratchpad (plus `employee-probe-anne.mjs` and `employee-probe-meta.mjs`).
  - HubSpot production `50317927`: GET only. The portal is checked before the first CRM read.
  - CR (production): GET only. The one exception is the token POST.
  - Nothing was written anywhere.
- **HubSpot read:** the record is read with exactly the properties the worker requests, `employeeRequestProperties()` plus `employee_id` (`src/workflows/employeeSyncWorkflow.mjs:378`). That is 34 properties for the BT/RBT and 36 for the BCBA. Every requested key came back, so there is no read failure (row 4.18). The associated Contact was also read, to check the mirrors.
- **What the integration would send:** worked out offline with the repo's own code, which makes no network calls. The script ran:
  - `buildEmployeePayload` (the payload, metadata and label lists);
  - `validateEmployeePayload`;
  - `buildEmployeePayloadForContactId`;
  - `keepUnwrittenCoreFields`, with no saved hashes, as on a first linked run;
  - `linkedEmployeeIdentity`;
  - the label rule "CR holds, minus managed, plus required".
- **CR read:**
  - core fields: `GET /contacts/employee/{id}`;
  - labels: `GET /contacts/{id}/labels`;
  - metadata: `GET /contacts/{id}/metadata`. This answer gives `isFilledIn` per field but **no value**, so for metadata only filled/blank can be compared.
- **What is reported:** match/differs and the shape of each difference. No personal values.

**Classes:**

| Class | Meaning |
|---|---|
| code bug | The code sends something wrong. |
| HubSpot data | HubSpot is wrong or incomplete. |
| CR data | CR was entered by hand differently or is incomplete. The integration would correct it, as designed. |
| expected | A designed outcome, such as a label the integration does not manage, or a field the integration fills for the first time. |

## Marcus Jackson, BT/RBT `2-48354559/61132159499` = CR `5237928`

**HubSpot gate:**
- Entered in CentralReach = Yes;
- checklist blank;
- `employee_id` blank (not linked);
- Work State New York; `bt_rbt_type` BT.

**What the code produces:**
- The mapper gives no warnings and no unreadable values.
- Validation passes for a create and for an update.
- If he were linked, rule 5.4 would give `success`, because the CR External System ID equals `workday_id`.
- The contact form on a create would be "Behavior Technician NY".

**Core fields** (`GET /contacts/employee/5237928`):

| Field | Req. | Result | What an update would do | Class |
|---|---|---|---|---|
| externalSystemId | T2 | match | keeps CR's value | — |
| firstName | T2 | match | same | — |
| lastName | T2 | match | same | — |
| primaryEmail | T2 | match | same | — |
| gender | T3 | differs: CR blank, HubSpot filled | fills CR | CR data (gap) |
| dateOfBirth | T2 | match (both blank). CR's read has no `dateOfBirth` key | left out | — (BT/RBT `date_of_birth` is blank on all 6,183 records) |
| addressLine1 | T4 | differs: punctuation or abbreviation only (e.g. "St" vs "Street") | overwrites CR with the HubSpot spelling | expected (hand-typed in CR) |
| addressLine2 | T5 | differs: HubSpot `home_apt` blank, CR filled | sends CR's own value back, so CR keeps it (row 3.13) | HubSpot data (`home_apt` gap) |
| city | T4 | match | same | — |
| stateProvince | T4 | match | same | — |
| zipPostalCode | T4 | match | same | — |
| phoneCell | T4 | match (10 digits) | same | — |

**Metadata** (`GET /contacts/5237928/metadata`, filled/blank only):

| Field | Req. | Result | Class |
|---|---|---|---|
| 133819 Work Address | T6 | match (both blank) | — |
| 147882 Active Case Load | T7 | differs: HubSpot `active_cases_count` filled (1 digit), CR blank | expected: the integration fills it for the first time |
| 138703 HubSpot link | T8 | differs: HubSpot filled (the record URL), CR blank | expected: the integration fills it for the first time |
| 138069 Personal Email | T9 (held) | CR **blank** (`isFilledIn` false). Not sent for a BT/RBT | expected |

**Labels:**

| | Label IDs |
|---|---|
| Required | 1052618, 1052643, 1132655, 1052630 |
| CR holds | 1052618, 1052621, 1052630, 1052643, 1132655 |
| Would add | none |
| Would remove | none |
| CR extra, not managed, kept | 1052621 "Active Employee" |

| Label | Req. | Result | Class |
|---|---|---|---|
| All Employees 1052618, Clinical 1052643 | TL4 | match | — |
| NY Employee 1132655 | TL1 | match | — |
| Behavior Technician NY 1052630 | TL3 | match | — |
| Active Employee 1052621 | — | CR only, not managed, so it stays | expected |

**Contact mirrors:** the BT/RBT record matches its Contact on the street, city, state, zip, phone, email, name and date of birth (blank on both). The one exception is `gender`: it is filled on the BT/RBT record and blank on the Contact.

**Totals:**
- 14 match: 9 core fields (date of birth counts as both blank), 1 metadata field, 4 labels.
- 6 differ:
  - expected: 4 (`addressLine1`, 147882, 138703, CR's extra label 1052621);
  - CR data: 1 (gender);
  - HubSpot data: 1 (`addressLine2`);
  - code bug: 0.
- Not compared: 138069, which is not managed for a BT/RBT (T9 is held).
- **Gap:** date of birth cannot be tested on a BT/RBT in production. HubSpot is blank on every record, and CR's read has no date-of-birth key.

## Anne Fetherston, BCBA `2-48354212/50806254341`, CR `4871945` as given by Zeke

**CR could not be read.** Every one of these GETs answered 404 "Requested record not found":
- `GET /contacts/employee/4871945`
- `/contacts/client/4871945`
- `/contacts/4871945/labels`
- `/contacts/4871945/metadata`

The same calls work for Marcus. She is not in the employee list either: the list has 909 rows, paged with `Offset` as a 1-based page number, so paging does not cut it short. So no field could be compared.

**HubSpot gate:**
- **Entered in CentralReach is blank.** The entry gate needs Yes (`src/lib/syncEligibility.mjs:26`), so today the integration would skip her.
- Checklist "NPI;External System ID";
- `employee_id` blank.

**What the integration would send** (all from the BCBA record):

| Item | Req. | Result |
|---|---|---|
| Core fields | B2-B7 | Every core field is filled except `addressLine2`. That covers names, `gender_new`, `dob` (M/D/YYYY, read as a date), `email`, address, city, state, zip and phone. |
| Validation | — | passes. No unreadable values, no warnings. |
| Contact form on a create | — | "Admin" |
| Metadata | B8, B9, B12 | 138069 `personal_email` filled; 126216 NY Medicaid ID filled; 138112 NJ Medicaid ID filled; 138113 CO blank; 138703 link filled |
| Labels | BL1, BL2, BL4, BL5, B10, BL8 | All Employees 1052618, BCBA 1130668, Clinical 1052643, NJ Employee 1107686, NY Employee 1132655, BCBA LBA NJ 1124245, BCBA LBA NY 1052629, **NY Medicaid 1107647**, **Salaried 1132653** |
| Not sent | BL6, BL7 | Aetna-NY and Carelon-NY have no label. Billing Hold is blank. |

**Contact mirrors:** the BCBA record matches its Contact on address, apartment (blank on both), city, state, zip, phone, email and name. Two fields are filled on the BCBA record and blank on the Contact: `dob` (vs Contact `date_of_birth`) and `gender_new` (vs Contact `gender`).

**Totals:** 0 match, 0 differ, all not comparable (CR 404); code bug: 0.

**Class:**
- HubSpot data: Entered in CentralReach should be Yes if she is in CR.
- Access: the CR credentials cannot see her record. CR has to confirm why.

## Go-live: what the integration's lookup does with these employees

The worker looks an unlinked employee up by External System ID only: first the HubSpot record ID, then `workday_id` (`src/workflows/employeeSyncWorkflow.mjs:840-849`, `src/lib/centralReachClient.mjs:173-200`).

- **Found by Workday ID (Marcus):** the run ends `waiting` "A CentralReach employee already holds this Workday ID." (`employeeSyncWorkflow.mjs:858-873`). No duplicate, but also no update until `employee_id` is written at cutover (Q33).
- **Not found** (CR External System ID blank or different, or a record the credentials cannot see, like Anne): both lookups answer 404, and the worker **creates** a new CR employee (`employeeSyncWorkflow.mjs:882-911`, when `allowEmployeeCreate` is on). That is a duplicate of the hand-made record.

The counts are in DECISIONS-EVIDENCE-EMPLOYEES-2026-11-23.md, "Correction".

## Open questions for Zeke

1. CR contact `4871945` answers 404 on every read for the integration's credentials. Is it the right ID? If it is, can CR (Danny) say why the API user cannot see it, for example contact permissions by label or office?
2. Anne's Entered in CentralReach is blank. Should it be Yes?
