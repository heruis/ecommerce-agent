import { describe, expect, it } from "vitest";
import type { ComplianceReport, ListingDraft } from "@/lib/contracts";
import { applyGate, replaceCaseAware } from "./gate";

const draft: ListingDraft = {
  title: "Collapsible Silicone Cup, 350 ml Travel Cup for Camping and Hiking",
  item_highlights: "",
  bullets: [
    "FDA Approved Material: Made with food-grade silicone.",
    "Folds Flat: Collapses to 3 cm.",
    "Eco-Friendly Choice: Reusable for trips.",
    "Capacity: Holds 350 ml.",
    "100% safe for kids.",
  ],
  description: "A collapsible cup for travel. It is the #1 best-selling cup. ".repeat(4),
  search_terms: "foldable mug camping",
  seo_title: "",
  seo_description: "",
  tags: [],
};

const report: ComplianceReport = {
  summary: "",
  uncertainty: [],
  claims: [
    {
      id: "k1",
      claim_text: "Eco-Friendly",
      field: "bullets",
      status: "unverified",
      risk: "medium",
      reason: "",
      evidence_fact_ids: [],
      policy_refs: [],
      action: "rewrite",
      suggested_fix: "Reusable",
    },
    {
      id: "k2",
      claim_text: "BPA-free",
      field: "source",
      status: "unverified",
      risk: "low",
      reason: "",
      evidence_fact_ids: [],
      policy_refs: [],
      action: "ask_seller",
      suggested_fix: null,
    },
  ],
};

describe("applyGate (layer 3 output gate)", () => {
  const r = applyGate({
    draft,
    compliance: report,
    platform: "amazon_us",
    brand: "",
    evidence: "",
  });
  const text = [r.listing.title, ...r.listing.bullets, r.listing.description].join(" ");

  it("applies the agent's rewrites", () => {
    expect(r.listing.bullets[2]).toMatch(/^Reusable Choice/);
  });

  it("strips restricted phrases the agent missed", () => {
    expect(text).not.toMatch(/FDA approved|100% safe|#1|best-selling/i);
    expect(r.gate.applied_fixes.some((f) => f.includes("fda_approval"))).toBe(true);
  });

  it("asks the seller to confirm unverified claims", () => {
    expect(r.gate.needs_review.join(" ")).toMatch(/BPA-free/);
  });

  it("re-validates after fixing", () => {
    expect(r.validation.violations.filter((v) => v.severity === "error")).toHaveLength(0);
  });

  it("flags numbers the seller never gave for review, without failing the gate", () => {
    const withSpec = applyGate({
      draft: {
        ...draft,
        bullets: [...draft.bullets.slice(0, 4), "Keeps drinks cold 1200 minutes."],
      },
      compliance: report,
      platform: "amazon_us",
      brand: "",
      evidence: "",
      source: "硅胶折叠水杯，容量350ml，折叠后3cm",
    });
    expect(withSpec.gate.needs_review.join(" ")).toMatch(/Check 1200: not in your product/);
    expect(withSpec.gate.decision).toBe("pass");
    // Without the seller's text there is nothing to compare against.
    expect(r.gate.needs_review.join(" ")).not.toMatch(/not in your product information/);
  });
});

describe("applyGate on Shopify fields", () => {
  it("sweeps SEO fields and tags too", () => {
    const r = applyGate({
      draft: {
        ...draft,
        seo_title: "FDA Approved Silicone Travel Cup",
        seo_description: "The #1 best-selling travel cup.",
        tags: ["travel cup", "antibacterial"],
      },
      compliance: { summary: "", uncertainty: [], claims: [] },
      platform: "shopify",
      brand: "",
      evidence: "",
    });
    const seo = `${r.listing.seo_title} ${r.listing.seo_description} ${r.listing.tags.join(" ")}`;
    expect(seo).not.toMatch(/FDA approved|best-selling|#1|antibacterial/i);
    expect(r.listing.tags).toEqual(["travel cup"]);
  });
});

describe("replaceCaseAware", () => {
  it("capitalizes the replacement at the start of a label", () => {
    expect(replaceCaseAware("FDA approved silicone", "FDA approved", "made with")).toBe(
      "Made with silicone",
    );
    expect(replaceCaseAware("it is fda approved", "FDA approved", "made with")).toBe(
      "it is made with",
    );
  });
});
