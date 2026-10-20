import type {
  ComplianceReport,
  ListingDraft,
  RiskLevel,
  RiskScore,
  ValidationReport,
} from "@/lib/contracts";
import { scanClaims } from "@/lib/guardrails/claims-lexicon";
import { allText } from "@/lib/guardrails/gate";

/**
 * Takedown-risk score (0 = nothing found, 100 = very likely to be removed),
 * computed in code from what is still in the copy: risky claims (lexicon +
 * compliance review), platform rule errors and untranslated text. Same input,
 * same score — so before/after comparisons and evals are reproducible.
 *
 * Not a prediction of marketplace decisions; a screen of known risk signals.
 */
export interface RiskInput {
  listing: ListingDraft;
  compliance: ComplianceReport | null;
  validation: ValidationReport;
  /** The seller's evidence text; a matching document lowers some claims to "needs proof". */
  evidence?: string;
}

const POINTS = {
  restricted: 40,
  unverifiedHigh: 18,
  unverified: 10,
  ruleError: 10,
  ruleWarning: 2,
  untranslated: 15,
};
const CAPS = { ruleErrors: 30, ruleWarnings: 8 };

/** A restricted claim alone is enough for "high"; an unverified one for "medium". */
const FLOOR = { restricted: 60, unverified: 25 };

export function riskLevel(score: number): RiskLevel {
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
}

export function computeRisk({
  listing,
  compliance,
  validation,
  evidence = "",
}: RiskInput): RiskScore {
  const text = allText(listing);
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  const counted = new Set<string>();
  let score = 0;
  let floor = 0;

  // 1. Risky phrases the deterministic lexicon finds in the copy.
  for (const hit of scanClaims(text, evidence)) {
    const key = hit.match.toLowerCase();
    if (counted.has(key) || hit.status === "verified") continue;
    counted.add(key);
    if (hit.status === "restricted") {
      score += POINTS.restricted;
      floor = Math.max(floor, FLOOR.restricted);
      reasons.push(`Restricted claim "${hit.match}": ${hit.rule.guidance}`);
    } else {
      score += hit.rule.risk === "high" ? POINTS.unverifiedHigh : POINTS.unverified;
      floor = Math.max(floor, FLOOR.unverified);
      reasons.push(
        `"${hit.match}" needs proof (test report or certificate) before you publish it.`,
      );
    }
  }

  // 2. Claims the compliance review flagged that are still in the copy.
  for (const claim of compliance?.claims ?? []) {
    if (claim.status === "verified" || claim.field === "source") continue;
    const key = claim.claim_text.toLowerCase();
    if (!key || counted.has(key) || !lower.includes(key)) continue;
    counted.add(key);
    if (claim.status === "restricted") {
      score += POINTS.restricted;
      floor = Math.max(floor, FLOOR.restricted);
      reasons.push(`Restricted claim "${claim.claim_text}": ${claim.reason}`);
    } else {
      score += claim.risk === "high" ? POINTS.unverifiedHigh : POINTS.unverified;
      floor = Math.max(floor, FLOOR.unverified);
      reasons.push(`"${claim.claim_text}" is not backed by your evidence yet.`);
    }
  }

  // 3. Platform rule problems (listings that break format rules get suppressed).
  const errors = validation.violations.filter((v) => v.severity === "error");
  const warnings = validation.violations.filter((v) => v.severity === "warning");
  const untranslated = errors.filter((v) => v.rule_id === "content.untranslated");
  if (untranslated.length) {
    score += POINTS.untranslated;
    reasons.push("Contains untranslated Chinese text, which reads as a low-quality listing.");
  }
  const otherErrors = errors.filter((v) => v.rule_id !== "content.untranslated");
  if (otherErrors.length) {
    score += Math.min(CAPS.ruleErrors, POINTS.ruleError * otherErrors.length);
    reasons.push(
      `${otherErrors.length} platform rule error(s), e.g. ${otherErrors[0].message.replace(/\.$/, "")}.`,
    );
  }
  if (warnings.length) {
    score += Math.min(CAPS.ruleWarnings, POINTS.ruleWarning * warnings.length);
    reasons.push(`${warnings.length} rule warning(s) worth fixing.`);
  }

  const total = Math.max(0, Math.min(100, Math.max(score, floor)));
  return {
    score: total,
    level: riskLevel(total),
    reasons: reasons.length ? reasons : ["No known takedown signals found."],
  };
}
