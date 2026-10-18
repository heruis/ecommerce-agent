import type { PlatformRules } from "./types";

/**
 * TikTok Shop US — STRETCH GOAL. Values are placeholders until WS2 verifies
 * them against TikTok Shop Seller Center documentation (TODO(WS2)).
 */
export const TIKTOK_US: PlatformRules = {
  platform: "tiktok_us",
  label: "TikTok Shop US",
  sources: ["TODO(WS2): TikTok Shop Seller Center product listing guidelines"],
  title: {
    maxChars: 255,
    bannedChars: ["$", "^", "{", "}"],
    maxWordRepeats: 2,
  },
  bullets: { expected: 5, maxChars: 300, recommendedMaxChars: 150 },
  description: { minChars: 100, maxChars: 10000 },
  searchTerms: { maxBytes: 249, discouraged: ["best", "cheap", "sale"] },
  bannedPhrases: ["free shipping", "best seller", "#1", "buy now", "limited time"],
};
