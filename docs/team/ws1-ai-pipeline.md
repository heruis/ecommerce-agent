# WS1 — AI pipeline

**Mission:** make the agents that _write_ the report excellent in live mode: extraction, keywords, the three per-channel localization agents, the orchestrator and the report assembly. You own the quality of what the seller copies into Amazon, TikTok Shop and Shopify.

**Branch prefix:** `ws1/` · **Status file:** `docs/team/status/ws1.md` · **Write-up section:** `docs/report/sections/ws1-ai-design.md`

## You own

```
src/lib/agents/extraction/**     src/lib/agents/keywords/**     src/lib/agents/localization/**
src/lib/agents/shared/**         src/lib/pipeline/**            src/lib/report/**
evals/datasets/ws1-*.jsonl
```

## You consume (do not edit; request changes)

- `src/lib/contracts/*` (lead) — `ProductFacts`, `KeywordSet`, `ListingDraft`, `ChannelResult`, `PublishField`, `PipelineEvent`
- `src/lib/harness/*` (lead) — `structuredCall`, `runToolLoop`, `defineTool`
- `src/lib/rules/*`, `src/lib/guardrails/*` (WS2) — your `check_listing` tool calls `validateListing()` and `scanClaims()`; the per-channel limits and form fields live in `rules/<channel>.ts`

## What already exists

- Working agents with **v0 prompts** (`prompt.ts`) and offline **mocks** (`mock.ts`): extraction, keywords (incl. TikTok hashtags), and **one localization agent per channel** (Amazon US, TikTok Shop US, Shopify) running in parallel. Each channel's prompt is generated from its rule config, so it always matches `check_listing`.
- The orchestrator runs input guardrails → extraction → [photo check ‖ keywords] → localization ×N → compliance → gate ×N → scoring ×N, and assembles the report (`src/lib/report/`: publish fields per site form, photo guidance, Markdown report). Mock mode passes 13/13 golden cases (~13 calls for 3 channels).
- Live mode has **never been tuned**: that is your job this week. Mock passing proves the plumbing, not the prompts.

## Setup you need

SETUP.md §2 and §4 (your own Claude API key). Keep `DATA_MODE=memory`, `BILLING_MODE=mock`.

## Tasks (one week — P0 must ship, P1 if time, P2 only after the freeze is lifted)

| ID     | Pri | Day | Task                                                                                                                                                                                                                                | Acceptance criteria                                                                                      |
| ------ | --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| WS1-T1 | P0  | 2   | **Live baseline.** `AI_MODE=live pnpm eval --suite golden`; record pass rate, cost and latency per case, and which **channel** fails most. Open 3 reports in the UI and note the worst copy per channel.                            | Numbers + top 3 failure patterns (with the prompt file each points to) in your status file               |
| WS1-T2 | P0  | 2–4 | **Localization prompts per channel.** Amazon: keyword-first title, 5 benefit bullets, backend terms. TikTok: short mobile title, 3–5 punchy selling points, hashtags. Shopify: brand-voice description, SEO title ≤ 60, meta ≤ 160. | Golden ≥ 80% live (with WS2); median `check_listing` turns ≤ 3 per channel; judge naturalness ≥ 4 on 80% |
| WS1-T3 | P0  | 3   | **Extraction prompt + 3 new cases** in `evals/datasets/ws1-golden.jsonl` (new categories; one single-channel case; one with evidence that supports a claim).                                                                        | New cases pass live; no claim leaks into facts                                                           |
| WS1-T4 | P1  | 4   | **Partial reports.** If one channel's localization fails, keep the other channels and show a warning (today one failure fails the run). Retry a stage once on `llm_error`.                                                          | Unit tests with failing mock responders; UI shows the warning                                            |
| WS1-T5 | P1  | 5   | **Cost and latency.** Check prompt-cache hits in traces, trim prompts, set effort per agent.                                                                                                                                        | Median live run (3 channels) < $0.15 (PRD target) and < 120 s, recorded in your status file              |
| WS1-T6 | P2  | —   | **Regenerate one field** ("shorter TikTok title"). Spec first with `/write-prd`.                                                                                                                                                    | Spec merged                                                                                              |

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

> You are working on ShelfPass as **WS1 (AI pipeline)** on branch `ws1/live-baseline`. Read `CLAUDE.md`, `docs/team/TEAM_GUIDE.md`, `docs/team/ws1-ai-pipeline.md` and `docs/AGENT_DESIGN.md`. You may only edit files that `ownership.json` assigns to ws1; a hook enforces this. If you need a change elsewhere, write it in `docs/team/status/ws1.md` instead. Start with **WS1-T1**: run the golden evals in live mode (three channels per case) (I have set `AI_MODE=live` and my key in `.env.local`; never read that file), summarize pass rate, cost and latency per case, open the failing cases' outputs, and list the top 3 failure patterns with the prompt file each one points to. Then propose a plan for WS1-T2 (per-channel localization prompts) and WS1-T3. Show me the plan before changing any prompt. Finish with `/handoff`.
