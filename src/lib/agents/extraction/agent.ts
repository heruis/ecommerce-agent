import { ProductFacts, type ProductInput } from "@/lib/contracts";
import { structuredCall, type AgentContext } from "@/lib/harness";
import { renderSellerInput } from "../shared/seller-input";
import { mockExtraction } from "./mock";
import { EXTRACTION_SYSTEM } from "./prompt";

export interface ExtractionOutput {
  facts: ProductFacts;
  warnings: string[];
}

/**
 * Stage 1 — Extraction agent (fast tier, single structured call).
 * Chinese seller text -> typed facts + marketing claims, each grounded in a quote.
 */
export async function runExtraction(
  ctx: AgentContext,
  input: ProductInput,
): Promise<ExtractionOutput> {
  const facts = await structuredCall(ctx, {
    agent: "extraction",
    tier: "fast",
    effort: "low",
    system: EXTRACTION_SYSTEM,
    user: `Extract the product record from this seller input.\n\n${renderSellerInput(input)}`,
    schema: ProductFacts,
    mock: () => ({ json: mockExtraction(input) }),
  });
  return groundingCheck(facts, input);
}

/**
 * Hallucination guard in code: a fact whose quote is not in the seller's text
 * was invented, so it is downgraded and reported instead of trusted.
 */
export function groundingCheck(facts: ProductFacts, input: ProductInput): ExtractionOutput {
  const source = normalize(
    [input.title_zh, input.description_zh, input.specs_zh, input.evidence].join("\n"),
  );
  const warnings: string[] = [];
  const checked = facts.facts.map((f) => {
    if (source.includes(normalize(f.source_quote))) return f;
    warnings.push(
      `Fact "${f.attribute}: ${f.value}" could not be traced to your input and was marked low confidence.`,
    );
    return { ...f, confidence: "low" as const };
  });
  return { facts: { ...facts, facts: checked }, warnings };
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}
