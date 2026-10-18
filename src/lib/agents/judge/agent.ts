import { JudgeVerdict, type ListingDraft } from "@/lib/contracts";
import { structuredCall, type AgentContext } from "@/lib/harness";
import { JUDGE_SYSTEM } from "./prompt";

/** LLM-as-judge (fast tier) for language naturalness and clarity. */
export async function runJudge(
  ctx: AgentContext,
  listing: ListingDraft,
  label = "judge",
): Promise<JudgeVerdict> {
  const verdict = await structuredCall(ctx, {
    agent: label,
    tier: "fast",
    effort: "low",
    system: JUDGE_SYSTEM,
    user: `<listing>\n${render(listing)}\n</listing>`,
    schema: JudgeVerdict,
    mock: () => ({ json: mockJudge(listing) }),
  });
  return {
    naturalness: clamp(verdict.naturalness),
    clarity: clamp(verdict.clarity),
    issues: verdict.issues.slice(0, 5),
  };
}

/** Heuristic stand-in: penalizes untranslated text, shouting and very long sentences. */
export function mockJudge(listing: ListingDraft): JudgeVerdict {
  const text = [listing.title, ...listing.bullets, listing.description].join(" ");
  const issues: string[] = [];
  let naturalness = 4;
  if (/[一-鿿]/.test(text)) {
    naturalness -= 2;
    issues.push("Contains untranslated Chinese text.");
  }
  if (/\b[A-Z]{5,}\b/.test(text)) {
    naturalness -= 1;
    issues.push("Uses ALL-CAPS words.");
  }
  const longest = Math.max(...text.split(/[.!?]/).map((s) => s.split(" ").length));
  if (longest > 45) {
    naturalness -= 1;
    issues.push("Some sentences are very long.");
  }
  const clarity = listing.bullets.length >= 5 && listing.title.length > 30 ? 4 : 3;
  return { naturalness: clamp(naturalness), clarity, issues };
}

function clamp(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

function render(d: ListingDraft): string {
  return [
    `Title: ${d.title}`,
    ...d.bullets.map((b) => `- ${b}`),
    `Description: ${d.description}`,
  ].join("\n");
}
