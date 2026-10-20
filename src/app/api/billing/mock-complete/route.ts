import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { plans } from "@/lib/billing";
import { getRepo } from "@/lib/db";
import { env } from "@/lib/env";
import { apiError, unauthorized } from "@/lib/http/responses";

/** BILLING_MODE=mock only: simulate a successful Pro checkout. */
export async function POST() {
  if (env().BILLING_MODE !== "mock") return apiError(404, "not_found", "Not available.");
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const repo = getRepo();
  await repo.ensureProfile(user);
  await repo.setPlan(user.id, {
    plan: "pro",
    credits: plans().pro.credits,
    stripe_customer_id: `cus_mock_${user.id}`,
    current_period_end: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });
  return NextResponse.json({ ok: true });
}
