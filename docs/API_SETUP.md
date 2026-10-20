# Keys and where to paste them

The capstone needs four services: **Vercel** (hosting), **Claude API** (the agents), **Supabase** (database + sign-in) and **Stripe in test mode** (subscriptions). Nothing else: ShelfPass produces a report with every field each marketplace's form asks for, and the seller pastes those fields in. Direct publishing APIs are future work ([appendix](#later-direct-publishing-apis-not-in-the-capstone)).

**Where every value goes:** Vercel → your project → **Settings → Environment Variables** → add each name and value → tick _Production_ (and _Preview_ if you want PR previews to work) → **Save** → **Deployments → ⋯ → Redeploy**. For local development, put the same names in `.env.local` (never committed). Never paste keys into chat, code, issues, screenshots or Claude Code prompts.

`<domain>` below means your production URL, e.g. `https://shelfpass.vercel.app`.

## At a glance

| Service            | Variables it produces                                                                                | Where you find them                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Modes (no service) | `AI_MODE=live`, `DATA_MODE=supabase`, `BILLING_MODE=mock` → `stripe` later, `RAG_MODE=lexical`       | you type them                                                                  |
| Claude API         | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_SMART`, `ANTHROPIC_MODEL_FAST`, `PRICE_*_PER_MTOK`             | console.anthropic.com → API Keys; model IDs and prices from the Anthropic docs |
| Supabase           | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`            | Supabase → Project Settings → API Keys                                         |
| Stripe (test mode) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`; optional `STRIPE_PRICE_ID_PACK` | Stripe dashboard (test mode) → Developers / Product catalog                    |
| Vercel             | `NEXT_PUBLIC_APP_URL` (optional)                                                                     | your production URL; if empty the app uses Vercel's production URL             |

`NEXT_PUBLIC_*` values are inlined into the browser bundle at build time: after adding or changing one, **redeploy**.

## 1. Vercel (10 min)

1. https://vercel.com → **Add New → Project → Import** the `ecommerce-agent` repository. Framework: Next.js (defaults are fine).
2. First deploy can be keyless: `AI_MODE=mock`, `DATA_MODE=memory`, `BILLING_MODE=mock`. It proves the build; memory data is per server instance, so switch to Supabase next.
3. **Settings → Functions**: confirm the plan allows the run route's `maxDuration = 300` seconds.
4. Note the production URL: it is `<domain>` for the steps below.

## 2. Claude API (10 min)

1. https://console.anthropic.com → **Billing**: add credit ($10–20 is plenty for the course) and set a monthly spend limit.
2. **API Keys → Create key** named `prod-vercel` (only for Vercel). Teammates who tune prompts use their own `dev-<name>` keys locally.
3. Paste into Vercel:
   ```
   AI_MODE=live
   ANTHROPIC_API_KEY=<the key>
   ANTHROPIC_MODEL_SMART=<current Sonnet-tier model ID>
   ANTHROPIC_MODEL_FAST=<current Haiku-tier model ID>
   ```
   Copy both model IDs from the Anthropic docs (**Models overview**). The fast tier also runs the photo check, so it must accept image input. Set `PRICE_SMART_INPUT_PER_MTOK`, `PRICE_SMART_OUTPUT_PER_MTOK`, `PRICE_FAST_INPUT_PER_MTOK`, `PRICE_FAST_OUTPUT_PER_MTOK` from the Anthropic pricing page: they drive the trace's cost column and the per-run $1.50 cap.
4. Redeploy → `<domain>/api/health` shows `"ai":"live"`.

## 3. Supabase (15 min)

1. https://supabase.com → **New project** (region near Vercel's, e.g. US West). Save the database password in a password manager.
2. **SQL Editor → New query** → paste all of `supabase/migrations/20261018000000_init.sql` → **Run**, then the same for `supabase/migrations/20261020000000_compliance_suite.sql`. Tables `profiles`, `listings`, `pipeline_runs`, `stripe_events`, `policy_chunks`, `evidence`, `tool_runs` appear in the Table Editor.
3. **Authentication → URL Configuration**: Site URL `<domain>`; add redirect URLs `<domain>/auth/callback` and `<domain>/auth/confirm` (and `http://localhost:3000/**` for local dev).
4. **Authentication → Sign In / Providers → Email**: on. Email verification (6-digit code or link), password reset and phone codes need dashboard settings that no key controls: custom SMTP, **Confirm email**, two email templates and, for phone, Twilio. Follow [`docs/AUTH_SETUP.md`](AUTH_SETUP.md); until custom SMTP is set up, keep **Confirm email** off, because Supabase's built-in mailer only delivers to your Supabase team.
5. **Project Settings → API Keys** → paste into Vercel:
   ```
   DATA_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...          # server only — never prefix with NEXT_PUBLIC
   ```
   Legacy `anon` / `service_role` keys work in the same two slots.
6. Redeploy → sign up on `<domain>` → a row with 3 credits appears in **profiles**.

## 4. Stripe, test mode (15 min) — capstone must-have

Until you have these keys, keep `BILLING_MODE=mock`: the upgrade button then uses a fake checkout page and everything else works.

1. https://dashboard.stripe.com → keep **Test mode** on.
2. **Product catalog → Add product** "ShelfPass Pro", recurring **$9.99/month** → copy the price id `price_...`.
3. **Settings → Billing → Customer portal** → activate.
4. **Developers → API keys** → copy the secret key `sk_test_...`.
5. **Developers → Webhooks → Add endpoint** `<domain>/api/stripe/webhook`, events `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` → copy the signing secret `whsec_...`.
6. Paste into Vercel:
   ```
   BILLING_MODE=stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_PRO=price_...
   ```
7. Redeploy → Billing → **Upgrade to Pro** → card `4242 4242 4242 4242`, any future date, any CVC → plan shows Pro with at least 50 credits. **Buy 20 credits** ($4.99, one-time) needs nothing else in Stripe: checkout uses inline `price_data` (set `STRIPE_PRICE_ID_PACK` only if you want to manage that price in Stripe). The same webhook events cover it.

## Checklist

- [ ] Vercel project builds and the URL opens (1)
- [ ] Claude key + both model IDs + prices; `/api/health` shows `ai: live` (2)
- [ ] Supabase migrations run, auth URLs set, `docs/AUTH_SETUP.md` done (or confirm email off until SMTP exists), keys pasted; `data: supabase` (3)
- [ ] Stripe test keys, price, portal, webhook; `billing: stripe` (4)
- [ ] `pnpm check:env` locally with the same values is green
- [ ] Smoke test on `<domain>` (see `docs/DEPLOYMENT.md`)

---

## Later: direct publishing APIs (not in the capstone)

Publishing straight from ShelfPass needs developer registration, app review and per-seller OAuth that take longer than the one-week deadline. The report's per-channel `fields` (form key → value) are what a publisher would send. What each would need:

| Channel     | API                                                                                                                                                          | What it takes                                                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amazon US   | Selling Partner API: Product Type Definitions, Catalog Items, Listings Items (`putListingsItem`, with `VALIDATION_PREVIEW` mode to check without publishing) | A Professional seller account; developer registration in Seller Central with the Product Listing role (review takes days to weeks); an app client with LWA credentials; seller authorization (refresh token) via OAuth. |
| TikTok Shop | TikTok Shop Partner Center (US) Product API: categories, attributes, image upload, create product                                                            | Developer registration (seller or app developer), a custom app with product scopes and a redirect URL, seller authorization, a sandbox test shop for development; TikTok then audits each product.                      |
| Shopify     | Admin GraphQL API `productSet` (title, description, product type, vendor, tags, `seo { title, description }`), then media                                    | An app in the Shopify Dev Dashboard with `write_products` and `write_files` scopes, installed on the seller's store via OAuth (custom distribution for one store; public distribution needs Shopify's review).          |

Also later: a keyword-volume provider (e.g. DataForSEO) to replace AI-suggested keywords with estimated search volumes, and an encryption key for stored seller tokens.
