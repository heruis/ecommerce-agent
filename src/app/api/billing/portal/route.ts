import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBilling } from "@/lib/billing";
import { apiError, unauthorized } from "@/lib/http/responses";

/** Open the Stripe customer portal (manage or cancel the subscription). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const { url } = await getBilling().createPortalSession(user);
    return NextResponse.json({ url });
  } catch (e) {
    return apiError(
      503,
      "billing_unavailable",
      e instanceof Error ? e.message : "Billing is unavailable.",
    );
  }
}
