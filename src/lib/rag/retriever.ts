import type { PolicyRetriever, RetrievedChunk } from "@/lib/contracts";
import { env } from "@/lib/env";
import { Bm25Index } from "./bm25";
import { loadCorpus, type PolicyChunk } from "./corpus";
import { VectorRetriever } from "./vector";

/** BM25 over title + topics + text. Platform filter keeps Amazon rules out of TikTok runs. */
export class LexicalRetriever implements PolicyRetriever {
  readonly kind = "lexical" as const;
  private index: Bm25Index<PolicyChunk> | null = null;

  private getIndex() {
    if (!this.index) {
      const { chunks } = loadCorpus();
      this.index = new Bm25Index(
        chunks,
        (c) => `${c.title} ${c.title} ${c.topics.join(" ")} ${c.text}`,
      );
    }
    return this.index;
  }

  async search(
    query: string,
    opts: { k?: number; platforms?: readonly string[] } = {},
  ): Promise<RetrievedChunk[]> {
    const k = opts.k ?? 4;
    const hits = this.getIndex().search(query, k * 3);
    return hits
      .filter(
        ({ item }) =>
          !opts.platforms?.length ||
          item.platforms.includes("all") ||
          item.platforms.some((p) => opts.platforms!.includes(p)),
      )
      .slice(0, k)
      .map(({ item, score }) => ({
        doc_id: item.doc_id,
        chunk_id: item.chunk_id,
        title: item.title,
        url: item.url,
        text: item.text,
        score: Math.round(score * 1000) / 1000,
      }));
  }
}

let shared: PolicyRetriever | null = null;

export function getRetriever(): PolicyRetriever {
  if (shared) return shared;
  shared = env().RAG_MODE === "vector" ? new VectorRetriever() : new LexicalRetriever();
  return shared;
}
