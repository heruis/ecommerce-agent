"use client";

import { Search } from "lucide-react";
import type { KeywordSet } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Card, cn } from "@/components/ui";
import { CopyButton } from "./CopyButton";

/**
 * One keyword set shared by every channel. Labeled AI-suggested (no
 * search-volume data); phrases that were also real Amazon search-box
 * suggestions get a badge. Owner: WS3.
 */
export function KeywordsCard({ keywords }: { keywords: KeywordSet }) {
  const t = useT().app.keywords;
  // Older reports were saved before from_search_box existed.
  const seen = new Set(keywords.from_search_box ?? []);
  const rows: [string, string[], string][] = [
    [t.primary, keywords.primary, ", "],
    [t.secondary, keywords.secondary, ", "],
    [t.hashtags, keywords.hashtags.map((h) => `#${h}`), " "],
  ];
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">{t.title}</h2>
        <p className="text-xs text-muted">{t.note}</p>
        {seen.size ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ok">
            <Search aria-hidden className="h-3.5 w-3.5" />
            {fmt(t.seenNote, { n: seen.size })}
          </p>
        ) : null}
      </div>
      {rows
        .filter(([, list]) => list.length > 0)
        .map(([label, list, sep]) => (
          <div key={label}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
              <CopyButton value={list.join(sep)} />
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {list.map((k) => {
                const real = seen.has(k);
                return (
                  <li
                    key={k}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
                      real ? "border-ok/30 bg-ok/10 text-ok" : "border-transparent bg-subtle",
                    )}
                  >
                    {real ? <Search aria-hidden className="h-3 w-3" /> : null}
                    {k}
                    {real ? <span className="sr-only"> ({t.seen})</span> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      {seen.size ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1 rounded-md border border-ok/30 bg-ok/10 px-1.5 py-0.5 text-ok">
            <Search aria-hidden className="h-3 w-3" />
          </span>
          {t.seen}
        </p>
      ) : null}
      <p className="text-xs text-muted">{keywords.rationale}</p>
    </Card>
  );
}
