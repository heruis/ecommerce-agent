import type { KeywordSet, ListingDraft, ProductFacts, ProductInput } from "@/lib/contracts";
import { toolResultsSoFar, type MockResponder } from "@/lib/harness";

/**
 * Scripted stand-in for the localization agent (AI_MODE=mock). It plays out a
 * real ReAct loop so the harness, trace and UI behave like live mode:
 *   turn 1 -> check_listing(draft with a repeated word)  -> violations
 *   turn 2 -> submit_listing(fixed draft)
 */
export function localizationMock(
  facts: ProductFacts,
  keywords: KeywordSet,
  input: ProductInput,
): MockResponder {
  return (req) => {
    const results = toolResultsSoFar(req);
    if (results.length === 0) {
      return {
        text: "Drafting the listing, then checking it against the marketplace rules.",
        toolCalls: [
          { name: "check_listing", input: buildMockDraft(facts, keywords, input, "first") },
        ],
      };
    }
    return {
      text: "Fixed the repeated word in the title. Submitting.",
      toolCalls: [
        { name: "submit_listing", input: buildMockDraft(facts, keywords, input, "final") },
      ],
    };
  };
}

export function buildMockDraft(
  facts: ProductFacts,
  keywords: KeywordSet,
  input: ProductInput,
  variant: "first" | "final",
): ListingDraft {
  const get = (a: string) => facts.facts.find((f) => f.attribute === a);
  const material = get("material")?.value;
  const capacity = get("capacity");
  const folded = get("folded_height");
  const temp = get("temperature_range");
  const dims = get("dimensions");
  const weight = get("weight");
  const noun = facts.product_type.split(" ").slice(-1)[0] ?? "product";
  const hasEco = facts.marketing_claims.some((c) => c.claim_type === "environmental");

  const type = titleCase(facts.product_type);
  const cap = capacity ? `${capacity.value} ${capacity.unit}` : "";
  const brand = input.brand ? `${input.brand} ` : "";
  const mat = material ? titleCase(material) : "";
  const title =
    variant === "first"
      ? `${brand}${type}, ${cap} ${mat} ${titleCase(noun)}, Portable ${titleCase(noun)} for Travel, ${titleCase(noun)} for Camping and Hiking`
      : `${brand}${type}, ${cap} ${mat} Portable Design for Travel, Camping and Hiking`;

  const bullets = [
    material
      ? `Quality Material: Made with ${material}, a sturdy and flexible material for daily use.`
      : `Practical Design: A simple ${facts.product_type} built for everyday use.`,
    folded
      ? `Folds Flat: Collapses to about ${folded.value} ${folded.unit} high, so it fits in a pocket, purse or backpack.`
      : `Easy to Carry: Lightweight and compact for bags and backpacks.`,
    cap
      ? `Right-Sized Capacity: Holds ${cap} for water, coffee or tea on the go.`
      : `Everyday Size: Sized for daily use at home or on the go.`,
    hasEco
      ? `Eco-Friendly Choice: A reusable alternative to disposable cups on trips and outings.`
      : temp
        ? `Temperature Range: Suitable for drinks from ${temp.value} ${temp.unit}.`
        : `Versatile Use: Suitable for travel, camping, hiking, the gym and the office.`,
    dims || weight
      ? `Specifications: ${[dims ? `${dims.value} ${dims.unit}` : "", weight ? `${weight.value} ${weight.unit}` : ""].filter(Boolean).join(", ")}.`
      : `Versatile Use: Suitable for travel, camping, hiking, the gym and the office.`,
  ];

  const factSentences = facts.facts
    .filter((f) => f.attribute !== "feature")
    .map((f) => `${f.attribute.replace(/_/g, " ")}: ${f.value}${f.unit ? ` ${f.unit}` : ""}`);
  const description =
    `This ${facts.product_type} is designed for people who want a practical option at home and on the go. ` +
    `It packs easily into a bag for travel, camping and hiking, and works just as well for everyday use. ` +
    (factSentences.length ? `Key details - ${factSentences.join("; ")}. ` : "") +
    `Check the specifications above to make sure it fits your needs.`;

  const titleLower = title.toLowerCase();
  const terms: string[] = [];
  let bytes = 0;
  for (const phrase of [...keywords.secondary, ...keywords.primary]) {
    for (const w of phrase.split(" ")) {
      if (titleLower.includes(w) || terms.includes(w)) continue;
      if (bytes + w.length + 1 > 240) break;
      terms.push(w);
      bytes += w.length + 1;
    }
  }

  return {
    title: title
      .replace(/\s{2,}/g, " ")
      .replace(/ ,/g, ",")
      .trim(),
    bullets,
    description,
    search_terms: terms.join(" "),
  };
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}
