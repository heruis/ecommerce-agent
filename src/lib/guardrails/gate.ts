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
  let listing: ListingDraft = { ...args.draft, bullets: [...args.draft.bullets] };

  // 1. Agent-proposed actions
  for (const claim of args.compliance.claims) {
    if (claim.action === "ask_seller") {
      review.push(`Confirm you have evidence for "${claim.claim_text}" or remove it.`);
    }
    if (claim.field === "source") continue;
    if (claim.action === "rewrite" && claim.suggested_fix) {
      const before = JSON.stringify(listing);
      listing = mapFields(listing, claim.field, (t) =>
        replaceCaseAware(t, claim.claim_text, claim.suggested_fix!),
      );
      if (JSON.stringify(listing) !== before)
        fixes.push(`Rewrote "${claim.claim_text}" → "${claim.suggested_fix}".`);
    } else if (claim.action === "remove") {
      const before = JSON.stringify(listing);
      listing = mapFields(listing, claim.field, (t) => stripPhrase(t, claim.claim_text));
      if (JSON.stringify(listing) !== before) fixes.push(`Removed "${claim.claim_text}".`);
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
  listing = {
    title: sweep(listing.title),
    bullets: listing.bullets.map(sweep),
    description: sweep(listing.description),
    search_terms: sweep(listing.search_terms),
  };
  listing = { ...listing, bullets: listing.bullets.map(tidyBullet).filter((b) => b.length > 0) };

  // 3. Re-validate
  const validation = validateListing(listing, args.platform, { brand: args.brand });
  const errors = validation.violations.filter((v) => v.severity === "error");
  for (const e of errors) review.push(e.message);

  const stillRestricted = scanClaims(
    [listing.title, ...listing.bullets, listing.description, listing.search_terms].join("\n"),
    args.evidence,
  ).filter((h) => h.status === "restricted");

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

function mapFields(l: ListingDraft, field: string, fn: (t: string) => string): ListingDraft {
  switch (field) {
    case "title":
      return { ...l, title: fn(l.title) };
    case "bullets":
      return { ...l, bullets: l.bullets.map(fn) };
    case "description":
      return { ...l, description: fn(l.description) };
    case "search_terms":
      return { ...l, search_terms: fn(l.search_terms) };
    default:
      return l;
  }
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
