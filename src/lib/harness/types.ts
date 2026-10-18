import type { PipelineEvent } from "@/lib/contracts";
import type { Budget } from "./budget";
import type { LlmClient } from "./llm";
import type { Tracer } from "./tracer";

/** fast = cheap, high-volume steps; smart = generation and judgment steps. */
export type ModelTier = "fast" | "smart";
export type Effort = "low" | "medium" | "high";

/** Everything an agent needs, passed explicitly: agents "wake up empty". */
export interface AgentContext {
  runId: string;
  llm: LlmClient;
  tracer: Tracer;
  budget: Budget;
  /** Parent span for anything this agent records. */
  spanId: string | null;
  emit: (event: PipelineEvent) => void;
}
