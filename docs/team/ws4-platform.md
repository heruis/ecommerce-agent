# WS4 — Platform

**Mission:** make ShelfPass a real, paid, live product: accounts, database, payments and deployment. The capstone's must-haves (live URL, sign-up/login, Stripe sandbox, secrets handled securely) are mostly yours.

**Branch prefix:** `ws4/` · **Status file:** `docs/team/status/ws4.md` · **Write-up section:** `docs/report/sections/ws4-platform.md`

## You own

```
src/lib/db/**   src/lib/auth/**   src/lib/billing/**   src/lib/platform/**   src/proxy.ts
src/app/(auth)/**   src/app/auth/**   src/app/api/auth/**   src/app/api/billing/**   src/app/api/stripe/**
src/components/auth/**   supabase/**   scripts/doctor.ts   vercel.json
```

## You consume (do not edit; request changes)

- `Repo`, `BillingProvider`, `SessionUser`, `Profile`, `Listing`, `RunRecord` in `src/lib/contracts` (lead)
- The listing/run API routes (lead) call your `getRepo()` and `getSessionUser()`

## What already exists

- **`SupabaseRepo` implemented** by the lead (D-013: server-side secret key, every query filtered by `user_id`), behaving like `MemoryRepo` (the executable spec). **`StripeBilling`** (Checkout subscription + Customer Portal) and webhook events `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` with tests; a failed handler releases the event so Stripe's retry applies.
- Supabase migration: profiles (auto-created on sign-up), listings, pipeline_runs, stripe_events, RLS, atomic `consume_credit` / `refund_credit`, pgvector table.
- Supabase server/browser clients, session refresh in `src/proxy.ts`, auth callback, email/password form, logout. `pnpm check:env` checks every mode.
- **Not yet tested against a real Supabase project or Stripe test account** — that is your first job.

## Setup you need

SETUP.md §2, §3, §5, §7 (you help the lead create the Supabase project, Stripe account and Vercel project).

## Tasks (one week — P0 must ship, P1 if time, P2 only after the freeze is lifted)

| ID     | Pri | Day | Task                                                                                                                                                                                            | Acceptance criteria                                                                                     |
| ------ | --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| WS4-T1 | P0  | 1–2 | **Live deploy with the lead.** Supabase migration applied; Vercel env vars (production + preview); Supabase Auth URL configuration; `docs/DEPLOYMENT.md` checklist walked end to end.           | Live URL in README; `/api/health` shows live modes; sign up → report → edit → export works on the URL   |
| WS4-T2 | P0  | 2–3 | **Repo contract tests against real Supabase.** `src/lib/db/repo.contract.test.ts` runs the same behavior tests on `MemoryRepo` always and on `SupabaseRepo` when Supabase env vars are present. | 6 concurrent `consumeCredit` on 3 credits → 3 ok; cross-user reads return null; edits per channel saved |
| WS4-T3 | P0  | 3   | **Stripe test mode end to end.** Product + monthly price, keys in Vercel, dashboard webhook endpoint with the three events; test card 4242…; replay an event; cancel in the portal.             | Upgrade grants 50 runs; replay changes nothing; cancellation downgrades; screenshots in the PR          |
| WS4-T4 | P1  | 4   | **Auth polish.** Password reset, friendly errors, redirect back to `next`.                                                                                                                      | Manual test script in the PR                                                                            |
| WS4-T5 | P1  | 5   | **Stuck runs.** A run killed mid-way leaves the listing "running": mark runs older than 10 min failed and refund on read.                                                                       | Test with a fabricated stale run                                                                        |
| WS4-T6 | P2  | —   | **Shared rate limiting** (Postgres function) and an account page.                                                                                                                               | —                                                                                                       |

## How you verify

```bash
pnpm check
DATA_MODE=supabase pnpm exec vitest run src/lib/db      # against your Supabase project
stripe listen --forward-to localhost:3000/api/stripe/webhook   # + BILLING_MODE=stripe
pnpm check:env
```

## Rules specific to WS4

- Credits change only through `consume_credit` / `refund_credit` or the verified webhook. Never grant credits on the success redirect.
- The secret key and webhook secret exist only in `.env.local` and Vercel. `createSupabaseAdminClient()` only in server code.
- Every query filters by `user_id` even though RLS also does (defense in depth).
- Schema changes are new migration files; never edit an applied migration.

## Kickoff prompt (paste into Claude Code)

> You are working on ShelfPass as **WS4 (Platform)** on branch `ws4/live-deploy`. Read `CLAUDE.md`, `docs/team/TEAM_GUIDE.md`, `docs/team/ws4-platform.md`, `docs/ARCHITECTURE.md` §4–5 and `supabase/migrations/20261018000000_init.sql`. You may only edit files that `ownership.json` assigns to ws4; a hook enforces this. If you need a change elsewhere, write it in `docs/team/status/ws4.md` instead. Start with **WS4-T1**: walk `docs/DEPLOYMENT.md` with me step by step for the Supabase project and the Vercel project (I click in the dashboards; you tell me exactly where), then verify with `pnpm check:env` and `/api/health` on the live URL. Then plan **WS4-T2** (the repo contract test) and show me the plan before writing code. Never read `.env.local`; use `pnpm check:env` to verify configuration. Finish with `/check` and `/handoff`.
