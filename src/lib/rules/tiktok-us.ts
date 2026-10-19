import type { PlatformRules } from "./types";

/**
 * TikTok Shop US. Limits come from Seller Center guidance as reported by
 * integration partners; WS2 verifies them in Seller Center (TODO(WS2)).
 */
export const TIKTOK_US: PlatformRules = {
  platform: "tiktok_us",
  label: "TikTok Shop US",
  sources: [
    "TikTok Shop Seller Center: product listing guidelines (as summarized by integration partners)",
    "Duoke: Avoiding TikTok Shop listing failures",
    "Pipe17: List products to TikTok Shop",
  ],
  style:
    "Short, hook-led and mobile-first. The product name says what it is and the main benefit in plain words. Selling points are short and visual (what you see in the video). Description is friendly and scannable. Hashtags help creators and search; no hype claims.",
  title: {
    maxChars: 255,
    recommendedMinChars: 40,
    recommendedMaxChars: 150,
    bannedChars: ["$", "^", "{", "}"],
    maxWordRepeats: 2,
  },
  bullets: {
    label: "Key selling points",
    min: 3,
    expected: 5,
    maxChars: 200,
    recommendedMaxChars: 120,
  },
  description: { minChars: 150, maxChars: 10000 },
  searchTerms: null,
  seo: null,
  tags: { label: "Hashtags (for videos and creators)", min: 3, max: 8, maxChars: 30 },
  bannedPhrases: [
    "free shipping",
    "best seller",
    "best-selling",
    "buy now",
    "limited time",
    "100% guaranteed",
  ],
  images: {
    mainRules: [
      "White or plain light background for the first image",
      "Square 1:1, at least 800 × 800 px (300–4000 px accepted)",
      "No watermarks, added text or logos on the main image",
      "JPG or PNG, up to 5 MB",
    ],
    gallery: "Up to 9 images in total; add a short product video if you can",
  },
  form: [
    {
      key: "product_name",
      label: "Product name",
      required: true,
      source: { from: "title" },
      note: "40–150 characters recommended",
    },
    {
      key: "category",
      label: "Category",
      required: true,
      source: { from: "product_type" },
      note: "Choose the closest category in Seller Center",
    },
    {
      key: "brand",
      label: "Brand",
      required: false,
      source: { from: "brand" },
      note: "No brand → choose No brand",
    },
    {
      key: "description",
      label: "Product description",
      required: true,
      source: { from: "description" },
      note: "English only; selling points are included at the top",
    },
    {
      key: "selling_points",
      label: "Key selling points",
      required: false,
      source: { from: "bullets" },
    },
    {
      key: "attributes",
      label: "Product attributes (material, color …)",
      required: false,
      source: { from: "fact", attributes: ["material", "color", "capacity"] },
    },
    {
      key: "package_weight",
      label: "Package weight",
      required: true,
      source: { from: "fact", attributes: ["weight"] },
      note: "Shipped weight including packaging",
    },
    {
      key: "package_dimensions",
      label: "Package dimensions",
      required: true,
      source: { from: "fact", attributes: ["dimensions"] },
      note: "Packed size, not product size",
    },
    {
      key: "variations",
      label: "Variations (color / size)",
      required: false,
      source: { from: "fact", attributes: ["color"] },
    },
    {
      key: "hashtags",
      label: "Hashtags (for videos)",
      required: false,
      source: { from: "tags" },
      note: "Not a product field — use in your videos and creator briefs",
    },
    { key: "price_stock", label: "Price and stock", required: true, source: { from: "seller" } },
  ],
};
