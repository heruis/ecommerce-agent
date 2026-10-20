"use client";

import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { STAGES, type PipelineEvent, type Stage } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { platformLabel } from "@/lib/rules";
import { Badge, Card, cn, Spinner } from "@/components/ui";

/** Live view of the pipeline: one row per stage plus tool calls as they happen. Owner: WS3. */
export function RunProgress({ events }: { events: PipelineEvent[] }) {
  const t = useT().app.progress;
  // The photo stage only runs when photos were uploaded.
  const hasImages = events.some((e) => e.type === "stage_started" && e.stage === "images");
  const stages = STAGES.filter((s) => s !== "images" || hasImages);
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
    <Card aria-live="polite">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{t.title}</h2>
        {mode && mode.type === "run_started" ? (
          <Badge tone={mode.ai_mode === "live" ? "brand" : "neutral"}>
            {fmt(t.mode, { mode: mode.ai_mode })}
          </Badge>
        ) : null}
      </div>
      <ol className="space-y-3">
        {stages.map((stage) => {
          const s = state(stage);
          return (
            <li key={stage} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {s === "running" ? (
                  <Spinner className="text-brand" />
                ) : s === "done" ? (
                  <CheckCircle2 aria-hidden className="h-5 w-5 text-ok" />
                ) : s === "failed" ? (
                  <XCircle aria-hidden className="h-5 w-5 text-danger" />
                ) : (
                  <Circle aria-hidden className="h-4 w-4 text-border" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm",
                    s === "waiting" ? "text-muted" : "font-medium",
                    s === "failed" && "text-danger",
                  )}
                >
                  {t.stages[stage]}
                </p>
                {summary(stage) ? (
                  <p className="text-xs break-words text-muted">{summary(stage)}</p>
                ) : null}
                {tools(stage).map((e, i) => (
                  <p key={i} className="font-mono text-xs break-words text-muted">
                    ↳{" "}
                    {e.type === "tool_called"
                      ? `${e.platform ? `[${platformLabel(e.platform)}] ` : ""}${e.summary}`
                      : null}
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
