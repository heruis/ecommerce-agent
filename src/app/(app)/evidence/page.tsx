import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { EvidenceManager } from "@/components/evidence/EvidenceManager";
import { PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.app.evidence.title };
}

/** The seller's evidence library. Owner: WS3. */
export default async function EvidencePage() {
  const user = await requireUser("/evidence");
  const [t, repo] = [await getT(), getRepo()];
  await repo.ensureProfile(user);
  const items = await repo.listEvidence(user.id);
  return (
    <div>
      <PageHeader title={t.app.evidence.title} subtitle={t.app.evidence.subtitle} />
      <EvidenceManager initial={items} today={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
