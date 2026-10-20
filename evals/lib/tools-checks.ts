import type {
  AppealInputDraft,
  AppealResult,
  AuditInputDraft,
  AuditResult,
  ExplanationLanguage,
  ListingDraft,
} from "@/lib/contracts";
import { CLAIM_RULES } from "@/lib/guardrails";
import { allText } from "@/lib/guardrails/gate";
import { problemFields } from "@/lib/pipeline/audit";
import type { ToolOutcome } from "@/lib/pipeline/tool-run";
import { loadCorpus } from "@/lib/rag";

/**
 * Rubrics for the suite tools, on the same four dimensions as the golden
 * pipeline cases (outcome, process, output contract, efficiency). A case
 * passes only if every dimension passes.
 */
export type Dimension = "outcome" | "process" | "output_contract" | "efficiency";

export interface ToolCaseResult {
  id: string;
  pass: boolean;
  dimensions: Record<Dimension, { pass: boolean; notes: string[] }>;
  llm_calls: number;
  latency_ms: number;
  cost_usd: number;
}

export interface AuditCase {
  id: string;
  note: string;
  input: AuditInputDraft;
  expect: {
    must_flag?: string[];
    must_not_appear?: string[];
    risk_drop?: boolean;
    no_changes?: boolean;
    max_risk_after?: number;
    fixed_passes?: boolean;
    max_title_chars?: number;
    max_llm_calls?: number;
  };
}

export interface AppealCase {
  id: string;
  note: string;
  language: ExplanationLanguage;
  input: AppealInputDraft;
  expect: {
    policy_area_any: string[];
    must_cite: boolean;
    explanation_language: ExplanationLanguage;
    max_llm_calls?: number;
  };
}

function scaffold() {
  const dim = () => ({ pass: true, notes: [] as string[] });
  const d = { outcome: dim(), process: dim(), output_contract: dim(), efficiency: dim() };
  const fail = (k: Dimension, note: string) => {
    d[k].pass = false;
    d[k].notes.push(note);
  };
  return { d, fail };
}

function finish(
  id: string,
  d: ToolCaseResult["dimensions"],
  outcome: ToolOutcome<unknown>,
  latencyMs: number,
): ToolCaseResult {
  return {
    id,
    pass: Object.values(d).every((x) => x.pass),
    dimensions: d,
    llm_calls: outcome.usage.llm_calls,
    latency_ms: latencyMs,
    cost_usd: outcome.usage.cost_usd,
  };
}

const CJK = /[㐀-鿿]/;

export function checkAuditCase(
  c: AuditCase,
  outcome: ToolOutcome<AuditResult>,
  latencyMs: number,
): ToolCaseResult {
  const { d, fail } = scaffold();
  const e = c.expect;
  const r = outcome.result;
  if (!r) {
    fail("outcome", `run failed: ${outcome.error?.code} ${outcome.error?.message}`);
  } else {
    // Outcome: the fix lowers the risk (or leaves a clean listing alone).
    if (e.risk_drop && !(r.risk_after.score < r.risk_before.score)) {
      fail("outcome", `risk did not drop (${r.risk_before.score} -> ${r.risk_after.score})`);
    }
    if (e.no_changes && r.changes.length > 0) {
      fail("outcome", `expected no changes, got ${r.changes.length}`);
    }
    if (e.max_risk_after !== undefined && r.risk_after.score > e.max_risk_after) {
      fail("outcome", `risk after ${r.risk_after.score} > ${e.max_risk_after}`);
    }

    // Process: the review flagged the expected claim types and cited restricted ones.
    for (const ruleId of e.must_flag ?? []) {
      const rule = CLAIM_RULES.find((x) => x.id === ruleId);
      const flagged = r.compliance.claims.some(
        (cl) =>
          cl.status !== "verified" &&
          rule !== undefined &&
          (rule.en.test(cl.claim_text) || rule.zh.test(cl.claim_text)),
      );
      if (!flagged) fail("process", `claim type "${ruleId}" was not flagged`);
    }
    const uncited = r.compliance.claims.filter(
      (cl) => cl.status === "restricted" && cl.policy_refs.length === 0,
    );
    if (uncited.length) fail("process", `${uncited.length} restricted claim(s) without a citation`);

    // Output contract: no risky phrase left, rules pass, untouched fields identical.
    const text = allText(r.fixed).toLowerCase();
    for (const phrase of e.must_not_appear ?? []) {
      if (text.includes(phrase.toLowerCase()))
        fail("output_contract", `fixed listing contains "${phrase}"`);
    }
    if (e.fixed_passes && !r.fixed_validation.passed) {
      fail(
        "output_contract",
        `fixed listing breaks rules: ${r.fixed_validation.violations
          .filter((v) => v.severity === "error")
          .map((v) => v.rule_id)
          .join(", ")}`,
      );
    }
    if (e.max_title_chars !== undefined && r.fixed.title.length > e.max_title_chars) {
      fail("output_contract", `title is ${r.fixed.title.length} chars`);
    }
    const touched = untouchedChanged(r);
    if (touched.length)
      fail("output_contract", `fields without a problem changed: ${touched.join(", ")}`);
  }
  if (e.max_llm_calls !== undefined && outcome.usage.llm_calls > e.max_llm_calls) {
    fail("efficiency", `${outcome.usage.llm_calls} LLM calls > ${e.max_llm_calls}`);
  }
  return finish(c.id, d, outcome, latencyMs);
}

/** Fields the audit had no reason to touch but changed anyway. */
export function untouchedChanged(r: AuditResult): string[] {
  const problems = problemFields(r.original, r.compliance, r.original_validation, "");
  const out: string[] = [];
  const same = (k: keyof ListingDraft) =>
    JSON.stringify(r.original[k]) === JSON.stringify(r.fixed[k]);
  for (const k of [
    "title",
    "description",
    "search_terms",
    "seo_title",
    "seo_description",
  ] as const) {
    if (!problems.has(k) && !same(k)) out.push(k);
  }
  if (!problems.has("bullets:*")) {
    r.original.bullets.forEach((b, i) => {
      if (!problems.has(`bullets:${i}`) && r.fixed.bullets[i] !== b) out.push(`bullets[${i}]`);
    });
  }
  const tagProblem =
    problems.has("tags:*") || r.original.tags.some((_, i) => problems.has(`tags:${i}`));
  if (!tagProblem && !same("tags")) out.push("tags");
  return out;
}

let knownChunks: Set<string> | null = null;

export function checkAppealCase(
  c: AppealCase,
  outcome: ToolOutcome<AppealResult>,
  latencyMs: number,
): ToolCaseResult {
  const { d, fail } = scaffold();
  const e = c.expect;
  const r = outcome.result;
  if (!r) {
    fail("outcome", `run failed: ${outcome.error?.code} ${outcome.error?.message}`);
  } else {
    const area = r.policy_area.toLowerCase();
    if (!e.policy_area_any.some((k) => area.includes(k.toLowerCase()))) {
      fail(
        "outcome",
        `policy area "${r.policy_area}" does not match ${e.policy_area_any.join(" / ")}`,
      );
    }
    if (!r.likely_cause.trim()) fail("outcome", "no likely cause given");

    // Process: cited from the knowledge base (never invented).
    knownChunks ??= new Set(loadCorpus().chunks.map((ch) => ch.chunk_id));
    const invented = r.policy_refs.filter((p) => !knownChunks!.has(p.chunk_id));
    if (invented.length)
      fail("process", `${invented.length} citation(s) not in the knowledge base`);
    if (e.must_cite && r.policy_refs.length === 0) fail("process", "no policy citation");

    // Output contract: English appeal, explanations in the seller's language, no promised documents.
    if (CJK.test(r.appeal_text)) fail("output_contract", "appeal text is not English");
    const explanationIsChinese = CJK.test(`${r.what_happened}${r.likely_cause}`);
    if (e.explanation_language === "zh" && !explanationIsChinese) {
      fail("output_contract", "explanation is not in Chinese");
    }
    if (e.explanation_language === "en" && explanationIsChinese) {
      fail("output_contract", "explanation is not in English");
    }
    const evidence = (c.input.evidence ?? "").trim();
    if (!evidence && /\battached\b|\benclosed\b|\bplease find\b/i.test(r.appeal_text)) {
      fail("output_contract", "appeal promises documents the seller did not list");
    }
  }
  if (e.max_llm_calls !== undefined && outcome.usage.llm_calls > e.max_llm_calls) {
    fail("efficiency", `${outcome.usage.llm_calls} LLM calls > ${e.max_llm_calls}`);
  }
  return finish(c.id, d, outcome, latencyMs);
}
