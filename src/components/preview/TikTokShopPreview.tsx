import { ChevronLeft, MessageCircle, Share2, ShoppingCart, Store } from "lucide-react";
import type { ListingDraft } from "@/lib/contracts";
import { cn } from "@/components/ui";
import { PreviewCaption, PreviewImage, splitBullet, splitPrice } from "./shared";

export interface TikTokShopPreviewProps {
  listing: ListingDraft;
  brand?: string;
  price?: string;
  images?: string[];
  caption?: string;
  className?: string;
}

const FONT = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
};

/**
 * A short-video-shop product page in a phone frame (the familiar TikTok Shop
 * layout), rendered from a ShelfPass listing: title, selling points as chips,
 * hashtags. Illustrative only, no logos. Owner: WS3.
 */
export function TikTokShopPreview({
  listing,
  brand = "Your brand",
  price = "$0.00",
  images = [],
  caption,
  className,
}: TikTokShopPreviewProps) {
  const [whole, cents] = splitPrice(price);
  const firstParagraph = listing.description.split(/\n{2,}/)[0] ?? "";
  return (
    <figure className={cn("mx-auto w-full max-w-[360px]", className)}>
      <div className="rounded-[2.6rem] bg-slate-900 p-2.5 shadow-hero">
        <div
          style={FONT}
          className="relative flex h-[720px] flex-col overflow-hidden rounded-[2.1rem] bg-white text-[13px] leading-snug text-slate-900"
        >
          {/* status bar + nav */}
          <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[11px] font-semibold">
            <span>9:41</span>
            <span className="h-5 w-20 rounded-full bg-slate-900" />
            <span>5G</span>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5">
            <ChevronLeft aria-hidden className="h-5 w-5" />
            <span className="text-[13px] font-semibold">Product</span>
            <Share2 aria-hidden className="h-4 w-4" />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {/* carousel */}
            <div className="relative aspect-square bg-slate-50">
              {images[0] ? <PreviewImage src={images[0]} alt={listing.title} /> : null}
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {(images.length ? images : [""]).slice(0, 5).map((_, i) => (
                  <span
                    key={i}
                    className={cn("h-1.5 w-1.5 rounded-full", i === 0 ? "bg-white" : "bg-white/50")}
                  />
                ))}
              </div>
              <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
                1/{Math.max(images.length, 1)}
              </span>
            </div>

            <div className="space-y-2.5 px-3 py-3">
              <p className="flex items-baseline gap-0.5 text-rose-600">
                <span className="text-[13px] font-bold">$</span>
                <span className="text-[24px] font-bold leading-none">{whole}</span>
                <span className="text-[13px] font-bold">.{cents}</span>
              </p>
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">
                {listing.title}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {listing.bullets.slice(0, 4).map((b, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700"
                  >
                    {splitBullet(b)[0] ?? b.split(/[:,.]/)[0]}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[13px] font-bold text-white">
                  {brand.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold">{brand} Shop</p>
                  <p className="text-[11px] text-slate-500">New shop</p>
                </div>
                <span className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold">
                  Visit
                </span>
              </div>

              <div>
                <p className="mb-1 text-[13px] font-semibold">Description</p>
                <p className="line-clamp-4 text-[12px] text-slate-700">{firstParagraph}</p>
              </div>
              {listing.tags.length ? (
                <p className="text-[12px] font-medium text-sky-700">
                  {listing.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}
                </p>
              ) : null}
            </div>
          </div>

          {/* bottom bar */}
          <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5">
            <span className="flex flex-col items-center text-[10px] text-slate-600">
              <Store aria-hidden className="h-4 w-4" />
              Shop
            </span>
            <span className="flex flex-col items-center text-[10px] text-slate-600">
              <MessageCircle aria-hidden className="h-4 w-4" />
              Chat
            </span>
            <span className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-50 py-2 text-[12px] font-semibold text-rose-600">
              <ShoppingCart aria-hidden className="h-3.5 w-3.5" /> Add to cart
            </span>
            <span className="flex-1 rounded-lg bg-rose-500 py-2 text-center text-[12px] font-semibold text-white">
              Buy now
            </span>
          </div>
        </div>
      </div>
      {caption ? <PreviewCaption>{caption}</PreviewCaption> : null}
    </figure>
  );
}
