import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { channelViews } from "@/lib/report";
import { ListingWorkspace } from "@/components/listing/ListingWorkspace";
import { PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).app.report.metaTitle };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { id } = await params;
  const { run } = await searchParams;
  const user = await requireUser(`/listings/${id}`);
  const [t, listing] = [await getT(), await getRepo().getListing(user.id, id)];
  if (!listing) notFound();
  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        {t.app.dashboard.title}
      </Link>
      <PageHeader
        title={
          <span className="capitalize">
            {listing.result?.facts.product_type ?? listing.input.title_zh}
          </span>
        }
        subtitle={listing.input.title_zh}
      />
      <ListingWorkspace listing={listing} views={channelViews(listing)} autoRun={run === "1"} />
    </div>
  );
}
