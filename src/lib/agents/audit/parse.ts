import type { ListingDraft } from "@/lib/contracts";

/**
 * Split a listing the seller pasted from Seller Central / TikTok Shop /
 * Shopify into fields, in code. Handles labeled pastes ("Title:", "About this
 * item", "Bullet 3:", "Description", "Search terms:", Chinese labels) and
 * unlabeled ones (first line = title, marked lines = bullets, rest =
 * description). When the result looks unreliable the audit pipeline asks a
 * fast model to structure it instead (agent.ts), and verifies that model's
 * fields against the pasted text.
 */
export interface ParsedListing {
  draft: ListingDraft;
  /** "low" when the paste had no recognizable structure. */
  confidence: "high" | "low";
}

type Section =
  "title" | "bullets" | "description" | "search_terms" | "seo_title" | "seo_description" | "tags";

const LABELS: { section: Section; re: RegExp }[] = [
  { section: "title", re: /^(?:product\s+|item\s+)?(?:title|name)\s*[:：]\s*(.*)$/i },
  { section: "title", re: /^(?:标题|商品名称|产品名称)\s*[:：]\s*(.*)$/ },
  {
    section: "bullets",
    re: /^(?:about this item|bullet points?|key (?:features|selling points)|selling points|highlights|features|五点描述|卖点|产品卖点)\s*[:：]?\s*(.*)$/i,
  },
  {
    section: "description",
    re: /^(?:product\s+)?description\s*[:：]?\s*(.*)$/i,
  },
  { section: "description", re: /^(?:商品描述|产品描述|描述)\s*[:：]?\s*(.*)$/ },
  {
    section: "search_terms",
    re: /^(?:search terms|backend (?:search )?(?:terms|keywords)|generic keywords|关键词|搜索词)\s*[:：]\s*(.*)$/i,
  },
  { section: "seo_title", re: /^(?:seo|page)\s+title\s*[:：]\s*(.*)$/i },
  { section: "seo_description", re: /^(?:meta|seo)\s+description\s*[:：]\s*(.*)$/i },
  { section: "tags", re: /^(?:tags|hashtags|标签)\s*[:：]\s*(.*)$/i },
];

const INLINE_BULLET =
  /^(?:bullet(?:\s+point)?|selling\s+point|highlight|卖点)\s*\d*\s*[:：]\s*(.+)$/i;
const BULLET_MARK = /^(?:[-•*·▪●◦✓✔➤►]\s*|\d{1,2}[.)、]\s+)/;

export function parseListingText(raw: string): ParsedListing {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out: Record<Section, string[]> = {
    title: [],
    bullets: [],
    description: [],
    search_terms: [],
    seo_title: [],
    seo_description: [],
    tags: [],
  };
  let section: Section | null = null;
  let sawLabel = false;

  for (const line of lines) {
    const inline = line.match(INLINE_BULLET);
    if (inline) {
      out.bullets.push(clean(inline[1]));
      section = "bullets";
      sawLabel = true;
      continue;
    }
    const label = LABELS.map((l) => ({ ...l, m: line.match(l.re) })).find((l) => l.m);
    if (label?.m) {
      section = label.section;
      sawLabel = true;
      const rest = clean(label.m[1] ?? "");
      if (rest) push(out, section, rest);
      continue;
    }
    if (BULLET_MARK.test(line)) {
      out.bullets.push(clean(line.replace(BULLET_MARK, "")));
      if (section !== "bullets" && section !== null) section = "description";
      continue;
    }
    if (/^#\S+(?:\s+#\S+)*$/.test(line)) {
      out.tags.push(...line.split(/\s+/).map((t) => t.replace(/^#/, "")));
      continue;
    }
    if (section === null) {
      // Unlabeled paste: the first line is the title, then free text is description.
      if (out.title.length === 0) {
        out.title.push(line);
        continue;
      }
      section = "description";
    }
    if (section === "title" && out.title.length > 0) section = "description";
    if (section === "bullets" && !sawLabel) section = "description";
    push(out, section, line);
  }

  const draft: ListingDraft = {
    title: out.title.join(" ").trim(),
    bullets: out.bullets.filter(Boolean),
    description: out.description.join("\n").trim(),
    search_terms: out.search_terms.join(" ").trim(),
    seo_title: out.seo_title.join(" ").trim(),
    seo_description: out.seo_description.join(" ").trim(),
    tags: [...new Set(out.tags.map((t) => t.trim()).filter(Boolean))],
  };

  const looksBroken =
    lines.length < 2 ||
    draft.title.length > 400 ||
    (draft.bullets.length === 0 && draft.description.length < 40);
  return { draft, confidence: looksBroken ? "low" : "high" };
}

function push(out: Record<Section, string[]>, section: Section, text: string) {
  if (section === "bullets") out.bullets.push(text);
  else if (section === "tags")
    out.tags.push(...text.split(/[,，\s]+/).map((t) => t.replace(/^#/, "")));
  else out[section].push(text);
}

function clean(s: string): string {
  return s.replace(/\s{2,}/g, " ").trim();
}

/** Whitespace-insensitive "is this text really in the paste?" check. */
export function appearsIn(source: string, fragment: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return !fragment.trim() || norm(source).includes(norm(fragment));
}
