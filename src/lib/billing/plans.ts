import { env } from "@/lib/env";

/**
 * Pricing (see docs/PRD.md §7 and the /pricing page). One credit = one run of
 * any tool: a multi-channel report, a listing audit or a takedown/appeal
 * analysis. Free: a few credits to try it. Credit pack: pay once, no
 * subscription. Pro: monthly credits with a fair-use cap so API cost stays
 * bounded.
 */
export function plans() {
  const e = env();
  return {
    free: { name: "Free", priceUsd: 0, credits: e.FREE_RUNS, period: "once" as const },
    pack: { name: "Credit pack", priceUsd: 4.99, credits: e.PACK_CREDITS, period: "once" as const },
    pro: { name: "Pro", priceUsd: 9.99, credits: e.PRO_RUNS_PER_PERIOD, period: "month" as const },
  };
}

export type PlanKey = keyof ReturnType<typeof plans>;
