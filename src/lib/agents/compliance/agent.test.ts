import { describe, expect, it } from "vitest";
import type {
  ClaimAssessment,
  ComplianceReport,
  ListingDraft,
  ProductFacts,
} from "@/lib/contracts";
import { LexicalRetriever } from "@/lib/rag";
import { backstop, citeRestricted } from "./agent";
import { complianceCandidates } from "./mock";

// The yoga-mat golden case: the seller's "可降解" comes back from extraction as "Degradable".
const facts: ProductFacts = {
  product_type: "yoga mat",
  category: "sports_outdoors",
  facts: [],
  marketing_claims: [
    {
      id: "c1",
      text_zh: "环保可降解",
      text_en: "Eco-friendly, degradable",
      claim_type: "environmental",
    },
  ],
  missing_info: [],
  questions: [],
};

const draft: ListingDraft = {
  title: "TPE Yoga Mat, Non-Slip, 183 x 61 cm",
  item_highlights: "",
  bullets: ["Non-Slip: Textured surface for yoga and Pilates."],
  description: "A thick TPE yoga mat for home workouts.",
  search_terms: "",
  seo_title: "",
  seo_description: "",
  tags: [],
};

const claim = (over: Partial<ClaimAssessment>): ClaimAssessment => ({
  id: "k1",
  claim_text: "",
  field: "source",
  status: "restricted",
  risk: "high",
  reason: "Not substantiated.",
  evidence_fact_ids: [],
  policy_refs: [],
  action: "remove",
  suggested_fix: null,
  ...over,
});

const report = (claims: ClaimAssessment[]): ComplianceReport => ({
  claims,
  summary: "",
  uncertainty: [],
});

describe("compliance claim coverage", () => {
  it("screens every rule a seller claim triggers, not only the first", () => {
    const rules = complianceCandidates([draft], facts, "").map((c) => c.rule.id);
    expect(rules).toEqual(expect.arrayContaining(["eco_general", "biodegradable"]));
  });

  it("adds a risky seller claim the agent did not assess, once, with the strictest verdict", () => {
    const out = backstop(report([]), [draft], facts, "");
    expect(out.claims).toHaveLength(1);
    expect(out.claims[0]).toMatchObject({
      id: "k1",
      claim_text: "Eco-friendly, degradable",
      field: "source",
      status: "restricted",
      action: "remove",
    });
  });

  it("does not duplicate a seller claim the agent assessed in other words", () => {
    const assessed = report([
      claim({ claim_text: "Degradable" }),
      claim({ id: "k2", claim_text: "Eco-friendly", status: "unverified", action: "ask_seller" }),
    ]);
    expect(backstop(assessed, [draft], facts, "").claims).toHaveLength(2);
  });
});

describe("citeRestricted", () => {
  const retriever = new LexicalRetriever();

  it("cites an uncited restricted claim from its rule's policy doc", async () => {
    const out = await citeRestricted(report([claim({ claim_text: "Degradable" })]), retriever, [
      "amazon_us",
    ]);
    expect(out.claims[0].policy_refs[0]?.doc_id).toBe("ftc-green-guides");
    expect(out.uncertainty.join(" ")).toMatch(/cited automatically/);
  });

  it("leaves cited and non-restricted claims unchanged", async () => {
    const ref = { doc_id: "x", chunk_id: "x#1", title: "X", url: "https://example.com" };
    const input = report([
      claim({ claim_text: "FDA approved", policy_refs: [ref] }),
      claim({ id: "k2", claim_text: "Sturdy", status: "unverified", action: "ask_seller" }),
    ]);
    const out = await citeRestricted(input, retriever, ["amazon_us"]);
    expect(out).toBe(input);
  });
});
