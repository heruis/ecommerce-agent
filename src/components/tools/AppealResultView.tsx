import { AlertTriangle, ExternalLink } from "lucide-react";
import type { AppealResult, Platform } from "@/lib/contracts";
import { getT } from "@/lib/i18n/server";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { CopyText } from "./CopyText";

const SEVERITY_TONE = { low: "ok", medium: "warn", high: "danger" } as const;

/** Notice analysis: policy, cause, fix steps, documents, listing edits and an English appeal. Owner: WS3. */
export async function AppealResultView({
  result,
  platform,
}: {
  result: AppealResult;
  platform: Platform;
}) {
  const t = (await getT()).tools;
  const r = t.appeal.result;
  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">{r.policyArea}</p>
            <h2 className="mt-1 text-lg font-semibold">{result.policy_area}</h2>
            <p className="text-sm text-muted">{t.platforms[platform]}</p>
          </div>
          <Badge tone={SEVERITY_TONE[result.severity]}>
            {r.severity}: {t.risk.levels[result.severity]}
          </Badge>
        </div>
        <div>
          <h3 className="text-sm font-semibold">{r.whatHappened}</h3>
          <p className="mt-1 text-sm">{result.what_happened}</p>
        </div>
        <Alert tone="warn" title={r.likelyCause}>
          <span className="flex gap-2">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            {result.likely_cause}
          </span>
        </Alert>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="font-semibold">{r.steps}</h2>
          <ol className="space-y-2">
            {result.fix_steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-semibold">{r.documents}</h2>
          {result.documents_needed.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.documents_needed.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{r.noDocuments}</p>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">{r.changes}</h2>
        {result.listing_changes.length === 0 ? (
          <p className="text-sm text-muted">{r.noChanges}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2 pr-3">{r.field}</th>
                  <th className="py-2 pr-3">{r.before}</th>
                  <th className="py-2">{r.after}</th>
                </tr>
              </thead>
              <tbody>
                {result.listing_changes.map((c, i) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="py-2 pr-3 font-medium">{c.field}</td>
                    <td className="py-2 pr-3 break-words text-danger">{c.before || "—"}</td>
                    <td className="py-2 break-words text-ok">{c.after || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{r.letter}</h2>
          <CopyText value={result.appeal_text} label={r.copyLetter} size="md" />
        </div>
        <p className="text-xs text-muted">{r.letterHint}</p>
        <pre
          lang="en"
          className="rounded-lg border border-border bg-subtle/50 p-4 text-sm whitespace-pre-wrap break-words"
        >
          {result.appeal_text}
        </pre>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">{r.citations}</h2>
        {result.policy_refs.length === 0 ? (
          <p className="text-sm text-muted">{r.noCitations}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {result.policy_refs.map((p) => (
              <li key={p.chunk_id}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-brand underline"
                >
                  {p.title}
                  <ExternalLink aria-hidden className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        )}
        {result.warnings.length ? (
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase text-muted">{t.common.warnings}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-muted">{t.common.notLegalAdvice}</p>
        <ButtonLink href="/appeal" variant="secondary">
          {r.another}
        </ButtonLink>
      </div>
    </div>
  );
}
