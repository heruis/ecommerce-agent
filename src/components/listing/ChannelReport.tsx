"use client";

import type { ImageReport } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import type { ChannelView } from "@/lib/report";
import { platformLabel } from "@/lib/rules";
import { Badge, Card } from "@/components/ui";
import { ExplainPanel } from "@/components/tools/ExplainPanel";
import { RiskBadge } from "@/components/tools/RiskBadge";
import { CopyButton } from "./CopyButton";

const STATUS_TONE = { ok: "ok", warning: "warn", missing: "danger" } as const;

/**
 * One marketplace's "add product" form, field by field, ready to copy into
 * Seller Center / Shopify admin, plus that site's takedown risk, photo rules
 * and policy gate, and an on-demand explanation in Chinese. Owner: WS3.
 */
export function ChannelReport({
  view,
  images,
  listingId,
  explain = true,
}: {
  view: ChannelView;
  images: ImageReport;
  listingId: string;
  /** Show the "Explain in Chinese" panel (off for printable pages). */
  explain?: boolean;
}) {
  const t = useT().tools;
  const c = t.channel;
  const label = platformLabel(view.platform);
  const verdict = images.main_image.find((m) => m.platform === view.platform);
  const missing = view.fields.filter((f) => f.required && !f.value).length;

  return (
    <div className="space-y-6">
      {view.risk ? <RiskBadge risk={view.risk} /> : null}
      {explain ? <ExplainPanel listingId={listingId} platform={view.platform} /> : null}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{fmt(c.publishFields, { channel: label })}</h2>
            <p className="text-xs text-muted">
              {fmt(c.intro, { channel: label })} {view.edited ? `${c.includesEdits} ` : ""}
              {missing ? fmt(c.missing, { n: missing }) : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {(["csv", "txt"] as const).map((f) => (
              <a
                key={f}
                href={`/api/listings/${listingId}/export?format=${f}&platform=${view.platform}`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-subtle"
              >
                {label} {f.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="w-44 py-2 pr-3">{c.headField}</th>
                <th className="py-2 pr-3">{c.headValue}</th>
                <th className="w-28 py-2">{c.headStatus}</th>
              </tr>
            </thead>
            <tbody>
              {view.fields.map((f) => (
                <tr key={f.key} className="border-t border-border align-top">
                  <td className="py-2 pr-3">
                    <span className="font-medium">{f.label}</span>
                    {f.required ? <span className="text-danger"> *</span> : null}
                    <span className="block text-xs text-muted">{c.source[f.source]}</span>
                  </td>
                  <td className="py-2 pr-3">
                    {f.value ? (
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{f.value}</p>
                        <CopyButton value={f.value} />
                      </div>
                    ) : (
                      <p className="text-muted italic">
                        {f.source === "seller" ? c.fillYourself : "—"}
                      </p>
                    )}
                    {f.note ? <p className="mt-1 text-xs text-muted">{f.note}</p> : null}
                  </td>
                  <td className="py-2">
                    <Badge tone={STATUS_TONE[f.status]}>{c.status[f.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3 text-sm">
          <h2 className="font-semibold">{fmt(c.photos, { channel: label })}</h2>
          {verdict && verdict.index !== null ? (
            <p className={verdict.ok ? "text-ok" : "text-warn"}>
              {fmt(c.mainImage, { n: verdict.index + 1 })}{" "}
              {verdict.ok ? c.mainImageOk : `— ${verdict.issues.join(" ")}`}
            </p>
          ) : null}
          <div>
            <h3 className="text-xs font-medium uppercase text-muted">{c.mainRules}</h3>
            <ul className="mt-1 list-disc pl-5">
              {view.images.main_image_rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <p className="text-muted">{view.images.gallery}</p>
          <div>
            <h3 className="text-xs font-medium uppercase text-muted">{c.shotList}</h3>
            <ol className="mt-1 list-decimal pl-5">
              {view.images.shot_list.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        </Card>

        <Card className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{fmt(c.gate, { channel: label })}</h2>
            <Badge tone={view.gate.decision === "pass" ? "ok" : "danger"}>
              {view.gate.decision.toUpperCase()}
            </Badge>
          </div>
          {view.gate.applied_fixes.length ? (
            <div>
              <h3 className="text-xs font-medium uppercase text-muted">{c.fixedAuto}</h3>
              <ul className="mt-1 list-disc pl-5 text-muted">
                {view.gate.applied_fixes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted">{c.nothingFixed}</p>
          )}
          {view.gate.needs_review.length ? (
            <div>
              <h3 className="text-xs font-medium uppercase text-warn">{c.confirm}</h3>
              <ul className="mt-1 list-disc pl-5">
                {view.gate.needs_review.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
