# Judge: field-mapping cautions

This file judges only the field-mapping cautions from the sandbox end-to-end test. Each verdict answers one question: did the sandbox test need this caution to pass, or did it only slow the test down?

Sources read: the clean repo `src/mappings` and `src/constants/centralReach.mjs`, the archive working-tree payload builders in `azure_central_reach_backup_2026-10-30/src/mappings`, and the archive `docs/HANDOFF.md` plus `docs/sandbox-e2e-run-status.md`.

## Date formats

Caution: the client builder sends `DateOfBirth` as UTC midnight (`YYYY-MM-DDT00:00:00.000Z`) and the employee builder sends `YYYY-MM-DD`, and nobody has proven CentralReach accepts either.

Verdict: unknown.

Why: every sandbox post sent a null date because of the parser bug, so CentralReach has never received a real date in either format from this code (`azure_central_reach_backup_2026-10-30/docs/sandbox-e2e-run-status.md`, "Re-trigger"). The two formats live in `src/mappings/client/buildClientPayload.mjs` (`toIsoMidnight`) and `src/mappings/employees/buildEmployeePayload.mjs` (`normalizeDate`), and the first published run with the parser fix will settle this.

Feedback:

## Hardcoded label ids

Caution: label and metadata ids are hardcoded with no sandbox versus production switch, and some ids in code disagree with the docs.

Verdict: not needed.

Why: there is no sandbox CentralReach account, so every run writes to production CentralReach and a switch would have nothing to switch between (`azure_central_reach_backup_2026-10-30/docs/HANDOFF.md`). Labels attach after the contact exists, the label step was never run, and the employee failure was a `DateOfBirth` HTTP 400, so the id drift between `src/constants/centralReach.mjs` (NY employee `1107685`, BCBA `1052629`) and the archive constants (`1132655`, `1130668`) did not block the test and belongs to the later label step.

Feedback:

## Archive-only guardian selection

Caution: the archive picks the guardian from the one associated contact with association type id `3` and `contact_category` of `Parent/Guardian`, and the clean repo only reads the Case fields.

Verdict: not needed.

Why: when there is not exactly one qualifying contact, the archive falls back to `guardian_first_name` and `guardian_last_name` on the Case, which is the same thing the clean repo does (`azure_central_reach_backup_2026-10-30/src/mappings/client/buildClientPayload.mjs`, `selectGuardianSource`). The sandbox test records filled the Case guardian fields and associated no contacts, and all 10 Case creates passed, so this behavior never decided the outcome.

Feedback:

## Archive-only address preference

Caution: the archive prefers `full_home_address`, then `service_address__other`, and reads state from `stateregion`, while the clean repo starts from the long "other location" property and `street_address`.

Verdict: not needed.

Why: client create does not fail on which address field is chosen, and all 10 Case creates passed with the archive mapping (`azure_central_reach_backup_2026-10-30/src/mappings/client/buildClientPayload.mjs`, `docs/sandbox-e2e-run-status.md`). Which order is correct is a field-map decision for production, not a gate for the sandbox run, though the property name differs by one letter between the clean repo (`..._other_addres`) and the archive (`..._other_address`) and only one of them can be real.

Feedback:

## Uncommitted date parser

Caution: the archive has an uncommitted, unpublished change that reads an all-digit date string as epoch milliseconds before building the date.

Verdict: needed.

Why: the sandbox records store `date_of_birth` as a digit string of epoch milliseconds, `new Date` on that string returns an invalid date, the mapper sends null, and CentralReach rejects every employee create with HTTP 400 on `DateOfBirth` (`azure_central_reach_backup_2026-10-30/docs/sandbox-e2e-run-status.md`, "Re-trigger" and "Date parser"). The clean repo `src/mappings/employees/buildEmployeePayload.mjs` and `src/mappings/client/buildClientPayload.mjs` still lack the digit branch, so employee creates stay blocked until this change is committed and published.

Feedback:
