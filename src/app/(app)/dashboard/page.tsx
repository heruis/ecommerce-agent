import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/ui";

const TONE = { completed: "ok", failed: "danger", running: "brand", draft: "neutral" } as const;

/** The seller's listings. Owner: WS3. */
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const repo = getRepo();
  const profile = await repo.ensureProfile(user);
  const listings = await repo.listListings(user.id);
  return (
    <div>
      <PageHeader
        title="Your listings"
        subtitle={`${profile.plan === "pro" ? "Pro" : "Free"} plan · ${profile.credits_remaining} runs left`}
        action={
          <Link
            href="/listings/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
          >
            New listing
          </Link>
        }
      />
      {listings.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          No listings yet.{" "}
          <Link href="/listings/new" className="text-brand underline">
            Create your first one
          </Link>
          .
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <Link key={l.id} href={`/listings/${l.id}`} className="block">
              <Card className="flex items-center justify-between gap-4 hover:border-brand">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.title}</p>
                  <p className="text-xs text-muted">{new Date(l.updated_at).toLocaleString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {l.score !== null ? (
                    <span className="tabular-nums text-sm">{l.score}/100</span>
                  ) : null}
                  <Badge tone={TONE[l.status]}>{l.status}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
