# Sandbox properties and labels

Portal `50850427`. Updated Oct 27, 2026 (sensitive-property pass from Integration V2).

This is the tracker for sandbox HubSpot properties, the RE BCBA association label, and the CentralReach labels the sync applies. Update a row here when an open item closes.

The WS.1 production-to-sandbox definition diff, with association label type ids and the CentralReach id check, is [`ws1-schema-diff.md`](ws1-schema-diff.md). Read it before changing a row here.

Source of truth for the waiting list: [CentralReach to HubSpot Integration V2](https://docs.google.com/document/d/1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk/edit). Property definitions live in `scripts/sandbox-hubspot-properties.json`. Label ids live in `src/constants/centralReach.mjs`.

## HubSpot sensitive-data properties (guide)

Integration V2 **API rule #2** names the Case fields in HubSpot’s **sensitive-data tier** on production portal `50317927`. They only return on API reads when the private app has `crm.objects.deals.sensitive.read`. Writes need `crm.objects.deals.sensitive.write`. Without read scope, values are **silently omitted** from the response. The webhook does not send these values. The deal GET in `src/workflows/clientSyncWorkflow.mjs` does, and the comments on `REQUIRED_DEAL_PROPERTIES` are the production record.

Portal `50850427` is a developer test account and cannot store sensitive properties. `non_sensitive` on this portal is expected. Do not recreate these properties here to change sensitivity. This is closed for this portal. It remains a production cutover check: the private app on `50317927` needs `crm.objects.deals.sensitive.read`, and `crm.objects.deals.sensitive.write` if those fields are patched.

The guide does **not** put BCBA `medicaid_id__ny`, `medicaid_id__nj`, or `medicaid_id__co` in that tier. It does not name Case `diagnosis_other`, allergies, addresses, or comorbid fields in note #2 either. Those stay normal properties unless production marks them sensitive separately. BT/RBT and BCBA fetch lists have no production sensitive-tier fields.

| Case property | Guide sensitive tier | Client sync fetch | Sandbox property in this pass | Sandbox sensitivity (Oct 27) |
| --- | --- | --- | --- | --- |
| `phi_first_name__cloned_` | Yes | Yes | Pre-existing on portal | `non_sensitive` here is expected. Sensitive on production `50317927`. |
| `phi_last_name` | Yes | Yes | Pre-existing on portal | `non_sensitive` here is expected. Sensitive on production `50317927`. |
| `phi_gender` | Yes | Yes | Pre-existing on portal | `non_sensitive` here is expected. Sensitive on production `50317927`. |
| `phi_date_of_birth` | Yes | Yes | Pre-existing on portal | `non_sensitive` here is expected. Sensitive on production `50317927`. |
| `insurance_id_1` | Yes | Yes | Pre-existing on portal | `non_sensitive` here is expected. Sensitive on production `50317927`. |
| `insurance_id_2` | Yes | Yes | Created (`scripts/sandbox-hubspot-properties.json`) | **`non_sensitive`** on this test account. Sensitive on production `50317927`. |
| `insurance_id_3` | Yes | No | Not created; not on fetch list | Sensitive on production. Not synced. |
| `insurance_id_4` | Yes | No | Not created; not on fetch list | Sensitive on production. Not synced. |
| `phi__policy_holder_dob` | Yes | Yes | Pre-existing on portal | `non_sensitive` here is expected. Sensitive on production `50317927`. |
| `phi_diagnosis` | Yes (HIPAA in production) | Yes | Created | **`non_sensitive`** on this test account. Sensitive, HIPAA category, on production `50317927`. |
| `diagnosis_other` | No (not in note #2) | Yes | Created | Guide maps it with `phi_diagnosis` when value is Other. Not listed in the sensitive-tier bullet; sandbox is **`non_sensitive`**. Revisit if production marks it sensitive. |

**Not sensitive per guide note #2** (sandbox properties from this pass that are still PHI/clinical in CentralReach): `allergies__yes__explain`, `maladaptive_behaviors__parentguardian`, `full_home_address`, `service_address__other`, `referring_provider_medicaid_id`, `comorbid_diagnosis__clinical` (fetched; not a sandbox create).

## Done

### Sandbox properties created

Case is deals (`0-3`). BCBA is `2-55656302`. BT/RBT is `2-55656309`.

| Object | Property | Notes |
| --- | --- | --- |
| Case | `ongoing_central_reach_provider_supplier` | Text. Supervising BCBA used for billing. |
| Case | `work_schedule_details` | Text. |
| Case | `btrbt_work_schedule_2_details` | Text. |
| Case | `work_schedule_1_details__for_location_2_other` | Text. |
| Case | `work_schedule_2_details__for_location_2_other` | Text. |
| Case | `finalized_client_service_hours_post_assessment` | Text. |
| Case | `client_service_hours_total` | Number. |
| Case | `n97153_approved_assessment_hours_auth_req` | Text. |
| Case | `ia_hours_from_the_ia` | Number. |
| Case | `full_home_address` | Text. |
| Case | `service_address__other` | Text. |
| Case | `allergies__yes__explain` | Text. |
| Case | `diagnosis_other` | Text. Pairs with `phi_diagnosis` when Other. Not in guide sensitive-tier list. |
| Case | `referring_provider_medicaid_id` | Text. |
| Case | `insurance_id_2` | Text. Production sensitive tier. **`non_sensitive`** on this test account. |
| Case | `insurance_2__other__summary` | Text. |
| Case | `initial_auth_tracks` | Select. Options copied from production. |
| Case | `maladaptive_behaviors__parentguardian` | Checkbox. Options copied from production. |
| Case | `phi_diagnosis` | Radio, 5 options. Production sensitive tier (HIPAA). **`non_sensitive`** on this test account. |
| Case | `referral_source` | Select. Writable stand-in. Production is calculated. |
| Case | `location` | Select: New York, New Jersey, Colorado. Writable stand-in. Production is calculated. |
| Case | `stateregion` | Text. |
| Case | `reassessment_bcba_name` | Text. Writable stand-in. Production is calculated. |
| Case | `total_hours_bt1bt2_work_schedule` | Number. Writable stand-in. Production is calculated. Last production formula read was the placeholder `1 + 1`, which was not copied. |
| Case | `ongoing_auth_period_start_date` | Date. |
| Case | `ongoing_autrh_period_end_date` | Date. Internal name keeps the production typo `autrh`. |
| BCBA | `external_system_id` | Text. |
| BCBA | `first_name` | Text. |
| BCBA | `last_name` | Text. |
| BCBA | `ucaba_email_address` | Text. |
| BCBA | `postal_code_home` | Text. |
| BCBA | `co_insurance_labels` | Checkbox: MCD-CO, Aetna-CO, Carelon-CO, Cigna-CO. |
| BCBA | `work_status` | Select: Salaried, Hourly. |
| BCBA | `assign_states` | Checkbox: Assign NY, Assign NJ, Assign CO. |
| BCBA | `lba_licensure__ny` | Select: Yes, In Process, Will Apply, Grad Permit. |
| BCBA | `city_home` | Text. Writable stand-in. Production is calculated. |
| BCBA | `state_home` | Select, full state list. Writable stand-in. Production is calculated. |
| BCBA | `apartment__home` | Text. Writable stand-in. Production is calculated. |
| BT/RBT | `external_system_id` | Text. |

### Association label

| From | To | Label | Name |
| --- | --- | --- | --- |
| Case (deals) | BCBA `2-55656302` | RE BCBA | `re_bcba` |

### Case `insurance_primary` options

Existing options were left in place: Medicaid FFS, Aetna, Cigna, Other.

Added Oct 27, 2026, label and stored value the same. A value containing `Carelon` maps to CentralReach label `1107648`.

| Option |
| --- |
| Beacon-Carelon |
| NY State Empire-Carelon |
| Emblem HMO-Carelon |
| Emblem non HMO-Carelon |
| Unicare Commercial-Carelon |
| Providence-Carelon |
| Anthem NY Commercial-Carelon |
| Child Health Plan-Carelon |
| Independence Health Association-Carelon |

UHC was not added. Anthem BCBS is still an open United Care question, separate from `Anthem NY Commercial-Carelon`.

### CentralReach labels the sync applies

Client labels, from `requiredClientLabelIds` in `src/mappings/client/buildClientMetadata.mjs`:

| When | Label | Id |
| --- | --- | --- |
| Every client | All Clients | `1052619` |
| State NY / NJ / CO | NY / NJ / CO Client | `1082499` / `1132647` / `1132648` |
| `case_status` Warm / Cold | Active / In-Active Client | `1125427` / `1121488` |
| Home location is Child's House or More Than One Location | Home | `1052656` |
| `insurance_primary` Aetna and NY | Aetna NY | `1082497` |
| Cigna and NY / CO | Cigna NY / Cigna Colorado | `1082498` / `1124249` |
| Medicaid FFS and NY / NJ / CO | Medicaid NY / NJ / CO | `1052532` / `1124247` / `1124248` |
| `insurance_primary` contains Carelon | Carelon | `1107648` |

Employee labels, from `src/mappings/employees/buildEmployeePayload.mjs`:

| When | Label | Id |
| --- | --- | --- |
| Every employee | All Employees | `1052618` |
| BT/RBT or BCBA in NY, NJ, or CO | Clinical | `1052643` |
| Work state NY / NJ / CO | NY / NJ / CO Employee | `1132655` / `1107686` / `1107687` |
| BT in NY / NJ / CO | BT NY / NJ / CO | `1052630` / `1132652` / `1132650` |
| RBT in NY / NJ / CO | RBT NY / NJ / CO | `1052631` / `1132651` / `1107692` |
| Every BCBA | BCBA | `1130668` |
| `assign_states` Assign NJ / Assign CO | BCBA LBA NJ / BCBA Colorado | `1124245` / `1124246` |
| `lba_licensure__ny` Yes / Grad Permit | BCBA LBA NY / Grad Student LBA NY | `1052629` / `1092164` |
| `work_status` Salaried | Salaried | `1132653` |
| `ny_insurance_labels` MCD FFS-NY / Aetna-NY / Cigna-NY / Carelon-NY | Onboarding NY Medicaid / Aetna / Cigna / Carelon | `1107647` / `1107649` / `1107650` / `1132654` |
| `co_insurance_labels` MCD-CO | Onboarding CO Medicaid | `1107651` |
| `cr_billing_hold_label` Yes | Billing Hold Medicaid Affiliation | `1103437` |

No CentralReach label is removed when HubSpot is set back to No. The client only POSTs labels.

## Still open

| Item | Status | What closes it |
| --- | --- | --- |
| Production formulas | Open, no longer blocked on access. Sandbox `location`, `reassessment_bcba_name`, `referral_source`, `total_hours_bt1bt2_work_schedule`, and BCBA `city_home`, `state_home`, and `apartment__home` are writable. `calculated` is false. A local production token now exists (`HUBSPOT_PRIVATE_APP_TOKEN_PROD` in `.env`, gitignored). | Read `calculationFormula` from portal `50317927` during WS.1. An existing writable sandbox property still cannot be switched to calculated without that formula. Do not paste the token. |
| Staffed and Active Case Load | Pending follow-up. You are taking this back to the guide. Staffed is not in the 95-label catalog. Active Case Load is not in the 58 metadata fields. `staffing_status` is fetched and is not turned into a label. | United Care names the CentralReach field or label. A Drive comment on the guide was rejected: this app does not have write access to that doc. Paste the note below if you want it on the doc. |
| Billing hold label removal | Open in code, not a sandbox property. `cr_billing_hold_label` = Yes adds `1103437`. Setting it back to No does not remove the label. | A CentralReach label delete, once that route is confirmed. |

## Pending follow-up note for the guide

The Drive comment could not be posted (`appNotAuthorizedToFile` on `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`). Paste this on the doc if you want it there:

> Pending follow-up (Zeke, Oct 27, 2026): Staffed and Active Case Load. Staffed is not in the CentralReach 95-label catalog. Active Case Load is not in the 58 metadata fields. The guide answer for section 6 is Profile → Employee Case Load, which is not an API field in the Azure repo. `staffing_status` is fetched and is not turned into a label until this is identified.

## Code comments for items waiting on Sara or United Care

| Waiting item | Where |
| --- | --- |
| Anthem BCBS, UHC, and payors with no CentralReach label | `src/mappings/client/buildClientMetadata.mjs` `fundingLabelId` |
| NJ insurance labels, Aetna-CO, Cigna-CO, Carelon-CO, and billing-hold removal | `src/mappings/employees/buildEmployeePayload.mjs` `addBcbaCredentialLabels` |
| New Mexico and Virginia employee labels | Skip for now (10/28). `workStateCodes` must not add them. |
| Which guardian when a Case has two | Decided 10/28: parent-communication email. Code still sends the Case name fields. |
| Comorbid and maladaptive clinical fields | Danny said main fields only. Confirm the live properties before changing code. The mapper may still read `comorbid_diagnosis__clinical`. |
| Active / Staffed labels | Pessy confirming they exist in CentralReach (10/28). |
| Unticked records that already have a CentralReach client id | Rule decided. Implement in full production tomorrow, not in sandbox. Code still requires Yes. |
| BT/RBT `Yes - Generic` and `No- Made Inactive` | `src/workflows/employeeSyncWorkflow.mjs` `enteredInCentralReachContainsYes` |

Stages Sara's list did not cover are not branch logic in this repo. The sync follows `case_status` and `staffing_status`, so no stage comment was added. The upcoming-auth `_f` fields are not read, so no comment was added.

## Field items still waiting on Sara or United Care

1. **Funding source labels.** Anthem BCBS has no HubSpot option. The open question is whether it is `Anthem NY Commercial-Carelon` (that option now exists and maps to Carelon `1107648`). UHC is not an `insurance_primary` option and was not added. Aetna or Cigna in NJ, Aetna in CO, and Other have HubSpot values and no CentralReach label. Pessy is answering.
2. **BCBA credential labels with no CentralReach label.** `nj_insurance_labels` (MCD-NJ, Horizon-NJ), Aetna-CO, Cigna-CO, and Carelon-CO.
3. **New Mexico and Virginia.** Skip for now (Danny, 10/28). Do not add labels.
4. **Stages.** Cleanup stages stay out of CentralReach. HubSpot is moving those cases to Inactive. Reassessment does not get its own map: Staffed comes from `staffing_status`. Closed Lost and Restaffing-BCBA AND BT Needed were not answered on 10/28.
5. **Which guardian.** Decided 10/28: the Parent/Guardian contact whose email is used for parent communication. The code still sends Case `guardian_first_name` and `guardian_last_name`.
6. **Comorbid and maladaptive.** Danny said main fields only, with clinical copies deleted before Thursday. Confirm that in the portal before changing the mapper. The code still reads `comorbid_diagnosis__clinical`.
7. **Active / Staffed labels.** Pessy is confirming they exist in CentralReach (10/28). Active Case Load is still not an API field in this repo.
8. **BT/RBT gate values.** Sara still has not said how `Yes - Generic` and `No- Made Inactive` should behave. Stored `Yes` (the label `Yes - Active`) is the only value that passes.
9. **Records already in CentralReach.** The rule is decided: a CR client id is enough for about 74 cases. Implement that in full production tomorrow, not in sandbox. The sandbox code still requires the Yes token.
10. **Upcoming auth `_f` fields.** Map the plain auth fields unless Sara wants CentralReach to see the next auth early. The `_f` copies are not in the fetch list. Not mentioned on 10/28.
