# PRD — ListWise AI

**An agentic AI platform for cross-border e-commerce listing localization, optimization and compliance.**
_Turn Chinese product information into localized, search-ready and compliance-reviewed US marketplace listings._

|              |                                                        |
| ------------ | ------------------------------------------------------ |
| Status       | MVP in build (capstone)                                |
| Owner        | Lead (heruis) · workstreams WS1–WS4                    |
| Course       | UCLA 440 Building LLM Applications — Module 4 capstone |
| Last updated | 2026-10-18                                             |

---

## 1. Problem

Chinese small and mid-size sellers list thousands of products on Amazon US. Their source material is Chinese supplier copy written for a domestic audience: literal translation produces awkward English, and the copy is full of claims that are normal in China but risky in the US — "FDA认证" (FDA certified), "100%安全" (100% safe), "美国销量第一" (#1 seller in the US), "抗菌" (antibacterial), "环保可降解" (eco-friendly, biodegradable).

Today a seller either:

- pastes the text into ChatGPT, which translates the claims faithfully (and so turns them into US-facing violations) and knows nothing about the platform's field rules; or
- pays a freelancer or agency per listing, which is slow and still not compliance-aware.

The cost is listing suppression, account warnings, returns from misleading copy, and hours of manual rework per product.

**Why AI is the right tool:** the job needs language understanding (extracting facts from messy Chinese copy), generation (natural US copy), and judgment (is this claim supported by the evidence?). Rules alone cannot write a listing; an LLM alone cannot be trusted with compliance. ListWise combines both.

**Why not just ChatGPT:** ChatGPT has no platform rule engine, no claim verification against the seller's evidence, no cited policy knowledge base, no measurable quality score and no workflow to edit, re-check and export. That is the product.

## 2. Target users

| Persona                                  | Description                                                                       | Job to be done                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Primary: Lin, owner-operator**         | 1–10 person Shenzhen/Yiwu seller, 50–500 SKUs, reads English but writes it slowly | "Get a listing I can publish today without getting flagged."                          |
| Secondary: listing operator at an agency | Produces listings for several brands                                              | "Do 30 listings a day with consistent quality and a paper trail of what was checked." |

## 3. Goals and non-goals

**Goals (MVP)**

1. Produce a complete Amazon US listing (title, 5 bullets, description, backend search terms) from Chinese input in under 2 minutes.
2. Detect and resolve risky marketing claims: each claim is _verified_, _unverified_ (needs evidence) or _restricted_, with a policy citation and a suggested fix.
3. Score listing quality 0–100 with transparent components, and show before/after when the seller provides their current listing.
4. Run end to end as a paid SaaS: sign-up, free runs, Stripe subscription, live URL.

**Non-goals (MVP)**

- Publishing to Amazon via SP-API · TikTok Shop listings (stretch) · real search-volume data (keywords are labeled _AI-suggested_) · image analysis (stretch, and image-inferred attributes are never treated as confirmed facts) · bulk/batch runs · legal advice or a guarantee of marketplace approval.

## 4. User journey (the 3-minute demo)

1. **Sign up / sign in** → lands on the dashboard with 3 free runs.
2. **New listing** → pastes Chinese product name, description, specs; optionally evidence (test reports) and their current English listing.
3. **Generate** → watches the agent pipeline stream live: guardrails → extraction → keywords → localization (checks its own draft against platform rules) → compliance (searches the policy base, looks up evidence) → policy gate → quality score.
4. **Review** → sees the listing, a compliance table ("FDA approved" → restricted → "made with food-grade silicone", with a link to the FDA source), what was fixed automatically, what needs their confirmation, and the score (e.g. 45 → 85).
5. **Edit & re-check** → edits any field; saving re-runs platform rules and the claim screen.
6. **Export** CSV / TXT / JSON.
7. **Out of runs** → upgrade to Pro via Stripe Checkout (test mode) → credits refreshed by the webhook.
8. **Trace** → the "View agent trace" page shows every stage, model call, tool call, tokens and cost (for graders and for debugging).

## 5. Functional requirements

### 5.1 Accounts & billing (WS4)

| ID  | Requirement                                                      | Acceptance                                                                                                       |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| F-1 | Email/password sign-up and sign-in (Supabase Auth)               | New user can sign up, confirm, sign in, sign out; protected pages redirect to /login                             |
| F-2 | Free plan: 3 runs; Pro: $9.99/month, 50 runs per period          | Profile row created on sign-up with 3 credits                                                                    |
| F-3 | Atomic credit use; refund when a run fails for a system reason   | 6 concurrent runs on 3 credits → exactly 3 succeed; failed run → credit returned; blocked input → no credit used |
| F-4 | Stripe Checkout (test mode), Customer Portal                     | Test card 4242… upgrades the account                                                                             |
| F-5 | Idempotent, signature-verified webhook grants/renews/cancels Pro | Replaying the same event changes nothing; unsigned request → 400                                                 |

### 5.2 Listing pipeline (WS1 + WS2)

| ID   | Requirement                                                                                                                                                                    | Acceptance                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| F-10 | Input form: product name, description, specs, evidence, brand, category, marketplace, optional current listing                                                                 | Validation messages per field                                                                       |
| F-11 | Input guardrails: block prompt injection and prohibited products; redact contact details                                                                                       | Golden cases `prompt-injection-blocked`, `prohibited-vape-blocked`, `contact-details-redacted` pass |
| F-12 | Extraction: facts with Chinese source quotes; claims separated from facts; missing info listed                                                                                 | Every fact quote appears in the input (grounding check)                                             |
| F-13 | Keywords: 3–5 primary, 5–15 secondary, labeled AI-suggested                                                                                                                    | No brand names / promotional words                                                                  |
| F-14 | Localization: platform-specific listing that passes the rule engine; rewrite, never truncate                                                                                   | Validation passes on golden cases                                                                   |
| F-15 | Compliance: per-claim status, risk, action, suggested fix, policy citations from the knowledge base                                                                            | Golden `must_flag` claims detected; every restricted claim has a citation                           |
| F-16 | Policy gate: apply fixes, strip anything still restricted, re-validate; PASS/FAIL + needs-review list                                                                          | No restricted phrase in any final listing (golden `must_not_appear`)                                |
| F-17 | Quality score: 5 weighted components (keyword relevance 25, information coverage 25, naturalness 20, claim verification 20, format 10) + baseline score of the current listing | Score explains each component                                                                       |
| F-18 | Streaming progress per stage                                                                                                                                                   | UI shows each stage and tool call live                                                              |

### 5.3 Review & export (WS3)

| ID   | Requirement                                          | Acceptance                                                  |
| ---- | ---------------------------------------------------- | ----------------------------------------------------------- |
| F-20 | Editable listing with live character/byte counters   | Counters match rule engine limits                           |
| F-21 | Save re-validates and re-screens claims              | Typing "FDA approved" and saving shows a restricted warning |
| F-22 | Export CSV (Amazon template column names), TXT, JSON | CSV opens in Excel/Sheets; formula injection neutralized    |
| F-23 | Dashboard of past listings with status and score     |                                                             |
| F-24 | Trace page per run                                   | Spans with timings, tokens, cost                            |
| F-25 | Responsive (phone width), loading/empty/error states | No dead ends on any error                                   |

## 6. AI requirements & quality bar

- **Models:** two tiers set by env — _smart_ (localization, compliance) and _fast_ (extraction, keywords, judge). No model IDs in code.
- **Contracts:** every model output is schema-enforced (structured outputs / strict tools) and re-validated with zod.
- **Budgets per run:** ≤ 24 model calls, ≤ 250k tokens, ≤ $0.75, ≤ 240 s; compliance ≤ 4 policy searches.
- **Evals:** ≥ 80% of golden cases pass (live mode) before the demo; retrieval recall@3 ≥ 0.9.
- **Observability:** every run stores spans (stage, model call, tool call) with redacted inputs/outputs, tokens, cost.

## 7. Pricing & unit economics

| Plan | Price       | Runs                  | Notes                               |
| ---- | ----------- | --------------------- | ----------------------------------- |
| Free | $0          | 3 (one-time)          | Enough to see the full flow         |
| Pro  | $9.99/month | 50 per billing period | Fair-use cap keeps API cost bounded |

Target model cost ≤ $0.08 per run (measured from traces; adjust the cap with real data). At 50 runs, worst-case cost ≈ $4 → healthy margin on $9.99.

## 8. Success metrics

| Metric                                              | Target (capstone)                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| Golden eval pass rate (live)                        | ≥ 80%                                                                     |
| Restricted claims leaking to final listing (golden) | 0                                                                         |
| Median run time (live)                              | < 90 s                                                                    |
| Median cost per run                                 | < $0.08                                                                   |
| Before→after score uplift on cases with a baseline  | ≥ +20 points                                                              |
| Seller validation                                   | 2–3 real sellers interviewed; willingness to pay recorded in the write-up |

## 9. Risks

| Risk                                        | Mitigation                                                     | Owner      |
| ------------------------------------------- | -------------------------------------------------------------- | ---------- |
| Model misses a restricted claim             | Lexicon backstop + output gate + evals                         | WS2        |
| Policy summaries wrong or outdated          | Cite sources; `verified` flag; WS2 verifies each doc           | WS2        |
| Vercel timeout on long runs                 | Streaming, budgets, `maxDuration=300`; queue later             | WS4 / lead |
| Double-spend of credits / duplicate webhook | Atomic SQL function; event-id idempotency                      | WS4        |
| Prompt injection via product text           | Input screen, `<seller_input>` data tags, tools capped in code | WS2        |
| Scope creep (TikTok, SEO data, images)      | Explicit non-goals; lead approves scope changes                | Lead       |
| Business demand unproven                    | Interview 2–3 sellers in week 2; record in write-up            | Lead       |

## 10. Milestones

See `memory/timeline.md`. Week 1 foundation → Week 3 integrated on a live URL → Week 4 hardened (≥80% live evals) → Week 5 write-up + demo.

## 11. Later (post-MVP)

TikTok Shop US · image → attribute suggestions (marked unconfirmed) · bulk CSV import · real keyword data provider · Amazon SP-API publishing · Chinese UI · team accounts.
