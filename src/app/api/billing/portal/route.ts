import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBilling } from "@/lib/billing";
import { CheckoutRefused } from "@/lib/billing/errors";
import { apiError, unauthorized } from "@/lib/http/responses";

/** Open the Stripe customer portal (update card, invoices, cancel). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { url } = await getBilling().createPortalSession(user);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof CheckoutRefused) return apiError(409, "no_subscription", e.message);
    console.error("billing portal failed", e);
    return apiError(503, "billing_unavailable", "The billing portal is unavailable right now.");
  }
}
