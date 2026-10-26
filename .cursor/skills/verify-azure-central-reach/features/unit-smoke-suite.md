# Unit smoke suite

The unit smoke suite is the offline proof gate: `npm test` runs Node’s test runner over `src/tests/smoke/*.test.mjs` without starting Functions or calling live HubSpot/CentralReach.

## Sub-features

- `unit-all-pass` exits 0 with zero failures.
- `unit-intake-rules` covers intake poller workflow and employee rules tests when those files are present.
- `unit-not-http` does not replace HTTP feature proofs in this map.

## How to get to it (user POV)

- From the repo root, run `npm test` (README sections A and Client Sync Testing Stages step 1).

## Driving it with verify-acr

Preconditions:

- `npm install` has been run (`node_modules` present).
- No Functions host required.

- **Run suite.** From repo root: `npm test`. Exit code `0`. Output ends with `# fail 0` (or equivalent pass summary).
- **Capture proof.** Redirect stdout/stderr to `.cursor/skills/verify-azure-central-reach/artifacts/<run-id>/npm-test.txt` (create the run directory if launch was not used).
- **Scope.** Treat this as proof of unit contracts only. For connectivity or intake HTTP journeys, drive those feature files separately.

## Gotchas

- Passing unit tests with placeholder env does not prove Azure deployment readiness (README section C).
- After Phase 1A trigger changes, expect intake-related tests to be updated; a green suite that never asserts `enter_in_central_reach` does not prove that gate.
