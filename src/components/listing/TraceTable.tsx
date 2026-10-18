import type { RunRecord, Span } from "@/lib/contracts";
import { Badge, Card } from "@/components/ui";

/** Observability: every stage, model call and tool call of one run. Owner: WS3. */
export function TraceTable({ run }: { run: RunRecord }) {
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
    <Card className="space-y-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <Stat label="Status" value={run.status} />
        <Stat label="Mode" value={run.ai_mode} />
        <Stat label="LLM calls" value={run.usage.llm_calls} />
        <Stat label="Tool calls" value={run.usage.tool_calls} />
        <Stat
          label="Tokens in/out"
          value={`${run.usage.input_tokens} / ${run.usage.output_tokens}`}
        />
        <Stat
          label="Est. cost"
          value={`$${run.usage.cost_usd.toFixed(4)}${run.ai_mode === "mock" ? " (mock)" : ""}`}
        />
      </div>
      {run.error ? <p className="text-sm text-danger">{run.error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1 pr-3">Span</th>
              <th className="py-1 pr-3">Kind</th>
              <th className="py-1 pr-3">ms</th>
              <th className="py-1 pr-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {run.spans.map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="py-1 pr-3" style={{ paddingLeft: depth(s) * 16 }}>
                  {s.name} {s.status === "error" ? <Badge tone="danger">error</Badge> : null}
                </td>
                <td className="py-1 pr-3">{s.kind}</td>
                <td className="py-1 pr-3 tabular-nums">{s.duration_ms ?? "…"}</td>
                <td className="py-1 pr-3 text-muted">
                  {Object.entries(s.attrs)
                    .filter(([, v]) => v !== null && v !== "")
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" ")}
                  {s.error ? <span className="block text-danger">{s.error}</span> : null}
                  <details>
                    <summary className="cursor-pointer">input / output</summary>
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
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
