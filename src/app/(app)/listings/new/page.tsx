import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { ListingForm } from "@/components/listing/ListingForm";
import { PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).app.form.title };
}

export default async function NewListingPage() {
  const user = await requireUser("/listings/new");
  const repo = getRepo();
  const [t, profile] = [await getT(), await repo.ensureProfile(user)];
  const evidence = await repo.listEvidence(user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.app.form.title} subtitle={t.app.form.subtitle} />
      <ListingForm
        credits={profile.credits_remaining}
        evidence={evidence}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
