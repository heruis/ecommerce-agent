import type { Fact, ProductFacts, ProductInput, SourceClaim } from "@/lib/contracts";
import { scanClaims } from "@/lib/guardrails/claims-lexicon";
import { COLORS, MATERIALS, PRODUCT_TERMS, translateTerms } from "../shared/zh-dict";

/** English wording for each lexicon rule, used by the mock to "translate" claims. */
const CLAIM_EN: Record<string, string> = {
  fda_approval: "FDA approved",
  absolute_safety: "100% safe",
  ranking_number_one: "#1 best-selling in the US",
  superlative: "the best",
  medical_claim: "treats health problems",
  antimicrobial: "antibacterial",
  non_toxic: "non-toxic",
  eco_general: "eco-friendly",
  biodegradable: "biodegradable",
  made_in_usa: "Made in USA",
  bpa_free: "BPA-free",
  promo_guarantee: "satisfaction guarantee",
};

const NOUNS = new Set([
  "cup",
  "water bottle",
  "insulated bottle",
  "yoga mat",
  "phone case",
  "desk lamp",
  "pet bowl",
  "baby bottle",
  "cutting board",
  "storage box",
  "backpack",
  "towel",
  "toothbrush",
  "comb",
  "toy",
  "charging cable",
  "power bank",
  "earbuds",
  "led strip lights",
]);

/**
 * Deterministic stand-in for the extraction agent (AI_MODE=mock).
 * Regex + dictionary, so the demo and the tests run offline.
 */
export function mockExtraction(input: ProductInput): ProductFacts {
  const text = [input.title_zh, input.description_zh, input.specs_zh].join("\n");
  const facts: Fact[] = [];
  const add = (
    attribute: string,
    value: string,
    unit: string | null,
    quote: string,
    confidence: Fact["confidence"] = "high",
  ) =>
    facts.push({
      id: `f${facts.length + 1}`,
      attribute,
      value,
      unit,
      source_quote: quote,
      confidence,
    });

  for (const [re, en] of MATERIALS) {
    const m = text.match(re);
    if (m) {
      add("material", en, null, m[0]);
      break;
    }
  }

  const cap = text.match(/(\d+(?:\.\d+)?)\s*(ml|毫升|升|L|oz)(?![a-z])/i);
  if (cap)
    add(
      "capacity",
      cap[1],
      /升|^L$/i.test(cap[2]) ? "L" : /oz/i.test(cap[2]) ? "oz" : "ml",
      cap[0],
    );

  const dims = text.match(
    /(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)(?:\s*[x×*]\s*(\d+(?:\.\d+)?))?\s*(cm|厘米|mm|毫米)/i,
  );
  if (dims) {
    const unit = /mm|毫米/.test(dims[4]) ? "mm" : "cm";
    add("dimensions", [dims[1], dims[2], dims[3]].filter(Boolean).join(" x "), unit, dims[0]);
  }

  const length =
    text.match(/(?:长度|长)[：:\s]*(\d+(?:\.\d+)?)\s*(m|米|cm|厘米)(?![a-z])/i) ??
    text.match(/(\d+(?:\.\d+)?)\s*米/);
  if (length) {
    const unit = /cm|厘米/.test(length[2] ?? "") ? "cm" : "m";
    add("length", length[1], unit, length[0]);
  }

  const folded = text.match(/折叠后[^\d]{0,6}(\d+(?:\.\d+)?)\s*(cm|厘米)/);
  if (folded) add("folded_height", folded[1], "cm", folded[0]);

  const weight = text.match(/(\d+(?:\.\d+)?)\s*(g|克|kg|千克|公斤)(?![a-z])/i);
  if (weight) add("weight", weight[1], /kg|千克|公斤/i.test(weight[2]) ? "kg" : "g", weight[0]);

  const temp = text.match(/(-?\d+)\s*(?:℃|°C)?\s*(?:到|至|~|-)\s*(\d+)\s*(?:℃|°C)/);
  if (temp) add("temperature_range", `${temp[1]} to ${temp[2]}`, "°C", temp[0]);

  const colors = translateTerms(text, COLORS);
  if (colors.length)
    add("color", colors.join(", "), null, COLORS.find(([re]) => re.test(text))![0].source);

  for (const term of translateTerms(text)) {
    if (["leak-proof", "lid", "lanyard", "non-slip", "extra-thick", "portable"].includes(term)) {
      const source = PRODUCT_TERMS.find(([, en]) => en === term)![0];
      const quote = text.match(source)?.[0] ?? term;
      add("feature", term, null, quote, "medium");
    }
  }

  const titleTerms = translateTerms(input.title_zh || text);
  const noun =
    titleTerms.find((t) => NOUNS.has(t)) ??
    translateTerms(text).find((t) => NOUNS.has(t)) ??
    "product";
  const order = ["collapsible", "insulated", "silicone", "stainless steel", "bamboo"];
  const modifiers = order.filter((m) => titleTerms.includes(m) || translateTerms(text).includes(m));
  const product_type = [...new Set([...modifiers, noun])].join(" ");

  const marketing_claims: SourceClaim[] = [];
  for (const hit of scanClaims(text, input.evidence)) {
    if (hit.language !== "zh") continue;
    marketing_claims.push({
      id: `c${marketing_claims.length + 1}`,
      text_zh: hit.match,
      text_en: CLAIM_EN[hit.rule.id] ?? hit.match,
      claim_type: hit.rule.claim_type,
    });
  }

  const missing_info: string[] = [];
  const has = (a: string) => facts.some((f) => f.attribute === a);
  if (!has("dimensions")) missing_info.push("dimensions");
  if (!has("weight")) missing_info.push("weight");
  if (!/包含|包装|套装|配件|清单/.test(text)) missing_info.push("package contents");
  if (!/清洗|清洁|洗碗机|保养/.test(text)) missing_info.push("care instructions");

  // Questions for thin input come from code defaults (see sufficiency.ts).
  return {
    product_type,
    category: input.category,
    facts,
    marketing_claims,
    missing_info,
    questions: [],
  };
}
