/**
 * CONTRACTS — the compliance suite around the core report: evidence library,
 * listing audit, takedown/appeal assistant, takedown-risk score and
 * seller-language explanations. (Features merged from the team's Listing
 * Copilot prototype.) Lead-owned, like the rest of src/lib/contracts.
 */
import { z } from "zod";
import {
  ComplianceReport,
  GateDecision,
  ListingDraft,
  ListingField,
  Platform,
  PolicyRef,
  QualityScore,
  ValidationReport,
} from "./schemas";

// ---------------------------------------------------------------------------
// Evidence library: documents that let a claim stay in a listing
// ---------------------------------------------------------------------------

export const EVIDENCE_KINDS = [
  "test_report",
  "certificate",
  "registration",
  "invoice",
  "other",
] as const;
export const EvidenceKind = z.enum(EVIDENCE_KINDS);
export type EvidenceKind = z.infer<typeof EvidenceKind>;

export const EvidenceInput = z.object({
  name: z.string().trim().min(2, "Give the document a name").max(120),
  kind: EvidenceKind,
  issuer: z.string().trim().max(120).default(""),
  /** Report or certificate number. */
  reference: z.string().trim().max(200).default(""),
  /** Claims this document supports, e.g. "BPA-free", "food-grade silicone". */
  claims: z.array(z.string().trim().min(2).max(80)).max(12).default([]),
  /** ISO date (YYYY-MM-DD) or null when it does not expire. */
  expires_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .default(null),
  notes: z.string().trim().max(500).default(""),
});
export type EvidenceInput = z.infer<typeof EvidenceInput>;
export type EvidenceInputDraft = z.input<typeof EvidenceInput>;

export const EvidenceItem = EvidenceInput.extend({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string(),
});
export type EvidenceItem = z.infer<typeof EvidenceItem>;

// ---------------------------------------------------------------------------
// Takedown-risk score (computed in code from rule checks + claim review)
// ---------------------------------------------------------------------------

export const RiskLevel = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevel>;

export const RiskScore = z.object({
  /** 0 = nothing found, 100 = very likely to be removed. */
  score: z.number().int().min(0).max(100),
  level: RiskLevel,
  reasons: z.array(z.string()),
});
export type RiskScore = z.infer<typeof RiskScore>;

// ---------------------------------------------------------------------------
// Audit an existing (live) listing: findings, minimal fix, risk before/after
// ---------------------------------------------------------------------------

export const AuditInput = z.object({
  platform: Platform,
  /** The listing as it is now: title, bullets and description, pasted. */
  listing_text: z
    .string()
    .trim()
    .min(30, "Paste the title, bullets and description of the listing")
    .max(12_000),
  /** Optional seller notes about the product, any language. */
  notes: z.string().trim().max(4_000).default(""),
  evidence: z.string().trim().max(4_000).default(""),
  brand: z.string().trim().max(80).default(""),
});
export type AuditInput = z.infer<typeof AuditInput>;
export type AuditInputDraft = z.input<typeof AuditInput>;

export const FieldChange = z.object({
  field: ListingField,
  index: z.number().int().nullable(),
  before: z.string(),
  after: z.string(),
  reason: z.string(),
});
export type FieldChange = z.infer<typeof FieldChange>;

export const AuditResult = z.object({
  platform: Platform,
  original: ListingDraft,
  original_validation: ValidationReport,
  compliance: ComplianceReport,
  fixed: ListingDraft,
  fixed_validation: ValidationReport,
  gate: GateDecision,
  risk_before: RiskScore,
  risk_after: RiskScore,
  score_before: QualityScore.nullable(),
  score_after: QualityScore.nullable(),
  changes: z.array(FieldChange),
  warnings: z.array(z.string()),
});
export type AuditResult = z.infer<typeof AuditResult>;

// ---------------------------------------------------------------------------
// Takedown / suppression notice -> cause, fix, documents, appeal letter
// ---------------------------------------------------------------------------

export const AppealInput = z.object({
  platform: Platform,
  notice: z.string().trim().min(20, "Paste the full notice from the marketplace").max(8_000),
  listing_text: z.string().trim().max(12_000).default(""),
  /** What the seller wants to say, any language. */
  seller_note: z.string().trim().max(2_000).default(""),
  evidence: z.string().trim().max(4_000).default(""),
});
export type AppealInput = z.infer<typeof AppealInput>;
export type AppealInputDraft = z.input<typeof AppealInput>;

/** Explanations are written in the seller's interface language; the appeal itself in English. */
export const ExplanationLanguage = z.enum(["en", "zh"]);
export type ExplanationLanguage = z.infer<typeof ExplanationLanguage>;

export const AppealResult = z.object({
  language: ExplanationLanguage,
  policy_area: z.string().describe("Which policy or law the notice is about"),
  what_happened: z.string(),
  likely_cause: z.string().describe("The exact words or facts that most likely triggered it"),
  severity: RiskLevel,
  fix_steps: z.array(z.string()),
  documents_needed: z.array(z.string()),
  listing_changes: z.array(z.object({ field: z.string(), before: z.string(), after: z.string() })),
  /** Short, factual appeal / plan of action in English for the marketplace. */
  appeal_text: z.string(),
  policy_refs: z.array(PolicyRef),
  warnings: z.array(z.string()),
});
export type AppealResult = z.infer<typeof AppealResult>;

// ---------------------------------------------------------------------------
// Tool runs: audits and appeals are stored like listings (owner-scoped)
// ---------------------------------------------------------------------------

export const ToolRunStatus = z.enum(["running", "completed", "failed"]);
export type ToolRunStatus = z.infer<typeof ToolRunStatus>;

const toolRunBase = {
  id: z.string(),
  user_id: z.string(),
  status: ToolRunStatus,
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
};

export const AuditRun = z.object({
  ...toolRunBase,
  kind: z.literal("audit"),
  input: AuditInput,
  result: AuditResult.nullable(),
});
export type AuditRun = z.infer<typeof AuditRun>;

export const AppealRun = z.object({
  ...toolRunBase,
  kind: z.literal("appeal"),
  input: AppealInput,
  result: AppealResult.nullable(),
});
export type AppealRun = z.infer<typeof AppealRun>;

export const ToolRun = z.discriminatedUnion("kind", [AuditRun, AppealRun]);
export type ToolRun = z.infer<typeof ToolRun>;
export type ToolKind = ToolRun["kind"];
export interface ToolRunTypes {
  audit: AuditRun;
  appeal: AppealRun;
}
export type ToolRunOf<K extends ToolKind> = ToolRunTypes[K];

export interface ToolRunSummary {
  id: string;
  kind: ToolKind;
  status: ToolRunStatus;
  platform: Platform;
  title: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Seller-language explanation of one channel's listing (on demand)
// ---------------------------------------------------------------------------

export const SellerExplanation = z.object({
  language: ExplanationLanguage,
  /** Two or three sentences: is it ready, and what matters most. */
  summary: z.string(),
  /** Faithful translation of the listing so the seller can check what it claims. */
  back_translation: z.object({
    title: z.string(),
    bullets: z.array(z.string()),
    description: z.string(),
  }),
  /** One plain-language note per reviewed claim, same order as the compliance report. */
  claim_notes: z.array(z.object({ claim_id: z.string(), note: z.string() })),
});
export type SellerExplanation = z.infer<typeof SellerExplanation>;
