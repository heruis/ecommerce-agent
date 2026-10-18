---
name: listing-localizer
description: Run the ListWise listing pipeline by hand inside Claude Code on a Chinese product description, to prototype or debug agent prompts before changing the server code. Use when asked to "try the pipeline", "localize this product" or test a prompt idea.
---

# Listing localizer (the dev twin of the product)

The course pattern: build and iterate with a Skill locally, then translate it to the server. In ListWise the translation is already done, so this skill reads the **same prompts the server uses** — edit a prompt file, re-run this skill, compare.

| Skill concept                                 | Where it lives on the server                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| Step instructions (this file) → system prompt | `src/lib/agents/*/prompt.ts`                                                      |
| Tools you call by hand → `tools` array        | `src/lib/agents/*/tools.ts` (`check_listing`, `search_policy`, `lookup_evidence`) |
| Skill calls skill → orchestrator loop         | `src/lib/pipeline/orchestrator.ts`                                                |
| Output format → zod contract                  | `src/lib/contracts/schemas.ts`                                                    |

## Steps

Input: the user's Chinese product text (and evidence, if any).

1. **Guardrails** — check the text with the rules in `src/lib/guardrails/input.ts` (injection, prohibited products, contact details). If it would be blocked, stop and say why.
2. **Extraction** — follow `src/lib/agents/extraction/prompt.ts`. Output a `ProductFacts` JSON.
3. **Keywords** — follow `src/lib/agents/keywords/prompt.ts`. Output a `KeywordSet` JSON (label: AI-suggested).
4. **Localization** — follow `localizationSystem("amazon_us")` in `src/lib/agents/localization/prompt.ts`. Check limits from `src/lib/rules/amazon-us.ts` yourself.
5. **Compliance** — follow `src/lib/agents/compliance/prompt.ts`. Instead of search_policy, read the matching files in `knowledge/policies/` and cite them by `doc_id#section-number`.
6. **Gate** — remove anything restricted, as `src/lib/guardrails/gate.ts` would.

Output each step's JSON in a fenced block, then a short "What I would change in the prompts" section.

## To compare with the real code path

`AI_MODE=live` in .env.local, then run the app or `pnpm eval --suite golden --limit 3`.
