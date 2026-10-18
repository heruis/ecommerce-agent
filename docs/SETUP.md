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

Open http://localhost:3000 → **Sign in** with any email (demo mode) → **New listing** → **Example: Collapsible silicone cup** → **Generate listing**. You should see the pipeline stream, a compliance table and a score around 85.

Then check that everything is healthy:

```bash
pnpm check        # lint + typecheck + unit tests
pnpm eval         # 12/12 golden cases in mock mode
pnpm check:env    # shows which modes are on
```

## §3 Supabase — database and auth (lead creates, WS4 wires)

1. https://supabase.com → **New project**. Name `listwise`, region close to your users (e.g. _West US_), save the DB password in your password manager.
2. **Project Settings → API Keys**: copy the **Project URL**, the **publishable** key and the **secret** key (legacy `anon` / `service_role` keys also work in the same slots).
3. **SQL Editor → New query**: paste `supabase/migrations/20261018000000_init.sql` → **Run**. Every table should appear under **Table Editor**.
4. **Authentication → Sign In / Providers → Email**: enabled. For development you can turn **Confirm email** off; for the demo turn it on.
5. **Authentication → URL Configuration**: Site URL `http://localhost:3000`; add redirect URLs `http://localhost:3000/auth/callback` and, later, `https://<your-vercel-domain>/auth/callback`.
6. In `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```
7. Keep `DATA_MODE=memory` **until WS4 merges `SupabaseRepo`** (it is a stub on day one). Then set `DATA_MODE=supabase` and run `pnpm check:env` — it checks the tables and the credit function.

Share the URL and publishable key with the team freely; share the **secret key** only through a password manager, and only with people who need it (lead, WS4, WS2 for vector ingestion).

## §4 Claude API — the agents' model (lead creates the org; each dev gets a key)

The Claude API is billed separately from your Claude Pro/Max subscription.

1. https://console.anthropic.com → create the team organization (lead) and invite teammates, or each teammate uses their own account.
2. **Billing**: add a small amount of credit ($5–$10 covers development; a live run costs a few cents). Set a **spend limit** per workspace.
3. **API Keys → Create key** named `listwise-dev-<yourname>`.
4. In `.env.local`:
   ```
   AI_MODE=live
   ANTHROPIC_API_KEY=sk-ant-...
   ANTHROPIC_MODEL_SMART=<current Sonnet-tier model ID>
   ANTHROPIC_MODEL_FAST=<current Haiku-tier model ID>
   ```
   Look up the current IDs in the Anthropic docs (_Models overview_); the lead pins the exact pair for the team in the team chat and in Vercel, so everyone evaluates the same models. Update `PRICE_*` values if you pick other tiers (used only for the cost column).
5. `pnpm check:env` verifies the key and both model IDs without spending tokens. Then `pnpm eval --suite golden --limit 2` runs two real cases.

Production uses a **separate** key that only lives in Vercel.

## §5 Stripe — payments in test mode (WS4; lead creates the account)

1. https://dashboard.stripe.com → make sure **Test mode** is on (top right).
2. **Product catalog → Add product**: name `ListWise Pro`, recurring, **$9.99 / month**. Copy the price id (`price_...`).
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
7. Keep `BILLING_MODE=mock` **until WS4 merges `StripeBilling`**. Test card: `4242 4242 4242 4242`, any future date, any CVC.

## §6 Voyage AI — embeddings for vector RAG (WS2, optional)

Only needed for `RAG_MODE=vector`. https://www.voyageai.com → API key → `VOYAGE_API_KEY=pa-...`. Run `pnpm kb:ingest` after WS2 implements it.

## §7 Vercel — the live URL (lead + WS4)

See `docs/DEPLOYMENT.md`. Short version: import the GitHub repo in Vercel → add the env vars → deploy → add the Vercel domain to Supabase redirect URLs and as a Stripe webhook endpoint.

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

| Symptom                                       | Fix                                                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm doctor` prints nothing                  | That's pnpm's built-in; ours is `pnpm check:env`                                                                |
| `Missing ANTHROPIC_MODEL_SMART`               | Set both model IDs (§4) or go back to `AI_MODE=mock`                                                            |
| `SupabaseRepo.… is not implemented yet (WS4)` | Use `DATA_MODE=memory` until WS4 merges                                                                         |
| Login loops back to /login                    | Supabase redirect URLs (§3.5) and `NEXT_PUBLIC_APP_URL`                                                         |
| Webhook 400 bad signature                     | `STRIPE_WEBHOOK_SECRET` must match the running `stripe listen` session (local) or the dashboard endpoint (prod) |
| Data disappeared                              | `DATA_MODE=memory` resets on restart — expected                                                                 |
| Playwright can't find a browser               | `pnpm exec playwright install chromium`                                                                         |
