import type { Platform } from "@/lib/contracts";

/**
 * Platform rule configuration. Values are encoded from public seller
 * documentation and must be re-verified per category before launch; each
 * config lists its sources. Owner: WS2.
 */
export interface PlatformRules {
  platform: Platform;
  label: string;
  sources: string[];
  title: {
    maxChars: number;
    /** Characters not allowed in titles unless part of the brand name. */
    bannedChars: string[];
    /** A non-stopword may appear at most this many times. */
    maxWordRepeats: number;
  };
  bullets: { expected: number; maxChars: number; recommendedMaxChars: number };
  description: { minChars: number; maxChars: number };
  searchTerms: { maxBytes: number; discouraged: string[] };
  /** Phrases not allowed anywhere in the listing copy. */
  bannedPhrases: string[];
}
