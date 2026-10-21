import type { ClarifyingQuestion, ProductFacts } from "@/lib/contracts";

/**
 * Is there enough to write a listing from? Decided in code, not by the model:
 * the product type must be known, plus at least one material, size or
 * concrete feature the seller stated. Otherwise the run stops after
 * extraction and asks the seller (the credit is refunded) instead of writing
 * a vague listing. The model only phrases the questions; code supplies
 * defaults when it gave none.
 */
const SIZE_ATTRIBUTES = new Set([
  "capacity",
  "dimensions",
  "size",
  "length",
  "width",
  "height",
  "diameter",
  "thickness",
  "volume",
  "weight",
  "folded_height",
]);
const GENERIC_TYPES = /^(?:product|item|goods|unknown|other|n\/a)?$/i;

const DEFAULT_QUESTIONS: Record<"type" | "material" | "size" | "use", ClarifyingQuestion> = {
  type: { en: "What exactly is the product?", zh: "这是什么产品？请写出具体品类。" },
  material: { en: "What is it made of?", zh: "产品是什么材质？" },
  size: {
    en: "How big is it (size, capacity or weight)?",
    zh: "产品的尺寸、容量或重量是多少？",
  },
  use: {
    en: "What is it used for, and what is its main feature?",
    zh: "产品用在什么场景？主要功能或卖点是什么？",
  },
};

export function clarifyingQuestions(facts: ProductFacts): ClarifyingQuestion[] {
  const stated = facts.facts.filter((f) => f.confidence !== "low");
  const hasType = !GENERIC_TYPES.test(facts.product_type.trim());
  const hasMaterial = stated.some((f) => f.attribute === "material");
  const hasSize = stated.some((f) => SIZE_ATTRIBUTES.has(f.attribute));
  const hasFeature = stated.some(
    (f) =>
      f.attribute !== "material" && f.attribute !== "color" && !SIZE_ATTRIBUTES.has(f.attribute),
  );
  if (hasType && (hasMaterial || hasSize || hasFeature)) return [];

  const fromModel = (facts.questions ?? []).filter((q) => q.en.trim() && q.zh.trim());
  if (fromModel.length > 0) return fromModel.slice(0, 4);
  return [
    !hasType && DEFAULT_QUESTIONS.type,
    !hasMaterial && DEFAULT_QUESTIONS.material,
    !hasSize && DEFAULT_QUESTIONS.size,
    !hasFeature && DEFAULT_QUESTIONS.use,
  ]
    .filter((q): q is ClarifyingQuestion => Boolean(q))
    .slice(0, 4);
}
