"use client";

import type { RunRecord, Span } from "@/lib/contracts";
import { useT } from "@/lib/i18n/client";
import { Badge, Card } from "@/components/ui";

/** Observability: every stage, model call and tool call of one run. Owner: WS3. */
export function TraceTable({ run }: { run: RunRecord }) {
  const t = useT().app.trace;
  const depth = (s: Span): number => {
    let d = 0;
    let p = s.parent_id;
    while (p) {
      d += 1;
      p = run.spans.find((x) => x.id === p)?.parent_id ?? null;
    }
    return d;
  };
  return (
    <Card className="space-y-5">
      <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <Stat label={t.status} value={run.status} />
        <Stat label={t.mode} value={run.ai_mode} />
        <Stat label={t.llmCalls} value={run.usage.llm_calls} />
        <Stat label={t.toolCalls} value={run.usage.tool_calls} />
        <Stat label={t.tokens} value={`${run.usage.input_tokens} / ${run.usage.output_tokens}`} />
        <Stat
          label={t.cost}
          value={`$${run.usage.cost_usd.toFixed(4)}${run.ai_mode === "mock" ? " (mock)" : ""}`}
        />
      </dl>
      {run.error ? <p className="text-sm text-danger">{run.error}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-subtle/50 text-muted">
            <tr>
              <th className="px-3 py-2">{t.span}</th>
              <th className="px-3 py-2">{t.kind}</th>
              <th className="px-3 py-2">{t.ms}</th>
              <th className="px-3 py-2">{t.details}</th>
            </tr>
          </thead>
          <tbody>
            {run.spans.map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="px-3 py-1.5" style={{ paddingLeft: 12 + depth(s) * 16 }}>
                  {s.name} {s.status === "error" ? <Badge tone="danger">error</Badge> : null}
                </td>
                <td className="px-3 py-1.5">{s.kind}</td>
                <td className="px-3 py-1.5 tabular-nums">{s.duration_ms ?? "…"}</td>
                <td className="px-3 py-1.5 text-muted">
                  {Object.entries(s.attrs)
                    .filter(([, v]) => v !== null && v !== "")
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" ")}
                  {s.error ? <span className="block text-danger">{s.error}</span> : null}
                  <details>
                    <summary className="cursor-pointer text-brand">{t.io}</summary>
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap">
                      {JSON.stringify({ input: s.input, output: s.output }, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
