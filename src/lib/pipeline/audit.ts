import {
  AuditInput,
  ProductInput,
  type AuditInputDraft,
  type AuditResult,
  type ComplianceReport,
  type FieldChange,
  type ListingDraft,
  type ListingField,
  type ValidationReport,
} from "@/lib/contracts";
import { runCompliance, runExtraction, runJudge } from "@/lib/agents";
import { runAuditFix, runStructureListing } from "@/lib/agents/audit/agent";
import { parseListingText } from "@/lib/agents/audit/parse";
import { repairRules, type RepairNote } from "@/lib/agents/audit/repair";
import { applyGate, screenInput } from "@/lib/guardrails";
import { scanClaims } from "@/lib/guardrails/claims-lexicon";
import { AgentError } from "@/lib/harness";
import { computeRisk } from "@/lib/report/risk";
import { platformLabel, validateListing } from "@/lib/rules";
import { computeScore } from "@/lib/scoring";
import { withToolHarness, type ToolOutcome, type ToolRunOptions } from "./tool-run";

/**
 * Listing audit: check a listing that is already live (or about to be) and
 * return the smallest fix. A fixed workflow like the orchestrator:
 *
 *   input_guardrails -> extraction (split the paste + facts) -> compliance
 *   (agentic RAG review) -> localization (minimal-fix agent; minimality and
 *   rule repairs enforced in code) -> output_gate -> scoring (risk and
 *   quality before/after)
 *
 * Merged from the team's Listing Copilot prototype; reuses ShelfPass's
 * extraction, compliance, gate, rules and scoring instead of new copies.
 */
export async function runAudit(
  raw: AuditInputDraft,
  opts: ToolRunOptions = {},
): Promise<ToolOutcome<AuditResult>> {
  return withToolHarness("audit", opts, async (h) => {
    const parsed = AuditInput.safeParse(raw);
    if (!parsed.success) {
      throw new AgentError(
        "guardrail_blocked",
        parsed.error.issues.map((i) => i.message).join("; "),
      );
    }
    const warnings: string[] = [];

    // Layer 1: nothing reaches a model until the text passes the input screen.
    const screen = await h.stage(
      "input_guardrails",
      { platform: parsed.data.platform, chars: parsed.data.listing_text.length },
      async () => {
        const result = screenInput(asScreenInput(parsed.data));
        if (result.blocked) {
          throw new AgentError("guardrail_blocked", result.reason ?? "Input was blocked.");
        }
        return result;
      },
      (r) => (r.warnings.length ? r.warnings.join(" ") : "Input passed all checks."),
    );
    warnings.push(...screen.warnings);
    const input: AuditInput = {
      ...parsed.data,
      listing_text: screen.sanitized.description_zh,
      notes: screen.sanitized.specs_zh,
      evidence: screen.sanitized.evidence,
    };
    const { platform, brand, evidence } = input;

    const read = await h.stage(
      "extraction",
      { platform },
      async (ctx) => {
        const guess = parseListingText(input.listing_text);
        let original = guess.draft;
        if (guess.confidence === "low") {
          const structured = await runStructureListing(ctx, input.listing_text);
          original = structured.draft;
          warnings.push(...structured.warnings);
        }
        const extraction = await runExtraction(ctx, productInputFor(input, original));
        return { original, facts: extraction.facts, warnings: extraction.warnings };
      },
      (r) =>
        `Read ${r.original.bullets.length} bullet(s) and ${r.facts.facts.length} product facts`,
    );
    warnings.push(...read.warnings);
    const { original, facts } = read;
    const original_validation = validateListing(original, platform, { brand });

    const compliance = await h.stage(
      "compliance",
      { claims: facts.marketing_claims.length },
      (ctx) =>
        runCompliance(
          ctx,
          productInputFor(input, original),
          facts,
          [{ platform, draft: original }],
          h.retriever,
        ),
      (r) => r.summary || `${r.claims.length} claim(s) reviewed`,
    );

    const fix = await h.stage(
      "localization",
      { problems: compliance.claims.length + original_validation.violations.length },
      async (ctx) => {
        const proposed = await runAuditFix(ctx, {
          platform,
          original,
          compliance,
          validation: original_validation,
          facts,
          evidence,
          brand,
        });
        // Minimality in code: fields without a problem keep their exact text.
        const minimal = keepUntouched(
          original,
          proposed.listing,
          compliance,
          original_validation,
          evidence,
        );
        // Backstop: deterministic repairs for any rule error the model left.
        const repaired = repairRules(minimal, platform, { brand });
        return { listing: repaired.listing, notes: [...proposed.notes, ...repaired.notes] };
      },
      (r) => `${countChanged(original, r.listing)} field(s) changed`,
    );

    const gated = await h.stage(
      "output_gate",
      { platform },
      async () => applyGate({ draft: fix.listing, compliance, platform, brand, evidence }),
      (r) =>
        r.gate.decision === "pass" ? "PASS" : `FAIL — ${r.gate.needs_review.length} to review`,
    );
    const fixed = gated.listing;

    const scores = await h.stage(
      "scoring",
      {},
      async (ctx) => {
        const unchanged = countChanged(original, fixed) === 0;
        const judgeBefore = await runJudge(ctx, original, "audit.judge_before");
        const judgeAfter = unchanged
          ? judgeBefore
          : await runJudge(ctx, fixed, "audit.judge_after");
        const score = (
          listing: ListingDraft,
          validation: ValidationReport,
          judge: typeof judgeBefore,
        ) => computeScore({ listing, validation, judge, facts, compliance, evidence });
        return {
          before: score(original, original_validation, judgeBefore),
          after: score(fixed, gated.validation, judgeAfter),
        };
      },
      (r) => `Quality ${r.before.total} → ${r.after.total}`,
    );

    const risk_before = computeRisk({
      listing: original,
      compliance,
      validation: original_validation,
      evidence,
    });
    const risk_after = computeRisk({
      listing: fixed,
      compliance,
      validation: gated.validation,
      evidence,
    });
    if (compliance.claims.length === 0 && original_validation.violations.length === 0) {
      warnings.push(`No problems found for ${platformLabel(platform)}; nothing was changed.`);
    }

    return {
      platform,
      original,
      original_validation,
      compliance,
      fixed,
      fixed_validation: gated.validation,
      gate: gated.gate,
      risk_before,
      risk_after,
      score_before: scores.before,
      score_after: scores.after,
      changes: diffListings(original, fixed, fix.notes, gated.gate.applied_fixes),
      warnings,
    };
  });
}

/** Route pre-check (no model call, no charge): the reason the input is blocked, or null. */
export function screenAuditInput(input: AuditInput): string | null {
  const result = screenInput(asScreenInput(input));
  return result.blocked ? (result.reason ?? "This input cannot be processed.") : null;
}

/** Map the audit's free text onto the fields the input screen checks. */
function asScreenInput(input: AuditInput): ProductInput {
  return {
    title_zh: "",
    description_zh: input.listing_text,
    specs_zh: input.notes,
    evidence: input.evidence,
    brand: input.brand,
    category: "other",
    platforms: [input.platform],
    images: [],
    existing_listing_en: "",
  };
}

/** The product record the extraction and compliance agents expect. */
function productInputFor(input: AuditInput, draft: ListingDraft): ProductInput {
  return ProductInput.parse({
    title_zh: (draft.title || input.listing_text.split("\n")[0] || "Listing").slice(0, 300),
    description_zh: [input.listing_text, input.notes].filter(Boolean).join("\n\n").slice(0, 8000),
    evidence: input.evidence,
    brand: input.brand,
    platforms: [input.platform],
  });
}

type FieldKey = string; // "title", "bullets:2", "bullets:*", "tags:*", ...

/** Which fields have a problem: a rule violation or a risky claim inside them. */
export function problemFields(
  listing: ListingDraft,
  compliance: ComplianceReport,
  validation: ValidationReport,
  evidence: string,
): Set<FieldKey> {
  const keys = new Set<FieldKey>();
  for (const v of validation.violations) {
    if (v.index !== null) keys.add(`${v.field}:${v.index}`);
    else if (v.field === "bullets" || v.field === "tags") keys.add(`${v.field}:*`);
    else keys.add(v.field);
  }
  const phrases = compliance.claims
    .filter((c) => c.status !== "verified" && c.action !== "keep")
    .map((c) => c.claim_text.toLowerCase())
    .filter(Boolean);
  // Scan each field on its own: the lexicon reports one match per rule per text.
  const mark = (key: FieldKey, text: string) => {
    const t = text.toLowerCase();
    if (phrases.some((p) => t.includes(p))) keys.add(key);
    else if (scanClaims(text, evidence).some((h) => h.status !== "verified")) keys.add(key);
  };
  mark("title", listing.title);
  mark("item_highlights", listing.item_highlights);
  listing.bullets.forEach((b, i) => mark(`bullets:${i}`, b));
  mark("description", listing.description);
  mark("search_terms", listing.search_terms);
  mark("seo_title", listing.seo_title);
  mark("seo_description", listing.seo_description);
  listing.tags.forEach((t, i) => mark(`tags:${i}`, t));
  return keys;
}

/** Take the model's text only for fields that had a problem; keep the rest byte-for-byte. */
export function keepUntouched(
  original: ListingDraft,
  proposed: ListingDraft,
  compliance: ComplianceReport,
  validation: ValidationReport,
  evidence: string,
): ListingDraft {
  const problems = problemFields(original, compliance, validation, evidence);
  const pick = <
    K extends
      | "title"
      | "item_highlights"
      | "description"
      | "search_terms"
      | "seo_title"
      | "seo_description",
  >(
    key: K,
  ) => (problems.has(key) ? proposed[key] : original[key]);
  const bullets = problems.has("bullets:*")
    ? proposed.bullets
    : original.bullets.map((b, i) =>
        problems.has(`bullets:${i}`) ? (proposed.bullets[i] ?? b) : b,
      );
  const tagsChanged =
    problems.has("tags:*") || original.tags.some((_, i) => problems.has(`tags:${i}`));
  return {
    title: pick("title"),
    item_highlights: pick("item_highlights"),
    bullets,
    description: pick("description"),
    search_terms: pick("search_terms"),
    seo_title: pick("seo_title"),
    seo_description: pick("seo_description"),
    tags: tagsChanged ? proposed.tags : original.tags,
  };
}

function countChanged(a: ListingDraft, b: ListingDraft): number {
  return fieldPairs(a, b).filter(([, , before, after]) => before !== after).length;
}

function fieldPairs(
  a: ListingDraft,
  b: ListingDraft,
): [ListingField, number | null, string, string][] {
  const pairs: [ListingField, number | null, string, string][] = [
    ["title", null, a.title, b.title],
    ["item_highlights", null, a.item_highlights, b.item_highlights],
  ];
  const n = Math.max(a.bullets.length, b.bullets.length);
  for (let i = 0; i < n; i++) pairs.push(["bullets", i, a.bullets[i] ?? "", b.bullets[i] ?? ""]);
  pairs.push(
    ["description", null, a.description, b.description],
    ["search_terms", null, a.search_terms, b.search_terms],
    ["seo_title", null, a.seo_title, b.seo_title],
    ["seo_description", null, a.seo_description, b.seo_description],
    ["tags", null, a.tags.join(", "), b.tags.join(", ")],
  );
  return pairs;
}

/** Field-level before/after with the reason for each change. */
export function diffListings(
  original: ListingDraft,
  fixed: ListingDraft,
  notes: RepairNote[],
  gateFixes: string[],
): FieldChange[] {
  return fieldPairs(original, fixed)
    .filter(([, , before, after]) => before !== after)
    .map(([field, index, before, after]) => {
      const note =
        notes.find((n) => n.field === field && n.index === index) ??
        notes.find((n) => n.field === field && n.index === null && index === null);
      const gate = gateFixes.find((g) => {
        const phrase = g.match(/"([^"]+)"/)?.[1]?.toLowerCase();
        return phrase ? before.toLowerCase().includes(phrase) : false;
      });
      return {
        field,
        index,
        before,
        after,
        reason: note?.reason ?? gate ?? "Updated to meet the marketplace's rules.",
      };
    });
}
