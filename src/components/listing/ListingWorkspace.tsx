"use client";

import { Download, FileJson, Printer, RefreshCw, ScrollText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ClarifyingQuestion, Listing, PipelineEvent, Platform } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import type { ChannelView } from "@/lib/report";
import { platformLabel } from "@/lib/rules";
import { Alert, Badge, Button, buttonClass, Card, cn, Spinner } from "@/components/ui";
import { ChannelPreview } from "./ChannelPreview";
import { ChannelReport } from "./ChannelReport";
import { CompliancePanel } from "./CompliancePanel";
import { KeywordsCard } from "./KeywordsCard";
import { ListingEditor } from "./ListingEditor";
import { NeedsInfoCard } from "./NeedsInfoCard";
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
  const t = useT().app.workspace;
  const router = useRouter();
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<{
    message: string;
    code: string;
    questions?: ClarifyingQuestion[];
  } | null>(null);
  const started = useRef(false);

  async function run() {
    setRunning(true);
    setError(null);
    setEvents([]);
    const res = await fetch(`/api/listings/${listing.id}/run`, { method: "POST" });
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => null);
      setError({
        message: body?.error?.message ?? t.couldNotStart,
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
        if (event.type === "run_failed")
          setError({ message: event.error, code: event.code, questions: event.questions });
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
  const linkButton = buttonClass("secondary", "sm");

  return (
    <div className="space-y-6">
      {(running || events.length > 0) && !result ? <RunProgress events={events} /> : null}

      {error?.code === "needs_info" && error.questions?.length ? (
        <NeedsInfoCard input={listing.input} questions={error.questions} />
      ) : error ? (
        <Alert tone="danger" title={error.message}>
          {error.code === "out_of_credits" ? (
            <Link href="/pricing" className="font-medium text-brand underline">
              {t.getCredits}
            </Link>
          ) : error.code !== "guardrail_blocked" ? (
            <span>{t.refunded}</span>
          ) : null}
        </Alert>
      ) : null}

      {!result && !running && error?.code !== "needs_info" ? (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted">{t.notGenerated}</p>
          <Button variant="accent" onClick={run}>
            <Sparkles aria-hidden className="h-4 w-4" />
            {t.generate}
          </Button>
        </Card>
      ) : null}

      {result && active && generated ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {views.map((v) => (
              <Badge key={v.platform} tone={v.gate.decision === "pass" ? "ok" : "danger"}>
                {fmt(v.gate.decision === "pass" ? t.channelReady : t.channelNeedsFixes, {
                  channel: platformLabel(v.platform),
                })}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/listings/${listing.id}/report`} className={linkButton}>
              <Printer aria-hidden className="h-4 w-4" />
              {t.printable}
            </Link>
            <a href={`/api/listings/${listing.id}/export?format=md`} className={linkButton}>
              <Download aria-hidden className="h-4 w-4" />
              {t.downloadMd}
            </a>
            <a href={`/api/listings/${listing.id}/export?format=json`} className={linkButton}>
              <FileJson aria-hidden className="h-4 w-4" />
              {t.downloadJson}
            </a>
            {listing.last_run_id ? (
              <Link href={`/listings/${listing.id}/trace`} className={buttonClass("ghost", "sm")}>
                <ScrollText aria-hidden className="h-4 w-4" />
                {t.trace}
              </Link>
            ) : null}
            <Button variant="ghost" size="sm" onClick={run} disabled={running}>
              {running ? <Spinner /> : <RefreshCw aria-hidden className="h-4 w-4" />}
              {t.regenerate}
            </Button>
          </div>
          {running ? <RunProgress events={events} /> : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <KeywordsCard keywords={result.keywords} />
            <Card className="space-y-3 text-sm">
              <h2 className="font-semibold">{t.foundTitle}</h2>
              <p className="text-muted">
                {fmt(t.foundSummary, {
                  type: result.facts.product_type,
                  facts: result.facts.facts.length,
                  claims: result.facts.marketing_claims.length,
                })}
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {result.facts.facts.map((f) => (
                  <div key={f.id} className="contents">
                    <dt className="text-muted">{f.attribute.replace(/_/g, " ")}</dt>
                    <dd className="break-words">
                      {f.value}
                      {f.unit ? ` ${f.unit}` : ""}
                    </dd>
                  </div>
                ))}
              </dl>
              {result.facts.missing_info.length ? (
                <p className="rounded-lg bg-warn/5 px-3 py-2 text-xs text-warn">
                  {fmt(t.addToImprove, { items: result.facts.missing_info.join(", ") })}
                </p>
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
            aria-label={t.marketplaces}
            className="sticky top-16 z-10 -mx-4 flex gap-1 overflow-x-auto border-b border-border bg-background/90 px-4 backdrop-blur sm:mx-0 sm:px-0"
          >
            {views.map((v) => {
              const selected = v.platform === active.platform;
              return (
                <button
                  key={v.platform}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(v.platform)}
                  className={cn(
                    "-mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors duration-200",
                    selected
                      ? "border-brand text-brand"
                      : "border-transparent text-muted hover:text-foreground",
                  )}
                >
                  {platformLabel(v.platform)}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs tabular-nums",
                      selected ? "bg-brand/10" : "bg-subtle",
                    )}
                  >
                    {v.score.total}
                  </span>
                </button>
              );
            })}
          </div>

          <ChannelReport view={active} images={result.images} listingId={listing.id} />
          <ChannelPreview
            key={`preview:${active.platform}`}
            platform={active.platform}
            listing={active.listing}
            brand={listing.input.brand}
            category={result.facts.category}
            photos={listing.input.images}
            fields={active.fields}
          />
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
