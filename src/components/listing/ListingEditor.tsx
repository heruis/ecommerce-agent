"use client";

import { AlertTriangle, CheckCircle2, Flag, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { ListingDraft, ListingField, Platform, ValidationReport } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { rulesFor } from "@/lib/rules";
import { Alert, Badge, Button, Card, cn, Input, Label, Spinner, Textarea } from "@/components/ui";

interface RiskyClaim {
  phrase: string;
  status: string;
  guidance: string;
}

/**
 * Stage 6 — revision. The seller edits one channel's copy; saving re-runs
 * that channel's rules and the claim screen on the server, and the publish
 * fields above refresh from the saved edit. Problems are shown next to the
 * field they belong to; counters turn amber near a limit and red over it.
 * Owner: WS3.
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
  const t = useT().app.editor;
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
      setError(body?.error?.message ?? t.saveError);
    }
  }

  const bytes = new TextEncoder().encode(draft.search_terms).length;
  const notes = (field: ListingField, index: number | null = null) => (
    <FieldNotes
      items={validation.violations.filter(
        (v) => v.field === field && (index === null || v.index === index),
      )}
    />
  );

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-semibold">{fmt(t.title, { channel: rules.label })}</h2>
        <p className="text-xs text-muted">{t.note}</p>
      </div>

      <div>
        <Label
          htmlFor={`${platform}-title`}
          hint={<Counter n={draft.title.length} max={rules.title.maxChars} />}
        >
          {t.titleField}
        </Label>
        <Input
          id={`${platform}-title`}
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
        />
        {notes("title")}
      </div>
      {rules.itemHighlights ? (
        <div>
          <Label
            htmlFor={`${platform}-item_highlights`}
            hint={<Counter n={draft.item_highlights.length} max={rules.itemHighlights.maxChars} />}
          >
            {t.itemHighlights}
          </Label>
          <Input
            id={`${platform}-item_highlights`}
            value={draft.item_highlights}
            onChange={(e) => update({ item_highlights: e.target.value })}
          />
          {notes("item_highlights")}
        </div>
      ) : null}
      {draft.bullets.map((b, i) => (
        <div key={i}>
          <Label
            htmlFor={`${platform}-bullet-${i}`}
            hint={
              <Counter
                n={b.length}
                max={rules.bullets.maxChars}
                soft={rules.bullets.recommendedMaxChars}
              />
            }
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
          {notes("bullets", i)}
        </div>
      ))}
      <div>
        <Label
          htmlFor={`${platform}-description`}
          hint={<Counter n={draft.description.length} max={rules.description.maxChars} />}
        >
          {t.description}
        </Label>
        <Textarea
          id={`${platform}-description`}
          rows={6}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
        />
        {notes("description")}
      </div>
      {rules.searchTerms ? (
        <div>
          <Label
            htmlFor={`${platform}-search_terms`}
            hint={
              <Tone n={bytes} max={rules.searchTerms.maxBytes}>
                {fmt(t.searchTermsHint, { bytes, max: rules.searchTerms.maxBytes })}
              </Tone>
            }
          >
            {t.searchTerms}
          </Label>
          <Input
            id={`${platform}-search_terms`}
            value={draft.search_terms}
            onChange={(e) => update({ search_terms: e.target.value })}
          />
          {notes("search_terms")}
        </div>
      ) : null}
      {rules.seo ? (
        <>
          <div>
            <Label
              htmlFor={`${platform}-seo_title`}
              hint={
                <Tone
                  n={draft.seo_title.length}
                  max={rules.seo.titleMax}
                  soft={rules.seo.titleRecommended}
                >
                  {fmt(t.seoTitleHint, {
                    n: draft.seo_title.length,
                    max: rules.seo.titleRecommended,
                  })}
                </Tone>
              }
            >
              {t.seoTitle}
            </Label>
            <Input
              id={`${platform}-seo_title`}
              value={draft.seo_title}
              onChange={(e) => update({ seo_title: e.target.value })}
            />
            {notes("seo_title")}
          </div>
          <div>
            <Label
              htmlFor={`${platform}-seo_description`}
              hint={
                <Tone
                  n={draft.seo_description.length}
                  max={rules.seo.descriptionMax}
                  soft={rules.seo.descriptionRecommended}
                >
                  {fmt(t.seoTitleHint, {
                    n: draft.seo_description.length,
                    max: rules.seo.descriptionRecommended,
                  })}
                </Tone>
              }
            >
              {t.seoDescription}
            </Label>
            <Textarea
              id={`${platform}-seo_description`}
              rows={2}
              value={draft.seo_description}
              onChange={(e) => update({ seo_description: e.target.value })}
            />
            {notes("seo_description")}
          </div>
        </>
      ) : null}
      {rules.tags ? (
        <div>
          <Label
            htmlFor={`${platform}-tags`}
            hint={fmt(t.tagsHint, {
              n: draft.tags.length,
              min: rules.tags.min,
              max: rules.tags.max,
            })}
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
                  .map((x) => x.trim().replace(/^#/, ""))
                  .filter(Boolean),
              })
            }
          />
          {notes("tags")}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner /> : null}
          {t.save}
        </Button>
        <Button
          variant="ghost"
          // Reports saved before Item Highlights existed have no such field.
          onClick={() => update({ ...generated, item_highlights: generated.item_highlights ?? "" })}
        >
          {t.reset}
        </Button>
        {saved ? <Badge tone="ok">{t.saved}</Badge> : null}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {risky.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {risky.map((r) => (
            <li
              key={r.phrase}
              className={cn("flex gap-2", r.status === "restricted" ? "text-danger" : "text-warn")}
            >
              <Flag aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                “{r.phrase}” — {r.guidance}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {validation.violations.length === 0 && risky.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ok">
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          {fmt(t.meetsRules, { channel: rules.label })}
        </p>
      ) : null}
    </Card>
  );
}

/** "123/200", amber past the recommended length, red past the hard limit. */
function Counter({ n, max, soft }: { n: number; max: number; soft?: number }) {
  return (
    <Tone n={n} max={max} soft={soft}>
      {n}/{soft ?? max}
    </Tone>
  );
}

function Tone({
  n,
  max,
  soft,
  children,
}: {
  n: number;
  max: number;
  soft?: number;
  children: ReactNode;
}) {
  const over = n > max;
  const near = !over && (soft !== undefined ? n > soft : n > max * 0.9);
  return (
    <span className={cn("tabular-nums", over ? "font-semibold text-danger" : near && "text-warn")}>
      {children}
    </span>
  );
}

function FieldNotes({ items }: { items: ValidationReport["violations"] }) {
  if (items.length === 0) return null;
  return (
    <ul className="mt-1.5 space-y-1">
      {items.map((v, i) => (
        <li
          key={i}
          className={cn(
            "flex gap-1.5 text-xs",
            v.severity === "error" ? "text-danger" : "text-warn",
          )}
        >
          {v.severity === "error" ? (
            <XCircle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle aria-hidden className="mt-px h-3.5 w-3.5 shrink-0" />
          )}
          {v.message}
        </li>
      ))}
    </ul>
  );
}
