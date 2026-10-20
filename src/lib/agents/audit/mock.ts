import type { ComplianceReport, ListingDraft, Platform } from "@/lib/contracts";
import { replaceCaseAware } from "@/lib/guardrails/gate";
import { stripPhrase } from "@/lib/guardrails/claims-lexicon";
import { repairRules, type RepairNote } from "./repair";

/**
 * Offline stand-in for the minimal-fix agent (AI_MODE=mock): apply the
 * compliance review's rewrite/remove actions, then the deterministic rule
 * repairs. Deterministic, so evals and tests are reproducible.
 */
export function mockAuditFix(args: {
  platform: Platform;
  original: ListingDraft;
  compliance: ComplianceReport;
  brand: string;
}): { listing: ListingDraft; notes: RepairNote[] } {
  const notes: RepairNote[] = [];
  let listing: ListingDraft = {
    ...args.original,
    bullets: [...args.original.bullets],
    tags: [...args.original.tags],
  };

  for (const claim of args.compliance.claims) {
    if (claim.status === "verified") continue;
    if (claim.action !== "rewrite" && claim.action !== "remove") continue;
    const target = claim.claim_text;
    const apply = (text: string) => {
      const out =
        claim.action === "rewrite" && claim.suggested_fix
          ? replaceCaseAware(text, target, claim.suggested_fix)
          : stripPhrase(text, target);
      return out.charAt(0).toUpperCase() + out.slice(1);
    };
    const has = (text: string) => text.toLowerCase().includes(target.toLowerCase());
    const reason =
      claim.action === "rewrite" && claim.suggested_fix
        ? `Replaced "${target}" with "${claim.suggested_fix}": ${claim.reason}`
        : `Removed "${target}": ${claim.reason}`;

    if (has(listing.title)) {
      listing.title = apply(listing.title);
      notes.push({ field: "title", index: null, reason });
    }
    listing.bullets = listing.bullets.map((b, i) => {
      if (!has(b)) return b;
      notes.push({ field: "bullets", index: i, reason });
      return apply(b);
    });
    for (const field of ["description", "search_terms", "seo_title", "seo_description"] as const) {
      if (has(listing[field])) {
        listing = { ...listing, [field]: apply(listing[field]) };
        notes.push({ field, index: null, reason });
      }
    }
  }

  const repaired = repairRules(listing, args.platform, { brand: args.brand });
  return { listing: repaired.listing, notes: [...notes, ...repaired.notes] };
}
