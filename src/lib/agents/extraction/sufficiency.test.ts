import { describe, expect, it } from "vitest";
import type { Fact, ProductFacts } from "@/lib/contracts";
import { clarifyingQuestions } from "./sufficiency";

const fact = (attribute: string, confidence: Fact["confidence"] = "high"): Fact => ({
  id: `f_${attribute}`,
  attribute,
  value: "x",
  unit: null,
  source_quote: "x",
  confidence,
});

const facts = (over: Partial<ProductFacts>): ProductFacts => ({
  product_type: "cup",
  category: "home_kitchen",
  facts: [],
  marketing_claims: [],
  missing_info: [],
  questions: [],
  ...over,
});

describe("clarifyingQuestions", () => {
  it("asks nothing when the product type and one material, size or feature are known", () => {
    expect(clarifyingQuestions(facts({ facts: [fact("material")] }))).toEqual([]);
    expect(clarifyingQuestions(facts({ facts: [fact("capacity")] }))).toEqual([]);
    expect(clarifyingQuestions(facts({ facts: [fact("feature")] }))).toEqual([]);
  });

  it("asks for material, size and use when only the product type is known", () => {
    const qs = clarifyingQuestions(facts({ facts: [fact("color")] }));
    expect(qs).toHaveLength(3);
    expect(qs.map((q) => q.en).join(" ")).toMatch(/made of.*How big.*used for/);
    expect(qs.every((q) => q.zh.length > 0)).toBe(true);
  });

  it("asks what the product is when the type is generic, and ignores low-confidence facts", () => {
    const qs = clarifyingQuestions(
      facts({ product_type: "product", facts: [fact("material", "low")] }),
    );
    expect(qs[0].en).toMatch(/What exactly is the product/);
    expect(qs).toHaveLength(4);
  });

  it("uses the model's questions when it wrote them, at most four", () => {
    const model = Array.from({ length: 6 }, (_, i) => ({ en: `Q${i}?`, zh: `问题${i}？` }));
    expect(clarifyingQuestions(facts({ questions: model }))).toEqual(model.slice(0, 4));
  });

  it("does not let the model stop a run that has enough facts", () => {
    const model = [{ en: "What color is it?", zh: "什么颜色？" }];
    expect(clarifyingQuestions(facts({ facts: [fact("material")], questions: model }))).toEqual([]);
  });
});
