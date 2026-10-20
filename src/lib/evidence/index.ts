import type { EvidenceItem, EvidenceKind } from "@/lib/contracts";

/**
 * Evidence library helpers. A claim stays in a listing only if a document
 * backs it, so the documents a seller picks are rendered into the plain
 * `evidence` text the pipeline already reads (the compliance agent's
 * lookup_evidence tool and the claim lexicon both search it).
 * Owner: WS3 (UI) / WS2 (how evidence is judged).
 */

export const EVIDENCE_LIMIT = 100;
/** Documents expiring within this many days are flagged in the library. */
export const EXPIRING_SOON_DAYS = 30;
/** ProductInput.evidence max length. */
export const EVIDENCE_TEXT_MAX = 4000;

export type ExpiryState = "no_expiry" | "valid" | "expiring" | "expired";

const DAY_MS = 86_400_000;

/** Whole days from `today` to the expiry date (negative once expired). */
export function expiry(
  item: Pick<EvidenceItem, "expires_on">,
  today: Date = new Date(),
): { state: ExpiryState; days: number | null } {
  if (!item.expires_on) return { state: "no_expiry", days: null };
  const end = Date.parse(`${item.expires_on}T00:00:00Z`);
  if (Number.isNaN(end)) return { state: "no_expiry", days: null };
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Math.round((end - start) / DAY_MS);
  if (days < 0) return { state: "expired", days };
  return { state: days <= EXPIRING_SOON_DAYS ? "expiring" : "valid", days };
}

const KIND_LABEL: Record<EvidenceKind, string> = {
  test_report: "test report",
  certificate: "certificate",
  registration: "registration",
  invoice: "supplier invoice",
  other: "document",
};

/** One line per document, in English, the way the compliance agent reads evidence. */
export function evidenceLine(item: EvidenceItem): string {
  const parts = [`${item.name} (${KIND_LABEL[item.kind]})`];
  if (item.issuer) parts.push(`issued by ${item.issuer}`);
  if (item.reference) parts.push(`ref. ${item.reference}`);
  if (item.expires_on) parts.push(`valid until ${item.expires_on}`);
  if (item.claims.length) parts.push(`supports: ${item.claims.join(", ")}`);
  if (item.notes) parts.push(item.notes.replace(/\s+/g, " "));
  return `- ${parts.join(" — ")}`;
}

/**
 * Render the chosen documents as evidence text. Expired documents are left
 * out (an expired certificate does not back a claim) and named in a note so
 * the seller sees why. Output never exceeds `max` characters.
 */
export function evidenceText(
  items: EvidenceItem[],
  today: Date = new Date(),
  max = EVIDENCE_TEXT_MAX,
): string {
  if (items.length === 0) return "";
  const usable = items.filter((i) => expiry(i, today).state !== "expired");
  const expired = items.filter((i) => expiry(i, today).state === "expired");
  const lines: string[] = [];
  if (usable.length) lines.push("Documents from the seller's evidence library:");
  let used = lines.join("\n").length;
  let dropped = 0;
  for (const item of usable) {
    const line = evidenceLine(item);
    if (used + line.length + 1 > max - 300) {
      dropped += 1;
      continue;
    }
    lines.push(line);
    used += line.length + 1;
  }
  if (dropped) {
    lines.push(`(${dropped} more document(s) left out to stay within the length limit.)`);
  }
  if (expired.length) {
    const names = expired.map((e) => `${e.name}, expired ${e.expires_on}`).join("; ");
    lines.push(`(Not used — expired: ${names.slice(0, 250)}.)`);
  }
  return lines.join("\n").slice(0, max);
}

/** Combine what the seller typed with the library documents they picked. */
export function mergeEvidence(typed: string, fromLibrary: string, max = EVIDENCE_TEXT_MAX): string {
  return [typed.trim(), fromLibrary.trim()].filter(Boolean).join("\n\n").slice(0, max);
}
