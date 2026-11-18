# Sandbox test plan

Agreed record convention, Zeke, 2026-11-18. The same day Zeke confirmed four additions from the Stage 1 review: the BT/RBT has its own email, a rule for `workday_id`, a state on every record, and a cleanup step after each round. The rest of this plan is still the draft list in [BUILD-PLAN.md](BUILD-PLAN.md) Stage 8. Stage 7 writes those tests here. Do not drop the convention below when that happens.

`npm test` does not create these records. It uses fake properties in `src/tests/smoke/`.

## Record convention

Every sandbox round creates a fresh Case, a fresh BT/RBT, and a fresh BCBA. Rounds start at 1 and go up by one. Do not reuse a round.

CentralReach has no sandbox. A create in a round writes a real employee or client in production CentralReach. Do that only when Zeke names the round and says to write.

On every record:

- `sandbox_test_field` = true. That puts the record in list 1463 (Deals), 1464 (BCBAs), or 1465 (BT/RBTs).
- `test_record` stays blank. The integration skips `test_record` = true.
- Each name contains the words Azure Test and the round number. A small variation is allowed. The standard names below are the ones to use.

Before round 1, every property name below is checked against the finished mappers (BUILD-PLAN step 7.1). Stage 5 changes the employee state, address and apartment properties.

`N` is the round number as digits, with no leading zero. Round 1 is `1`. `NN` is the same number in two digits. Round 1 is `01`. This phone pattern fits rounds 1 through 99.

### Case (HubSpot Deal)

The code sends `phi_first_name__cloned_` and `phi_last_name` to CentralReach. `dealname` is the HubSpot display name.

| Property | Value |
| --- | --- |
| `dealname` | CR Azure Test #N |
| `phi_first_name__cloned_` | Zeke |
| `phi_last_name` | Swanson Azure Test #N |
| `phi_date_of_birth` | Any valid date, `YYYY-MM-DD`. A create requires it. `1990-01-15` is fine. |
| `guardian_first_name` | Don Azure Test #N |
| `guardian_last_name` | Swanson |
| `policy_holder_name` | Don Swanson |
| `email` | zeke+swanson_azure_test_N@optidge.com |
| `phone` | 212-555-NN01 |
| `phone_number__second_` | 212-555-NN02 |
| `home_apt` | NE |
| `location` | New York. This gives the client the NY Client label. |

Production CentralReach shows this client as Zeke Swanson Azure Test #N.

`phone` and `phone_number__second_` are the two phone fields the client mapper sends. NN01 is `phone`. NN02 is the second phone.

### BT/RBT

The code sends `first_name`, `last_name`, and `email`. `bt_name` is the HubSpot display name only. It must be unique.

| Property | Value |
| --- | --- |
| `first_name` | Jane |
| `last_name` | Swanson Azure Test #N |
| `bt_name` | Jane Swanson Azure Test #N |
| `email` | zeke+bt_azure_test_N@optidge.com. Its own address: the Case and the BT/RBT do not share one, because what a CentralReach 409 matches on is not tested yet. |
| `date_of_birth` | Any valid date, `YYYY-MM-DD`. `1990-01-15` is fine. |
| `employee_phone` | 212-555-NN03 |
| `home_apt` | NE |
| `workday_id` | See "Workday ID" below. |
| `bt_rbt_type` | BT |
| State | New York, in `location_home` (what the Stage 1 code reads) and in `location` and `state_home` (what Stage 5 reads). |

Production CentralReach shows this employee as Jane Swanson Azure Test #N.

### BCBA

The code sends `first_name`, `last_name`, and `ucaba_email_address`. `bcba_name` is the HubSpot display name only. It must be unique.

| Property | Value |
| --- | --- |
| `first_name` | Zeke |
| `last_name` | Swanson BCBA Azure Test #N |
| `bcba_name` | Zeke Swanson BCBA Azure Test #N |
| `ucaba_email_address` | zeke_work_email+azure_test_N@optidge.com |
| `email` | zeke+bcba_azure_test_N@optidge.com |
| `date_of_birth` | Any valid date, `YYYY-MM-DD`. `1990-01-15` is fine. |
| `employee_phone` | 212-555-NN04 |
| `home_apt` | NE |
| `workday_id` | See "Workday ID" below. |
| State | New York, in `home_state` (what the Stage 1 code reads) and in `location` and `state_home` (what Stage 5 reads). |

`ucaba_email_address` is the required primary email. `email` is the personal email. Set the associated Contact `email` to the same personal address when the Contact route is in use.

Production CentralReach shows this employee as Zeke Swanson BCBA Azure Test #N.

### Workday ID

CentralReach keeps an External System ID for good: the API cannot change it and cannot delete the employee. So a test value must never be a real Workday ID.

| Test | `workday_id` on the BT/RBT and the BCBA |
| --- | --- |
| Temporary-ID path (create with no Workday ID) | Blank. The create sends the HubSpot record ID and the status is `waiting`. |
| Workday ID path (create with a Workday ID, or the "replace the temporary ID" steps) | `AZTEST-N-BT` on the BT/RBT and `AZTEST-N-BCBA` on the BCBA. New in every round. Never digits only, so it cannot equal a real Workday ID or a HubSpot record ID. |
| Two records with one Workday ID | Both records get the same `AZTEST-N-...` value, on purpose, for that test only. |

### After each round

The integration never deactivates anyone in CentralReach, and the API cannot delete a contact. Each round leaves three contacts in production CentralReach.

- When the round's tests are done, Zeke makes the round's client and two employees inactive on the CentralReach screen.
- Mark the date in the "Made inactive in CR" column of the test log.

Not tested yet: whether CentralReach accepts `#` in a name. If a create is rejected for the name, drop the `#` (for example "Swanson Azure Test 1") and note it here.

### Round 1 example

| Record | Name in CentralReach | Phone | Apartment |
| --- | --- | --- | --- |
| Case | Zeke Swanson Azure Test #1 | 212-555-0101 and 212-555-0102 | 1E |
| BT/RBT | Jane Swanson Azure Test #1 | 212-555-0103 | 1E |
| BCBA | Zeke Swanson BCBA Azure Test #1 | 212-555-0104 | 1E |

## Test log

After each create, write the HubSpot record ID and the CentralReach contact ID in [sandbox-test-log.md](sandbox-test-log.md). One row per record. Leave a row blank until that create has happened.
