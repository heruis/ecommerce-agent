import type { PlatformRules } from "./types";

export const AMAZON_US: PlatformRules = {
  platform: "amazon_us",
  label: "Amazon US",
  sources: [
    "Amazon Seller Central Help: Product title requirements",
    "Amazon Seller Central Help: Product detail page rules",
    "Amazon Seller Central Help: Use search terms effectively",
  ],
  title: {
    maxChars: 200,
    bannedChars: ["!", "$", "?", "_", "{", "}", "^", "¬", "¦"],
    maxWordRepeats: 2,
  },
  bullets: { expected: 5, maxChars: 500, recommendedMaxChars: 255 },
  description: { minChars: 150, maxChars: 2000 },
  searchTerms: {
    maxBytes: 249,
    discouraged: ["best", "cheap", "sale", "new", "amazing", "free shipping", "amazon"],
  },
  bannedPhrases: [
    "free shipping",
    "best seller",
    "best-seller",
    "best selling",
    "best-selling",
    "hot sale",
    "hot item",
    "on sale",
    "buy now",
    "limited time",
    "100% quality guaranteed",
    "money back guarantee",
  ],
};
