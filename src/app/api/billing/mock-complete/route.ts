import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { grantPack, startPro } from "@/lib/billing";
import { getRepo } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError, readJson, unauthorized, validationError } from "@/lib/http/responses";

const Body = z.object({ product: z.enum(["pro", "pack"]).default("pro") });

/**
 * BILLING_MODE=mock only: simulate a successful checkout, using the same
 * credit rules as the Stripe webhook (lib/billing/credits.ts).
 */
export async function POST(req: Request) {
  if (env().BILLING_MODE !== "mock") return apiError(404, "not_found", "Not available.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const parsed = Body.safeParse((await readJson(req)) ?? {});
  if (!parsed.success) return validationError(parsed.error);

  const repo = getRepo();
  const profile = await repo.ensureProfile(user);
  if (parsed.data.product === "pack") {
    await grantPack(repo, user.id);
  } else {
    if (profile.plan === "pro") return apiError(409, "already_pro", "You're already on Pro.");
    await startPro(repo, user.id, profile.credits_remaining, {
      stripe_customer_id: `cus_mock_${user.id}`,
      current_period_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });
  }
  return NextResponse.json({ ok: true });
}
