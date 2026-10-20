import { describe, expect, it } from "vitest";
import { borderWhiteRatio } from "./white-border";

/** A w×h RGBA image: `inner` color inside, `border` color on a frame of `frame` px. */
function image(w: number, h: number, border: number[], inner: number[], frame = 10) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x < frame || y < frame || x >= w - frame || y >= h - frame;
      const [r, g, b] = edge ? border : inner;
      const i = (y * w + x) * 4;
      px.set([r, g, b, 255], i);
    }
  }
  return px;
}

describe("borderWhiteRatio", () => {
  it("is 1 for a product on pure white, whatever the product color", () => {
    expect(borderWhiteRatio(image(200, 200, [255, 255, 255], [20, 60, 200]), 200, 200)).toBe(1);
  });

  it("counts near-white (JPEG noise) as white but not light grey", () => {
    expect(borderWhiteRatio(image(200, 200, [248, 250, 247], [0, 0, 0]), 200, 200)).toBe(1);
    expect(borderWhiteRatio(image(200, 200, [230, 230, 230], [255, 255, 255]), 200, 200)).toBe(0);
  });

  it("measures only the border, not the product in the middle", () => {
    const px = image(300, 200, [255, 255, 255], [10, 10, 10], 8);
    expect(borderWhiteRatio(px, 300, 200)).toBeGreaterThan(0.97);
  });

  it("returns 0 for an empty image", () => {
    expect(borderWhiteRatio(new Uint8ClampedArray(0), 0, 0)).toBe(0);
  });
});
