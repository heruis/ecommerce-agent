import { NextResponse } from "next/server";
import { z } from "zod";
import { ListingDraft, Platform } from "@/lib/contracts";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { allText, scanClaims } from "@/lib/guardrails";
import { apiError, notFound, readJson, unauthorized, validationError } from "@/lib/http/responses";
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

const EditBody = z.object({ platform: Platform, listing: ListingDraft });

/**
 * Save the seller's edits for one channel (stage 6: revision). Every save is
 * re-validated against that channel's rules and re-screened for risky claims,
 * so an edit cannot quietly reintroduce "FDA approved".
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const parsed = EditBody.safeParse(await readJson(req));
  if (!parsed.success) return validationError(parsed.error);
  const { platform, listing: draft } = parsed.data;

  const repo = getRepo();
  const listing = await repo.getListing(user.id, id);
  if (!listing) return notFound("Listing");
  if (!listing.result?.platforms.includes(platform)) {
    return apiError(400, "bad_platform", "That channel is not part of this listing.");
  }

  const validation = validateListing(draft, platform, { brand: listing.input.brand });
  const risky = scanClaims(allText(draft), listing.input.evidence)
    .filter((h) => h.status !== "verified")
    .map((h) => ({ phrase: h.match, status: h.status, guidance: h.rule.guidance }));

  const saved = await repo.saveEdits(user.id, id, platform, draft);
  return NextResponse.json({ listing: saved, validation, risky_claims: risky });
}
