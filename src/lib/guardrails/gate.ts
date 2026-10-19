import type {
  ComplianceReport,
  GateDecision,
  ListingDraft,
  Platform,
  ValidationReport,
} from "@/lib/contracts";
import { validateListing } from "@/lib/rules";
import { scanClaims, stripPhrase } from "./claims-lexicon";

/**
 * Layer 3 — the output policy gate (course Module 4: "the gate that blocks an
 * off-policy reply"). Runs in code after the compliance agent:
 *
 *   1. apply the agent's rewrite/remove actions to the draft
 *   2. sweep the result with the deterministic lexicon; strip anything still restricted
 *   3. re-validate platform rules
 *   4. PASS -> listing is ready (seller still confirms flagged items)
 *      FAIL -> listing is shown with blocking issues and cannot be exported as "ready"
 */
export interface GateResult {
  listing: ListingDraft;
  gate: GateDecision;
  validation: ValidationReport;
}

export function applyGate(args: {
  draft: ListingDraft;
  compliance: ComplianceReport;
  platform: Platform;
  brand: string;
  evidence: string;
}): GateResult {
  const fixes: string[] = [];
  const review: string[] = [];
  let listing: ListingDraft = {
    ...args.draft,
    bullets: [...args.draft.bullets],
    tags: [...args.draft.tags],
  };

  // 1. Agent-proposed actions. One compliance review covers every channel, so
  //    a verdict applies wherever the phrase appears, not only in claim.field.
  for (const claim of args.compliance.claims) {
    const present = allText(listing).toLowerCase().includes(claim.claim_text.toLowerCase());
    if (claim.action === "ask_seller" && (present || claim.field === "source")) {
      review.push(`Confirm you have evidence for "${claim.claim_text}" or remove it.`);
    }
    if (claim.field === "source" || !present) continue;
    if (claim.action === "rewrite" && claim.suggested_fix) {
      listing = mapText(listing, (t) =>
        replaceCaseAware(t, claim.claim_text, claim.suggested_fix!),
      );
      fixes.push(`Rewrote "${claim.claim_text}" → "${claim.suggested_fix}".`);
    } else if (claim.action === "remove") {
      listing = mapText(listing, (t) => stripPhrase(t, claim.claim_text));
      fixes.push(`Removed "${claim.claim_text}".`);
    }
  }

  // 2. Deterministic sweep: nothing restricted leaves this function. Re-scan
  //    after every strip, because one rule can match several phrases.
  const sweep = (text: string): string => {
    let out = text;
    for (let i = 0; i < 20; i++) {
      const hit = scanClaims(out, args.evidence).find((h) => h.status === "restricted");
      if (!hit) break;
      out = stripPhrase(out, hit.match);
      fixes.push(`Removed restricted phrase "${hit.match}" (${hit.rule.id}).`);
    }
    return out;
  };
  listing = mapText(listing, sweep);
  listing = {
    ...listing,
    bullets: listing.bullets.map(tidyBullet).filter((b) => b.length > 0),
    tags: listing.tags.map((t) => t.trim()).filter((t) => t.length > 0),
  };

  // 3. Re-validate
  const validation = validateListing(listing, args.platform, { brand: args.brand });
  const errors = validation.violations.filter((v) => v.severity === "error");
  for (const e of errors) review.push(e.message);

  const stillRestricted = scanClaims(allText(listing), args.evidence).filter(
    (h) => h.status === "restricted",
  );

  return {
    listing,
    validation,
    gate: {
      decision: errors.length === 0 && stillRestricted.length === 0 ? "pass" : "fail",
      applied_fixes: [...new Set(fixes)],
      needs_review: [...new Set(review)],
    },
  };
}

/** Apply a text transform to every shopper-visible field. */
function mapText(l: ListingDraft, fn: (t: string) => string): ListingDraft {
  return {
    title: fn(l.title),
    bullets: l.bullets.map(fn),
    description: fn(l.description),
    search_terms: fn(l.search_terms),
    seo_title: fn(l.seo_title),
    seo_description: fn(l.seo_description),
    tags: l.tags.map(fn),
  };
}

export function allText(l: ListingDraft): string {
  return [
    l.title,
    ...l.bullets,
    l.description,
    l.search_terms,
    l.seo_title,
    l.seo_description,
    ...l.tags,
  ].join("\n");
}

/** Replace a phrase case-insensitively, capitalizing the fix at a sentence or label start. */
export function replaceCaseAware(text: string, target: string, replacement: string): string {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(escaped, "gi"), (match, offset: number) => {
    const before = text.slice(0, offset);
    const atStart = before.trim() === "" || /[.:!?]\s*$/.test(before);
    const startsUpper = match[0] === match[0].toUpperCase();
    return atStart || startsUpper
      ? replacement[0].toUpperCase() + replacement.slice(1)
      : replacement;
  });
}

/** Clean a bullet after phrases were removed: drop dangling labels and empty bodies. */
function tidyBullet(b: string): string {
  const t = b.replace(/\s{2,}/g, " ").trim();
  if (/^[^:]{0,40}:\s*\.?$/.test(t)) return "";
  return t.replace(/^:\s*/, "");
}
