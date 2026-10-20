# Status — WS1 — AI pipeline

Owner: _name (@github)_ · Brief: [../ws1-ai-pipeline.md](../ws1-ai-pipeline.md)
Update with `/handoff` at least twice a week and whenever you are blocked.

## Latest — 2026-10-19

**Done:**

- WS1-T1 live baseline (`claude-sonnet-5-5` smart, `claude-haiku-5-5` fast): 10/13 golden (77%), $0.091 and 34 s per case. Worst copy: Amazon title repeating "phone" 3x (phone-case), "PP" never spelled out as polypropylene (storage-box); yoga-mat failure was ws2's lexicon
- `src/lib/agents/shared/materials.ts` + `extraction/agent.ts`: material facts spell out the name and keep the abbreviation ("PP" -> "polypropylene (PP)")
- `src/lib/agents/localization/agent.ts`: `submit_listing` is checked against the marketplace rules in code; a rule-breaking listing goes back once with the errors, then is accepted so the run completes and the gate shows it

**Next:** WS1-T4 partial reports (keep the other channels when one fails) · WS1-T5 cost and latency
**Blocked by:** none
**Requests for other workstreams:** none
**Contract changes needed:** none
**Eval impact:** live golden 13/13 in two runs (together with ws2/claim-coverage), $0.083–0.086 and 31–34 s per case · mock 13/13

## History

### 2026-10-19 (lead re-scope)

**Done:** lead re-scoped to a one-week plan: multi-channel report (Amazon US, TikTok Shop US, Shopify), photo check, SupabaseRepo and Stripe implemented (see memory/decisions.md D-011–D-014)
**Next:** re-read your brief (tasks changed), set up your environment, start WS1-T1 (live baseline across three channels)
**Blocked by:** none
**Requests for other workstreams:** none
**Contract changes needed:** none
**Eval impact:** baseline (mock) 13/13 golden

### 2026-10-18

**Done:** foundation merged by lead (mock mode end to end)
**Next:** read the brief, set up your environment, start task WS1-T1
**Blocked by:** none
**Requests for other workstreams:** none
**Contract changes needed:** none
**Eval impact:** baseline (mock) 12/12 golden
