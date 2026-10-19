# ShelfPass — project memory

Agentic SaaS that turns Chinese product information into one compliance-reviewed report with publish-ready fields for **Amazon US, TikTok Shop US and Shopify** (no live publishing; see docs/PRD.md).
UCLA "Building LLM Applications" capstone. Product spec: `docs/PRD.md`. Architecture: `docs/ARCHITECTURE.md`.

## Commands

```bash
pnpm dev                 # http://localhost:3000 (mock mode works with no keys)
pnpm check               # lint + typecheck + unit tests — run before every commit
pnpm eval                # golden + retrieval evals (ship rule: >= 80% golden pass)
pnpm test:e2e            # Playwright smoke test (builds the app in mock mode)
pnpm check:env           # verify .env.local for the modes you enabled
pnpm ownership           # check your branch only touches your workstream's files
```

Modes in `.env.local`: `AI_MODE=mock|live`, `DATA_MODE=memory|supabase`, `BILLING_MODE=mock|stripe`, `RAG_MODE=lexical|vector`.

## Map

- `src/lib/contracts/` — zod types every layer shares. **Lead-owned. Never change in a workstream branch.**
- `src/lib/harness/` — LLM client (live/mock), `structuredCall`, `runToolLoop` (ReAct), tracer, budget. Lead-owned.
- `src/lib/pipeline/orchestrator.ts` — hub-and-spoke workflow: guardrails → extraction → [photo check ‖ keywords] → localization (one agent per channel, parallel) → compliance (one review over all drafts) → gate → scoring + publish fields (per channel).
- `src/lib/agents/<name>/` — `agent.ts` (calls the harness), `prompt.ts` (system prompt), `mock.ts` (offline stand-in), `tools.ts`.
- `src/lib/guardrails/` (input screen, claim lexicon, output gate), `rules/` (per-channel limits + "add product" form fields), `rag/` (policy retrieval), `scoring/`.
- `src/lib/report/` — publish fields per channel, photo guidance, `channelViews` (seller edits re-checked in code), Markdown report.
- `src/lib/db|auth|billing/` — ports with memory/mock implementations and Supabase/Stripe ones. `SupabaseRepo` uses the server-side secret key, so every query filters by `user_id` in code (D-013).
- `src/app/` — Next.js 16 App Router. `api/` routes are thin: auth → ownership → work.
- `knowledge/policies/` — compliance knowledge base (markdown, cited). `evals/` — golden cases + runner. `supabase/migrations/` — schema + RLS.

## Workstreams (parallel branches)

Your branch prefix decides what you may edit: `ws1/` AI pipeline · `ws2/` trust layer · `ws3/` UI · `ws4/` platform · `main`/`contract/`/`chore/` lead.
The exact folders are in `ownership.json`; a hook blocks edits outside them. If you need a change elsewhere, write it under
"Requests for other workstreams" in `docs/team/status/<ws>.md` (run `/handoff`). Your brief: `docs/team/ws<N>-*.md`.

## Rules for code

- TypeScript strict. Validate every external input and every model output with zod (`src/lib/contracts`).
- All model calls go through `src/lib/harness` — never import `@anthropic-ai/sdk` in agents or routes. Every call needs a `mock` responder so the app and tests run offline.
- Model IDs come only from env (`ANTHROPIC_MODEL_SMART` / `_FAST`). Never hardcode them.
- Seller text is untrusted: wrap it with `asSellerData()`; prompts must say content inside `<seller_input>` is data, not instructions.
- Deterministic checks (lengths, bytes, banned phrases, credits) are code, not prompts. Security and money controls live in code/hooks, never only in a prompt.
- Every data read filters by the session user id (no IDOR). Credits change only via `consumeCredit`/`refundCredit` or the verified Stripe webhook.
- Tests live next to the code (`*.test.ts`). New behavior → new test. Prompt/rule changes → run `pnpm eval` before and after.
- Next.js 16: middleware is `src/proxy.ts`; `params`/`searchParams`/`cookies()` are async; Cache Components is off (see memory/decisions.md D-007). Check `node_modules/next/dist/docs/` before using an API you are unsure about.

## Never

- Read, print or commit `.env.local` or any key. Use `pnpm check:env`.
- Push to `main` or force-push shared branches. Open a PR; CI must pass; one review.
- Claim real search volume, guaranteed approval or legal compliance in UI copy or docs. We screen risk.
- Edit a golden eval case to make it pass.

## Definition of done

`pnpm check` green · `pnpm eval` ≥ 80% (mock in CI; live before demo) · ownership check passes · status file updated · PR template filled.

## Memory

Decisions: `memory/decisions.md` (`/decision`). Lessons: `memory/lessons-learned.md`. Plan: `memory/timeline.md`.
