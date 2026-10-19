# ShelfPass — capstone write-up

_Max 4–5 pages. Lead integrates; each workstream drafts its section in `sections/` and the lead edits for one voice. Target ≈ 2,200 words total. Numbers beat adjectives: every claim of quality cites an eval result or a trace._

**Team:** _names and roles_ · **Live URL:** _https://…_ · **Repo:** https://github.com/heruis/ecommerce-agent · **Demo video:** _link_

---

## 1. Problem and users (lead · ½ page)

- Who: Chinese cross-border sellers listing on Amazon US, TikTok Shop US and their own Shopify stores (persona from `docs/PRD.md`).
- Pain: literal translation + China-normal claims ("FDA认证", "100%安全", "销量第一") → suppressed listings, rework; and every channel's form asks for different fields and photos.
- Why AI, and why not just ChatGPT (per-channel rules, field-by-field output, verification, citations, score, workflow).
- Evidence of demand: 2–3 seller interviews (quotes, willingness to pay).

## 2. Solution and demo flow (WS3 · ½ page)

→ `sections/ws3-product.md`. The user journey in 6 steps with 2 screenshots (a channel tab with its publish fields, the claim review with before/after score). Say plainly that the output is a report the seller pastes from, and why live publishing was cut (approval timelines vs a one-week deadline).

## 3. Architecture (lead + WS4 · 1 page)

- The four-layer diagram from `docs/ARCHITECTURE.md` (frontend · API · AI backend · Supabase, on Vercel, Stripe).
- Ports and adapters: mock/memory → live, one env switch each; why that let five people work in parallel.
- Data model and security (server-side secret key with `user_id` filters + RLS, atomic credits, idempotent webhook) → `sections/ws4-platform.md`.

## 4. AI design (WS1 · 1 page)

→ `sections/ws1-ai-design.md`. Workflow vs agent (why a hub with two agentic stages), the stages, one ReAct localization agent per channel in parallel with a rule-engine tool generated from the same config as the form fields, the photo check (model describes, code decides), model tiers, cost and latency per three-channel run.

## 5. Trust: compliance, guardrails and evals (WS2 · 1 page)

→ `sections/ws2-trust.md`. Agentic RAG with citations (one review across all channels), the three guardrail layers incl. the per-channel gate and re-checked edits, defense in depth for claims, eval method and **results** (golden pass rate live on every channel, retrieval recall@3/MRR, judge calibration), one failure the evals caught.

## 6. Key design decisions (lead · ⅓ page)

Pick the 4 most important from `memory/decisions.md`, one sentence each: decision → why → trade-off.

## 7. Lessons learned and next steps (all · ½ page)

From `memory/lessons-learned.md`: 3 lessons. Next steps from `docs/PRD.md` §11, prioritized, with what we would measure.
