import type { ListingDraft } from "@/lib/contracts";

/**
 * Demo data: what ShelfPass produces for the collapsible-cup example (the
 * same supplier text as the "Collapsible silicone cup" example on the new
 * report form). Based on a pipeline run, lightly edited for the marketing
 * pages. Every channel passes its own rule check: Amazon title within 75
 * characters plus Item Highlights and 5 bullets, TikTok Shop hashtags, Shopify SEO fields within
 * Google's display lengths, and no restricted claims.
 */

/** The seller's original Chinese supplier copy, with the risky phrases it contains. */
export const SAMPLE_SUPPLIER_TEXT =
  "硅胶折叠水杯 便携旅行杯 带盖。食品级硅胶，FDA认证，100%安全，美国销量第一！容量350ml，折叠后仅3cm高，适合旅行、露营、徒步。环保可重复使用。";

export const SAMPLE_RISKY_PHRASES: { zh: string; outcome: "rewritten" | "removed"; to?: string }[] =
  [
    { zh: "FDA认证", outcome: "rewritten", to: "made with food-grade silicone" },
    { zh: "100%安全", outcome: "removed" },
    { zh: "美国销量第一", outcome: "removed" },
    { zh: "环保", outcome: "rewritten", to: "reusable" },
  ];

export const SAMPLE_BRAND = "TrailFold";
export const SAMPLE_PRICE = "$12.99";
export const SAMPLE_HANDLE = "collapsible-silicone-cup";
export const SAMPLE_STORE = "trailfold";

export const SAMPLE_IMAGES = [
  "/demo/cup.svg",
  "/demo/cup-folded.svg",
  "/demo/cup-size.svg",
  "/demo/cup-lifestyle.svg",
];

export const SAMPLE_AMAZON: ListingDraft = {
  title: "TrailFold Collapsible Silicone Cup with Lid, 350 ml, Folds Flat to 3 cm",
  item_highlights:
    "Food-grade travel cup with lanyard for camping, hiking and backpacking; handles drinks from -40 to 200 °C",
  bullets: [
    "Folds Flat to 3 cm: Collapses from 11 cm tall to about 3 cm, so it slips into a pocket, purse or backpack side pocket.",
    "Food-Grade Silicone: Made with soft, flexible food-grade silicone that pops back into shape and rinses clean in seconds.",
    "Holds 350 ml: Room for a full cup of water, coffee or tea on trail breaks, road trips and long flights.",
    "Hot and Cold Drinks: Rated for -40 to 200 °C, so it handles iced drinks and fresh coffee alike.",
    "What You Get: 1 collapsible cup with lid and 1 lanyard. Open size 9 x 9 x 11 cm, weight 85 g.",
  ],
  description:
    "The TrailFold collapsible cup is made for days when space matters. Pull it open for a full 350 ml drink, then press it flat to about 3 cm and clip it to your pack with the included lanyard.\n\nIt is made with food-grade silicone that stays soft and flexible, rinses clean in seconds and handles drinks from -40 to 200 °C. Use it at the campsite, on the trail, at the gym or on long trips where a mug would not fit.",
  search_terms:
    "foldable mug portable drinking cup camp kitchen backpacking gear reusable cup outdoor drinkware",
  seo_title: "",
  seo_description: "",
  tags: [],
};

export const SAMPLE_TIKTOK: ListingDraft = {
  title: "TrailFold Collapsible Silicone Cup 350 ml, Folds Flat to 3 cm for Travel & Camping",
  item_highlights: "",
  bullets: [
    "Folds flat to 3 cm: fits any pocket",
    "Food-grade silicone, easy to rinse",
    "Holds 350 ml of coffee, tea or water",
    "Lid and lanyard included",
  ],
  description:
    "Your cup for every trip. Pull it open for a full 350 ml drink, press it flat when you're done, and clip it to your bag with the lanyard.\n\nMade with food-grade silicone. Open size 9 x 9 x 11 cm, 85 g.",
  search_terms: "",
  seo_title: "",
  seo_description: "",
  tags: ["collapsiblecup", "campinggear", "traveltips", "hikingessentials", "outdoorgear"],
};

export const SAMPLE_SHOPIFY: ListingDraft = {
  title: "TrailFold Collapsible Silicone Cup – 350 ml",
  item_highlights: "",
  bullets: [
    "Folds flat to about 3 cm",
    "Food-grade silicone, easy to rinse",
    "Holds 350 ml, hot or cold",
    "Lid and lanyard included",
  ],
  description:
    "Meet the cup that disappears when you don't need it. Open it for a full 350 ml of coffee, tea or water; press it down to about 3 cm and it slides into a pocket, purse or daypack.\n\nMade with food-grade silicone that stays soft and rinses clean, it handles drinks from -40 to 200 °C — at the campsite, on the trail or at your desk.",
  search_terms: "",
  seo_title: "Collapsible Silicone Cup 350 ml | Folds to 3 cm | TrailFold",
  seo_description:
    "A 350 ml food-grade silicone cup that folds flat to 3 cm. Light, packable and easy to rinse — made for camping, hiking and travel.",
  tags: ["collapsible cup", "silicone cup", "camping cup", "travel cup", "hiking gear"],
};
