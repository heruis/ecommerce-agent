# ListWise AI — capstone write-up

_Max 4–5 pages. Lead integrates; each workstream drafts its section in `sections/` and the lead edits for one voice. Target ≈ 2,200 words total. Numbers beat adjectives: every claim of quality cites an eval result or a trace._

**Team:** _names and roles_ · **Live URL:** _https://…_ · **Repo:** https://github.com/heruis/ecommerce-agent · **Demo video:** _link_

---

## 1. Problem and users (lead · ½ page)

- Who: Chinese cross-border sellers listing on Amazon US (persona from `docs/PRD.md`).
- Pain: literal translation + China-normal claims ("FDA认证", "100%安全", "销量第一") → suppressed listings, rework.
- Why AI, and why not just ChatGPT (rules, verification, citations, score, workflow).
- Evidence of demand: 2–3 seller interviews (quotes, willingness to pay).

## 2. Solution and demo flow (WS3 · ½ page)

→ `sections/ws3-product.md`. The user journey in 6 steps with 2 screenshots (compliance table, before/after score).

## 3. Architecture (lead + WS4 · 1 page)

- The four-layer diagram from `docs/ARCHITECTURE.md` (frontend · API · AI backend · Supabase, on Vercel, Stripe).
- Ports and adapters: mock/memory → live, one env switch each; why that let five people work in parallel.
- Data model and security (RLS, atomic credits, idempotent webhook) → `sections/ws4-platform.md`.

## 4. AI design (WS1 · 1 page)

→ `sections/ws1-ai-design.md`. Workflow vs agent (why a hub with two agentic stages), the six stages, ReAct localization with a rule-engine tool, model tiers, cost per run.

## 5. Trust: compliance, guardrails and evals (WS2 · 1 page)

→ `sections/ws2-trust.md`. Agentic RAG with citations, the three guardrail layers, defense in depth for claims, eval method and **results** (golden pass rate live, retrieval recall@3/MRR, judge calibration), one failure the evals caught.

## 6. Key design decisions (lead · ⅓ page)

Pick the 4 most important from `memory/decisions.md`, one sentence each: decision → why → trade-off.

## 7. Lessons learned and next steps (all · ½ page)

From `memory/lessons-learned.md`: 3 lessons. Next steps from `docs/PRD.md` §11, prioritized, with what we would measure.
