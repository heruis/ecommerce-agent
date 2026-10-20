"use client";

import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { EVIDENCE_KINDS, type EvidenceItem, type EvidenceKind } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import { ExpiryBadge } from "./ExpiryBadge";
import { KindIcon } from "./KindIcon";

const BLANK = {
  name: "",
  kind: "test_report" as EvidenceKind,
  issuer: "",
  reference: "",
  claims: "",
  expires_on: "",
  notes: "",
};

/**
 * The seller's evidence library: add, review and delete documents that back
 * claims. Server routes check ownership; this only renders and calls them.
 * Owner: WS3.
 */
export function EvidenceManager({ initial, today }: { initial: EvidenceItem[]; today: string }) {
  const t = useT().app.evidence;
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const set = (key: keyof typeof BLANK) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    const res = await fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        claims: form.claims
          .split(/[,，、\n]/)
          .map((c) => c.trim())
          .filter(Boolean),
        expires_on: form.expires_on || null,
      }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (res.ok && body?.item) {
      setItems((list) => [body.item as EvidenceItem, ...list]);
      setForm(BLANK);
      return;
    }
    if (body?.error?.fields) {
      setErrors(
        Object.fromEntries(
          body.error.fields.map((f: { path: string; message: string }) => [
            f.path.split(".")[0],
            f.message,
          ]),
        ),
      );
    }
    setMessage(body?.error?.message ?? t.saveError);
  }

  async function remove(item: EvidenceItem) {
    if (!window.confirm(fmt(t.confirmDelete, { name: item.name }))) return;
    setDeleting(item.id);
    setMessage(null);
    const res = await fetch(`/api/evidence/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) setItems((list) => list.filter((x) => x.id !== item.id));
    else setMessage(t.deleteError);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-2">
        <Card className="space-y-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Plus aria-hidden className="h-4 w-4 text-brand" />
            {t.addTitle}
          </h2>
          <form onSubmit={add} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="ev-name">{t.name}</Label>
              <Input
                id="ev-name"
                value={form.name}
                onChange={set("name")}
                placeholder={t.namePlaceholder}
                required
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError message={errors.name} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ev-kind">{t.kind}</Label>
                <Select id="ev-kind" value={form.kind} onChange={set("kind")}>
                  {EVIDENCE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t.kinds[k]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="ev-issuer">{t.issuer}</Label>
                <Input
                  id="ev-issuer"
                  value={form.issuer}
                  onChange={set("issuer")}
                  placeholder={t.issuerPlaceholder}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ev-reference">{t.reference}</Label>
              <Input id="ev-reference" value={form.reference} onChange={set("reference")} />
            </div>
            <div>
              <Label htmlFor="ev-claims" hint={t.claimsHint}>
                {t.claims}
              </Label>
              <Input
                id="ev-claims"
                value={form.claims}
                onChange={set("claims")}
                placeholder={t.claimsPlaceholder}
                aria-invalid={Boolean(errors.claims)}
              />
              <FieldError message={errors.claims} />
            </div>
            <div>
              <Label htmlFor="ev-expires" hint={t.expiresHint}>
                {t.expires}
              </Label>
              <Input
                id="ev-expires"
                type="date"
                value={form.expires_on}
                onChange={set("expires_on")}
                aria-invalid={Boolean(errors.expires_on)}
              />
              <FieldError message={errors.expires_on} />
            </div>
            <div>
              <Label htmlFor="ev-notes">{t.notes}</Label>
              <Textarea id="ev-notes" rows={2} value={form.notes} onChange={set("notes")} />
            </div>
            {message ? <Alert tone="danger">{message}</Alert> : null}
            <Button type="submit" variant="primary" disabled={busy} className="w-full">
              {busy ? <Spinner /> : null}
              {busy ? t.saving : t.add}
            </Button>
          </form>
        </Card>

        <Card className="space-y-2 bg-subtle/40">
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck aria-hidden className="h-4 w-4 text-ok" />
            {t.whyTitle}
          </h2>
          <p className="text-sm text-muted">{t.whyBody}</p>
        </Card>
      </div>

      <section className="space-y-3 lg:col-span-3" aria-labelledby="ev-list">
        <div className="flex items-center justify-between">
          <h2 id="ev-list" className="font-semibold">
            {t.title}
          </h2>
          <span className="text-sm text-muted">{fmt(t.count, { n: items.length })}</span>
        </div>
        {items.length === 0 ? (
          <Card className="text-center text-sm text-muted">{t.empty}</Card>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <Card className="flex gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <KindIcon kind={item.kind} />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium break-words">{item.name}</p>
                        <p className="text-xs text-muted">
                          {t.kinds[item.kind]}
                          {item.issuer ? ` · ${item.issuer}` : ""}
                          {item.reference ? ` · ${item.reference}` : ""}
                        </p>
                      </div>
                      <ExpiryBadge item={item} today={today} />
                    </div>
                    {item.claims.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.claims.map((c) => (
                          <Badge key={c} tone="brand">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {item.notes ? <p className="text-xs text-muted">{item.notes}</p> : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(item)}
                    disabled={deleting === item.id}
                    aria-label={`${t.delete}: ${item.name}`}
                    className="self-start text-danger"
                  >
                    {deleting === item.id ? (
                      <Spinner />
                    ) : (
                      <Trash2 aria-hidden className="h-4 w-4" />
                    )}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="mt-1 text-xs text-danger">
      {message}
    </p>
  ) : null;
}
