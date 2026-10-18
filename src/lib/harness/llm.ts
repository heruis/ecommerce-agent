import Anthropic from "@anthropic-ai/sdk";
import { env, requireEnv } from "@/lib/env";
import { AgentError } from "./errors";
import type { Effort, ModelTier } from "./types";

/**
 * One request to the model. Agents never call the SDK directly: they go
 * through an LlmClient so the same code path runs live (Claude API) or mocked
 * (deterministic, offline) and every call is budgeted and traced.
 */
export interface LlmRequest {
  /** Agent name, used for tracing and to route mock replies. */
  agent: string;
  tier: ModelTier;
  effort?: Effort;
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  /** Strict JSON schema for structured output (output_config.format). */
  outputSchema?: Record<string, unknown>;
  maxTokens?: number;
  /** Deterministic stand-in used when AI_MODE=mock. Required so every agent stays testable offline. */
  mock: MockResponder;
}

export interface LlmClient {
  readonly mode: "live" | "mock";
  create(req: LlmRequest): Promise<Anthropic.Message>;
}

// ---------------------------------------------------------------------------
// Live client (Claude API)
// ---------------------------------------------------------------------------

export class LiveLlmClient implements LlmClient {
  readonly mode = "live" as const;
  private readonly client: Anthropic;

  constructor(
    private readonly models: Record<ModelTier, string>,
    apiKey: string,
  ) {
    // The SDK already retries 408/409/429/5xx with backoff.
    this.client = new Anthropic({ apiKey, maxRetries: 3, timeout: 90_000 });
  }

  async create(req: LlmRequest): Promise<Anthropic.Message> {
    const outputConfig: Anthropic.OutputConfig = {};
    if (req.effort) outputConfig.effort = req.effort;
    if (req.outputSchema) outputConfig.format = { type: "json_schema", schema: req.outputSchema };

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: this.models[req.tier],
      max_tokens: req.maxTokens ?? 16_000,
      // Stable system prompt first so it can be served from the prompt cache.
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      messages: req.messages,
      ...(req.tools && req.tools.length > 0
        ? { tools: req.tools, tool_choice: { type: "auto" } }
        : {}),
      ...(Object.keys(outputConfig).length > 0 ? { output_config: outputConfig } : {}),
    };

    try {
      return await this.client.messages.create(params);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        throw new AgentError(
          "config_error",
          "Claude API key was rejected. Check ANTHROPIC_API_KEY.",
        );
      }
      if (e instanceof Anthropic.NotFoundError) {
        throw new AgentError(
          "config_error",
          `Model not found. Check ANTHROPIC_MODEL_${req.tier.toUpperCase()}.`,
        );
      }
      if (e instanceof Anthropic.APIError) {
        throw new AgentError("llm_error", `Claude API error ${e.status ?? ""}: ${e.message}`);
      }
      throw e;
    }
  }
}

// ---------------------------------------------------------------------------
// Mock client (offline, deterministic)
// ---------------------------------------------------------------------------

export interface MockReply {
  /** Plain text answer. */
  text?: string;
  /** Structured answer; serialized as the text block. */
  json?: unknown;
  /** Tool calls to emit (stop_reason becomes tool_use). */
  toolCalls?: { name: string; input: unknown }[];
  stopReason?: "end_turn" | "tool_use" | "refusal" | "max_tokens";
}

export type MockResponder = (req: LlmRequest) => MockReply;

let mockSeq = 0;

export class MockLlmClient implements LlmClient {
  readonly mode = "mock" as const;

  async create(req: LlmRequest): Promise<Anthropic.Message> {
    const reply = req.mock(req);
    const content: Anthropic.ContentBlock[] = [];
    const text = reply.json !== undefined ? JSON.stringify(reply.json) : reply.text;
    if (text) content.push({ type: "text", text, citations: null } as Anthropic.TextBlock);
    for (const call of reply.toolCalls ?? []) {
      content.push({
        type: "tool_use",
        id: `toolu_mock_${++mockSeq}`,
        name: call.name,
        input: call.input,
      } as Anthropic.ToolUseBlock);
    }
    const stop = reply.stopReason ?? (reply.toolCalls?.length ? "tool_use" : "end_turn");
    const promptChars = req.system.length + JSON.stringify(req.messages).length;
    const message = {
      id: `msg_mock_${++mockSeq}`,
      type: "message",
      role: "assistant",
      model: `mock-${req.tier}`,
      content,
      stop_reason: stop,
      stop_sequence: null,
      stop_details: null,
      container: null,
      usage: {
        input_tokens: Math.ceil(promptChars / 4),
        output_tokens: Math.ceil((text?.length ?? 0) / 4) + 20 * (reply.toolCalls?.length ?? 0),
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation: null,
        inference_geo: null,
        output_tokens_details: null,
        server_tool_use: null,
        service_tier: null,
      },
    };
    return message as unknown as Anthropic.Message;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function getLlmClient(): LlmClient {
  if (env().AI_MODE === "mock") return new MockLlmClient();
  const apiKey = requireEnv("ANTHROPIC_API_KEY", "AI_MODE=live");
  return new LiveLlmClient(
    {
      smart: requireEnv("ANTHROPIC_MODEL_SMART", "AI_MODE=live"),
      fast: requireEnv("ANTHROPIC_MODEL_FAST", "AI_MODE=live"),
    },
    apiKey,
  );
}

/** Count of prior tool results in the conversation; mocks use it to script multi-turn loops. */
export function toolResultsSoFar(req: LlmRequest): Anthropic.ToolResultBlockParam[] {
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const m of req.messages) {
    if (m.role !== "user" || typeof m.content === "string") continue;
    for (const block of m.content) if (block.type === "tool_result") results.push(block);
  }
  return results;
}

/** First user message text: the task the agent was handed. */
export function firstUserText(req: LlmRequest): string {
  const first = req.messages[0];
  if (!first) return "";
  if (typeof first.content === "string") return first.content;
  return first.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
}
