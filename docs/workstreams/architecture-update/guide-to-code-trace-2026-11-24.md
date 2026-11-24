# Guide-to-code trace (2026-11-24)

**Question (Zeke, verbatim):** "have we confirmed for each entity on the google drive EVERY requirement is being mapped or accounted for in the code?"

**Sources.** Requirements: the Google Doc "CR-HubSpot Integration Guide V2.0" (`1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`), read through the snapshot `guide-extract-2026-11-24.md` ("L<n>" below), after checking the live file's metadata (section 5). Code: the uncommitted working tree in `src/` on branch `architecture-update` (the pending build; deployed is `655b385`). Client decisions: `BUILD-PLAN.md` section 4 ("d<n>" = decision n) and the build package's seventh set (`BUILD-PACKAGE-DRAFT-2026-11-23.md` L89-118). The requirements-review slices were used only as a cross-check index; every row below was read against the guide text and the code by this trace.

**Method.** (1) Every requirement row was built from the guide's integration tab (L180-965) and the architecture tab (L1620-1752): the business rules, the CentralReach required-field table, the four entity tables, sections 1 to 9, 11, the appendix and the dated blocks G17-G20 (latest dated note wins). (2) Each was looked up in the code by file:line. (3) Scripts diffed, both ways, the HubSpot property names in the guide against the properties the code requests, and the CentralReach metadata field and label IDs in the code against the guide and against `cr-catalog-snapshot.json` (names by exact ID). (4) Judgement on the rules.

**What was read or called.** One read-only Google Drive metadata call and one revision listing on the guide. No HubSpot, CentralReach or Azure call. No git write. No existing file edited.

**Classes.** IMP = implemented as the latest guide text says. DIFF-D = implemented differently from the guide text, by a recorded client decision (the guide text is stale). DIFF-U = implemented differently with no client decision (none found). NIC = requirement with no code. NCR = not a code requirement (owner named). HELD = deliberately held or deferred by a cited decision. Code that writes something the guide does not list is in section 4, outside the counts.

---

## 1. Answer

**Yes, with qualifications: all 192 requirement rows traced from the guide are accounted for (130 implemented as written, 29 implemented differently by a recorded client decision that is not yet written into the Google Doc, 25 owned outside the code, 4 deliberately held), and 4 have no code because the decision or the CentralReach field they need is still open (Location #2 work schedules, per-BT hours, `insurance_id_3`, BCBA Care Coordinator).** No difference was found between code and guide that lacks a client decision (DIFF-U = 0). The code also writes some things the guide does not list (section 4): the base labels All Clients, All Employees and Clinical, the Case's HubSpot link field `138702`, the BT/RBT `home_apt` as address line 2 (O-20 still open), the Colorado `RBT CO` contact form, and label removals. Every update PUT also sends back the CentralReach keys the integration does not map, unchanged, by the client's ruling of 2026-11-24; the SSN guard for that is not in the working tree yet.

---

## 2. Counts by entity and class

| Entity | Rows | IMP | DIFF-D | DIFF-U | NIC | NCR | HELD |
|---|---|---|---|---|---|---|---|
| Case / Client (fields, client labels, Contact routing) | 82 | 52 | 18 | 0 | 3 | 8 | 1 |
| BCBA (fields, BCBA labels) | 51 | 39 | 5 | 0 | 1 | 4 | 2 |
| BT/RBT (fields, BT labels) | 37 | 27 | 4 | 0 | 0 | 5 | 1 |
| Shared triggers, gates, Azure behaviour | 22 | 12 | 2 | 0 | 0 | 8 | 0 |
| **Total** | **192** | **130** | **29** | **0** | **4** | **25** | **4** |

Client labels are rows C62-C72, BCBA labels B31-B41, BT/RBT labels T23-T27. Shared employee rules (temporary ID, identity check, lookups) are counted once per employee type, because the guide states them for each.

### 2.1 Case / Client rows

| ID | Requirement | Guide | Class | Code |
|---|---|---|---|---|
| C01 | Case reads go through `/crm/v3/objects/deals` | L353, L463 | IMP | `lib/hubspotClient.mjs` (`/crm/v3/objects/deals/${id}`) |
| C02 | Create when `enter_in_central_reach` contains Yes and the Case is unlinked | L321, L354, L814 | IMP | `lib/syncEligibility.mjs:18-23, 70` |
| C03 | A linked Case keeps syncing whatever Entered holds (CR-ID gate; one-way latch) | L322, L502, L810, L1722 | IMP | `syncEligibility.mjs:70-73` |
| C04 | Skip the four Cleanup stages for create and update | L322, L390, L657 | IMP | `constants/hubspot.mjs:27-32`; `syncEligibility.mjs:67, 91` |
| C05 | Skip `test_record` = true | L390, L830 | IMP | `syncEligibility.mjs:64` |
| C06 | Record gate: one app setting naming a checkbox | L280, L282 | DIFF-D | two path settings with fallback and a production guard, `syncEligibility.mjs:36-63`; `lib/config.mjs` `PRODUCTION_GATE_PROPERTIES` (d52) |
| C07 | Write the CR Client ID to `client_id_number` | L355, L503, L780 | IMP | `workflows/clientSyncWorkflow.mjs:184-193` |
| C08 | Write `central_reach_link_to_client` | L355, L780 | IMP | `clientSyncWorkflow.mjs:192` |
| C09 | The six sync writebacks | L356, L780 | IMP | `lib/writebackAllowlist.mjs:1-13`; `clientSyncWorkflow.mjs` `statusProperties` |
| C10 | Status `success` / `error` / `waiting`; `blocked` retired | L274 | IMP | worker statuses; `blocked`/`noop` no longer written (BR9) |
| C11 | Case check: client found by Case record ID under another CR ID → `error`, no update | L276 | IMP | `clientSyncWorkflow.mjs:697` |
| C12 | Client ContactForm from `CR_CLIENT_CONTACT_FORM`, else Public Client Intake Form | L343 | IMP | `mappings/client/buildClientPayload.mjs:41`; never on update `lib/centralReachClient.mjs:401` |
| C13 | Client ExternalSystemId = Case record ID | L334 | IMP | `buildClientPayload.mjs:42` |
| C14 | Read-only lookup by External System ID before a create; unclear answer never creates | L1736, L278 | IMP | `centralReachClient.mjs:212, 390-395` |
| C15 | FirstName `phi_first_name__cloned_`, blank not sent | L344, L357 | IMP | `buildClientPayload.mjs:43`; `validateClientPayload.mjs` |
| C16 | LastName `phi_last_name`, blank not sent | L345, L357 | IMP | `buildClientPayload.mjs:44`; `validateClientPayload.mjs` |
| C17 | DateOfBirth `phi_date_of_birth`, no placeholder | L346 | IMP | `buildClientPayload.mjs:10-22, 45` (checked before the create instead of letting CR reject it) |
| C18 | Never `dealname` | L357, L504 | IMP | not requested (`clientProperties.mjs`) |
| C19 | Gender `phi_gender` (male, female) | L358, L505 | IMP | `buildClientPayload.mjs:47` |
| C20 | Primary email `email`, sent when valid | L334, L359, L507 | DIFF-D | an invalid email ends the run `error` instead of being left out, `buildClientPayload.mjs:48` (d43) |
| C21 | Guardian first and last name from the Case sync properties | L359, L508, L452 | IMP | `buildClientPayload.mjs:58-59` |
| C22 | Only the first Parent/Guardian Contact is sent | L232 | NCR | HubSpot property sync picks the Contact; code reads the sync properties (d24). Owner: Zeke / Optidge in HubSpot |
| C23 | Mailing address `street_address`, `home_apt`, `location_city`, `stateregion`, `postal_code` | L360, L509 | DIFF-D | state falls back to `location`, `buildClientPayload.mjs:31-33, 53-57`; `lib/fieldFormats.mjs` `readCaseStateCode` (d56) |
| C24 | Guardian `phone` | L360, L509 | IMP | `PhoneCell`, `buildClientPayload.mjs:50` |
| C25 | Care Coordinator: `hubspot_owner_id` via owners API | L361, L510 | DIFF-D | Meta 138851 from `care_coordinator_first_name`/`_last_name` when `coordinator_export_status` = `ready`, `buildClientMetadata.mjs:471-516` (d64) |
| C26 | IA BCBA (86) | L362, L511 | IMP | Meta 131314, `buildClientMetadata.mjs:286`; roles `config.mjs` (prod 86) |
| C27 | RE BCBA (145) | L362, L511 | IMP | Meta 144602, `buildClientMetadata.mjs:287` |
| C28 | Supervising BCBA = typed `ongoing_central_reach_provider_supplier`, matched by name | L363, L512 | DIFF-D | association first (82 → 234 → 288 → 135) + " BCBA LBA"; Grad Permit Case → holder's supervisors; supplier only as fallback; blank supplier sends nothing, `buildClientMetadata.mjs:360-452` (d55, d61) |
| C29 | Grad Permit Holder 136052: marker "pending" | L364, L513, L723 | DIFF-D | built: "`<First> <Last>` Grad Permit Holder" from 82 BCBAs with `lba_licensure__ny` = Grad Permit, `buildClientMetadata.mjs:454-469` (d55) |
| C30 | Primary BT 1 / 2 (76 / 143) | L365, L514 | IMP | Meta 131313 / 138092, `buildClientMetadata.mjs:288-289` |
| C31 | Outgoing BT 1 / 2 (131 / 166) active until the removal date passes | L365, L561 | DIFF-D | no date logic: they join BT #1 / #2 while the label is on the Case, `buildClientMetadata.mjs:281-289` (d55, seventh set 9) |
| C32 | Ignore unlabeled 20 / 64; exclude Potential 153 / 80 / 74 / 164 and Previous IA 286 | L366, L549-562 | IMP | `config.mjs` prod `excludedStaffingAssociationTypeIds`; `constants/staffingAssociations.mjs:8-21` |
| C33 | Outgoing Supervising 135 and SUB 234 / On Leave 236: open in the guide | L366, L552-557 | DIFF-D | 234, 288, 135 feed 131308 in that order; On Leave never read, `config.mjs` (prod roles), `buildClientMetadata.mjs:361-366` (d55; seventh set 9 "these rules are rig[ht]") |
| C34 | Five staffing-name change signals | L367, L545 | NCR | Owner: Zeke (HubSpot re-enrolment triggers, d51). Code requests them as signals, `clientProperties.mjs:98-105` |
| C35 | Work Schedule #1 / #2 | L368, L515-516 | IMP | Meta 132304 / 138093, `buildClientMetadata.mjs:652-657` |
| C36 | Location #2 work-schedule variants | L368, L515-516 | NIC | not requested; no CR field (BUILD-PLAN C18, O-14 open) |
| C37 | Client Availability: text + `client_service_hours_total` | L369, L517 | DIFF-D | text alone, Meta 126209, `buildClientMetadata.mjs:658-662` (d54) |
| C38 | Total Assigned Hours from `total_hours_bt1bt2_work_schedule` | L370, L518 | DIFF-D | sum of `hours_bt_work_schedule_1` + `bt_rbt_2_work_schedule`, Meta 134331, `buildClientMetadata.mjs:41-67` (d41) |
| C39 | Per-BT hours "as applicable" | L370, L518 | NIC | no CR target (BUILD-PLAN C21, O-18 open) |
| C40 | Approved Auth Hours by `initial_auth_tracks` | L371, L519 | IMP | Meta 132431, `buildClientMetadata.mjs:127-137` |
| C41 | Auth Period, exact end spelling, no `_f` twins | L372, L520 | IMP | Meta 134672, `buildClientMetadata.mjs:115-125, 668-672` (text "MM/DD/YYYY - MM/DD/YYYY", kept by Q34) |
| C42 | Service Location Address: Child's House → `full_home_address`; Other → service parts | L373, L521 | DIFF-D | two-line form from the parts, `full_home_address` not read, `buildClientMetadata.mjs:173-253` (d56, d62) |
| C43 | Service Location Address 2 `service_address__other` | L373, L522 | DIFF-D | sent for More Than One Location; a state-only skeleton sends null, `buildClientMetadata.mjs:255-268` (d62) |
| C44 | Known Allergies + explanation (Confirmed / Denial) | L374, L523 | DIFF-D | explain alone / "Yes" / "None", Meta 126214, `buildClientMetadata.mjs:139-155` (d63) |
| C45 | Comorbid, main field only | L375, L524 | IMP | Meta 132303, `buildClientMetadata.mjs:648-650` |
| C46 | Maladaptive, main field, stored values | L375-376, L525, L849 | IMP | Meta 126207, `buildClientMetadata.mjs:645-647` (item 17 dropped) |
| C47 | Severity Level (Level 1, 2, 3) | L377, L526 | DIFF-D | the digit alone, Meta 133826, `buildClientMetadata.mjs:157-163` (d63) |
| C48 | Important information - Parent | L377, L527 | IMP | Meta 138378, `buildClientMetadata.mjs:691-693` |
| C49 | Primary insurance, or Other summary | L378, L528 | IMP | Meta 126210, `buildClientMetadata.mjs:69-82, 698-701` |
| C50 | `insurance_id_1` | L378, L529 | IMP | Meta 131316, `buildClientMetadata.mjs:702` |
| C51 | Secondary insurance carrier `insurance_2` / Other; never `n2_what_type_of_insurance` | L379, L537 | IMP | Meta 144600, `buildClientMetadata.mjs:703-707` |
| C52 | `insurance_id_2` | L379, L538 | IMP | Meta 144601, `buildClientMetadata.mjs:708-710` |
| C53 | Physician + NPI, Medicaid or commercial pair by insurance type | L380, L530 | DIFF-D | pair by `n1_what_type_of_insurance` (d32), text "`<name> <npi>`" (d54), Meta 131151, `buildClientMetadata.mjs:84-113` |
| C54 | Referring Physician Medicaid ID | L380, L532 | IMP | Meta 141233, `buildClientMetadata.mjs:679-681` |
| C55 | Diagnosis `phi_diagnosis` (Yes = Yes-F84.0) + `diagnosis_other` | L381, L531 | IMP | Meta 144793, `buildClientMetadata.mjs:165-171` |
| C56 | Date of most recent ASD diagnosis | L381, L533 | IMP | Meta 131195, `buildClientMetadata.mjs:684-686` |
| C57 | ASD date, Medicaid FFS NY | L381, L534 | IMP | Meta 138701, `buildClientMetadata.mjs:687-689` |
| C58 | Policyholder name | L382, L535 | IMP | Meta 138090, `buildClientMetadata.mjs:694-696` |
| C59 | Policyholder DOB | L382, L536 | IMP | Meta 137667, `buildClientMetadata.mjs:697` |
| C60 | Referral Source `referral_source` | L382, L539 | DIFF-D | Other sends the `referral_other` text, Meta 126222, `buildClientMetadata.mjs:711-715` (d64) |
| C61 | `insurance_id_3` Client mapping pending; omit `insurance_id_4` | L391, L394 | NIC | neither requested (BUILD-PLAN C38, O-19 open) |
| C62 | Active / Inactive from `case_status` (Warm / Cold); latest note: held until the label test | L383, L608 | DIFF-D | sent and replaced, 1125427 / 1121488, `buildClientMetadata.mjs:525-529, 545` (d13: test run 11/20, hold lifted) |
| C63 | Staffing labels: only 97151 Services, Staffed 97153, X 97153; "nothing is sent ... until the CentralReach label-replacement test" | L220, L384, L609 | DIFF-D | the three sent and managed, `constants/centralReach.mjs:70-74`; `buildClientMetadata.mjs:547` (d13, d15) |
| C64 | Pending 97151, Pending 97153, Starting 97153: do not create, send or require | L222 | IMP | never sent or required, `centralReach.mjs:78-82` (they are removed: section 4) |
| C65 | Hot / Warm / Cold / Processing Leads stay in HubSpot | L228, L631 | IMP | only the three values map, `buildClientMetadata.mjs:547` |
| C66 | Blank `staffing_status`: no staffing label, prior one removed | L384, L609 | IMP | managed list, `buildClientMetadata.mjs:553-562` |
| C67 | Read `staffing_status` directly; do not rebuild the 5 AM / 1 PM schedule | L230, L384, L633 | IMP | no schedule code; value read as stored |
| C68 | Cleanup exclusions apply before label sync | L384 | IMP | eligibility runs before any write, `clientSyncWorkflow.mjs:369` |
| C69 | CO / NJ / NY Client from `location`, kept across Active ↔ Inactive | L385, L664 | IMP | `buildClientMetadata.mjs:518-523, 543` |
| C70 | Home (1052656) for Child's House or More Than One Location | L386, L665 | IMP | `buildClientMetadata.mjs:538-540` |
| C71 | School (1052688) / Clinic (1052655): HubSpot options deferred | L386, L666 | HELD | guide defers them; no code |
| C72 | No client funding-source labels (G19 overrides L387-389, L672-679) | L226 | IMP | none sent; not in `CENTRAL_REACH_SENDABLE_LABEL_IDS` |
| C73 | Never write read-only / sync / calculated properties; 34 Prior fields out | L391, L479, L495 | IMP | `writebackAllowlist.mjs` |
| C74 | Sensitive deal read scope | L391, L475 | NCR | Owner: Danny / Zeke (private-app scope; reported present 11/14, L773) |
| C75 | A Guardian Contact change reaches the linked Case | L451-452, L822 | IMP | `workflows/contactFanOutWorkflow.mjs:1-12` (queues every linked Case) |
| C76 | Contact: skip `test_record`; no standalone CR contact, no labels | L454 | IMP | `contactFanOutWorkflow.mjs:6, 2-3` |
| C77 | Production Contact ongoing workflow | L455, L790 | NCR | Owner: Zeke in HubSpot (O-21) |
| C78 | Production Case initial and ongoing workflows (W4 / W1) | L392 | NCR | Owner: Zeke in HubSpot (the code enforces Yes, C02) |
| C79 | Alternate-address copy workflow | L393, L898 | NCR | Owner: Optidge / Zeke in HubSpot |
| C80 | Case sandbox test requirements | L394 | NCR | Owner: testing chat (sandbox matrix) |
| C81 | 81 of 100 sampled Client IDs not found: check before linked Case updates go on | L276 | NCR | Owner: Zeke, cutover check |
| C82 | Case History Log is outside the mapping | L328, L467 | IMP | never written |

### 2.2 BCBA rows

| ID | Requirement | Guide | Class | Code |
|---|---|---|---|---|
| B01 | Object 2-48354212 (sandbox 2-72890322) | L401, L464 | IMP | `config.mjs` `HUBSPOT_PORTALS` |
| B02 | Create when `entered_in_centralreach` = Yes and unlinked | L402, L816 | IMP | `syncEligibility.mjs:25-27, 70` |
| B03 | Linked updates continue | L402 | IMP | `syncEligibility.mjs:70` |
| B04 | Write CR contactId to `employee_id` | L403 | IMP | `workflows/employeeSyncWorkflow.mjs:216-250` |
| B05 | Write `central_reach_record_link` | L403, L780 | IMP | `employeeSyncWorkflow.mjs:222-223` |
| B06 | The six sync writebacks | L404 | IMP | `writebackAllowlist.mjs:15-19` |
| B07 | ContactForm Admin | L337 | IMP | `centralReachClient.mjs:29, 47-58` |
| B08 | ExternalSystemId = `workday_id`, else the record ID (temporary) | L266, L405 | IMP | `buildEmployeePayload.mjs:25-31` |
| B09 | ESID set on create only; an update sends what CR holds | L338, L276 (2) | IMP | `centralReachClient.mjs:583-600` |
| B10 | Temporary-ID create → `waiting` "Waiting for the Workday ID"; Workday create → `success` | L276 (1) | IMP | `employeeSyncWorkflow.mjs:1194-1197` |
| B11 | Updates continue while `waiting` | L276 (2) | IMP | `lib/syncDecisions.mjs:40-46` |
| B12 | The five identity outcomes; only a different value stops updates | L276 (4)-(5) | IMP | `syncDecisions.mjs:25-57` |
| B13 | Re-checked by the hourly poller and the daily sweep | L276 (3), L1736 | IMP | `functions/intakePoller.mjs:29`; `workflows/intakePollerWorkflow.mjs:393` (the workflow trigger is Zeke's, d51) |
| B14 | `waiting` is not retried and never dead-lettered | L274, L276 (3) | IMP | `employeeSyncWorkflow.mjs:150, 1382` |
| B15 | Lookup before create by record ID and `workday_id`; link own / `error` other holder / `waiting` already in CR | L278 | IMP | `syncDecisions.mjs:60-73`; `employeeSyncWorkflow.mjs:887-917` |
| B16 | One Workday ID per HubSpot record | L278 | IMP | `employeeSyncWorkflow.mjs:895-903` |
| B17 | Existing employees not created or touched (record gate) | L280 | IMP | `syncEligibility.mjs:59-63` |
| B18 | Workday ID format check "pending this answer" | L745 | DIFF-D | 7 digits required, `syncDecisions.mjs:13-15`; `employeeSyncWorkflow.mjs:694` (d58) |
| B19 | Record ID stored only in Link to Record 138703 | L266, L406 | IMP | `buildEmployeePayload.mjs:315-345` |
| B20 | first_name + last_name; blank name not sent | L339-340, L407 | IMP | `buildEmployeePayload.mjs:301-302`; `validateEmployeePayload.mjs` |
| B21 | Gender `gender_new`, never archived `gender` | L407, L575 | IMP | `buildEmployeePayload.mjs:304` |
| B22 | Primary email `ucaba_email_address` | L341, L408, L576 | DIFF-D | reads `email`, `buildEmployeePayload.mjs:44, 306` (d49) |
| B23 | Blank email checked before create → `error` | L341 | IMP | `validateEmployeePayload.mjs` (create only) |
| B24 | Updates send the email CR holds | L341 | DIFF-D | a filled HubSpot email is sent; a blank sends CR's, `centralReachClient.mjs:600-606` (d47) |
| B25 | `date_of_birth`; placeholder on create only; update never sends it | L342 | IMP | `buildEmployeePayload.mjs:33-60`; `centralReachClient.mjs:634-638`; `mappedState.mjs:313-353` (d53, d65) |
| B26 | Personal email = Contact `email` (BCBA → Contact 17) | L409, L453, L580 | DIFF-D | the BCBA's own `personal_email` → Meta 138069, `buildEmployeePayload.mjs:46-49, 321-328` (d50) |
| B27 | Mailing address mirrors + `employee_phone` | L410, L577 | IMP | `buildEmployeePayload.mjs:307-312` |
| B28 | Medicaid ID NY / NJ / CO | L411, L579 | IMP | Meta 126216 / 138112 / 138113, `buildEmployeePayload.mjs:329-337` |
| B29 | Salaried from `work_status` | L412, L581 | IMP | label Salaried 1132653, `buildEmployeePayload.mjs:193` (O-27 closed) |
| B30 | Care Coordinator `hubspot_owner_id` via owners API | L412, L582 | NIC | not built: no CR employee field (O-17, BUILD-PLAN B11) |
| B31 | One state label per Work State (CO / NY / NJ Employee) | L413, L686 | IMP | `buildEmployeePayload.mjs:96-101, 183` |
| B32 | BCBA header label on every BCBA | L413, L687 | IMP | 1130668, `buildEmployeePayload.mjs:181` |
| B33 | NM / VA Employee "when a BCBA ... uses one of those states later" | L234 | HELD | package item 11, Zeke 11/23 ("pending the client beginning work in these states"); `buildEmployeePayload.mjs:87-94` warns only |
| B34 | Assign CO → BCBA Colorado; Assign NJ → BCBA LBA NJ | L414, L688 | IMP | `buildEmployeePayload.mjs:185-186` |
| B35 | `lba_licensure__ny` Yes → BCBA LBA NY; Grad Permit → 1092164; Will Apply (No) → none | L414, L689-690 | IMP | `buildEmployeePayload.mjs:187-188` |
| B36 | Grad Permit associations 151 / 150 | L415 | IMP | 151 read for the Case's 131308, `config.mjs` `gradPermitSupervisorAssociationTypeId` |
| B37 | MCD FFS-NY → NY Medicaid 1107647 | L417 | IMP | `buildEmployeePayload.mjs:190-191` |
| B38 | Aetna 1107649, Cigna 1107650, Carelon 1132654, CO Medicaid 1107651 ("confirm how ... map") | L416-417, L691-692 | HELD | d25; not sendable, `centralReach.mjs:88-89` |
| B39 | MCD-NJ, Horizon-NJ: no CR target | L417, L692 | IMP | nothing sent |
| B40 | Billing Hold on Yes, removed on No | L418, L693 | IMP | `buildEmployeePayload.mjs:195-196`; managed list `:137-146` (d13) |
| B41 | Removal of the other BCBA labels after a source change: "leaves removal ... open" | L328 | DIFF-D | every mapped label is managed and removed when no longer required, `buildEmployeePayload.mjs:137-146` (d14) |
| B42 | Skip `test_record` | L419 | IMP | `syncEligibility.mjs:64` |
| B43 | Exclude `credentialed_insurances__ny`; use label fields, not statuses | L419, L578 | IMP | not requested; Meta 134444 not sent, `centralReach.mjs:48` |
| B44 | Contact mirror fields are read-only | L419, L479 | IMP | `writebackAllowlist.mjs` |
| B45 | Checklist `bcba_in_cr_checklist` stores "External System ID" | L272, L840 | IMP | `constants/hubspot.mjs:43-46`; `syncDecisions.mjs:17-22` |
| B46 | Not read: Entered in Workday (`entered_in_ucaba_payroll_system`), `external_system_id` | L268, L272 | IMP | not requested (`employeeProperties.mjs:74-120`) |
| B47 | Never deactivate | L591, L818 | IMP | no deactivation code |
| B48 | Production BCBA workflows (W6 / W3) | L420 | NCR | Owner: Zeke in HubSpot |
| B49 | Workday ID alerts for BCBA (open with Sara) | L244, L248 | NCR | Owner: Danny / United Care (HubSpot workflow) |
| B50 | BCBA sandbox test requirements | L421 | NCR | Owner: testing chat |
| B51 | BCBA personal-email sync property and its Contact propagation | L409, L453, L892 | NCR | Owner: Zeke in HubSpot; the code no longer reads the Contact (d42, d44, d50) |

### 2.3 BT/RBT rows

| ID | Requirement | Guide | Class | Code |
|---|---|---|---|---|
| T01 | Object 2-48354559 (sandbox 2-72890325) | L428, L465 | IMP | `config.mjs` `HUBSPOT_PORTALS` |
| T02 | Create gate: stored Yes (Yes - Active) and unlinked | L429, L818, L852 | IMP | `syncEligibility.mjs:25-27` |
| T03 | Linked BTs in Yes - Generic / No- Made Inactive keep getting updates | L429, L591, L818 | IMP | `syncEligibility.mjs:70` |
| T04 | Never deactivate | L441, L591 | IMP | no deactivation code |
| T05 | Write `employee_id` | L430 | IMP | `employeeSyncWorkflow.mjs:216-250` |
| T06 | Write `central_reach_link_to_rt_rbt` | L430, L780 | IMP | `employeeSyncWorkflow.mjs:222` |
| T07 | The six sync writebacks | L431 | IMP | `writebackAllowlist.mjs:15-19` |
| T08 | ContactForm Behavior Technician NY | L337 | DIFF-D | `RBT CO` when the Work States hold CO and not NY, `centralReachClient.mjs:34, 47-58` (d17; Q15 confirmed) |
| T09 | ExternalSystemId `workday_id`, else temporary record ID | L432 | IMP | `buildEmployeePayload.mjs:25-31, 219` |
| T10 | ESID on create only | L338 | IMP | `centralReachClient.mjs:583-600` |
| T11 | Temporary-ID status, updates while waiting, five outcomes, poller/sweep re-check, waiting never retried | L276 | IMP | shared code as B10-B14 |
| T12 | Lookup before create; one Workday ID per record | L278 | IMP | shared code as B15-B16 |
| T13 | Workday ID format check pending | L745 | DIFF-D | 7 digits (d58) |
| T14 | Record ID only in Link to Record 138703 | L433 | IMP | `buildEmployeePayload.mjs:250-271` |
| T15 | first_name + last_name; blank not sent | L339-340, L434 | IMP | `buildEmployeePayload.mjs:220-221` |
| T16 | Gender from the Contact mirror `gender` | L434, L595 | IMP | `buildEmployeePayload.mjs:222` |
| T17 | Primary email `email`; blank checked before create | L341, L435 | IMP | `buildEmployeePayload.mjs:224`; `validateEmployeePayload.mjs` |
| T18 | Updates send the email CR holds | L341 | DIFF-D | d47, as B24 |
| T19 | `date_of_birth`, placeholder on create only | L342 | IMP | `buildEmployeePayload.mjs:39, 203, 223` (read as text, d53; update rule d65) |
| T20 | Mailing `street_home`, `location_city`, `state_home`, `postal_code_home`, `employee_phone` | L436, L597 | IMP | `buildEmployeePayload.mjs:225-231` |
| T21 | Work address components | L437, L598 | IMP | Meta 133819, `buildEmployeePayload.mjs:234-260` |
| T22 | Active Case Load from `active_cases_count` | L438, L599 | IMP | Meta 147882, `buildEmployeePayload.mjs:261-265` |
| T23 | One state label per Work State | L439, L700 | IMP | `buildEmployeePayload.mjs:166-174` |
| T24 | Role label: BT / RBT × CO / NY / NJ | L440, L701 | IMP | `buildEmployeePayload.mjs:103-115, 172` |
| T25 | `bt_to_rbt_path` has no effect | L440-441 | IMP | not requested |
| T26 | NM / VA Employee not sent until that state is used | L234, L441 | HELD | item 11 (Zeke 11/23) |
| T27 | Removal of state / role labels after a change: left open | L328 | DIFF-D | managed (d14); blank or other `bt_rbt_type` manages no role label (d35), `buildEmployeePayload.mjs:125-135` |
| T28 | Skip `test_record` | L441 | IMP | `syncEligibility.mjs:64` |
| T29 | Apploi records without Yes fail the create gate | L441 | IMP | `syncEligibility.mjs:70` |
| T30 | Duplicate-safe when entry and refresh workflows both signal | L442-443 | IMP | in-progress marker and saved ID before a create, `employeeSyncWorkflow.mjs:920-925`; d34 |
| T31 | Checklist `btrbt_in_cr_checklist`; `entered_in_workday`(`_by`) not read | L246, L272 | IMP | `hubspot.mjs:44`; not requested |
| T32 | HubSpot `external_system_id` is not a source | L268, L593 | IMP | not requested |
| T33 | The 6 hand-linked production BT/RBTs untouched until United Care confirms | L280 | NCR | Owner: Zeke at cutover (gate checkboxes; Ruling B phase two) |
| T34 | Contact mirror changes propagate to the BT/RBT | L442 | NCR | Owner: Zeke (HubSpot property sync; verify) |
| T35 | Production BT/RBT workflows (W5 / W2) | L442 | NCR | Owner: Zeke in HubSpot |
| T36 | Workday ID alerts workflow 1929214033 | L244 | NCR | Owner: Danny / United Care |
| T37 | BT/RBT sandbox test requirements | L443 | NCR | Owner: testing chat |

### 2.4 Shared triggers, gates and Azure behaviour

| ID | Requirement | Guide | Class | Code |
|---|---|---|---|---|
| S01 | HubSpot workflows send webhooks to Azure; signing verified | L321, L1720 | IMP | `functions/hubspotWebhook.mjs`, `lib/hubspotWebhook.mjs` |
| S02 | Webhook first; hourly checkpointed poller | L1730 | IMP | `intakePoller.mjs:29` |
| S03 | Daily sweep of linked records | L1730 | IMP | `intakePollerWorkflow.mjs:393` |
| S04 | Durable sync state in Cosmos | L1730 | IMP | `lib/cosmosState.mjs` |
| S05 | Retries 1 min, 5 min, 15 min, 1 h, 4 h, then dead-letter | L1730 | IMP | `lib/retry.mjs:13` |
| S06 | A record with no change writes nothing | L1730 | IMP | `mappedState.mjs:112-195` |
| S07 | Compare the complete mapped state (blanks, metadata, labels, relationships); save only after the writes succeed | L1662-1688, L1746 | IMP | `mappedState.mjs:112-130, 216-258` |
| S08 | Staffing compared by record ID and role | L1726 | IMP | `staffingAssociations.mjs:8-21` |
| S09 | A failed or 403 read never becomes a clear | L1746 | IMP | omit rules, `buildClientMetadata.mjs:603-627, 742-750` |
| S10 | Labels add-only until a CR test shows removal works | L1734 | DIFF-D | replace-and-remove label POST, `centralReachClient.mjs:798-806, 949-1000` (d13) |
| S11 | Logs and reasons name fields, never values; no child's full name | L491 | IMP | `lib/safeLog.mjs`; `centralReachClient.mjs:708` |
| S12 | Replace HubSpot API versions retired in 2027 | L773 | IMP | only `/crm/v3` and `/crm/v4` paths in `src/lib` |
| S13 | Own private app token | L473 | NCR | Done (Zeke) |
| S14 | Scopes: `crm.objects.owners.read`; schema scopes only if used | L773 | NCR | Danny / Zeke; the owners call is no longer needed (d39, d64) |
| S15 | Failures report per object, `waiting` view, dead-letter email alert | L1732 | NCR | Zeke (HubSpot reports; Azure alert) |
| S16 | `integration_last_write` 24-hour report | L834 | NCR | Zeke in HubSpot |
| S17 | CR ID writebacks kept out of workflow triggers | L356, L790 | NCR | Zeke in HubSpot (d51) |
| S18 | Sandbox gate `sandbox_test_field` (lists 1463-1465) | L282 | IMP | gate setting fallback `syncEligibility.mjs:36-41` (lists: Zeke) |
| S19 | Production gate checkbox chosen at go-live | L280 | DIFF-D | two pinned properties `centralreach_creates_only` / `centralreach_updates_only`, `config.mjs` (d52) |
| S20 | Sandbox round rules | L196-214 | NCR | testing chat |
| S21 | Case History Log reuse optional | L1728 | NCR | Zeke (not used) |
| S22 | Workflow triggers, not segment membership, for repeat signals | L1714 | NCR | Zeke in HubSpot |

---

## 3. Every row that is not IMPLEMENTED or NOT A CODE REQUIREMENT

**Confirmed facts:** the code lines and decision texts cited. **Assumption:** that each DIFF-D decision is final (they are recorded in BUILD-PLAN section 4 with Zeke's words).

### 3.1 No code (NIC)

| Row | Requirement (guide line) | What the code does | Recommended fix and why | Who acts |
|---|---|---|---|---|
| C36 | Location #2 work schedules: "Use the corresponding Location #2 variant when the BT works there" (L368, L515-516) | Not requested; CentralReach has only Work Schedule #1 / #2 (BUILD-PLAN C18, O-14) | Decide: two new CR metadata fields (created by script, d27) or append the Location #2 text to 132304 / 138093. Without it a BT working at Location #2 shows the Location #1 schedule only | Zeke (decision); then build chat |
| C39 | Per-BT hours `hours_bt_work_schedule_1/_2` "as applicable" (L370, L518) | Not sent on their own (used only inside the C38 sum) | Confirm no CR field is wanted, then mark the guide row retired; else name the CR field | Zeke with United Care (O-18) |
| C61 | `insurance_id_3` "Client mapping is pending"; `insurance_id_4` omitted (L391, L394) | Neither requested | Get the target field; until then the guide's "pending" stands. Low risk: no CR write is made | Zeke with United Care (O-19) |
| B30 | BCBA Care Coordinator `hubspot_owner_id` (L412, L582) | Not built: no CR employee field | United Care / Danny names or creates the CR employee field; then map from the BCBA coordinator fields the way the Case does (d64), not the owners API | United Care (field); build chat |

### 3.2 Deliberately held or deferred (HELD)

| Row | Requirement | Decision | Note and recommendation | Who acts |
|---|---|---|---|---|
| C71 | School / Clinic labels (L386, L666) | The guide defers the HubSpot options | Nothing to do until options exist | Optidge / United Care |
| B33, T26 | Send NM Employee / VA Employee "when a BCBA or BT/RBT uses one of those states" (L234) | Package item 11, Zeke 2026-11-23: "pending the client beginning work in these states" | **Finding:** the guide's premise "New Mexico and Virginia are not being used yet" is no longer true: production holds 8 NM and 2 VA BCBAs (requirements review C9). The code warns `unmapped_work_state` and sends no state label for them. Ruling B puts them in phase two. Recommend Zeke confirms the deferral against G19 and a guide note records it | Zeke |
| B38 | Aetna, Cigna, Carelon, CO Medicaid credential labels (L416-417, L691-692) | d25: labels the guide does not map to an option are not built | The guide asks to "Confirm how the NY and CO commercial options map". Send the proposed option-to-label mapping (package question 21) | United Care (mapping); build chat |

### 3.3 Implemented differently by a client decision (DIFF-D): the guide text is stale

The code follows Zeke's later decision in each case. The fix in every row is the same kind: write the decision into the Google Doc as a dated note (BUILD-PLAN O-34; approved inserts A-E are still unwritten), so the guide stops contradicting the code. No code change is recommended unless stated.

| Row | Guide says (line) | Code does (file:line) | Decision | Extra action |
|---|---|---|---|---|
| C06, S19 | One gate setting; production checkbox chosen at go-live (L280, L282) | Two path settings, production guard pins the two names (`syncEligibility.mjs:36-63`, `config.mjs`) | d52 | Zeke: create the six production properties before cutover (404 today) |
| C20 | Email sent "when it is valid" (L334) | Invalid email ends the run `error` (`buildClientPayload.mjs:48`) | d43 | — |
| C23 | State from `stateregion` (L360, L509) | Falls back to `location` (`buildClientPayload.mjs:31-33, 56`) | d56 | — |
| C25 | Owners API (L361, L510) | Coordinator workflow fields (`buildClientMetadata.mjs:471-516`) | d64 | **Production deploy blocker:** `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status` answer 404 in production; every Case run would end `HUBSPOT_PROPERTY_MISSING`. Zeke creates them (Ruling A) before the production deploy |
| C28 | Typed supplier matched by name (L363, L512) | Association first, " BCBA LBA" suffix, supplier fallback, blank sends nothing (`buildClientMetadata.mjs:360-452`) | d55, d61 (insert E approved) | — |
| C29 | Grad Permit marker pending (L364, L513) | Built (`buildClientMetadata.mjs:454-469`) | d55 | Data fix D15 before go-live (Zeke / United Care) |
| C31 | Outgoing BTs active until the removal date (L365, L561) | Kept while the label is on the Case (`:281-289`) | d55, seventh set 9 | — |
| C33 | 135 / 234 / 236 open (L366, L552-557) | 82 → 234 → 288 → 135; 236 never read | d55, seventh set 9 | — |
| C37 | Text + weekly hours (L369, L517) | Text alone (`:658-662`) | d54 | — |
| C38 | `total_hours_bt1bt2_work_schedule`; ignore `total_hours_btrbt_12` (L370, L518) | Sum of `hours_bt_work_schedule_1` + `bt_rbt_2_work_schedule` (`:41-67`) | d41 | The guide names the BT 2 input `hours_bt_work_schedule_2`; the code reads `bt_rbt_2_work_schedule` (d41). Guide note should name the property the code reads |
| C42, C43 | `full_home_address`; Address 2 as stored (L373, L521-522) | Two-line form from the parts; state-only Address 2 → null (`:173-268`) | d56, d62 | — |
| C44 | Allergies + explanation (L374, L523) | Explain / "Yes" / "None" (`:139-155`) | d63 | — |
| C47 | Level 1, 2, 3 (L377, L526) | Digit only (`:157-163`) | d63 | — |
| C53 | Pair by insurance type (L380, L530) | Pair by `n1_what_type_of_insurance`, "`<name> <npi>`" (`:84-113`) | d32, d54 | — |
| C60 | `referral_source` (L382, L539) | Other sends `referral_other` (`:711-715`) | d64 | **Production deploy blocker:** `referral_other` is 404 in production (as C25) |
| C62 | Active / Inactive held until the label test (L383, L608) | Sent and replaced (`:525-529, 545`) | d13 (test run 2026-11-20) | — |
| C63 | Staffing: nothing sent until the label test (L220, L384, L609) | Three labels sent and managed | d13, d15 | — |
| S10 | Labels add-only (L1734) | Replace-and-remove POST (`centralReachClient.mjs:798-806`) | d13 | — |
| B18, T13 | Format check pending (L745) | 7 digits required (`syncDecisions.mjs:13-15`) | d58 | Known effect accepted: 5 production records end `error` until fixed (Zeke, D20) |
| B22 | `ucaba_email_address` (L341, L408, L576) | `email` (`buildEmployeePayload.mjs:44, 306`) | d49 | — |
| B24, T18 | Updates send CR's email (L341) | HubSpot's email when filled (`centralReachClient.mjs:600-606`) | d47 | — |
| B26 | Contact email (type 17) (L409, L453, L580) | BCBA `personal_email` (`buildEmployeePayload.mjs:321-328`) | d50 | O-51: confirm `personal_email` exists on the production BCBA before the production deploy (a missing mapped key fails the run) |
| B41, T27 | Label removal after a source change left open (L328) | Every mapped label managed and removed (`buildEmployeePayload.mjs:125-146`) | d14, d35 | — |
| T08 | Behavior Technician NY (L337) | `RBT CO` for Colorado-only (`centralReachClient.mjs:34, 47-58`) | d17, Q15 | — |

---

## 4. CODE WITHOUT A REQUIREMENT

The client's rule (2026-11-24): "The only fields we should be sending over that are updating in CentralReach are the fields that are listed on the Google Doc as requirements."

The guide names most CentralReach targets by field or label **name**, not by ID. Each code ID was matched to its name in `cr-catalog-snapshot.json` (exact `labelId` / field ID) and that name was looked for in the guide.

### 4.1 Things the code changes in CentralReach that the guide does not list

| What the code writes | Where | Listed in the guide? | Basis | Recommendation |
|---|---|---|---|---|
| Label **All Clients** `1052619`, on every client, always | `centralReach.mjs:53, 92`; `buildClientMetadata.mjs:542` | No | d14 (Zeke 11/20: base labels kept and always sent) | Add to the guide, or stop sending. Zeke |
| Labels **All Employees** `1052618` and **Clinical** `1052643`, on every employee | `centralReach.mjs:12, 17, 104-105`; `buildEmployeePayload.mjs:169-170, 180-182` | No | d14 | Same. Zeke |
| Meta **138702** "HubSpot Link to Case Record" (Case record URL) | `centralReach.mjs:165`; `buildClientMetadata.mjs:716-719` | No. The guide lists 138703 for employees only (L266, L406, L433); for a Case it names only the ExternalSystemId (L334) | BUILD-PLAN C37 ("mirrors the employee rule"); no Zeke quote found | Add to the guide or stop sending. Zeke |
| BT/RBT core **`addressLine2`** from `home_apt` | `buildEmployeePayload.mjs:226-227` | No: the BT/RBT mailing address lists `street_home`, `location_city`, `state_home`, `postal_code_home`, `employee_phone` (L436, L597) | O-20 **open**: "kept until he decides" (BUILD-PLAN T5). The only change without a decision | Zeke decides O-20 (keep and add to the guide, or stop sending) |
| Contact form **`RBT CO`** for a Colorado-only BT/RBT (create only) | `centralReach.mjs` / `centralReachClient.mjs:34, 47-58` | No: the guide lists Behavior Technician NY (L337) | d17, Q15 confirmed | Guide note |
| **Removal** of managed labels when their source no longer requires them: client state, Home, Active/Inactive, staffing; employee state, role, assign, licensure, NY Medicaid, Salaried, Billing Hold | `centralReachClient.mjs:798-806` (held labels minus managed plus required); managed lists `buildClientMetadata.mjs:553-562`, `buildEmployeePayload.mjs:120-146` | Partly. The guide asks for replace/remove for Active/Inactive, staffing and Billing Hold (L383-384, L418), and leaves removal open for state, service location, role, licensure and credentialing labels (L328) | d13, d14 | Guide note for the open ones |
| **Removal** of retired labels Pending 97151 `1156742`, Pending 97153 `1156744`, Starting 97153 `1156745` from a client that holds one | `centralReach.mjs:78-82`; `buildClientMetadata.mjs:561` | No: the guide says "do not create, do not send, do not require" (L222) | BUILD-PLAN row 4.21. `1156744` and `1156745` are not in the CR catalog snapshot of 11/20 (deleted from CR) | Low impact; add to the guide |
| Label **Salaried** `1132653` | `buildEmployeePayload.mjs:193` | Listed as "Salaried" (L412, L581) without saying label or field; the ID is not in the guide | O-27 closed (Salaried is a CR label) | Guide note with the ID |

Not written by any mapper although present in code: NM Employee `1157030`, VA Employee `1157031` (in the sendable list, `centralReach.mjs:112-113`, but no mapper requires them), and parent label Staffing Status `1156741` (never sent).

### 4.2 Every CentralReach target the code can write, listed / not listed

**Client core keys (POST create; PUT update):** `ContactForm` (create only) listed L343; `ExternalSystemId` listed L334; `FirstName`, `LastName`, `DateOfBirth` listed L344-346; `Gender` L358; `PrimaryEmail` L359; `PhoneCell` (phone) L360; `AddressLine1`, `AddressLine2`, `City`, `StateProvince`, `ZipPostalCode` L360; `GuardianFirstName`, `GuardianLastName` L359. All listed. `PhoneHome` is never sent (d36).

**Employee core keys:** `ContactForm` L337 (`RBT CO` not listed, 4.1); `externalSystemId` L338; `firstName`, `lastName` L339-340; `primaryEmail` L341; `dateOfBirth` L342; `gender` L407 / L434; `addressLine1`, `city`, `stateProvince`, `zipPostalCode`, `phoneCell` L410 / L436; `addressLine2` listed for the BCBA (`apartment__home`, L410), **not listed for the BT/RBT** (4.1).

**Client metadata fields (name from the catalog → guide row):** 126214 Known Allergies L374; 126207 Maladaptive Behaviors L375; 132303 Comorbid Diagnosis L375; 131313 BT #1 name L514; 138092 BT #2 Name L514; 132304 / 138093 Work Schedule #1 / #2 L515-516; 126209 Client Availability L517; 134331 Total Assigned Hours (97153) L518; 132431 Approved Auth Hours L519; 134672 Auth Period L520; 131151 Referring Physician, Credentials & NPI L530; 131195 / 138701 ASD dates L533-534; 131308 Supervising BCBA L512; 136052 Grad Permit Holder L364, L723; 131314 Initial Assessment BCBA and 144602 Reassessment BCBA L511; 138851 Care Coordinator L510; 133826 Severity Level L526; 138378 Important Information- Parent L527; 138090 / 137667 Policy Holder Name / DOB L535-536; 126210 / 131316 Current Primary Insurance / ID L528-529; 144600 / 144601 Secondary Insurance / ID L537-538; 141233 Referring Physician Medicaid ID L532; 144793 Diagnosis L531; 126222 Referral Source L539; 137697 / 138091 Service Location Address / 2 L521-522. **Not listed: 138702 HubSpot Link to Case Record.**

**Employee metadata fields:** 133819 Work address L437; 147882 Active Case Count L438; 138703 HubSpot Link to Record L406, L433; 138069 Personal Email L409 (BCBA only; BT/RBT held, T9, and the guide lists no BT/RBT personal email); 126216 / 138112 / 138113 Medicaid ID # NY / NJ / CO L411. All listed. 134444 is never sent.

**Client labels:** 1082499 NY Client, 1132647 NJ Client, 1132648 CO Client (L385); 1052656 Home (L386); 1125427 Active Client, 1121488 In-Active Client (L383, by meaning "Active / Inactive"); 1156743, 1156746, 1156747 staffing (L220). **Not listed: 1052619 All Clients; removal of 1156742 / 1156744 / 1156745.**

**Employee labels:** 1130668 BCBA (header, L687); 1132655 NY, 1107686 NJ, 1107687 CO Employee (L413, L439); 1124246 BCBA Colorado, 1124245 BCBA LBA NJ, 1052629 BCBA LBA NY, 1092164 GRAD Student- LBA NY (L414); 1107647 NY Medicaid (L417); 1132653 Salaried (L412, by name); 1103437 Billing Hold Medicaid affiliation (L418); 1052630 / 1132652 / 1132650 Behavior Technician NY / NJ / CO and 1052631 / 1132651 / 1107692 RBT NY / NJ / CO (L440). **Not listed: 1052618 All Employees, 1052643 Clinical.**

### 4.3 Sent unchanged to protect them, by the client's ruling of 2026-11-24

**Ruling (relayed by the coordinator, 2026-11-24):** keep the fix in `src/lib/mappedState.mjs`: other fields are sent back unchanged so CentralReach does not blank them, because CentralReach documents no partial update for profile fields; the build chat is adding an SSN guard.

**What the code does (confirmed):** before every client and employee update PUT the code reads the record, and the PUT body is the whole read with the mapped keys laid over it (`updateBodyFromRead`, `src/lib/mappedState.mjs:456-469`; used at `centralReachClient.mjs:425-431` for clients and `:650-660` for employees). Left out of the carried keys: `ContactForm`, `DateOfBirth` (handled by its own rule) and a blank `ExternalSystemId` (`mappedState.mjs:447-454`). When no mapped key differs from the read, no PUT is sent (`mappedKeysMatchRead`, `mappedState.mjs:477-482`). A create sends only the mapped payload.

**Keys sent back as read (not changed by the integration).** From the reads recorded in `unmapped-field-wipe-check-2026-11-24.md` (L67-125):

- Employee: `contactId`, `isActive`, `type`, `title`, `middleInitial`, `chosenName`, `languages`, `credentials`, **`ssn`**, `npiNumber`, `jobTitle`, `company`, `employeeType`, `payTypes`, `payCodes`, `primaryOfficeLocation`, and `hireDate` when the read returns it.
- Client: `phoneHome`, `title`, `middleInitial`, `chosenName`, `guarantorFirstName`, `guarantorLastName`, `isActive`, `type`, and the lists `clientDiagnosisCodes`, `additionalContacts`, `primaryPayors`, `secondaryPayors`; `externalSystemId` as held.

**Notes (facts and one assumption):**
- **The SSN guard is not in the working tree yet** (no `ssn` in `mappedState.mjs` or `centralReachClient.mjs`, checked 2026-11-24). Until it lands, every employee update PUT carries the employee's SSN back to CentralReach as read.
- `isActive` is sent back as read, so the integration does not deactivate anyone (consistent with T04 / B47). Assumption: a staff change to `isActive` made between the read and the PUT (seconds) would be overwritten; not tested.
- Whether CentralReach accepts every list key in the shape it returns is not proven (O-63 asked for proof on the test records).
- These keys change nothing in CentralReach by design, so they are listed here and not in 4.1.

---

## 5. Guide differences since the snapshot

**Confirmed:** Drive metadata (read 2026-11-24): `modifiedTime` `2026-11-24T15:58:28.859Z`, etag `MjAyNi0xMS0yNFQxNTo1ODoyOC44NTla` (which decodes to the same time). The snapshot records "Drive last modified 2026-11-24T15:58:28Z" and was taken at 16:08 UTC. The document has not been modified since the snapshot, so **there are no requirement-bearing differences**, and this trace runs against the snapshot text.

**Limits:** the Drive revision list returns only one revision (`1`, 2026-10-25), so the Docs revision ID in the snapshot (`AHj4eMRP…`) could not be compared through this connector. No text diff was made: it was not needed because the modified time is unchanged. Comments are not in the snapshot and were not read.

**The guide is behind the code (not a change in the Doc):** the latest dated note in the Doc is from 11/20. The 29 DIFF-D rows rest on decisions of 11/20 to 11/24 (d13 to d65, seventh set) that are not in the Doc. The approved inserts A-E (`GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md`) are not written yet.

---

## 6. Assumptions and what could not be verified

**Assumptions:**
1. "The code" is the working tree as read on 2026-11-24 afternoon. It was not committed or frozen; a later edit by the build chat could change a line cited here.
2. A DIFF-D row counts as "accounted for" because a recorded decision with Zeke's words exists in BUILD-PLAN section 4 or the package's seventh set. The Doc itself does not yet say so.
3. CentralReach field and label names come from the catalog snapshot of 2026-11-20 (`cr-catalog-snapshot.json`). A rename or deletion in CentralReach since then is not seen.
4. The keys listed in 4.3 come from earlier reads of test records; a production record may return more keys, which would also be sent back unchanged.
5. Row granularity is this trace's own. Another reader could split or merge rows; the classes of the requirements would not change.

**Not verified (no live calls allowed):**
- That the production properties the code requests exist: `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`, `referral_other` (404 on 2026-11-24 per the package), `personal_email` on the BCBA (O-51), `service__stateregion_2`, and the two gate properties. A missing mapped property ends every run of that object `HUBSPOT_PROPERTY_MISSING`.
- That `hours_bt_work_schedule_2` (named by the guide) and `bt_rbt_2_work_schedule` (read by the code) are different properties. The code follows d41.
- Runtime behaviour: retries, the dead-letter path, the never-retry rule for `waiting`, and the label read-back were checked in code only, not run.
- Contact fan-out queues every Case linked to a changed Contact without checking association type 3 (`contactFanOutWorkflow.mjs:37-38`). This is harmless as read (the Case worker reads its own sync properties); it was not tested live.
- Guide comments and the linked workbook (L188, L599) were not read.
