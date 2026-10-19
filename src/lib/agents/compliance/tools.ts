import { z } from "zod";
import type { Platform, PolicyRetriever, ProductFacts, RetrievedChunk } from "@/lib/contracts";
import { defineTool } from "@/lib/harness";
import { tokenize } from "@/lib/rag";

/** Chunks returned during this run, so citations can be checked afterwards. */
export type RetrievalLog = Map<string, RetrievedChunk>;

export function searchPolicyTool(
  retriever: PolicyRetriever,
  platforms: readonly Platform[],
  log: RetrievalLog,
) {
  return defineTool({
    name: "search_policy",
    description:
      "Search the marketplace and US regulatory policy knowledge base. Returns up to 3 relevant passages with doc_id, chunk_id, title and url to cite.",
    schema: z.object({ query: z.string().describe("Short, specific search query in English") }),
    maxCalls: 4,
    run: async ({ query }) => {
      const hits = await retriever.search(query, { k: 3, platforms });
      for (const h of hits) log.set(h.chunk_id, h);
      if (hits.length === 0)
        return { results: [], note: "No matching policy. Try different words or stop searching." };
      return {
        results: hits.map((h) => ({
          doc_id: h.doc_id,
          chunk_id: h.chunk_id,
          title: h.title,
          url: h.url,
          text: h.text,
        })),
      };
    },
    summarize: ({ query }) => `Searched policies: "${query}"`,
  });
}

/**
 * lookup_evidence — authorization lives in code: it can only read the
 * current seller's own facts and evidence, which are bound in the closure.
 */
export function lookupEvidenceTool(facts: ProductFacts, evidence: string) {
  return defineTool({
    name: "lookup_evidence",
    description:
      "Search the seller's extracted facts and the evidence they provided (certificates, test reports) for support of one claim.",
    schema: z.object({ claim: z.string().describe("The claim to look for support for") }),
    maxCalls: 8,
    run: async ({ claim }) => {
      const q = new Set(tokenize(claim));
      const matchingFacts = facts.facts
        .filter((f) => tokenize(`${f.attribute} ${f.value}`).some((t) => q.has(t)))
        .map((f) => ({ id: f.id, attribute: f.attribute, value: f.value }));
      const evidenceLines = evidence
        .split(/\n|。|；|;/)
        .map((l) => l.trim())
        .filter((l) => l && (tokenize(l).some((t) => q.has(t)) || claimKeywordHit(claim, l)));
      return {
        supporting_facts: matchingFacts,
        evidence_excerpts: evidenceLines.slice(0, 5),
        found: matchingFacts.length > 0 || evidenceLines.length > 0,
      };
    },
    summarize: ({ claim }) => `Looked for evidence: "${claim}"`,
  });
}

/** Cross-language hints: an English claim word matching Chinese evidence text. */
function claimKeywordHit(claim: string, line: string): boolean {
  const pairs: [RegExp, RegExp][] = [
    [/fda/i, /FDA/i],
    [/bpa/i, /BPA/i],
    [/lfgb/i, /LFGB/i],
    [/sgs|test/i, /SGS|检测|报告/i],
    [/epa/i, /EPA/i],
  ];
  return pairs.some(([c, l]) => c.test(claim) && l.test(line));
}
