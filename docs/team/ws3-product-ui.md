# WS3 — Product UI

**Mission:** turn a working pipeline into a product a seller trusts in the first 30 seconds and a grader remembers after a 3-minute demo. You own every page and component (except auth forms), the review/edit/export experience and the end-to-end tests.

**Branch prefix:** `ws3/` · **Status file:** `docs/team/status/ws3.md` · **Write-up section:** `docs/report/sections/ws3-product.md`

## You own

```
src/app/(marketing)/**   src/app/(app)/**   src/app/layout.tsx   src/app/globals.css
src/components/** (except components/auth/**)   src/lib/export/**   src/lib/i18n/**   public/**   e2e/**
```

## You consume (do not edit; request changes)

- API routes in `src/app/api/listings/*` and `api/runs/*` (lead) — response shapes are stable
- `PipelineEvent`, `PipelineResult`, `Listing` types (lead) · auth forms and billing endpoints (WS4)

## What already exists

- Functional v0 of every page: landing, login (demo + Supabase forms), dashboard, new listing (with examples), listing workspace (streaming progress → editor, score card, compliance table), trace page, billing + mock checkout. Plain Tailwind UI kit in `components/ui`.
- Playwright smoke test (sign in → generate → upgrade; injection blocked).
- Everything works in mock mode, so **you never wait for other workstreams**.

## Setup you need

SETUP.md §2 only. Optional §4 to see real outputs.

## Tasks

| ID     | Pri | Task                                                                                                                                                                                                                        | Acceptance criteria                                                                           |
| ------ | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| WS3-T1 | P0  | **Design pass.** A consistent visual system (keep Tailwind tokens or adopt shadcn/ui — ask the lead for the `chore/` dependency PR first), a landing page that explains the problem in 5 seconds, screenshots in `public/`. | Lighthouse accessibility ≥ 90 on landing and listing pages; reviewed by lead                  |
| WS3-T2 | P0  | **Run experience.** Clear stage progress, readable tool-call log, error states for out of credits (link to billing), blocked input (no charge), failed + refunded, network drop (reload shows the saved result).            | Each state demonstrated in the PR (screenshots); no dead ends                                 |
| WS3-T3 | P0  | **Editor.** Violations shown inline next to the field they belong to, live counters turning amber/red near limits, copy buttons per field, unsaved-changes warning, "reset to generated".                                   | e2e test: edit title to include "FDA approved" → save → restricted warning on the title field |
| WS3-T4 | P0  | **Mobile.** Every page usable at 375 px wide (the course's PM checklist: load < 2 s, reflows on a phone, loading states).                                                                                                   | Screenshots at 375 px in the PR                                                               |
| WS3-T5 | P1  | **Human-in-the-loop review.** The "needs your confirmation" items become a checklist; export shows a warning until all are ticked (state can be client-side).                                                               | e2e test covers it                                                                            |
| WS3-T6 | P1  | **Before/after view.** The seller's current listing vs the generated one side by side, with the score delta (the demo's "wow" moment).                                                                                      | Visible when a baseline exists                                                                |
| WS3-T7 | P1  | **Trace page.** Collapsible tree, per-stage cost and time summary, clear "mock" vs "live" labeling.                                                                                                                         | Usable by a grader without explanation                                                        |
| WS3-T8 | P1  | **Chinese UI toggle.** `src/lib/i18n` dictionary (EN/简体中文) for the main flows; use the `copy-writer` subagent.                                                                                                          | Toggle persists; no layout breaks                                                             |
| WS3-T9 | P1  | **E2E coverage.** Add tests: edit + save, export download (CSV content), out-of-credits path, dashboard list.                                                                                                               | `pnpm test:e2e` green in CI                                                                   |

## How you verify

```bash
pnpm dev               # mock mode, instant
pnpm check
pnpm test:e2e          # builds and runs the app in mock mode
```

Use Playwright MCP (in `.mcp.json`) to let Claude Code look at the page it just changed.

## Rules specific to WS3

- Never present keywords as real search data, a score as a sales prediction, or the review as legal approval. Copy says "AI-suggested", "quality score", "risk screening".
- Components read data from API responses and props; no direct database or model calls from UI code.
- Keep the demo examples (`components/listing/examples.ts`) working — the demo script depends on them.

## Kickoff prompt (paste into Claude Code)

> You are working on ListWise AI as **WS3 (Product UI)** on branch `ws3/run-experience`. Read `CLAUDE.md`, `docs/team/TEAM_GUIDE.md`, `docs/team/ws3-product-ui.md` and `docs/PRD.md` §4 (user journey). You may only edit files that `ownership.json` assigns to ws3; a hook enforces this. If you need a change elsewhere, write it in `docs/team/status/ws3.md` instead. Run the app in mock mode, walk the journey from `docs/DEMO_SCRIPT.md`, and list the 10 most important UX problems (with screenshots via Playwright MCP if available), ranked by demo impact. Then propose a plan for **WS3-T2** and **WS3-T3**. Show me the plan before editing. Run `/check` and `pnpm test:e2e` before finishing, then `/handoff`.
