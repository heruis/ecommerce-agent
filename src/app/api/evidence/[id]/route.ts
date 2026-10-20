import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { apiError, notFound, unauthorized } from "@/lib/http/responses";
import { rateLimit } from "@/lib/platform/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

/** Delete one of the seller's own documents. Another user's id is simply "not found". */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const limit = rateLimit(`evidence:${user.id}`, 30, 60_000);
  if (!limit.ok) {
    return apiError(429, "rate_limited", "Too many changes at once. Try again in a minute.");
  }
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return notFound("Document");
  const deleted = await getRepo().deleteEvidence(user.id, id);
  if (!deleted) return notFound("Document");
  return NextResponse.json({ ok: true });
}
