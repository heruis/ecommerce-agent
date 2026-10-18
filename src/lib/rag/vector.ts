import type { PolicyRetriever, RetrievedChunk } from "@/lib/contracts";

/**
 * Semantic retriever over Supabase pgvector (RAG_MODE=vector).
 *
 * TODO(WS2): implement.
 *  1. `pnpm kb:ingest` embeds every chunk from loadCorpus() (Voyage AI) and
 *     upserts into the `policy_chunks` table (see supabase/migrations).
 *  2. Here: embed the query, call the `match_policy_chunks` RPC, map rows to
 *     RetrievedChunk, filter by platform.
 *  3. Compare against LexicalRetriever with `pnpm eval --suite retrieval`
 *     (Recall@k, MRR, NDCG) and record the result in memory/decisions.md.
 */
export class VectorRetriever implements PolicyRetriever {
  readonly kind = "vector" as const;

  async search(
    query: string,
    opts: { k?: number; platform?: string } = {},
  ): Promise<RetrievedChunk[]> {
    void query;
    void opts;
    throw new Error("RAG_MODE=vector is not implemented yet (WS2). Use RAG_MODE=lexical.");
  }
}
