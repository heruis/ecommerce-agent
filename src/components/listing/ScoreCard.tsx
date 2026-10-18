import type { QualityScore } from "@/lib/contracts";
import { Card } from "@/components/ui";

const LABELS: Record<string, string> = {
  keyword_relevance: "Keyword relevance",
  information_coverage: "Information coverage",
  language_naturalness: "Language naturalness",
  claim_verification: "Claim verification",
  format_compliance: "Format compliance",
};

/** Listing Quality Score with the before/after comparison. Owner: WS3. */
export function ScoreCard({
  score,
  baseline,
}: {
  score: QualityScore;
  baseline: QualityScore | null;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold">Listing quality</h2>
          <p className="text-xs text-muted">
            Rule checks plus an LLM judge. Not a prediction of sales.
          </p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-semibold tabular-nums">{score.total}</span>
          <span className="text-muted"> / 100</span>
          {baseline ? (
            <p className="text-xs text-muted">
              your current listing: <span className="tabular-nums">{baseline.total}</span>
            </p>
          ) : null}
        </div>
      </div>
      <ul className="space-y-3">
        {score.components.map((c) => (
          <li key={c.dimension}>
            <div className="flex justify-between text-sm">
              <span>
                {LABELS[c.dimension]} <span className="text-xs text-muted">({c.weight}%)</span>
              </span>
              <span className="tabular-nums">{c.score}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-background">
              <div
                className={`h-2 rounded-full ${c.score < 70 ? "bg-warn" : "bg-brand"}`}
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
