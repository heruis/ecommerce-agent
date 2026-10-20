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
 * can never add credits twice. If a handler throws, the event record is
 * released so Stripe's retry is applied instead of being skipped.
 *
 *  - checkout.session.completed    -> upgrade to Pro, set the monthly credits
 *  - invoice.paid                  -> renewal: reset the monthly credits
 *  - customer.subscription.deleted -> downgrade to Free with 0 credits
 *  - anything else                 -> "ignored"
 */
export async function applyStripeEvent(event: Stripe.Event, repo: Repo): Promise<WebhookOutcome> {
  const first = await repo.recordStripeEvent(event.id, event.type);
  if (!first) return "duplicate";
  try {
    return await handle(event, repo);
  } catch (e) {
    await repo.releaseStripeEvent(event.id);
    throw e;
  }
}

async function handle(event: Stripe.Event, repo: Repo): Promise<WebhookOutcome> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId || !(await repo.getProfile(userId))) return "ignored";
      await repo.setPlan(userId, {
        plan: "pro",
        credits: plans().pro.credits,
        stripe_customer_id: idOf(session.customer),
        stripe_subscription_id: idOf(session.subscription),
      });
      return "processed";
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customer = idOf(invoice.customer);
      const profile = customer ? await repo.getProfileByStripeCustomer(customer) : null;
      if (!profile) return "ignored"; // first invoice can arrive before checkout completes
      const periodEnd = invoice.lines?.data?.[0]?.period?.end;
      await repo.setPlan(profile.id, {
        plan: "pro",
        credits: plans().pro.credits,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      });
      return "processed";
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = idOf(sub.customer);
      const profile = customer ? await repo.getProfileByStripeCustomer(customer) : null;
      if (!profile) return "ignored";
      // Keep stripe_customer_id so they can resubscribe with the same customer.
      await repo.setPlan(profile.id, {
        plan: "free",
        credits: 0,
        stripe_subscription_id: null,
        current_period_end: null,
      });
      return "processed";
    }
    default:
      return "ignored";
  }
}

function idOf(x: string | { id: string } | null | undefined): string | null {
  if (!x) return null;
  return typeof x === "string" ? x : x.id;
}
