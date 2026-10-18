# Contributing

Start with **[docs/team/TEAM_GUIDE.md](docs/team/TEAM_GUIDE.md)** — it explains branches, folder ownership, contracts and how five people work in parallel. The short version:

1. `pnpm install`, `cp .env.example .env.local`, `pnpm dev` (mock mode needs no keys) — see [docs/SETUP.md](docs/SETUP.md).
2. Branch from `main` as `ws<N>/<task>` (workstreams) or `contract/`, `chore/`, `docs/` (lead).
3. Edit only the folders your workstream owns ([ownership.json](ownership.json)). A Claude Code hook and CI enforce it.
4. Before pushing: `pnpm check`, and `pnpm eval` if you touched agents, rules or retrieval.
5. Open a PR with the template filled in; CI green; one review; squash merge.
6. Update `docs/team/status/ws<N>.md` (`/handoff` in Claude Code).

Never commit secrets. Never push to `main` directly.
