import {
  ListingDraft,
  type KeywordSet,
  type Platform,
  type ProductFacts,
  type ProductInput,
} from "@/lib/contracts";
import { runToolLoop, type AgentContext } from "@/lib/harness";
import { asSellerData } from "@/lib/guardrails/input";
import { platformLabel, validateListing } from "@/lib/rules";
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
      schema: submitGuard(platform, input.brand),
    },
    maxTurns: 6,
    mock: localizationMock(platform, facts, keywords, input),
  });
  return { platform, draft: result.output, turns: result.turns };
}

/** Correction rounds before a rule-breaking submission is accepted anyway. */
export const MAX_SUBMIT_REJECTIONS = 1;

/**
 * The rules engine decides in code, not in the prompt: a submitted listing
 * that still breaks this marketplace's rules goes back to the agent with the
 * errors. After MAX_SUBMIT_REJECTIONS rounds it is accepted, so the run still
 * completes and the output gate shows the remaining problem to the seller.
 * (The refinement only runs on submit; the JSON schema sent to the API is unchanged.)
 */
export function submitGuard(platform: Platform, brand: string) {
  let rejections = 0;
  return ListingDraft.superRefine((draft, ctx) => {
    if (rejections >= MAX_SUBMIT_REJECTIONS) return;
    const errors = validateListing(draft, platform, { brand }).violations.filter(
      (v) => v.severity === "error",
    );
    if (errors.length === 0) return;
    rejections++;
    for (const e of errors) {
      ctx.addIssue({
        code: "custom",
        path: e.index === undefined || e.index === null ? [e.field] : [e.field, e.index],
        message: `${e.message} Fix it, run check_listing, then submit again.`,
      });
    }
  });
}
