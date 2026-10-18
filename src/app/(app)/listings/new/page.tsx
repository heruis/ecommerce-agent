import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { ListingForm } from "@/components/listing/ListingForm";
import { PageHeader } from "@/components/ui";

export default async function NewListingPage() {
  const user = await requireUser("/listings/new");
  const profile = await getRepo().ensureProfile(user);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New listing"
        subtitle="Paste your product information. We extract facts, write the listing and check every claim."
      />
      <ListingForm credits={profile.credits_remaining} />
    </div>
  );
}
