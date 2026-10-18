---
name: add-policy-doc
description: Add or verify a document in the compliance knowledge base (knowledge/policies). Use when a claim type is not covered, a source needs verification, or retrieval misses a policy.
---

# Add or verify a policy document (WS2)

1. **Research** — delegate to the `policy-researcher` subagent with the claim type and platform. Primary sources only.
2. **Write** `knowledge/policies/<id>.md` with the frontmatter in `knowledge/README.md`. One rule per `## ` section, 2-5 sentences each, paraphrased, plain English. Set `verified: true` and `last_reviewed: <date>` only if you read the source yourself.
3. **Lexicon** — if the claim has a recognizable phrase, add or update a rule in `src/lib/guardrails/claims-lexicon.ts` with `policy_docs: ["<id>"]`, plus a test in `claims-lexicon.test.ts`.
4. **Retrieval case** — add 1-2 lines to `evals/datasets/retrieval.jsonl` with queries a model would actually write.
5. **Check** — `pnpm test && pnpm eval --suite retrieval`. Recall@3 must not drop.
6. **Vector mode** — if RAG_MODE=vector is in use, run `pnpm kb:ingest`.

Never present a summary as legal advice; every doc keeps its source_url.
