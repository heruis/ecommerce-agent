"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { Alert, Button, Input, Label, Spinner } from "@/components/ui";
import { FieldError } from "./fields";

/** DATA_MODE=memory: sign in with only an email address (local dev, tests, e2e). */
export function DemoLoginForm({ next }: { next: string }) {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("demo@shelfpass.dev");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      setBusy(false);
      setError(t.auth.errors.invalidEmail);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.demo.title}</h1>
      </div>
      <Alert tone="brand">{t.auth.demo.body}</Alert>
      <div>
        <Label htmlFor="email">{t.auth.fields.email}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "email-error" : undefined}
          required
        />
        <FieldError id="email-error" message={error} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : null}
        {t.auth.demo.continue}
      </Button>
    </form>
  );
}
