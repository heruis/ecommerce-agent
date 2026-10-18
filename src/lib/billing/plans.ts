import { env } from "@/lib/env";

/**
 * Pricing (see docs/PRD.md §7). Free: a few runs to try the product.
 * Pro: monthly subscription with a fair-use cap so API cost stays bounded.
 */
export function plans() {
  const e = env();
  return {
    free: { name: "Free", priceUsd: 0, runs: e.FREE_RUNS, period: "one-time" as const },
    pro: { name: "Pro", priceUsd: 9.99, runs: e.PRO_RUNS_PER_PERIOD, period: "month" as const },
  };
}
