# Evals and observability

> "You can't grade what you can't see." Observability (traces) supplies the evidence; evals turn it into a pass/fail decision. (Course Module 2–4)

## What we evaluate

| Layer                        | Question                                                                        | Suite                            | Metric                             | Target            |
| ---------------------------- | ------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------- | ----------------- |
| Retrieval                    | Did the compliance agent get the right policy chunks?                           | `evals/datasets/retrieval.jsonl` | Recall@3, Precision@3, MRR, NDCG@3 | Recall@3 ≥ 0.9    |
| Generation + agent execution | Is every channel's final listing correct, compliant, well-formed and efficient? | `evals/datasets/golden.jsonl`    | Pass rate over 4 dimensions        | ≥ 80% (ship rule) |
| Language quality             | Does it read like a native US listing?                                          | LLM judge inside every run       | naturalness/clarity 1–5            | median ≥ 4        |
| Units                        | Do rules, guardrails, harness, repo behave?                                     | `*.test.ts` (Vitest)             | all pass                           | 100%              |
| Journey                      | Can a user do the whole flow?                                                   | `e2e/smoke.spec.ts` (Playwright) | pass                               | pass              |

Current baseline (mock mode, 2026-10-19, three channels per case unless the case selects fewer): golden **13/13**, retrieval recall@3 **0.93**, MRR **1.00**, NDCG@3 **0.95**; unit tests **68/68**; e2e **2/2**. Live-mode numbers are the ones that count for the demo; record them in `memory/lessons-learned.md` and the write-up.

## Golden dataset (`evals/datasets/golden.jsonl`)

Each line is one case: a real-looking seller input plus the ground truth written **before** running it ("if you can't write the golden output column, you don't know what your AI is supposed to do").

```json
{
  "id": "cup-risky-claims",
  "input": {
    "title_zh": "硅胶折叠水杯 …",
    "description_zh": "… FDA认证，100%安全，美国销量第一 …"
  },
  "expect": {
    "must_flag": ["fda_approval", "absolute_safety", "ranking_number_one"],
    "must_not_appear": ["FDA approved", "100% safe", "#1"],
    "required_facts": [{ "attribute": "material", "contains": "silicone" }],
    "min_score": 70,
    "max_llm_calls": 18
  }
}
```

`input.platforms` is optional; without it a case runs all three channels (Amazon US, TikTok Shop US, Shopify). `max_llm_calls` is 18 for three channels and 8 for a single-channel case.

Every case is scored on the four dimensions from the course; a case passes only if all four pass:

| Dimension           | Checks (`evals/lib/checks.ts`)                                                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Outcome**         | For **every** channel: required facts appear in the final listing; score ≥ `min_score`. Blocked cases are blocked                                                                                                                        |
| **Process**         | Every `must_flag` claim type was flagged (not verified) in the shared review; every restricted claim has a policy citation                                                                                                               |
| **Output contract** | For **every** channel: no `must_not_appear` phrase in any field (incl. SEO fields and tags); policy gate PASS; channel validation passes; no required _generated_ publish field is empty. The channels in the result match the selection |
| **Efficiency**      | LLM calls ≤ `max_llm_calls` for the whole run (blocked inputs must use 0)                                                                                                                                                                |

The score reported per case is the **weakest** channel's score: a case is only as good as its worst channel.

Coverage today (13 cases): certification, absolute safety, ranking, antimicrobial, environmental, medical, origin, superlative, non-toxic claims; a supportable claim with evidence (must survive); a clean product; PII redaction; prompt injection; a prohibited product; and `tiktok-only-led-strip` — a single-channel run (TikTok Shop only) where a sales-rank claim must be removed and hashtags filled. Photo handling is covered by unit tests (`orchestrator.test.ts`: a real PNG is checked, a fake one is blocked with 0 model calls) rather than golden cases, because mock mode cannot see pixels.

**Add cases from real traces.** When something goes wrong in the app, copy the input from the trace page into a new case, write `expect` first, then fix the system (`/eval`, `eval-loop` skill). Never edit an existing case to make it pass.

## Retrieval dataset (`evals/datasets/retrieval.jsonl`)

`{"query": "...", "relevant": ["doc-id", ...]}` — queries written the way the compliance agent writes them. Doc-level relevance. Run after any knowledge-base or retriever change; compare lexical vs vector before switching `RAG_MODE`.

## Running

```bash
pnpm eval                          # both suites, AI_MODE from .env.local (mock by default)
pnpm eval --suite retrieval
pnpm eval --suite golden --limit 3 # live mode costs money — iterate on a few cases
AI_MODE=live pnpm eval             # the real measurement (needs ANTHROPIC_* keys)
```

Results are written to `evals/results/<timestamp>-<mode>.json` (gitignored). Exit code is non-zero below the 80% ship threshold, so CI fails.

Mock mode tests the _harness and plumbing_ (orchestration, tools, gate, scoring) deterministically; live mode tests the _prompts_. Both matter.

## The eval loop

1. Write ground truth first · 2. run · 3. find the failure pattern (by dimension — `eval-analyst` subagent) · 4. fix the system prompt/rule/tool, not the output · 5. rerun; don't ship below 8/10. Record what you learned in `memory/lessons-learned.md`.

## Observability

Every run stores a trace (`pipeline_runs.spans`) viewable at `/listings/:id/trace`:

| Captured                                                          | Where                                            |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| Model inputs & outputs (redacted, truncated, photo bytes omitted) | `llm` spans                                      |
| One span per channel's localization agent                         | `localization.<channel>` stage spans             |
| Tool-selection decisions and tool I/O                             | `tool` spans                                     |
| Latency per stage / call                                          | `duration_ms`                                    |
| Tokens, cache reads, estimated cost                               | span attrs + run `usage`                         |
| Failures, refusals, retries                                       | span `error`, run `error`                        |
| Guardrail findings                                                | `input_guardrails` / `output_gate` stage outputs |

Traces → label good/bad → golden set → evals. That is the loop.

## Judge calibration (WS2, week 3)

Rate 10 listings by hand (naturalness 1–5), run the judge on the same 10, and report agreement (exact and ±1). If agreement < 70% within ±1, tighten the rubric anchors in `agents/judge/prompt.ts`.
