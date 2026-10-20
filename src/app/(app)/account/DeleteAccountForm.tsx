"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Alert, Button, Input, Label, Spinner } from "@/components/ui";

/** Typed confirmation, then POST /api/account/delete and leave. Owner: WS4. */
export function DeleteAccountForm() {
  const t = useT();
  const router = useRouter();
  const d = t.account.danger;
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed.trim() === "DELETE";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    if (res.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    const body = await res.json().catch(() => null);
    setBusy(false);
    setError(body?.error?.code === "subscription_cancel_failed" ? d.subscriptionFailed : d.failed);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div>
        <Label htmlFor="delete-confirm">{fmt(d.confirmLabel, { word: d.word })}</Label>
        <Input
          id="delete-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          className="max-w-xs font-mono"
        />
      </div>
      <Button type="submit" variant="danger" disabled={!ready || busy}>
        {busy ? <Spinner /> : null}
        {busy ? d.deleting : d.submit}
      </Button>
    </form>
  );
}
