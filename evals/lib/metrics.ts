/**
 * Retrieval metrics (course Module 3/4: "did we fetch the right chunks?").
 * `ranked` is the list of retrieved doc ids in rank order; `relevant` is the
 * golden set for the query. Doc-level relevance; duplicates count once.
 */
export function recallAtK(ranked: string[], relevant: string[], k: number): number {
  if (relevant.length === 0) return 1;
  const top = new Set(ranked.slice(0, k));
  return relevant.filter((r) => top.has(r)).length / relevant.length;
}

export function precisionAtK(ranked: string[], relevant: string[], k: number): number {
  const top = dedupe(ranked).slice(0, k);
  if (top.length === 0) return 0;
  const rel = new Set(relevant);
  return top.filter((d) => rel.has(d)).length / top.length;
}

export function reciprocalRank(ranked: string[], relevant: string[]): number {
  const rel = new Set(relevant);
  const idx = dedupe(ranked).findIndex((d) => rel.has(d));
  return idx === -1 ? 0 : 1 / (idx + 1);
}

export function ndcgAtK(ranked: string[], relevant: string[], k: number): number {
  const rel = new Set(relevant);
  const top = dedupe(ranked).slice(0, k);
  const dcg = top.reduce((s, d, i) => s + (rel.has(d) ? 1 / Math.log2(i + 2) : 0), 0);
  const ideal = Array.from(
    { length: Math.min(k, relevant.length) },
    (_, i) => 1 / Math.log2(i + 2),
  ).reduce((a, b) => a + b, 0);
  return ideal === 0 ? 1 : dcg / ideal;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}
