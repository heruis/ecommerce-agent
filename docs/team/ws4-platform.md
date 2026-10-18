# WS4 — Platform

**Mission:** make ListWise a real, paid, live product: accounts, database, payments and deployment. The capstone's must-haves (live URL, sign-up/login, Stripe sandbox, secrets handled securely) are mostly yours.

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

- **Ports and reference implementations:** `MemoryRepo` (the executable spec — your Supabase version must behave identically), `MockBilling`, demo-cookie sessions.
- **Supabase migration** (`supabase/migrations/…_init.sql`): profiles (auto-created on sign-up), listings, pipeline_runs, stripe_events, RLS policies, atomic `consume_credit` / `refund_credit`, pgvector table + match function.
- Supabase server/browser clients, session refresh in `src/proxy.ts`, auth callback route, email/password form, logout.
- Stripe webhook route with signature verification and `applyStripeEvent()` (idempotent) handling `checkout.session.completed`, with tests.
- **Stubs for you:** `SupabaseRepo` (every method `TODO(WS4)`), `StripeBilling` (checkout + portal), webhook events `invoice.paid` and `customer.subscription.deleted` (`it.todo` tests waiting).

## Setup you need

SETUP.md §2, §3, §5, §7 (you help the lead create the Supabase project, Stripe account and Vercel project).

## Tasks

| ID     | Pri | Task                                                                                                                                                                                                                              | Acceptance criteria                                                                                          |
| ------ | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| WS4-T1 | P0  | **SupabaseRepo.** Implement every method per the notes in `db/supabase.ts`. Add `db/repo.contract.test.ts` that runs the same behavioral tests against `MemoryRepo` always and `SupabaseRepo` when Supabase env vars are present. | Contract tests pass for both; 6 concurrent `consumeCredit` on 3 credits → 3 ok; cross-user reads return null |
| WS4-T2 | P0  | **Auth flows.** Sign up (with email confirmation), sign in, sign out, password reset, friendly errors, redirect back to `next`.                                                                                                   | Manual test script in PR; protected pages redirect; no session → API 401                                     |
| WS4-T3 | P0  | **Stripe.** Implement `StripeBilling` (checkout + portal) and the two remaining webhook events; finish the `it.todo` tests. Test locally with `stripe listen`.                                                                    | Test card upgrades the account; replayed event changes nothing; cancellation downgrades                      |
| WS4-T4 | P0  | **Deploy.** Vercel project, env vars (prod + preview), Supabase redirect URLs, Stripe dashboard webhook, `docs/DEPLOYMENT.md` checklist completed.                                                                                | Live URL in README; `/api/health` shows live modes; full journey works on the live URL                       |
| WS4-T5 | P1  | **Stuck runs.** If a function is killed mid-run, the listing stays "running". Mark runs older than 10 min as failed and refund (on read in the repo, or a scheduled job).                                                         | Test with a fabricated stale run                                                                             |
| WS4-T6 | P1  | **Shared rate limiting.** Move `platform/rate-limit.ts` to a shared store (Postgres table + function, or Upstash) and add a per-IP limit on auth endpoints.                                                                       | Limit holds across two server instances                                                                      |
| WS4-T7 | P1  | **`pnpm check:env` complete** for every mode, plus the GitHub branch protection and CI preview deploy setup with the lead.                                                                                                        | Every misconfiguration in SETUP.md §9 detected with a fix hint                                               |
| WS4-T8 | P2  | **Account page:** plan, usage history (runs, cost), delete account and data.                                                                                                                                                      | Deleting removes rows via cascade                                                                            |

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

> You are working on ListWise AI as **WS4 (Platform)** on branch `ws4/supabase-repo`. Read `CLAUDE.md`, `docs/team/TEAM_GUIDE.md`, `docs/team/ws4-platform.md`, `docs/ARCHITECTURE.md` §4–5 and `supabase/migrations/20261018000000_init.sql`. You may only edit files that `ownership.json` assigns to ws4; a hook enforces this. If you need a change elsewhere, write it in `docs/team/status/ws4.md` instead. Start with **WS4-T1**: plan the `SupabaseRepo` implementation method by method (which client, which query, how errors map), and the shared contract test that runs against both `MemoryRepo` and `SupabaseRepo`. Show me the plan before writing code. Never read `.env.local`; use `pnpm check:env` to verify configuration. Finish with `/check` and `/handoff`.
