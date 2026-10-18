import { requireUser } from "@/lib/auth";
import { plans } from "@/lib/billing";
import { getRepo } from "@/lib/db";
import { ManageBillingButton, UpgradeButton } from "@/components/billing/BillingButtons";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = await requireUser("/billing");
  const { checkout } = await searchParams;
  const profile = await getRepo().ensureProfile(user);
  const p = plans();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Billing" />
      {checkout === "success" ? (
        <Card className="mb-4 border-ok/40 text-sm text-ok">
          Payment received. If your plan has not updated yet, refresh in a few seconds.
        </Card>
      ) : null}
      {checkout === "cancelled" ? (
        <Card className="mb-4 text-sm text-muted">Checkout cancelled. Nothing was charged.</Card>
      ) : null}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Current plan</p>
            <p className="text-xl font-semibold">{profile.plan === "pro" ? "Pro" : "Free"}</p>
          </div>
          <Badge tone={profile.credits_remaining > 0 ? "ok" : "danger"}>
            {profile.credits_remaining} runs left
          </Badge>
        </div>
        {profile.plan === "pro" ? (
          <>
            <p className="text-sm text-muted">
              {p.pro.runs} runs per month.
              {profile.current_period_end
                ? ` Renews ${new Date(profile.current_period_end).toLocaleDateString()}.`
                : ""}
            </p>
            <ManageBillingButton />
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Pro: ${p.pro.priceUsd}/month for {p.pro.runs} runs. Payments run in Stripe test mode —
              use card 4242 4242 4242 4242.
            </p>
            <UpgradeButton />
          </>
        )}
      </Card>
    </div>
  );
}
