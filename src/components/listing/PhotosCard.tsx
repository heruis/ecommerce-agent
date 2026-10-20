"use client";

import { ImageOff } from "lucide-react";
import type { ImageReport, ProductImage } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { platformLabel } from "@/lib/rules";
import { Badge, Card } from "@/components/ui";

/**
 * The seller's photos with what the vision check saw, the measured border
 * whiteness and the main-image verdict per channel. Owner: WS3.
 */
export function PhotosCard({ photos, report }: { photos: ProductImage[]; report: ImageReport }) {
  const t = useT().app.photos;
  if (photos.length === 0) {
    return (
      <Card className="flex items-start gap-3">
        <ImageOff aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
        <div>
          <h2 className="font-semibold">{t.cardTitle}</h2>
          <p className="text-sm text-muted">{t.none}</p>
        </div>
      </Card>
    );
  }
  const observations = report.analysis?.images ?? [];
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">{t.cardTitle}</h2>
        <p className="text-xs text-muted">{t.cardNote}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {report.main_image.map((m) => (
          <Badge key={m.platform} tone={m.index === null ? "neutral" : m.ok ? "ok" : "warn"}>
            {platformLabel(m.platform)}:{" "}
            {m.index === null
              ? t.noMain
              : fmt(m.ok ? t.mainOk : t.mainNeedsWork, { n: m.index + 1 })}
          </Badge>
        ))}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {photos.map((p, i) => {
          const o = observations.find((x) => x.index === i);
          return (
            <li key={i} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- seller's own upload, inline data URL */}
              <img
                src={`data:${p.media_type};base64,${p.data}`}
                alt={o?.alt_text ?? p.name}
                className="h-24 w-24 shrink-0 rounded-lg border border-border object-cover"
              />
              <div className="min-w-0 space-y-0.5 text-xs">
                <p className="font-semibold">
                  {fmt(t.photo, { n: i + 1 })}
                  {report.analysis?.suggested_main_index === i ? ` · ${t.suggestedMain}` : ""}
                </p>
                {p.white_ratio !== undefined ? (
                  <p>{fmt(t.measured, { pct: Math.round(p.white_ratio * 100) })}</p>
                ) : null}
                {o ? (
                  <>
                    <p className="text-muted">{o.shows}</p>
                    <p>
                      {t.background}: {t.backgrounds[o.background]}
                    </p>
                    {o.has_text_or_logo ? <p className="text-warn">{t.textOrLogo}</p> : null}
                    {o.has_watermark ? <p className="text-warn">{t.watermark}</p> : null}
                    {o.multiple_items_or_props ? <p className="text-warn">{t.props}</p> : null}
                    {o.quality_issues.map((q) => (
                      <p key={q} className="text-muted">
                        {q}
                      </p>
                    ))}
                    <p className="pt-1">
                      {t.altText}: <span className="text-muted">{o.alt_text}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-muted">{t.notAnalyzed}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {report.main_image
        .filter((m) => m.issues.length > 0 && m.index !== null)
        .map((m) => (
          <div key={m.platform} className="rounded-lg bg-warn/5 p-3 text-xs">
            <p className="font-semibold">
              {fmt(t.mainImageOn, { channel: platformLabel(m.platform) })}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">
              {m.issues.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
    </Card>
  );
}
