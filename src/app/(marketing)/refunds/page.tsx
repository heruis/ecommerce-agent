import type { Metadata } from "next";
import { LegalDoc } from "@/components/marketing/LegalDoc";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.marketing.meta.refundsTitle, description: t.marketing.meta.legalDescription };
}

/** Refund policy. Owner: WS3 (copy reviewed by the lead). */
export default async function RefundsPage() {
  const t = await getT();
  return (
    <LegalDoc
      title={t.marketing.meta.refundsTitle}
      doc={t.marketing.legal.refunds}
      t={t.marketing.legal}
    />
  );
}
