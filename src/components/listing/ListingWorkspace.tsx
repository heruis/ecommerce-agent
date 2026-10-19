"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Listing, PipelineEvent, Platform } from "@/lib/contracts";
import type { ChannelView } from "@/lib/report";
import { platformLabel } from "@/lib/rules";
import { Badge, Button, Card, cn, Spinner } from "@/components/ui";
import { ChannelReport } from "./ChannelReport";
import { CompliancePanel } from "./CompliancePanel";
import { KeywordsCard } from "./KeywordsCard";
import { ListingEditor } from "./ListingEditor";
import { PhotosCard } from "./PhotosCard";
import { RunProgress } from "./RunProgress";
import { ScoreCard } from "./ScoreCard";

/**
 * The listing page: run the pipeline (streamed), then the report — keywords,
 * photo checks, and one tab per marketplace with its publish fields, photo
 * rules, policy gate, editor and score. Owner: WS3.
 */
export function ListingWorkspace({
  listing,
  views,
  autoRun,
}: {
  listing: Listing;
  views: ChannelView[];
  autoRun: boolean;
}) {
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
  const [tab, setTab] = useState<Platform>(views[0]?.platform ?? "amazon_us");
  const active = views.find((v) => v.platform === tab) ?? views[0];
  const generated = result?.channels.find((c) => c.platform === active?.platform);

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
          <p className="text-sm text-muted">This report has not been generated yet.</p>
          <Button onClick={run}>{running ? <Spinner /> : null} Generate report (1 run)</Button>
        </Card>
      ) : null}

      {result && active && generated ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {views.map((v) => (
              <Badge key={v.platform} tone={v.gate.decision === "pass" ? "ok" : "danger"}>
                {platformLabel(v.platform)}: {v.gate.decision === "pass" ? "ready" : "needs fixes"}
              </Badge>
            ))}
            <Link
              href={`/listings/${listing.id}/report`}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
            >
              Printable report
            </Link>
            {(["md", "json"] as const).map((f) => (
              <a
                key={f}
                href={`/api/listings/${listing.id}/export?format=${f}`}
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
              >
                Download {f === "md" ? "report (.md)" : "all fields (.json)"}
              </a>
            ))}
            {listing.last_run_id ? (
              <Link href={`/listings/${listing.id}/trace`} className="text-sm text-brand underline">
                Agent trace
              </Link>
            ) : null}
            <Button variant="secondary" onClick={run} disabled={running}>
              {running ? <Spinner /> : null} Regenerate (1 run)
            </Button>
          </div>
          {running ? <RunProgress events={events} /> : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <KeywordsCard keywords={result.keywords} />
            <Card className="space-y-2 text-sm">
              <h2 className="font-semibold">What the agents found</h2>
              <p className="text-muted">
                {result.facts.product_type} · {result.facts.facts.length} facts ·{" "}
                {result.facts.marketing_claims.length} seller claims checked
              </p>
              <ul className="space-y-0.5 text-xs">
                {result.facts.facts.map((f) => (
                  <li key={f.id}>
                    <span className="text-muted">{f.attribute.replace(/_/g, " ")}:</span> {f.value}
                    {f.unit ? ` ${f.unit}` : ""}
                  </li>
                ))}
              </ul>
              {result.facts.missing_info.length ? (
                <p className="text-warn">Add to improve: {result.facts.missing_info.join(", ")}</p>
              ) : null}
              {result.warnings.map((w) => (
                <p key={w} className="text-xs text-muted">
                  {w}
                </p>
              ))}
            </Card>
          </div>

          <PhotosCard photos={listing.input.images} report={result.images} />

          <div
            role="tablist"
            aria-label="Marketplace"
            className="flex flex-wrap gap-2 border-b border-border"
          >
            {views.map((v) => (
              <button
                key={v.platform}
                role="tab"
                aria-selected={v.platform === active.platform}
                onClick={() => setTab(v.platform)}
                className={cn(
                  "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
                  v.platform === active.platform
                    ? "border-brand text-brand"
                    : "border-transparent text-muted hover:text-foreground",
                )}
              >
                {platformLabel(v.platform)} · {v.score.total}
              </button>
            ))}
          </div>

          <ChannelReport view={active} images={result.images} listingId={listing.id} />
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <ListingEditor
                key={`${active.platform}:${listing.last_run_id ?? "none"}`}
                listingId={listing.id}
                platform={active.platform}
                generated={generated.listing}
                current={active.listing}
                initialValidation={active.validation}
              />
            </div>
            <div className="lg:col-span-2">
              <ScoreCard score={active.score} baseline={result.baseline_score} />
            </div>
          </div>
          <CompliancePanel report={result.compliance} />
        </>
      ) : null}
    </div>
  );
}
