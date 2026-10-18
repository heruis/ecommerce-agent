import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { ListingWorkspace } from "@/components/listing/ListingWorkspace";
import { PageHeader } from "@/components/ui";

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
  const listing = await getRepo().getListing(user.id, id);
  if (!listing) notFound();
  return (
    <div>
      <PageHeader
        title={listing.result?.facts.product_type ?? listing.input.title_zh}
        subtitle={listing.input.title_zh}
      />
      <ListingWorkspace listing={listing} autoRun={run === "1"} />
    </div>
  );
}
