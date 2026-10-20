/**
 * How white is a photo's outer border? Amazon's main image needs a pure white
 * background (RGB 255,255,255); a model's impression of "white" is unreliable,
 * so the browser measures it. Pure function over RGBA pixels so it is testable
 * without a canvas. Owner: WS3.
 */
export const NEAR_WHITE = 245;
export const BORDER_SHARE = 0.04;

export function borderWhiteRatio(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  { band = Math.max(2, Math.round(Math.min(width, height) * BORDER_SHARE)), step = 2 } = {},
): number {
  if (width <= 0 || height <= 0) return 0;
  let white = 0;
  let total = 0;
  for (let y = 0; y < height; y += step) {
    const inTopOrBottom = y < band || y >= height - band;
    for (let x = 0; x < width; x += step) {
      if (!inTopOrBottom && x >= band && x < width - band) {
        x = width - band - step; // jump across the interior
        continue;
      }
      const i = (y * width + x) * 4;
      total += 1;
      if (rgba[i] >= NEAR_WHITE && rgba[i + 1] >= NEAR_WHITE && rgba[i + 2] >= NEAR_WHITE) {
        white += 1;
      }
    }
  }
  return total ? Math.round((white / total) * 1000) / 1000 : 0;
}

/** Measure a decoded image (browser only). Transparent areas count as white. */
export function measureBitmap(bitmap: ImageBitmap): number | undefined {
  try {
    // Measure at up to 1600 px: enough detail, bounded memory.
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    return borderWhiteRatio(ctx.getImageData(0, 0, w, h).data, w, h);
  } catch {
    return undefined;
  }
}
