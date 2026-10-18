---
description: Review your branch's diff against main before opening a PR
---

Get the diff with `git diff origin/main...HEAD` and delegate the review to the `code-reviewer` subagent. Pass it: the branch name, the workstream (from ownership.json), and the full diff.

Then show me its verdict and findings. Do not apply fixes automatically; list them so I can choose.
