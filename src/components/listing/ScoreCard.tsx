"use client";

import type { QualityScore } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Card, cn } from "@/components/ui";

/** Listing Quality Score with the before/after comparison. Owner: WS3. */
export function ScoreCard({
  score,
  baseline,
}: {
  score: QualityScore;
  baseline: QualityScore | null;
}) {
  const t = useT().app.score;
  return (
    <Card className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold">{t.title}</h2>
          <p className="text-xs text-muted">{t.note}</p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold tabular-nums">{score.total}</span>
          <span className="text-muted"> / 100</span>
          {baseline ? (
            <p className="text-xs text-muted">{fmt(t.current, { n: baseline.total })}</p>
          ) : null}
        </div>
      </div>
      <ul className="space-y-3">
        {score.components.map((c) => (
          <li key={c.dimension}>
            <div className="flex justify-between text-sm">
              <span>
                {t.dimensions[c.dimension]}{" "}
                <span className="text-xs text-muted">({c.weight}%)</span>
              </span>
              <span className="tabular-nums">{c.score}</span>
            </div>
            <div
              className="mt-1 h-2 rounded-full bg-subtle"
              role="progressbar"
              aria-label={t.dimensions[c.dimension]}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={c.score}
            >
              <div
                className={cn("h-2 rounded-full", c.score < 70 ? "bg-warn" : "bg-brand")}
                style={{ width: `${c.score}%` }}
              />
            </div>
            {c.notes[0] ? <p className="mt-1 text-xs text-muted">{c.notes[0]}</p> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
