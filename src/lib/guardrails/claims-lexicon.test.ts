import { describe, expect, it } from "vitest";
import { scanClaims, stripPhrase } from "./claims-lexicon";

const ids = (text: string, evidence = "") =>
  scanClaims(text, evidence).map((h) => `${h.rule.id}:${h.status}`);

describe("claims lexicon", () => {
  it("detects the demo claims in Chinese", () => {
    expect(ids("FDA认证，100%安全，美国销量第一")).toEqual(
      expect.arrayContaining([
        "fda_approval:restricted",
        "absolute_safety:restricted",
        "ranking_number_one:restricted",
      ]),
    );
  });

  it("detects English claims", () => {
    expect(ids("Antibacterial board, eco-friendly and Made in USA")).toEqual(
      expect.arrayContaining([
        "antimicrobial:restricted",
        "eco_general:unverified",
        "made_in_usa:restricted",
      ]),
    );
  });

  it("treats every degradability claim as restricted, not only 'biodegradable'", () => {
    for (const phrase of [
      "Degradable",
      "bio-degradable",
      "oxo-degradable",
      "Photodegradable",
      "compostable",
    ]) {
      expect(ids(`TPE yoga mat, ${phrase}`)).toContain("biodegradable:restricted");
    }
    expect(ids("可降解TPE瑜伽垫")).toContain("biodegradable:restricted");
    expect(ids("Non-degradable PVC backing")).not.toContain("biodegradable:restricted");
  });

  it("upgrades a claim when the seller has evidence", () => {
    expect(ids("BPA-free lid")).toContain("bpa_free:unverified");
    expect(ids("BPA-free lid", "SGS test report: BPA-free")).toContain("bpa_free:verified");
  });

  it("does not flag ordinary phrasing", () => {
    expect(ids("Perfect for camping, folds flat, 350 ml capacity")).toEqual([]);
  });

  it("strips a phrase and tidies punctuation", () => {
    expect(stripPhrase("Durable, FDA approved, and light.", "FDA approved")).toBe(
      "Durable, and light.",
    );
  });
});
