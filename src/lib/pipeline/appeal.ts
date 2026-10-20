import {
  AppealInput,
  type AppealInputDraft,
  type AppealResult,
  type ExplanationLanguage,
  type ProductInput,
} from "@/lib/contracts";
import { runAppealAnalysis } from "@/lib/agents/appeal/agent";
import { screenInput } from "@/lib/guardrails";
import { AgentError } from "@/lib/harness";
import { withToolHarness, type ToolOutcome, type ToolRunOptions } from "./tool-run";

/**
 * Takedown / appeal assistant workflow:
 *   input_guardrails -> compliance (appeal agent: policy lookup + analysis)
 *   -> output_gate (citation, language and honesty checks, in code)
 *
 * The prohibited-product screen does not block here: a counterfeit or
 * trademark notice legitimately names those things. Prompt injection does.
 */
export async function runAppeal(
  raw: AppealInputDraft,
  opts: ToolRunOptions & { language?: ExplanationLanguage } = {},
): Promise<ToolOutcome<AppealResult>> {
  const language = opts.language ?? "en";
  return withToolHarness("appeal", opts, async (h) => {
    const parsed = AppealInput.safeParse(raw);
    if (!parsed.success) {
      throw new AgentError(
        "guardrail_blocked",
        parsed.error.issues.map((i) => i.message).join("; "),
      );
    }

    const screen = await h.stage(
      "input_guardrails",
      { platform: parsed.data.platform, chars: parsed.data.notice.length },
      async () => {
        const result = screenInput(asScreenInput(parsed.data));
        const reason = blockReason(result);
        if (reason) throw new AgentError("guardrail_blocked", reason);
        return result;
      },
      (r) =>
        r.pii.length ? "Contact details were removed before analysis." : "Input passed all checks.",
    );
    const input: AppealInput = {
      ...parsed.data,
      notice: screen.sanitized.description_zh,
      listing_text: screen.sanitized.existing_listing_en,
      seller_note: screen.sanitized.specs_zh,
      evidence: screen.sanitized.evidence,
    };

    const analysis = await h.stage(
      "compliance",
      { platform: input.platform, language },
      (ctx) => runAppealAnalysis(ctx, input, language, h.retriever),
      (r) => r.policy_area,
    );

    return h.stage(
      "output_gate",
      {},
      async () => ({
        ...analysis,
        warnings: [
          ...(screen.pii.length
            ? ["Contact details were removed from your text before analysis."]
            : []),
          ...analysis.warnings,
        ],
      }),
      (r) => (r.warnings.length ? `${r.warnings.length} note(s) for you` : "Checks passed"),
    );
  });
}

const INJECTION_REASON =
  'Your text contains instructions aimed at the AI (for example "ignore previous instructions"). Remove them and try again.';

function blockReason(result: ReturnType<typeof screenInput>): string | null {
  return result.injection.some((f) => f.severity === "high") ? INJECTION_REASON : null;
}

/** Route pre-check (no model call, no charge): the reason the input is blocked, or null. */
export function screenAppealInput(input: AppealInput): string | null {
  return blockReason(screenInput(asScreenInput(input)));
}

function asScreenInput(input: AppealInput): ProductInput {
  return {
    title_zh: "",
    description_zh: input.notice,
    specs_zh: input.seller_note,
    evidence: input.evidence,
    brand: "",
    category: "other",
    platforms: [input.platform],
    images: [],
    existing_listing_en: input.listing_text,
  };
}
