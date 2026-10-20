# Environment setup

Follow the sections in order. You can stop after **§2**: the whole app runs in mock mode with no accounts. Each later section turns on one real service. After every section run `pnpm check:env`.

| Who needs what  | §2 local | §3 Supabase        | §4 Claude API            | §5 Stripe          | §6 Voyage | §7 Vercel          |
| --------------- | -------- | ------------------ | ------------------------ | ------------------ | --------- | ------------------ |
| Lead            | ✓        | ✓ (create project) | ✓ (create org/workspace) | ✓ (create account) | —         | ✓ (create project) |
| WS1 AI pipeline | ✓        | —                  | ✓                        | —                  | —         | —                  |
| WS2 Trust layer | ✓        | for vector RAG     | ✓                        | —                  | optional  | —                  |
| WS3 UI          | ✓        | —                  | optional                 | —                  | —         | —                  |
| WS4 Platform    | ✓        | ✓                  | optional                 | ✓                  | —         | ✓                  |

> **Secrets rule:** keys go only in `.env.local` (gitignored) and in Vercel's env settings. Never in code, chat, screenshots, issues or Claude Code prompts (a hook blocks pasted keys). If a key leaks, rotate it immediately.

---

## §1 Install tools (once per laptop)

| Tool                   | Install                                                     | Check              |
| ---------------------- | ----------------------------------------------------------- | ------------------ |
| Node.js 22 LTS         | https://nodejs.org (or `nvm install 22` / `fnm install 22`) | `node -v` → v22.x  |
| pnpm                   | `corepack enable` (ships with Node)                         | `pnpm -v` → 10.x   |
| Git                    | https://git-scm.com                                         | `git --version`    |
| Claude Code            | https://code.claude.com (course requires Claude Pro or Max) | `claude --version` |
| Stripe CLI (WS4, lead) | https://docs.stripe.com/stripe-cli                          | `stripe --version` |
| GitHub CLI (optional)  | https://cli.github.com                                      | `gh auth status`   |

Windows: use PowerShell or Git Bash; everything here works on both. The Claude Code hooks are Node scripts, so no extra tools are needed.

## §2 Clone and run in mock mode (everyone, ~5 minutes)

```bash
git clone https://github.com/heruis/ecommerce-agent.git
cd ecommerce-agent
pnpm install
cp .env.example .env.local        # Windows PowerShell: Copy-Item .env.example .env.local
pnpm dev
```

Open http://localhost:3000 → **Start free** → any email (demo mode, no password) → **New report** → **Example: Collapsible silicone cup** (all three channels are ticked; add a photo if you like) → **Generate report**. You should see the pipeline stream (three localization agents run side by side), then keywords, facts, one tab per channel (Amazon US, TikTok Shop US, Shopify) with its publish fields, a takedown-risk badge, **Show preview** and a score around 80–85, and a shared claim review. Mock mode cannot see photos; the photo card says so, but the measured white background still drives the Amazon verdict.

Then try the rest from the dashboard: **Audit a listing**, **Takedown help**, **Evidence**, **Pricing** → buy a credit pack in the mock checkout, and switch the header's language menu to 简体中文.

Then check that everything is healthy:

```bash
pnpm check        # lint + typecheck + unit tests
pnpm eval         # mock mode: golden 13/13, audit 6/6, appeal 4/4, retrieval
pnpm check:env    # shows which modes are on
```

## §3 Supabase — database and auth (lead creates, WS4 wires)

1. https://supabase.com → **New project**. Name `shelfpass`, region close to your users (e.g. _West US_), save the DB password in your password manager.
2. **Project Settings → API Keys**: copy the **Project URL**, the **publishable** key and the **secret** key (legacy `anon` / `service_role` keys also work in the same slots).
3. **SQL Editor → New query**: paste `supabase/migrations/20261018000000_init.sql` → **Run**, then the same for `supabase/migrations/20261020000000_compliance_suite.sql` (evidence library, audits/appeals, credit packs). Every table should appear under **Table Editor**.
4. **Authentication → Sign In / Providers → Email**: enabled. For local development you can leave **Confirm email** off (sign-up logs straight in). To test the 6-digit email code, phone codes and password reset, follow [`docs/AUTH_SETUP.md`](AUTH_SETUP.md): Supabase's built-in mailer only delivers to members of your Supabase team, so set up custom SMTP first.
5. **Authentication → URL Configuration**: Site URL `http://localhost:3000`; add redirect URLs `http://localhost:3000/**` and, later, `https://<your-vercel-domain>/auth/callback` and `https://<your-vercel-domain>/auth/confirm`.
6. In `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```
7. Set `DATA_MODE=supabase` and run `pnpm check:env` — it checks the tables and the credit function. `SupabaseRepo` is implemented: it runs every query on the server with the secret key and filters by `user_id` in code (see D-013 in `memory/decisions.md`). Sign up once in the app; a profile row with 3 credits should appear in **Table Editor → profiles**.

Share the URL and publishable key with the team freely; share the **secret key** only through a password manager, and only with people who need it (lead, WS4, WS2 for vector ingestion).

## §4 Claude API — the agents' model (lead creates the org; each dev gets a key)

The Claude API is billed separately from your Claude Pro/Max subscription.

1. https://console.anthropic.com → create the team organization (lead) and invite teammates, or each teammate uses their own account.
2. **Billing**: add a small amount of credit ($5–$10 covers development; a live run costs a few cents). Set a **spend limit** per workspace.
3. **API Keys → Create key** named `shelfpass-dev-<yourname>`.
4. In `.env.local`:
   ```
   AI_MODE=live
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL_SMART=<current Sonnet-tier model ID>
   ANTHROPIC_MODEL_FAST=<current Haiku-tier model ID>
   ```
   Copy the current IDs from the Anthropic docs (_Models overview_); the lead pins the exact pair for the team in the team chat and in Vercel, so everyone evaluates the same models. The smart tier runs localization and compliance; the fast tier runs extraction, keywords, the judge and the photo check, so it must support image input (current Haiku-tier models do). Set the `PRICE_*` values from the Anthropic pricing page for the models you pick: they feed the trace's cost column and the per-run $ budget.
5. `pnpm check:env` verifies the key and both model IDs without spending tokens. Then `pnpm eval --suite golden --limit 2` runs two real cases (three channels each, about 13 calls per case).

Production uses a **separate** key that only lives in Vercel.

## §5 Stripe — payments in test mode (WS4; lead creates the account)

1. https://dashboard.stripe.com → make sure **Test mode** is on (top right).
2. **Product catalog → Add product**: name `ShelfPass Pro`, recurring, **$9.99 / month**. Copy the price id (`price_...`).
3. **Developers → API keys**: copy the **secret key** (`sk_test_...`).
4. **Settings → Billing → Customer portal**: activate (lets users cancel/update cards).
5. Local webhooks with the Stripe CLI:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   It prints a signing secret `whsec_...` (valid while `stripe listen` runs).
6. In `.env.local`:
   ```
   BILLING_MODE=stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_PRO=price_...
   ```
7. `StripeBilling` is implemented (Checkout for the Pro subscription and the one-time credit pack, Customer Portal). The pack uses inline `price_data`, so there is nothing else to create in Stripe. The webhook handles `checkout.session.completed` (Pro start or pack purchase), `invoice.paid` (monthly top-up to at least 50 credits) and `customer.subscription.deleted` (back to Free, balance kept); the rules are in `src/lib/billing/credits.ts`. Test card: `4242 4242 4242 4242`, any future date, any CVC. Until you have Stripe keys, keep `BILLING_MODE=mock`: the mock checkout sells both products and the rest of the app works the same.

## §6 Voyage AI — embeddings for vector RAG (WS2, optional)

Only needed for `RAG_MODE=vector`. https://www.voyageai.com → API key → `VOYAGE_API_KEY=pa-...`. Run `pnpm kb:ingest` after WS2 implements it.

## §7 Vercel — the live URL (lead + WS4)

See `docs/DEPLOYMENT.md` (step by step) and `docs/API_SETUP.md` (which key goes where). Short version: import the GitHub repo in Vercel → **Project → Settings → Environment Variables**: paste the same values as your `.env.local` (with production keys) → deploy → add the Vercel domain to Supabase redirect URLs and as a Stripe webhook endpoint. `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing them.

## §8 Claude Code in this repo (everyone)

```bash
cd ecommerce-agent
git switch -c ws<N>/<task>        # your workstream branch, see docs/team/TEAM_GUIDE.md
claude
```

- Claude Code reads `CLAUDE.md` and the team layer in `.claude/` (settings, hooks, commands, skills, subagents). Approve the project settings and the MCP servers (`.mcp.json`: Playwright; Supabase read-only needs `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` in your shell env, optional).
- Personal overrides go in `.claude/settings.local.json` and `CLAUDE.local.md` (both gitignored).
- Useful commands: `/check`, `/eval`, `/sync`, `/handoff`, `/review`, `/decision`. Subagents: `/agents`. Skills: `write-prd`, `listing-localizer`, `eval-loop`, `add-policy-doc`.
- The ownership hook blocks edits outside your workstream on `ws*/` branches. That is intentional; see the team guide.

## §9 Troubleshooting

| Symptom                                          | Fix                                                                                                                   |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm doctor` prints nothing                     | That's pnpm's built-in; ours is `pnpm check:env`                                                                      |
| `Missing ANTHROPIC_MODEL_SMART`                  | Set both model IDs (§4) or go back to `AI_MODE=mock`                                                                  |
| `Database error in …`                            | Run the migration (§3.3); check `SUPABASE_SECRET_KEY` is the **secret** key, not the publishable one                  |
| Photo upload fails / 413 on Vercel               | Photos are resized in the browser; if you bypass the form, keep the request under 4.5 MB (≤ 4 photos, ≤ ~650 KB each) |
| Changed a `NEXT_PUBLIC_*` value, nothing changed | Those are inlined at build time: restart `pnpm dev`, or redeploy on Vercel                                            |
| Login loops back to /login                       | Supabase redirect URLs (§3.5) and `NEXT_PUBLIC_APP_URL`                                                               |
| "Email address not authorized" on sign-up        | Supabase's built-in mailer only sends to your Supabase team: set up custom SMTP (`docs/AUTH_SETUP.md` §2)             |
| Phone tab says text-message codes are off        | No SMS provider configured in Supabase: `docs/AUTH_SETUP.md` §6 (Twilio trial)                                        |
| Audits, appeals or evidence fail with a DB error | Run `supabase/migrations/20261020000000_compliance_suite.sql` (§3.3)                                                  |
| Webhook 400 bad signature                        | `STRIPE_WEBHOOK_SECRET` must match the running `stripe listen` session (local) or the dashboard endpoint (prod)       |
| Data disappeared                                 | `DATA_MODE=memory` resets on restart — expected                                                                       |
| Playwright can't find a browser                  | `pnpm exec playwright install chromium`                                                                               |
