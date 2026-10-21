import { describe, expect, it } from "vitest";
import { appearsIn, parseListingText } from "./parse";

describe("parseListingText", () => {
  it("reads a labeled Seller Central paste", () => {
    const { draft, confidence } = parseListingText(`Title: Silicone Cup, 350 ml Travel Cup
About this item
• Folds flat to 3 cm
• Holds 350 ml
• Food-grade silicone
Product description
A cup for travel and camping.
It packs flat.
Search terms: foldable mug camping`);
    expect(confidence).toBe("high");
    expect(draft.title).toBe("Silicone Cup, 350 ml Travel Cup");
    expect(draft.bullets).toEqual(["Folds flat to 3 cm", "Holds 350 ml", "Food-grade silicone"]);
    expect(draft.description).toBe("A cup for travel and camping.\nIt packs flat.");
    expect(draft.search_terms).toBe("foldable mug camping");
  });

  it("reads Amazon's Item highlights line apart from the bullets", () => {
    const { draft } = parseListingText(`Title: Silicone Cup, 350 ml
Item highlights: Folds flat to 3 cm, lid included, for camping and travel
About this item
• Holds 350 ml
• Food-grade silicone`);
    expect(draft.item_highlights).toBe("Folds flat to 3 cm, lid included, for camping and travel");
    expect(draft.bullets).toEqual(["Holds 350 ml", "Food-grade silicone"]);
  });

  it("reads an unlabeled paste: first line title, marked lines bullets", () => {
    const { draft } = parseListingText(`Bamboo Cutting Board, Extra Thick
- Antibacterial bamboo surface
- Juice groove
This board is made of natural bamboo for everyday kitchen use and is easy to clean.`);
    expect(draft.title).toBe("Bamboo Cutting Board, Extra Thick");
    expect(draft.bullets).toHaveLength(2);
    expect(draft.description).toMatch(/natural bamboo/);
  });

  it("handles numbered bullets, inline bullet labels, Chinese labels and hashtags", () => {
    const { draft } = parseListingText(`标题：硅胶折叠杯
Bullet 1: Folds flat
2. Holds 350 ml
描述：便携旅行杯
#travel #camping`);
    expect(draft.title).toBe("硅胶折叠杯");
    expect(draft.bullets).toEqual(["Folds flat", "Holds 350 ml"]);
    expect(draft.description).toBe("便携旅行杯");
    expect(draft.tags).toEqual(["travel", "camping"]);
  });

  it("flags a paste with no structure as low confidence", () => {
    expect(parseListingText("just one long line of text").confidence).toBe("low");
  });

  it("checks that a fragment is really in the source", () => {
    expect(appearsIn("Holds  350 ml\nof water", "holds 350 ml of water")).toBe(true);
    expect(appearsIn("Holds 350 ml", "FDA approved")).toBe(false);
  });
});
