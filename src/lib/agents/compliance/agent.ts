import {
  ComplianceReport,
  type ClaimAssessment,
  type ListingDraft,
  type Platform,
  type PolicyRef,
  type PolicyRetriever,
  type ProductFacts,
  type ProductInput,
} from "@/lib/contracts";
import { runToolLoop, type AgentContext } from "@/lib/harness";
import { CLAIM_RULES } from "@/lib/guardrails/claims-lexicon";
import { asSellerData } from "@/lib/guardrails/input";
import { platformLabel } from "@/lib/rules";
import { renderFacts } from "../shared/seller-input";
import { complianceCandidates, complianceMock, QUERY_FOR_RULE } from "./mock";
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

  const report = enforceCitations(backstop(result.output, all, facts, input.evidence), log);
  return citeRestricted(report, retriever, input.platforms);
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
 * Every restricted claim carries a policy citation (PRD F-16). A claim the
 * agent left uncited, or whose made-up citation was dropped, gets one from the
 * same retriever the agent uses: preferably from its lexicon rule's policy docs.
 */
export async function citeRestricted(
  report: ComplianceReport,
  retriever: PolicyRetriever,
  platforms: readonly Platform[],
): Promise<ComplianceReport> {
  let added = 0;
  const claims = await Promise.all(
    report.claims.map(async (c) => {
      if (c.status !== "restricted" || c.policy_refs.length > 0) return c;
      const rule = CLAIM_RULES.find((r) => r.en.test(c.claim_text) || r.zh.test(c.claim_text));
      const query = rule
        ? `${QUERY_FOR_RULE[rule.id] ?? rule.claim_type} ${c.claim_text}`
        : `${c.claim_text} ${c.reason}`;
      const hits = await retriever.search(query, { k: 8, platforms });
      const hit = (rule && hits.find((h) => rule.policy_docs.includes(h.doc_id))) ?? hits[0];
      if (!hit) return c;
      added++;
      const ref: PolicyRef = {
        doc_id: hit.doc_id,
        chunk_id: hit.chunk_id,
        title: hit.title,
        url: hit.url,
      };
      return { ...c, policy_refs: [ref] };
    }),
  );
  if (!added) return report;
  return {
    ...report,
    claims,
    uncertainty: [
      ...report.uncertainty,
      `${added} restricted claim(s) were cited automatically from the policy knowledge base.`,
    ],
  };
}

/**
 * Lexicon backstop: a risky phrase in the draft, or a risky seller claim, that
 * the agent did not assess is added as its own assessment, so nothing
 * restricted slips through or goes unreported.
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
    const t = c.text.toLowerCase();
    if (covered.some((x) => x.includes(t) || t.includes(x))) continue;
    // A seller claim counts as assessed when any assessment matches its rule,
    // whatever wording the agent used ("Degradable", "可降解", ...).
    if (
      c.field === "source" &&
      report.claims.some((k) => c.rule.en.test(k.claim_text) || c.rule.zh.test(k.claim_text))
    ) {
      continue;
    }
    if (c.status === "verified") continue;
    // One verdict per phrase: a seller claim that triggers several rules keeps the strictest.
    const same = extra.findIndex((x) => x.claim_text.toLowerCase() === t);
    if (same >= 0) {
      if (extra[same].status === "restricted" || c.status !== "restricted") continue;
      extra.splice(same, 1);
    }
    extra.push({
      id: "",
      claim_text: c.text,
      field: c.field,
      status: c.status,
      risk: c.rule.risk,
      reason: `Flagged by the rule-based screen: ${c.rule.guidance}`,
      evidence_fact_ids: [],
      policy_refs: [],
      action: c.status === "restricted" ? "remove" : "ask_seller",
      suggested_fix: null,
    });
  }
  if (!extra.length) return report;
  const numbered = extra.map((x, i) => ({ ...x, id: `k${report.claims.length + i + 1}` }));
  return { ...report, claims: [...report.claims, ...numbered] };
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
