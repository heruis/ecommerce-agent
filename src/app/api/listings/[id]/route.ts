import { NextResponse } from "next/server";
import { ListingDraft } from "@/lib/contracts";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { scanClaims } from "@/lib/guardrails";
import { notFound, readJson, unauthorized, validationError } from "@/lib/http/responses";
import { validateListing } from "@/lib/rules";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const listing = await getRepo().getListing(user.id, id);
  if (!listing) return notFound("Listing");
  return NextResponse.json({ listing });
}

/**
 * Save the seller's edits (stage 6: revision). Every save is re-validated
 * against platform rules and re-screened for risky claims, so an edit cannot
 * quietly reintroduce "FDA approved".
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const parsed = ListingDraft.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);

  const repo = getRepo();
  const listing = await repo.getListing(user.id, id);
  if (!listing) return notFound("Listing");

  const validation = validateListing(parsed.data, listing.input.platform, {
    brand: listing.input.brand,
  });
  const text = [
    parsed.data.title,
    ...parsed.data.bullets,
    parsed.data.description,
    parsed.data.search_terms,
  ].join("\n");
  const risky = scanClaims(text, listing.input.evidence)
    .filter((h) => h.status !== "verified")
    .map((h) => ({ phrase: h.match, status: h.status, guidance: h.rule.guidance }));

  const saved = await repo.saveEdits(user.id, id, parsed.data);
  return NextResponse.json({ listing: saved, validation, risky_claims: risky });
}
