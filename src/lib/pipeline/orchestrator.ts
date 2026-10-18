import {
  ProductInput,
  type ListingDraft,
  type PipelineEvent,
  type PipelineResult,
  type PolicyRetriever,
  type ProductInputDraft,
  type QualityScore,
  type RunRecord,
  type Stage,
} from "@/lib/contracts";
import { runCompliance, runExtraction, runJudge, runKeywords, runLocalization } from "@/lib/agents";
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
import { validateListing } from "@/lib/rules";
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
 *   input_guardrails -> extraction -> keywords -> localization -> compliance
 *   -> output_gate -> scoring        (baseline scoring runs in parallel)
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

    // Baseline ("before") score runs in parallel with the main pipeline.
    const baselinePromise: Promise<QualityScore | null> = input.existing_listing_en
      ? scoreBaseline(
          ctxFor(rootSpan),
          input.existing_listing_en,
          input.platform,
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

    const keywords = await stage(
      "keywords",
      { product_type: facts.product_type },
      (ctx) => runKeywords(ctx, facts, input.platform),
      (r) =>
        `${r.primary.length} primary and ${r.secondary.length} secondary AI-suggested keywords`,
    );

    const { draft } = await stage(
      "localization",
      { facts: facts.facts.length },
      (ctx) => runLocalization(ctx, input, facts, keywords),
      (r) => `Draft written in ${r.turns} turns`,
    );

    const compliance = await stage(
      "compliance",
      { claims: facts.marketing_claims.length },
      (ctx) => runCompliance(ctx, input, facts, draft, retriever),
      (r) => r.summary,
    );

    const gated = await stage(
      "output_gate",
      { claims: compliance.claims.length },
      async () =>
        applyGate({
          draft,
          compliance,
          platform: input.platform,
          brand: input.brand,
          evidence: input.evidence,
        }),
      (r) =>
        r.gate.decision === "pass"
          ? `PASS — ${r.gate.applied_fixes.length} fixes applied`
          : `FAIL — ${r.gate.needs_review.length} issues need review`,
    );

    const score = await stage(
      "scoring",
      {},
      async (ctx) => {
        const judge = await runJudge(ctx, gated.listing);
        return computeScore({
          listing: gated.listing,
          validation: gated.validation,
          judge,
          keywords,
          facts,
          compliance,
          evidence: input.evidence,
        });
      },
      (r) => `Quality score ${r.total}/100`,
    );

    const result: PipelineResult = {
      platform: input.platform,
      facts,
      keywords,
      draft,
      listing: gated.listing,
      validation: gated.validation,
      compliance,
      gate: gated.gate,
      score,
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
    emit({ type: "run_failed", run_id: runId, error: err.message, code: err.code });
    return { result: null, run, error: err };
  }
}

async function scoreBaseline(
  ctx: AgentContext,
  existing: string,
  platform: PipelineResult["platform"],
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
