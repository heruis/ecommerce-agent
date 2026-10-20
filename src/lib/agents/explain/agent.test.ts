import { describe, expect, it } from "vitest";
import type { ComplianceReport, ListingDraft } from "@/lib/contracts";
import { Budget, MockLlmClient, Tracer } from "@/lib/harness";
import { alignExplanation, runExplain, type ExplainInput } from "./agent";

const listing: ListingDraft = {
  title: "Collapsible Silicone Cup",
  bullets: ["Folds flat.", "Holds 350 ml."],
  description: "A cup for travel.",
  search_terms: "",
  seo_title: "",
  seo_description: "",
  tags: [],
};
const compliance: ComplianceReport = {
  summary: "",
  uncertainty: [],
  claims: [
    {
      id: "k1",
      claim_text: "BPA-free",
      field: "source",
      status: "unverified",
      risk: "medium",
      reason: "No test report.",
      evidence_fact_ids: [],
      policy_refs: [],
      action: "ask_seller",
      suggested_fix: null,
    },
  ],
};
const input: ExplainInput = {
  platform: "amazon_us",
  listing,
  compliance,
  risk: { score: 25, level: "medium", reasons: ["x"] },
  needsReview: ["Confirm BPA-free"],
  language: "zh",
};

describe("runExplain", () => {
  it("returns a Chinese explanation with one note per claim (mock mode)", async () => {
    const ctx = {
      runId: "exp_test",
      llm: new MockLlmClient(),
      tracer: new Tracer(),
      budget: new Budget(),
      spanId: null,
      emit: () => {},
    };
    const r = await runExplain(ctx, input);
    expect(r.language).toBe("zh");
    expect(r.summary).toMatch(/风险/);
    expect(r.back_translation.bullets).toHaveLength(2);
    expect(r.claim_notes).toEqual([{ claim_id: "k1", note: expect.stringMatching(/BPA-free/) }]);
  });

  it("realigns notes and bullets the model got wrong", () => {
    const r = alignExplanation(
      {
        language: "en",
        summary: "s",
        back_translation: { title: "t", bullets: ["only one"], description: "d" },
        claim_notes: [{ claim_id: "k9", note: "unknown claim" }],
      },
      input,
    );
    expect(r.language).toBe("zh");
    expect(r.back_translation.bullets).toEqual(["only one", "Holds 350 ml."]);
    expect(r.claim_notes.map((n) => n.claim_id)).toEqual(["k1"]);
  });
});
