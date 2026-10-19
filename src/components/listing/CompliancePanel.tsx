import type { ComplianceReport } from "@/lib/contracts";
import { Badge, Card } from "@/components/ui";

const STATUS_TONE = { verified: "ok", unverified: "warn", restricted: "danger" } as const;

/**
 * Claim-by-claim verification with policy citations. One review covers every
 * channel; each channel tab shows what its policy gate fixed. Owner: WS3.
 */
export function CompliancePanel({ report }: { report: ComplianceReport }) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Claim review (all channels)</h2>
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
                      {c.field === "source" ? "in your input" : `in ${c.field.replace("_", " ")}`}
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

      {report.uncertainty.length > 0 ? (
        <p className="text-xs text-muted">Could not verify: {report.uncertainty.join(" ")}</p>
      ) : null}
      <p className="text-xs text-muted">
        ShelfPass screens for risk using summarized policies. It is not legal advice and does not
        guarantee marketplace approval.
      </p>
    </Card>
  );
}
