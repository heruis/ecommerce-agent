import {
  ProductInput,
  type ChannelResult,
  type ClarifyingQuestion,
  type ImageAnalysis,
  type ListingDraft,
  type Platform,
  type PipelineEvent,
  type PipelineResult,
  type PolicyRetriever,
  type ProductInputDraft,
  type QualityScore,
  type RunRecord,
  type Stage,
} from "@/lib/contracts";
import {
  clarifyingQuestions,
  runCompliance,
  runExtraction,
  runImageCheck,
  runJudge,
  runKeywords,
  runLocalization,
} from "@/lib/agents";
import { applyGate, redactForLog, screenInput } from "@/lib/guardrails";
import {
  AgentError,
  Budget,
  DEFAULT_RUN_LIMITS,
  errorMessage,
  getLlmClient,
  isAgentError,
  Tracer,
  type AgentContext,
  type BudgetLimits,
  type LlmClient,
} from "@/lib/harness";
import { getRetriever } from "@/lib/rag";
import { buildPublishFields, imageGuidance, mainImageVerdicts } from "@/lib/report";
import { platformLabel, validateListing } from "@/lib/rules";
import { computeScore, parseExistingListing } from "@/lib/scoring";
import { newId, nowIso } from "@/lib/utils/ids";

export interface RunOptions {
  runId?: string;
  listingId?: string;
  emit?: (event: PipelineEvent) => void;
  llm?: LlmClient;
  retriever?: PolicyRetriever;
  limits?: BudgetLimits;
}

export interface RunOutcome {
  result: PipelineResult | null;
  run: RunRecord;
  error: AgentError | null;
}

/**
 * The orchestrator: a fixed, inspectable workflow (hub) that hands each
 * specialist (spoke) exactly the context it needs. Agents never talk to each
 * other; every hand-off goes through here (course Module 2: hub-and-spoke).
 *
 *   input_guardrails -> extraction -> [images ‖ keywords]
 *   -> localization (one agent per channel, in parallel) -> compliance (one
 *   review across all drafts) -> output_gate (per channel) -> scoring + publish
 *   fields (per channel)              (baseline scoring runs in parallel)
 *
 * Owner: WS1. Stage order and hand-offs are documented in docs/AGENT_DESIGN.md.
 */
export async function runPipeline(
  rawInput: ProductInputDraft,
  opts: RunOptions = {},
): Promise<RunOutcome> {
  const runId = opts.runId ?? newId("run");
  const emit = opts.emit ?? (() => {});
  const llm = opts.llm ?? getLlmClient();
  const retriever = opts.retriever ?? getRetriever();
  const tracer = new Tracer(redactForLog);
  const budget = new Budget(opts.limits ?? DEFAULT_RUN_LIMITS);
  const startedAt = nowIso();
  const rootSpan = tracer.start("pipeline", "run", null, undefined, {
    run_id: runId,
    mode: llm.mode,
  });

  const ctxFor = (spanId: string): AgentContext => ({ runId, llm, tracer, budget, spanId, emit });

  async function stage<T>(
    name: Stage,
    input: unknown,
    fn: (ctx: AgentContext) => Promise<T>,
    summary: (r: T) => string,
  ) {
    emit({ type: "stage_started", stage: name });
    try {
      const result = await tracer.span(name, "stage", rootSpan, input, (spanId) =>
        fn(ctxFor(spanId)),
      );
      emit({ type: "stage_completed", stage: name, summary: summary(result) });
      return result;
    } catch (e) {
      emit({ type: "stage_failed", stage: name, error: errorMessage(e) });
      throw e;
    }
  }

  emit({ type: "run_started", run_id: runId, ai_mode: llm.mode });
  const warnings: string[] = [];

  try {
    const parsed = ProductInput.safeParse(rawInput);
    if (!parsed.success) {
      throw new AgentError(
        "guardrail_blocked",
        parsed.error.issues.map((i) => i.message).join("; "),
      );
    }

    // Layer 1 guardrails: nothing reaches a model until this passes.
    const screen = await stage(
      "input_guardrails",
      { fields: Object.keys(parsed.data) },
      async () => {
        const result = screenInput(parsed.data);
        if (result.blocked)
          throw new AgentError("guardrail_blocked", result.reason ?? "Input was blocked.");
        return result;
      },
      (r) => (r.warnings.length ? r.warnings.join(" ") : "Input passed all checks."),
    );
    warnings.push(...screen.warnings);
    const input = screen.sanitized;

    // Baseline ("before") score runs in parallel with the main pipeline. It
    // uses the first selected channel's rules (the seller's current listing
    // usually comes from Amazon).
    const baselinePromise: Promise<QualityScore | null> = input.existing_listing_en
      ? scoreBaseline(
          ctxFor(rootSpan),
          input.existing_listing_en,
          input.platforms[0],
          input.brand,
        ).catch(() => null)
      : Promise.resolve(null);

    const extraction = await stage(
      "extraction",
      { title: input.title_zh },
      (ctx) => runExtraction(ctx, input),
      (r) =>
        `${r.facts.facts.length} facts, ${r.facts.marketing_claims.length} seller claims to verify`,
    );
    warnings.push(...extraction.warnings);
    const facts = extraction.facts;

    // Too thin to write from: ask the seller instead of inventing details.
    const questions = clarifyingQuestions(facts);
    if (questions.length > 0) {
      throw new AgentError(
        "needs_info",
        "We need a few more details before we can write this listing. No credit was used.",
        { questions },
      );
    }

    // Photos (optional) and keywords only need the facts: run them together.
    const imagesPromise: Promise<ImageAnalysis | null> =
      input.images.length > 0
        ? stage(
            "images",
            { photos: input.images.length },
            (ctx) => runImageCheck(ctx, input.images, facts.product_type),
            (r) =>
              r.suggested_main_index === null
                ? `${r.images.length} photo(s) checked; none works as a main image`
                : `${r.images.length} photo(s) checked; photo ${r.suggested_main_index + 1} suggested as main`,
          ).catch((e) => {
            warnings.push(`Photo check skipped: ${errorMessage(e)}`);
            return null;
          })
        : Promise.resolve(null);

    const keywords = await stage(
      "keywords",
      { product_type: facts.product_type, platforms: input.platforms },
      (ctx) => runKeywords(ctx, facts, input.platforms),
      (r) =>
        `${r.primary.length} primary, ${r.secondary.length} secondary keywords and ${r.hashtags.length} hashtags (AI-suggested)`,
    );

    // One localization agent per channel, in parallel; each gets its own span.
    const drafts = await stage(
      "localization",
      { platforms: input.platforms },
      (ctx) =>
        Promise.all(
          input.platforms.map((platform) =>
            tracer.span(`localization.${platform}`, "stage", ctx.spanId, { platform }, (spanId) =>
              runLocalization({ ...ctx, spanId }, platform, input, facts, keywords),
            ),
          ),
        ),
      (r) => r.map((d) => `${platformLabel(d.platform)} draft in ${d.turns} turns`).join(" · "),
    );

    const compliance = await stage(
      "compliance",
      { claims: facts.marketing_claims.length, drafts: drafts.length },
      (ctx) => runCompliance(ctx, input, facts, drafts, retriever),
      (r) => r.summary,
    );

    const gated = await stage(
      "output_gate",
      { claims: compliance.claims.length },
      async () =>
        drafts.map((d) => ({
          platform: d.platform,
          draft: d.draft,
          ...applyGate({
            draft: d.draft,
            compliance,
            platform: d.platform,
            brand: input.brand,
            evidence: input.evidence,
          }),
        })),
      (r) =>
        r
          .map(
            (g) =>
              `${platformLabel(g.platform)} ${g.gate.decision === "pass" ? "PASS" : "FAIL"}` +
              (g.gate.decision === "pass"
                ? ` (${g.gate.applied_fixes.length} fixes)`
                : ` (${g.gate.needs_review.length} to review)`),
          )
          .join(" · "),
    );

    const imageAnalysis = await imagesPromise;

    const channels = await stage(
      "scoring",
      {},
      (ctx) =>
        Promise.all(
          gated.map(async (g): Promise<ChannelResult> => {
            const judge = await runJudge(ctx, g.listing, `judge.${g.platform}`);
            const score = computeScore({
              listing: g.listing,
              validation: g.validation,
              judge,
              keywords,
              facts,
              compliance,
              evidence: input.evidence,
            });
            return {
              platform: g.platform,
              draft: g.draft,
              listing: g.listing,
              validation: g.validation,
              gate: g.gate,
              score,
              fields: buildPublishFields({
                platform: g.platform,
                listing: g.listing,
                validation: g.validation,
                input,
                facts,
                keywords,
              }),
              images: imageGuidance(g.platform, facts, keywords),
            };
          }),
        ),
      (r) => r.map((c) => `${platformLabel(c.platform)} ${c.score.total}/100`).join(" · "),
    );

    const result: PipelineResult = {
      platforms: input.platforms,
      facts,
      keywords,
      channels,
      compliance,
      images: mainImageVerdicts(input.platforms, imageAnalysis),
      baseline_score: await baselinePromise,
      warnings,
    };

    tracer.end(rootSpan, { attrs: { status: "completed" } });
    const run = record(
      runId,
      opts.listingId,
      startedAt,
      "completed",
      llm.mode,
      budget,
      tracer,
      null,
    );
    emit({ type: "run_completed", run_id: runId, result, usage: run.usage });
    return { result, run, error: null };
  } catch (e) {
    const err = isAgentError(e) ? e : new AgentError("llm_error", errorMessage(e));
    tracer.end(rootSpan, { error: err.message });
    const run = record(
      runId,
      opts.listingId,
      startedAt,
      "failed",
      llm.mode,
      budget,
      tracer,
      err.message,
    );
    const questions =
      err.code === "needs_info"
        ? (err.details as { questions?: ClarifyingQuestion[] } | undefined)?.questions
        : undefined;
    emit({
      type: "run_failed",
      run_id: runId,
      error: err.message,
      code: err.code,
      ...(questions ? { questions } : {}),
    });
    return { result: null, run, error: err };
  }
}

async function scoreBaseline(
  ctx: AgentContext,
  existing: string,
  platform: Platform,
  brand: string,
): Promise<QualityScore> {
  const listing: ListingDraft = parseExistingListing(existing);
  const validation = validateListing(listing, platform, { brand });
  const judge = await runJudge(ctx, listing, "baseline_judge");
  return computeScore({ listing, validation, judge });
}

function record(
  id: string,
  listingId: string | undefined,
  startedAt: string,
  status: RunRecord["status"],
  mode: RunRecord["ai_mode"],
  budget: Budget,
  tracer: Tracer,
  error: string | null,
): RunRecord {
  return {
    id,
    listing_id: listingId ?? "",
    status,
    started_at: startedAt,
    finished_at: nowIso(),
    ai_mode: mode,
    usage: budget.snapshot(),
    spans: tracer.spans,
    error,
  };
}
