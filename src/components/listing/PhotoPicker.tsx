"use client";

import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import type { ProductImage } from "@/lib/contracts";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Badge, Button, Spinner } from "@/components/ui";
import { WHITE_BORDER_OK } from "@/lib/report/images";
import { measureBitmap } from "./white-border";

const MAX_PHOTOS = 4;
const MAX_SIDE = 1024;
const MAX_BASE64 = 880_000;

/**
 * Optional product photos. Each one is measured (how white its border is)
 * at full detail, then downscaled in the browser to at most 1024 px and
 * re-encoded as JPEG, so uploads stay small (Vercel caps request bodies at
 * 4.5 MB) and the vision check stays cheap. Owner: WS3.
 */
export function PhotoPicker({
  value,
  onChange,
}: {
  value: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}) {
  const t = useT().app.photos;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files) return;
    setError(null);
    setBusy(true);
    const next = [...value];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) {
        setError(fmt(t.max, { n: MAX_PHOTOS }));
        break;
      }
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        setError(fmt(t.badType, { name: file.name }));
        continue;
      }
      try {
        next.push(await prepare(file));
      } catch {
        setError(fmt(t.unreadable, { name: file.name }));
      }
    }
    onChange(next);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-3">
        {value.map((img, i) => (
          <li key={i} className="relative w-28">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
            <img
              src={`data:${img.media_type};base64,${img.data}`}
              alt={img.name}
              className="h-28 w-28 rounded-lg border border-border object-cover"
            />
            <p className="mt-1 truncate text-xs text-muted">
              {i === 0 ? `1 · ${t.mainHint}` : i + 1} {img.name}
            </p>
            {img.white_ratio !== undefined ? (
              <Badge tone={img.white_ratio >= WHITE_BORDER_OK ? "ok" : "warn"} className="mt-1">
                {fmt(t.whiteBorder, { pct: Math.round(img.white_ratio * 100) })}
              </Badge>
            ) : null}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface/95 shadow-card hover:bg-subtle"
              aria-label={fmt(t.remove, { name: img.name })}
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </li>
        ))}
        {value.length < MAX_PHOTOS ? (
          <li>
            <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-center text-xs font-medium text-muted transition-colors duration-200 hover:border-brand/50 hover:bg-subtle/60 hover:text-foreground">
              {busy ? <Spinner /> : <ImagePlus aria-hidden className="h-6 w-6" />}
              {busy ? t.resizing : t.add}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void add(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </li>
        ) : null}
      </ul>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      {value.length > 0 ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
          {t.removeAll}
        </Button>
      ) : null}
    </div>
  );
}

async function prepare(file: File): Promise<ProductImage> {
  const bitmap = await createImageBitmap(file);
  const white_ratio = measureBitmap(bitmap);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  // White under transparent PNGs, so a cut-out product stays on white.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let data = "";
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    data = canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
    if (data.length <= MAX_BASE64) break;
  }
  if (data.length > MAX_BASE64) throw new Error("too large");
  return {
    name: file.name.slice(0, 120),
    media_type: "image/jpeg",
    data,
    ...(white_ratio !== undefined ? { white_ratio } : {}),
  };
}
