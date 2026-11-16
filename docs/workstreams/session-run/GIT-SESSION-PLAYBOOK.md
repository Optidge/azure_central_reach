# Git session playbook

How to start a git session in this repo. Confirm the worktree or the branch with Zeke before you checkout, pull, or edit. Then continue from the latest commit on that branch.

Repo root:

`/Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach`

Branch roles live in [`PR-AND-BRANCH.md`](PR-AND-BRANCH.md). After the branch is confirmed, read that branch's own `STATE.md` for what to build. This file does not choose the branch for you.

This copy is on `sandbox-integration` until [PR #6](https://github.com/Optidge/azure_central_reach/pull/6) merges. `main` does not contain it yet. Read it before you switch. If the confirmed branch does not contain this file, keep using the copy you already opened.

## Rules that do not change with branch choice

- Never merge [PR #2](https://github.com/Optidge/azure_central_reach/pull/2) (`align-sandbox-hubspot-field-sync`). Hard stop.
- Never merge [PR #3](https://github.com/Optidge/azure_central_reach/pull/3) (`cursor/remove-verify-azure-central-reach-skill`). Hard stop.
- Never commit or push `.env`, `local.settings.json`, `.claude/`, or any file that contains secrets.
- Sandbox portal id is `52311591`. That id is the sandbox portal. CLI account `UnitedCare_Test_Integration`. Do not use Cursor HubSpot MCP portal `246184070` for sandbox property or record work.
- Do not deploy Function App `centralreachserverless` unless Zeke explicitly asks. Notes in STATE say the app writes production Central Reach and may be stopped.
- Do not `git push --force` to `main`, `sandbox-integration`, or any other shared branch unless Zeke explicitly asks.
- Prefer path-scoped staging. Avoid `git add -A`, `git add .`, and broad `git add -u` without paths.
- Merge to `main` only when Zeke asks. Use a merge commit, the same style as PR #1. Do not silently rebase a shared branch.

## Confirm the worktree or branch first

Do this before any checkout. There is no default branch.

1. From the repo root, list worktrees, branches, status, and recent commits. Do not checkout yet.

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach

git worktree list
git branch -vv
git status -sb
git log -5 --oneline
```

2. Tell Zeke the current worktree path, the current branch, and the latest commit subject. Ask which worktree or which branch to use. Wait for the answer.
3. A dirty tree with work you did not make is a stop. Report the paths. Do not stash, discard, or switch over that work.
4. After Zeke names a worktree, `cd` to that path. If that worktree is already on the branch, stay there. Do not check the same branch out in a second worktree.
5. After Zeke names a branch, check it out in the current worktree only when the tree is clean, or use the worktree that is already on it.

```bash
git fetch origin
git checkout <branch-zeke-named>
git pull --ff-only origin <branch-zeke-named>

git branch --show-current
git status -sb
git log -1 --oneline
```

6. If `git pull --ff-only` fails, stop and report whether the branch is ahead, behind, or diverged. Do not rebase, reset, or force-push.
7. Read `git log -1` and the `STATE.md` for that work. Continue from that latest update. Do not redo work the log or STATE already marks done.

`sandbox-integration` is one known line of work. It is not the branch you check out unless Zeke names it. `main` is the same. A docs-only task on `main` still needs that confirmation.

### Known lines, for the question only

| Work | Branch | Open PR |
| --- | --- | --- |
| Sandbox integration, sync code, sandbox tests | `sandbox-integration` | [PR #6](https://github.com/Optidge/azure_central_reach/pull/6) |
| Merged notes and baseline | `main` | None |

Use the table to phrase the question. Do not treat a row as permission to switch.

## GitHub CLI (`gh`) is optional

Session start does not require `gh`. `git fetch`, `git pull`, commit, and push use git credentials and work when `gh` is logged out or the token is expired.

Use `gh` only when you want PR title or state in the terminal, or when Zeke asks you to open a PR from the CLI. If `gh` fails, the session is not blocked.

Restore `gh` only when Zeke wants it. That login is interactive.

```bash
gh auth login -h github.com
gh auth status
```

Git-only check after the branch is confirmed:

```bash
git branch --show-current
git status -sb
git log -1 --oneline
```

Expect the branch Zeke named, tracking `origin/<that-branch>`, with no ahead or behind after a clean fast-forward pull.

## Before any edit

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git branch --show-current
git status -sb
git log -1 --oneline
```

Expect the branch Zeke confirmed this session. Stop if you are on another branch.

## Before any commit

Run this every time, before `git commit`.

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach

git branch --show-current

git status
git diff --name-only
git diff --cached --name-status

# Must be empty. Nothing secret staged.
git diff --cached --name-only | grep -E '^\.env$|^local\.settings\.json$|^\.claude/' && echo "ABORT: secrets or .claude staged" && exit 1 || true
```

Stage paths only. Example:

```bash
git add docs/workstreams/session-run/STATE.md
git diff --cached --name-only
```

Abort the commit if any of these are true.

- The current branch is not the branch Zeke confirmed this session.
- Staged paths include `.env`, `local.settings.json`, `.claude/`, or anything outside the agreed scope.
- `git diff --cached --name-only` includes files you did not mean to ship.

Unstage a mistake:

```bash
git restore --staged <path>
```

Or unstage everything that is staged:

```bash
git restore --staged .
```

## Commit and push

Commit and push only when Zeke asks.

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

After the push, expect `<branch>...origin/<branch>` with no ahead or behind. That branch is the one Zeke confirmed.

## Before opening or updating a PR

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git fetch origin
git log --oneline origin/main..HEAD
```

Use the open PR for the confirmed branch, if one exists. When that branch is `sandbox-integration`, the open PR is #6. Do not reopen PR #2 or PR #3, and do not use them as the carrier.

`gh pr view` is optional. A `gh` failure does not block the git checks above.

## Prove mappings are still tracked

Run this only when Zeke asks, and only on a branch that contains `src/mappings`. Replace `<branch>` with the confirmed branch.

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git ls-files 'src/mappings/**'
wc -l src/mappings/client/*.mjs src/mappings/employees/*.mjs
git ls-tree -r --name-only origin/<branch> src/mappings
```

Expect five `.mjs` files, non-zero line counts, and the same paths on that remote branch.

## End of session

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach
git status -sb
git branch --show-current
git log -1 --oneline
```

Update `docs/workstreams/session-run/STATE.md` with the branch, the latest commit, the last step, and the next action. If the confirmed work has its own `STATE.md`, update that file too. Do not commit those notes unless Zeke asked for a docs commit.

## One combined block

Run the inspect block at session open. Run the pull block only after Zeke names the worktree or branch. Run the pre-commit lines again before `git commit`.

```bash
cd /Users/zeke/Desktop/projects/client_projects/Optidge/azure_central_reach

# Inspect. Do not checkout.
git worktree list
git branch -vv
git status -sb
git log -5 --oneline

# After Zeke names the branch:
# git fetch origin
# git checkout <branch-zeke-named>
# git pull --ff-only origin <branch-zeke-named>
# git branch --show-current
# git status -sb
# git log -1 --oneline

# Before commit, from here downward:
# git status
# git diff --cached --name-status
# git diff --cached --name-only | grep -E '^\.env$|^local\.settings\.json$|^\.claude/' && exit 1 || true
```

## Restore pointers

If you need a snapshot of the remote tips before a risky step:

```bash
mkdir -p /tmp/acr-store-docs-backup
git rev-parse origin/main > /tmp/acr-store-docs-backup/origin-main.sha
git rev-parse origin/<branch-zeke-named> > /tmp/acr-store-docs-backup/origin-branch.sha
```

Undo a pushed commit without force-push: `git revert --no-edit <bad_commit_sha>`, then `git push origin HEAD`.

## Related files

- [`PR-AND-BRANCH.md`](PR-AND-BRANCH.md) for PR roles and what not to merge
- [`docs/workstreams/pr-transfer-tracker.md`](../pr-transfer-tracker.md) for named code slices to port
- [`docs/workstreams/sandbox-integration/START.md`](../sandbox-integration/START.md) for the sandbox thread paste
- [`docs/workstreams/session-run/STATE.md`](STATE.md) for this session's record
