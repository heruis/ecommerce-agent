import {
  ComplianceReport,
  type ClaimAssessment,
  type ListingDraft,
  type ListingField,
  type PolicyRetriever,
  type ProductFacts,
  type ProductInput,
} from "@/lib/contracts";
import { runToolLoop, type AgentContext } from "@/lib/harness";
import { asSellerData } from "@/lib/guardrails/input";
import { renderFacts } from "../shared/seller-input";
import { complianceCandidates, complianceMock } from "./mock";
import { COMPLIANCE_SYSTEM } from "./prompt";
import { lookupEvidenceTool, searchPolicyTool, type RetrievalLog } from "./tools";

/**
 * Stage 4 — Compliance agent (smart tier, agentic RAG tool loop).
 * Every claim gets a status, evidence, policy citations and an action.
 */
export async function runCompliance(
  ctx: AgentContext,
  input: ProductInput,
  facts: ProductFacts,
  draft: ListingDraft,
  retriever: PolicyRetriever,
): Promise<ComplianceReport> {
  const log: RetrievalLog = new Map();
  const prescreen = complianceCandidates(draft, facts, input.evidence).map(
    (c) => `- "${c.text}" (${c.field}) — rule-based screen: ${c.rule.id}`,
  );

  const user = [
    "Review every claim in this draft listing and every seller marketing claim.",
    `## Draft listing\n${renderDraft(draft)}`,
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
      searchPolicyTool(retriever, input.platform, log),
      lookupEvidenceTool(facts, input.evidence),
    ],
    final: {
      name: "submit_compliance_report",
      description: "Submit the final compliance report with one assessment per claim.",
      schema: ComplianceReport,
    },
    maxTurns: 6,
    mock: complianceMock(draft, facts, input.evidence),
  });

  return enforceCitations(backstop(result.output, draft, facts, input.evidence), log);
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
  draft: ListingDraft,
  facts: ProductFacts,
  evidence: string,
): ComplianceReport {
  const covered = report.claims.map((c) => c.claim_text.toLowerCase());
  const extra: ClaimAssessment[] = [];
  for (const c of complianceCandidates(draft, facts, evidence)) {
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
    `search_terms: ${d.search_terms}`,
  ].join("\n");
}
