import { z } from "zod";
import {
  ListingDraft,
  ListingField,
  type ComplianceReport,
  type Platform,
  type ProductFacts,
  type ValidationReport,
} from "@/lib/contracts";
import { asSellerData } from "@/lib/guardrails/input";
import { structuredCall, type AgentContext } from "@/lib/harness";
import { renderFacts } from "../shared/seller-input";
import { mockAuditFix } from "./mock";
import { appearsIn, parseListingText } from "./parse";
import { auditFixSystem, STRUCTURE_SYSTEM } from "./prompt";
import type { RepairNote } from "./repair";

/**
 * Audit step "structure" (fast tier, single structured call): only used when
 * the code parser could not make sense of the paste. Every field the model
 * returns must be a verbatim copy of the paste; anything else is replaced by
 * the parser's guess (a model may not put words in the seller's mouth).
 */
export async function runStructureListing(
  ctx: AgentContext,
  text: string,
): Promise<{ draft: ListingDraft; warnings: string[] }> {
  const parsed = parseListingText(text).draft;
  const draft = await structuredCall(ctx, {
    agent: "audit.structure",
    tier: "fast",
    effort: "low",
    system: STRUCTURE_SYSTEM,
    user: `Split this pasted listing into fields.\n\n${asSellerData("listing", text)}`,
    schema: ListingDraft,
    mock: () => ({ json: parsed }),
  });
  const warnings: string[] = [];
  const keep = (value: string, fallback: string, name: string) => {
    if (appearsIn(text, value)) return value;
    warnings.push(`The ${name} the AI read was not in your paste, so the original text was kept.`);
    return fallback;
  };
  return {
    draft: {
      title: keep(draft.title, parsed.title, "title"),
      item_highlights: keep(draft.item_highlights, parsed.item_highlights, "Item Highlights"),
      bullets: draft.bullets.every((b) => appearsIn(text, b)) ? draft.bullets : parsed.bullets,
      description: keep(draft.description, parsed.description, "description"),
      search_terms: keep(draft.search_terms, parsed.search_terms, "search terms"),
      seo_title: keep(draft.seo_title, parsed.seo_title, "SEO title"),
      seo_description: keep(draft.seo_description, parsed.seo_description, "meta description"),
      tags: draft.tags.every((t) => appearsIn(text, t)) ? draft.tags : parsed.tags,
    },
    warnings,
  };
}

export const AuditFixOutput = z.object({
  listing: ListingDraft,
  notes: z.array(
    z.object({
      field: ListingField,
      index: z.number().int().nullable(),
      reason: z.string(),
    }),
  ),
});
export type AuditFixOutput = z.infer<typeof AuditFixOutput>;

/**
 * Audit step "minimal fix" (smart tier, single structured call): resolve the
 * problems the rules engine and the compliance review found with the
 * smallest possible edit. Code then enforces minimality (pipeline/audit.ts).
 */
export async function runAuditFix(
  ctx: AgentContext,
  args: {
    platform: Platform;
    original: ListingDraft;
    compliance: ComplianceReport;
    validation: ValidationReport;
    facts: ProductFacts;
    evidence: string;
    brand: string;
  },
): Promise<{ listing: ListingDraft; notes: RepairNote[] }> {
  const problems = renderProblems(args.compliance, args.validation);
  if (problems.length === 0) return { listing: args.original, notes: [] };

  const user = [
    "Fix only the problems below. Keep everything else exactly as it is.",
    `<problems>\n${problems.join("\n")}\n</problems>`,
    `## Current listing (JSON)\n${JSON.stringify(args.original, null, 2)}`,
    `## Product record\n${renderFacts(args.facts)}`,
    `Brand: ${args.brand || "(none)"}`,
    asSellerData("evidence", args.evidence || "(none provided)"),
  ].join("\n\n");

  const out = await structuredCall(ctx, {
    agent: "audit.fix",
    tier: "smart",
    effort: "medium",
    system: auditFixSystem(args.platform),
    user,
    schema: AuditFixOutput,
    mock: () => ({ json: mockAuditFix(args) }),
  });
  return out;
}

/** The problems the fix agent must resolve, in plain lines. */
export function renderProblems(
  compliance: ComplianceReport,
  validation: ValidationReport,
): string[] {
  const lines: string[] = [];
  for (const c of compliance.claims) {
    if (c.status === "verified" || c.action === "keep") continue;
    const fix = c.suggested_fix ? ` Suggested fix: "${c.suggested_fix}".` : "";
    lines.push(
      `- Claim "${c.claim_text}" (${c.field}, ${c.status}, ${c.risk} risk): ${c.action.replace("_", " ")}. ${c.reason}${fix}`,
    );
  }
  for (const v of validation.violations) {
    const where = v.index === null ? v.field : `${v.field} ${v.index + 1}`;
    lines.push(`- Rule ${v.rule_id} (${where}, ${v.severity}): ${v.message}`);
  }
  return lines;
}
