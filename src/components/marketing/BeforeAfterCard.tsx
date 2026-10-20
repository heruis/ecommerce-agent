import { ArrowDown, CheckCircle2, ShieldCheck } from "lucide-react";
import { SAMPLE_AMAZON, SAMPLE_RISKY_PHRASES } from "@/components/preview/sample";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/i18n";
import { Badge } from "@/components/ui";
import { SupplierNote } from "./SupplierNote";

/**
 * Hero visual, "before-after transformation" pattern: risky Chinese supplier
 * copy on top, the Amazon-ready result below, and what changed in between.
 * Owner: WS3.
 */
export function BeforeAfterCard({ t }: { t: Dictionary["marketing"] }) {
  const b = t.beforeAfter;
  return (
    <figure
      aria-label={b.label}
      className="relative rounded-2xl border border-border bg-surface/90 p-5 shadow-hero backdrop-blur sm:p-6"
    >
      <figcaption className="sr-only">{b.label}</figcaption>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{b.before}</p>
      <SupplierNote className="mt-2 text-[15px] leading-relaxed" />

      <div className="my-4 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <ArrowDown aria-hidden className="h-4 w-4" />
        </span>
        <ul className="flex flex-wrap gap-1.5">
          {SAMPLE_RISKY_PHRASES.map((p) => (
            <li key={p.zh}>
              <Badge tone={p.outcome === "removed" ? "danger" : "warn"}>
                <span lang="zh-CN">{p.zh}</span>
                <span aria-hidden>→</span>
                {p.to ? <span>{p.to}</span> : <span>{b.removed}</span>}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{b.after}</p>
      <p className="mt-2 font-semibold leading-snug">{SAMPLE_AMAZON.title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-muted">
        {SAMPLE_AMAZON.bullets.slice(0, 2).map((x) => (
          <li key={x} className="flex gap-2">
            <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Badge tone="ok">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
          {b.gate}
        </Badge>
        <span className="text-xs text-muted">
          {fmt(b.fixes, { n: SAMPLE_RISKY_PHRASES.length })}
        </span>
      </div>
    </figure>
  );
}
