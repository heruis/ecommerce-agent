import type {
  PipelineEvent,
  PolicyRetriever,
  RunUsage,
  Span,
  Stage,
  ToolKind,
} from "@/lib/contracts";
import { redactForLog } from "@/lib/guardrails/pii";
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
import { newId } from "@/lib/utils/ids";

/**
 * Shared plumbing for the suite's tool runs (listing audit, appeal help):
 * the same harness as the main pipeline — tracer spans, a run budget, staged
 * progress events — in a smaller wrapper, so each tool is a short, readable
 * workflow like the orchestrator.
 */

/** Progress events streamed to the browser while an audit or appeal runs. */
export type ToolStreamEvent =
  | PipelineEvent
  | { type: "tool_started"; id: string; kind: ToolKind }
  | { type: "tool_completed"; id: string; kind: ToolKind }
  | { type: "tool_failed"; id: string; kind: ToolKind; error: string; code: string };

export interface ToolRunOptions {
  runId?: string;
  emit?: (event: PipelineEvent) => void;
  llm?: LlmClient;
  retriever?: PolicyRetriever;
  limits?: BudgetLimits;
}

export interface ToolOutcome<T> {
  result: T | null;
  error: AgentError | null;
  usage: RunUsage;
  spans: Span[];
  ai_mode: "mock" | "live";
}

export interface ToolHarness {
  runId: string;
  llm: LlmClient;
  retriever: PolicyRetriever;
  tracer: Tracer;
  budget: Budget;
  rootSpan: string;
  emit: (event: PipelineEvent) => void;
  ctxFor: (spanId: string) => AgentContext;
  stage: <T>(
    name: Stage,
    input: unknown,
    fn: (ctx: AgentContext) => Promise<T>,
    summary: (r: T) => string,
  ) => Promise<T>;
}

/** Run `body` inside a traced, budgeted harness and turn failures into a typed outcome. */
export async function withToolHarness<T>(
  name: ToolKind,
  opts: ToolRunOptions,
  body: (h: ToolHarness) => Promise<T>,
): Promise<ToolOutcome<T>> {
  const runId = opts.runId ?? newId(name === "audit" ? "aud" : "apl");
  const emit = opts.emit ?? (() => {});
  const llm = opts.llm ?? getLlmClient();
  const retriever = opts.retriever ?? getRetriever();
  const tracer = new Tracer(redactForLog);
  const budget = new Budget(opts.limits ?? DEFAULT_RUN_LIMITS);
  const rootSpan = tracer.start(name, "run", null, undefined, { run_id: runId, mode: llm.mode });
  const ctxFor = (spanId: string): AgentContext => ({ runId, llm, tracer, budget, spanId, emit });

  async function stage<R>(
    stageName: Stage,
    input: unknown,
    fn: (ctx: AgentContext) => Promise<R>,
    summary: (r: R) => string,
  ): Promise<R> {
    emit({ type: "stage_started", stage: stageName });
    try {
      const result = await tracer.span(stageName, "stage", rootSpan, input, (spanId) =>
        fn(ctxFor(spanId)),
      );
      emit({ type: "stage_completed", stage: stageName, summary: summary(result) });
      return result;
    } catch (e) {
      emit({ type: "stage_failed", stage: stageName, error: errorMessage(e) });
      throw e;
    }
  }

  emit({ type: "run_started", run_id: runId, ai_mode: llm.mode });
  const done = (result: T | null, error: AgentError | null): ToolOutcome<T> => ({
    result,
    error,
    usage: budget.snapshot(),
    spans: tracer.spans,
    ai_mode: llm.mode,
  });
  try {
    const result = await body({
      runId,
      llm,
      retriever,
      tracer,
      budget,
      rootSpan,
      emit,
      ctxFor,
      stage,
    });
    tracer.end(rootSpan, { attrs: { status: "completed" } });
    return done(result, null);
  } catch (e) {
    const err = isAgentError(e) ? e : new AgentError("llm_error", errorMessage(e));
    tracer.end(rootSpan, { error: err.message });
    return done(null, err);
  }
}
