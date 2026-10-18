import type { KeywordSet, ProductFacts } from "@/lib/contracts";

/** Deterministic stand-in for the keyword agent (AI_MODE=mock). */
export function mockKeywords(facts: ProductFacts): KeywordSet {
  const type = facts.product_type.toLowerCase();
  const words = type.split(" ");
  const noun = words.slice(-1)[0] ?? "product";
  const material = facts.facts.find((f) => f.attribute === "material")?.value.toLowerCase();
  const features = facts.facts
    .filter((f) => f.attribute === "feature")
    .map((f) => f.value.toLowerCase());

  const primary = unique([
    type,
    material ? `${material.replace("food-grade ", "")} ${noun}` : `${noun}`,
    words.includes("collapsible") ? `foldable ${noun}` : `reusable ${noun}`,
    `travel ${noun}`,
  ]).slice(0, 5);

  const secondary = unique([
    `portable ${noun}`,
    `${noun} for camping`,
    `${noun} for hiking`,
    `reusable ${noun}`,
    ...features.map((f) => `${f} ${noun}`),
    `${noun} with lid`,
    `outdoor ${noun}`,
    `backpacking ${noun}`,
  ])
    .filter((k) => !primary.includes(k))
    .slice(0, 12);

  return {
    primary,
    secondary,
    rationale: `Lead with the product type "${type}" and its material, then cover use cases (travel, camping, hiking) and feature variations shoppers type. AI-suggested; no search-volume data.`,
  };
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim().toLowerCase()).filter(Boolean))];
}
