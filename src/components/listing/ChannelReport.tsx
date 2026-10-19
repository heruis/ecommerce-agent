import type { ImageReport } from "@/lib/contracts";
import type { ChannelView } from "@/lib/report";
import { platformLabel } from "@/lib/rules";
import { Badge, Card } from "@/components/ui";
import { CopyButton } from "./CopyButton";

const STATUS_TONE = { ok: "ok", warning: "warn", missing: "danger" } as const;
const SOURCE_LABEL = {
  generated: "ShelfPass",
  fact: "from your input",
  seller: "you fill in",
} as const;

/**
 * One marketplace's "add product" form, field by field, ready to copy into
 * Seller Center / Shopify admin, plus that site's photo rules. Owner: WS3.
 */
export function ChannelReport({
  view,
  images,
  listingId,
}: {
  view: ChannelView;
  images: ImageReport;
  listingId: string;
}) {
  const label = platformLabel(view.platform);
  const verdict = images.main_image.find((m) => m.platform === view.platform);
  const missing = view.fields.filter((f) => f.required && !f.value).length;

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">{label} — publish fields</h2>
            <p className="text-xs text-muted">
              In the order the {label} form asks for them.{" "}
              {view.edited ? "Includes your edits. " : ""}
              {missing ? `${missing} required field(s) are yours to fill in.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {(["csv", "txt"] as const).map((f) => (
              <a
                key={f}
                href={`/api/listings/${listingId}/export?format=${f}&platform=${view.platform}`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-background"
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
                <th className="w-44 py-2 pr-3">Field</th>
                <th className="py-2 pr-3">Value</th>
                <th className="w-28 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {view.fields.map((f) => (
                <tr key={f.key} className="border-t border-border align-top">
                  <td className="py-2 pr-3">
                    <span className="font-medium">{f.label}</span>
                    {f.required ? <span className="text-danger"> *</span> : null}
                    <span className="block text-xs text-muted">{SOURCE_LABEL[f.source]}</span>
                  </td>
                  <td className="py-2 pr-3">
                    {f.value ? (
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words">{f.value}</p>
                        <CopyButton value={f.value} />
                      </div>
                    ) : (
                      <p className="text-muted italic">
                        {f.source === "seller" ? "Fill in yourself" : "—"}
                      </p>
                    )}
                    {f.note ? <p className="mt-1 text-xs text-muted">{f.note}</p> : null}
                  </td>
                  <td className="py-2">
                    <Badge tone={STATUS_TONE[f.status]}>{f.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3 text-sm">
          <h2 className="font-semibold">{label} — photos</h2>
          {verdict && verdict.index !== null ? (
            <p className={verdict.ok ? "text-ok" : "text-warn"}>
              Main image: photo {verdict.index + 1}{" "}
              {verdict.ok ? "meets the checks we can run." : "— " + verdict.issues.join(" ")}
            </p>
          ) : null}
          <div>
            <h3 className="text-xs font-medium uppercase text-muted">Main image rules</h3>
            <ul className="mt-1 list-disc pl-5">
              {view.images.main_image_rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <p className="text-muted">{view.images.gallery}</p>
          <div>
            <h3 className="text-xs font-medium uppercase text-muted">Shot list</h3>
            <ol className="mt-1 list-decimal pl-5">
              {view.images.shot_list.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>
        </Card>

        <Card className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{label} — policy gate</h2>
            <Badge tone={view.gate.decision === "pass" ? "ok" : "danger"}>
              {view.gate.decision.toUpperCase()}
            </Badge>
          </div>
          {view.gate.applied_fixes.length ? (
            <div>
              <h3 className="text-xs font-medium uppercase text-muted">Fixed automatically</h3>
              <ul className="mt-1 list-disc pl-5 text-muted">
                {view.gate.applied_fixes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted">Nothing needed fixing.</p>
          )}
          {view.gate.needs_review.length ? (
            <div>
              <h3 className="text-xs font-medium uppercase text-warn">Confirm before publishing</h3>
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
