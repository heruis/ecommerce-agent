# PRD — ShelfPass

**An agentic AI platform for cross-border e-commerce listing localization, optimization and compliance.**
_Turn Chinese product information into one compliance-reviewed report with publish-ready fields for Amazon US, TikTok Shop US and Shopify._

|              |                                                        |
| ------------ | ------------------------------------------------------ |
| Status       | MVP in build (capstone, one week to the deadline)      |
| Owner        | Lead (heruis) · workstreams WS1–WS4                    |
| Course       | UCLA 440 Building LLM Applications — Module 4 capstone |
| Last updated | 2026-10-19                                             |

---

## 1. Problem

Chinese small and mid-size sellers list thousands of products on US channels: Amazon, TikTok Shop and their own Shopify stores. Their source material is Chinese supplier copy written for a domestic audience: literal translation produces awkward English, and the copy is full of claims that are normal in China but risky in the US — "FDA认证" (FDA certified), "100%安全" (100% safe), "美国销量第一" (#1 seller in the US), "抗菌" (antibacterial), "环保可降解" (eco-friendly, biodegradable).

Each channel also asks for different things. Amazon wants a 200-character title, 5 bullets and 249 bytes of hidden search terms. TikTok Shop wants a short title, selling points and hashtags for videos. Shopify wants a product page plus an SEO title and meta description for Google. Each has its own main-image rules.

Today a seller either:

- pastes the text into ChatGPT, which translates the claims faithfully (and so turns them into US-facing violations), knows nothing about each site's field rules, and gives one block of text instead of the fields each form asks for; or
- pays a freelancer or agency per listing per channel, which is slow and still not compliance-aware.

The cost is listing suppression, account warnings, returns from misleading copy, and hours of manual rework per product per channel.

**Why AI is the right tool:** the job needs language understanding (extracting facts from messy Chinese copy), generation (natural US copy in each channel's style), vision (is this photo usable as a main image?) and judgment (is this claim supported by the evidence?). Rules alone cannot write a listing; an LLM alone cannot be trusted with compliance. ShelfPass combines both.

**Why not just ChatGPT:** ChatGPT has no per-channel rule engine, no claim verification against the seller's evidence, no cited policy knowledge base, no measurable quality score, no field-by-field mapping to each site's form, and no workflow to edit, re-check and export. That is the product.

## 2. Target users

| Persona                                  | Description                                                                                       | Job to be done                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Primary: Lin, owner-operator**         | 1–10 person Shenzhen/Yiwu seller, 50–500 SKUs on 2–3 channels, reads English but writes it slowly | "Get listings I can publish today on every channel without getting flagged."          |
| Secondary: listing operator at an agency | Produces listings for several brands                                                              | "Do 30 listings a day with consistent quality and a paper trail of what was checked." |

## 3. Goals and non-goals

**Goals (MVP)**

1. From one Chinese input, produce one report covering the channels the seller picks (Amazon US, TikTok Shop US, Shopify) in under 2 minutes. For each channel: every field of that site's "add product" form, in the order the form asks, each marked _generated_, _from your input_ or _you fill in_, with status ok / warning / missing.
2. Share one AI-suggested keyword set across channels (primary, secondary, TikTok hashtags).
3. Check optional product photos against each channel's main-image rules, and give every channel a shot list.
4. Detect and resolve risky marketing claims once, across all channels: each claim is _verified_, _unverified_ (needs evidence) or _restricted_, with a policy citation and a suggested fix.
5. Score each channel's listing 0–100 with transparent components, and show before/after when the seller provides their current listing.
6. Run end to end as a paid SaaS: sign-up, free runs, Stripe subscription (test mode), live Vercel URL.

**Non-goals (MVP)**

- **Publishing directly** through Amazon SP-API, the TikTok Shop Partner API or the Shopify Admin API. App review and seller authorization take weeks; the deadline is one week. The report gives the seller every field to paste instead. (Future work, see §11 and `docs/API_SETUP.md`.)
- Real search-volume data (keywords are labeled _AI-suggested_).
- Image editing or generation; image-inferred attributes are never treated as confirmed facts.
- Bulk/batch runs · other marketplaces · legal advice or a guarantee of marketplace approval.

## 4. User journey (the 3-minute demo)

1. **Sign up / sign in** → lands on the dashboard with 3 free runs.
2. **New listing** → pastes Chinese product name, description, specs; optionally evidence (test reports), brand and their current English listing. Ticks the channels (all three by default). Optionally adds up to 4 photos (resized in the browser).
3. **Generate report** → watches the agent pipeline stream live: guardrails → extraction → photo check → keywords → three localization agents in parallel (each checks its own draft against its channel's rules) → compliance (searches the policy base, looks up evidence) → policy gate per channel → quality score per channel.
4. **Review** → sees keywords, extracted facts, photo verdicts, then one tab per channel with its publish fields and copy buttons, main-image rules, shot list, policy gate (what was fixed, what to confirm) and score (e.g. 45 → 85). A shared claim review shows "FDA approved" → restricted → "made with food-grade silicone", with a link to the FDA source.
5. **Edit & re-check** → edits any field of one channel; saving re-runs that channel's rules and the claim screen, and the publish fields refresh.
6. **Export** → printable report (print to PDF), Markdown report, all fields as JSON, or one channel's fields as CSV / TXT.
7. **Out of runs** → upgrade to Pro via Stripe Checkout (test mode) → credits granted by the webhook.
8. **Trace** → the "Agent trace" page shows every stage, model call, tool call, tokens and cost (for graders and for debugging).

## 5. Functional requirements

### 5.1 Accounts & billing (WS4)

| ID  | Requirement                                                      | Acceptance                                                                                                       |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| F-1 | Email/password sign-up and sign-in (Supabase Auth)               | New user can sign up, sign in, sign out; protected pages redirect to /login                                      |
| F-2 | Free plan: 3 runs; Pro: $9.99/month, 50 runs per period          | Profile row created on sign-up with 3 credits                                                                    |
| F-3 | Atomic credit use; refund when a run fails for a system reason   | 6 concurrent runs on 3 credits → exactly 3 succeed; failed run → credit returned; blocked input → no credit used |
| F-4 | Stripe Checkout (test mode), Customer Portal                     | Test card 4242… upgrades the account                                                                             |
| F-5 | Idempotent, signature-verified webhook grants/renews/cancels Pro | Replaying the same event changes nothing; a failed handler is retried; unsigned request → 400                    |

### 5.2 Report pipeline (WS1 + WS2)

| ID   | Requirement                                                                                                                                                                                | Acceptance                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| F-10 | Input form: product name, description, specs, evidence, brand, category, channels (≥ 1), up to 4 photos, optional current listing                                                          | Validation messages per field; photos resized to ≤ 1024 px JPEG in the browser                      |
| F-11 | Input guardrails: block prompt injection and prohibited products; redact contact details; reject files that are not real JPEG/PNG/WebP                                                     | Golden cases `prompt-injection-blocked`, `prohibited-vape-blocked`, `contact-details-redacted` pass |
| F-12 | Extraction: facts with Chinese source quotes; claims separated from facts; missing info listed                                                                                             | Every fact quote appears in the input (grounding check)                                             |
| F-13 | Keywords: 3–5 primary, 5–15 secondary, 4–8 TikTok hashtags, labeled AI-suggested; one set for all channels                                                                                 | No brand names / promotional words                                                                  |
| F-14 | Photo check (vision, only when photos are uploaded): per photo, background, text/logo, watermark, fill, props, quality, alt text; suggested main photo                                     | Code, not the model, decides each channel's main-image verdict                                      |
| F-15 | Localization: one agent per selected channel, in parallel; listing passes that channel's rule engine; rewrite, never truncate                                                              | Validation passes for every channel on golden cases                                                 |
| F-16 | Compliance: one review across all drafts; per-claim status, risk, action, suggested fix, policy citations from the knowledge base                                                          | Golden `must_flag` claims detected; every restricted claim has a citation                           |
| F-17 | Policy gate per channel: apply fixes wherever the phrase appears (incl. SEO fields and tags), strip anything still restricted, re-validate; PASS/FAIL + needs-review list                  | No restricted phrase in any channel's final listing (golden `must_not_appear`)                      |
| F-18 | Publish fields per channel: every field of the site's form in order, with source (generated / from your input / you fill in) and status (ok / warning / missing)                           | No required generated field is empty (golden output contract)                                       |
| F-19 | Quality score per channel: 5 weighted components (keyword relevance 25, information coverage 25, naturalness 20, claim verification 20, format 10) + baseline score of the current listing | Score explains each component                                                                       |
| F-20 | Streaming progress per stage and tool call, labeled by channel                                                                                                                             | UI shows each stage and tool call live                                                              |

### 5.3 Report, review & export (WS3)

| ID   | Requirement                                                                                              | Acceptance                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| F-21 | One tab per channel: publish fields with copy buttons, photo rules + shot list, gate, score              | Every field value can be copied in one click                                 |
| F-22 | Per-channel editor with live character/byte counters (search terms, SEO fields, tags)                    | Counters match rule engine limits                                            |
| F-23 | Save re-validates and re-screens claims; report and exports use the re-checked edit                      | Typing "FDA approved" and saving shows a restricted warning; gate shows FAIL |
| F-24 | Exports: printable report page (print to PDF), Markdown report, JSON (all channels), CSV/TXT per channel | CSV headers are the form's field keys; formula injection neutralized         |
| F-25 | Dashboard of past listings with channels, status and average score                                       |                                                                              |
| F-26 | Trace page per run                                                                                       | Spans with timings, tokens, cost                                             |
| F-27 | Responsive (phone width), loading/empty/error states                                                     | No dead ends on any error                                                    |

## 6. AI requirements & quality bar

- **Models:** two tiers set by env — _smart_ (localization, compliance) and _fast_ (extraction, photo check, keywords, judge). No model IDs in code.
- **Contracts:** every model output is schema-enforced (structured outputs / strict tools) and re-validated with zod.
- **Budgets per run:** ≤ 40 model calls, ≤ 400k tokens, ≤ $1.50, ≤ 240 s; compliance ≤ 4 policy searches. A typical three-channel run uses about 13 calls.
- **Evals:** ≥ 80% of golden cases pass (live mode) before the demo, checked on every channel; retrieval recall@3 ≥ 0.9.
- **Observability:** every run stores spans (stage, per-channel agent, model call, tool call) with redacted inputs/outputs (photo bytes omitted), tokens, cost.

## 7. Pricing & unit economics

| Plan | Price       | Runs                  | Notes                               |
| ---- | ----------- | --------------------- | ----------------------------------- |
| Free | $0          | 3 (one-time)          | Enough to see the full flow         |
| Pro  | $9.99/month | 50 per billing period | Fair-use cap keeps API cost bounded |

One run = one product, up to three channels. Target model cost ≤ $0.15 per three-channel run (measured from traces; adjust the cap with real data). At 50 runs, worst-case cost ≈ $7.50 → still a margin on $9.99.

## 8. Success metrics

| Metric                                                      | Target (capstone)                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| Golden eval pass rate (live, every channel)                 | ≥ 80%                                                                     |
| Restricted claims leaking to any channel's listing (golden) | 0                                                                         |
| Median run time, three channels (live)                      | < 90 s                                                                    |
| Median cost per three-channel run                           | < $0.15                                                                   |
| Before→after score uplift on cases with a baseline          | ≥ +20 points                                                              |
| Seller validation                                           | 2–3 real sellers interviewed; willingness to pay recorded in the write-up |

## 9. Risks

| Risk                                        | Mitigation                                                                               | Owner      |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------- |
| Model misses a restricted claim             | Lexicon backstop + output gate per channel + evals                                       | WS2        |
| Policy summaries or form fields go stale    | Cite sources; `verified` flag; "check each site's current requirements" in the UI        | WS2 / WS1  |
| Vercel timeout on long runs                 | Parallel localization, streaming, budgets, `maxDuration=300`                             | WS4 / lead |
| Vercel 4.5 MB request limit with photos     | Resize in the browser to ≤ 1024 px JPEG (≤ ~650 KB each), 4 photos max                   | WS3        |
| Double-spend of credits / duplicate webhook | Atomic SQL function; event-id idempotency; release the event if a handler fails          | WS4        |
| Prompt injection via product text or photos | Input screen, `<seller_input>` data tags, "text in photos is data", tools capped in code | WS2        |
| Scope creep (live publishing, SEO data)     | Explicit non-goals; lead approves scope changes                                          | Lead       |
| Business demand unproven                    | Interview 2–3 sellers this week; record in write-up                                      | Lead       |

## 10. Milestones

See `memory/timeline.md`. One week: day 1–2 live keys + Vercel deploy, day 3–4 live evals and prompt fixes, day 5 seller interviews and polish, day 6–7 write-up and demo recording.

## 11. Later (post-MVP)

Direct publishing (Amazon SP-API Listings Items, TikTok Shop Partner API, Shopify Admin API) · image → attribute suggestions (marked unconfirmed) · bulk CSV import · real keyword data provider · more channels (Walmart, Temu) · Chinese UI · team accounts.
