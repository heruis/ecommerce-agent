import { ListingDraft, type Platform } from "@/lib/contracts";
import { scanClaims } from "@/lib/guardrails/claims-lexicon";
import { defineTool } from "@/lib/harness";
import { validateListing } from "@/lib/rules";

/**
 * check_listing — the localization agent's validator tool. Deterministic code:
 * the model drafts, the rules engine judges, the model rewrites.
 */
export function checkListingTool(platform: Platform, opts: { brand: string; evidence: string }) {
  return defineTool({
    name: "check_listing",
    description:
      "Validate a complete listing draft against the marketplace rules. Returns passed, a list of rule violations, and risky claim phrases found. Call it with the full draft before submitting.",
    schema: ListingDraft,
    maxCalls: 4,
    run: async (draft) => {
      const report = validateListing(draft, platform, { brand: opts.brand });
      const text = [draft.title, ...draft.bullets, draft.description].join("\n");
      const risky = scanClaims(text, opts.evidence)
        .filter((h) => h.status !== "verified")
        .map((h) => ({ phrase: h.match, rule: h.rule.id, guidance: h.rule.guidance }));
      return {
        passed: report.passed && risky.every((r) => !isHighRisk(r.rule)),
        violations: report.violations.map((v) => ({
          field: v.field,
          index: v.index,
          severity: v.severity,
          message: v.message,
        })),
        risky_claims: risky,
      };
    },
    summarize: (draft) =>
      `Checked draft (title ${draft.title.length} chars, ${draft.bullets.length} bullets)`,
  });
}

const HIGH_RISK = new Set([
  "fda_approval",
  "absolute_safety",
  "ranking_number_one",
  "medical_claim",
  "antimicrobial",
  "made_in_usa",
  "biodegradable",
  "promo_guarantee",
]);

function isHighRisk(ruleId: string) {
  return HIGH_RISK.has(ruleId);
}
