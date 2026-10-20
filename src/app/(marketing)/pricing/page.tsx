import type { Metadata } from "next";
import { Check, CreditCard, FileSearch, LifeBuoy, ScrollText, type LucideIcon } from "lucide-react";
import { BuyButton } from "@/components/billing/BuyButton";
import { Faq } from "@/components/marketing/Faq";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { getSessionUser } from "@/lib/auth";
import { plans } from "@/lib/billing";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { Alert, Badge, ButtonLink, Card, Container, Eyebrow, cn } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.marketing.meta.pricingTitle, description: t.marketing.meta.pricingDescription };
}

const CREDIT_ICONS: LucideIcon[] = [ScrollText, FileSearch, LifeBuoy];

/**
 * Pricing: Free, one-time credit pack, Pro subscription. Every plan has every
 * feature; only credits differ. ?buy=pack|pro (after sign-up) highlights a
 * tier. Owner: WS3 (page) / WS4 (checkout).
 */
export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ buy?: string }>;
}) {
  const [t, user, { buy }] = await Promise.all([getT(), getSessionUser(), searchParams]);
  const m = t.marketing.pricing;
  const p = plans();
  const signedIn = Boolean(user);
  const selected = signedIn && (buy === "pack" || buy === "pro") ? buy : null;

  const tiers = [
    {
      key: "free" as const,
      copy: m.tiers.free,
      price: m.tiers.free.price,
      cadence: m.tiers.free.cadence,
      credits: fmt(m.tiers.free.credits, { n: p.free.credits }),
      featured: false,
    },
    {
      key: "pack" as const,
      copy: m.tiers.pack,
      price: fmt(m.tiers.pack.price, { price: p.pack.priceUsd }),
      cadence: m.tiers.pack.cadence,
      credits: fmt(m.tiers.pack.credits, { n: p.pack.credits }),
      featured: false,
    },
    {
      key: "pro" as const,
      copy: m.tiers.pro,
      price: fmt(m.tiers.pro.price, { price: p.pro.priceUsd }),
      cadence: m.tiers.pro.cadence,
      credits: fmt(m.tiers.pro.credits, { n: p.pro.credits }),
      featured: true,
    },
  ];

  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-brand/10 to-background">
        <Container className="py-16 text-center sm:py-20">
          <Eyebrow>{m.eyebrow}</Eyebrow>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            {m.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-pretty text-muted">{m.subtitle}</p>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        <Alert tone="brand" title={m.testMode.title} className="mx-auto mb-10 max-w-3xl">
          <span className="inline-flex items-start gap-2">
            <CreditCard aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {m.testMode.body}
          </span>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((tier) => {
            const isSelected = selected === tier.key;
            return (
              <Card
                key={tier.key}
                className={cn(
                  "relative flex flex-col gap-6 p-7",
                  tier.featured && "border-brand shadow-pop",
                  isSelected && "ring-3 ring-accent/60",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">{tier.copy.name}</h2>
                  {tier.featured ? <Badge tone="brand">{m.bestValue}</Badge> : null}
                  {isSelected ? <Badge tone="accent">{m.selected}</Badge> : null}
                </div>
                <p className="-mt-4 text-sm text-muted">{tier.copy.tagline}</p>
                <div>
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight">{tier.price}</span>
                    {tier.cadence ? <span className="text-muted">{tier.cadence}</span> : null}
                  </p>
                  <p className="mt-1 font-semibold text-brand">{tier.credits}</p>
                </div>
                <ul className="flex-1 space-y-2.5 text-sm">
                  {tier.copy.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                      {f}
                    </li>
                  ))}
                </ul>
                {tier.key === "free" ? (
                  <ButtonLink
                    href={signedIn ? "/listings/new" : "/login?mode=signup"}
                    variant="secondary"
                    size="lg"
                    className="w-full"
                  >
                    {signedIn ? m.tiers.free.ctaSignedIn : m.tiers.free.cta}
                  </ButtonLink>
                ) : (
                  <BuyButton
                    product={tier.key}
                    signedIn={signedIn}
                    variant={tier.featured ? "accent" : "primary"}
                  >
                    {tier.key === "pack"
                      ? fmt(m.tiers.pack.cta, { n: p.pack.credits })
                      : m.tiers.pro.cta}
                  </BuyButton>
                )}
              </Card>
            );
          })}
        </div>
      </Container>

      <section
        aria-labelledby="credit-title"
        className="border-y border-border bg-surface py-16 sm:py-20"
      >
        <Container>
          <SectionHeading id="credit-title" title={m.credit.title} subtitle={m.credit.body} />
          <div className="grid gap-6 md:grid-cols-3">
            {m.credit.items.map((item, i) => {
              const Icon = CREDIT_ICONS[i] ?? ScrollText;
              return (
                <div key={item.title} className="space-y-2 text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted">{item.body}</p>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-10 max-w-2xl rounded-xl bg-ok/10 px-5 py-4 text-center text-sm text-ok">
            {m.credit.free}
          </p>
        </Container>
      </section>

      <section aria-labelledby="table-title" className="py-16 sm:py-20">
        <Container className="max-w-4xl">
          <SectionHeading id="table-title" title={m.table.title} />
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-subtle/60">
                  <th scope="col" className="px-4 py-3.5 sm:px-5">
                    {m.table.feature}
                  </th>
                  {tiers.map((tier) => (
                    <th key={tier.key} scope="col" className="px-2 py-3.5 text-center sm:px-3">
                      {tier.copy.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <th scope="row" className="px-4 py-3 font-medium sm:px-5">
                    {m.table.credits}
                  </th>
                  {tiers.map((tier) => (
                    <td
                      key={tier.key}
                      className="px-2 py-3 text-center text-xs font-semibold text-brand sm:px-3 sm:text-sm"
                    >
                      {tier.credits}
                    </td>
                  ))}
                </tr>
                {m.table.rows.map((row) => (
                  <tr key={row} className="border-b border-border last:border-0">
                    <th scope="row" className="px-4 py-3 font-medium sm:px-5">
                      {row}
                    </th>
                    {tiers.map((tier) => (
                      <td key={tier.key} className="px-2 py-3 text-center sm:px-3">
                        <Check
                          role="img"
                          aria-label={m.table.included}
                          className="mx-auto h-4 w-4 text-ok"
                          strokeWidth={2.5}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section aria-labelledby="billing-faq-title" className="pb-20">
        <Container className="max-w-3xl">
          <SectionHeading id="billing-faq-title" title={m.faq.title} />
          <Faq items={m.faq.items} />
        </Container>
      </section>
    </>
  );
}
