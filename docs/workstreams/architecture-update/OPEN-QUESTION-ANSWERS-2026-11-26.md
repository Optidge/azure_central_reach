# Zeke's answers to the 43 open questions (recorded 2026-11-26)

> Source: the answers Zeke saved on the questions page (artifact "CentralReach Sync Open Questions", version 3), read back on 2026-11-26. Raw copy: open-question-answers-2026-11-26.json.

These are recorded as given. They are NOT yet applied to the rewritten guide (guide-v3): no requirement row, decision-log entry or question status has been changed from them. Zeke also said he will confirm the 35 questions that were answered from the documentation; those confirmations are not recorded on the page yet.

Counts: 43 answered cards. 39 have a choice picked, 4 have a note only.

## Answers

| Card | Guide question | Requirement rows | Entity | Was waiting on | Question | Zeke's choice | Against the recommendation | Note? | What it means / follow-up |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Q-046 | CASE-R-031, BCBA-F-021 | Case | Zeke | Care Coordinator when the status is not ready or no_owner | Yes, confirmed as built | same as recommended |  |  |
| A2 | Q-048 | CASE-F-063 | Case | Zeke | Per-BT hours as their own CentralReach fields | Map them to new CentralReach fields | differs from recommended | yes | Choice and note point different ways. The choice says map per-BT hours to NEW CentralReach fields; the note describes the two mappings that already exist (Total Assigned Hours 97153 and Approved Auth Hours), and the A21 answer says there are no separate per-BT hour fields. Needs one clear ruling before any row changes. |
| A3 | Q-049 | CASE-F-068 | Case | Zeke | insurance_id_3 mapping | Yes, confirmed as built | same as recommended |  |  |
| A4 | Q-050 | CASE-F-069 | Case | Zeke | insurance_id_4 mapping | Yes, confirmed as built | same as recommended |  |  |
| A5 | Q-051 | CASE-F-036 | Case | Zeke | Physician field when the insurance type is Unsure or blank | Yes, confirmed as built | same as recommended |  |  |
| A6 | Q-047 | CASE-R-034 | Case | Zeke | Coordinator Team Member records before the first production sync | Yes, a go-live checklist item | same as recommended |  |  |
| A7 | Q-030 | CASE-F-039 | Case | United Care | Diagnosis text sent for the Yes-F84.0 option | Show 'Yes-F84.0' (as built) | no recommendation was given |  |  |
| A10 | Q-006 | CASE-R-014 | Case | Zeke | Can the poller create a Case in production | Yes, stop the poller creating Cases (webhook only) | no recommendation was given |  | Code change: remove the poller's Case create branch (src/workflows/intakePollerWorkflow.mjs). Not built. |
| A13 | Q-007 | CASE-F-054 | Case | Zeke | Total Assigned Hours when both hours are blank | Send a blank (as built) | no recommendation was given | yes | Asks for a read-only check: find a record with the BT hours filled and see how the values land in CentralReach. Not run yet. |
| A15 | Q-031 | CASE-F-028 | Case | United Care | Separator for several Maladaptive Behaviors | Semicolon with no space, as HubSpot stores it (as built) | no recommendation was given |  |  |
| A21 | Q-048 | CASE-F-063 | Case | Zeke | Ledger CASE-113: per-BT hours | No, change it; see note | differs from recommended | yes | Says per-BT hours are not on the client mapping and there are no separate fields, which reads as 'not mapped'. Conflicts with the A2 choice. |
| A22 | Q-049 | CASE-F-068 | Case | Zeke | Ledger CASE-147: insurance_id_3 | Yes, confirmed as built | same as recommended |  |  |
| A23 | Q-050 | CASE-F-069 | Case | Zeke | Ledger CASE-148: insurance_id_4 | Yes, confirmed as built | same as recommended |  |  |
| B4 | Q-009 | BCBA-R-008, BCBA-R-010 | BCBA | Zeke | Test the error when another record holds the Workday employee | List as offline-only exceptions with their unit tests | no recommendation was given |  |  |
| B5 | Q-010 | BCBA-R-008, BCBA-R-010 | BCBA | Zeke | Test the waiting result for an employee already in CentralReach | List as offline-only exceptions with their unit tests | no recommendation was given |  |  |
| B6 | Q-011 | BCBA-R-008 | BCBA | Zeke | Test the 7-digit Workday ID error on a create | List as offline-only exceptions with their unit tests | no recommendation was given | yes |  |
| B7 | Q-012 | BCBA-R-011 | BCBA | Zeke | Hand edit in CentralReach for the Workday success test | One per state: NY, CO and NJ | same as recommended |  |  |
| B9 | Q-013 | BCBA-F-008 | BCBA | Zeke | Blank personal email: clear CentralReach or keep it | Never clear: keep what CentralReach holds | no recommendation was given | yes | Code change: today a blank personal email clears a value the integration wrote; the answer is never clear. Not built. |
| B10 | Q-014 | BCBA-F-018 | BCBA | Zeke | Blank Medicaid ID: clear CentralReach or keep it | Clear only a value the integration wrote (as built) | no recommendation was given |  |  |
| B14 | Q-015 |  | BCBA | Zeke | Unreadable gender, phone, state or birth date ends the run | Error, no CentralReach write (as built) | no recommendation was given | yes | Choice is error as built; the note also asks the code to normalise values so they can be sent. The normalisation rules are not specified. |
| C1 | Q-020 | ALL-R-033, BCBA-F-006, BT-F-006 | BT/RBT | United Care | Who enters the real date of birth, and where | (none) | no choice picked | yes | Still pending United Care; placeholder date of birth stays. |
| C2 | Q-043 | BT-F-025 | BT/RBT | United Care | Should a BT/RBT personal email go to CentralReach | Leave it out for Phase I | same as recommended |  |  |
| C3 | Q-021 | BCBA-R-009, BT-R-019, BT-R-022 | BT/RBT | United Care | Is every Workday ID exactly 7 digits | Another format (United Care to describe) | differs from recommended |  | United Care to describe the Workday ID format; the 7-digit check stays until then. |
| C8 | Q-005 | ALL-R-038, BT-F-006, BCBA-F-006, BCBA-F-023, BCBA-R-013 | BT/RBT | Zeke | What happens when date of birth text cannot be read | Error: nothing is sent until someone fixes the date (as built) | same as recommended |  |  |
| D1 | Q-033 | CASE-L-031, CASE-L-032, CASE-L-033, CASE-L-034, CASE-L-035, CASE-L-036 | Case | United Care | Send the Initial Assessment stage labels to CentralReach? | Yes, send them alongside Active Client | no recommendation was given | yes | Code change: send Active Client IA and the five IA stage labels; stage IDs are the same in the sandbox. Not built. |
| D2 | Q-034 | CASE-L-037, CASE-L-038, CASE-L-039, CASE-L-040, CASE-L-041, CASE-L-042, CASE-L-043 | Case | United Care | Send the Active Client stage sub-labels to CentralReach? | Defer to phase 2 | no recommendation was given | yes | Deferred to phase 2; Zeke to follow up with Danny. |
| D3 | Q-035 | CASE-L-044 | Case | United Care | Send a Discharged label under Inactive Client? | Yes, send Discharged for stage 1315313037 only | no recommendation was given | yes | Yes, pending a review with Danny. Code change if confirmed. |
| D4 | Q-036 | CASE-L-045 | Case | United Care | Send a Paused label when the Case is paused? | Yes, send Paused while the stage is 1344955718, removed when it changes | no recommendation was given |  | Code change: send Paused while the stage is 1344955718. Not built. |
| D14 | Q-019 | ALL-R-009, BCBA-F-028, BT-F-021, ALL-R-007 | BCBA | United Care | Show the CentralReach External System ID back in HubSpot? | Make CentralReach the source | no recommendation was given | yes | Choice says make CentralReach the source; the note describes HubSpot holding the Workday ID and CentralReach being updated from it. The two read differently; needs one clear ruling. |
| D15 | Q-019 | ALL-R-009, BCBA-F-028, BT-F-021, ALL-R-007 | BT/RBT | United Care | Show the CentralReach External System ID back in HubSpot? | (none) | no choice picked | yes | No choice picked; the note is the same flow as D14. |
| D16 | Q-040 | BCBA-F-005, BCBA-F-024 | BCBA | United Care | Which field holds the BCBA's United Care work email? | Email holds the work address: keep it | same as recommended |  | Says keep `email` as the work email. The D25 answer names `ucaba_email_address` as the work email property. These conflict. |
| D17 | Q-041 | BCBA-F-002, BCBA-F-003, BCBA-F-007 | BCBA | United Care | Are BCBA record fields the contact card values staff see? | (none) | no choice picked | yes | Asks for a read of one production BCBA record to decide which fields to read. Not run yet. |
| D18 | Q-042 | BCBA-F-030 | BCBA | United Care | Fill the CentralReach 'Credentialed with' fields, or labels only? | (none) | no choice picked | yes | Still open: to confirm with Danny. |
| D20 | Q-044 | BT-F-014 | BT/RBT | United Care | BT/RBT Work Address: street and city only, or full? | Full address (as built) | no recommendation was given |  |  |
| D25 | Q-040 | BCBA-F-005, BCBA-F-024 | BCBA | United Care | Which property is 'United Care Work Email'? | UCABA Email Address (ucaba_email_address) | differs from recommended |  | Names `ucaba_email_address`; conflicts with D16 (keep `email`). |
| D27 | Q-017 | BT-F-011, BT-F-026 | BT/RBT | Zeke | What does 'Location' mean in the BT/RBT mailing address? | The home state: state_home (as built) | no recommendation was given |  |  |
| D28 | Q-032 | CASE-L-007, CASE-L-008, CASE-L-009 | Case | United Care | Which properties are 'Service Address Home / School / Clinic'? | Specific Service Location is Child's House or More Than One Location (as built) | no recommendation was given | yes | As built for now; marked pending the Google Drive doc. |
| D30 | Q-008 | CASE-F-037 | Case | Zeke | Does CentralReach need the state with the referring physician Medicaid ID? | Read filled production values; no change if they hold state and ID | same as recommended |  |  |
| D31 | Q-045 | BT-F-005, BT-F-027 | BT/RBT | United Care | Is the BT/RBT record email the contact card email? | The Contact email (contact card) | no recommendation was given | yes | Use the Contact email, to be confirmed in production. Code change if confirmed (built today on the record's `email`). |
| O1 | Q-001 | ALL-R-047 | All entities | Zeke | Inclusion rule for the matrix | Yes, that is the rule | same as recommended |  |  |
| O2 | Q-019 | ALL-R-009, BCBA-F-028, BT-F-021, ALL-R-007 | All entities | United Care | Workbook rows that flow CentralReach to HubSpot | Include them as rows with their own tests | no recommendation was given | yes | Says Employee ID is the CentralReach contactId and `hs_object_id` fills External System ID as a temporary hold; asks for the guide and the metadata sheet to be updated. Editing Sara's workbook has not been done and needs a go-ahead. |
| O3 | Q-002 | ALL-R-052 | All entities | Zeke | Guide line L186: repo build files win over the guide | Drop L186; the guide wins everywhere | differs from recommended | yes | Drop old-guide line L186; the guide wins everywhere. |
| O4 | Q-003 | ALL-R-049, CASE-L-015, CASE-L-016, CASE-L-017 | All entities | Zeke | CentralReach IDs that exist only in code | Add the checked IDs and exact names to the guide insert | same as recommended | yes | Add the IDs to the guide; a label marked not in CentralReach yet that the map shows as to be added becomes a requirement. |

## Notes, verbatim

### A2 — Per-BT hours as their own CentralReach fields

Choice: Map them to new CentralReach fields

> please see the Client Metadata tab under the spreadsheet 
> 
> spreadsheet = United Care ABA - Client Metadata Flow - HubSpot to Central Reach
> https://docs.google.com/spreadsheets/d/19z3vue0JSkE0QlBO34_83EirCok4q65i/edit?gid=1765935504#gid=1765935504
> The total assigned hours: 97153 map to BT/RBT Work Schedule 1 Details and Hours  BT/RBT Work Schedule   and BT/RBT Work Schedule 2 Details and Hours BT/RBT Work Schedule in hubspot
> 
>  and 
> 
> Approved Auth Hours  map to hours/units- approved cpt codes- ongoing line 2  97153 hours 00/Units 000 (the zeros get filled in) in hubspot 
> 
> 
> 
> These are referenced in Client Metadata Flow tab on the United Care ABA - Client Metadata Flow - HubSpot to Central Reach 
> 
> Have a background worker confirm

### A13 — Total Assigned Hours when both hours are blank

Choice: Send a blank (as built)

> The spreadsheet says this for HubSpot. 
> 
> BT/RBT Work Schedule 1 Details and Hours  BT/RBT Work Schedule   and BT/RBT Work Schedule 2 Details and Hours BT/RBT Work Schedule -> maps to Total Assigned Hours (97153) in central reach. 
> 
> 
> Via the API, send a worker to find a contact with the BT hours filled in, and then see how and if they map into CentralReach to determine how they should map over.

### A21 — Ledger CASE-113: per-BT hours

Choice: No, change it; see note

> Per BT hours is not specified on the client mapping doc. There are no separate per PT/BT hour fields.

### B6 — Test the 7-digit Workday ID error on a create

Choice: List as offline-only exceptions with their unit tests

> We don't need to test creating an employee record in CentralReach with the Workday ID.

### B9 — Blank personal email: clear CentralReach or keep it

Choice: Never clear: keep what CentralReach holds

> For records that already exist in HubSpot and in CentralReach, if a personal email is blank in HubSpot, do not clear the personal email metadata field in CentralReach if a value exists in CentralReach.

### B14 — Unreadable gender, phone, state or birth date ends the run

Choice: Error, no CentralReach write (as built)

> The code needs to be set up to normalize the values so that they can be pushed into CentralReach.

### C1 — Who enters the real date of birth, and where

Choice: (none)

> This is still pending an answer from United Care. For now, we are sending the placeholder date of birth date value.

### D1 — Send the Initial Assessment stage labels to CentralReach?

Choice: Yes, send them alongside Active Client

> It should be this Option A: Follow the Workbook (Send Active Client IA and stage sublabels).
> 
> Be sure to get the matching sandbox values, please.

### D2 — Send the Active Client stage sub-labels to CentralReach?

Choice: Defer to phase 2

> I need to follow up with Danny on this.

### D3 — Send a Discharged label under Inactive Client?

Choice: Yes, send Discharged for stage 1315313037 only

> Review with Danny.

### D14 — Show the CentralReach External System ID back in HubSpot?

Choice: Make CentralReach the source

> Here's the flow and what's established.
> 
> For net new employee records that are created in CentralReach, the HubSpot record ID populates the external system ID as a temporary hold because, in most cases, United Care does not have the Workday ID ready. They do not need the Workday ID to create employees in CentralReach.
> 
> Therefore, the HubSpot record ID will be populating the external system ID in CentralReach on creates. Once United Care gets the Workday ID, they have a process for that in HubSpot. They will update the external system ID to the Workday ID, as well as, in CentralReach, updating and replacing the external system ID that's holding the temporary HubSpot ID with the new Workday ID.

### D15 — Show the CentralReach External System ID back in HubSpot?

Choice: (none)

> Here's the flow and what's established.
> 
> For net new employee records that are created in CentralReach, the HubSpot record ID populates the external system ID as a temporary hold because, in most cases, United Care does not have the Workday ID ready. They do not need the Workday ID to create employees in CentralReach.
> 
> Therefore, the HubSpot record ID will be populating the external system ID in CentralReach on creates. Once United Care gets the Workday ID, they have a process for that in HubSpot. They will update the external system ID to the Workday ID, as well as, in CentralReach, updating and replacing the external system ID that's holding the temporary HubSpot ID with the new Workday ID. 
> 
> Because of this, I don't think we need to write the on create. We need to write the HubSpot record ID back into the external system ID in CentralReach. That doesn't make sense because it's just a temporary hold.

### D17 — Are BCBA record fields the contact card values staff see?

Choice: (none)

> Review the fields here on the record and determine which one we should read from. 
> https://app.hubspot.com/contacts/50317927/record/2-48354212/59730370403/

### D18 — Fill the CentralReach 'Credentialed with' fields, or labels only?

Choice: (none)

> Eve, open to confirm with Danny.

### D28 — Which properties are 'Service Address Home / School / Clinic'?

Choice: Specific Service Location is Child's House or More Than One Location (as built)

> pending google drive doc

### D31 — Is the BT/RBT record email the contact card email?

Choice: The Contact email (contact card)

> Confirm in production.

### O2 — Workbook rows that flow CentralReach to HubSpot

Choice: Include them as rows with their own tests

> BCBA and BT/RBT · UNRESOLVED: "Employee ID"
> 
> This is the contactId from central reach.
> 
> Please update this where necessary, as a requirement or BCBA in ABT/IDT, and some supervisor notes on what to create. This HubSpot field HubSpot Record Id
> hs_object_id
> 
> populates the ExternalSystemId
> 
> HubSpot. It's a temporary hold until United United Care sees the work ID and then updates the work ID in HubSpot and CentralReach. 
> Update this in the google doc and meta data sheet  with background workers

### O3 — Guide line L186: repo build files win over the guide

Choice: Drop L186; the guide wins everywhere

> Guide wins

### O4 — CentralReach IDs that exist only in code

Choice: Add the checked IDs and exact names to the guide insert

> If there's a label marked "not in CR yet" and it is shown in the map to be added. Then it needs to be required.

## Answers that cannot be applied as they stand

- **A2 and A21 (per-BT hours):** the A2 choice says map to new CentralReach fields; the A2 note and the A21 answer say there are no separate per-BT fields.
- **D14 and D15 (External System ID):** the D14 choice says make CentralReach the source; the note describes HubSpot holding the Workday ID and updating CentralReach.
- **D16 and D25 (BCBA work email):** D16 says keep `email`; D25 names `ucaba_email_address`.
- **B14:** error as built, plus a request to normalise values in code with no rules given.
- **Still with United Care or Danny:** C1, C3, D2, D3 (review), D18, D28, D31 (confirm in production).
- **Read-only checks asked for and not run:** A13 (a record with BT hours filled), D17 (one production BCBA record), D30 (filled production values of `referring_provider_medicaid_id`).

## Code changes these answers imply (none built)

A10 (stop the poller creating Cases), B9 (never clear a blank personal email), D1 (IA stage labels), D4 (Paused label), D3 (Discharged label, after the review with Danny), D31 (BT/RBT primary email from the Contact, after the production check), O4 (labels to be added become requirements), and the BT/RBT header label 1131825 already listed.
