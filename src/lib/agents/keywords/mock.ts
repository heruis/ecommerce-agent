import type { KeywordSet, ProductFacts } from "@/lib/contracts";
import { usageProfile } from "../shared/use-cases";

/**
 * Deterministic stand-in for the keyword agent (AI_MODE=mock). When real
 * search-box phrases are supplied (tests inject them), it prefers the ones
 * that name the product, like the live prompt asks the model to.
 */
export function mockKeywords(facts: ProductFacts, suggestions: string[] = []): KeywordSet {
  const type = facts.product_type.toLowerCase();
  const words = type.split(" ");
  const noun = words.slice(-1)[0] ?? "product";
  const material = facts.facts.find((f) => f.attribute === "material")?.value.toLowerCase();
  const use = usageProfile(facts.category);
  const [m1, m2, m3] = use.modifiers;
  const features = facts.facts
    .filter((f) => f.attribute === "feature")
    .map((f) => f.value.toLowerCase());
  const realPhrases = suggestions
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes(noun))
    .slice(0, 3);

  const primary = unique([
    type,
    material ? `${material.replace("food-grade ", "")} ${noun}` : `${noun}`,
    words.includes("collapsible") ? `foldable ${noun}` : `reusable ${noun}`,
    `${m1} ${noun}`,
  ]).slice(0, 5);

  const secondary = unique([
    ...realPhrases,
    `portable ${noun}`,
    `${noun} for ${m2}`,
    `${noun} for ${m3}`,
    `reusable ${noun}`,
    ...features.map((f) => `${f} ${noun}`),
    ...(use.modifiers[0] === "travel"
      ? [`${noun} with lid`, `outdoor ${noun}`, `backpacking ${noun}`]
      : [`${m2} ${noun}`, `${noun} gift`]),
  ])
    .filter((k) => !primary.includes(k))
    .slice(0, 12);

  const hashtags = unique([
    noun.replace(/\s+/g, ""),
    type.replace(/\s+/g, ""),
    ...(words.includes("collapsible") ? ["collapsible"] : []),
    ...use.hashtags,
    "tiktokshopfinds",
  ]).slice(0, 6);

  return {
    primary,
    secondary,
    hashtags,
    rationale: `Lead with the product type "${type}" and its material, then cover use cases (${use.modifiers.join(", ")}) and feature variations shoppers type. AI-suggested; no search-volume data.`,
    from_search_box: [],
  };
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim().toLowerCase()).filter(Boolean))];
}
