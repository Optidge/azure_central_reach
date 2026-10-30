# WS.1 schema diff — loop log

Untracked. Do not commit.

**Status:** verified (definition diff only). The HubSpot and CentralReach integration is not verified by this unit.

## Goal

Write a read-only schema diff of production HubSpot portal 50317927 against sandbox portal 50850427, plus CentralReach metadata field ids and org label ids against `src/constants/centralReach.mjs`. Definitions only. No record values. No change under `src/`.

## Files this unit may write

1. `docs/ws1-schema-diff.md` (create)
2. `docs/Sandbox props & labels_summary.md` (pointer line only)
3. `scripts/check-ws1-diff.mjs` (create)
4. `docs/workstreams/ws1-diff/task.md` (this log, untracked)

Start state: branch `align-sandbox-hubspot-field-sync`, HEAD `c18cf5f`.

## Pass 1 — HubSpot property and association reads

Scratch output under `/tmp/ws1/hs/`, outside the repo. Definitions only.

```
$ hs api /crm/v3/properties/0-3 -a united-care-aba --json > prod_0-3.json
exit=1, 0 bytes, stderr "✖ ERROR"   (sandboxed shell had no network)
$ (same, with network allowed)
exit=0, 1409940 bytes
```

Then, all exit 0:

```
prod_bcba (/crm/v3/properties/2-48354212 -a united-care-aba)            788870 bytes
prod_btrbt (/crm/v3/properties/2-48354559 -a united-care-aba)           660950 bytes
sbx_0-3 (/crm/v3/properties/0-3 -a UnitedCare_Test_Integration)         528318 bytes
sbx_bcba (/crm/v3/properties/2-55656302 -a UnitedCare_Test_Integration)  95347 bytes
sbx_btrbt (/crm/v3/properties/2-55656309 -a UnitedCare_Test_Integration) 103392 bytes
v4 association labels, both directions, Case<->BCBA and Case<->BT/RBT, both portals: 8 calls, exit 0
/crm/v3/schemas on both portals: exit 0
/crm/v3/properties/0-1 on both portals: exit 0
```

No call returned 403.

Schemas confirmed: production BCBA `2-48354212`, BT/RBT `2-48354559`. Sandbox BCBA `2-55656302`, BT/RBT `2-55656309`.

Finding: production `phi_gender` was missing from the default list. The default properties list omits sensitive properties.

## Pass 2 — sensitive and archived property lists

First attempt looped over a space-separated string in zsh, which does not word-split. Every call got one malformed object id. Rerun with explicit loop lists:

```
prod_0-3_sensitive count=62          prod_0-3_highly_sensitive count=0
prod_0-1_sensitive count=1           prod_0-1_highly_sensitive count=0
prod_2-48354212_sensitive count=0    prod_2-48354212_highly_sensitive count=3
prod_2-48354559_sensitive count=2    prod_2-48354559_highly_sensitive count=0
sbx_* sensitive and highly_sensitive: all count=0
prod_0-3_archived count=90   prod_0-1_archived count=0
prod_2-48354212_archived count=4   prod_2-48354559_archived count=4
sbx_*_archived: all count=0
```

All exit 0.

## Pass 3 — Drive map names

Read the Optidge V2 Google Doc through the Google Drive tool (file id `1TnUrUUUWuTQv9hLOaZdmM9YD9va2eKXIoAtw_puiYyk`). Transcribed internal names from sections 3, 5, 6, 7, 8, 9, and 11 into the generator. Section 4 names association type ids only. No Grad Permit BCBA internal name was invented.

## Pass 4 — CentralReach discovery

From `/Users/zeke/Desktop/projects/client_projects/Optidge/central_reach_test_integration`:

```
$ node get_all_labels.js orglabels 20261028 ws1_org_labels_20261028
Response written to .../output_files/ws1_org_labels_20261028.json
Organization contact labels fetched successfully.
exit=0

$ node api_calls.js metadata 5324526
CR_CLIENT_SECRET: [REDACTED]
CR_API_KEY: [REDACTED]
Response written to .../output_files/usemetadata_5324526.json
exit=0
$ node api_calls.js metadata 5324527     (same output shape, exit=0)
$ node api_calls.js metadata 5324528     (same output shape, exit=0)
```

`api_calls.js` prints a partially masked secret prefix. It is redacted here. Those four JSON files now sit untracked in that repo's `output_files/`. The metadata files hold sandbox test-contact values. None of those values were copied into the diff.

Result: 95 org labels, same id set as `all_labels_v3.json`. Client metadata catalog 39 fields. Employee catalog union 20 fields.

## Pass 5 — generate the diff

Generator: `/tmp/ws1/gen.mjs` (outside the repo, not in the write list). It reads the saved definition JSON, the Drive names, and the fetch lists from `src/` (read-only), and writes `docs/ws1-schema-diff.md`.

Draft 1 problems found on read-through:

- Option lists were flagged "differs" when sandbox only numbered `displayOrder` from 1. Fixed by comparing label, value, hidden, and relative order. Offset-only differences now read `match`.
- Names absent from the production list might have been archived. Added the archived reads. None of the fetch-list names production lacks are archived.

Draft 2 totals:

```
Case: 29 differs, 52 match, 11 absent in production, 6 missing in sandbox.
BCBA: 7 differs, 25 match, 10 absent in production, 2 missing in sandbox.
BT/RBT: 3 missing in sandbox, 15 match, 9 differs, 7 absent in production, 1 absent on both.
Contact: 1 differs, 3 match.
```

## Pass 6 — check script, fail first

```
$ node scripts/check-ws1-diff.mjs /tmp/ws1/scratch/token.md
check-ws1-diff: 1 forbidden line(s)
/tmp/ws1/scratch/token.md:2: token assignment: HUBSPOT_PRIVATE_APP_TOKEN=fake-not-a-real-token
exit=1
```

The scratch file's line 3 (`HUBSPOT_PRIVATE_APP_TOKEN_PROD = fake`) was missed. The pattern required `=` right after `TOKEN`. Fixed to allow a name suffix, and each line is reported once. Rerun:

```
$ node scripts/check-ws1-diff.mjs /tmp/ws1/scratch/token.md
check-ws1-diff: 2 forbidden line(s)
/tmp/ws1/scratch/token.md:2: token assignment: HUBSPOT_PRIVATE_APP_TOKEN=fake-not-a-real-token
/tmp/ws1/scratch/token.md:3: token assignment: HUBSPOT_PRIVATE_APP_TOKEN_PROD = fake
exit=1
$ node scripts/check-ws1-diff.mjs /tmp/ws1/scratch/record.md
check-ws1-diff: 2 forbidden line(s)
/tmp/ws1/scratch/record.md:2: CRM record export: hs api /crm/v3/objects/deals/123 -a united-care-aba --json
/tmp/ws1/scratch/record.md:3: CRM record export: {"id":"123","properties": {"hs_object_id": "123","dealname":"x"}}
exit=1
$ node scripts/check-ws1-diff.mjs /tmp/ws1/scratch/clean.md
check-ws1-diff: ok, 3 lines in /tmp/ws1/scratch/clean.md with no token assignment or CRM record export
exit=0
```

## Pass 7 — done checks

```
--- check 1
exists
34:hs api /crm/v3/properties/0-3 -a united-care-aba --json
60:hs api /crm/v3/properties/0-3 -a UnitedCare_Test_Integration --json
11:| 50317927 | Production | `united-care-aba` | `0-3` | `2-48354212` | `2-48354559` |
12:| 50850427 | Sandbox (developer test account) | `UnitedCare_Test_Integration` | `0-3` | `2-55656302` | `2-55656309` |
--- check 2
check-ws1-diff: ok, 538 lines in .../docs/ws1-schema-diff.md with no token assignment or CRM record export
exit=0
--- check 3
exit=0
# tests 78
# pass 78
# fail 0
--- check 4
 docs/Sandbox props & labels_summary.md | 2 ++
 1 file changed, 2 insertions(+)
Untracked: docs/state.md (pre-existing), docs/workstreams/, docs/ws1-schema-diff.md, scripts/check-ws1-diff.mjs
src changes: 0
--- check 5
rg exit=1 (no match)
```

`git diff` does not see untracked files, so check 5 was also run directly on the new files. `rg 'HUBSPOT_PRIVATE_APP_TOKEN(_PROD)?\s*=' docs/ws1-schema-diff.md scripts/check-ws1-diff.mjs` returned exit 1 (no match).

Branch still `align-sandbox-hubspot-field-sync`, HEAD still `c18cf5f`. Nothing committed or pushed. No poller enabled. No HubSpot or CentralReach record written.

**Status: verified** (definition diff).
