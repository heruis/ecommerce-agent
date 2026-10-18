---
description: Run lint, typecheck and unit tests; fix failures inside your own workstream
---

Run `pnpm check` (lint + typecheck + unit tests).

If anything fails:

1. Read the failure and find the root cause; do not silence tests or add `any`.
2. Fix it only if the file is inside your workstream (see ownership.json for your branch prefix).
3. If the fix belongs to another workstream, stop and add a request to `docs/team/status/<your-ws>.md` under "Requests for other workstreams".
4. Re-run `pnpm check` until it passes, then summarize what you changed in 3 bullets.
