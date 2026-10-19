import type {
  ComplianceReport,
  JudgeVerdict,
  KeywordSet,
  ListingDraft,
  ProductFacts,
  QualityScore,
  ScoreComponent,
  ValidationReport,
} from "@/lib/contracts";
import { scanClaims } from "@/lib/guardrails/claims-lexicon";

/**
 * Listing Quality Score (0-100). Four of five dimensions are computed by code
 * from explicit checks; only language naturalness uses the LLM judge, with an
 * anchored rubric. The score is an internal quality signal, not a prediction
 * of conversion or of marketplace approval.
 *
 * Owner: WS2. Weights live here and in docs/AGENT_DESIGN.md — keep them in sync.
 */
export const WEIGHTS: Record<ScoreComponent["dimension"], number> = {
  keyword_relevance: 25,
  information_coverage: 25,
  language_naturalness: 20,
  claim_verification: 20,
  format_compliance: 10,
};

export interface ScoreInput {
  listing: ListingDraft;
  validation: ValidationReport;
  judge: JudgeVerdict;
  /** Absent for baseline scoring of a seller's existing listing. */
  keywords?: KeywordSet;
  facts?: ProductFacts;
  compliance?: ComplianceReport;
  evidence?: string;
}

export function computeScore(s: ScoreInput): QualityScore {
  const text = listingText(s.listing).toLowerCase();
  const components: ScoreComponent[] = [
    keywordRelevance(s, text),
    informationCoverage(s, text),
    naturalness(s.judge),
    claimVerification(s),
    formatCompliance(s.validation),
  ];
  const total = components.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0);
  return { total: Math.round(total), components };
}

function keywordRelevance(s: ScoreInput, text: string): ScoreComponent {
  const notes: string[] = [];
  let score: number;
  if (!s.keywords || s.keywords.primary.length === 0) {
    score = 50;
    notes.push("No keyword set to compare against; neutral score.");
  } else {
    const title = s.listing.title.toLowerCase();
    const inTitle =
      s.keywords.primary.filter((k) => containsAllWords(title, k)).length /
      s.keywords.primary.length;
    const inBody =
      s.keywords.primary.filter((k) => containsAllWords(text, k)).length /
      s.keywords.primary.length;
    const sec = s.keywords.secondary.length
      ? s.keywords.secondary.filter((k) =>
          containsAllWords(`${text} ${indexedExtras(s.listing)}`, k),
        ).length / s.keywords.secondary.length
      : 1;
    score = 100 * (0.5 * inTitle + 0.3 * inBody + 0.2 * sec);
    notes.push(
      `${Math.round(inTitle * 100)}% of primary keywords in the title; ${Math.round(sec * 100)}% of secondary covered.`,
    );
  }
  return {
    dimension: "keyword_relevance",
    score: round(score),
    weight: WEIGHTS.keyword_relevance,
    notes,
  };
}

function informationCoverage(s: ScoreInput, text: string): ScoreComponent {
  const notes: string[] = [];
  const facts = (s.facts?.facts ?? []).filter(
    (f) => f.confidence !== "low" && f.attribute !== "feature",
  );
  let score: number;
  if (facts.length === 0) {
    score = s.facts ? 40 : 50;
    notes.push(
      s.facts
        ? "Few product facts were available."
        : "No fact record to compare against; neutral score.",
    );
  } else {
    const covered = facts.filter((f) => containsAllWords(text, f.value));
    score = (100 * covered.length) / facts.length;
    const missed = facts.filter((f) => !covered.includes(f)).map((f) => f.attribute);
    notes.push(`${covered.length}/${facts.length} key facts appear in the listing.`);
    if (missed.length) notes.push(`Not mentioned: ${missed.join(", ")}.`);
  }
  if (s.facts && s.facts.missing_info.length > 0) {
    score -= Math.min(20, 5 * s.facts.missing_info.length);
    notes.push(`Seller did not provide: ${s.facts.missing_info.join(", ")}.`);
  }
  return {
    dimension: "information_coverage",
    score: round(score),
    weight: WEIGHTS.information_coverage,
    notes,
  };
}

function naturalness(j: JudgeVerdict): ScoreComponent {
  const score = ((j.naturalness - 1) / 4) * 70 + ((j.clarity - 1) / 4) * 30;
  return {
    dimension: "language_naturalness",
    score: round(score),
    weight: WEIGHTS.language_naturalness,
    notes: [
      `Judge: naturalness ${j.naturalness}/5, clarity ${j.clarity}/5.`,
      ...j.issues.slice(0, 3),
    ],
  };
}

function claimVerification(s: ScoreInput): ScoreComponent {
  const hits = scanClaims(
    `${listingText(s.listing)}\n${s.listing.seo_title}\n${s.listing.seo_description}\n${s.listing.tags.join("\n")}`,
    s.evidence ?? "",
  );
  const restricted = hits.filter((h) => h.status === "restricted");
  const unverified = hits.filter((h) => h.status === "unverified");
  let score = 100 - 35 * restricted.length - 10 * unverified.length;
  const notes: string[] = [];
  if (restricted.length)
    notes.push(`Restricted claims present: ${restricted.map((h) => `"${h.match}"`).join(", ")}.`);
  if (unverified.length)
    notes.push(`Unverified claims present: ${unverified.map((h) => `"${h.match}"`).join(", ")}.`);
  const askSeller = s.compliance?.claims.filter((c) => c.action === "ask_seller").length ?? 0;
  if (askSeller) {
    score -= 5 * askSeller;
    notes.push(`${askSeller} claim(s) need evidence from the seller.`);
  }
  if (!notes.length) notes.push("No risky claims in the final listing.");
  return {
    dimension: "claim_verification",
    score: round(score),
    weight: WEIGHTS.claim_verification,
    notes,
  };
}

function formatCompliance(v: ValidationReport): ScoreComponent {
  const errors = v.violations.filter((x) => x.severity === "error");
  const warnings = v.violations.filter((x) => x.severity === "warning");
  return {
    dimension: "format_compliance",
    score: round(100 - 25 * errors.length - 5 * warnings.length),
    weight: WEIGHTS.format_compliance,
    notes: v.violations.length
      ? v.violations.slice(0, 4).map((x) => x.message)
      : ["Meets all platform format rules."],
  };
}

/** The shopper-visible copy: title, bullets and description. */
export function listingText(l: ListingDraft): string {
  return [l.title, ...l.bullets, l.description].join("\n");
}

/** Fields search engines index but shoppers rarely read: backend terms, SEO meta, tags. */
function indexedExtras(l: ListingDraft): string {
  return [l.search_terms, l.seo_title, l.seo_description, ...l.tags].join(" ").toLowerCase();
}

function containsAllWords(haystack: string, phrase: string): boolean {
  const words = phrase
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 1);
  return words.length > 0 && words.every((w) => haystack.includes(w.replace(/s$/, "")));
}

function round(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Best-effort parse of a seller's existing English listing into fields, so it
 * can be scored as the "before" baseline.
 */
export function parseExistingListing(text: string): ListingDraft {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const title = lines[0] ?? "";
  const bullets = lines
    .slice(1)
    .filter((l) => /^[-•*·]|^\d+[.)]/.test(l))
    .map((l) => l.replace(/^[-•*·]\s*|^\d+[.)]\s*/, ""));
  const description = lines
    .slice(1)
    .filter((l) => !/^[-•*·]|^\d+[.)]/.test(l))
    .join(" ");
  return {
    title,
    bullets,
    description,
    search_terms: "",
    seo_title: "",
    seo_description: "",
    tags: [],
  };
}
