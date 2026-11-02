# Git session playbook (agents and operators)

Copy-paste command blocks for every sandbox integration session. Repo root:

`/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`

System of record for *what* to build: [`docs/workstreams/sandbox-integration/STATE.md`](../sandbox-integration/STATE.md). Branch policy detail: [`PR-AND-BRANCH.md`](PR-AND-BRANCH.md).

## Rules that do not change with branch choice

- **Never merge [PR #2](https://github.com/Optidge/azure_central_reach/pull/2)** (`align-sandbox-hubspot-field-sync`). Hard stop.
- **Never merge [PR #3](https://github.com/Optidge/azure_central_reach/pull/3)** (`cursor/remove-verify-azure-central-reach-skill`). Hard stop.
- **Never commit or push** `.env`, `local.settings.json`, `.claude/`, or any file that contains secrets.
- **Sandbox HubSpot:** portal `50850427`, CLI account `UnitedCare_Test_Integration`. **Do not** use Cursor HubSpot MCP portal `246184070` for sandbox property or record work.
- **Do not deploy** Function App `centralreachserverless` unless Zeke explicitly asks. Notes in STATE say the app writes **production** Central Reach and may be stopped.
- **Do not** `git push --force` to `main` or `sandbox-integration` unless Zeke explicitly asks.
- Prefer path-scoped staging. Avoid `git add -A`, `git add .`, and broad `git add -u` without paths.
- Merge to `main` only when Zeke asks; use a **merge commit** (same style as PR #1), not a silent rebase of shared branches.

## Which branch am I on?

| Work | Branch | Open PR |
| --- | --- | --- |
| Sandbox integration, sync code, sandbox tests | `sandbox-integration` | **[PR #6](https://github.com/Optidge/azure_central_reach/pull/6)** — *Record the sandbox integration setup* |
| Rare docs-only on production baseline | `main` | None required; prefer riding PR #6 if the note belongs with sandbox work |

Default for this project: **`sandbox-integration`**.

---

## At the start of every session (run this block first)

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach

git fetch origin

git checkout sandbox-integration
git pull --ff-only origin sandbox-integration

git branch --show-current
git status -sb
git log -1 --oneline

# Optional: confirm the open PR head matches this branch
gh pr view 6 --json number,title,state,headRefName,baseRefName,url
```

**Expect:** branch `sandbox-integration`, tracking `origin/sandbox-integration`. Untracked `.claude/` is OK. No staged secrets.

If the task is **docs-only on `main`** (explicitly requested), swap checkout/pull for `main` instead of `sandbox-integration`.

---

## Before any edit (quick sanity)

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git branch --show-current
git status -sb
```

**Expect:** `sandbox-integration` for integration work. Stop if you are on the wrong branch.

---

## Before any commit (run this block every time)

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach

git branch --show-current

git status
git diff --name-only
git diff --cached --name-status

# Must be empty — nothing secret staged
git diff --cached --name-only | grep -E '^\.env$|^local\.settings\.json$|^\.claude/' && echo "ABORT: secrets or .claude staged" && exit 1 || true

# If staging intentionally, use paths only, for example:
# git add docs/workstreams/sandbox-integration/STATE.md
# git diff --cached --name-only
```

**Abort the commit if:**

- Current branch is not the branch Zeke intended (`sandbox-integration` for sync/sandbox work).
- Staged paths include `.env`, `local.settings.json`, `.claude/`, or anything outside the agreed scope for that commit.
- `git diff --cached --name-only` includes files you did not mean to ship.

**Unstage mistakes:**

```bash
git restore --staged <path>
# or
git restore --staged .
```

---

## Commit and push (only when Zeke asks to commit/push)

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach

git branch --show-current
git diff --cached --name-status

git commit -m "$(cat <<'EOF'
<one-line subject: why, not just what>

EOF
)"

git push origin HEAD

git status -sb
git log -1 --oneline
```

**Expect after push:** `sandbox-integration...origin/sandbox-integration` with no ahead/behind. PR #6 updates on GitHub.

---

## Before opening or updating a PR

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git fetch origin
git log --oneline origin/main..HEAD
gh pr view 6 --json url,state,commits
```

Use **PR #6** for work on `sandbox-integration`. Do not reopen PR #2 or PR #3 as carriers.

---

## Prove mappings still tracked (when Zeke cares about empty IDE folders)

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git ls-files 'src/mappings/**'
wc -l src/mappings/client/*.mjs src/mappings/employees/*.mjs
git ls-tree -r --name-only origin/sandbox-integration src/mappings
```

**Expect:** five `.mjs` files, non-zero line counts, same paths on remote.

---

## End of session (optional bookkeeping)

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git status -sb
git branch --show-current
```

Update [`docs/workstreams/sandbox-integration/STATE.md`](../sandbox-integration/STATE.md) with last step / next action. Do not commit STATE unless Zeke asked for a docs commit.

---

## One combined block for an agent (start + pre-commit guard)

Run at session open; run the pre-commit section again before `git commit`.

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git fetch origin
git checkout sandbox-integration
git pull --ff-only origin sandbox-integration
git branch --show-current
git status -sb
git log -1 --oneline

# --- before commit: re-run from here downward ---
# git status
# git diff --cached --name-status
# git diff --cached --name-only | grep -E '^\.env$|^local\.settings\.json$|^\.claude/' && exit 1 || true
```

---

## Restore pointers (if a bad commit happened)

Pre-change backup pattern used for the docs push (adjust paths if you take a new snapshot):

```bash
mkdir -p /tmp/acr-store-docs-backup
git rev-parse origin/main > /tmp/acr-store-docs-backup/origin-main.sha
git rev-parse origin/sandbox-integration > /tmp/acr-store-docs-backup/origin-sandbox-integration.sha
```

Undo after push (no force-push): `git revert --no-edit <bad_commit_sha>` then `git push origin HEAD`. Full scenarios A–H were captured in the store-docs execution plan; ask in chat if you need them copied here.

---

## Related files

- [`PR-AND-BRANCH.md`](PR-AND-BRANCH.md) — PR roles and what not to merge
- [`docs/workstreams/pr-transfer-tracker.md`](../pr-transfer-tracker.md) — named code slices to port
- [`docs/workstreams/sandbox-integration/START.md`](../sandbox-integration/START.md) — paste block for a new Cursor thread
- [`docs/workstreams/session-run/STATE.md`](STATE.md) — session system of record
