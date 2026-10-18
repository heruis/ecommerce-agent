/**
 * Minimal BM25 index: the "naive RAG" retriever that needs no API keys.
 * Good enough for a corpus of a few dozen policy chunks; the vector retriever
 * (RAG_MODE=vector) is the upgrade path.
 */
const STOP = new Set(
  "a an and are as at be by can for from has have if in into is it its may must no not of on or such that the their them then there these this to was were will with without your you".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9#%\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

/** Tiny suffix stripper so "claims"/"claim", "approved"/"approve" match. */
function stem(t: string): string {
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ed")) return t.slice(0, -2);
  if (t.length > 4 && t.endsWith("es")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s")) return t.slice(0, -1);
  return t;
}

export class Bm25Index<T> {
  private readonly docs: { item: T; tf: Map<string, number>; len: number }[] = [];
  private readonly df = new Map<string, number>();
  private avgLen = 0;

  constructor(
    items: T[],
    textOf: (item: T) => string,
    private readonly k1 = 1.4,
    private readonly b = 0.75,
  ) {
    for (const item of items) {
      const tokens = tokenize(textOf(item));
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      this.docs.push({ item, tf, len: tokens.length });
    }
    this.avgLen = this.docs.reduce((s, d) => s + d.len, 0) / Math.max(1, this.docs.length);
  }

  search(query: string, k = 5): { item: T; score: number }[] {
    const q = [...new Set(tokenize(query))];
    const n = this.docs.length;
    const scored = this.docs.map((d) => {
      let score = 0;
      for (const t of q) {
        const f = d.tf.get(t);
        if (!f) continue;
        const df = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
        score +=
          idf *
          ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * d.len) / this.avgLen)));
      }
      return { item: d.item, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
