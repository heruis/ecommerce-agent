import type { Platform } from "@/lib/contracts";

/** Where a publish-form field's value comes from when we build the report. */
export type FieldSource =
  | {
      from:
        | "title"
        | "item_highlights"
        | "bullets"
        | "description"
        | "search_terms"
        | "seo_title"
        | "seo_description"
        | "tags";
    }
  | { from: "bullet"; index: number }
  | { from: "brand" | "category" | "product_type" | "keywords" | "hashtags" }
  | { from: "fact"; attributes: string[] }
  | { from: "seller" };

export interface FormField {
  key: string;
  label: string;
  required: boolean;
  source: FieldSource;
  /** Shown next to the value: what the seller must know about this field. */
  note?: string;
}

/**
 * Platform rule configuration. Values are encoded from public seller
 * documentation and must be re-verified per category; `sources` lists them.
 * Owner: WS2.
 */
export interface PlatformRules {
  platform: Platform;
  label: string;
  sources: string[];
  /** How this platform's listing should read (fed to the localization prompt). */
  style: string;
  title: {
    maxChars: number;
    recommendedMinChars?: number;
    recommendedMaxChars?: number;
    /** Characters not allowed in titles unless part of the brand name. */
    bannedChars: string[];
    /** A non-stopword may appear at most this many times. */
    maxWordRepeats: number;
  };
  /** Amazon Item Highlights: one searchable line under the title; null elsewhere. */
  itemHighlights: { maxChars: number } | null;
  bullets: {
    label: string;
    min: number;
    expected: number;
    maxChars: number;
    recommendedMaxChars: number;
  };
  description: { minChars: number; maxChars: number };
  /** Amazon backend search terms; null where the platform has no such field. */
  searchTerms: { maxBytes: number; discouraged: string[] } | null;
  /** Shopify search-engine listing; null elsewhere. */
  seo: {
    titleMax: number;
    titleRecommended: number;
    descriptionMax: number;
    descriptionRecommended: number;
  } | null;
  /** Shopify tags or TikTok hashtags; null where unused. */
  tags: { label: string; min: number; max: number; maxChars: number } | null;
  /** Phrases not allowed anywhere in the listing copy on this platform. */
  bannedPhrases: string[];
  images: { mainRules: string[]; gallery: string };
  /** The marketplace's "add product" form, in the order the seller sees it. */
  form: FormField[];
}
