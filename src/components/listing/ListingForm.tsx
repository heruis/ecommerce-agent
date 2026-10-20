"use client";

import { Camera, FileText, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CATEGORIES,
  PLATFORMS,
  type EvidenceItem,
  type Platform,
  type ProductInputDraft,
} from "@/lib/contracts";
import { evidenceText, mergeEvidence } from "@/lib/evidence";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Alert, Button, Card, Input, Label, Select, Spinner, Textarea } from "@/components/ui";
import { EvidencePicker } from "@/components/evidence/EvidencePicker";
import { EXAMPLES } from "./examples";
import { PhotoPicker } from "./PhotoPicker";

const EMPTY: ProductInputDraft = {
  title_zh: "",
  description_zh: "",
  specs_zh: "",
  evidence: "",
  brand: "",
  category: "other",
  platforms: [...PLATFORMS],
  images: [],
  existing_listing_en: "",
};

/** Step 1 of the journey: the seller pastes Chinese product information. Owner: WS3. */
export function ListingForm({
  credits,
  evidence = [],
  today,
}: {
  credits: number;
  evidence?: EvidenceItem[];
  today: string;
}) {
  const t = useT().app;
  const f = t.form;
  const router = useRouter();
  const [form, setForm] = useState<ProductInputDraft>(EMPTY);
  const [picked, setPicked] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const set = (key: keyof ProductInputDraft) => (e: { target: { value: string } }) =>
    setForm((s) => ({ ...s, [key]: e.target.value }));
  const platforms = form.platforms ?? [];
  const toggle = (p: Platform) =>
    setForm((s) => {
      const current = s.platforms ?? [];
      const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
      // Keep the canonical order so report tabs are stable.
      return { ...s, platforms: PLATFORMS.filter((x) => next.includes(x)) };
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (platforms.length === 0) {
      setErrors({ platforms: f.pickChannel });
      return;
    }
    setBusy(true);
    setErrors({});
    setMessage(null);
    const library = evidence.filter((d) => picked.includes(d.id));
    const payload = {
      ...form,
      evidence: mergeEvidence(form.evidence ?? "", evidenceText(library, new Date(today))),
    };
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 201) {
      router.push(`/listings/${body.id}?run=1`);
      return;
    }
    if (body?.error?.fields) {
      setErrors(
        Object.fromEntries(
          body.error.fields.map((x: { path: string; message: string }) => [
            x.path.split(".")[0],
            x.message,
          ]),
        ),
      );
    }
    setMessage(body?.error?.message ?? f.error);
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Section icon={<FileText aria-hidden className="h-5 w-5" />} title={f.productSection}>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <Button
              key={ex.key}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setForm({ ...EMPTY, ...ex.input });
                setErrors({});
              }}
            >
              <Sparkles aria-hidden className="h-4 w-4 text-accent" />
              {f.examplePrefix} {f.examples[ex.key]}
            </Button>
          ))}
        </div>
        <div>
          <Label htmlFor="title_zh">{f.productName}</Label>
          <Input
            id="title_zh"
            value={form.title_zh}
            onChange={set("title_zh")}
            placeholder={f.productNamePlaceholder}
            aria-invalid={Boolean(errors.title_zh)}
          />
          <FieldError message={errors.title_zh} />
        </div>
        <div>
          <Label htmlFor="description_zh">{f.description}</Label>
          <Textarea
            id="description_zh"
            rows={5}
            value={form.description_zh}
            onChange={set("description_zh")}
            placeholder={f.descriptionPlaceholder}
            aria-invalid={Boolean(errors.description_zh)}
          />
          <FieldError message={errors.description_zh} />
        </div>
        <div>
          <Label htmlFor="specs_zh" hint={f.specsHint}>
            {f.specs}
          </Label>
          <Textarea id="specs_zh" rows={3} value={form.specs_zh} onChange={set("specs_zh")} />
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="evidence" hint={f.evidenceHint}>
              {f.evidence}
            </Label>
            <Textarea
              id="evidence"
              rows={2}
              value={form.evidence}
              onChange={set("evidence")}
              placeholder={f.evidencePlaceholder}
            />
            <FieldError message={errors.evidence} />
          </div>
          <EvidencePicker items={evidence} selected={picked} onChange={setPicked} today={today} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brand">{f.brand}</Label>
            <Input id="brand" value={form.brand} onChange={set("brand")} />
          </div>
          <div>
            <Label htmlFor="category">{f.category}</Label>
            <Select id="category" value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.categories[c]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Section>

      <Section
        icon={<Store aria-hidden className="h-5 w-5" />}
        title={f.channelsTitle}
        subtitle={f.channelsBody}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {PLATFORMS.map((id) => (
            <label
              key={id}
              className="flex min-h-11 cursor-pointer gap-3 rounded-lg border border-border p-3 transition-colors duration-200 hover:border-brand/40 has-[:checked]:border-brand has-[:checked]:bg-brand/5"
            >
              <input
                type="checkbox"
                checked={platforms.includes(id)}
                onChange={() => toggle(id)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold">{f.channels[id].label}</span>
                <span className="block text-xs text-muted">{f.channels[id].hint}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError message={errors.platforms} />
      </Section>

      <Section
        icon={<Camera aria-hidden className="h-5 w-5" />}
        title={f.photosTitle}
        subtitle={f.photosBody}
      >
        <PhotoPicker
          value={form.images ?? []}
          onChange={(images) => setForm((s) => ({ ...s, images }))}
        />
        <FieldError message={errors.images} />
      </Section>

      <Card className="space-y-2">
        <Label htmlFor="existing" hint={f.existingHint}>
          {f.existing}
        </Label>
        <Textarea
          id="existing"
          rows={3}
          value={form.existing_listing_en}
          onChange={set("existing_listing_en")}
        />
      </Card>

      {message ? <Alert tone="danger">{message}</Alert> : null}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={busy || credits <= 0 || platforms.length === 0}
        >
          {busy ? <Spinner /> : null}
          {f.submit}
        </Button>
        {credits > 0 ? (
          <span className="text-sm text-muted">{fmt(f.creditsLeft, { n: credits })}</span>
        ) : (
          <span className="text-sm">
            {f.noCredits}{" "}
            <Link href="/pricing" className="font-medium text-brand underline">
              {f.getCredits}
            </Link>
          </span>
        )}
      </div>
    </form>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          {icon}
        </span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="mt-1 text-xs text-danger">
      {message}
    </p>
  ) : null;
}
