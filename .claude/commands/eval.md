---
description: Run the eval suites and diagnose failures by dimension
argument-hint: "[golden|retrieval|all] [--limit N]"
---

Run `pnpm eval --suite ${1:-all}` (add `--limit` if given: $ARGUMENTS).

Then report, in this exact format:

- **Pass rate**: X/Y golden cases (ship threshold is 80%)
- **Retrieval**: recall@3, MRR, NDCG@3
- **Failures by dimension**: outcome / process / output_contract / efficiency — one line each with the case ids
- **Failure pattern**: the single most common root cause
- **Proposed fix**: one change to a prompt, rule or tool (fix the system, never special-case the test). Name the file.

Do not edit eval datasets to make a failing case pass. If you believe a golden case is wrong, say why and leave it for the WS2 owner.
