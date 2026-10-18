import "server-only";
import Stripe from "stripe";
import type { BillingProvider, SessionUser } from "@/lib/contracts";
import { requireEnv } from "@/lib/env";

export function stripeClient(): Stripe {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY", "BILLING_MODE=stripe"));
}

/**
 * BILLING_MODE=stripe — Stripe Checkout (subscription) + Customer Portal.
 *
 * TODO(WS4): implement.
 *  createCheckoutSession:
 *    stripe.checkout.sessions.create({
 *      mode: "subscription",
 *      line_items: [{ price: STRIPE_PRICE_ID_PRO, quantity: 1 }],
 *      customer: profile.stripe_customer_id ?? undefined,
 *      customer_email: profile.stripe_customer_id ? undefined : user.email,
 *      client_reference_id: user.id,          // links the payment to our user
 *      metadata: { user_id: user.id },
 *      subscription_data: { metadata: { user_id: user.id } },
 *      success_url: `${APP_URL}/billing?checkout=success`,
 *      cancel_url: `${APP_URL}/billing?checkout=cancelled`,
 *    })
 *  createPortalSession: stripe.billingPortal.sessions.create({ customer, return_url })
 *  Never grant credits here: only the verified webhook does (see webhook.ts).
 */
export class StripeBilling implements BillingProvider {
  async createCheckoutSession(user: SessionUser): Promise<{ url: string }> {
    void user;
    throw new Error(
      "StripeBilling.createCheckoutSession is not implemented yet (WS4). Use BILLING_MODE=mock.",
    );
  }
  async createPortalSession(user: SessionUser): Promise<{ url: string }> {
    void user;
    throw new Error(
      "StripeBilling.createPortalSession is not implemented yet (WS4). Use BILLING_MODE=mock.",
    );
  }
}
