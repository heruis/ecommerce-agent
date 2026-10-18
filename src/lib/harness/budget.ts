import { AgentError } from "./errors";

export interface BudgetLimits {
  maxLlmCalls: number;
  maxTotalTokens: number;
  maxCostUsd: number;
  /** Wall-clock deadline for the whole run, in ms from creation. */
  deadlineMs: number;
}

export const DEFAULT_RUN_LIMITS: BudgetLimits = {
  maxLlmCalls: 24,
  maxTotalTokens: 250_000,
  maxCostUsd: 0.75,
  deadlineMs: 240_000,
};

/**
 * Per-run operating budget. Every LLM call is checked before it is sent and
 * charged after it returns. Hitting a cap stops the run with a clear error
 * instead of letting a loop spin (course Module 3: stopping conditions).
 */
export class Budget {
  private readonly startedAt = Date.now();
  llmCalls = 0;
  toolCalls = 0;
  inputTokens = 0;
  outputTokens = 0;
  cacheReadTokens = 0;
  costUsd = 0;

  constructor(public readonly limits: BudgetLimits = DEFAULT_RUN_LIMITS) {}

  assertCanCallLlm(): void {
    const reasons: string[] = [];
    if (this.llmCalls >= this.limits.maxLlmCalls) reasons.push(`${this.llmCalls} LLM calls`);
    if (this.inputTokens + this.outputTokens >= this.limits.maxTotalTokens)
      reasons.push(`${this.inputTokens + this.outputTokens} tokens`);
    if (this.costUsd >= this.limits.maxCostUsd) reasons.push(`$${this.costUsd.toFixed(4)}`);
    if (this.elapsedMs() >= this.limits.deadlineMs) reasons.push(`${this.elapsedMs()} ms`);
    if (reasons.length > 0) {
      throw new AgentError("budget_exceeded", `Run budget reached (${reasons.join(", ")})`, {
        limits: this.limits,
      });
    }
  }

  chargeLlm(usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_tokens: number;
    cost_usd: number;
  }) {
    this.llmCalls += 1;
    this.inputTokens += usage.input_tokens;
    this.outputTokens += usage.output_tokens;
    this.cacheReadTokens += usage.cache_read_tokens;
    this.costUsd += usage.cost_usd;
  }

  chargeTool() {
    this.toolCalls += 1;
  }

  elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  snapshot() {
    return {
      llm_calls: this.llmCalls,
      tool_calls: this.toolCalls,
      input_tokens: this.inputTokens,
      output_tokens: this.outputTokens,
      cache_read_tokens: this.cacheReadTokens,
      cost_usd: Math.round(this.costUsd * 1_000_000) / 1_000_000,
    };
  }
}
