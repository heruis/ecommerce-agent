import type { ChannelResult, Listing, ListingDraft, Platform, RiskScore } from "@/lib/contracts";
import { allText } from "@/lib/guardrails/gate";
import { scanClaims } from "@/lib/guardrails/claims-lexicon";
import { validateListing } from "@/lib/rules";
import { buildPublishFields } from "./fields";
import { computeRisk } from "./risk";

export interface ChannelView extends ChannelResult {
  /** True when the seller edited this channel's copy after generation. */
  edited: boolean;
  /** Takedown-risk score of the copy the seller would publish (computed in code). */
  risk: RiskScore;
}

/**
 * What the seller should publish for each channel: the generated result, or
 * their saved edits re-validated and re-screened in code. Every surface
 * (workspace, printable report, exports) reads through this, so an edit can
 * never skip the rules check or quietly reintroduce a restricted claim.
 */
export function channelViews(listing: Listing): ChannelView[] {
  const r = listing.result;
  if (!r) return [];
  return r.channels.map((c) => {
    const edit = listing.edited?.[c.platform];
    const view = edit ? withEdits(listing, c, edit) : { ...c, edited: false };
    return {
      ...view,
      risk: computeRisk({
        listing: view.listing,
        compliance: r.compliance,
        validation: view.validation,
        evidence: listing.input.evidence,
      }),
    };
  });
}

export function channelView(listing: Listing, platform: Platform): ChannelView | null {
  return channelViews(listing).find((c) => c.platform === platform) ?? null;
}

function withEdits(
  listing: Listing,
  c: ChannelResult,
  edit: ListingDraft,
): Omit<ChannelView, "risk"> {
  const r = listing.result!;
  const validation = validateListing(edit, c.platform, { brand: listing.input.brand });
  const restricted = scanClaims(allText(edit), listing.input.evidence).filter(
    (h) => h.status === "restricted",
  );
  const errors = validation.violations.filter((v) => v.severity === "error");
  // Keep evidence questions whose phrase is still in the copy; replace the
  // generated draft's rule problems with the edit's own.
  const text = allText(edit).toLowerCase();
  const evidenceAsks = r.compliance.claims
    .filter((k) => k.action === "ask_seller")
    .filter((k) => k.field === "source" || text.includes(k.claim_text.toLowerCase()))
    .map((k) => `Confirm you have evidence for "${k.claim_text}" or remove it.`);
  const needs_review = [
    ...evidenceAsks,
    ...errors.map((e) => e.message),
    ...restricted.map((h) => `Your edit adds "${h.match}": ${h.rule.guidance}`),
  ];
  return {
    ...c,
    edited: true,
    listing: edit,
    validation,
    gate: {
      ...c.gate,
      decision: errors.length === 0 && restricted.length === 0 ? "pass" : "fail",
      needs_review: [...new Set(needs_review)],
    },
    fields: buildPublishFields({
      platform: c.platform,
      listing: edit,
      validation,
      input: listing.input,
      facts: r.facts,
      keywords: r.keywords,
    }),
  };
}
