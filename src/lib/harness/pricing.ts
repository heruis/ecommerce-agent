import { env } from "@/lib/env";
import type { ModelTier } from "./types";

/** Estimated USD cost of one call. Prices come from env (per million tokens). */
export function estimateCostUsd(
  tier: ModelTier,
  usage: { input_tokens: number; output_tokens: number; cache_read_tokens: number },
): number {
  const e = env();
  const [inPrice, outPrice] =
    tier === "smart"
      ? [e.PRICE_SMART_INPUT_PER_MTOK, e.PRICE_SMART_OUTPUT_PER_MTOK]
      : [e.PRICE_FAST_INPUT_PER_MTOK, e.PRICE_FAST_OUTPUT_PER_MTOK];
  // Cache reads bill at roughly a tenth of the input price.
  const cost =
    (usage.input_tokens * inPrice +
      usage.cache_read_tokens * inPrice * 0.1 +
      usage.output_tokens * outPrice) /
    1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
