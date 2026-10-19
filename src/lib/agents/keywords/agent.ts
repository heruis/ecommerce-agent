import { KeywordSet, type Platform, type ProductFacts } from "@/lib/contracts";
import { structuredCall, type AgentContext } from "@/lib/harness";
import { platformLabel } from "@/lib/rules";
import { renderFacts } from "../shared/seller-input";
import { mockKeywords } from "./mock";
import { KEYWORDS_SYSTEM } from "./prompt";

const BANNED = /\b(best|cheap|cheapest|sale|new|#1|amazing|top)\b/i;

/**
 * Stage 2 — Keyword agent (fast tier, single structured call).
 * Output is labeled AI-suggested: we have no real search-volume data.
 */
export async function runKeywords(
  ctx: AgentContext,
  facts: ProductFacts,
  platforms: readonly Platform[],
): Promise<KeywordSet> {
  const raw = await structuredCall(ctx, {
    agent: "keywords",
    tier: "fast",
    effort: "low",
    system: KEYWORDS_SYSTEM,
    user: `Target channels: ${platforms.map(platformLabel).join(", ")}\n\n${renderFacts(facts)}`,
    schema: KeywordSet,
    mock: () => ({ json: mockKeywords(facts) }),
  });
  return cleanKeywords(raw);
}

/** Output guardrail in code: lowercase, dedupe, drop promotional words. */
export function cleanKeywords(k: KeywordSet): KeywordSet {
  const seen = new Set<string>();
  const clean = (list: string[]) =>
    list
      .map((s) => s.trim().toLowerCase().replace(/\s+/g, " "))
      .filter((s) => s && !BANNED.test(s) && !seen.has(s) && seen.add(s));
  const primary = clean(k.primary).slice(0, 5);
  const secondary = clean(k.secondary).slice(0, 15);
  const hashtags = [
    ...new Set(
      (k.hashtags ?? [])
        .map((h) =>
          h
            .toLowerCase()
            .replace(/^#/, "")
            .replace(/[^a-z0-9]/g, ""),
        )
        .filter((h) => h.length > 1 && !BANNED.test(h)),
    ),
  ].slice(0, 8);
  return { ...k, primary, secondary, hashtags };
}
