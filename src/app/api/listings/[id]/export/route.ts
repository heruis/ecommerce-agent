import { Platform } from "@/lib/contracts";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { EXPORT_FORMATS, exportListing, type ExportFormat } from "@/lib/export";
import { apiError, notFound, unauthorized } from "@/lib/http/responses";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Download the report. ?format=md|json covers every channel;
 * ?format=csv|txt&platform=amazon_us is one marketplace's form fields.
 * Seller edits are included (re-checked against the rules).
 */
export async function GET(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const listing = await getRepo().getListing(user.id, id);
  if (!listing) return notFound("Listing");
  if (!listing.result) return apiError(409, "not_ready", "Generate the listing before exporting.");

  const params = new URL(req.url).searchParams;
  const format = (params.get("format") ?? "md") as ExportFormat;
  if (!EXPORT_FORMATS.includes(format)) {
    return apiError(400, "bad_format", `Use one of: ${EXPORT_FORMATS.join(", ")}.`);
  }
  const platform = Platform.safeParse(params.get("platform") ?? listing.result.platforms[0]);
  if (!platform.success || !listing.result.platforms.includes(platform.data)) {
    return apiError(400, "bad_platform", "That channel is not part of this listing.");
  }

  const file = exportListing(listing, format, platform.data);
  if (!file) return apiError(409, "not_ready", "Nothing to export for that channel.");
  const suffix = format === "csv" || format === "txt" ? `-${platform.data}` : "";
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="shelfpass-${id}${suffix}.${file.ext}"`,
    },
  });
}
