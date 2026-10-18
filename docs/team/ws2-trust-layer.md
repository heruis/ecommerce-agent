# WS2 — Trust layer

**Mission:** make ListWise trustworthy. You own everything that decides whether a claim is allowed: the compliance agent, the policy knowledge base and retrieval, guardrails, platform rules, the quality score and the evals that prove it all works. This is the product's main differentiator and the biggest share of the "AI design" grade.

**Branch prefix:** `ws2/` · **Status file:** `docs/team/status/ws2.md` · **Write-up section:** `docs/report/sections/ws2-trust.md`

## You own

```
src/lib/agents/compliance/**   src/lib/agents/judge/**   src/lib/guardrails/**   src/lib/rules/**
src/lib/scoring/**             src/lib/rag/**            knowledge/**            evals/**
scripts/ingest-kb.ts
```

## You consume (do not edit; request changes)

- `src/lib/contracts/*`, `src/lib/harness/*` (lead) · the draft from WS1's localization agent · `supabase/migrations` (WS4) for the `policy_chunks` table

## What already exists

- Compliance agent (agentic RAG: `search_policy` ≤ 4 calls, `lookup_evidence`), citation-integrity check, lexicon backstop, output gate, quality judge, scoring, rule engine for Amazon US, BM25 retriever.
- 10 knowledge-base docs, **all `verified: false`** (sources could not be checked from the build environment).
- Evals: 12 golden cases, 15 retrieval queries; mock 12/12, recall@3 0.93, MRR 1.0.

## Setup you need

SETUP.md §2, §4; §3 (Supabase) and §6 (Voyage) for vector RAG.

## Tasks

| ID     | Pri | Task                                                                                                                                                                                                                                  | Acceptance criteria                                                                               |
| ------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| WS2-T1 | P0  | **Verify the knowledge base.** Read each source (log in to Seller Central where needed), correct the summaries and URLs, set `verified: true` + `last_reviewed`. Use the `policy-researcher` subagent and the `add-policy-doc` skill. | All 10 docs verified or explicitly marked "could not verify" with reason                          |
| WS2-T2 | P0  | **Fill coverage gaps.** Add docs (and lexicon rules + retrieval cases) for: California Prop 65 warnings, children's products / CPSIA, "organic" (USDA), "hypoallergenic" / "dermatologist tested", "medical grade" (医用级).          | ≥ 4 new docs; retrieval recall@3 ≥ 0.9                                                            |
| WS2-T3 | P0  | **Compliance prompt in live mode** with WS1. Every restricted claim cited, sensible actions and fixes, no over-flagging of ordinary words.                                                                                            | Golden ≥ 80% live; 0 restricted phrases in final listings; ≤ 1 false-positive flag per clean case |
| WS2-T4 | P0  | **Red-team set.** Grow `golden.jsonl` to ≥ 20 cases with the checklist in `docs/GUARDRAILS.md` (injection in every field, EN + ZH; claim spelling variants; evidence that does and does not support a claim). Fix what breaks.        | ≥ 20 cases; pass rate recorded mock + live; every fix has a unit test                             |
| WS2-T5 | P1  | **Vector RAG.** Implement `scripts/ingest-kb.ts` (Voyage embeddings → `policy_chunks`) and `VectorRetriever`; compare against BM25 with `pnpm eval --suite retrieval`; record the decision.                                           | Metrics table lexical vs vector in `memory/decisions.md` (via lead) and your write-up section     |
| WS2-T6 | P1  | **Judge calibration.** Hand-rate 10 listings; compare with the judge; tighten rubric anchors if agreement within ±1 < 70%.                                                                                                            | Agreement numbers recorded                                                                        |
| WS2-T7 | P1  | **Rule verification.** Confirm Amazon limits for our main categories (title length exceptions, bullet limits) and encode exceptions in `rules/`.                                                                                      | Sources cited in `amazon-us.ts`; tests updated                                                    |
| WS2-T8 | P2  | **TikTok Shop US rules** (stretch, with WS1-T8).                                                                                                                                                                                      | `tiktok-us.ts` sourced and tested                                                                 |
| WS2-T9 | P2  | **Explainability.** Show which lexicon rule or retrieved chunk drove each decision in the trace (add attributes to spans you create).                                                                                                 | Visible on the trace page                                                                         |

## How you verify

```bash
pnpm check
pnpm eval --suite retrieval        # after any KB or retriever change
pnpm eval --suite golden           # mock
AI_MODE=live pnpm eval             # before every compliance-prompt PR
```

Use the `eval-analyst` subagent to find failure patterns across runs.

## Rules specific to WS2

- The knowledge base is paraphrased summaries with sources, never legal advice; never claim a listing "will pass".
- The gate must stay deterministic code: the model may propose fixes, code enforces them.
- A golden case is ground truth written _before_ running. Fix the system, not the case.
- `tool` call caps and the run budget are product guardrails; change them only with a decision record.

## Kickoff prompt (paste into Claude Code)

> You are working on ListWise AI as **WS2 (Trust layer)** on branch `ws2/verify-kb`. Read `CLAUDE.md`, `docs/team/TEAM_GUIDE.md`, `docs/team/ws2-trust-layer.md`, `docs/GUARDRAILS.md` and `docs/EVALS.md`. You may only edit files that `ownership.json` assigns to ws2; a hook enforces this. If you need a change elsewhere, write it in `docs/team/status/ws2.md` instead. Start with **WS2-T1**: for each file in `knowledge/policies/`, use the `policy-researcher` subagent to check the summary against its source and propose corrections. Show me a table (doc, what is wrong or unverifiable, proposed fix, source URL) before editing anything. After I approve, apply the edits, run `pnpm eval --suite retrieval` and `pnpm check`, and finish with `/handoff`.
