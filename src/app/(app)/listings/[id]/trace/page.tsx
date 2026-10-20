import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { TraceTable } from "@/components/listing/TraceTable";
import { Card, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).app.trace.title };
}

/** Observability view: what each agent saw, did and cost. Owner: WS3. */
export default async function TracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/trace`);
  const repo = getRepo();
  const [t, listing] = [await getT(), await repo.getListing(user.id, id)];
  if (!listing) notFound();
  const run = listing.last_run_id ? await repo.getRun(user.id, listing.last_run_id) : null;
  return (
    <div>
      <Link
        href={`/listings/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        {t.app.trace.back}
      </Link>
      <PageHeader title={t.app.trace.title} subtitle={t.app.trace.subtitle} />
      {run ? (
        <TraceTable run={run} />
      ) : (
        <Card className="text-sm text-muted">{t.app.trace.none}</Card>
      )}
    </div>
  );
}
