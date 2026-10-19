import type Anthropic from "@anthropic-ai/sdk";
import type {
  ClaimAssessment,
  ComplianceReport,
  ListingDraft,
  ListingField,
  PolicyRef,
  ProductFacts,
} from "@/lib/contracts";
import { scanClaims, type ClaimRule } from "@/lib/guardrails/claims-lexicon";
import type { LlmRequest, MockResponder } from "@/lib/harness";

const QUERY_FOR_RULE: Record<string, string> = {
  fda_approval: "FDA approved food contact product claim",
  absolute_safety: "100% safe absolute safety claim",
  ranking_number_one: "#1 best seller ranking claim",
  superlative: "best superlative claim",
  medical_claim: "disease treatment medical claim",
  antimicrobial: "antibacterial germ killing pesticide claim",
  non_toxic: "non-toxic claim substantiation evidence",
  eco_general: "eco-friendly environmental claim",
  biodegradable: "biodegradable compostable claim",
  made_in_usa: "made in USA origin claim",
  bpa_free: "BPA-free claim test report evidence",
  promo_guarantee: "promotional guarantee free shipping listing copy",
};

interface Candidate {
  rule: ClaimRule;
  field: ListingField | "source";
  text: string;
  status: ClaimAssessment["status"];
}

/**
 * Claims to review: risky phrases in every platform's draft (one entry per
 * phrase, at its first occurrence) plus the seller's own claims.
 */
export function complianceCandidates(
  drafts: ListingDraft[],
  facts: ProductFacts,
  evidence: string,
): Candidate[] {
  const out: Candidate[] = [];
  for (const draft of drafts) {
    const fields: [ListingField, string][] = [
      ["title", draft.title],
      ["bullets", draft.bullets.join("\n")],
      ["description", draft.description],
      ["search_terms", draft.search_terms],
      ["seo_title", draft.seo_title],
      ["seo_description", draft.seo_description],
      ["tags", draft.tags.join(" ")],
    ];
    for (const [field, text] of fields) {
      for (const hit of scanClaims(text, evidence)) {
        if (hit.language !== "en") continue;
        // One assessment per phrase: the gate applies it wherever it appears.
        const dup = out.some((c) => c.text.toLowerCase() === hit.match.toLowerCase());
        if (!dup) out.push({ rule: hit.rule, field, text: hit.match, status: hit.status });
      }
    }
  }
  for (const claim of facts.marketing_claims) {
    const hit = scanClaims(claim.text_zh, evidence)[0];
    if (!hit || out.some((c) => c.rule.id === hit.rule.id)) continue;
    out.push({ rule: hit.rule, field: "source", text: claim.text_en, status: hit.status });
  }
  return out;
}

/**
 * Scripted stand-in for the compliance agent (AI_MODE=mock):
 *   turn 1 -> search_policy for the riskiest claim types (max 4) + lookup_evidence per claim
 *   turn 2 -> submit_compliance_report built from what the tools returned
 */
export function complianceMock(
  drafts: ListingDraft[],
  facts: ProductFacts,
  evidence: string,
): MockResponder {
  return (req) => {
    const candidates = complianceCandidates(drafts, facts, evidence);
    const calls = toolCallsWithResults(req);

    if (calls.length === 0 && candidates.length > 0) {
      const riskOrder = { high: 0, medium: 1, low: 2 } as const;
      const rules = [...new Map(candidates.map((c) => [c.rule.id, c.rule])).values()]
        .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk])
        .slice(0, 4);
      return {
        text: `Reviewing ${candidates.length} claims. Searching policy for the riskiest types first.`,
        toolCalls: [
          ...rules.map((r) => ({
            name: "search_policy",
            input: { query: QUERY_FOR_RULE[r.id] ?? r.id },
          })),
          ...candidates
            .slice(0, 6)
            .map((c) => ({ name: "lookup_evidence", input: { claim: c.text } })),
        ],
      };
    }

    const retrieved: PolicyRef[] = [];
    for (const call of calls) {
      if (call.name !== "search_policy") continue;
      const parsed = safeJson(call.result) as { results?: PolicyRef[] } | null;
      for (const r of parsed?.results ?? []) {
        retrieved.push({ doc_id: r.doc_id, chunk_id: r.chunk_id, title: r.title, url: r.url });
      }
    }

    const claims: ClaimAssessment[] = candidates.map((c, i) => assess(c, i, facts, retrieved));
    const report: ComplianceReport = {
      claims,
      summary: summarize(claims),
      uncertainty: claims
        .filter((c) => c.status === "unverified")
        .map((c) => `No evidence was provided for "${c.claim_text}".`),
    };
    return {
      text: "Submitting the compliance report.",
      toolCalls: [{ name: "submit_compliance_report", input: report }],
    };
  };
}

function assess(
  c: Candidate,
  i: number,
  facts: ProductFacts,
  retrieved: PolicyRef[],
): ClaimAssessment {
  const refs = retrieved.filter((r) => c.rule.policy_docs.includes(r.doc_id)).slice(0, 2);
  const material = facts.facts.find((f) => f.attribute === "material")?.value;
  let action: ClaimAssessment["action"] = "keep";
  let suggested_fix: string | null = null;

  if (c.status === "restricted") {
    if (c.rule.id === "fda_approval" && material) {
      action = "rewrite";
      suggested_fix = `made with ${material}`;
    } else {
      action = "remove";
    }
  } else if (c.status === "unverified") {
    if (c.rule.id === "eco_general" && c.field !== "source") {
      action = "rewrite";
      suggested_fix = "Reusable";
    } else if (c.rule.id === "superlative" && c.field !== "source") {
      action = "remove";
    } else {
      action = "ask_seller";
    }
  }

  return {
    id: `k${i + 1}`,
    claim_text: c.text,
    field: c.field,
    status: c.status,
    risk: c.rule.risk,
    reason: c.rule.guidance,
    evidence_fact_ids:
      c.status === "verified" && material
        ? facts.facts.filter((f) => f.attribute === "material").map((f) => f.id)
        : [],
    policy_refs: refs,
    action,
    suggested_fix,
  };
}

function summarize(claims: ClaimAssessment[]): string {
  if (claims.length === 0) return "No marketing claims needed review.";
  const n = (s: ClaimAssessment["status"]) => claims.filter((c) => c.status === s).length;
  return `Reviewed ${claims.length} claims: ${n("restricted")} restricted, ${n("unverified")} need evidence, ${n("verified")} verified.`;
}

/** Pair each tool_use in the conversation with its tool_result content. */
function toolCallsWithResults(req: LlmRequest): { name: string; input: unknown; result: string }[] {
  const uses = new Map<string, { name: string; input: unknown }>();
  const out: { name: string; input: unknown; result: string }[] = [];
  for (const m of req.messages) {
    if (typeof m.content === "string") continue;
    for (const block of m.content as Anthropic.ContentBlockParam[]) {
      if (block.type === "tool_use") uses.set(block.id, { name: block.name, input: block.input });
      if (block.type === "tool_result") {
        const use = uses.get(block.tool_use_id);
        const content =
          typeof block.content === "string" ? block.content : JSON.stringify(block.content);
        if (use) out.push({ ...use, result: content });
      }
    }
  }
  return out;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
