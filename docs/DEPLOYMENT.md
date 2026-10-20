# Deployment

**Platform: Vercel** (course default for Next.js + Claude Code). Move to Fly.io/Railway only if runs outgrow Vercel's function limits (see D-006).

## Current production setup (2026-10-19)

**Live URL: https://shelfpass.vercel.app** · `/api/health` → `ai: live, data: supabase, billing: stripe, rag: lexical`.

| Piece    | Setup                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel   | Project `shelfpass` (Hobby). **Deployed with the Vercel CLI**, not the Git integration: the repo lives under a personal GitHub account, so another member's Vercel account cannot import it (D-015). |
| Models   | `ANTHROPIC_MODEL_SMART=claude-sonnet-5-5`, `ANTHROPIC_MODEL_FAST=claude-haiku-5-5`; prices $2/$10 and $0.10/$0.50 per MTok (D-015)                                                                   |
| Supabase | Migration applied; email confirmation off for the demo; Authentication → URL Configuration: Site URL `https://shelfpass.vercel.app`, redirect `https://shelfpass.vercel.app/auth/callback`           |
| Stripe   | Sandbox; product _ShelfPass Pro_ $9.99/month; customer portal on (cancel immediately); webhook `https://shelfpass.vercel.app/api/stripe/webhook` with the 3 events                                   |
| Secrets  | Only in Vercel (Production; the two private keys stored as _Sensitive_) and each developer's `.env.local`                                                                                            |

**Redeploy after merging to `main`** (from a clean checkout that has no `.env.local`, so no secrets are uploaded; the deploy owner must be logged in with `vercel login`):

```bash
git fetch origin && git checkout --detach origin/main
npx vercel deploy --prod
```

Rollback: Vercel → Deployments → pick the previous one → **Promote to Production**. To switch to automatic deploys on every push, the repo owner connects Git in Vercel (Project → Settings → Git) or imports the repo into their own Vercel account.

**Supabase URL gotcha:** `NEXT_PUBLIC_SUPABASE_URL` is the bare project URL (`https://<ref>.supabase.co`). The Data API page shows it with `/rest/v1/`; with that suffix table reads still seem to work but RPC calls fail with "Invalid path specified in request URL".

## Shipping site v2

Branch `feat/site-v2` adds the compliance suite (audit, appeal, evidence library, risk score, explanations in Chinese), the new site and pricing page, the bilingual UI, email/phone verification, the account page and credit packs. The live URL keeps running the previous version until these steps are done, in this order:

1. **Database:** Supabase → SQL Editor → run `supabase/migrations/20261020000000_compliance_suite.sql` (evidence library, `tool_runs` for audits and appeals, `add_credits()` for packs). Safe to run twice. Without it, audits, appeals, evidence and credit packs fail.
2. **Auth dashboard:** follow [`docs/AUTH_SETUP.md`](AUTH_SETUP.md) §2–§6 — custom SMTP **before** turning on _Confirm email_ (Supabase's built-in mailer only delivers to members of your Supabase team), email templates with the 6-digit `{{ .Token }}` and `/auth/confirm` links, URL configuration with `/auth/callback` **and** `/auth/confirm`, and (optional) Twilio for phone codes.
3. **Stripe:** nothing new to create. Credit packs use inline `price_data`; the same webhook endpoint and three events cover them. Optional: set `STRIPE_PRICE_ID_PACK` to manage the pack price in Stripe instead.
4. **Merge** `feat/site-v2` into `main` (PR, CI green, one review).
5. **Deploy:** from a clean checkout of `main`, `npx vercel deploy --prod` (commands above).
6. **Smoke test** on the live URL: `docs/AUTH_SETUP.md` §8 (sign up with the email code, password reset, phone if set up, pack purchase, Pro and cancel in the portal, data export, account delete), then one report, one audit and one takedown analysis.

What has been verified so far: on 2026-10-20, **before** site v2, a fresh account on the live URL signed up (email confirmation off), signed in again, upgraded Free → Pro (50 runs) with card 4242… through Stripe Checkout and the signed webhook, and cancelled in the Customer Portal back to Free. Site v2's packs, credit rules, verification flows and new tools are verified in mock mode, unit tests and the e2e suite; they need the deploy above to be verified live.

## From repo to live URL (5 steps)

1. **Push to GitHub** — `main` is always deployable (CI must be green).
2. **Connect Vercel to the repo** — vercel.com → Add New → Project → import `heruis/ecommerce-agent`. Framework: Next.js (auto). Build command `pnpm build`, install `pnpm install`.
3. **Add environment variables** — Project → Settings → Environment Variables (table below). Use _Production_ for the live site and _Preview_ for PR deploys. Paste each value into the form; never commit them. Which dashboard each value comes from: `docs/API_SETUP.md`.
4. **Redeploy once** (Deployments → ⋯ → Redeploy) so the new variables are picked up. `NEXT_PUBLIC_*` values are inlined at build time, so any change to them needs a redeploy.
5. **Every push to `main` redeploys automatically**; every PR gets a preview URL (CI posts it on the PR).

## Environment variables

| Variable                                        | Production                                     | Preview                            | Notes                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `AI_MODE`                                       | `live`                                         | `live` or `mock`                   | mock previews are free                                                                                           |
| `DATA_MODE`                                     | `supabase`                                     | `supabase`                         | memory mode is not shared between serverless instances — never deploy it                                         |
| `BILLING_MODE`                                  | `stripe` (`mock` until Stripe test keys exist) | `stripe` or `mock`                 | Stripe stays in **test mode** for the capstone                                                                   |
| `RAG_MODE`                                      | `lexical` (or `vector` once WS2 ships it)      | same                               |                                                                                                                  |
| `NEXT_PUBLIC_APP_URL`                           | optional: `https://<prod-domain>`              | leave empty                        | Stripe redirects; if empty, falls back to Vercel's production URL                                                |
| `ANTHROPIC_API_KEY`                             | production key                                 | dev/preview key                    | separate keys, spend limits                                                                                      |
| `ANTHROPIC_MODEL_SMART` / `_FAST`               | pinned IDs                                     | same                               | copy from the Anthropic models overview; same models as the eval run; fast tier must accept images (photo check) |
| `PRICE_*_PER_MTOK`                              | match the pinned models                        | same                               | trace cost column and the per-run $ budget                                                                       |
| `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` | project values                                 | same (or a staging project)        |                                                                                                                  |
| `SUPABASE_SECRET_KEY`                           | secret                                         | secret                             | server only                                                                                                      |
| `STRIPE_SECRET_KEY`                             | `sk_test_…`                                    | `sk_test_…`                        |                                                                                                                  |
| `STRIPE_WEBHOOK_SECRET`                         | from the dashboard endpoint                    | from a preview endpoint (optional) | not the CLI secret                                                                                               |
| `STRIPE_PRICE_ID_PRO`                           | `price_…`                                      | same                               |                                                                                                                  |
| `VOYAGE_API_KEY`                                | if `RAG_MODE=vector`                           |                                    |                                                                                                                  |
| `FREE_RUNS` / `PRO_RUNS_PER_PERIOD`             | `3` / `50`                                     |                                    |                                                                                                                  |
| `PACK_CREDITS`                                  | `20` (default)                                 |                                    | credits in the one-time $4.99 pack                                                                               |
| `STRIPE_PRICE_ID_PACK`                          | optional `price_…` (one-time)                  |                                    | if unset, checkout uses inline `price_data`                                                                      |

## After the first deploy

- [ ] Supabase → SQL Editor: run `supabase/migrations/20261018000000_init.sql`, then `20261020000000_compliance_suite.sql` (before switching `DATA_MODE=supabase`). `pnpm check:env` fails with a clear message if `add_credits()` is missing.
- [ ] Supabase → Authentication → URL Configuration: Site URL = production URL; add `https://<prod-domain>/auth/callback` and `https://<prod-domain>/auth/confirm` (and the preview pattern if you test auth on previews).
- [ ] Email verification: set up custom SMTP, then turn **Confirm email** on and update the templates (`docs/AUTH_SETUP.md` §2–§4). Without custom SMTP, keep Confirm email off: the built-in mailer only delivers to your Supabase team.
- [ ] Phone codes (optional): Phone provider → Twilio (`docs/AUTH_SETUP.md` §6).
- [ ] Stripe (test mode) → Developers → Webhooks → Add endpoint `https://<prod-domain>/api/stripe/webhook`, events `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` → copy the signing secret into `STRIPE_WEBHOOK_SECRET` → redeploy.
- [ ] Function duration: the run route sets `maxDuration = 300`. Confirm the project's plan allows it (Project → Settings → Functions); if runs are cut off, lower the run budget or move to a queue. A three-channel live run should take about a minute: the three localization agents run in parallel.
- [ ] Request size: Vercel caps request bodies at 4.5 MB. The form resizes photos in the browser (≤ 1024 px JPEG, ≤ ~650 KB each, 4 max), so a normal upload stays well under it.
- [ ] Smoke test on the live URL: sign up (6-digit code) → example + one photo → generate → check all three channel tabs and one preview → Explain in Chinese → printable report → download a CSV → audit a listing → analyze a notice → buy a pack with `4242 4242 4242 4242` (+20) → Pro (balance ≥ 50) → trace page.
- [ ] `GET /api/health` shows `ai: live, data: supabase, billing: stripe`.
- [ ] Error states: wrong password, out of credits, blocked input, Claude API down (temporarily set a bad model ID on a preview) — each shows a clear message, never a blank page.

## Production readiness checklist (rubric: deployment 15 pts)

- [ ] Live, stable URL in the README
- [ ] Stripe sandbox checkout works end to end via webhook (credit pack, upgrade, renewal via `invoice.paid`, cancel via the portal) — upgrade and cancel verified live on 2026-10-20 (pre-v2)
- [ ] Email sign-up with a code, password reset, account export and delete work on the live URL
- [ ] Terms, privacy and refund pages linked in the footer
- [ ] Secrets only in Vercel env; none in the repo (`git log -p | grep -E "sk-ant|sk_test|sb_secret"` is empty)
- [ ] Graceful error states (above)
- [ ] Live eval run ≥ 80% recorded with the deployed model IDs
