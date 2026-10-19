import type { Listing, Platform } from "@/lib/contracts";
import { channelView, channelViews, reportMarkdown } from "@/lib/report";
import { platformLabel } from "@/lib/rules";

/**
 * Export formats. Owner: WS3.
 *  - csv / txt: one marketplace's "add product" form, field by field. CSV
 *    columns use that form's field keys (Amazon's match its listing template
 *    names) so values can be pasted across; it is not a complete flat file.
 *  - json: every channel's fields and listing copy.
 *  - md: the full report (keywords, photos, fields, claim review).
 */
export const EXPORT_FORMATS = ["csv", "txt", "json", "md"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export interface ExportFile {
  body: string;
  contentType: string;
  ext: string;
}

export function exportListing(
  listing: Listing,
  format: ExportFormat,
  platform?: Platform,
): ExportFile | null {
  switch (format) {
    case "md":
      return {
        body: reportMarkdown(listing),
        contentType: "text/markdown; charset=utf-8",
        ext: "md",
      };
    case "json":
      return {
        body: JSON.stringify(
          channelViews(listing).map((c) => ({
            platform: c.platform,
            edited: c.edited,
            fields: c.fields,
            listing: c.listing,
          })),
          null,
          2,
        ),
        contentType: "application/json",
        ext: "json",
      };
    case "txt":
    case "csv": {
      const view = channelView(listing, platform ?? listing.result?.platforms[0] ?? "amazon_us");
      if (!view) return null;
      const rows = view.fields.map((f) => ({ key: f.key, label: f.label, value: f.value }));
      return format === "csv"
        ? { body: toCsv(rows), contentType: "text/csv; charset=utf-8", ext: "csv" }
        : {
            body: toText(platformLabel(view.platform), rows),
            contentType: "text/plain; charset=utf-8",
            ext: "txt",
          };
    }
  }
}

interface Row {
  key: string;
  label: string;
  value: string;
}

/** Header row = form field keys, one data row = values. */
export function toCsv(rows: Row[]): string {
  return `${rows.map((r) => csvCell(r.key)).join(",")}\n${rows.map((r) => csvCell(r.value)).join(",")}\n`;
}

export function toText(channel: string, rows: Row[]): string {
  return [
    channel.toUpperCase(),
    ...rows.map((r) => `${r.label.toUpperCase()}\n${r.value || "(fill in yourself)"}`),
  ].join("\n\n");
}

function csvCell(v: string): string {
  // Neutralize spreadsheet formula injection, then quote.
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}
