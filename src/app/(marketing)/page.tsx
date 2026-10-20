import type { Metadata } from "next";
import {
  BookOpen,
  Camera,
  ClipboardList,
  ClipboardPaste,
  Copy,
  FolderLock,
  Languages,
  Layers,
  LifeBuoy,
  PenLine,
  ScanSearch,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { BeforeAfterCard } from "@/components/marketing/BeforeAfterCard";
import { CompareTable } from "@/components/marketing/CompareTable";
import { DemoPicture } from "@/components/marketing/DemoPicture";
import { Faq } from "@/components/marketing/Faq";
import { PreviewTabs } from "@/components/marketing/PreviewTabs";
import { SectionHeading } from "@/components/marketing/SectionHeading";
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
import { getSessionUser } from "@/lib/auth";
import { plans } from "@/lib/billing";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { ButtonLink, Card, Container, Eyebrow } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { absolute: `ShelfPass — ${t.marketing.meta.title}` },
    description: t.marketing.meta.description,
    openGraph: {
      title: `ShelfPass — ${t.marketing.meta.title}`,
      description: t.marketing.meta.description,
      images: [{ url: "/how-it-works/how-it-works.png", width: 1750, height: 1025 }],
    },
  };
}

const PROBLEM_ICONS: LucideIcon[] = [TriangleAlert, Layers, BookOpen];
const STEP_ICONS: LucideIcon[] = [ClipboardPaste, PenLine, ShieldCheck, Copy];
const FEATURE_ICONS: LucideIcon[] = [
  ClipboardList,
  ShieldCheck,
  Camera,
  ScanSearch,
  LifeBuoy,
  FolderLock,
  Languages,
];
const CHANNELS = ["Amazon US", "TikTok Shop US", "Shopify"];

/**
 * Landing page. Pattern (ui-ux-pro-max): product demo + features with a
 * before/after transformation. No invented testimonials, ratings or numbers.
 * Owner: WS3.
 */
export default async function LandingPage() {
  const [t, user] = await Promise.all([getT(), getSessionUser()]);
  const m = t.marketing;
  const p = plans();
  const startHref = user ? "/listings/new" : "/login?mode=signup";
  const startLabel = user ? m.hero.ctaSignedIn : fmt(m.hero.ctaStart, { n: p.free.credits });

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-brand/10 via-background to-background"
        />
        <div
          aria-hidden
          className="absolute -right-32 -top-32 -z-10 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
        />
        <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="space-y-6">
            <Eyebrow>{m.hero.eyebrow}</Eyebrow>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:leading-[1.1]">
              {m.hero.title}{" "}
              <span className="mt-1 block text-[0.82em] text-brand">{m.hero.titleAccent}</span>
            </h1>
            <p className="max-w-xl text-lg text-pretty text-muted">{m.hero.subtitle}</p>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href={startHref} variant="accent" size="lg">
                {startLabel}
              </ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary" size="lg">
                {m.hero.ctaHow}
              </ButtonLink>
            </div>
            {user ? null : <p className="text-sm text-muted">{m.hero.note}</p>}
            <ul className="flex flex-wrap gap-2 pt-2">
              {m.hero.chips.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-white/70 bg-surface/70 px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <BeforeAfterCard t={m} />
        </Container>
      </section>

      {/* CHANNEL STRIP */}
      <section aria-label={m.channels.label} className="border-b border-border bg-surface">
        <Container className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6">
          <span className="text-sm text-muted">{m.channels.label}</span>
          {CHANNELS.map((c) => (
            <span key={c} className="text-lg font-bold tracking-tight text-foreground/80">
              {c}
            </span>
          ))}
        </Container>
      </section>

      {/* PROBLEM */}
      <section aria-labelledby="problem-title" className="py-20 sm:py-24">
        <Container>
          <SectionHeading id="problem-title" eyebrow={m.problem.eyebrow} title={m.problem.title} />
          <div className="grid gap-6 md:grid-cols-3">
            {m.problem.items.map((item, i) => {
              const Icon = PROBLEM_ICONS[i] ?? TriangleAlert;
              return (
                <Card key={item.title} className="space-y-3 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger/10 text-danger">
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-muted">{item.body}</p>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        aria-labelledby="how-title"
        className="scroll-mt-20 border-y border-border bg-surface py-20 sm:py-24"
      >
        <Container>
          <SectionHeading
            id="how-title"
            eyebrow={m.how.eyebrow}
            title={m.how.title}
            subtitle={m.how.subtitle}
          />
          <ol className="mb-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {m.how.steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? ClipboardPaste;
              return (
                <li key={step.title} className="relative space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-sm">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-bold text-brand">0{i + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted">{step.body}</p>
                </li>
              );
            })}
          </ol>

          <h3 className="mb-5 text-center text-xl font-semibold">{m.how.demoLabel}</h3>
          <DemoPicture t={m} />

          <div className="mt-16 text-center">
            <h3 className="mb-5 text-xl font-semibold">{m.how.closer}</h3>
            <PreviewTabs
              label={m.how.closer}
              tabs={[
                {
                  id: "amazon",
                  label: m.how.tabs.amazon,
                  content: (
                    <AmazonPreview
                      listing={SAMPLE_AMAZON}
                      brand={SAMPLE_BRAND}
                      price={SAMPLE_PRICE}
                      images={SAMPLE_IMAGES}
                      caption={m.previews.disclaimer}
                      className="text-left"
                    />
                  ),
                },
                {
                  id: "tiktok",
                  label: m.how.tabs.tiktok,
                  content: (
                    <TikTokShopPreview
                      listing={SAMPLE_TIKTOK}
                      brand={SAMPLE_BRAND}
                      price={SAMPLE_PRICE}
                      images={SAMPLE_IMAGES}
                      caption={m.previews.disclaimer}
                      className="text-left"
                    />
                  ),
                },
                {
                  id: "shopify",
                  label: m.how.tabs.shopify,
                  content: (
                    <ShopifyPreview
                      listing={SAMPLE_SHOPIFY}
                      brand={SAMPLE_BRAND}
                      price={SAMPLE_PRICE}
                      images={SAMPLE_IMAGES}
                      handle={SAMPLE_HANDLE}
                      store={SAMPLE_STORE}
                      caption={m.previews.disclaimer}
                      className="mx-auto max-w-4xl text-left"
                    />
                  ),
                },
              ]}
            />
          </div>
        </Container>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        aria-labelledby="features-title"
        className="scroll-mt-20 py-20 sm:py-24"
      >
        <Container>
          <SectionHeading
            id="features-title"
            eyebrow={m.features.eyebrow}
            title={m.features.title}
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {m.features.items.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? ClipboardList;
              return (
                <Card
                  key={f.title}
                  className={`group space-y-3 p-6 transition-shadow duration-200 hover:shadow-pop ${i === 0 ? "lg:col-span-2" : ""}`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="text-muted">{f.body}</p>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* COMPARISON */}
      <section
        aria-labelledby="compare-title"
        className="border-y border-border bg-surface py-20 sm:py-24"
      >
        <Container>
          <SectionHeading id="compare-title" eyebrow={m.compare.eyebrow} title={m.compare.title} />
          <CompareTable t={m.compare} />
        </Container>
      </section>

      {/* PRICING TEASER */}
      <section aria-labelledby="pricing-teaser-title" className="py-16">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-border bg-surface p-8 shadow-card md:flex-row md:items-center">
            <div className="space-y-2">
              <h2 id="pricing-teaser-title" className="text-2xl font-bold tracking-tight">
                {m.pricingTeaser.title}
              </h2>
              <p className="max-w-2xl text-muted">
                {fmt(m.pricingTeaser.body, {
                  free: p.free.credits,
                  pack: p.pack.credits,
                  packPrice: p.pack.priceUsd,
                  proPrice: p.pro.priceUsd,
                })}
              </p>
            </div>
            <ButtonLink href="/pricing" variant="secondary" size="lg">
              {m.pricingTeaser.cta}
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="pb-20 sm:pb-24">
        <Container className="max-w-3xl">
          <SectionHeading id="faq-title" eyebrow={m.faq.eyebrow} title={m.faq.title} />
          <Faq items={m.faq.items} />
        </Container>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-strong px-6 py-14 text-center text-brand-foreground shadow-hero sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {m.finalCta.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">
            {fmt(m.finalCta.body, { n: p.free.credits })}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={startHref} variant="accent" size="lg">
              {user ? m.hero.ctaSignedIn : m.finalCta.cta}
            </ButtonLink>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center rounded-lg border border-white/40 px-6 font-semibold text-white transition-colors duration-200 hover:bg-white/10"
            >
              {m.finalCta.secondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
