import { describe, expect, it } from "vitest";
import { ListingDraft, ProductInput } from "@/lib/contracts";
import {
  Budget,
  MockLlmClient,
  toStrictJsonSchema,
  Tracer,
  type AgentContext,
  type LlmRequest,
  type MockResponder,
} from "@/lib/harness";
import { validateListing } from "@/lib/rules";
import { mockExtraction } from "../extraction/mock";
import { mockKeywords } from "../keywords/mock";
import { runLocalization, submitGuard } from "./agent";
import { buildMockDraft } from "./mock";

/** Mock client that replays a script instead of the agent's built-in mock. */
class ScriptedClient extends MockLlmClient {
  constructor(private readonly script: MockResponder) {
    super();
  }
  override create(req: LlmRequest) {
    return super.create({ ...req, mock: this.script });
  }
}

const ctx = (script: MockResponder): AgentContext => ({
  runId: "run_test",
  llm: new ScriptedClient(script),
  tracer: new Tracer(),
  budget: new Budget(),
  spanId: null,
  emit: () => {},
});

const input = ProductInput.parse({
  title_zh: "防摔手机壳 透明硅胶",
  description_zh: "高品质手机壳，硅胶材质，防摔防刮，轻薄贴合。重量30g。",
  specs_zh: "重量：30g；颜色：黑色",
  platforms: ["amazon_us"],
});
const facts = mockExtraction(input);
const keywords = mockKeywords(facts);
const good = buildMockDraft("amazon_us", facts, keywords, input, "final");
// The live failure: "phone" three times in an Amazon title (the limit is two).
const bad: ListingDraft = { ...good, title: "Phone Case for Phone, Clear Silicone Phone Cover" };

describe("localization submit guard", () => {
  it("fixtures: the good draft passes Amazon's rules and the bad one does not", () => {
    expect(validateListing(good, "amazon_us", { brand: "" }).passed).toBe(true);
    expect(validateListing(bad, "amazon_us", { brand: "" }).passed).toBe(false);
  });

  it("sends a rule-breaking submission back and accepts the corrected one", async () => {
    let turn = 0;
    const script: MockResponder = () => ({
      toolCalls: [{ name: "submit_listing", input: turn++ === 0 ? bad : good }],
    });
    const out = await runLocalization(ctx(script), "amazon_us", input, facts, keywords);
    expect(out.draft.title).toBe(good.title);
    expect(out.turns).toBe(2);
  });

  it("accepts the listing after one correction round so the run still completes", async () => {
    const script: MockResponder = () => ({
      toolCalls: [{ name: "submit_listing", input: bad }],
    });
    const out = await runLocalization(ctx(script), "amazon_us", input, facts, keywords);
    expect(out.draft.title).toBe(bad.title);
    expect(out.turns).toBe(2);
  });

  it("does not change the JSON schema sent to the model", () => {
    expect(toStrictJsonSchema(submitGuard("amazon_us", ""))).toEqual(
      toStrictJsonSchema(ListingDraft),
    );
  });
});
