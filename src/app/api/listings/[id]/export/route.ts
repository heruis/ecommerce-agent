import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { exportListing, type ExportFormat } from "@/lib/export";
import { apiError, notFound, unauthorized } from "@/lib/http/responses";

type Ctx = { params: Promise<{ id: string }> };

/** Download the seller's edited listing (or the generated one) as CSV, JSON or text. */
export async function GET(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const listing = await getRepo().getListing(user.id, id);
  if (!listing) return notFound("Listing");
  const draft = listing.edited ?? listing.result?.listing;
  if (!draft) return apiError(409, "not_ready", "Generate the listing before exporting.");

  const format = (new URL(req.url).searchParams.get("format") ?? "csv") as ExportFormat;
  if (!["csv", "json", "txt"].includes(format))
    return apiError(400, "bad_format", "Use csv, json or txt.");
  const file = exportListing(draft, format);
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="listwise-${id}.${file.ext}"`,
    },
  });
}
