/**
 * Eval runner. Usage:
 *   pnpm eval                      # all suites, current AI_MODE (mock by default)
 *   pnpm eval --suite golden       # end-to-end pipeline cases
 *   pnpm eval --suite retrieval    # RAG retrieval metrics
 *   AI_MODE=live pnpm eval --limit 3
 *
 * Ship rule (course Module 2): do not ship below 8/10 golden cases passing.
 * Results are written to evals/results/<timestamp>.json (gitignored).
 */
import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import { runPipeline } from "@/lib/pipeline";
import { getRetriever } from "@/lib/rag";
import { checkCase, type CaseResult, type GoldenCase } from "./lib/checks";
import { mean, ndcgAtK, precisionAtK, recallAtK, reciprocalRank } from "./lib/metrics";

const SHIP_THRESHOLD = 0.8;
const K = 3;

const args = process.argv.slice(2);
const suite = valueOf("--suite") ?? "all";
const limit = Number(valueOf("--limit") ?? Infinity);

function valueOf(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function readJsonl<T>(file: string): T[] {
  return fs
    .readFileSync(path.join(process.cwd(), "evals", "datasets", file), "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

/** golden.jsonl (WS2) plus any ws<N>-golden*.jsonl added by other workstreams. */
function goldenFiles(): string[] {
  return fs
    .readdirSync(path.join(process.cwd(), "evals", "datasets"))
    .filter((f) => /^(golden|ws\d-golden).*\.jsonl$/.test(f))
    .sort();
}

async function golden() {
  const cases = goldenFiles()
    .flatMap((f) => readJsonl<GoldenCase>(f))
    .slice(0, limit);
  const results: CaseResult[] = [];
  for (const c of cases) {
    const t0 = Date.now();
    const outcome = await runPipeline(c.input);
    const res = checkCase(c, outcome, Date.now() - t0);
    results.push(res);
    const failed = Object.entries(res.dimensions).filter(([, v]) => !v.pass);
    console.log(
      `${res.pass ? "PASS" : "FAIL"}  ${c.id.padEnd(30)} score=${String(res.score ?? "-").padStart(3)} calls=${res.llm_calls} ${res.latency_ms}ms` +
        (failed.length
          ? `\n      ${failed.map(([k, v]) => `${k}: ${v.notes.join("; ")}`).join("\n      ")}`
          : ""),
    );
  }
  const passRate = results.filter((r) => r.pass).length / Math.max(1, results.length);
  const byDim = (k: keyof CaseResult["dimensions"]) =>
    results.filter((r) => r.dimensions[k].pass).length;
  console.log(
    `\nGolden: ${results.filter((r) => r.pass).length}/${results.length} passed (${Math.round(passRate * 100)}%)` +
      ` | outcome ${byDim("outcome")} · process ${byDim("process")} · contract ${byDim("output_contract")} · efficiency ${byDim("efficiency")}` +
      ` | mean cost $${mean(results.map((r) => r.cost_usd)).toFixed(4)} · mean latency ${Math.round(mean(results.map((r) => r.latency_ms)))}ms`,
  );
  return { results, passRate };
}

async function retrieval() {
  const rows = readJsonl<{ query: string; relevant: string[] }>("retrieval.jsonl").slice(0, limit);
  const retriever = getRetriever();
  const per = [];
  for (const row of rows) {
    const hits = await retriever.search(row.query, { k: K });
    const ranked = hits.map((h) => h.doc_id);
    per.push({
      query: row.query,
      recall: recallAtK(ranked, row.relevant, K),
      precision: precisionAtK(ranked, row.relevant, K),
      mrr: reciprocalRank(ranked, row.relevant),
      ndcg: ndcgAtK(ranked, row.relevant, K),
    });
  }
  const summary = {
    retriever: retriever.kind,
    [`recall@${K}`]: mean(per.map((p) => p.recall)),
    [`precision@${K}`]: mean(per.map((p) => p.precision)),
    mrr: mean(per.map((p) => p.mrr)),
    [`ndcg@${K}`]: mean(per.map((p) => p.ndcg)),
  };
  for (const p of per.filter((x) => x.recall < 1))
    console.log(`MISS  "${p.query}" recall=${p.recall.toFixed(2)}`);
  console.log(
    `Retrieval (${retriever.kind}): ` +
      Object.entries(summary)
        .filter(([k]) => k !== "retriever")
        .map(([k, v]) => `${k}=${(v as number).toFixed(3)}`)
        .join(" "),
  );
  return { per, summary };
}

async function main() {
  console.log(`Evals — AI_MODE=${env().AI_MODE}, RAG_MODE=${env().RAG_MODE}\n`);
  const out: Record<string, unknown> = { at: new Date().toISOString(), ai_mode: env().AI_MODE };
  let ok = true;
  if (suite === "all" || suite === "retrieval") out.retrieval = await retrieval();
  if (suite === "all" || suite === "golden") {
    if (suite === "all") console.log("");
    const g = await golden();
    out.golden = g;
    ok = g.passRate >= SHIP_THRESHOLD;
    console.log(
      ok
        ? `Ship threshold met (>= ${SHIP_THRESHOLD * 100}%).`
        : `Below ship threshold (${SHIP_THRESHOLD * 100}%). Do not ship.`,
    );
  }
  const dir = path.join(process.cwd(), "evals", "results");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(
    dir,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${env().AI_MODE}.json`,
  );
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nSaved ${path.relative(process.cwd(), file)}`);
  process.exitCode = ok ? 0 : 1;
}

void main();
