"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { Category, ListingDraft, Platform, ProductImage, PublishField } from "@/lib/contracts";
import { useT } from "@/lib/i18n/client";
import { AmazonPreview, ShopifyPreview, TikTokShopPreview } from "@/components/preview";
import { Button, Card, Input, Label } from "@/components/ui";

/**
 * "See it on the marketplace": the channel's current copy (edits included)
 * rendered in a marketplace-style product page, with the seller's own photos.
 * Illustrative only — not the marketplace's real rendering. Owner: WS3.
 */
export function ChannelPreview({
  platform,
  listing,
  brand,
  category,
  photos,
  fields,
}: {
  platform: Platform;
  listing: ListingDraft;
  brand: string;
  category: Category;
  photos: ProductImage[];
  fields: PublishField[];
}) {
  const t = useT();
  const p = t.app.preview;
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("$19.99");
  const images = photos.length
    ? photos.map((i) => `data:${i.media_type};base64,${i.data}`)
    : ["/demo/no-photo.svg"];
  const handle = fields.find((f) => f.key === "url_handle")?.value || undefined;
  const common = {
    listing,
    brand: brand || undefined,
    price,
    images,
    caption: t.marketing.previews.disclaimer,
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{p.title[platform]}</h2>
          <p className="text-sm text-muted">{p.subtitle}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? (
            <EyeOff aria-hidden className="h-4 w-4" />
          ) : (
            <Eye aria-hidden className="h-4 w-4" />
          )}
          {open ? p.hide : p.show}
        </Button>
      </div>
      {open ? (
        <>
          <div className="max-w-40">
            <Label htmlFor={`${platform}-preview-price`}>{p.price}</Label>
            <Input
              id={`${platform}-preview-price`}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
            />
          </div>
          {platform === "amazon_us" ? (
            <AmazonPreview {...common} categories={[t.app.categories[category]]} />
          ) : platform === "tiktok_us" ? (
            <div className="mx-auto max-w-sm">
              <TikTokShopPreview {...common} />
            </div>
          ) : (
            <ShopifyPreview {...common} handle={handle} />
          )}
        </>
      ) : null}
    </Card>
  );
}
