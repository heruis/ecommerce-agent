import { MapPin, Search, ShoppingCart } from "lucide-react";
import type { ListingDraft } from "@/lib/contracts";
import { cn } from "@/components/ui";
import { PreviewCaption, PreviewImage, splitBullet, splitPrice } from "./shared";

export interface AmazonPreviewProps {
  listing: ListingDraft;
  brand?: string;
  price?: string;
  images?: string[];
  /** Breadcrumb categories, most general first. */
  categories?: string[];
  /** Shown under the preview, e.g. the "not affiliated" note. */
  caption?: string;
  className?: string;
}

const FONT = { fontFamily: "Arial, Helvetica, sans-serif" };

/**
 * A marketplace-style product detail page in the familiar Amazon layout,
 * rendered from a ShelfPass listing. Illustrative only: generic store name,
 * no logos. Layout adapts to its own width (container queries), so it works
 * full-size in the app and scaled down in marketing pictures. Owner: WS3.
 */
export function AmazonPreview({
  listing,
  brand,
  price = "$0.00",
  images = [],
  categories = ["Sports & Outdoors", "Outdoor Recreation", "Camping & Hiking", "Camp Kitchen"],
  caption,
  className,
}: AmazonPreviewProps) {
  const [whole, cents] = splitPrice(price);
  const main = images[0];
  return (
    <figure className={cn("@container", className)}>
      <div
        style={FONT}
        className="overflow-hidden rounded-lg border border-slate-300 bg-white text-[13px] leading-snug text-slate-900"
      >
        {/* top bar */}
        <div className="flex items-center gap-3 bg-slate-900 px-3 py-2 text-white">
          <span className="text-lg font-bold tracking-tight">
            marketplace<span className="text-amber-300">.</span>
          </span>
          <span className="hidden items-center gap-1 text-[11px] text-slate-300 @2xl:flex">
            <MapPin aria-hidden className="h-3.5 w-3.5" /> Deliver to United States
          </span>
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-md bg-white">
            <span className="hidden border-r border-slate-200 bg-slate-100 px-2 py-1.5 text-[11px] text-slate-600 @xl:block">
              All
            </span>
            <span className="min-w-0 flex-1 truncate px-2 py-1.5 text-slate-500">
              {listing.title.split(",")[0]}
            </span>
            <span className="flex items-center bg-amber-300 px-2.5 text-slate-900">
              <Search aria-hidden className="h-4 w-4" />
            </span>
          </div>
          <ShoppingCart aria-hidden className="h-5 w-5 shrink-0" />
        </div>
        <div className="hidden gap-4 bg-slate-700 px-3 py-1.5 text-[11px] text-white @2xl:flex">
          <span>All</span>
          <span>Today&apos;s deals</span>
          <span>Customer service</span>
          <span>{categories[0]}</span>
        </div>

        <div className="p-3 @3xl:p-4">
          <p className="mb-3 truncate text-[11px] text-slate-600">{categories.join(" › ")}</p>

          <div className="grid gap-4 @3xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,0.65fr)]">
            {/* gallery */}
            <div className="flex gap-2">
              <div className="hidden flex-col gap-2 @md:flex">
                {images.slice(0, 5).map((src, i) => (
                  <div
                    key={src + i}
                    className={cn(
                      "h-11 w-11 overflow-hidden rounded border",
                      i === 0 ? "border-sky-600 ring-1 ring-sky-600" : "border-slate-300",
                    )}
                  >
                    <PreviewImage src={src} alt="" />
                  </div>
                ))}
              </div>
              <div className="aspect-square min-w-0 flex-1 overflow-hidden">
                {main ? (
                  <PreviewImage src={main} alt={listing.title} />
                ) : (
                  <div className="h-full w-full bg-slate-100" />
                )}
              </div>
            </div>

            {/* details */}
            <div className="min-w-0 space-y-2">
              <h3 className="text-[17px] font-normal leading-tight @3xl:text-[19px]">
                {listing.title}
              </h3>
              {brand ? <p className="text-[12px] text-sky-700">Visit the {brand} Store</p> : null}
              <div className="flex items-center gap-2 text-[12px]">
                <span className="rounded-sm bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  New
                </span>
                <span className="text-slate-600">No reviews yet</span>
              </div>
              <hr className="border-slate-200" />
              <p className="flex items-start gap-0.5">
                <span className="mt-1 text-[12px]">$</span>
                <span className="text-[28px] leading-none">{whole}</span>
                <span className="mt-1 text-[12px]">{cents}</span>
              </p>
              <hr className="border-slate-200" />
              <h4 className="pt-1 text-[15px] font-bold">About this item</h4>
              <ul className="list-disc space-y-1.5 pl-5">
                {listing.bullets.map((b, i) => {
                  const [label, body] = splitBullet(b);
                  return (
                    <li key={i}>
                      {label ? <span className="font-bold">{label}: </span> : null}
                      {body}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* buy box */}
            <div className="h-fit space-y-2 rounded-lg border border-slate-300 p-3">
              <p className="flex items-start gap-0.5">
                <span className="mt-0.5 text-[11px]">$</span>
                <span className="text-[22px] leading-none">{whole}</span>
                <span className="mt-0.5 text-[11px]">{cents}</span>
              </p>
              <p className="text-[12px] text-slate-600">Delivery details at checkout</p>
              <p className="text-[15px] text-emerald-700">In Stock</p>
              <div className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-[12px]">
                Quantity: 1
              </div>
              <div className="rounded-full bg-amber-300 py-1.5 text-center text-[13px]">
                Add to Cart
              </div>
              <div className="rounded-full bg-orange-400 py-1.5 text-center text-[13px]">
                Buy Now
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 pt-1 text-[11px] text-slate-600">
                <dt>Ships from</dt>
                <dd className="truncate">{brand ?? "—"}</dd>
                <dt>Sold by</dt>
                <dd className="truncate text-sky-700">{brand ?? "—"}</dd>
              </dl>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-3">
            <h4 className="mb-1.5 text-[17px] font-bold">Product description</h4>
            {listing.description.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="mb-2 max-w-3xl">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
      {caption ? <PreviewCaption>{caption}</PreviewCaption> : null}
    </figure>
  );
}
