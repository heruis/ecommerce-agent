import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { callModel, textOf } from "./call";
import { AgentError } from "./errors";
import type { MockResponder } from "./llm";
import { formatIssues, toStrictJsonSchema } from "./schema";
import type { AgentContext, Effort, ModelTier } from "./types";

export interface StructuredCallOptions<T> {
  agent: string;
  tier: ModelTier;
  effort?: Effort;
  system: string;
  /** Text, or content blocks (e.g. images + text) for multimodal agents. */
  user: string | Anthropic.ContentBlockParam[];
  schema: z.ZodType<T>;
  mock: MockResponder;
  /** Extra attempts when the output parses but breaks the zod contract. */
  repairAttempts?: number;
  maxTokens?: number;
}

/**
 * Single-shot agent with a locked output contract. The schema is enforced by
 * the API (structured outputs) and again by zod, so "please return JSON" is
 * never the only thing standing between the model and the database.
 */
export async function structuredCall<T>(
  ctx: AgentContext,
  opts: StructuredCallOptions<T>,
): Promise<T> {
  const outputSchema = toStrictJsonSchema(opts.schema);
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: opts.user }];
  const attempts = 1 + (opts.repairAttempts ?? 1);

  let lastProblem = "";
  for (let attempt = 0; attempt < attempts; attempt++) {
    const message = await callModel(
      ctx,
      {
        agent: opts.agent,
        tier: opts.tier,
        effort: opts.effort,
        system: opts.system,
        messages,
        outputSchema,
        maxTokens: opts.maxTokens,
        mock: opts.mock,
      },
      { iteration: attempt },
    );

    if (message.stop_reason === "max_tokens") {
      lastProblem = "Output was cut off at max_tokens.";
      break;
    }

    const raw = textOf(message);
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      lastProblem = "Output was not valid JSON.";
      messages.push({ role: "assistant", content: message.content });
      messages.push({ role: "user", content: `${lastProblem} Return only the JSON object.` });
      continue;
    }

    const parsed = opts.schema.safeParse(json);
    if (parsed.success) return parsed.data;

    lastProblem = formatIssues(parsed.error);
    messages.push({ role: "assistant", content: message.content });
    messages.push({
      role: "user",
      content: `Your output broke these rules:\n${lastProblem}\nReturn the corrected JSON object only.`,
    });
  }

  throw new AgentError(
    "schema_invalid",
    `${opts.agent} returned output that failed its contract.`,
    lastProblem,
  );
}
