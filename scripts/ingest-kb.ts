/**
 * `pnpm kb:ingest` — embed the policy knowledge base into Supabase pgvector
 * for RAG_MODE=vector. Owner: WS2.
 *
 * TODO(WS2):
 *  1. For each chunk from loadCorpus(): embed `${title}\n${text}` with Voyage
 *     (POST https://api.voyageai.com/v1/embeddings, input_type "document").
 *  2. Upsert into public.policy_chunks (chunk_id, doc_id, title, url,
 *     platforms, content, embedding) with the Supabase secret key.
 *  3. Delete rows whose chunk_id no longer exists (renamed sections).
 *  4. Implement VectorRetriever (src/lib/rag/vector.ts) with input_type "query".
 */
import { loadCorpus } from "@/lib/rag";

const { docs, chunks } = loadCorpus();
console.log(`Knowledge base: ${docs.length} documents, ${chunks.length} chunks.`);
const unverified = docs.filter((d) => !d.verified);
if (unverified.length) {
  console.log(
    `! ${unverified.length} document(s) not yet verified against their source: ${unverified.map((d) => d.id).join(", ")}`,
  );
}
console.log(
  "Vector ingestion is not implemented yet (WS2). Lexical RAG reads the markdown directly, no ingest needed.",
);
