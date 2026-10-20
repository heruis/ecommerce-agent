/**
 * Marketplace-style previews of a ShelfPass listing. Pure presentational
 * components (no hooks), safe in Server and Client Components. Use them in the
 * app to show a seller how a channel's listing will look:
 *
 *   <AmazonPreview listing={view.listing} brand={input.brand} price="$12.99"
 *     images={input.images.map((i) => `data:${i.media_type};base64,${i.data}`)}
 *     caption={t.marketing.previews.disclaimer} />
 */
export { AmazonPreview, type AmazonPreviewProps } from "./AmazonPreview";
export { ShopifyPreview, toHandle, type ShopifyPreviewProps } from "./ShopifyPreview";
export { TikTokShopPreview, type TikTokShopPreviewProps } from "./TikTokShopPreview";
