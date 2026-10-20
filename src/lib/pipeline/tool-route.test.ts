import { beforeEach, describe, expect, it } from "vitest";
import type { AppealInput, AppealResult } from "@/lib/contracts";
import { MemoryRepo, resetMemoryStore } from "@/lib/db";
import { AgentError } from "@/lib/harness";
import type { ToolOutcome } from "./tool-run";
import { startToolRun } from "./tool-route";

const user = { id: "u_tool", email: "tool@example.com" };
const input: AppealInput = {
  platform: "amazon_us",
  notice: "Your listing was removed for an antimicrobial claim.",
  listing_text: "",
  seller_note: "",
  evidence: "",
};
const usage = {
  llm_calls: 1,
  tool_calls: 0,
  input_tokens: 0,
  output_tokens: 0,
  cache_read_tokens: 0,
  cost_usd: 0,
};
const result: AppealResult = {
  language: "en",
  policy_area: "Pesticide claims",
  what_happened: "x",
  likely_cause: "x",
  severity: "high",
  fix_steps: [],
  documents_needed: [],
  listing_changes: [],
  appeal_text: "Dear team",
  policy_refs: [],
  warnings: [],
};

async function drain(res: Response): Promise<string> {
  return await res.text();
}

function outcome(r: AppealResult | null, error: AgentError | null): ToolOutcome<AppealResult> {
  return { result: r, error, usage, spans: [], ai_mode: "mock" };
}

describe("startToolRun", () => {
  beforeEach(() => resetMemoryStore());

  it("charges one credit and saves the result", async () => {
    const repo = new MemoryRepo();
    const before = (await repo.ensureProfile(user)).credits_remaining;
    const res = await startToolRun({
      user,
      kind: "appeal",
      input,
      run: async () => outcome(result, null),
    });
    const body = await drain(res);
    expect(body).toMatch(/"tool_completed"/);
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(before - 1);
    const [summary] = await repo.listToolRuns(user.id, "appeal");
    expect(summary.status).toBe("completed");
  });

  it("refunds when the failure is ours, not when the input was blocked", async () => {
    const repo = new MemoryRepo();
    const start = (await repo.ensureProfile(user)).credits_remaining;
    await drain(
      await startToolRun({
        user,
        kind: "appeal",
        input,
        run: async () => outcome(null, new AgentError("llm_error", "API down")),
      }),
    );
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(start);
    await drain(
      await startToolRun({
        user,
        kind: "appeal",
        input,
        run: async () => outcome(null, new AgentError("guardrail_blocked", "blocked")),
      }),
    );
    expect((await repo.getProfile(user.id))!.credits_remaining).toBe(start - 1);
  });

  it("returns 402 with no credits left", async () => {
    const repo = new MemoryRepo();
    await repo.ensureProfile(user);
    await repo.setPlan(user.id, { plan: "free", credits: 0 });
    const res = await startToolRun({
      user,
      kind: "appeal",
      input,
      run: async () => outcome(result, null),
    });
    expect(res.status).toBe(402);
    expect(await repo.listToolRuns(user.id)).toHaveLength(0);
  });
});
