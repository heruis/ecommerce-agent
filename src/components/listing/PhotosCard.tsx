import type { ImageReport, ProductImage } from "@/lib/contracts";
import { Badge, Card } from "@/components/ui";
import { platformLabel } from "@/lib/rules";

const BACKGROUND: Record<string, string> = {
  pure_white: "pure white",
  light_plain: "light, plain",
  busy: "busy / scene",
  unknown: "not checked",
};

/** The seller's photos with what the vision check saw and the main-image verdict per channel. Owner: WS3. */
export function PhotosCard({ photos, report }: { photos: ProductImage[]; report: ImageReport }) {
  if (photos.length === 0) {
    return (
      <Card className="space-y-1">
        <h2 className="font-semibold">Photos</h2>
        <p className="text-sm text-muted">
          No photos uploaded. Each channel tab has the main-image rules and a shot list to follow.
        </p>
      </Card>
    );
  }
  const observations = report.analysis?.images ?? [];
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Photos</h2>
        <p className="text-xs text-muted">
          AI photo check — confirm against each site&apos;s current image requirements.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {report.main_image.map((m) => (
          <Badge key={m.platform} tone={m.index === null ? "neutral" : m.ok ? "ok" : "warn"}>
            {platformLabel(m.platform)}:{" "}
            {m.index === null
              ? "no main photo"
              : `photo ${m.index + 1} ${m.ok ? "OK as main" : "needs work"}`}
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
              <div className="min-w-0 text-xs">
                <p className="font-medium">
                  Photo {i + 1}
                  {report.analysis?.suggested_main_index === i ? " · suggested main" : ""}
                </p>
                {o ? (
                  <>
                    <p className="text-muted">{o.shows}</p>
                    <p>Background: {BACKGROUND[o.background]}</p>
                    {o.has_text_or_logo ? (
                      <p className="text-warn">Text or logo on the photo</p>
                    ) : null}
                    {o.has_watermark ? <p className="text-warn">Watermark</p> : null}
                    {o.multiple_items_or_props ? (
                      <p className="text-warn">Props or extra items</p>
                    ) : null}
                    {o.quality_issues.map((q) => (
                      <p key={q} className="text-muted">
                        {q}
                      </p>
                    ))}
                    <p className="mt-1">
                      Alt text: <span className="text-muted">{o.alt_text}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-muted">Not analyzed.</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {report.main_image
        .filter((m) => m.issues.length > 0)
        .map((m) => (
          <div key={m.platform} className="text-xs">
            <p className="font-medium">{platformLabel(m.platform)} main image</p>
            <ul className="list-disc pl-5 text-muted">
              {m.issues.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
    </Card>
  );
}
