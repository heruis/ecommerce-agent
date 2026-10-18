# Instructions for AI coding agents (Codex, Cursor, Copilot, …)

This repo's agent instructions live in **[CLAUDE.md](./CLAUDE.md)** — read it first; the same rules apply to every agent.
Workstream boundaries are in `ownership.json` and enforced in CI (`node scripts/check-ownership.mjs`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
