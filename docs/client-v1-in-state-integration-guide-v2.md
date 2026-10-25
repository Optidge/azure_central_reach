> Source of truth for V1 in-state behavior. Client handoff from Optidge (Danny Gavin), version 2, 22 October 2026, including Sara Gluck's answers of that date. Filed as received. Portal 50317927.

**CentralReach to HubSpot Integration**

Field map, label rules and open gaps for the Azure build (United Care ABA)

Prepared for Zeke Swanson by Optidge (Danny Gavin). Version 2, October 22, 2026: updated with Sara Gluck's answers of Oct 22\. Every HubSpot name in this document was read from the live portal (50317927).

# **How to read this**

Zeke, your Client\_Metadata\_Flow workbook lists HubSpot fields by the names staff see on screen. This document turns every row into the API version: object type ID, internal property name, field type, and the internal option values your code has to send or match. It also covers the label rules behind the CR dashboards and the gaps we found while checking the sheet against the live portal.

* Rows shaded **amber** need a decision before you can build them (most are Sara's call; Optidge will collect the answers).

* Rows shaded **red** point at a HubSpot field or option that does not exist yet.

* Unshaded rows are ready to build.

* Direction follows your sheet: **HS to CR** means HubSpot is the source, **CR to HS** means CentralReach writes into HubSpot.

# **1\. Objects, IDs and pipelines**

| Object | objectTypeId | API path | Notes |
| :---- | :---- | :---- | :---- |
| Case (one per client) | 0-3 | /crm/v3/objects/deals | Cases are HubSpot Deals renamed. Every Case read and write goes through the deals endpoints. |
| BCBA | 2-48354212 | /crm/v3/objects/2-48354212 | Custom object. Pipeline "Pipeline" (Applied through Hired, Paused, Resigned, Terminated). |
| BT/RBT | 2-48354559 | /crm/v3/objects/2-48354559 | Custom object. Pipeline "Hiring Process" (Applied through Hired, Paused, Resigned 1299798139, Terminated 1299798140). |
| Contact | 0-1 | /crm/v3/objects/contacts | Parents/guardians and staff. contact\_category says which (Parent/Guardian, BT/RBT, BCBA, Grad Permit, Team Member, and others). |
| Case History Log | 2-52798305 | /crm/v3/objects/2-52798305 | Our audit log object. Not part of your map, but useful if you want to leave a trail of integration writes. |

Case pipeline: "Client Pipeline". Stage IDs are listed in section 7, where they map to CR labels.

# **2\. API rules that will save you debugging time**

1. **Use your own private app token.** Our 500+ workflows share one token and already brush against HubSpot's 190 requests per 10 seconds limit. A separate app keeps your sync and our automations from throttling each other, and lets you see your own call logs.  
   **Done** 

   * 

2. **The child's identity fields are in HubSpot's sensitive-data tier.** Child First Name phi\_first\_name\_\_cloned\_, Last Name phi\_last\_name, Gender phi\_gender, Date of Birth phi\_date\_of\_birth, Insurance IDs insurance\_id\_1 to insurance\_id\_4, Policy Holder DOB phi\_\_policy\_holder\_dob, and Diagnosis phi\_diagnosis only come back if the app has the sensitive-data scope for deals (crm.objects.deals.sensitive.read, plus .write if you ever write them). Without it they are silently missing from the response.  
   **See \#11**

3. **Send internal option values, not labels.** Several dropdowns have a value that differs from what staff see. Examples: Case Status shows "Active" / "Inactive" but stores Warm / Cold; Entered Client in CR shows "Yes- Completed" but stores Yes; NY Medicaid \- Status shows "Credentialed" but stores Credentialing; BT Entered in Central Reach shows "Yes \- Active" but stores Yes; LBA Licensure \- NY shows "Will Apply" but stores No; Allergies shows "Yes" / "No" but stores Confirmed / Denial. The appendix lists every mismatch on the fields in this map.

4. **Many fields are read-only to the API.** Calculated and synced fields reject writes (the whole PATCH fails). On Case: Location location, the staff name fields (supervising\_bcba\_name, current\_primary\_bt, current\_primary\_bt\_2), Referral Source referral\_source and the total-hours fields. On BCBA and BT: the home address, home city/state/zip, phone and BT gender fields mirror the linked Contact. Everything you write should go to a field flagged writable in this document.

5. **Staffing is associations, not fields.** Who the Supervising BCBA or Primary BT 1 is lives on the Case to BCBA and Case to BT associations (section 4). Read them with the v4 associations API.

6. **Care Coordinator is the Case owner.** hubspot\_owner\_id holds an owner ID. Resolve it to a name and email with GET /crm/v3/owners/{id}

   .

7. **One property has a typo in its internal name:** Ongoing Auth period end date is ongoing\_autrh\_period\_end\_date.

8. **Ignore the "F" twins.** Fields ending in \_f (for example ongoing\_auth\_period\_start\_date\_f) are the upcoming-auth copies staff fill before a new auth starts. Map the plain field unless Sara wants CR to see the next auth early.

9. **Date fields** come back as YYYY-MM-DD and must be written as midnight UTC.

10. **HIPAA rule on outbound messages:** United Care never puts a child's full name in an email or message; staff use Case Initials case\_initials. This only matters if anything you build sends notifications.

11. **A missing property breaks the whole write.** If your code writes to a property that is later renamed or archived, HubSpot rejects the entire call. Tell us which properties your integration writes and we will protect them in future clean-ups.

# **3\. Client (CentralReach) to Case (HubSpot)**

| CR field | Direction | Object | HubSpot internal name and notes | Type |
| :---- | :---- | :---- | :---- | :---- |
| Trigger: "when enter in central reach is yes" | HS to CR | Case | enter\_in\_central\_reach (checkbox). Start the client sync when it contains Yes (label "Yes- Completed"). Other options are intake checklist items. | enumeration |
| Client ID | CR to HS | Case | client\_id\_number "Central Reach ID number" (429 cases filled today). Your sheet calls it "Client ID number". | string |
| Legal Name | HS to CR | Case | First phi\_first\_name\_\_cloned\_ \+ Last phi\_last\_name (sensitive tier). dealname is the internal case name; don't use it. | string |
| Gender | HS to CR | Case | phi\_gender (sensitive). Values male, female. | enumeration |
| DOB | HS to CR | Case | phi\_date\_of\_birth (sensitive). | date |
| Primary Email | HS to CR | Contact | email on the Parent/Guardian Contact (see Guardian). | string |
| Guardian | HS to CR | Contact | firstname \+ lastname on the Contact linked to the Case (association type 3, unlabeled) whose contact\_category \= Parent/Guardian. Sara: "the one on the contact card". HubSpot has no primary flag on case contacts, so we are confirming how to pick one when a case has two. | string |
| Mailing Address | HS to CR | Case \+ Contact | Case street\_address, home\_apt, location\_city, stateregion, postal\_code \+ guardian Contact phone. | string |
| Care coordinator | HS to CR | Case | hubspot\_owner\_id, resolve with the owners API. | owner |
| Initial Assessment BCBA, Reassessment BCBA | HS to CR | Case to BCBA | Associations IA BCBA (86) and RE BCBA (145), see section 4\. | association |
| Supervising BCBA | HS to CR | Case | Sara (Oct 22): use ongoing\_central\_reach\_provider\_supplier "Ongoing Central Reach Provider Supplier", because it feeds billing. It is free text staff type (274 cases filled), not a link to the BCBA record, so match it to the CR provider by name. | string |
| Grad Permit Holder | HS to CR | Case to BCBA | Sara (Oct 22): when the Ongoing Central Reach Provider Supplier differs from the Supervising BCBA (association 82), the Supervising BCBA is a grad permit holder. Reliable check on the BCBA record: lba\_licensure\_\_ny \= Grad Permit. Optidge may add an automatic Grad Permit marker on the case; we will tell you where it lands. | enumeration |
| BT \#1 Name / BT \#2 Name | HS to CR | Case to BT | Associations Primary BT 1 (76) and Primary BT 2 (143), see section 4\. | association |
| Work Schedule \#1 | HS to CR | Case | work\_schedule\_details "BT/RBT Work Schedule 1 Details". If the BT works at Location \#2: work\_schedule\_1\_details\_\_for\_location\_2\_other. | string |
| Work Schedule \#2 | HS to CR | Case | btrbt\_work\_schedule\_2\_details. Location \#2 version: work\_schedule\_2\_details\_\_for\_location\_2\_other. | string |
| Client Availability | HS to CR | Case | finalized\_client\_service\_hours\_post\_assessment (text) \+ client\_service\_hours\_total (weekly hours, number). | string \+ number |
| Total Assigned Hours (97153) | HS to CR | Case | Use total\_hours\_bt1bt2\_work\_schedule (calculated, filled on 2,617 cases). Two older totals exist (total\_hours\_bt\_12\_work\_schedule 59 cases, total\_hours\_btrbt\_12 20 cases); ignore them. Per-BT hours: hours\_bt\_work\_schedule\_1 and hours\_bt\_work\_schedule\_2. | number |
| Approved Auth Hours | HS to CR | Case | Sara (Oct 22), by initial\_auth\_tracks: Prior Authorization Required uses n97153\_approved\_assessment\_hours\_auth\_req "97153 Hrs Insurance Approved- Prior Auth Req" (text, filled automatically from the approved hours/units; 445 cases). No Prior Authorization Required uses ia\_hours\_from\_the\_ia "97153 Hrs From IA \- No Auth Req" (number, entered at QA review; 298 cases). | string / number |
| Auth Period | HS to CR | Case | Start ongoing\_auth\_period\_start\_date, end ongoing\_autrh\_period\_end\_date (typo is real). | date |
| Service Location Address | HS to CR | Case | specific\_home\_location says where (Child's House, Other Location, More Than One Location). Home: full\_home\_address. Other: service\_\_street\_address, service\_\_apt, service\_\_city, service\_\_postal\_code (combined in service\_address\_\_other). | mixed |
| Service Location Address 2 | HS to CR | Case | service\_address\_\_other (Location \#2-Other). | string |
| Known Allergies | HS to CR | Case | allergies (Yes/No) \+ allergies\_\_yes\_\_explain. | enum \+ string |
| Comorbid Diagnosis | HS to CR | Case | Likely does\_your\_child\_have\_any\_other\_comorbid\_diagnoses\_ "Comorbid Diagnosis" (274 cases), with the clinical version (comorbid\_diagnosis\_\_clinical, 8\) merged in and removed, as Sara asked for Maladaptive Behaviors. Confirming with Sara. | string |
| Maladaptive Behaviors | HS to CR | Case | Sara (Oct 22): only maladaptive\_behaviors\_\_parentguardian (labeled "Maladaptive Behaviors", 587 cases). Optidge will move the clinical version's data into it and delete maladaptive\_behaviors\_\_clinical, so don't map the clinical field. | checkbox |
| Severity Level | HS to CR | Case | severity\_level\_clinical (Level 1, 2, 3). | enumeration |
| Important information \- Parent | HS to CR | Case | important\_information "Important Information Re Home". | string |
| Current Primary Insurance | HS to CR | Case | insurance\_primary, or insurance\_1\_\_other\_\_summary when it is Other. | enumeration |
| Primary Insurance ID | HS to CR | Case | insurance\_id\_1 (sensitive). | string |
| Referring Physician, Credentials and NPI | HS to CR | Case | Medicaid: physician\_name \+ npi\_number. Commercial: physician\_name\_\_commercial \+ npi\_number\_\_commercial. Pick by insurance type. | string |
| Diagnosis | HS to CR | Case | phi\_diagnosis (sensitive) \+ diagnosis\_other. | enum \+ string |
| Referring Physician Medicaid ID | HS to CR | Case | referring\_provider\_medicaid\_id. | string |
| Date of Most Recent ASD Diagnosis | HS to CR | Case | most\_recent\_asd\_diagnosis\_date\_1. | date |
| ... Medicaid FFS NY | HS to CR | Case | most\_recent\_asd\_diagnosis\_date\_medicaid. | date |
| Policyholder Name | HS to CR | Case | policy\_holder\_name. | string |
| Policyholder Date of Birth | HS to CR | Case | phi\_\_policy\_holder\_dob (sensitive). | date |
| Secondary Insurance | HS to CR | Case | Sara confirmed (Oct 22): the carrier, insurance\_2 (or insurance\_2\_\_other\_\_summary when it is Other). Not n2\_what\_type\_of\_insurance. The row appears twice in the sheet (rows 45 and 78); use one. | enumeration |
| Secondary Insurance ID | HS to CR | Case | insurance\_id\_2 (sensitive). | string |
| Referral Source | HS to CR | Case | referral\_source (read-only in HubSpot, fine to read). | enumeration |

# **4\. Staffing: read associations, not fields**

Call GET /crm/v4/objects/deals/{caseId}/associations/{toObjectType} and filter on the associationTypes\[\].typeId. The type IDs below were read live on Oct 21, 2026\. Each labeled association also carries a plain unlabeled one (BCBA 20, BT 64); ignore those.

| Role | To object | typeId (Case to X) | Notes |
| :---- | :---- | :---- | :---- |
| Supervising BCBA | BCBA 2-48354212 | 82 | The ongoing BCBA. For the CR Supervising BCBA field itself, Sara wants the typed Ongoing Central Reach Provider Supplier (section 3); use this association to spot grad permit cases. A BCBA marked Outgoing with no removal date is still active (Sara's rule). |
| IA BCBA (Initial Assessment) | BCBA | 86 |  |
| RE BCBA (Reassessment) | BCBA | 145 | Renamed from "Reassessment BCBA" in Sep 2026\. |
| SUB BCBA | BCBA | 234 | Covers for a Supervising BCBA on leave (On Leave BCBA \= 236). Does CR need the substitute? |
| Outgoing Supervising BCBA | BCBA | 135 | Leaving; not the active BCBA. |
| Previous IA BCBA | BCBA | 286 | History only. |
| Potential IA / Potential Supervising BCBA | BCBA | 153 / 80 | Candidates only. Never sync to CR. |
| Primary BT 1 | BT/RBT 2-48354559 | 76 | Reverse direction (BT to Case) is 75\. |
| Primary BT 2 | BT/RBT | 143 | Reverse is 144\. |
| Outgoing BT 1 / Outgoing BT 2 | BT/RBT | 131 / 166 | Leaving. Still active until a removal date passes. |
| Potential BT 1 / Potential BT 2 | BT/RBT | 74 / 164 | Candidates only. |

# 

# 

# 

# **5\. BCBA**

| CR field | Direction | Object | HubSpot internal name and notes | Type |
| :---- | :---- | :---- | :---- | :---- |
| Trigger | HS to CR | BCBA | entered\_in\_centralreach "Enter BCBA in CentralReach" (only option Yes; 99 BCBAs). Confirm this is the BCBA start signal. | enumeration |
| Employee ID | CR to HS | BCBA | Does not exist on the BCBA object. (It exists on BT/RBT as employee\_id. You also created an empty employee\_id on Case, which we left in place.) Optidge will create it on BCBA and add it to the record card. | string |
| External System ID | CR to HS | BCBA | Does not exist on BCBA either (BT/RBT has external\_system\_id). Optidge will create it. | string |
| Legal Name | HS to CR | BCBA | first\_name \+ last\_name (also full\_name). | string |
| Gender | HS to CR | BCBA | gender\_new (Male/Female, 251 filled). The old gender is archived-in-place; don't use it. | enumeration |
| Primary Email (Work Email) | HS to CR | BCBA | Sara confirmed (Oct 22): ucaba\_email\_address "UCABA Email Address" (104 filled). No new field. | string |
| Mailing Address | HS to CR | BCBA | address, apartment\_\_home, city\_home, state\_home, postal\_code\_home, phone employee\_phone. All read-only mirrors of the BCBA's Contact. | string |
| Credentialed with NY Medicaid / Aetna / CO Medicaid / Cigna | HS to CR | BCBA | Use the per-state label fields: ny\_insurance\_labels (MCD FFS-NY, Aetna-NY, Cigna-NY, Carelon-NY), nj\_insurance\_labels, co\_insurance\_labels. A live workflow keeps them in step with the payor statuses. Don't use credentialed\_insurances\_\_ny (1 BCBA filled). This also answers the three TBD rows and the "not built for NY" note: NY is built. | checkbox |
| Medicaid ID \# NY / NJ / CO | HS to CR | BCBA | medicaid\_id\_\_ny, medicaid\_id\_\_nj, medicaid\_id\_\_co. | string |
| Personal Email | HS to CR | Contact | email on the BCBA's Contact (BCBA to Contact association 17). | string |
| Salaried | HS to CR | BCBA | work\_status "Hourly or Salary?" \= Salaried. | enumeration |
| Care Coordinator | HS to CR | BCBA | hubspot\_owner\_id, resolve with the owners API. | owner |

# **6\. BT/RBT**

| CR field | Direction | Object | HubSpot internal name and notes | Type |
| :---- | :---- | :---- | :---- | :---- |
| Trigger / status | HS to CR | BT/RBT | entered\_in\_centralreach "Entered in Central Reach": "Yes \- Active" (value Yes), Yes \- Generic, No- Made Inactive. Our deactivation alerts watch for staff setting No- Made Inactive after a BT leaves every case; if your sync deactivates BTs in CR, it should set this value so those alerts stop. | enumeration |
| Employee ID | CR to HS | BT/RBT | employee\_id "Employee ID (from CR)" (6 filled). | string |
| External System ID | CR to HS | BT/RBT | external\_system\_id (79 filled). | string |
| Legal Name | HS to CR | BT/RBT | first\_name \+ last\_name (also bt\_name). | string |
| Gender | HS to CR | BT/RBT | gender (read-only mirror of the Contact). | enumeration |
| Primary Email | HS to CR | BT/RBT | email on the BT/RBT record. | string |
| Mailing Address | HS to CR | BT/RBT | street\_home, location\_city, state\_home, postal\_code\_home, employee\_phone. Read-only mirrors of the Contact. | string |
| Work Address | HS to CR | BT/RBT | street\_address\_\_work\_, apartment\_\_work, city\_\_work\_, state\_\_work\_, postal\_code\_\_work\_ (only 15 filled). | string |
| Active Staffed | HS to CR | BT/RBT | The sheet maps this to "Case Count"; the HubSpot field is active\_cases\_count "\# of Active Cases". Question for you, Zeke: what is "Active Staffed" on the CR side (a yes/no field, a number, or a label)? Once we know, we can tell you the exact rule. | number |

# **7\. Client dashboard labels (HubSpot to CR)**

**Sara's answer (Oct 22):** the client dashboard uses three labels: **Active**, **Inactive**, and **Staffed** (added alongside Active when a BT is billing on the case). This replaces the stage-by-stage sublabels in the sheet. You don't need to map pipeline stages yourself: two Case properties that our workflows already keep current carry the answer.

| CR label | HubSpot property | Rule |
| :---- | :---- | :---- |
| Active / Inactive | case\_status "Case Status" | Stored values are Warm (shown as Active) and Cold (shown as Inactive). Updates on every stage change. |
| Staffed | staffing\_status "Staffing Status" | Add Staffed when the value is Staffed; remove it for X Staffed or blank. Updates on every stage and staffing change, including BT 2 starts and Reassessment. |

We checked both properties against every live case on Oct 22, stage by stage: they match Sara's list in every stage she covered. The table below shows the result per stage for reference.

| Stage ID(s) | HubSpot stage | Sara's CR labels | case\_status | staffing\_status | Notes |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 1136629064, 1284038324, 1136629065, 1136629066 | Contact Client, Established Contact, Sent Application, Intake In Process | not in CR yet | Active |  | The client is entered in CR at Intake Complete. Don't create them before enter\_in\_central\_reach contains Yes. |
| 1213733979 | Intake Complete | Active | Active |  |  |
| 1213681739, 1348616086, 1216864594, 1348616087, 1263094171 | Initial Assessment, Pending IA Auth, IA \- in Process, Pending Ongoing Auth, IA Complete | Active | Active |  |  |
| 1136629068, 1342613895 | Service Ready, Service Ready w/Start Date | Active | Active |  |  |
| 1278121498, 1310034488, 1341412767 | First Three Days, Ongoing, Ongoing-2nd BT Needed | Active \+ Staffed | Active | Staffed |  |
| 1341412154 | Restaffing- Paused-No BT | Active | Active | X Staffed |  |
| 1341581913, 1350979584 | Restaffing-BT to be Replaced, Restaffing-BCBA Needed | Active \+ Staffed | Active | Staffed |  |
| 1350979585 | Restaffing-BCBA AND BT Needed | not in Sara's list | Active | X Staffed | No BT is billing, so we expect Active only. Confirming with Sara. |
| 1348616088 | Reassessment | not in Sara's list | Active | Staffed or X Staffed | HubSpot works out Staffed from the case's staffing during Reassessment (48 Staffed, 21 X Staffed today). Confirming with Sara. |
| 1410598808, 1438735105 | Restaffing-Service Ready, Restaffing- Service Ready w/Start Date | Active (+ Staffed when BT 2 is starting and BT 1 is still billing) | Active | X Staffed, or Staffed for a second-BT start | HubSpot already handles the BT 2 case. |
| 1438735107, 1438735106 | Restaffing-New BCBA Service Ready, Restaffing- First Three Days | Active \+ Staffed | Active | Staffed |  |
| 1344955718, 1136629070, 1315313037 | Paused, Disqualified, Discharged | Inactive | Inactive | X Staffed (Paused) or blank |  |
| closedlost | Closed Lost | not in Sara's list (she wrote "Resigned", which is not a case stage) | Inactive |  | Confirming with Sara. |
| 1383894301, 1383894303, 1383894302, 1332962645 | Prior Service Cleanup, Prior In Process Cleanup, Contact Only Cleanup, Lost in the Shuffle | not in Sara's list | Active |  | 127 cases sit in the cleanup stages today and show as Active. Confirming with Sara whether CR should treat them as active. |

## **Client state and service location**

| CR label | HubSpot source | Notes |
| :---- | :---- | :---- |
| CO Client / NJ Client / NY Client | location (New York, New Jersey, Colorado; read-only, calculated) |  |
| Home | specific\_home\_location \= Child's House (or More Than One Location) |  |
| School / Clinic | No HubSpot option yet | Sheet marks these as future. Options to add to specific\_home\_location when needed. |

## **Funding source**

| CR label | HubSpot rule |
| :---- | :---- |
| Aetna NY | insurance\_primary \= Aetna and Case location \= New York |
| Cigna NY / Cigna Colorado | insurance\_primary \= Cigna and location \= New York / Colorado |
| Medicaid NY / NJ / Colorado | insurance\_primary \= Medicaid FFS and location. (Also n1\_what\_type\_of\_insurance, but its "Medicaid FFS \- NY" option stores Medicaid FFS, so the state is not in the value.) |
| Carelon | Any of the nine "-Carelon" options (Beacon, NY State Empire, Emblem HMO, Emblem non HMO, Unicare Commercial, Providence, Anthem NY Commercial, Child Health Plan, Independence Health Association). |
| Anthem BCBS | No matching HubSpot option. Is it "Anthem NY Commercial-Carelon" (which would otherwise go to Carelon)? |
| UHC | No UHC option in insurance\_primary. Needs to be added if United Care takes UHC. |
| (no CR label) | HubSpot values with no CR label: Aetna or Cigna in NJ, Aetna in CO, Other. What should CR show? |

# **8\. BCBA dashboard labels**

| CR label | HubSpot source | Notes |
| :---- | :---- | :---- |
| CO / NY / NJ Employee | location "Work State(s)" (checkbox, multi-value) | A BCBA can hold several states, so add one label per state. The field also has New Mexico and Virginia with no CR label yet. |
| BCBA (header) | every BCBA record |  |
| BCBA Colorado / BCBA LBA NJ | assign\_states contains Assign CO / Assign NJ |  |
| BCBA LBA NY | lba\_licensure\_\_ny \= Yes |  |
| GRAD Student- LBA NY | lba\_licensure\_\_ny \= Grad Permit |  |
| Aetna / Cigna / Carelon / NY Medicaid / CO Medicaid | ny\_insurance\_labels and co\_insurance\_labels | Easier than reading five status fields: these are kept in sync by a live workflow. If you read the statuses instead, NY Medicaid's "Credentialed" is stored as Credentialing. |
| (no CR label) | nj\_insurance\_labels (MCD-NJ, Horizon-NJ), Aetna-CO, Cigna-CO, Carelon-CO | Credentialed in HubSpot but no CR label in the sheet. The sheet's Aetna and Cigna labels also don't say which state. |
| Billing Hold Medicaid affiliation | cr\_billing\_hold\_label \= Yes | Remove the label when it goes back to No. |

# **9\. BT dashboard labels**

| CR label | HubSpot source | Notes |
| :---- | :---- | :---- |
| CO / NY / NJ Employee | location on BT/RBT (checkbox, multi-value) | Same New Mexico / Virginia question as BCBAs. |
| Behavior Technician CO / NY / NJ, RBT CO / NY / NJ | bt\_rbt\_type x location | Sara (Oct 22): bt\_rbt\_type is now only BT or RBT. BTs working toward RBT moved to a separate field (bt\_to\_rbt\_path), which doesn't affect the label. A BT with two states gets two labels. |

Small fix in the sheet: the header on that tab reads "CR \< Hubspot", which reads as CR to HubSpot; the rows themselves are HubSpot to CR.

# **10\. Open items**

## **Optidge will do**

1. Create **Employee ID** and **External System ID** on the BCBA object, and add them to the BCBA and BT/RBT record cards (first and second items in Overview, per your notes).

2. Confirm with you which of the five integration properties you created on Case are still needed: updated\_by\_integration, integration\_last\_write, employee\_id, supervising\_bcba, create\_record. All five are empty today. We held them during the October property clean-up (Case is at 929 of 1,000 properties).

3. Move the 59 cases' "Maladaptive Behaviors \- Clinical" data into "Maladaptive Behaviors" and delete the clinical field (Sara's request).

4. Decide how the Grad Permit marker travels with the BCBA on a case (Sara's request) and tell you where it lands.

5. Collect the remaining answers and send you an updated copy of this document.

##    **Still open with United Care**

1. Funding source labels: Anthem BCBS, UHC, and payors with no CR label (Pessy is answering).

2. Confirm the stages Sara's list didn't cover: Restaffing-BCBA AND BT Needed, Reassessment, Closed Lost, and the cleanup stages (section 7).

3. Which guardian goes to CR when a case has two.

4. Comorbid Diagnosis: same treatment as Maladaptive Behaviors?

5. BCBA and BT labels for New Mexico and Virginia.

## **For you to confirm**  

1 What "Active Staffed" is on the CR side (section 6).

2\. Your private app and its scopes, including the sensitive-data scope for deals.

\-Sensitive read & write tokens are already set   
\-Additional scopes to add below

| Production \- [Private App Link](https://app.hubspot.com/private-apps/50317927/30888870/auth) | Current Scopes |
| :---- | :---- |
| Additional scopes to add to [Private App](https://app.hubspot.com/private-apps/50317927/30888870/auth)**crm.objects.custom.read crm.objects.custom.write crm.objects.appointments.read crm.objects.appointments.write tickets** | crm.objects.appointments.sensitive.readcrm.objects.appointments.sensitive.writecrm.objects.contacts.sensitive.readcrm.objects.contacts.sensitive.writecrm.objects.companies.sensitive.readcrm.objects.companies.sensitive.writecrm.objects.deals.sensitive.readcrm.objects.deals.sensitive.writecrm.objects.custom.sensitive.readcrm.objects.custom.sensitive.writecrm.objects.contacts.writetickets.sensitivecrm.objects.contacts.highly\_sensitive.readcrm.objects.contacts.highly\_sensitive.writecrm.objects.companies.highly\_sensitive.readcrm.objects.companies.highly\_sensitive.writecrm.objects.deals.highly\_sensitive.readcrm.objects.deals.highly\_sensitive.writetickets.highly\_sensitivecrm.objects.custom.highly\_sensitive.readcrm.objects.custom.highly\_sensitive.writecrm.objects.deals.readcrm.objects.deals.writecrm.objects.contacts.read  |

3 Every HubSpot property your integration writes to, so we never archive or rename one under you.

4 How you want to be told about changes (next section)

# **11\. What we can set up for you**

* **A change signal, so you don't have to poll.** We can build HubSpot workflows that call a webhook on your Azure endpoint (or stamp a "CR sync needed" date you watch) when "Entered Client in CR" turns Yes, when the Case stage changes, when staffing associations change, and when any mapped field changes. Tell us the endpoint and payload you want.

* **Test records.** ZZ TEST Case, BCBA and BT/RBT records our automations recognize as tests, so your sync can run end to end without emailing United Care staff or families.

* **A sandbox pass on the label logic.** Once Sara answers the open items, we can run your stage-to-label table against every live case and send you the list of cases whose CR label would change on day one.

* **Monitoring.** A small HubSpot report of records your integration wrote in the last 24 hours (using integration\_last\_write), so both teams can see the sync is alive.

# **Appendix: dropdown options whose stored value differs from the label**

Every other option on the fields in this document stores exactly what it shows.

| Object | Property | Label shown to staff and the value the API stores |
| :---- | :---- | :---- |
| Case | case\_status | "Active" stores Warm; "Inactive" stores Cold |
| Case | enter\_in\_central\_reach | "Yes- Completed" stores Yes |
| Case | n1\_what\_type\_of\_insurance | "Medicaid FFS \- NY" stores Medicaid FFS |
| Case | n2\_what\_type\_of\_insurance | "Medicaid FFS \- NY" stores Medicaid FFS |
| Case | phi\_diagnosis | "Yes-F84.0" stores Yes |
| Case | allergies | "Yes" stores Confirmed; "No" stores Denial |
| Case | maladaptive\_behaviors\_\_parentguardian | "Aggression-Uses Physical Force on Themselves or Others" stores Aggression; "Self-Injurious-Hurts Themselves On Purpose Repeatedly" stores Self-Injury; "Tantrums/Meltdowns-Emotional Outburst with Crying/Screaming" stores Tantrums/Meltdowns; "Property Destruction-Breaks, Throws, or Damages Items" stores Property Destruction; "Elopement Risk-Wanders/Leaves Room or Area Without Permission" stores Elopement; "Mouthing Non Food Items-Frequently Puts Objects In Mouth" stores Mouthing Non Food Itemsth; "Repetitive Behaviors-Repeats The Same Movements, Sounds, Or Actions" stores Repetitive Behaviors |
| BCBA | ny\_medicaid\_\_status | "Credentialed" stores Credentialing |
| BCBA | lba\_licensure\_\_ny | "Will Apply" stores No |
| BT/RBT | entered\_in\_centralreach | "Yes \- Active" stores Yes |

