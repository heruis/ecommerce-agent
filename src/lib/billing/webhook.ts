import type Stripe from "stripe";
import type { Repo } from "@/lib/contracts";
import { plans } from "./plans";

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

/**
 * Apply one verified Stripe event to our database. Pure function of
 * (event, repo) so it can be unit-tested with MemoryRepo and fake events.
 *
 * Idempotency: recordStripeEvent() is called FIRST; Stripe retries and
 * duplicate deliveries return "duplicate" and change nothing, so a payment
 * can never add credits twice.
 *
 * TODO(WS4): handle the events below and cover each with a test in
 * webhook.test.ts (duplicate delivery, unknown customer, cancellation).
 *  - checkout.session.completed  -> user = session.client_reference_id;
 *      setPlan(user, { plan: "pro", credits: plans().pro.runs,
 *      stripe_customer_id, stripe_subscription_id })
 *  - invoice.paid                -> renewal: find profile by customer id,
 *      reset credits to plans().pro.runs, set current_period_end
 *  - customer.subscription.deleted -> downgrade: plan "free", credits 0
 *      (keep stripe_customer_id so they can resubscribe)
 *  - anything else               -> "ignored"
 * Note: recordStripeEvent then a failure mid-handler would mark the event
 * processed without applying it. In SupabaseRepo, do both in one transaction
 * (an RPC), or delete the event row when the handler throws.
 */
export async function applyStripeEvent(event: Stripe.Event, repo: Repo): Promise<WebhookOutcome> {
  const first = await repo.recordStripeEvent(event.id, event.type);
  if (!first) return "duplicate";

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId) return "ignored";
      await repo.setPlan(userId, {
        plan: "pro",
        credits: plans().pro.runs,
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
        stripe_subscription_id:
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null),
      });
      return "processed";
    }
    // TODO(WS4): invoice.paid, customer.subscription.deleted
    default:
      return "ignored";
  }
}
