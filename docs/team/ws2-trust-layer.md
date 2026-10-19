# WS2 — Trust layer

**Mission:** make ShelfPass trustworthy. You own everything that decides whether a claim, a field or a photo is allowed: the compliance agent, the photo check, the policy knowledge base and retrieval, guardrails, the channel rules, the quality score and the evals that prove it all works. This is the product's main differentiator and the biggest share of the "AI design" grade.

**Branch prefix:** `ws2/` · **Status file:** `docs/team/status/ws2.md` · **Write-up section:** `docs/report/sections/ws2-trust.md`

## You own

```
src/lib/agents/compliance/**   src/lib/agents/images/**   src/lib/agents/judge/**   src/lib/guardrails/**   src/lib/rules/**
src/lib/scoring/**             src/lib/rag/**            knowledge/**            evals/**
scripts/ingest-kb.ts
```

## You consume (do not edit; request changes)

- `src/lib/contracts/*`, `src/lib/harness/*` (lead) · the draft from WS1's localization agent · `supabase/migrations` (WS4) for the `policy_chunks` table

## What already exists

- Compliance agent (agentic RAG: `search_policy` ≤ 4 calls filtered to the selected channels, `lookup_evidence`) reviewing **all channel drafts in one pass**, citation-integrity check, lexicon backstop, per-channel output gate (also sweeps SEO fields and tags), quality judge + scoring, BM25 retriever.
- **Photo check** (`src/lib/agents/images/`): a fast-tier vision call describes each photo; code in `src/lib/report/images.ts` (WS1) turns that into a main-image verdict per channel. Input guardrail rejects files whose bytes are not really JPEG/PNG/WebP.
- **Channel rule configs** for Amazon US, TikTok Shop US and Shopify (`src/lib/rules/`): limits, banned phrases, image rules and the site's add-product form fields. Written from public docs; **not yet verified**.
- 10 knowledge-base docs, **all `verified: false`**. Evals: 13 golden cases, 15 retrieval queries; mock 13/13, recall@3 0.93, MRR 1.0.

## Setup you need

SETUP.md §2, §4; §3 (Supabase) and §6 (Voyage) for vector RAG.

## Tasks (one week — P0 must ship, P1 if time, P2 only after the freeze is lifted)

| ID     | Pri | Day | Task                                                                                                                                                                                                                               | Acceptance criteria                                                                             |
| ------ | --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| WS2-T1 | P0  | 2–3 | **Verify the channel rules.** Check `amazon-us.ts`, `tiktok-us.ts`, `shopify.ts` (limits, image rules, form fields and labels) against Seller Central, TikTok Shop Seller Center and Shopify admin/help. Cite sources in comments. | Every number and field sourced or marked "could not verify"; tests updated                      |
| WS2-T2 | P0  | 2–4 | **Verify the knowledge base** (priority: FDA, EPA pesticide, FTC green, Amazon prohibited claims) and add a **TikTok Shop prohibited/restricted claims** doc with retrieval cases. Use `policy-researcher` + `add-policy-doc`.     | Priority docs `verified: true` or marked with a reason; retrieval recall@3 ≥ 0.9                |
| WS2-T3 | P0  | 2–4 | **Compliance + photo check in live mode** with WS1. Every restricted claim cited; no over-flagging. Run the photo check on 6 real photos (white background, lifestyle scene, text overlay, watermark, cropped, several items).     | Golden ≥ 80% live; 0 restricted phrases in any channel; photo verdict table in your status file |
| WS2-T4 | P1  | 5   | **Red-team set.** Grow golden to ≥ 18 cases: injection in each field (EN + ZH), claim spelling variants, evidence that does / does not support a claim, a seller edit that re-adds a restricted claim.                             | Pass rate recorded mock + live; each fix has a unit test                                        |
| WS2-T5 | P1  | 5   | **Judge calibration.** Hand-rate 6 listings (2 per channel) and compare with the judge.                                                                                                                                            | Agreement within ±1 recorded in your write-up section                                           |
| WS2-T6 | P2  | —   | **Vector RAG** (`VectorRetriever` + `ingest-kb.ts`) compared with BM25.                                                                                                                                                            | Metrics table                                                                                   |

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

> You are working on ShelfPass as **WS2 (Trust layer)** on branch `ws2/verify-channel-rules`. Read `CLAUDE.md`, `docs/team/TEAM_GUIDE.md`, `docs/team/ws2-trust-layer.md`, `docs/GUARDRAILS.md` and `docs/EVALS.md`. You may only edit files that `ownership.json` assigns to ws2; a hook enforces this. If you need a change elsewhere, write it in `docs/team/status/ws2.md` instead. Start with **WS2-T1**: for each channel config in `src/lib/rules/` (amazon-us, tiktok-us, shopify), use the `policy-researcher` subagent to check every limit, image rule and form field against the official seller help pages. Show me a table (file, field, our value, source value, source URL) before editing anything. After I approve, apply the edits, run `pnpm eval --suite retrieval` and `pnpm check`, and finish with `/handoff`.
