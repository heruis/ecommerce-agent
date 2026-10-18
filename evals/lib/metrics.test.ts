import { describe, expect, it } from "vitest";
import { ndcgAtK, precisionAtK, recallAtK, reciprocalRank } from "./metrics";

describe("retrieval metrics", () => {
  const ranked = ["a", "b", "c", "d"];
  it("recall@k counts relevant docs found in the top k", () => {
    expect(recallAtK(ranked, ["b", "z"], 3)).toBe(0.5);
  });
  it("precision@k is the share of the top k that is relevant", () => {
    expect(precisionAtK(ranked, ["a", "c"], 2)).toBe(0.5);
  });
  it("MRR uses the rank of the first relevant doc", () => {
    expect(reciprocalRank(ranked, ["c"])).toBeCloseTo(1 / 3);
    expect(reciprocalRank(ranked, ["z"])).toBe(0);
  });
  it("NDCG is 1 for a perfect ranking", () => {
    expect(ndcgAtK(["a", "b"], ["a", "b"], 2)).toBeCloseTo(1);
    expect(ndcgAtK(["x", "a"], ["a"], 2)).toBeLessThan(1);
  });
});
