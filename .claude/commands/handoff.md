---
description: Write a short structured status update for the team
---

Update `docs/team/status/<ws>.md` for the current branch's workstream (ws1, ws2, ws3 or ws4; derive it from `git rev-parse --abbrev-ref HEAD`).

Replace the "Latest" section with this exact structure (short, no essays):

```
## Latest — <YYYY-MM-DD>
**Done:** 2-4 bullets with file paths or PR links
**Next:** 1-3 bullets
**Blocked by:** none | who/what
**Requests for other workstreams:** none | "<ws>: <exact change needed> (why)"
**Contract changes needed:** none | the field/type and why
**Eval impact:** last `pnpm eval` pass rate if you touched agents, rules or retrieval
```

Move the previous "Latest" entry under "History". Then show me the diff.
