import type Anthropic from "@anthropic-ai/sdk";
import { AgentError } from "./errors";
import type { LlmRequest } from "./llm";
import { estimateCostUsd } from "./pricing";
import type { AgentContext } from "./types";

/**
 * The single choke point for model calls: budget check -> call -> charge ->
 * trace. Structured calls and tool loops are both built on this.
 */
export async function callModel(
  ctx: AgentContext,
  req: LlmRequest,
  meta: { iteration?: number } = {},
): Promise<Anthropic.Message> {
  ctx.budget.assertCanCallLlm();

  const spanId = ctx.tracer.start(
    `${req.agent}.llm`,
    "llm",
    ctx.spanId,
    { messages: req.messages.length, last: req.messages.at(-1) },
    {
      agent: req.agent,
      tier: req.tier,
      effort: req.effort ?? null,
      mode: ctx.llm.mode,
      iteration: meta.iteration ?? null,
      tools: req.tools?.map((t) => t.name).join(",") ?? null,
    },
  );

  let message: Anthropic.Message;
  try {
    message = await ctx.llm.create(req);
  } catch (e) {
    ctx.tracer.end(spanId, { error: e instanceof Error ? e.message : String(e) });
    throw e;
  }

  const usage = {
    input_tokens: message.usage.input_tokens,
    output_tokens: message.usage.output_tokens,
    cache_read_tokens: message.usage.cache_read_input_tokens ?? 0,
  };
  const cost = estimateCostUsd(req.tier, usage);
  ctx.budget.chargeLlm({ ...usage, cost_usd: cost });

  ctx.tracer.end(spanId, {
    output: message.content.filter((b) => b.type === "text" || b.type === "tool_use"),
    attrs: {
      stop_reason: message.stop_reason ?? null,
      model: message.model,
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_read_tokens: usage.cache_read_tokens,
      cost_usd: cost,
    },
  });

  if (message.stop_reason === "refusal") {
    throw new AgentError(
      "refusal",
      `${req.agent}: the model declined this request.`,
      message.stop_details,
    );
  }
  return message;
}

export function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
