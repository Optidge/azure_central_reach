# Case / Client decisions: production evidence (2026-11-23)

Read-only review, ~18:40 UTC, for the Case-side open items in `REMAINING-GAPS-2026-11-23.md` sections B and D. Deployed commit `655b385`; nothing in `src/` was changed.

**What was read.**

- HubSpot production `50317927`: GET and CRM search only. The portal ID was checked before the first read.
- CentralReach production: GET only. The one POST was the token request.
- Script: `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/case-evidence.mjs`. It reuses the read helpers from `scripts/sandbox/check-cr-record.mjs`, and calls the real `buildClientMetadata` to work out what the code would send.

**What is reported.** Client values are reported as shapes only: letters become `A`/`a`, digits become `9`, and `…` stands for more words. Staff names and record IDs are given as they are.

"Guide line N" means `guide-extract-2026-11-20.md` line N.

## 0. Findings that change the picture (read these first)

1. **The CR API sees only a subset of CentralReach.**
   - `GET /contacts/clients?take=5000` returns 199 clients (164 active). `GET /contacts/employees?take=10000` returns 908 employees (253 active).
   - The CO and NJ sample clients (Zachariah Milner, Sebastian Raggi) are not in that list. The CO Case's `client_id_number` `4717582` answers 404, and so do 2 of the 3 Grad Permit Cases' Client IDs.
   - BCBAs Anne Fetherston, Maria Olson and Samantha Scheets are not in the employee list, yet CR client 4438604 holds "Anne Fetherston BCBA LBA".
   - This is probably the same cause as "81 of 100 Client IDs do not resolve" (E11, R-2/R-17). An update to a client the key cannot see will 404.
   - **Question for Zeke / Danny:** is the API key limited to a location, a group or a user's caseload? Updating existing clients (9.8 step 3) depends on this.
2. **CR holds hand-entered values that differ from HubSpot on most existing clients.**
   - The sample was the 73 API-visible CR clients whose ID is on exactly one HubSpot Case. The code's output was compared field by field (section 3 table).
   - On the first sync, a blank HubSpot value is skipped, not cleared. `metadataClearFieldIds` in `src/lib/mappedState.mjs:193-209` only clears a field the integration wrote before, ~~so the "CR filled, code blank" counts are **kept** in CR.~~
   - **Review correction 2026-11-23:** the skip rule is right, but the counts are only as good as the HubSpot read behind them. `case-evidence.mjs` built its property list from `GET /crm/v3/properties/deals` without `dataSensitivity=sensitive` (line 219), then kept only properties in that list (lines 526 and 748). So every sensitive source property was dropped, and the code's output for it was computed as blank.
     - **Affected (cutover risk):** Diagnosis 144793 (source `phi_diagnosis`, sensitive per guide line 372: the 66 "CR blank, code fills" were built from `diagnosis_other` alone, so the values sent will differ) and Policy Holder DOB 137667 (`phi__policy_holder_dob`, guide line 373: the 2 "kept" values may be overwritten). ASD date 131195 (69 "kept") is **unverified**: the code filled it on none of the 73, which fits a dropped property, but its sensitivity was not read. With the production Function's token these fields will likely be filled and sent on the first sync, overwriting CR.
     - **Not affected:** Physician 131151 (72) and Allergies 126214 (44). `feedback-formats-read.out` shows `physician_name`, `npi_number`, their `__commercial` pair, `allergies` and `allergies__yes__explain` as `non_sensitive` and readable by the same token (`physician_name` is filled on only 20 Cases), and Allergies has 27 "both filled, differ" in the same comparison. Those "kept" counts stand.
     - Re-run the comparison with the sensitive read (step 9.6) before telling United Care which values the first sync changes.
   - Every "both filled, differ" count **will be overwritten**: for example 48 Supervising BCBA, 69 Care Coordinator, 62 Auth Period, 56 Current Insurance, 33 Referral Source and 20 Total Hours values.
   - This answers O-29 / A-19 (D9): staff do maintain these fields in CR.
3. **Owners API: 403 with the production token.** `GET /crm/v3/owners/{id}` was refused, so `crm.objects.owners.read` is not on the production app. OPEN-ITEMS row 75 says "Scope added"; that is not true for this token. The Case no longer needs the scope (decision 39). B11 would.
4. ~~**The production token cannot see sensitive Case properties.**~~ `GET /crm/v3/properties/deals/phi_diagnosis` (and `phi_first_name__cloned_`, `insurance_id_1`) answers 404. See section 6.
   - **Review correction 2026-11-23:** the 404 does not show a missing scope. `case-evidence.mjs` read the definitions without `dataSensitivity=sensitive` (lines 219 and 800-801) and never asked for a sensitive value on a record, so the scope was not tested. Zeke states, and the guide records (line 1451, Danny 11/14), that the production Central Reach Integration app has read and write on deals, contacts and custom objects "including sensitive and highly sensitive". The step 9.6 check will confirm it.
5. **The production token cannot read lists or workflows.** `POST /crm/v3/lists/search` and `GET /automation/v4/flows` both answer 403, so the segment for item 9 could not be read.

## 1. O-15 Grad Permit (C13), C15 Outgoing BT 1/2, C16 Outgoing Supervising / SUB / On Leave

**Guide.**

- Line 355: "Compare the typed supplier with the supervising association. CR Grad Permit Holder metadata 136052 exists. How the marker is carried on the Case or automated remains pending."
- Line 356: "Outgoing BT 1/2 (131/166) remain active until the removal date passes."
- Line 357: "Outgoing Supervising BCBA 135 is described as leaving and not active … SUB BCBA 234 coverage with On Leave BCBA 236 remains open for CR."
- Line 504 (Sara, Oct 22): "when the Ongoing Central Reach Provider Supplier differs from the Supervising BCBA (association 82), the Supervising BCBA is a grad permit holder. Reliable check on the BCBA record: lba_licensure__ny = Grad Permit."
- Line 710: "production association labels are Grad Permit Supervisor 151 and Supervisee 150. CR has label GRAD Student- LBA NY 1092164 and metadata field Grad Permit Holder 136052."

**Evidence.**

- **BCBA `45994302542` is Dominique Plummer, and she is a Grad Permit *holder*, not a supervisor.**
  - `grad_permit_status` = "Grad Permit"; `lba_licensure__ny` is blank; `grad_permit_supervisor_name` = "Amanda Beckerman".
  - Her association to Amanda Beckerman (`45942219039`, `lba_licensure__ny` = Yes) is typed **151** "Grad Permit Supervisor (supervises this BCBA)". The reverse is **150** "Grad Permit Supervisee (this BCBA supervises them)".
  - Label 149 (blank) is also present.
- **Label direction.** Reading from the holder, 151 points to the supervisor.
- **The holder is on her Cases as Supervising BCBA, and the supervisor is not.**
  - On 3 Cases Dominique is Supervising BCBA (81 from the BCBA side, 82 from the Case side): `50096197801`, `59369574218` and `64880905367`.
  - Amanda is on `50096197801` with no label.
  - The Case's `ongoing_central_reach_provider_supplier` = "Dominique Plummer", the holder.
- **Which BCBA property marks a holder.**
  - `grad_permit_status` = Grad Permit: 28 BCBAs. `lba_licensure__ny` = Grad Permit: 28.
  - 26 have both, 2 have only `grad_permit_status` (Dominique, Katie Vangraefschepe), and 2 have only the `lba` value.
  - 21 holders have a 151 link. `grad_permit_supervisor_name` equals the 151 BCBA's name on 20 of those 21.
- **48 in-scope Case links where a holder is the Supervising BCBA (82).**
  - The supplier text equals the **holder** on 37, the supervisor on 1, other names on 4, and is blank on 6.
  - Sara's premise (supplier ≠ 82 BCBA) is false in production: the supplier is usually the holder.
- **What CR holds (all API-visible CR clients).**
  - 136052 is filled on 19 of 163. The formats are "`<holder>` Grad Permit Holder", "`<holder>` Grad Permit", "`<holder>` Grad" or a bare name.
  - On the 4 Grad Permit Cases read directly, 136052 = "Jay Moreno Grad Permit Holder", "Jay Moreno Grad Permit" or "Dominique Plummer Grad Permit Holder".
  - On the same 4 Cases, **131308 = "`<supervisor>` BCBA LBA"** ("Madeline Sell BCBA LBA" ×3, "Amanda Beckerman BCBA LBA").
  - Across the 73 linked clients: where the 82 BCBA is a holder, 136052 is filled on 9 of 12 and names the holder on 8. It is also filled on 9 clients whose 82 BCBA is not a holder (older assignments).
- **No CR field exists for Outgoing, SUB, On Leave or Outgoing BT.** The live `GET /contacts/metadata-configuration` lists 59 fields, and none of them is any of these.
- **HubSpot holds the dates the guide refers to** (Case properties):
  - `outgoing_supervising_bcba_removal_date`, `outgoing_bcba_end_date`, `outgoing_sub_bcba_end_date`, `outgoing_btrbt_end_date`, `primary_btrbt1_removal_date`, and `bcba_leave_date` / `bcba_leave_return_date`;
  - `outgoing_btrbt1_removal_date_2` (labelled "Outgoing BT/RBT**2** Removal Date") and `outgoing_btrbt2_removal_date_2` (labelled "…BT/RBT**1**…"). **Their labels are swapped.**
  - There is an extra Case→BCBA label, **288 "Outgoing SUB BCBA"**, that is not in the guide or in `config.mjs`. 234 is "SUB BCBA (Supervising Status)" and 236 is "On Leave BCBA (inactive)".
- **Label counts on the 1,688 Warm in-scope Cases:**
  - Supervising 82: 218; IA 86: 65; RE 145: 72;
  - **Outgoing Supervising 135: 21** (6 of them also have an 82); SUB 234: 4; On Leave 236: 4; Outgoing SUB 288: 1;
  - Primary BT 1 76: 164; Primary BT 2 143: 5; **Outgoing BT 1 131: 7** (6 Cases have an Outgoing BT and no Primary BT in the same slot); Outgoing BT 2 166: 0;
  - no Case has two 82 BCBAs.

**Proposed rule (C13 + C12 together).**

- **Source.** The Case's Supervising BCBA association (82). A BCBA in that role is a holder when `grad_permit_status` = "Grad Permit" (or `lba_licensure__ny` = "Grad Permit"). The association, not the supplier text, decides.
- **136052.**
  - If the 82 BCBA is a holder: send "`<first> <last>` Grad Permit Holder". This is the most common CR form.
  - Otherwise send blank. Under the existing rule a blank clears only a value the integration wrote, so the 9 older hand-entered values stay.
  - Several 82 BCBAs: send the holders only, joined by ", ".
- **131308.** On a Grad Permit Case, CR's Supervising BCBA is the **supervisor** (the 151 BCBA). Sending the supplier text, as the code does today (`buildClientMetadata.mjs:386-389`), would overwrite "Madeline Sell BCBA LBA" with "Jay Moreno". There are two choices:
  - (a) Send the 151 supervisor's name (fallback `grad_permit_supervisor_name`) when the 82 BCBA is a holder; or
  - (b) Do not send 131308 at all (see O-16).
- **When the marker clears.** When the 82 BCBA is no longer a holder, or is no longer 82. The existing clear rule handles this.
- **C15 / C16.** No CR target, so send nothing.
  - The BT #1/#2 names come only from 76/143 (as built). Outgoing 131/166, 135, 234, 236 and 288 stay unsynced.
  - If United Care wants an outgoing BT listed until its removal date, it needs a new CR field (decision 27) and a fixed removal-date property, because the labels are swapped.

**Code change (when decided).**

- `src/constants/centralReach.mjs:130-150`: add `GRAD_PERMIT_HOLDER: 136052`.
- `src/mappings/client/buildClientMetadata.mjs`:
  - extend the `staffNames` contract (lines 290-298) with `gradPermit` and `supervisorName` on each `supervisingBcba` entry;
  - add `gradPermitHolder(staffNames)` next to `staffNameFields` (lines 203-222);
  - add the field at line 421.
- `src/workflows/clientSyncWorkflow.mjs` (~line 501): also read `supervisingBcba` (82). It is in `config.mjs:108` but not in `STAFF_ROLE_FIELDS` (`buildClientMetadata.mjs:182-187`). Read `grad_permit_status` and `lba_licensure__ny` on that BCBA and its 151 association.

**CLARIFYING QUESTION.** On a Grad Permit Case, should 131308 carry the 151 supervisor ("Madeline Sell"), as CR does today, or stop being synced? And should 136052 read "`<name>` Grad Permit Holder"?

## 2. O-43, C20 Total Assigned Hours

**Evidence: definitions.** All three totals are calculated and read-only.

- `total_hours_bt1bt2_work_schedule` (the guide's line 361 source): number, formula **`1 + 1`**. It equals 2 on all 2,882 Cases, so it is unusable.
- `total_hours_btrbt_12`: formula `if is_present(hours_bt_work_schedule_1) and is_present(bt_rbt_2_work_schedule) then H1 + R2`.
- `total_hours_bt_12_work_schedule`: formula `hours_bt_work_schedule_1 + hours_bt_work_schedule_2`.

**Evidence: the inputs** (both number fields, not calculated).

- `hours_bt_work_schedule_1` ("🤖Hours BT/RBT 1 Work Schedule").
- `bt_rbt_2_work_schedule` ("🤖Hours BT/RBT 2 Work Schedule").
- The older `hours_bt_work_schedule_2` holds **0 on 1,876 of 1,878** filled Cases. It never equals `bt_rbt_2_work_schedule` where both are filled (0 of 11). It is a stale default, so the code is right to read `bt_rbt_2_work_schedule`.

**Evidence: counts on the 2,760 in-scope Cases** (Warm 1,688; entry = Yes 412).

| | In scope | Warm | Entry Yes |
|---|---|---|---|
| H1 filled | 236 | 182 | 178 |
| R2 filled | 26 | 18 | 20 |
| Both filled | 20 | 15 | 16 |
| Only H1 | 216 | 167 | 162 |
| Only R2 | 6 | 3 | 4 |
| `total_hours_btrbt_12` filled | 20 | 15 | 16 |
| … equal to the code sum | **20 of 20** | 15 of 15 | 16 of 16 |
| `total_hours_bt_12_work_schedule` filled | 80 | 67 | 77 |
| … differs from the code sum | 8 (the stale 0 in H2) | 4 | 8 |
| No total filled, code sum filled | 150 | 107 | 97 |

**Evidence: CR Meta 134331.**

- Filled on 106 of 163 visible clients, almost always a whole number (`99` ×94, `99.9` ×6).
- On the 67 linked clients where CR is filled, CR equals the code sum on 13 and **equals no HubSpot value on 53**. CR is maintained by hand.
- NY sample: only H1 is filled; the code sends a decimal ("99.9"); CR holds a different whole number ("99").
- The CO and NJ samples are not visible to the CR API (section 0).

**Recommendation.** Zeke's rule ("use the total if filled, else add 1 and 2, else the one that is there") gives **the same answer as the code** on every production Case:

- the only trustworthy total (`total_hours_btrbt_12`) is calculated from the same two inputs, and equals the sum on 20 of 20;
- `total_hours_bt1bt2_work_schedule` is always 2;
- `total_hours_bt_12_work_schedule` adds the stale `hours_bt_work_schedule_2` and is wrong on 8 Cases.

So keep decision 41. **No code change.** Close O-43 with the note "the total is a formula of the same inputs". Optionally, update the comment at `src/mappings/client/buildClientMetadata.mjs:39-43` to say so.

**Risk.** The first sync overwrites CR's hand-entered hours on 20 linked clients ("both filled, differ"). The other 35 are skipped because HubSpot is blank.

**CLARIFYING QUESTION.** Should the guide's line 361 total (`total_hours_bt1bt2_work_schedule`, formula `1 + 1`) be fixed or retired in HubSpot so staff stop seeing "2"?

## 3. O-28 / A-9 text formats (C19, C23, C26, C33, multi-name)

**Evidence.** The formats below come from all 163 API-visible CR clients. 10 of the 163 are old test clients, with shape "A9A-A-A-99 …" in every field. The code's output is from `buildClientMetadata.mjs`.

| Field | What CR holds (top shapes) | What the code sends | Match? |
|---|---|---|---|
| C19 Availability 126209 | free text: "Yes" ×18; schedule text such as "A - A 9a - 9a" | `<text>, <weekly hours>` (lines 355-358) | No (41 of 73 linked differ) |
| C23 Auth Period 134672 | **"99/99/9999 - 99/99/9999" ×84 of 92** (a few without padding or spaces) | `MM/DD/YYYY - MM/DD/YYYY` (lines 23-37, 101-109) | **Format matches**; only one date when one is blank |
| C26 Allergies 126214 | "None" ×64, "Yes (`<text>`)" ×18, "none" ×10, "Confirmed" ×10, "N/A", "No" | "Yes, `<text>`" / "No" (lines 125-134) | No: CR uses "None" for No and "Yes (`<text>`)" for Yes |
| C33 Diagnosis 144793 | filled on 10 only (all test) | "Yes-F84.0, `<text>`" (lines 139-142) | No real CR usage; 66 of 73 would be newly filled |
| C14 BT names 131313/138092 | "First Last" ×70, "First Last RBT" ×18; never several names | "First Last", ", "-joined | Matches when one BT per role |
| C11 IA BCBA 131314 | "First Last" ×75, "First Last BCBA" ×18 | "First Last" | Matches. **HubSpot has no IA (86) on 57 of 73**; blank is skipped |
| C31 Physician 131151 | "Name 9999999999" ×93 (**no comma**), "A. Name, 9999999999" ×18 | "`<name>`, `<npi>`" | Close; comma differs |
| C34 ASD date 131195 | 99/99/9999 ×59, 9/99/9999 ×23, 9/9/9999 ×11 | MM/DD/YYYY | Matches (CR is not padded consistently) |
| C24 Service address 137697 | street **⏎** city state zip (line break) | comma-joined | Differs (line break vs ", ") |

**Review correction 2026-11-23:** the "what the code sends" counts for fields with a sensitive source were computed without that source (section 0, item 2). C33 Diagnosis: the 66 "newly filled" values were built from `diagnosis_other` alone, because `phi_diagnosis` was dropped; with the sensitive read they would carry "Yes-F84.0, …". C34 ASD date: the code sent blank on all 73, possibly because `most_recent_asd_diagnosis_date_1` was dropped (its sensitivity was not read). C31 Physician and C26 Allergies read non-sensitive properties, so their rows stand.

**Recommended code change.** Only C26 needs a change, to match CR:

- `Denial` sends "None" instead of "No" (`buildClientMetadata.mjs:130-131`).
- `Confirmed` sends "Yes (`<explain>`)", or "Yes" alone, instead of "Yes, `<explain>`" (`buildClientMetadata.mjs:127-128`).

Keep everything else.

**CLARIFYING QUESTION.** Should C26 match CR's "None" / "Yes (…)"? Is a comma instead of a line break acceptable for the service address?

## 4. O-16, C12 Supervising BCBA (131308)

**Evidence.**

- 131308 is a free-text field (`input`), filled on 118 of 163 CR clients.
- Its shapes are "First Last BCBA LBA" ×62, "First Last BCBA" ×18, "First Last" ×10, "First Last, BCBA LBA" ×9 and "First Last BCBA, LBA" ×5.
- **It almost always carries credentials** (104 of 118 values end in BCBA and/or LBA; 10 of the 118 are test clients), so it is not an employee's exact CR name. The CR employees are "Madeline Sell" and "Amanda Beckerman", with no credentials.
- On the 73 linked clients, CR differs from the supplier text on 48 (most "contain" the supplier name, plus the credentials). On 25 the supplier is blank.
- NY sample: CR "Anne Fetherston BCBA LBA". HubSpot supplier is blank, and Anne is 82 on the Case.

**Recommendation.** "Match to the CR provider by name" is not possible through the API: the providers are not visible and the field is free text.

- Option A: send "`<82 BCBA first last>` BCBA" plus "LBA" when the BCBA holds an LBA.
- Option B: keep sending the supplier text, and accept that the credential suffix is lost on 48 clients.
- Either way, apply the Grad Permit rule in section 1.

**CLARIFYING QUESTION.** Which is the source of 131308: the supplier text or the 82 association? Should the "BCBA LBA" suffix be added?

## 5. O-17, C10 / B11 Care Coordinator (138851)

**Evidence.**

- 138851 is a free-text field. There is **no email field** in the 59 CR metadata fields, and nothing for the employee side.
- It is filled on 75 of 163 clients. Shapes: first name only ×33, "First Last" ×25, lowercase ×17.
- On the 71 linked clients where both are filled, **CR never equals HubSpot `care_coordinator_name`**, and the first name differs on 67. ~~CR is stale.~~
  - **Review correction 2026-11-23:** "CR is stale" is an assumption, not a finding. The read shows only that the two differ. CR could hold a coordinator HubSpot does not track (for example a CR-side assignment). Either way, the first sync overwrites 69 CR values.
  - NY sample: CR "Kinaya A"; HubSpot "Maya Weiss" (owner `99298050`).
- `care_coordinator_name` is described as "Case owner's display name … Written by the Care Coordinator Change workflow", so it follows the Case owner.
- The owner read itself answered 403.

**Recommendation.** Keep decision 39. The first sync will ~~correct 69 stale values~~ overwrite 69 CR values (an expected overwrite; tell United Care, and confirm with them that CR's values are stale; review correction 2026-11-23). There is no email target, so C10's email stays unsent. B11 has no CR field.

**CLARIFYING QUESTION.** Does United Care want a new CR field for the Care Coordinator email (decision 27)? If not, can O-17 close as "name only"?

## 6. O-18 per-BT hours, O-19 physician pair and insurance_id_3/4

**Evidence.**

- **Per-BT hours.** `hours_bt_work_schedule_1` is filled on 236 in-scope Cases and `bt_rbt_2_work_schedule` on 26.
- **No CR field for per-BT hours.** The 59 metadata fields are listed live; the only hours fields are 134331 and 132431.
- **Insurance type** (`n1_what_type_of_insurance`), in-scope:
  - Medicaid FFS 1,661; blank 589; Commercial OON 281; Commercial Enrolled 159; Medicaid FFS - CO 66; **Unsure 4**.
  - On entry = Yes Cases: Unsure 2, blank 0.
- **Physician field 131151.** CR holds a value on 134 of 163 clients. On 72 of 73 linked Cases the code sends blank, which is skipped, so CR keeps its value.
  - Review correction 2026-11-23 (checked): this count stands. The physician and NPI properties are `non_sensitive` and readable by this token (`feedback-formats-read.out`); `physician_name` is filled on only 20 Cases.
- **`insurance_id_1` to `_4`.** The production token answers **404 on the definitions of every sensitive Case property**, including `phi_diagnosis`, `phi_first_name__cloned_` and `insurance_id_1`/`_2`. So `insurance_id_3`/`_4` could not be measured.
  - CR has only Primary (131316) and Secondary (144601) insurance ID fields, so there is no target for a 3rd or 4th.
  - ~~**The 404 also means this token has no sensitive-data scope.**~~ Check that the token the production Function uses can read the sensitive Case properties (R-23, 9.6), or every Case create will lack its name, DOB, gender and diagnosis.
  - **Review correction 2026-11-23:** the 404 is explained by the request, not the scope. `case-evidence.mjs` (lines 219 and 800-801) read the definitions without `dataSensitivity=sensitive` and never requested a sensitive value on a record. Per Zeke and the guide (line 1451), the production app has the sensitive and highly-sensitive scopes. The 9.6 check confirms it.
  - The Diagnosis comparison in section 3 therefore excludes `phi_diagnosis`. Review correction 2026-11-23: so do the Policy Holder DOB comparison and possibly ASD date; see section 0, item 2 (cutover risk).

**Recommendation.**

- O-18: no CR field; close as "not synced" (C21 excluded).
- O-19: keep `Unsure`/blank → no physician pair. That affects 2 entry = Yes Cases, and a blank is skipped, so CR's value stays.
- C38: no CR target; close as excluded.
- No code change.

**CLARIFYING QUESTION.** ~~Does the production app token have `crm.objects.deals.sensitive.read` (and the highly-sensitive scope)? This review's token cannot see those properties.~~ Review correction 2026-11-23: answered by guide line 1451 (sensitive and highly sensitive scopes on the production app); step 9.6 confirms it on a real Case read.

## 7. O-14 Location #2 schedules

**Evidence.**

- `work_schedule_1_details__for_location_2_other` and `work_schedule_2_details__for_location_2_other` are filled on **0** of 2,882 Cases.
- `specific_home_location` (in scope): Child's House 1,610; blank 1,104; **More Than One Location 25** (0 of those have a Location #2 schedule); Other Location 21.
- `if_services_will_be_in_more_than_one_location__list_the_other_address`: filled on 1 Case.
- `service_address__other`: filled on 2,464 in-scope Cases. Only the 25 More Than One Location Cases send it (C25).

**Recommendation.** Close O-14: C18 is not built and needs no CR field. No code change. If staff start using the Location #2 schedules, revisit.

## 8. O-46 territories; C36 referral_source

**O-46 territories: evidence.**

- Case `stateregion` (text): **0 territory values**. 177 are valid states, and **2,705 of 2,882 are blank**.
- Territory values on Contact `state`, BCBA `state_home`, BT/RBT `state_home` and `state__work_`: 0 each.
- Contact `country` = Puerto Rico / Guam: 0.

**O-46 recommendation.** Close O-46 with no change.

Separate note: `stateregion` is blank on 94% of Cases, so C8 sends no state for most clients. A blank is skipped, so CR keeps its value. Check whether the Case address state lives elsewhere (`location` holds the service state).

**C36 `referral_source`: evidence.**

- Type `enumeration/select`, `calculated=true`, read-only. Options: Americare, Bassy-Americare, McCarthon Center, JemCare, Denver Health-Co, Superior Psychological Services-CO, Salud Family Health Center-CO, Family/friend, Google, Facebook, Care manager, School, Insurance provider, Other.
- **Source:** a HubSpot **property sync from the associated Contact's `how_did_you_hear_about_us_`**. All 40 Cases read have 1 version, `sourceType CALCULATED`, `evaluationType=SYNC`, `sourceObjectTypeId=0-1`.
- **Fill:** 2,487 of 2,760 in scope; 396 of 412 entry = Yes.
- **Values:** Bassy-Americare 1,125; Americare 828; Other 154; Google 151; Facebook 93; Family/friend 79; Care manager 20; Denver Health-Co 19; Insurance provider 10; School 5; Salud 2; JemCare 1.
- **CR 126222** is filled on 114 of 163: "Americare" ×97, "Google" ×10, free text ×7. NY sample: CR has one word of 9 letters; HubSpot is "Other".
- On the 73 linked clients: equal 6; **differ 33**; HubSpot blank 33.
  - "Bassy-Americare" in HubSpot against "Americare" in CR is the likely main difference (check).

**C36 recommendation.** Keep sending the stored value; it is the guide's source (~~line 382~~ lines 373 and 530; review correction 2026-11-23: line 382 is the read-only exclusion row). Tell United Care that "Bassy-Americare" will replace "Americare" on the first sync. If CR reporting groups on "Americare", map Bassy-Americare → Americare in `buildClientMetadata.mjs:413`.

**CLARIFYING QUESTION.** Should "Bassy-Americare" be sent as is, or sent as "Americare" to match CR?

## 9. Production gate (9.3, O-9)

**Evidence.**

- The only production checkbox that acts like a sync gate is `test_record`, which is true on 35 Cases, 6 BCBAs, 18 BT/RBTs and 34 Contacts.
- No property named like sync / gate / ready-for-CR exists on the Case, BCBA, BT/RBT or Contact object. The rest of the bool properties are email triggers (`send_employee_workday_email`: BCBA 94, BT 418 true).
- Lists and workflows could not be read: 403 with the production token.

**Recommendation.** At 9.3, create a new checkbox (for example `cr_sync_enabled`) on the Case, BCBA and BT/RBT. Set `SYNC_RECORD_GATE_PROPERTY` to it.

**CLARIFYING QUESTION.** Which segment should fill the checkbox? Zeke to name it (the segment list cannot be read with this token).
