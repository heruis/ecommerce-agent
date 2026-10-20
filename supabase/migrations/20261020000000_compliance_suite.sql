-- ShelfPass — compliance suite: evidence library, audits and appeals (tool
-- runs), purchased credits. Merged from the team's Listing Copilot prototype.
-- Apply after 20261018000000_init.sql (SQL editor: paste & run). Safe to re-run.

-- ---------------------------------------------------------------------------
-- Evidence library: documents that let a claim stay in a listing
-- ---------------------------------------------------------------------------
create table if not exists public.evidence (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('test_report', 'certificate', 'registration', 'invoice', 'other')),
  issuer text not null default '',
  reference text not null default '',
  claims text[] not null default '{}',
  expires_on date,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists evidence_user_created_idx on public.evidence (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Tool runs: listing audits and takedown/appeal help, one row per request
-- ---------------------------------------------------------------------------
create table if not exists public.tool_runs (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('audit', 'appeal')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  input jsonb not null,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tool_runs_user_kind_idx on public.tool_runs (user_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security (the server also filters by user_id in code — D-013)
-- ---------------------------------------------------------------------------
alter table public.evidence enable row level security;
alter table public.tool_runs enable row level security;

drop policy if exists "evidence: own rows" on public.evidence;
create policy "evidence: own rows" on public.evidence
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "tool_runs: own rows" on public.tool_runs;
create policy "tool_runs: own rows" on public.tool_runs
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Credit packs: add purchased credits atomically. Called only by the verified
-- Stripe webhook through the server's secret key.
-- ---------------------------------------------------------------------------
create or replace function public.add_credits(p_user_id uuid, p_amount integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set credits_remaining = credits_remaining + greatest(p_amount, 0)
   where id = p_user_id
  returning credits_remaining;
$$;

revoke all on function public.add_credits(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_credits(uuid, integer) to service_role;
