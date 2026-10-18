import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBilling } from "@/lib/billing";
import { getRepo } from "@/lib/db";
import { apiError, unauthorized } from "@/lib/http/responses";

/** Start a Pro subscription checkout. Credits are granted later by the webhook, never here. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  await getRepo().ensureProfile(user);
  try {
    const { url } = await getBilling().createCheckoutSession(user);
    return NextResponse.json({ url });
  } catch (e) {
    return apiError(
      503,
      "billing_unavailable",
      e instanceof Error ? e.message : "Billing is unavailable.",
    );
  }
}
