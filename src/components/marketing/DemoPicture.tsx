import { ArrowDown, ArrowRight, Check, Lock } from "lucide-react";
import { AmazonPreview, ShopifyPreview, TikTokShopPreview } from "@/components/preview";
import {
  SAMPLE_AMAZON,
  SAMPLE_BRAND,
  SAMPLE_HANDLE,
  SAMPLE_IMAGES,
  SAMPLE_PRICE,
  SAMPLE_SHOPIFY,
  SAMPLE_STORE,
  SAMPLE_TIKTOK,
} from "@/components/preview/sample";
import type { Dictionary } from "@/lib/i18n";
import { ScaledFrame } from "./ScaledFrame";
import { SupplierNote } from "./SupplierNote";

const W = 1400;
const H = 820;

/**
 * The "how it works" demo picture: Chinese supplier note → ShelfPass → the
 * finished listing on an Amazon-style page, a TikTok Shop-style phone page and
 * a Google result for a Shopify store. Built from the real preview components
 * and scaled to fit (ScaledFrame), so it stays sharp and matches the product.
 * Owner: WS3.
 */
export function DemoPicture({ t }: { t: Dictionary["marketing"] }) {
  const h = t.how;
  return (
    <>
      <div className="hidden md:block" data-demo="scene">
        <ScaledFrame width={W} height={H} label={h.demoDescription}>
          <Scene t={t} />
        </ScaledFrame>
      </div>
      <div className="space-y-4 md:hidden">
        <SupplierCard t={t} />
        <div className="flex items-center justify-center gap-3">
          <ArrowDown aria-hidden className="h-5 w-5 text-brand" />
          <PipelinePill t={t} horizontal />
          <ArrowDown aria-hidden className="h-5 w-5 text-brand" />
        </div>
        <ScaledFrame width={360} height={740} label={h.demoDescription}>
          <TikTokShopPreview
            listing={SAMPLE_TIKTOK}
            brand={SAMPLE_BRAND}
            price={SAMPLE_PRICE}
            images={SAMPLE_IMAGES}
          />
        </ScaledFrame>
      </div>
      <p className="mt-3 text-center text-xs text-muted">{t.previews.disclaimer}</p>
    </>
  );
}

function Scene({ t }: { t: Dictionary["marketing"] }) {
  const h = t.how;
  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-brand/10 via-surface to-accent/10"
      style={{ width: W, height: H }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(37 99 235 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(37 99 235 / 0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* 1. supplier note */}
      <div className="absolute left-10 top-[120px] w-[320px]">
        <SupplierCard t={t} />
      </div>
      <ArrowRight
        className="absolute left-[372px] top-[300px] h-8 w-8 text-brand"
        strokeWidth={2.5}
      />

      {/* 2. ShelfPass */}
      <div className="absolute left-[412px] top-[220px] w-[180px]">
        <PipelinePill t={t} />
      </div>
      <ArrowRight
        className="absolute left-[604px] top-[300px] h-8 w-8 text-brand"
        strokeWidth={2.5}
      />

      {/* 3a. Amazon-style page in a browser window */}
      <ChannelChip className="left-[650px] top-[22px]">{h.tabs.amazon}</ChannelChip>
      <div className="absolute left-[650px] top-[58px] w-[600px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-hero">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 flex flex-1 items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] text-slate-500">
            <Lock className="h-3 w-3" />
            marketplace.example/dp/collapsible-silicone-cup
          </span>
        </div>
        <div className="h-[470px] overflow-hidden">
          <div style={{ width: 880, transform: "scale(0.682)", transformOrigin: "top left" }}>
            <AmazonPreview
              listing={SAMPLE_AMAZON}
              brand={SAMPLE_BRAND}
              price={SAMPLE_PRICE}
              images={SAMPLE_IMAGES}
              className="[&>div]:rounded-none [&>div]:border-0"
            />
          </div>
        </div>
      </div>

      {/* 3b. Google result for the Shopify store */}
      <ChannelChip className="left-[650px] top-[596px]">{h.tabs.shopify}</ChannelChip>
      <div className="absolute left-[650px] top-[632px] w-[520px]">
        <ShopifyPreview
          listing={SAMPLE_SHOPIFY}
          brand={SAMPLE_BRAND}
          handle={SAMPLE_HANDLE}
          store={SAMPLE_STORE}
          searchOnly
          className="[&>div]:shadow-hero"
        />
      </div>

      {/* 3c. TikTok Shop-style phone page */}
      <ChannelChip className="left-[1168px] top-[722px]">{h.tabs.tiktok}</ChannelChip>
      <div
        className="absolute left-[1100px] top-[132px]"
        style={{ width: 360, transform: "scale(0.78)", transformOrigin: "top left" }}
      >
        <TikTokShopPreview
          listing={SAMPLE_TIKTOK}
          brand={SAMPLE_BRAND}
          price={SAMPLE_PRICE}
          images={SAMPLE_IMAGES}
        />
      </div>
    </div>
  );
}

function SupplierCard({ t }: { t: Dictionary["marketing"] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-pop">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.how.supplier}</p>
      <SupplierNote className="mt-2 text-[15px] leading-relaxed" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
        {t.how.photos}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {SAMPLE_IMAGES.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element -- local SVG demo art
          <img
            key={src}
            src={src}
            alt=""
            className="aspect-square w-full rounded-md border border-border bg-white object-contain"
          />
        ))}
      </div>
    </div>
  );
}

function PipelinePill({
  t,
  horizontal = false,
}: {
  t: Dictionary["marketing"];
  horizontal?: boolean;
}) {
  if (horizontal) {
    return (
      <span className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-foreground shadow-pop">
        ShelfPass
      </span>
    );
  }
  return (
    <div className="rounded-2xl bg-brand p-4 text-brand-foreground shadow-hero">
      <p className="text-lg font-bold">ShelfPass</p>
      <ul className="mt-3 space-y-2 text-[13px]">
        {t.how.pipeline.map((step) => (
          <li key={step} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChannelChip({ children, className }: { children: string; className: string }) {
  return (
    <span
      className={`absolute rounded-full border border-white/60 bg-white/80 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur ${className}`}
    >
      {children}
    </span>
  );
}
