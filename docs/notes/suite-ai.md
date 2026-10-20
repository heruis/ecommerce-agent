# Compliance suite — AI design notes (for the lead's docs)

Features merged from the team's Listing Copilot prototype, rebuilt on ShelfPass's harness (tracer, budget, mocks, guardrails) instead of a second AI stack. Source: `src/lib/agents/{audit,appeal,explain}`, `src/lib/pipeline/{audit,appeal,tool-run,tool-route}.ts`, `src/lib/report/risk.ts`.

## Takedown-risk score (`report/risk.ts`)

- Deterministic, 0–100, computed from what is still in the copy: lexicon hits (restricted +40, unproven +10/+18), compliance findings still present, rule errors (+10 each, cap 30), warnings (+2, cap 8), untranslated Chinese (+15). Floors: any restricted claim ⇒ ≥ 60 (high), any unproven claim ⇒ ≥ 25 (medium). Levels: < 20 low, < 50 medium, else high.
- Added to every `ChannelView` (generated and edited copy), shown as a badge with reasons on each channel tab. Same input ⇒ same score, so before/after comparisons and evals are reproducible. Labeled as a screen of signals, not a prediction.

## Listing audit (`pipeline/audit.ts`) — 1 credit

`input_guardrails → extraction → compliance → localization → output_gate → scoring`, existing stage names so traces and progress UI work unchanged.

1. **Parse** the paste in code (`agents/audit/parse.ts`: labels in EN/ZH, bullet marks, hashtags). Only an unstructured paste goes to a fast-tier "structure" call, and every field it returns must be a verbatim substring of the paste (otherwise the parser's guess is kept) — the model cannot put words in the seller's mouth.
2. **Facts** via the existing extraction agent; **claims** via the existing compliance agent (agentic RAG, citations, lexicon backstop).
3. **Minimal fix**: smart-tier structured call (`auditFixSystem`) told to change only what `<problems>` lists. Minimality is then **enforced in code** (`keepUntouched`): any field without a rule violation or risky phrase keeps its original bytes. Deterministic repairs (`agents/audit/repair.ts`: shorten at boundaries, never mid-word; drop repeats/banned chars/CJK/links) run as a backstop, then the normal output gate.
4. **Before/after**: risk score and quality score (judge + `computeScore`) on both; a field-level diff with a reason per change.

- Mock mode: the fix is the compliance actions + deterministic repairs, so the whole flow runs offline.

## Takedown / appeal assistant (`pipeline/appeal.ts`) — 1 credit

`input_guardrails → compliance (appeal agent) → output_gate`.

- Smart-tier ReAct loop with `search_policy` (max 3) + strict `submit_appeal_analysis`. Explanations in the seller's interface language (`getLocale()` → zh/en); `appeal_text` always English.
- Code checks after the model (`enforceAppealRules`): citations must come from this run's retrieval log; warns when the appeal contains Chinese or says documents are "attached" while the seller listed none. A notice about counterfeits/trademarks is **not** blocked by the prohibited-product screen (only prompt injection is), because such notices legitimately name those things.

## Seller-language explanation (`agents/explain`) — free

- `POST /api/listings/:id/explain { platform }` → fast-tier structured `SellerExplanation` (summary, back-translation, one note per claim). Rate limited (10/min/user), small budget (3 calls). Code realigns notes to the compliance report order and bullets to the listing's bullet count. Panel on each channel tab: "Explain in Chinese / 用中文解释".

## Routes and money

- `POST /api/audit`, `POST /api/appeal`: auth → zod → deterministic pre-screen (blocked input is never charged) → rate limit (5/min) → atomic credit → `repo.createToolRun` → SSE progress (`tool_started`, stage events, `tool_completed|tool_failed`) → save → refund on our own failure (`AgentError.refundable`), never on a guardrail block. Shared in `pipeline/tool-route.ts`; tested in `tool-route.test.ts`.
- `GET /api/audit/:id`, `GET /api/appeal/:id`: owner-scoped (`repo.getToolRun(user.id, id)`).

## Evals

- `pnpm eval --suite audit` (6 cases): risk drops when problems exist, expected claim types flagged and restricted ones cited, no risky phrase left, fixed listing passes rules, **untouched fields byte-identical**, LLM-call budget.
- `pnpm eval --suite appeal` (4 cases): policy area matches, citations exist in the knowledge base, English appeal, explanation language, no promised documents, call budget.
- Mock: audit 6/6, appeal 4/4. Both suites are part of `pnpm eval` (`all`) and gate the exit code at 80%.

## Gaps / next

- No trademark/IP policy doc in the knowledge base yet (the trademark eval expects no citation) — WS2 could add one.
- Audit runs one channel at a time; a "check all three channels" mode would reuse the same pipeline.
