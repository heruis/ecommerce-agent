import {
  ChevronRight,
  Coins,
  FileSearch,
  FolderCheck,
  Gavel,
  type LucideIcon,
  PackagePlus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ListingSummary, ToolRunSummary } from "@/lib/contracts";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { fmt, type Dictionary } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/i18n/server";
import { platformLabel } from "@/lib/rules";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";

const TONE = { completed: "ok", failed: "danger", running: "brand", draft: "neutral" } as const;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).app.dashboard.title };
}

/** One place for reports, audits and takedown cases. Owner: WS3. */
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const repo = getRepo();
  const [t, locale, profile] = [await getT(), await getLocale(), await repo.ensureProfile(user)];
  const [listings, runs] = await Promise.all([
    repo.listListings(user.id),
    repo.listToolRuns(user.id),
  ]);
  const d = t.app.dashboard;
  const date = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const audits = runs.filter((r) => r.kind === "audit");
  const appeals = runs.filter((r) => r.kind === "appeal");

  const quick: { href: string; icon: LucideIcon; title: string; body: string }[] = [
    { href: "/listings/new", icon: PackagePlus, ...d.quick.report },
    { href: "/audit", icon: FileSearch, ...d.quick.audit },
    { href: "/appeal", icon: Gavel, ...d.quick.appeal },
    { href: "/evidence", icon: FolderCheck, ...d.quick.evidence },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        title={d.title}
        subtitle={d.subtitle}
        action={
          <ButtonLink href="/listings/new" variant="accent">
            <PackagePlus aria-hidden className="h-4 w-4" />
            {d.quick.report.title}
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="quick" className="lg:col-span-2">
          <h2 id="quick" className="sr-only">
            {d.quickTitle}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {quick.map((q) => (
              <li key={q.href}>
                <Link
                  href={q.href}
                  className="group flex h-full gap-4 rounded-xl border border-border bg-surface p-5 shadow-card transition-colors duration-200 hover:border-brand/50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <q.icon aria-hidden className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 font-semibold">
                      {q.title}
                      <ChevronRight
                        aria-hidden
                        className="h-4 w-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5"
                      />
                    </span>
                    <span className="mt-1 block text-sm text-muted">{q.body}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Card className="flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge tone={profile.plan === "pro" ? "brand" : "neutral"}>
                {profile.plan === "pro" ? d.planPro : d.planFree}
              </Badge>
              <Coins aria-hidden className="h-5 w-5 text-accent" />
            </div>
            <p className="text-3xl font-bold tabular-nums">
              {fmt(d.creditsLeft, { n: profile.credits_remaining })}
            </p>
            <p className="text-sm text-muted">{d.creditsHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/pricing" variant="primary" size="sm">
              {d.buyCredits}
            </ButtonLink>
            <ButtonLink href="/billing" variant="ghost" size="sm">
              {d.billing}
            </ButtonLink>
          </div>
        </Card>
      </div>

      <ListSection
        id="reports"
        title={d.reports}
        count={listings.length}
        empty={<Empty text={d.emptyReports} href="/listings/new" cta={d.startReport} />}
      >
        {listings.map((l) => (
          <ReportRow key={l.id} l={l} t={t} date={date} />
        ))}
      </ListSection>

      <div className="grid gap-10 lg:grid-cols-2">
        <ListSection
          id="audits"
          title={d.audits}
          count={audits.length}
          empty={<Empty text={d.emptyAudits} href="/audit" cta={d.startAudit} />}
        >
          {audits.map((r) => (
            <ToolRow key={r.id} r={r} t={t} date={date} />
          ))}
        </ListSection>
        <ListSection
          id="appeals"
          title={d.appeals}
          count={appeals.length}
          empty={<Empty text={d.emptyAppeals} href="/appeal" cta={d.startAppeal} />}
        >
          {appeals.map((r) => (
            <ToolRow key={r.id} r={r} t={t} date={date} />
          ))}
        </ListSection>
      </div>
    </div>
  );
}

function ListSection({
  id,
  title,
  count,
  empty,
  children,
}: {
  id: string;
  title: string;
  count: number;
  empty: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
        {title}
        {count ? <Badge>{count}</Badge> : null}
      </h2>
      {count ? <ul className="space-y-2">{children}</ul> : empty}
    </section>
  );
}

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed bg-subtle/30 shadow-none">
      <p className="text-sm text-muted">{text}</p>
      <ButtonLink href={href} variant="secondary" size="sm">
        {cta}
      </ButtonLink>
    </Card>
  );
}

function ReportRow({
  l,
  t,
  date,
}: {
  l: ListingSummary;
  t: Dictionary;
  date: Intl.DateTimeFormat;
}) {
  return (
    <li>
      <Link
        href={`/listings/${l.id}`}
        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-200 hover:border-brand/50"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{l.title || t.app.dashboard.untitled}</span>
          <span className="block truncate text-xs text-muted">
            {l.platforms.map(platformLabel).join(" · ")} · {date.format(new Date(l.updated_at))}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {l.score !== null ? (
            <span className="text-sm font-semibold tabular-nums" title={t.app.dashboard.avgScore}>
              {l.score}
              <span className="font-normal text-muted">/100</span>
            </span>
          ) : null}
          <Badge tone={TONE[l.status]}>{t.app.status[l.status]}</Badge>
        </span>
      </Link>
    </li>
  );
}

function ToolRow({ r, t, date }: { r: ToolRunSummary; t: Dictionary; date: Intl.DateTimeFormat }) {
  return (
    <li>
      <Link
        href={`/${r.kind}/${r.id}`}
        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-200 hover:border-brand/50"
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{r.title || t.app.dashboard.untitled}</span>
          <span className="block truncate text-xs text-muted">
            {platformLabel(r.platform)} · {date.format(new Date(r.created_at))}
          </span>
        </span>
        <Badge tone={TONE[r.status]}>{t.app.status[r.status]}</Badge>
      </Link>
    </li>
  );
}
