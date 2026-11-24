# Guide insert draft: production gating, decisions of 11/23 and 11/24, crosswalk and index lines

**Status: FINAL TEXT FOR ZEKE'S APPROVAL, 2026-11-24 (third pass, after the independent review; corrected the same day against the requirements recency audit, which adds Batch 3); nothing written to the doc.**

**Confirmed by Zeke, 2026-11-24:** "Yes, all three", to (1) "Care Coordinator field 138851 is not omitted, as your decision."; (2) "Phase one records still receive later updates. The gating insert says a record the integration created in phase one gets its later HubSpot changes sent to CentralReach; only records that already existed in CentralReach wait for phase two."; (3) "'these rules are rig' means 'right', for the outgoing-roles rule." Applied: X-15+45 and X-15b read "11/24 — Zeke" for 138851; A bullet 6's last sentence is part of his bullet; X-20 and X-21a keep "— Zeke".

## How to read this file

- **The texts** are under "Batch 1 texts, verbatim" (46 inserts, 35 texts: decisions and corrections, written first) and "Batch 2 texts, verbatim" (34 inserts, 26 texts: process notes, findings, test plan, history, index lines, written after a fresh read). The tables above each list say where each text goes; the JSON blocks are the exact requests. **80 inserts, 62 distinct texts** in Batches 1 and 2 (one text can go to two places, for example C and C2; X-36a now has its own text), plus **Batch 3 (51 inserts, 23 texts)** from the recency audit, near the end of this file. Inserts changed by the audit carry "(corrected 2026-11-24 recency audit)" in their heading. The label counts below were made before the audit pass and are not recomputed.
- **The seven you approved on 11/24 ("Yes, all 7"):** A, B, C, D, E, C2, E2. **Unchanged:** B, D, E, E2. **Changed:** A, C, C2; before and after are under "Changed since Zeke approved it". In short: A bullet 4 now says the production deploy waits until each property exists (before: "its change does not ship in that deploy"); A gains bullet 6 (the two phases, in your words, ending with "a record the integration creates in Phase I still receives later updates", which you confirmed) and bullet 7 (the creates workflow triggers on Entered = Yes, filtered on "created after the cutover date"); C and C2 gain "More Than One Location uses the home parts" and the whole-address rule; C also gains the Address 2 rule (an Address 2 holding only commas and a state is not sent, and one the integration wrote earlier is cleared).
- **Labels in the texts** (every text but the five index lines carries at least one; the callout explains them in the doc). Count of labelled statements, with the number of distinct texts carrying the label in brackets, batch 1 + batch 2:

| Label | Means | Batch 1 | Batch 2 | Total |
|---|---|---|---|---|
| "11/2x — Zeke:" | A rule in his recorded words | 48 (29) | 10 (10) | 58 (39) |
| "11/2x — Decided (Zeke approved the recommendation):" | A recommendation he approved ("Let's do your recommendations please", 11/23; "On the remaining open items, apply your recommendation.", 11/24), in the team's wording | 12 (10) | 5 (5) | 17 (15) |
| "11/24 — Decided (applied from Zeke's 11/24 rulings):" | Follows from his rulings A and B (X-08 only) | 1 (1) | 0 | 1 (1) |
| "Finding (read 11/23)" / "Finding (read 11/24)" | What a read-only check of HubSpot, CentralReach or the code found | 9 (9) | 6 (5) | 15 (14) |
| "11/24 — Proposed, for Zeke to confirm:" | A rule nobody has decided | 6 (5) | 0 | 6 (5) |
| "11/24 — Note:" | An explanation, not a rule (the callout, X-31) | 1 (1) | 1 (1) | 2 (2) |

- **New in this pass:** N-Q12 (item 10 roles have no change signal), N-12 ("RBT CO" form), N-19 (label removal rule), N-G02 (pointer at the G02 Care Coordinator bullet), all in batch 2; X-34 merged into X-12a at the Mailing Address row. Everything else in this pass is a label or wording change; see "Third pass (2026-11-24, after the review)" at the end.
- **Still open for you** (not blocking the write): "Open questions for Zeke" near the end.

- Doc: "United Care ABA - CentralReach-HubSpot Integration Guide for Zeke - V 2.0", file ID `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`. Read with the Docs connector `read_doc` (structural read, read-only). No update, create, delete, share or comment call was made.
- History: drafted 2026-11-23 (inserts A to E, Option 2 gate); text of A, B, C, D, E, C2, E2 approved by Zeke 2026-11-24 ("Yes, all 7"; bullet 3 of A confirmed; C and E repeated in section 3 as C2 and E2, in the "HubSpot internal name and notes" column). This second pass applies master section 7.3, Zeke's later 11/24 decisions, and adds the callout, the crosswalk texts (X-01 to X-45, `requirements-review-2026-11-24/08-guide-currency.md` section 5.1) and the index lines (section 5.2), and the Auth Period and Contact fan-out notes (master questions 34 and 35).
- Sources: `BUILD-PACKAGE-DRAFT-2026-11-23.md`, `SANDBOX-TESTING-HANDOFF.md` (State 2026-11-24), `BUILD-PLAN.md` (decisions 52 to 60, O-52 to O-62), `requirements-review-2026-11-24/00-MASTER.md` sections 7 and 9, `08-guide-currency.md`, `02-case-client.md` questions 3 and 4, and Zeke's later 11/24 decisions as forwarded by the orchestrator (listed below).

## Live read

- **Revision ID** (use as `writeControl.requiredRevisionId` for batch 1): `AHj4eMRPezFuAAC4e20nsGnogSdORej3tkyX6RHwJuU9tHx6rVqOKBnzzsccHRuoEd7F3bFyxU-LekcqPb9Pd0FZt_AsCwXigOu49rOqZqM`
- **Read:** 2026-11-24 18:34 UTC, full structural read (6 tabs, 2,402 paragraphs).
- The revision is the one the 11/24 snapshot (`guide-extract-2026-11-24.md`, modified 15:58 UTC) was taken from (prefix `AHj4eMRPezFu`); no edit since. The first-pass batch's revision `AHj4eMQ8YIxWuqzffxZ_…` is no longer live, so the old "Final batch" would have been refused. It is replaced below.
- The two paragraphs added today (extract L564–L565 and L583–L584) come after every approved anchor: A, B, C, D, E, C2 and E2 keep their first-pass indexes (19486, 18476, 35492, 43201, 32779, 67942, 65795), confirmed on this read.

## Checks on this read

- **Every anchor matched exactly once.** Paragraph anchors: the anchor text is found in one paragraph of the whole doc. Table anchors: the table is found by a unique text, then the row by its exact first-cell text, which is unique in that table (for example "Production workflows · To create" is matched once in each of the GER-CASE, GER-BCBA and GER-BT tables). Every target cell holds one paragraph, so each index is the position before that cell's final newline. No anchor is missing or ambiguous.
- **None of the texts is in the doc.** No match for "11/23 —", "11/24 —", `centralreach_creates_only`, `referral_other`, `personal_email`, `care_coordinator_first_name`, "Proposed, for Zeke", "Phase I", "Gavriella", "150,000" or any text's opening words. " BCBA LBA" appears only as CR licence labels; "date_of_birth" only in older notes.
- **Trailing line breaks.** The G02 bullet "Care Coordinator is the Case owner…" (N-G02) ends "…/crm/v3/owners/{id}", two soft line breaks, then a lone "."; N-G02 goes after that "." (index 61999), so it takes the "."'s plain 9.5 pt Calibri, not the Consolas of "{id}". (X-34's old anchor, the date-fields bullet, is no longer used.)
- **Third-pass anchors (N-G02, N-Q12, N-12, N-19).** Their live indexes come from the same 18:34 UTC structural read (same revision) that produced every other index here, with the same method: each anchor text or row is matched once (the [GER] lead paragraph by "Confirm removal rules where the guide"; GER-REQ row "Employee · ContactForm" and GER-CASE row "Staffing change signals" once in their tables). Every older index in this file was re-derived from that read and matches. All four are in batch 2, so their indexes are recomputed after batch 1 anyway.
- **Inherited style.** insertText takes the style of the character before it. GER cells (C, D, E and most X texts): 10 pt italic grey, like the cell. Section 3, 4 and 5 notes cells: 8.5 to 9.5 pt Calibri, like the cell. A and B: plain bullets in list `kix.w8e0gpk1ymd3` (A's line breaks make new bullets). Callout at [G00]: italic grey like that paragraph. X-30b (section 7 lead paragraph): bold, because the whole paragraph is bold. X-41a: the paragraph's dark grey. X-21b fills the empty normal paragraph right after the SCURRENT table, which inherits italic grey; one empty paragraph is left before the next heading. Index lines (batch 2): plain text like the index lines they follow; the new tags are **not** links (insertText cannot add a link). No insert lands after a link.

## Decisions reflected (Zeke, later on 2026-11-24)

| Decision | Where it lands |
|---|---|
| "Any property that exists in sandbox but not in production including the workflows, the lists, and the reports, will be deployed from sandbox to production" (handoff L9) | A bullet 6; X-08; X-15+45 |
| "Production will push in two phases: 1. Create records only. 2. Review of existing records … Any production discrepancies found between HubSpot and CentralReach are a phase two production build." (handoff L10) | A bullet 6; IDX-G17 |
| "This is Phase I versus Phase II production. Phase I: we will only be creating records from HubSpot into CentralReach that are new in CentralReach. Therefore, we will always need these records to contain the placeholder value until it clarifies how they handle this." (date of birth; an update with a blank date sends back CentralReach's date) | X-05/07/06 |
| Care Coordinator 138851 is not omitted (confirmed as his decision: "Yes, all three"); reads `care_coordinator_first_name`, `care_coordinator_last_name`, `coordinator_export_status`; "Referral - Other" reads `referral_other`; both built now and proven in the sandbox ("Sandbox testing: need to confirm fulfilling requirements is populated.") | A bullet 4; X-15+45, X-15b ("11/24 — Zeke"); N-G02; X-08a, X-08b |
| "7. Keep the behavior" (a HubSpot answer missing the CR ID property stays a visible `error`) | No guide text contradicts it; no text added (see Assumptions) |
| "9. these rules are rig" (item 10: Outgoing BT 1/2, order 82 → 234 → 288 → 135, On Leave never sent), confirmed as "right" ("Yes, all three") | X-20, X-21a ("11/24 — Zeke") |
| Phase I records still receive later updates (confirmed: "Yes, all three") | A bullet 6, last sentence |
| "On the remaining open items, apply your recommendation." Address 2 holding only a state → not sent; two Supervising BCBAs with one holder → both fields left out with a warning; Allergies and Severity confirmed; blank typed supplier sends nothing; whole address in the street field split only when a state comes before the ZIP; creates workflow triggers on Entered = Yes with "created after the cutover date" as a filter; master questions 12, 15, 19 and 29–35 | C, X-14; X-19a/b; X-09a/b, X-18a/b; E and E2 stand as approved; C, C2; A bullet 7; N-Q12, N-12, N-19; callout, C/C2 More Than One Location, A bullet 4 tense, both batches, X-41a/b, X-31, N-7, N-8 |
| "Let's do your recommendations please" (11/23, third set; the recommendation table is not in the repo, package assumption G12) | Labelled "11/23 — Decided (Zeke approved the recommendation)": X-23 (B21), X-08 (blank Other text sends "Other"), X-19 (holder read from `lba_licensure__ny` only), X-05/07/06 (BT/RBT date of birth as text) |

## Changed since Zeke approved it

Four of the seven approved inserts are unchanged: **B, D, E, E2** (E's "a blank supplier sends nothing" is now also the build rule, O-58). Three changed:

**A** (G17, after "Sandbox testing (Zeke, set up 11/17)"). Bullets 1, 2, 3 and 5 unchanged.
- Bullet 4, before: "…if a mapped property is missing, its change does not ship in that deploy, and if a gate checkbox is missing, every run fails and alerts. The integration reads the Case's care_coordinator_first_name, care_coordinator_last_name, coordinator_export_status and referral_other. The production Case sync workflow…"
- Bullet 4, after: "…if a mapped property is missing, the production deploy waits until it exists, and if a gate checkbox is missing, every run fails and alerts. The integration reads the Case's care_coordinator_first_name, care_coordinator_last_name, coordinator_export_status and referral_other: built now and proven in the sandbox first, and in production once each property exists in production and its change is deployed. The production Case sync workflow…" (master 7.3 tense fix, adjusted because both are now built in this build.)
- Added bullet 6: "11/24 — Zeke: production is pushed in two phases. Phase I creates records only: the integration creates in CentralReach only HubSpot records that are new in CentralReach. Phase II reviews the existing HubSpot records against the existing CentralReach records, so that the existing CentralReach records reflect HubSpot; any discrepancy found between HubSpot and CentralReach is a Phase II production build. Every property, workflow, list and report that exists in the sandbox but not in production is deployed from the sandbox to production. A record the integration creates in Phase I still receives later updates through the second workflow above."
- Added bullet 7: "11/24 — Decided (Zeke approved the recommendation): the creates workflow triggers on Entered = Yes, with "created after the cutover date" as a filter, so a new record whose Entered becomes Yes later is still picked up. New records created after the cutover need no further hold."

**C** (GER-CASE "Service Location Address and Address 2"). Before: the approved text alone. After: the approved text, then appended:
- "More Than One Location uses the home parts, as Child's House does." (master 7.3)
- "11/24 — Decided (Zeke approved the recommendation): a street that already holds a whole one-line address is split into the two lines only when a state comes before the ZIP at its end; the separate city, state and ZIP are then not added. Any other street is used as typed, with the separate parts on line 2." (O-59, recommendation applied)
- "Address 2 (service_address__other, More Than One Location only) is treated as blank when it holds nothing but commas and one state, for example ",  , New York ": nothing is sent, and an Address 2 the integration wrote earlier is cleared. Any other Address 2 is sent as stored." (package question 7, recommendation applied; it is the same cell, so it is part of C rather than a second insert at the same index)

**C2** (section 3 "Service Location Address", notes column). Before: the text of C. After: the text of C, then the More Than One Location sentence and the whole-address sentence above (Address 2 has its own section 3 row, X-14).

Third-pass change: A bullet 6's last sentence lost its "Proposed, for Zeke to confirm:" prefix (confirmed, "Yes, all three"). C and C2's first sentence keeps "11/23 — Zeke" although package assumption G12 (h) lists the structured-field source among the statements resting on the recommendation table: Zeke approved C and C2 with that label ("Yes, all 7"), and his own words back it ("Match CentralReach"; "Follow what's on the google doc as a requirement, then review what's in production, build the solution based on that please").

Reviewer change (2026-11-24 independent review): the before/after lines above now match the texts in Batch 1 after the review (A bullet 6 sentence added and bullet 7 re-labelled; C and C2 re-labelled; C's Address 2 sentence corrected). "Before" for A cannot be checked against the approved first-pass text: the draft file is untracked in git and the first pass is not kept elsewhere in the repo.

## Batch 1 (decisions and corrections)

The seven approved inserts with the changes above; the 11/23–11/24 callout; and every crosswalk text that changes what the integration sends or how a record is gated or created. **46 inserts** (7 previously approved, of which 4 unchanged and 3 changed; 39 new), 35 distinct texts. Indexes are live, from the read above.

| Insert id | Tab | Anchor (where) | Anchor text (last 12 words) | Live index | New or previously approved | Changed since approval |
|---|---|---|---|---|---|---|
| CALLOUT-1 | `t.yt4axx5fffdf` | Index tab, paragraph "Use this index to find..." (L24) | "…marker through the next heading at the same or a higher level." | 306 | new | n/a (new) |
| X-21b | `t.0` | Empty paragraph right after the SCURRENT table (after L1006) | "…last row is "BCBA → Contact: unlabeled link \| 17 \| 191")" | 120542 | new | n/a (new) |
| X-41a | `t.0` | Section 11 "Triggers follow up" answer "Yes, the gate is only..." (L810) | "…as a one-way latch: if someone unticks the box later, keep syncing." | 106493 | new | n/a (new) |
| X-25a | `t.0` | G10B bullet "Workday ID format" (L745) | "…BCBA 45942219038. A format check in the integration is pending this answer." | 96852 | new | n/a (new) |
| X-19b | `t.0` | G10A bullet "Decide how the Grad Permit marker travels" (L723) | "…GRAD Student- LBA NY 1092164 and metadata field Grad Permit Holder 136052." | 93180 | new | n/a (new) |
| X-30b | `t.0` | Section 7 lead paragraph "Current update — Danny 11/06" (L605) | "…test, not before. Until then nothing is sent to CR for staffing_status." | 78776 | new | n/a (new) |
| X-43b | `t.0` | Section 5 row "Salaried", notes column (L581) | "…work_status "Hourly or Salary?" = Salaried." | 75153 | new | n/a (new) |
| X-21a | `t.0` | Section 4 row "SUB BCBA", last cell (L555) | "…on leave (On Leave BCBA = 236). Does CR need the substitute?" | 72157 | new | n/a (new) |
| X-08b | `t.0` | Section 3 row "Referral Source", notes column (L539) | "…referral_source (read-only in HubSpot, fine to read)." | 70592 | new | n/a (new) |
| X-18b | `t.0` | Section 3 row "Severity Level", notes column (L526) | "…severity_level_clinical (Level 1, 2, 3)." | 69143 | new | n/a (new) |
| X-09b | `t.0` | Section 3 row "Known Allergies", notes column (L523) | "…allergies (Yes/No) + allergies__yes__explain." | 68128 | new | n/a (new) |
| X-14 | `t.0` | Section 3 row "Service Location Address 2", notes column (L522) | "…service_address__other (Location #2-Other)." | 68039 | new | n/a (new) |
| C2 | `t.0` | Section 3 row "Service Location Address", notes column (L521) | "…One Location). Home: full_home_address. Other: service__street_address, service__apt, service__city, service__postal_code (combined in service_address__other)." | 67942 | previously approved 2026-11-24 | yes |
| X-32b | `t.0` | Section 3 row "Total Assigned Hours (97153)", notes column (L518) | "…59 cases, total_hours_btrbt_12 20 cases); ignore them. Per-BT hours: hours_bt_work_schedule_1 and hours_bt_work_schedule_2." | 67105 | new | n/a (new) |
| X-17b | `t.0` | Section 3 row "Client Availability", notes column (L517) | "…finalized_client_service_hours_post_assessment (text) + client_service_hours_total (weekly hours, number)." | 66786 | new | n/a (new) |
| E2 | `t.0` | Section 3 row "Supervising BCBA", notes column (L512) | "…the BCBA record, so match it to the CR provider by name." | 65795 | previously approved 2026-11-24 | no |
| X-15b | `t.0` | Section 3 row "Care coordinator", notes column (L510) | "…API. 11/14 — Danny: requires crm.objects.owners.read; Danny is adding it to prod." | 65363 | new | n/a (new) |
| X-12b | `t.0` | Section 3 row "Mailing Address", notes column (L509) | "…the Case property sync field phone, read from the Parent/Guardian Contact (production)." | 65195 | new | n/a (new) |
| X-33b | `t.0` | GER-CONTACT row "BCBA personal email" (L453) | "…Employee personal email. The BCBA personal-email sync property is planned, creation unconfirmed." | 57322 | new | n/a (new) |
| X-43+16 | `t.0` | GER-BCBA row "Salaried and Care Coordinator" (L412) | "…the owner through GET /crm/v3/owners/{id}. Production crm.objects.owners.read addition pending in the guide." | 47138 | new | n/a (new) |
| X-33a | `t.0` | GER-BCBA row "Personal Email" (L409) | "…Contact. The planned BCBA personal-email sync property is still pending creation confirmation." | 46586 | new | n/a (new) |
| X-35b | `t.0` | GER-BCBA row "Primary Email" (L408) | "…Use the BCBA work email." | 46414 | new | n/a (new) |
| D | `t.0` | GER-CASE row "Production follow-up · Pending" (L393) | "…property’s internal name. This workflow is separate from the service_address__other Client mapping." | 43201 | previously approved 2026-11-24 | no |
| X-42 | `t.0` | GER-CASE row "Field and API exclusions" (L391) | "…from sandbox requests until its property reference and Client mapping are resolved." | 41918 | new | n/a (new) |
| X-08a | `t.0` | GER-CASE row "Policyholder and Referral Source" (L382) | "…Policyholder DOB is sensitive. Read referral_source from HubSpot." | 37373 | new | n/a (new) |
| X-10 | `t.0` | GER-CASE row "Referring Physician, Credentials and NPI" (L380) | "…physician/NPI pair by insurance type. Map Referring Physician Medicaid ID from referring_provider_medicaid_id." | 36913 | new | n/a (new) |
| X-18a | `t.0` | GER-CASE row "Severity and parent notes" (L377) | "…Map Severity Level (Level 1, 2, 3) and Important information - Parent." | 36208 | new | n/a (new) |
| X-09a | `t.0` | GER-CASE row "Known Allergies" (L374) | "…Stored values: Confirmed (Yes) and Denial (No). Include the explanation." | 35619 | new | n/a (new) |
| C | `t.0` | GER-CASE row "Service Location Address and Address 2" (L373) | "…address components. More Than One Location can use service_address__other as Address 2." | 35492 | previously approved 2026-11-24 | yes |
| X-32+42 | `t.0` | GER-CASE row "Total Assigned Hours (97153)" (L370) | "…total and per-BT hours as applicable. Exclude older totals total_hours_bt_12_work_schedule and total_hours_btrbt_12." | 34708 | new | n/a (new) |
| X-17a | `t.0` | GER-CASE row "Client Availability" (L369) | "…Send the availability text and total weekly hours." | 34454 | new | n/a (new) |
| X-44 | `t.0` | GER-CASE row "Work Schedule #1 and #2" (L368) | "…Use the corresponding Location #2 variant when the BT works there." | 34305 | new | n/a (new) |
| X-20 | `t.0` | GER-CASE row "Staffing association read" (L366) | "…BCBA 234 coverage with On Leave BCBA 236 remains open for CR." | 33800 | new | n/a (new) |
| X-19a | `t.0` | GER-CASE row "Grad Permit Holder" (L364) | "…How the marker is carried on the Case or automated remains pending." | 33029 | new | n/a (new) |
| E | `t.0` | GER-CASE row "Supervising BCBA" (L363) | "…active status when no removal date is set. See Staffing association read." | 32779 | previously approved 2026-11-24 | no |
| X-15+45 | `t.0` | GER-CASE row "Care Coordinator" (L361) | "…and email using GET /crm/v3/owners/{id}. Production crm.objects.owners.read addition pending in the guide." | 32318 | new | n/a (new) |
| X-12a+34 | `t.0` | GER-CASE row "Mailing Address" (L360), X-12 and X-34 in one text | "…Case address. phone is the Parent/Guardian sync property created in production 11/09." | 32160 | new | n/a (new) |
| X-23 | `t.0` | GER-REQ row "Client · DateOfBirth" (L346) | "…is blank, CR rejects the create. No placeholder is used for clients." | 30466 | new | n/a (new) |
| X-05/07/06 | `t.0` | GER-REQ row "Employee · DateOfBirth" (L342) | "…date_of_birth property yet; Zeke will create it as the same property sync." | 29911 | new | n/a (new) |
| X-35a | `t.0` | GER-REQ row "Employee · PrimaryEmail" (L341) | "…holds; whether CR accepts a changed email by API is not tested." | 29439 | new | n/a (new) |
| A | `t.0` | G17 bullet "Sandbox testing (Zeke, set up 11/17)" (guide L282) | "…is a production CR record and is one of these test records." | 19486 | previously approved 2026-11-24 | yes |
| B | `t.0` | G17 bullet "Employees already in CentralReach (Zeke)" (L280) | "…United Care confirms each one. The production checkbox is chosen at go-live." | 18476 | previously approved 2026-11-24 | no |
| X-26 | `t.0` | G19 paragraph "New Mexico and Virginia" (L234) | "…state label, same rule as CO Employee, NJ Employee, and NY Employee." | 6389 | new | n/a (new) |
| CALLOUT-2 | `t.0` | Agent context [G00] paragraph (L190) | "…routing. The linked workbook is the input for the API field map." | 677 | new | n/a (new) |
| X-30a | `t.yjiornmys9tz` | Architecture tab bullet "11/17 — Labels are add-only for now" (L1734) | "…met until a CentralReach test shows whether a label can be removed." | 6713 | new | n/a (new) |
| X-41b | `t.yjiornmys9tz` | Architecture tab bullet "Eligibility: CentralReach ID is known" (L1722) | "…or original-gate restriction. ID availability is not proof of complete prior sync." | 4989 | new | n/a (new) |

### Batch 1 texts, verbatim

Each block is the exact `text` of the request(s) named above it. A leading space or line break is part of the text.

**A** (starts with a line break: each line is a new paragraph; 5202 characters) (corrected 2026-11-24 recency audit)

```text

11/23 — Zeke: production gating. The sandbox does not change: everything is gated with the sandbox test property sandbox_test_field (app setting SYNC_RECORD_GATE_PROPERTY = sandbox_test_field), with segments 1463, 1464 and 1465 as above. In production, each workflow that sends a webhook to Azure is gated by two segments per object (Case, BCBA and BT/RBT): "CentralReach creates only" for creates and "CentralReach updates only" for updates. A record that is in neither segment is not created or updated in CR until United Care confirms the outstanding items.
11/23 — Zeke: the production gate is two checkboxes with the same internal names on the Case, the BCBA and the BT/RBT: centralreach_creates_only ("CentralReach creates only") and centralreach_updates_only ("CentralReach updates only"). Each segment is only "its checkbox is true". The integration reads the two checkboxes itself on every path (webhook, Contact changes, the hourly poller, the daily sweep and retries): a record with no CR ID in HubSpot is created only when centralreach_creates_only is true, and a record with a CR ID in HubSpot is updated only when centralreach_updates_only is true. A record with both blank gets no CR call on any path. App settings at cutover: SYNC_CREATE_GATE_PROPERTY = centralreach_creates_only and SYNC_UPDATE_GATE_PROPERTY = centralreach_updates_only; in production the integration requires these exact two names, and with any other value every run fails and alerts. No workflow copies a segment into another property, and sync_to_centralreach is not used. The two checkboxes also exist in the sandbox (created 11/23) for testing; the sandbox gate stays sandbox_test_field.
11/24 — Zeke: how a record enters a segment. A HubSpot workflow ticks centralreach_creates_only only on records created after the cutover date with Entered = Yes and no CR ID. It is never ticked on a person who is already in CR: with a blank CR ID in HubSpot that makes a duplicate, and a Case has no name check at all. After the integration creates the record and writes its CR ID to HubSpot, a second HubSpot workflow ticks centralreach_updates_only, so the new record receives later updates. It fires only when the integration wrote the CR ID (the CR ID changes to known, centralreach_creates_only is true and the CentralReach link property is known). It does not fire when staff type a CR ID by hand; those records go to the existing-records review. Nothing unticks a checkbox automatically; a person unticks it to stop a record.
11/23 — Zeke: new production properties. Zeke creates these in production before the deploy that reads them: the two gate checkboxes above on the Case, the BCBA and the BT/RBT; the Care Coordinator properties care_coordinator_first_name, care_coordinator_last_name, care_coordinator_email and coordinator_export_status on the Case and the BCBA; and referral_other ("Referral - Other") on the Case, with the same internal names as the sandbox. Before each deploy, a read-only check confirms each property by internal name; if a mapped property is missing, the production deploy waits until it exists, and if a gate checkbox is missing, every run fails and alerts. The integration reads the Case's care_coordinator_first_name, care_coordinator_last_name, coordinator_export_status and referral_other: built now and proven in the sandbox first, and in production once each property exists in production and its change is deployed. The production Case sync workflow triggers on those properties, not on the Case owner.
11/23 — Zeke: existing records are a separate phase. HubSpot records that are already in CentralReach stay out of both segments at cutover (both checkboxes blank): no create and no update. Before any existing record goes into either segment, the team reviews HubSpot against CentralReach on the required properties and lists the mismatches for United Care to confirm. This review happens after sandbox testing is complete. Only then are the reviewed records ticked into "CentralReach updates only", batch by batch. Records linked to CentralReach by email or name only need their employee_id / Client ID written first; ticking centralreach_creates_only on them makes a duplicate.
11/24 — Zeke: production is pushed in two phases. Phase I creates records only: the integration creates in CentralReach only HubSpot records that are new in CentralReach. Phase II reviews the existing HubSpot records against the existing CentralReach records, so that the existing CentralReach records reflect HubSpot; any discrepancy found between HubSpot and CentralReach is a Phase II production build. Every property, workflow, list and report that exists in the sandbox but not in production is deployed from the sandbox to production. A record the integration creates in Phase I still receives later updates through the second workflow above; only records that already existed in CentralReach wait for Phase II.
11/24 — Decided (Zeke approved the recommendation): the creates workflow triggers on Entered = Yes, with "created after the cutover date" as a filter, so a new record whose Entered becomes Yes later is still picked up. New records created after the cutover need no further hold.
```

Audit correction (2026-11-24 recency audit, table 1 P34 "Yes, all three" and P14 Ruling B): bullet 6 now ends with the confirmed wording that only records that already existed in CentralReach wait for Phase II. Nothing else changed.

Reviewer change: bullet 6 gains the last sentence, because "Phase I creates records only" otherwise contradicts bullet 3 (promote-after-create updates); that sentence is the orchestrator's reading of Ruling B (package D19, assumption G65), not Zeke's words. Bullet 7 re-labelled: backed only by "On the remaining open items, apply your recommendation." (package question 24).

Third-pass change: Zeke confirmed the bullet 6 sentence on 11/24 ("Yes, all three"), so its "Proposed, for Zeke to confirm:" prefix is dropped and it reads as part of his 11/24 bullet.

**B** (starts with a space; 174 characters)

```text
 11/23 — Zeke: chosen: two checkboxes, centralreach_creates_only and centralreach_updates_only, read directly by the integration; see the 11/23 production gating notes below.
```

**C** (starts with a space; 928 characters)

```text
 11/23 — Zeke: Child's House and Other Location are both built from the structured address parts in CentralReach's format: <street> <apt>, a line break, then <City> <ST> <ZIP>. full_home_address is not read: its format can't be converted reliably. A blank street sends nothing. More Than One Location uses the home parts, as Child's House does. 11/24 — Decided (Zeke approved the recommendation): a street that already holds a whole one-line address is split into the two lines only when a state comes before the ZIP at its end; the separate city, state and ZIP are then not added. Any other street is used as typed, with the separate parts on line 2. Address 2 (service_address__other, More Than One Location only) is treated as blank when it holds nothing but commas and one state, for example ",  , New York ": nothing is sent, and an Address 2 the integration wrote earlier is cleared. Any other Address 2 is sent as stored.
```

Reviewer change: "11/24 — Zeke" re-labelled (decisions 1 and 8 rest only on the closing sentence; Zeke asked "is this recommended?" on decision 1). Address 2: "is not sent" corrected; the package rule sends `null`, which clears a value the integration wrote (`mappedState.mjs` `metadataClearFieldIds`; package item 5 test "an Address 2 written before and now junk → the clear is sent"), and the working-tree `getServiceLocationAddress2` does the same.

**D** (starts with a space; 198 characters)

```text
 11/23 — Zeke: no copy workflow is needed. The integration reads the structured service address fields directly and never reads if_services_will_be_in_more_than_one_location__list_the_other_address.
```

**E, E2** (starts with a space; 414 characters)

```text
 11/23 — Zeke: Supervising BCBA (131308) suffix. Each BCBA name is sent as "<First> <Last> BCBA LBA": always " BCBA LBA", whatever licence the BCBA holds. Several BCBAs are joined by ", ". When no BCBA is associated in a supervising role, the typed ongoing_central_reach_provider_supplier is sent with " BCBA LBA" added, unless the typed text already contains BCBA or LBA as a word; a blank supplier sends nothing.
```

**C2** (starts with a space; 651 characters)

```text
 11/23 — Zeke: Child's House and Other Location are both built from the structured address parts in CentralReach's format: <street> <apt>, a line break, then <City> <ST> <ZIP>. full_home_address is not read: its format can't be converted reliably. A blank street sends nothing. More Than One Location uses the home parts, as Child's House does. 11/24 — Decided (Zeke approved the recommendation): a street that already holds a whole one-line address is split into the two lines only when a state comes before the ZIP at its end; the separate city, state and ZIP are then not added. Any other street is used as typed, with the separate parts on line 2.
```

Reviewer change: "11/24 — Zeke" re-labelled, as in C.

**CALLOUT-1, CALLOUT-2** (starts with a space; 1069 characters)

```text
 11/24 — Note: decisions made on Monday 11/23 and Tuesday 11/24 are added to this document as dated notes. "11/23 — Zeke" or "11/24 — Zeke" marks a rule in his recorded words; "Decided (Zeke approved the recommendation)" marks a rule he approved as recommended, and "Decided (applied from Zeke's 11/24 rulings)" one that follows from his rulings, both in the team's wording; "Finding (read 11/23)" or "Finding (read 11/24)" marks what a read-only check of HubSpot, CentralReach or the code found that day; "Proposed, for Zeke to confirm" marks a proposal he has not confirmed. Unless a note says it is already in place, a rule dated 11/23 or 11/24 that changes what the integration sends ships with the next deploy: the sandbox first, then production once its HubSpot properties exist. The full record, with his words quoted, is in the repository: docs/workstreams/architecture-update/BUILD-PACKAGE-DRAFT-2026-11-23.md and BUILD-PLAN.md section 4 (decision 39 onward). Where this document and those files differ, the repository files win until this document is updated.
```

Reviewer change: the callout was itself labelled "11/24 — Zeke" with no words of his behind it; it now names the "Decided (…)" labels used below, and says that the 11/23–11/24 sending rules are the pending build (not deployed at `655b385`), so the present-tense texts below do not read as live.

**X-05/07/06** (starts with a space; 1199 characters) (corrected 2026-11-24 recency audit)

```text
 11/21 — Zeke: the BCBA date_of_birth is a single-line text field in production, not a property sync (this replaces "the same property sync" above); the integration converts the text to a date. 11/23 — Zeke: the integration reads date_of_birth, not dob. 11/24 — Zeke: while it is blank, the integration sends the placeholder 01/01/2000 on a create; how United Care wants the field filled is pending their answer. Finding (read 11/24): it is blank on all 375 production BCBAs, so every BCBA create sends the placeholder. 11/23 — Decided (Zeke approved the recommendation): the BT/RBT date_of_birth is text in production; the integration converts forms such as 2/20/1992 to a date. 11/24 — Zeke: Phase I only creates records that are new in CentralReach, so these records always carry the placeholder until United Care clarifies how they handle the date. 11/24 — Decided (Zeke approved the recommendation): on an update of a BCBA or a BT/RBT whose date_of_birth is blank in HubSpot, the integration sends back the date CentralReach holds, never the placeholder; if CentralReach's answer has no date of birth field at all, the read counts as failed: nothing is sent and nothing changes in CentralReach.
```

Audit correction (2026-11-24 recency audit, table 1 P18 and decisions 45/53): an employee update with a blank date of birth sends back CentralReach's date; an absent date key is a failed read and nothing is sent (option (a)). The working tree matches (`mappedState.mjs:292-357` per the audit), so open question 3 below is resolved.

Reviewer change: the update rule was under "11/24 — Zeke"; his decision-4 words cover the placeholder on creates only, and option (a) is the orchestrator's application (package seventh set, row 4), so it is re-labelled; "never the placeholder" added (package item 1). The anchor's "the same property sync" is now marked as replaced. Not changed, see the review section: the working-tree build does not yet stop the update when the date key is missing (`keepUnwrittenCoreFields` leaves the key out).

**X-23** (starts with a space; 444 characters) (corrected 2026-11-24 recency audit)

```text
 11/23 — Decided (Zeke approved the recommendation): on a client update, a core field that is blank in HubSpot never clears CentralReach: the integration reads the client first and sends back the value CentralReach holds. A read that is missing one of the eleven core fields stops the update (no change in CentralReach). Finding (read 11/24): on a create, a blank phi_date_of_birth is checked first: the run ends as error and no create is sent.
```

Audit correction (2026-11-24 recency audit, section D row L346; BUILD-PLAN C3): added that a blank client date of birth is checked before the create and ends as error.

**X-35a, X-35b** (starts with a space; 377 characters) (corrected 2026-11-24 recency audit)

```text
 11/21 — Zeke: the BCBA primary email is the BCBA's email property, not ucaba_email_address. On an update the HubSpot email is sent when it is filled; a blank sends back the email CentralReach holds. This replaces the BCBA source and the update note above. A malformed email ends the run as error (the reason names the property, never the value); the status blocked is retired.
```

Audit correction (2026-11-24 recency audit, section D row L341; decisions 43, 47, BR9): added that a malformed email ends the run as error and that blocked is retired.

Reviewer change: both anchors (GER-REQ "Employee · PrimaryEmail": "BCBA: ucaba_email_address … Updates send the email CR already holds"; GER-BCBA "Primary Email": ucaba_email_address) say the opposite; the replacement is now stated.

**X-12a+34** (starts with a space; 639 characters)

```text
 11/23 — Zeke: the state sent to CentralReach (client state and line 2 of the service address) is stateregion; when it is blank or not a state, the Case location is used instead (an unreadable stateregion is logged as a warning by property name, not an error). For Other Location, service__stateregion_2 comes first. 11/21 — Zeke: on the Case, the BCBA and the BT/RBT, any other filled phone, email, state or gender that cannot be converted ends the run as error (the reason names the property, never the value) and nothing is sent. Phones are sent as the 10 digits CentralReach stores; any US form is accepted and an extension is dropped.
```

Third-pass change: X-34 is merged here. It sat on the G02 date-fields bullet, which is about dates only; this GER-CASE "Mailing Address" row is where the guide names the state (`stateregion`) and the phone, so the state rule and its error rule now read together, and the X-34 sentence "except the Case stateregion … (see the Mailing Address notes)" became "any other". One insert per index, so X-12's GER-CASE half and X-34 are one text (as X-14 is part of C). Stays in batch 1: it changes what is sent, and the index (32160) is unchanged.

**X-12b** (starts with a space; 316 characters)

```text
 11/23 — Zeke: the state sent to CentralReach (client state and line 2 of the service address) is stateregion; when it is blank or not a state, the Case location is used instead (an unreadable stateregion is logged as a warning by property name, not an error). For Other Location, service__stateregion_2 comes first.
```

**X-15+45** (starts with a space; 1255 characters)

```text
 11/23 — Zeke: the Case Care Coordinator (138851) is read from the workflow fields care_coordinator_first_name, care_coordinator_last_name and coordinator_export_status, set by HubSpot workflows; the owners API, crm.objects.owners.read and care_coordinator_name (read since 11/20) are no longer used for it. This replaces the owners API note above. 11/24 — Zeke: the Care Coordinator field (138851) is not omitted; it is built now and proven in the sandbox before production, where testing must confirm the field is populated. 11/24 — Proposed, for Zeke to confirm: status ready sends "<First> <Last>"; no_owner sends no name (a name the integration wrote earlier is cleared); any other status leaves the CentralReach value unchanged and logs a warning. Finding (read 11/23): CentralReach's 138851 holds a name and CentralReach has no coordinator email field, so no email is sent. 11/24 — Zeke: the two coordinator workflows, like every property, workflow, list and report that exists only in the sandbox, are deployed from the sandbox to production. 11/24 — Proposed, for Zeke to confirm: before the first production sync, every coordinator has an active Team Member record and every in-scope Case is enrolled once, so coordinator_export_status is ready.
```

Reviewer change: "138851 is not omitted; built now" was under "11/24 — Zeke"; his words are "Please refer to the above" (Ruling B) and "Sandbox testing: need to confirm fulfilling requirements is populated."; "not omitted" is the orchestrator's application (package seventh set, row 2; the earlier recommendation was to omit), so it is re-labelled and his own sentence kept separately. Added: no email is sent (package item 6: `care_coordinator_email` is not read; O-17) and "replaces the owners API note above" (anchors L361 and L510 say "Resolve name and email using GET /crm/v3/owners/{id}").

Third-pass change (X-15+45 and X-15b): Zeke confirmed on 11/24 that 138851 is not omitted, as his decision ("Yes, all three"), so that sentence is "11/24 — Zeke" and carries his sandbox sentence. "The owners API … no longer used" moves under his 11/23 sentence (it follows from "We will read the fields for this"), so it matches the new G02 pointer (N-G02). "No email is sent" is now a finding (CF §9.5: 138851 holds a name; no email field).

**X-19a, X-19b** (starts with a space; 772 characters)

```text
 11/23 — Decided (Zeke approved the recommendation): a Case's Supervising BCBA (82) is a Grad Permit holder when that BCBA's lba_licensure__ny is Grad Permit; no other property is read, and the typed supplier is not compared. 11/23 — Zeke: for a holder, Grad Permit Holder (136052) is sent as "<First> <Last> Grad Permit Holder", and Supervising BCBA (131308) is the BCBA(s) on the holder's Grad Permit Supervisor link (151) with " BCBA LBA"; with no 151 link, 131308 is not sent and a warning is logged. The holder's own name is never sent to 131308. 11/24 — Decided (Zeke approved the recommendation): when a Case has two Supervising BCBAs and only one is a Grad Permit holder, both 136052 and 131308 are left out (CentralReach keeps its values) and a warning is logged.
```

Reviewer change: rule 7 re-labelled (Zeke's decision-3 words are a question, "is this recommended?"; applied under the closing sentence). Added "the typed supplier is not compared" (anchor L364 says "Compare the typed supplier with the supervising association"; package item 9 rule 1) and the warning on a missing 151 link (rule 3, `grad_permit_supervisor_missing`).

**X-20** (starts with a space; 407 characters)

```text
 11/24 — Zeke: no date logic; the association label is the signal. Outgoing BT 1 (131) and Outgoing BT 2 (166) are sent with Primary BT 1 / 2 in BT #1 / BT #2 Name while the label is on the Case. Supervising BCBA (131308) uses the first of Supervising BCBA (82), SUB BCBA (234), Outgoing SUB BCBA (288), Outgoing Supervising BCBA (135). On Leave BCBA (236) is never sent. This settles the open points above.
```

Reviewer change: the anchor (L366) leaves Outgoing Supervising 135 and SUB 234 / On Leave 236 open; the text now says it settles them.

**X-44** (starts with a space; 135 characters)

```text
 11/23 — Zeke: no code for the Location #2 schedules for now. Finding (read 11/23): both properties are empty on every production Case.
```

**X-17a, X-17b** (starts with a space; 167 characters)

```text
 11/23 — Zeke: send only the availability text, as CentralReach holds it; the weekly hours (client_service_hours_total) are not appended. This replaces the note above.
```

Reviewer change: both anchors (L369 "Send the availability text and total weekly hours"; L517) say the opposite; the replacement is now stated.

**X-32+42** (starts with a space; 793 characters)

```text
 11/21 — Zeke: Total Assigned Hours is the sum of hours_bt_work_schedule_1 and bt_rbt_2_work_schedule, added by the integration (a blank counts as 0). total_hours_bt1bt2_work_schedule is not used (its formula gives 2 on every Case). This replaces the note above. 11/23 — Zeke: use a HubSpot total when there is one, otherwise add the two hours. Finding (read 11/23): no change was needed: the only usable total, total_hours_btrbt_12, is a formula of the same two hours and equals the sum wherever it is filled. 11/23 — Zeke: "if these are marked required on the doc then they need to be created and mapped." 11/24 — Proposed, for Zeke to confirm: the per-BT hours are not sent as separate fields, because this document does not mark them required and CentralReach has no target field for them.
```

Reviewer change: "When a HubSpot total should be used instead is still to confirm" is out of date: Zeke answered O-43 on 11/23 and the package closed it with no code change (package section C, row O-43, C20). "Replaces the note above" added (anchor L370 "Read the calculated total"). The insurance_id and physician-pair half of X-42 is dropped here (unrelated to the Total Assigned Hours row; it stays at "Field and API exclusions"), and "per-BT hours" now says "as separate fields", since the total is itself the sum of the per-BT hours.

**X-09a, X-09b** (starts with a space; 279 characters)

```text
 11/24 — Decided (Zeke approved the recommendation): sent in CentralReach's form, confirmed against the records: Denial sends "None"; Confirmed with an explanation sends the explanation alone; Confirmed with no explanation, or with one such as "NA", "N/A" or "none", sends "Yes".
```

Reviewer change: re-labelled; no words of Zeke's on 11/24 (package seventh set, row 5: "No separate words; covered by the closing sentence").

**X-18a, X-18b** (starts with a space; 198 characters)

```text
 11/24 — Decided (Zeke approved the recommendation): sent in CentralReach's form, confirmed against the records: the digit only ("Level 2" sends "2"). A stored value with no digit is sent as stored.
```

Reviewer change: re-labelled, as X-09.

**X-10** (starts with a space; 172 characters)

```text
 11/23 — Zeke: sent in CentralReach's form: the name, one space, then the NPI, with no comma (a trailing comma on the name is dropped). Name only or NPI only is sent alone.
```

**X-08a, X-08b** (starts with a space; 450 characters)

```text
 11/23 — Zeke: send referral_source as stored, Bassy-Americare included. When it is Other, send the Case's referral_other ("Referral - Other", a sync of the Contact's other___hear_about_us_) instead. 11/23 — Decided (Zeke approved the recommendation): if that is blank, send "Other". 11/24 — Decided (applied from Zeke's 11/24 rulings): built now and proven in the sandbox before production; referral_other is deployed from the sandbox to production.
```

Reviewer change: re-labelled; "built now" is the orchestrator's application (seventh set, row 2), and only "deployed from sandbox to production" is Ruling A's wording.

**X-42** (starts with a space; 380 characters)

```text
 11/23 — Zeke: "if these are marked required on the doc then they need to be created and mapped." 11/24 — Proposed, for Zeke to confirm: the per-BT hours as separate fields, insurance_id_3 and insurance_id_4, and a physician pair for an Unsure or blank insurance type are not mapped, because this document does not mark them required and CentralReach has no target field for them.
```

Reviewer change: "per-BT hours" now "as separate fields" (Total Assigned Hours is the sum of the per-BT hours).

**X-33a, X-33b** (starts with a space; 542 characters) (corrected 2026-11-24 recency audit)

```text
 11/23 — Zeke: the BCBA Personal Email (138069) is read from the BCBA record's own personal_email, not from the linked Contact (already in place). 11/21 — Zeke: Contact changes reach Cases only. Finding (read 11/24): the Guardian first name, last name, email and phone are Case property-sync fields (created in production 11/09) and the BCBA personal email is the BCBA's own personal_email, so no separate Contact workflow is needed. 11/23 — Zeke: the BT/RBT personal email is left out until the field is confirmed with Danny and United Care.
```

Audit correction (2026-11-24 recency audit, section C and C4; table 2 row R02 "X-33"; decisions 24, 42, 44, 50 and guide note 11/09): added the finding that the Guardian values are Case property-sync fields and the BCBA personal email is the BCBA's own personal_email, so no separate Contact workflow is needed. Notes: [needs Zeke: Contact workflow confirmation].

Reviewer change: "Contact changes now reach Cases only" is decision 44 of 11/21, not 11/23 (BUILD-PLAN row 44); dated correctly. "Already in place" added: `personal_email` is read at deployed `655b385`, so the callout's "ships with the next deploy" does not apply.

**X-43+16** (starts with a space; 349 characters)

```text
 11/23 — Zeke: Salaried is a CentralReach label. work_status = Salaried sends the employee label Salaried (1132653), already in place. Finding (read 11/23): CentralReach has no employee Care Coordinator field (138851 is client-only). 11/24 — Proposed, for Zeke to confirm: the BCBA Care Coordinator is not sent until Danny or United Care create one.
```

Third-pass change: the "CentralReach has no employee Care Coordinator field" half is a finding (CF §9.5, 11/23), so it is labelled one; only "not sent until Danny or United Care create one" stays Proposed (package D8 is not Zeke's decision).

**X-15b** (starts with a space; 880 characters)

```text
 11/23 — Zeke: the Case Care Coordinator (138851) is read from the workflow fields care_coordinator_first_name, care_coordinator_last_name and coordinator_export_status, set by HubSpot workflows; the owners API, crm.objects.owners.read and care_coordinator_name (read since 11/20) are no longer used for it. This replaces the owners API note above. 11/24 — Zeke: the Care Coordinator field (138851) is not omitted; it is built now and proven in the sandbox before production, where testing must confirm the field is populated. 11/24 — Proposed, for Zeke to confirm: status ready sends "<First> <Last>"; no_owner sends no name (a name the integration wrote earlier is cleared); any other status leaves the CentralReach value unchanged and logs a warning. Finding (read 11/23): CentralReach's 138851 holds a name and CentralReach has no coordinator email field, so no email is sent.
```

Reviewer change: as X-15+45 (re-label, email sentence, "replaces").

**X-32b** (starts with a space; 510 characters)

```text
 11/21 — Zeke: Total Assigned Hours is the sum of hours_bt_work_schedule_1 and bt_rbt_2_work_schedule, added by the integration (a blank counts as 0). total_hours_bt1bt2_work_schedule is not used (its formula gives 2 on every Case). This replaces the note above. 11/23 — Zeke: use a HubSpot total when there is one, otherwise add the two hours. Finding (read 11/23): no change was needed: the only usable total, total_hours_btrbt_12, is a formula of the same two hours and equals the sum wherever it is filled.
```

Reviewer change: as X-32+42 (out-of-date "still to confirm"; "replaces" added, since anchor L518 says "Use total_hours_bt1bt2_work_schedule").

**X-14** (starts with a space; 321 characters)

```text
 11/24 — Decided (Zeke approved the recommendation): Address 2 is treated as blank when service_address__other holds nothing but commas and one state, for example ",  , New York ": nothing is sent, and an Address 2 the integration wrote earlier is cleared. Any other value is sent as stored (More Than One Location only).
```

Reviewer change: re-labelled (decision 1: Zeke asked "is this recommended?"); "is not sent" corrected to the package and working-tree behaviour (`null`, which clears only a value the integration wrote).

**X-21a** (starts with a space; 324 characters)

```text
 11/23 — Zeke: Outgoing SUB BCBA is Case → BCBA 288 in production (paired 289); its removal shows the On Leave BCBA is back. 11/24 — Zeke: CentralReach gets the substitute: with no Supervising BCBA (82) on the Case, the SUB BCBA is sent as Supervising BCBA (131308); see "Staffing association read" in the Case requirements.
```

Reviewer change: the anchor row (SUB BCBA 234) ends with the open question "Does CR need the substitute?"; the 11/24 order 82 → 234 → 288 → 135 ("9. these rules are rig") answers it, so the answer is added.

**X-43b** (starts with a space; 134 characters)

```text
 11/23 — Zeke: Salaried is a CentralReach label. work_status = Salaried sends the employee label Salaried (1132653), already in place.
```

Reviewer change (X-43b and the X-43 half of X-43+16): "already in place" added, because the label is sent at deployed `655b385` (package section C, O-27) and the new callout says undated-as-live 11/23 rules ship with the next deploy.

**X-30b, X-30a** (starts with a space; 297 characters)

```text
 Finding (read 11/24): the CentralReach label test of 11/20 showed that a label POST replaces the whole set, so a label is removed by leaving it out. The hold was lifted on 11/20: Active / Inactive, the three staffing labels of [G19] and Billing Hold removal are built and sent (already in place).
```

Reviewer change: the L605 anchor speaks of six staffing labels; "of [G19]" points to the 11/19 cut to three (BUILD-PLAN decision 15). "Already in place": decision 13 (11/20) is deployed.

**X-25a** (starts with a space; 393 characters)

```text
 11/23 — Zeke: the integration checks that a filled workday_id is exactly 7 digits; any other value ends the run as error with no CentralReach call. Pending final confirmation of the format by United Care. Finding (read 11/23): 645 of 650 production values are 7 digits; the other 5 end as error until fixed. 11/24 — Zeke: he fixes the 5 malformed production values and gets Sara's final word.
```

Reviewer change: the anchor says 640 of 644 and "four records"; the newer count (package item 15, EMP §4) is added so "the 5" is not read as a contradiction.

**X-26** (starts with a space; 228 characters)

```text
 11/23 — Zeke: NM Employee and VA Employee are not sent yet; they are added to the label code when the client begins work in those states. Until then a New Mexico or Virginia Work State gets no state label (logged as a warning).
```

**X-41a, X-41b** (starts with a space; 374 characters)

```text
 11/23 — Zeke: in production the two gate checkboxes are checked before this rule: a record with no CR ID needs centralreach_creates_only, a record with a CR ID needs centralreach_updates_only. Unticking centralreach_updates_only stops updates even when this rule is met, so in production this rule no longer holds on its own. See the 11/23 production gating notes in [G17].
```

Reviewer change: L810 says "the gate is only Entered in CR … a one-way latch: keep syncing" and L1722 "no … original-gate restriction"; the text now says plainly that it limits those notes in production (08 review question 2: "the opposite of the production rule").

**X-21b** (no leading space (fills an empty paragraph); 101 characters)

```text
11/23 — Zeke: Case → BCBA · Outgoing SUB BCBA: production 288 (paired 289), sandbox 221 (paired 220).
```


### Batch 1 request list, in send order

One `documents.batchUpdate` on file `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`, guarded by the revision ID read today. `insertText` only, `tabId` on every location. Within each tab the highest index goes first, so no insert moves a later one; the three tabs have separate index spaces. Generated from the texts above, not retyped. **Not sent.**

Send order: CALLOUT-1 (306), X-21b (120542), X-41a (106493), X-25a (96852), X-19b (93180), X-30b (78776), X-43b (75153), X-21a (72157), X-08b (70592), X-18b (69143), X-09b (68128), X-14 (68039), C2 (67942), X-32b (67105), X-17b (66786), E2 (65795), X-15b (65363), X-12b (65195), X-33b (57322), X-43+16 (47138), X-33a (46586), X-35b (46414), D (43201), X-42 (41918), X-08a (37373), X-10 (36913), X-18a (36208), X-09a (35619), C (35492), X-32+42 (34708), X-17a (34454), X-44 (34305), X-20 (33800), X-19a (33029), E (32779), X-15+45 (32318), X-12a+34 (32160), X-23 (30466), X-05/07/06 (29911), X-35a (29439), A (19486), B (18476), X-26 (6389), CALLOUT-2 (677), X-30a (6713), X-41b (4989).

```json
{
  "requests": [
    {
      "insertText": {
        "location": {
          "index": 306,
          "tabId": "t.yt4axx5fffdf"
        },
        "text": " 11/24 — Note: decisions made on Monday 11/23 and Tuesday 11/24 are added to this document as dated notes. \"11/23 — Zeke\" or \"11/24 — Zeke\" marks a rule in his recorded words; \"Decided (Zeke approved the recommendation)\" marks a rule he approved as recommended, and \"Decided (applied from Zeke's 11/24 rulings)\" one that follows from his rulings, both in the team's wording; \"Finding (read 11/23)\" or \"Finding (read 11/24)\" marks what a read-only check of HubSpot, CentralReach or the code found that day; \"Proposed, for Zeke to confirm\" marks a proposal he has not confirmed. Unless a note says it is already in place, a rule dated 11/23 or 11/24 that changes what the integration sends ships with the next deploy: the sandbox first, then production once its HubSpot properties exist. The full record, with his words quoted, is in the repository: docs/workstreams/architecture-update/BUILD-PACKAGE-DRAFT-2026-11-23.md and BUILD-PLAN.md section 4 (decision 39 onward). Where this document and those files differ, the repository files win until this document is updated."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 120542,
          "tabId": "t.0"
        },
        "text": "11/23 — Zeke: Case → BCBA · Outgoing SUB BCBA: production 288 (paired 289), sandbox 221 (paired 220)."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 106493,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: in production the two gate checkboxes are checked before this rule: a record with no CR ID needs centralreach_creates_only, a record with a CR ID needs centralreach_updates_only. Unticking centralreach_updates_only stops updates even when this rule is met, so in production this rule no longer holds on its own. See the 11/23 production gating notes in [G17]."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 96852,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the integration checks that a filled workday_id is exactly 7 digits; any other value ends the run as error with no CentralReach call. Pending final confirmation of the format by United Care. Finding (read 11/23): 645 of 650 production values are 7 digits; the other 5 end as error until fixed. 11/24 — Zeke: he fixes the 5 malformed production values and gets Sara's final word."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 93180,
          "tabId": "t.0"
        },
        "text": " 11/23 — Decided (Zeke approved the recommendation): a Case's Supervising BCBA (82) is a Grad Permit holder when that BCBA's lba_licensure__ny is Grad Permit; no other property is read, and the typed supplier is not compared. 11/23 — Zeke: for a holder, Grad Permit Holder (136052) is sent as \"<First> <Last> Grad Permit Holder\", and Supervising BCBA (131308) is the BCBA(s) on the holder's Grad Permit Supervisor link (151) with \" BCBA LBA\"; with no 151 link, 131308 is not sent and a warning is logged. The holder's own name is never sent to 131308. 11/24 — Decided (Zeke approved the recommendation): when a Case has two Supervising BCBAs and only one is a Grad Permit holder, both 136052 and 131308 are left out (CentralReach keeps its values) and a warning is logged."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 78776,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/24): the CentralReach label test of 11/20 showed that a label POST replaces the whole set, so a label is removed by leaving it out. The hold was lifted on 11/20: Active / Inactive, the three staffing labels of [G19] and Billing Hold removal are built and sent (already in place)."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 75153,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: Salaried is a CentralReach label. work_status = Salaried sends the employee label Salaried (1132653), already in place."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 72157,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: Outgoing SUB BCBA is Case → BCBA 288 in production (paired 289); its removal shows the On Leave BCBA is back. 11/24 — Zeke: CentralReach gets the substitute: with no Supervising BCBA (82) on the Case, the SUB BCBA is sent as Supervising BCBA (131308); see \"Staffing association read\" in the Case requirements."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 70592,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: send referral_source as stored, Bassy-Americare included. When it is Other, send the Case's referral_other (\"Referral - Other\", a sync of the Contact's other___hear_about_us_) instead. 11/23 — Decided (Zeke approved the recommendation): if that is blank, send \"Other\". 11/24 — Decided (applied from Zeke's 11/24 rulings): built now and proven in the sandbox before production; referral_other is deployed from the sandbox to production."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 69143,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): sent in CentralReach's form, confirmed against the records: the digit only (\"Level 2\" sends \"2\"). A stored value with no digit is sent as stored."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 68128,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): sent in CentralReach's form, confirmed against the records: Denial sends \"None\"; Confirmed with an explanation sends the explanation alone; Confirmed with no explanation, or with one such as \"NA\", \"N/A\" or \"none\", sends \"Yes\"."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 68039,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): Address 2 is treated as blank when service_address__other holds nothing but commas and one state, for example \",  , New York \": nothing is sent, and an Address 2 the integration wrote earlier is cleared. Any other value is sent as stored (More Than One Location only)."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 67942,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: Child's House and Other Location are both built from the structured address parts in CentralReach's format: <street> <apt>, a line break, then <City> <ST> <ZIP>. full_home_address is not read: its format can't be converted reliably. A blank street sends nothing. More Than One Location uses the home parts, as Child's House does. 11/24 — Decided (Zeke approved the recommendation): a street that already holds a whole one-line address is split into the two lines only when a state comes before the ZIP at its end; the separate city, state and ZIP are then not added. Any other street is used as typed, with the separate parts on line 2."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 67105,
          "tabId": "t.0"
        },
        "text": " 11/21 — Zeke: Total Assigned Hours is the sum of hours_bt_work_schedule_1 and bt_rbt_2_work_schedule, added by the integration (a blank counts as 0). total_hours_bt1bt2_work_schedule is not used (its formula gives 2 on every Case). This replaces the note above. 11/23 — Zeke: use a HubSpot total when there is one, otherwise add the two hours. Finding (read 11/23): no change was needed: the only usable total, total_hours_btrbt_12, is a formula of the same two hours and equals the sum wherever it is filled."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 66786,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: send only the availability text, as CentralReach holds it; the weekly hours (client_service_hours_total) are not appended. This replaces the note above."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 65795,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: Supervising BCBA (131308) suffix. Each BCBA name is sent as \"<First> <Last> BCBA LBA\": always \" BCBA LBA\", whatever licence the BCBA holds. Several BCBAs are joined by \", \". When no BCBA is associated in a supervising role, the typed ongoing_central_reach_provider_supplier is sent with \" BCBA LBA\" added, unless the typed text already contains BCBA or LBA as a word; a blank supplier sends nothing."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 65363,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the Case Care Coordinator (138851) is read from the workflow fields care_coordinator_first_name, care_coordinator_last_name and coordinator_export_status, set by HubSpot workflows; the owners API, crm.objects.owners.read and care_coordinator_name (read since 11/20) are no longer used for it. This replaces the owners API note above. 11/24 — Zeke: the Care Coordinator field (138851) is not omitted; it is built now and proven in the sandbox before production, where testing must confirm the field is populated. 11/24 — Proposed, for Zeke to confirm: status ready sends \"<First> <Last>\"; no_owner sends no name (a name the integration wrote earlier is cleared); any other status leaves the CentralReach value unchanged and logs a warning. Finding (read 11/23): CentralReach's 138851 holds a name and CentralReach has no coordinator email field, so no email is sent."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 65195,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the state sent to CentralReach (client state and line 2 of the service address) is stateregion; when it is blank or not a state, the Case location is used instead (an unreadable stateregion is logged as a warning by property name, not an error). For Other Location, service__stateregion_2 comes first."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 57322,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the BCBA Personal Email (138069) is read from the BCBA record's own personal_email, not from the linked Contact (already in place). 11/21 — Zeke: Contact changes reach Cases only. Finding (read 11/24): the Guardian first name, last name, email and phone are Case property-sync fields (created in production 11/09) and the BCBA personal email is the BCBA's own personal_email, so no separate Contact workflow is needed. 11/23 — Zeke: the BT/RBT personal email is left out until the field is confirmed with Danny and United Care."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 47138,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: Salaried is a CentralReach label. work_status = Salaried sends the employee label Salaried (1132653), already in place. Finding (read 11/23): CentralReach has no employee Care Coordinator field (138851 is client-only). 11/24 — Proposed, for Zeke to confirm: the BCBA Care Coordinator is not sent until Danny or United Care create one."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 46586,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the BCBA Personal Email (138069) is read from the BCBA record's own personal_email, not from the linked Contact (already in place). 11/21 — Zeke: Contact changes reach Cases only. Finding (read 11/24): the Guardian first name, last name, email and phone are Case property-sync fields (created in production 11/09) and the BCBA personal email is the BCBA's own personal_email, so no separate Contact workflow is needed. 11/23 — Zeke: the BT/RBT personal email is left out until the field is confirmed with Danny and United Care."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 46414,
          "tabId": "t.0"
        },
        "text": " 11/21 — Zeke: the BCBA primary email is the BCBA's email property, not ucaba_email_address. On an update the HubSpot email is sent when it is filled; a blank sends back the email CentralReach holds. This replaces the BCBA source and the update note above. A malformed email ends the run as error (the reason names the property, never the value); the status blocked is retired."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 43201,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: no copy workflow is needed. The integration reads the structured service address fields directly and never reads if_services_will_be_in_more_than_one_location__list_the_other_address."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 41918,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: \"if these are marked required on the doc then they need to be created and mapped.\" 11/24 — Proposed, for Zeke to confirm: the per-BT hours as separate fields, insurance_id_3 and insurance_id_4, and a physician pair for an Unsure or blank insurance type are not mapped, because this document does not mark them required and CentralReach has no target field for them."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 37373,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: send referral_source as stored, Bassy-Americare included. When it is Other, send the Case's referral_other (\"Referral - Other\", a sync of the Contact's other___hear_about_us_) instead. 11/23 — Decided (Zeke approved the recommendation): if that is blank, send \"Other\". 11/24 — Decided (applied from Zeke's 11/24 rulings): built now and proven in the sandbox before production; referral_other is deployed from the sandbox to production."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 36913,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: sent in CentralReach's form: the name, one space, then the NPI, with no comma (a trailing comma on the name is dropped). Name only or NPI only is sent alone."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 36208,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): sent in CentralReach's form, confirmed against the records: the digit only (\"Level 2\" sends \"2\"). A stored value with no digit is sent as stored."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 35619,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): sent in CentralReach's form, confirmed against the records: Denial sends \"None\"; Confirmed with an explanation sends the explanation alone; Confirmed with no explanation, or with one such as \"NA\", \"N/A\" or \"none\", sends \"Yes\"."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 35492,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: Child's House and Other Location are both built from the structured address parts in CentralReach's format: <street> <apt>, a line break, then <City> <ST> <ZIP>. full_home_address is not read: its format can't be converted reliably. A blank street sends nothing. More Than One Location uses the home parts, as Child's House does. 11/24 — Decided (Zeke approved the recommendation): a street that already holds a whole one-line address is split into the two lines only when a state comes before the ZIP at its end; the separate city, state and ZIP are then not added. Any other street is used as typed, with the separate parts on line 2. Address 2 (service_address__other, More Than One Location only) is treated as blank when it holds nothing but commas and one state, for example \",  , New York \": nothing is sent, and an Address 2 the integration wrote earlier is cleared. Any other Address 2 is sent as stored."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 34708,
          "tabId": "t.0"
        },
        "text": " 11/21 — Zeke: Total Assigned Hours is the sum of hours_bt_work_schedule_1 and bt_rbt_2_work_schedule, added by the integration (a blank counts as 0). total_hours_bt1bt2_work_schedule is not used (its formula gives 2 on every Case). This replaces the note above. 11/23 — Zeke: use a HubSpot total when there is one, otherwise add the two hours. Finding (read 11/23): no change was needed: the only usable total, total_hours_btrbt_12, is a formula of the same two hours and equals the sum wherever it is filled. 11/23 — Zeke: \"if these are marked required on the doc then they need to be created and mapped.\" 11/24 — Proposed, for Zeke to confirm: the per-BT hours are not sent as separate fields, because this document does not mark them required and CentralReach has no target field for them."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 34454,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: send only the availability text, as CentralReach holds it; the weekly hours (client_service_hours_total) are not appended. This replaces the note above."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 34305,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: no code for the Location #2 schedules for now. Finding (read 11/23): both properties are empty on every production Case."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 33800,
          "tabId": "t.0"
        },
        "text": " 11/24 — Zeke: no date logic; the association label is the signal. Outgoing BT 1 (131) and Outgoing BT 2 (166) are sent with Primary BT 1 / 2 in BT #1 / BT #2 Name while the label is on the Case. Supervising BCBA (131308) uses the first of Supervising BCBA (82), SUB BCBA (234), Outgoing SUB BCBA (288), Outgoing Supervising BCBA (135). On Leave BCBA (236) is never sent. This settles the open points above."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 33029,
          "tabId": "t.0"
        },
        "text": " 11/23 — Decided (Zeke approved the recommendation): a Case's Supervising BCBA (82) is a Grad Permit holder when that BCBA's lba_licensure__ny is Grad Permit; no other property is read, and the typed supplier is not compared. 11/23 — Zeke: for a holder, Grad Permit Holder (136052) is sent as \"<First> <Last> Grad Permit Holder\", and Supervising BCBA (131308) is the BCBA(s) on the holder's Grad Permit Supervisor link (151) with \" BCBA LBA\"; with no 151 link, 131308 is not sent and a warning is logged. The holder's own name is never sent to 131308. 11/24 — Decided (Zeke approved the recommendation): when a Case has two Supervising BCBAs and only one is a Grad Permit holder, both 136052 and 131308 are left out (CentralReach keeps its values) and a warning is logged."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 32779,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: Supervising BCBA (131308) suffix. Each BCBA name is sent as \"<First> <Last> BCBA LBA\": always \" BCBA LBA\", whatever licence the BCBA holds. Several BCBAs are joined by \", \". When no BCBA is associated in a supervising role, the typed ongoing_central_reach_provider_supplier is sent with \" BCBA LBA\" added, unless the typed text already contains BCBA or LBA as a word; a blank supplier sends nothing."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 32318,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the Case Care Coordinator (138851) is read from the workflow fields care_coordinator_first_name, care_coordinator_last_name and coordinator_export_status, set by HubSpot workflows; the owners API, crm.objects.owners.read and care_coordinator_name (read since 11/20) are no longer used for it. This replaces the owners API note above. 11/24 — Zeke: the Care Coordinator field (138851) is not omitted; it is built now and proven in the sandbox before production, where testing must confirm the field is populated. 11/24 — Proposed, for Zeke to confirm: status ready sends \"<First> <Last>\"; no_owner sends no name (a name the integration wrote earlier is cleared); any other status leaves the CentralReach value unchanged and logs a warning. Finding (read 11/23): CentralReach's 138851 holds a name and CentralReach has no coordinator email field, so no email is sent. 11/24 — Zeke: the two coordinator workflows, like every property, workflow, list and report that exists only in the sandbox, are deployed from the sandbox to production. 11/24 — Proposed, for Zeke to confirm: before the first production sync, every coordinator has an active Team Member record and every in-scope Case is enrolled once, so coordinator_export_status is ready."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 32160,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the state sent to CentralReach (client state and line 2 of the service address) is stateregion; when it is blank or not a state, the Case location is used instead (an unreadable stateregion is logged as a warning by property name, not an error). For Other Location, service__stateregion_2 comes first. 11/21 — Zeke: on the Case, the BCBA and the BT/RBT, any other filled phone, email, state or gender that cannot be converted ends the run as error (the reason names the property, never the value) and nothing is sent. Phones are sent as the 10 digits CentralReach stores; any US form is accepted and an extension is dropped."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 30466,
          "tabId": "t.0"
        },
        "text": " 11/23 — Decided (Zeke approved the recommendation): on a client update, a core field that is blank in HubSpot never clears CentralReach: the integration reads the client first and sends back the value CentralReach holds. A read that is missing one of the eleven core fields stops the update (no change in CentralReach). Finding (read 11/24): on a create, a blank phi_date_of_birth is checked first: the run ends as error and no create is sent."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 29911,
          "tabId": "t.0"
        },
        "text": " 11/21 — Zeke: the BCBA date_of_birth is a single-line text field in production, not a property sync (this replaces \"the same property sync\" above); the integration converts the text to a date. 11/23 — Zeke: the integration reads date_of_birth, not dob. 11/24 — Zeke: while it is blank, the integration sends the placeholder 01/01/2000 on a create; how United Care wants the field filled is pending their answer. Finding (read 11/24): it is blank on all 375 production BCBAs, so every BCBA create sends the placeholder. 11/23 — Decided (Zeke approved the recommendation): the BT/RBT date_of_birth is text in production; the integration converts forms such as 2/20/1992 to a date. 11/24 — Zeke: Phase I only creates records that are new in CentralReach, so these records always carry the placeholder until United Care clarifies how they handle the date. 11/24 — Decided (Zeke approved the recommendation): on an update of a BCBA or a BT/RBT whose date_of_birth is blank in HubSpot, the integration sends back the date CentralReach holds, never the placeholder; if CentralReach's answer has no date of birth field at all, the read counts as failed: nothing is sent and nothing changes in CentralReach."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 29439,
          "tabId": "t.0"
        },
        "text": " 11/21 — Zeke: the BCBA primary email is the BCBA's email property, not ucaba_email_address. On an update the HubSpot email is sent when it is filled; a blank sends back the email CentralReach holds. This replaces the BCBA source and the update note above. A malformed email ends the run as error (the reason names the property, never the value); the status blocked is retired."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 19486,
          "tabId": "t.0"
        },
        "text": "\n11/23 — Zeke: production gating. The sandbox does not change: everything is gated with the sandbox test property sandbox_test_field (app setting SYNC_RECORD_GATE_PROPERTY = sandbox_test_field), with segments 1463, 1464 and 1465 as above. In production, each workflow that sends a webhook to Azure is gated by two segments per object (Case, BCBA and BT/RBT): \"CentralReach creates only\" for creates and \"CentralReach updates only\" for updates. A record that is in neither segment is not created or updated in CR until United Care confirms the outstanding items.\n11/23 — Zeke: the production gate is two checkboxes with the same internal names on the Case, the BCBA and the BT/RBT: centralreach_creates_only (\"CentralReach creates only\") and centralreach_updates_only (\"CentralReach updates only\"). Each segment is only \"its checkbox is true\". The integration reads the two checkboxes itself on every path (webhook, Contact changes, the hourly poller, the daily sweep and retries): a record with no CR ID in HubSpot is created only when centralreach_creates_only is true, and a record with a CR ID in HubSpot is updated only when centralreach_updates_only is true. A record with both blank gets no CR call on any path. App settings at cutover: SYNC_CREATE_GATE_PROPERTY = centralreach_creates_only and SYNC_UPDATE_GATE_PROPERTY = centralreach_updates_only; in production the integration requires these exact two names, and with any other value every run fails and alerts. No workflow copies a segment into another property, and sync_to_centralreach is not used. The two checkboxes also exist in the sandbox (created 11/23) for testing; the sandbox gate stays sandbox_test_field.\n11/24 — Zeke: how a record enters a segment. A HubSpot workflow ticks centralreach_creates_only only on records created after the cutover date with Entered = Yes and no CR ID. It is never ticked on a person who is already in CR: with a blank CR ID in HubSpot that makes a duplicate, and a Case has no name check at all. After the integration creates the record and writes its CR ID to HubSpot, a second HubSpot workflow ticks centralreach_updates_only, so the new record receives later updates. It fires only when the integration wrote the CR ID (the CR ID changes to known, centralreach_creates_only is true and the CentralReach link property is known). It does not fire when staff type a CR ID by hand; those records go to the existing-records review. Nothing unticks a checkbox automatically; a person unticks it to stop a record.\n11/23 — Zeke: new production properties. Zeke creates these in production before the deploy that reads them: the two gate checkboxes above on the Case, the BCBA and the BT/RBT; the Care Coordinator properties care_coordinator_first_name, care_coordinator_last_name, care_coordinator_email and coordinator_export_status on the Case and the BCBA; and referral_other (\"Referral - Other\") on the Case, with the same internal names as the sandbox. Before each deploy, a read-only check confirms each property by internal name; if a mapped property is missing, the production deploy waits until it exists, and if a gate checkbox is missing, every run fails and alerts. The integration reads the Case's care_coordinator_first_name, care_coordinator_last_name, coordinator_export_status and referral_other: built now and proven in the sandbox first, and in production once each property exists in production and its change is deployed. The production Case sync workflow triggers on those properties, not on the Case owner.\n11/23 — Zeke: existing records are a separate phase. HubSpot records that are already in CentralReach stay out of both segments at cutover (both checkboxes blank): no create and no update. Before any existing record goes into either segment, the team reviews HubSpot against CentralReach on the required properties and lists the mismatches for United Care to confirm. This review happens after sandbox testing is complete. Only then are the reviewed records ticked into \"CentralReach updates only\", batch by batch. Records linked to CentralReach by email or name only need their employee_id / Client ID written first; ticking centralreach_creates_only on them makes a duplicate.\n11/24 — Zeke: production is pushed in two phases. Phase I creates records only: the integration creates in CentralReach only HubSpot records that are new in CentralReach. Phase II reviews the existing HubSpot records against the existing CentralReach records, so that the existing CentralReach records reflect HubSpot; any discrepancy found between HubSpot and CentralReach is a Phase II production build. Every property, workflow, list and report that exists in the sandbox but not in production is deployed from the sandbox to production. A record the integration creates in Phase I still receives later updates through the second workflow above; only records that already existed in CentralReach wait for Phase II.\n11/24 — Decided (Zeke approved the recommendation): the creates workflow triggers on Entered = Yes, with \"created after the cutover date\" as a filter, so a new record whose Entered becomes Yes later is still picked up. New records created after the cutover need no further hold."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 18476,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: chosen: two checkboxes, centralreach_creates_only and centralreach_updates_only, read directly by the integration; see the 11/23 production gating notes below."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 6389,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: NM Employee and VA Employee are not sent yet; they are added to the label code when the client begins work in those states. Until then a New Mexico or Virginia Work State gets no state label (logged as a warning)."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 677,
          "tabId": "t.0"
        },
        "text": " 11/24 — Note: decisions made on Monday 11/23 and Tuesday 11/24 are added to this document as dated notes. \"11/23 — Zeke\" or \"11/24 — Zeke\" marks a rule in his recorded words; \"Decided (Zeke approved the recommendation)\" marks a rule he approved as recommended, and \"Decided (applied from Zeke's 11/24 rulings)\" one that follows from his rulings, both in the team's wording; \"Finding (read 11/23)\" or \"Finding (read 11/24)\" marks what a read-only check of HubSpot, CentralReach or the code found that day; \"Proposed, for Zeke to confirm\" marks a proposal he has not confirmed. Unless a note says it is already in place, a rule dated 11/23 or 11/24 that changes what the integration sends ships with the next deploy: the sandbox first, then production once its HubSpot properties exist. The full record, with his words quoted, is in the repository: docs/workstreams/architecture-update/BUILD-PACKAGE-DRAFT-2026-11-23.md and BUILD-PLAN.md section 4 (decision 39 onward). Where this document and those files differ, the repository files win until this document is updated."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 6713,
          "tabId": "t.yjiornmys9tz"
        },
        "text": " Finding (read 11/24): the CentralReach label test of 11/20 showed that a label POST replaces the whole set, so a label is removed by leaving it out. The hold was lifted on 11/20: Active / Inactive, the three staffing labels of [G19] and Billing Hold removal are built and sent (already in place)."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 4989,
          "tabId": "t.yjiornmys9tz"
        },
        "text": " 11/23 — Zeke: in production the two gate checkboxes are checked before this rule: a record with no CR ID needs centralreach_creates_only, a record with a CR ID needs centralreach_updates_only. Unticking centralreach_updates_only stops updates even when this rule is met, so in production this rule no longer holds on its own. See the 11/23 production gating notes in [G17]."
      }
    }
  ],
  "writeControl": {
    "requiredRevisionId": "AHj4eMRPezFuAAC4e20nsGnogSdORej3tkyX6RHwJuU9tHx6rVqOKBnzzsccHRuoEd7F3bFyxU-LekcqPb9Pd0FZt_AsCwXigOu49rOqZqM"
  }
}
```

If the write is refused for a revision mismatch, re-read and recompute every index; do not retry blind. After the write: re-read, confirm each text sits at the end of its anchor, that A shows seven new bullets right after the anchor bullet (the first-pass A had five) and that the callout is in both places.

## Batch 2 (crosswalk and index lines)

The remaining crosswalk texts (process, findings, test plan, history), the Auth Period and Contact fan-out notes, and the index lines. **34 inserts, all new**, 26 distinct texts (the four third-pass texts N-G02, N-Q12, N-12 and N-19 included).

**Batch 2's indexes must be recomputed from a fresh read after batch 1 is written, and the batch guarded by the revision ID of that read.** The table gives today's live index and the index expected after batch 1 (today's index plus the length of every batch 1 insert at or before it in the same tab); the request list uses the expected index only as a cross-check.

| Insert id | Tab | Anchor (where) | Anchor text (last 12 words) | Live index (today, before batch 1) | Expected index after batch 1 (recompute) | New or previously approved | Changed since approval |
|---|---|---|---|---|---|---|---|
| IDX-SCURRENT | `t.yt4axx5fffdf` | Index line "[S00] Sandbox Assets" (L112): one new line after it | "…webhook. See SREG for inventory and SBOUND for limits of the evidence." | 8445 | 9514 | new | n/a (new) |
| IDX-GER | `t.yt4axx5fffdf` | Index line "[GREAD] How to read this" (L62): seven new lines after it | "…dated updates when they resolve a question shown in an older table." | 4564 | 5633 | new | n/a (new) |
| IDX-L58 | `t.yt4axx5fffdf` | Index line "[G14] 11/14 — Updates from Danny" (L58) | "…exclusions, linked BT/RBT handling, clinical fields, and scopes. See C14 and C14B–C14E." | 4288 | 5357 | new | n/a (new) |
| IDX-G17 | `t.yt4axx5fffdf` | Index line "[G17] 11/17 — Updates from Danny and Zeke" (L56) | "…replaces the Workday ID hold for now, and the 11/18 build rules." | 4093 | 5162 | new | n/a (new) |
| X-38 | `t.yt4axx5fffdf` | Index paragraph "Use Tab 1 for the field maps" (L40) | "…latest explicit decision for that item and cite its date and section." | 2300 | 3369 | new | n/a (new) |
| IDX-L32 | `t.yt4axx5fffdf` | Index line "Create, refresh, or exclude records → [G11]" (L32) | "…External System ID; [G17] has the current rules, including the record gate." | 1090 | 2159 | new | n/a (new) |
| X-13 | `t.0` | GH29 row "Alternate service address — Case" (L898) | "…name is not specified. The destination spelling was confirmed in sandbox 52311591." | 114308 | 137532 | new | n/a (new) |
| X-04 | `t.0` | G10B bullet "Employees already in CentralReach" (L751) | "…Care's confirmation, and check at go-live which employees are already in CR." | 98397 | 121247 | new | n/a (new) |
| X-40 | `t.0` | G10B bullet "One Workday ID on two records" (L747) | "…a solution. A read-only check on 11/17 found neither person in CR." | 97484 | 120334 | new | n/a (new) |
| N-G02 | `t.0` | G02 bullet "Care Coordinator is the Case owner" (L483), after its closing "." | "…ID. Resolve it to a name and email with GET /crm/v3/owners/{id} ." | 61999 | 78743 | new | n/a (new) |
| N-8 | `t.0` | GER-CONTACT row "Guardian routing" (L451) | "…Guardian Contact associated to the Case. Route changes to the linked Case." | 56858 | 73299 | new | n/a (new) |
| X-36c | `t.0` | GER-BT row "Production workflows · To create" (L442) | "…[SCURRENT] for the BT/RBT object type and association IDs in sandbox 52311591." | 55867 | 72308 | new | n/a (new) |
| X-03c | `t.0` | GER-BT row "Employee ID and link · CR → HS" (L430) | "…is the CR contactId. Write it to employee_id in sandbox and production." | 51865 | 68306 | new | n/a (new) |
| X-36b | `t.0` | GER-BCBA row "Production workflows · To create" (L420) | "…[SCURRENT] for the BCBA object type and association IDs in sandbox 52311591." | 50444 | 66885 | new | n/a (new) |
| X-03b | `t.0` | GER-BCBA row "Employee ID and link · CR → HS" (L403) | "…is the CR contactId. Write it to employee_id in sandbox and production." | 44927 | 60460 | new | n/a (new) |
| X-36a | `t.0` | GER-CASE row "Production workflows · To create" (L392) | "…is currently creating workflows in sandbox 52311591. Use [SCURRENT] for that account." | 42841 | 58176 | new | n/a (new) |
| N-7 | `t.0` | GER-CASE row "Auth Period" (L372) | "…as YYYY-MM-DD and are written at midnight UTC. Exclude upcoming-auth _f fields." | 35152 | 48080 | new | n/a (new) |
| N-Q12 | `t.0` | GER-CASE row "Staffing change signals" (L367) | "…re-read associations for roles. current_primary_bt workflow or custom-code handling is under consideration." | 34066 | 45899 | new | n/a (new) |
| X-03a | `t.0` | GER-CASE row "Client ID and link · CR → HS" (L355) | "…ID to client_id_number. The link property is on the integration's write list." | 31280 | 39626 | new | n/a (new) |
| X-39f | `t.0` | GER-REQ row "Employee · PrimaryEmail" (L341), after X-35a | "…holds; whether CR accepts a changed email by API is not tested." | 29439 | 36299 | new | n/a (new) |
| X-39e | `t.0` | GER-REQ row "Employee · LastName" (L340) | "…and CR rejects the create. This changes in the employee mapping slice." | 28875 | 35479 | new | n/a (new) |
| X-39d | `t.0` | GER-REQ row "Employee · FirstName" (L339) | "…employee mapping slice. A record with a blank name is not sent." | 28616 | 35220 | new | n/a (new) |
| X-39c | `t.0` | GER-REQ row "Employee · ExternalSystemId" (L338) | "…ID, and a person can change the ID on the CR profile." | 28394 | 34998 | new | n/a (new) |
| N-12 | `t.0` | GER-REQ row "Employee · ContactForm" (L337), last cell | "…Covered. Sent on every employee create." | 27522 | 34126 | new | n/a (new) |
| N-19 | `t.0` | GER paragraph "Field and label mappings run from HubSpot…" (L328), end | "…sandbox-specific IDs and workflow checks. W1–W6 document the older 50850427 workflow configuration." | 26662 | 33266 | new | n/a (new) |
| X-39b | `t.0` | G17 bullet "Not built yet" (L284) | "…after United Care answers. The build plan is docs/workstreams/architecture-update/BUILD-PLAN.md in the repo." | 20366 | 26970 | new | n/a (new) |
| X-29 | `t.0` | G17 bullet "ID mismatch" (L276) | "…client read; to be checked before linked Case updates are turned on." | 16220 | 17517 | new | n/a (new) |
| X-39a | `t.0` | G17 bullet "Sync status values" (L274) | "…retired. Code today still writes blocked and noop until this is built." | 13852 | 15149 | new | n/a (new) |
| X-31 | `t.0` | G20 bullet "Not tested yet" (L214) | "…is rejected for the name, drop the # and note it here." | 4116 | 5185 | new | n/a (new) |
| X-25b | `t.0` | G20 bullet "Workday ID" (L210) | "…Workday ID: both get the same AZTEST-N value, for that test only." | 3735 | 4804 | new | n/a (new) |
| X-28 | `t.yjiornmys9tz` | Architecture tab bullet "11/17 — CentralReach lookup verified read-only" (L1740) | "…can change the ID on the CR profile although the API cannot." | 8643 | 9314 | new | n/a (new) |
| X-37 | `t.yjiornmys9tz` | Architecture tab bullet "11/17 — Start rules" (L1738) | "…final sandbox test plan, deploy while the app is stopped, sandbox testing." | 8282 | 8953 | new | n/a (new) |
| X-24 | `t.yjiornmys9tz` | Architecture tab bullet "11/17 — Checks that come before any start" (L1736) | "…record is linked to is not linked and shows waiting. See [G17]." | 7602 | 8273 | new | n/a (new) |
| X-27 | `t.yjiornmys9tz` | Architecture tab bullet "11/17 — Approved design" (L1730) | "…and 4 hours, then dead-letter; a record with no change writes nothing." | 6177 | 6551 | new | n/a (new) |

### Batch 2 texts, verbatim

**IDX-L32** (starts with a space; 36 characters)

```text
 See [GBR] for Requirements 1 and 2.
```

**X-38** (starts with a space; 138 characters)

```text
 11/24 — Zeke: check the production portal first for fields and live example records (read-only), then CentralReach, and the sandbox last.
```

**IDX-G17** (starts with a space; 143 characters)

```text
 11/23: production gating (two checkboxes, centralreach_creates_only and centralreach_updates_only; existing records are Phase II) is in [G17].
```

**IDX-L58** (starts with a space; 18 characters)

```text
 11/19: see [G19].
```

**IDX-GER** (starts with a line break: each line is a new paragraph; 911 characters) (corrected 2026-11-24 recency audit)

```text

[GBR] Business rules · Requirement 1 (initial creation) and Requirement 2 (ongoing updates), with the four Case Cleanup-stage exclusions.
[GER] Entity requirements · Field and label mappings by entity, the CentralReach required create fields and the sandbox rows. Test these first in sandbox 52311591.
[GER-REQ] CentralReach required create fields · What CentralReach needs to create a client or an employee and what happens when a field is blank.
[GER-CASE] Case / CentralReach Client requirements · Case field, label, staffing and exclusion rows, with the sandbox row.
[GER-BCBA] BCBA / CentralReach Employee requirements · BCBA fields, labels, Grad Permit associations and the sandbox row.
[GER-BT] BT/RBT / CentralReach Employee requirements · BT/RBT fields, role and state labels and the sandbox row.
[GER-CONTACT] Contact requirements for linked records · Guardian routing and what a Contact change does.
```

Audit correction (2026-11-24 recency audit, section C4): the [GER-CONTACT] line no longer promises "the Contact workflow".

**IDX-SCURRENT** (starts with a line break: each line is a new paragraph; 139 characters)

```text

[SCURRENT] Current sandbox configuration and ID crosswalk · Sandbox 52311591 object types and association IDs against production 50317927.
```

**X-25b** (starts with a space; 134 characters)

```text
 11/23 — Zeke: the Workday test values are any 7 digits (for example 4465360), not AZTEST values, which the format check would reject.
```

**X-31** (starts with a space; 459 characters)

```text
 11/24 — Note: the repo copy (SANDBOX-TEST-PLAN.md) changed on 11/23 and 11/24 and now wins where they differ: names end in "RN" (HubSpot refused "#"); phones keep the digits but the input form changes by round; phone_number__second_ is not used; home_apt is Apt NA / NB / NC; the BCBA primary email is email (not ucaba_email_address), the personal email is personal_email, and the date of birth is date_of_birth as text; Workday test values are any 7 digits.
```

**X-39a, X-39c, X-39d, X-39e, X-39f** (starts with a space; 69 characters)

```text
 Finding (read 11/24): built; the "code today" note above is history.
```

**X-29** (starts with a space; 282 characters)

```text
 Finding (read 11/23): after the CR API user was connected, 487 of 489 Case Client IDs resolve (2 are wrong values). Finding (read 11/24): the client read returns the External System ID when CentralReach holds one and leaves it out when blank. This updates the 11/18 findings above.
```

Reviewer change: the anchor (L276) says the client read does not return the External System ID and 81 of 100 Client IDs were not found; the update is now stated.

**X-39b** (starts with a space; 236 characters)

```text
 Finding (read 11/24): the temporary External System ID, the three status values and the ID mismatch stop are now built, and a blank Workday ID creates with the temporary ID; the "not built yet" and "code today" notes above are history.
```

**X-03a, X-03b, X-03c** (starts with a space; 281 characters)

```text
 11/24 — Zeke: at cutover, a read-only production check of the CentralReach link property's history confirms that only the integration fills it. The "promote after create" workflow relies on that; if anything else fills it, the workflow needs another marker before it is turned on.
```

Reviewer change: "this property" was ambiguous in rows that name two properties (the CR ID and the link); the check is on the link property (package D18 c, recommendation 6).

**N-7** (starts with a space; 251 characters)

```text
 11/24 — Decided (Zeke approved the recommendation): kept as built: the Auth Period goes to a CentralReach text field as "MM/DD/YYYY - MM/DD/YYYY", the form CentralReach holds, not as a midnight-UTC date. This replaces "written at midnight UTC" above.
```

Reviewer change: re-labelled (master question 34, closing sentence only); "replaces" added for the anchor's "written at midnight UTC".

**X-36b, X-36c** (starts with a space; 234 characters)

```text
 11/23 — Zeke: the re-enrollment triggers are set up in each sandbox workflow and maintained in HubSpot; the integration no longer checks them. A mapped property that is not a trigger is still caught by the poller and the daily sweep.
```

**X-36a** (starts with a space; 493 characters) (corrected 2026-11-24 recency audit)

```text
 11/23 — Zeke: the re-enrollment triggers are set up in each sandbox workflow and maintained in HubSpot; the integration no longer checks them. A mapped property that is not a trigger is still caught by the poller and the daily sweep. 11/24 — Finding (read 11/24): because a Guardian edit reaches the integration through the Case, the production Case workflow's trigger list must hold guardian_first_name, guardian_last_name, email, phone and location; Zeke keeps the trigger lists in HubSpot.
```

Audit correction (2026-11-24 recency audit, section D, guide lines L392/L1040 to L1194): the Case row now also says the production Case trigger list must hold the four Guardian sync properties and location. Notes: [needs Zeke: Contact workflow confirmation]. X-36b and X-36c unchanged.

**N-8** (starts with a space; 598 characters) (corrected 2026-11-24 recency audit)

```text
 11/24 — Decided (Zeke approved the recommendation): accepted as built: a Contact change queues every Case associated with the Contact, whatever the association type or contact_category; each Case is gated and reads its own Guardian sync properties. Finding (read 11/24): no Contact value is sent to CentralReach, and a Guardian edit reaches it through the Case: the Guardian first name, last name, email and phone are Case property-sync fields (11/09), and the Case workflow, the hourly poller or the daily sweep sends the change. A separate Contact workflow is not needed for the Guardian fields.
```

Audit correction (2026-11-24 recency audit, table 2 row R02 "N-8" and section C): the Guardian path is the Case property sync, not the fan-out; added as a finding after the accepted-as-built sentence. Notes: [needs Zeke: Contact workflow confirmation].

Reviewer change: re-labelled (master question 35, closing sentence only).

**X-40** (starts with a space; 128 characters)

```text
 Finding (read 11/23): 1034820 is one CentralReach employee (4499766); the existing record was kept. 2002628 is still not found.
```

**X-04** (starts with a space; 369 characters)

```text
 Finding (read 11/23): after the CR API user was connected, of the Entered in CentralReach = Yes employees, 210 BT/RBT and 99 BCBA are found by Workday ID (they end waiting, no create), and 181 BT/RBT and 11 BCBA are in CR only by email or name. Those 192 would be created a second time if their creates box were ticked; their employee_id is written first, in Phase II.
```

Reviewer change: under the 11/23–11/24 gating none of these existing records gets the creates box (A bullets 3 and 5; package D19), so "would be created a second time unless…" overstated the risk.

**X-13** (starts with a space; 90 characters)

```text
 11/23 — Zeke: not needed; see the Case requirements row "Production follow-up · Pending".
```

**X-27** (starts with a space; 448 characters)

```text
 11/23 — Zeke: CentralReach API tier is Core: 150,000 calls a month, $0.003 a call over. Sandbox testing writes to the same CentralReach, so it uses the same allowance. Open items: measure the real monthly cost and keep the code under the cap, before existing records are added; and check whether HubSpot's webhooks journal reduces calls. Before cutover: a daily CentralReach call count with an alert, and one retry (not five) for daily-sweep runs.
```

Reviewer change: internal open-item IDs (O-CR-BUDGET, O-HS-JOURNAL) removed; a HubSpot admin cannot look them up in this document.

**X-24** (starts with a space; 155 characters)

```text
 11/23 — Zeke: CentralReach can take about 150 seconds to show a label change, so after an unconfirmed label POST the first retry waits at least that long.
```

**X-37** (starts with a space; 242 characters)

```text
 11/24 — Zeke: the poller runs every 5 minutes during sandbox testing (app setting INTAKE_POLLER_SCHEDULE) and is turned on for the end-to-end tests once the changes are deployed. At cutover the setting is removed, so production polls hourly.
```

**X-28** (starts with a space; 294 characters)

```text
 11/23 — Zeke: the CentralReach API acts as one user, Gavriella Bohan (CR 4147071), now connected to clients and employees (a 404 on a contact can mean the API user is not connected to it). Cutover tasks: auto-connect from her profile to all new clients, and a dedicated API user (owner Danny).
```

Reviewer change: "means" overstated; a 404 also answers a contact that does not exist (08 crosswalk X-40: "404 may mean not connected").

**N-G02** (starts with a space; 334 characters)

```text
 11/23 — Zeke: replaced for the Case Care Coordinator (138851): the integration reads care_coordinator_first_name, care_coordinator_last_name and coordinator_export_status, set by HubSpot workflows, and no longer reads hubspot_owner_id or the owners API for it. See the Care Coordinator rows in the Case requirements and in section 3.
```

New (third pass): the pointer the review asked for (section 3: the G02 bullet contradicted X-15). Same source and wording as X-15's 11/23 sentence. The bullet ends "…{id}", two soft line breaks, then a lone "."; the text goes after that ".", before the paragraph end, so it takes the plain 9.5 pt Calibri of the "." (inserted right after "{id}" it would take the bullet's Consolas code style).

**N-Q12** (starts with a space; 429 characters)

```text
 11/24 — Decided (Zeke approved the recommendation): the item 10 roles, SUB BCBA (234), Outgoing SUB BCBA (288), Outgoing Supervising BCBA (135) and Outgoing BT 1 / 2 (131 / 166), have no change signal of their own: they are not among the five properties above. A change to one of them reaches CentralReach with the Case's next sync from another change, or at the daily sweep, so up to about 24 hours later. Accepted for go-live.
```

New (third pass): master question 12 (01 question 1); decided under "On the remaining open items, apply your recommendation." Checked against the code: the hourly poller picks up Cases by `hs_lastmodifieddate`, and the daily sweep (`src/workflows/intakePollerWorkflow.mjs`, first run at or after 08:00 UTC) queues every linked record, so a role change with no other change waits for the sweep. The roles themselves (item 10) are in the pending build.

**N-12** (starts with a space; 470 characters)

```text
 11/24 — Decided (Zeke approved the recommendation): CentralReach has no Colorado Behavior Technician form, so a BT/RBT whose Work State(s) include Colorado and not New York is created with the form "RBT CO", whether a BT or an RBT. Every other BT/RBT, New Jersey included (no New Jersey form exists), is created with "Behavior Technician NY"; every BCBA with "Admin". The form is set on the create only; the labels still follow the role-by-state rule. Already in place.
```

New (third pass): master question 15 (N-12; BUILD-PLAN decision 17, rule 5.9). **Flag:** the recommendation says "a Colorado-only BT/RBT"; the code (`getEmployeeContactForm`, `src/lib/centralReachClient.mjs`, also at deployed `655b385`) uses "RBT CO" when the Work States hold Colorado and **not New York**, so Colorado with New Jersey also gets "RBT CO". The text states what the code does.

**N-19** (starts with a space; 459 characters)

```text
 11/24 — Decided (Zeke approved the recommendation): removal rule for labels. Every label the integration maps is managed: it is on the CentralReach client or employee only while its HubSpot source says so, and the integration removes it when the source no longer does. Labels the integration does not map, including labels staff add by hand in CentralReach, are kept. The base labels All Clients, All Employees and Clinical are always sent. Already in place.
```

New (third pass): master question 19 (N-19; BUILD-PLAN decisions 13 and 14, rule 5.6, BR19). Checked against the code: `labelSetToPost` (`src/lib/centralReachClient.mjs`, also at deployed `655b385`) posts the labels CentralReach holds, minus the managed labels, plus the required ones. The recommendation says "on the client"; the code applies the same rule to employees, so the text says "client or employee". Anchored at the end of the [GER] lead paragraph, whose sentence "Confirm removal rules where the guide … leaves removal after source changes open" this answers.


### Batch 2 request list, in send order (indexes to be recomputed)

Send order (expected indexes): IDX-SCURRENT (9514), IDX-GER (5633), IDX-L58 (5357), IDX-G17 (5162), X-38 (3369), IDX-L32 (2159), X-13 (137532), X-04 (121247), X-40 (120334), N-G02 (78743), N-8 (73299), X-36c (72308), X-03c (68306), X-36b (66885), X-03b (60460), X-36a (58176), N-7 (48080), N-Q12 (45899), X-03a (39626), X-39f (36299), X-39e (35479), X-39d (35220), X-39c (34998), N-12 (34126), N-19 (33266), X-39b (26970), X-29 (17517), X-39a (15149), X-31 (5185), X-25b (4804), X-28 (9314), X-37 (8953), X-24 (8273), X-27 (6551).

```json
{
  "requests": [
    {
      "insertText": {
        "location": {
          "index": 9514,
          "tabId": "t.yt4axx5fffdf"
        },
        "text": "\n[SCURRENT] Current sandbox configuration and ID crosswalk · Sandbox 52311591 object types and association IDs against production 50317927."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 5633,
          "tabId": "t.yt4axx5fffdf"
        },
        "text": "\n[GBR] Business rules · Requirement 1 (initial creation) and Requirement 2 (ongoing updates), with the four Case Cleanup-stage exclusions.\n[GER] Entity requirements · Field and label mappings by entity, the CentralReach required create fields and the sandbox rows. Test these first in sandbox 52311591.\n[GER-REQ] CentralReach required create fields · What CentralReach needs to create a client or an employee and what happens when a field is blank.\n[GER-CASE] Case / CentralReach Client requirements · Case field, label, staffing and exclusion rows, with the sandbox row.\n[GER-BCBA] BCBA / CentralReach Employee requirements · BCBA fields, labels, Grad Permit associations and the sandbox row.\n[GER-BT] BT/RBT / CentralReach Employee requirements · BT/RBT fields, role and state labels and the sandbox row.\n[GER-CONTACT] Contact requirements for linked records · Guardian routing and what a Contact change does."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 5357,
          "tabId": "t.yt4axx5fffdf"
        },
        "text": " 11/19: see [G19]."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 5162,
          "tabId": "t.yt4axx5fffdf"
        },
        "text": " 11/23: production gating (two checkboxes, centralreach_creates_only and centralreach_updates_only; existing records are Phase II) is in [G17]."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 3369,
          "tabId": "t.yt4axx5fffdf"
        },
        "text": " 11/24 — Zeke: check the production portal first for fields and live example records (read-only), then CentralReach, and the sandbox last."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 2159,
          "tabId": "t.yt4axx5fffdf"
        },
        "text": " See [GBR] for Requirements 1 and 2."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 137532,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: not needed; see the Case requirements row \"Production follow-up · Pending\"."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 121247,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/23): after the CR API user was connected, of the Entered in CentralReach = Yes employees, 210 BT/RBT and 99 BCBA are found by Workday ID (they end waiting, no create), and 181 BT/RBT and 11 BCBA are in CR only by email or name. Those 192 would be created a second time if their creates box were ticked; their employee_id is written first, in Phase II."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 120334,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/23): 1034820 is one CentralReach employee (4499766); the existing record was kept. 2002628 is still not found."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 78743,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: replaced for the Case Care Coordinator (138851): the integration reads care_coordinator_first_name, care_coordinator_last_name and coordinator_export_status, set by HubSpot workflows, and no longer reads hubspot_owner_id or the owners API for it. See the Care Coordinator rows in the Case requirements and in section 3."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 73299,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): accepted as built: a Contact change queues every Case associated with the Contact, whatever the association type or contact_category; each Case is gated and reads its own Guardian sync properties. Finding (read 11/24): no Contact value is sent to CentralReach, and a Guardian edit reaches it through the Case: the Guardian first name, last name, email and phone are Case property-sync fields (11/09), and the Case workflow, the hourly poller or the daily sweep sends the change. A separate Contact workflow is not needed for the Guardian fields."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 72308,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the re-enrollment triggers are set up in each sandbox workflow and maintained in HubSpot; the integration no longer checks them. A mapped property that is not a trigger is still caught by the poller and the daily sweep."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 68306,
          "tabId": "t.0"
        },
        "text": " 11/24 — Zeke: at cutover, a read-only production check of the CentralReach link property's history confirms that only the integration fills it. The \"promote after create\" workflow relies on that; if anything else fills it, the workflow needs another marker before it is turned on."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 66885,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the re-enrollment triggers are set up in each sandbox workflow and maintained in HubSpot; the integration no longer checks them. A mapped property that is not a trigger is still caught by the poller and the daily sweep."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 60460,
          "tabId": "t.0"
        },
        "text": " 11/24 — Zeke: at cutover, a read-only production check of the CentralReach link property's history confirms that only the integration fills it. The \"promote after create\" workflow relies on that; if anything else fills it, the workflow needs another marker before it is turned on."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 58176,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the re-enrollment triggers are set up in each sandbox workflow and maintained in HubSpot; the integration no longer checks them. A mapped property that is not a trigger is still caught by the poller and the daily sweep. 11/24 — Finding (read 11/24): because a Guardian edit reaches the integration through the Case, the production Case workflow's trigger list must hold guardian_first_name, guardian_last_name, email, phone and location; Zeke keeps the trigger lists in HubSpot."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 48080,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): kept as built: the Auth Period goes to a CentralReach text field as \"MM/DD/YYYY - MM/DD/YYYY\", the form CentralReach holds, not as a midnight-UTC date. This replaces \"written at midnight UTC\" above."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 45899,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): the item 10 roles, SUB BCBA (234), Outgoing SUB BCBA (288), Outgoing Supervising BCBA (135) and Outgoing BT 1 / 2 (131 / 166), have no change signal of their own: they are not among the five properties above. A change to one of them reaches CentralReach with the Case's next sync from another change, or at the daily sweep, so up to about 24 hours later. Accepted for go-live."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 39626,
          "tabId": "t.0"
        },
        "text": " 11/24 — Zeke: at cutover, a read-only production check of the CentralReach link property's history confirms that only the integration fills it. The \"promote after create\" workflow relies on that; if anything else fills it, the workflow needs another marker before it is turned on."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 36299,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/24): built; the \"code today\" note above is history."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 35479,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/24): built; the \"code today\" note above is history."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 35220,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/24): built; the \"code today\" note above is history."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 34998,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/24): built; the \"code today\" note above is history."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 34126,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): CentralReach has no Colorado Behavior Technician form, so a BT/RBT whose Work State(s) include Colorado and not New York is created with the form \"RBT CO\", whether a BT or an RBT. Every other BT/RBT, New Jersey included (no New Jersey form exists), is created with \"Behavior Technician NY\"; every BCBA with \"Admin\". The form is set on the create only; the labels still follow the role-by-state rule. Already in place."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 33266,
          "tabId": "t.0"
        },
        "text": " 11/24 — Decided (Zeke approved the recommendation): removal rule for labels. Every label the integration maps is managed: it is on the CentralReach client or employee only while its HubSpot source says so, and the integration removes it when the source no longer does. Labels the integration does not map, including labels staff add by hand in CentralReach, are kept. The base labels All Clients, All Employees and Clinical are always sent. Already in place."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 26970,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/24): the temporary External System ID, the three status values and the ID mismatch stop are now built, and a blank Workday ID creates with the temporary ID; the \"not built yet\" and \"code today\" notes above are history."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 17517,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/23): after the CR API user was connected, 487 of 489 Case Client IDs resolve (2 are wrong values). Finding (read 11/24): the client read returns the External System ID when CentralReach holds one and leaves it out when blank. This updates the 11/18 findings above."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 15149,
          "tabId": "t.0"
        },
        "text": " Finding (read 11/24): built; the \"code today\" note above is history."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 5185,
          "tabId": "t.0"
        },
        "text": " 11/24 — Note: the repo copy (SANDBOX-TEST-PLAN.md) changed on 11/23 and 11/24 and now wins where they differ: names end in \"RN\" (HubSpot refused \"#\"); phones keep the digits but the input form changes by round; phone_number__second_ is not used; home_apt is Apt NA / NB / NC; the BCBA primary email is email (not ucaba_email_address), the personal email is personal_email, and the date of birth is date_of_birth as text; Workday test values are any 7 digits."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 4804,
          "tabId": "t.0"
        },
        "text": " 11/23 — Zeke: the Workday test values are any 7 digits (for example 4465360), not AZTEST values, which the format check would reject."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 9314,
          "tabId": "t.yjiornmys9tz"
        },
        "text": " 11/23 — Zeke: the CentralReach API acts as one user, Gavriella Bohan (CR 4147071), now connected to clients and employees (a 404 on a contact can mean the API user is not connected to it). Cutover tasks: auto-connect from her profile to all new clients, and a dedicated API user (owner Danny)."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 8953,
          "tabId": "t.yjiornmys9tz"
        },
        "text": " 11/24 — Zeke: the poller runs every 5 minutes during sandbox testing (app setting INTAKE_POLLER_SCHEDULE) and is turned on for the end-to-end tests once the changes are deployed. At cutover the setting is removed, so production polls hourly."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 8273,
          "tabId": "t.yjiornmys9tz"
        },
        "text": " 11/23 — Zeke: CentralReach can take about 150 seconds to show a label change, so after an unconfirmed label POST the first retry waits at least that long."
      }
    },
    {
      "insertText": {
        "location": {
          "index": 6551,
          "tabId": "t.yjiornmys9tz"
        },
        "text": " 11/23 — Zeke: CentralReach API tier is Core: 150,000 calls a month, $0.003 a call over. Sandbox testing writes to the same CentralReach, so it uses the same allowance. Open items: measure the real monthly cost and keep the code under the cap, before existing records are added; and check whether HubSpot's webhooks journal reduces calls. Before cutover: a daily CentralReach call count with an alert, and one retry (not five) for daily-sweep runs."
      }
    }
  ],
  "writeControl": {
    "requiredRevisionId": "<revision ID read right after batch 1 is written>"
  }
}
```

## Batch 3: corrections from the recency audit

Insert-only dated notes for guide lines that a later source has made stale (`requirements-recency-audit-2026-11-24.md` section D and C4), where Batch 1 and Batch 2 do not already carry the correction at that line. **51 inserts, 23 distinct texts, all new, all in tab `t.0`.** Not yet sent. Indexes are computed at write time from a fresh read after Batches 1 and 2 are written; each insert goes immediately after the anchor sentence named (the last words of the sentence in the snapshot `guide-extract-2026-11-24.md`, L = snapshot line), inside the cell or paragraph named, with the highest index first. An insert marked "after X-xx" goes after that Batch 1 or 2 text at the same position. Texts that depend on the pending Contact workflow answer carry the note [needs Zeke: Contact workflow confirmation] in this file only, never in the text.

| Insert id | Guide line | Where | Anchor (last words of the sentence it follows) | Text id | Placement note | Audit row (section D) |
|---|---|---|---|---|---|---|
| B3-01 | L455 | 3rd cell | "…Current sandbox workflow work is in 52311591." | B3-A | none | D1 |
| B3-02 | L790 | bullet | "…not a statement that the workflow is implemented." | B3-A | none | D1 |
| B3-03 | L822 | bullet | "…linked to a gated record." | B3-A | none | D1 |
| B3-04 | L860 | bullet | "…Add a 4th ongoing workflow for Contacts (guardian name/email, BCBA personal email)." | B3-A | none | D1 |
| B3-05 | L452 | 3rd cell | "…reach the eligible linked Case, including phone." | B3-B | none | D2 |
| B3-06 | L456 | 3rd cell | "…Apply the same linked-record eligibility and exclusions as above." | B3-C | none | D2, D3 |
| B3-07 | L421 | 3rd cell | "…propagation of personal-email changes from the linked Contact." | B3-D | none | D3 |
| B3-08 | L580 | 4th cell | "…email on the BCBA's Contact (BCBA to Contact association 17)." | B3-D | none | D3 |
| B3-09 | L788 | bullet | "…not confirmed implementation." | B3-D | none | D3 |
| B3-10 | L892 | 3rd cell (last) | "…the note does not confirm completion." | B3-D | none | D3 |
| B3-11 | L901 | paragraph | "…staff phone sync, and the alternate-service-address workflow." | B3-D | none | D3 |
| B3-12 | L208 | bullet | "…CentralReach shows this employee as Zeke Swanson BCBA Azure Test #N." | B3-E | none | D4 |
| B3-13 | L576 | 4th cell | "…No new field." | B3-E | none | D4 |
| B3-14 | L420 | 3rd cell | "…Use [SCURRENT] for the BCBA object type and association IDs in sandbox 52311591." | B3-F | after X-36b (same cell end) | D3, D31 |
| B3-15 | L442 | 3rd cell | "…Use [SCURRENT] for the BT/RBT object type and association IDs in sandbox 52311591." | B3-F | after X-36c (same cell end) | D31 |
| B3-16 | L204 | bullet | "…CentralReach shows this client as Zeke Swanson Azure Test #N." | B3-G | none | D10 (L204) |
| B3-17 | L250 | bullet | "…Nothing changes until Sara answers and Zeke decides." | B3-H | none | D13 (L250) |
| B3-18 | L773 | bullet | "…have been updated for active sandbox 52311591." | B3-I | none | D14 (L773) |
| B3-19 | L552 | 4th cell | "…A BCBA marked Outgoing with no removal date is still active (Sara's rule)." | B3-J | none | D15 |
| B3-20 | L556 | 4th cell | "…Leaving; not the active BCBA." | B3-J | none | D15 |
| B3-21 | L513 | 4th cell | "…we will tell you where it lands." | B3-K | none | D16 |
| B3-22 | L365 | 3rd cell | "…Outgoing BT 1/2 (131/166) remain active until the removal date passes." | B3-L | none | D17 |
| B3-23 | L561 | 4th cell | "…Leaving. Still active until a removal date passes." | B3-L | none | D17 |
| B3-24 | L530 | 4th cell | "…Pick by insurance type." | B3-M | none | D22 |
| B3-25 | L383 | 3rd cell | "…Nothing is sent to CR for case_status until the test is run." | B3-N | none | D24 |
| B3-26 | L418 | 3rd cell | "…the previous label stays until staff remove it in CentralReach." | B3-N | none | D24 |
| B3-27 | L608 | 3rd cell | "…Nothing is sent to CR for case_status until the test is run." | B3-N | none | D24 |
| B3-28 | L693 | 3rd cell | "…the previous label stays until staff remove it in CentralReach." | B3-N | none | D24 |
| B3-29 | L384 | 3rd cell | "…The staffing label row is built after the CentralReach label test." | B3-O | none | D24, D25 |
| B3-30 | L609 | 3rd cell | "…Zeke decides whether the row is sent add-only or held." | B3-O | none | D24, D25 |
| B3-31 | L256 | bullet | "…Zeke decides whether the row is sent add-only or held." | B3-P | none | D25 (L256) |
| B3-32 | L294 | paragraph | "…Source: Change Log tab, “11/14 — Updates from Danny”." | B3-P | none | D25 (L294) |
| B3-33 | L735 | bullet | "…Zeke decides whether the row is sent add-only or held." | B3-P | none | D25 (L735) |
| B3-34 | L387 | 3rd cell | "…Use location to resolve the state." | B3-Q | none | D26 |
| B3-35 | L388 | 3rd cell | "…Both discrete options exist in production." | B3-Q | none | D26 |
| B3-36 | L389 | 3rd cell | "…The guide lists no CR target labels for these combinations." | B3-Q | none | D26 |
| B3-37 | L413 | 3rd cell | "…Skip New Mexico and Virginia for now." | B3-R | none | D27 |
| B3-38 | L439 | 3rd cell | "…Skip New Mexico and Virginia for now." | B3-R | none | D27 |
| B3-39 | L686 | 3rd cell | "…New Mexico / Virginia — skip for now." | B3-R | none | D27 |
| B3-40 | L700 | 3rd cell | "…New Mexico / Virginia — skip for now." | B3-R | none | D27 |
| B3-41 | L741 | bullet | "…per the feedback continuation under “10/29 — TO CONFIRM IN PROD TESTING”." | B3-R | none | D27 |
| B3-42 | L416 | 3rd cell | "…the NJ values MCD-NJ and Horizon-NJ." | B3-S | none | D28 |
| B3-43 | L417 | 3rd cell | "…MCD-NJ and Horizon-NJ have no documented CR target." | B3-S | none | D28 |
| B3-44 | L692 | 3rd cell | "…No NJ or state-specific labels." | B3-S | none | D28 |
| B3-45 | L440 | 3rd cell | "…bt_to_rbt_path has no effect." | B3-T | none | D29 |
| B3-46 | L1046 | paragraph | "…13 properties; 26 event groups." | B3-U | none | D30 (W1-W6) |
| B3-47 | L599 | 4th cell | "…the integration will fill it from active_cases_count (display only)." | B3-V | insert right after this sentence, before the line breaks and the link | D32 |
| B3-48 | L771 | paragraph | "…the mapping are still to be added to the integration." | B3-V | insert right after this sentence, before the line breaks and the image | D32 |
| B3-49 | L338 | 3rd cell | "…a person can change the ID on the CR profile." | B3-W | after X-39c (same cell end) | D9 |
| B3-50 | L405 | 3rd cell | "…staff replace it with the Workday ID on the CR profile. See [G17]." | B3-W | none | D9 |
| B3-51 | L432 | 3rd cell | "…staff replace it with the Workday ID on the CR profile. See [G17]." | B3-W | none | D9 |

### Batch 3 texts, verbatim

Each block is the exact `text`. A leading space is part of the text. Notes after a block are for this file only.

**B3-A** (B3-01, B3-02, B3-03, B3-04; starts with a space; 463 characters)

```text
 11/24 — Finding (read 11/24): no separate Contact workflow is needed. The Guardian first name, last name, email and phone are Case property-sync fields (created in production 11/09) and the integration reads them from the Case; a Guardian edit reaches CentralReach through the Case workflow, the hourly poller or the daily sweep. The BCBA personal email is the BCBA's own personal_email (11/23). This replaces the fourth Contact workflow requested in this guide.
```

Notes: [needs Zeke: Contact workflow confirmation]

**B3-B** (B3-05; starts with a space; 375 characters)

```text
 11/24 — Finding (read 11/24): met through the Case property-sync fields. A change to the Guardian Contact changes the Case's guardian_first_name, guardian_last_name, email or phone, and the Case workflow, the hourly poller or the daily sweep sends it to CentralReach. The Case workflow's trigger list must hold all four and location; Zeke keeps the trigger lists in HubSpot.
```

Notes: [needs Zeke: Contact workflow confirmation]

**B3-C** (B3-06; starts with a space; 338 characters)

```text
 11/24 — Finding (read 11/24): test a Guardian change by editing the Guardian Contact and checking the Case: the Case's synced Guardian property changes, and the Case workflow, the poller or the sweep sends it (record which one did). A BCBA's personal email is the BCBA's own personal_email, so no Contact email change is read for a BCBA.
```

Notes: [needs Zeke: Contact workflow confirmation]

**B3-D** (B3-07, B3-08, B3-09, B3-10, B3-11; starts with a space; 290 characters)

```text
 11/24 — Finding (read 11/24): the BCBA personal email (CentralReach 138069) is read from the BCBA record's own personal_email (11/23 — Zeke), not from the linked Contact. Association 17 is not read for it and no personal-email sync property is needed. This replaces the Contact read above.
```

**B3-E** (B3-12, B3-13; starts with a space; 206 characters)

```text
 11/21 — Zeke: the BCBA primary email is the BCBA record's own email property; ucaba_email_address is no longer read. 11/23 — Zeke: the personal email is personal_email. This replaces the field names above.
```

**B3-F** (B3-14, B3-15; starts with a space; 429 characters)

```text
 11/24 — Finding (read 11/24): a Contact change queues only the linked Cases (11/21 — Zeke). A Contact-synced field on a BCBA or BT/RBT record reaches CentralReach through that employee's own workflow, the employee poller or the daily sweep. Whether a change to such a field fires the employee workflow is still to be proven in sandbox testing. The BCBA personal email is the BCBA's own personal_email, not read from the Contact.
```

**B3-G** (B3-16; starts with a space; 207 characters)

```text
 Finding (read 11/24): phone_number__second_ is not used. It does not exist in HubSpot production, and the integration no longer reads or sends it (BUILD-PLAN decision 36, 11/20). Leave it out of test Cases.
```

**B3-H** (B3-17; starts with a space; 215 characters)

```text
 Finding (read 11/24): the create signal stays Entered in CentralReach = Yes (BUILD-PLAN decision 8, 11/18), kept in one place in the code; the production creates workflow also triggers on Entered = Yes (see [G17]).
```

**B3-I** (B3-18; starts with a space; 204 characters)

```text
 11/23 — Zeke: the Case Care Coordinator (138851) is read from care_coordinator_first_name, care_coordinator_last_name and coordinator_export_status, so crm.objects.owners.read is not needed for the Case.
```

**B3-J** (B3-19, B3-20; starts with a space; 443 characters)

```text
 11/24 — Zeke: no date logic; the association label is the signal. Supervising BCBA (131308) uses the first of Supervising BCBA (82), SUB BCBA (234), Outgoing SUB BCBA (288) and Outgoing Supervising BCBA (135), with " BCBA LBA" added. The typed supplier is sent only when none of these is on the Case, and a blank typed supplier sends nothing. On Leave BCBA (236) is never sent. This replaces the typed-supplier and "still active" notes above.
```

**B3-K** (B3-21; starts with a space; 400 characters)

```text
 11/23 — Decided (Zeke approved the recommendation): a Case's Supervising BCBA (82) is a Grad Permit holder when that BCBA's lba_licensure__ny is Grad Permit; the typed supplier is not compared. 11/23 — Zeke: for a holder, Grad Permit Holder (136052) is sent as "<First> <Last> Grad Permit Holder". See "Grad Permit Holder" in the Case requirements. This replaces the typed-supplier comparison above.
```

**B3-L** (B3-22, B3-23; starts with a space; 238 characters)

```text
 11/24 — Zeke: no date logic; the association label is the signal. Outgoing BT 1 (131) and Outgoing BT 2 (166) are sent with Primary BT 1 / 2 in BT #1 / BT #2 Name while the label is on the Case. This replaces the removal-date note above.
```

**B3-M** (B3-24; starts with a space; 244 characters)

```text
 11/23 — Zeke: sent in CentralReach's form: the name, one space, then the NPI, with no comma (a trailing comma on the name is dropped). Name only or NPI only is sent alone. The Medicaid or commercial pair is chosen by n1_what_type_of_insurance.
```

**B3-N** (B3-25, B3-26, B3-27, B3-28; starts with a space; 302 characters)

```text
 Finding (read 11/24): the CentralReach label test of 11/20 showed that a label POST replaces the whole set, so a label is removed by leaving it out. The hold is lifted (BUILD-PLAN decisions 13 and 14): the rule above applies as written, including removal. A label the integration does not map is kept.
```

**B3-O** (B3-29, B3-30; starts with a space; 381 characters)

```text
 Finding (read 11/24): the CentralReach label test of 11/20 showed that a label POST replaces the whole set, so the add-only hold is lifted and the replace and remove rules above apply as written (BUILD-PLAN decisions 13 and 14). Only three staffing labels are sent: 97151 Services, Staffed 97153 and X 97153 (see [G19]); a retired staffing label is removed if the record holds it.
```

**B3-P** (B3-31, B3-32, B3-33; starts with a space; 284 characters)

```text
 Finding (read 11/24): only three staffing labels are sent: 97151 Services, Staffed 97153 and X 97153 (see [G19]). Their IDs are used in the label code and sent, not held as constants (BUILD-PLAN decisions 13 and 15, 11/20); a retired staffing label is removed if the record holds it.
```

**B3-Q** (B3-34, B3-35, B3-36; starts with a space; 161 characters)

```text
 Finding (read 11/24): the client funding-source labels are not sent: there are no payor tags in CentralReach for now (see [G19]; BUILD-PLAN decision 15, 11/20).
```

**B3-R** (B3-37, B3-38, B3-39, B3-40, B3-41; starts with a space; 254 characters)

```text
 11/23 — Zeke: NM Employee and VA Employee exist in CentralReach but are not sent yet; they are added to the label code when the client begins work in those states. Until then a New Mexico or Virginia Work State gets no state label (logged as a warning).
```

**B3-S** (B3-42, B3-43, B3-44; starts with a space; 193 characters)

```text
 11/24 — Decided (Zeke approved the recommendation): only the NY Medicaid label (1107647) is sent from the credential labels; the other credential labels are not built and do not block go-live.
```

**B3-T** (B3-45; starts with a space; 324 characters)

```text
 Finding (read 11/24): Colorado is included in the role labels above. A BT/RBT whose bt_rbt_type is blank, or holds any value other than BT or RBT (production also has BT to RBT), has no role label added or removed; a role label the person already holds in CentralReach is left alone (BUILD-PLAN decisions 16 and 35, 11/20).
```

**B3-U** (B3-46; starts with a space; 343 characters)

```text
 Finding (read 11/24): W1 is a historical snapshot of 50850427. The production Case workflow's trigger list is kept by Zeke in HubSpot (11/23) and must hold the four Guardian properties, guardian_first_name, guardian_last_name, email and phone, and location, which W1 does not. See the Case requirements row "Production workflows · To create".
```

Notes: [needs Zeke: Contact workflow confirmation]

**B3-V** (B3-47, B3-48; starts with a space; 178 characters)

```text
 11/16 — Zeke: the CentralReach employee field is Active Case Count, metadata ID 147882. Finding (read 11/24): the display-only mapping from active_cases_count is built and sent.
```

**B3-W** (B3-49, B3-50, B3-51; starts with a space; 304 characters)

```text
 11/23 — Zeke: a filled workday_id must be exactly 7 digits; any other value ends the run as error with no CentralReach call, pending final confirmation of the format by United Care. A blank workday_id is created with the HubSpot record ID as a temporary External System ID. This replaces the hold above.
```


## Dropped or rewritten crosswalk texts

- **X-01, X-02, X-11, X-22:** no own text; covered by A and B (gating, the two workflows), C and C2 (service address), E and E2 (suffix).
- **X-15** (Care Coordinator): the draft's first sentence ("since 11/20 the Case Care Coordinator is read from care_coordinator_name") and "once they exist in production" are wrong after Zeke's decision that 138851 is not omitted and is built now. Rewritten: 11/23 source fields, 11/24 "not omitted, built now, proven in the sandbox", the status rules as Proposed, care_coordinator_name named as no longer used.
- **X-08** (Referral): "The Other part ships once referral_other exists in production" dropped; now "built now and proven in the sandbox before production; referral_other is deployed from the sandbox to production".
- **X-22's caveat** (O-58 contests insert E): dropped; the recommendation applied ("a blank supplier sends nothing"), so E and E2 stand as approved.
- **X-06, X-09, X-14, X-18:** were "none until answered"; now drafted (date-of-birth update rule, Allergies, Address 2, Severity).
- **X-20:** re-dated "11/24 — Zeke" ("9. these rules are rig").
- **X-45:** rewritten around "deployed from the sandbox to production"; the Team Member and enrolment steps stay Proposed.
- **X-21 (SCURRENT half):** moved from the last row's cell ("BCBA → Contact: unlabeled link", an unrelated row) to the empty paragraph right after the SCURRENT table, the alternative the review named.
- **X-39 at L284:** reworded for that bullet ("not built yet" and "code today" notes), and limited to the parts that are built (the already-linked check is not claimed).
- **Callout:** "are not yet written into this document" and "is not written yet" dropped, since the callout is written in the same batch as the decisions; it now says how the dated notes are marked and that the repository files win where they differ.
- **Merged to avoid two inserts at one index:** X-05, X-07 and X-06 (one cell); X-15 and X-45; X-32 and X-42; X-43 and X-16; X-14 into C (GER cell); X-34 into X-12a (GER-CASE "Mailing Address", third pass; X-34's old anchor, the G02 date-fields bullet, is dropped).
- **Drafted in the third pass:** N-12 (master question 15) and N-19 (question 19), with N-Q12 (question 12, no N-row in master 7.4) and N-G02 (the G02 Care Coordinator pointer the review asked for).
- **Not drafted here:** the index fixes for L36 and L76 (the review drafted no text for them) and master 7.4 rows N-1 to N-6, N-9 to N-11, N-13 to N-18, N-20 to N-25 and N-27 (outside this pass).

## Assumptions

1. *Reviewer change: superseded by the independent review below; those texts now read "11/24 — Decided (Zeke approved the recommendation)" or "Decided (applied from Zeke's 11/24 rulings)".* Zeke's "On the remaining open items, apply your recommendation." backs an "11/24 — Zeke:" prefix on the texts that state those recommendations: Address 2, the two-Supervising-BCBA case, Allergies, Severity, the whole-address rule, the creates-workflow trigger, the date-of-birth update rule, the callout, and the Auth Period and Contact fan-out notes (N-7, N-8). Findings and package rules without his words stay "Proposed, for Zeke to confirm" (X-04, X-05's 375 count, X-15's status rules, X-16, X-29, X-30, X-31, X-39, X-40, X-42, X-45's second half).
2. "9. these rules are rig" means "these rules are right" (master question 10). Confirmed by Zeke 2026-11-24 ("Yes, all three").
3. A bullet 4 "the production deploy waits until it exists" follows from both changes being built now plus the read-only pre-deploy check; the old "its change does not ship in that deploy" assumed the two changes were held back.
4. The whole-address rule (O-59 tightened): split only when a state name or code comes right before the ZIP at the end of the street; the exact pattern is the build's.
5. Address 2: "only a state" is the package rule (commas removed and spaces collapsed, nothing left or one state name or code); a real second address is sent as stored.
6. O-57 ("Keep the behavior"): no guide text says a missing CR ID key is a failed read, so nothing needs correcting and no text is added. Insert A's "if a gate checkbox is missing, every run fails and alerts" is about the gate keys, not the CR ID key.
7. The date-of-birth update rule covers the BCBA and the BT/RBT (master question 5's recommendation); "the update stops" when CentralReach's answer has no date key is recommendation (a).
8. Batch split: batch 1 = the approved inserts, the callout and every text that changes what is sent or how a record is gated or created; batch 2 = process, findings, test plan, history and index lines (master 7.1 and question 31).
9. C2 and E2 go in section 3's "HubSpot internal name and notes" column (decided).
10. The index lines are plain text; adding links to the new tags would need a separate `updateTextStyle` request, which is outside insert-only.
11. Third pass: "Finding" labels carry the date of the read that found it (package, SANDBOX-TESTING-HANDOFF and the requirement reviews give the date); a finding about the code (X-39, X-30) is dated 11/24, the day the code was read. A text that turns a finding into a rule nobody decided stays "Proposed" (X-32+42, X-42: "this document does not mark them required" is a reading of the doc, not a fact).
12. The four third-pass texts go in batch 2, as the review recommended, although N-12 and N-19 state what is sent: both are already in place at deployed `655b385`, and N-G02 is a pointer.
13. N-Q12 lists only the item 10 roles (master question 12). The 01 review also names On Leave, a Grad Permit Supervisor link and a BCBA's licence as changes with no signal; they are left out because the recommendation Zeke approved is about the item 10 roles.
14. The X-15 sentence "the owners API, crm.objects.owners.read and care_coordinator_name … are no longer used for it" now sits under "11/23 — Zeke", as following from his "We will read the fields for this"; the working-tree code reads no owner field (`src/mappings/client/clientProperties.mjs`, `buildClientMetadata.mjs` `careCoordinatorValue`).

## Open questions for Zeke

1. Send batch 1 as shown, then batch 2 after a fresh read?
2. X-15: the Care Coordinator status rules (ready sends "First Last"; no_owner sends no name and clears a name the integration wrote; any other status leaves CentralReach unchanged with a warning) are the package's rules (CF §1.2), not your words, so they read "Proposed". The working-tree code does exactly this (`careCoordinatorValue`). Date them "11/24 — Zeke" instead?
3. X-05/07/06 (from the review; resolved by the recency audit: table 1 P18 settles option (a), an absent date key is a failed read with no PUT, and the working tree matches, so the text now says so): the text says an employee update whose CentralReach answer has no date-of-birth field stops with no change (the package rule); the working tree instead leaves the date out of the PUT (`keepUnwrittenCoreFields`). Recommendation: the build chat implements the package rule before deploy; the text stays.
4. N-12: you approved "RBT CO" for a Colorado-only BT/RBT; the code (deployed) gives "RBT CO" to any BT/RBT whose Work States hold Colorado and not New York, so Colorado + New Jersey also gets it. The text states the code. Keep the code's rule, or narrow it to Colorado only?
5. Contact workflow (new, from the recency audit): the texts X-33a/b, N-8, X-36a and Batch 3 B3-01 to B3-06 and B3-46 say the Guardian values are Case property-sync fields and no separate Contact workflow is needed. Is the fourth Contact workflow (O-21) no longer required for the Guardian fields? They are worded as the current design until you confirm.

## Independent review (2026-11-24)

Reviewer: independent, given this file and its sources only (`guide-extract-2026-11-24.md`, `BUILD-PACKAGE-DRAFT-2026-11-23.md` incl. the seventh set, `SANDBOX-TESTING-HANDOFF.md` State, `requirements-review-2026-11-24/08-guide-currency.md` and `00-MASTER.md` section 7, `BUILD-PLAN.md` section 4, the deployed code at `655b385` and the working-tree `src/`). No call was made to the Google Doc, HubSpot, CentralReach or Azure; no git write.

### Counts

- **Checked:** 77 inserts (batch 1: 47, batch 2: 30), 57 distinct texts.
- **Re-labelled (attribution):** 14 texts, 19 inserts: CALLOUT-1/2, A (bullet 7), C, C2, X-05/07/06 (update rule), X-15+45, X-15b, X-19a/b (rule 7), X-09a/b, X-18a/b, X-08a/b, X-14, N-7, N-8.
- **Changed in all (attribution, accuracy, contradiction or style):** 33 texts, 45 inserts; each has a "Reviewer change:" line under it. Character counts, both request lists and the batch 2 expected indexes were regenerated from the texts (script check: every JSON text equals its block, highest index first per tab, counts in UTF-16 units). The batch 1 live indexes and the revision ID are unchanged.

### 1. Attribution

- Rules backed only by "On the remaining open items, apply your recommendation." (or by a question of Zeke's, "is this recommended?") now read "11/24 — Decided (Zeke approved the recommendation):": A bullet 7 (question 24), C / C2 whole-address rule (O-59), C / X-14 Address 2 (question 7), X-19 rule 7 (question 26), X-09 Allergies, X-18 Severity (decision 5), X-05 update rule (option (a); his decision-4 words cover creates only), N-7, N-8 (master questions 34, 35).
- "138851 not omitted, built now" (X-15+45, X-15b) and "referral_other built now" (X-08) now read "11/24 — Decided (applied from Zeke's 11/24 rulings):"; the earlier recommendation was to omit 138851, so "approved the recommendation" would be wrong. His own sentence ("Sandbox testing: need to confirm … is populated") is kept as "11/24 — Zeke".
- The callout itself was labelled "11/24 — Zeke" with no words of his; now "11/24 — Note" and it names the new labels.
- Kept as "Zeke" (verbatim backing found): A bullets 1–6 (fourth to sixth sets, Rulings A and B), B, D, E, X-03 ("Yes, all 7"), X-05 placeholder sentences, X-20 and X-21a ("9. these rules are rig"), X-24, X-25, X-26, X-27, X-28, X-33, X-35, X-36, X-37, X-38, X-43, X-44, X-12, X-10, X-17, X-32.

### 2. Accuracy (the most important)

1. **Address 2 (C, X-14):** "is not sent" was wrong. The package rule and the working-tree `getServiceLocationAddress2` both send `null`, which clears a value the integration wrote (`metadataClearFieldIds`; package test "an Address 2 written before and now junk → the clear is sent"). Package and build agree; the text now says so.
2. **Total Assigned Hours (X-32+42, X-32b):** "When a HubSpot total should be used instead is still to confirm" was out of date: Zeke answered on 11/23 and the package closed O-43 with no code change (section C). The X-42 insurance and physician half was removed from the Total Hours row (unrelated); "per-BT hours" now "as separate fields".
3. **X-34 vs X-12:** "a state that cannot be converted ends the run as error" contradicted X-12 in the same batch; the Case `stateregion` exception (decision 56) is added.
4. **Pending build stated as live:** every 11/23–11/24 sending rule (gates, date of birth, Care Coordinator, Referral Other, address, Allergies, Severity, physician, availability, Grad Permit, item 10, B21, Workday check, label wait) is in the uncommitted working tree, not at deployed `655b385`. The callout now says these ship with the next deploy (sandbox first, production once its properties exist); the texts already live say "already in place" (X-30, X-33, X-43).
5. **X-15:** the email is not sent (no CentralReach field; package item 6), and the anchors' owners-API rule is now marked replaced.
- Also: X-19 (typed supplier not compared; warning on a missing 151 link), X-25a (645 of 650 count against the anchor's "four"), X-03 ("this property" → the link property), X-04 (duplicates only if the creates box were ticked), X-28 ("means" → "can mean"), X-27 (internal open-item IDs removed), A bullet 6 (Phase I wording vs promote-after-create; the added sentence is labelled Proposed).
- Checked and correct: gate names and settings, segments 1463–1465, placeholder on create only, 138851 fields, `referral_other`, whole-address split only with a state before the ZIP, " BCBA LBA", rule 7, blank supplier sends nothing (working tree omits 131308), item 10 order 82 → 234 → 288 → 135 and On Leave never sent, Allergies and Severity forms, physician form, Workday 7 digits, 150 s label wait.
- **Not changed (build differs from the package):** X-05 says an update whose CentralReach answer has no date-of-birth field "stops". The working tree does not do this: `keepUnwrittenCoreFields` (`src/lib/mappedState.mjs`) deletes `dateOfBirth` when the read lacks it, so the PUT leaves it out (and an employee PUT clears a left-out field, BUILD-PLAN section 4); it also sends the held date unrebuilt. The package (item 1, "Applied") says failed read, no PUT, rebuilt as `YYYY-MM-DDT00:00:00.000Z`.

### 3. Contradictions with the anchor text

Now stated as replacing or updating the anchor: X-05 ("same property sync"), X-35 (ucaba_email_address; "Updates send the email CR already holds"), X-17, X-32, X-32b, X-15, X-15b (owners API), X-19 (supplier comparison), X-20 (open points on 135 and 234/236), X-21a ("Does CR need the substitute?" answered), X-41a/b (one-way latch; no original-gate restriction), X-29 (11/18 findings), N-7 ("midnight UTC"), X-25a (count), X-30 (six vs three staffing labels).
Still uncorrected in the guide (no insert anchors there): the G02 bullet "Care Coordinator is the Case owner … GET /crm/v3/owners/{id}" (extract L483) contradicts X-15.

### 4. Placement

- **X-34** sits on the G02 bullet "Date fields come back as YYYY-MM-DD…" (L489), which is about dates only; the text is about phone, email, state and gender. Not moved (a new anchor needs a live index).
- X-32+42 carried insurance and physician rules onto the Total Assigned Hours row: removed there (see 2). Other anchors are the right rows.

### 5. Decisions with no text

- Master questions 12 (item 10 roles have no change signal; "say so in the guide"), 15 (N-12, "RBT CO" form for a Colorado-only BT/RBT) and 19 (N-19, managed-label rule): decided under the closing sentence, listed by package question 32 as Google Doc writes, and not drafted ("N-9 to N-25 outside this pass").
- Package D15 / D16 (Grad Permit data fix on two BCBAs; 10 holders with no 151 link): pre-go-live data tasks, no guide text (optional).
- O-57 ("7. Keep the behavior"): no guide text needed (agreed with Assumption 6).

### 6. Style and privacy

- No secrets, tokens or record values beyond what the guide already holds. X-28 names the API user (a United Care staff member) and her CR ID; X-25a names Sara; both are client staff already in, or consistent with, the guide.
- "Proposed, for Zeke to confirm" is also used for read-only findings (X-04, X-05's 375 count, X-29, X-30, X-40); a finding is not a proposal.

### 7. Mechanics

- Every request has `tabId` and `index`; within each tab the send order is highest index first; no two inserts in one batch share an index. X-35a (batch 1) and X-39f (batch 2) share live index 29439, with the order stated (X-39f after X-35a, expected index includes X-35a's length).
- A, C, C2 before/after updated to the reviewed texts. A's "before" could not be checked: this file is untracked and the first-pass text is not elsewhere in the repo.
- Batch 2's expected indexes all moved (the callout and many batch 1 texts grew); they remain a cross-check only, to be recomputed from a fresh read after batch 1.

### For Zeke before the write

1. **X-05 missing date key:** the build stops the update (package) or leaves the date out (working tree). Recommendation: the build chat implements the package rule (failed read, no PUT; date rebuilt to 24 characters) before deploy; the text stays.
2. **138851 "not omitted, built now":** confirm it is your decision (it reverses the earlier "omit" recommendation). Recommendation: confirm, so the label can become "11/24 — Zeke".
3. **A bullet 6 added sentence** (Phase I records the integration creates still get later updates via promote-after-create). Recommendation: confirm; it is the orchestrator's reading of Ruling B.
4. **X-34 placement:** recommendation: move it to batch 2 and anchor it on the GER-REQ phone row (or a G02 format bullet) at the fresh read.
5. **Missing texts:** recommendation: draft one line each for master questions 12, 15 and 19, and a pointer at the G02 Care Coordinator bullet (L483), for batch 2.
6. **11/23 texts resting on "Let's do your recommendations please"** (X-23 B21, X-08 "Other" when blank, X-19 `lba_licensure__ny` only, X-05 BT/RBT text): same kind of backing as the closing sentence, but kept as "11/23 — Zeke". Recommendation: re-label them "Decided (Zeke approved the recommendation)" for consistency, since the recommendation table he answered is not in the repo.
7. **Findings labelled "Proposed":** recommendation: label them "11/24 — Finding (read-only check):".
8. **X-20 / X-21a** rest on "9. these rules are rig" read as "right". Recommendation: confirm in one word.

## Third pass (2026-11-24, after the review)

Applies the review's recommendations 2 to 8 and Zeke's "Yes, all three". No call was made to the Google Doc, HubSpot, CentralReach or Azure; the four new indexes come from the saved 18:34 UTC structural read of the same revision.

- **Confirmed by Zeke ("Yes, all three"):** review items 2, 3 and 8. X-15+45 and X-15b: "11/24 — Zeke: the Care Coordinator field (138851) is not omitted; …" (his sandbox sentence folded in). A bullet 6: last sentence no longer "Proposed". X-20, X-21a: unchanged ("— Zeke").
- **Review item 4, X-34:** merged into X-12a as X-12a+34 at GER-CASE "Mailing Address" (the row that names `stateregion` and the phone); stays in batch 1 at 32160. Batch 1 is now 46 inserts.
- **Review item 5, missing texts:** N-Q12 (GER-CASE "Staffing change signals", L367), N-12 (GER-REQ "Employee · ContactForm", L337), N-19 (end of the [GER] lead paragraph, L328), N-G02 (G02 "Care Coordinator is the Case owner", L483). All batch 2. Batch 2 is now 34 inserts.
- **Review item 6, "Let's do your recommendations please":** re-labelled "11/23 — Decided (Zeke approved the recommendation)": X-23 (whole text), X-08 (blank Other text → "Other"), X-19 (holder read from `lba_licensure__ny` only; the rest stays "11/23 — Zeke"), X-05/07/06 (BT/RBT date of birth as text). Not re-labelled: A, C, C2 (approved with their labels; see "Changed since Zeke approved it"), X-41 (fifth-set gate words).
- **Review item 7, findings:** "Finding (read 11/23)": X-25a (645 of 650), X-32+42 and X-32b (only usable total), X-44 (Location #2 empty), X-43+16 (no employee coordinator field), X-15 (138851 holds a name, no email field), X-29 (487 of 489), X-40, X-04. "Finding (read 11/24)": X-05/07/06 (blank on all 375 BCBAs), X-29 (client read returns the External System ID), X-30a/b (label test and lifted hold, already in place), X-39a to X-39f (built). X-31 is a "Note". "Proposed" is left only on undecided rules: X-15's status rules and Team Member step, X-43+16's BCBA coordinator, X-32+42 and X-42 (per-BT hours and the other unmapped fields, now with Zeke's 11/23 words quoted).
- **Callout:** names all five labels.
- **Still open from the review:** item 1 (X-05 missing date key; open question 3).
- **Code checks for the new texts:** N-12 differs from the wording of the recommendation (open question 4); N-19 applies to employees as well as clients (text says so); N-Q12 and N-G02 match the code.
- **Regenerated:** character counts, both tables, both request lists and send orders, the batch 2 expected indexes (by a script: every JSON text equals its block; highest index first per tab; `insertText` only; `tabId` on every request; no shared index within a batch; counts in UTF-16 units). Totals: batch 1 46 inserts, 35 texts; batch 2 34 inserts, 26 texts; 80 inserts, 61 distinct texts.

## Recency audit pass (2026-11-24, after the third pass)

Applies `requirements-recency-audit-2026-11-24.md` (sections C, C4, D, table 1 overrides, table 2 rows for the master's guide texts). No call was made to the Google Doc, HubSpot, CentralReach or Azure; no git write. The log of what changed, insert by insert, is `apply-recency-guide-draft-log-2026-11-24.md`.

- **Corrected inserts:** Batch 1: A, X-05/07/06, X-23, X-33a/b, X-35a/b (5 texts, 7 inserts). Batch 2: N-8, IDX-GER, X-36a (3 texts, 3 inserts). Each is marked "(corrected 2026-11-24 recency audit)" in its heading or note.
- **Batch 3:** 51 new inserts in 23 texts.
- **Request lists:** the JSON text of every corrected insert was changed in step with its block. Indexes were not recomputed (done at write time), so the Batch 2 "expected index" column is out of date by the extra characters and is a cross-check only.
- **Checked and left unchanged (no stale requirement found):** B, C, C2, D, E, E2, X-19a/b (rule 7), X-09a/b and X-18a/b (Allergies and Severity un-held), X-14 and C (junk Address 2 sends null, whole-address split only with a state before the ZIP), X-15+45 and X-15b (138851 not omitted), X-20, X-21a, X-43, X-26, X-30, X-32, X-17, X-10, X-08, X-25, X-41, X-12, and Batch 2 other than N-8, IDX-GER and X-36a.
