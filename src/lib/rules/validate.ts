import type {
  ListingDraft,
  ListingField,
  Platform,
  RuleViolation,
  ValidationReport,
} from "@/lib/contracts";
import { rulesFor } from "./registry";

/**
 * Deterministic platform checks. Plain code, not an LLM: length limits,
 * banned characters and phrases must be exact (course Module 1: "use normal
 * programs for counting and JSON checks"). The localization agent calls this
 * as its `check_listing` tool and rewrites until it passes — never truncates.
 */
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
  "&",
  "-",
  "–",
  "|",
  ",",
]);
const ACRONYMS = new Set([
  "BPA",
  "USB",
  "LED",
  "FDA",
  "SGS",
  "LFGB",
  "USA",
  "UV",
  "PU",
  "TPU",
  "PVC",
  "ABS",
  "XL",
  "XXL",
]);

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const HTML_RE = /<\/?[a-z][^>]*>/i;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

export function validateListing(
  draft: ListingDraft,
  platform: Platform,
  opts: { brand?: string } = {},
): ValidationReport {
  const rules = rulesFor(platform);
  const v: RuleViolation[] = [];
  const add = (
    rule_id: string,
    field: ListingField,
    severity: RuleViolation["severity"],
    message: string,
    index: number | null = null,
  ) => v.push({ rule_id, field, index, severity, message });

  // ---- title -------------------------------------------------------------
  const title = draft.title.trim();
  if (title.length === 0) add("title.required", "title", "error", "Title is empty.");
  if (title.length > rules.title.maxChars) {
    add(
      "title.max_chars",
      "title",
      "error",
      `Title is ${title.length} characters; limit is ${rules.title.maxChars}. Rewrite it shorter, keep the key attributes.`,
    );
  }
  const brand = opts.brand ?? "";
  for (const ch of rules.title.bannedChars) {
    if (title.includes(ch) && !brand.includes(ch)) {
      add(
        "title.banned_char",
        "title",
        "error",
        `Title contains the character "${ch}", which is not allowed.`,
      );
    }
  }
  const counts = new Map<string, number>();
  for (const word of title.toLowerCase().split(/[\s,/|]+/)) {
    const w = word.replace(/[^a-z0-9-]/g, "");
    if (!w || STOPWORDS.has(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  for (const [word, n] of counts) {
    if (n > rules.title.maxWordRepeats) {
      add(
        "title.word_repeat",
        "title",
        "error",
        `"${word}" appears ${n} times in the title; max ${rules.title.maxWordRepeats}.`,
      );
    }
  }
  const shouty = title
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 3 &&
        w === w.toUpperCase() &&
        /[A-Z]/.test(w) &&
        !ACRONYMS.has(w.replace(/[^A-Z]/g, "")),
    );
  if (shouty.length > 0) {
    add(
      "title.all_caps",
      "title",
      "warning",
      `Avoid ALL-CAPS words in the title: ${shouty.slice(0, 3).join(", ")}.`,
    );
  }

  // ---- bullets -----------------------------------------------------------
  if (draft.bullets.length === 0) {
    add("bullets.required", "bullets", "error", "At least one bullet point is required.");
  } else if (draft.bullets.length !== rules.bullets.expected) {
    add(
      "bullets.count",
      "bullets",
      draft.bullets.length > rules.bullets.expected ? "error" : "warning",
      `Use exactly ${rules.bullets.expected} bullet points (found ${draft.bullets.length}).`,
    );
  }
  draft.bullets.forEach((b, i) => {
    if (b.trim().length === 0)
      add("bullets.empty", "bullets", "error", `Bullet ${i + 1} is empty.`, i);
    if (b.length > rules.bullets.maxChars) {
      add(
        "bullets.max_chars",
        "bullets",
        "error",
        `Bullet ${i + 1} is ${b.length} characters; limit is ${rules.bullets.maxChars}.`,
        i,
      );
    } else if (b.length > rules.bullets.recommendedMaxChars) {
      add(
        "bullets.recommended_chars",
        "bullets",
        "warning",
        `Bullet ${i + 1} is ${b.length} characters; under ${rules.bullets.recommendedMaxChars} reads better on mobile.`,
        i,
      );
    }
  });

  // ---- description -------------------------------------------------------
  const desc = draft.description.trim();
  if (desc.length > rules.description.maxChars) {
    add(
      "description.max_chars",
      "description",
      "error",
      `Description is ${desc.length} characters; limit is ${rules.description.maxChars}.`,
    );
  } else if (desc.length < rules.description.minChars) {
    add(
      "description.min_chars",
      "description",
      "warning",
      `Description is short (${desc.length} characters).`,
    );
  }

  // ---- search terms ------------------------------------------------------
  const bytes = new TextEncoder().encode(draft.search_terms).length;
  if (bytes > rules.searchTerms.maxBytes) {
    add(
      "search_terms.max_bytes",
      "search_terms",
      "error",
      `Search terms are ${bytes} bytes; limit is ${rules.searchTerms.maxBytes}.`,
    );
  }
  const terms = draft.search_terms.toLowerCase();
  for (const word of rules.searchTerms.discouraged) {
    if (new RegExp(`\\b${escapeRe(word)}\\b`).test(terms)) {
      add(
        "search_terms.discouraged",
        "search_terms",
        "warning",
        `Search terms should not include "${word}".`,
      );
    }
  }
  if (brand && terms.includes(brand.toLowerCase())) {
    add(
      "search_terms.brand",
      "search_terms",
      "warning",
      "Your own brand name is already indexed; remove it from search terms.",
    );
  }

  // ---- every field -------------------------------------------------------
  const fields: [ListingField, string, number | null][] = [
    ["title", draft.title, null],
    ...draft.bullets.map((b, i): [ListingField, string, number] => ["bullets", b, i]),
    ["description", draft.description, null],
    ["search_terms", draft.search_terms, null],
  ];
  for (const [field, text, index] of fields) {
    const lower = text.toLowerCase();
    for (const phrase of rules.bannedPhrases) {
      if (lower.includes(phrase))
        add(
          "content.banned_phrase",
          field,
          "error",
          `Remove promotional phrase "${phrase}".`,
          index,
        );
    }
    if (URL_RE.test(text))
      add("content.url", field, "error", "Links are not allowed in listing copy.", index);
    if (EMAIL_RE.test(text))
      add(
        "content.email",
        field,
        "error",
        "Contact details are not allowed in listing copy.",
        index,
      );
    if (HTML_RE.test(text)) add("content.html", field, "warning", "Remove HTML tags.", index);
    if (EMOJI_RE.test(text)) add("content.emoji", field, "error", "Emojis are not allowed.", index);
    if (/[一-鿿]/.test(text))
      add("content.untranslated", field, "error", "Contains untranslated Chinese text.", index);
  }

  return { passed: !v.some((x) => x.severity === "error"), violations: v };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
