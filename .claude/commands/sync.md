---
description: Bring your workstream branch up to date with main safely
---

1. `git status` — if there are uncommitted changes, stop and ask me whether to commit them first.
2. `git fetch origin main`
3. `git rebase origin/main`. If there are conflicts:
   - In files you own: resolve them, keeping both intents.
   - In files you do not own (contracts, package.json, other workstreams): keep main's version with `git checkout origin/main -- <file>`, then re-apply your intent inside your own files. Explain what you did.
   - If `pnpm-lock.yaml` conflicts: take main's version, then run `pnpm install`.
4. Run `pnpm check`. Report the result.
   Never force-push to main. Pushing your own branch after a rebase needs `git push --force-with-lease` — ask me first.
