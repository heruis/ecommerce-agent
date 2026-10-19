"use client";

import { useState } from "react";
import type { ProductImage } from "@/lib/contracts";
import { Button } from "@/components/ui";

const MAX_PHOTOS = 4;
const MAX_SIDE = 1024;
const MAX_BASE64 = 880_000;

/**
 * Optional product photos. Each one is downscaled in the browser to at most
 * 1024 px and re-encoded as JPEG, so uploads stay small (Vercel caps request
 * bodies at 4.5 MB) and the vision check stays cheap. Owner: WS3.
 */
export function PhotoPicker({
  value,
  onChange,
}: {
  value: ProductImage[];
  onChange: (images: ProductImage[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files) return;
    setError(null);
    setBusy(true);
    const next = [...value];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) {
        setError(`Up to ${MAX_PHOTOS} photos.`);
        break;
      }
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        setError(`${file.name}: use JPEG, PNG or WebP.`);
        continue;
      }
      try {
        next.push(await downscale(file));
      } catch {
        setError(`${file.name}: could not read this image.`);
      }
    }
    onChange(next);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((img, i) => (
          <figure key={i} className="relative w-24">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
            <img
              src={`data:${img.media_type};base64,${img.data}`}
              alt={img.name}
              className="h-24 w-24 rounded-lg border border-border object-cover"
            />
            <figcaption className="mt-1 truncate text-xs text-muted">
              {i === 0 ? "1 · main?" : i + 1} {img.name}
            </figcaption>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 rounded-full bg-surface/90 px-1.5 text-xs shadow"
              aria-label={`Remove ${img.name}`}
            >
              ×
            </button>
          </figure>
        ))}
        {value.length < MAX_PHOTOS ? (
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-muted hover:bg-background">
            {busy ? "Resizing…" : "+ Add photos"}
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
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {value.length > 0 ? (
        <Button type="button" variant="ghost" onClick={() => onChange([])} className="px-2 py-1">
          Remove all photos
        </Button>
      ) : null}
    </div>
  );
}

async function downscale(file: File): Promise<ProductImage> {
  const bitmap = await createImageBitmap(file);
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
  return { name: file.name.slice(0, 120), media_type: "image/jpeg", data };
}
