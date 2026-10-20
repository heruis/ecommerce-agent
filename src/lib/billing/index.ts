import type { BillingProvider } from "@/lib/contracts";
import { env } from "@/lib/env";
import { MockBilling } from "./mock";
import { StripeBilling } from "./stripe";

export function getBilling(): BillingProvider {
  return env().BILLING_MODE === "stripe" ? new StripeBilling() : new MockBilling();
}

export { endPro, grantPack, renewPro, startPro } from "./credits";
export { plans, type PlanKey } from "./plans";
export { applyStripeEvent, type WebhookOutcome } from "./webhook";
