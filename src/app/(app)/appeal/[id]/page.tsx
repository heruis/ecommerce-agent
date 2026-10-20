import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { AppealResultView } from "@/components/tools/AppealResultView";
import { AutoRefresh } from "@/components/tools/AutoRefresh";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).tools.appeal.result.title };
}

export default async function AppealResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/appeal/${id}`);
  const [t, run] = await Promise.all([getT(), getRepo().getToolRun(user.id, id)]);
  if (!run || run.kind !== "appeal") notFound();
  const r = t.tools.appeal.result;

  return (
    <div>
      <PageHeader
        title={r.title}
        subtitle={`${t.tools.platforms[run.input.platform]} · ${run.input.notice.slice(0, 120)}`}
      />
      {run.status === "running" ? (
        <>
          <AutoRefresh />
          <Alert tone="brand">{r.running}</Alert>
        </>
      ) : run.status === "failed" || !run.result ? (
        <div className="space-y-4">
          <Alert tone="danger">{fmt(r.failed, { error: run.error ?? "" })}</Alert>
          <ButtonLink href="/appeal" variant="secondary">
            {r.another}
          </ButtonLink>
        </div>
      ) : (
        <AppealResultView result={run.result} platform={run.input.platform} />
      )}
    </div>
  );
}
