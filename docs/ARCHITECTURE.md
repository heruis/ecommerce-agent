# Architecture

ListWise follows the four-layer model from the course (Module 4): **Next.js frontend → API routes → Claude AI backend → Supabase**, deployed together on Vercel, with Stripe for payments. The agent harness is wired straight into that stack rather than replacing it.

## 1. System overview

```mermaid
flowchart LR
  user([Seller<br/>browser / phone])

  subgraph vercel[Vercel — one Next.js 16 app]
    ui[Frontend<br/>React pages + components]
    api[API routes<br/>auth · ownership · credits]
    subgraph ai[AI backend — agent harness]
      orch[Orchestrator<br/>hub-and-spoke workflow]
      agents[Specialist agents<br/>extraction · keywords · localization · compliance · judge]
      guard[Guardrails<br/>input screen · output gate]
      rules[Rule engine<br/>platform limits]
      rag[Policy retriever<br/>BM25 / pgvector]
    end
  end

  claude[(Claude API<br/>smart + fast tiers)]
  supa[(Supabase<br/>Postgres · Auth · RLS · pgvector)]
  stripe[(Stripe<br/>Checkout · Portal · Webhooks)]
  kb[[knowledge/policies<br/>cited markdown]]

  user <--> ui
  ui <--> api
  api --> orch
  orch --> guard & agents
  agents --> rules & rag
  agents <--> claude
  rag --> kb
  rag -. vector mode .-> supa
  api <--> supa
  api <--> stripe
  stripe -- webhook --> api
```

| Layer      | Tech                                                                             | Responsibility                                                     | Owner                     |
| ---------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------- |
| Frontend   | Next.js 16 App Router, React 19, Tailwind v4                                     | Pages, forms, streaming progress, editor, export                   | WS3                       |
| Backend    | Next.js route handlers (`src/app/api`), `src/proxy.ts`                           | Auth, ownership checks, credits, rate limits, streaming            | Lead + WS4                |
| AI backend | `src/lib/harness`, `pipeline`, `agents`, `guardrails`, `rules`, `rag`, `scoring` | The product's core value                                           | WS1 + WS2 (harness: lead) |
| Data       | Supabase Postgres + Auth + RLS + pgvector                                        | Users, plans, listings, runs/traces, Stripe events, policy vectors | WS4                       |
| Payments   | Stripe Checkout + webhooks (test mode)                                           | Pro subscription                                                   | WS4                       |

## 2. One pipeline run

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant R as POST /api/listings/:id/run
  participant DB as Repo (Supabase)
  participant O as Orchestrator
  participant C as Claude API

  B->>R: start run
  R->>R: session user · ownership · input screen · rate limit
  R->>DB: consume_credit() (atomic)
  R-->>B: SSE stream opens
  R->>O: runPipeline(input)
  O->>O: Layer 1 guardrails (injection, prohibited, PII redaction)
  O->>C: extraction (fast, structured output)
  O->>C: keywords (fast, structured output)
  loop ReAct (≤ 6 turns)
    O->>C: localization (smart) → tool_use check_listing
    O->>O: rule engine validates draft
  end
  loop Agentic RAG (≤ 4 searches)
    O->>C: compliance (smart) → search_policy / lookup_evidence
    O->>O: BM25 retrieval · evidence lookup
  end
  O->>O: Layer 3 policy gate (apply fixes, strip restricted, re-validate)
  O->>C: quality judge (fast) → score
  O-->>B: stage events (started / tool_called / completed)
  R->>DB: save run (result + spans + usage)
  alt our failure
    R->>DB: refund_credit()
  end
  R-->>B: run_completed
```

## 3. Module map

```
src/
├─ app/                      Next.js routes (pages + api)
│  ├─ (marketing)/           landing                                   WS3
│  ├─ (auth)/login, auth/    sign-in, email callback                    WS4
│  ├─ (app)/                 dashboard, listings, trace, billing        WS3
│  └─ api/
│     ├─ listings/…          create · get · edit · run (SSE) · export   lead
│     ├─ runs/[id]           trace                                      lead
│     ├─ billing/…           checkout · portal · mock                   WS4
│     ├─ stripe/webhook      verified, idempotent                       WS4
│     └─ auth/…              demo login, logout                         WS4
├─ components/               UI kit + listing/billing/auth components  WS3 (auth: WS4)
├─ lib/
│  ├─ contracts/             zod types + ports (interfaces)             lead
│  ├─ harness/               LLM client, structuredCall, runToolLoop,   lead
│  │                         tracer, budget, errors, pricing
│  ├─ pipeline/              orchestrator                               WS1
│  ├─ agents/                extraction · keywords · localization       WS1
│  │                         compliance · judge                         WS2
│  ├─ guardrails/            input screen · PII · claim lexicon · gate  WS2
│  ├─ rules/                 platform rule configs + validator          WS2
│  ├─ rag/                   corpus loader · BM25 · vector retriever    WS2
│  ├─ scoring/               quality score                              WS2
│  ├─ db/ auth/ billing/     ports' implementations                     WS4
│  ├─ platform/              rate limiting                              WS4
│  └─ export/                CSV / TXT / JSON                           WS3
└─ proxy.ts                  Supabase session refresh                   WS4
knowledge/policies/          compliance knowledge base                  WS2
evals/                       golden + retrieval datasets, runner        WS2 (+WS1 datasets)
supabase/migrations/         schema, RLS, credit functions, pgvector    WS4
```

## 4. Ports and adapters

Routes and agents depend on interfaces in `src/lib/contracts/ports.ts`, never on vendors directly. Each port has a zero-setup implementation so everyone can work from day one, and the production one is selected by env:

| Port              | Zero-setup implementation                 | Production implementation       | Switch         |
| ----------------- | ----------------------------------------- | ------------------------------- | -------------- |
| `LlmClient`       | `MockLlmClient` (scripted, deterministic) | `LiveLlmClient` (Anthropic SDK) | `AI_MODE`      |
| `Repo`            | `MemoryRepo`                              | `SupabaseRepo`                  | `DATA_MODE`    |
| `BillingProvider` | `MockBilling`                             | `StripeBilling`                 | `BILLING_MODE` |
| `PolicyRetriever` | `LexicalRetriever` (BM25)                 | `VectorRetriever` (pgvector)    | `RAG_MODE`     |
| Session           | demo cookie                               | Supabase Auth                   | `DATA_MODE`    |

## 5. Data model

```mermaid
erDiagram
  auth_users ||--|| profiles : "trigger creates"
  profiles ||--o{ listings : owns
  listings ||--o{ pipeline_runs : "has runs"
  profiles ||--o{ pipeline_runs : owns
  profiles {
    uuid id PK
    text email
    text plan "free | pro"
    int credits_remaining "check >= 0"
    text stripe_customer_id
    text stripe_subscription_id
    timestamptz current_period_end
  }
  listings {
    text id PK "lst_..."
    uuid user_id FK
    text status "draft | running | completed | failed"
    jsonb input "ProductInput"
    jsonb result "PipelineResult"
    jsonb edited "ListingDraft"
    text last_run_id
  }
  pipeline_runs {
    text id PK "run_..."
    text listing_id FK
    uuid user_id FK
    text status
    text ai_mode
    jsonb usage "tokens, calls, cost"
    jsonb spans "trace"
    text error
  }
  stripe_events {
    text id PK "evt_... (idempotency)"
    text type
  }
  policy_chunks {
    text chunk_id PK
    text doc_id
    vector embedding "1024"
    text content
  }
```

Security model: RLS on every table (users see only their rows); plan/credit changes and Stripe events only through the server's secret key; `consume_credit` / `refund_credit` are `SECURITY DEFINER` functions granted to `service_role` only. Application code still filters by `user_id` on every query (defense in depth).

## 6. Deployment

- **Vercel**: one project linked to GitHub; every push to `main` deploys production, every PR gets a preview URL. Env vars per environment (see `docs/DEPLOYMENT.md`).
- **Supabase**: one project; migrations in `supabase/migrations` applied via SQL editor or `supabase db push`.
- **Stripe**: test mode; webhook endpoint `https://<domain>/api/stripe/webhook` subscribed to `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`.
- **CI** (GitHub Actions): ownership check → lint → typecheck → unit tests → evals (mock) → build → Playwright smoke test.

## 7. Key trade-offs

See `memory/decisions.md` for the full log. The big ones: a fixed workflow with two agentic loops instead of a free-roaming agent (D-003); contracts-first with mock mode everywhere (D-004); structured outputs instead of forced tool choice (D-005); streaming instead of background jobs (D-006); lexical RAG first, vector as a measured upgrade (D-008); defense in depth for claims (D-009).
