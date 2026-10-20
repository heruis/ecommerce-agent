import {
  AppealResult,
  type AppealInput,
  type ExplanationLanguage,
  type PolicyRetriever,
} from "@/lib/contracts";
import { asSellerData } from "@/lib/guardrails/input";
import { runToolLoop, type AgentContext } from "@/lib/harness";
import { searchPolicyTool, type RetrievalLog } from "../compliance/tools";
import { appealMock } from "./mock";
import { appealSystem } from "./prompt";

/** What the agent submits; language and warnings are set in code. */
export const AppealAnalysis = AppealResult.omit({ language: true, warnings: true });

const CJK = /[㐀-鿿]/;
const PROMISED_DOCS = /\battached\b|\benclosed\b|\bplease find\b/i;

/**
 * Takedown / appeal assistant (smart tier, agentic RAG tool loop). The agent
 * finds the policy behind the notice with search_policy, then submits the
 * cause, the fix and an English appeal. Code then enforces what a prompt
 * cannot guarantee: citation integrity, an English appeal, no documents
 * promised that the seller does not hold.
 */
export async function runAppealAnalysis(
  ctx: AgentContext,
  input: AppealInput,
  language: ExplanationLanguage,
  retriever: PolicyRetriever,
): Promise<AppealResult> {
  const log: RetrievalLog = new Map();
  const user = [
    "Analyze this marketplace notice and help the seller fix the listing and appeal.",
    asSellerData("notice", input.notice),
    asSellerData("listing", input.listing_text || "(not provided)"),
    asSellerData("seller_note", input.seller_note || "(none)"),
    asSellerData("evidence", input.evidence || "(the seller listed no documents)"),
  ].join("\n\n");

  const result = await runToolLoop(ctx, {
    agent: "appeal",
    stage: "compliance",
    platform: input.platform,
    tier: "smart",
    effort: "medium",
    system: appealSystem(input.platform, language),
    user,
    tools: [{ ...searchPolicyTool(retriever, [input.platform], log), maxCalls: 3 }],
    final: {
      name: "submit_appeal_analysis",
      description: "Submit the notice analysis, the listing fixes and the English appeal.",
      schema: AppealAnalysis,
    },
    maxTurns: 5,
    mock: appealMock(input, language),
  });

  return enforceAppealRules({ ...result.output, language, warnings: [] }, log, input);
}

/** Code-side checks on the agent's answer. Exported for tests. */
export function enforceAppealRules(
  draft: AppealResult,
  log: RetrievalLog,
  input: AppealInput,
): AppealResult {
  const warnings = [...draft.warnings];
  const policy_refs = draft.policy_refs.filter((r) => log.has(r.chunk_id));
  if (policy_refs.length < draft.policy_refs.length) {
    warnings.push(
      `${draft.policy_refs.length - policy_refs.length} citation(s) were removed because they did not come from the knowledge base.`,
    );
  }
  if (policy_refs.length === 0) {
    warnings.push(
      "No matching policy passage was found in our knowledge base; check the marketplace's own help page for this notice.",
    );
  }
  if (CJK.test(draft.appeal_text)) {
    warnings.push(
      "The appeal text contains Chinese characters; marketplaces expect it in English.",
    );
  }
  if (!input.evidence.trim() && PROMISED_DOCS.test(draft.appeal_text)) {
    warnings.push(
      "The appeal mentions attached documents, but you listed none. Attach them or remove that sentence before sending.",
    );
  }
  return { ...draft, policy_refs, warnings };
}
