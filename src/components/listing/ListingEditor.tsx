"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ListingDraft, Platform, ValidationReport } from "@/lib/contracts";
import { rulesFor } from "@/lib/rules";
import { Badge, Button, Card, Input, Label, Spinner, Textarea } from "@/components/ui";

interface RiskyClaim {
  phrase: string;
  status: string;
  guidance: string;
}

/**
 * Stage 6 — revision. The seller edits one channel's copy; saving re-runs
 * that channel's rules and the claim screen on the server, and the publish
 * fields above refresh from the saved edit. Owner: WS3.
 */
export function ListingEditor({
  listingId,
  platform,
  generated,
  current,
  initialValidation,
}: {
  listingId: string;
  platform: Platform;
  generated: ListingDraft;
  current: ListingDraft;
  initialValidation: ValidationReport;
}) {
  const router = useRouter();
  const rules = rulesFor(platform);
  const [draft, setDraft] = useState<ListingDraft>(current);
  const [validation, setValidation] = useState<ValidationReport>(initialValidation);
  const [risky, setRisky] = useState<RiskyClaim[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<ListingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, listing: draft }),
    });
    const body = await res.json().catch(() => null);
    setSaving(false);
    if (res.ok && body) {
      setValidation(body.validation);
      setRisky(body.risky_claims);
      setSaved(true);
      router.refresh();
    } else {
      setError(body?.error?.message ?? "Could not save. Try again.");
    }
  }

  const bytes = new TextEncoder().encode(draft.search_terms).length;

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Edit {rules.label} copy</h2>
        <p className="text-xs text-muted">Saving re-checks the rules and risky claims.</p>
      </div>

      <div>
        <Label htmlFor={`${platform}-title`} hint={`${draft.title.length}/${rules.title.maxChars}`}>
          Title
        </Label>
        <Input
          id={`${platform}-title`}
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
        />
      </div>
      {draft.bullets.map((b, i) => (
        <div key={i}>
          <Label
            htmlFor={`${platform}-bullet-${i}`}
            hint={`${b.length}/${rules.bullets.recommendedMaxChars} recommended`}
          >
            {rules.bullets.label.replace(/s$/, "")} {i + 1}
          </Label>
          <Textarea
            id={`${platform}-bullet-${i}`}
            rows={2}
            value={b}
            onChange={(e) =>
              update({ bullets: draft.bullets.map((x, j) => (j === i ? e.target.value : x)) })
            }
          />
        </div>
      ))}
      <div>
        <Label
          htmlFor={`${platform}-description`}
          hint={`${draft.description.length}/${rules.description.maxChars}`}
        >
          Description
        </Label>
        <Textarea
          id={`${platform}-description`}
          rows={6}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </div>
      {rules.searchTerms ? (
        <div>
          <Label
            htmlFor={`${platform}-search_terms`}
            hint={`${bytes}/${rules.searchTerms.maxBytes} bytes · AI-suggested`}
          >
            Backend search terms
          </Label>
          <Input
            id={`${platform}-search_terms`}
            value={draft.search_terms}
            onChange={(e) => update({ search_terms: e.target.value })}
          />
        </div>
      ) : null}
      {rules.seo ? (
        <>
          <div>
            <Label
              htmlFor={`${platform}-seo_title`}
              hint={`${draft.seo_title.length}/${rules.seo.titleRecommended} shown in Google`}
            >
              SEO page title
            </Label>
            <Input
              id={`${platform}-seo_title`}
              value={draft.seo_title}
              onChange={(e) => update({ seo_title: e.target.value })}
            />
          </div>
          <div>
            <Label
              htmlFor={`${platform}-seo_description`}
              hint={`${draft.seo_description.length}/${rules.seo.descriptionRecommended} shown in Google`}
            >
              Meta description
            </Label>
            <Textarea
              id={`${platform}-seo_description`}
              rows={2}
              value={draft.seo_description}
              onChange={(e) => update({ seo_description: e.target.value })}
            />
          </div>
        </>
      ) : null}
      {rules.tags ? (
        <div>
          <Label
            htmlFor={`${platform}-tags`}
            hint={`${draft.tags.length}, ${rules.tags.min}–${rules.tags.max} recommended · comma-separated`}
          >
            {rules.tags.label}
          </Label>
          <Input
            id={`${platform}-tags`}
            value={draft.tags.join(", ")}
            onChange={(e) =>
              update({
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim().replace(/^#/, ""))
                  .filter(Boolean),
              })
            }
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner /> : null} Save & re-check
        </Button>
        <Button variant="ghost" onClick={() => update(generated)}>
          Reset to generated
        </Button>
        {saved ? <Badge tone="ok">Saved</Badge> : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {validation.violations.length > 0 || risky.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {validation.violations.map((v, i) => (
            <li key={i} className={v.severity === "error" ? "text-danger" : "text-warn"}>
              {v.severity === "error" ? "✕" : "!"} {v.field.replace("_", " ")}
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
        <p className="text-sm text-ok">Meets all {rules.label} format rules.</p>
      )}
    </Card>
  );
}
