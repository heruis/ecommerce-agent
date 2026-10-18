import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { TraceTable } from "@/components/listing/TraceTable";
import { Card, PageHeader } from "@/components/ui";

/** Observability view: what each agent saw, did and cost. Owner: WS3. */
export default async function TracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/listings/${id}/trace`);
  const repo = getRepo();
  const listing = await repo.getListing(user.id, id);
  if (!listing) notFound();
  const run = listing.last_run_id ? await repo.getRun(user.id, listing.last_run_id) : null;
  return (
    <div>
      <PageHeader
        title="Agent trace"
        subtitle="Every stage, model call and tool call in the last run."
        action={
          <Link href={`/listings/${id}`} className="text-sm text-brand underline">
            Back to listing
          </Link>
        }
      />
      {run ? (
        <TraceTable run={run} />
      ) : (
        <Card className="text-sm text-muted">No run recorded yet.</Card>
      )}
    </div>
  );
}
