"use client";

import { useState, type ReactNode } from "react";
import type { BillingProduct } from "@/lib/contracts";
import { Button, Spinner } from "@/components/ui";

/**
 * Starts checkout for the Pro subscription or a one-time credit pack.
 * Signed-out visitors are sent to sign-up first and come back to /pricing.
 * Owner: WS4 (logic) / WS3 (look).
 */
export function BuyButton({
  product,
  signedIn,
  children,
  variant = "primary",
  className,
}: {
  product: BillingProduct;
  signedIn: boolean;
  children: ReactNode;
  variant?: "primary" | "accent" | "secondary";
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!signedIn) {
      window.location.href = `/login?mode=signup&next=${encodeURIComponent(`/pricing?buy=${product}`)}`;
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.url) {
      window.location.href = body.url;
      return;
    }
    setBusy(false);
    setError(body?.error?.message ?? "Checkout is unavailable right now.");
  }

  return (
    <div className={className}>
      <Button onClick={go} disabled={busy} variant={variant} size="lg" className="w-full">
        {busy ? <Spinner /> : null}
        {children}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
