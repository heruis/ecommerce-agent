import { describe, expect, it } from "vitest";
import type { ImageObservation } from "@/lib/contracts";
import { mockImageAnalysis, runImageCheck } from "@/lib/agents/images/agent";
import { Budget, MockLlmClient, Tracer } from "@/lib/harness";
import { applyWhiteMeasurement, mainImageVerdicts, WHITE_BORDER_OK } from "./images";

const base: ImageObservation = {
  index: 0,
  shows: "A blue silicone cup",
  background: "pure_white",
  has_text_or_logo: false,
  has_watermark: false,
  product_fill: "good",
  multiple_items_or_props: false,
  quality_issues: [],
  alt_text: "Blue collapsible silicone cup",
};

const verdict = (o: ImageObservation, platform: "amazon_us" | "tiktok_us" | "shopify") =>
  mainImageVerdicts([platform], { images: [o], suggested_main_index: 0 }).main_image[0];

describe("applyWhiteMeasurement", () => {
  it("leaves the observation alone without a measurement", () => {
    expect(applyWhiteMeasurement(base, undefined)).toBe(base);
  });

  it("trusts a white measurement over the model", () => {
    const o = applyWhiteMeasurement({ ...base, background: "light_plain" }, 0.99);
    expect(o.background).toBe("pure_white");
    expect(verdict(o, "amazon_us")).toMatchObject({ ok: true, issues: [] });
  });

  it("fails Amazon with the measured percentage when the border is not white", () => {
    const o = applyWhiteMeasurement(base, 0.82);
    expect(o.background).toBe("light_plain");
    const v = verdict(o, "amazon_us");
    expect(v.ok).toBe(false);
    expect(v.issues.join(" ")).toMatch(/Border measured 82% white/);
    expect(v.issues.join(" ")).not.toMatch(/RGB 255,255,255\)\.$/);
  });

  it("does not hold a light, plain background against TikTok Shop or Shopify", () => {
    const o = applyWhiteMeasurement(base, 0.82);
    expect(verdict(o, "tiktok_us")).toMatchObject({ ok: true, issues: [] });
    expect(verdict(o, "shopify")).toMatchObject({ ok: true, issues: [] });
  });

  it("keeps a scene a scene", () => {
    expect(applyWhiteMeasurement({ ...base, background: "busy" }, 0.4).background).toBe("busy");
  });

  it("uses the 97% threshold", () => {
    expect(applyWhiteMeasurement(base, WHITE_BORDER_OK).background).toBe("pure_white");
    expect(applyWhiteMeasurement(base, WHITE_BORDER_OK - 0.01).background).toBe("light_plain");
  });
});

describe("photo check in mock mode", () => {
  const ctx = {
    runId: "run_test",
    llm: new MockLlmClient(),
    tracer: new Tracer(),
    budget: new Budget(),
    spanId: null,
    emit: () => {},
  };
  const photo = (white_ratio?: number) => ({
    name: "cup.jpg",
    media_type: "image/jpeg" as const,
    data: "/9j/4AAQ",
    white_ratio,
  });

  it("decides the Amazon background from the measurement, deterministically", async () => {
    const white = await runImageCheck(ctx, [photo(0.995)], "collapsible silicone cup");
    expect(white.images[0].background).toBe("pure_white");
    expect(verdict(white.images[0], "amazon_us").ok).toBe(true);

    const grey = await runImageCheck(ctx, [photo(0.5)], "collapsible silicone cup");
    expect(verdict(grey.images[0], "amazon_us").issues.join(" ")).toMatch(/50% white/);
  });

  it("still says it could not look without a measurement", async () => {
    const none = await runImageCheck(ctx, [photo()], "collapsible silicone cup");
    expect(none.images[0].background).toBe("unknown");
    expect(verdict(none.images[0], "amazon_us").ok).toBe(false);
    expect(mockImageAnalysis([photo()], "cup").images[0].quality_issues[0]).toMatch(/mock/);
  });
});
