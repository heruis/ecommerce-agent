import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getBilling } from "@/lib/billing";
import { CheckoutRefused } from "@/lib/billing/errors";
import { getRepo } from "@/lib/db";
import { apiError, readJson, unauthorized, validationError } from "@/lib/http/responses";

const Body = z.object({ product: z.enum(["pro", "pack"]).default("pro") });

/**
 * Start checkout for Pro (subscription) or a credit pack (one-time).
 * Credits are granted later by the verified webhook, never here.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse((await readJson(req)) ?? {});
  if (!parsed.success) return validationError(parsed.error);
  const { product } = parsed.data;

  const profile = await getRepo().ensureProfile(user);
  if (product === "pro" && profile.plan === "pro") {
    return apiError(409, "already_pro", "You're already on Pro. Manage it from the billing page.");
  }
  try {
    const { url } = await getBilling().createCheckoutSession(user, product);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof CheckoutRefused) return apiError(409, "checkout_refused", e.message);
    // Configuration or Stripe errors stay in the server log, not in the UI.
    console.error("checkout failed", product, e);
    return apiError(503, "billing_unavailable", "Checkout is unavailable right now.");
  }
}
