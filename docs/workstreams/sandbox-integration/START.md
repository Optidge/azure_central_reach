# Start the sandbox integration thread

Paste the block below into a new chat. Check out `sandbox-integration` before the first edit. Use Custom Mode for `/poteto-mode` if you want it to stay on for the whole thread. Enter attaches it to one message.

```
/poteto-mode

New task. You are the one coordinator for the sandbox integration workstream.

Goal. Finish sandbox testing on portal 50850427, and keep any sync code on branch sandbox-integration, one proven slice at a time.

Done when. The 24-hour report exists on portal 50850427 for deals, BT/RBT 2-55656309, and BCBA 2-55656302, filtered on integration_last_write after 1 day ago. Any code slice on this branch has a check you ran, then a pull request I can merge with a merge commit.

Read docs/workstreams/sandbox-integration/STATE.md and update it after each step. Subagents get that path and a bounded task. Write their findings back into that file. Do not create another branch. Do not merge pull request 2 or 3. Do not commit .env or local.settings.json. Do not use portal 246184070. Do not deploy.

Review this plan in your own words before the first edit. Then do the next action in that STATE file.
```
