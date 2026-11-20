# Sandbox test matrix

BUILD-PLAN step 7.1 (f). Draft of 2026-11-20 by the Q&A chat, for Zeke to agree. One row per requirement in BUILD-PLAN section 9, built rows included. A held, open or excluded row stays listed with its reason.

**Sources.**
- The requirements come from BUILD-PLAN section 9 at `c9d0edf`.
- Property names come from the finished property lists (`src/mappings/client/clientProperties.mjs`, `src/mappings/employees/employeeProperties.mjs`).
- Stored option values come from the sandbox property definitions read on 2026-11-20 (portal `52311591`, read-only).
- The Contact sources of the employee mirror fields come from a read-only production review on 2026-11-20 (decision 33 (a), counts only; see "Contact mirrors" below).

**How a row is checked.**
- **GET:** a read-only CentralReach GET after the push, on Zeke's go-ahead. Client: `GET /contacts/client/{id}`. Employee: `GET /contacts/employee/{id}`. Labels: `GET /contacts/{id}/labels`. Metadata: the contact's metadata read.
- **Screen:** checked on the CentralReach screen (display-only items).
- **HS:** the HubSpot record after the run: `last_sync_status`, `last_sync_error`, the CR ID and link properties.
- **Log:** the `Sync run summary.` line (row 3.20) for the run, read-only from Application Insights.

**Result column.** `pass`, `fail` with what was seen, or `accepted by Zeke` with his words. Filled during Stage 8; blank until then.

## Rounds

| Round | State | What happens |
|---|---|---|
| R1 | New York | Create the round's records (below), Entered in CentralReach blank. Push one at a time: BT/RBT 1, then the BCBA, then the Case. GET each one against the R1 column. |
| R1-U1 | New York | Update round on the R1 records: change each property to its U1 value (option rotation). One record at a time; GET after each. |
| R1-U2 | New York | Blank round: clear every mapped property that may be blank to blank. GET: each field is cleared in CR (BR16, 3.13). Required fields stay filled (names, Case DOB, primary emails). |
| R2 | Colorado | New records with the R2 values. Same pushes and GETs. |
| R3 | New Jersey | New records with the R3 values. Same pushes and GETs. |

**Every round creates:**
- a Case, linked to its Parent/Guardian Contact (type 3);
- a BCBA, linked to its own Contact (sandbox 191);
- BCBA 2, which stays in HubSpot only. It is the Case's RE BCBA, so the IA and RE fields hold different names (C11). It is also the Case's Potential IA and Potential Supervising BCBA, which must never be synced (C16);
- BT/RBT 1, linked to its own Contact by the "Contact Record" label (sandbox 231);
- BT/RBT 2, linked to the Case as Primary BT 2. Its name is pushed to the client metadata field BT #2 Name `138092` (row C14; guide line 505). The BT/RBT 2 record itself is not created as a CR employee, because no row needs that;
- the Case's associations to its staff:
  - the BCBA as Supervising (247) and IA (223);
  - BCBA 2 as RE (229), Potential IA (251) and Potential Supervising (249);
  - BT/RBT 1 as Primary BT 1 (238);
  - BT/RBT 2 as Primary BT 2 (240), Potential BT 1 (242) and unlabeled (187);
- decoy values on the excluded properties (section "Exclusions" below).

**Association type IDs.** The sandbox Case → BT/RBT IDs are 238 (Primary BT 1) and 240 (Primary BT 2); the reverse, BT/RBT → Case, is 239 and 241 (guide lines 434 and 982 to 989). The script finds each one by its label name at run time.

On every record:
- `sandbox_test_field` = true at create;
- `test_record` blank;
- Entered in CentralReach blank until its push;
- `workday_id` blank (temporary-ID path, decision 22).

`N` is the round number.

## Round 1 records (created 2026-11-20, sandbox only)

Created by `create-test-records.mjs --round 1 --write`; the IDs are in `sandbox-rounds/round-1.json`. Entered in CentralReach is blank everywhere; Azure is Stopped; nothing reached CR.

| Record | HubSpot ID |
|---|---|
| Case "CR Azure Test R1" | 68493177375 |
| BCBA | 67036479540 |
| BCBA 2 | 67023361578 |
| BT/RBT 1 | 67037268070 |
| BT/RBT 2 | 67048799131 |
| Guardian Contact | 264366211603 |
| BCBA Contact | 264352124460 |
| BT/RBT 1 Contact | 264372496241 |
| BT/RBT 2 Contact | 264355862915 |

**Read-back, HubSpot side.**
- Every value the script set holds, including `staffing_status` (Staffed 97153) and `case_status` (Warm) at the default stage.
- The Case `location`, `email`, `phone` and Guardian names filled from the Guardian Contact.
- BT/RBT 1 `date_of_birth`, `gender`, address, `state_home`, phone and `email` filled from its Contact.

Three items do not match the matrix:
- `total_hours_bt1bt2_work_schedule` = 2 (C20, blocked).
- `referral_source` is blank (C36).
- BCBA `email` is blank: the sandbox does not mirror it from the Contact (production does, 92/98). After row 6.4 the integration reads the Contact email directly, so B9 is unaffected.

BT/RBT 1 `active_cases_count` (T7) was blank 60 seconds after the create; it is read again before the push.

## Contact mirrors (employee fields that can only be set on the linked Contact)

Production 2026-11-20. Each mirror was compared with every Contact property on the employees' linked Contacts (BCBA: 100 records; BT/RBT: 96 with exactly one Contact). Counts only.

| Object | Mirror property (read by the integration) | Contact property that fills it | Match |
|---|---|---|---|
| BCBA | `address` | `address` | 100/100 |
| BCBA | `apartment__home` | `apartment` | 33/33 |
| BCBA | `city_home` | `city` | 99/99 |
| BCBA | `state_home` | `state_dropdown` (select; stores the full state name) | 96/96 |
| BCBA | `postal_code_home` | `zip` | 97/97 |
| BCBA | `employee_phone` | `phone` | 99/99 |
| BCBA | `email` (personal; B9 reads the Contact directly after row 6.4) | `email` | 92/98 |
| BT/RBT | `street_home` | `address` | 96/96 |
| BT/RBT | `location_city` | `city` | 77/77 |
| BT/RBT | `state_home` | `state_dropdown` | 19/19 |
| BT/RBT | `postal_code_home` | `zip` | 80/80 |
| BT/RBT | `employee_phone` | `phone` | 95/95 |
| BT/RBT | `email` | `email` | 96/96 |
| BT/RBT | `gender` | `gender_employee` or `gender` (both matched 18/18) | set both on the test Contact |
| BT/RBT | `date_of_birth` | not shown: no sampled BT/RBT had one | assumed Contact `date_of_birth`; the script checks it |

**Case properties that are read-only and follow the Guardian Contact.** Production, 2026-11-20, 100 Cases with exactly one Contact:

| Case property | Guardian Contact property | Match |
|---|---|---|
| `location` | `location` and `state_dropdown` (both are set on the test Contact) | 100/100 |
| `email` | `email` | 92/92 |
| `phone` | `phone` | 99/99 |
| `guardian_first_name` | `firstname` | 100/100 |
| `guardian_last_name` | `lastname` | 99/99 |

Two other read-only Case properties:
- `total_hours_bt1bt2_work_schedule` is calculated, so the script sets its inputs.
- `referral_source` has no Contact source (C36).

Not mirrors (set on the record): BCBA `gender_new`, `date_of_birth` (sandbox only; production has none, O-10), `ucaba_email_address`; BT/RBT `home_apt`, `first_name`, `last_name`, `location`, `bt_rbt_type`.

Findings for the plan:
- **(a)** In production only 19 of 96 sampled BT/RBTs have `state_home` filled, so T4 sends no mailing state for most BT/RBTs.
- **(b)** BT/RBT has two Contact association types in production: 109 "Contact Record" and 107 unlabeled.
- **(c)** Production BCBA `email` matched the Contact email on 92 of 98, so 6 differ today.

## Business rules

| Req | What is tested | Round and step | Check | Result |
|---|---|---|---|---|
| BR1 | A create happens only when Entered in CentralReach is Yes and the record is not linked. Case: `enter_in_central_reach` contains `Yes`. Employees: `entered_in_centralreach` = `Yes`. | R1: no push before Yes; the push sets Yes | GET (none before, one after); HS | |
| BR2 | Blank `workday_id` → created with the HubSpot record ID as External System ID, status `waiting` | R1, R2, R3 employee pushes | GET `ExternalSystemId` = HubSpot ID; HS `waiting` | |
| BR3 | No second create: a second run links, and an unclear lookup never creates | R1: run the BT/RBT twice (Entered toggled, or a re-queue) | GET: one employee; Log `operation` | |
| BR4 | Record gate: a record without `sandbox_test_field` never syncs | R1: one extra BT/RBT with Entered = Yes and the gate blank | Log `skipped`; no CR contact | |
| BR5 | A change to a listed field reaches the linked CR record, whatever Entered in CentralReach holds | R1-U1: one update with Case `enter_in_central_reach` blank, and one with BCBA `entered_in_centralreach` = No | GET: both updates arrive | |
| BR6 | A Case in any of the four excluded stages is skipped, for an update and for a create | R2: move the Case to each of `1383894301`, `1383894303`, `1383894302` and `1332962645` in turn, changing one field each time. Also a new Case (by hand) created in `1383894301` with Entered = Yes | Log `skipped` each time; GET unchanged; no CR client for the new Case | |
| BR7 | `test_record` = true is skipped | R1: one extra Case with `test_record` = true | Log `skipped` | |
| BR8 | ID mismatch → `error`, no write | R2: the wrong-Client-ID test (7.1 e); employee mismatch waits on the Workday path (O-8) | HS `error`; GET unchanged | |
| BR9 | Status values `success`, `error`, `waiting` only | every run | HS | |
| BR10 | While `waiting`, updates continue and send the External System ID CR holds | R1-U1 on the employees | GET; Log | |
| BR10 (checklist) | The checklist is ticked while CR still holds the temporary ID. Set "External System ID" in `btrbt_in_cr_checklist` on BT/RBT 1 and in `bcba_in_cr_checklist` on the BCBA, then untick it | R1-U1 | Ticked: HS `error` (`CHECKLIST_STILL_TEMPORARY`) and the update is still sent. Unticked: back to `waiting` | HS; GET; Log | |
| BR11 | One Workday ID per record: a second record with the same ID → `error` | **held**: Workday ID path waits on O-8; reading A-22 for Zeke | — | |
| BR12 | No deactivation; `Yes - Generic` and `No- Made Inactive` keep getting updates | R1-U1: BT/RBT 1 Entered → `Yes - Generic`, change one field; then → `No- Made Inactive`, change another | GET updated both times; CR still active | |
| BR13 | Writeback is only the listed properties | every run | HS: only the BR13 list changed | |
| BR14 | Retries 1 min, 5 min, 15 min, 1 h, 4 h, then the dead-letter queue; poller and sweep; a no-op writes nothing | Stage 8 rows "Retries and alert" and "Poller and sweep" | Log; Service Bus counts | |
| BR15 | One email alert on a dead-letter; HubSpot failure and waiting views | Stage 8 "Retries and alert" | email arrives; views list the record | |
| BR16 | A failed read is never a blank sent to CR | wave 2 offline tests; R1-U2 for real blanks | Log; GET | |
| BR17 | Staffing compared by record ID and role | R1-U1: swap Primary BT 1 and 2, then remove BT 2 | GET 131313 / 138092 | |
| BR18 | Changes without an edit are caught (`case_status`, `staffing_status`, name rollups, associations) | R1-U1 association change with the Case workflow off | Log from the poller | |
| BR19 | Labels: managed out, required in, hand-added kept, never an empty POST, no second POST inside 150 s | R1 first (Stage 8 "Labels, first"), then every round. Before an R1-U1 push, School `1052688` is added by hand to the R1 client on the CR screen | GET labels: School is kept; Log `labels` | |
| BR20 | Sandbox first, test records only, created with their associations | every round | the record list above | |
| BR21 | Logs name fields, never values | every run | Log: no value of a test record appears | |
| BR22 | Client contact form and External System ID on create only; ExternalSystemId on update only when CR holds the same value | R1 Case create, then R1-U1 | Log `crCalls`; GET | |

## Case → CR client

R1, R2 and R3 are the create values. U1 is the R1-U1 change. U2 is the blank round (blank unless stated).

| Req | HubSpot property | R1 (NY) | R2 (CO) | R3 (NJ) | U1 | Expected in CR | Check | Result |
|---|---|---|---|---|---|---|---|---|
| C1 | — | — | — | — | — | Contact form "Public Client Intake Form" (or `CR_CLIENT_CONTACT_FORM`) on create only | Log `crCalls`; Screen | |
| C2 | `phi_first_name__cloned_`, `phi_last_name` | Zeke / Swanson Azure Test RN | same | same | last name + " U1" | `FirstName`, `LastName` (never `dealname`) | GET | |
| C3 | `phi_date_of_birth` | 2016-01-15 | 2017-02-16 | 2018-03-17 | 2016-01-16 | `DateOfBirth` | GET | |
| C3 | `phi_date_of_birth` blank on create | — | — | — | — | extra Case in R2 with no DOB → `error`, no create | HS; Log | |
| C4 | `phi_gender` | male | female | male | female | `Gender` | GET | |
| C5 | record ID | — | — | — | — | `ExternalSystemId` = Case record ID on create; not on update | GET; Log | |
| C6 | `email` (from Guardian Contact `email`) | zeke+swanson_azure_test_N@optidge.com | same pattern | same pattern | via K1 | `PrimaryEmail` | GET | |
| C7 | `guardian_first_name`, `guardian_last_name` (from Guardian Contact `firstname`, `lastname`) | Don Azure Test RN / Swanson | same | same | via K1 | `GuardianFirstName`, `GuardianLastName` | GET | |
| C8 | `street_address`, `home_apt`, `location_city`, `stateregion`, `postal_code` on the Case; `phone` from Guardian Contact `phone` | N01 Azure Test St, Apt NA, New York, NY, 10001, 212-555-NN01 | …, Denver, CO, 80201, 303-555-NN01 | …, Newark, NJ, 07101, 973-555-NN01 | street + " U1"; phone via K1 | address 1, 2, city, state, zip, cell phone | GET | |
| C9 | `phone_number__second_` | — | — | — | — | **not built** (decision 36): `PhoneHome` never sent | Log: not in the payload | |
| C10 | `hubspot_owner_id` | Zeke Swanson (161391908) | same | same | Akiera Conner (167266469) | Meta `138851` = the owner's name | GET | |
| C11 | Case → BCBA IA (223) to the BCBA, RE (229) to BCBA 2 | the round's BCBAs | same | same | RE removed | Meta `131314` = "Zeke Swanson BCBA Azure Test RN"; `144602` = "Zara Swanson BCBA2 Azure Test RN"; `144602` blank after the removal | GET | |
| C12 | `ongoing_central_reach_provider_supplier` | Azure Test Supervising N | same | same | + " U1" | Meta `131308` (typed text) | GET | |
| C13 | Supervising (247) + `lba_licensure__ny` = Grad Permit | association made | — | — | — | **open** (O-15): nothing sent to `136052` | GET: `136052` unchanged | |
| C14 | Case → BT/RBT Primary BT 1, Primary BT 2 | BT1 / BT2 of the round | same | same | swap 1 and 2; then remove BT 2 | Meta `131313`, `138092` = "Jane Swanson Azure Test RN" / "Jill Swanson Azure Test RN" | GET | |
| C15 | Outgoing BT 1/2 | — | — | — | — | **open** (O-15) | — | |
| C16 | Never-synced associations: BCBA 2 as Potential IA (251) and Potential Supervising (249); BT/RBT 2 as Potential BT 1 (242) and unlabeled (187) | made by the script | same | same | — | `131314` holds only the IA BCBA's name; `131313` holds only "Jane Swanson Azure Test RN" | GET | |
| C17 | `work_schedule_details`, `btrbt_work_schedule_2_details` | AzT N Sched 1 Mon-Fri 9-12 / AzT N Sched 2 Sat 10-1 | same | same | + " U1" | Meta `132304`, `138093` | GET | |
| C18 | `work_schedule_*_details__for_location_2_other` | — | — | — | — | **open** (O-14): no CR field | — | |
| C19 | `finalized_client_service_hours_post_assessment`, `client_service_hours_total` | AzT N weekdays after 3pm / 20 | / 15 | / 25 | / 22 | Meta `126209` = "text, hours" (assumed format, O-28) | GET | |
| C20 | `total_hours_bt1bt2_work_schedule` (calculated; the script sets its inputs `hours_bt_work_schedule_1` and `_2`) | 10 + 8 | 7 + 5 | 14 + 10 | BT 1 hours → 11 | Meta `134331` = the BT 1 + BT 2 total (18 / 12 / 24 / 19). **Blocked: the HubSpot formula is `1 + 1`** (production and sandbox, 2026-11-20). Every production Case holds 2 (2,876 of 2,876, the 234 with BT hours included), and R1 shows 2 for 10 + 8. As built, CR would get "2" for every client. Zeke fixes the formula in the sandbox during testing (decided, below); production before go-live | GET | R1 HubSpot: 2 (fail at source; waiting on the formula fix) |
| C21 | `hours_bt_work_schedule_1/2` | — | — | — | — | **open** (O-18) | — | |
| C22 | `initial_auth_tracks` + `n97153_approved_assessment_hours_auth_req` (8) + `ia_hours_from_the_ia` (6) | Prior Authorization Required | No Prior Authorization Required | blank | R1 → No Prior | Meta `132431`: R1 "8", R2 "6", R3 blank, U1 "6" | GET | |
| C23 | `ongoing_auth_period_start_date`, `ongoing_autrh_period_end_date` | 2026-11-01 / 2027-04-30 | 2026-12-01 / 2027-05-31 | 2027-01-01 / 2027-06-30 | start date cleared | Meta `134672` = "11/01/2026 - 04/30/2027"; U1: "04/30/2027" | GET | |
| C24 | `specific_home_location`; `full_home_address` = "N01 Azure Test St, Apt NA, {city}, {ST} {zip}"; `service__street_address`, `service__apt`, `service__city`, `service__postal_code` = "200 Service Rd", "Suite N", {city}, {zip prefix}2 (all set in every round) | Child's House | Other Location | More Than One Location | R1 → Other Location | Meta `137697`: R1 and R3 the `full_home_address`; R2 and U1 "200 Service Rd, Suite N, {city}, {zip}" | GET | |
| C25 | `service_address__other` = "300 Second Site Ave, {city} {ST} {zip prefix}6" (set in every round) | set, not sent | set, not sent | sent | — | Meta `138091` only in R3: "300 Second Site Ave, Newark NJ 07106" | GET; Screen | |
| C26 | `allergies`, `allergies__yes__explain` | Confirmed / AzT N peanuts | Denial | blank | R1 → Denial | Meta `126214`: "Yes, AzT N peanuts" / "No" / blank (O-28) | GET | |
| C27 | `maladaptive_behaviors__parentguardian`, `does_your_child_have_any_other_comorbid_diagnoses_` = "AzT N comorbid" (every round) | Aggression | Elopement | Mouthing Non Food Itemsth (the stored spelling) | R1 → Other | Meta `126207` = stored value; `132303` = text | GET | |
| C28 | `severity_level_clinical`, `important_information` | Level 2 / AzT N parent note | Level 1 | Level 3 | Level 3 | Meta `133826`, `138378` | GET | |
| C29 | `insurance_primary` (+ `insurance_1__other__summary`), `insurance_id_1` | Medicaid FFS / AZT-N-INS1 | Other + "AzT N other carrier" | Aetna | R1 → UHC | Meta `126210` = carrier or the Other summary; `131316` = ID | GET | |
| C30 | `insurance_2` (+ `insurance_2__other__summary` = "AzT N other carrier 2"), `insurance_id_2` | Cigna / AZT-N-INS2 | Other + summary | blank (carrier, summary and ID) | R1 → Beacon-Carelon | Meta `144600`, `144601`; never `n2_what_type_of_insurance`. Guide lines 369 and 370: the summary is used only when the carrier is Other. With a blank carrier, `144600` must be blank. **Today's mapper sends the summary when the carrier is blank** (`carrier \|\| otherSummary`, for C29 and C30). That is a defect against the guide and goes to the build chat | GET | |
| C31 | `n1_what_type_of_insurance` + the Medicaid pair (Dr AzT N Medicaid, 100000000N) or the commercial pair (Dr AzT N Commercial, 200000000N) | Medicaid FFS | Medicaid FFS - CO | Medicaid FFS - NJ | Commercial Enrolled; later Commercial OON; then Unsure | Meta `131151`: Medicaid pair for the three Medicaid types, commercial pair for both commercial types, blank for Unsure | GET | |
| C32 | `referring_provider_medicaid_id` | AZTMCD00N | same | same | + "U1" | Meta `141233` | GET | |
| C33 | `phi_diagnosis` + `diagnosis_other` | Yes / AzT N dx note | Other | Yes- Down's Syndrome | R1 → Unsure | Meta `144793`: the option text (stored `Yes` shows as "Yes-F84.0"), then `diagnosis_other`. R1 "Yes-F84.0, AzT 1 dx note"; R2 "Other, AzT 2 dx note"; R3 "Yes- Down's Syndrome, AzT 3 dx note" (O-28) | GET | |
| C34 | `most_recent_asd_diagnosis_date_1`, `…_medicaid` | 2025-03-10 / 2025-04-11 | +1 month | +2 months | +1 day | Meta `131195`, `138701` as MM/DD/YYYY | GET | |
| C35 | `policy_holder_name`, `phi__policy_holder_dob` | Don Swanson / 1985-06-20 | same | same | 1985-06-21 | Meta `138090`, `137667` | GET | |
| C36 | `referral_source` | Google | School | Other | R1 → Care manager | Meta `126222` = the value the Case holds. Guide lines 373, 382, 470 and 530: `referral_source` is read-only (a synced field) and the integration only reads it. The guide does not name where it is synced from. So the R1 to R3 values cannot be set: the read-back records what each test Case holds, and the GET must match it. If every test Case comes back blank, C36 is tested only as "blank stays blank" (question 1 below) | GET | |
| C37 | record ID | — | — | — | — | Meta `138702` = `https://app.hubspot.com/contacts/52311591/record/0-3/{id}` | GET | |
| C38 | `insurance_id_3/4` | — | — | — | — | **open** (O-19): not requested | — | |
| CL1 | `location` (from Guardian Contact `location` and `state_dropdown`) | New York | Colorado | New Jersey | R1 → New Jersey (on the Contact) | NY Client `1082499` / CO `1132648` / NJ `1132647`; U1 removes NY and adds NJ | GET labels | |
| CL2 | `specific_home_location` | Child's House | Other Location | More Than One Location | R1 → Other | Home `1052656` in R1 and R3; none in R2; removed in U1 | GET labels | |
| CL3 | `case_status` | Warm | Cold | Warm | R1 → Cold | Active Client `1125427` / In-Active `1121488`, never both | GET labels | |
| CL4 | `staffing_status` | Staffed 97153 | 97151 Services | X 97153 | R1 → Hot Lead | `1156746` / `1156743` / `1156747`; none after U1; retired IDs never sent | GET labels | |
| CL4 (retired values) | `staffing_status` = Pending 97151 Services, then Starting 97153 Services | — | — | — | R1-U1, one after the other | No staffing label for either (G19 keeps only three) | GET labels | |
| CL4 (retired label) | Before the R1-U1 push, Pending 97151 Services `1156742` is added by hand to the R1 client on the CR screen | — | — | — | push | `1156742` is removed (it is in the managed list) | GET labels | |
| CL5 | funding-source labels, driven by `insurance_primary` and the state | Medicaid FFS (NY) | Other | Aetna (NJ) | UHC | **excluded** by the guide: no Medicaid NY, Aetna, Carelon, UHC `1052534` or Anthem BCBS `1052620` label in any round | GET labels | |
| CL6 | every client | — | — | — | — | All Clients `1052619` always | GET labels | |

**`staffing_status`.** The property is automated from the Case stage. Its description says it is blank before First Three Days. The script sets it after the stage is set, and reads it back. If the stage's automation overwrites it, the round sets the Case stage that gives the wanted value instead.

**`case_status`.** It is also stage-driven (guide line 374), so the read-back shows the value the Case actually holds. CL3 is checked against that value. If it differs from the matrix, the stage is moved to give Warm or Cold.

**Case stage at create (Zeke, 2026-11-20: "let it be default").** The Case is created in the Client Pipeline's first stage. The script reads that stage from the pipeline at run time. That stage comes before First Three Days, so the stage automation may leave `staffing_status` blank. If it does, CL4 is tested in R1-U1 by moving the Case to a stage that sets each staffing value. The read-back shows the value the Case actually holds.

## BCBA → CR employee

| Req | HubSpot property | R1 (NY) | R2 (CO) | R3 (NJ) | U1 | Expected in CR | Check | Result |
|---|---|---|---|---|---|---|---|---|
| B1 | — | — | — | — | — | Contact form `Admin` (read the labels and profile right after the create: what did the form set?) | GET; Screen | |
| B2 | `workday_id` blank | blank | blank | blank | — | `ExternalSystemId` = HubSpot record ID; `waiting` | GET; HS | |
| B3 | `first_name`, `last_name` | Zeke / Swanson BCBA Azure Test RN | same | same | + " U1" | first, last name | GET | |
| B4 | `ucaba_email_address` | zeke_work_email+azure_test_N@optidge.com | same pattern | same pattern | changed (O-11: does CR accept it?) | `PrimaryEmail` on create; update sends the one CR holds | GET | |
| B5 | `date_of_birth` | 1990-01-15 | 1991-02-16 | **blank** | — | DOB; R3 gets the placeholder 2000-01-01 on create | GET | |
| B6 | `gender_new` | Male | Female | Male | Female | gender | GET | |
| B7 | Contact `address`, `apartment`, `city`, `state_dropdown`, `zip`, `phone` | N04 Azure BCBA St, Apt NB, New York, New York, 10003, 212-555-NN04 | Denver, Colorado, 80203, 303-… | Newark, New Jersey, 07103, 973-… | street + " U1" (on the Contact) | address 1, 2, city, state, zip, cell phone | GET | |
| B8 | `medicaid_id__ny/nj/co` | AZTNY00N / AZTNJ00N / AZTCO00N | same | same | NY → blank | Meta `126216`, `138112`, `138113` | GET | |
| B9 | Contact `email` (BCBA → Contact 191) | zeke+bcba_azure_test_N@optidge.com | same | same | changed on the Contact (K3) | Meta `138069` | GET | |
| B10 | `work_status` | Salaried | Hourly | Salaried | R1 → Hourly | label Salaried `1132653` in R1 and R3; removed in U1 (O-27) | GET labels | |
| B11 | `hubspot_owner_id` | — | — | — | — | **open** (O-17) | — | |
| B12 | record ID | — | — | — | — | Meta `138703` = the BCBA record link | GET | |
| B13 | `credentialed_insurances__ny` (a decoy, set by the script) | decoy | decoy | decoy | — | Meta `134444` never sent | GET: unchanged; Log | |
| BL1 | — | — | — | — | — | BCBA `1130668` always | GET labels | |
| BL2 | `location` (Work States, multi) | New York | Colorado;New York | New Jersey | R1 → New Jersey | NY `1132655` / CO `1107687` / NJ `1107686`, one per state | GET labels | |
| BL3 | `location` = New Mexico or Virginia | — | — | — | R2 adds New Mexico | **held** (O-6): no NM label; warning `unmapped_work_state` | GET labels; Log | |
| BL4 | `assign_states`, `lba_licensure__ny` (R1 also holds Assign NY, which has no label) | Assign NY;Assign NJ / Yes | Assign CO / Grad Permit | Assign CO;Assign NJ / No | R1 → In Process | BCBA LBA NJ `1124245` + LBA NY `1052629` / BCBA Colorado `1124246` + GRAD `1092164` / CO + NJ, no NY label | GET labels | |
| BL5 | `ny_insurance_labels` | MCD FFS-NY | Aetna-NY | blank | R1 → blank | NY Medicaid `1107647` in R1 only; removed in U1 | GET labels | |
| BL6 | Aetna-NY, Cigna-NY, Carelon-NY; `co_insurance_labels` and `nj_insurance_labels` (decoys, set by the script) | decoys | Aetna-NY + decoys | decoys | — | **not built** (decision 25): no Aetna, Cigna, Carelon, CO Medicaid or NJ label | GET labels | |
| BL7 | `cr_billing_hold_label` | Yes | No | blank | R1 → No | Billing Hold `1103437` in R1; removed in U1 | GET labels | |
| BL8 | — | — | — | — | — | All Employees `1052618`, Clinical `1052643` always | GET labels | |

## BT/RBT → CR employee (BT/RBT 1)

| Req | HubSpot property | R1 (NY) | R2 (CO) | R3 (NJ) | U1 | Expected in CR | Check | Result |
|---|---|---|---|---|---|---|---|---|
| T1 | `location` | New York | Colorado | New Jersey;New York | — | Contact form `Behavior Technician NY` in R1 and R3; `RBT CO` in R2 (a Colorado BT, rule 5.9); read what the form set | GET; Screen | |
| T2 | `workday_id` blank; `first_name`, `last_name`; `email` (on the record and its Contact); Contact `date_of_birth` | Jane / Swanson Azure Test RN / zeke+bt_azure_test_N@optidge.com / 1992-02-20 | … / 1993-03-21 | … / **blank** | last name + " U1" | ExternalSystemId = record ID; name; email; DOB. R3: the placeholder 2000-01-01 on the create | GET | |
| T3 | Contact `gender_employee` and `gender` | female | male | female | male | gender | GET | |
| T4 | Contact `address`, `city`, `state_dropdown`, `zip`, `phone` | N03 Azure BT St, New York, New York, 10004, 212-555-NN03 | Denver, Colorado, 80204, 303-… | Newark, New Jersey, 07104, 973-… | street + " U1" | address 1, city, state, zip, cell phone | GET | |
| T5 | `home_apt` | Apt NC | same | same | blank | address line 2 (O-20: kept until Zeke decides) | GET | |
| T6 | `street_address__work_`, `apartment__work`, `city__work_`, `state__work_`, `postal_code__work_` | N05 Work Plaza, Suite N, New York, NY, 10005 | Denver, CO, 80205 | Newark, NJ, 07105 | suite blank | Meta `133819` = "street, apt, city, ST zip" | GET | |
| T7 | `active_cases_count` (automated; not set) | expect 1 once the Case is Warm with BT1 as Primary BT 1 | 0 (Case Cold) | 1 | — | Meta `147882` | GET; Screen | |
| T8 | record ID | — | — | — | — | Meta `138703` = the BT/RBT record link | GET | |
| TL1 | `location` | New York | Colorado | New Jersey;New York | U1b: R1 → Colorado | NY `1132655` / CO `1107687` / NJ `1107686` + NY `1132655`, one per state; U1b: CO added, NY removed | GET labels | |
| TL2 | New Mexico, Virginia | — | — | — | R3 adds Virginia | **held** (O-6): no VA label; warning | GET labels; Log | |
| TL3 | `bt_rbt_type` × Work States; `bt_to_rbt_path` decoy (no effect) | BT | BT | RBT | U1a: R1 → RBT. U1b: location → Colorado. U1c: type blank. U1d: type "BT to RBT" | R1 BT NY `1052630`. R2 BT CO `1132650`. R3 RBT NJ `1132651` + RBT NY `1052631`. U1a: RBT NY `1052631` added, BT NY removed. U1b: RBT CO `1107692` added, RBT NY removed. U1c and U1d: role labels left as they are, with warning `unmapped_bt_rbt_type` on U1d (decision 35). All six role labels are covered | GET labels; Log warning | |
| TL4 | — | — | — | — | — | All Employees `1052618`, Clinical `1052643` always | GET labels | |

## Contact

| Req | What changes | Round | Expected | Check | Result |
|---|---|---|---|---|---|
| K1 | Guardian Contact, one change at a time: `phone` → 212-555-NN21; `email` → zeke+swanson_azure_test_N_u1@optidge.com; `firstname` → Ron Azure Test RN; `lastname` → Swanson U1 | R1-U1 | The Case's sync properties follow, and the client gets an update each time (C6, C7, C8 cell phone) | GET; Log (fan-out queued 1 Case) | |
| K2 | (the same run) | R1-U1 | The Case reads the Guardian values from its own sync properties | Log `changedFieldNames` | |
| K3 | BCBA Contact `email` | R1-U1 | Meta `138069` updates | GET | |
| K4 | A Contact with `test_record` = true is changed | R1-U1 | The fan-out queues nothing | Log | |
| K5 | BT/RBT Contact `address` | R1-U1 | **open** (O-26): does the BT/RBT workflow fire? The daily sweep is the fallback | Log; GET | |

## Exclusions (decoys)

After the create, the script sets a decoy value on each of these properties. An enumeration gets its first stored option, text gets "AzT decoy N", and a date gets 2030-01-01. The date is far in the future because a workflow moves the upcoming-auth `_f` dates into the live auth period once their start date arrives. A property it cannot find or set is skipped and reported by name.

Plan run of 2026-11-20 (sandbox): every decoy can be set except `total_hours_bt_12_work_schedule` and `total_hours_btrbt_12`, which are calculated. Those two can only be checked by the read: C20 must equal `total_hours_bt1bt2_work_schedule`, never either old total.

| Excluded property | Guide or plan | Expected |
|---|---|---|
| Case `n2_what_type_of_insurance` | plan C30 | Secondary insurance `144600` is unchanged |
| Case `total_hours_bt_12_work_schedule`, `total_hours_btrbt_12` | guide line 361 | Total Assigned Hours `134331` is unchanged |
| Case `ongoing_auth_period_start_date_f`, `ongoing_auth_period_end_date_f` | guide line 363 | Auth Period `134672` is unchanged |
| BCBA `credentialed_insurances__ny` | B13 | Field `134444` is not sent |
| BCBA `co_insurance_labels`, `nj_insurance_labels` | BL6 | No label |
| BCBA and BT/RBT `external_system_id` | plan section 9 exclusions | CR `ExternalSystemId` = the HubSpot record ID, not the decoy |
| BT/RBT `bt_to_rbt_path` | TL3 | Role labels unchanged |
| Case `dealname` (always differs from the legal name) | C2 | CR name = `phi_*`, never "CR Azure Test RN" |

Made by hand: a Case and an employee with a blank first or last name (not sent; the record goes to `error` when a create needs it), and a BCBA with a blank primary email (`error`, no CR call).

Not covered: the `__clinical` copies of the comorbid and maladaptive fields (plan 4.2). Their exact property names are not in the guide extract.

## The blank round (R1-U2)

Zeke, 2026-11-20: "I'll do what you recommend here."

**How it runs.**
1. Only on the R1 test records, and only after R1 and R1-U1 have passed.
2. Each clear is a production CentralReach write on a test record, made on Zeke's go-ahead at that step.

**Order.**
1. **BT/RBT 1.** Its behaviour is already known from the row 3.13 test of 2026-11-20 (an employee update replaces the record), so this run confirms the code.
2. **The BCBA.**
3. **The client:**
   - First clear one core field (`home_apt` → address line 2) and one metadata field (Known Allergies `126214`), then GET.
   - Then clear the rest.
   - The client result closes O-35 (does a client update clear a core field?) and is recorded there.

**Never cleared:** the fields a create requires (names, the Case date of birth, the primary emails), and the gate and entry properties.

**Expected:** each cleared field is blank in CentralReach after the GET. A field that keeps its old value is a fail, unless it is a core client field and O-35 shows that CentralReach keeps values on an update. That outcome goes to Zeke.

**Records the script does not create.** These are made by hand in the sandbox, on Zeke's word, in the round that names them:
- BR4: a BT/RBT with Entered = Yes and the gate blank.
- BR7: a Case with `test_record` = true.
- C3: an R2 Case with no date of birth.
- C16: a second BCBA with a Potential IA association.

**Read-back before every push.** The script's read-back lists any employee mirror field that stayed blank. If BT/RBT `date_of_birth` is blank (assumed to come from the Contact `date_of_birth`), the create would send the placeholder 2000-01-01, so it is fixed before the push.

## Rule for every test record (Zeke, 2026-11-20)

"the only test created are test that fufill the requirements." Every record, association, decoy and step in this matrix must name the section 9 requirement it proves. Anything that proves no requirement is not created.

| Extra record or step | Requirement it proves |
|---|---|
| BT/RBT with Entered = Yes and the gate blank | BR4 (record gate) |
| Case with `test_record` = true | BR7 |
| R2 Case with no date of birth | C3 (blank DOB on a create is an `error`) |
| New Case created in an excluded stage | BR6 (no create from the Cleanup stages) |
| BCBA 2 and its RE, Potential IA and Potential Supervising links | C11, C16 |
| BT/RBT 2 and its Primary BT 2, Potential BT 1 and unlabeled links | C14, C16 |
| Decoys on excluded properties | C30, C20, C23, B13, BL6, TL3, section 9.4 exclusions |
| Blank first or last name; BCBA with a blank primary email | C2, B3, B4 (guide lines 330 to 336) |
| School label and retired staffing label added by hand | BR19, CL4 |

The BCBA primary email keeps the agreed pattern `zeke_work_email+azure_test_N@optidge.com` (Zeke, 2026-11-20).

## Questions for Zeke before R1

Rule (Zeke, 2026-11-20): every open question is checked against the Google Drive guide first.

1. C36: the guide says `referral_source` is read-only and is to be read, but not where its value comes from. Do you know how a Case gets a Referral Source (a form, an import, a sync)? If a test Case can be given one that way, C36 gets a real value; otherwise it is tested as blank.

**Decided: C20 (Zeke, 2026-11-20).** "While testing I'll fix the hours_bt_work_schedule_1 + hours_bt_work_schedule_2 and note for an agent once it's done."
- Zeke corrects the sandbox formula to `hours_bt_work_schedule_1 + hours_bt_work_schedule_2` during testing and tells the agent.
- The agent then reads round 1 back (expected 18) and records C20.
- No code change. Production gets the same fix by Zeke before go-live.

Settled from the guide: C30. The guide uses the summary only when the carrier is Other (lines 369, 370, 519, 528), so the mapper's fallback to the summary is a defect for the build chat.

**Changes from the agreed record convention ([G20], SANDBOX-TEST-PLAN.md), for O-34:**
- `home_apt` is "Apt NA / NB / NC" per record instead of "NE".
- Names end in "RN" (for example "Azure Test R1") instead of "#N". The sandbox refused "#1" in `bcba_name`: "Each word in the text must be capitalized" (2026-11-20 round 1 run). "R1" and "BCBA" were refused there too, so the HubSpot display names `bcba_name` and `bt_name` use title-case words only, for example "Zeke Swanson Bcba Azure Test Round One". The integration never reads them. The names sent to CR (`first_name`, `last_name`, `phi_*`) keep "RN"; the error listed only `bcba_name` as invalid. Whether CentralReach accepts "#" stays untested.
- The convention's after-round step still applies: the round's client and employees are made inactive on the CR screen, and `sandbox-test-log.md` is filled in.
