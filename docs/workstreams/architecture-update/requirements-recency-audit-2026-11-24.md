# Requirements recency audit (2026-11-24)

Independent, read-only audit. No HubSpot, CentralReach, Azure or Google call was made, no git state was changed, and no file other than this one was written. Guide = `guide-extract-2026-11-24.md` (L = line). BP = `BUILD-PLAN.md` (dN = decision N). PKG = `BUILD-PACKAGE-DRAFT-2026-11-23.md`. HO = `SANDBOX-TESTING-HANDOFF.md`, "State at 2026-11-24". WT = working-tree `src/` (the pending build). Review files are under `requirements-review-2026-11-24/`. M = `sandbox-test-matrix.md`. RS = `sandbox-rounds/retest-run-sheet-2026-11-24.md`. Ledger = `sandbox-coverage-ledger-2026-11-24.md`.

## Summary

1. **Overrides listed.** 409 are listed in table 1: 314 dated guide notes or dated-block lines, 60 BUILD-PLAN decisions, and 35 package and handoff rulings. The audit found **297 stale readings** (table 2). 295 are in the 10 audited files and 2 are in the two sandbox scripts the matrix relies on:
   - 135 false gaps or false BLOCKED rows;
   - 84 stale wordings;
   - 32 tests of a retired rule;
   - 32 wrong expected values;
   - 14 missing tests for the current rule.

   Section 2.7 lists the stale text in the source documents themselves.
2. **Most of the staleness comes from three late changes:**
   - **The Guardian path.** It still runs through the Contact workflow and fan-out (O-21), even though the Guardian name, email and phone have been Case property-sync fields since 11/09.
   - **Zeke's answers of 11/24 afternoon.** These settled O-52 to O-60, items 2, 3, 6 and 8, rule 7, and master questions 10–38. The review predates them, and BUILD-PLAN does too.
   - **Decision 55 and its confirmation.** Decision 55 replaced the guide's typed-supplier and removal-date rules, and Zeke confirmed it on 11/24 ("these rules are rig").
3. **Contact workflow.** For the Guardian fields, no current source still needs a separate HubSpot Contact workflow. The integration reads no Contact value, and a Guardian edit reaches it through the Case: the Case workflow, the poller or the sweep. Two things are still unproven:
   - Zeke has not said in his own words that O-21 is superseded.
   - Two HubSpot behaviours have not been seen live: whether a property-sync change fires the Case workflow, and whether it moves the Case's `hs_lastmodifieddate`.

   **Rows wrongly marked BLOCKED:**
   - 29 slice rows with Status BLOCKED, 3 of them on O-21;
   - 12 ledger lines in the BLOCKED class, 3 of them on O-21;
   - 26 more rows or steps tagged "BLOCKED on O-21 if no Contact webhook": 18 ledger lines, 5 matrix rows and 3 run-sheet steps.

**One correction to the digest the checkers used.** I wrote that Salaried (O-27) was still open. It is not. PKG L715 records Zeke's answer: "salaried is a label in central reach". The E10 sentence, "Irrelevant. Remove from the doc", removed only the question about the label on test client 5384589 (PKG L716). Matrix B10 and BL rows that test label 1132653 are current. BP O-27, B10 "Waits on" and A-12 are stale.

**How to read the precedence.**
- Within the guide, the latest dated note on a point wins.
- Repo decisions of 11/20–11/24 win over the guide, because the guide has no text dated after 11/20.
- Zeke's answers of 11/24 afternoon (PKG "seventh set", HO L16–31) win over BP. BP was last edited at 10:53 that day.
- Where the WT matches the newest decision, the WT is the current requirement. This was checked for each 11/24-afternoon item: rule 7 (`buildClientMetadata.mjs:378-391`), the blank supplier (`:444-451`), junk Address 2 (`:254-268`), item 6 (`:471-516`, `clientProperties.mjs:85-92`), Allergies and Severity (`:139-163`), and option (a) (`mappedState.mjs:292-357`).

---

## Table 1. Every override (oldest source first within each part)

### 1a. Dated guide notes, and lines inside the dated blocks G17–G20 (L180–965, Change Log L1284–1612)

Generated line by line. Each dated fragment of a line is its own row. Lines inside G17–G20 with no date of their own carry the block date, marked "(block)". Author is the name at the start of the fragment, otherwise the block's author ("—" = undated author). Excerpts are capped at about 230 characters; read the guide line for the full note. The section codes are the guide's.

| # | Guide line | Date | Author | Section | Row / field | What the note says now (excerpt) |
|---|---|---|---|---|---|---|
| G001 | L186 | October 22 | Sara | ? | Prepared for Zeke Swanson by Optidge (Da | October 22, 2026: updated with Sara Gluck's answers of |
| G002 | L186 | Oct 22 | — | ? | Prepared for Zeke Swanson by Optidge (Da | Oct 22. Every HubSpot name in this document was read from the live portal (50317927). HubSpot sandbox 52311591 is the active sandbox. Zeke is currently creating the workflows there. See [SCURRENT] for the environment-specific ID c… |
| G003 | L188 | 11/16 | Zeke | ? | 11/16 - this will be updated a later Dat | 11/16 - this will be updated a later Date - Zeke / Sara’s Metadata Workbook |
| G004 | L192 | 11/20 | Zeke | G20 | 11/20 — Sandbox test record requirements | 11/20 — Sandbox test record requirements (Zeke) |
| G005 | L196 | 11/20 (block) | Zeke | G20 | Each round: every sandbox round creates  | Each round: every sandbox round creates a new Case, a new BT/RBT and a new BCBA. Rounds start at 1 and go up by one. A round is never reused. CentralReach has no sandbox, so a create in a round writes a real client or employee in … |
| G006 | L198 | 11/20 (block) | Zeke | G20 | On every record: Sandbox Test Field = Ye | On every record: Sandbox Test Field = Yes (sandbox_test_field = true), set when the record is created and not after. This puts the record in list 1463 (Deals), 1464 (BCBAs) or 1465 (BT/RBTs). A record without it is skipped and tes… |
| G007 | L200 | 11/20 (block) | Zeke | G20 | Placeholders: N is the round number (rou | Placeholders: N is the round number (round 1 is 1). NN is the same number in two digits (round 1 is 01). |
| G008 | L202 | 11/20 (block) | Zeke | G20 | State by round: one state per round, the | State by round: one state per round, the same on all three records. Round 1 is New York, round 2 is Colorado, round 3 is New Jersey, then the order repeats. Pick the HubSpot option with the full state name. A full pass needs at le… |
| G009 | L204 | 11/20 (block) | Zeke | G20 | Case (Deal): dealname = CR Azure Test #N | Case (Deal): dealname = CR Azure Test #N. phi_first_name__cloned_ = Zeke. phi_last_name = Swanson Azure Test #N. phi_date_of_birth = any valid date, for example 1990-01-15 (a create requires it). guardian_first_name = Don Azure Te… |
| G010 | L206 | 11/20 (block) | Zeke | G20 | BT/RBT: first_name = Jane. last_name = S | BT/RBT: first_name = Jane. last_name = Swanson Azure Test #N. bt_name = Jane Swanson Azure Test #N (must be unique). email = zeke+bt_azure_test_N@optidge.com (its own address, not shared with the Case). date_of_birth = any valid d… |
| G011 | L208 | 11/20 (block) | Zeke | G20 | BCBA: first_name = Zeke. last_name = Swa | BCBA: first_name = Zeke. last_name = Swanson BCBA Azure Test #N. bcba_name = Zeke Swanson BCBA Azure Test #N (must be unique). ucaba_email_address = zeke_work_email+azure_test_N@optidge.com (the required primary email). email = ze… |
| G012 | L210 | 11/20 (block) | Zeke | G20 | Workday ID: a test value is never a real | Workday ID: a test value is never a real Workday ID, because CentralReach keeps an External System ID for good. Temporary-ID test: workday_id is blank. Workday ID test: AZTEST-N-BT on the BT/RBT and AZTEST-N-BCBA on the BCBA, new … |
| G013 | L212 | 11/20 (block) | Zeke | G20 | After each round: Zeke makes the round's | After each round: Zeke makes the round's client and two employees inactive on the CentralReach screen. The HubSpot record ID, the CentralReach contact ID and the inactive date for each record go in docs/workstreams/architecture-up… |
| G014 | L214 | 11/20 (block) | Zeke | G20 | Not tested yet: whether CentralReach acc | Not tested yet: whether CentralReach accepts # in a name. If a create is rejected for the name, drop the # and note it here. |
| G015 | L216 | 11/19 | United Care | G19 | 11/19 — Updates from United Care | 11/19 — Updates from United Care |
| G016 | L218 | 11/19 | Zeke | G19 | Agent context [G19] · 11/19 United Care  | 11/19 United Care communication, with Zeke's |
| G017 | L218 | 11/20 | United Care | G19 | Agent context [G19] · 11/19 United Care  | 11/20 check of the CentralReach label list. This wins over the six-label staffing list from |
| G018 | L218 | 11/14 | United Care | G19 | Agent context [G19] · 11/19 United Care  | 11/14 and |
| G019 | L218 | 11/18 | United Care | G19 | Agent context [G19] · 11/19 United Care  | 11/18, and over any line that says skip New Mexico and Virginia, where they conflict. The note as received is in the Change Log [C19]. |
| G020 | L220 | 11/18 | United Care | G19 | Staffing labels that stay in CentralReac | 11/18 label read: 97151 Services 1156743, Staffed 97153 1156746, X 97153 1156747. They are client staffing labels under Staffing Status 1156741, not employee labels. Nothing is sent for them until the CentralReach label-replacemen… |
| G021 | L222 | 11/19 (block) | Zeke | G19 | Labels Zeke is removing, per Sara: Pendi | Labels Zeke is removing, per Sara: Pending 97151 Services 1156742, Pending 97153 Services 1156744, and Starting 97153 Services 1156745. Do not create them, do not send them, and do not require them. |
| G022 | L224 | 11/20 | Zeke | G19 | 11/20 — Zeke: 97151 Services, Staffed 97 | 11/20 — Zeke: 97151 Services, Staffed 97153, and X 97153 are not on the All Employees list. They were removed from that employee view. Do not add them under All Employees. |
| G023 | L226 | 11/19 (block) | United Care | G19 | No payor tags in CentralReach for now. D | No payor tags in CentralReach for now. Do not send the client funding-source labels in [G07C]. BCBA credential labels in section 8 were not named in this note. |
| G024 | L228 | 11/19 (block) | United Care | G19 | Hot Lead, Warm Lead, and Cold Lead: keep | Hot Lead, Warm Lead, and Cold Lead: keep as is. They stay in HubSpot and are not sent to CentralReach. |
| G025 | L230 | 11/19 (block) | United Care | G19 | 1 PM switch to Staffed 97153: keep as is | 1 PM switch to Staffed 97153: keep as is. It runs at 1 PM Eastern and it applies to every case. The integration does not rebuild that schedule. |
| G026 | L232 | 11/19 (block) | United Care | G19 | Parent/Guardian: send the first Parent/G | Parent/Guardian: send the first Parent/Guardian contact on the Case to CentralReach. Association type stays Case to Contact typeId 3. If more than one contact has that category, only the first is sent. |
| G027 | L234 | 11/20 | United Care | G19 | New Mexico and Virginia: Zeke added the  | 11/20: NM Employee and VA Employee. The same list shows Admin, CO Employee, NJ Employee, and NY Employee. New Mexico and Virginia are not being used yet, so no HubSpot internal field values are required. Do not invent a property o… |
| G028 | L236 | 11/18 | Danny | G18 | 11/18 — Updates from Danny | 11/18 — Updates from Danny |
| G029 | L238 | 11/18 | Danny | G18 | Agent context [G18] · Use for the plan D | 11/18, the Workday ID alert workflow and the questions open with United Care. The build rules stay in [G17]. See Danny's original |
| G030 | L238 | 11/18 | Danny | G18 | Agent context [G18] · Use for the plan D | 11/18 message in the Change Log [C18]. |
| G031 | L240 | 11/18 | Sara | G18 | Danny's 11/18 message to Sara. It gives  | 11/18 message to Sara. It gives United Care the temporary External System ID plan recorded in [G17] and describes the Workday ID alerts he built in HubSpot. No mapping or rule in [G17] changes. |
| G032 | L242 | 11/17 | Danny | G18 | Plan sent to United Care (Danny): when a | 11/17 rules in [G17]. |
| G033 | L244 | 11/18 (block) | Danny | G18 | Workday ID alerts (Danny; built in produ | Workday ID alerts (Danny; built in production HubSpot, switched off until Sara answers): workflow Workday ID + CR External System ID alerts (1929214033, portal 50317927), described for BT/RBT. 1 hour after Entered in Workday is se… |
| G034 | L246 | 11/18 | Zeke | G18 | New HubSpot field (Danny): Entered in Wo | 11/18 — Zeke: the property exists in production (created |
| G035 | L246 | 11/18 | Danny | G18 | New HubSpot field (Danny): Entered in Wo | 11/18); BCBA has no such field. The integration does not read it. |
| G036 | L248 | 11/18 (block) | Danny | G18 | BCBA (open): Danny's message says the pl | BCBA (open): Danny's message says the plan applies to BCBAs too, and asks Sara whether BCBAs follow the same steps and get the same alerts. BCBA uses entered_in_ucaba_payroll_system (label Entered in Workday) and bcba_in_cr_checkl… |
| G037 | L250 | 11/18 (block) | Danny | G18 | Create signal (open): the integration cr | Create signal (open): the integration creates the employee when Entered in CentralReach = Yes. Because staff will no longer enter employees in CR by hand, Danny asked Sara whether that is still the right step, or whether an earlie… |
| G038 | L252 | 11/18 | Danny | G18 | Counts from Danny, 11/18: 3 BTs marked E | 11/18: 3 BTs marked Entered in Workday have no Workday ID, and 264 do not have External System ID (Workday) checked. |
| G039 | L252 | 11/18 | Zeke | G18 | Counts from Danny, 11/18: 3 BTs marked E | 11/18 — Zeke, to be decided for production: if the Workday ID alerts cover BTs already in Workday, staff may tick External System ID (Workday) on up to 264 existing records. Once the checklist trigger exists in production, each ti… |
| G040 | L254 | 11/18 | Danny | G18 | Open with United Care: the seven questio | 11/18 item). |
| G041 | L256 | 11/18 | Danny | G18 | Staffing labels (Zeke, 11/18): the six s | 11/18): the six staffing labels are created in CR under the parent label Staffing Status (1156741). The label IDs are in section 7. They are not in the integration code yet. |
| G042 | L256 | 11/18 | Zeke | G18 | Staffing labels (Zeke, 11/18): the six s | 11/18 — Zeke: correction and decision. The six IDs and the parent ID 1156741 are in the integration code as constants only (src/constants/centralReach.mjs). Nothing reads them and nothing is sent to CR yet. The staffing label row … |
| G043 | L258 | 11/18 | Danny | G18 | Sandbox testing plan (Zeke, 11/18): afte | 11/18): after the architecture build is done, a final sandbox testing requirements plan is written and agreed before sandbox testing. The test script in the repo build plan (docs/workstreams/architecture-update/BUILD-PLAN.md) is a… |
| G044 | L260 | 11/17 | Danny and Zeke | G17 | 11/17 — Updates from Danny and Zeke | 11/17 — Updates from Danny and Zeke |
| G045 | L262 | 11/17 | Danny | G17 | Agent context [G17] · Use for the Workda | 11/17 decisions. See Danny's original |
| G046 | L262 | 11/17 | Danny and Zeke | G17 | Agent context [G17] · Use for the Workda | 11/17 message in the Change Log [C17]. |
| G047 | L264 | 11/17 | Zeke | G17 | Danny's 11/17 answer on the Workday ID,  | 11/17 answer on the Workday ID, and Zeke's decisions of the same day. They apply to BCBA and BT/RBT unless a line says otherwise. The External System ID rows in the entity requirement tables below carry the same rule. |
| G048 | L266 | 11/17 | Zeke | G17 | ID mapping (Danny and Zeke, confirmed):  | 11/17 — Zeke, for now: on a create the integration sends HubSpot workday_id as the External System ID when it is filled, and the HubSpot record ID as a temporary External System ID when it is not; staff then replace the temporary … |
| G049 | L268 | 11/17 | Danny and Zeke | G17 | HubSpot external_system_id is not a sour | 11/17 shows its 79 BT/RBT values were typed in HubSpot, not synced from CR. 77 equal workday_id and 2 do not. The integration does not read this property. |
| G050 | L270 | 11/17 | Danny | G17 | Employee create without a Workday ID (Un | 11/17; replaces Danny's hold for now): United Care creates a BT/RBT in CR before Workday, so the create cannot wait for the Workday ID. The integration creates the employee when Entered in CentralReach is set, using the HubSpot re… |
| G051 | L270 | 11/17 | Danny and Zeke | G17 | Employee create without a Workday ID (Un | 11/17: CR rejects an employee create with an empty External System ID; the API cannot change the ID afterwards (tested |
| G052 | L270 | 11/16 | Danny and Zeke | G17 | Employee create without a Workday ID (Un | 11/16); a person can change it on the CR profile (tested on a test client and a test employee). Danny's |
| G053 | L270 | 11/17 | Danny and Zeke | G17 | Employee create without a Workday ID (Un | 11/17 count, for context: 9 of the 89 BTs marked Entered in CentralReach = Yes since August have no Workday ID yet. |
| G054 | L272 | 11/18 | Zeke | G17 | After the Workday ID is entered (planned | 11/18 — Zeke: the properties the integration reads for this check. BT/RBT: btrbt_in_cr_checklist. BCBA: bcba_in_cr_checklist. On both, the option shown as External System ID (Workday) is stored as External System ID. The integrati… |
| G055 | L274 | 11/17 (block) | Zeke | G17 | Sync status values (Zeke, for now): last | Sync status values (Zeke, for now): last_sync_status is success, error or waiting. error means a person needs to act; it is the failures report. waiting means the record is held on purpose, with the reason in last_sync_error, for … |
| G056 | L276 | 11/18 | Zeke | G17 | ID mismatch (Zeke, for now): when a link | 11/18 — Zeke: temporary External System ID, status and update rules. They are the same for BT/RBT and BCBA, and they replace the wording above and in the architecture tab where they differ. (1) A create that sends the HubSpot reco… |
| G057 | L276 | 11/18 | Zeke | G17 | ID mismatch (Zeke, for now): when a link | 11/18 — Zeke: the Case check, as it can be built. A read-only check on |
| G058 | L276 | 11/18 | Danny and Zeke | G17 | ID mismatch (Zeke, for now): when a link | 11/18 (100 of the 475 production Cases with a CR Client ID) showed that the CR client read does not return the External System ID, and that none of the sampled clients holds its Case record ID. So the integration looks the client … |
| G059 | L278 | 11/17 | Danny and Zeke | G17 | One Workday ID per HubSpot employee reco | 11/17): confirm whether CR can hold two employees with the same Workday ID, or decide a solution; see section 10. Proposed, not decided: a record that resolves to a CR employee another HubSpot record already holds is marked error … |
| G060 | L278 | 11/18 | Zeke | G17 | One Workday ID per HubSpot employee reco | 11/18 — Zeke: lookup before an employee create. The integration looks CR up by the HubSpot record ID, and also by workday_id when it is filled. Both are read-only. Nothing found → create. Found by the HubSpot record ID → this reco… |
| G061 | L278 | 11/18 | Danny and Zeke | G17 | One Workday ID per HubSpot employee reco | 11/18) and replaces "Proposed, not decided" above. Found by workday_id only, and no HubSpot record holds that CR employee → an employee who is already in CR: no link, no CR write, last_sync_status = waiting, until United Care conf… |
| G062 | L280 | 11/17 | Danny and Zeke | G17 | Employees already in CentralReach (Zeke) | 11/17). |
| G063 | L280 | 11/18 | Zeke | G17 | Employees already in CentralReach (Zeke) | 11/18 — Zeke: how existing employees are kept out. The integration has a record gate: one app setting names a HubSpot checkbox, and a record syncs only when that checkbox is true on it. In production the checkbox is set only on co… |
| G064 | L282 | 11/17 | Danny and Zeke | G17 | Sandbox testing (Zeke, set up 11/17): ev | 11/17): every sandbox workflow that sends a webhook to Azure is gated by a segment of test records in portal 52311591: Sandbox Test - Deals (list 1463), Sandbox Test - BCBAs (list 1464) and Sandbox Test - BT/RBTs (list 1465). Only… |
| G065 | L282 | 11/18 | Zeke | G17 | Sandbox testing (Zeke, set up 11/17): ev | 11/18 — Zeke: record gate and test records. Sandbox test records are flagged with the checkbox sandbox_test_field = true, which puts them in lists 1463, 1464 and 1465. The integration's record gate uses the same checkbox in the sa… |
| G066 | L284 | 11/17 | Danny and Zeke | G17 | Not built yet: the temporary External Sy | 11/17) until the open items in section 10 are clarified. |
| G067 | L284 | 11/18 | Zeke | G17 | Not built yet: the temporary External Sy | 11/18 — Zeke: build status. The pause is lifted for the build. The full architecture build comes first (create and identity checks; durable state and retries; poller and fewer calls; Case mappings; employee mappings; Contact routi… |
| G068 | L286 | 11/18 | Zeke | G17 | Waiting on Sara (Danny): whether the Wor | 11/18 — Zeke: answered for BT/RBT on |
| G069 | L286 | 11/17 | United Care | G17 | Waiting on Sara (Danny): whether the Wor | 11/17 by United Care's process (Change Log [C17]): the BT/RBT is created in CR before Workday, so the Workday ID comes later, and the HubSpot check is not needed. Still open for BCBA: see the |
| G070 | L286 | 11/18 | Danny and Zeke | G17 | Waiting on Sara (Danny): whether the Wor | 11/18 item in section 10, question 2. |
| G071 | L288 | 11/17 | Danny | G17 | Pending follow-up (Zeke, 11/17): the Wor | 11/17): the Workday ID items in section 10 wait for Danny, Sara or United Care: Workday ID timing, Workday ID format, the four records with a wrong workday_id, the two Workday IDs that are on two records, the two external_system_i… |
| G072 | L290 | 11/14 | Danny | G14 | 11/14 — Updates from Danny | 11/14 — Updates from Danny |
| G073 | L292 | 11/14 | — | G14 | Agent context [G14] · Use for the produc | 11/14 feedback in the Change Log. |
| G074 | L294 | 11/14 | — | G14 | Danny's 11/14 production sweep: every pr | 11/14 production sweep: every property in sections 3, 5 and 6 and all 13 write-back fields exist in production, nothing is archived or renamed, option values match the appendix, and the write-back properties are protected. He clea… |
| G075 | L294 | 11/14 | Danny | G14 | Danny's 11/14 production sweep: every pr | 11/14 — Updates from Danny”. |
| G076 | L296 | 11/06 | Danny | G06A | 11/06 — Updates from Danny | 11/06 — Updates from Danny |
| G077 | L298 | November 6 | — | G06A | Agent context [G06A] · Use for the Novem | November 6 corrections incorporated into the guide. Check the |
| G078 | L298 | November 14 | — | G06A | Agent context [G06A] · Use for the Novem | November 14 decisions where they apply. |
| G079 | L300 | November 6 | — | G06A | November 6 feedback is incorporated into | November 6 feedback is incorporated into sections 2, 3, 5, 7, 10 and 11 below. It supersedes older staffing values and pending Guardian / BCBA identity notes where stated. Original dated feedback is preserved for history; remainin… |
| G080 | L300 | 11/06 | Danny | G06A | November 6 feedback is incorporated into | 11/06 — Updates from Danny”. |
| G081 | L321 | 11/17 | Danny | GBR | Requirement 1 / Initial creation | 11/17 — Danny: an employee create also needs a filled workday_id. A record with a blank workday_id is held (last_sync_status = waiting) and syncs once the Workday ID is filled. |
| G082 | L321 | 11/17 | Zeke | GBR | Requirement 1 / Initial creation | 11/17 — Zeke: a person who is already in CentralReach is not created again. See [G17]. |
| G083 | L321 | 11/17 | Zeke | GBR | Requirement 1 / Initial creation | 11/17 — Zeke: the hold is replaced for now. A record with a blank workday_id is created with the HubSpot record ID as a temporary External System ID, and staff replace it with the Workday ID on the CR profile. See [G17]. |
| G084 | L322 | 11/17 | Zeke | GBR | Requirement 2 / Ongoing updates | 11/17 — Zeke: if the linked record's HubSpot ID and the ID CentralReach holds are both filled and differ, no update is sent and the record is marked error. See [G17]. / Case exclusions in the Client Pipeline / Skip a Case (HubSpot… |
| G085 | L334 | 11/16 | Zeke | GER-REQ | 11/16 — Zeke: CentralReach marks these f | 11/16 — Zeke: CentralReach marks these fields as required on POST /contacts/employee and POST /contacts/client (CentralReach API reference, spec file cr-api-list-100826.json). A create without one of them is rejected. ExternalSyst… |
| G086 | L338 | 11/17 | Danny | GER-REQ | Employee · ExternalSystemId | 11/17 — Danny): a record with a blank workday_id is held, not failed: it is not created, last_sync_status shows waiting, and it syncs once the Workday ID is filled. Code today fails the record with a sync error instead; the hold i… |
| G087 | L338 | 11/16 | — | GER-REQ | Employee · ExternalSystemId | 11/16 on employee 5324521), so updates send the ID CR already holds. |
| G088 | L338 | 11/17 | Zeke | GER-REQ | Employee · ExternalSystemId | 11/17 — Zeke: replaced for now. A record with a blank workday_id is not held: it is created with the HubSpot record ID as a temporary External System ID, and staff replace it with the Workday ID on the CR profile. See [G17]. Teste… |
| G089 | L338 | 11/17 | — | GER-REQ | Employee · ExternalSystemId | 11/17: CR rejects an employee create with an empty External System ID, and a person can change the ID on the CR profile. |
| G090 | L350 | 11/14 | — | GER-CASE | Agent context [GER-CASE] · Read [G01]–[G | 11/14 decisions [C14B] for source details. For sandbox object and staffing association IDs, use [SCURRENT]. |
| G091 | L359 | 11/09 | — | GER-CASE | Primary Email and Guardian | 11/09. See Contact requirements. |
| G092 | L360 | 11/09 | — | GER-CASE | Mailing Address | 11/09. |
| G093 | L383 | 11/17 | Zeke | GER-CASE | Label · Active / Inactive | 11/17 — Zeke: until the CentralReach label test is run, labels are only added, never removed. The test result decides: if CentralReach lets the integration replace a record's label set, this rule applies as written; if not, the pr… |
| G094 | L383 | 11/18 | Zeke | GER-CASE | Label · Active / Inactive | 11/18 — Zeke: the Active / Inactive label is held until the CentralReach label test, like the staffing label row. A client holds one of the two at a time, so add-only would leave both on a client after a status change. Nothing is … |
| G095 | L384 | 11/14 | — | GER-CASE | Labels · Staffing | 11/14. Creation, numeric label IDs and enablement remain unverified in the guide. Exact names: Pending 97151 Services, 97151 Services, Pending 97153 Services, Starting 97153 Services, Staffed 97153, X 97153. Match the stored staff… |
| G096 | L384 | 11/17 | Zeke | GER-CASE | Labels · Staffing | 11/17 — Zeke: until the CentralReach label test is run, labels are only added, never removed. The test result decides: if CentralReach lets the integration replace a record's label set, this rule applies as written; if not, the pr… |
| G097 | L384 | 11/18 | Zeke | GER-CASE | Labels · Staffing | 11/18 — Zeke: the six labels exist in CR under Staffing Status (1156741); the IDs are in section 7. The staffing label row is built after the CentralReach label test. |
| G098 | L403 | 11/14 | — | GER-BCBA | Employee ID and link · CR → HS | 11/14 sweep. |
| G099 | L403 | 11/16 | Zeke | GER-BCBA | Employee ID and link · CR → HS | 11/16 — Zeke: the CR Employee ID is the CR contactId. Write it to employee_id in sandbox and production. |
| G100 | L405 | 11/16 | Zeke | GER-BCBA | External System ID · HS → CR | 11/16 — Zeke: confirmed; this fills the CR profile field labelled External System ID. CR requires an External System ID to create an employee, so a record with a blank workday_id is not created. |
| G101 | L405 | 11/17 | Danny | GER-BCBA | External System ID · HS → CR | 11/17 — Danny: hold the record instead of failing it. last_sync_status shows waiting, and the record syncs once the Workday ID is filled. |
| G102 | L405 | 11/17 | Zeke | GER-BCBA | External System ID · HS → CR | 11/17 — Zeke: replaced for now. A record with a blank workday_id is not held: it is created with the HubSpot record ID as a temporary External System ID, and staff replace it with the Workday ID on the CR profile. See [G17]. |
| G103 | L406 | 11/16 | Zeke | GER-BCBA | HubSpot record ID · HS → CR | 11/16 — Zeke: the HubSpot record ID is stored in CR only inside the HubSpot Link to Record metadata field (138703), which holds the URL of the HubSpot record. It is not sent to any other CR field. The link between the two records … |
| G104 | L418 | 11/17 | Zeke | GER-BCBA | Label · Billing Hold | 11/17 — Zeke: until the CentralReach label test is run, labels are only added, never removed. The test result decides: if CentralReach lets the integration replace a record's label set, this rule applies as written; if not, the pr… |
| G105 | L425 | 11/14 | — | GER-BT | Agent context [GER-BT] · Read [G01], [G0 | 11/14 decisions [C14B] for source details. For sandbox object and association IDs, use [SCURRENT]. |
| G106 | L430 | 11/16 | Zeke | GER-BT | Employee ID and link · CR → HS | 11/16 — Zeke: the CR Employee ID is the CR contactId. Write it to employee_id in sandbox and production. |
| G107 | L432 | 10/29 | — | GER-BT | External System ID · HS → CR | 10/29 feedback also describes CR External System ID as the Workday ID and reports that most BT values match workday_id. |
| G108 | L432 | 11/16 | Zeke | GER-BT | External System ID · HS → CR | 11/16 — Zeke: resolved. Send BT/RBT workday_id as the CR External System ID (HS → CR), the same as BCBA. It fills the CR profile field labelled External System ID. CR requires an External System ID to create an employee, so a reco… |
| G109 | L432 | 11/17 | Danny | GER-BT | External System ID · HS → CR | 11/17 — Danny: hold the record instead of failing it. last_sync_status shows waiting, and the record syncs once the Workday ID is filled. |
| G110 | L432 | 11/17 | Zeke | GER-BT | External System ID · HS → CR | 11/17 — Zeke: replaced for now. A record with a blank workday_id is not held: it is created with the HubSpot record ID as a temporary External System ID, and staff replace it with the Workday ID on the CR profile. See [G17]. |
| G111 | L433 | 11/16 | Zeke | GER-BT | HubSpot record ID · HS → CR | 11/16 — Zeke: the HubSpot record ID is stored in CR only inside the HubSpot Link to Record metadata field (138703), which holds the URL of the HubSpot record. It is not sent to any other CR field. The link between the two records … |
| G112 | L438 | 11/13 | — | GER-BT | Active Case Load | 11/13. Add its CR metadata ID and wire the display-only mapping. |
| G113 | L438 | 11/16 | Zeke | GER-BT | Active Case Load | 11/16 — Zeke: confirmed. The CR employee field is Active Case Count, metadata ID 147882. |
| G114 | L447 | November 9 | — | GER-CONTACT | Agent context [GER-CONTACT] · Read [G03] | November 9 Guardian field update for source details. |
| G115 | L495 | 11/06 | Danny | G02 | 11/06 — Danny: the 34 “Prior” fields arc | 11/06 — Danny: the 34 “Prior” fields archived |
| G116 | L495 | November 3 | — | G02 | 11/06 — Danny: the 34 “Prior” fields arc | November 3 are not in this map; no mapping action is required for that cleanup. |
| G117 | L502 | 10/28 | — | G03 | Trigger: "when enter in central reach is | 10/28: use the CR ID for ongoing updates; the 74 cases that already have a CR Client ID will sync without the box. |
| G118 | L502 | 11/14 | Danny | G03 | Trigger: "when enter in central reach is | 11/14 — Danny: 475 Cases have a CR Client ID; 122 of them do not have this box, so the CR-ID gate matters on the first run. / enumeration |
| G119 | L507 | 11/09 | Zeke | G03 | Primary Email | 11/09 — Zeke: Available on the Case as the sync property email (production). / string |
| G120 | L508 | 11/06 | Danny | G03 | Guardian | 11/06 — Danny: closed. A Case has only one Contact, so use the Parent/Guardian on the Case; use that Contact’s email for parent communication. This closes the earlier |
| G121 | L508 | 10/29 | — | G03 | Guardian | 10/29 production-confirmation note. |
| G122 | L508 | 11/09 | Zeke | G03 | Guardian | 11/09 — Zeke: Created in production (50317927) as Case property sync fields read from the associated Parent/Guardian Contact: guardian_first_name, guardian_last_name, email, phone. The integration reads these from the Case directl… |
| G123 | L509 | 11/09 | Zeke | G03 | Mailing Address | 11/09 — Zeke: Guardian phone is now the Case property sync field phone, read from the Parent/Guardian Contact (production). / string |
| G124 | L510 | 11/14 | Danny | G03 | Care coordinator | 11/14 — Danny: requires crm.objects.owners.read; Danny is adding it to prod. / owner |
| G125 | L512 | Oct 22 | — | G03 | Supervising BCBA | Oct 22): use ongoing_central_reach_provider_supplier "Ongoing Central Reach Provider Supplier", because it feeds billing. It is free text staff type (274 cases filled), not a link to the BCBA record, so match it to the CR provider… |
| G126 | L513 | Oct 22 | — | G03 | Grad Permit Holder | Oct 22): when the Ongoing Central Reach Provider Supplier differs from the Supervising BCBA (association 82), the Supervising BCBA is a grad permit holder. Reliable check on the BCBA record: lba_licensure__ny = Grad Permit. Optidg… |
| G127 | L519 | Oct 22 | — | G03 | Approved Auth Hours | Oct 22), by initial_auth_tracks: Prior Authorization Required uses n97153_approved_assessment_hours_auth_req "97153 Hrs Insurance Approved- Prior Auth Req" (text, filled automatically from the approved hours/units; 445 cases). No … |
| G128 | L524 | 10/29 | — | G03 | Comorbid Diagnosis | 10/29 — TO CONFIRM IN PROD TESTING”: Comorbid and Maladaptive use only the main fields; the clinical versions are being merged in and deleted. This note reports the plan, not completion. |
| G129 | L524 | 11/14 | Danny | G03 | Comorbid Diagnosis | 11/14 — Danny: map only this main field. The clinical version still exists and United Care will finish the merge. / string |
| G130 | L525 | 10/29 | — | G03 | Maladaptive Behaviors | 10/29 — TO CONFIRM IN PROD TESTING”: only the main fields; the clinical versions are being merged in and deleted. Completion is not confirmed by that note. |
| G131 | L525 | 11/14 | Danny | G03 | Maladaptive Behaviors | 11/14 — Danny: map only this main field. The clinical version still exists and United Care will finish the merge. / checkbox |
| G132 | L537 | Oct 22 | — | G03 | Secondary Insurance | Oct 22): the carrier, insurance_2 (or insurance_2__other__summary when it is Other). Not n2_what_type_of_insurance. The row appears twice in the sheet (rows 45 and 78); use one. / enumeration |
| G133 | L545 | 10/28 | — | G04 | Danny 10/28 — Change signals: workflows  | 10/28 — Change signals: workflows cannot trigger on association labels. They can trigger on supervising_bcba_name, ia_bcba_name, reassessment_bcba_name, current_primary_bt and current_primary_bt_2; Danny says these are used as pro… |
| G134 | L547 | 10/30 | — | G04 | Danny 10/30 — BCBA-to-BCBA labels are no | 10/30 — BCBA-to-BCBA labels are now “Grad Permit Supervisor (supervises this BCBA)” and “Grad Permit Supervisee (this BCBA supervises them)”. Their association type IDs did not change. |
| G135 | L549 | Oct 21 | — | G04 | Call GET /crm/v4/objects/deals/{caseId}/ | Oct 21, 2026. Each labeled association also carries a plain unlabeled one (BCBA 20, BT 64); ignore those. |
| G136 | L572 | 11/06 | Danny | G05 | Employee ID | 11/06 — Danny: employee_id “Employee ID (from CR)” and external_system_id “External System ID” now exist on BCBA (2-48354212); both are empty. employee_id is the CR Employee ID writeback field. The |
| G137 | L572 | 10/28 | — | G05 | Employee ID | 10/28 note places them on the “CentralReach IDs” card in BCBA Overview. / |
| G138 | L572 | 10/27 | Zeke | G05 | Employee ID | 10/27 - Zeke Optidge Note / Created employee_id / string |
| G139 | L573 | 11/06 | Danny | G05 | External System ID | 11/06 — Danny: CR External System ID = Workday ID; send BCBA workday_id as the CR External System ID. The HubSpot external_system_id field exists and is empty. This supersedes the earlier HubSpot record ID note and closes the iden… |
| G140 | L574 | 10/30 | — | G05 | Legal Name | 10/30: full_name now refreshes automatically whenever first or last name changes; five mismatched BCBA names were corrected. If full_name is sent to CR, expect updates. / string |
| G141 | L576 | Oct 22 | — | G05 | Primary Email (Work Email) | Oct 22): ucaba_email_address "UCABA Email Address" (104 filled). No new field. / string |
| G142 | L582 | 11/14 | Danny | G05 | Care Coordinator | 11/14 — Danny: requires crm.objects.owners.read; Danny is adding it to prod. / owner |
| G143 | L591 | 11/14 | Danny | G06 | Trigger / status | 11/14 — Danny: the integration never deactivates anyone in CR; staff handle that. Keep sending field updates for linked BTs in Yes - Generic and No- Made Inactive. / enumeration |
| G144 | L593 | 11/16 | Zeke | G06 | External System ID | 11/16 — Zeke: this HubSpot property is not the integration's source. / The integration will send the workday_id to CR as the External System ID (HS to CR). See [GER-BT]. / string |
| G145 | L599 | 11/13 | Zeke | G06 | Active Staffed | 11/13 — Zeke: CR Active Case Load employee field created; the integration will fill it from active_cases_count (display only). / / Answer https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit?disco=d… |
| G146 | L603 | 11/14 | — | G07 | Agent context [G07] · Use for client lab | 11/14 decision for label setup and Cleanup exclusions. |
| G147 | L605 | 11/06 | — | G07 | Current update — Danny 11/06: read staff | 11/06: read staffing_status directly; do not derive staffing labels from stages, because HubSpot workflows keep the property current. Staffed / X Staffed no longer exist. Sara corrected 97155 to 97151 on |
| G148 | L605 | November 6 | — | G07 | Current update — Danny 11/06: read staff | November 6. Send the matching staffing label and remove the previous one when the value changes. Pessy still needs to confirm that the six labels exist in CR; hold label go-live pending confirmation. |
| G149 | L605 | 11/14 | Danny | G07 | Current update — Danny 11/06: read staff | 11/14 — Danny: go-live approved. Create the six labels in CR and turn the label sync on without waiting for Pessy. |
| G150 | L605 | 11/17 | Zeke | G07 | Current update — Danny 11/06: read staff | 11/17 — Zeke: until the CentralReach label test is run, labels are only added, never removed. The test result decides: if CentralReach lets the integration replace a record's label set, this rule applies as written; if not, the pr… |
| G151 | L605 | 11/18 | Zeke | G07 | Current update — Danny 11/06: read staff | 11/18 — Zeke: the six staffing labels are created in CR under the parent label Staffing Status (1156741). Their IDs are in the table below. |
| G152 | L605 | 11/18 | Zeke | G07 | Current update — Danny 11/06: read staff | 11/18 — Zeke: the staffing label row is built after the CentralReach label test, not before. Until then nothing is sent to CR for staffing_status. |
| G153 | L608 | 11/18 | Zeke | G07 | Active / Inactive | 11/18 — Zeke: the Active / Inactive label is held until the CentralReach label test, like the staffing label row. A client holds one of the two at a time, so add-only would leave both on a client after a status change. Nothing is … |
| G154 | L609 | 11/06 | — | G07 | Staffing-status labels — Danny 11/06 | 11/06 / staffing_status "Staffing Status" / From Intake Complete onward, the six CR staffing values are: Pending 97151 Services; 97151 Services; Pending 97153 Services; Starting 97153 Services; Staffed 97153; X 97153. Match the st… |
| G155 | L609 | 11/09 | Zeke | G07 | Staffing-status labels — Danny 11/06 | 11/09 — Zeke: the live CR label catalog (95 labels) has none of the six staffing labels. staffing_status is a Case property in 50317927 with all six values. The section 4 association labels cover who is staffed, not staffing statu… |
| G156 | L609 | 11/14 | Danny | G07 | Staffing-status labels — Danny 11/06 | 11/14 — Danny: create these six labels in CR with these exact names, then turn the label sync on; no need to wait on Pessy. staffing_status options have not changed since |
| G157 | L609 | 11/06 | — | G07 | Staffing-status labels — Danny 11/06 | 11/06. |
| G158 | L609 | 11/17 | Zeke | G07 | Staffing-status labels — Danny 11/06 | 11/17 — Zeke: until the CentralReach label test is run, labels are only added, never removed. The test result decides: if CentralReach lets the integration replace a record's label set, this rule applies as written; if not, the pr… |
| G159 | L609 | 11/18 | Zeke | G07 | Staffing-status labels — Danny 11/06 | 11/18 — Zeke: the six labels are created in CR under the parent label Staffing Status (1156741). Label IDs, from a live GET /contacts/labels (each name matched once): Pending 97151 Services = 1156742; 97151 Services = 1156743; Pen… |
| G160 | L609 | 11/18 | Zeke | G07 | Staffing-status labels — Danny 11/06 | 11/18 — Zeke: correction and decision. The six IDs and the parent ID 1156741 are in the integration code as constants only (src/constants/centralReach.mjs). Nothing reads them and nothing is sent to CR yet. The staffing label row … |
| G161 | L611 | 10/30 | — | G07 | Stage context from 10/30, corrected by 1 | 10/30, corrected by |
| G162 | L611 | 11/06 | — | G07 | Stage context from 10/30, corrected by 1 | 11/06 — reference only; sync reads staffing_status |
| G163 | L619 | 11/06 | — | G07 | Intake Complete: Pending 97151 Services  | 11/06). |
| G164 | L621 | 11/06 | — | G07 | Initial Assessment, Pending IA Auth, IA  | 11/06). |
| G165 | L629 | 11/06 | Danny / Sara | G07 | 11/06 — Danny / Sara: Restaffing-BCBA AN | 11/06 — Danny / Sara: Restaffing-BCBA AND BT Needed = X 97153. staffing_status is blank on Paused, Disqualified, Discharged, Closed Lost and the Cleanup stages; send no staffing label for those. Read the property rather than using… |
| G166 | L631 | 11/06 | Danny | G07 | 11/06 — Danny: Hot Lead, Warm Lead, Cold | 11/06 — Danny: Hot Lead, Warm Lead, Cold Lead and Processing Leads stay in HubSpot before Intake Complete; do not send these lead values as CR staffing labels. |
| G167 | L633 | 10/30 | — | G07 | Scheduled updates — Danny 10/30, clarifi | 10/30, clarified |
| G168 | L633 | 11/06 | — | G07 | Scheduled updates — Danny 10/30, clarifi | 11/06: daily refreshes run at 5 AM and 1 PM Eastern for every state, including Colorado. The |
| G169 | L633 | 10/30 | — | G07 | Scheduled updates — Danny 10/30, clarifi | 10/30 note describes Service Ready w/Start Date and Restaffing SR w/Start Date switching to Staffed 97153 at 1 PM the day after the BT 1 start date. Consume the resulting staffing_status changes even without a manual Case edit; do… |
| G170 | L635 | 11/06 | Danny | G07 | 11/06 — Danny: Active / Inactive is unch | 11/06 — Danny: Active / Inactive is unchanged and separate from staffing labels: case_status Warm = Active; Cold = Inactive. A blank staffing_status does not mean suppressing the Active / Inactive label. |
| G171 | L637 | 11/06 | Pessy | G07 | 11/06 — Remaining confirmations: Pessy s | 11/06 — Remaining confirmations: Pessy still needs to confirm that the six CR staffing labels exist. Sara confirmed Paused has no staffing label, Restaffing-BCBA AND BT Needed = X 97153, and Eastern-time daily refreshes apply to e… |
| G172 | L637 | 10/30 | — | G07 | 11/06 — Remaining confirmations: Pessy s | 10/30 questions about the lead-age timing basis and Restaffing SR w/Start Date are not explicitly closed by the |
| G173 | L637 | 11/06 | — | G07 | 11/06 — Remaining confirmations: Pessy s | 11/06 note; they do not change the instruction to read staffing_status. Hold label go-live pending CR-label confirmation. |
| G174 | L637 | 11/18 | Zeke | G07 | 11/06 — Remaining confirmations: Pessy s | 11/18 — Zeke: the six staffing labels now exist in CR; the IDs are in the table above. |
| G175 | L639 | 10/29 | — | G07 | Feedback continuation, under “10/29 — TO | 10/29 — TO CONFIRM IN PROD TESTING”: Reassessment uses staffing_status; leave cleanup stages out of CR while they are moved to Inactive in HubSpot. This does not confirm completion of that move. |
| G176 | L641 | October 22 | Danny | G07 | Historical reference — October 22 stage  | October 22 stage table below. Danny’s |
| G177 | L641 | November 6 | — | G07 | Historical reference — October 22 stage  | November 6 staffing_status instructions above supersede its Staffed / X Staffed entries, Paused staffing label, and pending staffing questions answered on |
| G178 | L641 | 11/06 | — | G07 | Historical reference — October 22 stage  | 11/06. Preserve this table as history; do not use it to derive current staffing labels. |
| G179 | L657 | 11/14 | Danny | G07 | 1383894301, 1383894303, 1383894302, 1332 | 11/14 — Danny: skip these four stages entirely. 124 cases are still marked Active and 2 have a CR ID; send nothing to CR for them. |
| G180 | L666 | 11/09 | Zeke | G07B | School / Clinic | 11/09 — Zeke: CR labels exist (School 1052688, Clinic 1052655, Home 1052656). No HubSpot options added for now. |
| G181 | L677 | 11/09 | Zeke | G07C | Anthem BCBS | 11/09 — Zeke: Anthem BCBS added to insurance_primary in production as its own option (value Anthem BCBS); maps to CR Anthem BCBS 1052620. Anthem NY Commercial-Carelon stays with Carelon. |
| G182 | L678 | 11/09 | Zeke | G07C | UHC | 11/09 — Zeke: UHC added to insurance_primary in production (value UHC); maps to CR UHC 1052534. |
| G183 | L686 | 10/29 | — | G08 | CO / NY / NJ Employee | 10/29 — TO CONFIRM IN PROD TESTING”: New Mexico / Virginia — skip for now. |
| G184 | L692 | 11/09 | Zeke | G08 | (no CR label) | 11/09 — Zeke: CR onboarding labels are stateless: Aetna 1107649, Cigna 1107650, Carelon 1132654. Medicaid: NY 1107647, CO 1107651 (both under Billing Hold Medicaid affiliation). No NJ or state-specific labels. |
| G185 | L693 | 11/17 | Zeke | G08 | Billing Hold Medicaid affiliation | 11/17 — Zeke: until the CentralReach label test is run, labels are only added, never removed. The test result decides: if CentralReach lets the integration replace a record's label set, this rule applies as written; if not, the pr… |
| G186 | L700 | 10/29 | — | G09 | CO / NY / NJ Employee | 10/29 — TO CONFIRM IN PROD TESTING”: New Mexico / Virginia — skip for now. |
| G187 | L701 | Oct 22 | — | G09 | Behavior Technician CO / NY / NJ, RBT CO | Oct 22): bt_rbt_type is now only BT or RBT. BTs working toward RBT moved to a separate field (bt_to_rbt_path), which doesn't affect the label. A BT with two states gets two labels. |
| G188 | L713 | 11/06 | Danny | G10 | 11/06 — Danny: BCBA employee_id and exte | 11/06 — Danny: BCBA employee_id and external_system_id exist on object 2-48354212, and both are empty. Field creation is closed; CR ID writeback and Workday-based External System ID mapping are described in section 5. This feedbac… |
| G189 | L717 | 11/06 | Danny | G10 | For BCBA and BT/RBT, Employee ID stores  | 11/06 — Danny confirms CR External System ID = Workday ID and BCBA workday_id can supply it. The earlier statement that CR External System ID stores the HubSpot record ID, and that the HubSpot field is unnecessary, is superseded f… |
| G190 | L719 | 11/06 | Zeke | G10 | 11/06 — Zeke - Follow Up: confirm whethe | 11/06 — Zeke - Follow Up: confirm whether these five Case properties are still needed: updated_by_integration, integration_last_write, employee_id, supervising_bcba, create_record. Danny renewed this request on |
| G191 | L719 | November 6 | — | G10 | 11/06 — Zeke - Follow Up: confirm whethe | November 6. The earlier note says they were empty and retained during the October cleanup; no removal or requirement decision is confirmed. |
| G192 | L719 | 11/13 | Zeke | G10 | 11/06 — Zeke - Follow Up: confirm whethe | 11/13 — Zeke: keep all five. updated_by_integration on the Case stays as is (Yes/No checkbox) for now; it will be tested. |
| G193 | L721 | 10/29 | — | G10 | Feedback continuation, under “10/29 — TO | 10/29 — TO CONFIRM IN PROD TESTING”: Comorbid and Maladaptive use only the main fields. Merge clinical data into the main fields and delete the clinical versions; the feedback does not confirm completion. |
| G194 | L721 | 11/14 | Danny | G10 | Feedback continuation, under “10/29 — TO | 11/14 — Danny: map only the main fields; the clinical versions still exist and United Care will finish the merge. |
| G195 | L723 | 11/09 | Zeke | G10 | Decide how the Grad Permit marker travel | 11/09 — Zeke: production association labels are Grad Permit Supervisor 151 and Supervisee 150. CR has label GRAD Student- LBA NY 1092164 and metadata field Grad Permit Holder 136052. / |
| G196 | L733 | 11/09 | Zeke | G10 | Funding source labels: Anthem BCBS, UHC, | 11/09 — Zeke: Anthem BCBS and UHC closed (options added to insurance_primary in production; CR labels 1052620 and 1052534 exist). Payors with no CR label remain open. |
| G197 | L733 | 11/14 | Danny | G10 | Funding source labels: Anthem BCBS, UHC, | 11/14 — Danny: option values still match the appendix; UHC and Anthem BCBS are the only option change since |
| G198 | L733 | 11/06 | — | G10 | Funding source labels: Anthem BCBS, UHC, | 11/06. |
| G199 | L735 | 11/06 | Danny / Sara | G10 | 11/06 — Danny / Sara: use staffing_statu | 11/06 — Danny / Sara: use staffing_status for staffing labels; Paused and the other listed inactive / Cleanup stages have no staffing label, and Restaffing-BCBA AND BT Needed = X 97153. Daily refreshes use Eastern time for every s… |
| G200 | L735 | 11/14 | Danny | G10 | 11/06 — Danny / Sara: use staffing_statu | 11/14 — Danny: closed. Create the six staffing labels in CR with the exact names in section 7 and turn the label sync on; no need to wait on Pessy. Skip Cases in the four Cleanup stage IDs (1383894301, 1383894303, 1383894302, 1332… |
| G201 | L735 | 11/18 | Zeke | G10 | 11/06 — Danny / Sara: use staffing_statu | 11/18 — Zeke: the six staffing labels are created in CR under the parent label Staffing Status (1156741). The IDs are in section 7. They are not in the integration code yet. |
| G202 | L735 | 11/18 | Zeke | G10 | 11/06 — Danny / Sara: use staffing_statu | 11/18 — Zeke: correction and decision. The six IDs and the parent ID 1156741 are in the integration code as constants only (src/constants/centralReach.mjs). Nothing reads them and nothing is sent to CR yet. The staffing label row … |
| G203 | L737 | 11/06 | — | G10 | 11/06 — Guardian: closed. A Case has onl | 11/06 — Guardian: closed. A Case has only one Contact; use the Parent/Guardian on the Case. This replaces the earlier pending production-confirmation status. See section 3. |
| G204 | L739 | 10/29 | — | G10 | Comorbid / Maladaptive answer recorded i | 10/29 — TO CONFIRM IN PROD TESTING”: only the main fields; clinical merge/deletion is planned, not confirmed complete. |
| G205 | L739 | 11/14 | Danny | G10 | Comorbid / Maladaptive answer recorded i | 11/14 — Danny: closed. Map only the main fields. The clinical versions still exist and United Care will finish the merge (2 cases and 9 cases have data only in the clinical field). |
| G206 | L741 | 10/29 | — | G10 | New Mexico / Virginia: skip for now, per | 10/29 — TO CONFIRM IN PROD TESTING”. |
| G207 | L743 | 11/17 | Sara | G10 | 11/17 — Pending follow-up. Workday ID ti | 11/17 — Pending follow-up. Workday ID timing (Sara): does the Workday ID exist before the CR step, or is it created later? Danny emailed Sara. If it exists earlier, Danny adds a HubSpot check so Entered in CentralReach cannot be s… |
| G208 | L743 | 11/18 | Zeke | G10 | 11/17 — Pending follow-up. Workday ID ti | 11/18 — Zeke: answered for BT/RBT on |
| G209 | L743 | 11/17 | United Care | G10 | 11/17 — Pending follow-up. Workday ID ti | 11/17 by United Care's process (Change Log [C17]): the BT/RBT is created in CR before Workday, so the Workday ID comes later, and the HubSpot check is not needed. Still open for BCBA: see the |
| G210 | L743 | 11/18 | — | G10 | 11/17 — Pending follow-up. Workday ID ti | 11/18 item in section 10, question 2. |
| G211 | L745 | 11/17 | Danny | G10 | 11/17 — Pending follow-up. Workday ID fo | 11/17 — Pending follow-up. Workday ID format (Danny): 640 of 644 production workday_id values are 7 digits. Please confirm the format. Four records hold something else and need correcting: BT/RBT 50160788279 first (the value is in… |
| G212 | L747 | 11/17 | — | G10 | 11/17 — Pending follow-up. One Workday I | 11/17 — Pending follow-up. One Workday ID on two records: 2002628 is on BT/RBT 60175644722 and BCBA 60455522203, and both are Entered in CentralReach = Yes. 1034820 is on BT/RBT 45909102183 (No- Made Inactive) and BCBA 63969342976… |
| G213 | L747 | 11/17 | — | G10 | 11/17 — Pending follow-up. One Workday I | 11/17: either confirm that CR can hold two employees with the same Workday ID, or decide a solution. A read-only check on |
| G214 | L747 | 11/17 | — | G10 | 11/17 — Pending follow-up. One Workday I | 11/17 found neither person in CR. |
| G215 | L749 | 11/17 | United Care | G10 | 11/17 — Pending follow-up. external_syst | 11/17 — Pending follow-up. external_system_id clean-up (United Care, per Danny): BT/RBT 53650602843 and 56690993076 hold a value that does not match workday_id. Both values were typed in HubSpot. The integration does not use this … |
| G216 | L751 | 11/17 | — | G10 | 11/17 — Pending follow-up. Employees alr | 11/17 — Pending follow-up. Employees already in CentralReach: 515 production records with Entered in CentralReach = Yes have no employee_id in HubSpot yet (405 BT/RBT, 110 BCBA). That is expected before go-live, because the integr… |
| G217 | L753 | 11/17 | Danny | G10 | 11/17 — Pending follow-up. Danny's follo | 11/17 — Pending follow-up. Danny's follow-up to United Care, awaiting answers: after the third escalation, how often the Workday ID checks repeat, and whether business hours only; whether the alerts run only for BTs entered in Wor… |
| G218 | L755 | 11/17 | Zeke | G10 | 11/17 — Pending follow-up. Temporary Ext | 11/17 — Pending follow-up. Temporary External System ID (Zeke to Sara and Danny, reply sent |
| G219 | L755 | 11/17 | — | G10 | 11/17 — Pending follow-up. Temporary Ext | 11/17): does anything read the External System ID in CR before the Workday ID is entered, such as a payroll export or a report? Do BCBAs follow the same order as BTs (CR first, Workday ID later)? |
| G220 | L757 | 11/18 | Danny | G10 | 11/18 — Pending follow-up. Danny's 11/18 | 11/18 — Pending follow-up. Danny's |
| G221 | L757 | 11/18 | Sara | G10 | 11/18 — Pending follow-up. Danny's 11/18 | 11/18 message to Sara [C18] asks seven questions; none is answered yet. (1) Does anything read the External System ID in CR before the Workday ID is entered, such as a payroll export or a report? Until then it shows a HubSpot numb… |
| G222 | L757 | 11/17 | — | G10 | 11/18 — Pending follow-up. Danny's 11/18 | 11/17 (the two items above); question 3 is new. |
| G223 | L763 | 11/06 | Zeke | G10 | 11/06 — Zeke - Follow Up: Danny still re | 11/06 — Zeke - Follow Up: Danny still requests what “Active Staffed” represents in CR, the integration private app’s actual scopes (including the sensitive deals scope), the complete list of HubSpot properties the integration writ… |
| G224 | L763 | 11/13 | Zeke | G10 | 11/06 — Zeke - Follow Up: Danny still re | 11/13 — Zeke: answered Danny on all four. (1) Active Case Load field created in CR; see item 1. (2) Scopes: see the table below. (3) Properties the integration writes: see item 3. (4) All five Case properties are kept; see section… |
| G225 | L771 | 11/13 | — | G10 | Next: Confirm HubSpot should own this co | 11/13. The integration will fill it from the BT/RBT active_cases_count (# of Active Cases). Display only; it does not change CentralReach's native case load. The field's CR metadata ID and the mapping are still to be added to the … |
| G226 | L773 | 11/06 | Danny | G10 | Private-app scopes — 11/06: Danny still  | 11/06: Danny still requests the integration private app’s scopes, including the sensitive deals scope. The earlier |
| G227 | L773 | 10/29 | — | G10 | Private-app scopes — 11/06: Danny still  | 10/29 continuation reported that the Central Reach Integration app had all scopes listed below; treat that as historical reported status until the actual integration app’s current scope list is confirmed. Zeke - Follow Up. |
| G228 | L773 | 11/14 | Danny | G10 | Private-app scopes — 11/06: Danny still  | 11/14 — Danny: read the prod Central Reach Integration app. It has read and write on deals, contacts and custom objects, including sensitive and highly sensitive, so the PHI fields are covered. Missing: crm.objects.owners.read, ne… |
| G229 | L773 | 11/16 | Zeke | G10 | Private-app scopes — 11/06: Danny still  | 11/16 — Zeke confirmed the HubSpot private app token and the client secret used for webhook signature verification have been updated for active sandbox 52311591. |
| G230 | L780 | 11/13 | Zeke | G10 | 3 Every HubSpot property your integratio | 11/13 — Zeke: please leave these. Case: client_id_number, central_reach_link_to_client. BT/RBT: employee_id, central_reach_link_to_rt_rbt. BCBA: employee_id, central_reach_record_link. All three objects: updated_by_integration, in… |
| G231 | L788 | 10/29 | — | G10 | 10/29 — Diff Review Pending / Leave For  | 10/29 — Diff Review Pending / Leave For Now / Final Confirm: Guardian first-name, last-name, email and phone sync fields — |
| G232 | L788 | 11/09 | Zeke | G10 | 10/29 — Diff Review Pending / Leave For  | 11/09 — Zeke: done in production (guardian_first_name, guardian_last_name, email, phone); BCBA personal email sync is planned, not confirmed complete; staff phone sync needs the exact destination internal name ( |
| G233 | L788 | 11/09 | Zeke | G10 | 10/29 — Diff Review Pending / Leave For  | 11/09 — Zeke: employee_phone on BT/RBT and BCBA, already read by the integration); alternate service-address workflow source internal name is unspecified; current_primary_bt workflow/custom-code handling remains a consideration, n… |
| G234 | L790 | 10/28 | Danny | G10 | 10/28 — Danny requested a fourth ongoing | 10/28 — Danny requested a fourth ongoing workflow for Contacts, covering Guardian name/email and BCBA personal email. Keep the CR ID fields written back by the integration out of the triggers. These are requests, not a statement t… |
| G235 | L792 | 11/06 | Sara | G10 | 11/06 — Staffing follow-up: Sara answere | 11/06 — Staffing follow-up: Sara answered the blank-stage / Paused rule, Restaffing-BCBA AND BT Needed = X 97153, and Eastern-time daily refreshes for every state. Pessy’s confirmation that the six CR labels exist remains pending.… |
| G236 | L792 | 10/30 | — | G10 | 11/06 — Staffing follow-up: Sara answere | 10/30 context is retained in section 7; sync reads staffing_status rather than mapping stages. |
| G237 | L792 | 11/18 | Zeke | G10 | 11/06 — Staffing follow-up: Sara answere | 11/18 — Zeke: the six staffing labels now exist in CR; the IDs are in section 7. |
| G238 | L818 | 11/14 | Danny | G11 | BT/RBT: entered_in_centralreach = Yes (s | 11/14 — Danny: decided. Keep sending field updates for linked BTs in Yes - Generic and No- Made Inactive, but the integration never deactivates anyone in CR; staff handle that. First-run counts: 415 Yes - Active, 13 Yes - Generic,… |
| G239 | L826 | 11/14 | Danny | G11 | One gap we’re fixing on our side: some r | 11/14 — Danny: 475 Cases have a CR Client ID; 122 of them do not have the Entered in CR box, so the CR-ID gate matters on the first run. |
| G240 | L830 | 11/06 | — | G11 | 11/06 — Test records: test_record (true/ | 11/06 — Test records: test_record (true/false) exists on Case, BCBA, BT/RBT and Contact. Danny says to skip records where test_record = true, or deliberately use them for end-to-end tests. Exclude flagged records from normal live … |
| G241 | L830 | 11/14 | Danny | G11 | 11/06 — Test records: test_record (true/ | 11/14 — Danny: test_record = true on 35 Cases, 5 BCBAs, 17 BT/RBTs and 34 Contacts. |
| G242 | L832 | October 22 | — | G11 | A sandbox pass on the label logic. Valid | October 22 stage table is historical; do not use it as the integration mapping. Run current HubSpot sandbox validation in 52311591 using [SCURRENT]. |
| G243 | L832 | 11/18 | Zeke | G11 | A sandbox pass on the label logic. Valid | 11/18 — Zeke: the six labels exist in CR under Staffing Status (1156741); the IDs are in section 7. Pessy's confirmation is no longer needed. |
| G244 | L840 | 11/18 | Zeke | GAPP | Every other option on the fields in this | 11/18 — Zeke: two more differences, on properties added after this appendix was written. BT/RBT btrbt_in_cr_checklist and BCBA bcba_in_cr_checklist: "External System ID (Workday)" stores External System ID. BT/RBT entered_in_workd… |
| G245 | L854 | 10/28 | — | GH28 | / 10/28 DANNY’S Feedback! / / / Design:  | 10/28 DANNY’S Feedback! / / / Design: looks right. Using the CR ID for ongoing updates also solves the backfill gap (the 74 cases that already have a CR Client ID will sync without the box). A few notes: |
| G246 | L864 | 10/29 | — | GH28 | BCBAs now have employee_id “Employee ID  | 10/29 - TO CONFIRM IN PROD TESTING / BCBA Overview. FYI, CR’s External System ID is the Workday ID: on BTs, 77 of 79 match workday_id exactly, so for BCBAs you can send workday_id. |
| G247 | L886 | 10/29 | — | GH29 | 10/29 - Diff Review Pending Leave For No | 10/29 - Diff Review Pending Leave For Now - Final confirm |
| G248 | L891 | 11/09 | — | GH29 | Case / Deal | 11/09 — Done: all four created in production as Contact-to-Case property sync fields. |
| G249 | L903 | 10/30 | Danny | GH30 | 10/30 Updates - From Danny / | 10/30 Updates - From Danny / |
| G250 | L1292 | 11/19 | United Care | C00 log | 11/19 — United Care, recorded 11/20. Sta | 11/19 — United Care, recorded |
| G251 | L1292 | 11/20 | — | C00 log | 11/19 — United Care, recorded 11/20. Sta | 11/20. Staffing labels that stay: 97151 Services, Staffed 97153, and X 97153. Zeke already has them, so Pessy does not create them. Zeke is removing Pending 97151 Services, Pending 97153 Services, and Starting 97153 Services, per … |
| G252 | L1294 | 11/18 | Zeke | C00 log | 11/18 — Zeke: decisions for the build, r | 11/18 — Zeke: decisions for the build, recorded in [G17] and [G18] in the integration tab: the temporary External System ID status and update rules; the lookup before an employee create (an employee already in CR is not linked and… |
| G253 | L1296 | 11/18 | Zeke | C00 log | 11/18 — Zeke: after the architecture bui | 11/18 — Zeke: after the architecture build is done, a final sandbox testing requirements plan will be written. Noted in [G18] in the integration tab and in the Change detection Architecture tab. |
| G254 | L1298 | 11/18 | Zeke | C00 log | 11/18 — Zeke: created the six staffing l | 11/18 — Zeke: created the six staffing labels in CR under the parent label Staffing Status (1156741). IDs from a live GET /contacts/labels, each name matched once: 97151 Services 1156743; Pending 97151 Services 1156742; Pending 97… |
| G255 | L1300 | 11/18 | Zeke | C00 log | 11/18 — Zeke: recorded Danny's 11/18 mes | 11/18 — Zeke: recorded Danny's |
| G256 | L1300 | 11/18 | Sara | C00 log | 11/18 — Zeke: recorded Danny's 11/18 mes | 11/18 message to Sara as its own section below [C18] and a summary in the integration tab [G18]: the temporary External System ID plan as sent to United Care, the Workday ID alert workflow (built, switched off), the new Entered in… |
| G257 | L1302 | 11/17 | Zeke | C00 log | 11/17 — Zeke: recorded Danny's 11/17 Wor | 11/17 — Zeke: recorded Danny's |
| G258 | L1302 | 11/17 | — | C00 log | 11/17 — Zeke: recorded Danny's 11/17 Wor | 11/17 Workday ID answer. A BCBA or BT/RBT record with a blank workday_id is held, not failed: no CR employee is created, last_sync_status shows waiting, and the record syncs once the Workday ID is filled. Updated the External Syst… |
| G259 | L1302 | 11/18 | Zeke | C00 log | 11/17 — Zeke: recorded Danny's 11/17 Wor | 11/18 — Zeke: superseded later on |
| G260 | L1302 | 11/17 | — | C00 log | 11/17 — Zeke: recorded Danny's 11/17 Wor | 11/17. The hold is replaced for now by the temporary External System ID; see the |
| G261 | L1302 | 11/17 | United Care | C00 log | 11/17 — Zeke: recorded Danny's 11/17 Wor | 11/17 note on United Care's CR-before-Workday process below, and [G17] in the integration tab. |
| G262 | L1304 | 11/17 | Zeke | C00 log | 11/17 — Zeke: recorded Danny's 11/17 Wor | 11/17 — Zeke: recorded Danny's |
| G263 | L1304 | 11/17 | — | C00 log | 11/17 — Zeke: recorded Danny's 11/17 Wor | 11/17 Workday ID message as its own section below [C17] and the |
| G264 | L1304 | 11/17 | — | C00 log | 11/17 — Zeke: recorded Danny's 11/17 Wor | 11/17 decisions in the integration tab [G17]: ID mapping, sync status values, ID mismatch rule, one Workday ID per record, employees already in CentralReach, and the sandbox test segment. Added the open questions for Danny, Sara a… |
| G265 | L1306 | 11/17 | Zeke | C00 log | 11/17 — Zeke: after an independent revie | 11/17 — Zeke: after an independent review of this guide, corrected the |
| G266 | L1306 | 11/17 | — | C00 log | 11/17 — Zeke: after an independent revie | 11/17 wording (the already-linked check is proposed, not decided; the test segment and the release trigger are planned, not set up). Added the add-only note to the six label rules; the CentralReach label test decides whether label… |
| G267 | L1308 | 11/17 | Zeke | C00 log | 11/17 — Zeke: recorded United Care's CR- | 11/17 — Zeke: recorded United Care's CR-before-Workday process, Danny's follow-up, the CR create and profile tests, the temporary External System ID decision and the sandbox test segments. Updated [G17], the three External System … |
| G268 | L1310 | 11/16 | Zeke | C00 log | 11/16 — Active HubSpot sandbox switched  | 11/16 — Active HubSpot sandbox switched to 52311591. Zeke is currently creating the workflows in that account. Use [SCURRENT] in the integration tab for verified sandbox object types and association IDs. The |
| G269 | L1310 | October 27 | — | C00 log | 11/16 — Active HubSpot sandbox switched  | October 27 workflow snapshot belongs to 50850427. Reviewed the crosswalk against the supplied sandbox comparison: all 3 object-type differences and 22 directional association differences match. The comparison uses documented produ… |
| G270 | L1312 | 11/14 | Zeke | C00 log | 11/14 — Zeke: recorded Danny's 11/14 pro | 11/14 — Zeke: recorded Danny's |
| G271 | L1312 | 11/14 | — | C00 log | 11/14 — Zeke: recorded Danny's 11/14 pro | 11/14 production sweep (below) and added dated notes to Tab 1 sections 3, 6, 7, 10 and 11. |
| G272 | L1314 | 11/09 | Zeke | C00 log | 11/09 — Zeke: Guardian first name, last  | 11/09 — Zeke: Guardian first name, last name, email and phone created in production as Case property sync fields (guardian_first_name, guardian_last_name, email, phone; source: Parent/Guardian Contact). Updated sections 3 and 10 a… |
| G273 | L1314 | 10/29 | — | C00 log | 11/09 — Zeke: Guardian first name, last  | 10/29 checklist. |
| G274 | L1316 | November 2 | — | C00 log | Change-log entries from Tab 1 — recorded | November 2, 2026 |
| G275 | L1318 | November 2 | — | C00 log | Agent context [C02A] · Use for the Novem | November 2 summary of sections 4–5 and 7–10, especially names and labels. |
| G276 | L1320 | 10/30 | — | C00 log | Sections 4–5 — Added Grad Permit label r | 10/30. |
| G277 | L1322 | October 22 | — | C00 log | Section 7 — Added exact current staffing | October 22 table historical. Source: |
| G278 | L1322 | 10/30 | — | C00 log | Section 7 — Added exact current staffing | 10/30. |
| G279 | L1324 | 10/30 | — | C00 log | Section 7 — Added 5 AM / 1 PM Eastern up | 10/30. |
| G280 | L1326 | 10/29 | — | C00 log | Sections 8–10 — Recorded dated answers a | 10/29 TO CONFIRM and |
| G281 | L1326 | 10/30 | — | C00 log | Sections 8–10 — Recorded dated answers a | 10/30. |
| G282 | L1328 | 11/06 | — | C00 log | 11/06 added to the top of the doc | 11/06 added to the top of the doc |
| G283 | L1330 | 11/19 | United Care | C19 | 11/19 — Updates from United Care | 11/19 — Updates from United Care |
| G284 | L1332 | 11/19 | United Care | C19 | Agent context [C19] · The 11/19 United C | 11/19 United Care communication, recorded |
| G285 | L1332 | 11/20 | Zeke | C19 | Agent context [C19] · The 11/19 United C | 11/20 with Zeke's check of the CentralReach All Employees label list. The summary and the rules that win are in the integration tab [G19]. |
| G286 | L1346 | 11/20 | Zeke | C19 | 11/20 — Zeke: the All Employees list sho | 11/20 — Zeke: the All Employees list shows Admin, CO Employee, NJ Employee, NM Employee, NY Employee, and VA Employee. Those are the exact names. NM Employee and VA Employee match the other state labels. New Mexico and Virginia ar… |
| G287 | L1348 | 11/18 | Danny | C18 | 11/18 — Updates from Danny | 11/18 — Updates from Danny |
| G288 | L1350 | 11/18 | Sara | C18 | Agent context [C18] · Use for Danny's or | 11/18 message to Sara: the temporary External System ID plan, the Workday ID alerts and seven open questions. The summary is in the integration tab [G18]. |
| G289 | L1392 | 11/18 | Zeke | C18 | 11/18 — Zeke, read-only check on product | 11/18 — Zeke, read-only check on production HubSpot (no writes): the new field is entered_in_workday_by (label Entered in Workday By) on BT/RBT 2-48354559, created |
| G290 | L1392 | 11/18 | — | C18 | 11/18 — Zeke, read-only check on product | 11/18. BCBA 2-48354212 has no such field; its Entered in Workday field is entered_in_ucaba_payroll_system. The checklist option External System ID (Workday) has the stored value External System ID on btrbt_in_cr_checklist and bcba… |
| G291 | L1394 | 11/17 | Danny | C17 | 11/17 — Updates from Danny | 11/17 — Updates from Danny |
| G292 | L1396 | 11/17 | — | C17 | Agent context [C17] · Use for Danny's or | 11/17 Workday ID answer and the read-only checks made the same day. The decisions are in the integration tab [G17]. |
| G293 | L1408 | 11/17 | Zeke | C17 | 11/17 — Zeke, read-only checks on produc | 11/17 — Zeke, read-only checks on production HubSpot and CentralReach (no writes): employee_id is filled on 6 production BT/RBT records and on no BCBA. All six were typed in HubSpot in June, and each matches a CR employee of the s… |
| G294 | L1410 | 11/17 | United Care | C17 | 11/17 — United Care's process for a BT/R | 11/17 — United Care's process for a BT/RBT (steps verbatim): 1. Create the BT or RBT in CentralReach before Workday. No Workday ID is needed at this point, and the BT can go into scheduling and case prep so we cant wait for workda… |
| G295 | L1412 | 11/17 | Danny | C17 | 11/17 — Danny's follow-up to United Care | 11/17 — Danny's follow-up to United Care (summary): the integration cannot wait for the Workday ID, and he asked Zeke whether CR will create an employee without an External System ID. HubSpot cannot show a pop-up when one field ch… |
| G296 | L1414 | 11/17 | Zeke | C17 | 11/17 — Zeke, tests and decision: CR rej | 11/17 — Zeke, tests and decision: CR rejects an employee create with an empty, null or blank External System ID (400, "The ExternalSystemId cannot be empty."); nothing was created. The API cannot change the ID afterwards ( |
| G297 | L1414 | 11/16 | — | C17 | 11/17 — Zeke, tests and decision: CR rej | 11/16 test). A person can change it on the CR profile: confirmed on test client 4908992 and test employee 5324521. Decision for now: the integration creates the employee with the HubSpot record ID as a temporary External System ID… |
| G298 | L1416 | 11/14 | Danny | C14 | 11/14 — Updates from Danny | 11/14 — Updates from Danny |
| G299 | L1426 | 11/06 | — | C14 | Every property in the guide (sections 3, | 11/06 is UHC and Anthem BCBS on insurance_primary, which you already have. staffing_status options haven't changed since |
| G300 | L1426 | 11/06 | — | C14 | Every property in the guide (sections 3, | 11/06. Your write-back properties are on all three objects and we'll protect them. / / |
| G301 | L1454 | 11/06 | — | C14 | 4. New since 11/06, no impact on you | 11/06, no impact on you |
| G302 | L1456 | November 14 | — | C14 | Agent context [C14D] · Use for the Applo | November 14 sweep. |
| G303 | L1474 | 11/06 | Danny | C06 | 11/06 — Updates from Danny | 11/06 — Updates from Danny |
| G304 | L1476 | November 6 | — | C06 | Agent context [C06] · Use for the origin | November 6 staffing, Guardian, BCBA ID, and test-record corrections. Check C14 for later decisions. |
| G305 | L1478 | Oct 22 | — | C06 | Hey @Zeke Swanson, a few United Care Hub | Oct 22 guide. The first one breaks the Staffed label in section 7, so please check it before you build the labels. |
| G306 | L1502 | 10/30 | Danny | C30 | 10/30 — Updates from Danny | 10/30 — Updates from Danny |
| G307 | L1566 | 10/29 | — | C29 | 10/29 - TO CONFIRM IN PROD TESTING | 10/29 - TO CONFIRM IN PROD TESTING |
| G308 | L1588 | November 2 | — | C29 | Change-log entries from Tab 1 — recorded | November 2, 2026 |
| G309 | L1590 | November 2 | — | C29 | Agent context [C02B] · Use for the Novem | November 2 summary of sections 3–5 and 10, including linked-ID backfill and workflow requests. |
| G310 | L1592 | 10/28 | Danny | C29 | Section 3 — Added the CR-ID ongoing-upda | 10/28 Danny’s Feedback. |
| G311 | L1594 | 10/28 | — | C29 | Section 4 — Added Danny’s five staff-nam | 10/28. |
| G312 | L1596 | 10/28 | — | C29 | Section 5 — Recorded BCBA ID-field exist | 10/28; left identity mapping pending production confirmation. |
| G313 | L1598 | 10/28 | — | C29 | Section 10 — Recorded the requested four | 10/28. No implementation asserted. |
| G314 | L1600 | 10/28 | Danny | C28 | / / / / 10/28 — Danny’s Feedback | 10/28 — Danny’s Feedback |

### 1b. BUILD-PLAN decisions 1 to 60 (section 4, L138-199)

Every decision changes a source, a rule, a label, a trigger or a status. A later decision replaces an earlier one where the text says so (9 → 13/14; 22 → 58; 31 → 36; 40 → 41; 42 → 50; 48 → 53; 39 → package item 6, table 1c P16).

| # | BUILD-PLAN decision | Date | What it decides now (excerpt; read the decision for the full rule) |
|---|---|---|---|
| D01 | decision 1 (BUILD-PLAN L140) | 11/16 | Webhooks first; an hourly poller and a daily sweep as safety checks; a record with no change writes nothing. |
| D02 | decision 2 (BUILD-PLAN L141) | 11/17, for now | Status is `success`, `error` or `waiting`. `blocked` is retired. |
| D03 | decision 3 (BUILD-PLAN L142) | 11/17 and 11/18, for now | Employee create: when Entered in CentralReach = Yes, the integration creates the employee and sends `workday_id` as the External System ID, or the HubSpot record ID (plain, no prefix) as a temporary ID when `workday_id` is blank. Staff later replace the tempor… |
| D04 | decision 4 (BUILD-PLAN L143) | 11/18 | Right after a temporary-ID create the status is `waiting`. Field and label updates keep going while it is `waiting`. Checklist ticked while CR still holds the temporary ID is `error`. A second HubSpot record with the same Workday ID is `error`. |
| D05 | decision 5 (BUILD-PLAN L144) | 11/18 | An unlinked record whose Workday ID finds an employee already in CR: no link, no CR write, `waiting`. A match on the record's own HubSpot ID still links, because that is its own earlier create. |
| D06 | decision 6 (BUILD-PLAN L145) | 11/17, for now | A linked record whose HubSpot ID and CR ID are both filled and differ: no CR write, `error`. |
| D07 | decision 7 (BUILD-PLAN L146) | 11/18 | Record gate in code: one app setting names a HubSpot checkbox; the workers and the poller skip every record where it is not true. Sandbox value: `sandbox_test_field`. Sandbox test records leave `test_record` blank. |
| D08 | decision 8 (BUILD-PLAN L147) | 11/18, for now | The create signal stays Entered in CentralReach = Yes, kept in one place in code. |
| D09 | decision 9 (BUILD-PLAN L148) | 11/17, 11/18 | Replaced on 11/20 by decisions 13 and 14. (It said: labels are add-only until the CentralReach label test; the staffing and Active / Inactive labels are built after that test.) |
| D10 | decision 10 (BUILD-PLAN L149) | 11/18 | Sandbox testing uses only records with `sandbox_test_field` = true. The employees and clients they create in production CR are those same test records. |
| D11 | decision 11 (BUILD-PLAN L150) | 11/17 | Existing CR employees are not created, linked or updated for now. |
| D12 | decision 12 (BUILD-PLAN L151) | 11/18 | The final sandbox test plan is written and agreed after the build. |
| D13 | decision 13 (BUILD-PLAN L152) | 11/20 | The label hold is lifted. The label test was run first-hand (below). The guide's replace-and-remove rules apply as written: Active / Inactive, staffing and Billing Hold removal are built. |
| D14 | decision 14 (BUILD-PLAN L153) | 11/20 | Every label the integration maps is a managed label. It is on the contact only while its HubSpot source says so. Labels the integration does not map are kept. The base labels All Clients, All Employees and Clinical are kept and always sent. (The first sentence… |
| D15 | decision 15 (BUILD-PLAN L154) | 11/19, 11/20 | Staffing labels: only 97151 Services, Staffed 97153 and X 97153 (guide `[G19]`). No client funding labels. New Mexico and Virginia employee labels exist but are not sent until a HubSpot value exists. |
| D16 | decision 16 (BUILD-PLAN L155) | 11/20 | BT/RBT role labels: a BT gets Behavior Technician and an RBT gets RBT, by state, Colorado included. One label per Work State. |
| D17 | decision 17 (BUILD-PLAN L156) | 11/20 | Contact forms: every BCBA is created with `Admin`. A BT/RBT is created with `Behavior Technician NY`, except Colorado, where a BT or an RBT is created with `RBT CO`. New Jersey has no form of its own and uses the New York form. (The Colorado row was proposed b… |
| D18 | decision 18 (BUILD-PLAN L157) | 11/20 | Client creates are gated by the record gate. There is no separate client-create switch. |
| D19 | decision 19 (BUILD-PLAN L158) | 11/20 | A CR ID typed by hand into HubSpot is trusted. The only check on it is that it is digits only. |
| D20 | decision 20 (BUILD-PLAN L159) | 11/20 | Production is gated with a segment Zeke picks at the move to production. The segment has one checkbox property behind it, and that property is the production value of `SYNC_RECORD_GATE_PROPERTY`, because a segment filters webhooks only and the poller, the swee… |
| D21 | decision 21 (BUILD-PLAN L160) | 11/20 | Sandbox test records are created with their associations, as records are in production: the Case to its BCBA, its BT/RBT and a Parent/Guardian Contact; each employee to its own Contact. |
| D22 | decision 22 (BUILD-PLAN L161) | 11/20, for now | Replaced by decision 58 on 2026-11-24 (a 7-digit Workday ID check is built). Workday ID: a note only for now. The temporary ID is the HubSpot record ID, nothing reads it in CR, and sandbox rounds test that path with `workday_id` blank. No Workday ID format che… |
| D23 | decision 23 (BUILD-PLAN L162) | 11/20, for now | Employee date of birth: the `2000-01-01` placeholder stays for now. The `date_of_birth` property must be added to production BCBA before BCBA creates run there. (Since decision 48 the BCBA reads `dob`; the placeholder rule is the same. Since decision 53 the BC… |
| D24 | decision 24 (BUILD-PLAN L163) | 11/20 | The Case sync properties hold the first Parent/Guardian Contact. The integration reads them and does not choose a Contact. |
| D25 | decision 25 (BUILD-PLAN L164) | 11/20 | BCBA credential labels the guide does not document are not built. NY Medicaid is documented and is built. |
| D26 | decision 26 (BUILD-PLAN L165) | 11/20 | Location and Address 2: Service Location Address 2 is mapped (row 4.22) and checked on the CR screen. The Location #2 work schedules have no CR field; decided when Stage 4 is built. |
| D27 | decision 27 (BUILD-PLAN L166) | 11/20 | A CR field that is missing is created by script, on Zeke's go-ahead, while building. Only Optidge adds fields in CentralReach. |
| D28 | decision 28 (BUILD-PLAN L167) | 11/20 | In the code, the orchestrator picks the best route for: the client External System ID and contact form (sent on a create only); the client lookup before a create (read-only); blank core fields (decided after one API test, row 3.13); the mapping version (compar… |
| D29 | decision 29 (BUILD-PLAN L168) | 11/20 | The build runs in parallel. Stage P is committed first, then one worktree and branch per lane. Each wave's merge and any push is asked for at the time. |
| D30 | decision 30 (BUILD-PLAN L169) | 11/20 | Each sandbox test employee is created with an associated Contact that fills the Contact-mirror properties (the list is in section 4, Stage P read (d)). This makes decision 21 exact for employees. |
| D31 | decision 31 (BUILD-PLAN L170) | 11/20 | `phone_number__second_` is kept. The property was created on the sandbox Case object on 2026-11-20 (label "Phone Number (Second)", text shown as a phone number, group `dealinformation`), so the sandbox matches the mapping (O-20, the Case half). Replaced by dec… |
| D32 | decision 32 (BUILD-PLAN L171) | 11/20 | The referring physician pair follows the requirement ([GER-CASE]: "Pick the Medicaid or commercial physician/NPI pair by insurance type"). Every Medicaid insurance type uses the Medicaid pair, New Jersey and Colorado included (row 4.23). |
| D33 | decision 33 (BUILD-PLAN L172) | 11/20 | HubSpot production may be read, read-only, for two purposes only: (a) a question about a field that the sandbox cannot answer (its definition, type, stored options or whether it exists); (b) a review of how live Cases and their associated Contacts are actually… |
| D34 | decision 34 (BUILD-PLAN L173) | 11/20 | Row 3.15 is built: after a create with an unknown result, a lookup that answers "not found" less than 15 minutes after the create was sent leads to a retry, not to a second create. Employees and clients. |
| D35 | decision 35 (BUILD-PLAN L174) | 11/20 | A BT/RBT whose `bt_rbt_type` is blank, or holds any value other than `BT` or `RBT` (production has a third option, `BT to RBT`), has no role label managed: none is added and none is removed, so a role label the person already holds in CentralReach is left alon… |
| D36 | decision 36 (BUILD-PLAN L175) | 11/20 | `phone_number__second_` is dropped from the mapping (replaces decision 31). It does not exist in HubSpot production. The integration no longer requests, reads or sends it, and C9 is not built. `PhoneHome` is left out of the client payload on a create and on an… |
| D37 | decision 37 (BUILD-PLAN L176) | 11/20 | The poller schedule is the app setting `INTAKE_POLLER_SCHEDULE`, a six-field NCRONTAB string. Not set or blank means `0 0 * * * *` (hourly), so production needs nothing; a value that is not six fields is not used (hourly, one warning, never a throw). The sandb… |
| D38 | decision 38 (BUILD-PLAN L177) | 11/20 | BR11 reading confirmed (A-22): a second HubSpot employee record that resolves to a CentralReach employee another HubSpot record already holds ends as `error`, with no CentralReach write. The BT-to-BCBA case stays open for United Care. (Zeke) |
| D39 | decision 39 (BUILD-PLAN L178) | 11/20 | Care Coordinator (C10) reads the Case property `care_coordinator_name` (text; filled on 2,530 of 2,877 production Cases, read 2026-11-20), not the owners API. The owners call, its cache and the `crm.objects.owners.read` scope are no longer needed for the Case.… |
| D40 | decision 40 (BUILD-PLAN L179) | 11/20 | Superseded by decision 41 (C20 source). Total Assigned Hours (C20) reads `total_hours_btrbt_12` (formula: `hours_bt_work_schedule_1 + bt_rbt_2_work_schedule`, only when both are filled; filled on 19 production Cases), not `total_hours_bt1bt2_work_schedule` (fo… |
| D41 | decision 41 (BUILD-PLAN L180) | 11/21 | Total Assigned Hours (C20) is the sum of `hours_bt_work_schedule_1` and `bt_rbt_2_work_schedule`, added by the code (replaces the source in decision 40). A blank counts as 0. Both blank sends blank. A filled value that is not a number ends the run as `error`. … |
| D42 | decision 42 (BUILD-PLAN L181) | 11/21 | Source superseded by decision 50 (B9 reads `personal_email`). BCBA personal email (B9, row 6.4) reads the BCBA record's own `email` property, not the linked Contact (replaces the Contact read of row 6.4). Zeke: "Read the BCBA own email". It relies on the HubSp… |
| D43 | decision 43 (BUILD-PLAN L182) | 11/21 | Changed for the Case `stateregion` by decision 56 (2026-11-24): an unreadable `stateregion` falls back to the Case `location` with a warning and no longer ends the run as `error`. Every other field below is unchanged. A filled phone, email, state or gender tha… |
| D44 | decision 44 (BUILD-PLAN L183) | 11/21 | The Contact fan-out's BCBA branch is removed. A Contact change now queues one Case sync per linked Case and nothing else. The branch existed only for the BCBA personal email, which decision 42 moved to the BCBA's own `email`. Closes O-44. Zeke: "If this was fo… |
| D45 | decision 45 (BUILD-PLAN L184) | 11/21 | The BCBA date of birth (B5) is read as text and converted by the code. Production `date_of_birth` exists on the BCBA, created 2026-11-21 as a single-line text property (confirmed by a read-only production read). Zeke: "Make the code transform the format into a… |
| D46 | decision 46 (BUILD-PLAN L185) | 11/21 | Phone: the code sends the 10 digits CentralReach stores and reads any US form (amends the phone text of decision 43). Zeke: "I need the format that allows the phone number to send from hubspot to central reach and not error." Punctuation is ignored; a `1`, `+1… |
| D47 | decision 47 (BUILD-PLAN L186) | 11/21 | A linked employee update sends HubSpot's primary email. Zeke: "If an email is updated on an employee in hubspot that needs to update in in central reach. any field on the requirements matrix needs to be pushed from hubspot to central reach when updated". On a … |
| D48 | decision 48 (BUILD-PLAN L187) | 11/21 | Superseded by decision 53 (the BCBA reads `date_of_birth`). The BCBA date of birth (B5) is read from `dob`, not `date_of_birth` (changes the source in decision 45; its text reading stays). Zeke: "Use dob, populate with the placeholder date, note we are pending… |
| D49 | decision 49 (BUILD-PLAN L188) | 11/21 | The BCBA primary email (B4) is the BCBA record's own `email`, not `ucaba_email_address`. Zeke: "We are not using ucaba_email_address. We are using this internal field value email for the bcba." `ucaba_email_address` is no longer requested or read. The rules al… |
| D50 | decision 50 (BUILD-PLAN L189) | 11/23 | CentralReach Meta `138069` Personal Email reads `personal_email` on the BCBA (B9) and on the BT/RBT (new T9), not `email`. Zeke: "For the personal email for both the BCBA and BT/RBT, use this field. field label 📝Personal Email (backup only, never emailed) inte… |
| D51 | decision 51 (BUILD-PLAN L190) | 11/23 | The HubSpot workflow re-enrollment triggers are set up and maintained by Zeke in HubSpot; the code no longer checks them. Zeke: "I have the re-enrollment triggers already set up for each of the workflows. These are set up. I do not want to maintain the file. A… |
| D52 | decision 52 (BUILD-PLAN L191) | 11/23, 11/24 | Two gate properties, one per path, and a production guard (build package items 24 and 14; package D18). Zeke: "For each workflow that will be pushed into production, we will create a two segments that will gate — for creates: central reach creates only — For u… |
| D53 | decision 53 (BUILD-PLAN L192) | 11/23, 11/24 | The BCBA date of birth reads `date_of_birth` (replaces decision 48), and the BT/RBT date of birth is read as text (package items 1 and 16). Zeke, item 1: "0-10 - use date_of_birth, fill with the place holder birthday"; on a backfill from `dob`: "No"; on who fi… |
| D54 | decision 54 (BUILD-PLAN L193) | 11/23 | Referring physician and Client Availability match CentralReach (package items 4 and 7; C31, C19). Zeke, item 4: "Match CentralReach"; item 7: "yes". Built. C31 (Meta `131151`): "`<name> <npi>`", one space and no comma; trailing commas and spaces after the name… |
| D55 | decision 55 (BUILD-PLAN L194) | 11/23, 11/24 | Supervising BCBA, Grad Permit Holder and the outgoing roles (package items 9 and 10, GP §8; C12, C13, C15, C16). Zeke: "2. Confirmed - it needs to be done to match the requriments listed on the google doc for Grad Permit holder", "3. Yes" (the association deci… |
| D56 | decision 56 (BUILD-PLAN L195) | 11/23 | The service address in CentralReach's two-line form, and the Case state falls back to `location` (package item 5; C24, C8; changes decision 43 for `stateregion`). Zeke: "Match CentralReach"; on the state: "use hte fall back"; on an unreadable `stateregion`: "c… |
| D57 | decision 57 (BUILD-PLAN L196) | 11/23, 11/24 | A client update never clears a core field: Route A, a CentralReach client read before every client PUT (package item B21; BR16, the client half of row 3.13; closes O-35 for the build). Zeke: "For the Decisions, with my recommendation for each: Let's do your re… |
| D58 | decision 58 (BUILD-PLAN L197) | 11/23, 11/24 | The Workday ID must be exactly 7 digits, pending final confirmation on the Workday ID (package item 15; replaces decision 22, row 3.17 "Not built" and the mitigation of R-8). Zeke: "Ship now with a note we are pending final confirmation on the workday id". On … |
| D59 | decision 59 (BUILD-PLAN L198) | 11/23 | An unconfirmed label POST waits the 150-second label window before its first retry (package item 12; BR19). Zeke: "Yes please implement the label fix." Built. `labelPostUnconfirmedError` sets `retryAfterSeconds` to `LABEL_POST_WINDOW_SECONDS` (150, `src/lib/re… |
| D60 | decision 60 (BUILD-PLAN L199) | 11/24 | `MAPPING_VERSION` is `stage7-2026-11-23`, changed once for the whole build of 2026-11-24 (package rule). The first run of every linked record after the deploy sends every field once (row 3.7). (Package rule, built by the orchestrator's builder) |

### 1c. Package decisions (2026-11-23, 2026-11-24) and handoff rulings (2026-11-24) that change a source, rule, label, trigger or status

| # | Source (line) | Date | What changes | What it says now |
|---|---|---|---|---|
| P01 | PKG L47-60, third set | 11/23 | Recommendations table | "Let's do your recommendations please": production guard (item 14) and BT/RBT date as text (item 16) ship; Grad Permit reads only `lba_licensure__ny`; B21 Route A; Referral Other with blank text → "Other"; `referral_other` recreated as a property sync; Grad Permit data fix is a pre-go-live task (D15) |
| P02 | PKG L52, D1 | 11/23 | Gate checkbox `sync_to_centralreach` | Superseded by P05 (two properties); `sync_to_centralreach` is not created |
| P03 | PKG L59, item 5 | 11/23 | Service-address state | "use hte fall back": blank `stateregion` → Case `location` (BP d56) |
| P04 | PKG L62-66, fourth set | 11/23 | Production gate; existing records; label fix | Two segments, creates and updates; existing records are a separate phase (D19); item 12 label wait ships |
| P05 | PKG L68-75, fifth set; D18 | 11/23 | Gate redesign | Option 2: `centralreach_creates_only` / `centralreach_updates_only`, read by the code on every path; sandbox stays `sandbox_test_field`; items 19-23 as the reviewer's versions (23 dropped); webhooks journal open (H8) |
| P06 | PKG L72 | 11/23 | Sandbox gate properties | Both created in sandbox 52311591 |
| P07 | PKG L77-87, sixth set rec. 1-2 | 11/24 | Guide inserts | Blocks A–E approved ("Yes, all 7"); C repeated at L512 and E at L503; not yet written to the Doc |
| P08 | sixth set rec. 3 | 11/24 | Production guard | Exact names `centralreach_creates_only` / `centralreach_updates_only` pinned |
| P09 | sixth set rec. 4; D18 c | 11/24 | Creates and promote workflows | "creates" ticks only records created after cutover with Entered = Yes and no CR ID; "promote after create" fires only on the integration's own CR ID and link write |
| P10 | sixth set rec. 5; D18 g | 11/24 | Live gate test set | BR4-C → BR4-CU → BR4-UC → BR4-X steps 1-2 → BR4-U+L → BR4. Note: BR4-X step 2 is still worded "(fan-out)" (PKG L871) |
| P11 | sixth set rec. 6 | 11/24 | Link-property history check | Read-only check at cutover |
| P12 | PKG L9, item 17 | 11/24 | Maladaptive ", " separator | Dropped; the current mapping stays |
| P13 | PKG L91, Ruling A | 11/24 pm | Sandbox assets | "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production" |
| P14 | PKG L92, Ruling B | 11/24 pm | Production phases | Phase 1: create records only; phase 2: review existing records against CentralReach, discrepancies are a phase-two build |
| P15 | PKG L98, seventh set #1 | 11/24 pm | C25 junk Address 2 (O-54, q7) | Send `null` (only commas, spaces or one state) |
| P16 | seventh set #2 | 11/24 pm | C10 138851 (O-53, q25); C36 (O-60) | Not omitted; item 6 (Care Coordinator from `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`) and item 2 (`referral_other`) built now; production deploy waits for the four properties (404 on 11/24); the 69 hand-entered CR values are phase 2 |
| P17 | seventh set #3 | 11/24 pm | Rule 7, mixed Grad Permit holders (O-55, q26) | Rule 7 as written: 131308 and 136052 left out with a warning; the code is changed to match |
| P18 | seventh set #4 | 11/24 pm | Employee update with blank date of birth (O-52, q27) | Option (a), BCBA and BT/RBT: placeholder on a create only; an update sends back CR's held date rebuilt as `YYYY-MM-DDT00:00:00.000Z`; an absent key is a failed read, no PUT |
| P19 | seventh set #5 | 11/24 pm | Allergies and Severity (O-56, items 3, 8) | Un-held; `Confirmed` + a none-like explain → `Yes` |
| P20 | seventh set #6 | 11/24 pm | Blank typed supplier (O-58) | Sends nothing: 131308 left out, not cleared |
| P21 | seventh set #7 | 11/24 pm | Case answer without the CR ID key (O-57) | "Keep the behavior": visible `error` `HUBSPOT_PROPERTY_MISSING` |
| P22 | seventh set #8 | 11/24 pm | Whole address in the street (O-59) | Split only when a state comes before the ZIP |
| P23 | seventh set #9 | 11/24 pm | Item 10 rules (master q10) | "these rules are rig" (right): Outgoing BT 1/2 join the BT names while labelled; order 82 → 234 → 288 → 135; On Leave never sent |
| P24 | PKG L108 | 11/24 pm | Package question 24, the creates workflow | Closed as recommended: Entered = Yes plus "created after the cutover date" |
| P25 | PKG L109; HO L31 | 11/24 pm | Requirements-review master questions 10–38 | Closed "as recommended" (individual outcomes in PKG section E q32); e.g. Q12 accept and measure; Q13 Zeke checks "BT - Active Cases Sync"; Q14 slice-06 route; Q15 `RBT CO`; Q16 prove triggers by `source`; Q19 managed-label wording; Q20 `CR_LABEL_POST_UNCONFIRMED` keeps the full retry schedule on sweep runs; Q21 credential labels not blocking; Q24 segment as AND filter; Q25 accept webhook retry untested; Q34 keep the code; Q35 fan-out routing accepted; Q38 both paths on, record `source` |
| P26 | PKG L715 (section C) | 11/23 | O-27 Salaried | "salaried is a label in central reach": label 1132653, as built |
| P27 | PKG L716; HO L47 (E10) | 11/24 | Salaried on test client 5384589 | "Irrelevant. Remove from the doc": the hand-removal question only |
| P28 | PKG L713 (section C) | 11/23 | O-43 total hours | Zeke's rule gives the same result as the code sum (d41) on every production Case |
| P29 | HO L45 (E2) | 11/24 | Who fills BCBA `date_of_birth` | "we are filling in this date with the placeholder value that we are currently using" |
| P30 | HO L46 (E9) | 11/24 | 5 malformed Workday IDs; Sara's word | "I will handle this." (Zeke's task, D20) |
| P31 | HO L48 (E14) | 11/24 | Sandbox coordinator workflows | "turned on and functioning" |
| P32 | HO L49 | 11/24 | Source order | Check HubSpot production first, then CentralReach, then the sandbox, all read-only |
| P33 | HO L8 | 11/24 eve | Full-coverage gate | No retest and no "plan ready" until an independent ledger check shows 0 gaps; exceptions go to Zeke by name |
| P34 | HO L10 | 11/24 eve | Three guide wordings | "Yes, all three": 138851 not omitted; phase-one records still receive later updates (only pre-existing CR records wait for phase two); item 10 rules right |
| P35 | prod-reads-output L5 | 11/24 | Workflow trigger lists | "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)". The list contents are not recorded in the repo |


---

## Table 2. Stale readings

**Effect codes**
- **RT**: a test row proves a retired rule.
- **FB**: a gap, BLOCKED, PENDING or CONFLICT row that is not really a gap.
- **MT**: a test for the current rule is missing.
- **WV**: a wrong expected value.
- **SW**: stale wording only, with no change in behaviour.

**Override column**
- R02 is shorthand for this finding: the Guardian first name, last name, email and phone are Case property-sync fields (guide 11/09 L508–509, L788, L891, Change Log L1314; BP d24). The BCBA personal email is the BCBA's own `personal_email` (d42, d44, d50). The fan-out is therefore optional code, and a Guardian Contact edit reaches the integration through the Case workflow or the poll.
- Pn refers to table 1c.

**Method**
- Six independent read-only checkers each read every row of their files against one digest of current rules.
- I spot-checked their claims about the WT, about the employee poll `source` and about Salaried.

### 2.1 Slices 01, 05 and 06: 34 findings (FB 18, RT 6, SW 6, WV 3, MT 1)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| R02 | 01 OBJ-033 L62 | cites `contactFanOutWorkflow` as proof that the Contact is "a linked data source" | The integration reads no Contact value; the fan-out is optional code | SW | State that Guardian values are Case sync properties; mark the fan-out citations as optional code |
| R02 | 01 OBJ-034 L63 | "Contact changes reach the linked Case"; Push 5 "needs the Contact webhook"; K1/K4 | The edit changes the Case sync property → Case workflow or poll | RT | Restate: edit Guardian X → Case property changes → Case run, record `source` |
| d24; G19 L232 | 01 OBJ-035 L64 | `contact_category` "identifies the Guardian Contact whose changes route to the linked Case" | HubSpot's sync picks the first Parent/Guardian; the integration routes nothing | RT | Reword per d24 |
| P19 | 01 API-019 L85 | "item 3 (PENDING record-level check)" | Un-held and built | SW | Override = seventh set #5; pending build = built |
| P16 | 01 API-029 L95 | "BLOCKED on package question 25" | Item 6 built; production waits for the properties | FB | Replace with the q25 answer |
| d51; P35 | 01 STF-006 L107 | `current_primary_bt` workflow "under consideration" (PENDING) | Names come from associations (BP 4.14); triggers are owner-maintained | FB | Retire (BP 4.14) |
| P20 | 01 STF-013 L114 | "blank → null" | Blank supplier: 131308 left out, not cleared | WV | Correct the expected value |
| P17 | 01 STF-018 L119, corr. L395 | CONFLICT, "waits on package question 26" | Rule 7 decided and built (WT `:378-391`) | FB | Status = pending build, offline proof |
| P23; d55 | 01 STF-026 L127 (also STF-028 L129, STF-035 L136, STF-060 L161, STF-063 L164) | "not applied to item 10 … See STF-086" | Confirmed 11/24 | SW | Cite d55 plus seventh set #9 |
| R02 | 01 STF-076 L177 | "the fan-out queues every associated Case" | Type 3 is HubSpot's sync input | SW | Reword; drop the fan-out test as proof |
| R02 | 01 STF-077 L178 | webhook "yes (Contact webhook, unconfirmed)" | Case workflow, if the four properties are triggers | RT | Change the path |
| P23 | 01 STF-086 L203 | CONFLICT, "no quoted Zeke words decide these rules" | Confirmed ("these rules are rig") | FB | Status = pending build |
| P20 | 01 gap a2 L215 | only the typed-supplier legs | A blank supplier sends nothing (no live leg) | MT | Add the blank-supplier step |
| P17 | 01 d6 L256 | rule 7 contradiction | Answered; code aligned | FB | Close |
| P23 | 01 d7 L257 | item 10 waits on United Care (O-15) | Confirmed | FB | Close |
| P17 | 01 e1 L264 | q26 CONFLICT | Decided | FB | Delete |
| P23 | 01 e5 L266 | item 10 waits | Confirmed | FB | Delete |
| P16 | 01 e4 L268 | item 6 waits on q25 | Built | FB | Close |
| P16 | 01 U8 L300 | guide text: `care_coordinator_name` | Item 6 fields | WV | Rewrite the guide text |
| P25 | 01 §7 L325-329; STF-083 L184, STF-085 L186 | Q1–Q3 open; q25/q26 waiting | Closed as recommended | FB | Mark closed |
| P17, P23 | 01 R-Q1 L437, R-Q2 L438 | item 10 and q26 open | Answered | FB | Close |
| follow-on | 01 totals L340-349, L443, L487, L514 | "CONFLICT 2" | 0 | SW | Recount |
| R02 | 05 CLB-063 L87 | "via Contact fan-out + Case webhook if triggers exist" | Case `location` → Case workflow (d51) or poll | RT | Restate |
| R02 | 05 CLB-069 L93 | "needs the Contact webhook (O-21)" | Case path; the real open item is whether a calculated `location` fires the workflow or moves `hs_lastmodifieddate` | FB | Drop O-21; keep the K6 check |
| R02 | 05 CLB-133 L146 | "Contact fan-out queues the Case … (O-21)" | Not a requirement path | RT | Retire, or restate as CLB-069 |
| R02 | 05 R-A3 L388 | "only safe with the Contact webhook (O-21)" | Prove the Case path | SW | Reword |
| P25 (Q19) | 05 CLB-153 L152; Q4 L295 | PENDING question 4 | Managed-label wording approved | FB | Decided (d14 + Q19) |
| P25 (Q20) | 05 CLB-160 L159; Q5 L296 | sweep `CR_LABEL_POST_UNCONFIRMED` "gets one retry" | Keeps the full retry schedule on sweep runs | WV | Correct the requirement |
| P25 (Q17, Q18, Q22) | 05 §8 Q1-Q3 L292-294; CLB-123 L141; gap G8 L177; L236 | open questions | Closed | FB | Mark closed; drop G8 |
| d25; P25 (Q21) | 06 LBL-027 to LBL-033 L46-52; L304 | BLOCKED (7 rows), "Waiting on United Care" | Not built by decision; not blocking go-live | FB | Status DEFERRED; test "no label sent" |
| R02; d44 | 06 LBL-080 L99 | K1 "fan-out queued 1 Case and no BCBA" PLANNED | Optional code; no employee label source on a Contact | RT | OFFLINE-ONLY |
| d25; Q21 | 06 (c) L133; (e)1 L143; state table L155-156 | credential labels BLOCKED | Deferred | FB | Replace |
| P25 (Q14) | 06 Q1 L196; gaps a1 L110, a2 L111 | R2 BT/RBT 1 to `Colorado;New York`? | Closed: Colorado-only create, CO;NY in R2-U1 | FB | Mark decided |
| P25 (Q21) | 06 Q2 L197 | not blocking? | Closed | FB | Close |
| follow-on | 06 totals L227, L307, L332 | "BLOCKED 7" | 0 | SW | Recount |

### 2.2 Slices 02 and 03: 57 findings (FB 23, SW 21, RT 7, WV 4, MT 2)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| d17 | 02 CASE-014 L37 | "BT/RBT Behavior Technician NY" | Colorado → `RBT CO`; NJ uses the NY form | SW | Add to the cell |
| P18 | 02 CASE-019 L42 | "E27 (update half HELD)", BLOCKED | Option (a) built | FB | PLANNED |
| R02 | 02 CASE-049 L72 | "Contact webhook needed (O-21)"; M K1 | Case `email` sync → Case workflow or poll | WV | Path = Case workflow; K1 expects the Case `source` |
| R02 | 02 CASE-062 L85 | "Contact webhook or Case poll" | Case workflow or poll | SW | Replace |
| R02 | 02 CASE-063 L86 | "Contact webhook (O-21)" | Case `phone` sync | WV | As CASE-049 |
| P16 | 02 CASE-068 L91 | 138851 ← `care_coordinator_name`, PROVEN-LIVE | Not read any more | RT | RETIRED, replaced by CASE-069 |
| P16 | 02 CASE-069 L92 | "not in WT … BLOCKED" | Built (`clientProperties.mjs:90-92`) | FB | OFFLINE-ONLY / PLANNED |
| P20 | 02 CASE-079 L102 | "blank → null" | Left out, not cleared | WV | Correct |
| P17 | 02 CASE-090 L113 | CONFLICT, E26 unanswered | Built | FB | OFFLINE-ONLY |
| P22 | 02 CASE-125 L148 | "a street holding a whole address is split" | Only when a state precedes the ZIP | SW | Add the condition |
| P15 | 02 CASE-128 L151 | E7 awaiting, BLOCKED | `null`, built | FB | OFFLINE-ONLY |
| P19 | 02 CASE-130 L153, CASE-131 L154, CASE-137 L160 | item 3/8 PENDING, BLOCKED (3 rows) | Built | FB | PLANNED (rewrite M C26/C28) |
| P19 | 02 CASE-132 L155 | "not in WT" | Built | SW | Fix the cell |
| P16 (item 2) | 02 CASE-160 L183 | "not in WT … BLOCKED" | Built (`clientProperties.mjs:85`) | FB | PLANNED |
| P24 | 02 CASE-169 L192 | "pkg E24 open" | Closed | SW | Replace |
| R02; d51 | 02 CASE-170 L193 | "Guardian email and phone" on the trigger list | All four Guardian sync properties; they replace the Contact workflow | SW | Name all four |
| R02 | 02 CASE-174 L197 | Contact is a data source; O-21, PLANNED | Optional code | RT | RETIRED / offline |
| R02 | 02 CASE-175 L198 | fan-out needs O-21 | Not a current requirement | RT | OFFLINE-ONLY |
| R02; R06 | 02 CASE-176 L199 | route via type 3 and `contact_category` | HubSpot sync decides | RT | Optional code |
| R02 | 02 CASE-177 to CASE-180 L200-203 | "Contact webhook \| Case poll" | Case workflow or poll | WV | Path = Case workflow; K1 expectation rewritten |
| R02 | 02 CASE-182 L205 | K4 Contact `test_record`, PLANNED | Optional code | RT | OFFLINE-ONLY |
| R02 | 02 CASE-184 L207 | BR4-X step 2 needs the Contact webhook | The gate applies to the Case run whatever the source | RT | Restate on the Case path |
| R02 | 02 CASE-186 L209 | "Create the production Contact change workflow" PENDING O-21 | Not needed for the Guardian fields (needs Zeke's word) | FB | RETIRED pending confirmation; move the need to CASE-170 |
| R02 | 02 CASE-188 L211 | webhook "O-21" | Case workflow | FB | Replace |
| P20, P17 | 02 gap a2 L243 | no blank-supplier or mixed-holder legs | Current rules | MT | Add both legs |
| P19 | 02 gap a11 L252 | "when items 3 and 8 are un-held" | Un-held | FB | Delete the condition |
| P16 | 02 gap a12 L253 | "after item 2" | Built | SW | Reword |
| R02 | 02 gap a16 L257 | path "fan-out" | Case path | RT | Drop fan-out |
| P16 | 02 gap a17 L258 | "after item 6" | Built | SW | Reword |
| P16 | 02 (b)3 L270 | item 6 tests "once decided" | Exist (`clientMetadataMapping.test.mjs:110-143`) | FB | Mark done |
| P17 | 02 (b)4 L271 | reconcile rule 7 tests | Done (`stage7GradPermitRoles.test.mjs:304, :403`) | FB | Mark done |
| P19 | 02 (b)8 L275 | items 3/8 tests "when un-held" | Exist | FB | Mark done |
| P15, P16, P19 | 02 (c) L282, L286, L287 | items 2, 6, 3, 8 and E7 not built | Built | FB | Rewrite (c) |
| P17 | 02 (d) L291 | CASE-090 conflict | Resolved | FB | Delete |
| P15-P19 | 02 (e) L296 | E7, E25, E26, items 3/8, E27 waiting | Decided | FB | Delete |
| R02 | 02 (e) L297 | O-21 blocks CASE-175 and CASE-186 | Superseded | FB | Remove O-21 |
| P16 | 02 guide update L331 | `care_coordinator_name` | Item 6 | SW | Replace |
| P17, P20 | 02 guide update L332 | supplier fallback only | Plus blank → nothing, and rule 7 | SW | Append |
| P19 | 02 guide update L342, L343 | "(if un-held)" | Un-held | SW | Delete |
| R02; P15; P22 | 02 guide update L349 (and missing rows) | "The fan-out queues every associated Case…" | Case sync path; rows for L452/L455/L790, C25 null and O-59 are missing | SW | Replace and add the rows |
| P15-P19 | 02 A-1 L356 | items treated as not built | Built | SW | Update |
| R02 | 02 Q4 L374 | fan-out routing question | Moot | SW | Close |
| P17 | 02 Q5 L375 | mixed holders, "please answer" | Answered | FB | Close |
| P15-P24, R02 | 02 L379 | E7, E24-E27, items 3/8 and O-21 waiting | Answered or superseded | FB | Cut to O-17, O-28, D3 |
| P17 | 02 corrections L441 | CASE-090 CONFLICT confirmed | Superseded | SW | Note it |
| follow-on | 02 totals L392, L396, L447, L496, L518 | "BLOCKED 7 … CONFLICT 2" | About 0–1 | SW | Recount |
| P16 | 02 prod addendum L486, L507 | "WT … holds none of them, so today's build cannot fail" | The WT requests all four; a production deploy before they exist fails every Case run | SW | Restate the risk |
| P18 | 03 BCBA-109 L153 | "HELD … Q27", BLOCKED | Option (a) built (`mappedState.mjs:340`) | FB | PLANNED; cite the S3BCF tests |
| P18 | 03 (b) b3 L292 | test "once Q27 is answered" | Exists | FB | Mark done |
| P18 | 03 (e) L313 | Q27 waiting | Decided | FB | Delete |
| P18 | 03 guide update L353 | "blank-on-update rule pending Q27" | Option (a) | SW | Replace |
| P18, P24, P17 | 03 L389 | Q27, Q24-26 waiting | Answered | SW | Remove |
| follow-on | 03 totals L422, L499, L525 | "BLOCKED 3" | 2 | SW | Recount |
| P18 | 03 gaps (a) L261-286 | no sandbox row for a blank BCBA date on update | Needs a live proof | MT | Add gap a23 (R1-U2 → CR keeps 1990-01-15) |

### 2.3 Slices 04 and 07: 44 findings (FB 24, RT 10, SW 8, WV 1, MT 1)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| P18 | 04 BT-083 L111 | "PKG question 27 (HELD)", BLOCKED | Option (a), BCBA and BT/RBT | FB | PLANNED |
| P18 | 04 BT-083 L111 (test and code cells) | "left out when the CR read does not hold the key" | Absent key = failed read, no PUT; tests renamed (`stage1CreateIdentity.test.mjs:670`, `stage3BlankCoreFields.test.mjs:244, :283`) | WV | Cite the current tests |
| P18 | 04 gap (a) 8 L205 | "Blocked on open question 1" | Expected PUT `2000-01-01T00:00:00.000Z` for R3 | FB | Remove the block |
| P18 | 04 gap (b) 3 L215 | "once question 1 is answered" | Tests exist | FB | Cite them |
| P18 | 04 (e)1 L237; Q1 L317; A7 L309 | Q27 waiting; "covers the BCBA only" | Both types | FB | Delete; rewrite A7 |
| d53 | 04 BT-079 L107 | "a filled ISO date"; override "none" | Text read by `readTextDate` | SW | Fix |
| P18 | 04 BT-081 L109 | "said for the BCBA" | Both types | SW | Fix |
| P24; P14 | 04 BT-036 L64; (e)5 L241 | "PKG Q24 (waiting)", PENDING | Closed; existing records are phase 2 | FB | DEFERRED (phase 2) |
| d8; P24 | 04 BT-053 L81; (e)4 L240 | BLOCKED, RG D16 | Signal stays Entered = Yes | FB | Decided; UC answer is non-blocking |
| d38 | 04 BT-025 L53; (e)2 L238; (a)5 L202 | "MX BR11 (held)" BLOCKED | Decided; matrix hold lifted (U-32) | FB | PLANNED |
| d17; O-13; P25 (Q15) | 04 BT-109 L137; (d)5 L233; GU6 L286; Q4 L321; corr. L391 | CONFLICT, "no verbatim Zeke words" | Decided | FB | PLANNED |
| d60 | 04 BT-140 L168; (d)1 L229 | CONFLICT: noop vs full send | First run after the deploy sends every field once | FB | PLANNED; fix the run sheet |
| O-1 (closed 11/20) | 04 BT-145 L173 | PENDING, "unanswered" | "nothing reads it" | FB | Answered |
| P25 (Q38) | 04 gap (a)1 L193-194 | "poller off for one push"; "workflow off" | Both paths on; record `source` | RT | Rewrite |
| P25 (Q14) | 04 gap (a)2 L196; Q3 L319 | add a second CR employee | Slice-06 route | RT | Replace |
| P25 (Q13) | 04 Q2 L318 | how to fill `active_cases_count` | Zeke checks the workflow | SW | Close |
| P15-P24 | 04 A11 L313; L323 | questions 7, 24-27 and items 3/8 "still waiting" | Answered | SW | Update |
| R02 | 07 TRG-143 L167 | "through the fan-out"; "needs O-21" | Case path | RT | Restate; cite `[K2][6.3]` |
| R02 | 07 TRG-141 L165 | production Contact workflow PENDING | Replaced by the Case trigger list | RT | RETIRED |
| R02 | 07 TRG-142 L166; L924 | Contact workflow sends a webhook, BLOCKED | Optional code | FB | OFFLINE-ONLY |
| R02 | 07 TRG-263 L298 | `0-1` accepted, BLOCKED O-21 | Optional code | FB | OFFLINE-ONLY |
| R02 | 07 TRG-128 L152 | Contact `test_record`, BLOCKED O-21 | Optional code | FB | OFFLINE-ONLY |
| R02 | 07 TRG-145 L169; a2 L451 | "BR4-X (2) Contact fan-out" | Case run `skipped` `record_gate` | RT | Restate |
| R02 | 07 TRG-146 L170 | "K1 (fan-out `crCalls` [])" | Optional code | RT | OFFLINE-ONLY |
| R02 | 07 TRG-159 L183 | "watch Contact changes … (O-21)" | Both halves superseded | RT | RETIRED |
| R02 | 07 TRG-269 L304 | "fan-out … (O-21)" | Proof is a Case run after the edit | RT | Restate |
| R02; R05 | 07 TRG-317 L352 | "blocked (O-21)" | Case or employee workflow | FB | Restate |
| R02 | 07 state coverage L531 | "Contact fan-out … blocked O-21" | Guardian → Case | RT | Retitle |
| R02 | 07 (e) e2 L500 | O-21 blocks four rows | Not blocking | FB | Delete |
| R01 | 07 TRG-217/218 L243-244 | Guardian names only; K1 | All four Guardian sync properties must be Case triggers | MT | Add `email` and `phone` trigger rows; cite K2/C6 |
| R01 | 07 TRG-316 L351 | sync-property test is K1 | K2 | SW | Replace |
| O-26 | 07 TRG-197 L223; e3 L501 | BLOCKED O-26 | The R1-U1 run itself answers O-26 | FB | PLANNED |
| P18 | 07 TRG-270 L305, TRG-314 L349, e5 L503, TRG-310 L345 | BLOCKED on Q27 | Option (a) | FB | PLANNED with the expected value |
| P24 | 07 TRG-084 L103; e4 L502 | BLOCKED q24 | Closed | FB | PENDING (cutover) |
| d8; P24 | 07 TRG-022 L41 | BLOCKED create signal | Decided | FB | Decided |
| d3 | 07 TRG-021 L40; TRG-095 L114; e7 L505 | BLOCKED: does the BCBA follow the same steps | Integration rule decided (same for both) | FB | PENDING (UC process only) |
| d38 | 07 TRG-015 L34, TRG-064 L83, TRG-069 L88; a6 L455 | BR11 "held" | Lifted (U-32, U-26) | FB | PLANNED |
| d25; Q21 | 07 TRG-245 L280; e10 L508 | BLOCKED | Deferred | FB | DEFERRED |
| P25 (Q24) | 07 TRG-284 L319; d1 L493; Q3 L587 | CONFLICT segment vs trigger | Triggers plus re-enrolment; segment is an AND filter | FB | PENDING (cutover) |
| P25 (Q23-Q28) | 07 Q1-6 L585-590; L583; Azure change 4 L598, 12 L608 | open; email receiver "optional" | Closed; add the receiver now | SW | Mark closed |
| P16 | 07 TRG-222 L248; corr. L687 | sandbox needs a `care_coordinator_name` trigger | The three item-6 properties | RT | Replace |
| P16 | 07 guide update G-09 L553 | `care_coordinator_name` | Item 6 | SW | Replace |
| P19 | 07 TRG-177 L203 | "item 3 held" | Un-held | SW | Fix |
| d51; P35; Q16 | 07 e1 L499 (also TRG-035 L54, TRG-134 L158, TRG-254 L289, TRG-332 L367, a1 L450, L910) | "which sandbox triggers exist" waiting on Zeke | Zeke: "done"; prove by `source` | FB | Delete the waits |


### 2.4 00-MASTER.md: 68 findings (FB 33, SW 22, RT 5, MT 4, WV 4)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| R02 | §2 L42 | "No Case field is proven through … the Contact fan-out" | The fan-out is optional | SW | Delete the clause |
| R02 | D8 L137 | "The sandbox Contact workflow (O-21) … After O-21: K1 and BR4-X step 2 (fan-out)" | Case path | FB | Restate as the Case-path Guardian test |
| R02 | K6 L258 | "the Contact webhook path waits on O-21" | A Case trigger or sweep question | FB | Replace the O-21 clause |
| R02 | K16 L268 (2) | "Build the Contact workflow … in the sandbox first" | Not needed for the Guardian fields | FB | Check that the Case triggers include the four Guardian properties |
| R02 | U-04 L315 | "Contact Guardian field edit sends a Contact webhook (after O-21)" | Not a requirement | RT | Replace with the Case-path row |
| R01 | §4.3 L310-359 | no row edits a Guardian field and checks the Case path | Current rule | MT | Add a U-row (path "both", record `source`) |
| R02 | G-5 L388 | "Contact fan-out queues the Case, which the gate stops" | Case path | RT | Reword |
| R02 | §4.10 L455 | "The Contact workflow and the reports exist" | Not needed | FB | Replace with the Case trigger check |
| R02 | §7.4 N-8 L618; Q35 L696 | the fan-out as the Guardian path (guide text) | Case sync | SW | Rewrite N-8 |
| R02 | §7.4 #33 L599 (X-33) | "Contact changes reach Cases only" | Via HubSpot property sync | SW | Rewrite |
| R02 | §9 Q9 L667 | O-21 "Already asked" | Superseded (needs Zeke's word) | FB | Remove from the waiting list |
| R02 | App B TRG-128 L987, TRG-263 L992 | BLOCKED O-21 | Optional code | FB | OFFLINE-ONLY |
| R02 | App B TRG-142 L988 | the 4th workflow, BLOCKED | Not a requirement | RT | Move to App A, RETIRED |
| R02 | App B CASE-186 L1072; TRG-141 L1110 | production Contact workflow, O-21 | Covered by the Case workflow (CASE-170) | FB | Retire; keep only the O-26 half |
| P18 | A5 L73 | "Zeke answers question 27" | Decided | FB | Close |
| P18 | U2-4 L368; R3-9 L437 | "(after question 27)" | Expected: CR's held date rebuilt `…T00:00:00.000Z`, never 2000-01-01 | WV | State the expected value |
| P18 | §5.2 L481; §7.4 #6 L572; Q5 L663 | "HELD (question 27)" | Decided | SW | Update |
| P18 | App B CASE-019 L961, BCBA-109 L968, BT-083 L973, TRG-270 L993, TRG-314 L995, GC-023 L998 | blocked on E27 | Decided | FB | PLANNED |
| P16 | A4 L72; Q3 L661 | "answers question 25 (omit until item 6 ships)" | Not omitted; item 6 built | FB | Close |
| P16 | B3 L93 | "The WT does not request them (safe today)" | The WT requests all four; the production deploy risk is live | SW | Restate the risk |
| P16 | K8 L260 | triggers "must include `care_coordinator_name`" | The three item-6 properties | WV | Replace |
| P16; P31 | §4.0 L283; §4.2-4.8 | no C10 row | Provable now | MT | Add `ready` and not-ready rows |
| P16 | §5.2 L488 | "Held until the production properties exist" | Built | SW | Update |
| P16 | §7.4 #15 L581 (X-15) | `care_coordinator_name` since 11/20 | Item 6 | SW | Rewrite |
| P16 | App A TRG-222 L882 | retired by "Decision 39" | Retired by item 6 | SW | Cite item 6 |
| P16 | App B CASE-069 L962; GC-038 L1001 | BLOCKED; "omit 138851, or keep decision 39" | Neither; built | FB | PLANNED / RETIRED |
| P16; P13 | App B GC-037 L958; GC-125 L1162 | waits on D7; "rebuild the workflows" | Built; workflows deployed from the sandbox | SW | Update |
| P16 | App B GC-084 L1148 | tell UC the first sync overwrites 69 values | Phase 2 | SW | Tag phase 2 |
| P16 | H5 L215 | tests "once decided" | Exist | FB | Done |
| P16 | R2-17 L414; GC-027 L957 | "after item 2 ships" | Sandbox deploy now | SW | Update |
| P16 | App B CASE-160 L967 | "Stays BLOCKED" | Provable | FB | PLANNED |
| P16 | H14 L224; GC-028 L1055 | "no test pins it" | Test exists (`clientMetadataMapping.test.mjs:172-174`) | FB | OFFLINE-ONLY |
| P15 | A7 L75; Q1 L659 | "Answer question 7" | `null`, built | FB | Close |
| P15 | App B CASE-128 L963; GC-036 L1000 | BLOCKED E7 | Decided | FB | PLANNED / OFFLINE-ONLY |
| P15 | §7.4 #14 L580 | "after question 7" | Decided | SW | Draft X-14 |
| P15 | R3-1 L429 | no junk Address 2 step | `null` | MT | Add the R3 More Than One Location junk step |
| P17 | A2 L70; N1 L465; §5.2 L483; Q4 L662 | "Zeke answers question 26"; "rule 7 held" | Built | FB | Close |
| P17 | §10 #6 L714; App B STF-018 L908, CASE-090 L910, GC-050 L1004 | CONFLICT | Resolved | FB | OFFLINE-ONLY |
| P20 | A3 L71; N2 L466 | "the WT sends blank, which clears" | Sends nothing, built | FB | Close |
| P20 | §7.1 L545; §7.3 E/E2 L561; Q7 L665 | "Answer O-58 first" | Answered | SW | Remove the precondition |
| P20 | App B GC-124 L917 | CONFLICT "O-58 is with Zeke" | Decided | FB | OFFLINE-ONLY |
| P20 | U-14 L325 | supplier fallback only | Blank → 131308 untouched | MT | Add the step |
| P21 | C10 L111; Q8 L666 | recommends "failed read, no HubSpot write" | Visible `error` kept | FB | Close |
| P21 | App B GC-120 L1007 | BLOCKED O-57 | Decided | FB | OFFLINE-ONLY |
| P22 | A8 L76 | "Answer O-59" | Tightened | FB | Close |
| P22 | App B GC-123 L1008 | "any street with a comma that ends in five digits" | State before ZIP | WV | Restate |
| P19 | C2 L103; Q6 L664 | un-hold "already asked" | Un-held | FB | Close |
| P19 | §4.0 L283; §5.2 L489; §7.4 #9 L575, #18 L584 | "(after un-hold)" | Un-held | SW | Drop the conditions |
| P19 | App B CASE-130 L964, CASE-131 L965 | old Allergies expectations | Confirmed + text → text; none-like → "Yes"; Denial → "None" | WV | Restate |
| P19 | App B CASE-137 L966, GC-030 L999, GC-044 L1003 | BLOCKED un-hold | Built (Severity "2") | FB | PLANNED |
| P24 | C15 L116; Q2 L660; App B TRG-084 L985 | "Answer question 24" | Closed | FB | Close; PENDING (cutover) |
| P24 | A1 L69; App B CASE-169 L1070, BT-036 L1087, GC-012 L1126 | "E24 open" | Closed | SW | Drop |
| P25 | §9 Q10-Q38 L669-699, L701 | "New (the sources did not settle them)" | Closed as recommended | SW | Mark closed |
| P25 | C18 L119, C19 L120, C20 L121, C21 L122, D16 L145, F25 L189, G9 L205 | decision-only gaps | Decided | FB | Close; keep follow-ups |
| P25 | A11 L79, A15 L83, C3 L104, D3 L132, D10 L139, D17 L146, E3 L155 | "question n" | Decided | SW | Name the action |
| P25 (Q11) | G-8 L391 | "(if question 11 is yes)" | Required | SW | Delete the condition |
| P25 | R2-15 L412, R2-20 L417, R3-6 L434, R3-7 L435; N8 L472; N-7 L617, N-12 L622, N-19 L629 | "(after question 13/14/15)" | Decided | SW | Remove the conditions |
| P25 | §10 #1 L709, #2 L710, #4 L712, #8 L716 | "Zeke decides" | Settled | FB | Mark settled |
| P23; P25 | §10 #9 L717; App B STF-086 L909, CASE-119 L911, BT-109 L912, TRG-284 L915 | CONFLICT | Settled | FB | Re-status |
| P25 | App B CLB-153 L1097, STF-083 L1023, TRG-035 L1045 | open questions | Closed | SW | Drop |
| P25 (Q25) | App B TRG-273 L1054 | "Accept or test" | Accepted untested | FB | Accepted offline |
| d55; P23 | App B STF-060 L938 | Outgoing BT "Still active until a removal date passes" | Label is the signal | RT | Restate |
| d55 | App B STF-035 L932, STF-028 L927 | "not the active BCBA" vs "still active"; "Does CR need the substitute?" | Order 82 → 234 → 288 → 135 | SW | Restate |
| d55 | App B STF-012 L918 | 131308 = typed supplier matched by name, NOT-BUILT | Retired (as CASE-077) | RT | Move to App A |
| d38 | App B BT-025 L971 | BLOCKED A-22 | Decided | FB | PLANNED (U-32) |
| BP 4.14 | App B STF-006 L1061 | `current_primary_bt` workflow PENDING | Retired | FB | Move to App A |
| P14 (likely; needs Zeke) | C11 L112; GC-106 L916; TRG-285 L994 | "No production rollout is authorized" vs Danny | Ruling B implies rollout in two phases | FB | Ask Zeke to confirm |
| all | §1 L17; §2 L29-39 | "48 blocked, 10 in conflict" | About 24 blocked and 3 in conflict | SW | Recount |

### 2.5 Ledger: 55 findings (FB 22, WV 14, SW 14, RT 4, MT 1)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| R02 | header L14 | fan-out lines "become BLOCKED on O-21" | Case path | FB | Replace the caveat |
| R02 | OBJ-033 L79 | "BLOCKED on O-21 if no Contact webhook" | Optional code | SW | OFFLINE-ONLY |
| R02 | OBJ-034 L80 | "needs … (O-21)" | Case path | FB | K1 restated |
| R02; d24 | OBJ-035 L81 | "Fan-out reads the Guardian Contact" | HubSpot sync | SW | OFFLINE-ONLY |
| R02 | STF-076 L194 | "the fan-out finds the Case by it" | HubSpot sync input | SW | Reword |
| R02 | STF-077 L195 | BLOCKED on O-21 if no webhook | Case path | FB | Cite R1-1/R2-1/R3-1 and K1 |
| d24 | STF-078 L196 | waits on F22 | Decided by d24 | FB | COVERED / OFFLINE-ONLY |
| R02 | CASE-053 L279 (X02-5) | path "fan-out, then poller" | Case workflow or poll | WV | Restate X02-5 |
| R02 | CASE-049 L275 | "Fan-out BLOCKED on O-21" | Case path | FB | K1 (email) by both paths |
| R02 | CASE-062 L288 | webhook "U-04" | Case path | WV | Replace |
| R02 | CASE-063 L289 | "Fan-out BLOCKED on O-21" | Case path | FB | As CASE-049 |
| R01 | CASE-159 L385 | `referral_source` via U-04/U-48 | Case sync → Case run | WV | Replace |
| R02 | CASE-172 L398 | CO/NJ via R2-23g/R3-13g as fan-out rows | Case path | WV | Restate those rows |
| R02 | CASE-174 L400 | BLOCKED on O-21 if no webhook | K1 Case path | FB | Restate |
| R02 | CASE-175 L401 | `contactChange` → fan-out | Optional code | SW | OFFLINE-ONLY |
| R02 | CASE-177 L403, CASE-178 L404, CASE-179 L405, CASE-180 L406 | webhook U-04, poller U-48 | K1 by both paths (U-48 tests `location` only) | WV | Replace |
| R02 | CASE-182 L408 | K4 | Optional code | SW | OFFLINE-ONLY |
| R02 | CASE-184 L410 | BLOCKED on O-21 | Case gate (G-2, G-6, G-7) | FB | Restate |
| R02 | CASE-186 L412 | Contact workflow at cutover | Not needed | RT | RETIRED, pending Zeke's word |
| R02 | CASE-188 L414 | via U-04, R2-23g, R3-13g | Case path | WV | Restate |
| R02 | CLB-063 L833 | "depends on O-21" | Case trigger list (K6) | FB | Replace |
| R02 | CLB-069 L839 | BLOCKED on O-21 | Case path | FB | Replace |
| R02 | CLB-133 L888 | "fan-out needs a Contact webhook" | U-48 is the Case path | FB | Restate |
| R02 | LBL-080 L986 | depends on O-21 | Optional code | SW | OFFLINE-ONLY |
| R02 | TRG-128 L1129 | BLOCKED, needs O-21 | Optional code | SW | OFFLINE-ONLY |
| R02 | TRG-141 L1142 | production Contact workflow | Not needed | RT | RETIRED |
| R02 | TRG-142 L1143 | BLOCKED O-21 | Not needed | RT | RETIRED |
| R01 | TRG-143 L1144 | "Fan-out needs O-21" | Case path | WV | K1 by both paths |
| R02 | TRG-145 L1146 | needs O-21 | Case gate | FB | G-2/G-6 |
| R02 | TRG-146 L1147 | needs O-21 | K1 Case run, no CR contact | FB | Restate |
| R02 | TRG-159 L1160 | needs O-21 | Superseded | RT | Restate as met by Case sync |
| R01 | TRG-195 L1203 | BLOCKED on O-21 | Case path | WV | K1 |
| R01 | TRG-217 L1225, TRG-218 L1226 | poller U-48 | K1 by poll | SW | Replace |
| R02 | TRG-263 L1280 | BLOCKED O-21 | Optional code | SW | OFFLINE-ONLY |
| R02 | TRG-269 L1286 | O-21 | Case run | FB | K1 |
| R01 | TRG-289 L1306 | webhook U-04 | K1 | WV | Replace |
| R01; P25 (Q13) | TRG-316 L1333 | webhook U-04; Q13 open | K1/C20 Case run; Q13 decided | WV | Replace |
| R02 | TRG-317 L1334 | O-21 | K1, U-27, U-33 | FB | Replace |
| R01 | TRG-190 L1198 | K1 expects the fan-out | Case run | WV | Fixed by restating K1 |
| R01 | cited M K1 L280, U-04 L507, R2-23g L468, R3-13g L492, G-5 L429, U-48 L552; SU-6 L402 | no row expects a Case run with `source` recorded after a Guardian edit; SU-6 does not check the Guardian triggers | Current rule | MT | Restate K1, R2-23g, R3-13g; add the four Guardian fields, `location` and `referral_source` to SU-6 |
| d36 | TRG-009 L1005 | C9 test values per round | Second phone dropped | SW | Note it |
| d49 | BCBA-171 L588 | "BCBA `email` = the Contact email" | The BCBA's own `email` | SW | Reword |
| P25 (Q13) | header L15; BT-104 L726; BT-151 L773; TRG-140 L1141 | wait on question 13 | Decided (Zeke's workflow check) | SW | Prerequisite |
| P25 (Q34) | CASE-119 L345 | BLOCKED, waits on Q34 | Keep the code | FB | COVERED by C23 |
| P24 | BT-036 L658 | "package Q24 still open" | Closed | SW | Delete |
| d17; Q15 | BT-109 L731 | BLOCKED, waits on Q15 | Decided | FB | COVERED |
| F23; RN names | BT-149 L771 | BLOCKED "#" names | Retired | FB | RETIRED |
| Q19 | CLB-153 L893 | BLOCKED | Decided | FB | COVERED |
| Q19 | TRG-118 L1114 | waits on Q19 | Decided | SW | Drop |
| P24 | TRG-084 L1080 | BLOCKED q24 | Closed | FB | PRODUCTION-ONLY |
| Q12 | TRG-164 L1165 | BLOCKED Q12 | Accepted, measure once | FB | COVERED (U-15) |
| Q25 | TRG-273 L1290 | BLOCKED Q25 | Accepted untested | FB | OFFLINE-ONLY |
| Q24 (master) | TRG-284 L1301 | BLOCKED | Decided | FB | PRODUCTION-ONLY |
| all | totals L23-35 | "GAPS: 0" | About 17 lines have no valid proof on at least one path; 9 false BLOCKED | WV | Restate the rows, recount, re-run the 0-gap check |


### 2.6 Matrix and run sheet, plus the two sandbox scripts they rely on: 39 findings (FB 15, SW 13, WV 6, MT 5, RT 0)

| Override | Where | What it says | What is current | Effect | Fix |
|---|---|---|---|---|---|
| P16 | M L77 (round 1 notes) | the script sets `care_coordinator_name` | Item 6 fields | SW | Reword |
| d53 | M L78 | sets `dob` = B5, `date_of_birth` = decoy | Reverse: B5 is `date_of_birth`, `dob` is the decoy | SW | Reverse the sentence |
| d50 (T9) | M L80 | "code at 793e2db still requests `personal_email` on the BT/RBT … push waits" | Held; not requested | SW | Strike |
| d58 | M BR10/BR3 L148 | "no format check yet (O-8)" | 7-digit check | SW | Replace |
| R02 | M C6 L180, C7 L181, C8 L182 (U1) | "via K1" | Case sync property → Case webhook or poll | SW | Replace |
| R02 | M C8 unreadable L183 | "from the Contact fan-out, K1, or the Case `phone` webhook" | Case webhook or poll | SW | Drop the fan-out |
| d56 | M C24 L200 | lists `full_home_address` among the set properties | Not read, not set | SW | Remove |
| d56 | M C24 U1 L200 | "`service__stateregion_2` blank → the Case state" | The script always fills it, so the fallback is never exercised | MT | Blank it in an S4 step |
| P15 | M C25 L201 | no junk Address 2 case | `null` | MT | Add an R3 More Than One Location step `",  , New Jersey "` → 138091 blank |
| P16 | M C36 L212 | waits on "the build change, item 2" | Built | SW | Delete condition (1) |
| R02 | M K1 L280 | "Log (fan-out queued 1 Case)" | Case run `source` `hubspotWorkflow` (or `intakePoller`) | FB | Change the check |
| d44 | M K3 L282 | "K1 checks that the fan-out queued 1 Case and no BCBA" | No fan-out | SW | Reword |
| R02 | M K4 L283 | Contact `test_record` → "fan-out queues nothing" | Optional code | FB | Optional; out of P1 |
| O-26 | M K5 L284 | "The daily sweep is the fallback" | Poller, then sweep | SW | Reword |
| P16 | M exclusions L299 | "138851 = `care_coordinator_name`" | First + last when `ready` | WV | Replace |
| P18 | M L327 | "update-with-blank rule is HELD (question 27)" | Decided | SW | Strike |
| P16 | M L370 | "Decision 39: C10 reads `care_coordinator_name`" | Superseded | SW | Add the supersession |
| P15-P19 | M L389 and tags at C10 L186, C12 L188, C26 L202, C28 L204, R2-17 L456, R2-27 L472, R2-29 L473, R3-16 L494, R3-17 L495, R3-18 L496, U-14c L519, U-49 L553, L580 | "(build pending)", "being built", "rule 7 test pending" | In the WT (uncommitted) | SW | Replace with "built, uncommitted" |
| R02 | M path legend L389 | "fan-out" = Contact webhook | Optional; Guardian rows use "both" | SW | Add a note |
| R02; d51 | M SU-6 L402 | trigger check lists only `service__stateregion_2` and the coordinator fields | Must also list `guardian_first_name`, `guardian_last_name`, `email`, `phone`, `location` (and `referral_source`) | MT | Add them |
| R02 | M G-5 L429 | "Contact fan-out … BLOCKED on O-21" | Case run `skipped` `record_gate` | FB | Path "both"; drop BLOCKED |
| R02 | M R2-23g L468 | "`contactFanOut` queued 1 Case … BLOCKED on O-21" | Case `phone` sync → Case webhook | FB | Restate |
| P15 | M R2-27 L472 | `home_apt` = "Colorado" → `null` | The junk rule covers C25 (`service_address__other` → 138091) only; core `home_apt` has none (`buildClientPayload.mjs:54`) | WV | Replace with the C25 junk row |
| R02 | M R3-13g L492 | as R2-23g | Case path | FB | Restate |
| R02 | M U-04 L507 | "sends a Contact webhook … BLOCKED on O-21" | Case path, `source` `hubspotWorkflow` | FB | Restate |
| R02 | M U-48 L552 | "no run within one poll = depends on O-21" | A trigger-list gap for Zeke | FB | Restate |
| R02; R06 | M X02-5 L599 | "fan-out, then poller" | Path "both"; no Case property change, so no run or `noop` | FB | Restate |
| R02 | RS #2 L14 | prerequisite "sandbox Contact workflow (O-21)" | The Case trigger list holds the Guardian sync fields | FB | Replace |
| R02 | RS S3b L71 | G-5 "(fan-out; BLOCKED on O-21 …)" | Case path | FB | Replace |
| R02 | RS S4 L78 (old line 64) | reuses "fan-out queued 1 Case" | Case run `source` | FB | Add line 64 to the change list |
| P19 | RS S4 L78 (old line 44) | Meta 126214 "No" | "None" | WV | Add to the change list |
| d54 | RS S4 L78 (old line 48) | "Dr AzT 1 Commercial, 2000000001" | One space, no comma | WV | Add to the change list |
| P15 | RS S4 CO L79 | `home_apt` → "Colorado" (R2-27) | C25 on a More Than One Location Case | WV | Move to NJ / C25 |
| R02 | RS S4 L79, L80 | Guardian `phone` (R2-23g / R3-13g) as fan-out | Case path | FB | Relabel |
| R02 | RS S7 L101 (K4, old 72-74) | "`contactFanOut` skipped … Needs the Contact webhook" | Optional | FB | Not P1 |
| P19 | RS S7 L101 / S5 L92 (old line 76) | Meta 133826 "Level 3" | "3" | WV | Restate |
| R02 | RS Q1 L134 | "Without it U-04, G-5, R2-23g, R3-13g … become BLOCKED" | Only K4 needs a Contact webhook | FB | Settle (Zeke to confirm) |
| P16 | `scripts/sandbox/create-test-records.mjs` L265-267 | `care_coordinator_name` set to the same name as the new fields | Not read; it should be a decoy | MT | Give it a different value |
| P19, P16 | `scripts/sandbox/check-cr-record.mjs` L202, L215 | "being built"; "FAILs until the build change" | Built | SW | Update the comments |
| (not a recency override) | M X07a-1 L606; path legend L389 | BT/RBT poll `source` `intakePoller` | Employee poll runs carry `employeePoller` (`intakePollerWorkflow.mjs:84`); only the Case poll is `intakePoller` (`:101`) | WV (extra; not counted above) | Use `employeePoller` for BT/RBT and BCBA |

### 2.7 The source documents are themselves stale (outside the audited set; listed so the fixes land in one place)

- **BUILD-PLAN.md** (last edited 11/24 10:53):
  - Decision 55 text (L194) still says "a blank supplier sends blank" and "Held: rule 7 … typed supplier as typed".
  - C10 (L620) still names decision 39 and O-53.
  - C12 (L622) says "A blank typed supplier clears 131308 (O-58)".
  - C13, C25, C26, C28 and C36 rows: "held/not built" (O-54, O-55, O-56, O-60).
  - B5 (L671): "held for review (O-52)".
  - B10 (L676): "Label or profile field? (O-27)", answered by P26.
  - K1 (L725) "Waits on O-21"; K5 (L729); Stage 6 note L925, "Live testing … waits for the sandbox Contact workflow (O-21)".
  - O-21, O-27 and O-52 to O-60 (L1029-1068) still open.
  - O-15 and O-16 rest on decision 55 without the 11/24 confirmation.
- **BUILD-PACKAGE-DRAFT** still assumes a Contact workflow exists: D18 a (L767), L818 ("the Contact workflow only fans out"), BR4-X step 2 "(fan-out)" (L871), L932, G24 (L1016).
- **scripts/check-triggers.mjs** L13-14 still says `CONTACT_TRIGGER_PROPERTIES` are for "a Guardian or BCBA Contact change". The BCBA half is retired (d44), and under section C the Guardian half belongs on the Case list, which already carries the four properties.


---

## Section C. The Contact workflow, settled as far as the sources allow

### C1. What the integration reads from a Contact today (pending build = deployed; `git diff 655b385 -- src/workflows/contactFanOutWorkflow.mjs src/lib/hubspotWebhook.mjs src/functions/hubspotWebhook.mjs` is empty)

- **Contact properties read: one, `test_record`.** It is read only inside `src/workflows/contactFanOutWorkflow.mjs` (L86-105), plus the Contact → Case association list (L108-113).
- **No Contact value feeds any CentralReach payload.** A search of `src/` (tests excluded) finds no other read of object `0-1`.
- **The fan-out after decision 44.**
  - A `0-1` webhook (`src/lib/hubspotWebhook.mjs:101-103`) becomes one `contactChange` message (`src/functions/hubspotWebhook.mjs:129-137`).
  - The fan-out skips a `test_record` Contact.
  - It queues one ordinary `clientSync` message (source `contactFanOut`) for every Case associated with the Contact, whatever the association type or `contact_category`.
  - It queues nothing else: no BCBA, no BT/RBT, no CentralReach call, no HubSpot write.
  - Each queued Case is then gated and compared by the normal Case worker. That worker reads the Guardian values from the Case's own properties.
- **The Case reads** `guardian_first_name`, `guardian_last_name`, `email` and `phone` from the Case (`src/mappings/client/clientProperties.mjs` mapped list L23-31; `buildClientPayload.mjs` L48-59).
- **Employees read nothing from the Contact.**
  - BCBA personal email: the BCBA's own `personal_email` (d50).
  - BCBA primary email: its own `email` (d49).
  - BT/RBT personal email: held (T9).

### C2. Does a Guardian Contact edit reach the integration through the Case?

| Path | What the sources show | Confirmed or inferred |
|---|---|---|
| Guardian values are Case properties | Guide 11/09 L508 ("The integration reads these from the Case directly"), L509, L788, L891; Change Log L1314; BP d24; code above | **Confirmed** (guide and code agree) |
| Case workflow (webhook) | Historical W1 (50850427, guide L1048-1061) triggers on `guardian_first_name` and `guardian_last_name` but **not** on `email` or `phone`. The current sandbox and production trigger lists are kept by Zeke in HubSpot (d51). No file records them. Zeke said "done / Workflow trigger lists" on 11/24 (prod-reads-output L5) without the list. `scripts/check-triggers.mjs` prints all four, because they are in the Case mapped list. Matrix SU-6 (L402) does not check them | **Inferred.** Not confirmed that all four (and `location`) are on the current Case trigger lists. Not confirmed that a HubSpot property-sync change fires a "property value changed" enrolment. Neither has been seen live: no Guardian edit has run yet (R1-U1 Push 5 not run) |
| Poller | The poller searches gated Cases by `hs_lastmodifieddate` (`intakePollerWorkflow.mjs:136-139, :192-265`). The four properties are in the Case mapped list, so the run sees and sends them (hash compare) | **Inferred.** The round-1 log (Contact edits bullet) states as an assumption that a sync write moves `hs_lastmodifieddate`; it is unproven |
| Daily sweep | Queues every linked, gated Case once a day, whatever changed (`intakePollerWorkflow.mjs:312-402`) | **Confirmed by code.** It backstops both the webhook and the poller, at up to 24 hours of delay |
| Contact workflow → fan-out | No `0-1` webhook reached the app in the retained 30 days (07 App Insights L849, L924). No Contact workflow is known to exist in sandbox 52311591 | **Confirmed absent live** |

### C3. BT/RBT and BCBA Contact-synced fields

- **BT/RBT mirrors** (matrix L100-108; 04 L23):
  - `street_home` ← `address`
  - `location_city` ← `city`
  - `state_home` ← `state_dropdown`
  - `postal_code_home` ← `zip`
  - `employee_phone` ← `phone`
  - `email` ← `email`
  - `gender` ← `gender_employee` / `gender`
  - `date_of_birth` ← Contact `date_of_birth`, a text property sync
- **BCBA mirrors** (guide L410, L577; matrix L100): `address`, `apartment__home`, `city_home`, `state_home`, `postal_code_home` and `employee_phone`. Production `email` is also a mirror ("change it on the contact record").
- **How an edit reaches the integration.**
  - It goes the same way as the Guardian fields: the mirror property changes on the employee record, then the BT/RBT or BCBA workflow (if the mirror is on its trigger list, d51), the employee poller (source `employeePoller`) or the daily sweep carries it.
  - There is no fan-out branch for employees (d44), so a Contact workflow would not help them either.
  - Whether a mirror change fires the employee workflow is still open as **O-26**. It is answered by the R1-U1 edits (U-27, U-33) when their `source` is recorded.

### C4. Is a separate HubSpot Contact workflow still required?

**What each source says**
- **Guide.**
  - Undated GER rows L452, L455 and L456, the 10/28 request at L790, L822 and L860, and the 11/02 change log L1268 ask for a Contact workflow for "Guardian name/email and BCBA personal email".
  - The later 11/09 Zeke notes (L508, L509, L788, L891) make the Guardian values Case sync fields read from the Case.
  - On the latest-note rule, the guide's own current answer for the Guardian is the Case.
  - The guide never retracts L455.
- **BUILD-PLAN.**
  - K1 is "built 6", waiting on O-21 (L725).
  - K2 is "built (old)" from the Case sync properties (L726).
  - K3 is retired (d42, d44).
  - Stage 6 live testing "waits for O-21" (L925).
  - O-21 is open (L1029).
  - The BCBA half of the original request is gone (d42, d44, d50). BUILD-PLAN never re-asks whether the Guardian half still needs it.
- **Package.** It assumes a Contact workflow exists and needs no segment (D18 a L767, L818, L932; BR4-X step 2 L871).
- **Code.** The Guardian requirement is met without any Contact read. The fan-out is working but optional code.

**What is confirmed**
- Neither requested purpose of the Contact workflow needs a Contact read any more.
- Nothing in `src/` needs a Contact webhook to send a Guardian change to CentralReach.

**What is inferred, and still needs a live check**
- A Guardian edit fires the Case workflow (needs all four Guardian properties, and `location`, on the Case trigger list).
- A Guardian edit moves the Case's `hs_lastmodifieddate`.

**Where the sources disagree** (not decided here): the guide's GER rows and the package versus the guide's 11/09 notes and the code. O-21 should go to Zeke as a one-line confirmation, not be closed by this audit.

**Rows marked BLOCKED, or conditionally blocked, on O-21, with their restatement**

| Row | File | Restatement |
|---|---|---|
| TRG-128, TRG-263 | 07 (Status BLOCKED); master App B L987, L992; ledger L1129, L1280 | Optional fan-out code: OFFLINE-ONLY (`stage6ContactRouting.test.mjs` [K4][6.2], [K1][6.1]); live only if a Contact webhook is ever built |
| TRG-142 | 07 (BLOCKED); master L988; ledger L1143 | RETIRED (superseded by the 11/09 Case sync), pending Zeke's word |
| TRG-141, CASE-186 | 07, 02 (PENDING); master L1072, L1110; ledger L1142, L412 | RETIRED for the Guardian half. Replace with "the production Case refresh workflow triggers on `guardian_first_name`, `guardian_last_name`, `email`, `phone`, `location` (d51; Ruling A deploys it from the sandbox)" |
| D8, K6, K16(2), §4.10, Q9 | master | Remove O-21; the Guardian test is the Case path below |
| CASE-049, -062, -063, -174, -177 to -180, -184, -188; OBJ-034; STF-077; CLB-063, -069, -133; TRG-143, -145, -146, -159, -195, -269, -289, -317 | 02, 01, 05, 07, ledger | "Edit the Guardian Contact's phone (or email, first name, last name, state); the Case sync property changes; the Case workflow sends the webhook (or the poll queues the Case); the run's source is `hubspotWorkflow` (or `intakePoller`); CR shows the new value." A run that arrives only by `intakePoller` while the Case workflow is on is a trigger-list gap for Zeke |
| K1, U-04, R2-23g, R3-13g | matrix L280, L507, L468, L492 | As above. U-04 also checks "one Case run, no BCBA run" |
| G-5; RS S3b L71 | matrix L429; package BR4-X step 2 | "Edit the R1 Guardian Contact's `firstname`; `guardian_first_name` changes; the Case workflow sends the webhook; the run ends `skipped` `record_gate`, `crCalls` empty; the poller does not queue it" |
| U-48 | matrix L552 | "Guardian `state_dropdown` → New Jersey; Case `location` recalculates; Case webhook if `location` is a trigger, else the poll; record `source` and delay; NY Client removed, NJ Client added." No run within one poll is a Case trigger or K6 item, not O-21 |
| X02-5 | matrix L599 | Path "both"; a second Guardian's edit changes no Case property, so no Case run (or `noop`); CR unchanged |
| K4; RS S7 L101 | matrix L283 | Optional fan-out code; not P1 |
| RS L14, L134 | run sheet | Replace "sandbox Contact workflow (O-21)" with "the Case trigger list holds the four Guardian sync fields and `location`" |

**Count of O-21 rows**
- Status BLOCKED on O-21: 3 slice rows (07: TRG-128, TRG-142, TRG-263). The same 3 appear in master Appendix B and in the ledger's BLOCKED class.
- PENDING on O-21: 2 (CASE-186, TRG-141).
- Conditionally "BLOCKED on O-21 if no Contact webhook": 18 ledger lines (counting the header caveat), 5 matrix rows (G-5, U-04, R2-23g, R3-13g, U-48) and 3 run-sheet steps (L14, L71, L134).

**Recommendation.** Ask Zeke to confirm in one line that O-21 is superseded for the Guardian fields. Then:
- retire K1's O-21 dependency and the production Contact workflow;
- add the four Guardian sync properties and `location` to the Case trigger check (SU-6, cutover 4.10);
- re-state the Guardian rows on the Case path, recording `source`.

---

## Section D. Guide lines that are stale against a later source (for the guide inserts)

Insert-only notes are needed at each line; the guide itself is not edited by this audit. 08-guide-currency.md §5.1–5.5 covers many of these; this list adds the Contact-workflow lines and the 11/24-afternoon answers.

| Guide line(s) | What it says | Later source | Note needed |
|---|---|---|---|
| L455, L790, L822, L860, L1268, L1598, L1608 | Create a 4th (Contact) ongoing workflow for Guardian name/email and BCBA personal email; "it's actually 4 objects" | 11/09 L508-509; BP d24, d42, d44, d50 | The Guardian values are Case sync fields; the BCBA personal email is the BCBA's `personal_email`; no Contact workflow is needed (subject to Zeke's word on O-21); the Case trigger list carries the four properties |
| L452, L456 (Guardian half) | Ensure Guardian Contact changes reach the linked Case; test Contact changes reach the Case | 11/09; code | Met through the Case sync properties and the Case workflow, poll or sweep |
| L409, L453, L456 (BCBA half), L420 ("Verify associated Contact email … propagate"), L421, L580, L788 (BCBA clause), L892, L901 | BCBA personal email from the linked Contact (type 17); a sync property is planned | d42 → d50; d44 | Personal email = the BCBA's `personal_email` (Meta 138069); no Contact read; BT/RBT personal email held (T9) |
| L341, L408, L576, L208 (G20 test record) | BCBA primary email `ucaba_email_address`; G20: `email` is the personal email | d49, d50 | Primary = `email`; personal = `personal_email` |
| L341 | "Updates send the email CR already holds"; "saves the record as blocked" | d47, d43, BR9 | An update sends HubSpot's email; malformed → `error`; `blocked` retired |
| L342 | BCBA `date_of_birth` to be created "as the same property sync"; the update rule | d45, d53; P18 | Single-line text, read by `readTextDate`; placeholder on a create only; update sends back CR's date (option a) |
| L346 | Client DOB "Not checked before the create" | BP C3 | Checked: `error`, no create |
| L337 | BT/RBT ContactForm "Behavior Technician NY" | d17 | Colorado → `RBT CO` |
| L338, L405, L432 (11/17 Danny clauses) and L210 (G20 AZTEST IDs) | Workday ID hold; `AZTEST-N-…` test values | 11/17 Zeke (same lines); d58 | Temporary ID; a filled ID must be 7 digits; test IDs must be 7 digits |
| L204 (G20) | `phone_number__second_` on test Cases | d36 | Dropped |
| L274, L284, L339, L340 | "Code today …" statements | Built (BR9, Stage 1, 5) | Remove the "code today" clauses |
| L280 | One record-gate checkbox chosen at go-live | d52; P14 | Two properties, `centralreach_creates_only` / `centralreach_updates_only`; existing records are phase 2 |
| L250 | Create signal open | d8 | Stays Entered = Yes |
| L361, L510 (and L773 owners scope for the Case) | Care Coordinator via the owners API | d39 → P16 | `care_coordinator_first_name` + `care_coordinator_last_name` when `coordinator_export_status` = ready; owners scope not needed for the Case |
| L363, L366, L512, L552, L555, L556 | Typed supplier matched by name; Outgoing 135 "not active" vs "still active"; SUB "does CR need it?" | d55; P17, P20, P23 | Order 82 → 234 → 288 → 135 + " BCBA LBA"; Grad Permit → the holder's 151 supervisors; blank supplier sends nothing; mixed holders → both left out; On Leave never read |
| L364, L513 | Grad Permit marker pending | d55 | "<First> <Last> Grad Permit Holder" (136052) |
| L365, L561 | Outgoing BT active "until a removal date passes" | d55; P23 | The label is the signal; no date logic |
| L369, L517 | Availability text + weekly hours | d54 | Text alone |
| L370, L518 | `total_hours_bt1bt2_work_schedule`; ignore `total_hours_btrbt_12` | d40 → d41 | Code sum of `hours_bt_work_schedule_1` + `bt_rbt_2_work_schedule` |
| L373, L521, L522 | `full_home_address`; Address 2 as is | d56; P15, P22 | Two-line form from parts; junk Address 2 → `null`; split a whole street only when a state precedes the ZIP |
| L374, L377 | Allergies / Severity mappings | P19 (items 3, 8) | CentralReach forms; `Confirmed` + none-like → "Yes"; Severity digit |
| L380, L530 | Physician pair | d32, d54 | Chosen by `n1_what_type_of_insurance`; "<name> <npi>" |
| L382 | `referral_source` only | P16 (item 2) | Plus `referral_other` when Other |
| L383, L384, L418, L605, L608, L609, L693 | 11/17 add-only; 11/18 held until the label test | d13, d14 | Hold lifted; managed labels; base labels kept |
| L384, L294, L609, L735, L832, L1298, L1432 | Six staffing labels | G19 (L220-222); d15 | Three labels; retired IDs removed if present |
| L256, L605, L735 | Staffing label IDs "constants only, nothing sent" | Built (CL4) | Sent |
| L387-389, L672-679 | Funding-source label rules | G19 L226; d15 | Excluded (no payor tags) |
| L413, L439, L686, L700, L741 | Skip NM / VA | G19 L234 (labels exist); O-6, PKG item 11 | Labels exist, not sent until a HubSpot value exists (deferred, phase 2) |
| L416-417, L692 | Credential label targets | d25; Q21 | Only NY Medicaid sent; others not built, not blocking |
| L440 | Role by state (no CO note; no blank-type rule) | d16, d35 | Colorado included; blank or other type → no role label |
| L392, L420, L442, L1040-1194 (W1-W6) | Production workflows must cover all mapped fields; W1 lacks Guardian email/phone | d51; P13 | Triggers are owner-maintained; Case list must include the four Guardian properties and `location`; sandbox workflows deployed to production |
| L442, L455 (staff mirror propagation "verify") | — | d44; O-26 | Employee workflow / poller / sweep; no fan-out |
| L599, L771 | Active Case Load metadata ID "still to be added" | 11/16 L438 (147882) | Built (T7) |

---

## What the audit did not check

- **No live reads.**
  - No HubSpot, CentralReach or Azure call was made.
  - The current sandbox and production Case, BCBA and BT/RBT workflow trigger lists were not read. So "are the four Guardian properties on the Case trigger list?" is unanswered.
  - Whether a HubSpot property-sync change fires a workflow enrolment or moves `hs_lastmodifieddate` was not tested.
- **The live Google Doc was not read.** The snapshot `guide-extract-2026-11-24.md` (revision `AHj4eMRPez…`) stands in for it; the live guide wins.
- **The checkers' work was spot-checked, not fully re-verified.**
  - Six read-only checkers read every row of the ten audited files against one rules digest. I spot-checked their key claims: the WT contents for each 11/24-afternoon item, the employee poll `source`, Salaried (PKG L715), and Zeke's "done / Workflow trigger lists".
  - I did not re-read every row myself.
  - Line numbers are as read on 2026-11-24. The WT is uncommitted and may drift.
- **Table 1 is excerpts, not full text.**
  - Table 1a was generated mechanically. Excerpts are cut at about 230 characters, and "author" is taken from the start of each fragment.
  - Table 1b gives the first part of each decision.
  - The Agent Context Index (L20-178), the Change detection Architecture tab (L1616-1755) and the Lucid and Github tabs were not walked for dated notes. 08-guide-currency.md §5.2 covers the index.
- **Files not audited.** `08-guide-currency.md`, `OPEN-ITEMS.md`, `REMAINING-GAPS-2026-11-23.md`, `SANDBOX-TEST-PLAN.md`, `GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md` and the round logs were not audited row by row. They were used only as cited.
- **Counts are the checkers' totals.**
  - Some rows in table 2 group several lines, so the row count in the tables is lower than the finding count.
  - The master's Appendix B repeats slice rows, so the same stale reading is counted once per file it appears in.
- **Calls not made for Zeke.**
  - Whether Ruling B settles RG D15 ("No production rollout is authorized") is flagged as likely; it needs his word.
  - Whether E10 also retires matrix row B10 was read as no (P26/P27).
