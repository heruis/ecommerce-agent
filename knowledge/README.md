# Compliance knowledge base

Markdown summaries of marketplace and US regulatory rules that the
**compliance agent** retrieves with its `search_policy` tool (agentic RAG).
Each `## Section` becomes one retrievable chunk; the frontmatter supplies the
citation shown to the seller.

**These are paraphrased summaries for risk screening, not legal advice.**
Every file has `verified: false` until a teammate (WS2) checks it against the
cited source and flips it to `true` with a `last_reviewed` date.

## Frontmatter

```yaml
---
id: ftc-green-guides # stable id, used in policy_refs and evals
title: FTC Green Guides — environmental marketing claims
source_name: FTC Green Guides (16 CFR Part 260)
source_url: https://...
platforms: [amazon_us, tiktok_us] # or [all]
topics: [environmental, biodegradable, recyclable]
verified: false
last_reviewed: null
---
```

## Adding a document

1. Copy an existing file, keep sections short (one rule per `##`).
2. Add at least one retrieval case to `evals/datasets/retrieval.jsonl`.
3. Run `pnpm eval --suite retrieval` and check Recall@3 did not drop.
4. If you run vector RAG, re-ingest: `pnpm kb:ingest`.
