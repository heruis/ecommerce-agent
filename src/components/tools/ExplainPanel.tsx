"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import type { ClaimAssessment, Platform, SellerExplanation } from "@/lib/contracts";
import { useT } from "@/lib/i18n/client";
import { Alert, Badge, Button, Card, Spinner } from "@/components/ui";

type ClaimLabel = Pick<ClaimAssessment, "id" | "claim_text" | "status">;
const STATUS_TONE = { verified: "ok", unverified: "warn", restricted: "danger" } as const;

/**
 * "Explain in Chinese": summary, back-translation and a note per claim, for
 * sellers who don't read English fluently. Free (no credit). Owner: WS3.
 */
export function ExplainPanel({ listingId, platform }: { listingId: string; platform: Platform }) {
  const t = useT().tools;
  const e = t.explain;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [data, setData] = useState<{ explanation: SellerExplanation; claims: ClaimLabel[] } | null>(
    null,
  );
  const [open, setOpen] = useState(true);

  async function load() {
    setBusy(true);
    setError(false);
    const res = await fetch(`/api/listings/${listingId}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, language: "zh" }),
    }).catch(() => null);
    const body = res ? await res.json().catch(() => null) : null;
    setBusy(false);
    if (res?.ok && body?.explanation) {
      setData(body);
      setOpen(true);
    } else setError(true);
  }

  if (!data || !open) {
    return (
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button
          type="button"
          variant="secondary"
          onClick={data ? () => setOpen(true) : load}
          disabled={busy}
        >
          {busy ? <Spinner /> : <Languages aria-hidden className="h-4 w-4" />}
          {busy ? e.running : e.button}
        </Button>
        <span className="text-xs text-muted">{e.free}</span>
        {error ? <Alert tone="danger">{e.error}</Alert> : null}
      </div>
    );
  }

  const { explanation: x, claims } = data;
  const claimById = new Map(claims.map((c) => [c.id, c]));
  return (
    <Card lang="zh-CN" className="space-y-4 border-brand/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Languages aria-hidden className="h-4 w-4 text-brand" />
          {e.title}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {e.hide}
        </Button>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase text-muted">{e.summary}</h3>
        <p className="mt-1 text-sm">{x.summary}</p>
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase text-muted">{e.backTranslation}</h3>
        <div className="mt-1 space-y-2 rounded-lg bg-subtle/60 p-3 text-sm">
          <p className="font-medium">{x.back_translation.title}</p>
          <ul className="list-disc space-y-1 pl-5">
            {x.back_translation.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          <p className="whitespace-pre-wrap">{x.back_translation.description}</p>
        </div>
      </div>
      {x.claim_notes.length ? (
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted">{e.claimNotes}</h3>
          <ul className="mt-1 space-y-2 text-sm">
            {x.claim_notes.map((n) => {
              const c = claimById.get(n.claim_id);
              return (
                <li key={n.claim_id}>
                  {c ? (
                    <span className="mr-2 inline-flex items-center gap-2">
                      <span className="font-medium">“{c.claim_text}”</span>
                      <Badge tone={STATUS_TONE[c.status]}>{t.claim.status[c.status]}</Badge>
                    </span>
                  ) : null}
                  {n.note}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
