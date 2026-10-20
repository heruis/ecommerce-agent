"use client";

import { ExternalLink, ShieldAlert } from "lucide-react";
import type { ComplianceReport } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Badge, Card } from "@/components/ui";

const STATUS_TONE = { verified: "ok", unverified: "warn", restricted: "danger" } as const;

/**
 * Claim-by-claim verification with policy citations. One review covers every
 * channel; each channel tab shows what its policy gate fixed. Stacked rows
 * instead of a table so it reads on a phone. Owner: WS3.
 */
export function CompliancePanel({ report }: { report: ComplianceReport }) {
  const t = useT().app.compliance;
  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <ShieldAlert aria-hidden className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">{t.title}</h2>
          <p className="text-sm text-muted">{report.summary}</p>
        </div>
      </div>

      {report.claims.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          <li className="hidden grid-cols-12 gap-3 bg-subtle/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
            <span className="col-span-3">{t.claim}</span>
            <span className="col-span-2">{t.status}</span>
            <span className="col-span-3">{t.action}</span>
            <span className="col-span-4">{t.why}</span>
          </li>
          {report.claims.map((c) => (
            <li key={c.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-12 md:gap-3">
              <div className="md:col-span-3">
                <span className="font-semibold break-words">“{c.claim_text}”</span>
                <span className="block text-xs text-muted">
                  {c.field === "source"
                    ? t.inInput
                    : fmt(t.inField, { field: c.field.replace("_", " ") })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:col-span-2 md:block">
                <Badge tone={STATUS_TONE[c.status]}>{t.statuses[c.status]}</Badge>
                <span className="text-xs text-muted md:mt-1 md:block">
                  {fmt(t.risk, { risk: t.risks[c.risk] })}
                </span>
              </div>
              <div className="md:col-span-3">
                <span className="font-medium">{t.actions[c.action]}</span>
                {c.suggested_fix ? (
                  <span className="block text-xs break-words text-ok">→ “{c.suggested_fix}”</span>
                ) : null}
              </div>
              <div className="text-xs md:col-span-4">
                <p className="text-muted">{c.reason}</p>
                {c.policy_refs.map((r) => (
                  <a
                    key={r.chunk_id}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1 font-medium text-brand underline"
                  >
                    {r.title}
                    <ExternalLink aria-hidden className="h-3 w-3 shrink-0" />
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {report.uncertainty.length > 0 ? (
        <p className="text-xs text-muted">
          {fmt(t.couldNotVerify, { items: report.uncertainty.join(" ") })}
        </p>
      ) : null}
      <p className="text-xs text-muted">{t.disclaimer}</p>
    </Card>
  );
}
