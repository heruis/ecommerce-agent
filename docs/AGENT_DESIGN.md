# Agent design

How the AI backend works, stage by stage, and how it maps onto the course concepts (LLM → agent → harness → product).

## 1. The harness (course Module 1)

The model is one component; the harness around it is what makes it a product. Everything in `src/lib/harness`:

| Harness building block   | ShelfPass implementation                                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tools**                | `defineTool()` — zod-validated input, per-run call caps, spans per call (`tool-loop.ts`)                                                                                                                    |
| **Memory / context**     | Each agent "wakes up empty": the orchestrator packs exactly the context it needs (facts, keywords, drafts, evidence, photos). No shared chat history between agents.                                        |
| **Planning**             | Fixed stage order in the orchestrator; inside the two agentic stages the model plans its own tool calls (ReAct). Independent work runs in parallel (photos ‖ keywords; one localization agent per channel). |
| **Execution**            | `callModel()` (budget check → call → charge → trace), `structuredCall()`, `runToolLoop()`                                                                                                                   |
| **Rules / instructions** | System prompts in `agents/*/prompt.ts`, output contracts in `contracts/`, guardrails in code                                                                                                                |

The agentic loop trusts only `stop_reason`: `tool_use` → execute tools and continue; a final "submit" tool call → validate and return; anything else → one nudge, then fail with `max_iterations`. A turn-budget note forces a best-effort answer on the last turn ("return a partial answer with clear boundaries").

## 2. Hub and spoke

```mermaid
flowchart TB
  input([Seller input<br/>text · channels · photos]) --> g1[Input guardrails<br/>code]
  g1 --> ex[Extraction agent<br/>fast · structured]
  ex --> im[Photo check<br/>fast · vision · structured]
  ex --> kw[Keyword agent<br/>fast · structured]
  kw --> lo[Localization agents<br/>smart · ReAct · one per channel, parallel]
  lo <--> t1[[check_listing<br/>that channel's rule engine]]
  lo --> co[Compliance agent<br/>smart · agentic RAG · all drafts]
  co <--> t2[[search_policy<br/>BM25 / vector · selected channels]]
  co <--> t3[[lookup_evidence<br/>seller facts only]]
  co --> gate[Policy gate<br/>code · per channel]
  gate --> sc[Scoring + publish fields<br/>code + fast judge · per channel]
  im --> rep[Main-image verdicts<br/>code]
  input -. existing listing .-> base[Baseline score<br/>parallel]
  sc --> out([Report: keywords · photos · channel tabs · claim review · trace])
  rep --> out
  base --> out
```

The orchestrator is the hub. Specialists never talk to each other (no peer-to-peer), which keeps each one testable with a fixed input and output contract. Only two stages are agentic, because only they benefit from choosing their own next step; counting, validation, credits, the final gate and the field mapping are plain code.

Why one localization agent per channel but one compliance review: each channel has its own style and limits, so each draft gets its own loop and its own `check_listing` tool built from that channel's rules; the three run in parallel, each in its own trace span. A claim, though, is the same claim on every channel ("FDA approved" is misleading on Amazon and on Shopify), so the compliance agent reviews all drafts at once, assesses each phrase once, and the gate applies that verdict wherever the phrase appears. A typical three-channel run is about 13 model calls (mock mode: extraction 1, keywords 1, localization 3 × 2, compliance 2, judge 3, baseline 1, plus 1 for photos when uploaded).

## 3. Agent cards

### Extraction — `agents/extraction` (WS1)

- **Job:** Chinese text → `ProductFacts` (facts with verbatim source quotes, marketing claims kept separate, missing info).
- **Tier / effort:** fast / low. **Pattern:** single structured call (`output_config.format` from zod).
- **Guardrails:** seller text wrapped in `<seller_input>`; _grounding check_ in code downgrades any fact whose quote is not in the input.
- **Failure modes:** invents specs (caught by grounding check); treats claims as facts (golden `must_flag` cases).

### Keywords — `agents/keywords` (WS1)

- **Job:** facts → one `KeywordSet` for every selected channel (3–5 primary, 5–15 secondary, 4–8 TikTok hashtags). Always labeled **AI-suggested**: we have no search-volume data.
- **Tier / effort:** fast / low. **Post-processing in code:** lowercase, dedupe, drop promotional words; hashtags lose `#` and spaces.

### Photo check — `agents/images` (WS2)

- **Job:** up to 4 seller photos → `ImageAnalysis` (per photo: what it shows, background pure white / light plain / busy, text or logo, watermark, product fill, props, quality issues, alt text; suggested main photo).
- **Tier / effort:** fast / low. **Pattern:** single structured call with image blocks. Runs only when photos were uploaded, in parallel with keywords.
- **The model describes; code decides.** `report/images.ts` turns observations into a main-image verdict per channel (Amazon needs pure white, no text, no props; TikTok and Shopify are looser) and builds each channel's rules, gallery guidance and shot list from the facts.
- **Guardrails:** photo bytes are checked against the declared type before any call; file names are sanitized; the prompt says text inside photos is data. Photo bytes are left out of traces. Mock mode cannot see pixels and says so.

### Localization — `agents/localization` (WS1)

- **Job:** facts + keywords → one `ListingDraft` per selected channel that passes that channel's rule engine. Fields: title, bullets (Amazon bullet points / TikTok selling points / Shopify highlights), description, `search_terms` (Amazon only), `seo_title` + `seo_description` (Shopify only), `tags` (TikTok hashtags / Shopify tags). Unused fields stay empty.
- **Tier / effort:** smart / medium. **Pattern:** ReAct loop, ≤ 6 turns, one loop per channel, run in parallel.
- **Tools:** `check_listing` (≤ 4 calls) runs `validateListing(draft, platform)` + the claim lexicon and returns violations; final tool `submit_listing` (strict schema).
- **Rule:** rewrite, never truncate. The prompt's channel section (limits and style) is generated from the same config the validator uses (`rules/amazon-us.ts`, `tiktok-us.ts`, `shopify.ts`), so they cannot drift.

### Compliance — `agents/compliance` (WS2)

- **Job:** every seller claim and every claim-like phrase in any channel's draft → `ClaimAssessment` (verified / unverified / restricted, risk, action, suggested fix, evidence ids, policy citations). One review covers all drafts; the same phrase is assessed once.
- **Tier / effort:** smart / medium. **Pattern:** agentic RAG, ≤ 6 turns.
- **Tools:** `search_policy` (≤ 4 calls — the course's classroom budget; filtered to policies for the selected channels plus general US rules), `lookup_evidence` (≤ 8; authorization in code: it can only read _this_ seller's facts and evidence).
- **Stopping rules (in the prompt):** all claims assessed → submit; searches stop adding evidence → state the gap; tool failure / conflict → note in `uncertainty`.
- **Post-processing in code:** _citation integrity_ (drop any policy reference that was not actually retrieved in this run) and _lexicon backstop_ (add any risky draft phrase the agent missed).

### Policy gate — `guardrails/gate.ts` (WS2, code)

Runs once per channel. Applies rewrite/remove actions wherever the phrase appears (title, bullets, description, search terms, SEO title and description, tags), then sweeps every field with the lexicon until nothing restricted remains, re-validates that channel's rules, and returns PASS/FAIL plus a needs-review list (e.g. unverified claims the seller must confirm).

### Report builder — `report/` (WS1, code)

- `fields.ts` maps each gated listing onto that site's "add product" form, field by field and in order (from `rules/*.ts` `form`): each field is _generated_ (from the listing), _fact_ (from the seller's input, e.g. brand, material, weight) or _seller_ (only the seller can fill it, e.g. UPC, price), with status ok / warning / missing and the validator's message as a note.
- `images.ts` builds main-image verdicts and per-channel photo guidance.
- `view.ts` (`channelViews`) is the one read path for the UI, the printable report and exports: a channel with seller edits is re-validated, re-screened and re-mapped in code, so an edit can never skip the checks.
- `markdown.ts` renders the downloadable report.

### Quality judge — `agents/judge` (WS2)

- **Job:** language naturalness and clarity, 1–5 each, with an anchored rubric — the one score dimension code cannot measure. Fast tier, low effort. Runs once per channel. Also scores the seller's existing listing for the before/after comparison (runs in parallel, against the first selected channel's rules).

### Scoring — `scoring/score.ts` (WS2, code)

| Dimension            | Weight | How                                                                                                              |
| -------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| Keyword relevance    | 25     | Primary keywords in title (50%) and body (30%), secondary coverage incl. search terms, SEO fields and tags (20%) |
| Information coverage | 25     | Share of medium/high-confidence facts present; −5 per missing buyer-critical attribute (max −20)                 |
| Language naturalness | 20     | Judge: 70% naturalness + 30% clarity                                                                             |
| Claim verification   | 20     | 100 − 35 per restricted − 10 per unverified claim left − 5 per claim awaiting seller evidence                    |
| Format compliance    | 10     | 100 − 25 per rule error − 5 per warning                                                                          |

Each channel gets its own score. The score is a quality signal, not a conversion prediction; the UI says so.

## 4. Embedded rubrics (course Module 2)

Every agent prompt ends with a self-check over the four dimensions — **scope** (only what was asked), **citation** (facts quote sources / claims cite retrieved policy), **uncertainty** (gaps stated, "couldn't verify X" is a valid answer), **format** (contract followed). The external check is the eval suite (`docs/EVALS.md`).

## 5. Skills → server translation (course Module 4)

| In Claude Code (dev harness)                                  | On the server (product)                                  |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `.claude/skills/listing-localizer/SKILL.md` step instructions | `src/lib/agents/*/prompt.ts` system prompts              |
| Tools the skill uses by hand                                  | `tools` arrays built by `runToolLoop()` from zod schemas |
| Skill calls skill                                             | `src/lib/pipeline/orchestrator.ts`                       |
| Output format in the skill                                    | zod contracts → structured outputs / strict tools        |

Iterate on a prompt with the skill (it reads the same prompt files), then confirm with `pnpm eval`.

## 6. Models and cost

Two tiers, set by env (`ANTHROPIC_MODEL_SMART`, `ANTHROPIC_MODEL_FAST`) — copy current IDs from the Anthropic models overview page (see `docs/SETUP.md`). Smart: localization, compliance. Fast: extraction, photo check, keywords, judge. Prices for the trace's cost column come from env as well. System prompts are sent with `cache_control` so repeated runs hit the prompt cache (watch `cache_read_tokens` in traces).

Per-run budget (`harness/budget.ts`): 40 calls · 400k tokens · $1.50 · 240 s. Typical mock run for three channels: about 13 calls. Measure live cost per run in traces before changing the Pro cap.

## 7. Adding a channel (e.g. Walmart)

1. Add `src/lib/rules/<channel>.ts` with limits, style, banned phrases, main-image rules and the `form` field list; register it in `registry.ts` and add the id to `PLATFORMS` in contracts (lead) (WS2).
2. Add any channel-specific policy docs to `knowledge/policies` with `platforms: [<channel>]` (WS2).
3. Add the checkbox in the form (WS3) and golden cases with `"platforms": ["<channel>"]` (WS1/WS2).
   No new agent is needed: the localization prompt, `check_listing`, the gate, the publish fields and the photo guidance are all generated from the rule config — that is the point of the design.

## 8. Not built: direct publishing

The report stops at "every field, ready to paste". Publishing through Amazon SP-API, the TikTok Shop Partner API or the Shopify Admin API needs developer registration, app review and per-seller authorization that take longer than the capstone's one week. The `fields` contract (form key → value) is what a future publisher would send; see `docs/API_SETUP.md`.
