---
name: eval-loop
description: Improve an agent prompt, rule or retriever with the eval loop (define success, golden output, run variations, compare, fix the system). Use when a golden case fails, before merging a prompt change, or when asked to "hill-climb" or "make the evals pass".
---

# The eval loop (course Module 2)

1. **Define success** — read the failing case(s) in `evals/datasets/golden.jsonl` and `evals/lib/checks.ts`: what must the output contain, what must it never contain?
2. **Baseline** — run `pnpm eval --suite golden` (mock mode for logic, `AI_MODE=live` for prompts). Save the pass rate and the failing dimensions.
3. **Find the pattern** — group failures by dimension (outcome, process, output_contract, efficiency). Delegate to the `eval-analyst` subagent if there are many.
4. **Fix the system, not the output** — change ONE thing: a prompt (`src/lib/agents/*/prompt.ts`), a rule (`src/lib/rules`, `src/lib/guardrails`), a tool, or the knowledge base. Never edit a golden case to make it pass.
5. **Re-run** — same command. Keep the change only if the pass rate went up and nothing else regressed. Live runs cost money: use `--limit` while iterating.
6. **Ship rule** — do not merge below 80% golden pass rate (live mode before the demo).
7. **Record** — add one line to `memory/lessons-learned.md`: what failed, why, what fixed it.

## Adding a golden case (when you find a new failure in the app)

Copy a real input (from a trace), write the `expect` block before running it, then run the loop. Aim for real seller text, not invented examples.
