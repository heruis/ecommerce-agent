"use client";

import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { RiskScore } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Badge, cn } from "@/components/ui";

const TONE = { low: "ok", medium: "warn", high: "danger" } as const;
const ICON = { low: ShieldCheck, medium: ShieldQuestion, high: ShieldAlert };

/**
 * Takedown-risk badge with the reasons behind it (expand to read). The level
 * is spelled out in words, not shown by color alone. Owner: WS3.
 */
export function RiskBadge({ risk, className }: { risk: RiskScore; className?: string }) {
  const t = useT().tools.risk;
  const Icon = ICON[risk.level];
  return (
    <details className={cn("group rounded-lg border border-border bg-surface", className)}>
      <summary className="flex min-h-10 list-none items-center justify-between gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon aria-hidden className="h-4 w-4" />
          {t.label}
        </span>
        <Badge tone={TONE[risk.level]}>
          {t.levels[risk.level]} · {fmt(t.score, { score: risk.score })}
        </Badge>
      </summary>
      <div className="border-t border-border px-3 py-2 text-sm">
        <p className="text-xs font-semibold uppercase text-muted">{t.why}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {risk.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">{t.explainer}</p>
      </div>
    </details>
  );
}

/** Before → after risk, as two labeled bars. */
export function RiskCompare({ before, after }: { before: RiskScore; after: RiskScore }) {
  const t = useT().tools.risk;
  const bar = { low: "bg-ok", medium: "bg-warn", high: "bg-danger" } as const;
  return (
    <div className="space-y-3">
      {(
        [
          [t.before, before],
          [t.after, after],
        ] as const
      ).map(([label, r]) => (
        <div key={label}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{label}</span>
            <span className="tabular-nums">
              {t.levels[r.level]} · {fmt(t.score, { score: r.score })}
            </span>
          </div>
          <div
            className="mt-1 h-2.5 rounded-full bg-subtle"
            role="meter"
            aria-label={`${t.label} ${label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={r.score}
          >
            <div
              className={cn("h-2.5 rounded-full transition-[width] duration-300", bar[r.level])}
              style={{ width: `${Math.max(3, r.score)}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-muted">{t.explainer}</p>
    </div>
  );
}
