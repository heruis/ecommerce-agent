import type { Metadata } from "next";
import { LegalDoc } from "@/components/marketing/LegalDoc";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.marketing.meta.termsTitle, description: t.marketing.meta.legalDescription };
}

/** Terms of service. Owner: WS3 (copy reviewed by the lead). */
export default async function TermsPage() {
  const t = await getT();
  return (
    <LegalDoc
      title={t.marketing.meta.termsTitle}
      doc={t.marketing.legal.terms}
      t={t.marketing.legal}
    />
  );
}
