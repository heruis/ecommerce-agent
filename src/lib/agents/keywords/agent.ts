import { KeywordSet, type Platform, type ProductFacts } from "@/lib/contracts";
import { structuredCall, type AgentContext } from "@/lib/harness";
import { platformLabel } from "@/lib/rules";
import { renderFacts } from "../shared/seller-input";
import { mockKeywords } from "./mock";
import { KEYWORDS_SYSTEM } from "./prompt";
import {
  fetchAmazonSuggestions,
  fromSearchBox,
  keywordSignals,
  seedsFor,
  type Suggest,
} from "./suggest";

const BANNED = /\b(best|cheap|cheapest|sale|new|#1|amazing|top)\b/i;

export interface KeywordDeps {
  /**
   * Search-box lookup. Default: Amazon US suggestions, only in live AI mode
   * and only when Amazon US is a target channel (never in mock mode or tests).
   * Pass a function to force it (tests), or null to turn it off.
   */
  suggest?: Suggest | null;
}

/**
 * Stage 2 — Keyword agent (fast tier, single structured call).
 * Real Amazon search-box phrases, when available, are given to the model as
 * data; keywords that match them are marked `from_search_box`. Everything
 * else stays labeled AI-suggested: we have no search-volume data.
 */
export async function runKeywords(
  ctx: AgentContext,
  facts: ProductFacts,
  platforms: readonly Platform[],
  deps: KeywordDeps = {},
): Promise<KeywordSet> {
  const suggest =
    deps.suggest !== undefined
      ? deps.suggest
      : ctx.llm.mode === "live" && platforms.includes("amazon_us")
        ? fetchAmazonSuggestions
        : null;

  const suggestions = suggest ? await searchBoxPhrases(ctx, facts, suggest) : [];

  const user = [
    `Target channels: ${platforms.map(platformLabel).join(", ")}`,
    renderFacts(facts),
    suggestions.length
      ? `<shopper_search_suggestions source="Amazon US search box">\n${suggestions.join("\n")}\n</shopper_search_suggestions>`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await structuredCall(ctx, {
    agent: "keywords",
    tier: "fast",
    effort: "low",
    system: KEYWORDS_SYSTEM,
    user,
    schema: KeywordSet,
    mock: () => ({ json: mockKeywords(facts, suggestions) }),
  });
  const clean = cleanKeywords(raw);
  return {
    ...clean,
    from_search_box: fromSearchBox([...clean.primary, ...clean.secondary], suggestions),
  };
}

/** Fetch search-box phrases inside its own trace span; never throws. */
async function searchBoxPhrases(
  ctx: AgentContext,
  facts: ProductFacts,
  suggest: Suggest,
): Promise<string[]> {
  const seeds = seedsFor(facts);
  try {
    const phrases = await ctx.tracer.span(
      "keywords.search_box",
      "tool",
      ctx.spanId,
      { seeds },
      () => keywordSignals(seeds, suggest),
      (r) => ({ phrases: r.length }),
    );
    ctx.emit({
      type: "tool_called",
      stage: "keywords",
      tool: "amazon_search_box",
      summary: phrases.length
        ? `Found ${phrases.length} real Amazon search-box phrases`
        : "No Amazon search-box phrases available; using AI suggestions only",
    });
    return phrases;
  } catch {
    return [];
  }
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
  return { ...k, primary, secondary, hashtags, from_search_box: k.from_search_box ?? [] };
}
