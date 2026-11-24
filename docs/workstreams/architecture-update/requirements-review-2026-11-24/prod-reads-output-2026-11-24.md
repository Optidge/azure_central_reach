# HubSpot production reads, 2026-11-24 (Zeke ran `scripts/sandbox/prod-review-reads.mjs .env`)

Portal check ok: 50317927. 81 calls, GET and count-only search. Nothing was written. Output as printed (pipeline stage lists shortened to id and label).

Zeke also confirmed on 2026-11-24, verbatim: "done / Workflow trigger lists (slices 2, 4, 5, 6, 7)".

## 01 Association labels

```text
0-3 -> 2-48354212 (Case -> BCBA): HTTP 200
  86 "IA BCBA" | 234 "SUB BCBA (Supervising Status)" | 153 "Potential IA BCBA" | 286 "Previous IA BCBA"
  288 "Outgoing SUB BCBA" | 80 "Potential Supervising BCBA" | 82 "Supervising BCBA" | 145 "RE BCBA"
  20 label=null | 236 "On Leave BCBA (inactive)" | 135 "Outgoing Supervising BCBA"
0-3 -> 2-48354559 (Case -> BT/RBT): HTTP 200
  131 "Outgoing BT 1" | 74 "Potential BT 1" | 143 "Primary BT 2" | 76 "Primary BT 1"
  166 "Outgoing BT 2" | 164 "Potential BT 2" | 64 label=null
2-48354212 -> 2-48354212 (BCBA -> BCBA): HTTP 200
  149 label=null | 150 "Grad Permit Supervisee (this BCBA supervises them)" | 151 "Grad Permit Supervisor (supervises this BCBA)"
2-48354212 -> 0-1 (BCBA -> Contact): HTTP 200
  17 label=null
2-48354559 -> 0-1 (BT/RBT -> Contact): HTTP 200
  109 "Contact Record" | 107 label=null
(all category=USER_DEFINED)
```

## 01 Pipelines and stages

```text
deals: 1 pipeline, id=default "Client Pipeline"
  1136629064 Contact Client | 1284038324 Established Contact | 1136629065 Sent Application | 1136629066 Intake In Process
  1213733979 Intake Complete | 1213681739 Initial Assessment | 1348616086 Pending IA Auth | 1216864594 IA - in Process
  1348616087 Pending Ongoing Auth | 1263094171 IA Complete | 1136629068 Service Ready | 1342613895 Service Ready w/Start Date
  1278121498 First Three Days | 1310034488 Ongoing | 1341412767 Ongoing-2nd BT Needed | 1341412154 Restaffing- Paused-No BTBT)
  1341581913 Restaffing-BT to be Replaced | 1350979584 Restaffing-BCBA Needed | 1350979585 Restaffing-BCBA AND BT Needed
  1348616088 Reassessment | 1410598808 Restaffing-Service Ready | 1438735105 Restaffing- Service Ready w/Start Date
  1438735107 Restaffing-New BCBA Service Ready | 1438735106 Restaffing- First Three Days | 1344955718 Paused
  1136629070 Disqualified | 1315313037 Discharged | closedlost Closed Lost | 1332962645 Lost in the Shuffle
  1383894301 Prior Service Cleanup | 1383894303 Prior In Process Cleanup | 1383894302 Contact Only Cleanup
2-48354212 (BCBA): 1 pipeline, id=855656544 "Pipeline"
  1275899417 Applied | 1275899418 Contacted | 1275697157 Sent Application | 1275697158 Hiring In Process | 1363901493 Hired
  1275697162 Paused | 1275697163 Disqualified | 1344955696 Resigned | 1344955697 Terminated
  1331112264 Possibility (Apploi) | 1467178927 Apploi from Link
2-48354559 (BT/RBT): 1 pipeline, id=822050166 "Hiring Process"
  1216616245 Applied | 1216616246 Contacted | 1263122061 Sent Application | 1263122062 Hiring In Process | 1275661880 Hired
  1216507227 Paused | 1263175081 Disqualified | 1299798139 Resigned | 1299798140 Terminated
  1331052049 Apploi Possibility | 1432363113 Apploi Responded | 1445425691 Apploi Candidate | 1466375189 Apploi from Link
```

## 01-06 Property definitions

```text
# Case (0-3)
  location: enumeration/select calculated=true readOnly=true options=["New York","New Jersey","Colorado"]
  staffing_status: enumeration/select options(10)=["Hot Lead","Warm Lead","Cold Lead","Processing Leads","Pending 97151 Services","97151 Services","Pending 97153 Services","Starting 97153 Services","X 97153","Staffed 97153"]
  case_status: enumeration/select options=["Warm","Cold"]
  specific_home_location: enumeration/select options=["Child's House","Other Location","More Than One Location"]
  insurance_primary: enumeration/select options(15)=["Medicaid FFS","Aetna","Cigna","Beacon-Carelon","Other","NY State Empire-Carelon","Emblem non HMO-Carelon","Emblem HMO-Carelon","Unicare Commercial-Carelon","Providence-Carelon","Anthem NY Commercial-Carelon","Child Health Plan-Carelon","Independence Health Association-Carelon","UHC","Anthem BCBS"]
  referral_other: HTTP 404
  care_coordinator_first_name: HTTP 404
  care_coordinator_last_name: HTTP 404
  care_coordinator_email: 200 string/text
  coordinator_export_status: HTTP 404
  service__stateregion_2: 200 enumeration/select, 50 options = full US state names (includes New York, New Jersey, Colorado, New Mexico, Virginia)
  centralreach_creates_only: HTTP 404
  centralreach_updates_only: HTTP 404
  last_sync_at: datetime/date
  integration_last_write: datetime/date
# BCBA (2-48354212)
  entered_in_centralreach: enumeration/radio options=["Yes"]
  bcba_in_cr_checklist: enumeration/checkbox options=["NPI","External System ID","Billing Hold NY Medicaid Label"]
  date_of_birth: string/text calculated=false readOnly=false
  dob: string/text
  personal_email: string/text
  email: string/text calculated=false readOnly=false
  location: enumeration/checkbox options=["New York","New Jersey","Colorado","New Mexico","Virginia"]
  assign_states: enumeration/checkbox options=["Assign NY","Assign NJ","Assign CO"]
  lba_licensure__ny: enumeration/select options=["Yes","In Process","No","Grad Permit"]
  ny_insurance_labels: enumeration/checkbox options=["MCD FFS-NY","Aetna-NY","Cigna-NY","Carelon-NY"]
  co_insurance_labels: enumeration/checkbox options=["MCD-CO","Aetna-CO","Carelon-CO","Cigna-CO"]
  nj_insurance_labels: enumeration/checkbox options=["MCD-NJ","Horizon-NJ","Aetna","Cigna"]
  cr_billing_hold_label: enumeration/select options=["Yes","No"]
  work_status: enumeration/select options=["Salaried","Hourly"]
  centralreach_creates_only: HTTP 404
  centralreach_updates_only: HTTP 404
  last_sync_at: datetime/date
  integration_last_write: datetime/date
# BT/RBT (2-48354559)
  active_cases_count: number/number calculated=false readOnly=false
  date_of_birth: string/text calculated=true readOnly=true
  bt_rbt_type: enumeration/select options=["RBT","BT"]
  bt_to_rbt_path: enumeration/select options=["Yes"]
  location: enumeration/checkbox options=["New York","New Jersey","Colorado","New Mexico","Virginia"]
  btrbt_in_cr_checklist: enumeration/checkbox options=["External System ID","Medicaid ID Claim Settings"]
  entered_in_centralreach: enumeration/radio options=["Yes","Yes - Generic","No- Made Inactive"]
  centralreach_creates_only: HTTP 404
  centralreach_updates_only: HTTP 404
  last_sync_at: datetime/date
  integration_last_write: datetime/date
```

## 05 Case counts

```text
staffing_status: Hot Lead 102 | Warm Lead 113 | Cold Lead 632 | Processing Leads 458 | Pending 97151 Services 3
  97151 Services 58 | Pending 97153 Services 79 | Starting 97153 Services 11 | X 97153 73 | Staffed 97153 154 | blank 1200
specific_home_location: Child's House 1665 | Other Location 21 | More Than One Location 25 | blank 1172
```

## 04/06 Staff counts

```text
BCBA location: New Mexico 8 | Virginia 2
BT/RBT location: New Mexico 0 | Virginia 0
BT/RBT bt_rbt_type: RBT 76 | BT 1463 | blank 4654
BT/RBT Entered in CR = Yes and active_cases_count > 0: 157
BCBA co_insurance_labels: MCD-CO 48 | Aetna-CO 11 | Carelon-CO 2 | Cigna-CO 3 | blank 324
```
