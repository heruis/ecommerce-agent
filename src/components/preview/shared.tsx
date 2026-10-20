import type { ReactNode } from "react";

/** "$12.99" -> ["12", "99"]; anything unparseable is shown as is. */
export function splitPrice(price: string): [string, string] {
  const m = price.replace(/[^0-9.]/g, "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return [price, ""];
  return [m[1], (m[2] ?? "00").padEnd(2, "0")];
}

/** "Folds Flat: Collapses to 3 cm" -> ["Folds Flat", "Collapses to 3 cm"]. */
export function splitBullet(bullet: string): [string | null, string] {
  const i = bullet.indexOf(":");
  if (i > 0 && i <= 40) return [bullet.slice(0, i).trim(), bullet.slice(i + 1).trim()];
  return [null, bullet];
}

/** Product photo: a seller upload (data URL) or a static demo asset. */
export function PreviewImage({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URLs and SVG demo art
    <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" />
  );
}

export function PreviewCaption({ children }: { children: ReactNode }) {
  return <figcaption className="mt-2 text-center text-xs text-muted">{children}</figcaption>;
}
