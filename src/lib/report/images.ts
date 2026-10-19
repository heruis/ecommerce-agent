import type {
  ImageAnalysis,
  ImageGuidance,
  ImageObservation,
  ImageReport,
  KeywordSet,
  Platform,
  ProductFacts,
} from "@/lib/contracts";
import { rulesFor } from "@/lib/rules";

/**
 * Main-image verdicts are decided in code from the model's observations, so
 * the rules are exact and the same for every run.
 */
export function mainImageVerdicts(
  platforms: Platform[],
  analysis: ImageAnalysis | null,
): ImageReport {
  const main_image = platforms.map((platform) => {
    if (!analysis || analysis.images.length === 0) {
      return {
        platform,
        index: null,
        ok: false,
        issues: ["No photos uploaded — use the checklist and shot list below."],
      };
    }
    const index = analysis.suggested_main_index ?? 0;
    const photo = analysis.images.find((o) => o.index === index) ?? analysis.images[0];
    const issues = issuesFor(platform, photo);
    return { platform, index: photo.index, ok: issues.length === 0, issues };
  });
  return { analysis, main_image };
}

function issuesFor(platform: Platform, o: ImageObservation): string[] {
  const issues: string[] = [];
  if (o.background === "unknown")
    issues.push("Not analyzed (mock mode) — check it against the rules yourself.");
  if (o.has_text_or_logo) issues.push("Remove added text, logos or badges from the main image.");
  if (o.has_watermark) issues.push("Remove the watermark.");
  if (platform === "amazon_us") {
    if (o.background === "light_plain" || o.background === "busy") {
      issues.push("Amazon requires a pure white background (RGB 255,255,255).");
    }
    if (o.product_fill === "small") issues.push("Product should fill about 85% of the frame.");
    if (o.multiple_items_or_props)
      issues.push("Show only the product being sold — no props or extra items.");
  }
  if (platform === "tiktok_us" && o.background === "busy") {
    issues.push("Use a white or plain light background for TikTok Shop's first image.");
  }
  if (platform === "shopify" && o.background === "busy") {
    issues.push("A plain background keeps your Shopify catalog consistent.");
  }
  if (o.product_fill === "cropped") issues.push("Part of the product is cut off.");
  for (const q of o.quality_issues) if (!q.includes("mock")) issues.push(q);
  return [...new Set(issues)];
}

/** Platform image checklist plus a shot list built from the product's own facts. */
export function imageGuidance(
  platform: Platform,
  facts: ProductFacts,
  keywords: KeywordSet,
): ImageGuidance {
  const rules = rulesFor(platform);
  const fact = (a: string) => facts.facts.find((f) => f.attribute === a);
  const fmt = (a: string) => {
    const f = fact(a);
    return f ? `${f.value}${f.unit ? ` ${f.unit}` : ""}` : null;
  };
  const useCase = [...keywords.secondary, ...keywords.primary]
    .map(
      (k) =>
        k.match(
          /\b(camping|hiking|travel|office|gym|kitchen|outdoor|yoga|baby|pet|beach|car)\b/,
        )?.[1],
    )
    .find(Boolean);

  const shots = [
    platform === "amazon_us"
      ? `Main: the ${facts.product_type} alone on pure white, filling about 85% of the frame`
      : `Main: the ${facts.product_type} alone on a white or plain light background`,
  ];
  const size = fmt("dimensions") ?? fmt("capacity");
  if (size) shots.push(`Size: show ${size} with a ruler or next to a hand or common object`);
  const folded = fmt("folded_height");
  if (folded) shots.push(`Feature: folded vs. open side by side (folds to ${folded})`);
  const material = fmt("material");
  if (material) shots.push(`Close-up of the material (${material}) and finish`);
  shots.push(`In use: ${useCase ? `${useCase} scene` : "a real use scene"} with a person using it`);
  const contents = fmt("package_contents");
  shots.push(
    contents
      ? `What's in the box: ${contents}`
      : "What's in the box: everything the buyer receives",
  );
  if (platform === "tiktok_us")
    shots.push(
      "15–30 s video: unbox it, show the main feature in the first 3 seconds, then show it in use",
    );
  if (platform === "shopify")
    shots.push(
      "Lifestyle photo in your store's style, same aspect ratio as the rest of your catalog",
    );

  return {
    main_image_rules: rules.images.mainRules,
    gallery: rules.images.gallery,
    shot_list: shots,
  };
}
