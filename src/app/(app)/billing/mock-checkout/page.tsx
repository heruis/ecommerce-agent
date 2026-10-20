import Link from "next/link";
import { notFound } from "next/navigation";
import { plans } from "@/lib/billing";
import { env } from "@/lib/env";
import { fmt } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { MockPayButton } from "@/components/billing/BillingButtons";
import { Card } from "@/components/ui";

/** BILLING_MODE=mock stand-in for Stripe Checkout (Pro or credit pack). */
export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  if (env().BILLING_MODE !== "mock") notFound();
  const [{ product: raw }, t] = await Promise.all([searchParams, getT()]);
  const product = raw === "pack" ? "pack" : "pro";
  const m = t.billing.mock;
  const p = plans();
  const plan = product === "pack" ? p.pack : p.pro;
  const price = plan.priceUsd.toFixed(2);

  return (
    <div className="mx-auto max-w-sm">
      <Card className="space-y-4 p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{m.label}</p>
        <h1 className="text-xl font-semibold">{product === "pack" ? m.packTitle : m.proTitle}</h1>
        <p className="text-3xl font-bold">
          ${price}
          {product === "pro" ? (
            <span className="text-base font-normal text-muted">{m.perMonth}</span>
          ) : null}
        </p>
        <p className="text-sm text-muted">{fmt(m.credits, { n: plan.credits })}</p>
        <MockPayButton product={product} label={fmt(m.pay, { price })} />
        <Link
          href="/pricing"
          className="block text-center text-sm text-muted hover:text-foreground"
        >
          {m.back}
        </Link>
      </Card>
    </div>
  );
}
