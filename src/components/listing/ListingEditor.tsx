"use client";

import { useState } from "react";
import type { ListingDraft, ValidationReport } from "@/lib/contracts";
import { Badge, Button, Card, Input, Label, Spinner, Textarea } from "@/components/ui";

interface RiskyClaim {
  phrase: string;
  status: string;
  guidance: string;
}

/**
 * Stage 6 — revision & export. The seller edits any field; saving re-runs the
 * platform rules and the claim screen on the server. Owner: WS3.
 */
export function ListingEditor({
  listingId,
  generated,
  edited,
  initialValidation,
}: {
  listingId: string;
  generated: ListingDraft;
  edited: ListingDraft | null;
  initialValidation: ValidationReport;
}) {
  const [draft, setDraft] = useState<ListingDraft>(edited ?? generated);
  const [validation, setValidation] = useState<ValidationReport>(initialValidation);
  const [risky, setRisky] = useState<RiskyClaim[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<ListingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);
    if (res.ok && body) {
      setValidation(body.validation);
      setRisky(body.risky_claims);
      setSaved(true);
    }
  }

  const bytes = new TextEncoder().encode(draft.search_terms).length;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Your listing</h2>
        <div className="flex flex-wrap gap-2">
          {(["csv", "txt", "json"] as const).map((f) => (
            <a
              key={f}
              href={`/api/listings/${listingId}/export?format=${f}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-background"
            >
              Export {f.toUpperCase()}
            </a>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="title" hint={`${draft.title.length}/200`}>
          Title
        </Label>
        <Input id="title" value={draft.title} onChange={(e) => update({ title: e.target.value })} />
      </div>
      {draft.bullets.map((b, i) => (
        <div key={i}>
          <Label htmlFor={`bullet-${i}`} hint={`${b.length} chars`}>
            Bullet {i + 1}
          </Label>
          <Textarea
            id={`bullet-${i}`}
            rows={2}
            value={b}
            onChange={(e) =>
              update({ bullets: draft.bullets.map((x, j) => (j === i ? e.target.value : x)) })
            }
          />
        </div>
      ))}
      <div>
        <Label htmlFor="description" hint={`${draft.description.length}/2000`}>
          Description
        </Label>
        <Textarea
          id="description"
          rows={6}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="search_terms" hint={`${bytes}/249 bytes · AI-suggested`}>
          Backend search terms
        </Label>
        <Input
          id="search_terms"
          value={draft.search_terms}
          onChange={(e) => update({ search_terms: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner /> : null} Save & re-check
        </Button>
        <Button variant="ghost" onClick={() => update(generated)}>
          Reset to generated
        </Button>
        {saved ? <Badge tone="ok">Saved</Badge> : null}
      </div>

      {validation.violations.length > 0 || risky.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {validation.violations.map((v, i) => (
            <li key={i} className={v.severity === "error" ? "text-danger" : "text-warn"}>
              {v.severity === "error" ? "✕" : "!"} {v.field}
              {v.index !== null ? ` ${v.index + 1}` : ""}: {v.message}
            </li>
          ))}
          {risky.map((r) => (
            <li key={r.phrase} className={r.status === "restricted" ? "text-danger" : "text-warn"}>
              ⚑ “{r.phrase}” — {r.guidance}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ok">Meets all platform format rules.</p>
      )}
    </Card>
  );
}
