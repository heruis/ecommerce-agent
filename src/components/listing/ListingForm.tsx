"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, PLATFORMS, type Platform, type ProductInputDraft } from "@/lib/contracts";
import { Button, Card, Input, Label, Spinner, Textarea } from "@/components/ui";
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

const CHANNELS: { id: Platform; label: string; hint: string }[] = [
  {
    id: "amazon_us",
    label: "Amazon US",
    hint: "title, 5 bullets, description, backend search terms",
  },
  {
    id: "tiktok_us",
    label: "TikTok Shop US",
    hint: "short title, selling points, description, hashtags",
  },
  {
    id: "shopify",
    label: "Shopify store",
    hint: "title, description, SEO title & meta description, tags",
  },
];

/** Step 1 of the journey: the seller pastes Chinese product information. Owner: WS3. */
export function ListingForm({ credits }: { credits: number }) {
  const router = useRouter();
  const [form, setForm] = useState<ProductInputDraft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const set = (key: keyof ProductInputDraft) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const platforms = form.platforms ?? [];
  const toggle = (p: Platform) =>
    setForm((f) => {
      const current = f.platforms ?? [];
      const next = current.includes(p) ? current.filter((x) => x !== p) : [...current, p];
      // Keep the canonical order so report tabs are stable.
      return { ...f, platforms: PLATFORMS.filter((x) => next.includes(x)) };
    });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
          body.error.fields.map((f: { path: string; message: string }) => [
            f.path.split(".")[0],
            f.message,
          ]),
        ),
      );
    }
    setMessage(body?.error?.message ?? "Something went wrong. Try again.");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Product information (Chinese is fine)</h2>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <Button
                key={ex.label}
                type="button"
                variant="secondary"
                onClick={() => setForm({ ...EMPTY, ...ex.input })}
              >
                Example: {ex.label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="title_zh">Product name</Label>
          <Input
            id="title_zh"
            value={form.title_zh}
            onChange={set("title_zh")}
            placeholder="例如：硅胶折叠水杯 便携旅行杯"
          />
          <FieldError message={errors.title_zh} />
        </div>
        <div>
          <Label htmlFor="description_zh">Description</Label>
          <Textarea
            id="description_zh"
            rows={5}
            value={form.description_zh}
            onChange={set("description_zh")}
            placeholder="材质、功能、使用场景、卖点……"
          />
          <FieldError message={errors.description_zh} />
        </div>
        <div>
          <Label htmlFor="specs_zh" hint="size, weight, material, package contents">
            Specifications
          </Label>
          <Textarea id="specs_zh" rows={3} value={form.specs_zh} onChange={set("specs_zh")} />
        </div>
        <div>
          <Label
            htmlFor="evidence"
            hint="certificates or test reports you actually have — used to verify claims"
          >
            Evidence
          </Label>
          <Textarea
            id="evidence"
            rows={2}
            value={form.evidence}
            onChange={set("evidence")}
            placeholder="e.g. SGS test report: BPA-free, LFGB compliant (report no. ...)"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input id="brand" value={form.brand} onChange={set("brand")} />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={form.category}
              onChange={set("category")}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="font-semibold">Where will you sell it?</h2>
          <p className="text-sm text-muted">
            You get one report with the exact fields each site&apos;s &quot;add product&quot; form
            asks for.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {CHANNELS.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[:checked]:border-brand has-[:checked]:bg-brand/5"
            >
              <input
                type="checkbox"
                checked={platforms.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="block text-xs text-muted">{c.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError message={errors.platforms} />
      </Card>

      <Card className="space-y-3">
        <div>
          <h2 className="font-semibold">Product photos (optional)</h2>
          <p className="text-sm text-muted">
            Up to 4. We check them against each site&apos;s main-image rules and suggest a shot
            list. Put the photo you want as the main image first.
          </p>
        </div>
        <PhotoPicker
          value={form.images ?? []}
          onChange={(images) => setForm((f) => ({ ...f, images }))}
        />
        <FieldError message={errors.images} />
      </Card>

      <Card className="space-y-2">
        <Label htmlFor="existing" hint="optional — we score it so you can compare before and after">
          Your current English listing
        </Label>
        <Textarea
          id="existing"
          rows={3}
          value={form.existing_listing_en}
          onChange={set("existing_listing_en")}
        />
      </Card>

      {message ? <p className="text-sm text-danger">{message}</p> : null}
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={busy || credits <= 0 || platforms.length === 0}>
          {busy ? <Spinner /> : null} Generate report (1 run)
        </Button>
        <span className="text-sm text-muted">
          {credits} run{credits === 1 ? "" : "s"} left
        </span>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-danger">{message}</p> : null;
}
