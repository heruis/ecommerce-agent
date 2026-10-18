"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

/** Starts Stripe Checkout (or the mock checkout). Owner: WS4 (logic) / WS3 (look). */
export function UpgradeButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", { method: "POST" });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.url) {
      window.location.href = body.url;
      return;
    }
    setBusy(false);
    setError(body?.error?.message ?? "Checkout is unavailable right now.");
  }
  return (
    <div>
      <Button onClick={go} disabled={busy}>
        {busy ? <Spinner /> : null} Upgrade to Pro — $9.99/month
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.url) window.location.href = body.url;
    else setBusy(false);
  }
  return (
    <Button variant="secondary" onClick={go} disabled={busy}>
      Manage subscription
    </Button>
  );
}

export function MockPayButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    await fetch("/api/billing/mock-complete", { method: "POST" });
    router.push("/billing?checkout=success");
    router.refresh();
  }
  return (
    <Button onClick={pay} disabled={busy} className="w-full">
      {busy ? <Spinner /> : null} Pay $9.99 (test)
    </Button>
  );
}
