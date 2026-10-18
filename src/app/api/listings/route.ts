import { NextResponse } from "next/server";
import { ProductInput } from "@/lib/contracts";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { screenInput } from "@/lib/guardrails";
import { apiError, readJson, unauthorized, validationError } from "@/lib/http/responses";

/** List the signed-in user's listings. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const repo = getRepo();
  await repo.ensureProfile(user);
  return NextResponse.json({ listings: await repo.listListings(user.id) });
}

/** Create a listing draft from the seller's product input. Running it is a separate call. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const parsed = ProductInput.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);
  // Layer 1 guardrail at the door: blocked input never costs the seller a run.
  const screen = screenInput(parsed.data);
  if (screen.blocked)
    return apiError(422, "guardrail_blocked", screen.reason ?? "This input cannot be processed.");
  const repo = getRepo();
  await repo.ensureProfile(user);
  const listing = await repo.createListing(user.id, parsed.data);
  return NextResponse.json({ id: listing.id }, { status: 201 });
}
