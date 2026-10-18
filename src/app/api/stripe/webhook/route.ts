import { NextResponse } from "next/server";
import { applyStripeEvent } from "@/lib/billing";
import { stripeClient } from "@/lib/billing/stripe";
import { getRepo } from "@/lib/db";
import { env, requireEnv } from "@/lib/env";
import { apiError } from "@/lib/http/responses";

/**
 * Stripe webhook. The signature is verified against the RAW body before
 * anything is trusted; then applyStripeEvent() updates the plan idempotently.
 * Owner: WS4.
 */
export async function POST(req: Request) {
  if (env().BILLING_MODE !== "stripe")
    return apiError(404, "not_found", "Stripe billing is not enabled.");
  const signature = req.headers.get("stripe-signature");
  if (!signature) return apiError(400, "missing_signature", "Missing Stripe signature.");

  const body = await req.text();
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      body,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET", "Stripe webhooks"),
    );
  } catch {
    return apiError(400, "bad_signature", "Invalid Stripe signature.");
  }

  try {
    const outcome = await applyStripeEvent(event, getRepo());
    return NextResponse.json({ received: true, outcome });
  } catch (e) {
    // 500 makes Stripe retry later; idempotency makes the retry safe.
    console.error("stripe webhook failed", event.type, e);
    return apiError(500, "webhook_failed", "Webhook handling failed.");
  }
}
