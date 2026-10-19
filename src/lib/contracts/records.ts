/**
 * CONTRACTS — persisted records, traces and streaming events.
 */
import { z } from "zod";
import { ListingDraft, Platform, PipelineResult, ProductInput, Stage } from "./schemas";

// ---------------------------------------------------------------------------
// Observability: one run = a tree of spans (stage -> llm call / tool call)
// ---------------------------------------------------------------------------

export const SpanKind = z.enum(["run", "stage", "llm", "tool", "guardrail"]);
export type SpanKind = z.infer<typeof SpanKind>;

export const Span = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  name: z.string(),
  kind: SpanKind,
  started_at: z.string(),
  ended_at: z.string().nullable(),
  duration_ms: z.number().nullable(),
  status: z.enum(["running", "ok", "error"]),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});
export type Span = z.infer<typeof Span>;

export const RunUsage = z.object({
  llm_calls: z.number(),
  tool_calls: z.number(),
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_read_tokens: z.number(),
  cost_usd: z.number(),
});
export type RunUsage = z.infer<typeof RunUsage>;

export const RunStatus = z.enum(["running", "completed", "failed"]);
export type RunStatus = z.infer<typeof RunStatus>;

export const RunRecord = z.object({
  id: z.string(),
  listing_id: z.string(),
  status: RunStatus,
  started_at: z.string(),
  finished_at: z.string().nullable(),
  ai_mode: z.enum(["mock", "live"]),
  usage: RunUsage,
  spans: z.array(Span),
  error: z.string().nullable(),
});
export type RunRecord = z.infer<typeof RunRecord>;

// ---------------------------------------------------------------------------
// Users, plans, listings
// ---------------------------------------------------------------------------

export const Plan = z.enum(["free", "pro"]);
export type Plan = z.infer<typeof Plan>;

export const Profile = z.object({
  id: z.string(),
  email: z.string(),
  plan: Plan,
  credits_remaining: z.number().int(),
  stripe_customer_id: z.string().nullable(),
  stripe_subscription_id: z.string().nullable(),
  current_period_end: z.string().nullable(),
  created_at: z.string(),
});
export type Profile = z.infer<typeof Profile>;

export const ListingStatus = z.enum(["draft", "running", "completed", "failed"]);
export type ListingStatus = z.infer<typeof ListingStatus>;

export const Listing = z.object({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  status: ListingStatus,
  input: ProductInput,
  result: PipelineResult.nullable(),
  /** The seller's edited versions, keyed by platform; null until they edit. */
  edited: z.record(z.string(), ListingDraft).nullable(),
  last_run_id: z.string().nullable(),
});
export type Listing = z.infer<typeof Listing>;

export type ListingSummary = Pick<Listing, "id" | "status" | "created_at" | "updated_at"> & {
  title: string;
  platforms: Platform[];
  /** Average quality score across channels. */
  score: number | null;
};

// ---------------------------------------------------------------------------
// Server-sent events streamed to the browser while a run executes
// ---------------------------------------------------------------------------

export type PipelineEvent =
  | { type: "run_started"; run_id: string; ai_mode: "mock" | "live" }
  | { type: "stage_started"; stage: Stage }
  | { type: "stage_completed"; stage: Stage; summary: string }
  | { type: "stage_failed"; stage: Stage; error: string }
  | { type: "tool_called"; stage: Stage; tool: string; summary: string; platform?: Platform }
  | {
      type: "run_completed";
      run_id: string;
      result: z.infer<typeof PipelineResult>;
      usage: RunUsage;
    }
  | { type: "run_failed"; run_id: string; error: string; code: string };
