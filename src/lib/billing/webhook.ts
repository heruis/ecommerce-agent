import type Stripe from "stripe";
import type { Repo } from "@/lib/contracts";
import { endPro, grantPack, renewPro, startPro } from "./credits";

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
 *  - checkout.session.completed, mode "payment", product "pack", paid
 *                                  -> add the credit pack
 *  - checkout.session.completed, subscription
 *                                  -> start Pro, add the monthly credits
 *  - invoice.paid                  -> renewal: top up to the monthly credits
 *  - customer.subscription.deleted -> back to Free, balance kept
 *  - anything else                 -> "ignored"
 * Credit rules live in credits.ts.
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
      const profile = userId ? await repo.getProfile(userId) : null;
      if (!userId || !profile) return "ignored";
      if (session.mode === "payment") {
        // One-time purchase: only our credit pack, and only once the money is in.
        if (session.metadata?.product !== "pack" || session.payment_status !== "paid") {
          return "ignored";
        }
        await grantPack(repo, userId);
        return "processed";
      }
      await startPro(repo, userId, profile.credits_remaining, {
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
      await renewPro(
        repo,
        profile.id,
        profile.credits_remaining,
        periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      );
      return "processed";
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customer = idOf(sub.customer);
      const profile = customer ? await repo.getProfileByStripeCustomer(customer) : null;
      if (!profile) return "ignored";
      await endPro(repo, profile.id, profile.credits_remaining);
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
