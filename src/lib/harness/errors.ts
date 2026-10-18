/**
 * Typed failures the harness can raise. The orchestrator maps each code to a
 * user-facing message and decides whether the user's credit is refunded.
 */
export type AgentErrorCode =
  | "guardrail_blocked" // input rejected by a guardrail (user error, no refund)
  | "budget_exceeded" // run hit its token / call / time budget
  | "schema_invalid" // model output failed the contract after repair attempts
  | "refusal" // model declined (stop_reason = refusal)
  | "max_iterations" // tool loop ran out of turns without a final answer
  | "llm_error" // API error after SDK retries
  | "config_error"; // missing key / model id

export class AgentError extends Error {
  constructor(
    public readonly code: AgentErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AgentError";
  }

  /** Whether the failure was ours (refund the credit) or the user's input. */
  get refundable(): boolean {
    return this.code !== "guardrail_blocked";
  }
}

export function isAgentError(e: unknown): e is AgentError {
  return e instanceof AgentError;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
