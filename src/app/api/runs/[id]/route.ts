import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { notFound, unauthorized } from "@/lib/http/responses";

type Ctx = { params: Promise<{ id: string }> };

/** Trace for one pipeline run (spans, usage). Owner-only. */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const run = await getRepo().getRun(user.id, id);
  if (!run) return notFound("Run");
  return NextResponse.json({ run });
}
