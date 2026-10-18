"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Listing, PipelineEvent } from "@/lib/contracts";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { CompliancePanel } from "./CompliancePanel";
import { ListingEditor } from "./ListingEditor";
import { RunProgress } from "./RunProgress";
import { ScoreCard } from "./ScoreCard";

/**
 * The listing page: run the pipeline (streamed), then review compliance,
 * score and the editable listing. Owner: WS3.
 */
export function ListingWorkspace({ listing, autoRun }: { listing: Listing; autoRun: boolean }) {
  const router = useRouter();
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const started = useRef(false);

  async function run() {
    setRunning(true);
    setError(null);
    setEvents([]);
    const res = await fetch(`/api/listings/${listing.id}/run`, { method: "POST" });
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => null);
      setError({
        message: body?.error?.message ?? "Could not start the run.",
        code: body?.error?.code ?? "error",
      });
      setRunning(false);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const line = part.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const event = JSON.parse(line.slice(6)) as PipelineEvent;
        setEvents((prev) => [...prev, event]);
        if (event.type === "run_failed") setError({ message: event.error, code: event.code });
      }
    }
    setRunning(false);
    router.refresh();
  }

  useEffect(() => {
    if (autoRun && !started.current && listing.status === "draft") {
      started.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = listing.result;

  return (
    <div className="space-y-6">
      {(running || events.length > 0) && !result ? <RunProgress events={events} /> : null}

      {error ? (
        <Card className="border-danger/40">
          <p className="text-sm text-danger">{error.message}</p>
          {error.code === "out_of_credits" ? (
            <Link href="/billing" className="mt-2 inline-block text-sm text-brand underline">
              Upgrade to Pro
            </Link>
          ) : error.code !== "guardrail_blocked" ? (
            <p className="mt-1 text-xs text-muted">Your run was refunded.</p>
          ) : null}
        </Card>
      ) : null}

      {!result && !running ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">This listing has not been generated yet.</p>
          <Button onClick={run}>{running ? <Spinner /> : null} Generate listing (1 run)</Button>
        </Card>
      ) : null}

      {result ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={result.gate.decision === "pass" ? "ok" : "danger"}>
              {result.gate.decision === "pass"
                ? "Ready to review"
                : "Blocked issues — see compliance"}
            </Badge>
            {listing.last_run_id ? (
              <Link href={`/listings/${listing.id}/trace`} className="text-sm text-brand underline">
                View agent trace
              </Link>
            ) : null}
            <Button variant="secondary" onClick={run} disabled={running}>
              {running ? <Spinner /> : null} Regenerate (1 run)
            </Button>
          </div>
          {running ? <RunProgress events={events} /> : null}
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ListingEditor
                key={listing.last_run_id ?? "none"}
                listingId={listing.id}
                generated={result.listing}
                edited={listing.edited}
                initialValidation={result.validation}
              />
            </div>
            <div className="space-y-6 lg:col-span-2">
              <ScoreCard score={result.score} baseline={result.baseline_score} />
              <Card className="space-y-2 text-sm">
                <h2 className="font-semibold">What the agents found</h2>
                <p className="text-muted">
                  {result.facts.product_type} · {result.facts.facts.length} facts · keywords
                  (AI-suggested): {result.keywords.primary.join(", ")}
                </p>
                {result.facts.missing_info.length ? (
                  <p className="text-warn">
                    Add to improve: {result.facts.missing_info.join(", ")}
                  </p>
                ) : null}
                {result.warnings.map((w) => (
                  <p key={w} className="text-xs text-muted">
                    {w}
                  </p>
                ))}
              </Card>
            </div>
          </div>
          <CompliancePanel report={result.compliance} gate={result.gate} />
        </>
      ) : null}
    </div>
  );
}
