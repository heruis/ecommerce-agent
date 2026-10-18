## What & why

<!-- 1-3 sentences. Link the issue / brief task (e.g. WS2-T3). -->

## Workstream

- [ ] WS1 AI pipeline - [ ] WS2 Trust layer - [ ] WS3 UI - [ ] WS4 Platform - [ ] Lead / contract / chore

## How I verified

- [ ] `pnpm check` passes
- [ ] `pnpm eval` pass rate: ___ / 12 golden (mock) · live (if prompts/rules changed): ___
- [ ] Tried it in the app (`pnpm dev`) — screenshot or short clip below if UI changed
- [ ] New behavior has tests next to the code

## Safety checklist

- [ ] No secrets, keys or `.env.local` content in code, logs or this PR
- [ ] Model output is validated with zod before use; seller text goes through `asSellerData()`
- [ ] Data reads filter by the session user (no IDOR)
- [ ] Only files owned by my workstream changed (CI ownership check passes) — or this is a `contract/`/`chore/` PR

## Contract / cross-workstream impact

<!-- "None", or which contract types / other workstreams are affected and who agreed. -->

## Status file

- [ ] Updated `docs/team/status/<ws>.md` (`/handoff`)
