# WS1 — AI pipeline

**Mission:** make the agents that _write_ the listing excellent in live mode: extraction, keywords, localization, and the orchestrator that runs them. You own the quality of what the seller reads.

**Branch prefix:** `ws1/` · **Status file:** `docs/team/status/ws1.md` · **Write-up section:** `docs/report/sections/ws1-ai-design.md`

## You own

```
src/lib/agents/extraction/**     src/lib/agents/keywords/**     src/lib/agents/localization/**
src/lib/agents/shared/**         src/lib/pipeline/**            evals/datasets/ws1-*.jsonl
```

## You consume (do not edit; request changes)

- `src/lib/contracts/*` (lead) — `ProductFacts`, `KeywordSet`, `ListingDraft`, `PipelineEvent`
- `src/lib/harness/*` (lead) — `structuredCall`, `runToolLoop`, `defineTool`
- `src/lib/rules/*`, `src/lib/guardrails/*` (WS2) — your `check_listing` tool calls `validateListing()` and `scanClaims()`

## What already exists

- Working agents with **v0 prompts** (`prompt.ts`), offline **mocks** (`mock.ts`), and the orchestrator streaming all 7 stages. Mock mode passes 12/12 golden cases.
- Live mode has **never been tuned**: that is your job. Mock passing proves the plumbing, not the prompts.

## Setup you need

SETUP.md §2 and §4 (your own Claude API key). Keep `DATA_MODE=memory`, `BILLING_MODE=mock`.

## Tasks

| ID     | Pri | Task                                                                                                                                                                                                                                    | Acceptance criteria                                                                                                    |
| ------ | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| WS1-T1 | P0  | **Live baseline.** Run `AI_MODE=live pnpm eval --suite golden` and record pass rate, cost and latency per case in your status file. Open 3 traces in the UI and note the worst outputs.                                                 | Baseline numbers recorded; top 3 failure patterns written down                                                         |
| WS1-T2 | P0  | **Extraction prompt.** Facts are complete and grounded, claims never leak into facts, units preserved, `missing_info` useful. Add `evals/datasets/ws1-golden-extraction.jsonl` with ≥ 5 new real-looking inputs (different categories). | No grounding-check warnings on golden inputs; all `must_flag` claims appear in `marketing_claims`; new cases pass live |
| WS1-T3 | P0  | **Localization prompt.** Natural US copy, title pattern followed, 5 bullets, never truncated, passes `check_listing` in ≤ 3 turns typically, no unsupported claims.                                                                     | Golden ≥ 80% live (together with WS2); median localization turns ≤ 3; judge naturalness ≥ 4 on 80% of cases            |
| WS1-T4 | P0  | **Keywords prompt.** Shopper-language phrases, no brand/promo words, clearly AI-suggested. Unit tests for `cleanKeywords`.                                                                                                              | Tests added; keyword relevance component ≥ 75 on golden median                                                         |
| WS1-T5 | P1  | **Orchestrator resilience.** Retry a stage once on `llm_error` (not on contract/guardrail errors); if keywords fail, continue with an empty set and a warning; partial results are saved with clear warnings.                           | Unit tests in `pipeline/orchestrator.test.ts` using mock responders that fail; UI shows the warning                    |
| WS1-T6 | P1  | **Cost and latency.** Verify prompt-cache hits (`cache_read_tokens` in traces), trim prompts, choose effort levels per agent.                                                                                                           | Median live cost/run < $0.08 and time < 90 s, recorded with model IDs                                                  |
| WS1-T7 | P1  | **Regenerate one field** (e.g. "rewrite title shorter"). Needs a new route: write the spec with `/write-prd`, agree the contract with the lead; you build the agent function, lead/WS3 wire the route and button.                       | Spec merged; function + tests in your folders                                                                          |
| WS1-T8 | P2  | **TikTok Shop US** (stretch) with WS2's verified rules: platform-aware prompt section + 3 golden cases.                                                                                                                                 | `platform: "tiktok_us"` cases pass live                                                                                |
| WS1-T9 | P2  | **Image input** (stretch): suggest attributes from a product photo, always marked unconfirmed. Needs a contract change (`ProductInput.images`).                                                                                         | Spec + contract request first                                                                                          |

## How you verify

```bash
pnpm check                                  # always
pnpm eval --suite golden                    # mock: plumbing still works
AI_MODE=live pnpm eval --suite golden --limit 4   # while iterating (costs cents)
AI_MODE=live pnpm eval --suite golden       # before every prompt PR: put the pass rate in the PR
```

Use the `listing-localizer` skill to try prompt ideas by hand, and the `eval-loop` skill when a case fails. Change one prompt at a time; never edit a golden case to pass it.

## Rules specific to WS1

- Agents call the model only through the harness, each with a `mock` responder. Keep mocks working (CI runs them).
- Seller text always goes through `renderSellerInput()` / `asSellerData()`.
- Never ask the model for search volume, and never let copy claim it.
- Prompt changes need an eval number in the PR description.

## Kickoff prompt (paste into Claude Code)

> You are working on ListWise AI as **WS1 (AI pipeline)** on branch `ws1/live-baseline`. Read `CLAUDE.md`, `docs/team/TEAM_GUIDE.md`, `docs/team/ws1-ai-pipeline.md` and `docs/AGENT_DESIGN.md`. You may only edit files that `ownership.json` assigns to ws1; a hook enforces this. If you need a change elsewhere, write it in `docs/team/status/ws1.md` instead. Start with **WS1-T1**: run the golden evals in live mode (I have set `AI_MODE=live` and my key in `.env.local`; never read that file), summarize pass rate, cost and latency per case, open the failing cases' outputs, and list the top 3 failure patterns with the prompt file each one points to. Then propose a plan for WS1-T2 and WS1-T3. Show me the plan before changing any prompt. Finish with `/handoff`.
