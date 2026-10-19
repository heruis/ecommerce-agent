import type { Listing } from "@/lib/contracts";
import { platformLabel } from "@/lib/rules";
import { channelViews } from "./view";

/**
 * The downloadable report: everything a seller needs to fill in each
 * marketplace's "add product" form, in one Markdown file. Owner: WS3 (format) / lead.
 */
export function reportMarkdown(listing: Listing): string {
  const r = listing.result;
  if (!r) return "# ShelfPass report\n\nThis listing has not been generated yet.\n";
  const lines: string[] = [];
  const push = (...l: string[]) => lines.push(...l);

  push(`# ShelfPass listing report — ${titleCase(r.facts.product_type)}`, "");
  push(
    `Source product: ${listing.input.title_zh}`,
    `Generated: ${listing.updated_at.slice(0, 10)}`,
    "",
  );
  push(
    "> Risk screening based on summarized marketplace and US rules. Not legal advice; not a guarantee of approval. Keywords are AI-suggested.",
    "",
  );

  push("## Keywords", "");
  push(`- **Primary:** ${r.keywords.primary.join(", ")}`);
  push(`- **Secondary:** ${r.keywords.secondary.join(", ")}`);
  if (r.keywords.hashtags.length)
    push(`- **TikTok hashtags:** ${r.keywords.hashtags.map((h) => `#${h}`).join(" ")}`);
  push("");

  push("## Photos", "");
  if (r.images.analysis && r.images.analysis.images.length) {
    for (const o of r.images.analysis.images) {
      push(
        `- Photo ${o.index + 1}: ${o.shows} — background: ${o.background.replace("_", " ")}; alt text: "${o.alt_text}"`,
      );
    }
  } else {
    push("No photos were uploaded. Use the checklists below.");
  }
  push("");

  for (const c of channelViews(listing)) {
    push(
      `## ${platformLabel(c.platform)} — quality ${c.score.total}/100 — policy gate ${c.gate.decision.toUpperCase()}`,
      "",
    );
    if (c.edited) push("_Includes your edits (re-checked against the rules)._", "");
    push("| Field | Value | Status |", "|---|---|---|");
    for (const f of c.fields) {
      const value = f.value;
      push(
        `| ${f.label}${f.required ? " *" : ""} | ${cell(value || (f.source === "seller" ? "_you fill in_" : "—"))} | ${f.status}${f.note ? ` — ${cell(f.note)}` : ""} |`,
      );
    }
    push("", "**Main image**");
    const verdict = r.images.main_image.find((m) => m.platform === c.platform);
    if (verdict?.index !== null && verdict) {
      push(
        `- Suggested main photo: ${verdict.index + 1} — ${verdict.ok ? "meets the rules" : verdict.issues.join(" ")}`,
      );
    }
    for (const rule of c.images.main_image_rules) push(`- ${rule}`);
    push(`- ${c.images.gallery}`, "", "**Shot list**");
    for (const s of c.images.shot_list) push(`- ${s}`);
    if (c.gate.needs_review.length) {
      push("", "**Confirm before publishing**");
      for (const n of c.gate.needs_review) push(`- ${n}`);
    }
    push("");
  }

  push("## Claim review", "");
  push(r.compliance.summary, "");
  for (const cl of r.compliance.claims) {
    const fix = cl.suggested_fix ? ` → "${cl.suggested_fix}"` : "";
    const src = cl.policy_refs.map((p) => `[${p.title}](${p.url})`).join("; ");
    push(
      `- **${cl.status}** "${cl.claim_text}" — ${cl.action.replace("_", " ")}${fix}. ${cl.reason}${src ? ` Sources: ${src}` : ""}`,
    );
  }
  push("");
  return lines.join("\n");
}

function cell(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}
