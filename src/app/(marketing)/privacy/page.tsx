import type { Metadata } from "next";
import { LegalDoc } from "@/components/marketing/LegalDoc";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.marketing.meta.privacyTitle, description: t.marketing.meta.legalDescription };
}

/** Privacy policy. Owner: WS3 (copy reviewed by the lead). */
export default async function PrivacyPage() {
  const t = await getT();
  return (
    <LegalDoc
      title={t.marketing.meta.privacyTitle}
      doc={t.marketing.legal.privacy}
      t={t.marketing.legal}
    />
  );
}
