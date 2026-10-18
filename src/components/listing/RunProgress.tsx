"use client";

import { STAGES, type PipelineEvent, type Stage } from "@/lib/contracts";
import { Badge, Card, Spinner } from "@/components/ui";

const LABELS: Record<Stage, string> = {
  input_guardrails: "Input guardrails",
  extraction: "Extraction agent",
  keywords: "Keyword agent",
  localization: "Localization agent",
  compliance: "Compliance agent",
  output_gate: "Policy gate",
  scoring: "Quality score",
};

/** Live view of the pipeline: one row per stage plus tool calls as they happen. Owner: WS3. */
export function RunProgress({ events }: { events: PipelineEvent[] }) {
  const state = (stage: Stage) => {
    if (events.some((e) => e.type === "stage_failed" && e.stage === stage)) return "failed";
    if (events.some((e) => e.type === "stage_completed" && e.stage === stage)) return "done";
    if (events.some((e) => e.type === "stage_started" && e.stage === stage)) return "running";
    return "waiting";
  };
  const summary = (stage: Stage) => {
    const e = events.find(
      (x) => (x.type === "stage_completed" || x.type === "stage_failed") && x.stage === stage,
    );
    return e && "summary" in e ? e.summary : e && "error" in e ? e.error : null;
  };
  const tools = (stage: Stage) =>
    events.filter((e) => e.type === "tool_called" && e.stage === stage);
  const mode = events.find((e) => e.type === "run_started");

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Agent pipeline</h2>
        {mode && mode.type === "run_started" ? (
          <Badge tone={mode.ai_mode === "live" ? "brand" : "neutral"}>{mode.ai_mode} mode</Badge>
        ) : null}
      </div>
      <ol className="space-y-3">
        {STAGES.map((stage) => {
          const s = state(stage);
          return (
            <li key={stage} className="flex gap-3">
              <span className="mt-0.5 w-5 text-center">
                {s === "running" ? <Spinner /> : s === "done" ? "✓" : s === "failed" ? "✕" : "·"}
              </span>
              <div className="min-w-0 flex-1">
                <p className={s === "waiting" ? "text-sm text-muted" : "text-sm font-medium"}>
                  {LABELS[stage]}
                </p>
                {summary(stage) ? <p className="text-xs text-muted">{summary(stage)}</p> : null}
                {tools(stage).map((t, i) => (
                  <p key={i} className="font-mono text-xs text-muted">
                    ↳ {t.type === "tool_called" ? t.summary : null}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
