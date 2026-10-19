# Timeline (1 week — due 2026-10-25; adjust if the real due date differs)

Scope is frozen: one report per product for Amazon US, TikTok Shop US and Shopify (D-011, D-012). No direct publishing.

| Day | Date   | Goal                      | Exit criteria                                                                                                           |
| --- | ------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | Mon 19 | Live URL + everyone set   | Lead deploys to Vercel with live Claude + Supabase; everyone runs `pnpm dev` in mock mode and starts their T1           |
| 2   | Tue 20 | Live baseline             | `AI_MODE=live pnpm eval` recorded (pass rate, cost, latency per channel); top 3 failures per workstream in status files |
| 3   | Wed 21 | Fix the top failures      | Prompt/rule/UI fixes merged; Stripe test checkout works on the live URL                                                 |
| 4   | Thu 22 | Integrate, feature freeze | Golden ≥ 80% live; full journey works on the live URL; no new features after today                                      |
| 5   | Fri 23 | Harden + write            | Red-team cases, error states, mobile at 375 px; each workstream's write-up section drafted                              |
| 6   | Sat 24 | Demo                      | Write-up integrated (≤ 5 pages); 3-minute demo rehearsed twice on the live URL; final live eval recorded                |
| 7   | Sun 25 | Buffer + submit           | Submit; tag `v1.0`                                                                                                      |

Milestone owners: lead tracks this file; each workstream updates `docs/team/status/<ws>.md` daily this week (`/handoff`).
