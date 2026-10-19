import {
  ListingDraft,
  type KeywordSet,
  type Platform,
  type ProductFacts,
  type ProductInput,
} from "@/lib/contracts";
import { runToolLoop, type AgentContext } from "@/lib/harness";
import { asSellerData } from "@/lib/guardrails/input";
import { platformLabel } from "@/lib/rules";
import { renderFacts } from "../shared/seller-input";
import { localizationMock } from "./mock";
import { localizationSystem } from "./prompt";
import { checkListingTool } from "./tools";

/**
 * Stage 3 — Localization agent (smart tier, ReAct tool loop), one run per
 * marketplace. Draft -> check_listing (rules engine) -> rewrite -> submit_listing.
 */
export async function runLocalization(
  ctx: AgentContext,
  platform: Platform,
  input: ProductInput,
  facts: ProductFacts,
  keywords: KeywordSet,
): Promise<{ platform: Platform; draft: ListingDraft; turns: number }> {
  const user = [
    `Write the ${platformLabel(platform)} listing for this product.`,
    renderFacts(facts),
    `AI-suggested keywords (no search-volume data):\nprimary: ${keywords.primary.join(", ")}\nsecondary: ${keywords.secondary.join(", ")}` +
      (platform === "tiktok_us" ? `\nhashtags: ${keywords.hashtags.join(", ")}` : ""),
    `Brand: ${input.brand || "(none - do not invent one)"}`,
    asSellerData("evidence", input.evidence || "(none provided)"),
  ].join("\n\n");

  const result = await runToolLoop(ctx, {
    agent: `localization.${platform}`,
    stage: "localization",
    platform,
    tier: "smart",
    effort: "medium",
    system: localizationSystem(platform),
    user,
    tools: [checkListingTool(platform, { brand: input.brand, evidence: input.evidence })],
    final: {
      name: "submit_listing",
      description: "Submit the final listing after check_listing reports no errors.",
      schema: ListingDraft,
    },
    maxTurns: 6,
    mock: localizationMock(platform, facts, keywords, input),
  });
  return { platform, draft: result.output, turns: result.turns };
}
