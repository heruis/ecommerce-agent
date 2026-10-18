import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import type { Stage } from "@/lib/contracts";
import { callModel } from "./call";
import { AgentError, errorMessage } from "./errors";
import type { MockResponder } from "./llm";
import { formatIssues, toStrictJsonSchema } from "./schema";
import type { AgentContext, Effort, ModelTier } from "./types";

/** A tool the agent may call. Authorization and caps live here, in code. */
export interface HarnessTool<I = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<I>;
  /** Hard cap on calls per run; extra calls get an error result, not execution. */
  maxCalls?: number;
  run: (input: I, ctx: AgentContext) => Promise<unknown>;
  /** One-line progress text shown in the UI while the run streams. */
  summarize?: (input: I) => string;
}

export function defineTool<I>(tool: HarnessTool<I>): HarnessTool<I> {
  return tool;
}

export interface ToolLoopOptions<T> {
  agent: string;
  stage: Stage;
  tier: ModelTier;
  effort?: Effort;
  system: string;
  user: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: HarnessTool<any>[];
  /** The "submit" tool whose validated input is the agent's final answer. */
  final: { name: string; description: string; schema: z.ZodType<T> };
  /** Max model turns, including the final one. */
  maxTurns: number;
  mock: MockResponder;
  maxTokens?: number;
}

export interface ToolLoopResult<T> {
  output: T;
  turns: number;
  toolCalls: { name: string; ok: boolean }[];
}

const FINALIZE_NOTE =
  "Turn budget reached. Call the final tool now with your best answer. " +
  "List anything you could not verify in the uncertainty fields instead of guessing.";

/**
 * ReAct loop: reason -> call a tool -> observe -> repeat, until the agent
 * calls its final tool. `stop_reason` is the only signal we trust: tool_use
 * means execute and continue; anything else without a final call gets one
 * nudge, then fails. Tools only run after their input passes zod validation.
 */
export async function runToolLoop<T>(
  ctx: AgentContext,
  opts: ToolLoopOptions<T>,
): Promise<ToolLoopResult<T>> {
  const byName = new Map(opts.tools.map((t) => [t.name, t]));
  const apiTools: Anthropic.Tool[] = [
    ...opts.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: toStrictJsonSchema(t.schema) as Anthropic.Tool.InputSchema,
      strict: true,
    })),
    {
      name: opts.final.name,
      description: opts.final.description,
      input_schema: toStrictJsonSchema(opts.final.schema) as Anthropic.Tool.InputSchema,
      strict: true,
    },
  ];

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.user }];
  const callCounts = new Map<string, number>();
  const toolCalls: { name: string; ok: boolean }[] = [];
  let nudged = false;

  for (let turn = 0; turn < opts.maxTurns; turn++) {
    const message = await callModel(
      ctx,
      {
        agent: opts.agent,
        tier: opts.tier,
        effort: opts.effort,
        system: opts.system,
        messages,
        tools: apiTools,
        maxTokens: opts.maxTokens,
        mock: opts.mock,
      },
      { iteration: turn },
    );

    if (message.stop_reason === "max_tokens") {
      throw new AgentError("schema_invalid", `${opts.agent}: output was cut off at max_tokens.`);
    }

    const toolUses = message.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    messages.push({ role: "assistant", content: message.content });

    if (toolUses.length === 0) {
      if (nudged) break;
      nudged = true;
      messages.push({ role: "user", content: `Finish by calling the ${opts.final.name} tool.` });
      continue;
    }

    const results: Anthropic.ContentBlockParam[] = [];
    for (const use of toolUses) {
      // Final answer
      if (use.name === opts.final.name) {
        const parsed = opts.final.schema.safeParse(use.input);
        if (parsed.success) {
          return { output: parsed.data, turns: turn + 1, toolCalls };
        }
        results.push(
          errorResult(use.id, `Your answer broke the contract:\n${formatIssues(parsed.error)}`),
        );
        continue;
      }

      const tool = byName.get(use.name);
      if (!tool) {
        results.push(errorResult(use.id, `Unknown tool "${use.name}".`));
        continue;
      }

      const count = (callCounts.get(use.name) ?? 0) + 1;
      callCounts.set(use.name, count);
      if (tool.maxCalls !== undefined && count > tool.maxCalls) {
        results.push(
          errorResult(
            use.id,
            `Call budget for ${use.name} is used up (${tool.maxCalls}). Work with the evidence you have.`,
          ),
        );
        toolCalls.push({ name: use.name, ok: false });
        continue;
      }

      const input = tool.schema.safeParse(use.input);
      if (!input.success) {
        results.push(errorResult(use.id, `Invalid input:\n${formatIssues(input.error)}`));
        toolCalls.push({ name: use.name, ok: false });
        continue;
      }

      ctx.budget.chargeTool();
      const spanId = ctx.tracer.start(
        `${opts.agent}.tool.${use.name}`,
        "tool",
        ctx.spanId,
        input.data,
        {
          tool: use.name,
          call: count,
        },
      );
      try {
        const output = await tool.run(input.data, ctx);
        ctx.tracer.end(spanId, { output });
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(output) });
        toolCalls.push({ name: use.name, ok: true });
        ctx.emit({
          type: "tool_called",
          stage: opts.stage,
          tool: use.name,
          summary: tool.summarize ? tool.summarize(input.data) : use.name,
        });
      } catch (e) {
        ctx.tracer.end(spanId, { error: errorMessage(e) });
        results.push(errorResult(use.id, `Tool failed: ${errorMessage(e)}`));
        toolCalls.push({ name: use.name, ok: false });
      }
    }

    if (turn + 1 === opts.maxTurns - 1) {
      results.push({ type: "text", text: FINALIZE_NOTE });
    }
    messages.push({ role: "user", content: results });
  }

  throw new AgentError(
    "max_iterations",
    `${opts.agent} did not call ${opts.final.name} within ${opts.maxTurns} turns.`,
  );
}

function errorResult(toolUseId: string, text: string): Anthropic.ToolResultBlockParam {
  return { type: "tool_result", tool_use_id: toolUseId, content: text, is_error: true };
}
