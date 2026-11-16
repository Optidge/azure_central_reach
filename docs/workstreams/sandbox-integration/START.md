# Start the sandbox integration thread

Paste the block below into a new chat. Git steps live in `docs/workstreams/session-run/GIT-SESSION-PLAYBOOK.md` (run the session-start block before the first edit). Use Custom Mode for `/poteto-mode` if you want it to stay on for the whole thread. Enter attaches it to one message.

```
/poteto-mode

New task. You are the one coordinator for the sandbox integration workstream.

Goal. Finish sandbox testing on sandbox portal id 52311591. Confirm the worktree or branch before any checkout, then keep sync code on the branch Zeke names, one proven slice at a time.

Done when. The 24-hour report exists on sandbox portal id 52311591 for deals, BT/RBT 2-55656309, and BCBA 2-55656302, filtered on integration_last_write after 1 day ago. Any code slice on the confirmed branch has a check you ran, then a pull request I can merge with a merge commit.

At session start, run the confirm-first block in docs/workstreams/session-run/GIT-SESSION-PLAYBOOK.md. Do not checkout a branch until Zeke names the worktree or branch. Then fast-forward that branch and continue from its latest commit. Before any commit, run that file's pre-commit block.

Read the STATE.md for the confirmed work and update it after each step. Subagents get that path and a bounded task. Write their findings back into that file. Do not merge pull request 2 or 3. Do not commit .env or local.settings.json. Do not use portal 246184070. Sandbox portal id is 52311591. Do not deploy.

Review this plan in your own words before the first edit. Then do the next action in that STATE file.
```
