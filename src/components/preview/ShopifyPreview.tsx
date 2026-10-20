import { Search, ShoppingBag } from "lucide-react";
import type { ListingDraft } from "@/lib/contracts";
import { cn } from "@/components/ui";
import { PreviewCaption, PreviewImage, splitBullet } from "./shared";

export interface ShopifyPreviewProps {
  listing: ListingDraft;
  brand?: string;
  price?: string;
  images?: string[];
  /** URL handle, e.g. "collapsible-silicone-cup". Derived from the title when absent. */
  handle?: string;
  /** Store subdomain for the search-result URL, e.g. "trailfold". */
  store?: string;
  /** Hide the storefront and show only the search-result preview. */
  searchOnly?: boolean;
  caption?: string;
  className?: string;
}

/** Title -> URL handle the way store platforms slugify it. */
export function toHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * An independent store's product page (the familiar Shopify theme layout)
 * plus how the page could appear in a Google search result — the SEO title,
 * URL handle and meta description ShelfPass writes. Illustrative only.
 * Owner: WS3.
 */
export function ShopifyPreview({
  listing,
  brand = "Your brand",
  price = "$0.00",
  images = [],
  handle,
  store,
  searchOnly = false,
  caption,
  className,
}: ShopifyPreviewProps) {
  const slug = handle ?? toHandle(listing.title);
  const domain = `${store ?? (toHandle(brand) || "store")}.example`;
  return (
    <figure className={cn("@container space-y-4", className)}>
      {searchOnly ? null : (
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-white text-[14px] leading-relaxed text-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-[17px] font-semibold tracking-wide">{brand}</span>
            <span className="hidden gap-5 text-[13px] text-slate-600 @xl:flex">
              <span>Shop</span>
              <span>About</span>
              <span>Contact</span>
            </span>
            <span className="flex gap-3 text-slate-700">
              <Search aria-hidden className="h-4 w-4" />
              <ShoppingBag aria-hidden className="h-4 w-4" />
            </span>
          </div>
          <div className="grid gap-6 p-4 @2xl:grid-cols-2 @2xl:p-6">
            <div className="space-y-2">
              <div className="aspect-square overflow-hidden rounded-md bg-slate-50">
                {images[0] ? <PreviewImage src={images[0]} alt={listing.title} /> : null}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {images.slice(1, 5).map((src, i) => (
                  <div
                    key={src + i}
                    className="aspect-square overflow-hidden rounded border border-slate-200"
                  >
                    <PreviewImage src={src} alt="" />
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{brand}</p>
              <h3 className="text-[24px] font-semibold leading-tight">{listing.title}</h3>
              <p className="text-[17px]">{price} USD</p>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-slate-500">Quantity</span>
                <span className="rounded border border-slate-300 px-3 py-1">− 1 +</span>
              </div>
              <div className="rounded border border-slate-900 py-2.5 text-center text-[13px] font-medium">
                Add to cart
              </div>
              <div className="rounded bg-slate-900 py-2.5 text-center text-[13px] font-medium text-white">
                Buy it now
              </div>
              {listing.description.split(/\n{2,}/).map((p, i) => (
                <p key={i} className="text-[13px] text-slate-700">
                  {p}
                </p>
              ))}
              {listing.bullets.length ? (
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-slate-700">
                  {listing.bullets.map((b, i) => {
                    const [label, body] = splitBullet(b);
                    return <li key={i}>{label ? `${label}: ${body}` : body}</li>;
                  })}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* search-result preview */}
      <div
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-700">
            {brand.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[13px] text-slate-800">{brand}</p>
            <p className="truncate text-[12px] text-slate-600">
              https://{domain} › products › {slug}
            </p>
          </div>
        </div>
        <p className="mt-1.5 text-[19px] leading-snug text-[#1a0dab]">
          {listing.seo_title || listing.title}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-slate-600">
          {listing.seo_description || listing.description.slice(0, 155)}
        </p>
      </div>
      {caption ? <PreviewCaption>{caption}</PreviewCaption> : null}
    </figure>
  );
}
