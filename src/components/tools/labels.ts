import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";

/** "Title", "Bullet 3", "Search terms"... for a listing field. */
export function fieldLabel(t: Dictionary["tools"], field: string, index: number | null): string {
  if (field === "bullets" && index !== null) return fmt(t.fields.bullet, { n: index + 1 });
  return (t.fields as Record<string, string>)[field] ?? field;
}

/** The fixed listing as plain text, ready to paste field by field. */
export function listingAsText(
  t: Dictionary["tools"],
  l: {
    title: string;
    bullets: string[];
    description: string;
    search_terms: string;
    seo_title: string;
    seo_description: string;
    tags: string[];
  },
): string {
  const parts: string[] = [`${t.fields.title}\n${l.title}`];
  l.bullets.forEach((b, i) => parts.push(`${fmt(t.fields.bullet, { n: i + 1 })}\n${b}`));
  parts.push(`${t.fields.description}\n${l.description}`);
  if (l.search_terms) parts.push(`${t.fields.search_terms}\n${l.search_terms}`);
  if (l.seo_title) parts.push(`${t.fields.seo_title}\n${l.seo_title}`);
  if (l.seo_description) parts.push(`${t.fields.seo_description}\n${l.seo_description}`);
  if (l.tags.length) parts.push(`${t.fields.tags}\n${l.tags.join(", ")}`);
  return parts.join("\n\n");
}
