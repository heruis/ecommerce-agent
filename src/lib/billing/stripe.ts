import "server-only";
import Stripe from "stripe";
import type { BillingProvider, Repo, SessionUser } from "@/lib/contracts";
import { getRepo } from "@/lib/db";
import { appUrl, requireEnv } from "@/lib/env";

export function stripeClient(): Stripe {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY", "BILLING_MODE=stripe"));
}

/**
 * BILLING_MODE=stripe — Stripe Checkout (subscription) + Customer Portal.
 * Never grants credits: only the verified webhook does (see webhook.ts).
 * Use test-mode keys (sk_test_...) for the capstone demo.
 */
export class StripeBilling implements BillingProvider {
  constructor(
    private readonly stripe: Stripe = stripeClient(),
    private readonly repo: Repo = getRepo(),
  ) {}

  async createCheckoutSession(user: SessionUser): Promise<{ url: string }> {
    const profile = await this.repo.ensureProfile(user);
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: requireEnv("STRIPE_PRICE_ID_PRO", "Stripe checkout"), quantity: 1 }],
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      // Links the payment back to our user in the webhook.
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${appUrl()}/billing?checkout=success`,
      cancel_url: `${appUrl()}/billing?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  }

  async createPortalSession(user: SessionUser): Promise<{ url: string }> {
    const profile = await this.repo.ensureProfile(user);
    if (!profile.stripe_customer_id) throw new Error("You do not have a subscription yet.");
    const session = await this.stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl()}/billing`,
    });
    return { url: session.url };
  }
}
