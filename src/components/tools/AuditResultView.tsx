import { ArrowRight, ExternalLink } from "lucide-react";
import type { AuditResult } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { CopyText } from "./CopyText";
import { fieldLabel, listingAsText } from "./labels";
import { RiskCompare } from "./RiskBadge";

const STATUS_TONE = { verified: "ok", unverified: "warn", restricted: "danger" } as const;

/** The audit report: risk before → after, the minimal changes, claim review, rule problems. Owner: WS3. */
export async function AuditResultView({ result }: { result: AuditResult }) {
  const all = await getT();
  const t = all.tools;
  const r = t.audit.result;
  const errorsBefore = result.original_validation.violations;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{t.risk.label}</h2>
            <Badge tone={result.gate.decision === "pass" ? "ok" : "warn"}>
              {result.gate.decision === "pass" ? r.gatePass : r.gateFail}
            </Badge>
          </div>
          <RiskCompare before={result.risk_before} after={result.risk_after} />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold">{r.quality}</h2>
          {result.score_before && result.score_after ? (
            <p className="flex items-center gap-3 text-3xl font-bold tabular-nums">
              {result.score_before.total}
              <ArrowRight aria-hidden className="h-5 w-5 text-muted" />
              <span className="text-brand">{result.score_after.total}</span>
              <span className="text-sm font-normal text-muted">/ 100</span>
            </p>
          ) : null}
          <p className="text-sm text-muted">{t.platforms[result.platform]}</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{r.changes}</h2>
          {result.changes.length > 0 ? (
            <CopyText value={listingAsText(t, result.fixed)} label={r.copyAll} />
          ) : null}
        </div>
        {result.changes.length === 0 ? (
          <Alert tone="ok">{r.noChanges}</Alert>
        ) : (
          <ul className="space-y-4">
            {result.changes.map((c, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{fieldLabel(t, c.field, c.index)}</p>
                  <CopyText value={c.after} />
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <div className="rounded-md bg-danger/5 p-2 text-sm">
                    <p className="text-xs font-medium text-danger">{r.before}</p>
                    <p className="whitespace-pre-wrap break-words">{c.before || "—"}</p>
                  </div>
                  <div className="rounded-md bg-ok/5 p-2 text-sm">
                    <p className="text-xs font-medium text-ok">{r.after}</p>
                    <p className="whitespace-pre-wrap break-words">{c.after || "—"}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted">
                  <span className="font-medium">{r.why}:</span> {c.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            {r.fixedListing}
          </summary>
          <pre className="max-h-96 overflow-auto border-t border-border p-3 text-sm whitespace-pre-wrap break-words">
            {listingAsText(t, result.fixed)}
          </pre>
        </details>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{r.findings}</h2>
        {result.compliance.summary ? (
          <p className="text-sm text-muted">{result.compliance.summary}</p>
        ) : null}
        {result.compliance.claims.length === 0 ? (
          <p className="text-sm text-muted">{r.noFindings}</p>
        ) : (
          <ul className="divide-y divide-border">
            {result.compliance.claims.map((c) => (
              <li key={c.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">“{c.claim_text}”</span>
                  <Badge tone={STATUS_TONE[c.status]}>{t.claim.status[c.status]}</Badge>
                  <Badge>{t.claim.action[c.action]}</Badge>
                  <span className="text-xs text-muted">
                    {c.field === "source"
                      ? t.claim.inInput
                      : fmt(t.claim.inField, { field: fieldLabel(t, c.field, null) })}
                  </span>
                </div>
                <p className="mt-1">{c.reason}</p>
                {c.suggested_fix ? <p className="mt-1 text-ok">→ “{c.suggested_fix}”</p> : null}
                {c.policy_refs.length ? (
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                    <span className="text-muted">{t.common.sources}:</span>
                    {c.policy_refs.map((p) => (
                      <a
                        key={p.chunk_id}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand underline"
                      >
                        {p.title}
                        <ExternalLink aria-hidden className="h-3 w-3" />
                      </a>
                    ))}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="font-semibold">{r.rules}</h2>
          {errorsBefore.length === 0 ? (
            <p className="text-sm text-muted">{r.noRules}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {errorsBefore.map((v, i) => (
                <li key={i} className={v.severity === "error" ? "text-danger" : "text-warn"}>
                  {fieldLabel(t, v.field, v.index)}: {v.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="space-y-2">
          <h2 className="font-semibold">{r.needsReview}</h2>
          {[...result.gate.needs_review, ...result.warnings].length === 0 ? (
            <p className="text-sm text-muted">{all.common.states.empty}</p>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {[...new Set([...result.gate.needs_review, ...result.warnings])].map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-xs text-muted">{t.common.notLegalAdvice}</p>
        <ButtonLink href="/audit" variant="secondary">
          {r.another}
        </ButtonLink>
      </div>
    </div>
  );
}
