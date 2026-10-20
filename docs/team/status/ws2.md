# Status — WS2 — Trust layer

Owner: _name (@github)_ · Brief: [../ws2-trust-layer.md](../ws2-trust-layer.md)
Update with `/handoff` at least twice a week and whenever you are blocked.

## Latest — 2026-10-19

**Done:**

- Live baseline (`claude-sonnet-5-5` smart, `claude-haiku-5-5` fast): 10/13 golden (77%), $0.091 and 34 s per case. Failures: yoga-mat (every run: "Degradable" not matched), phone-case and storage-box (flaky, see ws1)
- `src/lib/guardrails/claims-lexicon.ts`: the biodegradable rule now catches "degradable", "oxo-/photo-degradable" and "compostable", not only "biodegradable" (the output gate let "degradable" through)
- `src/lib/agents/compliance/`: pre-screen checks every rule a seller claim triggers; backstop reports risky seller claims the agent skipped (one verdict per phrase); `citeRestricted` cites every restricted claim; prompt no longer reports plain specs and quotes the shortest claim phrase

**Next:** verify the priority KB docs (WS2-T2) · red-team cases (WS2-T4)
**Blocked by:** none
**Requests for other workstreams:** none
**Contract changes needed:** none
**Eval impact:** live golden 13/13 in two runs (together with ws1/listing-guards), $0.083–0.086 and 31–34 s per case · mock 13/13 · retrieval recall@3 0.933

## History

### 2026-10-19 (lead re-scope)

**Done:** lead re-scoped to a one-week plan: multi-channel report (Amazon US, TikTok Shop US, Shopify), photo check, SupabaseRepo and Stripe implemented (see memory/decisions.md D-011–D-014)
**Next:** re-read your brief (tasks changed), set up your environment, start WS2-T1 (verify the channel rules)
**Blocked by:** none
**Requests for other workstreams:** none
**Contract changes needed:** none
**Eval impact:** baseline (mock) 13/13 golden

### 2026-10-18

**Done:** foundation merged by lead (mock mode end to end)
**Next:** read the brief, set up your environment, start task WS2-T1
**Blocked by:** none
**Requests for other workstreams:** none
**Contract changes needed:** none
**Eval impact:** baseline (mock) 12/12 golden
