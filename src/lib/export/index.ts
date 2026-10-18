import type { ListingDraft } from "@/lib/contracts";

/**
 * Export formats. Owner: WS3.
 * CSV columns follow the names used in Amazon's listing templates so sellers
 * can paste values across; it is not a complete flat file.
 */
export type ExportFormat = "csv" | "json" | "txt";

export function exportListing(
  listing: ListingDraft,
  format: ExportFormat,
): { body: string; contentType: string; ext: string } {
  switch (format) {
    case "json":
      return {
        body: JSON.stringify(listing, null, 2),
        contentType: "application/json",
        ext: "json",
      };
    case "txt":
      return { body: toText(listing), contentType: "text/plain; charset=utf-8", ext: "txt" };
    case "csv":
    default:
      return { body: toCsv(listing), contentType: "text/csv; charset=utf-8", ext: "csv" };
  }
}

export function toCsv(l: ListingDraft): string {
  const headers = [
    "item_name",
    "bullet_point1",
    "bullet_point2",
    "bullet_point3",
    "bullet_point4",
    "bullet_point5",
    "product_description",
    "generic_keywords",
  ];
  const bullets = Array.from({ length: 5 }, (_, i) => l.bullets[i] ?? "");
  const row = [l.title, ...bullets, l.description, l.search_terms];
  return `${headers.join(",")}\n${row.map(csvCell).join(",")}\n`;
}

export function toText(l: ListingDraft): string {
  return [
    `TITLE\n${l.title}`,
    `BULLET POINTS\n${l.bullets.map((b) => `• ${b}`).join("\n")}`,
    `DESCRIPTION\n${l.description}`,
    `SEARCH TERMS\n${l.search_terms}`,
  ].join("\n\n");
}

function csvCell(v: string): string {
  // Neutralize spreadsheet formula injection, then quote.
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}
