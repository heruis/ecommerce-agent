"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BillingProduct } from "@/lib/contracts";
import { useT } from "@/lib/i18n/client";
import { Button, Spinner } from "@/components/ui";

/** Opens the Stripe customer portal (card, invoices, cancel). Owner: WS4 (logic) / WS3 (look). */
export function ManageBillingButton({ label }: { label: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.url) {
      window.location.href = body.url;
      return;
    }
    setBusy(false);
    setError(body?.error?.message ?? t.billing.errors.portalUnavailable);
  }
  return (
    <div>
      <Button variant="secondary" onClick={go} disabled={busy}>
        {busy ? <Spinner /> : <ExternalLink aria-hidden className="h-4 w-4" />}
        {label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** BILLING_MODE=mock: completes the fake checkout with the real credit rules. */
export function MockPayButton({ product, label }: { product: BillingProduct; label: string }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function pay() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/mock-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setBusy(false);
      setError(body?.error?.message ?? t.billing.errors.unavailable);
      return;
    }
    router.push(`/billing?checkout=success&product=${product}`);
    router.refresh();
  }
  return (
    <div>
      <Button onClick={pay} disabled={busy} variant="accent" size="lg" className="w-full">
        {busy ? <Spinner /> : null} {label}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
