import { transformJSONSchema } from "@anthropic-ai/sdk/lib/transform-json-schema";
import { z } from "zod";

/**
 * Turn a zod contract into the strict JSON schema Claude accepts for
 * `strict: true` tools and `output_config.format`. Constraints the API does not
 * support (string lengths, numeric ranges) are moved into descriptions by the
 * SDK helper; we still enforce them client-side by parsing with zod afterwards.
 */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: "output", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  return transformJSONSchema(json);
}

/** Compact, model-readable list of zod issues for repair prompts and tool errors. */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 12)
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}
