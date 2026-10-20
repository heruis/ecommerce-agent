# PRD — ShelfPass

**An agentic AI platform for cross-border e-commerce listing localization, optimization and compliance.**
_Turn Chinese product information into one compliance-reviewed report with publish-ready fields for Amazon US, TikTok Shop US and Shopify — and keep those listings online with audits, takedown help and an evidence library._

|              |                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| Status       | MVP live; site v2 (compliance suite, new site, bilingual UI, verification, credit packs) on branch `feat/site-v2` |
| Owner        | Lead (heruis) · workstreams WS1–WS4                                                                               |
| Course       | UCLA 440 Building LLM Applications — Module 4 capstone                                                            |
| Last updated | 2026-10-20                                                                                                        |

---

## 1. Problem

Chinese small and mid-size sellers list thousands of products on US channels: Amazon, TikTok Shop and their own Shopify stores. Their source material is Chinese supplier copy written for a domestic audience: literal translation produces awkward English, and the copy is full of claims that are normal in China but risky in the US — "FDA认证" (FDA certified), "100%安全" (100% safe), "美国销量第一" (#1 seller in the US), "抗菌" (antibacterial), "环保可降解" (eco-friendly, biodegradable).

Each channel also asks for different things. Amazon wants a 200-character title, 5 bullets and 249 bytes of hidden search terms. TikTok Shop wants a short title, selling points and hashtags for videos. Shopify wants a product page plus an SEO title and meta description for Google. Each has its own main-image rules.

Today a seller either:

- pastes the text into ChatGPT, which translates the claims faithfully (and so turns them into US-facing violations), knows nothing about each site's field rules, and gives one block of text instead of the fields each form asks for; or
- pays a freelancer or agency per listing per channel, which is slow and still not compliance-aware.

The cost is listing suppression, account warnings, returns from misleading copy, and hours of manual rework per product per channel. When a listing is removed, the notice arrives in English policy language the seller struggles to read, and they don't know which words triggered it or what to send back.

**Why AI is the right tool:** the job needs language understanding (extracting facts from messy Chinese copy), generation (natural US copy in each channel's style), vision (is this photo usable as a main image?) and judgment (is this claim supported by the evidence?). Rules alone cannot write a listing; an LLM alone cannot be trusted with compliance. ShelfPass combines both.

**Why not just ChatGPT:** ChatGPT has no per-channel rule engine, no claim verification against the seller's evidence, no cited policy knowledge base, no measurable quality or takedown-risk score, no field-by-field mapping to each site's form, no memory of the documents a seller holds, and no workflow to edit, re-check, audit, appeal and export. That is the product.

## 2. Target users

| Persona                                  | Description                                                                                       | Job to be done                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Primary: Lin, owner-operator**         | 1–10 person Shenzhen/Yiwu seller, 50–500 SKUs on 2–3 channels, reads English but writes it slowly | "Get listings I can publish today on every channel without getting flagged."          |
| Secondary: listing operator at an agency | Produces listings for several brands                                                              | "Do 30 listings a day with consistent quality and a paper trail of what was checked." |
| Also: Lin after a takedown               | A live listing was suppressed or removed; the notice is in English policy language                | "Tell me what triggered it, what to change, and what to send back — in Chinese."      |

## 3. Goals and non-goals

**Goals (MVP)**

1. From one Chinese input, produce one report covering the channels the seller picks (Amazon US, TikTok Shop US, Shopify) in under 2 minutes. For each channel: every field of that site's "add product" form, in the order the form asks, each marked _generated_, _from your input_ or _you fill in_, with status ok / warning / missing.
2. Share one AI-suggested keyword set across channels (primary, secondary, TikTok hashtags).
3. Check optional product photos against each channel's main-image rules, and give every channel a shot list.
4. Detect and resolve risky marketing claims once, across all channels: each claim is _verified_, _unverified_ (needs evidence) or _restricted_, with a policy citation and a suggested fix.
5. Score each channel's listing 0–100 with transparent components, and show before/after when the seller provides their current listing.
6. Run end to end as a paid SaaS: sign-up with email verification, free credits, Stripe subscription and one-time credit packs (test mode), live Vercel URL.
7. **Compliance suite** (merged from the team's Listing Copilot prototype, D-016): audit a live listing (risk and quality before → after, smallest fix); explain a takedown notice and draft an appeal; keep an evidence library; give every channel a takedown-risk score; explain any report in Chinese.
8. Show the seller what the listing will look like: marketplace-style previews (Amazon, TikTok Shop, Shopify + Google) on the site and inside each channel tab.
9. A bilingual interface (English / 简体中文) that the seller can switch before signing in (D-018).

**Non-goals (MVP)**

- **Publishing directly** through Amazon SP-API, the TikTok Shop Partner API or the Shopify Admin API. App review and seller authorization take weeks; the deadline is one week. The report gives the seller every field to paste instead. (Future work, see §11 and `docs/API_SETUP.md`.)
- Real search-volume data. Keywords are labeled _AI-suggested_; phrases that also appear in Amazon's own search-box suggestions get a badge, which is a signal, not volume.
- Image editing or generation; image-inferred attributes are never treated as confirmed facts.
- Bulk/batch runs · other marketplaces · storing evidence files themselves (the library stores the document's details, not the PDF) · legal advice or a guarantee of marketplace approval.

## 4. User journey (the 3-minute demo)

1. **Landing → pricing** → the "How it works" picture shows a supplier note becoming an Amazon-style page, a TikTok Shop-style phone page and a Google result. Pricing is its own page.
2. **Sign up** → email + password → enters the 6-digit code from the email (or clicks the link) → dashboard with 3 free credits. Phone sign-in by SMS code also works when an SMS provider is configured.
3. **Evidence library** (optional) → adds the SGS report they hold, with the claims it supports and its expiry date.
4. **New report** → pastes Chinese product name, description, specs; picks documents from the evidence library; brand and current English listing optional. Ticks the channels (all three by default). Optionally adds up to 4 photos (resized in the browser, white border measured).
5. **Generate report** (1 credit) → watches the agent pipeline stream live: guardrails → extraction → photo check → keywords (with Amazon search-box phrases in live mode) → three localization agents in parallel → compliance → policy gate per channel → score per channel.
6. **Review** → keywords, extracted facts, photo verdicts, then one tab per channel with its publish fields and copy buttons, takedown-risk badge, main-image rules, shot list, policy gate and score (e.g. 45 → 85). **Show preview** renders that channel's copy in a marketplace-style page. A shared claim review shows "FDA approved" → restricted → "made with food-grade silicone", with a link to the FDA source.
7. **Explain in Chinese** (free) → summary, back-translation and one note per claim, in 简体中文.
8. **Edit & re-check** → edits any field of one channel; saving re-runs that channel's rules and the claim screen, and the publish fields, risk and preview refresh.
9. **Export** → printable report (print to PDF), Markdown report, all fields as JSON, or one channel's fields as CSV / TXT.
10. **Audit a live listing** (1 credit) → pastes an existing listing → risk 82 → 2 with the two fields that changed and why.
11. **Takedown help** (1 credit) → pastes a removal notice → policy area, likely cause, fix steps, documents needed, English appeal letter with copy button.
12. **Out of credits** → buys a credit pack ($4.99, 20 credits) or Pro via Stripe Checkout (test mode) → credits granted by the webhook.
13. **Account** → verify a phone number, change password, download all data, delete the account.
14. **Trace** → the "Agent trace" page shows every stage, model call, tool call, tokens and cost (for graders and for debugging).

## 5. Functional requirements

### 5.1 Accounts & billing (WS4)

| ID  | Requirement                                                                                                                            | Acceptance                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-1 | Email/password sign-up with a 6-digit email code or link; sign-in; password reset; phone sign-in by SMS code (Supabase Auth)           | New user verifies the code and lands on the dashboard; unconfirmed sign-in re-sends the code; protected pages redirect to /login; `next` redirects stay on our site |
| F-2 | Free: 3 credits; credit pack: $4.99 for 20 (one-time, never expire); Pro: $9.99/month, balance topped up to at least 50 each period    | Profile row created on sign-up with 3 credits; 1 credit = one report, audit or appeal                                                                               |
| F-3 | Atomic credit use; refund when a run fails for a system reason                                                                         | 6 concurrent runs on 3 credits → exactly 3 succeed; failed run → credit returned; blocked input → no credit used                                                    |
| F-4 | Stripe Checkout (test mode) for Pro and credit packs, Customer Portal                                                                  | Test card 4242… upgrades the account or adds 20 credits                                                                                                             |
| F-5 | Idempotent, signature-verified webhook: pack → +20; Pro start/renewal → max(balance, 50); cancel → Free, balance kept                  | Replaying the same event changes nothing; a failed handler is retried; unsigned request → 400                                                                       |
| F-6 | Account page: verified email/phone badges, add and verify a phone, change password, language, download all data (JSON), delete account | Delete cancels an active subscription first, then removes all rows and the auth user                                                                                |
| F-7 | Pricing page and legal pages (terms, privacy, refunds)                                                                                 | Linked from the header and footer; available in English and Chinese                                                                                                 |

### 5.2 Report pipeline (WS1 + WS2)

| ID   | Requirement                                                                                                                                                                                                                                           | Acceptance                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| F-10 | Input form: product name, description, specs, evidence, brand, category, channels (≥ 1), up to 4 photos, optional current listing                                                                                                                     | Validation messages per field; photos resized to ≤ 1024 px JPEG in the browser                             |
| F-11 | Input guardrails: block prompt injection and prohibited products; redact contact details; reject files that are not real JPEG/PNG/WebP                                                                                                                | Golden cases `prompt-injection-blocked`, `prohibited-vape-blocked`, `contact-details-redacted` pass        |
| F-12 | Extraction: facts with Chinese source quotes; claims separated from facts; missing info listed                                                                                                                                                        | Every fact quote appears in the input (grounding check)                                                    |
| F-13 | Keywords: 3–5 primary, 5–15 secondary, 4–8 TikTok hashtags, labeled AI-suggested; one set for all channels. In live mode with Amazon selected, real Amazon search-box suggestions are given to the agent as data; keywords that match one get a badge | No brand names / promotional words; a failed or blocked suggestion request never fails the run             |
| F-14 | Photo check (vision, only when photos are uploaded): per photo, background, text/logo, watermark, fill, props, quality, alt text; suggested main photo. The browser measures how white each photo's border is                                         | Code, not the model, decides each channel's main-image verdict; Amazon needs a measured ≥ 97% white border |
| F-15 | Localization: one agent per selected channel, in parallel; listing passes that channel's rule engine; rewrite, never truncate                                                                                                                         | Validation passes for every channel on golden cases                                                        |
| F-16 | Compliance: one review across all drafts; per-claim status, risk, action, suggested fix, policy citations from the knowledge base                                                                                                                     | Golden `must_flag` claims detected; every restricted claim has a citation                                  |
| F-17 | Policy gate per channel: apply fixes wherever the phrase appears (incl. SEO fields and tags), strip anything still restricted, re-validate; PASS/FAIL + needs-review list                                                                             | No restricted phrase in any channel's final listing (golden `must_not_appear`)                             |
| F-18 | Publish fields per channel: every field of the site's form in order, with source (generated / from your input / you fill in) and status (ok / warning / missing)                                                                                      | No required generated field is empty (golden output contract)                                              |
| F-19 | Quality score per channel: 5 weighted components (keyword relevance 25, information coverage 25, naturalness 20, claim verification 20, format 10) + baseline score of the current listing                                                            | Score explains each component                                                                              |
| F-20 | Streaming progress per stage and tool call, labeled by channel                                                                                                                                                                                        | UI shows each stage and tool call live                                                                     |

### 5.3 Report, review & export (WS3)

| ID   | Requirement                                                                                                    | Acceptance                                                                   |
| ---- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| F-21 | One tab per channel: publish fields with copy buttons, photo rules + shot list, gate, score                    | Every field value can be copied in one click                                 |
| F-22 | Per-channel editor with live character/byte counters (search terms, SEO fields, tags)                          | Counters match rule engine limits                                            |
| F-23 | Save re-validates and re-screens claims; report and exports use the re-checked edit                            | Typing "FDA approved" and saving shows a restricted warning; gate shows FAIL |
| F-24 | Exports: printable report page (print to PDF), Markdown report, JSON (all channels), CSV/TXT per channel       | CSV headers are the form's field keys; formula injection neutralized         |
| F-25 | Dashboard of past reports, audits and appeals, with quick actions and the credit balance                       |                                                                              |
| F-28 | Marketplace-style preview per channel (Amazon, TikTok Shop, Shopify + Google) from the current copy and photos | Labeled illustrative; no real logos                                          |
| F-29 | Interface in English and 简体中文, switchable before sign-in                                                   | Every key exists in both languages (unit test)                               |

### 5.4 Compliance suite (merged from Listing Copilot, D-016)

| ID   | Requirement                                                                                                                                                           | Acceptance                                                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-30 | Takedown-risk score 0–100 per channel, computed in code from risky claims still present, rule errors and leftover Chinese; low / medium / high with reasons           | Same input → same score; any restricted claim ⇒ high                                                                                              |
| F-31 | Audit a live listing (1 credit): parse the paste, review claims, smallest fix, risk and quality before → after, field-level diff with reasons                         | Audit evals: risk drops when problems exist; no restricted phrase left; fixed listing passes; untouched fields byte-identical                     |
| F-32 | Takedown & appeal help (1 credit): policy area, what happened, likely cause, severity, fix steps, documents needed, listing changes, English appeal letter, citations | Appeal evals: policy area matches; citations come from this run's retrieval; letter in English; no documents promised that the seller didn't list |
| F-33 | Evidence library: documents with issuer, number, claims supported and expiry; picker on the new-report form; expired documents left out                               | Owner-scoped; a library document makes a backed claim count as verified                                                                           |
| F-34 | Explain in Chinese (free, rate-limited): summary, back-translation, one note per reviewed claim                                                                       | Notes aligned to the claim review order                                                                                                           |
| F-26 | Trace page per run                                                                                                                                                    | Spans with timings, tokens, cost                                                                                                                  |
| F-27 | Responsive (phone width), loading/empty/error states                                                                                                                  | No dead ends on any error                                                                                                                         |

## 6. AI requirements & quality bar

- **Models:** two tiers set by env — _smart_ (localization, compliance, audit fix, appeal) and _fast_ (extraction, photo check, keywords, judge, explanations, structuring a messy audit paste). No model IDs in code.
- **Contracts:** every model output is schema-enforced (structured outputs / strict tools) and re-validated with zod.
- **Budgets per run:** ≤ 40 model calls, ≤ 400k tokens, ≤ $1.50, ≤ 240 s; compliance ≤ 4 policy searches. A typical three-channel run uses about 13 calls.
- **Evals:** ≥ 80% of golden cases pass (live mode) before the demo, checked on every channel; audit and appeal suites ≥ 80%; retrieval recall@3 ≥ 0.9.
- **Code decides, the model describes:** risk scores, main-image verdicts, "untouched fields stay identical" in audits and citation integrity in appeals are enforced in code.
- **Observability:** every run stores spans (stage, per-channel agent, model call, tool call) with redacted inputs/outputs (photo bytes omitted), tokens, cost.

## 7. Pricing & unit economics

| Plan        | Price       | Credits                                                      | Notes                               |
| ----------- | ----------- | ------------------------------------------------------------ | ----------------------------------- |
| Free        | $0          | 3 (one-time)                                                 | Enough to see the full flow         |
| Credit pack | $4.99, once | 20, never expire                                             | For sellers who list in bursts      |
| Pro         | $9.99/month | balance topped up to at least 50 at the start of each period | Fair-use cap keeps API cost bounded |

One credit = one report (one product, up to three channels), one listing audit or one takedown analysis. Explanations in Chinese are free. Cancelling Pro keeps the balance; pack credits are never taken away by a Pro event (`docs/AUTH_SETUP.md` §7). Target model cost ≤ $0.15 per three-channel run (live: about $0.08–0.09 per golden case). At 50 runs, worst-case cost ≈ $7.50 → still a margin on $9.99.

## 8. Success metrics

| Metric                                                       | Target (capstone)                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Golden eval pass rate (live, every channel)                  | ≥ 80%                                                                     |
| Audit and appeal eval pass rate (mock now, live before demo) | ≥ 80% (mock: 6/6 audit, 4/4 appeal)                                       |
| Restricted claims leaking to any channel's listing (golden)  | 0                                                                         |
| Median run time, three channels (live)                       | < 90 s                                                                    |
| Median cost per three-channel run                            | < $0.15                                                                   |
| Before→after score uplift on cases with a baseline           | ≥ +20 points                                                              |
| Seller validation                                            | 2–3 real sellers interviewed; willingness to pay recorded in the write-up |

## 9. Risks

| Risk                                            | Mitigation                                                                                                                      | Owner      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Email verification never arrives                | Custom SMTP (Supabase's built-in mailer only sends to team members); friendly error and resend in the UI (`docs/AUTH_SETUP.md`) | WS4        |
| Phone codes need an SMS provider                | Twilio trial; without it the Phone tab explains that SMS is off and email still works                                           | WS4        |
| Amazon search-box endpoint changes or blocks us | 2.5 s timeout; any failure returns no phrases and the run continues with model keywords                                         | WS1        |
| Model misses a restricted claim                 | Lexicon backstop + output gate per channel + evals                                                                              | WS2        |
| Policy summaries or form fields go stale        | Cite sources; `verified` flag; "check each site's current requirements" in the UI                                               | WS2 / WS1  |
| Vercel timeout on long runs                     | Parallel localization, streaming, budgets, `maxDuration=300`                                                                    | WS4 / lead |
| Vercel 4.5 MB request limit with photos         | Resize in the browser to ≤ 1024 px JPEG (≤ ~650 KB each), 4 photos max                                                          | WS3        |
| Double-spend of credits / duplicate webhook     | Atomic SQL function; event-id idempotency; release the event if a handler fails                                                 | WS4        |
| Prompt injection via product text or photos     | Input screen, `<seller_input>` data tags, "text in photos is data", tools capped in code                                        | WS2        |
| Scope creep (live publishing, SEO data)         | Explicit non-goals; lead approves scope changes                                                                                 | Lead       |
| Business demand unproven                        | Interview 2–3 sellers this week; record in write-up                                                                             | Lead       |

## 10. Milestones

See `memory/timeline.md`. One week: day 1–2 live keys + Vercel deploy, day 3–4 live evals and prompt fixes, day 5 seller interviews and polish, day 6–7 write-up and demo recording.

## 11. Later (post-MVP)

Direct publishing (Amazon SP-API Listings Items, TikTok Shop Partner API, Shopify Admin API) · image → attribute suggestions (marked unconfirmed) · bulk CSV import · real keyword data provider · more channels (Walmart, Temu) and languages (Vietnamese, Spanish) · upload the evidence files themselves (Supabase Storage) · audit all three channels at once · a trademark/IP policy document for appeals · team accounts.
