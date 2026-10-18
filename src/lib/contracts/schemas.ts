/**
 * CONTRACTS — the shared language between workstreams.
 *
 * Every agent, rule, page and table speaks these types. Changing a field here
 * ripples into every branch, so changes go through the lead in a small
 * `contract/*` PR (see docs/team/TEAM_GUIDE.md). Add fields as optional first.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Enumerations
// ---------------------------------------------------------------------------

export const PLATFORMS = ["amazon_us", "tiktok_us"] as const;
export const Platform = z.enum(PLATFORMS);
export type Platform = z.infer<typeof Platform>;

export const CATEGORIES = [
  "home_kitchen",
  "sports_outdoors",
  "beauty_personal_care",
  "baby",
  "toys",
  "electronics_accessories",
  "pet_supplies",
  "clothing_accessories",
  "health_household",
  "other",
] as const;
export const Category = z.enum(CATEGORIES);
export type Category = z.infer<typeof Category>;

export const LISTING_FIELDS = ["title", "bullets", "description", "search_terms"] as const;
export const ListingField = z.enum(LISTING_FIELDS);
export type ListingField = z.infer<typeof ListingField>;

export const STAGES = [
  "input_guardrails",
  "extraction",
  "keywords",
  "localization",
  "compliance",
  "output_gate",
  "scoring",
] as const;
export const Stage = z.enum(STAGES);
export type Stage = z.infer<typeof Stage>;

// ---------------------------------------------------------------------------
// 1. What the seller gives us
// ---------------------------------------------------------------------------

export const ProductInput = z.object({
  title_zh: z.string().trim().min(1, "Product name is required").max(300),
  description_zh: z
    .string()
    .trim()
    .min(10, "Describe the product in at least 10 characters")
    .max(8000),
  /** Free-form specs: size, weight, material, package contents... */
  specs_zh: z.string().max(4000).default(""),
  /** Evidence the seller actually has: certificates, test reports, registrations. */
  evidence: z.string().max(4000).default(""),
  brand: z.string().max(80).default(""),
  category: Category.default("other"),
  platform: Platform.default("amazon_us"),
  /** Optional current English listing, scored as the "before" baseline. */
  existing_listing_en: z.string().max(8000).default(""),
});
export type ProductInput = z.infer<typeof ProductInput>;
export type ProductInputDraft = z.input<typeof ProductInput>;

// ---------------------------------------------------------------------------
// 2. Extraction agent output
// ---------------------------------------------------------------------------

export const Fact = z.object({
  id: z.string().describe("Stable id like f1, f2"),
  attribute: z.string().describe("Lowercase attribute name in English, e.g. material, capacity"),
  value: z.string().describe("Value in English, e.g. food-grade silicone"),
  unit: z.string().nullable().describe("Unit if numeric, e.g. ml, cm; null otherwise"),
  source_quote: z.string().describe("Exact Chinese text this fact came from"),
  confidence: z.enum(["high", "medium", "low"]),
});
export type Fact = z.infer<typeof Fact>;

export const CLAIM_TYPES = [
  "certification",
  "safety",
  "ranking",
  "performance",
  "health",
  "environmental",
  "origin",
  "comparative",
  "other",
] as const;

export const SourceClaim = z.object({
  id: z.string().describe("Stable id like c1, c2"),
  text_zh: z.string().describe("Marketing claim exactly as written by the seller"),
  text_en: z.string().describe("Literal English translation"),
  claim_type: z.enum(CLAIM_TYPES),
});
export type SourceClaim = z.infer<typeof SourceClaim>;

export const ProductFacts = z.object({
  product_type: z.string().describe("Short English product type, e.g. collapsible silicone cup"),
  category: Category,
  facts: z.array(Fact),
  marketing_claims: z.array(SourceClaim),
  missing_info: z
    .array(z.string())
    .describe("Important buyer-facing details the seller did not provide"),
});
export type ProductFacts = z.infer<typeof ProductFacts>;

// ---------------------------------------------------------------------------
// 3. Keyword agent output (AI-suggested, never presented as search volume)
// ---------------------------------------------------------------------------

export const KeywordSet = z.object({
  primary: z.array(z.string()).describe("3-5 core phrases a US shopper would type"),
  secondary: z.array(z.string()).describe("5-15 supporting phrases and synonyms"),
  rationale: z.string().describe("One or two sentences on the keyword strategy"),
});
export type KeywordSet = z.infer<typeof KeywordSet>;

// ---------------------------------------------------------------------------
// 4. Localization agent output
// ---------------------------------------------------------------------------

export const ListingDraft = z.object({
  title: z.string(),
  bullets: z.array(z.string()),
  description: z.string(),
  search_terms: z.string().describe("Backend search terms, space separated"),
});
export type ListingDraft = z.infer<typeof ListingDraft>;

// ---------------------------------------------------------------------------
// 5a. Deterministic platform rule checks
// ---------------------------------------------------------------------------

export const RuleViolation = z.object({
  rule_id: z.string(),
  field: ListingField,
  index: z.number().int().nullable(),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
});
export type RuleViolation = z.infer<typeof RuleViolation>;

export const ValidationReport = z.object({
  passed: z.boolean(),
  violations: z.array(RuleViolation),
});
export type ValidationReport = z.infer<typeof ValidationReport>;

// ---------------------------------------------------------------------------
// 5b. Compliance agent output (claim verification)
// ---------------------------------------------------------------------------

export const PolicyRef = z.object({
  doc_id: z.string(),
  chunk_id: z.string(),
  title: z.string(),
  url: z.string(),
});
export type PolicyRef = z.infer<typeof PolicyRef>;

export const ClaimAssessment = z.object({
  id: z.string(),
  claim_text: z.string().describe("The claim as it appears in the draft listing or source"),
  field: z.enum([...LISTING_FIELDS, "source"]),
  status: z.enum(["verified", "unverified", "restricted"]),
  risk: z.enum(["low", "medium", "high"]),
  reason: z.string(),
  evidence_fact_ids: z.array(z.string()),
  policy_refs: z.array(PolicyRef),
  action: z.enum(["keep", "rewrite", "remove", "ask_seller"]),
  suggested_fix: z
    .string()
    .nullable()
    .describe("Replacement text for action=rewrite; null otherwise"),
});
export type ClaimAssessment = z.infer<typeof ClaimAssessment>;

export const ComplianceReport = z.object({
  claims: z.array(ClaimAssessment),
  summary: z.string(),
  uncertainty: z.array(z.string()).describe("What could not be verified, stated plainly"),
});
export type ComplianceReport = z.infer<typeof ComplianceReport>;

export const GateDecision = z.object({
  decision: z.enum(["pass", "fail"]),
  applied_fixes: z.array(z.string()),
  needs_review: z.array(z.string()).describe("Items a human must confirm before publishing"),
});
export type GateDecision = z.infer<typeof GateDecision>;

// ---------------------------------------------------------------------------
// 6. Quality score
// ---------------------------------------------------------------------------

export const SCORE_DIMENSIONS = [
  "keyword_relevance",
  "information_coverage",
  "language_naturalness",
  "claim_verification",
  "format_compliance",
] as const;

export const ScoreComponent = z.object({
  dimension: z.enum(SCORE_DIMENSIONS),
  score: z.number().min(0).max(100),
  weight: z.number(),
  notes: z.array(z.string()),
});
export type ScoreComponent = z.infer<typeof ScoreComponent>;

export const QualityScore = z.object({
  total: z.number().min(0).max(100),
  components: z.array(ScoreComponent),
});
export type QualityScore = z.infer<typeof QualityScore>;

/** Output contract of the LLM quality judge (language naturalness). */
export const JudgeVerdict = z.object({
  naturalness: z.number().int().describe("1-5: reads like a native US listing"),
  clarity: z.number().int().describe("1-5: a shopper understands the product quickly"),
  issues: z.array(z.string()).describe("Concrete problems, max 5"),
});
export type JudgeVerdict = z.infer<typeof JudgeVerdict>;

// ---------------------------------------------------------------------------
// 7. Whole pipeline result
// ---------------------------------------------------------------------------

export const PipelineResult = z.object({
  platform: Platform,
  facts: ProductFacts,
  keywords: KeywordSet,
  draft: ListingDraft,
  listing: ListingDraft,
  validation: ValidationReport,
  compliance: ComplianceReport,
  gate: GateDecision,
  score: QualityScore,
  baseline_score: QualityScore.nullable(),
  warnings: z.array(z.string()),
});
export type PipelineResult = z.infer<typeof PipelineResult>;
