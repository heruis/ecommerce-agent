import type { PlatformRules } from "./types";

/** Shopify product page + search-engine listing (your own store). */
export const SHOPIFY: PlatformRules = {
  platform: "shopify",
  label: "Shopify",
  sources: [
    "Shopify Help Center: Adding keywords for SEO (page title up to 70, meta description up to 320 characters)",
    "Shopify Help Center: Product details",
  ],
  style:
    "Brand voice for your own store. A clear product title, three to five highlights, and a longer description that tells shoppers how they will use it. The SEO title and meta description target one main search phrase each for Google.",
  title: { maxChars: 255, recommendedMaxChars: 70, bannedChars: [], maxWordRepeats: 2 },
  itemHighlights: null,
  bullets: { label: "Highlights", min: 3, expected: 5, maxChars: 200, recommendedMaxChars: 140 },
  description: { minChars: 300, maxChars: 5000 },
  searchTerms: null,
  seo: { titleMax: 70, titleRecommended: 60, descriptionMax: 320, descriptionRecommended: 160 },
  tags: { label: "Tags", min: 3, max: 15, maxChars: 40 },
  bannedPhrases: [],
  images: {
    mainRules: [
      "Clean, consistent background across your catalog (white or light works best)",
      "Square images, 2048 × 2048 px recommended for zoom",
      "Write alt text for every image (accessibility and image search)",
    ],
    gallery: "Add lifestyle, detail and scale photos; keep the same aspect ratio for all",
  },
  form: [
    { key: "title", label: "Title", required: true, source: { from: "title" } },
    {
      key: "description",
      label: "Description",
      required: true,
      source: { from: "description" },
      note: "Paste as paragraphs; highlights become a bullet list",
    },
    {
      key: "highlights",
      label: "Highlights (bullet list in description)",
      required: false,
      source: { from: "bullets" },
    },
    {
      key: "product_type",
      label: "Product type",
      required: false,
      source: { from: "product_type" },
    },
    { key: "vendor", label: "Vendor", required: false, source: { from: "brand" } },
    { key: "tags", label: "Tags", required: false, source: { from: "tags" } },
    {
      key: "seo_title",
      label: "SEO: page title",
      required: false,
      source: { from: "seo_title" },
      note: "Up to 70 characters; about 60 shows fully in Google",
    },
    {
      key: "seo_description",
      label: "SEO: meta description",
      required: false,
      source: { from: "seo_description" },
      note: "Up to 320 characters; about 160 shows in Google",
    },
    { key: "url_handle", label: "SEO: URL handle", required: false, source: { from: "keywords" } },
    {
      key: "media_alt",
      label: "Media alt text",
      required: false,
      source: { from: "seller" },
      note: "See the Photos section for suggested alt text",
    },
    {
      key: "price_sku",
      label: "Price, SKU, barcode, weight",
      required: true,
      source: { from: "seller" },
    },
  ],
};
