import { ChevronLeft, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { channelViews } from "@/lib/report";
import { platformLabel } from "@/lib/rules";
import { PrintButton } from "@/components/listing/PrintButton";
import { Logo } from "@/components/layout/Logo";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).app.report.metaTitle };
}

/**
 * The printable report: one document a seller (or their VA) can follow to
 * fill in every marketplace's "add product" form. Owner: WS3.
 */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/report`);
  const [t, listing] = [await getT(), await getRepo().getListing(user.id, id)];
  if (!listing) notFound();
  const tr = t.app.report;
  const r = listing.result;
  if (!r) {
    return (
      <p className="text-sm text-muted">
        {tr.notGenerated}{" "}
        <Link href={`/listings/${id}`} className="font-medium text-brand underline">
          {tr.generateIt}
        </Link>
      </p>
    );
  }
  const views = channelViews(listing);
  const seen = new Set(r.keywords.from_search_box ?? []);
  const keywordList = (list: string[]) =>
    list.map((k, i) => (
      <span key={k}>
        {i > 0 ? ", " : ""}
        {k}
        {seen.has(k) ? (
          <Search aria-label={tr.seen} className="ml-0.5 inline h-3 w-3 text-ok" />
        ) : null}
      </span>
    ));

  return (
    <article className="mx-auto max-w-4xl space-y-8 text-sm print:max-w-none print:text-xs">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/listings/${id}`}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
            {tr.back}
          </Link>
          <PrintButton />
        </div>
        <div className="hidden print:block">
          <Logo />
        </div>
        <h1 className="text-2xl font-bold text-balance capitalize">
          {fmt(tr.heading, { product: r.facts.product_type })}
        </h1>
        <p className="text-muted">
          {fmt(tr.source, {
            source: listing.input.title_zh,
            channels: r.platforms.map(platformLabel).join(", "),
            date: listing.updated_at.slice(0, 10),
          })}
        </p>
        <p className="rounded-lg border border-border bg-subtle/40 p-3 text-xs text-muted">
          {tr.disclaimer}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{tr.keywords}</h2>
        <p>
          <b>{tr.primary}:</b> {keywordList(r.keywords.primary)}
        </p>
        <p>
          <b>{tr.secondary}:</b> {keywordList(r.keywords.secondary)}
        </p>
        {r.keywords.hashtags.length ? (
          <p>
            <b>{tr.hashtags}:</b> {r.keywords.hashtags.map((h) => `#${h}`).join(" ")}
          </p>
        ) : null}
        {seen.size ? (
          <p className="flex items-center gap-1 text-xs text-muted">
            <Search aria-hidden className="h-3 w-3 text-ok" /> {tr.seen}
          </p>
        ) : null}
      </section>

      {listing.input.images.length ? (
        <section className="space-y-2 break-inside-avoid">
          <h2 className="text-lg font-semibold">{tr.photos}</h2>
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
                    {fmt(tr.photo, { n: i + 1 })}
                    {r.images.analysis?.suggested_main_index === i ? ` ${tr.suggestedMain}` : ""}
                    {o ? (
                      <span className="block text-muted">
                        {tr.altText}: {o.alt_text}
                      </span>
                    ) : null}
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
                {fmt(tr.channelMeta, {
                  score: v.score.total,
                  gate: v.gate.decision.toUpperCase(),
                })}
                {v.edited ? ` · ${tr.edited}` : ""}
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted">
                    <th className="w-44 py-1 pr-3">{tr.formField}</th>
                    <th className="py-1">{tr.value}</th>
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
                          {f.value || (f.source === "seller" ? tr.fillIn : "—")}
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
              <div>
                <h3 className="font-semibold">{tr.mainImage}</h3>
                {verdict && verdict.index !== null ? (
                  <p>
                    {fmt(tr.photo, { n: verdict.index + 1 })}:{" "}
                    {verdict.ok ? tr.meetsChecks : verdict.issues.join(" ")}
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
                <h3 className="font-semibold">{tr.shotList}</h3>
                <ol className="list-decimal pl-5">
                  {v.images.shot_list.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
              </div>
            </div>
            {v.gate.needs_review.length ? (
              <div>
                <h3 className="font-semibold">{tr.confirm}</h3>
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
        <h2 className="text-lg font-semibold">{tr.claimReview}</h2>
        <p className="text-muted">{r.compliance.summary}</p>
        <ul className="space-y-2">
          {r.compliance.claims.map((c) => (
            <li key={c.id}>
              <b>{t.app.compliance.statuses[c.status]}</b> “{c.claim_text}” →{" "}
              {t.app.compliance.actions[c.action]}
              {c.suggested_fix ? ` (“${c.suggested_fix}”)` : ""}. {c.reason}
              {c.policy_refs.length ? (
                <span className="block text-xs text-muted">
                  {tr.sources}: {c.policy_refs.map((p) => `${p.title} (${p.url})`).join("; ")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
