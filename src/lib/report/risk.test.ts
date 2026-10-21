import { describe, expect, it } from "vitest";
import type { ComplianceReport, ListingDraft } from "@/lib/contracts";
import { validateListing } from "@/lib/rules";
import { computeRisk, riskLevel } from "./risk";

const clean: ListingDraft = {
  title: "Collapsible Silicone Cup, 350 ml Travel Cup with Lid for Camping and Hiking",
  item_highlights: "",
  bullets: [
    "Folds Flat: Collapses to about 3 cm so it fits in a pocket.",
    "Right-Sized: Holds 350 ml of water, coffee or tea.",
    "Made with Food-Grade Silicone: Flexible and easy to rinse.",
    "Lid Included: Keeps dust out on the trail.",
    "Specifications: 9 x 9 x 11 cm, 85 g.",
  ],
  description: "A collapsible cup for travel, camping and hiking that packs flat. ".repeat(4),
  search_terms: "foldable mug backpacking",
  seo_title: "",
  seo_description: "",
  tags: [],
};

const noClaims: ComplianceReport = { claims: [], summary: "", uncertainty: [] };

function risk(listing: ListingDraft, compliance: ComplianceReport = noClaims, evidence = "") {
  return computeRisk({
    listing,
    compliance,
    validation: validateListing(listing, "amazon_us"),
    evidence,
  });
}

describe("computeRisk", () => {
  it("scores a clean listing low", () => {
    const r = risk(clean);
    expect(r.level).toBe("low");
    expect(r.score).toBeLessThan(20);
  });

  it("puts any restricted claim in the high band", () => {
    const r = risk({ ...clean, title: `FDA Approved ${clean.title}` });
    expect(r.level).toBe("high");
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.reasons.join(" ")).toMatch(/FDA Approved/);
  });

  it("treats unproven claims as medium and evidence lowers nothing it should not", () => {
    const listing = {
      ...clean,
      bullets: [...clean.bullets.slice(0, 4), "BPA-free and lightweight."],
    };
    const r = risk(listing);
    expect(r.level).toBe("medium");
    expect(r.score).toBeGreaterThanOrEqual(25);
  });

  it("counts compliance findings still present in the copy, not removed ones", () => {
    const compliance: ComplianceReport = {
      summary: "",
      uncertainty: [],
      claims: [
        {
          id: "k1",
          claim_text: "kills germs",
          field: "description",
          status: "restricted",
          risk: "high",
          reason: "Pesticide claim.",
          evidence_fact_ids: [],
          policy_refs: [],
          action: "remove",
          suggested_fix: null,
        },
      ],
    };
    expect(risk(clean, compliance).level).toBe("low");
    const withClaim = { ...clean, description: `${clean.description} It kills germs.` };
    expect(risk(withClaim, compliance).level).toBe("high");
  });

  it("adds rule errors and untranslated text", () => {
    const r = risk({ ...clean, title: `${clean.title} 硅胶折叠杯` });
    expect(r.reasons.join(" ")).toMatch(/untranslated/);
    expect(r.score).toBeGreaterThan(risk(clean).score);
  });

  it("maps scores to levels", () => {
    expect(riskLevel(0)).toBe("low");
    expect(riskLevel(20)).toBe("medium");
    expect(riskLevel(50)).toBe("high");
  });
});
