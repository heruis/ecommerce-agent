import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { channelViews } from "@/lib/report";
import { platformLabel } from "@/lib/rules";
import { PrintButton } from "@/components/listing/PrintButton";

export const metadata = { title: "Listing report · ShelfPass" };

/**
 * The printable report: one document a seller (or their VA) can follow to
 * fill in every marketplace's "add product" form. Owner: WS3.
 */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/report`);
  const listing = await getRepo().getListing(user.id, id);
  if (!listing) notFound();
  const r = listing.result;
  if (!r) {
    return (
      <p className="text-sm text-muted">
        This report has not been generated yet.{" "}
        <Link href={`/listings/${id}`} className="text-brand underline">
          Generate it
        </Link>
        .
      </p>
    );
  }
  const views = channelViews(listing);

  return (
    <article className="mx-auto max-w-4xl space-y-8 text-sm print:max-w-none print:text-xs">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/listings/${id}`} className="text-brand underline">
            ← Back to the workspace
          </Link>
          <PrintButton />
        </div>
        <h1 className="text-2xl font-semibold capitalize">
          {r.facts.product_type} — listing report
        </h1>
        <p className="text-muted">
          Source: {listing.input.title_zh} · Channels: {r.platforms.map(platformLabel).join(", ")} ·
          Generated {listing.updated_at.slice(0, 10)}
        </p>
        <p className="rounded-lg border border-border p-3 text-xs text-muted">
          ShelfPass screens for risk using summarized marketplace and US rules. It is not legal
          advice and does not guarantee approval. Keywords are AI-suggested, not search-volume data.
          Check each site&apos;s current requirements before publishing.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Keywords</h2>
        <p>
          <b>Primary:</b> {r.keywords.primary.join(", ")}
        </p>
        <p>
          <b>Secondary:</b> {r.keywords.secondary.join(", ")}
        </p>
        {r.keywords.hashtags.length ? (
          <p>
            <b>TikTok hashtags:</b> {r.keywords.hashtags.map((h) => `#${h}`).join(" ")}
          </p>
        ) : null}
      </section>

      {listing.input.images.length ? (
        <section className="space-y-2 break-inside-avoid">
          <h2 className="text-lg font-semibold">Photos</h2>
          <div className="flex flex-wrap gap-4">
            {listing.input.images.map((p, i) => {
              const o = r.images.analysis?.images.find((x) => x.index === i);
              return (
                <figure key={i} className="w-40">
                  {/* eslint-disable-next-line @next/next/no-img-element -- seller's own upload */}
                  <img
                    src={`data:${p.media_type};base64,${p.data}`}
                    alt={o?.alt_text ?? p.name}
                    className="h-40 w-40 rounded border border-border object-cover"
                  />
                  <figcaption className="mt-1 text-xs">
                    Photo {i + 1}
                    {r.images.analysis?.suggested_main_index === i ? " (suggested main)" : ""}
                    {o ? <span className="block text-muted">Alt text: {o.alt_text}</span> : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ) : null}

      {views.map((v) => {
        const verdict = r.images.main_image.find((m) => m.platform === v.platform);
        return (
          <section key={v.platform} className="space-y-3 break-before-page">
            <h2 className="text-lg font-semibold">
              {platformLabel(v.platform)}{" "}
              <span className="text-sm font-normal text-muted">
                quality {v.score.total}/100 · policy gate {v.gate.decision.toUpperCase()}
                {v.edited ? " · includes your edits" : ""}
              </span>
            </h2>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted">
                  <th className="w-44 py-1 pr-3">Form field</th>
                  <th className="py-1">Value</th>
                </tr>
              </thead>
              <tbody>
                {v.fields.map((f) => (
                  <tr key={f.key} className="border-b border-border align-top">
                    <td className="py-1.5 pr-3 font-medium">
                      {f.label}
                      {f.required ? " *" : ""}
                    </td>
                    <td className="py-1.5">
                      <p className="whitespace-pre-wrap break-words">
                        {f.value || (f.source === "seller" ? "☐ fill in yourself" : "—")}
                      </p>
                      {f.status !== "ok" || f.note ? (
                        <p className="text-xs text-muted">
                          {f.status !== "ok" ? `[${f.status}] ` : ""}
                          {f.note}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
              <div>
                <h3 className="font-semibold">Main image</h3>
                {verdict && verdict.index !== null ? (
                  <p>
                    Photo {verdict.index + 1}:{" "}
                    {verdict.ok ? "meets the checks we can run." : verdict.issues.join(" ")}
                  </p>
                ) : null}
                <ul className="list-disc pl-5">
                  {v.images.main_image_rules.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <p className="mt-1 text-muted">{v.images.gallery}</p>
              </div>
              <div>
                <h3 className="font-semibold">Shot list</h3>
                <ol className="list-decimal pl-5">
                  {v.images.shot_list.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
              </div>
            </div>
            {v.gate.needs_review.length ? (
              <div>
                <h3 className="font-semibold">Confirm before publishing</h3>
                <ul className="list-disc pl-5">
                  {v.gate.needs_review.map((x) => (
                    <li key={x}>☐ {x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}

      <section className="space-y-2 break-before-page">
        <h2 className="text-lg font-semibold">Claim review</h2>
        <p className="text-muted">{r.compliance.summary}</p>
        <ul className="space-y-2">
          {r.compliance.claims.map((c) => (
            <li key={c.id}>
              <b>{c.status}</b> “{c.claim_text}” → {c.action.replace("_", " ")}
              {c.suggested_fix ? ` (“${c.suggested_fix}”)` : ""}. {c.reason}
              {c.policy_refs.length ? (
                <span className="block text-xs text-muted">
                  Sources: {c.policy_refs.map((p) => `${p.title} (${p.url})`).join("; ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
