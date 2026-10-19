-- ShelfPass — initial schema
-- Apply with the Supabase SQL editor (paste & run) or `supabase db push`.
-- Owner: WS4. Change the schema only with a NEW migration file; never edit an applied one.

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user. Plan and credits are written only by the
-- server (secret key), never by the browser: users have no UPDATE policy.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  credits_remaining integer not null default 3 check (credits_remaining >= 0),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Listings and pipeline runs (ids are app-generated, e.g. lst_..., run_...)
-- ---------------------------------------------------------------------------
create table if not exists public.listings (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'running', 'completed', 'failed')),
  input jsonb not null,
  result jsonb,
  edited jsonb,
  last_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listings_user_created_idx on public.listings (user_id, created_at desc);

create table if not exists public.pipeline_runs (
  id text primary key,
  listing_id text not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('running', 'completed', 'failed')),
  ai_mode text not null check (ai_mode in ('mock', 'live')),
  usage jsonb not null default '{}'::jsonb,
  spans jsonb not null default '[]'::jsonb,
  error text,
  started_at timestamptz not null,
  finished_at timestamptz
);
create index if not exists pipeline_runs_listing_idx on public.pipeline_runs (listing_id, started_at desc);

-- ---------------------------------------------------------------------------
-- Stripe webhook idempotency: insert the event id first; a duplicate
-- delivery hits the primary key and is ignored.
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: default deny, then allow each user their own rows.
-- The server also filters by user_id in code (defense in depth).
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.stripe_events enable row level security; -- no policies: secret key only

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "listings: own rows" on public.listings;
create policy "listings: own rows" on public.listings
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "runs: own rows" on public.pipeline_runs;
create policy "runs: own rows" on public.pipeline_runs
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Credits: atomic check-and-decrement in ONE statement, so two concurrent
-- runs can never spend the same credit. Returns the new balance, or NULL when
-- the user has no credits left. Callable by the server's secret key only.
-- ---------------------------------------------------------------------------
create or replace function public.consume_credit(p_user_id uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set credits_remaining = credits_remaining - 1
   where id = p_user_id
     and credits_remaining > 0
  returning credits_remaining;
$$;

create or replace function public.refund_credit(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set credits_remaining = credits_remaining + 1 where id = p_user_id;
$$;

revoke all on function public.consume_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_credit(uuid) from public, anon, authenticated;
grant execute on function public.consume_credit(uuid) to service_role;
grant execute on function public.refund_credit(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Vector RAG over the policy knowledge base (RAG_MODE=vector, WS2).
-- 1024 dimensions matches Voyage's default embedding size; change both the
-- column and the function if you pick a model with another size.
-- ---------------------------------------------------------------------------
create extension if not exists vector with schema extensions;

create table if not exists public.policy_chunks (
  chunk_id text primary key,
  doc_id text not null,
  title text not null,
  url text not null,
  platforms text[] not null default '{}',
  content text not null,
  embedding extensions.vector(1024),
  updated_at timestamptz not null default now()
);
create index if not exists policy_chunks_embedding_idx
  on public.policy_chunks using hnsw (embedding extensions.vector_cosine_ops);

alter table public.policy_chunks enable row level security;
drop policy if exists "policy_chunks: read" on public.policy_chunks;
create policy "policy_chunks: read" on public.policy_chunks for select to authenticated using (true);

create or replace function public.match_policy_chunks(
  query_embedding extensions.vector(1024),
  match_count int default 4,
  p_platform text default null
)
returns table (chunk_id text, doc_id text, title text, url text, content text, similarity float)
language sql
stable
set search_path = ''
as $$
  select c.chunk_id, c.doc_id, c.title, c.url, c.content,
         1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
    from public.policy_chunks c
   where p_platform is null or 'all' = any (c.platforms) or p_platform = any (c.platforms)
   order by c.embedding operator(extensions.<=>) query_embedding
   limit match_count;
$$;
