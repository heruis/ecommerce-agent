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

## After the first deploy

- [ ] Supabase → SQL Editor: run `supabase/migrations/20261018000000_init.sql` once (before switching `DATA_MODE=supabase`).
- [ ] Supabase → Authentication → URL Configuration: Site URL = production URL; add `https://<prod-domain>/auth/callback` (and the preview pattern if you test auth on previews).
- [ ] Supabase → Authentication → Sign In / Providers → Email: turn **Confirm email** off for the class demo (sign-up logs straight in; the built-in mailer is rate-limited).
- [ ] Stripe (test mode) → Developers → Webhooks → Add endpoint `https://<prod-domain>/api/stripe/webhook`, events `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` → copy the signing secret into `STRIPE_WEBHOOK_SECRET` → redeploy.
- [ ] Function duration: the run route sets `maxDuration = 300`. Confirm the project's plan allows it (Project → Settings → Functions); if runs are cut off, lower the run budget or move to a queue. A three-channel live run should take about a minute: the three localization agents run in parallel.
- [ ] Request size: Vercel caps request bodies at 4.5 MB. The form resizes photos in the browser (≤ 1024 px JPEG, ≤ ~650 KB each, 4 max), so a normal upload stays well under it.
- [ ] Smoke test on the live URL: sign up → example + one photo → generate → check all three channel tabs → printable report → download a CSV → upgrade with `4242 4242 4242 4242` → credits = 50 → trace page.
- [ ] `GET /api/health` shows `ai: live, data: supabase, billing: stripe`.
- [ ] Error states: wrong password, out of credits, blocked input, Claude API down (temporarily set a bad model ID on a preview) — each shows a clear message, never a blank page.

## Production readiness checklist (rubric: deployment 15 pts)

- [ ] Live, stable URL in the README
- [ ] Stripe sandbox checkout works end to end via webhook (upgrade, renewal via `invoice.paid`, cancel via the portal)
- [ ] Secrets only in Vercel env; none in the repo (`git log -p | grep -E "sk-ant|sk_test|sb_secret"` is empty)
- [ ] Graceful error states (above)
- [ ] Live eval run ≥ 80% recorded with the deployed model IDs
