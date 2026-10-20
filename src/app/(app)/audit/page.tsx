import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { AuditForm } from "@/components/tools/AuditForm";
import { ToolRunList } from "@/components/tools/ToolRunList";
import { PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.tools.audit.metaTitle, description: t.tools.audit.subtitle };
}

/** Audit a live listing: paste it, get findings and the smallest fix. */
export default async function AuditPage() {
  const user = await requireUser("/audit");
  const [t, runs] = await Promise.all([getT(), getRepo().listToolRuns(user.id, "audit")]);
  const a = t.tools.audit;
  return (
    <div>
      <PageHeader title={a.title} subtitle={a.subtitle} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AuditForm />
        </div>
        <ToolRunList runs={runs} kind="audit" title={a.history.title} empty={a.history.empty} />
      </div>
    </div>
  );
}
