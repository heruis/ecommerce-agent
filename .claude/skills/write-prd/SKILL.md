---
name: write-prd
description: Write a PRD or feature spec for ListWise AI from a feature name or idea. Use when asked to spec, scope or write requirements for a feature (e.g. "/write-prd TikTok Shop support").
---

# Write a PRD

Write `docs/prd/<kebab-feature-name>.md` for the feature in the request. Read docs/PRD.md first so the new spec fits the product, and docs/COURSE_REQUIREMENTS.md so it serves the grading rubric.

## Structure (use these headings, in this order)

1. **Problem** — who has it, how often, what it costs them today (2-4 sentences, no solution yet).
2. **Users & jobs** — primary user, the job they hire the feature for.
3. **User stories** — 3-5 in "As a … I want … so that …" form, each with acceptance criteria as a checklist.
4. **Scope** — MVP (must ship) vs Later (explicitly out). Be ruthless; the capstone rewards a finished end-to-end flow over breadth.
5. **AI design** — which agent/stage changes, model tier, tools, output contract (zod type), guardrails, failure modes and fallbacks.
6. **Data & contracts** — new fields/tables; mark any change to src/lib/contracts as a contract change (lead review).
7. **Success metrics** — 2-3 measurable ones, including an eval metric (golden-case pass rate, retrieval recall@3, judge score).
8. **Risks & open questions** — with owner.
9. **Workstream impact** — which of WS1-WS4 touch what (by folder, per ownership.json).

## Rules

- Never claim real search volume, guaranteed marketplace approval or legal compliance.
- Every requirement must be testable; vague words ("fast", "good") need a number.
- Keep it under two pages.

## Success rubric (check before finishing)

- Outcome: every user story has acceptance criteria.
- Process: scope has an explicit "Later" list.
- Style: headings exactly as above.
- Efficiency: under two pages, no repeated content from docs/PRD.md.
