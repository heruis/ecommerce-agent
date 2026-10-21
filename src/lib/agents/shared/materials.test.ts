import { describe, expect, it } from "vitest";
import type { ProductFacts } from "@/lib/contracts";
import { expandMaterialAbbreviations, normalizeMaterials } from "./materials";

describe("material glossary", () => {
  it("spells out plastics shoppers search for by name, keeping the abbreviation", () => {
    expect(expandMaterialAbbreviations("PP")).toBe("polypropylene (PP)");
    expect(expandMaterialAbbreviations("PP plastic")).toBe("polypropylene (PP) plastic");
    expect(expandMaterialAbbreviations("TPE")).toBe("thermoplastic elastomer (TPE)");
    expect(expandMaterialAbbreviations("PET")).toBe("polyethylene terephthalate (PET)");
    expect(expandMaterialAbbreviations("HDPE")).toBe("high-density polyethylene (HDPE)");
    expect(expandMaterialAbbreviations("TPU")).toBe("thermoplastic polyurethane (TPU)");
  });

  it("leaves values that already name the material, and other words, alone", () => {
    expect(expandMaterialAbbreviations("PP (polypropylene)")).toBe("PP (polypropylene)");
    expect(expandMaterialAbbreviations("polypropylene (PP)")).toBe("polypropylene (PP)");
    expect(expandMaterialAbbreviations("food-grade silicone")).toBe("food-grade silicone");
    expect(expandMaterialAbbreviations("PPE fabric")).toBe("PPE fabric");
  });

  it("only touches material facts", () => {
    const facts: ProductFacts = {
      product_type: "storage box",
      category: "home_kitchen",
      facts: [
        {
          id: "f1",
          attribute: "material",
          value: "PP",
          unit: null,
          source_quote: "PP材质",
          confidence: "high",
        },
        {
          id: "f2",
          attribute: "model",
          value: "PC-200",
          unit: null,
          source_quote: "PC-200",
          confidence: "high",
        },
      ],
      marketing_claims: [],
      missing_info: [],
      questions: [],
    };
    const out = normalizeMaterials(facts).facts;
    expect(out[0].value).toBe("polypropylene (PP)");
    expect(out[1].value).toBe("PC-200");
  });
});
