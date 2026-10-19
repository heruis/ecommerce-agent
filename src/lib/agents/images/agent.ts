import type Anthropic from "@anthropic-ai/sdk";
import { ImageAnalysis, type ProductImage } from "@/lib/contracts";
import { structuredCall, type AgentContext } from "@/lib/harness";
import { IMAGE_SYSTEM } from "./prompt";

/**
 * Photo check (fast tier, multimodal, single structured call).
 * Runs only when the seller uploaded photos.
 */
export async function runImageCheck(
  ctx: AgentContext,
  images: ProductImage[],
  productType: string,
): Promise<ImageAnalysis> {
  const content: Anthropic.ContentBlockParam[] = [];
  images.forEach((img, index) => {
    content.push({ type: "text", text: `Photo ${index} (${img.name.slice(0, 80)}):` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.media_type, data: img.data },
    });
  });
  content.push({
    type: "text",
    text: `The product is: ${productType}. Review all ${images.length} photo(s) and return one entry per photo.`,
  });

  const analysis = await structuredCall(ctx, {
    agent: "images",
    tier: "fast",
    effort: "low",
    system: IMAGE_SYSTEM,
    user: content,
    schema: ImageAnalysis,
    mock: () => ({ json: mockImageAnalysis(images, productType) }),
  });

  // Keep only entries that refer to real uploads, in upload order.
  const byIndex = new Map(analysis.images.map((o) => [o.index, o]));
  const ordered = images.map((_, i) => byIndex.get(i)).filter((o) => o !== undefined);
  const main =
    analysis.suggested_main_index !== null && analysis.suggested_main_index < images.length
      ? analysis.suggested_main_index
      : null;
  return { images: ordered, suggested_main_index: main };
}

/** Offline stand-in: we cannot see pixels without the model, so say so. */
export function mockImageAnalysis(images: ProductImage[], productType: string): ImageAnalysis {
  return {
    images: images.map((img, index) => ({
      index,
      shows: `Uploaded photo "${img.name}" (mock mode: not analyzed)`,
      background: "unknown",
      has_text_or_logo: false,
      has_watermark: false,
      product_fill: "unknown",
      multiple_items_or_props: false,
      quality_issues: ["Photo checks run in live AI mode"],
      alt_text: `${productType}, view ${index + 1}`.slice(0, 125),
    })),
    suggested_main_index: images.length > 0 ? 0 : null,
  };
}
