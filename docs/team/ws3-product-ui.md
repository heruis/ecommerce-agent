# WS3 — Product UI

**Mission:** turn a working pipeline into a product a seller trusts in the first 30 seconds and a grader remembers after a 3-minute demo. You own every page and component (except auth forms), the report experience (tabs, copy buttons, printable report, exports) and the end-to-end tests.

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

- Every page works in mock mode: landing, login, dashboard, **new listing** (channel checkboxes, up to 4 photos downscaled in the browser by `PhotoPicker`), **listing workspace** (streamed progress → keywords, photo check, one **tab per channel** with the site's add-product fields + copy buttons, photo rules and shot list, policy gate, per-channel editor and score; shared claim review), **printable report** (`/listings/[id]/report`, print to PDF), trace page, billing.
- Exports: per-channel CSV/TXT, JSON of all fields, Markdown report (`src/lib/export`).
- Playwright smoke test (sign in → example + photo → three tabs → printable report → upgrade; injection blocked).
- Functional, not polished: that is your job. Everything runs in mock mode, so **you never wait for other workstreams**.

## Setup you need

SETUP.md §2 only. Optional §4 to see real outputs.

## Tasks (one week — P0 must ship, P1 if time, P2 only after the freeze is lifted)

| ID     | Pri | Day | Task                                                                                                                                                                                                                          | Acceptance criteria                                                                               |
| ------ | --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| WS3-T1 | P0  | 2–3 | **Report workspace polish.** Clear hierarchy (what to copy vs what to fix), sticky channel tabs, "you fill in" fields as a checklist, inline violations next to the field in the editor, live counters amber/red near limits. | Reviewed by lead with screenshots; e2e: edit TikTok title to add "FDA approved" → gate shows FAIL |
| WS3-T2 | P0  | 3   | **Printable report.** Cover block (product, channels, date, disclaimer), clean page breaks per channel, readable at A4/Letter, photos and shot list, no UI chrome.                                                            | PDF attached to the PR from Chrome "Save as PDF"                                                  |
| WS3-T3 | P0  | 3–4 | **Landing + new-listing page** explain the three channels and the report in 5 seconds; screenshot of a real report in `public/`.                                                                                              | Lighthouse accessibility ≥ 90 on landing and listing pages                                        |
| WS3-T4 | P0  | 4–5 | **States and mobile.** Out of credits, blocked input (no charge), failed + refunded, photo too large / wrong type, network drop (reload shows the saved result); every page usable at 375 px.                                 | Screenshots of each state at 375 px in the PR                                                     |
| WS3-T5 | P1  | 5   | **Before/after view.** The seller's current listing vs the Amazon output side by side with the score delta (demo "wow").                                                                                                      | Visible when a baseline exists                                                                    |
| WS3-T6 | P2  | —   | **Chinese UI toggle** (`src/lib/i18n`, `copy-writer` subagent).                                                                                                                                                               | Toggle persists                                                                                   |

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

> You are working on ShelfPass as **WS3 (Product UI)** on branch `ws3/report-polish`. Read `CLAUDE.md`, `docs/team/TEAM_GUIDE.md`, `docs/team/ws3-product-ui.md` and `docs/PRD.md` §4 (user journey). You may only edit files that `ownership.json` assigns to ws3; a hook enforces this. If you need a change elsewhere, write it in `docs/team/status/ws3.md` instead. Run the app in mock mode, walk the journey from `docs/DEMO_SCRIPT.md`, and list the 10 most important UX problems (with screenshots via Playwright MCP if available), ranked by demo impact. Then propose a plan for **WS3-T1** and **WS3-T2**. Show me the plan before editing. Run `/check` and `pnpm test:e2e` before finishing, then `/handoff`.
