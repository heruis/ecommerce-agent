import Link from "next/link";
import type { ToolKind, ToolRunSummary } from "@/lib/contracts";
import { getT } from "@/lib/i18n/server";
import { Badge, Card } from "@/components/ui";

const TONE = { running: "brand", completed: "ok", failed: "danger" } as const;

/** Recent audits or appeals for the signed-in seller. Owner: WS3. */
export async function ToolRunList({
  runs,
  kind,
  title,
  empty,
}: {
  runs: ToolRunSummary[];
  kind: ToolKind;
  title: string;
  empty: string;
}) {
  const t = (await getT()).tools;
  const status = {
    running: t.common.statusRunning,
    completed: t.common.statusCompleted,
    failed: t.common.statusFailed,
  };
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {runs.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {runs.slice(0, 10).map((r) => (
            <li key={r.id}>
              <Link
                href={`/${kind}/${r.id}`}
                className="block rounded-md py-2.5 transition-colors duration-200 hover:bg-subtle/60"
              >
                <p className="truncate text-sm font-medium">{r.title || r.id}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge tone={TONE[r.status]}>{status[r.status]}</Badge>
                  {t.platforms[r.platform]} · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
