import { describe, expect, it } from "vitest";
import type { ListingDraft } from "@/lib/contracts";
import { validateListing } from "@/lib/rules";
import { computeScore, parseExistingListing, WEIGHTS } from "./score";

const listing: ListingDraft = {
  title: "Collapsible Silicone Cup, 350 ml Travel Cup",
  item_highlights: "",
  bullets: [
    "Material: Food-grade silicone.",
    "Capacity: 350 ml.",
    "Folds flat.",
    "Lightweight.",
    "Easy to carry.",
  ],
  description: "A collapsible silicone cup for travel, camping and hiking. ".repeat(3),
  search_terms: "foldable mug",
  seo_title: "",
  seo_description: "",
  tags: [],
};
const judge = { naturalness: 4, clarity: 4, issues: [] };

describe("computeScore", () => {
  it("weights sum to 100", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("penalizes restricted claims left in the listing", () => {
    const clean = computeScore({
      listing,
      judge,
      validation: validateListing(listing, "amazon_us"),
    });
    const risky = { ...listing, title: `${listing.title} FDA Approved 100% safe` };
    const bad = computeScore({
      listing: risky,
      judge,
      validation: validateListing(risky, "amazon_us"),
    });
    const claim = (s: typeof bad) =>
      s.components.find((c) => c.dimension === "claim_verification")!.score;
    expect(claim(bad)).toBeLessThan(claim(clean));
    expect(bad.total).toBeLessThan(clean.total);
  });

  it("parses an existing listing for baseline scoring", () => {
    const parsed = parseExistingListing("Cup Title\n- bullet one\n- bullet two\nSome description");
    expect(parsed).toMatchObject({
      title: "Cup Title",
      bullets: ["bullet one", "bullet two"],
      description: "Some description",
    });
  });
});
