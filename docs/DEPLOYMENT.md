# Deployment

**Platform: Vercel** (course default for Next.js + Claude Code). Move to Fly.io/Railway only if runs outgrow Vercel's function limits (see D-006).

## From repo to live URL (5 steps)

1. **Push to GitHub** — `main` is always deployable (CI must be green).
2. **Connect Vercel to the repo** — vercel.com → Add New → Project → import `heruis/ecommerce-agent`. Framework: Next.js (auto). Build command `pnpm build`, install `pnpm install`.
3. **Add environment variables** — Project → Settings → Environment Variables (table below). Use _Production_ for the live site and _Preview_ for PR deploys.
4. **Redeploy once** so the new variables are picked up.
5. **Every push to `main` redeploys automatically**; every PR gets a preview URL (CI posts it on the PR).

## Environment variables

| Variable                                        | Production                                | Preview                                 | Notes                                                                    |
| ----------------------------------------------- | ----------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| `AI_MODE`                                       | `live`                                    | `live` or `mock`                        | mock previews are free                                                   |
| `DATA_MODE`                                     | `supabase`                                | `supabase`                              | memory mode is not shared between serverless instances — never deploy it |
| `BILLING_MODE`                                  | `stripe`                                  | `stripe` or `mock`                      | Stripe stays in **test mode** for the capstone                           |
| `RAG_MODE`                                      | `lexical` (or `vector` once WS2 ships it) | same                                    |                                                                          |
| `NEXT_PUBLIC_APP_URL`                           | `https://<prod-domain>`                   | leave empty to use preview URL defaults | used for Stripe redirects                                                |
| `ANTHROPIC_API_KEY`                             | production key                            | dev/preview key                         | separate keys, spend limits                                              |
| `ANTHROPIC_MODEL_SMART` / `_FAST`               | pinned IDs                                | same                                    | same models as the eval run                                              |
| `PRICE_*_PER_MTOK`                              | match the pinned models                   | same                                    | cost column only                                                         |
| `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` | project values                            | same (or a staging project)             |                                                                          |
| `SUPABASE_SECRET_KEY`                           | secret                                    | secret                                  | server only                                                              |
| `STRIPE_SECRET_KEY`                             | `sk_test_…`                               | `sk_test_…`                             |                                                                          |
| `STRIPE_WEBHOOK_SECRET`                         | from the dashboard endpoint               | from a preview endpoint (optional)      | not the CLI secret                                                       |
| `STRIPE_PRICE_ID_PRO`                           | `price_…`                                 | same                                    |                                                                          |
| `VOYAGE_API_KEY`                                | if `RAG_MODE=vector`                      |                                         |                                                                          |
| `FREE_RUNS` / `PRO_RUNS_PER_PERIOD`             | `3` / `50`                                |                                         |                                                                          |

## After the first deploy

- [ ] Supabase → Authentication → URL Configuration: Site URL = production URL; add `https://<prod-domain>/auth/callback` (and the preview pattern if you test auth on previews).
- [ ] Stripe (test mode) → Developers → Webhooks → Add endpoint `https://<prod-domain>/api/stripe/webhook`, events `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` → copy the signing secret into `STRIPE_WEBHOOK_SECRET` → redeploy.
- [ ] Function duration: the run route sets `maxDuration = 300`. Confirm the project's plan allows it (Project → Settings → Functions); if runs are cut off, lower the run budget or move to a queue.
- [ ] Smoke test on the live URL: sign up → generate the example → upgrade with `4242 4242 4242 4242` → credits = 50 → export CSV → trace page.
- [ ] `GET /api/health` shows `ai: live, data: supabase, billing: stripe`.
- [ ] Error states: wrong password, out of credits, blocked input, Claude API down (temporarily set a bad model ID on a preview) — each shows a clear message, never a blank page.

## Production readiness checklist (rubric: deployment 15 pts)

- [ ] Live, stable URL in the README
- [ ] Stripe sandbox checkout works end to end via webhook
- [ ] Secrets only in Vercel env; none in the repo (`git log -p | grep -E "sk-ant|sk_test|sb_secret"` is empty)
- [ ] Graceful error states (above)
- [ ] Live eval run ≥ 80% recorded with the deployed model IDs
