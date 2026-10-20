import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { notFound, unauthorized } from "@/lib/http/responses";

type Ctx = { params: Promise<{ id: string }> };

/** One appeal analysis, owner only. */
export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const run = await getRepo().getToolRun(user.id, id);
  if (!run || run.kind !== "appeal") return notFound("Appeal");
  return NextResponse.json({ run });
}
