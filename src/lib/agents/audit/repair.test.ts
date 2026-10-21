import { describe, expect, it } from "vitest";
import type { ListingDraft } from "@/lib/contracts";
import { validateListing } from "@/lib/rules";
import { repairRules, shorten } from "./repair";

const base: ListingDraft = {
  title: "Silicone Cup",
  item_highlights: "",
  bullets: ["A", "B", "C", "D", "E"].map((x) => `Point ${x}: a clear sentence about the cup.`),
  description: "A collapsible cup for travel and camping. ".repeat(5),
  search_terms: "foldable mug",
  seo_title: "",
  seo_description: "",
  tags: [],
};

describe("repairRules", () => {
  it("fixes an overlong, repetitive title without cutting a word in half", () => {
    const title =
      "Cup Cup Cup Silicone Cup, Collapsible Travel Cup for Camping, Hiking, Office, Gym, Picnic, Beach, Car, Kitchen and Everyday Use, " +
      "Portable Lightweight Reusable Design Holds Water Coffee Tea Juice Milk Smoothies and More for Adults and Kids Outdoors";
    const { listing, notes } = repairRules({ ...base, title }, "amazon_us");
    const v = validateListing(listing, "amazon_us");
    expect(v.violations.filter((x) => x.field === "title" && x.severity === "error")).toEqual([]);
    expect(title.startsWith(listing.title.replace(/,$/, "").split(" ").slice(0, 1)[0])).toBe(true);
    expect(notes.some((n) => n.field === "title")).toBe(true);
  });

  it("removes untranslated Chinese, links and emojis", () => {
    const { listing } = repairRules(
      { ...base, bullets: [...base.bullets.slice(0, 4), "Easy to clean 易清洗 🙂 www.shop.com"] },
      "amazon_us",
    );
    expect(listing.bullets[4]).toBe("Easy to clean");
  });

  it("leaves a valid listing untouched", () => {
    const { listing, notes } = repairRules(base, "amazon_us");
    expect(listing).toEqual(base);
    expect(notes).toEqual([]);
  });

  it("shortens at a boundary", () => {
    expect(shorten("Alpha beta, gamma delta epsilon", 20)).toBe("Alpha beta");
  });
});
