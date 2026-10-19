import type {
  KeywordSet,
  ListingDraft,
  Platform,
  ProductFacts,
  ProductInput,
} from "@/lib/contracts";
import { toolResultsSoFar, type MockResponder } from "@/lib/harness";
import { usageProfile } from "../shared/use-cases";

/**
 * Scripted stand-in for the localization agent (AI_MODE=mock). It plays out a
 * real ReAct loop so the harness, trace and UI behave like live mode:
 *   turn 1 -> check_listing(draft with one rule problem) -> violations
 *   turn 2 -> submit_listing(fixed draft)
 */
export function localizationMock(
  platform: Platform,
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
          {
            name: "check_listing",
            input: buildMockDraft(platform, facts, keywords, input, "first"),
          },
        ],
      };
    }
    return {
      text: "Fixed the reported problem. Submitting.",
      toolCalls: [
        {
          name: "submit_listing",
          input: buildMockDraft(platform, facts, keywords, input, "final"),
        },
      ],
    };
  };
}

export function buildMockDraft(
  platform: Platform,
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
  const use = usageProfile(facts.category);
  const length = get("length");
  const hasEco = facts.marketing_claims.some((c) => c.claim_type === "environmental");
  const type = titleCase(facts.product_type);
  const cap = capacity ? `${capacity.value} ${capacity.unit}` : "";
  const brand = input.brand ? `${input.brand} ` : "";
  const mat = material ? titleCase(material) : "";

  const specs = [
    dims ? `${dims.value} ${dims.unit}` : "",
    weight ? `${weight.value} ${weight.unit}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const factSentences = facts.facts
    .filter((f) => f.attribute !== "feature")
    .map((f) => `${f.attribute.replace(/_/g, " ")}: ${f.value}${f.unit ? ` ${f.unit}` : ""}`);

  const benefits = [
    material
      ? `Quality Material: Made with ${material}, sturdy and flexible for daily use.`
      : `Practical Design: A simple ${facts.product_type} built for everyday use.`,
    folded
      ? `Folds Flat: Collapses to about ${folded.value} ${folded.unit}, so it fits in a pocket or backpack.`
      : `Easy to Carry: Lightweight and compact for bags and backpacks.`,
    cap
      ? `Right-Sized: Holds ${cap} for water, coffee or tea on the go.`
      : length
        ? `Right Length: ${length.value}${length.unit ? ` ${length.unit}` : ""} long to cover the space you need.`
        : `Everyday Size: Sized for daily use at home or on the go.`,
    hasEco
      ? `Eco-Friendly Choice: A reusable alternative to disposable cups on trips and outings.`
      : temp
        ? `Temperature Range: Suitable for drinks from ${temp.value} ${temp.unit}.`
        : `Versatile Use: Suitable for ${use.list}.`,
    specs ? `Specifications: ${specs}.` : `Versatile Use: Suitable for ${use.list}.`,
  ];

  const empty = { search_terms: "", seo_title: "", seo_description: "", tags: [] as string[] };

  if (platform === "amazon_us") {
    const title =
      variant === "first"
        ? `${brand}${type}, ${cap} ${mat} ${titleCase(noun)}, ${titleCase(noun)} for ${use.title}, ${titleCase(noun)} Gift`
        : `${brand}${type}, ${cap} ${mat} Design for ${use.title}`;
    const description =
      `This ${facts.product_type} is designed for people who want a practical option at home and on the go. ` +
      `It is made for ${use.list}, and works just as well for everyday use. ` +
      (factSentences.length ? `Key details - ${factSentences.join("; ")}. ` : "") +
      `Check the specifications above to make sure it fits your needs.`;
    return {
      ...empty,
      title: tidy(title),
      bullets: benefits,
      description,
      search_terms: backendTerms(title, keywords),
    };
  }

  if (platform === "tiktok_us") {
    const base = `${brand}${type}${cap ? ` ${cap}` : ""}${folded ? `, Folds Flat to ${folded.value} ${folded.unit}` : ""} for ${use.title}`;
    const title = variant === "first" ? `${base} ${titleCase(noun)} ${titleCase(noun)}` : base;
    const points = benefits
      .slice(0, 4)
      .map((b) => b.replace(/, sturdy and flexible for daily use/, ""));
    const description =
      `Meet your new go-to ${facts.product_type}. ${folded ? "It folds flat, so it slips into a pocket or bag. " : ""}` +
      `Made for ${use.list}.\n\n` +
      points.map((p) => `• ${p}`).join("\n") +
      (factSentences.length ? `\n\nDetails: ${factSentences.join("; ")}.` : "");
    return {
      ...empty,
      title: tidy(title),
      bullets: points,
      description,
      tags: keywords.hashtags.slice(0, 6),
    };
  }

  // Shopify
  const title = `${brand}${type}${cap ? ` – ${cap}` : ""}`;
  const seoTitle =
    variant === "first"
      ? `${type} ${cap} ${mat} for ${use.title}, Home, Office and Everyday Use`
      : `${type}${cap ? ` ${cap}` : ""} | ${use.title.replace(" and ", " & ")}`;
  const highlights = benefits.slice(0, 4);
  const description =
    `Meet the ${facts.product_type} made for life on the move. ` +
    (folded
      ? `It folds down to about ${folded.value} ${folded.unit}, so it disappears into a pocket, purse or daypack. `
      : "") +
    (material ? `Made with ${material}, it is easy to rinse and pack again. ` : "") +
    `\n\nMade for ${use.list}. ` +
    (factSentences.length ? `\n\nDetails: ${factSentences.join("; ")}.` : "") +
    `\n\nHighlights:\n${highlights.map((h) => `• ${h}`).join("\n")}`;
  const seoDescription = `${type}${cap ? ` (${cap})` : ""}${folded ? ` that folds to ${folded.value} ${folded.unit}` : ""}. Practical and easy to care for, made for ${use.list}.`;
  const tags = [...keywords.primary, ...keywords.secondary].slice(0, 8);
  return {
    title: tidy(title),
    bullets: highlights,
    description,
    search_terms: "",
    seo_title: tidy(seoTitle),
    seo_description: seoDescription.slice(0, 160),
    tags,
  };
}

function backendTerms(title: string, keywords: KeywordSet): string {
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
  return terms.join(" ");
}

function tidy(s: string): string {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/ ,/g, ",")
    .trim();
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}
