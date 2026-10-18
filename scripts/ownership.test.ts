import { describe, expect, it } from "vitest";
import { canEdit, globToRegExp, loadOwnership, workstreamForBranch } from "./ownership-lib.mjs";

const ownership = loadOwnership();
const ws = (branch: string) => workstreamForBranch(ownership, branch);

describe("ownership rules", () => {
  it("matches globs", () => {
    expect(globToRegExp("src/lib/rag/**").test("src/lib/rag/bm25.ts")).toBe(true);
    expect(globToRegExp("src/app/(app)/**").test("src/app/(app)/dashboard/page.tsx")).toBe(true);
    expect(
      globToRegExp("evals/datasets/ws1-*.jsonl").test("evals/datasets/ws1-extraction.jsonl"),
    ).toBe(true);
    expect(globToRegExp("src/*.ts").test("src/lib/x.ts")).toBe(false);
  });

  it("lets each workstream edit its own area and shared status files", () => {
    expect(
      canEdit(ownership, ws("ws1/extraction-prompt"), "src/lib/agents/extraction/prompt.ts"),
    ).toBe(true);
    expect(canEdit(ownership, ws("ws2/vector-rag"), "knowledge/policies/new.md")).toBe(true);
    expect(canEdit(ownership, ws("ws3/editor"), "src/components/listing/ListingEditor.tsx")).toBe(
      true,
    );
    expect(canEdit(ownership, ws("ws4/stripe"), "supabase/migrations/2_add.sql")).toBe(true);
    expect(canEdit(ownership, ws("ws3/editor"), "docs/team/status/ws3.md")).toBe(true);
  });

  it("blocks edits to other workstreams and to contracts", () => {
    expect(canEdit(ownership, ws("ws1/x"), "src/lib/guardrails/gate.ts")).toBe(false);
    expect(canEdit(ownership, ws("ws3/x"), "src/components/auth/SupabaseAuthForm.tsx")).toBe(false);
    expect(canEdit(ownership, ws("ws4/x"), "src/lib/contracts/schemas.ts")).toBe(false);
    expect(canEdit(ownership, ws("ws2/x"), "package.json")).toBe(false);
  });

  it("does not restrict main or contract branches", () => {
    expect(canEdit(ownership, ws("main"), "src/lib/contracts/schemas.ts")).toBe(true);
    expect(canEdit(ownership, ws("contract/add-field"), "src/lib/contracts/schemas.ts")).toBe(true);
  });
});
