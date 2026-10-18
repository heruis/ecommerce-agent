import type { ComplianceReport, GateDecision } from "@/lib/contracts";
import { Badge, Card } from "@/components/ui";

const STATUS_TONE = { verified: "ok", unverified: "warn", restricted: "danger" } as const;

/** Claim-by-claim verification with policy citations. Owner: WS3. */
export function CompliancePanel({
  report,
  gate,
}: {
  report: ComplianceReport;
  gate: GateDecision;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Compliance review</h2>
        <Badge tone={gate.decision === "pass" ? "ok" : "danger"}>
          Policy gate: {gate.decision.toUpperCase()}
        </Badge>
      </div>
      <p className="text-sm text-muted">{report.summary}</p>

      {report.claims.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="py-2 pr-3">Claim</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2">Why / source</th>
              </tr>
            </thead>
            <tbody>
              {report.claims.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="py-2 pr-3">
                    <span className="font-medium">“{c.claim_text}”</span>
                    <span className="block text-xs text-muted">
                      {c.field === "source" ? "in your input" : `in ${c.field}`}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                    <span className="block text-xs text-muted">{c.risk} risk</span>
                  </td>
                  <td className="py-2 pr-3">
                    {c.action.replace("_", " ")}
                    {c.suggested_fix ? (
                      <span className="block text-xs text-ok">→ “{c.suggested_fix}”</span>
                    ) : null}
                  </td>
                  <td className="py-2 text-xs">
                    <p>{c.reason}</p>
                    {c.policy_refs.map((r) => (
                      <a
                        key={r.chunk_id}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-brand underline"
                      >
                        {r.title}
                      </a>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {gate.applied_fixes.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium">Fixed automatically</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {gate.applied_fixes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {gate.needs_review.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-warn">Needs your confirmation</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {gate.needs_review.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {report.uncertainty.length > 0 ? (
        <p className="text-xs text-muted">Could not verify: {report.uncertainty.join(" ")}</p>
      ) : null}
      <p className="text-xs text-muted">
        ListWise screens for risk using summarized policies. It is not legal advice and does not
        guarantee marketplace approval.
      </p>
    </Card>
  );
}
