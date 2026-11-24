# Unmapped-field wipe check (2026-11-24)

Read-only check of one claim. It was made in another session, was never verified, and was cut off mid-sentence:

> "unmapped fields may be wiped by every update. A recorded test proves an employee update clears any field left [out of the PUT body]"

Method: repo files only. No HubSpot, CentralReach or Azure call. `.env` and `local.settings.json` were not opened. Line numbers are for the working tree of `architecture-update` on 2026-11-24, uncommitted changes included. Nothing else in the repo was edited.

Labels used below. **Confirmed** = written in the code, or a recorded first-hand CentralReach (CR) observation. **Inferred** = reasoning from confirmed facts. **Unknown** = needs a live call.

---

## 1. Summary

- **Confirmed (live, 2026-11-20):** an employee `PUT /contacts/employee/{id}` that leaves out `addressLine2` clears the stored value. So does one that sends `addressLine2: null`. This was one key, on one record (`5338681`), run by Zeke from the orchestrator's script.
- **Not shown by any record:** that the employee PUT clears a key outside the 12 core keys. The claim says "any field". That is an inference from the single core-key result, not a test.
- **The integration's employee update sends only the 12 core keys.** The 16 non-core keys seen on the 2026-11-24 read are never sent: `title`, `middleInitial`, `chosenName`, `languages`, `credentials`, `ssn`, `npiNumber`, `jobTitle`, `company`, `employeeType`, `payTypes`, `payCodes`, `primaryOfficeLocation`, plus `isActive` and `type`. `hireDate` belongs on this list too: it was seen in an earlier read but is missing from the 2026-11-24 list. If the PUT replaces the whole record, a value staff enter in any of these keys is lost on the next update.
- **Client:** every key the integration maps is protected by B21. Nobody has tested whether the client PUT clears a key it leaves out (O-35, still open on that point). The unsent keys include `phoneHome` (left out on purpose, decision 36), `title`, `middleInitial`, `chosenName`, `guarantorFirstName` and `guarantorLastName`.
- **Metadata (custom fields):** written one field at a time. Only changed fields are sent, so a field the integration does not map is never addressed. Not at risk.
- **Labels:** the POST replaces the whole set (live test, 2026-11-20). The sender reads the current set and posts the union, so labels the integration does not map are kept. Protected, with live evidence.
- **No decision, open item, risk or guide note covers non-core (unmapped) CR keys.** Every existing statement is about the core keys.

**Verdict: the risk is real but unproven.** The evidence is good for one core key and missing for every other key. Because the PUT went out as a full replace for that one key, the other keys are a credible risk, and phase one should not go live on an assumption either way.

## 2. Recommendation

1. **Today, no write:** run the read-only check UW-0 (section 6). For each unsent key on CR records that already took update PUTs, it reports whether the key is filled or blank. A filled key survived at least one PUT that did not send it.
2. **In the retest, at almost no extra cost:** add rows UW-1 (employee) and UW-2 (client) to the existing S0 hand-adds and the S4 update push (section 6).
3. **If any unsent key is cleared:** build a carry-back from the read the update already makes (option 1, section 7), and stop sending the core PUT when no core key changed (option 2). Re-run UW-1 and UW-2 before phase one goes live.
4. **If every key is kept:** record the result in BUILD-PLAN section 4 and close the risk. Write nothing in code.
5. **Whatever the outcome:** have the client update send back `contact.externalSystemId` from the B21 read when the read holds one. Today it is left out unless a lookup found the client (section 3).

---

## 3. Findings by question

### Q1. Evidence that the employee PUT clears omitted fields

**The live test (confirmed, real CentralReach behaviour).** BUILD-PLAN.md:271-280, "Blank core field test (row 3.13), CR employee `5338681`":

> "Four `PUT /contacts/employee/5338681`; only `addressLine2` was changed, every other field was sent back as read, and the record ended as it started." (L271)
> "| 1 | PUT with the `addressLine2` key left out | 200. **The stored value was cleared.**" (L275)
> "What this settles: the employee update replaces the core record. A core field that is left out is cleared exactly like one that is sent blank" (L280)
> "Not tested: a required field such as the date of birth, and the client update" (L280)

Limits of this evidence:
- **One key (`addressLine2`), one record, one day.** The plan itself says only that it "replaces the **core** record" (L280).
- **The request body is not recorded.** "Every other field was sent back as read" (L271) does not say whether the body held only the 12 core keys or every key from the read. The same section says the read "returns all twelve core fields under `contact` with the names the update uses" (L280). That suggests the body was built from the core keys, but this is an inference. The script is not in the repo: no file outside the docs and the old lane worktrees mentions `5338681`.
- So the test does **not** show what happens to `npiNumber`, `payCodes`, `ssn` and the other non-core keys when they are left out.

**Other records of the same test:** WAVE-1-LOG.md:166-167 ("the blank-field test on CR employee `5338681` (4 writes, restored)") and BUILD-PLAN.md:1070 (O-32). Assumption A-4 is marked "Disproved for employees on 11/20: a blank and a left-out core field are both cleared" (BUILD-PLAN.md:1110).

**The unit tests are code tests, not CR evidence.** `src/tests/smoke/stage3BlankCoreFields.test.mjs:1-9` uses a fake CR: "The fake CentralReach employee holds stored values for the core fields (seedStoredEmployee). No live call." The tests prove that our code puts the held core values in the PUT body. They prove nothing about what CR does with a key that is missing. `stage3BlankCoreFieldsClient.test.mjs` is the same kind of test for the client.

**Where the claim spread from:** WAVE-1-LOG.md:31 (L-R2: "Leaving `ExternalSystemId` out of every client update may wipe it, since the employee PUT clears a left-out field"), BUILD-PACKAGE-DRAFT-2026-11-23.md:484 and :521 ("On employees a left-out field **is** cleared"), and OPEN-ITEMS.md:253. Each of these generalises from the `addressLine2` result.

**Round 1 (live, 2026-11-23) neither confirms nor refutes it.** Employee update PUTs did run after creates: round-1-log.md:98, :112 (BCBA 5384531), :485, :517 (BCBA 5385360). `check-cr-record.mjs` checks only mapped fields, so nothing about unsent keys was observed. round-1-log.md:504 says Zeke made 5385357 and 5385360 inactive "after R-WD", and an update PUT went to 5385360 at 20:05 (L517). The log does not say which came first, so `isActive` cannot be judged from it.

### Q2. Employee PUT body (BCBA and BT/RBT), working tree

How the request is built:
- **Mapper:** BT/RBT `buildEmployeePayload.mjs:218-232` and BCBA `:299-313`. Each returns the same 12 keys.
- **Create:** `centralReachClient.mjs:625-662`. It sends the 12 keys plus `ContactForm`. It deletes `employeeId`, `contactId` and `employeeType` from the body (L628-630). `employeeType` (the HubSpot type, `bt_rbt`/`bcba`) is used only to pick the contact form (L627). A blank `dateOfBirth` gets the placeholder (L635-638).
- **Update:** `employeeSyncWorkflow.mjs:1065-1090` reads the employee (`GET /contacts/employee/{id}`). It refuses to update when the read has no `contact` object (L1066-1081). It then applies `preserveIdentifiers` (`centralReachClient.mjs:571-604`) and `keepUnwrittenCoreFields` (`mappedState.mjs:312-333`). `updateEmployeeByContactId` sends the result as the whole PUT body (`centralReachClient.mjs:606-617`).
- **Read before write:** yes, but **only for the 12 `EMPLOYEE_CORE_FIELDS`** (`mappedState.mjs:297-310`). The loop at L316 runs only over that list. No non-core key from the read is carried into the body. That is the employee counterpart of B21, but limited to core keys.

The table covers the 28 keys of the 2026-11-24 read of `5338681`, plus `hireDate`. `hireDate` is in the EMP §1 read (DECISIONS-EVIDENCE-EMPLOYEES-2026-11-23.md:83) but not in the 2026-11-24 list.

| Key | Sent on create | Sent on update | Source | At risk if the PUT replaces the whole record |
|---|---|---|---|---|
| contactId | no (deleted, L629) | no (in the URL only) | CR-assigned | Unlikely; an identity key, probably not writable (unknown) |
| isActive | no | no | CR (staff set it on the CR screen) | **Unknown.** An update could flip it if the PUT defaults it |
| type | no | no | CR | Unknown; probably not writable |
| externalSystemId | yes: `workday_id`, else the HubSpot record ID | yes: the value CR holds (from the read); `workday_id` only when CR holds none; left out when neither (wf:1088-1090) | HubSpot, then held from the CR read | Protected |
| title | no | no | — | **Yes** |
| firstName | yes | yes | `first_name` (both types); blank: held from the read, or `null` if the integration wrote it before | Protected (row 3.13) |
| middleInitial | no | no | — | **Yes** |
| lastName | yes | yes | `last_name`; same blank rule | Protected |
| chosenName | no | no | — | **Yes** |
| primaryEmail | yes | yes | BT/RBT `email`, BCBA `email`; a blank always sends CR's email back (client.mjs:591-595) | Protected |
| addressLine1 | yes | yes | BT/RBT `street_home`, BCBA `address`; blank rule as above | Protected |
| addressLine2 | yes | yes | BT/RBT `home_apt`, BCBA `apartment__home` | Protected (the key tested live) |
| city | yes | yes | BT/RBT `location_city`, BCBA `city_home` | Protected |
| stateProvince | yes | yes | `state_home` | Protected |
| zipPostalCode | yes | yes | `postal_code_home` | Protected |
| phoneCell | yes | yes | `employee_phone` | Protected |
| dateOfBirth | yes (`date_of_birth`, else the placeholder) | yes: HubSpot, else the held date rebuilt `YYYY-MM-DDT00:00:00.000Z`; no update when the read lacks it (mappedState:326-327, 340-353) | HubSpot, then held | Protected |
| languages | no | no | — | **Yes** (a list; its PUT shape is unknown) |
| gender | yes | yes | BT/RBT `gender`, BCBA `gender_new` | Protected |
| credentials | no | no | — | **Yes** (billing) |
| ssn | no | no | — | **Yes** (payroll; high impact) |
| npiNumber | no | no | — | **Yes** (BCBA billing) |
| jobTitle | no | no | — | **Yes** |
| company | no | no | — | **Yes** |
| employeeType | no (deleted, L630) | no | CR | **Yes** (unknown whether writable) |
| payTypes | no | no | — | **Yes** (payroll) |
| payCodes | no | no | — | **Yes** (payroll) |
| primaryOfficeLocation | no | no | — | **Yes** |
| hireDate (EMP §1) | no | no | — | **Yes** |

"Protected" means the PUT always carries a value: HubSpot's, or CR's own from the read. The one exception is a deliberate clear (written before, now blank). A filled HubSpot value still overwrites an edit staff made in CR. That is the intended one-way sync, but note that it happens on *any* update run, not only when that field changed (R-4, BUILD-PLAN.md:1142).

### Q3. Client PUT

**Body:** `buildClientPayload.mjs:40-59` builds `ContactForm`, `ExternalSystemId`, `FirstName`, `LastName`, `DateOfBirth` (only when filled, L45), `Gender`, `PrimaryEmail`, `PhoneCell`, `AddressLine1`, `AddressLine2`, `City`, `StateProvince`, `ZipPostalCode`, `GuardianFirstName` and `GuardianLastName`. The worker notes (`dateOfBirthStatus`, `unreadableValueProperties`, `warnings`) are deleted before sending (`clientSyncWorkflow.mjs:169-176`).

**On update** (`centralReachClient.mjs:400-420`):
- `ContactForm` is always deleted.
- `ExternalSystemId` is deleted unless CR is known to hold it (L402-409). For a phase-one Case the linked-Case lookup by the Case ID finds the client, so it is sent (`clientSyncWorkflow.mjs:689-699, 743`).
- Then the client is read (`getClientByContactId`, L474-503) and `keepHeldClientCoreFields` (`mappedState.mjs:385-402`) puts CR's held value into each of the 11 core keys that is blank in HubSpot. A read that lacks any of the 11 keys is `CR_CLIENT_READ_FAILED`, and no PUT is sent (L506-520).

**What B21 protects:** the 11 `CLIENT_CORE_FIELDS` (`mappedState.mjs:367-379`): `Gender`, `DateOfBirth`, `PrimaryEmail`, `PhoneCell`, `AddressLine1`, `AddressLine2`, `City`, `StateProvince`, `ZipPostalCode`, `GuardianFirstName` and `GuardianLastName`. `FirstName` and `LastName` are required and are always sent from HubSpot.

**Client keys left unprotected.** The list comes from the test-client read (BUILD-PACKAGE-DRAFT-2026-11-23.md:510) and the production read (:516):

| Key | Sent? | At risk if the PUT replaces the whole record |
|---|---|---|
| phoneHome | never (decision 36, BUILD-PLAN.md:175: "left out of the client payload on a create and on an update ... whether a client update clears a core field that is left out is untested (part of O-35)") | **Yes** |
| title, middleInitial, chosenName | never | **Yes** |
| guarantorFirstName, guarantorLastName | never | **Yes** |
| isActive, type | never | Unknown (probably not writable) |
| externalSystemId | only when a lookup in the same run found the client | **Edge case.** A person can change the ID on the CR profile (guide-extract-2026-11-24.md:1414, :1740). After that, the Case-ID lookup no longer finds the client, so the update leaves the key out. |
| clientDiagnosisCodes, additionalContacts, primaryPayors, secondaryPayors (lists) | never | Unknown; lists may be separate resources |

**The B21 production read** (SANDBOX-TESTING-HANDOFF.md:84; BUILD-PACKAGE-DRAFT-2026-11-23.md:514-520):
- Zeke ran it himself on 2026-11-24 against production clients `4438604` and `4717582`: 3 CR calls, HTTP 200.
- "All 11 core keys present on both; a blank core field comes back `""` with the key present (`addressLine2` on the second); no `null`; `contact.externalSystemId` absent on both (present on the test client, which holds one)."
- Result: the rule that a missing key means a failed read stands, and B21 is buildable. Round R1-U2 must still show an unchanged round trip (R-38).

**A stale comment:** `centralReachClient.mjs:364-366` says "the client read does not show what CentralReach holds". The reads of 2026-11-24 show `contact.externalSystemId` is returned when CR holds an ID (BUILD-PACKAGE-DRAFT-2026-11-23.md:513, :1252). So the B21 read could supply the held ID for every update.

### Q4. Metadata (custom fields) and labels

**Metadata is per field, not replace-all.**
- *Code:* each field is its own call. A value is a `PUT /contacts/{id}/metadata/{fieldId}` (`centralReachClient.mjs:1001-1040`). A clear is a `DELETE` of that field, sent only for fields the integration wrote before (L968-987, L1131-1140). Only changed fields are sent (`clientSyncWorkflow.mjs:827-836`, "Row 3.8: only the changed fields are sent"; the same in `employeeSyncWorkflow.mjs:1213-1229`). A field the integration does not map is never addressed.
- *API docs:* "Update one metadata field | PUT | `/contacts/{ContactId}/metadata/{FieldId}`" (docs/centralreach-metadata-and-labels-discovery.md:64). The spec also lists a multi-field `PATCH contacts/{ContactId}/metadata` and no documented DELETE (ARCHITECTURE-REVIEW.md:273).
- *Live evidence that other fields are not wiped:* the round 1 Case update of 2026-11-23 16:30:49 sent only the two changed fields (`changedFieldNames` exactly `metadata.138092`, `metadata.144602`). The CR re-check afterwards was PASS 55, FAIL 0, so the metadata written at create was still there (round-1-log.md:133-140).
- *Not tested:* a metadata field set by hand in CR and not mapped. The code never touches one, so the risk is nil by design.

**Labels: the POST replaces the whole set, and the integration protects against it.**
- *Live test 2026-11-20:* "the POST replaces the whole set, so a label is removed by leaving it out ... an empty list is the dangerous body" (BUILD-PLAN.md:236).
- *The sender:* "what CentralReach holds, minus managed, plus required", and an empty set is never posted (`centralReachClient.mjs:756-764, 1083-1088`; BR19, BUILD-PLAN.md:600: "labels the integration does not map are kept").
- *Live evidence:* the "Admin" label set by the contact form was "kept by the label POST" (round-1-log.md:108-110). Row R1F-5 still has to show a label added by hand (School) being kept.

### Q5. Existing decisions, open items and guide notes

Search terms: clear, wipe, omitted, left out, full replace, replaces, null, blank. Ordered by date; the latest statement comes last.

| Date | Source | Statement | Covers non-core keys? |
|---|---|---|---|
| 11/20 | BUILD-PLAN.md:271-280 | The employee update "replaces the core record"; a left-out core field is cleared | No: core keys only |
| 11/20 | BUILD-PLAN.md:175 (decision 36) | `PhoneHome` is left out; whether a client update clears it "is untested (part of O-35)" | Names one unsent client key; still open |
| 11/20 | WAVE-1-LOG.md:31 (L-R2) | Client `ExternalSystemId` sent only when held, because a left-out field may be wiped | One key |
| 11/20 | BUILD-PLAN.md:815 (row 3.13) | The employee update sends back the held values for the 12 core fields | Core only |
| 11/24 | BUILD-PLAN.md:196 (decision 57, B21) | The client update never clears any of the 11 core fields | Core only |
| 11/24 | BUILD-PLAN.md:428 (rule 5.8) | "Whether the client PUT clears a left-out field is still not known, so all 11 core keys are in the body" | Core only |
| 11/24 | BUILD-PLAN.md:1086 (O-35) | "Closed for the build ... Whether the client PUT clears a left-out field is still not known; the build no longer relies on it" | Says the build no longer relies on it, which is true only for core keys |
| 11/24 | BUILD-PLAN.md:1110 (A-4), :1142 (R-4), :1156 (R-38) | A blank or left-out employee core field is cleared; the core payload overwrites existing records; the sent-back values are not yet proven | Core only |
| 11/24 | BUILD-PACKAGE-DRAFT-2026-11-23.md:521, :994 | "On employees a left-out field **is** cleared"; "the client PUT is assumed to behave like the employee PUT" | Generalised wording, never tested beyond the core |

**Guide** (guide-extract-2026-11-24.md): no note on the PUT's replace behaviour, and none on unmapped CR fields. The only related dated notes are about labels (L383, L605-609, all superseded by the label test) and External System ID changes (L1414, L1740). L242 records that staff replace the temporary External System ID in CR by hand. That case is covered for employees, because the update sends back the ID CR holds.

**Conclusion:** no decision, open item or risk addresses CR keys the integration never sends. This is a gap: suggested new open item and risk (O-63 / R-39), for the orchestrator to add.

### Q6. Do the sandbox rows already prove it?

Searched: `sandbox-test-matrix.md`, `sandbox-coverage-ledger-2026-11-24.md` and `sandbox-rounds/retest-run-sheet-2026-11-24.md`.

**No row covers it.**
- R1-U2 and U2-1 to U2-6 (matrix L311-329, L559-564; run sheet S8 L104-109) blank **mapped** properties only. B21 sends all 11 core keys, so U2-1 shows the held values coming back unchanged, not what happens to a key that is left out.
- The CR-screen hand-adds in S0 (run sheet L16; matrix R1F-5, L418) are labels only.
- `check-cr-record.mjs` checks mapped fields and prints only key *names* (`--keys`) for anything else (scripts/sandbox/check-cr-record.mjs:29-31).

Draft rows follow. They use the run sheet's column format and are **not added** to any file.

| ID | Row | Entity | Step | Trigger | Check | Phase |
|---|---|---|---|---|---|---|
| UW-0 | **Read-only precheck, no write.** GET CR employees `5384531` (R1 BCBA, updated 11/23 16:13 and 16:18), `5385360` (R4 BCBA, created by the Admin form, then 2 update PUTs on 11/23) and `5384530` (R1 BT/RBT 1), and client `5384589` (R1, updated 11/23 16:30). Print **filled / blank only**, never values, for each key the integration does not send. Employee: `title`, `middleInitial`, `chosenName`, `languages`, `credentials`, `ssn`, `npiNumber`, `jobTitle`, `company`, `employeeType`, `payTypes`, `payCodes`, `primaryOfficeLocation`, `hireDate`, `isActive`. Client: `title`, `middleInitial`, `chosenName`, `phoneHome`, `guarantorFirstName`, `guarantorLastName`, `isActive`, list lengths. | Employee, Case | before S0 | none (read) | A **filled** key survived at least one PUT that left it out, so the PUT keeps that key (inferred). A **blank** key proves nothing. CR calls: 1 token + 4 GETs = **5**, no writes | P1 |
| UW-1 | **Employee update keeps CR keys the integration does not send** (BR16; R-4). *Precondition (S0, Zeke on the CR screen, no API call):* on R1 BT/RBT 1 (CR `5384530`, HS `67037268070`), set Middle Initial `Z`, Job Title `Azure Test Job Title` and Chosen Name `AzT Chosen`. Optional, if the screen allows: Primary Office Location set to any office. Then a baseline GET shows all of them filled. *Action:* the S4 update push (R1-U1 BT/RBT 1 lines) already changes mapped values. If S4 changes only core keys, add one metadata-only edit (`apartment__work`, T6) to show that any update run sends the PUT. | BT/RBT | S0 (set), S4 (push) | webhook or poller | *Log:* `operation: 'update'`, `crCalls` include `update 200`. *GET after the push:* **(A) all set keys keep their values:** the employee PUT is partial for non-core keys; close the risk and record it in BUILD-PLAN section 4. **(B) any set key blank or changed:** the PUT replaces the whole record; phase one is blocked until the carry-back (section 7, option 1) is built and UW-1 re-runs. Zeke then puts the values back by hand. CR calls: integration 1 token + GET employee + PUT + label GET (+ 1 metadata PUT if added) = **4-5**; checks 2 × about 5 = **about 10**; about **15** in all, about 5 more than S4 already makes | P1 |
| UW-2 | **Client update keeps CR keys the integration does not send** (BR16; O-35 remainder; decision 36 `PhoneHome`). *Precondition (S0, with the existing hand-adds on client `5384589`, CR screen):* set Middle Initial `Z`, Home Phone `2125550198` and Guarantor First Name `Azure Test Guarantor`. Baseline GET shows them filled. *Action:* the S4 R1 Case update push (any mapped change). | Case | S0 (set), S4 (push) | webhook | *Log:* `operation: 'update'`; `crCalls` include the Case-ID lookup GET, the B21 client GET and `update 200`. *GET after the push:* **(A) all three kept:** the client PUT keeps unsent keys; close O-35's remaining half and R-39. **(B) any blank:** the PUT replaces the whole record; build the carry-back for clients (it extends `keepHeldClientCoreFields`), and the ExternalSystemId send-back (section 7) becomes required; re-run. CR calls: integration 1 token + 2 GETs + PUT + label GET + metadata PUTs = **about 5-6**; checks about **10**; about 5 more than S4 already makes | P1 |

Notes for the rows:
- The set values are test markers, not PHI. `check-cr-record.mjs` would need a small read-only option to print these keys for a test record. Until then, Zeke reads them on the CR screen at no API cost.
- Do not use `ssn`, `npiNumber` or `payCodes` for the hand-set values. A fake SSN or NPI in production CR is a poor test value. UW-0 gives evidence on those keys without any write.
- If the hand edit changes the CR record's state in a way the next run reads, check that the S4 expectations still hold. The keys above are not read by the integration, so they should not change any S4 result.

### Q7. Assessment

**How likely it is.** The PUT behaved as a full replace for one core key. That is the typical behaviour of a "bind the whole request body" update API, so the same for the other keys is **likely but unproven**. A non-core key may also not be in the PUT's request model at all. In that case CR ignores it and keeps the stored value. Nothing in the repo settles this. The CR API docs that would show the PUT request model are in the sibling folder `../central_reach_test_integration/central_reach_docs/` (ARCHITECTURE-REVIEW.md:266). They were not read here, because the brief limited the work to this repo. Reading them offline is the next free step.

**Phase-one exposure, if the PUT replaces the whole record:**
- *Records:* every CR employee and client the integration creates and then updates. Existing records are out of phase one (the decision recorded at BUILD-PACKAGE-DRAFT-2026-11-23.md:951).
- *How often:* close to every record. Any run that is not a no-op sends the full core PUT, even when only metadata, a label source or the identity checklist changed: `clientSyncWorkflow.mjs:740` follows every changed run, and round 1 shows `update 200` on runs that changed only the checklist (round-1-log.md:515-517) or labels. Updates are frequent: the checklist tick, the Workday ID, `active_cases_count`, staffing names, and the daily status flip.
- *Employee keys at risk:* `ssn`, `npiNumber`, `credentials`, `payTypes`, `payCodes`, `primaryOfficeLocation`, `hireDate`, `jobTitle`, `middleInitial`, `chosenName`, `title`, `languages`, `company`, `employeeType`, and perhaps `isActive`. These are the HR and billing fields staff are most likely to complete in CR after the integration creates the employee. Losing an NPI or pay code would affect billing and payroll.
- *Client keys at risk:* `phoneHome`, `guarantorFirstName`, `guarantorLastName`, `middleInitial`, `chosenName`, `title`, perhaps `isActive`, and `externalSystemId` in the hand-change edge case.
- *Create-then-update window:* anything the contact form sets at create beyond the 12 keys (for example `employeeType` or the office) would be lost on the first update. A label read-back that is too early already causes an update within minutes of a create (round-1-log.md:97-99, :112).

**Mitigation options:**

| # | Option | Effect | Cost and risk |
|---|---|---|---|
| 1 | **Carry back unsent keys from the read** (extend row 3.13 and B21). Both updates already read the record in the same run. Copy an explicit list of the read's scalar keys into the PUT body, then lay the mapped values over them. Start the list from what UW-0 and UW-1 show is cleared. | Removes the wipe for listed keys | 0 extra CR calls. The read uses camelCase keys, while the client PUT uses PascalCase, so do not mix both spellings in one body. Lists and objects (`payTypes`, `credentials`, `primaryOfficeLocation`, client payors) may need a different PUT shape and their own test. Sending `ssn` back puts it in our request body; it must never reach a log (`safeLog` logs names only today). Read-only keys (`contactId`, `type`) may be refused. Use a list of known keys, never "copy everything". |
| 2 | **Send no core PUT when no core key changed.** Metadata, label and identity-only runs skip the PUT. | Fewer exposures, and saves 1 CR call per such run | Does not fix an update that changes a core key. The row 3.7 and identity logic need care. |
| 3 | **Ask CentralReach (Danny or CR support)** whether the profile PUT is partial, and whether a PATCH exists for core profile fields. The spec shows PATCH only for metadata. | Could make options 1 and 2 unnecessary | Answer time unknown |
| 4 | **Client:** send back `contact.externalSystemId` from the B21 read when present | Closes the edge case in Q3 | Tiny; sends back CR's own value, the same pattern as `preserveIdentifiers` for employees |

**Recommendation:** UW-0 first (no write), then UW-1 and UW-2 inside S0/S4. If anything is wiped, build option 1 (list-based) with option 2, then re-run before phase one. Option 4 either way. Do not build option 1 before the test: it adds a body shape CR has never accepted (R-38 already shows the round trip of sent-back values needs its own proof).

**What a live call is still needed to settle:**
1. Whether the employee PUT clears a non-core key it leaves out, for each key type: text, list, object, flag.
2. Whether the client PUT clears any key it leaves out, core or not. O-35's original question is still unanswered.
3. Which keys the PUT accepts at all (`isActive`, `type`, `employeeType`, lists) and in what shape.
4. Whether the contact form sets non-core values at create that the first update would erase.
5. Whether CR has a partial-update route for profile fields.
6. What the 2026-11-20 test body contained. It is not recorded, so the test cannot be re-read as evidence for non-core keys.

## 4. Validation steps

- UW-0: every key prints `filled` or `blank` with no values; 5 CR calls, all GET.
- UW-1 and UW-2: a baseline GET shows the hand-set values; the Log shows `update 200` for the push; a GET after the push shows each key under outcome A or B; record the result in BUILD-PLAN section 4 next to the 2026-11-20 test.
- If option 1 is built: unit tests for each listed key (held value sent back; a mapped value wins), then UW-1 and UW-2 again, plus the R-38 round trip.

## 5. Files read

`BUILD-PLAN.md` (L167, 175, 196, 222, 236, 244-280, 361-390, 422-429, 600, 815, 964, 1045, 1070, 1086, 1110, 1128, 1142, 1156); `WAVE-1-LOG.md` (L31, 166-167); `BUILD-PACKAGE-DRAFT-2026-11-23.md` (L187-189, 462-521, 951, 974, 994, 1070, 1252); `REMAINING-GAPS-2026-11-23.md` (L69, 214, 318); `OPEN-ITEMS.md` (L24, 43, 243, 253); `SANDBOX-TESTING-HANDOFF.md` (L84, 93); `DECISIONS-EVIDENCE-EMPLOYEES-2026-11-23.md` (L83); `ARCHITECTURE-REVIEW.md` (L266-274, 540); `sandbox-rounds/round-1-log.md` (L90-140, 440-525); `sandbox-test-matrix.md` (L27, 311-329, 418, 559-564); `sandbox-coverage-ledger-2026-11-24.md` (search); `sandbox-rounds/retest-run-sheet-2026-11-24.md` (L16, 52, 77, 104-118); `guide-extract-2026-11-24.md` (search; L242, 280, 1414, 1740); `docs/centralreach-metadata-and-labels-discovery.md` (L45, 64); `src/lib/centralReachClient.mjs`; `src/lib/mappedState.mjs` (L285-432); `src/mappings/employees/buildEmployeePayload.mjs`; `src/mappings/client/buildClientPayload.mjs`; `src/workflows/employeeSyncWorkflow.mjs` (L1059-1230); `src/workflows/clientSyncWorkflow.mjs` (L169-176, 685-745, 820-850); `src/tests/smoke/stage3BlankCoreFields.test.mjs` (L1-92); `scripts/sandbox/check-cr-record.mjs` (L1-40).
