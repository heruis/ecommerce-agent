# Design decisions

Short records of choices that shape the system. Newest last. Add one with `/decision <title>`.
These feed the write-up's "justified design decisions" (rubric: engineering quality).

### D-001 Product: listing localization + claim verification, Amazon US first

**Context:** A plain "Chinese → English listing" generator is easy to replace with ChatGPT. **Decision:** Differentiate on platform-specific rules, claim verification with citations, and a measurable quality score. Amazon US only for the MVP; TikTok Shop US is a stretch goal. **Alternatives:** Inventory forecasting (rejected: needs datasets, weak demo). **Consequences:** Compliance is the core of the product, so the trust layer gets its own workstream (WS2). Owner: lead. 2026-10-18.

### D-002 Stack: Next.js + Supabase + Stripe + Claude API on Vercel

**Context:** Course module 4 recommends Next.js + Claude Code → Vercel, Supabase for DB/auth, Stripe test mode. **Decision:** One Next.js app (frontend + API routes) on Vercel; Supabase Postgres/Auth/pgvector; Stripe Checkout + webhooks; Anthropic TypeScript SDK. **Alternatives:** Python/FastAPI backend on Fly.io (two deploys, two languages for a 5-week team). **Consequences:** Long pipeline runs must fit Vercel function limits → streamed responses and `maxDuration` (D-006). Owner: lead.

### D-003 Workflow with agentic steps, not a free-roaming agent

**Context:** Graders want to see each agent's input, output and error handling; reliability matters more than autonomy. **Decision:** A fixed orchestrator (hub) calls specialist agents (spokes). Two steps are ReAct tool loops (localization with `check_listing`, compliance with `search_policy`/`lookup_evidence`); the rest are single structured calls; counting/validation/credits are plain code. **Alternatives:** One big agent with all tools (harder to test, costlier, less predictable). **Consequences:** Each stage is testable and traceable; adding a platform means adding rules + prompt sections, not a new agent.

### D-004 Contracts first (zod), mock mode everywhere

**Context:** Five people build in parallel. **Decision:** All shared types live in `src/lib/contracts` (lead-owned). Every LLM call requires a mock responder; data, auth and billing have in-memory/mock implementations. **Consequences:** Everyone can run the full app on day one with no keys; CI is free and deterministic; the memory repo is the executable spec for the Supabase repo.

### D-005 Structured output via structured outputs + strict tools, not forced tool_choice

**Context:** The course shows forcing a tool with `tool_choice` to get schema-valid JSON. Current Claude models reject forced `tool_choice` (`any`/`tool`). **Decision:** Single-shot agents use `output_config.format` (JSON schema from zod); tool-loop agents finish by calling a `strict: true` "submit" tool under `tool_choice: auto`, with one nudge if they forget. Zod re-validates everything; one repair attempt on contract errors. **Consequences:** Same guarantee ("the schema does the enforcing") on current models.

### D-006 Streaming run endpoint with a 300 s budget

**Context:** A run makes ~6-10 model calls (30-90 s live). **Decision:** `POST /api/listings/:id/run` streams server-sent events per stage; `maxDuration = 300`; the harness enforces a per-run budget (calls, tokens, cost, 240 s deadline). **Alternatives:** Background job + polling (more infrastructure). **Consequences:** Live progress for the demo; if Vercel limits bite, move to a queue (Later).

### D-007 Next.js Cache Components off

**Context:** Next 16 templates enable Cache Components, which require Suspense boundaries around every cookie/session read. **Decision:** Keep the classic dynamic model; every app page reads the session. **Consequences:** Simpler for the team; revisit after the MVP if performance needs it.

### D-008 Lexical RAG first, vector RAG as an upgrade

**Context:** The knowledge base is ~30 chunks. **Decision:** BM25 over markdown (no keys, deterministic, recall@3 = 0.93 on our retrieval set) behind a `PolicyRetriever` port; pgvector + Voyage embeddings is a WS2 upgrade measured with the same retrieval eval. **Consequences:** Retrieval quality is measured, not assumed; the switch is one env var.

### D-009 Defense in depth for claims: agent + lexicon + gate

**Context:** A missed "FDA approved" is the worst failure. **Decision:** The compliance agent reasons with citations; a deterministic lexicon backstops it; the output gate strips anything restricted that survives and re-validates. **Consequences:** Restricted phrases cannot reach the final listing even if the model misses them; the lexicon can over-flag, which the seller resolves in review.

### D-010 Pricing: 3 free runs, Pro $9.99/month with 50 runs

**Context:** Unlimited plans let API cost run away. **Decision:** Fair-use cap, atomic credit decrement in Postgres, refund on our own failures, credits granted only by the verified, idempotent Stripe webhook. **Consequences:** Revisit the cap with real cost-per-run data from traces.

### D-011 A publish-ready report instead of direct publishing

**Context:** Posting listings straight to Amazon (SP-API), TikTok Shop (Partner API) and Shopify (Admin API) needs developer registration and app review that take weeks; the capstone is due in one week. **Decision:** ShelfPass outputs a report that maps every generated value onto each site's "add product" form, field by field, with copy buttons, per-channel CSV/TXT, a JSON of all fields, a Markdown report and a printable page. Fields only the seller can supply (GTIN, price, country of origin) are marked "you fill in". **Alternatives:** Shopify-only live publishing (still needs an app install flow and OAuth; not worth the week). **Consequences:** No third-party credentials to store; the report is the product's output and the demo's centerpiece. Direct publishing stays on the roadmap. Owner: lead. 2026-10-19.

### D-012 Multi-channel: shared facts and keywords, one localization agent per channel

**Context:** Amazon, TikTok Shop and Shopify want different copy (bullets + backend terms; short title + hashtags; SEO title + meta description + tags). **Decision:** Extraction, keywords and compliance run once; localization runs one agent per selected channel in parallel; the output gate, judge, score and publish fields run per channel. Each channel is a rule config (`src/lib/rules/<channel>.ts`) that drives the prompt, the `check_listing` validator and the form-field map, so they cannot disagree. One compliance review covers all drafts and its verdicts apply wherever a phrase appears. **Consequences:** ~13 model calls for three channels in mock mode (budget raised to 40 calls / $1.50); adding a channel is a config file plus form fields, not a new agent.

### D-013 Supabase access through the server's secret key, with explicit user filters

**Context:** The run endpoint keeps writing after the browser's cookies are out of reach (streamed response), and the Stripe webhook has no session at all. **Decision:** `SupabaseRepo` uses the server-only secret-key client for every query and filters every read and write by `user_id` in code. RLS stays enabled as the second wall for any future browser-side access. **Alternatives:** User-scoped client with RLS for reads (two clients, cookie edge cases inside streams). **Consequences:** Ownership checks are code we test (the memory repo is the spec); the secret key never leaves the server.

### D-014 Photos: downscale in the browser, the model describes, code decides

**Context:** Sellers want main-image feedback; Vercel caps request bodies at 4.5 MB. **Decision:** Up to 4 photos are downscaled client-side to 1024 px JPEG (≤ ~650 KB each) and sent inline; the input guardrail checks each file's signature. A fast-tier vision call returns observations only (background, text/logo, watermark, fill, props, alt text); code turns them into a per-channel main-image verdict. **Consequences:** Cheap and explainable; no object storage needed for the capstone (photos live in the listing's input JSON). Move to Supabase Storage if photos grow.

### D-015 Models pinned to Sonnet 5.5 / Haiku 5.5; production deployed with the Vercel CLI

**Context:** First live deploy (2026-10-19). The harness needs a smart and a fast tier; the GitHub repo is under a personal account, so a teammate's Vercel account cannot import it. **Decision:** `ANTHROPIC_MODEL_SMART=claude-sonnet-5-5` (localization, compliance) and `ANTHROPIC_MODEL_FAST=claude-haiku-5-5` (extraction, keywords, photo check, judge, vision-capable); the harness already fits them (no sampling params, append-only tool loop, auto tool choice, effort per agent). Production is deployed from a clean checkout of `main` with `vercel deploy --prod`. **Alternatives:** Opus 5.5 for the smart tier (about 2x the price; revisit only if quality falls short); a fork or the repo owner's Vercel account for Git auto-deploys. **Consequences:** about $0.08–0.09 and 31–34 s per three-channel case, 13/13 golden live; merges to `main` need a manual redeploy (DEPLOYMENT.md) until the owner connects Git. Owner: lead. 2026-10-19.

### D-016 Merge Listing Copilot into ShelfPass as a compliance suite

**Context:** A teammate built Listing Copilot (listing audit, takedown/appeal assistant, evidence library, takedown-risk score, explanations in the seller's language, real search-box phrases) on a separate stack. Two products split the demo and the grade. **Decision:** Port its features into ShelfPass's architecture (harness with mocks, zod contracts, evals, owner-scoped repo) rather than link two apps: one account, one credit balance, one design. Contracts live in `src/lib/contracts/suite.ts`; audits and appeals are stored as `tool_runs`; the risk score is computed in code from rule checks and the claim review, so it also works on old reports and seller edits. **Alternatives:** Keep two apps and cross-link (two logins, two Stripe setups). **Consequences:** One credit = one report, audit or appeal; explanations in 中文 are free (fast tier, rate limited). Owner: lead. 2026-10-20.

### D-017 Design system from the ui-ux-pro-max skill; light mode only

**Context:** The site looked like a prototype. **Decision:** Generate the design system with the ui-ux-pro-max skill (SaaS / e-commerce seller compliance query; balanced variance, subtle motion) and persist it in `design-system/shelfpass/MASTER.md`: trust blue, orange CTA (darkened to #C2410C so white labels pass AA), Plus Jakarta Sans with OS Chinese fallbacks, lucide icons, glass only on the sticky header. Landing follows the skill's "Product demo + features" and "before/after" patterns; no testimonials until we have real ones. **Consequences:** Dark mode removed (the skill flags it as an anti-pattern for this product). Tokens are in `globals.css`; components in `src/components/ui`.

### D-018 Bilingual interface (English / 简体中文) with typed dictionaries

**Context:** The users are Chinese sellers; the course demo is in English. **Decision:** A small in-house i18n layer: per-area dictionary files (`src/lib/i18n/dictionaries/{en,zh}/<area>.ts`) so parallel branches never edit the same file; TypeScript forces zh to have every key and a test checks placeholders; locale from a cookie, else Accept-Language; switcher in the header works before sign-in. **Alternatives:** next-intl (locale routing and middleware changes for little gain at this size). **Consequences:** AI explanations follow the interface language; listings themselves stay in US English.

### D-019 Credit packs with inline Stripe prices; email and phone verification through Supabase Auth

**Context:** Sellers asked for pay-as-you-go; the grade needs a working sandbox checkout and real sign-up. **Decision:** One-time credit pack ($4.99) uses Checkout `mode: payment` with inline `price_data`, so no extra Stripe dashboard setup; the verified webhook adds credits with an atomic `add_credits` SQL function, idempotent per event. Sign-up verifies email with a 6-digit code or link (`verifyOtp`), phone sign-in and phone verification use SMS codes; dashboard settings are listed in `docs/AUTH_SETUP.md`. **Consequences:** Phone codes need an SMS provider (Twilio trial) configured in Supabase; without it the UI explains that phone sign-in is unavailable and email still works.

### D-020 Amazon titles capped at 75 characters; Item Highlights as a listing field

**Context:** Since July 27, 2026, Amazon limits titles to 75 characters (all categories except media) and adds a searchable Item Highlights line of up to 125 characters under the title. Our rules still allowed 200, so reports produced titles Amazon may reject, suppress or rewrite. **Decision:** `amazon-us.ts` sets the title limit to 75 and `itemHighlights: { maxChars: 125 }`; `ListingDraft` gets an `item_highlights` field (default "", Amazon-only) that flows through the localization prompt and `check_listing`, the compliance review, the output gate, scoring, the publish form (right after the title), the editor, the Amazon preview and the audit tool. The validator errors over 125 characters, and warns when the field is empty or mostly repeats the title. `withDraftDefaults` fills the field for reports saved before it existed. **Alternatives:** Put the extra details only in bullets (loses the searchable line Amazon now shows under the title). **Consequences:** Live golden runs must be repeated before the demo. Item Highlights rules come from Amazon's announcement and third-party summaries (`verified: false` in the knowledge base) until WS2 confirms them in Seller Central. The `audit-clean-utensils` case's 84-character title was no longer clean under the new limit, so its input title was shortened to 67 characters to keep it a clean-listing case (a ground-truth change from the rule, reviewed in the PR); `audit-stuffed-title` now expects at most 75 characters. Owner: lead. 2026-10-20.
