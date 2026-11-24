# Feedback review: Grad Permit, Supervising BCBA and Outgoing roles (2026-11-23)

Final mapping recommendations for C13 / O-15 (Grad Permit), C12 / O-16 (Supervising BCBA) and C15 / C16 (Outgoing roles, SUB, On Leave, label 288), after Zeke's feedback of 2026-11-23.

> **Read section 8 first.** "Final (after Zeke's feedback)", 2026-11-23, replaces the holder test in sections 1, 2.2 and 2.4, question 7, and the unknown sandbox ID in section 5.1.

**What was read (about 19:35 UTC).**

- HubSpot production `50317927`: GET and CRM search only, portal checked first.
- CentralReach production: GET only (one POST for the token).
- Script: `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/gp-roles-read.mjs` (the read helpers of `case-evidence.mjs`, plus new sections).
- Nothing was written anywhere. Nothing in `src/` was changed. Deployed commit `655b385`.

**Not read.**

- The sandbox `52311591` association labels. The read was refused by the session's permission check, so the sandbox ID of "Outgoing SUB BCBA" is not known (section 5).
- CentralReach for Zhanna Aminova's three Cases: all three Client IDs answer 404 to the API key (the visibility limit in `DECISIONS-EVIDENCE-CASES-2026-11-23.md` section 0).

"Guide line N" means `guide-extract-2026-11-20.md` line N. Staff names are given; no client data is.

## 1. Summary

| Item | Final recommendation |
|---|---|
| Who is a Grad Permit holder | A BCBA with **any** of: `ny_bcba_a_grad_permit_holder` = `Yes`, `grad_permit_status` = `Grad Permit`, `lba_licensure__ny` = `Grad Permit`. The holder property alone misses 18 of 31 holders. |
| Meta 136052 Grad Permit | "`<First> <Last>` Grad Permit Holder" for the Case's Supervising BCBA (82) when that BCBA is a holder. Otherwise blank. |
| Meta 131308 Supervising BCBA, Grad Permit Case | The holder's supervisor: the BCBA on the holder's association **151**, sent as "`<First> <Last>` BCBA LBA". No 151 link: the field is not sent, with a warning. |
| Meta 131308, normal Case | The acting supervising BCBA from the associations, as "`<First> <Last>` BCBA LBA" (or " BCBA" with no LBA). The typed supplier is only a fallback. |
| Outgoing BT 1 / 2 (131 / 166) | Send the name to BT #1 / BT #2 Name (131313 / 138092) while the label is on the Case. No date logic in the integration. |
| Outgoing Supervising (135), SUB (234), Outgoing SUB (288) | No CR field of their own. They feed 131308 only when no Supervising BCBA (82) is on the Case, in the order 82, 234, 288, 135. |
| On Leave (236) | Never sent. |
| Swapped removal-date labels | The guide names no removal-date property. The integration does not need either one. It is a HubSpot clean-up item only. |

**Dominique Plummer is a holder, not a supervisor.** Five production facts say so (section 2.1). This needs Zeke's confirmation because it contradicts his note.

## 2. Grad Permit (C13, O-15)

### 2.1 The two BCBAs

| | Zhanna Aminova `59730424341` | Dominique Plummer `45994302542` |
|---|---|---|
| `ny_bcba_a_grad_permit_holder` "(NY) BCBA a Grad Permit Holder?" | `Yes` | blank |
| `grad_permit_status` | `Grad Permit` | `Grad Permit` |
| `lba_licensure__ny` | `Grad Permit` | blank |
| `grad_permit_supervisor_name` (calculated) | Kelsee Ritchie | Amanda Beckerman |
| Association **from** her | **151** to Kelsee Ritchie `48711665746` | **151** to Amanda Beckerman `45942219039` |
| The same link read **from the other BCBA** | 150 | 150 |
| `lba_licensure__ny` of the other BCBA | `Yes` | `Yes` |
| Supervises anyone (holds a 150 from her side) | no | no |
| Cases as Supervising BCBA (82) | 3 (one also RE 145) | 3 (one also RE 145) |

**Property definitions (BCBA object `2-48354212`).**

- `ny_bcba_a_grad_permit_holder`: label "(NY) BCBA a Grad Permit Holder?", dropdown, options `Yes`, `NA`.
- `grad_permit_status`: label "Grad Permit Status", dropdown, options `Grad Permit`, `NA`.
- `lba_licensure__ny`: label "LBA Licensure - NY", dropdown, options `Yes`, `In Process`, `No` (shown as "Will Apply"), `Grad Permit`.
- `grad_permit_supervisor_name`: calculated text. It is filled only where a 151 link exists, so it adds nothing as a fallback.

**Association labels (BCBA to BCBA), read live.**

- 151 "Grad Permit Supervisor (supervises this BCBA)".
- 150 "Grad Permit Supervisee (this BCBA supervises them)".
- 149 unlabeled.

**How to read the direction.** The label describes the *other* record. On Dominique's record, Amanda Beckerman appears with the label "Grad Permit Supervisor (supervises this BCBA)": Amanda supervises Dominique. On Amanda's record, Dominique appears as "Grad Permit Supervisee".

**Why Dominique is a holder.**

1. Her 151 points to Amanda; Amanda's side of the link is 150.
2. `grad_permit_status` = `Grad Permit`.
3. `grad_permit_supervisor_name` = Amanda Beckerman.
4. United Care's own automation email on her record calls her "your Grad Permit supervisee Dominique Plummer" and is addressed to Amanda.
5. CentralReach client `4463962` (her Case `50096197801`) holds 136052 = "Dominique Plummer Grad Permit Holder" and 131308 = "Amanda Beckerman BCBA LBA".

She looks different from Zhanna only because two of her three flags were never filled in (`ny_bcba_a_grad_permit_holder` and `lba_licensure__ny` are blank). Zhanna and Dominique are the same kind of record.

### 2.2 The holder property is not reliable alone

31 production BCBAs carry at least one of the three flags (2 are test records).

| Holder property | `grad_permit_status` | `lba_licensure__ny` | Has a 151 link | BCBAs |
|---|---|---|---|---|
| blank | Grad Permit | Grad Permit | yes | 12 |
| Yes | Grad Permit | Grad Permit | no | 7 |
| Yes | Grad Permit | Grad Permit | yes | 5 |
| blank | Grad Permit | blank | yes | 2 (Dominique Plummer, Katie Vangraefschepe) |
| blank | Grad Permit | Grad Permit | no | 2 |
| Yes | blank | blank | no | 1 (Dijana Dujmovic) |
| blank | blank | Grad Permit | yes | 1 (Thomas Gleave) |
| blank | blank | Grad Permit | no | 1 (Perel Englander) |

- The holder property is `Yes` on 13 of 31. It misses Jay Moreno, Kiniana Nelus and Dominique Plummer, who are all named as holders in CR's 136052 today.
- It looks like a newer property: the 8 newest holders have it, the older ones do not.
- No flagged BCBA supervises anyone, and every 151 link belongs to a flagged BCBA. So the three flags together find every holder.
- 9 holders have no 151 link (7 of them the newest records). Their supervisor is unknown to HubSpot.

### 2.3 What CR holds today

| Case | Holder (82 on the Case) | CR 136052 | CR 131308 |
|---|---|---|---|
| `50096197801` | Dominique Plummer | "`<holder>` Grad Permit Holder" | "`<supervisor>` BCBA LBA" (Amanda Beckerman) |
| `50105020999`, `50259103263`, `58331911057` | Jay Moreno | "`<holder>` Grad Permit Holder" ×2, "`<holder>` Grad Permit" ×1 | "`<supervisor>` BCBA LBA" (Madeline Sell) ×3 |
| Zhanna Aminova's 3 Cases | Zhanna Aminova | not visible to the API (404) | not visible |

Across all 163 visible clients, 136052 is filled on 19: "`<holder>` Grad Permit Holder" ×5, "`<holder>` Grad Permit" ×2, "`<holder>` Grad" ×2, other forms ×10.

On the same Cases the supplier text (`ongoing_central_reach_provider_supplier`) is the **holder's** name, so the deployed code would overwrite "`<supervisor>` BCBA LBA" with the holder's name.

### 2.4 Final rule

**Guide.**

- Line 355: "Compare the typed supplier with the supervising association. CR Grad Permit Holder metadata 136052 exists. How the marker is carried on the Case or automated remains pending."
- Line 504: "when the Ongoing Central Reach Provider Supplier differs from the Supervising BCBA (association 82), the Supervising BCBA is a grad permit holder. Reliable check on the BCBA record: lba_licensure__ny = Grad Permit."
- Line 710: "production association labels are Grad Permit Supervisor 151 and Supervisee 150. CR has label GRAD Student- LBA NY 1092164 and metadata field Grad Permit Holder 136052."
- Line 406: "151 Grad Permit Supervisor (supervises this BCBA) / 150 Grad Permit Supervisee (this BCBA supervises them) | Use the production BCBA-to-BCBA association IDs."

**Rule.**

1. **Which Case is a Grad Permit Case.** The BCBA with the Supervising BCBA label (82) on the Case is a holder: any of `ny_bcba_a_grad_permit_holder` = `Yes`, `grad_permit_status` = `Grad Permit`, `lba_licensure__ny` = `Grad Permit`.
   - The supplier text is not compared. Sara's test (supplier differs from the 82 BCBA) is false in production: the supplier equals the holder on 37 of 48 such Cases.
2. **136052 sends** "`<First> <Last>` Grad Permit Holder", with the holder's `first_name` and `last_name`, single spaces, no trailing space.
3. **131308 sends** the holder's supervisor: the BCBA(s) on the holder's 151 association, as "`<First> <Last>` BCBA LBA" (suffix rule in section 3).
   - **No 151 link:** 131308 is left out of the write (not sent, not cleared) and a warning names the role. The holder's own name is never sent as the Supervising BCBA.
4. **When it clears.**
   - 136052 goes blank when the 82 BCBA is no longer a holder, or no BCBA holds 82. The existing clear rule (`src/lib/mappedState.mjs:193-209`) removes only a value the integration wrote, so older hand-entered values stay.
   - 131308 moves from the supervisor to the BCBA's own name at the same moment.

**Limit to state to United Care.** A Case sync starts from a Case change. A change on the BCBA record alone (licence moves from Grad Permit to Yes, or the 151 link changes) does not start one. The Case picks it up at its next sync.

## 3. Supervising BCBA (C12, O-16, Meta 131308)

**Guide.**

- Line 354: "Match the typed supplier to the CR provider by name for billing. Use association 82 for the ongoing assignment and Grad Permit check."
- Line 543: "For the CR Supervising BCBA field itself, Sara wants the typed Ongoing Central Reach Provider Supplier (section 3); use this association to spot grad permit cases. A BCBA marked Outgoing with no removal date is still active (Sara's rule)."

**Evidence (163 visible CR clients, 131308 filled on 118).**

| Form in CR | Count |
|---|---|
| "`<First> <Last>` BCBA LBA" | 62 |
| The same with commas (", BCBA LBA", "BCBA, LBA", ", BCBA, LBA", "BCBA,LBA") | 14 |
| "`<First> <Last>` BCBA" (the name is not a HubSpot BCBA record) | 18 |
| Name only | about 9 |
| Test or placeholder values | about 10 |
| Other ("Graduate Student", a typo) | 2 |

- Every recognised BCBA shown with "BCBA LBA" has `lba_licensure__ny` = `Yes` (76 of 76), apart from one holder.
- Exceptions by staff name: comma forms for Amanda Beckerman, Jessica DeFranco, Tzarina Maratita, Isabel Annibale, Brandi Cedeno, Hejin Lee, Madeline Sell, Jane Barnes; no suffix for Amanda Narra, Gavriella Bohan, Madeline Sell (one client each); "Kiniana Nelus Graduate Student" (a holder typed into the wrong field).
- On the 73 clients linked to one Case, the supplier text is blank on 25 and never carries the credentials.
- "Match to the CR provider by name" cannot be done: the provider list is not visible to the API and 131308 is free text.

**Final rule.** One source of truth: the Case's BCBA associations.

1. **Acting supervising BCBA** = the first of these that is on the Case: Supervising BCBA (82), SUB BCBA (234), Outgoing SUB BCBA (288), Outgoing Supervising BCBA (135). See section 4 for why.
2. **Grad Permit Case** (the 82 BCBA is a holder): send the 151 supervisor instead (section 2.4).
3. **Text:** "`<First> <Last>` BCBA LBA" when that BCBA has `lba_licensure__ny`, `lba_licensure__nj` or `lba_licensure__co` = `Yes`; otherwise "`<First> <Last>` BCBA". Several BCBAs are joined by ", " in record-ID order, as the other staff fields are.
4. **No BCBA in any of the four roles:** fall back to the typed supplier text, as built today. This keeps the 12 of 73 linked clients that have a supplier and no association.
5. **Add the suffix: yes.** Without it the first sync rewrites about 76 hand-entered values only to drop the credentials.

**Assumptions.**

- The suffix rule is proven for New York only. No Colorado or New Jersey client is visible to the API.
- This departs from line 543 (Sara asked for the typed supplier). The reason is section 2.3: the supplier names the holder on Grad Permit Cases.

## 4. Outgoing roles, SUB, On Leave and label 288 (C15, C16)

### 4.1 What the guide says

| Role | Label ID (production) | Guide text | CR target in the guide |
|---|---|---|---|
| Outgoing BT 1 / 2 | 131 / 166 | Line 356: "Outgoing BT 1/2 (131/166) remain active until the removal date passes." Line 552: "Leaving. Still active until a removal date passes." | none recorded |
| Outgoing Supervising BCBA | 135 | Line 547: "Leaving; not the active BCBA." Line 543: "A BCBA marked Outgoing with no removal date is still active (Sara's rule)." Line 357: "Confirm how those statements apply before excluding an outgoing BCBA." | none |
| SUB BCBA | 234 | Line 546: "Covers for a Supervising BCBA on leave (On Leave BCBA = 236). Does CR need the substitute?" Line 357: "SUB BCBA 234 coverage with On Leave BCBA 236 remains open for CR." | open question |
| On Leave BCBA | 236 | Line 546 only (above). | none |
| Outgoing SUB BCBA | 288 | **Not in the guide.** | none |

- CR has no metadata field for any of these roles (59 fields listed live).
- **The guide names no removal-date property.** It says only "the removal date".

### 4.2 Evidence: HubSpot already takes the label off on the date

| | Removal date in the past | Today or later | Blank |
|---|---|---|---|
| Outgoing BT 1 label (131) still on the Case | 0 of 3 | 3 of 4 | 6 of 6 |
| Outgoing Supervising label (135) still on the Case | 4 of 48 | 9 of 10 | 11 of 11 |

- United Care's own automation removes the Outgoing label when the date arrives. The label being on the Case already means "still active".
- Of the 24 Cases with a 135 BCBA, **17 have no 82 BCBA**: the outgoing BCBA is the only supervising BCBA on the Case.
- 6 Cases have an Outgoing BT 1 and no Primary BT 1. Today the code sends a blank BT #1 Name for them while the BT still works the Case.
- Leave Cases (4): the SUB (234) also holds 82 on 2; the SUB holds 234 without 82 on 1; one has 236 with another BCBA on 82.
- Label 288 is on 1 Case (`59418778529`), where another BCBA holds 82.
- `outgoing_sub_bcba_end_date` is described in HubSpot as: "Last day the Outgoing SUB BCBA covers the case … at 11:59 PM the SUB comes off and the On Leave BCBA is the Supervising BCBA again." So an Outgoing SUB is still covering until that date.

### 4.3 Final rule

| Role | Sends | CR field | When |
|---|---|---|---|
| Outgoing BT 1 (131) | The BT's name, joined with Primary BT 1 (76) | BT #1 Name 131313 | While the label is on the Case |
| Outgoing BT 2 (166) | The BT's name, joined with Primary BT 2 (143) | BT #2 Name 138092 | While the label is on the Case |
| SUB BCBA (234) | Name + suffix | Supervising BCBA 131308 | Only when no 82 BCBA is on the Case |
| Outgoing SUB BCBA (288) | Name + suffix | Supervising BCBA 131308 | Only when no 82 and no 234 |
| Outgoing Supervising BCBA (135) | Name + suffix | Supervising BCBA 131308 | Only when no 82, 234 or 288 |
| On Leave BCBA (236) | Nothing | none | Never. The label itself says "inactive". |
| Removal and end dates | Nothing | none | The integration does not read them |

- **This settles the guide's conflict on 135.** With an 82 BCBA on the Case, the outgoing BCBA is "not the active BCBA" (line 547). With none, the outgoing BCBA is "still active" (line 543).
- **No date logic.** The label is the signal, and HubSpot maintains it. A date passing does not start a Case sync anyway; the label change does (the associations are part of the compared state, BR17).
- **Known gap:** 4 Cases keep a 135 label after the date passed. 3 of them have an 82, which wins. 1 would send a stale outgoing name. That is a HubSpot data fix.

### 4.4 The swapped removal-date labels

**What the guide says each property should be: nothing.** The guide never names a removal-date property (lines 356, 357, 543 and 552 say "the removal date" only). OPEN-ITEMS row 7 still lists "which property holds the removal date" as open.

**Production today (Case properties, both date fields, created 2026-07-09).**

| Internal name | Current label | Filled on |
|---|---|---|
| `outgoing_btrbt1_removal_date_2` | "Outgoing BT/RBT**2** Removal Date" | 0 Cases |
| `outgoing_btrbt2_removal_date_2` | "Outgoing BT/RBT**1** Removal Date" | 7 Cases |

- Staff go by the label. All 7 filled values belong with Outgoing BT 1 (3 still hold label 131, 0 hold 166).
- So today the **Outgoing BT 1** date lives in `outgoing_btrbt2_removal_date_2`.

**Recommendation.** Leave both properties alone. Under section 4.3 the integration reads neither.

- Do not swap the labels back: the 7 values, and any workflow that reads the property, would then point at the wrong BT.
- If United Care wants it tidy, add a description to each property saying which BT it holds. Internal names cannot be changed.

Related properties, for reference: `outgoing_supervising_bcba_removal_date` (58 Cases), `outgoing_sub_bcba_end_date` (0), `bcba_leave_date` / `bcba_leave_return_date` (1 each), `outgoing_bcba_end_date` (0, older), `outgoing_btrbt_end_date` (1, older), `primary_btrbt1_removal_date` (6).

### 4.5 Label 288 "Outgoing SUB BCBA": what "handle" means

- The guide does not mention 288. The nearest rules are SUB 234 (open) and Outgoing 135.
- Today 288 is neither a role nor excluded. Like 135, 234 and 236 it is hashed into the compared state, so adding or removing it starts a sync, but it maps to no field.
- **"Handle" should mean:** name it in the portal table as a known role and give it the place in the 131308 order shown in section 4.3 (after SUB, before Outgoing Supervising). It must not be excluded: its removal is the signal that the On Leave BCBA is back.
- Where: `src/lib/config.mjs:107-113` (production) and `:94-100` (sandbox); read in `src/workflows/clientSyncInputs.mjs:38`.

## 5. Code changes

### 5.1 IDs

| Role key (new unless marked) | Production | Sandbox |
|---|---|---|
| `supervisingBcba` (exists, not read today) | 82 | 247 |
| `subBcba` | 234 | 217 |
| `outgoingSubBcba` | **288** | **not known: read it, or create the label** |
| `outgoingSupervisingBcba` | 135 | 253 |
| `onLeaveBcba` (named only, never read) | 236 | 233 |
| `outgoingBt1` | 131 | 244 |
| `outgoingBt2` | 166 | 236 |
| BCBA to BCBA `gradPermitSupervisor` | 151 | 227 |
| BCBA to BCBA `gradPermitSupervisee` (reference only) | 150 | 226 |

Sandbox IDs are from guide lines 975-992. To get the sandbox 288 equivalent: `GET /crm/v4/associations/0-3/2-72890322/labels` in `52311591`. Also check there that `ny_bcba_a_grad_permit_holder` and `grad_permit_status` exist on the sandbox BCBA object.

### 5.2 Changes by file

1. **`src/constants/centralReach.mjs:146`**: add `GRAD_PERMIT_HOLDER: 136052` to `CENTRAL_REACH_CLIENT_METADATA_FIELDS`.
2. **`src/lib/config.mjs:94-100` and `:107-113`**: add the role keys of 5.1 to `staffingRoleAssociationTypeIds`, and a new `gradPermitSupervisorAssociationTypeId` (151 / 227) per portal. Update the comment at lines 84-86. No change to `excludedStaffingAssociationTypeIds`.
3. **`src/workflows/clientSyncInputs.mjs`**:
   - line 38: `BCBA_ROLES` adds `supervisingBcba`, `subBcba`, `outgoingSubBcba`, `outgoingSupervisingBcba`;
   - line 39: `BT_RBT_ROLES` adds `outgoingBt1`, `outgoingBt2`;
   - line 89: the BCBA batch read also asks for `ny_bcba_a_grad_permit_holder`, `grad_permit_status`, `lba_licensure__ny`, `lba_licensure__nj`, `lba_licensure__co` (the BT/RBT read stays `first_name`, `last_name`);
   - new function `readGradPermitSupervisors`: for each 82 BCBA that is a holder, read its BCBA to BCBA associations, keep the 151 rows, and batch-read their names and LBA flags. A failed read stops the run (rule 5.8), as the staff read does;
   - line 125 `omitFieldIdsFor`: add 131308 and 136052 to the fields left out when the staff were not read.
4. **`src/workflows/clientSyncWorkflow.mjs:517-531`**: call the new read after `readStaffNames` and pass its result inside `staffNames`. Both mappings of the run must get the same input (lines 534-540).
5. **`src/mappings/client/buildClientMetadata.mjs`**:
   - lines 290-298: extend the `staffNames` contract. A BCBA entry gains `gradPermitHolder` (true / false), `lba` (true / false) and, for a holder, `supervisors: [{ recordId, firstName, lastName, lba }]`;
   - lines 182-187 `STAFF_ROLE_FIELDS` and 203-222 `staffNameFields`: BT #1 Name joins `primaryBt1` + `outgoingBt1`; BT #2 Name joins `primaryBt2` + `outgoingBt2`;
   - new `supervisingBcbaText(staffNames, supplierText)` (the order and suffix of section 3, the Grad Permit switch of 2.4) and `gradPermitHolderText(staffNames)`;
   - lines 386-389: replace the supplier-only value with `supervisingBcbaText(...)`; add the 136052 key next to it;
   - a holder with no 151 supervisor: leave 131308 out and add a warning `{ code: "grad_permit_supervisor_missing", role: "supervisingBcba" }`, the same shape as `staff_name_unreadable`.
6. **`src/mappings/client/clientProperties.mjs:45`**: no change. `ongoing_central_reach_provider_supplier` stays for the fallback.

### 5.3 Tests to add

| File | Test |
|---|---|
| `src/tests/smoke/stage2PortalAndRetries.test.mjs:245-265` | The portal table holds the new role IDs for both portals; 236 is On Leave BCBA in production and Outgoing BT 2 in the sandbox. |
| `src/tests/smoke/stage4CaseMappings.test.mjs:469-477` | [C12] rewrite: 82 BCBA with LBA sends "First Last BCBA LBA"; without LBA sends "First Last BCBA"; no BCBA role sends the supplier text as typed; `supervising_bcba` text is never read. |
| same file | [C12][C16] order: 82 wins over 234, 288 and 135; 234 alone; 288 alone; 135 alone; 236 alone sends the fallback, never the On Leave name. |
| same file | [C13] holder by each of the three flags sends 136052 "First Last Grad Permit Holder" and 131308 = the 151 supervisor + suffix; a non-holder sends 136052 blank. |
| same file | [C13] holder with no 151 supervisor: 131308 is absent from the values, the warning is returned, 136052 is still sent. |
| same file | [C13] double spaces in a name are collapsed ("Madeline  Sell" in HubSpot). |
| same file | [C15] BT #1 Name joins Primary BT 1 and Outgoing BT 1; Outgoing BT 1 alone still fills the field; the same for BT #2. |
| `src/tests/smoke/laneDCaseReads.test.mjs` | [C13] the worker reads the 151 link only for a holder on 82 and makes no BCBA to BCBA call otherwise; a refused 151 read (403) stops the run with no CR write. |
| same file | [C13] 136052 written before is cleared when the 82 BCBA stops being a holder; a hand-entered value is not. |
| same file | [C16] `staffRecordIdsByRole` returns the new roles; only USER_DEFINED types count. |
| same file | [BR17] removing label 288 (or 131, 135, 234) changes the compared state and the mapped fields in one run. |
| `src/tests/smoke/checkRequirements.test.mjs:43` | C13 row moves from `open` when BUILD-PLAN is updated. |

Sandbox tests need: a holder BCBA with a 227 link, one without; a Case with only an Outgoing BT 1 (244); a Case with only an Outgoing Supervising BCBA (253); a leave Case with SUB (217) and On Leave (233).

## 6. Risks and assumptions

- **First sync overwrites.** 131308 values in comma or name-only form (about 23 visible clients) are rewritten to the standard form. Values on Cases with no BCBA association and no supplier are kept.
- **Extra HubSpot calls.** One more association read and one batch read, only on Grad Permit Cases (48 Case links today).
- **Holders without a supervisor link** (9 BCBAs): their Cases get the marker and no Supervising BCBA from the integration until United Care adds the 151 link.
- **SUB order is a recommendation, not a guide rule.** The guide leaves SUB open (line 546). The order comes from the label names and the HubSpot property descriptions.
- **Colorado and New Jersey** suffixes are not verified against CR.
- **Not verified:** the sandbox ID for Outgoing SUB BCBA; CR values for Zhanna Aminova's Cases.

## 7. Questions for Zeke

1. **Dominique Plummer.** Production shows she is a Grad Permit holder supervised by Amanda Beckerman (section 2.1). Do you agree, or is there a reason to treat her as the supervisor?
2. **Holder flags.** May the code treat any of the three flags as "holder", or will United Care fill `ny_bcba_a_grad_permit_holder` on the 18 holders that lack it so one property decides?
3. **Supplier text.** Sara asked for the typed supplier in 131308 (guide line 543). Is it accepted that the association decides and the supplier is only the fallback?
4. **Sandbox label.** Does "Outgoing SUB BCBA" exist in sandbox `52311591`, and with which type ID?

## 8. Final (after Zeke's feedback), 2026-11-23

Zeke answered the four questions of section 7 on 2026-11-23. This section is the rule to build. Where it differs from sections 1 to 7, this section wins.

**What was read (about 20:00 UTC).**

- HubSpot production `50317927`: GET and CRM search only, portal checked first. Script: `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/gp-final-read.mjs`.
- CentralReach production: one GET for client `5265763` (plus the token POST).
- HubSpot sandbox `52311591`: the association labels, read through the HubSpot connector (`get_user_details` returned account `52311591`).
- **Nothing was written anywhere.** The sandbox label already exists (8.4).

### 8.1 Case `64880905367`: Zeke is right, and so was the earlier finding

| Fact (production) | Value |
|---|---|
| BCBAs on the Case | One: Dominique Plummer `45994302542` |
| Her labels on the Case (Case to BCBA) | **82 Supervising BCBA**, plus the unlabeled 20. From her side: 81 Supervising BCBA, 19 |
| 234 SUB, 288 Outgoing SUB, 135 Outgoing Supervising, 236 On Leave, 86 IA, 145 RE | None on this Case |
| `ongoing_central_reach_provider_supplier` | "Dominique Plummer" (the same person as the 82 BCBA) |
| `supervising_bcba_name` | "Dominique Plummer" |
| Her `ny_bcba_a_grad_permit_holder` / `grad_permit_status` / `lba_licensure__ny` | blank / `Grad Permit` / **blank** |
| Her BCBA to BCBA link | **151** "Grad Permit Supervisor (supervises this BCBA)" to Amanda Beckerman `45942219039`. Read from Amanda: **150** "Grad Permit Supervisee (this BCBA supervises them)" |
| Amanda Beckerman | `lba_licensure__ny` = `Yes`, no Grad Permit flag. She is **not** on this Case |
| CR client `5265763` | **404.** The API user is not connected to this contact, so Meta 136052 and 131308 could not be read |

**Conclusion.**

- **On the Case, Dominique Plummer is the supervisor.** She holds Supervising BCBA (82). Zeke's note is correct.
- **On her own BCBA record, she is a Grad Permit holder.** Amanda Beckerman supervises her (151 from Dominique, 150 from Amanda). She supervises no one.
- **She is both, on two different links.** "Supervising BCBA" is her role on the Case. "Grad Permit holder" is her licence status, recorded between two BCBA records. The guide describes exactly this case (line 504): "the Supervising BCBA is a grad permit holder".
- **This agrees with the earlier finding.** On her other Case `50096197801`, CR holds 136052 = "Dominique Plummer Grad Permit Holder" and 131308 = "Amanda Beckerman BCBA LBA": the holder in one field, the holder's supervisor in the other.
- **The supplier text does not flag this Case.** It equals the 82 BCBA, so Sara's "supplier differs from 82" comparison says "not Grad Permit" here.

### 8.2 Holder test, per the guide

**The guide's definition.**

- Line 504: "when the Ongoing Central Reach Provider Supplier differs from the Supervising BCBA (association 82), the Supervising BCBA is a grad permit holder. Reliable check on the BCBA record: lba_licensure__ny = Grad Permit."
- Line 355 (source column): "82 Supervising BCBA / lba_licensure__ny = Grad Permit".
- Line 405: "Grad Permit → GRAD Student- LBA NY (1092164)" (the same property drives the employee label).

**The exact test.** A Case is a Grad Permit Case when the BCBA holding **Supervising BCBA (82)** on it has **`lba_licensure__ny` = `Grad Permit`** (stored value, exact match). One property, one source.

- **Dropped:** the "any of three flags" test of sections 1 and 2.4. `ny_bcba_a_grad_permit_holder` and `grad_permit_status` are not read.
- **Not used:** the supplier comparison. The guide gives it as Sara's description and names the licence property as the "reliable check". In production the supplier equals the holder on 37 of 48 such Cases.

**What the guide's test misses (production, read 20:00 UTC).**

| | BCBAs | Cases where they hold 82 |
|---|---|---|
| Any of the three flags | 31 | 48 |
| `lba_licensure__ny` = `Grad Permit` (the guide's test) | 28 | 44 (10 of the 28 hold an 82) |
| **Missed** | **3** | **4** |

| Missed BCBA | Flags | Cases as 82 | 151 link |
|---|---|---|---|
| Dominique Plummer `45994302542` | `grad_permit_status` only | 3 (one is `64880905367`) | yes, Amanda Beckerman |
| Katie Vangraefschepe `61130820723` | `grad_permit_status` only | 1 | yes |
| Dijana Dujmovic `65705947956` | `ny_bcba_a_grad_permit_holder` only | 0 | no |

**What happens to a missed holder's Case.** It is treated as a normal Case:

- 136052 is sent blank. A value the integration did not write is left alone (`src/lib/mappedState.mjs:193-209`), so the hand-entered "Dominique Plummer Grad Permit Holder" stays.
- 131308 is sent as the holder's own name, "`Dominique Plummer` BCBA". On Case `50096197801` that **overwrites "Amanda Beckerman BCBA LBA"**.

**The fix is data, not code.** United Care sets `lba_licensure__ny` = `Grad Permit` on the three records before go-live. Then the guide's test finds all 31.

**Also:** 10 of the 28 guide-test holders have no 151 link. Their supervisor is unknown to HubSpot (rule 3 below).

### 8.3 Final rules for 136052 and 131308

| # | Rule |
|---|---|
| 1 | **Holder.** The Case's 82 BCBA has `lba_licensure__ny` = `Grad Permit`. |
| 2 | **136052 Grad Permit.** Holder: "`<First> <Last>` Grad Permit Holder" (the 82 BCBA's `first_name` and `last_name`, single spaces). Not a holder, or no 82 BCBA: blank. |
| 3 | **131308 on a Grad Permit Case.** The BCBA(s) on the holder's **151** link, as "`<First> <Last>` BCBA LBA" (suffix by rule 5). No 151 link: 131308 is left out of the write (not sent, not cleared) with the warning `grad_permit_supervisor_missing`. The holder's own name is never sent. |
| 4 | **131308 on a normal Case** (Zeke: "Yes"). The acting supervising BCBA from the Case associations, the first present of 82, 234, 288, 135. No BCBA in any of the four: the typed supplier (`ongoing_central_reach_provider_supplier`) as typed. |
| 5 | **Suffix.** " BCBA LBA" when that BCBA has `lba_licensure__ny`, `lba_licensure__nj` or `lba_licensure__co` = `Yes`; otherwise " BCBA". Several BCBAs joined by ", " in record-ID order. |
| 6 | **Clearing.** 136052 goes blank, and 131308 returns to the BCBA's own name, at the first Case sync after the 82 BCBA's licence leaves `Grad Permit` or the 82 changes. A BCBA-only change does not start a Case sync. |

On Case `64880905367` today, with Dominique's licence blank: 136052 blank, 131308 "Dominique Plummer BCBA". After the data fix: 136052 "Dominique Plummer Grad Permit Holder", 131308 "Amanda Beckerman BCBA LBA".

**Code changes (replacing the matching lines of 5.2).**

1. `src/constants/centralReach.mjs:146`: add `GRAD_PERMIT_HOLDER: 136052`.
2. `src/lib/config.mjs:94-100` (sandbox) and `:107-113` (production): add `subBcba` 217 / 234, `outgoingSubBcba` **221** / 288, `outgoingSupervisingBcba` 253 / 135, `onLeaveBcba` 233 / 236 (named only), `outgoingBt1` 244 / 131, `outgoingBt2` 236 / 166; add `gradPermitSupervisorAssociationTypeId` 227 / 151. Update the comment at `:84-86`.
3. `src/workflows/clientSyncInputs.mjs`:
   - `:38` `BCBA_ROLES` adds `supervisingBcba`, `subBcba`, `outgoingSubBcba`, `outgoingSupervisingBcba`; `:39` `BT_RBT_ROLES` adds `outgoingBt1`, `outgoingBt2`;
   - `:89` the BCBA batch read asks for `first_name`, `last_name`, `lba_licensure__ny`, `lba_licensure__nj`, `lba_licensure__co`. **Not** `ny_bcba_a_grad_permit_holder` or `grad_permit_status`;
   - new `readGradPermitSupervisors`: only for an 82 BCBA with `lba_licensure__ny` = `Grad Permit`, read its BCBA to BCBA associations, keep type 151, batch-read names and LBA flags. A failed read stops the run;
   - `:125` `omitFieldIdsFor`: add 131308 and 136052.
4. `src/workflows/clientSyncWorkflow.mjs:517-531`: call the new read after `readStaffNames`; both mappings of the run get the same input (`:534-540`).
5. `src/mappings/client/buildClientMetadata.mjs`: `:290-298` a BCBA entry gains `gradPermitHolder`, `lba`, `supervisors`; `:182-187` and `:203-222` join Outgoing BT 1 / 2 into BT #1 / #2 Name; new `supervisingBcbaText` and `gradPermitHolderText`; `:386-389` replace the supplier-only value and add the 136052 key.

**Tests (replacing the two [C13] holder rows of 5.3; the other rows stand).**

| File | Test |
|---|---|
| `src/tests/smoke/stage4CaseMappings.test.mjs` | [C13] 82 BCBA with `lba_licensure__ny` = `Grad Permit`: 136052 = "First Last Grad Permit Holder", 131308 = the 151 supervisor + " BCBA LBA". |
| same file | [C13] 82 BCBA with `grad_permit_status` = `Grad Permit` or `ny_bcba_a_grad_permit_holder` = `Yes` and a blank `lba_licensure__ny` is **not** a holder (neither flag is read): 136052 blank, 131308 = own name + " BCBA LBA". |
| same file | [C13] `lba_licensure__ny` = `Yes`, `In Process` or `No`: not a holder. |
| same file | [C13] holder with no 151 supervisor: 131308 absent, warning returned, 136052 still sent. |
| same file | [C12][C16] order 82, 234, 288, 135; 236 alone sends the supplier fallback. |
| `src/tests/smoke/laneDCaseReads.test.mjs` | [C13] the BCBA to BCBA read happens only for a guide-test holder on 82; a 403 on it stops the run with no CR write. |
| `src/tests/smoke/stage2PortalAndRetries.test.mjs:245-265` | The portal table holds `outgoingSubBcba` 221 (sandbox) and 288 (production). |

### 8.4 Label 288 "Outgoing SUB BCBA"

| | Production `50317927` | Sandbox `52311591` |
|---|---|---|
| Objects | Case `0-3` to BCBA `2-48354212` | Case `0-3` to BCBA `2-72890322` |
| Category | USER_DEFINED | USER_DEFINED |
| Label, Case to BCBA | "Outgoing SUB BCBA" **288** | "Outgoing SUB BCBA" **221** |
| Paired label, BCBA to Case | "Outgoing SUB BCBA" **289** | "Outgoing SUB BCBA" **220** |
| Limit on records per side | not returned by the labels API | none |

- **The label already exists in the sandbox. Nothing was created.**
- The sandbox IDs follow the same pairing as the other roles (SUB 217 / 216, On Leave 233 / 232).
- Guide lines 975-992 do not list it. Add "Case → BCBA · Outgoing SUB BCBA | 288 | 221" at the next guide edit.

### 8.5 Risks and assumptions

- **Assumption:** "match the Google doc" means the licence property of line 504, not the supplier comparison of the same line.
- **Risk:** until the three records are fixed, 4 production Cases lose their Grad Permit handling, and one visible CR value ("Amanda Beckerman BCBA LBA") is overwritten.
- **Not verified:** CR values for `5265763` (404). Whether `lba_licensure__ny` holds the option `Grad Permit` on the sandbox BCBA object.

### 8.6 Question for Zeke

1. The guide's test misses Dominique Plummer, Katie Vangraefschepe and Dijana Dujmovic because `lba_licensure__ny` is blank on their records. Will United Care set it to `Grad Permit` on those three before go-live? Without it, Case `64880905367` itself gets no Grad Permit marker.

### 8.7 Validation

1. HubSpot production: open BCBA `45994302542`; confirm "LBA Licensure - NY" is blank and the association to Amanda Beckerman reads "Grad Permit Supervisor (supervises this BCBA)".
2. Sandbox: Settings > Objects > Cases > Associations > BCBA shows "Outgoing SUB BCBA"; `GET /crm/v4/associations/0-3/2-72890322/labels` returns typeId 221.
3. Sandbox test (C13): a BCBA with `lba_licensure__ny` = `Grad Permit` and a 227 link, on a Case as 247; expect 136052 and 131308 as in rules 2 and 3.

## 9. What sets lba_licensure__ny (production read), 2026-11-23

Zeke asked (2026-11-23), about the three holders that the guide's test misses: "Read the production account and see what set that."

**What was read (about 20:25 UTC).**

- HubSpot production `50317927`: GET and CRM search only, portal checked first. Property definitions, and `propertiesWithHistory` for `lba_licensure__ny`, `grad_permit_status` and `ny_bcba_a_grad_permit_holder` on all 31 holder records, plus `contact_category` history on five staff Contacts. Scripts: `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/gp-source-read.mjs` and `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/gp-source-users.mjs`.
- CentralReach production: GET of the employee list and labels (plus the token POST). Script: `/private/tmp/claude-501/-Users-zeke-Desktop-projects-client-projects-Optidge-azure-central-reach/0cfa2d79-33b0-4e21-bad0-7661476c4f5e/scratchpad/gp-source-cr.mjs`.
- **Not readable with the production token:** workflows (`/automation/v4/flows` and `/automation/v3/workflows` return 403, no automation scope) and user names (`/settings/v3/users`, `/crm/v3/owners`, the Users object all return 403). Workflows are known only by their enrollment IDs, and users by their user IDs.
- **Nothing was written anywhere.**

### 9.1 Short answer

- **People set it, by hand, in the record screen.** On 24 of the 28 guide-test holders the current `lba_licensure__ny` = `Grad Permit` came from `CRM_UI` (users `87217091`, `82796075`, `84500585`, `82795994`, `28317035`).
- **Since 22 October a workflow also copies it** from `grad_permit_status`: when someone sets `grad_permit_status` = `Grad Permit`, an automation sets `lba_licensure__ny` = `Grad Permit` 9 to 23 seconds later. It set the value on the other 4 holders.
- **The workflow only reacts to a change.** It does not touch records whose `grad_permit_status` was set before it existed, and it does not undo a hand edit that clears `lba_licensure__ny` later.
- **Of the three "missed" holders, two are real misses and one is a stale flag.** Dominique Plummer and Katie Vangraefschepe had `grad_permit_status` set before the copy existed. Dijana Dujmovic had both values cleared by hand on 16 November; only `ny_bcba_a_grad_permit_holder` = `Yes` is left.

### 9.2 Property definitions (BCBA `2-48354212`)

| Property | Label | Type | Options (value) | Group | Created / updated | Calculated, read-only |
|---|---|---|---|---|---|---|
| `lba_licensure__ny` | "🦄LBA Licensure - NY" | enumeration / select | `Yes`, `In Process`, `No` (label "Will Apply"), `Grad Permit` | `lba` | 2026-03-20 (user `28317035`) / 2026-06-01 (user `82795994`) | no, no |
| `grad_permit_status` | "🦄ᴼᴿ🤖Grad Permit Status" | enumeration / select | `Grad Permit`, `NA` | `bcbas_information` | 2026-07-07 / 2026-10-22 (both user `82795994`) | no, no |
| `ny_bcba_a_grad_permit_holder` | "(NY) BCBA a Grad Permit Holder?" | enumeration / select | `Yes`, `NA` | `bcbas_information` | 2026-10-18 / 2026-10-18 (user `82795994`) | no, no |

- None has a description.
- **None is a property sync.** All three accept writes (`readOnlyValue` false, `calculated` false). Guide line 470 notes that synced fields reject writes.
- **The Contact has no matching property.** Its only Grad Permit value is the `contact_category` option `Grad Permit`. `applicant_grad_permit_bcba` (Apploi group) exists on both objects but is not one of the three flags.
- The 🤖 in the `grad_permit_status` label suggests that a workflow may also set it. That matches 9.4.

### 9.3 Who set each value: the three missed holders

| BCBA | Property | When (UTC) | Value | Source | Set by |
|---|---|---|---|---|---|
| **Dominique Plummer** `45994302542` | `lba_licensure__ny` | 2026-05-27 13:59 | `Grad Permit` | CRM_UI | user `82796075` |
| | `lba_licensure__ny` | **2026-06-01 15:53** | **blank** | CRM_UI | user `86873814` |
| | `grad_permit_status` | 2026-07-07 15:58 | `Grad Permit` | CRM_UI | user `82795994` |
| | `ny_bcba_a_grad_permit_holder` | never set | | | |
| | Contact `contact_category` | 2026-05-27 to 06-03 | `Grad Permit` (automation, 05-27), then `BCBA` / `Grad Permit` twice by hand, now `Grad Permit` | AUTOMATION_PLATFORM, CRM_UI | user `86873814` |
| **Katie Vangraefschepe** `61130820723` | `lba_licensure__ny` | never set | | | |
| | `grad_permit_status` | **2026-10-20 15:50** | `Grad Permit` | CRM_UI | user `82796075` |
| | `ny_bcba_a_grad_permit_holder` | never set | | | |
| | Contact `contact_category` | 2026-10-14 | `Grad Permit` | CRM_UI | user `86873814` |
| **Dijana Dujmovic** `65705947956` | `grad_permit_status` | 2026-11-04 19:27:41 | `Grad Permit` | CRM_UI | user `92992146` |
| | `lba_licensure__ny` | 2026-11-04 19:27:58 | `Grad Permit` | **AUTOMATION_PLATFORM** | enrollment `2949201530775`, action 0 |
| | `ny_bcba_a_grad_permit_holder` | 2026-11-04 19:28:03 | `Yes` | AUTOMATION_PLATFORM | enrollment `2948969395289`, action 1 |
| | `grad_permit_status` | **2026-11-16 16:25** | **blank** | CRM_UI | user `87217091` |
| | `lba_licensure__ny` | **2026-11-16 16:28** | **blank** | CRM_UI | user `87217091` |
| | Contact `contact_category` | 10-29 `BT/RBT` (automation), 11-04 `Grad Permit` (automation), **11-20 blank** | | CRM_UI | user `86873814` |

### 9.4 Who set each value: five holders the test finds (and the pattern across all 28)

| BCBA | `lba_licensure__ny` = `Grad Permit` | `grad_permit_status` = `Grad Permit` | `ny_bcba_a_grad_permit_holder` = `Yes` |
|---|---|---|---|
| Zhanna Aminova `59730424341` | 08-04 20:27, CRM_UI, user `87217091` | 08-04 20:23, CRM_UI, user `87217091` | 10-27, CRM_UI, user `86873814` |
| Mona Sleiman `49444943955` | 03-20 `No`, 06-11 `Grad Permit`, 06-19 blank then `Grad Permit` again: all CRM_UI (users `87217091`, `82795994`) | 07-07, CRM_UI, user `82795994` | never set |
| Perel Englander `58090044058` | 06-30, CRM_UI, user `87217091` | never set | never set |
| Yael Brizard `60455522203` | 08-18 14:55:45, CRM_UI, user `87217091` | 08-18 14:56:38, **AUTOMATION_PLATFORM**, action 0 | never set |
| Shelby Caprood `65890866531` | 11-17 15:53:22, CRM_UI, user `87217091` | 11-17 15:53:17, CRM_UI, user `87217091` | 11-17 15:53:26, **AUTOMATION_PLATFORM**, action 1 |
| Kate Lee `64389277360` (extra) | 10-22 19:30:04, **AUTOMATION_PLATFORM**, action 0 | 10-22 19:29:49, CRM_UI, user `87217091` | 10-22 19:30:34, AUTOMATION_PLATFORM, action 1 |

**Source of the current value, all 31 holders:**

| Property | CRM_UI | AUTOMATION_PLATFORM | INTEGRATION |
|---|---|---|---|
| `lba_licensure__ny` = `Grad Permit` (28) | 24 | 4 (Kate Lee, Anthony Castaneda, Summer Vang, Nematou Sore) | 0 |
| `grad_permit_status` = `Grad Permit` (28) | 24 | 3 (Yael Brizard, Test Jcb, Liza Valle) | 1 (Saratest Gluck, app `32271165`) |
| `ny_bcba_a_grad_permit_holder` = `Yes` (13) | 1 | 12 | 0 |

**Three automated behaviours, inferred from the timing (the workflows could not be read):**

| | Trigger seen | Writes | Seen from / to | Records |
|---|---|---|---|---|
| A | `lba_licensure__ny` set to `Grad Permit` by hand | `grad_permit_status` = `Grad Permit`, 2 to 53 s later, action 0 | 2026-08-18 to 2026-10-18 | Yael Brizard, Test Jcb, Saratest Gluck, Liza Valle |
| **B** | `grad_permit_status` set to `Grad Permit` by hand | **`lba_licensure__ny` = `Grad Permit`**, 9 to 23 s later, action 0 | **2026-10-22** to 2026-11-13 | Kate Lee, Anthony Castaneda, Dijana Dujmovic, Summer Vang, Nematou Sore |
| C | a Grad Permit value set | `ny_bcba_a_grad_permit_holder` = `Yes`, seconds later, action 1 | 2026-10-22 to 2026-11-18 | 12 records |

- When a person sets both properties by hand (24 records), the workflow writes the same value again and HubSpot records no new history. So A or B may have run on more records than the table shows.
- **A and B may be one workflow or two.** The enrollment IDs differ per write, and the token cannot read workflows.
- On 07-07 user `82795994` set `grad_permit_status` by hand on 7 holders that already had (or once had) `lba_licensure__ny` = `Grad Permit`. This was the day the property was created, so it looks like a one-time backfill. Dominique Plummer was one of the 7.

### 9.5 Why the three are missing it

| BCBA | Why `lba_licensure__ny` is blank | Still a holder? |
|---|---|---|
| Dominique Plummer | Set on 05-27, then **cleared by hand on 06-01** by user `86873814`. `grad_permit_status` was set on 07-07, more than three months before copy B first ran (10-22). It has not changed since, so B never fired for her. | **Yes.** `grad_permit_status` = `Grad Permit`, Contact `contact_category` = `Grad Permit` (last set 06-03), a 151 link to Amanda Beckerman (8.1), and CR 136052 = "Dominique Plummer Grad Permit Holder" on Case `50096197801` (section 2). |
| Katie Vangraefschepe | `grad_permit_status` was set by hand on **10-20**, two days before copy B first ran. Nobody set `lba_licensure__ny`. | **Yes.** `contact_category` = `Grad Permit` (10-14) and a 151 link (8.2). |
| Dijana Dujmovic | Copy B **did** set it on 11-04. User `87217091` **cleared it and `grad_permit_status` by hand on 11-16**, and user `86873814` cleared `contact_category` on 11-20. Nothing clears `ny_bcba_a_grad_permit_holder`, so that `Yes` is left over. | **Probably not.** Every Grad Permit value except the leftover flag was removed by hand. She holds no Case as 82 and has no 151 link. Her Contact was `BT/RBT` before 11-04. |

**So the guide's test misses 2 holders and 4 Cases, not 3 holders.** On Dijana, the test is already right: she is excluded.

**CentralReach could not confirm.** None of the three is among the 910 employees the API user can list (no match by Workday ID, employee ID or name), so their GRAD Student- LBA NY (1092164) label could not be read.

### 9.6 Recommendation

**The fix is two hand edits, done by United Care or Zeke in production (never by us).**

1. Set `lba_licensure__ny` = `Grad Permit` on **Dominique Plummer** `45994302542` and **Katie Vangraefschepe** `61130820723`. Then the guide's test finds every current holder. No code change, and no new workflow: copy B already covers new holders.
2. **Dijana Dujmovic** `65705947956`: if United Care confirms she is not a Grad Permit holder, set `ny_bcba_a_grad_permit_holder` to blank or `NA`. This does not affect the integration (the code does not read that flag, 8.2). It only removes a misleading value.
3. **Before go-live, and after:** a saved BCBA view with `grad_permit_status` = `Grad Permit` AND `lba_licensure__ny` is not `Grad Permit`. It should show 0 records. This catches the Dominique pattern (a hand edit that clears `lba_licensure__ny` after the copy ran).

**Not recommended:** re-enrolling existing records in workflow B. It is one setting, but it needs someone to find the workflow and confirm what else it does (A and C may be the same workflow). Two hand edits are simpler and easier to check.

**Replaces question 8.6.** That question now covers two records, not three.

### 9.7 Assumptions

- `AUTOMATION_PLATFORM` with an `enrollmentId` is a HubSpot workflow. Behaviours A, B and C are inferred from timing and action order. Their names, triggers and other actions were not read (403).
- Behaviour B is still on. The last write seen was 2026-11-13 (Nematou Sore). Later holders (Shelby Caprood, Ambria Helmer, Yasmine Abou Elseoud) had both values set by hand, so B's write left no history.
- Dominique Plummer and Katie Vangraefschepe are current holders (evidence in 9.5). The clear on 06-01 is treated as a mistake, because user `86873814` set her `contact_category` back to `Grad Permit` two days later.
- Dijana Dujmovic is not a holder, because the values were removed by hand.
- The staff behind user IDs `82795994`, `82796075`, `84500585`, `86873814`, `87217091`, `92992146` and `28317035` are United Care or Optidge users. Their names could not be read (403).

### 9.8 Open questions for Zeke

1. **Dijana Dujmovic.** Is she a Grad Permit holder? United Care cleared her values on 11-16 and 11-20, but `ny_bcba_a_grad_permit_holder` = `Yes` is still set. If she is not a holder, United Care clears that flag. If she is, United Care sets `lba_licensure__ny` and `grad_permit_status` back to `Grad Permit`.
2. **Who makes the two edits** on Dominique Plummer and Katie Vangraefschepe (United Care or you), and by when?

### 9.9 Validation

1. In production, open BCBA `45994302542` and view the property history of "LBA Licensure - NY". The 06-01 entry shows who cleared it. The workflow name for any automated entry (for example Dijana Dujmovic's of 11-04) appears in the same view. Our token cannot read it.
2. After the edits, the BCBA search `lba_licensure__ny` = `Grad Permit` returns 30. The view in 9.6 step 3 returns 0. The holder count by any flag returns 30 if Dijana's flag is cleared.
3. Case `64880905367`: after the edit, the integration's dry run gives 136052 "Dominique Plummer Grad Permit Holder" and 131308 "Amanda Beckerman BCBA LBA" (8.3).
