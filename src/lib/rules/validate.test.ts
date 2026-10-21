import { describe, expect, it } from "vitest";
import type { ListingDraft } from "@/lib/contracts";
import { validateListing } from "./index";

const good: ListingDraft = {
  title: "Collapsible Silicone Cup, 350 ml Food-Grade Travel Cup for Camping",
  item_highlights:
    "Folds flat to 3 cm, lid and lanyard included, for hiking, travel and the office",
  bullets: Array.from(
    { length: 5 },
    (_, i) => `Benefit ${i + 1}: A clear, factual sentence about the product.`,
  ),
  description: "A practical collapsible cup made with food-grade silicone. ".repeat(4),
  search_terms: "foldable mug backpacking camping drinkware",
  seo_title: "",
  seo_description: "",
  tags: [],
};

describe("validateListing (amazon_us)", () => {
  it("passes a clean listing", () => {
    const r = validateListing(good, "amazon_us");
    expect(r.passed).toBe(true);
    expect(r.violations.filter((v) => v.severity === "error")).toHaveLength(0);
  });

  it("rejects titles over 75 characters instead of truncating", () => {
    const title = "Collapsible Silicone Cup, 350 ml Food-Grade Travel Cup for Camping and Hiking";
    expect(title.length).toBe(77);
    const r = validateListing({ ...good, title }, "amazon_us");
    expect(r.passed).toBe(false);
    expect(r.violations.map((v) => v.rule_id)).toContain("title.max_chars");
    const atLimit = validateListing({ ...good, title: title.slice(0, 75) }, "amazon_us");
    expect(atLimit.violations.map((v) => v.rule_id)).not.toContain("title.max_chars");
  });

  it("limits Item Highlights to 125 characters", () => {
    const r = validateListing({ ...good, item_highlights: "x".repeat(126) }, "amazon_us");
    expect(r.passed).toBe(false);
    expect(r.violations.map((v) => v.rule_id)).toContain("item_highlights.max_chars");
  });

  it("warns when Item Highlights is empty or repeats the title", () => {
    const empty = validateListing({ ...good, item_highlights: "" }, "amazon_us");
    expect(empty.passed).toBe(true);
    expect(empty.violations.map((v) => v.rule_id)).toContain("item_highlights.missing");
    const repeat = validateListing(
      { ...good, item_highlights: "Collapsible silicone travel cup, 350 ml, food-grade" },
      "amazon_us",
    );
    expect(repeat.violations.map((v) => v.rule_id)).toContain("item_highlights.repeats_title");
  });

  it("screens Item Highlights for promo phrases, links and untranslated text", () => {
    const r = validateListing(
      { ...good, item_highlights: "Best seller, see www.shop.cn, 硅胶" },
      "amazon_us",
    );
    const ids = r.violations.filter((v) => v.field === "item_highlights").map((v) => v.rule_id);
    expect(ids).toEqual(
      expect.arrayContaining(["content.banned_phrase", "content.url", "content.untranslated"]),
    );
  });

  it("has no Item Highlights rules outside Amazon", () => {
    const r = validateListing({ ...good, item_highlights: "" }, "tiktok_us");
    expect(r.violations.some((v) => v.field === "item_highlights")).toBe(false);
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
