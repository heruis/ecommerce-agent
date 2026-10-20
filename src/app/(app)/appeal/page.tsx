import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { getT } from "@/lib/i18n/server";
import { AppealForm } from "@/components/tools/AppealForm";
import { ToolRunList } from "@/components/tools/ToolRunList";
import { PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.tools.appeal.metaTitle, description: t.tools.appeal.subtitle };
}

/** Takedown & appeal help: paste the notice, get the cause, the fix and an appeal. */
export default async function AppealPage() {
  const user = await requireUser("/appeal");
  const [t, runs] = await Promise.all([getT(), getRepo().listToolRuns(user.id, "appeal")]);
  const a = t.tools.appeal;
  return (
    <div>
      <PageHeader title={a.title} subtitle={a.subtitle} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AppealForm />
        </div>
        <ToolRunList runs={runs} kind="appeal" title={a.history.title} empty={a.history.empty} />
      </div>
    </div>
  );
}
