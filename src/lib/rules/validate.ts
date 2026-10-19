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
 * One function serves every platform; the limits come from its rule config.
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
const CJK_RE = /[一-鿿]/;

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
      `Title is ${title.length} characters; ${rules.label} allows ${rules.title.maxChars}. Rewrite it shorter, keep the key attributes.`,
    );
  } else if (rules.title.recommendedMaxChars && title.length > rules.title.recommendedMaxChars) {
    add(
      "title.recommended_max",
      "title",
      "warning",
      `Title is ${title.length} characters; under ${rules.title.recommendedMaxChars} reads better on ${rules.label}.`,
    );
  }
  if (
    rules.title.recommendedMinChars &&
    title.length > 0 &&
    title.length < rules.title.recommendedMinChars
  ) {
    add(
      "title.recommended_min",
      "title",
      "warning",
      `Title is short (${title.length} characters); ${rules.title.recommendedMinChars}+ helps ${rules.label} search.`,
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

  // ---- bullets / selling points / highlights -----------------------------
  const b = rules.bullets;
  if (draft.bullets.length < b.min) {
    add(
      "bullets.count",
      "bullets",
      b.min === b.expected ? "error" : "warning",
      `${b.label}: use ${b.expected} (found ${draft.bullets.length}).`,
    );
  } else if (draft.bullets.length > b.expected) {
    add(
      "bullets.count",
      "bullets",
      "error",
      `${b.label}: use at most ${b.expected} (found ${draft.bullets.length}).`,
    );
  }
  draft.bullets.forEach((text, i) => {
    if (text.trim().length === 0)
      add("bullets.empty", "bullets", "error", `${b.label} ${i + 1} is empty.`, i);
    if (text.length > b.maxChars) {
      add(
        "bullets.max_chars",
        "bullets",
        "error",
        `${b.label} ${i + 1} is ${text.length} characters; limit is ${b.maxChars}.`,
        i,
      );
    } else if (text.length > b.recommendedMaxChars) {
      add(
        "bullets.recommended_chars",
        "bullets",
        "warning",
        `${b.label} ${i + 1} is ${text.length} characters; under ${b.recommendedMaxChars} reads better on mobile.`,
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

  // ---- Amazon backend search terms ---------------------------------------
  if (rules.searchTerms) {
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
  }

  // ---- Shopify SEO listing -----------------------------------------------
  if (rules.seo) {
    const t = draft.seo_title.trim();
    const d = draft.seo_description.trim();
    if (!t) add("seo_title.required", "seo_title", "warning", "Add an SEO page title.");
    else if (t.length > rules.seo.titleMax) {
      add(
        "seo_title.max_chars",
        "seo_title",
        "error",
        `SEO title is ${t.length} characters; limit is ${rules.seo.titleMax}.`,
      );
    } else if (t.length > rules.seo.titleRecommended) {
      add(
        "seo_title.recommended",
        "seo_title",
        "warning",
        `SEO title is ${t.length} characters; Google shows about ${rules.seo.titleRecommended}.`,
      );
    }
    if (!d)
      add("seo_description.required", "seo_description", "warning", "Add a meta description.");
    else if (d.length > rules.seo.descriptionMax) {
      add(
        "seo_description.max_chars",
        "seo_description",
        "error",
        `Meta description is ${d.length} characters; limit is ${rules.seo.descriptionMax}.`,
      );
    } else if (d.length > rules.seo.descriptionRecommended) {
      add(
        "seo_description.recommended",
        "seo_description",
        "warning",
        `Meta description is ${d.length} characters; Google shows about ${rules.seo.descriptionRecommended}.`,
      );
    }
  }

  // ---- tags / hashtags ---------------------------------------------------
  if (rules.tags) {
    const t = rules.tags;
    if (draft.tags.length < t.min)
      add("tags.count", "tags", "warning", `${t.label}: add at least ${t.min}.`);
    if (draft.tags.length > t.max)
      add("tags.count", "tags", "warning", `${t.label}: keep it to ${t.max}.`);
    draft.tags.forEach((tag, i) => {
      if (tag.length > t.maxChars) {
        add(
          "tags.max_chars",
          "tags",
          "warning",
          `"${tag}" is longer than ${t.maxChars} characters.`,
          i,
        );
      }
    });
  }

  // ---- every text field --------------------------------------------------
  const fields: [ListingField, string, number | null][] = [
    ["title", draft.title, null],
    ...draft.bullets.map((x, i): [ListingField, string, number] => ["bullets", x, i]),
    ["description", draft.description, null],
    ["search_terms", draft.search_terms, null],
    ["seo_title", draft.seo_title, null],
    ["seo_description", draft.seo_description, null],
    ...draft.tags.map((x, i): [ListingField, string, number] => ["tags", x, i]),
  ];
  for (const [field, text, index] of fields) {
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const phrase of rules.bannedPhrases) {
      if (lower.includes(phrase)) {
        add(
          "content.banned_phrase",
          field,
          "error",
          `Remove promotional phrase "${phrase}".`,
          index,
        );
      }
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
    if (CJK_RE.test(text))
      add("content.untranslated", field, "error", "Contains untranslated Chinese text.", index);
  }

  return { passed: !v.some((x) => x.severity === "error"), violations: v };
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
