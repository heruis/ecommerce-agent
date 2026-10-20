import "server-only";
import Stripe from "stripe";
import type { BillingProduct, BillingProvider, Repo, SessionUser } from "@/lib/contracts";
import { getRepo } from "@/lib/db";
import { appUrl, requireEnv } from "@/lib/env";
import { CheckoutRefused } from "./errors";
import { plans } from "./plans";

export function stripeClient(): Stripe {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY", "BILLING_MODE=stripe"));
}

/**
 * Optional Stripe price for the credit pack. Without it, checkout uses inline
 * price_data, so packs need no extra setup in the Stripe dashboard.
 */
export function packPriceId(): string | null {
  const id = process.env.STRIPE_PRICE_ID_PACK?.trim();
  return id ? id : null;
}

/**
 * BILLING_MODE=stripe — Stripe Checkout for the Pro subscription and the
 * one-time credit pack, plus the Customer Portal. Never grants credits: only
 * the verified webhook does (see webhook.ts). Use test-mode keys (sk_test_...)
 * for the capstone demo.
 */
export class StripeBilling implements BillingProvider {
  constructor(
    private readonly stripe: Stripe = stripeClient(),
    private readonly repo: Repo = getRepo(),
  ) {}

  async createCheckoutSession(
    user: SessionUser,
    product: BillingProduct = "pro",
  ): Promise<{ url: string }> {
    const profile = await this.repo.ensureProfile(user);
    const customer = profile.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : user.email
        ? { customer_email: user.email }
        : {};
    const p = plans();

    if (product === "pack") {
      const price = packPriceId();
      const metadata = { user_id: user.id, product: "pack", credits: String(p.pack.credits) };
      const session = await this.stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          price
            ? { price, quantity: 1 }
            : {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: Math.round(p.pack.priceUsd * 100),
                  product_data: {
                    name: "ShelfPass credit pack",
                    description: `${p.pack.credits} credits for reports, audits and takedown help. Credits never expire.`,
                  },
                },
              },
        ],
        ...customer,
        // Links the payment back to our user in the webhook.
        client_reference_id: user.id,
        metadata,
        payment_intent_data: { metadata },
        success_url: `${appUrl()}/billing?checkout=success&product=pack`,
        cancel_url: `${appUrl()}/pricing?checkout=cancelled`,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return { url: session.url };
    }

    if (profile.plan === "pro") {
      throw new CheckoutRefused("You're already on Pro. Manage it from the billing page.");
    }
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: requireEnv("STRIPE_PRICE_ID_PRO", "Stripe checkout"), quantity: 1 }],
      ...customer,
      client_reference_id: user.id,
      metadata: { user_id: user.id, product: "pro" },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${appUrl()}/billing?checkout=success&product=pro`,
      cancel_url: `${appUrl()}/pricing?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  }

  async createPortalSession(user: SessionUser): Promise<{ url: string }> {
    const profile = await this.repo.ensureProfile(user);
    if (!profile.stripe_customer_id)
      throw new CheckoutRefused("You do not have a subscription yet.");
    const session = await this.stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl()}/billing`,
    });
    return { url: session.url };
  }

  /** Account deletion: stop future charges before the data goes. */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (e) {
      // Already cancelled or deleted in Stripe: nothing left to stop.
      if ((e as { code?: string }).code === "resource_missing") return;
      throw e;
    }
  }
}
