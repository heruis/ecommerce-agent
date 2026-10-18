# Course requirements → repo traceability

Every requirement from the four module decks of _440 Building LLM Applications_, mapped to where it lives in this repo and who owns it. Status: ✅ in place · 🟡 scaffolded, owner finishes · ⬜ to do. The lead keeps this table current; graders can use it as a map.

## Capstone must-haves (Module 4)

| Requirement                                                                      | Where                                                                                                               | Owner      | Status                                                                |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| Live URL, not localhost                                                          | Vercel — `docs/DEPLOYMENT.md`                                                                                       | WS4 + lead | ⬜                                                                    |
| User sign-up and login                                                           | `src/app/(auth)/login`, `components/auth/SupabaseAuthForm.tsx`, `lib/auth`, `src/proxy.ts`, demo login in mock mode | WS4        | 🟡 (UI + session done; SupabaseRepo pending)                          |
| AI backend delivering the core value                                             | `src/lib/pipeline`, `agents`, `harness`                                                                             | WS1 + WS2  | ✅ mock end to end · 🟡 live prompts tuned by evals                   |
| Stripe payments (sandbox)                                                        | `lib/billing`, `api/billing/*`, `api/stripe/webhook`                                                                | WS4        | 🟡 (mock checkout + webhook logic + tests done; Stripe calls pending) |
| Well-structured GitHub repo, clear system design decisions                       | this repo, `docs/ARCHITECTURE.md`, `memory/decisions.md`                                                            | Lead       | ✅                                                                    |
| Short write-up (problem, solution, architecture, next steps; ≤ 4–5 pages)        | `docs/report/WRITEUP.md` + `sections/`                                                                              | All        | 🟡 skeleton                                                           |
| Idea → scoped PRD → architecture → implementation → deployment                   | `docs/PRD.md` → `docs/ARCHITECTURE.md` → `src/` → `docs/DEPLOYMENT.md`                                              | Lead       | ✅ / ⬜ deploy                                                        |
| Clear problem, system design, working implementation, live demo, lessons learned | `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/DEMO_SCRIPT.md`, `memory/lessons-learned.md`                           | All        | 🟡                                                                    |

## Grading rubric (Module 4)

| Criterion (points)                       | What we show                                                                               | Evidence in repo                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Business problem & product thinking (15) | Specific pain of Chinese cross-border sellers; why AI; why not ChatGPT; pricing            | `docs/PRD.md` §1–3, §7; seller interviews in write-up                        |
| Implementation completeness (25)         | Login → create → AI run → review/edit → export → pay, end to end                           | e2e test `e2e/smoke.spec.ts`; `docs/DEMO_SCRIPT.md`                          |
| AI design framework (20)                 | Multi-stage pipeline, ReAct + agentic RAG, guardrails, error and edge-case handling, evals | `docs/AGENT_DESIGN.md`, `docs/GUARDRAILS.md`, `docs/EVALS.md`, harness tests |
| Deployment & production readiness (15)   | Live URL, Stripe sandbox, secrets in env, graceful errors                                  | `docs/DEPLOYMENT.md` checklist                                               |
| Engineering quality & system design (10) | Repo structure, readable code, README, architecture diagram, justified decisions           | `README.md`, `docs/ARCHITECTURE.md`, `memory/decisions.md`, CI               |
| Write-up (10)                            | Concise, ≤ 5 pages                                                                         | `docs/report/WRITEUP.md`                                                     |
| Teamwork & presentation (5)              | Clear ownership, real collaboration (PRs, reviews), confident demo                         | `ownership.json`, `docs/team/`, PR history, `docs/DEMO_SCRIPT.md`            |

## Module 1 — Foundations, harnesses, architecture

| Concept                                                                                                      | Where it shows up                                                                              |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| LLM vs agent vs agent harness vs AI product                                                                  | `docs/AGENT_DESIGN.md` §1; harness in `src/lib/harness`                                        |
| Harness building blocks: tools, memory/context, planning, execution, rules                                   | `docs/AGENT_DESIGN.md` §1 table                                                                |
| Agent loop (ask → act → observe → repeat) / ReAct                                                            | `harness/tool-loop.ts` (`stop_reason`-driven)                                                  |
| Context management (include / exclude / update)                                                              | Orchestrator packs per-agent context; agents never see each other's history; traces redact PII |
| Five system-design questions (components, responsibilities, communication, state, trade-offs)                | `docs/ARCHITECTURE.md`, `memory/decisions.md`                                                  |
| Three-layer product architecture (frontend · backend · AI backend) + infra (Supabase, Stripe, GitHub, CI/CD) | `docs/ARCHITECTURE.md` §1                                                                      |
| "Every prompt problem is a system design problem" (context, tools/permissions, the loop)                     | Guardrails in code, tool caps, budgets — `docs/GUARDRAILS.md`                                  |
| PRD first (PRD skill)                                                                                        | `docs/PRD.md`, `.claude/skills/write-prd`                                                      |
| RAG + memory + citations (Lumina assignment pattern)                                                         | Compliance agent: retrieval with citations, citation integrity check                           |

## Module 2 — Skills, subagents, hooks, evals

| Concept                                                                                                                                        | Where                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `.claude/` anatomy — project level: CLAUDE.md, commands/, agents/, skills/, settings.json, hooks, docs/, memory/, scripts/, README, .gitignore | `CLAUDE.md`, `.claude/`, `docs/`, `memory/`, `scripts/`                                                 |
| Team vs personal layer (`settings.local.json`, `CLAUDE.local.md` gitignored; `.mcp.json` shared)                                               | `.gitignore`, `.mcp.json`                                                                               |
| Skills as saved prompts (e.g. `/write-prd`)                                                                                                    | `.claude/skills/{write-prd,listing-localizer,eval-loop,add-policy-doc}`                                 |
| Subagents: six fields (name, description-as-trigger, model tier, scoped tools, memory, skills)                                                 | `.claude/agents/*.md`                                                                                   |
| Five subagents every builder should have (research, PRD review, code review, data analysis, copy)                                              | `policy-researcher`, `prd-reviewer`, `code-reviewer`, `eval-analyst`, `copy-writer`                     |
| Least-privilege tools; read-only reviewers                                                                                                     | reviewers have no write tools; product tools scoped per agent                                           |
| Hub-and-spoke; workers wake up empty; pack the task                                                                                            | `pipeline/orchestrator.ts`                                                                              |
| Lock the output contract; schema over "please return JSON"                                                                                     | zod contracts + structured outputs / strict tools (D-005)                                               |
| Hooks: Pre vs Post; controls in hooks not prompts                                                                                              | `.claude/hooks/*` (ownership, secrets, format)                                                          |
| Subagent patterns: parallel, sequential pipeline, reusable library                                                                             | Baseline scoring runs in parallel; the pipeline is sequential; `.claude/agents` is the reusable library |
| Agent teams (shared task board, role boundaries)                                                                                               | Our team process: `ownership.json`, `docs/team/status/`, `/handoff`                                     |
| Evals: ground truth first, exact-match vs rubric, four dimensions (outcome, process, style, efficiency), 5-step loop, don't ship below 8/10    | `evals/`, `docs/EVALS.md`, `.claude/skills/eval-loop`                                                   |
| Embedded rubric inside agents                                                                                                                  | Every `agents/*/prompt.ts` ends with a self-check                                                       |
| Observability (traces, six things to log) → eval dataset                                                                                       | `harness/tracer.ts`, `/listings/:id/trace`, `docs/EVALS.md`                                             |

## Module 3 — RAG, naive vs agentic, evaluation

| Concept                                                                       | Where                                                                      |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Ingestion → chunking → retrieval → generation, source ids kept on chunks      | `rag/corpus.ts` (chunk per `##`, doc id + URL on each chunk)               |
| Naive RAG baseline                                                            | `LexicalRetriever` (BM25)                                                  |
| Agentic RAG: retrieval as a tool, choose → inspect → retrieve again or answer | Compliance agent with `search_policy` + `lookup_evidence`                  |
| Routing / retrieval alongside other tools                                     | `lookup_evidence` (seller evidence) + `search_policy` (policy KB)          |
| Access control across retrieval                                               | `lookup_evidence` bound to the current seller only; RLS on `policy_chunks` |
| Stopping conditions and operating budgets (≤ 4 tool calls)                    | `search_policy maxCalls: 4`, prompt stopping rules, run budget             |
| Retrieval eval: Recall@k, Precision@k, MRR, NDCG@k vs a golden set            | `evals/lib/metrics.ts`, `evals/datasets/retrieval.jsonl`                   |
| Generation eval: faithfulness (citations must be retrieved), relevance        | Citation integrity check; golden `must_flag` / `required_facts`            |
| Agent execution eval: outcome, process, output contract, efficiency           | `evals/lib/checks.ts`                                                      |
| Embeddings / semantic search                                                  | pgvector table + `match_policy_chunks` in the migration; `VectorRetriever` | 🟡 WS2 |

## Module 4 — Deployment, architecture, guardrails

| Concept                                                                                                               | Where                                                                                    |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Agentic harness (Claude Code: skills, subagents, orchestrator) vs agentic product (Anthropic SDK)                     | `.claude/` vs `src/lib/harness` — `docs/AGENT_DESIGN.md` §5                              |
| Skills → server translation (system prompt, tools array, orchestrator loop)                                           | `docs/AGENT_DESIGN.md` §5, `listing-localizer` skill                                     |
| Four layers on Vercel (Next.js, API routes, Claude Haiku/Sonnet, Supabase)                                            | `docs/ARCHITECTURE.md`                                                                   |
| Choosing a deployment platform (Vercel vs Fly.io vs Railway)                                                          | `docs/DEPLOYMENT.md`, D-002, D-006                                                       |
| Vercel in 5 steps                                                                                                     | `docs/DEPLOYMENT.md`                                                                     |
| PM questions on the frontend: load time, mobile, slow API → loading states                                            | Streaming progress UI, responsive layout, error states (WS3 polish)                      |
| Guardrails: scope (description, system prompt, refusal default)                                                       | Agent prompts' "Job" sections; prohibited products                                       |
| Input is untrusted; injection screening; no tool unlocks from text; tools capped in code                              | `guardrails/input.ts`, tool caps, credits in code                                        |
| The gate that blocks an off-policy reply (PASS → send / FAIL → rewrite)                                               | `guardrails/gate.ts`                                                                     |
| PII: redaction on the data path; mask in logs; authorization in tools (IDOR)                                          | `guardrails/pii.ts`, tracer redaction, repo user filters + RLS                           |
| Guardrails in production: input / action-plan / output layers + evaluation                                            | `docs/GUARDRAILS.md` Part A                                                              |
| Guardrails by agent type (skills, sub-agents, agent teams)                                                            | `docs/GUARDRAILS.md` table                                                               |
| Guardrails for agent teams: task graph, role boundaries, communication hygiene, collision avoidance, cost/step limits | Ownership hook + CI, `/handoff` status format, run budgets — `docs/GUARDRAILS.md` Part B |
| ReAct agent                                                                                                           | Localization and compliance loops                                                        |
| RAG evaluation finished in production context                                                                         | `pnpm eval` in CI                                                                        |
