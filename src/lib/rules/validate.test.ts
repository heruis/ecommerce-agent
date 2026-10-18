import { describe, expect, it } from "vitest";
import type { ListingDraft } from "@/lib/contracts";
import { validateListing } from "./index";

const good: ListingDraft = {
  title: "Collapsible Silicone Cup, 350 ml Food-Grade Travel Cup for Camping and Hiking",
  bullets: Array.from(
    { length: 5 },
    (_, i) => `Benefit ${i + 1}: A clear, factual sentence about the product.`,
  ),
  description: "A practical collapsible cup made with food-grade silicone. ".repeat(4),
  search_terms: "foldable mug backpacking camping drinkware",
};

describe("validateListing (amazon_us)", () => {
  it("passes a clean listing", () => {
    const r = validateListing(good, "amazon_us");
    expect(r.passed).toBe(true);
    expect(r.violations.filter((v) => v.severity === "error")).toHaveLength(0);
  });

  it("rejects titles over 200 characters instead of truncating", () => {
    const r = validateListing({ ...good, title: "Cup ".repeat(60) }, "amazon_us");
    expect(r.passed).toBe(false);
    expect(r.violations.map((v) => v.rule_id)).toContain("title.max_chars");
  });

  it("flags banned characters, repeated words and promo phrases", () => {
    const r = validateListing({ ...good, title: "Cup Cup Cup! Free Shipping" }, "amazon_us");
    const ids = r.violations.map((v) => v.rule_id);
    expect(ids).toEqual(
      expect.arrayContaining(["title.banned_char", "title.word_repeat", "content.banned_phrase"]),
    );
  });

  it("counts search terms in bytes, not characters", () => {
    const r = validateListing({ ...good, search_terms: "é".repeat(130) }, "amazon_us"); // 260 bytes
    expect(r.violations.map((v) => v.rule_id)).toContain("search_terms.max_bytes");
  });

  it("catches contact details, links and untranslated text", () => {
    const r = validateListing(
      {
        ...good,
        bullets: [...good.bullets.slice(0, 4), "Email me at a@b.com or visit www.shop.cn 硅胶"],
      },
      "amazon_us",
    );
    const ids = r.violations.map((v) => v.rule_id);
    expect(ids).toEqual(
      expect.arrayContaining(["content.email", "content.url", "content.untranslated"]),
    );
  });
});
