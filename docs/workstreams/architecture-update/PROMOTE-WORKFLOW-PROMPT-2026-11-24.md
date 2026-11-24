# Promote-after-create workflows: prompt for the HubSpot sandbox (2026-11-24)

Drafted 2026-11-24. Nothing was built, no live call was made, no git write.

## 1. What this is / why

- When the integration creates a record in CentralReach, it writes the CentralReach ID (and the CentralReach link) back to HubSpot.
- A new record then has a CentralReach ID, so every later run is on the "update" path and needs `centralreach_updates_only` = true. Until that box is ticked, the integration skips the record (no CentralReach call, no HubSpot write).
- The "promote after create" workflow ticks that box automatically, once, when the integration writes the ID. One workflow per object: Case, BCBA, BT/RBT.
- The retest measures how fast the tick follows the ID write. If it is under about 160 s, the integration's 150 s label retry can finish the record. If it is slower, the record still finishes at the next hourly poll.
- Section 2 is the prompt to paste. Section 3 is the click-by-click fallback. Section 4 is how the delay is measured. Section 5 lists what the sources do not settle.

## 2. THE PROMPT (copy everything inside the block)

```text
You are working in HubSpot for a consultant. Task: create three workflows in the HubSpot SANDBOX portal, turned OFF, then report back. Read this whole message before you act.

STEP 0 - PORTAL GUARD (do this before anything else)
- Confirm the portal ID you are connected to. It must be exactly 52311591 (the sandbox).
- If it is 50317927 (production), or any other ID, or you cannot tell: STOP. Do nothing. Report the portal ID you see. Do not read or change anything.

WHY THESE WORKFLOWS EXIST
An integration creates a record in CentralReach, then writes the CentralReach ID and a CentralReach link back to the HubSpot record in one write. The record must then be allowed to receive updates. That is a checkbox property called centralreach_updates_only. Each workflow below ticks it once, right after the integration's own write. It never unticks anything and never runs twice for the same record.

THE THREE WORKFLOWS (build exactly these; create each one turned OFF)

Workflow 1 - Case
- Name: CR promote after create - Case
- Workflow type / object: Deal-based (the Case is the HubSpot Deal, object type 0-3).
- Enrollment trigger: property-change based, so it fires on the integration's own write. Trigger event: the property client_id_number "has changed" to any value (it goes from blank to a value).
- Plus these filters, all required (AND):
  1. centralreach_creates_only is true (is equal to "Yes"/true)
  2. central_reach_link_to_client is known (has any value)
  3. client_id_number is known
- Action (one only): Set property value. Property: centralreach_updates_only. Value: true (Yes).
- Re-enrollment: OFF. Records do not re-enroll.
- No delay, no branches, no other actions, no notifications.

Workflow 2 - BCBA
- Name: CR promote after create - BCBA
- Object: the custom object "BCBA", object type 2-72890322 (object-based workflow).
- Enrollment trigger: the property employee_id "has changed" to any value.
- Plus these filters, all required (AND):
  1. centralreach_creates_only is true
  2. central_reach_record_link is known
  3. employee_id is known
- Action: Set property value. Property: centralreach_updates_only. Value: true (Yes).
- Re-enrollment: OFF. No delay, branches, or other actions.

Workflow 3 - BT/RBT
- Name: CR promote after create - BT/RBT
- Object: the custom object "BT/RBT", object type 2-72890325 (object-based workflow).
- Enrollment trigger: the property employee_id "has changed" to any value.
- Plus these filters, all required (AND):
  1. centralreach_creates_only is true
  2. central_reach_link_to_rt_rbt is known
  3. employee_id is known
- Action: Set property value. Property: centralreach_updates_only. Value: true (Yes).
- Re-enrollment: OFF. No delay, branches, or other actions.

WHY THE TRIGGER IS "HAS CHANGED", NOT JUST "IS KNOWN"
A plain "client_id_number is known" filter would also enroll a record that already holds an ID when someone later ticks its creates box by mistake. The change event, together with "the link property is known" (the integration fills the link in the same write; staff who type an ID by hand do not), means the workflow fires only on the integration's own write. Do not replace the change event with a plain filter trigger. If HubSpot cannot combine a "property has changed" trigger with extra filters for an object, STOP and report exactly what it offers; do not choose a substitute yourself.

BEFORE BUILDING - CHECK ONLY (read-only)
Confirm these properties exist in the sandbox on the stated object. If ANY is missing, STOP and report which one. Do not create properties.
- Case (Deal, 0-3): client_id_number, central_reach_link_to_client, centralreach_creates_only, centralreach_updates_only
- BCBA (2-72890322): employee_id, central_reach_record_link, centralreach_creates_only, centralreach_updates_only
- BT/RBT (2-72890325): employee_id, central_reach_link_to_rt_rbt, centralreach_creates_only, centralreach_updates_only
Also report the property type of each gate checkbox (single checkbox expected).

WHAT YOU MUST NOT DO
- Do not touch portal 50317927 (production) in any way. Do not read from it.
- Do not turn any workflow on. Zeke turns them on.
- Do not edit, clone, turn off, or delete any existing workflow.
- Do not edit, create, or delete any record. Do not enroll any record manually.
- Do not create or change any property, list, or segment (except the optional part below, only if Zeke said yes).
- Do not use any other property names than the ones above. If a name differs in the portal, stop and report.
- Do not "improve" the design: no extra filters, delays, branches, notifications, or re-enrollment.

REPORT BACK
For each of the three workflows:
- Workflow ID and the URL (https://app.hubspot.com/workflows/52311591/...)
- Name, object, status (must be OFF)
- The exact trigger as built: the event, each filter, and the re-enrollment setting
- The exact action as built
- Anything that differed from this brief, and why
Also report: the portal ID you confirmed; the check results for the properties above; and anything you could not do.

OPTIONAL PART (do this only if Zeke told you "yes, also build the monitoring views")
A monitoring list per object that catches a promote that never fired. Create one active list per object, named exactly:
- CR promote missing - Case: object Deal (0-3); client_id_number is known AND centralreach_creates_only is true AND centralreach_updates_only is not true
- CR promote missing - BCBA: object 2-72890322; employee_id is known AND centralreach_creates_only is true AND centralreach_updates_only is not true
- CR promote missing - BT/RBT: object 2-72890325; employee_id is known AND centralreach_creates_only is true AND centralreach_updates_only is not true
Report each list's ID, URL and current member count. A record with an ID, a blank status and no updates tick for more than about 2 hours should be looked at. A very recent create may appear here for a few minutes; that is normal.
```

## 3. Manual fallback (HubSpot UI, sandbox 52311591)

Use this if no agent can create workflows through the API. Repeat the steps three times, once per object.

0. Check the portal. Click the account name at top right. Confirm the Hub ID is 52311591. If it is 50317927, stop.
1. Check the properties. Settings (gear) > Data Management > Objects > pick the object > Properties. Search for each name in the table. If one is missing, stop and tell the team. Do not create it.

| Object | CR ID property | Link property | Gate properties (both) |
|---|---|---|---|
| Case (Deals, 0-3) | `client_id_number` | `central_reach_link_to_client` | `centralreach_creates_only`, `centralreach_updates_only` |
| BCBA (2-72890322) | `employee_id` | `central_reach_record_link` | same two |
| BT/RBT (2-72890325) | `employee_id` | `central_reach_link_to_rt_rbt` | same two |

2. Automations > Workflows > Create workflow > From scratch. Pick "Deal-based" for the Case, or the custom object (BCBA or BT/RBT) for the other two. Continue.
3. Click "Set up triggers" > "When an event occurs" > Properties > "Property value changed". Choose the CR ID property from the table, and "has changed to any value" (wording may read "is updated" or "any value"). Save the event.
4. In the same trigger, click "Add filter" (or "AND") for each of these three: the gate property `centralreach_creates_only` is equal to Yes/true; the link property from the table is known; the CR ID property is known.
5. Open Re-enrollment (the trigger panel, or Settings in the top bar). Leave "Re-enroll" OFF.
6. Click the "+" under the trigger > "Set property value" (CRM section). Object: the same record. Property: `centralreach_updates_only`. Value: Yes/true. Save.
7. Rename the workflow (pencil at top): "CR promote after create - Case", "... - BCBA" or "... - BT/RBT".
8. Review. Click "Review and publish" only to check the summary. Do NOT turn it on. Leave the toggle OFF and save. (The tool may ask to enroll existing records: choose "No".)
9. Copy the workflow URL (it contains the workflow ID). Send the three URLs to Zeke with a screenshot of each trigger and action.
10. If HubSpot does not allow a "property changed" trigger together with extra filters, stop and report what the trigger screen offers. Do not switch to a plain "is known" filter trigger without Zeke's word (see Section 5, point 3).

Optional lists (only if Zeke says yes): Contacts > Lists > Create list > pick the object > "Active list". Filters: CR ID known AND creates true AND updates not true. Name: "CR promote missing - Case / BCBA / BT/RBT".

## 4. How the retest measures the delay and the pass mark

What is measured, on one new record per object: the time from the integration's CR ID write to the workflow's tick.

1. Zeke turns the three workflows on (sandbox only) before the retest creates the records.
2. The retest creates one new record per object through the creates path (creates ticked, no CR ID). The integration creates it in CentralReach and writes the CR ID and link back.
3. After the run, open the record's property history (or read it with the HubSpot property-history call, read-only):
   - T1 = the timestamp of the first value of the CR ID property (`client_id_number`, or `employee_id`).
   - T2 = the timestamp when `centralreach_updates_only` changed to true. Its source should show the workflow (not a person, not the integration).
   - Delay = T2 minus T1.
4. Check also that the link property was written at the same time as the CR ID (same timestamp, one write).
5. The workflow's own enrollment history (Workflow > History) must show one enrollment per new record, and none for a record whose CR ID was typed by hand.

Pass mark:

| Result | Meaning |
|---|---|
| Delay under about 160 s on the Case, BCBA and BT/RBT record | Pass. The 150 s label retry can pass on the update gate and finish the record in that run |
| Delay 160 s to 200 s | Borderline. The retry may be skipped; the next hourly poll finishes the record. Record the number and tell Zeke |
| Delay over 200 s, or the tick never happens | Not a pass for timing. The record still finishes at the next hourly poll (same CentralReach calls, up to about an hour later). If the tick never happens, the record stays silent with a blank status; use the monitoring list or fix the workflow |
| A hand-typed CR ID record (creates = true) gets updates = true | Fail. The marker is wrong (Section 5, point 2) |
| Two creates for one record | Fail. Stop and escalate |

This is test row BR4-P (package L872), plus the delay measurement the follow-up note asks for.

## 5. Assumptions and open points (not settled by the sources)

1. **BT/RBT link property in the sandbox.** `central_reach_link_to_rt_rbt` is named in the guide extract (L430) and the package (L809), but no sandbox file confirms it exists in the sandbox BT/RBT object. The prompt makes the agent check and stop if it is missing. **Closed 2026-11-24 (Zeke):** the field exists on the sandbox BT/RBT object: label "Central Reach Record Link", internal name `central_reach_link_to_rt_rbt`, type Text, description "URL link to the BT/RBT record in Central Reach".
2. **Link property fills only by the integration.** The promote trigger depends on this (package L824, L1043). It is checked read-only in production at cutover (package L163, L84). It is not checked for the sandbox in any file read. If a workflow, import or person fills the link property in the sandbox, the trigger needs another marker.
3. **"Property has changed" plus extra filters.** Package assumptions 39 and 46 (L1034, L1044) say this is not verified in HubSpot; BR4-P proves it. If HubSpot cannot do it, no approved fallback exists. A plain filter trigger (CR ID known AND creates true AND link known, re-enrollment off) would also enroll an old record whose creates box is ticked later. That is a design change for Zeke to approve.
4. **Whether the CR ID write counts as "changed to known" when the link is written in the same write.** Package assumption 46 (L1044): HubSpot evaluates after the whole write is saved. Not verified; BR4-P proves it.
5. **Gate property types on the BT/RBT and BCBA.** Created 2026-11-23 as single checkboxes (package L798, handoff L126). Both gate properties are recorded on the Deal, BCBA (`2-72890322`) and BT/RBT (`2-72890325`) in the sandbox. The prompt asks the agent to confirm this read-only; no file read here is a live check.
6. **The Case in the sandbox is the Deal (0-3).** Object IDs from `scripts/sandbox/create-test-records.mjs:28` and package L798. The production IDs (`2-48354212`, `2-48354559`) are not used.
7. **Workflow names** ("CR promote after create - ...") are this file's choice. The sources give the purpose, not a name.
8. **Delay needed.** "About 160 s" comes from the follow-up note (about 160 to 200 s; label read-back at least 10 s plus the 150 s retry) and Zeke's request. HubSpot workflow speed is not stated anywhere; the retest measures it.
9. **The creates workflow** (ticks `centralreach_creates_only`) is not part of this prompt. In the sandbox the retest plan expects Zeke to build it separately (`sandbox-test-matrix.md:659`). The gate properties are checked by the promote workflow as the second filter, so records need the creates box ticked by hand or by that workflow.
10. **Poller and settings.** The retest needs the two gate app settings and the poller on (Azure writes, only on Zeke's word; package L858, handoff L68). Not part of this prompt.
11. **Sandbox workflows that trigger the webhooks** still filter on `sandbox_test_field` (package L798). Test records must keep it true. Not changed here.
12. **Monitoring lists** are optional and need Zeke's yes. They are a view for production at cutover (side note L106); building them in the sandbox is a choice, not a decision.

## Sources

- `docs/workstreams/architecture-update/BUILD-PACKAGE-DRAFT-2026-11-23.md`
  - L82-L84: "Yes, all 7"; recommendation 4 (promote fires only on the integration's own CR ID write); recommendation 6 (link-property history check).
  - L108: the creates workflow, question 24.
  - L163: link-property history check at cutover (production, read-only).
  - L798: sandbox properties created 2026-11-23 on Deal `0-3`, BCBA `2-72890322`, BT/RBT `2-72890325`; sandbox gate still `sandbox_test_field`.
  - L808: creates workflow, per object. L809: promote trigger and action, re-enrolment off; `employee_id` with `central_reach_record_link` / `central_reach_link_to_rt_rbt` for employees.
  - L812: "Yes, all 7" on the workflows. L817: never tick updates on an existing record before review. L822: why "changes to known". L823-L824: only the integration's own write; marker checked in `src/`; history check. L828: hand-off window. L830: hand-linked records do not promote.
  - L858: Azure writes at the live-set step. L868: BR4-CU. L872: BR4-P. L1034, L1043-L1044, L1054: assumptions 39, 45, 46, 53.
- `/Users/zeke/Library/Application Support/Claude/side-session-notes/local_2ccd8fb8-b5cd-48eb-9100-fe083b3cfd81/build-chat-2-gate-followup-B2-2026-11-24.md`
  - L39: promote tick then next poll. L82: how fast the tick must be (about 160 to 200 s). L105-L106: BR4-P delay measurement and the monitoring view (CR ID known, creates true, updates not true). L116: assumption on workflow re-enrolment.
- `docs/workstreams/architecture-update/guide-extract-2026-11-24.md`: L355 (Case `client_id_number` / `central_reach_link_to_client`), L403 (BCBA `employee_id` / `central_reach_record_link`), L430 (BT/RBT `employee_id` / `central_reach_link_to_rt_rbt`).
- `docs/workstreams/architecture-update/GUIDE-INSERT-DRAFT-PRODUCTION-GATING-2026-11-23.md`: L142 (how a record enters a segment), L978 (link property history check wording).
- `docs/workstreams/architecture-update/SANDBOX-TESTING-HANDOFF.md`: L9 (poller off), L68 (re-enable only on Zeke's word), L126 (two gate checkboxes exist in the sandbox on Deal, BCBA, BT/RBT; none ticked), L190 (two-property gate).
- `docs/workstreams/architecture-update/sandbox-test-matrix.md`: L400 (SU-4, link properties read on existing sandbox records: `central_reach_link_to_client`, `central_reach_record_link`), L402 (SU-6, gate properties on Case, BCBA, BT/RBT exist), L659 (BR4-P: Zeke builds the workflows in the sandbox).
- `scripts/sandbox/create-test-records.mjs`: L28 (object types: deal `0-3`, bcba `2-72890322`, bt `2-72890325`); L189, L222, L348, L522 (the creates box set on test records).

## Built 2026-11-24 (builder's report, pasted by Zeke; not read from HubSpot by the testing chat)

All three workflows exist in sandbox 52311591, turned OFF. Activation is Zeke's.
- Case: https://app.hubspot.com/workflows/52311591/platform/flow/1935391552/edit
- BCBA: https://app.hubspot.com/workflows/52311591/platform/flow/1935383679/edit
- BT/RBT: https://app.hubspot.com/workflows/52311591/platform/flow/1935391616/edit

**Approved difference from the brief:** enrolment uses a supporting active list per object (ID known AND creates = Yes AND the link known), not a property-change event. Open point 2 above is superseded by this.

**Consequences to carry into the run sheet and the tracker:**
1. A record that already holds an ID and link is promoted as soon as its creates box is ticked, not only on the integration's own write. Every gate row that needs "linked, creates ticked, updates blank" must run with the promote workflows OFF; turn them on only for the BR4-P steps.
2. Production: an existing linked record whose creates box is ticked by mistake would start receiving updates (a phase two record). Recommended: add a list filter (created after the cutover date, or updates not already true) before the production build. Zeke's decision.
3. Timing: list membership is usually slower than an event trigger; BR4-P records the real delay (ID write, list join, tick). If slower than about 160 s the record finishes at the next poll, as designed.
4. Not yet verified by opening them: each list's exact filters, object, properties and list IDs.
