import { describe, expect, it } from "vitest";
import { loadCorpus } from "./corpus";
import { LexicalRetriever } from "./retriever";

describe("policy knowledge base", () => {
  it("loads every document with frontmatter and chunks", () => {
    const { docs, chunks } = loadCorpus();
    expect(docs.length).toBeGreaterThanOrEqual(10);
    for (const d of docs) {
      expect(d.id).toBeTruthy();
      expect(d.source_url).toMatch(/^https:\/\//);
    }
    expect(chunks.length).toBeGreaterThan(docs.length);
  });

  it.each([
    ["FDA approved silicone cup", "fda-approval-claims"],
    ["antibacterial cutting board", "epa-pesticide-claims"],
    ["biodegradable eco-friendly", "ftc-green-guides"],
    ["search terms bytes", "amazon-search-terms"],
  ])("lexical retrieval ranks the right doc first for %s", async (query, doc) => {
    const hits = await new LexicalRetriever().search(query, { k: 3, platform: "amazon_us" });
    expect(hits[0]?.doc_id).toBe(doc);
  });
});
