"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authErrorKey } from "@/lib/auth/errors";
import { createSupabaseBrowserClient } from "@/lib/auth/supabase-browser";
import { fmt } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { Alert, Button, Input, Label, Spinner } from "@/components/ui";
import { FieldError, PasswordInput } from "./fields";

/** Ask for a password-reset email. Always shows the same message (no account enumeration). */
export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const t = useT();
  const a = t.auth;
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return setError(a.errors.invalidEmail);
    setBusy(true);
    setError(null);
    const { error: err } = await createSupabaseBrowserClient().auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    const key = err ? authErrorKey(err) : null;
    // Only surface errors that do not reveal whether the account exists.
    if (key === "rateLimited" || key === "network" || key === "emailNotAuthorized") {
      return setError(a.errors[key]);
    }
    setSentTo(target);
  }

  if (sentTo) {
    return (
      <div className="space-y-4">
        <Alert tone="ok">{fmt(a.reset.sent, { email: sentTo })}</Alert>
        <Link href="/login" className="text-sm font-medium text-brand hover:underline">
          {a.actions.backToSignin}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">{a.reset.body}</p>
      <div>
        <Label htmlFor="email">{a.fields.email}</Label>
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
        {a.actions.sendReset}
      </Button>
      <Link href="/login" className="inline-block text-sm font-medium text-brand hover:underline">
        {a.actions.backToSignin}
      </Link>
    </form>
  );
}

/**
 * Set a new password. Used on /reset-password (signed in by the reset link)
 * and on the account page. `after` decides where to go when done.
 */
export function NewPasswordForm({
  after,
  submitLabel,
  doneLabel,
}: {
  after: "dashboard" | "stay";
  submitLabel: string;
  doneLabel: string;
}) {
  const t = useT();
  const a = t.auth;
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(a.errors.passwordTooShort);
    if (password !== confirm) return setError(a.reset.mismatch);
    setBusy(true);
    setError(null);
    const { error: err } = await createSupabaseBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(a.errors[authErrorKey(err)]);
    setDone(true);
    setPassword("");
    setConfirm("");
    if (after === "dashboard") {
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {done ? <Alert tone="ok">{doneLabel}</Alert> : null}
      <PasswordInput
        id="new-password"
        label={a.fields.newPassword}
        hint={a.fields.passwordHint}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <div>
        <PasswordInput
          id="confirm-password"
          label={a.fields.confirmPassword}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "password-error" : undefined}
          required
        />
        <FieldError id="password-error" message={error} />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? <Spinner /> : null}
        {submitLabel}
      </Button>
    </form>
  );
}
