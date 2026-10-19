import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { MockPayButton } from "@/components/billing/BillingButtons";
import { Card } from "@/components/ui";

/** BILLING_MODE=mock stand-in for Stripe Checkout. */
export default function MockCheckoutPage() {
  if (env().BILLING_MODE !== "mock") notFound();
  return (
    <div className="mx-auto max-w-sm">
      <Card className="space-y-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          Mock checkout · no real payment
        </p>
        <h1 className="text-xl font-semibold">ShelfPass Pro</h1>
        <p className="text-2xl font-semibold">
          $9.99<span className="text-base font-normal text-muted">/month</span>
        </p>
        <MockPayButton />
      </Card>
    </div>
  );
}
