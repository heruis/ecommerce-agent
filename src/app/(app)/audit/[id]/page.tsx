import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRepo } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { AuditResultView } from "@/components/tools/AuditResultView";
import { AutoRefresh } from "@/components/tools/AutoRefresh";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).tools.audit.result.title };
}

export default async function AuditResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/audit/${id}`);
  const [t, run] = await Promise.all([getT(), getRepo().getToolRun(user.id, id)]);
  if (!run || run.kind !== "audit") notFound();
  const r = t.tools.audit.result;
  const firstLine =
    run.result?.original.title || (run.input.listing_text.split("\n").find((l) => l.trim()) ?? "");

  return (
    <div>
      <PageHeader
        title={r.title}
        subtitle={`${t.tools.platforms[run.input.platform]} · ${firstLine.slice(0, 120)}`}
      />
      {run.status === "running" ? (
        <>
          <AutoRefresh />
          <Alert tone="brand">{r.running}</Alert>
        </>
      ) : run.status === "failed" || !run.result ? (
        <div className="space-y-4">
          <Alert tone="danger">{fmt(r.failed, { error: run.error ?? "" })}</Alert>
          <ButtonLink href="/audit" variant="secondary">
            {r.another}
          </ButtonLink>
        </div>
      ) : (
        <AuditResultView result={run.result} />
      )}
    </div>
  );
}
