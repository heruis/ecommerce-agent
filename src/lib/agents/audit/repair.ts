import type { ListingDraft, ListingField, Platform } from "@/lib/contracts";
import { rulesFor } from "@/lib/rules";

/**
 * Deterministic repairs for platform rule errors (Module 1: "use normal
 * programs for counting"). Runs after the fix agent as a backstop, and is
 * the whole fix in mock mode. It shortens at word / phrase / sentence
 * boundaries — never mid-word — and only touches fields that break a rule.
 */
export interface RepairNote {
  field: ListingField;
  index: number | null;
  reason: string;
}

const CJK_RUN = /[　-〿一-鿿＀-￯]+/g;
const EMOJI = /\p{Extended_Pictographic}️?/gu;
const URL = /\b(?:https?:\/\/|www\.)\S+/gi;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "of",
  "to",
  "in",
  "on",
  "by",
  "at",
  "from",
]);

export function repairRules(
  listing: ListingDraft,
  platform: Platform,
  opts: { brand?: string } = {},
): { listing: ListingDraft; notes: RepairNote[] } {
  const r = rulesFor(platform);
  const notes: RepairNote[] = [];
  const note = (field: ListingField, index: number | null, reason: string) =>
    notes.push({ field, index, reason });

  // Each repair runs only when its rule is broken, so valid text stays byte-identical.
  const scrub = (text: string, field: ListingField, index: number | null) => {
    let out = text;
    const cleaned = out.replace(URL, "").replace(EMAIL, "").replace(EMOJI, "");
    if (cleaned !== out) {
      out = tidy(cleaned);
      note(field, index, "Removed links, contact details or emojis.");
    }
    const noCjk = out.replace(CJK_RUN, " ");
    if (noCjk !== out) {
      out = tidy(noCjk);
      note(field, index, "Removed untranslated Chinese text.");
    }
    return out;
  };

  // ---- title -----------------------------------------------------------
  let title = scrub(listing.title, "title", null);
  for (const ch of r.title.bannedChars) {
    if (title.includes(ch) && !(opts.brand ?? "").includes(ch)) {
      title = tidy(title.split(ch).join(" "));
      note("title", null, `Removed the character "${ch}", which ${r.label} does not allow.`);
    }
  }
  if (hasRepeats(title, r.title.maxWordRepeats)) {
    title = dropRepeats(title, r.title.maxWordRepeats);
    note("title", null, `Removed repeated words (max ${r.title.maxWordRepeats} each).`);
  }
  if (title.length > r.title.maxChars) {
    title = shorten(title, r.title.maxChars);
    note("title", null, `Shortened to ${r.label}'s ${r.title.maxChars}-character limit.`);
  }

  // ---- bullets -----------------------------------------------------------
  const bullets = listing.bullets.map((b, i) => {
    let out = scrub(b, "bullets", i);
    if (out.length > r.bullets.maxChars) {
      out = shorten(out, r.bullets.maxChars);
      note("bullets", i, `Shortened to the ${r.bullets.maxChars}-character limit.`);
    }
    return out;
  });

  // ---- description ---------------------------------------------------------
  let description = scrub(listing.description, "description", null);
  if (description.length > r.description.maxChars) {
    description = shorten(description, r.description.maxChars);
    note("description", null, `Shortened to the ${r.description.maxChars}-character limit.`);
  }

  // ---- search terms ---------------------------------------------------------
  let search_terms = scrub(listing.search_terms, "search_terms", null);
  if (r.searchTerms) {
    const max = r.searchTerms.maxBytes;
    if (bytes(search_terms) > max) {
      const kept: string[] = [];
      for (const w of search_terms.split(/\s+/)) {
        if (bytes([...kept, w].join(" ")) > max) break;
        kept.push(w);
      }
      search_terms = kept.join(" ");
      note("search_terms", null, `Trimmed to ${max} bytes.`);
    }
  }

  // ---- Shopify SEO ---------------------------------------------------------
  let seo_title = scrub(listing.seo_title, "seo_title", null);
  let seo_description = scrub(listing.seo_description, "seo_description", null);
  if (r.seo) {
    if (seo_title.length > r.seo.titleMax) {
      seo_title = shorten(seo_title, r.seo.titleMax);
      note("seo_title", null, `Shortened to ${r.seo.titleMax} characters.`);
    }
    if (seo_description.length > r.seo.descriptionMax) {
      seo_description = shorten(seo_description, r.seo.descriptionMax);
      note("seo_description", null, `Shortened to ${r.seo.descriptionMax} characters.`);
    }
  }

  const tags = listing.tags.map((t, i) => scrub(t, "tags", i)).filter(Boolean);

  return {
    listing: { title, bullets, description, search_terms, seo_title, seo_description, tags },
    notes: dedupeNotes(notes),
  };
}

/** Cut at the last phrase, sentence or word boundary that fits; never mid-word. */
export function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max + 1);
  for (const sep of [". ", "; ", ", ", " - ", " – ", " | ", " "]) {
    const at = head.lastIndexOf(sep);
    if (at >= max * 0.5) return tidy(text.slice(0, sep === ". " ? at + 1 : at));
  }
  return tidy(text.slice(0, max));
}

function hasRepeats(title: string, maxRepeats: number): boolean {
  const counts = new Map<string, number>();
  for (const part of title.toLowerCase().split(/[\s,/|]+/)) {
    const w = part.replace(/[^a-z0-9-]/g, "");
    if (!w || STOPWORDS.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n > maxRepeats);
}

function dropRepeats(title: string, maxRepeats: number): string {
  const seen = new Map<string, number>();
  const words = title.split(/(\s+)/);
  const kept = words.filter((part) => {
    const w = part.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!w || STOPWORDS.has(w)) return true;
    const n = (seen.get(w) ?? 0) + 1;
    seen.set(w, n);
    return n <= maxRepeats;
  });
  return tidy(kept.join(""));
}

function bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

function tidy(s: string): string {
  return s
    .replace(/\s+([,.;:!?)])/g, "$1")
    .replace(/([,;:])\s*([,;:.])/g, "$2")
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*,\s*$/, "")
    .trim();
}

function dedupeNotes(notes: RepairNote[]): RepairNote[] {
  const seen = new Set<string>();
  return notes.filter((n) => {
    const k = `${n.field}:${n.index}:${n.reason}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
