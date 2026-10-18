import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Budget } from "./budget";
import { AgentError } from "./errors";
import { MockLlmClient, toolResultsSoFar, type MockResponder } from "./llm";
import { structuredCall } from "./structured";
import { defineTool, runToolLoop } from "./tool-loop";
import { Tracer } from "./tracer";
import type { AgentContext } from "./types";

function ctx(budget = new Budget()): AgentContext {
  return {
    runId: "run_test",
    llm: new MockLlmClient(),
    tracer: new Tracer(),
    budget,
    spanId: null,
    emit: () => {},
  };
}

const Answer = z.object({ answer: z.string() });
const echo = defineTool({
  name: "echo",
  description: "echo",
  schema: z.object({ text: z.string() }),
  maxCalls: 2,
  run: async ({ text }) => ({ echoed: text }),
});

const base = {
  agent: "test",
  stage: "localization" as const,
  tier: "fast" as const,
  system: "s",
  user: "u",
  tools: [echo],
  final: { name: "submit", description: "submit", schema: Answer },
  maxTurns: 4,
};

describe("runToolLoop", () => {
  it("runs tools, feeds results back, and returns the validated final answer", async () => {
    const mock: MockResponder = (req) =>
      toolResultsSoFar(req).length === 0
        ? { toolCalls: [{ name: "echo", input: { text: "hi" } }] }
        : { toolCalls: [{ name: "submit", input: { answer: "done" } }] };
    const c = ctx();
    const r = await runToolLoop(c, { ...base, mock });
    expect(r.output).toEqual({ answer: "done" });
    expect(r.toolCalls).toEqual([{ name: "echo", ok: true }]);
    expect(c.tracer.spans.some((s) => s.kind === "tool")).toBe(true);
  });

  it("returns contract errors to the model and accepts the repaired answer", async () => {
    let turn = 0;
    const mock: MockResponder = () =>
      turn++ === 0
        ? { toolCalls: [{ name: "submit", input: { wrong: 1 } }] }
        : { toolCalls: [{ name: "submit", input: { answer: "fixed" } }] };
    const r = await runToolLoop(ctx(), { ...base, mock });
    expect(r.output.answer).toBe("fixed");
  });

  it("enforces per-tool call caps in code", async () => {
    let turn = 0;
    const mock: MockResponder = () =>
      ++turn <= 3
        ? { toolCalls: [{ name: "echo", input: { text: String(turn) } }] }
        : { toolCalls: [{ name: "submit", input: { answer: "x" } }] };
    const r = await runToolLoop(ctx(), { ...base, maxTurns: 5, mock });
    expect(r.toolCalls.filter((t) => !t.ok)).toHaveLength(1);
  });

  it("fails with max_iterations when the agent never finishes", async () => {
    const mock: MockResponder = () => ({ toolCalls: [{ name: "echo", input: { text: "again" } }] });
    await expect(runToolLoop(ctx(), { ...base, maxTurns: 2, mock })).rejects.toMatchObject({
      code: "max_iterations",
    });
  });

  it("stops at the run budget", async () => {
    const budget = new Budget({
      maxLlmCalls: 1,
      maxTotalTokens: 1e9,
      maxCostUsd: 1e9,
      deadlineMs: 1e9,
    });
    const mock: MockResponder = () => ({ toolCalls: [{ name: "echo", input: { text: "x" } }] });
    const err = await runToolLoop(ctx(budget), { ...base, mock }).catch((e) => e);
    expect(err).toBeInstanceOf(AgentError);
    expect(err.code).toBe("budget_exceeded");
  });

  it("treats a refusal as a typed error", async () => {
    const mock: MockResponder = () => ({ text: "no", stopReason: "refusal" });
    await expect(runToolLoop(ctx(), { ...base, mock })).rejects.toMatchObject({ code: "refusal" });
  });
});

describe("structuredCall", () => {
  it("repairs output that breaks the zod contract", async () => {
    let n = 0;
    const out = await structuredCall(ctx(), {
      agent: "t",
      tier: "fast",
      system: "s",
      user: "u",
      schema: z.object({ n: z.number().int().max(5) }),
      mock: () => ({ json: { n: n++ === 0 ? 99 : 3 } }),
    });
    expect(out).toEqual({ n: 3 });
  });
});
