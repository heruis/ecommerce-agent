import {
  ComplianceReport,
  type ClaimAssessment,
  type ListingDraft,
  type ListingField,
  type Platform,
  type PolicyRetriever,
  type ProductFacts,
  type ProductInput,
} from "@/lib/contracts";
import { runToolLoop, type AgentContext } from "@/lib/harness";
import { asSellerData } from "@/lib/guardrails/input";
import { platformLabel } from "@/lib/rules";
import { renderFacts } from "../shared/seller-input";
import { complianceCandidates, complianceMock } from "./mock";
import { COMPLIANCE_SYSTEM } from "./prompt";
import { lookupEvidenceTool, searchPolicyTool, type RetrievalLog } from "./tools";

/**
 * Stage 4 — Compliance agent (smart tier, agentic RAG tool loop).
 * One review covers every channel's draft, so a claim is judged once and the
 * same verdict is applied on Amazon, TikTok Shop and Shopify.
 * Every claim gets a status, evidence, policy citations and an action.
 */
export async function runCompliance(
  ctx: AgentContext,
  input: ProductInput,
  facts: ProductFacts,
  drafts: ChannelDraft[],
  retriever: PolicyRetriever,
): Promise<ComplianceReport> {
  const log: RetrievalLog = new Map();
  const all = drafts.map((d) => d.draft);
  const prescreen = complianceCandidates(all, facts, input.evidence).map(
    (c) => `- "${c.text}" (${c.field}) — rule-based screen: ${c.rule.id}`,
  );

  const user = [
    "Review every claim in these draft listings and every seller marketing claim. The same claim can appear on several channels; assess it once.",
    ...drafts.map(
      (d) => `## Draft listing — ${platformLabel(d.platform)}\n${renderDraft(d.draft)}`,
    ),
    `## Product record\n${renderFacts(facts)}`,
    asSellerData("evidence", input.evidence || "(none provided)"),
    `## Rule-based pre-screen (hints, may be incomplete)\n${prescreen.join("\n") || "- nothing flagged"}`,
  ].join("\n\n");

  const result = await runToolLoop(ctx, {
    agent: "compliance",
    stage: "compliance",
    tier: "smart",
    effort: "medium",
    system: COMPLIANCE_SYSTEM,
    user,
    tools: [
      searchPolicyTool(retriever, input.platforms, log),
      lookupEvidenceTool(facts, input.evidence),
    ],
    final: {
      name: "submit_compliance_report",
      description: "Submit the final compliance report with one assessment per claim.",
      schema: ComplianceReport,
    },
    maxTurns: 6,
    mock: complianceMock(all, facts, input.evidence),
  });

  return enforceCitations(backstop(result.output, all, facts, input.evidence), log);
}

export interface ChannelDraft {
  platform: Platform;
  draft: ListingDraft;
}

/** Citation integrity: drop any policy reference the agent did not actually retrieve. */
export function enforceCitations(report: ComplianceReport, log: RetrievalLog): ComplianceReport {
  let dropped = 0;
  const claims = report.claims.map((c) => {
    const kept = c.policy_refs.filter((r) => log.has(r.chunk_id));
    dropped += c.policy_refs.length - kept.length;
    return { ...c, policy_refs: kept };
  });
  const uncertainty = dropped
    ? [
        ...report.uncertainty,
        `${dropped} citation(s) were removed because they did not come from the knowledge base.`,
      ]
    : report.uncertainty;
  return { ...report, claims, uncertainty };
}

/**
 * Lexicon backstop: a risky phrase in the draft that the agent missed is
 * added as its own assessment, so nothing restricted slips through.
 */
export function backstop(
  report: ComplianceReport,
  drafts: ListingDraft[],
  facts: ProductFacts,
  evidence: string,
): ComplianceReport {
  const covered = report.claims.map((c) => c.claim_text.toLowerCase());
  const extra: ClaimAssessment[] = [];
  for (const c of complianceCandidates(drafts, facts, evidence)) {
    if (c.field === "source") continue;
    const t = c.text.toLowerCase();
    if (covered.some((x) => x.includes(t) || t.includes(x))) continue;
    if (c.status === "verified") continue;
    extra.push({
      id: `k${report.claims.length + extra.length + 1}`,
      claim_text: c.text,
      field: c.field as ListingField,
      status: c.status,
      risk: c.rule.risk,
      reason: `Flagged by the rule-based screen: ${c.rule.guidance}`,
      evidence_fact_ids: [],
      policy_refs: [],
      action: c.status === "restricted" ? "remove" : "ask_seller",
      suggested_fix: null,
    });
  }
  return extra.length ? { ...report, claims: [...report.claims, ...extra] } : report;
}

function renderDraft(d: ListingDraft): string {
  return [
    `title: ${d.title}`,
    ...d.bullets.map((b, i) => `bullet ${i + 1}: ${b}`),
    `description: ${d.description}`,
    d.search_terms && `search_terms: ${d.search_terms}`,
    d.seo_title && `seo_title: ${d.seo_title}`,
    d.seo_description && `seo_description: ${d.seo_description}`,
    d.tags.length > 0 && `tags: ${d.tags.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}
