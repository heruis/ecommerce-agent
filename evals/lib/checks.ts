import type { PipelineResult, ProductInputDraft } from "@/lib/contracts";
import { CLAIM_RULES } from "@/lib/guardrails";
import type { RunOutcome } from "@/lib/pipeline";

/**
 * Rubric for one golden case, scored on the four dimensions from the course
 * (Module 2/3): outcome, process, output contract, efficiency.
 * A case passes only if every dimension passes.
 */
export interface GoldenCase {
  id: string;
  note: string;
  input: ProductInputDraft;
  expect: {
    blocked?: boolean;
    must_flag?: string[];
    must_not_appear?: string[];
    required_facts?: { attribute: string; contains: string }[];
    min_score?: number;
    max_llm_calls?: number;
  };
}

export interface CaseResult {
  id: string;
  pass: boolean;
  dimensions: Record<
    "outcome" | "process" | "output_contract" | "efficiency",
    { pass: boolean; notes: string[] }
  >;
  score: number | null;
  llm_calls: number;
  latency_ms: number;
  cost_usd: number;
}

export function checkCase(c: GoldenCase, outcome: RunOutcome, latencyMs: number): CaseResult {
  const e = c.expect;
  const r = outcome.result;
  const usage = outcome.run.usage;
  const dim = () => ({ pass: true, notes: [] as string[] });
  const d = { outcome: dim(), process: dim(), output_contract: dim(), efficiency: dim() };
  const fail = (k: keyof typeof d, note: string) => {
    d[k].pass = false;
    d[k].notes.push(note);
  };

  if (e.blocked) {
    if (outcome.error?.code !== "guardrail_blocked")
      fail(
        "outcome",
        `expected the input to be blocked, got ${outcome.error?.code ?? "a completed run"}`,
      );
  } else if (!r) {
    fail("outcome", `run failed: ${outcome.error?.code} ${outcome.error?.message}`);
  } else {
    const text = listingText(r).toLowerCase();
    for (const f of e.required_facts ?? []) {
      if (!text.includes(f.contains.toLowerCase()))
        fail("outcome", `listing does not mention ${f.attribute} "${f.contains}"`);
    }
    if (e.min_score !== undefined && r.score.total < e.min_score)
      fail("outcome", `score ${r.score.total} < ${e.min_score}`);

    for (const ruleId of e.must_flag ?? []) {
      const rule = CLAIM_RULES.find((x) => x.id === ruleId);
      const flagged = r.compliance.claims.some(
        (cl) =>
          cl.status !== "verified" &&
          rule &&
          (rule.en.test(cl.claim_text) || rule.zh.test(cl.claim_text)),
      );
      if (!flagged) fail("process", `claim type "${ruleId}" was not flagged`);
    }
    const uncited = r.compliance.claims.filter(
      (cl) => cl.status === "restricted" && cl.policy_refs.length === 0,
    );
    if (uncited.length)
      fail("process", `${uncited.length} restricted claim(s) without a policy citation`);

    for (const phrase of e.must_not_appear ?? []) {
      if (text.includes(phrase.toLowerCase()))
        fail("output_contract", `final listing contains "${phrase}"`);
    }
    if (r.gate.decision !== "pass")
      fail("output_contract", `policy gate failed: ${r.gate.needs_review.join("; ")}`);
    if (!r.validation.passed) fail("output_contract", "platform validation failed");
  }

  if (e.max_llm_calls !== undefined && usage.llm_calls > e.max_llm_calls) {
    fail("efficiency", `${usage.llm_calls} LLM calls > ${e.max_llm_calls}`);
  }

  return {
    id: c.id,
    pass: Object.values(d).every((x) => x.pass),
    dimensions: d,
    score: r?.score.total ?? null,
    llm_calls: usage.llm_calls,
    latency_ms: latencyMs,
    cost_usd: usage.cost_usd,
  };
}

function listingText(r: PipelineResult): string {
  return [
    r.listing.title,
    ...r.listing.bullets,
    r.listing.description,
    r.listing.search_terms,
  ].join("\n");
}
