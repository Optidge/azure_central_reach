# Log: recency audit applied to the guide insert draft (2026-11-24)

Edited: `GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md`. Source: `requirements-recency-audit-2026-11-24.md` (sections C, C4, D; table 1; table 2 rows for the guide texts). Snapshot: `guide-extract-2026-11-24.md`. No live call, no git write. Doc indexes were not recomputed. The JSON request texts were changed together with the text blocks (checked: every JSON text equals a block).

## Changed inserts (Batch 1: 7 inserts in 5 texts; Batch 2: 3 inserts in 3 texts)

| Insert | What changed | Audit row / override |
|---|---|---|
| A (bullet 6) | Last sentence now ends "; only records that already existed in CentralReach wait for Phase II." | P34 ("Yes, all three", item 2), P14 Ruling B; section D row L280 |
| X-05/07/06 | Missing date key: "the update stops" became "the read counts as failed: nothing is sent and nothing changes in CentralReach". Open question 3 marked resolved | P18 (option a), d45, d53; section 1 summary (working tree matches `mappedState.mjs:292-357`) |
| X-23 | Added: a blank client phi_date_of_birth on a create is checked first, ends as error, no create | Section D row L346 (BUILD-PLAN C3) |
| X-33a, X-33b | Added a finding: Guardian values are Case property-sync fields, the BCBA personal email is the BCBA's own personal_email, no separate Contact workflow | Section C2/C4; table 2 R02 "X-33"; d24, d42, d44, d50; guide 11/09. Needs Zeke |
| X-35a, X-35b | Added: a malformed email ends as error; blocked is retired | Section D row L341 (d43, d47, BR9) |
| N-8 (Batch 2) | Added a finding after "accepted as built": the Guardian path is the Case property sync (Case workflow, poller or sweep); no separate Contact workflow | Table 2 R02 "N-8"; section C. Needs Zeke |
| IDX-GER (Batch 2) | [GER-CONTACT] line: "Guardian routing and the Contact workflow" became "Guardian routing and what a Contact change does" | Section C4 |
| X-36a (Batch 2) | Split from X-36b/c; added that the Case trigger list must hold guardian_first_name, guardian_last_name, email, phone and location (Zeke keeps the lists in HubSpot) | Section D row L392/L1040-1194; d51; P13. Needs Zeke |

Each changed heading carries "(corrected 2026-11-24 recency audit)" and a note line. Character counts were recomputed for the changed blocks; X-36b/c keep 234. Batch 2 expected indexes are now a little low (extra characters in the Batch 1 and Batch 2 texts); they stay a cross-check only.

## Checked against table 1, no change needed

B, C, C2, D, E, E2 (blank supplier sends nothing; ' BCBA LBA'), X-19a/b (rule 7 as written: both 131308 and 136052 left out with a warning), X-09a/b (Confirmed + "NA" gives "Yes"; Denial gives "None"), X-18a/b, X-14 and C (junk Address 2 sends null and clears; split only with a state before the ZIP), X-15+45, X-15b and N-G02 (138851 not omitted), X-20, X-21a, X-43+16, X-43b, X-26, X-30a/b, X-32+42, X-32b, X-17a/b, X-10, X-08a/b, X-25a/b, X-41a/b, X-12a/b, X-44, X-42, X-21b, the callout, and all other Batch 2 inserts. BCBA personal email (X-33, N-8 area) already read personal_email (d50). Employee blank date of birth (X-05) was already "send back CentralReach's date, never the placeholder".

## Batch 3: corrections from the recency audit (51 inserts, 23 texts, all tab t.0)

Full table (anchor sentences from the snapshot) and verbatim texts are in the draft under "Batch 3: corrections from the recency audit". Summary by audit section D row:

| Inserts | Guide lines | Correction |
|---|---|---|
| B3-01 to 04 | L455, L790, L822, L860 | No separate Contact workflow (Guardian = Case sync fields; BCBA personal email = personal_email). Needs Zeke |
| B3-05, 06 | L452, L456 | Guardian edit reaches the Case; trigger list holds the four fields and location; test via the Case. Needs Zeke |
| B3-07 to 11 | L421, L580, L788, L892, L901 | BCBA personal email = the BCBA's own personal_email |
| B3-12, 13 | L208, L576 | Primary = email, personal = personal_email |
| B3-14, 15 | L420, L442 (after X-36b/c) | Contact change queues Cases only; mirror fields reach CR via employee workflow, poller or sweep (O-26 open) |
| B3-16 | L204 | phone_number__second_ dropped (d36) |
| B3-17 | L250 | Create signal stays Entered = Yes (d8) |
| B3-18 | L773 | owners scope not needed for the Case (d39 to P16) |
| B3-19, 20 | L552, L556 | Supervising order 82, 234, 288, 135; no date logic |
| B3-21 | L513 | Grad Permit holder rule |
| B3-22, 23 | L365, L561 | Outgoing BT: label is the signal |
| B3-24 | L530 | Physician pair form |
| B3-25 to 28 | L383, L418, L608, L693 | Label hold lifted 11/20 (d13, d14) |
| B3-29, 30 | L384, L609 | Hold lifted; three staffing labels |
| B3-31 to 33 | L256, L294, L735 | Three staffing labels; IDs sent (d15) |
| B3-34 to 36 | L387, L388, L389 | Funding labels not sent |
| B3-37 to 41 | L413, L439, L686, L700, L741 | NM/VA labels exist, not sent yet |
| B3-42 to 44 | L416, L417, L692 | Only NY Medicaid sent (d25, Q21) |
| B3-45 | L440 | Colorado included; blank or other type: no role label (d16, d35) |
| B3-46 | L1046 (W1) | W1 lacks Guardian email/phone; Case trigger list kept by Zeke. Needs Zeke |
| B3-47, 48 | L599, L771 | Active Case Count metadata 147882, mapping built |
| B3-49 to 51 | L338 (after X-39c), L405, L432 | Filled Workday ID must be 7 digits; blank gets temporary ID (d58) |

Audit section D rows already covered by Batch 1 or 2, so no Batch 3 duplicate: L337 (N-12), L341 and L408/L409/L453 (X-35, X-33), L342 (X-05), L361/L510 (X-15), L363/L512 (E, E2), L364 (X-19a), L366 (X-20), L369/L517 (X-17), L370/L518 (X-32), L373/L521/L522 (C, C2, X-14), L374 (X-09), L377 (X-18), L380 (X-10), L382 (X-08), L392 etc. (X-36), L210 (X-25b), L274/L284/L339/L340 (X-39), L280 (B), L555 (X-21a), L605 and L1734 (X-30).

## Inserts needing Zeke's confirmation

- Contact workflow: X-33a/b, N-8, X-36a, B3-01 to B3-06, B3-46. Marked "[needs Zeke: Contact workflow confirmation]" in the draft's notes only. Added to the draft's open questions as item 5. The audit adds a second caveat: whether a property-sync change fires the Case workflow and moves `hs_lastmodifieddate` has not been seen live.
- X-15+45, X-15b, X-43+16, X-32+42, X-42: the "Proposed, for Zeke to confirm" sentences were not touched (see below).

## Left unchanged because ambiguous (not guessed)

- **X-15 status rules** ("Proposed"): P16 says item 6 is built and not omitted, but no source says Zeke ruled on the ready, no_owner and other-status wording. Kept as Proposed.
- **A bullet 2 "Contact changes"** as a gate path: the fan-out code still exists and queues Cases, so the phrase is not false. Left as is.
- **Audit section D lines with no Batch 3 insert:** L1268, L1598, L1608 (Change Log history lines; the Contact note at L790 and L860 covers them), L832, L1298, L1432 (history or instruction lines about the six labels; L384/L609/L735 cover the live rows), L672 to L679 (funding table: no single paragraph to anchor on), L1048 to L1194 other than W1 (W2 to W6 do not concern the Guardian triggers), L892/L901 handled as above. Say if you want inserts on any of these.
- **L599** ends in a link: B3-47 goes after the sentence "...(display only)." before the link; check the anchor at write time.
- **X-36a trigger sentence** says "must hold" the four Guardian fields and location: the audit says the lists are not recorded in any file, so this is a requirement, not a statement that they do.
- **Draft's own history text** ("Changed since Zeke approved it", reviewer notes) was left as written; only the texts, headings and open questions changed.
