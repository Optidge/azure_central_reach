# Sandbox full-suite review

Task. Find where the sandbox context-create script lives (cases, employees), whether Google Drive "can build" / missing mappings are in-repo, and what HubSpot CLI needs if the script is absent.

Done when. Cited answer exists for script location, "can build" source, missing-mapping inventory, and CLI fallback field coverage.

Current status. Investigation complete. throughput checkpoint: n/a, read-only investigation.

Last step. Wrote the how-shaped answer in chat. Script is archive-only. "Can build" is Drive shading, not a repo checklist.

Next action. Operator chooses HubSpot CLI suite vs porting `create-sandbox-e2e-records.mjs`.

## Key facts

- Goal. Full-phase sandbox testing of Case, BT/RBT, and BCBA (fields, stages, labels).
- Create script. Not in current repo. Lives at `azure_central_reach_backup_2026-10-30/scripts/create-sandbox-e2e-records.mjs`. Recovery review says bring later after adapting. Spec counts in that script and archive HANDOFF. 10 Case, 20 BT/RBT, 15 BCBA. Yes is a later update.
- Related archive scripts. `create-sandbox-hubspot-properties.mjs`, `probe-employee-create-error.mjs`. Also archive how-tos `docs/sandbox-e2e-resume.md`, `docs/sanbodx-e2e-how-to-complete.md`, `docs/ws2-coverage-matrix.md`, `docs/HANDOFF.md`, `docs/CHECKPOINT.md`.
- "Can build". No literal `can build` string in this repo. Meaning lives in Google Drive How to read this. Unshaded = ready to build. Amber = need decision. Red = field/option missing. Pointer `docs/SOURCE-OF-TRUTH.md`. Closest in-repo readiness note is four narrow sandbox checks on this branch, not a full-suite go.
- Missing mappings inventory. Partial only. Drive is authority. Repo as-built is `docs/hubspot-centralreach-field-mappings-current-state.md`. Open list is `docs/workstreams/integration-state-chart/STATE.md` Remaining open items. No complete Drive-versus-code missing-row sheet.
- Baseline triple (do not modify). Deal `66712883229`, BT/RBT `64796590207`, BCBA `64797567870`.
- Archive create script fills properties and Yes. It does not create associations. Label tests are a separate step.
- CLI path already decided in chart STATE. User creates/updates records with HubSpot CLI account `UnitedCare_Test_Integration` on portal `50850427`. Do not use MCP portal `246184070`.
- Sandbox object ids. Case deals `0-3`. BCBA `2-55656302`. BT/RBT `2-55656309` (`docs/Sandbox props & labels_summary.md`).

## Open

- Whether to port `create-sandbox-e2e-records.mjs` into this repo vs keep HubSpot CLI-only for the suite.
- Closing Drive amber/red rows still listed under Waiting on Zeke / Sara / United Care in the state chart.
- Association and label coverage for the suite, since the seed script does not set those.
