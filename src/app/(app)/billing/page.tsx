import { CreditCard, Info, Package, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { plans } from "@/lib/billing";
import { getRepo } from "@/lib/db";
import { fmt } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/i18n/server";
import { ManageBillingButton } from "@/components/billing/BillingButtons";
import { BuyButton } from "@/components/billing/BuyButton";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).billing.meta.title };
}

/** Plan, credits, buy a credit pack, upgrade or manage Pro. Owner: WS4. */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; product?: string; portal?: string }>;
}) {
  const user = await requireUser("/billing");
  const [{ checkout, product }, t, locale, profile] = await Promise.all([
    searchParams,
    getT(),
    getLocale(),
    getRepo().ensureProfile(user),
  ]);
  const b = t.billing;
  const p = plans();
  const isPro = profile.plan === "pro";
  const price = (n: number) => n.toFixed(2);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={b.title} subtitle={b.subtitle} />

      <div className="space-y-6">
        {checkout === "success" ? (
          <Alert tone="ok">
            {product === "pack"
              ? fmt(b.banners.packSuccess, { n: p.pack.credits })
              : b.banners.proSuccess}
          </Alert>
        ) : null}
        {checkout === "cancelled" ? <Alert tone="neutral">{b.banners.cancelled}</Alert> : null}

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted">{b.current.title}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">
                {isPro ? b.current.pro : b.current.free}
              </p>
              <p className="mt-1 text-sm text-muted">
                {isPro && profile.current_period_end
                  ? fmt(b.current.renews, {
                      date: new Date(profile.current_period_end).toLocaleDateString(
                        locale === "zh" ? "zh-CN" : "en-US",
                        { year: "numeric", month: "short", day: "numeric" },
                      ),
                    })
                  : isPro
                    ? null
                    : b.current.noRenewal}
              </p>
            </div>
            <Badge tone={profile.credits_remaining > 0 ? "ok" : "danger"} className="text-sm">
              {fmt(b.current.credits, { n: profile.credits_remaining })}
            </Badge>
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {b.current.oneCredit}
          </p>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <div className="flex items-center gap-2">
              <Package aria-hidden className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-semibold">{b.pack.title}</h2>
            </div>
            <p className="mt-2 flex-1 text-sm text-muted">
              {fmt(b.pack.body, { n: p.pack.credits, price: price(p.pack.priceUsd) })}
            </p>
            <BuyButton product="pack" signedIn variant="accent" className="mt-4">
              {fmt(b.pack.cta, { n: p.pack.credits, price: price(p.pack.priceUsd) })}
            </BuyButton>
          </Card>

          <Card className="flex flex-col">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden className="h-5 w-5 text-brand" />
              <h2 className="text-lg font-semibold">{b.pro.title}</h2>
            </div>
            {isPro ? (
              <>
                <p className="mt-2 text-sm font-medium text-ok">{b.pro.active}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{b.pro.manageHelp}</p>
                <div className="mt-4">
                  <ManageBillingButton label={b.pro.manage} />
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 flex-1 text-sm text-muted">
                  {fmt(b.pro.body, { n: p.pro.credits, price: price(p.pro.priceUsd) })}
                </p>
                <BuyButton product="pro" signedIn className="mt-4">
                  {fmt(b.pro.cta, { price: price(p.pro.priceUsd) })}
                </BuyButton>
              </>
            )}
          </Card>
        </div>

        {!isPro && profile.stripe_customer_id ? (
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">{b.pro.manageHelp}</p>
            <ManageBillingButton label={b.pro.manage} />
          </Card>
        ) : null}

        <Alert tone="brand">
          <span className="flex items-start gap-2">
            <CreditCard aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {b.testMode}
          </span>
        </Alert>

        <Link
          href="/pricing"
          className="inline-block text-sm font-medium text-brand hover:underline"
        >
          {b.compare}
        </Link>
      </div>
    </div>
  );
}
