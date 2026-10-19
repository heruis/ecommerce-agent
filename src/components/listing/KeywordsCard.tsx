import type { KeywordSet } from "@/lib/contracts";
import { Card } from "@/components/ui";
import { CopyButton } from "./CopyButton";

/** One keyword set shared by every channel. Labeled AI-suggested: we have no search-volume data. Owner: WS3. */
export function KeywordsCard({ keywords }: { keywords: KeywordSet }) {
  const rows: [string, string[], string][] = [
    ["Primary", keywords.primary, ", "],
    ["Secondary", keywords.secondary, ", "],
    ["TikTok hashtags", keywords.hashtags.map((h) => `#${h}`), " "],
  ];
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold">Keywords</h2>
        <p className="text-xs text-muted">
          AI-suggested from your product facts — not search-volume data.
        </p>
      </div>
      {rows
        .filter(([, list]) => list.length > 0)
        .map(([label, list, sep]) => (
          <div key={label}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-medium uppercase text-muted">{label}</h3>
              <CopyButton value={list.join(sep)} />
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {list.map((k) => (
                <span key={k} className="rounded-md bg-background px-2 py-0.5 text-xs">
                  {k}
                </span>
              ))}
            </div>
          </div>
        ))}
      <p className="text-xs text-muted">{keywords.rationale}</p>
    </Card>
  );
}
