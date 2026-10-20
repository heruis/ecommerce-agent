import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBilling } from "@/lib/billing";
import { getRepo } from "@/lib/db";
import { z } from "zod";
import { apiError, unauthorized, validationError } from "@/lib/http/responses";

const Body = z.object({ product: z.enum(["pro", "pack"]).default("pro") });

/**
 * Start checkout for Pro (subscription) or a credit pack (one-time).
 * Credits are granted later by the verified webhook, never here.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return validationError(parsed.error);
  await getRepo().ensureProfile(user);
  try {
    const { url } = await getBilling().createCheckoutSession(user, parsed.data.product);
    return NextResponse.json({ url });
  } catch (e) {
    return apiError(
      503,
      "billing_unavailable",
      e instanceof Error ? e.message : "Billing is unavailable.",
    );
  }
}
