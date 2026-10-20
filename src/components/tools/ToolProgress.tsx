"use client";

import { Check, Circle, Loader2, X } from "lucide-react";
import type { Stage, ToolKind } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import type { ToolStreamEvent } from "@/lib/pipeline/tool-run";
import { Badge, Card } from "@/components/ui";

const ORDER: Record<ToolKind, Stage[]> = {
  audit: ["input_guardrails", "extraction", "compliance", "localization", "output_gate", "scoring"],
  appeal: ["input_guardrails", "compliance", "output_gate"],
};

/** Live progress of an audit or appeal: one row per stage, tool calls underneath. Owner: WS3. */
export function ToolProgress({ kind, events }: { kind: ToolKind; events: ToolStreamEvent[] }) {
  const t = useT().tools;
  const labels = t.stages[kind] as Partial<Record<Stage, string>>;
  const state = (s: Stage) => {
    if (events.some((e) => e.type === "stage_failed" && e.stage === s)) return "failed";
    if (events.some((e) => e.type === "stage_completed" && e.stage === s)) return "done";
    if (events.some((e) => e.type === "stage_started" && e.stage === s)) return "running";
    return "waiting";
  };
  const summary = (s: Stage) => {
    const e = events.find(
      (x) => (x.type === "stage_completed" || x.type === "stage_failed") && x.stage === s,
    );
    if (!e) return null;
    return "summary" in e ? e.summary : "error" in e ? e.error : null;
  };
  const started = events.find((e) => e.type === "run_started");

  return (
    <Card aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{t.progress.title}</h2>
        {started && started.type === "run_started" ? (
          <Badge tone={started.ai_mode === "live" ? "brand" : "neutral"}>
            {fmt(t.progress.mode, { mode: started.ai_mode })}
          </Badge>
        ) : null}
      </div>
      <ol className="space-y-3">
        {ORDER[kind].map((s) => {
          const st = state(s);
          const tools = events.filter((e) => e.type === "tool_called" && e.stage === s);
          return (
            <li key={s} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center">
                {st === "running" ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin text-brand" />
                ) : st === "done" ? (
                  <Check aria-hidden className="h-4 w-4 text-ok" />
                ) : st === "failed" ? (
                  <X aria-hidden className="h-4 w-4 text-danger" />
                ) : (
                  <Circle aria-hidden className="h-3 w-3 text-border" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={st === "waiting" ? "text-sm text-muted" : "text-sm font-medium"}>
                  {labels[s] ?? s}
                </p>
                {summary(s) ? <p className="text-xs text-muted">{summary(s)}</p> : null}
                {tools.map((e, i) => (
                  <p key={i} className="font-mono text-xs break-words text-muted">
                    ↳ {e.type === "tool_called" ? e.summary : null}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-xs text-muted">{t.progress.keepOpen}</p>
    </Card>
  );
}
